import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console: { log() {}, info() {}, warn() {}, error() {} }, addEventListener() {}, location: { hash: '#event/' + (process.argv[2] || 'open_verdance'), search: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });
const E = ctx.My3D2dge, game = E.current, G = ctx.__G, I = game.input; game.advance(1);
for (let i = 0; i < 40; i++) { const s = G.eventScene; console.log(game.sceneName, s && s.i, s && s.talk.open, s && s.talk.typing, s && s.talk.shown, s && s.talk.pageLen, s && JSON.stringify(s.talk.choices)); I.tap('confirm'); game.advance(.4); if (game.sceneName !== 'event') { console.log('LEFT to', game.sceneName); break; } }
