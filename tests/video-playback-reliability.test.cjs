const {test, afterEach} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { execFileSync } = require('node:child_process');
// Resolve the TypeScript compiler installed in frontend (portable on Windows).
let ts;
try {
  const local = require.resolve('typescript', { paths: [path.resolve(__dirname, '../frontend')] });
  ts = require(local);
} catch {
  const globalModules = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
  ts = require(path.join(globalModules, 'typescript'));
}

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'frontend/src/lib/videoPlayback.ts'), 'utf8');
const js = ts.transpileModule(source, {fileName:'videoPlayback.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const codeModule = new Module(path.join(root,'frontend/src/lib/videoPlayback.js'));
codeModule.filename = path.join(root,'frontend/src/lib/videoPlayback.js');
codeModule.paths = module.paths;
codeModule._compile(js,codeModule.filename);
const {createVideoPlaybackController} = codeModule.exports;

function events(){
 const handlers = new Map();
 return {
  addEventListener(n,cb) {const set=handlers.get(n)||new Set();set.add(cb);handlers.set(n,set)},
  removeEventListener(n,cb) {handlers.get(n)?.delete(cb)},
  dispatch(n) {for(const cb of handlers.get(n)||[])cb()},
  listeners(n){return handlers.get(n)?.size ?? 0},
 };
}
function setup({reduced = false,playError=null}={}){
 const media=events();Object.assign(media,{matches:reduced,addListener(callback){media.addEventListener('change',callback)},removeListener(callback){media.removeEventListener('change',callback)}});
 const document=events();document.hidden=false;
 const window=events();window.matchMedia=()=>media;
 Object.assign(global,{window,document,HTMLMediaElement:{HAVE_FUTURE_DATA:3}});
 const video=events();Object.assign(video,{muted:true,paused:true,playsInline:true,readyState:0,src:'',playCalls:0,loadCalls:0});
 video.play=()=>{video.playCalls++;if(playError){const e=playError;playError=null;return Promise.reject(e)}video.paused=false;video.dispatch('playing');return Promise.resolve()};
 video.pause=()=>{video.paused=true;video.dispatch('pause')};
 video.load=()=>{video.loadCalls++;video.readyState=0;video.paused=true};
 const issues=[];
 const controller=createVideoPlaybackController(video,{fallbackUrl:()=> 'https://res.cloudinary.com/prod/video/upload/f_mp4,vc_h264/clip.mp4',onIssue:x=>issues.push(x)});
 return {video,controller,issues,document,window,media};
}
afterEach(()=>{delete global.window;delete global.document;delete global.HTMLMediaElement});
const tick = () => new Promise(resolve=>setImmediate(resolve));
test('plays only while visible and pauses offscreen without scroll listeners',async()=>{
 const v=setup();assert.equal(v.video.playCalls,0);v.controller.sync(true);await tick();assert.equal(v.video.playCalls,1);
 assert.equal(v.video.paused,false);v.controller.sync(false);assert.equal(v.video.paused,true);
 assert.equal(v.window.listeners('scroll'),0);v.controller.destroy();
});
test('reduced motion stays still unless user explicitly clicks Play',async()=>{
 const v=setup({reduced:true});v.controller.sync(true);assert.equal(v.video.playCalls,0);
 assert.deepEqual(v.issues,['reduced-motion']);v.controller.playManually();await tick();
 assert.equal(v.video.paused,false);assert.equal(v.issues.at(-1),null);v.controller.destroy();
});
test('autoplay denied shows button and user gesture may recover',async()=>{
 const v=setup({playError:new DOMException('blocked','NotAllowedError')});v.controller.sync(true);await tick();
 assert.equal(v.issues.at(-1),'blocked');let before=v.video.playCalls;v.controller.sync(true);assert.equal(v.video.playCalls,before);
 v.controller.playManually();await tick();assert.equal(v.video.paused,false);v.controller.destroy();
});
test('unsupported format switches once to H264 MP4 fallback',async()=>{
 const v=setup({playError:new DOMException('codec','NotSupportedError')});v.controller.sync(true);await tick();
 assert.equal(v.video.loadCalls,1);assert.match(v.video.src,/f_mp4,vc_h264/);v.controller.destroy();
});
test('visibilitychange pauses, restores video when visible again',async()=>{
 const v=setup();v.controller.sync(true);await tick();v.document.hidden=true;v.document.dispatch('visibilitychange');
 assert.equal(v.video.paused,true);v.document.hidden=false;v.document.dispatch('visibilitychange');await tick();
 assert.equal(v.video.paused,false);v.controller.destroy();
});
test('destroy removes browser/media listeners',()=>{
 const v=setup();v.controller.destroy();assert.equal(v.video.listeners('error'),0);assert.equal(v.video.listeners('waiting'),0);
 assert.equal(v.document.listeners('visibilitychange'),0);assert.equal(v.media.listeners('change'),0);
});
test('both videos retain GSAP/Lenis wiring and original optimized media sources',()=>{
 const hero=fs.readFileSync(path.join(root,'frontend/src/components/sections/Hero/index.tsx'),'utf8');
 const drop=fs.readFileSync(path.join(root,'frontend/src/components/sections/Drop/index.tsx'),'utf8');
 for(const [label,s] of [['Hero',hero],['Drop',drop]]){
  assert.match(s,/createVideoPlaybackController/);assert.match(s,/playbackRef.current\?\.sync/);
  assert.match(s,/cloudinaryVideoUrl\(videoUrl/);assert.match(s,/cloudinaryVideoPoster\(videoUrl/);
  assert.match(s,/ScrollTrigger\.create/);assert.match(s,/videoIssue/);
  assert.doesNotMatch(s,/video\.play\(\)\.catch\(\(\) => \{\}\)/);
 }
});

test('New Drop visibility follows viewport intersection independently of scroll animations',()=>{
 const drop=fs.readFileSync(path.join(root,'frontend/src/components/sections/Drop/index.tsx'),'utf8');
 assert.match(drop,/const playbackVisibility = new IntersectionObserver/);
 assert.match(drop,/playbackRef\.current\?\.sync\(entry\.isIntersecting\)/);
 assert.match(drop,/playbackVisibility\.disconnect\(\)/);
 assert.match(drop,/ScrollTrigger\.create\(\{\s*id: "drop-loops"/);
 assert.doesNotMatch(drop,/syncVideo\(runtimeTrigger\.isActive\)/);
});

test('a video that stops advancing falls back once, then exposes manual recovery',async()=>{
 const timeout=global.setTimeout;const clear=global.clearTimeout;
 const pending=[];
 global.setTimeout=(callback)=>{const handle={callback,stopped:false};pending.push(handle);return handle};
 global.clearTimeout=(handle)=>{if(handle)handle.stopped=true};
 let v;
 try {
  v=setup();v.controller.sync(true);await tick();
  assert.equal(v.video.playCalls,1);
  const first=pending.find(x=>!x.stopped);
  assert.ok(first,'no playback progress watchdog scheduled');
  first.stopped=true;first.callback();await tick();
  assert.equal(v.video.loadCalls,1,'one MP4 fallback should load');
  assert.match(v.video.src,/f_mp4,vc_h264/);
  const next=pending.find(x=>!x.stopped);
  assert.ok(next,'fallback should be watched too');
  next.stopped=true;next.callback();await tick();
  assert.equal(v.issues.at(-1),'unavailable');
  assert.equal(v.video.loadCalls,1,'do not continuously reload media');
 } finally {
  v?.controller.destroy();
  global.setTimeout=timeout;global.clearTimeout=clear;
 }
});

test('timeupdate confirms active playback and prevents a false stalled fallback',async()=>{
 const timeout=global.setTimeout;const clear=global.clearTimeout;
 const pending=[];
 global.setTimeout=(callback)=>{const handle={callback,stopped:false};pending.push(handle);return handle};
 global.clearTimeout=(handle)=>{if(handle)handle.stopped=true};
 let v;
 try {
  v=setup();v.controller.sync(true);await tick();
  v.video.dispatch('timeupdate');
  const first=pending.find(x=>!x.stopped);assert.ok(first);
  first.stopped=true;first.callback();await tick();
  assert.equal(v.video.loadCalls,0);
  assert.equal(v.issues.at(-1)??null,null);
 } finally {
  v?.controller.destroy();
  global.setTimeout=timeout;global.clearTimeout=clear;
 }
});
