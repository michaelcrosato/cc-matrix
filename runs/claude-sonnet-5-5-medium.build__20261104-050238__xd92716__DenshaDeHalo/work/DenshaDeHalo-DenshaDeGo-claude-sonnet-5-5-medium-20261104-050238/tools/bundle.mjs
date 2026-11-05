// builds the single-file game: node tools/bundle.mjs   ->  ../<name>.html (session.js first in <head>, then the engine, then src/*.js in index.html order)
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
const root = new URL('../', import.meta.url).pathname, name = basename(resolve(root));
const html = readFileSync(root + 'index.html', 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const inline = f => '<script>\n' + readFileSync(root + f, 'utf8').replace(/<\/script/gi, '<\\/script') + '\n</script>';
let out = html;
for (const f of scripts) out = out.replace('<script src="' + f + '"></script>', () => inline(f));
out = out.replace('<title>Densha de Halo!</title>', '<title>Densha de Halo! (' + name + ')</title>');
writeFileSync(resolve(root, '..', name + '.html'), out);
console.log('wrote', name + '.html', (out.length / 1024 / 1024).toFixed(2) + ' MB');
