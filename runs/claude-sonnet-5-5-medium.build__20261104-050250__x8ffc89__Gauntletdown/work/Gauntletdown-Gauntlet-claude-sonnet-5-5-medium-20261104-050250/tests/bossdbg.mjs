import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console: { log() {}, info() {}, warn() {}, error: console.error }, addEventListener() {}, location: { hash: '', search: '' } };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync('my-3d2dge.js', 'utf8'), ctx); vm.runInContext(readFileSync('game/game.js', 'utf8'), ctx);
const E = ctx.My3D2dge, game = E.current, D = game.debug, A = D.api;
D.RUN.seed = 1234; D.RUN.mode = 'solo'; const w = A.buildWorld(10, { players: 4 }); w.heroes = [0,1,2,3].map(i => A.makeHero(i, i, null)); D.RUN.heroes = w.heroes; A.placeHeroes(w.heroes, w.starts); w.heroes.forEach(h => h.bot = A.makeBot(true));
for (let t = 0; t < 40; t++) { for (let k = 0; k < 120; k++) A.simStep(1/120); const k = w.boss; if (t % 4 === 3) console.log(t, 'king', Math.round(k.hp), k.state, k.phase, Math.round(k.x), Math.round(k.y), '|', w.heroes.map(h => `${h.bot.think}@${Math.round(h.x)},${Math.round(h.y)} tgt=${h.bot.shootAt && (h.bot.shootAt.ch || 'gen')} fire=${h.int.fire}`).join(' ; ')); }
