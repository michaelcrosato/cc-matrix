/* ---- Rink: geometry (analytic rounded rectangle), the 48 glass panels, nets, the floor TileMap, and the arena's drawing ---- */
const Rink = (() => {
  const C = { x: 560, y: 400 }, HL = 432, HW = 192, CR = 96, GL = 376, MOUTH = 16, NETD = 20, BAR = 20, BOARD = 17;
  const X0 = C.x - HL, X1 = C.x + HL, Y0 = C.y - HW, Y1 = C.y + HW;
  /** signed distance to the boards (negative inside) */
  const sdf = (x, y) => { const qx = Math.abs(x - C.x) - (HL - CR), qy = Math.abs(y - C.y) - (HW - CR); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - CR; };
  /** the outward normal of the boards nearest (x, y) */
  const normal = (x, y) => {
    const sx = Math.sign(x - C.x) || 1, sy = Math.sign(y - C.y) || 1, qx = Math.abs(x - C.x) - (HL - CR), qy = Math.abs(y - C.y) - (HW - CR);
    if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy) || 1; return [sx * qx / l, sy * qy / l]; }
    return qx > qy ? [sx, 0] : [0, sy];
  };
  const inside = (x, y, r = 0) => sdf(x, y) < -r;
  /** keep a body inside: returns { n, speedIn } when it touched the boards, else null (velocity reflected by bounce, keep) */
  function clampBody(b, r, bounce = .3, keep = .85) {
    const d = sdf(b.x, b.y); if (d <= -r) return null;
    const n = normal(b.x, b.y); b.x -= n[0] * (d + r); b.y -= n[1] * (d + r);
    const vn = b.vx * n[0] + b.vy * n[1]; if (vn <= 0) return { n, speedIn: 0 };
    const tx = b.vx - vn * n[0], ty = b.vy - vn * n[1];
    b.vx = tx * keep - vn * bounce * n[0]; b.vy = ty * keep - vn * bounce * n[1];
    return { n, speedIn: vn };
  }
  const goalX = side => C.x + (side ? GL : -GL);
  const outDir = side => side ? 1 : -1;   // from the goal line toward the net's back
  const DOTS = { center: [C.x, C.y], ez: [[C.x - 280, C.y - 112], [C.x - 280, C.y + 112], [C.x + 280, C.y - 112], [C.x + 280, C.y + 112]], nz: [[C.x - 84, C.y - 112], [C.x - 84, C.y + 112], [C.x + 84, C.y - 112], [C.x + 84, C.y + 112]] };
  const nearestDot = (x, y, list) => (list || DOTS.ez).slice().sort((a, b) => Math.hypot(a[0] - x, a[1] - y) - Math.hypot(b[0] - x, b[1] - y))[0];
  /* ---- glass panels around the boards: 14 per side, 4 per end, 3 per corner (48) ---- */
  const panels = [];
  (function build() {
    const add = (ax, ay, bx, by, h) => { const mx = (ax + bx) / 2, my = (ay + by) / 2, n = normal(mx + (mx - C.x) * .001, my + (my - C.y) * .001); panels.push({ a: [ax, ay], b: [bx, by], m: [mx, my], n, h, state: 'ok', shake: 0, i: panels.length }); };
    const sx0 = C.x - (HL - CR), sx1 = C.x + (HL - CR), ey0 = C.y - (HW - CR), ey1 = C.y + (HW - CR);
    for (let i = 0; i < 14; i++) add(sx0 + (sx1 - sx0) * i / 14, Y0, sx0 + (sx1 - sx0) * (i + 1) / 14, Y0, 28);   // north
    for (let k = 0; k < 3; k++) { const a0 = -PI / 2 + k * PI / 6, a1 = a0 + PI / 6; add(sx1 + Math.cos(a0) * CR, ey0 + Math.sin(a0) * CR, sx1 + Math.cos(a1) * CR, ey0 + Math.sin(a1) * CR, 34); }   // NE
    for (let i = 0; i < 4; i++) add(X1, ey0 + (ey1 - ey0) * i / 4, X1, ey0 + (ey1 - ey0) * (i + 1) / 4, 40);   // east
    for (let k = 0; k < 3; k++) { const a0 = k * PI / 6, a1 = a0 + PI / 6; add(sx1 + Math.cos(a0) * CR, ey1 + Math.sin(a0) * CR, sx1 + Math.cos(a1) * CR, ey1 + Math.sin(a1) * CR, 34); }   // SE
    for (let i = 0; i < 14; i++) add(sx1 - (sx1 - sx0) * i / 14, Y1, sx1 - (sx1 - sx0) * (i + 1) / 14, Y1, 28);   // south
    for (let k = 0; k < 3; k++) { const a0 = PI / 2 + k * PI / 6, a1 = a0 + PI / 6; add(sx0 + Math.cos(a0) * CR, ey1 + Math.sin(a0) * CR, sx0 + Math.cos(a1) * CR, ey1 + Math.sin(a1) * CR, 34); }   // SW
    for (let i = 0; i < 4; i++) add(X0, ey1 - (ey1 - ey0) * i / 4, X0, ey1 - (ey1 - ey0) * (i + 1) / 4, 40);   // west
    for (let k = 0; k < 3; k++) { const a0 = PI + k * PI / 6, a1 = a0 + PI / 6; add(sx0 + Math.cos(a0) * CR, ey0 + Math.sin(a0) * CR, sx0 + Math.cos(a1) * CR, ey0 + Math.sin(a1) * CR, 34); }   // NW
  })();
  const panelAt = (x, y) => { let best = null, bd = 1e9; for (const p of panels) { const d = Math.hypot(p.m[0] - x, p.m[1] - y); if (d < bd) { bd = d; best = p; } } return best; };
  const resetGlass = () => { for (const p of panels) { p.state = 'ok'; p.shake = 0; } };
  /* ---- scuffs: a grid of 16-unit cells over the ice: skate scratches and KABOOM melt (PLAN 7.1) ---- */
  const SW = 54, SH = 24, scuff = new Float32Array(SW * SH), melt = new Float32Array(SW * SH);
  const cellOf = (x, y) => { const cx = Math.floor((x - X0) / 16), cy = Math.floor((y - Y0) / 16); return cx < 0 || cy < 0 || cx >= SW || cy >= SH ? -1 : cy * SW + cx; };
  const scuffAt = (x, y, n, m = 0) => { const i = cellOf(x, y); if (i < 0) return; scuff[i] = Math.min(1, scuff[i] + n); if (m) melt[i] = Math.min(1, melt[i] + m); };
  const clearScuff = (k = 1) => { for (let i = 0; i < scuff.length; i++) { scuff[i] *= 1 - k; melt[i] *= 1 - k; } };
  const scuffTotal = () => { let s = 0; for (let i = 0; i < scuff.length; i++) s += scuff[i] + melt[i]; return s; };
  /* ---- the floor: ice and its markings, painted per arena (baked by a TileMap) ---- */
  const hexRGB = h => { const c = E.hex(h); return Array.isArray(c) ? c : [(c >> 16) & 255, (c >> 8) & 255, c & 255]; };
  function floorTex(arena, homeLogo) {
    const out = arena.outside, red = [200, 40, 48], blue = [40, 80, 190], crease = [159, 211, 255];
    return (x, y) => {
      const n = E.hash2(Math.floor(x), Math.floor(y)) - .5;
      const d = sdf(x, y);
      if (d > 0) {   // off the ice: rubber, concrete, snow, tile, carpet
        const k = arena.floorOut === 'snow' ? 10 : arena.floorOut === 'tile' ? ((Math.floor(x / 16) + Math.floor(y / 16)) % 2 ? 12 : -8) : arena.floorOut === 'rubber' ? (Math.floor(y / 3) % 2 ? 6 : -4) : 8;
        return [out[0] + n * k + k * .3, out[1] + n * k + k * .3, out[2] + n * k + k * .3];
      }
      // ice: white-blue, cool near the boards, a faint sheen, noise
      const edge = clamp(1 + d / 40, 0, 1), sheen = Math.max(0, E.noise2(x * .01, y * .02) - .3) * 18, cloud = E.noise2(x * .035 + 7, y * .05) * 10, scr = E.hash2(Math.floor(x / 3), Math.floor(y)) > .985 ? -14 : 0;
      // skate scratches: long faint arcs carved in every direction; pools of lamp light; a cool tint toward the far boards
      const arc = Math.abs(Math.sin(x * .021 + Math.sin(y * .013) * 3) * Math.cos(y * .017 - x * .004)), sc2 = arc > .985 ? -18 : arc > .96 ? -8 : 0;
      let pool = 0; for (const [lx, ly] of arena.lamps || []) { const dd = Math.hypot(x - lx, (y - ly) * 1.3); if (dd < 150) pool += (1 - dd / 150) * 10; }
      const far = (y - C.y) / HW * 6, g2 = (E.hash2(Math.floor(x / 2), Math.floor(y / 2)) - .5) * 10;
      let c = [190 - edge * 30 + n * 14 + g2 + sheen + cloud + scr + sc2 + pool + far, 206 - edge * 16 + n * 11 + g2 + sheen + cloud + scr + sc2 + pool + far, 226 + n * 7 + g2 * .5 + cloud * .4 + sc2 * .4 + pool * .6];
      const ax = Math.abs(x - C.x);
      const mix = (col, a) => { c = [c[0] + (col[0] - c[0]) * a, c[1] + (col[1] - c[1]) * a, c[2] + (col[2] - c[2]) * a]; };
      if (homeLogo) { const lc = LOGOS.at(homeLogo, (x - C.x) / 2 + 12, (y - C.y) / 2 + 12); if (lc) mix(hexRGB(lc), .7); }
      if (Math.abs(x - C.x) < 2.5) mix(red, .9);
      if (Math.abs(ax - 108) < 2.5) mix(blue, .9);
      if (Math.abs(ax - GL) < 1 && Math.abs(y - C.y) < HW - 8) mix(red, .85);
      for (const g of [goalX(0), goalX(1)]) { const dd = Math.hypot(x - g, y - C.y); if (dd < 28 && (x - g) * (g < C.x ? 1 : -1) > 0) mix(dd > 26.5 ? red : crease, dd > 26.5 ? .9 : .55); }
      const cd = Math.hypot(x - C.x, y - C.y); if (Math.abs(cd - 72) < 1 && !homeLogo) mix(blue, .8); if (Math.abs(cd - 72) < 1 && homeLogo) mix(blue, .8); if (cd < 3) mix(blue, .9);
      for (const [dx, dy] of DOTS.ez) { const dd = Math.hypot(x - dx, y - dy); if (Math.abs(dd - 72) < 1) mix(red, .8); if (dd < 5) mix(red, .9); }
      for (const [dx, dy] of DOTS.nz) if (Math.hypot(x - dx, y - dy) < 4) mix(red, .9);
      return c;
    };
  }
  const maps = {};
  function mapFor(arenaId, homeLogo) {
    const key = arenaId + ':' + (homeLogo || ''); if (maps[key]) return maps[key];
    const arena = ARENAS[arenaId], rows = []; for (let i = 0; i < 44; i++) rows.push('.'.repeat(70));
    const o = arena.outside;
    return (maps[key] = new E.TileMap({ rows, legend: { '.': { floor: 'ice' } }, types: {}, floorTex: floorTex(arena, homeLogo), outside: E.mix ? '#' + o.map(v => Math.max(0, Math.min(255, v | 0)).toString(16).padStart(2, '0')).join('') : '#333333', ao: 0 }));
  }
  return { C, HL, HW, CR, GL, MOUTH, NETD, BAR, BOARD, X0, X1, Y0, Y1, sdf, normal, inside, clamp: clampBody, goalX, outDir, DOTS, nearestDot, panels, panelAt, resetGlass,
    SW, SH, scuff, melt, cellOf, scuffAt, clearScuff, scuffTotal, mapFor, floorTex };
})();
