// The campaign's order, the save, and which scene follows which (section 4). The order itself is data: src/data/story/campaign.js.
(() => {
const E = My3D2dge, G = (window.GAME ||= {});
const fresh = () => ({ i: -1, diff: 'resident', flags: {}, ranks: {}, chapter: 1, seenEnding: false, patients: [], talked: {} });
const Flow = G.Flow = {
  prog: fresh(), origin: 'story', lastCase: null, fails: {}, overrideDiff: {},
  debug() { return { i: Flow.prog.i, ranks: Object.keys(Flow.prog.ranks).length, chapter: Flow.prog.chapter, ending: Flow.prog.seenEnding }; },
  setFlag(k) { Flow.prog.flags[k] = true; },
  bestRanks: () => E.store.get('tb:ranks', {}),
  starCount() { let n = 0; const b = Flow.bestRanks(); for (const c in b) for (const d in b[c]) if (b[c][d].star) n++; return n; },
  recordRank(caseId, diff, rank, star) {
    const b = Flow.bestRanks(), order = ['S', 'A', 'B', 'C', 'D']; b[caseId] = b[caseId] || {}; const old = b[caseId][diff];
    if (!old || order.indexOf(rank) < order.indexOf(old.rank) || (star && !old.star)) b[caseId][diff] = { rank: !old || order.indexOf(rank) < order.indexOf(old.rank) ? rank : old.rank, star: star || (old && old.star) };
    E.store.set('tb:ranks', b); Flow.prog.ranks[caseId] = rank;
  },
  unlocked(caseId) { if (caseId === 'glasshouse' || E.store.get('tb:unlockAll', false)) return true; const b = Flow.bestRanks(); if (b[caseId]) return true; const seen = E.store.get('tb:seen', {}); return !!seen[caseId]; },
  markSeen(caseId) { const s = E.store.get('tb:seen', {}); s[caseId] = true; E.store.set('tb:seen', s); },
  endingSeen: () => E.store.get('tb:ending', false),
  newGame(diff) { Flow.prog = fresh(); Flow.prog.diff = diff; Flow.origin = 'story'; Flow.fails = {}; Flow.overrideDiff = {}; G.game.settings.set('difficulty', diff); Flow.advance(); },
  /** the next thing in the campaign */
  advance() {
    const P = Flow.prog; P.i++; const e = G.CAMPAIGN[P.i]; Flow.origin = 'story';
    if (!e) { G.game.go('title'); return; }
    Flow.runEntry(e);
  },
  runEntry(e) {
    const game = G.game, P = Flow.prog;
    if (e.chapter) P.chapter = e.chapter;
    if (e.story) game.go('story', { node: e.story });
    else if (e.case) { Flow.markSeen(e.case); P.patientsNext = e.case; game.go('chart', { caseId: e.case }); }
    else if (e.ward) game.go('ward', { ward: e.ward, next: e.next, chapter: e.chapter || P.chapter });
    else if (e.credits) { P.seenEnding = true; E.store.set('tb:ending', true); game.go('credits', {}); }
    else Flow.advance();
  },
  place() { const e = G.CAMPAIGN[Flow.prog.i] || {}; return (e.ward ? (e.ward === 'ship' ? "Ship's ward" : 'Ward 3') : e.case ? G.CASES[e.case].title : 'St. Raz\'s'); },
  install(game) {
    game.saves.write = () => ({ data: JSON.parse(JSON.stringify(Flow.prog)), place: Flow.place(), level: 'Chapter ' + Flow.prog.chapter });
    game.saves.read = save => { Flow.load(save.data); };
  },
  load(data) { Flow.prog = Object.assign(fresh(), data); Flow.origin = 'story'; Flow.fails = {}; const e = G.CAMPAIGN[Flow.prog.i]; if (e) Flow.runEntry(e); else G.game.go('title'); },
  continueGame() { const s = G.game.saves.latest && G.game.saves.latest(); if (!s) return false; const r = G.game.saves.load(s.slot ?? s.id ?? 'auto'); return r !== false; },
  difficultyFor(caseId) { return Flow.overrideDiff[caseId] || G.game.settings.difficulty || Flow.prog.diff; },
  // ---------------------------------------------------------------- case outcomes
  startCase(caseId, o = {}) { const diff = Flow.difficultyFor(caseId), op = Object.assign({ caseId, difficulty: diff, seed: (Math.random() * 1e9) | 0 }, o), who = G.CASES[caseId].doctor; if (G.game.headless || !G.scenes.stinger) G.game.go('op', op); else G.game.go('stinger', { op, who }); },
  caseClosed(S, scene) {
    Flow.fails[S.caseId] = 0; delete Flow.overrideDiff[S.caseId];
    const dev = (G.Dev && G.Dev.changed()) || G.tuningChanged();
    if (!dev && S.mode !== 'lab') Flow.recordRank(S.caseId, S.diff, S.rank, S.star);
    if (S.caseId && !Flow.prog.patients.includes(S.caseId)) Flow.prog.patients.push(S.caseId);
    G.game.go('results', { S, dev, origin: Flow.origin });
  },
  caseLost(S, scene) { Flow.fails[S.caseId] = (Flow.fails[S.caseId] || 0) + 1; G.game.go('lost', { S, fails: Flow.fails[S.caseId] }); },
  restartPhase(scene) { if (!scene || !scene.S) return; G.Op.retryPhase(scene.S); scene.V.bark = null; G.game.resume(); },
  afterResults() { if (Flow.origin === 'files') { Flow.origin = 'story'; G.game.go('casefiles', {}); } else Flow.advance(); },
  quitToFiles() { Flow.origin = 'story'; G.game.go('casefiles', {}); },
};
})();
