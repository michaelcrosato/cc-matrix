// CLAIM 1: ACT OF GOD. Mourne Quay at bruised dusk.
import { TANNOY_LINES, ARRIVAL, MENDER_TALK, FATHOM_INTRO, SIEGE_START, FOGHORN } from '../dialogue.js';
import { S } from '../../game/enemy.js';
import { cam, orbit, timed, lineDuration, cp, inCells, nearXZ, hintUntil, waitKills, alive, shake, flashBang } from '../../game/kit.js';
import { app } from '../../core/app.js';
import { THREE, toonMaterial, PALETTE } from '../../../pixel-engine.js';

function* intro(a) {
  const [px, pz] = [a.player.x, a.player.z];
  if (!a.hasFlag('arrived')) {
    const ls = timed(ARRIVAL, 0.8);
    yield* a.cutscene({
      shots: [{ at: 0, ...cam(px + 7, 3.2, pz - 9, px - 2, 1.5, pz - 2, 52) }, { at: 5, ...cam(px + 3, 2.6, pz - 5, px, 1.6, pz - 1, 48) }, { at: 7, ...cam(px - 3.2, 1.6, pz + 3.6, px, 1.7, pz, 42), cut: true }, { at: 16, ...cam(px - 2.4, 1.7, pz + 2.6, px, 1.75, pz, 40) }, { at: 17, ...cam(px + 5, 2.2, pz - 6, px - 5, 2.5, pz - 14, 46), cut: true }, { at: 26, ...cam(px + 6, 2.6, pz - 8, px - 6, 3, pz - 16, 46) }],
      lines: ls, duration: lineDuration(ls) + 0.5,
      cues: [{ at: 0.2, run: () => a.audio('sea'), cosmetic: true }, { at: 15.5, run: () => a.audio('tannoyOn'), cosmetic: true }],
    });
    a.setFlag('arrived');
  }
  a.setObjective('FIND DAME OTTOLINE VANE');
  a.autosave();
  yield* hintUntil(a, 'USE THE LEFT STICK / WASD TO MOVE', () => a.player.speed > 1, 12);
  yield* hintUntil(a, 'HOLD CIRCLE / SHIFT TO RUN', () => a.player.speed > 4, 10);
}
function* firstTannoy(a) {
  const t = a.tannoys[0]; if (!t) return;
  while (!nearXZ(a, t.x, t.z, 9) && t.alive) yield 0.25;
  if (t.alive) { a.audio('tannoyOn', t.x, t.z); a.scripts.bark('COMMODORE', TANNOY_LINES[0], 4); }
  yield* hintUntil(a, 'HOLD L2 / RIGHT MOUSE TO AIM. R2 / LEFT MOUSE TO FIRE. SHOOT THE LOUDSPEAKER.', () => !t.alive, 40);
}
function* cottage(a) {
  const [dx, dz] = cp(a, 42, 30);
  const mender = a.spawn('gaffer', ...cp(a, 43, 35), { work: true, state: S.WORK, yaw: Math.PI, model: 'islander-bare', group: 'cottage' });
  mender.holdStill = true;
  while (!inCells(a, 39, 31, 45, 37)) yield 0.25;
  if (a.hasFlag('mender-done')) return;
  a.def.mender = function* () {};
  yield* a.say('MAX', MENDER_TALK[0][1]); yield* a.say('MENDER', MENDER_TALK[1][1]); yield* a.say('MAX', MENDER_TALK[2][1]);
  mender.alert(); mender.bandBright = true;
  a.showHint('HEAD AND LEG SHOTS STAGGER. THEN: KICK', 12);
  a.scripts.bark('MAX', "I'LL PUT YOU DOWN AS A NO.", 3);
  yield () => mender.dead || a.player.dead;
  a.hintT = 0;
  a.setFlag('mender-done');
  flashBang(a, 'orange', 0.3); shake(a, 0.5); a.audio('barrel');
  a.ctx.lights.request({ position: [a.player.x + 6, 3, a.player.z - 4], color: 0xff6020, intensity: 12, radius: 14, lifetime: 20, flicker: 'torch' });
  yield 1.2;
  a.bark('MAX', "THAT'LL BE THE EXCESS.", 3);
  for (let i = 0; i < 2; i++) a.spawnAtDoor('gaffer', '4', { state: S.APPROACH });
  const [wx, wz] = cp(a, 46, 34);
  a.showHint('A WINDOW! PRESS ACTION TO VAULT OUT', 14);
  yield () => a.player.state === 'vault' || !inCells(a, 39, 31, 45, 37);
  a.hintT = 0;
}
function* quayFront(a) {
  const [fx, fz] = cp(a, 44, 7);
  const grp = [];
  for (let i = 0; i < 3; i++) grp.push(a.spawn('gaffer', fx + 4 + i, fz + 8 + i * 2, { work: true, state: S.WORK, group: 'front' }));
  while (!nearXZ(a, fx, fz, 6)) yield 0.5;
  if (a.hasFlag('fathom-met')) return;
  a.setFlag('fathom-met');
  for (const [w, t] of FATHOM_INTRO) yield* a.say(w, t);
  a.showHint('THE CASE IS TIGHT: SHELLS TAKE ROOM. PRESS TAB TO PACK IT', 10);
}
function* siege(a) {
  const [sx, sz] = cp(a, 30, 22);
  while (!inCells(a, 22, 15, 40, 29)) yield 0.25;
  if (a.hasFlag('siege-done')) return;
  a.setFlag('siege-started'); a.setObjective('SURVIVE THE SQUARE');
  app_mixPlay(a, 'siege');
  // bonfire + effigy + 14 islanders round it
  a.placeModel('effigy', sx, sz, 0, { collide: false });
  a.placeModel('campfire', sx, sz + 1.2, 0, { collide: false });
  a.ctx.lights.request({ position: [sx, 2, sz], color: 0xff7a20, intensity: 18, radius: 14, flicker: 'torch' });
  const crowd = [];
  for (let i = 0; i < 14; i++) { const ang = i / 14 * Math.PI * 2; crowd.push(a.spawn('gaffer', sx + Math.cos(ang) * 4.2, sz + Math.sin(ang) * 4.2, { work: true, state: S.WORK, yaw: ang + Math.PI, group: 'crowd' })); }
  const ls = timed(SIEGE_START, 0.5);
  yield* a.cutscene({ shots: [{ at: 0, ...cam(sx - 12, 5, sz - 8, sx, 1.8, sz, 55) }, { at: 5.5, ...cam(sx - 6, 3, sz - 2, sx, 2.4, sz, 48) }], lines: ls, duration: 6.2, cues: [{ at: 0.1, run: () => a.audio('tannoyOn') }] });
  for (const e of crowd) e.alert();
  a.siegeT0 = a.time; a.siegeKills0 = a.killsThisArea;
  // tide of waves from the spawn doors
  a.scripts.start(function* () {
    yield 60 - 0;
    const total = { gaffer: 16, bottler: 4 };
    const doors = ['1', '2', '3', '4', '5'];
    let i = 0;
    const batch = [];
    for (let k = 0; k < 16; k++) { batch.push(a.spawnAtDoor('gaffer', doors[i++ % 5], { state: S.WAIT })); if (k % 4 === 3) yield 6; else yield 1.2; }
    for (let k = 0; k < 4; k++) { batch.push(a.spawnAtDoor('bottler', doors[(i++) % 5], { state: S.WAIT })); yield 2; }
  }, 'waves');
  a.scripts.start(function* () {
    yield 90 - 0;
    const f = a.spawnAtDoor('flenser', '2', { state: S.APPROACH });
    a.audio('saw', f.x, f.z); a.flenser = f;
    a.showHint('YOU HEAR THE SAW BEFORE YOU SEE HIM. AIM FOR THE HEAD', 8);
  }, 'flenser');
  // end: 3:30 or 34 kills
  while (a.time - a.siegeT0 < 210 && a.killsThisArea - a.siegeKills0 < 34) yield 0.5;
  yield* foghorn(a);
}
function app_mixPlay(a, n) { app.mix?.play(n); }
function* foghorn(a) {
  a.setFlag('foghorn');
  a.scripts.tasks = a.scripts.tasks.filter((t) => !['waves', 'flenser', 'stream'].includes(t.name));
  app.mix?.play(null);
  const [hx, hz] = cp(a, 57, 7);
  const ls = timed(FOGHORN, 5.5);
  yield* a.cutscene({
    shots: [{ at: 0, ...cam(a.player.x + 4, 3, a.player.z + 6, hx, 10, hz, 55) }, { at: 5, ...cam(a.player.x + 2, 2.4, a.player.z + 4, a.player.x - 6, 2, a.player.z - 4, 50) }, { at: 10, ...cam(a.player.x - 4, 3, a.player.z - 6, a.player.x + 8, 1.5, a.player.z + 6, 52) }],
    lines: ls, duration: lineDuration(ls) + 1,
    cues: [{ at: 0.4, run: () => { a.audio('foghorn'); shake(a, 0.7); } }, { at: 1.5, run: () => { for (const e of a.enemies) if (!e.dead) { e.releaseToken(); e.setState(S.SEA); e.seaT = 0; } if (a.flenser && !a.flenser.dead) a.flenser.setState(S.SEA); } }],
  });
  a.setFlag('siege-done');
  for (const e of a.enemies) if (!e.dead && e.state !== S.SEA) e.setState(S.SEA);
  a.setObjective('FIND THE WEST GATE'); a.autosave();
  a.def.gateOpen = true;
  const gate = a.level.doors.find((d) => d.kind === 'G'); if (gate) a.openDoor(gate);
  a.audio('stoneGrind');
}
function* leave(a) {
  while (!a.hasFlag('siege-done')) yield 0.5;
  const [gx, gz] = cp(a, 0, 8);
  while (!nearXZ(a, gx, gz, 4.5)) yield 0.4;
  yield* a.finishArea({ next: 'road', title: 'CLAIM 1: ACT OF GOD' });
}

/** The Net Loft's upper floor, an inside ladder, and outside ladders raised by islanders. */
function setupLoft(a) {
  const lv = a.level, ctx = a.ctx;
  const c0 = lv.wx(23), c1 = lv.wx(36), z0 = lv.wz(5), z1 = lv.wz(12);
  const cx = (c0 + c1) / 2, cz = (z0 + z1) / 2, w = c1 - c0 + 1, d = z1 - z0 + 1;
  ctx.physics.addStaticBox({ position: [cx, 2.6, cz], halfExtents: [w / 2, 0.6, d / 2] });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, d), toonMaterial(PALETTE.orange)); floor.position.set(cx, 3.0, cz); a.ctx.scene.add(floor);
  const L = lv.markers.L && lv.markers.L[0];
  a.loft = { floor, ladders: [], up: L ? { x: L.x, z: L.z } : null, c0, c1, z0, z1 };
  if (L) a.placeModel('ladder', L.x, L.z, 0, { collide: false, params: { rungs: 11 } });
  a.loft.eMarks = [{ x: lv.wx(37), z: lv.wz(9) }, { x: lv.wx(22), z: lv.wz(9) }];
  ctx.lights.request({ position: [cx, 5.5, cz], color: 0xffa860, intensity: 8, radius: 14 });
}
function loftContexts(a) {
  const p = a.player, out = [], lf = a.loft; if (!lf || !lf.up) return out;
  if ((p.y || 0) < 1 && Math.hypot(p.x - lf.up.x, p.z - lf.up.z) < 1.6) out.push({ prio: 3, label: 'CLIMB LADDER', verb: 'action', run: () => { p.startTraverse('climb', lf.up.x + 0.8, lf.up.z + 1.2, 1.2, null, 3.3); a.audio('ladder'); } });
  if ((p.y || 0) > 2 && Math.hypot(p.x - lf.up.x, p.z - lf.up.z) < 2.2) out.push({ prio: 3, label: 'CLIMB DOWN', verb: 'action', run: () => { p.startTraverse('climb', lf.up.x, lf.up.z + 1.6, 1.2, null, 0); a.audio('ladder'); } });
  for (const l of lf.ladders) if (l.up && (p.y || 0) > 2 && Math.hypot(p.x - l.x, p.z - l.z) < 2.4) out.push({ prio: 2, label: 'KNOCK LADDER DOWN', verb: 'action', run: () => knockLadder(a, l) });
  return out;
}
function raiseLadder(a, m) {
  const o = a.placeModel('ladder', m.x, m.z, 0, { collide: false, params: { rungs: 11 }, y: 0 }).object;
  const l = { x: m.x, z: m.z, obj: o, up: true, climbers: [] };
  a.loft.ladders.push(l); a.audio('ladder', m.x, m.z);
  for (let i = 0; i < 2; i++) { const e = a.spawn('gaffer', m.x + (i - 0.5), m.z + (m.x > 0 ? 2.5 : -2.5), { state: S.APPROACH }); e.setState(S.CLIMB); e.climbDir = 1; e.y = 3.2; e.climbTo = { x: m.x - (m.x > 0 ? 1.5 : -1.5), z: m.z }; e.x = m.x; e.z = m.z; l.climbers.push(e); }
}
function knockLadder(a, l) {
  l.up = false; a.audio('crate', l.x, l.z); a.ctx.tweens.to(l.obj.rotation, { x: 1.4 }, { duration: 0.5 });
  for (const e of l.climbers) if (!e.dead && e.state === S.CLIMB) { e.die({ source: 'fall' }); }
  a.run.stats.kicks++;
}
function* loftRaids(a) {
  while (!a.hasFlag('siege-started')) yield 0.5;
  yield 60; a.setFlag('loft-raids');
  let n = 0;
  while (!a.hasFlag('siege-done') && a.loft) { const m = a.loft.eMarks[n++ % 2]; raiseLadder(a, m); a.showHint('ISLANDERS RAISE A LADDER. CLIMB UP AND KNOCK IT DOWN', 6); yield 25; }
}
export const quay = {
  id: 'quay', name: 'MOURNE QUAY', mapId: 'quay', mood: 'dusk', music: 'explore', chapter: 0, startYaw: Math.PI,
  theme: { floors: { '.': 'cobbles', ',': 'dirt', '=': 'planks', ':': 'rough-boards', '_': 'flagstones' } },
  tannoyLines: TANNOY_LINES.slice(0, 6),
  dress: ['barrel', 'crate', 'sack', 'bucket', 'rope-coil', 'lobster-pot', 'bollard', 'drying-rack'],
  lamps: [[-2, -9], [-14, -3], [8, -3], [-2, 11], [20, -12], [-20, 5]],
  props: [{ id: 'foghorn-tower', at: [26, -17], rot: 0, collide: false, y: 0 }, { id: 'rowboat', at: [22.5, 16.5], rot: 20, collide: false, y: -0.3 }, { id: 'hay-cart', at: [0, -8.5], rot: 0, collide: false }],
  scripts: [intro, firstTannoy, cottage, quayFront, siege, leave, loftRaids],
  setup: setupLoft, contexts: loftContexts,
  botPlan(a) {
    const P = (c, r, o = {}) => ({ x: a.level.wx(c), z: a.level.wz(r), ...o });
    return [P(55, 40), P(49, 34), P(46, 33), P(44, 33, { r: 1.5 }), P(41, 31), P(40, 28), P(44, 17), P(44, 8, { r: 2, wait: 1, shop: true }), P(46, 14), P(40, 16),
      P(30, 22, { r: 3, hold: (x) => !x.hasFlag('siege-done') }), P(10, 24), P(3, 12), P(1, 8, { r: 1.2 })];
  },
  mender: null,
  chestLoot: {},
};
