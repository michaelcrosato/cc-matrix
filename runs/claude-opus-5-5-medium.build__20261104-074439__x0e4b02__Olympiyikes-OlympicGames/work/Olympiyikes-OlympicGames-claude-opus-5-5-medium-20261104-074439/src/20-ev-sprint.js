/* OLYMPIYIKES! — Glory Stadium (shared by the 100m, the javelin and the ceremonies) and the 100m DASH (§6.1). */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, clamp = E.clamp;

/* ---- Glory Stadium: an 8-lane track along x, infield grass, stands, gantry, jumbotron, blimp ---- */
const ST = O.Stadium = { X0: 120, M: 12, laneY: l => 40 + (8 - l) * 18, W: 2480, JY: 222 };
const trackTex = (x, y) => {
  const n = E.hash2(Math.floor(x), Math.floor(y)) - .5;
  if (y >= 31 && y < 176) {
    const ly = (y - 31) % 18;
    if (ly < 1.1 && y < 175) return [236 + n * 14, 236 + n * 14, 240];
    if (Math.abs(x - ST.X0) < 1 || Math.abs(x - (ST.X0 + 1200)) < 1.5) return [244, 244, 248];
    if (x > ST.X0 + 1196 && x < ST.X0 + 1204 && Math.floor(y / 3) % 2 === Math.floor(x / 3) % 2) return [20, 20, 24];
    const g = 160 + n * 26; return [g * 1.02, g * .38, g * .3];
  }
  if (y >= 176 && y < 180) return [220 + n * 20, 220, 225];
  if (y < 31 && y > 27) return [220, 220, 225];
  if (y < 27) { const g = 120 + n * 20; return [g * .9, g * .9, g]; }
  const stripe = Math.floor(x / 48) % 2 ? 1 : 0, m = E.noise2(x * .05, y * .05) * 18, g = (stripe ? 150 : 124) + n * 30 + m;
  return [g * .42, g, g * .44];
};
ST.map = null;
ST.build = () => {
  if (ST.map) return ST.map;
  const cols = Math.ceil(ST.W / 16), rows = 17, R = [];
  for (let y = 0; y < rows; y++) R.push('.'.repeat(cols));
  void 0; ST.map = new E.TileMap({ rows: R, legend: { '.': { floor: 'track' } }, floorTex: trackTex, outside: '#3a7a3a', ao: 0, types: {} });
  return ST.map;
};
const CROWD_COLS = () => O.NATIONS.flatMap(n => [n.colors.a, n.colors.b]).concat(['#ffffff', '#e8e8f0', '#3a3a4a']);
let crowdCols = null;
ST.drawVenue = (r, o = {}) => {
  crowdCols = crowdCols || CROWD_COLS();
  const night = !!o.night;
  r.sky(night ? ['#05061a', '#141a48', '#2a2050'] : ['#4aa8f0', '#8ccaf8', '#d8f0ff']);
  const map = ST.build(); map.drawFloor(r);
  // the stands behind lane 8, three tiers
  Art_standBlock(r, -200, ST.W + 200, 4, 14, night);
  // the advertising boards in front of lane 1 (cut low)
  r.queue(ST.W / 2, 186, 0, g => {
    for (let x = -100; x < ST.W + 100; x += 96) { const a = r.w(x, 186, 0), b = r.w(x + 94, 186, 0), t = r.w(x, 186, 7); if (b[0] < -10 || a[0] > r.W + 10) continue; const k = Math.floor(x / 96) & 7, n = O.NATIONS[(k + 8) % 8]; px.rect(g, a[0], t[1], b[0] - a[0], a[1] - t[1], n.colors.a); px.rect(g, a[0], t[1], b[0] - a[0], 1, '#ffffff'); if (b[0] - a[0] > 40) E.font.text(g, ['GO YIKES', 'MOUNT GLORY', 'SUNNY BAY', 'OLYMPIYIKES', 'FASTER!', 'HIGHER!', 'YIKES!', 'GLORY'][k], (a[0] + b[0]) / 2, t[1] + 1, n.colors.c === '#ffffff' ? '#1a1d2e' : n.colors.c, { align: 'center', outline: false, font: 'tiny' }); }
  }, { bias: 50 });
  // finish gantry and clock
  const fx = ST.X0 + 1200;
  for (const yy of [26, 180]) r.queue(fx, yy, 0, g => { const a = r.w(fx, yy, 0), b = r.w(fx, yy, 46); px.rect(g, a[0] - 1, b[1], 3, a[1] - b[1], '#d8dce8'); }, { bias: 0 });
  r.queue(fx, 100, 46, g => { const a = r.w(fx, 26, 46), b = r.w(fx, 180, 46); px.rect(g, Math.min(a[0], b[0]) - 2, Math.min(a[1], b[1]) - 4, Math.abs(b[0] - a[0]) + 5, Math.abs(b[1] - a[1]) + 8, '#2a2f4a'); E.font.text(g, 'FINISH', (a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 3, '#ffd060', { align: 'center', outline: false, font: 'tiny' }); }, { bias: 60 });
  // flags of the nations on the rim
  O.NATIONS.forEach((n, i) => { const x = ST.X0 - 60 + i * 230; r.queue(x, -40, 64, g => { const p = r.w(x, -40, 64); px.rect(g, p[0], p[1], 1, 22, '#c8ccd8'); O.Art.flag(g, p[0] + 1, p[1], 14, 9, n, true); }, { bias: -900 }); });
  // the blimp
  if (!o.noBlimp) { const bx = ((game.real * 18) % 2400) - 300 + (o.blimpX || 0); r.queue(bx, -80, 150, g => { const p = r.w(bx, -80, 150); px.ell(g, p[0], p[1], 34, 11, '#d8dce8'); px.ell(g, p[0], p[1] + 2, 34, 9, '#b8bcc8'); px.rect(g, p[0] - 8, p[1] + 9, 16, 4, '#5a6080'); E.font.text(g, 'YIKES', p[0], p[1] - 3, '#e8443a', { align: 'center', outline: false, font: 'tiny' }); }, { bias: -1200 }); }
};
function Art_standBlock(r, x0, x1, y, rows, night) {
  r.queue((x0 + x1) / 2, y, 0, g => {
    const a = r.w(x0, y, 0), b = r.w(x1, y, 0), top = r.w(x0, y, rows * 7);
    const L = clamp(Math.min(a[0], b[0]), -20, r.W + 20), Rr = clamp(Math.max(a[0], b[0]), -20, r.W + 20); if (Rr <= L) return;
    px.rect(g, L, 0, Rr - L, a[1], night ? '#141832' : '#3a4266');
    px.rect(g, L, top[1] - 10, Rr - L, 10, night ? '#202650' : '#525a80');
    for (let i = 0; i <= rows; i++) { const yy = r.w(x0, y, i * 7)[1]; px.rect(g, L, yy, Rr - L, 1, night ? '#2a3060' : '#5a6290'); }
    O.Art.crowd(g, L, top[1] + 1, Rr - L, a[1] - top[1] - 3, O.Crowd.level, 3, crowdCols, { wave: O.Crowd.wave > 0, rowH: 7, step: 4 });
    px.rect(g, L, a[1] - 3, Rr - L, 4, '#20253e');
  }, { bias: -1000 });
}
ST.athleteDraw = (r, a, x, y, z, o = {}) => {
  r.shadow(x, y, 6, .35);
  r.actor(x, y, z, (g, ox, oy) => a.rig.draw(g, ox, oy, r.view), { alpha: o.alpha, flash: a.turboT > 0 ? '#ffb040' : false, flashMix: .25 });
  if (a.turboT > 0 && !o.alpha) game.particles.fire(x - 4, y, z + 4, 1, { size: 3 });
};
ST.laneTag = (r, g, a, x, y, z) => { const p = r.w(x, y, z + 44); O.HUD.tag(g, p[0] - 8, p[1] - 6, a); };

/* ---- 100m DASH ---- */
const LANES_H = [4, 5, 3, 6], ORDER = [4, 5, 3, 6, 2, 7, 1, 8];
O.defEvent({
  id: 'sprint', name: '100m DASH', short: '100m', season: 'summer', venue: 'Glory Stadium', pictogram: 'sprint', music: 'sprint', view: 'brawler', sport: 'track', lights: .85,
  format: { type: 'race' }, maxTime: 30,
  measure: { better: 'lower', unit: 's', fmt: v => v.toFixed(2) + ' s', wr: [9.48, 'TRB', 'MAX OVERDRIVE'], qualify: { Easy: 12.30, Normal: 11.40, Hard: 10.60 } },
  points: t => 25.4347 * Math.pow(Math.max(0, 18 - t), 1.81),
  tune: { vMax: [11.6, 8, 16, .1, 'Top speed (m/s)'], accel: [9, 4, 16, .1, 'Accel (m/s²)'], decel: [5, 1, 12, .1, 'Decel (m/s²)'], turboMult: [1.12, 1, 1.5, .01, 'Turbo speed ×'],
    dipLead: [.35, 0, .8, .01, 'Dip lead (m)'], faceplantTime: [1.4, .3, 4, .1, 'Faceplant time (s)'], stumbleStreak: [3, 2, 6, 1, 'Stumble streak'], falseStartMin: [.1, .05, .2, .005, 'False-start min (s)'] },
  howto: { goal: 'Fastest to the line wins.', rows: [['pair', 'Alternate to run'], [['action'], 'React to the gun · dip at the line'], [['turbo'], 'Turbo when the flame is full']] },
  yikesKinds: ['FALSE START!', 'FACEPLANT'],
  laurel: { id: 'rocket', name: 'ROCKET MAN', text: 'React in 0.120 s or less and win', test: (ctx, a) => a.S.react != null && a.S.react <= .12 && ctx.athletes.every(b => b === a || b.S.time == null || a.S.time == null || a.S.time <= b.S.time) && a.S.time != null },
  hub: { ok: true, attempts: 1, seconds: 35 }, attract: { seconds: 18, after: 3, setup(ctx) { ctx.S.stage = 'set'; ctx.S.stageT = 0; ctx.S.gunAt = .8; } },
  turbo: 'TURBO!',
  phases: [['marks', ctx => { ctx.S.stage = 'marks'; ctx.S.stageT = 0; }], ['gun', ctx => { ctx.S.stage = 'set'; ctx.S.gunAt = 0; ctx.S.stageT = 0; }], ['50m', ctx => { for (const a of ctx.athletes) { a.S.d = 50; a.S.state = 'run'; a.S.v = 10; } ctx.S.stage = 'race'; ctx.S.gunT = ctx.t - 5; }], ['finish', ctx => { for (const a of ctx.athletes) { a.S.d = 97; a.S.state = 'run'; a.S.v = 11; } ctx.S.stage = 'race'; ctx.S.gunT = ctx.t - 9; }]],
  intro(ctx, dt) {
    const S = ctx.S; S.introT = (S.introT || 0) + dt;
    const k = Math.floor(S.introT / .75);
    if (k !== S.introK && k < 8) { S.introK = k; const a = ctx.athletes.find(b => b.S.lane === 8 - k); if (a && k < 8) { O.Comms.say('P:In lane ' + a.S.lane + '... representing ' + a.nat.name + '... ' + a.name + '!', null, 2); } }
    return S.introT > 6.2;
  },
  build(ctx) {
    ST.build();
    const hum = ctx.athletes.filter(a => a.human), cpu = ctx.athletes.filter(a => !a.human).sort((a, b) => (b.rival ? 1 : 0) - (a.rival ? 1 : 0) || b.pilot.skill - a.pilot.skill);
    let lanes = ORDER.slice(); const used = [];
    hum.forEach((a, i) => { a.S = { lane: LANES_H[i] }; used.push(LANES_H[i]); });
    lanes = lanes.filter(l => !used.includes(l));
    cpu.forEach((a, i) => { a.S = { lane: lanes[i] }; });
  },
  start(ctx) {
    ctx.S = Object.assign(ctx.S || {}, { stage: 'marks', stageT: 0, gunAt: 1 + ctx.rng('gun')() * 1.2, gunT: null, order: [], photo: false, lead: null, introT: ctx.S && ctx.S.introT });
    for (const a of ctx.active) {
      const lane = a.S.lane || 4, r = ctx.rng('cpu:' + a.id);
      a.S = { lane, d: 0, v: 0, state: 'blocks', react: null, fs: a.S.fs || 0, dip: 0, dipT: 0, slowT: 0, downT: 0, time: null, sameHit: 0, r, fsPlan: null, pw: 0 };
      if (!a.human && a.pilot.cheat !== 'perfect') { const ch = (1 - a.pilot.skill) * .06; if (r() < ch) a.S.fsPlan = .3 + r() * .5; a.S.botReact = Math.max(.1, .24 - .11 * a.pilot.skill + (r() * 2 - 1) * .03); a.S.botRate = 6.5 + 4.2 * a.pilot.skill + (r() * 2 - 1) * .4; }
      else if (a.pilot.cheat === 'perfect') { a.S.botReact = .102; a.S.botRate = 12; }
      else { a.S.botReact = .14; a.S.botRate = 11.2; }
    }
  },
  bot(ctx, a, dt, I) {
    const S = ctx.S, s = a.S;
    if (S.stage === 'set' && s.fsPlan != null && S.stageT > s.fsPlan && s.fs === 0) { I.A = true; s.fsPlan = null; }
    if (S.stage === 'race' && s.state === 'blocks' && ctx.t - S.gunT >= (s.botReact || .2)) { I.L = true; a._bs = true; }
    if (s.state === 'run') {
      O.botMash(a, s.botRate || 9, dt, I);
      const left = 100 - s.d;
      if (!s.dip && left < (a.pilot.cheat === 'perfect' ? .9 : 1.1 + (1 - a.pilot.skill) * 1.6)) I.A = true;
      if (s.d > 50 && a.hype >= 1) I.T = true;
    }
    return I;
  },
  step(ctx, dt) {
    const S = ctx.S, T = ctx.T;
    S.stageT += dt;
    if (S.stage === 'marks') { if (S.stageT > 1.2) { S.stage = 'set'; S.stageT = 0; ctx.fx.sfx('beep'); } }
    else if (S.stage === 'set') { if (S.stageT >= S.gunAt) { S.stage = 'race'; S.stageT = 0; S.gunT = ctx.t; ctx.fx.sfx('gun'); ctx.fx.flash('#ffffff', .06); ctx.fx.P.smoke(ST.X0 - 20, 4, 30, 6, { size: 5 }); O.Crowd.excite(.4); ctx.fx.say('start'); } }
    for (const a of ctx.active) {
      const s = a.S, I = a.I;
      if (s.state === 'dq' || s.state === 'done') { s.v = Math.max(0, s.v - 6 * dt); s.d += s.v * dt; continue; }
      const anyPress = I.L || I.R || I.A;
      if (S.stage === 'set' && anyPress) { falseStart(ctx, a); continue; }
      if (s.state === 'blocks' && S.stage === 'race' && anyPress) {
        const react = ctx.t - S.gunT;
        if (react < T.falseStartMin && !ctx.god(a)) { falseStart(ctx, a); continue; }
        s.react = react; s.state = 'run'; s.v = 1.2; if (react < .15) ctx.hype(a, .35);
        if (a.human) ctx.fx.banner('REACTION ' + react.toFixed(3), { y: .18, life: 1.2, scale: 1 });
      }
      if (s.state === 'down') { s.downT -= dt; s.v = Math.max(0, s.v - 20 * dt); s.d += s.v * dt; if (s.downT <= 0) { s.state = 'run'; s.v = 1; } continue; }
      if (s.state !== 'run') continue;
      // stumble / faceplant from a same-button streak
      if (a.mash.same >= T.stumbleStreak && a.mash.same !== s.sameHit && !ctx.god(a)) {
        s.sameHit = a.mash.same;
        if (a.mash.same >= T.stumbleStreak + 2) { s.state = 'down'; s.downT = T.faceplantTime; s.v *= .3; ctx.yikes(a, 'FACEPLANT', 'faceplant'); ctx.fx.P.dust(ST.X0 + s.d * ST.M, ST.laneY(s.lane), 0, 10); continue; }
        s.slowT = .3; if (a.human) ctx.fx.sfx('bump', { vol: .5 });
      }
      if (a.mash.same === 0) s.sameHit = 0;
      const pw = a.mash.power(); s.pw = pw;
      const vMax = T.vMax * ctx.turboMult(a, T.turboMult), vt = vMax * pw;
      let acc = T.accel * (s.d < 30 ? .6 + .4 * s.d / 30 : 1);
      if (s.v < vt) s.v = Math.min(vt, s.v + acc * dt); else s.v = Math.max(vt, s.v - T.decel * dt);
      if (s.slowT > 0) { s.slowT -= dt; s.v *= Math.pow(.6, dt); }
      if (pw > .85) { s.hT = (s.hT || 0) + dt; if (s.hT > 1) { s.hT = 0; ctx.hype(a, .08); } }
      // the dip
      if (I.A && !s.dip) { const left = 100 - s.d; if (left < 2.5) { s.dip = left < 1.2 ? 1 : .5; s.dipT = 0; if (s.dip === 1) ctx.hype(a, .1); else s.slowT = .3; } }
      if (s.dip) s.dipT += dt;
      const lead = s.dip === 1 ? T.dipLead : 0;
      const d0 = s.d; s.d += s.v * dt;
      if (d0 + lead < 100 && s.d + lead >= 100) {
        const frac = (100 - lead - d0) / Math.max(1e-6, s.d - d0); s.time = ctx.t - dt + frac * dt - S.gunT; s.state = 'done';
        S.order.push(a); ctx.finish(a, Math.round(s.time * 1000) / 1000);
        if (S.order.length === 1) { O.Crowd.excite(.6); ctx.fx.sfx('cheerSwell'); }
        if (S.order.length === 2 && S.order[1].S.time - S.order[0].S.time < .05 && !S.photo) { S.photo = true; ctx.fx.slowmo(.25, 1); ctx.fx.banner('PHOTO FINISH!', { y: .25, life: 1.6, scale: 2 }); ctx.fx.say('photo'); }
      }
    }
    // the lead and commentary
    if (S.stage === 'race' && !ctx.fast) {
      let lead = null; for (const a of ctx.active) if (!lead || a.S.d > lead.S.d) lead = a;
      if (lead && lead !== S.lead && lead.S.d > 30 && lead.S.d < 95) { S.lead = lead; ctx.fx.say('lead', { name: lead.short, nation: lead.nat.name }); }
      if (S.stageT > 3 && S.stageT < 3.1) ctx.fx.say('sprint', { name: (S.lead || ctx.active[0]).short, nation: (S.lead || ctx.active[0]).nat.name });
    }
    if (!ctx.sandbox) for (const a of ctx.active) animate(ctx, a, dt);
  },
  done(ctx) { const S = ctx.S; return S.stage === 'race' && ctx.active.every(a => a.fin) && (ctx.t - S.gunT > 1.2 || ctx.fast); },
  perf(ctx, a) { return a.cur === undefined ? null : a.cur; },
  camera(ctx, dt, phase) {
    if (phase === 'intro') { const k = Math.min(1, (ctx.S.introT || 0) / 6); game.focus(ST.X0 + 10, ST.laneY(8) - k * 90, 20); game.setZoom(1.6); return; }
    const hs = ctx.athletes.filter(a => a.human), focus = hs.length ? hs : [ctx.athletes.reduce((b, a) => a.S.d > b.S.d ? a : b, ctx.athletes[0])];
    const x = focus.reduce((s, a) => s + a.S.d, 0) / focus.length;
    game.focus(ST.X0 + Math.min(110, x) * ST.M + 40, ST.laneY(4.5), 14); game.setZoom(ctx.S.stage === 'race' ? 1.1 : 1.35);
  },
  draw(ctx, r) {
    ST.drawVenue(r);
    for (const a of ctx.athletes) { const s = a.S; if (!a.rig) continue; ST.athleteDraw(r, a, ST.X0 + (s.d || 0) * ST.M, ST.laneY(s.lane || 4), 0); }
    // start blocks
    for (let l = 1; l <= 8; l++) r.queue(ST.X0 - 6, ST.laneY(l), 0, g => { const p = r.w(ST.X0 - 6, ST.laneY(l), 0); px.rect(g, p[0] - 3, p[1] - 2, 6, 3, '#5a5a6a'); });
  },
  hud(ctx, r, g) {
    const S = ctx.S;
    O.HUD.header(g, r, ctx);
    const t = S.gunT != null ? Math.max(0, ctx.t - S.gunT) : 0, lead = S.order[0];
    O.HUD.big(g, r.W - 14, 10, (lead && ctx.phase !== 'play' ? lead.S.time : t).toFixed(2), '#ffffff');
    if (S.stage === 'marks') O.text(g, 'ON YOUR MARKS', r.W / 2, r.H * .22, '#ffffff', { align: 'center', scale: 2 });
    if (S.stage === 'set') O.text(g, 'SET...', r.W / 2, r.H * .22, '#ffd060', { align: 'center', scale: 3 });
    if (S.stage === 'race' && S.stageT < .6) O.title(g, 'GO!', r.W / 2, r.H * .2, 4);
    // lane tags and reaction times
    for (const a of ctx.athletes) { if (a.human || a.rival) ST.laneTag(r, g, a, ST.X0 + a.S.d * ST.M, ST.laneY(a.S.lane), 0); }
    hudHumans(ctx, r, g);
    if (S.stage === 'race' && O.Art.jumbo) { const ld = ctx.athletes.reduce((b, a) => a.S.d > b.S.d ? a : b, ctx.athletes[0]); O.Art.jumbo(g, r.W - 110, 30, 96, 22, [ld.nat.id + ' ' + ld.short, Math.min(100, ld.S.d).toFixed(0) + ' M']); }
  },
  ghostState(ctx, a) { return [ST.X0 + a.S.d * ST.M, 0, 0, 0, a.S.state === 'run' ? 1 : 0]; },
  ghostDraw(ctx, r, s, i) { return [s[0], ST.laneY([2, 7, 1, 8][i % 4]), 0]; }
});
function hudHumans(ctx, r, g) {
  const hs = ctx.athletes.filter(a => a.human); const S = ctx.S;
  hs.forEach((a, i) => {
    const w = 110, x = 10 + i * (w + 8), y = r.H - 46;
    O.panel(g, x, y, w, 36, { border: a.color || '#f2b632', alpha: .85 });
    O.HUD.tag(g, x + 4, y + 4, a); O.text(g, a.short, x + 30, y + 5, '#ffffff');
    O.HUD.power(g, x + 6, y + 18, 70, a.S.pw || 0);
    O.HUD.flame(g, x + w - 14, y + 6, a, a.input);
    if (a.S.react != null) O.text(g, 'RT ' + a.S.react.toFixed(3), x + 6, y + 27, '#9aa2c8', { font: 'tiny' });
    if (S.stage !== 'marks' && a.S.state !== 'done' && game.settings.hints) O.Prompt.pair(g, x + 6, y - 14, { input: a.input, label: a.S.state === 'blocks' ? 'GO!' : 'RUN', phase: a.mash.last === 'L' ? 1 : 0 });
    if (a.S.state === 'run' && 100 - a.S.d < 6 && !a.S.dip) O.Prompt.draw(g, x + w + 4, y - 14, 'action', { input: a.input, label: 'DIP!', color: '#ffd060' });
  });
}
O.sprintHudHumans = hudHumans;
function falseStart(ctx, a) {
  const S = ctx.S, s = a.S; s.fs++;
  ctx.yikes(a, 'FALSE START!', 'falsestart'); ctx.fx.sfx('gun'); ctx.fx.sfx('whistle');
  if (s.fs >= 2) { s.state = 'dq'; ctx.dnf(a, 'DQ'); }
  S.stage = 'marks'; S.stageT = 0; S.gunAt = 1 + ctx.rng('gun' + s.fs)() * 1.2;
  for (const b of ctx.active) if (b.S.state !== 'dq') { b.S.state = 'blocks'; b.S.d = 0; b.S.v = 0; b.S.react = null; b.mash.reset(); }
}
function animate(ctx, a, dt) {
  const s = a.S, rig = a.rig, x = ST.X0 + s.d * ST.M, y = ST.laneY(s.lane);
  if (s.state === 'blocks') O.Pose.set(rig, ctx.S.stage === 'set' ? 'set' : 'blocks');
  else if (s.state === 'down') O.Pose.set(rig, null);
  else if (s.dip && s.dipT < .8) O.Pose.set(rig, 'dip');
  else O.Pose.set(rig, null);
  const st = { x, y, z: 0, vx: s.v * ST.M * (s.state === 'run' ? 1 : 0), vy: 0, facing: 0 };
  if (s.state === 'down') { st.down = Math.min(1, (ctx.T.faceplantTime - s.downT) * 3); st.flip = s.downT > ctx.T.faceplantTime - .4 ? 1 - (s.downT - (ctx.T.faceplantTime - .4)) / .4 : 0; }
  if (s.state === 'done') { st.pose = ctx.S.order[0] === a ? 'cheer' : null; st.vx = s.v * ST.M; }
  if (s.state === 'dq') st.pose = 'kneel';
  rig.update(dt, st);
}
})();
