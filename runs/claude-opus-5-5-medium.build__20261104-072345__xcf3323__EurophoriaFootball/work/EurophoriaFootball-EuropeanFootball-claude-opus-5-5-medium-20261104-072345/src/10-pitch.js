/* 10-pitch: the pitch's geometry (world units, 1 tile = 16), the stadium's TileMap (stands, boards, aprons, nets) and
 * its floor texture by stadium (stripes, wear, mud, snow, wet sheen, puddles, lines). */
const TS = 16;
const P = (() => {
  const WS = 3, WB = 1, WA = 3, FW = 52, NS = 4, NA = 1, NB = 1, FH = 32, SB = 1, SA = 2;
  const COLS = WS + WB + WA + FW + WA + WB + WS, ROWS = NS + NA + NB + FH + SB + SA;
  const X0 = (WS + WB + WA) * TS, X1 = X0 + FW * TS, Y0 = (NS + NA + NB) * TS, Y1 = Y0 + FH * TS;
  return { WS, WB, WA, FW, NS, NA, NB, FH, SB, SA, COLS, ROWS, X0, X1, Y0, Y1, CX: (X0 + X1) / 2, CY: (Y0 + Y1) / 2, L: X1 - X0, W: Y1 - Y0,
    GH: 48, BAR: 36, NET: 32, BOX_D: 112, BOX_W: 160, GA_D: 40, GA_W: 88, SPOT: 80, CIRCLE: 64 };
})();
EF.Pitch = P;
// side s attacks toward goalX(s, half): side 0 attacks +x in the first half
P.attackDir = (s, swapped) => (s === 0) !== !!swapped ? 1 : -1;
P.goalLineX = dir => dir > 0 ? P.X1 : P.X0;
P.inBox = (goalDir, x, y) => { const gx = P.goalLineX(goalDir); return Math.abs(y - P.CY) < P.BOX_W && (goalDir > 0 ? x > gx - P.BOX_D && x <= gx + 4 : x < gx + P.BOX_D && x >= gx - 4); };
P.inGoalArea = (goalDir, x, y) => { const gx = P.goalLineX(goalDir); return Math.abs(y - P.CY) < P.GA_W && Math.abs(x - gx) < P.GA_D; };
P.inField = (x, y, m = 0) => x > P.X0 - m && x < P.X1 + m && y > P.Y0 - m && y < P.Y1 + m;
P.clampField = (x, y, m = 6) => [clamp(x, P.X0 + m, P.X1 - m), clamp(y, P.Y0 + m, P.Y1 - m)];
// the uv frame of a side: u from its own goal line (0) to the opponent's (1), v from the north touchline (0) to the south (1)
P.toWorld = (dir, u, v) => [dir > 0 ? P.X0 + u * P.L : P.X1 - u * P.L, P.Y0 + v * P.W];
P.toUV = (dir, x, y) => [dir > 0 ? (x - P.X0) / P.L : (P.X1 - x) / P.L, (y - P.Y0) / P.W];

/* ---- markings ---- */
function isLine(x, y) {
  const { X0, X1, Y0, Y1, CX, CY } = P, w = 1.2;
  if (x > X0 - w && x < X1 + w && (Math.abs(y - Y0) < w || Math.abs(y - Y1) < w)) return true;
  if (y > Y0 - w && y < Y1 + w && (Math.abs(x - X0) < w || Math.abs(x - X1) < w)) return true;
  if (y > Y0 && y < Y1 && Math.abs(x - CX) < w * .9) return true;
  const dc = hyp(x - CX, y - CY);
  if (Math.abs(dc - P.CIRCLE) < w * .9 || dc < 2) return true;
  for (const [gx, d] of [[X0, 1], [X1, -1]]) {
    const ix = (x - gx) * d;   // distance into the pitch from that goal line
    if (ix >= -w && ix <= P.BOX_D + w && Math.abs(y - CY) <= P.BOX_W + w && (Math.abs(ix - P.BOX_D) < w || Math.abs(Math.abs(y - CY) - P.BOX_W) < w)) return true;
    if (ix >= -w && ix <= P.GA_D + w && Math.abs(y - CY) <= P.GA_W + w && (Math.abs(ix - P.GA_D) < w || Math.abs(Math.abs(y - CY) - P.GA_W) < w)) return true;
    if (hyp(ix - P.SPOT, y - CY) < 1.8) return true;
    if (ix > P.BOX_D && Math.abs(hyp(ix - P.SPOT, y - CY) - 72) < w * .9) return true;
    for (const cy of [Y0, Y1]) if (Math.abs(hyp(ix, y - cy) - 8) < w * .8 && ix > 0) return true;
  }
  return false;
}

/* ---- the stadium's map: rows from the layout, floor texture from the stadium's look ---- */
function buildMap(st) {
  const { COLS, ROWS, WS, WB, WA, FW, NS, NA, NB, FH } = P, rows = [];
  const fieldC0 = WS + WB + WA, fieldR0 = NS + NA + NB, goalR0 = Math.floor((P.CY - P.GH) / TS), goalR1 = Math.ceil((P.CY + P.GH) / TS) - 1;
  for (let R = 0; R < ROWS; R++) {
    let s = '';
    for (let c = 0; c < COLS; c++) {
      const inBoardsX = c >= WS && c < COLS - WS, inBoardsY = R >= NS + NA && R < fieldR0 + FH + 1;
      const fieldRow = R >= fieldR0 && R < fieldR0 + FH, fieldCol = c >= fieldC0 && c < fieldC0 + FW;
      const westApron = c >= WS + WB && c < fieldC0, eastApron = c >= fieldC0 + FW && c < fieldC0 + FW + WA;
      if (R < NS) s += c < WS || c >= COLS - WS ? '5' : String(NS - R);   // north stand tiers: the back row (R = 0) highest
      else if (R < NS + NA) s += (c < WS || c >= COLS - WS) ? '4' : 'a';
      else if (!inBoardsY) s += R === fieldR0 + FH + 1 || R === fieldR0 + FH + 2 ? (c < WS || c >= COLS - WS ? '4' : 's') : ',';
      else if (c < WS) s += String(4 + Math.min(2, WS - 1 - c));   // west end stand
      else if (c >= COLS - WS) s += String(4 + Math.min(2, c - (COLS - WS)));
      else if (R === NS + NA || R === fieldR0 + FH) s += 'B';   // touchline boards
      else if (c === WS || c === COLS - WS - 1) s += 'E';   // end boards
      else if (fieldRow && fieldCol) s += '.';
      else if (fieldRow && (westApron || eastApron)) {
        const back = c === WS + WB || c === COLS - WS - WB - 1, inMouth = R >= goalR0 && R <= goalR1, side = R === goalR0 - 1 || R === goalR1 + 1;
        if (inMouth) s += back ? 'N' : ':';
        else if (side) s += 'N';
        else s += 'a';
      } else s += 'a';
    }
    rows.push(s);
  }
  const look = st.look || {}, grass = (look.grass || ['#3f7a34', '#4a8a3c']).map(E.hex), lineC = E.hex(look.lines || '#ece8dc');
  const snow = st.surface === 'snow', wet = st.surface === 'wet', hard = st.surface === 'hard';
  const mud = st.mud || [], puddles = [];
  const prng = E.rng(st.seed || 7);
  for (let i = 0; i < (st.puddles || 0); i++) puddles.push([P.X0 + 80 + prng() * (P.L - 160), P.Y0 + 40 + prng() * (P.W - 80), 10 + prng() * 10]);
  const wear = look.wear || 0;
  const tagAt = (x, y) => {
    for (const [u, v, r] of mud) { const mx = P.X0 + u * P.L, my = P.Y0 + v * P.W; if (hyp(x - mx, (y - my) * .8) < r) return 'mud'; }
    for (const [px_, py_, r] of puddles) if (hyp(x - px_, (y - py_) * 1.4) < r) return 'puddle';
    return null;
  };
  const apronC = E.hex(look.apron || '#3a3d44'), seats = (look.seats || ['#3a3a48', '#4a4a5a']).map(E.hex);
  const floorTex = (x, y, tag) => {
    const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .05, y * .05) - .5;
    if (tag === 'net') { const mesh = (Math.floor(x) % 4 === 0) || (Math.floor(y) % 4 === 0); const g = snow ? 200 : 70; return mesh ? [g * .5, g * .6, g * .5] : [g * .7 + n * 10, g + n * 14, g * .7 + n * 10]; }
    if (tag === 'apron') { const k = 1 + n * .25 + m * .2; return [apronC[0] * k, apronC[1] * k, apronC[2] * k]; }
    if (tag === 'side') { const k = 1 + n * .3; return [apronC[0] * k * .9, apronC[1] * k * .95, apronC[2] * k]; }
    if (tag === 'out') return [24 + n * 10, 24 + n * 10, 30 + n * 10];
    const t2 = tagAt(x, y);
    if (t2 === 'puddle') { const s = 1 + m * .3; return [70 * s, 96 * s, 120 * s + n * 20, .1]; }
    if (snow) {
      if (isLine(x, y)) return [56 + n * 20, 110 + n * 20, 50 + n * 10];   // the lines brushed clear down to the grass
      const lineNear = isLine(x + 2, y) || isLine(x - 2, y) || isLine(x, y + 2) || isLine(x, y - 2);
      if (lineNear) return [150 + n * 20, 170 + n * 16, 150 + n * 20];
      const w = 226 + n * 22 + m * 20; return [w - 6, w, w + 8];
    }
    let [r, g, b] = grass[Math.floor((x - P.X0) / 32) % 2 ? 1 : 0];
    const k = 1 + n * .18 + m * .16; r *= k; g *= k; b *= k;
    // wear: the goalmouths and the centre circle
    if (wear > 0) {
      const wv = Math.max(0, 1 - Math.min(hyp(x - P.X0 - 20, (y - P.CY) * .7), hyp(x - P.X1 + 20, (y - P.CY) * .7)) / 60, 1 - hyp(x - P.CX, y - P.CY) / 70) * wear;
      if (wv > 0) { r = lerp(r, 120 + n * 20, wv * .6); g = lerp(g, 100 + n * 20, wv * .6); b = lerp(b, 60, wv * .6); }
    }
    if (t2 === 'mud') { r = 90 + n * 20 + m * 20; g = 66 + n * 14; b = 40 + n * 10; }
    if (isLine(x, y) && t2 !== 'mud') { const w = 1 + n * .1; return [lineC[0] * w, lineC[1] * w, lineC[2] * w]; }
    if (wet) { const sheen = (Math.floor(x + y * .5) % 7 === 0) ? 1.18 : 1; r *= sheen; g *= sheen; b *= sheen * 1.06; }
    if (hard) { r *= 1.06; g *= 1.02; b *= .92; }
    return [r, g, b];
  };
  const tiers = look.tiers || [34, 44, 54, 64];
  const seatSide = E.shade((look.seats || ['#3a3a48'])[0], -.35), seatTop = E.shade((look.seats || ['#3a3a48'])[0], -.15);
  const tierType = h => ({ h, face: look.standFace || 'plank', side: look.standSide && look.standFace ? look.standSide : seatSide, top: look.standTop && look.standFace ? look.standTop : seatTop, roof: 'plain', line: '#0a0a12' });
  const map = new E.TileMap({ rows, floorTex, outside: false, ao: 4,
    legend: { '.': { floor: 'grass' }, ':': { floor: 'net' }, a: { floor: 'apron' }, s: { floor: 'side' }, ',': { floor: 'out' }, B: 8, E: 9, N: { floor: 'net' },
      1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 },
    types: { 1: tierType(tiers[0]), 2: tierType(tiers[1]), 3: tierType(tiers[2]), 4: tierType(tiers[3] || 64), 5: tierType((tiers[3] || 64) + 8), 6: tierType((tiers[3] || 64) + 16), 7: tierType((tiers[3] || 64) + 16),
      8: { h: 26, cut: true, cutH: 6, face: 'plank', side: look.boards || '#1c2a5a', top: '#2a2e3a', line: '#0e1430' },
      9: { h: 18, face: 'plank', side: look.boards || '#1c2a5a', top: '#2a2e3a', line: '#0e1430' },
      10: { h: P.BAR + 4, face: 'none', side: '#c8ccd8', top: '#e8ecf4' } } });
  map.tagAt = tagAt; map.puddles = puddles; map.seats = seats;
  return map;
}
EF.buildMap = buildMap;
