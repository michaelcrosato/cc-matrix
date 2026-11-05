import { run } from './lib/t.mjs';
import { load } from './lib/load.mjs';
import { startSite, finishSite } from './lib/play.mjs';
run('sites-bugle', async t => {
  const L = load({}), X = L.game.debug.internals, D = L.game.debug;
  for (const id of X.reg('hunt', 'bugle').sites) for (const seed of [1, 2]) {
    let H = startSite(L, 'bugle', id, { seed }); D.bot(true, { skill: 'expert', cheat: true });
    const r = finishSite(L, H);
    t.ok(id + ' seed ' + seed + ': the cheat bot bags every buck', r.bagged === r.spawned && !r.escaped && !r.lost, JSON.stringify(r));
    t.ok(id + ' seed ' + seed + ': it ends early', r.reason === 'clear' && r.t < X.reg('site', id).time, JSON.stringify(r));
    t.ok(id + ' seed ' + seed + ': bucks scheduled = bucks spawned', r.spawned === r.scheduled, r.spawned + ' of ' + r.scheduled);
    if (seed === 1) {
      H = startSite(L, 'bugle', id, { seed }); const r2 = finishSite(L, H);
      t.ok(id + ': with no shots every buck gets away', r2.bagged === 0 && r2.escaped === r2.spawned && r2.spawned > 0, JSON.stringify(r2));
      H = startSite(L, 'bugle', id, { seed: 5 }); let doe = null;
      for (let k = 0; k < 700 && !doe; k++) { L.step(.1); doe = H.actors.find(a => a.cat === 'animal' && a.protected && a.alive && a.visible); }
      if (doe) { D.aimAt(1, doe, 'heart'); D.fire(1); L.step(.2); const r3 = finishSite(L, H); t.ok(id + ': a doe benches the hunter and ends the site', r3.benched && r3.reason === 'benched', JSON.stringify(r3)); }
      else t.ok(id + ': a doe shows up to test the rule', false, 'no visible doe');
    }
  }
  const P = X.regAll('critter').filter(c => c.protected).map(c => c.id);
  t.ok('critters: protected ones exist', P.includes('skunk') && P.includes('bessie') && P.includes('eagle') && P.includes('loon'));
  t.ok('no errors', !L.errs().length, L.errs().slice(0, 3).join(' | '));
});
