// Build: concatenate src/*.js into one IIFE (dist/game.js), write the dev page (dist/index.html) and the single-file game
// in the folder above (the deliverable). Fails on TODO/FIXME/placeholder in src or any non-data asset URL.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
const here = new URL('../', import.meta.url), rd = f => readFileSync(new URL(f, here), 'utf8');
const NAME = 'BrigantimeTheLegendOfForseasons-BrigandineTheLegendOfForsena-claude-opus-5-5-medium-20261104-050223';
const files = readdirSync(new URL('src/', here)).filter(f => f.endsWith('.js')).sort();
const bad = [];
for (const f of files) { const s = rd('src/' + f); s.split('\n').forEach((l, i) => { if (/\b(TODO|FIXME|XXX)\b|placeholder|lorem/i.test(l)) bad.push(f + ':' + (i + 1) + ' ' + l.trim().slice(0, 80)); if (/url\(\s*['"]?https?:|src\s*=\s*['"]https?:/.test(l)) bad.push(f + ':' + (i + 1) + ' external asset'); }); }
if (bad.length) { console.error('BUILD FAILED (guards):\n' + bad.join('\n')); process.exit(1); }
const body = files.map(f => '// ---- ' + f + ' ----\n' + rd('src/' + f)).join('\n');
const game = "(() => {\n'use strict';\nconst E = My3D2dge, G = {};\n" + body + "\n})();\n";
mkdirSync(new URL('dist/', here), { recursive: true });
writeFileSync(new URL('dist/game.js', here), game);
const TITLE = 'Brigantime: The Legend of Forseasons';
const HEAD_META = `<meta name="hub:session" content="1">
<meta name="hub:session-players" content="2-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Most glory wins: rout rivals and hold the Shrine">
<meta name="hub:session-howto" content="Stick/WASD: cursor · ✕/Enter: select · ○/Esc: back · □/Space: end turn">
<meta name="hub:session-minutes" content="9">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${TITLE}</title>
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>`;
const BOOT = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#0a0812;color:#c8b890;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><b style="color:#f4e8c0;font-size:16px;letter-spacing:.08em">BRIGANTIME</b><span>Winding the Great Clock…</span></div>
<canvas id="screen"></canvas>`;
const session = rd('vendor/hub/session.js');
writeFileSync(new URL('dist/index.html', here), `<!doctype html><html lang="en"><head><meta charset="utf-8">\n<script src="../vendor/hub/session.js"></script>\n${HEAD_META}\n</head><body>\n${BOOT}\n<script src="../engine/my-3d2dge.js"></script>\n<script src="../engine-ext/beasts.js"></script>\n<script src="game.js"></script>\n</body></html>\n`);
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const single = `<!doctype html><html lang="en"><head><meta charset="utf-8">\n<script>\n${session}\n</script>\n${HEAD_META}\n</head><body>\n${BOOT}\n<script>\n${esc(rd('engine/my-3d2dge.js'))}\n</script>\n<script>\n${esc(rd('engine-ext/beasts.js'))}\n</script>\n<script>\n${esc(game)}\n</script>\n</body></html>\n`;
writeFileSync(new URL('../' + NAME + '.html', here), single);
if (process.argv.includes('-v')) console.log('built', files.length, 'files,', (single.length / 1024).toFixed(0) + ' KB');
