import { build } from 'esbuild'; import { readFileSync, writeFileSync, existsSync } from 'node:fs'; import { createHash } from 'node:crypto'; import { dirname, join } from 'node:path'; import { fileURLToPath } from 'node:url';
const here = dirname(dirname(fileURLToPath(import.meta.url))); process.chdir(here);
const NAME = here.split('/').pop(); const OUT = join(here, '..', `${NAME}.html`); const EXIT = join(here, '..', 'exit-interview.json');
const session = readFileSync('vendor/session.js', 'utf8').replace(/\r\n/g, '\n');
const END = "})(typeof window !== 'undefined' ? window : globalThis);";
const hash = createHash('sha256').update(session.slice(session.indexOf('/*! aihub-session '), session.indexOf(END) + END.length)).digest('hex');
if (hash !== '529eac78c54cfff0e60d375a9c63f66d1a594327ddcc262a2bdf9b1f2fb6582a') throw new Error('not the released hub client');
// One source of truth: the exit-interview file feeds the About screen.
const exit = existsSync(EXIT) ? readFileSync(EXIT, 'utf8') : 'null'; JSON.parse(exit);
writeFileSync('src/data/about.js', `// Written by tools/build.mjs from exit-interview.json.\nexport const EXIT = ${exit.trim()};\nexport const SOURCE = 'Wii Fit';\n`);
const title = /TITLE = '([^']+)'/.exec(readFileSync('src/data/config.js', 'utf8'))[1];
const r = await build({ entryPoints: ['src/main.js'], bundle: true, format: 'iife', target: 'es2022', minify: true, write: false, legalComments: 'none', loader: { '.css': 'text' }, logLevel: 'warning', keepNames: false });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const font = (w) => readFileSync(`node_modules/@fontsource/fredoka/files/fredoka-latin-${w}-normal.woff2`).toString('base64');
const face = (w) => `@font-face{font-family:Fredoka;font-weight:${w};font-display:swap;src:url(data:font/woff2;base64,${font(w)}) format("woff2")}`;
const metas = [['hub:session', '1'], ['hub:session-players', '1-4'], ['hub:session-mode', 'ghost'], ['hub:session-minutes', '3'], ['hub:session-goal', 'Stay balanced through the class: highest score wins'], ['hub:session-howto', 'Lean: stick, WASD or mouse. Feet: L2 R2, Q E or clicks. Flail: Square or F'], ['hub:type', 'Game'], ['hub:players', '1-4'], ['hub:source', 'Wii Fit']].map(([n, c]) => `<meta name="${n}" content="${c}">`).join('');
writeFileSync(OUT, ['<!doctype html><html lang="en"><head><meta charset="utf-8"><script>', session, '</script>', metas, `<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>`, face(500), face(600), face(700), '</style></head><body>', '<script>', js, '</script></body></html>'].join(''));
console.log(`built ${(js.length / 1e6).toFixed(2)} MB`);
