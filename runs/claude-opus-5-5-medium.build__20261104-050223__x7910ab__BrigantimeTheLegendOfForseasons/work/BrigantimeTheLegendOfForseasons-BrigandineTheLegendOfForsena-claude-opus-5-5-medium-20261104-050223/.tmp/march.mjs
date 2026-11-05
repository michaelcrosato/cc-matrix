import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console: { log() {}, info() {}, warn() {}, error() {} }, addEventListener() {}, location: { hash: '#muster/solmark', search: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });
const E = ctx.My3D2dge, game = E.current, G = ctx.__G, I = game.input; game.advance(1);
const sim = G.run.sim, S = sim.state; sim.apply({ t: 'endMuster', realm: 'solmark' }); G.run.flow = [{ k: 'march', realm: 'solmark' }, { k: 'resolve' }];
game.advance(.3); const C = game.scene; C.focus = 'lammas'; I.tap('confirm'); game.advance(.2);
console.log('panel', C.panel && C.panel.id, S.phase, S.castles.cinderwall.knights.map(k => [k, sim.canAct(k), S.knights[k].marched]));
I.tap('confirm'); game.advance(.2); I.tap('up'); game.advance(.2); I.tap('confirm'); game.advance(.2); console.log('marches', JSON.stringify(S.marches), C.panel && C.panel.id, game.errors.map(e => e.message));
