// covers: src/track/blocks.js, src/track/geometry.js
import { TYPES, frameAt, endsOf } from '../../src/track/blocks.js';
import { blockGeometry, plateGeometry } from '../../src/track/geometry.js';
import { TRACKS } from '../../src/data/tracks.js';
import { compile } from '../../src/track/track.js';
import { dot, cross, sub, len, norm } from '../../src/lib/v3.js';
export default T => {
  for (const T0 of Object.values(TYPES)) {
    if (!T0.path || T0.deco) continue;
    const pl = { type: T0.id, cx: 4, cy: 4, L: 2, rot: 1 }; let bad = '';
    let prev = frameAt(pl, 0);
    for (let s = .25; s <= T0.len; s += .25) {
      const f = frameAt(pl, s);
      if (Math.abs(len(f.t) - 1) > 1e-6 || Math.abs(len(f.u) - 1) > 1e-6) bad = 'not unit at ' + s;
      if (Math.abs(dot(f.t, f.u)) > 1e-4) bad = 'u not square to t at ' + s;
      if (len(sub(f.p, prev.p)) > .3) bad = 'jump in p at ' + s;
      if (Math.acos(Math.min(1, dot(f.t, prev.t))) > (T0.loop ? .05 : .03)) bad = 'kink in t at ' + s;
      prev = f;
    }
    T.check(T0.id + ' path continuous', !bad, bad);
    const g = blockGeometry(pl, 'dustbowl', null);
    let nan = false; for (const p of Object.values(g.parts)) for (const v of p.pos) if (!isFinite(v)) nan = true;
    T.check(T0.id + ' mesh finite', !nan);
    // the road's collision triangles face up the path (Rapier winding); three's are the mirror
    const road = g.coll.find(c => ['road', 'dirt', 'ice', 'boost'].includes(c.surface) && c.pos.length > 9);
    if (road) { let worst = 1; for (let i = 0; i < road.idx.length; i += 3) { const P = k => [road.pos[road.idx[k] * 3], road.pos[road.idx[k] * 3 + 1], road.pos[road.idx[k] * 3 + 2]]; const a = P(i), b = P(i + 1), c = P(i + 2), n = norm(cross(sub(b, a), sub(c, a))); const m = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3]; let best = null, bd = 1e9; for (let s = 0; s <= T0.len; s += 1) { const f = frameAt(pl, s), d = len(sub(f.p, m)); if (d < bd) { bd = d; best = f; } } worst = Math.min(worst, dot(n, best.u)); }
      T.check(T0.id + ' road normals agree with up', worst > .5, 'worst ' + worst.toFixed(2)); }
  }
  // every link of every shipped track: the two ends meet (1 cm) facing each other (0.5 degrees)
  for (const d of TRACKS) {
    const t = compile(d); let bad = 0, worst = '';
    for (const b of t.blocks) for (const e of endsOf(b)) { const q = t.partner(b, e); if (!q) continue; const dp = len(sub(e.p, q.e.p)), ang = Math.acos(Math.max(-1, Math.min(1, -dot(e.t, q.e.t)))) * 180 / Math.PI; if (dp > .01 || ang > .5) { bad++; worst = b.type + '->' + q.b.type; } }
    T.check(d.id + ' links meet', !bad, bad + ' bad, e.g. ' + worst);
    const R = t.route(); let gap = 0; const S = t.samples(2); for (let i = 1; i < S.length; i++) if (!S[i].air && !S[i - 1].air) gap = Math.max(gap, len(sub(S[i].p, S[i - 1].p)));
    T.check(d.id + ' route samples continuous', gap < 3.5, 'max gap ' + gap.toFixed(2));
  }
  const pg = plateGeometry(compile(TRACKS[1]), 'dustbowl'); T.check('plate has holes for the canyon', pg.parts.rock && pg.parts.rock.idx.length > 0);
};
