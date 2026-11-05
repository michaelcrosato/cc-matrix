/* 23-ai: the volleyball AI. Skill per touch from the day's base, difficulty, the stat the touch uses and chemistry; a
 * quality roll per touch on the match stream; formations by phase; attack zones away from defenders. */
G.Match.prototype.aiSkill = function (p, stat) {
  const base = p.base || .4, diff = (G.DIFFICULTY[this.o.difficulty] || { skill: 0 }).skill;
  const st = p.stat(stat || 'TEC');
  let chem = 1;
  if (p.chem !== undefined && p.chem !== 1) chem = p.chem;
  const s = (base * G.T.aiSkillMul + diff) * (.8 + .05 * st) * chem;
  return G.clamp(s, 0, 1);
};
/* a quality roll for an AI touch: PERFECT .10+.45s, GREAT .30, MISS max(.02, .16(1-s)), OK the rest */
G.Match.prototype.aiRoll = function (s) {
  const u = this.rng();
  const pPerfect = .10 + .45 * s, pMiss = Math.max(.02, .16 * (1 - s));
  if (u < pPerfect) return 'perfect';
  if (u < pPerfect + .30) return 'great';
  if (u > 1 - pMiss) return 'miss';
  return 'ok';
};
G.Match.prototype.aiMove = function (p, dt) {
  const pend = this.pendingFor(p);
  const sp = this.speedOf(p);
  if (pend && !p.dive) {
    const reactT = G.T.aiReaction * (1.2 - (p.skill || .5));
    if (this.t - (pend.created || 0) >= reactT) G.stepToward(p, pend.P[0], pend.P[1], sp, dt);
    return;
  }
  const h = this.home(p);
  G.stepToward(p, h[0], h[1], sp * .8, dt);
};
/* home positions: receiving deep, defending near the net, serving at the baseline */
G.Match.prototype.home = function (p) {
  const C = G.C, team = this.players.filter(q => q.side === p.side);
  const i = team.indexOf(p);
  const inCourt = this.lastTouch && this.lastTouch.side !== p.side;   // the ball is on the other side
  const baseX = p.side === 0 ? C.NET_X - 52 : C.NET_X + 52;
  const yy = i === 0 ? C.CY - 34 : C.CY + 34;
  if (this.phase === 'serve' && this.server === p) return [p.side === 0 ? C.X0 - 22 : C.X1 + 22, C.CY];
  if (this.phase === 'serve') return [p.side === 0 ? C.X0 + 36 : C.X1 - 36, yy];
  if (inCourt && this.L && this.L.tNet !== null && this.L.tNet > this.t) return [p.side === 0 ? C.NET_X - 40 : C.NET_X + 40, yy];
  return [baseX, yy];
};
/* the AI serves after a short wait: toss, then a press at a random error around the apex */
G.Match.prototype.aiServeStep = function (dt) {
  const s = this.server;
  if (!s || !s.ai) return;
  if (this.serveState === 'wait') {
    this.serveWait = (this.serveWait || this.rng() * 1.3 + 1.2) - dt;
    if (this.serveWait <= 0) { this.tossServe(s, false); }
  } else if (this.serveState === 'toss' && this.tossL && !this.tossPlan) {
    const sk = this.aiSkill(s, 'POW');
    const err = (this.rng() * 2 - 1) * (.18 * (1.2 - sk));
    this.tossPlan = { at: this.tossL.apexT + err, jump: this.rng() < (s.stat('POW') >= 8 ? .5 : .3) };
  } else if (this.serveState === 'toss' && this.tossPlan && this.t >= this.tossPlan.at) {
    const jump = this.tossPlan.jump; this.tossPlan = null;
    this.serveHit(s, jump ? 'shot' : 'play');
  }
};
G.Match.prototype.tossServe = function (s, jump) {
  const vz = jump ? 190 : 165;
  const L = G.launchMake({ t0: this.t, p: [s.x, s.y, 4], v: [0, 0, vz], kind: 'toss', side: s.side });
  L.apexT = this.t + Math.log(1 + vz * G.T.ballDrag / G.T.ballGravity) / G.T.ballDrag;
  this.tossL = L; this.serveState = 'toss'; this.tossPress = null; this.tossPlan = null; this.serveTossT = this.t;
  this.specialServe(s);
  if (s.human) this.tipFor('serve');
  s.act = 'toss'; s.actT = 0;
};
/* the AI judges a pending touch: a quality roll and the press time */
G.Match.prototype.aiTouchStep = function () {
  const pend = this.pending;
  if (!pend || !pend.p.ai || pend.judged) return;
  if (pend.aiAt === undefined) {
    const p = pend.p, s = this.aiSkill(p, pend.kind === 'bump' ? 'TEC' : pend.kind === 'set' ? 'TEC' : 'POW');
    pend.skill = s;
    pend.aiQ = this.aiRoll(s);
    // the House Edge shot: a partner who is a good friend covers the line
    if (this.houseEdgeLive && p.side === this.houseEdgeLive.side && (p.aff || 0) >= 60 && this.t - this.houseEdgeLive.t < 3) { pend.aiQ = 'perfect'; this.houseEdgeLive = null; this.callFloat(p, "I've got line!"); }
    const spread = { perfect: .02, great: .05, ok: .1, miss: .2 }[pend.aiQ];
    pend.aiAt = pend.ts + (this.rng() * 2 - 1) * spread;
  }
  if (this.t >= pend.aiAt) {
    pend.judged = true;
    const p = pend.p;
    let action = 'play';
    if (pend.kind === 'attack' && this.rng() < .2) action = 'shot';
    if (pend.kind === 'set' && this.rng() < .08) action = 'shot';
    if (pend.kind === 'bump' && this.rng() < .05) action = 'shot';
    const q = pend.aiQ;
    if (q === 'miss') { this.whiff(p, pend.kind); return; }
    this.popJudge(p, q);
    this.resolveTouch(p, pend, q, action);
  }
};
/* AI attack: the zone with most room from the defenders, with some variety */
G.Match.prototype.aiAim = function (p, kind) {
  if (kind === 'set') return { x: this.rng() * .6 - .3, y: this.rng() * .6 - .3 };
  const C = G.C, defs = this.players.filter(q => q.side !== p.side && !q.down);
  let best = null;
  const xs = [-.7, 0, .7], ys = [-.7, 0, .7];
  for (const ax of xs) for (const ay of ys) {
    const tx = (p.side === 0 ? C.NET_X + 60 + (ax + .7) * 60 : C.NET_X - 60 - (ax + .7) * 60) ;
    const ty = C.CY + ay * 50;
    let room = 1e9;
    for (const d of defs) room = Math.min(room, Math.hypot(d.x - tx, d.y - ty));
    room -= 8 * (1 - (p.skill || .5)) * (Math.abs(ty - C.Y0) < 10 || Math.abs(ty - C.Y1) < 10 ? 1 : 0);
    room += this.rng() * 10;
    if (!best || room > best.room) best = { room, x: ax, y: ay };
  }
  return { x: best.x, y: best.y };
};
/* AI blockers: while the other side attacks, a blocker near the net decides to jump */
G.Match.prototype.aiBlockDecide = function (L) {
  if (!L || L.tNet === null || L.blockDecided) return;
  L.blockDecided = true;
  const defSide = 1 - (L.side === undefined ? 0 : L.side);
  if (L.kind !== 'spike' && L.kind !== 'attack' && L.kind !== 'shot') return;
  const near = this.players.filter(q => q.side === defSide && q.ai && !q.down && Math.abs(q.x - G.C.NET_X) < 30);
  if (!near.length) return;
  const b = near[0];
  const sk = this.aiSkill(b, 'JMP');
  if (this.rng() < .3 + .4 * sk) {
    const err = (this.rng() * 2 - 1) * (.14 * (1.1 - sk));
    b.blockAt = L.tNet - G.T.blockRise + err;
    b.blockPlanned = true;
  }
};
