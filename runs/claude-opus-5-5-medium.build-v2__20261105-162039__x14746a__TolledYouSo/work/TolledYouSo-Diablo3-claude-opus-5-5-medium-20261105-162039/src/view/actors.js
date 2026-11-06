// Everything that moves in the world: heroes, monsters, allies, NPCs. Reads a world, whether a host's sim or a client's mirror.
import { buildModel, compileClips, ContactShadow, disposeObject, glowMaterial, HERO_RAGDOLL, HERO_RIG, LegStepper, model, PALETTE, Ragdoll, setLookLayer, Squash, SpringChain, THREE, toonMaterial, twoBoneIK } from '../../pixel-engine.js';
import { MONSTERS } from '../data/monsters.js';
import { ALL_CLIPS, upperOnly } from './clips.js';
import { MODELS } from './models/props.js';

const { AnimationMixer, BoxGeometry, CylinderGeometry, Group, LoopOnce, LoopRepeat, Mesh, RingGeometry, Vector3 } = THREE;
const HUMANOID = new Set(['peatwalker', 'gibbet_drop', 'rattlebones', 'pallid_bearer', 'cinderling', 'tithe_collector', 'penitent', 'shade_acolyte', 'bursar', 'ambrose', 'skeleton_minion', 'coffin_crew', 'hero_bellwarden', 'hero_lamplighter', 'hero_sexton', 'npc_brasse', 'npc_ogive', 'npc_pennywhistle', 'npc_pyx', 'npc_ambrose']);
const ringGeo = new RingGeometry(0.62, 0.8, 24).rotateX(-Math.PI / 2);
const limbGeo = new BoxGeometry(1, 1, 1);
export function dissolveClone(mat) { const c = toonMaterial(mat.color ? mat.color.getHex() : PALETTE.white, { dissolve: true, ...(mat.map ? { map: mat.map } : {}) }).clone(); c.dissolve = 0; return c; }
export const SEAT_COLORS = ['red', 'blue', 'lime', 'sand'];
const SEAT_HEX = (s) => PALETTE[SEAT_COLORS[s] ?? 'white'];
const ELITE_COLORS = { champion: 'sky', rare: 'sand' };

let CLIPS = null; let CLIPS_UP = null;
export function sharedClips(obj) {
  if (!CLIPS) { CLIPS = new Map(); CLIPS_UP = new Map(); for (const c of compileClips(ALL_CLIPS, HERO_RIG, obj)) { CLIPS.set(c.name, c); } }
  return CLIPS;
}
const upperClip = (name) => { let c = CLIPS_UP.get(name); if (!c) { c = upperOnly(THREE, CLIPS.get(name)); CLIPS_UP.set(name, c); } return c; };

const HELMS = [
  model({ id: 'gear_helm_1', about: 'A dented sallet', tags: ['gear'], palette: { m: 'mist', d: 'ink' }, parts: [{ box: [0.36, 0.12, 0.36], at: [0, 0.05, 0], c: 'm' }, { box: [0.2, 0.05, 0.04], at: [0, 0, 0.17], c: 'd' }], floats: true }),
  model({ id: 'gear_helm_2', about: 'A horned reliquary helm', tags: ['gear'], palette: { m: 'sand', d: 'ink' }, parts: [{ box: [0.38, 0.14, 0.38], at: [0, 0.06, 0], c: 'm' }, { mirror: [{ cone: [0.1, 0.3, 0.1], at: [0.18, 0.26, 0], rot: [0, 0, -20], c: 'd' }], axis: 'x' }], floats: true }),
  model({ id: 'gear_helm_3', about: 'A legendary crown of bell metal', tags: ['gear'], palette: { m: 'orange', d: 'sand' }, parts: [{ box: [0.4, 0.14, 0.4], at: [0, 0.06, 0], c: 'm' }, ...[-0.14, 0, 0.14].map((x) => ({ cone: [0.1, 0.24, 0.1], at: [x, 0.24, 0.17], c: 'd' })), { mirror: [{ cone: [0.1, 0.24, 0.1], at: [0.18, 0.24, 0], c: 'd' }], axis: 'x' }], floats: true }),
];
const PAULS = [
  model({ id: 'gear_paul_1', about: 'A plain pauldron', tags: ['gear'], palette: { m: 'mist' }, parts: [{ box: [0.2, 0.12, 0.26], at: [0, 0.03, 0], c: 'm' }], floats: true }),
  model({ id: 'gear_paul_2', about: 'A spiked pauldron', tags: ['gear'], palette: { m: 'sand', d: 'ink' }, parts: [{ box: [0.24, 0.14, 0.3], at: [0, 0.04, 0], c: 'm' }, { cone: [0.1, 0.2, 0.1], at: [0, 0.2, 0], c: 'd' }], floats: true }),
  model({ id: 'gear_paul_3', about: 'A flaring legendary pauldron', tags: ['gear'], palette: { m: 'orange', d: 'sand' }, parts: [{ box: [0.3, 0.16, 0.34], at: [0, 0.05, 0], c: 'm' }, { box: [0.3, 0.05, 0.36], at: [0, 0.14, 0], c: 'd' }, { cone: [0.12, 0.26, 0.12], at: [0.05, 0.26, 0], c: 'm' }], floats: true }),
];
const rarityTier = (it) => !it ? -1 : it.rarity === 'common' ? 0 : it.rarity === 'blessed' ? 0 : it.rarity === 'reliquary' ? 1 : 2;

export class Actor {
  constructor(ctx, bodyId, o = {}) {
    this.ctx = ctx; this.bodyId = bodyId; this.root = new Group(); this.humanoid = HUMANOID.has(bodyId); this.o = o;
    const palette = o.palette; const scale = o.scale ?? 1;
    this.build = buildModel(bodyId, { catalog: MODELS, ...(palette ? { palette } : {}) });
    this.body = this.build.object; this.root.add(this.body); this.body.scale.setScalar(scale); this.scaleV = scale;
    this.body.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    setLookLayer(this.root, 'actors');
    this.meshes = []; this.body.traverse((m) => { if (m.isMesh) this.meshes.push(m); });
    this.mats = this.meshes.map((m) => m.material);
    this.flashN = 0; this.squash = new Squash(); this.squash.amount = 1.5; this.hover = o.hover ?? 0;
    if (this.humanoid) {
      this.mixer = new AnimationMixer(this.body); sharedClips(this.body);
      this.actions = new Map(); this.loco = null; this.oneShot = null; this.upper = null;
      this.setLoco('Idle');
    }
    this.proc = o.proc ?? null; if (this.proc) this.initProc();
    this.shadow = o.noShadow ? null : new ContactShadow(o.shadow ?? 0.42 * Math.max(scale, 1)); if (this.shadow) ctx.scene.add(this.shadow);
    ctx.scene.add(this.root);
    this.prevX = o.x ?? 0; this.prevZ = o.z ?? 0; this.dead = false; this.ring = null; this.t = 0; this.speed = 0;
  }
  action(name, upper = false) {
    const key = (upper ? '^' : '') + name; let a = this.actions.get(key);
    if (!a) { const clip = upper ? upperClip(name) : CLIPS.get(name); if (!clip) return null; a = this.mixer.clipAction(clip); this.actions.set(key, a); }
    return a;
  }
  setLoco(name, rate = 1) {
    if (!this.mixer) return;
    if (this.locoName === name) { if (this.loco) this.loco.timeScale = rate; return; }
    const a = this.action(name); if (!a) return;
    a.reset(); a.setLoop(LoopRepeat, Infinity); a.timeScale = rate; a.play();
    if (this.loco) this.loco.crossFadeTo(a, 0.18, false);
    this.loco = a; this.locoName = name;
  }
  play(name, dur, { upper = false } = {}) {
    if (!this.mixer) { this.pulseT = dur ?? 0.3; return; }
    const a = this.action(name, upper); if (!a) return;
    const prev = upper ? this.upper : this.oneShot;
    if (prev && prev !== a) prev.fadeOut(0.06);
    a.reset(); a.setLoop(LoopOnce, 1); a.clampWhenFinished = true; a.setEffectiveWeight(1);
    a.timeScale = dur ? a.getClip().duration / dur : 1;
    a.fadeIn(0.04); a.play();
    if (upper) { this.upper = a; this.upperT = dur ?? a.getClip().duration; } else { this.oneShot = a; this.oneT = dur ?? a.getClip().duration; }
  }
  flash(n = 3) { this.flashN = n; }
  // Per-body dissolve clones, made only at death: a ragdoll goes out in pixels.
  startDissolve() { if (this.dissolving) return; this.dissolving = this.meshes.map((m, i) => { const c = dissolveClone(this.mats[i]); m.material = c; return c; }); }
  setDissolve(v) { for (const c of this.dissolving ?? []) if (c) c.dissolve = v; }
  initProc() {
    const k = this.proc;
    const LEG = { crawler: { n: 6, spread: 0.55, len: 0.3, h: 0.34, c: 'ink' }, quadruped: { n: 4, spread: 0.8, len: 0.62, h: 0.98, c: 'ink' }, plate: { n: 4, spread: 0.4, len: 0.22, h: 0.36, c: 'sand' } }[k];
    if (LEG) {
      const legs = []; for (let i = 0; i < LEG.n; i++) { const a = (i / LEG.n) * Math.PI * 2 + (LEG.n === 4 ? Math.PI / 4 : 0); legs.push({ rest: [Math.cos(a) * LEG.spread * this.scaleV, Math.sin(a) * LEG.spread * this.scaleV * 1.2], partners: [(i + 1) % LEG.n] }); }
      this.legs = new LegStepper({ legs, threshold: 0.35 * this.scaleV, stepTime: 0.12, lift: 0.18 * this.scaleV });
      this.legInfo = LEG; this.legMeshes = [];
      const mat = toonMaterial(PALETTE[LEG.c]);
      for (let i = 0; i < LEG.n; i++) { const a = new Mesh(limbGeo, mat); const b = new Mesh(limbGeo, mat); a.castShadow = b.castShadow = true; setLookLayer(a, 'actors'); setLookLayer(b, 'actors'); this.ctx.scene.add(a, b); this.legMeshes.push(a, b); }
    }
  }
  updateProc(dt, x, z, yaw, vx, vz) {
    if (this.legs) {
      const h = this.legInfo.h * this.scaleV;
      this.legs.update(dt, [x, h, z], yaw, [vx, 0, vz], () => 0);
      const len = this.legInfo.len * this.scaleV; const pole = [x, h + 2, z]; const knee = [0, 0, 0];
      this.legs.feet.forEach((f, i) => {
        const rest = this.legs.o.legs[i].rest; const c = Math.cos(yaw); const s = Math.sin(yaw);
        const hip = [x + rest[0] * 0.5 * c + rest[1] * 0.5 * s, h, z - rest[0] * 0.5 * s + rest[1] * 0.5 * c];
        twoBoneIK(hip, f.at, len, len, pole, knee);
        setSeg(this.legMeshes[i * 2], hip, knee, 0.07 * Math.max(1, this.scaleV)); setSeg(this.legMeshes[i * 2 + 1], knee, f.at, 0.06 * Math.max(1, this.scaleV));
      });
    }
    if (this.proc === 'blob') { const v = this.pulseT > 0 ? 1 : 0; const [a, b] = this.squash.scale(); this.body.scale.set(a * this.scaleV * (1 + v * 0.3), b * this.scaleV * (1 + v * 0.3), a * this.scaleV * (1 + v * 0.3)); }
  }
  update(dt, x, z, facing, moving, o = {}) {
    this.t += dt;
    const vx = (x - this.prevX) / Math.max(dt, 1e-3); const vz = (z - this.prevZ) / Math.max(dt, 1e-3);
    this.prevX = x; this.prevZ = z;
    const sp = dt > 0 ? Math.hypot(vx, vz) : 0; this.speed += (sp - this.speed) * Math.min(1, dt * 12);
    let y = o.y ?? 0;
    if (this.hover) y += this.hover + Math.sin(this.t * 3 + (this.o.phase ?? 0)) * 0.1;
    this.root.position.set(x, y, z);
    // Turn smoothly toward the facing.
    let da = facing - this.root.rotation.y; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    this.root.rotation.y += da * Math.min(1, dt * 16);
    if (this.mixer) {
      const walk = this.o.walkClip ?? 'Walk'; const run = this.o.runClip ?? 'Run';
      const s = o.speedOverride ?? this.speed;
      if (s > 3.2) this.setLoco(run, Math.max(0.5, s / 6)); else if (s > 0.25) this.setLoco(walk, Math.max(0.5, s / (walk === 'Shamble' ? 1.4 : 2))); else this.setLoco(this.o.idleClip ?? 'Idle');
      if (this.oneT > 0) { this.oneT -= dt; if (this.oneT <= 0 && this.oneShot) { this.oneShot.fadeOut(0.12); this.oneShot = null; } }
      if (this.upperT > 0) { this.upperT -= dt; if (this.upperT <= 0 && this.upper) { this.upper.fadeOut(0.1); this.upper = null; } }
      this.mixer.update(dt);
    } else {
      if (this.pulseT > 0) this.pulseT -= dt;
      this.squash.update(dt);
      if (!this.proc) { const [a, b] = this.squash.scale(); this.body.scale.set(a * this.scaleV, b * this.scaleV, a * this.scaleV); }
      this.updateProc(dt, x, z, this.root.rotation.y, vx, vz);
    }
    // Flash on hit: swap to one shared glow material for two frames.
    if (this.flashN > 0) { this.flashN--; const white = glowMaterial(PALETTE.white); if (!this.flashing) { this.flashing = true; for (const m of this.meshes) m.material = white; } } else if (this.flashing) { this.flashing = false; this.meshes.forEach((m, i) => { m.material = this.mats[i]; }); }
    if (this.shadow) this.shadow.place(x, 0, z, y);
    if (this.ring) this.ring.position.set(x, 0.04, z);
  }
  addRing(colorName, r = 1) {
    const m = new Mesh(ringGeo, glowMaterial(PALETTE[colorName])); m.scale.setScalar(r); m.position.y = 0.04; this.ctx.scene.add(m); this.ring = m; return m;
  }
  attach(jointName, modelId, o = {}) {
    const j = this.body.getObjectByName(jointName); if (!j) return null;
    const b = buildModel(modelId, { catalog: MODELS, ...(o.palette ? { palette: o.palette } : {}) });
    b.object.position.set(...(o.at ?? [0, 0, 0])); b.object.rotation.set(...(o.rot ?? [0, 0, 0]).map((d) => (d * Math.PI) / 180)); b.object.scale.setScalar(o.scale ?? 1);
    b.object.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; this.meshes.push(m); this.mats.push(m.material); } });
    setLookLayer(b.object, 'actors');
    j.add(b.object);
    return b.object;
  }
  detach(obj) { if (!obj) return; obj.traverse((m) => { if (m.isMesh) { const i = this.meshes.indexOf(m); if (i >= 0) { this.meshes.splice(i, 1); this.mats.splice(i, 1); } } }); obj.parent?.remove(obj); }
  dispose() {
    const { scene } = this.ctx;
    scene.remove(this.root); if (this.shadow) scene.remove(this.shadow); if (this.ring) scene.remove(this.ring);
    if (this.legMeshes) for (const m of this.legMeshes) scene.remove(m);
    if (this.mixer) this.mixer.stopAllAction();
    if (this.doll) { this.doll.disable(); this.doll = null; }
    if (this.bellChain) { this.bellChain.dispose(); this.bellChain = null; }
  }
}
const up = new Vector3(0, 1, 0); const tmp = new Vector3();
export function setSeg(mesh, a, b, w) {
  const dx = b[0] - a[0]; const dy = b[1] - a[1]; const dz = b[2] - a[2]; const L = Math.hypot(dx, dy, dz) || 0.01;
  mesh.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); mesh.scale.set(w, L, w);
  tmp.set(dx / L, dy / L, dz / L); mesh.quaternion.setFromUnitVectors(up, tmp);
}

// The Bellwarden's great bell really hangs: a SpringChain from the hand, with the bell on its end.
export class BellChain {
  constructor(ctx, actor) {
    this.ctx = ctx; this.actor = actor; this.spring = new SpringChain({ segments: 3, length: 0.2, rest: [0, -1, 0], stiffness: 9, keep: 0.93, gravity: 9 });
    const mat = toonMaterial(PALETTE.mist); this.links = [0, 1, 2].map(() => { const m = new Mesh(limbGeo, mat); m.castShadow = true; setLookLayer(m, 'actors'); ctx.scene.add(m); return m; });
    const b = buildModel('hand_bell', { catalog: MODELS }); this.bell = b.object; this.bell.scale.setScalar(0.62); this.bell.traverse((m) => { if (m.isMesh) { m.castShadow = true; actor.meshes.push(m); actor.mats.push(m.material); } }); setLookLayer(this.bell, 'actors'); ctx.scene.add(this.bell);
    this.hand = actor.body.getObjectByName('HandR'); this.root = [0, 0, 0]; this.v = new Vector3();
    this.basis = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  }
  update(dt) {
    if (dt <= 0) return;
    this.actor.root.updateMatrixWorld(true); this.hand.getWorldPosition(this.v); this.root[0] = this.v.x; this.root[1] = this.v.y; this.root[2] = this.v.z;
    this.spring.update(dt, this.root, this.basis); const pts = this.spring.points;
    for (let i = 0; i < 3; i++) setSeg(this.links[i], pts[i], pts[i + 1], 0.05);
    const tip = pts[3]; const prev = pts[2]; const dx = tip[0] - prev[0]; const dz = tip[2] - prev[2];
    this.bell.position.set(tip[0], Math.max(0.05, tip[1] - 0.92 * 0.62), tip[2]); this.bell.rotation.set(dz * 2, 0, -dx * 2);
  }
  dispose() { const { scene } = this.ctx; for (const m of this.links) scene.remove(m); scene.remove(this.bell); }
}

// Bodies that bend: Malison's four great rope-wrapped arms.
export class MalisonArms {
  constructor(ctx) {
    this.ctx = ctx; this.arms = []; const mat = toonMaterial(PALETTE.orange); const mat2 = toonMaterial(PALETTE.slate);
    for (let i = 0; i < 4; i++) {
      const chain = new SpringChain({ segments: 7, length: 1.1, stiffness: 18, damping: 0.86, gravity: 2 });
      const segs = []; for (let s = 0; s < 7; s++) { const m = new Mesh(limbGeo, s % 2 ? mat : mat2); m.castShadow = true; setLookLayer(m, 'actors'); ctx.scene.add(m); segs.push(m); }
      this.arms.push({ chain, segs, side: i < 2 ? -1 : 1, hi: i % 2, strike: 0, tx: 0, tz: 0 });
    }
  }
  lash(i, tx, tz) { const a = this.arms[i % 4]; a.strike = 0.9; a.tx = tx; a.tz = tz; }
  update(dt, x, y, z, yaw, t) {
    for (const a of this.arms) {
      const root = [x + Math.cos(yaw) * a.side * 1.3, y + 2.6 + a.hi * 0.9, z - Math.sin(yaw) * a.side * 1.3];
      let dirx = Math.cos(yaw) * a.side * 0.8 + Math.sin(t * 1.4 + a.hi) * 0.2; let dirz = -Math.sin(yaw) * a.side * 0.8 + Math.cos(t + a.side) * 0.2; let diry = -0.25 + Math.sin(t * 1.9 + a.side) * 0.15;
      if (a.strike > 0) { a.strike -= dt; const dx = a.tx - root[0]; const dz = a.tz - root[2]; const d = Math.hypot(dx, dz) || 1; dirx = dx / d; dirz = dz / d; diry = -0.3; }
      const L = Math.hypot(dirx, diry, dirz) || 1; const fwd = [dirx / L, diry / L, dirz / L];
      const right = [fwd[2], 0, -fwd[0]]; const upv = [0, 1, 0];
      a.chain.update(dt, root, [right, upv, fwd]);
      for (let s = 0; s < a.segs.length; s++) setSeg(a.segs[s], a.chain.points[s], a.chain.points[s + 1], 0.55 - s * 0.05);
    }
  }
  dispose() { for (const a of this.arms) for (const s of a.segs) this.ctx.scene.remove(s); }
}
export { HERO_RAGDOLL, Ragdoll, MONSTERS, rarityTier, HELMS, PAULS, SEAT_HEX, ELITE_COLORS, disposeObject, CylinderGeometry };
for (const d of [...HELMS, ...PAULS]) MODELS.add(d);
