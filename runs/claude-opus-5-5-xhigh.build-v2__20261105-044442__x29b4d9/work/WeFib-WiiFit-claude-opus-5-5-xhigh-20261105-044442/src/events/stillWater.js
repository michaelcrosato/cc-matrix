import * as THREE from 'three/webgpu';
import { positionWorld, length, sin, time, mix, smoothstep, step, vec3, uniform, float, exp, clamp } from 'three/tsl';
import { EventBase } from './base.js';
import { M, G, geo, add } from '../art/materials.js';
import { STONE, LEAF, LEAF2, WOOD_D, tree } from '../art/props.js';
import { Heron, Gull } from '../art/cast.js';
import { h } from '../ui/dom.js';
import { line } from '../data/dialogue.js';

const THRESH = [0.2, 0.4, 0.6, 0.8, 1];
/** Sit on a lily pad. Stay in the small calm zone. Calm fills, and creatures arrive. */
export class StillWater extends EventBase {
  static id = 'stillWater';
  constructor(spec) {
    super(spec);
    this.breathOn = true; this.god = true; this.seaLevel = -1.5;
    this.calm = 0; this.peak = 0; this.inT = 0; this.ripple = 0; this.customPose = true;
    this.arrived = 0; this.sneezes = [];
    const n = this.cfg.sneezes;
    for (let i = 0; i < n; i++) this.sneezes.push({ at: ((i + 1) / (n + 1)) * this.cfg.time + (this.r() - 0.5) * 6, state: 'wait' });
    this.push = 0; this.pushX = 0; this.pushZ = 0;
    this.scattered = 0;
  }
  setupLane(lane) { lane.doll.rig.loop('sit'); lane.bal.moveFoot(lane.x, 0, 0); }
  buildSet() {
    const g = this.group;
    // A beautiful little shader: ripples spread from the pad in proportion to how much you move.
    const amp = this.rippleU = uniform(0);
    const mat = new THREE.MeshBasicNodeMaterial();
    const p = positionWorld.xz;
    const d = length(p);
    const wave = sin(d.mul(7).sub(time.mul(3.4))).mul(0.5).add(0.5);
    const fall = exp(d.mul(-0.36));
    const rings = smoothstep(0.2, 0.26, wave.mul(fall).mul(amp.mul(1.5).add(0.42)));
    const calmBand = sin(p.x.mul(0.6).add(p.y.mul(0.4)).add(time.mul(0.18))).mul(0.5).add(0.5);
    const base = mix(vec3(0.27, 0.68, 0.72), vec3(0.34, 0.76, 0.76), step(0.6, calmBand));
    mat.colorNode = mix(base, vec3(0.86, 0.97, 0.95), clamp(rings, 0, 1).mul(0.8));
    const water = new THREE.Mesh(geo.disc(16, 64), mat);
    water.position.y = -0.12;
    g.add(water);
    add(g, M(geo.ring(15.6, 20, 64), 0x8CCB6A, 0, -0.05, 0, { shadow: false }));
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * 6.283;
      add(g, M(geo.sphere(0.5, 8, 6), STONE, Math.cos(a) * 15.8, -0.05, Math.sin(a) * 15.8, { scale: [1, 0.5, 1] }));
      if (i % 2) add(g, M(geo.cyl(0.025, 0.025, 1.3, 6), LEAF, Math.cos(a + 0.1) * 14.8, 0.45, Math.sin(a + 0.1) * 14.8), M(geo.cap(0.07, 0.2, 6), WOOD_D, Math.cos(a + 0.1) * 14.8, 1.14, Math.sin(a + 0.1) * 14.8));
    }
    for (let i = 0; i < 12; i++) {
      const a = i * 2.4, r = 3 + (i % 5) * 2.2;
      add(g, M(geo.cyl(0.55, 0.55, 0.03, 18), i % 2 ? LEAF : LEAF2, Math.cos(a) * r, -0.09, Math.sin(a) * r));
      if (i % 3 === 0) add(g, M(geo.sphere(0.13, 8, 6), 0xF4B6C8, Math.cos(a) * r, -0.02, Math.sin(a) * r, { scale: [1, 0.7, 1] }));
    }
    for (const [x, z] of [[-11, -9], [9, -11], [13, -2], [-14, 2]]) { const t = tree(2.6, 1.4); t.position.set(x, 0, z); g.add(t); }
    const lane = this.lanes[0];
    add(g, M(geo.cyl(1.05, 1.1, 0.06, 28), LEAF2, lane.x, -0.04, 0));
    this.heron = new Heron();
    this.heron.root.position.set(-7, 0, -5.5);
    this.heron.root.rotation.y = 0.8;
    g.add(this.heron.root);
    this.buildCreatures();
  }
  buildCreatures() {
    const g = this.group;
    const lane = this.lanes[0];
    const dragon = this.dragon = G('', lane.x + 3, 2.2, 1.2);
    add(dragon, M(geo.cap(0.02, 0.2, 6), 0x2CB5A0, 0, 0, 0, { rot: [Math.PI / 2, 0, 0] }), M(geo.sphere(0.13, 8, 6), 0xBFE9F0, 0.1, 0.01, 0.02, { scale: [1, 0.05, 0.3] }), M(geo.sphere(0.13, 8, 6), 0xBFE9F0, -0.1, 0.01, 0.02, { scale: [1, 0.05, 0.3] }));
    const frog = this.frog = G('', lane.x + 4, -0.03, 2);
    add(frog, M(geo.sphere(0.13, 12, 10), 0x6DBB4F, 0, 0.1, 0, { scale: [1, 0.75, 1.1] }), M(geo.sphere(0.05, 8, 6), 0xFFFFFF, 0.06, 0.2, 0.08), M(geo.sphere(0.05, 8, 6), 0xFFFFFF, -0.06, 0.2, 0.08), M(geo.sphere(0.024, 6, 6), 0x1A1420, 0.06, 0.21, 0.12), M(geo.sphere(0.024, 6, 6), 0x1A1420, -0.06, 0.21, 0.12));
    this.koi = [];
    for (let i = 0; i < 3; i++) {
      const k = G();
      add(k, M(geo.sphere(0.24, 10, 8), i === 1 ? 0xFFF3DC : 0xF08A3C, 0, 0, 0, { scale: [0.5, 0.3, 1.2] }), M(geo.cone(0.1, 0.2, 6), i === 1 ? 0xD9483B : 0xFFF3DC, 0, 0, -0.32, { rot: [-Math.PI / 2, 0, 0], scale: [1, 1, 0.3] }));
      k.visible = false; k.position.y = -0.1;
      g.add(k); this.koi.push(k);
    }
    const turtle = this.turtle = G('', lane.x + 6, -0.05, -3);
    add(turtle, M(geo.sphere(0.3, 12, 8), 0x5F8F4F, 0, 0.06, 0, { scale: [1, 0.5, 1.2] }), M(geo.sphere(0.1, 8, 6), 0x8CCB6A, 0, 0.08, 0.38));
    add(g, dragon, frog, turtle);
    this.creaturePos = [dragon, frog, null, turtle];
  }
  cameraShot(snap) {
    this.game.rig.shot(0.8, 5.2, 8.4, 0, 0.5, -0.2, { snap, rate: 3 });
    this.inputYaw = Math.atan2(0.8, 8.6);
  }
  hudSetup(hud) {
    this.calmBar = hud.addWidget(hud.meter('Calm', '#6FD6B8'));
    hud.setScore(0, 'Time in zone');
  }
  start() { if (this.mode === 'solo') this.game.speech.say('stillwater', line('stillwater', 'pond_intro'), { auto: 3.4, top: true }); }
  fixedEvent(dt) {
    const c = this.cfg, lane = this.lanes[0], b = lane.bal;
    const k = this.t / c.time;
    b.sway = this.ramp(c.sway[0], c.sway[1], k); b.tremor = c.tremor;
    const r = Math.hypot(lane.dotX, lane.dotZ), inZone = r < c.zone;
    if (inZone) { this.inT += dt; this.calm = Math.min(1, this.calm + dt / 30); } else this.calm = Math.max(0, this.calm - dt / 8);
    this.peak = Math.max(this.peak, this.calm);
    // Ripples follow how much the dot moves.
    const speed = b.body.angvel();
    const move = Math.hypot(speed.x, speed.z);
    this.ripple += (Math.min(1, move * 1.6 + (inZone ? 0 : r * 0.8)) - this.ripple) * (1 - Math.exp(-3 * dt));
    if (this.rippleU) this.rippleU.value = this.ripple;
    // Creatures arrive at thresholds; moving too much scatters them.
    const target = THRESH.filter((x) => this.calm >= x).length;
    if (target > this.arrived) {
      this.arrived = target;
      if (this.mode === 'solo') this.game.speech.say('stillwater', this.game.line('stillwater', 'creature'), { auto: 2.8, top: true });
      this.game.audio.sfx('marble', { pitch: 1800 });
      if (this.arrived >= 5) { this.heron.rig.loop('tiptoe'); }
    } else if (target < this.arrived - 1) {
      this.arrived = target;
      this.scattered++;
      if (lane.kind === 'local') this.bark('stillwater', 'scatter', 2.2, 8);
      this.game.audio.sfx('splash', { big: 0.3 });
    }
    // Trudy whispers at the worst moments.
    this.whisperT = (this.whisperT ?? 14) - dt;
    if (this.whisperT <= 0) { this.whisperT = 15 + this.r() * 6; if (this.mode === 'solo') this.game.speech.say('trudy', line('trudy', 'whisper'), { auto: 2.6, top: true }); }
    // Sneezes: telegraphed; Flail stifles, or you take a big shove.
    for (const s of this.sneezes) {
      if (s.state === 'wait' && this.t >= s.at) {
        s.state = 'warn'; s.t = 1.2;
        this.warned = s;
        if (lane.kind === 'local') this.game.speech.say('stillwater', 'Ah... ah...', { auto: 1.1, top: true });
        this.game.hud.setNote('Ah... ah...', 1.2);
        this.game.input.rumble(0.1, 0.3, 300);
      } else if (s.state === 'warn') {
        s.t -= dt;
        if (s.stifled) { s.state = 'done'; this.warned = null; this.game.hud.setNote('Stifled.', 1); } else if (s.t <= 0) {
          s.state = 'done'; this.warned = null;
          const a = this.r() * 6.283;
          this.push = 0.3; this.pushX = Math.cos(a) * 2.2; this.pushZ = Math.sin(a) * 2.2;
          this.game.audio.sfx('sneeze');
          this.game.comic.pop('ACHOO!', lane.x, 1.9, 0);
          this.game.rig.shake(0.04);
        }
      }
    }
    if (this.push > 0) { this.push -= dt; b.extX += this.pushX * this.diff.dist; b.extZ += this.pushZ * this.diff.dist; }
  }
  /** Flail stifles a sneeze. Any other flail is just arms, on a very quiet pond. */
  flailed(lane) {
    if (this.warned) { this.warned.stifled = true; return; }
    this.calm = Math.max(0, this.calm - 0.1);
    if (lane.kind === 'local') this.bark('stillwater', 'flail', 2.2, 5);
  }
  botInput(lane, t, bot) {
    const out = lane.input;
    const [x, z] = bot.steer(0, 0);
    out.wishX = x; out.wishZ = z;
    out.breathe = bot.breathe(lane);
    out.flail = !!(this.warned && this.warned.t < 1.2 - bot.s.lag);
  }
  hud() {
    const hud = this.game.hud;
    hud.setTime(this.cfg.time - this.t);
    hud.setScore(`${Math.round((100 * this.inT) / Math.max(1, this.t))}%`, 'Time in zone');
    if (this.calmBar) this.calmBar.set(this.calm);
    const lane = this.lanes[0];
    lane.discView.zone = { x: 0, z: 0, r: this.cfg.zone, on: Math.hypot(lane.dotX, lane.dotZ) < this.cfg.zone };
  }
  frameEvent(dt) {
    const lane = this.lanes[0], d = lane.doll, b = lane.bal, g = this.game;
    d.setLean(0, 0, 0, 1);
    d.root.position.set(lane.x, 0, 0);
    d.root.rotation.set(b.leanZ * 0.32, 0, -b.leanX * 0.32);
    this.heron.update(dt);
    const T = this.t;
    const n = this.arrived;
    const lerp = (o, x, y, z, k = 2) => { o.position.x += (x - o.position.x) * Math.min(1, k * dt); o.position.y += (y - o.position.y) * Math.min(1, k * dt); o.position.z += (z - o.position.z) * Math.min(1, k * dt); };
    if (n >= 1) lerp(this.dragon, lane.x, 0.97 + Math.sin(T * 40) * 0.003, 0.25); else lerp(this.dragon, lane.x + 3 + Math.sin(T) * 0.7, 2.2 + Math.sin(T * 2.3) * 0.3, 1.2 + Math.cos(T * 1.2));
    if (n >= 2) lerp(this.frog, lane.x, 1.03, 0); else lerp(this.frog, lane.x + 4, -0.03, 2);
    for (let i = 0; i < 3; i++) {
      this.koi[i].visible = n >= 3;
      const a = T * 0.5 + (i * 6.28) / 3;
      this.koi[i].position.set(Math.cos(a) * 2.4, -0.1, Math.sin(a) * 2.4);
      this.koi[i].rotation.y = -a;
    }
    if (n >= 4) lerp(this.turtle, lane.x + 1.3, -0.04, -0.6, 0.5); else lerp(this.turtle, lane.x + 6, -0.05, -3, 0.5);
    if (n >= 5) {
      const hp = this.heron.root.position;
      const nearly = Math.hypot(hp.x - (lane.x - 1.2), hp.z - (-0.3)) < 0.25;
      if (!nearly) lerp(this.heron.root, lane.x - 1.2, 0, -0.3, 0.4);
      else if (!this.patted) { this.patted = true; this.heron.rig.loop('stand'); this.heron.rig.once('pat'); g.speech.say('stillwater', line('stillwater', 'pat'), { auto: 2.2, top: true }); }
    }
  }
  isDone() { return this.t >= this.cfg.time; }
  laneResult(lane) {
    const share = this.inT / Math.max(1, Math.min(this.t, this.cfg.time));
    const form = ((share + this.calm) / 2) * 100;
    return { form, raw: form, big: Math.round(form), stats: `${Math.round(share * 100)}% in the zone · peak calm ${Math.round(this.peak * 100)}% · ${this.scattered} scattered` };
  }
}
export { Gull, h, float, smoothstep };
