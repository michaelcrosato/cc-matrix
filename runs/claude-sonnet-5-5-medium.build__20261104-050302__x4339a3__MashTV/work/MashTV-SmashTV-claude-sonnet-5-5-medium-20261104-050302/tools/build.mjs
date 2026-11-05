// Builds build/game.js, build/dev.html, the single-file deliverable and exit-interview.json.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(DEV, '..');
const OUT = 'MashTV-SmashTV-claude-sonnet-5-5-medium-20261104-050302';   // the one place the name is set
const rd = f => readFileSync(path.join(DEV, f), 'utf8');
const files = readdirSync(path.join(DEV, 'src')).filter(f => f.endsWith('.js')).sort();
const about = JSON.parse(rd('src/about.json'));
let js = '';
files.forEach((f, i) => { js += `\n// ===== ${f} =====\n` + rd('src/' + f); if (i === 0) js += `\nMT.ABOUT = ${JSON.stringify(about)};\n`; });
js = js.replace('__BUILD__', new Date().toISOString());
mkdirSync(path.join(DEV, 'build'), { recursive: true });
writeFileSync(path.join(DEV, 'build/game.js'), js);
try { execFileSync(process.execPath, ['--check', path.join(DEV, 'build/game.js')], { stdio: 'pipe' }); }
catch (e) { console.error('SYNTAX ERROR in build/game.js:\n' + String(e.stderr || e)); process.exit(1); }
writeFileSync(path.join(DEV, 'build/dev.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>MASH TV (dev)</title><style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}</style></head><body><canvas id="screen"></canvas><script src="../engine/my-3d2dge.js"></script><script src="game.js"></script></body></html>`);
const meta = `<meta name="hub:type" content="Game">
<meta name="hub:players" content="1–4">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="6">
<meta name="hub:session-goal" content="Grab the most cash, and beat Mashy together">
<meta name="hub:session-howto" content="Move WASD/L-stick · aim+fire mouse/R-stick · slide Space/L2 · bomb E/R1">`;
const css = `html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}
.esh{font-size:clamp(18px,2.6vh,34px)!important}.esh h2{font-size:clamp(28px,5vh,60px)!important}.esh button{font-size:clamp(17px,2.4vh,30px)!important;padding:.55em .9em!important;min-height:2.3em!important}
.esh-k,.esh-m,.esh-row small,.esh output{font-size:clamp(14px,2vh,24px)!important}.esh-mod{width:min(980px,94vw)!important}.esh input[type=range]{width:min(360px,32vw)!important;height:2em!important}`;
const boot = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05040a;color:#a9a1c8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#ffcc33;font-size:16px;letter-spacing:.08em">MASH TV</b><span>Starting · LIVE FROM STUDIO 9 · my-3D2dge v0.85.2</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#ff2e88;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>`;
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>MASH TV</title>
${meta}
<style>${css}</style>
<script>${rd('vendor/hub/session.js')}</script>
</head>
<body>
${boot}
<canvas id="screen"></canvas>
<script>${rd('engine/my-3d2dge.js')}</script>
<script>${js}</script>
</body>
</html>
`;
writeFileSync(path.join(ROOT, OUT + '.html'), html);
// exit-interview.json
const A = about, ei = { sourceInformation: A.sourceInformation, testingFeedback: A.testingFeedback, engineFeedback: A.engineFeedback, promptFeedback: A.promptFeedback, aiHub: A.aiHub };
writeFileSync(path.join(ROOT, 'exit-interview.json'), JSON.stringify(ei, null, 2));
console.log('built ' + OUT + '.html (' + Math.round(html.length / 1024) + ' KB), game.js ' + Math.round(js.length / 1024) + ' KB');
