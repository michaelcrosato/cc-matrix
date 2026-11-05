// TWO-MAN BOBSLED — winter · Glory Ice Track (dusk) · mash the push, jump in on time, then ride the groove up the
// banked walls through 15 named curves. Too high on a wall and the sled flips onto its roof. Two runs, added.
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, { clamp, lerp } = E;
const UI = O.UI, Art = O.Art, DEG = Math.PI / 180;
const SECTIONS = [
  { name: 'SUNNY START', len: 120, slope: 9, curves: [0] }, { name: 'GLORY KINK', len: 70, slope: 8, curves: [2] },
  { name: 'THE TWINS', len: 120, slope: 9, curves: [3, -3] }, { name: 'SHARK FIN', len: 80, slope: 10, curves: [-4] },
  { name: 'KREISEL', len: 160, slope: 7, curves: [6] }, { name: 'LABYRINTH', len: 150, slope: 9, curves: [3, -3, 3] },
  { name: 'OMEGA', len: 140, slope: 8, curves: [6, -6], tunnel: true }, { name: 'THE WASHING MACHINE', len: 90, slope: 10, curves: [-5] },
  { name: 'DOUBLE TROUBLE', len: 120, slope: 9, curves: [4, -4] }, { name: 'LAST GASP', len: 90, slope: 8, curves: [-3], tunnel: true },
  { name: 'FINISH CURVE', len: 80, slope: 6, curves: [2] }, { name: 'FINISH SCHUSS', len: 80, slope: 4, curves: [0] }
];
let C = null;
const course = () => C || (C = buildCourse());
function buildCourse() {
  const c = O.RoadKit.build(SECTIONS, { hillK: .5, runout: 50, road: { width: 520, height: 230, draw: 200, colors: { road: ['#d8eef8', '#cfe6f2'], grass: ['#c8d8ec', '#bccfe6'], rumble: ['#f4f8ff', '#8ab8e0'], lane: '#ffffff', wall: ['#9ac0e0', '#8ab0d0'], roof: '#5a7aa8', portal: '#3a4a6a' }, sky: new E.Backdrop({ sky: ['#1a1446', '#6a3a7a', '#f08a5a'], sun: false, stars: true, starsY: .3, layers: [{ kind: 'mountains', color: '#3a2a5a', y: .55, height: .25, parallax: .02 }, { kind: 'forest', color: '#1a1a3a', y: .66, height: .12, parallax: .05 }] }) } });
  const R = c.road;
  for (let m = 10; m < c.length + 80; m += 26) { R.place(m * 100, -1.6, { w: 120, draw: (g, sx, sy, sc) => lamp(g, sx, sy, sc) }); R.place(m * 100 + 1300, 1.6, { w: 120, draw: (g, sx, sy, sc) => lamp(g, sx, sy, sc) }); }
  for (const mk of c.marks) R.place(mk.s * 100 + 400, -2.1, { w: 300, draw: (g, sx, sy, sc) => { const w = 900 * sc, h = 220 * sc; if (w < 6) return; px.rect(g, sx - w / 2, sy - h * 3, w, h, '#14182e'); px.rect(g, sx - w / 2, sy - h * 3, w, 1, '#f2b632'); if (w > 50) E.font.text(g, mk.name, sx - w / 2 + 3, sy - h * 3 + 2, '#ffe066', { font: 'tiny', outline: false }); px.rect(g, sx - 1, sy - h * 2, 2, h * 2, '#5a6080'); } });
  for (let m = 30; m < c.length; m += 90) R.place(m * 100, 2.2, { w: 400, draw: (g, sx, sy, sc) => O.RoadKit.fan(g, sx, sy, sc * .8, m) });
  R.place(c.length * 100, 0, { w: 600, draw: (g, sx, sy, sc) => { const w = 1500 * sc, h = 500 * sc; px.rect(g, sx - w / 2, sy - h, w, h * .2, '#e23b2e'); px.rect(g, sx - w / 2, sy - h, w * .05, h, '#c8ccd8'); px.rect(g, sx + w / 2 - w * .05, sy - h, w * .05, h, '#c8ccd8'); if (w > 40) E.font.text(g, 'FINISH', sx - 15, sy - h * .95, '#ffffff', { outline: false }); } });
  return c;
}
function lamp(g, sx, sy, sc) { const h = 500 * sc; if (h < 3) return; px.rect(g, sx - Math.max(1, h * .02), sy - h, Math.max(1, h * .04), h, '#5a6080'); px.disc(g, sx, sy - h, Math.max(1, h * .08), '#fff2c8'); px.blend(g, .3, 'add', () => px.disc(g, sx, sy - h, Math.max(2, h * .3), '#ffd8a0')); }
O.bobCourse = course;

O.defEvent({
  id: 'bobsled', name: 'TWO-MAN BOBSLED', short: 'Bobsled', season: 'winter', venueName: 'GLORY ICE TRACK', music: 'icesurf', view: 'brawler',
  format: { type: 'attempts', attempts: 2 }, aggregate: 'sum', highlights: 0, maxTime: 90, roundName: 'RUN',
  measure: { unit: 's', better: 'lower', fmt: v => O.fmt.time(v), wr: [80.4, 'TRB', 'MAX OVERDRIVE'], qualify: { Easy: 92, Normal: 86, Hard: 82 }, seedStep: .9 },
  points: t => 6.4 * Math.pow(Math.max(0, 120 - t), 1.4),
  tune: { pushGain: [11, 2, 18, .1, 'Push gain'], loadZone: [10, 4, 20, .5, 'Load zone (m)'], drag: [.00085, .0004, .003, .00005, 'Air drag'], curveForce: [.333, .1, .8, .01, 'Curve force'], steerForce: [1, .3, 2, .05, 'Steering force'], grooveTolerance: [.25, .1, .6, .01, 'Groove tolerance'], flipHeight: [1.55, 1.1, 2.4, .05, 'Flip height'] },
  howto: { goal: 'Two runs, the times added. Push hard, jump in inside the LOAD zone, then steer to keep the sled in the glowing groove on the walls.', rows: [[['mashL', 'mashR'], 'PUSH THE SLED'], [['action'], 'JUMP IN (THE LOAD ZONE)'], [['moveH'], 'STEER: STAY IN THE GROOVE'], [['turbo'], 'JET SLED']] },
  yikesKinds: ['lateload', 'flip'], turboName: 'JET SLED!',
  laurel: { id: 'icedancer', name: 'ICE DANCER', text: 'A run with no skid and no wall contact', test: (ctx, a) => a.attempts.some(x => x && x.info && x.info.clean) },
  hub: { ok: true, attempts: 1, seconds: 60 }, attract: { seconds: 20, setup(ctx) { ctx.w.attractFrom = 620; } },
  phases: SECTIONS.map(s => s.name),
  hubSample: ctx => { const s = ctx.s; return s && s.phase === 'run' ? [s.m, s.x, 0] : null; }, hubTime: ctx => ctx.s ? ctx.s.t : 0,
  prebuild() { course(); },
  build(ctx) { course(); for (const a of ctx.athletes) { a.rig = O.makeRig(a.nation, 'bobsled'); a.rig2 = O.makeRig(a.nation, 'bobsled', { mate: 0 }); } game.weather = { kind: 'snow', amount: .08 }; },
  start(ctx, a) {
    const from = ctx.w.attractFrom && a.cheat ? ctx.w.attractFrom : 0;
    ctx.s = { a, phase: 'ready', pt: 0, m: from, v: from ? 34 : 0, x: 0, vx: 0, t: 0, loaded: !!from, loadQ: null, startT: null, skid: 0, skidT: 0, walls: 0, flip: 0, flipped: 0, finish: null, track: O.Ghost.rec(), groove: 0, jet: 0, clean: true, msg: null, msgT: 0 };
  },
  step(ctx, dt) {
    const s = ctx.s, a = s.a, I = a.I, T = ctx.T, c = course(), g = 9.81; s.pt += dt;
    if (s.phase === 'ready') { if (s.pt > (ctx.meet.mode === 'attract' ? .3 : 1.4)) { s.phase = 'run'; s.pt = 0; ctx.sfx('beepHi'); } return; }
    if (s.phase === 'done') return;
    if (s.phase === 'finished') { s.v = Math.max(0, s.v - 12 * dt); s.m += s.v * dt; if (s.pt > (O.sandbox ? 0 : 2.4)) s.phase = 'done'; return; }
    s.t += dt;
    const sec = c.at(s.m), turbo = ctx.turbo(a, 1.15);
    if (!s.loaded) {
      const p = a.mash.power(); s.v += (T.pushGain * p * Math.max(0, 1 - s.v / 12.5) + g * Math.sin(sec.slope * DEG) * .3) * dt;
      if (I.A && s.m >= 50 - T.loadZone - 12) { s.loaded = true; s.loadQ = s.m >= 50 - T.loadZone ? 'CLEAN' : 'EARLY'; if (s.loadQ === 'EARLY') s.v *= .95; ctx.cue('load', { a }); ctx.sfx('thunk'); }
      if (s.m >= 50 && !s.loaded) { s.loaded = true; s.loadQ = 'LATE'; s.v = Math.max(2, s.v - 1.5); ctx.yikes(a, 'lateload', { cue: 'late' }); }
      if (s.m >= 50 && s.startT === null) { s.startT = s.t; ctx.cue('push', { a }); }
      s.m += s.v * dt; return;
    }
    if (s.startT === null && s.m >= 50) s.startT = s.t;
    if (s.flip > 0) { s.flip -= dt; s.v = Math.max(5, s.v - 3 * dt); s.m += s.v * dt; s.x += (0 - s.x) * dt; if (s.flip <= 0) { s.v *= .65; s.x = 0; s.vx = 0; } finishCheck(ctx, dt); return; }
    // the drive: gravity, drag, friction, the scrape of a skid; lateral up and down the banked walls
    const Fc = -T.curveForce * sec.curve * Math.pow(s.v / 42, 2), groove = Fc * .55, jet = a.turboT > 0;
    s.groove = groove;
    const steer = jet ? clamp((groove - Fc) / T.steerForce, -1, 1) : clamp(I.mv[0], -1, 1);
    const eq = Fc + steer * T.steerForce;
    s.vx += ((eq - s.x) * 5 - s.vx * 4.5) * dt; s.x += s.vx * dt;
    const off = Math.abs(s.x - groove), skidding = off > T.grooveTolerance;
    let acc = g * Math.sin(sec.slope * 1.8 * DEG) - T.drag * s.v * s.v - .02 * g - Math.min(off, .6) * 1.2;
    if (skidding) { acc -= .02 * s.v; s.skidT += dt; s.clean = false; if (Math.floor(s.t * 10) !== s.lastSpark) { s.lastSpark = Math.floor(s.t * 10); ctx.fx(P => P.sparks(0, 0, 0, 3)); if (!O.sandbox) game.audio.sfx('scrape', { vol: .3 }); } }
    if (Math.abs(s.x) > 1.25) { s.walls += dt; s.clean = false; }
    s.v = Math.max(0, s.v + acc * dt);
    if (Math.abs(s.x) > T.flipHeight && O.god(a)) { s.x = Math.sign(s.x) * T.flipHeight * .95; s.vx = 0; }
    if (Math.abs(s.x) > T.flipHeight && s.flip <= 0) { s.flip = 2; s.flipped++; ctx.yikes(a, 'flip'); ctx.sfx('scrape'); ctx.slowmo(.4, 1.4); ctx.shake(5); }
    else if (off < .1) ctx.hype(a, .02 * dt);
    if (Math.abs(sec.curve) >= 6 && !skidding && Math.floor(s.m / 40) !== s.cueM) { s.cueM = Math.floor(s.m / 40); ctx.cue('curve', { a }, { cool: 8 }); }
    s.m += s.v * turbo * dt;
    O.Ghost.push(s.track, s.t, [s.m, s.x, 0, s.flip > 0 ? 1 : 0, 0, 0]);
    finishCheck(ctx, dt);
    if (!O.sandbox) animate(ctx, dt);
  },
  done: ctx => ctx.s.phase === 'done',
  perf: ctx => ctx.s.finish,
  attemptInfo: ctx => ({ track: ctx.s.track.s, start: ctx.s.startT, clean: ctx.s.clean && ctx.s.finish != null, load: ctx.s.loadQ }),
  onPlay(ctx) { let best = null; for (const b of ctx.athletes) for (const at of b.attempts) if (at && at.perf != null && (!best || at.perf < best.perf)) best = { perf: at.perf, info: at.info, a: b }; ctx.w.ghost = best && best.info ? { s: best.info.track, a: best.a } : null; },
  bot(ctx, a, dt) {
    const s = ctx.s, I = O.blankIntent(), bs = a.bs, perfect = a.cheat === 'perfect', T = ctx.T, c = course();
    if (!s || s.a !== a || s.phase !== 'run') return I;
    if (bs.r === undefined) { bs.r = ctx.rng('bot:' + a.id); bs.hz = perfect ? O.G.mashRateMax + 2 : (6.4 + 3.4 * a.skill); bs.load = perfect ? 47 : 50 - T.loadZone * (.2 + a.skill * .7) + (bs.r() - .5) * (1 - a.skill) * 10; bs.err = perfect ? 0 : (1 - a.skill) * 1.7; bs.ph = bs.r() * 7; bs.lag = perfect ? .3 : .3 - (1 - a.skill) * 1.1; }
    if (!s.loaded) { const m = O.botMash(bs, bs.hz, dt); I.L = m.L; I.R = m.R; if (s.m >= bs.load) I.A = true; return I; }
    const ahead = c.at(s.m + s.v * bs.lag), Fc = -T.curveForce * ahead.curve * Math.pow(s.v / 42, 2), groove = Fc * .55 + Math.sin(s.t * 1.1 + bs.ph) * bs.err * .5;
    I.mv = [clamp((groove - Fc) / T.steerForce + (groove - s.x) * 1.5 - s.vx * .3, -1, 1), 0];
    if (a.hype >= 1 && s.loaded) I.T = true;
    return I;
  },
  cam() { game.focus(0, 0, 0); },
  draw(ctx, r) {
    const s = ctx.s, c = course(); if (!s) return;
    const R = c.road, h = 230, camZ = s.m * 100 - R.ahead(h), camX = s.x * .7;
    game.lights.enabled = false;
    const cars = [];
    if (ctx.w.ghost && s.loaded) { const q = O.Ghost.at(ctx.w.ghost.s, s.t); if (q) cars.push({ z: q[1] * 100, x: q[2], w: .1, draw: (g, sx, sy, sc) => sledGhost(g, sx, sy, sc, O.nation(ctx.w.ghost.a.nation).colors.a, ctx.w.ghost.a.nation) }); }
    if (O.Hub && O.Hub.active) for (const gh of O.Hub.ghostsFor('bobsled')) { const q = O.Ghost.at(gh.track, s.t); if (q) cars.push({ z: q[1] * 100, x: q[2], w: .1, draw: (g, sx, sy, sc) => sledGhost(g, sx, sy, sc, gh.color, gh.name) }); }
    ctx.w.turn = (ctx.w.turn || 0) + c.at(s.m).curve * s.v * .004;
    R.draw(r, { z: camZ, x: camX, h, turn: ctx.w.turn, cars });
    r.overlay(g => {
      const a = s.a, base = R.project(s.m * 100, s.x, 0) || [r.W / 2, r.H - 20, 1], sx = Math.round(base[0]), sy = Math.round(Math.min(r.H - 10, base[1]));
      const tilt = clamp(-s.x * .5, -.9, .9) + (s.flip > 0 ? Math.PI * Math.min(1, (2 - s.flip) * 2) : 0), n = O.nation(a.nation), gold = O.Records.golden(a.nation, 'bobsled');
      // the push: two athletes behind the sled, running
      if (!s.loaded) { for (const [rg, dx] of [[a.rig, -10], [a.rig2, 10]]) O.RoadKit.rigAt(g, rg, sx + dx, sy + 6, 1); }
      sledDraw(g, sx, sy, tilt, gold ? '#f2c94c' : n.colors.a, n.colors.b, a, s.loaded);
      if (a.turboT > 0) { for (let i = 0; i < 3; i++) px.disc(g, sx + (i - 1) * 3, sy + 4 + i, 3 + Math.round(Math.sin(game.real * 30 + i) * 2), i % 2 ? '#ffe066' : '#ff7a1a'); }
    });
  },
  hud(ctx, r, g) {
    const s = ctx.s, W = r.W, H = r.H, c = course(); if (!s) return; const a = s.a;
    const prev = a.attempts.filter(Boolean).reduce((m, x) => m + (x.perf || 0), 0), tt = s.finish != null ? s.finish : s.t;
    O.HUD.big(g, O.fmt.time(tt).replace(' s', ''), W - 14 - E.font.width(O.fmt.time(tt).replace(' s', ''), { scale: 3 }), 10, '#ffe066');
    if (prev) UI.text(g, 'TOTAL ' + O.fmt.time(prev + tt), W - 120, 36, '#ffffff');
    UI.text(g, Math.round(s.v * 3.6) + ' KM/H', W - 90, 48, '#ffffff', { scale: 2 });
    if (s.startT !== null) UI.text(g, 'START ' + s.startT.toFixed(2), W - 90, 68, s.startT < 5.1 ? '#4fe0a8' : '#ffffff');
    const secNow = c.marks.slice().reverse().find(m => m.s <= s.m); if (secNow) UI.text(g, secNow.name, 14, 56, '#ffe066', { scale: 1 });
    // the U-shaped cross-section gauge with the groove
    const gx = W / 2, gy = H - 54, R = 44;
    px.blend(g, .45, 'normal', () => px.rect(g, gx - R - 6, gy - 6, R * 2 + 12, 22, '#070914'));
    for (let k = -18; k <= 18; k++) { const u = k / 18 * .95, ang = u * Math.PI / 2, x = Math.round(gx + Math.sin(ang) * R), y = Math.round(gy - Math.cos(ang) * R * .9 + R * .9 - R); px.rect(g, x, y + R - 4, 2, 2, Math.abs(u * 1.6 - (s.groove || 0)) < ctx.T.grooveTolerance ? '#4fe0a8' : Math.abs(u * 1.6) > ctx.T.flipHeight ? '#e23b2e' : '#8ab8e0'); }
    const ux = clamp(s.x / 1.6, -1, 1), ang = ux * Math.PI / 2; px.disc(g, Math.round(gx + Math.sin(ang) * (R - 5)), Math.round(gy - Math.cos(ang) * (R - 5) * .9 + R * .9 - R + R - 4), 4, a.color);
    UI.text(g, 'GROOVE', gx - UI.tw('GROOVE', 1) / 2, gy + 6, '#4fe0a8');
    if (!s.loaded && s.phase === 'run') {
      const zx = W / 2 - 80, zy = 70; UI.bar(g, zx, zy, 160, 8, clamp(s.m / 50, 0, 1), '#f2b632'); const lz = 50 - ctx.T.loadZone; px.rect(g, zx + Math.round(lz / 50 * 160), zy, Math.round(ctx.T.loadZone / 50 * 160), 8, s.m >= lz ? '#4fe0a8' : '#2a7a4a'); UI.text(g, 'LOAD', zx + Math.round(lz / 50 * 160), zy - 10, '#4fe0a8');
      if (a.human) { O.Prompt.pair(g, W / 2 - 40, 90, 'mashL', 'mashR', { inp: a.inp, flip: a.mash.flip ^ 1, size: 2, label: 'PUSH!' }); if (s.m >= lz - 6) O.Prompt.draw(g, W / 2, 118, 'action', { inp: a.inp, label: 'JUMP IN!', pulse: s.m >= lz, align: 'center', size: 2, color: '#ffe066' }); }
    } else if (a.human && s.phase === 'run') O.Prompt.draw(g, 14, H - 22, 'moveH', { inp: a.inp, label: 'STEER' });
    if (s.loadQ && s.pt < 2 && s.m < 120) UI.text(g, s.loadQ + ' LOAD', W / 2 - UI.tw(s.loadQ + ' LOAD', 2) / 2, 100, s.loadQ === 'CLEAN' ? '#4fe0a8' : '#ff9a9a', { scale: 2 });
    if (s.phase === 'ready') UI.text(g, 'READY... SET...', W / 2 - UI.tw('READY... SET...', 3) / 2, 70, '#ffffff', { scale: 3 });
    O.HUD.flame(g, 14, 70, a);
  }
});
function finishCheck(ctx, dt) { const s = ctx.s, c = course(); if (s.m >= c.length && s.finish == null) { s.finish = +(s.t - (s.m - c.length) / Math.max(1, s.v)).toFixed(2); s.phase = 'finished'; s.pt = 0; if (!O.sandbox) { O.CrowdAudio.cheer(); ctx.cue('win', { a: s.a }, { prio: 3 }); } } if (s.t > 85 && s.finish == null) { s.phase = 'done'; ctx.note(s.a, 'DNF'); } }
function sledDraw(g, sx, sy, tilt, c1, c2, a, loaded) {
  const ca = Math.cos(tilt), sa = Math.sin(tilt), P = pts => pts.map(([x, y]) => [Math.round(sx + x * ca - y * sa), Math.round(sy + x * sa + y * ca)]);
  px.poly(g, P([[-20, 0], [20, 0], [24, -10], [-24, -10]]), E.shade(c1, -.35));
  px.poly(g, P([[-24, -10], [24, -10], [20, -26], [-20, -26]]), c1);
  px.poly(g, P([[-16, -26], [16, -26], [12, -30], [-12, -30]]), c2);
  px.poly(g, P([[-6, -18], [6, -18], [6, -11], [-6, -11]]), '#ffffff');
  for (const k of [-1, 1]) px.poly(g, P([[k * 22 - 2, 0], [k * 22 + 2, 0], [k * 22 + 2, 4], [k * 22 - 2, 4]]), '#c8ccd8');
  E.font.text(g, String(a.lane + 1), Math.round(sx - 2), Math.round(sy - 17), '#14182e', { font: 'tiny', outline: false });
  if (loaded) { const hp = P([[-6, -30], [6, -30]]); px.disc(g, hp[0][0], hp[0][1] - 5, 6, c2); px.disc(g, hp[1][0], hp[1][1] - 3, 5, c2); px.rect(g, hp[0][0] - 3, hp[0][1] - 7, 6, 2, '#3ae8f0'); }
}
function sledGhost(g, sx, sy, sc, color, name) { const k = clamp(sc * 700, .1, 1.3), w = 22 * k, h = 14 * k; px.blend(g, .5, 'normal', () => { px.rect(g, sx - w, sy - h, w * 2, h, color); px.disc(g, sx, sy - h - 2 * k, Math.max(1, 4 * k), color); }); if (k > .3) E.font.text(g, name || '', Math.round(sx - 6), Math.round(sy - h - 12 * k - 4), '#ffffff', { font: 'tiny', outline: '#000' }); }
function animate(ctx, dt) { const s = ctx.s, a = s.a; const st = { x: 0, y: 0, z: 0, facing: -Math.PI / 2, vx: 0, vy: 0, run: s.loaded ? 0 : clamp(s.v / 11, 0, 1) }; if (!s.loaded) { O.Pose.set(a.rig, 'bobPush'); O.Pose.set(a.rig2, 'bobPush'); } else { O.Pose.set(a.rig, 'bobSeat', { tuck: true }); O.Pose.set(a.rig2, 'bobSeat'); } a.rig.update(dt, st); a.rig2.update(dt, st); }
})();
