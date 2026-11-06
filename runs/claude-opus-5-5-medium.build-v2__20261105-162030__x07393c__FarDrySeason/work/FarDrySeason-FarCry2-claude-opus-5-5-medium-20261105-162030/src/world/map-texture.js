// The paper map: the heart of pillar 3. Baked once, redrawn at up to 2 Hz. No DOM, so it runs anywhere.
import { THREE } from '../../pixel-engine.js';
import { RAILWAY, RIVER, ROADS, STRIPS } from '../content/roads.js';
import { CASES as _CASES, SITES, siteById } from '../content/sites.js';
import { NOTES } from '../content/dialogue.js';
import { drawText, wrap } from '../ui/pixfont.js';
import { BURNT, BURNING, FIRE_N, REGROWING } from './fire.js';
import { clamp } from './geom.js';
export const MAP_W = 320, MAP_H = 240, PANE = 226;
const PAPER = [233, 205, 150], LINE = [196, 162, 112], INK = [38, 34, 44], RED = [177, 62, 83], TEAL = [37, 113, 121], GREEN = [56, 183, 100], ORANGE = [239, 125, 87], WHITE = [244, 244, 244], BLUE = [41, 54, 111], MARGIN = [240, 220, 172];
export class MapTexture {
  zoom = false; cursorX = 110; cursorY = 110; hover = null; dirtyT = 0; arc = false;
  constructor(game) { this.game = game; }
  build() {
    this.base = new Uint8Array(MAP_W * MAP_H * 4); this.px = new Uint8Array(MAP_W * MAP_H * 4);
    this.texture = new THREE.DataTexture(this.px, MAP_W, MAP_H, THREE.RGBAFormat);
    this.texture.magFilter = THREE.NearestFilter; this.texture.minFilter = THREE.LinearFilter; /* Shown slightly below 1:1: nearest would drop whole rows of the font. */ this.texture.colorSpace = THREE.SRGBColorSpace; this.texture.flipY = true; this.texture.needsUpdate = true;
    this.bake();
    this.draw();
  }
  wx(x) { return ((x + 640) / 1280) * PANE + 6; }
  wy(z) { return ((z + 640) / 1280) * PANE + 7; }
  toScreen(x, z) {
    if (!this.zoom) return [this.wx(x), this.wy(z)];
    const p = this.game.player, K = 3;
    return [6 + PANE / 2 + (((x - p.x) / 1280) * PANE) * K, 7 + PANE / 2 + (((z - p.z) / 1280) * PANE) * K];
  }
  toWorld(sx, sy) {
    if (!this.zoom) return [((sx - 6) / PANE) * 1280 - 640, ((sy - 7) / PANE) * 1280 - 640];
    const p = this.game.player, K = 3; return [p.x + (((sx - 6 - PANE / 2) / K) / PANE) * 1280, p.z + (((sy - 7 - PANE / 2) / K) / PANE) * 1280];
  }
  set(buf, x, y, c) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return; const k = (x + y * MAP_W) * 4; buf[k] = c[0]; buf[k + 1] = c[1]; buf[k + 2] = c[2]; buf[k + 3] = 255; }
  line(buf, ax, ay, bx, by, c, step = 1) { const n = Math.ceil(Math.hypot(bx - ax, by - ay)); for (let i = 0; i <= n; i += step) this.set(buf, ax + ((bx - ax) * i) / (n || 1), ay + ((by - ay) * i) / (n || 1), c); }
  poly(buf, pts, c, step = 1) { for (let i = 0; i + 1 < pts.length; i++) { const [a, b] = this.toScreen(pts[i][0], pts[i][1]), [d, e] = this.toScreen(pts[i + 1][0], pts[i + 1][1]); this.line(buf, a, b, d, e, c, step); } }
  bakePane(buf, zoomed) {
    const land = this.game.world.land, K = zoomed ? 3 : 1;
    for (let y = 7; y < 7 + PANE; y++) for (let x = 6; x < 6 + PANE; x++) {
      const [wx, wz] = this.toWorld(x, y);
      if (Math.abs(wx) >= 640 || Math.abs(wz) >= 640) { this.set(buf, x, y, MARGIN); continue; }
      const h = land.heightAt(wx, wz), hr = land.heightAt(wx + 5.67 / K, wz), hd = land.heightAt(wx, wz + 5.67 / K);
      const line = Math.floor(h / 8) !== Math.floor(hr / 8) || Math.floor(h / 8) !== Math.floor(hd / 8);
      const k = land.kindAt(wx, wz);
      let c = PAPER;
      if (k === 3) c = [238, 230, 215]; else if (k === 8) c = [226, 190, 120]; else if (k === 5) c = [214, 196, 138];
      if (line) c = LINE;
      this.set(buf, x, y, c);
    }
    this.poly(buf, RIVER, TEAL); this.poly(buf, RIVER.map((p) => [p[0] + 3, p[1] + 3]), TEAL);
    for (const r of Object.values(ROADS)) this.poly(buf, r, RED);
    this.poly(buf, RAILWAY, INK, 2);
  }
  bake() {
    const b = this.base;
    for (let i = 0; i < b.length; i += 4) { b[i] = MARGIN[0]; b[i + 1] = MARGIN[1]; b[i + 2] = MARGIN[2]; b[i + 3] = 255; }
    this.bakePane(b, false);
    for (let x = 4; x < 234; x++) { this.set(b, x, 5, INK); this.set(b, x, 234, INK); }
    for (let y = 5; y < 235; y++) { this.set(b, 4, y, INK); this.set(b, 233, y, INK); }
    drawText(b, MAP_W, MAP_H, 238, 6, 'THE KETTLE', INK);
    this.line(b, 238, 15, 314, 15, INK);
  }
  /** Redraw on a copy. At most 2 Hz (the caller throttles). */
  draw() {
    const g = this.game, px = this.px, fire = g.world.fire, sts = fire.state, p = g.player;
    if (this.zoom) { px.set(this.base); this.bakePane(px, true); } else px.set(this.base);
    // Burn scars, in ink.
    for (let y = 7; y < 7 + PANE; y++) for (let x = 6; x < 6 + PANE; x++) {
      const [wx, wz] = this.toWorld(x, y); if (Math.abs(wx) >= 640 || Math.abs(wz) >= 640) continue;
      const i = Math.floor((wx + 640) / 5) + Math.floor((wz + 640) / 5) * FIRE_N, s = sts[i];
      if (s === BURNT) this.set(px, x, y, (x + y) % 2 ? INK : [58, 54, 66]); else if (s === BURNING) this.set(px, x, y, (x ^ y) & 1 ? ORANGE : RED); else if (s === REGROWING) this.set(px, x, y, GREEN);
    }
    // In the last scene the three scars glow as one line.
    if (this.arc) { const pts = [...STRIPS.A.points, ...STRIPS.C.points.slice(1), ...STRIPS.B.points.slice(1), [-590, -430]]; this.poly(px, pts, ORANGE); this.poly(px, pts.map((q) => [q[0] + 4, q[1]]), [255, 205, 117]); }
    // Sites you've seen.
    const seen = g.story?.seen ?? {};
    for (const s of SITES) if (s.onMap && (seen[s.id] || g.mapShowsAll)) {
      const [sx, sy] = this.toScreen(s.at[0], s.at[1]);
      for (let k = -1; k <= 1; k++) { this.set(px, sx + k, sy, INK); this.set(px, sx, sy + k, INK); }
      if (s.id === g.story?.safeLabel || !this.zoom || (sx > 6 && sx < 6 + PANE - 30 && sy > 7 && sy < 7 + PANE - 8)) { if (sx < 6 + PANE - 40 && (this.zoom || s.kind === 'town' || s.kind === 'hq')) drawText(px, MAP_W, MAP_H, sx + 3, sy - 3, s.name.replace('THE ', ''), INK); }
    }
    // Column.
    const col = g.people?.column; if (col) for (const w of col.walkers) { const [a, b] = this.toScreen(w.x, w.z); this.set(px, a, b, WHITE); this.set(px, a + 1, b, BLUE); }
    // Waypoint.
    const wp = g.waypoint; if (wp) { const [a, b] = this.toScreen(wp[0], wp[1]); for (let k = -3; k <= 3; k++) { this.set(px, a + k, b + k, RED); this.set(px, a + k, b - k, RED); } }
    // You, and which way you face.
    const [mx, my] = this.toScreen(p.x, p.z), yaw = g.ctx.camera.yaw;
    for (let k = 0; k < 7; k++) this.set(px, mx - Math.sin(yaw) * k, my - Math.cos(yaw) * k, BLUE);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) this.set(px, mx + a, my + b, a || b ? WHITE : BLUE);
    // Cursor.
    const cx = this.cursorX, cy = this.cursorY; for (let k = 2; k <= 5; k++) { this.set(px, cx + k, cy, INK); this.set(px, cx - k, cy, INK); this.set(px, cx, cy + k, INK); this.set(px, cx, cy - k, INK); }
    // Margin: step, notes, wind and clock.
    let y = 19;
    const step = g.missions?.step;
    for (const l of wrap(g.mapMarginStep?.() ?? step?.text ?? 'NO CONTRACT', 13).slice(0, 5)) { drawText(px, MAP_W, MAP_H, 238, y, l, RED); y += 9; }
    this.line(px, 238, y, 314, y, LINE); y += 3;
    const note = g.story?.marginNote; if (note) { for (const l of wrap(note, 13)) { drawText(px, MAP_W, MAP_H, 238, y, l, INK); y += 9; } y += 2; }
    const notes = Object.entries(g.story?.trigs ?? {}); const last = notes.length ? NOTES[g.lastNoteI ?? notes.length - 1] : null;
    if (last && y < 170) for (const l of wrap(last + ' E.H.', 13).slice(0, Math.floor((176 - y) / 9))) { drawText(px, MAP_W, MAP_H, 238, y, l, BLUE); y += 9; }
    // GPS.
    for (let a = 240; a < 312; a++) for (let b = 182; b < 228; b++) this.set(px, a, b, [40, 44, 58]);
    const w = g.world.wind, ox = 256, oy = 206;
    for (let k = -8; k <= 8; k++) this.set(px, ox + w.x * k, oy + w.z * k, GREEN);
    for (let k = 0; k < 4; k++) { this.set(px, ox + w.x * 8 - w.x * k + w.z * k * 0.6, oy + w.z * 8 - w.z * k - w.x * k * 0.6, GREEN); this.set(px, ox + w.x * 8 - w.x * k - w.z * k * 0.6, oy + w.z * 8 - w.z * k + w.x * k * 0.6, GREEN); }
    const hh = Math.floor(g.world.hour), mm = Math.floor((g.world.hour - hh) * 60);
    drawText(px, MAP_W, MAP_H, 270, 186, `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, [140, 240, 150]);
    drawText(px, MAP_W, MAP_H, 268, 198, `${w.speed.toFixed(0)} M/S`, [140, 240, 150]);
    drawText(px, MAP_W, MAP_H, 268, 210, `DAY ${g.world.day}`, [140, 240, 150]);
    if (this.hover) drawText(px, MAP_W, MAP_H, clamp(cx + 6, 8, 180), clamp(cy + 6, 9, 222), this.hover, RED);
    this.texture.needsUpdate = true;
  }
  /** Move the cursor; hover finds the nearest marker. */
  moveCursor(dx, dy) {
    this.cursorX = clamp(this.cursorX + dx, 7, 7 + PANE - 2); this.cursorY = clamp(this.cursorY + dy, 8, 8 + PANE - 2);
    let best = null, bd = 8;
    const seen = this.game.story?.seen ?? {};
    for (const s of SITES) if (s.onMap && (seen[s.id] || this.game.mapShowsAll)) { const [sx, sy] = this.toScreen(s.at[0], s.at[1]), d = Math.hypot(sx - this.cursorX, sy - this.cursorY); if (d < bd) { bd = d; best = s; } }
    this.hoverSite = best; this.hover = best ? best.name : null;
  }
  /** Where a waypoint goes when you mark here. */
  markTarget() { return this.hoverSite ? [this.hoverSite.at[0], this.hoverSite.at[1]] : this.toWorld(this.cursorX, this.cursorY); }
}
export { _CASES, siteById };
