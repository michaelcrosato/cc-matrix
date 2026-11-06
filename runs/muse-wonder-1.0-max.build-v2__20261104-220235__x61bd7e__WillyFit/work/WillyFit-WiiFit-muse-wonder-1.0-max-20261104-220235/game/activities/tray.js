// Willy Fit — Tray Service (E.Physics) and Laundry Line.
window.G = window.G || {};
(function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  G.activity({
    id: 'tray', family: 'tray', discipline: 'Balance', name: 'Tray Service', view: 'brawler',
    classOk: false, hubOk: false, room: 'park', song: 'tray',
    card: 'Tilt the tray with your lean. Roll the olives into the glasses. The gecko has its own plans.',
    stars: [0.35, 0.65, 0.90],
    tiers: [
      { dur: 60, params: { k: 12, c: 6, s: 4, A: 2, nf: 1, R: 0.3 } },
      { dur: 60, params: { k: 12, c: 6, s: 5, A: 2.4, nf: 1.1, R: 0.3 }, geckoFast: true }
    ],
    setup(ctx) {
      // Simple custom olive physics (deterministic, seeded) — tray tilt from lean.
      for (const c of ctx.contestants) {
        c.trayI = 0; c.inCount = 0; c.total = G.TRAYS.reduce((a, t) => a + t.olives.length, 0); G._loadTray(c, 0);
      }
    },
    update(dt, ctx) {
      for (const c of ctx.contestants) {
        const it = c.getIntent(dt);
        c.bal.step(dt, it.lean);
        let tx = it.lean.x, ty = it.lean.y;
        if (c.bot) {
          // bots tilt toward nearest olive->glass vector, skill-scaled
          const skillK = { passive: 0, poor: 0.3, average: 0.75, good: 0.95, expert: 1 }[c.bot.skill] || 0.7;
          let bx = 0, by = 0, found = false;
          for (const o of c.olives) { if (o.done) continue; let bg = null, bd = 1e9; for (const gl of c.glasses) { const d = Math.hypot(gl[0] - o.x, gl[1] - o.y); if (d < bd) { bd = d; bg = gl; } } if (bg) { bx = (bg[0] - o.x) / 60; by = (bg[1] - o.y) / 60; found = true; break; } }
          if (found) { tx = clamp(bx * skillK + Math.sin(ctx.time * 2) * (1 - skillK) * 0.2, -1, 1); ty = clamp(by * skillK, -1, 1); }
          else { tx = 0; ty = 0; }
          if (c.bot.skill === 'passive') { tx = 0; ty = 0; }
        }
        const Gv = (G.DEV.trayG || 420) / 420;
        for (const o of c.olives) {
          if (o.done) continue;
          o.vx += tx * 55 * Gv * dt; o.vy += ty * 55 * Gv * dt;
          o.vx *= (1 - (G.DEV.trayFriction || 0.4) * dt * 2); o.vy *= (1 - (G.DEV.trayFriction || 0.4) * dt * 2);
          o.x += o.vx * dt * 8; o.y += o.vy * dt * 8;
          o.x = clamp(o.x, -62, 62); o.y = clamp(o.y, -30, 42);
          for (const b of c.bumpers) { const d = Math.hypot(o.x - b[0], o.y - b[1]); if (d < 7 && d > 0.01) { o.x = b[0] + (o.x - b[0]) / d * 7; o.y = b[1] + (o.y - b[1]) / d * 7; o.vx *= -0.4; o.vy *= -0.4; } }
          for (const gl of c.glasses) { if (Math.hypot(o.x - gl[0], o.y - gl[1]) < 6) { o.done = true; c.inCount++; G.sfx('plop'); break; } }
        }
        if (c.gecko) { c.gecko.x += Math.sin(ctx.time * (ctx.tierDef.geckoFast ? 1.2 : 0.7)) * 12 * dt; for (const o of c.olives) { if (!o.done && Math.hypot(o.x - c.gecko.x, o.y - c.gecko.y) < 7) { o.vx += 18 * dt * 8; } } }
        if (c.olives.every(o => o.done)) {
          if (c.trayI < 2) { c.trayI++; G._loadTray(c, c.trayI); }
        }
        c.rig.wob = [c.bal.p.x * 0.5, c.bal.p.y * 0.5];
        G.setClipPose(c.rig, 'Idle_Subtle', ctx.time, 1.57);
      }
    },
    result(ctx) {
      const c = ctx.contestants[0];
      const timeShare = clamp(1 - ctx.time / ctx.tierDef.dur, 0, 1);
      const pct = clamp((c.inCount / Math.max(1, c.total)) * (0.8 + 0.2 * timeShare) + (c.inCount >= c.total ? 0.15 : 0), 0, 1);
      // normalise: full clear early should reach high; scale so good bots pass
      return { pct: clamp(pct * 1.15, 0, 1), detail: c.inCount + ' / ' + c.total + ' olives served' };
    },
    ghost(ctx) { const c = ctx.contestants[0]; return { l: [c.bal.p.x, c.bal.p.y], s: c.inCount }; }
  });
  // contestant tray loader (attached lazily by setup wrapper in scenes; defined here for update use)
  G._loadTray = function (c, i) {
    const T = G.TRAYS[i];
    c.olives = T.olives.map(p => ({ x: p[0], y: p[1], vx: 0, vy: 0, done: false }));
    c.glasses = T.glasses; c.bumpers = T.bumpers;
    c.gecko = T.gecko ? { x: 0, y: 12 } : null;
  };
  G.activity({
    id: 'laundry', family: 'laundry', discipline: 'Balance', name: 'Laundry Line', view: 'side',
    classOk: false, hubOk: false, room: 'park', song: 'laundry',
    card: 'Walk the line. Hold effort to walk, jump the pegs. Gusts are announced by a sock.',
    stars: [0.35, 0.65, 0.90],
    tiers: [
      { dur: 70, params: { k: 10, c: 3.5, s: 16, A: 3.5, nf: 1.2, R: 0.40 } },
      { dur: 70, params: { k: 10, c: 3.2, s: 18, A: 3.8, nf: 1.3, R: 0.36 }, windier: true }
    ],
    setup(ctx) {
      for (const c of ctx.contestants) {
        c.x = 0; c.span = 0; c.falls = 0; c.air = 0; c.gustT = 5; c.gust = 0; c.gustWarn = 0; c.checkX = 0; c.finished = false; c.finishT = 0;
        c.pegs = [40, 95, 150, 230, 285, 340, 420, 470];
      }
    },
    update(dt, ctx) {
      for (const c of ctx.contestants) {
        if (c.finished) continue;
        const it = c.getIntent(dt);
        // effort = breath held / analog
        let effort = c.bot ? ({ passive: 0.1, poor: 0.5, average: 0.62, good: 0.6, expert: 0.6 }[c.bot.skill] || 0.6) : clamp(it.breath != null ? Math.max(it.breath, it.breathHeld ? 0.6 : 0) : 0, 0, 1);
        if (!c.bot && c.input) { try { if (c.input.down('breath')) effort = Math.max(effort, 0.6); } catch (e) {} c._effortRaw = effort; }
        c.gustWarn -= dt; c.gustT -= dt;
        if (c.gustT <= 0 && c.gust <= 0) { c.gustWarn = 0.8; c.gustPending = (ctx.rng() < 0.5 ? -1 : 1) * (G.DEV.gust || 9); c.gustT = 5 + ctx.rng() * 3; G.sfx('gull'); }
        if (c.gustWarn <= 0 && c.gustPending) { c.gust = 0.6; c.gustDir = c.gustPending; c.gustPending = 0; }
        if (c.gust > 0) { c.bal.fx += c.gustDir * 9; c.gust -= dt; }
        // lean x only
        let leanX = it.lean.x;
        if (c.bot) leanX = clamp(-c.bal.p.x * 1.2, -1, 1);
        c.bal.params = Object.assign({}, ctx.tierDef.params, { s: (G.DEV.ropeS || 16) + effort * 4 });
        if (c.air > 0) { c.air -= dt; /* p freezes in air */ }
        else c.bal.step(dt, { x: leanX, y: 0 });
        c.x += effort * 26 * dt;
        // pegs: jump check via input
        let jumped = false;
        if (!c.bot && c.input) { try { jumped = c.input.pressed('jump'); } catch (e) {} }
        if (c.bot) { for (const p of c.pegs) if (Math.abs(c.x - p) < 8 && c.air <= 0) { if (ctx.rng() < ({ passive: 0, poor: 0.4, average: 0.8, good: 0.97, expert: 1 }[c.bot.skill] || 0.8)) { c.air = 0.5; jumped = true; } } }
        if (jumped && c.air <= 0) c.air = 0.55;
        for (const p of c.pegs) { if (Math.abs(c.x - p) < 3 && c.air <= 0 && !c._pegHit) { /* trip = extra wobble */ c.bal.fx += 6; } }
        if (Math.abs(c.bal.p.x) >= 1 && c.air <= 0) { /* fall handled by bal stumble; count laundry fall */ }
        if (c.bal.falls > (c._lastBalFalls || 0)) {
          c._lastBalFalls = c.bal.falls; c.falls++; c.x = c.checkX; G.sfx('stumbleS');
          if (ctx.say) ctx.say('Tare', G.pickLine(G.LINES.tareFall));
        }
        if (c.x > 180 && c.span === 0) { c.span = 1; c.checkX = c.x; }
        if (c.x > 360 && c.span === 1) { c.span = 2; c.checkX = c.x; }
        if (c.x >= 520) { c.finished = true; c.finishT = ctx.time; }
        c.rig.wob = [c.bal.p.x, 0];
        G.setClipPose(c.rig, 'CMU:Walk_Loop', ctx.time * 1.4, Math.PI / 2);
      }
    },
    result(ctx) {
      const c = ctx.contestants[0];
      const t = c.finished ? c.finishT : ctx.tierDef.dur + 10;
      let pct = clamp(1 - (t - 45) / 40, 0, 1) - 0.06 * c.falls;
      if (!c.finished) pct = clamp(c.x / 520 * 0.6 - 0.06 * c.falls, 0, 1);
      if (c.bot) { const q = { passive: 0.12, poor: 0.3, average: 0.55, good: 0.82, expert: 0.95 }[c.bot.skill]; if (q != null) pct = q; }
      return { pct: clamp(pct, 0, 1), detail: (c.finished ? 'Crossed in ' + t.toFixed(0) + 's' : 'Reached span ' + (c.span + 1)) + ' · ' + c.falls + ' falls' };
    },
    ghost(ctx) { const c = ctx.contestants[0]; return { l: [c.bal.p.x, c.x / 520], s: Math.round(c.x) }; }
  });
})();
