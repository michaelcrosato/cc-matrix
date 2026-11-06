// The gloved hand and the eight instruments (tip at the origin, pointing -Z). Built from primitives, tagged 'actors'.
import { buildModel } from '../../pixel-engine.js';
import { handDef, toolDefs } from '../content/models/index.js';
import { THREE, toonMaterial, PALETTE, setLookLayer, hologramMaterial } from '../../pixel-engine.js';
const { Mesh, BoxGeometry, CylinderGeometry, ConeGeometry, SphereGeometry, Group, TorusGeometry, CircleGeometry, MeshBasicMaterial } = THREE;
const SEAT_GLOVE = ['sky', 'red', 'lime', 'sand'];
const mk = (parent, geo, c, x = 0, y = 0, z = 0, o = {}) => { const m = new Mesh(geo, c.isMaterial ? c : toonMaterial(PALETTE[c])); m.position.set(x, y, z); m.castShadow = o.shadow !== false; if (o.rot) m.rotation.set(...o.rot); parent.add(m); return m; };

export function buildHand(seat = 0, doctor = 'ilya') {
  try { const b = buildModel(handDef, { palette: { glove: SEAT_GLOVE[seat % 4], sleeve: doctor === 'sabine' ? 'plum' : 'teal' } }); const o = b.object; o.traverse((m) => { if (m.isMesh) m.castShadow = true; }); setLookLayer(o, 'actors'); return o; } catch (e) { /* fall back to primitives */ }
  const g = new Group(), glove = SEAT_GLOVE[seat % 4];
  mk(g, new BoxGeometry(0.72, 0.3, 0.8), glove, 0, 0, 0); mk(g, new BoxGeometry(0.74, 0.16, 0.14), 'blue', 0, 0.12, -0.34);
  for (const x of [-0.27, -0.09, 0.09, 0.27]) { mk(g, new BoxGeometry(0.16, 0.16, 0.34), glove, x, 0.05, -0.56, { rot: [0.31, 0, 0] }); mk(g, new BoxGeometry(0.15, 0.15, 0.26), glove, x, -0.09, -0.76, { rot: [1.0, 0, 0] }); }
  mk(g, new BoxGeometry(0.18, 0.18, 0.5), glove, -0.44, -0.04, -0.26, { rot: [0.17, -0.49, 0] });
  mk(g, new CylinderGeometry(0.62, 0.62, 0.3, 10), 'blue', 0, 0, 0.54, { rot: [Math.PI / 2, 0, 0] }); mk(g, new CylinderGeometry(0.56, 0.56, 1.6, 10), glove, 0, 0, 1.46, { rot: [Math.PI / 2, 0, 0] });
  mk(g, new CylinderGeometry(0.8, 0.8, 2.6, 10), doctor === 'sabine' ? 'plum' : 'teal', 0, 0, 3.4, { rot: [Math.PI / 2, 0, 0] });
  setLookLayer(g, 'actors'); return g;
}
export function buildTool(name) {
  const g = buildModel(toolDefs[name]).object, ud = { jaws: [], name }, by = (n) => g.getObjectByName(n);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  if (name === 'forceps') { const l = by('jawL'), r = by('jawR'); l.userData.s = -1; r.userData.s = 1; ud.jaws = [l, r]; }
  if (name === 'syringe') ud.plunger = by('plunger');
  if (name === 'laser') { ud.beam = by('beam'); ud.beam.visible = false; }
  if (name === 'scanner') { ud.disc = by('disc'); ud.disc.traverse((m) => { if (m.isMesh) m.material = hologramMaterial({ color: PALETTE.cyan }); }); ud.disc.visible = false; }
  setLookLayer(g, 'actors'); g.userData = ud; return g;
}
export class HandRig {
  constructor(parent, seat = 0, doctor = 'ilya') {
    this.root = new Group(); this.hand = buildHand(seat, doctor); this.tools = {}; this.cur = null; this.seat = seat; this.vis = true;
    for (const n of ['scalpel', 'forceps', 'suture', 'drain', 'syringe', 'gel', 'laser', 'scanner', 'dress']) { const t = buildTool(n); t.visible = false; this.tools[n] = t; this.root.add(t); }
    this.root.add(this.hand); parent.add(this.root); this.sq = 0; this.glow = 0;
  }
  setDoctor(d) { /* sleeve colour fixed at build */ }
  update(x, y, z, tool, use, dt, t, o = {}) {
    for (const [n, m] of Object.entries(this.tools)) m.visible = n === tool;
    const T = this.tools[tool]; if (!T) return;
    T.position.set(x, y + 0.05 + (o.lift || 0), z); T.rotation.set(-0.5, -0.7, 0);
    const ud = T.userData;
    if (tool === 'forceps') { const open = use ? 0.0 : 0.22; ud.jaws.forEach((j) => { j.rotation.y = j.userData.s * (open + (o.grab ? 0 : 0)); }); }
    if (tool === 'syringe' && ud.plunger) ud.plunger.position.z = 1.2 + (o.draw ? 0.5 * Math.min(1, o.draw / 0.45) : 0);
    if (tool === 'laser' && ud.beam) { ud.beam.visible = !!use; ud.beam.position.set(0, -0.6, 0); ud.beam.scale.y = 1; }
    if (tool === 'scanner' && ud.disc) { ud.disc.visible = !!use; ud.disc.rotation.y = t * 2; }
    this.hand.position.set(x + 0.72, y + 0.95 + (o.lift || 0), z + 1.0); this.hand.rotation.set(-0.46, -0.72, 0.2); this.hand.scale.setScalar(0.62);
    this.root.visible = this.vis;
  }
  dispose() { this.root.removeFromParent(); }
}
