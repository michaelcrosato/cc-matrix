import * as THREE from 'three/webgpu';
import { toon, geo } from '../art/materials.js';
import { cos } from '../core/rng.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color(), _e = new THREE.Euler();

/** CPU-driven instanced blobs: splashes, confetti, dust. No compute: it must run on WebGL2 too. */
export class Particles {
  constructor(max = 900) {
    this.max = max; this.items = []; this.free = [];
    this.mesh = new THREE.InstancedMesh(geo.sphere(1, 10, 8), toon(0xffffff), max);
    this.mesh.castShadow = false; this.mesh.receiveShadow = false;
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.cube = new THREE.InstancedMesh(geo.box(1, 1, 0.12), toon(0xffffff), 400);
    this.cube.castShadow = false; this.cube.receiveShadow = false; this.cube.frustumCulled = false;
    this.cube.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.flakes = [];
    for (let i = 0; i < max; i++) { this.mesh.setColorAt(i, _c.set(0xffffff)); this.free.push(i); }
    for (let i = 0; i < 400; i++) this.cube.setColorAt(i, _c.set(0xffffff));
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.cube.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = max; this.cube.count = 400;
    _m.makeScale(0, 0, 0);
    for (let i = 0; i < max; i++) this.mesh.setMatrixAt(i, _m);
    for (let i = 0; i < 400; i++) this.cube.setMatrixAt(i, _m);
    this.cubeNext = 0;
  }
  addTo(scene) { scene.add(this.mesh); scene.add(this.cube); }
  spawn(x, y, z, vx, vy, vz, size, colour, life = 0.8, g = 9.8) {
    const i = this.free.pop();
    if (i === undefined) return;
    this.items.push({ i, x, y, z, vx, vy, vz, size, life, t: 0, g, floor: -1e9 });
    this.mesh.setColorAt(i, _c.set(colour));
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  burst(x, y, z, n, opts = {}) {
    const { speed = 3, up = 3, size = 0.08, colour = 0xffffff, life = 0.7, spread = 1, colours = null } = opts;
    for (let k = 0; k < n; k++) {
      const a = cos(0, Math.PI * 2), r = cos(0.2, 1) * speed * spread;
      this.spawn(x, y, z, Math.cos(a) * r, cos(0.4, 1.3) * up, Math.sin(a) * r, size * cos(0.6, 1.3), colours ? colours[k % colours.length] : colour, life * cos(0.7, 1.2));
    }
  }
  splash(x, y, z, big = 1, colour = 0xEFFBFB) {
    this.burst(x, y, z, Math.round(26 * big), { speed: 2.2 * big, up: 6.5 * Math.sqrt(big), size: 0.11 * Math.sqrt(big), colour, life: 1 });
  }
  /** Confetti flakes tumble and flutter. */
  confetti(x, y, z, n, colours, spread = 6) {
    for (let k = 0; k < n; k++) {
      const i = this.cubeNext = (this.cubeNext + 1) % 400;
      const old = this.flakes.findIndex((f) => f.i === i);
      if (old >= 0) this.flakes.splice(old, 1);
      this.flakes.push({ i, x: x + cos(-spread, spread), y: y + cos(0, 3), z: z + cos(-spread, spread), s: cos(0.05, 0.11), ph: cos(0, 6), sp: cos(1, 4), life: cos(2.5, 5), t: 0 });
      this.cube.setColorAt(i, _c.set(colours[k % colours.length]));
    }
    if (this.cube.instanceColor) this.cube.instanceColor.needsUpdate = true;
  }
  frame(dt) {
    const items = this.items;
    for (let n = items.length - 1; n >= 0; n--) {
      const p = items[n];
      p.t += dt;
      if (p.t >= p.life) {
        _m.makeScale(0, 0, 0); this.mesh.setMatrixAt(p.i, _m);
        this.free.push(p.i); items[n] = items[items.length - 1]; items.pop();
        continue;
      }
      p.vy -= p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const s = p.size * (1 - (p.t / p.life) ** 3);
      _m.makeScale(s, s, s); _m.setPosition(p.x, p.y, p.z);
      this.mesh.setMatrixAt(p.i, _m);
    }
    if (items.length || this._dirty) { this.mesh.instanceMatrix.needsUpdate = true; this._dirty = items.length > 0; }
    const fl = this.flakes;
    for (let n = fl.length - 1; n >= 0; n--) {
      const f = fl[n];
      f.t += dt;
      if (f.t >= f.life) {
        _m.makeScale(0, 0, 0); this.cube.setMatrixAt(f.i, _m);
        fl[n] = fl[fl.length - 1]; fl.pop();
        continue;
      }
      f.y -= 1.2 * dt; f.x += Math.sin(f.t * f.sp + f.ph) * 0.8 * dt;
      _e.set(f.t * f.sp, f.ph + f.t * 2, f.t * 1.3); _q.setFromEuler(_e);
      _s.setScalar(f.s); _p.set(f.x, f.y, f.z);
      _m.compose(_p, _q, _s); this.cube.setMatrixAt(f.i, _m);
    }
    if (fl.length || this._dirtyC) { this.cube.instanceMatrix.needsUpdate = true; this._dirtyC = fl.length > 0; }
  }
  clear() {
    for (const p of this.items) { _m.makeScale(0, 0, 0); this.mesh.setMatrixAt(p.i, _m); this.free.push(p.i); }
    this.items.length = 0;
    for (const f of this.flakes) { _m.makeScale(0, 0, 0); this.cube.setMatrixAt(f.i, _m); }
    this.flakes.length = 0;
    this.mesh.instanceMatrix.needsUpdate = true; this.cube.instanceMatrix.needsUpdate = true;
  }
}
