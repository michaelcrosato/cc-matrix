// items: equip rules, pack moves, the Hand (take, stow, put down, throw), use (eat, drink, read), rust, thieves' loot
import { fresh, sim, at } from '../util.mjs';
export async function run(t) {
  const { B } = await fresh(), S = () => B.S;
  at(B, 'f1', 2, 13, 0); const P = S().party, br = P.members[0], od = P.members[3];
  B.update(1 / 120, [{ c: 'pick', x: 2, y: 13, i: 0 }]); t.check('pick takes an item here into the Hand', P.hand && P.hand.id === 'rustyDagger');
  B.update(1 / 120, [{ c: 'use' }]); t.check('use with the Hand and nothing ahead stows it', !P.hand && P.members.some(m => m.pack.some(i => i && i.id === 'rustyDagger')));
  B.update(1 / 120, [{ c: 'use' }]); t.check('use takes the top item ahead (the rock)', P.hand && P.hand.id === 'rock');
  B.update(1 / 120, [{ c: 'putDown' }]); t.check('put down sets it ahead', !P.hand && B.itemsAt(2, 12).some(i => i.id === 'rock'));
  P.hand = B.mkItem('longSword'); B.update(1 / 120, [{ c: 'inv', op: 'place', m: 3, slot: 'main' }]); t.check('a mage cannot wield a long sword', P.hand && P.hand.id === 'longSword');
  B.update(1 / 120, [{ c: 'inv', op: 'place', m: 0, slot: 'head' }]); t.check('a sword does not go on a head', P.hand.id === 'longSword');
  P.hand = B.mkItem('lockbreaker'); B.update(1 / 120, [{ c: 'inv', op: 'place', m: 0, slot: 'main' }]); t.check('a two-handed axe needs the off hand free', P.hand.id === 'lockbreaker');
  B.update(1 / 120, [{ c: 'inv', op: 'take', m: 0, slot: 'off' }]); t.check('the Hand is busy, so the shield stays', br.slots.off && br.slots.off.id === 'woodenShield');
  P.hand = null; B.update(1 / 120, [{ c: 'inv', op: 'take', m: 0, slot: 'off' }]); B.update(1 / 120, [{ c: 'inv', op: 'place', m: 0, slot: 0 }]);
  P.hand = B.mkItem('lockbreaker'); B.update(1 / 120, [{ c: 'inv', op: 'place', m: 0, slot: 'main' }]); t.check('with the off hand empty it swaps into the main hand', br.slots.main.id === 'lockbreaker' && P.hand.id === 'longSword');
  P.hand = B.mkItem('arrows', 5); const q = P.members[1].slots.quiver.n; B.update(1 / 120, [{ c: 'inv', op: 'place', m: 1, slot: 'quiver' }]); t.check('ammo stacks into the quiver', !P.hand && P.members[1].slots.quiver.n === q + 5);
  br.food = 40; br.pack[3] = B.mkItem('ration'); B.update(1 / 120, [{ c: 'useItem', m: 0, slot: 3 }]); t.check('eating a ration feeds', br.food > 89.9 && !br.pack[3]);
  br.hp = 2; br.pack[3] = B.mkItem('potionHealing'); B.update(1 / 120, [{ c: 'useItem', m: 0, slot: 3 }]); t.check('a potion heals', br.hp > 2 && S().stats.potions === 1);
  od.pack[4] = B.mkItem('tornPage'); const ev = []; B.update(1 / 120, [{ c: 'useItem', m: 3, slot: 4 }]); t.check('reading a note keeps it in the notes', S().notes.includes('tornPage'));
  at(B, 'f1', 2, 11, 0); P2(B).hand = B.mkItem('rock'); B.update(1 / 120, [{ c: 'throw' }]); sim(B, 1);
  t.check('a thrown thing stops before a closed gate', B.itemsAt(2, 11).some(i => i.id === 'rock'));
  at(B, 'f1', 2, 8, 0); const fl = S().floors.f1; const rat = fl.mons.find(m => m.type === 'rat' && m.cx === 3);
  rat.cx = 2; rat.cy = 6; P2(B).hand = B.mkItem('handAxe'); B.CHEATS.oneHit = true; B.update(1 / 120, [{ c: 'throw' }]); sim(B, .6); B.CHEATS.oneHit = false;
  t.check('a thrown weapon hits the first monster and drops there', B.itemsAt(2, 6).some(i => i.id === 'handAxe') || B.itemsAt(2, 7).some(i => i.id === 'handAxe'));
  at(B, 'f2', 10, 3, 0); const w = S().party.members[0].slots.main; w.rust = 0; const sp = B.spawnMon(S().floors.f2, 'rustling', 10, 2, {}); let rusted = false;
  for (let i = 0; i < 400 && !rusted; i++) { sp.atkT = 0; sp.re = 0; sim(B, .7); rusted = (w.rust || 0) > 0; S().party.members.forEach(m => { m.hp = m.max; m.state = 'ok'; }); }
  t.check('a Rustling can rust a metal weapon', rusted);
  at(B, 'f1', 3, 2, 3); const lk = S().floors.f1.mons.find(m => m.type === 'latchkin'); lk.cx = 2; lk.cy = 2; S().party.members.forEach(m => { m.pack[8] = B.mkItem('ration'); }); let stole = false;
  for (let i = 0; i < 600 && !stole; i++) { lk.atkT = 0; lk.re = 0; lk.flee = 0; sim(B, .6); stole = lk.stole.length > 0; S().party.members.forEach(m => { m.hp = m.max; m.state = 'ok'; }); if (lk.hp <= 0) break; }
  t.check('a Latchkin steals', stole);
  if (stole) { B.killMon(lk); t.check('what it stole drops when it dies', B.itemsAt(lk.cx, lk.cy).some(i => i.id === 'ration')); }
}
const P2 = B => B.S.party;
