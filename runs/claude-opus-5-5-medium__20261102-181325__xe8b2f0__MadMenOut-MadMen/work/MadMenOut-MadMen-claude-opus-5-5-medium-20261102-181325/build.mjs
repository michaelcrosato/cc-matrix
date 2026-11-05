// Builds the game: src/*.js in order into game.js (one IIFE), a dev page (index.html, loading vendor files), and the
// single bundled file in the run's root folder with the hub client, the engine and the game inlined.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const here = new URL('.', import.meta.url);
const NAME = 'MadMenOut-MadMen-claude-opus-5-5-medium-20261102-181325';
const src = readdirSync(new URL('src/', here)).filter(f => f.endsWith('.js')).sort();
const body = src.map(f => `/* ===== ${f} ===== */\n` + readFileSync(new URL('src/' + f, here), 'utf8')).join('\n');
const gameJs = `/* ============================== GAME START ==============================\n * MAD MEN OUT: a spiritual successor to Mad Men (2007-2015), on my-3D2dge v0.85.1.\n * ======================================================================== */\n(() => {\n'use strict';\n${body}\n})();\n/* ============================== GAME END ============================== */\n`;
writeFileSync(new URL('game.js', here), gameJs);
const meta = `<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="parallel">
<meta name="hub:session-goal" content="Win the most billings from three ad pitches">
<meta name="hub:session-howto" content="Pick 3 cards, time the meter with A/Space, hit the arrows on the beat">
<meta name="hub:session-minutes" content="6">`;
const head = (session, title = 'Mad Men Out') => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
${session}
${meta}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Mad Men Out: a 1962 Madison Avenue adventure. Gather insights, write the campaign, win the pitch.">
<title>${title}</title>
<style>html, body { margin: 0; height: 100%; background: #0b0a10; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>`;
const splash = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#0b0a10;color:#c8b89a;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#f4ead8;font-size:16px;letter-spacing:.08em">MAD MEN OUT</b><span>Starting · my-3D2dge v0.85.1</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#e8c36a;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>`;
const session = readFileSync(new URL('vendor/session.js', here), 'utf8');
const engine = readFileSync(new URL('vendor/my-3d2dge.js', here), 'utf8');
const safe = s => s.replace(/<\/script/gi, '<\\/script');
// the dev page: the vendor files beside it
writeFileSync(new URL('index.html', here), `${head('<script src="vendor/session.js"></script>', 'Mad Men Out (dev)')}
<body>
${splash}
<canvas id="screen"></canvas>
<script src="vendor/my-3d2dge.js"></script>
<script src="game.js"></script>
</body>
</html>
`);
// the bundle: one file, nothing to fetch
const bundle = `${head('<script>\n' + safe(session) + '\n</script>')}
<body>
${splash}
<canvas id="screen"></canvas>
<script>
${safe(engine)}
</script>
<script>
${safe(gameJs)}
</script>
</body>
</html>
`;
writeFileSync(new URL('../' + NAME + '.html', here), bundle);
console.log('built game.js (' + gameJs.length + ' bytes), index.html, ../' + NAME + '.html (' + bundle.length + ' bytes)');
