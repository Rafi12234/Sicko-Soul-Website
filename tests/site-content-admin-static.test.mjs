import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('content API mounted publicly, but writes require staff authorization', () => {
  assert.match(read('backend/src/routes/index.ts'), /apiRouter\.use\("\/site-content", publicSiteContentRouter\)/);
  assert.match(read('backend/src/routes/admin.ts'), /adminRouter\.use\(authenticateStaff\)/);
  assert.match(read('backend/src/routes/admin.ts'), /adminRouter\.use\("\/site-content", requireRoles\("ADMIN"\), adminSiteContentRouter\)/);
  assert.match(read('backend/src/routes/site-content.ts'), /adminSiteContentRouter\.put\("\/:key"/);
  assert.match(read('backend/src/routes/site-content.ts'), /assertSafeTree/);
});

test('Prisma schema and Workbench SQL agree on the content table', () => {
  assert.match(read('backend/prisma/schema.prisma'), /model site_content_sections\s*\{/);
  const sql = read('database/site-content-sections.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS site_content_sections/);
  assert.match(sql, /JSON_VALID\(content_json\)/);
});

test('all homepage content sections read managed copy, without editing product records', () => {
  const sections = ['Hero','Manifesto','Drop','Rack','Streets','Lookbook','Cred','Feedback','Footer','Preloader'];
  for (const name of sections) {
    const source = read(`frontend/src/components/sections/${name}/index.tsx`);
    assert.match(source, /useSiteCopy\(/, name);
  }
  assert.match(read('frontend/src/components/ui/Navbar.tsx'), /useSiteCopy\("navigation"/);
  const page = read('frontend/src/app/page.tsx');
  assert.match(page, /mergeCopy\(STATEMENTS, content\.statementBands\)/);
});

test('admin bypasses sound, cursor and 001-100 gate', () => {
  const shell = read('frontend/src/components/providers/RuntimeShell.tsx');
  assert.match(shell, /startsWith\("\/admin"\)/);
  assert.match(shell, /if \(isAdmin\) return/);
  assert.match(shell, /<Preloader\s*\/>/);
  assert.match(shell, /<SiteAudio src=\{soundtrackUrl\}\s*\/>/);
  assert.match(read('frontend/src/app/globals.css'), /html:has\(\[data-admin-shell\]\)/);
});

test('admin has sidebar with editable copy, media, catalog and operations', () => {
  const admin = read('frontend/src/components/admin/AdminShell.tsx');
  assert.match(admin, /Admin navigation/);
  const cms = read('frontend/src/app/admin/content/page.tsx');
  const media = read('frontend/src/app/admin/media/page.tsx');
  const catalog = read('frontend/src/app/admin/catalog/page.tsx');
  assert.match(cms, /ContentUpdateEditor/);
  assert.match(media, /SiteMediaEditor/);
  assert.match(media, /StreetsMediaEditor/);
  assert.match(catalog, /CatalogHierarchyEditor/);
  assert.match(read('frontend/src/components/admin/ContentUpdateEditor.tsx'), /SAVE SECTION/);
  assert.match(read('frontend/src/components/admin/ContentUpdateEditor.tsx'), /Restore original copy/);
});

test('Streets media persists to its own slots, not Gallery or Hero', () => {
  const routes = read('backend/src/routes/site-media.ts');
  assert.match(routes, /adminSiteMediaRouter\.put\("\/streets"/);
  assert.match(routes, /slot: "STREETS_PRIMARY"/);
  assert.match(routes, /slot: "STREETS_SECONDARY"/);
  assert.match(routes, /STREETS_MEDIA_UPDATE/);
});

test('public original media and inventory are not replaced with hardcoded assets', () => {
  const media = read('frontend/src/lib/siteMedia.ts');
  assert.match(media, /getHomepageMedia/);
  const home = read('frontend/src/app/page.tsx');
  assert.match(home, /siteMedia\.heroVideoUrl/);
  assert.match(home, /siteMedia\.streetsImages/);
  assert.match(home, /getCachedCatalogArchive/);
});
