// hold family: Stork Stand, Sun Flow
(() => {
const E = My3D2dge, G = window.G, { px } = E, C = G.C;
// shared: figures wobble with the lean, stumble animation, plates
G.syncFigure = (run, c, hold) => {
  const f = c.fig, b = c.bal; f.rig.wob = [b.p.x, b.p.y];
  if (b.stumbleT > 0) f.set('Dizzy', { k: 'dz' }); else if (hold) f.set(hold);
  f.rig.update && 0;
};
G.feedback = (run, c, dt) => {   // chime climbs inside the ring; creak and rumble near the edge
  const b = c.bal, st = Math.floor(b.streak);
  if (b.inRing && st > (c.lastSt || 0) && st > 0) { G.snd('chime', { pitch: Math.pow(2, Math.min(st, 8) / 12 * 2) }); c.fig.rig.kick && 0; if (c.local && run.def.id !== 'candle') G.game.particles.glints(c.fig.x, c.fig.y, 30, 3, '#bfeee0'); }
  c.lastSt = b.inRing ? st : 0;
  c.creak = (c.creak || 0) - dt;
  if (b.edge > .35 && c.creak <= 0 && b.stumbleT <= 0) { c.creak = .45; if (c.local) { G.snd('creak'); if (c.input && c.input.rumble) c.input.rumble(.25 + b.edge * .5, .15); } }
  if (b.stumbleT > .98) { G.snd('stumble'); if (c.local) { G.game.shake && G.game.shake(2); if (c.input && c.input.rumble) c.input.rumble(.8, .3); if (!run.fellSaid && run.mode === 'story') { run.fellSaid = true; G.caption(G.line(G.LINES.tare.fall), 'Tare', 3); } } }
};
G.drawHoldPlates = (r, run) => {
  const n = run.cs.length;
  run.cs.forEach((c, i) => { if (n === 1) { if (c.local) G.drawPlate(r, c.bal, r.W / 2, r.H - 34, 26, { hideRing: run.eyes }); } else { const s = run.slot(i), x = r.w(s.x, 12, 0)[0], y = r.H - 24; G.drawPlate(r, c.bal, x, y, 15); } });
};
G.drawTimer = (r, run) => r.overlay(g => { const left = Math.max(0, run.dur - run.time); G.rr(g, r.W / 2 - 22, 6, 44, 14, 'rgba(255,255,255,.9)'); G.txt(g, G.fmtTime(Math.ceil(left)), r.W / 2, 9, C.INK, { align: 'center' }); });
G.nameTags = (r, run) => { if (run.n < 2) return; run.cs.forEach(c => { const p = r.w(c.fig.x, c.fig.y, 0); r.overlay(g => { const w = G.tw(c.name) + 8; G.rr(g, p[0] - w / 2, p[1] + 6, w, 11, c.color); G.txt(g, c.name, p[0], p[1] + 8, '#fff', { align: 'center', shadow: '#0008' }); }); }); };
G.drawGull = (g, x, y, t) => { const f = Math.sin(t * 14) * 3; px.ell(g, x, y, 6, 3.5, '#ffffff'); px.ell(g, x + 1, y + 2, 5, 2, '#dfe9ea'); px.disc(g, x + 6, y - 2, 2.5, '#ffffff'); px.rect(g, x + 8, y - 2, 4, 2, '#f5b700'); px.dot(g, x + 6, y - 3, '#20404c'); px.line(g, x - 2, y - 1, x - 8, y - 5 + f, '#ffffff', 2); px.line(g, x + 1, y - 1, x + 7, y - 5 - f, '#ffffff', 2); px.rect(g, x - 1, y + 3, 1, 3, '#f5b700'); };

// ---------------------------------------------------------------------- STORK STAND
G.activity({
  id: 'stork', family: 'hold', discipline: 'Stillness', name: 'Stork Stand', room: 'deck', view: 'brawler', song: 'yoga', demoPose: 'stork', tier2Name: 'Eyes Closed',
  card: 'Stand on one leg on the deck. Keep the dot in the ring. A gull may land. Do not mention it.',
  how: { pad: 'Left stick leans. Keep the dot in the ring.', key: 'WASD nudges your lean. Tap for small corrections.', mouse: 'Move the mouse to lean. It stays where you leave it.' },
  stars: [.35, .65, .90],
  tiers: [{ set: 'stork1', dur: 45, ringEvery: 12, ringR: .17 }, { set: 'stork2', dur: 45, ringEvery: 12, ringR: .05, eyes: true }],
  setup(run) {
    if (run.shortRun) run.dur = 25; run.eyes = !!run.T.eyes; run.ringT = 0; run.tone = run.eyes ? new G.BalTone() : null;
    run.cs.forEach((c, i) => { c.fig.set('stork'); c.gull = { next: 7 + run.rng() * 5, on: false, until: 0, side: 1 }; c.bal.center = [0, 0]; c.ringT = 12; });
    run.guided = false;
  },
  enter(run, data) { run.guided = !!data.guided; if (run.guided) { run.gtime = 0; } },
  start(run) { if (run.tone) run.tone.start(); },
  exit(run) { if (run && run.tone) run.tone.stop(); },
  update(dt, run) {
    const T = run.T;
    run.cs.forEach((c, i) => {
      const b = c.bal, g = c.gull; c.ringT -= dt;
      if (c.ringT <= 0) { c.ringT = T.ringEvery; const a = run.rng() * 6.283, d = T.ringR * (.4 + run.rng() * .6); b.center = [Math.cos(a) * d, Math.sin(a) * d * .7]; if (run.mode !== 'attract') G.snd('pop'); }
      // the gull
      if (!g.on && run.time > g.next) { g.on = true; g.side = run.rng() < .5 ? -1 : 1; g.until = run.time + 4.5; G.snd('gull'); }
      if (g.on && run.time > g.until) { g.on = false; g.next = run.time + 9 + run.rng() * 5; b.v.x += -g.side * .5; G.snd('gull', { pitch: 1.3 }); }
      b.fx = g.on ? g.side * 2.5 : 0; b.fy = 0;
      run.leanStep(c, dt);
      G.syncFigure(run, c, 'stork'); G.feedback(run, c, dt);
      if (run.tone && c.local) run.tone.set(b.p.x, b.p.y, b.stumbleT > 0 ? 0 : .07);
    });
    if (run.guided) { run.gtime = (run.gtime || 0) + dt; const gt = run.gtime; if (!run.g1 && gt > 1.5) { run.g1 = 1; G.caption('Lean. Move the dot into the ring.', 'Tare', 5); } if (!run.g2 && gt > 9) { run.g2 = 1; G.caption('Hold. That is all of it. That is the whole sport.', 'Tare', 4); } if (!run.g3 && gt > 14) { run.g3 = 1; run.cs[0].gull.next = run.time; G.caption('A gull! Recover. Lean the other way.', 'Tare', 4); } }
  },
  hud(r, run) { G.drawHoldPlates(r, run); G.drawTimer(r, run); G.nameTags(r, run);
    if (run.eyes) r.overlay(g => { px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0b1a22')); G.txt(g, 'Eyes closed. Listen.', r.W / 2, 28, '#bfeee0', { align: 'center' }); }); },
  draw(r, run) {
    if (run.inst) { run.inst.set('stork'); run.inst.rig.wob = [Math.sin(run.time * 1.3) * .08, 0]; run.inst.draw(r); }
    run.cs.forEach((c, i) => {
      c.fig.draw(r, { pick: c });
      const g = c.gull; if (g && g.on) { const p = r.w(c.fig.x + g.side * 14, c.fig.y, 26); r.overlay(gg => G.drawGull(gg, p[0], p[1], run.time)); }
    });
  },
  result(run, c) { const b = c.bal, s = b.steadiness; return { pct: G.clamp(s - .05 * b.falls, 0, 1), detail: 'Steady ' + Math.round(s * 100) + '%  ·  ' + b.falls + (b.falls === 1 ? ' fall' : ' falls') }; }
});

// ---------------------------------------------------------------------- SUN FLOW
const guide = t => { const p = (t % 8) / 8; return p < .5 ? p * 2 : 2 - p * 2; };
G.flowGuide = guide;
G.activity({
  id: 'flow', family: 'hold', discipline: 'Stillness', name: 'Sun Flow', room: 'deck', view: 'brawler', song: 'yoga', demoPose: 'warrior',
  card: 'Five poses, two breaths each. Breathe in as the ring swells. Let go as it shrinks. Hold the dot still.',
  how: { pad: 'Left stick leans. Hold R2 or L2 to breathe in; let go to breathe out.', key: 'WASD leans. Hold Space to breathe in.', mouse: 'Move the mouse to lean. Hold the left button to breathe in.' },
  stars: [.5, .75, .92],
  tiers: [{ set: 'flow', dur: 80, stars: [.5, .75, .92] }],
  setup(run) { run.cs.forEach(c => { c.match = 0; c.matchT = 0; c.pose = -1; c.bal.center = [0, 0]; c.fig.set(G.FLOW[0]); }); },
  start(run) { },
  bot(run, c, bot, dt) {
    const u = bot.lean(c.bal, dt); c.it.ux = u.x; c.it.uy = u.y;
    const lag = bot.P.tau * 1.3 * 0 + (bot.skill === 'poor' ? .8 : bot.skill === 'average' ? .45 : .25), err = (bot.skill === 'poor' ? .18 : bot.skill === 'average' ? .1 : .05);
    c.it.breath = G.clamp(guide(Math.max(0, run.time - lag)) + err * Math.sin(run.time * 1.7), 0, 1);
  },
  update(dt, run) {
    const idx = Math.min(G.FLOW.length - 1, Math.floor(run.time / 16));
    run.cs.forEach(c => {
      const b = c.bal; if (idx !== c.pose) { c.pose = idx; if (run.time > 0) G.snd('pop'); }
      run.leanStep(c, dt); G.syncFigure(run, c, G.FLOW[idx]);
      c.fig.tgt = G.POSES[G.FLOW[idx]].tgt;
      const gd = guide(run.time); c.matchT += dt; if (Math.abs(c.it.breath - gd) <= .25) c.match += dt;
      G.feedback(run, c, dt);
    });
    if (run.inst) { run.inst.set(G.FLOW[idx]); run.inst.tgt = G.POSES[G.FLOW[idx]].tgt; run.inst.rig.wob = [Math.sin(run.time) * .05, 0]; }
  },
  hud(r, run) {
    G.drawHoldPlates(r, run); G.drawTimer(r, run); const c = run.cs[0], gd = guide(run.time), cx = 52, cy = r.H - 50;
    r.overlay(g => { px.disc(g, cx, cy, 26, 'rgba(255,255,255,.85)'); const gr = 8 + 16 * gd, yr = 8 + 16 * c.it.breath; px.disc(g, cx, cy, yr, Math.abs(c.it.breath - gd) <= .25 ? '#7fe3b8' : '#ffb59f'); px.disc(g, cx, cy, Math.max(0, yr - 2), '#ffffff'); px.disc(g, cx, cy, gr + 1, '#14a8c8'); px.disc(g, cx, cy, gr - 1, 'rgba(255,255,255,.0)'); for (let a = 0; a < 40; a++) { const an = a / 40 * 6.283; px.dot(g, cx + Math.cos(an) * gr, cy + Math.sin(an) * gr, '#14a8c8'); } G.txt(g, gd > (guide(run.time + .05) ) ? 'Let go' : 'Breathe in', cx, cy + 30, C.INK, { align: 'center' }); });
    G.nameTags(r, run);
  },
  draw(r, run) { if (run.inst) run.inst.draw(r); run.cs.forEach(c => c.fig.draw(r)); },
  result(run, c) { const s = c.bal.steadiness, m = c.matchT > 0 ? c.match / c.matchT : 0; return { pct: G.clamp(.6 * s + .4 * m, 0, 1), detail: 'Steady ' + Math.round(s * 100) + '%  ·  Breath ' + Math.round(m * 100) + '%' }; }
});
})();
