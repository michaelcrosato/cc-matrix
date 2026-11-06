import * as THREE from 'three/webgpu';
import { toon } from '../art/materials.js';
import { cosRange } from '../core/rng.js';
// CPU-driven instances only: compute nodes would break the WebGL2 fallback.
const N = 700;
const m4 = new THREE.Matrix4(), col = new THREE.Color();
export class Particles {
  constructor(scene) {
    this.mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), toon('#ffffff'), N); this.mesh.frustumCulled = false; this.mesh.castShadow = false;
    for (let i = 0; i < N; i++) { this.mesh.setMatrixAt(i, m4.makeScale(0, 0, 0)); this.mesh.setColorAt(i, col.set('#ffffff')); }
    scene.add(this.mesh); this.p = new Array(N).fill(null); this.next = 0; this.active = 0;
  }
  spawn(x, y, z, vx, vy, vz, size, life, color, g = 9) {
    const i = this.next; this.next = (i + 1) % N;
    this.p[i] = { x, y, z, vx, vy, vz, size, life, max: life, g };
    this.mesh.setColorAt(i, col.set(color)); this.mesh.instanceColor.needsUpdate = true;
  }
  burst(x, y, z, n, color, speed = 3, size = .08, life = .8, up = 2) {
    for (let k = 0; k < n; k++) { const a = cosRange(0, 6.283), s = cosRange(.3, 1) * speed; this.spawn(x, y, z, Math.cos(a) * s, up + cosRange(0, speed), Math.sin(a) * s, size * cosRange(.6, 1.3), life * cosRange(.7, 1.2), Array.isArray(color) ? color[k % color.length] : color); }
  }
  splash(x, y, z, big = 1) { this.burst(x, y, z, Math.floor(26 * big), ['#FFFFFF', '#BDF2F2', '#8CE0E8'], 3.2 * big, .13 * Math.sqrt(big), 1, 3 + 3.5 * big); }
  confetti(x, y, z, n = 60) { for (let k = 0; k < n; k++) this.spawn(x + cosRange(-5, 5), y + cosRange(0, 3), z + cosRange(-3, 3), cosRange(-.6, .6), cosRange(-1, 0), cosRange(-.6, .6), .07, cosRange(2, 3.5), ['#E8443A', '#3B82F6', '#22C55E', '#F5B700', '#F58A5C'][k % 5], .8); }
  tick(dt) {
    let a = 0;
    for (let i = 0; i < N; i++) {
      const p = this.p[i]; if (!p) continue; a++;
      p.life -= dt;
      if (p.life <= 0) { this.p[i] = null; this.mesh.setMatrixAt(i, m4.makeScale(0, 0, 0)); continue; }
      p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const s = p.size * Math.min(1, p.life / p.max * 2.5);
      m4.makeScale(s, s, s); m4.setPosition(p.x, p.y, p.z); this.mesh.setMatrixAt(i, m4);
    }
    this.active = a; this.mesh.instanceMatrix.needsUpdate = true;
  }
  clear() { for (let i = 0; i < N; i++) if (this.p[i]) { this.p[i] = null; this.mesh.setMatrixAt(i, m4.makeScale(0, 0, 0)); } this.mesh.instanceMatrix.needsUpdate = true; }
}
