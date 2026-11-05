import { boot, suite } from './lib.mjs';
export default async () => {
  const S = suite('proof'), run = () => { const g = boot(); g.MT.newRun({ mode: 'test', seed: 7, players: [{ slot: 0, look: 0, ctl: 'bot' }, { slot: 1, look: 1, ctl: 'bot' }] }); g.game.go('play', { room: '1-1', noCard: true }); g.adv(30); return g.game.stateHash(); };
  const a = run(), b = run(); S.check('seed 7, room 1-1, 2 bots, 30 s: the same state hash twice', a === b && a !== 0, a + ' vs ' + b);
  return S;
};
