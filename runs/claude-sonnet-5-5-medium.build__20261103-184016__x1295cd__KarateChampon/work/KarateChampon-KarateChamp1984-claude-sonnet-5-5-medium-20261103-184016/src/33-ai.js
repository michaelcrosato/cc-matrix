/* ---------- CPU AI: the same control intent a human produces, with reaction delay, personalities and a habit tracker ---------- */
const LV = (L, a, b) => lerp(a, b, clamp((L - 1) / 9, 0, 1));
class KarateAI {
  /** o: { id (personality from the roster), level (1..10), seed, mode: 'normal' | 'showcase' } */
  constructor(o = {}) {
    const d = (KC.FIGHTER[o.id] || KC.ROSTER[0]).ai || KC.ROSTER[0].ai;
    this.p = d; this.rng = E.rng((o.seed || 1) * 7919 + 13); this.mode = o.mode || 'normal'; this.fixedLevel = o.level || 0;
    this.obs = []; this.cool = 0; this.plan = null; this.habit = {}; this.lastFoeTech = null; this.thought = ''; this.showIdx = o.start || 0; this.walkT = 0; this.walkDir = 'n'; this.prevFoeT = 0;
    this.ignoreTune = !!o.ignoreTune; this.diff = o.diff || 'Normal'; this.stepN = 0; this.queue = []; this.used = {};
  }
  get level() { const t = this.ignoreTune ? 0 : T().cpuLevel; let L = t > 0 ? t : (this.fixedLevel || this.p.level); if (this.diff === 'Easy') L = Math.max(1, L - 2); if (this.diff === 'Hard') L = Math.min(10, L + 1); return L; }
  get react() { const m = this.diff === 'Easy' ? 1.25 : this.diff === 'Hard' ? .85 : 1; return LV(this.level, .34, .1) * T().cpuReact * m; }
  get think() { return LV(this.level, .5, .14); }
  get readP() { return clamp(LV(this.level, .3, .95) + (this.p.readBonus || 0), 0, 1); }
  get mistake() { return LV(this.level, .45, .02); }
  get aggr() { return T().cpuAggression >= 0 ? T().cpuAggression : this.p.aggr; }
  // a technique as a (posture, strike) intent in screen terms
  intentFor(id, me, foe) {
    const t = KC.TECHS[id], fd = foe.x >= me.x ? 1 : -1, conv = c => c === 'n' ? 'n' : c === 'u' || c === 'd' ? c : (c === 't') === (fd > 0) ? 'r' : 'l';
    const s = t.input[1] === 'u' || t.input[1] === 'd' ? t.input[1] : conv(t.input[1]);
    return { posture: conv(t.input[0]), tech: s, id };
  }
  inRange(id, gap, me) { const t = KC.TECHS[id]; return gap <= t.reach[1] * me.stats.reach * T().reachScale + 4 && gap >= Math.max(0, t.reach[0] - 8) - (t.closeAlt ? 8 : 0); }
  pickWeighted(me, gap, ids) {
    const w = this.p.w, opts = (ids || Object.keys(w)).filter(id => KC.TECHS[id] && this.inRange(id, gap, me));
    if (!opts.length) return null;
    const ww = id => (w[id] || 1) / (1 + (this.used[id] || 0) * .45);
    let tot = 0; opts.forEach(id => { tot += ww(id); }); let r = this.rng() * tot, pickId = opts[opts.length - 1];
    for (const id of opts) { r -= ww(id); if (r <= 0) { pickId = id; break; } }
    this.used[pickId] = (this.used[pickId] || 0) + 1; return pickId;
  }
  stateOf(foe) { return { tech: foe.tech ? foe.tech.id : null, phase: foe.phase, air: foe.z > 6, crouch: foe.crouching, down: foe.state === 'down', recoil: foe.recoil > 0, x: foe.x, h: foe.tech ? foe.tech.height : null, util: foe.tech ? !!foe.tech.util : false, st: foe.tech ? foe.t : 0 }; }
  /** called each update with (me, foe, bout); returns { posture, tech } */
  intent(me, foe, bout) {
    this.stepN++;
    const o = this.stateOf(foe); o.gap = Math.abs(foe.x - me.x) - PUSH; this.obs.push(o); const lag = Math.round(this.react * 120); if (this.obs.length > lag + 2) this.obs.shift();
    const seen = this.obs[Math.max(0, this.obs.length - 1 - lag)] || o;
    if (foe.tech && !foe.tech.util && foe.t === 1) { this.habit[foe.tech.id] = (this.habit[foe.tech.id] || 0) + 1; }
    if (bout.phase !== 'fight' && bout.phase !== 'hajime') return { posture: 'n', tech: null };
    if (me.frozen) return { posture: 'n', tech: null };
    if (this.mode === 'showcase') return this.showcase(me, foe, bout, o);
    const fd = foe.x >= me.x ? 1 : -1, towardKey = fd > 0 ? 'r' : 'l', awayKey = fd > 0 ? 'l' : 'r';
    // an action in progress: hold its posture, press its strike once
    if (this.plan) {
      const pl = this.plan; pl.ttl--;
      if (pl.ttl <= 0 || (me.state === 'tech' && pl.fired)) { this.plan = null; }
      else { const out = { posture: pl.posture, tech: null }; if (!pl.fired && pl.delay-- <= 0) { out.tech = pl.tech; pl.fired = true; } return out; }
    }
    if (me.state !== 'free') return { posture: 'n', tech: null };
    this.cool--;
    const gap = o.gap, p = this.p;
    // 1. react to a technique the CPU can see
    if (seen.tech && !seen.util && seen.phase !== 'recovery' && this.rng() < this.readP && (seen.phase === 'startup' || seen.phase === 'active') && seen.gap < 150) {
      const ids = this.counterTo(seen, me, foe, gap); if (ids) { this.thought = 'READ ' + seen.tech + ' -> ' + ids; return this.begin(ids, me, foe, 6); }
    }
    if (this.cool > 0) return this.move(me, foe, gap, towardKey, awayKey);
    this.cool = Math.round((this.think + this.rng() * .08) * 120); for (const k in this.used) this.used[k] *= .93;
    // 2. punish a technique in recovery
    if (seen.tech && !seen.util && (seen.phase === 'recovery' || seen.recoil) && gap < 70 && this.rng() < this.readP + .1) {
      const fullIds = Object.keys(p.w).filter(id => KC.TECHS[id].full || KC.TECHS[id].pts[1] >= 500);
      const id = this.pickWeighted(me, gap, fullIds.length ? fullIds : null) || this.pickWeighted(me, gap); if (id) { this.thought = 'PUNISH ' + id; return this.begin(id, me, foe, 2); }
    }
    // 3. mistakes
    if (this.rng() < this.mistake * .5) { const id = KC.SCORING[Math.floor(this.rng() * KC.SCORING.length)].id; this.thought = 'MISTAKE ' + id; return this.begin(id, me, foe, 0); }
    // 4. proactive: throw something that reaches, or reposition
    if (this.rng() < this.aggr) {
      const id = this.pickWeighted(me, gap); if (id) { this.thought = 'ATTACK ' + id; return this.begin(id, me, foe, 0); }
    }
    if (p.crouch && this.rng() < p.crouch * .3) { this.plan = { posture: 'd', tech: null, ttl: 90, fired: true, delay: 0 }; return { posture: 'd', tech: null }; }
    if (this.rng() < p.pat) { this.walkT = 20 + Math.floor(this.rng() * 40); this.walkDir = this.rng() < .5 ? towardKey : awayKey; }
    return this.move(me, foe, gap, towardKey, awayKey);
  }
  counterTo(seen, me, foe, gap) {
    const p = this.p, h = seen.h, d = this.level >= 8 && p.habit;
    if (seen.air) return gap <= 24 && !seen.down ? 'upperPunch' : (seen.h === 'high' && this.rng() < .7 ? 'crouch' : null);
    if (h === 'low') return this.rng() < p.jump + .35 ? (this.rng() < .5 ? 'jumpSide' : 'jump') : (this.rng() < .5 ? 'frontFlip' : 'jump');
    if (h === 'high') return this.rng() < .7 ? 'crouch' : (gap < 40 ? 'squatPunch' : 'crouch');
    if (h === 'mid') return this.rng() < p.block + .15 ? 'block' : (gap > 24 ? 'backFlip' : 'block');
    return null;
  }
  begin(id, me, foe, delay) {
    const it = this.intentFor(id, me, foe);
    if (id === 'crouch') { this.plan = { posture: 'd', tech: null, ttl: 70, fired: true, delay: 0 }; return { posture: 'd', tech: null }; }
    if (id === 'jump') { this.plan = { posture: 'u', tech: null, ttl: 12, fired: true, delay: 0 }; return { posture: 'u', tech: null }; }
    this.plan = { posture: it.posture, tech: it.tech, ttl: 140, fired: false, delay };
    return { posture: it.posture, tech: null };
  }
  move(me, foe, gap, towardKey, awayKey) {
    const pref = this.p.gap;
    if (this.walkT > 0) { this.walkT--; return { posture: this.walkDir, tech: null }; }
    if (gap > pref + 10) return { posture: towardKey, tech: null };
    if (gap < pref - 14) return { posture: awayKey, tech: null };
    return { posture: 'n', tech: null };
  }
  /** attract mode: a cheating, showy AI that cycles every technique in range, with perfect reads */
  showcase(me, foe, bout, o) {
    const list = KC.SCORING.map(t => t.id).concat(['frontFlip', 'backFlip']), fd = foe.x >= me.x ? 1 : -1, towardKey = fd > 0 ? 'r' : 'l', awayKey = fd > 0 ? 'l' : 'r';
    if (this.plan) { const pl = this.plan; pl.ttl--; if (pl.ttl <= 0 || (me.state === 'tech' && pl.fired)) this.plan = null; else { const out = { posture: pl.posture, tech: null }; if (!pl.fired && pl.delay-- <= 0) { out.tech = pl.tech; pl.fired = true; } return out; } }
    if (me.state !== 'free') return { posture: 'n', tech: null };
    const id = (this.queue && this.queue.length ? this.queue[0] : null) || this.forced || list[this.showIdx % list.length], t = KC.TECHS[id], gap = o.gap;
    // reads: a perfect block of anything coming
    if (o.tech && !o.util && (o.phase === 'startup') && o.h !== 'low' && this.rng() < .5 && gap < 50 && !this.noBlock) return this.begin('block', me, foe, 0);
    if (t.util && gap < 90 && gap > 20 && this.rng() < .4) { if (this.queue && this.queue.length) this.queue.shift(); else this.showIdx++; return this.begin(id, me, foe, 0); }
    if (id === 'revPunch') { if (gap > 9) return { posture: towardKey, tech: null }; if (me.state === 'free') { if (this.queue && this.queue.length) this.queue.shift(); else this.showIdx++; return this.begin(id, me, foe, 0); } }
    if (this.inRange(id, gap, me) && gap >= t.reach[0] + 2 && this.rng() < .3) { if (this.queue && this.queue.length) this.queue.shift(); else this.showIdx++; this.forced = null; return this.begin(id, me, foe, 0); }
    if (gap > t.reach[1] * .7 + 6) return { posture: towardKey, tech: null };
    if (gap < t.reach[0] + 2) return { posture: awayKey, tech: null };
    return { posture: 'n', tech: null };
  }
}
KC.KarateAI = KarateAI;
