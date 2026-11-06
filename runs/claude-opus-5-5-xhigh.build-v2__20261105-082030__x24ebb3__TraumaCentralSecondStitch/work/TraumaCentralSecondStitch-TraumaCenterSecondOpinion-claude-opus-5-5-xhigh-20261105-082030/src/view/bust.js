// The anime talking head: a real 3D bust with pivots for head, mouth, brows and lids, and an emotion
// pose table per character. The same models talk in story scenes and, tiny, on the comm strip.
import { buildModel, setLookLayer, THREE } from '../../pixel-engine.js';
import { BUSTS } from '../content/models/cast.js';

const SKIN = {
  ilya: { skin: 0xf2c9a2, skin2: 0xd69e78 }, reyes: { skin: 0xc58a5c, skin2: 0xa26c42 }, sabine: { skin: 0xf3d8c4, skin2: 0xd2ad96 }, bram: { skin: 0xf0c8aa, skin2: 0xd4a084 }, pem: { skin: 0x7c4c34, skin2: 0x5c3624 }, hesper: { skin: 0xf6e4d6, skin2: 0xd8c2b2 },
  tomasz: { skin: 0xc98f62, skin2: 0xa06c44 }, ottilie: { skin: 0xf0cdb0, skin2: 0xd4a88a }, ollie: { skin: 0xf4d0b0, skin2: 0xd8a888 }, zamboni: { skin: 0xf0cda8, skin2: 0xd2a684 }, anselm: { skin: 0xe6bc94, skin2: 0xc49870 },
};

// Brow rotation (degrees, positive: inner end down, angry) and height; lid 0 open..1 shut; mouth w,h; head tilt.
export const EMOTIONS = {
  neutral: { brow: 0, browY: 0, lid: 0.12, mouth: [1, 1], tilt: 0, nod: 0 },
  stern: { brow: 14, browY: -0.02, lid: 0.3, mouth: [0.9, 0.7], tilt: 0, nod: 0.05 },
  shock: { brow: -16, browY: 0.07, lid: 0, mouth: [0.8, 3], tilt: 0, nod: -0.08, pupil: 0.7 },
  sad: { brow: -20, browY: 0.02, lid: 0.45, mouth: [0.8, 0.7], tilt: 0.05, nod: 0.12, tear: true },
  smile: { brow: -6, browY: 0.02, lid: 0.2, mouth: [1.4, 1.5], tilt: -0.04, nod: 0, blush: false },
  angry: { brow: 26, browY: -0.04, lid: 0.22, mouth: [1.2, 2], tilt: 0, nod: 0.08 },
  panic: { brow: -22, browY: 0.08, lid: 0, mouth: [1.2, 2.6], tilt: 0.06, nod: -0.04, sweat: true, pupil: 0.65 },
  blush: { brow: -6, browY: 0.02, lid: 0.3, mouth: [0.8, 0.9], tilt: 0.05, nod: 0.1, blush: true, sweat: false },
};

export class BustRig {
  constructor(ctx, who, o = {}) {
    this.who = BUSTS[who] ? who : 'ilya';
    const b = buildModel(BUSTS[this.who], { palette: SKIN[this.who] ?? {} });
    this.object = b.object;
    this.meshes = [];
    this.object.traverse((m) => {
      if (m.isMesh) {
        m.receiveShadow = false;
        m.castShadow = false;
        m.material = m.material.clone();
        m.material.userData = { ...m.material.userData, shared: false };
        m.userData.base = m.material.color.clone();
        this.meshes.push(m);
      }
    });
    const get = (n) => this.object.getObjectByName(n);
    this.head = get('head');
    this.mouth = get('mouth');
    this.browL = get('browL');
    this.browR = get('browR');
    this.lidL = get('lidL');
    this.lidR = get('lidR');
    this.pupilL = get('pupilL');
    this.pupilR = get('pupilR');
    this.sweat = get('sweat');
    this.blush = get('blush');
    this.tear = get('tear');
    this.glint = get('glint');
    if (this.sweat) this.sweat.visible = false;
    if (this.blush) this.blush.visible = false;
    if (this.tear) this.tear.visible = false;
    setLookLayer(this.object, 'actors');
    this.browY0 = this.browL.position.y;
    this.lidY0 = this.lidL.position.y;
    this.tearY0 = this.tear?.position.y ?? 0;
    this.sweatY0 = this.sweat?.position.y ?? 0;
    this.t = Math.random() * 9;
    this.emotion = 'neutral';
    this.cur = { ...EMOTIONS.neutral };
    this.open = 0;
    this.blinkIn = 2 + Math.random() * 3;
    this.blinkT = 0;
    this.lean = 0;
    this.leanTo = 0;
    this.dim = 1;
    this.dimTo = 1;
    this.lastDim = -1;
    this.pose();
    if (o.parent) o.parent.add(this.object);
  }
  setEmotion(e) { this.emotion = EMOTIONS[e] ? e : 'neutral'; }
  /** A syllable just played. */
  syllable() { this.open = 1; }
  setFocus(on) { this.leanTo = on ? 1 : 0; this.dimTo = on ? 1 : 0.42; }
  pose() {
    const c = this.cur;
    const rb = (c.brow * Math.PI) / 180;
    this.browL.rotation.z = -0.24 - rb;
    this.browR.rotation.z = 0.24 + rb;
    this.browL.position.y = this.browY0 + c.browY;
    this.browR.position.y = this.browY0 + c.browY;
  }
  update(dt) {
    this.t += dt;
    const target = EMOTIONS[this.emotion];
    const k = Math.min(1, dt * 12);
    for (const key of ['brow', 'browY', 'lid', 'tilt', 'nod']) this.cur[key] += (target[key] - this.cur[key]) * k;
    this.pose();
    // Mouth follows syllables.
    this.open = Math.max(0, this.open - dt * 7);
    const sx = target.mouth[0], sy = target.mouth[1] + this.open * 2.4;
    this.mouth.scale.set(sx, sy, 1);
    // Blinks every 2 to 5 s.
    this.blinkIn -= dt;
    if (this.blinkIn <= 0) { this.blinkT = 0.12; this.blinkIn = 2 + Math.random() * 3; }
    this.blinkT = Math.max(0, this.blinkT - dt);
    const lid = this.blinkT > 0 ? 1 : this.cur.lid;
    this.lidL.scale.y = 0.01 + lid * 1.6;
    this.lidR.scale.y = 0.01 + lid * 1.6;
    const pup = target.pupil ?? 1;
    this.pupilL.scale.set(pup, pup, 1);
    this.pupilR.scale.set(pup, pup, 1);
    // Sway, tilt, lean.
    this.lean += (this.leanTo - this.lean) * Math.min(1, dt * 7);
    this.head.rotation.z = Math.sin(this.t * 0.8) * 0.015 + this.cur.tilt;
    this.head.rotation.x = this.cur.nod + Math.sin(this.t * 0.6) * 0.012 + this.lean * 0.02;
    this.head.position.y = 1.62 + Math.sin(this.t * 1.2) * 0.008;
    this.object.position.z = (this.baseZ ?? 0) + this.lean * 0.3;
    if (this.sweat) { this.sweat.visible = !!target.sweat; this.sweat.position.y = this.sweatY0 - ((this.t * 0.5) % 0.3); }
    if (this.blush) this.blush.visible = !!target.blush;
    if (this.tear) { this.tear.visible = !!target.tear; this.tear.position.y = this.tearY0 - ((this.t * 0.35) % 0.35); }
    if (this.glint) this.glint.visible = Math.sin(this.t * 1.3) > 0.92;
    // Dim whoever isn't speaking.
    this.dim += (this.dimTo - this.dim) * Math.min(1, dt * 7);
    if (Math.abs(this.dim - this.lastDim) > 0.005) {
      this.lastDim = this.dim;
      for (const m of this.meshes) m.material.color.copy(m.userData.base).multiplyScalar(this.dim);
    }
  }
}
