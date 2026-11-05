/* START: every step's shared hooks (idle detection for the attract mode, the button symbols, the dev panel, touch-only
 * detection), the debug handle, deep links, and the boot. In an AI Hub session the game opens straight into the round. */
function stepHooks(dt) {
  const sym = setting('symbols'); for (const I of game.players) if (I.glyphs !== sym) I.glyphs = sym;
  idleTick(dt);
  if (S.touchOnly && (game.input.lastDevice === 'keyboard' || game.input.lastDevice === 'gamepad') && game.input.anyPressed()) S.touchOnly = false;
}
/** touch-only: a touch screen with no fine pointer and no hover, and no gamepad or key seen yet */
function detectTouchOnly() {
  try {
    const mm = q => typeof matchMedia === 'function' && matchMedia(q).matches;
    const touch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0, fine = mm('(any-pointer: fine)'), hover = mm('(any-hover: hover)');
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? Array.from(navigator.getGamepads() || []).some(Boolean) : false;
    return touch && !fine && !hover && !pads;
  } catch (e) { return false; }
}
SCENES.boot = { update() { if (HUB) { if (!S.hubStarted) { S.hubStarted = true; hubBoot().catch(e => { try { AIHub.fail(String(e && e.message || e)); } catch (e2) { /* no hub */ } }); } return; } if (!deepLink()) go('title', null, { fade: 0 }); }, draw(r) { r.sky(['#05040a', '#0a0814', '#140c24']); } };
// wrap every scene's update: the hooks first; the dev panel takes the input while it is open
for (const [name, sc] of Object.entries(SCENES)) {
  const up = sc.update;
  sc.update = function (dt) {
    stepHooks(dt);
    if (S.devOpen && sc.isMatch) devUpdate(dt);
    return up.call(this, dt);
  };
  sc.touch = [];
}
// dev time controls ride on the camera's time scale
const camStep0 = cameraStep;
cameraStep = function (dt) { camStep0(dt); if (DEV.speed !== 1) game.timeScale *= DEV.speed; if (DEV.freeze) { game.timeScale = DEV.step ? 1 : 0; DEV.step = false; } };

game.debug = {
  snapshot() {
    const m = S.match, b = S.ball;
    return { scene: game.sceneName, mode: S.mode, court: S.court, phase: m && m.phase, quarter: m && m.quarter, clock: m && +m.clock.toFixed(1), shotClock: m && +m.shotClock.toFixed(1), score: m && m.score.slice(), possession: b && b.owner ? b.owner.team : null,
      ball: b && { x: Math.round(b.x), y: Math.round(b.y), z: Math.round(b.z), state: b.state, owner: b.owner ? b.owner.slot : -1 },
      players: S.players.map(p => ({ slot: p.slot, id: p.id, team: p.team, x: Math.round(p.x), y: Math.round(p.y), z: Math.round(p.z), state: p.state, turbo: +p.turbo.toFixed(2), juice: +p.juice.toFixed(2), nova: !!p.nova, powerup: p.powerup && p.powerup.id, source: p.src && p.src.kind, intent: p.intent })),
      lastEvents: S.events.slice(-10).map(e => e.type), ui: { screen: game.sceneName, dev: S.devOpen, touchOnly: S.touchOnly }, attract: { segment: ATT.seg, phase: ATT.phase }, net: { role: NET.role, seat: NET.info && NET.info.me } };
  },
  teleport(slot, x, y) { const p = S.players[slot]; if (p) { p.x = x; p.y = y; } },
  give(slot) { giveBall(S.players[slot], 'give'); if (S.match) S.match.phase = 'live'; },
  setScore(a, b) { S.match.score = [a, b]; }, setClock(s) { S.match.clock = s; }, setQuarter(q) { S.match.quarter = q; },
  go(scene, data) { go(scene, data, { fade: 0 }); }, spawnPowerup(id, x, y) { spawnPowerup(id, x, y); }, cheat(name, on) { S.cheats[name] = on; }, tune(k, v) { setTune(k, v); }
};
if (typeof window !== 'undefined') window.__bb = { REPORT_INFO, TESTING_FEEDBACK, ENGINE_FEEDBACK, PROMPT_FEEDBACK, S, game, TUNING, emit, on, debug: game.debug, setTune, resetTuning, startMatch, giveBall, startDunk, releaseShot, jump, knockDown, novaOn, spawnPowerup, playBeat, startLesson, LESSONS, CAMP, ATT, SEGMENTS, DEV, devRows, openDev, closeDev, Voice, LINES, BEATS, get, all, REG, isThree, HOOPS, X0, X1, Y0, Y1, XM, YM, RIM_Z, buildCfg, exhibitionDefault, NET, brainStep, newBrain, emptyCmd, SCENES, hubBoot, matchStep, owner, hasBall, dunkRange, canDunkFrom, attackHoop, STATES, COURTS, POWERUPS, Caption, setupTwist, overclock, endGame, hubCfg, shotChance, tourStops, tourCfg, saveProgress, loadProgress, MAIN, FX, glyph, codeFor, actionGlyph, promptLine, measureGlyph, HOOP_FX, detectTouchOnly, inputSeen, IDLE, hallList, qualifies, setting, RS, initialsStep };

/** deep links: #title #attract #exhibition/<court>/<home>-<away> #tour/<stop> #story/<beat> #camp/<lesson> #results #credits #about #dev #animlab #howto #hall */
function deepLink() {
  const h = (typeof location !== 'undefined' && location.hash || '').slice(1), [a, b, c] = h.split('/');
  if (!a) return false;
  if (a === 'exhibition') { const [home, away] = (c || 'hightops-breakers').split('-'); go('match', Object.assign(exhibitionDefault(), { court: b || 'skybox', teams: [{ id: home || 'hightops' }, { id: away || 'breakers' }], boss: home === 'blambots' || away === 'blambots' }), { fade: 0 }); return true; }
  if (a === 'dev') { go('match', Object.assign(exhibitionDefault(), { onEnter: () => { S.devOpen = true; devAutopilot(true); } }), { fade: 0 }); return true; }
  if (a === 'tour') { S.progress.tour = { team: 'hightops', pick: 0, stop: clamp((+b || 1) - 1, 0, 3), score: 0, cheats: true }; go('tourmap', null, { fade: 0 }); return true; }
  if (a === 'story') { playBeat(b && BEATS[b] ? b : 'prologue', () => go('menu')); return true; }
  if (a === 'camp') { const k = Math.max(0, LESSONS.findIndex(l => l.id === b)); startLesson(k); return true; }
  if (a === 'attract') { go('attract', { from: 'title', segment: clamp((+b || 1) - 1, 0, 4) }, { fade: 0 }); return true; }
  if (a === 'results') { go('match', Object.assign(exhibitionDefault(), { onEnter: () => { S.match.score = [42, 38]; endGame(); S.match.overT = 9; } }), { fade: 0 }); return true; }
  if (a === 'credits') { go('credits', { then: () => go('menu') }, { fade: 0 }); return true; }
  if (SCENES[a] && ['title', 'menu', 'about', 'howto', 'hall', 'animlab', 'shootaround', 'join', 'camplist', 'tourstart'].includes(a)) { go(a, a === 'about' ? { page: +b || 0 } : {}, { fade: 0 }); return true; }
  return false;
}
game.start({
  scenes: SCENES, scene: 'boot',
  boot: { title: 'BASKETBLAM', steps: [
    ['Reading the playbook', () => { loadProgress(); loadTuning(); S.touchOnly = !HUB && detectTouchOnly(); game.input.touchEnabled = false; }],
    ['Painting the courts', () => { for (const id of COURTS) courtMap(id); }],
    ['Lacing up the crews', () => { for (const t of all('team')) for (const id of t.players) npcRig(id); for (const n of all('npc')) npcRig(n.id); }]
  ] }
});
if (typeof addEventListener === 'function') { addEventListener('gamepadconnected', () => { S.touchOnly = false; IDLE.t = 0; }); addEventListener('keydown', () => { if (S.touchOnly) S.touchOnly = false; }); }
