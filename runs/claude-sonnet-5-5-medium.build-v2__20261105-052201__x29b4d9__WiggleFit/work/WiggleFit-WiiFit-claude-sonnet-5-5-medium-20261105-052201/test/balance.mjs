import { makeStub, run, resetTuning } from './headless.mjs';
import { FruitHat } from '../src/events/fruitHat.js'; import { Poses } from '../src/events/poses.js'; import { LogReps } from '../src/events/logReps.js'; import { StepClass } from '../src/events/stepClass.js'; import { Plates } from '../src/events/plates.js'; import { RoomService } from '../src/events/roomService.js'; import { Cairn } from '../src/events/cairn.js'; import { Raft } from '../src/events/raft.js';
const avg = (E, skill, n = 3, extra = {}) => { let s = 0, falls = 0; for (let seed = 1; seed <= n; seed++) { const ev = new E(game, { tier: 0, seed, lanes: [{ kind: 'bot', skill, ...extra }] }); run(ev, 250); s += ev.lanes[0].form; falls += ev.lanes[0].falls; ev.dispose(); } return [s / n, falls]; };
let game;
export default async function (t) {
  game = await makeStub(); resetTuning();
  const med = (f) => (f >= 85 ? 3 : f >= 65 ? 2 : f >= 40 ? 1 : 0);
  for (const [E, name, cfg] of [[Poses, 'poses', {}], [StepClass, 'stepClass', {}], [Plates, 'plates', {}], [Cairn, 'cairn', {}]]) { const [sh] = avg(E, 'sharp'); const [av] = avg(E, 'average'); const [cl] = avg(E, 'clumsy'); t.ok(sh >= 80, `${name}: sharp reaches high form (${sh.toFixed(0)})`); t.ok(av >= 40, `${name}: average reaches Adequate (${av.toFixed(0)})`); t.ok(cl >= 30, `${name}: clumsy is not shut out (${cl.toFixed(0)})`); t.ok(sh >= cl, `${name}: skill is rewarded`); }
  const [pS] = avg(Plates, 'sharp'), [pC] = avg(Plates, 'clumsy'); t.ok(pS - pC >= 15, `plates Tier 1 separates bots (${pS.toFixed(0)} vs ${pC.toFixed(0)})`);
  const [lc] = avg(LogReps, 'clumsy'); t.ok(lc <= 70, `log reps does not give the clumsy bot above 70 (${lc.toFixed(0)})`);
  // fruit hat: banking early vs never banking
  const fh = (bankAt) => { let f = 0, sc = 0; for (let seed = 1; seed <= 3; seed++) { const ev = new FruitHat(game, { tier: 0, seed, lanes: [{ kind: 'bot', skill: 'sharp', bankAt }] }); ev.lanes[0].bankAt = bankAt; run(ev, 66); f += ev.lanes[0].falls; sc += ev.lanes[0].score; ev.dispose(); } return [f, sc / 3]; };
  const [f7, s7] = fh(7), [fN] = fh(99); t.ok(f7 <= 2, `fruit hat: sharp banking at 7 rarely falls (${f7})`); t.ok(s7 > 8, `fruit hat: banking scores (${s7.toFixed(1)})`); t.ok(fN >= 1, `fruit hat: never banking falls (${fN})`);
  // room service tier 1 delivers
  const ev = new RoomService(game, { tier: 0, seed: 1, lanes: [{ kind: 'bot', skill: 'sharp' }] }); run(ev, 100); t.ok(ev.lanes[0].delivered >= 4, 'room service tier 1 delivers most glasses: ' + ev.lanes[0].delivered); ev.dispose();
  // raft rounds end
  for (let seed = 1; seed <= 3; seed++) { const r = new Raft(game, { tier: 0, seed, lanes: [0, 1, 2, 3].map((i) => ({ kind: 'bot', skill: ['sharp', 'average', 'average', 'clumsy'][i], name: 'b' + i })) }); let longest = 0, last = 0; r.begin(); let rounds = 0; for (let i = 0; i < 120 * 260 && r.phase !== 'done'; i++) { r.fixed(1 / 120); if (r.round !== rounds) { rounds = r.round; longest = Math.max(longest, r.t - last); last = r.t; } } t.ok(r.phase === 'done' && r.wins.some((w) => w >= 1) && longest <= 95, `raft ends with a winner, rounds under 95 s (${longest.toFixed(0)})`); r.dispose(); }
  // breath-synced beats unsynced on the Cairn Tier 2
  const cairnT2 = (sync) => { let s = 0; for (let seed = 1; seed <= 3; seed++) { const ev = new Cairn(game, { tier: 1, seed, lanes: [{ kind: 'bot', skill: 'average' }] }); const l = ev.lanes[0]; const orig = ev.botIntent.bind(ev); ev.botIntent = (ln, dt, it) => { orig(ln, dt, it); it.breath = sync ? (ev.t % 8) < 4 : false; }; run(ev, 200); s += ev.lanes[0].form; ev.dispose(); } return s / 3; };
  const a = cairnT2(true), b = cairnT2(false); t.ok(a >= b, `cairn: breath-synced is at least as good (${a.toFixed(0)} vs ${b.toFixed(0)})`);
  // a bot that parks the stick on the goal and never corrects stays below Exemplary in Poses
  let sp = 0; for (let seed = 1; seed <= 3; seed++) { const ev = new Poses(game, { tier: 0, seed, lanes: [{ kind: 'bot', skill: 'sharp' }] }); ev.botIntent = (ln, dt, it) => { const r = ev.ringAt(ev.t); it.wx = r.x; it.wz = r.z; it.breath = false; }; run(ev, 200); sp += ev.lanes[0].form; ev.dispose(); } t.ok(sp / 3 < 97, `poses: a parked stick stays under Suspicious (${(sp / 3).toFixed(0)})`);
}
