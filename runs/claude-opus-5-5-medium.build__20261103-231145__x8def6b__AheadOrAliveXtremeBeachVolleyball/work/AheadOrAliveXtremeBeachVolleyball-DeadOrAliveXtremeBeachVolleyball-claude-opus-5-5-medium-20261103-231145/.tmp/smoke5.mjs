import { load } from '../test/lib/load.mjs';
const { game, G } = load({ quiet: false });
game.advance(1);
const T = game.debug.tools; T.newVacation('rin', 3);
const agg = {}; let W = [0, 0];
for (let run = 0; run < 6; run++) {
  G.seed('match', 100 + run);
  const cfg = G.vacationMatchCfg(['sonny', 'pepper'], { partner: 'mei', points: 7, base: [.2, .35], kits: ['house_sonny', 'pinstripe'], accs: [['aviators'], []] });
  cfg.cpuAll = true; cfg.after = (r) => { G.done = r; }; G.done = null; cfg.replays = false;
  G.startMatch(cfg, { fade: 0 }); game.advance(.1); const M = G.M;
  const off = G.bus.on('point', e => { const L = M.L, lt = M.lastTouch; const k = 'W' + e.side + ' ' + e.why + ' ' + (L && L.kind) + ' byS' + (L ? L.side : '-') + ' lt' + (lt ? lt.side : '-'); agg[k] = (agg[k] || 0) + 1; });
  for (let k = 0; k < 600 && !G.done; k++) game.advance(1);
  off(); W[G.done.winner]++;
}
console.log('wins', W); console.log(Object.entries(agg).sort((a, b) => b[1] - a[1]).map(x => x.join(': ')).join('\n'));
