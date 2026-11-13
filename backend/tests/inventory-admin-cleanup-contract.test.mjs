import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const source = (rel) => readFileSync(resolve(root, rel), 'utf8');

const repository = source('backend/src/modules/inventory/inventory.repository.ts');
const service = source('backend/src/modules/inventory/inventory.service.ts');
const screen = source('frontend/src/components/admin/InventoryManager.tsx');
const sql = source('sql/01_DELETE_ONLY_ORIGINAL_DUMMY_PRODUCTS.sql');

test('archived products and retired sizes are excluded in admin inventory SQL query', () => {
  assert.match(repository, /status:\s*\{\s*not:\s*"ARCHIVED"/);
  assert.match(repository, /products:\s*\{\s*is:\s*\{\s*status:\s*\{\s*not:\s*"ARCHIVED"/);
  assert.match(repository, /prisma\.inventory_stock\.findMany\(/);
});

test('admin inventory exposes per-variant colour without changing customer APIs', () => {
  assert.match(service, /colorCode:\s*row\.product_variants\.color_code/);
  assert.match(screen, /\/admin\/inventory/);
  assert.match(screen, /Authorization:\s*`Bearer \$\{token\}`/);
});

test('stock UI offers product, colour and size dropdowns; no rows table', () => {
  for (const id of ['inventory-product', 'inventory-colour', 'inventory-size']) {
    assert.match(screen, new RegExp('id="' + id + '"'));
  }
  assert.doesNotMatch(screen, /<table/);
  assert.match(screen, /New physical stock total/);
  assert.match(screen, /Save stock/);
  assert.match(screen, /selected\.reservedQty/);
});

test('only original archived demo IDs are removed; historic orders block hard delete', () => {
  for (const id of [
    'shirt-01', 'shirt-02', 'shirt-03', 'shirt-04', 'tshirt-01',
    'baggy-01', 'dropshoulder-01', 'dropshoulder-02', 'dropshoulder-03',
    'dropshoulder-04', 'hoodie-01', 'SS-13E625D527741',
  ]) assert.ok(sql.includes("'" + id + "'"), `${id} missing from cleanup list`);
  assert.match(sql, /status\s*=\s*'ARCHIVED'/);
  assert.match(sql, /FROM order_items/);
  assert.match(sql, /FROM product_reviews/);
  assert.match(sql, /SIGNAL SQLSTATE '45000'/);
  assert.match(sql, /START TRANSACTION/);
  assert.match(sql, /COMMIT;/);
  assert.doesNotMatch(sql, /SET FOREIGN_KEY_CHECKS\s*=\s*0/i);
  assert.doesNotMatch(sql, /SS-REAL-(?:WARRIOR|NINJA)/);
});
