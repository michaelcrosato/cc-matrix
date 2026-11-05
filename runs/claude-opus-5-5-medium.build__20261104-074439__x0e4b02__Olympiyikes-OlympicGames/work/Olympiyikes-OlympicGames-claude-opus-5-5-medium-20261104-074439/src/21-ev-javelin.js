/* OLYMPIYIKES! — JAVELIN THROW (§6.2): mash the run-up, hold for the angle, release before the line; wind, drag, the blimp. */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, ST = O.Stadium, M = 12;
const FOUL = 30, Y = 222, DEG = Math.PI / 180;
const X = d => ST.X0 + d * M;
O.defEvent({
  id: 'javelin', name: 'JAVELIN', short: 'Javelin', season: 'summer', venue: 'Glory Stadium infield', pictogram: 'javelin', music: 'javelin', view: 'brawler', sport: 'track', lights: .85,
  format: { type: 'attempts', rounds: 3, combine: 'best' }, maxTime: 25, turbo: 'HYPER ARM!',
  measure: { better: 'higher', unit: 'm', fmt: v => v.toFixed(2) + ' m', wr: [101.2, 'VOL', 'BLAZE CINDERHART'], qualify: { Easy: 58, Normal: 72, Hard: 82 } },
  points: d => 10.14 * Math.pow(Math.max(0, d - 7), 1.05),
  tune: { vMaxRun: [9, 6, 12, .1, 'Run top speed (m/s)'], angleRate: [55, 20, 120, 1, 'Angle rate (°/s)'], vRelBase: [13, 8, 20, .1, 'Release speed base'], vRelPerRun: [1.9, 1, 3, .05, 'Release speed per run m/s'],
    drag: [.0011, 0, .004, .0001, 'Drag'], windMax: [3, 0, 6, .1, 'Tailwind max (m/s)'], turboMult: [1.12, 1, 1.5, .01, 'Turbo release ×'] },
  howto: { goal: 'Longest throw of three wins.', rows: [['pair', 'Alternate to run'], [['action'], 'Hold: raise the angle · release: throw'], [null, 'Release before the white line!'], [['turbo'], 'HYPER ARM when the flame is full']] },
  yikesKinds: ['FOUL!', 'FLAT!'],
  laurel: { id: 'outstadium', name: 'OUT OF THE STADIUM', text: 'Throw beyond 120 m', test: (ctx, a) => a.lastPerf != null && a.lastPerf > 120 },
  hub: { ok: true, attempts: 2, seconds: 45 }, attract: { seconds: 16, after: 3, setup(ctx) { const a = ctx.cur; a.S.wind = 3; } },
  phases: [['run-up', ctx => { ctx.cur.S.phase = 'run'; ctx.cur.S.d = 0; }], ['release', ctx => { const s = ctx.cur.S; s.d = 26; s.v = 9; s.phase = 'run'; }]],
  build(ctx) { ST.build(); ctx.S.marks = []; },
  start(ctx) {
    const a = ctx.cur, r = ctx.rng('wind'), sk = ctx.skill(a), rb = ctx.rng('blimp');
    a.S = { phase: 'run', d: 0, v: 0, ang: 0, angDir: 1, holding: false, jav: null, wind: -2 + r() * (2 + ctx.T.windMax), mark: null, flat: false, t: 0, landT: 0, blimpX: 55 + rb() * 50, blimpZ: 55 + rb() * 15, popped: false,
      target: a.pilot.cheat === 'perfect' ? 38 : 38 + O.gauss(ctx.rng('ang')) * (7 - 5 * sk), willFoul: !a.human && a.pilot.cheat !== 'perfect' && ctx.rng('foul')() < (1 - sk) * .12, rate: 6.8 + 4 * sk };
  },
  bot(ctx, a, dt, I) {
    const s = a.S, T = ctx.T;
    if (s.phase !== 'run') return I;
    O.botMash(a, a.pilot.cheat === 'perfect' ? 12 : s.rate, dt, I);
    if (a.hype >= 1 && s.d > 10) I.T = true;
    const holdTime = s.target / T.angleRate, startAt = (s.willFoul ? FOUL + .8 : FOUL - .6) - s.v * holdTime;
    if (s.d >= startAt) { I.Ad = true; if (s.holding && s.ang >= s.target) { I.Ad = false; I.Au = true; } }
    return I;
  },
  step(ctx, dt) {
    const T = ctx.T;
    for (const a of ctx.active) {
      const s = a.S, I = a.I; s.t += dt;
      if (s.phase === 'run') {
        const pw = a.mash.power(); s.pw = pw;
        const vt = T.vMaxRun * pw; s.v += (vt - s.v) * Math.min(1, dt * (vt > s.v ? 1.2 : 2.5)); s.d += s.v * dt;
        if (I.Ad) { s.holding = true; s.ang += s.angDir * T.angleRate * dt; if (s.ang >= 80) { s.ang = 80; s.angDir = -1; } if (s.ang <= 0) { s.ang = 0; s.angDir = 1; } }
        if (s.holding && (I.Au || (!I.Ad && !a.human))) release(ctx, a);
        else if (s.d > FOUL + .2 && s.phase === 'run') { if (ctx.god(a)) { s.d = FOUL; } else { s.phase = 'foul'; s.landT = 0; s.v *= .5; ctx.yikes(a, 'FOUL!', 'foul'); ctx.fx.sfx('whistle'); } }
        if (s.t > 14 && s.phase === 'run' && !s.holding) { s.phase = 'foul'; s.landT = 0; a.notes.push('NM'); }
      } else if (s.phase === 'flight') {
        const j = s.jav, vx = j.vx - s.wind, sp = Math.hypot(vx, j.vz), k = T.drag * sp;
        j.vx -= k * vx * dt; j.vz -= (9.81 + k * j.vz) * dt; j.x += j.vx * dt; j.z += j.vz * dt;
        s.v = Math.max(0, s.v - 8 * dt); s.d = Math.min(FOUL, s.d + s.v * dt);
        if (!s.popped && Math.abs(j.x - FOUL - s.blimpX) < 4 && Math.abs(j.z - s.blimpZ) < 4) { s.popped = true; j.vx *= .25; j.vz = Math.min(j.vz, 0); ctx.fx.sfx('pop'); ctx.fx.banner('BLIMP BUSTER!', { y: .2 }); ctx.fx.P.bits(X(j.x), Y, j.z * M, 40, ['#e8443a', '#f2b632', '#4fe0a8', '#3a7cf0']); }
        if (j.z <= 0) {
          j.z = 0; s.landT = 0;
          const dist = j.x - FOUL;
          if (s.flat) { s.phase = 'landed'; ctx.dnf(a, 'FLAT'); ctx.yikes(a, 'FLAT!', 'flat'); ctx.fx.sfx('boing'); }
          else { s.phase = 'landed'; s.mark = Math.round(dist * 100) / 100; ctx.finish(a, s.mark); ctx.fx.sfx('thunk'); ctx.fx.P.dust(X(j.x), Y, 0, 8); if (dist > 120) { ctx.fx.sfx('alarm'); ctx.fx.say('javelin', { name: a.short }); } if (a.human || ctx.highlight) ctx.fx.slowmo(1, .01); }
          (ctx.S.marks = ctx.S.marks || []).push({ x: j.x, a, flat: s.flat });
        }
        if (j.z < 2 && j.vz < 0 && !s.slowed) { s.slowed = true; ctx.fx.slowmo(.35, .6); }
      } else if (s.phase === 'foul') { s.landT += dt; s.v = Math.max(0, s.v - 10 * dt); s.d += s.v * dt; if (s.landT > 1.2) ctx.dnf(a, 'FOUL'); }
      else if (s.phase === 'landed') s.landT += dt;
    }
    if (!ctx.sandbox) for (const a of ctx.active) animate(ctx, a, dt);
  },
  done(ctx) { return ctx.active.every(a => a.fin && (a.S.landT > 1 || ctx.fast)); },
  perf(ctx, a) { return a.cur === undefined ? null : a.cur; },
  camera(ctx, dt, ph) {
    const a = ctx.cur || ctx.athletes[0]; if (!a || !a.S || a.S.d === undefined) { game.focus(X(10), Y, 20); return; }
    const s = a.S;
    if (s.phase === 'flight' || (s.phase === 'landed' && s.jav)) { const j = s.jav; game.focus(X(j.x), Y, Math.min(j.z * M, 300) * .6 + 20); game.setZoom(s.phase === 'landed' ? 1.4 : Math.max(.6, 1.1 - j.z / 120)); }
    else { game.focus(X(s.d) + 60, Y, 20); game.setZoom(1.3); }
  },
  draw(ctx, r) {
    ST.drawVenue(r, { blimpX: 0, noBlimp: true });
    const a = ctx.cur;
    // sector lines every 10 m, the foul arc, the wall and the parking lot
    r.decal && null;
    for (let m = 10; m <= 140; m += 10) { const x = X(FOUL + m); r.queue(x, Y, 0, g => { const p = r.w(x, 190, 0), q = r.w(x, 262, 0); px.line(g, p[0], p[1], q[0], q[1], '#e8f0e8', 1); E.font.text(g, String(m), q[0] + 2, q[1] - 8, '#ffffff', { outline: false, font: 'tiny' }); }, { bias: -500 }); }
    r.queue(X(FOUL), Y, 0, g => { const p = r.w(X(FOUL), 205, 0), q = r.w(X(FOUL), 240, 0); px.line(g, p[0], p[1], q[0], q[1], '#ffffff', 2); }, { bias: -400 });
    const wx = X(FOUL + 120.5); r.queue(wx, Y, 0, g => { const p = r.w(wx, 184, 0), q = r.w(wx, 270, 0), t = r.w(wx, 184, 30); px.poly(g, [[p[0], p[1]], [q[0], q[1]], [q[0], q[1] - (p[1] - t[1])], [t[0], t[1]]], '#5a6290'); E.font.text(g, '120 M', t[0] + 6, t[1] + 2, '#ffd060', { outline: false, font: 'tiny' }); }, { bias: 20 });
    for (let k = 0; k < 6; k++) { const cx = X(FOUL + 126 + k * 6), cy = 200 + (k % 3) * 22; r.queue(cx, cy, 0, g => { const p = r.w(cx, cy, 0); px.rect(g, p[0] - 10, p[1] - 8, 20, 8, ['#e8443a', '#3a7cf0', '#f2b632'][k % 3]); px.rect(g, p[0] - 6, p[1] - 12, 12, 5, '#a8c8e8'); }); }
    // the blimp for this throw
    if (a && a.S.blimpX && !a.S.popped) { const bx = X(FOUL + a.S.blimpX), bz = a.S.blimpZ * M; r.queue(bx, Y, bz, g => { const p = r.w(bx, Y, bz); px.ell(g, p[0], p[1], 30, 10, '#d8dce8'); px.ell(g, p[0], p[1] + 2, 30, 8, '#b8bcc8'); E.font.text(g, 'YIKES', p[0], p[1] - 3, '#e8443a', { align: 'center', outline: false, font: 'tiny' }); }); }
    // windsock
    r.queue(X(FOUL - 4), 196, 0, g => { const p = r.w(X(FOUL - 4), 196, 0), w = a ? a.S.wind || 0 : 0; px.rect(g, p[0], p[1] - 40, 1, 40, '#c8ccd8'); px.poly(g, [[p[0], p[1] - 40], [p[0] + w * 5, p[1] - 38], [p[0] + w * 5, p[1] - 35], [p[0], p[1] - 33]], '#ff7a2a'); });
    // old marks
    for (const m of ctx.S.marks || []) r.queue(X(m.x), Y + 4, 0, g => { const p = r.w(X(m.x), Y + 4, 0); px.rect(g, p[0], p[1] - 6, 1, 6, m.a.color || '#ffffff'); px.rect(g, p[0], p[1] - 6, 4, 3, m.a.color || m.a.nat.colors.a); });
    if (a && a.rig) {
      ST.athleteDraw(r, a, X(a.S.d), Y, 0);
      const s = a.S;
      if (s.phase === 'run' || s.phase === 'foul') { const h = a.rig.hand('R'); drawJav(r, h[0] - 14, h[1], h[2] + 2, s.holding ? s.ang * DEG : .25); }
      if (s.jav) { const j = s.jav, ang = Math.atan2(j.vz, j.vx); drawJav(r, X(j.x), Y, Math.max(j.z * M, s.phase === 'landed' ? 4 : 0), s.phase === 'landed' ? (s.flat ? 0 : -.6) : ang, a.turboT > 0 || s.fire); if (s.phase === 'flight' && s.fire) game.particles.fire(X(j.x), Y, j.z * M, 1, { size: 2 }); }
    }
  },
  hud(ctx, r, g) {
    O.HUD.header(g, r, ctx);
    const a = ctx.cur; if (!a || !a.S || a.S.d === undefined) return;
    const s = a.S;
    O.HUD.big(g, r.W - 14, 10, s.mark != null ? s.mark.toFixed(2) + ' M' : s.jav ? Math.max(0, s.jav.x - FOUL).toFixed(1) + ' M' : (FOUL - s.d).toFixed(1) + ' M TO LINE');
    // wind
    O.text(g, 'WIND ' + (s.wind >= 0 ? '+' : '') + s.wind.toFixed(1) + ' m/s', r.W - 14, 30, s.wind >= 0 ? '#4fe0a8' : '#ff8a6a', { align: 'right' });
    // the angle dial
    const cx = r.W - 60, cy = r.H - 30, R = 40;
    px.disc(g, cx, cy, R + 2, '#05060f');
    for (let d = 0; d <= 80; d += 2) { const t = -d * DEG, col = d >= 34 && d <= 42 ? '#4fe0a8' : d >= 20 && d <= 60 ? '#3a7cf0' : '#e8443a'; px.rect(g, Math.round(cx - 30 + Math.cos(t) * R), Math.round(cy + Math.sin(t) * R), 2, 2, col); }
    const t = -s.ang * DEG; px.line(g, cx - 30, cy, cx - 30 + Math.cos(t) * (R - 2), cy + Math.sin(t) * (R - 2), '#ffffff', 2);
    O.text(g, Math.round(s.ang) + '°', cx - 30, cy - 12, '#ffffff');
    // run power, prompts
    if (a.human) {
      O.HUD.power(g, 14, r.H - 30, 90, s.pw || 0); O.HUD.flame(g, 112, r.H - 42, a, a.input);
      if (s.phase === 'run' && game.settings.hints) { O.Prompt.pair(g, 14, r.H - 48, { input: a.input, label: 'RUN', phase: a.mash.last === 'L' ? 1 : 0 }); O.Prompt.draw(g, 14, r.H - 62, 'action', { input: a.input, label: s.holding ? 'RELEASE AT 38°' : 'HOLD: ANGLE', color: '#ffd060' }); }
    }
    const best = a.attempts.length ? O.agg(ctx, a) : null; if (best != null) O.text(g, 'BEST ' + best.toFixed(2) + ' M', 14, 30, '#ffd060');
  },
  ghostState(ctx, a) { const s = a.S; return s.jav ? [X(s.jav.x), 0, s.jav.z * M, 0, 2] : [X(s.d || 0), 0, 0, 0, 1]; },
  ghostDraw(ctx, r, s, i) { return [s[0], Y - 16 - i * 8, s[2]]; }
});
function release(ctx, a) {
  const s = a.S, T = ctx.T;
  if (s.d > FOUL && !ctx.god(a)) return;
  s.holding = false; s.phase = 'flight';
  let vr = (T.vRelBase + T.vRelPerRun * s.v) * ctx.turboMult(a, T.turboMult); s.fire = a.turboT > 0;
  const ang = s.ang * DEG; s.relAng = s.ang;
  s.flat = s.ang < 20 || s.ang > 60;
  s.jav = { x: s.d, z: 2, vx: vr * Math.cos(ang), vz: vr * Math.sin(ang) };
  ctx.fx.sfx('whooshBig'); O.Crowd.excite(.3);
  if (a.rig) a.rig._throwT = .4;
}
function drawJav(r, x, y, z, ang, fire) {
  r.queue(x, y, z, g => { const p = r.w(x, y, z), L = 22, c = Math.cos(ang) * L, s = Math.sin(ang) * L * .95; px.line(g, p[0] - c / 2, p[1] + s / 2, p[0] + c / 2, p[1] - s / 2, fire ? '#ffb03a' : '#e8e8f0', 1); px.rect(g, Math.round(p[0] + c / 2), Math.round(p[1] - s / 2), 2, 1, '#3a3a4a'); px.rect(g, Math.round(p[0] - 2), Math.round(p[1]), 3, 1, '#c8301a'); }, { emissive: !!fire });
}
function animate(ctx, a, dt) {
  const s = a.S, rig = a.rig;
  if (s.phase === 'run') O.Pose.set(rig, s.holding ? 'javWithdraw' : 'javCarry');
  else if (s.phase === 'flight' || (s.phase === 'landed' && s.landT < .5)) O.Pose.set(rig, s.t % 1 < .5 && (rig._throwT || 0) > 0 ? 'javThrow' : null);
  else O.Pose.set(rig, null);
  if (rig._throwT > 0) { rig._throwT -= dt; O.Pose.set(rig, 'javThrow'); }
  const st = { x: X(s.d), y: Y, z: 0, vx: s.v * M, vy: 0, facing: 0 };
  if (s.phase === 'foul') { st.flip = Math.min(1, s.landT * 1.2); st.vx = 0; }
  if (s.phase === 'landed' && s.landT > .6) st.pose = s.flat ? 'hips' : s.mark > 80 ? 'cheer' : 'wave';
  rig.update(dt, st);
}
})();
