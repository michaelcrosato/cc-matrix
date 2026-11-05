// Builds the single-file game: node tools/build.mjs
// 1. the bundle: src/0*-8*, content/** (sorted), src/9*, wrapped in one IIFE (globalThis.S7; starts nothing)
// 2. the page: the AI Hub client first in <head>, the hub tags, the import map (three r182 and Rapier 0.19.3 from a CDN),
//    the boot splash, the patched engine, the asset sets, the bundle, the 3D module (inline module), the start
// 3. checks: no TODO / FIXME / TBD / XXX / lorem / placeholder outside the engine; the content validator passes
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const NAME = path.basename(ROOT);                                   // Skiller7-Killer7-claude-opus-5-5-xhigh-20261104-013140
const OUT_HTML = path.join(ROOT, '..', NAME + '.html');
const rd = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const ls = (d, re) => fs.readdirSync(path.join(ROOT, d)).filter(f => re.test(f)).sort().map(f => d + '/' + f);

const engine = rd('engine/my-3d2dge.js');
if (!engine.includes('S7 PATCH: applied')) { console.error('build: run node tools/patch-engine.mjs first'); process.exit(1); }
if (fs.existsSync(path.join(ROOT, 'src/98-scaffold.js')) && !process.argv.includes('--dev')) { console.error('build: src/98-scaffold.js still exists'); process.exit(1); }
const m3d = rd('engine/my-3d2dge-3d.js');
const hub = rd('vendor/aihub/session.js');
const sets = ['kenney-holiday', 'kenney-furniture', 'kaykit-furniture-bits', 'kenney-nature'].map(s => rd('engine/src/assets/sets/' + s + '.js')).join('\n');

const src = ls('src', /^[0-8].*\.js$/);
const content = []; (function walk(d) { for (const f of fs.readdirSync(path.join(ROOT, d)).sort()) { const p = d + '/' + f; if (fs.statSync(path.join(ROOT, p)).isDirectory()) walk(p); else if (f.endsWith('.js')) content.push(p); } })('content');
const late = ls('src', /^9.*\.js$/);
const files = src.concat(content, late);
const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
let bundle = `/* SKILLER7 bundle — built ${stamp} from ${files.length} files */\nconst __S7_BUILD__ = ${JSON.stringify(stamp)};\n(() => {\n'use strict';\n`;
for (const f of files) bundle += `\n/* ===== ${f} ===== */\n` + rd(f) + '\n';
bundle += '\n})();\n';

// the no-placeholder scan (our code only)
const bad = /\b(TODO|FIXME|TBD|XXX|lorem|placeholder)\b/i;
for (const f of files) { const lines = rd(f).split('\n'); lines.forEach((l, i) => { if (bad.test(l)) { console.error(`build: ${f}:${i + 1}: ${l.trim().slice(0, 100)}`); process.exitCode = 1; } }); }
if (process.exitCode) process.exit(1);

// the bundle loads in Node (syntax and registration), and the content validator runs on it
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'out/bundle.js'), bundle);
try { new vm.Script(bundle, { filename: 'bundle.js' }); } catch (e) { console.error('build: the bundle does not parse: ' + e.message); process.exit(1); }
try { execFileSync(process.execPath, [path.join(ROOT, 'tools/validate-content.mjs')], { stdio: 'inherit' }); } catch (e) { console.error('build: the content validator failed'); process.exit(1); }

// the boot splash, from the engine itself
const ctx = { console: { log() {}, warn() {}, error() {} } }; vm.createContext(ctx); vm.runInContext(engine, ctx);
const splash = ctx.My3D2dge.bootSplash ? ctx.My3D2dge.bootSplash('SKILLER7') : '';
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const importmap = { imports: {
  three: 'https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js',
  'three/webgpu': 'https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js',
  'three/tsl': 'https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.tsl.min.js',
  '@dimforge/rapier3d-simd-compat': 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-simd-compat@0.19.3/rapier.mjs' } };
const icon = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#f4f1ea"/><text x="16" y="27" font-family="Impact,Arial Black,sans-serif" font-size="30" text-anchor="middle" fill="#d81e2a">7</text></svg>');
const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<script>${esc(hub)}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Skiller7 — Seven Killers, One Mountain</title>
<meta name="description" content="Seven killers share one body and one snowbound mountain. Ride the rails, stop, scan for the laughing invisible Whiteouts and shoot the warm spot.">
<meta name="theme-color" content="#d81e2a">
<link rel="icon" href="${icon}">
<meta name="hub:source" content="Killer7">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1–4">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Fastest down the Black Run wins; warm-spot hits cut time, Whiteouts that reach you add it">
<meta name="hub:session-howto" content="Hold W/✕ to ski and tuck · S/○ hockey stop · RMB/L2 aim · LMB/R2 shoot · Space/L1 scan">
<script type="importmap">${JSON.stringify(importmap)}</script>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#stage{position:relative;width:100%;height:100%;overflow:hidden}#view{position:absolute;left:0;top:0;pointer-events:none;z-index:0}#screen{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;z-index:1;background:transparent;touch-action:none}</style>
</head><body>
${splash}
<div id="stage"><canvas id="view"></canvas><canvas id="screen"></canvas></div>
<script>${esc(engine)}</script>
<script>${esc(sets)}</script>
<script>${esc(bundle)}</script>
<script type="module">${esc(m3d)}</script>
<script type="module">S7.start({ World3D: My3D2dge.World3D });</script>
<script>setTimeout(function () { if (window.S7 && S7.started) return; var m = 'The 3D libraries didn\\'t load. Check the connection and reload.'; var d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;z-index:99;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#0b0a0c;color:#f4f1ea;font:600 22px Arial,sans-serif;text-align:center;padding:24px'; d.textContent = m; var b = document.createElement('button'); b.textContent = 'Reload'; b.style.cssText = 'font:700 22px Arial,sans-serif;padding:12px 28px;background:#d81e2a;color:#fff;border:0;border-radius:6px'; b.onclick = function () { location.reload(); }; d.appendChild(b); document.body.appendChild(d); if (window.AIHub && AIHub.active) AIHub.fail(m); }, 20000);</script>
</body></html>
`;
fs.writeFileSync(OUT_HTML, html);
console.log(`build: ${path.basename(OUT_HTML)} (${(html.length / 1024).toFixed(0)} KB, ${files.length} files)`);
