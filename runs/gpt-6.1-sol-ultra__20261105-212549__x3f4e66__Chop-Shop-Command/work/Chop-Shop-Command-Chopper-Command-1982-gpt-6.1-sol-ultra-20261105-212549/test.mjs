import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.dirname(dir),stdio:['ignore','pipe','ignore']});
let total=0,failed=0;
try{
 const base=await new Promise((resolve,reject)=>{server.stdout.on('data',chunk=>{const match=chunk.toString().match(/port (\d+)/);if(match)resolve('http://127.0.0.1:'+match[1]);});server.on('error',reject);setTimeout(()=>reject(Error('Test server did not start')),10000).unref();});
 const cases=[['node',['tests/sim.test.mjs']],['node',['tests/hub-adapter.test.mjs']],['/home/micha/.local/share/pipx/venvs/playwright/bin/python',['tests/audio.test.py']],['/home/micha/.local/share/pipx/venvs/playwright/bin/python',['tests/browser.test.py']],['/home/micha/.local/share/pipx/venvs/playwright/bin/python',['tests/hub.test.py']]];
 for(const [cmd,args] of cases){
  const result=await new Promise(resolve=>{let output='';const child=spawn(cmd,args,{cwd:dir,env:{...process.env,CSC_BASE_URL:base},stdio:['ignore','pipe','pipe']});child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);child.on('close',code=>resolve({output,code}));child.on('error',e=>resolve({output:'FAIL '+e.message,code:1}));});
  const counts=[...result.output.matchAll(/(\d+) [^\n]*checks, (\d+) failures/g)];for(const match of counts){total+=Number(match[1]);failed+=Number(match[2]);}
  const remaining=result.output.split('\n').filter(line=>line.trim()&&!/\d+ [^\n]*checks, \d+ failures/.test(line));
  if(remaining.length)console.log(remaining.join('\n'));if(result.code&&!counts.some(m=>Number(m[2])>0)){failed++;console.log('FAIL '+args.join(' ')+' exited '+result.code);}
 }
}catch(e){failed++;console.log('FAIL '+e.message);}finally{server.kill('SIGTERM');}
console.log(`${total} checks, ${failed} failures`);if(failed)process.exitCode=1;
