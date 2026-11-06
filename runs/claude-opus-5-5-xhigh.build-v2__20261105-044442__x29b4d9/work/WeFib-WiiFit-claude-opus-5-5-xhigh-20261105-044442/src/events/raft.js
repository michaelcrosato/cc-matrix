import * as THREE from 'three/webgpu';
import { EventBase } from './base.js';
import { M, G, geo, add } from '../art/materials.js';
import { WOOD, WOOD_D, CREAM, RED, TEAL } from '../art/props.js';
import { h } from '../ui/dom.js';
import { line } from '../data/dialogue.js';
import { rot2 } from '../render/cameraRig.js';
import { blankInput } from '../input/input.js';

const K = 6, C = 3.5, WALK = 3, SHOVE_R = 1.3, MAX = 26 * Math.PI / 180;
const W_PER = (K * (14 * Math.PI / 180)) / 6;
/** Everyone on one raft, on the same seesaw. Last doll standing wins the round. */
export class Raft extends EventBase {
  static id = 'raft';
  constructor(spec) {
    super(spec);
    this.discs = false; this.customPose = true; this.seaLevel = -1.5; this.god = true;
    if (this.laneSpecs.length < 2) {
      const skills = ['average', 'sharp', 'clumsy'];
      const names = ['Retired Kevin', 'Sandra', 'Other Sandra'];
      const cols = ['#6FB7D6', '#E78FB3', '#F5C84A'];
      this.laneSpecs = [...this.laneSpecs, ...[0, 1, 2].map((i) => ({ kind: 'bot', skill: skills[i], name: names[i], colour: cols[i] }))];
    }
    this.round = 1; this.wins = {}; this.tx = 0; this.tz = 0; this.vx = 0; this.vz = 0; this.radius = this.cfg.radius; this.roundT = 0; this.stage = 'play'; this.waitT = 0; this.nextSwell = this.cfg.swell; this.done = false; this.shrinkT = this.cfg.shrink;
    this.warn = 0;
    this.sections = [];
  }
  addGround() {}
  buildLane(lane, i) {
    lane.doll = new (this.dollClass())( { shirt: lane.colour, hat: lane.hat });
    lane.doll.flatFeet = false;
    lane.bal = null;
    this.spawnLane(lane, i);
  }
  dollClass() { return RaftDoll.cls; }
  spawnLane(lane, i) {
    const n = this.laneSpecs.length;
    const a = (i / n) * Math.PI * 2 + Math.PI / 4;
    lane.px = Math.cos(a) * 2.5; lane.pz = Math.sin(a) * 2.5; lane.vx = 0; lane.vz = 0; lane.out = false; lane.cool = 0; lane.y = 0; lane.hopT = 0; lane.vy = 0; lane.sx = 0; lane.sz = 0; lane.sink = 0;
    lane.doll.root.visible = true;
  }
  buildSet() {
    const g = this.group;
    this.raftG = G('raft');
    g.add(this.raftG);
    const rings = [[0, 2], [2, 3], [3, 4], [4, 5], [5, 6]];
    for (const [a, b] of rings) {
      const seg = b === 2 ? 1 : 8;
      for (let i = 0; i < seg; i++) {
        const th0 = (i / seg) * Math.PI * 2, thL = (Math.PI * 2) / seg;
        const shape = b === 2 ? new THREE.CylinderGeometry(2, 2, 0.26, 28) : ringSeg(a, b, th0, thL);
        const m = new THREE.Mesh(shape, M(geo.box(1, 1, 1), (i + b) % 2 ? WOOD : 0xB98347).material);
        m.castShadow = true; m.receiveShadow = true;
        m.position.y = -0.13;
        this.raftG.add(m);
        this.sections.push({ m, r: b, drift: 0, a: th0 + thL / 2 });
      }
    }
    add(this.raftG, M(geo.cyl(0.08, 0.08, 1.8, 10), CREAM, 0, 0.9, 0), M(geo.cone(0.5, 0.5, 3), RED, 0.25, 1.65, 0, { rot: [0, 0, -Math.PI / 2], scale: [1, 1, 0.1] }));
    for (const lane of this.lanes) this.raftG.add(lane.doll.root);
    this.waveM = M(geo.sphere(1, 20, 10), 0xBFF5EA, 0, this.seaLevel, 0, { shadow: false });
    this.waveM.visible = false;
    g.add(this.waveM);
    this.addTrudy(0.9, 0.06, 0.3, 0.3, 0.8);
    this.raftG.add(this.trudyArt.root);
    this.game.setBackdrop(90, -110);
    this.game.sea.setLevel(this.seaLevel);
  }
  cameraShot(snap) { this.game.rig.shot(0, 12.5, 12, 0, 0, 0, { snap, rate: 3, fov: 38 }); this.inputYaw = 0; }
  hudSetup(hud) {
    this.scoreTag = hud.addWidget(h('div.tag', { style: 'font-size:3.6rem' }, 'Round 1 of 3'));
    hud.setScore('', '');
    hud.setTime(null);
  }
  start() { if (this.mode === 'solo') this.game.speech.say('trudy', line('trudy', 'raft_start'), { auto: 3, top: true }); }
  alive() { return this.lanes.filter((l) => !l.out); }
  fixedEvent(dt) {
    if (this.stage === 'between') {
      this.waitT -= dt;
      if (this.waitT <= 0) this.nextRound();
      return;
    }
    this.roundT += dt;
    this.shrinkT -= dt;
    if (this.shrinkT <= 0 && this.radius > 2) {
      this.shrinkT = this.cfg.shrink;
      this.radius = Math.max(2, this.radius - 1);
      this.game.audio.sfx('creak', { dur: 0.7 });
      for (const s of this.sections) if (s.r > this.radius) s.drift = s.drift || 0.0001;
    }
    this.nextSwell -= dt;
    if (this.warn > 0) {
      this.warn -= dt;
      if (this.warn <= 0) {
        this.vx += Math.cos(this.swellA) * 2.5; this.vz += Math.sin(this.swellA) * 2.5;
        this.game.audio.sfx('splash', { big: 0.6 });
        this.game.rig.shake(0.05);
      }
    } else if (this.nextSwell <= 0) {
      this.nextSwell = this.cfg.swell * (0.8 + this.r() * 0.4);
      this.swellA = this.r() * Math.PI * 2;
      this.warn = 1;
      this.game.hud.setNote('A swell is coming', 1);
      this.game.audio.sfx('gust', { dur: 0.8 });
    }
    // Everyone on the same seesaw.
    let wx = 0, wz = 0;
    for (const l of this.lanes) if (!l.out && l.y <= 0) { wx += l.px * W_PER; wz += l.pz * W_PER; }
    this.vx += (wx - K * this.tx - C * this.vx) * dt; this.vz += (wz - K * this.tz - C * this.vz) * dt;
    this.tx += this.vx * dt; this.tz += this.vz * dt;
    const m = Math.hypot(this.tx, this.tz);
    if (m > MAX) { this.tx *= MAX / m; this.tz *= MAX / m; }
    for (const l of this.lanes) this.stepLane(l, dt);
    const alive = this.alive();
    if (alive.length <= 1 && this.stage === 'play') this.endRound(alive[0]);
    if (this.roundT > 55 && this.stage === 'play') {
      // Nobody stays dry for ever: the middle starts going too.
      this.radius = Math.max(1, this.radius - dt * 0.2);
    }
    // Every round ends within 90 s. Whoever is nearest the middle has it.
    if (this.roundT >= 90 && this.stage === 'play') {
      const near = (l) => Math.hypot(l.px, l.pz);
      this.endRound(this.alive().sort((a, b) => near(a) - near(b))[0]);
    }
  }
  stepLane(l, dt) {
    if (l.out) {
      l.sink += dt;
      return;
    }
    const i = l.input;
    l.cool = Math.max(0, l.cool - dt);
    let mx = i.moveX || 0, mz = i.moveZ || 0;
    if (i.device === 'kbm' && !i.keysActive && l.kind === 'local' && !this.game.input.pointerActive) { mx = 0; mz = 0; }
    const mm = Math.hypot(mx, mz);
    if (mm > 1) { mx /= mm; mz /= mm; }
    l.vx *= Math.exp(-3 * dt); l.vz *= Math.exp(-3 * dt);
    const slope = l.y > 0 ? 0 : 10;
    l.px += (mx * WALK + l.vx + this.tx * slope) * dt; l.pz += (mz * WALK + l.vz + this.tz * slope) * dt;
    // Hop.
    if (i.hopPressed && l.y <= 0) { l.vy = 3.4; this.game.audio.sfx('boing'); l.doll.rig.once('hop'); }
    if (l.y > 0 || l.vy > 0) { l.vy -= 9.81 * dt; l.y = Math.max(0, l.y + l.vy * dt); if (l.y <= 0) { l.vy = 0; l.doll.rig.once('land'); this.game.audio.sfx('thud', { pitch: 240 }); } }
    // Flail shoves in a short cone.
    if (i.flail && l.cool <= 0) {
      l.cool = 2;
      l.doll.rig.once('flail');
      this.game.audio.sfx('whoosh');
      for (const o of this.lanes) {
        if (o === l || o.out) continue;
        const dx = o.px - l.px, dz = o.pz - l.pz, d = Math.hypot(dx, dz);
        if (d < SHOVE_R && o.y <= 0) {
          // Point blank still shoves, or two dolls on one spot could stand there for ever.
          const a = d > 0.05 ? Math.atan2(dz, dx) : this.r() * Math.PI * 2;
          o.vx += Math.cos(a) * 6; o.vz += Math.sin(a) * 6;
          this.game.audio.sfx('clack');
          this.game.comic.pop('SHOVE!', o.px, 2, o.pz, { size: 1.6 });
          this.game.input.rumble(0.4, 0.3, 120, o.input.padIndex >= 0 ? o.input.padIndex : undefined);
        }
      }
    }
    const d = Math.hypot(l.px, l.pz);
    if (d > this.radius + 0.15 && l.y <= 0.3) {
      l.out = true;
      l.doll.rig.loop('spread');
      this.game.fx.splash(l.px, this.seaLevel, l.pz, 1.4);
      this.game.audio.sfx('splash', { big: 1.2 });
      this.game.comic.pop('SPLOSH!', l.px, 1, l.pz);
      if (l.kind === 'local') { this.game.onFloorExercise(); this.bark('trudy', 'raft_out', 2.2, 1); this.game.input.rumble(0.8, 0.5, 240); }
    }
    if (mm > 0.15) { l.doll.face(Math.atan2(mx, mz)); if (l.doll.rig.onceLeft <= 0) l.doll.rig.loop('walk', { speed: 1.3 }); } else if (l.doll.rig.onceLeft <= 0) l.doll.rig.loop('idle');
  }
  endRound(winner) {
    this.stage = 'between'; this.waitT = 3.4;
    if (winner) {
      this.wins[winner.id] = (this.wins[winner.id] || 0) + 1;
      winner.doll.rig.loop('cheer');
      this.game.hud.flash(`${winner.name}!`, 2);
      this.game.fx.confetti(winner.px, 5, winner.pz, 60, [0xE8443A, 0xF5B700, 0x2CB5A0, 0xFFF3DC], 3);
      this.game.audio.sting('pleasant');
      if (this.mode === 'solo') this.game.speech.say('trudy', line('trudy', 'raft_win'), { auto: 3, top: true });
    }
    this.lastWinner = winner;
    const most = Math.max(0, ...Object.values(this.wins));
    if (most >= 2 || this.round >= 3) { this.finishing = true; }
  }
  nextRound() {
    if (this.finishing) { this.done = true; return; }
    this.round++;
    this.stage = 'play'; this.roundT = 0; this.radius = this.cfg.radius; this.shrinkT = this.cfg.shrink; this.tx = 0; this.tz = 0; this.vx = 0; this.vz = 0; this.nextSwell = this.cfg.swell; this.warn = 0;
    for (const s of this.sections) { s.drift = 0; s.m.position.set(0, -0.13, 0); s.m.rotation.set(0, 0, 0); s.m.visible = true; }
    this.lanes.forEach((l, i) => this.spawnLane(l, i));
    if (this.scoreTag) this.scoreTag.textContent = `Round ${this.round} of 3`;
    this.game.audio.sfx('bell');
  }
  botInput(lane, t, bot) {
    const out = lane.input;
    Object.assign(out, blankInput());
    if (lane.out) return;
    // Stay toward the centre and the high side; go at whoever is close; shove when in reach.
    // A bot feels the tilt a moment late, as anyone would.
    const seen = bot.data.tilts || (bot.data.tilts = []);
    seen.push(this.tx, this.tz);
    const late = Math.max(1, Math.round(bot.s.lag * 120));
    if (seen.length > late * 2) seen.splice(0, seen.length - late * 2);
    let gx = -lane.px * 0.7 - seen[0] * 8, gz = -lane.pz * 0.7 - seen[1] * 8;
    let near = null, nd = 1e9;
    for (const o of this.lanes) { if (o === lane || o.out) continue; const d = Math.hypot(o.px - lane.px, o.pz - lane.pz); if (d < nd) { nd = d; near = o; } }
    const edge = Math.hypot(lane.px, lane.pz) / this.radius;
    if (near && nd < 3.5 && edge < 0.8) { gx += (near.px - lane.px) * 0.6; gz += (near.pz - lane.pz) * 0.6; }
    const m = Math.hypot(gx, gz) || 1;
    const k = Math.min(1, m);
    let mx = (gx / m) * k, mz = (gz / m) * k;
    const noise = bot.s.noise * 5;
    mx += Math.sin(bot.t * 2.1 + bot.ph) * noise; mz += Math.sin(bot.t * 1.7 + bot.ph2) * noise;
    out.moveX = mx; out.moveZ = mz; out.wishX = mx; out.wishZ = mz; out.useMove = true;
    bot.data.react = (bot.data.react || 0) - 1 / 120;
    if (near && nd < SHOVE_R * 0.95 && lane.cool <= 0 && bot.data.react <= 0) { out.flail = true; bot.data.react = bot.s.lag; }
    out.device = 'pad';
  }
  hud() {
    const hud = this.game.hud;
    const me = this.lanes.find((l) => l.kind === 'local');
    if (me) hud.setScore(this.wins[me.id] || 0, 'Rounds');
  }
  readInput(lane, dt) {
    super.readInput(lane, dt);
    if (lane.kind === 'local' && this.inputYaw === 0 && !lane.input.moveX && !lane.input.moveZ) { /* resting */ }
  }
  frameEvent(dt) {
    const a = Math.hypot(this.tx, this.tz) || 1e-9, s = Math.sin((a * 0.55) / 2);
    this.raftG.quaternion.set((this.tz / a) * s, 0, (-this.tx / a) * s, Math.cos((a * 0.55) / 2));
    this.raftG.position.y = Math.sin(this.t * 0.9) * 0.05;
    // Each swell shows first: a wave rising on the far side, coming in.
    this.waveM.visible = this.warn > 0;
    if (this.warn > 0) {
      const k = 1 - this.warn, d = 15 - k * 7;
      this.waveM.position.set(-Math.cos(this.swellA) * d, this.seaLevel, -Math.sin(this.swellA) * d);
      this.waveM.rotation.y = -this.swellA;
      this.waveM.scale.set(1.3, 0.3 + k * 1.5, 10);
    }
    for (const sec of this.sections) {
      if (sec.drift) {
        sec.drift += dt;
        const r = sec.drift * 0.9;
        sec.m.position.set(Math.cos(sec.a) * r, -0.13 - sec.drift * 0.08, Math.sin(sec.a) * r);
        sec.m.rotation.y = sec.drift * 0.1;
        if (sec.drift > 6) sec.m.visible = false;
      }
    }
    for (const l of this.lanes) {
      const d = l.doll;
      if (l.out) {
        d.root.position.set(l.px, Math.max(-2.4, -1.5 - l.sink * 0.3), l.pz);
      } else d.root.position.set(l.px, l.y, l.pz);
      d.update(dt);
    }
  }
  isDone() { return this.done; }
  laneResult(lane) {
    const w = this.wins[lane.id] || 0;
    const form = 40 + 30 * w;
    return { form, raw: w, big: `${w} won`, stats: `${w} rounds won of ${this.round}` };
  }
}
function ringSeg(a, b, start, len) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, b, start, start + len - 0.02, false);
  shape.absarc(0, 0, a, start + len - 0.02, start, true);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.26, bevelEnabled: false, curveSegments: 5 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -0.13, 0);
  return g;
}
export const RaftDoll = { cls: null };
export { WOOD_D, TEAL, rot2 };
