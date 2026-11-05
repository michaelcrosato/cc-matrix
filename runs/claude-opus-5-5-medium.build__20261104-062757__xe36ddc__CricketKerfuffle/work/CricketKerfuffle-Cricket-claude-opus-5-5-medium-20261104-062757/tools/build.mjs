// Build: concatenate src/*.js (name order) into one IIFE (dist/game.js), write dist/index.html (dev page loading the
// engine and game.js separately) and the single-file game in the root folder (the AI Hub client first in <head>).
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const here = new URL('..', import.meta.url);
const p = f => new URL(f, here);
const NAME = 'CricketKerfuffle-Cricket-claude-opus-5-5-medium-20261104-062757';
const files = readdirSync(p('src')).filter(f => f.endsWith('.js')).sort();
let body = files.map(f => `// ---- ${f} ----\n` + readFileSync(p('src/' + f), 'utf8')).join('\n');
const game = `(() => {\n'use strict';\n${body}\n})();\n`;
try { new Function(game); } catch (e) { console.error('SYNTAX ERROR in dist/game.js:', e.message); process.exit(1); }
mkdirSync(p('dist'), { recursive: true });
writeFileSync(p('dist/game.js'), game);
const client = readFileSync(p('vendor/aihub/session.js'), 'utf8');
const css = 'html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }';
const splash = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#0c1a10;color:#cfe8c0;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#fff4d8;font-size:16px;letter-spacing:.08em">CRICKET KERFUFFLE</b><span>Rolling the pitch · my-3D2dge v0.85.2</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#e8c060;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>`;
const tags = [
  ['hub:session', '1'], ['hub:session-players', '1-4'], ['hub:session-mode', 'parallel'], ['hub:session-minutes', '3'],
  ['hub:session-goal', 'Most runs from one over (6 balls, 2 wickets) wins'],
  ['hub:session-howto', 'Aim: stick/WASD/mouse · Hit: Cross/J/click · Loft: Square/K · Run: R1/Space'],
  ['hub:type', 'Game'], ['hub:players', '1-4']
].map(([n, c]) => `<meta name="${n}" content="${c}">`).join('\n');
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const head = (scripts) => `<!doctype html><html lang="en"><head><meta charset="utf-8">\n<script>${esc(client)}</script>\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>Cricket Kerfuffle</title>\n${tags}\n<style>${css}</style>\n</head><body>\n${splash}\n<canvas id="screen"></canvas>\n${scripts}\n</body></html>\n`;
writeFileSync(p('dist/index.html'), head(`<script src="../engine/my-3d2dge.js"></script>\n<script src="game.js"></script>`));
const engine = readFileSync(p('engine/my-3d2dge.js'), 'utf8');
const single = head(`<script>${esc(engine)}</script>\n<script>${esc(game)}</script>`);
writeFileSync(p('../' + NAME + '.html'), single);
const sha = createHash('sha1').update(client).digest('hex').slice(0, 12);
if (!process.argv.includes('-q')) console.log(`built ${files.length} files: dist/game.js ${(game.length / 1024).toFixed(0)} KB, ${NAME}.html ${(single.length / 1024).toFixed(0)} KB, client sha1 ${sha}`);
