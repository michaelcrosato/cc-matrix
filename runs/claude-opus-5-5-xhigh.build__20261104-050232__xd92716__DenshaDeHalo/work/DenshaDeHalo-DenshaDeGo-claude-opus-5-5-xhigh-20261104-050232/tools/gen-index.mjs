// writes index.html: session.js first (unmodified), the hub tags, the engine, rail.js, then src/*.js in name order
import { readdirSync, writeFileSync, readFileSync } from 'node:fs';
const here = new URL('../', import.meta.url);
const src = readdirSync(new URL('src/', here)).filter(f => f.endsWith('.js')).sort();
export const SCRIPTS = ['engine/my-3d2dge.js', 'engine/modules/rail.js', ...src.map(f => 'src/' + f)];
export const HEAD = `<meta charset="utf-8">
SESSION
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1-2">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="2-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="6">
<meta name="hub:session-goal" content="Best driving score: stop on the mark, on time">
<meta name="hub:session-howto" content="Lever W/S or L2/R2 · Call E/✕ · Horn Space/□ · ATS Q/△">
<meta name="description" content="Densha de Halo! Drive the Halo Line round Akari City: stop on the mark, keep the timetable to the second.">
<title>Densha de Halo!</title>
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>`;
export const BOOT = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05040a;color:#a9a1c8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#f4f0ff;font-size:16px;letter-spacing:.08em">DENSHA DE HALO!</b><span>Starting · my-3D2dge v0.85.2</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#f2c230;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>
<canvas id="screen"></canvas>`;
if (import.meta.url === 'file://' + process.argv[1]) {
  const html = `<!doctype html>\n<html lang="en">\n<head>\n${HEAD.replace('SESSION', '<script src="vendor/aihub/session.js"></script>')}\n</head>\n<body>\n${BOOT}\n${SCRIPTS.map(s => `<script src="${s}"></script>`).join('\n')}\n</body>\n</html>\n`;
  writeFileSync(new URL('index.html', here), html);
  console.log('index.html: ' + SCRIPTS.length + ' scripts');
}
