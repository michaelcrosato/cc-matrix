// Builds the single-file game: ../SnipeoutHD-WipeoutHD-claude-opus-5-5-xhigh-20261103-184630.html (everything inline; three.js
// and Rapier from the CDN by an import map). Checks: the hub client is byte-identical to vendor/aihub-session.js, no
// source has TODO / FIXME / XXX / placeholder, no <script src= remains. Prints the size.
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = new URL('../', import.meta.url), rd = f => readFileSync(new URL(f, ROOT), 'utf8');
export const NAME = 'SnipeoutHD-WipeoutHD-claude-opus-5-5-xhigh-20261103-184630';
export const OUT = new URL('../' + NAME + '.html', ROOT);
export function build() {
  const hub = rd('vendor/aihub-session.js'), engine = rd('engine/my-3d2dge.js'), e3d = rd('engine/my-3d2dge-3d.js');
  const files = JSON.parse(rd('src/manifest.json'));
  const src = files.map(f => '// ==== src/' + f + ' ====\n' + rd('src/' + f)).join('\n');
  const bad = [];
  for (const f of files) { const t = rd('src/' + f); for (const w of ['TODO', 'FIXME', 'XXX', 'placeholder']) if (t.includes(w)) bad.push(f + ': ' + w); }
  if (bad.length) throw new Error('bundle: the sources contain ' + bad.join(', '));
  const esc = s => s.replace(/<\/script/gi, '<\\/script');
  const head = `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<script>${hub}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Snipeout HD</title>
<meta name="description" content="Snipeout HD: an anti-gravity combat racer. Anti-gravity. Anti-everyone.">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Finish 3 laps first: fastest time wins">
<meta name="hub:session-howto" content="Steer A/D or stick · Thrust W or ✕ · Airbrakes Q/E or L2/R2 · Fire Space or □">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1-4">
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #stage { position: relative; width: 100%; height: 100%; overflow: hidden } #view { position: absolute; left: 0; top: 0; image-rendering: pixelated } #screen { position: absolute; inset: 0; width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
<script type="importmap">{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js",
  "three/webgpu": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js",
  "three/tsl": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.tsl.min.js",
  "@dimforge/rapier3d-simd-compat": "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-simd-compat@0.19.3/rapier.mjs" } }</script>
</head><body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05040a;color:#a9a1c8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#f4f0ff;font-size:16px;letter-spacing:.08em">SNIPEOUT HD</b><span>Anti-gravity. Anti-everyone. · my-3D2dge v0.85.2</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#29c8e8;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>
<div id="stage"><canvas id="view"></canvas><canvas id="screen"></canvas></div>
`;
  const html = head + `<script>${esc(engine)}</script>\n<script>${esc(src)}</script>\n<script type="module" onerror="window.__sn3dFail='load'">${esc(e3d)}</script>\n</body></html>\n`;
  if (!html.includes('<script>' + hub + '</script>')) throw new Error('bundle: the hub client is not byte-identical');
  const markup = html.replace(/(<script[^>]*>)[\s\S]*?(<\/script>)/gi, '$1$2');   // the page's own tags, without the code inside them
  if (/<script[^>]+src=/i.test(markup)) throw new Error('bundle: a <script src= remains');
  writeFileSync(OUT, html);
  return { size: html.length, path: OUT.pathname };
}
if (import.meta.url === 'file://' + process.argv[1]) { const r = build(); console.log('bundle', (r.size / 1024).toFixed(0) + ' KB', r.path); }
