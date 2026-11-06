import * as THREE from 'three/webgpu';
import { Fn, mix, step, length, sin, time, smoothstep, positionWorld, cameraPosition, float, uniform, vec2 } from 'three/tsl';
import { PU } from './palette.js';
export const seaU = { cx: uniform(0), cz: uniform(0), foam: uniform(1), tiltX: uniform(0), tiltZ: uniform(0) };
export function makeSea(scene) {
  const m = new THREE.MeshBasicNodeMaterial();
  m.colorNode = Fn(() => {
    const p = positionWorld.xz;
    const warp = sin(p.x.mul(.09).add(time.mul(.3))).mul(4).add(sin(p.y.mul(.07).sub(time.mul(.22))).mul(4));
    const wave = sin(length(p).mul(.55).add(warp).sub(time.mul(.7))).mul(.5).add(.5);
    const c0 = mix(PU.sea, PU.seaHi, step(.86, wave));
    const d = length(p.sub(vec2(seaU.cx, seaU.cz)));
    // Foam near the island, plus rings that follow the tilt.
    const bias = p.x.sub(seaU.cx).mul(seaU.tiltX).add(p.y.sub(seaU.cz).mul(seaU.tiltZ)).mul(.35);
    const foam = step(d.add(bias), float(25)).mul(seaU.foam).add(step(.93, sin(d.add(bias).mul(1.3).sub(time.mul(1.2))).mul(.5).add(.5)).mul(oneMinusSm(d, 25, 40)).mul(seaU.foam));
    const c1 = mix(c0, PU.seaHi, foam.clamp(0, 1).mul(.85));
    const far = length(positionWorld.sub(cameraPosition));
    return mix(c1, PU.skyLow, smoothstep(60, 260, far));
  })();
  const sea = new THREE.Mesh(new THREE.CircleGeometry(590, 72), m); sea.rotation.x = -Math.PI / 2; sea.position.y = -.6; sea.frustumCulled = false; scene.add(sea);
  return sea;
}
function oneMinusSm(d, a, b) { return float(1).sub(smoothstep(a, b, d)); }
