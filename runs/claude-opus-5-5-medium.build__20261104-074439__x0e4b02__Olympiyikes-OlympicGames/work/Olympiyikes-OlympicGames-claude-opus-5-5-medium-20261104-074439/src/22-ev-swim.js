/* OLYMPIYIKES! — Splash Palace and the 50m FREESTYLE (§6.3): strokes on the beat, breathing, the flip turn, the touch. */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, M = 12;
const PL = O.Pool = { L: 25, laneY: l => 22 + (8 - l) * 30, X0: 60 };
const xOf = d => PL.X0 + (d <= 25 ? d : 50 - d) * M;
const waterTex = (x, y) => {
  const lx = x - PL.X0, n = E.hash2(Math.floor(x), Math.floor(y)) - .5;
  if (lx < -24 || lx > 300 + 24 || y < 4 || y > 252) { const k = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 ? 210 : 196; return [k + n * 10, k + 4 + n * 10, k + 10]; }   // tiled deck
  if (lx < 0 || lx > 300 || y < 7 || y > 249) return [235, 238, 245];
  const ly = (y - 7) % 30; const mid = Math.abs(ly - 15) < 1.2 && lx > 12 && lx < 288;
  const c = E.noise2(x * .09 + game.real * .6, y * .09) * 26 + E.noise2(x * .2 - game.real, y * .2) * 12;
  if (mid) return [18, 40, 90];
  return [30 + c * .4, 140 + c, 205 + c * .6];
};
let pmap = null;
PL.build = () => { if (pmap) return pmap; const R = []; for (let y = 0; y < 17; y++) R.push('.'.repeat(28)); pmap = new E.TileMap({ rows: R, legend: { '.': { floor: 'pool' } }, floorTex: waterTex, outside: '#c8ccd8', ao: 0, types: {} }); return pmap; };
PL.drawVenue = (r, o = {}) => {
  r.sky(['#bfe8ff', '#e8f6ff', '#ffffff']);
  PL.build().drawFloor(r);
  // the back wall with windows onto the beach and the stands
  r.queue(200, -16, 0, g => {
    const a = r.w(-100, -16, 0), b = r.w(560, -16, 0), t = r.w(-100, -16, 120); const L = Math.max(0, Math.min(a[0], b[0])), R = Math.min(r.W, Math.max(a[0], b[0]));
    px.rect(g, L, 0, R - L, a[1], '#d8e0ec');
    for (let k = 0; k < 6; k++) { const w0 = r.w(-60 + k * 110, -16, 80), w1 = r.w(20 + k * 110, -16, 40); px.rect(g, w0[0], w0[1], w1[0] - w0[0], w1[1] - w0[1], '#7ac8f0'); px.rect(g, w0[0], w1[1] - 8, w1[0] - w0[0], 8, '#f0d890'); px.rect(g, w0[0], w1[1] - 14, w1[0] - w0[0], 6, '#3a9ad8'); }
    const s0 = r.w(-100, -16, 36)[1]; O.Art.crowd(g, L, s0, R - L, a[1] - s0 - 4, O.Crowd.level, 7, ['#ff7fb8', '#1fa8a0', '#f2b632', '#3a7cf0', '#e8443a', '#ffffff']);
    void t;
  }, { bias: -1000 });
  // lane ropes as floats, flags line, starting blocks
  for (let l = 0; l <= 8; l++) { const y = 7 + l * 30; r.queue(PL.X0 + 150, y, 0, g => { for (let d = 0; d <= 300; d += 6) { const p = r.w(PL.X0 + d, y, 1); px.rect(g, p[0], p[1] - 1, 3, 2, d < 60 || d > 240 ? '#e8443a' : l % 2 ? '#f2b632' : '#3a7cf0'); } }, { bias: -200 }); }
  for (const fx of [PL.X0 + 60, PL.X0 + 240]) r.queue(fx, 128, 40, g => { const a = r.w(fx, 0, 40), b = r.w(fx, 256, 40); px.line(g, a[0], a[1], b[0], b[1], '#3a3a4a', 1); for (let k = 0; k < 16; k++) { const p = r.w(fx, k * 16, 40); px.poly(g, [[p[0], p[1]], [p[0] + 4, p[1]], [p[0] + 2, p[1] + 5]], ['#e8443a', '#ffffff', '#3a7cf0'][k % 3]); } });
  for (let l = 1; l <= 8; l++) { const y = PL.laneY(l); r.queue(PL.X0 - 10, y, 0, g => { const p = r.w(PL.X0 - 10, y, 0); px.rect(g, p[0] - 5, p[1] - 9, 10, 9, '#e8ecf4'); px.rect(g, p[0] - 5, p[1] - 9, 10, 2, '#2a5ab8'); E.font.text(g, String(l), p[0], p[1] - 7, '#1a1d2e', { align: 'center', outline: false, font: 'tiny' }); }); }
  // jumbotron
  r.queue(PL.X0 + 150, -14, 90, g => { const p = r.w(PL.X0 + 150, -14, 100); O.Art.jumbo(g, p[0] - 40, p[1], 80, 20, o.jumbo || ['SPLASH PALACE', 'GO YIKES']); }, { bias: -900 });
};

const LANES_H = [4, 5, 3, 6], ORDER = [4, 5, 3, 6, 2, 7, 1, 8];
O.defEvent({
  id: 'swim', name: '50m FREESTYLE', short: '50m Free', season: 'summer', venue: 'Splash Palace', pictogram: 'swim', music: 'swim', view: 'brawler', sport: 'swim', lights: .9,
  format: { type: 'race' }, maxTime: 60, turbo: 'DOLPHIN MODE!',
  measure: { better: 'lower', unit: 's', fmt: v => v.toFixed(2) + ' s', wr: [19.62, 'WAV', 'MARINA SPLASHWORTH'], qualify: { Easy: 25.5, Normal: 23.2, Hard: 21.6 } },
  points: t => 18.9 * Math.pow(Math.max(0, 35 - t), 1.5),
  tune: { vMax: [2.45, 1.5, 3.5, .01, 'Top speed (m/s)'], perfectWindow: [70, 30, 160, 5, 'Perfect window (ms)'], goodWindow: [150, 60, 300, 5, 'Good window (ms)'], o2Drain: [.11, 0, .3, .005, 'O2 drain /s'],
    breathGain: [.45, .1, 1, .01, 'Breath gain'], turnPush: [1.25, 1, 1.6, .01, 'Flip-turn push ×'], diveGlide: [4, 1, 8, .1, 'Dive glide (m)'] },
  howto: { goal: 'Two lengths. Fastest touch wins.', rows: [[['action'], 'Dive: hold, release · flip turn · touch'], ['pair', 'Stroke ON THE BEAT, alternating'], [['alt'], 'Breathe right after a stroke'], [['turbo'], 'DOLPHIN MODE when the flame is full']] },
  yikesKinds: ['FALSE START!', 'BELLY FLOP START', 'GASP!', 'BONK!'],
  laurel: { id: 'torpedo', name: 'TORPEDO', text: 'Reaction under 0.15 s, perfect dive and perfect turn', test: (ctx, a) => a.S.react != null && a.S.react < .15 && a.S.diveQ >= 1 && a.S.turnQ === 'PERFECT' },
  hub: { ok: true, attempts: 1, seconds: 45 }, attract: { seconds: 20, after: 3, setup(ctx) { for (const a of ctx.athletes) { a.S.state = 'swim'; a.S.d = 18; a.S.v = 2.3; } ctx.S.stage = 'race'; ctx.S.gunT = ctx.t - 9; } },
  phases: [['start', ctx => { ctx.S.stage = 'marks'; ctx.S.stageT = 0; }], ['turn', ctx => { for (const a of ctx.athletes) { a.S.state = 'swim'; a.S.d = 21; a.S.v = 2.2; } ctx.S.stage = 'race'; ctx.S.gunT = ctx.t - 9; }], ['finish', ctx => { for (const a of ctx.athletes) { a.S.state = 'swim'; a.S.d = 45; a.S.turned = true; } ctx.S.stage = 'race'; ctx.S.gunT = ctx.t - 19; }]],
  build(ctx) {
    PL.build();
    const hum = ctx.athletes.filter(a => a.human), cpu = ctx.athletes.filter(a => !a.human).sort((a, b) => (b.rival ? 1 : 0) - (a.rival ? 1 : 0) || b.pilot.skill - a.pilot.skill);
    let lanes = ORDER.slice(); hum.forEach((a, i) => { a.S = { lane: LANES_H[i] }; lanes = lanes.filter(l => l !== LANES_H[i]); }); cpu.forEach((a, i) => { a.S = { lane: lanes[i] }; });
  },
  start(ctx) {
    ctx.S = Object.assign(ctx.S || {}, { stage: 'marks', stageT: 0, gunAt: .8 + ctx.rng('beep')() * .8, gunT: null, order: [] });
    for (const a of ctx.active) { const r = ctx.rng('cpu:' + a.id); a.S = { lane: a.S.lane || 4, d: 0, v: 0, state: 'blocks', react: null, diveHold: 0, diving: false, diveQ: 0, q: .6, o2: 1, side: 'L', ph: 0, strokes: 0, since: 9, turned: false, turnQ: null, stopT: 0, touch: 0, time: null, r, fs: 0, glide: 0, jT: 0, j: null, breathN: 3 + Math.floor(r() * 2) }; }
  },
  bot(ctx, a, dt, I) {
    const S = ctx.S, s = a.S, sk = ctx.skill(a), perfect = a.pilot.cheat === 'perfect';
    if (S.stage === 'race' && s.state === 'blocks') { const rt = perfect ? .11 : .24 - .11 * sk; if (ctx.t - S.gunT >= rt) I.A = true; return I; }
    if (s.state === 'dive') { I.Ad = s.diveHold < (perfect ? .4 : .3 + (1 - sk) * .3); if (!I.Ad) I.Au = true; return I; }
    if (s.state === 'swim') {
      const iv = interval(ctx, a), err = s.botErr === undefined ? (s.botErr = (perfect ? 0 : (s.r() * 2 - 1) * (1 - sk) * 220 + (s.r() < (1 - sk) * .15 ? 400 : 0)) / 1000) : s.botErr;
      const tToBeat = (1 - s.ph) * iv;
      if (tToBeat <= Math.max(0, err) + dt * .5 && !s.pressedThis) { if (s.side === 'L') I.L = true; else I.R = true; s.pressedThis = true; s.botErr = undefined; }
      if (s.since < .1 && s.strokes % s.breathN === 0 && s.o2 < .8 && !s.breathed) I.Xp = true;
      const toWall = s.turned ? 50 - s.d : 25 - s.d;
      if (!s.turned && toWall < (perfect ? .85 : .6 + (1 - sk) * 1.4 * s.r()) && toWall > 0) I.A = true;
      if (s.turned && toWall < .7) I.A = true;
      if (a.hype >= 1 && s.d > 10) I.T = true;
    }
    return I;
  },
  step(ctx, dt) {
    const S = ctx.S, T = ctx.T; S.stageT += dt;
    if (S.stage === 'marks' && S.stageT > 1.4) { S.stage = 'set'; S.stageT = 0; }
    else if (S.stage === 'set' && S.stageT >= S.gunAt) { S.stage = 'race'; S.stageT = 0; S.gunT = ctx.t; ctx.fx.sfx('beepHi'); ctx.fx.say('start'); O.Crowd.excite(.4); }
    for (const a of ctx.active) {
      const s = a.S, I = a.I;
      if (s.state === 'done' || s.state === 'dq') continue;
      if (s.state === 'blocks') {
        if ((I.A || I.L || I.R) && S.stage !== 'race' && S.stage !== 'marks') { s.fs++; ctx.yikes(a, 'FALSE START!', 'falsestart'); ctx.fx.sfx('whistle'); if (s.fs >= 2) { s.state = 'dq'; ctx.dnf(a, 'DQ'); } S.stage = 'marks'; S.stageT = 0; continue; }
        if (S.stage === 'race' && I.A) { s.react = ctx.t - S.gunT; s.state = 'dive'; s.diveHold = 0; if (s.react < .15) ctx.hype(a, .25); }
        continue;
      }
      if (s.state === 'dive') {
        s.diveHold += dt;
        if (!I.Ad || s.diveHold > 1.2) {
          const h = s.diveHold; let glide;
          if (h > .75 && !ctx.god(a)) { glide = 2; ctx.yikes(a, 'BELLY FLOP START', 'bellyflop'); ctx.fx.sfx('slap'); s.diveQ = 0; }
          else { const q = h >= .2 && h <= .6 ? 1 : h < .2 ? .5 + h * 2.5 : .6; s.diveQ = q; glide = T.diveGlide + 3 * q; if (q >= 1) ctx.hype(a, .1); ctx.fx.sfx('splash'); }
          s.state = 'glide'; s.glide = glide; s.v = 3.4; s.jT = .35;
          ctx.fx.P.bits(xOf(1), PL.laneY(s.lane), 0, 10, ['#ffffff', '#bfe8ff']);
        }
        continue;
      }
      if (s.stopT > 0) { s.stopT -= dt; s.v = Math.max(0, s.v - 6 * dt); s.d += s.v * dt; continue; }
      if (s.state === 'glide') { s.d += s.v * dt; s.v = Math.max(T.vMax * .9, s.v - .9 * dt); s.glide -= s.v * dt; s.jT -= dt; if (s.glide <= 0) { s.state = 'swim'; s.ph = 0; } continue; }
      if (s.state === 'push') { s.d += s.v * dt; s.v = Math.max(T.vMax * .9, s.v - 1.2 * dt); s.glide -= s.v * dt; if (s.glide <= 0) { s.state = 'swim'; s.ph = 0; } continue; }
      // swimming: the stroke beat
      const iv = interval(ctx, a); s.ph += dt / iv; s.since += dt;
      const dolphin = a.turboT > 0;
      const press = I.L ? 'L' : I.R ? 'R' : null;
      if (dolphin && s.ph >= 1) judge(ctx, a, 1, 'PERFECT');
      else if (press) {
        const errMs = (s.ph > .5 ? Math.abs(1 - s.ph) : s.ph) * iv * 1000, near = s.ph > .5;
        if (press !== s.side || errMs > T.goodWindow * O.winScale()) judge(ctx, a, 0, 'MISS', near);
        else judge(ctx, a, errMs <= T.perfectWindow * O.winScale() && s.o2 >= .25 ? 1 : .6, errMs <= T.perfectWindow * O.winScale() && s.o2 >= .25 ? 'PERFECT' : 'GOOD', near);
      } else if (s.ph > 1 + (T.goodWindow / 1000) / iv) judge(ctx, a, 0, 'MISS', true, true);
      // breathing
      if (I.Xp && s.since < .25 && !s.breathed) { s.o2 = Math.min(1, s.o2 + T.breathGain); s.breathed = true; s.q *= .9; if (a.human) ctx.fx.sfx('bubbles', { vol: .5 }); }
      s.o2 -= T.o2Drain * dt * (dolphin ? .3 : 1);
      if (s.o2 <= 0 && !ctx.god(a)) { s.o2 = .6; s.stopT = 1.2; ctx.yikes(a, 'GASP!', 'gasp'); ctx.fx.sfx('cough'); }
      s.o2 = Math.max(0, s.o2);
      const vMax = T.vMax * ctx.turboMult(a, 1.1), vt = vMax * (.45 + .55 * s.q);
      s.v += (vt - s.v) * Math.min(1, dt * 2.5);
      const d0 = s.d; s.d += s.v * dt;
      // the turn
      if (!s.turned) {
        const toWall = 25 - s.d;
        if (I.A && toWall <= 1.6 && toWall > 0) {
          s.turned = true; const q = toWall >= .6 && toWall <= 1.1 ? 'PERFECT' : toWall > 1.1 ? 'EARLY' : 'LATE'; s.turnQ = q;
          s.d = 25.01; s.state = 'push'; s.v = vMax * (q === 'PERFECT' ? T.turnPush : q === 'EARLY' ? .85 : 1.05); s.glide = q === 'PERFECT' ? 5 : 3;
          if (q === 'PERFECT') { ctx.hype(a, .2); ctx.fx.say('swim', { name: a.short }); } if (a.human) ctx.fx.banner(q + ' TURN', { y: .2, life: 1, scale: 2 });
          ctx.fx.sfx('splash', { vol: .6 });
        } else if (s.d >= 25) {
          s.turned = true; s.turnQ = 'BONK'; s.d = 25.01;
          if (!ctx.god(a)) { s.stopT = 1; ctx.yikes(a, 'BONK!', 'bonk'); ctx.fx.sfx('thunk'); s.v = 0; } else { s.state = 'push'; s.glide = 2; }
        }
      } else {
        if (I.A && 50 - s.d < .8 && !s.touch) s.touch = .05;
        if (s.d >= 50 - (s.touch ? 0 : 0)) {
          const frac = (50 - d0) / Math.max(1e-6, s.d - d0); s.time = ctx.t - dt + frac * dt - S.gunT - s.touch; s.d = 50; s.state = 'done';
          S.order.push(a); ctx.finish(a, Math.round(s.time * 1000) / 1000); if (S.order.length === 1) { ctx.fx.sfx('cheerSwell'); O.Crowd.excite(.6); }
        }
      }
    }
    if (!ctx.sandbox) for (const a of ctx.active) animate(ctx, a, dt);
  },
  done(ctx) { return ctx.S.stage === 'race' && ctx.active.every(a => a.fin) && (ctx.t - ctx.S.gunT > 1 || ctx.fast); },
  perf(ctx, a) { return a.cur === undefined ? null : a.cur; },
  camera(ctx) {
    const hs = ctx.athletes.filter(a => a.human), f = hs.length ? hs : [ctx.athletes.reduce((b, a) => (a.S.d || 0) > (b.S.d || 0) ? a : b, ctx.athletes[0])];
    const x = f.reduce((s, a) => s + xOf(a.S.d || 0), 0) / f.length; game.focus(x + 20, 130, 0); game.setZoom(1.05);
  },
  draw(ctx, r) {
    PL.drawVenue(r, { jumbo: ['50M FREESTYLE', ctx.S.gunT != null ? Math.max(0, ctx.t - ctx.S.gunT).toFixed(1) : 'READY'] });
    for (const a of ctx.athletes) { const s = a.S; if (!a.rig || s.d === undefined) continue; const x = xOf(s.d), y = PL.laneY(s.lane), z = s.state === 'blocks' || s.state === 'dive' ? 6 : -3;
      if (z < 0) r.shadow(x, y, 9, .25, '#0a3a6a');
      r.actor(x, y, z, (g, ox, oy) => a.rig.draw(g, ox, oy, r.view), { flash: a.turboT > 0 ? '#60e0ff' : false, flashMix: .3 });
      if (s.state === 'swim' && s.since < .15 && !ctx.fast) game.particles.bits(x + (s.d > 25 ? -6 : 6), y, 0, 1, ['#ffffff', '#cfefff']);
      if (a.turboT > 0) { const dx = x + Math.sin(game.real * 4) * 30, dz = Math.abs(Math.sin(game.real * 4)) * 20; r.queue(dx, y + 15, dz, g => { const p = r.w(dx, y + 15, dz); px.ell(g, p[0], p[1], 7, 3, '#5a8ad8'); px.rect(g, p[0] + 5, p[1] - 4, 2, 3, '#5a8ad8'); }); }
    }
  },
  hud(ctx, r, g) {
    const S = ctx.S; O.HUD.header(g, r, ctx);
    O.HUD.big(g, r.W - 14, 10, (S.order[0] && ctx.phase !== 'play' ? S.order[0].S.time : S.gunT != null ? ctx.t - S.gunT : 0).toFixed(2));
    if (S.stage === 'marks') O.text(g, 'TAKE YOUR MARKS', r.W / 2, r.H * .22, '#ffffff', { align: 'center', scale: 2 });
    if (S.stage === 'set') O.text(g, '...', r.W / 2, r.H * .22, '#ffd060', { align: 'center', scale: 3 });
    ctx.athletes.filter(a => a.human).forEach((a, i) => {
      const s = a.S, w = 132, x = 10 + i * (w + 8), y = r.H - 58;
      O.panel(g, x, y, w, 48, { border: a.color || '#f2b632', alpha: .85 });
      O.HUD.tag(g, x + 4, y + 4, a); O.text(g, a.short + (s.turned ? '  LAP 2' : '  LAP 1'), x + 28, y + 5, '#ffffff');
      // the stroke ring: the next expected button closing on the beat
      if (s.state === 'swim') { const cx = x + 22, cy = y + 30, k = 1 - Math.min(1, s.ph); px.disc(g, cx, cy, 9, '#141a3a'); for (let t = 0; t < 24; t++) { const an = t / 24 * Math.PI * 2, rr = 9 + k * 10; px.rect(g, Math.round(cx + Math.cos(an) * rr), Math.round(cy + Math.sin(an) * rr), 1, 1, '#ffffff'); } O.Prompt.draw(g, cx, cy - 4, s.side === 'L' ? 'mashL' : 'mashR', { input: a.input, align: 'center' }); if (s.lastJ) O.text(g, s.lastJ, x + 40, y + 26, s.lastJ === 'PERFECT' ? '#f2c94c' : s.lastJ === 'GOOD' ? '#4fe0a8' : '#ff6b6b'); }
      else if (s.state === 'blocks' && S.stage === 'race') O.Prompt.draw(g, x + 8, y + 24, 'action', { input: a.input, label: 'DIVE!', color: '#ffd060' });
      else if (s.state === 'dive') O.Prompt.draw(g, x + 8, y + 24, 'action', { input: a.input, label: 'RELEASE!', color: '#ffd060' });
      // O2 bubbles
      for (let k = 0; k < 5; k++) px.disc(g, x + w - 40 + k * 6, y + 40, 2, s.o2 > k / 5 ? (s.o2 < .25 ? '#ff6b6b' : '#7fd8ff') : '#2a3060');
      if (s.since < .4 && s.o2 < .7 && game.settings.hints) O.Prompt.draw(g, x + w - 44, y + 24, 'alt', { input: a.input, label: 'BREATHE', color: '#7fd8ff' });
      O.HUD.flame(g, x + w - 12, y + 4, a, a.input);
      const toWall = s.turned ? 50 - s.d : 25 - s.d; if (s.state === 'swim' && toWall < 2.2 && toWall > 0) O.Prompt.draw(g, x + w + 6, y + 8, 'action', { input: a.input, label: s.turned ? 'TOUCH!' : 'TURN!', color: '#ffd060', size: 2 });
    });
  },
  ghostState(ctx, a) { return [xOf(a.S.d || 0), 0, -3, a.S.d > 25 ? Math.PI : 0, 3]; },
  ghostDraw(ctx, r, s, i) { return [s[0], PL.laneY([2, 7, 1, 8][i % 4]), s[2]]; }
});
function interval(ctx, a) { const s = a.S, T = ctx.T, spm = 50 + 50 * Math.min(1.2, s.v / T.vMax); return 60 / spm; }
function judge(ctx, a, q, j, near, auto) {
  const s = a.S; s.q += (q - s.q) * .35; s.lastJ = j;
  if (near === false) { s.v *= .97; return; }   // an extra press between beats: wasted, the beat still waits
  s.strokes++; s.since = 0; s.breathed = false; s.pressedThis = false;
  if (q === 0) { s.v *= .95; if (a.human && !auto) ctx.fx.sfx('splash', { vol: .25 }); } else if (q === 1) ctx.hype(a, .02);
  s.side = s.side === 'L' ? 'R' : 'L'; s.ph = near === false ? s.ph : Math.max(0, s.ph - 1);
  if (s.ph < -.5) s.ph = 0;
}
function animate(ctx, a, dt) {
  const s = a.S, rig = a.rig;
  rig._ph = (rig._ph || 0) + dt * (s.state === 'swim' ? Math.PI * 2 / interval(ctx, a) / 2 : 2);
  if (s.state === 'blocks') O.Pose.set(rig, 'diveStart', { u: 0 });
  else if (s.state === 'dive') O.Pose.set(rig, 'diveStart', { u: Math.min(1, s.diveHold * 2) });
  else if (s.state === 'done') { O.Pose.set(rig, null); rig.bodyPitch = 0; }
  else if (s.state === 'glide' || s.state === 'push') { O.Pose.set(rig, 'streamline'); rig.bodyPitch = -Math.PI / 2 * .98; rig.pivot = [0, 0, rig.o.hipZ]; }
  else O.Pose.set(rig, 'swimCrawl', { phase: rig._ph });
  const fac = s.d > 25 || (s.turned) ? Math.PI : 0;
  rig.update(dt, { x: xOf(s.d), y: PL.laneY(s.lane), z: 0, vx: 0, vy: 0, facing: fac, pose: s.state === 'done' && ctx.S.order[0] === a ? 'cheer' : null });
}
})();
