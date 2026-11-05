// Build: concatenate src/*.js (file-name order) into build/game.js inside one IIFE, then bundle the single HTML:
// <meta charset> first, the AI Hub session client unmodified, the hub tags, the engine, the game. Also writes
// exit-interview.json from src/99-about.js's data (TC.about) by loading the build headless.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import vm from 'node:vm';
const root = new URL('..', import.meta.url).pathname, NAME = 'TideCrisis3-TimeCrisis3-claude-opus-5-5-medium-20261103-183213';
const files = readdirSync(root + 'src').filter(f => f.endsWith('.js')).sort();
const body = files.map(f => `// ===== ${f}\n` + readFileSync(root + 'src/' + f, 'utf8')).join('\n');
const game = `/* Tide Crisis 3 (c) 2026: an original arcade light-gun rail shooter on my-3D2dge */\n(() => {\n'use strict';\nconst E = My3D2dge;\n${body}\n})();\n`;
mkdirSync(root + 'build', { recursive: true });
writeFileSync(root + 'build/game.js', game);
if (process.argv.includes('--js')) process.exit(0);
const session = readFileSync(root + 'hub/session.js', 'utf8'), engine = readFileSync(root + 'engine/my-3d2dge.js', 'utf8');
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const boot = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05040a;color:#9fc3e8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#f4f7ff;font-size:16px;letter-spacing:.08em">TIDE CRISIS 3</b><span>Starting · my-3D2dge v0.85.2</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#3aa0e8;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>`;
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>
${esc(session)}
</script>
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Clear the stage together; most points wins">
<meta name="hub:session-howto" content="Aim mouse/stick · Fire click/R2 · Hold right-click/L2: cover+reload">
<meta name="hub:session-minutes" content="7">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Tide Crisis 3</title>
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
${boot}
<canvas id="screen"></canvas>
<script>
${esc(engine)}
</script>
<script>
${esc(game)}
</script>
</body>
</html>
`;
writeFileSync(root + '../' + NAME + '.html', html);
// exit interview from the about data
try {
  const ctx = { console: { log() {}, warn() {}, error() {}, info() {} } }; vm.createContext(ctx);
  vm.runInContext(engine, ctx); vm.runInContext(game, ctx);
  const A = ctx.My3D2dge.TC.about;
  if (A && A.exit) writeFileSync(root + '../exit-interview.json', JSON.stringify(A.exit(), null, 2) + '\n');
} catch (e) { console.error('exit-interview: ' + e.message); process.exitCode = 1; }
console.log('built ' + NAME + '.html (' + Math.round(html.length / 1024) + ' KB)');
