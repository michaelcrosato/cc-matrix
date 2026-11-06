import { CaseGrid, makeItem, footprint } from '../../src/game/caseModel.js';
import { Run } from '../../src/core/run.js';
import { lyingAmmo, rollLoot } from '../../src/game/loot.js';
import { Rng } from '../../pixel-engine.js';

export default async function (t) {
  const c = new CaseGrid(10, 6);
  const gun = makeItem('rifle');
  t.ok(c.add(gun), 'rifle fits');
  t.eq(footprint(gun).join(), '8,2', 'rifle footprint');
  gun.rot = true;
  t.ok(!c.fits(gun, 0, 0), 'rotated rifle (2x8) does not fit a 6-high case');
  gun.rot = false;
  const a = makeItem('harpoon');
  t.ok(c.add(a), 'harpoon fits under the rifle');
  const b = makeItem('scatter');
  t.ok(c.add(b), 'scattergun fits third row');
  const d = makeItem('rifle');
  t.ok(!c.add(d), 'no room for another rifle: overflow');
  t.eq(c.items.length, 3, 'three items placed');
  t.ok(c.remove(b), 'remove works');
  const stack = new CaseGrid(10, 6);
  t.eq(stack.addStack('ammoPistol', 120), 0, 'stacks split into boxes');
  t.eq(stack.all('ammoPistol').length, 3, 'three boxes for 120 rounds');
  t.eq(stack.takeStack('ammoPistol', 60), 60, 'takes across stacks');
  t.eq(stack.count('ammoPistol'), 60, 'count after take');
  // Arrange packs what first-fit in a bad order wouldn't.
  const msg = new CaseGrid(10, 6);
  for (const [id, x, y] of [['samphire', 0, 0], ['samphire', 3, 2], ['ammoPistol', 8, 5], ['scatter', 1, 4]]) msg.place(makeItem(id), x, y);
  t.ok(msg.arrange(), 'arrange succeeds');
  t.eq(msg.items.length, 4, 'arrange keeps all items');
  const big = makeItem('rifle');
  t.ok(msg.fits(big, 0, 2) || msg.findSpot(big), 'arrange frees room for a rifle');
  // Combine.
  const h = new CaseGrid(10, 6);
  const s1 = makeItem('samphire'); const s2 = makeItem('samphire'); const s3 = makeItem('samphire'); const du = makeItem('dulse'); const ho = makeItem('holly');
  for (const i of [s1, s2, s3, du, ho]) h.add(i);
  const mix = h.combine(s1, s2);
  t.eq(mix.id, 'mixS2', 'S+S gives 60%');
  const triple = h.combine(mix, s3);
  t.eq(triple.id, 'mixS3', 'S+S+S gives 100%');
  t.eq(h.combine(triple, ho), null, 'no recipe triple+holly');
  // Run round trip.
  const r = new Run();
  r.money = 1234; r.setFlag('x'); r.giveTreasure('pearl', 2); r.addWeapon('rifle');
  const back = Run.from(JSON.parse(JSON.stringify(r.toJSON())));
  t.eq(back.money, 1234, 'save round trip money');
  t.ok(back.flag('x'), 'save round trip flags');
  t.eq(back.valuables.pearl, 2, 'save round trip valuables');
  t.eq(back.case.items.length, r.case.items.length, 'save round trip case');
  t.ok(back.ownsWeapon('rifle'), 'save round trip weapons');
  // A checkpoint is a snapshot, not a live view.
  const live = new Run();
  const snap = live.toJSON();
  live.setFlag('later'); live.areaData('quay').beats.x = true; live.money = 5;
  t.ok(!snap.flags.later, 'flags set after a checkpoint do not leak into it');
  t.ok(!snap.areaFlags.quay, 'area data set after a checkpoint does not leak into it');
  t.eq(snap.money, 0, 'money in a checkpoint stays put');
  // Reliquary.
  const q = new Run();
  q.giveTreasure('reliquary'); q.giveTreasure('pearl'); q.giveTreasure('blackPearl'); q.giveTreasure('amber');
  t.ok(q.socket('pearl') && q.socket('amber'), 'sockets fill');
  t.ok(!q.socket('amber'), 'socket refuses a second amber');
  t.ok(q.socket('blackPearl'), 'third socket fills');
  t.eq(q.valuables.reliquaryFull, 1, 'full reliquary');
  // Loot: empties get ammo.
  const l = new Run();
  l.case.takeStack('ammoPistol', 99); l.weapons.pistol.mag = 0;
  const rng = new Rng(3);
  let ammo = 0;
  for (let i = 0; i < 200; i++) { const d2 = rollLoot(rng, l, { source: 'crate' }); if (d2?.id === 'ammoPistol') ammo++; }
  t.ok(ammo > 120, `out of ammo mostly drops ammo (got ${ammo}/200)`);
  const hurt = new Run();
  hurt.health = 20; hurt.case.remove(hurt.case.find('samphire'));
  let herb = 0;
  for (let i = 0; i < 200; i++) { const d2 = rollLoot(rng, hurt, { source: 'crate' }); if (d2?.id === 'samphire') herb++; }
  t.ok(herb > 120, `hurt with no herbs mostly drops samphire (got ${herb}/200)`);
  const full = new Run();
  full.case.addStack('ammoPistol', 50);
  let money = 0;
  for (let i = 0; i < 200; i++) { const d2 = rollLoot(rng, full, { source: 'crate' }); if (d2?.kind === 'money') money++; }
  t.ok(money > 120, `stocked up mostly drops money (got ${money}/200)`);
  // A crowd's corpses don't all pay out in rounds: what's on the floor from this fight counts as had.
  const low = new Run();
  low.weapons.pistol.mag = 0;
  while (low.case.count('ammoPistol') > 0) low.case.remove(low.case.find('ammoPistol'));
  const lying = lyingAmmo([{ kind: 'item', id: 'ammoPistol', qty: 12 }, { kind: 'item', id: 'ammoPistol', qty: 12 }, { kind: 'money', id: null, qty: 40 }, { kind: 'item', id: 'ammoPistol', qty: 12, persist: '3,4' }, { kind: 'item', id: 'ammoPistol', qty: 12, taken: true }]);
  t.eq(lying.ammoPistol, 24, 'only what corpses and crates dropped counts, and only until it is taken');
  let rounds = 0; let roundsLying = 0;
  for (let i = 0; i < 200; i++) {
    if (rollLoot(rng, low, { source: 'crate' })?.id === 'ammoPistol') rounds++;
    if (rollLoot(rng, low, { source: 'crate', lying })?.id === 'ammoPistol') roundsLying++;
  }
  t.ok(rounds > 120, `an empty pistol asks for rounds (got ${rounds}/200)`);
  t.eq(roundsLying, 0, `two stacks on the floor are enough to stop it (got ${roundsLying}/200)`);
  let roundsOne = 0;
  for (let i = 0; i < 200; i++) if (rollLoot(rng, low, { source: 'crate', lying: { ammoPistol: 12 } })?.id === 'ammoPistol') roundsOne++;
  t.ok(roundsOne > 120, `one stack is not (got ${roundsOne}/200)`);
}
