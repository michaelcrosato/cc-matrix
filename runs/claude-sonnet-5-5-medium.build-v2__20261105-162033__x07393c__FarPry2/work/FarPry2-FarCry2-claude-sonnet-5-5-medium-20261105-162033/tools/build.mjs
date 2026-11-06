// Bundles src/main.js + engine into one HTML file beside the dev folder.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const NAME = 'FarPry2-FarCry2-claude-sonnet-5-5-medium-20261105-162033';
const OUT = resolve(root, '..', NAME + '.html');
const TITLE = 'Far Pry 2';
const TEMPLATE = `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<script>%SESSION%</script>
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="6">
<meta name="hub:webgpu" content="required">
<meta name="hub:session-goal" content="Carry the most diamond cases out of the burning mine">
<meta name="hub:session-howto" content="Stick/WASD move, R2/mouse fire, Square/E use, carry cases to the truck">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${TITLE}</title>
</head><body><div id="app"></div><script type="module">%BUNDLE%</script></body></html>
<!--
${readFileSync('CREDITS.md', 'utf8').split('\n').filter((l, i) => i < 4 || i >= 15).join('\n').replace(/--/g, '- -')}
-->
`;
const js = execFileSync('esbuild', ['src/main.js', '--bundle', '--format=esm', '--target=esnext', '--legal-comments=inline', '--log-level=warning'], { maxBuffer: 1 << 29 }).toString();
const session = readFileSync('vendor/session.js', 'utf8');
const html = TEMPLATE.replace('%SESSION%', () => session.replace(/<\/script/gi, '<\\/script')).replace('%BUNDLE%', () => js.replace(/<\/script/gi, '<\\/script'));
writeFileSync(OUT, html);
console.log('wrote', OUT, (html.length / 1e6).toFixed(2) + ' MB');
