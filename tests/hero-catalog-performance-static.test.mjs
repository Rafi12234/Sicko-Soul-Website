import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
test('public listing only is bounded and deduplicated', () => {
  const code = read('backend/src/modules/products/products.service.ts');
  assert.match(code, /LIST_CACHE_MS = 8_000/);
  assert.match(code, /LIST_CACHE_MAX_KEYS = 32/);
  assert.match(code, /if \(query\.q\) return loadPublicProducts\(query\)/);
  assert.match(code, /if \(found && found\.expiresAt > now\) return found\.request/);
  assert.match(code, /void request\.catch/);
  assert.doesNotMatch(code, /getPublicProduct\(identifier\)[\s\S]*listCache/);
});
test('hero video requests first frames during entry, never forces full-download', () => {
  const hero = read('frontend/src/components/sections/Hero/index.tsx');
  const pre = read('frontend/src/components/sections/Preloader/index.tsx');
  assert.match(hero, /id="sicko-hero-video"/);
  assert.match(hero, /preload="auto"/);
  assert.match(hero, /sicko-hero-entering/);
  assert.match(pre, /MutationObserver/);
  assert.match(pre, /loadeddata/);
  assert.match(pre, /setTimeout\(finish, 6_000\)/);
  assert.match(pre, /addPause\(2\.0 \* scale/);
  assert.match(pre, /video\.readyState >= HTMLMediaElement\.HAVE_CURRENT_DATA/);
  assert.match(pre, /window\.dispatchEvent\(new Event\("sicko-hero-entering"\)\)/);
});
