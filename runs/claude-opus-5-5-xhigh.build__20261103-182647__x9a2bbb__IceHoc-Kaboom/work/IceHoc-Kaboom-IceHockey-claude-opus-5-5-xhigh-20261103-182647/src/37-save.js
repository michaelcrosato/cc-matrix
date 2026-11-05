/* ---- SAVE: the Cup Run's progress (stars per chapter, choices, the ending, unlocks, drills) through game.saves'
 * autosave; RECORDS: big numbers kept in E.store (hardest shot, biggest hit, most goals, fights won, KABOOMs) ---- */
const Save = (() => {
  const fresh = () => ({ v: 1, stars: {}, choices: {}, done: {}, drills: {}, finished: false, badge: false });
  let data = fresh();
  game.saves.write = () => ({ data: JSON.parse(JSON.stringify(data)), place: 'Cup Run', level: 'Chapter ' + Math.min(5, nextChapter()) });
  game.saves.read = save => { if (save && save.data) data = Object.assign(fresh(), save.data); };
  function load() { if (HUB) return; try { const s = game.saves.latest && game.saves.latest(); if (s) { const got = game.saves.load(s.slot !== undefined ? s.slot : 'auto'); if (!got && s.data) data = Object.assign(fresh(), s.data); } } catch (e) { data = fresh(); } }
  function write() { if (HUB) return; try { game.saves.autosave(); } catch (e) { game.fail('save', e); } }
  const totalStars = () => Object.values(data.stars).reduce((a, s) => a + (s ? s.filter(Boolean).length : 0), 0);
  const nextChapter = () => { for (let n = 1; n <= 5; n++) if (!data.done[n]) return n; return 6; };
  const unlocked = n => n === 1 || !!data.done[n - 1];
  /** the cheats a player has unlocked by stars (11.3) */
  const CHEATS = [['bigHeads', 'BIG HEADS', 3], ['octoRain', 'OCTOPUS RAIN', 6], ['glowPuck', 'GLOW PUCK', 9], ['alwaysKaboom', 'ALWAYS KABOOM', 12], ['retro', 'RETRO RIGS', 15]];
  const cheatsOpen = () => CHEATS.filter(c => totalStars() >= c[2]);
  function chapterResult(n, stars, won) {
    const old = data.stars[n] || [false, false, false]; data.stars[n] = old.map((v, i) => v || !!stars[i]);
    if (won) data.done[n] = true; if (n === 5 && won) data.finished = true;
    write();
  }
  function drillDone(n) { data.drills[n] = true; if (Object.keys(data.drills).length >= 7) data.badge = true; write(); }
  function reset() { data = fresh(); write(); }
  return { load, write, totalStars, nextChapter, unlocked, CHEATS, cheatsOpen, chapterResult, drillDone, reset, get data() { return data; }, set data(v) { data = v; } };
})();
const Records = (() => {
  const KEY = 'ihk:records';
  const get = () => Object.assign({ shot: 0, hit: 0, goals: 0, fights: 0, kabooms: 0, games: 0, wins: 0 }, HUB ? {} : E.store.get(KEY, {}) || {});
  const put = r => { if (!HUB) E.store.set(KEY, r); };
  function wire() {
    Bus.sim('shot', e => { const m = Match.m; if (!m || m.cfg.mode === 'attract') return; const s = m.byId(e.by); if (!s || s.ctrl.kind === 'cpu') return; const r = get(); if (e.speed > r.shot) { r.shot = e.speed; put(r); } });
    Bus.sim('hit', e => { const m = Match.m; if (!m || m.cfg.mode === 'attract' || !e.big) return; const s = m.byId(e.by); if (!s || s.ctrl.kind === 'cpu') return; const r = get(); if (e.power > r.hit) { r.hit = e.power; put(r); } });
    Bus.sim('fight_end', e => { const m = Match.m; if (!m || m.cfg.mode === 'attract' || e.draw) return; const s = m.byId(e.winner); if (!s || !m.teams[s.team].human) return; const r = get(); r.fights++; put(r); });
    Bus.sim('kaboom_start', e => { const m = Match.m; if (!m || m.cfg.mode === 'attract' || !m.teams[e.team].human) return; const r = get(); r.kabooms++; put(r); });
    Bus.sim('final', e => { const m = Match.m; if (!m || m.cfg.mode === 'attract' || m.cfg.mode === 'drill') return; const r = get(); r.games++; const ht = m.teams.findIndex(t => t.human); if (ht >= 0 && e.winner === ht) r.wins++; for (const s of m.skaters) if (s.ctrl.kind !== 'cpu' || m.teams[s.team].human) r.goals = Math.max(r.goals, s.stats.goals); put(r); });
  }
  return { get, put, wire };
})();
