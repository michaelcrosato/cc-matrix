import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const THREE_WEBGPU = path.resolve(root, 'node_modules/three/build/three.webgpu.js');
const oneThree = {
  name: 'one-three',
  setup(b) {
    b.onResolve({ filter: /^three$/ }, () => ({ path: THREE_WEBGPU }));
  },
};
const shared = { bundle: true, minify: true, write: false, legalComments: 'none', logLevel: 'error', target: 'es2022' };

const js = (await build({
  ...shared,
  entryPoints: ['src/main.js'],
  format: 'esm',
  platform: 'browser',
  plugins: [oneThree],
})).outputFiles[0].text;

const css = (await build({
  ...shared,
  entryPoints: ['src/ui/ui.css'],
  loader: { '.woff2': 'dataurl' },
})).outputFiles[0].text;

const { GAME_TITLE, TAGLINE, DESCRIPTION } = await import(pathToFileURL(path.resolve(root, 'src/config/identity.js')).href);
const client = readFileSync(path.resolve(root, 'tools/vendor/session.js'), 'utf8').replace(/\r\n/g, '\n').trimEnd();
const about = readFileSync(path.resolve(root, 'src/data/about.json'), 'utf8').trim();
const noCloser = (s) => s.replace(/<\/(script)/gi, '<\\/$1');

const bannerAt = client.indexOf('/*! aihub-session ');
const endMark = '})(typeof window !== \'undefined\' ? window : globalThis);';
const endAt = client.lastIndexOf(endMark);
if (bannerAt < 0 || endAt < 0) throw new Error('session client banner missing');
const slice = client.slice(bannerAt, endAt + endMark.length);
const hash = createHash('sha256').update(slice).digest('hex');
const expect = '529eac78c54cfff0e60d375a9c63f66d1a594327ddcc262a2bdf9b1f2fb6582a';
if (hash !== expect) throw new Error(`session client hash ${hash}`);
if (client.split('/*! aihub-session ').length !== 2) throw new Error('session banner must appear once');

for (const value of [DESCRIPTION, TAGLINE, GAME_TITLE]) {
  if (value.includes('"') || value.includes("'")) throw new Error('catalogue text has a quote');
}

const icon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath fill='%23e8443a' d='M16 28s-10-6.5-10-14a6 6 0 0 1 10-4 6 6 0 0 1 10 4c0 7.5-10 14-10 14z'/%3E%3C/svg%3E";

const html = [
  '<!doctype html>',
  '<html lang="en">',
  '<head>',
  '<meta charset="utf-8">',
  '<script>',
  client,
  '</script>',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  `<title>${GAME_TITLE} — ${TAGLINE}</title>`,
  `<meta name="description" content="${DESCRIPTION}">`,
  '<meta name="theme-color" content="#17707A">',
  `<link rel="icon" href="${icon}">`,
  '<meta name="hub:type" content="Game">',
  '<meta name="hub:players" content="1–4">',
  '<meta name="hub:source" content="Trauma Center: Second Opinion">',
  '<meta name="hub:session" content="1">',
  '<meta name="hub:session-players" content="1-4">',
  '<meta name="hub:session-mode" content="shared-world">',
  '<meta name="hub:session-minutes" content="6">',
  '<meta name="hub:session-goal" content="Keep the patient alive and finish the operation together">',
  '<meta name="hub:session-howto" content="Aim: right stick or mouse · use: R2 or click · tools: left stick or 1-8">',
  '<style>',
  css,
  '</style>',
  '</head>',
  '<body>',
  '<div id="boot">Scrubbing in…<div class="ecg-line"></div></div>',
  '<div id="app" hidden>',
  '<canvas id="view"></canvas>',
  '<div id="ui"></div>',
  '</div>',
  '<script type="application/json" id="about-data">',
  noCloser(about),
  '</script>',
  '<script type="module">',
  noCloser(js),
  '</script>',
  '</body>',
  '</html>',
].join('\n');

if (html.split('/*! aihub-session ').length !== 2) throw new Error('bundled page quotes the session banner');

mkdirSync(path.resolve(root, 'dist'), { recursive: true });
const out = path.resolve(root, 'dist/game.html');
writeFileSync(out, html);
const named = path.resolve(root, '..', `${GAME_TITLE}-Trauma Center: Second Opinion-grok-4.7-xhigh-20261104-231230.html`);
writeFileSync(named, html);
mkdirSync(path.resolve(root, 'tests/hub/site'), { recursive: true });
writeFileSync(path.resolve(root, 'tests/hub/site/game.html'), html);
console.log(`built ${html.length} bytes`);
