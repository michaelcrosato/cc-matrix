// Builds game/game.js from game/src/*.js and the single-file deliverable (engine + hub client + game inlined).
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
const NAME = 'Gauntletdown-Gauntlet-claude-sonnet-5-5-medium-20261104-050250';
const files = readdirSync('game/src').filter(f => f.endsWith('.js')).sort();
let exit = 'null'; try { if (existsSync('../exit-interview.json')) exit = JSON.stringify(JSON.parse(readFileSync('../exit-interview.json', 'utf8'))); } catch (e) { console.error('exit-interview.json does not parse', e.message); }
const body = files.map(f => `/* ---- ${f} ---- */\n` + readFileSync('game/src/' + f, 'utf8')).join('\n');
const game = `(() => {\nconst __EXIT__ = ${exit};\n${body}\n})();\n`;
writeFileSync('game/game.js', game);
const metas = `<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Most points when the clock runs out: treasure, kills, stairs. Don't starve.">
<meta name="hub:session-howto" content="Move: left stick / WASD. Aim: right stick / mouse. Fire: R2 / click. Magic flask: triangle / right click. Plant: L2 / Shift.">
<meta name="hub:session-minutes" content="6">`;
const bootDiv = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05030a;color:#c8b8e0;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><b style="color:#ffe9b8;font-size:16px;letter-spacing:.08em">GAUNTLETDOWN</b><span>Digging the Gaunt…</span></div>`;
const hub = readFileSync('hub/session.js', 'utf8');
const html = (devPage, inline) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
${readFileSync('hub/session.js', 'utf8') ? '<script>' + hub.replace(/<\/script/gi, '<\\/script') + '</script>' : ''}
${metas}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Gauntletdown</title>
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
${bootDiv}
<canvas id="screen"></canvas>
${inline ? '<script>' + readFileSync('my-3d2dge.js', 'utf8').replace(/<\/script/gi, '<\\/script') + '</script>\n<script>' + game.replace(/<\/script/gi, '<\\/script') + '</script>' : '<script src="../my-3d2dge.js"></script>\n<script src="game.js"></script>'}
</body>
</html>
`;
writeFileSync('game/index.html', html(true, false).replace('../my-3d2dge.js', '../my-3d2dge.js').replace('<script src="game.js">', '<script src="game.js">'));
writeFileSync('../' + NAME + '.html', html(false, true));
console.log('built', files.length, 'fragments,', Math.round(game.length / 1024) + ' KB game,', 'deliverable written');
