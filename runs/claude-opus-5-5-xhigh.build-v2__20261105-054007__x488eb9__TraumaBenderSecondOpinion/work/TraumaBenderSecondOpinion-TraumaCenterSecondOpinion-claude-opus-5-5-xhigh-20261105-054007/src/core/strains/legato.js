// Legato: a long worm under the tissue, seen as a moving ridge (section 8). Cut a slur as it nears; pull slowly; clamp, burn, regrip.
(() => {
const G = (window.GAME ||= {}), T = G.TUNING, U = G.U, def = G.defObject, Op = () => G.Op, Score = () => G.Score;

const headAt = (o) => U.polyAt(o.route, o.s % o.routeLen);
const distAhead = (o, s) => { const d = ((s - o.s) % o.routeLen + o.routeLen) % o.routeLen; return d; };
def('legato', {
  strain: true, sings: true, prio: 2,
  ghost: o => ({ k: 'legato', x: o.x, y: o.y }),
  init(o, S) {
    o.routeLen = U.polyLen(o.route); o.s = o.s0 ?? 0; o.state = 'roam'; o.x = o.route[0][0]; o.y = o.route[0][1]; const p = U.polyAt(o.route, o.s); o.x = p.x; o.y = p.y;
    o.segs = o.segs ?? 8; o.segs0 = o.segs; o.speed = o.speed ?? 34; o.limit = o.limit ?? 62; o.ext = 0; o.barbOut = false; o.pv = 0; o.ld = 0; o.cycle = o.cycle ?? 26; o.hidden = o.hidden ?? true; o.slurs = o.slurs || [o.routeLen * .25, o.routeLen * .6, o.routeLen * .88]; o.slurIds = []; o.reslur = 0; o.surT = 0; o.anchor = null; o.zone = null;
    o.req = true;
    for (let i = 0; i < o.slurs.length; i++) Op().spawnSlur(S, o, i);
  },
  accept: (o, t) => t === 'forceps' && o.state === 'surfaced' ? 'Pull' : null,
  reach: 2,
  step(o, S, w, dt) {
    if (o.state === 'roam') {
      o.s += o.speed * w; const p = headAt(o); o.x = p.x; o.y = p.y; o.tx = p.tx; o.ty = p.ty;
      o.reslur -= w; if (o.reslur <= 0) { o.reslur = 2.5; for (let i = 0; i < o.slurs.length; i++) if (!S.objs.some(q => q.slurOf === o.id && q.slurI === i && !q.done)) Op().spawnSlur(S, o, i); }
      if (o.hidden && o.marked > 0 && !o.found) { o.found = true; S.flags.legatoFound = true; }
    } else if (o.state === 'surfaced') {
      o.surT -= w; if (o.surT <= 0 && !S.hands.some(h => h.held === o.id)) { o.state = 'roam'; S.ev.push(['legatoDive', o.x, o.y]); S.ev.push(['say', 'tension']); }
    }
    if (S.t - (o.singT ?? -9) > 4) { o.singT = S.t; S.ev.push(['legatoSing', o.x]); }
  },
  /** a slur has been cut: surfaces only if the ridge is near */
  slurCut(S, h, o, g) {
    const near = Math.min(distAhead(o, o.slurs[g.slurI]), o.routeLen - distAhead(o, o.slurs[g.slurI]));
    if (o.state === 'roam' && near <= 46) {
      const p = U.polyAt(o.route, o.slurs[g.slurI]); o.x = p.x; o.y = p.y; o.s = o.slurs[g.slurI]; o.anchor = [p.x, p.y]; o.state = 'surfaced'; o.surT = o.surfaceT ?? 7; o.hidden = false; o.ext = 0; S.flags.legatoFound = true; S.flags.legatoUp = true;
      const dx = G.CAV.x - p.x, dy = G.CAV.y - p.y, l = Math.hypot(dx, dy) || 1; o.zone = [p.x + dx / l * 36, p.y + dy / l * 36]; S.ev.push(['legatoUp', p.x, p.y]); S.ev.push(['sayp', 'surfaced']);
    } else { S.ev.push(['say', 'tension']); }
  },
  grip(S, h, o) { o.ld = U.dist(h.x, h.y, o.anchor[0], o.anchor[1]); o.pv = 0; o.ext0 = o.ext; },
  hold(S, h, o, dt) {
    const d = U.dist(h.x, h.y, o.anchor[0], o.anchor[1]), v = dt > 0 ? (d - o.ld) / dt : 0; o.ld = d; o.pv += (v - o.pv) * Math.min(1, dt / .08);
    const lim = o.limit * T.tolX, ten = o.pv / lim; S.tension = Math.max(S.tension || 0, ten);
    if (o.barbOut) { o.x = o.anchor[0] + (h.x - o.anchor[0]) * Math.min(1, (o.cycle + 8) / Math.max(1, d)); o.y = o.anchor[1] + (h.y - o.anchor[1]) * Math.min(1, (o.cycle + 8) / Math.max(1, d)); }
    else { o.x = h.x; o.y = h.y; o.ext = Math.max(o.ext, d); if (o.ext >= o.cycle) { o.barbOut = !o.noBarb; if (o.noBarb) { h.held = 0; Score().award(S, h, o.x, o.y, 'Textbook', 90); o.segs -= 4; if (o.segs <= 0) Op().finishObj(S, o, h, null, 0, 'forceps'); else Op().legatoReset(S, o); return; } S.ev.push(['barbOut', o.anchor[0], o.anchor[1]]); S.ev.push(['sayp', 'barb']); } }
    if (ten > 1) { // too fast: it snaps, the rest regrows a head and flees
      h.held = 0; Score().slip(S, h, o.x, o.y, 5, 'tear'); S.ev.push(['legatoSnap', o.x, o.y]); o.state = 'roam'; o.hidden = false; o.barbOut = false; o.ext = 0; o.s = o.slurs[0] + 8; o.speed *= 1.08; const p = U.polyAt(o.route, o.s); o.x = p.x; o.y = p.y;
    }
  },
  release(S, h, o) {
    if (o.barbOut && o.zone && U.dist(h.x, h.y, o.zone[0], o.zone[1]) <= 18) { // Quill clamps; burn the barb, then regrip
      o.state = 'clamped'; o.x = o.zone[0]; o.y = o.zone[1]; S.ev.push(['clamp', o.x, o.y]); Op().spawn(S, { type: 'barb', x: o.anchor[0], y: o.anchor[1], owner: o.id, req: true }); Score().award(S, h, o.x, o.y, 'Clean', 50);
    } else { o.x = o.anchor[0]; o.y = o.anchor[1]; o.ext = 0; o.barbOut = false; S.ev.push(['drop', o.x, o.y, h.id]); }
  },
  job(o, S, h) {
    if (o.state === 'surfaced') return { tool: 'forceps', o, plan: 'legatoPull' };
    if (o.state === 'clamped') return null;
    if (o.hidden && !(o.marked > 0) && !o.found) return { tool: 'sonar', o };
    let best = null, bd = 1e9; for (const q of S.objs) if (q.slurOf === o.id && !q.done) { const dd = distAhead(o, o.slurs[q.slurI]); if (dd < bd) { bd = dd; best = q; } }
    return best ? { tool: 'scalpel', o: best, plan: 'legatoCut', worm: o.id } : null;
  },
});
def('barb', {
  r: 3, prio: 1, hazard: .3, worth: 70, accept: (o, t) => t === 'cautery' ? 'Burn' : null, burnNeed: () => .4 * T.strainHealth,
  burned(S, h, o, gr) { const w = Op().byId(S, o.owner); Op().finishObj(S, o, h, gr, 70, 'cautery'); if (w) { w.segs -= 4; if (w.segs <= 0) { S.ev.push(['legatoDone', w.x, w.y]); Op().finishObj(S, w, h, 'Textbook', 200, 'forceps'); } else Op().legatoReset(S, w); } },
});

// ------------------------------------------------------------------ helpers on Op (Op loads first)
const extend = () => {
  const Oo = G.Op;
  Oo.spawnSlur = (S, o, i) => { const p = U.polyAt(o.route, o.slurs[i]), nx = -p.ty, ny = p.tx, L = 11; Oo.spawn(S, { type: 'guide', short: true, pts: [[p.x + nx * L, p.y + ny * L], [p.x - nx * L, p.y - ny * L]], req: false, slurOf: o.id, slurI: i, label: '' }); };
  Oo.legatoReset = (S, o) => { o.state = 'surfaced'; o.surT = (o.surfaceT ?? 7) + 3; o.x = o.anchor[0]; o.y = o.anchor[1]; o.ext = 0; o.barbOut = false; };
};
if (G.Op) extend(); else (G._after ||= []).push(extend);

// ------------------------------------------------------------------ bot plans
const P = () => G.Bot.plans;
const reg = () => {
  P().legatoCut = function* (g, S, B, job) {
    yield* B.tool('scalpel'); const w = G.Op.byId(B.S, job.worm); if (!w) return;
    const a = U.polyAt(g.pts, 0); yield* B.moveTo(a.x, a.y, undefined, 2);
    let guard = 0; while (guard++ < 2400 && G.Op.byId(B.S, g.id) && w.state === 'roam') { const dd = Math.min(((w.slurs[g.slurI] - w.s) % w.routeLen + w.routeLen) % w.routeLen, w.routeLen - ((w.slurs[g.slurI] - w.s) % w.routeLen + w.routeLen) % w.routeLen); if (dd < 34) break; yield; }
    if (w.state !== 'roam' || !G.Op.byId(B.S, g.id)) return;
    B.press(); yield; let g2 = 0; while (G.Op.byId(B.S, g.id) && !g.done && g2++ < 200) { const q = U.polyAt(g.pts, Math.min(g.len, g.prog + 8)); const dx = q.x - B.c.x, dy = q.y - B.c.y, d = Math.hypot(dx, dy); B.steer(dx, dy, d, 120); yield; } B.release(); yield;
  };
  P().legatoPull = function* (o, S, B) {
    yield* B.tool('forceps'); if (o.state !== 'surfaced') return;
    yield* B.moveTo(() => o.x, () => o.y, undefined, 1.5); if (o.state !== 'surfaced') return;
    B.press(); yield; const z = o.zone, sp = Math.min(46, o.limit * .62);
    let guard = 0; const dx0 = z[0] - o.anchor[0], dy0 = z[1] - o.anchor[1], l = Math.hypot(dx0, dy0) || 1;
    while (guard++ < 900 && !o.done && G.Op.byId(B.S, o.id) && (B.S.hands[B.i].held === o.id)) {
      const D = U.dist(B.c.x, B.c.y, o.anchor[0], o.anchor[1]);
      if (o.barbOut || D >= (o.cycle + 2)) { if (U.dist(B.c.x, B.c.y, z[0], z[1]) < 12) break; const q = z, ddx = q[0] - B.c.x, ddy = q[1] - B.c.y, d = Math.hypot(ddx, ddy); B.steer(ddx, ddy, d, sp); yield; continue; }
      const tx = o.anchor[0] + dx0 / l * (D + 8), ty = o.anchor[1] + dy0 / l * (D + 8), ddx = tx - B.c.x, ddy = ty - B.c.y, d = Math.hypot(ddx, ddy); B.steer(ddx, ddy, d, sp); yield;
    }
    B.release(); yield; yield;
  };
};
if (G.Bot) reg(); else (G._after ||= []).push(reg);
})();
