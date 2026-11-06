// Hoop Hips
(() => {
const E = My3D2dge, G = window.G, { px } = E, C = G.C;
const best = dur => { let s = 0; for (let t = 0; t < dur; t += .5) s += .5 * (1 + .5 * Math.min(6, t < 4 ? 0 : Math.floor((t - 4) / 5) + 1)); return s; };
const HOOKS = ['#ff7a59', '#2cc6e6', '#f5b700', '#8fd36a', '#c68cf0', '#f58cb4'];
G.activity({
  id: 'hoop', family: 'hoop', discipline: 'Cardio', name: 'Hoop Hips', room: 'pier', view: 'brawler', song: 'jog', demoPose: 'Jumping Jacks', class: true,
  card: 'Circle the lean to spin the hoop. Not too slow. Not too eager. Catch the hoops Mr. Okafor tosses, and stack them.',
  how: { pad: 'Draw circles with the left stick. L1 and R1 catch.', key: 'Tap W, D, S, A in turn. Q and E catch.', mouse: 'Circle the pointer around the middle of the screen. Left and right buttons catch.' },
  stars: [.35, .65, .90],
  tiers: [{ set: 'free', dur: 60 }],
  setup(run) {
    run.best = best(run.dur); run.regs = [G.castFigure('okafor', { size: 1.6, x: -92, y: 6, tgt: 1.0 }), G.castFigure('twinA', { size: 1.6, x: 92, y: 6, tgt: 2.1 })]; run.regs.forEach(f => f.set('Idle_Subtle'));
    run.cs.forEach(c => { c.hoops = 0; c.om = 0; c.phase = 0; c.dir = 1; c.score = 0; c.out = 0; c.q = -1; c.qt = -9; c.tosses = []; c.nextToss = 3 + run.rng() * 1.5; c.ang = 0; c.sc = 0; c.flip = false; c.catches = 0; c.drops = 0; c.status = 'Too slow'; c.fig.clip = null; c.fig.key = 'body'; c.bandT = 0; });
  },
  bot(run, c, bot, dt) {
    const P = { poor: { err: .35, w: .1, catch: .55 }, average: { err: .2, w: .06, catch: .8 }, good: { err: .12, w: .03, catch: .95 }, expert: { err: .06, w: .015, catch: 1 } }[bot.skill] || { err: .2, w: .06, catch: .8 };
    const [lo, hi] = this.band(run, c), mid = (lo + hi) / 2, w = mid * (1 + P.err * Math.sin(run.time * .9 + c.idx)) + P.w * 5 * Math.sin(run.time * 2.3);
    c.botA = (c.botA || 0) + c.dir * w * dt; c.it.ux = Math.cos(c.botA) * .85; c.it.uy = Math.sin(c.botA) * .85; c.it.moved = true;
    c.it.catchL = c.it.catchR = false;
    for (const t of c.tosses) if (!t.done && !t.bot) { const off = (run.rng() - .5) * .3; t.bot = { off, will: run.rng() < P.catch }; }
    for (const t of c.tosses) if (!t.done && t.bot && t.bot.will && run.time >= t.tArr + t.bot.off && !t.pressed) { t.pressed = true; if (t.side < 0) c.it.catchL = true; else c.it.catchR = true; }
  },
  band(run, c) { const k = c.it.src === 'key' ? .6 : 1, h = Math.min(c.hoops, 6) * .3; return [(G.DEV.hoopLo + h) * k, (G.DEV.hoopHi + h * 1.2) * k]; },
  update(dt, run) {
    run.cs.forEach(c => {
      const it = c.it, src = it.src, flip = run.time >= run.dur / 2; if (flip && !c.flip) { c.flip = true; c.dir = -1; c.out = 0; if (c.local) G.caption('Other way!', 'Mr. Okafor', 2.5); G.snd('whoosh'); }
      let omega = 0, mag = Math.hypot(it.ux, it.uy);
      if (src === 'key') {
        const q = (it.kx ? (it.kx > 0 ? 1 : 3) : it.ky ? (it.ky > 0 ? 0 : 2) : -1);
        if (q >= 0 && q !== c.q) { const d = c.q < 0 ? 0 : ((q - c.q + 4) % 4 === 1 ? 1 : (q - c.q + 4) % 4 === 3 ? -1 : 0), gap = run.time - c.qt; if (d && gap < .7 && gap > .03) c.om = G.lerp(c.om, d * (Math.PI / 2) / gap, .6); c.q = q; c.qt = run.time; }
        if (run.time - c.qt > .6) c.om *= Math.pow(.02, dt);
      } else {
        const a = Math.atan2(it.uy, it.ux);
        if (mag > .55 && c.ang != null && c.lastMag > .55) { let d = a - c.ang; while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283; const w = d / dt; c.om = G.lerp(c.om, G.clamp(w, -20, 20), Math.min(1, dt * 12)); } else c.om *= Math.pow(.05, dt);
        c.ang = a; c.lastMag = mag;
      }
      const sp = c.om * c.dir, [lo, hi] = this.band(run, c); c.status = sp < lo ? 'Too slow' : sp > hi ? 'Too eager' : 'Just right';
      const ok = c.status === 'Just right';
      if (ok) { c.sc += dt * (1 + .5 * c.hoops); c.out = 0; if (Math.floor(run.time * 4) !== c.pq) { c.pq = Math.floor(run.time * 4); G.snd('whirr', { pitch: .6 + sp / 14 }); } } else { c.out += dt; if (c.out >= 1.5 && c.hoops > 0) { c.hoops--; c.out = 0; c.drops++; G.snd('miss'); if (c.local) G.caption('A hoop has left. It had somewhere to be.', 'Mr. Okafor', 2.2); } }
      c.phase += c.om * dt; c.fig.rig.body = G.moves.hula(c.phase);
      // tosses
      if (run.time >= c.nextToss && c.hoops < 6 + 2) { const side = run.rng() < .5 ? -1 : 1; c.tosses.push({ side, t0: run.time, tArr: run.time + 1.4 }); c.nextToss = run.time + 4 + run.rng() * 2; G.snd('whoosh', { pitch: 1.4 }); }
      for (const t of c.tosses) { if (t.done) continue; const press = t.side < 0 ? it.catchL : it.catchR; if (press && Math.abs(run.time - t.tArr) <= .25) { t.done = 1; c.hoops = Math.min(6, c.hoops + 1); c.catches++; G.snd('perfect'); G.game.particles.glints(c.fig.x + t.side * 10, c.fig.y, 28, 4, HOOKS[c.hoops % 6]); } else if (run.time > t.tArr + .25) { t.done = 2; } }
      c.tosses = c.tosses.filter(t => !(t.done && run.time > t.tArr + 1));
      c.fig.update; c.fig.rig.wob = [0, 0];
    });
    run.regs.forEach((f, i) => { f.update(dt); });
  },
  hud(r, run) {
    G.drawTimer(r, run); G.nameTags(r, run);
    run.cs.forEach((c, i) => {
      const small = run.n > 1, s = run.slot(i), cx = small ? r.w(s.x, 12, 0)[0] : r.W / 2, cy = r.H - (small ? 14 : 22), rad = small ? 16 : 34;
      const [lo, hi] = this.band(run, c);
      r.overlay(g => {
        // dial: half circle, three zones
        const seg = (a0, a1, col) => { for (let a = a0; a <= a1; a += .03) { px.line(g, cx + Math.cos(a) * rad * .6, cy - Math.sin(a) * rad * .6, cx + Math.cos(a) * rad, cy - Math.sin(a) * rad, col, 1); } };
        const toA = w => Math.PI - G.clamp(w / 16, 0, 1) * Math.PI;
        px.disc(g, cx, cy, rad + 2, '#ffffffcc'); seg(toA(16), Math.PI, '#e8eef0'); seg(toA(hi), toA(lo), '#7fe3b8'); seg(Math.PI - 0.0, Math.PI, '#ffd6c8'); seg(0, toA(hi), '#ffd6c8'); seg(toA(lo), Math.PI, '#c8dde2');
        const na = toA(G.clamp(c.om * c.dir, 0, 16)); px.line(g, cx, cy, cx + Math.cos(na) * rad * .95, cy - Math.sin(na) * rad * .95, C.INK, 2); px.disc(g, cx, cy, 2, C.INK);
        if (!small) { G.txt(g, c.status, cx, cy + 6, c.status === 'Just right' ? '#14a88c' : C.DANGER, { align: 'center' }); G.txt(g, (c.dir > 0 ? 'Clockwise' : 'Other way') + '  ·  hoops ' + c.hoops, cx, cy + 16 - 0, C.MUTED, { align: 'center' }); G.txt(g, Math.round(c.sc), 18, 14, C.ACC2, { scale: 2 }); }
        // incoming tosses
        for (const t of c.tosses) { if (t.done) continue; const k = (run.time - t.t0) / (t.tArr - t.t0), hx = r.w(c.fig.x + t.side * 92 * (1 - k), 0, 0)[0], hy = r.w(0, 0, 30 + 20 * Math.sin(Math.PI * k))[1]; px.disc(g, hx, hy, 5, HOOKS[(t.t0 | 0) % 6]); px.disc(g, hx, hy, 3, 'rgba(255,255,255,.9)'); if (k > .7) px.disc(g, r.w(c.fig.x + t.side * 14, 0, 0)[0], r.w(0, 0, 26)[1], 8, 'rgba(255,255,255,.35)'); }
      });
    });
  },
  draw(r, run) {
    run.regs.forEach(f => f.draw(r));
    run.cs.forEach(c => {
      c.fig.draw(r);
      const zh = c.fig.rig.o.hipZ * c.fig.rig.o.size * .95, p = r.w(c.fig.x, c.fig.y, zh), rad = 8 + 5 * c.fig.rig.o.size, cph = c.phase;
      for (let h = 0; h < Math.max(1, c.hoops + 0); h++) {
        if (c.hoops <= 0) break;
        const col = HOOKS[h % 6], yy = p[1] + (h % 3 - 1) * 1.5 - h * 1.2, rx = rad + h * 1.2, ry = 3.2 + h * .4, wob = Math.sin(cph + h) * 1.5;
        const poly = back => { const pts = []; for (let a = back ? Math.PI : 0; a <= (back ? 2 * Math.PI : Math.PI) + .01; a += .3) pts.push([p[0] + Math.cos(a) * rx + wob, yy + Math.sin(a) * ry]); return pts; };
        const draw = back => g => { const pts = poly(back); for (let i = 1; i < pts.length; i++) px.line(g, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], col, 2); };
        r.queue(c.fig.x, c.fig.y, 0, draw(true), { bias: -6 }); r.queue(c.fig.x, c.fig.y, 0, draw(false), { bias: 6 });
      }
    });
  },
  result(run, c) { return { pct: G.clamp(c.sc / run.best, 0, 1), detail: c.catches + ' hoops caught  ·  ' + Math.round(c.sc) + ' points' }; }
});
})();
