// Willy Fit — hold family: Stork Stand, Sun Flow.
window.G = window.G || {};
(function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function ringSpots(rng) {
    const s = [[0, 0], [0.3, 0.1], [-0.3, 0], [0, 0.3], [0.2, -0.25], [-0.25, -0.2]];
    for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = s[i]; s[i] = s[j]; s[j] = t; }
    return s;
  }
  G.activity({
    id: 'stork', family: 'hold', discipline: 'Stillness', name: 'Stork Stand', view: 'brawler',
    classOk: true, hubOk: true, room: 'deck',
    song: 'studio',
    card: 'Stand on one leg. Keep the dot in the ring. You cannot fly. The gull can.',
    stars: [0.35, 0.65, 0.90],
    tiers: [
      { dur: 45, params: { k: 12, c: 5, s: 13, A: 3, nf: 1.5, R: 0.24 }, pushEvery: 7, pushSpeed: 0.6 },
      { dur: 45, params: { k: 11.5, c: 5, s: 14, A: 3.2, nf: 1.6, R: 0.24 }, pushEvery: 6, pushSpeed: 0.7, eyesClosed: true }
    ],
    setup(ctx) {
      const spots = ringSpots(ctx.rng);
      for (const c of ctx.contestants) {
        c.spots = spots; c.spotI = 0; c.spotT = 0; c.gullT = 14 + ctx.rng() * 6; c.gull = 0; c.gullSide = 1; c.pushT = 3;
        c.bal.ring.x = 0; c.bal.ring.y = 0;
      }
    },
    update(dt, ctx) {
      for (const c of ctx.contestants) {
        const T = ctx.tierDef;
        c.spotT += dt;
        if (c.spotT > 12) { c.spotT = 0; c.spotI = (c.spotI + 1) % c.spots.length; c.bal.ring.x = c.spots[c.spotI][0]; c.bal.ring.y = c.spots[c.spotI][1]; }
        c.pushT -= dt;
        if (c.pushT <= 0) { c.pushT = T.pushEvery * (0.8 + ctx.rng() * 0.4); const a = ctx.rng() * 6.28; c.bal.fx += Math.cos(a) * T.pushSpeed * 8; c.bal.fy += Math.sin(a) * T.pushSpeed * 8; }
        c.gullT -= dt;
        if (c.gullT <= 0 && c.gull <= 0) { c.gull = 4; c.gullSide = ctx.rng() < 0.5 ? -1 : 1; G.sfx('gull'); }
        if (c.gull > 0) { c.bal.fx += c.gullSide * 2.5; c.gull -= dt; if (c.gull <= 0) { c.bal.fx -= c.gullSide * 6; c.gullT = 14 + ctx.rng() * 8; } }
        const it = c.getIntent(dt);
        c.bal.step(dt, it.lean);
        c.rig.wob = [c.bal.p.x, c.bal.p.y];
        G.setClipPose(c.rig, '111_39_part1', 4.5 + Math.sin(ctx.time * 0.5) * 0.4, 1.57);
        if (c.bal.stumbleT > 0) G.setClipPose(c.rig, 'Dizzy', ctx.time % 1, 1.57);
      }
    },
    result(ctx) {
      const c = ctx.contestants[0];
      const pct = clamp(c.bal.steadiness() - 0.05 * c.bal.falls, 0, 1);
      return { pct: pct, detail: Math.round(c.bal.steadiness() * 100) + '% steady · ' + c.bal.falls + ' fall' + (c.bal.falls === 1 ? '' : 's') };
    },
    ghost(ctx) { const c = ctx.contestants[0]; return { l: [c.bal.p.x, c.bal.p.y], s: Math.round(c.bal.steadiness() * 100) }; }
  });
  G.activity({
    id: 'sunflow', family: 'hold', discipline: 'Stillness', name: 'Sun Flow', view: 'brawler',
    classOk: false, hubOk: false, room: 'deck', song: 'yoga',
    card: 'Follow five poses. Breathe in as the ring grows, out as it shrinks. You can breathe. Birch cannot.',
    stars: [0.5, 0.75, 0.92],
    tiers: [
      { dur: 80, params: { k: 12, c: 6, s: 6, A: 3.2, nf: 1.3, R: 0.28 } },
      { dur: 80, params: { k: 11, c: 5.5, s: 8, A: 3.6, nf: 1.5, R: 0.25 } }
    ],
    setup(ctx) { for (const c of ctx.contestants) { c.breathScore = 0; c.breathN = 0; c.poseI = 0; } },
    update(dt, ctx) {
      for (const c of ctx.contestants) {
        const it = c.getIntent(dt);
        c.bal.ring.x = 0; c.bal.ring.y = 0;
        c.bal.step(dt, it.lean);
        const cyc = (ctx.time % 16) / 16; // 8s in + 8s out per breath pair, pose every 16s
        c.poseI = Math.min(4, Math.floor(ctx.time / 16));
        const guide = (ctx.time % 8) < 4 ? (ctx.time % 8) / 4 : 1 - ((ctx.time % 8) - 4) / 4;
        const lvl = it.breath != null ? it.breath : (it.breathHeld ? 1 : 0);
        // bots: breathe along with a skill-dependent delay (passive does not breathe along)
        let bl = lvl;
        if (c.bot) {
          if (c.bot.skill === 'passive') bl = 0;
          else {
            const delay = { poor: 1.6, average: 0.6, good: 0.25, expert: 0.1 }[c.bot.skill] || 0.6;
            const gt = Math.max(0, ctx.time - delay), ph = (gt % 8);
            bl = ph < 4 ? ph / 4 : 1 - (ph - 4) / 4;
          }
        }
        c._breathLvl = c.bot ? bl : lvl; c._guide = guide;
        if (Math.abs((c._breathLvl) - guide) <= 0.25) c.breathScore += dt;
        c.breathN += dt;
        c.rig.wob = [c.bal.p.x, c.bal.p.y];
        const pose = G.POSES[c.poseI];
        const tgt = G.holdPose(c.rig, pose, ctx.time);
        c._tgt = tgt;
        if (ctx.instructorRig) G.holdPose(ctx.instructorRig, pose, ctx.time);
      }
    },
    result(ctx) {
      const c = ctx.contestants[0];
      const bm = c.breathN ? c.breathScore / c.breathN : 0;
      const pct = clamp(0.6 * c.bal.steadiness() + 0.4 * bm, 0, 1);
      return { pct: pct, detail: Math.round(c.bal.steadiness() * 100) + '% steady · breath ' + Math.round(bm * 100) + '%' };
    },
    ghost(ctx) { const c = ctx.contestants[0]; return { l: [c.bal.p.x, c.bal.p.y], s: Math.round(c.bal.steadiness() * 100) }; }
  });
})();
