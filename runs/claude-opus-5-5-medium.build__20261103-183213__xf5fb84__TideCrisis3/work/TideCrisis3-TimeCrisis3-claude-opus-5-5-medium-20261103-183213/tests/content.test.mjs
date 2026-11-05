// content: the registry validators, and per scene: every cover point's exposed head on screen and shootable from
// slot 1's stand pose; every scene starts headless; arrive paths are continuous
export default async t => {
  const { E, game, TC, step } = t.load();
  step(1.2);
  const errs = TC.validate();
  t.check('registry validators pass', !errs.length, errs.join('; '));
  for (const st of Object.values(TC.REG.stage)) for (const sc of st.scenes) {
    const sim = new TC.Sim({ mode: 'stage', stages: [st.id], stage: st.id, scene: sc, skipCuts: true, seed: 1 });
    // jump past the arrival so slots and carriers are at their action pose
    for (let k = 0; k < 120 * 12 && sim.phase === 'travel'; k++) sim.step(1 / 120, []);
    const ge = TC.validateScene(sim);
    t.check('scene ' + sc + ': covers visible and shootable', !ge.length, ge.join('; '));
    const scene = TC.REG.scene[sc];
    if (scene.arrive) { const p = scene.arrive.path; let bad = 0; for (let i = 1; i < p.length; i++) if (Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1], p[i][2] - p[i - 1][2]) > 900) bad++; t.check('scene ' + sc + ': arrive path continuous', !bad, bad + ' long jumps'); }
  }
  t.check('rig head height is 24-30 u', TC.RIGH.head >= 24 && TC.RIGH.head <= 30, TC.RIGH.head);
  t.check('no errors', !game.errors.length, game.errors.map(e => e.message).join(' | '));
};
