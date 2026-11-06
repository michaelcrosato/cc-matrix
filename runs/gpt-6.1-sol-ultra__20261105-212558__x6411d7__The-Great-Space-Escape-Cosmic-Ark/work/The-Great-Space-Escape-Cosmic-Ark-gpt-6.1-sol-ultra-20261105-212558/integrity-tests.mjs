import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const {slug}=JSON.parse(readFileSync('project.json','utf8'));
let count=0;const failures=[];const test=(value,name)=>{count++;if(!value)failures.push(name);};
const html=readFileSync('../'+slug+'.html','utf8'),local=readFileSync('game.html','utf8');
const scripts=[...html.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
test(html===local,'root and tested build match');
test(scripts.length===2,'exactly hub client and self-contained game scripts');
test(scripts[0]===readFileSync('hub-session.js','utf8'),'unmodified first-script AI Hub client');
test(scripts[1]===readFileSync('game.bundle.js','utf8').replace(/<\/script/gi,'<\\/script'),'bundle content is preserved literally, including dollar signs');
test(!scripts[1].includes('/*GAME_BUNDLE*/'),'no unreplaced bundle markers');
test(!/<script[^>]+src=|<link[^>]+href=/i.test(html),'no external script or stylesheet dependencies');
test(html.includes('hub:session-mode" content="shared-world'),'shared-world metadata present');
test(html.includes('hub:session-players" content="1-4'),'1–4 session metadata present');
for(const file of ['app.js','game.js','scene.js','audio.js','network.js']){const p=spawnSync('node',['--check',file],{encoding:'utf8'});test(p.status===0,file+' syntax: '+p.stderr);}
let exit;try{exit=JSON.parse(readFileSync('../exit-interview.json','utf8'));}catch{}
test(!!exit,'exit-interview is valid JSON');
if(exit){test(JSON.stringify(exit.sourceInformation)===JSON.stringify(JSON.parse(readFileSync('credits.json','utf8')).sourceInformation),'in-game and exit-interview source records match');test(exit.testingFeedback.length===4&&exit.engineFeedback.length===6&&exit.promptFeedback.length===4,'all feedback questions answered');test(exit.aiHub.name==='The Great Space Escape'&&exit.aiHub.tags.length>=3,'catalogue metadata complete');}
for(const failure of failures)console.error('FAIL integrity: '+failure);
console.log(`${count-failures.length}/${count} integrity checks passed`);process.exitCode=failures.length?1:0;
