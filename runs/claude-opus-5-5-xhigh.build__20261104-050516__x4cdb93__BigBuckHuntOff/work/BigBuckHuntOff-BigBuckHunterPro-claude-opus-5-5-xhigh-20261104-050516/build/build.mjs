// node build/build.mjs: bundles the engine, its new modules and the game into the single HTML in the work root.
// It checks the bundle the way the hub and the definition of done ask: the session client first and unedited, every hub
// meta, the goal and howto lengths, no unfinished markers in the game or the new modules, no network or popups in game code.
import { writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { ROOT, manifest, read, gameSource, engineFiles } from './lib.mjs';
const fail = m => { console.error('build: ' + m); process.exit(1); };
const session = read('hub/session.js'), game = gameSource(), eng = engineFiles();
const banned = [/\bTODO\b/, /\bFIXME\b/, /\bXXX\b/, /placeholder/i, /lorem/i];
for (const f of manifest.src.concat(manifest.engine.slice(1))) { const s = read(f); for (const b of banned) if (b.test(s)) fail(f + ' has an unfinished marker: ' + b); }
const net = [/\bfetch\s*\(/, /\bWebSocket\b/, /RTCPeerConnection/, /(^|[^.\w'"])alert\s*\(/m, /(^|[^.\w'"])confirm\s*\(/m, /(^|[^.\w'"])prompt\s*\(/m, /window\.open\s*\(/];
for (const f of manifest.src) { const s = read(f); for (const b of net) if (b.test(s)) fail(f + ' calls something a hub session forbids: ' + b); }
for (const f of manifest.src.concat(manifest.engine.slice(1))) if (/Math\.random\s*\(/.test(read(f))) fail(f + ' uses Math.random (use the RNG streams)');
const meta = {
  'hub:session': '1', 'hub:session-players': '1-4', 'hub:session-mode': 'ghost', 'hub:session-minutes': '3',
  'hub:session-goal': 'Most points in 3 minutes wins. Bucks only, never does!',
  'hub:session-howto': 'Aim: mouse or left stick · Shoot: click or R2 · Pump: R or Square',
  'hub:type': 'Game', 'hub:players': '1-4'
};
if (meta['hub:session-goal'].length > 60) fail('goal is over 60 characters'); if (meta['hub:session-howto'].length > 80) fail('howto is over 80 characters');
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const metas = Object.entries(meta).map(([k, v]) => `<meta name="${k}" content="${v}">`).join('\n');
const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<script>${esc(session)}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${manifest.title}</title>
<meta name="description" content="An arcade light-gun hunting shooter in living pixel landscapes: bag the bucks, spare the does, and win the Hunt-Off.">
${metas}
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none;cursor:none}</style>
</head><body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05040a;color:#a9a1c8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#f4f0ff;font-size:16px;letter-spacing:.08em">BIG BUCK HUNT-OFF</b><span>Starting · my-3D2dge v0.85.2</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#e8843a;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>
<canvas id="screen"></canvas>
${eng.map(([f, s]) => `<script>/* ${f} */\n${esc(s)}</script>`).join('\n')}
<script>/* the game */\n${esc(game.code)}</script>
</body></html>
`;
const i = html.indexOf('<meta charset="utf-8">'), j = html.indexOf('<script>', i);
if (j < 0 || html.slice(i + 22, j).trim() !== '') fail('the session client must be the first script right after <meta charset>');
const h1 = createHash('sha256').update(session).digest('hex'), inl = html.slice(j + 8, html.indexOf('</script>', j)), h2 = createHash('sha256').update(inl.replace(/<\\\/script/gi, '</script')).digest('hex');
if (h1 !== h2) fail('the session client in the bundle differs from hub/session.js');
const out = join(ROOT, '..', manifest.file);
writeFileSync(out, html);
writeFileSync(join(ROOT, 'build/game.js'), game.code);
// the exit interview, beside the game: report.json in exactly its shape
const rep = JSON.parse(read('report.json')), shape = { sourceInformation: ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'], aiHub: ['name', 'tagline', 'description', 'type', 'genre', 'source', 'series', 'players', 'controls', 'tags'] };
const exit = { sourceInformation: {}, testingFeedback: rep.testingFeedback, engineFeedback: rep.engineFeedback, promptFeedback: rep.promptFeedback, aiHub: {} };
for (const k of shape.sourceInformation) { if (typeof rep.sourceInformation[k] !== 'string' || !rep.sourceInformation[k]) fail('report.json: sourceInformation.' + k + ' is empty'); exit.sourceInformation[k] = rep.sourceInformation[k]; }
for (const k of shape.aiHub) exit.aiHub[k] = rep.aiHub[k];
if (exit.testingFeedback.length !== 4 || exit.engineFeedback.length !== 6 || exit.promptFeedback.length !== 4) fail('report.json: the feedback lists need 4, 6 and 4 answers');
writeFileSync(join(ROOT, '..', 'exit-interview.json'), JSON.stringify(exit, null, 2) + '\n');
console.log('built ' + manifest.file + ' (' + (html.length / 1024).toFixed(0) + ' KB)');
