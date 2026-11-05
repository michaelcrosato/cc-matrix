// Bundles the game into ONE html file in the root (beside TASK.md): the AI Hub session client first, then the engine and src files.
import { readFileSync, writeFileSync } from 'node:fs';
const here = new URL('./', import.meta.url), read = f => readFileSync(new URL(f, here), 'utf8');
const NAME = 'OutBloom2006Coast2Coast-OutRun2006Coast2Coast-claude-sonnet-5-5-medium-20261104-042140.html';
const safe = s => s.replace(/<\/script/gi, '<\\/script');
const man = JSON.parse(read('src/manifest.json'));
const splash = read('engine/game/index.html').match(/<div id="e3-boot"[\s\S]*?<\/div>/)[0].replace(/ROOFTOP/g, 'OutBloom 2006').replace(/Starting · my-3D2dge v0\.85\.2/, 'Starting · my-3D2dge v0.85.2 · Coast 2 Coast');
const meta = [['hub:type', 'Game'], ['hub:players', '1-4'], ['hub:session', '1'], ['hub:session-players', '1-4'], ['hub:session-mode', 'ghost'], ['hub:session-goal', 'Fastest to the Flower Sprint goal wins'], ['hub:session-howto', 'Steer stick/←→ · gas R2/✕/W · brake L2/□/S · drift ○/Space'], ['hub:session-minutes', '4']];
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>${safe(read('vendor/hub/session.js'))}</script>
${meta.map(([n, c]) => `<meta name="${n}" content="${c}">`).join('\n')}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>OutBloom 2006: Coast 2 Coast</title>
<style>html, body { margin: 0; height: 100%; background: #10081c; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
${splash}
<canvas id="screen"></canvas>
<script>${safe(read('engine/my-3d2dge.js'))}</script>
${man.map(f => `<script>/* ${f} */\n${safe(read('src/' + f))}</script>`).join('\n')}
</body>
</html>
`;
const out = new URL('../' + NAME, here);
writeFileSync(out, html);
// lint: no placeholders, and no network use outside the verbatim session client
const sess = read('vendor/hub/session.js'), body = html.replace(sess, '');
const bad = [/\bTODO\b/i, /\bTBD\b/i, /\bFIXME\b/i, /placeholder/i, /lorem/i, /\bfetch\(/, /new WebSocket/, /RTCPeerConnection/, /XMLHttpRequest/, /\balert\(/, /\bconfirm\(/, /\bprompt\(/, /window\.open/].filter(re => re.test(body.replace(read('engine/my-3d2dge.js'), '')));
console.log('wrote', NAME, (html.length / 1024).toFixed(0) + ' KB', bad.length ? 'LINT: ' + bad.join(' ') : 'lint ok');
