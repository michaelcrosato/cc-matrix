// SKILLER7 build: concatenates src/0*-8*, content/**, src/9* into one bundle (an IIFE, globalThis.S7), then fills the page
// template: the AI Hub client first (unmodified), the patched engine, the bundle, the 3D module (a module), the start.
// Writes ../<Title>-Killer7-claude-opus-5-5-medium-20261104-020620.html and out/bundle.js. Fails on TODO-like markers.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'Skiller7-Killer7-claude-opus-5-5-medium-20261104-020620';
const rd = p => readFileSync(join(ROOT, p), 'utf8');
const ls = d => readdirSync(join(ROOT, d)).filter(f => f.endsWith('.js')).sort();
const src = ls('src'), content = ls('content');
const early = src.filter(f => f < '9'), late = src.filter(f => f >= '9');
const build = new Date().toISOString().slice(0, 16).replace('T', ' ');
let bundle = `/* SKILLER7 ${build} — an original game inspired by Killer7. Built on my-3D2dge v0.85.2. */\n(() => { 'use strict';\nconst __S7_BUILD__ = ${JSON.stringify(build)};\n`;
for (const f of early) bundle += `\n/* ==== src/${f} ==== */\n` + rd('src/' + f);
for (const f of content) bundle += `\n/* ==== content/${f} ==== */\n` + rd('content/' + f);
for (const f of late) bundle += `\n/* ==== src/${f} ==== */\n` + rd('src/' + f);
bundle += '\n})();\n';
// the no-placeholder scan (game code only)
const bad = bundle.match(/\b(TODO|FIXME|TBD|XXX|lorem|placeholder)\b/gi);
if (bad) { console.error('build: the bundle contains ' + [...new Set(bad)].join(', ')); process.exit(1); }
mkdirSync(join(ROOT, 'out'), { recursive: true });
writeFileSync(join(ROOT, 'out/bundle.js'), bundle);
if (process.argv.includes('--bundle-only')) { console.log('bundle ' + (bundle.length / 1024).toFixed(0) + ' KB'); process.exit(0); }

const engine = rd('engine/my-3d2dge.js'), e3d = rd('engine/my-3d2dge-3d.js'), session = rd('vendor/aihub/session.js'), holiday = rd('engine/src/assets/sets/kenney-holiday.js');
// the boot splash markup comes from the engine itself
const ctx = { console: { log() {}, warn() {}, error() {} } }; vm.createContext(ctx); vm.runInContext(engine, ctx);
const splash = ctx.My3D2dge.bootSplash ? ctx.My3D2dge.bootSplash('SKILLER7') : '';
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const icon = "data:image/svg+xml," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect width='16' height='16' fill='#f4f1ea'/><text x='8' y='14' font-size='15' font-family='Impact,Arial Black,sans-serif' text-anchor='middle' fill='#d81e2a'>7</text></svg>");
const importmap = { imports: {
  three: 'https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js', 'three/webgpu': 'https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js',
  'three/tsl': 'https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.tsl.min.js', '@dimforge/rapier3d-simd-compat': 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-simd-compat@0.19.3/rapier.mjs' } };
const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<script>${esc(session)}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Skiller7 — Seven Killers, One Mountain</title>
<meta name="description" content="Seven killers share one body and one mountain. Ride the rails, stop, scan for the laughing invisible Whiteouts and shoot the warm spot.">
<meta name="theme-color" content="#d81e2a">
<link rel="icon" href="${icon}">
<meta name="hub:source" content="Killer7">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1–4">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Fastest down the Black Run wins; Whiteouts that reach you add 3 s, crits take 0.5 s off">
<meta name="hub:session-howto" content="Hold W/✕ to ski (tuck) · S/○ hockey stop · RMB/L2 aim · LMB/R2 shoot · Space/L1 scan · A/D pick a route">
<script type="importmap">${JSON.stringify(importmap)}</script>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#stage{position:relative;width:100%;height:100%;overflow:hidden}#view{position:absolute;left:0;top:0;pointer-events:none;z-index:0}#screen{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;z-index:1;background:transparent}#s7fail{position:fixed;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;background:#0b0a0c;color:#f4f1ea;font:600 22px Arial,sans-serif;z-index:99;text-align:center;padding:24px}#s7fail button{margin-top:18px;font:inherit;padding:10px 26px;background:#d81e2a;color:#fff;border:0}</style>
</head><body>
${splash}
<div id="stage"><canvas id="view"></canvas><canvas id="screen"></canvas></div>
<div id="s7fail"><div id="s7failmsg"></div><button onclick="location.reload()">Reload</button></div>
<script>${esc(engine)}</script>
<script>${esc(holiday)}</script>
<script>${esc(bundle)}</script>
<script type="module">${esc(e3d)}</script>
<script type="module">S7.start({ World3D: My3D2dge.World3D });</script>
<script>setTimeout(function () { if (!window.S7 || !S7.started) { var m = "The 3D libraries didn't load. Check the connection and reload."; var f = document.getElementById('s7fail'); document.getElementById('s7failmsg').textContent = m; f.style.display = 'flex'; if (window.AIHub && AIHub.active) AIHub.fail(m); } }, 20000);</script>
</body></html>
`;
writeFileSync(join(ROOT, '..', NAME + '.html'), html);
writeFileSync(join(ROOT, NAME + '.html'), html);   // (a copy in the dev folder's root too)
try { writeFileSync(join(ROOT, 'exit-interview.json'), readFileSync(join(ROOT, '..', 'exit-interview.json'))); } catch (e) { /* written at hand-back */ }
console.log('built ' + NAME + '.html ' + (html.length / 1024).toFixed(0) + ' KB (bundle ' + (bundle.length / 1024).toFixed(0) + ' KB)');
void existsSync;
