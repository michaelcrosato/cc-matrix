import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const D = process.cwd();
const src = ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js'].map(f => [f, readFileSync(D + '/' + f, 'utf8')]);
for (const hash of process.argv.slice(2)) {
  const ctx = { console: { log() {}, info() {}, warn() {}, error: () => {} }, addEventListener() {}, location: { hash } }; ctx.window = ctx; vm.createContext(ctx);
  try {
    for (const [f, s] of src) vm.runInContext(s, ctx, { filename: f });
    const game = ctx.My3D2dge.current; await game.booted;
    for (let i = 0; i < 20; i++) { game.advance(.5); if (i % 3 === 0) game.input.tap('confirm'); }
    const sn = game.debug.snapshot();
    console.log(hash.padEnd(28), 'scene', sn.scene, 'phase', sn.phase, sn.battle ? 'bell ' + sn.battle.bell : '', 'errors', game.errors.length, game.errors.slice(0, 2).map(e => (e.message || e) + ' @ ' + ((e.stack || '').split('\n')[1] || '').trim()).join(' || '));
  } catch (e) { console.log(hash, 'THROW', e.stack.split('\n').slice(0, 3).join(' | ')); }
}
