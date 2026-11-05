// Writes index.html (the dev page: separate scripts, works from file://) and the single-file deliverable in the root
// folder: <meta charset>, the unmodified AI Hub session.js first, the hub tags, the boot splash, the canvas, then the
// engine, rail.js and src/*.js inlined in load order.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const root = new URL('../', import.meta.url), rd = f => readFileSync(new URL(f, root), 'utf8');
const NAME = 'DenshaDeHalo-DenshaDeGo-claude-opus-5-5-medium-20261104-050235';
const src = readdirSync(new URL('src/', root)).filter(f => f.endsWith('.js')).sort().map(f => 'src/' + f);
const scripts = ['engine/my-3d2dge.js', 'engine/modules/rail.js', ...src];
const head = s => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
${s}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1-2">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="2-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="5">
<meta name="hub:session-goal" content="Best driving score: stop on the mark, on time">
<meta name="hub:session-howto" content="Lever W/S or L2/R2 · Call E/✕ · Horn Space/□ · ATS Q/△">
<meta name="description" content="Densha de Halo! Drive the Halo Line, a loop railway: stop on the mark, keep the timetable to the second.">
<title>Densha de Halo!</title>
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05040a;color:#a9a1c8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#f2c230;font-size:16px;letter-spacing:.08em">DENSHA DE HALO!</b><span>Starting · my-3D2dge v0.85.2</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#f2c230;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>
<canvas id="screen"></canvas>
`;
const session = rd('vendor/aihub/session.js');
writeFileSync(new URL('index.html', root), head('<script src="vendor/aihub/session.js"></script>') + scripts.map(f => `<script src="${f}"></script>`).join('\n') + '\n</body>\n</html>\n');
const inline = s => s.replace(/<\/script/gi, '<\\/script');
const out = head('<script>\n' + session + '\n</script>') + scripts.map(f => `<script>/* ${f} */\n${inline(rd(f))}\n</script>`).join('\n') + '\n</body>\n</html>\n';
writeFileSync(new URL('../' + NAME + '.html', root), out);
console.log('bundle', (out.length / 1024).toFixed(0) + ' KB', scripts.length, 'scripts');
