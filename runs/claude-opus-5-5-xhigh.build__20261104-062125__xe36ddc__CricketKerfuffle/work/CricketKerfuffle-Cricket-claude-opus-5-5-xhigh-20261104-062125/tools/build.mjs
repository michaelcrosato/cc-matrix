// node tools/build.mjs: src/*.js (in name order) -> dist/game.js (one IIFE), dist/index.html (dev page loading the engine
// and game.js separately) and the single-file game beside TASK.md, with the AI Hub session client as the first script.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const HERE = new URL('..', import.meta.url), at = p => new URL(p, HERE);
export const NAME = 'CricketKerfuffle-Cricket-claude-opus-5-5-xhigh-20261104-062125';
export const OUT = new URL('../' + NAME + '.html', HERE);
const files = readdirSync(at('src')).filter(f => f.endsWith('.js')).sort();
const body = files.map(f => '/* ---- ' + f + ' ---- */\n' + readFileSync(at('src/' + f), 'utf8')).join('\n');
const game = "(() => {\n'use strict';\n" + body + '\n})();\n';
try { new Function(game); } catch (e) { console.error('SYNTAX ERROR in dist/game.js: ' + e.message); process.exit(1); }
writeFileSync(at('dist/game.js'), game);
const TITLE = 'Cricket Kerfuffle';
const css = 'html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }';
const splash = '<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#0c1a10;color:#cfe3c0;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#fff6dc;font-size:16px;letter-spacing:.08em">CRICKET KERFUFFLE</b><span>Rolling the pitch · my-3D2dge v0.85.2</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#e8c060;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game\'s script did not run: reload, or open the browser\'s console.</span></div>';
export const HUB_TAGS = {
  'hub:session': '1', 'hub:session-players': '1-4', 'hub:session-mode': 'parallel', 'hub:session-minutes': '2',
  'hub:session-goal': 'Most runs from one over (6 balls, 2 wickets) wins',
  'hub:session-howto': 'Aim: stick/WASD/mouse · Hit: Cross/J/click · Loft: Square/K · Run: R1/Space',
  'hub:type': 'Game', 'hub:players': '1-4'
};
const tags = Object.entries(HUB_TAGS).map(([k, v]) => `<meta name="${k}" content="${v}">`).join('\n');
writeFileSync(at('dist/index.html'), `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<script src="../vendor/aihub/session.js"></script>\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>${TITLE}</title>\n${tags}\n<style>${css}</style>\n</head>\n<body>\n${splash}\n<canvas id="screen"></canvas>\n<script src="../engine/my-3d2dge.js"></script>\n<script src="game.js"></script>\n</body>\n</html>\n`);
const esc = s => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const client = readFileSync(at('vendor/aihub/session.js'), 'utf8'), engine = readFileSync(at('engine/my-3d2dge.js'), 'utf8');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">\n<script>${client}</script>\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>${TITLE}</title>\n${tags}\n<style>${css}</style>\n</head>\n<body>\n${splash}\n<canvas id="screen"></canvas>\n<script>\n${esc(engine)}\n</script>\n<script>\n${esc(game)}\n</script>\n</body>\n</html>\n`;
writeFileSync(OUT, html);
if (process.argv.includes('--quiet')) process.exit(0);
console.log(`built ${files.length} files: dist/game.js ${(game.length / 1024).toFixed(0)} KB; ${NAME}.html ${(html.length / 1024).toFixed(0)} KB; client sha1 ${createHash('sha1').update(client).digest('hex').slice(0, 12)}`);
