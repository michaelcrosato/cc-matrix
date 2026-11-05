// Builds build/game.js (every src/*.js in name order inside one IIFE), build/dev.html (separate scripts, for quick looks)
// and the deliverable: one self-contained html beside this folder. Run: node tools/build.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
const root = new URL('..', import.meta.url), rd = p => readFileSync(new URL(p, root), 'utf8');
export const NAME = 'AheadOrAliveXtremeBeachVolleyball-DeadOrAliveXtremeBeachVolleyball-claude-opus-5-5-medium-20261103-231145';
export function build() {
  const files = readdirSync(new URL('src/', root)).filter(f => f.endsWith('.js')).sort();
  const body = files.map(f => '// ==== ' + f + ' ====\n' + rd('src/' + f)).join('\n');
  const game = "(() => {\n'use strict';\nconst E = My3D2dge, G = {}; window.AOA = G;\n" + body + '\n})();\n';
  writeFileSync(new URL('build/game.js', root), game);
  const head = `<meta charset="utf-8">`;
  const meta = `<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="5">
<meta name="hub:session-goal" content="Win the beach volleyball match: first to 7, by 2">
<meta name="hub:session-howto" content="Stick/WASD move · Cross/Space hit on time · Circle/Shift dive · Square/E shot">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1-4">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Ahead or Alive: Xtreme Beach Volleyball</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}</style>`;
  const splash = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#0a2d3d;color:#9fd3d6;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#ffd36a;font-size:16px;letter-spacing:.08em">AHEAD OR ALIVE</b><span>Raking the sand · my-3D2dge v0.85.2</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#ff9e5e;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>`;
  const esc = s => s.replace(/<\/script/gi, '<\\/script');
  writeFileSync(new URL('build/dev.html', root), `<!doctype html><html lang="en"><head>${head}\n<script src="../vendor/aihub-session.js"></script>\n${meta}\n</head><body>\n${splash}\n<canvas id="screen"></canvas>\n<script src="../engine/my-3d2dge.js"></script>\n<script src="../vendor/mocap/readable.js"></script>\n<script src="../vendor/mocap/mocap.js"></script>\n<script src="../vendor/mocap/aoa-clips.js"></script>\n<script src="game.js"></script>\n</body></html>\n`);
  const html = `<!doctype html><html lang="en"><head>${head}\n<script>${esc(rd('vendor/aihub-session.js'))}</script>\n${meta}\n</head><body>\n${splash}\n<canvas id="screen"></canvas>\n<script>${esc(rd('engine/my-3d2dge.js'))}</script>\n<script>${esc(rd('vendor/mocap/readable.js') + '\n' + rd('vendor/mocap/mocap.js') + '\n' + rd('vendor/mocap/aoa-clips.js'))}</script>\n<script>${esc(game)}</script>\n</body></html>\n`;
  const out = new URL('../' + NAME + '.html', root);
  writeFileSync(out, html);
  return { files: files.length, bytes: html.length, out: out.pathname };
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const r = build(); console.log('built ' + r.files + ' modules → ' + r.out + ' (' + (r.bytes / 1024 / 1024).toFixed(2) + ' MB)');
}
export const newest = () => Math.max(...readdirSync(new URL('src/', root)).map(f => statSync(new URL('src/' + f, root)).mtimeMs));
