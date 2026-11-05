// Bundles the game into one html file and writes exit-interview.json beside it.
// Usage: node tools/build.mjs   (run from the dev folder)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEV = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(DEV, '..');                       // the folder the deliverables sit in
const STEM = 'Wiretap-TheWire-claude-haiku-5-5-medium-20261103-125824';
const OUT_HTML = join(ROOT, STEM + '.html');
const OUT_JSON = join(ROOT, 'exit-interview.json');

const read = p => readFileSync(join(DEV, p), 'utf8');
const session = read('vendor/aihub-session.js');
const engine = read('engine/my-3d2dge.js');
const css = read('src/ui.css');
const credits = JSON.parse(read('src/credits.json'));    // throws on bad JSON
const srcFiles = readdirSync(join(DEV, 'src')).filter(f => f.endsWith('.js')).sort();
const game = srcFiles.map(f => `// ---- ${f}\n` + read('src/' + f)).join('\n');

const exitInterview = credits.exitInterview;
const json = JSON.stringify(exitInterview, null, 2) + '\n';
JSON.parse(json);                                         // must parse back
writeFileSync(OUT_JSON, json);

const gameSrc = `(() => {\n'use strict';\nconst CREDITS = ${JSON.stringify(credits.about)};\n${game}\n})();`;
// the closing tag inside an inlined script would end it early: escape it (`<\/script` is the same JS string/code)
const esc = js => js.replace(/<\/script/gi, '<\\/script');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>${esc(session)}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1-4">
<title>WIRETAP</title>
<style>
${css}
</style>
</head>
<body>
<canvas id="screen"></canvas>
<div id="ui"></div>
<script>${esc(engine)}</script>
<script>${esc(gameSrc)}</script>
</body>
</html>
`;
writeFileSync(OUT_HTML, html);
console.log(`wrote ${OUT_HTML} (${(html.length / 1e6).toFixed(2)} MB)`);
console.log(`wrote ${OUT_JSON} (parsed back OK)`);
