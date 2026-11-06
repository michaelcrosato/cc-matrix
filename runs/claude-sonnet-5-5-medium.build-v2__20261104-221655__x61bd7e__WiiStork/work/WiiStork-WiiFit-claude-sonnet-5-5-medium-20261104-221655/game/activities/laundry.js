// Laundry Line (side view)
(() => {
const E = My3D2dge, G = window.G, { px } = E, C = G.C, U = 16, ZR = 46;   // world units per metre, rope height
G.activity({
  id: 'laundry', family: 'rope', discipline: 'Balance', name: 'Laundry Line', room: false, view: 'side', song: 'laundry', demoPose: 'Idle_Subtle',
  card: 'Walk the clothesline between the bungalows. Hold the effort to walk. Jump the pegs. Gusts are announced by a sock.',
  how: { pad: 'Left stick balances. R2 walks (the harder, the faster). Cross jumps.', key: 'A and D balance. Hold Space to walk. W jumps.', mouse: 'Move the mouse to balance. Hold the left button to walk. Right button jumps.' },
  stars: [.35, .65, .90],
  tiers: [{ set: 'rope', dur: 150 }],
  setup(run) {
    const K = G.COURSES.laundry; run.spans = K.spans; run.pins = []; run.posts = [0]; run.mid = []; let o = 0; K.spans.forEach(s => { s.pins.forEach(p => run.pins.push({ x: o + p, hit: false })); for (let q = 1; q < Math.ceil(s.len / K.postEvery); q++) run.mid.push(o + q * s.len / Math.ceil(s.len / K.postEvery)); o += s.len; run.posts.push(o); }); run.len = o; run.rope = true; run.gustT = 4; run.gust = null; run.sock = null;
    run.cs.forEach(c => { c.bal.set = Object.assign({}, c.bal.set, { sy: 0 }); c.x = 0.5; c.z = 0; c.vz = 0; c.air = false; c.fin = false; c.falls = 0; c.penalty = 0; c.post = 0; c.dangle = false; c.fig.rig.body = null; c.fig.set('Idle_Subtle'); c.fig.tgt = 0; c.tFin = 0; c.walk = 0; c.bal.onStumble = () => { c.falls++; c.penalty += 3; G.snd('stumble'); if (c.local) { G.caption(G.line(G.LINES.tare.fall), 'Tare', 3); } }; });
  },
  bot(run, c, bot, dt) {
    const P = { poor: { e: .4, lag: .45 }, average: { e: .7, lag: .3 }, good: { e: .6, lag: .2 }, expert: { e: .7, lag: .12 } }[bot.skill] || { e: .6, lag: .3 };
    const u = bot.lean(c.bal, dt, [0, 0]); c.it.ux = u.x; c.it.uy = 0;
    if (run.gust && run.time > run.gust.t0 - .8 && run.time < run.gust.t1 && (bot.skill === 'good' || bot.skill === 'expert')) c.it.ux = G.clamp(c.it.ux - run.gust.dir * .25 * (run.time < run.gust.t0 ? .5 : 1), -1, 1);
    c.it.effort = c.bal.stumbleT > 0 ? 0 : P.e * (c.bal.edge > .5 ? .2 : 1); c.it.jump = false;
    for (const p of run.pins) { const d = p.x - c.x, sp = c.it.effort * 2.2; if (!p.hit && d > 0 && d <= sp * .46 + (p.plan != null ? p.plan : (p.plan = (run.rng() - .5) * P.lag * .9)) && !c.air) { c.it.jump = true; break; } else if (d < 0 && p.plan != null) p.plan = null; }
  },
  update(dt, run) {
    const B = G.DEV.ropeS; run.cs.forEach(c => {
      const b = c.bal, it = c.it; b.mult.s = B * (1 + 4 * it.effort / 16); b.freeze = c.air;
      // gusts
      if (run.time >= run.gustT && !run.gust) { run.gust = { t0: run.time + .8, t1: run.time + 1.4, dir: run.rng() < .5 ? -1 : 1 }; run.gustT = run.time + G.COURSES.laundry.gustEvery + run.rng() * 3; run.sock = { x: c.x, t: 0 }; G.snd('whoosh'); }
      if (run.gust && run.time > run.gust.t1) run.gust = null;
      b.gust[0] = run.gust && run.time >= run.gust.t0 && run.time <= run.gust.t1 ? run.gust.dir * 9 * G.DEV.gust : 0;
      if (!c.air) { it.uy = 0; run.leanStep(c, dt); } else { b.t += dt; }
      const ok = b.stumbleT <= 0;
      if (ok && !c.fin) { const sp = it.effort * 2.2; c.x += sp * dt; c.walk += sp * dt; }
      // jump
      if (it.jump && !c.air && ok) { c.air = true; c.vz = 11; G.snd('pop'); G.grunt(c.fig.name, 'hup'); }
      if (c.air) { c.vz -= 24 * dt; c.z += c.vz * dt; if (c.z <= 0) { c.z = 0; c.air = false; c.vz = 0; } }
      for (const p of run.pins) { if (p.hit) continue; if (Math.abs(p.x - c.x) < .22 && c.z < .5 && ok) { p.hit = true; b.falls++; b.stumbleT = 1; c.penalty += 3; G.snd('stumble'); c.falls++; } if (c.x > p.x + 1.5) p.hit = p.hit; }
      // a fall: the post, the hamper
      if (b.stumbleT > 0 && !c.dangle) { c.dangle = true; c.post = Math.max(...run.posts.concat(run.mid).filter(p => p <= c.x + .01)); }
      if (b.stumbleT <= 0 && c.dangle) { c.dangle = false; c.x = c.post; for (const p of run.pins) p.plan = null; }
      const fell = b.stumbleT > 0; c.fig.rig.wob = [0, 0];
      c.fig.rig.body = fell ? null : G.moves.rope(G.clamp(b.p.x, -1, 1)); c.fig.clip = null; c.fig.key = 'rope'; if (fell) c.fig.set('Dizzy', { k: 'dz' });
      if (c.x >= run.len && !c.fin) { c.fin = true; c.tFin = run.time; G.jingle('unlock'); }
      c.fig.x = c.x * U; c.fig.y = 0; c.fig.z = ZR + c.z * 10 - (fell ? 10 + (1 - b.stumbleT) * 70 : 0); c.fig.update(dt);
      G.feedbackRope && 0; if (b.edge > .4 && (c.creak = (c.creak || 0) - dt) <= 0) { c.creak = .4; G.snd('rope'); if (c.local && c.input && c.input.rumble) c.input.rumble(.3 + b.edge * .5, .12); }
    });
    if (run.sock) { run.sock.t += dt; if (run.sock.t > 1.8) run.sock = null; }
  },
  timeOf(run, c) { return (c.fin ? c.tFin : run.time) + c.penalty; },
  finished(run) { return run.cs.every(c => c.fin); },
  hud(r, run) {
    const c = run.cs[0], t = this.timeOf(run, c);
    G.drawTimer(r, { dur: 999999, time: 0 }); r.overlay(g => { G.rr(g, r.W / 2 - 22, 6, 44, 14, '#ffffffee'); G.txt(g, G.fmtTime(t), r.W / 2, 9, C.INK, { align: 'center' }); G.txt(g, 'Span ' + Math.min(3, run.posts.findIndex(p => p > c.x) < 0 ? 3 : run.posts.findIndex(p => p > c.x)) + ' / 3', 14, 12, C.INK); G.txt(g, 'Falls ' + c.falls, 14, 24, c.falls ? C.DANGER : C.MUTED);
      G.txt(g, 'Walk ' + Math.round(c.it.effort * 100) + '%', r.W - 14, 12, C.INK, { align: 'right' }); const pw = 80, x0 = r.W - pw - 14, y0 = 26; px.rect(g, x0, y0, pw, 3, '#c8dde2'); px.disc(g, x0 + pw * G.clamp(c.x / run.len, 0, 1), y0 + 1, 3, C.CORAL); });
    G.drawPlate(r, c.bal, r.W / 2, r.H - 34, 26, { hideRing: true }); G.nameTags(r, run);
  },
  draw(r, run) {
    const c = run.cs[0]; G.game.focus(c.x * U, 0, 52);
    r.sky(['#8fd3f4', '#c8ecf8', '#e8f7fb']);
    r.overlay(g => {
      const gx = r.w(0, 0, 0)[1]; px.rect(g, 0, r.w(0, 0, 0)[1], r.W, r.H, '#7fd09a'); px.rect(g, 0, r.w(0, 0, 0)[1], r.W, 3, '#6cc283');
      run.posts.forEach((px0, i) => { const a = r.w(px0 * U, 0, 0), top = r.w(px0 * U, 0, ZR + 6); const wall = i % 2 === 0 ? -1 : 1; px.rect(g, a[0] - 26, top[1] - 40, 52, a[1] - top[1] + 40, i % 2 ? '#fdf5ec' : '#ffe9dc'); px.rect(g, a[0] - 30, top[1] - 48, 60, 10, '#ff7a59'); px.rect(g, a[0] - 8, a[1] - 34, 16, 34, '#2cc6e6'); px.rect(g, a[0] - 3, top[1] - 4, 6, 10, '#a07848');
        if (i === 0) G.sign(g, a[0], top[1] - 70, 'Walking On The Laundry Line: 10:30 Daily', 190); if (i === 0) G.sign(g, a[0], top[1] - 56, 'Please do not walk on the laundry line', 190);
        px.rect(g, a[0] + 26, a[1] - 14, 18, 14, '#a07848'); px.rect(g, a[0] + 26, a[1] - 14, 18, 3, '#c49a6a'); });   // hamper
      for (let i = 0; i < run.posts.length - 1; i++) { const a = r.w(run.posts[i] * U, 0, ZR + 2), b = r.w(run.posts[i + 1] * U, 0, ZR + 2); const n = 24; for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + 1) / n, sag = t => Math.sin(Math.PI * t) * 4; px.line(g, a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0 + sag(t0), a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1 + sag(t1), '#f6fafa', 1); } }
      for (const m of run.mid) { const a = r.w(m * U, 0, 0), t = r.w(m * U, 0, ZR + 2); px.rect(g, a[0] - 2, t[1], 4, a[1] - t[1], '#a07848'); px.rect(g, a[0] - 4, t[1] - 2, 8, 3, '#8a6a44'); }
      for (const p of run.pins) { const a = r.w(p.x * U, 0, ZR + 2); px.rect(g, a[0] - 2, a[1] - 9, 4, 11, p.hit ? '#bbb' : '#f5b700'); px.rect(g, a[0] - 3, a[1] - 9, 6, 2, '#a07848'); }
      const lines = run.gust && run.time > run.gust.t0 - .8; if (run.gust && run.time < run.gust.t1) { const dir = run.gust.dir, a = Math.min(1, (run.time - (run.gust.t0 - .8)) * 3); px.blend(g, a, 'normal', () => { for (let i = 0; i < 7; i++) { const y = 40 + i * 24 + Math.sin(run.time * 6 + i) * 3, x = ((run.time * 280 * dir + i * 97) % (r.W + 80) + r.W + 80) % (r.W + 80) - 40; px.line(g, x, y, x + 30 * dir, y, '#ffffff', 1); } }); }
      if (run.sock) { const k = run.sock.t / 1.8, sx = r.w(c.x * U, 0, 0)[0] + (run.gust ? run.gust.dir : 1) * (-120 + k * 240), sy = 70 + Math.sin(k * 9) * 10; px.rect(g, sx - 4, sy - 4, 8, 7, '#ff7a59'); px.rect(g, sx - 4, sy + 2, 12, 5, '#ff7a59'); px.rect(g, sx - 4, sy - 5, 8, 2, '#fff'); }
    });
    run.cs.forEach(cc => cc.fig.draw(r));
  },
  result(run, c) { const K0 = G.COURSES.laundry, t = this.timeOf(run, c); const pct = G.clamp((K0.worst - t) / (K0.worst - K0.par), 0, 1) - .06 * c.falls * 0; return { pct: G.clamp(pct - .06 * c.falls * (c.fin ? 1 : 1) + (c.fin ? 0 : 0), 0, 1) * (c.fin ? 1 : G.clamp(c.x / run.len, 0, 1)), detail: G.fmtTime(t) + '  ·  ' + c.falls + ' falls' }; }
});
})();
