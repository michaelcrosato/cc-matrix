/* ---- THE TEST HANDLE: game.debug, read by the headless suites and by the dev panel. It reports the state a test
 * needs and drives the match with the same inputs a person would use. ---- */
G.debugHandle = {
  snapshot() {
    const m = G.match;
    const I = m ? m.I : null;
    return {
      scene: game.sceneName,
      mode: m ? m.cfg.mode : null,
      ui: { device: game.input.lastDevice, glyphs: G.setting('buttons'), touchGate: G.touchOnly() },
      match: m ? { innings: I.k, runs: I.runs, wkts: I.wkts, balls: I.legal, over: I.over, ballInOver: I.ballInOver, target: I.target,
        striker: m.striker ? m.batterName(m.striker) : null, bowler: m.bowlerName(), hype: m.hype.slice(), fire: m.fire.slice(), phase: m.phase, result: m.result ? m.result.kind : null,
        review: m.review.slice(), freeHit: !!m.freeHit } : null,
      ball: m && m.ball ? { phase: m.ball.phase, x: Math.round(m.ball.x), y: Math.round(m.ball.y), z: Math.round(m.ball.z * 10) / 10, speed: Math.round(m.ball.speed || 0), pitched: m.ball.pitched } : null,
      last: m && m.log.length ? m.log[m.log.length - 1] : null,
      logLen: m ? m.log.length : 0,
      deliveries: m ? m.log.slice(0, 3).map(r => r.delivery + '@' + r.kmh) : [],
      coverage: m ? Object.assign({}, m.coverage) : {},
      stats: m ? Object.assign({}, m.stats) : {},
      dev: { open: G.dev.open, flags: Object.assign({}, G.devFlags) },
      attract: { seg: G.attractSeg, note: G.attractNote || null },
      hub: { active: G.HUB.active, started: G.HUB.started, resulted: G.HUB.resulted, ended: G.HUB.ended },
      story: { chapter: G.profile().chapter, stars: G.profile().stars.slice() },
      toss: G.tossStage || null,
      clips: (G.highlights || []).length,
      timing: m ? { until: m.arriveAbs !== null ? +(m.arriveAbs - m.t).toFixed(3) : null, meter: m.delivery ? +m.delivery.meter.toFixed(3) : null, dt: m.delivery ? +(m.delivery.t).toFixed(3) : null, dur: m.delivery ? m.delivery.dur : null, ringT: m.catchRing ? +m.catchRing.t.toFixed(3) : null, held: !!m.humanFieldHold, reviewable: !!m.reviewable, hype: m.hype.slice(), lesson: G.lessonPass === undefined ? null : G.lessonPass, sceneTime: G.game.time } : null,
      fielders: m ? m.fielders.filter(f => f.human).map(f => [Math.round(f.x), Math.round(f.y)]) : [],
      ballXY: m && m.ball ? [Math.round(m.ball.x), Math.round(m.ball.y), Math.round(m.ball.z * 10) / 10] : null,
      inputs: game.players ? game.players.length : 1,
      rigs: G._rigs ? Object.keys(G._rigs).length : 0,
      batHand: G._rigs && G._rigs.bat0 ? G._rigs.bat0.hand('R').map(v => Math.round(v * 10) / 10) : null,
      batPos: G.match && G.match.striker ? [G.W.PX + 8, G.match.striker.y] : null,
      errors: game.errors.length
    };
  },
  // the step that presses a shot for a PERFECT on the current delivery
  idealPress() { const m = G.match; if (!m || m.phase !== 'flight' || m.arriveAbs === null) return null; return m.arriveAbs - G.game.time - 0.12; },
  startMatch(cfg, opts) { G.startMatch(cfg, opts || {}); },
  lesson: id => G.startLesson(G.LESSONS.find(l => l.id === id)),
  chapter: id => { G.chapter = G.CHAPTERS.find(c => c.id === id); G.game.go('chapterMatch'); },
  tune: (k, v) => G.tuneSet(k, v),
  tuneRead: k => G.T(k),
  // the light state the play tests read every step: the phase, the timing, the balls, the human fielders
  live: () => {
    const m = G.match;
    if (!m) return { scene: game.sceneName };
    return { scene: game.sceneName, phase: m.phase, logLen: m.log.length, until: m.arriveAbs !== null ? m.arriveAbs - m.t : null,
      dt: m.delivery ? m.delivery.t : null, dur: m.delivery ? m.delivery.dur : null, meter: m.delivery ? m.delivery.meter : null,
      ring: !!m.catchRing, ringT: m.catchRing ? m.catchRing.t : null, held: !!m.humanFieldHold, reviewable: !!m.reviewable, ball: m.ball ? [m.ball.x, m.ball.y, m.ball.z] : null,
      fielders: m.fielders.filter(f => f.human).map(f => [f.x, f.y]), balls: m.I ? m.I.legal : 0, innings: m.I ? m.I.k : -1,
      lesson: G.lessonPass === undefined ? null : G.lessonPass, scoreRuns: m.I ? m.I.runs : 0, throws: m.stats.throws, hype: m.hype.slice() };
  },
  // the screens a person sees only at a review, a close run-out or a replay: set up for a screenshot or a check
  thirdUmpire: out => { G.thirdUmpire = { out: !!out, margin: 40, name: 'Edie Pluckrose', t: 0 }; },
  owlEye: () => {
    const m = G.match;
    m.reviewable = { batter: m.striker, call: 'notout', truth: 'out', side: m.battingSide, how: 'lbw' };
    m.pitchAt = { x: G.W.PX + 4, y: G.W.BAT_CREASE + 110, z: 0 };
    m.setPhase('dead', 4);
    m.phase = 'dead';
  },
  replay: () => G.requestReplay(3, 'SIX'),
  initials: score => { G.game.go('initials', { mode: 'bat', score }); },
  highlights: () => { G.game.go('highlights'); },
  attractSegment: () => G.attractSeg,
  humans: () => [G.humansOf(0).length, G.humansOf(1).length],
  replays: () => ({ playing: !!G.replay, clips: (G.highlights || []).length, thirdUmpire: !!G.thirdUmpire }),
  table: (mode, score) => G.tableQualifies(mode, score),
  tableRows: mode => G.tableOf(mode).length,
  profile: () => G.profile(),
  glyph: action => ({ xbox: G.setting('buttons') !== 'PlayStation', letter: G.xboxGlyph(action), ps: G.PS[action] || 'cross' }),
  aim: () => G.aimHeld,
  marker: () => (G.marker ? [G.marker.x, G.marker.y] : null),
  pointerGround: () => (G.game.mouseGround ? G.game.mouseGround() : null),
  setProfile: p => G.saveProfile(p),
  openStory: () => G.openStory(),
  unlockedTeams: () => G.unlockedTeams(),
  recordMatch: m => G.recordMatch(m),
  setupAway: () => (G.setupState ? G.setupState.away : null),
  aboutTitles: () => G.ABOUT.map(p => p.title),
  setLayout: l => { G.layout = l; },
  tuneReset: () => G.tuneReset(),
  openDev: () => G.dev.show(),
  closeDev: () => G.dev.close(),
  bowl: (key, target) => G.match && G.match.startRunup({ key, target: target || { x: G.W.PX, y: G.W.BAT_CREASE + 90 }, cpu: false, fam: (G.DELIVERIES[key] || {}).fam }),
  release: q => G.match && G.match.release(q || 'green')
};
