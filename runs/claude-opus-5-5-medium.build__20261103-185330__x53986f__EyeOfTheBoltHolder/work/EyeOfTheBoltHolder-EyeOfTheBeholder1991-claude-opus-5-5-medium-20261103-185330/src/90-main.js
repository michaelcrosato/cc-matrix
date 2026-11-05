/* MAIN: the game, its settings (the engine's, plus a Game group), saves, the pause menu's extra rows, the boot steps
 * (the hub's hello first, then the 3D worlds), the scenes, and game.debug for the tests. */
const hubInfo = await B.Hub.connect();
const inSession = !!hubInfo;
const GAME_SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', group: 'Game', type: 'select', value: 'normal', options: [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']], help: 'Easy: monsters hit softer and hunger is slower. Hard: they hit harder, and rest is more often interrupted.', apply: (g, v) => { if (B.S && B.S.mode === 'campaign') B.S.diff = v; } },
  { key: 'menuTime', label: 'Time in menus', group: 'Game', type: 'select', value: .25, options: [[0, 'Pause'], [.25, 'Slow'], [1, 'Real time']], help: 'How fast the world runs while the Party, Cast or Map screen is open.' },
  { key: 'stepAnim', label: 'Step animation', group: 'Game', type: 'select', value: 'smooth', options: [['smooth', 'Smooth'], ['quick', 'Quick'], ['instant', 'Instant']], help: 'How a step and a turn move the view.', apply: (g, v) => { B.stepScale = v === 'smooth' ? 1 : v === 'quick' ? .57 : 0; } },
  { key: 'headBob', label: 'Head bob', group: 'Game', type: 'toggle', value: true, apply: (g, v) => { B.settingBob = v; } },
  { key: 'hints', label: 'Hints', group: 'Game', type: 'toggle', value: true, help: 'First-time tips with your own buttons, and gentle hints when a puzzle holds you up.' },
  { key: 'levelUp', label: 'Level up', group: 'Game', type: 'select', value: 'now', options: [['now', 'At once'], ['rest', 'On rest']], apply: (g, v) => { B.settingLevelUp = v; } },
  { key: 'voiceVol', label: 'Voices volume', group: 'Sound', type: 'slider', value: .8, min: 0, max: 1, step: .05, apply: (g, v) => { g.audio.voiceVolume = v; g.audio.applyVolume(); } }
];
const menuItems = () => {
  if (inSession) return [];
  const G = B.game, sc = G.sceneName; if (sc !== 'play') return [];
  return [['Journal', () => { G.resume(); B.Play.openScreen('journal', { tab: 0 }); }], ['Dev Mode', () => { G.resume(); B.Play.openScreen('dev', { tab: 0 }); }], ['About & Credits', () => { G.resume(); G.go('about', { back: 'play' }, { fade: 0 }); }]];
};
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, bg: null, input: B.INPUT,
  menu: { items: menuItems, settings: (E.World3D ? E.World3D.SETTINGS : []).concat(GAME_SETTINGS), saves: inSession ? false : { version: 1, migrate: (data, from) => data }, controls: B.ACTION_NAMES, quit: inSession ? false : 'title' }
});
B.game = game;
if (game.input) game.input.names = Object.assign({}, B.ACTION_NAMES);
if (B.touchOnly()) game.input.touchEnabled = false;
if (typeof addEventListener === 'function' && typeof document !== 'undefined') {
  let last = null;
  addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; if (last && Math.hypot(e.clientX - last[0], e.clientY - last[1]) > 4 && game.input.lastDevice === 'keyboard') game.input.lastDevice = 'mouse'; last = [e.clientX, e.clientY]; });
  addEventListener('keydown', () => { B.sawKeys = true; });
}
B.UI.textEntry = e => game.sceneName === 'create' && B.Create.textEntry(e);
// saves: the whole sim state, its place and the party's best level
if (game.saves) {
  game.saves.write = () => ({ data: JSON.parse(JSON.stringify(B.S)), place: B.F().name, level: Math.max(...B.S.party.members.map(m => m.lvl)) });
  game.saves.read = save => { B.S = JSON.parse(JSON.stringify(save.data)); B.S.events = []; B.buildRuntime(); B.look(); game.go('play', { resume: true }); };
}
B.DevMode.load();
B.Music.init(game);
B.view = new B.NullView();
const steps = [];
if (E.World3D) {
  steps.push(['The 3D engine', async () => { await E.World3D.init(game, inSession ? { backend: 'webgl' } : {}); B.registerThings(); B.view = new B.View3D(game); }]);   // (a session's several copies share one GPU: WebGL 2 is the steadier there)
  if (inSession) steps.push(['The Rat Run', () => { B.view.build('race'); }]);
  else {
    for (const fid of ['f1', 'f2', 'f3', 'f4', 'race']) steps.push([B.FLOORS[fid].name, () => { B.view.build(fid); }]);
    steps.push(['The city above', () => { B.stage = new B.Stage(game); }]);
  }
} else if (typeof document !== 'undefined') steps.push(['The 3D libraries', () => { throw new Error('The 3D libraries could not load. Check the connection and reload.'); }]);
// the 3D view draws the hub's ghosts
if (B.View3D) { const od = B.View3D.prototype.onDraw; B.View3D.prototype.onDraw = function (w) { od.call(this, w); if (B.S && this.worlds[this.fid] && this.worlds[this.fid].world === w) B.Ghosts.lastDrawn = B.Ghosts.draw(w, B.UI.t); }; }
const scenes = {
  title: B.Title, create: B.Create, about: B.About, over: B.Over, ending: B.Ending, cutscene: B.Cutscene, attract: B.Attract,
  play: B.Play, race: B.RaceScene, hubcard: B.HubCard
};
for (const s of Object.values(scenes)) { s.input = B.INPUT; s.view = 'iso'; }
B.Play.camera = false;
game.start({ scenes, scene: inSession ? 'hubcard' : 'title', boot: { title: 'EYE OF THE BOLT-HOLDER', steps } });
if (typeof document !== 'undefined') { const bt = document.getElementById('e3-boot'); if (bt) setTimeout(() => { if (bt.parentNode && !steps.length) bt.remove(); }, 0); }
/* ---- the tests' handle ---- */
game.debug = {
  snapshot() {
    const S = B.S, scr = B.Play.screen;
    return { scene: game.sceneName, floor: S && S.floor, cell: S && [S.party.cx, S.party.cy], dir: S && S.party.dir, hand: S && S.party.hand && S.party.hand.id, screen: scr && scr.name, focus: scr && scr.focus,
      party: S && S.party.members.map(m => ({ name: m.name, hp: m.hp, max: m.max, state: m.state, food: Math.round(m.food), lvl: m.lvl, cool: m.cool })), talk: S && S.talk && S.talk.id, over: S && S.over,
      mons: S && B.FS().mons.filter(m => m.hp > 0 && B.manh(m.cx, m.cy, S.party.cx, S.party.cy) <= 4).map(m => [m.type, m.cx, m.cy, m.state]), flags: S && S.flags, attract: B.Attract.v && B.Attract.v.name, device: game.input.lastDevice };
  },
  state: () => B.S, hash: () => B.hash(), cmd: c => B.Play.cmd(c), B,
  warp: (fid, x, y, d = 0) => B.devWarp(fid, x, y, d), give: id => B.giveParty(B.item(id)), cheats: B.CHEATS, bot: B.Bot,
  layout: (name, W, H, o = {}) => B.SCREENS[name].layout(W, H, Object.assign({ m: 0, lvl: 1, tab: 0 }, o))
};
