import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('admin token refresh is HttpOnly and server sessions are revocable', () => {
  const auth = read('backend/src/modules/admin-auth/admin-auth.controller.ts');
  const service = read('backend/src/modules/admin-auth/admin-auth.service.ts');
  const middleware = read('backend/src/middleware/auth.ts');
  assert.match(auth, /httpOnly:\s*true/);
  assert.match(auth, /sameSite:\s*"strict"/);
  assert.match(auth, /secure:\s*env\.NODE_ENV === "production"/);
  assert.match(auth, /assertTrustedOrigin\(req\)/);
  assert.match(service, /refresh_hash: digest\(newToken\)/);
  assert.match(service, /updateMany\(/);
  assert.match(service, /revoked_at: new Date\(\)/);
  assert.match(middleware, /session_id: payload\.sid/);
  assert.match(middleware, /revoked_at: null/);
});

test('admin login, refresh and logout are authenticated endpoints with rate limiting', () => {
  const routes = read('backend/src/modules/admin-auth/admin-auth.routes.ts');
  const admin = read('backend/src/routes/admin.ts');
  assert.match(routes, /post\("\/login", authRateLimit/);
  assert.match(routes, /post\("\/refresh", authRateLimit/);
  assert.match(routes, /post\("\/logout"/);
  assert.match(admin, /adminRouter\.use\(authenticateStaff\)/);
  assert.match(admin, /requireRoles\("ADMIN"\)/);
});

test('refresh survives reload without tokens in localStorage', () => {
  const ui = read('frontend/src/components/admin/AdminSessionProvider.tsx');
  const session = read('frontend/src/lib/adminSession.ts');
  assert.match(ui, /refreshAdminSession\(\)/);
  assert.match(ui, /signOutAdmin\(\)/);
  assert.match(session, /credentials: "include"/);
  assert.doesNotMatch(session, /(?:window\.|globalThis\.)?(?:localStorage|sessionStorage)\.(?:setItem|getItem)/);
  assert.match(session, /refreshInFlight/);
});

test('admin mobile navigation and isolated overflow', () => {
  const ui = read('frontend/src/components/admin/AdminShell.tsx');
  assert.match(ui, /aria-expanded=\{open\}/);
  assert.match(ui, /lg:hidden/);
  assert.match(ui, /lg:block/);
  assert.match(ui, /min-w-0/);
  assert.match(read('frontend/src/components/admin/AdminOperationPage.tsx'), /overflow-x-auto/);
});

test('uploads enforce 3MB/60MB and provide real XHR progress', () => {
  const upload = read('frontend/src/lib/adminCloudinary.ts');
  const route = read('backend/src/routes/site-media.ts');
  assert.match(upload, /ADMIN_IMAGE_MAX_BYTES = 3 \* 1024 \* 1024/);
  assert.match(upload, /ADMIN_VIDEO_MAX_BYTES = 60 \* 1024 \* 1024/);
  assert.match(upload, /new XMLHttpRequest/);
  assert.match(upload, /xhr\.upload\.onprogress/);
  assert.match(upload, /sizeBytes: file\.size/);
  assert.match(route, /sizeBytes > maximum/);
  assert.match(route, /3 \* 1024 \* 1024/);
  assert.match(route, /60 \* 1024 \* 1024/);
});

test('upload indicators cover image video and soundtrack editors', () => {
  for (const p of [
    'frontend/src/components/admin/SiteMediaEditor.tsx',
    'frontend/src/components/admin/StreetsMediaEditor.tsx',
    'frontend/src/components/admin/ContentUpdateEditor.tsx',
  ]) {
    const component = read(p);
    assert.match(component, /UploadProgressIndicator/);
    assert.match(component, /stage: "saving"/);
  }
});

test('new table matches Prisma schema without editing existing tables', () => {
  const sql = read('database/admin-sessions.sql');
  const prisma = read('backend/prisma/schema.prisma');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS admin_sessions/);
  assert.match(sql, /refresh_hash CHAR\(64\)/);
  assert.match(prisma, /model admin_sessions/);
  assert.match(prisma, /refresh_hash\s+String/);
});
