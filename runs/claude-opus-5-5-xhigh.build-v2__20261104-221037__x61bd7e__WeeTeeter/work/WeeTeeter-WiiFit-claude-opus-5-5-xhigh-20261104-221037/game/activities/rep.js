/* activities/rep.js: the Rail. Squat, Push-Up and Side Lunge are one code path and three data rows. The lean IS the body:
 * holding the stick halfway holds you halfway. A bead rides the rail at the instructor's tempo. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px, clamp } = E, game = G.game, lib = G.lib;
const txt = (...a) => G.txt(...a);
const smooth = u => u * u * (3 - 2 * u);
const bead = (tier, u) => { /* u in seconds inside one rep: down, a hold, up */ const { down, hold, up } = tier; if (u < down) return smooth(u / down); if (u < down + hold) return 1; return 1 - smooth(Math.min(1, (u - down - hold) / up)); };
const BOTS = { poor: { lead: .1, noise: .14, form: .4 }, average: { lead: .26, noise: .05, form: 1 }, good: { lead: .33, noise: .02, form: 1.4 }, expert: { lead: .38, noise: .008, form: 2 } };
G.family('rep', {
  camera: { zoom: false },
  setup(ctx) {
    const { tier, def } = ctx, cyc = tier.down + tier.hold + tier.up;
    ctx.cycle = cyc;
    ctx.fixed = ctx.durGiven || ctx.short;
    ctx.reps = ctx.fixed ? Math.max(3, Math.floor(ctx.dur / cyc)) : tier.reps;
    ctx.dur = ctx.reps * cyc + .2;
    ctx.fatigueFrom = Math.floor(ctx.reps * .6); ctx.extra = false; ctx.bead = 0; ctx.repI = 0; ctx.flash = null;
    ctx.instructor = (ctx.mode === 'solo' || ctx.mode === 'games') ? (G.S.instructor || 'birch') : null;
    if (ctx.instructor) { ctx.teacher = G.instructorRig(ctx.instructor, ctx.size); ctx.teacherPoser = new G.Poser(ctx.teacher); ctx.teacherX = 74; }
    ctx.side = 1;
    const axisX = def.axis === 'x', set = { k: 26, c: 10, s: 0, sx: axisX ? 0 : 8, sy: axisX ? 8 : 0, A: 1.1, nf: 1.1, R: .24 };
    for (const c of ctx.contestants) {
      c.bal = new G.Balance(set, c.rng); c.bal.cheat = ctx.cheat; c.repSum = 0; c.repN = 0; c.err = 0; c.errT = 0; c.total = 0; c.formSum = 0; c.formT = 0; c.grade = null; c.gradeT = 0; c.done = 0;
      if (ctx.contestants.length === 1) c.x = ctx.instructor ? -34 : 0;
      c.bal.onStumble = () => {};
    }
  },
  preview(dt, ctx) {
    G.stageCam(); if (ctx.done) return G.celebrate(ctx, dt);
    const u = (game.real % ctx.cycle), b = bead(ctx.tier, u);
    for (const c of ctx.contestants) G.repBody(ctx, c, c.poser, c.rig, 0, 0, c.x, 0, dt, 'smile');
    if (ctx.teacher) G.repBody(ctx, null, ctx.teacherPoser, ctx.teacher, b * (ctx.def.axis === 'x' ? Math.sin(game.real * 3.14159 / ctx.cycle) >= 0 ? 1 : -1 : 1), 0, ctx.teacherX, -6, dt);
  },
  update(dt, ctx) {
    const { tier, def } = ctx, t = ctx.time; G.stageCam();
    const k = Math.floor(t / ctx.cycle), u = t - k * ctx.cycle;
    /* a rep ends: score it */
    if (k > ctx.repI) {
      ctx.repI = k;
      for (const c of ctx.contestants) {
        const mean = c.errT > 0 ? c.err / c.errT : 1, tol = G.DEV.repTol, score = clamp((.35 * tol - mean) / ((.35 - .08) * tol), 0, 1);
        c.repSum += score; c.repN++; c.err = 0; c.errT = 0; c.grade = score >= .85 ? 'Perfect' : score >= .5 ? 'Good' : 'Late'; c.gradeT = 1;
        if (G.cue(ctx, c)) { if (score >= .85) G.A.sfx('hit'); else if (score >= .5) G.A.sfx('click'); else G.A.sfx('miss'); if (score > .5) G.grunt('member'); }
      }
      if (def.axis === 'x') ctx.side = -ctx.side;
      /* "Two more": if you are scoring above .8, the instructor adds two bonus reps */
      const lead = ctx.local || ctx.contestants[0];
      if (!ctx.fixed && !ctx.extra && k === ctx.reps - 1 && lead.repN && lead.repSum / lead.repN > .8) { ctx.extra = true; ctx.reps += 2; ctx.dur = ctx.reps * ctx.cycle + .2; if (ctx.instructor) G.mutter(ctx.instructor, G.DATA.lines[ctx.instructor].moreFirst, { auto: 3 }); }
      else if (ctx.extra && !ctx.saidMore && k === ctx.reps - 1 && ctx.instructor) { ctx.saidMore = true; G.mutter(ctx.instructor, G.DATA.lines[ctx.instructor].more, { auto: 3 }); }
    }
    const raw = bead(tier, u), signed = def.axis === 'x' ? raw * ctx.side : raw; ctx.bead = signed;
    /* fatigue: after 60% of the reps, the tremble rises and the response falls */
    const fat = clamp((ctx.repI - ctx.fatigueFrom + u / ctx.cycle) / Math.max(1, ctx.reps - ctx.fatigueFrom), 0, 1) * G.DEV.fatigue;
    if (fat > .35 && !ctx.saidTired && ctx.instructor && ctx.local && !ctx.quiet) { ctx.saidTired = true; G.mutter(ctx.instructor, G.DATA.lines[ctx.instructor].tired, { auto: 3 }); }
    for (const c of ctx.contestants) {
      const b = c.bal, I = c.intent;
      b.set.A = 1.1 * (1 + fat * 1.6); b.set.k = 26 * (1 - fat * .22);
      b.ringX = def.axis === 'x' ? signed : 0; b.ringY = def.axis === 'x' ? 0 : -raw;
      b.step(dt, I.x, I.y);
      const val = def.axis === 'x' ? b.x : clamp(-b.y, 0, 1), form = def.axis === 'x' ? b.y : b.x;
      c.err += Math.abs(val - signed) * dt; c.errT += dt; c.formSum += Math.abs(form) * dt; c.formT += dt; c.gradeT = Math.max(0, c.gradeT - dt); c.val = val; c.form = form;
      G.repBody(ctx, c, c.poser, c.rig, val, form, c.x, 0, dt, Math.abs(form) > .35 || fat > .7 ? 'wince' : 'smile', fat);
      if (G.cue(ctx, c) && Math.abs(form) > .45) { c.creakT = (c.creakT || 0) - dt; if (c.creakT <= 0) { G.A.sfx('creak'); c.creakT = .5; if (c.input) c.input.rumble(.3, .1); } }
    }
    if (ctx.teacher) G.repBody(ctx, null, ctx.teacherPoser, ctx.teacher, signed, 0, ctx.teacherX, -6, dt);
  },
  result(ctx, c) {
    const mean = c.repN ? c.repSum / c.repN : 0, f = c.formT > 0 ? c.formSum / c.formT : 0, pen = clamp(Math.max(0, f - .06) * 1.2, 0, .3);
    return { pct: mean * (1 - pen), detail: 'Reps ' + c.repN + '. Timing ' + Math.round(mean * 100) + '%. Form ' + Math.round((1 - pen / .3) * 100) + '%.' };
  },
  bot(ctx, c, dt) {
    const B = BOTS[c.brain.skill], t = ctx.time + B.lead, k = Math.floor(t / ctx.cycle), raw = bead(ctx.tier, t - k * ctx.cycle), s = ctx.def.axis === 'x' ? (ctx.side * (k > ctx.repI ? -1 : 1)) : 1;
    c.nz = c.nz || G.noise(c.rng, 2); const n = B.noise * c.nz(ctx.time), want = raw * s + n;
    const b = c.bal, I = c.intent;
    if (ctx.def.axis === 'x') { I.x = clamp(want, -1, 1); I.y = clamp(-b.y * B.form - b.vy * .3 + n, -1, 1); }
    else { I.y = clamp(-want, -1, 1); I.x = clamp(-b.x * B.form - b.vx * .3 + n, -1, 1); }
  },
  ghost(ctx, c) { return { v: c.val || 0 }; },
  draw(r, ctx) {
    (G.ROOMS[ctx.def.room] || G.ROOMS.iron)(r, { dusk: G.roomDusk && G.roomDusk() });
    for (const c of ctx.contestants) G.drawMat(r, c.x, 0, ctx.def.facing < .5 ? 42 : 30 * (ctx.size / 2.1), 9, c.local ? '#ffd8cc' : '#e8f0f2');
    if (ctx.teacher) G.drawMat(r, ctx.teacherX, -6, ctx.def.facing < .5 ? 40 : 30 * (ctx.size / 2.1), 9, '#f4e6cf');
    for (const c of ctx.contestants) G.drawRig(r, c.rig, c.x, 0, 0);
    if (ctx.teacher) G.drawRig(r, ctx.teacher, ctx.teacherX, -6);
    G.drawGhosts && G.drawGhosts(r, ctx);
  },
  hud(g, ctx) {
    const W = game.W, H = game.H, many = ctx.contestants.length > 1, horiz = ctx.def.axis === 'x';
    if (!ctx.live && !ctx.showHud) return;
    if (ctx.live) { G.panel(g, 8, 6, 74, 20, { r: 8 }); txt(g, 'Rep ' + Math.min(ctx.repI + 1, ctx.reps) + ' / ' + ctx.reps, 45, 12, '#20404c', { align: 'center' }); }
    for (const c of ctx.contestants) {
      if (c.life) continue; const b = c.bal;
      const base = game.r.w(c.x, 0, 0);
      if (horiz) {   // a horizontal rail above the Plate's place
        const y = many ? H - 30 : H - 26, w = many ? 34 : 86, x = base[0];
        px.rect(g, x - w - 4, y - 2, 2 * w + 8, 5, '#c8dde2'); px.rect(g, x - w - 4, y - 1, 2 * w + 8, 2, '#ffffff'); px.rect(g, x, y - 4, 1, 9, '#7a8a94');
        const bx = x + ctx.bead * w, mx = x + clamp(c.val || 0, -1, 1) * w; px.disc(g, bx, y, many ? 5 : 7, '#14a8c8'); px.disc(g, bx, y, many ? 3 : 5, '#7fe6f8'); px.disc(g, mx, y, many ? 3 : 4, '#20404c'); px.disc(g, mx, y, many ? 2 : 3, c.color);
        if (c.gradeT > 0) txt(g, c.grade, x, y - (many ? 20 : 30), c.grade === 'Late' ? '#e0553a' : '#14a8c8', { align: 'center', scale: many ? 1 : 2, shadow: '#ffffff' });
        if (many) txt(g, c.name, x, y + 8, c.color, { align: 'center', shadow: '#ffffff' });
      } else {       // a vertical rail beside the rig
        const prone = ctx.def.facing < .5, x = base[0] + (many ? 26 : prone ? 64 : 46), top = base[1] - (many ? 52 : 74), h = many ? 54 : 78;
        px.rect(g, x - 4, top - 5, 9, h + 10, '#5f7f8a'); px.rect(g, x - 3, top - 4, 7, h + 8, '#c8dde2'); px.rect(g, x - 1, top - 4, 3, h + 8, '#ffffff');
        const by = top + ctx.bead * h, my = top + (c.val || 0) * h; px.disc(g, x, by, many ? 5 : 7, '#14a8c8'); px.disc(g, x, by, many ? 3 : 5, '#7fe6f8'); px.disc(g, x, my, many ? 3 : 4, '#20404c'); px.disc(g, x, my, many ? 2 : 3, c.color);
        if (c.gradeT > 0) txt(g, c.grade, x, top - 14, c.grade === 'Late' ? '#e0553a' : '#14a8c8', { align: 'center', scale: many ? 1 : 2, shadow: '#ffffff' });
        if (many) txt(g, c.name, base[0], H - 12, c.color, { align: 'center', shadow: '#ffffff' });
      }
      if (!many && !horiz) G.drawPlate(g, b, { x: W / 2, y: H - 34, r: 26, ring: [b.ringX, b.ringY, b.R], color: c.color });
    }
    if (ctx.live) G.prompts(g, [['lean', ctx.def.axis === 'x' ? 'Lean with the bead' : 'Down with the bead']]);
    if (G.DEV.trace && ctx.local) txt(g, 'err ' + (ctx.local.errT ? (ctx.local.err / ctx.local.errT).toFixed(3) : '-') + ' form ' + (ctx.local.form || 0).toFixed(2), W / 2, 40, '#20404c', { align: 'center', shadow: '#ffffff' });
  }
});
/** one body at a depth: clip scrubbed, or a hand-posed lunge. The lean is the pose */
G.repBody = (ctx, c, poser, rig, val, form, x, y, dt, expr, fat = 0) => {
  const def = ctx.def;
  if (def.bodyMove) { poser.off(); rig.body = G.moves[def.bodyMove](clamp(val, -1, 1)); rig.mocap = null; rig.update(dt, { x, y, z: 0, vx: 0, vy: 0, facing: def.facing, expr }); }
  else { const cl = lib.clip(def.clip), bot = def.bottomShare !== undefined ? cl.dur * def.bottomShare : def.bottom, tt = def.top + (bot - def.top) * clamp(val, 0, 1); poser.scrub(def.clip, tt, def.facing); poser.update(dt); rig.update(dt, { x, y, z: 0, vx: 0, vy: 0, facing: poser.facing, expr }); }
  const shake = fat > 0 ? Math.sin(game.real * 42) * .05 * fat : 0;
  rig.wob = [clamp(form, -1, 1) * .55 + shake, 0];
};
})();
