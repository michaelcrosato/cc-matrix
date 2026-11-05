/* The Coast 2 Coast Tour's rules (PLAN §7.8, §8.8): OB.Rules[kind](mission, race) -> hooks { onStart, onStep,
 * isOver, result, hud } over a normal race, and OB.Tour.config(mission, choices) -> the race's config. Rival personas
 * are parameter sets for OB.Brain. */
(() => {
'use strict';
const OB = window.OB, E = OB.E, SEG = OB.SEG;
OB.PERSONAS = {
  kiki: { who: 'kiki', top: .92, brain: { line: .45, skill: 1.02, drift: true } },
  brambles: { who: 'brambles', top: .88, brain: { line: .05, skill: .95 } },
  lustres: { who: 'lustres', top: .9, brain: { line: .3, skill: 1 } },
  ottavio: { who: 'ottavio', top: 1.05, brain: { line: .3, skill: .92, brakeLate: .08 } }
};
/** a stage's par time (s): its length at the reference pace */
OB.par = id => Math.round(OB.World.get(id).len * SEG / (238 * OB.KMH));
const rankOf = (m, v) => { const low = m.unit === 's over par'; let r = -1; m.th.forEach((t, i) => { if (low ? v <= t : v >= t) r = i; }); return r; };
OB.rankOf = rankOf;

const base = (m, race, o) => Object.assign({
  value: 0, stats: {}, isOver: () => race.p1.finished,
  result() { const v = this.value, r = race.p1.timeUp ? -1 : rankOf(m, v); return { cleared: r >= 0, rank: r >= 0 ? OB.RANKS[r] : null, value: v, stats: this.stats }; }
}, o);
const sub = (race, n, fn) => race.subs.push(OB.bus.on(n, fn));

OB.Rules = {
  sprint(m, race) { return base(m, race, { onStep() { this.value = +race.clock.toFixed(1); }, hud: () => ({ label: 'TIME LEFT', value: race.clock.toFixed(1) + ' s' }) }); },
  driftduel(m, race) {
    const R = race.rivals[0], me = { pts: 0 };
    const h = base(m, race, { rival: 0,
      onStep(dt) { const c = R.car, cv = Math.abs(OB.World.info(OB.World.get(c.stage), c.z, c.x).curve); if (cv > 1.2 && race.phase === 'run' && !R.finished) this.rival += dt * c.v * (cv - 1.1) * 3.1; this.value = +((me.pts - this.rival) / Math.max(1, this.rival)).toFixed(3); this.stats = { 'Your drift points': Math.round(me.pts), 'Kiki': Math.round(this.rival) }; },
      hud() { return { label: 'DRIFT DUEL', bars: [['YOU', me.pts], ['KIKI', this.rival]] }; } });
    sub(race, 'drift:end', d => { if (d.car === race.p1.id) me.pts += d.score; });
    h.live = () => { const c = race.p1.car; return me.pts + (c.drift.on ? c.drift.score : 0); };
    return h;
  },
  draftdash(m, race) {
    const R = race.rivals[0];
    return base(m, race, { rival: 0, mine: 0,
      onStep(dt) { if (race.phase !== 'run') return; const c = race.p1.car; if (c.slip > .5 && !race.p1.finished) this.mine += dt * c.v / 10; if (!R.finished) this.rival += dt * R.car.v / 10 * .42; const lead = race.p1.finished && (!R.finished || race.p1.finishT < R.finishT) ? 1.25 : 1, rl = R.finished && (!race.p1.finished || R.finishT < race.p1.finishT) ? 1.25 : 1; this.value = +((this.mine * lead - this.rival * rl) / Math.max(1, this.rival * rl)).toFixed(3); this.stats = { 'Your draft points': Math.round(this.mine), 'The Brambles': Math.round(this.rival) }; },
      hud() { return { label: 'DRAFT DASH', bars: [['YOU', this.mine], ['BRAMBLES', this.rival]] }; } });
  },
  knockout(m, race) {
    const order = {}, h = base(m, race, {
      onStart() { },
      onStep() { const P = race.p1; if (P.finished) { const alive = race.rivals.filter(r => !r.out); const second = alive.filter(r => r.finished).sort((a, b) => a.finishT - b.finishT)[0]; this.place = P.place; this.lead = second ? second.finishT - P.finishT : 9; } this.stats = { 'Place': P.place, 'Racers left': 1 + race.rivals.filter(r => !r.out).length }; },
      isOver: () => race.p1.finished || race.p1.knocked,
      result() { const P = race.p1; if (P.knocked) return { cleared: false, rank: null, value: 0, stats: this.stats }; const pl = P.place, lead = this.lead || 0; const r = pl > 2 ? -1 : pl === 2 ? 0 : lead >= 5 ? 3 : lead >= 2 ? 2 : 1; return { cleared: r >= 0, rank: r >= 0 ? OB.RANKS[r] : null, value: pl, stats: this.stats }; },
      hud: () => ({ label: 'LAST ONE WILTS', value: 'PLACE ' + race.p1.place + ' / ' + (1 + race.rivals.filter(r => !r.out).length) }) });
    // at each checkpoint, once everyone still in has passed it (or 8 s after the leader), the last one wilts
    const passed = {};
    const check = (stage, id) => { (passed[stage] || (passed[stage] = [])).push(id); };
    sub(race, 'checkpoint', d => { if (d.car === race.p1.id) check(d.id, 'p1'); });
    sub(race, 'rival:checkpoint', d => check(d.stage, d.car));
    h.onStep2 = h.onStep;
    h.onStep = function (dt) {
      h.onStep2(dt);
      for (const st in passed) {
        if (order[st]) continue;
        const inRace = ['p1'].concat(race.rivals.filter(r => !r.out).map(r => r.id)), got = passed[st].filter(id => inRace.includes(id));
        passed[st].t = (passed[st].t || 0) + dt;
        if (got.length >= inRace.length - 1 && (got.length === inRace.length || passed[st].t > 8)) {
          order[st] = true; const last = inRace.find(id => !got.includes(id)) || got[got.length - 1];
          if (last === 'p1') { race.p1.knocked = true; OB.bus.emit('rival:out', { id: 'p1' }); }
          else { const R = race.rivals.find(r => r.id === last); R.out = true; OB.bus.emit('rival:out', { id: R.who, name: R.name }); }
        }
      }
    };
    return h;
  },
  collect(m, race) {
    const h = base(m, race, { got: 0, stings: 0,
      onStart() {
        const st = m.route[0], S = OB.World.get(st), r = OB.rand.stream('collect:' + m.id, 3), z0 = 60 * SEG, z1 = (S.len - 30) * SEG, n = m.count, lanes = OB.STAGES[st].lanes;
        for (let i = 0; i < n; i++) {
          const z = z0 + (z1 - z0) * (i + .5) / n, x = Math.sin(i * .9 + r() * 2) * .6;
          if (m.obj === 'ribbons') { const T = race.traffic, l = Math.floor(r() * (lanes - 1)), v = 60 + r() * 20, a = T.add({ stage: st, z, lane: l, type: 'sedan', v, color: '#ffffff', ribbon: { dx: -.14 } }), b = a && T.add({ stage: st, z, lane: l + 1, type: 'sedan', v, color: '#ffffff', ribbon: { dx: .14 } }); if (!a || !b) continue; a.ribbon.pair = b; b.ribbon.pair = a; OB.Objects.add(race, { kind: 'ribbon', stage: st, z, x: 0, follow: [a, b], r: .14, want: 'hit', len: 300, onHit: (c, o) => { if (!o.snapped) { o.snapped = true; h.got++; OB.bus.emit('obj:snap', { car: c.id }); } } }); }
          else OB.Objects.add(race, { kind: { balloons: 'balloon', gnomes: 'gnome', bouquets: 'bouquet' }[m.obj], stage: st, z, x, r: .22, want: 'hit', onHit: c => { h.got++; OB.bus.emit({ balloons: 'obj:pop', gnomes: 'obj:bonk', bouquets: 'obj:bouquet' }[m.obj], { car: c.id }); } });
          if (m.bees && i % 3 === 1) OB.Objects.add(race, { kind: 'bee', stage: st, z: z + 300, x0: 0, x: 0, sway: [.8, 1.2 + r(), r() * 6], r: .2, want: 'avoid', onHit: c => { h.stings++; OB.bus.emit('obj:sting', { car: c.id }); } });
        }
      },
      onStep() { this.value = this.got - (m.bees ? 2 * this.stings : 0); this.stats = { [m.unit[0].toUpperCase() + m.unit.slice(1)]: this.value, 'Out of': m.count }; if (m.bees) this.stats['Bee stings'] = this.stings; },
      hud() { return { label: m.title.toUpperCase(), value: this.value + ' / ' + m.count }; } });
    return h;
  },
  clean(m, race) {
    const par = OB.par(m.route[0]);
    return base(m, race, { onStep() { const c = race.p1.car; this.value = +(race.raceT - par).toFixed(1); this.stats = { 'Contacts': c.contacts, 'Time': race.raceT.toFixed(1) + ' s', 'Par': par + ' s' }; },
      isOver: () => race.p1.finished || race.p1.car.contacts > 0,
      result() { const c = race.p1.car; if (c.contacts > 0) return { cleared: false, rank: null, value: this.value, stats: this.stats, why: 'A scratch!' }; const r = rankOf(m, this.value); return { cleared: r >= 0, rank: r >= 0 ? OB.RANKS[r] : null, value: this.value, stats: this.stats }; },
      hud: () => ({ label: 'NOT A SCRATCH', value: 'CONTACTS ' + race.p1.car.contacts }) });
  },
  speedkeep(m, race) {
    return base(m, race, { t: 0, above: 0, onStep(dt) { if (race.phase !== 'run' || race.p1.finished) return; if (race.raceT > 8) { this.t += dt; if (race.p1.car.v >= m.v) this.above += dt; } this.value = +(this.above / Math.max(1, this.t)).toFixed(3); this.stats = { 'Over 240': Math.round(this.value * 100) + '%' }; },
      hud() { return { label: 'OVER ' + OB.speedText(m.v) + ' ' + OB.speedUnit(), value: Math.round(this.value * 100) + '%' }; } });
  },
  heartbreak(m, race) {
    const R = race.rivals[0];
    const h = base(m, race, { mine: 20, theirs: 20, acc: 0, onStep(dt) {
      if (race.phase !== 'run' || race.p1.finished) return;
      const behind = race.progress(R) > race.progress(race.p1); this.acc += dt;
      if (this.acc >= 2) { this.acc -= 2; if (behind) this.mine = Math.max(0, this.mine - 1); else this.theirs = Math.max(0, this.theirs - 1); }
      if (this.wasBehind !== undefined && this.wasBehind !== behind) { if (behind) { this.mine = Math.max(0, this.mine - 2); this.theirs += 2; } else { this.theirs = Math.max(0, this.theirs - 2); this.mine += 2; OB.bus.emit('rival:pass', { id: R.who, by: 'p1' }); } }
      this.wasBehind = behind; this.value = this.theirs === 0 ? 99 : this.mine; this.stats = { 'Your petals': this.mine, 'The Lustres': this.theirs };
    }, isOver() { return race.p1.finished || this.mine <= 0; },
    result() { const r = this.mine <= 0 ? -1 : rankOf(m, this.value); return { cleared: r >= 0, rank: r >= 0 ? OB.RANKS[r] : null, value: this.value, stats: this.stats }; },
    hud() { return { label: 'HEARTBREAKERS', bars: [['YOU', this.mine], ['LUSTRES', this.theirs]], max: 40 }; } });
    return h;
  },
  count(m, race) {
    const h = base(m, race, { n: 0, onStep() { this.value = this.n; this.stats = { 'Near misses': this.n }; }, hud() { return { label: 'CLOSE CALLS', value: this.n + ' / ' + m.th[2] }; } });
    sub(race, m.what, d => { if (d.car === race.p1.id) h.n++; });
    return h;
  },
  photo3(m, race) {
    const h = base(m, race, { stars: 0, shots: 0,
      onStart() {
        const st = m.route[0], S = OB.World.get(st);
        for (const f of [.27, .55, .82]) {
          const z = Math.floor(f * S.len) * SEG, box = { z, done: false, minV: 999 };
          OB.Objects.add(race, { kind: 'photo', stage: st, z, x: 0, r: .55, want: 'none', box });
          OB.Objects.add(race, { kind: 'photoEnd', stage: st, z: z + 2 * SEG, x: 0, r: 0, want: 'none' });
          h.boxes = (h.boxes || []).concat(box);
        }
      },
      onStep() {
        const c = race.p1.car;
        for (const b of this.boxes || []) {
          if (b.done || c.stage !== m.route[0]) continue;
          if (c.z >= b.z - 150 && c.z <= b.z + 2 * SEG + 150) { b.minV = Math.min(b.minV, c.v); if (c.v < 8 && Math.abs(c.x) < .5) b.stopped = true; }
          if (b.stopped || c.z > b.z + 2 * SEG + 150) { b.done = true; const r = b.stopped ? 0 : b.minV < 50 ? 1 : b.minV < 100 ? 2 : 3; this.stars += 3 - r; this.shots++; OB.bus.emit('obj:photo', { car: c.id, rating: r }); }
        }
        this.value = this.stars; this.stats = { 'Stars': this.stars, 'Shots': this.shots + ' / 3' };
      },
      hud() { return { label: 'THE PERFECT SHOT', value: '★ ' + this.stars + '   SHOT ' + this.shots + '/3' }; } });
    return h;
  },
  love(m, race) {
    return base(m, race, { onStep() { const P = race.p1; this.value = P.petalMax ? +(P.petals / P.petalMax).toFixed(3) : 0; this.stats = { 'Petals': P.petals, 'Grade': OB.gradeOf(this.value) }; }, isOver: () => race.p1.finished,
      result() { const r = race.p1.timeUp || !race.p1.finished ? -1 : rankOf(m, this.value); return { cleared: r >= 0, rank: r >= 0 ? OB.RANKS[r] : null, value: this.value, stats: this.stats }; } });
  }
};

OB.Tour = {
  /** the race config for a mission, with the player's choices from the garage */
  config(m, ch = {}) {
    const rivals = m.rival === 'all' ? ['kiki', 'brambles', 'lustres', 'ottavio'].map(k => OB.PERSONAS[k]) : m.rival ? [OB.PERSONAS[m.rival]] : [];
    const passenger = OB.PASSENGERS.includes(m.giver) ? m.giver : ch.passenger || 'marisol';
    return { mode: m.kind === 'love' ? 'love' : 'mission', mission: m.id, route: m.route ? { stages: m.route, end: m.end } : null, rules: m, rivals,
      clock: m.kind === 'sprint' ? m.clock : m.kind === 'love' ? undefined : 'up', car: ch.car || 'orchidea', paint: ch.paint, driver: ch.driver || 'leo', passenger, outfit: ch.outfit || 0,
      transmission: ch.transmission, seed: OB.rand.hash(m.id) % 1000 + 1, traffic: m.kind === 'clean' ? 1.2 : 1, requestTypes: m.kind === 'love' ? null : [] };
  },
  unlocked(m, profile) { if (m.needs) return Object.values(profile.career).filter(c => c.cleared).length >= m.needs; return !m.after || !!(profile.career[m.after] && profile.career[m.after].cleared); }
};
})();
