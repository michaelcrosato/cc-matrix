/* COURT: the arena TileMap (stands of four tiers behind the far sideline, aprons), each court's painted floor (lines,
 * keys, logos and its material's grain), the crowd, the hoops (stanchion, a backboard cheated toward the camera, rim
 * halves and a spring net), backdrops, props and lights. */
const MAP_COLS = 48, MAP_ROWS = 28;
const ARENA_ROWS = (() => {
  const rows = [];
  for (let r = 0; r < MAP_ROWS; r++) {
    let s = '';
    for (let c = 0; c < MAP_COLS; c++) {
      if (r <= 1) s += '5'; else if (r === 2) s += '4'; else if (r === 3) s += '3'; else if (r === 4) s += '2'; else if (r === 5) s += '1';
      else if (r >= 7 && r <= 24 && c >= 4 && c <= 43) s += '.'; else s += ',';
    }
    rows.push(s);
  }
  return rows;
})();
// the stands' tiers: the row of each and the height of its top (the crowd stands on them)
const TIERS = [{ row: 5, h: 12 }, { row: 4, h: 24 }, { row: 3, h: 36 }, { row: 2, h: 48 }];

/** is (x, y) on a painted line of the court? (2 units wide) */
function courtLine(x, y) {
  const lw = 1.2;
  if (x < X0 - lw || x > X1 + lw || y < Y0 - lw || y > Y1 + lw) return 0;
  if (Math.abs(x - X0) < lw || Math.abs(x - X1) < lw || Math.abs(y - Y0) < lw || Math.abs(y - Y1) < lw) return 1;
  if (Math.abs(x - XM) < lw * .8) return 1;
  if (Math.abs(Math.hypot(x - XM, y - YM) - 40) < lw) return 1;
  for (const h of HOOPS) {
    const lx = h === HOOPS[0] ? x - X0 : X1 - x, cy = y - Y0;
    if (lx < 0 || lx > CW / 2) continue;
    // three-point line: corners straight, then the arc
    if (lx <= CORNER_X && (Math.abs(cy - CORNER_Y) < lw || Math.abs(cy - (CH - CORNER_Y)) < lw)) return 1;
    if (lx > CORNER_X - 2 && Math.abs(Math.hypot(x - h.x, y - h.y) - THREE_R) < lw && cy > CORNER_Y - 1 && cy < CH - CORNER_Y + 1) return 1;
    // the key
    if (lx <= KEY_L && (Math.abs(y - (YM - KEY_W)) < lw || Math.abs(y - (YM + KEY_W)) < lw)) return 1;
    if (Math.abs(lx - KEY_L) < lw && Math.abs(y - YM) <= KEY_W) return 1;
    if (Math.abs(Math.hypot(lx - KEY_L, y - YM) - KEY_W) < lw && lx > KEY_L) return 1;
    // the restricted arc
    if (Math.abs(Math.hypot(x - h.x, y - h.y) - 22) < lw * .8 && lx > 52) return 2;
  }
  return 0;
}
const inKey = (x, y) => Math.abs(y - YM) < KEY_W && (x - X0 < KEY_L || X1 - x < KEY_L) && x > X0 && x < X1;
// logo masks: text drawn once on a scratch canvas (browser only), sampled by the floor painter
const LOGOS = {};
function logoMask(text) {
  if (LOGOS[text] !== undefined) return LOGOS[text];
  LOGOS[text] = null;
  if (typeof document === 'undefined') return null;
  try {
    const w = E.font.width(text, { scale: 1 }) + 2, h = 9, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d'); E.font.text(g, text, 1, 1, '#ffffff', { outline: false });
    const d = g.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) m[i] = d[i * 4 + 3] > 100 ? 1 : 0;
    LOGOS[text] = { w, h, m };
  } catch (e) { LOGOS[text] = null; }
  return LOGOS[text];
}
const hexRgb = h => { const v = E.hex(h); return Array.isArray(v) ? v : [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
const mixRgb = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
/** the floor painter of a court: material grain, the keys' paint, lines, a centre logo */
function floorPainter(court) {
  const base = court.base, line = hexRgb(court.line), paint = hexRgb(court.paint), fill = court.paintFill, logo = logoMask(court.logo);
  const LS = 4, lw = logo ? logo.w * LS : 0, lh = logo ? logo.h * LS : 0;
  return (x, y, tag) => {
    const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .05, y * .05);
    if (tag === 'out') {   // the apron
      const k = court.floor === 'maple' ? [60, 40, 30] : court.floor === 'planks' ? [120, 84, 56] : [base[0] * .6, base[1] * .6, base[2] * .6];
      return [k[0] + n * 14, k[1] + n * 14, k[2] + n * 14];
    }
    let c;
    switch (court.floor) {
      case 'planks': { const row = Math.floor(y / 6), seam = Math.floor(y) % 6 === 0, off = E.hash2(row, 3) * 40, cut = Math.floor((x + off) % 40) === 0, tone = (E.hash2(row, Math.floor((x + off) / 40)) - .5) * 26;
        c = seam || cut ? [base[0] * .55, base[1] * .55, base[2] * .55] : [base[0] + tone + n * 10 + Math.sin(x * .4 + row) * 4, base[1] + tone * .8 + n * 8, base[2] + tone * .6 + n * 6]; break; }
      case 'maple': { const row = Math.floor(y / 4), seam = Math.floor(y) % 4 === 0, off = E.hash2(row, 7) * 64, cut = Math.floor((x + off) % 64) === 0, tone = (E.hash2(row, Math.floor((x + off) / 64)) - .5) * 22;
        c = seam || cut ? [base[0] * .8, base[1] * .8, base[2] * .8] : [base[0] + tone + n * 6, base[1] + tone * .8 + n * 5, base[2] + tone * .5 + n * 4]; break; }
      case 'concrete': { const crack = Math.abs(E.noise2(x * .03, y * .03) - .5) < .012, stain = E.noise2(x * .02 + 9, y * .02) > .72;
        c = crack ? [50, 48, 46] : stain ? [base[0] * .55, base[1] * .55, base[2] * .6] : [base[0] + n * 22 + m * 16, base[1] + n * 22 + m * 16, base[2] + n * 20 + m * 14];
        if (Math.floor(x) % 64 === 0 || Math.floor(y) % 64 === 0) c = [c[0] * .8, c[1] * .8, c[2] * .8]; break; }
      case 'basalt': { const hx = x / 40, hy = y / 28 + (Math.floor(hx) % 2) * .5, fx = hx - Math.floor(hx), fy = hy - Math.floor(hy), e = Math.min(fx * 40, (1 - fx) * 40, fy * 28, (1 - fy) * 28), flow = E.noise2(x * .02, y * .02);
        if (e < 1.1) { const hot = flow > .55; return hot ? [150 + n * 50, 50 + n * 20, 16, .7] : [base[0] * .6, base[1] * .6, base[2] * .6]; }
        c = [base[0] + n * 16 + m * 10, base[1] + n * 12 + m * 8, base[2] + n * 12 + m * 8]; break; }
      default: { const sp = E.hash2(Math.floor(x * 1.7), Math.floor(y * 1.7)) > .93; c = [base[0] + n * 18 + m * 10 + (sp ? 18 : 0), base[1] + n * 18 + m * 10 + (sp ? 18 : 0), base[2] + n * 20 + m * 12 + (sp ? 22 : 0)]; }
    }
    if (inKey(x, y)) c = mixRgb(c, fill, .55);
    if (Math.hypot(x - XM, y - YM) < 40) c = mixRgb(c, fill, .3);
    if (logo) { const lx = Math.floor((x - XM + lw / 2) / LS), ly = Math.floor((y - YM + lh / 2) / LS); if (lx >= 0 && ly >= 0 && lx < logo.w && ly < logo.h && logo.m[ly * logo.w + lx]) c = mixRgb(c, paint, .7); }
    const L = courtLine(x, y); if (L) c = mixRgb(c, L === 2 ? paint : line, court.floor === 'concrete' || court.floor === 'planks' ? .75 : .9);
    return c;
  };
}
const MAPS = {};
function courtMap(id) {
  if (MAPS[id]) return MAPS[id];
  const court = get('court', id), [s0, s1] = court.stands, face = court.floor === 'planks' || court.floor === 'basalt' ? 'plank' : 'stone';
  MAPS[id] = new E.TileMap({ rows: ARENA_ROWS, legend: { '.': { floor: 'court' }, ',': { floor: 'out' }, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 }, floorTex: floorPainter(court), outside: false, ao: 3,
    types: { 1: { h: 12, face, side: s1, top: s1 }, 2: { h: 24, face, side: s0, top: s1 }, 3: { h: 36, face, side: s1, top: s0 }, 4: { h: 48, face, side: s0, top: s1 }, 5: { h: 62, face: 'brick', side: E.shade(s0, -.25), top: E.shade(s0, -.1) } } });
  return MAPS[id];
}

/* ---- the crowd: two people a tile on each tier, in the court's colors, each bobbing on its own ---- */
const CROWDS = {};
function crowdOf(id) {
  if (CROWDS[id]) return CROWDS[id];
  const court = get('court', id), rows = [];
  TIERS.forEach((tier, ti) => {
    const people = [];
    for (let c = 1; c < MAP_COLS - 1; c++) for (const dx of [4, 12]) {
      const h = E.hash2(c * 3 + dx, ti * 7 + 1); if (h < .08) continue;
      people.push({ x: c * 16 + dx, shirt: court.crowd[Math.floor(h * 97) % court.crowd.length], skin: ['#e0b090', '#a87050', '#6a4028', '#f0c8a8', '#3a2418'][Math.floor(h * 131) % 5], hair: ['#1a1410', '#3a2a1a', '#e0c070', '#8a3a1a'][Math.floor(h * 53) % 4], ph: h * 9, side: h < .5 ? 0 : 1, big: h > .9 });
    }
    rows.push({ y: tier.row * 16 + 9, z: tier.h, people });
  });
  return (CROWDS[id] = rows);
}
function drawCrowd(r, id, t, react) {
  for (const row of crowdOf(id)) r.queue(XM, row.y, row.z, g => {
    for (const f of row.people) {
      const up = react.jump > 0 ? Math.abs(Math.sin(t * 10 + f.ph)) * 4 * react.jump : react.slump > 0 ? -1 : Math.sin(t * 2.2 + f.ph) * .6 + (react.beat ? Math.max(0, Math.sin(react.beat * Math.PI)) * 1.2 : 0);
      const [x, y] = r.w(f.x, row.y, row.z + up), X = Math.round(x), Y = Math.round(y);
      if (X < -6 || X > r.W + 6) continue;
      px.rect(g, X - 2, Y - 6, 5, 6, f.shirt); px.rect(g, X - 2, Y - 6, 1, 6, E.shade(f.shirt, -.25));
      px.rect(g, X - 1, Y - 10, 3, 4, f.skin); px.rect(g, X - 1, Y - 11, 3, 1, f.hair);
      if (react.jump > .3 && f.ph > 4) { px.rect(g, X - 3, Y - 12, 1, 4, f.skin); px.rect(g, X + 3, Y - 12, 1, 4, f.skin); }   // arms up
      if (f.big && react.flash > 0 && E.hash2(f.x, Math.floor(t * 8)) > .7) px.rect(g, X, Y - 13, 2, 2, '#ffffff');   // camera flashes
    }
  }, { bias: .2 });
}

/* ---- the hoops ---- */
const HOOP_FX = [{ bend: 0, bv: 0, net: 0, nv: 0, sway: 0, glow: 0, shattered: false, shards: 0 }, { bend: 0, bv: 0, net: 0, nv: 0, sway: 0, glow: 0, shattered: false, shards: 0 }];
function hoopStep(dt, wind) {
  for (const f of HOOP_FX) {
    f.bv += (-f.bend * 260 - f.bv * 12) * dt; f.bend += f.bv * dt;
    f.nv += (-f.net * 180 - f.nv * 9) * dt; f.net += f.nv * dt;
    f.sway = approach(f.sway, (wind || 0) * 2, dt * 3); f.glow = Math.max(0, f.glow - dt);
  }
}
function drawHoop(r, i, team) {
  const h = HOOPS[i], f = HOOP_FX[i], dir = h.dir, bx = h.board, out = bx - dir * 54, tc = team ? team.jersey : '#c8202a';
  // the stanchion: a padded base outside the baseline, a pole and an arm to the board
  r.queue(out, YM, 0, g => {
    const t = E.tones(tc);
    r.box(g, out - 9, YM - 10, 0, out + 9, YM + 10, 22, t.lt, t.sh);
    const [px0, py0] = r.w(out, YM, 22), [px1, py1] = r.w(out, YM, 104), [ax, ay] = r.w(bx - dir * 3, YM, 100);
    px.line(g, px0, py0, px1, py1, '#3a3a44', 4); px.line(g, px0 - 1, py0, px1 - 1, py1, '#6a6a78', 1);
    px.line(g, px1, py1, ax, ay, '#3a3a44', 3); px.line(g, px1, py1 - 1, ax, ay - 1, '#6a6a78', 1);
    E.font.text(g, 'BLAM', Math.round(r.w(out, YM + 10, 14)[0]) - 9, Math.round(r.w(out, YM + 10, 14)[1]) - 3, '#ffffff', { font: 'tiny', outline: false });
  }, { bias: -.5 });
  // the glass (turned 30 degrees toward the camera so its face shows)
  const s30 = .5, c30 = Math.cos(Math.PI / 6), nearX = bx + (i === 0 ? -1 : 1) * s30 * 24, farX = bx - (i === 0 ? -1 : 1) * s30 * 24;
  const near = [nearX, YM + c30 * 24], far = [farX, YM - c30 * 24];
  r.queue(bx, YM - 7, BOARD.z0, g => {
    const P4 = [r.w(near[0], near[1], BOARD.z0), r.w(near[0], near[1], BOARD.z1), r.w(far[0], far[1], BOARD.z1), r.w(far[0], far[1], BOARD.z0)];
    if (f.shattered) {   // jagged shards left in the frame
      px.line(g, P4[1][0], P4[1][1], P4[2][0], P4[2][1], '#e8eef8', 1);
      for (let k = 0; k < 6; k++) { const u = k / 5, a = [lerp(P4[1][0], P4[2][0], u), lerp(P4[1][1], P4[2][1], u)]; px.poly(g, [[a[0] - 2, a[1]], [a[0] + 2, a[1]], [a[0], a[1] + 3 + (k % 3) * 2]], '#cfe4ff'); }
      return;
    }
    px.blend(g, .35, 'screen', () => px.poly(g, P4, '#8ac8ff'));
    px.blend(g, .2, 'add', () => px.poly(g, [P4[1], P4[2], [P4[2][0], P4[2][1] + 6], [P4[1][0], P4[1][1] + 6]], '#ffffff'));
    for (let k = 0; k < 4; k++) px.line(g, P4[k][0], P4[k][1], P4[(k + 1) % 4][0], P4[(k + 1) % 4][1], '#f4f8ff', 1);
    // the shooter's square, centred over the rim
    const sq = (u, z) => { const xx = lerp(far[0], near[0], u), yy = lerp(far[1], near[1], u); return r.w(xx, yy, z); };
    const q = [sq(.32, 82), sq(.32, 92), sq(.68, 92), sq(.68, 82)];
    for (let k = 0; k < 4; k++) px.line(g, q[k][0], q[k][1], q[(k + 1) % 4][0], q[(k + 1) % 4][1], '#ff7a3a', 1);
  }, { bias: -.3 });
  // the rim: back half behind the ball's centre plane, front half in front; it bends down on hits
  const ring = (a0, a1, yq) => r.queue(h.x, yq, RIM_Z, g => {
    const tones = E.tones(f.glow > 0 ? '#ffe060' : '#ff6a1a');
    let prev = null;
    for (let k = 0; k <= 8; k++) {
      const a = a0 + (a1 - a0) * k / 8, x = h.x + Math.cos(a) * RIM_R, y = h.y + Math.sin(a) * RIM_R, front = Math.max(0, Math.cos(a) * dir);
      const p = r.w(x, y, RIM_Z - f.bend * front);
      if (prev) { px.line(g, prev[0], prev[1], p[0], p[1], tones.sh, 2); px.line(g, prev[0], prev[1] - 1, p[0], p[1] - 1, tones.lt, 1); }
      prev = p;
    }
    const [jx, jy] = r.w(h.x - dir * RIM_R, h.y, RIM_Z); px.rect(g, jx - 1, jy - 1, 3, 3, tones.deep);   // the bracket
  }, { bias: yq < h.y ? -.1 : .1 });
  ring(Math.PI, TAU, YM - 6); ring(0, Math.PI, YM + 6);
  // the net: strands from the rim to a lower ring, with knots that swing and ripple
  const net = (a0, a1, yq, col) => r.queue(h.x, yq, 66, g => {
    const pts = [];
    for (let k = 0; k <= 5; k++) {
      const a = a0 + (a1 - a0) * k / 5, sw = f.sway + Math.sin(game.time * 3 + k) * .3, rip = f.net * Math.sin(k * 1.7 + game.time * 20) * .5;
      const top = r.w(h.x + Math.cos(a) * RIM_R, h.y + Math.sin(a) * RIM_R, RIM_Z - .5), mid = r.w(h.x + Math.cos(a) * (RIM_R - 2 + rip) + sw * .5, h.y + Math.sin(a) * (RIM_R - 2), RIM_Z - 7 + f.net * 2), bot = r.w(h.x + Math.cos(a) * (5.5 + rip) + sw, h.y + Math.sin(a) * 5.5, 66 + f.net * 3);
      pts.push([top, mid, bot]);
    }
    for (let k = 0; k < pts.length; k++) {
      const [t, m, b] = pts[k]; px.line(g, t[0], t[1], m[0], m[1], col, 1); px.line(g, m[0], m[1], b[0], b[1], col, 1);
      if (k) { const [, m0, b0] = pts[k - 1]; px.line(g, m0[0], m0[1], b[0], b[1], col, 1); px.line(g, t[0], t[1], m0[0], m0[1], col, 1); }
    }
  }, { bias: yq < h.y ? -.12 : .12 });
  net(Math.PI, TAU, YM - 5, '#b8b8c4'); net(0, Math.PI, YM + 5, '#f4f4f8');
}

/* ---- the scene around the court: backdrop, extra silhouettes, props, lights ---- */
const BACKDROPS = {};
const backdropOf = id => BACKDROPS[id] || (BACKDROPS[id] = new E.Backdrop(get('court', id).sky));
function drawCourtScene(r, id, t, react) {
  const court = get('court', id), map = courtMap(id);
  backdropOf(id).draw(r);
  map.drawFloor(r); map.queueWalls(r);
  drawCrowd(r, id, t, react);
  // a rail and a scorer's table on the near apron (low, so it never hides play), benches west and east
  r.queue(XM, Y1 + 30, 0, g => { r.box(g, XM - 40, Y1 + 24, 0, XM + 40, Y1 + 36, 9, '#3a3448', '#26202e'); const [x, y] = r.w(XM, Y1 + 36, 6); E.font.text(g, 'CHANNEL BLAM', Math.round(x) - 26, Math.round(y) - 4, '#ffd23a', { font: 'tiny', outline: false }); });
  for (const bx of [X0 - 40, X1 + 40]) r.queue(bx, Y0 - 6, 0, g => r.box(g, bx - 20, Y0 - 12, 0, bx + 20, Y0 - 4, 7, '#5a4a3a', '#3a2e24'));
  for (const [name, x, y, o] of court.props) r.prop(name, x, y, 0, Object.assign({ size: 1.4 }, o || {}));
  drawSetPieces(r, id, t, react);
  if (id === 'dome') {   // the jumbotron over centre court
    r.queue(XM, Y0 - 40, 150, g => {
      const [x, y] = r.w(XM, Y0 - 40, 150), X = Math.round(x), Y = Math.round(y);
      E.ui.box(g, X - 40, Y - 22, 80, 30, { bg: '#0a0a14', border: '#ffd23a' });
      const m = S.match; E.font.text(g, m ? m.score[0] + ' - ' + m.score[1] : 'BLAM!', X, Y - 16, '#ffd23a', { align: 'center', scale: 2, outline: false });
      E.font.text(g, 'BLAM DOME', X, Y - 1, '#ff3a3a', { align: 'center', font: 'tiny', outline: false });
    }, { emissive: true });
  }
  if (id === 'skybox') {   // the BLAM COLA neon billboard, flickering
    const on = Math.sin(t * 13) > -.85;
    r.queue(XM + 150, 4, 70, g => { const [x, y] = r.w(XM + 150, 4, 70); if (on) E.font.text(g, 'BLAM COLA', Math.round(x) - 22, Math.round(y) - 10, '#ff5ad8', { outline: '#3a0a30' }); }, { emissive: true });
  }
  // lights: ambient by court; floodlights at the corners; the court's glows
  L.enabled = true; L.ambient = court.ambient;
  for (const [x, y] of [[X0 - 20, Y0 - 20], [X1 + 20, Y0 - 20], [X0 - 20, Y1 + 30], [X1 + 20, Y1 + 30]]) L.add(x, y, 140, 300, .7, { color: '#fff0d8' });
  court.glow.forEach((c, k) => L.add(k % 2 ? X1 - 80 : X0 + 80, Y0 - 30, 60, 200, .5, { color: c }));
  L.add(XM, YM, 120, 340, .35, { color: '#ffffff' });
}
