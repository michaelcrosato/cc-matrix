// node tools/build.mjs : concatenates src/*.js into build/game.js, writes build/index.html (dev page) and the single-file deliverable
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..'), work = join(root, '..');
const NAME = basename(root);
const read = f => readFileSync(join(root, f), 'utf8');
const files = readdirSync(join(root, 'src')).filter(f => f.endsWith('.js')).sort();
let about = { sourceInformation: {} };
const ei = join(work, 'exit-interview.json');
if (existsSync(ei)) { try { about = JSON.parse(readFileSync(ei, 'utf8')); } catch (e) { console.error('exit-interview.json does not parse'); } }
const body = files.map(f => `//# sourceURL=ef/${f}\n` + read('src/' + f)).join('\n');
const game = `(() => {\n'use strict';\nconst E = My3D2dge, { px, clamp, lerp, approach, TAU } = E;\nconst ABOUT = ${JSON.stringify(about)};\n${body}\n})();\n`;
mkdirSync(join(root, 'build'), { recursive: true });
writeFileSync(join(root, 'build/game.js'), game);
const engine = read('engine/my-3d2dge.js'), session = read('vendor/session.js');
for (const [n, t] of [['session', session], ['engine', engine], ['game', game]]) if (/<\/script/i.test(t)) { console.error('inlined ' + n + ' contains </script'); process.exit(1); }
const splash = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05040a;color:#a9a1c8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#f4f0ff;font-size:16px;letter-spacing:.08em">EUROPHORIA FOOTBALL</b><span>Starting · my-3D2dge</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#ffc83a;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>`;
const metas = `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Europhoria Football</title>
<meta name="description" content="Over-the-top arcade football. A broke seaside club gets into Europe's biggest cup by a typo and rides its fans' euphoria to the final.">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="2-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="4">
<meta name="hub:session-goal" content="Outscore the other side before the final whistle">
<meta name="hub:session-howto" content="Move: stick/WASD · Pass ✕/J · Shoot □/K (hold) · Lob ○/L · Sprint R2/Shift">
<meta name="hub:source" content="European football">
<meta name="hub:type" content="Game">
<meta name="hub:genre" content="Sports">
<meta name="hub:players" content="1–4">
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>`;
const page = (head1, scripts) => `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n${head1}\n${metas}\n</head>\n<body>\n${splash}\n<canvas id="screen"></canvas>\n${scripts}\n</body>\n</html>\n`;
writeFileSync(join(root, 'build/index.html'), page('<script src="../vendor/session.js"></script>', '<script src="../engine/my-3d2dge.js"></script>\n<script src="game.js"></script>'));
const out = join(work, NAME + '.html');
writeFileSync(out, page('<script>' + session + '</script>', '<script>' + engine + '</script>\n<script>' + game + '</script>'));
console.log('built', out, (readFileSync(out).length / 1024 | 0) + ' KB', files.length + ' fragments');
