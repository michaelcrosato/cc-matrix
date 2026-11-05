/* OutBloom — the save profile: one versioned object in E.store('outbloom:profile') with a migration table; seeds, the
 * Garage Garden, the career (rank per mission), goals and endings seen, records and ghosts, hints shown. Written after
 * each run, mission, purchase and settings change, never on page close. Blocked storage: the game plays on for the
 * visit. In an AI Hub session the client's empty storage means a fresh profile. The attract mode never writes. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB;
const KEY = 'outbloom:profile', V = 1;
const fresh = () => ({ v: V, seeds: 0, seenIntro: false, givers: {},
  unlocked: { cars: ['primavera', 'orchidea'], editions: [], paints: [], songs: [0, 1, 2, 3, 4], outfits: { marisol: [0], vivi: [0], juni: [0] }, mirror: false, beds: [] },
  last: { car: 'orchidea', paint: 0, edition: false, driver: 'leo', passenger: 'marisol', outfit: 0, station: 0, transmission: 'auto' },
  career: {}, goals: {}, records: { stage: {}, route: {}, medals: {} }, hints: {}, runs: 0, totalSeeds: 0 });
const MIGRATE = { 0: p => Object.assign(fresh(), { seeds: p.seeds || 0, career: p.career || {} }) };
const P = OB.Profile = {
  data: fresh(), blocked: false,
  load() {
    let p = null; try { p = E.store.get(KEY, null); } catch (e) { this.blocked = true; }
    if (p && typeof p === 'object') { let v = p.v || 0; while (v < V && MIGRATE[v]) { p = MIGRATE[v](p); v = p.v || v + 1; } this.data = Object.assign(fresh(), p); for (const k of ['unlocked', 'last', 'records']) this.data[k] = Object.assign(fresh()[k], p[k] || {}); }
    else this.data = fresh();
    return this.data;
  },
  save() { if (OB.Attract && OB.Attract.on) return false; try { E.store.set(KEY, this.data); return true; } catch (e) { this.blocked = true; return false; } },
  reset() { this.data = fresh(); this.save(); },
  /** seeds in (a reason for the toast) */
  grant(n, why) { n = Math.max(0, Math.round(n)); if (!n) return 0; this.data.seeds += n; this.data.totalSeeds += n; this.save(); OB.bus.emit('seeds', { n, why }); return n; },
  /** a bed: its state 'locked' (its mission not cleared), 'plantable' (affordable or not), 'bloomed' */
  bedState(b) { const d = this.data; if (d.unlocked.beds.includes(b.id)) return 'bloomed'; if (b.needs && !(d.career[b.needs] && d.career[b.needs].cleared)) return 'locked'; return 'plantable'; },
  canBuy(b) { return this.bedState(b) === 'plantable' && this.data.seeds >= b.cost; },
  buy(id) {
    const b = OB.BED[id]; if (!b || !this.canBuy(b)) return false;
    const d = this.data; d.seeds -= b.cost; d.unlocked.beds.push(b.id);
    if (b.kind === 'car') d.unlocked.cars.push(b.car);
    else if (b.kind === 'edition') d.unlocked.editions.push(b.car);
    else if (b.kind === 'song') d.unlocked.songs.push(b.song);
    else if (b.kind === 'paint') d.unlocked.paints.push(b.pack);
    else if (b.kind === 'outfit') d.unlocked.outfits[b.who].push(1);
    else if (b.kind === 'mirror') d.unlocked.mirror = true;
    this.save(); OB.bus.emit('garden:bloom', { id }); return true;
  },
  /** a mission's result: pays only the improvement over the best rank already paid; opens the next postcards */
  missionResult(id, res) {
    const m = OB.MISSION[id], d = this.data, c = d.career[id] || (d.career[id] = { cleared: false, rank: null, paid: 0, best: null, tries: 0 });
    c.tries++; let paid = 0;
    if (res.cleared) {
      const mul = OB.RANK_MUL[res.rank] || 1, worth = Math.round(m.seeds * mul);
      if (worth > c.paid) { paid = worth - c.paid; c.paid = worth; }
      const better = !c.rank || OB.RANKS.indexOf(res.rank) > OB.RANKS.indexOf(c.rank);
      if (better) c.rank = res.rank;
      c.cleared = true; if (res.best !== undefined && (c.best === null || res.best > c.best)) c.best = res.best;
    }
    if (paid) this.grant(paid, m.title);
    this.save(); return { paid, career: c };
  },
  missionOpen(id) {
    const m = OB.MISSION[id], d = this.data;
    if (m.finale) return this.clearedCount() >= OB.FINALE_AT;
    const firsts = ['B1', 'M1', 'V1', 'J1']; if (firsts.includes(id)) return true;
    return OB.MISSIONS.some(o => o.opens.includes(id) && d.career[o.id] && d.career[o.id].cleared);
  },
  clearedCount() { return Object.values(this.data.career).filter(c => c.cleared).length; },
  /** an arcade or Love in Bloom run: seeds for the score, the goal and each ending seen for the first time */
  runResult(r) {
    const d = this.data, p = r.players[0]; let n = Math.floor(p.score / OB.ECONOMY.scorePerSeed);
    if (p.goal) { n += OB.ECONOMY.goalSeeds; const g = d.goals[p.goal] || (d.goals[p.goal] = { bloom: false, bud: false, wilt: false }); if (r.mood && !g[r.mood]) { g[r.mood] = true; n += OB.ECONOMY.endingSeeds; } }
    d.runs++;
    if (p.route && p.finished) { const rec = d.records.route[p.route]; if (!rec || p.score > rec.score) d.records.route[p.route] = { score: p.score, t: p.time }; }
    this.grant(n, 'the run'); this.save(); return n;
  },
  /** a Time Trial record for a stage (or the Full Coast): its time and ghost */
  trialRecord(key, ms, ghost, stages, splits) { const R = this.data.records.stage, old = R[key]; if (old && old.ms <= ms) return false; R[key] = { ms, ghost: ghost.slice(0, 6000), stages, splits: splits || [] }; this.save(); return true; }
};
})();
