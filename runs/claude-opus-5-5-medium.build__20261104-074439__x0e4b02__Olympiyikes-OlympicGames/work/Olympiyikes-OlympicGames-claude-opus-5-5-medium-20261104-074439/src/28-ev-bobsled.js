/* OLYMPIYIKES! — Glory Ice Track and the TWO-MAN BOBSLED (§6.9): push, load in the zone, ride the groove through 15 named curves. */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, clamp = E.clamp, D2R = Math.PI / 180;
const U = 100, SEG = 200;
const ICE = { road: ['#d8eef8', '#cfe6f2'], grass: ['#3a4a6a', '#34445e'], rumble: ['#e8f4ff', '#a8c8e8'], lane: null };
const COVER = { road: ['#b8d4e8', '#a8c8e0'], grass: ['#1a2238', '#161e30'], rumble: ['#c8e0f4', '#98b8d8'], lane: null };
// [name, meters, slope°, curve, tunnel]
const TRACK = [['START', 50, 4, 0], ['SUNNY START', 60, 8, 0], ['GLORY KINK', 70, 9, 2.5], ['THE TWINS', 90, 9, [-3, 3]], ['SHARK FIN', 70, 10, -4], ['KREISEL', 130, 8, 6, true],
  ['LABYRINTH', 140, 9, [3, -3, 3]], ['OMEGA', 130, 10, [6, -6]], ['THE WASHING MACHINE', 90, 9, -4.5], ['DOUBLE TROUBLE', 100, 8, [3.5, 3.5]], ['LAST GASP', 90, 8, -3], ['FINISH CURVE', 100, 6, 2.5], ['FINISH', 180, 3, 0]];
const B = O.Bob = { secs: [], len: 0, road: null };
(function build() {
  const road = B.road = new E.Road({ segment: SEG, lanes: 0, draw: 200, width: 520, fog: null, colors: ICE });
  let s = 0;
  for (const [name, len, slope, curve, tunnel] of TRACK) {
    B.secs.push({ name, s0: s, s1: s + len, slope });
    const parts = Array.isArray(curve) ? curve : [curve], n = Math.round(len / 2 / parts.length);
    for (const cv of parts) road.add(n, { curve: cv, hill: -n * 2 * Math.tan(slope * D2R) * U * .5, tunnel: !!tunnel, colors: tunnel ? COVER : ICE });
    if (name !== 'START' && name !== 'FINISH') road.place((s + 6) * U, 1.6, sign(name), 1);
    s += len;
  }
  B.len = s - 130;   // the finish line, then the braking zone
  for (let z = 0; z < s * U; z += SEG * 6) { const sd = (z / SEG / 6) % 2 ? 1 : -1; road.place(z, sd * 2.4, lamp(), 1); }
  road.place(B.len * U, 0, banner('FINISH', '#e8443a'), 1); road.place(50 * U, 0, banner('50 M', '#2a5ab8'), 1);
})();
function sign(t) { return { w: 100, draw(g, x, y, s) { const W = 900 * s; if (W < 3) return; px.rect(g, x - W / 2, y - W * .9, W, W * .3, '#1a2050'); if (W > 40) E.font.text(g, t, Math.round(x), Math.round(y - W * .86), '#ffd060', { align: 'center', outline: false, font: W > 120 ? 'normal' : 'tiny' }); } }; }
function lamp() { return { w: 50, draw(g, x, y, s) { const H = 2400 * s; if (H < 3) return; px.rect(g, x - Math.max(1, s * 30), y - H, Math.max(1, s * 60), H, '#3a3a4a'); px.blend(g, .35, 'add', () => px.disc(g, x, y - H, Math.max(2, s * 500), '#fff0c0')); px.disc(g, x, y - H, Math.max(1, s * 120), '#fff8e0'); } }; }
function banner(t, col) { return { w: 0, draw(g, x, y, s) { const W = 700 * s, H = 700 * s; if (W < 3) return; for (const sx of [-1, 1]) px.rect(g, x + sx * W - 15 * s, y - H, 30 * s, H, '#e0e0e8'); px.rect(g, x - W, y - H, W * 2, H * .22, col); if (W > 40) E.font.text(g, t, Math.round(x), Math.round(y - H * .95), '#ffffff', { align: 'center', outline: false }); } }; }
const secAt = s => B.secs.find(q => s >= q.s0 && s < q.s1) || B.secs[B.secs.length - 1];
const SKY = new E.Backdrop({ sky: ['#1a1440', '#7a3a6a', '#f08a5a'], sun: { x: .2, y: .5, r: 16, color: '#ffb070' }, layers: [{ kind: 'mountains', color: '#3a2a5a', y: .5, height: .25, parallax: .1 }, { kind: 'forest', color: '#1a1a34', y: .62, height: .1, parallax: .3 }] });

O.defEvent({
  id: 'bobsled', name: 'TWO-MAN BOBSLED', short: 'Bobsled', season: 'winter', venue: 'Glory Ice Track', pictogram: 'bobsled', music: 'icesurf', view: 'side', sport: 'bobsled',
  format: { type: 'attempts', rounds: 2, combine: 'sumTime', highlight: 'all' }, maxTime: 110, turbo: 'JET SLED!',
  measure: { better: 'lower', unit: 's', fmt: v => v.toFixed(2) + ' s', wr: [80.4, 'TRB', 'MAX OVERDRIVE'], qualify: { Easy: 92, Normal: 86, Hard: 82 } },
  points: t => 6.4 * Math.pow(Math.max(0, 120 - t), 1.4),
  tune: { pushGain: [6, 2, 12, .1, 'Push accel'], loadZone: [40, 30, 48, 1, 'Load zone start (m)'], drag: [.0011, 0, .006, .0001, 'Air drag'], curveForce: [1.25, .2, 3, .05, 'Curve force'],
    steerForce: [3.2, .5, 6, .05, 'Steer force'], grooveTolerance: [.4, .05, .8, .01, 'Groove tolerance'], flipHeight: [1.55, 1.1, 2.5, .01, 'Flip height'] },
  howto: { goal: 'Two runs. Lowest combined time wins.', rows: [['pair', 'PUSH: mash for the first 50 m'], [['action'], 'LOAD in the zone (40–50 m)'], [['move'], 'Steer: ride the glowing groove'], [null, 'Too high on the wall = FLIP!']] },
  yikesKinds: ['LATE LOAD!', 'FLIP!'],
  laurel: { id: 'icedancer', name: 'ICE DANCER', text: 'A run with no skid', test: (ctx, a) => a.S.skidT < .05 && a.lastPerf != null },
  hub: { ok: true, attempts: 1, seconds: 60 }, attract: { seconds: 20, after: 3, setup(ctx) { const s = ctx.cur.S; const sec = B.secs.find(q => q.name === 'LABYRINTH'); s.s = sec.s0 - 30; s.v = 33; s.loaded = true; s.t = 12; } },
  turnLabel: ctx => 'RUN ' + (ctx.cur.attempts.length + 1) + ' OF ' + ctx.rounds,
  phases: [['push', ctx => { const s = ctx.cur.S; s.s = 0; s.v = 0; s.loaded = false; }], ['kreisel', ctx => { const s = ctx.cur.S; s.s = B.secs[5].s0 - 10; s.v = 30; s.loaded = true; }], ['omega', ctx => { const s = ctx.cur.S; s.s = B.secs[7].s0 - 10; s.v = 32; s.loaded = true; }]],
  build(ctx) { ctx.S.best = null; },
  start(ctx) {
    const a = ctx.cur, sk = ctx.skill(a);
    a.S = { s: 0, v: 0, x: 0, xv: 0, loaded: false, t: 0, flipT: 0, skidT: 0, skidding: false, done: false, endT: 0, pushT: 0, start50: null, sk, rng: ctx.rng('n'), ghost: [], steer: 0 };
    a.S.ghostLeader = ctx.S.bestRun || null;
  },
  bot(ctx, a, dt, I) {
    const s = a.S, perfect = a.pilot.cheat === 'perfect', sk = perfect ? 1 : s.sk;
    if (!s.loaded) { O.botMash(a, perfect ? 12 : 7 + 4 * sk, dt, I); if (s.s >= (perfect ? 44 : 41 + (1 - sk) * 12 * s.rng())) I.A = true; return I; }
    const gr = groove(ctx, a), noise = (E.noise2(s.t * .5, 4.4) - .5) * (1 - sk) * .9;
    const T = ctx.T, cv = B.road.curveAt(s.s * U), F = T.curveForce * cv * Math.pow(s.v / 30, 2) * .35 - (Math.abs(gr) > .6 ? Math.sign(gr) * (Math.abs(gr) - .6) * 1.4 : 0);
    I.mv = [clamp(F / T.steerForce + (s.x - gr - noise) * 3 + s.xv * 1.2, -1, 1), 0];
    if (a.hype >= 1 && s.s > 200) I.T = true;
    return I;
  },
  step(ctx, dt) {
    const T = ctx.T, g = 9.81;
    for (const a of ctx.active) {
      const s = a.S, I = a.I;
      if (s.done) { s.endT += dt; s.v = Math.max(0, s.v - 12 * dt); s.s += s.v * dt; continue; }
      s.t += dt;
      if (!s.loaded) {
        const pw = a.mash.power(); s.pw = pw;
        s.v += T.pushGain * pw * (1 - s.v / 11) * dt; s.s += s.v * dt;
        if (I.A) { s.loaded = true; const early = s.s < T.loadZone; if (early) s.v *= .95; else ctx.hype(a, .15); ctx.fx.sfx('clank'); if (a.human) ctx.fx.banner(early ? 'EARLY LOAD' : 'CLEAN LOAD!', { y: .25, life: 1, scale: 2 }); }
        else if (s.s >= 50) { s.loaded = true; s.v = Math.max(0, s.v - 1.5); if (!ctx.god(a)) ctx.yikes(a, 'LATE LOAD!', 'lateload'); }
        if (s.s >= 50 && s.start50 == null) s.start50 = s.t;
        continue;
      }
      if (s.start50 == null && s.s >= 50) s.start50 = s.t;
      if (s.flipT > 0) { s.flipT -= dt; s.s += s.v * dt; s.v = Math.max(8, s.v - 3 * dt); if (s.flipT <= 0) { s.x = 0; s.xv = 0; s.v *= .65; } continue; }
      const sec = secAt(s.s), cv = B.road.curveAt(s.s * U), jet = a.turboT > 0;
      s.steer = I.mv[0];
      const gr = groove(ctx, a);
      // lateral: the bend throws the sled up the wall; steering pulls it down; the wall's slope pushes back
      const ax = T.curveForce * cv * Math.pow(s.v / 30, 2) * .35 - s.steer * T.steerForce - 3.2 * s.xv - (Math.abs(s.x) > .6 ? Math.sign(s.x) * (Math.abs(s.x) - .6) * 1.4 : 0);
      s.xv += ax * dt; s.x += s.xv * dt;
      if (jet) { s.x += (gr - s.x) * Math.min(1, dt * 6); }
      const off = Math.abs(s.x - gr);
      s.skidding = off > T.grooveTolerance && s.v > 10;
      const scrape = s.skidding ? s.v * .02 : 0; if (s.skidding) s.skidT += dt;
      s.v += (g * Math.sin((sec.slope + 4) * D2R) - T.drag * s.v * s.v - .006 * g - scrape) * dt;
      const s0 = s.s; s.s += s.v * ctx.turboMult(a, 1.15) * dt;
      if (Math.abs(s.x) > T.flipHeight && !ctx.god(a)) { s.flipT = 2; ctx.yikes(a, 'FLIP!', 'flip'); ctx.fx.sfx('scrape'); ctx.fx.slowmo(.5, 1); ctx.fx.say('bobsled'); }
      if (ctx.god(a)) s.x = clamp(s.x, -1.4, 1.4);
      if (s.skidding && !ctx.fast && Math.floor(s.t * 8) !== Math.floor((s.t - dt) * 8)) ctx.fx.sfx('scrape', { vol: .3 });
      if (s.s >= B.len) { const frac = (B.len - s0) / Math.max(1e-6, s.s - s0); s.done = true; ctx.finish(a, Math.round((s.t - dt + frac * dt) * 100) / 100); ctx.fx.sfx('cheerSwell'); O.Crowd.excite(.7); }
      if (!ctx.sandbox && Math.floor(s.t * 10) !== Math.floor((s.t - dt) * 10)) s.ghost.push([s.t, s.s, s.x]);
    }
    if (!ctx.sandbox) for (const a of ctx.active) animate(ctx, a, dt);
  },
  done(ctx) { return ctx.active.every(a => a.fin && (a.S.endT > 2 || ctx.fast)); },
  perf(ctx, a) { return a.cur === undefined ? null : a.cur; },
  post(ctx) { const a = ctx.cur; if (a && a.lastPerf != null && (ctx.S.best == null || a.lastPerf < ctx.S.best)) { ctx.S.best = a.lastPerf; ctx.S.bestRun = a.S.ghost.slice(); } },
  camera() {},
  draw(ctx, r) {
    const a = ctx.cur, s = a && a.S && a.S.s !== undefined ? a.S : { s: 0, x: 0 };
    B.road.o.sky = SKY;
    const H = 700, z = Math.max(0, s.s * U - B.road.ahead(H) * 1.8), cars = [];
    if (s.ghostLeader && s.t) { const gs = O.ghostAtRun(s.ghostLeader, s.t); if (gs) cars.push({ z: gs[0] * U, x: gs[1] * .6, w: 160, draw: ghostSled }); }
    if (ctx.hub && O.Hub) for (const gh of O.Hub.ghostList(ctx)) cars.push({ z: gh.s[0], x: gh.s[1] * .6, w: 160, col: gh.color, draw: ghostSled });
    B.road.draw(r, { z, x: s.x * .6, h: H, turn: 0, cars });
    r.overlay(g => {
      if (!a || !a.rig || a.S.s === undefined) return;
      const p = B.road.project(s.s * U, s.x * .6, 0); if (!p) return;
      const sc = Math.max(.6, r.H / 200), tilt = s.flipT > 0 ? Math.PI * Math.min(1, (2 - s.flipT) * 3) : -s.x * .5;
      drawSled(g, a, p[0], p[1], sc, tilt, s);
      if (s.skidding) for (let i = 0; i < 3; i++) px.rect(g, p[0] + (i - 1) * 14 * sc + Math.sin(game.real * 40 + i) * 4, p[1] - 2, 2, 2, '#ffd060');
      if (a.turboT > 0) for (let i = 0; i < 6; i++) px.disc(g, p[0] + Math.sin(game.real * 30 + i) * 3, p[1] + 4 + i * 3 * sc, (6 - i) * sc, i < 2 ? '#ffffff' : i < 4 ? '#ffd060' : '#ff6a1a');
      // the U-shaped cross-section gauge with the groove
      const cx = r.W - 70, cy = r.H - 34, R = 40;
      for (let t = 0; t <= 40; t++) { const an = Math.PI * t / 40; px.rect(g, Math.round(cx - Math.cos(an) * R), Math.round(cy - 10 + Math.sin(an) * 18), 2, 2, '#c8e4f8'); }
      const gx = groove(ctx, a); px.blend(g, .5, 'add', () => px.disc(g, cx + clamp(gx / 1.6, -1, 1) * R, cy - 10 + Math.sqrt(Math.max(0, 1 - Math.pow(clamp(gx / 1.6, -1, 1), 2))) * 18, 6, '#4fe0a8'));
      const k = clamp(s.x / 1.6, -1, 1); px.disc(g, cx + k * R, cy - 10 + Math.sqrt(Math.max(0, 1 - k * k)) * 18, 3, s.skidding ? '#ff6b6b' : '#ffffff');
    });
  },
  hud(ctx, r, g) {
    const a = ctx.cur; O.HUD.header(g, r, ctx, a && a.S.s !== undefined ? secAt(a.S.s).name : '');
    if (!a || !a.S || a.S.s === undefined) return;
    const s = a.S;
    O.HUD.big(g, r.W - 14, 10, s.t.toFixed(2));
    O.text(g, Math.round(s.v * 3.6) + ' KM/H', r.W - 14, 30, '#ffffff', { align: 'right', scale: 2 });
    if (s.start50 != null) O.text(g, 'START ' + s.start50.toFixed(2), r.W - 14, 50, '#c8d0f0', { align: 'right' });
    const tot = a.attempts.length ? a.attempts[0] : null; if (tot != null) O.text(g, 'RUN 1 ' + tot.toFixed(2), r.W - 14, 62, '#9aa2c8', { align: 'right' });
    if (a.human) {
      O.HUD.flame(g, 14, r.H - 44, a, a.input);
      if (!s.loaded) {
        O.HUD.power(g, r.W / 2 - 60, r.H - 30, 120, s.pw || 0); O.Prompt.pair(g, r.W / 2 - 30, r.H - 48, { input: a.input, label: 'PUSH!', phase: a.mash.last === 'L' ? 1 : 0 });
        const w = 200, x = r.W / 2 - w / 2, y = r.H - 60; px.rect(g, x, y, w, 5, '#2a3060'); px.rect(g, x + w * ctx.T.loadZone / 50, y, w * (50 - ctx.T.loadZone) / 50, 5, s.s > ctx.T.loadZone && Math.floor(game.real * 6) % 2 ? '#ffffff' : '#4fe0a8'); px.rect(g, x + w * Math.min(1, s.s / 50) - 1, y - 2, 3, 9, '#ffd060');
        if (s.s > ctx.T.loadZone - 4) O.Prompt.draw(g, r.W / 2, r.H * .3, 'action', { input: a.input, label: 'LOAD!', align: 'center', size: 2, color: '#ffd060' });
      } else if (game.settings.hints && s.skidding) O.Prompt.draw(g, 34, r.H - 30, 'move', { input: a.input, label: 'BACK TO THE GROOVE', color: '#ff6b6b' });
    }
  },
  ghostState(ctx, a) { const s = a.S; return [(s.s || 0) * U, s.x || 0, 0, 0, 9]; },
  ghostDraw() { return null; }
});
function groove(ctx, a) { const s = a.S, cv = (B.road.curveAt(s.s * U) + B.road.curveAt(s.s * U + 500) + B.road.curveAt(s.s * U + 1000) + B.road.curveAt(s.s * U - 500)) / 4; return clamp(cv * Math.pow(s.v / 30, 2) * .16, -1.15, 1.15); }
function drawSled(g, a, sx, sy, sc, tilt, s) {
  const c = a.nat.colors, W = 34 * sc, H = 16 * sc, ca = Math.cos(tilt), sa = Math.sin(tilt);
  const P = (x, y) => [sx + x * ca - y * sa, sy - (x * sa + y * ca)];
  px.blend(g, .35, 'normal', () => px.ell(g, sx, sy, W * .6, 3 * sc, '#141e3c'));
  if (s.loaded && s.flipT <= 0 && a.rig) { const k = a.rig; O.drawRear(g, k, sx + sa * 10 * sc, sy - H * .7, sc * .8); }
  px.poly(g, [P(-W / 2, 0), P(W / 2, 0), P(W / 2 - 3 * sc, H * .8), P(-W / 2 + 3 * sc, H * .8)], c.a === '#f4f8ff' ? '#d8e0ec' : c.a);
  px.poly(g, [P(-W / 2 + 4 * sc, H * .55), P(W / 2 - 4 * sc, H * .55), P(W / 2 - 6 * sc, H * .8), P(-W / 2 + 6 * sc, H * .8)], c.b);
  const n = P(0, H * .3); E.font.text(g, a.nat.id, Math.round(n[0]), Math.round(n[1] - 4), c.c === '#ffffff' ? '#ffffff' : c.c, { align: 'center', outline: false, font: 'tiny' });
  for (const k of [-1, 1]) { const r0 = P(k * W * .35, -1), r1 = P(k * W * .42, -1); px.line(g, r0[0], r0[1], r1[0], r1[1], '#c8ccd8', 2); }
  if (!s.loaded && a.rig) { const k = a.rig; O.drawRear(g, k, sx, sy + 2 * sc, sc * .9); }
}
function ghostSled(g, sx, sy, s) { const W = this.w * s * 4; if (W < 2) return; px.blend(g, .5, 'normal', () => { px.rect(g, sx - W / 2, sy - W * .35, W, W * .35, this.col || '#e8443a'); px.rect(g, sx - W * .3, sy - W * .55, W * .6, W * .2, '#ffffff'); }); }
function animate(ctx, a, dt) {
  const s = a.S, rig = a.rig;
  if (!s.loaded) { O.Pose.set(rig, 'bobPush'); rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, run: Math.min(1, s.v / 8) }); }
  else { O.Pose.set(rig, 'seated'); rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: s.done && s.endT > .5 ? 'cheer' : null }); }
}
})();
