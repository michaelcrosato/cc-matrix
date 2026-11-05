// monsters: waking by sight and noise, A* hunting and flanking round a full cell, keepAway Seers and their bolts,
// fleeing thieves, fliers, cell capacity, drops; the boss's phases, locks, relock, lightning drinking, summons, telegraphs
import { fresh, sim, at } from '../util.mjs';
export async function run(t) {
  const { B } = await fresh(), S = () => B.S;
  at(B, 'f1', 2, 9, 0); B.S.floors.f1.doors.G1.open = 1; B.S.floors.f1.doors.G1.want = 1; sim(B, .5);
  const rats = S().floors.f1.mons.filter(m => m.type === 'rat' && m.cy <= 8 && m.cx <= 4);
  t.check('rats in sight become aware', rats.filter(m => m.cy === 6).every(m => m.aware));
  t.check('sleeping rats stay asleep until there is noise', rats.filter(m => m.cy === 8).every(m => m.st === 'asleep'));
  B.noise(2, 8, 4); t.check('noise wakes them', rats.every(m => m.st !== 'asleep'));
  sim(B, 3); t.check('aware rats hunt the party with A*', rats.some(m => Math.abs(m.cx - 2) + Math.abs(m.cy - 9) <= 2));
  t.check('no cell holds more than four units', (() => { const c = {}; for (const m of S().floors.f1.mons) if (m.hp > 0) c[m.cx + ',' + m.cy] = (c[m.cx + ',' + m.cy] || 0) + B.UNITS[B.MON(m.type).size]; return Object.values(c).every(v => v <= 4); })());
  at(B, 'f1', 10, 6, 1); const fl = S().floors.f1; fl.mons.length = 0; const ooze = B.spawnMon(fl, 'ooze', 11, 6, {}); const a = B.spawnMon(fl, 'ooze', 11, 6, {}); const b = B.spawnMon(fl, 'rat', 12, 6, {}); b.aware = true; b.st = 'hunt';
  t.check('two medium oozes fill a cell', !B.monCan(b, 11, 6));
  sim(B, 4); t.check('a third goes round (flanks)', !(b.cx === 12 && b.cy === 6));
  at(B, 'f3', 14, 8, 1); const sf = S().floors.f3; for (const m of sf.mons) if (m.type !== 'seer' || m.cy !== 8) m.hp = 0;
  const seer = sf.mons.find(m => m.type === 'seer' && m.cy === 8); seer.aware = true; seer.st = 'hunt'; seer.boltT = 0; sim(B, .1);
  t.check('a Seer in line casts a Locking Bolt', S().proj.some(p => p.team === 'mon' && p.kind === 'mbolt'));
  S().party.cx = 15; sim(B, 3); t.check('a Seer keeps away when you close in', B.MON('seer').mind === 'keepAway' && Math.abs(seer.cx - 15) + Math.abs(seer.cy - 8) >= 2);
  const lk = B.spawnMon(sf, 'latchkin', 10, 10, {}); lk.hp = 1; lk.aware = true; B.hurtMon(lk, 0.5); t.check('a coward flees when badly hurt', lk.hp > 0 ? lk.flee > 0 : true);
  t.check('a gazer flies over pits', B.MON('gazer').fly === true);
  at(B, 'f1', 2, 8, 0); const fl1 = S().floors.f1; const snick = fl1.mons.find(m => m.id === 'snick'); B.killMon(snick);
  t.check('Snick drops the copper ward, the Drainwarden\'s key and the amulet', ['copperWard', 'drainwardensKey', 'amuletOfVigor'].every(id => B.itemsAt(snick.cx, snick.cy).some(i => i.id === id)));
  // the boss
  at(B, 'f4', 6, 6, 0); const Bs = S().boss; t.check('the Bolt-Holder waits caged', Bs && Bs.alive && !Bs.awake && Bs.phase === 1);
  B.update(1 / 120, [{ c: 'move', d: 'f' }]); sim(B, .5); t.check('stepping into the arena wakes it (a moment)', Bs.awake && S().moment && S().moment.id === 'eyeIntro');
  sim(B, 6); const hp0 = Bs.hp; B.hurtBoss(100, {}); t.check('caged it takes a fifth', hp0 - Bs.hp === 20);
  B.hurtBoss(50, { kind: 'shock' }); t.check('it drinks lightning', Bs.hp > hp0 - 20);
  for (const id of ['GL1', 'GL2', 'GL3']) B.lockDone(id); t.check('three Great Locks open the cage (phase 2)', Bs.phase === 2);
  B.hurtBoss(Bs.hp - Bs.max / 2 + 1, {}); t.check('at half it wrenches a lock back', !!Bs.relocked);
  const h2 = Bs.hp; B.hurtBoss(40, {}); t.check('a relocked bolt halves the harm', h2 - Bs.hp === 20);
  B.lockDone(Bs.relocked); t.check('turning it again restores full harm', !Bs.relocked);
  B.hurtBoss(Bs.hp - Bs.max * .2, {}); t.check('below a quarter: phase 3', Bs.phase === 3);
  S().party.cx = 6; S().party.cy = 5; S().party.dir = 0; Bs.atkT = 0; Bs.tele = null; let sawTele = false, summoned = false;
  for (let i = 0; i < 2400; i++) { B.update(1 / 120, [], 1 / 120); if (Bs.tele) sawTele = true; if (S().floors.f4.mons.some(m => m.type === 'gazer' && m.hp > 0 && m.cy <= 5)) summoned = true; S().party.members.forEach(m => { m.hp = m.max; m.state = 'ok'; m.status = {}; }); }
  t.check('its attacks are telegraphed', sawTele); t.check('in phase 3 it calls Gazers', summoned);
  B.hurtBoss(Bs.hp + 5, {}); t.check('its death starts the ending moment', !Bs.alive && S().moment && S().moment.id === 'eyeDeath');
  sim(B, 5); B.S.party.cx = 6; B.S.party.cy = 1; B.S.party.dir = 0; B.update(1 / 120, [{ c: 'use' }]); t.check('the Stair to the Light ends the game', S().won);
}
