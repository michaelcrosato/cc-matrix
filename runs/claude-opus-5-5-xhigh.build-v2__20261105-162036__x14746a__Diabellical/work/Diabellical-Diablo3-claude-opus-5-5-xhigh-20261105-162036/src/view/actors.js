// Actors: every body on screen. Humanoids run the hero's clips; the rest move procedurally.
import { buildModel, compileClips, ContactShadow, glowMaterial, HERO_RAGDOLL, HERO_RIG, LegStepper, PALETTE, Ragdoll, setLookLayer, SpringChain, Squash, THREE, toonMaterial, Trail, twoBoneIK } from '../../pixel-engine.js';
import { MONSTERS } from '../data/monsters.js';
import { ALL_CLIPS, UPPER_JOINTS } from './clips.js';
import { MODELS } from './models/index.js';

const { AnimationClip, AnimationMixer, BoxGeometry, CylinderGeometry, Group, LoopOnce, LoopRepeat, Mesh, Vector3 } = THREE;

const clipCache = new Map();
export function clipsFor(bodyId, object) {
  let c = clipCache.get(bodyId);
  if (!c) {
    const list = compileClips(ALL_CLIPS, HERO_RIG, object);
    const map = {};
    for (const clip of list) map[clip.name] = clip;
    c = map;
    clipCache.set(bodyId, c);
  }
  return c;
}
const upperCache = new Map();
function upperClip(clip) {
  let u = upperCache.get(clip);
  if (!u) {
    u = new AnimationClip(`${clip.name}_upper`, clip.duration, clip.tracks.filter((t) => UPPER_JOINTS.has(t.name.split('.')[0])));
    upperCache.set(clip, u);
  }
  return u;
}

const LEG_GEO = new BoxGeometry(1, 1, 1);
const FLASH = () => glowMaterial(PALETTE.white);
const UP = [0, 1, 0];
const groundY = () => 0;

export const CLASS_BODY = { bellwarden: 'hero_bellwarden', lamplighter: 'hero_lamplighter', sexton: 'hero_sexton', pyx: 'npc_pyx' };
export const SEAT_COLORS = ['red', 'sky', 'lime', 'sand'];

/** Where weapons sit in a hand. */
const WEAPON_POSE = {
  default: { at: [0, -0.1, 0.06], rot: [90, 0, 0], scale: 1 },
  'hand-bell-weapon': { at: [0, -0.1, 0.06], rot: [90, 0, 0], scale: 1.1 },
  staff: { at: [0, -0.1, -0.5], rot: [90, 0, 0], scale: 1 },
  scythe: { at: [0, -0.1, -0.2], rot: [90, 0, 0], scale: 1 },
  shovel: { at: [0, -0.1, -0.2], rot: [90, 0, 0], scale: 1 },
  crossbow: { at: [0, -0.1, 0.1], rot: [0, 0, 0], scale: 1 },
};
const OFF_POSE = {
  default: { at: [0.05, -0.18, 0.05], rot: [0, 90, 0], scale: 0.9 },
  'hand-lantern': { at: [0, -0.48, 0.05], rot: [0, 0, 0], scale: 1 },
  censer: { at: [0, -0.62, 0.05], rot: [0, 0, 0], scale: 1 },
};

export class Actor {
  constructor(view, o) {
    this.view = view;
    this.id = o.id;
    this.type = o.type;
    this.def = o.def ?? MONSTERS[o.type] ?? {};
    this.bodyId = o.body ?? this.def.body;
    this.scale = (o.scale ?? 1) * (this.def.huge ? (o.type === 'bursar' ? 2.5 : 1) : this.def.big && this.def.humanoid && o.type !== 'coffin_bearer' ? 1.5 : 1);
    if (this.def.small && this.def.humanoid) this.scale *= 0.6;
    if (o.type === 'malison') this.scale = 1;
    this.isHero = !!o.isHero;
    this.ally = !!o.ally;
    this.humanoid = !!(this.isHero || this.def.humanoid || o.humanoid);
    this.time = 0;
    this.flashT = 0;
    this.hidden = false;
    this.action = null; this.oneShot = null; this.base = null;
    const palette = o.tint ? { [Object.keys(MODELS.get(this.bodyId).palette ?? {})[0]]: o.tint } : undefined;
    const b = buildModel(this.bodyId, { catalog: MODELS, palette });
    this.root = new Group();
    this.body = b.object;
    this.root.add(this.body);
    this.root.scale.setScalar(this.scale);
    this.meshes = [];
    this.body.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; this.meshes.push(m); m.userData.orig = m.material; } });
    setLookLayer(this.root, 'actors');
    this.shadow = new ContactShadow(Math.max(0.4, (this.def.r ?? 0.42) * this.scale * (this.def.huge ? 0.8 : 1)));
    view.actorRoot.add(this.root, this.shadow);
    this.root.position.set(o.x, 0, o.z);
    if (this.humanoid) {
      this.mixer = new AnimationMixer(this.body);
      this.clips = clipsFor(this.bodyId, this.body);
      this.setBase(this.def.clipIdle ?? 'Idle');
    }
    this.squash = new Squash();
    if (this.def.legs) this.makeLegs(this.def.legs);
    if (o.from === 'ground') { this.riseT = 0.5; this.root.position.y = -1.6; view.dustAt(o.x, o.z); }
    if (o.from === 'drop') { this.dropT = 0.4; this.root.position.y = 5; }
    if (this.type === 'malison') this.makeRopes();
    this.wingL = this.body.getObjectByName('WingL'); this.wingR = this.body.getObjectByName('WingR');
    this.headBone = this.body.getObjectByName('HeadBone');
    this.statueT = this.type === 'ash_gargoyle' ? 1 : 0;
    this.seed = o.id * 0.37;
  }

  setBase(name, timeScale = 1) {
    if (this.baseName === name) { if (this.base) this.base.timeScale = timeScale; return; }
    const clip = this.clips[name];
    if (!clip) return;
    const a = this.mixer.clipAction(clip);
    a.reset();
    a.setLoop(LoopRepeat);
    a.timeScale = timeScale;
    a.enabled = true;
    a.play();
    if (this.base) this.base.crossFadeTo(a, 0.12, false);
    this.base = a;
    this.baseName = name;
  }

  /** Play a clip once over the base. upper: only the upper body, so the legs keep running. */
  play(name, speed = 1, upper = false, hold = false) {
    if (!this.mixer) return;
    let clip = this.clips[name];
    if (!clip) return;
    if (upper) clip = upperClip(clip);
    const a = this.mixer.clipAction(clip);
    a.reset();
    a.setLoop(LoopOnce, 1);
    a.clampWhenFinished = true;
    a.timeScale = speed;
    a.enabled = true;
    a.setEffectiveWeight(1);
    if (this.oneShot && this.oneShot !== a) this.oneShot.fadeOut(0.06);
    a.fadeIn(0.05);
    a.play();
    this.oneShot = a;
    this.oneShotT = (clip.duration / Math.max(0.05, speed)) - 0.06;
    this.oneHold = hold;
  }

  loopClip(name, dur, speed = 1) {
    if (!this.mixer) return;
    const clip = this.clips[name];
    if (!clip) return;
    const a = this.mixer.clipAction(clip);
    a.reset();
    a.setLoop(LoopRepeat);
    a.timeScale = speed;
    a.setEffectiveWeight(1);
    if (this.oneShot && this.oneShot !== a) this.oneShot.fadeOut(0.06);
    a.fadeIn(0.05);
    a.play();
    this.oneShot = a;
    this.oneShotT = dur;
    this.oneHold = false;
  }

  makeLegs(n) {
    const r = this.def.r * this.scale;
    const legs = [];
    const rows = n / 2;
    for (let i = 0; i < n; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const row = Math.floor(i / 2);
      const z = rows === 1 ? 0 : (row / (rows - 1) - 0.5) * r * 2.4;
      legs.push({ rest: [side * r * 1.5, z], partners: [i % 2 === 0 ? i + 1 : i - 1] });
    }
    this.stepper = new LegStepper({ legs, threshold: r * 0.7, stepTime: 0.14, lift: r * 0.5, lead: 0.15 });
    this.legs = [];
    const mat = toonMaterial(PALETTE[this.def.legColor ?? 'ink']);
    const th = Math.max(0.07, r * 0.2);
    for (let i = 0; i < n; i++) {
      const a = new Mesh(LEG_GEO, mat), b = new Mesh(LEG_GEO, mat);
      a.castShadow = b.castShadow = true;
      setLookLayer(a, 'actors'); setLookLayer(b, 'actors');
      this.view.actorRoot.add(a, b);
      this.legs.push({ a, b, th });
    }
    this.hipH = (this.def.hipH ?? (this.def.legs === 6 ? 0.27 : this.def.big || this.def.huge ? 0.95 : 0.42)) * (this.def.huge ? 1.35 : 1);
    this.legLen = this.hipH * 0.85 + r * 0.6;
  }

  updateLegs(dt, m, speed) {
    const p = [this.root.position.x, 0, this.root.position.z];
    const yaw = this.root.rotation.y;
    const vel = [Math.sin(yaw) * speed, 0, Math.cos(yaw) * speed];
    this.stepper.update(dt, p, yaw, vel, groundY);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    this.legs.forEach((leg, i) => {
      const foot = this.stepper.feet[i].at;
      const rest = this.stepper.o.legs[i].rest;
      const hip = [p[0] + rest[0] * 0.45 * c + rest[1] * 0.5 * s, this.hipH, p[2] - rest[0] * 0.45 * s + rest[1] * 0.5 * c];
      const pole = [hip[0] + (hip[0] - p[0]) * 2, hip[1] + 1, hip[2] + (hip[2] - p[2]) * 2];
      const knee = twoBoneIK(hip, foot, this.legLen * 0.55, this.legLen * 0.6, pole);
      segment(leg.a, hip, knee, leg.th);
      segment(leg.b, knee, foot, leg.th * 0.8);
    });
  }

  makeRopes() {
    this.ropes = [];
    const mat = toonMaterial(PALETTE.sand);
    for (let i = 0; i < 4; i++) {
      const chain = new SpringChain({ segments: 7, length: 0.75, rest: [0, -0.55, 0.85], stiffness: 5, keep: 0.93, gravity: 3 });
      const segs = [];
      for (let k = 0; k < 7; k++) {
        const m = new Mesh(LEG_GEO, mat);
        m.castShadow = true;
        setLookLayer(m, 'actors');
        this.view.actorRoot.add(m);
        segs.push(m);
      }
      this.ropes.push({ chain, segs, side: i % 2 === 0 ? -1 : 1, up: i < 2 ? 2.8 : 1.6 });
    }
  }

  updateRopes(dt) {
    const yaw = this.root.rotation.y;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const right = [c, 0, -s], up = UP, fwd = [s, 0, c];
    const p = this.root.position;
    for (const r of this.ropes) {
      const root = [p.x + right[0] * r.side * 1.2, p.y + r.up, p.z + right[2] * r.side * 1.2];
      const sway = this.lash > 0 ? 3 : 0.3;
      const rb = [[right[0] * r.side, 0, right[2] * r.side], up, [fwd[0] + Math.sin(this.time * 2 + r.side) * sway * 0.2, 0, fwd[2]]];
      r.chain.update(dt, root, rb);
      for (let k = 0; k < r.segs.length; k++) segment(r.segs[k], r.chain.points[k], r.chain.points[k + 1], 0.22);
    }
  }

  // ---- Hero gear ---------------------------------------------------------------------------
  setGear(g, cls) {
    const hand = this.body.getObjectByName('HandR');
    const offHand = this.body.getObjectByName('HandL');
    const head = this.body.getObjectByName('Head');
    const armR = this.body.getObjectByName('ArmR');
    const armL = this.body.getObjectByName('ArmL');
    const swap = (parent, key, id, pose) => {
      if (this.gearAt?.[key] === id) return;
      this.gearAt = this.gearAt ?? {};
      if (this.gearObj?.[key]) parent.remove(this.gearObj[key]);
      this.gearObj = this.gearObj ?? {};
      this.gearObj[key] = null;
      this.gearAt[key] = id;
      if (!id) return;
      const o = buildModel(id, { catalog: MODELS }).object;
      o.traverse((m) => { if (m.isMesh) { m.castShadow = true; this.meshes.push(m); m.userData.orig = m.material; } });
      if (pose) {
        o.position.set(...pose.at);
        o.rotation.set((pose.rot[0] * Math.PI) / 180, (pose.rot[1] * Math.PI) / 180, (pose.rot[2] * Math.PI) / 180);
        o.scale.setScalar(pose.scale ?? 1);
      }
      setLookLayer(o, 'actors');
      parent.add(o);
      this.gearObj[key] = o;
    };
    if (hand) swap(hand, 'main', g.main || null, WEAPON_POSE[g.main] ?? WEAPON_POSE.default);
    if (offHand) swap(offHand, 'off', g.off || null, OFF_POSE[g.off] ?? OFF_POSE.default);
    if (!CLASS_BODY[cls] || cls === 'pyx') return;
    const tierOf = (r) => (r === 'legendary' || r === 'set' || r === 'reliquary' ? 2 : r === 'blessed' ? 1 : 0);
    if (head) swap(head, 'helm', g.head ? `helm_${cls}_${tierOf(g.head)}` : null);
    if (armR) swap(armR, 'shR', g.shoulders ? `shoulder_${cls}_${tierOf(g.shoulders)}` : null, { at: [-0.02, 0.06, 0], rot: [0, 0, 0] });
    if (armL) swap(armL, 'shL', g.shoulders ? `shoulder_${cls}_${tierOf(g.shoulders)}` : null, { at: [0.02, 0.06, 0], rot: [0, 0, 0] });
  }

  setTrail(colorHead, colorTail) {
    this.trail = new Trail({ width: 0.26, life: 0.16, points: 16 });
    this.trail.head.setHex(colorHead);
    this.trail.tail.setHex(colorTail);
    this.view.actorRoot.add(this.trail);
    this.tipTmp = new Vector3();
  }

  flash(frames = 2) {
    this.flashT = frames;
    const glow = FLASH();
    for (const m of this.meshes) m.material = glow;
  }

  sync(x, z, facing, moving, speed, dt) {
    this.time += dt;
    const p = this.root.position;
    p.x = x; p.z = z;
    this.root.rotation.y = facing;
    if (this.flashT > 0) {
      this.flashT--;
      if (this.flashT <= 0) for (const m of this.meshes) m.material = m.userData.orig;
    }
    if (this.riseT > 0) { this.riseT -= dt; p.y = -Math.max(0, this.riseT / 0.5) * 1.6; }
    else if (this.dropT > 0) {
      this.dropT -= dt;
      p.y = Math.max(0, this.dropT / 0.4) ** 2 * 5;
      if (this.dropT <= 0) { p.y = 0; this.squash.kick(-5); this.view.dustAt(x, z); }
    }
    if (this.def.hover) p.y = this.def.hover * 0.5 + Math.sin(this.time * 2 + this.seed) * 0.12 + (this.type === 'ash_gargoyle' ? 0.2 : 0);
    if (this.mixer) {
      if (moving && speed > 0.1) {
        const name = this.def.clipMove ?? (speed > 3 ? 'Run' : 'Walk');
        const auth = name === 'Run' ? 5.5 : name === 'Walk' ? 2 : name === 'Shamble' ? 1.4 : 2;
        this.setBase(name, Math.max(0.5, speed / auth));
      } else this.setBase(this.def.clipIdle ?? 'Idle', 1);
      if (this.oneShot) {
        this.oneShotT -= dt;
        if (this.oneShotT <= 0 && !this.oneHold) { this.oneShot.fadeOut(0.08); this.oneShot = null; }
      }
      this.mixer.update(dt);
    }
    this.squash.update(dt);
    const [sh, sv] = this.squash.scale();
    this.body.scale.set(sh, sv, sh);
    if (this.stepper) this.updateLegs(dt, null, moving ? speed : 0);
    if (this.wingL) {
      const a = moving ? Math.sin(this.time * 12) * 0.7 : -0.1;
      this.wingL.rotation.z = a; this.wingR.rotation.z = -a;
    }
    if (this.ropes) this.updateRopes(dt);
    if (this.lash > 0) this.lash -= dt;
    if (this.headTilt > 0) { this.headTilt -= dt; if (this.headBone) this.headBone.rotation.x = -Math.sin(this.headTilt * 8) * 0.35; }
    this.shadow.place(x, 0, z, Math.max(0, p.y));
    this.shadow.visible = this.root.visible;
    if (this.trail) {
      const hand = this.gearObj?.main ?? this.body.getObjectByName('HandR');
      if (this.oneShot && hand) {
        hand.getWorldPosition(this.tipTmp);
        // The ribbon needs two different points: identical ones make NaN vertices.
        if (!this.tipLast) this.tipLast = this.tipTmp.clone();
        if (this.tipTmp.distanceToSquared(this.tipLast) > 1e-4) { this.trail.push(this.tipTmp, this.time); this.tipLast.copy(this.tipTmp); }
      }
      this.trail.update(this.time, this.view.ctx.camera.camera);
    }
  }

  setHidden(on) {
    this.hidden = on;
    this.root.visible = !on;
    this.shadow.visible = !on;
  }

  /** Leave the scene entirely. */
  remove() {
    const r = this.view.actorRoot;
    r.remove(this.root, this.shadow);
    if (this.legs) for (const l of this.legs) r.remove(l.a, l.b);
    if (this.ropes) for (const q of this.ropes) for (const s of q.segs) r.remove(s);
    if (this.trail) { r.remove(this.trail); this.trail.dispose(); }
    if (this.light) this.light.release();
    if (this.mixer) this.mixer.stopAllAction();
    if (this.dissolved) for (const m of this.dissolved) m.dispose();
  }

  /** A per-body dissolve, only for those who are going. */
  startDissolve() {
    this.dissolved = [];
    for (const m of this.meshes) {
      const orig = m.userData.orig;
      if (!orig?.color || orig.isMeshBasicNodeMaterial) { m.visible = false; continue; }
      const clone = toonMaterial(orig.color.getHex(), { dissolve: true }).clone();
      clone.dissolve = 0;
      m.material = clone;
      m.userData.orig = clone;
      this.dissolved.push(clone);
    }
  }
  setDissolve(v) { if (this.dissolved) for (const m of this.dissolved) m.dissolve = v; }
}

const tmpA = new Vector3();
function segment(mesh, a, b, th) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const L = Math.hypot(dx, dy, dz) || 0.01;
  mesh.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  tmpA.set(b[0], b[1], b[2]);
  mesh.lookAt(tmpA);
  mesh.scale.set(th, th, L);
}

export function makeRagdoll(view, actor, vel) {
  const doll = new Ragdoll(view.ctx.physics, actor.body, HERO_RAGDOLL);
  doll.enable({ velocity: vel });
  return doll;
}

export { CylinderGeometry };
