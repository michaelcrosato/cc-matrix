import * as THREE from 'three/webgpu';
import { EventBase, RAPIER } from './base.js';
import { groups } from '../physics/world.js';
import { M, G, geo, add, toon } from '../art/materials.js';
import { post, CREAM, RED, TEAL, ORANGE, bunting, tree } from '../art/props.js';
import { Walrus } from '../art/cast.js';
import { tun } from '../core/tuning.js';
import { cos } from '../core/rng.js';
import { h } from '../ui/dom.js';
import { line } from '../data/dialogue.js';

const BANDS = { L: { lo: 3.5, hi: 5, r: 0.46, colour: 0x2CB5A0, name: 'Large' }, M: { lo: 6.5, hi: 8, r: 0.36, colour: 0xF08A3C, name: 'Medium' }, S: { lo: 9.5, hi: 11, r: 0.27, colour: 0xE8443A, name: 'Small' } };
const arcs = [];
function arcGeo(k) {
  const i = Math.round(k * 20);
  if (!arcs[i]) { arcs[i] = new THREE.RingGeometry(0.5, 0.62, 28, 1, Math.PI / 2, Math.max(0.001, (i / 20) * Math.PI * 2)); }
  return arcs[i];
}
/** Circle your weight to drive the hoop. Each plate needs its own speed. Everything else is decaying. */
export class Plates extends EventBase {
  static id = 'plates';
  constructor(spec) {
    super(spec);
    this.god = true; this.seaLevel = -5;
    this.shards = [];
    this.spec = this.cfg.plates.split('');
  }
  setupLane(lane) {
    lane.hoop = 0; lane.omega = 0; lane.omegaSm = 0; lane.prevAng = null; lane.phase = 0; lane.alive = 0; lane.aliveMax = 0; lane.crashes = 0; lane.keyTime = 0; lane.lastTap = -9; lane.lastKey = null; lane.keyRate = 0;
    lane.plates = this.spec.map((size, i) => {
      const a = Math.PI * 1.08 + ((i + 0.5) / this.spec.length) * Math.PI * 0.84, R = this.spec.length > 4 ? 1.75 : 1.55;
      const px = lane.x + Math.cos(a) * R, pz = Math.sin(a) * R;
      const b = BANDS[size];
      const g = G('', px, 0, pz);
      add(g, post(1.75, 0.025, CREAM, 0, 0, 0));
      const disc = G('', 0, 1.8, 0);
      add(disc, M(geo.cyl(b.r, b.r * 0.72, 0.045, 24), b.colour), M(geo.tor(b.r * 0.66, 0.012), CREAM, 0, 0.03, 0, { rot: [Math.PI / 2, 0, 0], shadow: false }));
      g.add(disc);
      const gauge = new THREE.Mesh(arcGeo(1), toon(b.colour));
      gauge.scale.setScalar(b.r * 1.5);
      gauge.position.y = 2.4;
      g.add(gauge);
      this.group.add(g);
      return { size, band: b, energy: 0.7, state: 'on', back: 0, group: g, disc, gauge, spin: 0, wobble: 0, was: 0.7 };
    });
    const hoop = lane.hoopMesh = M(geo.tor(0.62, 0.03), RED, 0, 0.72, 0, { rot: [Math.PI / 2, 0, 0] });
    lane.doll.root.add(hoop);
    const ringCol = lane.bandRing = M(geo.ring(0.8, 0.98, 36), 0xFFFFFF, lane.x, 0.03, 0, { shadow: false });
    this.group.add(ringCol);
    lane.doll.rig.scrub('hipCircle', 0, { fade: 0 });
  }
  buildSet() {
    const g = this.group, n = this.lanes.length, w = Math.max(14, n * 3.8 + 8);
    add(g, M(geo.cyl(w * 0.62, w * 0.65, 1, 40), 0xF2E3B5, 0, -0.5, -1), M(geo.ring(w * 0.58, w * 0.62, 40), RED, 0, 0.012, -1, { shadow: false }), M(geo.box(w * 4, 1, 80), 0x8CCB6A, 0, -1, -10));
    for (const [x, z] of [[-w * 0.6, -7], [w * 0.55, -8], [0, -12], [w * 0.8, -3], [-w * 0.8, -2]]) { const t = tree(2.6, 1.4); t.position.set(x, -0.5, z); g.add(t); }
    add(g, post(5, 0.1, CREAM, -w * 0.5, 0, -5), post(5, 0.1, CREAM, w * 0.5, 0, -5));
    g.add(bunting(-w * 0.5, 4.9, -5, w * 0.5, 4.9, -5, 18));
    this.walrus = new Walrus();
    this.walrus.root.position.set(-w * 0.34 - 0.5, 0, -2.4);
    this.walrus.root.rotation.y = 0.6;
    this.walrus.rig.loop('bounce');
    g.add(this.walrus.root);
    this.game.setBackdrop(45, -130);
  }
  cameraShot(snap) {
    const n = this.lanes.length, d = this.game.rig.fitDistance(8.6, (n - 1) * 3.8 + 2);
    this.game.rig.shot(0, 5.4, d, 0, 1.1, -0.2, { snap, rate: 4 });
  }
  hudSetup(hud) {
    hud.setScore(0, 'Plates up');
    this.bandTag = hud.addWidget(h('div.tag', { style: 'font-size:3.6rem' }, 'Hoop: still'));
  }
  start() { if (this.mode === 'solo') this.game.speech.say('bolster', line('bolster', 'plates_intro'), { auto: 3, top: true }); }
  bandOf(w) { for (const k of Object.keys(BANDS)) { const b = BANDS[k]; if (w >= b.lo && w <= b.hi) return k; } return null; }
  fixedEvent(dt) {
    const decay = this.cfg.decay * tun.plateDecay, gain = 0.45 * tun.plateGain;
    for (const lane of this.lanes) {
      if (lane.kind === 'ghost') continue;
      this.drive(lane, dt);
      const w = lane.hoop;
      if (lane.kind === 'local' && w > 1) {
        lane.humT = (lane.humT || 0) - dt;
        if (lane.humT <= 0) { lane.humT = 0.11; this.game.audio.sfx('plateHum', { pitch: 150 + w * 34 }); }
      }
      lane.phase += w * dt;
      for (const p of lane.plates) {
        lane.aliveMax += dt;
        if (p.state === 'on') {
          lane.alive += dt;
          const inBand = w >= p.band.lo && w <= p.band.hi;
          p.energy += (inBand ? gain - decay : -decay) * dt;
          p.energy = Math.min(1, p.energy);
          if (p.energy <= 0) this.crash(lane, p);
          else if (p.was < 0.25 && p.energy >= 0.35 && lane.kind === 'local') { this.bark('bolster', 'plate_save', 2, 8); p.was = p.energy; }
          if (p.energy < p.was || p.energy > p.was + 0.1) p.was = p.energy;
          p.spin += (2 + p.energy * 14) * dt;
          p.wobble = Math.max(0, 0.45 - p.energy) * 1.8;
        } else {
          p.back -= dt;
          if (p.back <= 0) { p.state = 'on'; p.energy = 0.5; p.disc.visible = true; p.gauge.visible = true; p.was = 0.5; this.game.audio.sfx('boing'); }
        }
      }
    }
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      s.t += dt;
      if (s.t > 2.6) { this.world.removeRigidBody(s.body); this.group.remove(s.mesh); this.shards.splice(i, 1); }
    }
  }
  drive(lane, dt) {
    const i = lane.input;
    let target = 0;
    if (i.device === 'kbm' && (i.keysActive || lane.keyTime > 0) && lane.kind === 'local' && !this.game.input.pointerActive) {
      // Keys: alternate A and D. Each press is half a turn, so your tapping speed sets the hoop.
      const tap = i.tapA ? 'a' : i.tapD ? 'd' : null;
      if (tap && tap !== lane.lastKey) {
        const gap = this.t - lane.lastTap;
        if (gap < 1.2) lane.keyRate = 1 / gap;
        lane.lastTap = this.t; lane.lastKey = tap; lane.keyTime = 1;
      }
      const since = this.t - lane.lastTap;
      if (since > 0.9) { lane.keyRate *= Math.exp(-3 * dt); lane.keyTime = 0; }
      // Your tapping speed sets the hoop. A half turn you have not finished cannot be going faster than this, so slowing down reads at once.
      const rate = since > 0 ? Math.min(lane.keyRate, 1 / since) : lane.keyRate;
      lane.omegaSm += (rate * Math.PI - lane.omegaSm) * (1 - Math.exp(-dt / 0.12));
      target = lane.omegaSm;
      lane.prevAng = null;
    } else {
      // Stick or mouse: angular velocity of the weight vector when it is out past .5.
      const m = Math.hypot(i.wishX, i.wishZ);
      if (m > 0.5) {
        const a = Math.atan2(i.wishZ, i.wishX);
        if (lane.prevAng !== null) {
          let d = a - lane.prevAng;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          const inst = Math.abs(d) / dt;
          lane.omegaSm += (inst - lane.omegaSm) * (1 - Math.exp(-dt / 0.12));
        }
        lane.prevAng = a;
      } else { lane.prevAng = null; lane.omegaSm *= Math.exp(-3 * dt); }
      target = lane.omegaSm;
    }
    // The hoop has inertia, so changing speed takes time.
    lane.hoop += (target - lane.hoop) * (1 - Math.exp(-dt / 0.5));
  }
  crash(lane, p) {
    p.state = 'off'; p.back = 6; p.disc.visible = false; p.gauge.visible = false;
    lane.crashes++;
    const pos = p.group.position;
    this.game.audio.sfx('plateCrash');
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * 6.283;
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x + Math.cos(a) * 0.12, 1.75, pos.z + Math.sin(a) * 0.12).setLinvel(Math.cos(a) * 1.5, 1, Math.sin(a) * 1.5).setAngvel({ x: cos(-6, 6), y: cos(-6, 6), z: cos(-6, 6) }).setCanSleep(false));
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(0.09, 0.02, 0.09).setMass(0.01).setFriction(0.6).setRestitution(0.3).setCollisionGroups(groups.prop(lane.id)), body);
      const mesh = M(geo.box(0.18, 0.04, 0.18), p.band.colour);
      this.group.add(mesh);
      this.shards.push({ body, mesh, t: 0 });
    }
    this.game.comic.pop('SMASH!', pos.x, 2.6, pos.z, { size: 1.8 });
    if (lane.kind === 'local') { this.bark('bolster', 'plate_fall', 2, 5); this.game.input.rumble(0.5, 0.4, 150); }
  }
  botInput(lane, t, bot) {
    const out = lane.input;
    // Pick the band of the lowest plate; rotate at the band's middle, with reaction time and speed error.
    let low = null;
    for (const p of lane.plates) if (p.state === 'on' && (!low || p.energy < low.energy)) low = p;
    const d = bot.data;
    d.react = (d.react || 0) - 1 / 120;
    if (d.react <= 0) {
      d.react = bot.s.lag + 0.25;
      // Stay on a plate until it is healthy, unless another is nearly gone.
      const cur = d.plate && d.plate.state === 'on' ? d.plate : null;
      const keep = cur && cur.energy < 0.92 && !(low && low !== cur && low.energy < 0.22 && cur.energy > 0.35);
      if (!keep) d.plate = low;
      const b = d.plate ? d.plate.band : BANDS.M;
      if (d.band !== b) { d.band = b; d.err = (bot.r() - 0.5) * 2 * bot.s.speedErr * 0.6; }
      d.want = (b.lo + b.hi) / 2 + (d.err || 0);
    }
    // A hand on a stick: the rate wanders, and now and then the circle slips inward.
    const wander = { sharp: 0.02, average: 0.08, clumsy: 0.13 }[bot.skillName] ?? 0.08;
    d.ang = (d.ang || 0) + (d.want || 0) * (1 + Math.sin(bot.t * 1.3 + bot.ph) * wander) * (1 / 120);
    const slipEvery = { sharp: 30, average: 7, clumsy: 3.6 }[bot.skillName] ?? 7;
    d.slip = (d.slip || 0) - 1 / 120;
    if (d.slip <= -slipEvery * (0.6 + bot.r() * 0.8)) d.slip = 0.25 + bot.r() * 0.35;
    const rad = d.slip > 0 ? 0.3 : 0.9;
    out.wishX = Math.cos(d.ang) * rad; out.wishZ = Math.sin(d.ang) * rad;
  }
  hud() {
    const me = this.lanes.find((l) => l.kind === 'local') || this.lanes[0];
    const hud = this.game.hud;
    hud.setTime(this.cfg.time - this.t);
    hud.setScore(me.plates.filter((p) => p.state === 'on').length, 'Plates up');
    const k = this.bandOf(me.hoop);
    const s = k ? `Hoop: ${BANDS[k].name}` : me.hoop < 1 ? 'Hoop: still' : 'Hoop: between';
    if (this.bandTag && this.bandTag.textContent !== s) this.bandTag.textContent = s;
  }
  frameEvent(dt) {
    for (const lane of this.lanes) {
      if (!lane.plates) continue;
      for (const p of lane.plates) {
        if (p.state !== 'on') continue;
        p.disc.rotation.y = p.spin;
        const w = p.wobble;
        p.disc.rotation.x = Math.sin(p.spin * 0.6) * w; p.disc.rotation.z = Math.cos(p.spin * 0.6) * w;
        p.gauge.geometry = arcGeo(Math.max(0, Math.min(1, p.energy)));
        p.gauge.rotation.y = 0;
        p.gauge.lookAt(this.game.camera.position);
        p.disc.position.x = Math.sin(p.spin * 0.6) * w * 0.15;
      }
      const k = this.bandOf(lane.hoop);
      lane.bandRing.material = toon(k ? BANDS[k].colour : 0xE9D7A8);
      lane.hoopMesh.material = toon(k ? BANDS[k].colour : RED);
      lane.doll.rig.scrub('hipCircle', ((lane.phase / (Math.PI * 2)) % 1 + 1) % 1, { fade: 0.1 });
      lane.hoopMesh.position.x = Math.cos(lane.phase) * 0.14; lane.hoopMesh.position.z = Math.sin(lane.phase) * 0.14;
    }
    for (const s of this.shards) { const p = s.body.translation(), q = s.body.rotation(); s.mesh.position.set(p.x, p.y, p.z); s.mesh.quaternion.set(q.x, q.y, q.z, q.w); }
    if (this.walrus) this.walrus.update(dt);
  }
  isDone() { return this.t >= this.cfg.time; }
  laneResult(lane) {
    const share = lane.aliveMax ? lane.alive / lane.aliveMax : 0;
    const form = Math.max(0, 200 * share - 100);
    return { form, raw: share, big: Math.round(form), stats: `${Math.round(share * 100)}% of plate-time up · ${lane.crashes} smashed` };
  }
}
export { TEAL, ORANGE };
