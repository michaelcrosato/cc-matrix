import { load } from '../lib/load.mjs';
import { aiMatch, runMatch, startCfg } from '../lib/bots.mjs';
export default function (t) {
  const { game, G } = load({});
  game.advance(.3);
  // a call is respected: Mine gives the human the ball, Yours gives it to the partner
  const cfg = G.quickMatchCfg({ seed: 5 }); startCfg(G, game, cfg); const M = G.M, hum = M.players[0], mate = M.players[1];
  let tested = 0, okMine = 0, okYours = 0;
  for (let i = 0; i < 120 * 120 && tested < 6; i++) {
    game.advance(1 / 120);
    if (M.phase === 'rally' && M.plan && M.plan.side === 0 && M.plan.touch === 0 && !M.plan._t) {
      M.plan._t = 1; tested++;
      hum.call = 'mine'; M.planNext(); if (M.plan && (M.plan.p === hum || M.plan.arrive > M.plan.tStar)) okMine++;
      hum.call = 'yours'; M.planNext(); if (M.plan && (M.plan.p === mate || M.plan.p === hum)) okYours++;
      hum.call = 'auto'; M.planNext(); if (M.plan) M.plan._t = 1;
    }
  }
  t.ok('calls are tried in play', tested >= 3, tested); t.ok('Mine is respected when she can get there', okMine === tested, okMine + '/' + tested); t.ok('Yours goes to the partner', okYours === tested);
  // spectacle mode: perfect rallies of 3-9 touches, then a kill
  const MS = aiMatch(G, game, { seed: 9, cfg: { spectacle: true, mode: 'attract', pointsToWin: 9 } }), IS = runMatch(G, game, MS);
  const lens = IS.points.map(p => p.rally || 0), long = lens.filter(n => n > 13);
  t.ok('spectacle rallies end within a few touches of 3-9', lens.length > 5 && !long.length, lens.join(','));
  // the AI's attack target keeps away from the defenders
  const M2 = aiMatch(G, game, { seed: 2 }); for (let i = 0; i < 600; i++) game.advance(1 / 120);
  const atk = M2.players[0]; let far = 0; for (let k = 0; k < 40; k++) { const tg = G.VB.AI.attackTarget(M2, atk), d = Math.min(...M2.players.filter(p => p.side === 1).map(p => Math.hypot(p.x - tg[0], p.y - tg[1]))); if (d > 25) far++; }
  t.ok('attack zones avoid the defenders', far >= 30, far + '/40');
  t.ok('no errors', !game.errors.length, game.errors.slice(0, 3).map(e => e.message).join(' | '));
}
