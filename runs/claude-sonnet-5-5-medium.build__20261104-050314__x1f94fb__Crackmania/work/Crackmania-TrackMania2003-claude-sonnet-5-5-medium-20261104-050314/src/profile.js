// The profile: coppers, medals, records, ghosts, custom tracks, paint, settings glue. Versioned, in E.store (localStorage).
const E = globalThis.My3D2dge;
const KEY = 'crackmania', VERSION = 2;
const fresh = () => ({ v: VERSION, coppers: 120, medals: {}, best: {}, ghosts: {}, puzzles: {}, survival: {}, slots: [null, null, null, null, null, null], paint: '#e8452a', car: null, story: {}, cup: [], settings: { cam: 0, assist: true }, runs: 0, respawns: 0, seen: {} });
let data = fresh(), mem = {};
const store = {
  get(k) { try { const s = typeof localStorage !== 'undefined' ? localStorage.getItem(k) : mem[k]; return s ? JSON.parse(s) : null; } catch (e) { return mem[k] ? JSON.parse(mem[k]) : null; } },
  set(k, v) { const s = JSON.stringify(v); try { if (typeof localStorage !== 'undefined') localStorage.setItem(k, s); else mem[k] = s; } catch (e) { mem[k] = s; } }
};
export const profile = {
  get data() { return data; },
  load() { const d = store.get(KEY); data = d && d.v === VERSION ? Object.assign(fresh(), d) : d ? migrate(d) : fresh(); return data; },
  save() { store.set(KEY, data); },
  reset() { data = fresh(); store.set(KEY, data); },
  medal(id) { return data.medals[id] || 0; },
  /** record a finished run: returns { medal, newMedal, reward, record } */
  record(id, steps, medal, ghost) {
    const old = data.medals[id] || 0, best = data.best[id];
    const out = { medal, newMedal: medal > old, reward: 0, record: best === undefined || steps < best };
    if (medal > old) { for (let m = old + 1; m <= medal; m++) out.reward += [0, 30, 50, 80, 120][m]; data.medals[id] = medal; data.coppers += out.reward; }
    if (out.record) { data.best[id] = steps; if (ghost) data.ghosts[id] = ghost; }
    data.runs++; this.save(); return out;
  },
  spend(n) { if (data.coppers < n) return false; data.coppers -= n; this.save(); return true; },
  earn(n) { data.coppers += n; this.save(); },
  unlockedCourse(ids, i) { return i === 0 || data.medals[ids[i - 1]] >= 1 || data.devUnlock; }
};
function migrate(d) { return Object.assign(fresh(), d, { v: VERSION }); }
