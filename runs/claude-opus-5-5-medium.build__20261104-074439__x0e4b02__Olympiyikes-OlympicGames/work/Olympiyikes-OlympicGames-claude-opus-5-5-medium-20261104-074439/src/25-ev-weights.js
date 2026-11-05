/* OLYMPIYIKES! — Iron Hall and WEIGHTLIFTING, clean & jerk (§6.6): pick a weight, mash the clean, balance the rack, time the jerk, hold. */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px;
const PLATES = [[25, '#e8443a'], [20, '#3a7cf0'], [15, '#f2c94c'], [10, '#4fc060'], [5, '#f4f4f8'], [2.5, '#2a2a30']];
const platesFor = kg => { let side = (kg - 20 - 5) / 2; const out = []; for (const [w, c] of PLATES) while (side >= w - 1e-6 && out.length < 9) { out.push([w, c]); side -= w; } return out; };
const OPEN = { Easy: [180, 190, 200, 210, 220], Normal: [200, 210, 220, 230, 240], Hard: [215, 225, 235, 245, 255] };

O.defEvent({
  id: 'weights', name: 'WEIGHTLIFTING', short: 'Weights', season: 'summer', venue: 'Iron Hall', pictogram: 'weights', music: 'iron', view: 'brawler', sport: 'weights', lights: .35,
  format: { type: 'attempts', rounds: 3, combine: 'best' }, maxTime: 30, turbo: 'IRON WILL!',
  measure: { better: 'higher', unit: 'kg', fmt: v => v + ' kg', wr: [270, 'VOL', 'BLAZE CINDERHART'], qualify: { Easy: 200, Normal: 225, Hard: 245 }, round: true },
  points: kg => Math.min(1200, 9.5 * (kg - 150)),
  tieBreak: (a, b) => (a.firstAt || 9) - (b.firstAt || 9),
  tune: { cleanTime: [4, 2, 8, .1, 'Clean time (s)'], liftGain: [.12, .04, .3, .005, 'Lift gain'], rReqBase: [5.5, 2, 9, .1, 'Mash needed base (Hz)'], rReqPerW: [4.5, 0, 8, .1, 'Mash needed per load'],
    rackTime: [1.2, .4, 3, .1, 'Rack hold (s)'], holdTime: [2, .5, 4, .1, 'Overhead hold (s)'], driftBase: [1, 0, 3, .05, 'Balance drift'] },
  howto: { goal: 'Heaviest good lift wins.', rows: [['pair', 'CLEAN: mash to the shoulders'], [['move'], 'Balance with ← →'], [['action'], 'JERK: press on the ring'], [null, 'Hold it overhead for three white lights']] },
  yikesKinds: ['DROP!'],
  laurel: { id: 'yikesweight', name: 'YIKES WEIGHT', text: 'Lift the YIKES BAR (WR + 10 kg)', test: (ctx, a) => a.S.kg >= 280 && a.lastPerf === a.S.kg },
  hub: { ok: true, attempts: 2, seconds: 50 }, attract: { seconds: 18, after: 3, setup(ctx) { const a = ctx.cur; a.S.kg = 280; a.S.phase = 'clean'; } },
  turnLabel: ctx => 'ATTEMPT ' + (ctx.cur.attempts.length + 1) + ' OF ' + ctx.rounds,
  phases: [['pick', ctx => { ctx.cur.S.phase = 'pick'; }], ['clean', ctx => { const s = ctx.cur.S; s.phase = 'clean'; s.h = 0; s.t2 = 0; }], ['jerk', ctx => { const s = ctx.cur.S; s.phase = 'jerk'; s.ring = new O.Ring(.9); s.h = 1; }], ['hold', ctx => { const s = ctx.cur.S; s.phase = 'hold'; s.t2 = 0; s.h = 1.6; }]],
  build(ctx) { for (const a of ctx.athletes) { a.lastKg = null; a.firstAt = 9; } },
  start(ctx) {
    const a = ctx.cur, diff = (ctx.meet.difficulty || 'Normal'), n = a.attempts.length;
    const opts = ctx.hub ? [n === 0 ? 220 : 240] : n === 0 ? OPEN[diff] || OPEN.Normal : [5, 10, 15].map(k => (a.lastKg || 200) + k).concat(n === 2 ? [280] : []);
    a.S = { phase: a.human && !ctx.hub ? 'pick' : 'clean', opts, sel: 0, kg: opts[0], h: 0, t2: 0, bal: null, ring: null, wob: 1, lights: null, dropT: 0, done: false, pw: 0 };
    const sk = ctx.skill(a), cap = a.pilot.cheat === 'perfect' ? 300 : 190 + 80 * sk + O.gauss(ctx.rng('cap')) * 6;
    a.S.cap = cap;
    if (!a.human) { const pick = ctx.hub ? opts[0] : n === 0 ? opts.reduce((b, k) => k <= cap - 18 ? k : b, opts[0]) : (a.lastPerf != null ? opts.reduce((b, k) => k <= cap - 4 ? k : b, opts[0]) : opts[0]); a.S.kg = a.pilot.cheat === 'perfect' && n === 2 ? 280 : a.pilot.cheat === 'perfect' ? 270 : pick; }
    else a.S.kg = opts[0];
  },
  bot(ctx, a, dt, I) {
    const s = a.S, T = ctx.T, w = (s.kg - 150) / 120, rReq = T.rReqBase + T.rReqPerW * w, ok = s.cap >= s.kg;
    if (s.phase === 'pick') { const want = s.opts.reduce((b, k, i) => k <= s.cap - (a.attempts.length ? 4 : 14) ? i : b, 0); s.sel = want; s.kg = s.opts[want]; I.A = true; return I; }
    if (s.phase === 'clean') O.botMash(a, ok ? rReq * 1.1 + 2.5 : rReq * .62, dt, I);
    if ((s.phase === 'rack' || s.phase === 'hold') && s.bal) { const err = ok ? 0 : .5; I.mv = [E.clamp(s.bal.b * 3 + s.bal.v * .8 + err, -1, 1), 0]; }
    if (s.phase === 'jerk' && s.ring && s.ring.t >= s.ring.dur - (ok ? .005 : -.25)) I.A = true;
    if (a.hype >= 1 && s.phase === 'clean') I.T = true;
    return I;
  },
  step(ctx, dt) {
    const T = ctx.T;
    for (const a of ctx.active) {
      const s = a.S, I = a.I, w = (s.kg - 150) / 120, iron = a.turboT > 0;
      if (s.phase === 'pick') {
        if (I.left || I.up) s.sel = (s.sel + s.opts.length - 1) % s.opts.length; if (I.right || I.down) s.sel = (s.sel + 1) % s.opts.length;
        if (I.click) { const k = (s._rects || []).findIndex(R => O.hit(I.click, R)); if (k >= 0) { s.sel = k; I.A = true; } }
        s.kg = s.opts[s.sel];
        s.pickT = (s.pickT || 0) + dt; if (I.A || s.pickT > 15) { s.phase = 'clean'; s.t2 = 0; ctx.fx.sfx('confirm'); }
        continue;
      }
      s.t2 += dt;
      if (s.phase === 'clean') {
        const rReq = T.rReqBase + T.rReqPerW * w, rate = a.mash.rate * (iron ? 1.4 : 1); s.pw = Math.min(1, rate / (rReq * 1.4));
        s.h += (rate - .7 * rReq) * T.liftGain * dt * .5; if (rate < .5 * rReq) s.h -= .1 * dt; s.h = E.clamp(s.h, 0, 1);
        if (s.h >= 1) { s.phase = 'rack'; s.t2 = 0; s.bal = new O.Balance(ctx.rng('rack'), { drift: T.driftBase * (1 + w) }); ctx.fx.sfx('clank'); ctx.fx.P.dust(0, 40, 30, 6, { color: '#ffffff' }); }
        else if (s.t2 > T.cleanTime) fail(ctx, a, 'NO LIFT');
      } else if (s.phase === 'rack') {
        s.bal.update(dt, I.mv[0], iron ? .2 : 1);
        if (Math.abs(s.bal.b) < .35) s.inT = (s.inT || 0) + dt; else s.inT = 0;
        if (s.bal.lost && !ctx.god(a)) drop(ctx, a);
        else if (s.inT >= T.rackTime) { s.phase = 'jerk'; s.t2 = 0; s.ring = new O.Ring(.9); }
      } else if (s.phase === 'jerk') {
        s.ring.update(dt);
        if (I.A || s.ring.res) { const res = s.ring.res || s.ring.press(); s.jerkJ = res.j; if (a.human) ctx.fx.banner(res.j, { y: .22, life: .9, scale: 2 });
          if (res.j === 'BAD' && ctx.rng('jerk')() < .5 && !ctx.god(a)) { drop(ctx, a); continue; }
          s.wob = res.j === 'PERFECT' ? .5 : res.j === 'GOOD' ? 1 : 1.8; s.phase = 'hold'; s.t2 = 0; s.h = 1.6; s.bal = new O.Balance(ctx.rng('hold'), { drift: T.driftBase * (1 + 1.4 * w) * s.wob }); ctx.fx.sfx('whoosh'); if (res.j === 'PERFECT') ctx.hype(a, .25); }
      } else if (s.phase === 'hold') {
        s.bal.update(dt, I.mv[0], iron ? .2 : 1);
        if (s.bal.lost && !ctx.god(a)) drop(ctx, a);
        else if (s.t2 >= T.holdTime) good(ctx, a);
      } else if (s.phase === 'done' || s.phase === 'drop' || s.phase === 'nolift') s.dropT += dt;
    }
    if (!ctx.sandbox) for (const a of ctx.active) animate(ctx, a, dt);
  },
  done(ctx) { return ctx.active.every(a => a.fin && (a.S.dropT > 2.2 || ctx.fast)); },
  perf(ctx, a) { return a.cur === undefined ? null : a.cur; },
  camera(ctx) { game.focus(0, 40, 30); game.setZoom(1.9); },
  draw(ctx, r) {
    r.sky(['#08060e', '#120c1a', '#1a1222']);
    r.queue(0, -60, 0, g => { px.rect(g, 0, 0, r.W, r.H, '#0c0a14'); const s0 = r.w(-200, -60, 60)[1], s1 = r.w(-200, -60, 0)[1]; O.Art.crowd(g, 0, s0, r.W, s1 - s0, O.Crowd.level * .7, 21, ['#5a4a6a', '#6a5a4a', '#ff6a1a', '#3a3a5a']); }, { bias: -2000 });
    // the wooden platform, plate rack, chalk bowl, the referees' lights
    r.queue(0, 40, 0, g => { const a0 = r.w(-48, 10, 0), b = r.w(48, 70, 0), c = r.w(48, 10, 0), d = r.w(-48, 70, 0); px.poly(g, [a0, c, b, d].map(p => [p[0], p[1]]), '#b88a50'); for (let k = -40; k <= 40; k += 10) { const p = r.w(k, 10, 0), q = r.w(k, 70, 0); px.line(g, p[0], p[1], q[0], q[1], '#9a7040', 1); } }, { bias: -500 });
    r.queue(70, 60, 0, g => { const p = r.w(70, 60, 0); px.rect(g, p[0] - 6, p[1] - 30, 12, 30, '#3a3a44'); for (let k = 0; k < 4; k++) px.ell(g, p[0], p[1] - 6 - k * 7, 7, 3, PLATES[k][1]); });
    r.queue(-70, 50, 0, g => { const p = r.w(-70, 50, 0); px.rect(g, p[0] - 2, p[1] - 14, 4, 14, '#5a5a6a'); px.ell(g, p[0], p[1] - 15, 7, 3, '#f4f4f8'); });
    const a = ctx.cur;
    for (let k = 0; k < 3; k++) { const x = -40 + k * 40; r.queue(x, 6, 70, g => { const p = r.w(x, 6, 70); const L = a && a.S.lights; const col = L ? (L[k] ? '#ffffff' : '#e8443a') : '#2a2a34'; px.disc(g, p[0], p[1], 5, '#05060f'); px.disc(g, p[0], p[1], 4, col); }, { emissive: true }); }
    game.lights.add(-30, 20, 120, 160, .9, { color: '#ffd8a0' }); game.lights.add(30, 20, 120, 160, .9, { color: '#ffd8a0' });
    if (a && a.rig && a.S.kg) {
      const s = a.S;
      r.shadow(0, 40, 10, .4);
      r.actor(0, 40, 0, (g, ox, oy) => a.rig.draw(g, ox, oy, r.view), { flash: a.turboT > 0 ? '#ffb040' : false, flashMix: .25 });
      // the barbell at the hands (or on the floor), bending with the load
      const hz = s.phase === 'pick' ? 3 : s.phase === 'drop' || s.phase === 'nolift' ? Math.max(3, 3 + 40 * Math.max(0, 1 - s.dropT * 2)) : barZ(a);
      r.queue(0, 34, hz, g => {
        const c = r.w(0, 34, hz), bend = Math.min(6, (s.kg - 150) / 25) * (s.phase === 'hold' || s.phase === 'jerk' ? 1 : .5);
        const L = 38; px.line(g, c[0] - L, c[1] + bend, c[0], c[1], '#c8ccd8', 2); px.line(g, c[0], c[1], c[0] + L, c[1] + bend, '#c8ccd8', 2);
        const pl = platesFor(s.kg); pl.forEach(([wt, col], i) => { const hh = wt >= 10 ? 13 : wt >= 5 ? 9 : 7; for (const sd of [-1, 1]) { const x = c[0] + sd * (L - 10 + i * 2.2) ; px.rect(g, Math.round(x - 1), Math.round(c[1] + bend - hh), 2, hh * 2, col); px.rect(g, Math.round(x - 1), Math.round(c[1] + bend - hh), 1, hh * 2, E.shade(col, .2)); } });
        for (const sd of [-1, 1]) px.rect(g, Math.round(c[0] + sd * (L - 12)), Math.round(c[1] + bend * .7 - 3), 2, 6, '#9aa2c8');
      });
    }
  },
  hud(ctx, r, g) {
    O.HUD.header(g, r, ctx);
    const a = ctx.cur; if (!a || !a.S || !a.S.kg) return;
    const s = a.S;
    O.text(g, s.kg + ' KG', r.W - 14, 10, s.kg >= 280 ? '#ff6a1a' : '#ffffff', { align: 'right', scale: 3 });
    if (s.kg >= 280) O.text(g, 'THE YIKES BAR!', r.W - 14, 34, '#ff6a1a', { align: 'right' });
    if (s.phase === 'pick' && a.human) {
      const w = 260, x = r.W / 2 - w / 2, y = 50; s._rects = [];
      O.panel(g, x, y, w, 34 + s.opts.length * 18); O.text(g, a.attempts.length ? 'NEXT WEIGHT' : 'OPENING WEIGHT', r.W / 2, y + 7, '#f2b632', { align: 'center' });
      s.opts.forEach((k, i) => { const yy = y + 24 + i * 18, f = i === s.sel; s._rects.push([x + 6, yy - 2, w - 12, 16]); if (f) px.rect(g, x + 6, yy - 2, w - 12, 16, '#3a2a10'); O.text(g, (f ? '▸ ' : '  ') + k + ' KG' + (k >= 280 ? '  YIKES BAR!' : ''), x + 14, yy + 2, f ? '#ffe9a0' : '#e8ecff'); });
      O.Prompt.strip(g, r, [['move', 'Choose'], ['action', 'Lift']], { input: a.input });
      return;
    }
    O.text(g, { clean: 'CLEAN', rack: 'RACK — BALANCE', jerk: 'JERK!', hold: 'HOLD IT!', done: '', drop: '', nolift: '' }[s.phase] || '', r.W / 2, 34, '#ffffff', { align: 'center', scale: 2 });
    if (s.phase === 'clean') { O.HUD.power(g, r.W / 2 - 60, r.H - 30, 120, s.h, '#f2c94c'); if (a.human) O.Prompt.pair(g, r.W / 2 - 30, r.H - 48, { input: a.input, label: 'LIFT!', phase: a.mash.last === 'L' ? 1 : 0 }); O.text(g, Math.max(0, ctx.T.cleanTime - s.t2).toFixed(1) + ' s', r.W / 2 + 70, r.H - 31, '#c8d0f0'); }
    if ((s.phase === 'rack' || s.phase === 'hold') && s.bal) { s.bal.draw(g, r.W / 2, r.H - 34, 160); if (a.human) O.Prompt.draw(g, r.W / 2, r.H - 52, 'move', { input: a.input, label: 'BALANCE', align: 'center' }); if (s.phase === 'hold') O.HUD.power(g, r.W / 2 - 40, r.H - 14, 80, s.t2 / ctx.T.holdTime, '#ffffff'); }
    if (s.phase === 'jerk' && s.ring) { s.ring.draw(g, r.W / 2, r.H * .55, 18); if (a.human) O.Prompt.draw(g, r.W / 2, r.H * .55 - 4, 'action', { input: a.input, align: 'center' }); }
    if (a.human) O.HUD.flame(g, 14, r.H - 40, a, a.input);
    if (s.lights) O.text(g, s.lights.every(x => x) ? 'GOOD LIFT!' : 'NO LIFT', r.W / 2, r.H * .2, s.lights.every(x => x) ? '#ffffff' : '#ff6b6b', { align: 'center', scale: 3 });
  },
  ghostState(ctx, a) { const s = a.S; return [0, 0, barZ(a), 0, 6, s.kg || 0]; },
  ghostDraw(ctx, r, s, i) { return [-70 - i * 30, 70, 0]; }
});
function barZ(a) { const s = a.S, rig = a.rig, o = rig ? rig.o : { hipZ: 14, torso: 9.6 }, k = rig ? rig.o.size : 1.3; if (s.phase === 'hold' || s.phase === 'done') return (o.hipZ + o.torso + 10) * k; if (s.phase === 'jerk' || s.phase === 'rack') return (o.hipZ + o.torso - 1) * k; return (3 + s.h * (o.hipZ + o.torso - 4)) * k; }
function fail(ctx, a, why) { const s = a.S; s.phase = 'nolift'; s.dropT = 0; s.lights = [false, false, false]; ctx.dnf(a, why || 'NO LIFT'); ctx.fx.sfx('lightOff'); }
function drop(ctx, a) { const s = a.S; s.phase = 'drop'; s.dropT = 0; s.lights = [false, false, false]; ctx.dnf(a, 'NO LIFT'); ctx.yikes(a, 'DROP!', 'drop'); ctx.fx.sfx('slam'); ctx.fx.shake(6); ctx.fx.P.dust(0, 40, 0, 16, { color: '#ffffff' }); setTimeout0(ctx, () => ctx.fx.sfx('oof')); }
function setTimeout0(ctx, f) { if (!ctx.fast) game.after(.4, f); }
function good(ctx, a) {
  const s = a.S; s.phase = 'done'; s.dropT = 0; s.lights = [true, true, true]; a.lastKg = s.kg; if (a.firstAt === 9) a.firstAt = a.attempts.length;
  ctx.finish(a, s.kg); ctx.fx.sfx('lightOn'); ctx.fx.say('weights', { name: a.short }); O.Crowd.excite(.7);
  if (s.kg > 270) { ctx.fx.shake(5); ctx.fx.banner('THE FLOOR CRACKS!', { y: .3, scale: 2 }); }
}
function animate(ctx, a, dt) {
  const s = a.S, rig = a.rig;
  if (s.phase === 'pick' || s.phase === 'clean') O.Pose.set(rig, 'liftClean', { h: s.h });
  else if (s.phase === 'rack' || s.phase === 'jerk') O.Pose.set(rig, s.phase === 'jerk' && s.ring && s.ring.t > s.ring.dur * .7 ? 'liftJerk' : 'liftRack', { u: .3 });
  else if (s.phase === 'hold' || s.phase === 'done') O.Pose.set(rig, 'liftJerk', { u: s.phase === 'done' ? Math.max(0, 1 - s.dropT) : 1 });
  else if (s.phase === 'drop' || s.phase === 'nolift') O.Pose.set(rig, s.dropT > .3 ? 'sitDown' : 'liftDrop');
  const lean = s.bal ? s.bal.b * .2 : 0; rig.bodyRoll = lean;
  rig.update(dt, { x: 0, y: 40, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: s.phase === 'done' && s.dropT > 1 ? 'cheer' : null });
}
})();
