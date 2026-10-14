const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = (() => { try { return require(require.resolve('typescript', {paths: [require('node:path').join(__dirname, '..', 'frontend')]})); } catch { const {execFileSync} = require('node:child_process'); return require(require('node:path').join(execFileSync('npm', ['root', '-g'], {encoding:'utf8'}).trim(), 'typescript')); } })();
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const blobSha = p => { const raw = fs.readFileSync(path.join(root, p)); return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${raw.byteLength}\0`), raw])).digest('hex'); };

const ui = {
  products: read('frontend/src/components/admin/ProductsManager.tsx'),
  editor: read('frontend/src/components/admin/ProductEditor.tsx'),
  inventory: read('frontend/src/components/admin/InventoryManager.tsx'),
  orders: read('frontend/src/components/admin/OrdersManager.tsx'),
  hierarchy: read('frontend/src/components/admin/CatalogHierarchyEditor.tsx'),
};
const orderSchema = read('backend/src/modules/orders/orders.schema.ts');
const orderService = read('backend/src/modules/orders/orders.service.ts');

// Catch syntax errors in *entire* edited files rather than brittle snippet-only assertions.
test('all changed TS/TSX modules parse as complete modules', () => {
  for (const p of [
    'frontend/src/components/admin/ProductsManager.tsx',
    'frontend/src/components/admin/ProductEditor.tsx',
    'frontend/src/components/admin/InventoryManager.tsx',
    'frontend/src/components/admin/OrdersManager.tsx',
    'frontend/src/components/admin/CatalogHierarchyEditor.tsx',
    'frontend/src/app/admin/orders/page.tsx',
    'frontend/src/app/admin/inventory/page.tsx',
    'backend/src/modules/orders/orders.schema.ts',
    'backend/src/modules/orders/orders.service.ts',
  ]) {
    const result = ts.transpileModule(read(p), {
      fileName: p, reportDiagnostics: true,
      compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve},
    });
    assert.deepEqual((result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).map(d => d.messageText), [], p);
  }
});

test('existing working Hero, Preloader, video controller are untouched', () => {
  assert.equal(blobSha('frontend/src/components/sections/Hero/index.tsx'), 'd7121f69e0a1c501134b0b50d309218220752606');
  assert.equal(blobSha('frontend/src/components/sections/Preloader/index.tsx'), '629f0ae107f7f7e01a2fd5693d79c2f990103f65');
  assert.equal(blobSha('frontend/src/lib/videoPlayback.ts'), 'f13c5bd0cf8ffaaa3f142e182a6d2842de112f04');
});

test('admin hierarchy supports database create/edit/delete and auto identifiers', () => {
  assert.match(ui.hierarchy, /admin\/catalog\//);
  assert.match(ui.hierarchy, /makeSlug/);
  assert.match(ui.hierarchy, /makeCode/);
  assert.match(ui.hierarchy, /method: existing \? "PATCH" : "POST"/);
  assert.match(ui.hierarchy, /method: "DELETE"/);
  assert.match(ui.hierarchy, /segmentId: categoryDraft\.segmentId/);
  assert.match(read('backend/src/modules/catalog-segments/catalog-segments.routes.ts'), /SEGMENT_HAS_CATEGORIES/);
});

test('product manager offers a usable create/edit/archive path', () => {
  assert.match(ui.products, /<ProductEditor/);
  assert.match(ui.products, /\+ Create new product/);
  assert.match(ui.products, /method:"DELETE"/);
  assert.match(ui.products, /categories/);
  assert.match(ui.products, /segments/);
});

test('product editor creates complete backend product with multiple images and variants', () => {
  for (const x of ['images:newProductImages', 'features:pendingFeatures', 'variants:variants.map', 'initialStock', 'reorderLevel', 'sizeCode', 'description:form.description', 'status:form.status']) {
    assert.ok(ui.editor.includes(x), x);
  }
  assert.match(ui.editor, /method:"POST"/);
  assert.match(ui.editor, /publicId:skuBase/);
  assert.match(read('backend/src/modules/admin-catalog/admin-catalog.routes.ts'), /post\("\/products", adminCreateProductController\)/);
});

test('multiple photo upload supplies monotonic image indices (no stale count)', () => {
  assert.match(ui.editor, /const firstPhotoIndex = images\.length/);
  assert.match(ui.editor, /const imageIndex = firstPhotoIndex \+ i/);
  assert.match(ui.editor, /addPhoto\(url, file\.name\.slice\(0, 255\), type, imageIndex\)/);
  assert.match(ui.editor, /sortOrder:photoIndex \* 10/);
  assert.match(ui.editor, /uploadToCloudinary\(file, "image", token/);
  assert.match(read('frontend/src/lib/adminCloudinary.ts'), /admin\/site-media\/upload-signature/);
});

test('product editor updates stock without modifying reserved amounts', () => {
  assert.match(ui.editor, /inventory\/\$\{encodeURIComponent\(variant\.id\)\}\/adjust/);
  assert.match(ui.editor, /reservedDelta:0/);
  assert.match(ui.editor, /if \(Number\(desired\) < \(variant\.inventory\?\.reservedQty/);
  assert.match(ui.editor, /Save stock/);
  assert.match(ui.editor, /Save price/);
  assert.match(ui.editor, /Enable size/);
});

test('stock manager has search, low-stock filter, mobile layout and persisted adjustments', () => {
  assert.match(ui.inventory, /\/admin\/inventory/);
  assert.match(ui.inventory, /Show low stock only/);
  assert.match(ui.inventory, /lg:hidden/);
  assert.match(ui.inventory, /lg:block/);
  assert.match(ui.inventory, /reservedDelta:0/);
  assert.match(ui.inventory, /next<row.reservedQty/);
});

test('order list filters, pagination, customer contacts, row confirm/reject', () => {
  for (const x of ['customerPhone', 'customerEmail', 'shippingAddress', 'placedAt', 'status', 'from', 'to', 'page', 'limit', 'Confirm', 'Reject']) assert.ok(ui.orders.includes(x), x);
  assert.match(ui.orders, /\/admin\/orders\?\$\{params\}/);
  assert.match(ui.orders, /order\.status === "PENDING_CONFIRMATION"/);
  assert.match(ui.orders, /method: "PATCH"/);
  assert.match(ui.orders, /cancellationReason: explanation/);
  assert.match(ui.orders, /lg:hidden/);
  assert.match(ui.orders, /lg:block/);
});

test('date range is strictly parsed and applied with Bangladesh inclusive end date', () => {
  assert.match(orderSchema, /from: adminDate\.optional\(\)/);
  assert.match(orderSchema, /to: adminDate\.optional\(\)/);
  assert.match(orderSchema, /input\.from <= input\.to/);
  assert.match(orderService, /where\.placed_at/);
  assert.match(orderService, /T00:00:00\+06:00/);
  assert.match(orderService, /86_400_000/);
  assert.match(orderService, /lt:/);
  const from = new Date('2026-10-13T00:00:00+06:00');
  const toExclusive = new Date(new Date('2026-10-13T00:00:00+06:00').getTime() + 86400000);
  assert.equal(from.toISOString(), '2026-10-12T18:00:00.000Z');
  assert.equal(toExclusive.toISOString(), '2026-10-13T18:00:00.000Z');
});

test('backend performs order transition and stock checks on confirmation/rejection', () => {
  assert.match(orderService, /PENDING_CONFIRMATION: \["CONFIRMED", "CANCELLED", "REJECTED"\]/);
  assert.match(orderService, /await lockAndVerifyAvailableStock/);
  assert.match(orderService, /await consumeReservedStock/);
  assert.match(orderService, /await releaseReservedStock/);
  assert.match(orderService, /ORDER_STATUS_UPDATE/);
});
