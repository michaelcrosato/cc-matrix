// CLAIM 1: ACT OF GOD. Mourne Quay at bruised dusk. Arrival, the first cottage, the Siege, the Foghorn.
import { PALETTE, THREE, buildModel } from '../../../pixel-engine.js';
import { S } from '../dialogue.js';
import { Humanoid } from '../../game/actor.js';
import { MODELS } from '../../models/index.js';
import { MapInfo } from '../../game/mapPaint.js';
import { SiegeDirector } from '../../game/setpieces/siege.js';

const Q = new MapInfo('quay');
const X = (c) => Q.x(c); const Z = (r) => Q.z(r);
const P = (c, y, r) => [X(c), y, Z(r)];

const dress = [
  // The pier and the quay front.
  ['mail-boat', X(59.5), Z(36), { turn: 180, y: -0.9, collide: false }],
  ['bollard', X(55), Z(31)], ['bollard', X(57), Z(44)], ['bollard', X(48), Z(44)], ['bollard', X(51), Z(20)], ['bollard', X(51), Z(6)],
  ['buoy', X(50), Z(34)], ['fish-crate', X(50), Z(16)], ['fish-crate', X(49), Z(23)], ['crate-stack', X(50), Z(9), { turn: 90 }],
  ['anchor-prop', X(49), Z(29), { turn: 30 }], ['chain-links', X(50), Z(28.2)], ['rowboat', X(50), Z(42), { turn: 8 }],
  ['draped-net', X(49.5), Z(35), { turn: 90 }], ['lobster-pot', X(50), Z(37)], ['lobster-pot', X(49), Z(38)], ['lobster-pot', X(50), Z(38), { turn: 40 }],
  ['lamp-post', X(47.5), Z(28), { light: { intensity: 14, radius: 10 } }], ['lamp-post', X(47.5), Z(13), { light: { intensity: 14, radius: 10 } }],
  ['lamp-post', X(57), Z(32), { light: { intensity: 12, radius: 9 } }],
  // The Square.
  ['campfire', X(29), Z(21), { collide: false, params: {} }],
  ['effigy', X(29), Z(21), { collide: false }],
  ['well', X(38), Z(24)], ['market-stall', X(36), Z(27), { turn: 180, palette: { cloth: 'plum', cloth2: 'white' } }], ['cart', X(24), Z(16), { turn: 30 }],
  ['lamp-post', X(20), Z(16), { light: { intensity: 14, radius: 11 } }], ['lamp-post', X(37), Z(16), { light: { intensity: 14, radius: 11 } }], ['lamp-post', X(22), Z(29), { light: { intensity: 14, radius: 11 } }],
  ['barrel', X(41), Z(14)], ['barrel', X(38), Z(14)], ['crate', X(39.3), Z(13.3)], ['bench', X(32), Z(25), { turn: 0 }], ['sack', X(30), Z(30)], ['bucket', X(27), Z(25)], ['rope-coil', X(36), Z(21)],
  // The drying yard.
  ['drying-rack', X(9.5), Z(5), { turn: 0 }], ['drying-rack', X(14.5), Z(5), { turn: 0 }], ['drying-rack', X(8), Z(12), { turn: 0 }], ['drying-rack', X(13), Z(12), { turn: 0 }],
  ['clothesline', X(4), Z(5), { turn: 90 }], ['haystack', X(19.5), Z(4.5)], ['fence', X(19), Z(13.5), { params: { length: 4 } }], ['bucket', X(4), Z(12)], ['dead-tree', X(19), Z(9)],
  // Market and graveyard.
  ['market-stall', X(17), Z(40.5), { turn: 0, palette: { cloth: 'teal', cloth2: 'white' } }], ['market-stall', X(25), Z(40.5), { turn: 0, palette: { cloth: 'red', cloth2: 'sand' } }], ['market-stall', X(33), Z(40.5), { turn: 0, palette: { cloth: 'navy', cloth2: 'mist' } }],
  ['produce-crate', X(21), Z(37)], ['fish-crate', X(29), Z(37)], ['fish-crate', X(21), Z(44)], ['barrel', X(29), Z(44)], ['lamp-post', X(22), Z(41), { light: { intensity: 10, radius: 9 } }],
  ['tombstone', X(5.5), Z(33)], ['tombstone', X(5.5), Z(38)], ['tombstone', X(10), Z(34)], ['tombstone', X(10), Z(38)], ['tombstone', X(12), Z(36)], ['dead-tree', X(12), Z(41)], ['fence', X(7), Z(31), { params: { length: 8 } }],
  // Interiors.
  ['table', X(43), Z(32.5), { turn: 0 }], ['chair', X(41), Z(33)], ['fireplace', X(44.5), Z(31)], ['bed', X(40), Z(36)], ['barrel', X(45), Z(36.5)], ['hanging-lantern', X(42), Z(34), { y: 2.3, collide: false }],
  ['desk', X(41), Z(18)], ['bookshelf', X(45), Z(16.5)], ['crate', X(41), Z(20)], ['wall-lantern', X(45.4), Z(18.5), { y: 2 }],
  ['altar', X(11), Z(18), { turn: 0 }], ['candles', X(9.5), Z(18), { collide: false }], ['candles', X(12.5), Z(18), { collide: false }], ['bench', X(9), Z(23)], ['bench', X(13), Z(23)], ['bench', X(9), Z(25.5)], ['bench', X(13), Z(25.5)], ['banner', X(11), Z(16.6), { y: 1 }],
  ['crate-stack', X(44), Z(9.5)], ['sack', X(46), Z(6)], ['rope-coil', X(43), Z(6)], ['barrel', X(46), Z(10)],
  ['crate', X(24), Z(11)], ['crate-stack', X(35), Z(11), { turn: 180 }], ['barrel', X(26), Z(6)], ['rope-coil', X(35), Z(6)], ['draped-net', X(31), Z(5.5)], ['sack', X(33), Z(5.5)],
  // Roofs and chimneys come from the map; chimneys here.
  ['chimney', X(44), Z(8), { y: 3, collide: false }], ['chimney', X(43), Z(33), { y: 3, collide: false }], ['chimney', X(21), Z(33), { y: 3, collide: false }], ['chimney', X(33), Z(33), { y: 3, collide: false }],
  ['wall-lantern', X(42), Z(29.4), { y: 2 }], ['wall-lantern', X(29.5), Z(13.6), { y: 2 }],
];

/** The quay's dressing, shared with Night Shift. */
export function dressQuay(area, ctx) {
  const { level } = area;
  for (const [id, x, z, o = {}] of dress) level.place(id, x, z, { ...o });
  level.place('foghorn-tower', X(57), Z(7), { collide: false, y: 4 });
  level.place('hay-cart', X(32), Z(15.9), { collide: false });
  ctx.lights.request({ position: [X(29), 1.2, Z(21)], color: 0xff8030, intensity: 22, radius: 14, flicker: 'torch', priority: 3 });
  ctx.particles.register('bonfire', { count: [4, 6], life: [0.4, 0.9], speed: [1, 2.4], gravity: -2.5, size: [3, 1], colors: ['white', 'sand', 'orange', 'red'], radius: 0.7 });
  area.bonfire = [X(29), 0.3, Z(21)];
}

function setupQuay(area, ctx) {
  const { level, run } = area;
  dressQuay(area, ctx);
  // The wardrobe the player can push across the Net Loft door.
  area.door = level.doorAt(29, 13);
  buildWardrobe(area, ctx);
  buildOutsideLadders(area, ctx);
  // Hiding details: the chapel stays shut until the Foghorn.
  const chapel = level.doorAt(16, 22);
  chapel.locked = !run.flag('foghornDone');
  chapel.lockText = 'THE CHAPEL IS BARRED';
  // The window hint cottage door: Nils's boat burns once the mender is dealt with.
  area.boat = level.props.find((p) => p.id === 'mail-boat');
  area.siege = new SiegeDirector(area);
  if (run.flag('foghornDone')) {
    level.bySpot.get('G0,8') && area.openGateAt(0, 8);
  }
}

function buildWardrobe(area, ctx) {
  const { level, run, interact } = area;
  const c = 27; const r = 12;
  const { obj } = level.place('wardrobe', X(c), Z(r), { collide: false, actor: true, turn: 0 });
  const col = ctx.physics.addStaticBox({ position: [X(c), 1, Z(r)], halfExtents: [0.55, 1, 0.35] });
  ctx.physics.tag(col, 'noCamera', 'prop');
  const door = area.door;
  const w = { obj, col, pushed: false };
  area.wardrobe = w;
  interact.add({
    kind: 'push', x: X(c), z: Z(r), floor: 0, prio: 3.5, radius: 1.9, facing: false, label: 'PUSH',
    enabled: () => !w.pushed && !door.open,
    use: (p) => {
      w.pushed = true;
      const toX = X(29.5);
      const dur = (toX - obj.position.x) / 1.0;
      ctx.physics.remove(w.col);
      ctx.audio.play('stoneGrind', { volume: 0.7 });
      const px0 = obj.position.x - 0.95;
      p.doAction('push', dur, {
        clip: 'Push', from: [px0, Z(r)], to: [px0 + (toX - obj.position.x), Z(r)], y0: p.y, y1: p.y,
        onEnd: () => {
          p.teleport(toX - 0.95, 0, Z(r));
          door.barricade = 1;
          door.hp += 8;
          door.barricadeObj = obj;
          door.barricadeCollider = ctx.physics.addStaticBox({ position: [toX, 1, Z(r)], halfExtents: [1, 1, 0.35] });
          ctx.physics.tag(door.barricadeCollider, 'noCamera', 'prop');
          area.hud.flashText('DOOR BARRICADED', 1.5);
        },
      });
      p.facing = Math.PI / 2 * -1;
      ctx.tweens.to(obj.position, { x: toX }, { duration: dur, ease: 'linear' });
    },
  });
}

/** The Islanders' ladders: raised at the loft's E openings from 1:00 of the siege, every 25 s after. */
function buildOutsideLadders(area, ctx) {
  const { level, interact } = area;
  const up = level.upper;
  area.outsideLadders = [];
  up.eLinks.forEach((e, i) => {
    const outside = e.c > 30 ? 1 : -1;
    const gx = e.x + outside * 1.0; const gz = e.z;
    const b = buildModel('ladder', { catalog: MODELS, params: { rungs: 11, lean: 8 } });
    const obj = b.object;
    obj.position.set(gx, 0, gz);
    obj.rotation.y = outside > 0 ? -Math.PI / 2 : Math.PI / 2;
    obj.rotation.x = 0;
    obj.visible = false;
    ctx.scene.add(obj);
    const link = { id: `E${i}`, x: gx, z: gz, toFloor: 1, toX: e.x - outside * 1.1, toZ: e.z, y1: up.y, active: false, climbers: [] };
    area.links.push(link);
    const L = { link, obj, up: false, e, outside };
    area.outsideLadders.push(L);
    interact.add({
      kind: 'ladder', x: e.x, z: e.z, floor: 1, prio: 1, radius: 1.8, facing: false, label: 'KNOCK DOWN',
      enabled: () => L.up,
      use: (p) => {
        p.doAction('knock', 0.45, { clip: 'DoorKick', at: [0.15, () => knockLadder(area, L)] });
      },
    });
  });
}

export function raiseLadder(area, L) {
  if (L.up) return;
  L.up = true;
  L.obj.visible = true;
  L.link.active = true;
  area.ctx.audio.play('ladder', area.spatial(L.link.x, L.link.z, 30));
  L.obj.rotation.z = (L.outside * -0.9);
  area.ctx.tweens.to(L.obj.rotation, { z: 0 }, { duration: 0.8, ease: 'outBack' });
  area.run.setFlag('ladderUp');
}

export function knockLadder(area, L) {
  if (!L.up) return;
  L.up = false;
  L.link.active = false;
  const { ctx } = area;
  ctx.audio.play('ladderFall', area.spatial(L.link.x, L.link.z, 40));
  ctx.engine.shake.add(0.2);
  ctx.tweens.to(L.obj.rotation, { z: L.outside * 1.5 }, { duration: 0.7, ease: 'inSine' });
  ctx.tweens.call(0.8, () => { L.obj.visible = false; L.obj.rotation.z = 0; });
  for (const e of [...(L.link.climbers ?? [])]) e.fallOffLadder();
  L.link.climbers = [];
  area.run.setFlag('ladderKnocked');
}

const arrivalCut = (area) => {
  const nils = new Humanoid('nils');
  nils.root.position.set(X(56), 0, Z(44.6));
  nils.root.rotation.y = 0;
  area.ctx.scene.add(nils.root);
  nils.play('Idle');
  area.npcs.nils = nils;
  const m = area.player;
  return [
    { cam: [P(60, 2.3, 47), P(56, 1.4, 42), 40], to: [P(59, 2, 45.5), P(56, 1.4, 42)] },
    { cue: () => m.actor.play('Idle') },
    { say: S.arrival[0] },
    { cam: [P(54.6, 1.5, 42.2), P(56, 1.3, 43.6), 36], to: [P(54.8, 1.5, 42.5), P(56, 1.3, 43.6)] },
    { say: S.arrival[1] },
    { cam: [P(57.6, 1.5, 44.2), P(56, 1.4, 44.6), 34] },
    { say: S.arrival[2] },
    { cam: [P(55, 1.6, 41.7), P(56, 1.5, 43.2), 28] },
    { say: S.arrival[3] },
    { cue: () => { nils.play('Walk'); area.ctx.tweens.to(nils.root.position, { z: nils.root.position.z + 6 }, { duration: 4 }); } },
    { cam: [P(49, 6, 38), P(56, 1, 43), 44], to: [P(50, 7, 36), P(56, 1, 41)] },
    { say: S.arrivalPym[0], hold: 0.8 },
    { say: S.arrivalPym[1] },
    { say: S.arrivalPym[2] },
    { cue: () => area.ctx.audio.play('tannoyOn') },
    { cam: [P(49, 1.5, 44), P(49, 3.6, 40), 30], to: [P(49.2, 1.7, 43), P(49, 3.6, 40)] },
    { say: S.arrivalThole[0], hold: 0.8 },
    { cam: [P(57.2, 1.6, 41.8), P(56, 1.5, 43), 30] },
    { say: S.arrivalThole[1] },
    { cue: () => { nils.root.visible = false; delete area.npcs.nils; } },
  ];
};

const menderIntroCut = (area) => {
  const mender = area.mender;
  return [
    { cam: [P(41.5, 1.4, 32), P(43, 0.9, 35), 34], to: [P(41.8, 1.4, 32.6), P(43, 0.9, 35), 34] },
    { say: S.mender[0] },
    { cam: [P(42, 1.2, 33.5), P(43, 0.9, 35), 28] },
    { say: S.mender[1] },
    { cam: [P(43.8, 1.4, 33), P(42, 1.4, 31.6), 30] },
    { say: S.mender[2] },
    { cam: [P(42, 1.2, 33), P(43, 1.2, 35), 24] },
    { cue: () => { mender.enter('ALERT'); area.ctx.audio.play('sting', { volume: 0.5 }); } },
    { wait: 1 },
    { cam: [P(43.8, 1.4, 33), P(42, 1.4, 31.6), 30] },
    { say: S.menderB[0] },
  ];
};

const siegeCut = (area) => [
  { cam: [P(36, 2, 12), P(29, 1.5, 21), 38], to: [P(32, 4, 13), P(29, 1.5, 21), 38] },
  { cue: () => area.ctx.audio.play('tannoyOn') },
  { say: S.siege[0], hold: 0.6 },
  { cam: [P(29, 1, 26), P(29, 4, 21), 42], to: [P(29, 1.4, 25), P(29, 4, 21)] },
  { wait: 1.2 },
  { cam: [P(area.player.x / 1 + 32, 1.6, 0).map((v, i) => (i === 0 ? area.player.x + Math.sin(area.player.facing) * -1.4 : i === 2 ? area.player.z + Math.cos(area.player.facing) * -1.4 : v)), [area.player.x, 1.4, area.player.z], 32] },
  { say: S.siege[1] },
];

export const QUAY_THEME = {
  floors: { '.': 'cobbles', ',': 'peat', '=': 'wet-planks', ':': 'indoor-boards', _: 'flagstones' },
  walls: { '#': { tex: 'basalt', h: 8 }, T: { tex: 'weatherboard', h: 3 } },
  cover: { tex: 'dry-stone', h: 1 },
};
export const QUAY_BUILD = {
  coverProps: [[31, 15, 33, 16, null]],
  brine: [[34, 22], [24, 14]],
  roofs: [[39, 15, 46, 21], [38, 30, 46, 38], [42, 4, 47, 11], [18, 32, 24, 35], [30, 32, 35, 35]],
};
export const QUAY_BACKDROP = [
  ['cliff-silhouette', -60, -1, -40, { params: { w: 60, h: 18 }, seed: 2 }], ['cliff-silhouette', 10, -1, -60, { params: { w: 100, h: 22 }, seed: 5 }],
  ['cliff-silhouette', -60, -1, 40, { params: { w: 60, h: 16 }, seed: 7 }], ['abbey-far', 90, -1, -90, { turn: -30 }], ['sea-stack', 50, -1, 18, { params: { h: 9 }, seed: 3 }], ['sea-stack', 62, -1, -30, { params: { h: 14 }, seed: 4 }], ['sea-stack', 66, -1, 30, { params: { h: 7 }, seed: 6 }],
];

export const quay = {
  id: 'quay',
  title: 'MOURNE QUAY',
  chapter: 1,
  map: 'quay',
  mood: 'dusk',
  music: 'explore',
  autoCombat: true,
  start: [56, 43],
  startYaw: 180,
  water: { y: -0.35 },
  ambience: [['seaLoop', 0.32], ['windLoop', 0.5]],
  upper: { map: 'loft', offset: [22, 4], y: 3.2 },
  hayCart: [X(32), Z(15.5)],
  safeZones: [[6, 17, 15, 29]],
  safeWhen: (a) => a.run.flag('foghornDone'),
  theme: QUAY_THEME,
  build: QUAY_BUILD,
  chests: [[44, 18, 'pearl'], [14, 28, 'reliquary'], [5, 42, 'amber']],
  items: [[49, 33, 'samphire', 1], [51, 12, 'ammoPistol', 4], [33, 7, 'ammoShells', 5], [8, 28, 'samphire', 1], [45, 8, 'ammoPistol', 4]],
  notes: [[10, 21, 'tide']],
  backdrop: QUAY_BACKDROP,
  fathomIntro: S.fathom,
  setup: setupQuay,
  fixed(area, dt) { area.siege?.step(dt); },
  frame(area, dt) {
    if (area.bonfire && !area.run.flag('foghornDone')) {
      area.bonfireT = (area.bonfireT ?? 0) - dt;
      if (area.bonfireT <= 0) { area.bonfireT = 0.09; area.ctx.particles.burst('bonfire', area.bonfire); }
    }
    if (area.boatFire) {
      area.boatFireT = (area.boatFireT ?? 0) - dt;
      if (area.boatFireT <= 0) { area.boatFireT = 0.07; area.ctx.particles.burst('boatfire', P(59.5, 1.4, 36)); }
    }
  },
  onDoor(area, door) {
    if (door === area.level.doorAt(41, 30) && !area.run.flag('cottageOpen')) area.run.setFlag('cottageOpen');
  },
  cuts: { arrival: arrivalCut, mender: menderIntroCut, siege: siegeCut },
  beats: [
    { id: 'arrival', steps: [
      { run: (a) => a.chapterCard('CLAIM 1: ACT OF GOD') },
      { cut: 'arrival' },
      { objective: 'FIND THE FIRST COTTAGE' },
      { hint: 'MOVE', action: 'move', time: 5 },
      { wait: 4 },
      { hint: 'RUN (HOLD)', action: 'run', time: 5 },
      { wait: 4 },
      { hint: 'LOOK', action: 'look', time: 4 },
    ] },
    { id: 'tannoyHint', trigger: { on: 'when', fn: (a) => Math.hypot(a.player.x - X(49), a.player.z - Z(40)) < 9 }, steps: [
      { wait: 2 },
      { hint: 'HOLD TO AIM, THEN FIRE AT THE LOUDSPEAKER', action: 'aim', time: 8 },
      { radio: [['pym', 'OUR RECORDS SHOW LOUDSPEAKERS ARE NOT LOAD-BEARING. SHOOT THEM.']], block: false },
      { until: (a) => a.run.tannoys.length > 0 || a.player.z < Z(34) },
      { run: (a) => a.showHint(null) },
    ] },
    { id: 'cottage', trigger: { on: 'enter', zone: [36, 26, 47, 32] }, steps: [
      { hint: 'ACTION KICKS DOORS OPEN', action: 'action', time: 7 },
      { objective: 'ASK THE NET-MENDER ABOUT THE INSURED' },
      { until: (a) => a.run.flag('cottageOpen') },
      { run: (a) => {
        const m = a.spawnEnemy('gaffer', { x: X(43), z: Z(35), state: 'SCRIPT', yaw: Math.PI, noLoot: false, palette: { coat: 'plum', hat: 'night' } });
        m.actor.play('WorkMend');
        a.mender = m;
      } },
      { until: (a) => a.level.info.row(a.player.z) >= 31 },
      { cut: 'mender' },
      { run: (a) => { a.mender.enter('APPROACH'); } },
      { hint: 'AIM FOR THE HEAD OR LEGS. THEN KICK.', action: 'aim', time: 9 },
      { until: (a) => a.mender.dead },
      { run: (a) => a.showHint(null) },
      { wait: 0.8 },
      { run: (a) => {
        a.ctx.audio.play('depthCharge', { volume: 0.5 });
        a.ctx.engine.shake.add(0.4);
        a.ctx.lights.request({ position: P(58, 3, 36), color: 0xff7020, intensity: 30, radius: 30, flicker: 'torch', priority: 4 });
        a.ctx.particles.register('boatfire', { count: [5, 8], life: [0.6, 1.4], speed: [1, 3], gravity: -3, size: [3, 1], colors: ['white', 'sand', 'orange', 'red', 'night'], radius: 1.4 });
        a.boatFire = 1;
      } },
      { lines: S.boatBurn, block: false },
      { spawn: { type: 'gaffer', n: 2, at: [[41, 28], [42, 28]] } },
      { hint: 'THEY ARE AT THE DOOR. VAULT THE WINDOW.', action: 'action', time: 8 },
      { objective: 'GET OUT THROUGH THE WINDOW. HEAD NORTH ALONG THE QUAY' },
      { until: (a) => a.run.flag('vaultedOnce') || a.enemies.filter((e) => !e.dead).length === 0 },
      { run: (a) => a.showHint(null) },
      { checkpoint: true },
    ] },
    { id: 'quayFront', trigger: { on: 'enter', zone: [47, 12, 51, 26] }, steps: [
      { spawn: { type: 'gaffer', n: 3, door: '5', every: 0.8 } },
      { objective: 'FOLLOW THE QUAY TO THE NET SHED' },
      { run: (a) => a.level.bySpot.get('C49,12') && (a.level.bySpot.get('C49,12').loot = { kind: 'money', qty: 120 }) },
      { hint: 'BREAK CRATES WITH THE KNIFE', action: 'knife', time: 7 },
    ] },
    { id: 'shedHint', trigger: { on: 'enter', zone: [42, 4, 47, 11] }, steps: [
      { objective: 'TALK TO THE MAN IN THE DIVING HELMET' },
      { until: (a) => a.run.flag('fathomMet') },
      { hint: 'THE CASE. PLACE AND ROTATE WHAT YOU CARRY', action: 'case', time: 8 },
      { objective: 'THE SQUARE. WEST OF THE NET LOFT' },
    ] },
    // The Square proper. Its east edge stops short of the cottage door at (41-42, 30): walking up to the door you've just
    // been told to use must not start the Siege.
    { id: 'siege', trigger: { on: 'enter', zone: [18, 14, 36, 29] }, steps: [
      { run: (a) => a.showHint(null) },
      // Dying in the Siege starts the Siege again, not the walk back from the cottage.
      { checkpoint: true },
      { run: (a) => a.siege.prepare() },
      { cut: 'siege' },
      { music: 'siege' },
      { run: (a) => a.siege.start() },
      { objective: 'SURVIVE' },
      { hint: 'KICK STUNNED ENEMIES. DOORS, WINDOWS AND THE LOFT LADDER ARE YOUR FRIENDS.', action: 'action', time: 9 },
      { radio: [['pym', 'MS. RANSOM. IF YOU ARE SURROUNDED, THAT IS A SECTION 4 EVENT. KICK SOMETHING.']], block: false },
      { until: (a) => a.siege.finished },
      { checkpoint: true },
      { music: 'explore' },
      { objective: 'THE WEST GATE IS OPEN. THE CHAPEL IS DRY' },
      { run: (a) => { a.level.doorAt(16, 22).locked = false; } },
    ] },
    // Only once the gate is open: walking up to it shut, in the middle of the Siege or in the first minute, ends nothing.
    { id: 'westGate', trigger: { on: 'when', fn: (a) => a.run.flag('foghornDone') && a.level.info.col(a.player.x) <= 1 && a.level.info.row(a.player.z) >= 7 && a.level.info.row(a.player.z) <= 10 }, steps: [
      { run: (a) => { a.run.chapter = 2; a.finishChapter('road', null); } },
    ] },
  ],
  bot: 'quay',
};
export { PALETTE, THREE };
