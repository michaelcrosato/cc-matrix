// Bundles src/ into one ES module and inlines it (plus the About text as a header comment) into a single HTML file.
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { ABOUT_SECTIONS } from './src/about.js';

const NAME = 'Stuffox64-Starfox64-claude-opus-5-5-medium-ultracode-20261020-1915';
const out = await esbuild.build({
  entryPoints: ['src/main.js'], bundle: true, format: 'esm', write: false, target: 'es2022',
  external: ['three', 'three/webgpu', 'three/tsl', 'three/addons/*', '@dimforge/rapier3d-compat'],
  legalComments: 'none',
});
let js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const strip = (h) => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/--/g, '-');
const comment = ['', 'STUFFOX 64: an original spiritual successor to Starfox 64 (N64)', '',
  ...ABOUT_SECTIONS.flatMap((s) => [`== ${s.title} ==`, ...s.items.map((i) => '  ' + strip(i)), '']), ''].join('\n');
let html = fs.readFileSync('index.template.html', 'utf8');
html = html.replace('<!--__ABOUT_COMMENT__-->', `<!--${comment}-->`).replace('/*__BUNDLE__*/', () => js);
const target = path.resolve('..', NAME + '.html');
fs.writeFileSync(target, html);
console.log('wrote', target, (html.length / 1024).toFixed(1) + ' KB');
