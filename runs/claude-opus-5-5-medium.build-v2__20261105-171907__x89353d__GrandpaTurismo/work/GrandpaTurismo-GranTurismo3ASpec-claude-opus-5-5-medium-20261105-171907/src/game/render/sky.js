// Sky: the engine's applySky plus depth: a far ring of silhouettes, a sun or moon disc, chunky clouds, a night brightness.
import { applySky, skyAt, THREE, toonMaterial, PALETTE, buildModel } from '../../pixel-engine.js';
import { LOOKS } from './trackmesh.js';
const { Mesh, BoxGeometry, CircleGeometry, Group, Color, BufferGeometry, Float32BufferAttribute, MeshBasicNodeMaterial } = THREE;
export function nightOf(hour) { const h = ((hour % 24) + 24) % 24; return h > 19.2 || h < 5 ? 1 : h > 18 ? (h - 18) / 1.2 : h < 6.5 ? 1 - (h - 5) / 1.5 : 0; }
export function setSky(engine, hour, o = {}) {
  const s = skyAt(hour); applySky(engine, s);
  const n = nightOf(hour);
  if (n > 0) { engine.ambient.intensity = Math.max(engine.ambient.intensity, 0.55 + 1.15 * n); engine.ambient.color.setHex(0x8088c0); engine.sun.intensity = Math.max(engine.sun.intensity, 0.55); }
  if (o.rain) { engine.scene.background = new Color(0x566c86); engine.sun.intensity *= 0.45; engine.ambient.intensity = Math.max(engine.ambient.intensity * 1.15, 1); }
  return s;
}
function flat(color) { return toonMaterial(color); }
/** Far silhouettes at 2 to 3 km, plus disc and clouds. Returns a group that follows the camera. */
export function buildSkyDome(lookId, hour, o = {}) {
  const look = LOOKS[lookId], g = new Group(), near = new Group(), n = nightOf(hour);
  const pos = [], col = [], c = new Color();
  const ring = (R, base, H, colour, f1, f2) => { c.set(colour); const steps = 96; for (let i = 0; i < steps; i++) { const a0 = (i / steps) * 6.283, a1 = ((i + 1) / steps) * 6.283, hAt = (a) => { const v = Math.abs(Math.sin(a * f1 + R)) * 0.6 + Math.abs(Math.sin(a * f2 + 1.7)) * 0.4; return base + (lookId === 'saltline' ? (v > 0.68 ? H : H * 0.04) : lookId === 'harbour' ? Math.floor(v * 7) / 7 * H : v * H); }; const h0 = hAt(a0), h1 = hAt(lookId === 'harbour' || lookId === 'saltline' ? a0 : a1); const p = [[Math.sin(a0) * R, base - 30, Math.cos(a0) * R], [Math.sin(a0) * R, h0, Math.cos(a0) * R], [Math.sin(a1) * R, h1, Math.cos(a1) * R], [Math.sin(a1) * R, base - 30, Math.cos(a1) * R]]; for (const k of [0, 2, 1, 0, 3, 2]) { pos.push(...p[k]); col.push(c.r, c.g, c.b); } } };
  ring(3000, -10, lookId === 'saltline' ? 180 : lookId === 'harbour' ? 200 : 340, look.far[0], 5, 13);
  ring(2300, -10, lookId === 'saltline' ? 90 : lookId === 'harbour' ? 120 : 200, look.far[1], 9, 21);
  const gm = new BufferGeometry(); gm.setAttribute('position', new Float32BufferAttribute(pos, 3)); gm.setAttribute('color', new Float32BufferAttribute(col, 3)); gm.computeVertexNormals();
  const ringMesh = new Mesh(gm, toonMaterial(0xffffff, { vertexColors: true })); g.add(ringMesh);
  // sun or moon: a glowing billboard-ish disc built as a model part
  const sky = skyAt(hour), dir = sky.sunDir, disc = buildModel({ id: `disc-${n > 0.5 ? 'moon' : 'sun'}`, about: 'sky disc', tags: ['sky'], palette: { d: n > 0.5 ? 'white' : 'sand' }, floats: true, collider: 'none', parts: [{ ball: [200, 200, 200], at: [0, 0, 0], c: 'd', glow: true }] }).object;
  disc.position.set(dir[0] * 2800, Math.max(120, dir[1] * 2800), dir[2] * 2800); g.add(disc);
  // chunky clouds
  const cloudMat = flat(o.rain ? PALETTE.slate : n > 0.5 ? PALETTE.night : hour > 17 ? PALETTE.orange : PALETTE.white);
  let sd = 7; const rd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const clouds = [];
  for (let i = 0; i < (o.rain ? 26 : 14); i++) { const a = rd() * 6.283, R = 1300 + rd() * 1300, y = 300 + rd() * 240, cl = new Group(); for (let k = 0; k < 3; k++) { const b = new Mesh(new BoxGeometry(120 + rd() * 180, 26 + rd() * 26, 70 + rd() * 90), cloudMat); b.position.set((k - 1) * 90, k === 1 ? 14 : 0, rd() * 40); cl.add(b); } cl.position.set(Math.sin(a) * R, y, Math.cos(a) * R); clouds.push(cl); g.add(cl); }
  g.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; m.frustumCulled = false; } });
  g.userData.clouds = clouds; void near; void MeshBasicNodeMaterial;
  return g;
}
export const followSky = (g, cam, t) => { g.position.set(cam.position.x, 0, cam.position.z); g.userData.clouds?.forEach((c, i) => (c.rotation.y = 0, c.position.x += Math.sin(i) * 0)); void t; };
