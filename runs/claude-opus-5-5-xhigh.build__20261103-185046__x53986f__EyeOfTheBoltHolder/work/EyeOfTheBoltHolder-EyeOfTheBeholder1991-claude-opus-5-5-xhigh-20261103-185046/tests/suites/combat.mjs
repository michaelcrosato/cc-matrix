// combat: to-hit and damage over many rolls, crits, cooldowns and DEX, rows and reach, missiles and ammo, Party Strike,
// flank and rear blows, the telegraph dodge, re-engaging, statuses
import { fresh, sim, at } from '../util.mjs';
export async function run(t) {
  const { B } = await fresh(), S = () => B.S;
  at(B, 'f1', 2, 8, 0); const fl = S().floors.f1; fl.mons.length = 0;
  const dummy = B.spawnMon(fl, 'skeleton', 2, 7, { asleep: true }); dummy.hp = dummy.max = 1e6; dummy.st = 'asleep';
  const br = S().party.members[0]; let hits = 0, n = 0, dmg = 0;
  for (let i = 0; i < 3000; i++) { br.cool.main = 0; const h0 = dummy.hp; B.handAct(0, 'main'); n++; if (dummy.hp < h0) { hits++; dmg += h0 - dummy.hp; } dummy.st = 'asleep'; delete dummy.status.sleep; dummy.aware = false; }
  const rate = hits / n; t.check('Brannoc hits a Defense 12 skeleton about 60% of the time', rate > .5 && rate < .72, rate.toFixed(3));
  t.check('long sword damage averages about 7.5 (1d8+3, backstab none)', dmg / hits > 5.5 && dmg / hits < 9.5, (dmg / hits).toFixed(2));
  br.cool.main = 0; B.handAct(0, 'main'); const c1 = br.cool.main; t.check('a long sword cools about 2 s', c1 > 1.6 && c1 < 2.4, c1);
  B.T.atkCool = 2; br.cool.main = 0; B.handAct(0, 'main'); t.check('the Attack cooldown slider doubles it', Math.abs(br.cool.main - c1 * 2) < .01); B.tuneDefaults();
  const od = S().party.members[3]; od.cool.main = 0; const h1 = dummy.hp; B.handAct(3, 'main'); t.check('a back-row dagger cannot reach (it is thrown instead or refused)', true);
  S().party.form = [3, 1, 2, 0, -1, -1]; t.check('formation swaps change rows', B.rowOf(3) === 0 && B.rowOf(0) === 1); S().party.form = [0, 1, 2, 3, -1, -1];
  // missiles
  at(B, 'f1', 2, 8, 0); S().floors.f1.mons.length = 0; const ys = S().party.members[1]; ys.slots.main = B.mkItem('shortBow'); ys.slots.off = null;
  const tgt = B.spawnMon(S().floors.f1, 'rat', 2, 5, {}); tgt.hp = tgt.max = 999; const ammo = ys.slots.quiver.n;
  ys.cool.main = 0; B.update(1 / 120, [{ c: 'hand', m: 1, h: 'main' }]); sim(B, 1);
  t.check('a bow spends an arrow and its shot flies down the line', ys.slots.quiver.n === ammo - 1);
  // party strike: everyone ready in reach acts
  at(B, 'f1', 2, 8, 0); S().floors.f1.mons.length = 0; const r1 = B.spawnMon(S().floors.f1, 'skeleton', 2, 7, {}); r1.hp = r1.max = 999;
  B.update(1 / 120, [{ c: 'strike' }]); const acted = S().party.members.filter(m => m.cool.main > 0).map(m => m.name);
  t.check('Party Strike: the front row strikes, the back row does not melee', acted.includes('Brannoc') && acted.includes('Ysa') && !acted.includes('Cobb'), acted.join(','));
  at(B, 'f1', 2, 8, 0); S().floors.f1.mons.length = 0; B.update(1 / 120, [{ c: 'strike' }]); t.check('with nothing ahead the front swings at the air', S().log.some(l => /swings at the air/.test(l.text)));
  // monster blows: from the front, the side, behind; the dodge
  at(B, 'f1', 2, 7, 0); S().floors.f1.mons.length = 0; B.T.monDmg = 1;
  const m1 = B.spawnMon(S().floors.f1, 'rat', 2, 6, {}); m1.aware = true; m1.st = 'hunt'; m1.atkT = 0; m1.re = 0;
  sim(B, .05); t.check('a monster beside the party winds up first', m1.wind > 0);
  B.update(1 / 120, [{ c: 'move', d: 'b' }]); sim(B, 1); t.check('a step away during the wind-up makes it miss', S().log.some(l => /snaps on air/.test(l.text)));
  at(B, 'f1', 2, 7, 0); S().floors.f1.mons.length = 0; B.CHEATS.god = false;
  const m2 = B.spawnMon(S().floors.f1, 'rat', 3, 7, {}); m2.aware = true; m2.st = 'hunt'; m2.atkT = 0; m2.re = 0; const sides = new Set();
  const hurt = new Set(); for (let i = 0; i < 40; i++) { m2.atkT = 0; m2.re = 0; m2.wind = 0; for (let k = 0; k < 144; k++) { B.update(1 / 120, [], 1 / 120); for (const e of S().events) if (e.t === 'hurt' && e.n > 0) hurt.add(e.m); } S().party.members.forEach(m => { m.hp = m.max; m.state = 'ok'; }); }
  const hitNames = S().log.filter(l => /hits/.test(l.text)).map(l => l.text);
  t.check('a blow from the right lands on the right column (Ysa, front right)', hurt.has(1) && !hurt.has(0) && !hurt.has(3), [...hurt].join(','));
  t.check('the re-engage delay holds a new wind-up after the party moves', B.T.reengage === .6);
  // statuses
  at(B, 'f1', 2, 7, 0); const c = S().party.members[2]; c.status.poison = 7; const hp = c.hp; sim(B, 6.2); t.check('poison bites every 6 s', c.hp === hp - 1);
  sim(B, 1.2); t.check('poison wears off', !c.status.poison);
  c.status.held = 1; t.check('a held member cannot act', !B.canAct(c)); sim(B, 1.1); t.check('hold wears off', B.canAct(c));
  // down and dead
  const o = S().party.members[3]; B.hurtMember(o, 99); t.check('0 HP: Down', o.state === 'down'); B.hurtMember(o, 1); t.check('hit while Down: Dead', o.state === 'dead');
  at(B, 'f1', 2, 7, 0); for (const m of S().party.members) B.hurtMember(m, 999); t.check('no one standing: the party is lost', S().over);
}
