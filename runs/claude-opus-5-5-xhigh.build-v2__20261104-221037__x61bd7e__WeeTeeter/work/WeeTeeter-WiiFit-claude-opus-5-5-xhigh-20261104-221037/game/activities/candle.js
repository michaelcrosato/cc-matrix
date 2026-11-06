/* activities/candle.js: Quiet Candle, and its duel. The flame reacts to the speed of the dot: be still, gently. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px, clamp } = E, game = G.game;
const txt = (...a) => G.txt(...a);
/** a candle and its flame on the floor. flame 0..1 */
G.drawCandle = (g, x, y, flame, s = 1, t = game.real) => {
  x = Math.round(x); y = Math.round(y);
  px.ell(g, x, y, 7 * s, 2 * s, '#c8b89a'); px.rect(g, x - 3 * s, y - 13 * s, 6 * s, 13 * s, '#fff8e8'); px.rect(g, x - 3 * s, y - 13 * s, 2 * s, 13 * s, '#ffffff'); px.rect(g, x + 1 * s, y - 13 * s, 2 * s, 13 * s, '#ecdfc4');
  px.line(g, x, y - 13 * s, x, y - 15 * s, '#5a4a3a');
  if (flame <= 0) return;
  const h = (5 + 9 * flame) * s, w = (1.6 + 2.2 * flame) * s, sw = Math.sin(t * 9) * .9 * s + Math.sin(t * 23) * .4 * s, by = y - 15 * s;
  px.blend(g, .28, 'add', () => px.disc(g, x, by - h * .4, (8 + 9 * flame) * s, '#ffb860'));
  px.poly(g, [[x - w, by], [x - w * .8, by - h * .45], [x + sw, by - h], [x + w * .8, by - h * .45], [x + w, by]], '#ff9a3a');
  px.poly(g, [[x - w * .55, by], [x - w * .45, by - h * .35], [x + sw * .6, by - h * .68], [x + w * .45, by - h * .35], [x + w * .55, by]], '#ffe27a');
};
const THOUGHTS = () => G.DATA.lines.thoughts;
const bubble = (g, x, y, s, alpha) => { const w = E.font.width(s) + 12; G.panel(g, x - w / 2, y, w, 15, { r: 7, bg: '#ffffff', border: '#c8dde2' }); px.disc(g, x - 6, y + 18, 2, '#ffffff'); px.disc(g, x - 10, y + 22, 1, '#ffffff'); txt(g, s, x, y + 4, '#5f7f8a', { align: 'center' }); };
const DUEL = [
  { at: 10, kind: 'gull', f: 3.2, dur: 5, line: 0 }, { at: 24, kind: 'blender', f: 3.6, dur: 6, line: 1 }, { at: 38, kind: 'conga', f: 4, dur: 7, line: 2 },
  { at: 52, kind: 'fireworks', f: 4.2, dur: 6, line: 3 }, { at: 65, kind: 'sing', f: 4.2, dur: 6, line: 4 }, { at: 76, kind: 'goose', f: 5, dur: 6, line: 5 }
];
G.family('candle', {
  camera: { zoom: false },
  setup(ctx) {
    ctx.thought = null; ctx.nextThought = 4; ctx.tSeq = 0; ctx.distract = null; ctx.dIdx = 0; ctx.duel = ctx.mode === 'duel'; ctx.herFlame = 1; ctx.fw = [];
    if (ctx.duel) { ctx.her = G.regularRig('gertrude', ctx.size); ctx.herPoser = new G.Poser(ctx.her); ctx.herPoser.pose('sit', 0); }
    ctx.contestants.forEach(c => {
      c.bal = new G.Balance(ctx.tier.set, c.rng); c.bal.cheat = ctx.cheat; c.flame = 1; c.relit = false; c.out = false; c.flameSum = 0; c.poser.pose('sit', 0); c.flickT = 0;
      if (ctx.contestants.length === 1) c.x = ctx.duel ? -70 : 0;
      c.bal.onStumble = () => { c.fellT = 1; c.flame = Math.max(0, c.flame - .25); if (G.cue(ctx, c)) { G.A.sfx('stumble'); if (c.input) c.input.rumble(.6, .25); } };
    });
    ctx.extraT = 8; ctx.goose = null; ctx.blender = 0;
  },
  preview(dt, ctx) { for (const c of ctx.contestants) { c.poser.pose('sit'); c.poser.update(dt); c.rig.update(dt, { x: c.x, y: 0, z: 0, vx: 0, vy: 0, facing: c.poser.facing, expr: 'smile' }); } if (ctx.her) { ctx.herPoser.update(dt); ctx.her.update(dt, { x: 70, y: 0, z: 0, vx: 0, vy: 0, facing: ctx.herPoser.facing, expr: 'smile' }); } G.stageCam(26, 10); },
  update(dt, ctx) {
    const t = ctx.time, tier = ctx.tier; G.stageCam(26, 10);
    /* thoughts drift in and push you slowly their way */
    if (!ctx.thought && t >= ctx.nextThought && !ctx.duel) {
      const a = ctx.rng() * 6.283, f = tier.thoughtForce[0] + ctx.rng() * (tier.thoughtForce[1] - tier.thoughtForce[0]), list = THOUGHTS(), s = list[ctx.tSeq++ % list.length];
      ctx.thought = { a, f, t: 0, dur: 2.5, s }; ctx.nextThought = t + tier.thoughtEvery * (.8 + ctx.rng() * .4); if (ctx.local && !ctx.quiet) G.A.sfx('tick');
    }
    if (ctx.thought) { ctx.thought.t += dt; if (ctx.thought.t >= ctx.thought.dur) ctx.thought = null; }
    /* Noisy Candle: Dennis's blender and a goose */
    if (tier.extras && !ctx.duel) { ctx.extraT -= dt; if (ctx.extraT <= 0) { ctx.extraT = 11; const kind = ctx.rng() < .5 ? 'blender' : 'goose'; ctx.distract = { kind, t: 0, dur: 4, f: 2.8, a: ctx.rng() * 6.283 }; if (ctx.local && !ctx.quiet) G.A.sfx(kind); } }
    /* the duel's distractions escalate */
    if (ctx.duel && ctx.dIdx < DUEL.length && t >= DUEL[ctx.dIdx].at * ctx.dur / 90) {
      const D = DUEL[ctx.dIdx++]; ctx.distract = { kind: D.kind, t: 0, dur: D.dur, f: D.f, a: ctx.rng() * 6.283 };
      if (ctx.local && !ctx.quiet) { G.mutter('tare', G.DATA.lines.duel[D.line], { attract: true, auto: 3, face: 'worried' }); G.A.sfx({ gull: 'gull', blender: 'blender', conga: 'conga', fireworks: 'firework', goose: 'goose', sing: 'tareBoop' }[D.kind]); }
    }
    const dd = ctx.distract;
    if (dd) { dd.t += dt; if (dd.kind === 'fireworks' && Math.floor(dd.t * 2) !== Math.floor((dd.t - dt) * 2)) { ctx.fw.push({ x: G.cosmetic(), y: .1 + G.cosmetic() * .25, t: 0, c: ['#ffd166', '#ff7a59', '#2cc6e6', '#f08fb0'][Math.floor(G.cosmetic() * 4)] }); if (!ctx.quiet) { G.A.sfx('firework'); game.flash('#ffe8c8', .08, .25); } }
      if (dd.kind === 'sing' && Math.floor(dd.t * 2) !== Math.floor((dd.t - dt) * 2) && !ctx.quiet) { G.say1('tare', 'la'); if (dd.t > 2 && !dd.sang) { dd.sang = true; G.mutter('tare', G.DATA.lines.duelTare, { attract: true, auto: 3, face: 'happy' }); } }
      if (dd.kind === 'conga' && Math.floor(dd.t * 3) !== Math.floor((dd.t - dt) * 3) && !ctx.quiet) G.A.sfx('conga');
      if (dd.t >= dd.dur) ctx.distract = null; }
    for (const f of ctx.fw) f.t += dt; ctx.fw = ctx.fw.filter(f => f.t < 1);
    for (const c of ctx.contestants) {
      const b = c.bal, I = c.intent;
      if (c.out) { b.fx = b.fy = 0; b.step(dt, 0, 0); b.totalT -= dt * 0; } else {
        const th = ctx.thought, dk = dd && dd.t < dd.dur ? dd : null;
        if (th) { b.fx += Math.cos(th.a) * th.f * G.DEV.push; b.fy += Math.sin(th.a) * th.f * G.DEV.push; }
        if (dk) { b.fx += Math.cos(dk.a + dk.t) * dk.f * G.DEV.push; b.fy += Math.sin(dk.a + dk.t) * dk.f * G.DEV.push; }
        // the input left perfectly alone: the thoughts drift you out, and Tare can tell
        if (!I.touched && t > 20 && !ctx.duel && !c.skill) { b.fx += 4; if (!c.toldOff && G.cue(ctx, c)) { c.toldOff = true; G.mutter('tare', G.DATA.lines.tare.candleCheat, { face: 'judging', auto: 4 }); } }
        b.step(dt, I.x, I.y);
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > .55) { c.flame -= .4 * dt; c.flickT -= dt; if (c.flickT <= 0 && G.cue(ctx, c)) { G.A.sfx('flick', { vol: .5 + sp * .4 }); c.flickT = .25; if (c.input) c.input.rumble(.18, .08); } }
        if (b.inRing) c.flame += .12 * dt;
        c.flame = clamp(c.flame, 0, 1);
        if (!I.touched && t <= 20 && !ctx.duel && !c.skill) c.flame = Math.max(c.flame, .05); /* someone who has not touched it gets to 20 s, when Tare can tell */
        if (c.flame <= 0) {
          if (ctx.cheat) c.flame = .4;
          else if (!c.relit) { c.relit = true; c.flame = .55; if (G.cue(ctx, c)) { G.A.sfx('flick'); if (I.touched) G.mutter('tare', G.DATA.lines.tare.relit, { face: 'worried', auto: 3 }); } }
          else { c.out = true; if (ctx.contestants.filter(q => !q.life).every(q => q.out || q.life)) ctx.finished = true; if (G.cue(ctx, c)) G.A.sfx('tareSad'); }
        }
        c.flameSum += c.flame * dt;
      }
      c.poser.pose('sit'); c.poser.update(dt); c.rig.wob = [b.x * .8, b.y * .6];
      c.rig.update(dt, { x: c.x, y: 0, z: 0, vx: 0, vy: 0, facing: c.poser.facing, expr: b.edge > .7 ? 'wince' : 'smile' });
      G.feelBalance(ctx, c, dt);
    }
    if (ctx.duel) {
      const me = ctx.contestants[0];
      if (t > ctx.dur * 75 / 90 && me.flame > .5) ctx.herFlame = Math.max(0, ctx.herFlame - dt / (ctx.dur * 14 / 90));
      if (ctx.herFlame <= 0) { ctx.won = true; ctx.finished = true; }
      if (me.out) { ctx.won = false; ctx.finished = true; }
      ctx.herPoser.update(dt); ctx.her.wob = [Math.sin(t * .4) * .015, 0]; ctx.her.update(dt, { x: 70, y: 0, z: 0, vx: 0, vy: 0, facing: ctx.herPoser.facing, expr: 'smile' });
    }
  },
  result(ctx, c) {
    const T = Math.max(ctx.time, 1), full = Math.max(ctx.dur, T), st = clamp(c.bal.inRingT / full, 0, 1), m = clamp(c.flameSum / full, 0, 1), pct = .6 * st + .4 * m - (c.relit ? .15 : 0);
    return { pct, detail: 'Steadiness ' + Math.round(st * 100) + '%. Flame ' + Math.round(m * 100) + '%.' + (c.relit ? ' One relight.' : '') };
  },
  bot(ctx, c, dt) { const u = c.brain.hold(dt, c.bal, 0, 0); c.intent.x = u[0]; c.intent.y = u[1]; c.intent.touched = true; },
  draw(r, ctx) {
    (G.ROOMS[ctx.duel ? 'raft' : ctx.def.room] || G.ROOMS.deck)(r, { dusk: ctx.duel || (G.roomDusk && G.roomDusk()) });
    for (const c of ctx.contestants) { G.drawMat(r, c.x, 0, 30 * (ctx.size / 2.1), 9, c.local ? '#bfeee0' : '#e8f0f2'); G.drawRig(r, c.rig, c.x, 0, 0); r.queue(c.x, 20, 0, g => { const p = r.w(c.x, 20, 0); G.drawCandle(g, p[0], p[1], c.out ? 0 : c.flame, ctx.size > 1.8 ? 1.2 : 1); }); }
    if (ctx.duel) { G.drawMat(r, 70, 0, 30 * (ctx.size / 2.1), 9, '#d7c7ee'); G.drawRig(r, ctx.her, 70, 0, 0); r.queue(70, 20, 0, g => { const p = r.w(70, 20, 0); G.drawCandle(g, p[0], p[1], ctx.herFlame, 1.2); }); }
    G.drawGhosts && G.drawGhosts(r, ctx);
    const dd = ctx.distract;
    if (dd) r.overlay(g => {
      const W = game.W, H = game.H, k = dd.t / dd.dur;
      if (dd.kind === 'gull') { for (let i = 0; i < 3; i++) { const x = W * k * 1.3 - 30 + i * 18, y = 40 + Math.sin(k * 20 + i) * 8 + i * 6, f = Math.sin(game.real * 14 + i) * 3; px.line(g, x - 6, y - f, x, y, '#ffffff', 2); px.line(g, x + 6, y - f, x, y, '#ffffff', 2); } }
      if (dd.kind === 'blender') { const x = W * .84 + Math.sin(game.real * 60) * 1.5, y = H * .62; px.rect(g, x - 7, y, 14, 8, '#7a8a94'); px.poly(g, [[x - 8, y - 24], [x + 8, y - 24], [x + 6, y], [x - 6, y]], '#bfeee0'); px.rect(g, x - 8, y - 26, 16, 2, '#7a8a94'); txt(g, 'VRRRRR', x, y - 40, '#7a8a94', { align: 'center' }); }
      if (dd.kind === 'conga') { for (let i = 0; i < 7; i++) { const x = (k * (W + 120)) - 90 + i * 16, y = H * .47 + Math.sin(game.real * 7 + i) * 2; px.rect(g, x - 3, y, 6, 12, ['#ff7a59', '#2cc6e6', '#f5c84b', '#6fcf8e'][i % 4]); px.disc(g, x, y - 3, 3, '#f2d3b8'); px.rect(g, x - 3, y + 12, 2, 6, '#3b5568'); px.rect(g, x + 1, y + 12, 2, 6, '#3b5568'); } }
      if (dd.kind === 'sing') { const x = W * .5, y = H * .58 + Math.abs(Math.sin(game.real * 6)) * -6; G.drawTare(g, x, y, 1.4, { face: 'happy', squash: Math.sin(game.real * 12) * .1, bow: G.S.minutes >= 20 }); txt(g, '♪', x + 26, y - 26 - k * 10, '#14a8c8', { scale: 2 }); }
      if (dd.kind === 'goose') { const x = W * (1.05 - k * 1.1), y = H * .72, b = Math.sin(game.real * 8) * 2; px.ell(g, x, y, 11, 7, '#fbfdfd'); px.ell(g, x + 1, y + 1, 10, 6, '#e3edef'); px.line(g, x - 8, y - 3, x - 12, y - 16 + b, '#fbfdfd', 3); px.disc(g, x - 12, y - 18 + b, 3, '#fbfdfd'); px.rect(g, x - 18, y - 18 + b, 4, 2, '#ff9a3a'); px.dot(g, x - 13, y - 19 + b, '#20404c'); px.rect(g, x - 2, y + 6, 1, 6, '#ff9a3a'); px.rect(g, x + 3, y + 6, 1, 6, '#ff9a3a'); }
    });
    if (ctx.fw.length) r.overlay(g => { for (const f of ctx.fw) { const x = f.x * game.W, y = f.y * game.H, R = 4 + f.t * 22; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; px.rect(g, x + Math.cos(a) * R, y + Math.sin(a) * R + f.t * f.t * 8, 2, 2, f.c); } } });
  },
  hud(g, ctx) {
    if (!ctx.live && !ctx.showHud) return;
    const W = game.W, H = game.H, many = ctx.contestants.length > 1;
    if (ctx.live) G.drawTimer(g, G.left(ctx));
    for (const c of ctx.contestants) { if (c.life) continue; if (many) G.manyPlate(g, ctx, c); else G.drawPlate(g, c.bal, { x: W / 2, y: H - 34, r: 26, ring: [0, 0, c.bal.R], color: c.color }); }
    const m = ctx.local; if (m && !many) {
      // the flame's level, in a shape and a number
      const x = W / 2 - 70, y = H - 50; G.panel(g, x - 34, y - 4, 58, 32, { r: 7 }); txt(g, 'Flame', x - 5, y - 1, '#5f7f8a', { align: 'center' }); E.ui.bar(g, x - 30, y + 10, 50, 7, m.flame, m.flame > .5 ? '#ffb020' : '#ff7a59', { bg: '#e8f0f2' });
      if (ctx.duel) { const hx = W / 2 + 70; G.panel(g, hx - 24, y - 4, 58, 32, { r: 7 }); txt(g, 'Gertrude', hx + 5, y - 1, '#5f7f8a', { align: 'center' }); E.ui.bar(g, hx - 20, y + 10, 50, 7, ctx.herFlame, '#b08be0', { bg: '#e8f0f2' }); }
    }
    const th = ctx.thought; if (th) { const k = th.t / th.dur, ox = Math.cos(th.a) * (40 + k * 26), oy = -Math.sin(th.a) * 16; const base = many ? game.r.w(0, 0, 58) : game.r.w(ctx.contestants[0].x, 0, 62); bubble(g, base[0] + ox, base[1] + oy - 12, th.s); }
    if (ctx.live) G.prompts(g, [['lean', 'Gently']]);
  }
});
})();
