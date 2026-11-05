/* ---- THE ARENA (plan §6.1): one TileMap, 48 x 28 tiles (768 x 448). Rows 0-5 are the stands (four tiers, heights 48 at
 * the back down to 12 at the front), rows 6 and 25-27 the aprons, rows 7-24 the court, columns 0-1 and 46-47 the low
 * ends. The court's lines and logos are painted into the floor by the court's own painter (floorTex in world units). ---- */
const ARENA_COLS = 48, ARENA_ROWS = 28;
const COURT_X0 = OX, COURT_X1 = OX + CW, COURT_Y0 = OY, COURT_Y1 = OY + CH;   // the lines, world units
const PLAY_X = [40, 728], PLAY_Y = [88, 424];                              // the invisible walls, 24 outside the lines
const TIER_H = [48, 36, 24, 12];                                           // stand heights, back to front (wall types 4 .. 1)

const arenaRows = () => {
  const rows = [];
  for (let r = 0; r < ARENA_ROWS; r++) {
    let s = '';
    for (let c = 0; c < ARENA_COLS; c++) {
      let ch = '.';
      if (r <= 1) ch = '4'; else if (r === 2 || r === 3) ch = '3'; else if (r === 4) ch = '2'; else if (r === 5) ch = '1';
      else if (r >= 7 && r <= 24 && (c <= 1 || c >= 46)) ch = '2';           // the low ends behind the baselines
      else if (r === 27) ch = '1';                                            // the camera side's low fence
      else if (r >= 7 && r <= 24) ch = '_';                                   // the court
      if (r >= 6 && r <= 26 && c <= 1 && ch === '.') ch = ',';
      s += ch;
    }
    rows.push(s);
  }
  return rows;
};

/* the lines of a court, in court-local units (plan §6.1): 'out' the boundary, 'line' the paint, 'three' the arc and the
 * corner lines. The two ends mirror: x is the distance from the nearest baseline. */
const lineAt = (lx, ly) => {
  const w = 1.1;
  if (lx < -w || lx > CW + w || ly < -w || ly > CH + w) return null;
  if (lx < w || lx > CW - w || ly < w || ly > CH - w) return 'out';
  if (Math.abs(lx - MIDX) < w) return 'line';                                     // half-court
  if (Math.abs(Math.hypot(lx - MIDX, ly - MIDY) - 40) < w) return 'line';         // centre circle
  const x = lx <= MIDX ? lx : CW - lx;                                            // distance from the nearer baseline
  if (Math.abs(Math.hypot(x - 52, ly - MIDY) - 136) < w && ly >= 20 && ly <= 268) return 'three';   // the three-point arc
  if ((Math.abs(ly - 20) < w || Math.abs(ly - 268) < w) && x <= 108 + w) return 'three';            // the corner lines
  if (Math.abs(x - 152) < w && ly >= 96 && ly <= 192) return 'line';              // the free-throw line
  if ((Math.abs(ly - 96) < w || Math.abs(ly - 192) < w) && x <= 152) return 'line'; // the key's sides
  if (Math.abs(Math.hypot(x - 152, ly - MIDY) - 48) < w && x >= 152) return 'line'; // the free-throw circle
  return null;
};

/* the floor's tag to its color: the court's palette decides; grain and noise are E.hash2 and E.noise2 (so it never
 * flickers); the logo is a mask drawn in the floor's centre by the court painter */
const paintCourt = (court, x, y, tag) => {
  const lx = x - OX, ly = y - OY, n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .05, y * .05) * .5;
  if (tag === 'apron') { const g = 70 + n * 14 + m * 12; return [g * .9, g * .86, g]; }
  if (tag === 'edge') return [40 + n * 8, 38 + n * 8, 48 + n * 8];
  const pal = court.floor;
  const ln = lineAt(lx, ly);
  if (ln === 'out') return pal.out;
  if (ln === 'line') return pal.line;
  if (ln === 'three') return pal.three;
  const logo = court.logoMask ? court.logoMask(lx, ly) : null;
  if (logo) return logo;
  return pal.base(lx, ly, n, m);
};

/* a court's painter for TileMap's floorTex: floorTex(x, y, tag) in world units */
const floorPainter = court => (x, y, tag) => paintCourt(court, x, y, tag);

/* the arena's TileMap for a court: its floor painter and its walls' colors */
const buildArena = court => {
  const rows = arenaRows();
  const legend = { '4': 4, '3': 3, '2': 2, '1': 1, '.': { floor: 'apron' }, '_': { floor: 'court' }, ',': { floor: 'edge' } };
  const types = {
    1: { h: 12, face: 'stone', side: court.stand.low, top: court.stand.top, cut: true, cutH: 6 },
    2: { h: 24, face: 'stone', side: court.stand.mid, top: court.stand.top },
    3: { h: 36, face: 'stone', side: court.stand.high, top: court.stand.top },
    4: { h: 48, face: 'stone', side: court.stand.back, top: court.stand.top }
  };
  const map = new E.TileMap({ rows, legend, types, floorTex: floorPainter(court), outside: court.outside || '#1a1820', ao: 4 });
  return map;
};
