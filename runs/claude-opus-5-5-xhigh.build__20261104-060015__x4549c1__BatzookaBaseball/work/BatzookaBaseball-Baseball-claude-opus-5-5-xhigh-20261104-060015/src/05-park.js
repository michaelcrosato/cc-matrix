/* =============================================================================
 * 05-park: the park builder. From a park def it makes the world: home plate's
 * position, the fence function, the baked field texture (grass mowing, dirt,
 * chalk, the warning track, the ground beyond), the TileMap of stands (the
 * Broadcast Cam's walls), props and lights, the Mode 7 view and the sky, plus
 * the drawing of the fence, poles, bases, backstop and crowd in both cameras.
 * ========================================================================== */
const ATAB = 2048;
BZ.Park = class Park {
  constructor(id) {
    const d = BZ.get('parks', id) || BZ.get('parks', 'kernel');
    this.id = d.id; this.def = d; this.name = d.name;
    this.fence = d.fence; this.fenceH = d.fenceH || 40; this.fenceSections = d.fenceSections || [];
    this.gravityMul = d.gravityMul || 1; this.evMul = d.evMul || 1; this.jumpMul = d.jumpMul || 1; this.bounceMul = d.bounceMul || 1; this.depth = d.depth || 0;
    const maxR = Math.max(...this.fence);
    const halfW = Math.ceil((maxR * .78 + 180) / 16) * 16, north = Math.ceil((maxR + 230) / 16) * 16, south = 224;
    this.Wu = halfW * 2; this.Hu = north + south;
    this.H = { x: halfW, y: north };
    // the fence radius and height tables over the spray angle
    this.Rtab = new Float32Array(ATAB); this.Htab = new Float32Array(ATAB);
    for (let i = 0; i < ATAB; i++) { const th = -Math.PI + (i + .5) / ATAB * TAU; this.Rtab[i] = BZ.fenceR(this, th); this.Htab[i] = BZ.fenceH(this, th); }
    this.span = BZ.fenceSpan(this);
    this.wind = { x: 0, y: 0 };
    this.fenceSegs = []; this.standCells = []; this.props = []; this.lightList = []; this.targets = [];
    this.buildFenceSegs();
    this.buildMap();
    this.buildProps();
    this.built = true;
  }
  R(th) { let i = Math.floor((th + Math.PI) / TAU * ATAB); i = ((i % ATAB) + ATAB) % ATAB; return this.Rtab[i]; }
  Hf(th) { let i = Math.floor((th + Math.PI) / TAU * ATAB); i = ((i % ATAB) + ATAB) % ATAB; return this.Htab[i]; }
  at(dx, dy) { return [this.H.x + dx, this.H.y + dy]; }
  off(x, y) { return [x - this.H.x, y - this.H.y]; }
  base(i) { const b = [[0, 0], BZ.GEO.first, BZ.GEO.second, BZ.GEO.third, [0, 0]][i]; return { x: this.H.x + b[0], y: this.H.y + b[1] }; }
  inField(x, y) { return BZ.inField(this, x - this.H.x, y - this.H.y); }
  /** distance beyond the playing field's edge (negative inside), at a world point */
  beyond(x, y) {
    const dx = x - this.H.x, dy = y - this.H.y, r = Math.hypot(dx, dy), th = BZ.theta(dx, dy);
    const oL = BZ.outL(dx, dy) - BZ.GEO.foulWall, oR = BZ.outR(dx, dy) - BZ.GEO.foulWall;
    let b = Math.max(oL, oR);
    if (Math.abs(th) <= this.span && dy < 0) b = Math.max(b, r - this.R(th));
    if (BZ.outL(dx, dy) > 0 && BZ.outR(dx, dy) > 0) b = Math.max(b, r - BZ.GEO.backstop);
    return b;
  }
  buildFenceSegs() {
    const n = Math.ceil(this.span * 2 / (1.25 * Math.PI / 180));
    for (let i = 0; i < n; i++) {
      const t0 = -this.span + i / n * this.span * 2, t1 = -this.span + (i + 1) / n * this.span * 2, tm = (t0 + t1) / 2;
      const r0 = this.R(t0), r1 = this.R(t1), h = this.Hf(tm);
      this.fenceSegs.push({ t0, t1, x0: this.H.x + Math.sin(t0) * r0, y0: this.H.y - Math.cos(t0) * r0, x1: this.H.x + Math.sin(t1) * r1, y1: this.H.y - Math.cos(t1) * r1, h, mx: this.H.x + Math.sin(tm) * (r0 + r1) / 2, my: this.H.y - Math.cos(tm) * (r0 + r1) / 2 });
    }
    // the foul walls: from where the fence meets them in toward home, and the backstop arc
    this.foulSegs = [];
    for (const side of [-1, 1]) {
      const span = this.span, Rend = this.R(side * span), ex = Math.sin(side * span) * Rend, ey = -Math.cos(side * span) * Rend;
      // the wall line: 70 outside the foul line; it runs from (ex, ey) toward home until 110 from H
      const ux = side * Math.SQRT1_2, uy = -Math.SQRT1_2, nx = side * Math.SQRT1_2, ny = Math.SQRT1_2;   // along the line, and outward
      const sEnd = ex * ux + ey * uy, sStart = Math.sqrt(Math.max(0, BZ.GEO.backstop * BZ.GEO.backstop - BZ.GEO.foulWall * BZ.GEO.foulWall));
      const N = Math.ceil((sEnd - sStart) / 48);
      for (let k = 0; k < N; k++) {
        const s0 = sStart + (sEnd - sStart) * k / N, s1 = sStart + (sEnd - sStart) * (k + 1) / N;
        const p0 = [ux * s0 + nx * BZ.GEO.foulWall, uy * s0 + ny * BZ.GEO.foulWall], p1 = [ux * s1 + nx * BZ.GEO.foulWall, uy * s1 + ny * BZ.GEO.foulWall];
        this.foulSegs.push({ x0: this.H.x + p0[0], y0: this.H.y + p0[1], x1: this.H.x + p1[0], y1: this.H.y + p1[1], h: 16, side });
      }
    }
    this.backSegs = [];   // the backstop: the arc behind home, from the left foul wall's end round to the right's
    for (let k = 0; k < 12; k++) {
      const th0 = Math.PI - (Math.PI / 4 + .35) + (Math.PI / 2 + .7) * k / 12, th1 = Math.PI - (Math.PI / 4 + .35) + (Math.PI / 2 + .7) * (k + 1) / 12;
      this.backSegs.push({ x0: this.H.x + Math.sin(th0) * 110, y0: this.H.y - Math.cos(th0) * 110, x1: this.H.x + Math.sin(th1) * 110, y1: this.H.y - Math.cos(th1) * 110, h: 50 });
    }
  }
  /** does a park have stands in the outfield at spray angle th? */
  outfieldStands(th) {
    const deg = th * 180 / Math.PI, a = this.def.standArc || { kernel: [-55, -14], barnacle: [-55, 8], caldera: [-55, -38, 38, 55], tranquility: [-55, 55], boneyard: [-55, -36, 36, 55], megadome: [-55, 55] }[this.id] || [-55, 55];
    for (let i = 0; i < a.length; i += 2) if (deg >= a[i] && deg <= a[i + 1]) return true;
    return false;
  }
  buildMap() {
    const T = 16, cw = Math.ceil(this.Wu / T), ch = Math.ceil(this.Hu / T), cells = new Array(cw * ch).fill(0), floor = new Array(cw * ch).fill('grass');
    for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
      const x = cx * T + 8, y = cy * T + 8, dx = x - this.H.x, dy = y - this.H.y, b = this.beyond(x, y);
      if (b <= 4) continue;
      const th = BZ.theta(dx, dy), behind = BZ.outL(dx, dy) > 0 && BZ.outR(dx, dy) > 0;
      const inOut = Math.abs(th) <= this.span && dy < 0 && BZ.outL(dx, dy) <= BZ.GEO.foulWall && BZ.outR(dx, dy) <= BZ.GEO.foulWall;
      if (inOut && !this.outfieldStands(th)) { floor[cy * cw + cx] = 'out'; continue; }
      if (b > 76) { floor[cy * cw + cx] = 'out'; continue; }
      const tier = clamp(Math.floor((b - 4) / 18), 0, 3);
      cells[cy * cw + cx] = (behind && dy > -20 ? 5 : 1) + tier;
      this.standCells.push({ cx, cy, x, y, tier, behind: behind && dy > -20 });
    }
    const d = this.def, top = d.standTop || '#a0a0a0', side = d.standColor || '#6a6a6a', face = d.standFace || 'stone';
    const types = {};
    for (let t = 0; t < 4; t++) {
      types[1 + t] = { h: 52 + t * 12, top, side, face, roof: 'plain' };
      types[5 + t] = { h: 40 + t * 10, top, side, face, roof: 'plain', cut: true, cutH: 4 + t * 3 };
    }
    this.cw = cw; this.ch = ch;
    this.cells = cells; this.floorTags = floor; this.types = types;
    if (!BZ.cosmetic) return;
    this.bakeTexture();
    const P = this;
    this.map = new E.TileMap({ w: cw, h: ch, cells, floor, types, ao: 4, outside: d.beyondColor ? d.beyondColor[0] : '#2a3a2a',
      floorTex: (x, y) => P.texAt(x, y) });
    this.map.shimmer = false;
  }
  texAt(x, y) {
    const X = Math.floor(x), Y = Math.floor(y);
    if (X < 0 || Y < 0 || X >= this.Wu || Y >= this.Hu) return [40, 50, 40];
    const i = (Y * this.Wu + X) * 4, d = this.tex; return [d[i], d[i + 1], d[i + 2]];
  }
  /** bake the field: one texel a world unit */
  bakeTexture() {
    const W = this.Wu, H = this.Hu, d = this.def, tex = new Uint8ClampedArray(W * H * 4), hex = E.hex;
    const g0 = hex(d.grass[0]), g1 = hex(d.grass[1]), dirt = hex(d.dirt), track = hex(d.track), chalk = [242, 240, 232], b0 = hex(d.beyondColor[0]), b1 = hex(d.beyondColor[1]);
    const mound = E.hex(E.shade(d.dirt, .08)), foulG = [Math.round(g0[0] * .94), Math.round(g0[1] * .94), Math.round(g0[2] * .94)];
    const Hx = this.H.x, Hy = this.H.y, span = this.span, mow = d.mow, beyondK = d.beyond, h2 = E.hash2 || ((a, b) => BZ.n2(a, b));
    const Rtab = this.Rtab;
    const set = (i, c, k) => { tex[i] = clamp(c[0] + k, 0, 255); tex[i + 1] = clamp(c[1] + k, 0, 255); tex[i + 2] = clamp(c[2] + k, 0, 255); tex[i + 3] = 255; };
    for (let py = 0; py < H; py++) {
      const dy = py + .5 - Hy;
      for (let pxx = 0; pxx < W; pxx++) {
        const i = (py * W + pxx) * 4, dx = pxx + .5 - Hx, r = Math.hypot(dx, dy);
        const grain = ((h2(pxx, py) * 1000) % 1) * 10 - 5;
        const oL = (-dx + dy) * Math.SQRT1_2, oR = (dx + dy) * Math.SQRT1_2;
        let th = 0, Rf = 1e9;
        if (dy < 0) { th = Math.atan2(dx, -dy); Rf = Rtab[Math.floor((th + Math.PI) / TAU * ATAB) % ATAB]; }
        const behind = oL > 0 && oR > 0;
        const fieldOut = oL > 70 || oR > 70 || (behind && r > 110) || (dy < 0 && Math.abs(th) <= span && r > Rf);
        if (fieldOut) {   // the ground beyond the fence and the stands' floor
          let c = b0, k = grain;
          if (beyondK === 'corn') { const row = Math.floor((pxx + Math.sin(py * .05) * 3) / 7) & 1; c = row ? b0 : b1; k += h2(pxx >> 1, py >> 2) * 24 - 12; if (h2(pxx >> 2, py >> 2) > .93) c = [220, 196, 70]; }
          else if (beyondK === 'water') { const w = Math.sin(pxx * .09 + Math.sin(py * .05) * 2) + Math.sin(py * .13); c = w > 1.4 ? [180, 220, 240] : w > .6 ? b1 : b0; }
          else if (beyondK === 'lava') { const n = E.noise2 ? E.noise2(pxx * .02, py * .02) : h2(pxx >> 3, py >> 3); c = n > .62 ? [255, 210, 80] : n > .5 ? b0 : [58, 30, 24]; k = n > .5 ? 0 : grain; }
          else if (beyondK === 'regolith') { const cx2 = Math.floor(pxx / 90), cy2 = Math.floor(py / 90), hh = h2(cx2, cy2), ccx = (cx2 + .5) * 90 + (hh - .5) * 40, ccy = (cy2 + .5) * 90, rr = Math.hypot(pxx - ccx, py - ccy), cr = 10 + hh * 22; c = rr < cr * .8 ? [100, 100, 110] : rr < cr ? [170, 170, 178] : (h2(pxx >> 2, py >> 2) > .5 ? b0 : b1); }
          else if (beyondK === 'graves') { c = h2(pxx >> 4, py >> 4) > .6 ? b1 : b0; k += h2(pxx >> 1, py >> 1) * 14 - 7; }
          else if (beyondK === 'concourse') { c = (pxx % 64 < 2 || py % 64 < 2) ? [45, 226, 230] : (h2(pxx >> 5, py >> 5) > .5 ? b0 : b1); k = 0; }
          set(i, c, k); continue;
        }
        // inside the walls
        let c, k = grain;
        const p = (dx - dy) * Math.SQRT1_2, q = (-dy - dx) * Math.SQRT1_2;   // diamond coords: home (0,0), 1B (300,0), 3B (0,300), 2B (300,300)
        const fair = dy < 0 && Math.abs(th) <= Math.PI / 4;
        // grass with the park's mowing pattern
        let alt = 0;
        if (mow === 'stripes') alt = Math.floor((dx + 2000) / 44) & 1;
        else if (mow === 'checker') alt = (Math.floor((dx + 2000) / 56) + Math.floor((dy + 2000) / 56)) & 1;
        else if (mow === 'diamonds') alt = (Math.floor((p + 2000) / 50) + Math.floor((q + 2000) / 50)) & 1;
        else if (mow === 'astro') alt = (Math.floor((dx + 2000) / 80) & 1);
        else if (mow === 'neon') alt = Math.floor((dy + 2000) / 60) & 1;
        c = fair || dy < -100 ? (alt ? g1 : g0) : foulG;
        if (mow === 'neon' && (Math.abs(((dy + 2000) % 120) - 60) < 1 || Math.abs(((dx + 2000) % 120) - 60) < 1)) { c = [40, 200, 210]; k = 0; }
        // the warning track (outfield, and along the foul walls and the backstop)
        if ((dy < 0 && Math.abs(th) <= span && r > Rf - 46) || oL > 56 || oR > 56 || (behind && r > 96)) c = track;
        // infield dirt: inside r 470 within 50 degrees, but not the infield grass square
        if (r < 470 && dy < 0 && Math.abs(th) < 50 * Math.PI / 180) { if (!(p > 24 && p < 276 && q > 24 && q < 276)) c = dirt; }
        if (r < 46) c = dirt;
        const mr = Math.hypot(dx, dy + 200); if (mr < 27) c = mound;
        // chalk: foul lines, boxes, the plate, the rubber, the on-deck circles
        const sL = (-dx - dy) * Math.SQRT1_2, sR = (dx - dy) * Math.SQRT1_2;
        if ((Math.abs(oL) < 1.1 && sL > 4 && sL < Rf + 60) || (Math.abs(oR) < 1.1 && sR > 4 && sR < Rf + 60)) { c = chalk; k = grain * .3; }
        for (const bx of [-18, 18]) { const ax = Math.abs(dx - bx), ay = Math.abs(dy + 4); if ((ax < 7 && ax > 5.8 && ay < 11) || (ay < 11 && ay > 9.8 && ax < 7)) { c = chalk; k = 0; } }
        if (dy > 6 && dy < 40 && ((Math.abs(Math.abs(dx) - 11) < .6) || (Math.abs(dy - 40) < .6 && Math.abs(dx) < 11))) { c = chalk; k = 0; }
        if (dy >= -6 && dy <= 6 && Math.abs(dx) <= 6 - Math.max(0, dy)) { c = [250, 250, 246]; k = 0; }
        if (Math.abs(dx) < 5 && Math.abs(dy + 205) < 1.2) { c = [250, 250, 246]; k = 0; }
        for (const sx of [-78, 78]) { const rr = Math.hypot(dx - sx, dy + 21); if (rr < 9) { c = rr > 7.8 ? chalk : [Math.round(dirt[0] * .8), Math.round(dirt[1] * .8), Math.round(dirt[2] * .8)]; k = 0; } }
        set(i, c, k);
      }
    }
    this.tex = tex;
    // the Mode 7 floor: the same texels on a canvas
    try {
      const cv = E.mkCanvas(W, H), g = cv.getContext('2d'), img = g.createImageData(W, H);
      img.data.set(tex); g.putImageData(img, 0, 0); this.canvas = cv;
    } catch (e) { this.canvas = null; }
  }
  buildProps() {
    const P = this, H = this.H, d = this.def, add = (id, dx, dy, facing = Math.PI / 2, o = {}) => this.props.push(Object.assign({ id, x: H.x + dx, y: H.y + dy, z: 0, facing }, o));
    const polar = (deg, r) => [Math.sin(deg * Math.PI / 180) * r, -Math.cos(deg * Math.PI / 180) * r];
    // foul poles, dugouts, benches and gear
    for (const s of [-1, 1]) {
      const R = this.R(s * Math.PI / 4); add('bz_foulpole', Math.sin(s * Math.PI / 4) * (R + 2), -Math.cos(s * Math.PI / 4) * (R + 2), Math.PI / 2, { pole: true });
      const along = 170, wx = s * along * Math.SQRT1_2 + s * Math.SQRT1_2 * (BZ.GEO.foulWall + 10), wy = -along * Math.SQRT1_2 + Math.SQRT1_2 * (BZ.GEO.foulWall + 10);
      add('bz_dugout', wx, wy, s < 0 ? -Math.PI / 4 : -Math.PI * 3 / 4);
      const bx = s * 140 * Math.SQRT1_2 + s * Math.SQRT1_2 * 52, by = -140 * Math.SQRT1_2 + Math.SQRT1_2 * 52;
      add('bz_cooler', bx, by); add('bz_batrack', bx + s * 22, by - 22, s < 0 ? -Math.PI / 4 : -Math.PI * 3 / 4); add('bz_helmetrack', bx + s * 44, by - 44, s < 0 ? -Math.PI / 4 : -Math.PI * 3 / 4);
    }
    add('bz_rosin', 12, -194);
    // light towers behind the stands
    const tw = d.towers || 0, maxR = Math.max(...this.fence);
    if (tw) for (const deg of [-62, -28, 28, 62].slice(0, tw)) { const [x, y] = polar(deg, Math.abs(deg) > 45 ? maxR * .78 : this.R(deg * Math.PI / 180) + 110); add('bz_lighttower', x, y, Math.atan2(-y, -x), { tower: true }); }
    // the scoreboard or jumbotron in center-right, behind the fence
    const sbR = this.R(.35) + 70; const [sx, sy] = polar(20, sbR);
    if (d.props.includes('megatron')) { const [mx, my] = polar(0, this.R(0) + 80); add('bz_megatron', mx, my, Math.PI / 2, { megatron: true, target: 'megatron' }); }
    else if (d.props.includes('barnboard')) add('bz_barnboard', sx, sy, Math.PI / 2 + .3, { board: true });
    else add('bz_jumbotron', sx, sy, Math.PI / 2 + .3, { board: true });
    // the park's own pieces
    const rnd = E.rng(BZ.hash(this.id));
    if (this.id === 'kernel') {
      const [x, y] = polar(32, this.R(32 * Math.PI / 180) + 130); add('bz_silo', x, y, Math.PI / 2, { silo: true, target: 'silo' });
      const [wx, wy] = polar(-28, this.R(-.5) + 140); add('bz_windmill', wx, wy);
      for (let i = 0; i < 70; i++) { const deg = -10 + rnd() * 60, rr = this.R(deg * Math.PI / 180) + 30 + rnd() * 160; const [cx, cy] = polar(deg, rr); if (Math.hypot(cx - x, cy - y) > 50) add('bz_cornstalk', cx, cy, rnd() * TAU, { sway: true }); }
      for (let i = 0; i < 4; i++) { const [hx, hy] = polar(-40 + i * 6, this.R(-.7) + 40 + rnd() * 30); add('bz_haybale', hx, hy, rnd() * TAU); }
      const [kx, ky] = polar(-46, this.R(-.8) + 30); add('bz_windsock', kx, ky, 0, { windsock: true });
    } else if (this.id === 'barnacle') {
      const [lx, ly] = polar(-38, this.R(-38 * Math.PI / 180) + 170); add('bz_lighthouse', lx, ly);
      for (let i = 0; i < 4; i++) { const [bx, by] = polar(20 + i * 7, this.R(.5) + 120 + rnd() * 90); add('bz_boat', bx, by, rnd() * TAU, { bob: true }); }
      for (let i = 0; i < 5; i++) { const [bx, by] = polar(14 + i * 6, this.R(.4) + 50); add('bz_buoy', bx, by, 0, { bob: true }); }
      for (let i = 0; i < 6; i++) { const [px2, py2] = polar(42, this.R(.7) + 30 + i * 22); add('bz_piling', px2, py2); }
      add('bz_trap', ...polar(-30, this.R(-.5) + 90));
    } else if (this.id === 'caldera') {
      add('bz_volcano', ...polar(-8, maxR + 160), Math.PI / 2, { far: true });
      for (const deg of [-22, 22]) add('bz_vent', ...polar(deg, 820), Math.PI / 2, { vent: true });
      for (let i = 0; i < 14; i++) add('bz_basalt', ...polar(-50 + i * 7.5, this.R((-50 + i * 7.5) * Math.PI / 180) + 40 + rnd() * 40), rnd() * TAU);
      for (const deg of [-30, 30]) add('bz_warnsign', ...polar(deg, 780), Math.PI / 2);
    } else if (this.id === 'tranquility') {
      for (const deg of [-35, 0, 30]) add('bz_habitat', ...polar(deg, this.R(deg * Math.PI / 180) + 170), Math.PI / 2);
      for (const deg of [-18, 15, 40]) add('bz_antenna', ...polar(deg, this.R(deg * Math.PI / 180) + 110));
      add('bz_dish', ...polar(-45, this.R(-.8) + 120), Math.PI / 2 + .4); add('bz_rover', ...polar(8, this.R(.1) + 90), rnd() * TAU);
    } else if (this.id === 'boneyard') {
      for (let i = 0; i < 60; i++) { const deg = -40 + rnd() * 80, rr = this.R(deg * Math.PI / 180) + 26 + rnd() * 150; add(['bz_tomb1', 'bz_tomb2', 'bz_tomb3'][i % 3], ...polar(deg, rr), Math.PI / 2 + (rnd() - .5) * .6); }
      add('bz_crypt', ...polar(-12, this.R(-.2) + 150), Math.PI / 2); add('bz_crypt', ...polar(25, this.R(.45) + 140), Math.PI / 2);
      for (let i = 0; i < 7; i++) add('bz_deadtree', ...polar(-45 + i * 15, this.R((-45 + i * 15) * Math.PI / 180) + 120 + rnd() * 60), rnd() * TAU);
      for (let i = 0; i < 8; i++) add('bz_pumpkin', ...polar(-44 + i * 12, this.R((-44 + i * 12) * Math.PI / 180) + 20), Math.PI / 2, { glow: true });
    } else if (this.id === 'megadome') {
      for (const deg of [-35, 35]) add('bz_holoboard', ...polar(deg, this.R(deg * Math.PI / 180) + 120), Math.PI / 2 + (deg < 0 ? .4 : -.4));
      add('bz_luxurybox', ...polar(-25, this.R(-.45) + 150), Math.PI / 2 + .3, { luxury: true });
    }
    // light sources for night parks
    for (const pr of this.props) {
      if (pr.tower) this.lightList.push([pr.x, pr.y, 180, 520, .55, d.lightTint || '#fff4d8']);
      if (pr.vent) this.lightList.push([pr.x, pr.y, 20, 160, .7, '#ff7a1a']);
      if (pr.glow) this.lightList.push([pr.x, pr.y, 8, 50, .6, '#ffa040']);
      if (pr.id === 'bz_lighthouse') this.lightList.push([pr.x, pr.y, 170, 160, .6, '#fff4a0']);
      if (pr.megatron) this.lightList.push([pr.x, pr.y, 140, 300, .6, '#2de2e6']);
    }
    if (this.id === 'caldera') for (let i = 0; i < 12; i++) { const deg = -48 + i * 8.7; const [x, y] = polar(deg, this.R(deg * Math.PI / 180) + 30); this.lightList.push([H.x + x, H.y + y, 10, 140, .5, '#ff6a1a']); }
    if (this.id === 'megadome') for (let i = 0; i < 10; i++) { const deg = -45 + i * 10; const [x, y] = polar(deg, this.R(deg * Math.PI / 180) - 10); this.lightList.push([H.x + x, H.y + y, 30, 160, .45, i % 2 ? '#ff3ab8' : '#2de2e6']); }
    void P;
  }
  /** set the wind for a game: direction and strength from the gameplay stream (open-air parks) */
  rollWind() {
    if (!this.def.wind) { this.wind = { x: 0, y: 0, mph: 0 }; return; }
    const a = this.def.windDir !== undefined ? this.def.windDir + BZ.Rr(-.4, .4) : BZ.Rr(-Math.PI, Math.PI), s = BZ.Rr(0, 12);
    this.wind = { x: Math.cos(a) * s, y: Math.sin(a) * s, mph: Math.round(s * 1.4), a };
  }

  /* ---- drawing: the Broadcast Cam (a ground view over the TileMap) ---- */
  drawBroadcast(r, t, hype) {
    const d = this.def, P = this;
    if (this.map) { this.map.drawFloor(r); this.map.queueWalls(r); }
    const pad = d.pad || '#2a5a3a', top = d.padTop || '#f2c230', pt = E.tones(pad);
    const quad = (a, b, h, col, colTop, alpha) => {
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      r.queue(mx, my, 0, g => {
        const p0 = r.w(a[0], a[1], 0), p1 = r.w(b[0], b[1], 0), p2 = r.w(b[0], b[1], h), p3 = r.w(a[0], a[1], h);
        const f = () => { px.poly(g, [p0, p1, p2, p3], col); if (colTop) px.line(g, p3[0], p3[1], p2[0], p2[1], colTop, 2); };
        if (alpha) px.blend(g, alpha, 'normal', f); else f();
      }, { bias: -2 });
    };
    for (const s of this.fenceSegs) {
      if (d.ironFence) { quad([s.x0, s.y0], [s.x1, s.y1], s.h, '#1a1820', top, .55); continue; }
      quad([s.x0, s.y0], [s.x1, s.y1], s.h, pt.base, top);
    }
    // distance markers on the fence
    for (const [deg, lab] of [[-45, 0], [0, 0], [45, 0]]) {
      const th = deg * Math.PI / 180 * .97, R = this.R(th), x = this.H.x + Math.sin(th) * (R - 1), y = this.H.y - Math.cos(th) * (R - 1), ft = BZ.feet(this.R(deg * Math.PI / 180));
      void lab; r.queue(x, y, 0, g => { const p = r.w(x, y, this.Hf(th) * .55); E.font.text(g, String(ft), p[0], p[1] - 3, '#ffffff', { align: 'center', shadow: '#000' }); }, { bias: 2 });
    }
    for (const s of this.foulSegs) quad([s.x0, s.y0], [s.x1, s.y1], s.h, pt.sh, top);
    for (const s of this.backSegs) quad([s.x0, s.y0], [s.x1, s.y1], s.h, '#20242c', null, .3);
    // bases
    for (let i = 1; i <= 3; i++) { const b = this.base(i); r.shape('bz_base', b.x, b.y, 0, { facing: Math.PI / 4 }); }
    r.shape('bz_rubber', this.H.x, this.H.y - 205, 0, { facing: Math.PI / 2 });
    // props
    for (const pr of this.props) {
      if (pr.sway) { r.shape(pr.id, pr.x, pr.y, 0, { facing: pr.facing + Math.sin(t * 1.6 + pr.x * .01) * .08 }); continue; }
      if (pr.bob) { r.shape(pr.id, pr.x, pr.y, Math.sin(t * 1.4 + pr.x) * 1.5, { facing: pr.facing + Math.sin(t * .7 + pr.y) * .1 }); continue; }
      if (pr.hidden) continue;
      r.shape(pr.id, pr.x, pr.y, 0, { facing: pr.facing, light: true });
      if (pr.board || pr.megatron) this.queueBoardScreen(r, pr, t);
    }
    // the crowd on the stand tops
    this.drawCrowd(r, t, hype);
    // lights for the night
    if (r.game.lights.enabled) for (const L of this.lightList) r.game.lights.add(L[0], L[1], L[2], L[3], L[4], { color: L[5] });
  }
  queueBoardScreen(r, pr, t) {
    const w = pr.megatron ? 88 : pr.id === 'bz_barnboard' ? 48 : 44, z0 = pr.megatron ? 96 : pr.id === 'bz_barnboard' ? 22 : 56, h = pr.megatron ? 90 : pr.id === 'bz_barnboard' ? 36 : 42;
    const c = Math.cos(pr.facing), s = Math.sin(pr.facing), off = (pr.megatron ? 6.6 : 4.6);
    const ax = pr.x + c * off - s * w, ay = pr.y + s * off + c * w, bx = pr.x + c * off + s * w, by = pr.y + s * off - c * w;
    r.queue(pr.x + c * off, pr.y + s * off, 0, g => {
      const p0 = r.w(ax, ay, z0), p1 = r.w(bx, by, z0), p2 = r.w(bx, by, z0 + h), p3 = r.w(ax, ay, z0 + h);
      BZ.drawBoardScreen && BZ.drawBoardScreen(g, [p0, p1, p2, p3], t, pr);
    }, { bias: 3, emissive: true });
  }
  drawCrowd(r, t, hype) {
    const cols = this.def.crowd || ['#ffffff'], T = 16, h2 = E.hash2;
    const wave = BZ.crowdWave || null, jump = BZ.crowdJump || 0;
    for (const c of this.standCells) {
      const tp = this.types[this.cells[c.cy * this.cw + c.cx]], z = c.behind ? (r.view.pitchDeg > 40 ? (tp.cutH || 6) : tp.h) : tp.h;
      r.queue(c.x, c.y, z, g => {
        for (let k = 0; k < 3; k++) {
          const hh = h2(c.cx * 3 + k, c.cy * 7), x = c.x - 6 + k * 6 + (hh - .5) * 3, y = c.y + (hh - .5) * 8;
          let bob = Math.max(0, Math.sin(t * (2 + hype * 4) + hh * 9)) * (1 + hype * 3);
          if (wave !== null) { const a = Math.atan2(c.x - this.H.x, -(c.y - this.H.y)); const dd = Math.abs(BZ.ang(a - wave)); if (dd < .25) bob += 7 * (1 - dd / .25); }
          if (jump > 0) bob += jump * 6 * (.5 + hh);
          const p = r.w(x, y, z + bob);
          const col = cols[Math.floor(hh * 97) % cols.length], skin = SKINS[Math.floor(hh * 31) % SKINS.length];
          const s = Math.max(1, Math.round((r.view.scale || 1) * 2.2));
          px.rect(g, p[0] - s, p[1] - s * 2, s * 2, s * 2, col);
          px.rect(g, p[0] - Math.max(1, s >> 1), p[1] - s * 3, Math.max(1, s), Math.max(1, s), skin);
        }
      }, { bias: 1 });
    }
  }

  /* ---- drawing: the Plate Cam (Mode 7 billboards for walls, stands, crowd and props) ---- */
  feedMode7(m7, t, hype) {
    const d = this.def, pad = d.pad || '#2a5a3a', top = d.padTop || '#f2c230', pt = E.tones(pad), cols = d.crowd || ['#ffffff'];
    const proj = (x, y, z) => m7.project(x, y, z);
    const quadM = (ax, ay, bx, by, z0a, z1a, z0b, z1b, col, line, alpha, crowd) => {
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      m7.add(mx, my, 0, g => {
        const p0 = proj(ax, ay, z0a), p1 = proj(bx, by, z0b), p2 = proj(bx, by, z1b), p3 = proj(ax, ay, z1a); if (!p0 || !p1 || !p2 || !p3) return;
        const f = () => { px.poly(g, [p0, p1, p2, p3], col); if (line) px.line(g, p3[0], p3[1], p2[0], p2[1], line, Math.max(1, Math.round(p0[2] * 1.5))); };
        if (alpha) px.blend(g, alpha, 'normal', f); else f();
        if (crowd) {   // the crowd: rows of little people on the stand's face
          const rows = 5, n = Math.max(2, Math.round(Math.abs(p1[0] - p0[0]) / 2.2));
          for (let rr = 0; rr < rows; rr++) for (let k = 0; k < n; k++) {
            const u = (k + .5) / n, v = (rr + .5) / rows, hh = E.hash2(Math.round(mx) * 13 + k, rr + Math.round(my));
            const bx2 = p0[0] + (p1[0] - p0[0]) * u, by2 = p0[1] + (p1[1] - p0[1]) * u, tx = p3[0] + (p2[0] - p3[0]) * u, ty = p3[1] + (p2[1] - p3[1]) * u;
            const bob = Math.max(0, Math.sin(t * (2 + hype * 4) + hh * 9)) * (hype > .7 ? 1.5 : .5) + (BZ.crowdJump || 0) * 2;
            const x = bx2 + (tx - bx2) * v, y = by2 + (ty - by2) * v - bob;
            px.rect(g, x, y - 1, 1, 2, cols[Math.floor(hh * 97) % cols.length]);
          }
        }
      });
    };
    for (const s of this.fenceSegs) {
      quadM(s.x0, s.y0, s.x1, s.y1, 0, s.h, 0, s.h, d.ironFence ? '#1a1820' : pt.base, top, d.ironFence ? .7 : 0);
      if (this.outfieldStands((s.t0 + s.t1) / 2)) {
        const r0 = this.R(s.t0), r1 = this.R(s.t1), k0 = (r0 + 8) / r0, k1 = (r1 + 8) / r1, e0 = (r0 + 76) / r0, e1 = (r1 + 76) / r1;
        const hx = this.H.x, hy = this.H.y;
        quadM(hx + (s.x0 - hx) * k0, hy + (s.y0 - hy) * k0, hx + (s.x1 - hx) * k1, hy + (s.y1 - hy) * k1, 0, s.h + 14, 0, s.h + 14, d.standColor || '#555', null, 0, false);
        quadM(hx + (s.x0 - hx) * e0, hy + (s.y0 - hy) * e0, hx + (s.x1 - hx) * e1, hy + (s.y1 - hy) * e1, s.h + 14, 96, s.h + 14, 96, E.shade(d.standColor || '#555', -.2), d.standTop, 0, true);
      }
    }
    // foul stands, along the foul walls
    for (const s of this.foulSegs) {
      quadM(s.x0, s.y0, s.x1, s.y1, 0, s.h, 0, s.h, pt.sh, top);
      const ox = s.side * Math.SQRT1_2 * 70, oy = Math.SQRT1_2 * 70;
      quadM(s.x0 + ox, s.y0 + oy, s.x1 + ox, s.y1 + oy, 18, 90, 18, 90, E.shade(d.standColor || '#555', -.2), d.standTop, 0, true);
    }
    // poles, towers, the board and the park's pieces
    for (const pr of this.props) {
      if (pr.id === 'bz_cornstalk' || pr.id === 'bz_buoy' || pr.id === 'bz_piling' || pr.id === 'bz_tomb3' || pr.id === 'bz_rosin') continue;
      if (pr.y > this.H.y + 40) continue;
      if (pr.id === 'bz_dugout' || pr.id === 'bz_cooler' || pr.id === 'bz_batrack' || pr.id === 'bz_helmetrack') continue;
      m7.shape(pr.id, pr.x, pr.y, pr.bob ? Math.sin(t * 1.4 + pr.x) * 1.5 : 0, { facing: pr.facing });
    }
    // bases and the rubber
    for (let i = 1; i <= 3; i++) {
      const b = this.base(i);
      m7.add(b.x, b.y, 0, (g, sx, sy, k) => { const w = Math.max(1.5, 5 * k); px.poly(g, [[sx - w, sy], [sx, sy - w * .35], [sx + w, sy], [sx, sy + w * .35]], '#f4f4f0'); });
    }
    // the corn rows past the fence as a band of stalks (cheap at distance)
    if (this.id === 'kernel') for (const pr of this.props) if (pr.id === 'bz_cornstalk') m7.add(pr.x, pr.y, 0, (g, sx, sy, k) => { const h = 26 * k, w = Math.max(1, 2 * k); px.rect(g, sx - w / 2, sy - h, w, h, '#6a8a2a'); px.rect(g, sx - w, sy - h * .7, w * 2, Math.max(1, h * .12), '#8aa83a'); });
  }
};

/** build (and cache) a park */
BZ.parkCache = {};
BZ.park = (id) => BZ.parkCache[id] || (BZ.parkCache[id] = new BZ.Park(id));
/** the sky of a park as a Backdrop (cached) */
BZ.backdropCache = {};
BZ.backdrop = (id) => {
  if (BZ.backdropCache[id]) return BZ.backdropCache[id];
  const d = BZ.get('parks', id); let bd = null;
  try { bd = new E.Backdrop(d.backdrop); } catch (e) { bd = new E.Backdrop('day'); }
  return (BZ.backdropCache[id] = bd);
};
/** a Mode 7 view over a park (cached) */
BZ.m7Cache = {};
BZ.mode7 = (id) => {
  if (BZ.m7Cache[id]) return BZ.m7Cache[id];
  const P = BZ.park(id), d = P.def;
  const m7 = new E.Mode7({ floor: P.canvas || P.map, outside: d.beyondColor ? d.beyondColor[0] : '#2a3a2a', sky: BZ.backdrop(id), far: 3200 });
  return (BZ.m7Cache[id] = m7);
};
