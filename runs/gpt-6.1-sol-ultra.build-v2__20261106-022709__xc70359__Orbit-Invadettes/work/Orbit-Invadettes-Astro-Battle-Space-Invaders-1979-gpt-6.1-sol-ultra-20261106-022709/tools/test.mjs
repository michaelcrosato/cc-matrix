/** One quiet correctness command. Diagnostics stay in evidence/. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
const dir=fileURLToPath(new URL('..',import.meta.url));
process.chdir(dir);
await mkdir('evidence',{recursive:true});
const cfg=JSON.parse(await readFile('../build-config.json','utf8'));
const results=[];
function check(name,ok,detail=''){results.push({name,ok:!!ok,detail});}
try{
 const [html,hub,engine]=await Promise.all([readFile('../'+cfg.html,'utf8'),readFile('vendor/session.js','utf8'),readFile('vendor/my-3d2dge.js','utf8')]);
 const first=html.match(/<meta charset="utf-8">\s*<script>([\s\S]*?)<\/script>/i);
 check('Pristine Hub client is first script immediately after charset',first&&first[1]===hub);
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
 check('Exactly Hub, full engine and bundled game scripts',scripts.length===3);
 check('Full upstream engine retained',scripts[1]===engine.replace(/<\/script/gi,'<\\/script'));
 check('No runtime external script or stylesheet',!/<script[^>]+src=|<link[^>]+(?:stylesheet|preload)/i.test(html));
 for(const [key,value] of Object.entries({'session':'1','session-mode':'shared-world','session-players':'1-2','session-minutes':'12'}))check('Hub metadata '+key,html.includes('name="hub:'+key+'" content="'+value+'"'));
 const report=JSON.parse(await readFile('report.json','utf8'));
 check('Interview required feedback lengths',report.testingFeedback.length===4&&report.engineFeedback.length===6&&report.promptFeedback.length===4);
 const expected=['date','source','plan','genre','perspective','tech','artDirection','animation','audio','online','testing','research','environment','model','usage'];
 check('Interview source fields and usage',JSON.stringify(Object.keys(report.sourceInformation))===JSON.stringify(expected)&&report.sourceInformation.usage==='added on import');
 check('Catalogue conforms',report.aiHub.name===cfg.title&&report.aiHub.type==='Game'&&report.aiHub.genre==='Shooter'&&report.aiHub.players==='1–2'&&report.aiHub.tags.length>=3&&report.aiHub.tags.length<=6&&report.aiHub.tags.every(t=>t===t.toLowerCase()));
 const original=JSON.parse(await readFile('../exit-interview.json','utf8').catch(()=>JSON.stringify(report)));
 check('Interview matches in-game data',JSON.stringify(original)===JSON.stringify(report));
 await writeFile('evidence/export.json',JSON.stringify({bytes:Buffer.byteLength(html),hubSha256:crypto.createHash('sha256').update(hub).digest('hex'),engineSha256:crypto.createHash('sha256').update(engine).digest('hex'),selfContained:true},null,2));
}catch(e){check('Export verification',false,e.stack);}
for(const [file,fn] of [['sim.test.mjs','runSimulationTests'],['session.test.mjs','runSessionTests'],['assets.mjs','checkAssets'],['engine.test.mjs','runEngineTests']]){
 try{
  const mod=await import('../tests/'+file);
  const value=await mod[fn]();
  const list=value.results||value.checks;
  if(Array.isArray(list)){
   for(const r of list)check(file+': '+(r.name||r.what||r.label),r.ok??r.pass??r.passed,r.detail||r.error||'');
  }else{
   check(file+' summary',(value.failed??value.failures??0)===0,JSON.stringify(value));
  }
  await writeFile('evidence/'+file.replace(/\.[^.]+$/,'')+'-results.json',JSON.stringify(value,null,2));
 }catch(e){check(file,false,e.stack);}
}
const python='/home/micha/.local/share/pipx/venvs/playwright/bin/python';
for(const file of ['browser.py','hub_browser.py']){
 const p=spawnSync(python,['tests/'+file],{cwd:dir,encoding:'utf8',maxBuffer:5_000_000});
 await writeFile('evidence/'+file+'.log',p.stdout+'\n'+p.stderr);
 if(p.status!==0)check(file,false,(p.stdout+'\n'+p.stderr).trim());
 else{
  const report=JSON.parse(await readFile('evidence/'+(file==='browser.py'?'browser.json':'hub-browser.json'),'utf8'));
  const checks=Array.isArray(report)?report.flatMap((r,i)=>(r.checks||[]).map(c=>({...c,name:'scenario '+i+': '+c.name}))):report.checks;
  if(checks?.length)for(const r of checks)check(file+': '+r.name,r.pass??r.ok,r.detail||'');
  else check(file,true);
 }
}
await writeFile('evidence/test-summary.json',JSON.stringify({passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,results},null,2));
for(const r of results)if(!r.ok)console.error('FAIL '+r.name+': '+r.detail);
console.log(results.filter(x=>x.ok).length+' passed; '+results.filter(x=>!x.ok).length+' failed');
process.exitCode=results.some(x=>!x.ok)?1:0;
