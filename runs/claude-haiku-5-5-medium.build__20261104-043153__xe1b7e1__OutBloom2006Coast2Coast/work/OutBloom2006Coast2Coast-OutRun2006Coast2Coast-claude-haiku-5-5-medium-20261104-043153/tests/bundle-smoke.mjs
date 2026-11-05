// Smoke test of the deliverable: runs the root HTML's own inline scripts in a fresh context, then the title is reached.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../../OutBloom2006Coast2Coast-OutRun2006Coast2Coast-claude-haiku-5-5-medium-20261104-043153.html', import.meta.url), 'utf8');
const ctx = { console: { log() {}, info() {}, warn() {}, error() {} }, addEventListener() {}, location: { hash: '' } };
ctx.window = ctx; vm.createContext(ctx);
const scripts = [...html.matchAll(/<script>\n([\s\S]*?)\n<\/script>/g)].map(m => m[1]);
for (const s of scripts) vm.runInContext(s, ctx);
const game = ctx.My3D2dge.current;
game.advance(1);
const snap = game.debug.snapshot();
const ok = snap.scene === 'title' && game.errors.length === 0 && !/<script src=|<link /.test(html);
console.log(ok ? 'bundle smoke ok: title, no errors, ' + scripts.length + ' inline scripts' : 'bundle smoke FAILED: ' + JSON.stringify(snap) + ' errors ' + game.errors.length);
process.exit(ok ? 0 : 1);
