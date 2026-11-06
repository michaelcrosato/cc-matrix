import * as THREE from 'three/webgpu';
import { Fn, mix, smoothstep, normalize, positionWorld, cameraPosition } from 'three/tsl';
import { PU } from './palette.js';
import { toon } from '../art/materials.js';
import { cosRange } from '../core/rng.js';
export function makeSky(scene) {
  const m = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false });
  m.colorNode = Fn(() => {
    const y = normalize(positionWorld.sub(cameraPosition)).y;
    return mix(mix(PU.skyLow, PU.skyMid, smoothstep(0, .14, y)), PU.skyTop, smoothstep(.1, .5, y));
  })();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 20), m); sky.frustumCulled = false; scene.add(sky);
  const clouds = new THREE.Group(); scene.add(clouds);
  const cm = toon('#FFF8EE'); const g = new THREE.SphereGeometry(1, 14, 10);
  const list = [];
  for (let i = 0; i < 16; i++) {
    const c = new THREE.Group(); const a = cosRange(0, Math.PI * 2), d = cosRange(120, 300);
    c.position.set(Math.cos(a) * d, cosRange(40, 95), Math.sin(a) * d);
    for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(g, cm); b.position.set(cosRange(-14, 14), cosRange(-1, 2), cosRange(-5, 5)); b.scale.set(cosRange(8, 16), cosRange(2.5, 4.5), cosRange(5, 8)); c.add(b); }
    clouds.add(c); list.push(c);
  }
  return { tick(dt, camera) { sky.position.copy(camera.position); for (const c of list) { c.position.x += dt * .9; if (c.position.x > 320) c.position.x = -320; } } };
}
