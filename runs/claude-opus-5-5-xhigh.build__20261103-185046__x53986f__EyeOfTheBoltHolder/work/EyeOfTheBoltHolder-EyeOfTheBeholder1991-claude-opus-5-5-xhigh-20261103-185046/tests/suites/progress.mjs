// progress: XP split and multipliers, thresholds, HP and slots on level-up, deeds, NPCs joining (and Veil's full-party
// path), dismissing, the Shrine of the Threshold
import { fresh, sim, at } from '../util.mjs';
export async function run(t) {
  const { B } = await fresh(), S = () => B.S;
  at(B, 'f1', 2, 8, 0); const fl = S().floors.f1; fl.mons.length = 0; const r = B.spawnMon(fl, 'snick', 2, 7, {});
  const xp0 = S().party.members.map(m => m.xp); B.killMon(r); const gained = S().party.members.map((m, i) => m.xp - xp0[i]);
  t.check('XP is split among the conscious, by class and race', gained.every(g => g > 0) && Math.abs(gained[0] - 400 / 4 * 1.05) < .01, gained.map(g => g.toFixed(1)).join(','));
  t.check('100 XP reaches level 2 at once', S().party.members[0].lvl === 2);
  const b = S().party.members[0]; t.check('a level brings HP', b.max > 12);
  at(B, 'f1', 2, 8, 0); const c = S().party.members[2]; B.gainXp(c, 300, true); t.check('a cleric at level 3 has a level-2 slot', B.slotCount(c)[1] >= 1);
  at(B, 'f1', 5, 2, 1); B.update(1 / 120, [{ c: 'use' }]); t.check('the lever starts Tamsin\'s talk', S().talk && S().talk.node === 'tamsin');
  for (let i = 0; i < 3; i++) B.update(1 / 120, [{ c: 'talk', op: 'next' }]); t.check('the talk offers a choice', S().talk && S().talk.choices && S().talk.choices.length === 2);
  B.update(1 / 120, [{ c: 'talk', op: 'choose', i: 0 }]); for (let i = 0; i < 3; i++) B.update(1 / 120, [{ c: 'talk', op: 'next' }]);
  t.check('Tamsin joins', S().party.members.some(m => m.npc === 'tamsin') && S().party.form.includes(4));
  const ti = S().party.members.findIndex(m => m.npc === 'tamsin'); B.update(1 / 120, [{ c: 'dismiss', m: ti }]); t.check('dismissed, she is gone', !S().party.members.some(m => m.npc === 'tamsin') && !S().party.form.includes(4));
  at(B, 'f3', 13, 11, 1, { party: B.demoParty() }); t.check('the demo party is six', S().party.members.length === 6);
  B.update(1 / 120, [{ c: 'use' }]); for (let i = 0; i < 4; i++) B.update(1 / 120, [{ c: 'talk', op: 'next' }]); B.update(1 / 120, [{ c: 'talk', op: 'choose', i: 0 }]); for (let i = 0; i < 4; i++) B.update(1 / 120, [{ c: 'talk', op: 'next' }]);
  t.check('a full party: Veil gives the Lidless Ward instead, and opens the way', S().flags.veilHelped && !!B.findItem(r2 => r2.id === 'lidlessWard') && S().party.members.length === 6);
  sim(B, 2); t.check('the moss wall grinds open', S().floors.f3.doors.H2.open > .85);
  at(B, 'f3', 13, 11, 1); B.update(1 / 120, [{ c: 'use' }]); for (let i = 0; i < 4; i++) B.update(1 / 120, [{ c: 'talk', op: 'next' }]); B.update(1 / 120, [{ c: 'talk', op: 'choose', i: 1 }]); for (let i = 0; i < 3; i++) B.update(1 / 120, [{ c: 'talk', op: 'next' }]);
  t.check('refused: more Wardens in the barracks, the wall stays shut', S().flags.veilRefused && S().floors.f3.mons.filter(m => m.type === 'warden' && m.cx === 17 && m.cy === 11).length === 2 && S().floors.f3.doors.H2.want === 0);
  at(B, 'f2', 12, 5, 0); const d = S().party.members[1]; d.state = 'dead'; d.hp = 0; B.update(1 / 120, [{ c: 'use' }]);
  t.check('the Shrine of the Threshold raises the dead once', d.state === 'ok' && d.hp === 1); d.state = 'dead'; B.update(1 / 120, [{ c: 'use' }]); t.check('and only once', d.state === 'dead');
}
