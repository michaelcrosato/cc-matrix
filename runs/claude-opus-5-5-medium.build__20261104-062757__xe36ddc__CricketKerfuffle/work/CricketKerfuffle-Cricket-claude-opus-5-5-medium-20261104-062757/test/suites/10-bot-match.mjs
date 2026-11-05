// CPU vs CPU, 2 overs, on each ground and at each time of day: a result, plausible totals, nothing stuck
export default ({ boot, suite, until }) => {
  const s = suite(), { D, game } = boot();
  const grounds = ['green', 'hall', 'bay', 'downs', 'dome'], times = ['day', 'dusk', 'night'], teams = { green: ['ker', 'mud'], hall: ['gen', 'ker'], bay: ['lar', 'mag'], downs: ['mag', 'thr'], dome: ['thr', 'lar'] };
  const tot = { runs: 0, inns: 0, wk: 0, ex: 0, fours: 0, sixes: 0 };
  for (const g of grounds) for (const t of times) {
    const m = new D.Match({ mode: 'quick', teams: teams[g], ground: g, timeOfDay: t, overs: 2, wickets: 5, seed: g.length * 13 + t.length, humans: [[], []], kerfuffle: true, noReplays: true });
    let steps = 0, last = m.state, since = 0, stuck = null, ballStart = 0, longBall = 0;
    while (m.state !== 'over' && steps < 120 * 900) {
      m.update(1 / 120); steps++;
      if (m.state !== last) { if (last === 'between') ballStart = steps; if (m.state === 'dead') longBall = Math.max(longBall, (steps - ballStart) / 120); last = m.state; since = 0; } else if (++since > 120 * 30 && m.state !== 'break') { stuck = m.state; break; }
    }
    const ok = m.state === 'over' && m.result;
    s.ok(`${g}/${t}: the match finishes with a result`, ok, stuck ? 'stuck in ' + stuck : m.state);
    s.ok(`${g}/${t}: no ball takes longer than 20 s`, longBall < 20, longBall);
    for (const I of m.inn.filter(I => !I.so)) { tot.runs += I.runs; tot.inns++; tot.wk += I.wkts; tot.ex += I.extras.wd + I.extras.nb; tot.fours += I.fours; tot.sixes += I.sixes; s.ok(`${g}/${t}: an innings total is plausible (2-90)`, I.runs >= 2 && I.runs <= 90, I.runs); }
  }
  s.ok('across the grounds: fours, sixes and wickets all happen', tot.fours > 0 && tot.sixes > 0 && tot.wk > 0, tot);
  s.ok('extras are under 30% of the runs', tot.ex / Math.max(1, tot.runs) < .3, tot);
  s.ok('the run rate is arcade-lively (5 to 16 an over)', tot.runs / (tot.inns * 2) > 5 && tot.runs / (tot.inns * 2) < 16, (tot.runs / (tot.inns * 2)).toFixed(1));
  s.noErrors(game);
};
