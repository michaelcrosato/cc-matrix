// Bundles the engine, the AI Hub client and the game's source files into one html file. node tools/build.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..'), top = join(root, '..');
const NAME = 'Bentou2-Tenchu2-claude-sonnet-5-5-medium-20261103-183530';
const src = readdirSync(join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => readFileSync(join(root, 'src', f), 'utf8')).join('\n');
const exitFile = join(top, 'exit-interview.json');
const exit = existsSync(exitFile) ? readFileSync(exitFile, 'utf8') : 'null';
const engine = readFileSync(join(root, 'engine', 'my-3d2dge.js'), 'utf8');
const session = readFileSync(join(root, 'engine', 'session.js'), 'utf8');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>${session}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-goal" content="Silence Sakubei the rice broker in his counting hall, then slip out by the canal gate. Unseen scores best.">
<meta name="hub:session-howto" content="Move: stick or WASD. Silent Cut: Square or J from behind. Kaginawa: Triangle or E. Tool: R1 or Q. Crouch: Circle or C. Ki Focus: L2 or Tab.">
<meta name="hub:session-minutes" content="5">
<title>Bentou 2: Birth of the Lunchbox Assassins</title>
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05040a;color:#a9a1c8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#f4f0ff;font-size:16px;letter-spacing:.08em">BENTOU 2</b><span>Packing the bento...</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#d9b77c;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>
<canvas id="screen"></canvas>
<script>${engine}</script>
<script>const __EXIT__ = ${exit};
(() => {
${src}
})();</script>
</body>
</html>`;
writeFileSync(join(top, NAME + '.html'), html);
console.log('wrote', NAME + '.html', Math.round(html.length / 1024) + ' KB');
