import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const hero = read('frontend/src/components/sections/Hero/index.tsx');
const lenis = read('frontend/src/hooks/useLenis.ts');

test('hold the last hero video frame during Lenis scrolling', () => {
  assert.match(hero, /ScrollTrigger\.addEventListener\("scrollStart", onScrollStart\)/);
  assert.match(hero, /ScrollTrigger\.addEventListener\("scrollEnd", onScrollEnd\)/);
  assert.match(hero, /ScrollTrigger\.removeEventListener\("scrollStart", onScrollStart\)/);
  assert.match(hero, /ScrollTrigger\.removeEventListener\("scrollEnd", onScrollEnd\)/);
  assert.match(hero, /isScrolling = true;[\s\S]*?syncAmbient\(\)/);
  assert.match(hero, /isScrolling = false;[\s\S]*?syncAmbient\(\)/);
  assert.match(hero, /\(visible && !isScrolling\)/);
  assert.match(hero, /else if \(!playVideo && !video\.paused\) video\.pause\(\)/);
  assert.doesNotMatch(hero, /window\.addEventListener\("scroll"/);
});

test('keep the video warm during the existing entry ritual', () => {
  assert.match(hero, /enteringThroughPreloader && !entered/);
  assert.match(hero, /window\.addEventListener\("sicko-hero-entering", prepareEntryPlayback\)/);
  assert.match(hero, /id="sicko-hero-video"/);
  assert.match(hero, /preload="auto"/);
  assert.match(hero, /poster=\{cloudinaryVideoPoster\(videoUrl, 1280\)\}/);
});

test('remove expensive per-frame scroll parallax without removing branding', () => {
  assert.doesNotMatch(hero, /id: "hero-headline-parallax"/);
  assert.match(hero, /className=\{styles\.headlineLockup\}/);
  assert.match(hero, /className="media-treat h-full w-full object-cover/);
  assert.match(hero, /cloudinaryVideoUrl\(videoUrl, 640\)/);
  assert.match(hero, /cloudinaryVideoUrl\(videoUrl, 768\)/);
  assert.match(hero, /cloudinaryVideoUrl\(videoUrl, 1080\)/);
});

test('Lenis is driven by browser frame time and cleaned up', () => {
  assert.match(lenis, /lenis\.on\("scroll", ScrollTrigger\.update\)/);
  assert.match(lenis, /lenis\.raf\(time\)/);
  assert.match(lenis, /rafId = window\.requestAnimationFrame\(raf\)/);
  assert.match(lenis, /window\.cancelAnimationFrame\(rafId\)/);
  assert.doesNotMatch(lenis, /gsap\.ticker\.add\(/);
  assert.match(lenis, /lenis\.destroy\(\)/);
});
