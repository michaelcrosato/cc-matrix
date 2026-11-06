import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(root, '..', 'Level Best-Wii Fit-grok-4.7-xhigh-20261104-231317.html');
const EXPECTED = '529eac78c54cfff0e60d375a9c63f66d1a594327ddcc262a2bdf9b1f2fb6582a';

const METAS = [
  ['hub:session', '1'],
  ['hub:session-players', '1-4'],
  ['hub:session-mode', 'ghost'],
  ['hub:session-minutes', '3'],
  ['hub:session-goal', 'Stay balanced through the class: highest score wins'],
  ['hub:session-howto', 'Lean: stick, WASD or mouse. Feet: L2 R2, Q E or clicks. Flail: Square or F'],
  ['hub:session-type', 'Game'],
  ['hub:session-source', 'Wii Fit'],
].map(([name, content]) => `<meta name="${name}" content="${content}">`).join('');

function sessionSource() {
  const session = readFileSync(path.join(root, 'vendor/session.js'), 'utf8').replace(/\r\n/g, '\n');
  const END = "})(typeof window !== 'undefined' ? window : globalThis);";
  const start = session.indexOf('/*! aihub-session ');
  const hash = createHash('sha256').update(session.slice(start, session.indexOf(END) + END.length)).digest('hex');
  if (hash !== EXPECTED) throw new Error(`not the released hub client (${hash})`);
  return session;
}

function writeAbout() {
  const json = readFileSync(path.resolve(root, '..', 'exit-interview.json'), 'utf8');
  const about = `/** Filled from exit-interview.json by the build. Keep the two copies the same. */\nexport const ABOUT = ${JSON.stringify(JSON.parse(json), null, 2)};\n`;
  writeFileSync(path.join(root, 'src/data/about.js'), about);
}

export async function buildGame() {
  writeAbout();
  const session = sessionSource();
  const result = await build({
    absWorkingDir: root,
    entryPoints: ['src/main.js'],
    bundle: true,
    format: 'iife',
    target: 'es2022',
    minify: true,
    legalComments: 'none',
    write: false,
    plugins: [{
      name: 'three-one-copy',
      setup(b) {
        const webgpu = path.join(root, 'node_modules/three/build/three.webgpu.js');
        const tsl = path.join(root, 'node_modules/three/build/three.tsl.js');
        const addons = path.join(root, 'node_modules/three/examples/jsm');
        b.onResolve({ filter: /^three$/ }, () => ({ path: webgpu }));
        b.onResolve({ filter: /^three\/webgpu$/ }, () => ({ path: webgpu }));
        b.onResolve({ filter: /^three\/tsl$/ }, () => ({ path: tsl }));
        b.onResolve({ filter: /^three\/addons\// }, (args) => ({
          path: path.join(addons, args.path.slice('three/addons/'.length)),
        }));
      },
    }, {
      name: 'rapier-wasm',
      setup(b) {
        b.onLoad({ filter: /rapier\.mjs$/ }, async (args) => {
          let text = readFileSync(args.path, 'utf8');
          text = text.replace(
            /new URL\(\s*["']rapier_wasm3d_bg\.wasm["']\s*,\s*import\.meta\.url\s*\)/g,
            'globalThis.__LEVEL_BEST_WASM__',
          );
          return { contents: text, loader: 'js' };
        });
      },
    }],
  });
  const js = result.outputFiles[0].text
    .replace(/https?:\/\/(?!www\.w3\.org)[^\s"'\\)]+/g, '')
    .replace(/<\/script/gi, '<\\/script');
  const font = (weight) => readFileSync(path.join(root, `node_modules/@fontsource/fredoka/files/fredoka-latin-${weight}-normal.woff2`)).toString('base64');
  const faces = [400, 500, 700].map((weight) => (
    `@font-face{font-family:Fredoka;font-style:normal;font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${font(weight)}) format("woff2");}`
  )).join('');
  const wasm = readFileSync(path.join(root, 'node_modules/@dimforge/rapier3d-compat/rapier_wasm3d_bg.wasm')).toString('base64');
  const html = [
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><script>',
    session,
    '</script>',
    METAS,
    '<title>Level Best</title><style>',
    faces,
    'html,body{margin:0;height:100%;background:#8FB4E0;overflow:hidden}canvas{position:fixed;inset:0;width:100%;height:100%;display:block}',
    '</style></head><body><script>window.__LEVEL_BEST_WASM__=Uint8Array.from(atob("',
    wasm,
    '"),c=>c.charCodeAt(0));</script><script>',
    js,
    '</script></body></html>',
  ].join('');
  writeFileSync(OUT, html);
  return OUT;
}

if (process.argv[1] && process.argv[1].endsWith('build.mjs')) {
  const out = await buildGame();
  console.log(out);
}
