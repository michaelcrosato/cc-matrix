// node build.mjs  -> build/game.js and ../<GameTitle-SOURCE-model-effort-date>.html (single file)
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';
const here = new URL('./', import.meta.url).pathname, dir = basename(resolve(here));
const files = readdirSync(here + 'src').filter(f => /^\d+-.*\.js$/.test(f)).sort();
const game = '(() => {\n\'use strict\';\nconst E = My3D2dge;\n' + files.map(f => `/* ==== ${f} ==== */\n` + readFileSync(here + 'src/' + f, 'utf8')).join('\n') + '\n})();\n';
mkdirSync(here + 'build', { recursive: true }); writeFileSync(here + 'build/game.js', game);
const esc = s => s.replace(/<\/script/gi, '<\\/script');
let page = readFileSync(here + 'page.html', 'utf8');
const session = '<script>' + esc(readFileSync(here + 'vendor/aihub-session.js', 'utf8')) + '</script>';
page = page.replace('/*SESSION*/', () => session).replace('<script>/*ENGINE*/</script>', () => '<script>' + esc(readFileSync(here + 'engine/my-3d2dge.js', 'utf8')) + '</script>').replace('<script>/*GAME*/</script>', () => '<script>' + esc(game) + '</script>');
const out = resolve(here, '..', dir + '.html'); writeFileSync(out, page);
console.log('built', out, (page.length / 1024 / 1024).toFixed(2) + ' MB');
