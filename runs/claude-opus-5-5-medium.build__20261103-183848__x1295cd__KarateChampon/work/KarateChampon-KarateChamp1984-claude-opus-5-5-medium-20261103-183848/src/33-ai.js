/* ---- CPU AI (KC.KarateAI): the same intents a human makes, so it obeys the same rules. Perception with a reaction
 * delay, a decision tick, personalities and levels, a habit tracker, and a showcase mode (the attract mode). All its
 * randomness is its own seeded stream: the same seed and inputs give the same match. */
class KarateAI {
  constructor(o = {}) {
    this.id = o.id || 'taro'; this.P = Object.assign({}, KC.ROSTER[this.id].ai, o.ai || {}); this.rng = U.rng(o.seed || 7); this.showcase = !!o.showcase;
    this.setLevel(o.level || this.P.level); this.obs = []; this.plan = null; this.nextT = 0; this.t = 0; this.habit = {}; this.thought = ''; this.showI = o.showI || 0; this.cheat = !!o.cheat;
  }
  setLevel(L) {
    L = clamp(Math.round(L), 1, 10); this.level = L; const k = (L - 1) / 9;
    this.react = lerp(.55, .12, k) * TUNE.cpuReact; this.think = lerp(.5, .14, k); this.readP = clamp(lerp(.25, .92, k) + (this.P.readBonus || 0), 0, .98); this.mistake = lerp(.3, .02, k);
    if (this.showcase) { this.react = .1; this.readP = 1; this.mistake = 0; this.think = .25; }
  }
  aggression() { return TUNE.cpuAggression >= 0 ? TUNE.cpuAggression : clamp(this.P.aggression * (.7 + this.level * .05), 0, 1); }
  observe(f, foe) {
    this.obs.push({ t: this.t, tech: foe.st === 'tech' ? foe.tech : null, ph: foe.ph, air: foe.isAir(), low: foe.isLow(), down: foe.st === 'down', gap: f.gapTo(foe), recov: foe.st === 'tech' && foe.ph === 'r' && foe.T && !!foe.T.pts, k: foe.k, x: foe.x, vz: foe.vz });
    while (this.obs.length > 2 && this.obs[1].t <= this.t - this.react) this.obs.shift();
    if (foe.st === 'tech' && foe.k === 1 && foe.T && foe.T.pts) this.habit[foe.tech] = (this.habit[foe.tech] || 0) + 1;
  }
  seen() { return this.obs[0]; }
  /** the controller: (fighter, foe, bout) -> intent */
  control(f, foe, bout) {
    const dt = 1 / 120; this.t += dt; this.observe(f, foe);
    const toward = Math.sign(foe.x - f.x) || f.face, scr = d => d === 't' ? (toward > 0 ? 'r' : 'l') : d === 'a' ? (toward > 0 ? 'l' : 'r') : d;
    // reading a technique as it starts (the arcade CPU read its foe's stick at once): a level-scaled chance, once each
    if (foe.st === 'tech' && foe.k <= 2 && foe.T && foe.T.pts && this.lastSeen !== foe.history.length) { this.lastSeen = foe.history.length; if (this.rng() < this.readP * .85 && (f.free() || f.st === 'walk')) this.reactTo(f, foe); }
    const P = this.plan;
    if (P && P.kind === 'delay') { if (this.t >= P.until) { this.plan = P.then; return this.control(f, foe, bout); } return { posture: 'n', press: null }; }
    if (P && P.kind === 'tech') { this.plan = null; const t = KC.TECH[P.id]; return { posture: scr(t.L), press: scr(t.R) }; }
    if (P && P.until > this.t) {
      if (P.kind === 'walk') { const g = f.gapTo(foe); if ((P.dir === 't' && g < (P.stopGap || 0)) || (P.dir === 'a' && g > 120)) { this.plan = null; return KC.NEUTRAL; } return { posture: scr(P.dir), press: null }; }
      if (P.kind === 'hold') return { posture: scr(P.posture), press: null };
    } else if (P) this.plan = null;
    const nearlyFree = f.st === 'tech' && f.ph === 'r' && f.T && !f.T.air && !f.T.kind && f.S + f.A + f.Rr - f.k <= 16;   // (a press in the last 16 steps of recovery is buffered)
    if (!f.free() && !nearlyFree) return { posture: f.posture === 'd' ? 'd' : 'n', press: null };
    if (this.t < this.nextT) return { posture: f.st === 'crouch' && this.rng() < .95 ? 'd' : 'n', press: null };
    this.nextT = this.t + this.think * (.75 + this.rng() * .5);
    this.decide(f, foe, bout);
    return this.plan && this.plan.kind === 'tech' ? this.control(f, foe, bout) : this.plan ? { posture: scr(this.plan.dir || this.plan.posture), press: null } : KC.NEUTRAL;
  }
  reactTo(f, foe) {
    const t = foe.T, h = t.height, gap = f.gapTo(foe), rnd = () => this.rng(), near = gap < KC.ROSTER[foe.id].stats.reach * t.reach[1] * TUNE.reachScale + (t.travel || 0) + (t.air ? t.air.vx * .45 : 0) + 6;
    if (!near) return;
    if (h === 'low') { this.plan = { kind: 'tech', id: rnd() < .6 ? 'jump' : 'frontFlip' }; this.thought = 'JUMP THE LOW'; }
    else if (h === 'high') { this.plan = rnd() < .45 && this.inRange(f, 'squatPunch', gap) ? { kind: 'tech', id: 'squatPunch' } : { kind: 'hold', posture: 'd', until: this.t + .45 }; this.thought = 'DUCK THE HIGH'; }
    else if (h === 'rising') { this.plan = { kind: 'walk', dir: 'a', until: this.t + .3 }; this.thought = 'STEP BACK'; }
    else if (rnd() < Math.max(this.P.block, .35) || gap < 30) { const wait = Math.max(0, foe.S - foe.k - U.steps(t.air ? 4 : 6)) / 120; this.plan = wait > 0 ? { kind: 'delay', until: this.t + wait, then: { kind: 'tech', id: 'block' } } : { kind: 'tech', id: 'block' }; this.thought = 'BLOCK'; }
    else { this.plan = { kind: 'tech', id: 'backFlip' }; this.thought = 'EVADE'; }
    this.nextT = this.t + .3;
  }
  inRange(f, id, gap) { const t = KC.TECH[id]; if (!t.pts) return false; const [mn, mx] = f.reach(t), trav = t.travel || 0, air = t.air ? t.air.vx * .25 : 0; return gap <= mx + trav + air && gap >= mn - 6; }
  pickWeighted(f, gap, weights) {
    const opts = Object.keys(weights).filter(id => this.inRange(f, id, gap) || (KC.TECH[id] && !KC.TECH[id].pts)); if (!opts.length) return null;
    let sum = 0; for (const id of opts) sum += weights[id]; let r = this.rng() * sum; for (const id of opts) { r -= weights[id]; if (r <= 0) return id; } return opts[0];
  }
  decide(f, foe, bout) {
    const o = this.seen(), gap = f.gapTo(foe), rnd = () => this.rng();
    if (!o) return;
    if (this.showcase) return this.showcaseDecide(f, foe, gap, o);
    // 4. mistakes
    if (rnd() < this.mistake * .5) { const ids = Object.keys(this.P.weights); this.plan = { kind: 'tech', id: ids[Math.floor(rnd() * ids.length)] }; this.thought = 'MISTAKE'; return; }
    // 1. punish a foe in recovery
    if (o.recov && f.free()) {
      const opts = KC.SCORING.filter(id => this.inRange(f, id, gap) && !KC.TECH[id].air).sort((a, b) => KC.TECH[b].pts[1] - KC.TECH[a].pts[1]).slice(0, 4), best = opts[Math.floor(rnd() * opts.length)];
      if (best && rnd() < this.readP) { this.plan = { kind: 'tech', id: best }; this.thought = 'PUNISH ' + best; return; }
    }
    if (o.air && Math.abs(o.gap) < 80 && rnd() < this.readP) { if (gap <= 24) { this.plan = { kind: 'tech', id: 'upperPunch' }; this.thought = 'ANTI-AIR'; } else if (gap < 50 && rnd() < .4 + this.P.block) { this.plan = { kind: 'tech', id: 'block' }; this.thought = 'BLOCK THE JUMP'; } else { this.plan = { kind: 'walk', dir: 'a', until: this.t + .25 }; this.thought = 'BACK OFF'; } return; }
    // the habit tracker: pre-load the counter to the foe's favourite
    if (this.P.habit && this.level >= 8) {
      const fav = Object.keys(this.habit).sort((a, b) => this.habit[b] - this.habit[a])[0];
      if (fav && this.habit[fav] >= 3 && gap < 60 && rnd() < .25) { const h = KC.TECH[fav].height; this.plan = h === 'low' ? { kind: 'tech', id: 'jump' } : h === 'high' ? { kind: 'hold', posture: 'd', until: this.t + .4 } : { kind: 'tech', id: 'block' }; this.thought = 'READ ' + fav; return; }
    }
    if (this.P.crouch && rnd() < this.P.crouch * .3) { this.plan = { kind: 'hold', posture: 'd', until: this.t + .4 + rnd() * .4 }; this.thought = 'LOW'; return; }
    // 3. proactive: space toward its distance, throw what reaches
    const want = this.P.gap, id = this.pickWeighted(f, gap, this.P.weights);
    if (id && rnd() < this.aggression() * (o.down ? 0 : 1)) { this.plan = { kind: 'tech', id }; this.thought = 'ATTACK ' + id; return; }
    if (rnd() < this.P.jump * .4 && gap > 30 && gap < 90) { this.plan = { kind: 'tech', id: rnd() < .5 ? 'jumpSide' : 'frontFlip' }; this.thought = 'JUMP IN'; return; }
    if (gap > want + 8) { this.plan = { kind: 'walk', dir: 't', until: this.t + .2 + rnd() * .3, stopGap: want - 4 }; this.thought = 'CLOSE IN'; return; }
    if (gap < want - 12 && rnd() < .5 + this.P.patience * .4) { this.plan = { kind: 'walk', dir: 'a', until: this.t + .15 + rnd() * .2 }; this.thought = 'MAKE SPACE'; return; }
    if (rnd() < this.P.patience) { this.plan = { kind: 'walk', dir: rnd() < .5 ? 't' : 'a', until: this.t + .12 }; this.thought = 'FEINT'; return; }
    this.plan = { kind: 'walk', dir: 't', until: this.t + .15, stopGap: 4 }; this.thought = 'PRESS';
  }
  // the attract mode's CPU: every technique in turn, each from its own range; perfect reads
  showcaseDecide(f, foe, gap, o) {
    if (o.tech && o.ph === 's' && KC.TECH[o.tech].pts && this.rng() < .5) { const h = KC.TECH[o.tech].height; this.plan = h === 'low' ? { kind: 'tech', id: 'jump' } : h === 'high' ? { kind: 'hold', posture: 'd', until: this.t + .4 } : { kind: 'tech', id: 'block' }; return; }
    const list = KC.SCORING, id = list[this.showI % list.length], t = KC.TECH[id], [mn, mx] = f.reach(t), trav = t.travel || 0, want = (mn + mx) / 2 + trav * .8 + (t.air ? 30 : 0);
    if (gap > want + 6) { this.plan = { kind: 'walk', dir: 't', until: this.t + .15, stopGap: want }; return; }
    if (gap < want - 14 && gap < mn) { this.plan = { kind: 'walk', dir: 'a', until: this.t + .12 }; return; }
    this.showI++; this.plan = { kind: 'tech', id };
  }
}
KC.KarateAI = KarateAI;
/** a CPU for an opponent in a story or versus match: its personality, level by the opponent, difficulty and tuning */
KC.cpuFor = (id, seed, levelOverride) => {
  let L = levelOverride || KC.ROSTER[id].ai.level, d = KC.diff();
  if (TUNE.cpuLevel > 0) L = TUNE.cpuLevel;
  const ai = new KarateAI({ id, seed, level: d === 'Easy' ? Math.max(1, L - 2) : d === 'Hard' ? Math.min(10, L + 1) : L });
  if (d === 'Easy') ai.react *= 1.25; if (d === 'Hard') ai.react *= .85;
  return ai;
};
