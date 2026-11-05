import { load } from '../lib/load.mjs';
import { startSite } from '../lib/play.mjs';
const [hunt = 'bugle', id = 'duke'] = process.argv.slice(2);
const L = load({}), X = L.game.debug.internals, D = L.game.debug;
const H = startSite(L, hunt, id, { seed: 1, kind: 'trophy' }); D.bot(true, { skill: 'expert', cheat: true });
const bot = H.players[0].bot;
for (let t = 0; t < 60 && H.seg && H.seg.kind === 'trophy'; t += .5) {
  L.step(.5); const A = H.trophyActor, d = H.site.duke || H.site.mo || {};
  const [b, dd] = A ? H.world.bearingOf(H.vantageId, A.x, A.y) : [0, 0];
  console.log('t' + H.site.t.toFixed(1), 'phase', H.site.phase, 'A', A && A.state, 'b' + Math.round(b), 'd' + Math.round(dd), A && A.visible ? 'V' : '', 'calls', d.calls, 'open', d.open, 'charges', H.players[0].call.charges, 'shots', H.site.results[0].shots, 'tgt', bot.target && bot.target.kind);
}
console.log(L.errs());
