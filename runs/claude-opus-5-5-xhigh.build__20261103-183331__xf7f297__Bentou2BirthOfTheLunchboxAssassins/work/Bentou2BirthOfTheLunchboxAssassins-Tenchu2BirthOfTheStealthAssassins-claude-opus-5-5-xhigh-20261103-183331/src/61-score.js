/* ---- SCORE, RANKS, UNLOCKS, SAVES. The bus counts what happened; the formula turns it into a score; bento grades are
 * the ranks; high ranks unlock tools; the save keeps the story's progress, best ranks and the Shadow Trial's board ---- */
const RANKS = [[2600, 'Grand Kaiseki', 'GK'], [2000, 'Makunouchi', 'M'], [1400, 'Ekiben', 'E'], [600, 'Hinomaru', 'H'], [-1e9, 'Leftovers', 'L']];   // (the balance pass: a loud run that finishes still earns Hinomaru)
const RANK_ORDER = RANKS.map(r => r[1]);
const Score = {};
B.on('silentCut', e => { const M = B.M; if (!M) return; M.stats.silentCuts++; M.stats.cutKinds[e.kind] = (M.stats.cutKinds[e.kind] || 0) + 1; if (e.victim.kind === 'civ' && !e.victim.disguised) M.stats.civiliansHarmed++; });
B.on('kill', e => { const M = B.M; if (!M || e.how === 'cut') return; if (e.victim.kind === 'boss' || e.victim.kind === 'spirit') return; M.stats.kills++; if (e.how === 'poison') M.stats.cleanKills++; if (e.victim.kind === 'civ' && !e.victim.harmed && !e.victim.target) { e.victim.harmed = 1; M.stats.civiliansHarmed++; } });
B.on('toolUsed', e => { if (B.M) { B.M.stats.toolsUsed++; B.M.flags['used_' + e.tool] = true; } });
B.on('mark', () => { if (B.M) B.M.stats.marks++; });
/** the story score of a finished mission */
Score.story = (M, par) => {
  const s = M.stats, parT = (par || 600) * T('parTimeMul'), other = s.kills;
  const parts = [['Mission complete', 1000], ['Silent Cuts', 150 * s.silentCuts], ['Other kills', 25 * other], ['Clean kills', 100 * s.cleanKills], ['Optional tasks', 300 * s.optionalDone],
    ['Detections', -150 * Math.min(3, s.detections)], ['Unseen', s.detections === 0 ? 400 : 0], ['Civilians harmed', -400 * s.civiliansHarmed], ['Retries', -200 * s.retries],
    ['Untouched', s.damageTaken < .5 ? 200 : 0], ['Time bonus', Math.round(Math.min(500, Math.max(0, parT - s.time)))]];
  return { total: parts.reduce((a, p) => a + p[1], 0), parts };
};
Score.rank = sc => RANKS.find(r => sc >= r[0]);
Score.rankAtLeast = (have, need) => RANK_ORDER.indexOf(have) >= 0 && RANK_ORDER.indexOf(have) <= RANK_ORDER.indexOf(need);
/** the trial / hub round's score (the same rules alone and in a session) */
Score.round = (M, o = {}) => {
  const s = M.stats, target = M.level.target ? Mission.find(M, M.level.target) : null, down = target && !target.alive;
  let sc = (down ? 2000 : 0) + (o.escaped && down ? 1000 : 0) + 250 * s.silentCuts + 50 * s.kills + (s.detections === 0 ? 600 : -150 * s.detections) - 500 * s.civiliansHarmed;
  if (o.escaped) sc += Math.min(1200, Math.max(0, Math.round(4 * (300 - s.time))));
  return Math.max(0, Math.round(sc));
};
/** unlocks earned by a mission's rank: [tool ids] */
Score.unlocks = (missionId, rank, save) => {
  const out = [];
  for (const id of TOOL_ORDER) {
    const t = B.get('tool', id); if (!t.unlock || save.tools.includes(id)) continue;
    if ((t.unlock.mission === missionId || t.unlock.mission === 'any') && Score.rankAtLeast(rank, t.unlock.rank)) out.push(id);
  }
  return out;
};
/* ---- THE SAVE: game.saves (three slots and the autosave); a hub session never writes ---- */
const Save = { data: null };
Save.fresh = (char = 'sojiro') => ({ v: 1, character: char, nextMission: 'training', completed: {}, best: {}, tools: [], lastLoadout: {}, flags: {}, playSeconds: 0, story: false });
Save.get = () => Save.data || (Save.data = Save.fresh());
const MISSION_NAMES = { training: 'The Trial of the Second Tier', m1: 'Rice and Ash', m2: 'The Fort at Kiri Lake', m3: 'Moon over Kokaku', ending: 'Fed by All' };
game.saves.write = () => { const d = Save.get(); return { data: d, place: MISSION_NAMES[d.nextMission] || 'The Jubako-ya', level: (B.CHARS[d.character] || B.CHARS.sojiro).name }; };
game.saves.read = s => { Save.data = Object.assign(Save.fresh(), s.data || {}); };
Save.write = () => { if (HUBACTIVE || (B.M && B.M.mode === 'attract')) return false; try { return game.saves.save('auto'); } catch (e) { return false; } };
Save.record = (missionId, char, sc, rank) => {
  const d = Save.get(); d.completed[missionId] = true;
  const b = (d.best[missionId] = d.best[missionId] || {}), old = b[char];
  if (!old || sc > old.score) b[char] = { score: sc, rank };
  const un = Score.unlocks(missionId, rank, d); for (const t of un) d.tools.push(t);
  return un;
};
/** the Shadow Trial's board: the top 5 runs, and the best one's ghost (10 samples a second) */
Save.trial = () => E.store.get('bentou:trial', { board: [], ghost: null });
Save.trialAdd = (entry, track) => {
  if (HUBACTIVE) return 0;
  const t = Save.trial(); t.board.push(entry); t.board.sort((a, b) => b.score - a.score); const place = t.board.indexOf(entry) + 1; t.board = t.board.slice(0, 5);
  if (place === 1 && track && track.length) t.ghost = { score: entry.score, char: entry.char, track };
  E.store.set('bentou:trial', t); return place;
};
B.Score = Score; B.Save = Save; B.RANKS = RANKS; B.MISSION_NAMES = MISSION_NAMES;
