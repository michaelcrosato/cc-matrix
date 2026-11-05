// The game: new E.Game, the settings, the pause menu, the boot steps, the scenes, game.debug
(() => {
const E = My3D2dge, SN = globalThis.SN;
const hubOn = !!(globalThis.AIHub && globalThis.AIHub.active);
SN.SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', group: 'Game', value: 'Normal', options: [['Easy', 'Easy'], ['Normal', 'Normal'], ['Hard', 'Hard']], help: 'How fast and how mean the other pilots are.' },
  { key: 'units', label: 'Speed units', group: 'Game', value: 'kmh', options: [['kmh', 'km/h'], ['mph', 'mph']] },
  { key: 'camera', label: 'Default camera', group: 'Game', value: 'chase', options: [['chase', 'Chase'], ['far', 'Far chase'], ['cockpit', 'Cockpit']] },
  { key: 'hudSize', label: 'HUD size', group: 'Game', value: 'normal', options: [['normal', 'Normal'], ['large', 'Large']], help: 'Large: everything on the race HUD a quarter bigger (a TV across the room).' },
  { key: 'subtitles', label: 'Subtitles', group: 'Game', value: true, help: 'The announcer and the radio as text.' },
  { key: 'announcer', label: 'Announcer voice', group: 'Game', value: true },
  { key: 'speedLines', label: 'Speed lines', group: 'Display', value: true },
  { key: 'bloom', label: 'Neon glow', group: 'Display', value: true, help: 'Bright lights bleed into the picture.' },
  { key: 'picture3d', label: 'Picture', group: 'Display', value: 'pixels', options: [['pixels', 'Pixels'], ['balanced', 'Balanced'], ['full', 'HD']], help: 'Pixels: the engine\'s own chunky resolution. HD: the screen\'s.' },
  { key: 'shadows3d', label: 'Shadows', group: 'Display', value: true },
  { key: 'filter3d', label: 'Filter', group: 'Display', value: 'clean', options: [['clean', 'None'], ['cel', 'Comic cel'], ['pixel', 'Pixel']] }
];
const game = SN.game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, bg: null, input: SN.INPUT, autoPause: !hubOn,
  menu: { items: () => SN.pauseItems ? SN.pauseItems() : [], settings: SN.SETTINGS, controls: SN.CONTROL_NAMES, quit: hubOn ? false : 'menu' }
});
game.input.touchEnabled = false;
SN.go = (name, data) => game.go(name, data, { fade: 'wipe', seconds: .25 });
SN.scenes = SN.scenes || {};
/** boot step: wait for the 3D add-on (a deferred module) and start its renderer */
function wake3D() {
  if (game.headless || typeof document === 'undefined') return;
  return new Promise((ok, fail) => {
    const t0 = Date.now(), poll = () => {
      if (E.World3D) return E.World3D.init(game).then(ok, fail);
      if (window.__sn3dFail || Date.now() - t0 > 30000) return fail(new Error('The 3D engine could not load (three.js from cdn.jsdelivr.net). Check the connection and reload.'));
      setTimeout(poll, 50);
    };
    poll();
  });
}
const steps = [
  ['Waking the 3D engine', wake3D],
  ['Surveying four circuits', () => { for (const id of SN.TRACK_IDS) SN.getTrack(id); }],
  !hubOn && ['Fuelling the hangar', () => { SN.hangar = new SN.Hangar(game); }],
  !hubOn && ['Polishing Port Solenne', () => { SN.loadView('solenne'); }],
  ['Reading the season', () => { if (SN.Save) SN.Save.init(); }]
].filter(Boolean);
/** the one track world alive (besides the hangar) */
SN.loadView = (id, skin = 'normal') => {
  const key = id + ':' + skin;
  if (SN.view && SN.view.key === key) return SN.view;
  if (SN.view) SN.view.dispose();
  SN.view = new SN.View(game, id, skin); SN.view.key = key;
  return SN.view;
};
if (typeof window !== 'undefined') window.__game = game;
game.start({ scenes: SN.scenes, scene: hubOn ? 'session' : 'title', boot: { title: 'SNIPEOUT HD', version: SN.VERSION, steps, messages: ['Calibrating anti-gravity', 'Negotiating with sponsors', 'Polishing the neon', 'Briefing race control'] } });
})();
