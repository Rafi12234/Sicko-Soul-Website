import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const hero = readFileSync(new URL('../frontend/src/components/sections/Hero/index.tsx', import.meta.url), 'utf8');
const lenis = readFileSync(new URL('../frontend/src/hooks/useLenis.ts', import.meta.url), 'utf8');

test('hero video keeps playing throughout scroll gestures', () => {
  assert.match(hero, /const playVideo = \(visible \|\| \(enteringThroughPreloader && !entered\)\)/);
  assert.doesNotMatch(hero, /const playVideo =[^;]*!isScrolling/);
  assert.match(hero, /if \(playVideo && video\.paused\) void video\.play\(\)\.catch/);
  assert.match(hero, /else if \(!playVideo && !video\.paused\) video\.pause\(\)/);
  assert.match(hero, /ScrollTrigger\.addEventListener\("scrollStart", onScrollStart\)/);
  assert.match(hero, /ScrollTrigger\.addEventListener\("scrollEnd", onScrollEnd\)/);
  assert.match(hero, /const active = visible && !isScrolling/);
});

test('moves full-viewport film grade to Cloudinary with safe non-Cloudinary fallback', () => {
  assert.match(hero, /const HERO_GRADE = "e_saturation:-100\/e_contrast:20\/e_brightness:-10"/);
  assert.match(hero, /function colorGradeHeroMedia\(deliveryUrl: string\): string/);
  assert.match(hero, /const hasServerGrade = videoUrl\.includes\(CLOUDINARY_VIDEO_UPLOAD\) && !useOriginalDelivery/);
  assert.match(hero, /className=\{`\$\{hasServerGrade \? "" : "media-treat "\}/);
  assert.match(hero, /heroDeliveryUrl\(cloudinaryVideoUrl\(videoUrl, 640\)\)/);
  assert.match(hero, /heroDeliveryUrl\(cloudinaryVideoUrl\(videoUrl, 768\)\)/);
  assert.match(hero, /heroDeliveryUrl\(cloudinaryVideoUrl\(videoUrl, 1080\)\)/);
  assert.match(hero, /heroDeliveryUrl\(cloudinaryVideoPoster\(videoUrl, 960\)\)/);
  assert.match(hero, /onError=\{\(\) => \{ if \(hasServerGrade\) setUseOriginalDelivery\(true\); \}\}/);
  assert.match(hero, /window\.addEventListener\("sicko-hero-media-ready", syncAmbient\)/);
});

test('preserves cinematic preloader, hero brand UI and accessibility', () => {
  assert.match(hero, /id="sicko-hero-video"/);
  assert.match(hero, /preload="auto"/);
  assert.match(hero, /window\.addEventListener\("sicko-hero-entering", prepareEntryPlayback\)/);
  assert.match(hero, /intro\.play\(\)/);
  assert.match(hero, /className=\{styles\.headlineLockup\}/);
  assert.match(hero, /muted[\s\S]*loop[\s\S]*playsInline/);
  assert.doesNotMatch(hero, /id: "hero-headline-parallax"/);
});

test('Lenis and ScrollTrigger use one native animation-frame update loop', () => {
  assert.match(lenis, /lenis\.raf\(time\)/);
  assert.match(lenis, /lenis\.on\("scroll", ScrollTrigger\.update\)/);
  assert.match(lenis, /window\.requestAnimationFrame\(raf\)/);
  assert.match(lenis, /window\.cancelAnimationFrame\(rafId\)/);
  assert.doesNotMatch(lenis, /gsap\.ticker\.add\(/);
});
