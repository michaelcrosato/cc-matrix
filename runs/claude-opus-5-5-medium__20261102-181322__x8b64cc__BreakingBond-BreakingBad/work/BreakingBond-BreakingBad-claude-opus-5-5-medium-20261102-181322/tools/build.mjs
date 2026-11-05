// Bundles the game: src/*.js in order inside one IIFE -> game.js (dev page), then one self-contained HTML in the run's root.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '..'), out = path.resolve(root, '..');
const NAME = 'BreakingBond-BreakingBad-claude-opus-5-5-medium-20261102-181322';
const src = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => '/* ---- ' + f + ' ---- */\n' + fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
const game = "(() => {\n'use strict';\n" + src + "\n})();\n";
fs.writeFileSync(path.join(root, 'game.js'), game);
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const session = fs.readFileSync(path.join(root, 'vendor', 'session.js'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'vendor', 'my-3d2dge.js'), 'utf8');
const head = (inline) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
${inline ? '<script>\n' + esc(session) + '\n</script>' : '<script src="vendor/session.js"></script>'}
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-goal" content="Cook and sell the most product before time runs out">
<meta name="hub:session-howto" content="Move: left stick or WASD. Use: Cross or E. Cook by following the prompts">
<meta name="hub:session-minutes" content="3">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Breaking Bond: a chemistry teacher, a diagnosis, a change. A spiritual successor to Breaking Bad.">
<title>Breaking Bond · Episode One: Pilot Light</title>
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#0b0806;color:#c8b898;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#f4f0e0;font-size:16px;letter-spacing:.08em">BREAKING BOND</b><span>Starting · my-3D2dge</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#59c8f0;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>
<canvas id="screen"></canvas>
`;
fs.writeFileSync(path.join(root, 'index.html'), head(false) + '<script src="vendor/my-3d2dge.js"></script>\n<script src="game.js"></script>\n</body>\n</html>\n');
fs.writeFileSync(path.join(out, NAME + '.html'), head(true) + '<script>\n' + esc(engine) + '\n</script>\n<script>\n' + esc(game) + '\n</script>\n</body>\n</html>\n');
console.log('built', (fs.statSync(path.join(out, NAME + '.html')).size / 1024).toFixed(0) + ' KB');
