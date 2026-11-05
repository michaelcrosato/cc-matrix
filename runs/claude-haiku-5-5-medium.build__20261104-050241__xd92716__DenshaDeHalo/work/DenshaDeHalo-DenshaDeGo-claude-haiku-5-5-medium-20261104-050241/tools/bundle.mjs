// Builds the single-file game: ../<GameTitle>-<SOURCE>-<model>-<ts>.html, beside the dev folder. The hub's session.js goes
// first, unmodified; then the engine, the rail and the game's sources, in the order the dev page loads them. No harness,
// no external URLs. Run: node tools/bundle.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dev = resolve(here, '..');
const out = resolve(dev, '..', 'DenshaDeHalo-DenshaDeGo-claude-haiku-5-5-medium-20261104-050241.html');
const session = resolve(dev, 'vendor/aihub/session.js');
const parts = [
  readFileSync(session, 'utf8'),
  readFileSync(resolve(dev, 'engine/my-3d2dge.js'), 'utf8'),
  'src/00-core.js', 'src/21-route-compiler.js', 'src/22-stages.js', 'src/30-train.js', 'src/31-sim.js', 'src/35-autopilot.js',
  'src/10-rail.js', 'src/12-art.js', 'src/40-sound.js', 'src/41-babble.js', 'src/50-hud.js', 'src/60-scenes.js', 'src/61-drive.js', 'src/62-extras.js', 'src/63-hub.js', 'src/64-duel.js', 'src/99-start.js'
].map(p => (p.startsWith('src/') ? readFileSync(resolve(dev, p), 'utf8') : p));
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>${esc(parts[0])}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1-4">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="2-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="5">
<meta name="hub:session-goal" content="Best driving score: stop on the mark, on time">
<meta name="hub:session-howto" content="Lever W/S or L2/R2 · Call E/✕ · Horn Space/□ · ATS Q/△">
<title>Densha de Halo!</title>
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05040a;color:#a9a1c8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#f4f0ff;font-size:16px;letter-spacing:.08em">DENSHA DE HALO!</b><span>Starting · my-3D2dge v0.85.2</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#d9b77c;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>
<canvas id="screen"></canvas>
<script>${esc(parts[1])}</script>
${parts.slice(2).map(p => `<script>\n${esc(p)}\n</script>`).join('\n')}
</body>
</html>
`;
writeFileSync(out, html);
console.log('wrote', out, (html.length / 1024).toFixed(0) + ' KB');
