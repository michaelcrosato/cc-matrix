import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {GPU_ARGS} from './browser.mjs';
import {writeFileSync} from 'node:fs';
export async function server(){
 const child=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1','--directory','dist'],{stdio:['ignore','pipe','pipe']});
 const port=await new Promise((resolve,reject)=>{let buf='';const timer=setTimeout(()=>reject(Error('Server did not report its OS-picked port')),8000);child.stdout.on('data',d=>{buf+=d;const m=buf.match(/port (\d+)/);if(m){clearTimeout(timer);resolve(Number(m[1]));}});child.on('error',reject);});
 return{child,base:'http://127.0.0.1:'+port};
}
export async function run(test){
 const host=await server();const b=await chromium.launch({headless:true,args:GPU_ARGS});
 try{
  const identity=await fetch(host.base+'/game.html').then(r=>r.text());assert.ok(identity.includes('Trauma Ward: Critical Opinion'));
  const scenarios=['players=2','players=3&latency=150&jitter=50&loss=5','players=4&latency=150&jitter=50&loss=5','players=4&latency=150&jitter=50&loss=5&scenario=host-leave','players=2&scenario=server'];
  for(const scenario of scenarios)await test('official Hub harness '+scenario,async()=>{
   const page=await b.newPage({viewport:{width:1600,height:1000}});try{await page.goto(host.base+'/harness.html?game=game.html&auto=1&'+scenario);await page.waitForFunction(()=>document.body.dataset.complete==='true',{timeout:180000});const result=await page.evaluate(()=>window.__hubCheck);writeFileSync('tests/results/hub-'+scenario.replace(/[^a-z0-9]+/gi,'-')+'.json',JSON.stringify(result,null,2));assert.equal(result.pass,true,JSON.stringify(result));}finally{await page.close();}
  });
 }finally{await b.close();host.child.kill('SIGTERM');}
}
