import { load } from '../lib/load.mjs';
import { startSite } from '../lib/play.mjs';
const [hunt = 'hollow', id = 'hollow-1'] = process.argv.slice(2);
const L = load({}), X = L.game.debug.internals, D = L.game.debug;
const H = startSite(L, hunt, id, { seed: 1 }); D.bot(true, { skill: 'expert', cheat: true });
const bot = H.players[0].bot;
for (let t = 0; t < 70 && H.seg && H.seg.kind === 'site'; t += .5) {
  L.step(.5);
  const bucks = H.site.bucksSpawned.map(a => { const [b, d] = H.world.bearingOf(H.vantageId, a.x, a.y); return a.state + ' b' + Math.round(b) + ' d' + Math.round(d) + (a.visible ? ' V' : '') + (a === bot.target ? ' T' : ''); });
  console.log('t' + H.site.t.toFixed(1), 'camB', H.site.camB.toFixed(1), 'tgt', bot.target ? bot.target.kind : '-', 'lock', bot.lock.toFixed(2), 'rx', Math.round(H.players[0].rx), 'shots', H.site.results[0].shots, '|', bucks.join(' ; '));
}
