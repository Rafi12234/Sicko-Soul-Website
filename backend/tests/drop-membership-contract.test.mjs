import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const file = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('public drop listings and detail require an explicit active product membership', () => {
  const repo = file('../src/modules/collections/collections.repository.ts');
  assert.equal((repo.match(/collection_products: \{ some: publicMembershipWhere \}/g) ?? []).length, 2);
  assert.match(repo, /status: "ACTIVE"/);
  assert.match(repo, /include: detailInclude/);
  assert.doesNotMatch(repo, /products\.findMany\(/);
});

test('collection admin actions require staff roles and can inspect exact assigned products', () => {
  const routes = file('../src/modules/collections/collections.routes.ts');
  const admin = file('../src/routes/admin.ts');
  assert.match(routes, /get\("\/:collectionId", adminGetCollectionController\)/);
  assert.match(routes, /put\("\/:collectionId\/products", adminSetCollectionProductsController\)/);
  assert.match(admin, /"\/collections",\s*requireRoles\("ADMIN"\)/);
});

test('live drops must be explicitly populated, and clearing last active product is rejected', () => {
  const service = file('../src/modules/collections/collections.service.ts');
  assert.match(service, /Create the drop as DRAFT, add products, then publish it/);
  assert.match(service, /Add an active, visible product before publishing this drop/);
  assert.match(service, /Change this drop to DRAFT before removing its last active product/);
  assert.match(service, /collection_products\.deleteMany\(/);
  assert.match(service, /collection_products\.createMany\(/);
});

test('New Drop carousel does not fall back to an old or unrelated collection', () => {
  const drop = file('../../frontend/src/components/sections/Drop/index.tsx');
  assert.match(drop, /entry\.status === "LIVE" && hasVisibleProducts\(entry\)/);
  assert.match(drop, /entry\.status === "SCHEDULED" && hasVisibleProducts\(entry\)/);
  assert.doesNotMatch(drop, /collections\[0\] \?\? null/);
});

test('new admin drop product uses shared Products create action and collection_products link', () => {
  const editor = file('../../frontend/src/components/admin/ProductEditor.tsx');
  const screen = file('../../frontend/src/components/admin/DropsManager.tsx');
  assert.match(editor, /onCreated\(skuBase\)/);
  assert.match(editor, /call\("catalog\/products", \{ method:"POST"/);
  assert.match(screen, /onCreated=\{createProductAndLink\}/);
  assert.match(screen, /\/products`,/); // membership update endpoint contains /products
  assert.match(screen, /method: "PUT"/);
  assert.match(file('../../frontend/src/lib/adminNavigation.ts'), /"\/admin\/drops"/);
});
