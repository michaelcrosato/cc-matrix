// bundles the engine (with the stick-inversion patch), the AI Hub client and the game's modules into one html file
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const NAME = 'WireTapDance-TheWire-claude-sonnet-5-5-medium-20261102-181331';
let eng = readFileSync(join(here, 'vendor/my-3d2dge.orig.js'), 'utf8');
const patch = (a, b) => { if (!eng.includes(a)) throw new Error('engine patch target missing: ' + a); eng = eng.replace(a, b); };
patch('this.padMove = dz(p.axes[0] || 0, p.axes[1] || 0);', 'this.padMove = dz((p.axes[0] || 0) * (this.invertH ? -1 : 1), (p.axes[1] || 0) * (this.invertV ? -1 : 1));');
patch('const aim = dz(p.axes[2] || 0, p.axes[3] || 0);', 'const aim = dz((p.axes[2] || 0) * (this.invertH ? -1 : 1), (p.axes[3] || 0) * (this.invertV ? -1 : 1));');
const files = readdirSync(join(here, 'src')).filter(f => f.endsWith('.js')).sort();
const game = '(() => {\n' + files.map(f => '/* ---- ' + f + ' ---- */\n' + readFileSync(join(here, 'src', f), 'utf8')).join('\n') + '\n})();\n';
const session = readFileSync(join(here, 'vendor/session.js'), 'utf8');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>
${session}
</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="parallel">
<meta name="hub:session-goal" content="Build the strongest case: photograph the crew, tap the phone, run down the runner and get him to talk. Highest case score wins.">
<meta name="hub:session-howto" content="Stick or WASD move, R2 or Shift sprint, Circle or C crouch, L2 or Q hold the camera, Cross or E interact, Square or J tackle, Triangle or Tab case file.">
<meta name="hub:session-minutes" content="10">
<title>Wire Tap Dance</title>
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05040a;color:#a9a1c8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#f4f0ff;font-size:16px;letter-spacing:.08em">WIRE TAP DANCE</b><span>Starting · my-3D2dge v0.85.1</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#d9b77c;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>
<canvas id="screen"></canvas>
<script>
${eng.replace(/<\/script/g, '<\\/script')}
</script>
<script>
${game.replace(/<\/script/g, '<\\/script')}
</script>
</body>
</html>
`;
const out = process.argv[2] || join(here, '..', NAME + '.html');
writeFileSync(out, html);
writeFileSync(join(here, 'test', 'game.bundle.js'), game);
writeFileSync(join(here, 'test', 'engine.patched.js'), eng);
console.log('wrote', out, (html.length / 1024).toFixed(0) + ' KB');
