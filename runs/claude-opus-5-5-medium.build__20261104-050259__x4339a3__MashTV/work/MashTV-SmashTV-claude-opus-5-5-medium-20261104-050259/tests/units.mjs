// shared setup for the small suites: a room with a contestant and nothing else happening
import { boot } from './lib.mjs';
export function room(o = {}) {
  const g = boot(o); const MT = g.MT;
  MT.newRun({ mode: 'test', seed: o.seed || 3, diff: o.diff || 'CONTESTANT', players: o.players || [{ slot: 0, look: 0, input: g.I }] });
  MT.ROOMS.TEST = { id: 'TEST', name: 'TEST ROOM', ep: 1, type: 'battle', waves: o.waves || [], exits: o.exits };
  g.game.go('play', { room: o.room || 'TEST', noCard: true }); g.adv(1.6);
  const W = MT.Show.W, c = W.contestants[0];
  return Object.assign(g, { W, c });
}
