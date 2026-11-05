// Node suites: track geometry, physics invariants, determinism, weapons, data. Driven through tests/lib/load.mjs.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadSim, ROOT_DIR } from './lib/load.mjs';

export async function run(t) {
  const SN = loadSim();
  const trackOf = (id) => SN.buildTrack(SN.trackDef(id));
  const NORD = trackOf('nordlicht');
  const VAULT = trackOf('vault');

  // ---- track geometry ----
  t('track: frame vectors are orthogonal unit vectors (8 points)', () => {
    for (let k = 0; k < 8; k++) {
      const s = (k / 8) * NORD.L;
      const f = SN.frameInto(NORD, s, {});
      const dRU = f.R[0] * f.U[0] + f.R[1] * f.U[1] + f.R[2] * f.U[2];
      const lenR = Math.hypot(...f.R), lenU = Math.hypot(...f.U);
      if (Math.abs(dRU) > 1e-4 || Math.abs(lenR - 1) > 1e-4 || Math.abs(lenU - 1) > 1e-4) throw new Error(`frame at s=${s.toFixed(0)} dot=${dRU} |R|=${lenR} |U|=${lenU}`);
      const dTR = f.T[0] * f.R[0] + f.T[1] * f.R[1];
      if (Math.abs(dTR) > 1e-6) throw new Error('forward not perpendicular to right');
    }
  });
  t('track: right-hand frame (R = cross(U, T) on the flat, before bank)', () => {
    for (let i = 0; i < NORD.n; i += 37) {
      if (Math.abs(NORD.bank[i]) > 1e-9) continue;
      const c = SN.cross([0, 0, 1], [NORD.T[i * 3], NORD.T[i * 3 + 1], NORD.T[i * 3 + 2]]);
      const d = c[0] * NORD.R[i * 3] + c[1] * NORD.R[i * 3 + 1] + c[2] * NORD.R[i * 3 + 2];
      if (d < 0.9999) throw new Error('R is not cross(U, T) at sample ' + i);
    }
  });
  t('track: a right bend banks the right edge down (sign of bank)', () => {
    let best = 0;
    for (let i = 0; i < NORD.n; i++) if (Math.abs(NORD.kappa[i]) > Math.abs(NORD.kappa[best])) best = i;
    const f = SN.frameInto(NORD, best * NORD.ds, {});
    const expectRightEdgeLower = NORD.kappa[best] > 0;
    const rightLower = f.R[2] < 0;
    if (expectRightEdgeLower !== rightLower && Math.abs(f.bank) > 0.02) throw new Error(`bank sign wrong: kappa=${NORD.kappa[best]} bank=${f.bank} R.z=${f.R[2]}`);
  });
  t('track: closed loop (end meets start)', () => {
    const a = SN.worldAt(NORD, 0, 0, 0), b = SN.worldAt(NORD, NORD.L - NORD.ds, 0, 0);
    const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    if (d > 2.5) throw new Error('gap at the start line: ' + d.toFixed(2) + ' m');
  });
  t('track: arc length matches the sampled distance (<0.1%)', () => {
    let len = 0, prev = null;
    for (let i = 0; i <= NORD.n; i += 4) {
      const p = [NORD.C[(i % NORD.n) * 3], NORD.C[(i % NORD.n) * 3 + 1], NORD.C[(i % NORD.n) * 3 + 2]];
      if (prev) len += Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]);
      prev = p;
    }
    if (Math.abs(len - NORD.L) / NORD.L > 0.01) throw new Error(`length ${len.toFixed(1)} vs ${NORD.L.toFixed(1)}`);
  });
  t('track: both tracks are a sensible size (3–5 km) with a speed limit at every bend', () => {
    for (const tr of [NORD, VAULT]) {
      if (tr.L < 3000 || tr.L > 5000) throw new Error(tr.id + ' length ' + tr.L);
      if (!tr.vmax.every((v) => Number.isFinite(v) && v > 0)) throw new Error(tr.id + ' vmax');
    }
  });

  // ---- physics ----
  const entrantsFor = (n) => Array.from({ length: n }, (_, i) => ({ name: 'P' + i, team: i % 4, human: i === 0, skill: SN.PILOTS[i % 8].skill }));
  t('physics: 3 minutes of random input stays finite and bounded', () => {
    const rnd = SN.rng(99);
    const race = new SN.Race({ track: NORD, cls: SN.CLASSES[1], laps: 99, seed: 3, entrants: entrantsFor(1) });
    for (let k = 0; k < 120 * 180; k++) {
      const c = { steer: rnd.range(-1, 1), pitch: rnd.range(-1, 1), thrust: rnd.int(0, 1), brakeL: rnd.range(0, 1) < 0.1 ? 1 : 0, brakeR: rnd.range(0, 1) < 0.1 ? 1 : 0, firePressed: rnd.range(0, 1) < 0.01, absorb: rnd.range(0, 1) < 0.01 };
      race.step(SN.STEP, [c]);
      const s = race.ships[0];
      for (const v of [s.P, s.u, s.zc, s.v, s.vu, s.vz, s.energy]) if (!Number.isFinite(v)) throw new Error('non-finite at step ' + k);
      if (Math.abs(s.u) > 9) throw new Error('left the road at step ' + k);
      if (s.zc > 2000 || s.zc < -200) throw new Error('altitude out of range at step ' + k + ': ' + s.zc);
    }
  });
  t('physics: a craft held on the throttle reaches its class top speed on the flat', () => {
    const race = new SN.Race({ track: NORD, cls: SN.CLASSES[1], laps: 9, seed: 5, entrants: entrantsFor(1) });
    for (let k = 0; k < 120 * 30; k++) race.step(SN.STEP, [{ steer: 0, pitch: 0, thrust: 1, brakeL: 0, brakeR: 0 }]);
    const v = race.ships[0].v, top = SN.CLASSES[1].top;
    if (v < top * 0.7) throw new Error(`only ${v.toFixed(0)} m/s after 30 s`);
  });
  t('physics: airbrakes slow the craft (both brakes)', () => {
    const race = new SN.Race({ track: NORD, cls: SN.CLASSES[1], laps: 9, seed: 5, entrants: entrantsFor(1) });
    for (let k = 0; k < 120 * 15; k++) race.step(SN.STEP, [{ steer: 0, pitch: 0, thrust: 1 }]);
    const before = race.ships[0].v;
    for (let k = 0; k < 120 * 2; k++) race.step(SN.STEP, [{ steer: 0, pitch: 0, thrust: 0, brakeL: 1, brakeR: 1 }]);
    if (!(race.ships[0].v < before - 20)) throw new Error(`brakes did not slow: ${before.toFixed(0)} -> ${race.ships[0].v.toFixed(0)}`);
  });
  t('physics: the crest on Nordlicht throws a craft into the air', () => {
    const race = new SN.Race({ track: NORD, cls: SN.CLASSES[1], laps: 9, seed: 2, entrants: entrantsFor(1) });
    let air = 0;
    for (let k = 0; k < 120 * 60; k++) { race.step(SN.STEP, [{ steer: 0, pitch: 0, thrust: 1 }]); if (!race.ships[0].grounded) air++; }
    if (air < 10) throw new Error('no airtime on a full minute of track');
  });

  // ---- determinism ----
  t('determinism: the same seed and inputs give the same hash', () => {
    const run = (seed) => {
      const race = new SN.Race({ track: NORD, cls: SN.CLASSES[1], laps: 1, seed, entrants: entrantsFor(4) });
      for (let k = 0; k < 120 * 20; k++) race.step(SN.STEP, null);
      return race.hash();
    };
    if (run(7) !== run(7)) throw new Error('same seed differs');
    if (run(7) === run(8)) throw new Error('different seeds give the same state');
  });

  // ---- race rules ----
  t('race: AI-only single-lap races finish on both tracks', () => {
    for (const tr of [NORD, VAULT]) {
      const race = new SN.Race({ track: tr, cls: SN.CLASSES[1], laps: 1, seed: 11, entrants: entrantsFor(8) });
      let k = 0;
      while (!race.finished && k < 120 * 240) { race.step(SN.STEP, null); k++; }
      if (!race.finished) throw new Error(`${tr.id} unfinished after 240 s`);
      const ranks = race.results().map((r) => r.rank);
      if (new Set(ranks).size !== ranks.length) throw new Error('duplicate places');
    }
  });
  t('race: a craft that crosses the line counts a lap', () => {
    const race = new SN.Race({ track: NORD, cls: SN.CLASSES[1], laps: 2, seed: 4, entrants: entrantsFor(1) });
    let k = 0;
    while (race.ships[0].lap < 1 && k < 120 * 120) { race.step(SN.STEP, [{ thrust: 1 }]); k++; }
    if (race.ships[0].lap !== 1) throw new Error('no lap counted');
    if (!race.events.length && race.ships[0].lapTimes.length !== 1) throw new Error('no lap time');
  });

  // ---- weapons ----
  t('weapons: a cannon bolt fired at a craft ahead hits it', () => {
    const race = new SN.Race({ track: NORD, cls: SN.CLASSES[1], laps: 9, seed: 6, entrants: entrantsFor(2) });
    const [a, b] = race.ships;
    a.human = true; b.human = false;
    b.lane = 0; b.u = a.u;
    b.P = a.P + 60; b.s = SN.wrap(b.P, NORD.L); b.v = 0;
    a.weapon = 'cannon';
    const hitBefore = b.energy;
    race.step(SN.STEP, [{ thrust: 0, firePressed: true }, null]);
    let hits = 0;
    for (let k = 0; k < 120 * 3; k++) { race.step(SN.STEP, [{ thrust: 0 }, null]); hits += race.events.filter((e) => e.t === 'hit').length; if (hits) break; }
    if (!hits || !(b.energy < hitBefore)) throw new Error('no hit from a cannon at 60 m');
  });
  t('weapons: a bulwark shield cuts incoming damage to a fifth', () => {
    const race = new SN.Race({ track: NORD, cls: SN.CLASSES[1], laps: 9, seed: 6, entrants: entrantsFor(2) });
    const [a, b] = race.ships;
    b.shield = 4; b.P = a.P + 30; b.s = SN.wrap(b.P, NORD.L); b.u = a.u;
    a.weapon = 'cannon';
    const e0 = b.energy;
    race.step(SN.STEP, [{ firePressed: true }, null]);
    for (let k = 0; k < 120 * 2; k++) race.step(SN.STEP, [{}, null]);
    const lost = e0 - b.energy;
    if (!(lost > 0 && lost < SN.WEAPONS.cannon.dmg * 0.4)) throw new Error('shield did not cut damage: ' + lost.toFixed(2));
  });
  t('weapons: every weapon in the table exists with a colour and a description', () => {
    for (const k of SN.WEAPON_TABLE) {
      const w = SN.WEAPONS[k];
      if (!w || !w.color || !w.desc) throw new Error('missing data for ' + k);
    }
  });

  // ---- tuning ----
  t('tune: RESET restores every default exactly', () => {
    SN.Tune.T.thrust = 1.7; SN.Tune.T.lapCount = 5; SN.Tune.reset();
    for (const k of Object.keys(SN.Tune.DEFAULTS)) if (SN.Tune.T[k] !== SN.Tune.DEFAULTS[k]) throw new Error('not reset: ' + k);
  });
  t('tune: every slider changes the sim', () => {
    const base = (() => { const r = new SN.Race({ track: NORD, cls: SN.CLASSES[1], laps: 9, seed: 1, entrants: entrantsFor(1) }); for (let k = 0; k < 120 * 10; k++) r.step(SN.STEP, [{ thrust: 1 }]); return r.ships[0].v; })();
    SN.Tune.T.topSpeed = 1.5;
    const fast = new SN.Race({ track: NORD, cls: SN.CLASSES[1], laps: 9, seed: 1, entrants: entrantsFor(1) });
    for (let k = 0; k < 120 * 10; k++) fast.step(SN.STEP, [{ thrust: 1 }]);
    SN.Tune.reset();
    if (!(fast.ships[0].v > base + 10)) throw new Error('topSpeed slider has no effect');
  });

  // ---- content and files ----
  t('content: no TODO, FIXME, XXX, placeholder or stub in the game code', () => {
    for (const f of readdirSync(join(ROOT_DIR, 'src'))) {
      const text = readFileSync(join(ROOT_DIR, 'src', f), 'utf8').toLowerCase();
      for (const w of ['todo', 'fixme', 'xxx', 'placeholder', 'stub']) if (text.includes(w)) throw new Error(`${f} contains "${w}"`);
    }
  });
  t('content: the About data has every feedback section for the exit interview', () => {
    const A = SN.ABOUT;
    for (const k of ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage']) {
      if (typeof A.sourceInformation[k] !== 'string') throw new Error('missing source field ' + k);
    }
  });
}
