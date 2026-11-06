import {execFileSync,spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';
const cwd=dirname(fileURLToPath(import.meta.url));
let n=0,fail=0;
try{const out=execFileSync('node',['core-test.mjs'],{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});n+=17;if(!out.includes('0 failed')){fail++;console.log('FAIL core tests: '+out.trim());}}catch(e){fail++;console.log('FAIL core tests: '+e.stdout?.toString().trim());}
const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd,stdio:['ignore','pipe','ignore']});
try{const url=await new Promise((resolve,reject)=>{let s='';server.stdout.on('data',v=>{s+=v;const m=s.match(/port (\d+)/);if(m)resolve('http://127.0.0.1:'+m[1]);});server.on('error',reject);setTimeout(()=>reject(new Error('server startup timed out')),10000).unref();});
 const out=await new Promise((resolve,reject)=>{const p=spawn('/home/micha/.local/share/pipx/venvs/playwright/bin/python',['browser-test.py',url],{cwd,stdio:['ignore','pipe','pipe']});let s='',err='';p.stdout.on('data',v=>s+=v);p.stderr.on('data',v=>err+=v);p.on('exit',()=>{try{resolve(JSON.parse(s.trim()));}catch{reject(new Error(err||s));}});p.on('error',reject);});n+=out.checks;for(const f of out.failures){fail++;console.log('FAIL '+f.name+': '+f.detail);}
}catch(e){fail++;console.log('FAIL verification: '+e.message);}finally{server.kill('SIGINT');}
console.log(`${n} checks: ${n-fail} passed, ${fail} failed`);process.exitCode=fail?1:0;
