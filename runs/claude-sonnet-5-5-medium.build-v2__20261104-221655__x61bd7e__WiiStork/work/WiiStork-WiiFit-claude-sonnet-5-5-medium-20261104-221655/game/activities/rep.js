// Rail: Squat Rail, Push-Up, Side Lunge (data rows in data/activities.js)
(() => {
const E = My3D2dge, G = window.G, { px } = E, C = G.C;
const ease = t => .5 - .5 * Math.cos(Math.PI * G.clamp(t, 0, 1));
// bead position for a time inside a rep: 0 top .. 1 bottom
const beadAt = (tm, tp) => { const [d, h, u] = tp; if (tm < 0) return 0; if (tm < d) return ease(tm / d); if (tm < d + h) return 1; if (tm < d + h + u) return 1 - ease((tm - d - h) / u); return 0; };
G.beadAt = beadAt;
for (const row of G.REPROWS) {
  G.activity({
    id: row.id, family: 'rep', discipline: 'Strength', name: row.name, room: 'iron', view: 'brawler', song: 'iron', demoPose: row.id === 'pushup' ? 'plank' : 'stork', card: row.card, tier2Name: 'Slow and held',
    how: { pad: 'Left stick: pull down to go down. Follow the bead.', key: row.axis === 'x' ? 'A and D lean left and right. Follow the bead.' : 'Hold S to go down, W to rise. Follow the bead.', mouse: row.axis === 'x' ? 'Move the mouse left and right.' : 'Move the mouse down to go down.' },
    stars: [.35, .65, .90],
    tiers: row.reps.map((n, i) => ({ set: row.set, dur: 4 + n * (row.tempo[i][0] + row.tempo[i][1] + row.tempo[i][2] + row.tempo[i][3]), reps: n, tempo: row.tempo[i] })),
    row,
    setup(run) {
      const T = run.T, tp = T.tempo, period = tp[0] + tp[1] + tp[2] + tp[3];
      run.period = period; run.lead = 2; run.total = run.shortRun ? Math.min(4, T.reps) : T.reps; run.bonus = 0; run.row = row; run.lastLabel = null; run.labelT = 0;
      run.cs.forEach(c => { c.rep = 0; c.scores = []; c.acc = 0; c.accN = 0; c.formSum = 0; c.formN = 0; c.repDone = -1; c.lastBead = 0; c.fig.tgt = row.tgt; c.val = 0; if (row.body) { c.fig.clip = null; c.fig.key = 'body'; } else c.fig.set(row.clip, { k: 'rep' }); c.bal.set.sMain = 0; });
      run.dur = run.lead + run.total * period + 1;
      if (run.inst) { run.inst.tgt = row.tgt; if (row.body) run.inst.set('Idle_Subtle'); }
    },
    bead(run) { const tm = run.time - run.lead; if (tm < 0) return 0; const idx = Math.floor(tm / run.period); if (idx >= run.total + run.bonus) return 0; return beadAt(tm - idx * run.period, run.T.tempo); },
    beadSigned(run) { const b = this.bead(run), idx = Math.floor((run.time - run.lead) / run.period); return row.axis === 'x' ? b * (idx % 2 === 0 ? -1 : 1) : b; },
    bot(run, c, bot, dt) {
      const lag = { poor: .16, average: .08, good: .035, expert: .015 }[bot.skill] - .25 || -.17, nz = { poor: .09, average: .05, good: .03, expert: .015 }[bot.skill] || .05;
      const tm = run.time - lag, sv = (() => { const t0 = run.time; run.time = tm; const v = G.acts[row.id].beadSigned(run); run.time = t0; return v; })();
      const n = c.botN = c.botN || G.noise(E.rng(11), 2.3), n2 = c.botN2 = c.botN2 || G.noise(E.rng(12), 1.9);
      if (row.axis === 'y') { c.it.uy = G.clamp(-sv + nz * n(run.time), -1, 1); const u = bot.lean(c.bal, dt, [0, 0]); c.it.ux = u.x; }
      else { c.it.ux = G.clamp(sv + nz * n(run.time), -1, 1); const u = bot.lean(c.bal, dt, [0, 0]); c.it.uy = u.y; }
    },
    update(dt, run) {
      const T = run.T, tm = run.time - run.lead, idx = Math.floor(tm / run.period), F = G.clamp((idx - run.total * .6) / (run.total * .4), 0, 1) * (tm > 0 ? 1 : 0) * G.DEV.fatigue;
      const bs = this.beadSigned(run);
      run.cs.forEach(c => {
        const b = c.bal; b.mult.A = 1 + 2.2 * F; b.mult.k = 1 - .3 * F; c.fatigue = F;
        run.leanStep(c, dt);
        const val = row.axis === 'y' ? G.clamp(-b.p.y, 0, 1) : b.p.x, form = row.axis === 'y' ? Math.abs(b.p.x) : Math.abs(b.p.y); c.val = val;
        if (tm >= 0 && idx < run.total + run.bonus) { c.acc += Math.abs(val - bs) * dt; c.accN += dt; c.formSum += form * dt; c.formN += dt; }
        if (tm >= 0 && idx > c.repDone && idx >= 0 && c.repDone < idx - 0 && c.accN > 0 && tm - idx * run.period < dt * 1.5 + 1e-6 && idx > 0) { }
        // end of a rep period: score it
        const endIdx = Math.floor((tm + 1e-6) / run.period) - 1;
        if (tm >= 0 && endIdx > c.repDone && endIdx >= 0 && endIdx < run.total + run.bonus) {
          c.repDone = endIdx; const err = c.accN ? c.acc / c.accN : 1, tol = G.DEV.repTol, sc = G.clamp(1 - (err - tol) / (.35 - tol), 0, 1); c.scores.push(sc); c.acc = 0; c.accN = 0;
          c.label = sc >= .9 ? 'Perfect' : sc >= .6 ? 'Good' : 'Late'; c.labelT = 1.2; G.snd(sc >= .9 ? 'perfect' : sc >= .6 ? 'good' : 'miss'); if (c.local) { G.game.particles.glints(c.fig.x, c.fig.y, 26, 4, sc >= .9 ? '#bfeee0' : '#f5b700'); G.grunt(c.fig.name, 'hup'); }
          if (endIdx === run.total - 1 && run.bonus === 0 && c.local) { const m = c.scores.reduce((a, b2) => a + b2, 0) / c.scores.length; if (m > .8) { run.bonus = 2; run.dur += 2 * run.period; G.caption(G.line(G.LINES[G.S.inst || 'birch'].more), G.CAST[G.S.inst || 'birch'].name, 4); } }
        }
        c.labelT = Math.max(0, (c.labelT || 0) - dt);
        // figure
        if (row.body) { c.fig.rig.body = G.moves.sideLunge(G.clamp(val, -1, 1)); c.fig.rig.wob = [0, 0]; c.fig.update; }
        else { const L = G.lib(), cl = L && L.clip(row.clip); if (cl) { const t1 = row.t1 < 0 ? cl.dur * .5 : row.t1; c.fig.scrub(row.clip, row.t0 + (t1 - row.t0) * val); } c.fig.rig.wob = [row.axis === 'y' ? b.p.x : 0, row.axis === 'x' ? b.p.y : 0]; }
        if (F > .1) c.fig.rig.wob = [c.fig.rig.wob[0] + Math.sin(run.time * 30) * .02 * F, c.fig.rig.wob[1]];
      });
      // the instructor's own bead
      if (run.inst) { const v = Math.abs(this.bead(run)); if (row.body) run.inst.rig.body = G.moves.sideLunge(bs * 1); else { const L = G.lib(), cl = L && L.clip(row.clip); if (cl) { const t1 = row.t1 < 0 ? cl.dur * .5 : row.t1; run.inst.scrub(row.clip, row.t0 + (t1 - row.t0) * v); } } }
    },
    hud(r, run) {
      G.drawTimer(r, run); G.nameTags(r, run);
      const bs = this.beadSigned(run), bd = Math.abs(this.bead(run));
      run.cs.forEach((c, i) => {
        const s = run.slot(i), sx = r.w(s.x, 12, 0)[0], small = run.n > 1, len = small ? 44 : 72;
        r.overlay(g => {
          if (row.axis === 'y') { const rx = sx + (small ? 22 : 46), ry = r.H - 36 - len;
            G.rr(g, rx - 4, ry - 4, 8, len + 8, '#ffffff'); px.rect(g, rx - 1, ry, 2, len, '#c8dde2');
            px.disc(g, rx, ry + len * bs, 5, C.ACC); px.disc(g, rx, ry + len * bs, 3, '#ffffff'); px.disc(g, rx, ry + len * c.val, 3, C.CORAL); }
          else { const ry = r.H - 20, rx = sx - len / 2; G.rr(g, rx - 4, ry - 4, len + 8, 8, '#ffffff'); px.rect(g, rx, ry - 1, len, 2, '#c8dde2'); const bx = rx + len * (bs * .5 + .5), vx = rx + len * (G.clamp(c.val, -1, 1) * .5 + .5); px.disc(g, bx, ry, 5, C.ACC); px.disc(g, bx, ry, 3, '#ffffff'); px.disc(g, vx, ry, 3, C.CORAL); }
          if (c.labelT > 0) G.txt(g, c.label, sx, r.H - 100 - (1.2 - c.labelT) * 14, c.label === 'Perfect' ? '#14a88c' : c.label === 'Good' ? C.ACC2 : C.DANGER, { align: 'center', scale: 2 });
          if (!small) G.txt(g, 'Rep ' + Math.min(run.total + run.bonus, Math.max(1, c.scores.length + 1)) + ' / ' + (run.total + run.bonus), 14, r.H - 24, C.INK, { shadow: undefined });
        });
      });
    },
    draw(r, run) { if (run.inst) run.inst.draw(r); run.cs.forEach(c => c.fig.draw(r)); },
    result(run, c) { const n = c.scores.length, m = n ? c.scores.reduce((a, b) => a + b, 0) / n : 0, fm = c.formN ? c.formSum / c.formN : 0, pen = G.clamp((fm - .12) / .5, 0, 1) * .3; return { pct: G.clamp(m * (1 - pen), 0, 1), detail: n + ' reps  ·  Form ' + Math.round((1 - pen / .3 * .3) * 100) + '%' }; },
    finished(run) { return run.cs.every(c => c.repDone >= run.total + run.bonus - 1) && run.time > run.lead + 1; }
  });
}
})();
