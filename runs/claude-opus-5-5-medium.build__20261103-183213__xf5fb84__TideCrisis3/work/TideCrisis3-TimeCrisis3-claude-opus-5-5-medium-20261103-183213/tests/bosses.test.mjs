import { simAt, run } from './lib.mjs';
// each boss: its phases advance on scripted damage to its parts, and it falls
export default async t => {
  const { TC, step } = t.load(); step(1.2);
  const hitAll = (sim, ids, n = 1) => { for (const pt of sim.boss.parts) if ((!ids || ids.includes(pt.id)) && pt.alive && !pt.hidden && pt.pos) TC.damageBoss(sim, pt, n, { p: sim.players[0], at: pt.pos, w: 'gl', blast: true }); };
  const drive = (sim, secs, f) => { for (let k = 0; k < secs * 60; k++) { run(sim, 1 / 60, { cover: false }); if (f) f(); if (sim.boss && sim.boss.defeated) break; } };
  for (const [st, sc] of [[1, '1-B'], [2, '2-B'], [3, '3-5'], [3, '3-6']]) {
    const sim = simAt(TC, st, sc); sim.cheats.god = true;
    t.check(sc + ': the boss starts', !!sim.boss, sim.phase);
    if (!sim.boss) continue;
    const id = sim.boss.id; run(sim, 3);
    if (id === 'stingray') { drive(sim, 40, () => hitAll(sim, ['turretL', 'turretR'], 1)); t.check('stingray: turrets down -> Barracuda', sim.boss.phase >= 2, sim.boss.phase); drive(sim, 60, () => hitAll(sim, ['barracuda'], .5)); }
    if (id === 'hammerhead') { drive(sim, 120, () => hitAll(sim, ['body', 'legs'], .3)); t.check('hammerhead lost his door below half', !sim.boss.shield || sim.boss.defeated); }
    if (id === 'scylla') { drive(sim, 120, () => hitAll(sim, null, 1)); }
    if (id === 'krake') {
      const until = (secs, f, stop) => { for (let k = 0; k < secs * 60 && !stop(); k++) { run(sim, 1 / 60, {}); f(); } };
      until(60, () => hitAll(sim, ['krake'], 1), () => sim.boss.final > 0);
      t.check('krake: the FINAL SHOT opens', sim.boss.final > 0, sim.boss.final);
      const w0 = sim.water; until(4, () => {}, () => sim.boss.final <= 0); run(sim, .2, {}); t.check('a missed FINAL SHOT raises the tide', sim.water > w0, sim.water - w0);
      until(60, () => hitAll(sim, ['krake'], 1), () => sim.boss.final > 0);
      TC.damageBoss(sim, sim.boss.part('lever'), 1, { p: sim.players[0], at: sim.boss.leverAt }); run(sim, .1, {});
    }
    t.check(sc + ': ' + id + ' is defeated', sim.boss && sim.boss.defeated, JSON.stringify(sim.boss && sim.boss.parts.map(p => p.id + ':' + p.hp.toFixed(1))));
    run(sim, 4); t.check(sc + ': the scene clears after the boss', sim.phase === 'clear' || sim.phase === 'results' || sim.phase === 'travel' || sim.phase === 'action' && sim.sceneId !== sc || sim.phase === 'cut', sim.phase + ' ' + sim.sceneId);
  }
  // mini-bosses
  const s13 = simAt(TC, 1, '1-3'); s13.cheats.god = true; s13.enemies = []; s13.waves.forEach((w, i) => { if (i === 0) w.fired = true; }); run(s13, 2); t.check('the Bulldog arrives after the first wave', s13.boss && s13.boss.id === 'bulldog');
  if (s13.boss) { TC.damageBoss(s13, s13.boss.part('tank'), 9, { p: s13.players[0], at: s13.boss.part('tank').pos }); t.check('its fuel tank blows it up', s13.boss.defeated); }
};
