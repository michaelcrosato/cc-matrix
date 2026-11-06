// Talking heads: built from slab outlines with pivots for head, mouth, brows and lids.
import { buildModel, PALETTE, setLookLayer, THREE, toonMaterial } from '../../pixel-engine.js';
import { CAST } from '../content/cast.js';
import { bustDef, CATALOG } from '../content/models/index.js';

const POSES = {
  neutral: { brow: 0, browY: 0, lid: 0, mouth: 1, tilt: 0, sweat: 0, blush: 0, tear: 0 },
  stern: { brow: 22, browY: -0.03, lid: 0.2, mouth: 0.8, tilt: -0.04 },
  shock: { brow: -18, browY: 0.07, lid: -0.3, mouth: 2.2, tilt: 0.06, sweat: 1 },
  sad: { brow: -26, browY: 0.03, lid: 0.45, mouth: 0.7, tilt: 0.09, tear: 1 },
  smile: { brow: -6, browY: 0.02, lid: 0.15, mouth: 1.5, tilt: 0.03, blush: 1 },
  angry: { brow: 34, browY: -0.05, lid: 0.25, mouth: 1.5, tilt: -0.07 },
  panic: { brow: -32, browY: 0.08, lid: -0.3, mouth: 2.8, tilt: 0.1, sweat: 1 },
};

export class BustView {
  constructor(ctx, id, opts = {}) {
    this.ctx = ctx; this.id = id;
    const build = buildModel(bustDef(id), { catalog: CATALOG });
    this.root = new THREE.Group();
    this.object = build.object;
    this.root.add(this.object);
    setLookLayer(this.root, 'actors');
    this.object.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; } });
    recolorSkin(this.object, id);
    const q = (n) => this.object.getObjectByName(n);
    this.head = q('head'); this.mouth = q('mouth'); this.browL = q('browL'); this.browR = q('browR'); this.lidL = q('lidL'); this.lidR = q('lidR');
    this.sweat = q('sweat'); this.tear = q('tear'); this.blush = q('blush');
    this.baseY = { browL: this.browL.position.y, browR: this.browR.position.y, lidL: this.lidL.position.y, lidR: this.lidR.position.y, sweat: this.sweat.position.y, tear: this.tear.position.y };
    this.pose = { ...POSES.neutral }; this.target = POSES.neutral; this.talkAmt = 0; this.t = opts.seed ?? Math.abs(id.charCodeAt(0)) * 0.7; this.blinkT = 2 + (this.t % 3); this.blink = 0; this.lean = 0; this.leanTarget = 0; this.shakeT = 0;
    (opts.parent ?? ctx.scene).add(this.root);
    this.setEmotion('neutral');
    this.dimA = 1; this.dimTarget = 1; this.mats = null;
  }
  /** The listener dims. Own material copies, so the shared palette materials stay as they are. */
  setDim(on) {
    this.dimTarget = on ? 0.5 : 1;
    if (this.mats) return;
    this.mats = [];
    this.object.traverse((m) => { if (m.isMesh) { const c = m.material.clone(); m.material = c; this.mats.push({ c, base: c.color.clone() }); } });
  }
  setEmotion(e) { this.target = { ...POSES.neutral, ...(POSES[e] ?? POSES.neutral) }; this.emotion = e; if (e === 'shock' || e === 'panic') this.shakeT = 0.3; }
  talk(a = 1) { this.talkAmt = Math.max(this.talkAmt, a); }
  update(dt) {
    this.t += dt;
    if (this.mats && Math.abs(this.dimA - this.dimTarget) > 0.005) {
      this.dimA += (this.dimTarget - this.dimA) * Math.min(1, dt * 9);
      for (const { c, base } of this.mats) c.color.copy(base).multiplyScalar(this.dimA);
    }
    const k = Math.min(1, dt * 12);
    for (const key of Object.keys(POSES.neutral)) this.pose[key] += ((this.target[key] ?? 0) - this.pose[key]) * k;
    const p = this.pose;
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blink = 0.12; this.blinkT = 2 + ((this.t * 37) % 3); }
    this.blink = Math.max(0, this.blink - dt);
    const lid = this.blink > 0 ? 1.1 : Math.max(-0.2, p.lid);
    const lidScale = Math.max(0.01, lid);
    this.lidL.scale.y = this.lidR.scale.y = lid > 0.02 ? lidScale : 0.01;
    this.lidL.position.y = this.baseY.lidL - lid * 0.08 + (lid < 0 ? 0.05 : 0);
    this.lidR.position.y = this.baseY.lidR - lid * 0.08 + (lid < 0 ? 0.05 : 0);
    const rad = (p.brow * Math.PI) / 180;
    this.browL.rotation.z = -rad; this.browR.rotation.z = rad;
    this.browL.position.y = this.baseY.browL + p.browY; this.browR.position.y = this.baseY.browR + p.browY;
    // Mouth follows syllables.
    this.talkAmt = Math.max(0, this.talkAmt - dt * 7);
    const mouthOpen = p.mouth + this.talkAmt * 3.4 * (0.6 + 0.4 * Math.sin(this.t * 31));
    this.mouth.scale.y = Math.max(0.6, mouthOpen * 1.2);
    this.mouth.scale.x = 0.8 + Math.min(0.5, (p.mouth - 1) * 0.3);
    // sway
    this.shakeT = Math.max(0, this.shakeT - dt);
    this.head.rotation.z = p.tilt + Math.sin(this.t * 0.9) * 0.018 + (this.shakeT > 0 ? Math.sin(this.t * 60) * 0.04 : 0);
    this.head.rotation.y = Math.sin(this.t * 0.6) * 0.03 + this.look;
    this.head.rotation.x = Math.sin(this.t * 1.2) * 0.012 + this.lean * 0.06;
    // extras
    this.sweat.visible = p.sweat > 0.4;
    if (this.sweat.visible) this.sweat.position.y = this.baseY.sweat - (this.t * 0.5) % 0.3;
    this.tear.visible = p.tear > 0.4;
    if (this.tear.visible) this.tear.position.y = this.baseY.tear - (this.t * 0.25) % 0.26;
    this.blush.visible = p.blush > 0.4;
    this.lean += (this.leanTarget - this.lean) * Math.min(1, dt * 7);
  }
  look = 0;
}

/** Palette names can't do skin tones; swap the skin slot's material for the character's own. */
export function recolorSkin(object, id) {
  const c = CAST[id], skin = PALETTE[c?.look?.skin];
  if (!c?.skinHex || skin == null) return;
  object.traverse((m) => { if (m.isMesh && m.material?.color?.getHex?.() === new THREE.Color(skin).getHex()) m.material = toonMaterial(c.skinHex); });
}
