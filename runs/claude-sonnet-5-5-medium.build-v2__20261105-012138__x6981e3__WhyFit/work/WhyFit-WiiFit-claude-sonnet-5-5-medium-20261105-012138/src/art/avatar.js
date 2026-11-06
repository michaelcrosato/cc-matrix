// Avatars: the kit's hero re-dressed (egg heads, dot eyes, hair), driven by an AnimationMixer, leaning with the Dot.
import { THREE, toonMaterial, PALETTE, HERO_MODEL, HERO_RIG, HERO_CLIPS, compileClips, setLookLayer, ContactShadow, SpringChain } from '../../pixel-engine.js';
import { NEW_CLIPS, jogGait } from './clips.js';
import { gaitClip } from '../../pixel-engine.js';

const { Vector3, SphereGeometry, CylinderGeometry, BoxGeometry, Mesh, Group, AnimationMixer, LoopRepeat, LoopOnce } = THREE;

export const PLAYER_LOOKS = [
  { skin: 'sand', top: 'white', bottom: 'sky', shoe: 'white', hair: 'ink', headband: 'red' },
  { skin: 'orange', top: 'lime', bottom: 'navy', shoe: 'white', hair: 'ink', style: 'spike' },
  { skin: 'red', top: 'sky', bottom: 'slate', shoe: 'ink', hair: 'plum', style: 'long' },
  { skin: 'plum', top: 'orange', bottom: 'white', shoe: 'white', hair: 'ink', style: 'bun' },
  { skin: 'sand', top: 'plum', bottom: 'ink', shoe: 'sand', hair: 'orange', style: 'spike', headband: 'white' },
  { skin: 'orange', top: 'cyan', bottom: 'cyan', shoe: 'white', hair: 'mist', style: 'long' },
];
export const NPC_LOOKS = {
  coach: { skin: 'sand', top: 'cyan', bottom: 'cyan', shoe: 'white', hair: 'mist', bun: true, long: true },
  marguerite: { skin: 'orange', top: 'plum', bottom: 'plum', shoe: 'white', hair: 'mist', style: 'bun', long: true },
  dennis: { skin: 'red', top: 'orange', bottom: 'blue', shoe: 'white', hair: 'ink', style: 'spike', headband: 'orange' },
  june: { skin: 'sand', top: 'green', bottom: 'navy', shoe: 'white', hair: 'ink', style: 'long' },
  judge: { skin: 'sand', top: 'white', bottom: 'slate', shoe: 'ink', hair: 'slate', style: 'bun' },
};
export const SKINS = ['sand', 'orange', 'red', 'plum'];
export const HAIR_COLORS = ['ink', 'plum', 'orange', 'mist', 'sand', 'red'];
export const HAIR_STYLES = ['cap', 'spike', 'long', 'bun', 'bald'];
export const TOPS = ['white', 'lime', 'sky', 'orange', 'plum', 'cyan', 'red', 'green'];
export const BOTTOMS = ['sky', 'navy', 'slate', 'white', 'ink', 'cyan', 'plum'];
export const HEADBANDS = [null, 'red', 'white', 'orange', 'sky', 'sand', 'lime'];

function soften(mesh, kind = 'prism') {
  mesh.geometry.computeBoundingBox();
  const b = mesh.geometry.boundingBox, s = b.getSize(new Vector3()), c = b.getCenter(new Vector3());
  const g = kind === 'egg' ? new SphereGeometry(0.5, 10, 8) : new CylinderGeometry(0.5, 0.5, 1, 8);
  g.scale(s.x, s.y, s.z); g.translate(c.x, c.y, c.z); mesh.geometry = g;
}
export function dress(root, look) {
  const hide = new Set(['Moustache', 'ButtonR', 'ButtonL', 'Hat', 'Brim', 'Eyes', 'Nose']);
  const SLOT = { Overalls: 'bottom', ThighR: 'bottom', ThighL: 'bottom', ShinR_Mesh: look.long ? 'bottom' : 'skin', ShinL_Mesh: look.long ? 'bottom' : 'skin',
    Shirt: 'top', SleeveR: 'top', SleeveL: 'top', ForearmR_Mesh: look.long ? 'top' : 'skin', ForearmL_Mesh: look.long ? 'top' : 'skin',
    GloveR: 'skin', GloveL: 'skin', Face: 'skin', ShoeR: 'shoe', ShoeL: 'shoe' };
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (hide.has(o.name)) { o.visible = false; return; }
    if (SLOT[o.name]) o.material = toonMaterial(PALETTE[look[SLOT[o.name]]]);
    if (o.name === 'Face') soften(o, 'egg'); else if (/Sleeve|Forearm|Thigh|Shin|Glove/.test(o.name)) soften(o);
  });
  const face = root.getObjectByName('Face'); face.geometry.computeBoundingBox();
  const fb = face.geometry.boundingBox, size = fb.getSize(new Vector3()), c = fb.getCenter(new Vector3());
  const add = (m, x, y, z) => { m.position.set(x, y, z); face.parent.add(m); return m; };
  const ink = toonMaterial(PALETTE.ink);
  for (const sx of [-1, 1]) add(new Mesh(new BoxGeometry(0.055, 0.09, 0.03), ink), c.x + sx * size.x * 0.2, c.y + 0.02, c.z + size.z * 0.48);
  add(new Mesh(new BoxGeometry(0.1, 0.022, 0.03), ink), c.x, c.y - size.y * 0.2, c.z + size.z * 0.47);
  const style = look.style ?? 'cap', hairMat = toonMaterial(PALETTE[look.hair]);
  if (style !== 'bald') {
    const hair = add(new Mesh(new SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI * (style === 'long' ? 0.62 : 0.55)), hairMat), c.x, c.y + size.y * 0.04, c.z - size.z * 0.05);
    hair.scale.set(size.x * 1.08, size.y * 1.04, size.z * 1.08);
  }
  if (style === 'long') { const b = add(new Mesh(new BoxGeometry(1, 1, 1), hairMat), c.x, c.y - size.y * 0.12, c.z - size.z * 0.38); b.scale.set(size.x * 0.95, size.y * 0.8, size.z * 0.22); }
  if (style === 'spike') for (let i = -1; i <= 1; i++) { const sp = add(new Mesh(new CylinderGeometry(0, 0.5, 1, 4), hairMat), c.x + i * size.x * 0.28, c.y + size.y * 0.58, c.z - size.z * 0.05); sp.scale.set(size.x * 0.3, size.y * 0.4, size.z * 0.3); }
  if (look.bun || style === 'bun') add(new Mesh(new SphereGeometry(0.1, 8, 6), hairMat), c.x, c.y + size.y * 0.6, c.z - size.z * 0.2);
  if (look.cape) { const tor = root.getObjectByName('Torso'); if (tor) { const cp = new Mesh(new BoxGeometry(0.5, 0.7, 0.05), toonMaterial(PALETTE.white)); cp.position.set(0, 0.15, -0.2); cp.rotation.x = 0.12; tor.add(cp); const st = new Mesh(new BoxGeometry(0.5, 0.08, 0.06), toonMaterial(PALETTE.red)); st.position.set(0, 0.35, -0.2); tor.add(st); } }
  if (look.badge) { const tor = root.getObjectByName('Torso'); if (tor) { const bd = new Mesh(new CylinderGeometry(0.07, 0.07, 0.03, 8), toonMaterial(PALETTE.sand)); bd.rotation.x = Math.PI / 2; bd.position.set(0.12, 0.22, 0.22); tor.add(bd); } }
  if (look.headband) { const b2 = add(new Mesh(new CylinderGeometry(0.5, 0.5, 1, 10), toonMaterial(PALETTE[look.headband])), c.x, c.y + size.y * 0.16, c.z); b2.scale.set(size.x * 1.06, 0.06, size.z * 1.06); }
}

let clipsCache = null;
/** Compile the hero clips plus ours once, share between avatars. */
export function compileAll(model) {
  if (clipsCache) return clipsCache;
  const defs = [...HERO_CLIPS, ...NEW_CLIPS, jogGait(gaitClip)];
  const list = compileClips(defs, HERO_RIG, model);
  clipsCache = { map: Object.fromEntries(list.map((c) => [c.name, c])), defs: Object.fromEntries(defs.map((d) => [d.name, d])) };
  return clipsCache;
}

export const clipNames = () => (clipsCache ? Object.keys(clipsCache.map) : []);
export class Avatar {
  constructor(model, clips, look) {
    this.root = new Group(); this.model = model; this.root.add(model);
    this.clips = clips; this.look = look;
    this.mixer = new AnimationMixer(model);
    this.actions = {}; this.cur = null; this.curName = '';
    this.torso = model.getObjectByName('Torso'); this.pelvis = model.getObjectByName('Pelvis');
    this.head = model.getObjectByName('Head');
    this.shadow = new ContactShadow(0.45);
    this.lean = { x: 0, y: 0, outside: 0 }; this.teeterW = 0; this.t = 0;
    this.speed = 1;
  }
  action(name) {
    let a = this.actions[name];
    if (!a) { const c = this.clips.map[name]; if (!c) throw new Error('no clip ' + name); a = this.actions[name] = this.mixer.clipAction(c); }
    return a;
  }
  play(name, { fade = 0.2, loop = true, timeScale = 1, restart = false } = {}) {
    if (this.curName === name && !restart) { this.cur.timeScale = timeScale; return this.cur; }
    const next = this.action(name);
    next.reset(); next.setLoop(loop ? LoopRepeat : LoopOnce, Infinity); next.clampWhenFinished = !loop; next.timeScale = timeScale; next.paused = false; next.setEffectiveWeight(1);
    if (this.cur && this.cur !== next) { next.crossFadeFrom(this.cur, fade, false); }
    next.play(); this.cur = next; this.curName = name;
    return next;
  }
  /** Scrub a clip to r in 0..1 (reps). */
  scrub(name, r) {
    if (this.curName !== name) { this.play(name, { fade: 0 }); }
    const a = this.cur; a.paused = true; a.time = Math.max(0, Math.min(1, r)) * a.getClip().duration * 0.999;
  }
  setLean(dotX, dotY, outside = 0, teeter = 0) { this.lean.x = dotX; this.lean.y = dotY; this.lean.outside = outside; this.teeterW = teeter; }
  update(dt, t = 0) {
    this.t += dt;
    if (this.teeterW > 0.02) {
      const te = this.action('Teeter'); if (!te.isRunning()) { te.reset(); te.play(); }
      te.setEffectiveWeight(this.teeterW); if (this.cur) this.cur.setEffectiveWeight(1 - this.teeterW * 0.8);
    } else if (this.actions.Teeter?.isRunning()) { this.actions.Teeter.stop(); this.cur?.setEffectiveWeight(1); }
    // undo last frame's lean so clips without a Torso/Pelvis track don't accumulate it
    if (this.torsoQ) { this.torso.quaternion.copy(this.torsoQ); this.pelvis.position.copy(this.pelvisP); }
    this.mixer.update(dt);
    if (this.torso) { this.torsoQ ??= new THREE.Quaternion(); this.pelvisP ??= new Vector3(); this.torsoQ.copy(this.torso.quaternion); this.pelvisP.copy(this.pelvis.position); }
    if (this.armsOut) { const ar = this.model.getObjectByName('ArmR'), al = this.model.getObjectByName('ArmL'); if (ar) { ar.rotation.set(0, 0, -1.45); } if (al) { al.rotation.set(0, 0, 1.45); } }
    const L = this.lean;
    if (this.torso) {
      this.torso.rotateZ(-L.x * 0.18); this.torso.rotateX(-L.y * 0.12);
      if (L.outside > 0) { const tr = L.outside * 0.06; this.torso.rotateZ(Math.sin(this.t * 31) * tr); this.torso.rotateX(Math.sin(this.t * 27 + 1) * tr); }
    }
    if (this.pelvis) this.pelvis.position.x += L.x * 0.05;
    this.shadow.place(this.root.position.x, this.root.position.y, this.root.position.z, 0);
  }
  addTo(scene) { scene.add(this.root, this.shadow); return this; }
  setPos(x, y, z, yaw = 0) { this.root.position.set(x, y, z); this.root.rotation.y = yaw; }
}
export async function makeAvatar(ctx, look, { scale = 1 } = {}) {
  const m = (await ctx.loadModel(HERO_MODEL, { castShadow: false })).scene;
  dress(m, look);
  setLookLayer(m, 'actors');
  const clips = compileAll(m);
  const a = new Avatar(m, clips, look);
  a.root.scale.setScalar(scale);
  return a;
}
export { SpringChain };
/** The player's look: the chosen preset plus Locker Room overrides and unlocks. */
export const playerLook = (S) => ({ ...PLAYER_LOOKS[S?.avatar ?? 0], ...(S?.look ?? {}) });
