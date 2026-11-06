import {spawn} from 'node:child_process';
const python='/home/micha/.local/share/pipx/venvs/playwright/bin/python';
const suites=[['core','node',['core-tests.mjs']],['package','node',['package-tests.mjs']],['input',python,['browser-input-tests.py']],['campaign',python,['browser-campaign-tests.py']],['transport',python,['test-network.py']],['network',python,['browser-network-tests.py']]];
const selected=process.argv.find(a=>a.startsWith('--suite='))?.slice(8).split(',');
let checks=0,failures=0;
for(const [name,bin,args] of suites){if(selected&&!selected.includes(name))continue;const result=await new Promise(resolve=>{const child=spawn(bin,args,{cwd:import.meta.dirname,stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);child.on('error',error=>resolve({code:1,output:String(error)}));child.on('close',code=>resolve({code,output}));});
 const ratios=[...result.output.matchAll(/(\d+)\/(\d+) [^\n]*?(?:passed|checks)/g)];const flat=[...result.output.matchAll(/(\d+) checks, (\d+) failures/g)];
 if(ratios.length){const last=ratios.at(-1);checks+=Number(last[2]);failures+=Number(last[2])-Number(last[1]);}else if(flat.length){const last=flat.at(-1);checks+=Number(last[1]);failures+=Number(last[2]);}else{checks++;if(result.code)failures++;}
 if(result.code){for(const line of result.output.trim().split('\n')){if(line&&!/^\d+.*(?:checks|passed)/.test(line))process.stdout.write(line+'\n');}}
}
console.log(`${checks-failures}/${checks} checks passed; ${failures} failures.`);process.exitCode=failures?1:0;
