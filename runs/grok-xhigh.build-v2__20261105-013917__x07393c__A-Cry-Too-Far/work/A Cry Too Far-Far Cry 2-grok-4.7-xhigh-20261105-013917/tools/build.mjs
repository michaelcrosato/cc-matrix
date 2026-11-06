/** Pack one HTML file that boots from file://. Run from the dev folder: node tools/build.mjs */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dev = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(dirname(dev), 'A Cry Too Far-Far Cry 2-grok-4.7-xhigh-20261105-013917.html');

const js = execFileSync('esbuild', [
  'src/main.js',
  '--bundle',
  '--format=esm',
  '--target=esnext',
  '--legal-comments=inline',
  '--log-level=warning',
], { cwd: dev, maxBuffer: 1 << 29 }).toString();

const session = readFileSync(join(dev, 'vendor', 'session.js'), 'utf8');
const hide = (text) => text.replace(/<\/script/gi, '<\\/script');

const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<script>${hide(session)}</script>
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="6">
<meta name="hub:webgpu" content="required">
<meta name="hub:session-goal" content="Carry the most diamond cases out of the burning mine">
<meta name="hub:session-howto" content="Stick/WASD move, R2/mouse fire, Square/E use, carry cases to the truck">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>A Cry Too Far</title>
</head><body><div id="app"></div><script type="module">${hide(js)}</script></body></html>
`;

const credits = readFileSync(join(dev, 'CREDITS.md'), 'utf8').replace(/-->/g, '--&gt;');
writeFileSync(OUT, html + '\n<!--\n' + credits + '\n-->\n');
console.log('wrote ' + OUT + ' ' + (html.length + credits.length) + ' chars');
