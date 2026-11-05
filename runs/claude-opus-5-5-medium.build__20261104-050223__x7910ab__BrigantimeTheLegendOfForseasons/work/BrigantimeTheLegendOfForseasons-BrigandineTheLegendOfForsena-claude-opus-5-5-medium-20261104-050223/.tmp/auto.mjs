import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console: { log() {}, info() {}, warn() {}, error() {} }, addEventListener() {}, location: { hash: '', search: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });
const E = ctx.My3D2dge, game = E.current, G = ctx.__G, I = game.input; game.advance(.5);
G.tune.aiPlayerBoost = +(process.argv[3] || 2); G.newCampaign({ realms: [process.argv[2] || 'verdance'], seed: 21 }); G.autoplay = true; game.advance(1);
const t0 = Date.now(); let last = '', scenes = {};
for (let i = 0; i < +(process.argv[4] || 4000); i++) { game.advance(.25); const s = game.debug.snapshot(); scenes[s.scene] = (scenes[s.scene] || 0) + 1; const k = s.scene + ' ' + (s.season || '') + ' ' + s.year; if (k !== last) { last = k; } if (game.errors.length) { console.log('ERR', game.errors.slice(0, 3).map(e => e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 4).join(' | '))); break; } if (s.scene === 'title' && i > 20) { console.log('back to title at', i); break; } }
const s = game.debug.snapshot(); console.log('end', s.scene, s.season, s.year, JSON.stringify(s.over), 'scenes', JSON.stringify(scenes), 'secs', (Date.now() - t0) / 1000);
