import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('..',import.meta.url)));
const filter=process.argv[2],reports=[];
const test=async(name,fn)=>{try{await fn();reports.push({name,pass:true});}catch(e){reports.push({name,pass:false,error:String(e.stack||e)});console.log('FAIL '+name+': '+String(e.message||e));}};
for(const scope of ['sim','content','engine','browser','hub','visual'])if(!filter||filter===scope){try{const module=await import('./'+scope+'.mjs');await module.run(test);}catch(e){await test(scope+' suite',()=>{throw e;});}}
mkdirSync('tests/results',{recursive:true});const result={at:new Date().toISOString(),scope:filter||'all',passed:reports.filter(x=>x.pass).length,failed:reports.filter(x=>!x.pass).length,tests:reports};
writeFileSync('tests/results/'+(filter||'all')+'.json',JSON.stringify(result,null,2));console.log(`${result.passed}/${reports.length} checks passed; ${result.failed} failures.`);if(result.failed)process.exitCode=1;
