import * as THREE from 'three/webgpu';
import {
  positionWorld, cameraPosition, length, sin, time, step, mix, smoothstep, vec3, vec2, uniform, float, max, cos as tcos, abs,
} from 'three/tsl';

/** Hard-banded toon sea on a huge disc, melting into the horizon colour. */
export function makeSea(palette) {
  const mat = new THREE.MeshBasicNodeMaterial();
  const centre = uniform(new THREE.Vector2(0, 0));
  const foamR = uniform(26), tiltX = uniform(0), tiltZ = uniform(0);
  const p = positionWorld.xz;
  const d = length(p.sub(centre));
  const warp = sin(p.x.mul(0.07).add(time.mul(0.25))).mul(2.2).add(sin(p.y.mul(0.09).sub(time.mul(0.2))).mul(2.2));
  const wave = sin(d.add(warp).mul(0.62).sub(time.mul(0.8))).mul(0.5).add(0.5);
  const bands = step(0.86, wave);
  let col = mix(palette.u.sea, palette.u.seaHi, bands);
  // Foam rings hug the island and lean with it.
  const q = p.sub(centre);
  const leaned = d.add(q.x.mul(tiltX).add(q.y.mul(tiltZ)).mul(6));
  const ring = sin(leaned.mul(1.1).sub(time.mul(1.4))).mul(0.5).add(0.5);
  const foam = step(0.72, ring).mul(float(1).sub(smoothstep(foamR, foamR.add(9), d)));
  col = mix(col, vec3(0.97, 0.98, 0.96), foam.mul(0.85));
  const camD = length(p.sub(cameraPosition.xz));
  mat.colorNode = mix(col, palette.u.skyLow, smoothstep(60, 260, camD));
  const geo = new THREE.CircleGeometry(590, 96);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.receiveShadow = false;
  return {
    mesh,
    setLevel(y) { mesh.position.y = y; },
    setFoam(x, z, r) { centre.value.set(x, z); foamR.value = r; },
    setTilt(tx, tz) { tiltX.value = tx; tiltZ.value = tz; },
  };
}
