// Builds the game: src/*.js (in name order) into build/game.js inside one IIFE, build/dev.html for quick looks, and the
// deliverable, one self-contained html file beside this folder. node tools/build.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEV = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = basename(DEV);
const OUT = join(DEV, '..', NAME + '.html');
const TITLE = 'Ahead or Alive: Xtreme Beach Volleyball';
const read = f => readFileSync(join(DEV, f), 'utf8');

export function buildGame() {
  const files = readdirSync(join(DEV, 'src')).filter(f => f.endsWith('.js')).sort();
  let body = '';
  for (const f of files) body += `\n/* ---- ${f} ---- */\n` + read('src/' + f) + '\n';
  const js = `(() => {\n'use strict';\nconst E = My3D2dge, G = {}; window.AOA = G;\n${body}\n})();\n`;
  mkdirSync(join(DEV, 'build'), { recursive: true });
  writeFileSync(join(DEV, 'build/game.js'), js);
  return { js, files };
}
export const VENDOR_MOCAP = ['vendor/mocap/readable.js', 'vendor/mocap/mocap.js', 'vendor/mocap/aoa-clips.js'];

const HUB_TAGS = `<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="5">
<meta name="hub:session-goal" content="Win the beach volleyball match: first to 7, by 2">
<meta name="hub:session-howto" content="Stick/WASD move · Cross/Space hit on time · Circle/Shift dive · Square/E shot">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1-4">`;
const STYLE = '<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}</style>';
const SPLASH = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#0a2d3d;color:#9fd3d6;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#fff8e8;font-size:16px;letter-spacing:.08em">AHEAD OR ALIVE</b><span>Xtreme Beach Volleyball · starting</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#ffd36a;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>`;
const esc = s => s.replace(/<\/script/gi, '<\\/script');

export function build() {
  const { js, files } = buildGame();
  const mocap = VENDOR_MOCAP.filter(f => existsSync(join(DEV, f)));
  // the dev page: separate scripts, for quick looks in a browser
  writeFileSync(join(DEV, 'build/dev.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script src="../vendor/aihub-session.js"></script>
${HUB_TAGS}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${TITLE} (dev)</title>${STYLE}</head><body>${SPLASH}
<canvas id="screen"></canvas>
<script src="../engine/my-3d2dge.js"></script>
${mocap.map(f => `<script src="../${f}"></script>`).join('\n')}
<script src="game.js"></script>
</body></html>\n`);
  // the deliverable: one file, the hub client first after <meta charset>, then the tags; every script inlined
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>${esc(read('vendor/aihub-session.js'))}</script>
${HUB_TAGS}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="A five-day island vacation of 2-on-2 beach volleyball, friendships, swimsuit shopping, pool hopping and casino nights.">
<title>${TITLE}</title>
${STYLE}
</head><body>
${SPLASH}
<canvas id="screen"></canvas>
<script>${esc(read('engine/my-3d2dge.js'))}</script>
<script>${esc(mocap.map(read).join('\n;\n'))}</script>
<script>${esc(js)}</script>
</body></html>
`;
  writeFileSync(OUT, html);
  return { out: OUT, bytes: Buffer.byteLength(html), files: files.length };
}

// newest source time, so the test loader rebuilds only when something changed
export function newestSource() {
  let t = 0;
  for (const f of readdirSync(join(DEV, 'src'))) t = Math.max(t, statSync(join(DEV, 'src', f)).mtimeMs);
  for (const f of ['engine/my-3d2dge.js', ...VENDOR_MOCAP]) if (existsSync(join(DEV, f))) t = Math.max(t, statSync(join(DEV, f)).mtimeMs);
  return t;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = build();
  console.log(`built ${r.out} (${(r.bytes / 1024).toFixed(0)} KB, ${r.files} source files)`);
}
