import * as THREE from 'three/webgpu';
import { M, G, geo, toon, add } from './materials.js';
import { Rig } from '../anim/rig.js';
import { TRUDY_CLIPS, HERON_CLIPS, WALRUS_CLIPS, GULL_CLIPS } from '../anim/clips.js';

const INK = 0x1A1420;

/** Trudy, Head of Alignment: a chunky spirit level whose bubble is her eye. */
export class Trudy {
  constructor() {
    this.root = G('trudyRoot');
    const body = this.body = G('body', 0, 0.34, 0);
    this.root.add(body);
    add(body, M(geo.rbox(1.1, 0.42, 0.26, 0.1), 0xF5B700), M(geo.box(0.56, 0.2, 0.05), 0x2A2A3C, 0, 0.02, 0.12, { shadow: false }));
    add(body, M(geo.cap(0.075, 0.36), 0xB9F26B, 0, 0.02, 0.15, { rot: [0, 0, Math.PI / 2], shadow: false }));
    this.bubble = M(geo.sphere(0.06, 14, 10), 0xFFFFFF, 0, 0.02, 0.215, { scale: [1.2, 1, 0.6], shadow: false });
    this.pupil = M(geo.sphere(0.024, 10, 8), INK, 0, 0, 0.05, { shadow: false });
    this.bubble.add(this.pupil);
    body.add(this.bubble);
    add(body,
      M(geo.box(0.012, 0.15, 0.02), INK, 0.08, 0.02, 0.232, { shadow: false }),
      M(geo.box(0.012, 0.15, 0.02), INK, -0.08, 0.02, 0.232, { shadow: false }),
      M(geo.sphere(0.075, 12, 10), 0xB9F26B, 0.42, 0.02, 0.1, { scale: [1, 1, 0.6], shadow: false }),
      M(geo.sphere(0.075, 12, 10), 0xB9F26B, -0.42, 0.02, 0.1, { scale: [1, 1, 0.6], shadow: false }));
    this.mouth = M(geo.tor(0.06, 0.012, Math.PI), INK, 0, -0.12, 0.135, { rot: [0, 0, Math.PI], shadow: false });
    body.add(this.mouth);
    const pegL = G('pegL', 0.28, -0.2, 0), pegR = G('pegR', -0.28, -0.2, 0);
    add(pegL, M(geo.cyl(0.05, 0.06, 0.14), 0x8A5A32, 0, -0.07, 0));
    add(pegR, M(geo.cyl(0.05, 0.06, 0.14), 0x8A5A32, 0, -0.07, 0));
    add(body, pegL, pegR);
    this.rig = new Rig(this.root, TRUDY_CLIPS);
    this.rig.loop('idle', { fade: 0 });
    this.bubbleX = 0; this.bubbleTarget = 0; this.bubbleV = 0;
    this.squash = 0;
    this.hopT = 0; this.tx = 0; this.tz = 0; this.moving = false; this.yaw = 0;
  }
  /** The bubble slides to the high side of the world and to wherever she is feeling. */
  feel(x) { this.bubbleTarget = Math.max(-1, Math.min(1, x)); }
  update(dt) {
    this.rig.update(dt);
    const f = (this.bubbleTarget - this.bubbleX) * 26 - this.bubbleV * 5;
    this.bubbleV += f * dt; this.bubbleX += this.bubbleV * dt;
    this.bubble.position.x = Math.max(-0.15, Math.min(0.15, this.bubbleX * 0.15));
    if (this.squash > 0) this.squash = Math.max(0, this.squash - dt * 5);
    const s = this.squash;
    this.body.scale.set(1 + s * 0.2, 1 - s * 0.25, 1 + s * 0.1);
  }
}

/** Ms. Stillwater: a tall heron on one leg. A voice like a slow door. */
export class Heron {
  constructor() {
    this.root = G('heronRoot');
    const leg = M(geo.cyl(0.025, 0.025, 1.05, 10), 0xF08A3C, 0, 0.525, 0);
    const foot = M(geo.sphere(0.12, 10, 8), 0xF08A3C, 0, 0.012, 0.05, { scale: [1, 0.12, 1.3] });
    add(this.root, leg, foot);
    const body = G('body', 0, 1.08, 0);
    this.root.add(body);
    body.add(M(geo.sphere(0.34, 22, 16), 0xA9C2D4, 0, 0.05, -0.02, { scale: [0.8, 0.92, 1.35] }));
    const wL = G('wingL', 0.25, 0.1, 0), wR = G('wingR', -0.25, 0.1, 0);
    wL.add(M(geo.sphere(0.3, 14, 10), 0x7E9CB4, 0.03, -0.06, -0.08, { scale: [0.22, 0.75, 1.25] }));
    wR.add(M(geo.sphere(0.3, 14, 10), 0x7E9CB4, -0.03, -0.06, -0.08, { scale: [0.22, 0.75, 1.25] }));
    add(body, wL, wR);
    const tuck = G('legTuck', 0.08, -0.2, -0.05);
    add(tuck, M(geo.cyl(0.025, 0.025, 0.28, 8), 0xF08A3C, 0, -0.14, 0));
    const shin = G('shin', 0, -0.28, 0);
    add(shin, M(geo.cyl(0.022, 0.022, 0.28, 8), 0xF08A3C, 0, -0.14, 0), M(geo.sphere(0.07, 8, 6), 0xF08A3C, 0, -0.28, 0.03, { scale: [1, 0.2, 1.4] }));
    tuck.add(shin);
    body.add(tuck);
    body.add(M(geo.sphere(0.09, 10, 8), 0xC24D6A, 0, 0.3, 0.22, { scale: [1.5, 0.6, 1.1] }));
    // S-curve neck from five joints.
    let parent = body;
    const lens = [0.2, 0.2, 0.2, 0.2, 0.18];
    const offs = [[0, 0.32, 0.24], [0, 0.2, 0.05], [0, 0.2, -0.05], [0, 0.2, -0.04], [0, 0.2, 0.05]];
    this.neck = [];
    for (let i = 0; i < 5; i++) {
      const n = G(`n${i + 1}`, ...offs[i]);
      n.add(M(geo.cap(0.062 - i * 0.003, lens[i] * 0.8), 0xD6E3EC, 0, lens[i] / 2, 0));
      parent.add(n); parent = n; this.neck.push(n);
    }
    const head = this.head = G('hhead', 0, 0.2, 0.02);
    parent.add(head);
    add(head,
      M(geo.sphere(0.115, 16, 12), 0xE6EEF3),
      M(geo.cone(0.045, 0.3, 10), 0xF2C14E, 0, -0.02, 0.2, { rot: [Math.PI / 2, 0, 0] }),
      M(geo.cone(0.03, 0.22, 8), INK, 0, 0.1, -0.12, { rot: [-2.2, 0, 0] }),
      M(geo.tor(0.03, 0.007, Math.PI), INK, 0.065, 0.02, 0.09, { rot: [0, 0.6, 0], shadow: false }),
      M(geo.tor(0.03, 0.007, Math.PI), INK, -0.065, 0.02, 0.09, { rot: [0, -0.6, 0], shadow: false }),
      M(geo.sphere(0.012, 8, 6), INK, 0.07, 0.012, 0.092, { shadow: false }),
      M(geo.sphere(0.012, 8, 6), INK, -0.07, 0.012, 0.092, { shadow: false }));
    this.rig = new Rig(this.root, HERON_CLIPS);
    this.rig.loop('stand', { fade: 0 });
  }
  update(dt) { this.rig.update(dt); }
}

/** Coach Bolster: a vast walrus in a sweatband, with a whistle he always forgets to blow. */
export class Walrus {
  constructor() {
    this.root = G('walrusRoot');
    const body = G('wbody', 0, 1.1, 0);
    this.root.add(body);
    body.add(M(geo.cap(0.72, 0.5, 20), 0xB9806A, 0, 0, 0, { scale: [1.06, 1, 0.9] }));
    body.add(M(geo.sphere(0.5, 16, 12), 0xD3A08A, 0, -0.3, 0.42, { scale: [1, 0.9, 0.5] }));
    add(this.root, M(geo.sphere(0.34, 12, 10), 0x8D5F4F, 0.46, 0.1, 0.1, { scale: [1, 0.3, 1.3] }), M(geo.sphere(0.34, 12, 10), 0x8D5F4F, -0.46, 0.1, 0.1, { scale: [1, 0.3, 1.3] }));
    const head = G('whead', 0, 0.62, 0.08);
    body.add(head);
    add(head,
      M(geo.tor(0.56, 0.08, Math.PI * 2, 40), 0xD43F3A, 0, 0.32, -0.02, { rot: [Math.PI / 2, 0, 0], scale: [1, 0.92, 1] }),
      M(geo.sphere(0.2, 14, 10), 0xEBD6C2, 0.16, -0.08, 0.62),
      M(geo.sphere(0.2, 14, 10), 0xEBD6C2, -0.16, -0.08, 0.62),
      M(geo.cone(0.06, 0.42, 10), 0xFFF3DC, 0.16, -0.38, 0.66, { rot: [Math.PI, 0, 0] }),
      M(geo.cone(0.06, 0.42, 10), 0xFFF3DC, -0.16, -0.38, 0.66, { rot: [Math.PI, 0, 0] }),
      M(geo.sphere(0.05, 10, 8), INK, 0, 0.03, 0.72, { scale: [1.3, 0.8, 0.7], shadow: false }),
      M(geo.sphere(0.04, 10, 8), INK, 0.22, 0.2, 0.56, { shadow: false }),
      M(geo.sphere(0.04, 10, 8), INK, -0.22, 0.2, 0.56, { shadow: false }));
    add(body, M(geo.tor(0.42, 0.018, Math.PI * 2, 40), 0xFFFFFF, 0, 0.26, 0.2, { rot: [1.15, 0, 0] }), M(geo.cap(0.05, 0.1), 0xF5C518, 0, -0.1, 0.64, { rot: [0, 0, Math.PI / 2] }));
    const fL = G('flipL', 0.72, 0.1, 0.05), fR = G('flipR', -0.72, 0.1, 0.05);
    fL.add(M(geo.sphere(0.34, 12, 10), 0x8D5F4F, 0.04, -0.3, 0, { scale: [0.42, 1.25, 0.8] }));
    fR.add(M(geo.sphere(0.34, 12, 10), 0x8D5F4F, -0.04, -0.3, 0, { scale: [0.42, 1.25, 0.8] }));
    add(body, fL, fR);
    this.rig = new Rig(this.root, WALRUS_CLIPS);
    this.rig.loop('stand', { fade: 0 });
  }
  update(dt) { this.rig.update(dt); }
}

/** Gary. He steals things and lands on you. */
export class Gull {
  constructor() {
    this.root = G('gullRoot');
    const body = G('gbody', 0, 0.28, 0);
    this.root.add(body);
    body.add(M(geo.sphere(0.2, 16, 12), 0xFFFDF7, 0, 0, 0, { scale: [0.82, 0.8, 1.35] }));
    const wL = G('gwingL', 0.14, 0.05, -0.02), wR = G('gwingR', -0.14, 0.05, -0.02);
    wL.add(M(geo.sphere(0.2, 10, 8), 0xAEB6BE, 0.17, 0, -0.03, { scale: [1, 0.14, 0.72] }));
    wR.add(M(geo.sphere(0.2, 10, 8), 0xAEB6BE, -0.17, 0, -0.03, { scale: [1, 0.14, 0.72] }));
    add(body, wL, wR);
    const head = G('ghead', 0, 0.12, 0.2);
    body.add(head);
    add(head,
      M(geo.sphere(0.115, 14, 10), 0xFFFDF7),
      M(geo.cone(0.045, 0.17, 10), 0xF5B700, 0, -0.015, 0.16, { rot: [Math.PI / 2, 0, 0] }),
      M(geo.sphere(0.017, 8, 6), INK, 0.058, 0.03, 0.09, { shadow: false }),
      M(geo.sphere(0.017, 8, 6), INK, -0.058, 0.03, 0.09, { shadow: false }),
      M(geo.box(0.1, 0.018, 0.02), INK, 0.052, 0.06, 0.09, { rot: [0, 0, -0.5], shadow: false }));
    add(this.root, M(geo.cyl(0.012, 0.012, 0.16, 6), 0xF08A3C, 0.05, 0.08, 0), M(geo.cyl(0.012, 0.012, 0.16, 6), 0xF08A3C, -0.05, 0.08, 0));
    this.rig = new Rig(this.root, GULL_CLIPS);
    this.rig.loop('stand', { fade: 0 });
  }
  update(dt) { this.rig.update(dt); }
}
