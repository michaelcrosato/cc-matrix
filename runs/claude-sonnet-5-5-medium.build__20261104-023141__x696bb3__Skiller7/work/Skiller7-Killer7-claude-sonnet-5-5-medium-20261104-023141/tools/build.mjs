// Build: concatenate src/ + content/ into one bundle, inline engine, 3D module and the AI Hub client into one HTML file.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
const root = path.resolve(import.meta.dirname, '..');
const NAME = 'Skiller7-Killer7-claude-sonnet-5-5-medium-20261104-023141';
const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const list = d => fs.existsSync(path.join(root, d)) ? fs.readdirSync(path.join(root, d)).filter(f => f.endsWith('.js')).sort().map(f => d + '/' + f) : [];
const src = list('src'), content = list('content');
const order = [...src.filter(f => /\/0\d-/.test(f) || /\/[1-8]\d-/.test(f)), ...content, ...src.filter(f => /\/9\d-/.test(f))];
let bundle = order.map(f => `/* ===== ${f} ===== */\n` + rd(f)).join('\n');
bundle = `(() => { 'use strict';\n${bundle}\n})();`;
const bad = bundle.match(/\b(TODO|FIXME|TBD|XXX|lorem|placeholder)\b/gi);
if (bad) { console.error('FAIL: forbidden words in bundle:', [...new Set(bad)].join(', ')); process.exit(1); }
fs.mkdirSync(path.join(root, 'out'), { recursive: true });
fs.writeFileSync(path.join(root, 'out/bundle.js'), bundle);
const esc = s => s.replace(/<\/script/gi, '<\\/script');
// boot splash from the engine itself
let splash = '';
try { const ctx = { console }; vm.createContext(ctx); vm.runInContext(rd('engine/my-3d2dge.js'), ctx); splash = ctx.My3D2dge.bootSplash ? ctx.My3D2dge.bootSplash('SKILLER7') : ''; if (typeof splash !== 'string') splash = ''; } catch (e) { splash = ''; }
const icon = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#f4f6fa"/><path d="M6 6h20v5L14 27h-6l11-16H6z" fill="#d81e2a"/></svg>');
const importmap = { imports: {
  three: 'https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js',
  'three/webgpu': 'https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js',
  'three/tsl': 'https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.tsl.min.js',
  '@dimforge/rapier3d-simd-compat': 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-simd-compat@0.19.3/rapier.mjs' } };
const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<script>${esc(rd('vendor/aihub/session.js'))}</script>
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
<meta name="hub:session-goal" content="Fastest down the Black Run wins; every thawed target cuts two seconds">
<meta name="hub:session-howto" content="Hold W / ✕ to ski · A D steer · S / ○ hockey stop · RMB / L2 aim · LMB / R2 shoot · Space / L1 scan">
<script type="importmap">${JSON.stringify(importmap)}</script>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden} #stage{position:relative;width:100%;height:100%}
#view{position:absolute;left:0;top:0;pointer-events:none;z-index:0} #screen{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;z-index:1;background:transparent}</style>
</head><body>
${splash}
<div id="stage"><canvas id="view"></canvas><canvas id="screen"></canvas></div>
<script>${esc(rd('engine/my-3d2dge.js'))}</script>
<script>${esc(bundle)}</script>
<script type="module">${esc(rd('engine/my-3d2dge-3d.js'))}</script>
<script type="module">S7.start({ World3D: My3D2dge.World3D });</script>
<script>setTimeout(function(){ if (window.S7 && S7.started) return; var d=document.createElement('div'); d.style.cssText='position:fixed;inset:0;z-index:99;background:#05040a;color:#f4f0ff;font:16px monospace;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px'; d.innerHTML='<div>The 3D libraries didn\\u2019t load. Check the connection and reload.</div><button onclick="location.reload()" style="font:16px monospace;padding:8px 20px">Reload</button>'; document.body.appendChild(d); if (window.AIHub && AIHub.active && AIHub.fail) AIHub.fail('The 3D libraries did not load'); }, 20000);</script>
</body></html>`;
const outFile = path.resolve(root, '..', NAME + '.html');
fs.writeFileSync(outFile, html);
console.log('built', path.basename(outFile), (html.length / 1048576).toFixed(2) + ' MB, bundle ' + (bundle.length / 1024 | 0) + ' KB');
