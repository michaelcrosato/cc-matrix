// ---------------------------------------------------------------- main: the game, settings, menu items, deep links, the debug handle, boot
const HUB = typeof window !== 'undefined' && window.AIHub && window.AIHub.active;
const game = MT.game = new E.Game(Object.assign({ canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'topdown'], input: MT.MENU, id: 'mashtv',
  menu: HUB ? false : {
    items: [['Dev mode', () => { if (!MT.dev.open()) MT.game.resume(); }], ['Episode map', () => MT.openOverlay('map')], ['How to play', () => MT.openOverlay('howto')]],
    settings: [
      { key: 'aimAssist', label: 'Aim assist (controller)', value: true, group: 'Game' },
      { key: 'autoFire', label: 'Auto-fire with the right stick', value: true, group: 'Game' },
      { key: 'camView', label: 'Camera', options: [['Studio', 'Studio'], ['Overhead', 'Overhead']], value: 'Studio', group: 'Game', apply: (g, v) => { try { g.setView(v === 'Overhead' ? 'topdown' : 'threequarter'); } catch (e) { /* before start */ } } },
      { key: 'subtitles', label: 'Subtitles', value: true, group: 'Game' },
      { key: 'chatter', label: 'Host chatter', options: [['Normal', 'Normal'], ['Less', 'Less'], ['Off', 'Off']], value: 'Normal', group: 'Game' },
      { key: 'confetti', label: 'Confetti amount', options: [['Party', 'Party'], ['Tasteful', 'Tasteful']], value: 'Party', group: 'Game' }],
    controls: MT.CONTROL_NAMES, quit: 'title'
  } }, HUB ? { corner: false, autoPause: false, backGesture: false, fullscreen: 'button' } : {}));
if (HUB) { for (const [key, value, extra] of [['aimAssist', true], ['autoFire', true], ['subtitles', true], ['chatter', 'Normal', ['Normal', 'Less', 'Off']], ['confetti', 'Party', ['Party', 'Tasteful']], ['camView', 'Studio', ['Studio', 'Overhead']]]) try { game.settings.define(Object.assign({ key, value, group: 'Game' }, extra ? { type: 'select', options: extra } : {})); } catch (e) { /* defined */ } }
if (!game.headless && !HUB && E.Shell) new E.Shell(game, { theme: { ink: '#fff7e8', paper: 'rgba(20,8,34,.94)', accent: '#ffcc33', danger: '#ff4d6d', line: 'rgba(255,204,51,.35)', titleFont: 'Impact, "Arial Black", system-ui', font: 'system-ui, sans-serif' } });
game.input.touchEnabled = false;
MT.cab = new E.Arcade(game, { id: 'mashtv', hud: false, idle: 10, lives: 3 });
MT.loadTunes(); game.timeScale = 1;
try { game.settings.set('glyphs', game.settings.glyphs || 'playstation'); } catch (e) { /* ok */ }

// scenes waiting on the hub
MT.scenes.hubwait = {
  input: MT.MENU,
  enter() { this.t = 0; this.done = false; MT.net.connect().then(info => { this.done = true; if (!info) { game.go('title', {}); return; } try { MT.net.hub.ready(); } catch (e) { game.fail('ready', e); } game.go('sessionCard', {}, { fade: 0 }); }).catch(e => { game.fail('connect', e); game.go('title', {}); }); },
  update(dt) { this.t += dt; },
  draw(r) { MT.ui.backdrop(r, game.real); r.overlay(g => { MT.drawLogo(g, r.W / 2, 60, 3); MT.ui.T(g, 'CONNECTING TO THE STUDIO...', r.W / 2, 120, '#2ee6ff', { align: 'center' }); }); }
};

// deep links: #title #lobby #howto #scores #about #attract #room=2-3 #boss=1 #greenroom #lightning #recap=2 #continue #gameover #initials #ending=a #credits #dev #card; &seed=N &players=N &bot=1
MT.deepLink = (hash) => {
  const h = String(hash || '').replace(/^#/, ''); if (!h) return null;
  const parts = h.split('&'), [k, v] = parts[0].split('='), opt = {};
  for (const p of parts.slice(1)) { const [a, b] = p.split('='); opt[a] = b === undefined ? true : b; }
  const players = Math.max(1, Math.min(4, +opt.players || 1)), seed = +opt.seed || 7;
  const mk = () => MT.newRun({ mode: 'test', seed, players: Array.from({ length: players }, (_, i) => ({ slot: i, look: i, input: i === 0 && !opt.bot ? game.input : null, ctl: i === 0 && !opt.bot ? 'local' : 'bot' })) });
  const map = { title: ['title'], lobby: ['lobby', { diff: 'CONTESTANT' }], howto: ['howto'], scores: ['scores'], about: ['about'], attract: ['attract'], gameover: ['gameover'], initials: ['initials', { fake: true }], credits: ['credits'], card: ['sessionCard', { fake: true }], difficulty: ['difficulty'], episodes: ['episodes'] };
  if (map[k]) { if (k === 'gameover' || k === 'credits') mk(); return map[k]; }
  if (k === 'room' && MT.ROOMS[v]) { mk(); return ['play', { room: v, noCard: true }]; }
  if (k === 'boss') { mk(); return ['play', { room: v + '-B', noCard: true }]; }
  if (k === 'greenroom') { mk(); return ['play', { room: 'GR', noCard: true }]; }
  if (k === 'lightning') { mk(); return ['play', { room: 'L1', noCard: true }]; }
  if (k === 'recap') { mk(); return ['recap', { ep: +v || 1, fake: true }]; }
  if (k === 'ending') { mk(); return ['ending', { kind: v === 'b' ? 'b' : 'a' }]; }
  if (k === 'dev') { mk(); return ['play', { room: '1-1', noCard: true, dev: true }]; }
  if (k === 'continue') { mk(); MT.later(.6, () => { for (const c of MT.run.contestants) { c.lives = 0; c.state = 'out'; } }); return ['play', { room: '1-1', noCard: true }]; }
  if (k === 'cold') { mk(); return ['cut', { id: 'cold' }]; }
  return null;
};

// the debug handle: tests and tools read it
const snap = () => {
  const W = MT.Show.W, run = MT.run, byKind = {};
  if (W) for (const e of W.enemies) if (!e.dead) byKind[e.kind] = (byKind[e.kind] || 0) + 1;
  return { scene: game.sceneName, mode: run && run.mode, ep: run && run.ep, room: W && W.room.id, phase: W && W.phase, state: MT.Show.state, wave: W ? W.waveIdx : -1, alive: W ? W.alive() : 0, byKind,
    bullets: W ? W.fShots.list.length : 0, pshots: W ? W.pShots.list.length : 0, pickups: W ? W.pickups.length : 0, R: W ? Math.round(W.ratings.R * 10) / 10 : 0, X: W ? W.ratings.X : 1, prime: W ? W.ratings.prime : 0, keys: run ? run.keys : 0,
    players: W ? W.contestants.map(c => ({ slot: c.slot, x: Math.round(c.x * 10) / 10, y: Math.round(c.y * 10) / 10, hp: c.hp, lives: c.lives, cash: c.cash, wpn: c.wpn, state: c.state, bombs: c.bombs, addons: Object.assign({}, c.addons) })) : [],
    boss: W && W.boss ? { kind: W.boss.kind, phase: W.boss.phase, form: W.boss.form, dead: W.boss.dead, parts: W.boss.parts.map(p => [p.id, Math.round(p.hp), p.alive]) } : null,
    overlay: MT.overlay.kind, errors: game.errors.length, touchOnly: MT.touch.only, idle: Math.round(MT.idle.t * 10) / 10, reel: MT.attract.reel };
};
game.debug = {
  snapshot: snap,
  warp: (t) => MT.dev.warp(t),
  spawn: (kind, n = 1, where = 'drop') => MT.dev.spawn(kind, n, where),
  give: (kind, slot = 0) => { const W = MT.Show.W, c = W && W.contestants[slot]; if (c) W.equip(c, kind); },
  cheat: (name, on = true) => MT.dev.cheat(name, on),
  tune: (k, v) => MT.setTune(k, v, false), resetTunes: () => MT.resetTunes(),
  bot: (slot, opts = {}) => { const c = MT.Show.W && MT.Show.W.contestants[slot]; if (c) { c.ctl = 'bot'; c.botOpts = opts; } },
  addBot: (look) => { const run = MT.run; const c = new MT.Contestant(run.contestants.length, { look: look === undefined ? run.contestants.length : look, ctl: 'bot' }); run.contestants.push(c); if (MT.Show.W) c.respawn(MT.Show.W); return c; },
  killAll: () => MT.dev.killAll(), clearRoom: () => MT.dev.clearRoom(),
  chooseExit: (dir) => { const W = MT.Show.W; if (W && W.arena.doors[dir].state === 'exit') { W.exitDir = dir; W.exitDest = W.arena.doors[dir].dest; W.result = 'exit'; W.setPhase('done'); } },
  teleport: (slot, x, y) => { const c = MT.Show.W && MT.Show.W.contestants[slot]; if (c) { c.x = x; c.y = y; } },
  netFake: (hub) => { MT.net.hub = hub; },
  seed: (n) => MT.seed(n),
  world: () => MT.Show.W,
  stateHash: () => { const W = MT.Show.W; if (!W) return 0; let h = 0; const add = v => { h = (Math.imul(h ^ Math.round(v * 100), 16777619) + 1) >>> 0; }; for (const c of W.contestants) { add(c.x); add(c.y); add(c.cash); add(c.hp); } for (const e of W.enemies) { add(e.x); add(e.y); add(e.hp); } add(W.fShots.list.length); add(W.ratings.R); return h; }
};
game.stateHash = () => game.debug.stateHash();

// the play scene also draws the debug overlays
const playDraw = MT.scenes.play.draw;
MT.scenes.play.draw = function (r) { playDraw.call(this, r); if (MT.Show.W) MT.dev.drawDebug(r, MT.Show.W); };

let first = 'title';
if (HUB) first = 'hubwait';
else if (typeof location !== 'undefined' && location.hash) { const dl = MT.deepLink(location.hash); if (dl) { first = dl[0]; MT.firstData = dl[1]; } }
MT.scenes.boot = { input: MT.MENU, enter() { this.go = true; }, update() { if (this.go) { this.go = false; game.go(first, MT.firstData || {}, { fade: 0 }); } }, draw(r) { r.sky(['#05020a', '#0a0414']); } };
game.start({ scenes: MT.scenes, scene: 'boot', boot: game.headless ? false : { title: 'MASH TV', version: MT.VERSION, steps: [['Building the studio', () => MT.cast.build()], ['Rehearsing the host', () => MT.babble.duration('MASH TV')], ['Warming up the crowd', () => MT.sets.audience()]], messages: ['Polishing the confetti cannons', 'Counting the prize money', 'Teaching the clapbots to clap'] } });
})();
