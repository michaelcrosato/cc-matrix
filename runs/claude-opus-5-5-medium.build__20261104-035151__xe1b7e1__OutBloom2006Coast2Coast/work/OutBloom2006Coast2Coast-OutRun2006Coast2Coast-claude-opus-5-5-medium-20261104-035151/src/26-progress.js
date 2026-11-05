/* The save profile (PLAN §7.24): one versioned object in E.store('outbloom:profile'), migrated from older versions,
 * written after each run, mission, purchase and choice. Seeds, the garden's beds, the career, records, ghosts and the
 * endings seen. Where storage is blocked the game plays on for the visit. */
(() => {
'use strict';
const OB = window.OB, E = OB.E, KEY = 'outbloom:profile', V = 1;
const fresh = () => ({ v: V, seeds: 0, seenIntro: false,
  unlocked: { cars: ['primavera', 'orchidea'], paints: [], songs: [0, 1, 2, 3, 4], outfits: { marisol: [0], vivi: [0], juni: [0] }, mirror: false },
  last: { car: 'orchidea', paint: 0, driver: 'leo', passenger: 'marisol', station: 0, transmission: 'auto', outfit: 0 },
  career: {}, goals: {}, records: { stage: {}, route: {}, medals: {}, best: 0 }, hints: {}, beds: {}, runs: 0, givers: {} });
const MIGRATE = {
  // v0 (an early build) kept seeds and cars only
  0: p => Object.assign(fresh(), { seeds: p.seeds || 0, unlocked: Object.assign(fresh().unlocked, { cars: p.cars || ['primavera', 'orchidea'] }) })
};
let P = null, noSave = false;
const Profile = OB.Profile = {
  load() {
    let raw = null; try { raw = E.store.get(KEY, null); } catch (e) { raw = null; }
    if (raw && typeof raw === 'object') { let p = raw; while ((p.v || 0) < V && MIGRATE[p.v || 0]) p = MIGRATE[p.v || 0](p); P = Object.assign(fresh(), p, { v: V }); P.unlocked = Object.assign(fresh().unlocked, P.unlocked); P.records = Object.assign(fresh().records, P.records); }
    else P = fresh();
    return P;
  },
  get p() { return P || Profile.load(); },
  save() { if (noSave || OB.attractActive) return false; try { E.store.set(KEY, Profile.p); return true; } catch (e) { return false; } },
  noSave(on) { noSave = on; },
  reset() { P = fresh(); Profile.save(); OB.bus.emit('profile:reset', {}); },
  grant(n, why) { if (OB.attractActive) return 0; Profile.p.seeds += n; Profile.save(); OB.bus.emit('seeds', { n, why }); return n; },
  /** a garden bed: 'locked' (behind its mission), 'ready' (can be planted), 'bloomed' */
  bedState(b) { const p = Profile.p; if (p.beds[b.id]) return 'bloomed'; if (b.needs && !(p.career[b.needs] && p.career[b.needs].cleared)) return 'locked'; return 'ready'; },
  buy(id) {
    const p = Profile.p, b = OB.BEDS.find(x => x.id === id); if (!b) return { ok: false, why: 'No such bed' };
    const s = Profile.bedState(b); if (s === 'bloomed') return { ok: false, why: 'Already blooming' }; if (s === 'locked') return { ok: false, why: 'Locked' };
    if (p.seeds < b.cost) return { ok: false, why: 'Not enough seeds' };
    p.seeds -= b.cost; p.beds[id] = true; Profile.apply(b); Profile.save(); OB.bus.emit('bed:bloom', { id }); return { ok: true };
  },
  apply(b) {
    const u = Profile.p.unlocked;
    if (b.kind === 'car' && !u.cars.includes(b.id)) u.cars.push(b.id);
    if (b.kind === 'song' && !u.songs.includes(b.song)) u.songs.push(b.song);
    if (b.kind === 'paint' && !u.paints.includes(b.id)) u.paints.push(b.id);
    if (b.kind === 'outfit' && !u.outfits[b.who].includes(1)) u.outfits[b.who].push(1);
    if (b.kind === 'mirror') u.mirror = true;
  },
  unlockAll() { const p = Profile.p; for (const b of OB.BEDS) { p.beds[b.id] = true; Profile.apply(b); } for (const m of OB.MISSIONS) p.career[m.id] = p.career[m.id] || { cleared: true, rank: 'A', best: 0, paid: 'A' }; Profile.save(); },
  /** a mission's result: pays only the improvement over the best rank already paid */
  mission(id, res) {
    const p = Profile.p, m = OB.MISSION[id], cur = p.career[id] || { cleared: false, rank: null, best: null, paid: null };
    let seeds = 0;
    if (res.cleared) {
      const mult = OB.RANK_MULT, paid = cur.paid ? mult[cur.paid] : 0, now = mult[res.rank];
      if (now > paid) { seeds = Math.round(m.seeds * (now - paid)); cur.paid = res.rank; }
      if (!cur.rank || OB.RANKS.indexOf(res.rank) > OB.RANKS.indexOf(cur.rank)) cur.rank = res.rank;
      const first = !cur.cleared; cur.cleared = true; cur.best = res.value;
      p.career[id] = cur; if (seeds) Profile.grant(seeds, 'mission');
      const unlocked = []; for (const b of OB.BEDS) if (b.needs === id && first) unlocked.push(b.name);
      Profile.save(); return { seeds, unlocked, first };
    }
    p.career[id] = cur; Profile.save(); return { seeds: 0, unlocked: [] };
  },
  /** an arcade or Love in Bloom run's seeds: score / 20,000, 50 for a goal, 100 for each new goal ending seen */
  run(res) {
    const p = Profile.p; let seeds = Math.floor((res.score || 0) / 20000);
    if (res.goal) { seeds += 50; const g = p.goals[res.goal] || (p.goals[res.goal] = {}); if (!g[res.mood]) { g[res.mood] = true; seeds += 100; } }
    p.runs++; if (res.score > p.records.best) p.records.best = res.score;
    if (res.route && res.goal) { const r = p.records.route[res.route]; if (!r || res.score > r.score) p.records.route[res.route] = { score: res.score, time: res.time }; }
    Profile.grant(seeds, 'run'); Profile.save(); return seeds;
  },
  /** a Time Trial: the best time and ghost per stage (or the full coast) and its medal */
  trial(key, time, ghost) {
    const p = Profile.p, r = p.records.stage[key]; let best = false;
    if (!r || time < r.time) { p.records.stage[key] = { time, ghost: ghost.slice(0, 6000) }; best = true; }
    const par = key === 'full' ? 300 : OB.par(key), medal = time <= par * .98 ? 'bloom' : time <= par * 1.04 ? 'gold' : time <= par * 1.12 ? 'silver' : time <= par * 1.25 ? 'bronze' : null;
    const order = [null, 'bronze', 'silver', 'gold', 'bloom']; if (order.indexOf(medal) > order.indexOf(p.records.medals[key] || null)) p.records.medals[key] = medal;
    Profile.save(); return { best, medal };
  },
  hint(key) { const p = Profile.p; if (p.hints[key]) return false; p.hints[key] = true; Profile.save(); return true; }
};
OB.MIGRATE = MIGRATE;
})();
