// THE CONTINENT OF FORSEASON: a 64 x 64-tile TileMap (1024 x 1024 world units) in the threequarter view. Its floorTex
// reads a raster baked once at boot (4 units a cell): land and coast, the season sectors (north Winter, east Spring,
// south Summer, west Autumn, blended on the cross-quarter diagonals), sub-terrain by noise, the Hour plateau, four
// rivers, the 36 roads, and each castle's Voronoi cell for the owner's dithered tint. Re-baked when ownership or the
// season changes. Props: trees per region, mesas and the Rimewall, watermills, cottages, shrines and Meridian's clock.

const WN = E.noise2, WS = 4, WG = 256, CEN = 512;
const SECT = ['spring', 'summer', 'autumn', 'winter'];   // east, south, west, north (angles 0, 90, 180, 270)
class WorldMap {
  constructor() {
    this.map = new E.TileMap({ w: 64, h: 64, floorTex: (x, y) => this.tex(x, y), outside: '#1a3a6a', ao: 0 });
    this.castles = G.all('castle');
    this.raster(); this.season = 'spring'; this.owners = {}; this.sig = '';
    this.props = this._props();
  }
  /** angle in degrees 0..360 (0 east, 90 south) */
  static ang(x, y) { let a = Math.atan2(y - CEN, x - CEN) * 180 / Math.PI; if (a < 0) a += 360; return a; }
  /** the season sector weights at an angle: [primary, secondary, blend] */
  static sector(a) {
    const i = Math.round(a / 90) % 4, base = i * 90; let d = a - base; if (d > 180) d -= 360; if (d < -180) d += 360;
    const prim = SECT[i], other = SECT[(i + (d > 0 ? 1 : 3)) % 4], edge = Math.abs(d), blend = edge > 33 ? (edge - 33) / 24 : 0;
    return [prim, other, Math.min(.5, blend * .5)];
  }
  raster() {
    const N = WG, kind = new Uint8Array(N * N), cell = new Uint8Array(N * N), road = new Uint8Array(N * N), river = new Uint8Array(N * N);
    const coast = a => 470 + (WN(Math.cos(a / 57.3) * 2 + 9, Math.sin(a / 57.3) * 2 + 4) - .5) * 60;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = i * WS + 2, y = j * WS + 2, d = Math.hypot(x - CEN, y - CEN), a = WorldMap.ang(x, y), c = coast(a);
      const k = j * N + i;
      kind[k] = d > c + 6 ? 0 : d > c - 8 ? 1 : d < 170 ? 2 : 3;   // 0 sea, 1 beach, 2 hour plateau, 3 land
      let best = 0, bd = Infinity; this.castles.forEach((cs, ci) => { const dd = Math.hypot(cs.pos[0] - x, cs.pos[1] - y); if (dd < bd) { bd = dd; best = ci; } }); cell[k] = best;
    }
    // rivers: from the Rimewall and the plateau's edge to the sea
    const rivers = [[[470, 180], [430, 120], [380, 70], [330, 40]], [[650, 420], [760, 430], [860, 400], [990, 380]], [[560, 680], [600, 790], [650, 880], [700, 1000]], [[380, 600], [270, 620], [150, 640], [30, 680]]];
    this.riverPaths = rivers.map(pts => new E.Path(pts.map(p => [p[0], p[1], 0]), { smooth: 'catmull' }));
    for (const p of this.riverPaths) for (let s = 0; s <= p.length; s += 2) { const q = p.at(s), w = 4 + s / p.length * 5; this._stamp(river, q.x, q.y, w); }
    // roads: gently wavy, 5 units wide
    this.roadPaths = G.ROADS.map(([a, b]) => {
      const A = G.get('castle', a).pos, B = G.get('castle', b).pos, mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, nx = -(B[1] - A[1]), ny = B[0] - A[0], l = Math.hypot(nx, ny) || 1, w = (G.hashStr(a + b) % 21 - 10) * 1.5;
      return new E.Path([[A[0], A[1], 0], [mx + nx / l * w, my + ny / l * w, 0], [B[0], B[1], 0]], { smooth: 'catmull' });
    });
    for (const p of this.roadPaths) for (let s = 0; s <= p.length; s += 2) { const q = p.at(s); this._stamp(road, q.x, q.y, 3); }
    Object.assign(this, { kind, cell, road, river });
  }
  _stamp(arr, x, y, r) { const i0 = Math.floor((x - r) / WS), i1 = Math.floor((x + r) / WS), j0 = Math.floor((y - r) / WS), j1 = Math.floor((y + r) / WS); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (i >= 0 && j >= 0 && i < WG && j < WG && Math.hypot(i * WS + 2 - x, j * WS + 2 - y) <= r) arr[j * WG + i] = 1; }
  at(arr, x, y) { const i = Math.floor(x / WS), j = Math.floor(y / WS); return i < 0 || j < 0 || i >= WG || j >= WG ? 0 : arr[j * WG + i]; }
  /** the ground at a world point */
  tex(x, y) {
    const k = this.at(this.kind, x, y), n = WN(x * .03, y * .03) * .6 + WN(x * .11, y * .11) * .4, sp = WN(x * .9, y * .9);
    const sea = () => { const w = Math.sin(x * .12 + Math.sin(y * .07) * 2); return E.hex(w > .95 ? '#6aa8e0' : n > .5 ? '#1e4a8a' : '#24589a'); };
    if (k === 0) return sea();
    if (k === 1) return E.hex(this.season === 'winter' ? '#e0e8f0' : sp > .7 ? '#c8b080' : '#e0c890');
    if (this.at(this.river, x, y)) return E.hex(this.season === 'winter' ? (sp > .6 ? '#e8fcff' : '#a8e0f0') : sp > .75 ? '#6ab0e8' : '#3a7ac0');
    if (this.at(this.road, x, y)) return E.hex(k === 2 ? (sp > .6 ? '#9a9aa6' : '#7a7a86') : this.season === 'winter' ? '#c8c0b8' : sp > .6 ? '#c8a878' : '#a88a5a');
    let col;
    if (k === 2) col = E.tex.flagstone(x, y, { stones: ['#5a5a66', '#6a6a76', '#4e4e5a'].map(E.hex), mortar: E.hex('#2a2a36'), hi: E.hex('#8a8a96'), lo: E.hex('#3a3a46'), speck: E.hex('#d8c070') }, 12);
    else {
      const a = WorldMap.ang(x, y), [p1, p2, bl] = WorldMap.sector(a);
      const c1 = this._land(p1, x, y, n, sp), c2 = bl > 0 ? this._land(p2, x, y, n, sp) : c1;
      col = bl > 0 ? (WN(x * .2, y * .2) < bl ? c2 : c1) : c1;
    }
    // ownership: a dithered tint of the owner's colour over each castle's cell
    const ci = this.at(this.cell, x, y), owner = this.owners[this.castles[ci].id];
    if (owner && owner !== 'brigands' && ((Math.floor(x / 2) + Math.floor(y / 2)) & 1)) col = G.mixc(col, E.hex(G.get('realm', owner).color), owner === 'dominion' ? .18 : .22);
    // the season's overlay
    const s = this.season;
    if (s === 'winter' && k === 3) { const south = (y - CEN) / 470; if (sp > .35 + south * .45) col = G.mixc(col, [240, 246, 255], .75); }
    if (s === 'spring' && sp > .93) col = E.hex('#f4b8d0');
    if (s === 'autumn' && sp > .9) col = E.hex(sp > .95 ? '#e07a1e' : '#c84a1a');
    if (s === 'summer') col = G.mixc(col, [255, 220, 140], .06);
    return col;
  }
  _land(sector, x, y, n, sp) {
    switch (sector) {
      case 'winter': return E.hex(n > .68 ? '#3a6a5a' : n < .25 ? (sp > .5 ? '#a8d8f0' : '#90c8e8') : n > .55 ? '#8a9a98' : sp > .7 ? '#c8d8e0' : '#a8b8b8');
      case 'spring': return E.hex(n > .66 ? '#3e8a3a' : n < .28 ? '#7ac85a' : sp > .8 ? '#9ad86a' : '#5aae46');
      case 'summer': return E.hex(n > .7 ? '#c84a2a' : n < .3 ? '#e8d090' : sp > .75 ? '#d8b860' : '#c8a85a');
      case 'autumn': { const strip = Math.floor((x * .7 + y * .3) / 14) % 3; return E.hex(n > .68 ? '#6a4a20' : n < .28 ? '#5a6a3a' : strip === 0 ? '#c8902a' : strip === 1 ? '#a8783a' : '#b8883a'); }
    }
    return E.hex('#7a9a5a');
  }
  /** re-bake when owners or the season changed */
  update(sim, season) {
    const own = {}; for (const id of Object.keys(sim.s.castles)) own[id] = sim.s.castles[id].owner;
    const sig = season + JSON.stringify(own);
    if (sig === this.sig) return false;
    const seasonChanged = season !== this.season;
    this.sig = sig; this.owners = own; this.season = season; this.map.floors = {};
    if (seasonChanged) this.props = this._props();
    // water tags for the shimmer
    for (let ty = 0; ty < 64; ty++) for (let tx = 0; tx < 64; tx++) { const k = this.at(this.kind, tx * 16 + 8, ty * 16 + 8); this.map.setFloor(tx, ty, k === 0 ? 'water' : null, false); }
    return true;
  }
  _props() {
    const out = [], rnd = G.cosmetic(77), s = this.season;
    for (let i = 0; i < 900; i++) {
      const x = 40 + rnd() * 944, y = 40 + rnd() * 944, k = this.at(this.kind, x, y); if (k !== 3) continue;
      if (this.at(this.road, x, y) || this.at(this.river, x, y)) continue;
      if (this.castles.some(c => Math.hypot(c.pos[0] - x, c.pos[1] - y) < 34)) continue;
      const n = WN(x * .03, y * .03) * .6 + WN(x * .11, y * .11) * .4, [sec] = WorldMap.sector(WorldMap.ang(x, y));
      if (sec === 'winter') { if (n > .55) out.push({ shape: 'pine', x, y, params: { h: 24 + rnd() * 14, tiers: 4 }, mats: s === 'winter' || rnd() > .6 ? { l: '#d8e8f0 foliage' } : undefined }); else if (n < .2 && rnd() > .5) out.push({ shape: 'rock', x, y, params: { r: 6 + rnd() * 8, seed: i }, mats: { s: '#8a90a0 rock' } }); }
      else if (sec === 'spring') { if (n > .5) out.push({ shape: 'tree', x, y, params: { h: 22 + rnd() * 12, seed: i }, mats: { l: s === 'spring' && rnd() > .3 ? '#f4b8d0 foliage' : s === 'autumn' ? '#d8782a foliage' : s === 'winter' ? '#e8f0f8 foliage' : undefined } }); }
      else if (sec === 'summer') { if (n > .68) out.push({ shape: 'rock', x, y, params: { r: 8 + rnd() * 9, seed: i }, mats: { s: '#c84a2a rock' } }); else if (n > .45 && rnd() > .5) out.push({ prop: rnd() > .5 ? 'palm' : 'cactus', x, y, size: 1.3 }); }
      else if (sec === 'autumn') { if (n > .62) out.push({ shape: 'tree', x, y, params: { h: 24 + rnd() * 10, seed: i }, mats: { l: s === 'winter' ? '#e8f0f8 foliage' : s === 'spring' ? undefined : rnd() > .5 ? '#d8782a foliage' : '#c84a1e foliage' } }); else if (n < .3 && rnd() > .7) out.push({ shape: 'pumpkin', x, y }); }
    }
    // the Rimewall: rocks along the north
    for (let i = 0; i < 30; i++) { const a = (-160 + i * 4.6) * Math.PI / 180, r = 360 + (i % 3) * 18, x = CEN + Math.cos(a) * r, y = CEN + Math.sin(a) * r; if (this.castles.some(c => Math.hypot(c.pos[0] - x, c.pos[1] - y) < 60) || this.at(this.road, x, y)) continue; out.push({ shape: 'rock', x, y, params: { r: 10 + (i % 4) * 3, seed: i }, mats: { s: s === 'winter' ? '#e8f0f8 rock' : '#7a8090 rock' } }); }
    out.push({ shape: 'watermill', x: 860, y: 414, facing: Math.PI / 2 }, { shape: 'watermill', x: 160, y: 634 }, { shape: 'watermill', x: 610, y: 818 });
    for (const [x, y] of [[700, 300], [330, 300], [330, 720], [700, 720]]) out.push({ shape: 'shrine', x, y });
    for (const [x, y] of [[860, 560], [160, 470], [470, 860], [560, 160], [880, 600], [140, 560]]) out.push({ shape: 'cottage', x, y, facing: Math.PI / 2 });
    out.push({ shape: 'clocktower', x: CEN, y: CEN - 34, clock: true });
    return out.sort((a, b) => a.y - b.y);
  }
  draw(r, t) {
    this.map.drawFloor(r);
    for (const p of this.props) {
      if (!r.visible(p.x, p.y, 0, 90, 220, 40)) continue;
      if (p.prop) r.prop(p.prop, p.x, p.y, 0, { size: p.size }); else r.shape(p.shape, p.x, p.y, 0, { params: p.params, mats: p.mats, facing: p.facing });
      if (p.clock) {
        // the working clock face of the Calendar City
        r.queue(p.x, p.y + 13, 58, g => { const q = r.w(p.x, p.y + 13, 58), now = t; E.px.disc(g, q[0], q[1], 7, '#f0e8d8'); E.px.line(g, q[0], q[1], q[0] + Math.cos(now * .6 - 1.57) * 5, q[1] + Math.sin(now * .6 - 1.57) * 5, '#14121c', 1); E.px.line(g, q[0], q[1], q[0] + Math.cos(now * .05) * 3, q[1] + Math.sin(now * .05) * 3, '#c83a2a', 1); }, { bias: 40 });
        G.game.lights.add(p.x, p.y + 10, 60, 90, .8, { color: '#ffe0a0' });
      }
    }
  }
}
G.WorldMap = WorldMap;
