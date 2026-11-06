// Willy Fit — Quiet Candle.
window.G = window.G || {};
(function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  G.activity({
    id: 'candle', family: 'candle', discipline: 'Stillness', name: 'Quiet Candle', view: 'brawler',
    classOk: true, hubOk: true, room: 'deck', song: 'yoga',
    card: 'Sit still. Keep the flame alive. Move gently: jerks hurt the flame. Thoughts will visit.',
    stars: [0.35, 0.65, 0.90],
    tiers: [
      { dur: 60, params: { k: 10, c: 5, s: 11, A: 1.4, nf: 0.8, R: 0.20 } },
      { dur: 60, params: { k: 10, c: 4.5, s: 13, A: 1.8, nf: 1.0, R: 0.19 }, noisy: true }
    ],
    setup(ctx) {
      for (const c of ctx.contestants) {
        c.flame = 1; c.flameSum = 0; c.relit = false; c.out = false; c.thoughtT = 4; c.thought = null; c.thoughtPush = 0; c.idleT = 0; c.saidIdle = false;
      }
    },
    update(dt, ctx) {
      for (const c of ctx.contestants) {
        if (c.out) continue;
        const it = c.getIntent(dt);
        c.thoughtT -= dt;
        if (c.thoughtT <= 0 && !c.thought) {
          const txt = G.LINES.thoughts[Math.floor(ctx.rng() * G.LINES.thoughts.length)];
          const side = ctx.rng() < 0.5 ? -1 : 1;
          c.thought = { txt: txt, side: side, t: 2.5 };
          c.thoughtT = 5 + ctx.rng() * 4;
          if (ctx.tierDef.noisy && ctx.rng() < 0.4) c.thought.txt = ctx.rng() < 0.5 ? 'BZZZT. (the blender)' : 'HONK. (a goose)';
        }
        if (c.thought) {
          c.bal.fx = c.thought.side * 4;
          c.thought.t -= dt; if (c.thought.t <= 0) c.thought = null;
        }
        if (ctx.tierDef.noisy) c.bal.fx += Math.sin(ctx.time * 2.1) * 0.06;
        const before = { x: c.bal.p.x, y: c.bal.p.y };
        c.bal.step(dt, it.lean);
        const sp = c.bal.speed();
        const inRing = Math.hypot(c.bal.p.x, c.bal.p.y) <= c.bal.ringR();
        if (sp > 0.55) c.flame -= 0.4 * dt * Math.min(2, sp);
        else if (inRing) c.flame += 0.12 * dt;
        else c.flame -= 0.06 * dt;
        c.flame = clamp(c.flame, 0, 1);
        c.flameSum += c.flame * dt;
        // untouched detection: no lean input at all
        if (Math.abs(it.lean.x) < 0.01 && Math.abs(it.lean.y) < 0.01) c.idleT += dt; else c.idleT = 0;
        if (c.idleT > 20 && !c.saidIdle) { c.saidIdle = true; if (ctx.say) ctx.say('Tare', G.LINES.candleIdle); }
        if (c.flame <= 0) {
          if (!c.relit) { c.relit = true; c.flame = 0.6; if (ctx.say) ctx.say('Tare', 'One relight. The candle believes in second chances.'); }
          else { c.out = true; c.flame = 0; }
        }
        c.rig.wob = [c.bal.p.x, c.bal.p.y];
        G.setClipPose(c.rig, 'Meditate', 1 + Math.sin(ctx.time * 0.4) * 0.3, 1.57);
        c._flame = c.flame;
      }
      // duel mode (Grand Stillness): Gertrude opponent handled by scene via ctx.duel
      if (ctx.duel) {
        const d = ctx.duel;
        d.t += dt;
        if (d.t > 75 && ctx.contestants[0].flame > 0.5) d.gerFlame = Math.max(0.15, d.gerFlame - dt * 0.012);
        else if (d.t > 40) d.gerFlame = clamp(d.gerFlame + Math.sin(d.t * 0.7) * 0.0006, 0.7, 1);
        if (ctx.time > 88 && ctx.contestants[0].flame > d.gerFlame) ctx.duelWin = true;
      }
    },
    result(ctx) {
      const c = ctx.contestants[0];
      const meanFlame = ctx.time > 0 ? c.flameSum / Math.max(1, ctx.time) : 0;
      let pct = clamp(0.6 * c.bal.steadiness() + 0.4 * clamp(meanFlame, 0, 1) - (c.relit ? 0.0 : 0), 0, 1);
      if (c.relit && !c.out) pct = Math.max(0, pct); // relight cost folded via lost flame time; explicit -15% if ended early:
      if (c.out) pct *= 0.85;
      return { pct: pct, detail: 'Flame ' + Math.round(meanFlame * 100) + '% · steady ' + Math.round(c.bal.steadiness() * 100) + '%' + (c.out ? ' · candle out' : '') };
    },
    ghost(ctx) { const c = ctx.contestants[0]; return { l: [c.bal.p.x, c.bal.p.y], s: Math.round(c.flame * 100) }; }
  });
})();
