// Staccato: beads hopping on a fixed beat from hidden nests. A closing ring shows each landing .5 s ahead; a landing bites.
(() => {
const G = (window.GAME ||= {}), { clamp, ev, rnd } = G, T = G.T;
G.defObject('nest', { drain: .2, ghost: true,   // found by Sonar; a slash opens it, Forceps takes it
  init(o) { o.r = 10; o.hidden = o.hidden !== false; o.mark = 0; o.stayMarked = true; G.mkPull(o, { a: o.a === undefined ? -1.57 : o.a, depth: 14, maxV: 120 }); o.opened = false; o.ontop = true; o.spawnT = 1.5; },
  want: o => o.opened ? 'forceps' : 'scalpel', canGrip: o => o.opened, slashable: o => !o.opened, verb: 'Slash',
  slash(o, S, p) { o.opened = true; G.grade(S, p, o.x, o.y, 'clean', 'slash'); },
  step(o, S, w) { if (!S.flags.swarm) return; o.spawnT -= w * T.spawnRate; if (o.spawnT <= 0) { let n = 0; for (const q of S.objs) if (q.type === 'bead' && !q.dead) n++; o.spawnT = 3.4; if (n < (S.beadCap || 6)) G.spawn(S, { t: 'bead', x: o.x, y: o.y, nest: o.id }); } },
  gone(o, S) { let left = 0; for (const q of S.objs) if (q.type === 'nest' && !q.dead) left++; if (!left) for (const q of S.objs) if (q.type === 'bead' && !q.dead) q.dieT = 1 + rnd(S) * 2; } });
G.defObject('bead', { drain: .05, ghost: true,
  init(o, S) { o.burn = o.burn0 = .12 * T.strainHealth; o.hopT = T.staccatoBeat * (.5 + rnd(S) * .5); o.tx = o.x; o.ty = o.y; o.sx = o.x; o.sy = o.y; o.air = 0; o.ontop = true; o.r = 2; },
  want: () => 'cautery', verb: 'Burn',
  aim: o => [o.x, o.y],
  step(o, S, w) { if (o.dieT !== undefined) { o.dieT -= w; if (o.dieT <= 0) { ev(S, 'pop', Math.round(o.x), Math.round(o.y)); G.kill(S, o); return; } } const sp = T.strainSpeed;
    o.hopT -= w * sp;
    if (o.air > 0) { o.air -= w * sp / .5; const k = 1 - clamp(o.air, 0, 1); o.x = o.sx + (o.tx - o.sx) * k; o.y = o.sy + (o.ty - o.sy) * k; o.h = Math.sin(k * 3.14) * 12; if (o.air <= 0) { o.h = 0; o.x = o.tx; o.y = o.ty; ev(S, 'bite', Math.round(o.x), Math.round(o.y)); o.bites = (o.bites || 0) + 1; G.hurt(S, .35 * T.strainDamage); if (rnd(S) < .34) G.addLac(S, o.x, o.y); } return; }
    if (o.hopT <= 0) { o.hopT = T.staccatoBeat * (1 + (rnd(S) < .3 ? 1 : 0)); const a = rnd(S) * 6.28, d = 24 + rnd(S) * 30; o.sx = o.x; o.sy = o.y; o.tx = clamp(o.x + Math.cos(a) * d, 70, 356); o.ty = clamp(o.y + Math.sin(a) * d * .7, 46, 186); o.air = 1; ev(S, 'tk', Math.round(o.x)); } } });
G.defScript('swarmOn', S => { S.flags.swarm = true; S.beadCap = Math.max(6, 4 * (S.N || 1)); });
})();
