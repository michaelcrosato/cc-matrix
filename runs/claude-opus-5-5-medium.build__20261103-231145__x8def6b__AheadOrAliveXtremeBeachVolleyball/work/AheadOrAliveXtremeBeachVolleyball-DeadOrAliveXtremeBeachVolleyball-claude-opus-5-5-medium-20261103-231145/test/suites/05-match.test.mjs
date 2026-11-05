import { load } from '../lib/load.mjs';
import { runMatch } from '../lib/bots.mjs';
const teams = () => [[{ id: 'rin', suit: 'seigaiha', acc: [] }, { id: 'lola', suit: 'estrella', acc: [] }], [{ id: 'tess', suit: 'reefbreak', acc: [] }, { id: 'mei', suit: 'peony', acc: [] }]];
export default async t => {
  const { G, game } = load(); game.advance(.5);
  let totalR = 0, totalT = 0, fin = 0, scores = [];
  for (let seed = 1; seed <= 6; seed++) {
    G.seed('match', seed); const o = {}; const { res, stuck } = runMatch(game, G, { mode: 'exhibition', cpuAll: true, pointsToWin: 7, replays: seed % 2 === 0, teams: teams() }, o);
    if (res) { fin++; totalR += res.rallies; scores.push(res.finalScore.join('-')); }
    t('AI vs AI seed ' + seed + ' finishes', !!res); t('seed ' + seed + ' no phase stuck over 40 s', stuck < 40, stuck); if (res) totalT += res.players.reduce((a, p) => a + p.stats.touches, 0); t('seed ' + seed + ' ball never NaN', !o.nan);
    if (res) { const pts = res.players.filter(p => p.side === res.winner).reduce((a, p) => a + p.stats.points, 0); t('seed ' + seed + ' earned points add up within the score', pts <= Math.max(...res.finalScore)); }
  }
  t('rallies average 3-8 touches (the plan\'s target)', totalR && totalT / totalR >= 3 && totalT / totalR <= 8, (totalT / totalR).toFixed(1));
  G.seed('match', 3); const a = runMatch(game, G, { mode: 'exhibition', cpuAll: true, pointsToWin: 5, replays: false, teams: teams() }).res;
  G.seed('match', 3); const b = runMatch(game, G, { mode: 'exhibition', cpuAll: true, pointsToWin: 5, replays: false, teams: teams() }).res;
  t('same seed, same score', a && b && a.finalScore.join() === b.finalScore.join() && a.rallies === b.rallies, a && b && a.finalScore + ' vs ' + b.finalScore);
  // an idle human loses; a perfect bot beats Easy CPUs
  G.game.settings.set('difficulty', 'Easy');
  const idle = runMatch(game, G, { mode: 'exhibition', pointsToWin: 7, difficulty: 'Easy', teams: [[{ id: 'rin', suit: 'seigaiha', acc: [], input: game.input }, { id: 'lola', suit: 'estrella', acc: [], base: .3 }], [{ id: 'tess', suit: 'reefbreak', acc: [], base: .5 }, { id: 'mei', suit: 'peony', acc: [], base: .5 }]] }).res;
  t('an idle human loses', idle && idle.winner === 1, idle && idle.finalScore);
  let wins = 0; for (let s = 0; s < 3; s++) { G.seed('match', 40 + s); const r = runMatch(game, G, { mode: 'exhibition', pointsToWin: 7, difficulty: 'Easy', teams: [[{ id: 'rin', suit: 'seigaiha', acc: [], input: game.input }, { id: 'lola', suit: 'estrella', acc: [], base: .5 }], [{ id: 'tess', suit: 'reefbreak', acc: [], base: .4 }, { id: 'mei', suit: 'peony', acc: [], base: .4 }]] }, { bot: true }).res; if (r && r.winner === 0) wins++; }
  t('a perfect bot beats Easy (2 of 3 or better)', wins >= 2, wins);
  // the final's Golden Glare hides the ring for a receiver without sunglasses
  const M = new G.Match({ mode: 'final', specials: { glare: true }, teams: [[{ id: 'rin', suit: 'seigaiha', acc: [], input: game.input }, { id: 'lola', suit: 'estrella', acc: [] }], [{ id: 'sonny', suit: 'house_sonny', acc: ['aviators'] }, { id: 'pepper', suit: 'pinstripe', acc: [] }]] });
  t('glare flags shades', !M.players[0].rig.acc.some(a => G.ITEMS[a].shades) && M.players[2].rig.acc.some(a => G.ITEMS[a].shades));
  t('no errors in matches', game.errors.length === 0, game.errors.map(e => e.message + ' ' + (e.stack || '').split('\n')[1]).join(' | '));
};
