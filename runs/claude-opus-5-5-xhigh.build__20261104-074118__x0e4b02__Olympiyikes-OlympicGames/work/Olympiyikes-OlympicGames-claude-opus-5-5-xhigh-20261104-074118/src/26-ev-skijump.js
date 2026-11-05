// SKI JUMP (large hill, K-125, HS-140) — winter · Mount Glory Jumping Hill · balance the in-run, time the take-off,
// hold the flight angle against the gusts, telemark the landing. Floodlights, snow, cowbells.
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, { clamp, lerp } = E;
const UI = O.UI, Art = O.Art, M = 8, DEG = Math.PI / 180, K = 125, HS = 140;
// the in-run: 95 m from the gate, 35° then easing to -11° over the last 15 m; positions shifted so the edge is (0, 0)
const IN = (() => { const pts = []; let x = 0, z = 0; for (let u = 0; u <= 95; u += .5) { const th = u < 80 ? 35 : lerp(35, 11, (u - 80) / 15); pts.push([u, x, z, th]); x += Math.cos(th * DEG) * .5; z -= Math.sin(th * DEG) * .5; } const [, ex, ez] = pts[pts.length - 1]; return pts.map(([u, px0, pz, th]) => [u, px0 - ex, pz - ez, th]); })();
const inAt = u => { const i = clamp(Math.floor(u / .5), 0, IN.length - 2), k = clamp((u - i * .5) / .5, 0, 1), a = IN[i], b = IN[i + 1]; return [lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k)]; };
const hillZ = x => { if (x < 0) return 0; if (x < 15) return -2.5 - 3 * (x / 15) * (x / 15); if (x < 125) return -5.5 - .58 * (x - 15); const d = Math.min(x, 189.4) - 125; return -5.5 - .58 * 110 - .58 * d + .0045 * d * d; };
const ARC = (() => { const out = [0]; let s = 0; for (let x = .5; x <= 300; x += .5) { s += Math.hypot(.5, hillZ(x) - hillZ(x - .5)); out.push(s); } return out; })();
const arcAt = x => { const i = clamp(Math.floor(x / .5), 0, ARC.length - 2), k = clamp((x - i * .5) / .5, 0, 1); return lerp(ARC[i], ARC[i + 1], k); };
const xAtArc = d => { let lo = 0, hi = ARC.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ARC[m] < d) lo = m; else hi = m; } return lo * .5 + (d - ARC[lo]) / Math.max(1e-6, ARC[hi] - ARC[lo]) * .5; };
O.SKIJUMP = { hillZ, arcAt, xAtArc };
let BG = null;

O.defEvent({
  id: 'skijump', name: 'SKI JUMP', short: 'Ski Jump', season: 'winter', venueName: 'MOUNT GLORY JUMPING HILL', music: 'alpine', view: 'side',
  format: { type: 'attempts', attempts: 2 }, aggregate: 'sum', highlights: 1, maxTime: 40, roundName: 'JUMP', M,
  measure: { unit: 'pts', better: 'higher', fmt: v => v.toFixed(1), wr: [296.4, 'FRM', 'INGRID SNOWCASTLE'], qualify: { Easy: 160, Normal: 210, Hard: 245 }, seedStep: -9, dp: 1 },
  points: v => 3.9 * v,
  tune: { kAir: [.0016, 0, .005, .0001, 'In-run air drag'], takeoffBoost: [2.4, 0, 5, .1, 'Take-off boost (m/s)'], cL0: [.0045, .002, .012, .0001, 'Lift'], cDBase: [.0016, .0005, .004, .0001, 'Flight drag'], gust: [6, 0, 20, .5, 'Gusts (deg/s)'], telemarkWindow: [.35, .1, .8, .01, 'Telemark window (s)'], crashAngle: [40, 25, 60, 1, 'Crash angle (deg)'] },
  howto: { goal: 'Two jumps: distance points plus style points. Keep the tuck, take off at the edge, hold the angle in the green, telemark the landing.', rows: [[['action'], 'PUSH OFF · TAKE OFF · TELEMARK'], [['moveV'], 'IN-RUN: BALANCE · FLIGHT: BODY ANGLE'], [['turbo'], 'ROCKET SKIS']] },
  yikesKinds: ['table', 'crash'], turboName: 'ROCKET SKIS!',
  laurel: { id: 'offchart', name: 'OFF THE CHART', text: 'Land beyond 150 m without crashing', test: (ctx, a) => a.attempts.some(x => x && x.info && x.info.d > 150 && !x.info.crash) },
  hub: { ok: true, attempts: 1, seconds: 40 }, attract: { seconds: 20 },
  phases: ['gate', 'inrun', 'flight', 'landing'],
  hubSample: ctx => { const s = ctx.s; if (!s) return null; const p = s.phase === 'gate' || s.phase === 'inrun' ? inAt(s.u) : [s.x, s.z]; return [p[0] * M, p[1] * M]; },
  hubPoint: (ctx, q, g) => [q[0], 12 + 8 * Object.keys(O.Hub.ghosts).indexOf(String(g.id)), q[1]],
  build(ctx) { for (const a of ctx.athletes) a.rig = O.makeRig(a.nation, 'skijump'); game.weather = { kind: 'snow', amount: .3, wind: .1 }; ctx.w.bells = 0; },
  start(ctx, a) { ctx.s = { a, phase: 'gate', pt: 0, u: 0, v: 0, bal: new O.Widgets.Balance(ctx.rng('inrun:' + a.id), { drift: .7, k: 3.4 }), balQ: 0, balN: 0, q: 0, x: 0, z: 0, vx: 0, vz: 0, al: 30, gustV: 0, wob: 0, wobN: 0, press: null, land: null, d: null, tele: false, crash: false, cards: null, score: null, rnd: ctx.rng('gust:' + a.id), slide: 0, air: 0 }; },
  step(ctx, dt) {
    const s = ctx.s, a = s.a, I = a.I, T = ctx.T; s.pt += dt;
    if (s.phase === 'gate') { if ((I.A && s.pt > .3) || s.pt > 6) { s.phase = 'inrun'; s.pt = 0; ctx.cue('start', { a }); ctx.sfx('ski'); } }
    else if (s.phase === 'inrun') {
      const [, , th] = inAt(s.u), g = 9.81;
      s.bal.update(dt, -I.mv[1], { driftK: 1 });
      if (s.bal.lost) { s.bal.lost = false; s.bal.b *= .5; s.v *= .97; }
      const qb = 1 - Math.min(1, Math.abs(s.bal.b)); s.balQ += qb * dt; s.balN += dt;
      s.v += (g * Math.sin(th * DEG) - .02 * g * Math.cos(th * DEG) - T.kAir * s.v * s.v) * dt * (.94 + .06 * qb);
      s.u += s.v * dt;
      const toEdge = 95 - s.u;
      if (I.A && toEdge <= 4 && s.press === null) { s.press = toEdge; }
      if (s.u >= 95) takeoff(ctx);
    } else if (s.phase === 'air') {
      s.air += dt;
      const rocket = a.turboT > 0, sp = Math.hypot(s.vx, s.vz), ux = s.vx / sp, uz = s.vz / sp;
      s.gustV += (s.rnd() - .5) * T.gust * 4 * dt - s.gustV * dt; s.al += (s.gustV + (I.mv[1] < -.3 ? 40 : I.mv[1] > .3 ? -40 : 0)) * dt;
      s.al = clamp(s.al, -20, 70); s.wob += Math.abs(s.al - 12) * dt; s.wobN += dt;
      const cl = T.cL0 * Math.max(.1, 1 - Math.pow((s.al - 12) / 30, 2)) * (rocket ? 1.04 : 1), cd = T.cDBase + .00006 * Math.max(0, s.al);
      s.vx += (cl * sp * sp * -uz - cd * sp * sp * ux + (rocket ? .6 * ux : 0)) * dt;
      s.vz += (cl * sp * sp * ux - cd * sp * sp * uz - 9.81 + (rocket ? .6 * uz : 0)) * dt;
      s.x += s.vx * dt; s.z += s.vz * dt;
      const h = s.z - hillZ(s.x);
      if (I.A && h < 2.5 && s.teleT === undefined) s.teleT = s.air;
      if (h <= 0 && s.air > .15) landing(ctx);
    } else if (s.phase === 'out') {
      const sl = (hillZ(s.x + .5) - hillZ(s.x)) / .5, v = Math.max(0, s.slide - (s.x > 190 ? 9 : 2) * dt);
      s.slide = v; s.x += v * dt * Math.cos(Math.atan(sl)); s.z = hillZ(s.x);
      if (s.pt > (O.sandbox ? 0 : 1.2) && !s.cards) judge(ctx);
      if (s.cards && (s.pt > (O.sandbox ? 0 : 3.6) || (v < .5 && s.pt > 2.4))) s.phase = 'done';
    }
    if (!O.sandbox) animate(ctx, dt);
  },
  done: ctx => ctx.s.phase === 'done',
  perf: ctx => ctx.s.score,
  attemptInfo: ctx => ({ d: ctx.s.d, crash: ctx.s.crash, tele: ctx.s.tele, cards: ctx.s.cards }),
  bot(ctx, a, dt) {
    const s = ctx.s, I = O.blankIntent(), bs = a.bs, perfect = a.cheat === 'perfect';
    if (!s || s.a !== a) return I;
    if (bs.r === undefined) { bs.r = ctx.rng('bot:' + a.id); bs.al = perfect ? 12 : 12 + O.gauss(bs.r) * (1 - a.skill) * 15; bs.press = perfect ? .5 : lerp(3.6, .6, a.skill) + (bs.r() - .5) * .8; bs.tele = perfect || bs.r() < a.skill; bs.noise = perfect ? 0 : (1 - a.skill) * .5; }
    if (s.phase === 'gate') { if (s.pt > .6) I.A = true; return I; }
    if (s.phase === 'inrun') { const b = s.bal.b + O.gauss(bs.r) * bs.noise * .3; I.mv = [0, -clamp(b * 3 + s.bal.v * 1, -1, 1)]; if (95 - s.u <= bs.press) I.A = true; if (a.hype >= 1 && 95 - s.u < 10) I.T = true; return I; }
    if (s.phase === 'air') {
      const err = s.al - bs.al; I.mv = [0, err > 2 ? .8 : err < -2 ? -.8 : 0];
      const h = s.z - hillZ(s.x), vrel = -(s.vz - (hillZ(s.x + .2) - hillZ(s.x)) / .2 * s.vx), tHit = h / Math.max(.1, vrel);
      if (bs.tele && tHit < .2 && h < 2.5) I.A = true;
      if (a.hype >= 1) I.T = true;
    }
    return I;
  },
  cam(ctx, dt) {
    const s = ctx.s; let tx = 0, tz = 0;
    if (s) { if (s.phase === 'gate' || s.phase === 'inrun') { const [x, z] = inAt(s.u); tx = x * M + 60; tz = z * M - 10; } else { tx = s.x * M + 70; tz = s.z * M + 10; } }
    const w = ctx.w; w.cx = w.cx === undefined ? tx : w.cx + (tx - w.cx) * Math.min(1, dt * 6); w.cz = w.cz === undefined ? tz : w.cz + (tz - w.cz) * Math.min(1, dt * 6);
    game.focus(w.cx, 0, w.cz);
  },
  draw(ctx, r) {
    const s = ctx.s, g = r.ctx, t = game.real;
    game.lights.enabled = true; game.lights.ambient = .5;
    if (!BG) BG = new E.Backdrop({ sky: ['#04061a', '#0e1640', '#2a3a7a'], stars: true, starsY: .8, moon: true, layers: [{ kind: 'mountains', color: '#1e2a5a', y: .55, height: .35, parallax: .05 }, { kind: 'mountains', color: '#2a3a72', y: .65, height: .25, parallax: .1 }, { kind: 'forest', color: '#0e1a2e', y: .8, height: .12, parallax: .2 }] });
    BG.draw(r);
    // the in-run tower and track, the landing hill with K/HS lines and boards, the out-run crowd
    const g0 = inAt(0); r.queue(g0[0] * M - 20, 6, 0, gg => { const b = r.w(g0[0] * M - 30, 0, -30 * M), tp = r.w(g0[0] * M - 30, 0, g0[1] * M + 40); px.rect(gg, b[0], tp[1], 36, b[1] - tp[1], '#3a4060'); for (let k = 0; k < 8; k++) px.rect(gg, b[0] + 4, tp[1] + 10 + k * 30, 28, 2, '#5a6080'); }, { bias: -200 });
    const pts = IN.filter((p, i) => i % 4 === 0).map(p => r.w(p[1] * M, 0, p[2] * M)), under = IN.filter((p, i) => i % 4 === 0).map(p => r.w(p[1] * M, 0, p[2] * M - 18));
    px.poly(g, pts.concat(under.reverse()), '#5a6080'); for (let i = 1; i < pts.length; i++) px.line(g, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], '#e8f0fb', 2);
    for (let i = 0; i < pts.length; i += 3) { const p = pts[i]; px.rect(g, p[0], p[1], 1, 30, '#3a4060'); }
    const hp = []; for (let x = 0; x <= 260; x += 2) hp.push(r.w(x * M, 0, hillZ(x) * M)); hp.push([hp[hp.length - 1][0], r.bh + 400], [hp[0][0], r.bh + 400]); px.poly(g, hp, '#e8f0fb');
    for (let x = 4; x <= 250; x += 4) { const p = r.w(x * M, 0, hillZ(x) * M); px.dot(g, p[0], p[1] + 2, '#c8d4ec'); if ((x * 7) % 3 === 0) px.dot(g, p[0] + 2, p[1] + 8, '#ffffff'); }
    for (let d = 50; d <= 150; d += 10) { const x = xAtArc(d), p = r.w(x * M, 0, hillZ(x) * M); px.rect(g, p[0] - 1, p[1] - 14, 2, 14, '#3a4060'); px.rect(g, p[0] - 9, p[1] - 22, 18, 9, d === K ? '#e23b2e' : d === HS ? '#2f7fe0' : '#ffffff'); E.font.text(g, String(d), p[0] - 7, p[1] - 20, d === K || d === HS ? '#ffffff' : '#14182e', { font: 'tiny', outline: false }); }
    for (const [d, c] of [[K, '#e23b2e'], [HS, '#2f7fe0']]) { const x = xAtArc(d), a0 = r.w(x * M, 0, hillZ(x) * M); px.line(g, a0[0] - 8, a0[1] + 4, a0[0] + 8, a0[1] - 4, c, 2); }
    // floodlights along the hill
    for (let k = 0; k < 9; k++) { const x = -60 + k * 30, z = (x < 0 ? inAt(clamp(95 + x / Math.cos(35 * DEG), 0, 95))[1] : hillZ(x)) + 14; const p = r.w(x * M, 0, z * M); px.rect(g, p[0], p[1], 2, 20, '#5a6080'); px.rect(g, p[0] - 4, p[1] - 3, 10, 4, '#fff6c8'); game.lights.add(x * M, 0, z * M, 140, .7, { color: '#fff2c8' }); r.glowDisc(g, p[0] + 1, p[1] - 1, 12, '#fff2c8', .5); }
    // the out-run crowd with flags and cowbells
    const ox = r.w(200 * M, 0, 0)[0], oz = r.w(0, 0, hillZ(200) * M)[1]; if (ox < r.bw + 50) { Art.crowd(g, ox - 20, oz - 34, 500, 30, { seed: 77, level: O.Crowd.level, bg: '#1a2040', dark: false }); px.rect(g, ox - 20, oz - 6, 500, 4, '#c8ccd8'); }
    if (!s) return;
    const a = s.a, [ix, iz] = s.phase === 'gate' || s.phase === 'inrun' ? inAt(s.u) : [s.x, s.z];
    const wx = ix * M, wz = iz * M;
    r.actor(wx, 0, wz, (gg, ox2, oy2) => { a.rig.draw(gg, ox2, oy2, r.view); skis(gg, a.rig, r.view, ox2, oy2, s, a); }, { ghost: a.turboT > 0 ? { color: '#ff9a1a', life: .2, alpha: .5, owner: a.rig } : undefined });
    if (a.turboT > 0 && !O.sandbox) game.particles.fire(wx - 10, 0, wz + 2, 2, { size: 4 });
    if (s.phase === 'air') r.textAt(wx, 0, wz + 52, Math.max(0, arcAt(Math.max(0, s.x))).toFixed(1) + ' m', '#ffffff');
    if (s.land) { const p = s.land; r.queue(p[0] * M, 0, p[1] * M, gg => { const q = r.w(p[0] * M, 0, p[1] * M); px.rect(gg, q[0] - 1, q[1] - 6, 2, 6, '#e23b2e'); }); }
  },
  hud(ctx, r, g) {
    const s = ctx.s, W = r.W, H = r.H; if (!s) return; const a = s.a;
    if (s.phase === 'gate') { UI.text(g, 'ON THE BAR', W / 2 - UI.tw('ON THE BAR', 3) / 2, 50, '#ffffff', { scale: 3 }); if (a.human) O.Prompt.draw(g, W / 2, 82, 'action', { inp: a.inp, label: 'PUSH OFF', align: 'center', size: 2 }); }
    if (s.phase === 'inrun') {
      const kmh = Math.round(s.v * 3.6); E.font.text(g, kmh + ' KM/H', W - 14 - E.font.width(kmh + ' KM/H', { scale: 3 }), 10, '#ffe066', { scale: 3, shadow: '#000', outline: '#0b0814' });
      s.bal.draw(g, W / 2, H - 60, 180, { label: 'KEEP THE TUCK', safe: .4 }); if (a.human) O.Prompt.draw(g, W / 2 - 110, H - 66, 'moveV', { inp: a.inp });
      const toEdge = 95 - s.u, zw = 120, zx = W / 2 - zw / 2, zy = H - 86; px.rect(g, zx, zy, zw, 8, '#2a2f55'); px.rect(g, zx + zw - zw * 4 / 6, zy, zw * 1.5 / 6, 8, '#a8701a'); px.rect(g, zx + zw - zw * 2.5 / 6, zy, zw * 1.5 / 6, 8, '#f2b632'); px.rect(g, zx + zw - zw * 1 / 6, zy, zw / 6, 8, '#4fe0a8');
      const mk = clamp(1 - toEdge / 6, 0, 1); px.rect(g, Math.round(zx + mk * zw) - 1, zy - 3, 3, 14, '#ffffff'); UI.text(g, 'TAKE-OFF', zx, zy - 11, '#ffffff');
      if (a.human && toEdge < 8) O.Prompt.draw(g, W / 2, zy - 26, 'action', { inp: a.inp, label: 'JUMP!', pulse: toEdge < 4, align: 'center', size: 2 });
    }
    if (s.phase === 'air') {
      const gx = W - 70, gy = 70; UI.panel(g, gx - 44, gy - 30, 88, 72, { alpha: .8, title: 'BODY ANGLE' });
      for (let d = -20; d <= 70; d += 3) { const c = Math.abs(d - 12) < 6 ? '#4fe0a8' : Math.abs(d - 12) < 15 ? '#f2b632' : d > ctx.T.crashAngle - 3 ? '#e23b2e' : '#5a2a2a'; const an = (-90 + d) * DEG; px.rect(g, Math.round(gx + Math.cos(an) * 26), Math.round(gy + 14 + Math.sin(an) * 26), 2, 2, c); }
      const an = (-90 + s.al) * DEG; px.line(g, gx, gy + 14, Math.round(gx + Math.cos(an) * 22), Math.round(gy + 14 + Math.sin(an) * 22), '#ffffff', 2);
      UI.text(g, Math.round(s.al) + '°', gx - 10, gy + 26, '#ffffff');
      const h = s.z - hillZ(s.x); if (h < 4 && a.human) O.Prompt.draw(g, W / 2, 60, 'action', { inp: a.inp, label: 'TELEMARK!', pulse: true, align: 'center', size: 2, color: '#ffe066' });
      if (a.human) O.Prompt.draw(g, 12, H - 22, 'moveV', { inp: a.inp, label: 'LEAN (GREEN = LIFT)' });
    }
    if (s.d != null && s.phase === 'out') {
      E.font.text(g, s.d.toFixed(1) + ' m', W / 2 - E.font.width(s.d.toFixed(1) + ' m', { scale: 4 }) / 2, 44, s.d > K ? '#4fe0a8' : '#ffffff', { scale: 4, shadow: '#000', outline: '#0b0814' });
      const lab = s.crash ? 'CRASH!' : s.tele ? 'TELEMARK!' : 'TWO-FOOTED'; UI.text(g, lab, W / 2 - UI.tw(lab, 2) / 2, 80, s.crash ? '#ff6b6b' : s.tele ? '#4fe0a8' : '#ffe066', { scale: 2 });
      if (s.cards) { s.cards.forEach((c, i) => { const x = Math.round(W / 2 - 75 + i * 30), y = 100; px.rect(g, x, y, 26, 18, s.drop.includes(i) ? '#5a6080' : '#ffffff'); E.font.text(g, c.toFixed(1), x + 3, y + 6, '#14182e', { outline: false }); }); UI.text(g, (s.distPts).toFixed(1) + ' + ' + s.style.toFixed(1) + ' = ' + s.score.toFixed(1), W / 2 - UI.tw((s.distPts).toFixed(1) + ' + ' + s.style.toFixed(1) + ' = ' + s.score.toFixed(1), 2) / 2, 124, '#ffe066', { scale: 2 }); }
    }
    O.HUD.flame(g, 12, 50, a);
    if (ctx.humans.length && ctx.meet.mode !== 'attract') O.HUD.board(g, ctx, 10, 66, 3, { w: 140 });
  }
});
function skis(g, rig, v, ox, oy, s, a) {
  const J = rig.J; let ang;
  if (s.phase === 'gate' || s.phase === 'inrun') ang = -inAt(s.u)[2] * DEG;
  else if (s.phase === 'air') ang = Math.atan2(s.vz, s.vx) + (s.al - 12) * DEG * .6;
  else { const sl = (hillZ(s.x + .5) - hillZ(s.x)) / .5; ang = Math.atan(sl); }
  const c = O.Records.golden(a.nation, 'skijump') ? '#f2c94c' : O.nation(a.nation).colors.b;
  for (const f of [J.footL, J.footR]) { if (!f) continue; const w = rig.worldOffset(f), p = O.Gear.wp(v, ox, oy, w); if (s.crash && s.phase === 'out') continue; const L = 20, dx = Math.cos(ang) * L * 1.5, dy = -Math.sin(ang) * L * 1.5; px.line(g, Math.round(p[0] - dx * .35), Math.round(p[1] - dy * .35), Math.round(p[0] + dx * .65), Math.round(p[1] + dy * .65), c, 2); }
}
function takeoff(ctx) {
  const s = ctx.s, a = s.a, T = ctx.T, [, , th] = inAt(95);
  const p = s.press === null && O.god(a) ? .8 : s.press; s.q = p === null ? .1 : p <= 1 ? 1 : p <= 2.5 ? .7 : .4;
  s.phase = 'air'; s.pt = 0; s.x = 0; s.z = 0;
  s.vx = s.v * Math.cos(th * DEG); s.vz = -s.v * Math.sin(th * DEG) + T.takeoffBoost * s.q;
  s.al = 32 + (1 - s.q) * 10;
  if (p === null) { ctx.yikes(a, 'table'); } else { ctx.sfx('whoosh'); if (s.q >= 1) ctx.hype(a, .25); }
  ctx.cue('fly', { a }, { cool: 5 });
}
function landing(ctx) {
  const s = ctx.s, a = s.a, T = ctx.T;
  s.z = hillZ(s.x); s.d = +arcAt(s.x).toFixed(1); s.land = [s.x, s.z];
  const teleOk = s.teleT !== undefined && s.air - s.teleT <= T.telemarkWindow;
  s.tele = teleOk || O.god(a); s.crash = !O.god(a) && s.al > T.crashAngle || s.al < -12 || (s.d > HS + 10 && !teleOk);
  const sl = Math.atan((hillZ(s.x + .5) - hillZ(s.x)) / .5); s.slide = Math.max(8, Math.hypot(s.vx, s.vz) * Math.cos(Math.atan2(s.vz, s.vx) - sl) * .9);
  s.phase = 'out'; s.pt = 0;
  if (s.crash) { ctx.yikes(a, 'crash'); ctx.sfx('crunch'); ctx.fx(P => { P.dust(s.x * M, 0, s.z * M, 18, { color: '#ffffff', size: 2.5 }); P.bits(s.x * M, 0, s.z * M + 6, 6, ['#e23b2e', '#ffffff']); }); }
  else { ctx.sfx('crunch'); ctx.fx(P => P.dust(s.x * M, 0, s.z * M, 8, { color: '#ffffff', size: 2 })); if (s.tele) ctx.cue('telemark', { a }); if (s.d > K) { ctx.cue('far', { a }, { prio: 3 }); ctx.hype(a, .2); } }
  if (!O.sandbox) { O.Crowd.bump(clamp(s.d / 140, .3, 1)); for (let i = 0; i < 3; i++) game.after(i * .2, () => game.audio.sfx('cowbell', { vol: .5 })); if (s.d > K) O.CrowdAudio.cheer(); }
}
function judge(ctx) {
  const s = ctx.s, a = s.a, rnd = ctx.rng('style:' + a.id), wob = s.wobN ? s.wob / s.wobN : 10;
  const base = s.crash ? 7.5 : s.tele ? 18.5 : 16, spread = s.crash ? 1.5 : 1;
  s.cards = [0, 1, 2, 3, 4].map(() => +(clamp(Math.round((base + (rnd() - .5) * spread - clamp((wob - 4) * .06, 0, 2)) * 2) / 2, 0, 20)).toFixed(1));
  const order = s.cards.map((c, i) => [c, i]).sort((x, y) => x[0] - y[0]); s.drop = [order[0][1], order[4][1]];
  s.style = order.slice(1, 4).reduce((m, x) => m + x[0], 0); s.distPts = 60 + (s.d - K) * 1.8; s.score = +Math.max(0, s.distPts + s.style).toFixed(1);
  if (!O.sandbox) game.audio.sfx('judge');
}
function animate(ctx, dt) {
  const s = ctx.s, a = s.a, rig = a.rig;
  let st;
  if (s.phase === 'gate' || s.phase === 'inrun') { const [x, z, th] = inAt(s.u); st = { x: x * M, y: 0, z: z * M, facing: 0, vx: 0, vy: 0 }; O.Pose.set(rig, s.phase === 'gate' ? 'skiStand' : 'skiTuck'); O.Pose.rot(rig, s.phase === 'gate' ? 0 : th * DEG * .3, 0); }
  else if (s.phase === 'air') { st = { x: s.x * M, y: 0, z: s.z * M, facing: 0, vx: 0, vy: 0 }; O.Pose.set(rig, 'skiFlight'); const path = -Math.atan2(s.vz, s.vx); O.Pose.rot(rig, clamp(Math.PI / 2 - (s.al) * DEG - path * .2 - .15, .2, 1.45), 0, [0, 0, 2]); }
  else { st = { x: s.x * M, y: 0, z: s.z * M, facing: 0, vx: s.slide * M, vy: 0 }; O.Pose.rot(rig, 0, 0); if (s.crash) { O.Pose.clear(rig, { snap: true }); st.vx = 0; st.flip = s.pt < .6 ? (s.pt / .6) : 0; st.down = s.pt >= .6 ? 1 : 0; } else { O.Pose.set(rig, s.tele && s.pt < 1.2 ? 'telemark' : 'skiStand'); if (s.pt > 1.6) { O.Pose.clear(rig); st.pose = 'cheer'; st.vx = 0; } } }
  rig.update(dt, st);
}
})();
