// Builds Ice Hoc-Kaboom: src/*.js (in name order) into one IIFE (build/game.js, for the headless tests), then the single
// self-contained HTML in the folder above (AI Hub session client first, the hub's tags, the engine, the game), a copy for
// the hub harness (hub/game.html) and a dev page that loads the scripts by file (build/dev.html).
import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs';
const here = new URL('../', import.meta.url), at = f => new URL(f, here), read = f => readFileSync(at(f), 'utf8');
export const NAME = 'IceHoc-Kaboom-IceHockey-claude-opus-5-5-xhigh-20261103-182647';
const files = readdirSync(at('src')).filter(f => f.endsWith('.js')).sort();
const body = files.map(f => '/* ---- ' + f + ' ---- */\n' + read('src/' + f)).join('\n');
const game = '/* ICE HOC-KABOOM (one IIFE, built from src/ by tools/build.mjs) */\n(() => {\n' + body + '\n})();\n';
mkdirSync(at('build'), { recursive: true }); mkdirSync(at('hub'), { recursive: true });
writeFileSync(at('build/game.js'), game);
const session = read('vendor/session.js'), engine = read('engine/my-3d2dge.js');
const metas = `<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="5">
<meta name="hub:session-goal" content="Outscore the other team in one 3-minute period">
<meta name="hub:session-howto" content="Stick/WASD skate · ✕/J pass · □/K shoot · ○/L deke · R2/Shift turbo">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1-4">`;
const style = `<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}
.esh{font-size:clamp(15px,1.25vw,26px)!important}.esh button{font-size:clamp(15px,1.15vw,24px)!important;padding:.6em .9em!important}.esh h1,.esh h2{font-size:clamp(22px,2vw,40px)!important}
.esh-row small,.esh small{font-size:clamp(12px,.9vw,18px)!important}.esh output{font-size:clamp(13px,1vw,20px)!important;min-width:4em!important}.esh-mod{width:min(820px,100%)!important}.esh-wide{width:min(1100px,100%)!important}
.esh-bind button{font-size:clamp(13px,1vw,20px)!important}.esh input[type=range]{width:clamp(140px,14vw,280px)!important}.esh-sel{min-width:clamp(136px,11vw,240px)!important}</style>`;
const splash = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05070d;color:#a9c1d8;font:14px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#f4f8ff;font-size:20px;letter-spacing:.08em">ICE HOC-KABOOM</b><span>Flooding the ice · my-3D2dge v0.85.2</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#ffd36a;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>`;
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>${esc(session)}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Ice Hoc-Kaboom</title>
${metas}
${style}
</head><body>
${splash}
<canvas id="screen"></canvas>
<script>${esc(engine)}</script>
<script>${esc(game)}</script>
</body></html>
`;
writeFileSync(at('../' + NAME + '.html'), html);
writeFileSync(at('hub/game.html'), html);
for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(at('vendor/' + f), at('hub/' + f));
writeFileSync(at('build/dev.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>Ice Hoc-Kaboom (dev)</title>${style}</head><body>${splash}<canvas id="screen"></canvas><script src="../engine/my-3d2dge.js"></script><script src="game.js"></script></body></html>`);
if (process.argv[1] && process.argv[1].endsWith('build.mjs')) console.log('built ' + NAME + '.html (' + Math.round(html.length / 1024) + ' KB, ' + files.length + ' modules)');
