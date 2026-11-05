// Bundles WIRETAP into one html file in the work/ folder, and writes exit-interview.json beside it from src/credits.json.
// node tools/build.mjs        (also writes index.html, the dev page that loads the sources one by one)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
const here = new URL('../', import.meta.url), rd = f => readFileSync(new URL(f, here), 'utf8');
const STEM = 'Wiretap-TheWire-claude-opus-5-5-medium-20261103-125818';
const engine = rd('engine/my-3d2dge.js'), hub = rd('vendor/aihub-session.js'), css = rd('src/ui.css');
const credits = JSON.parse(rd('src/credits.json'));
const files = readdirSync(new URL('src/', here)).filter(f => f.endsWith('.js')).sort();
const game = "(() => { 'use strict';\nconst CREDITS = " + JSON.stringify(credits) + ";\n" + files.map(f => '/* ---- ' + f + ' ---- */\n' + rd('src/' + f)).join('\n') + '\n})();';
for (const [n, s] of [['game', game], ['engine', engine], ['hub', hub]]) if (/<\/script/i.test(s)) throw new Error(n + ' contains </script');
try { new vm.Script(game, { filename: 'game.js' }); } catch (e) { console.error('SYNTAX', e.message); process.exit(1); }
// the boot splash, made by the engine itself
const ctx = { console: { log() {}, info() {}, warn() {}, error() {} }, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(engine, ctx); const splash = ctx.My3D2dge.bootSplash ? ctx.My3D2dge.bootSplash('WIRETAP') : '';
const HUBTAGS = `<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="6">
<meta name="hub:session-goal" content="Detail: build a 100-point case with photos and taps. Corner: make the quota without getting made.">
<meta name="hub:session-howto" content="Move: stick/WASD · Watch: L2/right mouse · Photo: R2/left click · Act: Cross/E · Call out/jump-out: Triangle/Q · Shut down: Square/F">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1-4">`;
const head = (scripts) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
${scripts.hub}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${HUBTAGS}
<title>WIRETAP</title>
<style>${css}</style>
</head>
<body>
${splash}
<canvas id="screen"></canvas><div id="ui"></div>
${scripts.body}
</body>
</html>
`;
const html = head({ hub: '<script>' + hub + '</script>', body: '<script>' + engine + '</script>\n<script>' + game + '</script>' });
writeFileSync(new URL('../' + STEM + '.html', here), html);
// the dev page: the same, with the sources as separate scripts (credits through a tiny script)
writeFileSync(new URL('index.html', here), head({ hub: '<script src="vendor/aihub-session.js"></script>',
  body: '<script src="engine/my-3d2dge.js"></script>\n<script src="dev-bundle.js"></script>' }));
writeFileSync(new URL('dev-bundle.js', here), game);
// the exit interview
const ex = credits.exitInterview; const out = JSON.stringify(ex, null, 2);
JSON.parse(out); writeFileSync(new URL('../exit-interview.json', here), out + '\n');
console.log('bundle', STEM + '.html', (html.length / 1048576).toFixed(2) + ' MB', files.length, 'source files; exit-interview.json ok');
