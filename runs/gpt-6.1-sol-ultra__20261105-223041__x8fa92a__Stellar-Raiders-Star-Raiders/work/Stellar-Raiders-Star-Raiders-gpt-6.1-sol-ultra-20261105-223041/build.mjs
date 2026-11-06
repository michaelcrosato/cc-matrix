import { build } from 'esbuild';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const filename = 'Stellar-Raiders-Star-Raiders-gpt-6.1-sol-ultra-20261105-223041.html';
const read = (name) => readFile(join(directory, name), 'utf8');
const jsonForHTML = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');
const [markup, css, session, metadataText] = await Promise.all([
  read('ui.html'), read('ui.css'), read('hub-session.js'), read('metadata.json'),
]);
const metadata = JSON.parse(metadataText);
const body = markup.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? markup;
if (/<\/script/i.test(session)) throw new Error('The unmodified Hub client unexpectedly contains an HTML closing script tag.');
if (/<\/style/i.test(css)) throw new Error('UI stylesheet contains an HTML closing style tag.');

const result = await build({
  absWorkingDir: directory,
  entryPoints: ['main.js'],
  bundle: true,
  write: false,
  platform: 'browser',
  format: 'esm',
  target: ['es2022'],
  minify: false,
  treeShaking: true,
  legalComments: 'inline',
  external: ['three', 'three/webgpu', 'three/tsl', '@dimforge/rapier3d-compat'],
  logLevel: 'silent',
});
const javascript = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const imports = {
  three: 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.webgpu.js',
  'three/webgpu': 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.webgpu.js',
  'three/tsl': 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.tsl.js',
  '@dimforge/rapier3d-compat': 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.19.3/+esm',
};
const favicon = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22%3E%3Crect width=%2264%22 height=%2264%22 rx=%2214%22 fill=%22%230c1726%22/%3E%3Cpath d=%22M32 6L40 24L58 32L40 40L32 58L24 40L6 32L24 24Z%22 fill=%22%23ffcd75%22 stroke=%22%23060810%22 stroke-width=%223%22/%3E%3C/svg%3E';
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>${session}</script>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0c1726">
<meta name="description" content="An ink-drawn cockpit space adventure. Defend the frontier, hunt the raider fleet, and bring your ship home.">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-goal" content="Stop the incursion. Destroy the raider fleet and its flagship; score command points while keeping the frontier starbases alive.">
<meta name="hub:session-howto" content="Stick / mouse: steer. R2 / left click: fire. R1 / R / right click: torpedo. Circle / H: context. L1 / E: shields. Triangle / M: sector map. Options / Esc: pause.">
<meta name="hub:session-minutes" content="8">
<title>Stellar Raiders</title>
<link rel="icon" href="${favicon}">
<script type="importmap">${jsonForHTML({ imports })}</script>
<style>${css}</style>
</head>
<body>
${body}
<script type="application/json" id="creditsData">${jsonForHTML(metadata)}</script>
<script type="module">
${javascript}
</script>
</body>
</html>
`;
const temporary = join(directory, '.game-build.html');
await writeFile(temporary, html);
await rename(temporary, join(directory, 'game.html'));
await writeFile(resolve(directory, '..', filename), html);
console.log(`Built Stellar Raiders · ${Math.round(Buffer.byteLength(html) / 1024)} KiB · one HTML file`);
