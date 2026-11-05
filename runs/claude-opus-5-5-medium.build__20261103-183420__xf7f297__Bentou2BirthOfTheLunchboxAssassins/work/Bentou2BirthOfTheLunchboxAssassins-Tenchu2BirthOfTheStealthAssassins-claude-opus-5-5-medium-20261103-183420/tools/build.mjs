// node tools/build.mjs        -> builds build/game.js and the single-file game in the root folder
// node tools/build.mjs --js   -> builds only build/game.js (the tests load it)
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
const dev = new URL('..', import.meta.url), root = new URL('../..', import.meta.url);
export const NAME = 'Bentou2BirthOfTheLunchboxAssassins-Tenchu2BirthOfTheStealthAssassins-claude-opus-5-5-medium-20261103-183420';
export const ORDER = ['00-core', '01-tune', '02-input', '05-game', '10-audio', '20-art', '21-rigs', '30-world', '40-hero', '41-actions', '44-tools', '50-ai', '53-bosses',
  '60-mission', '62-story', '63-cutscene', '64-levels', '70-hud', '71-scenes', '73-mission-scene', '74-dev', '75-workshop', '80-autopilot', '82-hub', '90-main'];
const files = readdirSync(new URL('src/', dev)).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3));
for (const f of files) if (!ORDER.includes(f)) { console.error('build: src/' + f + '.js is not in the order list'); process.exit(1); }
for (const f of ORDER) if (!files.includes(f)) { console.error('build: src/' + f + '.js is missing'); process.exit(1); }
let js = "(() => {\n'use strict';\n";
for (const f of ORDER) {
  const s = readFileSync(new URL('src/' + f + '.js', dev), 'utf8');
  if (/\b(TODO|FIXME|lorem)\b|placeholder/i.test(s)) { console.error('build: src/' + f + '.js contains TODO / FIXME / placeholder text'); process.exit(1); }
  js += '/* ---- ' + f + ' ---- */\n' + s + '\n';
}
js += '})();\n';
mkdirSync(new URL('build/', dev), { recursive: true });
writeFileSync(new URL('build/game.js', dev), js);
if (process.argv.includes('--js')) process.exit(0);
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const session = readFileSync(new URL('vendor/aihub/session.js', dev), 'utf8');
if (!session.startsWith('/*! aihub-session 1.4.0')) { console.error('build: vendor/aihub/session.js is not the unmodified 1.4.0 client'); process.exit(1); }
const engine = readFileSync(new URL('engine/my-3d2dge.js', dev), 'utf8');
const goal = 'Silent kills, unseen, fast: top ninja score wins', howto = 'Move WASD/stick · Strike click/□ · Jump Space/✕ · Crouch C/○ · Tool R/R2';
if (goal.length > 60 || howto.length > 80) { console.error('build: hub goal or howto too long'); process.exit(1); }
const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<script>${esc(session)}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="5">
<meta name="hub:session-goal" content="${goal}">
<meta name="hub:session-howto" content="${howto}">
<title>Bentou 2: Birth of the Lunchbox Assassins</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}</style>
</head><body>
<canvas id="screen"></canvas>
<script>${esc(engine)}</script>
<script>${esc(js)}</script>
</body></html>
`;
writeFileSync(new URL(NAME + '.html', root), html);
writeFileSync(new URL('index.html', dev), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Bentou 2 (dev)</title><style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}</style>
</head><body><canvas id="screen"></canvas><script src="engine/my-3d2dge.js"></script><script src="build/game.js"></script></body></html>
`);
console.log('built ' + NAME + '.html (' + Math.round(html.length / 1024) + ' KB)');
