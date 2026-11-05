// Bundles the game into one HTML file (the engine, the AI Hub client unmodified, and src/*.js in name order), and writes
// dev/index.html, which loads the same files one by one for debugging. Run from the dev folder: node tools/build.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || path.resolve(here, '..', 'DragonCrateBuilders-DragonQuestBuilders-claude-haiku-5-5-medium-20261103-221326.html');
const srcFiles = readdirSync(path.join(here, 'src')).filter(f => f.endsWith('.js')).sort();
const engine = readFileSync(path.join(here, 'engine', 'my-3d2dge.js'), 'utf8');
const session = readFileSync(path.join(here, 'vendor', 'aihub', 'session.js'), 'utf8');
const game = srcFiles.map(f => readFileSync(path.join(here, 'src', f), 'utf8')).join('\n');
for (const [name, code] of [['engine', engine], ['session', session], ['game', game]]) {
  if (code.includes('</script')) throw new Error(name + ' contains a closing script tag');
}
const head = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>
${session}
</script>
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Build one town together for three minutes: break, craft, build and fight. Each builder scores for what they make and mend.">
<meta name="hub:session-howto" content="Left stick or WASD to walk. Square or J to break and strike. Circle or E to place. Triangle or F to use and talk. Cross or Space to jump. Mouse also aims and clicks.">
<meta name="hub:session-minutes" content="3">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${'Dragon Crate Builders'}</title>
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
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
writeFileSync(out, head);
const devHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script src="../vendor/aihub/session.js"></script>
<title>Dragon Crate Builders (dev)</title>
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<canvas id="screen"></canvas>
<script src="../engine/my-3d2dge.js"></script>
${srcFiles.map(f => `<script src="../src/${f}"></script>`).join('\n')}
</body>
</html>
`;
writeFileSync(path.join(here, 'dev', 'index.html'), devHtml);
console.log('built ' + path.basename(out) + ' (' + Math.round(head.length / 1024) + ' KB), ' + srcFiles.length + ' modules');
