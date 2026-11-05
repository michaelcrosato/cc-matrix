// movement: steps, turns, strafes, the buffer and repeat; bumps; the timing of arrival effects; stairs and the floor card
import { fresh, sim, at } from '../util.mjs';
export async function run(t) {
  const { B } = await fresh(), S = () => B.S;
  at(B, 'f1', 2, 14, 0);
  B.update(1 / 120, [{ c: 'move', d: 'f' }]);
  t.check('the cell changes as the step starts', S().party.cx === 2 && S().party.cy === 13 && !!S().party.tw);
  t.check('a plate is not pressed mid-step (arrival waits)', S().party.at === null);
  sim(B, .4); t.check('the step ends', !S().party.tw && S().party.at && S().party.at[1] === 13);
  B.update(1 / 120, [{ c: 'turn', s: 1 }]); sim(B, .3); t.check('a quarter turn right', S().party.dir === 1);
  B.update(1 / 120, [{ c: 'turn', s: -1 }]); B.update(1 / 120, [{ c: 'move', d: 'f' }]); t.check('a move during a turn is buffered', !!S().party.queued);
  sim(B, .7); t.check('the buffered step runs after the turn', S().party.cy === 12 && S().party.dir === 0);
  const before = [S().party.cx, S().party.cy];
  B.update(1 / 120, [{ c: 'move', d: 'l' }]); sim(B, .1); t.check('a wall bumps', S().party.cx === before[0] && S().party.bump > 0);
  t.check('a bump says so', S().log.some(l => /can't go that way/.test(l.text)));
  at(B, 'f1', 2, 11, 0); B.update(1 / 120, [{ c: 'move', d: 'f' }]); sim(B, .5);
  t.check('a closed gate blocks', S().party.cy === 11 && S().log.some(l => /will not budge/.test(l.text)));
  at(B, 'f1', 2, 14, 0); B.update(1 / 120, [{ c: 'move', d: 'b' }]); sim(B, .5);
  t.check('the sealed stair refuses', S().party.cy === 14 && S().log.some(l => /bolted fast/.test(l.text)));
  at(B, 'f1', 15, 14, 2); S().floors.f1.doors.L2.open = 1; S().floors.f1.doors.L2.want = 1; S().floors.f1.doors.L2.locked = false;
  B.update(1 / 120, [{ c: 'move', d: 'f' }]); sim(B, .4);
  t.check('the stairs start a floor change', !!S().transit && S().transit.k === 'stairs');
  sim(B, .6); t.check('the floor changes behind the fade', S().floor === 'f2' && S().party.cx === 2 && S().party.cy === 1 && S().party.dir === 1);
  sim(B, 2); t.check('the card ends', !S().transit);
  at(B, 'f1', 2, 13, 0); B.stepMode = 'instant'; B.update(1 / 120, [{ c: 'move', d: 'f' }]);
  t.check('instant steps arrive at once', !S().party.tw && S().party.at && S().party.at[1] === 12); B.stepMode = 'smooth';
  at(B, 'f1', 2, 13, 0); B.T.stepT = .1; B.update(1 / 120, [{ c: 'move', d: 'f' }]); sim(B, .12); t.check('the Step time slider times a step', !S().party.tw); B.tuneDefaults();
  at(B, 'f1', 9, 8, 2); B.update(1 / 120, [{ c: 'move', d: 'f' }]); sim(B, .4);
  t.check('an illusory wall walks like floor', S().party.cy === 9 && S().log.some(l => /illusion/.test(l.text)) && S().secrets.I1);
}
