/* activities/laundry.js: Laundry Line. Walk a clothesline between bungalows, on the x axis only. Effort sets the pace and
 * the wobble; jump over pegs; the wind warns you first. Fall: you dangle, drop into a hamper, go back to the last post. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px, clamp } = E, game = G.game;
const txt = (...a) => G.txt(...a);
const ROPE_Z = 58, WALK = 52;
const BOT = { poor: { effort: .45, jumpAt: 10, hit: .75, brace: 0 }, average: { effort: .5, jumpAt: 12, hit: .97, brace: .5 }, good: { effort: .72, jumpAt: 14, hit: 1, brace: .55 }, expert: { effort: .9, jumpAt: 16, hit: 1, brace: .7 } };
const CLOTHES = ['#ff7a59', '#2cc6e6', '#f5c84b', '#6fcf8e', '#f08fb0', '#ffffff', '#b08be0'];
G.family('laundry', {
  camera: { zoom: false }, view: 'side',
  setup(ctx) {
    const co = G.DATA.courses.laundry; ctx.spans = co.spans; ctx.posts = [0]; ctx.pegs = []; ctx.gusts = []; let at = 0;
    const sc = ctx.durGiven ? clamp(ctx.durGiven / 70, .4, 1) : 1;
    co.spans.forEach((s, i) => { const len = s.len * sc; for (const p of s.pegs) if (p * sc < len - 14) ctx.pegs.push({ x: at + p * sc, hit: {} }); for (const g of s.gusts) ctx.gusts.push({ x: at + g * len, dir: ctx.rng() < .5 ? -1 : 1, state: 0, t: 0 }); at += len; ctx.posts.push(at); });
    ctx.end = at; ctx.clothes = []; for (let x = 18; x < at - 12; x += 27) { const pegHere = ctx.pegs.some(p => Math.abs(p.x - x) < 16); if (pegHere) continue; ctx.clothes.push({ x, kind: Math.floor(ctx.rng() * 4), col: CLOTHES[Math.floor(ctx.rng() * CLOTHES.length)], k: ctx.rng() * 6 }); }
    ctx.wind = 0; ctx.windDir = 1; ctx.par = co.par * sc; ctx.worst = co.worst * sc; ctx.dur = ctx.durGiven || ctx.def.dur; ctx.sock = null;
    for (const c of ctx.contestants) { c.bal = new G.Balance(ctx.tier.set, c.rng); c.bal.axis = 'x'; c.bal.cheat = ctx.cheat; c.wx = 6; c.vz = 0; c.jz = 0; c.fallT = 0; c.falls = 0; c.pen = 0; c.lastPost = 0; c.effort = 0; c.ph = 0; c.fin = 0; c.state = 'walk'; c.gustI = 0; c.creakT = 0;
      c.bal.onStumble = () => {}; }
    if (ctx.contestants.length === 1) ctx.contestants[0].y = 0;
  },
  preview(dt, ctx) { if (ctx.done) return; const c = ctx.contestants[0]; c.rig.body = G.moves.rope(0, 0); c.rig.update(dt, { x: c.wx, y: 0, z: ROPE_Z, vx: 0, vy: 0, facing: 0, expr: 'smile' }); game.cam.smooth = 0; game.focus(c.wx + 40, 0, ROPE_Z - 4); },
  update(dt, ctx) {
    const d = G.DEV, t = ctx.time, set = ctx.tier.set;
    for (const c of ctx.contestants) {
      const I = c.intent, b = c.bal;
      if (c.fin) { c.ph += dt * 2; c.rig.body = null; c.rig.wob = [0, 0]; c.poser.clip('Victory', { tgt: 1.2, loop: false }); c.poser.update(dt); c.rig.update(dt, { x: c.wx, y: 0, z: ROPE_Z, vx: 0, vy: 0, facing: c.poser.facing, expr: 'smile' }); continue; }
      if (c.fallT > 0) {   // dangle, drop, hamper, back to the last post
        c.fallT -= dt; const k = 1 - c.fallT / 1.6, drop = k < .3 ? 0 : (k - .3) / .7 * ROPE_Z; c.dropZ = ROPE_Z - drop * Math.min(1, drop / 20 + .4);
        c.rig.body = null; c.poser.clip('Dizzy', { fade: .1, loop: true, tgt: .2 }); c.poser.update(dt); c.rig.wob = [Math.sin(t * 9) * .2, 0]; c.rig.update(dt, { x: c.wx, y: 0, z: Math.max(4, c.dropZ), vx: 0, vy: 0, facing: c.poser.facing, expr: 'wince' });
        if (c.fallT <= .6 && !c.boomp && G.cue(ctx, c)) { c.boomp = true; G.A.sfx('thud'); }
        if (c.fallT <= 0) { c.wx = c.lastPost + 6; b.x = b.y = b.vx = b.vy = 0; b.stumbling = 0; c.pen += 3; c.boomp = false; c.poser.off(); }
        continue;
      }
      /* effort: walk speed, and instability */
      const eff = clamp(I.walk, 0, 1); c.effort = eff;
      const ease = I.source === 'keyboard' && ctx.def.keyEase; b.extraS = 10 * Math.max(0, eff - .6) * d.rope; b.set.s = set.s * d.rope * (ease ? ease.s : 1); b.set.A = set.A * (ease ? ease.A : 1);   // (on/off keys cannot do what a stick does: the rope is a little kinder to them)
      /* gusts: telegraphed .8 s early by wind lines and a flying sock */
      for (const gu of ctx.gusts) {
        if (gu.state === 0 && c.wx > gu.x - 16 && c === (ctx.local || ctx.contestants[0])) { gu.state = 1; gu.t = 0; ctx.windDir = gu.dir; if (G.cue(ctx, c)) G.A.sfx('wind'); ctx.sock = { x: c.wx - gu.dir * 150, z: ROPE_Z + 40, t: 0, dir: gu.dir }; }
        if (gu.state === 1) { gu.t += dt / ctx.contestants.length; if (gu.t >= .8) { gu.state = 2; gu.t = 0; } }
        if (gu.state === 2) { gu.t += dt / ctx.contestants.length; b.fx += gu.dir * ctx.tier.gust * d.gust; if (gu.t >= .6) gu.state = 3; }
      }
      ctx.wind = ctx.gusts.some(g => g.state === 1 || g.state === 2) ? 1 : Math.max(0, ctx.wind - dt);
      /* a jump: in the air, p freezes */
      if (I.jump && c.jz <= 0) { c.vz = 125; c.jz = .01; if (G.cue(ctx, c)) G.A.sfx('tareHop', { vol: .6 }); b.frozen = true; }
      if (c.jz > 0) { c.vz -= 310 * dt; c.jz += c.vz * dt; if (c.jz <= 0) { c.jz = 0; c.vz = 0; b.frozen = false; if (G.cue(ctx, c)) { G.A.sfx('rope'); } } }
      b.step(dt, I.x, 0);
      const inRing = Math.abs(b.x) <= b.R, speed = c.jz > 0 ? Math.max(24, WALK * eff) : WALK * eff * (inRing ? 1 : .6);
      c.wx += speed * dt; c.ph += speed * dt * .32;
      if (G.cue(ctx, c) && speed > 4) { c.creakT -= dt; if (c.creakT <= 0) { G.A.sfx('rope', { vol: .4 + b.edge * .6 }); c.creakT = .55 - b.edge * .2; if (b.edge > .7 && c.input) c.input.rumble(.3, .1); } }
      for (const pz of ctx.posts) if (c.wx >= pz && pz > c.lastPost) { c.lastPost = pz; if (G.cue(ctx, c)) G.A.sfx('ok'); }
      /* pegs trip you; the rope throws you */
      let tripped = false;
      if (c.jz < 6) for (const p of ctx.pegs) if (!p.hit[c.i] && Math.abs(c.wx - p.x) < 3) { p.hit[c.i] = true; if (!ctx.cheat) tripped = true; else c.jz = .01, c.vz = 125; }
      if (b.stumbling > 0 || tripped) { b.stumbling = 0; c.falls++; c.fallT = 1.6; c.dropZ = ROPE_Z; if (G.cue(ctx, c)) { G.A.sfx('stumble'); game.shake(.08); if (c.input) c.input.rumble(.8, .3); if (c.falls === 1) G.mutter('tare', G.line('tare.fall')); } for (const p of ctx.pegs) if (p.x > c.lastPost) delete p.hit[c.i]; continue; }
      if (c.wx >= ctx.end) { c.fin = t + c.pen; c.wx = ctx.end; if (ctx.contestants.every(q => q.fin)) ctx.finished = true; if (G.cue(ctx, c)) G.sting('star1'); }
      const arms = clamp(b.x, -1, 1) * 2.4;
      c.rig.body = G.moves.rope(c.ph, arms); c.rig.mocap = null; c.rig.wob = [0, clamp(b.x, -1, 1) * .9];
      c.rig.update(dt, { x: c.wx, y: 0, z: ROPE_Z + c.jz, vx: 0, vy: 0, facing: 0, expr: b.edge > .6 ? 'wince' : 'smile' });
    }
    if (ctx.sock) { ctx.sock.t += dt; ctx.sock.x += ctx.sock.dir * 170 * dt; if (ctx.sock.t > 2) ctx.sock = null; }
    const me = ctx.local || ctx.contestants[0]; game.cam.smooth = 0; game.focus(me.wx + 40, 0, ROPE_Z - 4);
  },
  result(ctx, c) { const t = (c.fin || (ctx.time + 40)) + 0, pct = clamp((ctx.worst - t) / (ctx.worst - ctx.par), 0, 1) - .06 * c.falls; return { pct, detail: 'Your time ' + G.fmtTime(t) + '. Falls: ' + c.falls + '.' + (c.fin ? '' : ' ' + G.DATA.lines.notes.noEnd) }; },
  bot(ctx, c, dt) {
    const B = BOT[c.brain.skill], I = c.intent, bal = c.bal; c.tried = c.tried || {};
    /* into the wind before it arrives: what a player learns from the warning */
    let ff = 0; for (const gu of ctx.gusts) if ((gu.state === 1 && gu.t > .45) || gu.state === 2) ff = -gu.dir * B.brace;
    const u = c.brain.hold(dt, { x: bal.x, y: 0, vx: bal.vx, vy: 0 }, 0, 0, ff, 0); I.x = u[0]; I.y = 0; I.walk = B.effort; I.jump = false;
    if (c.fallT > 0) { c.tried = {}; return; }
    const sp = Math.max(24, WALK * c.effort); ctx.pegs.forEach((p, i) => { const dx = p.x - c.wx; if (dx > 0 && dx < sp * .3 + 2 && c.jz <= 0 && c.tried[i] === undefined) { c.tried[i] = c.rng() < B.hit; if (c.tried[i]) I.jump = true; } });
  },
  ghost(ctx, c) { return { x: Math.round(c.wx), z: Math.round(c.jz), w: +c.bal.x.toFixed(2), f: c.fallT > 0 ? 1 : 0 }; },
  draw(r, ctx) {
    const g0 = r.ctx, W = r.W + 2, H = r.H + 2, ground = r.w(0, 0, 0)[1];
    G.bands(g0, 0, 0, W, ground, '#8fd3f4', '#d8f3fb', 12);
    const seaY = ground - 30; G.bands(g0, 0, seaY, W, 30, '#49b6c9', '#2f97ad', 5);
    const cam = r.w(0, 0, 0)[0];
    for (let i = 0; i < 5; i++) { const x = ((i * 137 - cam * -.1 + game.real * 4) % (W + 60)) - 30, y = 16 + i * 12; px.ell(g0, x, y, 18, 3, '#ffffff'); px.ell(g0, x + 7, y - 2, 9, 3, '#ffffff'); }
    G.bands(g0, 0, ground, W, H - ground, '#7fc87a', '#5fa864', 6);
    for (let i = -2; i < 28; i++) { const q = r.w(i * 60, 0, 0); if (q[0] < -30 || q[0] > W + 30) continue; px.rect(g0, q[0], q[1] + 4, 2, 2, '#4f9a58'); px.rect(g0, q[0] + 22, q[1] + 11, 2, 2, '#a8dc9a'); px.rect(g0, q[0] + 41, q[1] + 18, 2, 2, '#4f9a58'); }
    /* bungalows at the posts */
    ctx.posts.forEach((x, i) => { const p = r.w(x, 0, 0), Wb = 92, Hb = 58; if (p[0] < -120 || p[0] > W + 120) return; px.rect(g0, p[0] - Wb / 2, p[1] - Hb, Wb, Hb, '#fbf6ec'); px.rect(g0, p[0] - Wb / 2, p[1] - Hb, 5, Hb, '#ffffff'); px.poly(g0, [[p[0] - Wb * .62, p[1] - Hb], [p[0] + Wb * .62, p[1] - Hb], [p[0], p[1] - Hb - 30]], ['#ff9a7a', '#7fd8ea', '#f5c84b', '#6fcf8e'][i % 4]); px.rect(g0, p[0] - 9, p[1] - 28, 18, 28, '#c49c6c'); px.rect(g0, p[0] + 18, p[1] - 40, 16, 14, '#a8e4f2'); px.rect(g0, p[0] - 34, p[1] - 40, 16, 14, '#a8e4f2'); });
    if (ctx.posts[0] !== undefined) { const p = r.w(ctx.posts[0] + 95, 0, 0); if (p[0] > -120 && p[0] < W + 120) { px.rect(g0, p[0] - 1, p[1] - 36, 2, 36, '#7a8a94'); G.panel(g0, p[0] - 110, p[1] - 62, 220, 38, { r: 5 }); G.wrapText(g0, G.DATA.lines.sign.laundry, p[0], p[1] - 59, 208, '#20404c', { align: 'center', gap: 1 }); E.font.text(g0, G.DATA.lines.motto, p[0], p[1] - 36, '#14a8c8', { align: 'center', outline: false }); } }
    /* the posts and the rope */
    for (const x of ctx.posts) { const a = r.w(x, 0, 0), b = r.w(x, 0, ROPE_Z + 8); px.rect(g0, a[0] - 2, b[1], 4, a[1] - b[1], '#a57f54'); px.rect(g0, a[0] - 2, b[1], 1, a[1] - b[1], '#c49c6c'); px.rect(g0, a[0] - 7, b[1] + 3, 14, 3, '#8a6a4a'); }
    const me = ctx.local || ctx.contestants[0], segs = 90, sag = t => 0;
    const ropeAt = x => { let s = 3 * Math.sin(Math.min(1, Math.abs(x - me.wx) / 110) * 1.57 + 1.57); return ROPE_Z - (s < 0 ? 0 : s) * .7 * (me.jz > 0 ? .3 : 1); };
    for (let i = 0; i < segs; i++) { const x0 = ctx.posts[0] + i * ctx.end / segs, x1 = x0 + ctx.end / segs, a = r.w(x0, 0, ropeAt(x0)), b = r.w(x1, 0, ropeAt(x1)); if (b[0] < -8 || a[0] > W + 8) continue; px.line(g0, a[0], a[1], b[0], b[1], '#f4f8f8', 2); px.line(g0, a[0], a[1] + 1, b[0], b[1] + 1, '#9fb5bc'); }
    /* laundry on the line */
    for (const q of ctx.clothes) { const p = r.w(q.x, 0, ropeAt(q.x)); if (p[0] < -24 || p[0] > W + 24) continue; const sw = Math.sin(game.real * 2.4 + q.k) * 2 * (1 + ctx.wind * 2) * (ctx.wind ? ctx.windDir : 1);
      if (q.kind === 0) { px.poly(g0, [[p[0] - 8, p[1] + 1], [p[0] + 8, p[1] + 1], [p[0] + 7 + sw, p[1] + 20], [p[0] - 7 + sw, p[1] + 20]], q.col); px.rect(g0, p[0] - 13, p[1] + 1, 5, 6, q.col); px.rect(g0, p[0] + 8, p[1] + 1, 5, 6, q.col); px.rect(g0, p[0] - 3, p[1] + 1, 6, 2, E.shade(q.col, -.2)); }
      else if (q.kind === 1) { px.poly(g0, [[p[0] - 5, p[1] + 1], [p[0] + 5, p[1] + 1], [p[0] + 3 + sw, p[1] + 16], [p[0] - 3 + sw, p[1] + 16]], q.col); px.rect(g0, p[0] - 3 + sw, p[1] + 14, 8, 4, q.col); }
      else if (q.kind === 2) { for (const k of [-3, 3]) px.poly(g0, [[p[0] + k - 3, p[1] + 1], [p[0] + k + 3, p[1] + 1], [p[0] + k + 3 + sw, p[1] + 19], [p[0] + k - 3 + sw, p[1] + 19]], q.col); px.rect(g0, p[0] - 6, p[1] + 1, 12, 2, E.shade(q.col, -.2)); }
      else { px.poly(g0, [[p[0] - 11, p[1] + 1], [p[0] + 11, p[1] + 1], [p[0] + 10 + sw * 1.4, p[1] + 26], [p[0] - 10 + sw * 1.4, p[1] + 26]], '#ffffff'); px.rect(g0, p[0] + 7, p[1] + 1, 2, 24, '#e3edef'); }
      px.rect(g0, p[0] - 1, p[1] - 3, 2, 5, '#c49c6c'); }
    /* pegs to jump */
    for (const p of ctx.pegs) { const q = r.w(p.x, 0, ROPE_Z); if (q[0] < -8 || q[0] > W + 8) continue; px.rect(g0, q[0] - 2, q[1] - 12, 4, 13, '#c49c6c'); px.rect(g0, q[0] - 2, q[1] - 12, 1, 13, '#e0c094'); px.rect(g0, q[0] - 3, q[1] - 6, 6, 2, '#7a8a94'); }
    /* the hamper, where you are about to land */
    for (const c of ctx.contestants) if (c.fallT > 0) { const q = r.w(c.wx, 0, 0); px.poly(g0, [[q[0] - 16, q[1] - 22], [q[0] + 16, q[1] - 22], [q[0] + 12, q[1]], [q[0] - 12, q[1]]], '#d9b68a'); for (let i = 0; i < 4; i++) px.rect(g0, q[0] - 14 + i * 2, q[1] - 18 + i * 5, 28 - i * 4, 1, '#a57f54'); px.rect(g0, q[0] - 17, q[1] - 24, 34, 3, '#c49c6c'); }
    for (const c of ctx.contestants) { if (!c.local && ctx.local) continue; G.drawRig(r, c.rig, c.wx, 0, c.fallT > 0 ? Math.max(4, c.dropZ) : ROPE_Z + c.jz, { noShadow: true }); }
    G.drawRopeGhosts && G.drawRopeGhosts(r, ctx);
    if (ctx.sock) { const p = r.w(ctx.sock.x, 0, ctx.sock.z + Math.sin(ctx.sock.t * 9) * 5); r.overlay(g => { const a = ctx.sock.t * 7; px.rect(g, p[0] - 3, p[1] - 3, 7, 7, '#f08fb0'); px.rect(g, p[0] + Math.cos(a) * 4, p[1] + Math.sin(a) * 4, 4, 4, '#ffffff'); }); }
    if (ctx.wind > 0) r.overlay(g => { for (let i = 0; i < 12; i++) { const y = (i * 37) % (game.H - 40) + 12, x = ((i * 91 + game.real * 300 * ctx.windDir) % (game.W + 60) + game.W + 60) % (game.W + 60) - 30, L = 14 + (i % 3) * 8; px.rect(g, x, y, L, 1, '#ffffff'); } });
  },
  hud(g, ctx) {
    if (!ctx.live) return;
    const W = game.W, H = game.H, c = ctx.local || ctx.contestants[0];
    G.panel(g, 8, 6, 74, 20, { r: 8 }); txt(g, G.fmtTime(ctx.time + c.pen), 45, 9, '#20404c', { align: 'center', scale: 2 });
    const pr = clamp(c.wx / ctx.end, 0, 1); G.panel(g, W - 112, 8, 104, 16, { r: 7 }); E.ui.bar(g, W - 106, 13, 92, 6, pr, '#2cc6e6', { bg: '#e8f0f2' }); for (const x of ctx.posts) px.rect(g, W - 106 + 92 * x / ctx.end, 11, 1, 10, '#5f7f8a');
    G.drawPlate(g, c.bal, { x: W / 2, y: H - 34, r: 26, ring: [0, 0, c.bal.R], color: c.color });
    txt(g, 'Pace', W / 2 + 40, H - 46, '#5f7f8a'); E.ui.bar(g, W / 2 + 40, H - 36, 50, 7, c.effort, c.effort > .8 ? '#ff7a59' : '#7fe0c3', { bg: '#e8f0f2' });
    if (c.fallT > 0) txt(g, G.DATA.lines.notes.hold, W / 2, 40, '#e0553a', { align: 'center', scale: 2, shadow: '#ffffff' });
    if (ctx.wind > 0) { const k = Math.floor(game.real * 6) % 2; txt(g, ctx.windDir > 0 ? 'Wind →' : '← Wind', W / 2, 30, k ? '#e0553a' : '#20404c', { align: 'center', scale: 2, shadow: '#ffffff' }); }
    G.prompts(g, [['walk', 'Walk'], ['leanx', 'Lean'], ['jump', 'Jump']]);
  }
});
})();
