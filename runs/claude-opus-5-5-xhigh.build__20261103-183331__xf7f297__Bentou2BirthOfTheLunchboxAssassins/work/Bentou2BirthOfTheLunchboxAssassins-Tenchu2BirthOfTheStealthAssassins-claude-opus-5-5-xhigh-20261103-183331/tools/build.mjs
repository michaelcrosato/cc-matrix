// node tools/build.mjs         -> the single-file game in the root folder (beside TASK.md)
// node tools/build.mjs --js    -> only the concatenated game script, build/game.js (the tests load it)
// The game's src files are concatenated in ORDER inside one IIFE; the build fails loudly on a missing file, an
// unlisted file, or a TODO / FIXME / placeholder / lorem left in the source.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const DEV = join(dirname(fileURLToPath(import.meta.url)), '..');
import { NAME } from './name.mjs';
export { NAME };
export const ORDER = [
  '00-core.js', '01-tune.js', '02-input.js', '03-glyphs.js', '05-game.js', '04-camera.js', '10-audio.js', '11-voice.js',
  '20-assets.js', '21-rigs.js', '30-world.js', '31-actors.js', '40-hero.js', '41-silentcut.js', '42-grapple.js',
  '43-combat.js', '44-tools.js', '50-perception.js', '51-guard-brain.js', '52-enemies.js', '53-bosses.js', '54-escort.js',
  '60-mission.js', '61-score.js', '62-story.js', '63-cutscene.js', '64-levels-training.js', '64-levels-m1.js',
  '64-levels-m2.js', '64-levels-m3.js', '64-levels-delivery.js', '65-missions.js', '70-hud.js', '71-scenes-menu.js',
  '72-scenes-story.js', '73-scene-mission.js', '74-dev.js', '75-workshop.js', '80-autopilot.js', '81-attract.js',
  '82-hub.js', '90-main.js'
];

export function gameJs() {
  const src = join(DEV, 'src'), have = readdirSync(src).filter(f => f.endsWith('.js'));
  const missing = ORDER.filter(f => !have.includes(f)), extra = have.filter(f => !ORDER.includes(f));
  if (missing.length) throw new Error('build: missing src files: ' + missing.join(', '));
  if (extra.length) throw new Error('build: src files not in the order list: ' + extra.join(', '));
  const parts = [];
  for (const f of ORDER) {
    const t = readFileSync(join(src, f), 'utf8');
    const bad = t.split('\n').map((l, i) => [l, i + 1]).filter(([l]) => /\bTODO\b|\bFIXME\b|placeholder|lorem/i.test(l));
    if (bad.length) throw new Error('build: ' + f + ':' + bad[0][1] + ' has a TODO/FIXME/placeholder: ' + bad[0][0].trim());
    parts.push('/* ---- ' + f + ' ---- */\n' + t);
  }
  const js = "(() => {\n'use strict';\nconst E = My3D2dge, { px, clamp, lerp, approach, TAU } = E;\n" + parts.join('\n') + '\n})();\n';
  new vm.Script(js, { filename: 'game.js' });   // a syntax error fails the build here, with its line
  return js;
}

const esc = s => s.replace(/<\/script/gi, '<\\/script');

export function build({ jsOnly = false } = {}) {
  const js = gameJs();
  mkdirSync(join(DEV, 'build'), { recursive: true });
  writeFileSync(join(DEV, 'build', 'game.js'), js);
  if (jsOnly) return join(DEV, 'build', 'game.js');
  const session = readFileSync(join(DEV, 'vendor', 'aihub', 'session.js'), 'utf8');
  if (!session.startsWith('/*! aihub-session 1.4.0')) throw new Error('build: vendor/aihub/session.js is not the unmodified 1.4.0 client');
  const engine = readFileSync(join(DEV, 'engine', 'my-3d2dge.js'), 'utf8');
  const ctx = { console: { log() {}, warn() {}, error() {} } }; vm.createContext(ctx); vm.runInContext(engine, ctx);
  const splash = ctx.My3D2dge.bootSplash('BENTOU 2');
  const goal = 'Silent kills, unseen, fast: top ninja score wins', howto = 'Move WASD/stick · Strike click/□ · Jump Space/✕ · Crouch C/○ · Tool R/R2';
  if (goal.length > 60 || howto.length > 80) throw new Error('build: hub goal or howto too long');
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
${splash}
<canvas id="screen"></canvas>
<script>${esc(engine)}</script>
<script>${esc(js)}</script>
</body></html>
`;
  const out = join(DEV, '..', NAME + '.html');
  writeFileSync(out, html);
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try { const out = build({ jsOnly: process.argv.includes('--js') }); console.log('built ' + out.replace(DEV + '/', '')); }
  catch (e) { console.error(e.message); process.exit(1); }
}
