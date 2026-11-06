// Legato: a long worm under the tissue, seen as a moving ridge. Cut at a slur mark as it passes; pull, clamp, burn, regrip.
(() => {
const G = (window.GAME ||= {}), { clamp, ev, rnd, polyLen, polyAt } = G, T = G.T;
const newSlur = (S, o) => { for (const q of S.objs) if (q.type === 'guide' && q.slur === o.id) q.dead = true; const base = o.slurS === undefined ? o.routeLen * .2 : o.slurS; o.slurAts = []; for (let i = 0; i < 3; i++) { const d = (base + i * o.routeLen * .3) % o.routeLen, [x, y, a] = G.polyAt(o.route, d), c = Math.cos(a + 1.57) * 11, s = Math.sin(a + 1.57) * 11; G.spawn(S, { t: 'guide', pts: [[x - c, y - s], [x + c, y + s]], slur: o.id, link: o.id, req: false }); o.slurAts.push([x, y]); } o.slurAt = o.slurAts[0]; o.gid = 1; o.slurS = (base + o.routeLen * .13) % o.routeLen; };
G.defObject('legato', { drain: .5, ghost: true,
  init(o, S) { o.routeLen = polyLen(o.route); o.s = o.s || 10; o.dir = 1; o.stage = o.stage || 'under'; o.total = o.total || 150; o.pulled = o.pulled || 0; o.gap = 30; o.sinceBarb = 0; o.ontop = true; o.spd = o.spd || 34; const [x, y] = polyAt(o.route, o.s); o.x = x; o.y = y; o.exit = [x, y]; o.slurs = 0; if (o.stage === 'under' && !o.hidden && !o.noSlur) newSlur(S, o); o.a = -1.57; },
  want: o => o.stage === 'out' ? 'forceps' : null, canGrip: o => o.stage === 'out', verb: 'Pull',
  marked(o, S) { S.flags.legato_found = true; if (!o.gid) newSlur(S, o); o.hidden = false; },
  aim: o => [o.x, o.y],
  linked(o, S, g, p) { const d = Math.hypot(o.x - g.x, o.y - g.y); if (d > 44) { ev(S, 'missed', Math.round(g.x), Math.round(g.y)); newSlur(S, o); return; } for (const q of S.objs) if (q.type === 'guide' && q.slur === o.id) q.dead = true; o.stage = 'out'; const mx = (g.pts[0][0] + g.pts[1][0]) / 2, my = (g.pts[0][1] + g.pts[1][1]) / 2; o.slurAt = [mx, my]; o.exit = [mx, my]; o.x = o.exit[0]; o.y = o.exit[1]; o.a = Math.atan2(116 - o.y, 213 - o.x); o.sinceBarb = 0; S.flags.legato_out = true; ev(S, 'surface', Math.round(o.x), Math.round(o.y)); },
  grip(o, S, p) { p.hold = { k: 'legato', id: o.id, gx: p.x, gy: p.y, last: 0, v: 0, p0: o.sinceBarb }; ev(S, 'grip', Math.round(o.x), Math.round(o.y)); return true; },
  held(o, S, p, h) { const H = p.hold, ax = Math.cos(o.a), ay = Math.sin(o.a), along = (p.x - H.gx) * ax + (p.y - H.gy) * ay, v = (along - H.last) / h, lim = (o.maxV || 46) * T.gradeTol; H.last = along; H.v = H.v * .9 + v * .1; p.tension = clamp(H.v / lim, 0, 1.3); o.tens = p.tension;
    if (H.v > lim) { snap(o, S, p); return; }
    if (o.stage === 'barb') return;
    const got = Math.max(0, along) - (H.got || 0); if (got > 0) { H.got = (H.got || 0) + got; o.pulled += got; o.sinceBarb += got; o.x = o.exit[0] + ax * o.sinceBarb; o.y = o.exit[1] + ay * o.sinceBarb; }
    if (o.pulled >= (o.splitAt || 1e9)) { S.flags.legato_half = true; ev(S, 'split', Math.round(o.x), Math.round(o.y)); G.grade(S, p, o.x, o.y, 'textbook', 'legato'); p.hold = null; p.tension = 0; const left = o.total - o.pulled; G.kill(S, o); G.spawn(S, { t: 'legato', route: o.route, s: (o.s + 40) % o.routeLen, total: left, spd: o.spd * 1.5, maxV: (o.maxV || 46) * 1.15, slurS: (o.s + 60) % o.routeLen }); return; }
    if (o.pulled >= o.total) { G.grade(S, p, o.x, o.y, 'textbook', 'legato'); S.flags.legato_dead = true; ev(S, 'clink', Math.round(o.x), Math.round(o.y)); p.hold = null; p.tension = 0; G.kill(S, o); return; }
    if (o.sinceBarb >= o.gap) { o.stage = 'barb'; o.zone = [o.exit[0] + ax * (o.gap + 2), o.exit[1] + ay * (o.gap + 2)]; ev(S, 'barb', Math.round(o.x), Math.round(o.y)); } },
  release(o, S, p) { p.tension = 0; if (o.stage === 'barb') { if (Math.hypot(p.x - o.zone[0], p.y - o.zone[1]) < 20 + S.assistTol * 4) { o.stage = 'clamped'; ev(S, 'clamp', Math.round(p.x), Math.round(p.y)); G.spawn(S, { t: 'barbspot', x: o.exit[0], y: o.exit[1], worm: o.id }); } else { ev(S, 'slide', Math.round(o.x), Math.round(o.y)); o.pulled = Math.max(0, o.pulled - 8); o.sinceBarb = Math.max(0, o.sinceBarb - 8); o.stage = 'out'; o.x = o.exit[0]; o.y = o.exit[1]; } } else { o.x = o.exit[0] + Math.cos(o.a) * o.sinceBarb; o.y = o.exit[1] + Math.sin(o.a) * o.sinceBarb; } },
  step(o, S, w) { if (o.stage === 'under' || o.stage === 'flee') { o.s += o.dir * o.spd * w * T.strainSpeed; if (o.s > o.routeLen - 2) { o.s = o.routeLen - 2; o.dir = -1; } if (o.s < 2) { o.s = 2; o.dir = 1; } const q = polyAt(o.route, o.s); o.x = q[0]; o.y = q[1]; } } });
function snap(o, S, p) { p.hold = null; p.tension = 0; G.slip(S, p, o.x, o.y, 5, 'snap'); ev(S, 'snap', Math.round(o.x), Math.round(o.y)); o.stage = 'under'; o.sinceBarb = 0; newSlur(S, o); }
G.defObject('barbspot', { req: true, init(o) { o.burn = o.burn0 = .4 * T.strainHealth; o.ontop = true; }, want: () => 'cautery', verb: 'Burn',
  burned(o, S, p, g) { G.grade(S, p, o.x, o.y, g, 'cautery'); const w = G.getObj(S, o.worm); if (w) { w.stage = 'out'; w.sinceBarb = 0; w.x = w.exit[0]; w.y = w.exit[1]; } G.kill(S, o); } });
// A Legato sliver (Fermata, the Cantor): slash it where it runs, then a short pull
G.defObject('sliver', { drain: .3, ghost: true,
  init(o) { o.r = 9; o.ontop = true; o.t0 = o.x * .1; o.cx = o.x; o.cy = o.y; o.slashedIt = false; G.mkPull(o, { a: -1.2, depth: 12, maxV: 90 }); },
  want: o => o.slashedIt ? 'forceps' : 'scalpel', canGrip: o => o.slashedIt, slashable: o => !o.slashedIt, verb: 'Slash',
  slash(o, S, p) { o.slashedIt = true; o.bx = o.x; o.by = o.y; G.grade(S, p, o.x, o.y, 'clean', 'slash'); },
  step(o, S, w) { if (o.slashedIt) return; o.t0 += w * T.strainSpeed * 1.1; o.x = o.cx + Math.cos(o.t0) * 26; o.y = o.cy + Math.sin(o.t0 * 1.7) * 13; o.bx = o.x; o.by = o.y; } });
})();
