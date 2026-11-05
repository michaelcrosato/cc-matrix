/* 90-start: the scene table, the pause menu's items, the themed Shell, boot steps, touch-only detection, deep links,
 * game.debug (the tests' and tools' handle) and the start. */
SC.match = { matchScene: true, pausable: !HUB, view: 'broadcast', input: KEYS, res: 'ps1', touch: [], camera: { zoom: [.8, 1.4] }, enter: matchEnter, update: matchUpdate, draw: matchDraw,
  exit() { S.lesson = null; crowdTick(1, false); game.timeScale = 1; S.dev.open = false; devAutopilot(false); game.setView('broadcast'); game.setZoom(1); } };
SC.hubwait = { view: 'broadcast', input: KEYS, res: 'ps1', touch: [], update() {}, draw(r) { r.sky(['#05040a', '#140a24']); r.overlay(g => drawLogo(g, r, Math.round(r.W / 2), Math.round(r.H * .35), 3)); } };
/** the pause menu's own items for where the player is */
function pauseItems() {
  const items = [['How to Play', () => game.shell && game.shell.show('help', HOW_TO_PLAY_HELP())]];
  const sc = game.sceneName;
  if (sc === 'match' && S.match && (S.mode === 'exhibition' || S.mode === 'tour')) items.push(['Restart Game', () => { game.resume(); if (S.mode === 'tour') startTourMatch(); else startMatchScene(Object.assign({}, EXH.lastOpts), { onEnd: res => { noteRecords(res); game.go('results', { res, from: 'exhibition' }); } }); }]);
  if (sc === 'match' && S.lesson) { items.push(['Skip Step', () => { game.resume(); S.lesson.skip(); }]); items.push(['Lesson List', () => { game.resume(); S.lesson = null; gotoScreen('camp'); }]); }
  if (sc === 'story') items.push(['Skip Cutscene', () => { game.resume(); skipCutscene(); }]);
  if (!HUB) items.push(['Dev Mode', () => { if (sc === 'match' && S.match) openDev(); else { game.resume(); devExhibition(EXH.court || 'skybox', { panel: true }); } }]);
  return items;
}
const HOW_TO_PLAY_HELP = () => ({
  keys: HOW_ROWS.map(([a, t]) => [a === 'move' ? (game.input.lastDevice === 'gamepad' ? 'Left stick' : 'WASD') : game.input.label(a), t.charAt(0) + t.slice(1).toLowerCase()]),
  sections: [['Rules', 'Two on two, four quarters. No fouls: shoving and stealing are legal. Threes from beyond the arc. Dunks need turbo. 20-second shot clock. Goaltending counts for the shooter.'],
    ['Supernova', 'Score three in a row with nobody answering and you go SUPERNOVA: unlimited turbo, hotter shots, glass-shattering dunks.'],
    ['Twists', COURT_ORDER.map(c => get('court', c).name + ': ' + TWIST_INFO[get('court', c).twist][0]).join(' • ')]]
});
/* ---- touch-only devices: no touch controls; "Controller or keyboard required" and the settings button ---- */
function detectTouchOnly() {
  if (typeof navigator === 'undefined') return false;
  const mm = q => { try { return typeof matchMedia === 'function' && matchMedia(q).matches; } catch (e) { return false; } };
  let pads = false; try { pads = [...(navigator.getGamepads ? navigator.getGamepads() : [])].some(Boolean); } catch (e) { pads = false; }
  return (navigator.maxTouchPoints || 0) > 0 && !mm('(any-pointer: fine)') && !mm('(any-hover: hover)') && !pads;
}
function setupTouchOnly() {
  S.touchOnly = detectTouchOnly(); game.input.touchEnabled = false;
  if (typeof addEventListener === 'function') {
    const off = () => { if (S.touchOnly) { S.touchOnly = false; } };
    addEventListener('gamepadconnected', off); addEventListener('keydown', off);
  }
}
/* ---- the debug handle for tests and tools ---- */
game.debug = {
  snapshot() {
    const M = S.match, b = S.ball;
    return { scene: game.sceneName, mode: S.mode, court: S.court, phase: M && M.phase, quarter: M && M.quarter, clock: M && +M.clock.toFixed(2), shotClock: M && +M.shot.toFixed(2), score: M && M.score.slice(), possession: M && M.poss,
      ball: b && { x: Math.round(b.x), y: Math.round(b.y), z: Math.round(b.z), state: b.state, owner: b.owner ? b.owner.slot : -1 },
      players: (S.players || []).map(p => ({ slot: p.slot, id: p.def.id, team: p.team, x: Math.round(p.x), y: Math.round(p.y), z: Math.round(p.z), state: p.state, turbo: +p.turbo.toFixed(2), juice: +p.juice.toFixed(2), nova: p.isNova(), powerup: p.pu && p.pu.id, source: p.source && p.source.kind, human: p.human })),
      lastEvents: S.events.slice(-10).map(e => e.type), ui: { screen: game.sceneName, focus: (S.menu.main || {}).i }, attract: S.attract && { segment: S.attract.seg, phase: S.attract.phase }, net: { role: S.net.role, seat: S.net.seat, rtt: S.net.rtt }, touchOnly: S.touchOnly, dev: S.dev.open };
  },
  teleport(slot, x, y) { const p = S.players[slot]; if (p) { p.x = x; p.y = y; p.vx = p.vy = 0; } },
  give(slot) { attractAction('give', slot); },
  setScore(a, b) { if (S.match) S.match.score = [a, b]; },
  setClock(s) { if (S.match) S.match.clock = s; },
  setQuarter(q) { if (S.match) S.match.quarter = q; },
  force(name, args) { if (name === 'twist') forceTwist(args); else if (name === 'nova') novaOn(S.players[args]); else if (name === 'overclock') overclock(); else if (name === 'tipoff') startTipoff(); else if (name === 'shatterNext') S.cheats.shatterNext = true; },
  go(scene, data) { game.go(scene, data, { fade: 0 }); },
  spawnPowerup(id, x, y) { return spawnPowerup(id, x, y); },
  cheat(name, on) { S.cheats[name] = on; },
  tune(key, v) { setTune(key, v); return tune(key); }
};
/* ---- deep links: #title, #attract, #exhibition/<court>/<home>-<away>, #tour/<stop>, #story/<beat>, #camp/<lesson>, #results,
 * #credits, #about, #dev, #animlab, #shootaround, #menu, #hubcard and the menu screens by name ---- */
function deepLink() {
  const h = (typeof location !== 'undefined' && location.hash || '').slice(1), [a, b, c] = h.split('/');
  if (!a) return false;
  if (a === 'exhibition') { const [hm, aw] = (c || 'hightops-breakers').split('-'); const court = get('court', b) ? b : 'skybox'; EXH.teams = [get('team', hm) ? hm : 'hightops', get('team', aw) ? aw : 'breakers']; EXH.court = court; EXH.lineups = EXH.teams.map(t => get('team', t).players.slice()); EXH.seats = [{ side: 0, ready: true }]; const o = { court, home: EXH.teams[0], away: EXH.teams[1], lineups: EXH.lineups, humans: [[0, game.input]], quarterLen: game.settings.quarterLen || 120, diff: [1, 1], powerups: true, twists: true, mode: 'exhibition' }; EXH.lastOpts = o; startMatchScene(o, { fade: 0, onEnd: res => game.go('results', { res, from: 'exhibition' }) }); return true; }
  if (a === 'dev') { devExhibition(b && get('court', b) ? b : 'skybox', { panel: true }); return true; }
  if (a === 'tour') { TOUR.team = c && STREET_TEAMS.includes(c) ? c : 'hightops'; TOUR.stop = clamp((+b || 1) - 1, 0, 3); TOUR.lineups = [get('team', TOUR.team).players.slice(), null]; TOUR.humans = 1; setStop(); game.go('tourmap', null, { fade: 0 }); return true; }
  if (a === 'story') { TOUR.team = TOUR.team || 'hightops'; setStop(); playBeats([get('beat', b) ? b : 'prologue'], () => game.go('menu')); return true; }
  if (a === 'camp') { const i = CAMP_LESSONS.findIndex(L => L.id === b); if (i >= 0) { CAMPRUN.single = true; startLesson(i, false); } else game.go('camp', null, { fade: 0 }); return true; }
  if (a === 'results') { game.go('results', { res: demoResult(), from: 'exhibition' }, { fade: 0 }); return true; }
  if (a === 'credits') { game.go('credits', {}, { fade: 0 }); return true; }
  if (a === 'attract') { startAttract('title'); if (b) S.attract.seg = clamp(+b - 1, 0, 4); return true; }
  if (a === 'hubcard') { game.go('hubcard', { preview: true }, { fade: 0 }); return true; }
  if (SC[a]) { game.go(a, a === 'teams' || a === 'lineup' ? {} : null, { fade: 0 }); return true; }
  return false;
}
/* ---- boot ---- */
function bootSteps() {
  return [
    ['Lacing up', () => { loadProgress(); loadTuning(); defineBigHeads(); applyGlyphs(game.settings.glyphs || 'playstation'); }],
    ['Painting the courts', () => { for (const id of COURT_ORDER) courtMap(id); }],
    ['Warming up the announcers', () => { wireFx(); setupTouchOnly(); }],
    ['Opening the doors', () => {
      if (HUB) { for (const sp of GAME_SETTINGS) if (!game.settings.spec(sp.key)) game.settings.define(sp); }
      else {
        new E.Shell(game, { theme: { ink: '#fff7ec', paper: '#140c24', accent: '#ff3ca6', muted: '#9a8fb8', danger: '#ff5a3a', line: '#3a2a5a', font: '700 1rem/1.35 "Trebuchet MS", system-ui, sans-serif', titleFont: '900 1.6rem/1 Impact, "Arial Black", system-ui' } });
        // the menus' HTML is sized in pixels: scale it with the screen so it reads on a TV at ten feet
        const fit = () => { const root = game.shell && game.shell.root; if (root && typeof innerHeight === 'number') root.style.zoom = String(clamp(innerHeight / 560, 1, 2.6)); };
        if (typeof addEventListener === 'function') addEventListener('resize', fit); fit();
      }
    }]
  ];
}
HUB_OFF = () => { game.go('title', null, { fade: 0 }); };
const SCENES = SC;
game.start({ scenes: SCENES, scene: HUB ? 'hubwait' : 'title', boot: { title: 'BASHKETBALL', version: VERSION, steps: bootSteps() } });
if (game.booted && game.booted.then) game.booted.then(() => { if (HUB) hubBoot().catch(e => { try { AIHub.fail(String(e && e.message || e)); } catch (err) { game.fail('hub fail', err); } }); else deepLink(); });
else if (HUB) hubBoot(); else deepLink();
window.__bb = { S, game, TUNING, emit, on, debug: game.debug, newMatch, setTune, tune, resetTuning, startMatchScene, matchResult, planSyllables, CODES, LINES, LINE_RANK, MINOR_BANKS, REG, get, all, NET, TOUR, PROG, CAMP_LESSONS, startLesson, startAttract, ATT_SEGS, SC, glyphFor, promptWidth, ARENA, TWIST, POWERUPS, CAB,
  STATES, launchShot, isThree, RIMS, OX, OY, CW, CH, CMX, CMY, onBasket, giveBall, attractAction, forceTwist, spawnPowerup, grantPowerup, dunkRange, chooseDunk, startDunk, SONGS, STINGS, SFX, VOICE_PROFILES, beatLines, BEAT_ORDER, NEW_SHAPES, hubSnapshot, hubMessage, netSource, hubFinish, hubStartMatch, openDev, closeDev, devRows, DEV, EXH, MU, applyCodes, setStop, playBeats, STORY, TALK, tourAfterMatch, finishTour, substitute, nextPeriod, BREAK, shotChance, knockDown, CONTROL_NAMES, KEYS, detectTouchOnly, setupTouchOnly, IDLE, NAV, deepLink,
  ballPhysics, startShove, startSteal, stealHit, startSpin, startLayup, startShot, passBall, alleyOop, oopReady, novaOn, novaOff, shatterGlass, setupInbound, quarterEnd, startTipoff,
  LOGOS, FLOORS, CLIPS, DUNK_ORDER, PU_ORDER, CAST, matchStep, playerStep, jumpUp, blockCheck, slipOnOil, overclock, onSlick, placeSlicks, endPowerup, COURT_ORDER, STREET_TEAMS, GAME_SETTINGS,
  TWIST_INFO, HALFTIME_GAGS, attackRim, defendRim, BALL_R, RIM_Z, RIM_R, THREE_R, BOARD_X, Voice, ANN, announce, caption, BANNERS, MAPS, courtMap, crowdReact, dribblePose, ballAnchor, handsAt, toLocal,
  CAMPRUN, saveProgress, loadProgress, continueTour, beginTour, startTourMatch, hubBoot, hubStep, hubApplySnapshots, BITS, HUBMENU, playMusic, sting, musicLayer, sfx, startCele, VERSION, fill, CREDITS_ROLL, ABOUT_PAGES, SECRETS_TEXT, glyphStyle, applyGlyphs, drawGlyph, aiThink, DEV_TABS, LAB, LAB_ITEMS };
