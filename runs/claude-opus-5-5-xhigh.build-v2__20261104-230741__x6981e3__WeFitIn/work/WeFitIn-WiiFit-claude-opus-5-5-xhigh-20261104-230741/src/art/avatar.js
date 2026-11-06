// People: the kit's hero, re-dressed on the same rig. One compiled clip set, shared.
import { compileClips, ContactShadow, HERO_MODEL, HERO_RIG, PALETTE, setLookLayer, SpringChain, Squash, THREE, toonMaterial } from '../../pixel-engine.js';
import { ALL_CLIPS } from './clips.js';

const { AnimationMixer, BoxGeometry, ConeGeometry, CylinderGeometry, LoopOnce, LoopRepeat, Mesh, SphereGeometry, Vector3 } = THREE;

function soften(mesh, kind = 'prism') { // same bounding box, softer shape
  mesh.geometry.computeBoundingBox();
  const b = mesh.geometry.boundingBox, s = b.getSize(new Vector3()), c = b.getCenter(new Vector3());
  const g = kind === 'egg' ? new SphereGeometry(0.5, 10, 8) : new CylinderGeometry(0.5, 0.5, 1, 8);
  g.scale(s.x, s.y, s.z); g.translate(c.x, c.y, c.z); mesh.geometry = g;
}

const tone = (name) => toonMaterial(PALETTE[name]);

/** look: { skin, top, bottom, shoe, hair, long?, bun?, headband?, hairStyle?, cape?, band2?, wrist?, visor?, whistle?, goldShoes? } */
export function dress(root, look) {
  const hide = new Set(['Moustache', 'ButtonR', 'ButtonL', 'Hat', 'Brim', 'Eyes', 'Nose']);
  const SLOT = {
    Overalls: 'bottom', ThighR: 'bottom', ThighL: 'bottom', ShinR_Mesh: look.long ? 'bottom' : 'skin', ShinL_Mesh: look.long ? 'bottom' : 'skin',
    Shirt: 'top', SleeveR: 'top', SleeveL: 'top', ForearmR_Mesh: look.long ? 'top' : 'skin', ForearmL_Mesh: look.long ? 'top' : 'skin',
    GloveR: 'skin', GloveL: 'skin', Face: 'skin', ShoeR: 'shoe', ShoeL: 'shoe',
  };
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (hide.has(o.name)) { o.visible = false; return; }
    if (SLOT[o.name]) o.material = tone(look.goldShoes && SLOT[o.name] === 'shoe' ? 'sand' : look[SLOT[o.name]]);
    if (o.name === 'Face') soften(o, 'egg');
    else if (/Sleeve|Forearm|Thigh|Shin|Glove/.test(o.name)) soften(o);
  });
  const face = root.getObjectByName('Face');
  face.geometry.computeBoundingBox();
  const fb = face.geometry.boundingBox, size = fb.getSize(new Vector3()), c = fb.getCenter(new Vector3());
  const add = (m, x, y, z, parent = face.parent) => { m.position.set(x, y, z); parent.add(m); return m; };
  for (const sx of [-1, 1]) add(new Mesh(new BoxGeometry(0.055, 0.09, 0.03), tone('ink')), c.x + sx * size.x * 0.2, c.y + 0.02, c.z + size.z * 0.48);
  add(new Mesh(new BoxGeometry(0.1, 0.022, 0.03), tone('ink')), c.x, c.y - size.y * 0.2, c.z + size.z * 0.47);
  const style = look.hairStyle ?? 'cap';
  if (style !== 'bald') {
    const hair = add(new Mesh(new SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI * (style === 'short' ? 0.42 : 0.55)), tone(look.hair)), c.x, c.y + size.y * 0.04, c.z - size.z * 0.05);
    hair.scale.set(size.x * 1.08, size.y * 1.04, size.z * 1.08);
    if (style === 'tall') {
      const tuft = add(new Mesh(new CylinderGeometry(0.1, 0.16, 0.3, 7), tone(look.hair)), c.x, c.y + size.y * 0.62, c.z - size.z * 0.05);
      tuft.rotation.x = -0.2;
    } else if (style === 'side') {
      add(new Mesh(new BoxGeometry(size.x * 0.32, size.y * 0.72, size.z * 0.7), tone(look.hair)), c.x - size.x * 0.46, c.y - size.y * 0.02, c.z - size.z * 0.1);
    }
  }
  if (look.bun || style === 'bun') add(new Mesh(new SphereGeometry(0.1, 8, 6), tone(look.hair)), c.x, c.y + size.y * 0.6, c.z - size.z * 0.2);
  const bandAt = (color, y) => {
    const b2 = add(new Mesh(new CylinderGeometry(0.5, 0.5, 1, 10), tone(color)), c.x, c.y + y, c.z);
    b2.scale.set(size.x * 1.06, 0.06, size.z * 1.06);
  };
  if (look.headband) bandAt(look.headband, size.y * 0.16);
  if (look.band2) bandAt(look.band2, size.y * 0.3);
  if (look.visor) {
    const v = add(new Mesh(new BoxGeometry(size.x * 0.9, 0.04, size.z * 0.5), tone('cyan')), c.x, c.y + size.y * 0.24, c.z + size.z * 0.6);
    v.rotation.x = 0.2;
  }
  const shirt = root.getObjectByName('Shirt');
  if (shirt && (look.cape || look.whistle)) {
    shirt.geometry.computeBoundingBox();
    const sb = shirt.geometry.boundingBox, ss = sb.getSize(new Vector3()), sc = sb.getCenter(new Vector3());
    if (look.cape) {
      const cape = add(new Mesh(new BoxGeometry(ss.x * 1.1, ss.y * 1.7, 0.05), tone('white')), sc.x, sc.y - ss.y * 0.4, sc.z - ss.z * 0.62, shirt.parent);
      cape.rotation.x = 0.1;
    }
    if (look.whistle) add(new Mesh(new BoxGeometry(0.08, 0.08, 0.05), tone('sand')), sc.x, sc.y + ss.y * 0.12, sc.z + ss.z * 0.56, shirt.parent);
  }
  if (look.wrist) {
    for (const n of ['ForearmR_Mesh', 'ForearmL_Mesh']) {
      const f = root.getObjectByName(n);
      if (!f) continue;
      f.geometry.computeBoundingBox();
      const fbb = f.geometry.boundingBox, fs = fbb.getSize(new Vector3()), fc = fbb.getCenter(new Vector3());
      const w = add(new Mesh(new CylinderGeometry(0.5, 0.5, 1, 8), tone('red')), fc.x, fc.y - fs.y * 0.3, fc.z, f.parent);
      w.scale.set(fs.x * 1.2, fs.y * 0.24, fs.z * 1.2);
    }
  }
}

let compiled = null;
export function clipsFor(model) {
  if (!compiled) compiled = compileClips(ALL_CLIPS, HERO_RIG, model);
  return compiled;
}

export class Avatar {
  feet = new Vector3();
  yaw = 0;

  constructor(ctx, root, look) {
    this.ctx = ctx;
    this.root = root;
    this.look = look;
    this.mixer = new AnimationMixer(root);
    this.clips = new Map(clipsFor(root).map((c) => [c.name, c]));
    this.actions = new Map();
    this.current = null;
    this.torso = root.getObjectByName('Torso');
    this.pelvis = root.getObjectByName('Pelvis');
    this.head = root.getObjectByName('Head');
    this.squash = new Squash();
    this.flash = 0;
  }

  action(name) {
    let a = this.actions.get(name);
    if (!a) {
      const clip = this.clips.get(name);
      if (!clip) throw new Error(`no clip ${name}`);
      a = this.mixer.clipAction(clip);
      this.actions.set(name, a);
    }
    return a;
  }

  play(name, { fade = 0.2, once = false, timeScale = 1, then = null } = {}) {
    const a = this.action(name);
    if (this.current === a && !once) { a.timeScale = timeScale; return a; }
    a.paused = false;
    a.enabled = true;
    a.timeScale = timeScale;
    a.reset();
    a.setLoop(once ? LoopOnce : LoopRepeat, once ? 1 : Infinity);
    a.clampWhenFinished = once;
    a.play();
    if (this.current && this.current !== a) this.current.crossFadeTo(a, fade, false);
    this.current = a;
    this.onceThen = once ? then : null;
    this.onceClip = once ? a : null;
    return a;
  }

  /** Scrub a clip with a value 0..1. */
  scrub(name, r) {
    const a = this.action(name);
    if (this.current !== a) {
      a.reset();
      a.enabled = true;
      a.setEffectiveWeight(1);
      a.play();
      if (this.current) this.current.stop();
      this.current = a;
    }
    a.paused = true;
    a.time = Math.max(0, Math.min(1, r)) * a.getClip().duration;
  }

  /** Lean the body: the player should be able to read the Dot from it. */
  lean(x, y, tremble = 0, t = 0) {
    // Not every clip has a track on these joints, so remember the pose: update() puts it back,
    // or the lean would add up frame after frame.
    if (this.torso) (this.torsoRest ??= this.torso.quaternion.clone()).copy(this.torso.quaternion);
    if (this.pelvis) (this.pelvisRest ??= this.pelvis.position.clone()).copy(this.pelvis.position);
    this.leaned = true;
    if (this.torso) {
      this.torso.rotateZ(-x * 0.18 + Math.sin(t * 37) * tremble * 0.03);
      this.torso.rotateX(-y * 0.12 + Math.sin(t * 29) * tremble * 0.02);
    }
    if (this.pelvis) this.pelvis.position.x += x * 0.05 + Math.sin(t * 41) * tremble * 0.006;
  }

  update(dt) {
    if (this.leaned) {
      if (this.torso) this.torso.quaternion.copy(this.torsoRest);
      if (this.pelvis) this.pelvis.position.copy(this.pelvisRest);
      this.leaned = false;
    }
    this.mixer.update(dt);
    if (this.onceClip && this.onceThen && !this.onceClip.isRunning()) { const f = this.onceThen; this.onceThen = null; this.onceClip = null; f(); }
    this.squash.update(dt);
    const [h, v] = this.squash.scale();
    this.root.scale.set(h, v, h);
    if (this.shadow) this.shadow.place(this.root.position.x, this.groundY ?? 0, this.root.position.z, Math.max(0, this.root.position.y - (this.groundY ?? 0)));
    if (this.plumb) this.updatePlumb(dt);
  }

  place(x, y, z, yaw = 0) {
    this.root.position.set(x, y, z);
    this.root.rotation.y = yaw;
    this.yaw = yaw;
    this.groundY = y;
    return this;
  }

  /** Coach's plumb bob: a spring chain from her wrist that hangs dead true. */
  addPlumb() {
    const chain = new SpringChain({ segments: 5, length: 0.11, rest: [0, -1, 0], stiffness: 2, keep: 0.96, gravity: 9 });
    const parts = [];
    const string = toonMaterial(PALETTE.slate);
    for (let i = 0; i < 5; i++) { const m = new Mesh(new BoxGeometry(0.03, 0.11, 0.03), string); parts.push(m); this.ctx.scene.add(m); }
    const bob = new Mesh(new ConeGeometry(0.075, 0.18, 7), toonMaterial(PALETTE.red));
    bob.rotation.x = Math.PI;
    this.ctx.scene.add(bob);
    setLookLayer(bob, 'actors');
    this.plumb = { chain, parts, bob, hand: this.root.getObjectByName('HandR') ?? this.root, at: new Vector3(), started: false };
  }

  updatePlumb(dt) {
    const p = this.plumb;
    p.hand.getWorldPosition(p.at);
    const root = [p.at.x, p.at.y, p.at.z];
    const basis = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    if (!p.started) { p.chain.reset(root, basis); p.started = true; }
    p.chain.update(Math.min(dt, 1 / 30), root, basis);
    const pts = p.chain.points;
    for (let i = 0; i < p.parts.length; i++) {
      const a = pts[i], b = pts[i + 1];
      p.parts[i].position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    }
    const end = pts[pts.length - 1];
    p.bob.position.set(end[0], end[1] - 0.08, end[2]);
  }
}

/** Make a dressed avatar. */
export async function makeAvatar(ctx, look, { shadow = true, at = [0, 0, 0], yaw = 0, clip = 'Idle' } = {}) {
  const root = (await ctx.loadModel(HERO_MODEL, { castShadow: false })).scene;
  dress(root, look);
  setLookLayer(root, 'actors');
  ctx.scene.add(root);
  const a = new Avatar(ctx, root, look);
  if (shadow) { a.shadow = new ContactShadow(0.42); ctx.scene.add(a.shadow); }
  a.place(at[0], at[1], at[2], yaw);
  if (clip) a.play(clip, { fade: 0 });
  return a;
}
