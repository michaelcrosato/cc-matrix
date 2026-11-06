// esbuild + inline: writes the one HTML file the brief names, beside this dev folder.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '..', `${basename(ROOT)}.html`);
process.chdir(ROOT);

const { GAME_TITLE } = await import('../src/content/title.js');
const GOAL = 'Carry the most diamond cases out of the burning mine';
const HOWTO = 'Stick/WASD move, R2/mouse fire, Square/E use, carry cases to the truck';

const TEMPLATE = `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<script>%SESSION%</script>
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="6">
<meta name="hub:webgpu" content="required">
<meta name="hub:session-goal" content="${GOAL}">
<meta name="hub:session-howto" content="${HOWTO}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="data:,">
<title>${GAME_TITLE}</title>
<style>html, body { margin: 0; height: 100%; background: #0d0b14; } #app { position: fixed; inset: 0; }</style>
</head><body><div id="app"></div><script type="module">%BUNDLE%</script></body></html>
`;

const js = execFileSync('esbuild', ['src/main.js', '--bundle', '--format=esm', '--target=esnext', '--legal-comments=inline', '--log-level=warning'], { maxBuffer: 1 << 29 }).toString();
const session = readFileSync('vendor/session.js', 'utf8');
const credits = readFileSync('CREDITS.md', 'utf8');
const licences = credits.replace(/--/g, '- -');
const html = TEMPLATE
  .replace('%SESSION%', () => session.replace(/<\/script/gi, '<\\/script'))
  .replace('%BUNDLE%', () => js.replace(/<\/script/gi, '<\\/script'))
  + `<!--\nLicences of what this file carries (the engine kit's CREDITS.md):\n${licences}\n-->\n`;
writeFileSync(OUT, html);
if (process.argv.includes('--verbose')) console.log(`${OUT} ${(statSync(OUT).size / 1048576).toFixed(1)} MB`);
