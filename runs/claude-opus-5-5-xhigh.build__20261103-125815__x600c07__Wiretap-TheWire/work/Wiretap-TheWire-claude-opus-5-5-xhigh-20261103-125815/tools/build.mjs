// WIRETAP build: bundles the engine, the AI Hub client and the game's sources into ONE html file in work/,
// and writes work/exit-interview.json from src/credits.json. Run: node tools/build.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEV = join(dirname(fileURLToPath(import.meta.url)), '..');
const STEM = 'Wiretap-TheWire-claude-opus-5-5-xhigh-20261103-125815';
const OUT = join(DEV, '..', STEM + '.html');
const read = f => readFileSync(join(DEV, f), 'utf8');

const hub = read('vendor/aihub-session.js');
const engine = read('engine/my-3d2dge.js');
const css = read('src/ui.css');
const credits = JSON.parse(read('src/credits.json'));
const files = readdirSync(join(DEV, 'src')).filter(f => f.endsWith('.js')).sort();
let game = `(() => {\n'use strict';\nconst CREDITS = ${JSON.stringify(credits)};\n`;
for (const f of files) game += `\n/* ===== ${f} ===== */\n` + read('src/' + f) + '\n';
game += '\n})();\n';

// a syntax check of the game script on its own (catches a bad edit before the browser does)
try { new vm.Script(game, { filename: 'game.js' }); } catch (e) { console.error('SYNTAX', e.message, e.stack.split('\n').slice(0, 3).join(' | ')); process.exit(1); }

// the boot splash markup, from the engine itself
const ctx = { console: { log() {}, warn() {}, error() {}, info() {} } }; vm.createContext(ctx);
vm.runInContext(engine, ctx);
const splash = ctx.My3D2dge.bootSplash('WIRETAP');

const esc = s => s.replace(/<\/script/gi, '<\\/script');
for (const [name, src] of [['engine', engine], ['game', game]]) if (/<\/script/i.test(src)) console.log(`note: escaped </script in ${name}`);
if (/<\/script/i.test(hub)) { console.error('the hub client contains </script: cannot inline it unmodified'); process.exit(1); }

const meta = [
  ['hub:session', '1'], ['hub:session-players', '1-4'], ['hub:session-mode', 'shared-world'], ['hub:session-minutes', '6'],
  ['hub:session-goal', 'Cops: build a 100-point case. Corner: make $800 without getting made.'],
  ['hub:session-howto', 'Move: stick/WASD · Watch: L2/right mouse · Photo: R2/left mouse · Act: ✕/E · Call out: △/Q · Shut down: □/F'],
  ['hub:type', 'Game'], ['hub:players', '1-4']
].map(([n, c]) => `<meta name="${n}" content="${c.replace(/"/g, '&quot;')}">`).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>${hub}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${meta}
<title>WIRETAP</title>
<style>${css}</style>
</head>
<body>
${splash}
<canvas id="screen"></canvas>
<div id="ui" aria-live="polite"></div>
<script>${esc(engine)}</script>
<script>${esc(game)}</script>
</body>
</html>
`;
writeFileSync(OUT, html);
writeFileSync(join(DEV, 'tests', '.game.js'), game);
const ei = credits.exitInterview;
const eiText = JSON.stringify(ei, null, 2) + '\n';
JSON.parse(eiText);
writeFileSync(join(DEV, '..', 'exit-interview.json'), eiText);
console.log(`built ${STEM}.html  ${(html.length / 1024 / 1024).toFixed(2)} MB  (${files.length} source files, game ${(game.length / 1024).toFixed(0)} KB); exit-interview.json ok`);
