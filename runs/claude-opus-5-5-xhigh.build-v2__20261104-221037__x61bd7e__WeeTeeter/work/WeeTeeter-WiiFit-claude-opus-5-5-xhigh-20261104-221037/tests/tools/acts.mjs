// Prints each activity/tier's pct for passive and bots over a few seeds. node tests/tools/acts.mjs [id]
import { load } from '../lib.mjs';
const { G, E, game, logs } = load({ draw: false });
const only = process.argv[2];
game.fadeTime = 0; game.advance(.1);
G.devMember(5); G.S.freePlay = true;
const runOne = (id, tier, skill, seed) => {
  const spec = skill ? { name: 'Bot', skill, local: true, look: G.S.look } : { name: 'Passive', local: true, look: G.S.look, input: game.input };
  const ctx = G.makeRun(id, { tier, seed, contestants: [spec], quiet: true });
  let n = 0;
  if (ctx.def.begin) ctx.def.begin(ctx);
  // the music clock needs game time to pass: advance the game with the run stepping in a scene hook
  while (!ctx.done && n < 200 * 120) { game.advance(1 / 120); G.stepRun(ctx, 1 / 120); n++; }
  return { pct: ctx.contestants[0].pct, stars: ctx.contestants[0].stars, t: ctx.time, detail: ctx.contestants[0].detail };
};
G.scenes.__idle = { update() {}, draw() {} };
game.scenes.__idle = G.scenes.__idle;
game.go('__idle', null, { fade: 0 }); game.advance(.1);
for (const id of G.order) {
  if (only && id !== only) continue;
  const def = G.activities[id];
  def.tiers.forEach((tr, tier) => {
    const row = [];
    for (const skill of [null, 'poor', 'average', 'good', 'expert']) {
      let p = 0, s = 0, t = 0, last; const N = 3;
      for (let seed = 1; seed <= N; seed++) { const r = runOne(id, tier, skill, seed * 31); p += r.pct; s += r.stars; t += r.t; last = r; }
      row.push((skill || 'pass') + ' ' + (p / N * 100).toFixed(0) + '%/' + (s / N).toFixed(1) + '★/' + (t / N).toFixed(0) + 's');
    }
    console.log((id + ':' + tier).padEnd(10), row.join('  '));
  });
}
const errs = game.errors.map(e => e.where + ': ' + e.message); if (errs.length) console.log('ERRORS', errs.slice(0, 5)); if (logs.length) console.log('LOGS', logs.slice(0, 6));
