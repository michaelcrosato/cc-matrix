export default async t => {
  const { TC, step, game } = t.load(); step(1.2); const scene = () => game.debug.snapshot().scene;
  step(9); t.check('9 s idle: still the title', scene() === 'title', scene());
  step(1.6); t.check('10 s idle: the attract demo', scene() === 'attract', scene());
  const s0 = TC.Attract.session; t.check('the demo plays with cheats and the bot', s0 && s0.sim.cheats.god && !!s0.bots[0]);
  step(6); t.check('the demo progresses', s0.sim.phase === 'action' || s0.sim.phase === 'clear' || s0.sim.phase === 'travel');
  game.input.tap('confirm'); step(.8); t.check('any input goes back to the title', scene() === 'title', scene());
  t.check('the input is consumed (not also a menu pick)', scene() !== 'menu');
  // the cycle over the playlist: demo -> scores -> demo -> title ...
  step(11); const i0 = TC.Attract.i; step(70); t.check('the playlist moves on', TC.Attract.i > i0, TC.Attract.i);
  t.check('every highlight resolves', Object.values(TC.REG.highlight).every(h => TC.REG.stage[h.stage].scenes.includes(h.scene)));
  t.check('no errors', !game.errors.length, game.errors.map(e => e.message).join('|'));
};
