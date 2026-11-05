/* OLYMPIYIKES! — 10m PLATFORM DIVING (§6.4): pick a dive, time the take-off, tuck / pike to rotate, open up for a rip entry. */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, M = 12, DEG = 180 / Math.PI;
const EDGE_X = 30, H10 = 10;
const DIVES = [
  { id: '105B', name: 'FORWARD 2½ PIKE', dd: 2.8, halves: 5, pos: 'pike', tier: 0 },
  { id: '205C', name: 'BACK 2½ TUCK', dd: 3.0, halves: 5, pos: 'tuck', tier: 0, back: true },
  { id: '107C', name: 'FORWARD 3½ TUCK', dd: 3.3, halves: 7, pos: 'tuck', tier: 1 },
  { id: '407C', name: 'INWARD 3½ TUCK', dd: 3.2, halves: 7, pos: 'tuck', tier: 1 },
  { id: '5154B', name: 'FWD 2½ 2 TWISTS PIKE', dd: 3.6, halves: 5, pos: 'pike', twists: 4, tier: 1 },
  { id: 'YIKES', name: 'YIKES! ARMSTAND QUINTUPLE', dd: 4.8, halves: 10, pos: 'tuck', tier: 2, spin: 1.6, armstand: true }
];
O.DIVES = DIVES;
const offers = (used) => { const pick = t => DIVES.filter(d => d.tier === t && !used.includes(d.id)); const e = pick(0), m = pick(1), h = pick(2); return [e[0] || DIVES[0], m[0] || m[1] || DIVES[2], h[0] || m[m.length - 1] || DIVES[4]].filter((d, i, arr) => arr.indexOf(d) === i); };
const wrapPi = a => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };

O.defEvent({
  id: 'diving', name: '10m PLATFORM', short: 'Diving', season: 'summer', venue: 'Splash Palace', pictogram: 'diving', music: 'diving', view: 'side', sport: 'diving', lights: .9,
  format: { type: 'attempts', rounds: 3, combine: 'sum' }, maxTime: 40, simDt: 1 / 120, turbo: 'SLOW-MO SUPREMACY!',
  measure: { better: 'higher', unit: 'pts', fmt: v => v.toFixed(2), wr: [338.4, 'BON', 'COCO BONBON'], qualify: { Easy: 150, Normal: 195, Hard: 240 } },
  points: v => 3.4 * v,
  tune: { tuckSpin: [12.5, 6, 20, .1, 'Tuck spin (rad/s)'], pikeSpin: [9, 4, 16, .1, 'Pike spin (rad/s)'], openSpin: [1.5, 0, 4, .1, 'Open spin (rad/s)'], takeoffVz: [4.2, 2, 7, .1, 'Take-off vz (m/s)'],
    ripTolerance: [8, 2, 20, 1, 'Rip tolerance (°)'], judgeNoise: [.5, 0, 1.5, .05, 'Judge noise'], twistTime: [.25, .1, .6, .01, 'Half-twist time (s)'] },
  howto: { goal: 'Three dives. Highest total wins.', rows: [[['action'], 'Take off on the gold'], [['mashL'], 'Hold: TUCK (fast spin)'], [['mashR'], 'Hold: PIKE (spin)'], [['move'], 'Tap ← →: half twists'], [null, 'Let go to open up: enter head-first, vertical']] },
  yikesKinds: ['BELLY FLOP!', 'BACK SLAP!'],
  laurel: { id: 'perfect10', name: 'PERFECT 10s', text: 'All five judges show 10', test: (ctx, a) => a.S.cards && a.S.cards.every(c => c >= 10) },
  hub: { ok: true, attempts: 2, seconds: 45 }, attract: { seconds: 15, after: 4, setup(ctx) { const a = ctx.cur; a.S.dive = DIVES[5]; a.S.phase = 'board'; } },
  turnLabel: ctx => 'DIVE ' + (ctx.cur.attempts.length + 1) + ' OF ' + ctx.rounds,
  phases: [['choose', ctx => { ctx.cur.S.phase = 'choose'; }], ['take-off', ctx => { const s = ctx.cur.S; s.dive = s.dive || DIVES[0]; s.phase = 'board'; }], ['flight', ctx => { const s = ctx.cur.S; s.dive = s.dive || DIVES[0]; launch(ctx, ctx.cur, .8); }]],
  noPopup: false,
  build(ctx) { for (const a of ctx.athletes) a.used = []; },
  start(ctx) {
    const a = ctx.cur; a.used = a.used || [];
    const offer = offers(a.used);
    a.S = { phase: a.human ? 'choose' : 'board', offer, sel: 0, dive: null, bar: new O.TimingBar({ hz: 1.4, zones: [{ from: .44, to: .56, name: 'PERFECT', q: 1 }, { from: .3, to: .7, name: 'GOOD', q: .6 }] }), q: 0, x: EDGE_X - 1, z: H10, vx: 0, vz: 0, th: 0, w: 0, pos: 'open', posT: { tuck: 0, pike: 0, open: 0 }, twists: 0, twT: 0, entered: false, score: null, cards: null, t: 0, slowT: 0, splash: 0 };
    if (!a.human) { const sk = ctx.skill(a); a.S.dive = a.pilot.cheat === 'perfect' ? (offer.find(d => d.tier === 2) || offer[offer.length - 1]) : sk > .8 ? offer[offer.length - 1] : sk > .6 ? offer[Math.min(1, offer.length - 1)] : offer[0]; a.S.botErr = a.pilot.cheat === 'perfect' ? 0 : O.gauss(ctx.rng('err')) * (1 - sk) * 35; }
  },
  bot(ctx, a, dt, I) {
    const s = a.S, T = ctx.T;
    if (s.botErr === undefined) { const sk = ctx.skill(a); s.botErr = a.pilot.cheat === 'perfect' ? 0 : O.gauss(ctx.rng('err')) * (1 - sk) * 35; }
    if (s.phase === 'choose') { const sk = ctx.skill(a); s.sel = Math.min(s.offer.length - 1, sk > .8 ? s.offer.length - 1 : sk > .6 ? 1 : 0); I.A = true; return I; }
    if (s.phase === 'board') { const tgt = a.pilot.cheat === 'perfect' ? .5 : .5 + (1 - ctx.skill(a)) * .25; if (Math.abs(s.bar.v - tgt) < .02 && s.bar.t > .3) I.A = true; return I; }
    if (s.phase === 'air') {
      const need = (s.dive.halves + (s.dive.armstand ? 1 : 0)) * Math.PI + s.botErr / DEG;
      // predicted time to the water if opened now
      const tw = (s.vz + Math.sqrt(s.vz * s.vz + 2 * 9.81 * Math.max(0, s.z))) / 9.81;
      const k = s.dive.spin || 1, open = T.openSpin * k, fast = (s.dive.pos === 'tuck' ? T.tuckSpin : T.pikeSpin) * k;
      const endOpen = s.th + open * tw, endHold = s.th + fast * dt + open * Math.max(0, tw - dt);
      if (Math.abs(endHold - need) < Math.abs(endOpen - need) && endOpen < need) { if (s.dive.pos === 'tuck') I.Lh = true; else I.Rh = true; }
      if (s.dive.twists && s.twists < s.dive.twists && s.twT <= 0 && s.th > Math.PI) I.right = true;
      if (a.hype >= 1) I.T = true;
    }
    return I;
  },
  step(ctx, dt) {
    const T = ctx.T;
    for (const a of ctx.active) {
      const s = a.S, I = a.I; s.t += dt;
      if (s.phase === 'choose') {
        if (I.left || I.up) s.sel = (s.sel + s.offer.length - 1) % s.offer.length; if (I.right || I.down) s.sel = (s.sel + 1) % s.offer.length;
        if (I.click) { const k = (s._rects || []).findIndex(R => O.hit(I.click, R)); if (k >= 0) { s.sel = k; I.A = true; } }
        if (I.A || s.t > 15) { s.dive = s.offer[s.sel]; s.phase = 'board'; s.bar.t = 0; ctx.fx.sfx('confirm'); }
        continue;
      }
      if (s.phase === 'board') { s.bar.update(dt); if (I.A || s.bar.t > 8) { const res = s.bar.t > 8 ? { q: .2 } : s.bar.press(); launch(ctx, a, res.q); if (a.human) ctx.fx.banner(res.zone || 'LATE', { y: .2, life: .8, scale: 2 }); } continue; }
      if (s.phase === 'air') {
        const slow = a.turboT > 0 ? .5 : 1, d = dt * slow;
        s.vz -= 9.81 * d; s.x += s.vx * d; s.z += s.vz * d;
        s.pos = I.Lh ? 'tuck' : I.Rh ? 'pike' : 'open';
        const spin = (s.pos === 'tuck' ? T.tuckSpin : s.pos === 'pike' ? T.pikeSpin : T.openSpin) * (s.dive.spin || 1);
        s.w = spin; s.th += spin * d; s.posT[s.pos] += d;
        if (s.twT > 0) s.twT -= d;
        if ((I.left || I.right) && s.twT <= 0 && s.pos !== 'tuck') { s.twists++; s.twT = T.twistTime; }
        if (s.z <= 0) enter(ctx, a);
        continue;
      }
      if (s.phase === 'water') { s.z = Math.max(-4, s.z - 6 * dt); s.splash += dt; if (s.splash > 1.6 && !s.scored) score(ctx, a); }
    }
    if (!ctx.sandbox) for (const a of ctx.active) animate(ctx, a, dt);
  },
  done(ctx) { return ctx.active.every(a => a.fin && (a.S.splash > 3 || ctx.fast)); },
  perf(ctx, a) { return a.cur === undefined ? null : a.cur; },
  camera(ctx) {
    const a = ctx.cur; if (!a || !a.S || a.S.x === undefined) { game.focus(EDGE_X * M, 0, 60); return; }
    const s = a.S; game.focus(s.x * M, 0, Math.max(30, s.z * M * .7 + 20)); game.setZoom(s.phase === 'air' || s.phase === 'water' ? 1.3 : 1.6);
  },
  draw(ctx, r) {
    r.sky(['#bfe8ff', '#e8f6ff', '#ffffff']);
    const W = 900;
    // the back wall, windows, stands
    r.queue(200, 40, 0, g => { const a0 = r.w(-300, 40, 0), t = r.w(-300, 40, 260); px.rect(g, 0, 0, r.W, a0[1], '#dfe6f0'); for (let k = 0; k < 8; k++) { const w0 = r.w(-260 + k * 140, 40, 230), w1 = r.w(-160 + k * 140, 40, 170); px.rect(g, w0[0], w0[1], w1[0] - w0[0], w1[1] - w0[1], '#86cff4'); px.rect(g, w0[0], w1[1] - 10, w1[0] - w0[0], 10, '#f0d890'); }
      const s0 = r.w(0, 40, 90)[1], s1 = r.w(0, 40, 10)[1]; const x0 = r.w(320, 40, 0)[0]; O.Art.crowd(g, x0, s0, r.W - x0, s1 - s0, O.Crowd.level, 11, ['#ff7fb8', '#1fa8a0', '#f2b632', '#3a7cf0', '#ffffff']); void t; }, { bias: -1000 });
    // the tower
    r.queue(0, 0, 0, g => { for (const [h, w] of [[1, 34], [3, 34], [5, 32], [7.5, 30], [10, 30]]) { const a0 = r.w(EDGE_X * M - w * M / 2 - 8, 0, h * M), b = r.w(EDGE_X * M, 0, h * M - 3); px.rect(g, a0[0], a0[1], b[0] - a0[0], b[1] - a0[1], '#c8ccd8'); px.rect(g, a0[0], a0[1], b[0] - a0[0], 1, '#ffffff'); } const base = r.w(EDGE_X * M - 260, 0, 0), top = r.w(EDGE_X * M - 200, 0, H10 * M); px.rect(g, base[0], top[1], 30, base[1] - top[1], '#a8acb8'); }, { bias: 10 });
    // the pool cross-section
    r.queue(0, 0, -1, g => { const a0 = r.w(EDGE_X * M - 60, 0, 0), b = r.w(EDGE_X * M + 500, 0, -60); px.rect(g, a0[0], a0[1], b[0] - a0[0], b[1] - a0[1], '#2a8ad0'); px.blend(g, .35, 'add', () => { for (let k = 0; k < 6; k++) { const x = a0[0] + 20 + k * 50 + Math.sin(game.real + k) * 10; px.poly(g, [[x, a0[1]], [x + 12, a0[1]], [x + 30, b[1]], [x + 10, b[1]]], '#6ac8ff'); } }); px.rect(g, a0[0], a0[1], b[0] - a0[0], 2, '#bfe8ff'); px.rect(g, a0[0] - 40, a0[1] - 2, 40, b[1] - a0[1] + 2, '#e0e6ee'); }, { bias: 20 });
    // the judges' table and scoreboard
    r.queue(EDGE_X * M + 300, 0, 0, g => { const p = r.w(EDGE_X * M + 280, 0, 6); px.rect(g, p[0], p[1] - 10, 90, 10, '#2a3060'); for (let k = 0; k < 5; k++) { px.disc(g, p[0] + 10 + k * 17, p[1] - 14, 3, '#e0b090'); } const a = ctx.cur; if (a && a.S.cards) a.S.cards.forEach((c, k) => { px.rect(g, p[0] + 3 + k * 17, p[1] - 30, 14, 10, '#ffffff'); E.font.text(g, String(c), p[0] + 10 + k * 17, p[1] - 28, '#1a1d2e', { align: 'center', outline: false, font: 'tiny' }); }); }, { bias: 30 });
    const a = ctx.cur;
    if (a && a.rig && a.S.x !== undefined) {
      const s = a.S, x = s.x * M, z = Math.max(-40, s.z * M);
      r.actor(x, 0, z, (g, ox, oy) => a.rig.draw(g, ox, oy, r.view), { flash: a.turboT > 0 ? '#ffe0ff' : false, flashMix: .25 });
      if (a.turboT > 0 && s.phase === 'air') game.particles.glints(x, 0, z + 10, 1, '#ffd0ff', 8);
    }
    void W;
  },
  hud(ctx, r, g) {
    O.HUD.header(g, r, ctx);
    const a = ctx.cur; if (!a || !a.S || !a.S.bar) return;
    const s = a.S;
    O.HUD.big(g, r.W - 14, 10, (O.agg(ctx, a) || 0).toFixed(2) + ' PTS');
    if (s.phase === 'choose' && a.human) {
      const w = Math.min(340, r.W - 40), x = r.W / 2 - w / 2, y = 44; s._rects = [];
      O.panel(g, x, y, w, 30 + s.offer.length * 24); O.text(g, 'CHOOSE YOUR DIVE', r.W / 2, y + 7, '#f2b632', { align: 'center' });
      s.offer.forEach((d, i) => { const yy = y + 22 + i * 24, f = i === s.sel; s._rects.push([x + 6, yy - 2, w - 12, 22]); if (f) px.rect(g, x + 6, yy - 2, w - 12, 22, '#3a2a10'); O.text(g, (f ? '▸ ' : '  ') + d.name, x + 12, yy + 2, f ? '#ffe9a0' : '#e8ecff'); O.text(g, 'DD ' + d.dd.toFixed(1), x + w - 12, yy + 2, '#9aa2c8', { align: 'right' }); O.text(g, d.halves / 2 + ' somersaults' + (d.twists ? ', ' + d.twists / 2 + ' twists' : '') + ' · ' + d.pos.toUpperCase(), x + 24, yy + 12, '#9aa2c8', { font: 'tiny' }); });
      O.Prompt.strip(g, r, [['move', 'Choose'], ['action', 'Dive']], { input: a.input });
      return;
    }
    if (s.dive) O.text(g, s.dive.name + '  DD ' + s.dive.dd.toFixed(1), r.W / 2, 30, '#ffffff', { align: 'center' });
    if (s.phase === 'board') { s.bar.draw(g, r.W / 2 - 80, r.H - 40, 160, 10); if (a.human) O.Prompt.draw(g, r.W / 2, r.H - 58, 'action', { input: a.input, label: 'TAKE OFF ON THE GOLD', align: 'center' }); }
    if (s.phase === 'air' || s.phase === 'water') {
      // the rotation dial: half-somersaults done vs required
      const cx = r.W - 50, cy = r.H - 50, need = s.dive.halves;
      px.disc(g, cx, cy, 30, '#05060f'); for (let k = 0; k < need; k++) { const an = -Math.PI / 2 + k / need * Math.PI * 2; px.disc(g, cx + Math.cos(an) * 24, cy + Math.sin(an) * 24, 3, (s.th - (s.dive.armstand ? Math.PI : 0)) / Math.PI >= k + 1 ? '#f2c94c' : '#3a4070'); }
      const an = -Math.PI / 2 + s.th; px.line(g, cx, cy, cx + Math.sin(s.th) * 18, cy - Math.cos(s.th) * 18, '#ffffff', 2); void an;
      O.text(g, ((s.th - (s.dive.armstand ? Math.PI : 0)) / Math.PI).toFixed(1) + ' / ' + need, cx, cy + 34, '#ffffff', { align: 'center' });
      if (a.human && s.phase === 'air') { O.Prompt.draw(g, 14, r.H - 40, 'mashL', { input: a.input, label: 'TUCK', color: s.pos === 'tuck' ? '#ffd060' : '#ffffff' }); O.Prompt.draw(g, 14, r.H - 24, 'mashR', { input: a.input, label: 'PIKE', color: s.pos === 'pike' ? '#ffd060' : '#ffffff' }); if (s.dive.twists) O.text(g, 'TWISTS ' + s.twists / 2 + ' / ' + s.dive.twists / 2, 14, r.H - 56, '#9aa2c8'); O.HUD.flame(g, 100, r.H - 40, a, a.input); }
    }
    if (s.score != null) { const w = 220, x = r.W / 2 - w / 2; O.panel(g, x, 52, w, 34); O.text(g, s.verdict, r.W / 2, 58, s.verdict === 'RIP!' ? '#f2c94c' : '#ffffff', { align: 'center', scale: 2 }); O.text(g, s.score.toFixed(2) + ' POINTS', r.W / 2, 75, '#ffd060', { align: 'center' }); }
  },
  ghostState(ctx, a) { const s = a.S; return [(s.x || EDGE_X) * M, 0, (s.z || H10) * M, s.th || 0, 4]; },
  ghostDraw(ctx, r, s, i) { return [s[0] - 20 - i * 14, 10 + i * 6, s[2]]; }
});
function launch(ctx, a, q) {
  const s = a.S, T = ctx.T; s.q = q; s.phase = 'air'; s.th = s.dive.armstand ? Math.PI : 0; s.vz = T.takeoffVz + 1.6 * q; s.vx = s.dive.back ? .7 : 1.0; s.x = EDGE_X; s.z = H10 + .2;
  ctx.fx.sfx('whoosh'); O.Crowd.excite(.2);
}
function enter(ctx, a) {
  const s = a.S, T = ctx.T, d = s.dive;
  s.phase = 'water'; s.z = 0; s.splash = 0;
  const target = (d.halves + (d.armstand ? 1 : 0)) * Math.PI, err = Math.abs(wrapPi(s.th - Math.PI)) * DEG;
  const extraHalves = Math.round((s.th - target) / Math.PI);
  s.err = err; s.extra = extraHalves;
  let base = err <= T.ripTolerance ? 9.5 : err <= 15 ? 8.5 : err <= 25 ? 7 : err <= 45 ? 5 : err <= 75 ? 3 : 1;
  s.verdict = err <= T.ripTolerance ? 'RIP!' : err <= 25 ? 'CLEAN' : err <= 75 ? 'SPLASHY' : (Math.abs(wrapPi(s.th)) * DEG < 90 ? 'BACK SLAP!' : 'BELLY FLOP!');
  if (err > 75 && ctx.god(a)) { base = 7; s.verdict = 'CLEAN'; }
  if (err > 75) { ctx.yikes(a, s.verdict, 'bellyflop'); ctx.fx.sfx('slap'); ctx.fx.say('diving'); }
  else if (err <= T.ripTolerance) { ctx.fx.sfx('bubbles'); ctx.hype(a, .25); ctx.fx.say('diving', { name: a.short }); }
  else ctx.fx.sfx('splash', { vol: Math.min(1, .3 + err / 90) });
  let adj = .5 * s.q;
  const want = d.pos, other = want === 'tuck' ? 'pike' : 'tuck';
  if (s.posT[other] > s.posT[want]) adj -= 1;
  if (Math.abs(extraHalves) >= 2) adj -= 2 * Math.floor(Math.abs(extraHalves) / 2) * 2;
  if (d.twists) adj -= 1.5 * Math.max(0, d.twists - s.twists);
  s.base = Math.max(0, base + adj);
  const n = err <= T.ripTolerance ? 0 : 50 + err * 3;
  ctx.fx.P.bits((s.x) * M, 0, 0, Math.round(n / 3), ['#ffffff', '#bfe8ff', '#6ac8ff']);
  ctx.fx.slowmo(.35, .5);
}
function score(ctx, a) {
  const s = a.S, T = ctx.T, r = ctx.rng('judges');
  s.scored = true;
  s.cards = []; for (let k = 0; k < 5; k++) { const c = s.base + (r() * 2 - 1) * T.judgeNoise * (s.base >= 9.5 && s.q >= 1 && s.err <= 2 ? 0 : 1) + (s.base >= 9.5 && s.q >= 1 && s.err <= 2 ? .5 : 0); s.cards.push(Math.max(0, Math.min(10, Math.round(c * 2) / 2))); }
  if (s.verdict === 'BELLY FLOP!' || s.verdict === 'BACK SLAP!') s.cards = s.cards.map(() => .5);
  const sorted = s.cards.slice().sort((x, y) => x - y), mid = sorted[1] + sorted[2] + sorted[3];
  s.score = Math.round(mid * s.dive.dd * 100) / 100;
  a.used.push(s.dive.id);
  ctx.finish(a, s.score); ctx.fx.sfx('judge');
}
function animate(ctx, a, dt) {
  const s = a.S, rig = a.rig;
  if (s.phase === 'choose' || s.phase === 'board') { O.Pose.set(rig, s.phase === 'board' ? 'armsUp' : null); rig.bodyPitch = 0; }
  else if (s.phase === 'air') { O.Pose.set(rig, s.pos === 'tuck' ? 'tuck' : s.pos === 'pike' ? 'pike' : 'entry'); rig.bodyPitch = s.th * (s.dive.back ? -1 : 1); rig.pivot = [0, 0, rig.o.hipZ]; rig.spin = s.twists * Math.PI + (s.twT > 0 ? (1 - s.twT / ctx.T.twistTime) * Math.PI : 0); }
  else if (s.phase === 'water') { O.Pose.set(rig, s.verdict === 'BELLY FLOP!' || s.verdict === 'BACK SLAP!' ? 'bellyFlop' : 'entry'); }
  rig.update(dt, { x: s.x * M, y: 0, z: s.z * M - (s.phase === 'air' ? rig.o.hipZ * 1.2 : 0), vx: 0, vy: 0, facing: s.dive && s.dive.back ? Math.PI : 0, air: s.phase === 'air' });
}
})();
