// CRACKMANIA: the game. createGame({ headless }) -> { game, app }: the engine's game with our scenes, settings, pause
// menus and boot steps. Browser entry: src/entry.js. Tests: tools/node-env.mjs makeGame().
import { App, makeCast } from './app.js';
import { Profile } from './profile.js';
import { EnvView } from './view.js';
import { initPhysics } from './physics.js';
import { TRACKS, ENV_ORDER } from './data.js';
import { SONGS, defineSfx } from './audio.js';
import { CFG, reset as resetCfg } from './config.js';
import { raceScene } from './race.js';
import { frontScene, FRONT_INPUT } from './front.js';
import { editorScene } from './editor.js';
import { garageScene } from './garage.js';
import { replayScene } from './replay.js';
import { DevMode } from './dev.js';
import { Modes } from './modes.js';
import { Attract } from './attract.js';
import { Online } from './online.js';
import { Bot } from './run.js';

const E = globalThis.My3D2dge;
export const TITLE = 'CRACKMANIA', VERSION = '1.0.0';
export const SETTINGS = [
  { key: 'units', label: 'Speed units', group: 'Game', value: 'kmh', options: [['kmh', 'km/h'], ['mph', 'mph']] },
  { key: 'camera', label: 'Default camera', group: 'Game', value: 'far', options: [['far', 'Far chase'], ['close', 'Close chase'], ['hood', 'Hood']] },
  { key: 'myGhost', label: 'My ghost', group: 'Game', value: true, help: 'Race the ghost of your best run.' },
  { key: 'cocoGhost', label: "Coco's ghost", group: 'Game', value: false, help: 'Race the author time as a ghost.' },
  { key: 'loopAssist', label: 'Loop assist', group: 'Game', value: true, help: 'Keeps you in the lane through loops.' },
  { key: 'steerSens', label: 'Steering sensitivity', group: 'Game', type: 'slider', min: .5, max: 1.5, step: .05, value: 1 },
  { key: 'hints', label: 'Hints', group: 'Game', value: true, help: "Coco's first-time tips." }
];

export async function createGame(o = {}) {
  const headless = !!o.headless;
  const app = new App(null, { headless });
  const pauseItems = () => app.pauseItems ? app.pauseItems() : [];
  const game = new E.Game(Object.assign({ res: 'ps1', expand: true, bg: null, input: FRONT_INPUT, menu: { items: pauseItems, settings: [...E.World3D.SETTINGS, ...SETTINGS], quit: false } }, headless ? { headless: true } : { canvas: 'screen' }));
  app.game = game; game.app = app;
  app.profile = new Profile(!headless || o.store).load();
  app.settingCam = () => game.settings.camera || 'far';
  // the music: one song per place, layers that join after GO
  app.music = (name, o2 = {}) => { const song = SONGS[name] || SONGS.title; if (app.song === name && !o2.restart) return; app.song = name; game.audio.music(song, { fade: .6 }); };
  app.musicLayer = on => { for (const t of ['lead', 'drums']) try { game.audio.layer(t, on ? 1 : 0, .8); } catch (e) { /* this song has none */ } };
  // keep CFG in step with the settings
  const applySettings = () => { CFG.loopAssist = game.settings.loopAssist === false ? 0 : (CFG._la ?? 1); CFG.steerSens = game.settings.steerSens || 1; };
  app.applySettings = applySettings;
  // typed characters (letter wheels, share codes)
  if (!headless && typeof window !== 'undefined') {
    window.addEventListener('keydown', e => { if (e.key.length === 1) app.typed.push(e.key); else if (e.key === 'Backspace') app.typed.push('\b'); if (e.key === 'v' && (e.ctrlKey || e.metaKey) && navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(t => { app.pasted = t; }).catch(() => {}); });
    window.addEventListener('paste', e => { const t = e.clipboardData && e.clipboardData.getData('text'); if (t) app.pasted = t; });
    window.addEventListener('pointermove', e => { app.mouseClient = { x: e.clientX, y: e.clientY, moved: true }; });
    window.addEventListener('wheel', e => { app.wheel = (app.wheel || 0) + Math.sign(e.deltaY); }, { passive: true });
  }
  app.Bot = Bot;
  app.modes = new Modes(app); app.dev = new DevMode(app); app.attract = new Attract(app); app.online = new Online(app);
  const scenes = { front: frontScene(app), race: raceScene(app), editor: editorScene(app), garage: garageScene(app), replay: replayScene(app) };
  app.scenes = scenes;
  // per-scene pause menus (the engine's pause screen with our entries)
  app.pauseItems = () => {
    const sc = game.sceneName, hub = app.online.active, R = app.race, items = [];
    const act = (label, fn) => items.push([label, () => { game.resume(); fn(); }]);
    if (sc === 'race' && R) {
      if (!R.spec.noRestart) act('Restart', () => scenes.race.restart());
      act('Respawn', () => R.players[0].run.respawn());
      act('Camera', () => { const P = R.players[0]; const M = ['far', 'close', 'hood']; P.cam.mode = M[(M.indexOf(P.cam.mode) + 1) % 3]; });
      act('Ghosts on/off', () => { R.showGhosts = !R.showGhosts; });
      act('Dev Mode', () => app.dev.open('race'));
      if (!hub) act(R.spec.quitLabel || 'Quit to menu', () => app.modes.quitRace());
    } else if (sc === 'editor') { for (const [l, f] of app.editorMenu()) act(l, f); act('Dev Mode', () => app.dev.open('editor')); }
    else if (sc === 'replay') { act('Restart replay', () => app.replayCtl.restart()); act('Save replay', () => app.replayCtl.save()); act('Exit replay', () => app.replayCtl.exit()); }
    else if (sc === 'garage') act('Leave garage', () => app.modes.toMenu('main'));
    else if (sc === 'front') { act('Dev Mode', () => app.dev.open('front')); }
    return items;
  };
  const steps = [
    ['Starting the engines', async () => { await E.World3D.init(game); await initPhysics(); }],
    ['Reading your profile', () => { makeCast(); if (!headless) defineSfx(game.audio); applySettings(); }],
    // in an AI Hub session only the round's environment is built (the round's track is known once connected)
    ['Pouring asphalt', async () => { const hub = app.online.active && await app.online.connect(); app.envs = hub ? [app.online.env] : ENV_ORDER; if (!headless) for (const env of app.envs) app.views[env] = new EnvView(game, env); }],
    ['Polishing medals', () => { if (!app.online.active) for (const t of TRACKS) app.author(t.id); }],
    ['Building the garage', () => { if (!app.online.active) scenes.garage.build && scenes.garage.build(); }],
    ['Building the shaders', () => { if (!headless) { for (const env of app.envs) { const id = app.online.active ? app.online.trackId : env === 'dustbowl' ? 'D3' : env === 'hedgerow' ? 'R1' : 'S1', P = app.prepare(app.track(id), id); app.show(P); app.views[env].world.prepare(); } } }],
    ['Teaching cacti to wave', () => { game.settings.reduceMotion = game.settings.reduceMotion || false; }]
  ];
  const debug = {
    snapshot() {
      const R = app.race, P = R && R.players[0], c = P && P.run.car;
      return { scene: game.sceneName, page: app.front ? app.front.page : null, mode: R ? R.spec.mode : null, env: R ? R.prep.track.env : null, track: R ? R.prep.track.id || R.prep.track.name : null,
        run: P ? { phase: P.run.phase, steps: P.run.steps, cps: P.run.cpCount, cpTotal: R.course.cps.length, respawns: P.run.respawns, finished: P.run.finished, scenePhase: R.phase } : null,
        car: c ? { x: c.p[0], y: c.p[1], z: c.p[2], kmh: Math.hypot(...c.v) * 3.6, grounded: c.grounded, surface: c.surface } : null,
        profile: { coppers: app.profile.coppers, golds: app.profile.totalGolds() }, ui: { focus: app.front && app.front.focusId(), device: game.input.lastDevice },
        attract: app.attract.on, touchGate: !!app.touchGate, hub: { active: app.online.active, phase: app.online.phase }, dev: !!app.devOpen, errors: game.errors.length };
    }
  };
  game.debug = debug; app.debugApi = debug;
  game.start({ scenes, scene: 'front', boot: { title: TITLE, version: VERSION, steps } });
  await game.booted;
  if (o.afterBoot) await o.afterBoot(app);
  if (!headless) app.online.maybeStart();
  return { game, app };
}
