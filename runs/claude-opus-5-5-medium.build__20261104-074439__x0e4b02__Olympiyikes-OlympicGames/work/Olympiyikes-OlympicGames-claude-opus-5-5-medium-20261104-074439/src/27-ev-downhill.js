/* OLYMPIYIKES! — "The Yikes Face" DOWNHILL (§6.8) on the engine's pseudo-3D road: steer through 24 gates, tuck, pre-jump the crests. */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, clamp = E.clamp, D2R = Math.PI / 180;
const U = 100, SEG = 200;   // road units per meter, per segment
const REAR = O.REAR = new E.View('rear', 'Rear', 0, 18, 1.6, 1);
const SNOW = { road: ['#f4f8ff', '#e8f0fb'], grass: ['#dfe9f6', '#d3e0f0'], rumble: ['#ff7a2a', '#f05a1a'], lane: null };
const TUN = { road: ['#d8eef8', '#c8e0f0'], grass: ['#a8c8e8', '#98b8d8'], rumble: ['#e8f4ff', '#c8e4f8'], lane: null };
// the course (§6.8): [name, meters, slope°, curve, gates, feature]
const SECTIONS = [
  ['START SCHUSS', 150, 28, 0, 1, null], ['THE CORKSCREW', 220, 22, [4, -4, 3], 5, null], ['KANGAROO KICKER', 60, 18, 0, 1, 'jump'], ['PINE ALLEY', 200, 20, -2, 3, 'narrow'],
  ['ICE TUNNEL', 120, 18, 2, 1, 'tunnel'], ['THE YIKES FACE', 180, 38, 0, 3, 'bigjump'], ['GLORY BEND', 260, 18, 5, 4, 'bend'], ['FINISH SCHUSS', 250, 15, [1, -1], 6, 'hop']];
const C = O.Course = { segs: [], gates: [], jumps: [], splits: [], len: 0, road: null, sections: [] };
(function build() {
  const road = C.road = new E.Road({ segment: SEG, lanes: 0, draw: 220, width: 1600, fog: null, colors: SNOW });
  let s = 0, gi = 0;
  for (const [name, len, slope, curve, gates, feat] of SECTIONS) {
    C.sections.push({ name, s0: s, s1: s + len, slope, feat });
    const parts = Array.isArray(curve) ? curve : [curve], n = Math.round(len / 2 / parts.length);
    for (const cv of parts) road.add(n, { curve: cv, hill: -n * 2 * Math.tan(slope * D2R) * U * .35, tunnel: feat === 'tunnel', colors: feat === 'tunnel' ? TUN : SNOW });
    for (let k = 0; k < gates; k++) { const gs = s + len * (k + .6) / gates; C.gates.push({ s: gs, xc: (gi % 2 ? -1 : 1) * (.35 + (gi * 37 % 3) * .1), i: gi++ }); }
    if (feat === 'jump') C.jumps.push({ s: s + len - 5, air: 1.1 });
    if (feat === 'bigjump') C.jumps.push({ s: s + 8, air: 1.6 });
    if (feat === 'hop') C.jumps.push({ s: s + len * .5, air: .8 });
    s += len;
  }
  C.len = s; C.splits = [C.len * .3, C.len * .55, C.len * .8];
  // scenery: pines, spectators with flags and cowbells, banners, the start hut and the finish arch
  const PINE = E.prop('pine', { size: 2 }).frames[0];
  for (let z = 0; z < s * U; z += SEG * 3) {
    const sec = C.sections.find(q => z / U >= q.s0 && z / U < q.s1) || C.sections[0], r = E.hash2(z, 7), side = (z / SEG / 3) % 2 ? 1 : -1;
    if (sec.feat === 'tunnel') continue;
    road.place(z, side * (1.5 + r * .8), PINE, 40);
    if (sec.feat === 'narrow') road.place(z + SEG, -side * (1.35 + r * .3), PINE, 40);
    if (r < .35) road.place(z + SEG * 1.5, side * (1.32 + r * .3), fan(Math.floor(r * 80)), 1);
  }
  road.place(10 * U, 0, arch('START', '#2a5ab8'), 1);
  road.place((s - 2) * U, 0, arch('FINISH', '#e8443a'), 1);
  for (const sp of C.splits) road.place(sp * U, 1.4, board('SPLIT'), 1);
  for (const g of C.gates) for (const k of [-1, 1]) road.place(g.s * U, g.xc + k * .32, gatePole(g.i % 2 ? '#3a6ae0' : '#e8443a'), 1);
  for (const j of C.jumps) road.place(j.s * U, 0, ramp(), 1);
})();
function fan(seed) { const nat = O.NATIONS[seed % 8]; return { w: 120, draw(g, x, y, sc) { const W = 120 * sc * 4; if (W < 2) return; const h = W * 1.6; px.rect(g, x - W * .2, y - h, W * .4, h * .5, nat.colors.a); px.disc(g, x, y - h - W * .15, Math.max(1, W * .18), '#e0b090'); px.rect(g, x - W * .1, y - h * .5, W * .2, h * .5, '#2a2a34'); if (W > 6) { px.rect(g, x + W * .25, y - h * 1.5, Math.max(1, W * .05), h * .8, '#c8ccd8'); O.Art.flag(g, x + W * .3, y - h * 1.5, W * .5, W * .35, nat, true); } } }; }
function arch(text, col) { return { w: 0, draw(g, x, y, s) { const W = 1800 * s, H = 1100 * s; if (W < 3) return; for (const sx of [-1, 1]) px.rect(g, x + sx * W - 30 * s, y - H, 60 * s, H, '#e0e0e8'); px.rect(g, x - W, y - H, W * 2, H * .22, col); if (W > 50) E.font.text(g, text, Math.round(x), Math.round(y - H * .95), '#ffffff', { align: 'center', outline: false, scale: W > 300 ? 2 : 1 }); } }; }
function board(text) { return { w: 100, draw(g, x, y, s) { const W = 400 * s; if (W < 2) return; px.rect(g, x - W / 2, y - W * 1.2, W, W * .5, '#1a2050'); if (W > 30) E.font.text(g, text, Math.round(x), Math.round(y - W * 1.15), '#ffd060', { align: 'center', outline: false, font: 'tiny' }); px.rect(g, x - 1, y - W * .7, 2, W * .7, '#5a6080'); } }; }
function gatePole(col) { return { w: 30, draw(g, x, y, s) { const H = 420 * s, W = Math.max(1, 150 * s); if (H < 2) return; px.rect(g, x - W / 2, y - H, W, H * .45, col); px.rect(g, x - Math.max(1, W * .08), y - H, Math.max(1, W * .16), H, '#2a2a34'); } }; }
function ramp() { return { w: 0, draw(g, x, y, s) { const W = 1500 * s; if (W < 3) return; px.rect(g, x - W, y - W * .04, W * 2, Math.max(1, W * .04), '#c8d8ec'); } }; }
const sectionAt = s => C.sections.find(q => s >= q.s0 && s < q.s1) || C.sections[C.sections.length - 1];
O.Course.sectionAt = sectionAt;

/** the skier from behind (shared with the bobsled for its crew) */
O.drawRear = (g, rig, sx, sy, sc, o = {}) => {
  const k = Math.max(.5, sc);
  if (o.skis) { const sp = 5 * k, L = 22 * k; for (const sd of [-1, 1]) px.poly(g, [[sx + sd * sp - k, sy], [sx + sd * sp + k, sy], [sx + sd * sp * .7 + k * .6, sy - L * .45], [sx + sd * sp * .7 - k * .6, sy - L * .45]], o.skiCol || '#e8443a'); }
  rig.draw(g, Math.round(sx), Math.round(sy), REAR);
};

O.defEvent({
  id: 'downhill', name: 'DOWNHILL', short: 'Downhill', season: 'winter', venue: 'The Yikes Face', pictogram: 'downhill', music: 'yikesface', view: 'side', sport: 'downhill',
  format: { type: 'attempts', rounds: 1, combine: 'best', highlight: 'all' }, maxTime: 110, turbo: 'AVALANCHE!',
  measure: { better: 'lower', unit: 's', fmt: v => v.toFixed(2) + ' s', wr: [47.62, 'MTP', 'ROCKY SUMMIT'], qualify: { Easy: 58, Normal: 52.5, Hard: 49 } },
  points: t => 8.5 * Math.pow(Math.max(0, 80 - t), 1.4),
  tune: { dTuck: [.0021, .001, .008, .0001, 'Drag tucked'], dUp: [.005, .002, .012, .0001, 'Drag upright'], turnRate: [1.6, .5, 4, .05, 'Turn rate'], curvePush: [.22, 0, 1, .01, 'Curve push'],
    gateBoost: [.02, 0, .08, .005, 'Gate boost'], missPenalty: [.5, 0, 2, .05, 'Missed gate (+s)'], crashSteer: [.6, .3, 1, .05, 'Landing steer limit'] },
  howto: { goal: 'Fastest run wins. Missed gates cost 0.50 s.', rows: [[['move'], 'Steer through the gates'], [['alt'], 'Hold: TUCK (faster, turns less)'], [['action'], 'PRE-JUMP just before a crest'], [null, 'Orange netting = CRASH']] },
  yikesKinds: ['CRASH!', 'CRASH LANDING!'],
  laurel: { id: 'cleansweep', name: 'CLEAN SWEEP', text: 'Pass all 24 gates', test: (ctx, a) => a.S.gatesOk === C.gates.length && a.lastPerf != null },
  hub: { ok: true, attempts: 1, seconds: 70 }, attract: { seconds: 22, after: 3, setup(ctx) { const s = ctx.cur.S; const sec = C.sections[5]; s.s = sec.s0 - 25; s.v = 30; s.gi = C.gates.findIndex(g => g.s > s.s); s.t = 30; } },
  phases: C.sections.map(sec => [sec.name.toLowerCase(), ctx => { const s = ctx.cur.S; s.s = sec.s0; s.v = Math.max(s.v, 25); s.gi = C.gates.findIndex(g => g.s > s.s); s.ji = C.jumps.findIndex(j => j.s > s.s); }]),
  build(ctx) { ctx.S.best = null; },
  start(ctx) {
    const a = ctx.cur, sk = ctx.skill(a);
    a.S = { s: 0, v: 0, x: 0, vx: 0, h: 0, hv: 0, air: 0, steer: 0, tuck: false, gi: 0, ji: 0, gatesOk: 0, pen: 0, t: 0, started: false, crashT: 0, pre: -9, splits: [], si: 0, done: false, endT: 0, ghost: [], rng: ctx.rng('noise'), sk };
    a.S.ghostLeader = ctx.S.bestRun || null;
  },
  bot(ctx, a, dt, I) {
    const s = a.S, sk = a.pilot.cheat === 'perfect' ? 1 : s.sk;
    if (!s.started) { I.A = true; return I; }
    const g = C.gates[s.gi]; let target = 0;
    if (g && g.s - s.s < 70) target = g.xc;
    const cv = C.road.curveAt(s.s * U + 3000); target += clamp(cv * .05, -.3, .3);
    const noise = (E.noise2(s.t * .7, a.id.charCodeAt(0)) - .5) * (1 - sk) * 1.2;
    I.mv = s.air > 0 ? [0, 0] : [clamp((target + noise - s.x) * 3 - s.vx * .8, -1, 1), 0];
    I.X = Math.abs(cv) < 2.5 && (!g || g.s - s.s > 25 || Math.abs(g.xc - s.x) < .15);
    const j = C.jumps[s.ji]; if (j && s.air <= 0) { const tt = (j.s - s.s) / Math.max(1, s.v); if (tt < .35 && tt > .2 && (a.pilot.cheat === 'perfect' || s.rng() < sk * .1)) I.A = true; }
    if (a.hype >= 1 && s.s > 300) I.T = true;
    return I;
  },
  step(ctx, dt) {
    const T = ctx.T, g = 9.81;
    for (const a of ctx.active) {
      const s = a.S, I = a.I;
      if (s.done) { s.endT += dt; s.v = Math.max(0, s.v - 25 * dt); s.s += s.v * dt; continue; }
      if (!s.started) { if (I.A || s.t > 3) { s.started = true; s.v = 4; ctx.fx.sfx('swish'); } s.t += dt; continue; }
      s.t += dt;
      if (s.crashT > 0) { s.crashT -= dt; s.v = Math.max(0, s.v - 18 * dt); s.s += s.v * dt; if (s.crashT <= 0) { s.x = clamp(s.x, -1, 1) * .9; s.vx = 0; s.v = 10; } continue; }
      const sec = sectionAt(s.s), slope = sec.slope * D2R;
      s.tuck = I.X; s.steer = I.mv[0];
      if (I.A && s.air <= 0) s.pre = s.t;
      if (s.air > 0) { s.air -= dt; s.h = Math.max(0, s.hv * (s.airT - s.air) - 4.9 * Math.pow(s.airT - s.air, 2)); s.v *= 1 - .03 * dt; if (s.air <= 0) { s.h = 0; if ((Math.abs(s.steer) > T.crashSteer || Math.abs(s.x) > 1) && !ctx.god(a)) crash(ctx, a, 'CRASH LANDING!'); else { s.v *= .97; ctx.fx.sfx('crunch'); } } }
      else {
        const drag = (s.tuck ? T.dTuck : T.dUp) * s.v * s.v, carve = .18 * Math.abs(s.steer) * s.v * .1, deep = Math.abs(s.x) > 1 ? 3 : 1;
        s.v += (g * Math.sin(slope) - drag * deep - .03 * g - carve) * dt;
        const turn = T.turnRate * (s.tuck ? .55 : 1) * (sec.feat === 'tunnel' ? .6 : 1) * Math.min(1, s.v / 15);
        s.vx = s.steer * turn - C.road.curveAt(s.s * U) * Math.pow(s.v / 35, 2) * T.curvePush * (sec.feat === 'bend' ? 1.4 : 1);
        s.x += s.vx * dt;
      }
      s.v = clamp(s.v, 0, 40);
      const s0 = s.s; s.s += s.v * ctx.turboMult(a, 1.18) * dt;
      // jumps
      const j = C.jumps[s.ji]; if (j && s.s >= j.s) { s.ji++; const pre = s.t - s.pre <= .5 && s.t - s.pre >= .05; s.airT = j.air * (pre ? .5 : 1); s.air = s.airT; s.hv = 4.9 * s.airT; if (pre) ctx.hype(a, .1); ctx.fx.sfx('whoosh'); if (a.human || ctx.highlight) ctx.fx.say('downhill'); }
      // gates
      const gt = C.gates[s.gi]; if (gt && s.s >= gt.s) { s.gi++; if (Math.abs(s.x - gt.xc) <= .32) { s.gatesOk++; s.v *= 1 + T.gateBoost; ctx.hype(a, .05); if (a.human) ctx.fx.sfx('gate'); } else { s.pen += T.missPenalty; if (a.human) { ctx.fx.sfx('buzzer', { vol: .4 }); ctx.fx.banner('+' + T.missPenalty.toFixed(2), { y: .3, life: .8, scale: 2, colors: ['#ffffff', '#ff8a6a', '#e8443a'] }); } } }
      // netting
      if (Math.abs(s.x) >= 1.25 && !ctx.god(a)) crash(ctx, a, 'CRASH!');
      if (ctx.god(a)) s.x = clamp(s.x, -1.2, 1.2);
      // splits
      if (s.si < C.splits.length && s.s >= C.splits[s.si]) { s.splits.push(s.t + s.pen); s.si++; }
      if (s.s >= C.len) { const frac = (C.len - s0) / Math.max(1e-6, s.s - s0); const t = s.t - dt + frac * dt + s.pen; s.done = true; ctx.finish(a, Math.round(t * 100) / 100); ctx.fx.sfx('cheerSwell'); O.Crowd.excite(.8); }
      if (!ctx.sandbox && Math.floor(s.t * 10) !== Math.floor((s.t - dt) * 10)) s.ghost.push([s.t, s.s, s.x]);
    }
    if (!ctx.sandbox) for (const a of ctx.active) animate(ctx, a, dt);
  },
  done(ctx) { return ctx.active.every(a => a.fin && (a.S.endT > 2 || ctx.fast)); },
  perf(ctx, a) { return a.cur === undefined ? null : a.cur; },
  post(ctx) { const a = ctx.cur; if (a && a.lastPerf != null && (ctx.S.best == null || a.lastPerf < ctx.S.best)) { ctx.S.best = a.lastPerf; ctx.S.bestRun = a.S.ghost.slice(); ctx.S.bestSplits = a.S.splits.slice(); } },
  camera() {},
  draw(ctx, r) {
    const a = ctx.cur, s = a && a.S && a.S.s !== undefined ? a.S : { s: 0, x: 0, h: 0 };
    C.road.o.sky = SKY;
    const H = 1000, z = Math.max(0, s.s * U - C.road.ahead(H) * 2.4);
    const cars = [];
    if (s.ghostLeader && s.t) { const gs = ghostAt(s.ghostLeader, s.t); if (gs) cars.push({ z: gs[0] * U, x: gs[1], w: 300, draw: ghostSkier }); }
    if (ctx.hub && O.Hub) for (const gh of O.Hub.ghostList(ctx)) cars.push({ z: gh.s[0], x: gh.s[1], w: 300, col: gh.color, draw: ghostSkier });
    C.road.draw(r, { z, x: s.x || 0, h: H, turn: 0, cars });
    r.overlay(g => {
      // sun glare
      px.blend(g, .25, 'add', () => { px.disc(g, r.W * .82, r.H * .12, 26, '#fff8d0'); px.disc(g, r.W * .7, r.H * .3, 6, '#fff0c0'); px.disc(g, r.W * .6, r.H * .45, 4, '#ffe8b0'); });
      // falling snow
      for (let k = 0; k < 40; k++) { const fx = (E.hash2(k, 3) * r.W + game.real * 12 * (k % 3 + 1)) % r.W, fy = (E.hash2(k, 9) * r.H + game.real * 30 * (k % 4 + 1)) % r.H; px.rect(g, fx, fy, 1, 1, '#ffffff'); }
      if (!a || !a.rig || a.S.s === undefined) return;
      const p = C.road.project(s.s * U, s.x, s.h * U * .6);
      if (p) {
        const sc = Math.max(.6, r.H / 200);
        if (s.h > 0) px.blend(g, .35, 'normal', () => px.ell(g, p[0], p[1] + s.h * 6, 10 * sc, 3 * sc, '#3c5078'));
        if (s.crashT > 0) { const k = s.crashT; for (let i = 0; i < 6; i++) px.disc(g, p[0] + Math.sin(game.real * 9 + i) * 14 * sc, p[1] - (6 + i * 5) * sc, (3 + i % 3) * sc, '#ffffff'); void k; }
        O.drawRear(g, a.rig, p[0], p[1], sc, { skis: s.crashT <= 0, skiCol: a.nat.colors.a });
        if (Math.abs(s.steer) > .4 && s.air <= 0 && s.v > 8 && !ctx.fast) game.particles.add;
        if (a.turboT > 0) for (let i = 0; i < 8; i++) px.disc(g, p[0] + Math.sin(game.real * 5 + i) * 40, p[1] + 20 + i * 2, 10 + i * 2, i % 2 ? '#f4f8ff' : '#d8e4f4');
      }
    });
  },
  hud(ctx, r, g) {
    O.HUD.header(g, r, ctx, ctx.cur && ctx.cur.S.s !== undefined ? sectionAt(ctx.cur.S.s).name : '');
    const a = ctx.cur; if (!a || !a.S || a.S.s === undefined) return;
    const s = a.S;
    O.HUD.big(g, r.W - 14, 10, (s.t + s.pen).toFixed(2));
    O.text(g, Math.round(s.v * 3.6) + ' KM/H', r.W - 14, 30, '#ffffff', { align: 'right', scale: 2 });
    O.text(g, 'GATES ' + s.gatesOk + '/' + C.gates.length, r.W - 14, 50, '#c8d0f0', { align: 'right' });
    // course strip with the leader's dot
    const w = Math.min(220, r.W * .45), x = r.W / 2 - w / 2, y = 30; px.rect(g, x, y, w, 3, '#2a3060'); px.rect(g, x, y, w * Math.min(1, s.s / C.len), 3, '#f2c94c');
    for (const sp of C.splits) px.rect(g, x + w * sp / C.len, y - 2, 1, 7, '#ffffff');
    if (s.ghostLeader) { const gs = ghostAt(s.ghostLeader, s.t); if (gs) px.disc(g, x + w * Math.min(1, gs[0] / C.len), y + 1, 2, '#e8443a'); }
    // split popups
    const bs = ctx.S.bestSplits; if (bs && s.splits.length && s.t - (s.splitShown || 0) < 99) { const i = s.splits.length - 1, d = s.splits[i] - bs[i]; if (s.t + s.pen - s.splits[i] < 2.5) O.text(g, (d < 0 ? '-' : '+') + Math.abs(d).toFixed(2), r.W / 2, y + 10, d < 0 ? '#4fe0a8' : '#ff6b6b', { align: 'center', scale: 2 }); }
    if (a.human) {
      O.HUD.flame(g, 14, r.H - 44, a, a.input);
      if (!s.started) O.Prompt.draw(g, r.W / 2, r.H * .35, 'action', { input: a.input, label: 'PUSH OFF', align: 'center', size: 2 });
      else if (game.settings.hints) { O.Prompt.draw(g, 30, r.H - 40, 'alt', { input: a.input, label: s.tuck ? 'TUCKED' : 'TUCK', color: s.tuck ? '#4fe0a8' : '#ffffff' }); const j = C.jumps[s.ji]; if (j && j.s - s.s < 25 && j.s - s.s > 0) O.Prompt.draw(g, r.W / 2, r.H * .3, 'action', { input: a.input, label: 'PRE-JUMP!', align: 'center', color: '#ffd060' }); }
    }
  },
  ghostState(ctx, a) { const s = a.S; return [(s.s || 0) * U, s.x || 0, s.h || 0, 0, 8]; },
  ghostDraw() { return null; }
});
const SKY = new E.Backdrop({ sky: ['#3a8ae0', '#8ac4f4', '#e8f4ff'], sun: { x: .82, y: .12, r: 12, color: '#fff8d0' }, layers: [{ kind: 'mountains', color: '#c8d8f0', y: .45, height: .25, parallax: .1 }, { kind: 'mountains', color: '#a8bce0', y: .52, height: .18, parallax: .2 }, { kind: 'forest', color: '#3a5a6a', y: .62, height: .08, parallax: .3 }] });
function ghostAt(run, t) { if (!run || !run.length) return null; let i = run.findIndex(q => q[0] >= t); if (i < 0) return [run[run.length - 1][1], run[run.length - 1][2]]; if (i === 0) return [run[0][1], run[0][2]]; const a = run[i - 1], b = run[i], k = (t - a[0]) / Math.max(1e-6, b[0] - a[0]); return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
O.ghostAtRun = ghostAt;
function ghostSkier(g, sx, sy, s) { const W = this.w * s * 4; if (W < 2) return; px.blend(g, .5, 'normal', () => { px.rect(g, sx - W * .15, sy - W * 1.1, W * .3, W * .6, this.col || '#e8443a'); px.disc(g, sx, sy - W * 1.2, W * .15, '#ffffff'); px.rect(g, sx - W * .25, sy - W * .5, W * .1, W * .5, '#2a2a34'); px.rect(g, sx + W * .15, sy - W * .5, W * .1, W * .5, '#2a2a34'); }); }
function crash(ctx, a, word) { const s = a.S; s.crashT = 2; s.v *= .4; s.air = 0; s.h = 0; ctx.yikes(a, word, 'crash'); ctx.fx.sfx('crunch'); ctx.fx.sfx('thunk'); if (a.human || ctx.highlight) ctx.fx.say('downhill'); }
function animate(ctx, a, dt) {
  const s = a.S, rig = a.rig;
  if (s.crashT > 0) { O.Pose.set(rig, null); rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, flip: (2 - s.crashT) % 1, down: Math.min(1, (2 - s.crashT)) }); return; }
  O.Pose.set(rig, s.tuck ? 'skiTuck' : 'skiStand'); rig.bodyRoll = -s.steer * .35;
  rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: s.done && s.endT > .5 ? 'cheer' : null });
}
})();
