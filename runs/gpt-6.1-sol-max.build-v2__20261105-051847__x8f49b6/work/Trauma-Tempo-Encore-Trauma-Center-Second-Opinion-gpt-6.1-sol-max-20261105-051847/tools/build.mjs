import {build} from 'esbuild';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import path from 'node:path';
import {GAME_TITLE,TAGLINE} from '../src/config/identity.js';
const exact={name:'one-three',setup(b){b.onResolve({filter:/^three$/},()=>({path:path.resolve('node_modules/three/build/three.webgpu.js')}));}};
const shared={bundle:true,minify:true,write:false,legalComments:'none',logLevel:'error',target:'es2022'};
const js=(await build({...shared,entryPoints:['src/main.js'],format:'esm',platform:'browser',plugins:[exact]})).outputFiles[0].text;
const css=(await build({...shared,entryPoints:['src/ui/ui.css'],loader:{'.woff2':'dataurl'}})).outputFiles[0].text;
const client=readFileSync('tools/vendor/session.js','utf8').replace(/\r\n/g,'\n').trimEnd();
const about=readFileSync('src/data/about.json','utf8');
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const noCloser=s=>s.replace(/<\/(script)/gi,'<\\/$1');
const html=['<!doctype html>','<html lang="en" data-prompt-set="keyboard">','<head>','<meta charset="utf-8">','<script>',client,'</script>',
'<meta name="viewport" content="width=device-width, initial-scale=1">',`<title>${esc(GAME_TITLE)} — ${esc(TAGLINE)}</title>`,
'<meta name="description" content="A rain-soaked surgical action drama. Eight instruments, seven engineered parasites, one shared heartbeat. Story and 1–4 player surgery.">',
'<meta name="theme-color" content="#17707A">','<meta name="hub:type" content="Game">','<meta name="hub:players" content="1–4">','<meta name="hub:source" content="Trauma Center: Second Opinion">',
'<meta name="hub:session" content="1">','<meta name="hub:session-players" content="1-4">','<meta name="hub:session-mode" content="shared-world">','<meta name="hub:session-minutes" content="6">','<meta name="hub:session-goal" content="Keep the patient alive and finish the operation together">','<meta name="hub:session-howto" content="Aim: right stick or mouse · use: R2 or click · tools: left stick or 1-8">',
'<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 64 64%27%3E%3Crect width=%2764%27 height=%2764%27 rx=%2712%27 fill=%27%2317707a%27/%3E%3Cpath d=%27M32 53 8 30C-2 10 22 4 32 18 42 4 66 10 56 30Z%27 fill=%27%23f2b134%27 stroke=%27%2312081a%27 stroke-width=%273%27/%3E%3Cpath d=%27M8 30h12l4-9 7 24 6-16h19%27 fill=%27none%27 stroke=%27%2312081a%27 stroke-width=%273%27/%3E%3C/svg%3E">',
'<style>',css,'</style>','</head>','<body>',
'<div id="app"><div id="screen"></div><div id="hud"></div><div id="overlays"></div><div id="touch"></div><div id="toast-layer"></div></div>',
'<div id="boot" class="boot"><div class="boot-ecg"></div><h1>Scrubbing in…</h1><p>St. Alder Memorial / Operating Room 03</p></div>',
'<script type="application/json" id="about-data">',noCloser(about),'</script>','<script type="module">',noCloser(js),'</script>','</body>','</html>'].join('\n');
mkdirSync('dist',{recursive:true});writeFileSync('dist/game.html',html);
const filename=path.basename(process.cwd())+'.html';copyFileSync('dist/game.html',path.join('..',filename));
