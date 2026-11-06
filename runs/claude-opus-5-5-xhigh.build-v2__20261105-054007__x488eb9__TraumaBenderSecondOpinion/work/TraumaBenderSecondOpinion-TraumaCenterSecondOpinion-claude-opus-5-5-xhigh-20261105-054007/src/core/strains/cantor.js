// Cantor: a vast choir-organ wrapped around the heart. Four movements (section 8): Exposition, Development, Recapitulation, Coda.
(() => {
const G = (window.GAME ||= {}), T = G.TUNING, U = G.U, def = G.defObject, Op = () => G.Op, Score = () => G.Score;

// ---- Exposition: it conducts. Slash three baton tendrils at the pause of each arc, then burn each mouth's uvula.
def('cantorEx', {
  strain: true, sings: true, r: 0, prio: 6, accept: () => null, init(o, S) { o.t = 0; o.secT = 5; o.sec = 0; o.spawned = false; o.req = true; o.x = o.x ?? 213; o.y = o.y ?? 100; for (let i = 0; i < 3; i++) Op().spawn(S, { type: 'baton', x: 213, y: 80, idx: i, owner: o.id, req: true }); },
  ghost: o => ({ k: 'cantor', x: o.x, y: o.y }),
  step(o, S, w) {
    o.t += w; o.secT -= w * T.spawnRate;
    if (o.secT <= 0) { o.secT = 6; o.sec++; const k = o.sec % 3; S.ev.push(['cantorSing', k]);
      if (k === 0 && !S.objs.some(q => q.type === 'legato' && !q.done)) { const route = U.curve([[90, 150], [160, 136], [250, 152], [336, 134], [320, 170], [230, 176], [130, 176], [90, 150]], 6); Op().spawn(S, { type: 'legato', route, segs: 4, speed: 40, limit: 70, hidden: false, noBarb: true, cycle: 22, surfaceT: 5 }); S.ev.push(['legatoSing', 213]); }
      else if (k === 1) { for (let i = 0; i < 2; i++) if (S.objs.filter(q => q.type === 'bead' && !q.done).length < 5) Op().spawn(S, { type: 'bead', x: 110 + U.range(S, -10, 10), y: 66 + U.range(S, -6, 6), req: false, fromCapo: true }); }
      else if (k === 2) { if (S.objs.filter(q => q.type === 'bleeder' && !q.done).length < 3) Op().spawn(S, { type: 'bleeder', x: U.range(S, 120, 310), y: U.range(S, 120, 170), req: false, feed: 4, optJob: true }); }
    }
    const left = S.objs.some(q => (q.type === 'baton' || q.type === 'uvula') && !q.done);
    if (o.mouths && !left) o.secT = 1e9;
    if (!o.mouths && !S.objs.some(q => q.type === 'baton' && !q.done)) { o.mouths = true; S.ev.push(['batonsDown']); S.ev.push(['sayp', 'mouths']); for (const m of [[110, 66], [213, 40], [316, 62]]) Op().spawn(S, { type: 'uvula', x: m[0], y: m[1], owner: o.id, req: true }); }
    else if (o.mouths && !left) { for (const b of S.objs) if (b.type === 'bead' && b.fromCapo) b.done = true; o.done = true; S.ev.push(['strainHit', o.x, o.y]); }
  },
});
def('baton', {
  strain: true, r: 8, worth: 130, reach: 6, ghost: o => ({ k: 'baton', x: o.x, y: o.y, pause: o.paused }),
  init(o) { o.t = o.idx * 1.3; o.cx = 213; o.cy = 76; o.paused = false; },
  accept: (o, t) => t === 'scalpel' && o.paused ? 'Slash' : null,
  step(o, S, w) { o.t += w * T.strainSpeed; const per = 3, u = (o.t % per) / per, arcU = Math.min(1, u / .72), a = -2.6 + (o.idx * .9) + Math.sin(arcU * 3.14) * 1.6; o.x = o.cx + Math.cos(a) * 110; o.y = o.cy + 34 + Math.sin(a) * 60; o.paused = u > .72; },
  slashed(S, h, o) { S.ev.push(['strainHit', o.x, o.y]); Op().finishObj(S, o, h, 'Textbook', 130, 'scalpel'); },
  bot: function* (o, S, B) { yield* B.tool('scalpel'); let w = 0; const a = 1.0, r = 26; while (!o.done && w++ < 2400) { const dx = o.x - Math.cos(a) * r - B.c.x, dy = o.y - Math.sin(a) * r - B.c.y, d = Math.hypot(dx, dy); if (d > 2) B.steer(dx, dy, d, 330); if (o.paused && d < 8) break; yield; } if (o.done) return; const u0 = o.t; B.press(); yield; yield* B.line(o.x + Math.cos(a) * r, o.y + Math.sin(a) * r, 300); B.release(); yield; },
});
def('uvula', { strain: true, r: 5, hazard: .25, worth: 150, accept: (o, t) => t === 'cautery' ? 'Burn' : null, burnNeed: () => 1.5 * T.strainHealth, ghost: o => ({ k: 'uvula', x: o.x, y: o.y }) });

// ---- Development: the hush falls. Static on the monitor, domes and tremor together. Find the voice box with Sonar and sedate it on the beat, three times.
def('cantorDev', {
  strain: true, sings: true, prio: 6, accept: () => null, init(o, S) { o.t = 0; o.domeT = 3; o.req = true; o.x = 213; o.y = 100; o.silentT = 15; o.gap = 0; S.silent = 1; S.ev.push(['hush', 1]); },
  ghost: o => ({ k: 'cantor', x: o.x, y: o.y }),
  hazard: () => .35,
  step(o, S, w) {
    o.t += w;
    if (S.silent > 0) { o.silentT -= w; if (o.silentT <= 0) { S.silent = 0; o.gap = 5; S.ev.push(['hush', 0]); } if ((o.readT = (o.readT ?? 4) - w) <= 0) { o.readT = 6; S.ev.push(['readout', Math.ceil(S.vitals / 5) * 5]); } }
    else { o.gap -= w; if (o.gap <= 0) { S.silent = 1; o.silentT = 15; S.ev.push(['hush', 1]); } }
    const vb = S.objs.find(q => q.type === 'voicebox' && !q.done);
    S.jitter = vb ? { x: vb.x, y: vb.y, r: 110, amp: .55 } : null;
    o.domeT -= w; if (o.domeT <= 0) { o.domeT = 7; if (S.objs.filter(q => q.type === 'dome' && !q.done).length < 2) { Op().spawn(S, { type: 'dome', x: U.range(S, 100, 330), y: U.range(S, 66, 170), r: 34, t: 5, req: false }); S.ev.push(['domeRise', o.x, o.y]); } }
    if (S.t - (o.singT ?? -9) > 3.2) { o.singT = S.t; S.ev.push(['cantorSing', 3]); }
    if (!vb) { for (const d of S.objs) if (d.type === 'dome') d.done = true; S.silent = 0; S.jitter = null; o.done = true; S.ev.push(['hush', 0]); S.ev.push(['strainHit', o.x, o.y]); }
  },
});
def('voicebox', {
  strain: true, sings: true, r: 5, prio: 2, hazard: 0, ghost: o => ({ k: 'voicebox', x: o.x, y: o.y }),
  init(o) { o.hits = 0; o.need = o.need ?? 3; o.req = true; if (o.hidden === undefined) o.hidden = true; o.moveT = 0; },
  accept: (o, t) => t === 'syringe' ? 'Sedate' : null,
  doseWindow: (o, S) => G.beatWindow(S),
  dose(S, h, o, q) {
    if (G.beatWindow(S)) { o.hits++; S.ev.push(['sedate', o.x, o.y]); Score().award(S, h, o.x, o.y, q, 180); o.hidden = true; o.marked = 0; o.x = U.range(S, 110, 320); o.y = U.range(S, 70, 170); if (o.hits >= o.need) Op().finishObj(S, o, h, null, 0, 'syringe'); }
    else { S.ev.push(['reedSpit', o.x, o.y]); Score().hurt(S, 3 * T.strainDamage); S.flow = 0; S.ev.push(['say', 'beat']); }
  },
});

// ---- Recapitulation: every so often it rewinds the field six seconds. Slash the sign during the wind-up, or answer with Second Look. Six end it.
def('cantorRecap', {
  strain: true, sings: true, prio: 3, accept: () => null, init(o, S) { o.t = 0; o.every = o.every ?? 14; o.need = o.need ?? 6; o.bleedT = 4; o.req = true; o.x = 213; o.y = 100; S.keep.recap = 0; S.flags.recap = true; o.hazard0 = 0; },
  ghost: o => ({ k: 'cantor', x: o.x, y: o.y }),
  hazard: () => .3,
  step(o, S, w, dt) {
    o.t += w;
    if ((S.keep.recap || 0) >= o.need) { for (const q of S.objs) if (q.type === 'repeatSign') q.done = true; S.flags.recap = false; G.aux(S).preForced = null; o.done = true; S.ev.push(['strainHit', o.x, o.y]); return; }
    o.bleedT -= w; if (o.bleedT <= 0) { o.bleedT = 6; if (S.objs.filter(q => q.type === 'bleeder' && !q.done).length < 3) Op().spawn(S, { type: 'bleeder', x: U.range(S, 110, 320), y: U.range(S, 110, 170), req: false, feed: 4 }); }
    if (o.t >= o.every - 3 && !S.objs.some(q => q.type === 'repeatSign' && !q.done)) { Op().spawn(S, { type: 'repeatSign', x: U.range(S, 150, 280), y: U.range(S, 80, 150), owner: o.id, t: 3, req: false }); S.ev.push(['recapWind', o.x, o.y]); S.ev.push(['sayp', 'recap']); }
  },
  job(o, S, h) { const sign = S.objs.find(q => q.type === 'repeatSign' && !q.done); if (sign) return { tool: 'scalpel', o: sign }; const bl = S.objs.find(q => q.type === 'bleeder' && !q.done); if (bl) { if (Op().covered(S, bl)) { const pool = S.objs.find(q => q.type === 'pool' && !q.done); if (pool) return { tool: 'suction', o: pool }; } return { tool: 'cautery', o: bl }; } return { tool: 'scalpel', o, plan: 'waitSign' }; },
});
def('repeatSign', {
  strain: true, r: 14, reach: 6, worth: 150, ghost: o => ({ k: 'repeatSign', x: o.x, y: o.y }), accept: (o, t) => t === 'scalpel' ? 'Slash' : null,
  step(o, S, w) {
    o.t -= w;
    if (o.t <= 0) { const c = Op().byId(S, o.owner); o.done = true; if (c) c.t = 0; const cid = o.owner; G.Op.rewind(S, Math.min(6, T.lookSeconds), { forced: true, show: 1.2 }); const c2 = Op().byId(S, cid); if (c2) c2.t = 0; S.ev.push(['recapFire']); }
  },
  slashed(S, h, o) { const c = Op().byId(S, o.owner); S.keep.recap = (S.keep.recap || 0) + 1; if (c) c.t = 0; S.ev.push(['strainHit', o.x, o.y]); S.ev.push(['recapCount', S.keep.recap]); Op().finishObj(S, o, h, 'Textbook', 150, 'scalpel'); },
});
G.defAction('recapCounter', S => { S.keep.recap = (S.keep.recap || 0) + 1; S.ev.push(['recapCount', S.keep.recap]); S.ev.push(['sayp', 'seenthis']); Score().award(S, S.hands[0], 213, 100, 'Textbook', 150); });

// ---- Coda: the Last Note. Forceps draws it out on a rising tone, up to a scream, then total silence.
def('lastNote', {
  strain: true, r: 8, prio: 3, worth: 500, accept: (o, t) => t === 'forceps' ? 'Draw' : null, init(o) { G.mkPull(o, { depth: 46, max: 34, ang: -1.45 }); o.req = true; },
  ghost: o => ({ k: 'lastNote', x: o.x, y: o.y }),
  grip(S, h, o) { S.ev.push(['noteDraw', o.x, o.y]); },
  freed(S, h, o) { },
  onDone(S, h, o) { S.flags.noteOut = true; S.silent = 2; S.ev.push(['noteOut']); },
  bot: function* (o, S, B) { yield* B.tool('forceps'); yield* B.moveTo(() => o.x, () => o.y, undefined, 1.4); B.press(); yield; const p = o.pull, sp = p.max * .62, left = p.depth - p.prog + 3; yield* B.line(B.c.x + p.ax * left, B.c.y + p.ay * left, sp); yield; const dx = o.x - o.ox, dy = o.y - o.oy, l = Math.hypot(dx, dy) || 1; if (l < 28) yield* B.line(B.c.x + dx / l * (28 - l), B.c.y + dy / l * (28 - l), 90); B.release(); yield; yield; },
});

const reg = () => {
  const P = G.Bot.plans;
  P.waitSign = function* (o, S, B) { yield* B.tool('scalpel'); yield* B.moveTo(213, 112, undefined, 8); let w = 0; while (w++ < 240 && !B.S.objs.some(q => q.type === 'repeatSign' && !q.done)) yield; };
};
if (G.Bot) reg(); else (G._after ||= []).push(reg);
})();
