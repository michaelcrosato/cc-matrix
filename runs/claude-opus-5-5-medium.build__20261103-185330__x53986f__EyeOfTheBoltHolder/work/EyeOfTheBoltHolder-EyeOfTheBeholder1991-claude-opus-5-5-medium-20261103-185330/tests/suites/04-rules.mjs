// items, combat, monsters, magic, camp, progress: the rules with fixed seeds
import { kit } from './simkit.mjs';
export default async check => {
  const { B, cmd, run, fresh, at } = await kit();
  /* ---- items ---- */
  let S = fresh('f1', [2, 14, 0], { noMons: true });
  const [br, ysa, cobb, od] = S.party.members;
  check('a mage cannot wield a long sword', !!B.canEquip(od, B.item('longSword'), 'main'));
  check('a cleric wields only blunt weapons', !!B.canEquip(cobb, B.item('shortSword'), 'main') && !B.canEquip(cobb, B.item('warhammer'), 'main'));
  check('a two-handed weapon needs a free off hand', !!B.canEquip(br, B.item('lockbreaker'), 'main'));
  check('heavy armour is too heavy for a mage', !!B.canEquip(od, B.item('chainShirt'), 'body'));
  check('only ammunition goes in the quiver', !!B.canEquip(ysa, B.item('rock'), 'quiver') && !B.canEquip(ysa, B.item('bolts'), 'quiver'));
  cmd({ c: 'use' }); check('use with nothing takes the front item into the Hand', S.party.hand && S.party.hand.id === 'rustyDagger');
  cmd({ c: 'use' }); check('use with the Hand full stows it', !S.party.hand && B.countItem('rustyDagger') === 1);
  B.dispatch({ c: 'inv', m: 0, op: 'take', ref: { slot: 'main' } }); check('the Party screen takes a slot into the Hand', S.party.hand && S.party.hand.id === 'longSword' && !br.slots.main);
  B.dispatch({ c: 'inv', m: 0, op: 'place', ref: { pack: 5 } }); check('and places it in the pack', br.pack[5] && br.pack[5].id === 'longSword');
  B.dispatch({ c: 'inv', m: 0, op: 'take', ref: { pack: 5 } }); B.dispatch({ c: 'inv', m: 0, op: 'place', ref: { slot: 'main' } }); check('and back in the hand', br.slots.main && br.slots.main.id === 'longSword');
  br.food = 40; B.giveParty(B.item('ration')); const fr = B.findItem(i => i.id === 'ration' && true); B.dispatch({ c: 'inv', m: S.party.members.indexOf(fr.m), op: 'use', ref: { pack: fr.i } }); check('eating a ration feeds', fr.m.food > 40 || br.food > 40);
  S = fresh('f1', [2, 9, 0], { noMons: true }); S.floors.f1.mons = []; const rat = B.spawnMon('f1', 'rat', 2, 7, {}); S.party.hand = B.item('dagger');
  cmd({ c: 'throw' }, 1); check('a thrown dagger flies down the line and lands', B.itemsAt(2, 7).some(i => i.id === 'dagger') || B.itemsAt(2, 6).some(i => i.id === 'dagger') || rat.hp < rat.max, JSON.stringify(S.floors.f1.items));
  /* ---- combat ---- */
  S = fresh('f1', [2, 9, 0], { noMons: true, seed: 11 }); S.floors.f1.mons = [];
  let hits = 0, swings = 0; for (let i = 0; i < 300; i++) { const r = B.spawnMon('f1', 'rat', 2, 8, {}); B.attackMon(S.party.members[0], r, B.def(S.party.members[0].slots.main), 'main'); swings++; if (r.hp < r.max) hits++; S.floors.f1.mons = []; }
  check('Brannoc hits a rat most of the time', hits / swings > .6 && hits / swings < .95, hits / swings);
  const r2 = B.spawnMon('f1', 'rat', 2, 8, {}); cmd({ c: 'strike' }, .1); check('Party Strike: the front row strikes what is in front', S.party.members[0].cool.main > 0 && S.party.members[1].cool.main > 0 && S.party.members[2].cool.main === 0);
  check('a strike sets the hand cooldown from the weapon', Math.abs(S.party.members[0].coolMax.main - 2.0 * (1 - .04 * B.mod(12))) < .05, S.party.members[0].coolMax.main);
  S = fresh('f1', [2, 6, 0], { noMons: true }); S.floors.f1.mons = []; const sk = B.spawnMon('f1', 'skeleton', 2, 5, {}); sk.aware = true; sk.state = 'hunt'; run(.05);
  let k = 0; while (!sk.wind && k++ < 600) run(1 / 60); check('a monster winds up before it strikes', sk.wind > 0);
  const hp0 = S.party.members.reduce((n, m) => n + m.hp, 0); cmd({ c: 'move', d: 'b' }, 1.0);
  check('a step back during the wind-up makes the blow miss', S.party.members.reduce((n, m) => n + m.hp, 0) === hp0 && S.log.some(l => /snaps on air/.test(l.text)));
  // flanks: a blow from the left reaches the left column
  S = fresh('f1', [2, 7, 0], { noMons: true }); check('a blow from the left lands on the left column', B.targetMember('left') === S.party.members[0] || B.targetMember('left') === S.party.members[2]);
  check('a blow from behind lands on the back row', [S.party.members[2], S.party.members[3]].includes(B.targetMember('back')));
  // down, then dead
  const m0 = S.party.members[3]; B.hurtMember(m0, 99); check('at 0 HP a member is Down', m0.state === 'down'); B.hurtMember(m0, 1); check('hit again while Down, Dead', m0.state === 'dead');
  /* ---- monsters ---- */
  S = fresh('f1', [2, 9, 0], { noMons: true }); S.floors.f1.mons = []; const far = B.spawnMon('f1', 'rat', 2, 5, {}); B.look(); run(.2);
  check('a monster that sees the party notices it', far.aware);
  run(4); check('it hunts the party by A*', B.manh(far.cx, far.cy, 2, 9) <= 1, far.cx + ',' + far.cy);
  S.floors.f1.mons = []; const lk = B.spawnMon('f1', 'latchkin', 2, 8, {}); lk.hp = 1; lk.aware = true; run(1); check('a coward flees when badly hurt', B.manh(lk.cx, lk.cy, 2, 9) > 1 || lk.hp <= 0);
  check('a cell holds 4 units: two middling monsters fill it', (() => { S.floors.f1.mons = []; B.spawnMon('f1', 'ooze', 10, 6, {}); B.spawnMon('f1', 'ooze', 10, 6, {}); const t = B.spawnMon('f1', 'ooze', 10, 6, {}); return !(t.cx === 10 && t.cy === 6); })());
  // the boss: caged takes x0.2; lightning heals it
  S = fresh('f4', [6, 5, 0]); const bm = B.bossMon(); B.bossWake(); while (S.talk) B.cmdTalk('next');
  const h0 = bm.hp; B.hurtMon(bm, 50, {}); check('the caged Eye takes a fifth of the damage', h0 - bm.hp === 10, h0 - bm.hp);
  const h1 = bm.hp; B.hurtMon(bm, 20, { kind: 'lightning' }); check('lightning heals the Bolt-Holder', bm.hp > h1);
  bm.boss.locks = [true, true, false]; at(6, 1, 0); cmd({ c: 'use' }, 2.3); while (S.talk) B.cmdTalk('next'); check('the third lock opens the cage', bm.boss.phase === 2);
  bm.hp = Math.floor(bm.max * .45); run(.1); check('at half it relocks a lock', bm.boss.relock >= 0);
  bm.hp = 1; B.hurtMon(bm, 5, {}); while (S.talk) B.cmdTalk('next'); check('its death opens the Stair to the Light', S.flags.bossDead === 1);
  /* ---- magic ---- */
  S = fresh('f1', [2, 9, 0], { noMons: true }); S.floors.f1.mons = []; const tgt = B.spawnMon('f1', 'leech', 2, 6, {});
  const oi = S.party.members.findIndex(m => m.cls === 'M'); cmd({ c: 'cast', m: oi, spell: 'sparkDart' }, 1);
  check('Spark Dart flies and hits the first foe down the line', tgt.hp < tgt.max);
  check('casting spends the slot', !S.party.members[oi].mem.find(e => e.s === 'sparkDart').ready);
  check('casting puts both hands on 2.5 s', S.party.members[oi].coolMax.main === 2.5);
  const ci = S.party.members.findIndex(m => m.cls === 'C'); S.party.members[0].hp = 3; cmd({ c: 'cast', m: ci, spell: 'mend', target: 0 }, .2); check('Mend heals the chosen member', S.party.members[0].hp > 3);
  S.floors.f1.mons = []; const sl = B.spawnMon('f1', 'rat', 2, 8, {}); B.castSpell(S.party.members[oi], 'slumber', {}); check('Slumber puts small living foes in front to sleep', sl.status.asleep > 0);
  B.castSpell(S.party.members[oi], 'featherStep', {}); check('Feather Step floats the party', S.party.fx.float > 0);
  S = fresh('f2', [4, 12, 0], { noMons: true }); S.party.fx.float = 30; cmd({ c: 'move', d: 'f' }, .6); check('floating, the party crosses a pit', S.floor === 'f2' && S.party.cy === 11);
  /* ---- camp ---- */
  S = fresh('f1', [2, 9, 0], { noMons: true }); S.floors.f1.mons = []; const near = B.spawnMon('f1', 'rat', 2, 6, {}); near.aware = true;
  check('no camp with enemies near', !B.cmdCamp('open') && S.log.some(l => /enemies near/.test(l.text)));
  S.floors.f1.mons = []; S.party.members[0].hp = 2; S.floors.f1.wanderers = 0; check('camp opens', B.cmdCamp('open')); B.cmdCamp('rest'); run(4);
  check('a full rest heals and refills the slots', S.party.members[0].hp > 2 && S.party.members.every(m => m.mem.every(e => e.ready)) && !S.camp.rest, S.party.members[0].hp);
  B.cmdCamp('close');
  S = fresh('f1', [3, 7, 0], { noMons: true }); S.floors.f1.mons = []; B.T.restInt = 50; S.party.members[0].hp = 1; B.cmdCamp('open'); B.cmdCamp('rest'); run(4); B.T.restInt = 4;
  check('a rest can be interrupted by wanderers', S.log.some(l => /awakened/.test(l.text)) && S.floors.f1.mons.length > 0);
  /* ---- progress ---- */
  S = fresh('f1', [2, 9, 0], { noMons: true }); const m1 = S.party.members[0], max0 = m1.max; B.gainXp(m1, 300); check('XP brings levels and HP', m1.lvl >= 2 && m1.max > max0);
  check('NPCs join up to six', B.joinNpc('tamsin') && B.joinNpc('durgan') && S.party.members.length === 6 && !B.joinNpc('veil'));
  B.veilHelp(); check('with no room Veil gives her ward', B.countItem('lidlessWard') === 1);
  check('an NPC can be dismissed', B.dismiss(5) && S.party.members.length === 5);
  const dead = S.party.members[1]; dead.state = 'dead'; dead.hp = 0; B.raiseMember(dead); check('raising brings the dead back at 1 HP', dead.state === 'ok' && dead.hp === 1);
  for (const m of S.party.members) { m.state = 'down'; m.hp = 0; } B.checkWipe(); check('no one standing: game over', S.over);
};
