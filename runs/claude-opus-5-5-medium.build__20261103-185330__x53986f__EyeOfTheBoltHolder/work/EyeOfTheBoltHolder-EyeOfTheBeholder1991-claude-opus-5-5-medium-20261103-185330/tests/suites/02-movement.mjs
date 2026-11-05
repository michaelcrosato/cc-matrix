// movement: steps, turns, strafes, the buffer, bumps, arrival timing, stairs
import { kit } from './simkit.mjs';
export default async check => {
  const { B, cmd, run, fresh, at } = await kit();
  let S = fresh('f1', [2, 14, 0], { noMons: true });
  cmd({ c: 'move', d: 'f' }, .01); check('the cell changes when the step starts', S.party.cy === 13 && S.party.tween && S.party.tween.kind === 'step');
  run(.4); check('the step ends', !S.party.tween);
  cmd({ c: 'turn', s: -1 }); check('a turn faces west', S.party.dir === 3);
  cmd({ c: 'move', d: 'f' }); check('a wall bumps', S.party.cx === 2 && S.party.cy === 13, [S.party.cx, S.party.cy]);
  check('the bump says so', S.log.some(l => /can't go that way/.test(l.text)));
  cmd({ c: 'turn', s: 1 });
  B.update(1 / 120, [{ c: 'move', d: 'f' }]); B.update(1 / 120, [{ c: 'move', d: 'f' }]); run(1);
  check('one move is buffered during a step', S.party.cy === 11, S.party.cy);
  cmd({ c: 'move', d: 'r' }); check('a strafe into a wall bumps', S.party.cx === 2);
  at(5, 13, 1); cmd({ c: 'move', d: 'l' }, .6); check('strafing left from facing east goes north', S.party.cy === 12 && S.party.cx === 5);
  // stairs: the sealed up-stair, the down-stair to floor 2
  at(2, 14, 2); cmd({ c: 'move', d: 'f' }, .6); check('the sealed stair says so', S.log.some(l => /bolted fast/.test(l.text)) && S.floor === 'f1');
  S.floors.f1.doors.L2.locked = false; S.floors.f1.doors.L2.want = S.floors.f1.doors.L2.open = 1; at(15, 14, 2); cmd({ c: 'move', d: 'f' }, .6);
  check('the down-stair leads to floor 2', S.floor === 'f2' && S.party.cx === 2 && S.party.cy === 1, S.floor + ' ' + S.party.cx + ',' + S.party.cy);
  B.stepScale = 0; at(3, 1, 1); cmd({ c: 'move', d: 'f' }, .01); check('instant steps end at once', !S.party.tween && S.party.cx === 4); B.stepScale = 1;
  // a monster blocks
  S = fresh('f1', [2, 9, 0]); S.floors.f1.mons = []; B.spawnMon('f1', 'rat', 2, 8, {}); cmd({ c: 'move', d: 'f' });
  check('a monster blocks the way', S.party.cy === 9 && S.log.some(l => /blocks the way/.test(l.text)));
};
