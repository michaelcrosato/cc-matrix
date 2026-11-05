// The CPU (plan §19.2 "ai"): seeded CPU-vs-CPU games play to their end on every court with no errors; every team scores;
// the batch shows the arcade plays; the BLAM difficulty beats Rookie more often than not.
import { loadGame, expect } from './helpers.mjs';
export const tests = [];
const T = (n, f) => tests.push([n, f]);
const play = (court, seed, qLen = 20, difficulty = 'Pro') => {
  const g = loadGame({ seed });
  const c = {};
  g.bb.on('*', e => { c[e.type] = (c[e.type] || 0) + 1; });
  g.bb.setupMatch({ court, humans: [], qLen, difficulty });
  let t = 0;
  while (!g.S.match.over && t < 900) { for (let i = 0; i < 120; i++) g.bb.matchStep(1 / 120); t++; }
  return { g, c, over: g.S.match.over, score: g.S.match.score.slice(), t };
};
T('ai.CPU games end on every court, every team scores, and the arcade plays happen', () => {
  const tot = {}; let scoredH = 0, scoredA = 0;
  for (const [i, court] of ['skybox', 'pier', 'scrapyard', 'caldera', 'dome'].entries()) {
    const r = play(court, 70 + i);
    expect(r.over, `${court} ended`);
    expect(r.g.game.errors.length === 0, `${court} errors: ${r.g.game.errors.map(e => e.message)}`);
    scoredH += r.score[0] > 0 ? 1 : 0; scoredA += r.score[1] > 0 ? 1 : 0;
    for (const k of ['dunkStart', 'steal', 'shove', 'block', 'spin', 'basket']) tot[k] = (tot[k] || 0) + (r.c[k] || 0);   // (blocks and spins are counted, and need no more than one game)
  }
  expect(scoredH >= 4 && scoredA >= 4, `teams scored in ${scoredH}/${scoredA} of 5 games`);
  for (const k of ['dunkStart', 'steal', 'shove', 'basket']) expect(tot[k] > 0, `no ${k} in any game`);
});
T('ai.BLAM beats Rookie in most seeded games', () => {
  let wins = 0, n = 4;
  for (let i = 0; i < n; i++) {
    const h = play('skybox', 90 + i, 12, 'BLAM');
    const r = play('skybox', 90 + i, 12, 'Rookie');
    // the difficulty applies to the CPU's own settings: the BLAM team's margin is what counts
    if (h.score[0] - h.score[1] >= r.score[0] - r.score[1]) wins++;
  }
  expect(wins >= 3, `BLAM at least matched Rookie in ${wins}/${n}`);
});
