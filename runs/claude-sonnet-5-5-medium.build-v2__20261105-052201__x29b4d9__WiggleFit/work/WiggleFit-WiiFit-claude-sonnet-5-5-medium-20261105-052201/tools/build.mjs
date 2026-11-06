import { build } from 'esbuild';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { TITLE, FILE } from '../src/data/config.js';
const OUT = new URL(`../../${FILE}.html`, import.meta.url).pathname;
const session = readFileSync('vendor/session.js', 'utf8').replace(/\r\n/g, '\n');
const END = "})(typeof window !== 'undefined' ? window : globalThis);";
const hash = createHash('sha256').update(session.slice(session.indexOf('/*! aihub-session '), session.indexOf(END) + END.length)).digest('hex');
if (hash !== '529eac78c54cfff0e60d375a9c63f66d1a594327ddcc262a2bdf9b1f2fb6582a') throw new Error('not the released hub client: ' + hash);
// exit-interview -> about.js (single source of truth)
const ei = new URL('../../exit-interview.json', import.meta.url).pathname;
if (existsSync(ei)) writeFileSync('src/data/about.json', readFileSync(ei, 'utf8'));
const r = await build({ entryPoints: ['src/main.js'], bundle: true, format: 'iife', target: 'es2022', minify: true, write: false, legalComments: 'none', loader: { '.css': 'text', '.json': 'json' }, define: { 'process.env.NODE_ENV': '"production"' } });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const font = (w) => readFileSync(`node_modules/@fontsource/fredoka/files/fredoka-latin-${w}-normal.woff2`).toString('base64');
const css = readFileSync('src/ui/ui.css', 'utf8');
const METAS = [
  ['hub:session', '1'], ['hub:session-players', '1-4'], ['hub:session-mode', 'ghost'], ['hub:session-minutes', '3'],
  ['hub:session-goal', 'Stay balanced through the class: highest score wins'],
  ['hub:session-howto', 'Lean: stick, WASD or mouse. Feet: L2 R2, Q E or clicks. Flail: Square or F'],
  ['hub:type', 'Game'], ['hub:players', '1-4'], ['hub:source', 'Wii Fit'],
].map(([n, c]) => `<meta name="${n}" content="${c}">`).join('');
const fonts = [400, 500, 600, 700].filter((w) => existsSync(`node_modules/@fontsource/fredoka/files/fredoka-latin-${w}-normal.woff2`)).map((w) => `@font-face{font-family:'Fredoka';font-weight:${w};src:url(data:font/woff2;base64,${font(w)}) format('woff2')}`).join('');
writeFileSync(OUT, ['<!doctype html><html lang="en"><head><meta charset="utf-8"><script>', session, '</script>', METAS,
  `<meta name="viewport" content="width=device-width,initial-scale=1"><title>${TITLE}</title><style>${fonts}${css}</style></head><body>`,
  '<script>', js, '</script></body></html>'].join(''));
console.log('built', OUT, (readFileSync(OUT).length / 1e6).toFixed(2) + ' MB');
