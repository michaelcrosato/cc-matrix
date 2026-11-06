import * as THREE from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { positionLocal, normalLocal, float } from 'three/tsl';
import { INK } from '../data/config.js';

// Cel shading: a three-step ramp on toon node materials.
let ramp = null;
function gradient() {
  if (ramp) return ramp;
  ramp = new THREE.DataTexture(new Uint8Array([96, 178, 255]), 3, 1, THREE.RedFormat);
  ramp.minFilter = THREE.NearestFilter; ramp.magFilter = THREE.NearestFilter;
  ramp.colorSpace = THREE.NoColorSpace;
  ramp.needsUpdate = true;
  return ramp;
}
const cache = new Map();
export function toon(color) {
  const key = typeof color === 'string' ? new THREE.Color(color).getHex() : color;
  let m = cache.get(key);
  if (!m) { m = new THREE.MeshToonNodeMaterial({ color: key, gradientMap: gradient() }); cache.set(key, m); }
  return m;
}
export const freshToon = (color, opts = {}) => new THREE.MeshToonNodeMaterial({ color, gradientMap: gradient(), ...opts });
export const basic = (color, opts = {}) => new THREE.MeshBasicNodeMaterial({ color, ...opts });
export const inkMat = () => toon(INK);
/** Glass: never toon, or the hull draws solid ink behind it. */
export const glass = (opacity = 0.16) => new THREE.MeshBasicNodeMaterial({ color: 0xe8fbff, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });

// Shared geometry, keyed by size.
const gc = new Map();
const memo = (k, f) => { let g = gc.get(k); if (!g) { g = f(); gc.set(k, g); } return g; };
export const geo = {
  sphere: (r = 1, w = 20, h = 14) => memo(`s${r},${w}`, () => new THREE.SphereGeometry(r, w, h)),
  box: (x, y, z) => memo(`b${x},${y},${z}`, () => new THREE.BoxGeometry(x, y, z)),
  rbox: (x, y, z, r = 0.05) => memo(`r${x},${y},${z},${r}`, () => new RoundedBoxGeometry(x, y, z, 3, r)),
  cyl: (rt, rb, h, s = 20) => memo(`c${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s)),
  cone: (r, h, s = 16) => memo(`n${r},${h},${s}`, () => new THREE.ConeGeometry(r, h, s)),
  cap: (r, l, s = 14) => memo(`p${r},${l},${s}`, () => new THREE.CapsuleGeometry(r, l, 6, s)),
  tor: (r, t, a = Math.PI * 2, s = 40) => memo(`t${r},${t},${a},${s}`, () => new THREE.TorusGeometry(r, t, 10, s, a)),
  disc: (r, s = 40) => memo(`d${r},${s}`, () => { const g = new THREE.CircleGeometry(r, s); g.rotateX(-Math.PI / 2); return g; }),
  ring: (a, b, s = 40) => memo(`g${a},${b},${s}`, () => { const g = new THREE.RingGeometry(a, b, s); g.rotateX(-Math.PI / 2); return g; }),
};

/** A shadowed mesh at a spot. opts: rot [x,y,z], scale number or [x,y,z], shadow. */
export function M(g, m, x = 0, y = 0, z = 0, opts = {}) {
  const mesh = new THREE.Mesh(g, typeof m === 'number' || typeof m === 'string' ? toon(m) : m);
  mesh.position.set(x, y, z);
  if (opts.rot) mesh.rotation.set(...opts.rot);
  if (opts.scale !== undefined) { if (Array.isArray(opts.scale)) mesh.scale.set(...opts.scale); else mesh.scale.setScalar(opts.scale); }
  mesh.castShadow = opts.shadow !== false; mesh.receiveShadow = opts.receive !== false;
  if (opts.parent) opts.parent.add(mesh);
  return mesh;
}
export const add = (parent, ...kids) => { for (const k of kids) parent.add(k); return parent; };
export const G = (name, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); if (name) g.name = name; g.position.set(x, y, z); return g; };

/** A thick-outline copy of a group's meshes, hidden until hovered. */
export function makeOutline(group, thickness = 0.06) {
  const mat = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(INK), side: THREE.BackSide });
  mat.positionNode = outlinePosition(thickness);
  const holder = new THREE.Group();
  const meshes = [];
  group.updateWorldMatrix(true, true);
  group.traverse((o) => { if (o.isMesh && !o.material.transparent) meshes.push(o); });
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  for (const o of meshes) {
    const c = new THREE.Mesh(o.geometry, mat);
    c.matrixAutoUpdate = false;
    c.matrix.multiplyMatrices(inv, o.matrixWorld);
    c.castShadow = false; c.receiveShadow = false;
    holder.add(c);
  }
  holder.visible = false;
  group.add(holder);
  return holder;
}
function outlinePosition(t) { return positionLocal.add(normalLocal.mul(float(t))); }
