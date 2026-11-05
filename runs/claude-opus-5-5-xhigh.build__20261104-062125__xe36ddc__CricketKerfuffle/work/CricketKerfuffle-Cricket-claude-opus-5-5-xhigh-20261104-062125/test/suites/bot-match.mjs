import { load, until } from '../lib.mjs';
export async function run(check) {
  const { K } = load({ seed: 1 }); K.Tuning.persist = false;
  const pairs = [['ker', 'mud'], ['gen', 'lar'], ['mag', 'thr'], ['lar', 'ker'], ['thr', 'gen']];
  const cover = {}; let seed = 100;
  for (const g of K.GROUND_IDS) for (const tod of ['day', 'dusk', 'night']) {
    const m = new K.Match({ teams: pairs[seed % pairs.length], ground: g, overs: 2, wickets: 5, seed: seed++, timeOfDay: tod });
    let timeouts = [], maxBall = 0, ballT = 0, last = null; const offs = [K.bus.on('timeout', d => { if (d.match === m) timeouts.push(d.phase); }), K.bus.on('*', (d, t) => { if (d && d.match === m) cover[t] = (cover[t] || 0) + 1; })];
    m.start(); let t = 0;
    while (m.phase !== 'done' && t < 1500) { m.step(1 / 120); t += 1 / 120; if (m.phase === 'inPlay' || m.phase === 'flight') { if (last !== 'play') ballT = 0; ballT += 1 / 120; maxBall = Math.max(maxBall, ballT); last = 'play'; } else last = m.phase; }
    offs.forEach(f => f());
    const tag = g + '/' + tod;
    check(tag + ': the match finishes with a result', m.phase === 'done' && !!m.result, m.phase);
    for (const inn of m.innings) { const ex = inn.extras.wd + inn.extras.nb + inn.extras.b + inn.extras.lb; check(tag + ' inn ' + (m.innings.indexOf(inn) + 1) + ': a plausible total (0-90) and extras under 30%', inn.runs >= 0 && inn.runs <= 90 && (inn.runs < 10 || ex / inn.runs < .3), { runs: inn.runs, ex }); }
    check(tag + ': no director state hits its timeout', timeouts.length === 0, timeouts);
    check(tag + ': every ball in play ends within 15 s', maxBall <= 15.05, maxBall);
  }
  check('across the bot matches: fours, wickets and runs happen', cover.boundary > 0 && cover.wicket > 0 && cover.runs > 0, { b: cover.boundary, w: cover.wicket, r: cover.runs });
}
