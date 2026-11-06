// Generic builders for sets and scenery.
import * as THREE from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { toon, cached, mesh, sphere, cyl, cone, box, at, torus, capsule, flat } from './materials.js';
import { cosmetic, cosRange, pick } from '../core/rng.js';
export const rbox = (x, y, z, r, color) => mesh(cached(`rb${x}_${y}_${z}_${r}`, () => new RoundedBoxGeometry(x, y, z, 3, r)), color);
export function tree(scale = 1, top = '#6FBF5A') {
  const g = new THREE.Group();
  g.add(at(cyl(.14, .2, 1.3, '#B58457'), 0, .65, 0));
  g.add(at(sphere(.85, top), 0, 1.75, 0));
  g.add(at(sphere(.5, top), .45, 1.45, .2));
  g.scale.setScalar(scale); return g;
}
export function palm(scale = 1) {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) { const c = at(cyl(.11 - i * .012, .13 - i * .012, .55, i % 2 ? '#B58457' : '#9C7048'), i * i * .018, .27 + i * .52, 0); c.rotation.z = -i * .05; g.add(c); }
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; const l = sphere(.72, '#3FA66B', 1, .1, .24); l.position.set(.3 + Math.cos(a) * .55, 2.75, Math.sin(a) * .55); l.rotation.y = -a; l.rotation.z = -.5; g.add(l); }
  g.scale.setScalar(scale); return g;
}
export function bunting(ax, ay, az, bx, by, bz, n = 10) {
  const g = new THREE.Group(); const cols = ['#E8443A', '#F5B700', '#3B82F6', '#22C55E', '#F58A5C'];
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(ax, ay, az), new THREE.Vector3((ax + bx) / 2, Math.min(ay, by) - .6, (az + bz) / 2), new THREE.Vector3(bx, by, bz));
  g.add(mesh(new THREE.TubeGeometry(curve, 12, .012, 5), '#1A1420', false));
  for (let i = 1; i < n; i++) { const p = curve.getPoint(i / n); const f = cone(.11, .24, cols[i % 5], 3); f.position.copy(p); f.position.y -= .13; f.rotation.x = Math.PI; g.add(f); }
  return g;
}
export function pavilion(w = 3, d = 3, h = 2.4, roof = '#2FA7A0', post = '#E9D3AE') {
  const g = new THREE.Group();
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.add(at(box(.24, h, .24, post), x * w / 2, h / 2, z * d / 2));
  g.add(at(rbox(w + .9, .3, d + .9, .12, roof), 0, h + .15, 0));
  g.add(at(rbox(w * .6, .24, d * .6, .1, '#F58A5C'), 0, h + .42, 0));
  g.add(at(rbox(w + .2, .14, d + .2, .05, '#D9B98A'), 0, .07, 0));
  return g;
}
export function deck(radius = 3, color = '#C89B6A', stilts = true, y = 0) {
  const g = new THREE.Group();
  const t = cyl(radius, radius, .2, color, 28); t.position.y = y - .1; g.add(t);
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; const line = box(radius * 2 * .94 * Math.abs(Math.cos(0)), .01, .03, '#9C7048'); line.position.set(0, y + .002, -radius * .8 + i * radius * .23); line.scale.x = Math.sqrt(Math.max(.02, 1 - Math.pow((-.8 + i * .23), 2))); g.add(line); void a; }
  if (stilts) for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; g.add(at(cyl(.12, .14, 4, '#7A5A3C'), Math.cos(a) * radius * .85, y - 2.1, Math.sin(a) * radius * .85)); }
  return g;
}
export function plankWalk(len, width, color = '#C89B6A', y = 0) {
  const g = new THREE.Group(); const n = Math.floor(len / .55);
  for (let i = 0; i < n; i++) { const p = box(width, .1, .49, i % 3 === 0 ? '#BE9160' : color); p.position.set(0, y - .05, -i * .55 - .27); g.add(p); }
  for (let i = 0; i <= Math.floor(len / 5); i++) for (const s of [-1, 1]) g.add(at(cyl(.09, .11, 3.4, '#7A5A3C'), s * (width / 2 + .05), y - 1.3, -i * 5));
  return g;
}
export function buoy(color = '#E8443A') { const g = new THREE.Group(); g.add(at(sphere(.3, color, 1, .8, 1), 0, -.25, 0)); g.add(at(cyl(.03, .03, .5, '#F5F0E0'), 0, .15, 0)); g.add(at(sphere(.06, '#F5B700'), 0, .42, 0)); return g; }
export function crate(s = .6, color = '#C89B6A') { const g = new THREE.Group(); g.add(at(box(s, s * .7, s, color), 0, s * .35, 0)); g.add(at(box(s + .03, .05, s + .03, '#8F6A42'), 0, s * .7, 0)); g.add(at(box(s + .03, .05, s + .03, '#8F6A42'), 0, .03, 0)); return g; }
export function lantern(color = '#F5B700') { const g = new THREE.Group(); g.add(at(cyl(.04, .05, 2, '#7A5A3C'), 0, 1, 0)); g.add(at(sphere(.17, color), 0, 2.1, 0)); return g; }
export function rock(s = 1, color = '#A69A8C') { const m = sphere(s, color, 1.2, .7, 1); m.rotation.y = cosmetic() * 6; return m; }
export function grassPatch(r, color = '#7CC568') { const c = cyl(r, r, .04, color, 24); return c; }
export function stoneStack(n = 3) { const g = new THREE.Group(); let y = 0; for (let i = 0; i < n; i++) { const r = .3 - i * .07, h = .1; const s = sphere(r, ['#A69A8C', '#BDB2A2', '#8F8578'][i % 3], 1, .4, .85); y += h; s.position.y = y; y += h * .6; g.add(s); } return g; }
export function bench() { const g = new THREE.Group(); g.add(at(box(1.5, .08, .4, '#E9D3AE'), 0, .45, 0)); g.add(at(box(.1, .45, .35, '#7A5A3C'), -.6, .22, 0)); g.add(at(box(.1, .45, .35, '#7A5A3C'), .6, .22, 0)); return g; }
export function fruitMesh(kind) {
  switch (kind) {
    case 'urchin': { const g = new THREE.Group(); g.add(sphere(.075, '#3B2A55')); for (let i = 0; i < 10; i++) { const s = cone(.015, .09, '#3B2A55', 5); const a = i * 2.4, b = (i / 10) * Math.PI; s.position.set(Math.sin(b) * Math.cos(a) * .09, Math.cos(b) * .09, Math.sin(b) * Math.sin(a) * .09); s.lookAt(s.position.clone().multiplyScalar(2)); s.rotateX(Math.PI / 2); g.add(s); } return g; }
    case 'boot': { const g = new THREE.Group(); g.add(at(box(.1, .14, .1, '#6B4A2F'), 0, .02, -.02)); g.add(at(box(.1, .06, .19, '#54381F'), 0, -.06, .02)); return g; }
    case 'pineapple': { const g = new THREE.Group(); g.add(sphere(.085, '#F5B700', 1, 1.25, 1)); const c = cone(.05, .1, '#3FA66B', 6); c.position.y = .13; g.add(c); return g; }
    case 'lemon': return sphere(.075, '#F7E04B', 1, .88, .88);
    case 'plum': return sphere(.075, '#8B3F8F');
    default: return sphere(.075, '#F58A2E');
  }
}
export function plate(r, color) { const g = new THREE.Group(); const c = cyl(r, r * .6, .05, color, 20); g.add(c); g.add(at(torus(r, .018, '#1A1420'), 0, .02, 0)).children[1].rotation.x = Math.PI / 2; return g; }
export { sphere, cyl, cone, box, at, torus, capsule, cached, mesh, toon, flat, pick, cosRange };
