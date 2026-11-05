// Builds Europhoria Football: src/*.js (in file-name order) wrapped in one IIFE -> build/game.js, the dev page
// build/index.html, and the single-file deliverable in the work root (everything inlined, runs from file://).
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const DEV = join(dirname(fileURLToPath(import.meta.url)), '..'), ROOT = join(DEV, '..');
export const NAME = basename(DEV);
const read = f => readFileSync(join(DEV, f), 'utf8');
mkdirSync(join(DEV, 'build'), { recursive: true });

// the About data: the exit interview when it exists (so the About screen and the JSON never disagree)
let about = null;
const ei = join(ROOT, 'exit-interview.json');
if (existsSync(ei)) { try { about = JSON.parse(readFileSync(ei, 'utf8')); } catch (e) { console.error('exit-interview.json does not parse: ' + e.message); process.exit(1); } }
const files = readdirSync(join(DEV, 'src')).filter(f => f.endsWith('.js')).sort();
let body = `EF_ABOUT = ${JSON.stringify(about)};\n`;
for (const f of files) body += `\n/* ===== ${f} ===== */\n` + read('src/' + f) + '\n';
const game = `(() => {\n'use strict';\nconst E = My3D2dge, { px, clamp, lerp, approach, TAU } = E;\nlet EF_ABOUT = null;\n${body}\n})();\n`;
writeFileSync(join(DEV, 'build/game.js'), game);

const SCRIPTS = ['engine/my-3d2dge.js', 'build/game.js'];
const howto = 'Move: stick/WASD · Pass ✕/J · Shoot □/K (hold) · Lob ○/L · Sprint R2/Shift';
if (howto.length > 80) { console.error('howto too long'); process.exit(1); }
const head = (session) => `<meta charset="utf-8">
${session}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Europhoria Football</title>
<meta name="description" content="Over-the-top arcade football: a broke seaside club rides its fans' euphoria through Europe's grandest cup.">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="2-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="4">
<meta name="hub:session-goal" content="Outscore the other side before the final whistle">
<meta name="hub:session-howto" content="${howto}">
<meta name="hub:source" content="European football">
<meta name="hub:type" content="Game">
<meta name="hub:genre" content="Sports">
<meta name="hub:players" content="1–4">
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>`;
const splash = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05040a;color:#a9a1c8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#f4f0ff;font-size:16px;letter-spacing:.08em">EUROPHORIA FOOTBALL</b><span>Starting · my-3D2dge v0.85.2</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#ffc83a;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>`;

// the dev page (loads the files)
writeFileSync(join(DEV, 'build/index.html'), `<!doctype html>\n<html lang="en">\n<head>\n${head('<script src="../vendor/session.js"></script>')}\n</head>\n<body>\n${splash}\n<canvas id="screen"></canvas>\n${SCRIPTS.map(s => `<script src="../${s}"></script>`).join('\n')}\n</body>\n</html>\n`);

// the deliverable: everything inlined
const inline = f => { const s = read(f); if (/<\/script/i.test(s)) { console.error(f + ' contains </script'); process.exit(1); } return `<script>\n${s}\n</script>`; };
const session = read('vendor/session.js');
if (/<\/script/i.test(session)) { console.error('session.js contains </script'); process.exit(1); }
const html = `<!doctype html>\n<html lang="en">\n<head>\n${head('<script>' + session + '</script>')}\n</head>\n<body>\n${splash}\n<canvas id="screen"></canvas>\n${SCRIPTS.map(inline).join('\n')}\n</body>\n</html>\n`;
writeFileSync(join(ROOT, NAME + '.html'), html);
if (process.argv[2] !== '-q') console.log('built ' + NAME + '.html (' + Math.round(html.length / 1024) + ' KB), ' + files.length + ' fragments');
