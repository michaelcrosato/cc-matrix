// 100m DASH — summer · Glory Stadium · mash. And Glory Stadium itself (O.Venue.stadium), which the javelin and the
// ceremonies reuse.
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, { clamp, lerp } = E;
const UI = O.UI, Art = O.Art, M = 12;
O.Venue = O.Venue || {};

// ---------------------------------------------------------------------------------------------------------------
// Glory Stadium (brawler view): sky, rim, floodlights, jumbotron, stands with the crowd, track, infield, boards
// ---------------------------------------------------------------------------------------------------------------
const LANE_Y = i => 30 + (7 - i) * 22;           // lane index 0..7 (lane 1 = index 0 nearest the camera)
O.LANE_Y = LANE_Y;
O.Venue.stadium = (r, o = {}) => {
  const g = r.ctx, W = r.W, t = game.real, night = !!o.night;
  // sky
  const sky = night ? ['#060818', '#0e1638', '#2a2a5a'] : ['#3a8ae8', '#7ab8f0', '#cfe6f8'];
  const top = r.w(0, -30, 70)[1], horizon = r.w(0, -24, 50)[1];
  Art.sky(g, r.bw, Math.max(10, horizon + 10), sky);
  if (night) { for (let i = 0; i < 60; i++) { const sx = (i * 89 + Math.floor(r.ix * .05)) % r.bw, sy = (i * 37) % Math.max(10, horizon); px.dot(g, sx, sy, i % 3 ? '#8a90c8' : '#ffffff'); } }
  else Art.clouds(g, r.bw, 8, t, { n: 5, speed: 3, spread: 28 });
  // distant city / mountain glory beyond the rim (the ski jump floodlit beyond)
  const camX = (r.ix + W / 2) / 1.5;
  const par = -camX * .15;
  for (let i = 0; i < 8; i++) { const bx = ((i * 90 + par) % 720 + 720) % 720 - 90, bh = 18 + (i * 13) % 26; px.rect(g, bx, horizon - bh, 46, bh + 4, night ? '#141a3a' : '#9ab8d8'); for (let k = 0; k < 6; k++) px.rect(g, bx + 4 + k * 7, horizon - bh + 4 + (k % 2) * 6, 2, 2, night ? '#ffe08a' : '#c8daf0'); }
  const sjx = ((380 + par * .6) % 900 + 900) % 900 - 100;
  px.poly(g, [[sjx, horizon - 70], [sjx + 8, horizon - 70], [sjx + 70, horizon], [sjx + 40, horizon]], night ? '#2a3060' : '#d8e4f4');
  if (night) for (let k = 0; k < 6; k++) r.glowDisc(g, sjx + 8 + k * 11, horizon - 64 + k * 11, 6, '#ffe8a0', .5);
  // the blimp
  if (o.blimp !== false) Art.blimp(g, ((t * 12 + 200 + par * .3) % (W + 160)) - 80, 22 + Math.sin(t * .3) * 4, t, { popped: o.blimpPopped });
  // stands: upper rim, three tiers
  const x0 = 0, x1 = r.bw;
  const yTop = r.w(0, -20, 40)[1], yMid = r.w(0, -4, 20)[1], yBot = r.w(0, 12, 0)[1];
  px.rect(g, x0, yTop - 8, x1, 8, night ? '#1a1e36' : '#c8ccd8'); px.rect(g, x0, yTop - 8, x1, 2, night ? '#2a3050' : '#ffffff');
  // floodlight towers
  for (let k = 0; k < 6; k++) { const lx = Math.round(((k * 260 - r.ix) % 1560 + 1560) % 1560 - 60); if (lx < -40 || lx > x1 + 40) continue; px.rect(g, lx, yTop - 44, 3, 40, '#8a90a8'); px.rect(g, lx - 9, yTop - 52, 21, 9, '#3a3f5a'); for (let q = 0; q < 4; q++) px.rect(g, lx - 7 + q * 5, yTop - 50, 3, 5, night ? '#fff6c8' : '#e8ecf8'); if (night) r.glowDisc(g, lx + 1, yTop - 48, 22, '#fff2c0', .55); }
  // flags of the nations on the rim
  for (let k = 0; k < 24; k++) { const fx = Math.round(((k * 70 - r.ix * 1) % 1680 + 1680) % 1680 - 40); if (fx < -20 || fx > x1) continue; Art.flagPole(g, fx, yTop - 8, 14, 12, 8, O.NATION_IDS[k % 8], t + k); }
  Art.stands(g, x0, yTop, x1, yBot, { tiers: 3, seed: 3, scroll: r.ix, dark: night, rail: night ? '#6a6e88' : '#d8dce8', lip: night ? '#2a2440' : '#5a4a7a', bg: night ? '#1a1830' : '#3a3058' });
  void yMid;
  // the jumbotron, standing over the stands near the finish
  const jx = r.w(o.jumboX || 1330, 0, 0)[0];
  if (jx > -200 && jx < x1 + 200) {
    const jw = 120, jh = 50, jy = yTop - 70;
    px.rect(g, jx + jw / 2 - 3, jy + jh, 6, yTop - jy - jh, '#3a3f5a');
    Art.jumbo(g, jx, jy, jw, jh, o.jumbo || ['GLORY STADIUM', 'OLYMPIYIKES!']);
  }
  // track and infield
  const yT0 = 18, yT1 = 196;
  const xa = (r.ix - 40) / 1.5, xb = (r.ix + W + 40) / 1.5;
  Art.quad(r, [[xa, 12, 0], [xb, 12, 0], [xb, yT0, 0], [xa, yT0, 0]], '#d8d8d0');
  Art.quad(r, [[xa, yT0, 0], [xb, yT0, 0], [xb, yT1, 0], [xa, yT1, 0]], o.trackColor || '#c4472f');
  // track texture: speckles
  for (let i = 0; i < 160; i++) { const h = O.hash('trk' + i), wx = Math.floor(xa / 40) * 40 + (h % 900) + ((i * 37) % 40), wy = yT0 + (h >>> 8) % (yT1 - yT0); const p = r.w(wx, wy, 0); px.dot(g, p[0], p[1], (h >>> 3) % 2 ? '#d45a40' : '#a83a28'); }
  // lane lines
  for (let i = 0; i <= 8; i++) { const yy = i === 8 ? LANE_Y(7) - 11 : LANE_Y(i) + 11; Art.wline(r, [xa, yy, 0], [xb, yy, 0], '#f4f0e8', 1); }
  // the infield, the near side
  Art.quad(r, [[xa, yT1, 0], [xb, yT1, 0], [xb, 260, 0], [xa, 260, 0]], o.infield || '#3e9a3a');
  for (let k = Math.floor(xa / 80); k < xb / 80 + 1; k++) if (k % 2) Art.quad(r, [[k * 80, yT1 + 4, 0], [k * 80 + 80, yT1 + 4, 0], [k * 80 + 80, 260, 0], [k * 80, 260, 0]], o.infield2 || '#48a842');
  // start and finish lines, distance marks, lane numbers
  if (o.marks !== false) {
    Art.wline(r, [0, yT0, 0], [0, yT1, 0], '#ffffff', 2);
    const fx = 1200; for (let j = 0; j < 44; j++) { const y0 = yT0 + j * 4; Art.quad(r, [[fx - 2, y0, 0], [fx + 2, y0, 0], [fx + 2, y0 + 4, 0], [fx - 2, y0 + 4, 0]], j % 2 ? '#141414' : '#ffffff'); }
    for (let m = 10; m < 100; m += 10) { const p = r.w(m * M, yT1 + 6, 0); if (p[0] > -20 && p[0] < r.bw + 20) E.font.text(g, m + 'm', p[0] - 6, p[1] - 2, '#ffffff', { font: 'tiny', outline: '#2a4a2a' }); Art.wline(r, [m * M, yT0, 0], [m * M, yT0 + 3, 0], '#ffffff', 1); }
    for (let i = 0; i < 8; i++) { const p = r.w(-24, LANE_Y(i), 0); E.font.text(g, String(i + 1), p[0], p[1] - 3, '#ffffff', { outline: '#6a2a1a' }); }
  }
  // advertising boards in front of the track (cut low)
  for (let k = Math.floor(xa / 64); k < xb / 64 + 1; k++) {
    const a = r.w(k * 64, 204, 0), b = r.w(k * 64 + 62, 204, 7);
    const c = ['#2f7fe0', '#f2b632', '#e23b2e', '#1fa8a0', '#6a3fc8'][((k % 5) + 5) % 5];
    px.rect(g, a[0], b[1], b[0] - a[0], a[1] - b[1], c); px.rect(g, a[0], b[1], b[0] - a[0], 1, '#ffffff');
    E.font.text(g, ['YIKES!', 'GLORY', 'SUNNY BAY', 'MT GLORY', 'GO GO GO'][((k % 5) + 5) % 5], a[0] + 6, b[1] + 2, '#ffffff', { font: 'tiny', outline: false });
  }
};

// the finish gantry with its clock
O.Venue.gantry = (r, x, clock) => {
  r.queue(x, 10, 0, g => {
    const a = r.w(x, 10, 0), b = r.w(x, 10, 64), c = r.w(x, 200, 0);
    px.rect(g, a[0] - 2, b[1], 4, a[1] - b[1], '#3a3f5a'); px.rect(g, c[0] - 2, b[1] + (c[1] - a[1]), 4, a[1] - b[1], '#3a3f5a');
    px.rect(g, a[0] - 30, b[1] - 12, 60, 14, '#14161e'); E.font.text(g, clock, a[0] - E.font.width(clock, { scale: 1 }) / 2, b[1] - 9, '#ffb020', { outline: false });
    E.font.text(g, 'FINISH', a[0] - 15, b[1] + 4, '#ffffff', { font: 'tiny', outline: '#000' });
  }, { bias: -40 });
};

// ---------------------------------------------------------------------------------------------------------------
// the event
// ---------------------------------------------------------------------------------------------------------------
const LANE_ORDER = [3, 4, 2, 5, 1, 6, 0, 7];   // humans in lanes 4, 5, 3, 6; the rest fill
O.defEvent({
  id: 'sprint', name: '100m DASH', short: '100m', season: 'summer', venueName: 'GLORY STADIUM', music: 'sprint', view: 'brawler',
  format: { type: 'race' }, M,
  measure: { unit: 's', better: 'lower', fmt: v => v.toFixed(2) + ' s', wr: [9.48, 'TRB', 'MAX OVERDRIVE'], qualify: { Easy: 12.30, Normal: 11.40, Hard: 10.60 }, seedStep: .08 },
  points: t => 25.4347 * Math.pow(Math.max(0, 18 - t), 1.81),
  tune: { vMax: [11.3, 8, 16, .1, 'Top speed (m/s)'], accel: [9, 4, 16, .5, 'Acceleration (m/s/s)'], decel: [5, 1, 12, .5, 'Deceleration (m/s/s)'], turboMult: [1.12, 1, 1.5, .01, 'Turbo speed ×'], dipLead: [.35, 0, 1, .05, 'Good dip lead (m)'], faceplantTime: [1.4, .3, 3, .1, 'Faceplant time (s)'], stumbleStreak: [3, 2, 8, 1, 'Same-button presses to stumble'], falseStartMin: [.1, 0, .2, .005, 'Fastest legal reaction (s)'] },
  howto: { goal: 'Fastest to the line wins. Alternate the two buttons to run.', rows: [[['mashL', 'mashR'], 'ALTERNATE TO RUN'], [['action'], 'REACT TO THE GUN · DIP AT THE LINE'], [['turbo'], 'TURBO WHEN THE FLAME IS FULL']] },
  yikesKinds: ['falsestart', 'faceplant'],
  laurel: { id: 'rocket', name: 'ROCKET MAN', text: 'React in 0.120 s or less and win', test: (ctx, a) => { const L = ctx.s.lanes.find(l => l.a === a); const w = O.standings(ctx)[0]; return L && L.react != null && L.react <= .12 && w && w.a === a; } },
  hub: { ok: true, attempts: 1, seconds: 35 }, attract: { seconds: 18 },
  turboName: 'TURBO!', phases: ['marks', 'set', 'race', 'finish'],
  intro: (ctx, dt) => { ctx.w.introT = (ctx.w.introT || 0) + dt; const i = Math.floor(ctx.w.introT / .75); if (i !== ctx.w.introI && i < 8) { ctx.w.introI = i; const L = ctx.s0[7 - i]; if (L) O.Comms.say('pa', 'IN LANE ' + (L.lane + 1) + '... REPRESENTING ' + L.a.nationName + '... ' + L.a.name + '!'); } return ctx.w.introT > 6.2; },
  introEnd(ctx) { O.Comms.reset(); },
  hubSample: ctx => { const L = ctx.s && ctx.s.lanes.find(l => l.a.human); return L ? [L.d, L.fin == null ? 0 : 1] : null; },
  hubPoint: (ctx, q, g) => { const k = [4, 2, 5, 1, 6, 0, 7][(Object.keys(O.Hub.ghosts).map(Number).sort((a, b) => a - b).indexOf(g.id)) % 7]; return [q[0] * M, LANE_Y(k), 0]; },
  build(ctx) {
    // lanes
    const order = ctx.athletes.slice(), humans = order.filter(a => a.human), cpus = order.filter(a => !a.human);
    const lanes = new Array(8).fill(null); let k = 0;
    for (const a of humans) lanes[LANE_ORDER[k++]] = a;
    const rv = cpus.find(a => a.rival); if (rv && humans.length === 1) { lanes[4] = rv; }
    for (const a of cpus) if (!lanes.includes(a)) { while (lanes[LANE_ORDER[k]] && k < 8) k++; if (k < 8) lanes[LANE_ORDER[k++]] = a; }
    ctx.laneOf = new Map(); lanes.forEach((a, i) => { if (a) { ctx.laneOf.set(a, i); a.lane = i; } });
    for (const a of ctx.athletes) a.rig = O.makeRig(a.nation, 'track');
    ctx.s0 = lanes.map((a, i) => a && { a, lane: i }).filter(Boolean).sort((x, y) => y.lane - x.lane);
    ctx.w.camX = 0; ctx.w.introT = 0; ctx.w.introI = -1;
    O.Crowd.set(.4);
  },
  start(ctx) {
    const rnd = ctx.rng('gun');
    ctx.s = { phase: 'marks', pt: 0, gunAt: 1 + rnd() * 1.2, gunT: null, t: 0, finishers: 0, photo: false, split: null, resets: 0,
      lanes: ctx.athletes.map(a => ({ a, lane: ctx.laneOf.get(a), d: 0, v: 0, started: false, react: null, fin: null, lead: 0, dip: 0, stumble: 0, plant: 0, yellow: !!(ctx.s && ctx.s.lanes.find(l => l.a === a && l.yellow)), dq: false, early: false, slowT: 0, hyT: 0, done: false })) };
    for (const L of ctx.s.lanes) L.dq = ctx.w.dq && ctx.w.dq.has(L.a);
    ctx.s.fsBot = new Map(); const fr = ctx.rng('fs:' + (ctx.w.resets || 0));
    for (const L of ctx.s.lanes) if (!L.a.human && !L.a.cheat && fr() < .02 * ({ Easy: 1.5, Normal: 1, Hard: .5 }[O.difficulty()] || 1) && !(ctx.w.resets > 0)) ctx.s.fsBot.set(L.a, .3 + fr() * .6);
    if (ctx.meet.mode !== 'attract') ctx.cue('marks');
  },
  step(ctx, dt) {
    const s = ctx.s, T = ctx.T; s.pt += dt; s.t += dt;
    if (s.phase === 'marks') { if (s.pt > (ctx.meet.mode === 'attract' ? .6 : 1.8)) { s.phase = 'set'; s.pt = 0; ctx.sfx('beep'); } }
    else if (s.phase === 'set') {
      for (const L of s.lanes) { if (L.dq) continue; const I = L.a.I; if (I.L || I.R || I.A) { return falseStart(ctx, L); } }
      if (s.pt >= s.gunAt) { s.phase = 'race'; s.gunT = s.t; ctx.sfx('gun'); ctx.fx(P => P.smoke(-30, 200, 40, 6, { size: 4, color: '#e8e8e8' })); ctx.flash('#ffffff', .05); O.Crowd.bump(.8); }
    } else if (s.phase === 'race') {
      for (const L of s.lanes) runLane(ctx, L, dt);
      const fin = s.lanes.filter(L => L.fin != null || L.dq).length, all = s.lanes.filter(L => !L.dq).length, rt = s.t - s.gunT;
      if (!s.split && s.lanes.some(L => L.d >= 50)) { const ld = s.lanes.reduce((m, L) => L.d > m.d ? L : m, s.lanes[0]); s.split = { a: ld.a, t: rt }; ctx.cue('half', { a: ld.a }); }
      const lead = s.lanes.filter(L => !L.dq).reduce((m, L) => L.d > m.d ? L : m, s.lanes[0]); if (lead && lead.a !== s.leadA && rt > 2) { s.leadA = lead.a; if (ctx.meet.mode !== 'hub') ctx.cue('lead', { a: lead.a }, { cool: 3 }); }
      if (fin >= all || rt > 30 || (fin >= 1 && s.lanes.every(L => L.fin != null || L.dq || !L.a.human) && rt > (s.firstFin || 0) + 4)) { s.phase = 'done'; for (const L of s.lanes) if (L.fin == null && !L.dq) ctx.note(L.a, 'DNF'); }
    }
    if (!O.sandbox) animate(ctx, dt);
  },
  done: ctx => ctx.s.phase === 'done',
  perf: (ctx, a) => { const L = ctx.s.lanes.find(l => l.a === a); return L && L.fin != null && !L.dq ? L.fin : null; },
  attemptInfo: (ctx, a) => { const L = ctx.s.lanes.find(l => l.a === a); return L ? { react: L.react } : null; },
  tie: (a, b) => 0,
  bot(ctx, a, dt) {
    const s = ctx.s, I = O.blankIntent(), L = s.lanes.find(l => l.a === a), bs = a.bs, perfect = a.cheat === 'perfect';
    if (!L || L.dq) return I;
    if (s.phase === 'set') { const fs = s.fsBot.get(a); if (fs !== undefined && s.pt > fs) { I.L = true; } return I; }
    if (s.phase !== 'race') return I;
    if (!L.started) {
      if (bs.react === undefined) { const r = ctx.rng('react:' + a.id); bs.react = perfect ? .104 : clamp(.24 - .11 * a.skill + (r() - .5) * .06, ctx.T.falseStartMin + .005, .4); bs.noise = r; bs.hz = perfect ? O.G.mashRateMax + 2 : (6.35 + 3.4 * a.skill) * (.98 + r() * .04); }
      if (s.t - s.gunT >= bs.react) I.L = true;
      return I;
    }
    if (L.fin != null) return I;
    const hz = bs.hz * (perfect ? 1 : 1 + Math.sin(s.t * 1.7 + a.lane) * .04 - (L.d > 70 ? (1 - a.skill) * .08 : 0));
    const m = O.botMash(bs, hz, dt); I.L = m.L; I.R = m.R;
    const rem = 100 - L.d;
    if (!bs.dipped && rem < (perfect ? .9 : 1.2 - (bs.noise() < a.skill ? 0 : 1.0))) { I.A = true; bs.dipped = true; }
    if (a.hype >= 1 && L.d > 45 && (perfect || ctx.rng('turbo:' + a.id)() < a.skill)) I.T = true;
    return I;
  },
  onTurbo(ctx, a) { ctx.fx(P => { const L = ctx.s.lanes.find(l => l.a === a); if (L) P.fire(L.d * M, LANE_Y(L.lane), 4, 10); }); },
  cam(ctx, dt) {
    const s = ctx.s; let tx;
    if (ctx.phase === 'intro') { const k = clamp((ctx.w.introT || 0) / 6, 0, 1); tx = lerp(-60, 40, k); game.focus(tx + 60, 107, 29); return; }
    if (!s) { game.focus(60, 107, 29); return; }
    const hs = s.lanes.filter(L => L.a.human && !L.dq), pool = hs.length ? hs : s.lanes.filter(L => !L.dq);
    const lead = pool.reduce((m, L) => (L.d + L.lead) > (m.d + m.lead) ? L : m, pool[0]);
    const avg = pool.reduce((m, L) => m + L.d, 0) / pool.length;
    tx = (hs.length > 1 ? (avg + lead.d) / 2 : lead.d) * M + 50;
    ctx.w.camX = ctx.w.camX === undefined ? tx : ctx.w.camX + (tx - ctx.w.camX) * Math.min(1, dt * 6);
    game.focus(Math.min(ctx.w.camX, 1280), 107, 29);
  },
  draw(ctx, r) {
    const s = ctx.s, clock = s && s.gunT != null ? Math.max(0, (s.phase === 'race' ? s.t - s.gunT : (s.lanes.find(L => L.fin != null) || {}).fin || 0)).toFixed(2) : '0.00';
    const lead = s && s.lanes.reduce((m, L) => L.d > m.d ? L : m, s.lanes[0]);
    O.Venue.stadium(r, { jumbo: s && s.split ? ['50m SPLIT', O.shortName(s.split.a.name) + ' ' + s.split.t.toFixed(2)] : ['100m DASH', lead ? O.shortName(lead.a.name) : 'GLORY'] });
    O.Venue.gantry(r, 1200, clock);
    // blocks
    for (let i = 0; i < 8; i++) r.queue(-8, LANE_Y(i), 0, g => { const p = r.w(-8, LANE_Y(i), 0); px.rect(g, p[0] - 4, p[1] - 3, 8, 3, '#3a3f5a'); px.rect(g, p[0] - 3, p[1] - 5, 2, 2, '#c8ccd8'); }, { bias: -2 });
    if (!s) return;
    for (const L of s.lanes) if (L.a.human) { const y = LANE_Y(L.lane), xa = (r.ix - 40) / 1.5, xb = (r.ix + r.W + 40) / 1.5; r.decal(g => px.blend(g, .22, 'normal', () => px.poly(g, [r.w(xa, y - 11, 0), r.w(xb, y - 11, 0), r.w(xb, y + 11, 0), r.w(xa, y + 11, 0)], L.a.color))); }
    for (const L of s.lanes) {
      if (!L.a.rig) continue;
      const x = L.d * M, y = LANE_Y(L.lane), a = L.a;
      r.shadow(x, y, 6, .45);
      r.actor(x, y, 0, (g, ox, oy) => { a.rig.draw(g, ox, oy, r.view); if (a.turboT > 0) { /* flames drawn by particles */ } }, { flash: L.dq ? '#606060' : undefined, flashMix: L.dq ? .5 : undefined, ghost: a.turboT > 0 ? { color: '#ff9a1a', life: .2, alpha: .5, owner: a.rig } : undefined });
      if (a.turboT > 0 && !O.sandbox && Math.floor(game.real * 30) % 2) game.particles.fire(x - 4, y, 10 + (game.real * 37 % 14), 1, { size: 4 });
      if (a.human) r.queue(x, y, 40, g => { const p = r.w(x, y, 40); px.poly(g, [[p[0] - 4, p[1] - 6], [p[0] + 4, p[1] - 6], [p[0], p[1]]], a.color); if (ctx.humans.length > 1) E.font.text(g, 'P' + (a.player + 1), p[0] - 5, p[1] - 14, a.color, { font: 'tiny', outline: '#000' }); }, { bias: 60 });
    }
  },
  hud(ctx, r, g) {
    const s = ctx.s, W = r.W, H = r.H; if (!s) return;
    const rt = s.gunT != null ? (s.phase === 'race' ? s.t - s.gunT : Math.max(...s.lanes.map(L => L.fin || 0))) : 0;
    O.HUD.big(g, rt.toFixed(2), W - 14 - E.font.width(rt.toFixed(2), { scale: 3 }), 10, '#ffe066');
    if (s.phase === 'marks') O.UI.stamp(g, W, H, 'ON YOUR MARKS', 1, { scale: 3, y: 50 });
    if (s.phase === 'set') O.UI.stamp(g, W, H, 'SET...', 1, { scale: 4, y: 46 });
    if (s.phase === 'race' && s.t - s.gunT < .6) O.UI.stamp(g, W, H, 'BANG!', s.t - s.gunT, { scale: 5, y: 40 });
    const hs = s.lanes.filter(L => L.a.human);
    hs.forEach((L, i) => {
      const n = hs.length, bw = Math.min(150, (W - 40) / n), x = Math.round(W / 2 - (n * bw) / 2 + i * bw + 6), y = H - 34, a = L.a;
      UI.panel(g, x, y - 4, bw - 12, 32, { trim: a.color, alpha: .75 });
      UI.text(g, (n > 1 ? 'P' + (a.player + 1) + ' ' : '') + 'LANE ' + (L.lane + 1), x + 4, y, a.color);
      if (L.dq) { UI.text(g, 'DISQUALIFIED', x + 4, y + 12, '#ff6b6b'); return; }
      if (L.fin != null) { UI.text(g, L.fin.toFixed(2) + ' s', x + 4, y + 12, '#ffe066', { scale: 1 }); }
      else if (s.phase === 'race' || s.phase === 'set' || s.phase === 'marks') {
        O.Prompt.pair(g, x + 4, y + 12, 'mashL', 'mashR', { inp: a.inp, flip: a.mash.flip ^ 1 });
        UI.bar(g, x + 34, y + 14, bw - 52 - 50, 6, a.mash.power(), '#4fe0a8');
        if (100 - L.d < 6 && L.started && L.d < 100) O.Prompt.draw(g, x + 4, y - 16, 'action', { inp: a.inp, label: 'DIP!', pulse: true, color: '#ffe066' });
      }
      O.HUD.flame(g, x + bw - 12 - 52, y, a, { w: 40 });
      if (L.react != null) UI.text(g, 'REACT ' + L.react.toFixed(3), x + 50, y, L.react < .15 ? '#4fe0a8' : '#c8ccec');
      if (L.yellow) px.rect(g, x + bw - 22, y - 10, 6, 8, '#ffe066');
    });
    if (s.phase === 'set' && game.settings.hints && hs.length) UI.text(g, 'WAIT FOR THE GUN...', W / 2 - UI.tw('WAIT FOR THE GUN...', 1) / 2, 82, '#ffffff');
    if (s.phase === 'race' && s.t - s.gunT < 3 && hs.length && game.settings.hints) { const msg = 'ALTERNATE ' + O.Prompt.keyLabel(hs[0].a.inp, O.Prompt.codeFor(hs[0].a.inp, 'mashL', O.Prompt.device(hs[0].a.inp))) + ' AND ' + O.Prompt.keyLabel(hs[0].a.inp, O.Prompt.codeFor(hs[0].a.inp, 'mashR', O.Prompt.device(hs[0].a.inp))) + '!'; if (O.Prompt.device(hs[0].a.inp) !== 'gamepad') UI.text(g, msg, W / 2 - UI.tw(msg, 1) / 2, 82, '#ffffff'); else { O.Prompt.pair(g, W / 2 - 30, 80, 'mashL', 'mashR', { inp: hs[0].a.inp, label: 'ALTERNATE!' }); } }
    if (s.photo && ctx.phase === 'finish' && ctx.phaseT < 1.6) { px.blend(g, .35, 'multiply', () => px.rect(g, 0, 0, W, H, '#c8a070')); O.UI.stamp(g, W, H, 'PHOTO FINISH', ctx.phaseT, { scale: 3, y: 44, colors: ['#fff6e0', '#e8d0a0', '#b08850'] }); }
  }
});

function falseStart(ctx, L) {
  if (O.god(L.a)) return;
  const s = ctx.s;
  ctx.yikes(L.a, 'falsestart', { cue: 'falsestart' }); ctx.sfx('gun'); ctx.sfx('whistle');
  ctx.w.resets = (ctx.w.resets || 0) + 1;
  const yellow = new Set(s.lanes.filter(l => l.yellow).map(l => l.a)), dq = ctx.w.dq || (ctx.w.dq = new Set());
  if (yellow.has(L.a)) { dq.add(L.a); ctx.note(L.a, 'DQ'); if (!O.sandbox) O.Stamps.add('DISQUALIFIED!', { dur: 1.6, sub: L.a.name }); }
  else yellow.add(L.a);
  ctx.def.start(ctx);
  for (const l of ctx.s.lanes) { l.yellow = yellow.has(l.a); l.dq = dq.has(l.a); }
  for (const a of ctx.athletes) a.bs = {};
  if (ctx.athletes.every(a => !a.human || dq.has(a)) && ctx.humans.length) { /* humans out: the race still runs for the CPUs */ }
}

function runLane(ctx, L, dt) {
  const s = ctx.s, T = ctx.T, a = L.a, I = a.I;
  if (L.dq) return;
  const rt = s.t - s.gunT;
  if (!L.started) {
    if (I.L || I.R || I.A) {
      if (rt < T.falseStartMin && !a.cheat) return falseStart(ctx, L);
      L.started = true; L.react = rt; if (L.react < .15) ctx.hype(a, .35);
      L.v = 1.5;
    } else return;
  }
  if (L.fin != null) { L.v = Math.max(0, L.v - 6 * dt); L.d += L.v * dt; return; }
  // the mash -> speed
  const p = a.mash.power(), turbo = ctx.turbo(a, T.turboMult);
  if (a.human && !O.god(a) && a.mash.same >= T.stumbleStreak + 2 && L.plant <= 0) { L.plant = T.faceplantTime; L.v *= .2; a.mash.same = 0; ctx.yikes(a, 'faceplant'); if (!O.sandbox && a.rig) a.rig.kick(-1); }
  else if (a.human && a.mash.same >= T.stumbleStreak && L.stumble <= 0) { L.stumble = .3; }
  if (L.plant > 0) { L.plant -= dt; L.v = Math.max(0, L.v - 14 * dt); L.d += L.v * dt; return; }
  let vt = T.vMax * p * turbo; if (L.stumble > 0) { L.stumble -= dt; vt *= .85; } if (L.slowT > 0) { L.slowT -= dt; vt *= .9; }
  const acc = L.d < 30 ? T.accel * (.6 + .4 * L.d / 30) : T.accel;
  L.v = vt > L.v ? Math.min(vt, L.v + acc * dt) : Math.max(vt, L.v - T.decel * dt);
  if (p > .85) { L.hyT += dt; if (L.hyT >= 1) { L.hyT -= 1; ctx.hype(a, .08); } }
  const prev = L.d + L.lead;
  L.d += L.v * dt;
  // the dip
  const rem = 100 - L.d;
  if (I.A && !L.dip && rem <= 2.5 && rem > -1) { if (rem <= 1.2) { L.dip = 1; L.lead = T.dipLead; ctx.hype(a, .1); ctx.cue('dip', { a }, { cool: 4 }); } else { L.dip = -1; L.slowT = .3; } }
  if (L.dip > 0 && L.dipU === undefined) L.dipU = 0;
  const torso = L.d + L.lead;
  if (torso >= 100 && prev < 100) {
    const k = (100 - prev) / Math.max(1e-6, torso - prev);
    L.fin = +(rt - dt + dt * k).toFixed(3);
    s.finishers++;
    if (s.finishers === 1) { s.firstFin = rt; s.winner = a; if (!O.sandbox) { O.CrowdAudio.cheer(); ctx.cue('win', { a }, { prio: 3 }); } }
    if (s.finishers === 2 && L.fin - s.lanes.find(l => l.a === s.winner).fin < .05) { s.photo = true; ctx.slowmo(.25, 1); ctx.cue('photo', {}, { prio: 3 }); }
  }
}

function animate(ctx, dt) {
  const s = ctx.s;
  for (const L of s.lanes) {
    const a = L.a, rig = a.rig; if (!rig) continue;
    const st = { x: L.d * M, y: LANE_Y(L.lane), z: 0, facing: 0, vx: 0, vy: 0 };
    if (L.dq && s.phase !== 'race') { O.Pose.clear(rig); st.pose = 'hips'; rig.update(dt, st); continue; }
    if (s.phase === 'marks' || (!L.started && s.phase !== 'race') || (!L.started && s.phase === 'race')) { O.Pose.set(rig, s.phase === 'set' || (s.phase === 'race' && !L.started) ? 'set' : 'blocks', {}); }
    else if (L.plant > 0) { O.Pose.clear(rig, { snap: true }); const u = 1 - L.plant / ctx.T.faceplantTime; st.flip = u < .35 ? u / .35 : 0; st.down = u >= .35 ? 1 : 0; st.vx = L.v * M; }
    else if (L.fin != null) { O.Pose.clear(rig); st.vx = L.v * M; if (L.v < 2) { st.pose = s.winner === a ? 'cheer' : 'hips'; st.expr = s.winner === a ? 'shout' : null; } }
    else { st.vx = L.v * M; st.sprint = L.v > 7; st.expr = a.turboT > 0 ? 'shout' : null; if (L.dip > 0) O.Pose.set(rig, 'dip', { u: 1 }); else O.Pose.clear(rig); }
    if (L.stumble > 0) st.hurt = true;
    rig.update(dt, st);
    if (L.started && L.fin == null && L.v > 3 && Math.floor(L.d * 2) !== L._st) { L._st = Math.floor(L.d * 2); if (a.human && !O.sandbox) game.audio.sfx('stepFast', { vol: .5 }); }
  }
}
})();
