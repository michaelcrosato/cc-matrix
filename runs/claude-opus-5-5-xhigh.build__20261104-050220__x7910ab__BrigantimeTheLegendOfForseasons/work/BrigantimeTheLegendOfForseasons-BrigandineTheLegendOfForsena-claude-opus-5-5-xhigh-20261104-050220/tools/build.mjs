// Build: node tools/build.mjs
// 1. src/*.js in name order -> dist/game.js, one IIFE: (() => { 'use strict'; const E = My3D2dge, G = {}; ... })();
// 2. dist/index.html: the dev page (loads ../engine/my-3d2dge.js, ../engine-ext/beasts.js, game.js)
// 3. the single file in the work folder's root: the hub client first, then the tags, the engine, engine-ext, the game
// 4. fails on TODO / FIXME / XXX / placeholder / lorem in src, and on any asset URL that is not a data URI
import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEV = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = join(DEV, '..');
const NAME = basename(DEV);
const OUT = join(ROOT, NAME + '.html');
const TITLE = 'Brigantime: The Legend of Forseasons';
const read = f => readFileSync(join(DEV, f), 'utf8');
const fail = m => { console.error('BUILD FAILED: ' + m); process.exit(1); };

const files = readdirSync(join(DEV, 'src')).filter(f => /^\d\d-.*\.js$/.test(f)).sort();
const banned = { test: line => /\b(TODO|FIXME|XXX)\b/.test(line) || /placeholder|lorem/i.test(line) };
let body = '';
for (const f of files) {
  const src = read('src/' + f);
  src.split('\n').forEach((line, i) => { if (banned.test(line)) fail(`src/${f}:${i + 1} has a banned word: ${line.trim().slice(0, 100)}`); });
  body += `\n// ===== src/${f} =====\n{\n` + src + '\n}\n';   // each file in a block of its own: they share only through G
}
const urls = body.match(/\b(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}\/[^\s'"`)]*\.(?:png|jpe?g|gif|webp|mp3|ogg|wav|m4a)\b/gi);
if (urls) fail('asset URLs that are not data URIs: ' + urls.join(', '));
const game = `(() => {\n'use strict';\nconst E = My3D2dge, G = {};\n${body}\n})();\n`;
mkdirSync(join(DEV, 'dist'), { recursive: true });
writeFileSync(join(DEV, 'dist/game.js'), game);

const META = `<meta name="hub:session" content="1">
<meta name="hub:session-players" content="2-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Most glory wins: rout rivals and hold the Shrine">
<meta name="hub:session-howto" content="Stick/WASD: cursor · ✕/Enter: select · ○/Esc: back · □/Space: end turn">
<meta name="hub:session-minutes" content="9">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1-4">`;
const STYLE = `<style>html, body { margin: 0; height: 100%; background: #07060d; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>`;
const SPLASH = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#07060d;color:#b8b0c8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#ffe7a0;font-size:16px;letter-spacing:.08em">BRIGANTIME</b><span>Winding the Great Clock · my-3D2dge v0.85.2</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#d8c070;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>`;

// the dev page
const devPage = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script src="../vendor/hub/session.js"></script>
${META}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${TITLE} (dev)</title>
${STYLE}
</head>
<body>
${SPLASH}
<canvas id="screen"></canvas>
<script src="../engine/my-3d2dge.js"></script>
<script src="../engine-ext/beasts.js"></script>
<script src="game.js"></script>
</body>
</html>
`;
writeFileSync(join(DEV, 'dist/index.html'), devPage);

// the single file
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const session = read('vendor/hub/session.js');
const single = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>
${session}
</script>
${META}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Four seasons. Four crowns. One stopped clock. A seasonal war of monster-binding knights: muster castles, summon beasts and fight twelve-bell hex battles.">
<title>${TITLE}</title>
${STYLE}
</head>
<body>
${SPLASH}
<canvas id="screen"></canvas>
<script>
${esc(read('engine/my-3d2dge.js'))}
</script>
<script>
${esc(read('engine-ext/beasts.js'))}
</script>
<script>
${esc(game)}
</script>
</body>
</html>
`;
writeFileSync(OUT, single);
// the hub harness folder: the harness files and a copy of the game
mkdirSync(join(DEV, 'dist/hub'), { recursive: true });
for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(join(DEV, 'vendor/hub', f), join(DEV, 'dist/hub', f));
copyFileSync(OUT, join(DEV, 'dist/hub/game.html'));
if (!process.argv.includes('--quiet')) console.log(`built ${files.length} files: dist/game.js ${(game.length / 1024).toFixed(0)} KB; ${basename(OUT)} ${(single.length / 1024).toFixed(0)} KB`);
