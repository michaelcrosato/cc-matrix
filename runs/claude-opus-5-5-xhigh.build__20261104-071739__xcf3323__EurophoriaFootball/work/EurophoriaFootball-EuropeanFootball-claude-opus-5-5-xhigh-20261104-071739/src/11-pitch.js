/* THE PITCH (section 6.1): 52 x 32 tiles of grass inside boards, a goal at each end with its net, an apron, stands.
 * Built from rows like the SPORTS kit's cage: the north stand (6 rows of tiers), the north apron, the boards, the field,
 * the south boards (cut low before the camera), the south apron (dugouts, the fourth official), the outside. West and
 * east: the end stand (4 tiers), the low end boards, the goal-end apron (where the ball goes out), the field. */
const P = EF.P = (() => {
  const T = 16, NS = 6, END = 4, APR = 3, FW = 52, FH = 32;
  const COLS = END + 1 + APR + FW + APR + 1 + END, ROWS = NS + 1 + 1 + FH + 1 + 2 + 2;
  const X0 = (END + 1 + APR) * T, X1 = X0 + FW * T, Y0 = (NS + 2) * T, Y1 = Y0 + FH * T;
  return { T, NS, END, APR, FW, FH, COLS, ROWS, X0, X1, Y0, Y1, L: X1 - X0, W: Y1 - Y0, CX: (X0 + X1) / 2, CY: (Y0 + Y1) / 2,
    GH: 48, BAR: 36, NET: 30, BOX_D: 112, BOX_H: 160, GA_D: 40, GA_H: 88, SPOT: 80, CIRCLE: 64, ARC: 72, POST: 2,
    BOARD_N: (NS + 1) * T, BOARD_S: Y1 + T, END_W: END * T, END_E: (COLS - END) * T };
})();
/** the field's paint: lines within w of a marking (section 6.1) */
P.isLine = (x, y, w = 1) => {
  const { X0, X1, Y0, Y1, CX, CY } = P;
  if (x < X0 - w || x > X1 + w || y < Y0 - w || y > Y1 + w) return false;
  const ex = Math.min(Math.abs(x - X0), Math.abs(x - X1)), ey = Math.min(Math.abs(y - Y0), Math.abs(y - Y1));
  if (ex < w + .5 || ey < w + .5) return true;
  if (Math.abs(x - CX) < w && y > Y0 && y < Y1) return true;
  const dc = Math.hypot(x - CX, y - CY); if (Math.abs(dc - P.CIRCLE) < w || dc < 2.2) return true;
  for (const gx of [X0, X1]) {
    const into = Math.abs(x - gx), dy = Math.abs(y - CY), s = gx === X0 ? 1 : -1;
    if ((Math.abs(into - P.BOX_D) < w && dy <= P.BOX_H) || (into <= P.BOX_D && Math.abs(dy - P.BOX_H) < w)) return true;
    if ((Math.abs(into - P.GA_D) < w && dy <= P.GA_H) || (into <= P.GA_D && Math.abs(dy - P.GA_H) < w)) return true;
    const sx = gx + s * P.SPOT; if (Math.hypot(x - sx, y - CY) < 1.8) return true;
    if (Math.abs(Math.hypot(x - sx, y - CY) - P.ARC) < w && into > P.BOX_D) return true;
  }
  for (const cx of [X0, X1]) for (const cy of [Y0, Y1]) if (Math.abs(Math.hypot(x - cx, y - cy) - 8) < w && Math.abs(x - cx) < 9 && Math.abs(y - cy) < 9) return true;
  return false;
};
P.inField = (x, y) => x >= P.X0 && x <= P.X1 && y >= P.Y0 && y <= P.Y1;
/** inside the penalty area that side s defends (gx: the goal line's x) */
P.inBoxAt = (gx, x, y) => Math.abs(x - gx) <= P.BOX_D && Math.abs(y - P.CY) <= P.BOX_H && (gx === P.X0 ? x >= P.X0 - 2 : x <= P.X1 + 2);
P.inGoalAreaAt = (gx, x, y) => Math.abs(x - gx) <= P.GA_D && Math.abs(y - P.CY) <= P.GA_H;
/** the ball over a goal line: -1 (west), 1 (east) or 0 */
P.crossedGoalLine = b => b.x < P.X0 - b.r ? -1 : b.x > P.X1 + b.r ? 1 : 0;
P.inGoal = b => P.crossedGoalLine(b) !== 0 && Math.abs(b.y - P.CY) < P.GH - 2 && b.z < P.BAR - 2;
P.overTouchline = b => b.y < P.Y0 - 7 || b.y > P.Y1 + 7;

/* ---- surfaces: grass, wet, hard, snow, mud, puddles (section 6.2) ---- */
EF.SURF = { grass: { fr: 1, bo: .55 }, wet: { fr: .7, bo: .45 }, hard: { fr: .8, bo: .6 }, snow: { fr: 1.7, bo: .35 }, mud: { fr: 3, bo: .2 }, puddle: { fr: 4, bo: .12 } };

/* ---- the stadium's map and its look, built once a stadium and weather ---- */
const PITCH_CACHE = new Map();
EF.Pitch = {
  get(st, weather) {
    const key = st.id + ':' + (weather ? weather.kind : 'clear');
    if (!PITCH_CACHE.has(key)) PITCH_CACHE.set(key, this.build(st, weather));
    return PITCH_CACHE.get(key);
  },
  build(st, weather) {
    const rr = E.rng((st.id.length * 7919 + st.id.charCodeAt(0) * 31) >>> 0);
    const snow = weather && weather.kind === 'snow', wet = weather && weather.kind === 'rain';
    const puddles = [], mud = [];
    if (wet) for (let i = 0; i < (st.puddles || 4); i++) puddles.push({ x: P.X0 + 60 + rr() * (P.L - 120), y: P.Y0 + 40 + rr() * (P.W - 80), r: 7 + rr() * 9 });
    for (const m of st.mud || []) mud.push({ x: P.X0 + m[0] * P.L, y: P.Y0 + m[1] * P.W, r: m[2] });
    const tiers = st.stands || {}, north = Math.min(P.NS, (tiers.north && tiers.north.tiers) || 5), end = Math.min(P.END, (tiers.end && tiers.end.tiers) || 4);
    const tierH = (tiers.north && tiers.north.heights) || [34, 44, 54, 64, 74, 84];
    const rows = [];
    for (let r = 0; r < P.ROWS; r++) {
      let s = '';
      for (let c = 0; c < P.COLS; c++) {
        const x = c * P.T + 8, y = r * P.T + 8;
        let ch = ',';
        if (r < P.NS) { const tier = P.NS - 1 - r; ch = tier < north ? String.fromCharCode(65 + tier) : ','; }   // A front tier .. F back
        else if (r === P.NS) ch = c < P.END || c >= P.COLS - P.END ? endCh(c) : ':';
        else if (r === P.NS + 1) ch = c < P.END || c >= P.COLS - P.END ? endCh(c) : c === P.END || c === P.COLS - P.END - 1 ? 'e' : 'b';
        else if (r <= P.NS + 1 + P.FH) {
          if (c < P.END || c >= P.COLS - P.END) ch = endCh(c);
          else if (c === P.END || c === P.COLS - P.END - 1) ch = 'e';
          else if (x < P.X0 || x > P.X1) ch = Math.abs(y - P.CY) < P.GH + 4 && Math.abs((x < P.X0 ? P.X0 : P.X1) - x) < P.NET + 4 ? 'n' : ':';
          else ch = '.';
        }
        else if (r === P.NS + 2 + P.FH) ch = c < P.END || c >= P.COLS - P.END ? endCh(c) : c === P.END || c === P.COLS - P.END - 1 ? 'e' : 's';
        else if (r <= P.NS + 4 + P.FH) ch = c < P.END || c >= P.COLS - P.END ? ',' : ';';
        s += ch;
      }
      rows.push(s);
    }
    function endCh(c) { const tier = c < P.END ? P.END - 1 - c : c - (P.COLS - P.END); return tier < end ? String.fromCharCode(97 + 6 + tier) : ','; }   // g h i j: end tiers
    const seat = (tiers.north && tiers.north.seats) || st.seats || '#3a3a52', seat2 = st.seats2 || E.shade(seat, .15);
    const types = {
      1: { h: 26, face: 'plank', side: st.boardSide || '#24304e', top: '#d8dce8', line: '#1a2236' },
      2: { h: 26, cut: true, cutH: 5, face: 'plank', side: st.boardSide || '#24304e', top: '#d8dce8', line: '#1a2236' },
      3: { h: 18, face: 'plank', side: st.boardSide || '#24304e', top: '#c8ccd8', line: '#1a2236' }
    };
    const legend = { '.': { floor: 'grass' }, ':': { floor: 'apron' }, ';': { floor: 'apron' }, ',': { floor: 'out' }, n: { floor: 'net' }, b: 1, s: 2, e: 3 };
    for (let t = 0; t < P.NS; t++) { const id = 10 + t; types[id] = { h: tierH[t] || 34 + t * 10, face: st.standFace || 'stone', side: E.shade(st.standSide || '#4a4a5c', -t * .05), top: t % 2 ? seat2 : seat, roof: 'plain', line: '#141420' }; legend[String.fromCharCode(65 + t)] = id; }
    for (let t = 0; t < P.END; t++) { const id = 20 + t; types[id] = { h: [28, 38, 48, 58][t], face: st.standFace || 'stone', side: E.shade(st.standSide || '#4a4a5c', -t * .06), top: t % 2 ? seat2 : seat, roof: 'plain', line: '#141420' }; legend[String.fromCharCode(97 + 6 + t)] = id; }
    const grass = (st.grass || ['#3f7a34', '#4a8a3c']).map(E.hex), lines = E.hex(st.lines || '#e8ece0'), wear = st.wear || .3;
    const apron = E.hex(st.apron || '#3a4a3a'), out = E.hex(st.outside || '#22242c'), netC = E.hex('#2e5a30');
    const snowC = E.hex('#e8eef6'), mudC = E.hex('#5a4228'), pud = E.hex('#5a7a90');
    const floorTex = (x, y, tag) => {
      const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .05, y * .05) * .5;
      if (tag === 'out') return [out[0] + n * 14, out[1] + n * 14, out[2] + n * 16];
      if (tag === 'apron' || tag === 'net') {
        if (tag === 'net' && (Math.floor(x) % 4 === 0 || Math.floor(y) % 4 === 0)) return [netC[0] * .7, netC[1] * .7, netC[2] * .7];
        const c = snow ? snowC : apron; return [c[0] + n * 16 + m * 10, c[1] + n * 16 + m * 10, c[2] + n * 16 + m * 10];
      }
      const stripe = Math.floor((x - P.X0) / 32) % 2 ? 1 : 0, g = stripe ? grass[1] : grass[0];
      let c = [g[0] + n * 18 + m * 16, g[1] + n * 22 + m * 22, g[2] + n * 14 + m * 12];
      // wear: the goalmouths and the centre circle, by stadium
      const wg = Math.min(Math.hypot((x - P.X0) * .9, y - P.CY), Math.hypot((x - P.X1) * .9, y - P.CY)), wc = Math.hypot(x - P.CX, y - P.CY);
      const w = wear * (Math.max(0, 1 - wg / 70) * .8 + Math.max(0, 1 - wc / 50) * .4) * (.6 + m);
      if (w > 0) c = [lerp(c[0], 118, w), lerp(c[1], 96, w), lerp(c[2], 60, w)];
      for (const q of mud) { const d = Math.hypot(x - q.x, y - q.y) / q.r + n * .4; if (d < 1) { const k = clamp((1 - d) * 2, 0, 1); c = [lerp(c[0], mudC[0] + n * 20, k), lerp(c[1], mudC[1] + n * 16, k), lerp(c[2], mudC[2] + n * 10, k)]; } }
      if (snow) { const k = clamp(.5 + m * .5 + E.noise2(x * .013, y * .02) * .25, .25, .85); c = [lerp(c[0], snowC[0] - 30 + n * 16, k), lerp(c[1], snowC[1] - 22 + n * 16, k), lerp(c[2], snowC[2] - 12 + n * 12, k)]; }
      if (P.isLine(x, y)) { const k = snow ? .9 : .92; const lw = lines[0] + n * 20; c = [lerp(c[0], lw, k), lerp(c[1], lines[1] + n * 20, k), lerp(c[2], lines[2] + n * 20, k)]; if (snow) c = [c[0] * .9, c[1] * .92, c[2] * .75]; }
      for (const q of puddles) { const d = Math.hypot(x - q.x, (y - q.y) * 1.3) / q.r + n * .25; if (d < 1) { const k = d < .7 ? 1 : (1 - d) / .3; c = [lerp(c[0], pud[0] + m * 30, k), lerp(c[1], pud[1] + m * 30, k), lerp(c[2], pud[2] + m * 30, k)]; } }
      if (wet && E.hash2(Math.floor(x / 3), Math.floor(y / 2)) > .93) c = [c[0] + 30, c[1] + 34, c[2] + 40];   // the wet sheen
      return c;
    };
    const map = new E.TileMap({ rows, legend, types, floorTex, outside: st.outside || '#16181e', ao: 4 });
    return { map, rows, puddles, mud, snow, wet, stadium: st,
      surfaceAt(x, y, base) {
        for (const q of puddles) if (Math.hypot(x - q.x, (y - q.y) * 1.3) < q.r * .85) return 'puddle';
        for (const q of mud) if (Math.hypot(x - q.x, y - q.y) < q.r * .8) return 'mud';
        return base;
      } };
  }
};
