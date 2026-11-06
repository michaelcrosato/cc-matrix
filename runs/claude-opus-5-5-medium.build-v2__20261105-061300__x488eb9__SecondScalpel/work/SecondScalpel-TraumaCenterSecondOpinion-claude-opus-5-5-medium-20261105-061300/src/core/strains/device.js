// Case 9's rigged pacemaker: screws turned by circling, a board that disagrees with the chart, wires cut in the true order.
(() => {
const G = (window.GAME ||= {}), { ev, clamp } = G;
G.defObject('screw', { drain: 0, ghost: false, init(o) { o.turn = 0; o.ontop = true; o.r = 5; }, want: () => 'forceps', verb: 'Turn',
  grip(o, S, p) { p.hold = { k: 'turn', id: o.id, lx: p.x, ly: p.y, la: null }; ev(S, 'grip', o.x, o.y); return true; },
  held(o, S, p, h) { const H = p.hold, dx = p.x - H.lx, dy = p.y - H.ly; if (Math.hypot(dx, dy) < 1.2) return; const a = Math.atan2(dy, dx); H.lx = p.x; H.ly = p.y; if (H.la !== null) { let d = a - H.la; while (d > 3.1416) d -= 6.2832; while (d < -3.1416) d += 6.2832; if (Math.abs(d) < 1.6) o.turn += Math.abs(d); } H.la = a; p.tension = 0; o.ang = (o.ang || 0) + .3; if (Math.floor(o.turn / 3.14) !== o.lastTick) { o.lastTick = Math.floor(o.turn / 3.14); ev(S, 'ratchet', o.x, o.y); }
    if (o.turn >= 18.85) { G.grade(S, p, o.x, o.y, 'clean', 'forceps'); ev(S, 'clink', o.x, o.y); p.hold = null; G.kill(S, o); } },
  release(o, S, p) { p.tension = 0; } });
G.defObject('boardmark', { req: false, ontop: true, init(o) { o.hidden = true; o.mark = 0; o.stayMarked = true; o.ontop = true; }, want: () => null, marked(o, S) { S.flags.board = (S.flags.board || 0) + 1; ev(S, 'boardread', o.order); } });
G.defObject('lead', { drain: 0, init(o) { o.burn = o.burn0 = .9; o.ontop = true; }, want: () => 'cautery', verb: 'Solder' });
G.defObject('wire', { drain: 0, init(o) { o.r = 7; o.ontop = true; }, want: () => 'scanned', slashable: () => true, verb: 'Slash',
  aim: o => [o.x, o.y],
  slash(o, S, p) { const c = S.ph.d, next = (c.nextWire || 0); if (o.order === next) { c.nextWire = next + 1; G.grade(S, p, o.x, o.y, 'textbook', 'slash'); ev(S, 'wirecut', o.x, o.y); G.kill(S, o); } else { ev(S, 'wrongwire', o.x, o.y); if (!o.hurtT || S.t - o.hurtT > 1) { o.hurtT = S.t; G.slip(S, p, o.x, o.y, 30, 'wire'); S.clock = Math.max(1, S.clock - 30); } } } });
G.defObject('can', { drain: 0, init(o) { G.mkPull(o, { a: -1.57, depth: 26, maxV: 34, off: 14, par: 3.6 }); o.ontop = true; }, want: () => 'forceps', verb: 'Lift', caught(o, S) { S.flags.can_out = true; } });
G.OBJ.wire.want = (o, S) => (o.order === (S.ph.d.nextWire || 0)) ? 'scalpel' : null;
})();
