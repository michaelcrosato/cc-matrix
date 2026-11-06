// CLAIM 3: ACT OF COMMODORE. A 90 m stone road to the abbey as the tide comes in.
import { PALETTE, THREE, buildModel, setLookLayer } from '../../../pixel-engine.js';
import { S } from '../dialogue.js';
import { MapInfo } from '../../game/mapPaint.js';
import { MODELS } from '../../models/index.js';

const M = new MapInfo('causeway');
const X = (c) => M.x(c); const Z = (r) => M.z(r);
const DURATION = 240;
const W_LOW = -0.6; const W_HIGH = 0.9;

export class Tide {
  constructor(area) {
    this.area = area;
    this.t = area.run.flag('tideT') ? +area.run.flags.tideT : 0;
    this.level = W_LOW;
    this.rockY = 0;
    this.running = false;
    this.lifted = [];
    this.damageT = 0;
  }
  speedScale(p) {
    const ch = this.area.level.info.at(p.x, p.z);
    if (ch === ',') return 1;
    return this.level > 0.1 ? 0.7 : 1;
  }
  step(dt) {
    if (!this.running) return;
    const { area } = this;
    this.t += dt;
    const f = Math.min(1, this.t / DURATION);
    this.level = W_LOW + (W_HIGH - W_LOW) * f;
    area.world.setWaterLevel(this.level);
    this.rockY = Math.max(0, this.level + 0.02);
    const left = Math.max(0, DURATION - this.t);
    area.gauge = { label: `TIDE ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`, frac: f, color: f > 0.8 ? 'red' : 'cyan' };
    const P = area.player;
    if (P.alive) {
      const dry = area.level.info.at(P.x, P.z) === ',';
      if (!dry && this.level > 0.7) {
        this.damageT -= dt;
        P.hurt(2 * dt, null, { dot: true });
      }
      if (this.t >= DURATION && !dry) {
        area.deathReason = 'LOST AT SEA';
        P.invuln = 0;
        P.hurt(9999, null, {});
      }
      if (this.t >= DURATION + 6) { area.deathReason = 'LOST AT SEA'; P.invuln = 0; P.hurt(9999, null, {}); }
    }
    area.run.flags.tideT = this.t;
  }
  frame() {
    for (const o of this.lifted) o.position.y = this.rockY;
    if (this.rockMesh) this.rockMesh.forEach((m) => { m.position.y = this.rockY; });
  }
}

/** Boats: a Harpooner in a rowboat that shadows you at 10 m. */
function spawnBoat(area, side, lead) {
  const { ctx } = area;
  const b = buildModel('rowboat', { catalog: MODELS });
  setLookLayer(b.object, 'actors');
  ctx.scene.add(b.object);
  const P = area.player;
  const e = area.spawnEnemy('harpooner', { x: side * 11, z: P.z + lead, y: -0.1, state: 'APPROACH', noLoot: true });
  const boat = { obj: b.object, e, side, lead, bob: side };
  e.botIgnore = false;
  area.boats = area.boats ?? [];
  area.boats.push(boat);
  return boat;
}

function setupCauseway(area, ctx) {
  const { level } = area;
  area.tide = new Tide(area);
  const lift = (obj) => { area.tide.lifted.push(obj); return obj; };
  // Dry rocks: their tops lift with the water so they always stand clear of it.
  area.tide.rockMesh = [];
  for (const [c0, r0, c1, r1] of [[0, 62, 4, 68], [11, 34, 15, 40]]) {
    const w = c1 - c0 + 1; const d = r1 - r0 + 1;
    const rock = buildModel('rock', { catalog: MODELS, seed: c0 + 3 });
    rock.object.scale.set(w / 1.2, 0.5, d / 1.2);
    rock.object.position.set(X(c0) + (w - 1) / 2, -0.5, Z(r0) + (d - 1) / 2);
    ctx.scene.add(rock.object);
  }
  for (const [id, c, r, o = {}] of [
    ['lamp-post', 5, 80, { light: { intensity: 14, radius: 12 } }], ['lamp-post', 10, 66, { light: { intensity: 14, radius: 12 } }], ['lamp-post', 5, 50, { light: { intensity: 14, radius: 12 } }], ['lamp-post', 10, 34, { light: { intensity: 14, radius: 12 } }], ['lamp-post', 5, 18, { light: { intensity: 14, radius: 12 } }], ['lamp-post', 10, 6, { light: { intensity: 16, radius: 12 } }],
    ['tombstone', 10, 72, { collide: false }], ['bollard', 5, 58], ['bollard', 10, 44], ['bollard', 5, 30], ['anchor-prop', 10, 22, { collide: false }], ['chain-links', 6, 40],
    ['wall-lantern', 5, 1.4, { y: 2.4, collide: false }], ['wall-lantern', 10, 1.4, { y: 2.4, collide: false }],
    ['buoy', 13, 60, { collide: false, y: -0.4 }], ['buoy', 2, 30, { collide: false, y: -0.4 }], ['buoy', 14, 16, { collide: false, y: -0.4 }],
  ]) level.placeAt(id, c, r, o);
  // The wheel at the gate.
  const wheel = level.placeAt('winch-machine', 5.2, 2.6, { collide: false, turn: 90 });
  area.gateWheel = wheel.obj.getObjectByName('Wheel');
  area.drownedAt = [[4, 75], [11, 58], [4, 45], [11, 25], [4, 15]].map(([c, r]) => ({ c, r, done: false }));
  // Lift what stands on the rocks.
  ctx.lights.request({ position: [X(1), 2.5, Z(65)], color: 0x70f060, intensity: 7, radius: 10, flicker: 'pulse' });
  area.addDelayed(0, () => {
    if (area.fathom) lift(area.fathom.actor.root);
    for (const c of level.chests) lift(c.obj);
  });
}

export const causeway = {
  id: 'causeway',
  title: 'THE CAUSEWAY',
  chapter: 3,
  map: 'causeway',
  mood: 'moon',
  music: 'tide',
  startYaw: 180,
  water: { y: W_LOW, opacity: 0.82, deep: PALETTE.navy, shallow: PALETTE.teal, size: [260, 300] },
  ambience: [['seaLoop', 0.6], ['windLoop', 0.6]],
  theme: {
    floors: { '.': 'flagstones', '%': 'wet-sand', ',': 'basalt' },
    walls: { '#': { tex: 'basalt', h: 8 } },
  },
  build: { gateModel: 'portcullis' },
  chests: [[14, 37, 'scrimshaw']],
  items: [[2, 64, 'ammoPistol', 12], [13, 36, 'samphire', 1], [3, 66, 'ammoShells', 5], [13, 39, 'ammoRifle', 4]],
  notes: [[3, 63, 'receipt']],
  fathomYaw: 90,
  backdrop: [
    ['abbey-far', 0, -1, -96, { scale: 1.4 }], ['cliff-silhouette', -70, -1, -80, { params: { w: 90, h: 20 }, seed: 31 }], ['cliff-silhouette', 80, -1, -70, { params: { w: 90, h: 16 }, seed: 33 }],
    ['sea-stack', -30, -1, -20, { params: { h: 12 }, seed: 2 }], ['sea-stack', 26, -1, 12, { params: { h: 9 }, seed: 7 }], ['sea-stack', -28, -1, 32, { params: { h: 10 }, seed: 5 }], ['foghorn-tower', 70, -1, 80, { scale: 0.8 }],
  ],
  setup: setupCauseway,
  dameContextLabel() { return null; },
  fixed(area, dt) {
    area.tide?.step(dt);
    const P = area.player;
    // Drowned rise as you pass.
    if (area.tide?.running && area.drownedAt) {
      for (const s of area.drownedAt) {
        if (s.done || P.z > Z(s.r) + 9) continue;
        s.done = true;
        for (let i = 0; i < 3; i++) area.spawnEnemy('drowned', { x: X(s.c) + i - 1, z: Z(s.r) - 2 - i, state: 'RISE' });
        area.ctx.audio.play('splash', area.spatial(X(s.c), Z(s.r), 30));
      }
    }
    // Boats keep station.
    for (const b of area.boats ?? []) {
      const e = b.e;
      if (e.dead) { b.obj.position.y -= dt * 0.4; b.obj.rotation.z += dt * 0.3; continue; }
      const wantZ = P.z + b.lead;
      e.z += Math.max(-5 * dt, Math.min(5 * dt, wantZ - e.z));
      e.x = b.side * 11;
      e.y = area.tide.level + 0.45;
      b.obj.position.set(e.x, area.tide.level - 0.15, e.z);
    }
  },
  frame(area) {
    area.tide?.frame();
  },
  botReflex(bot, it, dt) {
    const a = bot.area;
    if (a.tide) a.tide.lastBot = bot;
    return false;
  },
  beats: [
    { id: 'causewayStart', steps: [
      { run: (a) => { a.chapterCard('CLAIM 3: ACT OF COMMODORE'); a.world.setMood('moon'); } },
      { wait: 2.8 },
      { lines: [S.causeway[0], S.causeway[1], S.causeway[2]], block: false },
      { run: (a) => { a.tide.running = true; a.setObjective('RUN. THE ABBEY GATE, NORTH'); } },
      { hint: 'THE TIDE IS COMING IN. RUN', action: 'run', time: 6 },
      { wait: 12 },
      { radio: [['pym', 'TIDE IS NOT AN ACT OF GOD IF IT WAS PRINTED IN ADVANCE.']], block: false },
      { run: (a) => { spawnBoat(a, -1, -6); } },
      { wait: 22 },
      { run: (a) => { spawnBoat(a, 1, -9); } },
    ] },
    { id: 'gate', trigger: { on: 'enter', zone: [3, 2, 12, 5] }, steps: [
      { run: (a) => {
        a.setObjective('HOLD THEM OFF WHILE THE INSURED TURNS THE WHEEL');
        if (a.dame) {
          a.dame.goTo(X(5.2) + 0.9, Z(3.6), () => { a.dame.mode = 'machine'; a.dame.actor.play('DameHoist'); a.wheelT = 6; });
        } else a.wheelT = 6;
        a.ctx.audio.play('chain');
      } },
      { spawn: { type: 'drowned', n: 3, at: [[5, 9], [8, 10], [10, 8]], state: 'RISE' } },
      { until: (a) => a.wheelT !== undefined && a.wheelT <= 0 },
      { run: (a) => { a.tide.running = false; a.openGateAt(6, 0); if (a.dame) a.dame.mode = 'follow'; for (const e of a.enemies) if (!e.dead) e.dieQuiet(); a.gauge = null; a.setObjective('INSIDE. NOW'); } },
      { until: (a) => a.player.z < Z(1.8) },
      { run: (a) => a.loadNext('abbey', null) },
    ] },
  ],
};
causeway.fixedExtra = (area, dt) => {
  if (area.wheelT > 0) {
    area.wheelT -= dt;
    if (area.gateWheel) area.gateWheel.rotateX(dt * 3);
    area.gauge = { label: 'THE WHEEL', frac: 1 - area.wheelT / 6, color: 'lime' };
  }
};
const base = causeway.fixed;
causeway.fixed = (area, dt) => { base(area, dt); causeway.fixedExtra(area, dt); };
export { DURATION as TIDE_SECONDS };
