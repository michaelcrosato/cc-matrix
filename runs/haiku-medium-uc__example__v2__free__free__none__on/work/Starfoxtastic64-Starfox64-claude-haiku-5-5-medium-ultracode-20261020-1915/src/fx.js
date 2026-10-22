// Visual effects: instanced sparks and smoke, expanding shockwave rings, Rapier-driven debris, and camera shake.
import * as THREE from 'three/webgpu';
import { glowMat, toonMat } from './gfx.js';
import { clamp, rng } from './util.js';

const MAX_PARTICLES = 1400;
const MAX_RINGS = 10;
const MAX_DEBRIS = 90;

export class FX {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;
    this.rand = rng(9001);
    this.shake = 0;

    const unit = new THREE.BoxGeometry(1, 1, 1);
    this.sparkMesh = new THREE.InstancedMesh(unit, glowMat(0xffffff, 1), MAX_PARTICLES);
    this.sparkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.sparkMesh.frustumCulled = false;
    scene.add(this.sparkMesh);

    this.smokeMesh = new THREE.InstancedMesh(unit, new THREE.MeshBasicNodeMaterial({ color: 0x2a2630, transparent: true, opacity: 0.55, depthWrite: false }), MAX_PARTICLES);
    this.smokeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.smokeMesh.frustumCulled = false;
    scene.add(this.smokeMesh);

    this.particles = [];
    this.smokes = [];
    this.rings = [];
    this.debris = [];

    this.tmpM = new THREE.Matrix4();
    this.tmpQ = new THREE.Quaternion();
    this.tmpS = new THREE.Vector3();
    this.tmpP = new THREE.Vector3();
    this.tmpC = new THREE.Color();
    this.debrisGeo = new THREE.BoxGeometry(1, 1, 1);

    this.ringGeo = new THREE.TorusGeometry(1, 0.1, 6, 36);
    for (let i = 0; i < MAX_RINGS; i++) {
      const mat = glowMat(0xffffff, 1.5);
      const mesh = new THREE.Mesh(this.ringGeo, mat);
      mesh.visible = false;
      mesh.userData.free = true;
      scene.add(mesh);
      this.rings.push({ mesh, mat, life: 0, max: 1, hex: 0xffffff, size: 1 });
    }
    this.debrisPool = [];
  }

  // Spawn one particle into the pool (dropped if full).
  particle(pos, vel, life, size, hex, { drag = 2.5, gravity = 0, smoke = false, grow = 0 } = {}) {
    const list = smoke ? this.smokes : this.particles;
    const cap = MAX_PARTICLES;
    if (list.length >= cap) list.shift();
    list.push({
      x: pos.x, y: pos.y, z: pos.z,
      vx: vel.x, vy: vel.y, vz: vel.z,
      life, max: life, size, grow,
      color: new THREE.Color(hex),
      drag, gravity,
    });
  }

  explode(pos, size = 1, hex = 0xffa43b, big = false) {
    const count = big ? 80 : Math.round(18 + size * 10);
    const r = this.rand;
    const spread = 4 + size * 5;
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize();
      const sp = spread * (0.3 + r());
      const vel = dir.multiplyScalar(sp);
      const hot = r() < 0.5 ? hex : 0xffdd66;
      this.particle(pos, vel, 0.35 + r() * 0.6, 0.25 + r() * 0.5 * size, hot, { drag: 3, gravity: 0 });
    }
    for (let i = 0; i < count / 2; i++) {
      const dir = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize();
      this.particle(pos, dir.multiplyScalar(spread * 0.4), 0.9 + r() * 0.9, 0.8 + size * 0.7, 0x3a3440, { drag: 1.5, smoke: true, grow: 1.8 });
    }
    this.shockwave(pos, 4 + size * 5, big ? 0.9 : 0.5, hex);
    const chunks = big ? 9 : 3;
    for (let i = 0; i < chunks; i++) this.chunk(pos, size, hex);
    this.shake = Math.max(this.shake, big ? 1.4 : 0.35 * size);
  }

  chunk(pos, size, hex) {
    if (this.debris.length >= MAX_DEBRIS) return;
    const r = this.rand;
    const dir = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1);
    const sp = 6 + r() * 12;
    const dim = 0.18 + r() * 0.35 * size;
    const body = this.physics.spawnDebris(pos.x, pos.y, pos.z, dir.x * sp, dir.y * sp, dir.z * sp, dim);
    const mesh = new THREE.Mesh(this.debrisGeo, toonMat(r() < 0.6 ? 0x6f6a66 : hex));
    mesh.scale.setScalar(dim * 2);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.debris.push({ body, mesh, life: 3 + r() * 2 });
  }

  // Quick hit-spark at an impact point.
  spark(pos, hex = 0xffe9a0, n = 6) {
    const r = this.rand;
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).multiplyScalar(7);
      this.particle(pos, v, 0.18 + r() * 0.2, 0.25, hex, { drag: 4 });
    }
  }

  shockwave(pos, radius, dur, hex) {
    const ring = this.rings.find((rg) => rg.mesh.userData.free) || this.rings[0];
    ring.mesh.userData.free = false;
    ring.mesh.visible = true;
    ring.mesh.position.copy(pos);
    ring.mesh.quaternion.identity();
    ring.life = dur;
    ring.max = dur;
    ring.hex = hex;
    ring.size = radius;
  }

  // Remaining time 0..1 applied to brightness and radius for each shockwave.
  updateRings(dt, camera) {
    for (const rg of this.rings) {
      if (rg.mesh.userData.free) continue;
      rg.life -= dt;
      if (rg.life <= 0) {
        rg.mesh.visible = false;
        rg.mesh.userData.free = true;
        continue;
      }
      const t = 1 - rg.life / rg.max;
      const s = rg.size * (0.2 + t * 1.2);
      rg.mesh.scale.setScalar(s);
      rg.mesh.lookAt(camera.position);
      rg.mat.color.copy(new THREE.Color(rg.hex)).multiplyScalar(2.2 * (1 - t));
    }
  }

  update(dt) {
    this.shake = Math.max(0, this.shake - dt * 2.2);
    this.updateParticles(dt, this.particles, this.sparkMesh, false);
    this.updateParticles(dt, this.smokes, this.smokeMesh, true);
    this.updateDebris(dt);
  }

  updateParticles(dt, list, mesh, smoke) {
    let n = 0;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life -= dt;
      if (p.life <= 0) {
        list.splice(i, 1);
        continue;
      }
      const k = Math.exp(-p.drag * dt);
      p.vx *= k;
      p.vy = p.vy * k - p.gravity * dt;
      p.vz *= k;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const t = 1 - p.life / p.max;
      const s = p.size * (1 + p.grow * t) * (smoke ? 1 : clamp(p.life / p.max * 1.5, 0.05, 1));
      this.tmpP.set(p.x, p.y, p.z);
      this.tmpS.set(s, s, s);
      this.tmpM.compose(this.tmpP, this.tmpQ, this.tmpS);
      mesh.setMatrixAt(n, this.tmpM);
      this.tmpC.copy(p.color);
      if (!smoke) this.tmpC.multiplyScalar(2.2);
      mesh.setColorAt(n, this.tmpC);
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  updateDebris(dt) {
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life -= dt;
      if (d.life <= 0) {
        this.physics.removeBody(d.body);
        this.scene.remove(d.mesh);
        this.debris.splice(i, 1);
        continue;
      }
      const t = d.body.translation();
      const q = d.body.rotation();
      d.mesh.position.set(t.x, t.y, t.z);
      d.mesh.quaternion.set(q.x, q.y, q.z, q.w);
    }
  }

  // Positional shake offset for the camera, scaled by the Settings toggle.
  shakeOffset(enabled) {
    if (!enabled || this.shake <= 0) return new THREE.Vector3();
    const amt = this.shake * 0.6;
    return new THREE.Vector3((Math.random() - 0.5) * amt, (Math.random() - 0.5) * amt, 0);
  }

  // Clear everything on stage change so pooled meshes do not carry over.
  reset() {
    this.particles.length = 0;
    this.smokes.length = 0;
    this.shake = 0;
    for (const rg of this.rings) {
      rg.mesh.visible = false;
      rg.mesh.userData.free = true;
    }
    for (const d of this.debris) {
      this.physics.removeBody(d.body);
      this.scene.remove(d.mesh);
    }
    this.debris.length = 0;
  }
}
