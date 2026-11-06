// The held map: a 320 x 240 DataTexture, drawn by hand, usable in Node. Paper, contours, river, roads, rail, labels; burn scars, you, the waypoint, the margin.
import { THREE, toonMaterial, setLookLayer } from '../../pixel-engine.js';
import { glyphRows, wrap } from '../ui/pixfont.js';
import { ROADS, RAIL, RIVER, STRIPS, RIVER_Y } from '../content/roads.js';
import { SITES, POSTS, TRIGS, HALTS } from '../content/sites.js';
import { S, FN, FCELL } from './fire.js';
import { K, HALF, CELLS } from './ground.js';
import { clamp, wrapAngle, lerp } from '../core/rng.js';
const { DataTexture, Mesh, PlaneGeometry, RGBAFormat, UnsignedByteType, NearestFilter, SRGBColorSpace } = THREE;
export const MW = 320, MH = 240;
const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const C = { paper: hex(0xe9d9a6), paper2: hex(0xddc98f), contour: hex(0xc8ae72), ink: hex(0x1a1c2c), river: hex(0x3b5dc9), road: hex(0xb13e53), track: hex(0x8a5a4a), rail: hex(0x333c57), label: hex(0x333c57), burn: hex(0x1a1c2c), burn2: hex(0x333c57), green: hex(0x38b764), you: hex(0xb13e53), way: hex(0xef7d57), margin: hex(0xf4f4f4), note: hex(0x5d275d), case: hex(0x38b764), gps: hex(0x29366f), gpsText: hex(0xa7f070), water: hex(0x41a6f6), salt: hex(0xf4f4f4), line: hex(0xef7d57), burning: hex(0xef7d57) };
const VIEW = 216; // map field is a square of this many texels, then the margin
export class HeldMap {
  up = false; t = 0; waypoint = null; cursor = [VIEW / 2, 120]; cursorOn = false; redrawT = 0; focus = null; seen = new Set(); notes = []; markers = []; dirty = true; marginLines = []; glowScar = false;
  constructor(game) { this.game = game; this.base = new Uint8Array(MW * MH * 4); this.data = new Uint8Array(MW * MH * 4); }
  build(ctx) {
    this.bake();
    this.tex = new DataTexture(this.data, MW, MH, RGBAFormat, UnsignedByteType);
    this.tex.minFilter = NearestFilter; this.tex.magFilter = NearestFilter; this.tex.colorSpace = SRGBColorSpace; this.tex.flipY = true; this.tex.needsUpdate = true;
    this.mat = toonMaterial(0x9a9a9a, { map: this.tex });
    this.plane = new Mesh(new PlaneGeometry(0.5, 0.375), this.mat);
    this.plane.castShadow = false; this.plane.receiveShadow = false; this.plane.frustumCulled = false;
    setLookLayer(this.plane, 'actors');
    const j = this.game.vm.mapJoint;
    j.add(this.plane);
    this.plane.position.set(0, 0, 0);
    j.visible = false;
    this.fit();
    this.redraw();
  }
  px(buf, x, y, c) { if (x < 0 || y < 0 || x >= MW || y >= MH) return; const i = (x + y * MW) * 4; buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255; }
  rect(buf, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(buf, x + i, y + j, c); }
  line(buf, x0, y0, x1, y1, c, dash = 0) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0;
    for (;;) {
      if (!dash || ((n++ / dash) | 0) % 2 === 0) this.px(buf, x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  text(buf, x, y, s, c) {
    for (const ch of String(s).toUpperCase()) {
      const rows = glyphRows(ch);
      for (let r = 0; r < 7; r++) for (let k = 0; k < 5; k++) if (rows[r][k] === '1') this.px(buf, x + k, y + r, c);
      x += 6;
    }
  }
  wx(x) { return ((x + 640) / 1280) * VIEW; }
  wy(z) { return ((z + 640) / 1280) * (MH - 8) + 4; }
  mx(mx) { return (mx / VIEW) * 1280 - 640; }
  my(my) { return ((my - 4) / (MH - 8)) * 1280 - 640; }
  bake() {
    const b = this.base, g = this.game.ground;
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) this.px(b, x, y, (x ^ y) % 7 === 0 ? C.paper2 : C.paper);
    // Field: contours every 8 m; salt; mine.
    const lvl = (h) => Math.floor(h / 8);
    for (let y = 4; y < MH - 4; y++) for (let x = 0; x < VIEW; x++) {
      const wx = this.mx(x), wz = this.my(y), h = g.sampleH(wx, wz);
      if (lvl(h) !== lvl(g.sampleH(this.mx(x + 1), wz)) || lvl(h) !== lvl(g.sampleH(wx, this.my(y + 1)))) this.px(b, x, y, C.contour);
      const k = g.kindAt(wx, wz);
      if (k === K.SALT && (x + y) % 2 === 0) this.px(b, x, y, C.salt);
      if (k === K.CROP && (x + y) % 3 === 0) this.px(b, x, y, C.contour);
      if (k === K.MINE && (x + y) % 2 === 0) this.px(b, x, y, C.burn2);
    }
    const poly = (pts, c, dash) => { for (let i = 0; i + 1 < pts.length; i++) this.line(b, this.wx(pts[i][0]), this.wy(pts[i][1]), this.wx(pts[i + 1][0]), this.wy(pts[i + 1][1]), c, dash); };
    poly(RIVER, C.river); poly(RIVER.map(([x, z]) => [x + 2.5, z + 2.5]), C.river);
    for (const r of Object.values(ROADS)) poly(r.pts, r.track ? C.track : C.road, r.track ? 3 : 0);
    for (const pts of Object.values(RAIL)) { poly(pts, C.rail); }
    for (const pts of Object.values(RAIL)) for (let i = 0; i + 1 < pts.length; i++) { const dx = pts[i + 1][0] - pts[i][0], dz = pts[i + 1][1] - pts[i][1], L = Math.hypot(dx, dz); for (let s = 0; s < L; s += 24) { const x = pts[i][0] + (dx * s) / L, z = pts[i][1] + (dz * s) / L; this.px(b, this.wx(x), this.wy(z) - 1, C.rail); this.px(b, this.wx(x), this.wy(z) + 1, C.rail); } }
    // Border and margin rule.
    this.rect(b, VIEW, 0, 1, MH, C.ink);
    this.rect(b, 0, 0, MW, 1, C.ink); this.rect(b, 0, MH - 1, MW, 1, C.ink); this.rect(b, 0, 0, 1, MH, C.ink); this.rect(b, MW - 1, 0, 1, MH, C.ink);
    for (const [key, s] of Object.entries(SITES)) {
      const x = this.wx(s.at[0]) | 0, y = this.wy(s.at[1]) | 0;
      this.rect(b, x - 1, y - 1, 3, 3, C.ink);
    }
    this.text(b, VIEW + 5, 4, 'THE KETTLE', C.ink);
    this.text(b, VIEW + 5, 12, 'E.H. SURVEY', C.label);
    this.rect(b, VIEW + 4, 21, MW - VIEW - 8, 1, C.ink);
  }
  /** Sites you've seen get their name; things appear as you learn them. */
  see(key) { if (!this.seen.has(key)) { this.seen.add(key); this.dirty = true; } }
  addNote(text) { this.notes.push(text); this.dirty = true; }
  setMargin(lines) { this.marginLines = lines; this.dirty = true; }
  setWaypoint(x, z) { this.waypoint = x == null ? null : [x, z]; this.dirty = true; }
  redraw() {
    const g = this.game, d = this.data;
    d.set(this.base);
    // Scars.
    const fire = g.fire;
    for (const id of fire.burntList) this.scar(d, id, C.burn);
    if (fire.regrown) for (const id of fire.regrown) this.scar(d, id, C.green);
    for (const id of fire.burning) this.scar(d, id, C.burning);
    if (this.glowScar) { for (const st of Object.values(STRIPS)) for (let i = 0; i + 1 < st.pts.length; i++) { const a = st.pts[i], b = st.pts[i + 1]; for (const off of [-1, 0, 1]) this.line(d, this.wx(a[0]) + off, this.wy(a[1]), this.wx(b[0]) + off, this.wy(b[1]), C.line); } }
    // Names of what you've seen.
    for (const [key, s] of Object.entries(SITES)) {
      if (!this.seen.has(key)) continue;
      const x = this.wx(s.at[0]) | 0, y = this.wy(s.at[1]) | 0;
      const short = s.name.replace('THE ', '').split(' ').slice(0, 2).join(' ');
      this.text(d, clamp(x + 3, 1, VIEW - short.length * 6 - 1), clamp(y - 3, 2, MH - 10), short, C.label);
    }
    for (const t of TRIGS) if (g.story?.trigsDone?.has(t.id) || this.seen.has(t.id)) { const x = this.wx(t.at[0]) | 0, y = this.wy(t.at[1]) | 0; this.line(d, x - 2, y + 2, x + 2, y + 2, C.note); this.line(d, x - 2, y + 2, x, y - 2, C.note); this.line(d, x + 2, y + 2, x, y - 2, C.note); }
    for (const m of this.markers) { const x = this.wx(m.x) | 0, y = this.wy(m.z) | 0; this.rect(d, x - 2, y - 2, 5, 5, m.color ?? C.way); this.rect(d, x - 1, y - 1, 3, 3, C.paper); }
    // Waypoint: a stubby cross.
    if (this.waypoint) { const x = this.wx(this.waypoint[0]) | 0, y = this.wy(this.waypoint[1]) | 0; for (let k = -4; k <= 4; k++) { this.px(d, x + k, y, C.way); this.px(d, x, y + k, C.way); this.px(d, x + k, y + 1, C.way); this.px(d, x + 1, y + k, C.way); } }
    // You.
    if (g.hasPlayer) {
      const f = g.player.seat ? g.player.seat.feet() : g.player.feet;
      const px = this.wx(f.x), py = this.wy(f.z), yaw = g.player.seat?.v ? g.player.seat.v.yaw + Math.PI : g.player.yaw;
      const ax = px - Math.sin(yaw) * 6, ay = py - Math.cos(yaw) * 6;
      this.line(d, px, py, ax, ay, C.you);
      this.rect(d, (px | 0) - 1, (py | 0) - 1, 3, 3, C.you);
    }
    // Margin: step and notes in Harrow's hand.
    let y = 25;
    const textW = MW - VIEW - 8;
    const put = (s, c) => { for (const line of wrap(s, textW)) { if (y > 170) return; this.text(d, VIEW + 5, y, line, c); y += 8; } };
    for (const line of this.marginLines) put(line, C.ink);
    if (this.marginLines.length) { y += 2; this.rect(d, VIEW + 4, y - 3, textW, 1, C.contour); }
    if (this.page === undefined) this.page = 0;
    const notes = this.noteShown();
    if (notes) put(notes, C.note);
    // A GPS clipped to the corner: wind arrow, clock.
    this.rect(d, VIEW + 3, 176, MW - VIEW - 6, 60, C.gps);
    this.rect(d, VIEW + 4, 177, MW - VIEW - 8, 58, C.ink);
    const hour = g.clock.hour, hh = Math.floor(hour), mm = Math.floor((hour - hh) * 60);
    this.text(d, VIEW + 8, 181, `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, C.gpsText);
    this.text(d, VIEW + 8, 190, 'WIND', C.gpsText);
    const wx = VIEW + 70, wy = 192, w = g.wind;
    this.line(d, wx - w.x * 8, wy - w.z * 8, wx + w.x * 8, wy + w.z * 8, C.gpsText);
    this.rect(d, wx + w.x * 8 - 1, wy + w.z * 8 - 1, 3, 3, C.gpsText);
    this.text(d, VIEW + 8, 199, `${Math.round(w.total)} M/S`, C.gpsText);
    if (this.waypoint && g.hasPlayer) { const f = g.player.feet; this.text(d, VIEW + 8, 208, `${Math.round(Math.hypot(this.waypoint[0] - f.x, this.waypoint[1] - f.z))} M`, C.gpsText); }
    if (g.story?.stones != null) this.text(d, VIEW + 8, 218, `STONES ${g.story.stones}`, C.gpsText);
    // Cursor.
    if (this.cursorOn) {
      const [cx, cy] = this.cursor;
      for (let k = -5; k <= 5; k++) { if (Math.abs(k) > 1) { this.px(d, (cx + k) | 0, cy | 0, C.ink); this.px(d, cx | 0, (cy + k) | 0, C.ink); } }
      if (this.focus) this.text(d, clamp((cx | 0) + 6, 1, VIEW - this.focus.name.length * 6 - 1), clamp((cy | 0) + 6, 2, MH - 10), this.focus.name, C.you);
    }
    if (this.tex) this.tex.needsUpdate = true;
    this.dirty = false;
  }
  noteShown() { return this.notes.length ? this.notes[this.notes.length - 1 - (this.notePage ?? 0)] : null; }
  scar(d, id, c) {
    const x = this.wx(fireX(id)), y = this.wy(fireZ(id));
    const w = Math.max(1, Math.ceil(VIEW / FN)), h = Math.max(1, Math.ceil((MH - 8) / FN));
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(d, (x + i) | 0, (y + j) | 0, c);
  }
  /** Sets up the things you can pick on the sheet. */
  candidates() {
    const g = this.game, out = [];
    for (const [key, s] of Object.entries(SITES)) if (this.seen.has(key)) out.push({ x: s.at[0], z: s.at[1], name: s.name, kind: 'site' });
    for (const m of this.markers) out.push({ x: m.x, z: m.z, name: m.name ?? 'MARK', kind: 'mark' });
    for (const t of TRIGS) if (this.seen.has(t.id)) out.push({ x: t.at[0], z: t.at[1], name: 'TRIG POINT', kind: 'trig' });
    return out;
  }
  moveCursor(dx, dy) {
    this.cursor[0] = clamp(this.cursor[0] + dx, 2, VIEW - 2); this.cursor[1] = clamp(this.cursor[1] + dy, 2, MH - 3);
    const wx = this.mx(this.cursor[0]), wz = this.my(this.cursor[1]);
    let best = null, bd = 28;
    for (const c of this.candidates()) { const d = Math.hypot(c.x - wx, c.z - wz); if (d < bd) { bd = d; best = c; } }
    this.focus = best;
    this.dirty = true;
  }
  pick() {
    const wx = this.mx(this.cursor[0]), wz = this.my(this.cursor[1]);
    const t = this.focus ?? { x: wx, z: wz, name: 'A PLACE' };
    this.setWaypoint(t.x, t.z);
    this.game.sfx.play('ui-confirm', { volume: 0.4 });
    this.game.events.emit('waypoint', t);
    return t;
  }
  /** One texel, one art pixel: the distance follows the field of view and the art width. */
  fit() {
    const g = this.game, cam = g.ctx.camera.camera, hud = g.ctx.hud;
    const artW = hud.width || 480;
    const visibleW = 0.5 / (MW / artW);
    const dist = visibleW / (2 * Math.tan((cam.fov * Math.PI) / 360) * (artW / (hud.height || 270)));
    this.plane.position.z = 0.42 - dist;
  }
  raise(on) {
    const g = this.game;
    if (on === this.up) return;
    this.up = on;
    if (on) this.fit();
    g.sfx.play('map-paper', { volume: 0.7 });
    this.cursorOn = on;
    this.dirty = true;
    const vm = g.vm;
    vm.mapJoint.visible = on;
    if (g.views && g.driving.vehicle) g.vehicles.cab.object.visible = !on && !g.driving.gunning;
    if (on) {
      vm.setVisible(true);
      vm.showProp();
      vm.play('MapRaise', { keep: true, onEnd: null });
      this.torch = g.views ? g.ctx.lights.request({ follow: vm.group, offset: [0, 0, 0], color: 0xffe2a8, intensity: 3, radius: 3, priority: 4, name: 'map torch' }) : null;
      g.events.emit('map-up');
    } else {
      this.torch?.release(); this.torch = null;
      vm.endAction(0.2);
      if (g.player.seat) vm.setVisible(false);
      else vm.showGun(g.weapons.gun?.id ?? 'cane', false);
      g.events.emit('map-down');
    }
  }
  update(ctx, dt) {
    if (this.up && (this.redrawT -= dt) <= 0) { this.redrawT = 0.5; this.dirty = true; }
    if (this.dirty && this.up) this.redraw();
  }
}
const fireX = (id) => (id % FN) * FCELL - HALF + FCELL / 2;
const fireZ = (id) => ((id / FN) | 0) * FCELL - HALF + FCELL / 2;
