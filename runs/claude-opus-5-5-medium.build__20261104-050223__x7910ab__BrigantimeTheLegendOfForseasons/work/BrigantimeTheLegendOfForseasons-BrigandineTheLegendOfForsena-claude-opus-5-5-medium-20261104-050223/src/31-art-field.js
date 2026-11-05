/* ---- THE HEX BATTLEFIELD: a wall-less TileMap whose floorTex bakes each hex's terrain for the season and region,
 * hex edges darkened, props per terrain (trees, rocks, reeds, ruins), raised blocks as shapes, the Keep tower ---- */
const OFF = 40;   // world offset of hex (0,0)'s origin: room for the margin
G.OFF = OFF;
G.hexWorld = c => { const [x, y] = G.hex.center(c); return [x + OFF, y + OFF]; };
G.worldHex = (x, y) => G.hex.toCell(x - OFF, y - OFF);
const n2 = (x, y) => E.noise2(x, y), h2 = (x, y) => E.hash2(x | 0, y | 0);
class HexField {
  constructor(sim, o = {}) { this.sim = sim; this.region = G.REGION_DRESS[o.region] || o.region || 'spring'; this.o = o; this.build(); }
  build() {
    const S = this.sim.state, W = Math.ceil(((S.w + 1) * G.T + OFF * 2) / 16), Hh = Math.ceil((S.h * G.T * .866 + G.T + OFF * 2) / 16);
    const rows = []; for (let y = 0; y < Hh; y++) rows.push('.'.repeat(W));
    this.map = new E.TileMap({ rows, legend: { '.': 0 }, ao: 0, outside: '#1a1a20', floorTex: (x, y) => this.tex(x, y) });
    this.bw = W * 16; this.bh = Hh * 16;
    this.cells = S.cells.slice(); this.season = S.season; this.grid = G.settings ? G.settings.grid : 'Subtle';
    this.tagWater();
  }
  tagWater() { const S = this.sim.state; for (let i = 0; i < S.cells.length; i++) { const t = G.get('terrain', S.cells[i]); if (t.water && !t.ice) { const [x, y] = G.hexWorld([i % S.w, Math.floor(i / S.w)]); try { this.map.setFloor(Math.floor(x / 16), Math.floor(y / 16), 'water', false); } catch (e) { /* off the map */ } } } }
  refresh() { const S = this.sim.state; if (S.season !== this.season || S.cells.join() !== this.cells.join() || this.grid !== (G.settings && G.settings.grid)) { this.cells = S.cells.slice(); this.season = S.season; this.grid = G.settings && G.settings.grid; this.map.floors = {}; } }
  pal() { return G.PAL[this.sim.state.season] || G.PAL.spring; }
  tex(x, y) {
    const S = this.sim.state, c = G.worldHex(x, y), P = this.pal(), dress = G.PAL[this.region] || P;
    const inside = c[0] >= 0 && c[1] >= 0 && c[0] < S.w && c[1] < S.h;
    const nz = n2(x / 9, y / 9), sp = h2(x, y);
    let col;
    if (!inside) { const b = MIXC(dress.grass, P.grass, .5); col = MIXC(b, [20, 20, 26], .45 + nz * .1); return col; }
    const code = S.cells[c[1] * S.w + c[0]], season = S.season, hour = G.get('map', S.spec.map).hour;
    const grass = () => { let b = MIXC(MIXC(dress.grass, P.grass, .6), P.grass2, nz * .5); if (sp > .93) b = MIXC(b, P.dark, .5); if (sp < .02 && season === 'spring') b = P.blossom; if (season === 'autumn' && sp > .985) b = H('#c84a1a'); return b; };
    switch (code) {
      case '.': col = hour ? MIXC(H('#5a5866'), H('#6a6878'), nz) : grass(); break;
      case ',': col = MIXC(P.dirt, H('#c8a878'), nz * .4); if (sp > .9) col = MIXC(col, [60, 40, 30], .3); if (season === 'winter') col = MIXC(col, [235, 240, 248], .45); break;
      case 'f': col = MIXC(grass(), P.dark, .45 + nz * .2); break;
      case 'h': { const [cx, cy] = G.hexWorld(c), d = Math.hypot(x - cx, y - cy) / 14; col = MIXC(grass(), d < .6 ? [255, 250, 220] : P.dark, d < .6 ? .15 : .25); break; }
      case 'm': col = MIXC(H('#7a7074'), H('#9a9094'), nz); if (season === 'winter' && nz > .5) col = H('#e8f0f8'); break;
      case '~': col = MIXC(P.water, [160, 210, 230], .35 + Math.sin((x + y) / 3) * .05); break;
      case 'w': case 'L': col = MIXC(P.water, [20, 40, 80], .3 + nz * .15); if (Math.sin(x / 2.5 + nz * 6) > .92) col = MIXC(col, [255, 255, 255], .35); break;
      case 's': col = MIXC(H('#5a6a3a'), H('#3a4a2a'), nz); if (sp > .9) col = H('#4a7a8a'); break;
      case 'F': { const st = Math.sin((x + y * .3) / 1.6) > 0; col = season === 'summer' ? (st ? H('#e8c860') : H('#c8a040')) : season === 'autumn' ? (st ? H('#b89050') : H('#8a6a3a')) : season === 'winter' ? H('#e8eef4') : (st ? H('#8ad060') : H('#6ab048')); break; }
      case 'r': col = MIXC(H('#9a948a'), H('#7a746a'), nz); if ((Math.floor(x / 5) + Math.floor(y / 4)) % 2 && sp > .3) col = MIXC(col, [60, 56, 50], .3); break;
      case '#': col = H('#6a645a'); break;
      case 'g': col = (Math.floor(x / 6) + Math.floor(y / 6)) % 2 ? MIXC(H('#9a948c'), H('#8a847c'), nz) : MIXC(H('#a8a298'), H('#968e84'), nz); if (hour) col = MIXC(col, H('#4a4658'), .5); break;
      case 'b': col = Math.floor(y / 3) % 2 ? H('#8a6a4a') : H('#7a5a3a'); break;
      case 'K': { const [cx, cy] = G.hexWorld(c), d = Math.hypot(x - cx, y - cy); col = d > 9 && d < 11 ? H('#d8c070') : MIXC(H('#a8a098'), H('#8a8478'), nz); break; }
      case 'D': { const [cx, cy] = G.hexWorld(c), d = Math.hypot(x - cx, y - cy), lit = S.dials[c[1] * S.w + c[0]]; col = d < 9 ? (lit ? H(G.SEASON_COLOR[['winter', 'spring', 'summer', 'autumn'][(c[0] + c[1]) % 4]]) : H('#8a7a4a')) : H('#5a5468'); if (d > 4 && d < 5) col = H('#f0e0a0'); break; }
      case 'snow': col = MIXC(H('#e8f0f8'), H('#ffffff'), nz); if (sp > .95) col = H('#b8c8e0'); break;
      case 'ice': col = MIXC(H('#a8e0f0'), H('#d8f4ff'), nz); if (Math.abs(Math.sin(x / 4 + y / 7)) < .04) col = H('#6ab0d0'); break;
      case 'fire': col = MIXC(H('#c83a1a'), H('#ffa020'), nz); break;
      case 'ash': col = MIXC(H('#4a4446'), H('#6a6466'), nz); break;
      default: col = grass();
    }
    // the hex edges
    const gl = G.settings ? G.settings.grid : 'Subtle';
    if (gl !== 'Off') { const ed = G.hex.edgeDist(x - OFF, y - OFF); if (ed < .9) col = MIXC(col, [10, 8, 16], gl === 'Bold' ? .3 : .14); }
    return col;
  }
  // props per hex: seeded by position, recoloured by season
  drawProps(r) {
    const S = this.sim.state, season = S.season, m = G.get('map', S.spec.map);
    for (let i = 0; i < S.cells.length; i++) {
      const c = [i % S.w, Math.floor(i / S.w)], code = S.cells[i], [x, y] = G.hexWorld(c), hh = (k) => E.hash2(c[0] * 7 + k, c[1] * 13 + k);
      if (code === 'f') {
        const n = 2 + (hh(1) > .5 ? 1 : 0);
        for (let k = 0; k < n; k++) { const ox = (hh(k + 2) - .5) * 14, oy = (hh(k + 5) - .5) * 12, pine = season === 'winter' || this.region === 'winter' || hh(k + 9) > .7;
          r.prop(pine ? 'pine' : 'tree', x + ox, y + oy, 0, { size: .8 + hh(k + 3) * .25, color: season === 'autumn' && !pine ? (hh(k) > .5 ? '#d86a20' : '#e0a030') : season === 'spring' && !pine && hh(k) > .6 ? '#f4b8d0' : season === 'winter' ? '#e8f0f8' : undefined }); }
      } else if (code === 'm') { r.shape('bt-cliff', x, y, 0, { scale: .7 + hh(1) * .2, facing: hh(2) * 6 }); }
      else if (code === 'r') { if (hh(1) > .4) r.prop('pillar', x + (hh(2) - .5) * 10, y + (hh(3) - .5) * 8, 0, { broken: true, size: .7 }); else r.prop('rock', x, y, 0, { size: .7 }); }
      else if (code === 's') { for (let k = 0; k < 2; k++) r.prop('grass', x + (hh(k) - .5) * 14, y + (hh(k + 4) - .5) * 10, 0, { size: .8, color: '#6a7a3a' }); }
      else if (code === 'F' && season !== 'winter') { for (let k = 0; k < 2; k++) r.prop('grass', x + (hh(k) - .5) * 14, y + (hh(k + 4) - .5) * 10, 0, { size: .9, color: season === 'summer' ? '#e8c860' : season === 'autumn' ? '#a08040' : '#7ac050' }); }
      else if (code === 'h' && hh(1) > .6) r.prop('rock', x + (hh(2) - .5) * 12, y + (hh(3) - .5) * 10, 0, { size: .5 });
      else if (code === '#') r.shape(m.blockShape === 'gear' ? 'bt-gear' : m.blockShape === 'cottage' ? 'bt-cottage' : m.blockShape === 'cliff' ? 'bt-cliff' : 'bt-hexblock', x, y, 0, { scale: m.blockShape === 'cottage' ? .9 : 1, facing: m.blockShape === 'cottage' ? Math.PI / 2 : 0 });
      else if (code === 'K') { r.shape('bt-keep', x, y - 8, 0, { scale: .7 }); r.prop('torch', x - 10, y + 2, 0, { light: true, size: .8 }); }
      else if (code === 'fire') { if (Math.floor(r.t * 10 + i) % 3 === 0) G.game.particles.fire(x + (Math.random() - .5) * 12, y + (Math.random() - .5) * 10, 2, 1, { size: .6 }); G.game.lights.add(x, y, 6, 30, .6, { color: '#ff8030' }); }
      else if (code === 'D') { const lit = S.dials[i]; if (lit) G.game.lights.add(x, y, 4, 34, .9, { color: G.SEASON_COLOR[['winter', 'spring', 'summer', 'autumn'][(c[0] + c[1]) % 4]] }); }
    }
  }
}
G.HexField = HexField;

/* ---- THE WORLD MAP: Forseason as a 64 × 64-tile TileMap (1024 × 1024 units) in the three-quarter view ---- */
class WorldMap {
  constructor(sim) { this.sim = sim; this.season = null; this.owners = ''; const rows = []; for (let y = 0; y < 64; y++) rows.push('.'.repeat(64)); this.map = new E.TileMap({ rows, legend: { '.': 0 }, ao: 0, outside: '#1a3a68', floorTex: (x, y) => this.tex(x, y) }); this.roadPts = G.ROADS.map(([a, b]) => this.roadPath(a, b)); this.precompute(); this.tagSea(); }
  precompute() {
    const M = this.road = new Uint8Array(1024 * 1024);
    for (const p of this.roadPts) for (let i = 0; i < p.length - 1; i++) { const [ax, ay] = p[i], [bx, by] = p[i + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay)); for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n; for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.hypot(dx, dy); if (d > 3.3) continue; const X = Math.round(x + dx), Y = Math.round(y + dy); if (X < 0 || Y < 0 || X > 1023 || Y > 1023) continue; const v = d > 2.4 ? 1 : 2; if (M[Y * 1024 + X] < v) M[Y * 1024 + X] = v; } } }
    const cs = G.all('castle'); this.castleList = cs; this.near = new Uint8Array(128 * 128); this.nearD = new Float32Array(128 * 128);
    for (let gy = 0; gy < 128; gy++) for (let gx = 0; gx < 128; gx++) { let bi = 0, bd = 1e9; cs.forEach((c, i) => { const d = Math.hypot(gx * 8 + 4 - c.pos[0], gy * 8 + 4 - c.pos[1]); if (d < bd) { bd = d; bi = i; } }); this.near[gy * 128 + gx] = bi; this.nearD[gy * 128 + gx] = bd; }
  }
  tagSea() { for (let cy = 0; cy < 64; cy++) for (let cx = 0; cx < 64; cx++) { const x = cx * 16 + 8, y = cy * 16 + 8; if (this.coast(x, y) > 0) this.map.setFloor(cx, cy, 'water', false); } }
  coast(x, y) { const dx = x - 512, dy = y - 512, a = Math.atan2(dy, dx), R = 470 + Math.sin(a * 5) * 14 + Math.sin(a * 11 + 1) * 9 + (n2(Math.cos(a) * 3 + 9, Math.sin(a) * 3) - .5) * 30; return Math.hypot(dx, dy) - R; }
  roadPath(a, b) { const A = G.get('castle', a).pos, B = G.get('castle', b).pos, pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12, w = Math.sin(t * Math.PI) * 10 * (n2(A[0] / 50 + B[1] / 70, t) - .5); pts.push([A[0] + (B[0] - A[0]) * t - (B[1] - A[1]) / Math.hypot(B[0] - A[0], B[1] - A[1]) * w, A[1] + (B[1] - A[1]) * t + (B[0] - A[0]) / Math.hypot(B[0] - A[0], B[1] - A[1]) * w]); } return pts; }
  sector(x, y) { const a = Math.atan2(y - 512, x - 512) * 180 / Math.PI; return a; }   // -180..180, 0 east
  regionAt(x, y) {
    const d = Math.hypot(x - 512, y - 512); if (d < 175) return ['hour', null, 0];
    const a = this.sector(x, y), base = a >= -135 && a < -45 ? 'winter' : a >= -45 && a < 45 ? 'spring' : a >= 45 && a < 135 ? 'summer' : 'autumn';
    for (const [ang, s1, s2] of [[-45, 'winter', 'spring'], [45, 'spring', 'summer'], [135, 'summer', 'autumn'], [-135, 'autumn', 'winter']]) { let dd = a - ang; if (dd > 180) dd -= 360; if (dd < -180) dd += 360; if (Math.abs(dd) < 12) return [s1, s2, (dd + 12) / 24]; }
    return [base, null, 0];
  }
  landCol(reg, x, y) {
    const P = G.PAL[reg], nz = n2(x / 40, y / 40), fine = n2(x / 7, y / 7), sp = h2(x, y), season = this.sim.season();
    let c;
    if (reg === 'winter') { c = nz > .62 ? MIXC(H('#2a5a4a'), H('#3a6a5a'), fine) : nz < .25 ? MIXC(H('#a8d8ec'), H('#c8e8f8'), fine) : MIXC(H('#e8f0f8'), H('#c8d8e8'), fine * .6); if (this.coast(x, y) > -60 && Math.hypot(x - 512, y - 512) > 380 && nz > .5) c = MIXC(H('#8a8a96'), H('#b8b8c8'), fine); }
    else if (reg === 'spring') { c = nz > .65 ? MIXC(H('#3f8a35'), H('#5aa048'), fine) : nz < .22 ? MIXC(H('#4a9ad8'), H('#6ab0e0'), fine) : MIXC(P.grass, P.grass2, fine); if (nz > .55 && nz < .65 && sp > .8) c = P.blossom; }
    else if (reg === 'summer') { c = nz > .66 ? MIXC(H('#c84a2a'), H('#a83a20'), fine) : nz < .25 ? MIXC(H('#e8d8a0'), H('#f0e0b0'), fine) : MIXC(H('#c8b060'), H('#d8c070'), fine); if (sp > .985) c = H('#4a8a3a'); }
    else if (reg === 'autumn') { c = nz > .64 ? MIXC(H('#8a4a1a'), H('#a86a2a'), fine) : nz < .25 ? MIXC(H('#5a6a3a'), H('#4a5a3a'), fine) : (Math.floor((x + y * .4) / 10) % 2 ? H('#c89040') : H('#b07a30')); if (sp > .99) c = H('#f08020'); }
    else { c = (Math.floor(x / 10) + Math.floor(y / 10)) % 2 ? MIXC(H('#5a5868'), H('#4a4858'), fine) : MIXC(H('#6a6878'), H('#5a5868'), fine); }
    // the season tints everything
    if (season === 'winter' && reg !== 'winter' && h2(x * 3, y) > (reg === 'summer' ? .85 : .55)) c = MIXC(c, [240, 245, 250], .7);
    if (season === 'spring' && reg !== 'hour' && h2(x, y * 3) > .985) c = H('#f4b8d0');
    if (season === 'autumn' && reg !== 'hour' && h2(x * 5, y) > .98) c = H('#d86a20');
    if (season === 'summer') c = MIXC(c, [255, 230, 160], .08);
    return c;
  }
  tex(x, y) {
    const co = this.coast(x, y);
    if (co > 8) { const d = Math.min(1, co / 80), wv = Math.sin(x / 9 + n2(x / 30, y / 30) * 6) > .9 ? .2 : 0; return MIXC(MIXC(H('#3a7ab8'), H('#1a3a68'), d), [255, 255, 255], wv); }
    if (co > 0) return MIXC(H('#e8d8a8'), H('#d8c890'), n2(x / 5, y / 5));
    const [r1, r2, t] = this.regionAt(x, y); let c = this.landCol(r1, x, y); if (r2) c = MIXC(c, this.landCol(r2, x, y), t);
    // roads
    const X = Math.max(0, Math.min(1023, x | 0)), Y = Math.max(0, Math.min(1023, y | 0)), rv = this.road[Y * 1024 + X];
    if (rv) return MIXC(H(r1 === 'hour' ? '#8a8478' : '#a08058'), [60, 40, 30], rv === 1 ? .35 : n2(x / 3, y / 3) * .2);
    // ownership: a dithered tint of the owner's colour over each castle's cell
    const gi = (Math.min(127, Y >> 3)) * 128 + Math.min(127, X >> 3), best = this.castleList[this.near[gi]];
    if (this.nearD[gi] < 120 && ((x >> 1) + (y >> 1)) % 3 === 0) { const ow = this.sim.owner(best.id); c = MIXC(c, H(G.realmColor(ow)), .35); }
    return c;
  }
  refresh() { const own = Object.values(this.sim.state.castles).map(c => c.owner).join(), s = this.sim.season(); if (own !== this.owners || s !== this.season) { this.owners = own; this.season = s; this.map.floors = {}; } }
  shapeFor(c) { const reg = G.get('castle', c).region, own = this.sim.owner(c); if (own === 'brigands') return 'bt-castle-brigand'; if (c === 'meridian') return 'bt-clocktower'; return 'bt-castle-' + (G.REGION_DRESS[reg] || 'spring'); }
  drawProps(r) {
    // trees and mesas by region, scattered on a seeded grid
    for (let gy = 0; gy < 1024; gy += 44) for (let gx = 0; gx < 1024; gx += 44) {
      const x = gx + h2(gx, gy * 3) * 30, y = gy + h2(gx * 5, gy) * 30; if (this.coast(x, y) > -10 || Math.hypot(x - 512, y - 512) < 190) continue;
      if (G.all('castle').some(c => Math.hypot(c.pos[0] - x, c.pos[1] - y) < 40)) continue;
      const reg = this.regionAt(x, y)[0], k = h2(gx * 7, gy * 11), season = this.sim.season();
      if (k < .35) continue;
      if (reg === 'winter') r.prop('pine', x, y, 0, { size: 1, color: season === 'winter' || k > .8 ? '#e8f0f8' : undefined });
      else if (reg === 'spring') r.prop(k > .75 ? 'flowers' : 'tree', x, y, 0, { size: 1, color: k > .6 && k < .75 ? '#f4b8d0' : undefined });
      else if (reg === 'summer') r.prop(k > .8 ? 'cactus' : k > .6 ? 'palm' : 'rock', x, y, 0, { size: .9, color: k <= .6 ? '#c84a2a' : undefined });
      else r.prop(k > .8 ? 'mushroom' : 'tree', x, y, 0, { size: 1, color: k > .55 ? '#d86a20' : '#c8a030' });
    }
    r.shape('bt-mill', 300, 610, 0, { scale: 1.2 }); r.shape('bt-mill', 760, 720, 0, { scale: 1.1 }); r.shape('bt-cottage', 840, 420, 0, { scale: 1 }); r.shape('bt-cottage', 600, 860, 0);
  }
}
G.WorldMap = WorldMap;
