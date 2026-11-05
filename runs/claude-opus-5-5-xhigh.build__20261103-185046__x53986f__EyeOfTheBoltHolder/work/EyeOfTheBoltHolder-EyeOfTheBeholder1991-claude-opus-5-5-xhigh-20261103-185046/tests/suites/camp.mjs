// camp: refused near enemies, healing per hour, the cleric's Mends, interruptions (seeded, safe rooms, the budget), hunger,
// starving, Eat, level-up on rest
import { fresh, sim, at } from '../util.mjs';
export async function run(t) {
  const { B } = await fresh(), S = () => B.S;
  at(B, 'f1', 2, 9, 0); S().floors.f1.doors.G1.open = 1; sim(B, .5); B.update(1 / 120, [{ c: 'camp', op: 'open' }]);
  t.check('camp is refused with enemies near', !S().camp && S().log.some(l => /may not rest/.test(l.text)));
  at(B, 'f1', 5, 13, 0); const m = S().party.members[0]; m.hp = 1; S().party.members[2].mem[1] = []; S().party.members[2].spent[1] = []; S().party.members[3].spent[1] = [true, true];
  B.update(1 / 120, [{ c: 'camp', op: 'open' }]); t.check('camp opens in a quiet place', !!S().camp);
  B.update(1 / 120, [{ c: 'camp', op: 'rest' }], 1 / 120); for (let i = 0; i < 48; i++) B.update(0, [], 1 / 120);
  t.check('an hour heals 1 + CON', m.hp >= 3);
  for (let i = 0; i < 600; i++) B.update(0, [], 1 / 120); t.check('rest ends by itself', !S().camp.rest);
  t.check('a full rest costs food', m.food < 100);
  B.campClose();
  at(B, 'f1', 5, 13, 0); const c = S().party.members[2], y = S().party.members[1]; y.hp = 1; B.update(1 / 120, [{ c: 'camp', op: 'open' }]); B.update(1 / 120, [{ c: 'camp', op: 'rest' }]);
  t.check('a resting cleric spends its Mends on the wounded first', y.hp > 1 && c.spent[1].some(Boolean));
  B.campClose();
  // interruptions: never in a safe room, only so many per floor
  let inSafe = 0; for (let s = 0; s < 30; s++) { at(B, 'f1', 5, 13, 0, { seed: s }); B.T.restInt = 100; S().party.members.forEach(q => q.hp = 1); B.update(1 / 120, [{ c: 'camp', op: 'open' }]); B.update(1 / 120, [{ c: 'camp', op: 'rest' }]); for (let i = 0; i < 400; i++) B.update(0, [], 1 / 120); if (S().log.some(l => /awakened/.test(l.text))) inSafe++; B.campClose(); }
  t.check('no interruptions in a safe room', inSafe === 0);
  at(B, 'f1', 10, 6, 0); S().floors.f1.mons.length = 0; B.T.restInt = 100; S().party.members.forEach(q => q.hp = 1);
  B.update(1 / 120, [{ c: 'camp', op: 'open' }]); B.update(1 / 120, [{ c: 'camp', op: 'rest' }]); for (let i = 0; i < 100; i++) B.update(0, [], 1 / 120);
  t.check('elsewhere a wanderer interrupts', S().log.some(l => /awakened/.test(l.text)) && !S().camp && S().floors.f1.mons.length > 0);
  t.check('the floor\'s wanderer budget is spent', S().floors.f1.wander === 2);
  B.tuneDefaults();
  at(B, 'f1', 5, 13, 0); const h = S().party.members[1]; h.food = 25.5; sim(B, 60 * 1.1); t.check('hunger drains and says so', h.food <= 25 && S().log.some(l => /hungry/.test(l.text)));
  h.food = 0.01; const hp = h.hp; sim(B, 31); t.check('starving costs HP', h.hp < hp && S().log.some(l => /starving/.test(l.text)));
  B.T.hunger = 0; const f0 = h.food; sim(B, 30); t.check('the Hunger slider at 0 stops hunger', h.food === f0); B.tuneDefaults();
  S().party.members.forEach(q => { q.food = 30; q.pack[11] = B.mkItem('ration'); }); B.update(1 / 120, [{ c: 'camp', op: 'open' }]); const evs = []; B.update(1 / 120, [{ c: 'camp', op: 'eat' }]);
  t.check('Eat feeds the hungry from the packs', S().party.members.every(q => q.food >= 80)); B.campClose();
  B.opt.levelUp = 'rest'; at(B, 'f1', 5, 13, 0); const L = S().party.members[0]; B.gainXp(L, 120, true); t.check('level up on rest waits', L.lvl === 1 && L.pendingLvl);
  B.update(1 / 120, [{ c: 'camp', op: 'open' }]); B.update(1 / 120, [{ c: 'camp', op: 'rest' }]); for (let i = 0; i < 1200; i++) B.update(0, [], 1 / 120);
  t.check('and comes after a full rest', L.lvl === 2); B.opt.levelUp = 'now'; B.campClose();
}
