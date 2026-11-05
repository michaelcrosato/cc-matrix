// Builds build/game.js (every src file in one IIFE), build/dev.html (engine + game as separate scripts) and the single
// deliverable html in the work folder. The hub client is the first script, right after <meta charset>.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORK = path.resolve(DEV, '..');
const NAME = 'AheadOrAliveXtremeBeachVolleyball-DeadOrAliveXtremeBeachVolleyball-claude-haiku-5-5-medium-20261104-012424';
const TITLE = 'Ahead or Alive: Xtreme Beach Volleyball';

const srcDir = path.join(DEV, 'src');
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.js')).sort();
const body = files.map(f => `/* ==== ${f} ==== */\n` + fs.readFileSync(path.join(srcDir, f), 'utf8')).join('\n');
const game = `(() => {\n'use strict';\nconst E = My3D2dge, G = {};\nwindow.AOA = G;\n${body}\n})();\n`;
fs.mkdirSync(path.join(DEV, 'build'), { recursive: true });
fs.writeFileSync(path.join(DEV, 'build', 'game.js'), game);

const engine = fs.readFileSync(path.join(DEV, 'engine', 'my-3d2dge.js'), 'utf8');
const hub = fs.readFileSync(path.join(DEV, 'vendor', 'aihub-session.js'), 'utf8');
const safe = s => s.replace(/<\/script/gi, '<\\/script');
const style = 'html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}';
const head = `<!doctype html><html lang="en"><head><meta charset="utf-8">\n<script>${safe(hub)}</script>\n<meta name="hub:session" content="1">\n<meta name="hub:session-players" content="1-4">\n<meta name="hub:session-mode" content="shared-world">\n<meta name="hub:session-minutes" content="5">\n<meta name="hub:session-goal" content="Win the beach volleyball match: first to 7, by 2">\n<meta name="hub:session-howto" content="Stick/WASD move · Cross/Space hit on time · Circle/Shift dive · Square/E shot">\n<meta name="hub:type" content="Game">\n<meta name="hub:players" content="1-4">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>${TITLE}</title>\n<style>${style}</style>\n</head><body>\n<canvas id="screen"></canvas>\n`;
const mocap = ['readable.js', 'mocap.js', 'aoa-clips.js', 'aoa-volley.js'].map(n => fs.readFileSync(path.join(DEV, 'vendor', 'mocap', n), 'utf8'));
const deliver = head + `<script>${safe(engine)}</script>\n` + mocap.map(m => `<script>${safe(m)}</script>\n`).join('') + `<script>${safe(game)}</script>\n</body></html>\n`;
const dev = `<!doctype html><html><head><meta charset="utf-8"><title>${TITLE} (dev)</title><style>${style}</style></head><body><canvas id="screen"></canvas><script src="../engine/my-3d2dge.js"></script><script src="../vendor/mocap/readable.js"></script><script src="../vendor/mocap/mocap.js"></script><script src="../vendor/mocap/aoa-clips.js"></script><script src="../vendor/mocap/aoa-volley.js"></script><script src="game.js"></script></body></html>\n`;
fs.writeFileSync(path.join(DEV, 'build', 'dev.html'), dev);
const out = path.join(WORK, NAME + '.html');
fs.writeFileSync(out, deliver);
console.log(`game.js ${(game.length / 1024).toFixed(1)} KB, ${files.length} modules; deliverable ${(deliver.length / 1024).toFixed(1)} KB`);
