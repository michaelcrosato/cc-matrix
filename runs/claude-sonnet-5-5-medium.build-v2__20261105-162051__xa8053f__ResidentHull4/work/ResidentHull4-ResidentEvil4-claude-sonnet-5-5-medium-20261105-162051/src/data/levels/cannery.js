// Thole Cannery: belts, the Flenser, the Cold Room, the Dame, the winch, the belt fight.
import { TANNOY_LINES, COLD_ROOM } from '../dialogue.js';
import { S } from '../../game/enemy.js';
import { cp, cam, timed, lineDuration, nearXZ, inCells, hintUntil, alive, waitAllDead, shake, flashBang } from '../../game/kit.js';
import { app } from '../../core/app.js';
import { ui } from '../../core/ui.js';
import { THREE } from '../../../pixel-engine.js';

function* main(a) {
  const lv = a.level; a.lockDoor(24, 35, true);
  a.setObjective('CLEAR THE HALL'); a.autosave();
  // 1. the hall
  while (!inCells(a, 6, 10, 41, 26)) yield 0.3;
  const hall = [];
  for (let i = 0; i < 10; i++) { const [x, z] = cp(a, 12 + (i % 5) * 5, 12 + Math.floor(i / 5) * 8); hall.push(a.spawn('gaffer', x, z, { work: true, state: S.WORK, group: 'hall' })); }
  for (const [c, r] of [[20, 16], [30, 20]]) { const [x, z] = cp(a, c, r); hall.push(a.spawn('bottler', x, z, { work: true, state: S.WORK, group: 'hall' })); }
  a.showHint('THE BELTS CARRY YOU, AND THEM', 7);
  yield* waitAllDead(hall, 300);
  a.hintT = 0;
  // 2. the Flenser breaks out of the saw room
  a.setObjective('THE SAW ROOM DOOR');
  const sd = a.doorAtCell(5, 15); if (sd) { a.openDoor(sd, true); shake(a, 0.6); }
  const fl = a.spawnAtDoor('flenser', '1', { state: S.APPROACH }); a.flenser = fl; a.audio('saw', fl.x, fl.z);
  a.showHint('THE FLENSER. HEAD SHOTS STAGGER HIM. WHEN THE SAW RISES, DODGE', 9);
  yield () => fl.dead;
  a.hintT = 0;
  a.dropPickup({ kind: 'key', id: 'coldkey' }, fl.x, fl.z);
  a.setObjective('TAKE THE COLD ROOM KEY');
  yield () => a.run.keyItems.includes('coldkey');
  // 3. the Cold Room
  a.setObjective('OPEN THE COLD ROOM'); a.lockDoor(37, 9, true);
  const [cdx, cdz] = cp(a, 37, 9);
  while (!nearXZ(a, cdx, cdz, 2.8)) yield 0.3;
  a.lockDoor(37, 9, false); const cdoor = a.doorAtCell(37, 9); a.openDoor(cdoor); a.audio('doorkick');
  app.mix?.play(null);
  const [dx, dz] = cp(a, 41, 4);
  a.addDame(dx, dz); a.dame.cutscene = true;
  while (!inCells(a, 34, 2, 44, 8)) yield 0.3;
  const ls = timed(COLD_ROOM, 0.8);
  a.dame.yaw = Math.PI;
  yield* a.cutscene({ shots: [{ at: 0, ...cam(dx - 6, 2.2, dz + 4, dx, 1.2, dz, 48) }, { at: 6, ...cam(dx - 3, 1.6, dz + 1.8, dx, 1.2, dz, 40) }], lines: ls, duration: lineDuration(ls), cues: [{ at: 0.5, run: () => a.ctx.particles.burst('breath', new THREE.Vector3(dx, 1.3, dz)), cosmetic: true }] });
  a.dame.cutscene = false; a.setFlag('dame-met'); a.showHint('D-PAD RIGHT / C: DAME FOLLOW OR WAIT', 8);
  // 4. the boost
  const [ux, uz] = cp(a, 12, 10);
  const wd = a.doorAtCell(9, 9); if (wd) wd.locked = true;
  a.setObjective('BOOST THE DAME TO THE HOIST'); a.setFlag('need-boost');
  for (let i = 0; i < 3; i++) a.spawnAtDoor(i === 0 ? 'carrier' : 'runner', '2', { state: S.APPROACH });
  a.showHint('SHOOT THE CARRIER IF HE SHOULDERS HER', 8);
  yield () => a.hasFlag('boosted');
  if (wd) { wd.locked = false; a.openDoor(wd); }
  a.setObjective('HOLD THE WINCH');
  // 5. hold the winch
  const [wx, wz] = cp(a, 6, 4);
  a.dame.busy = 'winch'; a.dame.x = wx; a.dame.z = wz + 1;
  const shut = a.level.doors.find((q) => q.kind === 'S');
  a.winch = { pct: 0, running: true };
  const waves = [['1', 'runner', 3], ['2', 'runner', 3], ['3', 'carrier', 1]];
  a.scripts.start(function* () { for (const [d, t, n] of waves) { yield 22; for (let i = 0; i < n; i++) { a.spawnAtDoor(t, d, { state: S.APPROACH }); yield 1.5; } } }, 'wave');
  a.scripts.start(function* () { while (a.winch.pct < 100) { const dm = a.dame; const disturbed = dm.grabbedBy || a.enemies.some((e) => !e.dead && e.awake && Math.hypot(e.x - dm.x, e.z - dm.z) < 3); if (!disturbed && !a.frozen) a.winch.pct = Math.min(100, a.winch.pct + 100 / 90 * 0.1); yield 0.1; } }, 'winchtick');
  a.hudExtra = () => { if (a.winch && a.winch.pct < 100) { ui.text(ui.W / 2, 14, 'WINCH ' + Math.floor(a.winch.pct) + '%', { align: 'center', scale: 2, color: 'sand' }); ui.bar(ui.W / 2 - 50, 32, 100, 5, a.winch.pct / 100, 'sand'); } };
  yield () => a.winch.pct >= 100;
  a.hudExtra = null; a.winch.running = false;
  if (shut) a.openDoor(shut); a.audio('crane'); a.dame.busy = null; a.dame.mode = 'follow';
  a.bark('DAME', 'THAT IS THE LAST TIME I OPERATE MACHINERY FOR A SALARIED PERSON.', 4);
  a.setObjective('CROSS THE HALL TO THE SHUTTER');
  // 6. the belt: hooked off her feet by Mate Ansgar
  while (!inCells(a, 20, 12, 28, 23)) yield 0.3;
  const [hx, hz] = [a.player.x, a.player.z];
  const ans = a.spawn('ansgar', hx + 4, hz, { state: S.APPROACH, noBody: true }); ans.speedBase = 0; ans.hp = 9999; ans.maxHp = 9999; ans.def = { ...ans.def, boss: false };
  yield* a.cutscene({ shots: [{ at: 0, ...cam(hx - 4, 2.5, hz + 5, hx + 2, 1.4, hz, 52) }, { at: 3, ...cam(hx + 1, 1.8, hz + 3, hx, 1.2, hz, 44) }], lines: timed([['ANSGAR', 'GOING SOMEWHERE, ADJUSTER?', 2.5], ['MAX', 'THE SHUTTER. YOU?', 2]], 0.4), duration: 5.5 });
  const steps = [['MASH ACTION: BREAK THE HOOK', 'mash'], ['DODGE THE SWING', 'press'], ['KICK HIS KNEE', 'press'], ['HOLD ON', 'press'], ['ELBOW', 'press']];
  let fails = 0;
  for (let i = 0; i < 5; i++) {
    let ok = false; let guard = 0;
    while (!ok && guard++ < 6) {
      ok = yield* a.qte({ type: steps[i][1], verb: i % 2 ? 'dodge' : 'action', window: steps[i][1] === 'mash' ? 3 : 1.1, need: 10, label: steps[i][0] });
      if (!ok) { fails++; a.hurtPlayer(10, ans.x, ans.z, 'ansgar'); a.scripts.bark('ANSGAR', ['MISSED.', 'AGAIN, ADJUSTER.', 'IS THAT YOUR BEST?'][fails % 3], 2); yield 0.5; }
    }
    a.ctx.engine.shake.add(0.3); a.audio('kick');
    yield 0.4;
  }
  ans.die({ source: 'press' }); ans.sunk = true; ans.h.root.visible = false;
  a.audio('stomp'); shake(a, 0.7); a.bark('MAX', 'HE WENT INTO THE PRESS. A CAN ROLLED OUT.', 3);
  a.setFlag('belt-done'); a.autosave();
  // exit north
  const [ex, ez] = cp(a, 24, 2);
  while (!nearXZ(a, ex, ez, 4)) yield 0.4;
  yield* a.finishArea({ next: 'yard', claim: false });
}
function dameCommand(a) {
  const d = a.dame, p = a.player; if (!d) return false;
  if (a.hasFlag('need-boost') && !a.hasFlag('boosted')) {
    const [ux, uz] = cp(a, 12, 10);
    if (Math.hypot(p.x - ux, p.z - uz) < 3 && Math.hypot(d.x - ux, d.z - uz) < 5) {
      a.setFlag('boosted'); d.busy = 'hoist'; d.x = ux; d.z = uz + 0.8; p.doMelee('boost', 1.0); a.audio('chain'); a.bark('DAME', 'IF YOU DROP ME, I SHALL BILL YOU.', 3);
      a.later(1.2, () => { d.busy = null; });
      return true;
    }
  }
  return false;
}
export const cannery = {
  id: 'cannery', name: 'THOLE CANNERY', mapId: 'cannery', mood: 'rain', music: 'explore', chapter: 1, startYaw: Math.PI, dame: false,
  theme: { floors: { '.': 'flagstones', '_': 'metal-plates', ':': 'rough-boards' }, walls: { '#': 'bricks' }, cover: 'metal-plates', coverTop: 'night' },
  tannoyLines: TANNOY_LINES.slice(8, 10), dress: ['crate', 'barrel', 'ice-block', 'gutting-table', 'bucket'],
  lamps: [[-10, -6], [4, -6], [14, -9], [-14, 2]], scripts: [main], dameCommand, belts: (r) => (r === 13 || r === 14 ? 1 : r === 21 || r === 22 ? -1 : 0),
  props: [{ id: 'winch', at: [-17.5, -13.5], cell: false, collide: false }],
  botPlan(a) {
    const P = (c, r, o = {}) => ({ x: a.level.wx(c), z: a.level.wz(r), ...o });
    const key = () => { const k = a.pickups.find((q) => q.kind === 'key'); return k ? { x: k.x, z: k.z, r: 0.8, act: true, hold: () => !a.run.keyItems.includes('coldkey') } : P(24, 20, { r: 2, hold: () => !a.run.keyItems.includes('coldkey') }); };
    return [P(24, 31), P(21, 33, { r: 1.5, shop: true }), P(24, 28), P(24, 21, { r: 2, hold: () => a.aliveEnemies().length > 0 || !a.flenser }), P(12, 20, { r: 3, hold: () => !a.flenser || !a.flenser.dead }), { ...key(), r: 0.9 },
      P(36, 11, { hold: () => !a.run.keyItems.includes('coldkey') }), P(37, 10, { r: 1.5 }), P(41, 5, { r: 2, hold: (x) => !x.hasFlag('dame-met') }), P(12, 12, { r: 1.5, cmd: true, hold: (x) => !x.hasFlag('boosted') }),
      P(9, 12, { r: 2, hold: (x) => !x.winch || x.winch.pct < 100 }), P(24, 17, { r: 2, hold: (x) => !x.hasFlag('belt-done') }), P(24, 4, { r: 2 })];
  },
};
