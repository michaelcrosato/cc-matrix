// Quiet Candle
(() => {
const E = My3D2dge, G = window.G, { px } = E, C = G.C;
const FLAME = (g, x, y, a, t, sc) => { if (a <= 0) { px.rect(g, x - 1, y - 2, 2, 3, '#555'); return; } const h = 6 + 10 * a * sc, w = 3 + 3 * a, fl = Math.sin(t * 17) * .7 * (1.2 - a * .5);
  px.glow && 0; px.disc(g, x + fl, y - h * .5, w + 4, 'rgba(255,214,120,.18)'); px.poly(g, [[x - w, y], [x + fl * 1.5, y - h], [x + w, y]], '#ffb347'); px.poly(g, [[x - w * .55, y], [x + fl, y - h * .7], [x + w * .55, y]], '#fff2a8'); px.disc(g, x, y - 1, w * .5, '#5ac8f5'); };
G.drawFlame = FLAME;
G.activity({
  id: 'candle', family: 'candle', discipline: 'Stillness', name: 'Quiet Candle', room: 'deck', view: 'brawler', song: 'candle', demoPose: 'Meditate', tier2Name: 'Blender and a goose',
  card: 'Sit. A candle burns. Move gently and it stays. Thoughts will push you. Let them pass. Do not jerk.',
  how: { pad: 'Left stick leans. Small, slow corrections.', key: 'WASD nudges. Tap, do not hold.', mouse: 'Move the mouse slowly. It stays where you leave it.' },
  stars: [.35, .65, .90],
  tiers: [{ set: 'candle', dur: 60, thoughts: 1 }, { set: 'candle', dur: 60, thoughts: 1, blender: true, stars: [.35, .65, .90] }],
  setup(run) {
    run.cs.forEach(c => { c.flame = 1; c.meanF = 0; c.meanT = 0; c.relit = 0; c.out = false; c.lastU = 0; c.untouched = 0; c.th = null; c.nextTh = 4 + run.rng() * 3; c.bal.center = [0, 0]; c.fig.set('Meditate'); c.thought = null; c.fig.tgt = 1.57; });
    run.thoughts = []; run.said20 = false;
    if (run.T.duel) { run.herFlame = 1; run.dev = [[10, 'gull'], [22, 'blender'], [34, 'conga'], [46, 'fireworks'], [58, 'tare'], [70, 'goose']]; run.evI = -1; run.evT = 0; run.gert = G.castFigure('gertrude', { size: 2, x: 64, y: 8, tgt: 1.7 }); run.gert.set('Meditate'); run.cs[0].fig.x = -30; run.inst = null; run.evName = null; }
  },
  update(dt, run) {
    run.cs.forEach(c => {
      const b = c.bal;
      // thoughts: slow pushes
      if (!c.th && run.time > c.nextTh) { const a = run.rng() * 6.283, txt = G.LINES.candle[Math.floor(run.rng() * G.LINES.candle.length)]; c.th = { until: run.time + 2.5, fx: Math.cos(a) * (3 + run.rng() * 2), fy: Math.sin(a) * (3 + run.rng() * 2), txt, x: c.fig.x + (Math.cos(a) > 0 ? -22 : 22), t0: run.time }; c.nextTh = run.time + 5 + run.rng() * 3; if (run.T.blender && run.rng() < .5) G.snd('whoosh'); }
      if (c.th && run.time > c.th.until) c.th = null;
      b.fx = c.th ? c.th.fx : 0; b.fy = c.th ? c.th.fy : 0;
      // an untouched controller drifts you out
      const moved = Math.hypot(c.it.ux, c.it.uy) > .02 || c.it.moved; if (!moved && run.time < 20) c.untouched += dt; else if (moved) c.untouched = 0;
      if (c.untouched > 4 && run.time < 20) { b.fx += (c.th ? 0 : 1.5) * (c.untouched > 8 ? 1 : .3); }
      if (!run.said20 && run.time >= 20 && c.local && c.untouched > 18 && run.mode === 'story') { run.said20 = true; G.caption('Did you put the controller down? I can tell. This is not that kind of stillness.', 'Tare', 5); }
      if (run.T.duel) { const ev = run.dev.filter(e => run.time >= e[0]); if (ev.length - 1 > run.evI) { run.evI = ev.length - 1; run.evName = ev[run.evI][1]; run.evT = run.time; G.cap = null; G.caption(G.LINES.duelEvents[run.evI], 'Tare', 3.5); G.snd(['gull', 'whoosh', 'cheer', 'firework', 'bell', 'gull'][run.evI]); if (run.evName === 'fireworks') G.game.flash && G.game.flash('#ffffff', .1, .25); }
        if (run.evName && run.time - run.evT < 5) { b.fx += Math.sin((run.time - run.evT) * 2.2 + run.evI) * 2.2 * (1 + run.evI * .25); } else run.evName = run.evName && run.time - run.evT >= 5 ? null : run.evName; }
      run.leanStep(c, dt);
      const sp = b.speed;
      if (!c.out) { if (sp > .55) c.flame -= .4 * dt * Math.min(2, sp / .55); else if (b.inRing) c.flame += .12 * dt; c.flame = G.clamp(c.flame, 0, 1); if (c.flame <= 0) { if (c.relit < 1) { c.relit++; c.flame = .85; G.snd('flame'); if (c.local) G.caption('The flame went out. I relit it. This is a one-time thing.', 'Tare', 3); } else { c.out = true; c.endT = run.time; } } }
      c.meanF += (c.out ? 0 : c.flame) * dt; c.meanT += dt;
      G.syncFigure(run, c, 'Meditate'); if (b.stumbleT <= 0) c.fig.set('Meditate'); G.feedback(run, c, dt);
    });
    if (run.T.duel) { run.gert.update(dt); if (run.time > 75 && run.cs[0].flame > .5 && !run.cs[0].out) run.herFlame = Math.max(0, run.herFlame - .12 * dt); if (run.herFlame <= 0) { run.won = true; run.time = run.dur; } }
    if (run.cs.every(c => c.out)) { run.cs.forEach(c => { c.meanT = run.dur; }); run.time = Math.max(run.time, run.dur); }
  },
  hud(r, run) {
    G.drawHoldPlates(r, run); G.drawTimer(r, run); G.nameTags(r, run);
    run.cs.forEach((c, i) => { const s = run.slot(i), p = r.w(s.x - (run.n > 1 ? 0 : 52), 12, 0);
      if (c.th) r.overlay(g => { const a = Math.min(1, (run.time - c.th.t0) * 3, (c.th.until - run.time) * 3), x = r.w(c.fig.x, 0, 0)[0] + (c.th.fx > 0 ? -70 : 40), y = r.w(0, 0, 60)[1] + Math.sin(run.time * 2) * 3; px.blend(g, G.clamp(a, 0, 1), 'normal', () => { const w = G.tw(c.th.txt) + 12; G.rr(g, x - w / 2, y, w, 14, '#ffffff'); G.rr(g, x - w / 2 + 1, y + 1, w - 2, 12, '#eaf6f8'); px.disc(g, x - w / 2 + 6, y + 18, 2, '#fff'); px.disc(g, x - w / 2 + 2, y + 22, 1, '#fff'); G.txt(g, c.th.txt, x, y + 4, C.INK, { align: 'center' }); }); });
    });
  },
  draw(r, run) {
    if (run.inst) { run.inst.set('Meditate'); run.inst.draw(r); }
    run.cs.forEach((c, i) => { c.fig.draw(r); const p = r.w(c.fig.x + (run.n > 1 ? 10 : 0), c.fig.y + 16, 0); r.overlay(g => { px.rect(g, p[0] - 3, p[1] - 12, 6, 12, '#fff8e8'); px.rect(g, p[0] - 3, p[1] - 12, 2, 12, '#e6dcc4'); FLAME(g, p[0], p[1] - 13, c.out ? 0 : c.flame, run.time, run.n > 2 ? .6 : 1); }); });
    if (run.T.duel) { run.gert.draw(r); const q = r.w(run.gert.x + 10, 28, 0); r.overlay(g => { px.rect(g, q[0] - 3, q[1] - 12, 6, 12, '#fff8e8'); FLAME(g, q[0], q[1] - 13, run.herFlame, run.time, 1); const ev = run.evName, k = run.time - run.evT; if (ev === 'gull') G.drawGull(g, r.W * .5 + Math.sin(k * 2) * 60, 40 + k * 6, run.time); if (ev === 'conga') for (let i = 0; i < 6; i++) { const x = ((k * 70 - i * 22) % (r.W + 60)), y = 150 + Math.sin(k * 6 + i) * 3; px.rect(g, x - 4, y - 14, 8, 10, ['#ff7a59', '#2cc6e6', '#f5b700', '#8fd36a', '#c68cf0', '#f58cb4'][i]); px.disc(g, x, y - 18, 4, '#f6d2b0'); } if (ev === 'fireworks') for (let i = 0; i < 3; i++) { const fx = 80 + i * 130, fy = 40 + (i % 2) * 20, rr = (k * 25 + i * 9) % 30; for (let a = 0; a < 10; a++) px.dot(g, fx + Math.cos(a * .63) * rr, fy + Math.sin(a * .63) * rr, ['#ffd070', '#ff7a59', '#9ff3ff'][i]); } if (ev === 'tare') { G.tare.draw(g, r.W - 50, 60, 1.6, 'happy'); G.txt(g, '♪ ♪', r.W - 50, 24 - Math.sin(k * 5) * 3, C.ACC2, { align: 'center' }); } if (ev === 'goose') { const gx = r.W * .3 + k * 30; px.ell(g, gx, 130, 10, 6, '#f6f6f6'); px.rect(g, gx + 8, 112, 3, 16, '#f6f6f6'); px.disc(g, gx + 10, 111, 3, '#f6f6f6'); px.rect(g, gx + 12, 111, 5, 2, '#f5b700'); } }); }
    if (run.T.blender) { const p = r.w(-80, -10, 0); r.overlay(g => { px.rect(g, p[0] - 5, p[1] - 22, 10, 14, '#cfe6ec'); px.rect(g, p[0] - 6, p[1] - 8, 12, 8, '#555'); if (Math.sin(run.time * 3) > .5) for (let i = 0; i < 3; i++) px.dot(g, p[0] + Math.sin(run.time * 40 + i) * 5, p[1] - 22 - i * 3, '#8fd36a'); });
      const q = r.w(90, 0, 0); r.overlay(g => { const gx = q[0] + Math.sin(run.time * .7) * 8; px.ell(g, gx, q[1] - 6, 8, 5, '#f6f6f6'); px.rect(g, gx + 6, q[1] - 16, 3, 10, '#f6f6f6'); px.disc(g, gx + 8, q[1] - 17, 3, '#f6f6f6'); px.rect(g, gx + 10, q[1] - 17, 4, 2, '#f5b700'); }); }
  },
  result(run, c) { if (run.T.duel) { run.won = run.won || (!c.out && run.herFlame < c.flame && run.time >= run.dur - .01 && c.flame > .5); const s0 = c.bal.steadiness; return { pct: run.won ? 1 : G.clamp(.5 * s0 + .3 * c.flame, 0, .9), detail: run.won ? 'Her flame went first' : 'The flame stays. The contest does not' }; } const s = c.bal.steadiness, f = c.meanT > 0 ? c.meanF / Math.max(c.meanT, run.time) : 0; return { pct: G.clamp(.6 * s + .4 * (c.meanF / run.dur), 0, 1), detail: 'Still ' + Math.round(s * 100) + '%  ·  Flame ' + Math.round(c.meanF / run.dur * 100) + '%' + (c.out ? '  ·  went out' : '') }; }
});
G.activity(Object.assign({}, G.acts.candle, { id: 'duel', discipline: 'Duel', name: 'The Grand Stillness', room: 'raft', song: 'duel', card: 'A candle duel with Gertrude, on a raft, at dusk. Distractions will arrive. Do not mind them.', tiers: [{ set: 'candle', dur: 90, duel: true }], tier2Name: undefined }));
})();
