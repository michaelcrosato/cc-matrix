// Builds the single-file game into the root folder (the folder above this one): the engine inline, then every src file
// in manifest order, lints the game's own code, and writes exit-interview.json from OB.ABOUT. Run: node build.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const NAME = 'OutBloom2006Coast2Coast-OutRun2006Coast2Coast-claude-haiku-5-5-medium-20261104-043153';
const manifest = JSON.parse(readFileSync(join(here, 'src/manifest.json'), 'utf8'));
const engine = readFileSync(join(here, 'engine/my-3d2dge.js'), 'utf8');
const sources = manifest.map(f => ({ f, code: readFileSync(join(here, 'src', f), 'utf8') }));

// lint: the game's own code (not the engine) has no placeholder words and no network or dialog calls
const bad = [];
const WORDS = /\b(TODO|TBD|FIXME|placeholder|lorem)\b/i;
const CALLS = /((?<![.\w])(fetch|alert|confirm|prompt)\(|\bWebSocket\b|\bRTCPeerConnection\b|\bXMLHttpRequest\b|\bwindow\.open\b)/;   // (bare calls: a method such as OB.UI.prompt is ours)
for (const { f, code } of sources) {
  code.split('\n').forEach((line, i) => {
    if (WORDS.test(line)) bad.push(`${f}:${i + 1}: placeholder word: ${line.trim().slice(0, 90)}`);
    if (CALLS.test(line)) bad.push(`${f}:${i + 1}: forbidden call: ${line.trim().slice(0, 90)}`);
  });
}
if (bad.length) { console.error(bad.join('\n')); console.error(`${bad.length} lint problem(s); nothing written.`); process.exit(1); }

const session = readFileSync(join(here, 'vendor/session.js'), 'utf8');   // the AI Hub client, unmodified, first in <head>
const head = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>
${session}
</script>
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-goal" content="Fastest to the Flower Sprint goal wins">
<meta name="hub:session-howto" content="Steer stick/←→ · gas R2/✕/W · brake L2/□/S · drift ○/Space">
<meta name="hub:session-minutes" content="4">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1-4">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>OutBloom 2006: Coast 2 Coast</title>
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#2a1450;color:#ffd6a0;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#fff4e0;font-size:16px;letter-spacing:.08em">OUTBLOOM 2006</b><span>Starting · my-3D2dge v0.85.2</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#ffcf4a;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, reload the page.</span></div>
<canvas id="screen"></canvas>
`;
const scripts = ['<script>\n' + engine + '\n</script>'];
for (const { f, code } of sources) scripts.push(`<script>\n/* src/${f} */\n${code}\n</script>`);
const html = head + scripts.join('\n') + '\n</body>\n</html>\n';
const out = join(root, NAME + '.html');
writeFileSync(out, html);

// the exit interview: read from the bundle's own OB.ABOUT, in the shape TASK.md asks for
const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, addEventListener() {}, location: { hash: '' } };
ctx.window = ctx; vm.createContext(ctx);
for (const { f, code } of [{ f: 'engine', code: engine }, ...sources]) vm.runInContext(code, ctx, { filename: f });
const A = ctx.OB.ABOUT;
const json = {
  sourceInformation: A.sourceInformation,
  testingFeedback: A.testingFeedback,
  engineFeedback: A.engineFeedback,
  promptFeedback: A.promptFeedback,
  aiHub: A.aiHub,
};
// every value filled: no empty strings or missing keys
const empty = [];
const walk = (v, p) => { if (Array.isArray(v)) { if (!v.length) empty.push(p); v.forEach((x, i) => walk(x, p + '[' + i + ']')); } else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, p + '.' + k)); else if (v === '' || v === null || v === undefined) empty.push(p); };
walk(json, '');
if (empty.length) { console.error('exit interview has empty fields: ' + empty.join(', ')); process.exit(1); }
writeFileSync(join(root, 'exit-interview.json'), JSON.stringify(json, null, 2) + '\n');
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB) and exit-interview.json`);
