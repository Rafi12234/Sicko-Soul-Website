import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('only authenticated ADMIN/SUPER_ADMIN users can sign media uploads and save media records', () => {
  const routes = read('backend/src/routes/admin.ts');
  assert.match(routes, /adminRouter\.use\(authenticateStaff\)/);
  assert.match(routes, /adminRouter\.use\("\/site-media", requireRoles\("ADMIN"\), adminSiteMediaRouter\)/);
  assert.match(routes, /adminRouter\.use\("\/site-content", requireRoles\("ADMIN"\), adminSiteContentRouter\)/);
  const media = read('backend/src/routes/site-media.ts');
  assert.match(media, /adminSiteMediaRouter\.post\("\/upload-signature"/);
  assert.match(media, /createHash\("sha1"\)/);
  assert.match(media, /adminSiteMediaRouter\.put\("\/uploaded-asset"/);
});

test('API credentials are used in backend only; no secret is included in signature response', () => {
  const api = read('backend/src/routes/site-media.ts');
  const env = read('backend/src/config/env.ts');
  const client = read('frontend/src/lib/adminCloudinary.ts');
  assert.match(env, /CLOUDINARY_API_SECRET: z\.string/);
  assert.match(env, /CLOUDINARY_API_KEY: z\.string/);
  assert.match(api, /const secret = env\.CLOUDINARY_API_SECRET/);
  assert.match(api, /res\.json\(\{ data: \{ kind, apiKey, cloudName, publicId, timestamp, overwrite, signature \} \}\)/);
  assert.doesNotMatch(client, /CLOUDINARY_API_SECRET|NEXT_PUBLIC_CLOUDINARY/);
  assert.match(client, /https:\/\/api\.cloudinary\.com\/v1_1/);
  assert.match(client, /new FormData\(\)/);
});

test('successful uploaded media is written to one correct database slot, not an entire stale media array', () => {
  const media = read('backend/src/routes/site-media.ts');
  for (const slot of ['HERO_VIDEO', 'DROP_VIDEO', 'LOOKBOOK', 'STREETS_PRIMARY', 'STREETS_SECONDARY'])
    assert.match(media, new RegExp(slot));
  assert.match(media, /tx\.site_media\.upsert\(/);
  assert.match(media, /tx\.site_media\.update\(/);
  assert.match(media, /SITE_MEDIA_UPLOAD_SAVE/);
  const editor = read('frontend/src/components/admin/SiteMediaEditor.tsx');
  assert.match(editor, /uploadToCloudinary\(file, kind, token, setProgress\)/);
  assert.match(editor, /saveUploadedSiteMedia\(token, typeof target === "number"/);
  const streets = read('frontend/src/components/admin/StreetsMediaEditor.tsx');
  assert.match(streets, /saveUploadedSiteMedia\(token, key === "primary"/);
});

test('logo and soundtrack upload is persisted without deleting other content fields', () => {
  const source = read('backend/src/routes/site-content.ts');
  assert.ok(source.indexOf('adminSiteContentRouter.put("/uploaded-asset"') < source.indexOf('adminSiteContentRouter.put("/:key"'), 'specific upload route must precede dynamic section route');
  assert.match(source, /const next = \{ \.\.\.content, \[field\]: body\.url \}/);
  assert.match(source, /tx\.site_content_sections\.upsert\(/);
  assert.match(source, /SITE_CONTENT_MEDIA_UPLOAD_SAVE/);
  const editor = read('frontend/src/components/admin/ContentUpdateEditor.tsx');
  assert.match(editor, /uploadToCloudinary\(file, target === "logo" \? "image" : "video", token, setAssetProgress\)/);
  assert.match(editor, /"\/admin\/site-content\/uploaded-asset"/);
});

test('existing catalog and uploaded-product workflows are not altered', () => {
  const editor = read('frontend/src/components/admin/ContentUpdateEditor.tsx');
  assert.match(editor, /selectedKey === "navigation" \|\| selectedKey === "audio"/);
  const config = read('backend/.env.cloudinary.example');
  assert.match(config, /CLOUDINARY_API_KEY=/);
  assert.match(config, /CLOUDINARY_API_SECRET=/);
  assert.doesNotMatch(config, /sk_test|sk_live/);
});
