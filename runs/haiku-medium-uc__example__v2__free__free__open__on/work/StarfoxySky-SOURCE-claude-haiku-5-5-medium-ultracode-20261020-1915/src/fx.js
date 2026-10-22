// Effects: pooled chunky particles (one InstancedMesh), expanding shock rings,
// flash spheres and short-lived laser beams. Everything is cel-friendly: flat
// colors, no soft sprites.

import * as THREE from 'three/webgpu';
import { glowMat } from './render.js';

const MAX_PARTICLES = 900;
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_RING = new THREE.TorusGeometry(1, 0.07, 6, 28);
const UNIT_SPHERE = new THREE.SphereGeometry(1, 12, 8);
const UNIT_BEAM = new THREE.BoxGeometry(0.16, 0.16, 1);

export class FX {
  constructor(root) {
    this.root = root;
    this.mesh = new THREE.InstancedMesh(UNIT_BOX, glowMat(0xffffff), MAX_PARTICLES);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.parts = Array.from({ length: MAX_PARTICLES }, () => ({ life: 0, max: 1, size: 0, vel: new THREE.Vector3(), drag: 0, gravity: 0 }));
    this.next = 0;
    this.dummy = new THREE.Object3D();
    this.color = new THREE.Color();
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.dummy.position.set(0, -9999, 0);
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, this.color.set(0xffffff));
    }
    root.add(this.mesh);
    this.effects = [];
  }

  // Scatter `count` chunks outward from pos.
  burst(pos, colors, count, speed, size, life, { drag = 2.5, gravity = 0 } = {}) {
    for (let n = 0; n < count; n++) {
      const slot = this.next;
      const p = this.parts[slot];
      this.next = (slot + 1) % MAX_PARTICLES;
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const v = speed * (0.4 + Math.random() * 0.8);
      p.vel.set(Math.cos(a) * s * v, u * v, Math.sin(a) * s * v);
      p.life = life * (0.7 + Math.random() * 0.5);
      p.max = p.life;
      p.size = size * (0.6 + Math.random() * 0.8);
      p.drag = drag;
      p.gravity = gravity;
      p.pos = p.pos || new THREE.Vector3();
      p.pos.copy(pos);
      this.mesh.setColorAt(slot, this.color.set(colors[(Math.random() * colors.length) | 0]));
      this.colorDirty = true;
    }
  }

  explode(pos, size = 1, colors = [0xffd166, 0xff7a3d, 0xfff1d6, 0x8ea0c0]) {
    this.burst(pos, colors, Math.round(18 + 18 * size), 9 * size, 0.55 * size, 0.7 + 0.25 * size, { drag: 2.2 });
    this.shock(pos, 6 * size, 0xfff1c2, 0.45);
    this.flash(pos, 3.5 * size, 0xffe2a0, 0.25);
  }

  sparks(pos, color = 0xfff27a, count = 10) {
    this.burst(pos, [color, 0xffffff], count, 14, 0.25, 0.35, { drag: 4 });
  }

  shock(pos, radius, color, life) {
    const mat = glowMat(color, 0.85).clone();
    mat.transparent = true;
    mat.opacity = 0.85;
    const m = new THREE.Mesh(UNIT_RING, mat);
    m.position.copy(pos);
    m.lookAt(pos.clone().add(new THREE.Vector3(0, 1, 0.001)));
    this.root.add(m);
    this.effects.push({ kind: 'shock', m, t: 0, life, radius });
  }

  flash(pos, radius, color, life) {
    const mat = glowMat(color, 0.6).clone();
    mat.transparent = true;
    mat.opacity = 0.6;
    const m = new THREE.Mesh(UNIT_SPHERE, mat);
    m.position.copy(pos);
    this.root.add(m);
    this.effects.push({ kind: 'flash', m, t: 0, life, radius });
  }

  beam(from, to, color, life = 0.09) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    if (len < 0.01) return;
    const mat = glowMat(color).clone();
    mat.transparent = true;
    const m = new THREE.Mesh(UNIT_BEAM, mat);
    m.position.copy(from).addScaledVector(dir, 0.5);
    m.lookAt(to);
    m.scale.set(1, 1, len);
    this.root.add(m);
    this.effects.push({ kind: 'beam', m, t: 0, life });
  }

  update(dt) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.parts[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        this.dummy.position.set(0, -9999, 0);
        this.dummy.scale.setScalar(0);
      } else {
        p.pos.addScaledVector(p.vel, dt);
        p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt));
        p.vel.y -= p.gravity * dt;
        const k = p.life / p.max;
        this.dummy.position.copy(p.pos);
        this.dummy.scale.setScalar(p.size * (0.3 + 0.7 * k));
        this.dummy.rotation.set(p.life * 3, p.life * 5, 0);
      }
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.colorDirty) {
      this.mesh.instanceColor.needsUpdate = true;
      this.colorDirty = false;
    }

    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.t += dt;
      const k = Math.min(1, e.t / e.life);
      if (e.kind === 'shock') {
        e.m.scale.setScalar(e.radius * (0.15 + 0.85 * k));
        e.m.material.opacity = 0.85 * (1 - k);
      } else if (e.kind === 'flash') {
        e.m.scale.setScalar(e.radius * (0.4 + 0.6 * k));
        e.m.material.opacity = 0.6 * (1 - k);
      } else {
        e.m.material.opacity = 1 - k;
      }
      if (k >= 1) {
        this.root.remove(e.m);
        e.m.material.dispose();
        this.effects.splice(i, 1);
      }
    }
  }
}
