// Cantor: the choir-organ around the heart. Four movements, each a phase: conducting, the hush, the forced rewinds, the Last Note.
(() => {
const G = (window.GAME ||= {}), { ev, rnd, clamp, polyAt } = G, T = G.T;
G.defObject('baton', { req: true, drain: .2, ghost: true,
  init(o) { o.r = 11; o.ontop = true; o.u = 0; o.dirn = 1; o.pause = 0; o.cx = o.x; o.cy = o.y; o.rad = o.rad || 56; o.ph0 = o.ph0 || 0; },
  want: o => o.pause > 0 ? 'scalpel' : null, slashable: o => o.pause > 0, verb: 'Slash', slash(o, S, p) { G.grade(S, p, o.x, o.y, 'textbook', 'slash'); ev(S, 'tendril', Math.round(o.x), Math.round(o.y)); G.kill(S, o); },
  step(o, S, w) { if (o.pause > 0) { o.pause -= w; o.open = true; if (o.pause <= 0) o.dirn = -o.dirn; } else { o.open = false; o.u += o.dirn * w * .42 * T.strainSpeed; if (o.u >= 1 || o.u <= 0) { o.u = clamp(o.u, 0, 1); o.pause = 2.8; ev(S, 'batonrest', Math.round(o.x), Math.round(o.y)); } } const a = o.ph0 + (o.u - .5) * 2.4; o.x = o.cx + Math.cos(a) * o.rad; o.y = o.cy + Math.sin(a) * o.rad * .6; } });
G.defObject('uvula', { drain: .25, ghost: true, init(o) { o.burn = o.burn0 = 1.5 * T.strainHealth; o.r = 8; o.ontop = true; }, want: () => 'cautery', verb: 'Burn' });
G.defObject('voicebox', { drain: .3, ghost: true,   // the hush's voice: found by Sonar, sedated on the beat, three times
  init(o) { o.hidden = true; o.mark = 0; o.hits = 0; o.moveT = 8; o.dose = true; o.r = 8; o.ontop = true; },
  want: o => o.mark > 0 ? 'syringe' : null, verb: 'Inject',
  step(o, S, w) { o.open = S.sinceBeat < .3; o.moveT -= w; if (o.moveT <= 0 && !(o.mark > 0)) { o.moveT = 8; o.x = clamp(o.x + (rnd(S) - .5) * 120, 100, 330); o.y = clamp(o.y + (rnd(S) - .5) * 70, 60, 170); } S.aura = { x: o.x, y: o.y, amp: .6, r: 110 }; },
  dosed(o, S, p, g) { if (S.sinceBeat < .3 || S.breath) { o.hits++; G.grade(S, p, o.x, o.y, g, 'dose'); ev(S, 'sedate', Math.round(o.x), Math.round(o.y)); if (o.hits >= 3) { S.flags.voice_dead = true; G.kill(S, o); } else { o.mark = 0; o.moveT = 0; } } else { ev(S, 'spit', Math.round(o.x), Math.round(o.y)); G.hurt(S, 3); } } });
G.defObject('repeatSign', { req: false, ghost: true, init(o) { o.r = 18; o.ontop = true; o.life = 3; o.open = true; }, want: () => 'scalpel', verb: 'Slash', slashable: () => true,
  slash(o, S, p) { S.out.recap++; G.grade(S, p, o.x, o.y, 'textbook', 'slash'); ev(S, 'recapcut', Math.round(o.x), Math.round(o.y)); G.kill(S, o); },
  step(o, S, w) { o.life -= w; if (o.life <= 0) { G.kill(S, o); if (S.ph.d) { S.ph.d.fire = true; } } } });
G.defObject('note', { drain: 0, ghost: true, init(o) { G.mkPull(o, { a: -1.57, depth: 60, maxV: 58, off: 12, par: 3.2 }); o.ontop = true; }, want: () => 'forceps', verb: 'Draw out',
  pulling(o, S) { ev(S, 'noterise', o.pull.prog / o.pull.depth); },
  onFree(o, S, p) { p.hold = null; G.grade(S, p, o.x, o.y, o.pull.tears ? 'clean' : 'textbook', 'forceps'); G.kill(S, o); S.silent = true; S.out.hold = 3; S.out.holdDone = 'afterSilence'; ev(S, 'silence'); } });
G.defScript('afterSilence', S => { S.silent = false; S.out.hold = 0; S.flags.note_out = true; ev(S, 'lastbeep'); });
const sing = (S, d, w) => { d.sing = (d.sing || 2) - w * T.spawnRate; if (d.sing > 0) return; d.sing = 4.5; let n = 0, b = 0; for (const q of S.objs) { if (q.type === 'bead' && !q.dead) n++; if ((q.type === 'bleeder') && !q.dead) b++; } const k = (d.k = (d.k || 0) + 1) % 3; ev(S, 'sing', k); if (k === 0 && n < 4) G.spawn(S, { t: 'bead', x: 120, y: 90, req: false }); else if (k === 1 && S.objs.filter(q => q.type === 'sliver' && !q.dead).length < 2) G.spawn(S, { t: 'sliver', x: 300, y: 130, req: false }); else if (b < 2) G.spawn(S, { t: 'bleeder', x: 150 + rnd(S) * 130, y: 70 + rnd(S) * 90, req: false }); };
G.defScript('cantor1', (S, ph, w) => { const d = S.ph.d; sing(S, d, w); if (!d.stage2 && !S.objs.some(o => o.type === 'baton' && !o.dead)) { d.stage2 = true; ev(S, 'mouths'); for (const [x, y] of [[135, 100], [213, 72], [292, 100]]) G.spawn(S, { t: 'uvula', x, y }); } if (d.stage2 && !S.objs.some(o => o.type === 'uvula' && !o.dead)) d.done = true; });
G.defScript('cantor2enter', S => { S.hush = true; ev(S, 'hush'); });
G.defScript('cantor2', (S, ph, w) => { const d = S.ph.d; d.st = (d.st === undefined ? 15 : d.st) - w; if (d.st <= 0) { S.static = !S.static; d.st = S.static ? 8 : 15; ev(S, S.static ? 'staticon' : 'staticoff'); } d.readT = (d.readT || 3) - w; if (d.readT <= 0) { d.readT = 6; ev(S, 'readout', Math.round(S.v)); }
  d.dome = (d.dome || 5) - w; if (d.dome <= 0) { d.dome = 7; if (S.objs.filter(o => o.type === 'dome' && !o.dead).length < 2) G.spawn(S, { t: 'dome', x: 120 + rnd(S) * 190, y: 70 + rnd(S) * 90, life: 5 }); }
  if (S.flags.voice_dead) { d.done = true; } });
G.defScript('cantor2leave', S => { S.hush = false; S.static = false; ev(S, 'hushend'); });
G.defScript('cantor3', (S, ph, w) => { const d = S.ph.d; if (d.counterOpen > 0) d.counterOpen -= w; d.next = (d.next === undefined ? 12 : d.next) - w; if (S.out.recap >= (S.attract ? 2 : 6)) { d.done = true; return; }
  d.haz = (d.haz || 3) - w; if (d.haz <= 0) { d.haz = 5; if (S.objs.filter(o => o.type === 'polyp' && !o.dead).length < 4) G.spawn(S, { t: 'polyp', x: 110 + rnd(S) * 210, y: 60 + rnd(S) * 110, req: false }); }
  if (d.next <= 0 && !S.objs.some(o => o.type === 'repeatSign' && !o.dead)) { G.spawn(S, { t: 'repeatSign', x: 213, y: 96 }); d.next = 17; ev(S, 'windup'); }
  if (d.fire) { d.fire = false; const secs = T.lookSeconds, cnt = S.out; const n = S.ph.d.next; if (G.Op.rewind(S, secs, true)) { S.ph.d.counterOpen = 4.5; S.ph.d.next = n; } ev(S, 'forced'); } });
G.defScript('cantor4', (S, ph, w) => { S.flags.heart = true; if (S.flags.note_out) S.ph.d.done = true; });
})();
