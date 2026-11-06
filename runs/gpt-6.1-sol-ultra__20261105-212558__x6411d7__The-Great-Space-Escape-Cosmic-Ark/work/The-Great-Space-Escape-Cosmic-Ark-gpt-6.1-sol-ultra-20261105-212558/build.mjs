import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const {slug}=JSON.parse(readFileSync('project.json','utf8'));
const out=spawnSync('bun',['build','app.js','--target','browser','--minify','--outfile','game.bundle.js'],{encoding:'utf8'});
if(out.status!==0){console.error(out.stderr);process.exit(1);}
let html=readFileSync('index.template.html','utf8');
const client=readFileSync('hub-session.js','utf8');
html=html.replace('<!--HUB_CLIENT-->',()=>'<script>'+ client.replace(/<\/script/gi,'<\\/script')+'</script>');
html=html.replace('/*GAME_BUNDLE*/',()=>readFileSync('game.bundle.js','utf8').replace(/<\/script/gi,'<\\/script'));
writeFileSync('../'+slug+'.html',html);
writeFileSync('game.html',html);
console.log('Built '+slug+'.html');
