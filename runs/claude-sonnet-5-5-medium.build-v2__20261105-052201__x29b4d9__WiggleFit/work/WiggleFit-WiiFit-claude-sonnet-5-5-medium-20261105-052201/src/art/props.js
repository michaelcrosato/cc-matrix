import * as THREE from 'three/webgpu';
import { toon } from '../render/renderer.js';
const mats = {};
export const m = (c) => (mats[c] = mats[c] || toon(c));
export function box(w, h, d, c, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m(c)); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; }
export function cyl(r, h, c, x = 0, y = 0, z = 0, seg = 16) { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m(c)); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; }
export function ball(r, c, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m(c)); o.position.set(x, y, z); o.castShadow = true; return o; }
export function cone(r, h, c, x = 0, y = 0, z = 0, seg = 14) { const o = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), m(c)); o.position.set(x, y, z); o.castShadow = true; return o; }
export function disc(r, h, c, x = 0, y = 0, z = 0) { return cyl(r, h, c, x, y, z, 40); }
export function toyTree(x, z, s = 1) { const g = new THREE.Group(); g.add(cyl(0.18 * s, 1.2 * s, '#9A6B3F', 0, 0.6 * s, 0, 8), ball(0.9 * s, '#3CAA5A', 0, 1.7 * s, 0), ball(0.6 * s, '#52C46E', 0.3 * s, 2.2 * s, 0.1 * s)); g.position.set(x, 0, z); return g; }
export function bunting(x1, z1, x2, z2, y) {
  const g = new THREE.Group(); const cols = ['#E8443A', '#F5B700', '#3B82F6', '#22C55E', '#FFFFFF'];
  const n = 9; for (let i = 0; i <= n; i++) { const t = i / n; const sag = Math.sin(t * Math.PI) * 0.5; const f = cone(0.18, 0.4, cols[i % 5], x1 + (x2 - x1) * t, y - sag, z1 + (z2 - z1) * t, 3); f.rotation.x = Math.PI; g.add(f); }
  return g;
}
