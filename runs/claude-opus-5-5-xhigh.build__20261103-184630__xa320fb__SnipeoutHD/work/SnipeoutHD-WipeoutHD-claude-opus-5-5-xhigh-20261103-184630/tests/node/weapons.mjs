// weapons: each of the ten in a fixed two-craft setup (a shooter behind a target on a straight), the warnings, bulwark,
// absorb, the pickup roll by position, elimination (DNF in a race, respawn in Snipeout), and AI use across races.
import { load } from '../lib/vm.mjs';
export async function run(T) {
  const { SN, game } = load({ quiet: true }); await game.booted;
  const U = 16, dt = 1 / 120, Tr = SN.getTrack('solenne'), C = o => Object.assign(SN.Controls.blank(), o);
  const setup = (gap = 500, du = 0, mode = 'race') => {
    const R = new SN.Race({ track: Tr, mode, cls: 'SPARK', laps: 9, seed: 4, entrants: [{ pilot: 'vale', team: 'kestrel', control: 'human', pi: 0 }, { pilot: 'okafor', team: 'hammerhead', control: 'ai' }], intro: false, flyingStart: true, record: false, rules: { rubberBand: false } });
    const a = R.ships[0], b = R.ships[1]; a.putOn(Tr, 60 * U, 0, 1000); b.putOn(Tr, 60 * U + gap, du, 1000); a.p = b.p - gap;
    R.ships[1].control = 'dummy';   // the target holds its line at a steady speed
    return { R, a, b };
  };
  const steps = (R, n, c, bc) => { for (let k = 0; k < n; k++) { R.setControls(0, typeof c === 'function' ? c(k) : c); const b = R.ships[1]; b.V = b.F.map(v => v * 1000); R.step(dt); } };
  // a 'dummy' control: the race asks the AI for anything not human; make the target fly straight and steady
  const ai = SN.AI.controls; SN.AI.controls = (s, R, o) => s.control === 'dummy' ? C({ thrust: 1 }) : ai(s, R, o);
  const fireTest = (id, o = {}) => {
    const { R, a, b } = setup(o.gap || 500, o.du || 0); R.weapons.give(a, id); const e0 = b.energy;
    const hits = []; let lockSeen = false, warn = false;
    for (let k = 0; k < (o.n || 240); k++) {
      const c = o.ctl ? o.ctl(k, a) : C({ thrust: 1, firePressed: k === 2, fire: k >= 2 && k < 4 });
      R.setControls(0, c); b.V = b.F.map(v => v * 1000); R.step(dt);
      for (const e of R.events) { if (e.t === 'hit' && e.ship === b) hits.push(e); if (e.t === 'lock' && e.target === b) lockSeen = true; }
      if (b.lockedBy && R.clock - b.lockedBy.t < .1) warn = true;
    }
    return { R, a, b, dmg: e0 - b.energy, hits, lockSeen, warn };
  };
  { const r = fireTest('swarm'); T.check('SWARM hits for about 10 a rocket', r.hits.length >= 1 && r.dmg >= 8, r.dmg); }
  { const r = fireTest('seeker', { gap: 900, n: 420, ctl: (k, a) => C({ thrust: 1, firePressed: k === 120, fire: k === 120 }) }); T.check('SEEKER locks on (the target is warned)', r.lockSeen && r.warn, r); T.check('SEEKER hits for 24 x the target\'s damage factor', Math.abs(r.dmg - 24 * r.b.st.dmgMul) < 1.5, [r.dmg, 24 * r.b.st.dmgMul]); }
  { const { R, a, b } = setup(-400); R.weapons.give(a, 'mine'); const e0 = b.energy; steps(R, 3, C({ thrust: 1, firePressed: true, fire: true })); steps(R, 360, C({ thrust: 0, brakeL: 1, brakeR: 1 })); T.check('MINEFIELD drops five mines', R.weapons.mines.length + R.events.filter(e => e.t === 'boom').length >= 1, R.weapons.mines.length); }
  { const r = fireTest('cannon', { gap: 400, n: 300, ctl: k => C({ thrust: 1, fire: k >= 2 && k < 260, firePressed: k === 2 }) }); T.check('CANNON streams bolts that hit', r.hits.length >= 5, r.hits.length); }
  { const r = fireTest('rail', { gap: 1200, n: 200, ctl: k => C({ thrust: 1, fire: k < 110, fireReleased: k === 110 }) }); T.check('RAILSHOT charged and released hits within its aim', r.hits.some(e => e.weapon === 'rail'), r.dmg); }
  { const r = fireTest('rail', { gap: 1200, du: 180, n: 200, ctl: k => C({ thrust: 1, fire: k < 110, fireReleased: k === 110 }) }); T.check('RAILSHOT misses outside its aim', !r.hits.some(e => e.weapon === 'rail'), r.dmg); }
  { const r = fireTest('tremor', { gap: 600 }); T.check('TREMOR hits a grounded craft', r.hits.some(e => e.weapon === 'tremor'), r.dmg); }
  { const { R, a, b } = setup(600); R.weapons.give(a, 'tremor'); b.grounded = false; b.P[2] += 800; b.V[2] = 0; let dodge = false, hit = false; for (let k = 0; k < 160; k++) { R.setControls(0, C({ thrust: 1, firePressed: k === 1, fire: k === 1 })); R.step(dt); for (const e of R.events) { if (e.t === 'dodge' && e.ship === b) dodge = true; if (e.t === 'hit' && e.ship === b && e.weapon === 'tremor') hit = true; } } T.check('TREMOR misses an airborne craft', dodge && !hit, { dodge, hit }); }
  { const { R, a, b } = setup(500); R.weapons.give(b, 'bulwark'); R.weapons.fire(b, 'bulwark'); R.weapons.give(a, 'swarm'); const e0 = b.energy; steps(R, 200, k => C({ thrust: 1, firePressed: k === 2, fire: k === 2 })); T.check('BULWARK blocks everything', b.energy >= e0 - .001, e0 - b.energy); }
  { const { R, a } = setup(500); R.weapons.give(a, 'autopilot'); steps(R, 3, C({ firePressed: true, fire: true })); T.check('AUTOPILOT flies the craft for 5 s', a.autoT > 4, a.autoT); const s0 = a.speed; steps(R, 240, C({})); T.check('…keeping it at speed', a.speed > s0 * .8, a.speed); }
  { const { R, a } = setup(500); R.weapons.give(a, 'nitro'); steps(R, 3, C({ thrust: 1, firePressed: true, fire: true })); T.check('NITRO boosts', a.boostT > 2 && a.boostMul >= 1.35, [a.boostT, a.boostMul]); }
  { const { R, a, b } = setup(600); a.energy = 50; R.weapons.give(a, 'siphon'); const eb = b.energy; steps(R, 300, k => C({ thrust: 1, firePressed: k === 2, fire: k === 2 })); T.check('SIPHON drains the target into the user', b.energy < eb - 10 && a.energy > 60, [a.energy, b.energy]); }
  { const { R, a } = setup(); a.energy = 50; R.weapons.give(a, 'rail'); steps(R, 3, C({ absorb: true })); T.check('absorb turns the weapon into shield', a.energy >= 50 + 27 && !a.weapon, a.energy); }
  // pickups by position: the leader gets more mines and shields, the back more tremors and autopilots
  { const { R, a } = setup(); const cnt = place => { a.place = place; const c = {}; for (let k = 0; k < 600; k++) { const w = R.weapons.roll(a); c[w] = (c[w] || 0) + 1; } return c; }; const f = cnt(1), b = cnt(8);
    T.check('pickups favour defence at the front', (f.mine || 0) > (b.mine || 0) && (f.tremor || 0) === 0, f); T.check('pickups favour attack at the back', (b.tremor || 0) > 0 && (b.autopilot || 0) > 0, b); }
  // elimination: DNF in a race, a respawn in Snipeout
  { const { R, b } = setup(); b.energy = 1; SN.Ship.damage(b, 50, 'test', null, R); T.check('at zero energy: eliminated (DNF in a race)', b.elim && b.dnf, b); }
  { const { R, a, b } = setup(500, 0, 'snipeout'); b.energy = 1; R.weapons.give(a, 'swarm'); steps(R, 300, k => C({ thrust: 1, firePressed: k === 2, fire: k === 2 })); T.check('Snipeout: an elimination scores 3 + the hit', a.points >= 4, a.points); steps(R, 480, C({ thrust: 1 })); T.check('Snipeout: the eliminated craft respawns', !b.elim && b.energy === 100 || b.invT >= 0 && !b.elim, b); }
  SN.AI.controls = ai;
  // the AI uses every weapon across four seeded races
  { const used = new Set();
    for (const id of SN.TRACK_ORDER) { const R = new SN.Race({ track: SN.getTrack(id), mode: 'race', cls: 'FLARE', laps: 2, seed: 11, entrants: SN.field({ humans: [] }), intro: false, record: false }); let n = 0; while (R.state !== 'results' && n < 120 * 200) { R.step(dt); n++; for (const e of R.events) if (e.t === 'fire') used.add(e.weapon); if (R.state === 'racing' && R.ships.every(s => s.finished || s.dnf)) R.seal(); } }
    T.check('the AI fires all ten weapons across four races', used.size === 10, [...used]); }
}
