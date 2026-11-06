import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {GAME_TITLE} from '../src/content/title.js';
const base='Hardly-Far-Cry-Far-Cry-2-gpt-6.1-sol-max-20261105-063014';
const bundle=execFileSync('esbuild',['src/main.js','--bundle','--format=esm','--target=esnext','--legal-comments=inline','--log-level=warning'],{maxBuffer:1<<29}).toString();
const session=readFileSync('vendor/session.js','utf8');
const head=`<!doctype html><html lang="en"><head><meta charset="utf-8"><script>%SESSION%</script>
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="shared-world"><meta name="hub:session-minutes" content="6"><meta name="hub:webgpu" content="required"><meta name="hub:session-goal" content="Carry the most diamond cases out of the burning mine"><meta name="hub:session-howto" content="Stick/WASD move, R2/mouse fire, Square/E use, carry cases to the truck">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="theme-color" content="#171c22"><link rel="icon" href="data:,"><title>${GAME_TITLE}</title>
<style>html,body{margin:0;height:100%;background:#131920;overflow:hidden}#app{position:fixed;inset:0}.fallback{position:fixed;inset:0;display:grid;place-content:center;gap:1.3em;padding:8vw;background:#172127;color:#f4d5a2;font:700 clamp(18px,3vw,30px) monospace;line-height:1.5}.fallback h1{color:#ff9a52;font-size:1.5em}.fallback button{font:inherit;background:#eb8c48;color:#172127;border:0;padding:.6em;cursor:pointer}</style></head><body><div id="app"></div><script type="module">%BUNDLE%</script></body></html>`;
const html=head.replace('%SESSION%',()=>session.replace(/<\/script/gi,'<\\/script')).replace('%BUNDLE%',()=>bundle.replace(/<\/script/gi,'<\\/script'))+'\n<!--\n'+readFileSync('CREDITS.md','utf8').replace(/-->/g,'-- >')+'\nAI Hub session client 1.4.0. Original game, models, music and text by OpenAI.\n-->\n';
writeFileSync('../'+base+'.html',html);
writeFileSync('index.html',head.replace('%SESSION%',()=>session).replace('%BUNDLE%','import "./src/main.js";'));
if(!process.argv.includes('--quiet'))console.log(`${base}.html (${(Buffer.byteLength(html)/1048576).toFixed(2)} MiB)`);
