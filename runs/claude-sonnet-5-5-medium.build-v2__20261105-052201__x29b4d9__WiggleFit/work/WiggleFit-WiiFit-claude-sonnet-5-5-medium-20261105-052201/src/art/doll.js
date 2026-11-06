import * as THREE from 'three/webgpu';
import { toon } from '../render/renderer.js';

export const PAINTS = [
  { name: 'Tomato', c: '#E8443A' }, { name: 'Cobalt', c: '#3B82F6' }, { name: 'Meadow', c: '#22C55E' }, { name: 'Mustard', c: '#F5B700' },
  { name: 'Plum', c: '#9B5DE5' }, { name: 'Peach', c: '#FF9F80' }, { name: 'Teal', c: '#14B8A6' }, { name: 'Bubblegum', c: '#FF6FB5' },
  { name: 'Slate', c: '#64748B' }, { name: 'Gold Leaf', c: '#E5B800' },
];
export const HATS = ['none', 'visor', 'beret', 'bucket', 'perm', 'wizard', 'crown'];
const cache = {};
const mat = (c) => (cache[c] = cache[c] || toon(c));
const mesh = (g, c, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(g, mat(c)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; return m; };
const sph = (r) => new THREE.SphereGeometry(r, 14, 10);
const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 10);
const SKIN = '#F2D3A8', JOINT = '#D9A86C', SHORTS = '#2B4A6F', INKC = '#1A1420';

// A jointed wooden peg doll, 1.5 m tall, built from named joint groups.
export function createDoll({ paint = 0, hat = 0, scale = 1, width = 1, shorts = SHORTS } = {}) {
  const root = new THREE.Group(); root.name = 'root';
  const J = { root };
  const joint = (name, parent, x, y, z) => { const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); J[name] = g; return g; };
  const shirtC = PAINTS[paint % PAINTS.length].c;
  const hips = joint('hips', root, 0, 0.46, 0);
  hips.add(mesh(cap(0.2, 0.06), shorts, 0, 0.04, 0, 1.05, 1, 0.85));
  const spine = joint('spine', hips, 0, 0.12, 0);
  spine.add(mesh(cap(0.21, 0.2), shirtC, 0, 0.18, 0, 1, 1, 0.82));
  const head = joint('head', spine, 0, 0.52, 0);
  head.add(mesh(sph(0.23), SKIN, 0, 0.22, 0));
  head.add(mesh(new THREE.TorusGeometry(0.228, 0.02, 6, 20), shirtC, 0, 0.3, 0).rotateX(Math.PI / 2));
  head.add(mesh(sph(0.024), INKC, -0.08, 0.24, 0.205), mesh(sph(0.024), INKC, 0.08, 0.24, 0.205));
  head.add(mesh(sph(0.03), '#FF9AA2', -0.13, 0.15, 0.18, 1, 0.6, 0.5), mesh(sph(0.03), '#FF9AA2', 0.13, 0.15, 0.18, 1, 0.6, 0.5));
  const mouth = mesh(new THREE.TorusGeometry(0.04, 0.008, 5, 10, Math.PI), INKC, 0, 0.14, 0.215); mouth.rotation.z = Math.PI; head.add(mouth);
  addHat(head, hat, shirtC);
  for (const s of [-1, 1]) {
    const n = s < 0 ? 'L' : 'R';
    const sh = joint('shoulder' + n, spine, s * 0.26, 0.3, 0); sh.add(mesh(sph(0.075), JOINT));
    sh.add(mesh(cap(0.055, 0.1), SKIN, 0, -0.14, 0));
    const el = joint('elbow' + n, sh, 0, -0.26, 0); el.add(mesh(sph(0.06), JOINT));
    el.add(mesh(cap(0.05, 0.1), SKIN, 0, -0.12, 0)); el.add(mesh(sph(0.07), '#FFFFFF', 0, -0.26, 0));
    const hp = joint('hip' + n, hips, s * 0.13, 0, 0);
    hp.add(mesh(cap(0.08, 0.1), SKIN, 0, -0.12, 0));
    const kn = joint('knee' + n, hp, 0, -0.23, 0); kn.add(mesh(sph(0.07), JOINT));
    kn.add(mesh(cap(0.075, 0.08), SKIN, 0, -0.12, 0));
    const an = joint('ankle' + n, kn, 0, -0.23, 0); an.add(mesh(sph(0.1), '#FFFFFF', 0, 0.03, 0.04, 1, 0.55, 1.5));
  }
  root.scale.set(scale * width, scale, scale * width);
  return { root, J, shirtC };
}
function addHat(head, hat, c) {
  const h = HATS[hat % HATS.length];
  if (h === 'visor') { head.add(mesh(cap(0.04, 0.3), c, 0, 0.36, 0.22, 1, 0.3, 1.2)); head.children[head.children.length - 1].rotation.z = Math.PI / 2; }
  if (h === 'beret') head.add(mesh(sph(0.24), '#B03A48', 0.04, 0.43, 0, 1, 0.35, 1));
  if (h === 'bucket') { head.add(mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.18, 14), '#EAD9A0', 0, 0.45, 0)); head.add(mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 16), '#EAD9A0', 0, 0.37, 0)); }
  if (h === 'perm') for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; head.add(mesh(sph(0.1), '#EDEDED', Math.cos(a) * 0.17, 0.4 + (i % 2) * 0.06, Math.sin(a) * 0.17)); }
  if (h === 'wizard') { head.add(mesh(new THREE.ConeGeometry(0.2, 0.5, 12), '#4B3F9E', 0, 0.62, 0)); head.add(mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 16), '#4B3F9E', 0, 0.39, 0)); }
  if (h === 'crown') { head.add(mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.12, 8), '#FFD23F', 0, 0.48, 0)); }
}
