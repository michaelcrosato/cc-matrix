// The Launch's machinery: the sea and everything in it comes at a boat that stays put. Mines, pursuers, falling rock,
// Limpets on the deck, the arch. The level itself (its cuts, its beats) is data in src/data/levels/launch.js.
import { buildModel, setLookLayer, THREE, WAVES_CHOPPY } from '../../pixel-engine.js';
import { MapInfo } from './mapPaint.js';
import { MODELS } from '../models/index.js';
import { Humanoid } from './actor.js';

const M = new MapInfo('deck');
const X = (c) => M.x(c); const Z = (r) => M.z(r);
const SPEED = 14;
const LENGTH = 90;

function deco(area, id, x, z, o = {}) {
  const b = buildModel(id, { catalog: MODELS, params: o.params, seed: o.seed });
  b.object.position.set(x, o.y ?? -1, z);
  if (o.turn) b.object.rotation.y = (o.turn * Math.PI) / 180;
  if (o.scale) b.object.scale.setScalar(o.scale);
  b.object.traverse((m) => { if (m.isMesh) m.castShadow = false; });
  area.ctx.scene.add(b.object);
  area.scroll.push({ obj: b.object, x, z });
  return b.object;
}

export function setupLaunch(area, ctx) {
  const { level, run } = area;
  // The stern deck wants a long gun. If she hasn't bought one, there's one in the launch's locker.
  if (area.entry !== 'ending') {
    if (!run.weapons.rifle && !run.weapons.harpoon) run.addWeapon('rifle');
    if (run.weapons.rifle && run.case.count('ammoRifle') < 10) run.case.addStack('ammoRifle', 20);
    area.player?.equip?.(run.weapons.rifle ? 'rifle' : 'harpoon');
  }
  area.scroll = [];
  area.t = 0;
  area.spawnQueue = [];
  area.kickLimpets = true;
  area.noLimpets = true;
  area.mines = [];
  area.rocks = [];
  area.boatsL = [];
  const hull = level.place('launch-hull', 0, Z(9), { collide: false, y: -1.04, turn: 180 });
  area.hull = hull.obj;
  // The deck you fight on is wider and longer than the model: the hull wraps it, so the boat has real sides.
  hull.obj.scale.set(1.4, 1, 1.35);
  area.dameAtWheel = new Humanoid('dame', { scale: 0.86 });
  area.dameAtWheel.root.position.set(0, 0, Z(5));
  area.dameAtWheel.root.rotation.y = Math.PI;
  area.dameAtWheel.play('DameHoist');
  ctx.scene.add(area.dameAtWheel.root);
  area.npcs.dame = area.dameAtWheel;
  // Stacks either side, repeating.
  for (let i = 0; i < 18; i++) {
    const side = i % 2 ? 1 : -1;
    deco(area, 'sea-stack', side * (18 + (i * 7) % 13), -220 + i * 26, { params: { h: 8 + (i * 5) % 14 }, seed: i + 2 });
  }
  deco(area, 'cliff-silhouette', -70, -160, { params: { w: 120, h: 26 }, seed: 51, turn: 90 });
  deco(area, 'cliff-silhouette', 70, -160, { params: { w: 120, h: 22 }, seed: 53, turn: 90 });
  area.world.addWater({ y: -1.15, size: [320, 320], choppy: true });
  area.world.water?.setWaves?.(WAVES_CHOPPY);
  area.islandFar = buildModel('abbey-far', { catalog: MODELS }).object;
  area.islandFar.position.set(0, -2, 95);
  area.islandFar.rotation.y = Math.PI;
  ctx.scene.add(area.islandFar);
  area.engineLoop = ctx.audio.loop('engine', { volume: 0.6 });
}

function spawnMine(area, x) {
  const b = buildModel('sea-mine', { catalog: MODELS });
  setLookLayer(b.object, 'actors');
  b.object.position.set(x, -0.9, -85);
  area.ctx.scene.add(b.object);
  const pos = new THREE.Vector3(x, 0.1, -85);
  const mine = { obj: b.object, pos, alive: true };
  mine.sh = { active: true, pos, radius: 1.25, solid: true, label: 'mine', onHit: () => blowMine(area, mine) };
  area.shootables.push(mine.sh);
  area.mines.push(mine);
}

function blowMine(area, mine, onBoat = false) {
  if (!mine.alive) return;
  mine.alive = false;
  mine.sh.active = false;
  mine.obj.visible = false;
  const { ctx } = area;
  ctx.audio.play('mine', area.spatial(mine.pos.x, mine.pos.z, 90));
  ctx.particles.burst('splash', [mine.pos.x, 0.4, mine.pos.z], { count: 40, speed: 3 });
  area.fx.explosion(mine.pos.x, 0, mine.pos.z, 3);
  if (onBoat) area.player.hurt(26, { x: mine.pos.x, z: mine.pos.z }, {});
  for (const b of area.boatsL) if (!b.e.dead && Math.hypot(b.e.x - mine.pos.x, b.e.z - mine.pos.z) < 5) b.e.damageRaw(999);
}

function spawnPursuer(area, side) {
  const { ctx } = area;
  const b = buildModel('rowboat', { catalog: MODELS });
  setLookLayer(b.object, 'actors');
  b.object.scale.setScalar(1.3);
  ctx.scene.add(b.object);
  const e = area.spawnEnemy('harpooner', { x: side * 9, z: 40, y: 0.05, state: 'APPROACH', noLoot: true });
  e.cool = 2.5;
  area.boatsL.push({ obj: b.object, e, side, t: 0, wantZ: 17 + Math.abs(side) * 2 });
}

function spawnRock(area) {
  const { ctx } = area;
  const P = area.player;
  const x = P.x + area.fx.rng.range(-1.5, 1.5);
  area.ctx.audio.play('stonecrash', { volume: 0.4 });
  const proj = area.addProjectile('rock', [x + 8, 22, -28], [x, 0.5, P.z], {
    speed: 30,
    onLand: (lx, lz) => {
      ctx.audio.play('stonecrash', area.spatial(lx, lz, 60));
      ctx.particles.burst('splash', [lx, 0.4, lz], { count: 26 });
      ctx.engine.shake.add(0.5);
    },
  });
  proj.sh = { active: true, pos: proj.pos, radius: 1.4, solid: true, label: 'rock', onHit: () => {
    ctx.audio.play('stonecrash', { volume: 0.6 });
    ctx.particles.burst('falling', proj.pos, { count: 24 });
    proj.onLand = null;
    proj.finish();
  } };
  area.shootables.push(proj.sh);
  // Missed: at the last moment a QTE.
  area.addDelayed(proj.flight * 0.7, () => {
    if (!proj.alive || area.qte.active || area.player.state !== 'free') return;
    area.qte.press({ key: 'dodge', label: 'DODGE', onOk: () => { area.player.doAction('dodge', 0.45, { clip: 'Roll', invuln: 0.8 }); }, onFail: () => area.player.hurt(30, { x: proj.pos.x, z: proj.pos.z }, { knock: true }) });
  });
}

function spawnDeckLimpets(area, n) {
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    const e = area.spawnEnemy('limpet', { x: X(4.5) + side * 1.7, z: Z(9 + i * 2), state: 'APPROACH', noLoot: true });
    area.ctx.audio.play('limpetSkitter');
    void e;
  }
}

const TIMELINE = [
  [4, (a) => spawnMine(a, 2.5)], [8, (a) => spawnMine(a, -3)], [11, (a) => spawnPursuer(a, -1)], [14, (a) => spawnMine(a, 1)], [18, (a) => spawnPursuer(a, 1)],
  [21, (a) => spawnDeckLimpets(a, 2)], [25, (a) => spawnRock(a)], [28, (a) => spawnMine(a, -1)], [31, (a) => spawnMine(a, 3)], [34, (a) => spawnPursuer(a, -1)], [38, (a) => spawnDeckLimpets(a, 3)],
  [42, (a) => spawnRock(a)], [45, (a) => spawnMine(a, 0)], [48, (a) => spawnPursuer(a, 1)], [50, (a) => spawnMine(a, -3)], [54, (a) => spawnRock(a)], [57, (a) => spawnDeckLimpets(a, 4)], [60, (a) => spawnMine(a, 2)],
  [62, (a) => spawnPursuer(a, -1)], [64, (a) => spawnPursuer(a, 1)], [67, (a) => spawnMine(a, -2)], [70, (a) => spawnRock(a)], [73, (a) => spawnMine(a, 2)], [76, (a) => spawnMine(a, -1)],
];

export function stepLaunch(area, dt) {
  if (!area.rolling) return;
  const { player: P, ctx } = area;
  area.t += dt;
  const dz = SPEED * dt;
  const sway = Math.sin(area.t * 0.5) * 6;
  // The sea and everything in it comes at you; the boat stays put at the origin, swaying.
  for (const s of area.scroll) {
    s.z += dz;
    if (s.z > 90) s.z -= 240;
    s.obj.position.z = s.z;
    s.obj.position.x = s.x - sway;
  }
  while (TIMELINE[area.ti ?? 0] && TIMELINE[area.ti ?? 0][0] <= area.t) { TIMELINE[area.ti ?? 0][1](area); area.ti = (area.ti ?? 0) + 1; }
  for (const m of area.mines) {
    if (!m.alive) continue;
    m.pos.z += dz;
    m.pos.x += (0 - m.pos.x) * dt * 0.05;
    m.obj.position.set(m.pos.x, -0.9 + Math.sin(area.t * 2 + m.pos.z) * 0.12, m.pos.z);
    if (m.pos.z > Z(0) - 2 && Math.abs(m.pos.x) < 3) blowMine(area, m, true);
    if (m.pos.z > 50) { m.alive = false; m.sh.active = false; m.obj.visible = false; }
  }
  for (const b of area.boatsL) {
    const e = b.e;
    b.t += dt;
    if (e.dead) { b.obj.position.y -= dt * 0.5; b.obj.rotation.z += dt * 0.4; b.obj.position.z += dz; continue; }
    const wantZ = b.wantZ + Math.sin(b.t) * 2;
    e.z += Math.max(-8 * dt, Math.min(8 * dt, wantZ - e.z));
    e.x = b.side * (7.5 + Math.sin(b.t * 0.8) * 1.5);
    b.obj.position.set(e.x, -1.0 + Math.sin(area.t * 2.4 + b.side) * 0.1, e.z);
  }
  if (area.hull) { area.hull.rotation.z = Math.sin(area.t * 1.1) * 0.02; area.hull.position.y = -1.04 + Math.sin(area.t * 1.7) * 0.05; }
  const left = Math.max(0, LENGTH - area.t);
  area.gauge = { label: 'THE ARCH', frac: area.t / LENGTH, color: 'mist' };
  if (left <= 0 && !area.archDone) { area.archDone = true; archEnd(area); }
  if (area.t > 40 && !area.fadeIn) { area.fadeIn = true; }
  ctx.engine.shake.add(0.002);
  // The horizon behind you burns: dawn comes up as you run.
  const f = Math.min(1, area.t / LENGTH);
  ctx.engine.sun.intensity = 0.4 + f * 0.8;
  if (area.world.mist) area.world.mist.amount.value = 0.5 - f * 0.2;
}

function archEnd(area) {
  const { ctx } = area;
  area.rolling = false;
  area.gauge = null;
  for (const e of area.enemies) if (!e.dead) e.dieQuiet();
  const arch = buildModel('sea-arch', { catalog: MODELS }).object;
  arch.position.set(0, -1, -60);
  ctx.scene.add(arch);
  area.setMusic('dawn');
  ctx.tweens.to(arch.position, { z: 6 }, { duration: 4.4, ease: 'linear' });
  area.talk.bark('dame', 'HOLD ON TO SOMETHING. I SHALL NOT BE SLOWING DOWN.', { prio: 3 });
  area.addDelayed(1.6, () => {
    ctx.audio.play('stonecrash'); ctx.engine.shake.add(0.9);
    area.qte.press({
      key: 'dodge', label: 'DIVE', window: 1.1,
      onOk: () => { ctx.audio.play('kickWhoosh'); area.player.doAction('dodge', 0.5, { clip: 'Roll', invuln: 3 }); afterArch(area, arch); },
      onFail: () => { area.player.hurt(20, { x: 0, z: -3 }, { knock: true }); afterArch(area, arch); },
    });
  });
}

function afterArch(area, arch) {
  area.addDelayed(3.2, () => {
    arch.visible = false;
    area.run.setFlag('launchDone');
    area.loadNext('launch', 'ending');
  });
}
