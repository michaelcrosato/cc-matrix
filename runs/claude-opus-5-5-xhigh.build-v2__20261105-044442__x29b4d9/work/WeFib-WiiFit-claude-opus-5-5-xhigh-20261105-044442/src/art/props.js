import * as THREE from 'three/webgpu';
import { M, G, geo, toon, add, basic, glass } from './materials.js';
import { cos } from '../core/rng.js';

export const WOOD = 0xC99A62, WOOD_D = 0x9A6E3E, TEAK = 0xB5763C, TEAL = 0x2CB5A0, ORANGE = 0xF08A3C, CREAM = 0xFFF3DC, RED = 0xD9483B, BLUE = 0x3B6FB6, STONE = 0xD8D3C4, STONE_D = 0xB7B1A0, GRASS = 0x8CCB6A, SAND = 0xF6E2B3, ROCK = 0x8A7B6C, LEAF = 0x5FAE5A, LEAF2 = 0x79C26A;

/** A plank deck: rows of slightly different boards. Top surface at y = 0 (plus top). */
export function planks(w, d, { thick = 0.14, colour = WOOD, along = 'x', top = 0, board = 0.5 } = {}) {
  const g = G();
  const n = Math.max(1, Math.round((along === 'x' ? d : w) / board));
  const size = (along === 'x' ? d : w) / n;
  const shades = [colour, new THREE.Color(colour).multiplyScalar(0.94).getHex(), new THREE.Color(colour).multiplyScalar(1.05).getHex()];
  for (let i = 0; i < n; i++) {
    const off = (i + 0.5) * size - (along === 'x' ? d : w) / 2;
    const col = shades[i % 3];
    const m = along === 'x'
      ? M(geo.box(w, thick, size - 0.02), col, 0, top - thick / 2, off)
      : M(geo.box(size - 0.02, thick, d), col, off, top - thick / 2, 0);
    g.add(m);
  }
  return g;
}
export const post = (h, r = 0.1, colour = WOOD_D, x = 0, y = 0, z = 0) => M(geo.cyl(r, r, h, 12), colour, x, y + h / 2, z);
export function crate(s = 0.8, colour = WOOD) {
  const g = G();
  add(g, M(geo.box(s, s * 0.7, s), colour, 0, s * 0.35, 0));
  for (const y of [0.03, 0.67]) add(g, M(geo.box(s * 1.04, s * 0.06, s * 1.04), WOOD_D, 0, s * y, 0));
  return g;
}
export function tree(h = 2.4, r = 1, leaf = LEAF) {
  const g = G();
  add(g, M(geo.cyl(0.13, 0.18, h, 12), WOOD_D, 0, h / 2, 0), M(geo.sphere(r, 18, 14), leaf, 0, h + r * 0.55, 0));
  return g;
}
export function palm(h = 3.2) {
  const g = G();
  let y = 0, x = 0;
  for (let i = 0; i < 6; i++) { const r = 0.14 - i * 0.012; g.add(M(geo.cyl(r, r + 0.012, h / 6 + 0.03, 10), i % 2 ? WOOD : WOOD_D, x, y + h / 12, 0, { rot: [0, 0, -0.06 * i] })); y += h / 6; x += 0.06 * i; }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.add(M(geo.sphere(0.7, 10, 8), LEAF, x + Math.cos(a) * 0.62, y - 0.08, Math.sin(a) * 0.62, { scale: [1, 0.09, 0.35], rot: [0, -a, Math.cos(a) * -0.3] }));
  }
  return g;
}
export function buoy(colour = RED) {
  const g = G();
  add(g, M(geo.sphere(0.3, 14, 10), colour, 0, 0, 0, { scale: [1, 0.8, 1] }), M(geo.cyl(0.05, 0.05, 0.5, 8), CREAM, 0, 0.4, 0), M(geo.sphere(0.09, 10, 8), colour, 0, 0.68, 0));
  return g;
}
export function barge() {
  const g = G();
  add(g,
    M(geo.rbox(7, 1.3, 3, 0.25), 0x6B4A2E, 0, 0.3, 0), M(geo.box(6.4, 0.12, 2.5), WOOD, 0, 1, 0),
    M(geo.box(1.8, 1.2, 1.6), CREAM, -2, 1.6, 0), M(geo.box(2.1, 0.14, 1.9), ORANGE, -2, 2.26, 0),
    M(geo.cyl(0.3, 0.42, 1.8, 14), RED, 1.5, 1.9, 0, { rot: [0.5, 0, -0.45] }), M(geo.tor(0.31, 0.06), CREAM, 1.92, 2.7, 0.42, { rot: [1.05, 0.45, 0] }),
    M(geo.cyl(0.14, 0.14, 1.4, 10), 0x333344, -2.5, 3, 0));
  return g;
}
export const rope = (ax, ay, az, bx, by, bz, sag = 0.4, r = 0.03, colour = 0xE9D7A8) => {
  const a = new THREE.Vector3(ax, ay, az), b = new THREE.Vector3(bx, by, bz);
  const mid = a.clone().lerp(b, 0.5); mid.y -= sag;
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, r, 6, false), toon(colour));
  m.castShadow = false;
  return m;
};
/** A line of little flags between two points. */
export function bunting(ax, ay, az, bx, by, bz, n = 10, colours = [RED, 0xF5B700, TEAL, CREAM]) {
  const g = G();
  g.add(rope(ax, ay, az, bx, by, bz, 0.5, 0.018, CREAM));
  const a = new THREE.Vector3(ax, ay, az), b = new THREE.Vector3(bx, by, bz);
  const yaw = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2;
  for (let i = 1; i < n; i++) {
    const k = i / n;
    const p = a.clone().lerp(b, k); p.y -= 0.5 * 4 * k * (1 - k) * 0.5 * 2 / 2 + 0.11;
    const flag = M(geo.cone(0.11, 0.24, 3), colours[i % colours.length], p.x, p.y, p.z, { rot: [Math.PI, yaw, 0], scale: [1, 1, 0.25], shadow: false });
    g.add(flag);
  }
  return g;
}
export function pavilionRoof(r, colour = TEAL, trim = ORANGE) {
  const g = G();
  add(g, M(geo.cone(r, r * 0.55, 8), colour, 0, r * 0.275, 0), M(geo.cyl(r * 1.02, r * 1.02, 0.14, 8), trim, 0, 0, 0), M(geo.sphere(0.14, 10, 8), trim, 0, r * 0.58, 0));
  return g;
}
export function bigRock(s = 1, colour = STONE) { return M(geo.sphere(s, 8, 6), colour, 0, 0, 0, { scale: [1, 0.7, 0.9] }); }
export function umbrella(colour = RED) {
  const g = G();
  add(g, M(geo.cyl(0.04, 0.04, 2.3, 8), CREAM, 0, 1.15, 0), M(geo.cone(1.2, 0.5, 8), colour, 0, 2.4, 0));
  return g;
}
export function jarMesh() {
  const g = G();
  const pts = [[0.01, 0], [1, 0.02], [1.08, 0.12], [1.08, 1.9], [0.86, 2.2], [0.86, 2.45], [0.95, 2.5]].map(([x, y]) => new THREE.Vector2(x, y));
  const lathe = new THREE.LatheGeometry(pts, 48);
  const glassMesh = new THREE.Mesh(lathe, glass(0.16));
  glassMesh.renderOrder = 8;
  g.add(glassMesh);
  for (const [r, y] of [[1.08, 0.12], [1.08, 1.9], [0.86, 2.2], [0.95, 2.5]]) g.add(M(geo.tor(r, 0.018, Math.PI * 2, 56), 0x7FB9C4, 0, y, 0, { rot: [Math.PI / 2, 0, 0], shadow: false }));
  const strip = basic(0xffffff, { transparent: true, opacity: 0.7 });
  const s1 = new THREE.Mesh(geo.box(0.05, 1.3, 0.01), strip); s1.position.set(0.72, 1.05, 0.78); s1.rotation.y = 0.75;
  const s2 = new THREE.Mesh(geo.box(0.03, 0.8, 0.01), strip); s2.position.set(0.86, 1.2, 0.62); s2.rotation.y = 0.95;
  add(g, s1, s2);
  return g;
}
/** Sign with painted text. */
export function signBoard(text, w = 2.4, h = 0.9, bg = '#C78B4A', fg = '#FFF4DC') {
  const c = document.createElement('canvas');
  c.width = 512; c.height = Math.round((512 * h) / w);
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = '#1A1420'; g.lineWidth = 14; g.strokeRect(0, 0, c.width, c.height);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = 96;
    do { g.font = `700 ${size}px Fredoka, sans-serif`; size -= 4; } while (g.measureText(text).width > c.width - 40 && size > 20);
    g.fillText(text, c.width / 2, c.height / 2 + 4);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicNodeMaterial({ map: t });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  return m;
}
