/* 23-ai: the volleyball AI. Skill per touch = (the day's base × aiSkillMul + difficulty) × (0.8 + 0.05 × the stat it
 * uses) × chemistry (the player's partner: by affinity), clamped 0..1. Each touch rolls PERFECT / GREAT / MISS / OK on the
 * match stream. Formation by phase; attack zones chosen far from the defenders; serves at deep corners or the seam;
 * blocks when the set is near the net and a skill roll passes. Spectacle mode (the attract) plays perfect rallies of a
 * random 3-9 touches and then kills it into the biggest gap. */
G.AI = {
  skill(p, stat) {
    const M = p.M, d = (G.DIFF[M.difficulty] || G.DIFF.Normal).ai;
    if (M.spectacle) return 1;
    const base = p.base * G.T.aiSkillMul + (p.side === M.humanSide || M.versus ? 0 : d);
    let chem = 1; if (p.side === M.humanSide && M.partnerAff !== null) chem = (1 - G.T.chemistry / 2) + G.T.chemistry * M.partnerAff / 100;
    return clamp(base * (.8 + .05 * p.stats0[stat]) * chem, 0, 1);
  },
  /** the quality of an AI touch */
  roll(p, stat) {
    const s = this.skill(p, stat), r = G.rng('match');
    if (p.M.spectacle) return 'PERFECT';
    const pP = .1 + .45 * s, pG = .3, pM = Math.max(.02, .32 * (1 - s) * (1 - s));
    return r < pP ? 'PERFECT' : r < pP + pG ? 'GREAT' : r < pP + pG + pM ? 'MISS' : 'OK';
  },
  /** where each player stands when she isn't going for the ball */
  formation(M) {
    const C = G.COURT, ph = M.phase, L = M.L;
    for (const p of M.players) {
      const d = p.dir, mate = M.players.find(q => q.side === p.side && q !== p), left = p.slot === 0 ? -1 : 1;
      let hx, hy;
      const ownHalfX = f => C.NET_X - d * f;
      if (ph === 'serveSetup' || ph === 'toss' || ph === 'intro' || ph === 'coin') {
        if (M.server === p) { hx = p.side ? C.X1 + 20 : C.X0 - 20; hy = p.serveY === undefined ? C.CY + left * 20 : p.serveY; }
        else if (M.serveSide === p.side) { hx = ownHalfX(40); hy = C.CY - left * 30; }
        else { hx = ownHalfX(128 * .62); hy = C.CY + left * 32; }
      } else {
        const ballSide = L ? G.Ball.sideOf(L.land[0]) : p.side, ours = ballSide === p.side, touches = M.touches[p.side];
        if (ours && L && L.side === p.side && touches === 1 && mate && mate.plan) { hx = ownHalfX(48); hy = clamp(mate.plan.P[1] + left * 30, C.Y0 + 10, C.Y1 - 10); }   // the hitter backs off for her approach
        else if (!ours && M.attackPlan && M.attackPlan.side !== p.side && p.blockFor) { const h = M.attackPlan.p; hx = ownHalfX(8); hy = clamp(h.y, C.Y0 + 6, C.Y1 - 6); }
        else if (!ours) { const ap = M.attackPlan, hy0 = ap ? ap.p.y : C.CY; hx = ownHalfX(128 * .6); hy = clamp(C.CY + (C.CY - hy0) * .4 + left * 36, C.Y0 + 8, C.Y1 - 8); }
        else { hx = ownHalfX(128 * .55); hy = C.CY + left * 32; }
      }
      p.home = [hx, hy];
    }
  },
  /** where an attacker aims: the zone farthest from the defenders (their predicted spots), minus a little near the lines */
  attackTarget(p, kind) {
    const M = p.M, foes = M.players.filter(q => q.side !== p.side), s = this.skill(p, 'POW'); let best = null, bv = -1e9;
    for (let dep = 0; dep < 3; dep++) for (let lat = -1; lat <= 1; lat++) {
      if (kind === 'spike' && dep === 0) continue;
      const z = G.zonePoint(p.side, dep, lat); let near = 1e9;
      for (const f of foes) { const fx = f.home ? (f.x + f.home[0]) / 2 : f.x, fy = f.home ? (f.y + f.home[1]) / 2 : f.y; near = Math.min(near, Math.hypot(z[0] - fx, z[1] - fy) - f.reach); }
      const v = near - (lat ? 8 * (1 - s) : 0) - (dep === 2 ? 4 * (1 - s) : 0) + G.rng('match') * 6;
      if (v > bv) { bv = v; best = z; }
    }
    return best;
  },
  serveTarget(p) {
    const r = G.rng('match'), M = p.M;
    if (r < .4) return G.zonePoint(p.side, 2, -1); if (r < .8) return G.zonePoint(p.side, 2, 1);
    const recv = M.players.filter(q => q.side !== p.side); const y = recv.length === 2 ? (recv[0].y + recv[1].y) / 2 : G.COURT.CY;
    return [G.zonePoint(p.side, 1, 0)[0], y];
  },
  serveKind(p) { const j = p.stats0.POW >= 8 ? .5 : .3; return G.rng('match') < j ? 'jump' : 'float'; },
  /** should the AI choose a cut shot instead of a spike? (a blocker up and in line, or 20% for variety) */
  wantsShot(p) { const M = p.M, b = M.players.find(q => q.side !== p.side && q.blockFor); return (b && Math.abs(b.y - p.y) < 16) || G.rng('match') < .2; },
  /** pick one defender to block when the set lands near the net */
  pickBlocker(M, attacker) {
    for (const q of M.players) q.blockFor = false;
    const def = M.players.filter(q => q.side !== attacker.side && !q.isHuman);
    if (!def.length) return null;
    const near = def.sort((a, b) => Math.abs(a.x - G.COURT.NET_X) - Math.abs(b.x - G.COURT.NET_X))[0];
    const s = this.skill(near, 'JMP');
    if (M.spectacle || G.rng('match') < .35 + .45 * s) { near.blockFor = true; return near; }
    return null;
  }
};
