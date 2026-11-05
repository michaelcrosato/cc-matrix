// Builds the game's single file: the deliverable goes to the folder above this one, beside exit-interview.json.
// The hub client (vendor/session.js) is pasted unmodified as the first script in <head>, right after <meta charset>.
// Run: node build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const read = f => readFileSync(join(here, f), 'utf8');
const NAME = 'BreakingDustBowl-BreakingBad-claude-haiku-5-5-medium-20261102-191741';
const out = join(here, '..', NAME + '.html');
const exitText = read('src/exit-interview.json');
const exit = JSON.parse(exitText);   // must parse: the file is also the run record's input
const esc = s => s.replace(/<\/script/gi, '<\\/script');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>
${esc(read('vendor/session.js'))}
</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="parallel">
<meta name="hub:session-goal" content="Most cash: deliver three batches to the RV across the desert, fastest and cleanest">
<meta name="hub:session-howto" content="Move: stick or WASD. Swing: attack button or click. Dash: dash button. Confirm: talk. V changes view">
<meta name="hub:session-minutes" content="3">
<title>Breaking Dust Bowl · a riff on Breaking Bad · my-3D2dge</title>
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#0b0a10;color:#c8b8a0;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#fff6d8;font-size:16px;letter-spacing:.08em">BREAKING DUST BOWL</b><span>Starting · my-3D2dge v0.85.1</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#ffd36a;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>
<canvas id="screen"></canvas>
<script>window.EXIT_INTERVIEW = ${JSON.stringify(exit)};</script>
<script>
${esc(read('vendor/my-3d2dge.js'))}
</script>
<script>
${esc(read('src/game.js'))}
</script>
</body>
</html>
`;
writeFileSync(out, html);
writeFileSync(join(here, '..', 'exit-interview.json'), exitText.endsWith('\n') ? exitText : exitText + '\n');
console.log('wrote ' + out + ' (' + html.length + ' bytes) and exit-interview.json');
