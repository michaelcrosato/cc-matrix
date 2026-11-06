import {writeFileSync,mkdirSync} from 'node:fs';
let passed=0,failed=0;const failures=[];const start=Date.now();
const warn=console.warn;console.warn=(...args)=>{if(!String(args[0]).startsWith('using deprecated parameters'))warn(...args);};
async function test(name,fn){if(process.env.TEST_FILTER&&!name.toLowerCase().includes(process.env.TEST_FILTER.toLowerCase()))return;try{await fn();passed++;}catch(e){failed++;const message=`FAIL ${name}: ${e?.stack||e}`;failures.push(message);console.error(message);}}
const suite=process.argv[2];const results={};
for(const name of ['sim','browser','hub'])if(!suite||suite===name){try{const mod=await import(`./${name}/suite.mjs`);results[name]=await mod.run(test);}catch(e){await test(`${name} suite setup`,()=>{throw e;});}}
mkdirSync('artifacts',{recursive:true});writeFileSync(`artifacts/test-results-${suite||'all'}.json`,JSON.stringify({passed,failed,seconds:(Date.now()-start)/1000,failures,results},null,2));
console.log(`${passed} passed, ${failed} failed (${((Date.now()-start)/1000).toFixed(1)}s)`);process.exitCode=failed?1:0;
