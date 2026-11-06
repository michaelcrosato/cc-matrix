import * as THREE from 'three/webgpu';
import { positionLocal, normalLocal } from 'three/tsl';
const ramp = new THREE.DataTexture(new Uint8Array([96, 178, 255]), 3, 1, THREE.RedFormat);
ramp.minFilter = THREE.NearestFilter; ramp.magFilter = THREE.NearestFilter; ramp.colorSpace = THREE.NoColorSpace; ramp.needsUpdate = true;
const cache = new Map();
export function toon(color) {
  const k = String(color);
  if (!cache.has(k)) cache.set(k, new THREE.MeshToonNodeMaterial({ color, gradientMap: ramp }));
  return cache.get(k);
}
export const glass = () => new THREE.MeshBasicNodeMaterial({ color: 0xe8fbff, transparent: true, opacity: .16, side: THREE.DoubleSide, depthWrite: false });
export const flat = (color, opacity = 1) => new THREE.MeshBasicNodeMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
const geo = new Map();
export function cached(key, make) { if (!geo.has(key)) geo.set(key, make()); return geo.get(key); }
export function mesh(g, color, shadow = true) { const m = new THREE.Mesh(g, typeof color === 'object' ? color : toon(color)); m.castShadow = shadow; m.receiveShadow = shadow; return m; }
export const sphere = (r, color, sx = 1, sy = 1, sz = 1) => { const m = mesh(cached('s', () => new THREE.SphereGeometry(1, 20, 14)), color); m.scale.set(r * sx, r * sy, r * sz); return m; };
export const capsule = (r, len, color) => mesh(cached(`c${r}_${len}`, () => new THREE.CapsuleGeometry(r, len, 6, 14)), color);
export const cyl = (rt, rb, h, color, seg = 18) => mesh(cached(`y${rt}_${rb}_${h}_${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), color);
export const cone = (r, h, color, seg = 14) => mesh(cached(`k${r}_${h}_${seg}`, () => new THREE.ConeGeometry(r, h, seg)), color);
export const torus = (r, t, color, arc = Math.PI * 2) => mesh(cached(`t${r}_${t}_${arc}`, () => new THREE.TorusGeometry(r, t, 10, 28, arc)), color);
export const box = (x, y, z, color) => mesh(cached(`b${x}_${y}_${z}`, () => new THREE.BoxGeometry(x, y, z)), color);
/** A thick inked outline for hovered things: an inverted hull pushed out along the normals. */
const hullMats = new Map();
export function outlineOf(root, width = .07) {
  const out = new THREE.Group(); root.updateWorldMatrix(true, true); const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  root.traverse((m) => {
    if (!m.isMesh || m.isInstancedMesh || !m.geometry.attributes.normal || m.material?.transparent) return;
    const c = new THREE.Mesh(m.geometry); c.matrixAutoUpdate = false; c.matrix.multiplyMatrices(inv, m.matrixWorld);
    const s = new THREE.Vector3().setFromMatrixScale(c.matrix), k = Math.round(width / Math.max(.001, (s.x + s.y + s.z) / 3) * 200) / 200;
    if (!hullMats.has(k)) { const mat = new THREE.MeshBasicNodeMaterial({ color: 0xffd23f, side: THREE.BackSide }); mat.positionNode = positionLocal.add(normalLocal.mul(k)); hullMats.set(k, mat); }
    c.material = hullMats.get(k); c.castShadow = false; c.receiveShadow = false; out.add(c);
  });
  return out;
}
export const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
