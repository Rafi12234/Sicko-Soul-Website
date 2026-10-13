const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
let ts;
try {
  ts = require(require.resolve('typescript', { paths: [path.join(root, 'frontend')] }));
} catch {
  const globalRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
  ts = require(path.join(globalRoot, 'typescript'));
}
const helperPath = path.join(root, 'frontend/src/lib/dropPlayback.ts');
const source = fs.readFileSync(helperPath, 'utf8');
const js = ts.transpileModule(source, {
  fileName: helperPath,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const sourceModule = new Module(path.join(root, 'frontend/src/lib/dropPlayback.js'));
sourceModule.filename = path.join(root, 'frontend/src/lib/dropPlayback.js');
sourceModule.paths = module.paths;
sourceModule._compile(js, sourceModule.filename);
const { createDropPlaybackController } = sourceModule.exports;

function emitter() {
  const events = new Map();
  return {
    addEventListener(type, listener) {
      const listeners = events.get(type) || new Set();
      listeners.add(listener); events.set(type, listeners);
    },
    removeEventListener(type, listener) { events.get(type)?.delete(listener); },
    emit(type) { for (const listener of events.get(type) || []) listener(); },
    listenerCount(type) { return events.get(type)?.size ?? 0; },
  };
}
function setup({ reduced = false, error = null } = {}) {
  const document = emitter(); document.hidden = false;
  const motion = emitter(); motion.matches = reduced;
  motion.addListener = listener => motion.addEventListener('change', listener);
  motion.removeListener = listener => motion.removeEventListener('change', listener);
  const window = { matchMedia: () => motion };
  Object.assign(global, { window, document });
  const video = emitter();
  Object.assign(video, {
    paused: true, muted: true, playsInline: true, preload: 'metadata',
    src: '', currentSrc: 'https://res.cloudinary.com/production/video/upload/c_limit,w_640/q_auto/f_auto/v123/drop.mp4',
    loadCalls: 0, playCalls: 0, pauseCalls: 0,
  });
  video.load = () => { video.loadCalls += 1; video.paused = true; };
  video.play = () => {
    video.playCalls += 1;
    if (error) { const previous = error; error = null; return Promise.reject(previous); }
    video.paused = false; video.emit('playing'); return Promise.resolve();
  };
  video.pause = () => { video.paused = true; video.pauseCalls += 1; video.emit('pause'); };
  const issues = [];
  const controller = createDropPlaybackController(video, {
    originalUrl: 'https://res.cloudinary.com/production/video/upload/v123/drop.mp4',
    onIssue: value => issues.push(value),
  });
  return { video, document, motion, controller, issues, window };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
afterEach(() => { delete global.window; delete global.document; });

test('matches Hero: enter viewport plays, leave pauses; no scroll subscription', async () => {
  const c = setup();
  c.controller.sync(true); await tick();
  assert.equal(c.video.playCalls, 1);
  assert.equal(c.video.paused, false);
  c.controller.sync(false);
  assert.equal(c.video.paused, true);
  assert.equal(c.document.listenerCount('scroll'), 0);
  c.controller.destroy();
});

test('visibilitychange stops playback and resumes upon return', async () => {
  const c = setup();
  c.controller.sync(true); await tick();
  c.document.hidden = true; c.document.emit('visibilitychange');
  assert.equal(c.video.paused, true);
  c.document.hidden = false; c.document.emit('visibilitychange'); await tick();
  assert.equal(c.video.paused, false);
  c.controller.destroy();
});

test('respects reduced motion unless visitor explicitly clicks Play', async () => {
  const c = setup({ reduced: true });
  c.controller.sync(true);
  assert.equal(c.video.playCalls, 0);
  assert.equal(c.issues.at(-1), 'reduced-motion');
  c.controller.playManually(); await tick();
  assert.equal(c.video.paused, false);
  assert.equal(c.issues.at(-1), null);
  c.controller.destroy();
});

test('autoplay rejection is visible and manual click retries synchronously', async () => {
  const c = setup({ error: new DOMException('not allowed', 'NotAllowedError') });
  c.controller.sync(true); await tick();
  assert.equal(c.issues.at(-1), 'blocked');
  const count = c.video.playCalls;
  c.controller.sync(true);
  assert.equal(c.video.playCalls, count);
  c.controller.playManually();
  assert.equal(c.video.playCalls, count + 1); // same user gesture, no timer
  await tick();
  assert.equal(c.video.paused, false);
  c.controller.destroy();
});

test('incompatible derivative falls back to the original URL once', async () => {
  const c = setup({ error: new DOMException('unsupported', 'NotSupportedError') });
  c.controller.sync(true); await tick();
  assert.equal(c.video.src, 'https://res.cloudinary.com/production/video/upload/v123/drop.mp4');
  assert.equal(c.video.loadCalls, 1);
  c.video.emit('error');
  assert.equal(c.video.loadCalls, 1);
  assert.equal(c.issues.at(-1), 'unavailable');
  c.controller.destroy();
});

test('temporary catalog refresh does not restart video lifecycle', async () => {
  const c = setup();
  c.controller.sync(true); await tick();
  c.controller.sync(true); c.controller.sync(true);
  await tick();
  assert.equal(c.video.playCalls, 1);
  assert.equal(c.video.loadCalls, 0);
  c.controller.destroy();
});

test('cleanup removes listeners and never forces an extra load()', async () => {
  const c = setup();
  c.controller.sync(true); await tick();
  assert.equal(c.video.loadCalls, 0);
  c.controller.destroy();
  assert.equal(c.video.listenerCount('playing'), 0);
  assert.equal(c.video.listenerCount('error'), 0);
  assert.equal(c.document.listenerCount('visibilitychange'), 0);
  assert.equal(c.motion.listenerCount('change'), 0);
});

test('New Drop matches Hero visibility boundaries and keeps scroll + Cloudinary unchanged', () => {
  const drop = fs.readFileSync(path.join(root, 'frontend/src/components/sections/Drop/index.tsx'), 'utf8');
  assert.match(drop, /id: "drop-video-runtime"/);
  assert.match(drop, /start: "top bottom"/);
  assert.match(drop, /end: "bottom top"/);
  assert.match(drop, /createDropPlaybackController\(video/);
  assert.match(drop, /\}, \[videoUrl\]\);/);
  assert.match(drop, /cloudinaryVideoUrl\(videoUrl, 640\)/);
  assert.match(drop, /cloudinaryVideoUrl\(videoUrl, 960\)/);
  assert.match(drop, /cloudinaryVideoUrl\(videoUrl, 1280\)/);
  assert.doesNotMatch(drop, /f_mp4,vc_h264/);
  assert.doesNotMatch(drop, /from "@\/hooks\/useLenis"/);
});

test('visible video with no playback progress uses a single bounded fallback', async () => {
  const normalSetTimeout = global.setTimeout;
  const normalClearTimeout = global.clearTimeout;
  const timers = [];
  global.setTimeout = callback => { const handle = { callback, cancelled: false }; timers.push(handle); return handle; };
  global.clearTimeout = handle => { if (handle) handle.cancelled = true; };
  let c;
  try {
    c = setup();
    c.controller.sync(true); await tick();
    const first = timers.find(t => !t.cancelled);
    assert.ok(first, 'expected a low-frequency progress check');
    first.cancelled = true;
    first.callback(); await tick();
    assert.equal(c.video.loadCalls, 1);
    assert.equal(c.video.src, 'https://res.cloudinary.com/production/video/upload/v123/drop.mp4');
    const second = timers.find(t => !t.cancelled);
    assert.ok(second);
    second.cancelled = true;
    second.callback(); await tick();
    assert.equal(c.video.loadCalls, 1);
    assert.equal(c.issues.at(-1), 'unavailable');
  } finally {
    c?.controller.destroy();
    global.setTimeout = normalSetTimeout;
    global.clearTimeout = normalClearTimeout;
  }
});

test('active video receiving timeupdate events does not trigger false fallback', async () => {
  const normalSetTimeout = global.setTimeout;
  const normalClearTimeout = global.clearTimeout;
  const timers = [];
  global.setTimeout = callback => { const handle = { callback, cancelled: false }; timers.push(handle); return handle; };
  global.clearTimeout = handle => { if (handle) handle.cancelled = true; };
  let c;
  try {
    c = setup();
    c.controller.sync(true); await tick();
    c.video.emit('timeupdate');
    const first = timers.find(t => !t.cancelled);
    assert.ok(first);
    first.cancelled = true;
    first.callback(); await tick();
    assert.equal(c.video.loadCalls, 0);
    assert.notEqual(c.issues.at(-1), 'unavailable');
  } finally {
    c?.controller.destroy();
    global.setTimeout = normalSetTimeout;
    global.clearTimeout = normalClearTimeout;
  }
});
