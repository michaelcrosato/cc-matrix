import * as THREE from 'three/webgpu';
import { toon } from '../render/renderer.js';
const mats = {}; const M = (c) => (mats[c] = mats[c] || toon(c));
const mk = (g, c, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(g, M(c)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; return m; };
const S = (r) => new THREE.SphereGeometry(r, 14, 10);

// Trudy, Head of Alignment: a chunky spirit level on two pegs. Her bubble is her eye.
export function createTrudy() {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body); body.position.y = 0.62;
  body.add(mk(new THREE.BoxGeometry(1.1, 0.42, 0.26), '#F5B700'));
  const rb = body.children[0].geometry = new THREE.BoxGeometry(1.1, 0.42, 0.26);
  body.add(mk(new THREE.BoxGeometry(0.56, 0.2, 0.05), '#3A2E22', 0, 0, 0.14));
  const vial = mk(new THREE.CapsuleGeometry(0.075, 0.36, 4, 10), '#B9F26B', 0, 0, 0.17); vial.rotation.z = Math.PI / 2; body.add(vial);
  const bubble = mk(S(0.07), '#FFFFFF', 0, 0, 0.215, 1.1, 0.8, 0.5); body.add(bubble);
  const pupil = mk(S(0.025), '#1A1420', 0, 0, 0.255); body.add(pupil);
  for (const x of [-0.07, 0.07]) body.add(mk(new THREE.BoxGeometry(0.012, 0.15, 0.01), '#1A1420', x, 0, 0.2));
  for (const s of [-1, 1]) body.add(mk(new THREE.CapsuleGeometry(0.06, 0.12, 4, 8), '#B9F26B', s * 0.42, 0, 0.1).rotateZ(Math.PI / 2));
  const mouth = mk(new THREE.TorusGeometry(0.07, 0.012, 5, 12, Math.PI), '#1A1420', 0, -0.15, 0.14); mouth.rotation.z = Math.PI; body.add(mouth);
  for (const x of [-0.25, 0.25]) root.add(mk(new THREE.CylinderGeometry(0.07, 0.08, 0.45, 8), '#8A5A2B', x, 0.22, 0));
  root.userData = { body, bubble, pupil, mouth, vial };
  return { root, body, bubble, pupil, mouth, J: { root, body } };
}
export function createHeron() {
  const root = new THREE.Group(); const J = { root };
  root.add(mk(new THREE.CylinderGeometry(0.025, 0.025, 1.05, 8), '#E8933A', 0, 0.525, 0));
  const tuck = mk(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8), '#E8933A', 0.1, 0.95, 0.1); tuck.rotation.x = 1.2; root.add(tuck);
  const body = new THREE.Group(); body.position.set(0, 1.35, 0); root.add(body); J.body = body;
  body.add(mk(S(0.34), '#A9C2D4', 0, 0, 0, 0.8, 0.92, 1.35));
  for (const s of [-1, 1]) body.add(mk(S(0.3), '#7E9CB4', s * 0.28, 0, -0.05, 0.3, 0.8, 1.1));
  let parent = body; const neckPts = [[0, 0.2, 0.3], [0, 0.4, 0.34], [0, 0.6, 0.3], [0, 0.78, 0.34], [0, 0.95, 0.4]];
  neckPts.forEach((p, i) => { const g = new THREE.Group(); g.position.set(...p.map((v, k) => (i ? v - neckPts[i - 1][k] : v))); parent.add(g); g.add(mk(S(0.062), '#D6E3EC')); if (i) g.add(mk(new THREE.CylinderGeometry(0.058, 0.058, 0.2, 8), '#D6E3EC', 0, -0.1, -0.03)); J['neck' + i] = g; parent = g; });
  const head = parent; J.head = head; head.add(mk(S(0.115), '#D6E3EC', 0, 0.06, 0.04)); const beak = mk(new THREE.ConeGeometry(0.04, 0.34, 8), '#F5C43D', 0, 0.07, 0.25); beak.rotation.x = Math.PI / 2; head.add(beak);
  head.add(mk(new THREE.ConeGeometry(0.03, 0.2, 6), '#1A1420', 0, 0.12, -0.16).rotateX(-1.9));
  for (const s of [-1, 1]) { const e = mk(new THREE.TorusGeometry(0.03, 0.007, 4, 8, Math.PI), '#1A1420', s * 0.09, 0.09, 0.1); e.rotation.z = Math.PI; head.add(e); }
  J.neck1.add(mk(new THREE.TorusGeometry(0.09, 0.03, 6, 12), '#C24D6A', 0, 0, 0).rotateX(Math.PI / 2));
  return { root, J };
}
export function createWalrus() {
  const root = new THREE.Group(); const J = { root }; const body = new THREE.Group(); body.position.y = 0.95; root.add(body); J.body = body;
  body.add(mk(new THREE.CapsuleGeometry(0.72, 0.5, 6, 14), '#B9806A', 0, 0, 0, 1.06, 1, 0.9));
  body.add(mk(new THREE.TorusGeometry(0.6, 0.06, 6, 20), '#E8443A', 0, 0.78, 0).rotateX(Math.PI / 2));
  for (const s of [-1, 1]) { body.add(mk(S(0.2), '#F3E2CC', s * 0.15, 0.35, 0.58, 1, 0.8, 0.7)); body.add(mk(S(0.035), '#1A1420', s * 0.22, 0.55, 0.62)); body.add(mk(new THREE.ConeGeometry(0.05, 0.38, 6), '#FFF3D6', s * 0.14, 0.12, 0.66).rotateX(Math.PI)); }
  body.add(mk(S(0.07), '#1A1420', 0, 0.45, 0.76));
  for (const s of [-1, 1]) { const f = new THREE.Group(); f.position.set(s * 0.72, 0.1, 0.1); f.add(mk(S(0.3), '#8D5F4F', 0, -0.2, 0, 0.45, 1, 0.8)); body.add(f); J['flipper' + (s < 0 ? 'L' : 'R')] = f; }
  body.add(mk(new THREE.TorusGeometry(0.35, 0.015, 4, 20), '#FFFFFF', 0, 0.6, 0.45).rotateX(1.4)); body.add(mk(new THREE.CylinderGeometry(0.035, 0.035, 0.14, 6), '#F5D000', 0, 0.2, 0.7).rotateZ(1.57));
  return { root, J };
}
export function createGull() {
  const root = new THREE.Group(); const J = { root }; const body = new THREE.Group(); body.position.y = 0.2; root.add(body);
  body.add(mk(S(0.2), '#FFFFFF', 0, 0, 0, 1, 0.8, 1.4)); body.add(mk(S(0.11), '#FFFFFF', 0, 0.13, 0.25));
  const beak = mk(new THREE.ConeGeometry(0.03, 0.14, 6), '#F5C43D', 0, 0.12, 0.38); beak.rotation.x = Math.PI / 2; body.add(beak);
  body.add(mk(S(0.015), '#1A1420', -0.05, 0.17, 0.33), mk(S(0.015), '#1A1420', 0.05, 0.17, 0.33), mk(new THREE.BoxGeometry(0.14, 0.015, 0.02), '#1A1420', 0, 0.21, 0.33));
  for (const s of [-1, 1]) { const w = new THREE.Group(); w.position.set(s * 0.15, 0.04, 0); w.add(mk(S(0.2), '#9AA3AA', s * 0.2, 0, 0, 1.2, 0.2, 0.7)); body.add(w); J['wing' + (s < 0 ? 'L' : 'R')] = w; root.add(mk(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 5), '#E8933A', s * 0.06, 0.05, 0)); }
  J.body = body; return { root, J };
}
