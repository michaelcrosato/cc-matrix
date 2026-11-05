/* OLYMPIYIKES! — Bullseye Lawn and ARCHERY (§6.5): aim under sway, hold your breath, read the wind, six arrows. */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px;
const FACE = 61, RING = 6.1;
const ringScore = d => d <= RING / 2 ? 'X' : Math.max(0, 10 - Math.floor(d / RING));
const RING_COL = ['#f8f8f8', '#f8f8f8', '#2a2a30', '#2a2a30', '#3a8ae0', '#3a8ae0', '#e8443a', '#e8443a', '#f2c94c', '#f2c94c'];
const SIDE = new E.View('archside', 'Side', 0, 0, 1, 1);

O.defEvent({
  id: 'archery', name: 'ARCHERY', short: 'Archery', season: 'summer', venue: 'Bullseye Lawn', pictogram: 'archery', music: 'archery', view: 'side', sport: 'archery', input: O.KEYS_MOUSE, lights: 0,
  format: { type: 'attempts', rounds: 6, combine: 'sum', highlight: [2, 5] }, maxTime: 30, turbo: 'EAGLE EYE!', noPopup: true, finishTime: 1.6,
  measure: { better: 'higher', unit: 'pts', fmt: v => String(Math.round(v)), wr: [60, 'NEO', 'PIXEL VANCE'], qualify: { Easy: 40, Normal: 48, Hard: 53 }, round: true },
  points: v => 20 * v,
  tieBreak: (a, b) => (b.xs || 0) - (a.xs || 0),
  tune: { drawTime: [.9, .3, 2, .05, 'Draw time (s)'], swayA0: [7, 0, 20, .5, 'Sway (cm)'], swayGrowth: [.6, 0, 2, .05, 'Sway growth'], breathTime: [2.5, .5, 6, .1, 'Breath hold (s)'], windMax: [4, 0, 8, .1, 'Wind max (m/s)'], windShift: [4.5, 0, 10, .1, 'Wind shift (cm per m/s)'] },
  howto: { goal: 'Six arrows. Highest total wins.', rows: [[['aim'], 'Aim (stick, WASD or the mouse)'], [['action'], 'Hold: draw · release: shoot'], [['alt'], 'Hold: hold your breath'], [null, 'Aim off against the wind']] },
  yikesKinds: ['STRING SLAP!'],
  laurel: { id: 'robinhood', name: 'ROBIN HOOD', text: 'Split an arrow with an arrow', test: (ctx, a) => !!a.S.robin },
  hub: { ok: true, attempts: 3, seconds: 50 }, attract: { seconds: 12, after: 2.5, setup(ctx) { const a = ctx.cur; a.arrows = [{ x: .4, y: -.3 }]; a.S.forceRobin = true; } },
  turnLabel: ctx => 'ARROW ' + (ctx.cur.attempts.length + 1) + ' OF ' + ctx.rounds,
  phases: [['aim', ctx => { ctx.cur.S.phase = 'aim'; }], ['release', ctx => { const s = ctx.cur.S; s.draw = 1; s.phase = 'aim'; }]],
  build(ctx) { for (const a of ctx.athletes) { a.arrows = []; a.xs = 0; } },
  start(ctx) {
    const a = ctx.cur, r = ctx.rng('wind'), T = ctx.T;
    a.arrows = a.arrows || [];
    const lastBad = a.arrows.length && a.arrows[a.arrows.length - 1].score < 8;
    a.S = { phase: 'aim', aim: [0, 18], draw: 0, held: 0, breath: 1, holding: false, gasp: 0, hr: Math.min(1.6, (a.S && a.S.hr || 1) + (lastBad ? .2 : -.1) + (ctx.round === ctx.rounds - 1 ? .2 : 0)), wind: (r() * 2 - 1) * T.windMax, t: 0, clock: ctx.hub ? 12 : 20, flight: 0, hit: null, sway: [0, 0], swayT: r() * 10, robin: false };
    a.S.hr = Math.max(1, a.S.hr);
    const sk = ctx.skill(a); a.S.botAim = [-a.S.wind * T.windShift * (a.pilot.cheat === 'perfect' ? 1 : sk) + O.gauss(ctx.rng('ax')) * ((1 - sk) * 12 + (a.pilot.cheat === 'perfect' ? 0 : 2)), O.gauss(ctx.rng('ay')) * ((1 - sk) * 12 + (a.pilot.cheat === 'perfect' ? 0 : 2))];
    if (a.S.forceRobin && a.arrows[0]) a.S.botAim = [a.arrows[0].x - a.S.wind * T.windShift, a.arrows[0].y];
  },
  bot(ctx, a, dt, I) {
    const s = a.S; if (s.phase !== 'aim') return I;
    const dx = s.botAim[0] - s.aim[0], dy = s.botAim[1] - s.aim[1], d = Math.hypot(dx, dy);
    if (d > .6) I.mv = [E.clamp(dx / 6, -1, 1), E.clamp(-dy / 6, -1, 1)];
    else { I.Ad = true; if (s.draw >= 1) { I.X = ctx.skill(a) > .5 || a.pilot.cheat === 'perfect'; if (s.held > (a.pilot.cheat === 'perfect' ? .3 : .6 + (1 - ctx.skill(a)))) { I.Ad = false; I.Au = true; } } }
    if (a.hype >= 1 && s.draw > .5) I.T = true;
    return I;
  },
  step(ctx, dt) {
    const T = ctx.T;
    for (const a of ctx.active) {
      const s = a.S, I = a.I; s.t += dt;
      if (s.phase === 'aim') {
        const eagle = a.turboT > 0;
        s.clock -= dt; if (s.clock <= 0) { s.phase = 'flight'; s.flight = 0; s.timeout = true; ctx.fx.sfx('buzzer'); }
        // aim: the stick moves it, the mouse sets it
        if (I.mouse && I.ptr && s._map) { s.aim = s._map(I.ptr); } else { s.aim[0] += I.mv[0] * 40 * dt; s.aim[1] -= I.mv[1] * 40 * dt; }
        s.aim[0] = E.clamp(s.aim[0], -80, 80); s.aim[1] = E.clamp(s.aim[1], -80, 80);
        if (I.Ad) { s.holding = true; s.draw = Math.min(1, s.draw + dt / T.drawTime); if (s.draw >= 1) s.held += dt; }
        // breath
        let swayK = 1;
        if (I.X && s.draw >= 1 && s.breath > 0 && s.gasp <= 0) { s.breath -= dt / T.breathTime; swayK = .25; if (s.breath <= 0) { s.gasp = 2; } }
        else if (!I.X) s.breath = Math.min(1, s.breath + dt * .3);
        if (s.gasp > 0) { s.gasp -= dt; swayK = 2; }
        if (eagle) swayK *= .1;
        if (a.pilot.cheat === 'perfect') swayK = 0;
        s.swayT += dt; const A = T.swayA0 * (1 + T.swayGrowth * Math.max(0, s.held - 2.5)) * s.hr * swayK, t = s.swayT;
        const n1 = E.noise2(t * .9, 3.3) - .5, n2 = E.noise2(7.1, t * .9) - .5;
        s.sway = [A * (Math.sin(1.3 * t) * Math.cos(.7 * t) + n1), A * (Math.sin(1.7 * t + 1) + n2)];
        if (s.holding && (I.Au || (!I.Ad && s.draw > 0))) loose(ctx, a);
      } else if (s.phase === 'flight') {
        s.flight += dt;
        if (s.flight >= .75) land(ctx, a);
      } else if (s.phase === 'hit') { s.flight += dt; }
    }
    if (!ctx.sandbox) for (const a of ctx.active) animate(ctx, a, dt);
  },
  done(ctx) { return ctx.active.every(a => a.fin && (a.S.flight > 1.7 || ctx.fast)); },
  perf(ctx, a) { return a.cur === undefined ? null : a.cur; },
  camera() { game.focus(0, 0, 40); },
  draw(ctx, r) {
    // the seaside lawn: sky, sea, palms, and the target face up close
    r.sky(['#5ab0f0', '#9ad4f8', '#e0f4ff']);
    const a = ctx.cur;
    r.overlay(g => {
      const W = r.W, H = r.H, hz = Math.round(H * .42);
      px.rect(g, 0, hz, W, 18, '#2a7ac8'); for (let x = 0; x < W; x += 6) px.rect(g, x + Math.round(Math.sin(game.real * 2 + x) * 2), hz + 4 + (x % 3) * 4, 3, 1, '#9ad4f8');
      px.rect(g, 0, hz + 18, W, H - hz - 18, '#5aa848'); for (let y = hz + 18; y < H; y += 3) for (let x = (y % 6); x < W; x += 9) px.rect(g, x, y, 1, 1, '#4a9840');
      for (const [px0, h] of [[30, 70], [W - 60, 80], [W - 120, 60]]) { px.rect(g, px0, hz - h + 20, 4, h, '#8a5a2a'); for (let k = 0; k < 5; k++) { const an = -Math.PI + k * .8 + Math.sin(game.real + k) * .05; px.line(g, px0 + 2, hz - h + 20, px0 + 2 + Math.cos(an) * 20, hz - h + 24 + Math.sin(an) * 8 + 6, '#3a9a3a', 2); } }
      // wind flags
      const w = a && a.S ? a.S.wind || 0 : 0; for (const fx of [W * .3, W * .7]) { px.rect(g, fx, hz - 30, 1, 50, '#d8dce8'); const L = 6 + Math.abs(w) * 3, dir = Math.sign(w) || 1; px.poly(g, [[fx, hz - 30], [fx + dir * L, hz - 28 + Math.sin(game.real * 8) * 1], [fx, hz - 24]], '#ff7a2a'); }
      // the face
      const R = Math.round(Math.min(H * .38, 100)), cx = Math.round(W / 2), cy = Math.round(H * .44);
      if (a && a.S) a.S._map = p => [(p[0] - cx) / R * FACE, -(p[1] - cy) / R * FACE];
      px.rect(g, cx - R - 6, cy - R - 6, 2 * R + 12, 2 * R + 12, '#c8a870'); px.rect(g, cx - 2, cy + R + 6, 4, H - cy - R, '#8a6a3a');
      for (let k = 0; k < 10; k++) px.disc(g, cx, cy, Math.round(R * (10 - k) / 10), RING_COL[k]);
      for (let k = 1; k < 10; k++) { const rr = Math.round(R * k / 10); for (let t = 0; t < 120; t++) { const an = t / 120 * Math.PI * 2; px.rect(g, Math.round(cx + Math.cos(an) * rr), Math.round(cy + Math.sin(an) * rr), 1, 1, k === 4 || k === 6 ? '#ffffff' : '#1a1a20'); } }
      px.rect(g, cx - 1, cy, 3, 1, '#2a2a30'); px.rect(g, cx, cy - 1, 1, 3, '#2a2a30');
      // arrows in the face
      if (a && a.arrows) for (const ar of a.arrows) { const x = cx + ar.x / FACE * R, y = cy - ar.y / FACE * R; px.disc(g, x, y, 2, '#1a1d2e'); px.rect(g, x - 1, y - 6, 2, 5, a.nat.colors.a); }
      // the reticle (aim + sway), and the arrow in flight
      if (a && a.S && a.S.phase === 'aim') { const s = a.S, x = cx + (s.aim[0] + s.sway[0]) / FACE * R, y = cy - (s.aim[1] + s.sway[1]) / FACE * R; const c = s.gasp > 0 ? '#ff6b6b' : '#ffffff'; px.rect(g, x - 9, y, 6, 1, c); px.rect(g, x + 4, y, 6, 1, c); px.rect(g, x, y - 9, 1, 6, c); px.rect(g, x, y + 4, 1, 6, c); px.disc(g, x, y, 1, '#e8443a'); }
      if (a && a.S && a.S.phase === 'flight' && a.S.hitAt) { const k = a.S.flight / .75, s = a.S, x = cx + s.hitAt[0] / FACE * R, y = cy - s.hitAt[1] / FACE * R, sc = Math.max(1, Math.round(6 * (1 - k))); px.disc(g, x, y, sc, '#3a2a1a'); }
      // the inset: the archer at the line in side view
      const iw = Math.round(W * .3), ih = Math.round(H * .3), ix = 10, iy = H - ih - 10;
      px.rect(g, ix - 2, iy - 2, iw + 4, ih + 4, '#f2b632'); px.rect(g, ix, iy, iw, ih, '#9ad4f8'); px.rect(g, ix, iy + ih * .55, iw, ih * .45, '#5aa848'); px.rect(g, ix, iy + ih * .5, iw, ih * .05, '#2a7ac8');
      if (a && a.rig) { g.save(); g.beginPath(); g.rect(ix, iy, iw, ih); g.clip(); a.rig.draw(g, ix + iw * .35, iy + ih - 6, SIDE); drawBow(g, a, ix + iw * .35, iy + ih - 6); if (a.S.phase === 'flight') { const k = a.S.flight / .75, x0 = ix + iw * .45 + k * iw * .6; px.line(g, x0, iy + ih * .5, x0 + 8, iy + ih * .5, '#3a2a1a', 1); } g.restore(); }
    });
  },
  hud(ctx, r, g) {
    O.HUD.header(g, r, ctx, 'ARROW ' + Math.min(ctx.rounds, (ctx.cur ? ctx.cur.attempts.length + (ctx.phase === 'play' ? 1 : 0) : 1)) + ' OF ' + ctx.rounds);
    const a = ctx.cur; if (!a || !a.S || !a.S.aim) return;
    const s = a.S;
    O.HUD.big(g, r.W - 14, 10, String(O.agg(ctx, a) || 0) + ' PTS');
    O.text(g, 'WIND ' + (s.wind >= 0 ? '→ ' : '← ') + Math.abs(s.wind).toFixed(1) + ' m/s', r.W - 14, 30, '#ffffff', { align: 'right' });
    O.text(g, 'CLOCK ' + Math.max(0, Math.ceil(s.clock)), r.W - 14, 42, s.clock < 5 ? '#ff6b6b' : '#c8d0f0', { align: 'right' });
    const x = r.W - 112, y = r.H - 54;
    O.panel(g, x, y, 100, 44, { alpha: .85 });
    O.text(g, 'DRAW', x + 6, y + 5, '#c8d0f0'); O.HUD.power(g, x + 36, y + 6, 58, s.draw, '#f2b632');
    O.text(g, 'BREATH', x + 6, y + 17, '#c8d0f0'); O.HUD.power(g, x + 46, y + 18, 48, s.breath, s.gasp > 0 ? '#ff6b6b' : '#7fd8ff');
    O.text(g, 'HEART ' + Math.round(60 * s.hr), x + 6, y + 30, s.hr > 1.3 ? '#ff6b6b' : '#c8d0f0');
    if (a.human) { O.HUD.flame(g, x - 14, y + 4, a, a.input); if (game.settings.hints && s.phase === 'aim') O.Prompt.strip(g, r, s.draw < 1 ? [['aim', 'Aim'], ['action', 'Hold: draw']] : [['alt', 'Hold breath'], ['action', 'Release']], { input: a.input, y: 14 }); }
    if (s.hit) O.text(g, s.hit.score === 'X' ? 'BULLSEYE!' : s.hit.score === 0 ? 'MISS' : String(s.hit.score), r.W / 2, r.H * .12, s.hit.score === 'X' || s.hit.score === 10 ? '#f2c94c' : '#ffffff', { align: 'center', scale: 3 });
  },
  ghostState(ctx, a) { const s = a.S; return [s.hit ? s.hit.x : 999, 0, s.hit ? s.hit.y : 999, 0, 5]; },
  ghostDraw() { return null; }
});
function loose(ctx, a) {
  const s = a.S, T = ctx.T, r = ctx.rng('jit');
  s.holding = false;
  let weak = s.draw < 1, slap = s.gasp > 0 && !ctx.god(a);
  const moving = Math.hypot(a.I.mv[0], a.I.mv[1]) > .2 ? 3 : 0, jit = (a.pilot.cheat === 'perfect' ? 0 : .8) + moving;
  let hx = s.aim[0] + s.sway[0] + s.wind * T.windShift + (r() * 2 - 1) * jit, hy = s.aim[1] + s.sway[1] + (r() * 2 - 1) * jit;
  if (weak) { hy -= 25; hx += (r() * 2 - 1) * 10; }
  if (slap) { hx += (r() < .5 ? -1 : 1) * (30 + r() * 25); hy += (r() * 2 - 1) * 20; ctx.yikes(a, 'STRING SLAP!', 'stringslap'); ctx.fx.sfx('slap'); }
  if (s.forceRobin && a.arrows[0]) { hx = a.arrows[0].x; hy = a.arrows[0].y; }
  s.hitAt = [hx, hy]; s.phase = 'flight'; s.flight = 0;
  ctx.fx.sfx('twang');
}
function land(ctx, a) {
  const s = a.S; s.phase = 'hit';
  if (s.timeout) { s.hit = { score: 0, x: 0, y: 0 }; ctx.finish(a, 0, 'TIME'); return; }
  const [hx, hy] = s.hitAt, d = Math.hypot(hx, hy), sc = d > FACE ? 0 : ringScore(d), val = sc === 'X' ? 10 : sc;
  s.robin = a.arrows.some(o => Math.hypot(o.x - hx, o.y - hy) < 1.0);
  a.arrows.push({ x: hx, y: hy, score: val });
  if (sc === 'X') a.xs = (a.xs || 0) + 1;
  s.hit = { score: sc, x: hx, y: hy };
  ctx.finish(a, val);
  ctx.fx.sfx('thwack');
  if (s.robin) { ctx.fx.banner('ROBIN HOOD!', { y: .25 }); ctx.fx.say('archery', { name: a.short }); ctx.hype(a, .5); }
  else if (sc === 'X') { ctx.fx.say('archery', { name: a.short }); ctx.hype(a, .3); O.Crowd.excite(.5); }
  else if (val >= 9) ctx.hype(a, .15);
}
function drawBow(g, a, x, y) {
  const h = a.rig.o.size || 1.25, k = h * 1.0, s = a.S;
  const bx = x + 12 * k, by = y - 32 * k, pull = (s.draw || 0) * 8 * k;
  px.line(g, bx, by - 13 * k, bx + 3 * k, by, '#5a3a1a', 2); px.line(g, bx + 3 * k, by, bx, by + 13 * k, '#5a3a1a', 2);
  px.line(g, bx, by - 13 * k, bx - pull, by, '#e8e8e8', 1); px.line(g, bx - pull, by, bx, by + 13 * k, '#e8e8e8', 1);
  if (s.phase === 'aim') px.line(g, bx - pull, by, bx + 10 * k, by, '#3a2a1a', 1);
}
function animate(ctx, a, dt) {
  const s = a.S, rig = a.rig;
  O.Pose.set(rig, s.phase === 'aim' ? 'archerDraw' : 'archerDraw', { u: s.phase === 'aim' ? s.draw : 0 });
  rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0, pose: s.phase === 'hit' && s.hit && (s.hit.score === 'X' || s.hit.score >= 10) && s.flight > 1 ? 'cheer' : null });
}
})();
