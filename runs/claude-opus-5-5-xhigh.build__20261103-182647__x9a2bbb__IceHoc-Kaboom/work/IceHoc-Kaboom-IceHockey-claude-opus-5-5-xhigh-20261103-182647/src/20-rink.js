/* ---- RINK (7.1): the geometry (an analytic rounded rectangle, lines, dots, creases, nets, 48 glass panels), the
 * collision queries, the floor TileMap per arena (stands as stepped wall tiers), and the drawing of the boards, the glass,
 * the nets and the scuff layer. 16 u = 1 m. x runs west-east along the rink, y north-south (south is toward the camera) ---- */
const Rink = (() => {
  const C = { x: 560, y: 400 }, HL = 432, HW = 192, CR = 96, AX = HL - CR, AY = HW - CR;
  const GOAL = 376, MOUTH = 16, NET_D = 20, BAR = 20, POST_R = 1.5, BOARD_H = 17, THICK = 8;
  const X0 = C.x - HL, X1 = C.x + HL, Y0 = C.y - HW, Y1 = C.y + HW;
  /** where the boards are from a point: d = distance inside (negative outside), n = the inward normal */
  function wall(x, y) {
    const dx = x - C.x, dy = y - C.y, ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax <= AX) return { d: HW - ay, nx: 0, ny: dy > 0 ? -1 : 1 };
    if (ay <= AY) return { d: HL - ax, nx: dx > 0 ? -1 : 1, ny: 0 };
    const cx = C.x + Math.sign(dx) * AX, cy = C.y + Math.sign(dy) * AY, vx = x - cx, vy = y - cy, d = Math.hypot(vx, vy) || 1;
    return { d: CR - d, nx: -vx / d, ny: -vy / d };
  }
  const inside = (x, y, r = 0) => wall(x, y).d >= r;
  /** keep a body (x, y, vx, vy) at least r inside the boards: reflect the normal speed by e, keep k of the tangent.
   *  Returns the speed it hit with (0 when it didn't), and the normal */
  function clampBody(b, r, e = .3, k = .85) {
    const w = wall(b.x, b.y); if (w.d >= r) return 0;
    b.x += w.nx * (r - w.d); b.y += w.ny * (r - w.d);
    const vn = b.vx * w.nx + b.vy * w.ny; if (vn >= 0) return 0;
    const tx = b.vx - vn * w.nx, ty = b.vy - vn * w.ny;
    b.vx = tx * k - vn * e * w.nx; b.vy = ty * k - vn * e * w.ny;
    clampBody.n = w; return -vn;
  }
  /* ---- goals: side 0 is the west net (its mouth faces east), 1 the east ---- */
  const goalX = s => s ? C.x + GOAL : C.x - GOAL;
  const intoNet = s => s ? 1 : -1;   // the direction from the goal line into net s
  const NETS = [0, 1].map(s => ({ s, x: goalX(s), back: goalX(s) + intoNet(s) * NET_D, bulge: 0, bv: 0, by: 0, light: 0, tip: 0 }));
  /** a point is inside net s's frame (behind the line, between the sides) */
  const inNet = (s, x, y) => { const n = NETS[s], u = (x - n.x) * intoNet(s); return u > 0 && u < NET_D && Math.abs(y - C.y) < MOUTH; };
  /** skaters are kept out of the net's frame (a box) */
  function netPush(b, r) {
    for (const n of NETS) {
      const x0 = Math.min(n.x, n.back) - r, x1 = Math.max(n.x, n.back) + r, y0 = C.y - MOUTH - r, y1 = C.y + MOUTH + r;
      if (b.x < x0 || b.x > x1 || b.y < y0 || b.y > y1) continue;
      const pen = [b.x - x0, x1 - b.x, b.y - y0, y1 - b.y], m = Math.min(...pen), i = pen.indexOf(m);
      if (i === 0) { b.x = x0; b.vx = Math.min(0, b.vx) * .3; } else if (i === 1) { b.x = x1; b.vx = Math.max(0, b.vx) * .3; }
      else if (i === 2) { b.y = y0; b.vy = Math.min(0, b.vy) * .3; } else { b.y = y1; b.vy = Math.max(0, b.vy) * .3; }
    }
  }
  /* ---- faceoff spots: center, the 4 end-zone dots, the 4 neutral-zone dots ---- */
  const DOTS = { center: [C.x, C.y], wn: [C.x - 280, C.y - 112], ws: [C.x - 280, C.y + 112], en: [C.x + 280, C.y - 112], es: [C.x + 280, C.y + 112],
    nwn: [C.x - 84, C.y - 112], nws: [C.x - 84, C.y + 112], nen: [C.x + 84, C.y - 112], nes: [C.x + 84, C.y + 112] };
  const nearestDot = (x, y, endOnly) => { let best = 'center', bd = 1e9; for (const k in DOTS) { if (endOnly && !/^[we][ns]$/.test(k)) continue; const d = Math.hypot(DOTS[k][0] - x, DOTS[k][1] - y); if (d < bd) { bd = d; best = k; } } return best; };

  /* ---- the 48 glass panels: 14 on each straight side, 4 on each end, 3 on each corner arc. Each is a run of short board
   * segments (the arcs in 3 pieces each) ---- */
  const panels = [];
  (() => {
    const add = (pts, side) => { const a = pts[0], b = pts[pts.length - 1], mid = pts[Math.floor(pts.length / 2)], w = wall((a[0] + b[0]) / 2 + 0, (a[1] + b[1]) / 2);
      const nx = side === 'n' ? 0 : side === 's' ? 0 : w.nx, ny = side === 'n' ? 1 : side === 's' ? -1 : w.ny;
      panels.push({ i: panels.length, side, pts, mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2, nx: side === 'n' || side === 's' ? 0 : nx, ny: side === 'n' ? 1 : side === 's' ? -1 : ny, mid,
        state: 'ok', hp: 0, near: side === 's' || ((side === 'sw' || side === 'se') && true), glassH: side === 'w' || side === 'e' ? 40 : 28, shake: 0, fixT: 0 }); };
    for (let i = 0; i < 14; i++) { const x0 = C.x - AX + i * 48, x1 = x0 + 48; add([[x0, Y0], [x1, Y0]], 'n'); }
    for (let i = 0; i < 14; i++) { const x0 = C.x - AX + i * 48, x1 = x0 + 48; add([[x0, Y1], [x1, Y1]], 's'); }
    for (let i = 0; i < 4; i++) { const y0 = C.y - AY + i * 48, y1 = y0 + 48; add([[X0, y0], [X0, y1]], 'w'); add([[X1, y0], [X1, y1]], 'e'); }
    const arc = (cx, cy, a0, side) => { for (let i = 0; i < 3; i++) { const pts = []; for (let k = 0; k <= 3; k++) { const a = a0 + (i * 3 + k) / 9 * PI / 2; pts.push([cx + Math.cos(a) * CR, cy + Math.sin(a) * CR]); } add(pts, side); } };
    arc(C.x - AX, C.y - AY, PI, 'nw'); arc(C.x + AX, C.y - AY, -PI / 2, 'ne'); arc(C.x + AX, C.y + AY, 0, 'se'); arc(C.x - AX, C.y + AY, PI / 2, 'sw');
    for (const p of panels) { const w = wall(p.mx + (p.side.length > 1 ? 0 : 0), p.my); p.nx = p.side === 'n' ? 0 : p.side === 's' ? 0 : p.side === 'w' ? 1 : p.side === 'e' ? -1 : w.nx; p.ny = p.side === 'n' ? 1 : p.side === 's' ? -1 : p.side === 'w' || p.side === 'e' ? 0 : w.ny; p.near = p.ny < -.2; }
  })();
  const panelAt = (x, y) => { let best = null, bd = 1e9; for (const p of panels) { const d = Math.hypot(p.mx - x, p.my - y); if (d < bd) { bd = d; best = p; } } return best; };
  const resetPanels = () => { for (const p of panels) { p.state = 'ok'; p.shake = 0; p.fixT = 0; } };

  /* ---- the scuff layer: 54 x 24 cells of 16 u over the rink, scuff and melt 0..1 each ---- */
  const SW = 54, SH = 24, scuff = new Float32Array(SW * SH), melt = new Float32Array(SW * SH);
  const cellOf = (x, y) => { const cx = Math.floor((x - X0) / 16), cy = Math.floor((y - Y0) / 16); return cx < 0 || cy < 0 || cx >= SW || cy >= SH ? -1 : cy * SW + cx; };
  const addScuff = (x, y, v, rad = 0) => { for (let oy = -rad; oy <= rad; oy++) for (let ox = -rad; ox <= rad; ox++) { const i = cellOf(x + ox * 16, y + oy * 16); if (i >= 0) scuff[i] = Math.min(1, scuff[i] + v); } };
  const addMelt = (x, y, v) => { const i = cellOf(x, y); if (i >= 0) melt[i] = Math.min(1, melt[i] + v); };
  const clearIce = (x0 = X0, x1 = X1, y0 = Y0, y1 = Y1, k = 0) => { for (let cy = 0; cy < SH; cy++) for (let cx = 0; cx < SW; cx++) { const x = X0 + cx * 16 + 8, y = Y0 + cy * 16 + 8; if (x >= x0 && x <= x1 && y >= y0 && y <= y1) { const i = cy * SW + cx; scuff[i] *= k; melt[i] *= k; } } };
  const scuffTotal = () => { let s = 0; for (let i = 0; i < scuff.length; i++) s += scuff[i] + melt[i]; return s; };

  /* ---- the floor: ice paint (lines, circles, dots, creases, the home team's logo at center ice), the apron, the stands'
   * walkways and the benches; one TileMap per arena and home team, baked as it is first drawn ---- */
  const RED = [200, 40, 46], BLUE = [40, 80, 190], CREASE = [159, 211, 255];
  const W = 70, H = 44;
  function paint(arena, home) {
    const A = ARENAS[arena], ice = A.ice, logoTeam = home;
    return (x, y) => {
      const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .05, y * .05);
      const w = wall(x, y);
      if (w.d < 0) {   // outside the boards: the apron, the walkways, the benches
        const o = (y > Y0 - 26 && y < Y0 && x > C.x - 230 && x < C.x + 230) ? [42, 38, 44] : (Math.floor(x / 8) + Math.floor(y / 8)) % 2 ? A.outside : A.outsideB;
        if (A.snowbanks) { const s = 220 + n * 26 + m * 18; return [s - 6, s, s + 8]; }
        if (arena === 'mall') { const tile = (Math.floor(x / 16) + Math.floor(y / 16)) % 2; return tile ? [214 + n * 10, 206 + n * 10, 220 + n * 10] : [170 + n * 10, 160 + n * 10, 182 + n * 10]; }
        return [o[0] + n * 14 + m * 8, o[1] + n * 14 + m * 8, o[2] + n * 14 + m * 8];
      }
      // ice: cloudy patches (two noise octaves), long skate-scrape arcs, frost speckle
      const streak = E.noise2(x * .55 + y * .08, y * .05 - x * .02), cut = streak > .74 ? (streak - .74) * 55 : 0;
      const cloud = E.noise2(x * .012 + 7, y * .02 + 3) * 22 + E.noise2(x * .04, y * .05 + 11) * 9;
      const arc = Math.abs(Math.sin(Math.hypot(x - C.x * .7, y - C.y * 1.6) * .045 + E.noise2(x * .01, y * .01) * 4)) < .04 ? 9 : 0;
      const frost = E.hash2(Math.floor(x / 2), Math.floor(y / 2)) > .93 ? 10 : 0;
      let c = [ice[0] - 16 + n * 10 + cloud - cut - arc + frost, ice[1] - 11 + n * 9 + cloud * .9 - cut - arc + frost, ice[2] - 4 + n * 6 + cloud * .55 - cut * .5 - arc * .5 + frost];
      const mix = (col, a) => { c = [c[0] + (col[0] - c[0]) * a, c[1] + (col[1] - c[1]) * a, c[2] + (col[2] - c[2]) * a]; };
      // the center-ice logo, painted under the lines
      const lu = (x - C.x) / 3 + 12, lv = (y - C.y) / 3 + 12;
      if (lu > 0 && lu < 24 && lv > 0 && lv < 24) { const lc = Logo.sample(logoTeam, lu, lv); if (lc) mix(E.hex(lc), .62); }
      const dx = x - C.x, dy = y - C.y, adx = Math.abs(dx);
      // creases: half discs in front of each goal line, light blue with a red rim
      for (const s of [0, 1]) { const gx = goalX(s), u = (gx - x) * intoNet(s); if (u > 0) { const d = Math.hypot(u, y - C.y); if (d < 28) mix(d > 26.5 ? RED : CREASE, d > 26.5 ? .95 : .75); } }
      if (Math.abs(adx - GOAL) < 1.2 && w.d > 0) mix(RED, .9);                         // goal lines
      if (Math.abs(adx - 108) < 2.6) mix(BLUE, .88);                                    // blue lines
      if (adx < 2.6) { mix(RED, .85); if ((Math.floor(y / 6)) % 2 && adx < 1) mix([255, 255, 255], .3); }   // the center red line, dashed
      const ring = (cx, cy, r, col, wd = 1.2) => { const d = Math.hypot(x - cx, y - cy); if (Math.abs(d - r) < wd) mix(col, .9); return d; };
      ring(C.x, C.y, 72, BLUE); if (Math.hypot(dx, dy) < 4) mix(BLUE, .95);
      for (const k of ['wn', 'ws', 'en', 'es']) { const [cx, cy] = DOTS[k], d = ring(cx, cy, 72, RED); if (d < 5) mix(RED, .95); if (Math.abs(Math.abs(y - cy) - 4) < .8 && Math.abs(Math.abs(x - cx) - 9) < 4) mix(RED, .9); }
      for (const k of ['nwn', 'nws', 'nen', 'nes']) { const [cx, cy] = DOTS[k]; if (Math.hypot(x - cx, y - cy) < 4) mix(RED, .95); }
      // cool shading near the boards, a faint sheen
      if (w.d < 24) mix([150, 180, 210], (1 - w.d / 24) * .22);
      const sheen = E.noise2(x * .012 + 3, y * .02) ; if (sheen > .62) mix([255, 255, 255], (sheen - .62) * .9);
      return c;
    };
  }
  /** the arena's TileMap: north stands in 5 tiers, stands at both ends, the rink's floor */
  const maps = new Map();
  function build(arena, home) {
    const key = arena + ':' + home; if (maps.has(key)) return maps.get(key);
    const A = ARENAS[arena], rows = [];
    for (let R = 0; R < H; R++) {
      let s = '';
      for (let c = 0; c < W; c++) {
        let ch = '.';
        if (A.stand) {
          if (R <= 9 && c >= 6 && c <= 63) ch = String(5 - Math.floor(R / 2));
          else if ((c <= 5 || c >= 64) && R >= 3 && R <= 38) { const k = c <= 5 ? c : 69 - c; ch = String(5 - Math.floor(k / 2)); }
          else if (R <= 9 && (c < 6 || c > 63)) ch = '5';
        }
        s += ch;
      }
      rows.push(s);
    }
    const st = A.stand || { face: 'plank', side: '#555', top: '#666' }, sh = (c, k) => E.shade(c, k);
    const types = {};
    [24, 34, 44, 54, 64].forEach((h, i) => { types[i + 1] = { h, face: st.face, side: sh(st.side, -.04 * i), top: sh(st.top, -.05 * i), line: sh(st.side, -.35) }; });
    const map = new E.TileMap({ rows, legend: { '.': { floor: 'ice' }, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 }, types, floorTex: paint(arena, home), outside: '#' + A.outside.map(v => Math.round(v).toString(16).padStart(2, '0')).join(''), ao: 4 });
    maps.set(key, map); return map;
  }
  /** the crowd's seats: two fans on every stand tile, on its top */
  function seats(arena) {
    const A = ARENAS[arena], out = []; if (!A.stand) return out;
    const map = build(arena, A.home);
    for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) {
      const h = map.height ? map.height(cx, cy) : 0; if (!h) continue;
      for (const dx of [4, 12]) { const hh = E.hash2(cx * 3 + dx, cy * 7 + 1); out.push({ x: cx * 16 + dx, y: cy * 16 + 9, z: h, h: hh, side: hh < .7 ? 0 : 1 }); }
    }
    return out;
  }

  /* ---- drawing the boards, glass and nets: each panel queued at its middle so it sorts against the skaters; the near
   * (south) boards and corners cut low (6 u, the top rail only) so they never hide play ---- */
  function drawBoards(r, arena, homeColor, t) {
    const A = ARENAS[arena], bt = E.tones(A.boards), cap = E.tones(homeColor), kick = E.tones(A.kick);
    for (const p of panels) {
      const near = p.near, h = A.snowbanks ? 12 : near ? 6 : BOARD_H, pts = p.pts, shake = p.shake > 0 ? Math.sin(t * 60) * p.shake * 1.5 : 0;
      r.queue(p.mx - p.nx * 2, p.my - p.ny * 2, 0, g => {
        for (let k = 0; k < pts.length - 1; k++) {
          const [ax, ay] = pts[k], [bx, by] = pts[k + 1], ox = -p.nx * THICK, oy = -p.ny * THICK;
          if (A.snowbanks) {   // the pond: snowbanks, rounded, no glass
            const q = [r.w(ax, ay, 0), r.w(bx, by, 0), r.w(bx + ox * 2, by + oy * 2, 0), r.w(ax + ox * 2, ay + oy * 2, 0)];
            const top = [r.w(ax + ox * .4, ay + oy * .4, h), r.w(bx + ox * .4, by + oy * .4, h), r.w(bx + ox * 1.4, by + oy * 1.4, h * .7), r.w(ax + ox * 1.4, ay + oy * 1.4, h * .7)];
            px.poly(g, [q[0], q[1], top[1], top[0]], '#c8d8ea'); px.poly(g, top, '#f4f8ff'); px.poly(g, [top[3], top[2], q[2], q[3]], '#dce8f4');
            px.line(g, top[0][0], top[0][1], top[1][0], top[1][1], '#ffffff');
            continue;
          }
          const faceCam = p.ny > .2 || (p.ny > -.2 && false);
          const fa = faceCam ? [ax, ay] : [ax + ox, ay + oy], fb = faceCam ? [bx, by] : [bx + ox, by + oy];
          const f0 = r.w(fa[0], fa[1], 0), f1 = r.w(fb[0], fb[1], 0), f2 = r.w(fb[0], fb[1], h), f3 = r.w(fa[0], fa[1], h);
          px.poly(g, [f0, f1, f2, f3], faceCam ? bt.base : bt.sh);
          if (!near) { const k0 = r.w(fa[0], fa[1], 2.5), k1 = r.w(fb[0], fb[1], 2.5); px.poly(g, [f0, f1, k1, k0], kick.base); }
          const c0 = r.w(ax, ay, h), c1 = r.w(bx, by, h), c2 = r.w(bx + ox, by + oy, h), c3 = r.w(ax + ox, ay + oy, h);
          px.poly(g, [c0, c1, c2, c3], cap.base); px.line(g, c0[0], c0[1], c1[0], c1[1], cap.lt);
          if (faceCam && !near) px.line(g, f3[0], f3[1] + 1, f2[0], f2[1] + 1, bt.lt);
        }
        // the ads on the far boards
        if (p.side === 'n' && A.ads.length && p.i % 3 === 1) {
          const ad = A.ads[Math.floor(p.i / 3) % A.ads.length], q = r.w(p.mx, p.my, 9);
          E.font.text(g, ad.length > 16 ? ad.slice(0, 16) : ad, Math.round(q[0]), Math.round(q[1]) - 2, ['#c8202a', '#1a3a8a', '#2a6a2a', '#5a3a22'][p.i % 4], { font: 'tiny', align: 'center', outline: false });
        }
        // the glass: a pane above the boards (not on the near side), cracked or empty by its state
        if (!near && !A.snowbanks && A.glassTint !== null) {
          const gh = p.glassH, a = pts[0], b = pts[pts.length - 1], g0 = r.w(a[0], a[1], BOARD_H), g1 = r.w(b[0], b[1], BOARD_H), g2 = r.w(b[0], b[1], BOARD_H + gh), g3 = r.w(a[0], a[1], BOARD_H + gh);
          for (const q of [g0, g1, g2, g3]) q[0] += shake;
          if (p.state !== 'shattered') {
            px.blend(g, .22, 'screen', () => px.poly(g, [g0, g1, g2, g3], A.glassTint || '#cfe8ff'));
            px.line(g, lerp(g0[0], g1[0], .2), lerp(g0[1], g1[1], .2) - 2, lerp(g3[0], g2[0], .35), lerp(g3[1], g2[1], .35) + 3, '#ffffff');
            if (p.state === 'cracked') { const cx = lerp(g0[0], g2[0], .5), cy = lerp(g0[1], g2[1], .5); for (let k = 0; k < 6; k++) { const an = k * 1.05 + .3, L2 = 5 + (k % 3) * 3; px.line(g, cx, cy, cx + Math.cos(an) * L2, cy + Math.sin(an) * L2 * .8, '#ffffff'); } }
          } else { px.line(g, g3[0], g3[1], g2[0], g2[1], '#8a9aaa'); for (let k = 0; k < 3; k++) px.dot(g, lerp(g0[0], g1[0], .2 + k * .3), g0[1] - 2, '#d8f0ff'); }
          px.line(g, g0[0], g0[1], g3[0], g3[1], '#7a8a9a'); px.line(g, g1[0], g1[1], g2[0], g2[1], '#7a8a9a');   // stanchions
          px.line(g, g3[0], g3[1], g2[0], g2[1], '#c8d8e8');
        }
      }, { bias: near ? .5 : -.5 });
    }
  }
  /** the nets: the back half (mesh, frame) behind the goalie, the posts, the crossbar and the near side mesh in front */
  function drawNets(r, t) {
    for (const n of NETS) {
      const s = n.s, d = intoNet(s), gx = n.x, bx = n.back, y0 = C.y - MOUTH, y1 = C.y + MOUTH, tip = n.tip;
      const back = (y, z) => { const bul = n.bulge * Math.exp(-((y - n.by) ** 2) / 120) * (z < 14 ? 1 : .5); return r.w(bx + d * (bul + tip * 6), y, z * (1 - tip * .5)); };
      r.queue(gx + d * 10, y0, 0, g => {
        // the roof and the back mesh
        const pts = [r.w(gx, y0, BAR), r.w(gx, y1, BAR), back(y1, 12), back(y0, 12)];
        px.blend(g, .35, 'normal', () => px.poly(g, pts, '#e8eef4'));
        for (let k = 0; k <= 8; k++) { const y = lerp(y0, y1, k / 8), a = back(y, 0), b = back(y, 12), c2 = r.w(gx, y, BAR); px.line(g, a[0], a[1], b[0], b[1], '#c8d0d8'); px.line(g, b[0], b[1], c2[0], c2[1], '#d8e0e8'); }
        for (let z = 0; z <= 12; z += 3) { const a = back(y0, z), b = back(y1, z); px.line(g, a[0], a[1], b[0], b[1], '#c8d0d8'); }
        // the far side mesh and the frame along the ice
        const fs = [r.w(gx, y0, 0), back(y0, 0), back(y0, 12), r.w(gx, y0, BAR)]; px.blend(g, .3, 'normal', () => px.poly(g, fs, '#e0e8f0'));
        const f0 = r.w(gx, y0, 0), f1 = back(y0, 0), f2 = back(y1, 0), f3 = r.w(gx, y1, 0);
        px.line(g, f0[0], f0[1], f1[0], f1[1], '#c82a2a'); px.line(g, f1[0], f1[1], f2[0], f2[1], '#c82a2a');
        const p0 = r.w(gx, y0, 0), p0t = r.w(gx, y0, BAR); px.line(g, p0[0], p0[1], p0t[0], p0t[1], '#e8343a', 2);
      }, { bias: -1 });
      r.queue(gx + d * 10, y1, 0, g => {
        const ns = [r.w(gx, y1, 0), back(y1, 0), back(y1, 12), r.w(gx, y1, BAR)]; px.blend(g, .32, 'normal', () => px.poly(g, ns, '#eef4fa'));
        for (let k = 1; k < 5; k++) { const a = r.w(lerp(gx, bx, k / 5), y1, 0), b = r.w(lerp(gx, bx, k / 5), y1, lerp(BAR, 12, k / 5)); px.line(g, a[0], a[1], b[0], b[1], '#d0d8e0'); }
        const f2 = back(y1, 0), f3 = r.w(gx, y1, 0); px.line(g, f2[0], f2[1], f3[0], f3[1], '#c82a2a');
        const p1 = r.w(gx, y1, 0), p1t = r.w(gx, y1, BAR), p0t = r.w(gx, y0, BAR);
        px.line(g, p1[0], p1[1], p1t[0], p1t[1], '#e8343a', 2); px.line(g, p0t[0], p0t[1], p1t[0], p1t[1], '#e8343a', 2);
        px.line(g, p0t[0], p0t[1] - 1, p1t[0], p1t[1] - 1, '#ff8a8a');
      }, { bias: 1 });
      // the goal light on the glass behind the net
      const lz = BOARD_H + 34, lx = s ? X1 - 4 : X0 + 4, on = n.light > 0 && Math.floor(t * 8) % 2 === 0;
      r.queue(lx, C.y, lz, g => { const q = r.w(lx, C.y, lz); px.disc(g, q[0], q[1], 3, on ? '#ff3a2a' : '#5a1a1a'); px.dot(g, q[0] - 1, q[1] - 1, on ? '#ffd0c0' : '#8a3a3a'); }, { emissive: on });
      if (on) L.add(lx, C.y, lz, 120, 1, { color: '#ff3a2a' });
    }
  }
  /** the scuff layer over the floor (decals): scratch lines by each cell's hash, puddles where it melted */
  function drawScuff(r) {
    r.decal(g => {
      for (let cy = 0; cy < SH; cy++) for (let cx = 0; cx < SW; cx++) {
        const i = cy * SW + cx, sc = scuff[i], me = melt[i]; if (sc < .05 && me < .05) continue;
        const x = X0 + cx * 16, y = Y0 + cy * 16; if (!r.visible(x + 8, y + 8, 0)) continue;
        if (sc >= .05) { const n = 1 + Math.floor(sc * 3.5); for (let k = 0; k < n; k++) { const h = E.hash2(i * 7 + k, 3), a = h * PI, L2 = 5 + h * 7, ox = E.hash2(i, k) * 12 + 2, oy = E.hash2(k, i) * 12 + 2;
          const q0 = r.w(x + ox - Math.cos(a) * L2 / 2, y + oy - Math.sin(a) * L2 / 2, 0), q1 = r.w(x + ox + Math.cos(a) * L2 / 2, y + oy + Math.sin(a) * L2 / 2, 0);
          px.blend(g, Math.min(.6, sc * .7), 'normal', () => px.line(g, q0[0], q0[1], q1[0], q1[1], '#bccbd8')); } }
        if (me >= .05) { const q = r.w(x + 8, y + 8, 0); px.blend(g, Math.min(.7, me), 'normal', () => px.ell(g, q[0], q[1], 7, 4, '#8aa4bc')); px.dot(g, q[0] - 2, q[1] - 1, '#e8f4ff'); }
      }
    });
  }
  return { C, HL, HW, CR, GOAL, MOUTH, NET_D, BAR, POST_R, BOARD_H, X0, X1, Y0, Y1, wall, inside, clampBody, goalX, intoNet, NETS, inNet, netPush, DOTS, nearestDot,
    panels, panelAt, resetPanels, addScuff, addMelt, clearIce, scuffTotal, scuff, melt, SW, SH, build, seats, drawBoards, drawNets, drawScuff, W: W * 16, H: H * 16 };
})();
