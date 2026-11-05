// Bundles the engine, the AI Hub client and the game's modules into the single HTML file in the work folder's root.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, '..');
const NAME = 'Walter-Whitewash-BreakingBad-claude-sonnet-5-5-medium-20261102-183711';
const rd = f => readFileSync(resolve(here, f), 'utf8');
const safe = s => s.replace(/<\/script/gi, '<\\/script');
export const gameParts = ['src/g1-core.js', 'src/g2-world.js', 'src/g3-play.js', 'src/g4-loop.js', 'src/g5-scenes.js'];
export const gameJs = () => '(() => {\n"use strict";\n' + gameParts.map(rd).join('\n') + '\n})();\n';
export const scripts = () => ({ engine: rd('vendor/engine/my-3d2dge.js'), session: rd('vendor/hub/session.js'), rules: rd('src/00-rules.js'), world: rd('src/10-world.js'), audio: rd('src/20-audio.js'), game: gameJs() });
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const s = scripts();
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>
${safe(s.session)}
</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Walter Whitewash</title>
<meta name="description" content="Walter Whitewash: cook, sell, launder, and don't get caught. A spiritual successor to Breaking Bad (2008-2013).">
<meta name="theme-color" content="#0e1612">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1-4">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="5">
<meta name="hub:session-goal" content="Make the most clean cash: cook, sell and launder before time is up">
<meta name="hub:session-howto" content="Move: left stick or WASD · aim: right stick or mouse · interact: Cross or E · attack: Square or J or click · dodge: Circle or Space · switch weapon: Triangle or Q">
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05100a;color:#a9c8a9;font:14px/1.5 ui-monospace,Menlo,Consolas,monospace"><b style="color:#f4f0e0;font-size:20px;letter-spacing:.08em">WALTER WHITEWASH</b><span>Mixing the reagents...</span></div>
<canvas id="screen"></canvas>
<script>
${safe(s.engine)}
</script>
<script>
${safe(s.rules)}
${safe(s.world)}
${safe(s.audio)}
</script>
<script>
${safe(s.game)}
</script>
</body>
</html>
`;
  writeFileSync(resolve(root, NAME + '.html'), html);
  console.log('wrote', NAME + '.html', (html.length / 1024 / 1024).toFixed(2) + ' MB');
}
