// Boot: the game, its settings and shell, the arcade frame, deep links, touch-only mode, the debug handle, start.
(() => {
const E = My3D2dge, WP = globalThis.WP, hub = WP.hub;
const pauseItems = () => {
  const g = WP.game, sc = g.sceneName, play = sc === 'play' && WP.Play.sim && !WP.Play.attract;
  const items = [];
  if (play && !WP.Play.range) items.push(['Restart operation', () => { g.shell.hide(); g.go('play', { op: WP.Play.sim.opn, restart: true }); }]);
  if (!hub) items.push(['Dev mode', () => WP.Dev.open()]);
  if (play && (g.players || []).length > 1) items.push(['Drop out (last wolf)', () => { const ps = g.players; const p = ps[ps.length - 1]; const s = WP.Play.sim; if (s && s.players.length > 1) s.players.pop(); g.removePlayer(p); g.shell.hide(); }]);
  return items;
};
const game = WP.game = new E.Game({ canvas: 'screen', res: [WP.W, WP.H], input: WP.INPUT, bg: '#0b0c08', autoPause: !hub,
  menu: hub ? false : { items: pauseItems, quit: 'title', controls: { more: false, up: false, down: false, left: false, right: false } } });
if (game.input) { game.input.touchEnabled = false; game.input.names = Object.assign({}, game.input.names || {}, WP.ACTION_NAMES); }
WP.setupShell(game);
WP.Radio.init(game);
WP.cab = new E.Arcade(game, { id: 'wolfpack', hud: false, idle: 10, demo: 150, scores: 6 });
if (!E.store.get('wp:seed', null)) E.store.set('wp:seed', 1);
// touch-only devices: no touch controls, a notice and the settings button; attract runs; a key or a pad ends it
let touchMode = null, keyed = false;
WP.touchOnly = () => {
  if (touchMode !== null) return touchMode;
  if (typeof matchMedia === 'undefined' || typeof navigator === 'undefined') return (touchMode = false);
  const pads = navigator.getGamepads ? [...(navigator.getGamepads() || [])].some(Boolean) : false;
  touchMode = !!(matchMedia('(any-pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches && navigator.maxTouchPoints > 0 && !pads && !keyed);
  return touchMode;
};
if (typeof addEventListener !== 'undefined') { addEventListener('keydown', () => { keyed = true; touchMode = false; }); addEventListener('gamepadconnected', () => { touchMode = false; }); }
WP.resetTouch = () => { touchMode = null; keyed = false; };
// deep links (6.4)
const hash = typeof location !== 'undefined' ? (location.hash || '').slice(1) : '';
const route = () => {
  if (hub) return ['hubcard', {}];
  const m = hash.match(/^op([1-6])(?:\/(\w+))?$/);
  if (m) { WP.run = WP.newRun({ diff: game.settings.difficulty }); WP.run.mission = true; return ['play', { op: +m[1], jump: m[2] === 'b' ? 'B' : m[2] || undefined }]; }
  if (hash.startsWith('cut/')) return ['cutscene', { id: hash.slice(4), next: 'title' }];
  if (hash.startsWith('ending/')) { WP.run.hostagesHome = +hash.slice(7); return ['ending', { n: +hash.slice(7) }]; }
  if (hash === 'attract') return ['attractStart', {}];
  if (hash === 'range') return ['play', { range: true }];
  if (hash === 'dev') return ['play', { op: 1, dev: true, openDev: true }];
  if (['title', 'about', 'map', 'scores', 'squad', 'credits'].includes(hash)) return [hash, {}];
  return ['title', {}];
};
const scenes = Object.assign({}, WP.SCENES, {
  attractStart: { enter() { WP.Attract.start(); }, update() {}, draw() {} }
});
if (WP.Net) WP.Net.addScenes(scenes);
// the debug handle (tests, check.mjs, replay)
game.debug = {
  snapshot: () => {
    const s = WP.Play.sim, sc = game.sceneName;
    return { scene: sc, attract: !!WP.Play.attract, op: s ? s.opn : null, sim: s && sc === 'play' ? s.snapshot() : null, run: { diff: WP.run.diff, loop: WP.run.loop, done: WP.run.done, perks: WP.run.perks, hostagesFreed: WP.run.hostagesFreed, continues: WP.run.continues },
      dev: WP.Dev.changed(), errors: game.errors.length, touch: WP.touchOnly(), hub: WP.Net ? WP.Net.state : null };
  },
  jump: (op, at) => game.go('play', { op, jump: at }),
  cheat: (k, on) => { WP.CHEATS[k] = on; },
  tune: (k, v) => { WP.T[k] = v; },
  spawn: (type, o) => WP.Play.sim && WP.Play.sim.spawn(type, o || {}).id,
  aim: (seat, x, y) => { const s = WP.Play.sim; if (s && s.players[seat]) { s.players[seat].x = x; s.players[seat].y = y; } },
  frames: (seat, fn) => WP.Players.override(seat, fn),
  sim: () => WP.Play.sim,
  hub: () => WP.Net && WP.Net.state
};
const [first, data] = route();
game.start({ scenes, scene: first === 'play' || first === 'cutscene' || first === 'ending' ? 'title' : first, boot: { title: 'OPERATION BIG BAD WOLF', steps: [
  ['Loading the pack', () => { for (const k of WP.SEAT_NAMES) WP.rigNew(k.toLowerCase()); }],
  ['Painting the coast', () => { if (WP.hasDOM) WP.Render.viewFor(WP.STAGES[0], 'A'); }],
  ['Ready', () => { if (first === 'play' || first === 'cutscene' || first === 'ending') WP.deepLink = [first, data]; }]
] } });
if (WP.hasDOM && typeof document !== 'undefined') document.title = 'Operation Big Bad Wolf';
})();
