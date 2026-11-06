// Willy Fit — Step Class (E.Rhythm), Hoop Hips, Coastal Jog.
window.G = window.G || {};
(function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  G.activity({
    id: 'step', family: 'step', discipline: 'Cardio', name: 'Step Class', view: 'brawler',
    classOk: true, hubOk: true, room: 'pier', song: 'stepA',
    card: 'Step on the beat. Follow the arrows. The click keeps time, even at low music.',
    stars: [0.5, 0.75, 0.92],
    tiers: [
      { dur: 60, bpm: 100, chart: 'tier1', params: { k: 12, c: 6, s: 4, A: 2, nf: 1, R: 0.3 } },
      { dur: 60, bpm: 120, chart: 'tier2', params: { k: 12, c: 6, s: 5, A: 2.4, nf: 1.1, R: 0.3 } }
    ],
    setup(ctx) {
      const E = G.E;
      const ch = G.CHARTS[ctx.tierDef.chart];
      // Build note list: each part 16 steps; order repeats to fill duration.
      const lanes = ['stepL', 'stepD', 'stepU', 'stepR'];
      const useLanes = ctx.tier === 1 ? [0, 3] : [0, 1, 2, 3];
      const spb = 60 / ctx.tierDef.bpm / 1; // chart steps are 16th? treat each char as half-beat for density
      const stepDur = 60 / ctx.tierDef.bpm / 2;
      const order = ch.order.split(/\s+/);
      const seq = [];
      for (const p of order) for (let rep = 0; rep < 3; rep++) seq.push(p);
      const notes = [];
      let t = 2;
      for (const p of seq) {
        const rows = ch.parts[p];
        for (let i = 0; i < 16; i++) {
          for (const li of useLanes) { if (rows[li] && rows[li][i] === 'x') notes.push({ t: t + i * stepDur, lane: li }); }
        }
        t += 16 * stepDur;
        if (t > ctx.tierDef.dur - 2) break;
      }
      for (const c of ctx.contestants) { c.notes = notes; c.hit = new Set(); c.judged = 0; c.good = 0; c.stepAnim = 0; c.combo = 0; }
      ctx._beatT = 0;
      // Rhythm helper if available (for accuracy bookkeeping fallback we judge manually)
      try { ctx.rh = null; } catch (e) {}
    },
    update(dt, ctx) {
      const win = [0.045, 0.09, 0.135].map(w => w * G.DEV.rhythmScale * 2.2); // forgiving windows for demo bots/humans
      for (const c of ctx.contestants) {
        const it = c.getIntent(dt);
        c.bal.step(dt, it.lean);
        c.stepAnim = Math.max(0, (c.stepAnim || 0) - dt * 3);
        const lanes = ['stepL', 'stepD', 'stepU', 'stepR'];
        // bot presses: hit notes within window by skill probability
        if (c.bot) {
          const prob = { passive: 0.02, poor: 0.45, average: 0.78, good: 0.93, expert: 0.99 }[c.bot.skill] || 0.7;
          for (let i = 0; i < c.notes.length; i++) {
            if (c.hit.has(i)) continue;
            const n = c.notes[i];
            if (Math.abs(ctx.time - n.t) < 0.05 && ctx.rng() < prob) { c.hit.add(i); c.judged++; c.good++; c.stepAnim = 1; }
            else if (ctx.time - n.t > win[2]) { c.hit.add(i); c.judged++; }
          }
        } else {
          // human: check presses via raw input actions on contestant input
          const inp = c.input;
          if (inp) {
            for (let li = 0; li < 4; li++) {
              let pressed = false;
              try { pressed = inp.pressed(lanes[li]); } catch (e) {}
              if (ctx.classMode) { const cl = ['left', 'down', 'up', 'right']; try { pressed = pressed || inp.pressed(cl[li]); } catch (e) {} }
              if (pressed) {
                c.stepAnim = 1;
                let bestI = -1, bestD = 9;
                for (let i = 0; i < c.notes.length; i++) { if (c.hit.has(i)) continue; const n = c.notes[i]; if (n.lane !== li) continue; const d = Math.abs(ctx.time - n.t); if (d < bestD) { bestD = d; bestI = i; } }
                if (bestI >= 0 && bestD <= win[2]) { c.hit.add(bestI); c.judged++; c.good++; c.combo = (c.combo || 0) + 1; G.sfx('tickS'); }
              }
            }
            // expire missed
            for (let i = 0; i < c.notes.length; i++) { if (!c.hit.has(i) && ctx.time - c.notes[i].t > win[2]) { c.hit.add(i); c.judged++; } }
          }
        }
        c.rig.wob = [c.bal.p.x * 0.5, c.bal.p.y * 0.5];
        const k = c.stepAnim > 0 ? Math.sin((1 - c.stepAnim) * Math.PI) : 0;
        c.rig.body = G.stepUpBody(k);
        if (c.stepAnim > 0) c.rig.mocap = null;
      }
      // beat click on sfx bus (music is quiet by design)
      const spb = 60 / ctx.tierDef.bpm;
      const beat = Math.floor(ctx.time / spb);
      if (beat !== ctx._lastBeat) { ctx._lastBeat = beat; if (ctx.time > 0) G.sfx('clickBeat', { vol: 0.5 }); }
    },
    result(ctx) {
      const c = ctx.contestants[0];
      const pct = c.judged ? c.good / c.judged : 0;
      return { pct: clamp(pct, 0, 1), detail: c.good + ' / ' + c.judged + ' steps on time' };
    },
    ghost(ctx) { const c = ctx.contestants[0]; return { l: [c.bal.p.x, c.bal.p.y], s: c.judged ? Math.round(100 * c.good / c.judged) : 0 }; }
  });
  G.activity({
    id: 'hoop', family: 'hoop', discipline: 'Cardio', name: 'Hoop Hips', view: 'brawler',
    classOk: true, hubOk: true, room: 'pier', song: 'jog',
    card: 'Circle your lean to spin the hoop. Stay in the calm band. Catch extra hoops as they arrive.',
    stars: [0.35, 0.65, 0.90],
    tiers: [
      { dur: 60, params: { k: 12, c: 6, s: 4, A: 2.4, nf: 1.1, R: 0.3 } },
      { dur: 60, params: { k: 12, c: 5.5, s: 6, A: 2.8, nf: 1.3, R: 0.28 }, faster: true }
    ],
    setup(ctx) { for (const c of ctx.contestants) { c.phase = 0; c.hoops = 1; c.score = 0; c.outT = 0; c.tossT = 8; c.toss = null; c.flipped = false; c.prevAng = null; c.angVel = 0; } },
    update(dt, ctx) {
      for (const c of ctx.contestants) {
        const it = c.getIntent(dt);
        c.bal.step(dt, it.lean);
        let lx = it.lean.x, ly = it.lean.y;
        if (c.bot) {
          // bots circle the lean
          const w = { passive: 0, poor: 5, average: 8.5, good: 9.5, expert: 9 }[c.bot.skill] || 8;
          const dir = ctx.time > 30 ? -1 : 1;
          const ph = ctx.time * w * dir;
          lx = Math.cos(ph) * 0.8; ly = Math.sin(ph) * 0.8;
          if (c.bot.skill === 'passive') { lx = 0; ly = 0; }
          c._botLean = { x: lx, y: ly };
        }
        const mag = Math.hypot(lx, ly);
        let av = 0;
        if (mag > 0.55) {
          const ang = Math.atan2(ly, lx);
          if (c.prevAng != null) {
            let d = ang - c.prevAng; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
            av = Math.abs(d) / Math.max(dt, 1e-4);
            if (it.source === 'keyboard' || c.bot) av *= 1; // keyboard quadrant circling already angular
          }
          c.prevAng = ang;
        } else c.prevAng = null;
        // mouse/stick circling: angular speed direct; keyboard circling reads lower, compensate
        if (!c.bot && it.source === 'keyboard') av *= 1.6;
        c.angVel = av;
        const dirNow = ctx.time > 30 ? -1 : 1;
        c.phase += av * dt * (c.phaseDir || 1);
        const lo = G.DEV.hoopLo, hi = G.DEV.hoopHi + (c.hoops - 1) * 0.4;
        const inBand = av >= lo && av <= hi && mag > 0.55;
        c._inBand = inBand; c._av = av;
        if (inBand) { c.score += dt * c.hoops; c.outT = 0; }
        else { c.outT += dt; if (c.outT > 1.5 && c.hoops > 1) { c.hoops--; c.outT = 0; G.sfx('stumbleS'); } }
        c.tossT -= dt;
        if (c.tossT <= 0 && !c.toss) { c.toss = { side: ctx.rng() < 0.5 ? -1 : 1, t: 1.2 }; c.tossT = 9 + ctx.rng() * 5; }
        if (c.toss) {
          c.toss.t -= dt;
          let caught = false;
          if (c.bot) caught = c.toss.t <= 0 && ctx.rng() < ({ passive: 0, poor: 0.3, average: 0.7, good: 0.95, expert: 1 }[c.bot.skill] || 0.7);
          else if (c.input) {
            try {
              if (c.toss.side < 0 && c.input.pressed('catchL')) caught = Math.abs(c.toss.t) < 0.45;
              if (c.toss.side > 0 && c.input.pressed('catchR')) caught = Math.abs(c.toss.t) < 0.45;
            } catch (e) {}
          }
          if (caught) { c.hoops = Math.min(6, c.hoops + 1); c.toss = null; G.sfx('clink'); }
          else if (c.toss.t < -0.4) c.toss = null;
        }
        if (ctx.time > 30 && !c.flipped) c.flipped = true;
        c.rig.wob = [c.bal.p.x * 0.5, c.bal.p.y * 0.5];
        c.rig.body = G.hulaBody(c.phase * 2);
        c.rig.mocap = null;
      }
    },
    result(ctx) {
      const c = ctx.contestants[0];
      const best = 60 * 2.2; // reachable score scale
      return { pct: clamp(c.score / best, 0, 1), detail: Math.round(c.score) + ' spins · ' + c.hoops + ' hoop' + (c.hoops === 1 ? '' : 's') };
    },
    ghost(ctx) { const c = ctx.contestants[0]; return { l: [c.bal.p.x, c.bal.p.y], s: Math.round(c.score) }; }
  });
})();
