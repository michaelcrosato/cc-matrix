// Pooled visual effects: instanced particles, expanding rings and flashes.
import * as THREE from 'three/webgpu';
import { glowMat } from './assets.js';

const CAP = 700;
const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();
const ringGeo = new THREE.TorusGeometry(1, 0.08, 6, 32);
const sphereGeo = new THREE.SphereGeometry(1, 16, 12);

export class Fx {
  constructor(scene) {
    this.scene = scene;
    this.parts = [];
    this.effects = [];
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.inst = new THREE.InstancedMesh(geo, mat, CAP);
    this.inst.count = 0;
    this.inst.frustumCulled = false;
    this.inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.inst);
  }

  burst(pos, color, n = 18, speed = 10, life = 0.6, size = 0.35) {
    for (let i = 0; i < n; i++) {
      if (this.parts.length >= CAP) this.parts.shift();
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      const v = dir.multiplyScalar(speed * (0.3 + Math.random() * 0.7));
      this.parts.push({
        p: new THREE.Vector3(...pos),
        v,
        life,
        max: life,
        size: size * (0.5 + Math.random()),
        color,
      });
    }
  }

  // Expanding torus, used for shockwaves (bomb, boss break-apart).
  ring(pos, color, maxR = 10, life = 0.6) {
    const m = new THREE.Mesh(ringGeo, glowMat(color, 0.9).clone());
    m.position.set(...pos);
    m.lookAt(0, 0, 1000);
    this.scene.add(m);
    this.effects.push({ obj: m, life, max: life, r0: 1, r1: maxR });
  }

  // Expanding glow sphere, for hits and detonations.
  flash(pos, color, size = 2, life = 0.35) {
    const m = new THREE.Mesh(sphereGeo, glowMat(color, 0.85).clone());
    m.position.set(...pos);
    this.scene.add(m);
    this.effects.push({ obj: m, life, max: life, r0: 0.3, r1: size });
  }

  update(dt) {
    const alive = [];
    let i = 0;
    for (const p of this.parts) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.p.addScaledVector(p.v, dt);
      p.v.multiplyScalar(Math.pow(0.05, dt));
      const k = p.life / p.max;
      dummy.position.copy(p.p);
      dummy.rotation.set(p.life * 6, p.life * 4, 0);
      dummy.scale.setScalar(p.size * (0.3 + 0.7 * k));
      dummy.updateMatrix();
      this.inst.setMatrixAt(i, dummy.matrix);
      tmpColor.setHex(p.color);
      this.inst.setColorAt(i, tmpColor);
      i++;
      alive.push(p);
    }
    this.parts = alive;
    this.inst.count = i;
    this.inst.instanceMatrix.needsUpdate = true;
    if (this.inst.instanceColor) this.inst.instanceColor.needsUpdate = true;

    this.effects = this.effects.filter((e) => {
      e.life -= dt;
      if (e.life <= 0) {
        this.scene.remove(e.obj);
        return false;
      }
      const t = 1 - e.life / e.max;
      const r = e.r0 + (e.r1 - e.r0) * t;
      e.obj.scale.setScalar(r);
      if (e.obj.material) e.obj.material.opacity = 0.9 * (1 - t);
      return true;
    });
  }

  clear() {
    for (const e of this.effects) this.scene.remove(e.obj);
    this.effects = [];
    this.parts = [];
    this.inst.count = 0;
  }
}

// Fixed-size pool of pre-built meshes. Used for shots and enemy bullets.
export class Pool {
  constructor(scene, count, make) {
    this.items = [];
    for (let i = 0; i < count; i++) {
      const obj = make();
      obj.visible = false;
      obj.userData.active = false;
      scene.add(obj);
      this.items.push(obj);
    }
  }
  get() {
    const o = this.items.find((m) => !m.userData.active);
    if (!o) return null;
    o.userData.active = true;
    o.visible = true;
    return o;
  }
  release(o) {
    o.userData.active = false;
    o.visible = false;
  }
  releaseAll() {
    for (const o of this.items) this.release(o);
  }
}
