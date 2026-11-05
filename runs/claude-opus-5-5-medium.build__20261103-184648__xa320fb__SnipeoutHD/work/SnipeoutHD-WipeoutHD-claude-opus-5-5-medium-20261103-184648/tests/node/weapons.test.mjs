import { load } from '../lib/vm.mjs';
import { test, check, done } from '../lib/t.mjs';
const ctx = load(), SN = ctx.SN, DT = 1 / 120;
/** a shooter and a target 60 m ahead on the Port Solenne straight */
const setup = (weapon, o = {}) => {
  const R = new SN.Race({ track: 'solenne', mode: 'race', cls: 'spark', seed: 1, entrants: [{ pilot: 'ingrid', team: 'kestrel', control: 'human', player: 0 }, { pilot: 'tomas', team: 'kestrel', control: 'ai' }], intro: false, cheats: { freezeAI: true } });
  R.state = 'racing'; R.t = 0; const A = R.ships[0], B = R.ships[1];
  SN.Ship.place(A, R, 20 * 16, 0, 900); SN.Ship.place(B, R, (20 + (o.gap ?? 60)) * 16, o.du || 0, 860); A._lastS = A.s; B._lastS = B.s;
  R.weapons.give(A, weapon); A.pickT = 0; return { R, A, B };
};
const fire = (R, A, ctl, secs = 3) => { let k = 0; R.getHuman = () => { k++; return Object.assign({ thrust: 1, steer: 0, analog: true }, ctl(k)); }; let hits = 0, dmg = 0; for (let i = 0; i < 120 * secs; i++) { R.step(DT); for (const e of R.events) if (e.t === 'hit' && e.ship !== A) { hits++; dmg += e.dmg; } } return { hits, dmg }; };
await test('swarm', () => { const { R, A, B } = setup('swarm'); const r = fire(R, A, k => ({ fire: k === 2, firePressed: k === 2 })); check(r.hits >= 1 && r.dmg > 0, 'rockets hit', r); });
await test('seeker locks and homes', () => { const { R, A, B } = setup('seeker', { du: 60 }); let locked = false; const r = fire(R, A, k => { if (A.lockT >= .6) locked = true; return { fire: locked && k % 200 === 0, firePressed: locked && !A.fired && (A.fired = true) }; }, 4); check(locked, 'lock acquired'); check(r.hits === 1 && r.dmg > 12, 'the seeker hits', r); });
await test('mines', () => { const { R, A, B } = setup('mine', { gap: -40 }); SN.Ship.place(B, R, 0 * 16, 0, 1000); B._lastS = B.s; R.cheats.freezeAI = false; const r = fire(R, A, k => ({ firePressed: k === 2, fire: k === 2 }), 3); check(R.log.filter(e => e.t === 'mineDrop').length === 5, 'five mines dropped'); });
await test('cannon', () => { const { R, A } = setup('cannon'); const r = fire(R, A, k => ({ fire: k < 240, firePressed: k === 2 })); check(r.hits >= 5, 'bolts hit', r); });
await test('railshot', () => { const { R, A, B } = setup('rail', { gap: 150 }); let k2 = 0; const r = fire(R, A, k => ({ fire: k < 100, firePressed: k === 1, fireReleased: k === 100 })); check(r.hits === 1 && r.dmg > 20, 'a charged railshot hits along the line', r);
  const s2 = setup('rail', { gap: 150, du: -150 }); const r2 = fire(s2.R, s2.A, k => ({ fire: k < 100, firePressed: k === 1, fireReleased: k === 100 })); check(r2.hits === 0, 'and misses outside its aim', r2); });
await test('tremor hits grounded, misses airborne', () => { const { R, A, B } = setup('tremor'); const r = fire(R, A, k => ({ firePressed: k === 2, fire: k === 2 }), 2); check(r.hits === 1, 'grounded target hit', r);
  const s2 = setup('tremor'); s2.B.grounded = false; s2.B.V[2] = 2000; s2.B.airT = .3; const r2 = fire(s2.R, s2.A, k => ({ firePressed: k === 2, fire: k === 2 }), .5); check(r2.hits === 0, 'airborne target dodges', r2); });
await test('bulwark blocks', () => { const { R, A, B } = setup('bulwark'); fire(R, A, k => ({ firePressed: k === 2, fire: k === 2 }), .2); const e0 = A.energy; R.weapons.hit(A, B, 'rail', 30, {}); check(A.shieldT > 0 && A.energy === e0, 'no damage under bulwark'); });
await test('autopilot and nitro', () => { const a = setup('auto'); fire(a.R, a.A, k => ({ firePressed: k === 2, fire: k === 2 }), .3); check(a.A.autoT > 4, 'autopilot running'); const n = setup('nitro'); fire(n.R, n.A, k => ({ firePressed: k === 2, fire: k === 2 }), .3); check(n.A.nitroT > 1.5, 'nitro running'); });
await test('siphon transfers', () => { const { R, A, B } = setup('siphon'); A.energy = 50; const b0 = B.energy; fire(R, A, k => ({ firePressed: k === 2, fire: k === 2 }), 2.5); check(A.energy > 55 && B.energy < b0 - 5, 'energy drained into the user', [A.energy, B.energy]); });
await test('absorb', () => { const { R, A } = setup('rail'); A.energy = 40; fire(R, A, k => ({ absorb: k === 3 }), .2); check(A.energy > 60 && !A.weapon, 'absorb turns the weapon into shield', A.energy); });
await test('AI uses every weapon', () => {
  const used = new Set();
  for (const seed of [1, 2, 3, 4]) for (const id of ['solenne', 'karakum']) { const R = new SN.Race({ track: id, mode: 'race', cls: 'flare', laps: 2, seed, entrants: SN.field([]), intro: false }); for (let i = 0; i < 120 * 120 && R.state !== 'results'; i++) { R.step(DT); for (const e of R.events) if (e.t === 'fire') used.add(e.weapon); } }
  check(used.size >= 9, 'at least 9 of 10 weapons fired by the AI across races', [...used]);
});
done();
