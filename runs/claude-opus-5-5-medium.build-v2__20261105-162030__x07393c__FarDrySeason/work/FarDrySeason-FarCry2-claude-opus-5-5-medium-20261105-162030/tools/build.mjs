// Bundle game + engine into the single HTML file the brief names, beside the dev folder.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
process.chdir(root);
const OUT = resolve(root, '..', `${basename(root)}.html`);
const title = /GAME_TITLE = '([^']+)'/.exec(readFileSync('src/content/title.js', 'utf8'))[1];
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
<link rel="icon" href="data:,">
<title>${title}</title>
<style>html,body{margin:0;height:100%;background:#0d0b14}#app{position:fixed;inset:0}</style>
</head><body><div id="app"></div><script type="module">%BUNDLE%</script></body></html>
`;
const js = execFileSync('esbuild', ['src/main.js', '--bundle', '--format=esm', '--target=esnext', '--legal-comments=inline', '--log-level=warning'], { maxBuffer: 1 << 29 }).toString();
const session = readFileSync('vendor/session.js', 'utf8');
const credits = readFileSync('CREDITS.md', 'utf8');
const licences = credits.slice(Math.max(0, credits.search(/three\.js/i))).replace(/--/g, '- -');
const html = TEMPLATE.replace('%SESSION%', () => session.replace(/<\/script/gi, '<\\/script')).replace('%BUNDLE%', () => js.replace(/<\/script/gi, '<\\/script'))
  + `<!--\nLicences (Pixel Engine MIT; three.js MIT; Rapier Apache-2.0), from the kit's CREDITS.md:\n${licences}\n-->\n`;
writeFileSync(OUT, html);
// The dev page: the same head, loading the modules (needs a local server: modules don't load from file://).
writeFileSync('index.html', TEMPLATE.replace('<script>%SESSION%</script>', '<script src="vendor/session.js"></script>').replace('<script type="module">%BUNDLE%</script>', '<script type="module" src="src/main.js"></script>'));
console.log(`${OUT.split('/').pop()}: ${(html.length / 1048576).toFixed(1)} MB`);
