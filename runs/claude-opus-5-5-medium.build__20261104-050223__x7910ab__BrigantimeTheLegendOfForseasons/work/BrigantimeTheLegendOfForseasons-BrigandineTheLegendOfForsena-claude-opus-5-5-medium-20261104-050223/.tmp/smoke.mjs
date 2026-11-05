import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const errs = []; const ctx = { console: { log() {}, info() {}, warn() {}, error: (...a) => errs.push(a.join(' ')) }, addEventListener() {}, location: { hash: process.argv[2] || '', search: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });
const E = ctx.My3D2dge, game = E.current, G = ctx.__G, I = game.input;
const snap = () => game.debug.snapshot();
game.advance(1);
console.log('scene', snap().scene, 'errors', game.errors.map(e => e.message + ' ' + (e.stack||'').split('\n')[1]).slice(0,3), errs.slice(0,3));
