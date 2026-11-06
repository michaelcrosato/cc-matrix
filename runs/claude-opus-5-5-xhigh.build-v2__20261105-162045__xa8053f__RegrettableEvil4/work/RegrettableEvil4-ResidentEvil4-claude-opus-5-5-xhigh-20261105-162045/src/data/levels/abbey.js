// The Abbey of Saint Orrin: monks, knights, the lens puzzle, the trapdoor, the Dame alone in the crypt.
import { PALETTE, THREE, buildModel, glowMaterial, setLookLayer } from '../../../pixel-engine.js';
import { S } from '../dialogue.js';
import { MapInfo } from '../../game/mapPaint.js';
import { CryptSegment } from '../../game/setpieces/crypt.js';

const M = new MapInfo('abbey');
const X = (c) => M.x(c); const Z = (r) => M.z(r);
const DIRS = 8;

// The three lamps and the way each must face (45 degree steps, 0 = north, clockwise).
export const LENS = [
  { c: 14, r: 14, want: 1, start: 4, lensAt: [21, 7] },
  { c: 29, r: 14, want: 7, start: 3, lensAt: [22, 7] },
  { c: 22, r: 25, want: 0, start: 2, lensAt: [21.5, 7] },
];
const dirVec = (d) => { const a = (d * Math.PI) / 4; return [Math.sin(a), -Math.cos(a)]; };

const dress = [
  ['candles', 12, 11, { collide: false }], ['candles', 32, 11, { collide: false }], ['candles', 12, 28, { collide: false }], ['candles', 32, 28, { collide: false }],
  ['brazier', 18, 10], ['brazier', 26, 10], ['brazier', 18, 29], ['brazier', 26, 29], ['brazier', 10, 14], ['brazier', 34, 25],
  ['statue', 9.2, 26, { turn: 90 }], ['statue', 34.8, 13, { turn: -90 }], ['pew', 15, 9.5, { collide: false }], ['pew', 29, 9.5, { collide: false }],
  ['tombstone', 15, 20], ['tombstone', 18, 23], ['tombstone', 26, 16], ['tombstone', 28, 23], ['dead-tree', 17, 16], ['dead-tree', 28, 19], ['tall-grass', 16, 24, { collide: false }], ['tall-grass', 27, 25, { collide: false }], ['tall-grass', 24, 15, { collide: false }],
  ['candles', 21, 33, { collide: false }], ['candles', 23, 33, { collide: false }], ['banner', 22, 31.7, { y: 1.4, collide: false }],
  // Crypt.
  ['sarcophagus', 2, 25, {}], ['sarcophagus', 5, 15, {}], ['cobweb', 1, 12, { collide: false }], ['bones', 5, 12, { collide: false }], ['skull-pile', 2, 19, { collide: false }], ['wall-chains', 6.2, 30, { y: 0.5, collide: false, turn: 90 }], ['candles', 6, 32, { collide: false }],
  // Armoury.
  ['crate-stack', 38, 15], ['halberd', 42, 16, { collide: false }], ['kite-shield', 42, 21, { collide: false }], ['barrel', 38, 25], ['crate', 42, 24], ['hanging-lantern', 40, 20, { y: 2.2, collide: false }], ['brazier', 38, 21],
  // Vestibule.
  ['candles', 23, 4, { collide: false }], ['hanging-lantern', 21.5, 4, { y: 2.4, collide: false }], ['banner', 20.5, 0.8, { y: 1.3, collide: false }], ['banner', 23, 0.8, { y: 1.3, collide: false }],
  ['stained-glass', 15, 7.5, { y: 2, collide: false }], ['stained-glass', 28, 7.5, { y: 2, collide: false }], ['stained-glass', 15, 31.5, { y: 2, collide: false, turn: 180 }], ['stained-glass', 28, 31.5, { y: 2, collide: false, turn: 180 }],
];

function setupAbbey(area, ctx) {
  const { level, run, interact } = area;
  for (const [id, c, r, o = {}] of dress) level.placeAt(id, c, r, o);
  level.placeAt('floor-mosaic', 22, 19, { collide: false });
  area.hidingSpots = [];
  // The mosaic shows three arrows: which way each lamp must face.
  area.statues = LENS.map((L, i) => {
    const saved = run.flags[`lens${i}`];
    const { obj } = level.placeAt('lamp-statue', L.c, L.r, { collide: false, actor: true });
    const turn = obj.getObjectByName('Turn');
    const col = ctx.physics.addStaticCylinder([X(L.c), 1.1, Z(L.r)], 1.1, 0.5);
    ctx.physics.tag(col, 'noCamera');
    // It's solid, so everyone's routes go round it.
    level.nav.setOpen(L.c, L.r, false);
    const st = { ...L, i, turn, dir: saved ?? L.start, busy: false };
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1), glowMaterial(PALETTE.sand));
    beam.position.y = 1.56;
    beam.castShadow = false;
    ctx.scene.add(beam);
    st.beam = beam;
    area.ctx.lights.request({ position: [X(L.c), 2, Z(L.r)], color: 0xffa040, intensity: 5, radius: 7, flicker: 'torch' });
    const it = interact.add({
      kind: 'statue', x: X(L.c), z: Z(L.r), label: 'TURN THE LAMP', prio: 3.5, radius: 2, facing: false,
      enabled: () => !run.flag('lensSolved') && !st.busy,
      use: (p) => turnStatue(area, st, p),
    });
    st.item = it;
    applyStatue(area, st);
    // Its arrow on the mosaic.
    const [dx, dz] = dirVec(L.want);
    const arrow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.8), glowMaterial(PALETTE.orange));
    const ox = X(22) + (i - 1) * 0.9; const oz = Z(19);
    arrow.position.set(ox + dx * 0.25, 0.06, oz + dz * 0.25);
    arrow.rotation.y = Math.atan2(dx, dz);
    ctx.scene.add(arrow);
    return st;
  });
  // Three small lenses over the gate.
  area.lenses = [20.6, 21.5, 22.4].map((c) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.12), glowMaterial(PALETTE.navy));
    m.position.set(X(c), 3.3, Z(7.5));
    ctx.scene.add(m);
    return m;
  });
  const crypt = level.doorAt(7, 30); crypt.locked = !run.flag('cryptDone'); crypt.lockText = 'BARRED FROM THE FAR SIDE';
  const armoury = level.doorAt(36, 19); armoury.locked = false;
  const front = level.doorAt(21, 39); if (front) { front.locked = true; front.lockText = 'IT HAS LOCKED BEHIND YOU'; }
  area.nave = level.doorAt(21, 0); if (area.nave) area.nave.locked = !run.flag('cryptDone');
  if (area.nave) area.nave.lockText = 'THE NAVE IS BARRED';
  if (run.flag('lensSolved')) { for (const s of area.statues) setBeam(area, s); }
  // Trapdoor.
  const trap = level.placeAt('trapdoor', 10, 20, { collide: false, scale: 2 });
  area.trap = trap.obj;
  area.hideCryptMonks = true;
  ctx.lights.request({ position: [X(3.5), 2.2, Z(12)], color: 0x5060c0, intensity: 2.6, radius: 7 });
  ctx.lights.request({ position: [X(3.5), 2.2, Z(24)], color: 0x5060c0, intensity: 2.6, radius: 7 });
  ctx.lights.request({ position: [X(3.5), 2.2, Z(32)], color: 0xff7040, intensity: 2.6, radius: 7, flicker: 'torch' });
}

function applyStatue(area, st) {
  st.turn.rotation.y = -(st.dir * Math.PI) / 4 + Math.PI;
  setBeam(area, st);
}

function setBeam(area, st) {
  const [dx, dz] = dirVec(st.dir);
  const len = Math.max(2, area.level.nav.castWall(X(st.c) + dx, Z(st.r) + dz, dx, dz, 22) + 1);
  const b = st.beam;
  b.position.x = X(st.c) + dx * (0.9 + len / 2);
  b.position.z = Z(st.r) + dz * (0.9 + len / 2);
  b.scale.z = len;
  b.rotation.y = Math.atan2(dx, dz);
}

function turnStatue(area, st, p) {
  const { ctx, run } = area;
  st.busy = true;
  ctx.audio.play('stoneGrind');
  p.doAction('push', 1.2, { clip: 'Push', onEnd: () => {} });
  const from = st.turn.rotation.y;
  const to = from - Math.PI / 4;
  ctx.tweens.value(from, to, { duration: 1.2, ease: 'inOutSine' }, (v) => { st.turn.rotation.y = v; });
  area.addDelayed(1.2, () => {
    st.busy = false;
    st.dir = (st.dir + 1) % DIRS;
    run.flags[`lens${st.i}`] = st.dir;
    setBeam(area, st);
    ctx.audio.play('gateShut', { volume: 0.4 });
    const lit = area.statues.filter((s) => s.dir === s.want).length;
    area.lenses.forEach((m, i) => { m.material = glowMaterial(i < lit ? PALETTE.sand : PALETTE.navy); });
    if (lit === 3 && !run.flag('lensSolved')) {
      run.setFlag('lensSolved');
      ctx.audio.play('treasure');
    }
  });
}

const trapCut = (area) => {
  const D = area.dame;
  return [
    { cue: () => { const P = area.player; if (D) { D.mode = 'script'; D.x = X(10); D.z = Z(20); D.y = 0; D.actor.play('Idle'); } P.teleport(X(10), 0, Z(23), Math.PI); } },
    { cam: [[X(12.5), 1.4, Z(22.5)], [X(10), 0.8, Z(20)], 36] },
    { say: ['dame', 'I do not care for this floor.'], hold: 0.3 },
    { cue: () => {
      area.ctx.audio.play('stonecrash'); area.ctx.engine.shake.add(0.8);
      if (area.trap) area.trap.visible = false;
      area.ctx.particles.burst('smokeBig', [X(10), 0.3, Z(20)]);
      if (D) area.ctx.tweens.to(D, { y: -4 }, { duration: 0.6, ease: 'inSine' });
    } },
    { wait: 1 },
    { cam: [[X(10), 2.6, Z(23)], [X(10), -1, Z(20)], 34] },
    { say: ['max', 'Dame Ottoline.'], hold: 0.3 },
    { say: ['max', "That's a Section 12."], hold: 0.8 },
    { cue: () => { if (D) { D.actor.root.visible = false; D.withYou = false; D.mode = 'hide'; D.y = 0; } } },
    { cam: [[X(3), 1.3, Z(14)], [X(3), 0.5, Z(12)], 40] },
    { say: S.crypt[0] },
    { say: S.crypt[1] },
    { say: S.crypt[2], hold: 0.9 },
  ];
};

export const abbey = {
  id: 'abbey',
  title: 'THE ABBEY OF SAINT ORRIN',
  chapter: 3,
  map: 'abbey',
  mood: 'abbey',
  music: 'explore',
  autoCombat: true,
  startYaw: 180,
  water: false,
  safeZones: [[20, 1, 23, 6]],
  ambience: [['windLoop', 0.5]],
  theme: {
    floors: { _: 'flagstones', ',': 'peat' },
    walls: { '#': { tex: 'abbey-stone', h: 7 } },
    cover: { tex: 'abbey-stone', h: 1.05, cap: PALETTE.slate },
  },
  build: {},
  chests: [[41, 25, 'reliquary'], [2, 11, 'blackPearl']],
  items: [[23, 36, 'ammoPistol', 12], [10, 12, 'samphire', 1], [34, 28, 'ammoShells', 5], [39, 15, 'ammoRifle', 4], [34, 12, 'ammoPistol', 12], [41, 16, 'ammoBolts', 2], [23, 2, 'tin', 1], [11, 29, 'flare', 1]],
  notes: [[21, 34, 'hymn']],
  backdrop: [['cliff-silhouette', 0, 0, -36, { params: { w: 90, h: 16 }, seed: 41 }], ['cliff-silhouette', 0, 0, 36, { params: { w: 90, h: 16 }, seed: 43 }]],
  fathomYaw: -90,
  setup: setupAbbey,
  input(area, it) {
    // In a niche, Action climbs back out.
    if (area.crypt?.hidden && it.action) { it.action = false; area.crypt.leaveNiche(); }
  },
  fixed(area, dt) {
    if (area.crypt) area.crypt.step(dt, area.intent);
  },
  frame(area, dt) {
    if (!area.run.flag('lensSolved')) {
      const t = area.ctx.time;
      for (const s of area.statues ?? []) if (s.dir === s.want) s.beam.scale.x = s.beam.scale.y = 1 + Math.sin(t * 8) * 0.2;
    }
  },
  cuts: { trap: trapCut },
  beats: [
    { id: 'cloister', steps: [
      { objective: 'THE CLOISTER. GET INSIDE' },
      { until: (a) => a.player.z < Z(32) },
      { spawn: { type: 'monk', n: 4, at: [[14, 11], [29, 11], [10, 25], [33, 25]], state: 'WORK' } },
      { spawn: { type: 'knight', n: 1, at: [22, 22], state: 'APPROACH' } },
      { hint: 'A SHIELD BLOCKS THE FRONT. SHOOT THE ARM, OR KICK', action: 'aim', time: 8 },
      { wait: 14 },
      { spawn: { type: 'monk', n: 2, door: '1', every: 1 } },
      { spawn: { type: 'knight', n: 1, door: '2' } },
      { hint: 'A KNIGHT: SHOOT THE HELMET OFF, THEN THE HEAD', action: 'aim', time: 8 },
      { until: (a) => a.enemies.every((e) => e.dead) },
      { checkpoint: true },
      { objective: 'THE GATE, NORTH. THREE LAMPS. THE MOSAIC SHOWS THEIR WAYS' },
    ] },
    { id: 'lens', trigger: { on: 'when', fn: (a) => a.run.flag('lensSolved') }, steps: [
      { run: (a) => {
        a.ctx.audio.play('gateOpen');
        a.ctx.engine.shake.add(0.5);
        const g = a.level.bySpot.get('G20,7');
        a.ctx.tweens.to(g.obj.position, { y: 1 }, { duration: 1.4 });
        a.talk.bark('commodore', 'THAT GATE IS A LISTED BUILDING, MISS RANSOM.', { prio: 3 });
        a.showHint(null);
      } },
      { wait: 1.6 },
      { run: (a) => { a.ctx.audio.play('metalClang'); a.hud.flashText('THE CHAIN HAS JAMMED', 2.4); } },
      { objective: 'THE GATE CHAIN JAMS. FOLLOW IT WEST, ALONG THE ARCADE' },
      { checkpoint: true },
    ] },
    { id: 'crypt', trigger: { on: 'when', fn: (a) => a.run.flag('lensSolved') && a.savedBeats().lens && a.level.info.col(a.player.x) <= 12 && Math.abs(a.player.z - Z(20)) < 6 }, steps: [
      { run: (a) => { for (const e of a.enemies) if (!e.dead) e.dieQuiet(); a.setMusic(null); } },
      { cut: 'trap' },
      { run: (a) => {
        a.setMusic(null);
        a.world.setMood('crypt');
        a.ctx.audio.play('windLoop', { volume: 0.3 });
        a.crypt = new CryptSegment(a, { X, Z, onDone: () => { a.run.setFlag('cryptDone'); } });
      } },
      { until: (a) => a.run.flag('cryptDone') },
      { run: (a) => {
        a.world.setMood('abbey');
        a.setMusic('combat');
        a.player.teleport(X(11), 0, Z(25), 0);
      } },
      // Nobody plays the crypt twice for a bad minute with three monks.
      { checkpoint: true },
      { run: (a) => {
        if (a.dame) { a.dame.actor.root.visible = false; a.dame.withYou = false; a.dame.mode = 'hide'; }
        a.setMusic('combat');
        a.setObjective('THE INSURED IS COMING THROUGH THE DOOR. KEEP IT CLEAR');
      } },
      { spawn: { type: 'monk', n: 3, at: [[9, 18], [16, 30], [9, 31]], state: 'APPROACH' } },
      { until: (a) => a.enemies.every((e) => e.dead) },
      { run: (a) => {
        const D = a.dame;
        if (D) { D.x = X(8.5); D.z = Z(30.5); D.y = 0; D.withYou = true; D.mode = 'follow'; D.actor.root.visible = true; D.actor.play('Idle'); }
        a.talk.lines([['dame', 'You took your time. I have had a lovely evening. Mind the coat.']]);
        a.openGateAt(20, 7);
        if (a.nave) a.nave.locked = false;
        a.setMusic('explore');
      } },
      { checkpoint: true },
      { objective: 'THE GATE IS OPEN. THE ARMOURY, EAST, THEN THE NAVE' },
    ] },
    { id: 'leave', trigger: { on: 'when', fn: (a) => a.run.flag('cryptDone') && a.nave?.open }, steps: [
      { wait: 0.6 },
      { run: (a) => a.loadNext('nave', null) },
    ] },
  ],
};
