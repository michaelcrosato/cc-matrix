// features: doors, gates, locks, seals, secret walls, plates, darts, pits and trapdoors, teleporters, spinners, levers,
// buttons, catches, alcoves, candles in order, Great Locks
import { fresh, sim, at } from '../util.mjs';
export async function run(t) {
  const { B } = await fresh(), S = () => B.S, fl = () => B.S.floors[B.S.floor];
  at(B, 'f1', 2, 11, 1); B.update(1 / 120, [{ c: 'use' }]); sim(B, 1.2);
  t.check('a lever opens its gate', S().floors.f1.feats.LV1.on && fl().doors.G1.open > .9);
  B.update(1 / 120, [{ c: 'use' }]); sim(B, 1.2); t.check('pulled again, it closes it (toggle)', fl().doors.G1.open < .1);
  at(B, 'f1', 2, 4, 0); B.update(1 / 120, [{ c: 'use' }]); sim(B, .8); t.check('a wooden door opens with use', fl().doors.D1.open > .85);
  B.update(1 / 120, [{ c: 'use' }]); sim(B, .8); t.check('and closes', fl().doors.D1.open < .1);
  at(B, 'f1', 17, 4, 0); B.update(1 / 120, [{ c: 'use' }]); t.check('a locked door refuses without its key', fl().doors.L1.locked);
  B.S.party.members[0].pack[5] = B.mkItem('ironKey'); B.update(1 / 120, [{ c: 'use' }]); sim(B, .8);
  t.check('the key from a pack opens it, used up', !fl().doors.L1.locked && fl().doors.L1.open > .85 && !B.findItem(r => r.id === 'ironKey'));
  at(B, 'f1', 17, 4, 0, { party: [B.NPCS.tamsin] }); B.S.party.members[0].stats.dex = 18; let picked = false;
  for (let i = 0; i < 12 && !picked; i++) { B.update(1 / 120, [{ c: 'use' }]); picked = !fl().doors.L1.locked; }
  t.check('a thief picks a simple lock', picked);
  at(B, 'f1', 15, 13, 2, { party: [B.NPCS.tamsin] }); for (let i = 0; i < 10; i++) B.update(1 / 120, [{ c: 'use' }]);
  t.check('a warded lock refuses picks', fl().doors.L2.locked && S().log.some(l => /warded/.test(l.text)));
  at(B, 'f1', 9, 5, 0); B.update(1 / 120, [{ c: 'use' }]); sim(B, 1.5);
  t.check('a loose stone opens the secret wall', fl().doors.H1.open > .85 && S().secrets.closet);
  at(B, 'f1', 13, 6, 1); B.S.party.hand = B.mkItem('rock'); B.update(1 / 120, [{ c: 'putDown' }]); sim(B, 1.2);
  t.check('a rock put down on a plate holds its gate open', fl().plates.P1 && fl().doors.G2.open > .85);
  B.update(1 / 120, [{ c: 'pick', x: 14, y: 6, i: 0 }]); sim(B, 1.2); t.check('taken off, the hold plate lets the gate fall', !fl().plates.P1 && fl().doors.G2.open < .2);
  at(B, 'f1', 14, 10, 1); const hp0 = B.S.party.members.reduce((a, m) => a + m.hp, 0); B.update(1 / 120, [{ c: 'move', d: 'f' }]); sim(B, .4);
  t.check('a dart trap fires on entry', B.S.party.members.reduce((a, m) => a + m.hp, 0) < hp0 && S().log.some(l => /Darts/.test(l.text)));
  at(B, 'f1', 13, 10, 0); B.update(1 / 120, [{ c: 'use' }]); sim(B, 8); t.check('one button alone opens nothing', fl().doors.G4.want === 0);
  at(B, 'f1', 13, 10, 0); B.update(1 / 120, [{ c: 'use' }]); sim(B, 1); const P = B.S.party; P.cx = 18; P.cy = 10; P.dir = 2; B.update(1 / 120, [{ c: 'use' }]); sim(B, 1);
  t.check('both buttons within the window open the gate', fl().doors.G4.want === 1);
  at(B, 'f2', 4, 12, 0); B.S.party.hand = B.mkItem('rock'); B.update(1 / 120, [{ c: 'throw' }]); sim(B, 1.5);
  t.check('a throw flies over a pit onto a plate, which bridges the pit', fl().plates.P2 && fl().pits.O1.bridged);
  at(B, 'f2', 6, 10, 3); B.update(1 / 120, [{ c: 'move', d: 'f' }]); sim(B, 1.2);
  t.check('a trapdoor drops the party to the floor below', S().floor === 'f3' || (S().transit && S().transit.k === 'fall'));
  sim(B, 2.5); t.check('the fall lands in the Sump, hurt', S().floor === 'f3' && S().party.cx === 2 && S().party.cy === 15 && B.S.party.members.some(m => m.hp < m.max));
  at(B, 'f2', 19, 10, 2); B.update(1 / 120, [{ c: 'move', d: 'f' }]); sim(B, .5);
  t.check('a silent teleporter sends the party back', S().party.cx === 19 && S().party.cy === 5 && S().party.dir === 2 && fl().loops === 1);
  at(B, 'f2', 19, 8, 1); B.update(1 / 120, [{ c: 'use' }]); sim(B, .2); t.check('the catch turns the teleporter off', fl().tps.TP1 === false && S().secrets.catch);
  at(B, 'f2', 18, 13, 2); B.update(1 / 120, [{ c: 'move', d: 'f' }]); sim(B, .5); t.check('the spinner twists the party', S().log.some(l => /twisting/.test(l.text)) && fl().spinSeen);
  at(B, 'f2', 2, 9, 3); B.S.party.hand = B.mkItem('bentKey'); B.update(1 / 120, [{ c: 'use' }]); sim(B, 1.2);
  t.check('the riddle alcove takes a key, opens its gate and gives the key back', fl().doors.G6.open > .85 && B.S.party.hand && B.S.party.hand.id === 'bentKey');
  at(B, 'f2', 10, 15, 2); B.S.party.dir = 2; B.update(1 / 120, [{ c: 'use' }]); B.S.party.cx = 12; B.update(1 / 120, [{ c: 'use' }]); sim(B, 1.5);
  t.check('the levers set by the creed open the Tumbler Lock', fl().doors.G5.want === 1);
  at(B, 'f2', 9, 6, 1); B.update(1 / 120, [{ c: 'use' }]); t.check('a magic seal will not open by hand', fl().doors.M1.open === 0 && S().log.some(l => /runes/.test(l.text)));
  at(B, 'f3', 16, 1, 0); const order = [[16, 1, 0], [18, 1, 0], [16, 5, 2]];
  for (const [x, y, d] of order) { B.S.party.cx = x; B.S.party.cy = y; B.S.party.dir = d; B.update(1 / 120, [{ c: 'use' }]); }
  t.check('a candle out of order puts them all out', !fl().feats.C1.lit && S().log.some(l => /gutter/.test(l.text)));
  for (const [x, y, d] of [[16, 1, 0], [16, 5, 2], [18, 1, 0], [18, 5, 2], [20, 1, 0], [20, 5, 2]]) { B.S.party.cx = x; B.S.party.cy = y; B.S.party.dir = d; B.update(1 / 120, [{ c: 'use' }]); }
  t.check('the candles in order give the Robe and a deed', S().special.sq3 && (fl().items['18,3'] || []).some(i => i.id === 'robeOfTheLintel'));
  at(B, 'f1', 4, 5, 0); B.S.party.hand = B.mkItem('ratKingsCrown'); B.update(1 / 120, [{ c: 'use' }]);
  t.check('the crown in the Rat Shrine: a deed and a ring', S().special.sq1 && fl().feats.AL1.items.some(i => i.id === 'ringOfMending'));
  at(B, 'f2', 16, 1, 0); for (const [x, id] of [[16, 'CN1'], [17, 'CN2'], [19, 'CN3'], [20, 'CN4']]) { B.S.party.cx = x; B.S.party.hand = B.mkItem('tumblerGear'); B.update(1 / 120, [{ c: 'use' }]); }
  t.check('four gears make the clock chime: a deed and the goggles', S().special.sq2 && fl().feats.CF.items.some(i => i.id === 'tumblerwrightsGoggles'));
  at(B, 'f3', 12, 4, 2); for (const w of ['copperWard', 'brassWard', 'ironWard']) B.S.party.members[0].pack.push(B.mkItem(w)); for (const k of [0, 1, 2]) B.S.party.members[0].pack[9 + k] = B.mkItem(['copperWard', 'brassWard', 'ironWard'][k]);
  B.update(1 / 120, [{ c: 'use' }]); B.update(1 / 120, [{ c: 'use' }]); t.check('two wards in: no opening yet', !S().moment && fl().doors.U1.wards === 2);
  B.update(1 / 120, [{ c: 'use' }]); t.check('the third ward starts the Undergate moment', S().moment && S().moment.id === 'undergate');
  sim(B, 10.5); t.check('the Undergate opens', fl().doors.U1.open > .5 && !S().moment);
}
