// ARCHERY — summer · Bullseye Lawn (seaside) · aim under sway: draw, hold your breath, allow for the wind, release.
// The main view is the target close-up; the inset shows the archer at the line, palms and the sea behind.
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, { clamp, lerp } = E;
const UI = O.UI, Art = O.Art, RING = 6.1, FACE = 61;
const SIDE = new E.View('archery-inset', 'Inset', 0, 0, 1.5, 1);
const RINGS = [['#f2e24c', '#e8d020'], ['#f2e24c', '#e8d020'], ['#e83a3a', '#c82a2a'], ['#e83a3a', '#c82a2a'], ['#3a8ae8', '#2a6ac8'], ['#3a8ae8', '#2a6ac8'], ['#1a1a1a', '#2a2a2a'], ['#1a1a1a', '#2a2a2a'], ['#f4f4f4', '#d8d8d8'], ['#f4f4f4', '#d8d8d8']];
const scoreOf = r => r <= RING / 2 ? { s: 10, x: true } : r > FACE ? { s: 0, x: false } : { s: 10 - Math.floor(r / RING), x: false };

O.defEvent({
  id: 'archery', name: 'ARCHERY', short: 'Archery', season: 'summer', venueName: 'BULLSEYE LAWN', music: 'archery', view: 'side', input: O.KEYS_AIM,
  format: { type: 'attempts', attempts: 2 }, aggregate: 'sum', highlights: 0, maxTime: 90, roundName: 'END',
  measure: { unit: 'pts', better: 'higher', fmt: v => String(Math.round(v)), wr: [60, 'NEO', 'PIXEL VANCE'], qualify: { Easy: 40, Normal: 48, Hard: 53 }, seedStep: -1, dp: 0 },
  tie: (a, b) => xs(b) - xs(a),
  points: v => 20 * v,
  tune: { drawTime: [.9, .3, 2, .05, 'Draw time (s)'], swayA0: [7, 0, 20, .5, 'Sway (cm)'], swayGrowth: [.6, 0, 2, .05, 'Sway growth after 2.5 s'], breathTime: [2.5, .5, 6, .1, 'Breath hold (s)'], windMax: [4, 0, 10, .1, 'Max wind (m/s)'], windShift: [4.5, 0, 10, .1, 'Wind shift (cm per m/s)'] },
  howto: { goal: 'Two ends of three arrows, 60 the maximum. Hold to draw, steady the sway, allow for the wind, release.', rows: [[['move'], 'AIM (OR THE MOUSE)'], [['action'], 'HOLD: DRAW · RELEASE: SHOOT'], [['alt'], 'HOLD BREATH: STEADY (BRIEFLY)'], [['turbo'], 'EAGLE EYE: TIME SLOWS, SWAY STOPS']] },
  yikesKinds: ['stringslap'], turboName: 'EAGLE EYE!',
  laurel: { id: 'robin', name: 'ROBIN HOOD', text: 'Split an arrow already in the target', test: (ctx, a) => !!(ctx.s && ctx.s.robin) },
  hub: { ok: true, attempts: 1, seconds: 50 }, attract: { seconds: 20, setup(ctx) { ctx.w.attractRobin = true; } },
  phases: ['arrow 1', 'arrow 2', 'arrow 3'],
  hubSample: ctx => { const s = ctx.s; return s ? [].concat(...s.hits.slice(-6).map(h => [h[0], h[1]])) : null; },
  build(ctx) { for (const a of ctx.athletes) a.rig = O.makeRig(a.nation, 'archery'); ctx.w.tgt = { cx: 240, cy: 120, k: 1.6 }; ctx.w.allHits = new Map(); },
  start(ctx, a) {
    const hub = ctx.meet.mode === 'hub', prev = ctx.w.allHits.get(a) || [];
    ctx.s = { a, phase: 'aim', pt: 0, n: 0, arrows: [], hits: prev.slice(), aim: [0, 0], mv: 0, draw: 0, drawing: false, held: 0, breath: 1, holding: false, gasp: 0, hr: 1, wind: 0, flight: 0, shot: null, clock: hub ? 12 : 20, t0: 0, robin: false, slap: false };
    newArrow(ctx);
  },
  step(ctx, dt) {
    const s = ctx.s, a = s.a, I = a.I, T = ctx.T; s.pt += dt; s.t0 += dt;
    if (s.phase === 'aim') {
      s.clock -= dt;
      const sp = 40, ox = s.aim[0], oy = s.aim[1];
      if (I.aim && ctx.w.tgt) { const t = ctx.w.tgt; s.aim = [clamp((I.aim[0] - t.cx) / t.k, -80, 80), clamp((I.aim[1] - t.cy) / t.k, -80, 80)]; }
      else { s.aim[0] = clamp(s.aim[0] + I.mv[0] * sp * dt, -80, 80); s.aim[1] = clamp(s.aim[1] + I.mv[1] * sp * dt, -80, 80); }
      s.mv = Math.hypot(s.aim[0] - ox, s.aim[1] - oy) / Math.max(dt, 1e-6);
      if (I.Ad) { if (!s.drawing) { s.drawing = true; s.draw = 0; ctx.sfx('stringpull'); } s.draw = Math.min(1, s.draw + dt / T.drawTime); s.held += dt; }
      const full = s.draw >= 1;
      s.holding = full && I.Xd && s.breath > 0 && s.gasp <= 0;
      if (s.holding) { s.breath = Math.max(0, s.breath - dt / T.breathTime); if (s.breath <= 0) { s.gasp = 2; ctx.sfx('gasp'); } }
      else if (!I.Xd) s.breath = Math.min(1, s.breath + dt * .25);
      if (s.gasp > 0) s.gasp -= dt;
      if (s.drawing && !I.Ad && !I.Au) { s.drawing = false; s.draw = 0; s.held = 0; }
      if (s.drawing && I.Au) release(ctx);
      if (s.clock <= 0 && s.phase === 'aim') { s.drawing = true; s.draw = Math.max(s.draw, .3); release(ctx); }
    } else if (s.phase === 'flight') {
      s.flight += dt / (a.turboT > 0 ? .4 : 1);
      if (s.flight >= .75) hit(ctx);
    } else if (s.phase === 'hit') {
      if (s.pt > (O.sandbox ? 0 : 1.1)) { if (s.n >= 3) { s.phase = 'done'; ctx.w.allHits.set(a, s.hits); } else newArrow(ctx); }
    }
    if (!O.sandbox) animate(ctx, dt);
  },
  done: ctx => ctx.s.phase === 'done',
  perf: ctx => ctx.s.arrows.reduce((m, x) => m + x.s, 0),
  attemptInfo: ctx => ({ arrows: ctx.s.arrows.map(x => ({ s: x.s, x: x.x, p: x.p })) }),
  bot(ctx, a, dt) {
    const s = ctx.s, I = O.blankIntent(), bs = a.bs, perfect = a.cheat === 'perfect', T = ctx.T;
    if (!s || s.a !== a || s.phase !== 'aim') return I;
    if (bs.arrow !== s.n) { bs.arrow = s.n; const r = ctx.rng('bot:' + a.id + ':' + s.n); const sig = perfect ? 0 : (1 - a.skill) * 12 + 2; bs.err = [O.gauss(r) * sig, O.gauss(r) * sig]; bs.comp = perfect ? 1 : a.skill * (.85 + r() * .3); bs.wait = perfect ? .3 : .3 + r() * 1.2; bs.robin = ctx.w.attractRobin && perfect && s.n === 2; }
    const target = bs.robin && s.hits.length ? [s.hits[s.hits.length - 1][0] - s.wind * T.windShift, s.hits[s.hits.length - 1][1]] : [-s.wind * T.windShift * bs.comp + bs.err[0], bs.err[1]];
    const dx = target[0] - s.aim[0], dy = target[1] - s.aim[1], d = Math.hypot(dx, dy);
    if (d > .5) I.mv = [clamp(dx / 4, -1, 1), clamp(dy / 4, -1, 1)];
    if (d < 3 || s.drawing) { I.Ad = true; }
    if (s.draw >= 1) { I.Xd = true; const sw = sway(ctx); if (s.held > bs.wait + T.drawTime && (perfect ? Math.hypot(sw[0], sw[1]) < .6 : true) && d < 1.5) { I.Ad = false; I.Au = true; } }
    if (s.clock < 1.5 && s.drawing) { I.Ad = false; I.Au = true; }
    if (a.hype >= 1 && s.draw >= 1) I.T = true;
    return I;
  },
  cam() { game.focus(0, 0, 30); },
  draw(ctx, r) {
    const g = r.ctx, t = game.real, W = r.W, H = r.H, s = ctx.s;
    // the lawn by the sea, seen from the line toward the target
    Art.sky(g, r.bw, r.bh * .5, ['#4a9ae8', '#8ac4f0', '#d8ecf8']); Art.clouds(g, r.bw, 10, t, { n: 4, speed: 5 });
    px.rect(g, 0, Math.round(r.bh * .42), r.bw, Math.round(r.bh * .1), '#2a7ab8'); for (let i = 0; i < 26; i++) px.rect(g, (i * 53 + Math.floor(t * 9)) % r.bw, Math.round(r.bh * .44) + (i % 4) * 4, 14, 1, '#bfe0f4');
    px.rect(g, 0, Math.round(r.bh * .52), r.bw, r.bh, '#4aa84a'); for (let i = 0; i < 10; i++) px.rect(g, 0, Math.round(r.bh * .52 + i * 12), r.bw, 6, i % 2 ? '#52b052' : '#46a046');
    for (let k = 0; k < 6; k++) { const x = (k * 89 + 20) % r.bw, y = Math.round(r.bh * .52); px.rect(g, x, y - 36, 3, 36, '#8a6a3a'); for (let f = 0; f < 6; f++) { const an = f * 1.05 + Math.sin(t * 1.3 + k) * .15; px.line(g, x + 1, y - 36, x + 1 + Math.cos(an) * 14, y - 36 + Math.sin(an) * 6 - 3, '#2a8a3a', 2); } }
    // wind flags along the range
    for (let k = 0; k < 3; k++) { const x = Math.round(r.bw * (.2 + k * .3)), y = Math.round(r.bh * .5); px.rect(g, x, y - 26, 1, 26, '#e8ecf4'); const w = s ? s.wind : 1, len = 4 + Math.abs(w) * 3; for (let i = 0; i < 3; i++) px.rect(g, x + (w >= 0 ? 1 + i * len / 3 : -i * len / 3 - len / 3), y - 26 + i + Math.round(Math.sin(t * 9 + i + k) * 1), Math.ceil(len / 3), 5 - i, i % 2 ? '#ffffff' : '#e23b2e'); }
    // the shade tent
    px.poly(g, [[r.bw - 120, Math.round(r.bh * .52)], [r.bw - 96, Math.round(r.bh * .52) - 40], [r.bw - 40, Math.round(r.bh * .52) - 40], [r.bw - 16, Math.round(r.bh * .52)]], '#f4f4f4'); px.rect(g, r.bw - 110, Math.round(r.bh * .52) - 4, 84, 4, '#e23b2e');
    void W; void H;
  },
  hud(ctx, r, g) {
    const s = ctx.s, W = r.W, H = r.H, t = game.real; if (!s) return; const a = s.a, T = ctx.T;
    // the target close-up
    const R = Math.min(105, H * .43), cx = Math.round(W * .58), cy = Math.round(H * .5), k = R / FACE; ctx.w.tgt = { cx, cy, k };
    const zoom = s.phase === 'hit' && s.pt < .3 ? 1 + .1 * Math.sin(s.pt / .3 * Math.PI) : 1, kk = k * zoom;
    px.rect(g, cx - R * zoom - 6, cy - R * zoom - 6, R * 2 * zoom + 12, R * 2 * zoom + 12, '#c8a060'); px.rect(g, cx - R * zoom - 4, cy - R * zoom - 4, R * 2 * zoom + 8, R * 2 * zoom + 8, '#e0c080');
    for (let i = 9; i >= 0; i--) { const rr = Math.round((i + 1) * RING * kk), [c1, c2] = RINGS[9 - i] ? RINGS[9 - i] : RINGS[0]; px.disc(g, cx, cy, rr, c2); px.disc(g, cx, cy, rr - 1, c1); }
    const xr = Math.round(RING / 2 * kk); px.disc(g, cx, cy, xr, '#ffe066'); px.dot(g, cx, cy, '#1a1a1a'); px.rect(g, cx - 1, cy, 3, 1, '#1a1a1a'); px.rect(g, cx, cy - 1, 1, 3, '#1a1a1a');
    // arrows in the target (this attempt and earlier ones)
    for (const h of s.hits) { const hx = Math.round(cx + h[0] * kk), hy = Math.round(cy + h[1] * kk); px.disc(g, hx, hy, 2, '#14161e'); px.line(g, hx, hy, hx + 5, hy - 5, '#e8d8b0', 1); px.rect(g, hx + 4, hy - 7, 3, 3, h[2] || a.color); }
    if (O.Hub && O.Hub.active) for (const gh of Object.values(O.Hub.ghosts)) { const q = gh.last || []; for (let i = 0; i + 1 < q.length; i += 2) { const hx = Math.round(cx + q[i] * kk), hy = Math.round(cy + q[i + 1] * kk); px.disc(g, hx, hy, 2, gh.color); px.dot(g, hx, hy, '#ffffff'); } }
    // the reticle (aim + sway)
    if (s.phase === 'aim') {
      const sw = sway(ctx), rx = Math.round(cx + (s.aim[0] + sw[0]) * kk), ry = Math.round(cy + (s.aim[1] + sw[1]) * kk), c = s.draw >= 1 ? (s.holding ? '#4fe0a8' : '#ffffff') : '#ffb0b0';
      px.rect(g, rx - 12, ry, 8, 1, c); px.rect(g, rx + 5, ry, 8, 1, c); px.rect(g, rx, ry - 12, 1, 8, c); px.rect(g, rx, ry + 5, 1, 8, c);
      for (let i = 0; i < 20; i++) { const an = i / 20 * Math.PI * 2; px.dot(g, Math.round(rx + Math.cos(an) * 6), Math.round(ry + Math.sin(an) * 6), c); }
      if (game.settings.hints && a.human && Math.abs(s.wind) > 1.5) { const wx = Math.round(cx - s.wind * T.windShift * kk); px.blend(g, .5, 'normal', () => { for (let i = -3; i <= 3; i++) px.dot(g, wx, cy + i * 3, '#ffffff'); }); }
    }
    // the archer inset (side view), bottom left
    const ix = 8, iy = H - 96, iw = 120, ih = 88; UI.panel(g, ix, iy, iw, ih, { alpha: .85 });
    px.rect(g, ix + 2, iy + 2, iw - 4, 50, '#8ac4f0'); px.rect(g, ix + 2, iy + 52, iw - 4, ih - 54, '#4aa84a');
    a.rig.draw(g, ix + 36, iy + ih - 6, SIDE);
    O.Gear.bow(g, a.rig, SIDE, ix + 36, iy + ih - 6, { draw: s.drawing, arrow: s.phase === 'aim' && s.drawing });
    if (s.phase === 'flight') { const u = s.flight / .75, x = Math.round(lerp(ix + 50, ix + iw - 8, u)), y = Math.round(iy + ih - 40 - Math.sin(u * Math.PI) * 6); px.line(g, x - 6, y, x, y, '#e8d8b0', 1); }
    // meters: draw, breath, heart, shot clock, wind
    const mx = 12, my = 52; UI.panel(g, mx - 4, my - 4, 108, 86, { alpha: .8 });
    UI.text(g, 'DRAW', mx, my, '#ffffff'); UI.bar(g, mx + 40, my + 1, 58, 6, s.draw, s.draw >= 1 ? '#4fe0a8' : '#f2b632');
    UI.text(g, 'BREATH', mx, my + 13, '#ffffff'); UI.bar(g, mx + 40, my + 14, 58, 6, s.breath, s.gasp > 0 ? '#ff6b6b' : '#8ad8ff');
    UI.text(g, 'HEART', mx, my + 26, '#ffffff'); const beat = .5 + .5 * Math.sin(t * Math.PI * 2 * s.hr * 1.2); px.disc(g, mx + 46, my + 29, 3 + Math.round(beat), '#e23b2e'); UI.text(g, Math.round(60 + 50 * (s.hr - 1) + 10 * beat) + ' BPM', mx + 56, my + 26, '#ffb0b0');
    UI.text(g, 'CLOCK', mx, my + 39, '#ffffff'); UI.text(g, Math.max(0, s.clock).toFixed(0) + ' s', mx + 40, my + 39, s.clock < 5 ? '#ff6b6b' : '#ffe066');
    UI.text(g, 'WIND', mx, my + 52, '#ffffff'); UI.text(g, (s.wind >= 0 ? '→ ' : '← ') + Math.abs(s.wind).toFixed(1) + ' m/s', mx + 40, my + 52, '#c8ecff');
    UI.text(g, 'ARROW ' + Math.min(3, s.n + (s.phase === 'aim' || s.phase === 'flight' ? 1 : 0)) + ' / 3', mx, my + 66, '#f2b632');
    // this end's scores
    s.arrows.forEach((x, i) => { const sx = W - 30 - (2 - i) * 24, sy = 46; UI.panel(g, sx, sy, 22, 20, { alpha: .9, trim: x.x ? '#ffe066' : '#3a3f66' }); UI.text(g, x.x ? 'X' : String(x.s), sx + 11 - UI.tw(x.x ? 'X' : String(x.s), 1) / 2, sy + 7, x.x ? '#ffe066' : '#ffffff'); });
    const tot = O.aggregate(ctx.def, a); UI.text(g, 'TOTAL ' + (tot == null ? 0 : tot) + ' + ' + s.arrows.reduce((m, x) => m + x.s, 0), W - 102, 72, '#ffffff');
    if (s.phase === 'hit' && s.last) { const L = s.last, lab = s.robin && s.pt < 1.1 && L.robin ? 'ROBIN HOOD!' : L.x ? 'BULLSEYE!' : L.s >= 9 ? 'GOLD!' : L.s === 0 ? 'MISS' : String(L.s); UI.text(g, lab, cx - UI.tw(lab, 3) / 2, cy - R - 8 - 10, L.x || L.robin ? '#ffe066' : '#ffffff', { scale: 3 }); }
    if (a.human && s.phase === 'aim') O.Prompt.strip(g, [['move', 'AIM'], ['action', s.drawing ? 'RELEASE' : 'HOLD: DRAW'], ['alt', 'HOLD BREATH']], W / 2 + 60, H - 22, { inp: a.inp });
    O.HUD.flame(g, W - 70, 96, a, { w: 40 });
    if (ctx.meet.mode !== 'attract' && ctx.humans.length) O.HUD.board(g, ctx, W - 160, H - 92, 3, { w: 150 });
  }
});
function xs(a) { return a.attempts.reduce((m, x) => m + ((x && x.info && x.info.arrows) || []).filter(q => q.x).length, 0); }
function newArrow(ctx) {
  const s = ctx.s, a = s.a, r = ctx.rng('wind:' + a.id + ':' + ctx.round + ':' + s.n), T = ctx.T;
  s.phase = 'aim'; s.pt = 0; s.draw = 0; s.drawing = false; s.held = 0; s.breath = 1; s.gasp = 0; s.shot = null; s.clock = ctx.meet.mode === 'hub' ? 12 : 20;
  s.wind = ctx.w.windOverride !== undefined ? ctx.w.windOverride : +((r() * 2 - 1) * T.windMax).toFixed(1);
  s.hr = clamp(1 + (ctx.round === 1 && s.n === 2 ? .35 : 0) + (s.arrows.length && s.arrows[s.arrows.length - 1].s < 8 ? .25 : 0), 1, 1.6);
  s.seeds = [r() * 50, r() * 50];
  a.fresh = O.freshState();
}
function sway(ctx) {
  const s = ctx.s, a = s.a, T = ctx.T, t = s.t0;
  let A = T.swayA0 * (1 + T.swayGrowth * Math.max(0, s.held - 2.5)) * s.hr;
  if (s.holding) A *= .25; if (s.gasp > 0) A *= 2; if (a.turboT > 0) A *= .1;
  const n1 = Math.sin(t * 2.3 + s.seeds[0]) * .3 + Math.sin(t * 3.7 + s.seeds[1]) * .2;
  return [A * (Math.sin(1.3 * t) * Math.cos(.7 * t) + n1 * .5), A * (Math.sin(1.7 * t + 1) * .8 + n1 * .4)];
}
function release(ctx) {
  const s = ctx.s, a = s.a, T = ctx.T, sw = sway(ctx), r = ctx.rng('rel:' + a.id + ':' + ctx.round + ':' + s.n);
  const weak = s.draw < 1, jit = clamp(s.mv / 40, 0, 1) * 3 + (weak ? 6 : 0);
  let px0 = s.aim[0] + sw[0] + s.wind * T.windShift + O.gauss(r) * jit * .5, py0 = s.aim[1] + sw[1] + O.gauss(r) * jit * .5 + (weak ? 25 * (1 - s.draw) : 0);
  if (s.gasp > 0 && !a.cheat && !O.god(a)) { s.slap = true; px0 += (r() < .5 ? -1 : 1) * (30 + r() * 30); py0 += 20; ctx.yikes(a, 'stringslap', { cue: 'slap' }); }
  s.shot = [px0, py0]; s.phase = 'flight'; s.flight = 0; s.pt = 0; s.drawing = false;
  ctx.sfx('twang');
}
function hit(ctx) {
  const s = ctx.s, a = s.a, [hx, hy] = s.shot, d = Math.hypot(hx, hy), sc = scoreOf(d);
  const robin = s.hits.some(h => Math.hypot(h[0] - hx, h[1] - hy) <= 1);
  s.arrows.push({ s: sc.s, x: sc.x, p: [hx, hy], robin }); s.hits.push([hx, hy, a.color]); s.n++; s.phase = 'hit'; s.pt = 0; s.last = s.arrows[s.arrows.length - 1];
  if (robin) { s.robin = true; ctx.cue('robin', { a }, { prio: 5 }); if (!O.sandbox) O.recordBurst('ROBIN HOOD!', a.name); }
  else if (sc.x) { ctx.cue('x', { a }, { prio: 3 }); ctx.hype(a, .3); }
  else if (sc.s >= 9) { ctx.cue('good', { a }); ctx.hype(a, .15); }
  else if (sc.s < 7) ctx.cue('bad', { a });
  ctx.sfx('thwack'); if (!O.sandbox) { O.Crowd.bump(sc.s / 10); if (sc.s >= 9) O.CrowdAudio.applause(); }
}
function animate(ctx, dt) {
  const s = ctx.s, a = s.a, rig = a.rig;
  O.Pose.set(rig, 'archerDraw', { u: s.phase === 'aim' ? s.draw : s.phase === 'flight' ? 0 : 0 });
  rig.update(dt, { x: 0, y: 0, z: 0, facing: 0, expr: s.holding ? 'wince' : s.slap && s.phase === 'hit' ? 'wince' : null });
}
})();
