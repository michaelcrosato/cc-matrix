// Bundles engine + hub client + game sources into one HTML in the work root. Asserts the plan's build checks.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const here = new URL('..', import.meta.url).pathname;
const NAME = 'BigBuckHuntOff-BigBuckHunterPro-claude-sonnet-5-5-medium-20261104-053803';
const out = new URL('../../' + NAME + '.html', import.meta.url).pathname;
const read = f => readFileSync(here + f, 'utf8');
const srcFiles = readdirSync(here + 'src').filter(f => f.endsWith('.js')).sort();
let bad = [];
for (const f of srcFiles) { const s = read('src/' + f); for (const w of ['TODO', 'FIXME', 'XXX', 'lorem', 'placeholder']) if (s.includes(w)) bad.push(f + ' contains ' + w); for (const w of ['fetch(', 'WebSocket', 'RTCPeerConnection', 'alert(', 'confirm(', 'window.open', 'Math.random']) if (s.includes(w)) bad.push(f + ' contains ' + w); }
if (bad.length) { console.log('BUILD FAILED:\n' + bad.join('\n')); process.exit(1); }
const hubJs = read('hub/session.js');
const meta = `<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Most points in 3 minutes wins. Bucks only, never does!">
<meta name="hub:session-howto" content="Aim: mouse or left stick · Shoot: click or R2 · Pump: R or Square">
<meta name="hub:type" content="Game"><meta name="hub:players" content="1-4">`;
for (const m of ['hub:session-goal', 'hub:session-howto']) { const v = new RegExp(m + '" content="([^"]*)"').exec(meta)[1]; if (v.length > (m.endsWith('goal') ? 60 : 80)) { console.log('BUILD FAILED: ' + m + ' too long'); process.exit(1); } }
const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<script>${hubJs}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Big Buck Hunt-Off</title>
${meta}
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}</style>
</head><body>
<canvas id="screen"></canvas>
<script>${read('engine/my-3d2dge.js').replace(/<\/script/g, '<\\/script')}</script>
${srcFiles.map(f => `<script>/* ${f} */\n${read('src/' + f).replace(/<\/script/g, '<\\/script')}</script>`).join('\n')}
</body></html>`;
writeFileSync(out, html);
console.log('built ' + out + ' (' + Math.round(html.length / 1024) + ' KB), hub client sha ' + createHash('sha256').update(hubJs).digest('hex').slice(0, 10));
