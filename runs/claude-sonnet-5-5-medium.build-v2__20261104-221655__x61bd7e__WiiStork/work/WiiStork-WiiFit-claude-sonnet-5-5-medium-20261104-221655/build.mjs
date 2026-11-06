// node build.mjs <out.html>  : bundles engine + vendor + game into one html file
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const R = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const esc = s => s.replace(/<\/script/gi, '<\\/script');
export const FILES = ['engine/my-3d2dge.js', 'vendor/readable.js', 'vendor/mocap.js', 'vendor/fitclips.js',
  'game/core.js', 'game/audio.js', 'game/balance.js', 'game/rigs.js', 'game/ui.js', 'game/scenes/rooms.js',
  'game/data/lines.js', 'game/data/poses.js', 'game/data/activities.js', 'game/data/charts.js', 'game/data/courses.js', 'game/data/trays.js', 'game/data/days.js', 'game/data/unlocks.js',
  'game/activities/hold.js', 'game/activities/candle.js', 'game/activities/rep.js', 'game/activities/step.js', 'game/activities/hoop.js', 'game/activities/jog.js', 'game/activities/slalom.js', 'game/activities/tray.js', 'game/activities/laundry.js',
  'game/scenes/session.js', 'game/scenes/title.js', 'game/scenes/member.js', 'game/scenes/island.js', 'game/scenes/day.js', 'game/scenes/games.js', 'game/scenes/about.js', 'game/scenes/class.js', 'game/scenes/round.js', 'game/scenes/attract.js', 'game/scenes/dev.js', 'game/main.js'];
export function bundle() {
  const iv = JSON.parse(R('exit-interview.json')), si = iv.sourceInformation, ai = iv.aiHub;
  const css = `html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}
@media (min-height:700px){.esh-mod{zoom:1.5}}@media (min-height:1000px){.esh-mod{zoom:2}}
.esh button:focus,.esh input:focus{outline:3px solid var(--accent);outline-offset:2px}
[data-sys=need]{background:rgba(5,3,12,.35)!important;align-items:flex-end!important}`;
  const boot = (R('engine/game/index.html').match(/<div id="e3-boot"[\s\S]*?<\/div>\s*(?=<canvas)/) || [''])[0].replace(/ROOFTOP/g, ai.name).replace(/<span>Starting[^<]*<\/span>/, '<span>Zeroing the scale</span>');
  const head = `<meta charset="utf-8">\n<script>${esc(R('vendor/session.js'))}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${ai.name} — ${ai.tagline}</title>
<meta name="description" content="${ai.description.replace(/"/g, '&quot;')}">
<meta name="theme-color" content="#2cc6e6">
<meta name="hub:type" content="Game"><meta name="hub:players" content="1–4"><meta name="hub:source" content="Wii Fit">
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Stay steadiest over 3 exercises; most points wins">
<meta name="hub:session-howto" content="Lean: left stick, WASD or mouse. Breathe: R2, Space or click">
<style>${css}</style>`;
  const about = `window.G=window.G||{};G.ABOUT=${JSON.stringify(iv).replace(/</g, '\\u003c')};`;
  const scripts = FILES.filter(f => existsSync(new URL(f, import.meta.url))).map(f => `<script>/* ${f} */\n${f === 'game/core.js' ? about + '\n' : ''}${esc(R(f))}</script>`).join('\n');
  return `<!doctype html>\n<html lang="en">\n<head>\n${head}\n</head>\n<body>\n${boot}\n<canvas id="screen"></canvas>\n${scripts}\n</body>\n</html>\n`;
}
if (process.argv[1] && process.argv[1].endsWith('build.mjs')) {
  const out = process.argv[2] || '../WiiStork-WiiFit-claude-sonnet-5-5-medium-20261104-221655.html';
  const html = bundle(); writeFileSync(new URL(out, import.meta.url), html); writeFileSync(new URL('tests/hub/game.html', import.meta.url), html);
  console.log('built', out, (html.length / 1024) | 0, 'KB');
}
