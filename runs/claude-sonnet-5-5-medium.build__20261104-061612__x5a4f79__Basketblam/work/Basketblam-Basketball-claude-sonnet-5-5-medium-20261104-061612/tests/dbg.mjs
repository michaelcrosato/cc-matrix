import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const here = new URL('../', import.meta.url);
const ctx = { console: { log() {}, info() {}, warn() {}, error: console.error }, addEventListener() {}, location: { hash: '' } };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('engine/my-3d2dge.js', here), 'utf8'), ctx); vm.runInContext(readFileSync(new URL('build/game.js', here), 'utf8'), ctx);
const bb = ctx.__bb, game = bb.game, S = bb.S, I = game.input, E = ctx.My3D2dge;
const step = s => game.advance(s);
// store
E.store.set('bb:x', { a: 1 }); console.log('store', JSON.stringify(E.store.get('bb:x', null)));
// camp move
bb.startCamp(); step(.5); console.log('camp', S.mode, S.match.phase, bb.camp().i, S.players[0].x, S.players[0].y, S.players[0].input ? 'human' : 'cpu');
I.hold('right'); step(1); console.log(S.players[0].x, S.players[0].vx, bb.camp().moved, game.sceneName);
step(2); console.log(S.players[0].x, bb.camp().moved, bb.camp().i, bb.camp().wait);
// overtime
const cfg = { teams: [0, 1], court: 'alley', mode: 'exhibition', humans: { 0: I }, qLen: 10, difficulty: 'Pro', seed: 11 };
game.go('match', { cfg }, { fade: 0 }); step(.05);
const toLive = () => { for (let i = 0; i < 40 && S.match.phase !== 'live'; i++) { I.tap('shoot'); step(.25); } };
toLive(); const M = () => S.match; M().quarter = 4; M().clock = .01; bb.debug.setScore(10, 10); step(1);
console.log('after Q4', M().phase, M().ot, M().breakKind, M().breakT, M().quarter);
for (let k = 0; k < 3; k++) { step(6); console.log('  step6 ->', M().phase, M().quarter, M().ot, M().clock.toFixed(2)); toLive(); console.log('  live?', M().phase); M().clock = .01; step(1); console.log('  after', M().phase, M().ot, M().sudden); }
