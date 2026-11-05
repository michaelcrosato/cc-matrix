// new E.Game, the boot steps, settings, the Shell (pause items, help, dev), scenes, deep links and the debug handle.
(() => {
const E = My3D2dge, WP = globalThis.WP;
WP.INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  fire: ['Mouse0', 'Space', 'KeyJ', 'Pad7'], grenade: ['Mouse2', 'KeyG', 'KeyK', 'Pad6', 'Pad5'],
  reload: ['KeyR', 'KeyL', 'Mouse1', 'Pad2'], snap: ['KeyQ', 'Pad4'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyJ', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'], more: ['KeyM', 'Pad3']
};
const hub = typeof AIHub !== 'undefined' && AIHub.active;
WP.inHub = hub;
const sceneHook = () => WP.ctx.game && WP.ctx.game.sceneName;
const game = new E.Game({
  canvas: 'screen', res: [480, 270], input: WP.INPUT, id: 'operation-wolfpack', bg: '#141a0c', autoPause: !hub, corner: !hub,
  menu: hub ? { items: [], quit: false } : {
    items: () => { const g = WP.ctx.game, inPlay = g.sceneName === 'play', items = [];
      if (inPlay) items.push(['Restart operation', () => { g.shell.hide(); const op = WP.Flow.sim && WP.Flow.sim.stage.id; if (op && op !== 'range') WP.Flow.continueOp(g, op); else g.go('play', { op: 'range', noCard: true }); }]);
      items.push(['Dev mode', () => WP.Dev.open(g)]);
      if (inPlay && (g.players || []).length > 1) items.push(['Drop out (last player)', () => { const ps = g.players; const p = ps[ps.length - 1]; g.removePlayer(p); const sim = WP.Flow.sim; if (sim) { const q = sim.players[sim.players.length - 1]; if (q && q.slot > 0) { q.gone = true; delete WP.ctx.locals[q.pid]; } } g.shell.hide(); }]);
      return items; },
    controls: { fire: 'Fire', grenade: 'Grenade', reload: 'Reload', snap: 'Snap to threat', more: false }, quit: 'title'
  }
});
WP.ctx.game = game;
E.Shell.hiddenGroups = ['Dev'];
// settings
for (const s of WP.GAME_SETTINGS) game.settings.define(Object.assign({ group: 'Game' }, s));
WP.Dev.define(game);
WP.Input.settings.assist = WP.ASSISTS[game.settings.assist] === undefined ? .6 : WP.ASSISTS[game.settings.assist];
WP.Input.settings.speed = game.settings.crossSpeed || 1;
WP.ctx.markers = game.settings.markers !== false; WP.ctx.bigText = game.settings.textSize === 'Large';
if (game.settings.glyphs !== game.settings.symbols) game.settings.set('glyphs', game.settings.symbols || 'playstation');
// the shell: the theme, help
if (typeof document !== 'undefined') { const st = document.createElement('style'); st.textContent = WP.CSS; document.head.appendChild(st); }
game.shell = new E.Shell(game, { theme: WP.THEME, screens: { help: Object.assign({ title: 'How to play' }, WP.HELP()) } });
// keep the mirror of the button symbols in step with the Controls screen's own setting
const S0 = game.settings, prevChange = S0.onChange;
S0.onChange = k => { if (prevChange) prevChange(k); if (k === 'glyphs' && S0.symbols !== S0.glyphs && (S0.glyphs === 'playstation' || S0.glyphs === 'xbox')) S0.set('symbols', S0.glyphs); if (k === 'symbols' || k === 'glyphs') game.shell.show && game.shell.screen === 'settings' && game.shell._render && game.shell._render(); };
// the arcade cabinet: tables, initials
WP.Store.cab = new E.Arcade(game, { id: WP.Store.id, hud: false, lives: 1 });
if (!WP.Store.cab.table('campaign').length) { try { E.store.set('arcade:' + WP.Store.id + ':campaign', [['LOB', 120000], ['FNG', 90000], ['TUN', 75000], ['MSH', 60000], ['DEN', 50000], ['GIG', 40000], ['HAL', 30000], ['AMA', 25000], ['SKP', 20000], ['GRT', 10000]].map(([name, score]) => ({ name, score }))); } catch (e) { /* blocked */ } }
WP.Audio.define(game);
// ---------- scenes ----------
const scenes = {
  title: WP.titleScene, attractScores: WP.attractScoresScene, squad: WP.squadScene,
  map: WP.mapScene, opcard: WP.opcardScene, play: Object.assign(WP.playScene, { pausable: !hub }),
  tally: WP.tallyScene, continue: WP.continueScene, ending: WP.endingScene, credits: WP.creditsScene,
  initials: WP.initialsScene, about: WP.aboutScene, cutscene: WP.cutsceneScene, hubcard: WP.Net.cardScene
};
// the banners over every scene that plays
const playDraw = WP.playScene.draw;
WP.playScene.draw = function (r) { playDraw.call(this, r); r.overlay(g => WP.Screens.drawBanners(g, 1 / 60)); };
// ---------- deep links: #title #attract #about #map #op1..#op6 #op3/boss #op6/b #cut/interrogation #ending/5 #range #dev ----------
function deepLink() {
  const h = (typeof location !== 'undefined' && location.hash || '').slice(1); if (!h) return false;
  const [a, b] = h.split('/');
  if (a === 'title') return false;
  WP.Flow.newRun({ diff: 'VETERAN' });
  if (a === 'attract') { WP.Attract.start(game); return true; }
  if (a === 'about') { game.go('about'); return true; }
  if (a === 'map') { game.go('map'); return true; }
  if (a === 'range') { game.go('play', { op: 'range', noCard: true }); return true; }
  if (a === 'dev') { WP.Dev.openOnPlay = true; game.go('play', { op: 'op1', noCard: true }); return true; }
  if (/^op[1-6]$/.test(a)) { WP.Flow.run.single = true; if (b === 'boss' || b === 'b') WP.Dev.jump(game, a, b === 'b' ? 'partB' : 'boss'); else game.go('play', { op: a }); return true; }
  if (a === 'cut') { game.go('cutscene', { id: b || 'briefing', next: 'title' }); return true; }
  if (a === 'ending') { WP.Flow.run.hostagesSaved = +(b || 5); game.go('ending', { n: +(b || 5) }); return true; }
  if (a === 'tally') { WP.Flow.run.single = true; game.go('play', { op: b || 'op1', noCard: true, jump: sim => { sim.after(.2, () => { sim.state = 'clear'; }); } }); return true; }
  if (a === 'continue') { game.go('continue', { op: 'op1', score: 12300, players: [{ pid: 0, score: 12300 }] }); return true; }
  if (a === 'squad') { game.go('squad'); return true; }
  if (a === 'touch') { WP.Touch.on = true; return false; }
  return false;
}
// ---------- the debug handle (tests and the engine's tools) ----------
game.debug = {
  snapshot: () => { const s = WP.Flow.sim; return Object.assign({ scene: game.sceneName, demo: WP.ctx.demo, attract: WP.Attract.phase, touch: WP.Touch.on, music: WP.Music.cur, errors: game.errors.length, dev: WP.tuneChanged(), run: WP.Flow.run ? { ops: WP.Flow.run.opsDone.slice(), hostagesFreed: WP.Flow.run.hostagesFreed, hostagesSaved: WP.Flow.run.hostagesSaved, loop: WP.Flow.run.loop, continues: WP.Flow.run.continues, perks: Object.keys(WP.Flow.run.perks) } : null }, s && game.sceneName === 'play' ? s.snapshot() : {}, WP.Net.state ? { hub: WP.Net.snap() } : {}); },
  jump: (op, beat) => WP.Dev.jump(game, op, beat),
  cheat: (name, on = true) => { WP.Dev.cheats[name] = on; },
  tune: (key, value) => { game.settings.set('t_' + key, value); return WP.T[key]; },
  spawn: (type, o) => { const s = WP.Flow.sim; const e = s && s.spawn(type, o || {}); return e ? e.id : null; },
  aim: (pid, x, y) => { WP.Input.override(pid, () => ({ x, y, fire: false, grenade: 0, reload: 0 })); },
  frames: (pid, fn) => WP.Input.override(pid, fn),
  sim: () => WP.Flow.sim, hub: () => WP.Net.state, WP
};
// local co-op: Options on a controller nobody holds joins, anywhere but a session
if (!hub) game.allowJoin({ max: 4, keys: false, onJoin: (input, n) => WP.Flow.onJoin(game, input, n) });
// ---------- boot ----------
WP.Touch.init(game);
game.start({
  scenes, scene: 'title',
  boot: { title: 'OPERATION WOLFPACK', version: WP.VERSION, steps: [
    ['Briefing the pack', () => { WP.Render.init(); }],
    ['Loading magazines', () => { void WP.FLOOR_TEX.grass; void WP.FLOOR_TEX.dirt; void WP.FLOOR_TEX.sand; }],
    ['Fueling Old Howler', () => { void WP.FLOOR_TEX.mud; void WP.FLOOR_TEX.concrete; void WP.FLOOR_TEX.asphalt; void WP.FLOOR_TEX.cobble; void WP.FLOOR_TEX.dryGrass; }],
    ['Waking the hyenas', () => { WP.pendingBoot = () => { if (hub) { WP.Net.boot(game); return true; } return deepLink(); }; }]
  ], messages: ['Counting the bullets', 'Oiling the WOLF-9', 'Painting the jeeps tan', 'Teaching the goats to carry'] }
});
})();
