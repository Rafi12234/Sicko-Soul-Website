import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFileSync(root + path,'utf8');
test('Prisma schema reflects manually created segment hierarchy SQL',()=>{
 const s=read('backend/prisma/schema.prisma');
 assert.match(s,/model catalog_segments\s*\{/);
 assert.match(s,/@unique\(map: "uq_catalog_segments_code"\)/);
 assert.match(s,/map: "fk_product_categories_segment"/);
 assert.match(s,/@db.UnsignedBigInt/);
 assert.match(s, /idx_product_categories_segment/);
});
test('public catalog excludes orphaned and inactive parent categories',()=>{
 const s=read('backend/src/modules/categories/categories.repository.ts');
 assert.match(s,/catalog_segments: \{ is: \{ is_active: true \} \}/);
 assert.match(s,/catalog_segments: \{ select:/);
});
test('existing category IDs and product associations are retained',()=>{
 const s=read('backend/src/modules/admin-catalog/admin-catalog.service.ts');
 assert.match(s,/CATEGORY_HAS_PRODUCTS/);
 assert.match(s,/data\.catalog_segments/);
 assert.match(s,/segment_id: input.segmentId/);
});
test('main segment and empty-category safe deletion are distinct routes',()=>{
 assert.match(read('backend/src/routes/index.ts'),/apiRouter.use\("\/segments"/);
 assert.match(read('backend/src/routes/admin.ts'),/adminSegmentsRouter/);
 assert.match(read('backend/src/modules/catalog-segments/catalog-segments.routes.ts'),/SEGMENT_HAS_CATEGORIES/);
 assert.match(read('backend/src/modules/admin-catalog/admin-catalog.routes.ts'),/delete\("\/categories\/\:categoryId"/);
});
test('homepage and products page use the same dynamic segment API',()=>{
 const api=read('frontend/src/lib/catalogApi.ts');
 const page=read('frontend/src/app/page.tsx');
 const products=read('frontend/src/app/products/page.tsx');
 assert.match(api,/"\/segments"/);
 assert.match(api,/category\.segment/);
 assert.match(page, /segments=\{segments\}/);
 assert.match(products, /segments=\{segments\}/);
 assert.match(read('frontend/src/components/sections/Rack/index.tsx'),/visibleCategories/);
 assert.match(read('frontend/src/components/sections/ProductArchive/index.tsx'),/visibleCategories/);
});
test('previous approved Streets database images are preserved on homepage',()=>{
 assert.match(read('frontend/src/app/page.tsx'),/Streets images=\{siteMedia\.streetsImages\}/);
 const s=read('frontend/src/components/sections/Streets/index.tsx');
 assert.doesNotMatch(s, /MEDIA\.images\.image[45]/);
});
