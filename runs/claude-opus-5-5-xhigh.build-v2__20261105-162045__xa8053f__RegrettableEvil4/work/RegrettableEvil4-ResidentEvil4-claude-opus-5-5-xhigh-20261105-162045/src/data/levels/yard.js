// The Cannery Yard: the Bosun and the crane, in the rain.
import { PALETTE, THREE, buildModel, setLookLayer, glowMaterial } from '../../../pixel-engine.js';
import { S } from '../dialogue.js';
import { MapInfo } from '../../game/mapPaint.js';
import { Bosun } from '../../game/bosses/bosun.js';
import { MODELS } from '../../models/index.js';

const M = new MapInfo('yard');
const X = (c) => M.x(c); const Z = (r) => M.z(r);
const ZONES = [{ c: 14, r: 18 }, { c: 23, r: 18 }];
const RELOAD = 15;

const dress = [
  ['lamp-post', X(4), Z(6), { light: { intensity: 16, radius: 14 } }], ['lamp-post', X(31), Z(6), { light: { intensity: 16, radius: 14 } }], ['lamp-post', X(4), Z(30), { light: { intensity: 16, radius: 14 } }], ['lamp-post', X(31), Z(29), { light: { intensity: 16, radius: 14 } }],
  ['can-stack', X(12), Z(4)], ['can-stack', X(23), Z(4)], ['fish-crate', X(12), Z(31)], ['bollard', X(3), Z(25)], ['bollard', X(32), Z(14)], ['anchor-prop', X(30), Z(20), { collide: false }], ['chain-links', X(30), Z(21)],
  ['steam-pipe', X(10), Z(2.6), { collide: false }], ['steam-pipe', X(26), Z(2.6), { collide: false }], ['thole-sign', X(17.5), Z(2.2), { y: 3.2, collide: false }],
];

function setupYard(area, ctx) {
  const { level, run } = area;
  for (const [id, x, z, o] of dress) if (o !== null) level.place(id, x, z, o);
  // Painted drop zones, yellow.
  for (const zn of ZONES) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3, 3).rotateX(-Math.PI / 2), glowMaterial(PALETTE.sand));
    m.position.set(X(zn.c), 0.02, Z(zn.r));
    m.scale.set(1, 1, 1);
    ctx.scene.add(m);
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.5).rotateX(-Math.PI / 2), glowMaterial(PALETTE.night));
    inner.position.set(X(zn.c), 0.03, Z(zn.r));
    ctx.scene.add(inner);
  }
  // The rail, the gantry, the pallet, the cab.
  for (let c = 4; c <= 31; c += 3) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.1, 0.6), glowMaterial(PALETTE.night));
    beam.position.set(X(c), 0.04, Z(18));
    ctx.scene.add(beam);
  }
  level.placeAt('gantry-crane', 3, 18, { collide: false });
  const palletB = buildModel('crane-pallet', { catalog: MODELS });
  setLookLayer(palletB.object, 'actors');
  palletB.object.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  ctx.scene.add(palletB.object);
  palletB.object.position.set(X(10), 5.5, Z(18));
  area.crane = { x: X(10), dir: 1, obj: palletB.object, y: 5.5, reload: 0, dropping: false, dropT: 0, overZone: null, lamp: null };
  area.crane.lamp = ctx.lights.request({ position: [X(10), 5.2, Z(18)], color: 0xff4040, intensity: 0, radius: 10, priority: 3 });
  // Stacks throwable: cover breaks when he hurls it.
  area.onCoverThrown = (T) => {
    let best = null; let bd = 7;
    for (const cv of level.coverObjs ?? []) {
      if (cv.broken || !cv.breakable) continue;
      const d = Math.hypot(cv.x - T.x, cv.z - T.z);
      if (d < bd) { bd = d; best = cv; }
    }
    if (best) { area.addDelayed(1.05, () => level.breakCover(best)); area.hud.flashText('HE SAW THAT', 1.2); }
  };
  area.hidingSpots = [];
  // Crates along the walls: the arena feeds you if you go and get it.
  [[4, 12], [31, 12], [4, 24], [31, 24], [12, 4], [23, 31], [12, 31], [23, 4]].forEach(([c, r], i) => {
    const cr = level.addBreakable(c, r, X(c), Z(r), 'crate', 100 + i);
    void cr;
  });
  const door = level.doorAt(17, 34);
  if (door) { door.locked = true; door.lockText = 'IT HAS LOCKED BEHIND YOU'; }
  if (run.flag('bosunDead')) { area.bosunDead = true; level.bySpot.get('G17,0') && area.openGateAt(17, 0); }
}

function stepCrane(area, dt) {
  const C = area.crane;
  const B = area.bosun;
  if (!C || !B || B.dead || !area.bossLive) return;
  if (C.dropping) {
    C.dropT += dt;
    C.y = Math.max(1.0, 5.5 - C.dropT * C.dropT * 40);
    C.obj.position.y = C.y;
    if (C.y <= 1.0 && !C.landed) {
      C.landed = true;
      area.ctx.audio.play('craneDrop');
      area.ctx.engine.shake.add(0.9);
      area.ctx.particles.burst('dust', [C.x, 0.2, Z(18)], { count: 30, speed: 1.8 });
      if (Math.hypot(B.x - C.x, B.z - Z(18)) < 2.8) { B.dropHit(); }
      for (const p of area.players) if (Math.hypot(p.x - C.x, p.z - Z(18)) < 1.8) p.hurt(40, { x: C.x, z: Z(18) }, { knock: true });
    }
    if (C.dropT > 1.6) { C.dropping = false; C.landed = false; C.reload = RELOAD; C.y = 5.5; area.ctx.audio.play('crane'); area.ctx.tweens.to(C, { y: 5.5 }, { duration: 1 }); C.obj.position.y = 5.5; }
    return;
  }
  if (C.reload > 0) {
    C.reload -= dt;
    area.gauge = area.bosun.state === 'KNEEL' ? area.gauge : { label: 'CRANE RELOADING', frac: 1 - C.reload / RELOAD, color: 'mist' };
    if (C.reload <= 0) { area.gauge = null; area.hud.flashText('CRANE READY', 1.2); }
  }
  // It travels along the rail on its own, and pauses over each painted zone.
  if (C.dwell > 0) C.dwell -= dt;
  else {
    const before = C.x;
    C.x += C.dir * 2.6 * dt;
    for (const z of ZONES) {
      const zx = X(z.c);
      if (before !== zx && (before - zx) * (C.x - zx) <= 0) { C.x = zx; C.dwell = 2.8; }
    }
    if (C.x > X(29)) C.dir = -1;
    if (C.x < X(8)) C.dir = 1;
  }
  C.obj.position.x = C.x;
  C.tick = (C.tick ?? 0) - dt;
  if (C.tick <= 0) { C.tick = 1.1; area.ctx.audio.play('crane', { ...area.spatial(C.x, Z(18), 30) }); }
  C.overZone = ZONES.find((z) => Math.abs(X(z.c) - C.x) < 1.6) ?? null;
  C.lamp.position.set(C.x, 5.2, Z(18));
  C.lamp.intensity = C.overZone && C.reload <= 0 ? 16 : 0;
}

function dropPallet(area) {
  const C = area.crane;
  if (!C || C.dropping || C.reload > 0) { area.ctx.audio.play('uiDeny'); return; }
  C.dropping = true; C.dropT = 0; C.landed = false;
  area.ctx.audio.play('chain');
  area.talk.bark('dame', 'RELEASING. STAND ASIDE, OR DO NOT.', { prio: 2 });
}

const entranceCut = (area) => {
  const B = area.bosun;
  return [
    { cam: [[X(17.5), 2.4, Z(9)], [X(17.5), 3.5, Z(3)], 44], to: [[X(17.5), 2.6, Z(10)], [X(17.5), 4.4, Z(4)]] },
    { cue: () => { area.openGateAt(17, 0); } },
    { wait: 0.8 },
    { cue: () => { B.actor.play('BosunDrag'); area.ctx.tweens.to(B, { z: Z(7) }, { duration: 2.4 }); area.ctx.audio.play('anchorDrag'); } },
    { wait: 2.4 },
    // Shut behind him. It's the way out of the yard, and the only one: it stays shut until he's dead.
    { cue: () => { area.closeGateAt(17, 0); } },
    { cue: () => { B.actor.play('BosunRoar', { once: true }); area.ctx.audio.play('bellow'); area.ctx.engine.shake.add(0.6); } },
    { wait: 1.6 },
    { cam: [[area.player.x + 1.5, 1.7, area.player.z + 1.8], [area.player.x, 1.5, area.player.z], 30] },
    { say: ['dame', 'That is my bosun. That was my bosun. I shall want a word with the crane.'] },
    { say: ['max', 'Is he insured?'] },
    { say: ['dame', 'Heavily.'], hold: 1 },
  ];
};

const afterCut = (area) => {
  const P = area.player;
  return [
    { cue: () => { const D = area.dame; if (D) { D.x = X(5); D.z = Z(20); D.mode = 'wait'; } P.teleport(X(6.5), 0, Z(21.5), -Math.PI / 2 * 3); } },
    { cam: [[X(7.5), 1.3, Z(22.5)], [X(5), 1.0, Z(20)], 32], to: [[X(7.2), 1.25, Z(22.2)], [X(5), 1.0, Z(20)]] },
    { say: S.afterBosun[0], hold: 1.5 },
    { cam: [[X(4.5), 1.3, Z(19)], [X(6.5), 1.3, Z(21.5)], 30] },
    { say: S.afterBosun[1] },
    { cam: [[X(7.5), 1.3, Z(22.5)], [X(5), 1.0, Z(20)], 28] },
    { say: S.afterBosun[2], hold: 1.5 },
    { cue: () => { const D = area.dame; if (D) D.mode = 'follow'; } },
  ];
};

export const yard = {
  id: 'yard',
  title: 'THE CANNERY YARD',
  chapter: 2,
  map: 'yard',
  mood: 'rain',
  music: 'explore',
  startYaw: 180,
  water: false,
  ambience: [['rainLoop', 0.7]],
  theme: {
    floors: { '.': 'cobbles', r: 'metal-plates' },
    walls: { '#': { tex: 'bricks', h: 8 } },
    cover: { tex: 'rough-boards', h: 1 },
  },
  build: {
    brine: [[12, 12], [23, 12], [12, 23], [23, 23]],
    coverProps: [[7, 8, 9, 10, 'crate-stack', { breakable: true }], [26, 8, 28, 10, 'crate-stack', { breakable: true, turn: 180 }], [7, 25, 9, 27, 'crate-stack', { breakable: true }], [26, 25, 28, 27, 'crate-stack', { breakable: true, turn: 180 }], [16, 12, 19, 13, 'crate-stack', { breakable: true }], [16, 22, 19, 23, 'crate-stack', { breakable: true, turn: 180 }]],
  },
  chests: [[4, 4, 'amber']],
  items: [[31, 25, 'ammoPistol', 12], [4, 30, 'ammoShells', 5], [30, 8, 'samphire', 1], [12, 2.2, 'ammoRifle', 4]],
  notes: [[5, 30, 'application']],
  backdrop: [
    ['cliff-silhouette', 0, 0, -38, { params: { w: 90, h: 24 }, seed: 21 }], ['cliff-silhouette', 40, 0, 0, { params: { w: 90, h: 20 }, seed: 23, turn: 90 }], ['cliff-silhouette', -40, 0, 0, { params: { w: 90, h: 20 }, seed: 24, turn: 90 }],
  ],
  setup: setupYard,
  dameContextLabel(area) { return area.bossLive && area.crane?.reload <= 0 ? 'RELEASE CRANE' : area.bossLive ? 'CRANE LOADING' : null; },
  dameContext(area) { return area.bossLive ? () => dropPallet(area) : null; },
  fixed(area, dt) { stepCrane(area, dt); },
  onBrineBlast(area, c) {
    const B = area.bosun;
    if (B && !B.dead && Math.hypot(B.x - c.x, B.z - c.z) < 3.4) B.stagger(4);
  },
  /** The bot's way of winning: stand so a zone lies between him and you, drop on him, shoot the sacs. */
  botReflex(bot, it, dt) {
    const a = bot.area;
    if (!a.bossLive || a.bosunDead || a.cut) return false;
    const B = a.bosun; const C = a.crane; const P = a.player;
    const zones = ZONES.map((z) => [X(z.c), Z(z.r)]);
    const d = Math.hypot(B.x - P.x, B.z - P.z);
    if (P.hp < P.maxHp * 0.45 && bot.hasHerb(P)) it.heal = true;
    if (P.mag <= 0 && P.reloadT <= 0) it.reload = true;
    // Whatever else is going on: he's under the pallet, let it go.
    for (const z of zones) {
      if (C.reload <= 0 && !C.dropping && Math.abs(C.x - z[0]) < 1.5 && Math.hypot(B.x - C.x, B.z - z[1]) < 2.6) { it.command = true; }
    }
    // An anchor on the way: don't stand still.
    if (B.state === 'THROW' && !B.haul) {
      const nav = a.level.nav;
      const anchor = a.projectiles.find((q) => q.alive && q.kind === 'anchor');
      if (anchor) {
        // It's in the air and its ring is on the ground: out of the ring, directly, and nothing else matters till it lands.
        const ox = P.x - anchor.targetPos.x; const oz = P.z - anchor.targetPos.z; const od = Math.hypot(ox, oz) || 1;
        if (od < 3.4) {
          const off = Math.atan2(ox, oz);
          for (const turn of [0, 0.7, -0.7, 1.4, -1.4]) {
            const dx = Math.sin(off + turn); const dz = Math.cos(off + turn);
            if (nav.walkable(P.x + dx * 1.5, P.z + dz * 1.5)) { bot.moveDir(it, dx, dz, true); return true; }
          }
        }
      } else {
        // Still winding up: keep moving one way across his aim, and don't change your mind.
        if (B.stateT < 0.1) bot.throwSide = null;
        const sx = -(B.z - P.z) / Math.max(d, 0.1); const sz = (B.x - P.x) / Math.max(d, 0.1);
        bot.throwSide = bot.throwSide ?? (nav.walkable(P.x + sx * 2, P.z + sz * 2) ? 1 : -1);
        if (!nav.walkable(P.x + sx * bot.throwSide * 1.2, P.z + sz * bot.throwSide * 1.2)) bot.throwSide = -bot.throwSide;
        bot.moveDir(it, sx * bot.throwSide, sz * bot.throwSide, true);
        return true;
      }
    }
    // His crew are a separate fight, with the whole of the bot's crowd craft: kicks, the scattergun, and not standing in it.
    // Nothing is worth doing inside his reach, though.
    const crew = bot.threats(P).filter((t) => t.e !== B);
    // With the pallet ready, leading him under it is what ends the fight, so only a crewman on top of her comes first.
    if (crew.length && crew[0].d < (C.reload <= 0 ? 3 : 7) && B.state !== 'KNEEL' && d >= 4.2 && bot.combat(it, dt, P, crew)) return true;
    if (B.state === 'KNEEL') {
      // Get round the back if it's quick, then empty the magazine into the sacs.
      const bx = B.x - Math.sin(B.yaw) * 5; const bz = B.z - Math.cos(B.yaw) * 5;
      if (Math.hypot(bx - P.x, bz - P.z) > 2.5 && B.kneeT > 5) { bot.steerTo(it, bx, bz, true, dt); return true; }
      if (P.reloadT <= 0 && P.mag > 0) {
        it.aim = true;
        bot.aimAt(it, B, 'torso', dt);
        if (bot.onTarget(P)) { it.fire = true; it.firePressed = true; }
      }
      return true;
    }
    // The zone the pallet is coming to, and the spot beyond it that walks him across.
    const coming = zones.filter((z) => (z[0] - C.x) * C.dir >= -0.1);
    const zone = (coming.length ? coming : zones).reduce((p, q) => (Math.abs(p[0] - C.x) < Math.abs(q[0] - C.x) ? p : q));
    const away = Math.hypot(zone[0] - B.x, zone[1] - B.z) || 1;
    let wx = zone[0] + ((zone[0] - B.x) / away) * 6; let wz = zone[1] + ((zone[1] - B.z) / away) * 6;
    if (!a.level.nav.walkable(wx, wz)) { wx = zone[0]; wz = zone[1] + (B.z < zone[1] ? 6 : -6); }
    if (d < 4.2) {
      // On her heels: if the far side of the zone is away from him, run there. He follows her under the pallet.
      const toLure = Math.hypot(wx - P.x, wz - P.z) || 0.1;
      const towardHim = ((B.x - P.x) * (wx - P.x) + (B.z - P.z) * (wz - P.z)) / (Math.max(d, 0.1) * toLure);
      if (C.reload <= 0 && toLure > 1.5 && towardHim < 0.3) { bot.steerTo(it, wx, wz, true, dt); return true; }
      bot.pickFlee(P, [{ e: B, d }]);
      bot.moveDir(it, bot.fleeDir[0], bot.fleeDir[1], true);
      return true;
    }
    // Out of ammo: go and break crates, pick things up.
    if (P.mag <= 0 && P.store.case.count(P.weapon.ammo) <= 0 && !bot.switchWeapon(it, P)) {
      const crate = a.level.crates.find((c) => !c.broken && c.kind === 'crate');
      const cur = a.interact.current;
      if (bot.grabThings(it, dt, P)) return true;
      if (crate) {
        if (Math.hypot(crate.x - P.x, crate.z - P.z) < 1.6) it.knife = true;
        else bot.steerTo(it, crate.x, crate.z, true, dt);
        return true;
      }
    }
    // Lure him across it.
    if (Math.hypot(wx - P.x, wz - P.z) > 1.5) bot.steerTo(it, wx, wz, true, dt);
    else if (P.reloadT <= 0 && P.mag > 0 && d < 16 && C.reload > 6) {
      it.aim = true;
      bot.aimAt(it, B, 'torso', dt);
      if (bot.onTarget(P)) { it.fire = true; it.firePressed = true; }
    }
    return true;
  },
  cuts: { entrance: entranceCut, after: afterCut },
  beats: [
    { id: 'yardStart', steps: [
      { run: (a) => {
        if (a.dame) { a.dame.mode = 'follow'; }
        a.bosun = new Bosun(a, { x: X(17.5), z: Z(0.6), yaw: 0 });
        a.enemies.push(a.bosun);
        a.bosun.actor.root.visible = true;
      } },
      { objective: 'CROSS THE YARD' },
      { until: (a) => a.player.z < Z(30) },
      { cut: 'entrance' },
      { music: 'boss' },
      { run: (a) => {
        const D = a.dame;
        a.bossLive = true;
        a.bosun.state = 'WALK'; a.bosun.stateT = 0;
        a.bossBar = { name: 'THE BOSUN', frac: 1 };
        D.goTo(X(3), Z(19), () => { D.mode = 'machine'; D.actor.play('Sit'); D.yaw = Math.PI / 2; });
        a.setObjective('THE DAME IS IN THE CRANE. DROP THE PALLET ON HIM');
      } },
      { hint: 'RELEASE THE CRANE WHEN HE IS UNDER THE PALLET', action: 'command', time: 10 },
      { until: (a) => a.bosunDead },
      { wait: 2.6 },
      { music: null },
      { cut: 'after' },
      { run: (a) => { a.run.setFlag('bosunDead'); a.gauge = null; a.setMusic('explore'); a.openGateAt(17, 0); } },
      { objective: 'MR. FATHOM, IN THE CORNER. THEN THE NORTH GATE' },
      { checkpoint: true },
    ] },
    { id: 'leave', trigger: { on: 'when', fn: (a) => a.run.flag('bosunDead') && a.player.z < Z(1.8) }, steps: [
      { run: (a) => { a.run.chapter = 3; a.finishChapter('causeway', null); } },
    ] },
  ],
};
