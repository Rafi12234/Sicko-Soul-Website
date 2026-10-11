import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("public catalog gets a shared bounded TTL server cache", () => {
  const source = read("frontend/src/lib/cachedCatalogApi.ts");
  assert.match(source, /unstable_cache/);
  assert.match(source, /const REVALIDATE_SECONDS = 10;/);
  assert.match(source, /getCatalogArchive/);
  assert.match(source, /listCatalogSegments/);
  assert.match(source, /sicko-public-catalog/);
});

test("homepage shares the catalog cache and keeps site media dynamic", () => {
  const source = read("frontend/src/app/page.tsx");
  assert.match(source, /getCachedCatalogArchive\(\)/);
  assert.match(source, /getCachedCatalogSegments\(\)/);
  assert.match(source, /getHomepageMedia\(\)/);
  assert.match(source, /<Streets images=\{siteMedia\.streetsImages\}/);
});

test("product archive uses the same cache and retains segment selector", () => {
  const source = read("frontend/src/app/products/page.tsx");
  assert.match(source, /getCachedCatalogArchive\(\)/);
  assert.match(source, /getCachedCatalogSegments\(\)/);
  assert.match(source, /<ProductArchive categories=\{categories\} segments=\{segments\}/);
});

test("archive has a fast branded pending state", () => {
  const source = read("frontend/src/app/products/loading.tsx");
  assert.match(source, /PRODUCT ARCHIVE/);
  assert.match(source, /THE EVIDENCE/);
  assert.match(source, /aria-busy="true"/);
  assert.match(source, /<Navbar/);
});
