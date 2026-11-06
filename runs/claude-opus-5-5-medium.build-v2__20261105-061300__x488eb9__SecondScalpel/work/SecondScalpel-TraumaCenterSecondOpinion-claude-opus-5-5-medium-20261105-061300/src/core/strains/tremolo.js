// Tremolo: a shivering web on the beating heart. Sedate reeds in the flare after each beat; burn the mass; pull it, slowly.
(() => {
const G = (window.GAME ||= {}), { clamp, ev, rnd } = G, T = G.T;
G.defObject('tremolo', { drain: 0, ghost: true,
  init(o, S) { o.amp = 1; o.stage = 1; o.burn = 0; o.burnMax = 3 * T.strainHealth; o.wake = 6; o.r = 15; o.ontop = true; o.pin = 0; o.free2 = false; o.vp = o.vp || [[150, 80], [190, 110], [230, 130], [270, 120], [300, 90]]; o.vs = 2; o.vd = 1; o.cut = 0; for (let i = 0; i < (o.n || 5); i++) { const a = i / (o.n || 5) * 6.283 - 1.57; G.spawn(S, { t: 'reed', x: o.x + Math.cos(a) * 44, y: o.y + Math.sin(a) * 30, owner: o.id, a }); } },
  want: o => o.stage === 2 ? (o.free2 && o.pin <= 0 ? 'forceps' : o.amp <= .21 ? 'cautery' : null) : o.stage === 3 ? 'forceps' : null,
  canGrip: o => o.stage === 3 || (o.stage === 2 && o.free2), verb: 'Burn', burnOk: o => o.stage === 2 && o.amp <= .21,
  grip(o, S, p) { if (o.stage === 2) { o.pin = 2; ev(S, 'grip', Math.round(o.x), Math.round(o.y)); return false; } if (!o.pull) G.mkPull(o, { a: -1.4, depth: 40, maxV: 42, par: 3 }); p.hold = { k: 'pull', id: o.id, gx: p.x, gy: p.y, p0: o.pull.prog, last: 0, v: 0 }; ev(S, 'grip', Math.round(o.x), Math.round(o.y)); return true; },
  burned(o, S, p, g) { o.burn = 0; o.stage = 3; G.grade(S, p, o.x, o.y, g, 'cautery'); S.flags.trem3 = true; ev(S, 'crack', Math.round(o.x), Math.round(o.y)); for (const q of S.objs) if (q.type === 'reed') q.dead = true; o.bx = o.x; o.by = o.y; },
  caught(o, S) { S.flags.tremolo_dead = true; },
  step(o, S, w, h) { if (o.stage < 3) { let a = 0; for (const q of S.objs) if (q.type === 'reed' && !q.dead && !q.sedated) a += q.halfed ? .1 : .2; o.amp = a; } const amp = o.amp; S.aura = { x: o.x, y: o.y, amp, r: 70 }; o.flare = S.sinceBeat < .3;
    if (o.stage === 1 && amp <= .21) { o.stage = 2; o.burn = o.burnMax; o.burn0 = o.burnMax; ev(S, 'crack', Math.round(o.x), Math.round(o.y)); S.flags.trem2 = true; }
    if (o.stage === 2) { if (o.pin > 0) o.pin -= w; o.wake -= w; if (o.wake <= 0) { o.wake = 6; for (const q of S.objs) if (q.type === 'reed' && q.sedated && !q.dead) { q.sedated = false; q.halfed = false; q.dose = true; ev(S, 'wake', Math.round(q.x), Math.round(q.y)); break; } }
      if (!o.free2 && o.burn < o.burnMax / 2) { o.free2 = true; ev(S, 'tearfree', Math.round(o.x), Math.round(o.y)); }
      if (o.free2 && o.pin <= 0) { o.vs = clamp(o.vs + o.vd * w * .45 * T.strainSpeed, 0, o.vp.length - 1.001); if (o.vs >= o.vp.length - 1.01 || o.vs <= 0) o.vd = -o.vd; const i = o.vs | 0, f = o.vs - i, a = o.vp[i], b = o.vp[i + 1]; o.x = a[0] + (b[0] - a[0]) * f; o.y = a[1] + (b[1] - a[1]) * f; o.cut += w; if (o.cut > 1.8) { o.cut = 0; G.addLac(S, o.x, o.y); } } }
    else if (o.stage === 3) { o.amp = .08; } },
});
G.defObject('reed', { drain: 0, ghost: true, req: false,
  init(o) { o.dose = true; o.sedated = false; o.ontop = true; o.r = 6; },
  want: o => o.sedated ? null : 'syringe', verb: 'Inject', step(o, S) { o.open = S.sinceBeat < .3 && !o.sedated; },
  dosed(o, S, p, g, half) { const m = G.getObj(S, o.owner); if (S.sinceBeat < .3 || S.breath) { if (half && !o.halfed) o.halfed = true; else { o.sedated = true; o.dose = false; } G.grade(S, p, o.x, o.y, g, 'dose'); ev(S, 'sedate', Math.round(o.x), Math.round(o.y)); } else { ev(S, 'spit', Math.round(o.x), Math.round(o.y)); G.hurt(S, 4 * T.strainDamage); G.addLac(S, o.x + 6, o.y + 6); } } });
})();
