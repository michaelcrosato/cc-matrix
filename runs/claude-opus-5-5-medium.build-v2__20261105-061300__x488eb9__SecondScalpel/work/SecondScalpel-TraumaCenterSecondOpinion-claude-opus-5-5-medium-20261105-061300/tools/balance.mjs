// Bot runs for tuning, not part of the tests. node tools/balance.mjs [--par] [--case c3] : a compact printout per case and skill.
import vm from 'node:vm'; import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = new URL('../', import.meta.url), man = JSON.parse(readFileSync(new URL('src/manifest.json', ROOT)));
const ctx = { console, performance }; ctx.window = ctx; vm.createContext(ctx);
for (const f of man.core) vm.runInContext(readFileSync(new URL('src/' + f, ROOT), 'utf8'), ctx, { filename: f });
const G = ctx.GAME, args = process.argv.slice(2), only = args.includes('--case') ? args[args.indexOf('--case') + 1] : null;
export function play(id, { diff = 'resident', bot = {}, seed = 1, n = 1, maxT = 900, lock = false } = {}) {
  const players = []; for (let i = 0; i < n; i++) players.push({ id: i, color: G.SEATS[i] });
  const S = G.Op.create(id, { seed, difficulty: diff, players, lock }), bots = players.map((_, i) => new G.Bot({ seed: seed + i * 13, ...bot })), curs = players.map(() => G.Cursor.create()), wheels = players.map(() => G.Wheel.create());
  const dt = 1 / 120; let t = 0, fails = 0, phases = []; let lastP = 0, lastT = 0;
  while (!S.done && t < maxT) { const inp = S.players.map((p, i) => { const d = bots[i].update(S, p, curs[i], dt); G.Cursor.update(curs[i], p, d, S, dt); const tool = G.Wheel.update(wheels[i], p.toolNext, d, dt); return G.buildInput(curs[i], tool, d); }); G.Op.step(S, inp, dt); S.ev.length = 0; t += dt; if (S.phaseI !== lastP) { phases.push((t - lastT) | 0); lastT = t; lastP = S.phaseI; } }
  phases.push((t - lastT) | 0); return { done: S.done, why: S.lostWhy, t: t | 0, score: S.finalScore, v: S.v | 0, clock: S.clock | 0, clockPct: S.clock / S.clock0, slips: S.slips, acts: S.acts, phase: S.phaseI, phases, flow: S.bestFlow, S };
}
const SK = { perfect: { speed: 330 }, human: { speed: 260, react: .25, err: 3 } };
const ids = only ? [only] : [...G.CASE_ORDER, 'grandrounds'];
const par = {};
for (const id of ids) { const r = play(id); par[id] = r.score; console.log(id.padEnd(12), 'perfect', r.done, r.why || '', 't' + r.t, 'v' + r.v, 'clock' + (r.clockPct * 100 | 0) + '%', 'score' + r.score, 'slips' + r.slips, JSON.stringify(r.acts), 'p' + r.phase, r.phases.join(','));
  if (!args.includes('--perfect')) for (const d of ['resident', 'intern']) { const q = play(id, { diff: d, bot: SK.human }); console.log(' '.repeat(12), 'human', d, q.done, q.why || '', 't' + q.t, 'v' + q.v, 'clock' + (q.clockPct * 100 | 0) + '%', 'slips' + q.slips, 'p' + q.phase); } }
if (args.includes('--par')) { par.lab = 1; writeFileSync(new URL('src/data/par.js', ROOT), `// Written by tools/balance.mjs: a perfect bot's score per case at Resident, the 100% of a case's rank.\n(() => { const G = (window.GAME ||= {}); G.PAR = ${JSON.stringify(par)}; })();\n`); }
