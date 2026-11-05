// ---- main: the game (session-aware), our settings, pause items, boot steps, scenes, deep links, the debug handle ----
const HUB_ACTIVE = !!(GLOBAL.AIHub && GLOBAL.AIHub.active);
const SETTINGS = [
  { key: 'aimAssist', label: 'Aim assist (controller)', value: true, help: 'Nudges your aim toward a nearby enemy when you aim with a stick' },
  { key: 'autoFire', label: 'Auto-fire with the right stick', value: true, help: 'Pushing the right stick fires; off: hold R2 to fire' },
  { key: 'camView', label: 'Camera', options: ['Studio', 'Overhead'], value: 'Studio', help: 'Studio: the three-quarter studio camera. Overhead: straight down', apply: (g, v) => { if (g.sceneName === 'play') g.setView(v === 'Overhead' ? 'topdown' : 'threequarter'); } },
  { key: 'subtitles', label: 'Subtitles', value: true },
  { key: 'chatter', label: 'Host chatter', options: ['Normal', 'Less', 'Off'], value: 'Normal', help: 'How often Lance and Penny talk during play (story scenes always play)' },
  { key: 'confetti', label: 'Confetti amount', options: ['Party', 'Tasteful'], value: 'Party', apply: (g, v) => { if (g.particles) g.particles.max = v === 'Party' ? 900 : 350; } },
];
/** a pause item closes the engine's pause screen first (it would hold the game's input back), then opens our overlay */
function leavePause() { if (game.shell && game.shell.screen) game.shell.hide(); game.resume(); if (HAS_DOM && document.activeElement && document.activeElement.blur) document.activeElement.blur(); for (const p of game.players) p.consumeAll(); }
const PAUSE_ITEMS = () => (MT.sessionActive() || (MT.run && MT.run.mode === 'attract') || game.sceneName !== 'play') ? [] : [
  ['Dev mode', () => { leavePause(); MT.dev.open(); }],
  ['Episode map', () => { leavePause(); MT.openMapOverlay(); }],
  ['How to play', () => { leavePause(); MT.openHowtoOverlay(); }],
];
/** our pause-menu overlays: while one is open the scene cannot pause; Esc or Options goes back to the pause menu,
 *  cancel (Backspace, ○) back to play */
function pauseOverlay(who, ov) {
  const sc = game.scene; const was = sc.pausable; sc.pausable = false;
  MT.overlay.open = true; MT.overlay.who = who; ov.t = 0;
  const step = ov.step;
  ov.update = function (dt) {
    this.t += dt;
    const toMenu = this.t > .15 && game.players.some(q => q.map.pause && q.pressed('pause')), toPlay = this.t > .15 && !toMenu && game.players.some(q => q.map.cancel && q.pressed('cancel'));
    if (toMenu || toPlay) { MT.sfx('back'); this.toMenu = toMenu; return false; }
    if (step) step.call(this, dt);
    return true;
  };
  ov.done = () => { MT.overlay.open = false; MT.overlay.who = null; sc.pausable = was; for (const q of game.players) q.consumeAll(); if (ov.toMenu) game.pause('player'); };
  PLAY.show(ov);
}
MT.openMapOverlay = () => {
  const run = MT.run, room = run && MT.ROOMS[run.roomId]; if (!room || !room.ep) return;
  pauseOverlay('map', { draw(r) { r.overlay(g => { HUD.mapCard(g, r, room.ep, run, run.roomId, null, game.real, 1); UI.promptBar(g, r, [['cancel', 'CLOSE'], ['pause', 'MENU']]); }); }, step() { if (game.input.clicked()) this.t = this.t; } });
};
MT.openHowtoOverlay = () => {
  pauseOverlay('howto', { page: 0, step() { const nav = UI.nav(), n = MT.TEXT.howto.length; if (nav.right || nav.tabR) this.page = Math.min(n - 1, this.page + 1); if (nav.left || nav.tabL) this.page = Math.max(0, this.page - 1); }, draw(r) { r.overlay(g => { px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.bw, r.bh, '#0c0618')); MT.drawHowto(g, r, this.page, game.real, null); }); } });
};
game = new E.Game(Object.assign({ canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', input: MASH_MENU, id: 'mashtv', fadeTime: .2,
  menu: { items: PAUSE_ITEMS, settings: SETTINGS, controls: CONTROL_NAMES, quit: HUB_ACTIVE ? false : 'title' } },
  HUB_ACTIVE ? { corner: false, autoPause: false, backGesture: false, fullscreen: 'button' } : {}));
MT.game = game;
game.input.names = CONTROL_NAMES;
E.style.propSize = 1.2;
MT.cab = new E.Arcade(game, { id: 'mashtv', hud: false, idle: 10 });
MT.loadTunes();
// scenes
const SCENES = Object.assign({}, MT.scenes);
SCENES.attract = MT.attract.scene;
if (MT.net) { SCENES.sessionCard = MT.net.cardScene; SCENES.sessionEnd = MT.net.endScene; SCENES.sessionServer = MT.net.serverScene; }
/** deep links for checks and screenshots: #room=2-3, #boss=2, #recap=1, #ending=b, #dev, #card ... (&seed=N&players=N&bot=1) */
function deepLink() {
  if (!HAS_DOM || HUB_ACTIVE) return null;
  const h = (location.hash || '').replace(/^#/, ''); if (!h) return null;
  const q = {}; for (const part of h.split('&')) { const [k, v] = part.split('='); q[k] = v === undefined ? true : decodeURIComponent(v); }
  return q;
}
MT.warpRun = (o = {}) => {
  const n = clamp(+o.players || 1, 1, 4);
  MT.newRun({ mode: o.mode || 'rehearsal', diff: o.diff || 'CONTESTANT', seed: o.seed !== undefined ? +o.seed : 7 });
  for (let i = 0; i < n; i++) MT.addRunPlayer({ slot: i, look: i, ctl: i === 0 && !o.bot ? 'local' : 'bot', input: i === 0 ? game.input : null, bot: {}, god: !!o.god });
  if (o.keys) MT.run.keys = +o.keys;
  return MT.run;
};
function startFromLink(q) {
  if (!q) return null;
  if (q.title) return ['title', {}];
  for (const s of ['lobby', 'howto', 'scores', 'about', 'attract', 'episodes', 'difficulty']) if (q[s]) return [s, {}];
  if (q.room) { MT.warpRun(q); return ['play', { room: q.room }]; }
  if (q.boss) { MT.warpRun(q); return ['play', { room: q.boss + '-B' }]; }
  if (q.greenroom) { MT.warpRun(Object.assign({ keys: 5 }, q)); return ['play', { room: 'GR', intro: 'greenroom' }]; }
  if (q.lightning) { MT.warpRun(Object.assign({}, q)); return ['play', { room: 'L1' }]; }
  if (q.recap) { MT.warpRun(q); return ['recap', { ep: +q.recap || 1, fake: true }]; }
  if (q.continue) { MT.warpRun(q); return ['play', { room: '1-1', after: w => { for (const c of w.contestants) { c.pr.lives = 0; c.state = 'out'; } } }]; }
  if (q.gameover) { MT.warpRun(q); return ['gameover', {}]; }
  if (q.initials) { MT.warpRun(Object.assign({ mode: 'arcade' }, q)); return ['initials', { queue: [{ slot: 0, cash: 123450, input: game.input, name: 'ROCKET' }] }]; }
  if (q.ending) { MT.warpRun(q); return ['ending', { kind: q.ending === 'b' ? 'b' : 'a' }]; }
  if (q.credits) { MT.warpRun(q); return ['ending', { kind: 'a', credits: true }]; }
  if (q.dev) { MT.warpRun(q); return ['play', { room: '1-1', after: () => MT.dev.open() }]; }
  if (q.card && MT.net) return ['sessionCard', { preview: true }];
  if (q.coldopen) { MT.warpRun(q); return ['play', { room: '1-1', intro: 'coldOpen' }]; }
  if (q.episode) { MT.warpRun(q); return ['play', { room: MT.EPISODES[+q.episode || 1].start, intro: 'episode' }]; }
  return null;
}
game.debug = {
  snapshot() {
    const w = PLAY.world, run = MT.run;
    const byKind = {}; if (w) for (const e of w.enemies) byKind[e.kind] = (byKind[e.kind] || 0) + 1;
    return { scene: game.sceneName, mode: run && run.mode, ep: run && run.ep, room: run && run.roomId, phase: w && w.phase, wave: w && w.wave, alive: w ? w.countedAlive() : 0, enemies: w ? w.enemies.length : 0, byKind,
      bullets: w ? w.fShots.list.length : 0, pickups: w ? w.pickups.length : 0, R: w ? Math.round(w.ratings.R) : 0, X: w ? w.ratings.X : 1, keys: run ? run.keys : 0,
      players: run ? run.contestants.map(c => ({ slot: c.slot, x: Math.round(c.x), y: Math.round(c.y), hp: c.hp, lives: c.pr.lives, cash: c.pr.cash, wpn: c.weapon, state: c.state })) : [],
      boss: w && w.boss ? { kind: w.boss.kind, phase: w.boss.phase, stage: w.boss.stage, parts: w.boss.parts.map(p => [p.id, Math.round(p.hp)]) } : null, errors: game.errors.length, overlay: !!PLAY.overlay, dev: !!(MT.dev && MT.dev.isOpen()) };
  },
  warp(target, o = {}) { return MT.dev.warp(target, o); },
  spawn(kind, n = 1, where = 'N') { const w = PLAY.world; if (!w) return; MT.spawnEntry(w, [where, kind, n, .1]); },
  give(kind, slot = 0) { const w = PLAY.world, c = MT.run && MT.run.contestants[slot]; if (w && c) MT.giveItem(w, c, kind); },
  cheat(name, on = true) { MT.cheats[name] = !!on; },
  tune(key, v) { return MT.setTune(key, v); }, resetTunes() { MT.resetTunes(); },
  bot(slot, opts = {}) { const c = MT.run && MT.run.contestants[slot]; if (c) { c.ctl = 'bot'; c.botOpts = opts; } },
  addBot(look) { const w = PLAY.world, c = MT.addRunPlayer({ slot: MT.run.contestants.length, look: look === undefined ? MT.run.contestants.length : look, ctl: 'bot', bot: {} }); if (w) { w.contestants.push(c); const [x, y] = w.freePoint(20); c.dropIn(x, y); } return c; },
  killAll() { const w = PLAY.world; if (!w) return; for (const e of w.enemies.slice()) if (!ENEMIES[e.kind].harmless) w.killEnemy(e, { owner: 0, w: 'dev' }); },
  clearRoom() { const w = PLAY.world; if (!w) return; if (w.script) w.script.cancel(); for (const d of DOOR_IDS) w.arena.doors[d].queue.length = 0; w.timers = w.timers.filter(t => !t.spawn); for (const e of w.enemies.slice()) if (!ENEMIES[e.kind].harmless) w.killEnemy(e, { owner: null, self: true, noCash: true }); w.wavesSpawned = true; if (w.boss) { for (const p of w.boss.parts) { p.hp = 0; p.alive = false; } w.boss.introDone = true; if (w.phase === 'BOSS_INTRO') w.setPhase('BOSS'); } if (w.phase === 'WAVES' || w.phase === 'INTRO' || w.phase === 'ENTER') { w.setPhase('WAVES'); } },
  chooseExit(dir) { const w = PLAY.world; return w ? w.chooseExit(dir, w.contestants[0]) : false; },
  teleport(slot, x, y) { const c = MT.run && MT.run.contestants[slot]; if (c) c.place(x, y); },
  seed(n) { MT.seedAll(n); },
  stateHash() { const w = PLAY.world; if (!w) return 0; let h = 2166136261; const mix = v => { h ^= Math.round(v * 10) | 0; h = Math.imul(h, 16777619) >>> 0; }; for (const c of w.contestants) { mix(c.x); mix(c.y); mix(c.hp); mix(c.pr.cash); } for (const e of w.enemies) { mix(e.x); mix(e.y); mix(e.hp); } mix(w.ratings.R); mix(w.enemies.length); mix(w.fShots.list.length); return h >>> 0; },
  netFake(hub) { if (MT.net) MT.net.inject(hub); },
};
game.stateHash = () => game.debug.stateHash();
const link = startFromLink(deepLink());
const firstScene = HUB_ACTIVE ? 'sessionCard' : link ? link[0] : 'title', firstData = link ? link[1] : {};
SCENES.boot = { input: MASH_MENU, update() { if (!this.went) { this.went = true; game.go(firstScene, firstData, { fade: 0 }); } }, draw(r) { r.sky(['#140a24', '#2a1446', '#140a24']); } };
game.start({ scenes: SCENES, scene: 'boot',
  boot: { title: 'MASH TV', version: MT.VERSION, steps: [
    ['Hanging the studio lights', () => { defineShapes(); MT.art.logoMask(); }],
    ['Tuning the house band', () => defineSfx()],
    ['Briefing the security goons', () => { installPresetHook(); installIdle(); for (const p of game.players) p.touchEnabled = false; }],
  ], messages: ['Inflating the party poppers', 'Rehearsing the mimes (silently)', 'Counting the prize money', 'Calibrating the applause sign'] } });
if (HUB_ACTIVE && MT.net) MT.net.begin();
})();
