import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { TITLE } from '../src/data/title.js';
import { ABOUT } from '../src/data/about.js';
const base=TITLE.replaceAll(' ','-')+'-Wii-Fit-gpt-6.1-sol-max-20261104-221722';
mkdirSync('.build',{recursive:true});
execFileSync('esbuild',['src/main.js','--bundle','--format=esm','--platform=browser','--target=esnext','--charset=utf8','--outfile=.build/bundle.js','--log-level=warning'],{stdio:'inherit'});
const safe=s=>s.replace(/<\/script/gi,'<\\/script').replace(/<!--/g,'<\\!--');
const credits=JSON.stringify(readFileSync('CREDITS.md','utf8'));
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>${readFileSync('vendor/hub/session.js','utf8')}</script>
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="ghost"><meta name="hub:session-goal" content="Most points across three classes. Stay in the circle."><meta name="hub:session-howto" content="Stick, WASD or mouse: lean. R2/Space: breathe. L1/R1 or F/J: step."><meta name="hub:session-minutes" content="4"><meta name="hub:webgpu" content="required">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"><link rel="icon" href="data:,"><title>${TITLE}</title>
<style>html,body{margin:0;height:100%;background:#8dc6d8;overflow:hidden}#app{position:fixed;inset:0}canvas{image-rendering:pixelated}</style></head><body><div id="app"></div><script>globalThis.__ENGINE_CREDITS__=${safe(credits)};</script><script type="module">${safe(readFileSync('.build/bundle.js','utf8'))}</script></body></html>`;
writeFileSync('../'+base+'.html',html);writeFileSync('.build/game.html',html);writeFileSync('../exit-interview.json',JSON.stringify(ABOUT,null,2)+'\n');JSON.parse(readFileSync('../exit-interview.json','utf8'));
console.log('Built '+base+'.html');
