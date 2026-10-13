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
 const controller=createVideoPlaybackController(video,{fallbackUrl:()=> 'https://res.cloudinary.com/prod/video/upload/v123/clip.mp4',onIssue:x=>issues.push(x)});
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
test('unsupported format switches once to original-media fallback',async()=>{
 const v=setup({playError:new DOMException('codec','NotSupportedError')});v.controller.sync(true);await tick();
 assert.equal(v.video.loadCalls,1);assert.match(v.video.src,/\/video\/upload\/v123\/clip\.mp4/);v.controller.destroy();
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
test('Hero is read-only and Drop retains its known-working Cloudinary sources',()=>{
 const hero=fs.readFileSync(path.join(root,'frontend/src/components/sections/Hero/index.tsx'),'utf8');
 const drop=fs.readFileSync(path.join(root,'frontend/src/components/sections/Drop/index.tsx'),'utf8');
 assert.match(hero,/cloudinaryVideoPoster\(videoUrl/);
 assert.match(hero,/ScrollTrigger\.create/);
 assert.match(hero,/cloudinaryVideoUrl\(videoUrl/);
 assert.match(drop,/cloudinaryVideoPoster\(videoUrl/);
 assert.match(drop,/ScrollTrigger\.create/);
 assert.match(drop,/createDropPlaybackController/);
 for (const width of [640,960,1280]) assert.match(drop,new RegExp(`cloudinaryVideoUrl\\(videoUrl, ${width}\\)`));
 assert.doesNotMatch(drop,/cloudinaryVideoMp4Url|vc_h264:baseline:3\.1/);
 assert.doesNotMatch(drop,/<source[^>]*type="video\/mp4"/);
 assert.match(drop,/preload="metadata"/);
});

test('Drop playback lifecycle is independent of catalog/drawer effects',()=>{
 const drop=fs.readFileSync(path.join(root,'frontend/src/components/sections/Drop/index.tsx'),'utf8');
 const beforeGsap = drop.split('  useLayoutEffect(() => {')[0];
 assert.match(beforeGsap,/useEffect\(\(\) => \{[\s\S]*createDropPlaybackController[\s\S]*\}, \[videoUrl\]\);/);
 const gsap = drop.split('  useLayoutEffect(() => {')[1];
 assert.doesNotMatch(gsap,/createDropPlaybackController/);
 assert.doesNotMatch(gsap,/playback\.destroy\(\)/);
 assert.doesNotMatch(gsap,/backgroundVideoRef\.current\?\.pause\(\)/);
});

test('prewarm never calls load while primary media playback is starting',()=>{
 const drop=fs.readFileSync(path.join(root,'frontend/src/components/sections/Drop/index.tsx'),'utf8');
 assert.match(drop,/const prewarm = new IntersectionObserver/);
 assert.match(drop,/video\.preload = "auto"/);
 assert.doesNotMatch(drop,/\bvideo\.load\(\)/);
 assert.match(drop,/videoInView &&/);
 assert.match(drop,/onClick=\{\(\) => playbackRef\.current\?\.playManually\(\)\}/);
});

test('Drop uses the same ScrollTrigger viewport boundary as Hero and no secondary visibility controller',()=>{
 const drop=fs.readFileSync(path.join(root,'frontend/src/components/sections/Drop/index.tsx'),'utf8');
 assert.match(drop,/id: "drop-video-runtime"/);
 assert.match(drop,/start: "top bottom"/);
 assert.match(drop,/end: "bottom top"/);
 assert.match(drop,/playback\.sync\(sectionActive\)/);
 assert.match(drop,/trigger\.kill\(\)/);
 assert.doesNotMatch(drop,/const videoVisibility = new IntersectionObserver/);
 assert.match(drop,/id: "drop-loops"/);
});
