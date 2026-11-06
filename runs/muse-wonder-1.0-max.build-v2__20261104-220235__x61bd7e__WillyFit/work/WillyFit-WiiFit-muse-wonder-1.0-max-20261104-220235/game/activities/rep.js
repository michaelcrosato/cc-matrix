// Willy Fit — rep family: Squat Rail, Push-Up, Side Lunge (one code path, three data rows).
window.G = window.G || {};
(function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function repActivity(id, name, card, drive, clipInfo, reps1, reps2, horizontal) {
    return {
      id: id, family: 'rep', discipline: 'Strength', name: name, view: 'brawler',
      classOk: id === 'squat', hubOk: true, room: 'iron', song: 'iron', card: card,
      stars: [0.35, 0.65, 0.90],
      tiers: [
        { dur: 70, reps: reps1, down: 2, up: 2, hold: 0, params: { k: 16, c: 8, s: 0, A: 2.2, nf: 1.2, R: 0.3 } },
        { dur: 80, reps: reps2, down: 3, up: 1, hold: 0.8, params: { k: 15, c: 7.5, s: 0, A: 2.8, nf: 1.4, R: 0.28 } }
      ],
      drive: drive, clipInfo: clipInfo, horizontal: !!horizontal,
      setup(ctx) {
        for (const c of ctx.contestants) {
          c.rep = 0; c.scores = []; c.bonus = 0; c.formSum = 0; c.formN = 0; c.phaseT = 0; c.curErr = [];
          c.totalReps = ctx.tierDef.reps; c.finished = false;
        }
      },
      beadAt(ctx, c) {
        const T = ctx.tierDef, cyc = T.down + T.hold + T.up;
        const t = ctx.time % cyc;
        if (t < T.down) return t / T.down;
        if (t < T.down + T.hold) return 1;
        return 1 - (t - T.down - T.hold) / T.up;
      },
      update(dt, ctx) {
        const self = this;
        for (const c of ctx.contestants) {
          if (c.finished) continue;
          const it = c.getIntent(dt);
          const T = ctx.tierDef, cyc = T.down + T.hold + T.up;
          // main-axis balance with s=0 params; form axis wobbles separately
          const depthRaw = self.horizontal ? clamp(it.lean.x, -1, 1) : clamp(it.lean.y, 0, 1);
          // smooth depth toward lean (your thumb is the body)
          c._depth = c._depth == null ? 0 : c._depth + (depthRaw - c._depth) * Math.min(1, dt * 10);
          if (!self.horizontal) {
            // drive balance y from depth for Plate/form: use bal with lean
            c.bal.step(dt, { x: it.lean.x, y: c._depth });
          } else {
            c.bal.step(dt, { x: c._depth, y: it.lean.y });
          }
          const formAxis = self.horizontal ? Math.abs(it.lean.y) : Math.abs(it.lean.x);
          c.formSum += formAxis; c.formN++;
          const bead = self.beadAt(ctx, c);
          c._bead = bead;
          const depth = self.horizontal ? Math.abs(c._depth) : c._depth;
          const signedDepth = c._depth;
          c.curErr.push(Math.abs((self.horizontal ? signedDepth : depth) - (self.horizontal ? (bead * 2 - 1) : bead)));
          // rep boundary
          const repNow = Math.floor(ctx.time / cyc);
          if (repNow > c.rep) {
            const errs = c.curErr; c.curErr = [];
            const mean = errs.length ? errs.reduce((a, b) => a + b, 0) / errs.length : 1;
            const tol = G.DEV.repTol;
            let sc = mean <= tol ? 1 : mean >= 0.35 ? 0 : 1 - (mean - tol) / (0.35 - tol);
            // bots: depth follows bead with skill lag/noise (simulate via bal quality)
            if (c.bot) {
              const q = { poor: 0.45, average: 0.78, good: 0.93, expert: 0.99, passive: 0.05 }[c.bot.skill] || 0.7;
              sc = clamp(q + (ctx.rng() - 0.5) * 0.12, 0, 1);
            }
            if (self.horizontal && !c.bot) { /* signed already */ }
            c.scores.push(clamp(sc, 0, 1)); c.rep = repNow;
            c._lastJudge = sc >= 0.85 ? 'Perfect' : sc >= 0.55 ? 'Good' : sc >= 0.25 ? 'Late' : 'Missed';
            if (c.rep >= c.totalReps) {
              const meanScore = c.scores.reduce((a, b) => a + b, 0) / Math.max(1, c.scores.length);
              if (meanScore > 0.8 && c.bonus < 2) { c.totalReps += 2; c.bonus = 2; if (ctx.say) ctx.say(ctx.instructorName || 'Birch', "You're doing so well, so I've added some."); }
              else c.finished = true;
            }
          }
          // rig posing
          c.rig.wob = [c.bal.p.x * 0.4, c.bal.p.y * 0.4];
          if (self.horizontal) { c.rig.body = G.sideLungeBody(c._depth); c.rig.mocap = null; }
          else if (self.clipInfo) {
            const c2 = G.clip(self.clipInfo.clip); const L = G.getLib();
            if (c2 && L) { const tt = self.clipInfo.frac != null ? c2.dur * self.clipInfo.frac * clamp(c._depth, 0, 1) : self.clipInfo.t0 + (self.clipInfo.t1 - self.clipInfo.t0) * clamp(c._depth, 0, 1); try { c.rig.mocap = L.sample(c2, tt); } catch (e) {} }
            c.rig.body = null;
          }
          // fatigue after 60%
          if (c.rep > c.totalReps * 0.6) c._fatigue = G.DEV.fatigue;
        }
        // instructor mirrors bead
        if (ctx.instructorRig) {
          const bead = self.beadAt(ctx, ctx.contestants[0]);
          if (self.horizontal) { ctx.instructorRig.body = G.sideLungeBody(bead * 2 - 1); ctx.instructorRig.mocap = null; }
          else if (self.clipInfo) {
            const c2 = G.clip(self.clipInfo.clip); const L = G.getLib();
            if (c2 && L) { const tt = self.clipInfo.frac != null ? c2.dur * self.clipInfo.frac * bead : self.clipInfo.t0 + (self.clipInfo.t1 - self.clipInfo.t0) * bead; try { ctx.instructorRig.mocap = L.sample(c2, tt); } catch (e) {} }
          }
        }
      },
      result(ctx) {
        const c = ctx.contestants[0];
        const mean = c.scores.length ? c.scores.reduce((a, b) => a + b, 0) / c.scores.length : 0;
        const form = c.formN ? c.formSum / c.formN : 0;
        let pct = mean * (1 - Math.min(0.3, form * 0.5));
        if (c.bot) pct = mean; // bots judged on rep score directly
        return { pct: clamp(pct, 0, 1), detail: c.scores.length + ' reps · form ' + Math.round((1 - Math.min(1, form)) * 100) + '%' };
      },
      ghost(ctx) { const c = ctx.contestants[0]; return { l: [c.bal.p.x, c.bal.p.y], s: Math.round((c._depth || 0) * 100) }; }
    };
  }
  G.activity(repActivity('squat', 'Squat Rail', 'Lean down to squat, up to stand. Follow the bead. Your lean is your body.', 'down', { clip: '22_14', t0: 1.1, t1: 1.72 }, 8, 12, false));
  G.activity(repActivity('pushup', 'Push-Up', 'Lean down low, push back up. Follow the bead. The floor is patient.', 'down', { clip: 'Pushup', frac: 0.5 }, 6, 10, false));
  G.activity(repActivity('lunge', 'Side Lunge', 'Lean left and right along the rail. Feet stay. Pride wobbles.', 'side', null, 8, 12, true));
})();
