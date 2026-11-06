import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
let count=0,failures=[];
const run=(cmd,args,extract)=>{const p=spawnSync(cmd,args,{encoding:'utf8',maxBuffer:2e6});const out=(p.stdout||'')+(p.stderr||'');count+=extract(out);if(p.status!==0)failures.push(out.trim()||`${cmd} failed: ${p.error||p.status}`);};
for(const file of ['main.js','model.js','world.js','audio.js','network.js'])run('node',['--check',file],()=>1);
const html=fs.readFileSync('index.html','utf8');fs.writeFileSync('built-check.mjs',html.split('<script type="module">')[1].split('</script>')[0]);run('node',['--check','built-check.mjs'],()=>1);
run('node',['test-model.mjs'],s=>Number(s.match(/\((\d+) model tests\)/)?.[1]||0));
run('node',['test-network.mjs'],s=>Number(s.match(/(\d+) network tests/)?.[1]||0));
run('/home/micha/.local/share/pipx/venvs/playwright/bin/python',['test-browser.py'],s=>Number(s.match(/(\d+) browser and Hub checks/)?.[1]||0));
if(fs.existsSync('../exit-interview.json')){try{JSON.parse(fs.readFileSync('../exit-interview.json','utf8'));count++;}catch(e){failures.push(e.message);}}
for(const f of failures)console.error(f);console.log(`${count} checks, ${failures.length} failing groups`);if(failures.length)process.exitCode=1;
