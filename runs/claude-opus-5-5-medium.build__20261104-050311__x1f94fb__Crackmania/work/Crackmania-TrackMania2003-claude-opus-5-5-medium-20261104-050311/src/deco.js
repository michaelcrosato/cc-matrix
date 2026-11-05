// Scenery: a seeded scatter over the cells no track piece uses, trackside dressing (chevron boards on tight turns, tyre
// stacks / hay bales / snowbanks outside bends, grandstands at start and finish), and the editor's own scenery pieces.
// Pure numbers (metres), so physics (solid props) and the view agree.
import { BLOCKS, HEAD, CELL } from './blocks.js';
import { ORIGIN, GRID, cellCenter } from './track.js';
import { rng, strHash } from './v3.js';

const MIX = {
  dustbowl: { rate: .32, kinds: [['cactus', 40], ['barrelcactus', 20], ['rock', 20], ['tumbleweed', 5], ['pumpjack', 5], ['billboard', 10]] },
  hedgerow: { rate: .45, kinds: [['tree', 35], ['bush', 20], ['hay', 15], ['fence', 10], ['cow', 8], ['barn', 5], ['windmill', 3]] },
  frostpeak: { rate: .42, kinds: [['pine', 55], ['rock', 15], ['chalet', 8], ['snowman', 6], ['iceblock', 6], ['lamp', 10]] }
};
const SOLID = { cactus: .5, barrelcactus: .7, rock: 1.4, tree: .5, bush: 1, hay: .9, pine: .5, snowman: .8, iceblock: 1, chalet: 4, barn: 5, pumpjack: 1.5, windmill: 1.5, billboard: .3, lamp: .2, tyres: .8, cones: .3, grandstand: 0, cow: .8 };
const ED = { '@tree': 'tree', '@rock': 'rock', '@cactus': 'cactus', '@pine': 'pine', '@hay': 'hay', '@cone': 'cones', '@tyres': 'tyres', '@snowman': 'snowman' };

export function decoFor(track) {
  const env = track.env, M = MIX[env], R = rng(strHash((track.id || track.name || 'x') + env)), out = [];
  const used = new Set();
  for (const b of track.blocks) for (const [x, y] of track.cellsOf(b.type, b.cx, b.cy, b.L, b.rot)) used.add(x + ',' + y);
  const ch = track.chasms();
  const bb = track.bounds(), pad = 5;
  const total = M.kinds.reduce((s, k) => s + k[1], 0);
  for (let cy = Math.max(0, bb.y0 - pad); cy <= Math.min(GRID - 1, bb.y1 + pad); cy++) for (let cx = Math.max(0, bb.x0 - pad); cx <= Math.min(GRID - 1, bb.x1 + pad); cx++) {
    const k = cx + ',' + cy; if (used.has(k) || ch[k]) continue;
    // keep the cells right beside the road clear (you drive off there)
    let near = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (used.has((cx + dx) + ',' + (cy + dy))) near = true;
    const n = near ? 1 : 2 + Math.floor(R() * 2);
    for (let i = 0; i < n; i++) {
      if (R() > (near ? M.rate * .5 : M.rate)) continue;
      let pick = R() * total, kind = M.kinds[0][0]; for (const [kk, w] of M.kinds) { if ((pick -= w) < 0) { kind = kk; break; } }
      if (near && /barn|chalet|pumpjack|windmill|billboard/.test(kind)) kind = env === 'dustbowl' ? 'rock' : env === 'hedgerow' ? 'bush' : 'pine';
      const [x0, y0] = cellCenter(cx, cy), ox = near ? (R() - .5) * 6 : (R() - .5) * 22, oy = near ? (R() - .5) * 6 : (R() - .5) * 22;
      out.push({ kind, x: x0 + ox, y: y0 + oy, yaw: R() * Math.PI * 2, s: .8 + R() * .5, seed: Math.floor(R() * 1e6) });
      if (/barn|chalet|windmill|pumpjack/.test(kind)) break;
    }
  }
  // trackside: chevron boards outside tight turns, a stack outside every turn, grandstands at start and finish
  const stack = env === 'dustbowl' ? 'tyres' : env === 'hedgerow' ? 'hay' : 'snowbank';
  for (const b of track.blocks) {
    const B = BLOCKS[b.type], H = HEAD[b.rot], Rr = HEAD[(b.rot + 1) % 4];
    if (/^(I|D)?[LR][12]$/.test(b.type) && B.path) {
      const side = /R\d$/.test(b.type) ? 1 : -1, n = +b.type.slice(-1), Rad = 32 * n - 16, hw = 7;
      // the outer edge midway round the bend: centre (0, side R), outward (sin f, -side cos f)
      const f = Math.PI / 4, d0 = Rad + hw + 4, px = Math.sin(f) * d0, py = side * Rad - side * Math.cos(f) * d0;
      const ex = ORIGIN + b.cx * CELL + 16 - H[0] * 16, ey = ORIGIN + b.cy * CELL + 16 - H[1] * 16;
      const wx = ex + H[0] * px + Rr[0] * py, wy = ey + H[1] * px + Rr[1] * py, z = b.L * 8;
      const ix = -Math.sin(f), iy = side * Math.cos(f), yaw = Math.atan2(H[1] * ix + Rr[1] * iy, H[0] * ix + Rr[0] * iy);   // facing the road
      if (b.L === 0) out.push({ kind: n === 1 ? 'chevron' : stack, x: wx, y: wy, z, yaw, s: 1, side, track: true });
    }
    if ((b.type === 'ST' || b.type === 'FN') && b.L === 0) {
      for (const sd of [-1, 1]) {
        const dist = 15; const [cx0, cy0] = cellCenter(b.cx, b.cy);
        const x = cx0 + Rr[0] * sd * dist, y = cy0 + Rr[1] * sd * dist;
        out.push({ kind: 'grandstand', x, y, z: 0, yaw: Math.atan2(-Rr[1] * sd, -Rr[0] * sd), s: 1, track: true, start: b.type === 'ST' });
      }
    }
  }
  for (const d of track.deco) { const [x, y] = cellCenter(d.cx, d.cy); out.push({ kind: ED[d.kind] || 'rock', x, y, yaw: 0, s: 1.2, seed: d.cx * 37 + d.cy, placed: true }); }
  for (const o of out) o.r = (SOLID[o.kind] ?? 0) * o.s;
  return out;
}
