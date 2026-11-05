// CRACKMANIA track view (PLAN §4.3): three.js meshes per block (materials made once per world, at boot), the base
// plate, chasm walls, water, supports, the boundary; gates, arches, lights, boost chevrons and boards drawn with the
// pen each frame (animated). No-op without a renderer (headless tests)
import { TYPES, frameAt, CELL, GX, GY, LEVEL } from './blocks.js';
import { blockGeometry, plateGeometry, pillarGeometry, SECTION, LIFT, Part } from './geometry.js';
import { texturesFor } from '../env/textures.js';
import { ENVS } from '../env/envs.js';
import { add, mul, cross } from '../lib/v3.js';
const E = globalThis.My3D2dge, U = 16;

export class TrackView {
  constructor(world, env) {
    this.world = world; this.env = env; this.groups = new Map(); this.on = !!E.World3D.renderer; this.course = null;
    if (!this.on) return;
    const T3 = E.THREE, tx = texturesFor(env), e = ENVS[env];
    const lam = (map, o = {}) => new T3.MeshLambertNodeMaterial(Object.assign({ map, side: o.side || T3.FrontSide }, o.extra || {}));
    const toon = (map, o = {}) => new T3.MeshToonNodeMaterial(Object.assign({ map, gradientMap: E.World3D.TOON_BANDS, side: o.side || T3.FrontSide }, o.extra || {}));
    this.mats = {
      road: lam(tx.road), dirt: lam(tx.dirt), ice: lam(tx.ice, { extra: { emissive: new T3.Color('#16324a') } }), boost: lam(tx.boost, { extra: { emissive: new T3.Color('#3a1800') } }),
      curb: lam(tx.curb), rail: toon(tx.rail, { side: T3.DoubleSide }), side: lam(tx.side, { side: T3.DoubleSide }), under: lam(tx.under, { side: T3.DoubleSide }),
      pillar: toon(tx.pillar, { side: T3.DoubleSide }), plate: lam(tx.plate), rock: lam(tx.rock, { side: T3.DoubleSide }), bank: lam(tx.bank, { side: T3.DoubleSide }),
      water: new T3.MeshLambertNodeMaterial({ map: tx.water, transparent: true, opacity: .86, emissive: new T3.Color('#0a2a48') }), boundary: toon(tx.boundary, { side: T3.DoubleSide })
    };
    // a "hole" in the editor: the preview's material (green / red), see-through
    this.root = new T3.Group(); world.scene.add(this.root);
  }
  /** build every mesh for a course (a new track) */
  load(course) {
    this.course = course; if (!this.on) return;
    for (const g of this.groups.values()) this._drop(g); this.groups.clear();
    for (const b of course.track.blocks) this.addBlock(b, course.geo.get(b.id));
    this.setPlate(course.plate);
  }
  _drop(g) { this.root.remove(g); g.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); }
  _mesh(name, part) {
    if (!part || !part.idx.length) return null;
    const T3 = E.THREE, geo = new T3.BufferGeometry();
    geo.setAttribute('position', new T3.Float32BufferAttribute(part.pos, 3)); geo.setAttribute('uv', new T3.Float32BufferAttribute(part.uv, 2)); geo.setIndex(part.idx); geo.computeVertexNormals();
    const m = new T3.Mesh(geo, this.mats[name] || this.mats.road); m.castShadow = name !== 'plate' && name !== 'water'; m.receiveShadow = true; m.frustumCulled = true; return m;
  }
  addBlock(b, geo) {
    if (!this.on || !geo) return;
    const T3 = E.THREE, g = new T3.Group();
    for (const [name, part] of Object.entries(geo.parts)) { const m = this._mesh(name, part); if (m) g.add(m); }
    if (geo.pillars && geo.pillars.length) { const p = new Part(); pillarGeometry(geo.pillars, p); const m = this._mesh('pillar', p); if (m) g.add(m); }
    this.root.add(g); this.groups.set(b.id, g);
  }
  removeBlock(id) { const g = this.groups.get(id); if (g) { this._drop(g); this.groups.delete(id); } }
  setPlate(plate) {
    if (!this.on) return;
    const old = this.groups.get('plate'); if (old) this._drop(old);
    const T3 = E.THREE, g = new T3.Group();
    for (const [name, part] of Object.entries(plate.parts)) { const m = this._mesh(name, part); if (m) g.add(m); }
    this.root.add(g); this.groups.set('plate', g);
  }
  set visible(v) { if (this.root) this.root.visible = v; }

  /* ---- the pen's part, every frame: gates, arches, start lights, boost chevrons, flags ---- */
  /** o: { t (seconds), lights: 0..5 (the start's red lights lit; 6 = green), board: text for the finish board, cpBoard,
   *  passed: Set of gate ids passed, near: [x, y] (draw what is within 700 m) } */
  draw(pen, o = {}) {
    const c = this.course; if (!c || !this.on) return;
    const t = o.t || 0, S = SECTION[this.env], e = ENVS[this.env], near = o.near;
    for (const b of c.track.blocks) {
      const T = TYPES[b.type];
      if (!(T.start || T.finish || T.cp || T.boost)) continue;
      const f0 = frameAt(b, T.len / 2); if (near && Math.hypot(f0.p[0] - near[0], f0.p[1] - near[1]) > 800) continue;
      if (T.boost) { this._chevrons(pen, b, T, t, e); continue; }
      const s = T.start ? T.archS : T.gateS, f = frameAt(b, s), p = add(f.p, f.u, LIFT), w = S.hw + S.curb + 1;
      pen.frame(p[0] * U, p[1] * U, p[2] * U, f.t, f.r, f.u, U);
      const passed = o.passed && o.passed.has(b.id);
      if (T.cp) this._cpGate(pen, w, t, e, passed, o.cpBoard);
      else if (T.finish) this._finishArch(pen, w, t, e, o.board);
      else this._startArch(pen, w, t, e, o.lights ?? 6);
    }
    pen.at();
  }
  _chevrons(pen, b, T, t, e) {
    // glowing chevrons running along the pad, lit in sequence
    const S = SECTION[this.env];
    for (let k = 0; k < 4; k++) {
      const s = T.boost[0] + 1 + k * 3, f = frameAt(b, s), p = add(f.p, f.u, LIFT + .03), lit = ((t * 6 - k) % 4 + 4) % 4 < 1.2;
      pen.frame(p[0] * U, p[1] * U, p[2] * U, f.t, f.r, f.u, U);
      const col = lit ? '#fff2a0' : '#ff8a1a';
      for (const sd of [-1, 1]) pen.slab(.6, 0, .02, -.9, sd * (S.hw * .55), .02, 0, 0, 1, 1.1, .05, col);
      if (lit) pen.glow(0, 0, .3, .8, '#ffd060');
    }
    // posts with lamps at the pad's start
    const f = frameAt(b, T.boost[0]), p = add(f.p, f.u, LIFT); pen.frame(p[0] * U, p[1] * U, p[2] * U, f.t, f.r, f.u, U);
    for (const sd of [-1, 1]) { const y = sd * (S.hw + S.curb + .6); pen.tube(0, y, 0, 0, y, 1.6, .12, '#30303a').glow(0, y, 1.75, .28, Math.sin(t * 9) > 0 ? '#ffb030' : '#ff6a10'); }
  }
  _posts(pen, w, h, col, col2) {
    for (const sd of [-1, 1]) { pen.box(0, sd * w, h / 2, .9, .9, h, col).box(0, sd * w, h + .2, 1.1, 1.1, .4, col2); }
  }
  _cpGate(pen, w, t, e, passed, board) {
    const h = 6.2, col = passed ? '#3ad070' : '#2a8ae8', acc = passed ? '#c8ffd8' : '#a8e0ff';
    this._posts(pen, w, h, '#f4f4f4', col);
    pen.box(0, 0, h + .6, .8, w * 2 + 1, 1.3, col);
    // the banner's moving stripes, and the flip board in the middle
    for (let i = -6; i <= 6; i++) { const ph = (i + t * 3) % 2 < 1; pen.box(-.42, i * (w / 6.5), h + .6, .05, w / 7, .9, ph ? acc : col); }
    pen.box(.1, 0, h + 1.9, .5, 6, 1.6, '#1a1a24');
    const txt = board || 'CHECKPOINT';
    drawDigits(pen, txt, .38, 0, h + 1.9, .26, passed ? '#7aff9a' : '#ffd23a');
  }
  _finishArch(pen, w, t, e, board) {
    const h = 7.5;
    this._posts(pen, w, h, '#1a1a1e', '#f4f4f4');
    for (let i = -8; i < 8; i++) for (let j = 0; j < 2; j++) pen.box(0, (i + .5) * (w / 8), h + .4 + j * .8, .7, w / 8, .8, (i + j) & 1 ? '#18181c' : '#f8f8f8');
    pen.box(.1, 0, h + 2.4, .5, 7, 1.7, '#1a1a24');
    drawDigits(pen, board || 'FINISH', .38, 0, h + 2.4, .28, '#ffd23a');
    // flags on top, waving
    for (const sd of [-1, 1]) { pen.tube(0, sd * w, h + .6, 0, sd * w, h + 3.4, .06, '#d8d8d8'); for (let k = 0; k < 4; k++) { const wv = Math.sin(t * 6 + k * .9) * .25; pen.box(-.25 - k * .45, sd * w, h + 3 + wv * (k / 3), .45, .06, .7, k & 1 ? '#18181c' : '#f8f8f8'); } }
  }
  _startArch(pen, w, t, e, lights) {
    const h = 7;
    this._posts(pen, w, h, '#f4f4f4', e.accent);
    pen.box(0, 0, h + .7, 1, w * 2 + 1, 1.4, e.accent);
    for (let i = -5; i <= 5; i++) pen.box(-.52, i * (w / 5.5), h + .7, .05, w / 7, 1, i & 1 ? '#ffffff' : e.accent2);
    // five lights: red one by one, then all green
    for (let k = 0; k < 5; k++) {
      const y = (k - 2) * 1.4, on = lights >= 6 ? 'g' : k < lights ? 'r' : null;
      pen.box(.2, y, h - .7, .5, 1.1, 1.1, '#18181c');
      pen.ball(-.12, y, h - .7, .38, .38, .38, on === 'g' ? '#30ff60' : on === 'r' ? '#ff2a1a' : '#3a2020');
      if (on) pen.glow(-.4, y, h - .7, .5, on === 'g' ? '#80ff90' : '#ff6a50');
    }
  }
}
/* a 3x5 dot font drawn with tiny boxes (the boards' flip digits; also car numbers) */
const DOTS = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001001001001', '8': '111101111101111', '9': '111101111001111',
  ':': '000010000010000', '.': '000000000000010', '-': '000000111000000', '+': '000010111010000', ' ': '000000000000000',
  A: '111101111101101', B: '110101110101110', C: '111100100100111', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '111100101101111', H: '101101111101101', I: '111010010010111', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '111101101101101', O: '111101101101111', P: '111101111100100', R: '111101110101101', S: '111100111001111', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111', '!': '010010010000010', '?': '111001011000010'
};
/** text on a board: in the pen's frame, facing -x (toward a car coming along +x), centred at (x, y, z); s: a dot's size */
export function drawDigits(pen, text, x, y, z, s, color) {
  const str = String(text).toUpperCase(), wid = str.length * 4 - 1, y0 = y - wid * s / 2;
  for (let i = 0; i < str.length; i++) {
    const g = DOTS[str[i]]; if (!g) continue;
    for (let r = 0; r < 5; r++) for (let c2 = 0; c2 < 3; c2++) if (g[r * 3 + c2] === '1') pen.box(-x, y0 + (i * 4 + c2 + .5) * s, z + (2 - r) * s, .04, s * .9, s * .9, color);
  }
}
export { DOTS };
