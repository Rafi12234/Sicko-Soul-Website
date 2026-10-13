const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const get = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const hero = get('frontend/src/components/sections/Hero/index.tsx');
const drop = get('frontend/src/components/sections/Drop/index.tsx');
const pre = get('frontend/src/components/sections/Preloader/index.tsx');
let ts;
try { ts = require(require.resolve('typescript', { paths: [path.join(root, 'frontend')] })); }
catch { ts = require(path.join(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(), 'typescript')); }

test('complete Drop and Preloader TSX files parse without syntax errors', () => {
  for (const [name, source] of [['Drop/index.tsx', drop], ['Preloader/index.tsx', pre]]) {
    const result = ts.transpileModule(source, {
      fileName: name,
      reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve },
    });
    assert.equal((result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0, name);
  }
});

test('Hero source remains identical to the working production main version', () => {
  const { createHash } = require('node:crypto');
  const bytes = Buffer.from(hero, 'utf8');
  const gitBlob = createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
  assert.equal(gitBlob, 'd7121f69e0a1c501134b0b50d309218220752606');
});

test('New Drop uses the very same playback controller as Hero', () => {
  for (const file of [hero, drop]) {
    assert.match(file, /import \{ createVideoPlaybackController/);
    assert.match(file, /createVideoPlaybackController\(/);
    assert.match(file, /cloudinaryVideoMp4Url\(/);
    assert.match(file, /preload="auto"/);
  }
  assert.doesNotMatch(drop, /createDropPlaybackController|dropPlayback/);
  assert.doesNotMatch(drop, /Tap to play video/);
  assert.match(drop, /\}, \[videoUrl\]\);/);
});

test('Hero and New Drop use matching responsive widths and Cloudinary delivery helper', () => {
  for (const width of [640, 768, 1080]) {
    for (const source of [hero, drop]) assert.ok(source.includes(`cloudinaryVideoUrl(videoUrl, ${width})`));
  }
  assert.match(drop, /cloudinaryVideoPoster\(videoUrl, 960\)/);
  assert.match(drop, /\bmuted\b[\s\S]*\bloop\b[\s\S]*\bplaysInline\b/);
});

test('New Drop visibility matches Hero and does not add a scroll loop', () => {
  for (const section of [hero, drop]) {
    assert.match(section, /start: "top bottom"/);
    assert.match(section, /end: "bottom top"/);
  }
  assert.match(drop, /playback\.sync\(active && !document\.hidden\)/);
  assert.doesNotMatch(drop, /window\.addEventListener\("scroll"|requestAnimationFrame\(.*play/);
});

test('New Drop loading begins during counter, but only Hero gates its 100 completion', () => {
  assert.match(drop, /id="sicko-drop-video"/);
  assert.match(pre, /document\.getElementById\("sicko-hero-video"\)/);
  assert.match(pre, /document\.getElementById\("sicko-drop-video"\)/);
  assert.match(pre, /found\.preload = "auto"/);
  assert.match(pre, /found\.networkState === HTMLMediaElement\.NETWORK_EMPTY\) found\.load\(\)/);
  assert.match(pre, /\.addPause\(2\.0 \* scale, \(\) => \{[\s\S]*?void heroPrimed\.then/);
  assert.doesNotMatch(pre, /await dropPrimed|dropPrimed\.then|Promise\.all\(\[heroPrimed/);
});

test('Preloader does not prime videos under reduced-motion or Save Data, and cleans up listeners', () => {
  assert.match(pre, /window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches/);
  assert.match(pre, /\.connection\?\.saveData/);
  assert.match(pre, /let cancelDropPrime = \(\) => \{\}/);
  assert.match(pre, /observer\?\.disconnect\(\)/);
  assert.match(pre, /cancelDropPrime\(\)/);
});


test('New Drop no longer GPU-transforms or backdrop-filters the decoding video surface', () => {
  const css = get('frontend/src/components/sections/Drop/Drop.module.css');
  assert.doesNotMatch(drop, /ref={videoWrapRef}|to\(videoWrapRef\.current|fromTo\(\s*videoWrapRef\.current/);
  assert.doesNotMatch(css, /-webkit-backdrop-filter:|(?<!-)backdrop-filter:/);
  assert.doesNotMatch(drop, /id: "drop-plate"/);
});

test('New Drop preloads through the counter and never waits on its loading deadline', () => {
  assert.match(pre, /let cancelDropPrime = \(\) => \{\};/);
  assert.match(pre, /primeDropVideo\(\);/);
  assert.match(pre, /if \(found\.networkState === HTMLMediaElement\.NETWORK_EMPTY\) found\.load\(\)/);
  assert.match(pre, /cancelDropPrime\(\)/);
  assert.doesNotMatch(pre, /await dropPrimed|dropPrimed\.then/);
});
