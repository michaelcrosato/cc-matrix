// race: 8 AI on every track and class finish with few rescues and lap times near the ideal line; positions follow
// progress; wrong way; the final lap; the results; the same seed gives the same race; a replay re-sim gives the hash.
import { load } from '../lib/vm.mjs';
export async function run(T) {
  const { SN, game } = load({ quiet: true }); await game.booted;
  const U = 16, dt = 1 / 120;
  const runRace = (id, cls, seed, o = {}) => {
    const Tr = SN.getTrack(id), R = new SN.Race({ track: Tr, mode: 'race', cls, laps: o.laps || 1, seed, entrants: SN.field({ humans: o.humans || [], seed }), intro: false, rules: Object.assign({ rubberBand: false }, o.rules || {}), record: !!o.humans });
    const rescues = {}, stuck = {}; let n = 0, posBad = 0;
    while (R.state !== 'results' && n < 120 * 200) {
      if (o.humans) R.setControls(0, SN.AI.controls(R.player, R, { skill: 1, brain: 'bot' }));
      R.step(dt); n++;
      for (const e of R.events) if (e.t === 'rescue') rescues[e.ship.idx] = (rescues[e.ship.idx] || 0) + 1;
      if (n % 60 === 0 && R.state === 'racing') { const o2 = R.order.filter(s => !s.finished && !s.dnf); for (let k = 1; k < o2.length; k++) if (o2[k].p > o2[k - 1].p + 1) posBad++; }
      if (R.state === 'racing' && R.ships.every(s => s.finished || s.dnf)) R.seal();
    }
    return { R, rescues, posBad, n };
  };
  for (const id of SN.TRACK_ORDER) for (const cls of SN.CLASS_ORDER) for (const seed of [1, 2]) {
    const { R, rescues, posBad } = runRace(id, cls, seed, { rules: { weapons: false } });
    const tag = id + ' ' + cls + ' seed ' + seed, ideal = R.track.idealLap(cls), laps = R.ships.map(s => s.laps[0]).filter(x => x > 0);
    T.check(tag + ': every craft finishes', R.state === 'results' && R.ships.every(s => s.finished && !s.estimated), R.ships.filter(s => !s.finished || s.estimated).map(s => s.name));
    T.check(tag + ': at most 1 rescue a craft', Object.values(rescues).every(v => v <= 1), rescues);
    // lap 1 is a standing start: the ideal line's flying lap plus the launch
    T.check(tag + ': lap times within 25% of the ideal line', laps.length >= 7 && laps.every(l => l > ideal * .9 && l < ideal * 1.25 + 3), { ideal: ideal.toFixed(1), laps: laps.map(l => l.toFixed(1)) });
    T.check(tag + ': positions follow progress', posBad === 0, posBad);
  }
  // weapons on: an 8-AI race of 3 laps with every rule
  { const { R } = runRace('meridian', 'FLARE', 5, { laps: 2 }); T.check('a weapons race finishes and seals', R.state === 'results' && R.results().length === 8, R.state); }
  // determinism, and the replay
  { const a = runRace('karakum', 'FLARE', 9, { laps: 1, humans: [{ pilot: 'vale', team: 'kestrel' }] }), b = runRace('karakum', 'FLARE', 9, { laps: 1, humans: [{ pilot: 'vale', team: 'kestrel' }] });
    T.check('the same seed gives the same race', a.R.hash() === b.R.hash(), [a.R.hash(), b.R.hash()]);
    const v = SN.Replay.verify(a.R.recording); T.check('a replay re-sim gives the recorded hash', v.ok, [v.hash, v.want]); }
  // wrong way, the final lap
  { const Tr = SN.getTrack('solenne'), R = new SN.Race({ track: Tr, mode: 'race', cls: 'SPARK', laps: 2, seed: 1, entrants: [{ pilot: 'vale', team: 'kestrel', control: 'human', pi: 0 }], intro: false, flyingStart: true, rules: { weapons: false }, record: false });
    const s = R.player; s.putOn(Tr, 1000 * U, 0, 0); s.F = s.F.map(v => -v); s.R = s.R.map(v => -v); let wrong = false;
    for (let k = 0; k < 120 * 4; k++) { R.setControls(0, Object.assign(SN.Controls.blank(), { thrust: 1 })); R.step(dt); if (R.events.some(e => e.t === 'wrongway')) wrong = true; }
    T.check('driving the wrong way is called', wrong);
    const R2 = new SN.Race({ track: Tr, mode: 'race', cls: 'STORM', laps: 2, seed: 2, entrants: [{ pilot: 'vale', team: 'kestrel', control: 'human', pi: 0 }], intro: false, rules: { weapons: false }, record: false });
    let fin = false, last = false; for (let k = 0; k < 120 * 120 && !fin; k++) { R2.setControls(0, SN.AI.controls(R2.player, R2, { skill: 1, brain: 'bot' })); R2.step(dt); for (const e of R2.events) { if (e.t === 'finallap') last = true; if (e.t === 'finish') fin = true; } }
    T.check('the final lap is called, then the finish', last && fin, { last, fin }); }
  // the field: every team, the rival, the teammate, the player last
  { const f = SN.field({ humans: [{ pilot: 'vale', team: 'kestrel' }] }); const teams = new Set(f.map(e => e.team));
    T.check('the field has every team', teams.size === 6, [...teams]); T.check('the rival races', f.some(e => e.pilot === 'kaizero')); T.check('the teammate races', f.some(e => e.pilot === 'brekke')); T.check('the player starts last', f[f.length - 1].control === 'human'); }
  { const f = SN.field({ humans: [{ pilot: 'kaizero', team: 'nullset' }] }); T.check('NULL//SET\'s rival is Luca Ferrante', f.some(e => e.pilot === 'ferrante')); }
}
