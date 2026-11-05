import fs from 'node:fs';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
const out = process.argv[2] || path.join(here, '..', 'TheSopranoDiet-TheSopranos-claude-sonnet-5-5-medium-20261102-181340.html');
const rd = f => fs.readFileSync(path.join(here, f), 'utf8');
const src = fs.readdirSync(path.join(here, 'src')).filter(f => f.endsWith('.js')).sort().map(f => `\n/* ===== ${f} ===== */\n` + rd('src/' + f)).join('\n');
const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
${rd('vendor/session.js').startsWith('/*') ? '<script>' + rd('vendor/session.js') + '</script>' : ''}
<title>The Soprano Diet</title>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-goal" content="Make the rounds on Main Street: collect envelopes, put down the rival crew and keep your stress down. Highest score wins.">
<meta name="hub:session-howto" content="Move: left stick / WASD. Punch: Square / J / click. Dodge: Circle / Space. Interact: Cross / E. The Look: Triangle / Q. Eat: L1 / R.">
<meta name="hub:session-minutes" content="4">
<style>html,body{margin:0;height:100%;background:#0a0810;overflow:hidden}canvas#screen{display:block;width:100vw;height:100vh;image-rendering:pixelated;touch-action:none}</style>
</head><body><canvas id="screen"></canvas>
<script>${rd('vendor/engine.min.js')}</script>
<script>${src}</script>
</body></html>`;
fs.writeFileSync(out, html);
console.log('wrote', out, (html.length / 1024).toFixed(0) + ' KB');
