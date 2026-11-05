/* ---------- Bout: referee rules, scoring, the phase machine. Deterministic: no RNG except the seeded judges ---------- */
const PH = { intro: 1.2, rei: .9, card: .9, ready: .4, hajime: .6, yame: .9, award: 1.2, reset: 1.2, roundEnd: 2.0, time: .8, hantei: 2.4, matchEnd: 2.5 };
class Bout {
  /** o: { white, black ids, belts, ctrl:[fn,fn], seed, rounds (null = TUNE), intro, onMatchEnd, mode } */
  constructor(o) {
    this.o = o; this.f = [new Karateka(o.ids[0], 0, { belt: o.belts && o.belts[0], name: o.names && o.names[0] }), new Karateka(o.ids[1], 1, { belt: o.belts && o.belts[1], name: o.names && o.names[1] })];
    this.ctrl = o.ctrl || [null, null]; this.rng = E.rng(o.seed || 1); this.single = !!o.single; this.mode = o.mode || 'versus';
    this.pts = [0, 0]; this.rounds = [0, 0]; this.round = 1; this.phase = 'none'; this.pt = 0; this.acc = 0; this.clock = T().clock; this.hs = 0; this.pending = null;
    this.listeners = {}; this.calls = []; this.lastCall = null; this.lastPoint = null; this.steps = 0; this.in = [{ posture: 'n', tech: null }, { posture: 'n', tech: null }];
    this.stats = [0, 1].map(() => ({ full: 0, half: 0, blocks: 0, attempts: 0, raw: 0, best: null, bestPts: 0, conceded: 0, counters: 0 }));
    this.score = [0, 0]; this.lastScorer = -1; this.winner = -1; this.matchWinner = -1; this.done = false; this.log = []; this.freezeAll = false; this.slide = [null, null];
    this.noInput = false; this.infiniteTime = false; this.invincible = [false, false]; this.hantei = null; this.inputGate = 0; this.slow = 0;
    this.hintT = 0; this.seq = 0;
  }
  on(n, fn) { (this.listeners[n] = this.listeners[n] || []).push(fn); return this; }
  emit(n, d) { this.seq++; this.log.push([n, d]); if (this.log.length > 60) this.log.shift(); (this.listeners[n] || []).forEach(fn => fn(d)); }
  call(id, extra) { this.lastCall = { id, t: this.steps }; this.emit('call', Object.assign({ id }, extra)); }
  get target() { return T().pointsToWin; }
  get needRounds() { return this.single ? 1 : T().roundsToWin; }
  pace(sec) { return Math.max(1, Math.round(sec * 120 * T().refPace * (this.o.practice ? .45 : 1))); }
  start() { this.round = 1; this.pts = [0, 0]; this.rounds = [0, 0]; this.f.forEach(f => f.reset()); this.setPhase(this.o.intro === false ? 'rei' : 'intro'); }
  setPhase(p) {
    this.phase = p; this.pt = 0; this.dur = this.pace(PH[p] || 1);
    const [a, b] = this.f;
    if (p === 'intro') { a.x = -30; b.x = 430; a.frozen = b.frozen = false; this.walkIn = true; this.f.forEach(f => { f.state = 'free'; }); }
    if (p === 'rei') { this.f.forEach(f => { f.posePose = 'crouch'; f.frozen = true; f.x = f.mark; }); this.call('bow'); }
    if (p === 'card') { this.clock = T().clock; this.f.forEach(f => { f.posePose = null; f.frozen = true; }); this.emit('card', { round: this.round, deciding: this.round === this.needRounds * 2 - 1 && this.needRounds > 1 }); if (this.needRounds > 1 && this.round === this.needRounds * 2 - 1) this.call('decide'); }
    if (p === 'ready') { this.f.forEach(f => { f.posePose = null; f.frozen = true; f.crouching = false; }); }
    if (p === 'hajime') { this.call('begin'); this.inputGate = this.pace(.35); this.f.forEach(f => { f.frozen = true; }); this.emit('hajime', {}); }
    if (p === 'fight') { this.f.forEach(f => { f.frozen = false; }); this.fightSteps = 0; }
    if (p === 'yame') { this.call('stop'); }
    if (p === 'award') { /* set by finishHit */ }
    if (p === 'roundEnd') { this.f.forEach(f => { f.frozen = true; f.tech = null; f.state = 'free'; f.z = 0; f.vz = 0; f.air = false; }); const w = this.winner; this.f[w].posePose = 'cheer'; this.f[w].expr = 'shout'; this.f[1 - w].posePose = 'kneel'; this.f[1 - w].downW = 0; this.call(w === 0 ? 'whiteWins' : 'redWins'); this.emit('roundEnd', { winner: w, rounds: this.rounds.slice() }); }
    if (p === 'time') { this.call('time'); this.f.forEach(f => { f.frozen = true; }); }
    if (p === 'hantei') { this.call('judges'); this.hantei = this.judge(); this.emit('hantei', this.hantei); }
    if (p === 'matchEnd') { this.f.forEach(f => { f.posePose = null; f.expr = null; f.state = 'free'; f.downW = 0; f.x = f.mark; f.face = f.side === 0 ? 1 : -1; f.frozen = true; }); const w = this.matchWinner; this.f[w].posePose = 'cheer'; this.f[1 - w].posePose = 'crouch'; this.call('bow'); }
    if (p === 'reset') { this.f.forEach(f => { f.tech = null; f.fr = null; f.state = 'free'; f.recoil = 0; f.z = 0; f.vz = 0; f.air = false; f.posePose = null; f.kime = 0; f.hurtT = 0; f.crouching = false; f.frozen = true; f.downW = f.downW; }); }
  }
  judge() {
    const votes = [], sc = [0, 1].map(i => ({ pts: this.stats[i].roundRaw || 0, att: this.stats[i].roundAtt || 0, blk: this.stats[i].roundBlk || 0 }));
    for (let j = 0; j < 3; j++) {
      const s = sc.map(x => x.pts + 60 * x.att + 40 * x.blk + (this.rng() * 2 - 1) * 120);
      votes.push(s[0] === s[1] ? (this.lastScorer >= 0 ? this.lastScorer : 0) : s[0] > s[1] ? 0 : 1);
    }
    const w = votes.filter(v => v === 0).length >= 2 ? 0 : 1;
    return { votes, winner: w };
  }
  // ---- per update: read inputs once, then fixed 1/120 steps ----
  update(dt) {
    if (this.done) return;
    const ts = this.slow ? .35 : 1; this.acc += dt / STEP * (this.slow > 0 ? 1 : 1);
    // inputs are read once per update; a press is kept until a step consumes it
    for (let i = 0; i < 2; i++) {
      const c = this.ctrl[i]; if (!c || this.noInput) continue;
      const r = c(this.f[i], this.f[1 - i], this); if (!r) continue;
      const cur = this.in[i]; cur.posture = r.posture; if (r.tech) cur.tech = r.tech;
    }
    let guard = 0;
    while (this.acc >= 1 && guard++ < 8) { this.acc -= 1; this.step(); }
    if (this.acc > 4) this.acc = 0;
    for (const f of this.f) { f.update(dt, this.f[1 - f.side]); }
  }
  take(i) { const r = this.in[i], out = { posture: r.posture, tech: r.tech }; r.tech = null; return out; }
  step() {
    this.steps++;
    if (this.hs > 0) { this.hs--; return; }
    this.pt++;
    const [a, b] = this.f;
    switch (this.phase) {
      case 'intro': {
        const sp = 400 / (1.2 * 120 * T().refPace) * 0; a.x = lerp(a.x, a.mark, .03); b.x = lerp(b.x, b.mark, .03); a.walking = b.walking = 1; a.vxw = (a.mark - a.x) * 2.4; b.vxw = (b.mark - b.x) * 2.4;
        if (this.pt >= this.dur) { a.x = a.mark; b.x = b.mark; a.vxw = b.vxw = 0; this.setPhase('rei'); } break; }
      case 'rei': if (this.pt >= this.dur) this.setPhase('card'); break;
      case 'card': if (this.pt >= this.dur) this.setPhase('ready'); break;
      case 'ready': if (this.pt >= this.dur) this.setPhase('hajime'); break;
      case 'hajime': if (this.pt >= this.inputGate) { this.f.forEach(f => { f.frozen = false; }); } if (this.pt >= this.dur) this.setPhase('fight'); break;
      case 'fight': this.fightStep(); break;
      case 'yame': this.yameStep(); break;
      case 'award': if (this.afterCall && this.pt >= this.callAt) { this.call(this.afterCall); this.afterCall = null; } if (this.pt >= this.dur || (this.skipReq && this.pt > this.pace(.6))) { this.skipReq = false; this.afterAward(); } break;
      case 'reset': this.resetStep(); break;
      case 'time': if (this.pt >= this.dur) { if (this.pts[0] !== this.pts[1]) this.endRound(this.pts[0] > this.pts[1] ? 0 : 1); else this.setPhase('hantei'); } break;
      case 'hantei': if (this.pt >= this.dur) this.endRound(this.hantei.winner); break;
      case 'roundEnd': if (this.pt >= this.dur) this.afterRoundEnd(); break;
      case 'matchEnd': if (this.pt >= this.dur) { this.done = true; this.phase = 'done'; this.emit('matchEnd', { winner: this.matchWinner, stats: this.stats, score: this.score }); if (this.o.onMatchEnd) this.o.onMatchEnd(this.matchWinner, this.stats); } break;
    }
  }
  fightStep() {
    const [a, b] = this.f;
    this.fightSteps++;
    if (!this.infiniteTime && this.fightSteps > (T().clock + 5) * 120 * 4) throw new Error('bout soft-lock');
    for (let i = 0; i < 2; i++) { const f = this.f[i]; f.step(this.f[1 - i], this.noInput ? null : this.take(i), this); }
    this.separate();
    // attempts (techniques thrown toward the foe within reach)
    for (let i = 0; i < 2; i++) { const f = this.f[i]; if (f.tech && !f.tech.util && f.t === 1) { const gap = Math.abs(f.x - this.f[1 - i].x) - PUSH; this.stats[i].attempts++; this.stats[i].roundAtt = (this.stats[i].roundAtt || 0) + (gap <= f.tech.reach[1] * 1.4 ? 1 : 0); } }
    this.resolveHits();
    if (!this.infiniteTime) this.clock -= STEP;
    if (this.pending) { this.pending.t++; if (this.pending.t >= 6) this.finishHit(); }
    else if (this.clock <= 0) { this.clock = 0; this.setPhase('time'); }
  }
  separate() {
    const [a, b] = this.f;
    if (a.z < FOE_Z && b.z < FOE_Z) {
      const d = b.x - a.x, ov = PUSH - Math.abs(d);
      if (ov > 0) { const s = d >= 0 ? 1 : -1; a.x -= s * ov / 2; b.x += s * ov / 2; }
    }
    for (const f of this.f) f.x = clamp(f.x, KC.ARENA.x0 + PUSH / 2, KC.ARENA.x1 - PUSH / 2);
    // if clamping pushed one into the other, push the other back
    if (a.z < FOE_Z && b.z < FOE_Z && Math.abs(b.x - a.x) < PUSH - .01) { if (a.x <= KC.ARENA.x0 + PUSH / 2 + .01) b.x = a.x + (b.x >= a.x ? PUSH : -PUSH); else b.x = clamp(b.x, KC.ARENA.x0 + PUSH / 2, KC.ARENA.x1 - PUSH / 2); }
  }
  resolveHits() {
    const res = [null, null];
    for (let i = 0; i < 2; i++) {
      const A = this.f[i], D = this.f[1 - i], t = A.tech;
      if (!t || t.util || A.state !== 'tech' || A.phase !== 'active' || A.hitDone) continue;
      if ((D.x - A.x) * A.face < -4 && !(t.air && A.z > 4)) continue;
      const gap = Math.abs(D.x - A.x) - PUSH, rmax = t.reach[1] * A.stats.reach * T().reachScale;
      if (gap > rmax) continue;
      if (this.invincible[1 - i]) continue;
      const v = D.vulnerable(t, A);
      if (v === 'whiff') continue;
      A.hitDone = true;
      if (v === 'block') { this.doBlock(A, D); continue; }
      res[i] = { a: i, d: 1 - i, tech: t, gap, tAct: A.t - A.fr[0] };
    }
    for (let i = 0; i < 2; i++) {
      if (!res[i]) continue;
      if (!this.pending) this.pending = { t: 0, hits: [] };
      this.pending.hits.push(res[i]);
    }
  }
  doBlock(A, D) {
    const stats = this.stats[D.side]; stats.blocks++; stats.roundBlk = (stats.roundBlk || 0) + 1;
    A.recoil += 20; A.x = clamp(A.x - A.face * 14, 9, 391); if (D.fr) D.fr[2] = Math.max(2, D.fr[2] - 12);
    this.hs = Math.round(.05 * 120); this.emit('block', { side: D.side, x: (A.x + D.x) / 2, tech: A.tech.id });
  }
  quality(hit) {
    const A = this.f[hit.a], D = this.f[hit.d], t = hit.tech, act = Math.max(1, A.fr[1]);
    const fracT = clamp(hit.tAct / act, 0, 1), timingQ = fracT <= .4 ? 1 : lerp(1, .3, (fracT - .4) / .6);
    const rmin = t.reach[0] * A.stats.reach * T().reachScale, rmax = t.reach[1] * A.stats.reach * T().reachScale;
    const pos = rmax - rmin < 1 ? 1 : clamp((hit.gap - rmin) / (rmax - rmin), 0, 1), spacingQ = pos >= .7 ? 1 : pos / .7;
    let q = .5 * timingQ + .5 * spacingQ;
    if (A.d.sig === t.id) q += .1;
    if (t.rising && D.z > 6) q += .25;
    q = clamp(q, .15, 1);
    return { q, timingQ, spacingQ };
  }
  finishHit() {
    const p = this.pending; this.pending = null; if (!p || !p.hits.length) return;
    const [a, b] = this.f;
    if (p.hits.length > 1) {
      this.call('aiuchi'); this.emit('aiuchi', {}); this.lastPoint = { aiuchi: true };
      this.f.forEach(f => { f.frozen = true; f.state = 'hurt'; f.tech = null; f.hurtT = 40; }); this.f[0].x -= 8; this.f[1].x += 8;
      this.nextAward = { aiuchi: true }; this.hs = Math.round(T().hitstop * 120); this.setPhase('yame'); return;
    }
    const h = p.hits[0], A = this.f[h.a], D = this.f[h.d], t = h.tech, qi = this.quality(h);
    if (this.directorQ !== undefined && this.directorQ !== null) { qi.q = this.directorQ; this.directorQ = null; }
    let pts = t.pts[0] + Math.round((t.pts[1] - t.pts[0]) * qi.q / 100) * 100;
    pts = clamp(pts, t.pts[0], t.pts[1]);
    const counter = D.counterable(); if (counter) pts = Math.min(1000, pts * T().counterMul);
    const full = pts >= T().fullAt, val = full ? 1 : .5;
    const info = { side: h.a, tech: t.id, pts, full, counter, q: qi.q, timingQ: qi.timingQ, spacingQ: qi.spacingQ, gap: h.gap, x: (A.x + D.x) / 2 };
    this.lastPoint = info; this.lastScorer = h.a;
    const st = this.stats[h.a]; if (full) st.full++; else st.half++; st.raw += pts; st.roundRaw = (st.roundRaw || 0) + pts; if (counter) st.counters++; if (pts > st.bestPts) { st.bestPts = pts; st.best = t.name; }
    this.stats[h.d].conceded += val;
    this.pts[h.a] += val; this.score[h.a] += pts;
    // reactions
    this.f.forEach(f => { f.frozen = true; });
    A.kime = 99999; D.tech = null; D.fr = null; D.state = 'hurt'; D.hurtT = 60; D.crouching = false;
    const knock = full || t.knockdown; D.knock = knock;
    this.slide = [null, null]; this.slide[h.d] = { dist: knock ? 18 : 10, dir: -D.face * (D.x < A.x ? -1 : 1) * -1, n: 40 };
    this.slide[h.d].dir = A.x < D.x ? 1 : -1;
    if (knock) { D.state = 'down'; D.downW = Math.max(D.downW, .01); }
    this.hs = Math.round(T().hitstop * 120);
    this.nextAward = info; this.emit('point', info);
    this.setPhase('yame');
  }
  yameStep() {
    for (let i = 0; i < 2; i++) { const s = this.slide[i]; if (s && s.n > 0) { this.f[i].x = clamp(this.f[i].x + s.dir * s.dist / 40, 9, 391); s.n--; } const f = this.f[i]; if (f.z > 0) { f.vz -= T().gravity * STEP; f.z = Math.max(0, f.z + f.vz * STEP); } }
    if (this.pt >= this.dur) this.setPhase('award'), this.beginAward();
  }
  beginAward() {
    const n = this.nextAward || {};
    if (n.aiuchi) { this.call('nopoint'); return; }
    this.call(n.side === 0 ? 'white' : 'red'); this.calls.push(n.full ? 'full' : 'half');
    this.afterCall = n.full ? 'full' : 'half'; this.callAt = this.pace(.55);
  }
  afterAward() {
    const n = this.nextAward || {};
    if (n.aiuchi) { this.nextAward = null; this.setPhase('reset'); return; }
    const s = n.side;
    if (!this.o.practice && this.pts[s] >= this.target) { this.endRound(s); } else { this.nextAward = null; this.setPhase('reset'); }
  }
  resetStep() {
    const sp = T().walk * 2 * STEP, [a, b] = this.f; let done = true;
    for (const f of this.f) { f.downW = Math.max(0, f.downW - 0.012); const d = f.mark - f.x; if (Math.abs(d) > sp) { f.x += Math.sign(d) * sp; done = false; f.walking = 1; f.vxw = Math.sign(d) * T().walk * 2; } else { f.x = f.mark; f.vxw = 0; } if (f.downW > .02) done = false; f.expr = null; f.hurtT = 0; f.state = 'free'; f.kime = 0; }
    this.f.forEach(f => { f.face = f.side === 0 ? 1 : -1; });
    if (done || this.pt >= this.dur * 1.6) { this.f.forEach(f => { f.x = f.mark; f.downW = 0; f.vxw = 0; }); this.setPhase('ready'); }
  }
  endRound(w) {
    this.winner = w; this.rounds[w]++;
    const secs = Math.floor(this.clock); let bonus = secs * 100; this.score[w] += bonus; this.roundBonus = bonus;
    this.setPhase('roundEnd');
  }
  afterRoundEnd() {
    const w = this.winner;
    if (this.rounds[w] >= this.needRounds) {
      this.matchWinner = w; const lw = this.stats[1 - w].conceded === 0 ? 5000 : 0; this.perfect = lw > 0 || (this.stats[1 - w].conceded === 0 && this.stats[w].raw > 0); if (this.perfect) this.score[w] += 5000;
      this.setPhase('matchEnd');
    } else {
      this.round++; this.pts = [0, 0]; this.stats.forEach(s => { s.roundRaw = 0; s.roundAtt = 0; s.roundBlk = 0; }); this.f.forEach(f => { f.posePose = null; f.expr = null; f.downW = 0; }); this.setPhase('reset'); this.afterReset = 'card';
    }
  }
}
// after the reset walk a new round shows its card
const _resetStep = Bout.prototype.resetStep;
Bout.prototype.resetStep = function () {
  const was = this.phase; _resetStep.call(this);
  if (this.phase === 'ready' && this.afterReset === 'card') { this.afterReset = null; this.setPhase('card'); }
};
KC.Bout = Bout;
