// A debugging aid: follow one bot run: node tools/trace.mjs c5 [seconds] [every] [phase] prints the phase, tool, hold and objects.
import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ROOT = new URL('../', import.meta.url), man = JSON.parse(readFileSync(new URL('src/manifest.json', ROOT)));
const ctx = { console, performance }; ctx.window = ctx; vm.createContext(ctx);
for (const f of man.core) vm.runInContext(readFileSync(new URL('src/' + f, ROOT), 'utf8'), ctx, { filename: f });
const G = ctx.GAME, id = process.argv[2], max = +(process.argv[3] || 60), every = +(process.argv[4] || 1), ph = +(process.argv[5] || 0);
const S = G.Op.create(id, { seed: 1, phase: ph }), bot = new G.Bot({ seed: 1 }), cur = G.Cursor.create(), wh = G.Wheel.create(), dt = 1 / 120; let t = 0, nx = 0, evs = {};
while (!S.done && t < max) { const p = S.players[0], d = bot.update(S, p, cur, dt); G.Cursor.update(cur, p, d, S, dt); const tool = G.Wheel.update(wh, p.toolNext, d, dt); G.Op.step(S, [G.buildInput(cur, tool, d)], dt); for (const e of S.ev) if (e[0] !== 'beat') evs[e[0]] = (evs[e[0]] || 0) + 1; S.ev.length = 0; t += dt; if (t >= nx) { nx += every; console.log(t.toFixed(1), 'ph' + S.phaseI, 'v' + (S.v | 0), p.tool, 'cur', cur.x | 0, cur.y | 0, 'trig', d.trig, p.hold ? p.hold.k : '-', S.objs.map(o => o.type + (o.stage ? ':' + o.stage : '') + (o.stage2 ? ':' + o.stage2 : '') + (o.hidden ? 'H' + (o.mark > 0 ? 'm' : '') : '') + (o.pull ? ':' + (o.pull.prog | 0) : '')).join(' ').slice(0, 110), JSON.stringify(evs).slice(0, 80)); evs = {}; } }
console.log('end', S.done, S.lostWhy, t | 0, S.finalScore);
