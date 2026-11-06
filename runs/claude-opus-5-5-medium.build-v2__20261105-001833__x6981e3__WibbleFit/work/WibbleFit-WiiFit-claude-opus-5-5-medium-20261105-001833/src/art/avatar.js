// Avatars: the kit's hero re-dressed. Same rig, softer shapes. Clips compiled once and shared.
import { compileClips, ContactShadow, HERO_MODEL, HERO_RIG, PALETTE, setLookLayer, SpringChain, Squash, THREE, toonMaterial } from '../../pixel-engine.js';
import { ALL_CLIPS, clipIndex, CLIP_NAMES } from './clips.js';
const { AnimationMixer, BoxGeometry, ConeGeometry, CylinderGeometry, LoopOnce, LoopRepeat, Mesh, Quaternion, SphereGeometry, TorusGeometry, Vector3 } = THREE;

function soften(mesh, kind = 'prism') { // same bounding box, softer shape
  mesh.geometry.computeBoundingBox();
  const b = mesh.geometry.boundingBox, s = b.getSize(new Vector3()), c = b.getCenter(new Vector3());
  const g = kind === 'egg' ? new SphereGeometry(0.5, 10, 8) : new CylinderGeometry(0.5, 0.5, 1, 8);
  g.scale(s.x, s.y, s.z); g.translate(c.x, c.y, c.z); mesh.geometry = g;
}
const mat = (n) => toonMaterial(PALETTE[n]);
export function dress(root, look) {
  const hide = new Set(['Moustache', 'ButtonR', 'ButtonL', 'Hat', 'Brim', 'Eyes', 'Nose']);
  const SLOT = { Overalls: 'bottom', ThighR: 'bottom', ThighL: 'bottom', ShinR_Mesh: look.long ? 'bottom' : 'skin', ShinL_Mesh: look.long ? 'bottom' : 'skin',
    Shirt: 'top', SleeveR: 'top', SleeveL: 'top', ForearmR_Mesh: look.long ? 'top' : 'skin', ForearmL_Mesh: look.long ? 'top' : 'skin',
    GloveR: 'skin', GloveL: 'skin', Face: 'skin', ShoeR: 'shoe', ShoeL: 'shoe' };
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (hide.has(o.name)) { o.visible = false; return; }
    if (SLOT[o.name]) o.material = mat(look[SLOT[o.name]]);
    if (o.name === 'Face') soften(o, 'egg'); else if (/Sleeve|Forearm|Thigh|Shin|Glove/.test(o.name)) soften(o);
  });
  const face = root.getObjectByName('Face'); face.geometry.computeBoundingBox();
  const fb = face.geometry.boundingBox, size = fb.getSize(new Vector3()), c = fb.getCenter(new Vector3());
  const add = (m, x, y, z) => { m.position.set(x, y, z); face.parent.add(m); return m; };
  for (const sx of [-1, 1]) add(new Mesh(new BoxGeometry(0.055, 0.09, 0.03), mat('ink')), c.x + sx * size.x * 0.2, c.y + 0.02, c.z + size.z * 0.48);
  add(new Mesh(new BoxGeometry(0.1, 0.022, 0.03), mat('ink')), c.x, c.y - size.y * 0.2, c.z + size.z * 0.47);
  const style = look.style ?? 'cap';
  const hairMat = mat(look.hair);
  if (style !== 'bald') {
    const hair = add(new Mesh(new SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat), c.x, c.y + size.y * 0.04, c.z - size.z * 0.05);
    hair.scale.set(size.x * 1.08, size.y * 1.04, size.z * 1.08);
  }
  if (look.bun || style === 'bun') add(new Mesh(new SphereGeometry(0.1, 8, 6), hairMat), c.x, c.y + size.y * 0.6, c.z - size.z * 0.2);
  if (style === 'long') { const l = add(new Mesh(new BoxGeometry(size.x * 0.95, size.y * 0.9, 0.08), hairMat), c.x, c.y - size.y * 0.32, c.z - size.z * 0.44); l.name = 'hairLong'; }
  if (style === 'spike') for (const a of [-1, 0, 1]) { const m = add(new Mesh(new ConeGeometry(0.05, 0.16, 5), hairMat), c.x + a * size.x * 0.2, c.y + size.y * 0.58, c.z); m.rotation.z = -a * 0.3; }
  if (style === 'curl') for (const [dx, dz] of [[-0.3, 0], [0.3, 0], [0, -0.3], [-0.2, -0.2], [0.2, -0.2], [0, 0.15]]) add(new Mesh(new SphereGeometry(0.07, 6, 5), hairMat), c.x + dx * size.x, c.y + size.y * 0.42, c.z + dz * size.z);
  if (look.headband && look.headband !== 'none') { const b2 = add(new Mesh(new CylinderGeometry(0.5, 0.5, 1, 10), mat(look.headband)), c.x, c.y + size.y * 0.16, c.z); b2.scale.set(size.x * 1.06, 0.06, size.z * 1.06); }
  if (look.items) dressItems(root, look, { add, c, size });
}
function dressItems(root, look, { add, c, size }) {
  const it = new Set(look.items);
  if (it.has('band2')) { const b = add(new Mesh(new CylinderGeometry(0.5, 0.5, 1, 10), mat('lime')), c.x, c.y + size.y * 0.3, c.z); b.scale.set(size.x * 1.04, 0.05, size.z * 1.04); }
  if (it.has('visor')) add(new Mesh(new BoxGeometry(size.x * 0.9, 0.03, 0.18), mat('sky')), c.x, c.y + size.y * 0.3, c.z + size.z * 0.55);
  const torso = root.getObjectByName('Torso');
  if (torso && it.has('cape')) { const m = new Mesh(new BoxGeometry(0.42, 0.62, 0.05), mat('white')); m.position.set(0, 0.05, -0.2); m.rotation.x = 0.12; torso.add(m); }
  if (torso && it.has('confidence')) { /* Confidence: no visible effect. That is the item. */ }
  if (torso && it.has('whistle')) { const m = new Mesh(new BoxGeometry(0.07, 0.07, 0.07), mat('sand')); m.position.set(0, 0.12, 0.2); torso.add(m); }
  for (const h of ['ForearmR', 'ForearmL']) { const f = root.getObjectByName(h); if (f && it.has('wristbands')) { const m = new Mesh(new CylinderGeometry(0.075, 0.075, 0.07, 8), mat('red')); m.position.set(0, -0.2, 0); f.add(m); } }
  const hand = root.getObjectByName('HandL');
  if (hand && it.has('plumbbob')) { const m = new Mesh(new ConeGeometry(0.05, 0.12, 6), mat('sand')); m.rotation.x = Math.PI; m.position.set(0, -0.28, 0); hand.add(m); }
}

let CLIPS = null;
export const compiledClips = (root) => (CLIPS ??= compileClips(ALL_CLIPS, HERO_RIG, root));

export class Avatar {
  fade = 0.18; current = ''; shadowR = 0.42; sq = new Squash(); lean = { x: 0, y: 0 }; trem = 0; outside = 0; time = 0; pelvisOff = { x: 0, z: 0 }; layered = false; savedTorso = new Quaternion(); savedHead = new Quaternion(); savedPelvis = new Vector3();
  constructor(root, ctx) {
    this.root = root; this.ctx = ctx;
    this.mixer = new AnimationMixer(root); this.actions = {};
    this.clips = compiledClips(root);
    this.pelvis = root.getObjectByName('Pelvis'); this.torso = root.getObjectByName('Torso'); this.head = root.getObjectByName('Head');
    this.shadow = new ContactShadow(this.shadowR);
    setLookLayer(root, 'actors');
    ctx.scene.add(root, this.shadow);
    this.play('Idle');
  }
  action(name) { return this.actions[name] ??= this.mixer.clipAction(this.clips[clipIndex[name]]); }
  play(name, { fade = this.fade, once = false, speed = 1 } = {}) {
    if (this.current === name && !once) { this.action(name).timeScale = speed; return this.action(name); }
    const a = this.action(name), prev = this.current && this.actions[this.current];
    a.reset(); a.paused = false; a.enabled = true; a.timeScale = speed;
    a.setLoop(once ? LoopOnce : LoopRepeat, once ? 1 : Infinity); a.clampWhenFinished = once;
    a.play();
    if (prev && prev !== a) { prev.crossFadeTo(a, fade, false); } else a.setEffectiveWeight(1);
    this.current = name;
    return a;
  }
  // You scrub the animation with the stick.
  scrub(name, r) {
    const a = this.play(name, { fade: 0.1 });
    a.paused = true; a.time = Math.max(0, Math.min(0.9999, r)) * a.getClip().duration;
  }
  setAt(x, y, z, yaw = 0) { this.root.position.set(x, y, z); this.root.rotation.y = yaw; this.baseY = y; }
  clipState() { const a = this.actions[this.current]; return { c: clipIndex[this.current] ?? 0, t: a ? +a.time.toFixed(2) : 0 }; }
  setClipState(c, t) { const n = CLIP_NAMES[c]; if (!n) return; const a = this.play(n); if (Math.abs(a.time - t) > 0.3) a.time = t; }
  update(dt) {
    this.time += dt;
    // Additive layers go on top of the clip, and come off again before the next frame:
    // a clip that doesn't key a joint would otherwise let them pile up.
    if (this.layered) { this.torso?.quaternion.copy(this.savedTorso); this.head?.quaternion.copy(this.savedHead); this.pelvis?.position.copy(this.savedPelvis); }
    this.mixer.update(dt);
    this.sq.update(dt);
    const [h, v] = this.sq.scale(); this.root.scale.set(h, v, h);
    if (this.torso) {
      this.savedTorso.copy(this.torso.quaternion); this.savedHead.copy(this.head.quaternion); this.savedPelvis.copy(this.pelvis.position); this.layered = true;
      // Body language: the Dot goes on top of whatever the clip says.
      if (this.lean.x || this.lean.y) {
        this.torso.rotateZ(-this.lean.x * 0.18); this.torso.rotateX(-this.lean.y * 0.12);
        this.pelvis.position.x += this.lean.x * 0.05;
      }
      if (this.trem > 0) { this.torso.rotateZ(Math.sin(this.time * 41) * 0.03 * this.trem); this.head.rotateZ(Math.sin(this.time * 37) * 0.04 * this.trem); }
      this.pelvis.position.x += this.pelvisOff.x; this.pelvis.position.z += this.pelvisOff.z;
    }
    this.shadow.place(this.root.position.x, this.groundY ?? 0, this.root.position.z, Math.max(0, this.root.position.y - (this.groundY ?? 0)));
  }
}
export async function makeAvatar(ctx, look) {
  const m = await ctx.loadModel(HERO_MODEL, { castShadow: false });
  dress(m.scene, look);
  return new Avatar(m.scene, ctx);
}
// Coach's plumb bob: a string from her wrist, on a spring chain.
export class PlumbBob {
  constructor(ctx, avatar) {
    this.a = avatar;
    this.chain = new SpringChain({ segments: 4, length: 0.09, rest: [0, -1, 0], stiffness: 6, gravity: 8 });
    this.links = this.chain.points.slice(1).map((_, i) => { const m = new Mesh(new BoxGeometry(0.03, 0.09, 0.03), mat('slate')); ctx.scene.add(m); return m; });
    this.bob = new Mesh(new ConeGeometry(0.07, 0.17, 6), mat('sand')); this.bob.rotation.x = Math.PI; ctx.scene.add(this.bob);
    this.hand = avatar.root.getObjectByName('HandR'); this.v = new Vector3(); this.q = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    if (this.hand) { this.hand.updateWorldMatrix(true, false); this.hand.getWorldPosition(this.v); this.chain.reset([this.v.x, this.v.y, this.v.z], this.q); }
  }
  update(dt) {
    if (!this.hand) return;
    this.hand.updateWorldMatrix(true, false); this.hand.getWorldPosition(this.v);
    this.chain.update(dt, [this.v.x, this.v.y - 0.08, this.v.z], this.q);
    this.chain.points.slice(1).forEach((p, i) => this.links[i].position.set(p[0], p[1], p[2]));
    const e = this.chain.points[this.chain.points.length - 1]; this.bob.position.set(e[0], e[1] - 0.09, e[2]);
  }
}
export const makeHoopMesh = (r, color) => new Mesh(new TorusGeometry(r, 0.035, 5, 18).rotateX(Math.PI / 2), mat(color));
