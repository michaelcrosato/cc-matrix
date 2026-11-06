import * as THREE from 'three/webgpu';
import { M, G, geo, toon, add } from './materials.js';
import { Rig } from '../anim/rig.js';
import { DOLL_CLIPS } from '../anim/clips.js';
import { cos } from '../core/rng.js';

const SKIN = 0xF2D3A8, JOINT = 0xD9A86C, SHORTS = 0x2B4A6F, INK = 0x1A1420, CHEEK = 0xF3A6A0, WHITE = 0xFFF8EA;
export const PAINTS = [
  { id: 'teal', name: 'Sea Teal', shirt: '#2CB5A0' }, { id: 'coral', name: 'Coral', shirt: '#E8644A' },
  { id: 'butter', name: 'Butter', shirt: '#F5C84A' }, { id: 'plum', name: 'Plum', shirt: '#8A5BA8' },
  { id: 'sky', name: 'Sky', shirt: '#5AA9E6' }, { id: 'moss', name: 'Moss', shirt: '#7FA650' },
  { id: 'rose', name: 'Rose', shirt: '#E78FB3' }, { id: 'navy', name: 'Navy', shirt: '#34508F' },
];
export const paintColour = (id) => (PAINTS.find((p) => p.id === id) || PAINTS[0]).shirt;

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();

/** The jointed wooden peg doll: named joints, rigid parts, one AnimationMixer. */
export class Doll {
  constructor({ shirt = '#2CB5A0', hat = 'none', height = 1, width = 1, shorts = SHORTS, face = true } = {}) {
    this.root = G('root');
    this.facing = G('facing');
    this.root.add(this.facing);
    const J = this.joints = {};
    const hips = J.hips = G('hips', 0, 0.46, 0);
    this.facing.add(hips);
    hips.scale.set(width, height, width);
    add(hips, M(geo.cap(0.2, 0.08), shorts, 0, 0.02, 0, { scale: [1.05, 1, 0.85] }));
    const spine = J.spine = G('spine', 0, 0.12, 0);
    hips.add(spine);
    this.shirtMat = toon(shirt);
    this.shirtMesh = M(geo.cap(0.21, 0.24), this.shirtMat, 0, 0.17, 0, { scale: [1, 1, 0.82] });
    spine.add(this.shirtMesh);
    const head = J.head = G('head', 0, 0.7, 0);
    spine.add(head);
    // The head's parts hang from an inner group, so the procedural bobble layers over any clip.
    this.headInner = G('headInner');
    head.add(this.headInner);
    add(this.headInner,
      M(geo.sphere(0.23, 24, 18), SKIN),
      M(geo.sphere(0.024, 10, 8), INK, 0.08, 0.03, 0.205, { shadow: false }),
      M(geo.sphere(0.024, 10, 8), INK, -0.08, 0.03, 0.205, { shadow: false }),
      M(geo.sphere(0.04, 10, 8), CHEEK, 0.13, -0.035, 0.175, { scale: [1, 0.6, 0.4], shadow: false }),
      M(geo.sphere(0.04, 10, 8), CHEEK, -0.13, -0.035, 0.175, { scale: [1, 0.6, 0.4], shadow: false }),
      M(geo.tor(0.05, 0.009, Math.PI), INK, 0, -0.04, 0.215, { rot: [0, 0, Math.PI], shadow: false }));
    this.headband = M(geo.tor(0.228, 0.02), this.shirtMat, 0, 0.09, 0, { rot: [Math.PI / 2, 0, 0] });
    this.headInner.add(this.headband);
    for (const [s, side] of [[1, 'L'], [-1, 'R']]) {
      const sh = J[`shoulder${side}`] = G(`shoulder${side}`, s * 0.26, 0.38, 0);
      spine.add(sh);
      add(sh, M(geo.sphere(0.075, 12, 10), JOINT), M(geo.cap(0.055, 0.12), SKIN, 0, -0.11, 0));
      const el = J[`elbow${side}`] = G(`elbow${side}`, 0, -0.22, 0);
      sh.add(el);
      add(el, M(geo.sphere(0.06, 12, 10), JOINT), M(geo.cap(0.05, 0.1), SKIN, 0, -0.1, 0), M(geo.sphere(0.07, 12, 10), WHITE, 0, -0.2, 0));
      const hp = J[`hip${side}`] = G(`hip${side}`, s * 0.13, -0.02, 0);
      hips.add(hp);
      add(hp, M(geo.cap(0.08, 0.08), SKIN, 0, -0.1, 0));
      const kn = J[`knee${side}`] = G(`knee${side}`, 0, -0.2, 0);
      hp.add(kn);
      add(kn, M(geo.cap(0.072, 0.08), SKIN, 0, -0.09, 0));
      const an = J[`ankle${side}`] = G(`ankle${side}`, 0, -0.185, 0);
      kn.add(an);
      add(an, M(geo.sphere(0.1, 12, 10), WHITE, 0, -0.005, 0.045, { scale: [1, 0.55, 1.5] }));
    }
    this.hatGroup = G('hatHolder', 0, 0, 0);
    this.headInner.add(this.hatGroup);
    this.setHat(hat);
    this.rest = {};
    for (const k of Object.keys(J)) this.rest[k] = { p: J[k].position.clone(), q: J[k].quaternion.clone() };
    this.rig = new Rig(this.root, DOLL_CLIPS);
    this.rig.loop('idle', { fade: 0 });
    this.flatFeet = true;
    this.ragdolled = false;
    this.leanBend = 0;
    this.squash = 0;
    this.procT = cos(0, 6);
  }
  setShirt(colour) {
    this.shirtMat = toon(colour);
    this.shirtMesh.material = this.shirtMat;
    this.headband.material = this.shirtMat;
  }
  setHat(hat) {
    this.hat = hat;
    this.hatGroup.clear();
    const g = this.hatGroup;
    switch (hat) {
      case 'visor':
        add(g, M(geo.tor(0.228, 0.03), 0xFFF8EA, 0, 0.12, 0, { rot: [Math.PI / 2, 0, 0] }), M(geo.sphere(0.2, 16, 8), 0x2CB5A0, 0, 0.1, 0.2, { scale: [0.9, 0.08, 0.7] }));
        break;
      case 'beret':
        add(g, M(geo.sphere(0.26, 16, 10), 0xC24D6A, 0.04, 0.18, 0, { scale: [1.05, 0.34, 1.05], rot: [0, 0, -0.2] }), M(geo.cyl(0.015, 0.015, 0.06, 8), 0xC24D6A, 0.05, 0.28, 0));
        break;
      case 'bucket':
        add(g, M(geo.cyl(0.19, 0.24, 0.16), 0xE9D7A8, 0, 0.21, 0), M(geo.cyl(0.33, 0.33, 0.016, 28), 0xE9D7A8, 0, 0.13, 0));
        break;
      case 'perm':
        for (let i = 0; i < 16; i++) {
          const a = i * 2.4, r = 0.17 + (i % 3) * 0.03, y = 0.09 + (i % 4) * 0.045;
          g.add(M(geo.sphere(0.078, 10, 8), 0xB9B4C4, Math.cos(a) * r, y, Math.sin(a) * r - 0.02));
        }
        g.add(M(geo.sphere(0.13, 12, 8), 0xB9B4C4, 0, 0.24, -0.01));
        break;
      case 'wizard':
        add(g, M(geo.cone(0.22, 0.5, 20), 0x4B3D8F, 0, 0.4, 0), M(geo.cyl(0.32, 0.32, 0.016, 28), 0x4B3D8F, 0, 0.15, 0), M(geo.sphere(0.03, 8, 6), 0xF5B700, 0.1, 0.32, 0.14), M(geo.sphere(0.022, 8, 6), 0xF5B700, -0.05, 0.47, 0.09));
        break;
      case 'crown':
        add(g, M(geo.cyl(0.12, 0.1, 0.07, 12), 0xF5B700, 0, 0.26, 0));
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.add(M(geo.cone(0.025, 0.055, 6), 0xF5B700, Math.cos(a) * 0.11, 0.32, Math.sin(a) * 0.11)); }
        break;
      default: break;
    }
  }
  /** Set lean from the balance core: root takes it, spine exaggerates, head counters, feet stay flat. */
  setLean(qx, qy, qz, qw) { this.root.quaternion.set(qx, qy, qz, qw); }
  place(x, y, z) { this.root.position.set(x, y, z); }
  face(yaw) { this.facing.rotation.y = yaw; }
  update(dt) {
    if (this.ragdolled) return;
    this.rig.update(dt);
    // Layered over the clip: breath on the shirt, a bobble of the head that follows the lean.
    this.procT += dt;
    const q = this.root.quaternion;
    this.shirtMesh.scale.y = 1 + Math.sin(this.procT * 1.6) * 0.018;
    this.headInner.rotation.set(q.x * 0.5 + Math.sin(this.procT * 1.1) * 0.012, 0, -q.z * 0.5 + Math.sin(this.procT * 0.8) * 0.02);
    if (this.squash > 0) {
      // Everyone squashes on landing.
      this.squash = Math.max(0, this.squash - dt * 5);
      const s = this.squash * this.squash;
      this.facing.scale.set(1 + s * 0.16, 1 - s * 0.22, 1 + s * 0.16);
    }
    if (this.flatFeet) {
      for (const side of ['L', 'R']) {
        const an = this.joints[`ankle${side}`];
        an.parent.getWorldQuaternion(_q);
        this.root.parent && this.root.parent.getWorldQuaternion(_q2);
        if (this.root.parent) _q2.multiply(this.facing.quaternion); else _q2.copy(this.facing.quaternion);
        an.quaternion.copy(_q.invert()).multiply(_q2);
      }
    }
  }
}
