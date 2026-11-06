/* One quiet verification entry point. Optional names select only affected suites. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const dev=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const selected=new Set(process.argv.slice(2));
const want=name=>!selected.size||selected.has(name);
let passed=0,failed=0;const evidence=[];
async function moduleSuite(name,file,fn){if(!want(name))return;try{const m=await import(pathToFileURL(path.join(dev,file)));const result=await m[fn]();const all=Array.isArray(result)?result:result.results||result.checks||[];for(const r of all){const ok=r.pass??r.passed??false;if(ok)passed++;else{failed++;console.log('FAIL '+name+': '+r.name+' '+(r.errors||r.error||''));}}if(!all.length&&result.passed!==undefined){passed+=result.passed;failed+=result.failed||0;for(const f of result.failures||[])console.log('FAIL '+name+': '+(typeof f==='string'?f:JSON.stringify(f)));}evidence.push({suite:name,result});}catch(e){failed++;console.log('FAIL '+name+': '+e.stack);}}
function pythonSuite(name,file,args=[]){if(!want(name))return;const p=spawnSync('/home/micha/.local/share/pipx/venvs/playwright/bin/python',[path.join(dev,file),...args],{cwd:dev,encoding:'utf8',maxBuffer:10e6,timeout:720000});const output=(p.stdout||'')+(p.stderr||'');const counts=[...output.matchAll(/(\d+) passed, (\d+) failed/g)].at(-1);if(counts){passed+=+counts[1];failed+=+counts[2];}else if(p.status===0){passed++;}else failed++;if(p.status!==0||counts&&+counts[2])console.log('FAIL '+name+': '+output.trim());evidence.push({suite:name,status:p.status,output:output.trim()});}
if(want('syntax')){
  for(const f of ['src/content/content.js','src/sim/sim.js','src/view/view.js','src/audio/audio.js','src/net/hub.js','src/ui/ui.js','src/entry.js']){const p=spawnSync(process.execPath,['--check',path.join(dev,f)],{encoding:'utf8'});if(p.status){failed++;console.log('FAIL syntax '+f+': '+p.stderr);}else passed++;}
  try{const j=JSON.parse(fs.readFileSync(path.join(dev,'../exit-interview.json'),'utf8'));if(Object.keys(j).join(',')!=='sourceInformation,testingFeedback,engineFeedback,promptFeedback,aiHub'||j.testingFeedback.length!==4||j.engineFeedback.length!==6||j.promptFeedback.length!==4||j.sourceInformation.usage!=='added on import')throw Error('Interview schema');passed++;}catch(e){failed++;console.log('FAIL interview '+e.message);}
}
await moduleSuite('simulation','tests/simulation.mjs','runSimulationTests');
await moduleSuite('playthrough','tests/playthrough.mjs','runPlaythroughTests');
await moduleSuite('network','src/net/hub.test.mjs','runNetworkTests');
await moduleSuite('integration','tests/integration.mjs','runIntegrationTests');
pythonSuite('browser','tests/browser.py');
pythonSuite('audio','tests/audio.py');
pythonSuite('hub','src/net/harness_test.py');
pythonSuite('hubgame','src/net/gameplay_test.py');
pythonSuite('hubcampaign','src/net/campaign_test.py');
fs.writeFileSync(path.join(dev,'evidence/test-last.json'),JSON.stringify({suites:[...selected],passed,failed,evidence},null,2));
console.log(`${passed} passed, ${failed} failed`);process.exitCode=failed?1:0;
