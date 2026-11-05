// SNIPEOUT HD: craft against craft. Two spheres each (r 22 u at +-26 u along the nose), pairs in index order, pushed
// apart by mass, an impulse with restitution .3, a little damage and a bump event. Ghosts never collide.
(() => {
const SN = globalThis.SN, V = SN.v;
const A = [[0, 0, 0], [0, 0, 0]], B = [[0, 0, 0], [0, 0, 0]], n = [0, 0, 0];
const solid = s => !s.ghost && !s.elim && !s.rescue && !s.hidden && !(SN.cheats.ghostAI && s.control === 'ai');
SN.collide = (ships, race) => {
  for (let i = 0; i < ships.length; i++) {
    const a = ships[i]; if (!solid(a)) continue;
    for (let j = i + 1; j < ships.length; j++) {
      const b = ships[j]; if (!solid(b)) continue;
      if (Math.abs(a.P[0] - b.P[0]) > 140 || Math.abs(a.P[1] - b.P[1]) > 140 || Math.abs(a.P[2] - b.P[2]) > 140) continue;
      V.addS(A[0], a.P, a.F, 26); V.addS(A[1], a.P, a.F, -26); V.addS(B[0], b.P, b.F, 26); V.addS(B[1], b.P, b.F, -26);
      let best = null, bd = 44;
      for (const p of A) for (const q of B) { const d = V.dist(p, q); if (d < bd) { bd = d; best = [p, q]; } }
      if (!best) continue;
      V.sub(n, best[1], best[0]); const d = V.len(n) || 1; V.scale(n, n, 1 / d);
      const ma = a.st.mass, mb = b.st.mass, over = 44 - d;
      V.addS(a.P, a.P, n, -over * mb / (ma + mb)); V.addS(b.P, b.P, n, over * ma / (ma + mb));
      const vn = (b.V[0] - a.V[0]) * n[0] + (b.V[1] - a.V[1]) * n[1] + (b.V[2] - a.V[2]) * n[2];
      if (vn < 0) {
        const J = -(1.3) * vn / (1 / ma + 1 / mb);
        V.addS(a.V, a.V, n, -J / ma); V.addS(b.V, b.V, n, J / mb);
        // damage once per contact (a pair rubbing along each other is one bump, not one a step)
        const key = a.idx * 64 + b.idx, cd = race._bumpCD || (race._bumpCD = {}), fresh = !(cd[key] > race.clock - .5);
        if (fresh && -vn > 60) { const dmg = .004 * -vn; SN.Ship.damage(a, dmg, 'bump', b, race); SN.Ship.damage(b, dmg, 'bump', a, race); }
        cd[key] = race.clock;
        if (fresh && -vn > 120) race.events.push({ t: 'bump', ship: a, other: b, impact: -vn, x: (best[0][0] + best[1][0]) / 2, y: (best[0][1] + best[1][1]) / 2, z: (best[0][2] + best[1][2]) / 2 });
      }
    }
  }
};
})();
