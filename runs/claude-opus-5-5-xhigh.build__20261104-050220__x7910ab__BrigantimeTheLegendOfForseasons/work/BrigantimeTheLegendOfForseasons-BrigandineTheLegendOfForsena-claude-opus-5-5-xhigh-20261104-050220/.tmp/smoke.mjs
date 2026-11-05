import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const D = process.cwd(), hash = process.argv[2] || '';
const ctx = { console: { log() {}, info() {}, warn: (...a) => console.log('WARN', ...a), error: console.error }, addEventListener() {}, location: { hash } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(D + '/' + f, 'utf8'), ctx, { filename: f });
const E = ctx.My3D2dge, game = E.current;
await game.booted;
game.advance(1);
console.log(JSON.stringify(game.debug.snapshot()).slice(0, 600));
console.log('errors', game.errors.map(e => (e.message || e) + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
