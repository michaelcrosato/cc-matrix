// MASH TV build: src/*.js -> build/game.js (one IIFE), build/dev.html, and the single-file deliverable in the root.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const DEV = join(dirname(fileURLToPath(import.meta.url)), '..'), ROOT = join(DEV, '..');
const OUT = 'MashTV-SmashTV-claude-opus-5-5-medium-20261104-050259';
const src = readdirSync(join(DEV, 'src')).filter(f => f.endsWith('.js')).sort();
const about = JSON.parse(readFileSync(join(DEV, 'src/about.json'), 'utf8'));
let js = '';
for (const f of src) {
  js += `\n// ===== ${f}\n` + readFileSync(join(DEV, 'src', f), 'utf8');
  if (f.startsWith('00-')) js += `\nMT.ABOUT = ${JSON.stringify(about)};\nMT.BUILD = ${JSON.stringify(new Date().toISOString())};\n`;
}
mkdirSync(join(DEV, 'build'), { recursive: true });
writeFileSync(join(DEV, 'build/game.js'), js);
execFileSync(process.execPath, ['--check', join(DEV, 'build/game.js')], { stdio: 'inherit' });
const CSS = `html,body{margin:0;height:100%;background:#05020a;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}
.esh{font-size:clamp(18px,2.6vh,34px)!important}.esh h2{font-size:clamp(28px,5vh,60px)!important}
.esh button{font-size:clamp(17px,2.4vh,30px)!important;padding:.55em .9em!important;min-height:2.3em!important}
.esh-k,.esh-m,.esh-row small,.esh output{font-size:clamp(14px,2vh,24px)!important}.esh-mod{width:min(980px,94vw)!important}
.esh input[type=range]{width:min(360px,32vw)!important;height:2em!important}`;
const META = `<meta name="hub:type" content="Game">
<meta name="hub:players" content="1–4">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="6">
<meta name="hub:session-goal" content="Grab the most cash, and beat Mashy together">
<meta name="hub:session-howto" content="Move WASD/L-stick · aim+fire mouse/R-stick · slide Space/L2 · bomb E/R1">`;
const BOOT = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05020a;color:#c8a0e8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#ffcc33;font-size:16px;letter-spacing:.08em">MASH TV</b><span>Starting · my-3D2dge v0.85.2</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#ff2e88;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>`;
const session = readFileSync(join(DEV, 'vendor/hub/session.js'), 'utf8');
const engine = readFileSync(join(DEV, 'engine/my-3d2dge.js'), 'utf8');
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const head = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>MASH TV</title>\n${META}\n<style>${CSS}</style>\n`;
writeFileSync(join(ROOT, OUT + '.html'), head + `<script>${session}</script>\n</head>\n<body>\n${BOOT}\n<canvas id="screen"></canvas>\n<script>${esc(engine)}</script>\n<script>${esc(js)}</script>\n</body>\n</html>\n`);
writeFileSync(join(DEV, 'build/dev.html'), head + `<script src="../vendor/hub/session.js"></script>\n</head>\n<body>\n${BOOT}\n<canvas id="screen"></canvas>\n<script src="../engine/my-3d2dge.js"></script>\n<script src="game.js"></script>\n</body>\n</html>\n`);
// the exit interview, from the same about.json
const ex = { sourceInformation: about.sourceInformation, testingFeedback: about.testingFeedback, engineFeedback: about.engineFeedback, promptFeedback: about.promptFeedback, aiHub: about.aiHub };
const keys = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'];
for (const k of keys) if (!ex.sourceInformation[k]) throw new Error('about.json: sourceInformation.' + k + ' is empty');
writeFileSync(join(ROOT, 'exit-interview.json'), JSON.stringify(ex, null, 2) + '\n');
JSON.parse(readFileSync(join(ROOT, 'exit-interview.json'), 'utf8'));
if (process.argv.includes('-v')) console.log('built', OUT + '.html', Math.round((head.length + session.length + engine.length + js.length) / 1024) + ' KB');
