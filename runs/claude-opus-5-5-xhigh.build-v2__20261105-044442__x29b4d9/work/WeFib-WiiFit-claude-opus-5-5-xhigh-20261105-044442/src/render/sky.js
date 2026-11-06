import * as THREE from 'three/webgpu';
import { positionWorld, cameraPosition, normalize, smoothstep, mix, vec3 } from 'three/tsl';
import { toon, geo } from '../art/materials.js';
import { cos } from '../core/rng.js';

export function makeSky(palette) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false, fog: false });
  const dir = normalize(positionWorld.sub(cameraPosition));
  const low = mix(palette.u.skyLow, palette.u.skyMid, smoothstep(0, 0.14, dir.y));
  mat.colorNode = vec3(mix(low, palette.u.skyTop, smoothstep(0.1, 0.5, dir.y)));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(600, 48, 24), mat);
  dome.frustumCulled = false;
  dome.renderOrder = -10;
  group.add(dome);
  // Inked toon clouds: flattened spheres that drift.
  const clouds = [];
  const cloudMat = toon(0xFFF8F0);
  for (let i = 0; i < 14; i++) {
    const c = new THREE.Group();
    const n = 3 + Math.floor(cos(0, 4));
    for (let j = 0; j < n; j++) {
      const m = new THREE.Mesh(geo.sphere(1), cloudMat);
      m.position.set((j - n / 2) * 7 + cos(-2, 2), cos(-1, 1.5), cos(-2, 2));
      m.scale.set(cos(6, 10), cos(2.4, 4), cos(4, 6));
      m.castShadow = false; m.receiveShadow = false;
      c.add(m);
    }
    const a = cos(0, Math.PI * 2), r = cos(150, 380);
    c.position.set(Math.cos(a) * r, cos(55, 130), Math.sin(a) * r);
    c.userData.speed = cos(0.4, 1.2);
    group.add(c);
    clouds.push(c);
  }
  return {
    group,
    frame(dt) {
      for (const c of clouds) {
        c.position.x += c.userData.speed * dt;
        if (c.position.x > 420) c.position.x = -420;
      }
    },
  };
}
