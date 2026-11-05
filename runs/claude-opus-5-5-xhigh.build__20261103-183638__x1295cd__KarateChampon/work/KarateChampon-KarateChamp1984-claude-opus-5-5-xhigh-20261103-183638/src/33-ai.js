/* =====================================================================================================================
 * CPU: KC.KarateAI produces the same control intent a player does ({ posture, press } in screen directions), so it obeys
 * every rule a player obeys. It sees the foe's technique only after its reaction delay, decides on its own think tick,
 * punishes recoveries, reads techniques (jump the lows, duck the highs, block the mids), walks to its favourite range and
 * throws its personality's techniques. Levels 1-10. Deterministic: all its randomness is its own E.rng(seed).
 * The same class is the Autopilot (tests, the attract mode's showcase).
 * ===================================================================================================================== */
KC.KarateAI = class {
  /** new KC.KarateAI({ fid, level: 1..10, difficulty: 'Normal', seed, showcase }) */
  constructor(o = {}) {
    this.fid = o.fid || 'taro'; this.P = Object.assign({ aggression: .5, patience: .3, jump: .1, block: .3, gap: 36, crouch: .1, weights: { frontKick: 1 } }, (KC.FIGHTER[this.fid] || KC.FIGHTER.taro).ai, o.personality || {});
    this.rng = KC.rng(o.seed || 7); this.showcase = !!o.showcase; this.obs = []; this.timer = .4; this.hold = null; this.queued = null; this.seen = -1; this.habit = {}; this.thought = 'WAIT';
    this.difficulty = o.difficulty || 'Normal'; this.baseLevel = o.level || this.P.level || 5; this.setLevel(this.baseLevel); this.showIdx = 0; this.techSeq = 0; this.lastFoeTech = null;
  }
  setLevel(L) {
    let lv = L, rk = 1;
    if (this.difficulty === 'Easy') { lv = Math.max(1, L - 2); rk = 1.25; } else if (this.difficulty === 'Hard') { lv = Math.min(10, L + 1); rk = .85; }
    this.level = lv; const u = (lv - 1) / 9;
    this.react = lerp(.42, .09, u) * rk; this.think = lerp(.62, .3, u); this.readP = Math.min(.98, lerp(.25, .92, u) + (this.P.readBonus || 0)); this.mistake = lerp(.3, .02, u);
    if (this.showcase) { this.react = .1; this.readP = 1; this.mistake = 0; this.think = .2; }
  }
  get aggression() { return KC.TUNE.cpuAggression >= 0 ? KC.TUNE.cpuAggression : this.P.aggression; }
  // the control intent that performs technique id now (its cell in the matrix, toward the foe)
  _intent(me, id) {
    if (id === 'jump') return { posture: 'u', press: null };
    if (id === 'crouch') return { posture: 'd', press: null };
    const c = KC.cellOf(id); if (!c) return { posture: 'n', press: null };
    return { posture: KC.scrDir(c[0], me.face), press: KC.scrDir(c[1], me.face) };
  }
  _inBand(me, foe, id, slack = 0) { const t = KC.TECH[id], g = me.gapTo(foe), b = me.band(t); return g >= b[0] - 4 - slack && g <= b[1] + slack; }
  _pickWeighted(list) { let tot = 0; for (const [, w] of list) tot += w; let r = this.rng() * tot; for (const [id, w] of list) { if ((r -= w) <= 0) return id; } return list.length ? list[list.length - 1][0] : null; }
  /** one step: watch the foe, then the intent for this step */
  intent(me, foe, dt) {
    const T = KC.TUNE, reactSteps = Math.round(this.react * T.cpuReact * 120);
    // perception: the foe as it was reactSteps ago
    if (foe.st === 'tech' && (foe.tech !== this.lastFoeTech || foe.k < this._lastK)) { this.techSeq++; if (KC.TECH[foe.tech].scoring && this.P.habit) this.habit[foe.tech] = (this.habit[foe.tech] || 0) + 1; }
    this.lastFoeTech = foe.st === 'tech' ? foe.tech : null; this._lastK = foe.k;
    this.obs.push({ tech: foe.st === 'tech' ? foe.tech : null, phase: foe.phase, k: foe.k, fr: foe.fr.slice(), air: foe.airborne, vz: foe.vz, prof: foe.profile(), st: foe.st, recoil: foe.blockedBy, seq: this.techSeq });
    if (this.obs.length > 160) this.obs.shift();
    const o = this.obs[Math.max(0, this.obs.length - 1 - reactSteps)];
    if (!me.ctlOn) { this.hold = null; this.queued = null; return { posture: 'n', press: null }; }
    if (KC.DEV && KC.DEV.freezeCpu && me.side === 1) return { posture: 'n', press: null };
    this.timer -= dt;
    // a queued action (a block timed to the foe's strike)
    if (this.queued && (this.queued.at -= dt) <= 0 && me.free) { const q = this.queued; this.queued = null; this.hold = q.hold || null; return this._out(me, q.intent); }
    const holdP = this.hold && (this.hold.t -= dt) > 0 ? this.hold.posture : (this.hold = null, 'n');
    if (!me.free) return { posture: holdP === 'd' && me.st === 'crouch' ? 'd' : 'n', press: null };
    const gap = me.gapTo(foe);
    // 1. punish: the foe is recovering (or recoiling from a block) and a technique reaches it in time
    if (o.st === 'tech' && o.tech && KC.TECH[o.tech].scoring && (o.phase === 'recover' || o.recoil) && foe.st === 'tech') {
      const left = (foe.fr[0] + foe.fr[1] + foe.fr[2] + foe.extra) - foe.k;
      const opts = KC.SCORING.filter(id => this._inBand(me, foe, id) && me.frames(KC.TECH[id])[0] < left + 4 && KC.Karateka.heightOK(KC.Karateka.heightOf(KC.TECH[id]), foe.profile(), foe));
      if (opts.length && this.rng() < .5 + this.readP * .5) { opts.sort((a, b) => KC.TECH[b].pts[1] - KC.TECH[a].pts[1]); const id = this.rng() < .7 ? opts[0] : opts[Math.floor(this.rng() * opts.length)]; this.thought = 'PUNISH ' + id; return this._out(me, this._intent(me, id)); }
    }
    // 2. react to a technique it has seen start (once each), with its read chance
    if (o.st === 'tech' && o.tech && KC.TECH[o.tech].scoring && o.phase === 'wind' && o.seq !== this.seen) {
      this.seen = o.seq;
      if (this.rng() < this.readP) {
        const t = KC.TECH[o.tech], H = KC.Karateka.heightOf(t), toActive = Math.max(0, (o.fr[0] - o.k) - reactSteps), willReach = gap <= foe.band(t)[1] + 6;
        if (willReach) {
          let id = null;
          if (H === 'low') id = this.rng() < this.aggression * .2 && this._inBand(me, foe, 'jumpSide') ? 'jumpSide' : this.rng() < .25 ? 'frontFlip' : 'jump';
          else if (H === 'high' || H === 'rising') id = this._inBand(me, foe, 'squatPunch') && this.rng() < .45 ? 'squatPunch' : 'crouch';
          else if (H === 'air') id = gap < 30 && this.rng() < .5 ? 'upperPunch' : 'block';
          else id = this.rng() < this.P.block + .25 ? 'block' : gap > 24 && this.rng() < .5 ? 'backFlip' : 'backRoll';
          this.thought = 'READ ' + o.tech + ': ' + id;
          if (id === 'block') { this.queued = { at: Math.max(0, (toActive - 18) / 120), intent: this._intent(me, 'block') }; return { posture: 'n', press: null }; }
          if (id === 'crouch') { this.hold = { posture: 'd', t: (o.fr[0] + o.fr[1] + 10 - o.k) / 120 }; return { posture: 'd', press: null }; }
          return this._out(me, this._intent(me, id));
        }
      }
    }
    // airborne foe coming in: an anti-air upper punch, or step back
    if (o.air && foe.airborne && foe.vz > 0 && Math.sign(foe.x - me.x) === me.face && this.rng() < this.readP * .15) {
      if (gap < 30) { this.thought = 'ANTI-AIR'; return this._out(me, this._intent(me, 'upperPunch')); }
    }
    if (this.timer > 0) return { posture: holdP, press: null };
    this.timer = this.think * (.7 + this.rng() * .6);
    return this._decide(me, foe, gap);
  }
  _out(me, it) { return { posture: it.posture, press: it.press }; }
  // 3. proactive: the showcase's list, mistakes, a habit's counter, then spacing and the personality's techniques
  _decide(me, foe, gap) {
    if (this.showcase) {
      const id = KC.SCORING[this.showIdx % KC.SCORING.length], b = me.band(KC.TECH[id]), want = b[1] - Math.max(4, (b[1] - b[0]) * .2);
      if (Math.abs(gap - want) < Math.max(6, (b[1] - b[0]) * .25)) { this.showIdx++; this.thought = 'SHOW ' + id; return this._out(me, this._intent(me, id)); }
      this.hold = { posture: KC.scrDir(gap > want ? 'f' : 'b', me.face), t: .12 }; this.thought = 'SPACE FOR ' + id; return { posture: this.hold.posture, press: null };
    }
    if (this.rng() < this.mistake) { const id = KC.SCORING[Math.floor(this.rng() * KC.SCORING.length)]; this.thought = 'MISTAKE ' + id; return this._out(me, this._intent(me, id)); }
    if (this.P.habit && this.level >= 8) {   // the foe's favourite technique this match: stand ready for it (a crouch under a round kick, a jump over a sweep)
      const top = Object.entries(this.habit).sort((a, b) => b[1] - a[1])[0];
      if (top && top[1] >= 3 && this.rng() < .25) { const H = KC.Karateka.heightOf(KC.TECH[top[0]]); if (H === 'high') { this.hold = { posture: 'd', t: .35 }; this.thought = 'HABIT: DUCK ' + top[0]; return { posture: 'd', press: null }; } }
    }
    const W = this.P.weights, inRange = Object.keys(W).filter(id => this._inBand(me, foe, id) && KC.Karateka.heightOK(KC.Karateka.heightOf(KC.TECH[id]), foe.profile() || 'stand', foe)).map(id => [id, W[id]]);
    // the foe just whiffed or stands still in range: a better moment to commit
    const open = foe.st === 'tech' && foe.phase === 'recover' ? .35 : 0;
    if (inRange.length && this.rng() < this.aggression * .22 + open) { const id = this._pickWeighted(inRange); this.thought = 'ATTACK ' + id; return this._out(me, this._intent(me, id)); }
    if (this.rng() < this.P.jump * .15 && this._inBand(me, foe, 'jumpSide')) { this.thought = 'JUMP IN'; return this._out(me, this._intent(me, 'jumpSide')); }
    // the foe could reach it from here: step back out of range (the spacing game), or guard
    const threat = Object.keys(KC.FIGHTER[foe.fid].ai.weights).some(id => { const b = foe.band(KC.TECH[id]); return gap >= b[0] - 4 && gap <= b[1]; });
    if (threat && this.rng() < .25 + this.P.patience * .5) {
      const r = this.rng();
      if (r < this.P.block * .6) { this.thought = 'GUARD'; return this._out(me, this._intent(me, 'block')); }
      this.hold = { posture: KC.scrDir('b', me.face), t: .18 + this.rng() * .3 }; this.thought = 'OUT OF RANGE'; return { posture: this.hold.posture, press: null };
    }
    // hover at its favourite range, or just outside the foe's (in and out: the dance before the strike)
    const foeMax = Math.max(...Object.keys(KC.FIGHTER[foe.fid].ai.weights).map(id => foe.band(KC.TECH[id])[1]));
    const want = (this.rng() < this.P.patience ? Math.max(this.P.gap, foeMax + 6) : this.P.gap) + (this.rng() - .5) * 16;
    if (gap > want + 8) { this.hold = { posture: KC.scrDir('f', me.face), t: this.think * (.6 + this.rng()) }; this.thought = 'CLOSE IN'; }
    else if (gap < want - 10) { this.hold = { posture: KC.scrDir('b', me.face), t: this.think * (.5 + this.rng() * .6) }; this.thought = 'BACK OFF'; }
    else if (this.rng() < this.P.crouch) { this.hold = { posture: 'd', t: .3 + this.rng() * .4 }; this.thought = 'CROUCH'; }
    else if (this.rng() < this.P.patience) { this.hold = { posture: KC.scrDir(this.rng() < .5 ? 'f' : 'b', me.face), t: .12 + this.rng() * .15 }; this.thought = 'FEINT'; }
    else { this.hold = null; this.thought = 'WAIT'; }
    return { posture: this.hold ? this.hold.posture : 'n', press: null };
  }
};
