/* 23-ai: the volleyball AI. Skill per touch = (the day's base × aiSkillMul + difficulty) × (0.8 + 0.05 × the touch's
 * stat) × chemistry (the player's partner: her affinity), on the match stream so the same seed plays the same match.
 * Reaction, formation by phase, attack targets that avoid defenders, shot or spike, serves aimed at the seams, blocks.
 * Spectacle mode (the attract) plays perfect rallies of a random length, then a guaranteed kill. */
const AI = G.VB.AI = {
  skill(M, p, stat) {
    if (M.spectacle) return 1;
    const diff = p.side === M.humanSide && M.humanSide !== null ? 0 : (G.DIFF[M.difficulty] || 0);   // difficulty lifts the opponents
    let s = (p.skillBase * G.T.aiSkillMul + diff) * (.8 + .05 * G.VB.stat(p, stat));
    if (p.partnerOfHuman) s *= (1 - G.T.chemistry / 2) + G.T.chemistry * (p.affinity || 50) / 100;
    return clamp(s, 0, 1);
  },
  /** a touch's quality: PERFECT .10 + .45 skill, GREAT .30, MISS max(.02, .16 (1 - skill)), else OK */
  /** incoming: the launch she is playing (a hard spike or jump serve is harder to dig: more misses, no PERFECT) */
  roll(M, p, stat, incoming, slack) {
    if (M.spectacle) return 'PERFECT';
    const s = AI.skill(M, p, stat), r = G.rng('match')(), hard = incoming && (incoming.kind === 'spike' || incoming.kind === 'jumpserve');
    const sp = hard ? Math.hypot(incoming.v[0], incoming.v[1], incoming.v[2]) / 330 : 0;
    let pP = .1 + .45 * s, pG = .3, pM = Math.max(.02, .16 * (1 - s));
    if (hard) { pM += .2 * sp + .22 * (1 - s); pP *= .35; }
    if (slack !== undefined && incoming) { const pr = clamp(1 - slack / .45, 0, 1); pM += .3 * pr; pP *= 1 - .6 * pr; }   // a ball she barely reached goes wrong more often
    return r < pP ? 'PERFECT' : r < pP + pG ? 'GREAT' : r < pP + pG + pM ? 'MISS' : 'OK';
  },
  reaction: (M, p) => M.spectacle ? 0 : G.T.aiReaction * (1.2 - AI.skill(M, p, 'SPD')),
  /** where an AI player stands when she isn't playing the ball */
  spot(M, p) {
    const C = G.C, s = p.side, dir = s === 0 ? -1 : 1, mate = M.players.find(q => q.side === s && q !== p), plan = M.plan;
    const deep = x => C.NET_X + dir * x;
    if (M.phase === 'serveSetup' || M.phase === 'toss' || M.phase === 'intro' || M.phase === 'coin') {
      if (M.server === p) return [p.x, p.y];
      if (M.rules.serveSide === s) return [deep(40), p.slot ? C.CY + 30 : C.CY - 30];   // the server's partner waits near the net
      return [deep(54), p.slot ? C.CY + 32 : C.CY - 32];   // receiving: split the court, 40% deep
    }
    if (plan && plan.side === s) {
      if (plan.kind === 'set' && plan.p !== p) return [deep(46), clamp(plan.P[1] + (p.y < plan.P[1] ? -26 : 26), C.Y0 + 14, C.Y1 - 14)];   // the hitter backs off for her approach
      if (plan.kind === 'attack' && plan.p !== p) return [deep(70), clamp(C.CY - (plan.P[1] - C.CY) * .5, C.Y0 + 20, C.Y1 - 20)];   // cover behind the hitter
      if (plan.kind === 'receive' && plan.p !== p) return [deep(44), clamp(plan.P[1] + (plan.P[1] < C.CY ? 40 : -40), C.Y0 + 14, C.Y1 - 14)];   // ready to set
    }
    // defending: if they attack near the net, one blocks in line with the hitter, the other digs deep cross-court
    if (plan && plan.side === 1 - s && plan.kind === 'attack') {
      const atkY = plan.P[1], near = Math.abs(plan.P[0] - C.NET_X) < 34;
      if (near && M.blockerFor(s) === p) return [C.NET_X + dir * 7, clamp(atkY, C.Y0, C.Y1)];
      return [deep(98), clamp(C.CY + (C.CY - atkY) * .6, C.Y0 + 10, C.Y1 - 10)];
    }
    if (plan && plan.side === 1 - s && (plan.kind === 'set' || plan.kind === 'receive')) return [deep(70), p.slot ? C.CY + 30 : C.CY - 30];
    return [deep(64), p.slot ? C.CY + 34 : C.CY - 34];   // a free ball: both back
  },
  /** who on side s goes up to block (the one nearer the net), or null when no one should */
  blocker(M, s) {
    const two = M.players.filter(q => q.side === s && q.ctl.kind === 'ai' && !(M.plan && M.plan.p === q));
    if (!two.length) return null;
    return two.sort((a, b) => Math.abs(a.x - G.C.NET_X) - Math.abs(b.x - G.C.NET_X))[0];
  },
  /** the attack's target: of the 9 zones, the one farthest from the defenders' spots minus their reach, minus 8 (1 - skill)
   *  for zones near a line; returns [x, y] */
  attackTarget(M, p) {
    const s = p.side, defs = M.players.filter(q => q.side !== s), sk = AI.skill(M, p, 'POW');
    let best = null, bs = -1e9;
    for (let d = 0; d < 3; d++) for (let l = -1; l <= 1; l++) {
      const z = G.VB.zone(s, d, l);
      let near = 1e9; for (const q of defs) { const tx = q.target ? q.target[0] : q.x, ty = q.target ? q.target[1] : q.y; near = Math.min(near, Math.hypot(z[0] - tx, z[1] - ty) - G.VB.reachR(q)); }
      const edge = (d === 2 || l !== 0) ? 8 * (1 - sk) : 0, score = near - edge + G.rand('match', -6, 6);
      if (score > bs) { bs = score; best = z; }
    }
    return best;
  },
  /** a cut shot when a blocker is up and in line, plus 20% for variety */
  wantsShot(M, p) {
    if (M.spectacle) return false;
    const foe = M.players.find(q => q.side !== p.side && (q.block || Math.abs(q.x - G.C.NET_X) < 14) && Math.abs(q.y - p.y) < 16);
    return foe ? G.chance('match', .4) : G.chance('match', .1);
  },
  /** a cut shot goes where the defender who isn't at the net can't get to: short behind the block, or a deep corner */
  shotTarget(M, p) {
    const s = p.side, back = M.players.filter(q => q.side !== s && Math.abs(q.x - G.C.NET_X) > 20), opts = [G.VB.zone(s, 0, -1), G.VB.zone(s, 0, 1), G.VB.zone(s, 2, -1), G.VB.zone(s, 2, 1)];
    let best = opts[0], bs = -1;
    for (const z of opts) { const d = back.length ? Math.min(...back.map(q => Math.hypot(q.x - z[0], q.y - z[1]))) : 50; const sc = d + G.rand('match', -10, 10); if (sc > bs) { bs = sc; best = z; } }
    return best;
  },
  serveKind(M, p) { if (M.spectacle) return G.chance('match', .5) ? 'jump' : 'float'; return G.chance('match', G.VB.stat(p, 'POW') >= 8 ? .5 : .3) ? 'jump' : 'float'; },
  serveTarget(M, p) {
    const C = G.C, s = p.side, rcv = M.players.filter(q => q.side !== s), seamY = rcv.length === 2 ? (rcv[0].y + rcv[1].y) / 2 : C.CY;
    const opts = [G.VB.zone(s, 2, -1), G.VB.zone(s, 2, 1), [G.VB.zone(s, 1, 0)[0], seamY], [G.VB.zone(s, 2, 0)[0], seamY]];
    return G.pick('match', opts);
  }
};
