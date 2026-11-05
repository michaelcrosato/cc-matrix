// Bundles the game into one HTML file: the hub client (session.js, unmodified) first in <head>, the
// engine (my-3d2dge.js, unmodified) and the game's modules (src/game/*.js, in order) inlined, and the
// exit interview built in for the About pages. Run: node build.mjs  (writes ../<name>.html and checks it).
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NAME = 'Sopranoland-TheSopranos-claude-haiku-5-5-medium-20261102-191111';
const OUT = path.join(HERE, '..', NAME + '.html');
const EXIT = path.join(HERE, '..', 'exit-interview.json');
const HUB_GOAL = 'Run the town: collect from Sal, Dorothy and Tina, talk to Big Lou and Dr. Vashti, take the yard from Gus, and get home to Ma before the Feds do. Fastest to finish wins.';
const HUB_HOWTO = 'Move: left stick or WASD. Look: right stick or mouse. Bat: X or J or click. Pistol: LT or Q. Guard: LB or K. Roll: RB or L. Talk and open: Y or E. Jump: A or Space. Camera: R3 or V.';

// the game's code, the bundled way: one IIFE, its modules in file order
export function gameSource() {
  const dir = path.join(HERE, 'src', 'game');
  return readdirSync(dir).filter(f => f.endsWith('.js')).sort()
    .map(f => `// ---- ${f} ----\n` + readFileSync(path.join(dir, f), 'utf8')).join('\n');
}

export function aboutJson() {
  if (!existsSync(EXIT)) return null;
  const data = JSON.parse(readFileSync(EXIT, 'utf8'));
  return data;
}

// the game script with its About data (or a stub for the test runs, which never read it)
export function gameScript(about) {
  const json = JSON.stringify(about || {}).replace(/</g, '\\u003c');
  const src = gameSource().replace('__ABOUT_JSON__', json);
  return `(() => {\n'use strict';\nconst E = My3D2dge;\n${src}\n})();`;
}

export function buildHtml(about) {
  const session = readFileSync(path.join(HERE, 'src', 'vendor', 'session.js'), 'utf8');
  const engine = readFileSync(path.join(HERE, 'src', 'vendor', 'my-3d2dge.js'), 'utf8');
  if (/<\/script/i.test(session) || /<\/script/i.test(engine)) throw new Error('a vendored file contains a closing script tag');
  const game = gameScript(about);
  if (/<\/script/i.test(game)) throw new Error('the game contains a closing script tag');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>
${session}
</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-goal" content="${HUB_GOAL.replace(/"/g, '&quot;')}">
<meta name="hub:session-howto" content="${HUB_HOWTO.replace(/"/g, '&quot;')}">
<meta name="hub:session-minutes" content="10">
<title>Sopranoland · The Sopranos riff · claude-haiku-5-5</title>
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#120a14;color:#c8b8d8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><b style="color:#ffd36a;font-size:16px;letter-spacing:.08em">SOPRANOLAND</b><span>Starting · my-3D2dge v0.85.1</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#d9b77c;animation:e3-run 1.2s ease-in-out infinite"></span></span><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}</style></div>
<canvas id="screen"></canvas>
<script>
${engine}
</script>
<script>
${game}
</script>
</body>
</html>
`;
}

// run directly: write the file, and report its size
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const about = aboutJson();
  if (!about) console.warn('note: ../exit-interview.json is missing, so the About pages show "unknown"');
  const html = buildHtml(about);
  writeFileSync(OUT, html);
  console.log('wrote', path.relative(process.cwd(), OUT), (html.length / 1024).toFixed(0) + ' KB');
}
