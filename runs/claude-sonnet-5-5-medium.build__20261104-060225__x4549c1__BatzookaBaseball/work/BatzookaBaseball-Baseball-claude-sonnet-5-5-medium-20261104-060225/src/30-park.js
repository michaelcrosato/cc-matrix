/* BATZOOKA BASEBALL: the ballpark. A park def becomes a TileMap: the floor is painted from the park's geometry
   (mown stripes, infield dirt, basepaths, chalk, warning track), walls are the fence, the foul walls and the stands. */
const COLS = 112, ROWS = 84, T16 = 16;
BZ.parkCache = {};
function parkInside(x, y, park) {
  const r = hyp(x, y);
  if (r <= 112) return true;
  if (y >= -4) return false;
  const th = thetaOf(x, y), R = BZ.fenceR(clamp(th, -PI / 4, PI / 4), park);
  return r <= R && Math.abs(x) <= -y + 99;
}
BZ.buildPark = (park) => {
  const key = park.id + ':' + TUNE.fence.toFixed(2);
  if (BZ.parkCache[key]) return BZ.parkCache[key];
  const HX = G.HX, HY = G.HY, inside = [], rows = [];
  for (let cy = 0; cy < ROWS; cy++) { const row = []; for (let cx = 0; cx < COLS; cx++) row.push(parkInside(cx * T16 + 8 - HX, cy * T16 + 8 - HY, park)); inside.push(row); }
  // distance from the playing area, up to 5 tiles
  const dist = inside.map(r => r.map(v => v ? 0 : 99));
  let frontier = []; for (let cy = 0; cy < ROWS; cy++) for (let cx = 0; cx < COLS; cx++) if (inside[cy][cx]) frontier.push([cx, cy]);
  for (let d = 1; d <= 5; d++) { const nf = []; for (const [cx, cy] of frontier) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue; if (dist[ny][nx] > d) { dist[ny][nx] = d; nf.push([nx, ny]); } } frontier = nf; }
  const megaRange = [-32 * PI / 180, 8 * PI / 180];
  for (let cy = 0; cy < ROWS; cy++) {
    let s = '';
    for (let cx = 0; cx < COLS; cx++) {
      const d = dist[cy][cx];
      if (d === 0) s += '.';
      else if (d > 5) s += 'o';
      else if (d === 1) {
        const x = cx * T16 + 8 - HX, y = cy * T16 + 8 - HY, th = thetaOf(x, y), r = hyp(x, y);
        if (y < -40 && r > BZ.fenceR(clamp(th, -PI / 4, PI / 4), park) - 18 && Math.abs(th) < PI / 4 + .12) s += (park.megaWall && th > megaRange[0] && th < megaRange[1]) ? 'M' : 'F';
        else s += 'B';
      } else s += String(d);
    }
    rows.push(s);
  }
  const rgb = a => a.map(v => v), jit = (x, y, k) => (E.hash2(Math.floor(x / 2), Math.floor(y / 2)) - .5) * k;
  const G0 = park.grass[0], G1 = park.grass[1];
  const floorTex = (wx, wy, tag) => {
    const x = wx - HX, y = wy - HY, n = jit(wx, wy, 14), m = (E.noise2(wx * .05, wy * .05) - .5) * 16;
    if (tag === 'o') { const o = park.outside; const row = park.hazard === 'corn' && (Math.floor(wx / 12) % 2 === 0) ? -14 : 0; return [o[0] + n + row, o[1] + n * 1.2 + m * .5 + row, o[2] + n]; }
    const r = hyp(x, y), th = thetaOf(x, y), R = BZ.fenceR(clamp(th, -PI / 4, PI / 4), park);
    const chalk = () => { const w = 228 + n; return [w, w, w - 6]; };
    // foul lines
    if (y < 0 && r < R + 4 && Math.abs(Math.abs(x) + y) < 1.6) return chalk();
    // batter's boxes and catcher's box
    const bx = Math.abs(x);
    if (y > -22 && y < 16 && bx > 5 && bx < 31 && (Math.abs(bx - 5) < 1 || Math.abs(bx - 31) < 1 || Math.abs(y + 22) < 1 || Math.abs(y - 16) < 1)) return chalk();
    // home dirt circle and plate
    if (r < 42) { const w = park.dirt; return [w[0] + n, w[1] + n, w[2] + n]; }
    // mound
    const dm = hyp(x, y + 200);
    if (dm < 24) { const w = park.dirt; return [w[0] + 10 + n, w[1] + 10 + n, w[2] + 10 + n]; }
    // grass diamond inset, basepath strips
    const dd = Math.abs(x) + Math.abs(y + 212);
    const ip = dd <= 190 && y > -440 && y < -20;
    const path = dd > 186 && dd <= 218 && y > -440 && y <= 4;
    const dirtArea = hyp(x, y + 205) <= 262 && y > -470 && y < 70 && !ip;
    const trackBand = y < 0 && r > R - 46 && r <= R + 2 && Math.abs(x) <= -y + 99;
    if (path || dirtArea) { const w = park.dirt, k = (path ? 4 : 0) + n + m * .3; return [w[0] + k, w[1] + k, w[2] + k]; }
    if (trackBand) { const w = park.track; return [w[0] + n, w[1] + n, w[2] + n]; }
    if (r > R + 2 && y < 0) { const w = park.track; return [w[0] * .8, w[1] * .8, w[2] * .8]; }
    // mowing pattern
    const band = (Math.floor(r / 34) + (park.hazard === 'moon' ? Math.floor((th + 3) * 12) : 0)) % 2 ? G0 : G1;
    const foul = Math.abs(th) > PI / 4 || y > -4;
    const sh = foul ? .9 : 1;
    return [(band[0] + n + m) * sh, (band[1] + n * 1.1 + m) * sh, (band[2] + n) * sh];
  };
  const stand = park.stand;
  const mk = (h, top, side, face) => ({ h, top, side, face, cut: true, cutH: 8, line: 'rgba(0,0,0,.25)' });
  const types = {
    F: { h: park.fenceH + 6, top: park.wallTop, side: park.wallSide, face: stand[0] === 'rock' ? 'rock' : 'plank', roof: 'plain', cut: true, cutH: 10 },
    M: { h: 96, top: '#f2d86a', side: '#303848', face: 'plank', roof: 'plain', cut: true, cutH: 10 },
    B: { h: 30, top: '#c8c8d0', side: '#505870', face: 'plank', roof: 'plain', cut: true, cutH: 8 },
    2: mk(44, stand[2], stand[1], stand[0]), 3: mk(54, stand[2], stand[1], stand[0]), 4: mk(64, stand[2], stand[1], stand[0]), 5: mk(74, stand[2], stand[1], stand[0])
  };
  const map = new E.TileMap({ rows, legend: { '.': { floor: 'f' }, o: { floor: 'o' }, F: 'F', M: 'M', B: 'B', 2: 2, 3: 3, 4: 4, 5: 5 }, types, floorTex, outside: '#' + park.outside.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join(''), ao: 3 });
  // stand cells for the crowd
  const crowd = [];
  for (let cy = 0; cy < ROWS; cy++) for (let cx = 0; cx < COLS; cx++) {
    const d = dist[cy][cx]; if (d < 2 || d > 5) continue;
    const h = types[d].h, hs = E.hash2(cx * 7, cy * 13);
    for (let k = 0; k < 2; k++) crowd.push({ x: cx * T16 + 4 + k * 8 + (hs * 3), y: cy * T16 + 9, z: h, tier: d, col: Math.floor(E.hash2(cx + k * 31, cy * 3) * 4), seed: E.hash2(cx * 3 + k, cy * 5) });
  }
  const o = { map, crowd, dist, key, park };
  BZ.parkCache[key] = o; return o;
};
BZ.rebuildPark = () => { BZ.parkCache = {}; };

/* ---- drawing helpers that work in the park's world coordinates ---- */
const W = (x, y) => [G.HX + x, G.HY + y];
BZ.W = W;
function queuePoly(r, x, y, z, pts, color, shadeCol) {
  r.queue(G.HX + x, G.HY + y, z, g => { const P = pts.map(p => { const w = r.w(G.HX + p[0], G.HY + p[1], p[2] || z); return [w[0], w[1]]; }); px.poly(g, P, color); if (shadeCol) { for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; px.line(g, a[0], a[1], b[0], b[1], shadeCol, 1); } } }, { bias: -2 });
}
BZ.drawField = (r, M, P) => {
  const park = M.parkDef;
  // bases, plate, rubber
  const base = (x, y) => queuePoly(r, x, y, 1, [[x - 7, y, 1], [x, y - 7, 1], [x + 7, y, 1], [x, y + 7, 1]], '#f4f4ec', '#9a9a90');
  for (let i = 1; i <= 3; i++) base(BASES[i][0] * (i === 2 ? 1 : (BASES[i][0] > 0 ? .965 : .965)), BASES[i][1] + (i === 2 ? 3 : 0));
  queuePoly(r, 0, 0, 1, [[-6, 4, 1], [6, 4, 1], [6, -1, 1], [0, -6, 1], [-6, -1, 1]], '#ffffff', '#a0a098');
  queuePoly(r, 0, -205, 1, [[-8, -207, 1], [8, -207, 1], [8, -203, 1], [-8, -203, 1]], '#f4f4ec', '#9a9a90');
  // the mound rises a little
  r.queue(G.HX, G.HY - 200, 0, g => { const c = r.w(G.HX, G.HY - 200, 3); px.ell(g, c[0], c[1], 17, 7, ((park.dirt) ? 'rgb(' + (park.dirt[0] + 14) + ',' + (park.dirt[1] + 14) + ',' + (park.dirt[2] + 12) + ')' : '#c8a070')); }, { bias: -3 });
  // foul poles
  for (const s of [-1, 1]) {
    const R = BZ.fenceR(s * PI / 4, park), px0 = s * R * Math.SQRT1_2, py0 = -R * Math.SQRT1_2;
    r.queue(G.HX + px0, G.HY + py0, 0, g => { const a = r.w(G.HX + px0, G.HY + py0, 0), b = r.w(G.HX + px0, G.HY + py0, 150); px.line(g, a[0], a[1], b[0], b[1], '#ffd23a', 2); px.rect(g, b[0] - 1, b[1] - 1, 3, 3, '#fff6a0'); }, { bias: 1 });
  }
  // hazards
  for (const h of M.hazards) {
    if (h.kind === 'geyser') {
      const lit = h.state === 'warn' ? .5 + .5 * Math.sin(M.clock * 24) : h.state === 'blast' ? 1 : 0;
      r.queue(G.HX + h.x, G.HY + h.y, 0, g => {
        const c = r.w(G.HX + h.x, G.HY + h.y, 0); px.ell(g, c[0], c[1], 10, 5, h.state === 'idle' ? '#3a1810' : (lit > .6 ? '#ffd040' : '#ff6020'));
        if (h.state === 'blast') { const top = r.w(G.HX + h.x, G.HY + h.y, 70 * Math.min(1, (.7 - h.t) * 6)); for (let i = 0; i < 5; i++) px.line(g, c[0] + (i - 2) * 2, c[1], top[0] + (i - 2) * 3 + Math.sin(M.clock * 30 + i) * 2, top[1], i % 2 ? '#ffd040' : '#ff5020', 2); }
      }, { bias: -1, emissive: h.state !== 'idle' });
    } else if (h.kind === 'corn') {
      for (let i = 0; i < 26; i++) { const ax = h.x + ((i * 53) % 130) - 65, ay = h.y + ((i * 37) % 110) - 55; if (hyp(ax - h.x, ay - h.y) > h.r) continue; r.prop('tree', G.HX + ax, G.HY + ay, 0, { size: .5, color: '#d8c040' }); }
    } else if (h.kind === 'crater') {
      r.queue(G.HX + h.x, G.HY + h.y, 0, g => { const c = r.w(G.HX + h.x, G.HY + h.y, 0); px.ell(g, c[0], c[1], h.r * .8, h.r * .4, '#50507c'); px.ell(g, c[0] + 1, c[1] + 1, h.r * .6, h.r * .28, '#34345a'); }, { bias: -3 });
    }
  }
};
/* the big scoreboard, jumbotron and banners above the center-field stands */
BZ.drawScenery = (r, M) => {
  const park = M.parkDef, R = BZ.fenceR(0, park), cx = G.HX, cy = G.HY - R - 96;
  r.queue(cx, cy, 20, g => {
    r.box(g, cx - 56, cy - 4, 80, cx + 56, cy + 4, 130, '#202636', '#10141e');
    const a = r.w(cx - 50, cy + 5, 124), b = r.w(cx + 50, cy + 5, 88);
    px.rect(g, a[0], a[1], b[0] - a[0], b[1] - a[1], '#101a30');
    const fw = Math.max(2, (b[0] - a[0]) / 14);
    E.font.text(g, M.score[0] + '  ' + M.score[1], (a[0] + b[0]) / 2, a[1] + 2, '#ffe070', { align: 'center', outline: false });
  }, { bias: 3 });
  // light towers
  for (const s of [-1, 1]) for (const k of [.55, 1]) {
    const lx = G.HX + s * (R * .7 * k + 40), ly = G.HY - R * .62 * k - 70;
    if (park.lights || true) r.prop('streetlamp', lx, ly, 0, { size: 2.6, light: park.lights });
  }
  // banners on the wall
  for (let i = -4; i <= 4; i++) { const th = i * .16, rr_ = BZ.fenceR(th, park) + 2; if (Math.abs(th) < PI / 4 - .1) r.prop('banner', G.HX + Math.sin(th) * rr_, G.HY - Math.cos(th) * rr_, BZ.fenceH(th, park) - 8, { size: .55, color: i % 2 ? M.sides[0].team.chip : M.sides[1].team.chip }); }
};
BZ.drawCrowd = (r, M, hype) => {
  const P = BZ.parkCache[Object.keys(BZ.parkCache).find(k => k.startsWith(M.parkDef.id + ':'))]; if (!P) return;
  const cols = M.parkDef.crowd, t = M.clock;
  for (const f of P.crowd) {
    if (!r.visible(f.x, f.y, f.z)) continue;
    const bob = Math.sin(t * (3 + f.seed * 3) + f.seed * 30) * (1 + hype * 2.4) * (hype > .5 ? 1 : .35), up = hype > .6 && Math.sin(t * 5 + f.seed * 20) > .5;
    r.queue(f.x, f.y, f.z + 3, g => {
      const w = r.w(f.x, f.y, f.z + Math.max(0, bob)); const c = cols[f.col];
      px.rect(g, w[0] - 1, w[1] - 3, 3, 3, c); px.rect(g, w[0] - 1, w[1] - 5, 3, 2, f.seed > .5 ? '#e0b090' : '#a87050');
      if (up) { px.rect(g, w[0] - 2, w[1] - 7, 1, 3, c); px.rect(g, w[0] + 2, w[1] - 7, 1, 3, c); }
    }, { bias: 0 });
  }
};
