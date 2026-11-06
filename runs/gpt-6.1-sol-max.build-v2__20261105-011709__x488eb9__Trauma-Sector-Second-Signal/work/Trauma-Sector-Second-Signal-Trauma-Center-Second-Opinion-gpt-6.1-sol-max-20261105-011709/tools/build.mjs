import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const meta=JSON.parse(fs.readFileSync(path.join(root,'build-meta.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'src/manifest.json'),'utf8'));
const about=JSON.parse(fs.readFileSync(path.join(root,'src/about-data.json'),'utf8'));
const titleMatch=/const GAME_TITLE = '([^']+)'/.exec(fs.readFileSync(path.join(root,'src/config.js'),'utf8'));
if(!titleMatch)throw new Error('GAME_TITLE must be declared in config.js');
meta.title=titleMatch[1];about.aiHub.name=meta.title;
const session=fs.readFileSync(path.join(root,'vendor/hub/session.js'),'utf8');
const engine=fs.readFileSync(path.join(root,'vendor/my-3d2dge/dist/handoff/my-3d2dge.js'),'utf8');
const code=manifest.map(f=>fs.readFileSync(path.join(root,'src',f),'utf8')).join('\n');
const license=fs.readFileSync(path.join(root,'vendor/my-3d2dge/LICENSE'),'utf8');
const esc=s=>s.replace(/<\/script/gi,'<\\/script');
const head=`<!doctype html><html lang="en"><head><meta charset="utf-8"><script>${session}</script>
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-minutes" content="5">
<meta name="hub:session-goal" content="Save the patient together; clean hands lead the standings">
<meta name="hub:session-howto" content="Aim: right stick or mouse. Use: R2 or click. Tools: left stick or 1-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="theme-color" content="#102b36"><title>${meta.title}</title>
<style>html,body{margin:0;width:100%;height:100%;background:#071b26;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}html .esh-row small{display:none}html .esh-row:focus-within small{display:block}.operating:not(.paused) #screen{cursor:none}body[data-hub-card="true"] [data-sys="need"]{display:none!important}button:focus-visible{outline:3px solid #f4e4ac;outline-offset:4px}#loading{position:absolute;inset:0;display:grid;place-items:center;color:#c1e0c8;font:20px system-ui;background:#102a35;z-index:30}#loading span{max-width:80%;text-align:center}</style></head><body><div id="loading"><span>Preparing Theatre Three…</span></div><canvas id="screen" aria-label="${meta.title}. Surgical action game. Controller or keyboard required."></canvas>`;
const aboutCode=`window.GAME=window.GAME||{};window.GAME.ABOUT=${JSON.stringify(about)};`;
const tail='<script>document.getElementById("loading").remove();</script></body></html>';
const html=head+`<!-- Native engine license\n${license}\n--><script>${esc(engine)}</script><script>${esc(aboutCode)}</script><script>${esc(code)}</script>`+tail;
fs.writeFileSync(path.resolve(root,'..',meta.html),html);
const dev=head+`<script src="vendor/my-3d2dge/dist/handoff/my-3d2dge.js"></script><script>${esc(aboutCode)}</script>`+manifest.map(f=>`<script src="src/${f}"></script>`).join('\n')+tail;
fs.writeFileSync(path.join(root,'index.dev.html'),dev);
fs.writeFileSync(path.resolve(root,'..','exit-interview.json'),JSON.stringify(about,null,2)+'\n');
console.log(`Built ${meta.html} (${(Buffer.byteLength(html)/1024/1024).toFixed(2)} MB)`);
