/* ============ 10-pitch: the pitch geometry, the stadium tile map, the ball ============ */
const TL = 16, FW = 44, FH = 26, ND = 2, STAND = 4, GOAL_TILES = 6;
const Pitch = EF.Pitch = {};
Pitch.COLS = ND + 1 + FW + 1 + ND; Pitch.ROWS = STAND + 1 + FH + 1 + 2;
Pitch.X0 = (ND + 1) * TL; Pitch.X1 = Pitch.X0 + FW * TL; Pitch.Y0 = (STAND + 1) * TL; Pitch.Y1 = Pitch.Y0 + FH * TL;
Pitch.CX = (Pitch.X0 + Pitch.X1) / 2; Pitch.CY = (Pitch.Y0 + Pitch.Y1) / 2; Pitch.GH = GOAL_TILES * TL / 2; Pitch.BAR = 28;
Pitch.BOXD = 84; Pitch.BOXH = 110; Pitch.SIXD = 36; Pitch.SIXH = 60; Pitch.SPOT = 58; Pitch.GRAV = 600;
const { X0, X1, Y0, Y1, CX, CY, GH, BAR } = Pitch;
Pitch.goalX = side => side === 0 ? X1 : X0;           // the goal side `side` attacks
Pitch.ownGoalX = side => side === 0 ? X0 : X1;
Pitch.inBox = (x, y, side) => Math.abs(y - CY) < Pitch.BOXH && (side === 0 ? x < X0 + Pitch.BOXD : x > X1 - Pitch.BOXD);   // inside side's own penalty area

Pitch.rows = (() => {
  const rows = [], goalRow = r => r > FH / 2 - GOAL_TILES / 2 && r <= FH / 2 + GOAL_TILES / 2;
  for (let R = 0; R < Pitch.ROWS; R++) {
    let s = ''; const r = R - STAND;
    for (let c = 0; c < Pitch.COLS; c++) {
      const field = c > ND && c <= ND + FW && r > 0 && r <= FH, endCol = c === ND || c === ND + FW + 1, net = c < ND || c > ND + FW + 1;
      if (r < 0) s += c >= ND && c <= ND + FW + 1 ? String(Math.min(5, R + 1)) : ',';
      else if (field) s += '.';
      else if (endCol && r > 0 && r <= FH) s += goalRow(r) ? '.' : '#';
      else if ((r === 0 || r === FH + 1) && c >= ND && c <= ND + FW + 1) s += '#';
      else if (net && goalRow(r)) s += c === 0 || c === Pitch.COLS - 1 ? 'N' : ':';
      else if (net && (goalRow(r + 1) || goalRow(r - 1))) s += 'N';
      else s += ',';
    }
    rows.push(s);
  }
  return rows;
})();

const lineAt = (x, y) => {
  const ex = Math.min(Math.abs(x - X0), Math.abs(x - X1)), ey = Math.min(Math.abs(y - Y0), Math.abs(y - Y1)), inside = x > X0 - 1.5 && x < X1 + 1.5 && y > Y0 - 1.5 && y < Y1 + 1.5;
  if (inside && (ex < 1.5 || ey < 1.5)) return true;
  if (Math.abs(x - CX) < 1 && inside) return true;
  if (Math.abs(Math.hypot(x - CX, y - CY) - 44) < 1) return true;
  if (Math.hypot(x - CX, y - CY) < 2) return true;
  for (const gx of [X0, X1]) {
    const dx = Math.abs(x - gx), dy = Math.abs(y - CY);
    if ((Math.abs(dx - Pitch.BOXD) < 1 && dy < Pitch.BOXH) || (Math.abs(dy - Pitch.BOXH) < 1 && dx < Pitch.BOXD)) return true;
    if ((Math.abs(dx - Pitch.SIXD) < 1 && dy < Pitch.SIXH) || (Math.abs(dy - Pitch.SIXH) < 1 && dx < Pitch.SIXD)) return true;
    if (Math.hypot(dx - Pitch.SPOT, dy) < 2) return true;
    if (Math.abs(Math.hypot(dx - Pitch.SPOT, dy) - 36) < 1 && dx > Pitch.BOXD) return true;
  }
  return false;
};
const SPONSOR_COLORS = ['#c8302a', '#2a5ab8', '#e8b020', '#2a8a4a'];
const mapCache = {};
Pitch.build = stadiumId => {
  if (mapCache[stadiumId]) return mapCache[stadiumId];
  const st = EF.get('stadium', stadiumId) || EF.get('stadium', 'rec'), [ga, gb] = st.grass, snow = !!st.snow, wet = !!st.wet;
  const floorTex = (x, y, tag) => {
    const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .06, y * .06) * .5;
    if (tag === 'net') { const mesh = Math.floor(x) % 4 === 0 || Math.floor(y) % 4 === 0; return mesh ? [150, 158, 168] : [44 + n * 8, 62 + n * 10, 52 + n * 8]; }
    if (tag === 'out') return snow ? [188 + n * 14, 196 + n * 12, 208 + n * 10] : [48 + n * 16, 52 + n * 14, 58 + n * 14];
    const k = Math.floor((x - X0) / 32) % 2 ? gb : ga;
    let col;
    if (lineAt(x, y)) { const w = snow ? 120 : 232 + n * 22; col = snow ? [w + 60, w + 70, w + 90] : [w, w + 4, w - 8]; }
    else {
      col = [k[0] + n * 16 + m * 8, k[1] + n * 18 + m * 10, k[2] + n * 14 + m * 8];
      if (snow) col = [200 + n * 22, 208 + n * 20, 220 + n * 16];
      const worn = Math.max(0, 1 - Math.hypot(x - CX, y - CY) / 60) + Math.max(0, 1 - Math.min(Math.abs(x - X0), Math.abs(x - X1)) / 40) * Math.max(0, 1 - Math.abs(y - CY) / 60);
      if (st.mud && worn > .35) col = [col[0] * .6 + 60 * worn, col[1] * .55 + 40 * worn, col[2] * .45 + 20 * worn];
      else if (worn > .5 && !snow) col = [col[0] + 18 * worn, col[1] + 8 * worn, col[2] - 8 * worn];
      if (wet) { const pud = E.noise2(x * .035 + 9, y * .035 + 4); if (pud > .84) col = [70 + n * 8, 100 + n * 8, 120 + n * 8]; }
    }
    return col;
  };
  const sc = st.standColor, hex = E.hex;
  const shade = (c, k) => '#' + [1, 3, 5].map(i => Math.max(0, Math.min(255, Math.round(parseInt(c.substr(i, 2), 16) * k))).toString(16).padStart(2, '0')).join('');
  const map = new E.TileMap({ rows: Pitch.rows, legend: { '#': 1, N: 2, 1: 6, 2: 5, 3: 4, 4: 3, 5: 3, '.': { floor: 'grass' }, ':': { floor: 'net' }, ',': { floor: 'out' } }, floorTex, outside: snow ? '#b8c0cc' : '#1e1c24', ao: 4,
    types: { 1: { h: 18, cut: true, cutH: 5, face: 'plank', side: shade(SPONSOR_COLORS[stadiumId.length % 4], .9), top: '#8a96b8', line: '#2a3450' }, 2: { h: 10, face: 'none', side: '#5a6070', top: '#8a92a2' },
      3: { h: 34, face: 'stone', side: shade(sc, .9), top: shade(sc, 1.08) }, 4: { h: 46, face: 'stone', side: shade(sc, .8), top: shade(sc, 1) }, 5: { h: 58, face: 'stone', side: shade(sc, .7), top: shade(sc, .94) }, 6: { h: 70, face: 'stone', side: shade(sc, .6), top: shade(sc, .86) } } });
  return (mapCache[stadiumId] = map);
};

/* ---- the ball ---- */
EF.Ball = class Ball {
  constructor() { this.x = CX; this.y = CY; this.z = 0; this.vx = 0; this.vy = 0; this.vz = 0; this.spin = 0; this.owner = null; this.last = null; this.prev = null; this.roll = 0; this.path = null; this.pathT = 0; this.shotBy = null; this.shotT = 0; this.superT = 0; this.decoys = 0; this.fk = -1; this.fkT = 0; this.bounced = false; this.hit = null; this.aerial = 0; }
  stop() { this.vx = this.vy = this.vz = 0; this.spin = 0; this.path = null; }
  speed() { return Math.hypot(this.vx, this.vy); }
  /** advance a loose ball; returns an array of events [type, data] (post, bar, bounce, board) */
  step(dt, M) {
    const ev = [], T = EF.T, st = M.stadium;
    this.bounced = false; this.hit = null;
    if (this.owner) { return ev; }
    this.shotT += dt; this.fkT += dt; if (this.fkT > 7) this.fk = -1;
    if (this.path) this.applyPath(dt, M);
    const sp = Math.hypot(this.vx, this.vy);
    if (this.spin && sp > 20) { const k = this.spin * dt; this.vx += -this.vy * k; this.vy += this.vx * k; this.spin *= Math.exp(-dt * 1.3); }
    this.vz -= Pitch.GRAV * dt * (this.path && this.path.type === 'hammer' ? 1.4 : 1);
    this.x += this.vx * dt; this.y += this.vy * dt; this.z += this.vz * dt;
    if (this.z <= 0) {
      this.z = 0;
      if (this.vz < -40) { this.vz = -this.vz * T.bounce * (st.wet ? .8 : 1); this.bounced = true; ev.push(['bounce', { power: Math.min(1, Math.abs(this.vz) / 200) }]); if (st.uneven && M.rng() < .35) { this.vx += (M.rng() - .5) * 60; this.vy += (M.rng() - .5) * 60; } if (this.path && this.path.type === 'hammer') ev.push(['hammer', {}]); }
      else this.vz = 0;
      const fr = Math.exp(-dt * T.ballDrag * (st.friction || 1) * (st.snow ? .7 : 1) * (this.vz === 0 ? 1 : .4)); this.vx *= fr; this.vy *= fr;
      if (this.vz === 0 && Math.hypot(this.vx, this.vy) < 3) { this.vx = this.vy = 0; }
    } else { const af = Math.exp(-dt * .12); this.vx *= af; this.vy *= af; }
    this.roll += Math.hypot(this.vx, this.vy) * dt;
    // the goal frame: posts and crossbar, only where the ball crosses a goal line
    for (const side of [0, 1]) {
      const gx = side === 0 ? X1 : X0, dir = side === 0 ? 1 : -1, px_ = this.x - dt * this.vx;   // previous x
      const crossed = (px_ - gx) * dir < 0 && (this.x - gx) * dir >= 0 || Math.abs(this.x - gx) < 2.5 && Math.abs(this.vx) > 1 && ((this.x - gx) * dir >= 0);
      if ((px_ - gx) * dir < 0 && (this.x - gx) * dir >= 0) {
        const yy = this.y; const nearPost = Math.min(Math.abs(yy - (CY - GH)), Math.abs(yy - (CY + GH))) < 2.6;
        if (nearPost && this.z < BAR) { this.x = gx - dir * 2.6; this.vx = -this.vx * .55; this.vy += (M.rng() - .5) * 40; ev.push(['post', { x: gx, y: yy }]); }
        else if (Math.abs(yy - CY) < GH && this.z >= BAR - 3 && this.z < BAR + 3) { this.x = gx - dir * 2.6; this.vx = -this.vx * .5; this.vz = Math.abs(this.vz) * .4 - 40; ev.push(['bar', { x: gx, y: yy }]); }
      }
      // the net: past the line inside the frame, the ball is held
      if ((this.x - gx) * dir > 3 && Math.abs(this.y - CY) < GH && this.z < BAR) {
        const depth = (this.x - gx) * dir;
        if (depth > 40) { this.x = gx + dir * 40; this.vx *= -.15; }
        this.vx *= Math.exp(-dt * 6); this.vy *= Math.exp(-dt * 4);
        if (Math.abs(this.y - CY) > GH - 2) { this.y = CY + Math.sign(this.y - CY) * (GH - 2); this.vy *= -.2; }
      }
    }
    return ev;
  }
  /** super strike flight paths: modify velocity each step */
  applyPath(dt, M) {
    const p = this.path; p.t += dt; if (p.t > p.dur || this.speed() < 40) { this.path = null; return; }
    const sp = this.speed() || 1, nx = -this.vy / sp, ny = this.vx / sp;
    if (p.type === 'wobble') { const a = Math.sin(p.t * 14 + p.ph) * 520 * dt; this.vx += nx * a; this.vy += ny * a; }
    else if (p.type === 'zigzag') { const a = (Math.floor(p.t * 7) % 2 ? 1 : -1) * 900 * dt; this.vx += nx * a; this.vy += ny * a; }
    else if (p.type === 'around') { const a = Math.sin(p.t * 6) * 640 * dt; this.vx += nx * a; this.vy += ny * a; }
    else if (p.type === 'meteor') { if (p.t < .08) this.vz += 900 * dt; }
    else if (p.type === 'hammer') { if (this.bounced) { p.hits = (p.hits || 0) + 1; this.vz = Math.max(this.vz, 130); } }
  }
};
