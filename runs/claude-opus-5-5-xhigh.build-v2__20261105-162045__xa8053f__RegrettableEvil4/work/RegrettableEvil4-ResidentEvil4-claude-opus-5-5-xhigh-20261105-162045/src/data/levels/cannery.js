// The Thole Cannery: belts, the Flenser, the Cold Room, the Dame, the winch, Mate Ansgar.
import { PALETTE, THREE } from '../../../pixel-engine.js';
import { S } from '../dialogue.js';
import { MapInfo } from '../../game/mapPaint.js';
import { Dame } from '../../game/companion.js';
import { startBeltFight } from '../../game/setpieces/belt.js';
import { Humanoid } from '../../game/actor.js';

const M = new MapInfo('cannery');
const X = (c) => M.x(c); const Z = (r) => M.z(r);
const WINCH_SECONDS = 90;

const dress = [
  // Lobby and bay.
  ['crate-stack', X(19), Z(28)], ['crate-stack', X(28), Z(28), { turn: 180 }], ['barrel', X(29), Z(33)], ['barrel', X(19), Z(31)], ['can-stack', X(28), Z(31)], ['can-stack', X(26.5), Z(29)], ['wall-lantern', X(23), Z(27.5), { y: 2.2, collide: false }],
  ['hanging-lantern', X(24), Z(31), { y: 2.6, collide: false }],
  // Telegraph office.
  ['desk', X(34), Z(32)], ['chair', X(35), Z(31)], ['bookshelf', X(38), Z(32)], ['hanging-lantern', X(35), Z(30), { y: 2.6, collide: false }], ['candles', X(34), Z(32), { y: 0.75, collide: false }],
  // The Hall.
  ['gutting-table', X(12.5), Z(19.5), { collide: false }], ['gutting-table', X(23.5), Z(19.5), { collide: false }], ['gutting-table', X(34.5), Z(19.5), { collide: false }],
  ['gutting-table', X(14), Z(16), { collide: false }], ['gutting-table', X(24), Z(16), { collide: false }], ['gutting-table', X(34), Z(16), { collide: false }],
  ['can-press', X(38.5), Z(13.5), { collide: false }], ['can-press', X(8.5), Z(21.5), { collide: false }],
  ['steam-pipe', X(14), Z(10.5), { collide: false }], ['steam-pipe', X(30), Z(10.5), { collide: false }], ['steam-pipe', X(20), Z(25), { collide: false }], ['steam-pipe', X(36), Z(25), { collide: false }],
  ['can-stack', X(7), Z(11)], ['can-stack', X(40), Z(23)], ['fish-crate', X(30), Z(11)], ['fish-crate', X(17), Z(24)], ['barrel', X(39.5), Z(11.5)], ['bucket', X(7), Z(24)], ['hanging-lantern', X(12), Z(12), { y: 3.2, collide: false }], ['hanging-lantern', X(24), Z(12), { y: 3.2, collide: false }], ['hanging-lantern', X(36), Z(12), { y: 3.2, collide: false }], ['hanging-lantern', X(12), Z(23), { y: 3.2, collide: false }], ['hanging-lantern', X(24), Z(23), { y: 3.2, collide: false }], ['hanging-lantern', X(36), Z(23), { y: 3.2, collide: false }],
  // Saw room.
  ['wall-chains', X(1.6), Z(13), { y: 0.6, turn: 90, collide: false }], ['bones', X(3), Z(14), { collide: false }], ['bucket', X(1.5), Z(18)],
  // Cold Room: ice, herring, fog.
  ['ice-block', X(35.5), Z(3.5)], ['ice-block', X(37), Z(3)], ['ice-block', X(43.5), Z(7)], ['ice-block', X(35.5), Z(7)], ['fish-crate', X(41), Z(4.8), { collide: false }], ['fish-crate', X(42), Z(4.5)], ['carcass', X(39), Z(3), { y: 2.8 }], ['carcass', X(37.5), Z(6), { y: 2.9 }], ['carcass', X(43), Z(6), { y: 2.7 }],
  // Winch Room and corridor.
  ['chain-links', X(12), Z(4)], ['crate', X(13), Z(7)], ['barrel', X(5), Z(7)], ['hanging-lantern', X(9), Z(5), { y: 2.6, collide: false }], ['hanging-lantern', X(24), Z(5), { y: 2.6, collide: false }], ['crate', X(26), Z(8)], ['barrel', X(22.5), Z(8)],
  ['wall-chains', X(12.5), Z(9.4), { y: 1.2, collide: false }],
];

function setupCannery(area, ctx) {
  const { level, run } = area;
  for (const [id, x, z, o = {}] of dress) level.place(id, x, z, o);
  // Carcasses on a moving overhead rail.
  area.carcasses = [];
  for (let i = 0; i < 9; i++) {
    const b = level.place('carcass', X(10 + i * 3.2), Z(17.5), { y: 3.0, collide: false, actor: true });
    area.carcasses.push({ obj: b.obj, phase: i * 1.3, sh: null });
  }
  level.placeAt('thole-sign', 24, 26, { y: 3.0, collide: false });
  // Doors: the way in locks behind you; the Cold Room needs the Flenser's key.
  const entrance = level.doorAt(24, 35);
  entrance.locked = true; entrance.lockText = 'IT HAS LOCKED BEHIND YOU'; entrance.lockLabel = 'LOCKED';
  const cold = level.doorAt(37, 9);
  cold.locked = !run.hasKey('coldKey');
  cold.lockText = 'A BIG COLD PADLOCK'; cold.lockLabel = 'LOCKED';
  const saw = level.doorAt(5, 16);
  saw.locked = !area.savedBeats().hall && !run.hasKey('coldKey'); saw.lockText = 'SOMETHING IS SAWING IN THERE'; saw.lockLabel = 'LOCKED';
  const winchDoor = level.doorAt(9, 9);
  winchDoor.locked = !run.flag('winchDoorOpen');
  winchDoor.lockText = 'CHAINED FROM A HIGH HOIST'; winchDoor.lockLabel = 'CHAINED';
  const east = level.doorAt(42, 17);
  east.locked = true; east.lockText = 'BARRED FROM THE OTHER SIDE';
  area.doorsNamed = { entrance, cold, saw, winchDoor, east };
  area.hidingSpots = [
    { x: X(5), z: Z(7) }, { x: X(39.5), z: Z(11.5) }, { x: X(19), z: Z(31) }, { x: X(29), z: Z(33) }, { x: X(22.5), z: Z(8) },
  ];
  if (run.flag('winchDone')) { const sh = level.shutters[0]; if (sh) level.setShutter(sh, 1); }
  if (run.flag('dameFreed') && !area.dame) { /* Area.setupCompanion builds her after this */ }
  if (!run.flag('dameFreed')) {
    const a = new Humanoid('dame', { scale: 0.86 });
    a.root.position.set(X(41), 0.3, Z(4));
    a.root.rotation.y = Math.PI;
    a.play('Sit');
    ctx.scene.add(a.root);
    area.npcs.sitDame = a;
  }
  area.level.placeAt('w-stamp', 12, 9.4, { y: 2.8, collide: false, scale: 2 });
  ctx.particles.register('coldbreath', { count: [1, 1], life: [0.6, 1.2], speed: [0.1, 0.3], gravity: -0.3, size: [2, 3], colors: ['white', 'mist'], radius: 2 });
}

/** She takes the winch: the shutter rises unless she's disturbed. */
function startWinch(area) {
  const { run, dame: D, level, ctx } = area;
  const sh = level.shutters[0];
  D.goTo(X(6) + 0.8, Z(4), () => {
    D.mode = 'machine';
    D.actor.play('DameHoist');
    D.yaw = -Math.PI / 2;
    area.winch = { t: 0, tick: 0 };
    D.machineStep = (dt) => {
      const W = area.winch;
      if (!W || W.done) return;
      const near = area.enemies.some((e) => !e.dead && !e.d.crawler && Math.hypot(e.x - D.x, e.z - D.z) < 3.2);
      W.disturbed = near;
      if (!near) W.t += dt;
      const frac = Math.min(1, W.t / WINCH_SECONDS);
      level.setShutter(sh, frac);
      W.tick -= dt;
      if (W.tick <= 0 && !near) { W.tick = 0.5; ctx.audio.play('winch', area.spatial(D.x, D.z, 20)); }
      area.gauge = { label: near ? 'WINCH: THE INSURED IS DISTURBED' : `WINCH ${Math.round(frac * 100)}%`, frac, color: near ? 'red' : 'lime' };
      if (frac >= 1) {
        W.done = true;
        run.setFlag('winchDone');
        area.gauge = null;
        ctx.audio.play('gateOpen');
        D.mode = 'follow';
        D.machineStep = null;
        D.runT = 3;
        area.talk.bark('dame', 'THAT IS QUITE ENOUGH OF THAT.', { prio: 2 });
      }
    };
  });
}

function waveSpawner(area) {
  const W = area.winch;
  if (!W || W.done) return;
  W.waveT = (W.waveT ?? 8) - 1 / 60;
  if (W.waveT > 0) return;
  W.n = (W.n ?? 0) + 1;
  W.waveT = 16 * area.run.waveInterval;
  const door = ['1', '2', '3'][W.n % 3];
  const { director } = area;
  if (director.alive() > 11) return;
  director.queueSpawn('gaffer', 2, door, { every: 1 });
  director.queueSpawn('runner', W.n >= 2 ? 2 : 1, ['2', '3', '1'][W.n % 3], { every: 1.5 });
  if (W.n === 3) director.queueSpawn('carrier', 1, '2', {});
  if (W.n % 3 === 0) director.queueSpawn('bottler', 1, '3', {});
}

const coldCut = (area) => {
  const P = area.player;
  const sit = area.npcs.sitDame;
  return [
    { cam: [[X(38), 1.3, Z(7)], [X(41), 0.9, Z(4)], 36], to: [[X(38.6), 1.2, Z(6)], [X(41), 0.9, Z(4)]] },
    { cue: () => { P.teleport(X(39), 0, Z(6.5), Math.atan2(X(41) - X(39), Z(4) - Z(6.5))); }, cosmetic: false },
    { say: S.coldRoom[0] },
    { cam: [[X(41.3), 1.1, Z(5.6)], [X(39), 1.3, Z(6.5)], 30] },
    { say: S.coldRoom[1] },
    { cam: [[X(39.6), 1.0, Z(5.6)], [X(41), 0.9, Z(4)], 26] },
    { say: S.coldRoom[2] },
    { cam: [[X(41.3), 1.1, Z(5.6)], [X(39), 1.3, Z(6.5)], 30] },
    { say: S.coldRoom[3] },
    { cam: [[X(39.6), 1.0, Z(5.6)], [X(41), 0.9, Z(4)], 26] },
    { say: S.coldRoom[4] },
    { cam: [[X(41.3), 1.1, Z(5.6)], [X(39), 1.3, Z(6.5)], 30] },
    { say: S.coldRoom[5] },
    { cue: () => { sit?.play('StandUp', { once: true }); if (sit) area.ctx.tweens.to(sit.root.position, { y: 0 }, { duration: 0.5 }); } },
    { cam: [[X(38.8), 1.3, Z(4.6)], [X(41), 0.9, Z(4)], 34] },
    { say: S.coldRoom[6], hold: 1.3 },
    { cue: () => {
      if (sit) { area.ctx.scene.remove(sit.root); delete area.npcs.sitDame; }
      area.run.setFlag('dameFreed');
      area.run.dameWith = true;
      area.dame = new Dame(area, X(41), Z(5), Math.PI);
      area.run.giveKey('tithe');
      area.dame.hp = area.dame.maxHp;
    } },
  ];
};

export const cannery = {
  id: 'cannery',
  title: 'THOLE CANNERY',
  chapter: 2,
  map: 'cannery',
  mood: 'indoor',
  music: 'explore',
  autoCombat: true,
  startYaw: 180,
  water: false,
  ambience: [['conveyorLoop', 0.55], ['rainLoop', 0.18]],
  safeZones: [[32, 27, 38, 33]],
  theme: {
    floors: { _: 'flagstones', c: 'metal-plates' },
    walls: { '#': { tex: 'bricks', h: 7 } },
    cover: { tex: 'metal-plates', h: 1, cap: PALETTE.night },
  },
  build: {
    belts: [{ r0: 13, r1: 14, v: [1.5, 0] }, { r0: 21, r1: 22, v: [-1.5, 0] }],
    brine: [[8, 12], [39, 16]],
    coverProps: [],
  },
  chests: [[43, 3, 'scrimshaw'], [2, 19, 'goldTooth']],
  items: [[8, 11, 'ammoPistol', 12], [40, 24, 'ammoShells', 5], [19, 29, 'samphire', 1], [34, 33, 'tin', 1], [13, 3, 'ammoPistol', 12], [25, 3, 'depth', 1], [5, 3, 'samphire', 1], [36, 12, 'ammoRifle', 4]],
  notes: [[38, 28, 'timesheet']],
  backdrop: [],
  fathomYaw: 90,
  setup: setupCannery,
  dameContextLabel(area, D) {
    const P = area.player;
    if (area.run.flag('dameFreed') && !area.run.flag('winchDoorOpen') && Math.hypot(P.x - X(12), P.z - Z(10)) < 2.6) return 'BOOST';
    if (area.run.flag('winchDoorOpen') && !area.run.flag('winchStarted') && Math.hypot(P.x - X(6), P.z - Z(4)) < 6) return 'WINCH';
    return null;
  },
  dameContext(area, D) {
    const P = area.player;
    if (area.run.flag('dameFreed') && !area.run.flag('winchDoorOpen') && Math.hypot(P.x - X(12), P.z - Z(10)) < 2.6) return () => boost(area);
    if (area.run.flag('winchDoorOpen') && !area.run.flag('winchStarted') && Math.hypot(P.x - X(6), P.z - Z(4)) < 6) return () => { area.run.setFlag('winchStarted'); startWinch(area); };
    return null;
  },
  fixed(area, dt) {
    // The Cold Room has its own air: blue and still inside, the cannery's own outside it.
    if (area.player) {
      const { info } = area.level;
      const c = info.col(area.player.x); const r = info.row(area.player.z);
      const inCold = c >= 34 && c <= 44 && r >= 2 && r <= 8;
      if (inCold !== !!area.inColdRoom) { area.inColdRoom = inCold; area.world.setMood(inCold ? 'cold' : 'indoor'); }
    }
    if (area.winch) waveSpawner(area);
    if (area.beltFight) area.beltFight.tick(dt);
    // Everyone on a belt rides it.
    for (const e of area.enemies) {
      if (e.dead || e.floor !== 0) continue;
      const b = area.level.beltAt(e.x, e.z);
      if (b) { const nx = e.x + b.v[0] * dt; if (area.level.nav.walkable(nx, e.z)) e.x = nx; }
    }
  },
  frame(area, dt) {
    for (const c of area.carcasses ?? []) {
      c.phase += dt * 0.5;
      const x = X(10) + ((c.phase * 2.2) % 28);
      c.obj.position.x = x;
      c.obj.rotation.z = Math.sin(c.phase * 3) * 0.12;
    }
    const P = area.player;
    if (P && P.z < Z(9) && P.x > X(33)) {
      area.breathT = (area.breathT ?? 0) - dt;
      if (area.breathT <= 0) { area.breathT = 0.5; area.ctx.particles.burst('coldbreath', [P.x, 1.4, P.z]); }
    }
  },
  onDoor(area, door) {
    if (door === area.doorsNamed.cold) area.run.setFlag('coldOpen');
  },
  cuts: { cold: coldCut },
  beats: [
    { id: 'canneryStart', steps: [
      { objective: 'THE HALL. FIND THE INSURED' },
      { run: (a) => a.showHint('PLEASE HOLD', 'case', 2) },
    ] },
    { id: 'hall', trigger: { on: 'enter', zone: [18, 22, 30, 26] }, steps: [
      { spawn: { type: 'gaffer', n: 7, at: [[12, 12], [20, 11], [30, 12], [35, 15], [11, 24], [28, 24], [34, 24]], state: 'WORK', spread: 0.4 } },
      { spawn: { type: 'gaffer', n: 3, at: [[20, 16], [32, 16], [14, 20]], state: 'WORK' } },
      { spawn: { type: 'bottler', n: 2, at: [[36, 20], [10, 16]], state: 'WORK' } },
      { hint: 'THE BELTS CARRY YOU, AND THEM', action: 'run', time: 7 },
      { until: (a) => a.enemies.filter((e) => !e.dead).length <= 2 || a.director.killed >= 9 },
      { checkpoint: true },
      { run: (a) => { a.doorsNamed.saw.locked = false; } },
    ] },
    { id: 'flenserBurst', trigger: { on: 'when', fn: (a) => !a.doorsNamed.saw.locked }, steps: [
      { wait: 1.5 },
      { run: (a) => {
        const f = a.spawnEnemy('flenser', { x: X(3), z: Z(16), state: 'APPROACH', noLoot: true });
        a.flenser = f;
        a.ctx.audio.play('sawRev');
        a.addDelayed(1.5, () => a.breakDoor(a.doorsNamed.saw, X(3), Z(16)));
      } },
      { objective: 'THE SAW. HEAD SHOTS STAGGER IT' },
      { hint: 'WHEN THE SAW COMES DOWN, DODGE', action: 'qte2', time: 8 },
      { until: (a) => a.flenser?.dead },
      { run: (a) => { a.run.giveKey('coldKey'); a.run.money += 300; a.doorsNamed.cold.locked = false; a.hud.flashText('COLD ROOM KEY', 2.2); a.ctx.audio.play('treasure'); } },
      { objective: 'THE COLD ROOM. NORTH-EAST' },
      { checkpoint: true },
    ] },
    { id: 'cold', trigger: { on: 'enter', zone: [34, 2, 44, 8] }, steps: [
      { run: (a) => a.setMusic(null) },
      { cut: 'cold' },
      { run: (a) => { a.setMusic('explore'); a.dame.barkT = 0; } },
      { hint: 'FOLLOW OR WAIT', action: 'command', time: 8 },
      { radio: [['pym', 'THE INSURED IS A PROTECTED ASSET. PLEASE STOP LEAVING HER IN BARRELS.']], block: false },
      { objective: 'THE WINCH ROOM. BY THE HOIST, WEST' },
      { checkpoint: true },
    ] },
    { id: 'boost', trigger: { on: 'enter', zone: [8, 10, 15, 12] }, steps: [
      { hint: 'BOOST THE INSURED UP TO THE HOIST', action: 'command', time: 10 },
      { until: (a) => a.run.flag('winchDoorOpen') },
      { objective: 'SEND THE INSURED TO THE WINCH' },
      { run: (a) => a.showHint('SEND HER TO THE WINCH', 'command', 8) },
      { until: (a) => a.run.flag('winchStarted') },
      { objective: 'HOLD THE WINCH ROOM UNTIL THE SHUTTER IS UP' },
      { music: 'combat' },
      { until: (a) => a.run.flag('winchDone') },
      { music: 'explore' },
      { checkpoint: true },
      { objective: 'CROSS THE HALL TO THE SHUTTER' },
    ] },
    { id: 'belt', trigger: { on: 'when', fn: (a) => a.run.flag('winchDone') && a.level.info.row(a.player.z) >= 10 && a.level.info.row(a.player.z) <= 15 && Math.abs(a.player.x - X(16)) < 8 }, steps: [
      { run: (a, r) => {
        for (const e of a.enemies) if (!e.dead) e.dieQuiet();
        a.director.queue.length = 0;
        a.dame && (a.dame.mode = 'wait');
        a.setMusic('boss');
        a.beltDone = false;
        startBeltFight(a, { X, Z, onDone: () => { a.beltDone = true; a.setMusic('explore'); if (a.dame) a.dame.mode = 'follow'; } });
      } },
      { until: (a) => a.beltDone },
      { checkpoint: true },
      { objective: 'THE SHUTTER, NORTH' },
    ] },
    { id: 'leave', trigger: { on: 'when', fn: (a) => a.run.flag('winchDone') && a.player.z < Z(2.4) && Math.abs(a.player.x - X(24)) < 3 }, steps: [
      { run: (a) => a.loadNext('yard', null) },
    ] },
  ],
};

function boost(area) {
  const { player: P, dame: D, ctx, run } = area;
  const stationX = X(12); const stationZ = Z(10.2);
  P.teleport(stationX, 0, stationZ + 0.5, Math.PI);
  D.x = stationX; D.z = stationZ; D.mode = 'script';
  P.doAction('boost', 2.4, { clip: 'Boost' });
  D.actor.play('DameHoist');
  ctx.tweens.to(D, { y: 1.6 }, { duration: 0.8, ease: 'outSine' });
  ctx.audio.play('chain');
  area.talk.bark('dame', 'IF YOU LOOK UP, I WILL HAVE YOU DISMISSED.', { prio: 2 });
  area.addDelayed(2.2, () => {
    ctx.audio.play('gateShut');
    ctx.engine.shake.add(0.3);
    const door = area.doorsNamed.winchDoor;
    door.locked = false;
    area.level.openDoor(door, door.x, door.z + 1);
    area.markDoor(door);
    run.setFlag('winchDoorOpen');
    ctx.tweens.to(D, { y: 0 }, { duration: 0.4, ease: 'inSine' });
    D.mode = 'follow';
    // The first Carrier: teach shooting him off.
    const e = area.spawnEnemy('carrier', { x: X(45), z: Z(17), state: 'APPROACH' });
    area.doorsNamed.east.locked = false;
    area.breakDoor(area.doorsNamed.east, X(45), Z(17));
    area.ctx.audio.play('sting', { volume: 0.4 });
    area.showHint('A CARRIER! SHOOT HIM AND SHE DROPS', 'aim', 9);
    void e;
  });
}
