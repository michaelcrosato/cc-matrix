/* activities/hold.js: the hold family. Stork Stand and Sun Flow: hold the dot in the ring while the body wobbles. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px, clamp } = E, game = G.game;
const txt = (...a) => G.txt(...a);

G.family('hold', {
  camera: { zoom: false },
  setup(ctx) {
    const { tier, def } = ctx;
    ctx.moveT = 0; ctx.gull = null; ctx.gullI = 0; ctx.guide = 0; ctx.dust = [];
    ctx.ringNext = tier.ringEvery; ctx.ring = [0, 0]; ctx.ringTo = [0, 0];
    ctx.instructor = (ctx.mode === 'solo' || ctx.mode === 'games') ? (G.S.instructor || 'birch') : null;
    if (ctx.instructor) { ctx.teacher = G.instructorRig(ctx.instructor, ctx.size); ctx.teacherPoser = new G.Poser(ctx.teacher); ctx.teacherX = 70; }
    ctx.poseI = 0; ctx.poses = tier.poses || ['stork'];
    ctx.contestants.forEach(c => {
      c.bal = new G.Balance(tier.set, c.rng); c.bal.cheat = ctx.cheat;
      if (ctx.contestants.length === 1) c.x = ctx.instructor ? -34 : 0;
      c.bal.onStumble = () => { c.fellT = 1; if (G.cue(ctx, c)) { G.A.sfx('stumble'); game.shake(.08); if (c.input) c.input.rumble(.8, .3); if (!ctx.saidFall) { ctx.saidFall = true; G.mutter('tare', G.line('tare.fall')); } } };
      c.poser.pose(ctx.poses[0], 0); c.breath = 0; c.match = 0; c.matchT = 0; c.fellT = 0; c.bird = null;
    });
    if (ctx.teacherPoser) ctx.teacherPoser.pose(ctx.poses[0], 0);
    if (ctx.guided) {   // Day 1: Lean, Hold, Recover. The clock waits for the lesson
      ctx.lesson = { step: 0, t: 0, held: 0 }; ctx.holdClock = true; ctx.ring = [.42, .12]; ctx.contestants[0].bal.retarget({ s: 3, A: 1.4, pushEvery: 0 });
    }
    if (tier.blind) { ctx.tone = new G.Tone({ freq: 330 }); }
    ctx.floorMat = '#bfeee0';
    ctx.guideVal = 0;
  },
  preview(dt, ctx) {
    G.stageCam(); if (ctx.done) return G.celebrate(ctx, dt);
    for (const c of ctx.contestants) { c.poser.clip('Idle_Subtle', { tgt: 1.45, loop: true }); c.poser.update(dt); c.rig.update(dt, { x: c.x, y: 0, z: 0, vx: 0, vy: 0, facing: c.poser.facing, expr: 'smile' }); }
    if (ctx.teacherPoser) { ctx.teacherPoser.pose(ctx.poses[Math.floor(game.real / 4) % ctx.poses.length]); ctx.teacherPoser.update(dt); ctx.teacher.update(dt, { x: ctx.teacherX, y: -6, z: 0, vx: 0, vy: 0, facing: ctx.teacherPoser.facing }); }
    G.stageCam();
  },
  update(dt, ctx) {
    const { tier, def } = ctx, t = ctx.time;
    G.stageCam();
    /* Day 1's lesson */
    const L = ctx.lesson;
    if (L) { const c = ctx.contestants[0], who = G.S.instructor || 'birch'; L.t += dt;
      if (L.step === 0) { if (!L.said) { L.said = true; G.mutter(who, G.DATA.lines[who].lean); } if (c.bal.inRing) L.held += dt; if (L.held > 1 || L.t > 14) { L.step = 1; L.t = 0; L.said = false; G.A.sfx('ok'); } }
      else if (L.step === 1) { if (!L.said) { L.said = true; ctx.ring = [0, 0]; ctx.ringTo = [0, 0]; G.mutter(who, G.DATA.lines[who].hold); } if (L.t > 6) { L.step = 2; L.t = 0; L.said = false; c.bal.retarget({ s: 8 }); } }
      else if (L.step === 2) { if (!L.said) { L.said = true; G.mutter(who, G.DATA.lines[who].recover); ctx.gull = { side: 1, t: 0, stay: 5, force: 2.5 }; } if (L.t > 7) { ctx.lesson = null; ctx.holdClock = false; c.bal.retarget(tier.set); c.bal.inRingT = 0; c.bal.totalT = 0; c.bal.falls = 0; ctx.time = 0; } }
    }
    /* the ring moves to a new spot */
    if (!L && tier.ringReach && t >= ctx.ringNext) { ctx.ringNext += tier.ringEvery; const a = ctx.rng() * 6.283, d = tier.ringReach * (.5 + .5 * ctx.rng()); ctx.ringTo = [Math.cos(a) * d, Math.sin(a) * d]; }
    ctx.ring[0] += (ctx.ringTo[0] - ctx.ring[0]) * Math.min(1, dt * 1.5); ctx.ring[1] += (ctx.ringTo[1] - ctx.ring[1]) * Math.min(1, dt * 1.5);
    /* the gull: a constant push until it leaves with a little kick */
    const gs = tier.gull;
    if (!L && gs && ctx.gullI < gs.at.length && t >= gs.at[ctx.gullI] * (ctx.dur / (ctx.def.dur || ctx.dur))) { ctx.gullI++; ctx.gull = { side: ctx.rng() < .5 ? -1 : 1, t: 0, stay: gs.stay, force: gs.force }; if (ctx.local && !ctx.quiet) G.A.sfx('gull'); }
    const gl = ctx.gull;
    if (gl) { gl.t += dt; if (gl.t >= gl.stay) { for (const c of ctx.contestants) c.bal.kick(-gl.side * .4, .1); ctx.gull = null; if (ctx.local && !ctx.quiet) G.A.sfx('gull'); } }
    /* the pose: crossfade over .6 s */
    if (ctx.poses.length > 1) { const pd = ctx.dur / ctx.poses.length, k = Math.min(ctx.poses.length - 1, Math.floor(t / pd)); if (k !== ctx.poseI) { ctx.poseI = k; if (ctx.local && !ctx.quiet) { G.A.sfx('ok', { vol: .4 }); } } }
    /* the breath: a guide swells and shrinks */
    if (def.breath) { const [a, b] = tier.breaths, cyc = a + b, u = t % cyc; ctx.guideVal = u < a ? u / a : 1 - (u - a) / b; ctx.breathIn = u < a; }
    for (const c of ctx.contestants) {
      const b = c.bal, I = c.intent;
      b.ringX = ctx.ring[0]; b.ringY = ctx.ring[1];
      if (gl && gl.t < gl.stay && gl.t > .7) b.fx += gl.side * gl.force * G.DEV.push;
      b.step(dt, I.x, I.y);
      if (def.breath) { c.breath = I.breath; c.matchT += dt; if (Math.abs(c.breath - ctx.guideVal) <= .25) c.match += dt; }
      c.fellT = Math.max(0, c.fellT - dt);
      /* the body: tilt with p; flail near the edge; dizzy on a fall */
      const P = c.poser;
      if (b.stumbling > 0) P.clip('Dizzy', { fade: .15, loop: true, tgt: 1.3 });
      else if (b.edge > .78 && !def.breath) P.clip('Hop_One_Foot_Loop', { fade: .2, loop: true, tgt: 1.5 });
      else P.pose(ctx.poses[ctx.poseI], ctx.poseI ? .6 : .3);
      P.update(dt); c.rig.wob = [b.x, b.y];
      c.rig.update(dt, { x: c.x, y: 0, z: 0, vx: 0, vy: 0, facing: P.facing, expr: b.stumbling > 0 || b.edge > .7 ? 'wince' : b.inRing ? 'smile' : undefined });
      G.feelBalance(ctx, c, dt);
      if (c.local && !ctx.quiet && !ctx.saidGood && b.streak > 8 && ctx.instructor) { ctx.saidGood = true; G.mutter(ctx.instructor, G.DATA.lines[ctx.instructor].good, { auto: 3 }); }
      if (c.local && !ctx.quiet && b.inRing && b.streak > 1 && Math.floor(b.t * 3) !== Math.floor((b.t - dt) * 3) && G.P) G.P.glints(c.x + (G.cosmetic() - .5) * 26, 2, 22 + G.cosmetic() * 40, 1, '#bff3e2');
      /* Eyes Closed: a stereo tone says where you are */
      if (ctx.tone && c.local && !ctx.quiet) { const off = Math.hypot(b.x, b.y); ctx.tone.set({ pan: b.x * 1.3, freq: 300 + b.y * 180 + off * 80, vol: .05 + off * .12 }); if (off > .35 && Math.floor(b.t * 4) !== Math.floor((b.t - dt) * 4) && c.input) c.input.rumble(off * .7, .1); }
    }
    if (ctx.teacherPoser) { const lead = ctx.contestants[0].bal; ctx.teacherPoser.pose(ctx.poses[ctx.poseI]); ctx.teacherPoser.update(dt); ctx.teacher.wob = def.mirror ? [-lead.x * .6, lead.y * .6] : [Math.sin(ctx.time * .7) * .02, 0]; ctx.teacher.update(dt, { x: ctx.teacherX, y: -6, z: 0, vx: 0, vy: 0, facing: ctx.teacherPoser.facing }); }
  },
  stop(ctx) { if (ctx.tone) ctx.tone.stop(); },
  result(ctx, c) {
    const b = c.bal, st = ctx.time > 0 ? clamp(b.inRingT / Math.max(ctx.time, b.totalT), 0, 1) : 0;
    if (ctx.def.breath) { const m = c.matchT > 0 ? c.match / c.matchT : 0; return { pct: .6 * st + .4 * m, detail: 'Steadiness ' + Math.round(st * 100) + '%. Breath ' + Math.round(m * 100) + '%.' }; }
    return { pct: st - .05 * b.falls, detail: 'Steadiness ' + Math.round(st * 100) + '%. Falls: ' + b.falls + '.' };
  },
  bot(ctx, c, dt) { const u = c.brain.hold(dt, c.bal, ctx.ring[0], ctx.ring[1]); c.intent.x = u[0]; c.intent.y = u[1];
    if (ctx.def.breath) { const lag = c.brain.p.tau * .25; c.intent.breath = clamp(ctx.guideVal + (c.brain.p.noise) * Math.sin(ctx.time * 2.2 + c.i) * 1.4 - lag * .2, 0, 1); } },
  ghost(ctx, c) { return { p: ctx.poseI }; },
  draw(r, ctx) {
    (G.ROOMS[ctx.def.room] || G.ROOMS.deck)(r, { dusk: G.roomDusk && G.roomDusk() });
    for (const c of ctx.contestants) G.drawMat(r, c.x, 0, 30 * (ctx.size / 2.1), 9, c.matCol || (c.local ? '#bfeee0' : '#e8f0f2'));
    if (ctx.teacher) G.drawMat(r, ctx.teacherX, -6, 30 * (ctx.size / 2.1), 9, '#f4e6cf');
    for (const c of ctx.contestants) G.drawRig(r, c.rig, c.x, 0, 0, { alpha: c.life ? .95 : undefined });
    if (ctx.teacher) G.drawRig(r, ctx.teacher, ctx.teacherX, -6);
    G.drawGhosts && G.drawGhosts(r, ctx);
    /* the gull on an outstretched arm */
    const gl = ctx.gull;
    if (gl) { const k = clamp(gl.t / .7, 0, 1), lv = clamp((gl.t - gl.stay + .5) / .5, 0, 1);
      for (const c of ctx.contestants) { const J = c.rig.J && (gl.side > 0 ? c.rig.J.handR : c.rig.J.handL); if (!J) continue; if (!c.bird) c.bird = G.makeBird('gull'); const w = c.rig.worldOffset(J), hx = c.x + w[0], hz = w[2] + 3; const x = hx + gl.side * (1 - k) * 120 + gl.side * lv * 90, z = hz + (1 - k) * 50 + lv * 60; c.bird.update(1 / 60, { flap: k < 1 || lv > 0 ? 1 : 0 }); r.actor(x, 1, z, (g, ox, oy) => c.bird.draw(g, ox, oy, r.view)); } }
    if (ctx.tier.blind && ctx.live) r.overlay(g => { px.blend(g, .55, 'multiply', () => px.rect(g, 0, 0, game.W, game.H, '#43506a')); });
  },
  hud(g, ctx) {
    if (!ctx.live && !ctx.showHud) return;
    const W = game.W, H = game.H, many = ctx.contestants.length > 1, L = ctx.lesson;
    if (!L && ctx.live && !ctx.def.noTimer) G.drawTimer(g, G.left(ctx));
    for (const c of ctx.contestants) {
      const b = c.bal; if (ctx.tier.blind && !many) continue; if (c.life) continue;
      if (many) { const p = G.manyPlate(g, ctx, c); }
      else { G.drawPlate(g, b, { x: W / 2, y: H - 34, r: 26, ring: [b.ringX, b.ringY, b.R], color: c.color }); }
    }
    if (L) { const s = ['Lean', 'Hold', 'Recover'][L.step]; G.panel(g, W / 2 - 50, 8, 100, 24, { r: 8 }); txt(g, s, W / 2, 11, '#14a8c8', { align: 'center', scale: 2 }); G.prompts(g, [['lean', L.step === 0 ? 'Lean into the ring' : L.step === 1 ? 'Stay in the ring' : 'Lean away']]); }
    else if (ctx.live) G.prompts(g, ctx.def.breath ? [['lean', 'Lean'], ['breath', 'Breathe in']] : [['lean', 'Lean']]);
    if (ctx.def.breath && ctx.local) {   // the guide ring beside the Plate
      const cx = W / 2 - 66, cy = H - 34, gr = 7 + 21 * ctx.guideVal, mine = 5 + 21 * ctx.local.breath, ok = Math.abs(ctx.local.breath - ctx.guideVal) <= .25;
      px.disc(g, cx, cy, 30, '#ffffff'); px.disc(g, cx, cy, mine, ok ? '#bff3e2' : '#ffd8cc');
      const n = 40; for (let i = 0; i < n; i++) { const a = i / n * 6.283; px.rect(g, cx + Math.cos(a) * gr, cy + Math.sin(a) * gr, 2, 2, '#14a8c8'); }
      txt(g, ctx.breathIn ? 'In' : 'Out', cx, cy - 4, '#20404c', { align: 'center' });
      const nm = G.DATA.poses[ctx.poses[ctx.poseI]].name, nw = E.font.width(nm) + 14; G.panel(g, W / 2 - nw / 2, H - 80, nw, 15, { r: 6 }); txt(g, nm, W / 2, H - 76, '#20404c', { align: 'center' });
    }
    if (ctx.tier.blind && ctx.live && ctx.local) txt(g, G.DATA.lines.notes.listen, W / 2, H - 30, '#ffffff', { align: 'center', shadow: '#20404c' });
    if (G.DEV.trace && ctx.local && ctx.local.bal) { const b = ctx.local.bal; txt(g, 'x ' + b.x.toFixed(2) + ' y ' + b.y.toFixed(2) + ' falls ' + b.falls + ' st ' + (b.steadiness * 100).toFixed(0), W / 2, H - 76, '#20404c', { align: 'center', shadow: '#ffffff' }); }
  }
});
/** a small Plate under each contestant in a Class or ghost mat */
G.manyPlate = (g, ctx, c) => {
  const r = game.r, p = r.w(c.x, 0, 0), x = p[0], y = game.H - 22;
  G.drawPlate(g, c.bal, { x, y, r: 17, ring: [c.bal.ringX, c.bal.ringY, c.bal.R], color: c.color });
  G.txt(g, c.name, x, y - 28, c.color, { align: 'center', shadow: '#ffffff' });
};
})();
