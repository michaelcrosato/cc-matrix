import { build } from 'esbuild';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aboutFromInterview } from './about.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const dev = resolve(here, '..');
process.chdir(dev);
const root = resolve(dev, '..');
const STEM = basename(dev);
export const OUT = join(root, `${STEM}.html`);
const INTERVIEW = join(root, 'exit-interview.json');

// One source of truth for the About screen: the exit interview, when it exists.
writeFileSync('src/data/about.js', aboutFromInterview(existsSync(INTERVIEW) ? JSON.parse(readFileSync(INTERVIEW, 'utf8')) : null));

const session = readFileSync('vendor/session.js', 'utf8').replace(/\r\n/g, '\n');
const END = "})(typeof window !== 'undefined' ? window : globalThis);";
const hash = createHash('sha256').update(session.slice(session.indexOf('/*! aihub-session '), session.indexOf(END) + END.length)).digest('hex');
if (hash !== '529eac78c54cfff0e60d375a9c63f66d1a594327ddcc262a2bdf9b1f2fb6582a') throw new Error('not the released hub client');
const r = await build({ entryPoints: ['src/main.js'], bundle: true, format: 'iife', target: 'es2022', minify: true, write: false, legalComments: 'none', loader: { '.css': 'text' }, logLevel: 'warning' });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const font = (w) => readFileSync(`node_modules/@fontsource/fredoka/files/fredoka-latin-${w}-normal.woff2`).toString('base64');
const faces = [400, 500, 600, 700].map((w) => `@font-face{font-family:Fredoka;font-style:normal;font-weight:${w};font-display:block;src:url(data:font/woff2;base64,${font(w)}) format('woff2')}`).join('');
const cfg = readFileSync('src/data/config.js', 'utf8');
const TITLE = cfg.match(/TITLE = '([^']+)'/)[1];
const HOWTO = cfg.match(/HOWTO = '([^']+)'/)[1];
const GOAL = cfg.match(/GOAL = '([^']+)'/)[1];
const METAS = [
  ['hub:session', '1'], ['hub:session-players', '1-4'], ['hub:session-mode', 'ghost'], ['hub:session-minutes', '3'],
  ['hub:session-goal', GOAL], ['hub:session-howto', HOWTO], ['hub:type', 'Game'], ['hub:players', '1-4'], ['hub:source', 'Wii Fit'],
].map(([n, c]) => `<meta name="${n}" content="${c}">`).join('');
writeFileSync(OUT, ['<!doctype html><html lang="en"><head><meta charset="utf-8"><script>', session, '</script>',
  METAS, '<meta name="viewport" content="width=device-width,initial-scale=1">', `<title>${TITLE}</title><style>${faces}</style></head><body>`,
  '<script>', js, '</script></body></html>'].join(''));
if (process.argv.includes('-v')) console.log(`built ${OUT} ${(readFileSync(OUT).length / 1e6).toFixed(2)} MB`);
