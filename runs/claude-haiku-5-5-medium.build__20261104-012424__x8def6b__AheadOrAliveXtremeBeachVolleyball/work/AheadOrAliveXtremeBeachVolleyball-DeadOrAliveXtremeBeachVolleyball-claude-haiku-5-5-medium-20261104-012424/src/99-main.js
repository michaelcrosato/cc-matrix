/* 99-main: builds the game, registers the scenes, the pause menu, the saves and the match results; starts the title. */
G.boot = function () {
  G.loadTuning();
  const session = G.inSession();
  const settings = [
    { key: 'difficulty', label: 'Difficulty', options: ['Easy', 'Normal', 'Hard', 'Pro'], value: 'Normal' },
    { key: 'timingAssist', label: 'Timing assist', options: ['Tight', 'Normal', 'Generous'], value: 'Normal' },
    { key: 'autoMove', label: 'Auto-run to the ball', value: true },
    { key: 'autoReceive', label: 'Auto-receive', value: false },
    { key: 'timingRing', label: 'Timing ring', value: true },
    { key: 'matchCam', label: 'Match camera', options: ['Broadcast', 'Serve Cam'], value: 'Broadcast' },
    { key: 'textSpeed', label: 'Text speed', options: ['Slow', 'Normal', 'Fast', 'Instant'], value: 'Normal' },
    { key: 'commentary', label: 'Commentary', value: true },
    { key: 'voices', label: 'Voices volume', value: .8 }
  ];
  const items = [
    ['How to Play', () => G.goto('howto', { page: 0, from: G.curScene })],
    ['Take a Postcard', () => G.goto('photo', { from: 'pause', place: G.state && G.curScene === 'location' ? G.locScene.place : 'beach' })],
    ['Dev Mode', () => { G.devUnlocked = true; G.goto('dev', { from: G.curScene }); }]
  ];
  G.game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', bg: '#0a2d3d', id: 'ahead-or-alive', autoPause: !session, corner: !session,
    fullscreen: !session, minW: 300, minH: 190,
    menu: session ? false : { items, settings, quit: 'title', saves: true } });
  G.game.input.touchEnabled = false;             // no touch controls, ever: a touch-only device gets the gate
  G.game.input.glyphs = 'playstation';
  G.game.saves.write = () => ({ data: G.saveVacation(), place: G.state ? (G.curScene || 'map') : 'title', level: G.state ? 'Day ' + G.state.day : '' });
  G.game.saves.read = (save) => { G.loadVacation(save.data); return true; };
  const go = G.game.go.bind(G.game);
  // leaving a screen that froze the game (the dev panel, photo mode) lets time run again
  const VACATION_SCENES = ['map', 'location', 'shop', 'wardrobe', 'journal', 'mail', 'poolhop', 'casino', 'photo', 'album', 'dayend', 'vacresult', 'ending', 'story'];
  G.game.go = (name, data) => {
    G.prevScene = G.curScene;
    if (G.curScene === 'dev' || G.curScene === 'photo') G.game.timeScale = 1;
    // a screen of the vacation opened without one (the dev panel, a test) starts a vacation for it
    if (!G.state && VACATION_SCENES.includes(name)) { G.newState({ me: 'rin', skipTutorial: true }); G.state.flags.arrival = true; G.state.flags.welcome = true; }
    G.curScene = name; return go(name, data);
  };
  G.defineSfx();
  // F1 reopens the dev panel once it has been opened in this session (never in a hub session)
  if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('keydown', e => { if (e.code === 'F1' && G.devUnlocked && !session && G.curScene !== 'dev') { e.preventDefault(); G.goto('dev', { from: G.curScene }); } });
  // every scene: the dev combo, the attract director (which drives the montage's real scenes), and the montage's caption
  const scenesAll = G.scenes();
  for (const k of Object.keys(scenesAll)) {
    const sc = scenesAll[k], u = sc.update, d = sc.draw;
    sc.update = function (dt) { if (G.devCombo()) return; if (G.attractOn) G.attractStep(dt); if (u) return u.call(this, dt); };
    sc.draw = function (r) { const out = d ? d.call(this, r) : undefined; if (G.attractOn && G.caption) G.drawCaption(r); return out; };
  }
  if (typeof window !== 'undefined' && window.addEventListener) {
    const leave = () => { if (G.attractOn) G.attractExit(); };
    window.addEventListener('keydown', leave); window.addEventListener('pointerdown', leave);
  }
  G.game.start({ scenes: scenesAll, scene: session ? 'hub' : 'title', boot: { title: 'AHEAD OR ALIVE', steps: [['Raking the sand', () => G.buildAssets()], ['Inflating volleyballs', () => G.buildAssets()], ['Chilling the smoothies', () => G.buildAssets()], ['Counting Sonny\'s chips', () => G.buildAssets()], ['Polishing the golden sunglasses', () => G.buildAssets()]] } });
  G.curScene = session ? 'hub' : 'title';
  return G.game;
};
G.goto = function (name, data) { return G.game.go(name, data); };
/* L3 and R3 together (pad buttons 10 and 11) reopen the dev panel once it has been opened; true when it took the step */
G.devCombo = function () {
  const I = G.game && G.game.input; if (!I || G.inSession() || !G.devUnlocked || G.curScene === 'dev') return false;
  const both = I.held && I.held.has('Pad10') && I.held.has('Pad11');
  const edge = both && !G._combo; G._combo = both;
  if (edge) { G.goto('dev', { from: G.curScene }); return true; }
  return false;
};
G.buildAssets = function () { G.assets = G.assets || {}; };
G.scenes = function () {
  const pausable = { pausable: true, input: G.matchKeys };
  const menuMap = G.menuKeys;   // (every menu screen shares the same keys)
  return {
    title: Object.assign({}, G.titleScene, { input: menuMap, idleAttract: true }),
    menu: Object.assign({}, G.menuScene, { input: menuMap }),
    exhibition: Object.assign({}, G.exhibitionScene, { input: menuMap }),
    results: Object.assign({}, G.resultsScene, { input: menuMap }),
    match: Object.assign({}, G.matchScene, pausable, { camera: { zoom: [.85, 1.25] }, enter(data) { G.matchScene.enter.call(this, data); this.M.finish = () => G.matchFinish(this.M, this.o); } }),
    invitation: Object.assign({}, G.invitationScene, { input: menuMap }),
    charselect: Object.assign({}, G.charselectScene, { input: menuMap }),
    story: Object.assign({}, G.storyScene, { input: menuMap }),
    map: Object.assign({}, G.mapScene, { pausable: true, input: G.exploreKeys }),
    location: Object.assign({}, G.locScene, { pausable: true, input: G.exploreKeys }),
    shop: Object.assign({}, G.shopScene, { input: G.exploreKeys }),
    wardrobe: Object.assign({}, G.wardrobeScene, { input: G.exploreKeys }),
    journal: Object.assign({}, G.journalScene, { input: G.exploreKeys }),
    mail: Object.assign({}, G.mailScene, { input: G.exploreKeys }),
    poolhop: Object.assign({}, G.poolScene, { pausable: true, input: G.poolKeys }),
    casino: Object.assign({}, G.casinoScene, { pausable: true, input: G.casinoKeys }),
    photo: Object.assign({}, G.photoScene, { input: G.photoKeys }),
    album: Object.assign({}, G.albumScene, { input: menuMap }),
    postcard: Object.assign({}, G.postcardScene, { input: menuMap }),
    howto: Object.assign({}, G.howtoScene, { input: menuMap }),
    about: Object.assign({}, G.aboutScene, { input: menuMap }),
    attract: Object.assign({}, G.attractScene, { input: G.matchKeys }),
    dev: Object.assign({}, G.devScene, { input: menuMap }),
    dayend: Object.assign({}, G.dayendScene, { input: menuMap }),
    finale: { enter() { G.game.go('story', { event: 'party', fresh: true }); } },
    ending: Object.assign({}, G.endingScene, { input: menuMap }),
    credits: Object.assign({}, G.creditsScene, { input: menuMap }),
    vacresult: Object.assign({}, G.vacresultScene, { input: menuMap }),
    hub: Object.assign({}, G.hubScene, { input: G.matchKeys })
  };
};
/* a finished match: a vacation match pays and moves the slot on; a story match resumes its story; an exhibition shows results */
G.matchFinish = function (M, o) {
  if (o.attract) return;     // the attract demo's own matches end inside the montage
  if (M._done) return; M._done = true;
  const won = M.winner === 0, margin = Math.abs(M.score[0] - M.score[1]);
  const result = { won, score: M.score.slice(), teamNames: [M.players[0].name + ' / ' + M.players[1].name, M.players[2].name + ' / ' + M.players[3].name],
    stats: { points: M.stats.points[0], kills: M.players.filter(p => p.side === 0).reduce((a, p) => a + (p.stats.kills || 0), 0), longest: M.stats.longest }, opts: o };
  if (o.story) {
    if (o.story === 'final') { G.state.flags.finalWon = won; G.state.flags.final = won ? 'won' : 'lost'; }
    if (o.story === 'semi' && won) G.state.flags.semiWon = true;
    return G.game.go('story', { event: G.storyRunEv(), fresh: false });
  }
  if (o.vacation) {
    const partner = o.vacation.partner;
    G.matchResult(won, margin, partner, o.vacation.opp);
    G.state.stats.points += result.stats.points;
    if (won) G.state.day_stats.wins = G.state.day_stats.wins;
    G.state.lastMatch = { won, score: M.score.slice() };
    if (G.advanceSlot() === 'dayEnd') return G.game.go('dayend', {});
    return G.game.go('map', {});
  }
  return G.game.go('results', result);
};
G.storyRunEv = function () { return G.storyRun ? G.storyRun.ev : 'welcome'; };
if (typeof window !== 'undefined' && !window.AOA_NO_BOOT) { window.addEventListener('load', () => G.boot()); }
