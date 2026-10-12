import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const base="frontend/src/";
test("independent admin routes with shared layout",()=>{
 const paths=["content","media","catalog","products","orders","inventory","shipments","customers","reviews","complaints","payments","refunds","staff","audit","email","settings","login"];
 for(const path of paths) assert.ok(existsSync(new URL(`../${base}app/admin/${path}/page.tsx`,import.meta.url)),path);
 assert.match(read(base+"app/admin/layout.tsx"),/AdminSessionProvider/);
 assert.match(read(base+"app/admin/layout.tsx"),/AdminShell/);
 assert.doesNotMatch(read(base+"app/admin/page.tsx"),/AdminConsole/);
});
test("admin shell gates UI, backend retains role enforcement",()=>{
 const shell=read(base+"components/admin/AdminShell.tsx");
 const nav=read(base+"lib/adminNavigation.ts");
 const routes=read("backend/src/routes/admin.ts");
 assert.match(shell,/canAccessSection/);
 assert.match(shell,/checking/);
 assert.match(shell,/recoveryError/);
 assert.match(nav,/SUPER_ADMIN/);
 assert.match(routes,/adminRouter\.use\(authenticateStaff\)/);
 assert.match(routes,/requireRoles\("ADMIN"/);
 assert.match(read("backend/src/middleware/auth.ts"),/admin_sessions/);
});
test("session credentials only in HttpOnly cookie plus in-memory JWT",()=>{
 const auth=read(base+"components/admin/AdminSessionProvider.tsx");
 const session=read(base+"lib/adminSession.ts");
 assert.match(auth,/refreshAdminSession/);
 assert.match(auth,/signOutAdmin/);
 assert.match(session,/credentials: "include"/);
 assert.doesNotMatch(auth+session,/(?:window\.|globalThis\.)?(?:localStorage|sessionStorage)\.(?:getItem|setItem)/);
});
test("sidebar is responsive and all views have unique paths",()=>{
 const shell=read(base+"components/admin/AdminShell.tsx");
 assert.match(shell,/lg:hidden/);
 assert.match(shell,/lg:grid/);
 assert.match(shell,/aria-expanded/);
 assert.match(shell,/aria-current/);
 const nav=read(base+"lib/adminNavigation.ts");
 const hrefs=[...nav.matchAll(/href:"(\/admin(?:\/[a-z-]+)*)"/g)].map(m=>m[1]);
 assert.equal(hrefs.length,new Set(hrefs).size);
});
test("catalog, media, content and operation pages preserve connected components",()=>{
 assert.match(read(base+"app/admin/content/page.tsx"),/ContentUpdateEditor/);
 assert.match(read(base+"app/admin/media/page.tsx"),/SiteMediaEditor/);
 assert.match(read(base+"app/admin/media/page.tsx"),/StreetsMediaEditor/);
 assert.match(read(base+"app/admin/catalog/page.tsx"),/CatalogHierarchyEditor/);
 assert.match(read(base+"components/admin/AdminOperationPage.tsx"),/\/admin\/\$\{resource\}/);
 assert.match(read(base+"components/admin/ProductsManager.tsx"),/admin\/catalog\/products/);
});
