import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console: { log() {}, info() {}, warn() {}, error() {} }, addEventListener() {}, location: { hash: '#muster/solmark', search: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });
const E = ctx.My3D2dge, game = E.current, G = ctx.__G, I = game.input; game.advance(1);
const C = G.scenes.campaign; C.focus = 'brazenhold';
I.tap('confirm'); game.advance(.2); console.log('panel', C.panel && C.panel.id);
I.tap('down'); game.advance(.2); console.log('after down: list?', JSON.stringify(Object.keys(C.panel)));
