/* OLYMPIYIKES! — Mount Glory Jumping Hill and the SKI JUMP, K-125 / HS-140 (§6.7): tuck, take off at the edge, fly the V, telemark. */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, M = 8, D2R = Math.PI / 180;
const A35 = 35 * D2R, A11 = 11 * D2R, TABLE = 7, INRUN = 88;
const TS = [-TABLE * Math.cos(A11), TABLE * Math.sin(A11)], TOP = [TS[0] - INRUN * Math.cos(A35), TS[1] + INRUN * Math.sin(A35)];
const hill0 = x => x < 0 ? 0 : x < 15 ? -3 * (x / 15) * (x / 15) : x < 125 ? -3 - .58 * (x - 15) : x < 189.4 ? -66.8 - .58 * (x - 125) + .0045 * (x - 125) * (x - 125) : -66.8 - .58 * 64.4 + .0045 * 64.4 * 64.4;
const hill = x => x < 0 ? 0 : hill0(x) - 3;
const SL = []; { let s = 0, px0 = 0, pz0 = 0; for (let x = 0; x <= 260; x += .5) { const z = hill(x); if (x > 0) s += Math.hypot(x - px0, z - pz0); SL.push([x, s]); px0 = x; pz0 = z; } }
const along = x => { const i = Math.min(SL.length - 1, Math.max(0, Math.floor(x * 2))); return SL[i][1]; };
const xAt = s => { for (const [x, ss] of SL) if (ss >= s) return x; return 260; };
const inrunPos = s => s < INRUN ? [TOP[0] + s * Math.cos(A35), TOP[1] - s * Math.sin(A35), A35] : [TS[0] + (s - INRUN) * Math.cos(A11), TS[1] - (s - INRUN) * Math.sin(A11), A11];
O.SkiHill = { hill, along, xAt };
const BACK = new E.Backdrop({ sky: ['#04061a', '#0e1440', '#28306a'], stars: true, starsY: .7, moon: { x: .8, y: .18, r: 10, color: '#f4f0d8' }, layers: [{ kind: 'mountains', color: '#1a2050', y: .55, height: .3, parallax: .1 }, { kind: 'mountains', color: '#242c64', y: .65, height: .22, parallax: .2 }, { kind: 'forest', color: '#0e1a2a', y: .8, height: .12, parallax: .35 }] });

O.defEvent({
  id: 'skijump', name: 'SKI JUMP', short: 'Ski Jump', season: 'winter', venue: 'Mount Glory Jumping Hill', pictogram: 'skijump', music: 'alpine', view: 'side', sport: 'skijump', lights: .35,
  format: { type: 'attempts', rounds: 2, combine: 'sum' }, maxTime: 40, turbo: 'ROCKET SKIS!',
  measure: { better: 'higher', unit: 'pts', fmt: v => v.toFixed(1), wr: [296.4, 'FRM', 'INGRID SNOWCASTLE'], qualify: { Easy: 160, Normal: 210, Hard: 245 } },
  points: v => 3.9 * v,
  tune: { kAir: [.0035, 0, .008, .0001, 'In-run air drag'], takeoffBoost: [2.4, 0, 5, .1, 'Take-off boost (m/s)'], cL0: [.0038, .001, .008, .0001, 'Lift'], cDBase: [.0006, 0, .003, .0001, 'Flight drag'],
    gust: [6, 0, 20, .5, 'Gusts (°/s)'], telemarkWindow: [.35, .1, .8, .01, 'Telemark window (s)'], crashAngle: [40, 25, 70, 1, 'Crash angle (°)'] },
  howto: { goal: 'Two jumps. Distance + style points.', rows: [[['action'], 'Push off · take off at the edge · telemark'], [['move'], '↑ ↓ keep the tuck, then fly the V'], [null, 'Land with a TELEMARK for style'], [['turbo'], 'ROCKET SKIS when the flame is full']] },
  yikesKinds: ['FELL OFF THE TABLE', 'CRASH!'],
  laurel: { id: 'offchart', name: 'OFF THE CHART', text: 'Land beyond 150 m without crashing', test: (ctx, a) => a.S.dist > 150 && !a.S.crashed },
  hub: { ok: true, attempts: 1, seconds: 40 }, attract: { seconds: 16, after: 3.5, setup() {} },
  turnLabel: ctx => 'JUMP ' + (ctx.cur.attempts.length + 1) + ' OF ' + ctx.rounds,
  phases: [['gate', ctx => { ctx.cur.S.phase = 'gate'; }], ['take-off', ctx => { const s = ctx.cur.S; s.phase = 'inrun'; s.s = INRUN + TABLE - 8; s.v = 25; }], ['flight', ctx => { const s = ctx.cur.S; s.phase = 'flight'; s.x = 0; s.z = 0; s.vx = 25; s.vz = 1; s.al = 12; }], ['landing', ctx => { const s = ctx.cur.S; s.phase = 'flight'; s.x = 120; s.z = hill(120) + 3; s.vx = 22; s.vz = -8; s.al = 12; }]],
  build() {},
  start(ctx) {
    const a = ctx.cur, sk = ctx.skill(a), r = ctx.rng('j');
    a.S = { phase: 'gate', s: 0, v: 0, bal: new O.Balance(ctx.rng('bal'), { drift: .8, k: 3 }), balQ: 0, balN: 0, q: 0, x: 0, z: 0, vx: 0, vz: 0, al: 20, wob: 0, tele: false, teleT: -1, dist: null, style: null, crashed: false, t: 0, endT: 0, gT: 0, gust: 0,
      bot: { take: a.pilot.cheat === 'perfect' ? .5 : .5 + (1 - sk) * 3.2 * r(), alErr: a.pilot.cheat === 'perfect' ? 0 : O.gauss(r) * (1 - sk) * 15, tele: a.pilot.cheat === 'perfect' || r() < sk, noTake: !a.human && a.pilot.cheat !== 'perfect' && r() < (1 - sk) * .04 } };
  },
  bot(ctx, a, dt, I) {
    const s = a.S;
    if (s.phase === 'gate') { if (s.t > .6) I.A = true; return I; }
    if (s.phase === 'inrun') { I.mv = [0, E.clamp(s.bal.b * 3 + s.bal.v, -1, 1)]; const left = INRUN + TABLE - s.s; if (left <= s.bot.take && !s.bot.noTake) I.A = true; if (a.hype >= 1 && left < 3) I.T = true; return I; }
    if (s.phase === 'flight') { const want = 12 + s.bot.alErr; I.mv = [0, E.clamp((s.al - want) / 6, -1, 1)]; const h = s.z - hill(s.x); if (s.bot.tele && h < 1.2 && s.vz < 0) I.A = true; if (a.hype >= 1) I.T = true; }
    return I;
  },
  step(ctx, dt) {
    const T = ctx.T, g = 9.81;
    for (const a of ctx.active) {
      const s = a.S, I = a.I; s.t += dt;
      if (s.phase === 'gate') { if (I.A) { s.phase = 'inrun'; s.v = 1; ctx.fx.sfx('swish'); } else if (s.t > 10) { s.phase = 'inrun'; s.v = 1; } continue; }
      if (s.phase === 'inrun') {
        s.bal.update(dt, I.mv[1], 1); if (s.bal.lost) { s.bal.lost = false; s.bal.b *= .5; s.bal.v = 0; }
        s.balQ += 1 - Math.min(1, Math.abs(s.bal.b)); s.balN++;
        const [, , th] = inrunPos(s.s), q = .94 + .06 * (s.balQ / s.balN);
        const left0 = INRUN + TABLE - s.s;
        if (I.A && left0 <= 4 && left0 > 0) { s.q = left0 <= 1 ? 1 : left0 <= 2.5 ? .7 : .4; takeoff(ctx, a); continue; }
        s.v += (g * Math.sin(th) - .02 * g * Math.cos(th) - T.kAir * s.v * s.v) * dt * q * (a.turboT > 0 ? 1.05 : 1);
        s.s += s.v * dt;
        const left = INRUN + TABLE - s.s;
        if (false) { /* pressed in time: handled above */ }
        else if (left <= 0) { s.q = .1; takeoff(ctx, a); if (!ctx.god(a)) ctx.yikes(a, 'FELL OFF THE TABLE', 'table'); }
        continue;
      }
      if (s.phase === 'flight') {
        // body angle by the stick, pushed by gusts
        s.gT -= dt; if (s.gT <= 0) { const r = ctx.rng('gust' + Math.floor(s.t * 3)); s.gT = .4 + r() * .6; s.gust = (r() * 2 - 1) * T.gust; }
        const prev = s.al; s.al += (-I.mv[1] * 40 + s.gust) * dt; s.al = E.clamp(s.al, -20, 80); s.wob += Math.abs(s.al - prev) > 0 ? Math.abs(s.gust) * dt * .02 : 0;
        const v = Math.hypot(s.vx, s.vz), ux = s.vx / v, uz = s.vz / v, rocket = a.turboT > 0;
        const cL = T.cL0 * Math.max(.1, 1 - Math.pow((s.al - 12) / 30, 2)) * (rocket ? 1.04 : 1), cD = T.cDBase + .00002 * Math.max(0, s.al);
        const aL = cL * v * v, aD = cD * v * v, th = rocket ? .6 : 0;
        s.vx += (-uz * aL - ux * aD + ux * th) * dt; s.vz += (ux * aL - uz * aD + uz * th - g) * dt;
        s.x += s.vx * dt; s.z += s.vz * dt;
        const h = s.z - hill(s.x);
        if (I.A && h < 2.5 && !s.tele) { s.tele = true; s.teleT = s.t; }
        if (h <= 0) land(ctx, a);
        continue;
      }
      if (s.phase === 'landed') { s.endT += dt; const sl = Math.atan2(hill(s.x + .5) - hill(s.x), .5), sp = Math.max(0, s.v - (s.x > 189 ? 14 : 3) * dt); s.v = sp; s.x += sp * Math.cos(sl) * dt; s.z = hill(s.x); }
    }
    if (!ctx.sandbox) for (const a of ctx.active) animate(ctx, a, dt);
  },
  done(ctx) { return ctx.active.every(a => a.fin && (a.S.endT > 2.4 || ctx.fast)); },
  perf(ctx, a) { return a.cur === undefined ? null : a.cur; },
  camera(ctx) {
    const a = ctx.cur; if (!a || !a.S || a.S.s === undefined) { game.focus(0, 0, 0); return; }
    const s = a.S; let x, z;
    if (s.phase === 'gate' || s.phase === 'inrun') { const p = inrunPos(s.s); x = p[0]; z = p[1]; } else { x = s.x; z = s.z; }
    game.focus(x * M + 30, 0, z * M + 10); game.setZoom(s.phase === 'flight' ? 1.25 : 1.5);
  },
  draw(ctx, r) {
    BACK.draw(r);
    const a = ctx.cur;
    // the hill: in-run ramp, the jump tower, the landing slope with K and HS lines, distance boards, crowd
    r.queue(0, 0, -10, g => {
      const pts = []; for (let x = 0; x <= 260; x += 4) { const p = r.w(x * M, 0, hill(x) * M); pts.push([p[0], p[1]]); }
      const end = r.w(260 * M, 0, -400 * M), st = r.w(0, 0, -400 * M); pts.push([end[0], end[1]], [st[0], st[1]]);
      px.poly(g, pts, '#e8f0fb');
      for (let x = 0; x <= 260; x += 2) { const p = r.w(x * M, 0, hill(x) * M); px.rect(g, p[0], p[1], 2, 2, x % 10 < 2 ? '#c8d8ec' : '#f8fbff'); }
      for (const [d, col, lbl] of [[125, '#e8443a', 'K'], [140, '#e8c020', 'HS']]) { const x = xAt(d), p = r.w(x * M, 0, hill(x) * M); px.rect(g, p[0] - 1, p[1] - 4, 3, 8, col); E.font.text(g, lbl, p[0], p[1] + 6, col, { align: 'center', outline: false, font: 'tiny' }); }
      for (let d = 60; d <= 160; d += 10) { const x = xAt(d), p = r.w(x * M, 0, hill(x) * M); px.rect(g, p[0] - 6, p[1] - 14, 12, 7, '#2a3060'); E.font.text(g, String(d), p[0], p[1] - 13, '#ffffff', { align: 'center', outline: false, font: 'tiny' }); }
      // in-run
      const p0 = r.w(TOP[0] * M, 0, TOP[1] * M), p1 = r.w(TS[0] * M, 0, TS[1] * M), p2 = r.w(0, 0, 0);
      const base = r.w(TOP[0] * M, 0, -10 * M);
      px.poly(g, [[p0[0], p0[1]], [p1[0], p1[1]], [p2[0], p2[1]], [p2[0], base[1]], [p0[0] - 12, base[1]], [p0[0] - 12, p0[1]]], '#4a5068');
      px.line(g, p0[0], p0[1], p1[0], p1[1], '#f8fbff', 2); px.line(g, p1[0], p1[1], p2[0], p2[1], '#f8fbff', 2);
      for (let k = 0; k < 10; k++) { const q = r.w((TOP[0] + k * 8) * M, 0, (TOP[1] - k * 8 * Math.tan(A35)) * M); px.rect(g, q[0] - 1, q[1], 2, base[1] - q[1], '#2a3048'); }
      px.rect(g, p0[0] - 16, p0[1] - 30, 18, 30, '#5a6080'); px.rect(g, p0[0] - 12, p0[1] - 26, 10, 8, '#ffd870');
      // the out-run crowd with flags and cowbells
      const c0 = r.w(170 * M, 0, hill(170) * M), c1 = r.w(250 * M, 0, hill(250) * M);
      O.Art.crowd(g, c0[0], c0[1] - 26, c1[0] - c0[0], 22, O.Crowd.level, 31, ['#e23b2e', '#f4f8ff', '#2fa8d8', '#6a3fc8', '#f2b632', '#1fa8a0']);
    }, { bias: -1000 });
    // floodlights
    for (let k = 0; k < 7; k++) { const x = -60 + k * 34, z = (x < 0 ? (k * 0 + TOP[1] * (1 + x / 80)) : hill(x)) + 22; game.lights.add(x * M, 0, z * M, 260, .9, { color: '#fff0c8' }); r.queue(x * M, 0, z * M, g => { const p = r.w(x * M, 0, z * M); px.rect(g, p[0] - 4, p[1] - 2, 8, 3, '#fff8d8'); px.rect(g, p[0], p[1], 1, 40, '#3a3a4a'); }, { emissive: true }); }
    if (a && a.rig && a.S.s !== undefined) {
      const s = a.S; let x, z, ang;
      if (s.phase === 'gate' || s.phase === 'inrun') { const p = inrunPos(s.s); x = p[0]; z = p[1]; ang = -p[2]; } else { x = s.x; z = s.z; ang = s.phase === 'flight' ? Math.atan2(s.vz, s.vx) + (s.al - 12) * D2R * .3 : Math.atan2(hill(s.x + .5) - hill(s.x), .5); }
      r.actor(x * M, 0, z * M, (g, ox, oy) => { a.rig.draw(g, ox, oy, r.view); }, { flash: a.turboT > 0 ? '#ffb040' : false, flashMix: .25 });
      // skis: two long lines from the feet (a V in flight)
      r.queue(x * M, 1, z * M, g => { const f = a.rig.worldOffset ? a.rig.worldOffset(a.rig.J.footR) : [0, 0, 0], p = r.w(x * M + f[0], 0, z * M + f[2]); const L = 22, ca = Math.cos(ang), sa = Math.sin(ang); for (const k of s.phase === 'flight' ? [-.18, .18] : [0]) px.line(g, p[0] - ca * L * .3, p[1] + sa * L * .3, p[0] + Math.cos(ang - k) * L * .7, p[1] - Math.sin(ang - k) * L * .7, a.nat.colors.b === '#1e2026' ? '#e23b2e' : a.nat.colors.b, 2); if (a.turboT > 0) game.particles.fire(x * M - ca * 8, 0, z * M + 2, 1, { size: 3 }); });
    }
  },
  hud(ctx, r, g) {
    O.HUD.header(g, r, ctx);
    const a = ctx.cur; if (!a || !a.S || a.S.s === undefined) return;
    const s = a.S;
    O.HUD.big(g, r.W - 14, 10, s.dist != null ? s.dist.toFixed(1) + ' M' : s.phase === 'flight' ? Math.max(0, along(Math.max(0, s.x))).toFixed(1) + ' M' : Math.round(s.v * 3.6) + ' KM/H');
    if (s.phase === 'gate' && a.human) O.Prompt.draw(g, r.W / 2, r.H * .3, 'action', { input: a.input, label: 'PUSH OFF', align: 'center', size: 2 });
    if (s.phase === 'inrun') { s.bal.draw(g, r.W / 2, r.H - 30, 140, 'TUCK'); const left = INRUN + TABLE - s.s; const w = 160, x = r.W / 2 - w / 2, y = r.H - 52; px.rect(g, x, y, w, 6, '#2a3060'); const k = E.clamp(1 - left / 30, 0, 1); px.rect(g, x + w * (1 - 4 / 30), y, w * (2.5 - 1) / 30, 6, '#3a7cf0'); px.rect(g, x + w * (1 - 1 / 30), y, w / 30, 6, '#f2c94c'); px.rect(g, x + w * k - 1, y - 2, 3, 10, '#ffffff'); if (a.human && left < 6) O.Prompt.draw(g, r.W / 2, y - 18, 'action', { input: a.input, label: 'JUMP!', align: 'center', color: '#ffd060' }); }
    if (s.phase === 'flight') {
      const cx = r.W - 60, cy = r.H - 44; px.disc(g, cx, cy, 26, '#05060f'); for (let d = -10; d <= 60; d += 2) { const t = -d * D2R; px.rect(g, Math.round(cx + Math.cos(t) * 22), Math.round(cy + Math.sin(t) * 22), 1, 1, d >= 6 && d <= 18 ? '#4fe0a8' : '#5a6290'); }
      const t = -s.al * D2R; px.line(g, cx, cy, cx + Math.cos(t) * 20, cy + Math.sin(t) * 20, '#ffffff', 2); O.text(g, 'ANGLE ' + Math.round(s.al) + '°', cx, cy + 28, '#ffffff', { align: 'center' });
      if (a.human) { O.Prompt.draw(g, 14, r.H - 30, 'move', { input: a.input, label: '↑ ↓ FLY THE V' }); const h = s.z - hill(s.x); if (h < 3 && s.vz < 0) O.Prompt.draw(g, r.W / 2, r.H * .3, 'action', { input: a.input, label: 'TELEMARK!', align: 'center', size: 2, color: '#ffd060' }); O.HUD.flame(g, 14, r.H - 60, a, a.input); }
    }
    if (s.style != null) { const w = 220, x = r.W / 2 - w / 2; O.panel(g, x, 50, w, 40); O.text(g, s.dist.toFixed(1) + ' M  ·  STYLE ' + s.style.toFixed(1), r.W / 2, 56, '#ffffff', { align: 'center' }); (s.cards || []).forEach((c, k) => { px.rect(g, x + 20 + k * 38, 70, 30, 14, '#ffffff'); O.text(g, c.toFixed(1), x + 35 + k * 38, 73, '#1a1d2e', { align: 'center', shadow: false }); }); }
  },
  ghostState(ctx, a) { const s = a.S; if (s.phase === 'flight' || s.phase === 'landed') return [s.x * M, 0, s.z * M, 0, 7]; const p = inrunPos(s.s || 0); return [p[0] * M, 0, p[1] * M, 0, 7]; },
  ghostDraw(ctx, r, s, i) { return [s[0], 10 + i * 8, s[2]]; }
});
function takeoff(ctx, a) {
  const s = a.S, T = ctx.T; s.phase = 'flight';
  const v = s.v; s.x = 0; s.z = .2; s.vx = v * Math.cos(A11); s.vz = -v * Math.sin(A11) + T.takeoffBoost * s.q + 1.2 * s.q; s.al = 22;
  ctx.fx.sfx('whooshBig'); O.Crowd.excite(.3);
  if (s.q >= 1) ctx.hype(a, .2);
}
function land(ctx, a) {
  const s = a.S, T = ctx.T, d = Math.round(along(Math.max(0, s.x)) * 2) / 2;
  s.z = hill(s.x); s.phase = 'landed'; s.endT = 0; s.v = Math.hypot(s.vx, s.vz) * .8; s.dist = d;
  const tele = s.tele && s.t - s.teleT <= T.telemarkWindow;
  s.crashed = (s.al > T.crashAngle || (d > 150 && !tele)) && !ctx.god(a);
  const r = ctx.rng('style'), sty = []; for (let k = 0; k < 5; k++) { const base = s.crashed ? 6 + r() * 3 : tele ? 17.5 + r() * 2 : 15 + r() * 2; sty.push(Math.max(0, Math.round((base - Math.min(2, s.wob)) * 2) / 2)); }
  s.cards = sty; const srt = sty.slice().sort((x, y) => x - y); s.style = srt[1] + srt[2] + srt[3];
  const pts = Math.max(0, 60 + (d - 125) * 1.8) + s.style;
  ctx.finish(a, Math.round(pts * 10) / 10);
  if (s.crashed) { ctx.yikes(a, 'CRASH!', 'crash'); ctx.fx.sfx('crunch'); ctx.fx.P.dust(s.x * M, 0, s.z * M, 18, { color: '#ffffff' }); }
  else { ctx.fx.sfx('crunch', { vol: .5 }); ctx.fx.P.dust(s.x * M, 0, s.z * M, 8, { color: '#ffffff' }); if (d >= 125) { O.Crowd.excite(.6); ctx.fx.sfx('cowbell'); ctx.fx.say('skijump', { name: a.short }); } if (tele) ctx.hype(a, .2); }
  if (a.human || ctx.highlight) ctx.fx.slowmo(.35, .5);
}
function animate(ctx, a, dt) {
  const s = a.S, rig = a.rig;
  rig.bodyPitch = 0;
  if (s.phase === 'gate' || s.phase === 'inrun') { O.Pose.set(rig, 'skiTuck'); const p = inrunPos(s.s || 0); rig.bodyPitch = p[2] * .5; rig.pivot = [0, 0, 0]; }
  else if (s.phase === 'flight') { O.Pose.set(rig, 'skiFlight'); rig.bodyPitch = (60 + (12 - s.al) * .3) * D2R + Math.atan2(-s.vz, s.vx) * .3; rig.pivot = [0, 0, rig.o.hipZ * .5]; }
  else if (s.phase === 'landed') { if (s.crashed) { O.Pose.set(rig, null); } else O.Pose.set(rig, s.tele ? 'telemark' : 'skiStand'); }
  const st = { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 };
  if (s.phase === 'landed' && s.crashed) { st.flip = Math.min(1, (s.endT * 1.3) % 1); st.down = Math.min(1, s.endT * .8); }
  if (s.phase === 'landed' && !s.crashed && s.endT > 1.2) st.pose = 'cheer';
  rig.update(dt, st);
}
})();
