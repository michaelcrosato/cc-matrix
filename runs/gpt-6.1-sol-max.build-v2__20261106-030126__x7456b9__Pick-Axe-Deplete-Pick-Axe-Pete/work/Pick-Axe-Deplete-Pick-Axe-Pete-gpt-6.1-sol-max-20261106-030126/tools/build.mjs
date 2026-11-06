import fs from 'node:fs';
import path from 'node:path';
import { root } from './load.mjs';

const work = path.dirname(root);
const config = JSON.parse(fs.readFileSync(path.join(work, 'build-config.json'), 'utf8'));
const feedback = JSON.parse(fs.readFileSync(path.join(root, 'docs/feedback.json'), 'utf8'));
const files = [
  'vendor/engine/my-3d2dge.js',
  'src/content/content.js',
  'src/sim/mine.js',
  'src/input/pilot.js',
  'src/view/assets.js',
  'src/audio/audio.js',
  'src/net/hub.js',
  'src/input/controls.js',
  'src/view/mine-view.js',
  'src/main.js',
];
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const embed = (text) => text.replace(/<\/script/gi, '<\\/script');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<script>
${read('vendor/hub/session.js')}
</script>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="#0d131e">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-2">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="15">
<meta name="hub:session-goal" content="Prime three chambers by chopping ore and crashing rocks. Catch each rising key, unlock a marked door, and extract together.">
<meta name="hub:session-howto" content="Stick/D-pad or WASD move/climb; Cross/Space jump; Square/J chop; R2/Q redirect; Circle/Down duck; Triangle/E door or hold to rescue; Options/Escape menu. Touch: left thumb moves, right tap jumps, contextual bubble acts.">
<meta name="description" content="${feedback.aiHub.description}">
<title>${config.title}</title><style>${read('src/view/style.css')}</style>
</head><body>
<canvas id="screen" aria-label="Pick Axe Deplete mine"></canvas>
<div id="boot" role="status">Misty Mountain Mining Co. · Opening the mine…</div>
<div id="hud" hidden>
  <div class="hud-top"><div class="chapter"><div class="chapter-num" id="room-number">01</div><div><div class="eyebrow" id="chapter-label">Expedition · 3 chambers</div><div id="room-name">The Intake</div><div id="objective"></div><div class="work-meter" aria-hidden="true"><i id="work-fill"></i></div></div></div><div class="hud-score"><small>Team gold</small><strong id="score">0000</strong></div></div>
  <div id="miners"></div><div id="key-status"></div><div id="caption" role="status" aria-live="polite" hidden></div><div id="hint" hidden></div><div id="action-prompt" hidden></div><div id="controls-ribbon"></div>
</div>
<button id="menu-button" aria-label="Pause menu" hidden>☰</button>
<button id="context" hidden></button><div id="attract-banner" hidden></div><div id="dev-flag" hidden>Developer shift · records disabled</div>
<script>globalThis.PD={FEEDBACK:${JSON.stringify(feedback).replaceAll('<', '\\u003c')}};</script>
${files.map((file) => `<script>\n${embed(read(file))}\n</script>`).join('\n')}
<!-- Native engine license (vendored unchanged):\n${read('vendor/engine/LICENSE')}\n-->
</body></html>\n`;
fs.writeFileSync(path.join(work, config.slug + '.html'), html);
fs.writeFileSync(path.join(root, 'index.html'), html);
fs.writeFileSync(path.join(work, 'exit-interview.json'), JSON.stringify(feedback, null, 2) + '\n');
export const artifact = path.join(work, config.slug + '.html');
if (process.argv[1] === new URL(import.meta.url).pathname)
  console.log(`Built ${config.slug}.html (${Math.round(Buffer.byteLength(html) / 1024)} KiB)`);
