// Writes dev/index.html from manifest.json: the hub client first, the engine, then the game's src files one by one.
import { readFileSync, writeFileSync } from 'node:fs';
const m = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
const tags = [m.hub, m.engine, ...m.src].map(f => `<script src="../${f}"></script>`).join('\n');
writeFileSync(new URL('../dev/index.html', import.meta.url), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Operation Wolfpack</title>
<style>html,body{margin:0;height:100%;background:#141a0c;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}</style>
</head>
<body>
<canvas id="screen"></canvas>
${tags}
</body>
</html>
`);
