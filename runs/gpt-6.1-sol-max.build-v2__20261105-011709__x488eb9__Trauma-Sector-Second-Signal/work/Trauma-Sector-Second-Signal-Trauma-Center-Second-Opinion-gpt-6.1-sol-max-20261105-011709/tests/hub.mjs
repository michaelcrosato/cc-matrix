import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {chromium} from 'playwright';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const taskRoot=path.dirname(root),meta=JSON.parse(fs.readFileSync(path.join(root,'build-meta.json')));
export async function testHub(check){
 const server=http.createServer((req,res)=>{let file;try{file=path.resolve(taskRoot,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));}catch{res.writeHead(400).end();return;}if(!file.startsWith(taskRoot+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':'text/html');res.end(data);});});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 try{
  const runs=['players=2&auto=1','players=4&latency=150&jitter=50&loss=5&auto=1','players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1','players=2&scenario=server&auto=1'];
  for(const query of runs){const page=await browser.newPage({viewport:{width:1280,height:720}});const errs=[];page.on('pageerror',e=>errs.push(String(e)));await page.goto(`${base}/${meta.folder}/vendor/hub/harness.html?game=/${meta.html}&${query}${runs.indexOf(query)<2?'&play=14000':''}`);
   if(runs.indexOf(query)<2){
    try{
     await page.waitForFunction(()=>Array.from(document.querySelectorAll('iframe')).some(f=>f.contentWindow?.GAME?.net?.probe().phase==='play'),{},{timeout:30000});
     const frames=page.frames().filter(f=>f.parentFrame()&&f.url().includes(meta.html));let host,client;
     for(const f of frames){if(await f.evaluate(()=>GAME.net.info()?.isHost))host=f;else if(!client)client=f;}
     check(!!host&&!!client,'Hub exposes a host and client for live gesture testing');
     if(host&&client){
      const id=await host.evaluate(()=>{const S=GAME.runtime.S;S.objects=[];S.phaseDelay=999;S.vitals=99;return GAME.Op.add(S,{type:'guide',x:185,y:119,points:[[185,119],[240,119]],tag:'network-stroke'}).id;});
      await client.waitForFunction(id=>GAME.runtime.S.objects.some(o=>o.id===id),id,{timeout:3000});
      await client.evaluate(()=>window.addEventListener('keydown',e=>{if(!e.isTrusted&&/^(Arrow|Key[WASD])/.test(e.code))e.stopImmediatePropagation();},true));
      const bounds=await client.locator('#screen').boundingBox(),dims=await client.evaluate(()=>({W:GAME.game.W,H:GAME.game.H,ox:(GAME.game.W-426)>>1,oy:(GAME.game.H-240)>>1,S:GAME.game.screen.S,dpr:GAME.game.screen.dpr,OX:GAME.game.screen.OX,OY:GAME.game.screen.OY})),trace=[];
      const at=(x,y)=>({x:bounds.x+((x+dims.ox)*dims.S+dims.OX)/dims.dpr,y:bounds.y+((y+dims.oy)*dims.S+dims.OY)/dims.dpr});
      await client.evaluate(()=>{GAME.game.input.clear();GAME.game.input.tap('tool2');});let p=at(185,119);await page.mouse.move(p.x,p.y);await page.waitForTimeout(450);trace.push(await client.evaluate(()=>({cursor:GAME.runtime.cursors[0],ptr:GAME.game.input.pointer(),device:GAME.game.input.lastDevice})));await page.mouse.down();await page.waitForTimeout(180);
      for(let x=186;x<=240;x+=2){p=at(x,119);await page.mouse.move(p.x,p.y);await page.waitForTimeout(24);}
      await page.mouse.up();let landed=false;try{await host.waitForFunction(id=>GAME.runtime.S.objects.find(o=>o.id===id)?.done,id,{timeout:3500});landed=true;}catch{}
      if(!landed){const state=await host.evaluate(id=>({object:GAME.runtime.S.objects.find(o=>o.id===id),players:GAME.runtime.S.players,phase:GAME.net.probe().phase}),id);const hands=await client.evaluate(()=>({cursor:GAME.runtime.cursors[0],input:GAME.game.input.lastDevice,phase:GAME.net.probe().phase}));fs.writeFileSync(path.join(root,'tests/results/stroke-'+runs.indexOf(query)+'.json'),JSON.stringify({state,hands,bounds,dims,trace},null,2));}
      check(landed,'Client Scalpel gesture lands on host state: '+query);
      await host.evaluate(()=>GAME.Op.triggerBlue(GAME.runtime.S));await client.waitForFunction(()=>GAME.runtime.S.mode==='blue'&&Number.isFinite(GAME.runtime.S.blue?.t),{},{timeout:3000});await page.waitForTimeout(200);check(await client.evaluate(()=>GAME.game.errors.length===0&&GAME.runtime.S.blue.t>=0),'Remote Code Blue clock and HUD survive latency');await host.evaluate(()=>{GAME.runtime.S.mode='operating';GAME.runtime.S.vitals=99;GAME.runtime.S.blue=null;});
     }
    }catch(e){check(false,'Live Hub gesture: '+query+': '+e.message);}
   }
   try{await page.waitForFunction(()=>document.body.dataset.complete==='true',{},{timeout:90000});}catch{check(false,'Hub timeout: '+query);}
   const result=await page.evaluate(()=>{const h=window.__hubCheck;return h?{pass:h.pass,n:h.checks.length,checks:h.checks}:null;});
   check(!!result?.pass,'Hub '+query+': '+JSON.stringify(result?.checks.filter(c=>!c.pass)));
   check(errs.length===0,'Hub parent errors: '+errs.join(' | '));
   const frame=page.frames().find(f=>f.parentFrame()&&f.url().includes(meta.html));if(frame){check(await frame.title()===meta.title,'Hub frame identity');}
   fs.mkdirSync(path.join(root,'tests/results'),{recursive:true});fs.writeFileSync(path.join(root,'tests/results/hub-'+runs.indexOf(query)+'.json'),JSON.stringify(result,null,2));await page.close();
  }
  const page=await browser.newPage();await page.goto(`${base}/${meta.html}`);await page.waitForFunction(()=>window.GAME?.game?.sceneName==='title');check(await page.evaluate(()=>!AIHub.active&&GAME.game.errors.length===0),'Standalone after Hub');await page.close();
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
if(process.argv[1]===fileURLToPath(import.meta.url)){let n=0,f=0;await testHub((ok,text)=>{n++;if(!ok){f++;console.log('FAIL '+text);}});console.log(`${n} checks, ${f} failed`);process.exitCode=f?1:0;}
