import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console: { log() {}, info() {}, warn() {}, error: console.error }, addEventListener() {}, location: { hash: '', search: '' } };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync('my-3d2dge.js', 'utf8'), ctx); vm.runInContext(readFileSync('game/game.js', 'utf8'), ctx);
const E = ctx.My3D2dge, game = E.current, D = game.debug, A = D.api;
const step = +process.argv[2] || 2, secs = +process.argv[3] || 300;
D.RUN.seed = 99; D.RUN.mode = 'solo'; const w = A.buildWorld(step, { players: 4 }); w.heroes = [0,1,2,3].map(i => A.makeHero(i, i, null)); D.RUN.heroes = w.heroes; A.placeHeroes(w.heroes, w.starts); w.heroes.forEach(h => h.bot = A.makeBot(true));
for (let t = 0; t < secs; t++) { for (let k = 0; k < 120; k++) A.simStep(1/120); if (w.descend) { console.log('descend at', w.time.toFixed(0)); break; } if (t % 60 === 59) console.log('t', t + 1, w.heroes.map(h => `${h.bot.think}@${Math.round(h.x/16)},${Math.round(h.y/16)} hp${Math.round(h.hp)} k${h.keys}`).join(' | '), 'mons', w.mons.filter(m=>!m.dead).length, 'gens', w.gens.filter(g=>!g.dead).length, 'doors open', w.doors.filter(d=>d.open).length + '/' + w.doors.length); }
console.log(w.rows.map((r, y) => r.split('').map((c, x) => w.heroes.some(h => Math.floor(h.x/16) === x && Math.floor(h.y/16) === y) ? '@' : w.map.solidCell(x, y) && c === '.' ? '+' : c).join('')).join('\n'));
