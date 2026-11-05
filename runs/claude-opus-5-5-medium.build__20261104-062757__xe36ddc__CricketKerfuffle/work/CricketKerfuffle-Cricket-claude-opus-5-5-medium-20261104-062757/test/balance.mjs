// balance report (not a gate): CPU vs CPU per ground and difficulty: run rate, wickets an over, boundary share, extras
import { boot } from './lib.mjs';
const { D } = boot();
for (const diff of ['village', 'county', 'test']) for (const g of ['green', 'hall', 'bay', 'downs', 'dome']) {
  let runs = 0, overs = 0, wk = 0, bnd = 0, ex = 0, n = 0;
  for (let k = 0; k < 4; k++) {
    const m = new D.Match({ mode: 'quick', teams: ['ker', 'lar'], ground: g, overs: 2, wickets: 5, seed: 100 + k * 7 + g.length, humans: [[], []], kerfuffle: true, noReplays: true, difficulty: diff });
    let s = 0; while (m.state !== 'over' && s++ < 120 * 900) m.update(1 / 120);
    for (const I of m.inn.filter(I => !I.so)) { runs += I.runs; overs += I.legal / 6; wk += I.wkts; bnd += I.fours * 4 + I.sixes * 6; ex += I.extras.wd + I.extras.nb; n++; }
  }
  console.log(diff.padEnd(8), g.padEnd(6), 'rpo', (runs / overs).toFixed(1), 'wpo', (wk / overs).toFixed(2), 'bnd%', (100 * bnd / runs).toFixed(0), 'ex%', (100 * ex / runs).toFixed(0));
}
