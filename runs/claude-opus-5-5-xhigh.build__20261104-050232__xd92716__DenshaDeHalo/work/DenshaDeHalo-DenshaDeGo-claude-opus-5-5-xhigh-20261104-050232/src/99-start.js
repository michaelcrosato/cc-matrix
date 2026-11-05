/* 99-start: the boot (the line and the depot built behind the engine's boot screen), the AI Hub session or the title,
 * deep links for testing (#gallery, #gallery=N, #stage=S2&s=5400&clock=10:17:30, #attract, #halomap, #results=S1,
 * #duel, #about, #log, #free, #ending, #title), and game.debug: the handle the tests and tools read. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, game = DH.game, px = E.px, T = DH.T;
const hash = (typeof location !== 'undefined' && location.hash || '').slice(1), q = {};
for (const part of hash.split('&')) { const [k, v] = part.split('='); if (k) q[k] = v === undefined ? true : decodeURIComponent(v); }
DH.deep = q;
/* ---- in a session: connect, then the card ---- */
DH.scenes.hubConnect = {
  input: DH.KEYS, camera: { zoom: false },
  enter() { this.t = 0; if (!this.started) { this.started = true; DH.hubConnect().then(on => { if (on) game.go('hubCard', null, { fade: 0 }); else game.go('title', null, { fade: 0 }); }); } },
  update(dt) { this.t += dt; },
  draw(r) { r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, '#05060c'); T(g, 'DENSHA DE HALO!', r.W / 2, r.H / 2 - 10, '#f2c230', { align: 'center', scale: 2 }); T(g, 'Joining the round' + '...'.slice(0, 1 + Math.floor(this.t * 2) % 3), r.W / 2, r.H / 2 + 12, '#c8d0e8', { align: 'center' }); }); }
};
/* ---- the first scene from the address ---- */
let scene = 'title', data = null;
if (DH.hub) scene = 'hubConnect';
else if (q.gallery !== undefined) { scene = 'gallery'; data = { i: +q.gallery || 0 }; }
else if (q.stage) { scene = 'deepStage'; data = q; }
else if (q.attract) scene = 'attract';
else if (q.halomap) scene = 'haloMap';
else if (q.results) { scene = 'deepResults'; data = q; }
else if (q.duel === 'auto') { scene = 'deepDuel'; }
else if (q.duel) scene = 'duelLobby';
else if (q.about) scene = 'about';
else if (q.log) scene = 'driversLog';
else if (q.free) scene = 'freeRun';
else if (q.ending) scene = 'ending';
DH.scenes.deepDuel = { enter() { DH.duelAuto = true; if (game.players.length < 2) game.addPlayer({ keys: 'right' }); game.go('duel', { auto: true }, { fade: 0 }); }, update() {}, draw() {} };
DH.scenes.deepStage = { enter(d) { game.go('drive', { stage: d.stage }, { fade: 0 }); DH._deepJump = d; }, update() {}, draw() {} };
DH.scenes.deepResults = { enter(d) { const run = DH.autoRun(d.results === true ? 'S1' : d.results, { skill: 1 }); game.go('results', { sum: DH.summarize(run), cards: [] }, { fade: 0 }); }, update() {}, draw() {} };
// after a deep link into a stage: jump inside it once the drive exists
const _drive = DH.scenes.drive.enter;
DH.scenes.drive.enter = function (d) { _drive.call(this, d); const J = DH._deepJump; if (J && DH.drive) { DH._deepJump = null; const r = DH.drive.run; if (J.s) r.teleport(+J.s, { v: +(J.v || 40), clock: J.clock ? DH.parseClock(J.clock) : r.clock }); else if (J.clock) r.clock = DH.parseClock(J.clock); if (J.auto) DH.drive.ap = new DH.Autopilot(r, { skill: 1 }); if (J.cam) DH.drive.cam = J.cam; } };
/* ---- game.debug: tests and tools ---- */
game.debug = {
  snapshot() {
    const d = DH.drive, base = { scene: game.sceneName, errors: game.errors.map(e => e.message), touchOnly: DH.touchOnly(), device: DH.device(), attract: { active: game.sceneName === 'attract', vignette: DH.scenes.attract && game.sceneName === 'attract' ? (DH._attractI !== undefined ? DH._attractI : null) : null }, hub: { active: !!DH.hubInfo, phase: DH.Hub.phase, sent: DH.Hub.stats.sent, result: DH.Hub.result } };
    if (d && (game.sceneName === 'drive' || game.sceneName === 'hubRun')) Object.assign(base, d.run.snapshot(), { camera: d.cam, pilot: d.run.pilot, auto: !!d.ap });
    if (game.sceneName === 'duel') base.players = game.players.length;
    return base;
  },
  jump(stageId, o = {}) { if (game.sceneName !== 'drive' || !DH.drive || DH.drive.id !== stageId) { game.go('drive', { stage: stageId }, { fade: 0 }); game.advance(1 / 60); } const r = DH.drive.run; if (o.s !== undefined) r.teleport(o.s, { v: o.v || 0, clock: o.clock !== undefined ? DH.parseClock(o.clock) : r.clock }); return r.snapshot(); },
  auto(on = true, o = {}) { const d = DH.drive; if (!d) return false; d.ap = on ? new DH.Autopilot(d.run, Object.assign({ skill: 1 }, o)) : null; return true; },
  setTod(h) { DH.devTod = h; }, setWeather(w) { if (DH.drive) DH.drive.run.weather = w; },
  forceAspect(id, a) { const r = DH.drive && DH.drive.run; if (!r) return; r.forced = r.forced || {}; if (a) r.forced[id] = a; else delete r.forced[id]; r._aspects(); },
  trigger(type) { return DH.drive && DH.drive.run.events.trigger(type); },
  finishStage() { const r = DH.drive && DH.drive.run; if (!r) return; let n = 0; while (r.phase !== 'finished' && r.stopIdx < r.stops.length && n++ < 9) DH.Dev.skipStop(r, true); },
  setGrace(n) { if (DH.drive) DH.drive.run.grace = n; }
};
game.stateHash = () => { const d = DH.drive; return d ? [+d.run.s.toFixed(2), +d.run.train.v.toFixed(2), +d.run.grace.toFixed(1), d.run.score] : [game.sceneName]; };
/* ---- the start ---- */
const steps = [['Laying the Halo Line', () => { DH.route('halo'); }], ['Building the depot', () => { DH.route('depot'); }], ['Checking the signals', () => { const v = DH.route('halo').validation.concat(DH.route('depot').validation); if (v.length) console.warn('route validation: ' + v.join(' | ')); }]];
game.start({ scenes: DH.scenes, scene, data, boot: { title: 'DENSHA DE HALO!', steps } });
window.__dh = { game, DH, snapshot: () => game.debug.snapshot() };
})();
