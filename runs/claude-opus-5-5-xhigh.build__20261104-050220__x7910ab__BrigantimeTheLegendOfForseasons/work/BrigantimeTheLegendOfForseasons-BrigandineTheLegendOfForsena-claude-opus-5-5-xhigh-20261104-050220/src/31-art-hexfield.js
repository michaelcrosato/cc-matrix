// THE BATTLEFIELD: a wall-less TileMap whose floorTex bakes the hex field (each pixel finds its hex by cube rounding,
// colours it by terrain, season and region, and darkens the hex edges by the Grid lines setting), terrain props placed
// by a seeded stream per hex, raised blocks as shapes (they sort like props, so units behind them get x-ray), and the
// hex decals each frame. World = hex coordinates + OFF (a margin of two tiles all round).

const HF = G.hex, OFF = 32, HT = HF.T, AP = HT / 2;
const NRM = [[1, 0], [Math.cos(Math.PI / 3), Math.sin(Math.PI / 3)], [Math.cos(2 * Math.PI / 3), Math.sin(2 * Math.PI / 3)]];

class Field {
  /** sim: a BattleSim; o: { region, owner (realm id of the Keep's owner), style (map dressing) } */
  constructor(sim, o = {}) {
    this.sim = sim; this.region = o.region || 'neutral'; this.owner = o.owner || null; this.mapDef = G.get('map', sim.s.map);
    const s = sim.s; this.w = s.w; this.h = s.h;
    this.W = (s.w + .5) * HT + OFF * 2; this.H = ((s.h - 1) * .866 + 1.155) * HT + OFF * 2;
    const tw = Math.ceil(this.W / 16), th = Math.ceil(this.H / 16);
    this.map = new E.TileMap({ w: tw, h: th, floorTex: (x, y) => this.tex(x, y), outside: undefined, ao: 0 });
    this.sig = ''; this.grid = 'Subtle'; this.lit = {};
    this.rebuild();
  }
  center(c) { const p = HF.center(c); return [p[0] + OFF, p[1] + OFF]; }
  cellAt(x, y) { return HF.toCell(x - OFF, y - OFF); }
  inside(c) { return HF.inside(c, this.w, this.h); }
  code(c) { return this.sim.s.cells[c[1] * this.w + c[0]]; }
  /** the ground at world point (x, y) */
  tex(x, y) {
    const s = this.sim.s, hx = x - OFF, hy = y - OFF, c = HF.toCell(hx, hy);
    if (!this.inside(c)) { const k = G.groundColor('.', x, y, s.season, this.region, 10, .5); return G.mulc(k, .78); }
    const code = s.cells[c[1] * this.w + c[0]], [cx, cy] = HF.center(c), dx = hx - cx, dy = hy - cy;
    let m = 0; for (const n of NRM) m = Math.max(m, Math.abs(n[0] * dx + n[1] * dy));
    const e = AP - m;
    let col = G.groundColor(code, x, y, s.season, this.region, e, .5);
    if (code === 'K') { const r = Math.hypot(dx, dy); if (r > 8 && r < 10) col = G.mulc(col, .7); }
    if (code === 'D') { const r = Math.hypot(dx, dy); if (r < 9) col = this.lit[c[0] + ',' + c[1]] ? E.hex(r < 3 ? '#fff8d0' : '#ffd060') : E.hex(r < 3 ? '#8a7a50' : r < 6 ? '#b89a50' : '#6a5a3a'); }
    const edge = this.grid === 'Bold' ? .82 : this.grid === 'Off' ? 1 : .92;
    if (e < .9 && edge < 1) col = G.mulc(col, edge);
    return col;
  }
  /** rebuild after the season or terrain changed (fire, ash, the wheel turning) */
  rebuild(force) {
    const s = this.sim.s, grid = (G.game && G.game.settings && G.game.settings.grid) || 'Subtle';
    const lit = s.dials.filter(d => d.lit).map(d => d.c.join(',')).join(';');
    const sig = s.season + '|' + s.cells.join('') + '|' + grid + '|' + lit;
    if (sig === this.sig && !force) return false;
    this.sig = sig; this.grid = grid; this.lit = {}; for (const d of s.dials) if (d.lit) this.lit[d.c.join(',')] = true;
    this.map.floors = {};
    // water: tag the square cells under water hexes so the engine's shimmer plays
    for (let ty = 0; ty < this.map.h; ty++) for (let tx = 0; tx < this.map.w; tx++) {
      const c = this.cellAt(tx * 16 + 8, ty * 16 + 8), code = this.inside(c) ? this.code(c) : null;
      this.map.setFloor(tx, ty, code === 'w' || code === 'L' || code === '~' ? 'water' : null, false);
    }
    this.props = this._props();
    return true;
  }
  _props() {
    const s = this.sim.s, out = [], region = this.region, season = s.season, P = G.PAL[season] || G.PAL.spring, rk = G.regionKey(region);
    const block = this.mapDef.blockShape, hour = region === 'hour';
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = [x, y], code = this.code(c), [wx, wy] = this.center(c), rnd = G.cosmetic(x * 131 + y * 977 + 7);
      const at = (k = 7) => [wx + (rnd() - .5) * k * 2, wy + (rnd() - .5) * k * 1.6];
      switch (code) {
        case 'f': {
          const n = 2 + (rnd() > .5 ? 1 : 0);
          for (let i = 0; i < n; i++) {
            const [px0, py0] = at(8), h = 22 + rnd() * 12;
            if (hour) out.push({ shape: 'tree', x: px0, y: py0, params: { h: h * .8, seed: x * 3 + y + i }, mats: { l: '#4a4a56 foliage', b: '#2a2a36 bark' } });
            else if (rk === 'winter' || (season === 'winter' && rnd() > .5)) out.push({ shape: 'pine', x: px0, y: py0, params: { h: h + 6, tiers: 4 }, mats: season === 'winter' ? { l: '#d8e8f0 foliage' } : undefined });
            else if (rk === 'summer' && rnd() > .45) out.push({ prop: 'palm', x: px0, y: py0, size: 1.2 });
            else out.push({ shape: 'tree', x: px0, y: py0, params: { h, seed: x * 7 + y * 3 + i }, mats: { l: season === 'spring' && rnd() > .3 ? '#f4b8d0 foliage' : season === 'autumn' ? (rnd() > .5 ? '#d8782a foliage' : '#c84a1e foliage') : season === 'winter' ? '#e8f0f8 foliage' : (rk === 'summer' ? '#6a9a3a foliage' : undefined) } });
          }
          break;
        }
        case 'B': out.push({ fire: true, x: wx, y: wy }); out.push({ shape: 'tree', x: wx, y: wy, params: { h: 18, seed: x + y }, mats: { l: '#3a2a20 foliage', b: '#1a1410 bark' } }); break;
        case 'a': out.push({ shape: 'rock', x: wx + 4, y: wy, params: { r: 2.5, seed: x + y }, mats: { s: '#4a4642 rock' } }); break;
        case 'h': { const n = rnd() > .4 ? 2 : 1; for (let i = 0; i < n; i++) { const [a, b] = at(8); out.push({ shape: 'rock', x: a, y: b, params: { r: 2.5 + rnd() * 2.5, seed: x * 5 + y + i } }); } break; }
        case 'm': out.push(block === 'cliff' || rnd() > .5 ? { shape: 'cliff', x: wx, y: wy, mats: { s: rk === 'summer' ? '#b8582a rock' : rk === 'winter' ? '#8a90a0 rock' : undefined }, snow: season === 'winter' } : { shape: 'rock', x: wx, y: wy, params: { r: 11 + rnd() * 4, seed: x * 11 + y } }); if (hour && rnd() > .5) out.push({ shape: 'crystal', x: wx + 5, y: wy + 3, params: { h: 14, seed: x } }); break;
        case 's': for (let i = 0; i < 2; i++) { const [a, b] = at(8); out.push({ shape: 'grass', x: a, y: b, params: { h: 7, n: 7 }, mats: { g: '#5a7a3a grass' } }); } break;
        case 'd': { const [a, b] = at(6); out.push({ shape: 'grass', x: a, y: b, params: { h: 4, n: 4 }, mats: { g: '#a8884a grass' } }); break; }
        case 'r': out.push({ shape: 'brokenpillar', x: wx + (rnd() - .5) * 6, y: wy + (rnd() - .5) * 4 }); break;
        case 'F': case 'W': if (season !== 'winter') for (let i = 0; i < 3; i++) { const [a, b] = at(8); out.push({ shape: 'grass', x: a, y: b, params: { h: code === 'W' ? 10 : 5, n: 6 }, mats: { g: code === 'W' || season === 'summer' ? '#e0c050 grass' : '#7ab050 grass' } }); } break;
        case 't': if (rnd() > .5) out.push({ shape: 'haybale', x: wx, y: wy }); break;
        case 'b': out.push({ shape: 'bridge', x: wx, y: wy, facing: Math.PI / 2, flat: true }); break;
        case 'K': out.push({ shape: hour ? 'keep-hour' : 'keep', x: wx, y: wy - 1, keep: true }); break;
        case 'D': out.push({ shape: 'dial', x: wx, y: wy, dial: c }); break;
        case '#': out.push(block === 'cottage' ? { shape: 'cottage', x: wx, y: wy, facing: rnd() > .5 ? Math.PI / 2 : 0 } : block === 'gear' ? { shape: 'gear', x: wx, y: wy } : block === 'cliff' ? { shape: 'cliff', x: wx, y: wy } : { shape: season === 'winter' || rk === 'winter' ? 'hexblock-ice' : 'hexblock', x: wx, y: wy }); break;
        case '.': if (rnd() > .93) { const [a, b] = at(7); out.push(season === 'winter' ? { shape: 'rock', x: a, y: b, params: { r: 2, seed: x }, mats: { s: '#e8f0f8 rock' } } : rk === 'summer' && rnd() > .5 ? { prop: 'cactus', x: a, y: b, size: .8 } : { shape: 'bush', x: a, y: b, params: { r: 4 }, mats: season === 'autumn' ? { l: '#c8782a foliage' } : undefined }); } break;
        case 'n': if (rnd() > .9) { const [a, b] = at(7); out.push({ shape: 'pine', x: a, y: b, params: { h: 20, tiers: 3 }, mats: { l: '#d8e8f0 foliage' } }); } break;
        case 'g': if (rnd() > .94 && !hour) { const [a, b] = at(6); out.push({ prop: 'barrel', x: a, y: b, size: 1 }); } else if (rnd() > .9 && hour) { const [a, b] = at(6); out.push({ prop: 'lamp', x: a, y: b, size: 1, light: true }); } break;
      }
    }
    return out;
  }
  /** draw the floor, then queue props and lights */
  draw(r, t) {
    this.map.drawFloor(r);
    const s = this.sim.s, L = G.game.lights;
    for (const p of this.props) {
      if (!r.visible(p.x, p.y, 0, 80, 80, 40)) continue;
      if (p.fire) { r.queue(p.x, p.y, 1, g => { const q = r.w(p.x, p.y, 2); for (let i = 0; i < 3; i++) { const ph = t * 9 + i * 2 + p.x; E.px.poly(g, [[q[0] - 4 + i * 3, q[1]], [q[0] - 2 + i * 3 + Math.sin(ph) * 1.5, q[1] - 8 - Math.sin(ph * 1.3) * 3], [q[0] + i * 3, q[1]]], ['#ff5010', '#ff9a20', '#ffe060'][i]); } }, { emissive: true }); L.add(p.x, p.y, 8, 40, .8, { color: '#ff8a30' }); continue; }
      if (p.prop) { r.prop(p.prop, p.x, p.y, 0, { size: p.size || 1, light: p.light }); continue; }
      if (p.keep) {
        r.shape(p.shape, p.x, p.y, 0, {});
        L.add(p.x - 10, p.y + 8, 14, 50, .8, { color: '#ffb050' }); L.add(p.x + 10, p.y + 8, 14, 50, .8, { color: '#ffb050' });
        r.prop('torch', p.x - 11, p.y + 9, 0, { size: .9 }); r.prop('torch', p.x + 11, p.y + 9, 0, { size: .9 });
        continue;
      }
      if (p.dial) { const lit = this.lit[p.dial.join(',')]; if (lit) { L.add(p.x, p.y, 6, 46, 1, { color: '#ffd060' }); r.queue(p.x, p.y, 1, g => { const q = r.w(p.x, p.y, 2); r.glowDisc(g, q[0], q[1], 10, '#ffd060', .6); }, { emissive: true }); } continue; }
      r.shape(p.shape, p.x, p.y, 0, { params: p.params, mats: p.mats, facing: p.facing, shadow: !p.flat });
      if (p.snow) r.queue(p.x, p.y, 0, g => { const q = r.w(p.x, p.y, 18); E.px.ell(g, q[0], q[1], 6, 2, '#f0f8ff'); }, { bias: 1 });
    }
  }
  /** hex outline points on screen (k: inset scale) */
  hexPts(r, c, k = .94, z = 0) { return HF.corners(c, k).map(([x, y]) => r.w(x + OFF, y + OFF, z)); }
  fill(r, cells, color, alpha) {
    if (!cells || !cells.length) return;
    r.decal(g => { for (const c of cells) E.px.polyDither(g, this.hexPts(r, c, .9), color, alpha, r.ix, r.iy); });
  }
  outline(r, c, color, k = .96, z = 0) { const p = this.hexPts(r, c, k, z); r.decal(g => { for (let i = 0; i < 6; i++) { const a = p[i], b = p[(i + 1) % 6]; E.px.line(g, a[0], a[1], b[0], b[1], color, 1); } }); }
  /** a dashed outline round a set of hexes (a Ward) */
  border(r, cells, color, alpha = 1, dash = true) {
    const set = new Set(cells.map(c => c[0] + ',' + c[1]));
    r.decal(g => {
      for (const c of cells) {
        const p = this.hexPts(r, c, 1);
        for (let d = 0; d < 6; d++) {
          const n = HF.step(c, d); if (set.has(n[0] + ',' + n[1])) continue;
          // the edge facing direction d lies between corners d and d+1 (corner i is at -90 + 60 i degrees; direction d at 60 d)
          const a = p[(d + 1) % 6], b = p[(d + 2) % 6], steps = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1])));
          for (let i = 0; i <= steps; i++) { if (dash && ((i >> 1) & 1)) continue; E.px.dot(g, Math.round(a[0] + (b[0] - a[0]) * i / steps), Math.round(a[1] + (b[1] - a[1]) * i / steps), color); }
        }
      }
    });
  }
  /** white chevrons along a path */
  path(r, path, t) {
    if (!path || path.length < 2) return;
    r.decal(g => {
      for (let i = 1; i < path.length; i++) {
        const a = this.center(path[i - 1]), b = this.center(path[i]), pa = r.w(a[0], a[1], 0), pb = r.w(b[0], b[1], 0);
        const mx = (pa[0] + pb[0]) / 2, my = (pa[1] + pb[1]) / 2, ang = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]), k = ((t * 3 + i * .3) % 1) > .5 ? '#ffffff' : '#e8f0ff';
        const f = [Math.cos(ang), Math.sin(ang)], sd = [-f[1], f[0]];
        E.px.poly(g, [[mx + f[0] * 3, my + f[1] * 3], [mx - f[0] * 2 + sd[0] * 3, my - f[1] * 2 + sd[1] * 3], [mx - f[0] * 1, my - f[1] * 1], [mx - f[0] * 2 - sd[0] * 3, my - f[1] * 2 - sd[1] * 3]], k);
      }
      const e = this.center(path[path.length - 1]), pe = r.w(e[0], e[1], 0); E.px.disc(g, pe[0], pe[1], 2, '#ffffff');
    });
  }
  /** the cursor: a pulsing white-and-gold outline */
  cursor(r, c, t, color) {
    if (!c || !this.inside(c)) return;
    const k = .5 + .5 * Math.sin(t * 7), p = this.hexPts(r, c, 1 - k * .06);
    r.decal(g => { for (let i = 0; i < 6; i++) { const a = p[i], b = p[(i + 1) % 6]; E.px.line(g, a[0], a[1], b[0], b[1], color || (k > .5 ? '#ffffff' : '#ffe070'), 1); } });
  }
  /** a hatch over hexes (the danger overlay) */
  hatch(r, cells, color) {
    r.decal(g => { for (const c of cells) { const p = this.hexPts(r, c, .85), xs = p.map(q => q[0]), ys = p.map(q => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys); for (let x = x0; x < x1; x += 3) { const cx2 = x + 3; E.px.line(g, x, y1, Math.min(x1, cx2 + (y1 - y0) * .3), y0, color, 1); } } });
  }
  bounds(view) { return this.map.bounds(view); }
}
G.Field = Field;
G.FIELD_OFF = OFF;
