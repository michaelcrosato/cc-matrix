// Da Capo: three lobes on a staff, each armor on its own timer. Kill all three inside the countdown or it plays from the top.
(() => {
const G = (window.GAME ||= {}), { ev, rnd } = G, T = G.T;
const LOBE = { A: { per: 6, open: 2.5, off: 0 }, B: { per: 7, open: 2.5, off: 2 }, C: { per: 9, open: 3, off: 4 } };
const setStage = (o, d) => { o.dead2 = false; o.stageN = 0; o.burn = o.label === 'A' ? 1 * T.strainHealth : 0; o.burn0 = o.burn; o.dose = o.label === 'C'; o.salveT = 0; o.slashedIt = false; o.bx = o.x0; o.by = o.y0; o.x = o.x0; o.y = o.y0; o.pull = null; o.cov = null; };
G.lobeOpen = (o, S) => { const L = LOBE[o.label], sp = S.ph.d.speed || 1, t = S.t * sp * T.strainSpeed + L.off; return (t % L.per) < L.open * (o.small ? 1.3 : 1); };
G.lobeNext = (o, S, at = S.t) => { const L = LOBE[o.label], sp = S.ph.d.speed || 1, t = at * sp * T.strainSpeed + L.off, m = t % L.per; return m < L.open ? 0 : (L.per - m) / (sp * T.strainSpeed); };
G.defObject('dacapo', { req: true, drain: .1,
  init(o, S) { o.cd = -1; o.round = o.round || 1; o.ontop = true; o.lobes = []; o.regrew = 0; const px = [o.x - 74, o.x, o.x + 74], py = [o.y + 12, o.y - 18, o.y + 12]; ['A', 'B', 'C'].forEach((l, i) => { const q = G.spawn(S, { t: 'lobe', x: px[i], y: py[i], label: l, owner: o.id, small: !!o.small }); o.lobes.push(q.id); }); S.ph.d.speed = o.round > 1 ? 2 : 1; },
  want: () => null,
  step(o, S, w) { const L = o.lobes.map(id => G.getObj(S, id)).filter(Boolean), dead = L.filter(q => q.dead2).length; if (dead && o.cd < 0) { o.cd = (o.window || 10); ev(S, 'countdown'); } if (o.cd >= 0) { o.cd -= w; if (dead === L.length) { ev(S, 'fine', o.round); S.flags['dacapo_r' + o.round] = true; for (const q of L) q.dead = true; G.kill(S, o); return; } if (o.cd <= 0) { o.cd = -1; o.regrew++; o.window = Math.min(18, (o.window || 10) + 2); G.hurt(S, 8 * T.strainDamage); ev(S, 'dacapo', Math.round(o.x), Math.round(o.y)); for (const q of L) if (q.dead2) setStage(q); } } } });
G.defObject('lobe', { req: false, drain: 0, ghost: true,
  init(o, S) { o.x0 = o.x; o.y0 = o.y; o.r = 14; o.ontop = true; setStage(o); },
  want(o, S) { if (o.dead2 || !G.lobeOpen(o, S)) return null; if (o.label === 'A') return 'cautery'; if (o.label === 'B') return o.slashedIt ? 'forceps' : 'scalpel'; return o.dose ? 'syringe' : 'salve'; },
  verb: 'Strike', step(o, S, w, h) { o.open = !o.dead2 && G.lobeOpen(o, S); if (o.dead2) return; if (o.label === 'C' && !o.dose && o.open) { for (const p of S.players) if (p.tool === 'salve' && !p.gone && p.trigPrev >= .3 && Math.hypot(p.x - o.x, p.y - o.y) < 24) { o.salveT += h; if (o.salveT >= 1 * T.strainHealth) { G.grade(S, p, o.x, o.y, 'clean', 'salve'); dieLobe(o, S); return; } } } },
  burnOk: o => o.open && !o.dead2, burned(o, S, p, g) { G.grade(S, p, o.x, o.y, g, 'cautery'); dieLobe(o, S); },
  slashable: (o, S) => o.label === 'B' && !o.slashedIt && o.open && !o.dead2, slash(o, S, p) { o.slashedIt = true; G.mkPull(o, { a: -1.57, depth: 10, maxV: 140 }); G.grade(S, p, o.x, o.y, 'clean', 'slash'); },
  canGrip: (o, S) => o.label === 'B' && o.slashedIt && !o.dead2, grip(o, S, p) { p.hold = { k: 'pull', id: o.id, gx: p.x, gy: p.y, p0: o.pull.prog, last: 0, v: 0 }; ev(S, 'grip', Math.round(o.x), Math.round(o.y)); return true; },
  onFree(o, S, p) { G.grade(S, p, o.x, o.y, o.pull.tears ? 'clean' : 'textbook', 'forceps'); p.hold = null; p.tension = 0; ev(S, 'clink', Math.round(o.x), Math.round(o.y)); dieLobe(o, S); o.x = o.x0; o.y = o.y0; },
  dosed(o, S, p, g) { if (!o.open || !o.dose) { ev(S, 'spit', Math.round(o.x), Math.round(o.y)); return; } o.dose = false; G.grade(S, p, o.x, o.y, g, 'dose'); } });
function dieLobe(o, S) { o.dead2 = true; o.open = false; o.burn = 0; o.dose = false; ev(S, 'lobedead', Math.round(o.x), Math.round(o.y)); }
G.defScript('dacapoBeads', (S) => { S.flags.swarm = true; S.beadCap = 4; for (let i = 0; i < 3; i++) G.spawn(S, { t: 'bead', x: 120 + i * 90, y: 150, req: false }); });
})();
