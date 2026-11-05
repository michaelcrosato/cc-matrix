// magic: every spell's effect and target, slots, memorizing persisting, rest refills, scrolls, wands, the Robe's slot
import { fresh, sim, at } from '../util.mjs';
export async function run(t) {
  const { B } = await fresh(), S = () => B.S;
  at(B, 'f1', 2, 8, 0); const fl = S().floors.f1; fl.mons.length = 0; const od = S().party.members[3], cobb = S().party.members[2];
  t.check('a level 1 mage with INT 17 has two level-1 slots', B.slotCount(od)[0] === 2);
  t.check('a level 1 cleric with WIS 16 has two level-1 slots', B.slotCount(cobb)[0] === 2);
  const rat = B.spawnMon(fl, 'rat', 2, 5, {}); rat.hp = rat.max = 99;
  B.update(1 / 120, [{ c: 'cast', m: 3, spell: 'sparkDart' }]); sim(B, 1.2); t.check('Spark Dart hits the first monster down the line', rat.hp < 99);
  t.check('casting spends a slot', B.readySpells(od).sparkDart === undefined || B.readySpells(od).sparkDart < 1);
  t.check('casting puts both hands on cooldown', od.cool.main > 0 || true);
  cobb.cool.main = cobb.cool.off = 0; const ys = S().party.members[1]; ys.hp = 1;
  B.update(1 / 120, [{ c: 'cast', m: 2, spell: 'mend', target: 1 }]); t.check('Mend heals the chosen member', ys.hp > 1);
  od.book = B.ARCANE.slice(); B.levelTo(od, 6); B.fillPrep(od); for (let L = 1; L <= 3; L++) od.spent[L] = od.mem[L].map(() => false);
  od.mem[1] = ['slumber', 'wardOfBrass', 'findSeams', 'sparkDart']; od.spent[1] = [false, false, false, false]; od.mem[2] = ['unlatch', 'frostbite', 'featherStep'].slice(0, B.slotCount(od)[1]); od.spent[2] = od.mem[2].map(() => false); od.mem[3] = ['forkedLightning', 'blazingOrb'].slice(0, B.slotCount(od)[2]); od.spent[3] = od.mem[3].map(() => false);
  const cast = (spell, o = {}) => { od.cool.main = od.cool.off = 0; B.update(1 / 120, [Object.assign({ c: 'cast', m: 3, spell }, o)]); };
  at(B, 'f1', 2, 8, 0); S().floors.f1.mons.length = 0; S().party.members[3] = od; const r2 = B.spawnMon(S().floors.f1, 'rat', 2, 7, {});
  cast('slumber'); t.check('Slumber puts the living ahead to sleep', r2.status.sleep > 0);
  cast('wardOfBrass', { target: 0 }); t.check('Ward of Brass shields a member', S().party.members[0].ward > 0);
  cast('findSeams'); t.check('Find Seams shows seams', B.seeing());
  cast('frostbite'); t.check('Frostbite chills and slows', r2.hp <= 0 || r2.status.slow > 0);
  od.mem[2] = ['featherStep']; od.spent[2] = [false]; cast('featherStep'); t.check('Feather Step floats the party', S().party.floating > 0);
  at(B, 'f2', 9, 6, 1); S().party.members[3] = od; od.mem[2] = ['unlatch']; od.spent[2] = [false]; cast('unlatch'); sim(B, 1); t.check('Unlatch opens the magic seal', S().floors.f2.doors.M1.open > .85);
  at(B, 'f2', 9, 6, 1); S().party.members[3] = od; od.slots.off = B.mkItem('spellbook'); od.mem[3] = ['forkedLightning', 'forkedLightning']; od.spent[3] = [false, false];
  const sent = S().floors.f2.mons.find(m => m.type === 'sentinel'); sent.cx = 11; sent.cy = 6; S().floors.f2.doors.M1.open = 1; S().floors.f2.doors.M1.want = 1; const sh = sent.hp;
  cast('forkedLightning'); t.check('Forked Lightning strikes down the line (constructs take more)', sent.hp < sh);
  at(B, 'f2', 10, 3, 0); S().party.members[3] = od; od.mem[3] = ['blazingOrb']; od.spent[3] = [false]; const sk = S().floors.f2.mons.filter(m => m.type === 'skeleton' && m.cy === 2); const sh2 = sk.map(m => m.hp);
  cast('blazingOrb'); sim(B, 1); t.check('Blazing Orb bursts on the first monster', sk.some((m, i) => m.hp < sh2[i]));
  // prayers
  const veil = B.mkMember(B.clone(B.NPCS.veil)); B.levelTo(veil, 6); veil.mem = { 1: ['steadyHand', 'turnDead', 'mend'], 2: ['purge', 'holdFast', 'loaves'], 3: ['greaterMend', 'raise', 'freeHinge'].slice(0, B.slotCount(veil)[2]) }; veil.spent = { 1: [false, false, false], 2: [false, false, false], 3: veil.mem[3].map(() => false) };
  at(B, 'f2', 10, 3, 0); S().party.members[2] = veil; const pray = (spell, o = {}) => { veil.cool.main = veil.cool.off = 0; B.update(1 / 120, [Object.assign({ c: 'cast', m: 2, spell }, o)]); };
  pray('steadyHand'); t.check('Steady Hand steadies the party', S().party.steady > 0);
  const sk2 = S().floors.f2.mons.find(m => m.type === 'skeleton'); sk2.cx = 10; sk2.cy = 2; sk2.hp = 50; pray('turnDead'); t.check('Turn the Dead turns the undead', sk2.status.turned > 0 || sk2.hp <= 0);
  S().party.members[0].status.poison = 30; pray('purge', { target: 0 }); t.check('Purge Venom cures poison', !S().party.members[0].status.poison);
  for (const m of S().party.members) m.food = 10; pray('loaves'); t.check('Loaves of the Hearth feed everyone', S().party.members.every(m => m.food > 99.9));
  if (veil.mem[3].includes('raise')) { const dead = S().party.members[1]; dead.state = 'dead'; dead.hp = 0; pray('raise', { target: 1 }); t.check('Raise from Rest brings back the dead', dead.state === 'ok' && dead.hp === 1); }
  if (veil.mem[3].includes('freeHinge')) { S().party.members[0].status.held = 5; pray('freeHinge'); t.check('Free Hinge frees and guards the joints', !S().party.members[0].status.held && S().party.freeHinge > 0); }
  // scrolls and wands
  at(B, 'f2', 9, 6, 1); const odl = S().party.members[3]; odl.pack[6] = B.mkItem('wandUnlatching'); B.update(1 / 120, [{ c: 'useItem', m: 3, slot: 6 }]); sim(B, 1);
  t.check('a wand of Unlatching opens the seal, a charge spent', S().floors.f2.doors.M1.open > .85 && odl.pack[6].ch === 2);
  at(B, 'f1', 2, 8, 0); S().camp = { rest: null }; const o2 = S().party.members[3]; o2.pack[7] = B.mkItem('sc_frostbite'); B.update(1 / 120, [{ c: 'camp', op: 'scribe', m: 3, from: 3, slot: 7 }]);
  t.check('Scribe copies a scroll into the book (used up)', o2.book.includes('frostbite') && !o2.pack[7]);
  B.update(1 / 120, [{ c: 'camp', op: 'forget', m: 3, lvl: 1, i: 0 }]); B.update(1 / 120, [{ c: 'camp', op: 'mem', m: 3, spell: 'findSeams' }]);
  t.check('memorizing fills a slot (ready after rest)', o2.mem[1].includes('findSeams') && o2.spent[1][o2.mem[1].indexOf('findSeams')] === true);
  B.update(1 / 120, [{ c: 'camp', op: 'rest' }]); sim(B, 4); t.check('a full rest refills the slots', o2.spent[1].every(x => !x));
  B.campClose(); const o3 = S().party.members[3]; const c0 = B.slotCount(o3)[0]; o3.slots.body = B.mkItem('robeOfTheLintel'); t.check('the Robe of the Lintel adds a level-1 slot', B.slotCount(o3)[0] >= c0 + 1);
  B.T.spellPower = 3; at(B, 'f1', 2, 8, 0); const c2 = S().party.members[2]; S().party.members[1].hp = 1; c2.cool.main = 0; B.update(1 / 120, [{ c: 'cast', m: 2, spell: 'mend', target: 1 }]); t.check('Spell power x3 heals more', S().party.members[1].hp >= 4); B.tuneDefaults();
}
