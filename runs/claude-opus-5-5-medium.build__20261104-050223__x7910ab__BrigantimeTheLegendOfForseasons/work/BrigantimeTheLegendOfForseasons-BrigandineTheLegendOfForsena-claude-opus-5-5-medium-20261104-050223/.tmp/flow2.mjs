import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console: { log() {}, info() {}, warn() {}, error() {} }, addEventListener() {}, location: { hash: '', search: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });
const E = ctx.My3D2dge, game = E.current, G = ctx.__G, I = game.input;
game.advance(.5); G.newCampaign({ realms: ['verdance'], seed: 3 }); game.advance(1);
for (let i = 0; i < 300; i++) { const fl = G.run.flow.map(s => s.k + (s.id ? ':' + s.id : '')).join(','); console.log(game.sceneName, G.eventScene && G.eventScene.id, G.eventScene && G.eventScene.i, G.eventScene && G.eventScene.talk.open, G.eventScene && G.eventScene.done, '|', fl, game.errors.length); I.tap('confirm'); game.advance(.3); if (game.sceneName === 'battle') { console.log('BATTLE'); break; } if (G.run.flow[0] && G.run.flow[0].k === 'muster') break; }
