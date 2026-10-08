import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, symlink, writeFile, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const deployScript = fileURLToPath(new URL('../deploy/cpanel/deploy-cpanel.sh', import.meta.url));
const oldSha = 'b'.repeat(40);
const newSha = 'a'.repeat(40);
async function file(p, content) { await mkdir(join(p, '..'), { recursive:true }); await writeFile(p,content); }
function cmd(exe, args, opts) {
  const res=spawnSync(exe,args,opts);
  assert.equal(res.status,0, `${exe} failed: ${res.stderr?.toString()}`);
}
async function createFixture(badConfig=false) {
  const dir=await mkdtemp(join(tmpdir(),'sicko-release-test-'));
  const repo=join(dir,'repo'), front=join(dir,'front'), back=join(dir,'back');
  const fb=join(dir,'frontend-archive'), bb=join(dir,'backend-archive');
  const marker=join(dir,'deployed-sha'), status=join(dir,'deploy-state.json');
  await mkdir(join(fb,'.next'), {recursive:true});
  await mkdir(join(bb,'dist/src/config'), {recursive:true});
  await mkdir(join(bb,'dist/src/scripts'), {recursive:true});
  await mkdir(join(bb,'prisma'), {recursive:true});
  await mkdir(join(front,'release/.next'), {recursive:true});
  await mkdir(join(back,'dist/src'), {recursive:true});
  await mkdir(repo, {recursive:true});
  await file(join(front,'release/server.js'), '// old frontend');
  await file(join(front,'server.js'), '// old gateway');
  await file(join(back,'dist/src/server.js'), '// old backend');
  await file(join(back,'.env'), 'NODE_ENV=production\n');
  await file(marker, oldSha+'\n');
  await file(join(repo,'source-commit.txt'),newSha+'\n');
  await file(join(repo,'gateway-server.cjs'),'// new gateway');
  await file(join(bb,'package.json'),JSON.stringify({name:'fake-backend',version:'1.0.0',type:'module',scripts:{'migrate:production':'node dist/src/scripts/migrate-production.js'}}));
  await file(join(bb,'package-lock.json'),JSON.stringify({name:'fake-backend',version:'1.0.0',lockfileVersion:3,packages:{'':{name:'fake-backend',version:'1.0.0'}}}));
  await file(join(bb,'prisma/schema.prisma'),'fake schema');
  await file(join(bb,'dist/src/config/env.js'),badConfig?'throw new Error("simulated invalid production environment");':'export const env={};');
  await file(join(bb,'dist/src/scripts/migrate-production.js'),'console.log("fake migrations completed")');
  await file(join(bb,'dist/src/server.js'),`import http from 'node:http';http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:{status:'ok',database:'connected'}}))}).listen(Number(process.env.PORT),'127.0.0.1');`);
  await file(join(fb,'package.json'),'{}');
  await file(join(fb,'server.js'),`const h=require('node:http');h.createServer((req,res)=>{res.end('ok')}).listen(Number(process.env.PORT),'127.0.0.1');`);
  cmd('tar',['-czf',join(repo,'frontend-release.tar.gz'),'-C',fb,'.']);
  cmd('tar',['-czf',join(repo,'backend-release.tar.gz'),'-C',bb,'.']);
  await file(join(dir,'activate'),'# noop\n');
  const publicServer=http.createServer(async(req,res)=>{
    let activeSha='';
    try {
      const [f,b]=await Promise.all([
        import('node:fs/promises').then(fs=>fs.realpath(join(front,'release'))),
        import('node:fs/promises').then(fs=>fs.realpath(join(back,'current'))),
      ]);
      activeSha=f.endsWith(newSha)&&b.endsWith(newSha)?newSha:'';
    } catch{}
    res.setHeader('Content-Type','application/json');
    if (req.url==='/__sicko_gateway_health') res.end(JSON.stringify({status:'ok',frontend:true,backend:true,runtimeSource:activeSha}));
    else if(req.url==='/api/v1/health') res.end(JSON.stringify({data:{status:'ok',database:'connected'}}));
    else res.end('ok');
  });
  await new Promise(resolve=>publicServer.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${publicServer.address().port}`;
  const env={...process.env, SICKO_REPO_DIR:repo,SICKO_FRONTEND_DIR:front,SICKO_BACKEND_DIR:back,SICKO_DEPLOY_MARKER:marker,SICKO_DEPLOY_STATUS_FILE:status,SICKO_NODE_ACTIVATE_PATH:join(dir,'activate'),SICKO_PUBLIC_ORIGIN:url,SICKO_PREFLIGHT_ATTEMPTS:'5',SICKO_ACTIVATION_ATTEMPTS:'2',SICKO_PROBATION_CHECKS:'1',SICKO_PROBATION_INTERVAL_SECONDS:'0',SICKO_MANUAL_SCHEMA_TEST_BYPASS:'1',npm_config_offline:'true'};
  return {dir,repo,front,back,marker,status,env,publicServer};
}

async function invoke(env) {
  return await new Promise(resolve=>{
    const p=spawn('bash',[deployScript],{env});let out='';
    p.stdout.on('data',x=>out+=x.toString());
    p.stderr.on('data',x=>out+=x.toString());
    p.on('close',code=>resolve({code,out}));
  });
}

for (const badConfig of [true,false]) {
  test(badConfig?'invalid config leaves live release unchanged':'healthy candidate activates and records SHA after checks',async()=>{
    const x=await createFixture(badConfig);
    try {
      const result=await invoke(x.env);
      assert.equal(result.code,badConfig?1:0,result.out);
      assert.equal((await readFile(x.marker,'utf8')).trim(),badConfig?oldSha:newSha);
      const state=JSON.parse(await readFile(x.status,'utf8'));
      assert.equal(state.state,badConfig?'failed':'active');
      if(badConfig) {
        assert.equal((await readFile(join(x.front,'server.js'),'utf8')).trim(),'// old gateway');
        await stat(join(x.front,'release/server.js'));
      } else {
        assert.equal((await readFile(join(x.front,'server.js'),'utf8')).trim(),'// new gateway');
        await stat(join(x.front,'releases',`legacy-${oldSha}`,'server.js'));
        await stat(join(x.back,'current/dist/src/server.js'));
      }
    } finally { x.publicServer.close(); await rm(x.dir,{recursive:true,force:true}); }
  });
}

test('failed activation automatically restores previous app and marker',async()=>{
  const x=await createFixture(false);
  try {
    x.env.SICKO_PUBLIC_ORIGIN='http://127.0.0.1:1'; // candidate health verification fails
    const result=await invoke(x.env);
    assert.equal(result.code,1,result.out);
    assert.match(result.out,/Reverting the application release/);
    assert.equal((await readFile(x.marker,'utf8')).trim(),oldSha);
    assert.equal(JSON.parse(await readFile(x.status,'utf8')).state,'failed');
    assert.equal((await readFile(join(x.front,'server.js'),'utf8')).trim(),'// old gateway');
    await stat(join(x.front,'release/server.js'));
    assert.rejects(stat(join(x.back,'current')));
  } finally { x.publicServer.close(); await rm(x.dir,{recursive:true,force:true}); }
});


test('failed activation preserves the previous versioned release symlinks',async()=>{
  const x=await createFixture(false);
  try {
    const frontLegacy=join(x.front,'releases',oldSha);
    const backLegacy=join(x.back,'releases',oldSha);
    await mkdir(frontLegacy,{recursive:true});
    await mkdir(backLegacy,{recursive:true});
    await file(join(frontLegacy,'server.js'),'// old frontend');
    await file(join(backLegacy,'dist/src/server.js'),'// old backend');
    await rm(join(x.front,'release'),{recursive:true,force:true});
    await symlink(frontLegacy,join(x.front,'release'));
    await symlink(backLegacy,join(x.back,'current'));
    x.env.SICKO_PUBLIC_ORIGIN='http://127.0.0.1:1';
    const result=await invoke(x.env);
    assert.equal(result.code,1,result.out);
    const fs=await import('node:fs/promises');
    assert.equal(await fs.realpath(join(x.front,'release')),frontLegacy);
    assert.equal(await fs.realpath(join(x.back,'current')),backLegacy);
    assert.equal((await readFile(x.marker,'utf8')).trim(),oldSha);
  } finally { x.publicServer.close(); await rm(x.dir,{recursive:true,force:true}); }
});

test('new gateway reports the actual running release, not a premature marker',async()=>{
  const x=await createFixture(false);
  let child;
  try {
    const fr=join(x.front,'releases',newSha);
    const br=join(x.back,'releases',newSha);
    await mkdir(join(fr,'.next'),{recursive:true});
    await mkdir(join(br,'dist/src'),{recursive:true});
    await file(join(fr,'package.json'),'{}');
    await file(join(fr,'server.js'),`const h=require('node:http');h.createServer((req,res)=>res.end('ok')).listen(Number(process.env.PORT),'127.0.0.1')`);
    await file(join(br,'package.json'),'{"type":"module"}');
    await file(join(br,'dist/src/server.js'),`import h from 'node:http'; h.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:{status:'ok',database:'connected'}}))}).listen(Number(process.env.PORT),'127.0.0.1')`);
    await rm(join(x.front,'release'),{recursive:true,force:true});
    await symlink(fr,join(x.front,'release'));
    await symlink(br,join(x.back,'current'));
    const c=spawnSync('node',['-e','const s=require("net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})'],{encoding:'utf8'});
    const port=Number(c.stdout.trim());
    await import('node:fs/promises').then(fs=>fs.copyFile(fileURLToPath(new URL('../deploy/cpanel/gateway-server.cjs',import.meta.url)),join(x.front,'server.js')));
    child=spawn(process.execPath,[join(x.front,'server.js')],{cwd:x.front,env:{...process.env,PORT:String(port),SICKO_BACKEND_ROOT:x.back,SICKO_DEPLOY_MARKER:x.marker,SICKO_DEPLOY_STATUS_FILE:x.status},stdio:'ignore'});
    let health=null;
    for(let i=0;i<80;i++){
      try{ const r=await fetch(`http://127.0.0.1:${port}/__sicko_gateway_health`); health=await r.json(); break; }catch{}
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    assert.equal(health?.status,'ok');
    assert.equal(health?.runtimeSource,newSha);
    assert.equal((await readFile(x.marker,'utf8')).trim(),oldSha, 'old deployment marker must not imply new release is committed');
    const api=await fetch(`http://127.0.0.1:${port}/api/v1/health`);
    assert.equal((await api.json()).data.database,'connected');
  } finally {
    child?.kill('SIGTERM');
    await new Promise(resolve=>setTimeout(resolve,200));
    x.publicServer.close();
    await rm(x.dir,{recursive:true,force:true});
  }
});
