// concatenates src/*.js into one IIFE (build/game.js), writes build/index.html (dev page) and the single-file deliverable
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';
const root = new URL('../', import.meta.url).pathname;
const name = basename(resolve(root));
mkdirSync(root + 'build', { recursive: true });
const files = readdirSync(root + 'src').filter(f => f.endsWith('.js')).sort();
const body = files.map(f => `/* ===== ${f} ===== */\n` + readFileSync(root + 'src/' + f, 'utf8')).join('\n');
const game = `(() => {\n${body}\n})();\n`;
writeFileSync(root + 'build/game.js', game);
const engine = readFileSync(root + 'engine/my-3d2dge.js', 'utf8');
const session = readFileSync(root + 'vendor/session.js', 'utf8');
const head = readFileSync(root + 'src/head.html', 'utf8');
const html = (inline) => `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n${inline ? '<script>\n' + session + '\n</script>' : '<script src="../vendor/session.js"></script>'}\n${head}\n</head>\n<body>\n<canvas id="screen"></canvas>\n${inline ? '<script>\n' + engine + '\n</script>\n<script>\n' + game + '\n</script>' : '<script src="../engine/my-3d2dge.js"></script>\n<script src="game.js"></script>'}\n</body>\n</html>\n`;
writeFileSync(root + 'build/index.html', html(false));
const out = resolve(root, '..', name + '.html');
writeFileSync(out, html(true));
console.log('built', files.length, 'files,', (game.length / 1024 | 0) + ' KB game,', (html(true).length / 1024 | 0) + ' KB page ->', out);
