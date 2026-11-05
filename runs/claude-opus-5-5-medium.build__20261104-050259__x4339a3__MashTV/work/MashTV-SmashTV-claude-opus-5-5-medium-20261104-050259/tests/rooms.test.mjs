import { suite, until } from './lib.mjs';
import { room } from './units.mjs';
export default async () => {
  const S = suite('rooms');
  let g = room({ waves: [{ at: 1, spawn: [['N', 'goon', 2]] }, { at: 5, left: 0, spawn: [['S', 'goon', 1]] }, { at: 3, spawn: [['E', 'goon', 1]] }], exits: { N: '1-2', E: '1-3' } }), MT = g.MT, W = g.W, c = g.c;
  c.godMode = true; W.contestants[0].ctl = 'none';
  until(g, () => W.phase === 'waves', 5, 1 / 120); g.adv(1.05); S.check('wave 1 at its time', W.waveIdx === 0); S.check('door opens for spawns', W.arena.doors.N.state !== 'closed');
  until(g, () => W.enemies.length === 2 && W.pending() === 0, 4, .05); for (const e of W.enemies) W.kill(e, c); g.adv(.3); S.check('"left" triggers the next wave early', W.waveIdx === 1, W.waveIdx);
  g.adv(3.2); S.check('"at" triggers a wave', W.waveIdx === 2, W.waveIdx);
  const m = W.spawnAt('mime', 50, 200, { placed: true }); g.adv(2); for (const e of W.enemies) if (e.kind !== 'mime') W.kill(e, c); const cash0 = c.cash; g.adv(1);
  S.check('CLEAR ignores mimes', W.phase === 'clear' || W.phase === 'exit', W.phase); S.check('the clear bonus', c.cash > cash0);
  g.adv(2); S.check('only the listed exits open', W.arena.doors.N.state === 'exit' && W.arena.doors.E.state === 'exit' && W.arena.doors.W.state !== 'exit');
  g.adv(25); let hurry = W.enemies.filter(e => e.kind === 'clapbot').length + W.arena.doors.S.queue.length + W.arena.doors.W.queue.length; S.check('HURRY UP after 25 s', hurry > 0);
  c.ctl = 'local'; c.x = 184; c.y = 30; MT.intentFrom = () => Object.assign(MT.NOINTENT(), { move: [0, -1] }); g.adv(1.5);
  S.check('an exit loads its room from the opposite door', MT.Show.state === 'map' || MT.Show.state === 'wipe' || (MT.Show.W.room.id === '1-2'), MT.Show.state);
  g.adv(4); S.check('the next room, entered from S', MT.Show.W.room.id === '1-2' && MT.Show.W.entry === 'S', MT.Show.W.room.id + ' ' + MT.Show.W.entry);
  // scaling
  MT.T.waveSize = 1; const one = MT.scaleN(10); MT.Show.W.contestants.push(new MT.Contestant(1, {})); const two = MT.scaleN(10); MT.T.waveSize = 2; const big = MT.scaleN(10); MT.T.waveSize = 1;
  S.check('scaling by players and the slider', two > one && big >= one * 2 - 1, [one, two, big].join(','));
  return S;
};
