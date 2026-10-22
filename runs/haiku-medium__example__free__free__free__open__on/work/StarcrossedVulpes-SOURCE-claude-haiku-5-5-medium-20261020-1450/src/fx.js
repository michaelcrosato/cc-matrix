// Visual effects: instanced particle bursts, expanding shockwaves and pooled point-light flashes.
import * as THREE from 'three';

const MAX_PARTICLES = 900;
const MAX_RINGS = 14;
const MAX_FLASHES = 4;

const parts = [];
const rings = [];
const flashes = [];
let particleMesh = null;
let cam = null;
const tmp = new THREE.Object3D();
const col = new THREE.Color();
let sceneRef = null;

export function initFX(scene, camera) {
  sceneRef = scene;
  cam = camera;
  particleMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ toneMapped: false }), MAX_PARTICLES);
  particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  particleMesh.frustumCulled = false;
  for (let i = 0; i < MAX_PARTICLES; i++) {
    parts.push({ alive: false, p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, max: 1, size: 1 });
    particleMesh.setColorAt(i, col.set(0xffffff));
  }
  particleMesh.instanceColor.needsUpdate = true;
  scene.add(particleMesh);

  for (let i = 0; i < MAX_RINGS; i++) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 40), new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    }));
    m.visible = false;
    scene.add(m);
    rings.push({ m, life: 0, max: 1, r: 1, maxR: 1 });
  }
  for (let i = 0; i < MAX_FLASHES; i++) {
    const l = new THREE.PointLight(0xffffff, 0, 1, 2);
    scene.add(l);
    flashes.push({ l, life: 0, max: 1, peak: 0 });
  }
}

let nextPart = 0;
export function burst(pos, { count = 24, color = 0xffaa33, speed = 30, life = 0.6, size = 1.2 } = {}) {
  const c = new THREE.Color(color);
  for (let n = 0; n < count; n++) {
    const idx = nextPart;
    nextPart = (nextPart + 1) % MAX_PARTICLES;
    const q = parts[idx];
    q.alive = true;
    q.p.copy(pos);
    const s = speed * (0.3 + Math.random());
    q.v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(s);
    q.life = life * (0.6 + Math.random() * 0.6);
    q.max = q.life;
    q.size = size * (0.5 + Math.random());
    particleMesh.setColorAt(idx, col.copy(c).offsetHSL(0, 0, (Math.random() - 0.5) * 0.2));
  }
  particleMesh.instanceColor.needsUpdate = true;
}

export function shock(pos, { color = 0xffffff, maxR = 30, life = 0.6, opacity = 0.9 } = {}) {
  const r = rings.find((x) => x.life <= 0) || rings[0];
  r.m.visible = true;
  r.m.position.copy(pos);
  r.m.material.color.set(color);
  r.m.material.opacity = opacity;
  r.life = life; r.max = life; r.maxR = maxR; r.r = 1; r.opacity = opacity;
}

export function flash(pos, { color = 0xffffff, intensity = 6, dist = 80, life = 0.5 } = {}) {
  const f = flashes.find((x) => x.life <= 0) || flashes[0];
  f.l.position.copy(pos);
  f.l.color.set(color);
  f.l.distance = dist;
  f.peak = intensity;
  f.life = life; f.max = life;
}

export function update(dt) {
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const q = parts[i];
    if (!q.alive) {
      tmp.position.set(0, -9999, 0); tmp.scale.setScalar(0); tmp.updateMatrix();
      particleMesh.setMatrixAt(i, tmp.matrix);
      continue;
    }
    q.life -= dt;
    if (q.life <= 0) { q.alive = false; i--; continue; }
    q.v.multiplyScalar(Math.pow(0.12, dt));
    q.p.addScaledVector(q.v, dt);
    const k = q.life / q.max;
    tmp.position.copy(q.p);
    tmp.scale.setScalar(q.size * (0.3 + 0.7 * k));
    tmp.updateMatrix();
    particleMesh.setMatrixAt(i, tmp.matrix);
  }
  particleMesh.instanceMatrix.needsUpdate = true;

  for (const r of rings) {
    if (r.life <= 0) { r.m.visible = false; continue; }
    r.life -= dt;
    const k = 1 - Math.max(0, r.life) / r.max;
    r.m.scale.setScalar(1 + k * r.maxR);
    r.m.material.opacity = r.opacity * (1 - k);
    r.m.quaternion.copy(cam.quaternion);
    if (r.life <= 0) r.m.visible = false;
  }
  for (const f of flashes) {
    if (f.life <= 0) { f.l.intensity = 0; continue; }
    f.life -= dt;
    f.l.intensity = f.peak * Math.max(0, f.life / f.max);
  }
}

export function clearFX() {
  for (const q of parts) q.alive = false;
  for (const r of rings) r.life = 0;
  for (const f of flashes) f.life = 0;
}
