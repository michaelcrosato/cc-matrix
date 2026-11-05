// JAVELIN THROW — summer · Glory Stadium infield · mash the run-up, hold for the angle, release. Wind, drag, fouls,
// flat landings, throws out of the stadium into the parking lot, and a blimp that can be popped.
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, { clamp, lerp } = E;
const UI = O.UI, Art = O.Art, M = 12, LINE = 360, WALL = LINE + 120 * M, RY = 110;
const DEG = Math.PI / 180;

O.defEvent({
  id: 'javelin', name: 'JAVELIN THROW', short: 'Javelin', season: 'summer', venueName: 'GLORY STADIUM', music: 'javelin', view: 'brawler',
  format: { type: 'attempts', attempts: 3 }, M, highlights: 2, maxTime: 25,
  measure: { unit: 'm', better: 'higher', fmt: v => v.toFixed(2) + ' m', wr: [101.2, 'VOL', 'BLAZE CINDERHART'], qualify: { Easy: 58, Normal: 72, Hard: 82 }, seedStep: -2.4 },
  points: d => 10.14 * Math.pow(Math.max(0, d - 7), 1.05),
  tune: { vMaxRun: [9, 5, 13, .1, 'Run-up top speed (m/s)'], angleRate: [55, 20, 120, 1, 'Angle rise (deg/s)'], vRelBase: [14, 5, 25, .5, 'Release speed base (m/s)'], vRelPerRun: [1.9, .5, 3, .05, 'Release speed per run m/s'], drag: [.0006, 0, .003, .0001, 'Air drag'], windMax: [3, 0, 8, .1, 'Max tailwind (m/s)'], turboMult: [1.12, 1, 1.5, .01, 'Hyper Arm ×'] },
  howto: { goal: 'Best of three throws. Run up, hold to raise the angle, release before the line. Aim for the green band.', rows: [[['mashL', 'mashR'], 'ALTERNATE TO RUN'], [['action'], 'HOLD: ANGLE RISES · RELEASE: THROW'], [['turbo'], 'HYPER ARM: A FLAMING THROW']] },
  yikesKinds: ['foul', 'flat'], turboName: 'HYPER ARM!',
  laurel: { id: 'stadium', name: 'OUT OF THE STADIUM', text: 'Throw beyond 120 metres', test: (ctx, a) => a.attempts.some(x => x && x.perf > 120) },
  hub: { ok: true, attempts: 2, seconds: 45 }, attract: { seconds: 16 },
  phases: ['run', 'flight', 'land'],
  attract: { seconds: 16, setup(ctx) { ctx.w.attractWind = 3; } },
  hubSample: ctx => { const s = ctx.s; return s ? [s.x, s.phase === 'flight' ? LINE + s.jx * M : -1, s.phase === 'flight' ? s.jz * M : 0] : null; },
  hubPoint: (ctx, q, g) => [q[0], RY + 16 + 10 * (Object.keys(O.Hub.ghosts).indexOf(String(g.id)) + 1), 0],
  build(ctx) { for (const a of ctx.athletes) a.rig = O.makeRig(a.nation, 'track'); ctx.w.blimpX = {}; ctx.w.trails = []; },
  start(ctx, a) {
    const r = ctx.rng('wind:' + a.id), wind = ctx.w.attractWind !== undefined && a.cheat ? ctx.w.attractWind : -2 + r() * (2 + ctx.T.windMax);
    ctx.s = { a, phase: 'ready', pt: 0, x: -10, v: 0, ang: 0, adir: 1, holding: false, wind, jx: 0, jz: 0, jvx: 0, jvz: 0, rot: 0, land: null, perf: null, foul: false, flat: false, outside: false, blimp: false,
      blimpX: LINE + (55 + r() * 30) * M, blimpZ: (55 + r() * 15) * M, relAngle: 0, trail: [], burn: false, tripT: 0 };
  },
  step(ctx, dt) {
    const s = ctx.s, a = s.a, I = a.I, T = ctx.T; s.pt += dt;
    if (s.phase === 'ready') { if (s.pt > .6 || I.L || I.R) { s.phase = 'run'; s.pt = 0; ctx.cue('start', { a }); } }
    else if (s.phase === 'run') {
      const p = a.mash.power(), vt = T.vMaxRun * p;
      s.v = vt > s.v ? Math.min(vt, s.v + 7 * dt) : Math.max(vt, s.v - (s.holding ? 1.2 : 4) * dt);
      s.x += s.v * M * dt;
      if (I.Ad && !s.holding) { s.holding = true; s.ang = 0; s.adir = 1; }
      if (s.holding) {
        s.ang += s.adir * T.angleRate * dt; if (s.ang >= 80) { s.ang = 80; s.adir = -1; } if (s.ang <= 0) { s.ang = 0; s.adir = 1; }
        if (!I.Ad) release(ctx);
      }
      if (s.phase === 'run' && s.pt > 12) { s.phase = 'trip'; s.pt = 0; s.v = 0; ctx.note(a, 'NM'); s.msg = 'TIME!'; ctx.sfx('buzzer'); }
      if (s.phase === 'run' && s.x >= LINE && O.god(a)) { s.ang = s.holding ? s.ang : 38; release(ctx); }
      if (s.phase === 'run' && s.x >= LINE) { s.phase = 'trip'; s.foul = true; s.pt = 0; ctx.note(a, 'FOUL'); ctx.yikes(a, 'foul'); ctx.sfx('whistle'); }
    } else if (s.phase === 'flight') {
      const k = T.drag, ax = 0, vx = s.jvx - s.wind, vz = s.jvz, sp = Math.hypot(vx, vz);
      s.jvx += (ax - k * sp * vx) * dt; s.jvz += (-9.81 - k * sp * vz) * dt;
      s.jx += s.jvx * dt; s.jz += s.jvz * dt; s.rot = Math.atan2(s.jvz, s.jvx);
      s.x = Math.min(s.x + Math.max(0, s.v) * M * dt, LINE - 6); s.v = Math.max(0, s.v - 10 * dt);
      if (!O.sandbox) { s.trail.push([LINE / M + s.jx, s.jz]); if (s.trail.length > 120) s.trail.shift(); }
      // the blimp
      const wx = LINE + s.jx * M, wz = s.jz * M;
      if (!s.blimp && Math.abs(wx - s.blimpX) < 34 && Math.abs(wz - s.blimpZ) < 14) { s.blimp = true; s.jvx *= .15; s.jvz = Math.min(s.jvz, 0); ctx.sfx('pop'); ctx.cue('blimp', { a }, { prio: 4 }); ctx.stamp && ctx.stamp('BLIMP BUSTER!', { dur: 1.6, colors: ['#ffffff', '#ffe066', '#ff7a1a', '#e02a2a'], sub: '' }); ctx.fx(P => O.Art.confetti(s.blimpX, 60, s.blimpZ, ['#e23b2e', '#ffffff', '#ffe066', '#3fa8e8'], 50)); }
      if (s.jz <= 0) land(ctx);
    } else if (s.phase === 'land') { s.v = Math.max(0, s.v - 8 * dt); s.x += s.v * M * dt; if (s.pt > (O.sandbox ? 0 : 1.6)) s.phase = 'done'; }
    else if (s.phase === 'trip') { s.tripT += dt; s.x += Math.max(0, s.v) * M * dt * .4; s.v = Math.max(0, s.v - 12 * dt); if (s.pt > (O.sandbox ? 0 : 1.8)) s.phase = 'done'; }
    if (!O.sandbox) animate(ctx, dt);
  },
  done: ctx => ctx.s.phase === 'done',
  perf: (ctx, a) => ctx.s.perf,
  attemptInfo: ctx => ({ wind: ctx.s.wind, angle: ctx.s.relAngle }),
  bot(ctx, a, dt) {
    const s = ctx.s, I = O.blankIntent(), bs = a.bs, perfect = a.cheat === 'perfect';
    if (!s || s.a !== a) return I;
    if (bs.init === undefined) { const r = ctx.rng('bot:' + a.id); bs.init = 1; bs.hz = perfect ? O.G.mashRateMax + 2 : (6.2 + 3.6 * a.skill) * (.97 + r() * .06); bs.target = perfect ? 38.5 : clamp(38 + O.gauss(r) * (7 - 5 * a.skill), 8, 75); bs.foul = !perfect && r() < (1 - a.skill) * .12; bs.holdAt = perfect ? LINE - 150 : LINE - 120 - r() * 80; }
    if (s.phase === 'run' || s.phase === 'ready') {
      const m = O.botMash(bs, bs.hz, dt); I.L = m.L; I.R = m.R;
      if (a.hype >= 1 && (perfect || s.x > 100)) I.T = true;
      const holdX = bs.foul ? LINE + 40 : bs.holdAt;
      if (s.x > holdX) { const goingUp = s.adir > 0; I.Ad = !(s.holding && goingUp && s.ang >= bs.target); if (!bs.foul && s.x > LINE - 20) I.Ad = false; }
    }
    return I;
  },
  cam(ctx, dt) {
    const s = ctx.s; let tx = 120, tz = 29, ty = 107;
    if (s) {
      if (s.phase === 'flight' || s.phase === 'land') { const jx = LINE + s.jx * M, jz = s.jz * M; tx = jx; tz = Math.max(29, jz * .9 + 10); }
      else tx = s.x + 90;
    }
    const w = ctx.w; w.cx = w.cx === undefined ? tx : w.cx + (tx - w.cx) * Math.min(1, dt * 5); w.cz = w.cz === undefined ? tz : w.cz + (tz - w.cz) * Math.min(1, dt * 5);
    game.focus(w.cx, ty, w.cz);
  },
  draw(ctx, r) {
    const s = ctx.s, g = r.ctx, t = game.real;
    O.Venue.stadium(r, { marks: false, trackColor: '#3e9a3a', blimp: false, jumboX: WALL + 60, jumbo: s ? ['JAVELIN', s.perf != null ? s.perf.toFixed(2) + ' M' : 'WIND ' + s.wind.toFixed(1)] : ['JAVELIN', 'THROW'] });
    // runway, foul arc, sector lines and numbers, the wall at 120 m and the parking lot beyond
    Art.quad(r, [[-200, 96, 0], [LINE, 96, 0], [LINE, 124, 0], [-200, 124, 0]], '#c4472f');
    Art.wline(r, [-200, 96, 0], [LINE, 96, 0], '#ffffff'); Art.wline(r, [-200, 124, 0], [LINE, 124, 0], '#ffffff');
    for (let i = 0; i < 8; i++) { const a0 = -.5 + i / 7, y0 = 110 + Math.sin(a0) * 16, y1 = 110 + Math.sin(a0 + .14) * 16; Art.wline(r, [LINE + Math.cos(a0) * 6 - 6, y0, 0], [LINE + Math.cos(a0 + .14) * 6 - 6, y1, 0], '#ffffff', 2); }
    for (let m = 10; m <= 120; m += 10) { const x = LINE + m * M, h = 110; Art.wline(r, [x, h - 14 - m * .5, 0], [x, h + 14 + m * .5, 0], '#ffffff', 1); const p = r.w(x, 196, 0); if (p[0] > -20 && p[0] < r.bw + 20) E.font.text(g, m + 'm', p[0] - 8, p[1] - 4, '#ffffff', { outline: '#2a4a2a' }); }
    Art.wline(r, [LINE, 110, 0], [LINE + 125 * M, 110 - 80, 0], '#ffffff', 1); Art.wline(r, [LINE, 110, 0], [LINE + 125 * M, 110 + 80, 0], '#ffffff', 1);
    r.queue(WALL, 20, 0, gg => { const a = r.w(WALL, 20, 0), b = r.w(WALL + 4, 20, 40), c = r.w(WALL, 200, 0); px.rect(gg, a[0], b[1], 6, c[1] - b[1], '#5a4a6a'); px.rect(gg, a[0], b[1], 6, 2, '#ffffff'); }, { bias: -50 });
    const lot = r.w(WALL + 10, 120, 0); if (lot[0] < r.bw + 40) { for (let k = 0; k < 10; k++) { const cx = r.w(WALL + 40 + k * 70, 150, 0); px.rect(g, cx[0], cx[1] - 10, 40, 10, ['#e23b2e', '#2f7fe0', '#f2b632', '#c8ccd8'][k % 4]); px.rect(g, cx[0] + 8, cx[1] - 16, 22, 7, '#a8d8f0'); px.rect(g, cx[0] + 4, cx[1] - 1, 6, 3, '#14161e'); px.rect(g, cx[0] + 30, cx[1] - 1, 6, 3, '#14161e'); } }
    // judges with flags near the sector
    for (const jx of [LINE + 20, LINE + 70 * M]) r.queue(jx, 150, 0, gg => { const p = r.w(jx, 150, 0); px.rect(gg, p[0] - 3, p[1] - 16, 6, 10, '#2a3a8a'); px.disc(gg, p[0], p[1] - 19, 3, '#e0b090'); px.rect(gg, p[0] - 2, p[1] - 6, 2, 6, '#2a2a3a'); px.rect(gg, p[0] + 1, p[1] - 6, 2, 6, '#2a2a3a'); px.rect(gg, p[0] + 3, p[1] - 24, 1, 10, '#c8ccd8'); px.rect(gg, p[0] + 4, p[1] - 24, 6, 4, s && s.foul ? '#e23b2e' : '#ffffff'); });
    // the windsock
    r.queue(LINE - 30, 70, 0, gg => { const p = r.w(LINE - 30, 70, 0), top = r.w(LINE - 30, 70, 40); px.rect(gg, p[0], top[1], 1, p[1] - top[1], '#c8ccd8'); const w = s ? s.wind : 0, len = 6 + Math.abs(w) * 3, dir = w >= 0 ? 1 : -1; for (let i = 0; i < 4; i++) px.rect(gg, top[0] + dir * (1 + i * len / 4), top[1] + i * .5 + Math.sin(t * 8 + i) * .6, Math.ceil(len / 4), 3 - (i > 2 ? 1 : 0), i % 2 ? '#ffffff' : '#ff6a1a'); });
    // the blimp, crossing above (world-anchored for the javelin)
    if (s) r.queue(s.blimpX, 40, s.blimpZ, gg => { const p = r.w(s.blimpX, 40, s.blimpZ); if (!s.blimp) Art.blimp(gg, p[0], p[1], t); else { px.blend(gg, .6, 'normal', () => px.ell(gg, p[0], p[1] + 6, 14, 4, '#d8dce8')); } }, { bias: 200 });
    if (!s) return;
    const a = s.a;
    // previous throws: ghost trails of this round (the other players' flights)
    for (const tr of ctx.w.trails.slice(-3)) { tr.pts.forEach((q, i) => { if (i % 3) return; const p = r.w(LINE + (q[0] - LINE / M) * M, RY, q[1] * M); px.blend(g, .4, 'normal', () => px.rect(g, p[0], p[1], 2, 2, tr.color)); }); }
    // the athlete
    r.shadow(s.x, RY, 6, .45);
    r.actor(s.x, RY, 0, (gg, ox, oy) => { a.rig.draw(gg, ox, oy, r.view); if (s.phase === 'run' || s.phase === 'ready') O.Gear.javelin(gg, a.rig, r.view, ox, oy, { grip: a.turboT > 0 ? '#ff7a1a' : '#e23b2e', dir: [-.6 + s.ang / 140, 0, .45 + s.ang / 160] }); }, { ghost: a.turboT > 0 ? { color: '#ff9a1a', life: .2, alpha: .5, owner: a.rig } : undefined });
    if (a.human) r.textAt(s.x, RY, 44, ctx.humans.length > 1 ? 'P' + (a.player + 1) : '', a.color);
    // the javelin in flight / landed
    if (s.phase === 'flight' || s.phase === 'land' || (s.phase === 'done' && s.land)) {
      const jx = LINE + s.jx * M, jz = Math.max(0, s.jz * M), ang = s.phase === 'flight' ? s.rot : s.landRot || -.6, L = 26;
      r.queue(jx, RY, jz, gg => {
        const c = r.w(jx, RY, jz), dx = Math.cos(ang) * L * .75, dz = Math.sin(ang) * L * .75, q = s.phase === 'land' ? Math.sin(t * 40) * Math.max(0, 1 - s.pt) * 2 : 0;
        const tail = [c[0] - dx * (s.flat ? .5 : 1), c[1] + dz * (s.flat ? .5 : 1)], tip = [c[0] + (s.phase === 'flight' ? dx * .3 : 0) + q, c[1] - (s.phase === 'flight' ? dz * .3 : 0)];
        px.line(gg, Math.round(tail[0]), Math.round(tail[1]), Math.round(tip[0]), Math.round(tip[1]), '#f0e8d0', 1); px.line(gg, Math.round(lerp(tail[0], tip[0], .45)), Math.round(lerp(tail[1], tip[1], .45)), Math.round(lerp(tail[0], tip[0], .55)), Math.round(lerp(tail[1], tip[1], .55)), '#e23b2e', 2);
      });
      if (s.burn && s.phase === 'flight' && Math.floor(t * 40) % 2) game.particles.fire(jx, RY, jz, 1, { size: 3 });
      if (s.phase !== 'flight' && s.land) r.textAt(s.land * M + LINE, RY, 22, s.perf != null ? s.perf.toFixed(2) + ' m' : (s.flat ? 'FLAT' : ''), '#ffe066');
    }
  },
  hud(ctx, r, g) {
    const s = ctx.s, W = r.W, H = r.H; if (!s) return;
    const a = s.a, x = W - 104, y = 46;
    // the angle gauge: a quarter dial with the green band
    UI.panel(g, x - 6, y - 6, 100, 72, { alpha: .8, title: 'ANGLE' });
    const cx = x + 10, cy = y + 58, R = 50; for (let d = 0; d <= 90; d += 2) { const c = d >= 34 && d <= 42 ? '#4fe0a8' : d >= 20 && d <= 60 ? '#f2b632' : '#5a2a2a'; px.rect(g, Math.round(cx + Math.cos(-d * DEG) * R), Math.round(cy + Math.sin(-d * DEG) * R), 2, 2, c); }
    const an = s.phase === 'run' ? s.ang : s.relAngle; px.line(g, cx, cy, Math.round(cx + Math.cos(-an * DEG) * (R - 4)), Math.round(cy + Math.sin(-an * DEG) * (R - 4)), '#ffffff', 2);
    UI.text(g, Math.round(an) + '°', cx + 22, cy - 14, '#ffffff', { scale: 2 });
    // wind
    const wd = s.wind; UI.text(g, 'WIND ' + (wd >= 0 ? '+' : '') + wd.toFixed(1) + ' m/s', x - 4, y + 72, wd >= 0 ? '#4fe0a8' : '#ff9a9a');
    px.poly(g, wd >= 0 ? [[x + 76, y + 70], [x + 86, y + 75], [x + 76, y + 80]] : [[x + 86, y + 70], [x + 76, y + 75], [x + 86, y + 80]], '#ffffff');
    // the player's strip
    if (a.human && (s.phase === 'run' || s.phase === 'ready')) {
      const bx = Math.round(W / 2 - 110); UI.panel(g, bx, H - 38, 220, 32, { trim: a.color, alpha: .8 });
      O.Prompt.pair(g, bx + 6, H - 32, 'mashL', 'mashR', { inp: a.inp, flip: a.mash.flip ^ 1, label: 'RUN' });
      UI.bar(g, bx + 72, H - 30, 60, 6, a.mash.power(), '#4fe0a8');
      O.Prompt.draw(g, bx + 140, H - 32, 'action', { inp: a.inp, label: s.holding ? 'RELEASE!' : 'HOLD', pulse: s.x > LINE - 160 });
      O.HUD.flame(g, bx + 6, H - 18, a, { w: 60 });
      const toLine = (LINE - s.x) / M; UI.text(g, toLine.toFixed(1) + ' m TO THE LINE', bx + 80, H - 18, toLine < 4 ? '#ff6b6b' : '#ffffff');
    }
    if (a.cheat !== 'perfect' && ctx.meet.mode !== 'attract') O.HUD.board(g, ctx, 10, 50, 3, { w: 140 });
    const best = O.aggregate(ctx.def, a); if (best != null) UI.text(g, 'BEST ' + best.toFixed(2) + ' m', W - 104, 140, '#f2b632');
    // the flight tracker: the field from the line to 130 m, the javelin's arc, the marks
    if (s.phase === 'flight' || s.phase === 'land') {
      const tx = W - 170, ty = H - 70, tw = 158, th = 56, k = tw / 135; UI.panel(g, tx - 4, ty - 4, tw + 8, th + 8, { alpha: .85 });
      px.rect(g, tx, ty + th - 6, tw, 6, '#3e9a3a'); for (let m = 0; m <= 130; m += 10) { px.rect(g, tx + Math.round(m * k), ty + th - 8, 1, 3, '#ffffff'); if (m % 50 === 0) E.font.text(g, String(m), tx + Math.round(m * k) - 4, ty + th - 15, '#ffffff', { font: 'tiny', outline: false }); }
      px.rect(g, tx + Math.round(120 * k), ty + th - 16, 2, 10, '#5a4a6a'); if (best != null) px.rect(g, tx + Math.round(best * k), ty + th - 9, 1, 4, '#f2b632');
      s.trail.forEach((q, i) => { if (i % 2) return; px.dot(g, tx + Math.round(q[0] * k), ty + th - 6 - Math.round(q[1] * k * 1.2), '#ffe066'); });
      px.disc(g, tx + Math.round(s.jx * k), ty + th - 6 - Math.round(Math.max(0, s.jz) * k * 1.2), 2, s.burn ? '#ff7a1a' : '#ffffff');
      UI.text(g, Math.max(0, s.jx).toFixed(1) + ' m', tx + 2, ty + 2, '#ffffff');
    }
  },
  onTurbo(ctx, a) { ctx.s.burn = true; }
});

function release(ctx) {
  const s = ctx.s, a = s.a, T = ctx.T;
  const ang = s.ang * DEG, vRel = (T.vRelBase + T.vRelPerRun * s.v) * ctx.turbo(a, T.turboMult);
  s.phase = 'flight'; s.pt = 0; s.relAngle = s.ang; s.holding = false; s.burn = s.burn || a.turboT > 0;
  s.jx = (s.x - LINE) / M + .5; s.jz = 2.0; s.jvx = vRel * Math.cos(ang); s.jvz = vRel * Math.sin(ang);
  ctx.sfx('whoosh'); ctx.cue('throw', { a }, { cool: 6 });
  if (s.ang >= 34 && s.ang <= 42) ctx.hype(a, .25);
  if (!O.sandbox && a.rig) a.rig.kick(.6);
}
function land(ctx) {
  const s = ctx.s, a = s.a;
  s.phase = 'land'; s.pt = 0; s.jz = 0; s.landRot = s.rot;
  const d = s.jx; s.land = d;
  if ((s.relAngle < 20 || s.relAngle > 60) && !O.god(a)) { s.flat = true; s.perf = null; ctx.note(a, 'NM'); ctx.sfx('boing'); ctx.yikes(a, 'flat'); return; }
  s.perf = Math.max(0, +d.toFixed(2));
  ctx.sfx('thunk'); ctx.fx(P => P.dust(LINE + d * M, RY, 0, 8));
  if (d > 120) { s.outside = true; ctx.sfx('alarm'); ctx.cue('stadium', { a }, { prio: 4 }); }
  else if (d > 85) ctx.cue('far', { a }, { prio: 3 });
  if (d > 80) ctx.hype(a, .15);
  if (!O.sandbox) { ctx.w.trails.push({ pts: s.trail.slice(), color: a.color }); O.Crowd.bump(clamp(d / 100, .3, 1)); if (d > 85) O.CrowdAudio.cheer(); }
}
function animate(ctx, dt) {
  const s = ctx.s, a = s.a, rig = a.rig; if (!rig) return;
  const st = { x: s.x, y: RY, z: 0, facing: 0, vx: 0, vy: 0 };
  if (s.phase === 'ready') { O.Pose.set(rig, 'javCarry'); }
  else if (s.phase === 'run') { st.vx = s.v * M; st.sprint = s.v > 6; O.Pose.set(rig, 'javCarry'); if (s.holding) st.expr = 'shout'; }
  else if (s.phase === 'flight' || s.phase === 'land') { O.Pose.set(rig, 'javThrow', { u: clamp(s.pt * 4 + (s.phase === 'land' ? 1 : 0), 0, 1) }); st.vx = s.v * M; if (s.phase === 'land' && s.pt > .8) { O.Pose.clear(rig); st.pose = s.perf != null && s.perf > 80 ? 'cheer' : s.flat ? 'hips' : 'wave'; } }
  else if (s.phase === 'trip') { O.Pose.clear(rig, { snap: true }); const u = s.tripT; st.flip = u < .5 ? u / .5 : 0; st.down = u >= .5 ? 1 : 0; st.vx = s.v * M; }
  else { O.Pose.clear(rig); st.pose = s.foul ? 'hips' : 'wave'; }
  rig.update(dt, st);
}
})();
