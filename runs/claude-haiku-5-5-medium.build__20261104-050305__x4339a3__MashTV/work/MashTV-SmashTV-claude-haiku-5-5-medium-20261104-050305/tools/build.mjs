// Builds MASH TV: src/*.js (in name order, one IIFE) with the patched engine into the single HTML deliverable, the dev page,
// and exit-interview.json beside the HTML. Run: node tools/build.mjs   (npm run build)
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const root = new URL('../', import.meta.url), D = root.pathname;
const OUT = 'MashTV-SmashTV-claude-haiku-5-5-medium-20261104-050305';   // the name from TASK.md
const DELIVER = new URL('../../' + OUT + '.html', import.meta.url);      // root of the work folder, beside TASK.md
const INTERVIEW = new URL('../../exit-interview.json', import.meta.url);
const stamp = new Date().toISOString();

const files = readdirSync(new URL('../src/', import.meta.url)).filter(f => f.endsWith('.js')).sort();
let game = "(() => {\n'use strict';\n" + files.map(f => `/* ---- ${f} ---- */\n` + readFileSync(new URL('../src/' + f, import.meta.url), 'utf8')).join('\n');
game = game.replace("MT.BUILD = '';", `MT.BUILD = '${stamp}';`);
const aboutJson = readFileSync(new URL('../src/about.json', import.meta.url), 'utf8');
game = game.replace("MT.VERSION = ", `MT.ABOUT = ${aboutJson.trim()};\nMT.VERSION = `);
if (!/\}\)\(\);\s*$/.test(game.trim())) game = game.trimEnd() + '\n})();\n';
mkdirSync(new URL('../build/', import.meta.url), { recursive: true });
writeFileSync(new URL('../build/game.js', import.meta.url), game);
execFileSync(process.execPath, ['--check', new URL('../build/game.js', import.meta.url).pathname]);   // the syntax check

const engine = readFileSync(new URL('../engine/my-3d2dge.js', import.meta.url), 'utf8');
const about = JSON.parse(readFileSync(new URL('../src/about.json', import.meta.url), 'utf8'));
const css = `html,body{margin:0;height:100%;background:#07060d;overflow:hidden;color:#fff7e8;font-family:Impact,"Arial Black",system-ui}
canvas#screen{position:fixed;inset:0;width:100%;height:100%;touch-action:none;user-select:none}
.esh{font-size:clamp(18px,2.6vh,34px)!important}
.esh h2{font-size:clamp(28px,5vh,60px)!important}
.esh button{font-size:clamp(17px,2.4vh,30px)!important;padding:.55em .9em!important;min-height:2.3em!important}
.esh-k,.esh-m,.esh-row small,.esh output{font-size:clamp(14px,2vh,24px)!important}
.esh-mod{width:min(980px,94vw)!important}
.esh input[type=range]{width:min(360px,32vw)!important;height:2em!important}`;
const session = readFileSync(new URL('../vendor/hub/session.js', import.meta.url), 'utf8');   // the AI Hub client: pasted unmodified, the first script in <head>
const hubMeta = `<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="6">
<meta name="hub:session-goal" content="Grab the most cash, and beat Mashy together">
<meta name="hub:session-howto" content="Move WASD/L-stick · aim+fire mouse/R-stick · slide Space/L2 · bomb E/R1">`;
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>${session}</script>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>MASH TV</title>
${hubMeta}
<style>${css}</style>
</head>
<body>
<canvas id="screen"></canvas>
<script>${engine}</script>
<script>${game}</script>
</body>
</html>
`;
writeFileSync(DELIVER, html);
writeFileSync(new URL('../build/dev.html', import.meta.url), `<!doctype html><html><head><meta charset="utf-8"><title>MASH TV dev</title><style>${css}</style></head><body><canvas id="screen"></canvas><script src="../engine/my-3d2dge.js"></script><script src="game.js"></script></body></html>`);

// the exit interview: the same answers as the About screen, in the shape TASK.md gives
const ei = { sourceInformation: about.sourceInformation, testingFeedback: about.testingFeedback, engineFeedback: about.engineFeedback, promptFeedback: about.promptFeedback, aiHub: about.aiHub };
writeFileSync(INTERVIEW, JSON.stringify(ei, null, 2) + '\n');
JSON.parse(readFileSync(INTERVIEW, 'utf8'));
console.log(`built ${files.length} src files -> ${DELIVER.pathname} (${html.length} bytes) and exit-interview.json`);
