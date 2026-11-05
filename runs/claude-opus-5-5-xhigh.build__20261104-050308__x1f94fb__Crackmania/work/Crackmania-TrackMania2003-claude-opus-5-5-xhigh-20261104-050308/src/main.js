// CRACKMANIA main: the game (the 2D engine's E.Game with the 3D engine's worlds under it), its settings, scenes and
// boot steps, deep links (#race/D3 ...), the AI Hub session start, and game.debug for the tests
import { ctx, E, U } from './ctx.js';
import { MENU_INPUT } from './input.js';
import { Worlds } from './worlds.js';
import { ENV_IDS, ENVS } from './env/envs.js';
import { raceScene } from './scenes/race.js';
import { scenes as frontScenes, deepLink } from './scenes/front.js';
import { Profile } from './save/profile.js';
import { Sound } from './audio/sound.js';
import { Music } from './audio/music.js';
import { Dev } from './ui/dev.js';
import { Attract } from './attract/attract.js';
import { Talk } from './story/story.js';
import { Online, onlineScene, active as hubActive } from './modes/online.js';
import { snapshot } from './debug.js';
import { TRACKS } from './data/tracks.js';
import { compile } from './track/track.js';
import { bakeAll } from './race/medals.js';
import { makeGarage } from './scenes/garage.js';
import { makeApi } from './api.js';
import { VERSION } from './version.js';
export { VERSION };

export async function createGame(o = {}) {
  const headless = !!o.headless || typeof document === 'undefined', hub = !headless && hubActive();
  ctx.headless = headless; ctx.E = E; ctx.hub = hub;
  const settings = [
    ...E.World3D.SETTINGS,
    { key: 'units', label: 'Speed units', group: 'Game', value: 'kmh', options: [['kmh', 'km/h'], ['mph', 'mph']] },
    { key: 'defaultCam', label: 'Default camera', group: 'Game', value: 'far', options: [['far', 'Far chase'], ['close', 'Close chase'], ['hood', 'Hood']] },
    { key: 'myGhost', label: 'My ghost', group: 'Game', value: true, help: 'Race against your best run' },
    { key: 'cocoGhost', label: "Coco's ghost", group: 'Game', value: false, help: 'Race against the author time' },
    { key: 'loopAssist', label: 'Loop assist', group: 'Game', value: true, help: 'Keeps you in the lane round the loops', apply: (g, v) => { import('./config.js').then(m => { m.CFG.loopAssist = v ? (m.CFG.loopAssist || 1) : 0; }); } },
    { key: 'steerSens', label: 'Steering sensitivity', group: 'Game', value: 1, min: .5, max: 1.5, step: .05 },
    { key: 'hints', label: 'Hints', group: 'Game', value: true, help: "Coco's first-time tips" }
  ];
  const game = new E.Game({ canvas: headless ? undefined : 'screen', res: 'ps1', expand: true, bg: null, input: MENU_INPUT, headless, id: 'crackmania',
    menu: { settings, items: () => pauseItems(), quit: false, controls: { gas: 'Gas', brake: 'Brake / reverse', respawn: 'Respawn', restart: 'Restart', camera: 'Camera', ghost: 'Ghosts', horn: 'Horn', cam1: false, cam2: false, cam3: false, tabL: false, tabR: false, secondary: false, tertiary: false, trigL: false, trigR: false, more: false, retry: false, replay: false } } });
  ctx.game = game;
  ctx.worlds = new Worlds(game);
  ctx.profile = new Profile(game, { temp: hub });
  ctx.sound = new Sound(game); ctx.music = new Music(game);
  ctx.dev = new Dev(game); ctx.attract = new Attract(game); ctx.talk = new Talk(game); ctx.online = new Online(game);
  game.debug = { snapshot, api: null };
  const scenes = Object.assign({ race: raceScene, online: onlineScene }, frontScenes);
  const needEnv = env => !ctx.online.info || (ctx.tracks0 && ENVS[ctx.tracks0[ctx.online.trackId].env].id === env);
  const steps = [
    ['Starting the engines', async () => { try { await E.World3D.init(game); } catch (e) { if (hub) AIHub.fail('3D graphics are not available'); throw e; } if (hub && !E.World3D.renderer) AIHub.fail('3D graphics are not available'); }],
    ['Reading your profile', () => ctx.profile.load()],
    ['Joining the session', async () => { if (hub) { const info = await ctx.online.connect(); if (!info) ctx.hub = false; } }],
    ['Compiling tracks', () => { ctx.tracks = {}; for (const d of TRACKS) ctx.tracks[d.id] = compile(d); ctx.tracks0 = ctx.tracks; bakeAll(); }],
    ...ENV_IDS.map(id => ['Pouring asphalt: ' + ENVS[id].name, () => { if (needEnv(id)) ctx.worlds.make(id); }]),
    ['Building the garage', () => { if (!ctx.online.info) makeGarage(game); }],
    ['Teaching cacti to wave', () => {}],
    ['Building the shaders', () => { ctx.worlds.prepare(); }]
  ];
  game.start({ scenes, scene: hub ? 'online' : 'title', boot: { title: 'CRACKMANIA', version: VERSION, steps, messages: ['Polishing medals', 'Counting coppers', 'Warming up the ghosts', 'Inflating the loops', 'Hiding the cabbages'] } });
  if (game.booted && game.booted.then) await game.booted;
  ctx.api = makeApi(); game.debug.api = ctx.api;
  if (!headless) { window.__crack = { game, api: ctx.api, snapshot, ctx }; if (!ctx.online.info) deepLink(); }
  return { game, api: ctx.api };
}
function pauseItems() {
  const s = ctx.game.scene, items = [];
  if (s && s.pauseItems) items.push(...s.pauseItems());
  items.push(['Dev Mode', () => { ctx.game.resume(); ctx.dev.show(); }]);
  if (!ctx.online.info && s && s.quitTo) items.push(['Quit to menu', () => { ctx.game.resume(); s.quitTo(); }]);
  return items;
}
export { deepLink };
