/* ---- RINK: geometry, floor, boards, glass, nets, scuffs ---- */
const Rink = (() => {
  const TS = 16, COLS = 70, ROWS = 44, CX = 560, CY = 400, HX = 432, HY = 192, RR = 96, GOALX = 376, GHALF = 16, NETD = 20, BOARD = 17;
  const X0 = CX - HX, X1 = CX + HX, Y0 = CY - HY, Y1 = CY + HY;
  const sd = (x, y) => { const qx = Math.abs(x - CX) - (HX - RR), qy = Math.abs(y - CY) - (HY - RR); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - RR; };
  const normalAt = (x, y) => { // outward normal
    const sx = x < CX ? -1 : 1, sy = y < CY ? -1 : 1, qx = Math.abs(x - CX) - (HX - RR), qy = Math.abs(y - CY) - (HY - RR);
    if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy) || 1; return [sx * qx / l, sy * qy / l]; }
    return qx > qy ? [sx, 0] : [0, sy];
  };
  const inside = (x, y, r = 0) => sd(x, y) <= -r;
  const clampBody = (b, r) => { const d = sd(b.x, b.y); if (d > -r) { const n = normalAt(b.x, b.y); b.x -= n[0] * (d + r); b.y -= n[1] * (d + r); return { n, d: d + r }; } return null; };
  // panels: 48 around the boards
  const panels = [];
  (() => {
    const secs = [['s', CX - (HX - RR), CY - HY, 1, 0, 2 * (HX - RR), 14], ['c', CX + HX - RR, CY - HY + RR, -PI / 2, 3], ['s', CX + HX, CY - (HY - RR), 0, 1, 2 * (HY - RR), 4], ['c', CX + HX - RR, CY + HY - RR, 0, 3],
      ['s', CX + (HX - RR), CY + HY, -1, 0, 2 * (HX - RR), 14], ['c', CX - HX + RR, CY + HY - RR, PI / 2, 3], ['s', CX - HX, CY + (HY - RR), 0, -1, 2 * (HY - RR), 4], ['c', CX - HX + RR, CY - HY + RR, PI, 3]];
    for (const s of secs) {
      if (s[0] === 's') { const [, sx, sy, dx, dy, len, n] = s; for (let i = 0; i < n; i++) { const a = [sx + dx * len * i / n, sy + dy * len * i / n], b = [sx + dx * len * (i + 1) / n, sy + dy * len * (i + 1) / n]; panels.push(mk(a, b)); } }
      else { const [, ccx, ccy, a0, n] = s; for (let i = 0; i < n; i++) { const t0 = a0 + (PI / 2) * i / n, t1 = a0 + (PI / 2) * (i + 1) / n; panels.push(mk([ccx + Math.cos(t0) * RR, ccy + Math.sin(t0) * RR], [ccx + Math.cos(t1) * RR, ccy + Math.sin(t1) * RR])); } }
    }
    function mk(a, b) { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, n = normalAt(mx, my); return { a, b, mx, my, n, st: 0, shake: 0, id: panels.length, near: n[1] > .45 }; }
  })();
  const panelAt = (x, y) => { let best = 0, bd = 1e9; for (const p of panels) { const d = (p.mx - x) ** 2 + (p.my - y) ** 2; if (d < bd) { bd = d; best = p.id; } } return panels[best]; };
  const inGoalMouth = y => Math.abs(y - CY) < GHALF;
  // faceoff dots
  const dots = [[CX, CY], [CX - 280, CY - 112], [CX - 280, CY + 112], [CX + 280, CY - 112], [CX + 280, CY + 112], [CX - 84, CY - 112], [CX - 84, CY + 112], [CX + 84, CY - 112], [CX + 84, CY + 112]];
  const nearestDot = (x, y, endOnly) => { let best = dots[0], bd = 1e9; for (let i = endOnly ? 1 : 0; i < dots.length; i++) { const d = (dots[i][0] - x) ** 2 + (dots[i][1] - y) ** 2; if (d < bd) { bd = d; best = dots[i]; } } return best; };
  // scuff grid
  const SW = 54, SH = 24; let scuff = new Float32Array(SW * SH), melt = new Float32Array(SW * SH);
  const cellOf = (x, y) => { const cx = ((x - X0) / 16) | 0, cy = ((y - Y0) / 16) | 0; return cx >= 0 && cy >= 0 && cx < SW && cy < SH ? cy * SW + cx : -1; };
  const addScuff = (x, y, a, m = 0) => { const i = cellOf(x, y); if (i >= 0) { scuff[i] = Math.min(1, scuff[i] + a); melt[i] = Math.min(1, melt[i] + m); } };
  const clean = (x, y, r) => { for (let cy = 0; cy < SH; cy++) for (let cx = 0; cx < SW; cx++) { const wx = X0 + cx * 16 + 8, wy = Y0 + cy * 16 + 8; if (Math.hypot(wx - x, wy - y) < r) { const i = cy * SW + cx; scuff[i] = 0; melt[i] = 0; } } };
  const scuffTotal = () => { let s = 0; for (let i = 0; i < scuff.length; i++) s += scuff[i]; return s; };
  const resetScuff = () => { scuff.fill(0); melt.fill(0); };
  // maps (one TileMap per arena)
  const maps = {};
  const buildMap = (arena) => {
    if (maps[arena.id]) return maps[arena.id];
    const rows = [];
    const tier = n => 'abcdefgh'[clamp(n, 0, 7)];
    for (let r = 0; r < ROWS; r++) { let s = ''; for (let c = 0; c < COLS; c++) {
      if (r <= 10 && c >= 4 && c <= 65) s += tier((10 - r) / 1.7 | 0);
      else if (c <= 6 && r >= 11 && r <= 41 && c >= 1) s += tier((6 - c) / 1.2 | 0);
      else if (c >= 63 && r >= 11 && r <= 41 && c <= 68) s += tier((c - 63) / 1.2 | 0);
      else s += '.'; } rows.push(s); }
    const st = arena.stand, hs = [20, 28, 36, 44, 52, 60, 68, 76], legend = { '.': { floor: 'x' } }, types = {};
    'abcdefgh'.split('').forEach((ch, i) => { legend[ch] = i + 1; types[i + 1] = { h: hs[i], face: st.face, side: st.side, top: st.top, cut: false }; });
    const m = new E.TileMap({ rows, legend, types, outside: '#0a0a10', ao: 0, floorTex: (x, y) => arenaFloor(arena, x, y) });
    return (maps[arena.id] = m);
  };
  const LINE = [200, 40, 50], BLUE = [40, 90, 200];
  const arenaFloor = (arena, x, y) => {
    const d = sd(x, y), n = E.hash2(x | 0, y | 0) - .5, m = E.noise2(x * .05, y * .05) - .5;
    if (d > 0) { const mt = arena.mat, v = n * 14; if (arena.id === 'pond') { return [mt[0] + v, mt[1] + v, mt[2] + v * .5]; } return [mt[0] + v + (((x >> 4) + (y >> 4)) & 1 ? 6 : 0), mt[1] + v, mt[2] + v]; }
    const f = arena.floor; let c = [f[0] + n * 6 - Math.max(0, d + 30) * 0 , f[1] + n * 6, f[2] + n * 4]; const sh = clamp((d + 28) / 28, 0, 1); c = [c[0] - sh * 18, c[1] - sh * 12, c[2] - sh * 4]; c[0] += m * 8; c[1] += m * 8;
    const ax = Math.abs(x - CX), ay = Math.abs(y - CY);
    if (ax < 2.5) return LINE; if (Math.abs(ax - 108) < 2.5) return BLUE; if (Math.abs(ax - GOALX) < 1) return LINE;
    const dc = Math.hypot(x - CX, y - CY); if (Math.abs(dc - 72) < 1.2 || dc < 3) return arena.id === 'dome' ? [220, 170, 40] : [60, 110, 200];
    if (dc < 30 && dc > 26) return [90, 130, 210];
    for (const dd of dots) { const e = Math.hypot(x - dd[0], y - dd[1]); if (dd !== dots[0] && (Math.abs(e - 72) < 1 && Math.abs(dd[0] - CX) > 200 || e < 3)) return LINE; }
    for (const gx of [CX - GOALX, CX + GOALX]) { const e = Math.hypot(x - gx, y - CY); if (e < 28 && (gx < CX ? x > gx : x < gx)) return e > 26 ? LINE : [160, 205, 255]; }
    return c;
  };
  const dir = (side) => side === 0 ? -1 : 1;
  // draws
  function drawGround(r, map) { map.drawFloor(r); r.decal(g => {
    for (let cy = 0; cy < SH; cy++) for (let cx = 0; cx < SW; cx++) { const i = cy * SW + cx, s = scuff[i], m = melt[i]; if (s < .06 && m < .05) continue; const wx = X0 + cx * 16, wy = Y0 + cy * 16; if (!r.visible(wx + 8, wy + 8, 0)) continue;
      if (m > .05) { const [px0, py0] = r.w(wx + 8, wy + 8, 0); px.ell(g, Math.round(px0), Math.round(py0), 5, 3, `rgba(110,160,210,${(0.35 * m).toFixed(2)})`); }
      const h = U.hash(cx, cy), k = 1 + (h * 4 | 0); for (let q = 0; q < k; q++) { const a = U.hash(cx + q * 7, cy) * PI, ox = wx + U.hash(q, cx * 3 + cy) * 12, oy = wy + U.hash(cy, q + cx) * 12; const [x0, y0] = r.w(ox, oy, 0), [x1, y1] = r.w(ox + Math.cos(a) * 7, oy + Math.sin(a) * 7, 0); px.line(g, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), `rgba(150,165,185,${(0.15 + s * .4).toFixed(2)})`, 1); } } }); }
  function quad(g, r, a, b, z0, z1, col) { const [ax, ay] = r.w(a[0], a[1], z0), [bx, by] = r.w(b[0], b[1], z0), [cx, cy] = r.w(b[0], b[1], z1), [dx, dy] = r.w(a[0], a[1], z1); px.poly(g, [[ax, ay], [bx, by], [cx, cy], [dx, dy]], col); return [[ax, ay], [bx, by], [cx, cy], [dx, dy]]; }
  function drawBoards(r, arena, homeColor, t) {
    for (const p of panels) {
      const low = p.near; const bh = low ? 6 : BOARD, gh = p.n[0] ? 40 : 28; // ends taller
      r.queue(p.mx, p.my, 0, g => {
        const wob = Math.sin(p.shake * 40) * (p.shake > 0 ? 1 : 0);
        quad(g, r, p.a, p.b, 0, bh, arena.boards);
        quad(g, r, p.a, p.b, 0, 2.5, arena.kick);
        quad(g, r, p.a, p.b, bh - 1, bh + .6, homeColor);
        if (!low && p.id % 4 === 1 && arena.ads.length) { const ad = arena.ads[(p.id >> 2) % arena.ads.length]; const [x, y] = r.w(p.mx, p.my, bh * .6); if (Math.abs(p.n[1]) > .5 && !low) E.font.text(g, ad.slice(0, 14), Math.round(x), Math.round(y) - 3, '#2a3a5a', { align: 'center', font: 'tiny', outline: false }); }
        if (!low) {
          if (p.st < 2) px.blend(g, .28, 'normal', () => { quad(g, r, p.a, p.b, bh, bh + gh + wob, '#cfe8ff'); });
          if (p.st === 0) { const [x0, y0] = r.w(p.a[0] * .7 + p.b[0] * .3, p.a[1] * .7 + p.b[1] * .3, bh + 4), [x1, y1] = r.w(p.a[0] * .4 + p.b[0] * .6, p.a[1] * .4 + p.b[1] * .6, bh + gh - 6); px.line(g, x0, y0, x1, y1, 'rgba(255,255,255,.55)', 1); }
          if (p.st === 1) { const [x0, y0] = r.w(p.a[0], p.a[1], bh + 6), [x1, y1] = r.w(p.b[0], p.b[1], bh + gh - 4), [x2, y2] = r.w(p.mx, p.my, bh + 3), [x3, y3] = r.w(p.mx, p.my, bh + gh); px.line(g, x0, y0, x1, y1, '#ffffff', 1); px.line(g, x2, y2, x3, y3, '#ffffff', 1); px.line(g, x2, y2, x1, y1, '#dfefff', 1); }
          for (const q of [p.a, p.b]) { const [x0, y0] = r.w(q[0], q[1], bh), [x1, y1] = r.w(q[0], q[1], bh + gh); px.line(g, x0, y0, x1, y1, '#9aa8b8', 1); }
          const [x0, y0] = r.w(p.a[0], p.a[1], bh + gh), [x1, y1] = r.w(p.b[0], p.b[1], bh + gh); px.line(g, x0, y0, x1, y1, '#b8c8d8', 1);
        }
      }, { bias: low ? -2 : 0 });
    }
  }
  function drawNet(r, side, bulge, lit, light) { // side 0 = home end west
    const gx = side === 0 ? CX - GOALX : CX + GOALX, d = side === 0 ? -1 : 1, bx = gx + d * NETD;
    r.queue(bx, CY, 0, g => {
      const ptsTop = [[gx, CY - GHALF], [bx, CY - GHALF], [bx, CY + GHALF], [gx, CY + GHALF]];
      px.blend(g, .32, 'normal', () => { quad(g, r, [bx, CY - GHALF], [bx, CY + GHALF], 0, 20, '#ffffff'); quad(g, r, [gx, CY - GHALF], [bx, CY - GHALF], 0, 20, '#ffffff'); quad(g, r, [gx, CY + GHALF], [bx, CY + GHALF], 0, 20, '#ffffff'); });
      for (let i = 0; i <= 8; i++) { const yy = CY - GHALF + 32 * i / 8, [x0, y0] = r.w(bx + d * (bulge || 0) * Math.sin(i / 8 * PI), yy, 0), [x1, y1] = r.w(bx, yy, 20); px.line(g, x0, y0, x1, y1, 'rgba(255,255,255,.55)', 1); }
      for (let z = 4; z < 20; z += 4) { const [x0, y0] = r.w(bx, CY - GHALF, z), [x1, y1] = r.w(bx, CY + GHALF, z); px.line(g, x0, y0, x1, y1, 'rgba(255,255,255,.4)', 1); }
      for (const yy of [CY - GHALF, CY + GHALF]) { const [x0, y0] = r.w(gx, yy, 0), [x1, y1] = r.w(gx, yy, 20); px.line(g, x0, y0, x1, y1, '#d02a2a', 2); }
      const [x0, y0] = r.w(gx, CY - GHALF, 20), [x1, y1] = r.w(gx, CY + GHALF, 20); px.line(g, x0, y0, x1, y1, '#d02a2a', 2);
      if (light) { const [lx, ly] = r.w(bx, CY, 24); px.disc(g, Math.round(lx), Math.round(ly), 3, lit ? '#ff2a2a' : '#401010'); }
    }, { emissive: !!light && lit });
  }
  return { TS, COLS, ROWS, CX, CY, HX, HY, RR, GOALX, GHALF, NETD, BOARD, X0, X1, Y0, Y1, panels, panelAt, sd, normalAt, inside, clampBody, inGoalMouth, dots, nearestDot, addScuff, clean, scuffTotal, resetScuff, scuff, melt, buildMap, drawGround, drawBoards, drawNet, quad, dir, goalLineX: side => side === 0 ? CX - GOALX : CX + GOALX, SW, SH };
})();
