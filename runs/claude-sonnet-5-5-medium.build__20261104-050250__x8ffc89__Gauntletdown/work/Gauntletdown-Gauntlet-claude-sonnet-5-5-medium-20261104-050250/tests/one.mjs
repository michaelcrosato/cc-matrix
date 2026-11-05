import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console: { log() {}, info() {}, warn() {}, error: console.error }, addEventListener() {}, location: { hash: '', search: '' } };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync('my-3d2dge.js', 'utf8'), ctx); vm.runInContext(readFileSync('game/game.js', 'utf8'), ctx);
const D = ctx.My3D2dge.current.debug, A = D.api; const [step, seed] = process.argv.slice(2).map(Number);
D.RUN.seed = seed * 31337; D.RUN.mode = 'solo'; const w = A.buildWorld(step, { players: 4 }); w.heroes = [0, 1, 2, 3].map(i => A.makeHero(i, i, null)); D.RUN.heroes = w.heroes; A.placeHeroes(w.heroes, w.starts); w.heroes.forEach(h => h.bot = A.makeBot(true)); w.allyStun = step >= 6;
for (let t = 0; t < 420 * 120; t++) { A.simStep(1 / 120); if (t % (60 * 120) === 0) console.log(Math.round(t / 120), w.heroes.map(h => `${h.bot.think}@${Math.round(h.x / 16)},${Math.round(h.y / 16)}${h.down ? 'D' : ''} g=${h.bot.goal ? Math.round(h.bot.goal.x / 16) + ',' + Math.round(h.bot.goal.y / 16) : '-'}`).join(' | '), 'stairs', w.stairs[0] && Math.round(w.stairs[0].x / 16) + ',' + Math.round(w.stairs[0].y / 16), 'doors', w.doors.filter(d => d.open).length + '/' + w.doors.length, 'mons', w.mons.filter(m => !m.dead).length); if (w.descend) break; }
console.log(w.descend ? 'DESCENDED at ' + Math.round(w.time) + 's' : 'STALLED');
