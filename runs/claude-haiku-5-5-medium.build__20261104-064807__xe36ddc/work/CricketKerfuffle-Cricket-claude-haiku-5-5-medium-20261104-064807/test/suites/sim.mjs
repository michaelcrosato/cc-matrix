// sim: CPU-versus-CPU matches on every ground finish with a result; the totals are plausible; no ball is in play for more
// than fifteen seconds; the scorecard adds up to the innings; the bowling and batting rules hold over a run.
import { loadSim } from '../lib.mjs';
export async function run({ check }) {
  const G = loadSim();
  const dt = 1 / 120;
  const coverage = {};
  for (const ground of ['green', 'hall', 'bay', 'dome']) {
    for (let seed = 1; seed <= 3; seed++) {
      const m = new G.Match({ overs: 2, wickets: 5, teams: [0, 1], ground, seed: seed * 31 + 5, autoBat: true, autoBowl: true, humanSides: [], kerf: true });
      let steps = 0, playStart = -1, prev = '', maxPlay = 0;
      while (m.phase !== 'end' && steps < 120 * 60 * 30) {
        m.update(dt); steps++;
        if (m.phase === 'play' && prev !== 'play') playStart = steps;
        if (m.phase !== 'play' && prev === 'play') maxPlay = Math.max(maxPlay, (steps - playStart) * dt);
        prev = m.phase;
      }
      const tag = ground + '/' + seed;
      check(`${tag} finishes with a result`, m.phase === 'end' && !!m.result, 'phase ' + m.phase);
      check(`${tag} no ball in play for more than 15 s`, maxPlay <= 15, maxPlay.toFixed(1));
      for (const inn of m.innings) {
        const sum = m.log.filter(r => r.inn === inn.k).reduce((s, r) => s + (r.ballRuns || 0), 0);
        check(`${tag} the scorecard adds up to the innings`, sum === inn.runs, `sum ${sum} vs ${inn.runs}`);
        check(`${tag} the innings total is plausible (0 to 120)`, inn.runs >= 0 && inn.runs <= 120, inn.runs);
      }
      for (const [k, v] of Object.entries(m.coverage)) coverage[k] = (coverage[k] || 0) + v;
    }
  }
  check('the bot matches include a four', (coverage.boundary || 0) > 0);
  check('the bot matches include a wicket', (coverage.wicket || 0) > 0);
  check('the bot matches include runs being run', (coverage.run || 0) > 0);
  // a Super Over: a tie goes to one over each, with two wickets
  const tie = new G.Match({ overs: 1, wickets: 2, teams: [0, 1], ground: 'green', seed: 77, autoBat: true, autoBowl: true, humanSides: [], kerf: false });
  let steps = 0;
  while (tie.phase !== 'end' && steps < 120 * 60 * 15) { tie.update(dt); steps++; }
  check('a one-over match finishes', tie.phase === 'end');
  // the hub's machine: a list of deliveries is bowled in order, the same for the same seed
  const mk = () => new G.Match({ overs: 1, wickets: 2, teams: [0, 3], ground: 'green', seed: 404, autoBat: true, autoBowl: false, humanSides: [], machine: ['express', 'bouncer', 'yorker'], deliveryRng: E_rng(5), kerf: false });
  const a = mk(), b = mk();
  for (let k = 0; k < 120 * 30 && a.log.length < 3; k++) { a.update(dt); }
  for (let k = 0; k < 120 * 30 && b.log.length < 3; k++) { b.update(dt); }
  check('a machine delivers its list in order', a.log.slice(0, 3).map(r => r.delivery).join() === 'express,bouncer,yorker', a.log.slice(0, 3).map(r => r.delivery).join());
  check('a seeded delivery stream gives the same speeds on every copy', a.log.slice(0, 3).map(r => r.kmh).join() === b.log.slice(0, 3).map(r => r.kmh).join());
}
function E_rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
