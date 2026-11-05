// Builds the single-file game: the engine (2D, and its 3D module), the AI Hub client, and the game's src/ files,
// concatenated in order into one HTML page at the work folder's root. Run: node tools/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dev = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(dev, '..');
const NAME = 'Skiller7-Killer7-claude-haiku-5-5-medium-20261104-023153';
const read = (p) => fs.readFileSync(path.join(dev, p), 'utf8');
const esc = (s) => s.replace(/<\/script/gi, '<\\/script');

const engine = read('engine/my-3d2dge.js');
const engine3d = read('engine/my-3d2dge-3d.js');
const session = read('vendor/aihub/session.js');
const srcFiles = fs.readdirSync(path.join(dev, 'src')).filter(f => f.endsWith('.js')).sort();
const bundle = `(() => {\n'use strict';\nconst E = globalThis.My3D2dge;   // the 2D engine's namespace (loaded first)\n` + srcFiles.map(f => `// ---- src/${f}\n` + read('src/' + f)).join('\n') + `\n})();\n`;

// the rules of the build (TASK.md): no placeholders left in the game's own code
const bad = /\b(TODO|FIXME|TBD|XXX|lorem|placeholder)\b/i.exec(bundle);
if (bad) { console.error('build: found "' + bad[0] + '" in the game code'); process.exit(1); }

const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<script>${esc(session)}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Skiller7 — Seven Killers, One Mountain</title>
<meta name="description" content="Seven killers share one body and one mountain. Ride the rails, stop, scan for the laughing invisible Whiteouts and shoot the warm spot.">
<meta name="theme-color" content="#d81e2a">
<meta name="hub:source" content="Killer7">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1–4">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Fastest down the Black Run wins">
<meta name="hub:session-howto" content="Cross walk · Circle stop · L2 aim · R2 fire · L1 scan · Space / W walk · S stop · RMB aim · LMB fire">
<script type="importmap">{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js",
  "three/webgpu": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js",
  "three/tsl": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.tsl.min.js",
  "@dimforge/rapier3d-simd-compat": "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-simd-compat@0.19.3/rapier.mjs" } }</script>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#stage{position:relative;width:100%;height:100%}
#view{position:absolute;left:0;top:0;pointer-events:none;z-index:0}#screen{position:absolute;inset:0;width:100%;height:100%;z-index:1;background:transparent}</style>
</head><body>
<div id="stage"><canvas id="view"></canvas><canvas id="screen"></canvas></div>
<script>${esc(engine)}</script>
<script>${esc(bundle)}</script>
<script type="module">${esc(engine3d)}</script>
<script type="module">S7.start();</script>
</body></html>
`;
const out = path.join(root, NAME + '.html');
fs.writeFileSync(out, html);
fs.mkdirSync(path.join(dev, 'out'), { recursive: true });
fs.writeFileSync(path.join(dev, 'out', 'bundle.js'), bundle);
console.log('built', path.relative(process.cwd(), out), (html.length / 1024).toFixed(0) + ' KB');
