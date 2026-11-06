import * as THREE from 'three/webgpu';
import { EventBase, RAPIER } from './base.js';
import { groups } from '../physics/world.js';
import { M, G, geo, add } from '../art/materials.js';
import { planks, post, buoy, bunting, pavilionRoof, WOOD_D, CREAM, TEAL, RED, ORANGE, palm } from '../art/props.js';
import { Gull } from '../art/cast.js';
import { tun } from '../core/tuning.js';
import { cos } from '../core/rng.js';
import { h } from '../ui/dom.js';
import { line } from '../data/dialogue.js';

const STEP_LEN = 0.55, CADENCE = 0.42;
// How fast the foot takes up a side step. Slower hides the jolt that throws glasses when you are leaning, and the event's lesson with it.
const SIDE_RATE = 70;
// Where the five glasses stand on the tray, set against the plan's glass counts. Too tight a cluster never spills.
const SPOTS = [[0, 0], [0.224, 0.196], [-0.224, 0.196], [0.224, -0.196], [-0.224, -0.196]];
const _q = new THREE.Quaternion(), _v = new THREE.Vector3();

/** Carry five tumblers along a boardwalk. Small early leans keep the glasses; sudden big ones throw them. */
export class RoomService extends EventBase {
  static id = 'roomService';
  constructor(spec) {
    super(spec);
    this.iterations = 10;
    this.balanceParams = { margin: 0.8, ankleMax: 6, reflex: 5 };
    this.seaLevel = -1.6; this.endDist = this.cfg.length;
    this.gustNext = 4; this.gust = null; this.leaderDone = false; this.clock = null; this.wobblePhase = 0;
    this.gary = null; this.garyT = 14;
  }
  setupLane(lane) {
    const b = lane.bal.body;
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(0.3, 0.02, 0.3).setTranslation(0, 0.5, -0.3).setMass(0.04).setFriction(1).setCollisionGroups(groups.doll(lane.id)), b);
    lane.dist = 0; lane.targetSpeed = 0; lane.speed = 0; lane.lastFoot = null; lane.lastStep = -9; lane.side = 0; lane.rock = 0; lane.done = false; lane.doneT = null; lane.buoy = 0; lane.stumbles = 0; lane.splashes = 0; lane.gone = false; lane.flying = 0;
    lane.tumblers = [];
    const tray = G('tray', 0, 1.25, -0.3);
    add(tray, M(geo.box(0.6, 0.04, 0.6), 0xC99A62), M(geo.box(0.62, 0.05, 0.02), 0x9A6E3E, 0, 0.02, 0.3), M(geo.box(0.62, 0.05, 0.02), 0x9A6E3E, 0, 0.02, -0.3));
    lane.doll.root.add(tray);
    lane.doll.face(Math.PI);
    lane.doll.rig.loop('carryTray');
    this.addTumblers(lane);
  }
  addTumblers(lane) {
    const spots = SPOTS;
    const n = 5;
    const b = lane.bal;
    for (let i = 0; i < n; i++) {
      const [x, z] = spots[i];
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(b.fx + x, b.fy + 0.75 + 0.5 + 0.02 + 0.06 + 0.002, b.fz - 0.3 + z).setCanSleep(false).setAngularDamping(0.5).setLinearDamping(0.1));
      this.world.createCollider(RAPIER.ColliderDesc.cylinder(0.06, 0.05).setMass(0.012).setFriction(0.9).setRestitution(0).setCollisionGroups(groups.prop(lane.id)), body);
      const mesh = G();
      const glassCol = [0xBFE9F0, 0xFAD7A0, 0xF4B6C8, 0xC9F2C7, 0xFFF3DC][i];
      add(mesh, M(geo.cyl(0.055, 0.045, 0.13, 12), glassCol), M(geo.cyl(0.03, 0.03, 0.02, 8), 0xE8443A, 0.02, 0.075, 0));
      this.group.add(mesh);
      lane.tumblers.push({ body, mesh, on: true });
    }
  }
  buildSet() {
    const g = this.group, n = this.lanes.length;
    const length = this.cfg.length + 16;
    this.lanes.forEach((lane) => {
      const walk = planks(1.62, length, { along: 'z', top: 0, board: 0.5, thick: 0.1 });
      walk.position.set(lane.x, 0, -length / 2 + 6);
      g.add(walk);
      for (let z = 4; z > -this.cfg.length - 8; z -= 5) {
        add(g, post(3.4, 0.07, WOOD_D, lane.x - 0.82, -3.3, z), post(3.4, 0.07, WOOD_D, lane.x + 0.82, -3.3, z));
        if (z % 10 === 4 % 10) { const b = buoy(z % 20 === 4 % 20 ? RED : TEAL); b.position.set(lane.x + 1.3, -0.2, z); b.scale.setScalar(0.8); g.add(b); }
      }
      // Far table
      const tz = -this.cfg.length;
      add(g, M(geo.cyl(0.55, 0.55, 0.05, 16), CREAM, lane.x, 0.84, tz - 1.2), post(0.84, 0.05, WOOD_D, lane.x, 0, tz - 1.2));
    });
    // The cabana at the far end.
    const tz = -this.cfg.length - 3.8;
    const span = Math.max(6, n * 3.2 + 3);
    add(g, M(geo.box(span + 3, 0.2, 6), 0xC99A62, 0, -0.1, tz));
    for (const x of [-span / 2, span / 2]) for (const z of [-2.5, 2.5]) add(g, post(3, 0.09, CREAM, x, 0, tz + z));
    const roof = pavilionRoof(span * 0.75, TEAL, ORANGE); roof.position.set(0, 3, tz); g.add(roof);
    const p = palm(3.4); p.position.set(span / 2 + 1, 0, tz + 1); g.add(p);
    this.addTrudy(span / 2 - 1, 0, tz + 1.8, -0.4, 1.3);
    this.addWatchers([[-span / 2 + 1, 0, tz + 1.4, 3.4], [-span / 2 + 2.2, 0, tz + 0.6, 3.2]]);
    g.add(bunting(-span / 2, 2.8, tz + 2.5, span / 2, 2.8, tz + 2.5, 14));
    this.game.setBackdrop(70, 90);
  }
  cameraShot(snap) {
    const lead = this.lanes.reduce((m, l) => Math.max(m, l.dist || 0), 0);
    const n = this.lanes.length;
    const d = this.game.rig.fitDistance(5.4, (n - 1) * 3.2);
    this.game.rig.shot(0, 3.6, -lead + d, 0, 1.25, -lead - 1.4, { snap, rate: 5 });
    this.game.focus(0, 0, -lead, 18);
  }
  hudSetup(hud) { this.glassTag = hud.addWidget(h('div.tag', { style: 'font-size:3.6rem' }, '')); hud.setScore(5, 'Glasses'); }
  start() { if (this.mode === 'solo') this.game.speech.say('trudy', line('trudy', 'tray_start'), { auto: 3.2, top: true }); }
  /** The wind blows a telegraph for a full second first. */
  scheduleGust() {
    const c = this.cfg;
    const a = this.r() < 0.5 ? 0 : Math.PI;
    const force = c.gust * tun.gustForce;
    this.gust = { warn: 1, dur: 0.5, x: Math.cos(a) * force, z: 0, a };
    this.game.audio.sfx('gust');
    this.game.hud.setNote('Wind!', 1);
    for (const lane of this.lanes) if (lane.kind === 'local') this.game.input.rumble(0.05, 0.2, 200);
    if (this.mode === 'solo') this.bark('trudy', 'tray_gust', 1.8, 10);
    this.streaks = 1;
  }
  fixedEvent(dt) {
    const c = this.cfg;
    this.gustNext -= dt;
    if (this.gustNext <= 0 && !this.gust) { this.scheduleGust(); this.gustNext = c.every * (0.85 + this.r() * 0.3); }
    if (this.gust) {
      const g = this.gust;
      if (g.warn > 0) g.warn -= dt;
      else {
        g.dur -= dt;
        for (const lane of this.lanes) if (lane.bal && !lane.done) { lane.bal.extX += g.x * this.diff.dist; lane.bal.extZ += g.z * this.diff.dist; }
        if (g.dur <= 0) this.gust = null;
      }
    }
    if (c.gary) this.garyStep(dt);
    if (c.wobbly) this.wobblePhase += dt;
    for (const lane of this.lanes) {
      if (!lane.bal) continue;
      this.laneStep(lane, dt);
    }
    if (this.clock !== null) this.clock -= dt;
  }
  laneStep(lane, dt) {
    const b = lane.bal, i = lane.input, c = this.cfg;
    if (lane.done) { b.moveFoot(b.fx, b.fy, b.fz); return; }
    let foot = null;
    if (i.footLPressed) foot = 'L'; else if (i.footRPressed) foot = 'R';
    if (foot && !lane.fallen) {
      if (foot === lane.lastFoot) {
        // Same foot twice is a stumble.
        lane.stumbles++; lane.rock = 0.18; lane.rockAmt = 0.6 * (this.r() < 0.5 ? -1 : 1);
        this.game.audio.sfx('clack');
      } else {
        lane.lastFoot = foot; lane.lastStep = this.t;
        lane.targetSpeed = STEP_LEN / CADENCE;
        lane.rock = 0.18; lane.rockAmt = foot === 'L' ? -0.2 : 0.2;
        lane.side += b.leanX * 0.25 * STEP_LEN;
        lane.doll.rig.once(foot === 'L' ? 'stepL' : 'stepR', { speed: 0.8 });
        lane.doll.rig.loop('carryTray');
        this.game.audio.sfx('thud', { pitch: 200 + (foot === 'L' ? 0 : 30) });
      }
    }
    if (this.t - lane.lastStep > 1.6 * CADENCE) lane.targetSpeed = 0;
    lane.speed += (lane.targetSpeed - lane.speed) * (1 - Math.exp(-dt / 0.5));
    if (lane.rock > 0) { lane.rock -= dt; b.extX += lane.rockAmt; }
    if (c.wobbly && Math.sin(lane.dist * 0.9) > 0.86) b.extX += Math.sin(this.wobblePhase * 9) * 0.22;
    lane.dist += lane.speed * dt;
    lane.sideNow = (lane.sideNow || 0) + (lane.side - (lane.sideNow || 0)) * (1 - Math.exp(-SIDE_RATE * dt));
    b.moveFoot(lane.x + lane.sideNow, 0, -lane.dist);
    if (Math.abs(lane.sideNow) > 0.8 && !lane.fallen) this.offEdge(lane);
    if (lane.dist >= this.endDist) {
      lane.done = true; lane.doneT = this.t; lane.targetSpeed = 0; lane.speed = 0;
      this.game.audio.sfx('bell');
      if (lane.kind === 'local' && this.mode === 'solo') this.game.speech.say('trudy', line('trudy', 'tray_done'), { auto: 3, top: true });
      if (this.lanes.length > 1 && this.clock === null) { this.clock = 15; this.game.hud.setNote('15 seconds!', 2); }
    }
    if (lane.kind === 'local' && !lane.fallen && b.lean > 0.34) this.bark('trudy', 'near', 2, 8);
  }
  /** Off the edge: splash, respawn at the last buoy with one fewer glass. */
  offEdge(lane) {
    const b = lane.bal;
    lane.splashes++;
    const p = b.body.translation();
    this.game.fx.splash(p.x, -0.4, p.z, 1.3);
    this.game.audio.sfx('splash', { big: 1.2 });
    this.game.comic.pop('SPLOSH!', p.x, 1.2, p.z);
    if (lane.kind === 'local') this.bark('trudy', 'tray_splash', 2.6, 2);
    lane.dist = Math.max(0, Math.floor(lane.dist / 10) * 10);
    lane.side = 0; lane.sideNow = 0; lane.speed = 0; lane.targetSpeed = 0;
    const on = lane.tumblers.filter((t) => t.on);
    if (on.length) { const t = on[on.length - 1]; t.on = false; this.removeTumbler(lane, t); }
    // Lift everyone back: the same offset for doll and glasses.
    const fx = lane.x, fz = -lane.dist;
    const dx = fx - b.fx, dz = fz - b.fz;
    b.foot.setTranslation({ x: fx, y: 0, z: fz }, true);
    b.moveFoot(fx, 0, fz);
    b.recover();
    let k = 0;
    const spots = SPOTS;
    for (const t of lane.tumblers) {
      if (!t.on || !t.body) continue;
      const [sx, sz] = spots[k++];
      t.body.setTranslation({ x: fx + sx, y: 0.75 + 0.5 + 0.02 + 0.06 + 0.002, z: fz - 0.3 + sz }, true);
      t.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
      t.body.setLinvel({ x: 0, y: 0, z: 0 }, true); t.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
    return { dx, dz };
  }
  removeTumbler(lane, t) {
    if (t.body) { this.world.removeRigidBody(t.body); t.body = null; }
    this.group.remove(t.mesh);
  }
  garyStep(dt) {
    this.garyT -= dt;
    if (!this.gary && this.garyT <= 0) {
      const lane = this.lanes.find((l) => l.kind !== 'ghost' && !l.done);
      if (lane) {
        const gull = new Gull();
        gull.rig.loop('fly');
        this.group.add(gull.root);
        this.gary = { gull, t: 0, lane, took: false };
        this.game.audio.sfx('squawk');
      }
      this.garyT = 26;
    }
    if (this.gary) {
      const g = this.gary;
      g.t += dt;
      const k = g.t / 2.4;
      const b = g.lane.bal;
      const fx = b.fx, fz = b.fz;
      const x = fx - 8 + 16 * k, y = 1.45 + Math.abs(k - 0.5) * 6, z = fz - 0.3;
      g.gull.root.position.set(x, y, z);
      g.gull.root.rotation.y = Math.PI / 2;
      if (!g.took && k > 0.48) {
        g.took = true;
        const on = g.lane.tumblers.filter((t) => t.on);
        // Gary swoops for a glass unless you lean out of his way.
        if (on.length && Math.abs(g.lane.dotX) < 0.45) { const t = on[0]; t.on = false; g.carried = t; }
      }
      if (g.carried) { g.carried.mesh.position.set(x, y - 0.25, z); }
      if (k >= 1) {
        if (g.carried) this.removeTumbler(g.lane, g.carried);
        this.group.remove(g.gull.root); this.gary = null;
      }
    }
  }
  afterStep() {
    for (const lane of this.lanes) {
      if (!lane.tumblers) continue;
      const b = lane.bal.body.translation(), q = lane.bal.body.rotation();
      _q.set(q.x, q.y, q.z, q.w).invert();
      for (const t of lane.tumblers) {
        if (!t.on || !t.body) continue;
        const p = t.body.translation();
        _v.set(p.x - b.x, p.y - b.y, p.z - b.z).applyQuaternion(_q);
        const fell = _v.y < 0.42 || Math.hypot(_v.x, _v.z + 0.3) > 0.42 || lane.fallen;
        if (fell) {
          t.on = false;
          this.game.audio.sfx('plateCrash');
          if (lane.kind === 'local') { this.bark('trudy', 'tray_spill', 2, 4); this.game.input.rumble(0.3, 0.5, 120); }
        }
      }
      for (const t of lane.tumblers) {
        if (t.body && !t.on && t.body.translation().y < -4) this.removeTumbler(lane, t);
      }
    }
  }
  botInput(lane, t, bot) {
    const out = lane.input;
    const d = bot.data;
    d.next = (d.next ?? 0.2) - 1 / 120;
    out.footLPressed = false; out.footRPressed = false; out.footL = 0; out.footR = 0;
    if (d.next <= 0 && !lane.done && !lane.fallen) {
      d.next = CADENCE * (1 + (bot.r() - 0.5) * bot.s.timing * 3);
      d.foot = d.foot === 'L' ? 'R' : 'L';
      if (d.foot === 'L') { out.footLPressed = true; out.footL = 1; } else { out.footRPressed = true; out.footR = 1; }
    }
    // Keep centred and brace at .2 × gust. By default half a second ahead, as in the plan's gust table: a good player's habit, which sets the pars.
    // braceEarly is the whole telegraph, which is how the plan's glass counts were measured.
    let gx = -lane.side * 0.5, gz = 0;
    const brace = lane.braceK ?? 0.2;
    if (this.gust && this.gust.warn < (lane.braceEarly ? 1 - bot.s.lag * 0.5 : 0.62 - bot.s.lag)) gx += -Math.sign(this.gust.x) * brace * Math.abs(this.gust.x);
    const [x, z] = bot.steer(gx, gz, true);
    out.wishX = x; out.wishZ = z;
    out.flail = !lane.fallen && lane.bal.lean > 0.6 && lane.bal.flailCool <= 0;
  }
  hud() {
    const me = this.lanes.find((l) => l.kind === 'local') || this.lanes[0];
    const hud = this.game.hud;
    const on = me.tumblers ? me.tumblers.filter((t) => t.on).length : 0;
    hud.setScore(on, 'Glasses');
    hud.setTime(this.clock !== null ? this.clock : null);
    const s = `${Math.max(0, Math.round(this.endDist - (me.dist || 0)))} m to go`;
    if (this.glassTag && this.glassTag.textContent !== s) this.glassTag.textContent = s;
    for (const lane of this.lanes) {
      const g = this.gust;
      lane.discView.brace = g && g.warn > 0 ? { x: -Math.sign(g.x), z: 0 } : null;
      lane.discView.zone = null;
    }
  }
  frameEvent(dt) {
    this.cameraShot(false);
    for (const lane of this.lanes) {
      if (!lane.tumblers) continue;
      for (const t of lane.tumblers) {
        if (!t.body) continue;
        const p = t.body.translation(), q = t.body.rotation();
        t.mesh.position.set(p.x, p.y, p.z); t.mesh.quaternion.set(q.x, q.y, q.z, q.w);
      }
      if (lane.speed > 0.3 && lane.doll.rig.onceLeft <= 0) lane.doll.rig.loop('carryTray');
    }
    if (this.gary) this.gary.gull.update(dt);
    if (this.gust && this.gust.warn > 0) {
      const lead = this.lanes.reduce((m, l) => Math.max(m, l.dist || 0), 0);
      const dir = Math.sign(this.gust.x);
      this.game.fx.spawn(cos(-5, 5) - dir * 7, cos(0.5, 3), -lead + cos(-4, 1), dir * 14, 0, 0, 0.05, 0x1A1420, 0.5, 0);
    }
  }
  isDone() {
    const active = this.lanes.filter((l) => l.kind !== 'ghost');
    if (active.every((l) => l.done)) return true;
    return this.clock !== null && this.clock <= 0;
  }
  laneResult(lane) {
    const on = lane.tumblers ? lane.tumblers.filter((t) => t.on).length : 0;
    const delivered = lane.done ? on : Math.floor(on / 2);
    const par = (this.cfg.length / STEP_LEN) * CADENCE;
    const bonus = lane.done ? Math.max(0, 40 * (1 - (lane.doneT - par) / (par * 0.5))) : 0;
    const raw = 100 * delivered + bonus;
    return { form: (100 * raw) / this.cfg.par, raw, big: `${delivered}/5`, stats: `${lane.done ? 'Delivered' : 'Not delivered'} · ${lane.stumbles} stumbles · ${lane.splashes} splashes · ${lane.falls} floor exercises` };
  }
}
