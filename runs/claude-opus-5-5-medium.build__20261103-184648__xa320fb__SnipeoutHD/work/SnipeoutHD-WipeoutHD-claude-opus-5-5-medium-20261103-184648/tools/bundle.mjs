// Builds the single-file deliverable ../SnipeoutHD-WipeoutHD-claude-opus-5-5-medium-20261103-184648.html: the hub client
// (byte-identical, first), the engine, the game's src/ in manifest order, then the 3D add-on as an inline module with
// an import map to the pinned CDN files. Checks: identical hub client, no TODO/FIXME/XXX/placeholder, no <script src=
import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../', import.meta.url), rd = f => readFileSync(new URL(f, root), 'utf8');
const NAME = 'SnipeoutHD-WipeoutHD-claude-opus-5-5-medium-20261103-184648';
const manifest = JSON.parse(rd('src/manifest.json'));
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const hub = rd('vendor/aihub-session.js');
const src = manifest.map(f => '// ==== src/' + f + ' ====\n' + rd('src/' + f)).join('\n');
for (const f of manifest) { const t = rd('src/' + f); if (/\b(TODO|FIXME|XXX)\b/.test(t) || /placeholder/i.test(t)) { console.error('bundle: ' + f + ' contains TODO/FIXME/XXX/placeholder'); process.exit(1); } }
const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<script>${hub}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Snipeout HD</title>
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="ghost"><meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Finish 3 laps first: fastest time wins">
<meta name="hub:session-howto" content="Steer A/D or stick · Thrust W or ✕ · Airbrakes Q/E or L2/R2 · Fire Space or □">
<meta name="hub:type" content="Game"><meta name="hub:players" content="1-4">
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #stage { position: relative; width: 100%; height: 100%; overflow: hidden } #screen { position: absolute; inset: 0; width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none } #view { image-rendering: pixelated }</style>
<script type="importmap">{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js",
  "three/webgpu": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js",
  "three/tsl": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.tsl.min.js",
  "@dimforge/rapier3d-simd-compat": "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-simd-compat@0.19.3/rapier.mjs" } }</script>
</head><body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05040a;color:#9ff4ff;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#ffffff;font-size:18px;letter-spacing:.12em">SNIPEOUT HD</b><span>Anti-gravity. Anti-everyone. · my-3D2dge v0.85.2</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#29c8e8;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 15s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>
<div id="stage"><canvas id="view"></canvas><canvas id="screen"></canvas></div>
<script>${esc(rd('engine/my-3d2dge.js'))}</script>
<script>${esc(src)}</script>
<script type="module" onerror="window.__sn3dFail='load'">${esc(rd('engine/my-3d2dge-3d.js'))}</script>
</body></html>
`;
if (!html.includes(hub)) { console.error('bundle: the hub client is not byte-identical'); process.exit(1); }
const skeleton = html.split(hub).join('').split(esc(rd('engine/my-3d2dge.js'))).join('').split(esc(src)).join('').split(esc(rd('engine/my-3d2dge-3d.js'))).join('');
if (/<script[^>]*\ssrc=/i.test(skeleton)) { console.error('bundle: a <script src= remains'); process.exit(1); }
const out = new URL('../../' + NAME + '.html', import.meta.url);
writeFileSync(out, html);
console.log('bundle: ' + NAME + '.html ' + (html.length / 1024 / 1024).toFixed(2) + ' MB');
