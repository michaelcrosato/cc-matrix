// covers: src/modes/split.js, src/scenes/race.js (viewports, cameras, ghosts to each other)
import { ctx } from '../../src/ctx.js';
import { startSplit } from '../../src/modes/split.js';
import { len, sub } from '../../src/lib/v3.js';
export default async T => {
  const { game, api } = await T.game(); game.go('title', null, { fade: 0 }); game.advance(.1);
  for (const n of [2, 4]) {
    while (game.players.length < n) game.addPlayer(game.players.length === 1 ? { keys: 'right' } : { pad: game.players.length });
    startSplit({ inputs: game.players.slice(0, n), track: ctx.tracks.S2, bestOf: 1 });
    api.until(() => game.sceneName === 'race', 3);
    T.eq(n + ' players race', ctx.session.players.length, n);
    T.check(n + ' viewports', game._split && game._split.vps.length === n);
    T.check(n + ' cameras', ctx.worlds.world.cameras.length >= n);
    for (const P of ctx.session.players) P.bot = null;
    api.until(() => ctx.session.players[0].run.phase !== 'countdown' || false, 6);
    for (const P of ctx.session.players) { const { Plan, Bot } = await import('../../src/race/bot.js'); P.bot = new Bot(new Plan(ctx.session.course, P.model, 1), { cheat: false }); P.bot.relocate(P.run.car); }
    // the cars drive through each other: same start, no collisions
    game.advance(3); const A = ctx.session.players[0].run.car, B = ctx.session.players[1].run.car; T.check(n + ' cars are ghosts to each other', len(sub(A.p, B.p)) < 3, len(sub(A.p, B.p)).toFixed(2));
    T.check(n + ' every car finishes', api.until(() => ctx.session.players.every(P => P.run.finished), 60));
    T.check(n + ' results card', api.until(() => game.sceneName === 'card', 6), game.sceneName);
    game.advance(1); api.tap('confirm'); api.until(() => game.sceneName === 'menu', 3);
    T.check(n + ' split ends', !game._split);
  }
  while (game.players.length > 1) game.removePlayer(game.players.length);
};
