/* AMERICAN FOOTBALL FIASCO: the stadium. A TileMap of 120 x 64 tiles: the stands at the top and bottom (walls, with a crowd drawn
 * on their tops), the boards at the sidelines (low walls), the end zones at the left and right, and the turf between, painted by
 * floorTex: stripes every five yards, the yard lines, the sidelines, the end zones in the teams' colors. The map is rebuilt when a
 * chapter changes the opponent's colors. */
(() => {
'use strict';
const FF = window.FF, E = FF.E, D = FF.data, { px } = FF;
const F = FF.field = {};

// tile columns: 0..9 the left end zone, 10..109 the field (a yard per tile), 110..119 the right end zone. Rows: 0..3 the top
// stands, 4 the top boards, 5..58 the field (54 yards), 59 the bottom boards, 60..63 the bottom stands.
const COLS = 120, ROWS = 64;
F.build = (leftColor, rightColor) => {
  const rows = [];
  for (let r = 0; r < ROWS; r++) {
    let s = '';
    for (let c = 0; c < COLS; c++) {
      if (r <= 3 || r >= 60) s += '#';                                  // the stands: walls
      else if (r === 4 || r === 59) s += '=';                           // the boards along the sidelines
      else if (c === 0 || c === COLS - 1) s += '#';                     // the back of each end zone
      else if (c < 10) s += 'L';                                        // the left end zone
      else if (c >= 110) s += 'R';                                      // the right end zone
      else s += '.';                                                    // the field
    }
    rows.push(s);
  }
  const yardLine = x => Math.abs(((x - D.FX0) % 80 + 80) % 80) < 1.6;   // every five yards
  const stripe = x => Math.floor((x - D.FX0) / 80) % 2 === 0;
  const floorTex = (x, y, tag) => {
    const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .05, y * .05) * .5;
    if (tag === 'L' || tag === 'R') {                                   // the end zones: the team's color, with a stripe
      const c = tag === 'L' ? leftColor : rightColor, k = 1 + n * .08;
      const rgb = E.hex(c);
      return [rgb[0] * k, rgb[1] * k, rgb[2] * k];
    }
    if (y < D.FY0 + 1.5 || y > D.FY1 - 1.5) return [228 + n * 18, 230 + n * 18, 222 + n * 18];   // the sideline, painted
    if (x > D.FX0 && x < D.FX1 && yardLine(x)) return [226 + n * 12, 228 + n * 12, 220 + n * 12];
    const g = (stripe(x) ? 128 : 102) + n * 22 + m * 22;               // the turf, mown in stripes each five yards
    return [g * .40, g, g * .44];
  };
  F.map = new E.TileMap({ rows, legend: { '#': 1, '=': 2, L: { floor: 'L' }, R: { floor: 'R' }, '.': { floor: 'turf' } },
    floorTex, outside: '#16141c', ao: 4,
    types: {
      1: { h: 40, cut: true, cutH: 6, face: 'plank', side: '#3a3346', top: '#5a5068', line: '#2a2436' },
      2: { h: 8, face: 'none', side: '#b8bcc8', top: '#e8ecf4' }
    } });
  F.map.rows = rows;
  // the crowd: two a tile, on the tops of the stands, in their own colors (the Fiscos' on their side, the rest mixed)
  F.crowd = [];
  for (const [r, z] of [[1, 40], [2, 40], [0, 40], [61, 40], [62, 40], [63, 40]]) {
    for (let c = 2; c < COLS - 2; c += 1) {
      const h = E.hash2(c * 7 + r, r * 13 + 3);
      if (h < .15) continue;
      const left = c < 60;
      F.crowd.push({ x: c * D.YD + 8, y: r * D.YD + 8, z: z + 4, shirt: left ? (h < .5 ? D.TEAMS[0].cloth : '#f0e6d8') : (h < .5 ? D.TEAMS[1].cloth : '#3a4a8a'), skin: ['#e0b090', '#a87050', '#6a4028', '#f0c8a8'][(h * 50 | 0) % 4], ph: h * 9, side: left ? 0 : 1 });
    }
  }
  F.leftColor = leftColor; F.rightColor = rightColor;
  return F.map;
};

// the crowd: each figure bobs, jumps on a score (the side that scored is the one that cheers)
F.drawCrowd = (r, t, cheerSide, excite) => {
  for (const f of F.crowd) {
    const bob = cheerSide === f.side && excite > 0 ? Math.abs(Math.sin(t * 9 + f.ph)) * 6 : Math.sin(t * 2 + f.ph) * .6;
    r.queue(f.x, f.y, f.z + bob, g => {
      const [x, y] = r.w(f.x, f.y, f.z + bob), X = Math.round(x), Y = Math.round(y);
      px.rect(g, X - 2, Y - 5, 4, 5, f.shirt); px.rect(g, X - 1, Y - 8, 3, 3, f.skin);
    });
  }
};

// the stadium's lights: high up at the corners of the stands, bright at the field (the tile's world units)
F.lights = () => {
  const L = FF.L;
  if (!L) return;
  for (const [x, y] of [[300, 40], [900, 40], [1500, 40], [300, 1000], [900, 1000], [1500, 1000]]) L.add(x, y, 120, 360, .55, { color: '#fff4dc' });
};
})();
