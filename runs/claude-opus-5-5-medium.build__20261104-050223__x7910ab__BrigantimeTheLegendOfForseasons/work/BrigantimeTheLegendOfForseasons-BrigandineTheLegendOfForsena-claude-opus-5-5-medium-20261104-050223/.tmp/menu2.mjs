import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console: { log() {}, info() {}, warn() {}, error() {} }, addEventListener() {}, location: { hash: '#muster/solmark', search: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });
const E = ctx.My3D2dge, game = E.current, G = ctx.__G, I = game.input; game.advance(1);
console.log(game.sceneName, game.scene === G.scenes.campaign, G.run.flow.map(f=>f.k), game.errors.map(e=>e.message));
const C = game.scene; C.focus = 'brazenhold'; I.tap('confirm'); game.advance(.2); console.log('panel', C.panel && C.panel.id);
