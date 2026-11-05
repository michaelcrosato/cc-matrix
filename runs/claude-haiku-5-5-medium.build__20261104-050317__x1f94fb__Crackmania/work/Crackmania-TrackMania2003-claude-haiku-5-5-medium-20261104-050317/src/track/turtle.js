// The track format: a turtle program (text) becomes a centreline in 3D, one sample a metre, each with its own frame.
// Commands (separated by ';' or new lines; '#' starts a comment):
//   F <m>            straight ahead for m metres
//   B <m>            straight, a boost pad along all of it
//   Y <deg> <R>      turn right (positive) or left (negative) through deg, on a radius of R metres; banked into the turn
//   P <deg> <R>      pitch nose-up (positive) or nose-down through deg, on a radius of R metres (hills, kickers, loops)
//   C                a checkpoint gate here (the start and the finish are gates too)
// The turtle starts at the origin heading east at height 0 (metres). The track is then placed where the world wants it.
import { U, add, scale, norm, cross, frameFrom, turn } from '../lib/vec.js';

const ROAD_HALF = 5;          // metres: the road is 10 wide, kerbs in its last metre each side
const BANK_MAX = .30;         // radians, banking at a turn's tightest
const BANK_RATE = .04;        // how fast the bank follows the turn, radians a metre

export function parseProgram(text) {
  const out = [];
  for (const raw of text.split(/[;\n]/)) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    const [op, ...args] = line.split(/\s+/), n = args.map(Number);
    if ('FBYPC'.indexOf(op) < 0 || op.length !== 1) throw new Error('turtle: unknown command "' + line + '"');
    out.push({ op, n, line });
  }
  return out;
}

/** builds the track from its program: samples (metres, engine units inside), gates, boost ranges and the bounding box */
export function buildTrack(text) {
  const cmds = parseProgram(text), P = [], F = [], R = [], Up = [], Boost = [], H = [], gates = [];
  let h = 0, p = 0, bank = 0, pos = [0, 0, 0];
  const ds = 1;                                     // metres a sample
  const push = (boost) => {
    const hz = [Math.cos(h) * Math.cos(p), Math.sin(h) * Math.cos(p), Math.sin(p)];   // forward
    const r0 = [-Math.sin(h), Math.cos(h), 0];
    const fr = frameFrom(hz, r0);
    // banking rotates the right about the forward
    const r = norm([fr.r[0] * Math.cos(bank) - fr.u[0] * Math.sin(bank), fr.r[1] * Math.cos(bank) - fr.u[1] * Math.sin(bank), fr.r[2] * Math.cos(bank) - fr.u[2] * Math.sin(bank)]);
    const u = norm(cross(hz, r));                  // u = f x r
    P.push(pos.slice()); F.push(hz); R.push(r); Up.push(u); Boost.push(boost ? 1 : 0); H.push(h);
  };
  const stepAlong = (boost, dh, dp) => {
    // one sample: move forward, then turn for the next
    push(boost);
    const hz = [Math.cos(h) * Math.cos(p), Math.sin(h) * Math.cos(p), Math.sin(p)];
    pos = add(pos, hz, ds);
    h += dh; p += dp;
  };
  push(false);
  for (const c of cmds) {
    if (c.op === 'C') { gates.push({ i: P.length - 1 }); continue; }
    if (c.op === 'F' || c.op === 'B') {
      const m = Math.round(c.n[0]);
      if (!(m > 0)) throw new Error('turtle: ' + c.line);
      for (let i = 0; i < m; i++) { bank += (0 - bank) * Math.min(1, BANK_RATE * 6); stepAlong(c.op === 'B', 0, 0); }
      continue;
    }
    if (c.op === 'Y') {
      const deg = c.n[0], R = c.n[1];
      const total = deg * Math.PI / 180, m = Math.max(1, Math.round(Math.abs(total) * R));
      const dh = total / m, sign = Math.sign(deg) || 1, target = sign * Math.min(BANK_MAX, .6 * ds / R * 4 + .08) * (R < 60 ? 1 : .6);
      for (let i = 0; i < m; i++) { bank += (target - bank) * Math.min(1, BANK_RATE * 6); stepAlong(false, dh, 0); }
      continue;
    }
    if (c.op === 'P') {
      const total = c.n[0] * Math.PI / 180, R = c.n[1], m = Math.max(2, Math.round(Math.abs(total) * R));
      const dp = total / m;
      for (let i = 0; i < m; i++) { bank += (0 - bank) * Math.min(1, BANK_RATE * 6); stepAlong(false, 0, dp); }
      continue;
    }
  }
  push(false);                                       // the last sample: the finish
  gates.push({ i: P.length - 1 });
  // the gates are in order; a track that doesn't end where it began is still a track
  const n = P.length;
  return { n, P, F, R, U: Up, Boost, H, gates, length: n * ds, ds };
}

/** the road's width (metres) and its kerb strip */
export const ROAD = { half: ROAD_HALF, kerb: 1 };

/** where a point of the track is: the sample index nearest (x, y, z) in engine units, looking from `from` over a window
 *  (so a loop's other pass is never picked) */
export function nearestSample(T, pt, from, back = 40, ahead = 80) {
  let best = from, bd = Infinity;
  const a = Math.max(0, from - back), b = Math.min(T.n - 1, from + ahead);
  for (let i = a; i <= b; i++) {
    const dx = T.P[i][0] - pt[0], dy = T.P[i][1] - pt[1], dz = T.P[i][2] - pt[2], d = dx * dx + dy * dy + dz * dz;
    if (d < bd) { bd = d; best = i; }
  }
  return { i: best, dist: Math.sqrt(bd) / U };
}
export { U, scale };
