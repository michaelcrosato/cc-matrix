import { runHeadless } from '../tests/headless/suite.mjs';
import { writeFileSync } from 'node:fs';
let passed=0,failed=0;
const results=[];
export async function check(name,fn){try{await fn();passed++;results.push({name,pass:true});}catch(e){failed++;results.push({name,pass:false,error:e.message});console.log('FAIL '+name+': '+(e.stack||e.message||e));}}
await runHeadless(check);
if(!process.argv.includes('--fast')){const{runBrowser}=await import('../tests/browser/suite.mjs');await runBrowser(check);}
writeFileSync('check/tests.json',JSON.stringify({passed,failed,results},null,2));console.log(`${passed}/${passed+failed} passed`);if(failed)process.exitCode=1;
