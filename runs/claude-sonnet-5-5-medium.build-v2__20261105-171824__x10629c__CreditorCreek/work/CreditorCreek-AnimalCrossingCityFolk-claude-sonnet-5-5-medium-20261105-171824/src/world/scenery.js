// Mesh factories for scenery: trees, rocks, flowers, buildings. Everything is primitives in the 16-colour palette.
import { THREE, toonMaterial, PALETTE, setLookLayer, buildModel } from '../engine.js';
import { cheeseWheel, noticeBoard, parkBench, marketStall, house, TREE_DEFS, lanternDef, balloonDef, snowmanDef, fossilDef } from '../art/models.js';
const fromDef = (def, palette, params) => buildModel(def, { ...(palette ? { palette } : {}), ...(params ? { params } : {}) }).object;
const { Group, Mesh, BoxGeometry, SphereGeometry, CylinderGeometry, ConeGeometry } = THREE;
const G = { box: new BoxGeometry(1, 1, 1), ball: new SphereGeometry(0.5, 8, 6), cyl: new CylinderGeometry(0.5, 0.5, 1, 8), cone: new ConeGeometry(0.5, 1, 8) };
export const mat = (c) => toonMaterial(typeof c === 'number' ? c : PALETTE[c]);
export function part(parent, shape, size, pos, color, rot) {
  const m = new Mesh(G[shape], mat(color)); m.scale.set(size[0], size[1], size[2]); m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0] * Math.PI / 180, rot[1] * Math.PI / 180, rot[2] * Math.PI / 180);
  m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
export const SEASON_CANOPY = [['lime', 'green'], ['green', 'teal'], ['orange', 'red'], ['white', 'mist']];
export function canopyColor(season, kind, i = 0) {
  if (kind === 'pine') return season === 3 ? 'mist' : 'teal';
  if (kind === 'palm') return 'green';
  return SEASON_CANOPY[season][i % 2];
}
/** A tree. stage 0 sapling..3 grown. Returns { obj, canopies } so seasons can recolour. */
export function buildTree(t, season) {
  const kind = TREE_DEFS[t.kind] ? t.kind : 'oak'; const stage = t.stage ?? 3; const c = (n) => canopyColor(season, kind, n);
  const palette = kind === 'pine' ? { can1: c(0), can2: season === 3 ? 'white' : 'green', trunk: 'plum' } : kind === 'palm' ? { can1: 'green', can2: 'lime', trunk: 'sand' } : { can1: c(0), can2: c(1), trunk: 'plum', fruit: 'lime' };
  const obj = buildModel(TREE_DEFS[kind], { params: { stage, fruit: kind === 'pear' ? (t.fruit ?? 0) : 0 }, palette }).object; obj.name = 'tree'; obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { obj, canopies: [] };
}
export function buildRock(r) { const g = new Group(); part(g, 'ball', [1.0, 0.7, 0.9], [0, 0.3, 0], 'slate'); part(g, 'ball', [0.6, 0.45, 0.55], [0.35, 0.2, 0.3], 'mist'); return g; }
export const FLOWER_COLS = [['red', 'sand'], ['sky', 'white'], ['sand', 'orange'], ['plum', 'mist']];
export function buildFlower(f, wilted = false) {
  const g = new Group(); const col = wilted ? 'slate' : FLOWER_COLS[f.col % 4][0]; const sp = f.sp % 4;
  part(g, 'cyl', [0.05, 0.4, 0.05], [0, 0.2, 0], wilted ? 'orange' : 'green');
  if (sp === 0) part(g, 'ball', [0.3, 0.24, 0.3], [0, 0.45, 0], col); else if (sp === 1) { for (let i = 0; i < 4; i++) part(g, 'ball', [0.16, 0.16, 0.16], [Math.cos(i * 1.57) * 0.1, 0.45, Math.sin(i * 1.57) * 0.1], col); } else if (sp === 2) part(g, 'cone', [0.28, 0.32, 0.28], [0, 0.45, 0], col, [180, 0, 0]); else { part(g, 'ball', [0.22, 0.22, 0.22], [0, 0.46, 0], col); part(g, 'ball', [0.1, 0.1, 0.1], [0, 0.5, 0], 'sand'); }
  return g;
}
export function buildWeed() { const g = new Group(); for (let i = 0; i < 3; i++) part(g, 'cone', [0.12, 0.4, 0.12], [(i - 1) * 0.1, 0.2, 0], 'teal', [0, 0, (i - 1) * 20]); return g; }
export function buildBeanBag() { const g = new Group(); part(g, 'ball', [0.5, 0.5, 0.5], [0, 0.25, 0], 'sand'); part(g, 'box', [0.15, 0.1, 0.15], [0, 0.55, 0], 'red'); return g; }
/** Generic building. kind picks the palette/features. h walls height. */
export function buildBuilding(b, o = {}) {
  const g = new Group(); g.name = 'building:' + b.id; const w = b.w, d = b.d, h = o.h ?? 2.4; const windows = [];
  const body = buildModel(house, { params: { w, d, h, pitch: o.pitch ?? 1.3, dx: b.noDoor ? -1 : b.door[0] - b.x + 0.5, chim: o.chimney === false ? 0 : 1 }, palette: { wall: o.wall ?? 'sand', roof: o.roof ?? 'red', door: o.door ?? 'plum', trim: o.ridge ?? 'ink' } }).object;
  body.position.set(w / 2, 0, d / 2); body.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); g.add(body); g.userData.roof = [body];
  const winC = new THREE.MeshBasicNodeMaterial({ color: PALETTE.sand }); const wn = Math.max(1, Math.floor(w / 2.5));
  const xs = (wn === 1 && !b.noDoor) ? [0.5, w - 0.5] : Array.from({ length: wn }, (_, i) => (i + 0.5) * w / wn);
  for (const wx of xs) { if (!b.noDoor && Math.abs(wx - (b.door[0] - b.x + 0.5)) < 0.9) continue; const gl = part(g, 'box', [0.7, 0.7, 0.1], [wx, h * 0.62, d + 0.04], 'sky'); (g.userData.glass ??= []).push(gl); const glow = new Mesh(G.box, winC); glow.scale.set(0.5, 0.5, 0.1); glow.position.set(wx, h * 0.62, d + 0.07); glow.visible = false; g.add(glow); windows.push(glow); }
  if (o.chimney !== false) g.userData.smoke = [w * 0.75, h + 2.2, d * 0.5];
  g.userData.windows = windows; setLookLayer(g, 'environment'); return g;
}
export function buildLighthouse() { const g = new Group(); part(g, 'cyl', [1.8, 3, 1.8], [1, 1.5, 1], 'white'); part(g, 'cyl', [1.4, 1.5, 1.4], [1, 3.7, 1], 'red'); part(g, 'cyl', [1.0, 1.0, 1.0], [1, 5, 1], 'sand'); part(g, 'cone', [1.4, 0.8, 1.4], [1, 5.9, 1], 'ink'); const lamp = new Mesh(G.ball, new THREE.MeshBasicNodeMaterial({ color: PALETTE.sand })); lamp.scale.set(0.6, 0.6, 0.6); lamp.position.set(1, 5, 1); g.add(lamp); g.userData.windows = [lamp]; return g; }
export function buildLamp() { const g = new Group(); part(g, 'cyl', [0.12, 2.2, 0.12], [0, 1.1, 0], 'ink'); const lamp = new Mesh(G.ball, new THREE.MeshBasicNodeMaterial({ color: PALETTE.sand })); lamp.scale.set(0.4, 0.4, 0.4); lamp.position.y = 2.3; g.add(lamp); g.userData.glow = lamp; lamp.visible = false; return g; }
export function buildBench() { return fromDef(parkBench); }
export function buildOldPear() { const g = new Group(); part(g, 'cyl', [0.9, 2.6, 0.9], [0, 1.3, 0], 'plum'); part(g, 'ball', [5, 3.4, 5], [0, 3.8, 0], 'green'); part(g, 'ball', [3.4, 2.4, 3.4], [0.9, 5.2, 0.4], 'lime'); g.userData.canopy = [g.children[1], g.children[2]]; return g; }
export function buildBell() { const g = new Group(); part(g, 'box', [0.15, 2.6, 0.15], [-0.7, 1.3, 0], 'orange'); part(g, 'box', [0.15, 2.6, 0.15], [0.7, 1.3, 0], 'orange'); part(g, 'box', [1.6, 0.15, 0.2], [0, 2.6, 0], 'orange'); const bell = new Group(); bell.position.set(0, 2.4, 0); part(bell, 'cone', [0.8, 0.9, 0.8], [0, -0.45, 0], 'orange'); g.add(bell); g.userData.bell = bell; return g; }
export function buildNotice() { return fromDef(noticeBoard); }
export function buildBus() { const g = new Group(); part(g, 'box', [3.6, 1.7, 1.7], [0, 1.2, 0], 'sand'); part(g, 'box', [3.6, 0.35, 1.72], [0, 0.65, 0], 'red'); for (let i = 0; i < 4; i++) part(g, 'box', [0.55, 0.55, 1.74], [-1.3 + i * 0.85, 1.55, 0], 'sky'); for (const x of [-1.2, 1.2]) for (const z of [-0.85, 0.85]) part(g, 'cyl', [0.6, 0.2, 0.6], [x, 0.3, z], 'ink', [90, 0, 0]); part(g, 'box', [0.5, 0.3, 1.2], [1.85, 1.0, 0], 'white'); return g; }
export function buildStall(c1 = 'red') { return fromDef(marketStall, { cloth: c1 }); }
export function buildCheeseWheel() { return fromDef(cheeseWheel); }
export function buildSnowman(q = 1) { return fromDef(snowmanDef, null, { head: 0.4 + 0.7 * Math.min(1, q) }); }
export function buildLantern(c = 'orange') { return fromDef(lanternDef, { glow: c }); }
export function buildBalloon(c = 'red') { return fromDef(balloonDef, { skin: c }); }
export function buildSign(text = '') { const g = new Group(); part(g, 'cyl', [0.1, 1.2, 0.1], [0, 0.6, 0], 'plum'); part(g, 'box', [1.1, 0.5, 0.08], [0, 1.2, 0], 'sand'); return g; }

export function buildFossilSingle(kind = 0) { return fromDef(fossilDef, null, { kind }); }
