/* ---- THE RINK: a TileMap of 70 x 44 cells of 16 units. The ice is the rounded rectangle inside; the glass and the boards
 * are the wall cells around it (glass inside, boards outside). A glass cell a hit breaks is set to 0 (open ice). The
 * nets are boxes the skaters can't enter; the puck scores by crossing a goal line inside the mouth, under the bar. ---- */
const TC = 16, COLS = 70, ROWS = 44, CX = 560, CY = 400, HL = 432, HW = 192, RAD = 96;
const GX = [176, 944];                 // the goal lines: GX[0] is west (team 0 defends it), GX[1] east
const MOUTH = 16, BAR_Z = 20, GLASS_H = 28, BOARD_H = 14;
const NETS = [{ x0: 156, x1: 174, y0: 378, y1: 422 }, { x0: 946, x1: 964, y0: 378, y1: 422 }];   // (behind the goal lines: the puck crosses them before it meets the net)
const FACEOFF = [[CX, CY], [CX - 288, CY - 96], [CX - 288, CY + 96], [CX + 288, CY - 96], [CX + 288, CY + 96], [CX - 84, CY - 96], [CX - 84, CY + 96], [CX + 84, CY - 96], [CX + 84, CY + 96]];

// signed distance from (x, y) to the rounded rectangle of the ice: negative inside, positive outside
const sdRect = (x, y) => {
  const qx = Math.abs(x - CX) - (HL - RAD), qy = Math.abs(y - CY) - (HW - RAD), ox = Math.max(qx, 0), oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - RAD;
};
/** a rink map: the glass ring (cells just outside the ice), the boards outside it, the ice inside */
function buildRink(arena) {
  const rows = [];
  for (let cy = 0; cy < ROWS; cy++) {
    let s = '';
    for (let cx = 0; cx < COLS; cx++) {
      const sd = sdRect((cx + .5) * TC, (cy + .5) * TC);
      s += sd > 0 && sd <= 16 ? 'g' : sd > 16 && sd <= 32 ? 'b' : '.';
    }
    rows.push(s);
  }
  const floorTex = (x, y) => {
    const sd = sdRect(x, y);
    if (sd > 0) return [58, 54, 66];   // outside the glass: concrete
    const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .05, y * .05) * .5;
    const mk = markings(x, y);
    if (mk) return mk;
    const [r, g, b] = arena.ice, k = 1 - Math.max(0, sd + 24) / 120 * .08;   // (a little shade toward the boards)
    return [(r + n * 8 + m * 6) * k, (g + n * 8 + m * 6) * k, (b + n * 6 + m * 4) * k];
  };
  const types = {
    1: { h: BOARD_H, top: arena.boardTop, side: arena.boardSide, line: '#1a1a24', cut: true, cutH: 6, face: 'plank' },
    2: { h: GLASS_H, top: arena.glass, side: arena.glass, cut: true, cutH: 8, face: 'none' }
  };
  return new E.TileMap({ rows, legend: { b: 1, g: 2, '.': 0 }, types, floorTex, outside: '#2a2630', ao: 3 });
}
/** the paint: red and blue lines, the circles, the dots, the creases */
function markings(x, y) {
  const red = [200, 48, 48], blue = [42, 74, 200], crease = [159, 211, 255];
  if (Math.abs(x - GX[0]) < 1.5 || Math.abs(x - GX[1]) < 1.5) return red;
  if (x < GX[0] || x > GX[1]) return null;
  if (Math.abs(x - CX) < 2.5) return red;
  if (Math.abs(x - (CX - 108)) < 2.5 || Math.abs(x - (CX + 108)) < 2.5) return blue;
  const d = Math.hypot(x - CX, y - CY);
  if (Math.abs(d - 72) < 1.2 || d < 3) return blue;
  for (const [fx, fy] of FACEOFF) {
    if (fx === CX) continue;
    const df = Math.hypot(x - fx, y - fy);
    if (Math.abs(df - 18) < 1.1 || df < 2.2) return red;
  }
  for (const gx of GX) {
    const dg = Math.hypot(x - gx, y - CY);
    if (Math.abs(dg - 28) < 1.1 && (gx === GX[0] ? x > gx : x < gx)) return red;
    if (dg < 28 && (gx === GX[0] ? x > gx : x < gx)) return crease;
  }
  return null;
}
/** the wall cell at a world point, its id (0 open, 1 boards, 2 glass, -1 outside the map) */
const cellId = (map, x, y) => map.cell(Math.floor(x / TC), Math.floor(y / TC));
/** push a circle (x, y, r) out of solid cells and out of the nets; returns the last thing it hit (its normal and cell) */
function pushOut(map, b, r) {
  let hit = null;
  const x0 = Math.floor((b.x - r) / TC), x1 = Math.floor((b.x + r) / TC), y0 = Math.floor((b.y - r) / TC), y1 = Math.floor((b.y + r) / TC);
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
    const id = map.cell(cx, cy);
    if (id <= 0) continue;
    const rx0 = cx * TC, ry0 = cy * TC, rx1 = rx0 + TC, ry1 = ry0 + TC;
    const qx = clamp(b.x, rx0, rx1), qy = clamp(b.y, ry0, ry1), dx = b.x - qx, dy = b.y - qy, d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    let nx, ny;
    if (d2 > 1e-9) { const d = Math.sqrt(d2); nx = dx / d; ny = dy / d; b.x = qx + nx * r; b.y = qy + ny * r; }
    else {
      const left = b.x - rx0, right = rx1 - b.x, up = b.y - ry0, down = ry1 - b.y, m = Math.min(left, right, up, down);
      if (m === left) { nx = -1; ny = 0; b.x = rx0 - r; } else if (m === right) { nx = 1; ny = 0; b.x = rx1 + r; }
      else if (m === up) { nx = 0; ny = -1; b.y = ry0 - r; } else { nx = 0; ny = 1; b.y = ry1 + r; }
    }
    hit = { nx, ny, cx, cy, id };
  }
  for (const n of NETS) {
    const qx = clamp(b.x, n.x0, n.x1), qy = clamp(b.y, n.y0, n.y1), dx = b.x - qx, dy = b.y - qy, d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    if (d2 > 1e-9) { const d = Math.sqrt(d2); const nx = dx / d, ny = dy / d; b.x = qx + nx * r; b.y = qy + ny * r; hit = { nx, ny, net: true }; }
    else { const left = b.x - n.x0, right = n.x1 - b.x, up = b.y - n.y0, down = n.y1 - b.y, m = Math.min(left, right, up, down); hit = { net: true, nx: 0, ny: 0 };
      if (m === left) { b.x = n.x0 - r; hit.nx = -1; } else if (m === right) { b.x = n.x1 + r; hit.nx = 1; } else if (m === up) { b.y = n.y0 - r; hit.ny = -1; } else { b.y = n.y1 + r; hit.ny = 1; } }
  }
  return hit;
}
/** the skater's or goalie's reach to a glass cell at speed: a broken panel (its id set to open) */
const isGlass = (map, cx, cy) => map.cell(cx, cy) === 2;
/** the face-off spot nearest a point, out of play */
const nearestFaceoff = (x, y) => FACEOFF.slice().sort((a, b) => Math.hypot(a[0] - x, a[1] - y) - Math.hypot(b[0] - x, b[1] - y))[0];
/** a point inside the ice (the rink's rounded rectangle), clear of its boards */
const onIce = (x, y) => sdRect(x, y) < -8;
