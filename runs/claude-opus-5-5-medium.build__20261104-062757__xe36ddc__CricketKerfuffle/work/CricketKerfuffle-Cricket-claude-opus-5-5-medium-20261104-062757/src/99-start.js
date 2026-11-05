// ---- the start: the game, its input map, the settings, the pause menu's items, the scenes, the boot steps, deep links
// for tools, and the game.debug handle for tests and tools.
const SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', options: ['County', 'Village', 'Test', 'Kerfuffle!'], value: 'County', group: 'Game', help: 'Village is forgiving; Kerfuffle! doubles the chaos' },
  { key: 'overs', label: 'Default overs', options: ['2', '1', '3', '5'], value: '2', group: 'Game' },
  { key: 'wickets', label: 'Default wickets', options: ['5', '3', '10', '2'], value: '5', group: 'Game' },
  { key: 'kerfuffle', label: 'Kerfuffle rules', value: true, group: 'Game', help: 'Items, specials and chaos events' },
  { key: 'marker', label: 'Pitch marker (batting)', value: true, group: 'Game', help: 'Where the ball will land, as it is bowled' },
  { key: 'timing', label: 'Timing feedback', value: true, group: 'Game' },
  { key: 'assistField', label: 'Fielding', options: ['Assisted', 'Manual', 'Auto'], value: 'Assisted', group: 'Game', help: 'Assisted catches the easy ones for you' },
  { key: 'running', label: 'Running', options: ['Manual', 'Auto'], value: 'Manual', group: 'Game' },
  { key: 'replays', label: 'Replays', options: ['Big moments', 'Always', 'Never'], value: 'Big moments', group: 'Game' },
  { key: 'captions', label: 'Commentary captions', value: true, group: 'Game' },
  { key: 'voices', label: 'Commentary voices', value: true, group: 'Game' },
  { key: 'voiceVolume', label: 'Voices volume', options: ['100%', '75%', '50%', '25%'], value: '100%', group: 'Sound' }
];
game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, input: KERFUFFLE_KEYS, id: 'cricket-kerfuffle', autoPause: !HUB, headless: HEADLESS || undefined, propSize: 1.3,
  menu: { items: HUB ? [] : [['Restart', () => restartScene()], ['Dev Mode', () => devOpen()]], settings: SETTINGS, controls: ACTION_NAMES, quit: HUB ? false : 'title' } });
if (HUB) game.hubActive = true;
defineSfx(); presentationListeners();
difficulty = { Village: 'village', County: 'county', Test: 'test', 'Kerfuffle!': 'kerfuffle' }[game.settings.difficulty] || 'county';
try { const sv = game.saves; sv.write = () => ({ data: profile.story, place: (CHAPTERS[Math.min(4, profile.story.chapter - 1)] || CHAPTERS[0]).title, level: profile.story.chapter }); sv.read = s => { if (s && s.data && s.data.chapter) { profile.story = Object.assign(profile.story, s.data); saveProfile(); } }; } catch (e) { /* storage blocked */ }
function restartScene() { if (MATCH && game.sceneName === 'match') { const c = Object.assign({}, MATCH.cfg, { seed: (Math.random() * 1e9) >>> 0, humans: MATCH.humans }); game.resume(); game.go('match', { cfg: c, lesson: SC.match.d && SC.match.d.lesson, after: SC.match.d && SC.match.d.after }); } }
// the dev shortcut, keyboard only (`); touch-only detection (a key or a pad clears the gate)
if (!HEADLESS && typeof addEventListener === 'function') {
  addEventListener('keydown', e => { TOUCH.seenKey = true; if (e.code === 'Backquote' && !HUB && game.scene && game.scene.pausable) { if (DEV.open) devClose(); else devOpen(); } });
  addEventListener('gamepadconnected', () => { TOUCH.seenKey = true; });
}
const _devDrawHook = drawWorld;
drawWorld = function (r, m, dt) { _devDrawHook(r, m, dt); devOverlays(r, m); if (DEV.toggles.skeleton) for (const rig of RIGS.values()) if (rig.lastView) rig.debug(r); };
// a scene that waits for the hub's answer before anything else
SC.hubwait = { enter() { this.t = 0; }, update(dt) { this.t += dt; }, draw(r) { r.sky(['#05040e', '#1a1040']); r.overlay(g => { bigTitle(g, 'CRICKET KERFUFFLE', r.W / 2, r.H / 2 - 30, { scale: 2 }); E.font.text(g, 'CONNECTING TO THE HUB...', r.W / 2, r.H / 2, '#c8c0e0', { align: 'center' }); }); } };
// deep links for tools: #title #match #nets #about #dev #attract #story #hub
function deepLink() {
  const h = (typeof location !== 'undefined' && location.hash || '').slice(1);
  if (HUB) return 'hubwait';
  return { match: 'match', nets: 'match', about: 'about', dev: 'match', attract: 'attract', story: 'storymap', setup: 'setup', results: 'match' }[h] ? h : 'title';
}
const START = deepLink();
const scenes = Object.assign({}, SC);
game.start({ scenes, scene: START === 'title' || START === 'about' || START === 'attract' || START === 'hubwait' ? (START === 'about' ? 'about' : START) : START === 'story' ? 'storymap' : 'title',
  boot: { title: 'CRICKET KERFUFFLE', version: '1.0', messages: LOADING_LINES,
    steps: [['Rolling the pitch', () => { for (const t of TEAMS) squad(t); }], ['Mowing the outfield', () => { useGround('green', null); }], ['Whitening the creases', () => { if (!HEADLESS) for (const gid of GROUND_ORDER) panoramaFor(gid); }], ['Brewing the tea', () => { spr(); }]] } });
Promise.resolve(game.booted).then(() => {
  if (START === 'match' || START === 'dev') startMatch({ mode: 'quick', teams: ['ker', 'mud'], ground: 'green', humans: [[game.input], []] });
  if (START === 'nets') startNets({ kind: 'bat' });
  if (START === 'setup') game.go('setup', { mode: 'quick' });
  if (START === 'dev') setTimeout(() => devOpen(), 600);
  if (HUB) hubConnect();
});
// ---- the handle for tests and tools
function snapshot() {
  const m = MATCH, I = game.input, sc = game.sceneName;
  const s = { scene: sc, mode: m ? m.cfg.mode : null, ui: { device: I.lastDevice, glyphs: I.padStyle ? I.padStyle() : null, touchGate: TOUCH.gate, prompts: { shot: promptKind(I, 'shot'), loft: promptKind(I, 'loft'), run: promptKind(I, 'run'), special: promptKind(I, 'special') }, menuFocus: game.scene && game.scene.menu ? game.scene.menu.i : null, hud: HUD.rects },
    dev: { open: DEV.open, changed: tuneChanged(), tab: DEV.tab }, coverage: Object.assign({}, COVER), errors: game.errors.length, attract: { active: sc === 'attract', segment: SC.attract.seg },
    hub: { active: !!HUB, phase: HUBS.phase, sent: Object.assign({}, HUBS.sent) }, story: { chapter: profile.story.chapter, stars: Object.assign({}, profile.story.stars) } };
  if (m) { const In = m.I; s.match = { innings: m.i, runs: In.runs, wkts: In.wkts, balls: In.legal, over: m.overStr(), target: m.target(), need: m.need(), freeHit: In.freeHit, striker: m.striker() && m.striker().p.short, bowler: m.bowlerP() && m.bowlerP().short, hype: m.hype.slice(), fire: Object.assign({}, m.fire), items: m.items.slice(), result: m.result, state: m.state, st: +m.st.toFixed(2), needBowler: !!m.needBowler, fieldPreset: m.fieldPreset[m.bowlT], overRound: m.overRound, review: !!m.review, decision: m.decision ? { out: m.decision.out, truth: m.decision.truth } : null, weather: m.weather, time: m.time, chaos: Object.keys(m.chaosActive), critters: (m.critters || []).length, targetsHit: m.targetsHit.slice(), tide: m.tide || 0 };
    s.ball = { phase: m.ball.phase, x: +m.ball.x.toFixed(1), y: +m.ball.y.toFixed(1), z: +m.ball.z.toFixed(1), pitched: m.ball.pitched, fx: m.ball.fx, kmh: m.ball.kmh }; s.last = m.lastRec || null; s.director = { state: m.state, shot: WORLD.shot }; s.swing = m.swing ? { grade: m.swing.grade, shot: m.swing.shot.id } : null; s.contact = m.contact; }
  return s;
}
function idealPress(btn = 'shot') { const m = MATCH; if (!m || m.state !== 'flight') return null; const cy = m.contactY(), a = arrival(m.ball, cy.y, m.env); if (!a) return null; return a.t - SHOT.straightDrive.at; }
game.debug = { snapshot, idealPress, E, Match, TUNE, T, COVER, BUS, RNG, LINES, SHOTS, SHOT, DELIVERIES, LESSONS, CHAPTERS, SEGMENTS, TEAMS, GROUNDS, ITEMS, CHAOS, SPECIALS, VOICES, SONGS, STINGS, SFX_DEFS, KERFUFFLE_KEYS, ABOUT, ABOUT_PAGES: () => ABOUT_PAGES, TOUCH, DEV, HUBS, WORLD,
  match: () => MATCH, profile: () => profile, setTuning: tuneSet, resetTuning: tuneReset, startMatch, startChapter, startNets, startShowdown, devOpen, devClose, devRows, devUpdate, forceOutcome: k => MATCH && MATCH.forceNext(k), triggerChaos: id => MATCH && MATCH.triggerChaos(id), spawnItem: (id, at) => MATCH && MATCH.spawnToken(id, at),
  syllables, hudLayout, overlaps, promptKind, matchReport, squad, lengthBand, predict, arrival, stepBall, newBall, solveDelivery, kmhToU, fmt, commVars, PICK, skipTo: s => MATCH && MATCH._go(s) };
