import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('backend env accepts per-environment Cloudinary cloud names', () => {
  assert.match(read('backend/src/config/env.ts'), /CLOUDINARY_CLOUD_NAME: z\.string/);
});
test('signature endpoint sends the cloud name from backend env, not a fixed old account', () => {
  const route = read('backend/src/routes/site-media.ts');
  assert.match(route, /const cloudName = env\.CLOUDINARY_CLOUD_NAME/);
  assert.match(route, /if \(!cloudName \|\| !apiKey \|\| !secret\)/);
  assert.match(route, /cloudName, publicId, timestamp, overwrite, signature/);
  assert.doesNotMatch(route, /cloudName: "dec82taov"/);
});
test('upload validation supports configured account and existing legacy URLs', () => {
  const util = read('backend/src/utils/cloudinary-urls.ts');
  assert.match(util, /env\.CLOUDINARY_CLOUD_NAME/);
  assert.match(util, /LEGACY_CLOUD_NAMES = \["dec82taov"\]/);
  assert.match(util, /hostname !== "res\.cloudinary\.com"/);
  assert.match(read('backend/src/routes/site-media.ts'), /isAllowedCloudinaryUrl\(value, kind\)/);
  assert.match(read('backend/src/routes/site-content.ts'), /isAllowedCloudinaryUrl\(v, "image"\)/);
  assert.match(read('backend/src/routes/site-content.ts'), /isAllowedCloudinaryUrl\(v, "video"\)/);
});
test('frontend upload helper uses the signed cloud name throughout', () => {
  const helper = read('frontend/src/lib/adminCloudinary.ts');
  assert.match(helper, /signed\.cloudName/);
  assert.match(helper, /\$\{signed\.cloudName\}\/\$\{kind\}\/upload/);
  assert.doesNotMatch(helper, /dec82taov/);
});
test('Streets preview, homepage media parser and Site Media editor accept local cloud', () => {
  assert.doesNotMatch(read('frontend/src/components/admin/StreetsMediaEditor.tsx'), /values\[key\]\?\.src\?\.startsWith\("https:\/\/res\.cloudinary\.com\/dec82taov/);
  assert.doesNotMatch(read('frontend/src/lib/siteMedia.ts'), /item\.src\.startsWith\("https:\/\/res\.cloudinary\.com\/dec82taov/);
  assert.doesNotMatch(read('frontend/src/components/admin/SiteMediaEditor.tsx'), /startsWith\(`\/dec82taov\/\$\{kind\}/);
});
test('Next Image allows Cloudinary account paths, constrained to Cloudinary hostname', () => {
  const config=read('frontend/next.config.ts');
  assert.match(config, /hostname: "res\.cloudinary\.com"/);
  assert.match(config, /pathname: "\/\*\*"/);
});
test('previous lookbook index safety fix remains', () => {
  const route = read('backend/src/routes/site-media.ts');
  assert.match(route, /const existingFrame = frames\[body\.index\]/);
  assert.match(route, /media_id: existingFrame\.media_id/);
});
