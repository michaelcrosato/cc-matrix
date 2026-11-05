// ---------------------------------------------------------------- the arena: a 23 x 15 studio room, four doors, hazards, the camera fit
MT.Arena = class Arena {
  constructor(setId) {
    this.setId = setId; const S = MT.sets.get(setId); this.set = S;
    const rows = [];
    for (let y = 0; y < AR.rows; y++) {
      let row = '';
      for (let x = 0; x < AR.cols; x++) {
        const edge = x === 0 || y === 0 || x === AR.cols - 1 || y === AR.rows - 1;
        const door = (y === 0 || y === AR.rows - 1) && x >= 10 && x <= 12 || (x === 0 || x === AR.cols - 1) && y >= 6 && y <= 8;
        row += edge && !door ? (y === AR.rows - 1 ? '_' : '#') : '.';
      }
      rows.push(row);
    }
    const wall = Object.assign({}, S.wall);
    this.map = MT.game && MT.game.headless ? null : new E.TileMap({ rows, legend: { '#': 1, '_': 2 },
      types: { 1: Object.assign({}, wall, { cut: false }), 2: Object.assign({}, wall, { cut: true, cutH: 4 }) }, floorTex: (x, y) => S.floor(x, y), outside: S.outside, ao: 4 });
    this.doors = {};
    for (const d of ['N', 'E', 'S', 'W']) this.doors[d] = { dir: d, state: 'closed', t: 0, open: 0, queue: [], gapT: 0, idle: 0, dest: null, label: '', icon: '', beacon: 0 };
    this.hazards = { conveyor: null, vents: null };
    this.splats = []; this.scorches = []; this.confetti = [];
    this.cage = null; this.pedestals = []; this.safe = null;
  }
  // ------------------------------------------------ doors
  door(d) { return this.doors[d]; }
  queueSpawn(d, kind, n, gap = .25, opts = {}) {
    const D = this.doors[d]; if (!D) return;
    for (let i = 0; i < n; i++) D.queue.push({ kind, gap: gap * MT.T.spawnGap, opts });
    if (D.state === 'closed' || D.state === 'closing') { D.state = 'opening'; D.t = 0; MT.emit('door', { d, state: 'opening' }); }
  }
  setExit(d, dest, label, icon) { const D = this.doors[d]; D.queue.length = 0; D.state = 'exit'; D.t = 0; D.dest = dest; D.label = label; D.icon = icon; }
  closeAll() { for (const d in this.doors) { const D = this.doors[d]; D.queue.length = 0; if (D.state !== 'closed') { D.state = 'closing'; D.t = 0; } } }
  slam(d) { const D = this.doors[d]; if (D) { D.state = 'closing'; D.t = 0; D.queue.length = 0; } }
  openFor(d) { const D = this.doors[d]; if (D) { D.state = 'open'; D.open = 1; D.idle = 0; } }
  update(dt, W) {
    for (const d in this.doors) {
      const D = this.doors[d]; D.t += dt; D.beacon += dt;
      if (D.state === 'opening') { D.open = Math.min(1, D.t / .35); if (D.t >= .35) { D.state = 'open'; D.t = 0; D.gapT = 0; D.idle = 0; } }
      else if (D.state === 'open') {
        D.open = 1;
        if (D.queue.length) { D.gapT -= dt; if (D.gapT <= 0) { const q = D.queue.shift(); D.gapT = q.gap; W.spawnAtDoor(q.kind, d, q.opts); D.idle = 0; } }
        else { D.idle += dt; if (D.idle > .6 && !D.hold) { D.state = 'closing'; D.t = 0; MT.emit('door', { d, state: 'closing' }); } }
      } else if (D.state === 'closing') { D.open = Math.max(0, 1 - D.t / .3); if (D.t >= .3) { D.state = 'closed'; D.open = 0; if (D.queue.length) { D.state = 'opening'; D.t = 0; } } }
      else if (D.state === 'exit') D.open = Math.min(1, D.open + dt * 3);
      else D.open = 0;
    }
    // hazards
    const cv = this.hazards.conveyor;
    if (cv) {
      cv.t += dt; cv.scroll += dt * cv.speed * cv.dirMul;
      if (!cv.warning && cv.t > 10.5) { cv.warning = true; MT.emit('conveyorWarn', {}); }
      if (cv.warning) cv.speed = Math.max(.15, 1 - (cv.t - 10.5) / 1.5);
      if (cv.t >= 12) { cv.t = 0; cv.dirMul *= -1; cv.warning = false; cv.speed = 1; }
    }
    const vt = this.hazards.vents;
    if (vt) {
      vt.t += dt;
      for (const v of vt.list) { if (v.tele > 0) { v.tele -= dt; if (v.tele <= 0) { v.fire = 1.2; MT.emit('pyro', { x: v.x, y: v.y }); } } else if (v.fire > 0) v.fire -= dt; }
      if (!vt.burst && vt.t >= vt.every) { vt.t = 0; this.fireVents(vt.patterns[vt.k++ % vt.patterns.length]); }
    }
    for (const s of this.splats) s.t -= dt; E.prune(this.splats, s => s.t <= 0);
    for (const s of this.scorches) s.t -= dt; E.prune(this.scorches, s => s.t <= 0);
    for (const s of this.confetti) s.t -= dt; E.prune(this.confetti, s => s.t <= 0);
    if (this.cage && this.cage.lift) this.cage.h = Math.max(0, this.cage.h - dt * 40);
  }
  // conveyor belts: interior row pairs, each pushing at 40 u/s
  addConveyor(rows, dirs) { this.hazards.conveyor = { rows, dirs, t: 0, speed: 1, dirMul: 1, scroll: 0, warning: false }; }
  conveyorPush(o) {
    const cv = this.hazards.conveyor; if (!cv) return 0;
    for (let i = 0; i < cv.rows.length; i++) { const y0 = 16 + cv.rows[i] * 16, y1 = y0 + 32; if (o.y >= y0 && o.y < y1) return cv.dirs[i] * cv.dirMul * cv.speed * 40; }
    return 0;
  }
  addVents(cxs, cys, patterns, every = 3.5) {
    const list = []; for (const cy of cys) for (const cx of cxs) { const [x, y] = MT.cell(cx, cy); list.push({ cx, cy, x, y, tele: 0, fire: 0, ci: cxs.indexOf(cx), ri: cys.indexOf(cy) }); }
    this.hazards.vents = { list, patterns, every, t: 1.5, k: 0, cols: cxs.length, rowsN: cys.length };
  }
  fireVents(pattern, tele = 1) {
    const vt = this.hazards.vents; if (!vt) return;
    const lane = MT.Ri(0, vt.cols - 1, 'spawn'), row = MT.Ri(0, vt.rowsN - 1, 'spawn'), col = MT.Ri(0, vt.cols - 1, 'spawn');
    for (const v of vt.list) {
      const on = pattern === 'all' || pattern === 'rows' && v.ri === row || pattern === 'cols' && v.ci === col || pattern === 'checker' && ((v.ci + v.ri + vt.k) & 1) === 0 || pattern === 'allButLane' && v.ci !== lane;
      if (on && v.tele <= 0 && v.fire <= 0) { v.tele = tele; }
    }
    MT.emit('ventTele', {});
  }
  ventAt(x, y) { const vt = this.hazards.vents; if (!vt) return null; for (const v of vt.list) if (v.fire > 0 && Math.hypot(x - v.x, y - v.y) < 12) return v; return null; }
  splatAt(x, y) { for (const s of this.splats) if (Math.hypot(x - s.x, y - s.y) < 14) return s; return null; }
  addSplat(x, y) { this.splats.push({ x, y, t: 6, r: 14 }); if (this.splats.length > 24) this.splats.shift(); }
  // ------------------------------------------------ contestants keep to the interior, except through an exit door
  clampContestant(c) {
    const m = c.r || 6; let lx0 = AR.x0 + m, lx1 = AR.x1 - m, ly0 = AR.y0 + m, ly1 = AR.y1 - m;
    for (const d in this.doors) {
      const D = this.doors[d]; if (D.state !== 'exit') continue;
      const P = AR.doors[d];
      if ((d === 'N' || d === 'S') && Math.abs(c.x - P.x) < 22 - m) { if (d === 'N') ly0 = -30; else ly1 = AR.H + 30; }
      if ((d === 'E' || d === 'W') && Math.abs(c.y - P.y) < 22 - m) { if (d === 'W') lx0 = -30; else lx1 = AR.W + 30; }
    }
    // outside the interior (in a door's passage) the walls either side still hold
    if (c.y < AR.y0 || c.y > AR.y1) { const P = AR.doors[c.y < AR.y0 ? 'N' : 'S']; lx0 = Math.max(lx0, P.x - 22 + m); lx1 = Math.min(lx1, P.x + 22 - m); }
    if (c.x < AR.x0 || c.x > AR.x1) { const P = AR.doors[c.x < AR.x0 ? 'W' : 'E']; ly0 = Math.max(ly0, P.y - 22 + m); ly1 = Math.min(ly1, P.y + 22 - m); }
    c.x = clamp(c.x, lx0, lx1); c.y = clamp(c.y, ly0, ly1);
  }
  exitHit(c) {
    for (const d in this.doors) {
      const D = this.doors[d]; if (D.state !== 'exit') continue;
      if (d === 'N' && c.y < 4 || d === 'S' && c.y > AR.H - 4 || d === 'W' && c.x < 4 || d === 'E' && c.x > AR.W - 4) return d;
    }
    return null;
  }
  // ------------------------------------------------ the camera: fit the walled arena to the screen
  fitCamera(game, force) {
    const g = game; if (g.headless) return;
    const r = g.r, W = r ? r.W : g.W, H = r ? r.H : g.H;
    if (!force && this._fit && this._fit[0] === W && this._fit[1] === H && this._fit[2] === MT.T.camZoom && this._fit[3] === g.baseView) return;
    this._fit = [W, H, MT.T.camZoom, g.baseView];
    const v = g.baseView || g.view, b = this.map.bounds(v), bw = b.x1 - b.x0 - 16, bh = b.y1 - b.y0 - 16;
    const z = clamp(Math.min((W - 6) / bw, (H - 58) / bh), .4, 1.6) * MT.T.camZoom;
    g.setZoom(clamp(z, .5, 3));
  }
  // ------------------------------------------------ drawing
  draw(r, W) {
    const S = this.set, tn = MT.game.time;
    if (this.map) this.map.drawFloor(r);
    // decals: belts, vents, splats, scorch marks, confetti
    r.decal(() => {
      const cv = this.hazards.conveyor;
      if (cv) for (let i = 0; i < cv.rows.length; i++) {
        const y0 = 16 + cv.rows[i] * 16, dir = cv.dirs[i] * cv.dirMul;
        r.groundDisc(184, y0 + 16, 1, '#000', 0);
        for (let x = 16; x < 352; x += 4) for (const yy of [y0 + 1, y0 + 31]) r.groundDisc(x + 2, yy, 1.4, '#1a1a1a', .9);
        for (let x = 0; x < 336; x += 14) { const xx = 16 + ((x + cv.scroll * 1 + 1000 * 14) % 336); const c = cv.warning && Math.floor(tn * 8) % 2 ? '#ff3344' : '#e8c020'; r.groundArc(xx, y0 + 16, 4, 9, dir > 0 ? -0.6 : Math.PI - .6, dir > 0 ? .6 : Math.PI + .6, c, .55); }
      }
      const vt = this.hazards.vents;
      if (vt) for (const v of vt.list) { r.groundRing(v.x, v.y, 9, '#5a5a62', 1); r.groundDisc(v.x, v.y, 8, '#1a1a22', .9); if (v.tele > 0) r.groundDisc(v.x, v.y, 12 * (1 - v.tele) + 3, '#ff6a20', .6); }
      for (const s of this.splats) r.groundDisc(s.x, s.y, s.r * Math.min(1, s.t), '#c8202a', .6);
      for (const s of this.scorches) r.groundDisc(s.x, s.y, s.r, '#14100c', Math.min(.6, s.t / 4));
      for (const s of this.confetti) r.groundDisc(s.x, s.y, 1.2, s.c, Math.min(1, s.t / 3));
      if (this.cage) r.groundRing(AR.cx, AR.cy, 14, '#ffcc33', 1);
    });
    // pyro flames
    const vt = this.hazards.vents;
    if (vt) for (const v of vt.list) if (v.fire > 0) {
      r.queue(v.x, v.y, 0, g => { const k = MT.pk(r); for (let i = 0; i < 6; i++) { const p = r.w(v.x + Math.sin(tn * 20 + i) * 4, v.y + Math.cos(tn * 17 + i) * 4, 6 + i * 6 + Math.sin(tn * 30 + i) * 3); px.disc(g, p[0], p[1], (7 - i) * k, i < 2 ? '#ffffff' : i < 4 ? '#ffcc33' : '#ff6a20'); } }, { emissive: true });
      MT.game.lights.add(v.x, v.y, 10, 50, .8, { color: '#ff8a30' });
    } else if (v.tele > 0 && Math.floor(tn * 10) % 2) MT.game.particles.sparks && MT.fxr() < .1 && MT.game.particles.sparks(v.x, v.y, 2, 1, -Math.PI / 2);
    // doors: shutters, beacons, exit signs
    for (const d in this.doors) this.drawDoor(r, this.doors[d], S);
    MT.sets.drawMarquee(r, this.setId);
    if (this.map) this.map.queueWalls(r);
    // the prize cage (1-4)
    if (this.cage && this.cage.h > 0) r.queue(AR.cx, AR.cy + 14, 0, g => { const h = this.cage.h; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, x = AR.cx + Math.cos(a) * 14, y = AR.cy + Math.sin(a) * 14; const p0 = r.w(x, y, 0), p1 = r.w(x, y, h); px.line(g, p0[0], p0[1], p1[0], p1[1], '#ffcc33', 1); } const t = r.groundPts ? null : null; const top = r.w(AR.cx, AR.cy, h); px.rect(g, top[0] - 12, top[1] - 1, 24, 2, '#ffcc33'); });
    for (const p of this.pedestals) r.queue(p.x, p.y, 0, g => { const T = MT.tn('#c8d0e0'); r.box(g, p.x - 7, p.y - 7, 0, p.x + 7, p.y + 7, 5, T.lt, T.sh); }, { bias: -1 });
    if (this.safe) this.drawSafe(r);
  }
  drawDoor(r, D, S) {
    const P = AR.doors[D.dir], horiz = D.dir === 'N' || D.dir === 'S', h = S.wall.h, sh = MT.tn(S.shutter[0]), tn = MT.game.time;
    const x0 = horiz ? P.x - 24 : P.x - 8, x1 = horiz ? P.x + 24 : P.x + 8, y0 = horiz ? P.y - 8 : P.y - 24, y1 = horiz ? P.y + 8 : P.y + 24;
    const hz = h * (1 - D.open);
    if (D.dir === 'S' && hz > 4) { /* the south door is cut down for the camera like its wall */ }
    const top = D.dir === 'S' ? Math.min(hz, 4) : hz;
    if (top > .5) r.queue(P.x, P.y, 0, g => {
      r.box(g, x0, y0, h - top, x1, y1, h, sh.lt, sh.sh);
      for (let k = 1; k < 5; k++) { const z = h - top + top * k / 5; const a = r.w(horiz ? x0 : P.x + P.nx * 8, horiz ? P.y + P.ny * 8 : y0, z), b = r.w(horiz ? x1 : P.x + P.nx * 8, horiz ? P.y + P.ny * 8 : y1, z); px.line(g, a[0], a[1], b[0], b[1], sh.deep); }
    }, { occluder: true });
    // hazard stripes on the threshold, the frame posts
    r.decal(() => { for (let k = -2; k <= 2; k++) r.groundDisc(P.x + (horiz ? k * 9 : P.nx * 10), P.y + (horiz ? P.ny * 10 : k * 9), 2.2, k & 1 ? '#1a1a1a' : '#e8c020', .8); });
    // beacons
    const exit = D.state === 'exit', red = D.state === 'opening' || D.state === 'open', bz = h + 4;
    const bx = P.x + (horiz ? 28 : 0), by = P.y + (horiz ? 0 : -28);
    if (exit || red) {
      const on = Math.floor(D.beacon * 6) % 2 === 0;
      r.queue(bx, by, bz, g => { const p = r.w(bx, by, bz); px.disc(g, p[0], p[1], 2.5, on ? (exit ? '#22ff66' : '#ff3344') : (exit ? '#0a5a2a' : '#5a0a14')); }, { emissive: true });
      if (on) MT.game.lights.add(P.x + P.nx * 20, P.y + P.ny * 20, 4, 46, .6, { color: exit ? '#40ff80' : '#ff3040' });
    }
    if (exit && D.label) {
      const sx = P.x + P.nx * 2, sy = P.y + P.ny * 2;
      r.queue(sx, sy, h + 12, g => {
        const p = r.w(sx, sy, h + 12), L = D.label, w = E.font.width(L) + 18;
        px.rect(g, p[0] - w / 2 - 1, p[1] - 7, w + 2, 14, '#0a2a14'); px.rect(g, p[0] - w / 2, p[1] - 6, w, 12, '#14401e');
        E.font.text(g, L, p[0] - w / 2 + 14, p[1] - 3, Math.floor(tn * 3) % 2 ? '#a0ffb0' : '#ffffff', { outline: false });
        MT.hud && MT.hud.roomIcon(g, p[0] - w / 2 + 3, p[1] - 4, D.icon);
      }, { emissive: true, bias: 20 });
    }
  }
  drawSafe(r) {
    const s = this.safe;
    r.queue(72, 6, 0, g => { const T = MT.tn('#5a6070'); r.box(g, 20, 2, 0, 124, 15, 26, T.lt, T.sh); if (s.open) { const a = r.w(30, 16, 4), b = r.w(114, 16, 24); px.rect(g, a[0], b[1], b[0] - a[0], a[1] - b[1], '#14101c'); } else { const p = r.w(72, 16, 13); px.disc(g, p[0], p[1], 6, '#c8d0e0'); px.disc(g, p[0], p[1], 4, '#3a3a48'); } }, { bias: -2 });
  }
};
