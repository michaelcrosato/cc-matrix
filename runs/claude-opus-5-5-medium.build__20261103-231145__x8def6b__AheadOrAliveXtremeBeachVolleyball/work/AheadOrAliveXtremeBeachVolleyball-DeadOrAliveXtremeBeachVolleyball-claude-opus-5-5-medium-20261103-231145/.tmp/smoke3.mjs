import { load } from '../test/lib/load.mjs';
const { game, G } = load({ quiet: false });
game.advance(1);
const T = game.debug.tools; T.newVacation('rin', 3);
for (const mode of ['tut', 'ai']) {
  const cfg = G.vacationMatchCfg(['sonny', 'pepper'], { partner: 'mei', points: 7, base: [.2, .35], kits: ['house_sonny', 'pinstripe'], accs: [['aviators'], []] });
  cfg.cpuAll = true; cfg.after = (r) => { G.done = r; }; G.done = null;
  G.startMatch(cfg, { fade: 0 }); game.advance(.1);
  const whys = {}; G.bus.on('point', e => { const k = e.side + ':' + e.why; whys[k] = (whys[k] || 0) + 1; });
  for (let k = 0; k < 600 && !G.done; k++) game.advance(1);
  console.log(mode, G.done && G.done.finalScore, JSON.stringify(whys), 'rallies', G.M.rallies, 'longest', G.M.longest, game.errors.map(e=>e.message));
}
