// covers: src/modes/survival.js
import { ctx } from '../../src/ctx.js';
import { rivalRuns, places, rankChange, RANKS, startSurvival } from '../../src/modes/survival.js';
export default async T => {
  const { game, api } = await T.game(), P = ctx.profile; P.reset(); game.go('title', null, { fade: 0 }); game.advance(.1);
  const a = rivalRuns('dustbowl', 0, 0), b = rivalRuns('dustbowl', 0, 0);
  T.eq('rival runs are deterministic', a.map(v => v.steps), b.map(v => v.steps));
  T.check('every rival finishes', a.every(v => v.steps > 0));
  T.check('Bobo is the fastest base', a[2].steps <= a[0].steps, a.map(v => v.steps).join(','));
  T.eq('places: first', places(1, a)[0].who, 'you'); T.eq('places: DNF last', places(null, a)[3].who, 'you');
  T.eq('1st +2', rankChange(1), 2); T.eq('2nd +1', rankChange(2), 1); T.eq('3rd stays', rankChange(3), 0); T.eq('4th out', rankChange(4), null);
  T.eq('rank names', RANKS.join(' '), 'ROOKIE DRIVER RACER PILOT ACE MANIAC CRACKMANIAC');
  // a gauntlet driven by the bot: through the real cards and races
  const G = startSurvival('dustbowl'); let rounds = 0;
  for (let k = 0; k < 6 && G.alive; k++) {
    api.until(() => game.sceneName === 'race', 6); if (game.sceneName !== 'race') break;
    api.driveToFinish(90); api.until(() => game.sceneName === 'card', 6); game.advance(1); rounds++;
    if (G.round === 4 || !G.alive) { T.check('gauntlet over', true); break; }
    api.tap('confirm');
  }
  T.check('rounds driven', rounds >= 1, rounds);
  const rec = P.p.survival.dustbowl; T.check('best recorded', rec && rec.bestRound >= 1, JSON.stringify(rec));
  if (G.alive && G.round === 4) { T.check('cleared pays once', rec.cleared); }
  P.reset();
};
