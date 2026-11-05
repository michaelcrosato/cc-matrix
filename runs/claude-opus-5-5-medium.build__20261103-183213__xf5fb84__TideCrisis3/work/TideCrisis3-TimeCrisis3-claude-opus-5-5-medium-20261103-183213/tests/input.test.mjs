export default async t => {
  const { TC, step, game } = t.load(); step(1.2); const I = game.input;
  t.check('PlayStation glyphs by default: fire is R2', I.label('fire', 'gamepad') === 'R2', I.label('fire', 'gamepad'));
  t.check('PlayStation: cover is L2', I.label('cover', 'gamepad') === 'L2');
  t.check('PlayStation: confirm is ✕', I.label('confirm', 'gamepad') === '✕', I.label('confirm', 'gamepad'));
  game.settings.set('glyphs', 'xbox'); t.check('Xbox glyphs from the setting: fire is RT', I.label('fire', 'gamepad') === 'RT', I.label('fire', 'gamepad')); t.check('Xbox: confirm is A', I.label('confirm', 'gamepad') === 'A');
  game.settings.set('glyphs', 'playstation');
  t.check('keyboard and mouse: fire is Left click', /click/i.test(I.label('fire', 'mouse')), I.label('fire', 'mouse'));
  t.check('the wheel has readable labels', I.codeLabel('WheelUp') === 'Wheel up' && I.codeLabel('WheelDown') === 'Wheel down');
  // the pad curve and aim assist: friction near a target, magnetism only while the stick moves
  const sim = new TC.Sim({ mode: 'stage', stages: [1], stage: 1, scene: '1-1', skipCuts: true }); const A = new TC.Aimer(I, 0);
  I.lastDevice = 'gamepad'; I.padAim = [1, 0]; const vp = { x: 0, y: 0, w: 427, h: 240 };
  A.aim = [0, 0]; A.build(.1, sim, vp, [], {}); const free = A.aim[0];
  A.aim = [0, 0]; A.build(.1, sim, vp, [[.01, 0, .05]], { aimAssist: .85 }); const sticky = A.aim[0];
  t.check('aim assist slows the reticle over a target', sticky < free, free + ' vs ' + sticky);
  I.padAim = null; I.lastDevice = 'keyboard';
  t.check('targets never include civilians', (() => { sim.civilians = []; sim.enemies = []; sim.objects = []; sim.waves.forEach(w => { w.fired = true; }); TC.spawnCivilian(sim, { at: [150, 0, 0] }); sim.step(1 / 120, []); return sim.civilians.length === 1 && TC.assistTargets(sim, 0).length === 0; })());
};
