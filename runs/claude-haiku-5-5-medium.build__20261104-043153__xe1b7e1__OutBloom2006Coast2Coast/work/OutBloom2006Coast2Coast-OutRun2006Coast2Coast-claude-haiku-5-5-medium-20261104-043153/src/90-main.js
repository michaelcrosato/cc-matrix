// The game: the scenes, the menu of the pause screen, the settings, the debug handle, and the start. Everything the
// other files built (the scenes, the bus wiring, the sound) is registered here, once, in order.
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});
const game = OB.game = new E.Game({
  canvas: 'screen', res: [480, 270], expand: true, input: OB.KEYS, id: 'outbloom2006',
  menu: {
    items: OB.env.hub ? [] : [['Dev Mode', () => { game.go('dev', { from: OB.race ? 'race' : 'title' }); }]],
    settings: [
      { key: 'difficulty', label: 'Difficulty', options: ['Easy', 'Normal', 'Hard'], value: 'Normal' },
      { key: 'camera', label: 'Camera', options: ['Chase', 'High', 'Bumper'], value: 'Chase' },
      { key: 'chatter', label: 'Passenger chatter', options: ['Full', 'Less', 'Off'], value: 'Full' },
      { key: 'hudSize', label: 'HUD size', options: ['Large', 'Extra large'], value: 'Large' },
      { key: 'speedUnits', label: 'Speed units', options: ['km/h', 'mph'], value: 'km/h' },
      { key: 'hints', label: 'Hints', value: true },
      { key: 'voices', label: 'Voices', options: ['Off', 'Half', 'Full'], value: 'Full' },
      { key: 'buttons', label: 'Button symbols', options: ['PlayStation', 'Xbox'], value: 'PlayStation' },
      { key: 'transmission', label: 'Transmission', options: ['Automatic', 'Manual'], value: 'Automatic' },
      { key: 'driftInput', label: 'Drift input', options: ['All', 'Brake tap', 'Drift button'], value: 'All' },
      { key: 'assist', label: 'Steering assist', options: ['Off', 'Low', 'High'], value: 'Low' },
    ],
    quit: OB.env.hub ? false : 'title',
  },
});
OB.wireSfx(); OB.wireRace();
OB.loadProfile();
const scenes = Object.assign({}, OB.scenes, {});
// the pause screen's Dev Mode is hidden in a hub session (AI Hub), where the game is shared
const game2 = game;
game.debug = {
  snapshot: () => {
    const r = OB.race;
    return { scene: game.sceneName, mode: r ? r.mode : null, stage: r ? r.stage.def.id : null, route: r ? r.routeIds.join('>') : null,
      z: r ? Math.round(r.car.z) : null, x: r ? +r.car.x.toFixed(3) : null, v: r ? Math.round(r.car.v) : null, gear: r ? r.car.gear : null,
      drift: r ? { on: r.car.drift.on, score: Math.round(r.car.drift.score) } : null, slip: r ? +r.car.slip.toFixed(2) : null,
      clock: r ? +r.clock.toFixed(2) : null, score: r ? Math.round(r.score) : null, bloom: r ? r.bloom.level : null, petals: r ? r.petals : null,
      status: r ? r.status : null, goal: r ? r.goal : null, traffic: r ? r.traffic.list.length : null, attract: OB.attract.active, errors: game.errors.length };
  },
  /** run the bot through a whole stage path with the cheats on, returning the result (for tests and tools) */
  run(route, seed = 1, o = {}) { return OB.runBot(route, seed, o); },
  teleport(stage, pct, x) { if (OB.race) { const r = OB.race; if (r.stage.def.id !== stage) { r.enterStage(OB.World.stage(stage), 0); } r.car.z = r.stage.len * pct / 100; if (x !== undefined) r.car.x = x; } },
};
// the bot's whole-run driver: a race with the brain, stepped at the sim's fixed rate, until it ends (or a limit)
OB.runBot = (route, seed = 1, o = {}) => {
  const forks = o.forks || (route ? [] : ['L', 'L', 'L', 'L', 'L']);
  const r = new OB.Race({ mode: o.mode || 'arcade', car: o.car || 'orchidea', seed, route: route || null, passenger: o.passenger || 'marisol', cheats: o.cheats || {},
    bot: new OB.Brain({ forks, skill: o.skill || 1, drift: o.drift !== false }) });
  const dt = 1 / 120, limit = o.limit || 120 * 900;
  for (let i = 0; i < limit && r.status !== 'over' && r.status !== 'goal'; i++) r.step(dt, null);
  return r.result();
};
const boot = () => game.start({
  scenes: Object.assign({}, scenes, {
    title: scenes.title, menu: scenes.menu, garage: scenes.garage, howto: scenes.howto, about: scenes.about,
    race: scenes.race, ending: scenes.ending, results: scenes.results, dev: scenes.dev, attract: scenes.attract,
  }),
  scene: OB.env.hub ? 'hubcard' : 'title',
});
// an AI Hub round: connect, and the game's card is the first screen; ready() once the game can start, with no key press
if (OB.env.hub) {
  const noHub = () => { OB.env.hub = false; game.go('title', null, { fade: 'wipe' }); };
  boot();
  // ready() only counts once the hub has welcomed this copy, so it is called when connect() resolves
  OB.Hub.connect().then(info => { if (!info) noHub(); else window.AIHub.ready(); }).catch(noHub);
} else boot();
})();
