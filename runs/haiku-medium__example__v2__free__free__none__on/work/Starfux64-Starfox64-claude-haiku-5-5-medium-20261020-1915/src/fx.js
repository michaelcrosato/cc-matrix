// Visual effects: pooled instanced particles, shock rings and short laser beams.
import {
  InstancedMesh, Object3D, Color, Mesh, BoxGeometry, OctahedronGeometry, TorusGeometry,
} from 'three/webgpu';
import { makeBasic } from './render.js';

const dummy = new Object3D();

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.max = 900;
    this.count = 0;
    this.pos = new Float32Array(this.max * 3);
    this.vel = new Float32Array(this.max * 3);
    this.life = new Float32Array(this.max);
    this.maxLife = new Float32Array(this.max);
    this.size = new Float32Array(this.max);
    this.colors = new Float32Array(this.max * 3);
    this.mesh = new InstancedMesh(new OctahedronGeometry(1, 0), makeBasic(0xffffff, { additive: true }), this.max);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(35048); // DynamicDrawUsage
    this.mesh.count = this.max;
    for (let i = 0; i < this.max; i++) {
      dummy.position.set(0, -9999, 0);
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
      this.mesh.setColorAt(i, new Color(0, 0, 0));
    }
    scene.add(this.mesh);
    this.next = 0;

    this.rings = [];
    for (let i = 0; i < 24; i++) {
      const mat = makeBasic(0xffffff, { alpha: 0, additive: true });
      const m = new Mesh(new TorusGeometry(1, 0.08, 6, 36), mat);
      m.visible = false;
      scene.add(m);
      this.rings.push({ m, mat, t: 0, life: 0, scale: 1, end: 1 });
    }
    this.beamGeo = new BoxGeometry(1, 1, 1);
    this.beamMats = {
      player: makeBasic(0x7fe9ff, { additive: true }),
      enemy: makeBasic(0xff4a6e, { additive: true }),
      white: makeBasic(0xffffff, { additive: true }),
    };
    this.beams = [];
  }

  // Spawn a burst of particles at p. Colours are hex numbers.
  burst(p, hex, n = 24, speed = 14, size = 0.7, life = 0.7) {
    const c = new Color(hex);
    for (let k = 0; k < n; k++) {
      const i = this.next;
      this.next = (this.next + 1) % this.max;
      const dx = Math.random() * 2 - 1;
      const dy = Math.random() * 2 - 1;
      const dz = Math.random() * 2 - 1;
      const len = Math.hypot(dx, dy, dz) || 1;
      const s = speed * (0.3 + Math.random() * 0.7);
      this.pos.set([p.x, p.y, p.z], i * 3);
      this.vel.set([(dx / len) * s, (dy / len) * s, (dz / len) * s], i * 3);
      this.life[i] = life * (0.6 + Math.random() * 0.6);
      this.maxLife[i] = this.life[i];
      this.size[i] = size * (0.6 + Math.random() * 0.8);
      this.colors.set([c.r, c.g, c.b], i * 3);
    }
  }

  explode(p, big = false) {
    this.burst(p, 0xffd27a, big ? 60 : 24, big ? 26 : 14, big ? 1.4 : 0.9, big ? 1.4 : 0.8);
    this.burst(p, 0xff6a3d, big ? 40 : 14, big ? 18 : 10, big ? 1.2 : 0.8, big ? 1.1 : 0.6);
    this.ring(p, big ? 0xffb35a : 0xffe2a0, big ? 22 : 7, big ? 0.9 : 0.6);
  }

  ring(p, hex, end, life) {
    const r = this.rings.find((x) => x.life <= 0) || this.rings[0];
    r.m.visible = true;
    r.m.position.copy(p);
    r.mat.color.set(hex);
    r.t = 0;
    r.life = life;
    r.end = end;
    r.scale = 1;
  }

  // A thin glowing bolt from a to b, lasting a few frames.
  beam(a, b, kind = 'player', life = 0.09, width = 0.16) {
    const len = a.distanceTo(b);
    if (len < 0.001) return;
    const mesh = new Mesh(this.beamGeo, this.beamMats[kind]);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.scale.set(width, width, len);
    mesh.lookAt(b);
    this.scene.add(mesh);
    this.beams.push({ mesh, life, t: 0 });
  }

  update(dt) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const i3 = i * 3;
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      this.vel[i3] *= 1 - 2.2 * dt;
      this.vel[i3 + 1] *= 1 - 2.2 * dt;
      this.vel[i3 + 2] *= 1 - 2.2 * dt;
      const f = Math.max(0, this.life[i] / this.maxLife[i]);
      const s = this.size[i] * (0.3 + 0.7 * f);
      if (this.life[i] <= 0) {
        dummy.position.set(0, -9999, 0);
        dummy.scale.setScalar(0);
      } else {
        dummy.position.set(this.pos[i3], this.pos[i3 + 1], this.pos[i3 + 2]);
        dummy.scale.setScalar(s);
      }
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
      this.mesh.instanceColor.setXYZ(i, this.colors[i3] * f, this.colors[i3 + 1] * f, this.colors[i3 + 2] * f);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;

    for (const r of this.rings) {
      if (r.life <= 0) continue;
      r.t += dt;
      const k = Math.min(1, r.t / r.life);
      r.scale = 1 + (r.end - 1) * (1 - Math.pow(1 - k, 3));
      r.m.scale.setScalar(r.scale);
      r.m.lookAt(r.m.position.x, r.m.position.y + 1, r.m.position.z + 1);
      r.mat.opacity = 1 - k;
      if (k >= 1) {
        r.life = 0;
        r.m.visible = false;
      }
    }
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      b.t += dt;
      if (b.t >= b.life) {
        this.scene.remove(b.mesh);
        this.beams.splice(i, 1);
      }
    }
  }
}
