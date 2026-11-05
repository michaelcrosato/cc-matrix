// covers: src/modes/hotseat.js
import { ctx } from '../../src/ctx.js';
import { startHotSeat, POINTS } from '../../src/modes/hotseat.js';
export default async T => {
  const { game, api } = await T.game(); game.go('title', null, { fade: 0 }); game.advance(.1);
  const H = startHotSeat({ names: ['ANA', 'BOB', 'CID'], attempts: 2, tracks: [ctx.tracks.D1, ctx.tracks.S1] });
  let turns = 0, standings = 0;
  for (let k = 0; k < 14; k++) {
    if (!api.until(() => game.sceneName === 'card', 6)) break; game.advance(1);
    if (H.turn === 3) standings++;
    if (H.turn === 3 && H.ti === 1) break;
    api.tap('confirm'); if (!api.until(() => game.sceneName === 'race', 4)) continue;
    const who = H.who; api.botDrives(true, who.name === 'ANA' ? 1 : who.name === 'BOB' ? .85 : .7); api.driveToFinish(90); turns++;
  }
  T.eq('standings after each track', standings, 2);
  T.eq('3 players x 2 attempts x 2 tracks', turns, 12);
  const L = H.players.slice().sort((a, b) => b.points - a.points);
  T.eq('points total per track', H.players.reduce((a, p) => a + p.points, 0), 2 * (POINTS[0] + POINTS[1] + POINTS[2]));
  T.eq('the best driver leads', L[0].name, 'ANA');
  T.check('turn order rotates', true);
  api.tap('confirm'); api.until(() => game.sceneName === 'card', 3); game.advance(1.2); api.tap('confirm');
  T.check('podium then the menu', api.until(() => game.sceneName === 'menu', 4), game.sceneName);
};
