import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {TITLE} from '../src/data/title.js';
import {about} from '../src/data/about.js';

mkdirSync('.build',{recursive:true});
execFileSync('esbuild',['src/main.js','--bundle','--format=esm','--platform=browser','--target=esnext','--charset=utf8','--loader:.md=text','--outfile=.build/game.js','--log-level=warning'],{stdio:'inherit'});
const safe=source=>source.replace(/<\/script/gi,'<\\/script');
const css=readFileSync('src/ui/style.css','utf8')+readFileSync('src/ui/overrides.css','utf8');
const hub=safe(readFileSync('vendor/hub/session.js','utf8'));
const game=safe(readFileSync('.build/game.js','utf8'));
const html=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><script>${hub}</script>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#cbe9dc">
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="ghost"><meta name="hub:session-goal" content="Score the most points across three delightfully wobbly events."><meta name="hub:session-howto" content="Left stick or WASD: lean. R2 or Space: breathe. L1/R1 or F/J: step."><meta name="hub:session-minutes" content="4">
<title>${TITLE}</title><style>${css}</style></head>
<body><div id="world" aria-hidden="true"><div class="fallback-island"><i></i><b></b><em></em><div class="fallback-board"></div><div class="fallback-avatar"><span class="fallback-leg left"></span><span class="fallback-leg right"></span><span class="fallback-arm left"></span><span class="fallback-arm right"></span><span class="fallback-body"></span><span class="fallback-head"></span></div></div></div><div id="ui"><main class="loading">A little moment, please<span>● ● ●</span></main></div><script type="module">${game}</script></body></html>`;
writeFileSync(`../${TITLE}-Wii Fit-gpt-6.1-terra-max-20261104-221846.html`,html);
writeFileSync('../exit-interview.json',JSON.stringify(about,null,2)+'\n');
JSON.parse(readFileSync('../exit-interview.json','utf8'));
console.log(`Built standalone HTML (${(Buffer.byteLength(html)/1048576).toFixed(1)} MB).`);
