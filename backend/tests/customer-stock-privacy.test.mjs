import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const testDir = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(testDir, '../src');
const read = (p) => readFileSync(path.join(src, p), 'utf8');

function loadMapper(relative, modules = {}) {
  const result = ts.transpileModule(read(relative), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true,
    fileName: relative,
  });
  const errors = (result.diagnostics ?? []).filter((x) => x.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, `Compilation failed: ${relative}`);
  const exports = {};
  vm.runInNewContext(result.outputText, {
    exports,
    require: (specifier) => {
      assert.ok(specifier in modules, `Unexpected dependency: ${specifier}`);
      return modules[specifier];
    },
  }, { filename: relative });
  return exports;
}

const decimal = (value) => ({ toString: () => String(value) });
const forbiddenStockKeys = new Set([
  'availableQty', 'onHandQty', 'reservedQty', 'stockMax',
  'on_hand_qty', 'reserved_qty', 'reorderLevel', 'lowStock',
]);
function assertNoExactStock(value, label) {
  const visit = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const [key, entry] of Object.entries(obj)) {
      assert.ok(!forbiddenStockKeys.has(key), `${label} leaked inventory field ${key}`);
      visit(entry);
    }
  };
  visit(value);
}
function variant(onHand, reserved, status = 'ACTIVE') {
  return {
    variant_id: 101n,
    color_code: 'BLACK',
    status,
    size_id: 5n,
    sizes: { code: 'L', label: 'Large', size_group: 'TOP', sort_order: 30 },
    inventory_stock: { on_hand_qty: onHand, reserved_qty: reserved, reorder_level: 2 },
    sku: 'SS-REAL-TEE-BLACK-L',
    is_default: true,
    price_override: null,
  };
}
function product(onHand, reserved, status = 'ACTIVE') {
  return {
    product_id: 3n,
    public_id: 'SS-REAL-TEE',
    slug: 'test-tee',
    index_code: '01',
    sku_base: 'SS-REAL-TEE',
    name: 'Test Tee',
    base_price: decimal(790),
    currency: 'BDT',
    spec: null,
    tagline: null,
    description: null,
    product_categories: { slug: 'tshirt', code: 'T-SHIRT', name: 'T-SHIRT' },
    product_images: [
      { image_id: 9n, image_type: 'STILL', color_code: 'BLACK', image_url: 'https://example.com/image.png', alt_text: 'Front', sort_order: 0 },
    ],
    product_features: [],
    product_variants: [variant(onHand, reserved, status)],
  };
}

test('public products expose only availability, never exact inventory', () => {
  const { mapPublicProduct } = loadMapper('modules/products/products.mapper.ts');
  const publicRecord = mapPublicProduct(product(14, 3));
  assertNoExactStock(publicRecord, 'product detail/list/collection');
  assert.equal(publicRecord.variants[0].inStock, true);
  assert.equal(publicRecord.availability.status, 'IN_STOCK');
  assert.equal(publicRecord.variants[0].price, 790);
  const soldOut = mapPublicProduct(product(3, 3));
  assertNoExactStock(soldOut, 'sold-out product');
  assert.equal(soldOut.variants[0].inStock, false);
  assert.equal(soldOut.availability.status, 'OUT_OF_STOCK');
  const inactive = mapPublicProduct(product(5, 0, 'INACTIVE'));
  assert.equal(inactive.variants[0].inStock, false);
});

test('frontend can render new public boolean availability without inventory quantities', () => {
  const { mapPublicProduct } = loadMapper('modules/products/products.mapper.ts');
  const { archiveProductFromApi } = loadMapper('../../frontend/src/lib/catalogApi.ts', {
    '@/lib/apiClient': { apiRequest: async () => { throw new Error('No network in unit test'); } },
  });
  const garment = archiveProductFromApi(mapPublicProduct(product(8, 2)));
  assert.equal(garment.inStock, true);
  assert.equal(garment.variants[0].inStock, true);
  assert.equal(garment.variants[0].colorCode, 'BLACK');
  assert.equal(garment.variants[0].size, 'L');
  assert.equal(garment.still, 'https://example.com/image.png');
  assertNoExactStock(garment, 'frontend public product props');
});

test('customer cart API reveals only inStock boolean and customer-selected quantity', () => {
  const { mapCart } = loadMapper('modules/carts/carts.mapper.ts', {
    '../../utils/decimal.js': { decimalToNumber: (v) => Number(v.toString()) },
  });
  const p = product(9, 4);
  const cartItem = {
    cart_item_id: 9n,
    product_variants: {
      ...p.product_variants[0],
      products: {
        ...p,
        product_categories: { ...p.product_categories, index_code: '02' },
      },
    },
    quantity: 2,
    price_when_added: decimal(790),
  };
  const mapped = mapCart({
    cart_token: 'token', status: 'ACTIVE', expires_at: null,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
    cart_items: [cartItem],
  });
  assertNoExactStock(mapped, 'cart');
  assert.equal(mapped.items[0].inStock, true);
  assert.equal(mapped.items[0].quantity, 2);
});

test('cart and checkout cannot send exact stock in error details', () => {
  const carts = read('modules/carts/carts.service.ts');
  const inventory = read('modules/inventory/inventory.service.ts');
  assert.doesNotMatch(carts, /details:\s*\{\s*available\s*\}/);
  assert.doesNotMatch(carts, /if\s*\(nextQty\s*>\s*available\)/);
  assert.match(carts, /if\s*\(available\s*===\s*0\)/);
  assert.doesNotMatch(inventory, /available:\s*Math\.max\(0, available\)/);
});

test('inventory quantities remain behind authenticated admin routes', () => {
  const adminRoutes = read('routes/admin.ts');
  assert.match(adminRoutes, /adminRouter\.use\(authenticateStaff\)/);
  assert.match(adminRoutes, /"\/inventory",\s*requireRoles\("ADMIN", "INVENTORY_MANAGER"\)/);
  const adminCatalog = read('modules/admin-catalog/admin-catalog.service.ts');
  assert.match(adminCatalog, /onHandQty:\s*variant\.inventory_stock\.on_hand_qty/);
  assert.match(adminCatalog, /reservedQty:\s*variant\.inventory_stock\.reserved_qty/);
});
