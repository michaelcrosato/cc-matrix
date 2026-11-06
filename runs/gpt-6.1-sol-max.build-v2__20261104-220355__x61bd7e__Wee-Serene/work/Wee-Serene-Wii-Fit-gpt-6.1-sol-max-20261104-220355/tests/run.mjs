import {execFileSync} from 'node:child_process';
import path from 'node:path';import fs from 'node:fs';
process.chdir(path.resolve(new URL('..',import.meta.url).pathname));
const groups=process.argv[2]||'all';let passed=0,failed=0;
export const T={check(value,label){if(value)passed++;else{failed++;console.log('FAIL '+label);}},equal(a,b,label){this.check(JSON.stringify(a)===JSON.stringify(b),label+' (expected '+JSON.stringify(b)+', got '+JSON.stringify(a)+')');},async group(label,fn){fs.writeFileSync('tests/test-progress.json',JSON.stringify({group:label,at:new Date().toISOString()}));try{await fn();}catch(e){failed++;console.log('FAIL '+label+': '+(e.stack||e).split('\n').slice(0,4).join(' / '));}}};
try{execFileSync('node',['build.mjs'],{stdio:'pipe'});}catch(e){console.log('FAIL build: '+e.message);process.exit(1);}
for(const name of ['rules','browser','hub'])if(groups==='all'||groups===name)await T.group(name,async()=>{const mod=await import('./'+name+'.mjs');await mod.run(T);});
console.log(`${passed} passed, ${failed} failed`);process.exitCode=failed?1:0;
