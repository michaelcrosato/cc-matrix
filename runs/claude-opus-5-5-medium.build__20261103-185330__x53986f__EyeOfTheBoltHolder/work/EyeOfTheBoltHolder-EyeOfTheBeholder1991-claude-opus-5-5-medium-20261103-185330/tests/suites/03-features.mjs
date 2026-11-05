// features: doors, gates, locks, seals, secrets, illusions, plates, traps, pits, teleporters, spinners, levers, buttons,
// alcoves, candles, the Tumbler Lock, gears and the clock, the Undergate, Great Locks
import { kit } from './simkit.mjs';
export default async check => {
  const { B, cmd, run, fresh, at } = await kit();
  let S = fresh('f1', [2, 11, 1], { noMons: true });
  cmd({ c: 'use' }, 1.5); check('a lever raises its gate', S.floors.f1.doors.G1.open > .85);
  cmd({ c: 'use' }, 1.5); check('the lever lowers it again (toggle)', S.floors.f1.doors.G1.open < .1);
  at(2, 4, 0); cmd({ c: 'use' }, .8); check('a wooden door opens', S.floors.f1.doors.D1.open > .85);
  // locks: no key; the key (used up); a thief's pick on a simple lock; warded refuses picks
  at(17, 4, 0); cmd({ c: 'use' }); check('a locked door without its key', S.floors.f1.doors.L1.locked && S.log.some(l => /locked/i.test(l.text)));
  B.giveParty(B.item('ironKey')); cmd({ c: 'use' }, 1.2); check('the key opens it and is used up', !S.floors.f1.doors.L1.locked && S.floors.f1.doors.L1.open > .5 && B.countItem('ironKey') === 0);
  B.joinNpc('tamsin'); at(15, 13, 2); for (let i = 0; i < 4; i++) cmd({ c: 'use' }); check('a warded lock refuses picks', S.floors.f1.doors.L2.locked && S.log.some(l => /warded/.test(l.text)));
  // secret wall via the loose stone, with XP; the illusion
  at(9, 5, 0); const xp0 = S.party.members[0].xp; cmd({ c: 'use' }, 1.6);
  check('the loose stone opens the secret wall', S.floors.f1.secrets.H1.open >= 1 && B.open('f1', 8, 4));
  check('a found secret gives XP', S.party.members[0].xp >= xp0 + 25);
  at(9, 8, 2); const sec = S.stats.secrets; cmd({ c: 'move', d: 'f' }, .6); check('the illusory wall walks like floor', S.party.cy === 9 && S.log.some(l => /illusion/.test(l.text)) && S.stats.secrets === sec + 1);
  // plates: held by an item put down, released when taken
  at(13, 6, 1); S.party.hand = B.item('rock'); cmd({ c: 'putDown' }, 1.4); check('a rock on the plate opens the gate', S.floors.f1.plates.P1.down && S.floors.f1.doors.G2.open > .85);
  cmd({ c: 'pick' }, 1.4); check('taking it back closes the gate', !S.floors.f1.plates.P1.down && S.floors.f1.doors.G2.want === 0);
  // buttons within the window, and too slow
  S = fresh('f1', [13, 10, 0], { noMons: true });
  cmd({ c: 'use' }, 7); at(18, 10, 2); cmd({ c: 'use' }); check('buttons too far apart fail', S.floors.f1.doors.G4.want === 0);
  at(13, 10, 0); cmd({ c: 'use' }, .5); at(18, 10, 2); cmd({ c: 'use' }, 1.2); check('buttons within the window open the gate', S.floors.f1.doors.G4.want === 1);
  // the dart trap
  at(14, 10, 1); const hp0 = S.party.members.reduce((n, m) => n + m.hp, 0); cmd({ c: 'move', d: 'f' }, .6);
  check('the dart trap fires', S.log.some(l => /Darts fly/.test(l.text)) && S.party.members.reduce((n, m) => n + m.hp, 0) < hp0);
  // the alcove: the crown completes the deed, the ring appears
  at(4, 5, 0); S.party.hand = B.item('ratKingsCrown'); cmd({ c: 'use' }); check('the Rat Shrine takes the crown: a deed', S.special.sq1 === 1 && S.floors.f1.feat.AL1.items.some(i => i.id === 'ringOfMending'));
  cmd({ c: 'use' }); check('the ring can be taken from the alcove', S.party.hand && S.party.hand.id === 'ringOfMending');
  // floor 2: the riddle returns its key; the Tumbler Lock; the silent teleporter and its catch; the spinner; pits
  S = fresh('f2', [2, 9, 3], { noMons: true });
  S.party.hand = B.item('bentKey'); cmd({ c: 'use' }, 1.2); check('the riddle alcove gives the key back and opens its gate', S.party.hand && S.party.hand.id === 'bentKey' && S.floors.f2.doors.G6.want === 1);
  at(10, 15, 2); cmd({ c: 'use' }); at(11, 15, 2); cmd({ c: 'use' }); at(12, 15, 2); cmd({ c: 'use' }); check('a wrong Tumbler set clatters', S.floors.f2.doors.G5.want === 0 && S.log.some(l => /tumblers clatter/.test(l.text)));
  at(11, 15, 2); cmd({ c: 'use' }, 1); check('the creed (down, up, down) opens the Tumbler Lock', S.floors.f2.doors.G5.want === 1, JSON.stringify([S.floors.f2.feat.LA.on, S.floors.f2.feat.LB.on, S.floors.f2.feat.LC.on]));
  B.drain(); if (S.talk) { while (S.talk) B.cmdTalk(S.talk.stage === 'choice' ? 'choose' : 'next', 0); }
  at(19, 10, 2); cmd({ c: 'move', d: 'f' }, .6); check('the silent teleporter loops', S.party.cx === 19 && S.party.cy === 5 && S.party.dir === 2);
  at(19, 8, 1); cmd({ c: 'use' }); at(19, 10, 2); cmd({ c: 'move', d: 'f' }, .6); check('the catch switches it off', S.party.cy === 11);
  at(17, 14, 1); const dirs = new Set(); for (let i = 0; i < 6; i++) { at(17, 14, 1); cmd({ c: 'move', d: 'f' }, .6); dirs.add(S.party.dir); } check('the spinner turns the party', dirs.size > 1);
  at(4, 12, 0); S.party.hand = B.item('rock'); cmd({ c: 'throw' }, 1.5); check('a rock thrown over the pit lands on the plate and bridges it', S.floors.f2.pits.O1.bridged);
  at(6, 10, 3); cmd({ c: 'move', d: 'f' }, .6); check('the trapdoor drops the party to the Sump', S.floor === 'f3' && S.party.cx === 2 && S.party.cy === 15);
  // the magic seal opens to the wand
  S = fresh('f2', [9, 6, 1], { noMons: true }); B.giveParty(B.item('wandUnlatching')); B.dispatch({ c: 'useItem', id: 'wandUnlatching' }); run(1.2);
  check('Unlatch (the wand) opens the magic seal', S.floors.f2.doors.M1.open > .85);
  // the clock: four gears, the goggles
  for (const [id, x] of [['CN1', 16], ['CN2', 17], ['CN3', 19], ['CN4', 20]]) { at(x, 1, 0); S.party.hand = B.item('tumblerGear'); cmd({ c: 'use' }); }
  check('four gears make the clock whole: a deed and the goggles', S.special.sq2 === 1 && S.floors.f2.feat.CF.items.some(i => i.id === 'tumblerwrightsGoggles'));
  // floor 3: candles in order and wrong; the Undergate
  S = fresh('f3', [16, 1, 0], { noMons: true });
  cmd({ c: 'use' }); at(18, 1, 0); cmd({ c: 'use' }); check('a wrong candle puts them all out', !S.floors.f3.feat.C1.on && !S.floors.f3.feat.C3.on);
  for (const [x, y, d] of [[16, 1, 0], [16, 5, 2], [18, 1, 0], [18, 5, 2], [20, 1, 0], [20, 5, 2]]) { at(x, y, d); cmd({ c: 'use' }); }
  check('the six candles in order: the robe on the altar', S.special.sq3 === 1 && B.itemsAt(18, 3).some(i => i.id === 'robeOfTheLintel'));
  at(12, 4, 2); for (const w of ['copperWard', 'brassWard', 'ironWard']) { S.party.hand = B.item(w); cmd({ c: 'use' }); }
  if (S.talk) while (S.talk) B.cmdTalk('next');
  run(5); check('three wards open the Undergate', S.wards === 3 && S.floors.f3.doors.U1.open > .85);
  // floor 4: a Great Lock takes two seconds
  S = fresh('f4', [3, 3, 3], { noMons: false }); for (const m of S.floors.f4.mons) if (m.type !== 'boltholder') m.hp = 0;
  cmd({ c: 'use' }, .3); while (S.talk) B.cmdTalk('next'); check('turning a Great Lock holds the party', S.party.lock > 0);
  run(2.2); check('the lock is turned', B.bossMon().boss.locks[0] === true);
};
