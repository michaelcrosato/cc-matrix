// loads engine + src files in a vm and runs a snippet (argv[2]) with game made headless
import vm from 'node:vm'; import { readFileSync, readdirSync } from 'node:fs';
const ctx = { console, addEventListener() {}, location: { hash: '' }, setTimeout, clearTimeout };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync('engine/my-3d2dge.js', 'utf8'), ctx);
const files = readdirSync('src').filter(f => f.endsWith('.js') && f < (process.env.UPTO || '99')).sort();
const pre = process.env.UPTO ? "const game = new E.Game({ headless: true, res: 'ps1', input: KEYS });\n" : '';
const body = files.map(f => readFileSync('src/' + f, 'utf8')).join('\n');
const code = "(() => { 'use strict'; const CREDITS = " + readFileSync('src/credits.json', 'utf8') + ";\n" + body + "\n" + pre + (process.argv[2] || '') + "\n})();";
vm.runInContext(code, ctx, { filename: 'game.js' });
