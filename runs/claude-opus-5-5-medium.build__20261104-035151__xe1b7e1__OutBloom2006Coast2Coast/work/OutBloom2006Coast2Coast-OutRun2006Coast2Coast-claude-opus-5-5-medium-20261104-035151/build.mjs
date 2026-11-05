// node build.mjs: the single-file bundle in the root (beside TASK.md), then exit-interview.json from OB.ABOUT.
// The AI Hub session client goes in verbatim as the first script in <head>; then the hub tags, the engine and every
// src file in manifest order. A lint pass checks our sources for leftover markers and network calls.
import { readFileSync, writeFileSync } from 'node:fs';
import { boot } from './tests/lib/boot.mjs';
const here = new URL('./', import.meta.url), root = new URL('../', here), read = f => readFileSync(new URL(f, here), 'utf8');
const NAME = 'OutBloom2006Coast2Coast-OutRun2006Coast2Coast-claude-opus-5-5-medium-20261104-035151';
const files = JSON.parse(read('src/manifest.json'));
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const problems = [];
for (const f of files) {
  const s = read('src/' + f);
  const code = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const re of [/\bTODO\b/i, /\bTBD\b/, /FIXME/i, /placeholder/i, /lorem/i, /stub/i]) if (re.test(s)) problems.push(f + ': ' + re);
  for (const re of [/\bfetch\(/, /WebSocket/, /RTCPeerConnection/, /XMLHttpRequest/, /\balert\(|window\.(confirm|prompt)\(|[=;(]\s*(confirm|prompt)\(/, /window\.open/, /https?:\/\//]) if (re.test(code)) problems.push(f + ': ' + re);
}
const session = read('vendor/hub/session.js');
const tags = [['hub:session', '1'], ['hub:session-players', '1-4'], ['hub:session-mode', 'ghost'], ['hub:session-goal', 'Fastest to the Flower Sprint goal wins'], ['hub:session-howto', 'Steer stick/←→ · gas R2/✕/W · brake L2/□/S · drift ○/Space'], ['hub:session-minutes', '4'], ['hub:type', 'Game'], ['hub:players', '1-4']]
  .map(([n, c]) => `<meta name="${n}" content="${c}">`).join('\n');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>${esc(session)}</script>
${tags}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>OutBloom 2006: Coast 2 Coast</title>
<style>html, body { margin: 0; height: 100%; background: #140a28; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:linear-gradient(#2a1450,#7a3a7a 60%,#ff9a6a);color:#ffe8d8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#fff4e0;font-size:18px;letter-spacing:.08em">OUTBLOOM 2006: COAST 2 COAST</b><span>Starting · my-3D2dge v0.85.2</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff22"><span style="display:block;width:30%;height:100%;background:#ffcf4a;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>
<canvas id="screen"></canvas>
<script>${esc(read('engine/my-3d2dge.js'))}</script>
${files.map(f => `<script>/* ${f} */\n${esc(read('src/' + f))}</script>`).join('\n')}
</body>
</html>
`;
// the sources must load headless (a syntax slip never reaches the bundle), then the bundle, then the exit interview
const { OB } = boot();
writeFileSync(new URL(NAME + '.html', root), html);
const A = OB.ABOUT, si = A.sourceInformation;
const exit = { sourceInformation: { date: si.date, source: si.source, plan: si.plan, genre: si.genre, perspective: si.perspective, tech: si.tech, artDirection: si.artDirection, animation: si.animation, audio: si.audio, online: si.online, testing: si.testing, research: si.research, environment: si.environment, model: si.model, usage: si.usage },
  testingFeedback: A.testingFeedback, engineFeedback: A.engineFeedback, promptFeedback: A.promptFeedback, aiHub: A.aiHub };
writeFileSync(new URL('exit-interview.json', root), JSON.stringify(exit, null, 2) + '\n');
JSON.parse(readFileSync(new URL('exit-interview.json', root), 'utf8'));
if (problems.length) { console.log('LINT ' + problems.join('\nLINT ')); process.exit(1); }
console.log('built ' + NAME + '.html (' + Math.round(html.length / 1024) + ' KB) and exit-interview.json');
