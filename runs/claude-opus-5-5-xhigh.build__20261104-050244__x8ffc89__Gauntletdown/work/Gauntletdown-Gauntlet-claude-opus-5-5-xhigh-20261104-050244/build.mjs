// node build.mjs [--bundle]: concatenates game/src/*.js (name order) into one IIFE at game/game.js (the dev page and the
// tests load it) and, with --bundle, writes the single-file deliverable in the run folder's root:
// the unmodified AI Hub client first in <head>, the hub metas, the patched engine, then the game.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const here = new URL('./', import.meta.url), at = p => new URL(p, here);
export const NAME = 'Gauntletdown-Gauntlet-claude-opus-5-5-xhigh-20261104-050244';
export function buildGame() {
  const files = readdirSync(at('game/src')).filter(f => /^\d\d-.*\.js$/.test(f)).sort();
  const assets = readFileSync(at('game/assets/gd-assets.js'), 'utf8');
  const body = '// ---- assets (game/assets/gd-assets.js: CC0 props cut from the engine\'s asset store) ----\n' + assets + '\n' + files.map(f => '// ---- ' + f + ' ----\n' + readFileSync(at('game/src/' + f), 'utf8')).join('\n');
  const out = "/* Gauntletdown: built from game/src by build.mjs. Do not edit by hand. */\n(() => {\n'use strict';\n" + body + '\n})();\n';
  writeFileSync(at('game/game.js'), out);
  return { files: files.length, bytes: out.length };
}
export function bundle() {
  const client = readFileSync(at('hub/session.js'), 'utf8'), sha = createHash('sha256').update(client).digest('hex'), want = readFileSync(at('hub/session.sha256'), 'utf8').split(/\s+/)[0];
  if (!client.startsWith('/*! aihub-session')) throw new Error('hub/session.js is not the AI Hub client');
  if (sha !== want) throw new Error('hub/session.js was modified (sha256 ' + sha + ' != ' + want + ')');
  const esc = s => s.replace(/<\/script/gi, '<\\/script');
  const engine = readFileSync(at('my-3d2dge.js'), 'utf8'), game = readFileSync(at('game/game.js'), 'utf8');
  if (client.includes('</script')) throw new Error('the client contains </script: it cannot be inlined unmodified');
  const splash = readFileSync(at('game/splash.html'), 'utf8').trim();
  const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<script>${client}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Gauntletdown</title>
<meta name="description" content="Gauntletdown: a one-to-four player co-op dungeon crawl. Blast hordes, smash generators and eat before your life force runs out.">
<meta name="theme-color" content="#0a0612">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="6">
<meta name="hub:session-goal" content="Score the most: treasure, kills and stairs. Don't starve.">
<meta name="hub:session-howto" content="Move WASD/left stick · Aim mouse/right stick · Fire click/R2 · Magic right-click/△">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}</style>
</head><body>
${splash}
<canvas id="screen"></canvas>
<script>${esc(engine)}</script>
<script>${esc(game)}</script>
</body></html>
`;
  // checks: one canvas, the six metas, the client first after <meta charset>
  if ((html.match(/<canvas id="screen">/g) || []).length !== 1) throw new Error('bundle: expected one canvas');
  for (const m of ['session', 'session-players', 'session-mode', 'session-minutes', 'session-goal', 'session-howto']) if (!html.includes('name="hub:' + m + '"')) throw new Error('bundle: missing meta ' + m);
  if (html.indexOf('<meta charset="utf-8">\n<script>/*! aihub-session') < 0) throw new Error('bundle: the client must be the first script, right after <meta charset>');
  if (!html.includes(client)) throw new Error('bundle: the client is not byte for byte');
  writeFileSync(new URL('../' + NAME + '.html', here), html);
  return { bytes: html.length };
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const g = buildGame(); let msg = 'game.js: ' + g.files + ' files, ' + Math.round(g.bytes / 1024) + ' KB';
  if (process.argv.includes('--bundle')) { const b = bundle(); msg += '; bundle: ' + Math.round(b.bytes / 1024) + ' KB'; }
  console.log(msg);
}
