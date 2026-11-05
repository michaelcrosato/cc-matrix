// Builds the single-file game: the AI Hub client first, then the engine, then the game (src/*.js in name order, one IIFE).
// Writes ../<NAME>.html (the deliverable), build/game.js (for the headless tests) and hub/game.html (for the harness).
import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs';
const here = new URL('../', import.meta.url), rd = f => readFileSync(new URL(f, here), 'utf8');
export const NAME = 'IceHoc-Kaboom-IceHockey-claude-opus-5-5-medium-20261103-182910';
const files = readdirSync(new URL('src/', here)).filter(f => f.endsWith('.js')).sort();
const game = "/* Ice Hoc-Kaboom: skate, dangle and rip the puck past the goalie while you hammer rivals through the glass; fill your team's\n * BOOM meter to go KABOOM; win the scrap when the gloves drop; outscore them before the final horn. */\n(() => {\n" +
  files.map(f => '// ---- ' + f + ' ----\n' + rd('src/' + f)).join('\n') + '\n})();\n';
const engine = rd('engine/my-3d2dge.js'), session = rd('vendor/session.js');
mkdirSync(new URL('build/', here), { recursive: true });
writeFileSync(new URL('build/game.js', here), game);
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const metas = [['hub:session', '1'], ['hub:session-players', '1-4'], ['hub:session-mode', 'shared-world'], ['hub:session-minutes', '5'],
  ['hub:session-goal', 'Outscore the other team in one 3-minute period'], ['hub:session-howto', 'Stick/WASD skate · ✕/J pass · □/K shoot · ○/L deke · △/I saucer & gloves · R2/Shift turbo'],
  ['hub:type', 'Game'], ['hub:players', '1-4']].map(([n, c]) => `<meta name="${n}" content="${c}">`).join('\n');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>${esc(session)}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Ice Hoc-Kaboom</title>
${metas}
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}
@media (min-width:1100px){.esh{zoom:1.45}}@media (min-width:1700px){.esh{zoom:1.9}}</style>
</head><body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05040a;color:#a9c1e8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#f4f0ff;font-size:16px;letter-spacing:.08em">ICE HOC-KABOOM</b><span>Starting · my-3D2dge v0.85.2</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#ffd36a;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>
<canvas id="screen"></canvas>
<script>${esc(engine)}</script>
<script>${esc(game)}</script>
</body></html>
`;
writeFileSync(new URL('../' + NAME + '.html', here), html);
mkdirSync(new URL('hub/', here), { recursive: true });
writeFileSync(new URL('hub/game.html', here), html);
for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(new URL('vendor/' + f, here), new URL('hub/' + f, here));
if (process.argv[1] && process.argv[1].endsWith('build.mjs')) console.log('built ' + NAME + '.html (' + Math.round(html.length / 1024) + ' KB, ' + files.length + ' modules)');
