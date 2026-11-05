// Bundles engine + src into one HTML file (session.js inlined unmodified as the first script in <head>).
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAME = path.basename(root);
const out = path.resolve(root, '..', NAME + '.html');
const files = readdirSync(path.join(root, 'src')).filter(f => /^\d.*\.js$/.test(f)).sort();
for (const f of files) { try { execFileSync('node', ['--check', path.join(root, 'src', f)], { stdio: 'pipe' }); } catch (e) { console.error('SYNTAX ERROR in ' + f + '\n' + (e.stderr || e).toString()); process.exit(1); } }
const rd = p => readFileSync(path.join(root, p), 'utf8');
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const session = rd('vendor/aihub/session.js');
const metas = `<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-goal" content="Defend your Banner of Mending from the Knotted army for 3 minutes. Break blocks, build walls and traps, and stitch up monsters for points.">
<meta name="hub:session-howto" content="Move: left stick / WASD. Swing: square / left click. Place: triangle / right click. Talk or use: circle / F. Hotbar: L1 R1 / 1-8. Jump: cross / Space.">
<meta name="hub:session-minutes" content="3">`;
const boot = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#0a0620;color:#c8c0e8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><b style="color:#ffd36a;font-size:16px;letter-spacing:.08em">DRAGON QUILT BUILDERS</b><span>Unrolling the quilt...</span></div>`;
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>
${esc(session)}
</script>
${metas}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Dragon Quilt Builders</title>
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
${boot}
<canvas id="screen"></canvas>
<script>
${esc(rd('engine/my-3d2dge.js'))}
</script>
<script>
${files.map(f => '/* ---- ' + f + ' ---- */\n' + esc(rd('src/' + f))).join('\n')}
</script>
</body>
</html>
`;
writeFileSync(out, html);
// dev page that loads files separately (file://)
mkdirSync(path.join(root, 'dev'), { recursive: true });
writeFileSync(path.join(root, 'dev/index.html'), `<!doctype html><html><head><meta charset="utf-8"><script src="../vendor/aihub/session.js"></script><title>Dragon Quilt Builders (dev)</title><style>html,body{margin:0;height:100%;background:#000}#screen{width:100%;height:100%;display:block;image-rendering:pixelated}</style></head><body><canvas id="screen"></canvas><script src="../engine/my-3d2dge.js"></script>${files.map(f => `<script src="../src/${f}"></script>`).join('')}</body></html>`);
console.log('built', out, (readFileSync(out).length / 1024 | 0) + ' KB');
