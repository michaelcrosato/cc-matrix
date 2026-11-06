// Set pieces: siege and Foghorn, winch, belt fight, tide, lens puzzle, crypt. Thin wrappers over the systems.
import { glowMaterial, PALETTE, TEXTURE_LIBRARY, textureDef, textureMap, THREE, toonMaterial } from '../../pixel-engine.js';
import { TUNING } from '../data/tuning.js';
import { SCENES } from '../data/dialogue.js';
import { addItem } from '../core/run.js';
import { Humanoid, buildProp } from './actor.js';
import { Player } from './player.js';
import { Bosun } from './bosses/bosun.js';
import { Bathysphere } from './bosses/bathysphere.js';
// ---- Quay
export function siegeRoomSetup(a) {
  const L = a.level, M = L.markers;
  // Ladders and floors of the Net Loft.
  L.links = []; const ins = { x: L.wx(24), z: L.wz(6) };
  L.links.push({ from: 0, to: 1, a: ins, b: ins, pref: 1.2 });
  const b1 = L.addProp('tall-ladder', ins.x, ins.z + 0.35, 0);
  const lad = (x, z) => a.interact.add({ x, z, floor: 0, radius: 1.5, priority: 6, any: true, verb: 'CLIMB UP', act: () => { climb(a, x, z, 1); return true; } });
  lad(ins.x, ins.z); a.interact.add({ x: ins.x, z: ins.z, floor: 1, radius: 1.5, priority: 6, any: true, verb: 'CLIMB DOWN', act: () => { climb(a, ins.x, ins.z, 0); return true; } });
  // Outside ladders are raised during the siege.
  a.outerLadders = [{ top: { x: L.wx(36), z: L.wz(9) }, bottom: { x: L.wx(38), z: L.wz(9) }, turn: Math.PI / 2 }, { top: { x: L.wx(23), z: L.wz(9) }, bottom: { x: L.wx(21), z: L.wz(9) }, turn: -Math.PI / 2 }];
  for (const o of a.outerLadders) {
    o.down = true; o.obj = L.addProp('tall-ladder', o.bottom.x + (o.bottom.x > o.top.x ? -0.3 : 0.3), o.bottom.z, o.turn); o.obj.object.rotation.z = 0; o.obj.object.visible = false; L.links.push({ from: 0, to: 1, a: o.bottom, b: o.top, ladder: o, disabled: () => o.down, pref: 0.8 });
    a.interact.add({ x: o.top.x, z: o.top.z, floor: 1, radius: 1.6, priority: 8, any: true, verb: 'KNOCK DOWN', when: () => !o.down, act: () => { knockLadder(a, o); return true; } });
  }
  // Drops from upper windows.
  for (const [col, row, land] of [[26, 13, [26, 14, 10]], [32, 13, [32, 14.6, 0]], [30, 4, [30, 2.5, 10]]]) { const x = L.wx(col), z = L.wz(row), lx = L.wx(land[0]), lz = L.wz(land[1]); a.interact.add({ x, z: z + (row === 4 ? 1 : -1), floor: 1, radius: 1.5, priority: 6, any: true, verb: land[2] ? 'DROP' : 'DROP ONTO THE HAY CART', act: () => { a.level.windows.filter((w) => w.floor === 1 && Math.abs(w.x - x) < 1).forEach((w) => a.level.breakWindow(w)); a.player.startAction('drop', 0.6, { fx: x, fz: z, fy: 3.2, tx: lx, tz: lz, ty: 0, toFloor: 0, onEnd: () => { if (land[2]) a.player.hurt(land[2], null, {}); else a.ctx.particles.burst('dust', a.player.pos); a.ctx.audio.play('kickhit', { volume: 0.5 }); } }); return true; } }); }
  // Windows and doors for Max: all maps.
  // Wardrobe to push across the door.
  const p = M.p[0]; if (p) { const b = L.addProp('wardrobe', p.x, p.z, 0); const c = a.ctx.physics.addStaticBox({ position: [p.x, 1, p.z], halfExtents: [0.8, 1, 0.4] }); const door = L.doors.find((d) => d.id === '29,13'); const st = { b, c, pos: [p.x, p.z], object: b.object, used: false }; a.interact.add({ x: p.x, z: p.z - 0.6, radius: 1.6, priority: 7, any: true, verb: 'PUSH WARDROBE', when: () => !st.used && !door.open, act: () => { st.used = true; a.ctx.physics.remove(c); const tx = door.x, tz = door.z - 0.7; a.player.startAction('push', 2.2, { prop: st, fx: p.x, fz: p.z, tx, tz, px: a.player.pos.x, pz: a.player.pos.z, onEnd: () => { door.hp += 8; door.blocker = { collider: a.ctx.physics.addStaticBox({ position: [tx, 1, tz], halfExtents: [0.8, 1, 0.4] }) }; st.gone = () => { }; } }); a.ctx.audio.play('kickwhoosh'); return true; } }); }
}
function climb(a, x, z, to) { const P = a.player; a.ctx.audio.play('ladder'); P.startAction('ladder', 1.2, { fx: P.pos.x, fz: P.pos.z, fy: P.pos.y, tx: x, tz: z, ty: to * a.floorH, toFloor: to }); }
function knockLadder(a, o) { o.down = true; o.obj.object.visible = false; a.ctx.audio.play('ladderfall'); a.ctx.particles.burst('dust', [o.bottom.x, 0.5, o.bottom.z]); for (const e of a.enemies) if (e.climb?.ladder === o && e.state === 'CLIMB') { e.floor = 0; e.pos.y = 0; e.damage(30, 'torso', { explosive: true }); if (!e.dead) e.setState('KNOCKDOWN', 2.2); } }
export function raiseLadder(a, o) { if (!o.down) return; o.down = false; o.obj.object.visible = true; o.obj.object.rotation.x = 0; a.ctx.audio.play('ladder', a.spatialPlay({ x: o.bottom.x, y: 1, z: o.bottom.z })); }
export function startSiege(a) {
  const R = a.rng, st = a.siege = { t: 0, over: false, ladderT: 60, bottlers: false, flenser: false, kills0: a.killCount ?? 0 };
  a.waves.push(st.w = a.startWave({ groups: [['gaffer', 16]], every: 3.4, maxActive: Math.round(TUNING.maxActive), delay: 2 })); a.waves.pop(); a.waves.push(st.w);
  a.addScript([{ until: (A) => st.t >= 60 }, { run: (A) => { A.startWave({ groups: [['bottler', 4], ['netwife', 3]], every: 8, maxActive: 14 }); A.say('COMMODORE', 'THE LADDERS, PLEASE.', 2); } }, { until: (A) => st.t >= 90 }, { run: (A) => { const d = A.level.spawns[2]; A.flenser = A.spawnEnemy('flenser', d.x, d.z); A.say('MAX', 'That noise is not in the brochure.', 2); } }]);
  a.def.fixed = (A, dt) => {
    if (st.over) return; st.t += dt; st.ladderT -= dt;
    if (st.ladderT <= 0) { st.ladderT = 25; const o = R.pick(A.outerLadders); raiseLadder(A, o); }
    if (st.t >= 210 || (A.killCount ?? 0) - st.kills0 >= 34) { st.over = true; foghornScene(A); }
  };
  a.extraHud = null;
}
export function foghornScene(a) {
  if (a.foghornStarted) return; a.foghornStarted = true; const L = a.level, horn = [L.wx(57), 16, L.wz(7)]; for (const w of a.waves) w.stop(); a.app.mix.play(null, 0.3); a.silent = true; a.calm = true; a.qte.cancel();
  a.ctx.audio.play('foghorn'); a.ctx.engine.shake.add(0.8); a.ctx.particles.burst('feathers', [a.player.pos.x + 4, 6, a.player.pos.z]); const P = a.player; P.locked = true; P.aiming = false; P.grabbed = null; P.action = null;
  const alive = a.enemies.filter((e) => !e.dead); let i = 0; for (const e of alive) { e.path = null; e.hesitate = 0.8 + (e.type === 'flenser' ? 5 : a.rng.range(0, 2)); e.token = false; e.seaSpeed = 1; if (e.h?.props.weapon) { const w = e.h.detach('weapon'); a.dropProp('w-gaff', e.pos); } if (e.sawVoice && e.type !== 'flenser') e.sawVoice.stop(); e.alerted = true; e.setState('SEA'); e.cool = 99; i++; } a.tokensHeld = 0; a.throwHolder = null;
  const f = alive.find((e) => e.type === 'flenser') ?? alive[0]; const c = () => (f && !f.dead ? [f.pos.x, 1.2, f.pos.z] : [P.pos.x, 1.2, P.pos.z - 4]);
  a.addScript([
    { scene: 'nocue', run: () => {}, duration: 14, shots: (A) => { const cp = c(); return [{ at: 0, position: [L.wx(50), 2.5, L.wz(14)], target: horn, fov: 40 }, { at: 3.5, position: [L.wx(50), 3, L.wz(20)], target: horn, fov: 30 }, { at: 3.6, cut: true, position: [cp[0] + 5, 2.4, cp[2] + 4], target: cp, fov: 45 }, { at: 9, position: [L.wx(48), 3, L.wz(24)], target: [L.wx(52), 0, L.wz(24)], fov: 40 }, { at: 14, position: [L.wx(47), 3.2, L.wz(26)], target: [L.wx(54), -0.2, L.wz(26)], fov: 36 }]; } },
    { until: (A) => A.enemies.every((e) => e.dead) || A.foghornT > 18 }, { run: (A) => { A.silent = false; A.calm = false; } },
    { scene: 'foghorn', duration: 12, shots: (A) => [{ at: 0, position: [L.wx(47), 2.2, L.wz(25)], target: [L.wx(54), 0, L.wz(27)], fov: 40 }, { at: 12, position: [L.wx(46), 2, L.wz(25)], target: [L.wx(58), 0.5, L.wz(27)], fov: 32 }] },
    { run: (A) => { for (const e of [...A.enemies]) if (e.state !== 'DEAD') A.removeEnemy(e); A.player.locked = false; A.enterStage('after'); } },
  ]);
  a.foghornT = 0; a.def.fixed = (A, dt) => { A.foghornT += dt; };
}
// ---- Cannery
export function coldRoomSetup(a) { const L = a.level, D = (id) => L.doors.find((d) => d.id === id);
  const door0 = D('24,35'); if (door0) { door0.sealed = true; }
  const cold = D('37,9'); cold.keyOK = () => a.run.keys.includes('coldkey'); cold.lockText = 'LOCKED: COLD ROOM KEY'; cold.lockSay = 'Locked. The key is on someone large.';
  const w = D('9,9'); w.sealed = true; const sd = D('5,15'); sd.sealed = true; const e = D('42,16'); e.sealed = true;
  const d0 = D('10,0'); L.extraBlock = null;
  if (!a.run.flags.dameFree) { const m = L.markers.d[0]; const h = new Humanoid(a.ctx, 'dame', { scale: 0.82 }); h.root.position.set(m.x, 0, m.z); h.root.rotation.y = -2.4; h.play('Sit'); a.dameStatic = { h, remove() { h.remove(); a.dameStatic = null; } }; L.addSolidProp('fish-crate', m.x, m.z - 0.1); }
  const fix = a.def.update; a.def.update = (A, dt) => { if (A.dameStatic) A.dameStatic.h.update(dt); if (A.cold && A.level.row(A.player.pos.z) < 9 && A.level.col(A.player.pos.x) > 33) { A.breathT = (A.breathT ?? 0) - dt; if (A.breathT <= 0) { A.breathT = 0.6; const P = A.player; A.ctx.particles.burst('breath', [P.pos.x, 1.45, P.pos.z]); if (A.dame) A.ctx.particles.burst('breath', [A.dame.pos.x, 1.2, A.dame.pos.z]); } } };
  // The sign over the hall: THOLE & SONS, as a texture of pixels.
  addSign(a);
  // Carcasses swing on a moving overhead rail.
  a.carcasses = []; for (let i = 0; i < 9; i++) { const c = buildProp('carcass', { shadow: true }); c.object.position.set(L.wx(8 + i * 3.5), 3.8, L.wz(18)); a.ctx.scene.add(c.object); a.carcasses.push(c.object); }
  const prevU = a.def.update; a.def.update = (A, dt) => { prevU(A, dt); const x0 = L.wx(8), span = 31; for (const c of A.carcasses) { c.position.x += dt * 0.9; if (c.position.x > x0 + span) c.position.x = x0; c.rotation.z = Math.sin(A.time * 1.2 + c.position.x) * 0.06; } const W = A.winch; if (W?.wheel) W.wheel.rotation.x += W.on ? dt * 3 : 0; };
}
export function addWinch(a) {
  const L = a.level, w = L.markers.w[0]; const b = L.addSolidProp('winch', w.x, w.z, 0); a.winch = { pct: 0, on: false, wheel: b.object.getObjectByName('Wheel') };
  const shut = L.gates.S?.[0]; a.def.fixed = (A, dt) => { const W = A.winch; if (!W?.on) return; const D = A.dame; const dist = D.carried ? 0 : A.enemies.reduce((m, e) => (e.dead ? m : Math.min(m, Math.hypot(e.pos.x - D.pos.x, e.pos.z - D.pos.z))), 99); W.disturbed = D.carried || dist < 2.5 || !D.machine; if (!D.carried && !D.machine && D.mode !== 'wait') { /* she returns */ D.goal ??= { x: w.x + 0.8, z: w.z + 0.8, done: () => { D.machine = { x: w.x, z: w.z, clip: 'DameHoist' }; } }; } if (!W.disturbed) W.pct = Math.min(100, W.pct + (100 / 90) * dt); if (shut && shut.group) shut.group.position.y = (W.pct / 100) * 3.4; };
  a.extraHud = (ui) => { const W = a.winch; if (!W?.on) return; ui.center(8, `SHUTTER ${Math.floor(W.pct)}%${W.disturbed ? ' - DISTURBED' : ''}`, { color: W.disturbed ? 'red' : 'sand' }); ui.bar(ui.W / 2 - 60, 18, 120, 4, W.pct / 100, 'sand'); };
}
export function beltFight(a) {
  const L = a.level, P = a.player, x0 = P.pos.x, z0 = L.wz(13.5); P.locked = true; P.aiming = false; a.beltDone = false; a.app.mix.play('combat', 0.1); if (a.dame) { a.dame.mode = 'wait'; }
  for (const e of [...a.enemies]) if (!e.dead && e.type !== 'ansgar') e.die({});
  const A0 = a.ansgarM = new Humanoid(a.ctx, 'ansgar'); A0.attach('HandR', 'w-gaff', { as: 'weapon' }); A0.root.position.set(x0 - 1, 0, z0); A0.root.rotation.y = 1.57; A0.play('Grapple'); P.teleport(x0, z0, 0, 1.57); P.h.play('KnockedDown', { restart: true }); a.ctx.audio.play('hurtmax'); const press = L.wx(38); const st = { x: x0, step: 0 }; a.belt = st; const speed = (press - x0 - 0.5) / 24;
  const shot = () => [{ at: 0, position: [st.x - 2.6, 1.8, z0 + 2.8], target: [st.x, 0.6, z0], fov: 46 }, { at: 40, position: [st.x + 3, 1.8, z0 + 2.8], target: [st.x, 0.6, z0], fov: 46 }];
  a.camOverride = () => ({ position: [st.x - 2.4, 1.9, z0 + 2.9], target: [st.x + 0.3, 0.7, z0], fov: 46 });
  a.say('ANSGAR', 'VOR THOLE! OV THE TIDE!', 2);
  const qs = [{ type: 'press', button: 'action', label: 'FOREARM' }, { type: 'press', button: 'dodge', label: 'ROLL' }, { type: 'press', button: 'action', label: 'KNEE HIM' }, { type: 'press', button: 'dodge', label: 'ROLL' }, { type: 'mash', label: 'THROW HIM', fill: 8, time: 5, drain: 0.5, mashTimeoutOk: false }];
  const next = () => { if (st.step >= qs.length) { finish(); return; } const q = qs[st.step]; a.qte.start({ ...q, time: q.time ?? TUNING.qteWindow * 1.6, owner: P, slow: false, onDone: (ok) => { if (ok) { st.step++; A0.play(st.step % 2 ? 'AnsgarSwing' : 'AnsgarHook', { restart: true }); a.ctx.audio.play('kickhit'); a.ctx.tweens.call(0.9, next); } else { P.hurt(9, null, { dot: true }); a.ctx.audio.play('hurtmax'); a.say('MAX', a.rng.pick(['Not covered.', 'Adjusting.', 'One moment, please.']), 1.2); st.x = Math.max(x0, st.x - 2.5); a.ctx.tweens.call(0.8, next); } } }); };
  const finish = () => { st.over = true; A0.play('Hurt', { restart: true }); a.ctx.audio.play('kickhit'); a.ctx.tweens.to(A0.root.position, { x: press + 1 }, { duration: 1.1 }); a.ctx.tweens.call(1.1, () => { a.ctx.audio.play('palletdrop'); a.ctx.engine.shake.add(0.9); a.ctx.engine.hitstop(0.1); A0.remove(); a.ansgarM = null; const can = buildProp('can-tin'); can.object.position.set(press - 0.8, 0.1, z0); a.ctx.scene.add(can.object); a.ctx.tweens.to(can.object.position, { x: press - 4 }, { duration: 2 }); }); a.ctx.tweens.call(2.4, () => { a.say('MAX', 'Workplace accident. Noted.', 2); }); a.ctx.tweens.call(4.3, () => { a.camOverride = null; P.teleport(st.x - 1, L.wz(11.5), 0, Math.PI); P.locked = false; a.beltDone = true; a.app.mix.play('explore'); if (a.dame) a.dame.setMode('follow'); }); };
  const prev = a.def.update; a.def.update = (A, dt) => { prev?.(A, dt); if (A.ansgarM) { A.ansgarM.update(dt); } if (!st.over && st.x < press - 1.6) st.x += speed * dt; if (!st.over) { P.pos.x = st.x; P.prev.x = st.x; P.body.teleport([st.x, 0, z0]); if (A.ansgarM) A.ansgarM.root.position.x = st.x - 1; } };
  a.ctx.tweens.call(1, next);
}
// ---- Yard
export function bosunBoss(a) { a.boss = new Bosun(a); a.say('COMMODORE', 'THE BOSUN WOULD LIKE A WORD.', 2); }
// ---- Causeway
export function tideStart(a) {
  const dur = 240, st = a.tide = { t: dur, dur, gate: false, wheel: 0, spawned: new Set() }, L = a.level, water = a.waters[0]; const gate = L.gates.G?.[0]; a.tideY = -0.6;
  // Two rowboats with harpooners shadow you at 10 m.
  st.boats = [-1, 1].map((s, i) => { const r = buildProp('rowboat'); a.ctx.scene.add(r.object); const e = a.spawnEnemy('harpooner', 0, 0, { state: 'BOAT' }); e.boat = r.object; e.side = s * 11; e.t = 0; e.cool = 4 + i * 3; e.s_BOAT = function (dt) { const P = a.player; this.pos.set(s * 11, this.pos.y, P.pos.z + (i ? 6 : -6)); const wy = a.tideY - 0.1; this.pos.y = wy + 0.4; this.boat.position.set(this.pos.x, wy, this.pos.z); this.face(P.pos, 0.2); if (this.cool <= 0 && !this.windT) { this.windT = 1.4; this.glint = a.addProjectileGlint?.(this); a.ctx.audio.play('armorping', a.spatialPlay(this.pos, 0.6)); } if (this.windT > 0) { this.windT -= dt; if (this.windT <= 0) { this.windT = 0; this.cool = 7; a.spawnThrow(this, a.rng.chance(0.6) ? { pos: P.pos.clone().add(new THREE.Vector3(a.rng.range(-1.4, 1.4), 0, a.rng.range(-1.4, 1.4))) } : P); } } }; return e; });
  const dame = a.dame; a.def.fixed = (A, dt) => {
    const S = A.tide; if (S.over) return; S.t -= dt; const k = 1 - S.t / S.dur; A.tideY = -0.6 + k * 1.5; water.position.y = A.tideY; const P = A.player, ch = L.charAt(P.pos.x, P.pos.z); const onRoad = ch === '.' || ch === '%' || ch === '=' ; const depth = A.tideY - 0; A.waterK = onRoad && depth > 0.0 ? 0.7 : 1; if (depth > 0.7 && onRoad) P.hurt(2 * dt, null, { dot: true });
    for (const key of '12345') { const sp = L.spawns[key]; if (!sp || S.spawned.has(key)) continue; if (P.pos.z < sp.z + 12) { S.spawned.add(key); for (let i = 0; i < 2 + (+key > 2 ? 1 : 0); i++) A.spawnEnemy('drowned', sp.x + A.rng.range(-1.5, 1.5), sp.z + A.rng.range(-1.5, 1.5), { state: 'RISE' }).t = 1; } }
    if (S.t <= 0 && !P.god) { P.run.health = 0; P.die('tide'); S.over = true; }
    if (!S.gate && L.row(P.pos.z) <= 6 && !S.wheelOn) { S.wheelOn = true; A.say('DAME', 'Hold them. I shall turn the wheel.', 2); const w = L.addSolidProp('gate-wheel', L.wx(4), L.wz(3), 1.57); S.wheelObj = w.object.getObjectByName('Wheel'); if (dame) { dame.goal = { x: L.wx(5), z: L.wz(4), run: true, done: () => { dame.machine = { x: L.wx(4), z: L.wz(3), clip: 'DameHoist' }; S.turning = true; } }; } else S.turning = true; for (let i = 0; i < 3; i++) A.spawnEnemy('drowned', L.wx(5 + i * 2), L.wz(10), { state: 'RISE' }).t = 1; }
    if (S.turning && !S.gate) { S.wheel += dt; if (S.wheelObj) S.wheelObj.rotation.z += dt * 2; if (S.wheel >= 6) { S.gate = true; if (gate) L.openGate(gate); if (dame) { dame.machine = null; dame.setMode('follow'); } A.say('COMMODORE', 'YOU HAVE READ THE TIDE TABLES. HOW TEDIOUS.', 2); A.setObjective('INTO THE ABBEY.'); } }
    if (S.gate && L.row(P.pos.z) <= 1) { S.over = true; A.go('abbey'); }
  };
  a.extraHud = (ui) => { const S = a.tide; if (S.over) return; const k = S.t / S.dur, x = ui.W - 22, y = 34, h = 120; ui.rect(x, y, 10, h, 'night'); ui.rect(x, y + h * k, 10, h * (1 - k), 'blue'); ui.text(x - 36, y + h + 4, `${Math.floor(S.t / 60)}:${String(Math.floor(S.t % 60)).padStart(2, '0')}`, { color: k < 0.2 ? 'red' : 'cyan' }); ui.text(x - 24, y - 10, 'TIDE', { color: 'cyan' }); };
}
// ---- Abbey
const LENS_TARGET = [1, 7, 0];
export function lensSetup(a) { const L = a.level; const stat = L.markers.s; a.statues = []; const gate = [L.wx(21.5), 2.6, L.wz(7)];
  const nv = L.doors.find((d) => d.id === '7,30'); if (nv) nv.sealed = true;
  // Sort statues left, right, bottom so the mosaic reads in that order.
  const sorted = [stat.find((m) => m.col === 14 && m.row === 14), stat.find((m) => m.col === 29), stat.find((m) => m.row === 25)];
  sorted.forEach((m, i) => { const b = L.addSolidProp('lamp-statue', m.x, m.z); const turn = b.object.getObjectByName('Turn'); const beam = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1), glowMaterial(PALETTE.sand)); beam.castShadow = false; a.ctx.scene.add(beam); const s = { m, step: (i * 3 + 3) % 8, turn, beam, ok: false, t: 0, target: LENS_TARGET[i] }; a.statues.push(s); s.it = a.interact.add({ x: m.x, z: m.z, radius: 2.2, priority: 5, any: true, verb: 'TURN THE LAMP', when: () => !a.lensSolved, act: () => { s.step = (s.step + 1) % 8; a.player.startAction('push', 1.2, { prop: { pos: [m.x, m.z], object: new THREE.Object3D() }, fx: m.x, fz: m.z, tx: m.x, tz: m.z, px: a.player.pos.x, pz: a.player.pos.z }); a.ctx.audio.play('gatewheel', a.spatialPlay({ x: m.x, y: 1, z: m.z })); a.noise?.(m.x, m.z, 8); return true; } }); });
  const q = L.markers.q[0]; L.addProp('mosaic', q.x, q.z); a.interact.add({ x: q.x, z: q.z, radius: 2.4, priority: 3, any: true, verb: 'READ THE MOSAIC', when: () => !a.lensSolved, act: () => { a.say('MAX', 'West lamp north-west. East lamp north-east. South lamp north. Three lenses over the gate.', 6); a.mosaicRead = 8; return true; } });
  const M = L.markers.v[0]; const grate = new THREE.Mesh(new THREE.BoxGeometry(2, 0.04, 2), toonMaterial(PALETTE.night)); grate.position.set(M.x, 0.02, M.z); a.ctx.scene.add(grate);
  const lens = [-1, 0, 1].map((k) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.1), glowMaterial(PALETTE.navy)); m.position.set(gate[0] + k * 1.2, 3.4, gate[2] + 0.2); a.ctx.scene.add(m); return m; });
  a.def.update = (A, dt) => {
    if (A.mosaicRead > 0) A.mosaicRead -= dt;
    let all = true; A.statues.forEach((s, i) => { const yaw = Math.PI - (s.step * Math.PI) / 4 * 1; s.cur = s.cur ?? yaw; let d = yaw - s.cur; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; s.cur += d * Math.min(1, dt * 6); s.turn.rotation.y = s.cur; const dx = Math.sin(s.cur), dz = Math.cos(s.cur); const o = new THREE.Vector3(s.m.x + dx * 0.9, 1.8, s.m.z + dz * 0.9); const ok = s.step === s.target; let len = 6; if (ok) { const tgt = lens[i].position; len = o.distanceTo(tgt); s.beam.position.lerpVectors(o, tgt, 0.5); s.beam.lookAt(tgt); lens[i].material = glowMaterial(PALETTE.sand); } else { const e = o.clone().add(new THREE.Vector3(dx * len, 0, dz * len)); s.beam.position.lerpVectors(o, e, 0.5); s.beam.lookAt(e); lens[i].material = glowMaterial(PALETTE.navy); all = false; } s.beam.scale.z = len; });
    if (all && !A.lensSolved) { A.lensSolved = true; A.ctx.audio.play('rumble'); A.ctx.engine.shake.add(0.5); }
    A.cryptU?.(dt);
  };
  a.extraHud = (ui) => { if (a.mosaicRead > 0) { ui.center(ui.H / 2 - 40, 'WEST: NW   EAST: NE   SOUTH: N', { color: 'sand', scale: 2 }); } a.cryptHud?.(ui); };
  // West lamp target is NW etc. Steps count clockwise from north.
}
export function cryptStart(a) {
  if (a.cryptOn) return; a.cryptOn = true; const L = a.level, max = a.player, D = a.dame;
  for (const e of [...a.enemies]) if (!e.dead) a.removeEnemy(e); for (const w of a.waves) w.stop();
  if (D) { D.active = false; D.root.visible = false; a.ctx.particles.burst('dust', D.pos, { count: 18 }); }
  a.ctx.audio.play('kickhit'); a.ctx.engine.shake.add(0.5); a.app.mix.play(null); a.silent = true; max.locked = true; a.fillLight = 0.8;
  const startX = L.wx(3.5), startZ = L.wz(11.5); const dP = new Player(a, startX, startZ, { model: 'dame', yaw: 0, floor: 0 }); dP.h.root.scale.setScalar(0.82); dP.dameMode = true; dP.noAim = true; dP.h.detach('gun');
  max.locked = true; max.body.teleport([L.wx(9), 0, L.wz(11)]); max.pos.set(L.wx(9), 0, L.wz(11)); max.prev.copy(max.pos); a.maxP = max; max.root.visible = false; max.laser.visible = false;
  a.player = dP; a.players = [dP]; const C = a.crypt = { hits: 0, lever: false, cool: 0, noiseAt: null, start: [startX, startZ] }; a.minimalHud = true;
  const lp = L.markers.l[0]; const lb = L.addSolidProp('crypt-lever', lp.x, lp.z); a.interact.add({ x: lp.x, z: lp.z, radius: 2, priority: 6, any: true, verb: 'PULL THE LEVER', when: () => a.crypt && !C.lever, act: () => { C.lever = true; a.ctx.audio.play('chain'); lb.object.getObjectByName('Arm').rotation.x = 1.2; const d = L.doors.find((x) => x.id === '7,30'); d.sealed = false; L.openDoor(d, null, true); a.setObjective('THE DOOR IS OPEN. GET OUT.'); return true; } });
  for (const m of L.markers.h) { L.addProp('hide-niche', m.x, m.z); a.interact.add({ x: m.x, z: m.z, radius: 1.8, priority: 5, any: true, get verb() { return C.hidden === m ? 'STEP OUT' : 'HIDE'; }, when: () => !!a.crypt, act: () => { C.hidden = C.hidden === m ? null : m; dP.root.visible = !C.hidden; if (C.hidden) { dP.locked = false; C.hideLock = true; } else C.hideLock = false; a.ctx.audio.play('ladder', { volume: 0.5 }); return true; } }); }
  C.lamps = [[3, 19], [4, 25], [3, 31]].map(([col, row]) => { const x = L.wx(col), z = L.wz(row); const b = L.addProp('throw-lamp', x, z); const st = { x, z, b, gone: false }; st.light = a.ctx.lights.request({ position: [x, 0.5, z], color: 0xffa040, intensity: 4, radius: 5, flicker: 'torch' }); a.interact.add({ x, z, radius: 1.6, priority: 6, any: true, verb: 'THROW THE LAMP', when: () => !st.gone && a.crypt, act: () => { st.gone = true; a.ctx.scene.remove(b.object); st.light.release(); const tx = x + Math.sin(dP.yaw) * 6, tz = z + Math.cos(dP.yaw) * 6; a.ctx.audio.play('glass', { volume: 0.7 }); a.spawnFire(new THREE.Vector3(tx, 0.1, tz), 1, 2); C.noiseAt = { x: tx, z: tz, r: 22, t: 4 }; return true; } }); return st; });
  a.noise = (x, z, r) => { if (a.crypt) C.noiseAt = { x, z, r, t: 2 }; };
  // Three blind knights. Hearing: run 9 m, walk 4 m, still 0.
  const patrols = [[[2, 15], [5, 18], [2, 21]], [[5, 22], [2, 25], [5, 28]], [[5, 29], [2, 30], [5, 27]]]; C.knights = patrols.map((pts, i) => { const wp = pts.map(([c0, r0]) => ({ x: L.wx(c0), z: L.wz(r0) })); const e = a.spawnEnemy('knight', wp[0].x, wp[0].z, { state: 'PATROL', hpMul: 3 }); e.h.detach('helmet'); e.helmet = 0; e.alerted = true; e.wp = wp; e.wi = 0; e.s_PATROL = function (dt) { const S = C; if (S.noiseAt && Math.hypot(S.noiseAt.x - this.pos.x, S.noiseAt.z - this.pos.z) < S.noiseAt.r) { this.heard = { x: S.noiseAt.x, z: S.noiseAt.z, t: 3 }; } let tx, tz, sp = 0.9; if (this.heard) { tx = this.heard.x; tz = this.heard.z; sp = 1.7; this.heard.t -= dt; if (this.heard.t <= 0 || Math.hypot(tx - this.pos.x, tz - this.pos.z) < 0.8) this.heard = null; } else { const w = this.wp[this.wi]; tx = w.x; tz = w.z; if (Math.hypot(tx - this.pos.x, tz - this.pos.z) < 0.6) this.wi = (this.wi + 1) % this.wp.length; } const dx = tx - this.pos.x, dz = tz - this.pos.z, L2 = Math.hypot(dx, dz) || 1; this.step(dt, dx / L2, dz / L2, sp); const P = a.player, d = Math.hypot(P.pos.x - this.pos.x, P.pos.z - this.pos.z); this.hitCool = (this.hitCool ?? 0) - dt; if (this.swing > 0) { this.swing -= dt; this.face(P.pos, 0.3); if (this.swing <= 0) { this.hitCool = 2; this.h.play('HalberdSweep', { restart: true }); a.ctx.audio.play('kickwhoosh', a.spatialPlay(this.pos)); if (d < 1.7 && !C.hidden) a.cryptHit(); this.anim = 'x'; } return; } if (d < 1.3 && !C.hidden && this.hitCool <= 0) { this.swing = 0.75; this.h.play('RaiseTool', { restart: true }); this.anim = 'RaiseTool'; a.ctx.audio.play('armorping', a.spatialPlay(this.pos, 0.5)); return; } }; e.hitCool = 0; e.pickAnim = function () { if (this.state === 'PATROL') { if (this.swing > 0 || this.hitCool > 1.4) return; const n = 'KnightWalk'; if (this.anim !== n) { this.anim = n; this.h.play(n); } return; } if (this.state === 'BLIND') { if (this.anim !== 'StunHands') { this.anim = 'StunHands'; this.h.play('StunHands'); } return; } }; e.def = { ...e.def, reach: 0, dmg: 0 }; e.s_BLIND = function () { if (this.t <= 0) this.setState('PATROL'); }; return e; });
  a.cryptHit = () => { if (a.cheatGod) return; C.hits++; a.ctx.audio.play('hurtmax', { pitch: 6 }); a.ctx.engine.shake.add(0.5); a.dameBark(['Deducted.']); dP.invuln = 1; if (C.hits >= 2) { a.say('PYM', 'Please hold.', 1.5); a.ctx.audio.play('sting'); C.hits = 0; dP.teleport(C.start[0], C.start[1], 0, 0); C.noiseAt = null; for (const k of C.knights) { k.pos.set(k.wp[0].x, 0, k.wp[0].z); k.wi = 0; k.heard = null; } } };
  a.remoteHurt = () => {}; dP.tickSpeed = true;
  a.setObjective('FIND THE LEVER. THEY HEAR YOU RUN.'); a.scripts.push(...[]);
  a.addScript([{ lines: 'crypt' }]);
  a.app.mix.play(null); const drone = a.ctx.audio.loop({ wave: 'saw', freq: 41, decay: 1, sustain: 1, volume: 0.1 }, { volume: 0.7 }); C.drone = drone;
  a.cryptU = (dt) => {
    if (!a.crypt) return; const P = a.player; C.cool = Math.max(0, C.cool - dt); if (C.noiseAt) { C.noiseAt.t -= dt; if (C.noiseAt.t <= 0) C.noiseAt = null; }
    const sp = Math.hypot(P.vel.x, P.vel.z); if (!C.hidden && sp > 2.6) C.noiseAt = { x: P.pos.x, z: P.pos.z, r: 9, t: 0.3 }; else if (!C.hidden && sp > 0.5 && (!C.noiseAt || C.noiseAt.r <= 4)) C.noiseAt = { x: P.pos.x, z: P.pos.z, r: 4, t: 0.3 };
    P.root.visible = !C.hidden;
    if (C.lever && L.col(P.pos.x) >= 8 && Math.abs(L.row(P.pos.z) - 30.5) < 3) cryptEnd(a);
  };
  a.dameWhack = (P) => { if (C.cool > 0) { a.ctx.audio.play('uideny'); return; } C.cool = 8; P.h.play('DameCane', { restart: true }); a.ctx.audio.play('kickhit', { volume: 0.5 }); for (const k of C.knights) if (Math.hypot(k.pos.x - P.pos.x, k.pos.z - P.pos.z) < 2.2) { k.setState('BLIND', 2); k.h.flash(); } };
  a.cryptHud = (ui) => { if (!a.crypt) return; ui.text(8, ui.H - 22, C.cool > 0 ? `CANE ${Math.ceil(C.cool)}` : 'CANE READY', { color: C.cool > 0 ? 'slate' : 'sand' }); ui.text(8, ui.H - 34, `HITS ${C.hits}/2`, { color: C.hits ? 'red' : 'mist' }); if (C.hidden) ui.center(ui.H - 60, 'HIDDEN', { color: 'mist' }); };
  a.camOverride = null;
}
function cryptEnd(a) {
  const C = a.crypt, L = a.level, dP = a.player, max = a.maxP; a.crypt = null; a.cryptOn = false; C.drone?.stop(); for (const k of C.knights) a.removeEnemy(k); a.minimalHud = false; a.remoteHurt = null; a.noise = null; a.silent = false;
  dP.remove(); dP.body && a.ctx.physics.remove(dP.body.body); a.player = max; a.players = [max]; max.root.visible = true; max.locked = false; max.teleport(L.wx(10), L.wz(26), 0, Math.PI); a.ctx.camera.teleport?.(a.cameraTarget());
  if (a.dame) { a.dame.active = true; a.dame.root.visible = true; a.dame.pos.set(L.wx(9), 0, L.wz(30)); a.dame.prev.copy(a.dame.pos); a.dame.mode = 'follow'; }
  a.say('DAME', 'I have sacked men for less. Do keep up.', 3); a.app.mix.play('combat'); a.spawnEnemy('monk', L.wx(10), L.wz(20)); a.spawnEnemy('monk', L.wx(9), L.wz(16)); a.spawnEnemy('gaffer', L.wx(13), L.wz(24)); a.spawnEnemy('monk', L.wx(11), L.wz(14));
  a.addScript([{ until: (A) => A.enemies.every((e) => e.dead) }, { music: 'explore' }, { run: (A) => { A.cryptDone = true; A.enterStage('aftercrypt'); } }]);
}
// ---- Nave
export function bathysphereBoss(a) { a.boss = new Bathysphere(a, a.bossStart ?? 1); }

const GLYPH = { T: ['###', '.#.', '.#.', '.#.', '.#.'], H: ['#.#', '#.#', '###', '#.#', '#.#'], O: ['###', '#.#', '#.#', '#.#', '###'], L: ['#..', '#..', '#..', '#..', '###'], E: ['###', '#..', '##.', '#..', '###'], '&': ['.#.', '#.#', '.#.', '#.#', '.##'], S: ['###', '#..', '###', '..#', '###'], N: ['###', '#.#', '#.#', '#.#', '#.#'], ' ': ['.', '.', '.', '.', '.'] };
export const SIGN_DEF = (() => { const text = 'THOLE & SONS', rows = ['', '', '', '', '', '', '']; for (let y = 0; y < 5; y++) { let r = ''; for (const ch of text) r += GLYPH[ch][y] + '.'; rows[y + 1] = '.' + r; } rows[0] = '.'.repeat(rows[1].length); rows[6] = rows[0]; const w = 64; const pad = (r) => r.padEnd(w, '.').slice(0, w); return textureDef({ id: 'thole-sign', about: 'THOLE & SONS, painted on a rusted plate', tags: ['sign'], size: [w, 8], palette: { plate: 'navy', ink: 'sand' }, layers: [{ path: 'M0 0 H64 V8 H0 Z', fill: 'plate' }, { pixels: [...rows.map(pad), '.'.repeat(w)], legend: { '#': 'ink' } }] }); })();
function addSign(a) { let has = false; try { has = !!TEXTURE_LIBRARY.get('thole-sign'); } catch { /* not yet */ } if (!has) TEXTURE_LIBRARY.add(SIGN_DEF); const L = a.level, m = new THREE.Mesh(new THREE.PlaneGeometry(11, 1.5), toonMaterial(PALETTE.white, { map: textureMap('thole-sign') })); m.position.set(L.wx(23.5), 5, L.wz(9.9)); a.ctx.scene.add(m); }
