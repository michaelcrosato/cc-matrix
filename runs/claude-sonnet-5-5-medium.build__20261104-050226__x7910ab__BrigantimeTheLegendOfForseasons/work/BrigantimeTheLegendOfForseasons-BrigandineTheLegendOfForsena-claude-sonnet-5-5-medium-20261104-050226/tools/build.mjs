// node tools/build.mjs [--sims]   -> dist/game.js (+ dist/index.html); with no flags also writes the single html in the parent folder
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), parent = path.resolve(root, '..');
const NAME = path.basename(root), only = process.argv.includes('--js');
const files = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort();
let body = '';
for (const f of files) { const t = fs.readFileSync(path.join(root, 'src', f), 'utf8'); body += `\n/* ===== ${f} ===== */\n` + t + '\n'; }
const bad = /\b(TODO|FIXME|XXX|placeholder|lorem)\b/i; const hit = body.split('\n').findIndex(l => bad.test(l));
if (hit >= 0) { console.error('BUILD FAILED: forbidden word on line ' + hit + ': ' + body.split('\n')[hit]); process.exit(1); }
const game = `(() => {\n'use strict';\nconst E = My3D2dge, G = {};\n${body}\n})();\n`;
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/game.js'), game);
const meta = fs.readFileSync(path.join(root, 'src-html/head.html'), 'utf8');
const dev = `<!doctype html><html lang="en"><head><meta charset="utf-8">${meta}</head><body><canvas id="screen"></canvas><script src="../engine/my-3d2dge.js"></script><script src="game.js"></script></body></html>`;
fs.writeFileSync(path.join(root, 'dist/index.html'), dev);
if (only) { console.log('built dist/game.js ' + (game.length / 1024 | 0) + ' KB'); process.exit(0); }
import vm from 'node:vm';
let splash = ''; try { const c = { console, performance: { now: () => 0 } }; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(root, 'engine/my-3d2dge.js'), 'utf8'), c); splash = c.My3D2dge.bootSplash ? c.My3D2dge.bootSplash('BRIGANTIME') : ''; } catch (e) { splash = ''; }
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const session = esc(fs.readFileSync(path.join(root, 'vendor/hub/session.js'), 'utf8'));
const engine = esc(fs.readFileSync(path.join(root, 'engine/my-3d2dge.js'), 'utf8'));
const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<script>${session}</script>\n${meta}\n</head><body>\n${splash}\n<canvas id="screen"></canvas>\n<script>${engine}</script>\n<script>${esc(game)}</script>\n</body></html>\n`;
const out = path.join(parent, NAME + '.html'); fs.writeFileSync(out, html);
console.log('built ' + path.basename(out) + ' ' + (html.length / 1024 | 0) + ' KB');
