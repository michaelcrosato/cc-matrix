import * as THREE from 'three/webgpu';
import { EventBase, RAPIER } from './base.js';
import { groups } from '../physics/world.js';
import { M, G, geo, toon, add, basic } from '../art/materials.js';
import { planks, post, crate, barge, buoy, palm, WOOD, WOOD_D, TEAL, CREAM, ORANGE, RED } from '../art/props.js';
import { tun } from '../core/tuning.js';
import { cos } from '../core/rng.js';
import { h } from '../ui/dom.js';

const FRUIT = [
  { col: 0xF08A3C, name: 'orange' }, { col: 0xD9483B, name: 'apple' }, { col: 0xF5D547, name: 'lemon' }, { col: 0x86C24A, name: 'lime' },
];
const _v = new THREE.Vector3(), _q = new THREE.Quaternion();

export class FruitHat extends EventBase {
  static id = 'fruitHat';
  constructor(spec) {
    super(spec);
    this.iterations = 10;
    this.balanceParams = { margin: this.cfg.margin, ankleMax: this.cfg.ankleMax };
    this.items = []; this.nextFruit = 1; this.tosses = [];
    this.seaLevel = -1.6;
    this.greedy = spec.greedy || null;
  }
  setupLane(lane) {
    const b = lane.bal.body, w = this.world, g = groups.doll(lane.id);
    w.createCollider(RAPIER.ColliderDesc.cylinder(0.02, 0.36).setTranslation(0, 0.75, 0).setMass(0.01).setFriction(0.9).setCollisionGroups(g), b);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const q = { x: 0, y: Math.sin(-a / 2), z: 0, w: Math.cos(-a / 2) };
      w.createCollider(RAPIER.ColliderDesc.cuboid(0.02, 0.1, 0.16).setTranslation(Math.cos(a) * 0.36, 0.85, Math.sin(a) * 0.36).setRotation(q).setMass(0.001).setFriction(0.9).setCollisionGroups(g), b);
    }
    lane.hat = []; lane.bankT = 0; lane.banked = 0; lane.bankCount = 0; lane.bigBank = 0; lane.pile = 0;
    lane.crateX = lane.x + 0.85; lane.crateZ = 0.45;
    // The basket hat: a woven look from layered rings, on the doll's root so it leans with her.
    const basket = G('basket', 0, 1.5, 0);
    add(basket, M(geo.cyl(0.36, 0.3, 0.045, 26), 0xC99A62, 0, 0, 0), M(geo.cyl(0.37, 0.355, 0.17, 26), 0xD9AD72, 0, 0.085, 0), M(geo.cyl(0.32, 0.32, 0.01, 22), 0x8A5A32, 0, 0.022, 0));
    for (let i = 0; i < 3; i++) add(basket, M(geo.tor(0.37, 0.024, Math.PI * 2, 36), i % 2 ? 0xB98347 : 0xE8C48A, 0, 0.03 + i * 0.075, 0, { rot: [Math.PI / 2, 0, 0], shadow: false }));
    add(basket, M(geo.cyl(0.2, 0.2, 0.04, 16), 0xE8B88A, 0, -0.03, 0));
    lane.doll.root.add(basket);
    lane.doll.joints.shoulderL.rotation.z = 0.2;
    lane.doll.rig.loop('holdSlab');
    const c = crate(0.72);
    c.position.set(lane.crateX, this.floorY, lane.crateZ);
    this.group.add(c);
    lane.pileGroup = G('pile', lane.crateX, 0.5, lane.crateZ);
    this.group.add(lane.pileGroup);
  }
  buildSet() {
    const n = this.lanes.length, w = Math.max(9, n * 3.2 + 5);
    const deck = planks(w, 6, { top: 0, thick: 0.2 });
    this.group.add(deck);
    for (let i = 0; i <= 3; i++) {
      add(this.group, post(4, 0.16, WOOD_D, -w / 2 + (i / 3) * w, -3.9, 2.8), post(4, 0.16, WOOD_D, -w / 2 + (i / 3) * w, -3.9, -2.8));
    }
    this.barge = barge();
    this.barge.position.set(-7, this.seaLevel + 0.2, -13);
    this.barge.rotation.y = 0.3;
    this.group.add(this.barge);
    for (const [x, z] of [[-12, -4], [11, -6], [8, -18]]) { const b = buoy(x > 0 ? RED : TEAL); b.position.set(x, this.seaLevel, z); this.group.add(b); }
    const p = palm(3.4); p.position.set(w / 2 - 0.9, 0, -2.2); this.group.add(p);
    this.addTrudy(this.lanes[0].x - 1.9, 0, 0.7, 0.75);
    this.addWatchers([[w / 2 - 1.6, 0, -2.1, -0.6], [w / 2 - 2.8, 0, -2.5, -0.3], [-w / 2 + 1.3, 0, -2.4, 0.5]]);
    this.ringGeo = geo.ring(0.11, 0.17, 24);
    this.ringMat = basic(0x1A1420, { transparent: true, opacity: 0.55 });
    this.cameraShot(true);
    this.game.setBackdrop(-55, -130);
  }
  cameraShot(snap) {
    const n = this.lanes.length;
    const d = this.game.rig.fitDistance(8.4, (n - 1) * 3.2);
    this.game.rig.shot(0, 1.7, d, 0, 1.25, -0.3, { snap, rate: 4 });
  }
  hudSetup(hud) {
    if (this.lanes.length === 1) {
      this.hatTag = hud.addWidget(h('div.tag', { style: 'font-size:3.6rem' }, ''));
    }
    hud.setScore(0, 'Banked');
  }
  start() {
    this.nextFruit = 0.8;
    this.bark('trudy', 'fruit_start', 3.2, 0);
  }
  launch(lane, kind) {
    const c = this.cfg;
    const radius = c.radius * tun.landingRadius;
    const a = this.r() * Math.PI * 2, r = Math.sqrt(this.r()) * radius;
    const sx = lane.x + Math.cos(a) * r, sz = Math.sin(a) * r;
    const ox = lane.x - 5, oy = 0.6, oz = -5;
    const T = 1.5, g = tun.gravity;
    const props = {
      fruit: { mass: c.mass * tun.fruitMass, value: 1, rad: 0.075 },
      boot: { mass: c.mass * 1.7 * tun.fruitMass, value: 1, rad: 0.085 },
      pineapple: { mass: c.mass * 2.6 * tun.fruitMass, value: 5, rad: 0.1 },
      urchin: { mass: c.mass, value: 0, rad: 0.08 },
    }[kind];
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(ox, oy, oz).setLinvel((sx - ox) / T, (1.75 - oy) / T + 0.5 * g * T, (sz - oz) / T)
      .setCcdEnabled(true).setCanSleep(false).setAngularDamping(0.4));
    this.world.createCollider(RAPIER.ColliderDesc.ball(props.rad).setMass(props.mass).setFriction(0.8).setRestitution(0.1).setCollisionGroups(groups.prop(lane.id)), body);
    const mesh = this.makeFruitMesh(kind);
    this.group.add(mesh);
    const ring = new THREE.Mesh(this.ringGeo, this.ringMat);
    ring.position.set(sx, 0.015, sz); ring.scale.setScalar(2.2);
    this.group.add(ring);
    const it = { body, mesh, ring, kind, value: props.value, mass: props.mass, state: 'fly', t: 0, T, sx, sz, lane, rad: props.rad };
    this.items.push(it);
    return it;
  }
  makeFruitMesh(kind) {
    if (kind === 'urchin') {
      const g = G();
      g.add(M(geo.sphere(0.08, 10, 8), 0x3B2A4F));
      for (let i = 0; i < 14; i++) {
        const ph = Math.acos(1 - 2 * (i + 0.5) / 14), th = i * 2.4;
        const s = M(geo.cone(0.018, 0.11, 5), 0x1A1420, Math.sin(ph) * Math.cos(th) * 0.09, Math.cos(ph) * 0.09, Math.sin(ph) * Math.sin(th) * 0.09, { shadow: false });
        s.lookAt(s.position.clone().multiplyScalar(2)); s.rotateX(Math.PI / 2);
        g.add(s);
      }
      return g;
    }
    if (kind === 'boot') {
      const g = G();
      add(g, M(geo.cap(0.05, 0.09, 8), 0x6B4A2E, 0, 0.02, 0), M(geo.sphere(0.065, 8, 6), 0x6B4A2E, 0.04, -0.05, 0, { scale: [1.5, 0.7, 1] }));
      return g;
    }
    if (kind === 'pineapple') {
      const g = G();
      add(g, M(geo.sphere(0.1, 10, 8), 0xF5C518, 0, 0, 0, { scale: [1, 1.2, 1] }));
      for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.28; add(g, M(geo.cone(0.03, 0.12, 5), 0x4F9F5A, Math.cos(a) * 0.02, 0.15, Math.sin(a) * 0.02, { rot: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5] })); }
      return g;
    }
    const f = FRUIT[Math.floor(cos(0, FRUIT.length))];
    return M(geo.sphere(0.075, 12, 10), f.col);
  }
  pickKind() {
    const roll = this.r();
    if (this.t > 22 && roll < 0.06) return 'pineapple';
    if (this.t > 12 && roll < 0.14) return 'urchin';
    if (this.t > 8 && roll < 0.22) return 'boot';
    return 'fruit';
  }
  removeItem(it) {
    const i = this.items.indexOf(it);
    if (i >= 0) this.items.splice(i, 1);
    if (it.body) { this.world.removeRigidBody(it.body); it.body = null; }
    this.group.remove(it.mesh);
    if (it.ring) { this.group.remove(it.ring); it.ring = null; }
    if (it.state === 'hat') { const k = it.lane.hat.indexOf(it); if (k >= 0) it.lane.hat.splice(k, 1); }
  }
  /** Hop: everything in the hat goes in the crate. Bigger banks pay more. */
  bank(lane) {
    const n = lane.hat.length;
    if (!n || lane.bankT > 0) return;
    let value = 0;
    for (const it of lane.hat.slice()) {
      value += it.value;
      const t = it.body.translation();
      const m = it.mesh;
      const start = { x: t.x, y: t.y, z: t.z };
      this.removeItem(it);
      this.group.add(m);
      m.position.set(start.x, start.y, start.z);
      this.tosses.push({ m, a: start, t: 0, dur: 0.5 + cos(0, 0.3), lane });
    }
    const mult = 1 + 0.1 * (n - 1);
    const gain = value * mult;
    lane.raw += gain; lane.banked += n; lane.bankCount++;
    lane.bigBank = Math.max(lane.bigBank, n);
    lane.bankT = 1;
    lane.doll.rig.once('hop');
    this.game.audio.sfx('whoosh');
    this.game.audio.sfx('catch');
    if (lane.kind === 'local') this.game.hud.setNote(`Banked ${n} × ${mult.toFixed(1)}`, 1.4);
    this.bark('trudy', 'fruit_bank', 1.8, 9);
  }
  fixedEvent(dt) {
    const c = this.cfg;
    this.nextFruit -= dt;
    if (this.nextFruit <= 0 && this.t < c.time - 1.5) {
      this.nextFruit += c.every * tun.fruitInterval;
      const kind = this.pickKind();
      for (const lane of this.lanes) if (lane.kind !== 'ghost') this.launch(lane, kind);
      this.game.audio.sfx('thud', { pitch: 110 });
    }
    for (const lane of this.lanes) {
      if (lane.kind === 'ghost') continue;
      lane.bankT = Math.max(0, lane.bankT - dt);
      if (lane.input.hopPressed && !lane.fallen) this.bank(lane);
      if (lane.hit > 0) {
        lane.hit -= dt;
        lane.bal.extX += lane.hitX * this.diff.dist; lane.bal.extZ += lane.hitZ * this.diff.dist;
      }
    }
  }
  afterStep(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (!it.body) continue;
      it.t += dt;
      const lane = it.lane;
      const p = it.body.translation();
      if (it.ring && it.t >= it.T) { this.group.remove(it.ring); it.ring = null; }
      else if (it.ring) { it.ring.scale.setScalar(1 + (1 - it.t / it.T) * 1.8); }
      if (it.state === 'fly' || it.state === 'hat') {
        const inside = !lane.fallen && this.inBasket(lane, p);
        if (it.state === 'fly' && inside) this.catchItem(it, lane);
        else if (it.state === 'hat' && !inside) {
          it.state = 'spill';
          const k = lane.hat.indexOf(it); if (k >= 0) lane.hat.splice(k, 1);
        }
      }
      if (p.y < it.rad + 0.04 && it.state !== 'gone') {
        if (it.state !== 'landed') { it.state = 'landed'; it.gone = it.t + 1.1; this.game.audio.sfx('thud', { pitch: 240 }); this.game.fx && this.game.fx.burst(p.x, 0.05, p.z, 4, { colour: 0xE8D3A0, size: 0.04, up: 1.4, speed: 1.2, life: 0.35 }); }
      }
      if (it.gone && it.t > it.gone) this.removeItem(it);
      if (p.y < -6) this.removeItem(it);
    }
  }
  inBasket(lane, p) {
    const b = lane.bal.body;
    const q = b.rotation(), t = b.translation();
    _q.set(q.x, q.y, q.z, q.w).invert();
    _v.set(p.x - t.x, p.y - t.y, p.z - t.z).applyQuaternion(_q);
    return Math.hypot(_v.x, _v.z) < 0.4 && _v.y > 0.7 && _v.y < 1.25;
  }
  catchItem(it, lane) {
    if (it.kind === 'urchin') {
      // Urchins knock the basket and cost points.
      lane.raw = Math.max(0, lane.raw - 2);
      const a = this.r() * 6.28;
      lane.hit = 0.25; lane.hitX = Math.cos(a) * 0.8; lane.hitZ = Math.sin(a) * 0.8;
      this.game.audio.sfx('spike');
      it.body.applyImpulse({ x: Math.cos(a) * 0.02, y: 0.025, z: Math.sin(a) * 0.02 }, true);
      it.state = 'spill';
      it.gone = it.t + 0.9;
      if (lane.kind === 'local') { this.game.comic.pop('OW!', lane.x, 2.4, 0); this.bark('trudy', 'fruit_urchin', 1.8, 4); this.game.input.rumble(0.6, 0.6, 180); }
      return;
    }
    it.state = 'hat';
    lane.hat.push(it);
    this.game.audio.sfx('catch');
    if (lane.kind === 'local') {
      this.game.input.rumble(0.05, 0.3, 60);
      this.game.hitStop(0.012);
      if (it.kind === 'boot') this.bark('trudy', 'fruit_boot', 1.8, 8);
      if (it.kind === 'pineapple') this.bark('trudy', 'fruit_gold', 2.2, 2);
      if (lane.hat.length >= 8) this.bark('trudy', 'fruit_greedy', 2, 8);
    }
  }
  onFlail(lane) {
    // Flail shakes off whatever is on top.
    const top = lane.hat[lane.hat.length - 1];
    if (top) {
      const a = this.r() * 6.28;
      top.body.applyImpulse({ x: Math.cos(a) * 0.012, y: 0.02, z: Math.sin(a) * 0.012 }, true);
    }
  }
  onFall(lane) {
    // A fall spills everything unbanked: the basket is gone and the fruit keeps falling.
    if (lane.hat.length >= 3 && lane.kind === 'local') { this.game.speech.say('trudy', this.lineSpill(), { auto: 2.6, top: true }); if (this.trudyArt) this.trudyArt.rig.once('faint', { hold: 0.6 }); }
    for (const it of lane.hat) it.state = 'spill';
    lane.hat = [];
  }
  lineSpill() { return this._line('trudy', 'fruit_spill'); }
  _line(w, s) { return this.game.line(w, s); }
  botInput(lane, t, bot) {
    const out = lane.input;
    const bankAt = lane.bankAt ?? ({ sharp: 7, average: 6, clumsy: 5 }[bot.skillName] ?? 6) - (this.cfg.every <= 1 ? 1 : 0);
    // Lean only for a fruit in its last 0.95 s of flight: chasing every fruit makes you whip and fall.
    let best = null;
    for (const it of this.items) {
      if (it.lane !== lane || it.state !== 'fly' || it.kind === 'urchin') continue;
      const left = it.T - it.t + bot.s.lag * 0.4;
      if (left < 1.05 && left > -0.12 && (!best || left < best.left)) best = { it, left };
    }
    let gx = 0, gz = 0;
    // Lean away from an urchin about to land in the hat.
    for (const it of this.items) {
      if (it.lane === lane && it.state === 'fly' && it.kind === 'urchin' && it.T - it.t < 0.7 && it.T - it.t > 0) {
        const ax = it.sx - lane.x, az = it.sz, m = Math.hypot(ax, az) || 1;
        gx = -(ax / m) * 0.8; gz = -(az / m) * 0.8;
      }
    }
    if (best) {
      const ml = lane.bal.maxLean;
      const reach = 1.5 * Math.sin(ml);
      gx = (best.it.sx - lane.x) / reach; gz = best.it.sz / reach;
      const m = Math.hypot(gx, gz);
      if (m > 1) { gx /= m; gz /= m; }
    }
    const [x, z] = bot.aim(gx, gz);
    out.wishX = x; out.wishZ = z;
    let load = 0;
    for (const it of lane.hat) load += it.mass / (this.cfg.mass * tun.fruitMass);
    out.hopPressed = bankAt < 99 && load >= bankAt && lane.bankT <= 0 && lane.bal.lean < 0.5;
    out.hop = out.hopPressed;
    out.flail = !lane.fallen && lane.bal.lean > 0.42 + bot.s.lag * 0.3 && lane.bal.flailCool <= 0;
    out.footL = 0; out.footR = 0; out.breathe = false;
    return null;
  }
  hud(dt) {
    const hud = this.game.hud;
    hud.setTime(this.cfg.time - this.t);
    const me = this.lanes.find((l) => l.kind === 'local') || this.lanes[0];
    hud.setScore(Math.round(me.raw), 'Banked');
    if (this.hatTag) {
      const n = me.hat.length;
      const s = n ? `In hat: ${n}  ×${(1 + 0.1 * (n - 1)).toFixed(1)}` : 'Hat empty';
      if (this.hatTag.textContent !== s) this.hatTag.textContent = s;
    }
  }
  frameEvent(dt) {
    for (const it of this.items) {
      if (!it.body) continue;
      const p = it.body.translation(), q = it.body.rotation();
      it.mesh.position.set(p.x, p.y, p.z);
      it.mesh.quaternion.set(q.x, q.y, q.z, q.w);
    }
    for (let i = this.tosses.length - 1; i >= 0; i--) {
      const s = this.tosses[i];
      s.t += dt;
      const k = Math.min(1, s.t / s.dur);
      const lane = s.lane;
      s.m.position.set(s.a.x + (lane.crateX - s.a.x) * k, s.a.y + (0.55 - s.a.y) * k + Math.sin(k * Math.PI) * 1.1, s.a.z + (lane.crateZ - s.a.z) * k);
      if (k >= 1) {
        this.tosses.splice(i, 1);
        this.group.remove(s.m);
        lane.pile++;
        if (lane.pile < 26) {
          lane.pileGroup.add(s.m);
          const a = lane.pile * 2.4, r = 0.28 * Math.sqrt(lane.pile / 14);
          s.m.position.set(Math.cos(a) * r, 0.02 * lane.pile * 0.5, Math.sin(a) * r);
        }
        this.game.audio.sfx('thud', { pitch: 300 });
      }
    }
    if (this.barge) this.barge.rotation.z = Math.sin(this.t * 0.8) * 0.018;
  }
  isDone() { return this.t >= this.cfg.time; }
  laneResult(lane) {
    let unbanked = 0;
    for (const it of lane.hat) unbanked += it.value;
    const raw = lane.raw + (unbanked * (1 + 0.1 * (lane.hat.length - 1))) * 0.5;
    const form = (100 * raw) / this.cfg.par;
    return { form, raw, big: Math.round(raw), stats: `${lane.banked} banked · best hat ${lane.bigBank} · ${lane.falls} floor exercises` };
  }
}
