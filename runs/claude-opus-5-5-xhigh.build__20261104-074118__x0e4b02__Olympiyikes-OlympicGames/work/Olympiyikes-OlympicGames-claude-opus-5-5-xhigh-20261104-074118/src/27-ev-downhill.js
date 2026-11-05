// DOWNHILL — winter · "The Yikes Face" · steer through 24 gates, tuck for speed, pre-jump the crests, stay out of the
// orange netting. The pseudo-3D road (E.Road) behind the skier; physics on a parallel table in metres. O.RoadKit is
// shared with the bobsled: a course of sections -> a road (2 m a segment) and a table (slope, curve, features, gates).
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, { clamp, lerp } = E;
const UI = O.UI, Art = O.Art, DEG = Math.PI / 180, SEG = 2;
O.REAR = new E.View('rear', 'Rear', 0, 18, 1.6, 1);

O.RoadKit = {
  /** sections: [{ name, len (m), slope: deg | [from, to], curves: [c...], gates, tunnel, narrow, jump: 'start' | 'end' | m into it, colors }] */
  build(sections, o = {}) {
    const road = new E.Road(Object.assign({ segment: 200, width: 1600, lanes: 0, draw: 220, height: 520, fov: 100, rumble: 2, fog: null }, o.road || {}));
    const tab = []; const gates = []; const marks = []; let s = 0;
    sections.forEach((sec, si) => {
      const n = Math.round(sec.len / SEG), parts = sec.curves || [0], per = Math.ceil(n / parts.length);
      marks.push({ s, name: sec.name, i: si });
      for (let p = 0; p < parts.length; p++) {
        const cnt = Math.min(per, n - p * per); if (cnt <= 0) continue;
        const sl0 = Array.isArray(sec.slope) ? lerp(sec.slope[0], sec.slope[1], p / parts.length) : sec.slope, sl1 = Array.isArray(sec.slope) ? lerp(sec.slope[0], sec.slope[1], (p + 1) / parts.length) : sec.slope;
        const slope = (sl0 + sl1) / 2;
        road.add(cnt, { curve: parts[p], hill: -cnt * SEG * Math.tan(slope * DEG) * 100 * (o.hillK || .35), tunnel: !!sec.tunnel, colors: sec.colors || null });
        for (let k = 0; k < cnt; k++) tab.push({ slope: lerp(sl0, sl1, k / cnt), curve: parts[p], sec: si, tunnel: !!sec.tunnel, narrow: !!sec.narrow, grip: sec.tunnel ? .6 : 1 });
      }
      for (let g = 0; g < (sec.gates || 0); g++) { const gs = s + sec.len * (g + .6) / (sec.gates + .2), seg = tab[Math.min(tab.length - 1, Math.floor(gs / SEG))]; const side = seg.curve ? Math.sign(seg.curve) * .3 : (g % 2 ? .25 : -.25); gates.push({ s: gs, xc: side, n: gates.length }); }
      if (sec.jump !== undefined) marks[marks.length - 1].jump = s + (sec.jump === 'end' ? sec.len - 4 : sec.jump === 'start' ? 6 : sec.jump);
      s += sec.len;
    });
    const length = s; road.add(o.runout || 60, { curve: 0, hill: 0 }); for (let k = 0; k < (o.runout || 60); k++) tab.push({ slope: 0, curve: 0, sec: sections.length, tunnel: false, narrow: false, grip: 1, runout: true });
    const jumps = marks.filter(m => m.jump !== undefined).map(m => m.jump);
    return { road, tab, gates, marks, length, jumps, at: m => tab[clamp(Math.floor(m / SEG), 0, tab.length - 1)] };
  },
  /** a rig (or a sled) drawn at a road point, from behind */
  rigAt(g, rig, sx, sy, scale, o = {}) { const k = clamp(scale, .05, 2); if (k >= .98) return rig.draw(g, sx, sy, O.REAR); const v = O.RoadKit.view(k); rig.draw(g, sx, sy, v); },
  views: [], view(k) { const i = clamp(Math.round(k * 12), 1, 12); return this.views[i] || (this.views[i] = new E.View('rear' + i, 'Rear', 0, 18, 1.6 * i / 12, 1)); },
  pine(g, sx, sy, sc, c = '#2a5a3a') { const h = 600 * sc, w = 240 * sc; if (h < 2) return; px.rect(g, sx - Math.max(1, w * .08), sy - h * .18, Math.max(1, w * .16), h * .18, '#4a3020'); for (let i = 0; i < 3; i++) { const y = sy - h * (.18 + i * .26), ww = w * (1 - i * .25); px.poly(g, [[sx - ww / 2, y], [sx + ww / 2, y], [sx, y - h * .42]], i % 2 ? E.shade(c, .1) : c); px.poly(g, [[sx - ww / 3, y - h * .08], [sx + ww / 4, y - h * .1], [sx, y - h * .3]], '#ffffff'); } },
  fan(g, sx, sy, sc, seed) { const w = 400 * sc, h = 120 * sc; if (w < 3) return; for (let i = 0; i < 6; i++) { const hsh = O.hash(seed + ':' + i), x = sx - w / 2 + (i + .5) * w / 6; px.rect(g, x - h * .15, sy - h * .7, h * .3, h * .5, ['#e23b2e', '#2f7fe0', '#f2b632', '#6a3fc8', '#1fa8a0', '#ff7fb8'][hsh % 6]); px.disc(g, x, sy - h * .82, Math.max(1, h * .14), '#f2d4c4'); if (hsh % 3 === 0) { px.rect(g, x + h * .12, sy - h * 1.4, 1, h * .6, '#d8dce8'); O.Art.flag(g, x + h * .12 + 1, sy - h * 1.4, Math.max(3, h * .4), Math.max(2, h * .26), O.NATION_IDS[hsh % 8]); } } }
};

const SECTIONS = [
  { name: 'START SCHUSS', len: 150, slope: 28, curves: [0], gates: 1 },
  { name: 'THE CORKSCREW', len: 220, slope: 22, curves: [4, -4, 3], gates: 5 },
  { name: 'KANGAROO KICKER', len: 60, slope: [10, 32], curves: [0], gates: 1, jump: 22 },
  { name: 'PINE ALLEY', len: 200, slope: 20, curves: [-2], gates: 3, narrow: true },
  { name: 'ICE TUNNEL', len: 120, slope: 18, curves: [2], gates: 1, tunnel: true, colors: { road: ['#d8eef8', '#cfe6f2'], wall: ['#a8d8f0', '#98c8e0'], roof: '#78a8c8', portal: '#e8f4fb' } },
  { name: 'THE YIKES FACE', len: 180, slope: 38, curves: [0], gates: 3, jump: 'start' },
  { name: 'GLORY BEND', len: 260, slope: 18, curves: [5], gates: 4 },
  { name: 'FINISH SCHUSS', len: 250, slope: 15, curves: [1, -1], gates: 6, jump: 160 }
];
let C = null;
const course = () => C || (C = buildCourse());
function buildCourse() {
  const c = O.RoadKit.build(SECTIONS, { road: { colors: { road: ['#f4f8ff', '#e8f0fb'], grass: ['#dfe9f6', '#d3e0f0'], rumble: ['#ff7a2a', '#f05a1a'], lane: '#ffffff', wall: ['#a8d8f0', '#98c8e0'], roof: '#78a8c8', portal: '#e8f4fb' }, sky: new E.Backdrop({ sky: ['#3a7ad8', '#8ac0f0', '#e0f0fb'], sun: true, layers: [{ kind: 'mountains', color: '#b8c8e8', y: .5, height: .3, parallax: .02 }, { kind: 'mountains', color: '#e8f0fb', y: .55, height: .2, parallax: .04 }] }) } });
  const R = c.road;
  for (let m = 6; m < c.length; m += 14) { const sec = c.at(m); if (sec.tunnel) continue; R.place(m * 100, -1.5 - (O.hash('p' + m) % 3) * .4, { w: 240, draw: (g, sx, sy, sc) => O.RoadKit.pine(g, sx, sy, sc) }); R.place(m * 100 + 600, 1.5 + (O.hash('q' + m) % 3) * .4, { w: 240, draw: (g, sx, sy, sc) => O.RoadKit.pine(g, sx, sy, sc, '#2a6a44') }); }
  for (let m = 20; m < c.length; m += 60) { if (c.at(m).tunnel) continue; R.place(m * 100, (m / 60) % 2 ? -1.35 : 1.35, { w: 400, draw: (g, sx, sy, sc) => O.RoadKit.fan(g, sx, sy, sc, m) }); }
  for (const gt of c.gates) for (const side of [-1, 1]) R.place(gt.s * 100, gt.xc + side * .34, { w: 30, draw: (g, sx, sy, sc) => { const h = 260 * sc, w = 70 * sc; px.rect(g, sx - Math.max(1, w * .06), sy - h, Math.max(1, w * .12), h, '#3a3a48'); px.rect(g, sx - (side < 0 ? w : 0), sy - h, w, h * .4, gt.n % 2 ? '#2f7fe0' : '#e23b2e'); } });
  R.place(2 * 100, 0, { w: 900, draw: (g, sx, sy, sc) => { const w = 1700 * sc, h = 700 * sc; px.rect(g, sx - w / 2, sy - h, w, h * .25, '#7a4a2a'); px.rect(g, sx - w / 2, sy - h * .75, w * .08, h * .75, '#7a4a2a'); px.rect(g, sx + w / 2 - w * .08, sy - h * .75, w * .08, h * .75, '#7a4a2a'); E.font.text(g, 'START', sx - 12, sy - h * .92, '#ffffff', { outline: false }); } });
  R.place(c.length * 100, 0, { w: 900, draw: (g, sx, sy, sc) => { const w = 1800 * sc, h = 800 * sc; px.rect(g, sx - w / 2, sy - h, w, h * .2, '#e23b2e'); px.rect(g, sx - w / 2, sy - h, w * .06, h, '#c8ccd8'); px.rect(g, sx + w / 2 - w * .06, sy - h, w * .06, h, '#c8ccd8'); if (sc > .02) E.font.text(g, 'FINISH', sx - 15, sy - h * .95, '#ffffff', { outline: false }); } });
  R.place((c.length + 10) * 100, -1.8, { w: 600, draw: (g, sx, sy, sc) => { const w = 1400 * sc, h = 500 * sc; px.rect(g, sx - w / 2, sy - h, w, h, '#5a4a7a'); if (w > 20) O.Art.crowd(g, sx - w / 2, sy - h, w, h, { seed: 88, rowH: Math.max(3, h / 4), colW: Math.max(3, w / 30) }); } });
  for (const j of c.jumps) R.place(j * 100, 1.2, { w: 200, draw: (g, sx, sy, sc) => { const w = 300 * sc, h = 200 * sc; px.rect(g, sx - w / 2, sy - h, w, h * .5, '#f2b632'); if (w > 18) E.font.text(g, 'JUMP', sx - 10, sy - h + 1, '#14182e', { font: 'tiny', outline: false }); } });
  return c;
}
O.downhillCourse = course;

O.defEvent({
  id: 'downhill', name: 'DOWNHILL', short: 'Downhill', season: 'winter', venueName: 'THE YIKES FACE', music: 'yikesface', view: 'brawler',
  format: { type: 'attempts', attempts: 1 }, highlights: 0, maxTime: 120, roundName: 'RUN',
  measure: { unit: 's', better: 'lower', fmt: v => O.fmt.time(v), wr: [47.62, 'MTP', 'ROCKY SUMMIT'], qualify: { Easy: 58, Normal: 52.5, Hard: 49 }, seedStep: .6 },
  points: t => 8.5 * Math.pow(Math.max(0, 80 - t), 1.4),
  tune: { dTuck: [.0024, .001, .006, .0001, 'Tuck drag'], dUp: [.0062, .002, .012, .0001, 'Standing drag'], turnRate: [1.05, .4, 2, .05, 'Turn rate'], curvePush: [.12, 0, .4, .01, 'Curve push'], gateBoost: [.02, 0, .08, .005, 'Gate boost'], missPenalty: [.5, 0, 2, .05, 'Missed gate penalty (s)'], crashSteer: [.6, .2, 1, .05, 'Landing steer limit'] },
  howto: { goal: 'Fastest time down the mountain. Pass inside the gates (+0.50 s for each one missed), tuck on the straights, stay out of the orange netting.', rows: [[['moveH'], 'STEER'], [['alt'], 'HOLD: TUCK (FASTER, TURNS LESS)'], [['action'], 'PRE-JUMP JUST BEFORE A CREST'], [['turbo'], 'AVALANCHE!']] },
  yikesKinds: ['netting', 'crash'], turboName: 'AVALANCHE!',
  laurel: { id: 'cleansweep', name: 'CLEAN SWEEP', text: 'Pass all 24 gates in one run', test: (ctx, a) => !!(ctx.s && ctx.s.gatesOk === 24) },
  hub: { ok: true, attempts: 1, seconds: 70 }, attract: { seconds: 22, setup(ctx) { ctx.w.attractFrom = 740; } },
  phases: SECTIONS.map(s => s.name),
  hubSample: ctx => { const s = ctx.s; return s && s.phase === 'run' ? [s.m, s.x, s.h] : null; }, hubTime: ctx => ctx.s ? ctx.s.t : 0,
  prebuild() { course(); },
  build(ctx) { course(); for (const a of ctx.athletes) a.rig = O.makeRig(a.nation, 'downhill'); game.weather = { kind: 'snow', amount: .15, wind: .2 }; ctx.w.ghost = null; ctx.w.bestTrack = null; },
  start(ctx, a) {
    const c = course(), from = ctx.w.attractFrom && a.cheat ? ctx.w.attractFrom : 0;
    ctx.s = { a, phase: 'start', pt: 0, m: from, x: 0, v: from ? 30 : 0, steer: 0, tuck: false, air: 0, airT: 0, h: 0, vh: 0, pre: null, crash: 0, t: 0, pen: 0, gate: c.gates.findIndex(g => g.s > from), gatesOk: 0, missed: 0, splits: [], finish: null, track: O.Ghost.rec(), msg: null, msgT: 0, avalanche: 0, jumped: new Set(c.jumps.filter(j => j < from)) };
  },
  step(ctx, dt) {
    const s = ctx.s, a = s.a, I = a.I, T = ctx.T, c = course(); s.pt += dt;
    if (s.phase === 'start') { if (s.pt > (ctx.meet.mode === 'attract' ? .3 : 1.6)) { s.phase = 'run'; s.pt = 0; ctx.cue('start', { a }); ctx.sfx('beepHi'); } return; }
    if (s.phase === 'done') return;
    if (s.phase === 'finished') { s.v = Math.max(0, s.v - 18 * dt); s.m += s.v * dt; if (s.pt > (O.sandbox ? 0 : 2.4)) s.phase = 'done'; return; }
    s.t += dt;
    const sec = c.at(s.m), g = 9.81;
    if (s.crash > 0) { s.crash -= dt; s.v = Math.max(0, s.v - 14 * dt); s.m += s.v * dt; if (s.crash <= 0) { s.v = 10; s.x = clamp(s.x, -1, 1) * .95; } return; }
    s.tuck = I.Xd; s.steer += (clamp(I.mv[0], -1, 1) - s.steer) * Math.min(1, dt * 10);
    const turbo = ctx.turbo(a, 1.18), drag = (s.tuck ? T.dTuck : T.dUp) * (s.air > 0 ? 1.3 : 1);
    let acc = g * Math.sin(sec.slope * DEG) - drag * s.v * s.v - .03 * g - .05 * Math.abs(s.steer) * s.v * (s.air > 0 ? 0 : 1);
    if (Math.abs(s.x) > 1) acc -= 3 * drag * s.v * s.v;
    s.v = Math.max(0, s.v + acc * dt);
    const vEff = s.v * turbo;
    // lateral
    if (s.air <= 0) { const turn = T.turnRate * (s.tuck ? .55 : 1) * sec.grip; s.x += (s.steer * turn - T.curvePush * sec.curve * Math.pow(vEff / 30, 2) * .25) * dt; }
    else s.x -= T.curvePush * sec.curve * Math.pow(vEff / 30, 2) * .12 * dt;
    // jumps
    for (const j of c.jumps) if (!s.jumped.has(j) && s.m >= j) { s.jumped.add(j); const pre = s.pre !== null && s.t - s.pre >= .05 && s.t - s.pre <= .6; s.airT = clamp(vEff / (sec.slope > 30 || j > 700 && j < 800 ? 13 : 20), .4, 2.6) * (pre ? .5 : 1); s.air = s.airT; ctx.cue('jump', { a }); if (pre) ctx.hype(a, .15); }
    if (I.A && (s.pre === null || s.t - s.pre > 1)) s.pre = s.t;
    if (s.air > 0) { s.air -= dt; s.h = Math.sin(clamp(1 - s.air / s.airT, 0, 1) * Math.PI) * s.airT * 2.2; if (s.air <= 0) { s.h = 0; if (Math.abs(s.steer) > T.crashSteer || Math.abs(s.x) > 1) crash(ctx, 'crash'); else ctx.sfx('crunch'); } }
    const lim = sec.narrow ? 1.05 : 1.25;
    if (Math.abs(s.x) >= lim && s.crash <= 0) crash(ctx, 'netting');
    const prev = s.m; s.m += vEff * dt;
    // gates
    const gt = c.gates[s.gate];
    if (gt && s.m >= gt.s && prev < gt.s) {
      if (Math.abs(s.x - gt.xc) <= .32 && s.crash <= 0) { s.gatesOk++; s.v *= 1 + T.gateBoost; ctx.hype(a, .05); ctx.sfx('swish'); }
      else { s.missed++; s.pen += T.missPenalty; s.msg = '+' + T.missPenalty.toFixed(2); s.msgT = 1.2; ctx.cue('miss', { a }, { cool: 6 }); ctx.sfx('buzzer', { vol: .3 }); }
      s.gate++;
    }
    // splits at three checkpoints
    for (const k of [1, 2, 3]) { const at = c.length * k / 4; if (s.m >= at && prev < at) { s.splits.push(s.t + s.pen); const best = ctx.w.bestSplits; if (best && best[k - 1] !== undefined) { const d = s.t + s.pen - best[k - 1]; s.msg = (d <= 0 ? '−' : '+') + Math.abs(d).toFixed(2); s.msgT = 1.6; s.msgC = d <= 0 ? '#4fe0a8' : '#ff6b6b'; } } }
    if (s.msgT > 0) s.msgT -= dt;
    if (!O.sandbox || true) O.Ghost.push(s.track, s.t, [s.m, s.x, s.h, s.tuck ? 1 : 0, s.steer, 0]);
    if (s.m >= c.length) { s.finish = +(s.t - (s.m - c.length) / Math.max(1, vEff) + s.pen).toFixed(2); s.phase = 'finished'; s.pt = 0; if (!O.sandbox) { O.CrowdAudio.cheer(); ctx.cue('win', { a }, { prio: 3 }); } }
    if (s.t > 110) { s.phase = 'done'; ctx.note(a, 'DNF'); }
    if (!O.sandbox) animate(ctx, dt);
  },
  done: ctx => ctx.s.phase === 'done',
  perf: ctx => ctx.s.finish,
  attemptInfo: ctx => ({ track: ctx.s.track.s, splits: ctx.s.splits, gates: ctx.s.gatesOk }),
  onPlay(ctx) {
    // the leader's run so far becomes the ghost
    let best = null; for (const b of ctx.athletes) { const at = b.attempts[0]; if (at && at.perf != null && (!best || at.perf < best.perf)) best = { perf: at.perf, info: at.info, a: b }; }
    ctx.w.ghost = best && best.info ? { s: best.info.track, a: best.a } : null; ctx.w.bestSplits = best && best.info ? best.info.splits : null;
  },
  bot(ctx, a, dt) {
    const s = ctx.s, I = O.blankIntent(), bs = a.bs, perfect = a.cheat === 'perfect', c = course();
    if (!s || s.a !== a || s.phase !== 'run') return I;
    if (bs.r === undefined) { bs.r = ctx.rng('bot:' + a.id); bs.noise = perfect ? 0 : (1 - a.skill) * 1.1; bs.crashAt = !perfect && bs.r() < (1 - a.skill) * .15 ? 760 + bs.r() * 40 : null; bs.ph = bs.r() * 9; }
    const gt = c.gates[s.gate], target = gt ? gt.xc + Math.sin(s.t * 1.3 + bs.ph) * bs.noise * .4 : 0, sec = c.at(s.m), look = c.at(s.m + 20);
    const need = ctx.T.curvePush * sec.curve * Math.pow(s.v / 30, 2) * .25 / (ctx.T.turnRate * (s.tuck ? .55 : 1) * sec.grip);
    let st = clamp((target - s.x) * 2.5 + need, -1, 1);
    if (bs.crashAt && s.m > bs.crashAt && s.m < bs.crashAt + 30) st = 1;
    I.mv = [st, 0];
    I.Xd = Math.abs(st) < (perfect ? .52 : .2 + a.skill * .3) && s.air <= 0; void look;
    for (const j of c.jumps) { const d = j - s.m; if (d > 0 && d < s.v * (perfect ? .3 : .3 + (1 - a.skill) * .6) && bs.pre !== j) { I.A = true; bs.pre = j; } }
    if (s.air > 0) I.mv = [s.air < .5 ? 0 : st * .3, 0];
    if (a.hype >= 1 && sec.slope > 20) I.T = true;
    return I;
  },
  cam() { game.focus(0, 0, 0); },
  draw(ctx, r) {
    const s = ctx.s, c = course(); if (!s) return;
    const R = c.road, h = 520 + s.h * 60, camZ = s.m * 100 - R.ahead(h), camX = s.x * .85;
    const cars = [];
    if (ctx.w.ghost && (s.phase === 'run' || s.phase === 'finished')) { const q = O.Ghost.at(ctx.w.ghost.s, s.t); if (q) cars.push({ z: q[1] * 100, x: q[2], w: .1, draw: (g, sx, sy, sc) => ghostDraw(g, sx, sy, sc, ctx.w.ghost.a, q) }); }
    if (O.Hub && O.Hub.active) for (const gh of O.Hub.ghostsFor('downhill')) { const q = O.Ghost.at(gh.track, s.t); if (q) cars.push({ z: q[1] * 100, x: q[2], w: .1, draw: (g, sx, sy, sc) => ghostDraw(g, sx, sy, sc, null, q, gh.color, gh.name) }); }
    if (s.avalanche > 0 || s.a.turboT > 0) cars.push({ z: Math.max(0, s.m - 14) * 100, x: 0, w: 1, draw: (g, sx, sy, sc) => { const w = 2600 * sc, hh = 900 * sc; for (let i = 0; i < 9; i++) px.disc(g, sx - w / 2 + i * w / 8, sy - hh * (.3 + .2 * Math.sin(game.real * 6 + i)), hh * .35, i % 2 ? '#ffffff' : '#e8f0fb'); } });
    ctx.w.turn = (ctx.w.turn || 0) + c.at(s.m).curve * s.v * .004;
    R.draw(r, { z: camZ, x: camX, h, turn: ctx.w.turn, cars });
    r.overlay(g => {
      const p = R.project(s.m * 100, s.x, s.h * 100) || [r.W / 2, r.H - 20, 1], a = s.a;
      const sx = Math.round(p[0]), sy = Math.round(Math.min(r.H - 8, p[1]));
      px.blend(g, .4, 'normal', () => px.ell(g, sx, Math.round(Math.min(r.H - 6, R.project(s.m * 100, s.x, 0)[1])), 12, 3, '#3a4a6a'));
      O.RoadKit.rigAt(g, a.rig, sx, sy, 1);
      const J = a.rig.J; for (const f of [J.footL, J.footR]) { const w = a.rig.worldOffset(f), q = O.Gear.wp(O.REAR, sx, sy, w); px.rect(g, Math.round(q[0]) - 1, Math.round(q[1]) - 9, 3, 10, O.Records.golden(a.nation, 'downhill') ? '#f2c94c' : O.nation(a.nation).colors.b); }
      if (Math.abs(s.steer) > .3 && s.air <= 0 && s.v > 10 && !O.sandbox) for (let i = 0; i < 2; i++) game.particles.add({ kind: 'dust', x: 0, y: 0, z: 0, max: .3, size: 2, color: '#ffffff' });
      if (s.v > 26) for (let i = 0; i < 8; i++) { const hsh = O.hash('sl' + i + Math.floor(game.real * 12)), x = hsh % r.W, y = (hsh >>> 9) % Math.round(r.H * .6); px.blend(g, .5, 'add', () => px.rect(g, x, y, 1, 6 + (s.v - 26) / 2, '#ffffff')); }
      const sun = [r.W * .78, r.H * .16]; px.blend(g, .18, 'add', () => { px.disc(g, sun[0], sun[1], 40, '#fff6c8'); px.disc(g, sun[0], sun[1], 20, '#ffffff'); });
    });
  },
  hud(ctx, r, g) {
    const s = ctx.s, W = r.W, H = r.H, c = course(); if (!s) return; const a = s.a;
    const tt = s.finish != null ? s.finish : s.t + s.pen; O.HUD.big(g, O.fmt.time(tt).replace(' s', ''), W - 14 - E.font.width(O.fmt.time(tt).replace(' s', ''), { scale: 3 }), 10, '#ffe066');
    UI.text(g, Math.round(s.v * 3.6 * ctx.turbo(a, 1.18)) + ' KM/H', W - 90, 36, '#ffffff', { scale: 2 });
    UI.text(g, 'GATES ' + s.gatesOk + ' / 24' + (s.missed ? '  MISSED ' + s.missed : ''), W - 140, 54, s.missed ? '#ff9a9a' : '#4fe0a8');
    // the course strip
    const x0 = 14, y0 = 56, w0 = 170; px.rect(g, x0, y0, w0, 3, '#3a3f66'); for (const m of c.marks) px.rect(g, x0 + Math.round(m.s / c.length * w0), y0 - 2, 1, 7, '#aab0d0');
    if (ctx.w.ghost) { const q = O.Ghost.at(ctx.w.ghost.s, s.t); if (q) px.disc(g, x0 + Math.round(clamp(q[1] / c.length, 0, 1) * w0), y0 + 1, 3, '#aab0d0'); }
    px.disc(g, x0 + Math.round(clamp(s.m / c.length, 0, 1) * w0), y0 + 1, 3, a.color);
    const secNow = c.marks.slice().reverse().find(m => m.s <= s.m); if (secNow) UI.text(g, secNow.name, x0, y0 + 8, '#ffffff');
    if (s.msgT > 0 && s.msg) UI.text(g, s.msg, W / 2 - UI.tw(s.msg, 3) / 2, 70, s.msgC || '#ff6b6b', { scale: 3 });
    if (s.phase === 'start') UI.text(g, 'GO WHEN READY... 3, 2, 1', W / 2 - UI.tw('GO WHEN READY... 3, 2, 1', 2) / 2, 80, '#ffffff', { scale: 2 });
    if (a.human && s.phase === 'run') { O.Prompt.strip(g, [['moveH', 'STEER'], ['alt', s.tuck ? 'TUCKED' : 'TUCK'], ['action', 'PRE-JUMP']], W / 2, H - 22, { inp: a.inp }); const nj = c.jumps.find(j => j > s.m && j - s.m < 40); if (nj) UI.text(g, 'CREST AHEAD!', W / 2 - UI.tw('CREST AHEAD!', 2) / 2, 92, '#ffe066', { scale: 2 }); }
    O.HUD.flame(g, 14, 84, a);
    if (s.crash > 0) UI.text(g, 'GET UP!', W / 2 - UI.tw('GET UP!', 2) / 2, 110, '#ff6b6b', { scale: 2 });
  },
  onTurbo(ctx, a) { ctx.s.avalanche = 3; ctx.cue('avalanche', { a }); }
});
function crash(ctx, kind) { const s = ctx.s; if (O.god(s.a)) { s.x = Math.sign(s.x) * Math.min(Math.abs(s.x), .95); return; } s.crash = 2; s.air = 0; s.h = 0; s.steer = 0; ctx.yikes(s.a, kind); ctx.sfx('crunch'); ctx.shake(4); }
function ghostDraw(g, sx, sy, sc, a, q, color, name) {
  const k = clamp(sc * 600, .1, 1.4), h = 34 * k, w = 10 * k, c = color || (a ? O.nation(a.nation).colors.a : '#ffffff');
  px.blend(g, .55, 'normal', () => { px.rect(g, sx - w / 2, sy - h, w, h * .6, c); px.disc(g, sx, sy - h - w * .3, Math.max(1, w * .45), c); px.rect(g, sx - w * .7, sy - h * .45, w * .3, h * .45, c); px.rect(g, sx + w * .4, sy - h * .45, w * .3, h * .45, c); });
  if (k > .3) E.font.text(g, name || (a ? a.nation : ''), Math.round(sx - 6), Math.round(sy - h - 12), '#ffffff', { font: 'tiny', outline: '#000' });
}
function animate(ctx, dt) {
  const s = ctx.s, a = s.a, rig = a.rig;
  const st = { x: 0, y: 0, z: 0, facing: -Math.PI / 2, vx: 0, vy: 0 };
  if (s.crash > 0) { O.Pose.set(rig, 'tumble'); O.Pose.rot(rig, (2 - s.crash) * 6, Math.sin(s.crash * 8) * .6, [0, 0, rig.o.hipZ]); }
  else if (s.phase === 'finished' || s.phase === 'done') { O.Pose.rot(rig, 0, 0); O.Pose.clear(rig); st.pose = s.finish != null ? 'cheer' : 'hips'; }
  else { O.Pose.set(rig, s.tuck || s.phase === 'start' ? 'skiTuck' : 'skiStand'); O.Pose.rot(rig, 0, -s.steer * .38, [0, 0, 0]); if (s.air > 0) st.air = true; }
  rig.update(dt, st);
}
})();
