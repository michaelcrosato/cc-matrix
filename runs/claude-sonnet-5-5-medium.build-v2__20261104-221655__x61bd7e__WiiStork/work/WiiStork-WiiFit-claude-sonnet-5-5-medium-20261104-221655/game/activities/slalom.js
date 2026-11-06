// Mount Posture Slalom (E.Mode7)
(() => {
const E = My3D2dge, G = window.G, { px } = E, C = G.C;
const FLOOR = (x, y) => { const s = ((Math.floor(x / 36) + Math.floor(y / 36)) & 1) ? 0 : 1, line = (Math.abs(((x % 400) + 400) % 400 - 200) < 1.5) ? 8 : 0; const v = 244 - s * 7 - line; return [v, v + 5, v + 8]; };
G.activity({
  id: 'slalom', family: 'slalom', discipline: 'Balance', name: 'Mount Posture Slalom', room: false, view: 'brawler', song: 'ski', demoPose: 'crouch', weather: { kind: 'snow', amount: .5, wind: .1 }, tier2Name: 'Narrow gates and fog', hubEvent: true,
  card: 'Lean to steer between the gates. Lean forward to tuck for speed. Lean back to brake. Snowmen are not gentle.',
  how: { pad: 'Left stick: left and right steer, up tucks, down brakes.', key: 'A and D steer. W tucks. S brakes.', mouse: 'Move the mouse: left and right steer, up tucks, down brakes.' },
  stars: [.35, .65, .90],
  tiers: [{ set: 'free', dur: 120, course: 0 }, { set: 'free', dur: 120, course: 1, fog: true }],
  setup(run) {
    const K = G.COURSES.slalom, T = run.T, hw = [28, 21][T.course], sp = K.spacing * (G.DEV.slalomSpeed >= 0 ? 1 : 1) * .78; run.K = K; run.hw = hw; run.sp = sp;
    run.gates = (run.shortRun ? K.gates.slice(0, 9) : K.gates).map((o, i) => ({ x: o * 40, y: 600 + i * sp, passed: false, missed: false }));
    run.obst = [...K.snowmen.map(i => ({ kind: 'snowman', i })), ...K.pines.map(i => ({ kind: 'pine', i }))].filter(o => o.i < run.gates.length - 1).map((o, j) => { const g0 = run.gates[o.i], g1 = run.gates[Math.min(run.gates.length - 1, o.i + 1)]; return { kind: o.kind, x: (g0.x + g1.x) / 2 + (j % 2 ? 34 : -34), y: (g0.y + g1.y) / 2, hit: false }; });
    run.m7 = new E.Mode7({ floor: FLOOR, size: [800, 800], wrap: true, sky: ['#9fd3f0', '#e6f4fa'], fog: T.fog ? { color: '#e8f1f5', near: 80, far: 360 } : { color: '#e6f4fa', near: 400, far: 1500 }, far: T.fog ? 400 : 1500 });
    run.cs.forEach(c => { c.x = 0; c.y = 0; c.vy = 0; c.missed = 0; c.tumble = 0; c.tumbles = 0; c.next = 0; c.fin = false; c.finT = 0; c.ang = Math.PI / 2; c.fig.stance = 'crouch'; c.fig.clip = null; c.fig.key = 'x'; c.tilt = 0; });
    run.end = run.gates[run.gates.length - 1].y + 220; run.carveT = 0;
  },
  bot(run, c, bot, dt) {
    const P = { poor: { aim: 24, err: .5, k: 1.3 }, average: { aim: 14, err: .25, k: 2.2 }, good: { aim: 7, err: .1, k: 3.5 }, expert: { aim: 3, err: .03, k: 6 } }[bot.skill] || { aim: 7, err: .15, k: 3 };
    const g = run.gates[Math.min(c.next, run.gates.length - 1)]; let tx = g.x + P.aim * Math.sin(run.time * 1.3 + c.idx);
    for (const o of run.obst) { const dy = o.y - c.y; if (dy > 20 && dy < 200 && Math.abs(o.x - c.x) < 22) { tx = c.x + (o.x > c.x ? -40 : 40); break; } }
    const dy = Math.max(30, g.y - c.y), want = G.clamp((tx - c.x) / dy * P.k, -1, 1); c.it.ux = G.clamp(want + (run.rng() - .5) * P.err, -1, 1); c.it.uy = dy < 140 ? .1 : ({ poor: .0, average: .15, good: .3, expert: .5 }[bot.skill] || .2);
  },
  update(dt, run) {
    run.cs.forEach(c => {
      if (c.fin) { c.finT += dt; c.vy *= Math.pow(.2, dt); c.y += c.vy * dt; return; }
      const it = c.it, base = G.DEV.slalomSpeed, tum = c.tumble > 0;
      const mult = it.uy > 0 ? 1 + .35 * it.uy : 1 - .4 * -it.uy;
      let v = tum ? 20 : base * mult; c.vy = G.lerp(c.vy, v, Math.min(1, dt * 3));
      c.tumble = Math.max(0, c.tumble - dt);
      const lat = tum ? 0 : it.ux * 95 * G.DEV.slalomTurn * (.6 + .4 * c.vy / base); c.x = G.clamp(c.x + lat * dt, -200, 200); c.y += c.vy * dt; c.tilt = G.lerp(c.tilt, it.ux, Math.min(1, dt * 6));
      c.ang = Math.PI / 2 + G.clamp(-lat / 400, -.35, .35) * 0;
      // gates
      const g = run.gates[c.next]; if (g && c.y >= g.y) { if (Math.abs(c.x - g.x) <= run.hw) { g.passed = true; G.snd('chime', { pitch: 1 + c.next * .03 }); } else { g.missed = true; c.missed++; G.snd('miss'); if (c.local && c.missed === 1) G.caption('A gate is a suggestion with flags. +3 seconds.', 'Tare', 3); } c.next++; }
      for (const o of run.obst) if (!o.hit && Math.abs(o.y - c.y) < 8 && Math.abs(o.x - c.x) < 12) { o.hit = true; c.tumble = 1.2; c.tumbles++; G.snd('stumble'); if (c.local) { G.game.shake && G.game.shake(3); G.caption(o.kind === 'snowman' ? 'You have hurt a snowman. He understands.' : 'A pine. It does not mind. It has been here longer.', 'Tare', 3); } }
      run.carveT -= dt; if (run.carveT <= 0 && !tum && Math.abs(it.ux) > .3) { run.carveT = .09; G.snd('carve', { vol: .03 + Math.abs(it.ux) * .03 }); }
      if (c.y >= run.end) { c.fin = true; c.finT = 0; c.tFinal = run.time; G.jingle('unlock'); }
      c.fig.x = c.x; c.fig.y = c.y; c.fig.tgt = Math.PI / 2; c.fig.rig.wob = [c.tilt * .3, 0]; c.fig.update(dt);
    });
  },
  timeOf(run, c) { return (c.tFinal != null ? c.tFinal : run.time) + 3 * c.missed; },
  hud(r, run) {
    const c = run.cs[0], t = this.timeOf(run, c);
    r.overlay(g => { G.rr(g, r.W / 2 - 40, 6, 80, 16, '#ffffffdd'); G.txt(g, G.fmtTime(t) + '.' + Math.floor((t % 1) * 10), r.W / 2, 10, C.INK, { align: 'center', scale: 1 }); G.txt(g, 'Gate ' + Math.min(run.gates.length, c.next + 1) + ' / ' + run.gates.length, 14, 12, C.INK); if (c.missed) G.txt(g, 'Missed ' + c.missed + ' (+' + 3 * c.missed + 's)', 14, 24, C.DANGER);
      const pw = 60, px0 = r.W - pw - 16, py0 = r.H - 22; G.rr(g, px0 - 3, py0 - 4, pw + 6, 12, '#ffffffcc'); px.rect(g, px0, py0 + 1, pw, 2, '#c8dde2'); px.disc(g, px0 + pw * G.clamp(c.y / run.end, 0, 1), py0 + 2, 3, C.CORAL);
      if (c.fin) { G.rr(g, r.W / 2 - 90, 40, 180, 54, '#ffffffee'); G.txt(g, 'Finish', r.W / 2, 46, C.ACC2, { align: 'center', scale: 2 }); G.txt(g, G.LINES.slalomTimes[(c.missed + c.tumbles) % G.LINES.slalomTimes.length], r.W / 2, 70, C.INK, { align: 'center' }); }
    });
  },
  draw(r, run) {
    const m7 = run.m7, c = run.cs[0];
    m7.cam.x = c.x; m7.cam.y = c.y - 56; m7.cam.h = 34; m7.cam.angle = Math.PI / 2; m7.cam.pitch = 12; m7.cam.fov = 70;
    run.gates.forEach((gt, i) => { if (Math.abs(gt.y - c.y) > 1400 || gt.y < c.y - 60) return; const col = i % 2 ? '#2cc6e6' : '#ff7a59';
      for (const sx of [-1, 1]) m7.add(gt.x + sx * run.hw, gt.y, 0, (g, X, Y, k) => { px.rect(g, X - 1, Y - 22 * k, 2, 22 * k, col); px.rect(g, X, Y - 22 * k, 9 * k * sx, 5 * k, gt.passed ? '#7fe3b8' : gt.missed ? '#bbb' : col); }); });
    run.obst.forEach(o => { if (Math.abs(o.y - c.y) > 1400 || o.y < c.y - 60) return; m7.add(o.x, o.y, 0, (g, X, Y, k) => { if (o.kind === 'snowman') { px.disc(g, X, Y - 6 * k, 7 * k, '#ffffff'); px.disc(g, X, Y - 15 * k, 5 * k, '#ffffff'); px.dot(g, X, Y - 15 * k, '#20404c'); px.rect(g, X, Y - 15 * k, 4 * k, 1.5 * k, '#ff7a59'); } else { px.poly(g, [[X - 9 * k, Y], [X, Y - 34 * k], [X + 9 * k, Y]], '#3f8f5a'); px.poly(g, [[X - 7 * k, Y - 10 * k], [X, Y - 38 * k], [X + 7 * k, Y - 10 * k]], '#4fa86a'); px.rect(g, X - 1, Y, 2 * k, 4 * k, '#6a4a2c'); } }); });
    run.cs.forEach(cc => { if (cc !== c) m7.add(cc.x, cc.y, 0, (g, X, Y, k) => px.disc(g, X, Y - 8 * k, 4 * k, cc.color)); m7.rig(cc.fig.rig, cc.x, cc.y, 0); });
    r.overlay(g => m7.draw(r, m7.cam));
  },
  result(run, c) { const K = run.K, t = this.timeOf(run, c), sf = run.shortRun ? .5 : 1, par = K.par[run.T.course] * sf, worst = K.worst[run.T.course] * sf; return { pct: G.clamp((worst - t) / (worst - par), 0, 1), detail: G.fmtTime(t) + '  ·  ' + c.missed + ' missed  ·  ' + c.tumbles + ' tumbles' }; },
  finished(run) { return run.cs.every(c => c.fin && c.finT > 1.5); }
});
})();
