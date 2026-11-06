// Fermata: an eye in the gyri. Its hold domes stop everything inside; it opens only as a dome collapses. Case 10's foe.
(() => {
const G = (window.GAME ||= {}), { ev, rnd, clamp } = G, T = G.T;
G.defObject('dome', { req: false, ontop: true, init(o) { o.r = o.r || 34; o.life = o.life || 5; o.life0 = o.life; o.ontop = true; }, want: () => null,
  step(o, S, w) { o.life -= w; if (o.life <= 0) { ev(S, 'domefall', Math.round(o.x), Math.round(o.y)); G.kill(S, o); const e = S.objs.find(q => q.type === 'fermata' && !q.dead); if (e) e.open = Math.max(e.open || 0, .7); } } });
G.defObject('fermata', { drain: .15, ghost: true,
  init(o) { o.r = 10; o.ontop = true; o.open = 0; o.hits = 0; o.stage2 = 1; o.domeT = 1; o.burn0 = .3 * T.strainHealth; o.burn = o.burn0; o.spots = o.spots || [[150, 90], [285, 85], [215, 150]]; o.si = 0; },
  want: o => o.stage2 === 3 ? 'forceps' : o.open > 0 ? 'cautery' : null, verb: 'Burn', burnOk: o => o.open > 0, canGrip: o => o.stage2 === 3,
  grip(o, S, p) { p.hold = { k: 'pull', id: o.id, gx: p.x, gy: p.y, p0: o.pull.prog, last: 0, v: 0 }; ev(S, 'grip', Math.round(o.x), Math.round(o.y)); return true; },
  burned(o, S, p, g) { o.hits++; G.grade(S, p, o.x, o.y, g, 'cautery'); ev(S, 'eyehit', Math.round(o.x), Math.round(o.y)); o.burn = o.burn0; o.open = 0; if (o.hits >= (o.need || 3)) { S.flags.fermata1 = true; } },
  marked(o, S) { S.flags.fermata_found = true; },
  caught(o, S) { S.flags.fermata_dead = true; },
  step(o, S, w) { if (o.open > 0) o.open -= w; if (o.stage2 === 1 && !S.flags.fermata1) { o.domeT -= w * T.spawnRate; let n = 0; for (const q of S.objs) if (q.type === 'dome' && !q.dead) n++; if (o.domeT <= 0 && n < 3 && o.open <= 0) { o.domeT = 2.6; const a = rnd(S) * 6.28; G.spawn(S, { t: 'dome', x: clamp(o.x + Math.cos(a) * (n ? 60 : 8), 70, 356), y: clamp(o.y + Math.sin(a) * (n ? 34 : 8), 40, 190) }); } } } });
G.defScript('fermataFlee', S => { const e = S.objs.find(q => q.type === 'fermata'); if (!e) return; for (const q of S.objs) if (q.type === 'dome') q.dead = true; e.si = 1; e.x = e.spots[1][0]; e.y = e.spots[1][1]; e.stage2 = 2; e.hidden = true; e.mark = 0; e.stayMarked = true; e.open = 0; ev(S, 'flee', Math.round(e.x), Math.round(e.y)); G.spawn(S, { t: 'sliver', x: 130, y: 130 }); G.spawn(S, { t: 'sliver', x: 300, y: 140 }); });
G.defScript('fermataPull', S => { const e = S.objs.find(q => q.type === 'fermata'); if (!e) return; e.stage2 = 3; e.hidden = false; G.mkPull(e, { a: -1.57, depth: 34, maxV: 30, off: 12, par: 3.6 }); });
})();
