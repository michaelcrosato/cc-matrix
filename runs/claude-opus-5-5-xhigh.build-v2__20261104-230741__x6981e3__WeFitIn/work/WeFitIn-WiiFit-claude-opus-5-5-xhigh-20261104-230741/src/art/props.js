// Placing models, and the two characters who aren't people: Ounce and Kevin.
import { addModelColliders, buildModel, setLookLayer, Squash, THREE } from '../../pixel-engine.js';
import { MODELS } from './models.js';

const { Vector3 } = THREE;

export function place(ctx, id, { at = [0, 0, 0], yaw = 0, scale = 1, palette, params, collide = false, shadow = true, actor = false, seed } = {}) {
  const m = buildModel(id, { catalog: MODELS, palette, params, seed });
  const o = m.object;
  o.position.set(...at);
  o.rotation.y = (yaw * Math.PI) / 180;
  o.scale.setScalar(scale);
  o.traverse((c) => { if (c.isMesh) { c.castShadow = shadow; c.receiveShadow = true; } });
  o.updateMatrixWorld();
  if (actor) setLookLayer(o, 'actors');
  ctx.scene.add(o);
  if (collide) addModelColliders(ctx.physics, m, at, o.rotation.y);
  return m;
}

const MOODS = {
  neutral: { needle: 0, wiggle: 0.02 },
  pleased: { needle: 26, wiggle: 0.04 },
  smug: { needle: 42, wiggle: 0.01 },
  droop: { needle: -66, wiggle: 0.01 },
  alarm: { needle: 80, wiggle: 0.5 },
  concern: { needle: -24, wiggle: 0.03 },
  spin: { needle: 0, spin: 9 },
};
export const OUNCE_MOODS = Object.keys(MOODS);

export class Ounce {
  mood = 'neutral';
  ang = 0; t = 0; spinning = 0;
  hopT = 1; from = new Vector3(); to = new Vector3();
  squash = new Squash();

  constructor(ctx, { at = [0, 0, 0], yaw = 0, scale = 1.4 } = {}) {
    this.ctx = ctx;
    this.scale = scale;
    this.build = place(ctx, 'ounce', { at, yaw, scale, actor: true });
    this.root = this.build.object;
    this.needle = this.root.getObjectByName('needle');
    this.face = this.root.getObjectByName('face');
    this.head = this.root.getObjectByName('head');
    this.base = { x: this.needle.rotation.y };
    this.pos = this.root.position;
    this.faceTilt = this.face.rotation.x;
    this.reading = null;
  }

  setMood(m) { if (MOODS[m]) this.mood = m; }
  /** Point the needle: -1..1 of the dial, for a reading. null hands it back to mood. */
  read(v) { this.reading = v; }

  hopTo(x, z, dur = 0.34) {
    this.from.copy(this.root.position);
    this.to.set(x, this.root.position.y, z);
    this.hopT = 0; this.hopDur = dur;
    this.squash.kick(0.9);
    this.ctx.audio.play('hop', { volume: 0.5 });
  }

  get hopping() { return this.hopT < 1; }

  face2(x, z) {
    const dx = x - this.root.position.x, dz = z - this.root.position.z;
    this.root.rotation.y += ((Math.atan2(dx, dz) - this.root.rotation.y + Math.PI * 3) % (Math.PI * 2) - Math.PI) * 0.2;
  }

  update(dt) {
    this.t += dt;
    const m = MOODS[this.mood] ?? MOODS.neutral;
    let target = (m.needle + Math.sin(this.t * 7) * m.wiggle * 60) * (Math.PI / 180);
    if (this.reading !== null) target = this.reading * 2.2;
    if (m.spin && this.reading === null) { this.ang += m.spin * dt; } else {
      const wrap = ((target - this.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      this.ang += wrap * Math.min(1, dt * 12);
    }
    this.needle.rotation.y = this.base.x + this.ang;
    this.face.rotation.x = this.faceTilt + Math.sin(this.t * 1.7) * 0.03;
    if (this.hopT < 1) {
      this.hopT = Math.min(1, this.hopT + dt / this.hopDur);
      const u = this.hopT;
      this.root.position.x = this.from.x + (this.to.x - this.from.x) * u;
      this.root.position.z = this.from.z + (this.to.z - this.from.z) * u;
      this.root.position.y = this.from.y + Math.sin(u * Math.PI) * 0.5;
      if (u >= 1) { this.root.position.y = this.from.y; this.squash.kick(-1.1); }
    }
    this.squash.update(dt);
    const [h, v] = this.squash.scale();
    this.root.scale.set(h * this.scale, v * this.scale, h * this.scale);
  }
}

export class Kevin {
  t = 0; flap = 1; state = 'sit';
  from = new Vector3(); to = new Vector3(); u = 1; dur = 1;

  constructor(ctx, { at = [0, 0, 0], yaw = 0, scale = 1 } = {}) {
    this.ctx = ctx;
    this.build = place(ctx, 'kevin', { at, yaw, scale, actor: true, shadow: false });
    this.root = this.build.object;
    this.wr = this.root.getObjectByName('wingR');
    this.wl = this.root.getObjectByName('wingL');
    this.visible = true;
  }

  flyTo(x, y, z, dur = 1.2) {
    this.from.copy(this.root.position); this.to.set(x, y, z); this.u = 0; this.dur = dur; this.state = 'fly';
    this.ctx.audio.play('gullSquawk', { volume: 0.6 });
  }

  /** Keep him on someone: call each frame with a world position. */
  perch(v) { if (this.state !== 'fly') this.root.position.copy(v); }

  update(dt) {
    this.t += dt;
    if (this.state === 'fly') {
      this.u = Math.min(1, this.u + dt / this.dur);
      const e = this.u * this.u * (3 - 2 * this.u);
      this.root.position.lerpVectors(this.from, this.to, e);
      this.root.position.y += Math.sin(this.u * Math.PI) * 1.2;
      const dx = this.to.x - this.from.x, dz = this.to.z - this.from.z;
      if (Math.abs(dx) + Math.abs(dz) > 0.01) this.root.rotation.y = Math.atan2(dx, dz);
      if (this.u >= 1) this.state = 'sit';
    }
    // Flying: wings out and flapping. Sitting: folded back along the body.
    const flying = this.state === 'fly';
    const f = flying ? Math.sin(this.t * 22) * 0.9 : -0.22 + Math.sin(this.t * 2.1) * 0.02;
    const fold = flying ? 0 : 1.42;
    this.wr.rotation.set(0, fold, f);
    this.wl.rotation.set(0, -fold, -f);
  }
}
