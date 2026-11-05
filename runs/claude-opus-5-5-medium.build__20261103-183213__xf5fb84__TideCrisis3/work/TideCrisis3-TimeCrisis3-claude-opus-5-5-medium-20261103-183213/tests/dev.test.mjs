export default async t => {
  const { TC, step, game } = t.load(); step(1.2);
  game.go('play', { mode: 'stage', stages: [1], difficulty: 'normal', noBrief: true, skipCuts: true, seed: 2 }); step(.8);
  const D = TC.dev; D.open(TC.play); t.check('the panel opens', D.isOpen);
  let tabs = 0;
  for (let tab = 0; tab < 6; tab++) { D.tab = tab; const items = D.items(); tabs++;
    for (const it of items) if (it.path) { const before = TC.tget(it.path); D.adjust(it, 1); const after = TC.tget(it.path); t.check('dev ' + it.label + ' changes ' + it.path, before !== after || (it.kind === 'slider' && before === it.max), before + ' -> ' + after); }
  }
  D.tab = 0; D.i = D.items().findIndex(i => i.kind === 'reset'); game.input.tap('confirm'); step(1 / 60); game.input.tap('confirm'); step(1 / 60);
  t.check('RESET ALL restores TUNE exactly', JSON.stringify(TC.tune()) === JSON.stringify(TC.TUNE));
  D.tab = 5; const acts = D.items(), sim = TC.play.s.sim;
  const run = label => { const it = acts.find(a => a.label.startsWith(label)); it.run(); step(.05); };
  run('Kill all'); t.check('Kill all', sim.enemies.every(e => e.dead));
  run('All weapons'); t.check('All weapons and full ammo', sim.players[0].ammo.gl === 6);
  const l = sim.players[0].lives; run('+1 life'); t.check('+1 life', sim.players[0].lives === l + 1);
  run('Next scene'); t.check('Next scene', sim.sceneId === '1-2', sim.sceneId);
  run('Trigger a threat'); t.check('Trigger a threat on me', sim.threats.some(x => !x.done));
  run('Add a P2 bot'); t.check('Add a P2 bot', sim.players.length === 2); run('Add a P2 bot'); t.check('and remove it', sim.players.length === 1);
  run('Bot plays'); t.check('Bot plays', !!TC.play.s.bots[0]);
  D.jumpI = D.jumps().findIndex(j => j.label.includes('2-B')); D.tab = 5; D.items().find(a => a.list === 'jump').run(); step(.1); t.check('Jump to any scene', sim.sceneId === '2-B', sim.sceneId);
  D.close(); t.check('no errors', !game.errors.length, game.errors.map(e => e.message).join('|'));
};
