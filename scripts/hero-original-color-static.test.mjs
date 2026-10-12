import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const hero = readFileSync(new URL('../frontend/src/components/sections/Hero/index.tsx', import.meta.url), 'utf8');

test('hero no longer forces Cloudinary saturation or browser grayscale', () => {
  assert.doesNotMatch(hero, /HERO_GRADE|e_saturation:-100|colorGradeHeroMedia|media-treat|hasServerGrade/);
  assert.match(hero, /className="h-full w-full object-cover"/);
  assert.match(hero, /src=\{cloudinaryVideoUrl\(videoUrl, 640\)\}/);
  assert.match(hero, /src=\{cloudinaryVideoUrl\(videoUrl, 768\)\}/);
  assert.match(hero, /src=\{cloudinaryVideoUrl\(videoUrl, 1080\)\}/);
});

test('poster is not color-graded or altered', () => {
  assert.match(hero, /poster=\{cloudinaryVideoPoster\(videoUrl, 960\)\}/);
});

test('hero does not darken the video using vignette or scanline overlays', () => {
  assert.doesNotMatch(hero, /styles\.vignette|styles\.scanlines/);
});

test('existing continuous-playback and entrance hooks remain intact', () => {
  assert.match(hero, /id="sicko-hero-video"/);
  assert.match(hero, /preload="auto"/);
  assert.match(hero, /onLoadedData=\{\(\) => window\.dispatchEvent/);
  assert.match(hero, /window\.addEventListener\("sicko-hero-entering", prepareEntryPlayback\)/);
  assert.match(hero, /const playVideo = \(visible \|\| \(enteringThroughPreloader && !entered\)\)/);
  assert.match(hero, /const active = visible && !isScrolling/);
});
