// Boots the game: a hub session if the hub opened the page, otherwise the game on its own.
// Drive with a pad (stick, R2, L2), or WASD and arrows. The in-game Handbook lists every control.
import { Engine, withUrlOptions } from './pixel-engine.js';
import { App } from './game/app.js';
import { installFlows } from './game/flows.js';
import { MenuScene } from './game/scenes/menu.js';
import { RaceScene } from './game/scenes/race.js';
import { ReplayScene } from './game/scenes/replay.js';
import { Attract } from './game/attract/director.js';
import { MapScreen } from './game/ui/screens/map.js';
import { TITLE } from './game/data/meta.js';
import { quickSetup } from './game/sim/setups.js';
import { RaceSim } from './game/sim/race.js';
import { startSession } from './game/net/hub.js';
import { DevPanel, drawOverlays } from './game/dev/devmode.js';
import { aiDrive } from './game/sim/sim.js';
const param = (k) => (typeof location !== 'undefined' ? new URLSearchParams(location.search).get(k) : null);
export const engineOptions = (container, seed = 1) => ({ container, camera: { preset: 'fixed', position: [0, 5, -10], target: [0, 1, 0], fov: 58, minZoom: 1, maxZoom: 1 }, settings: { button: false }, touch: false, seed });
export function makeApp(o = {}) {
  const app = new App(o); app.Screens = { MapScreen }; app.aiDriveFn = aiDrive; installFlows(app); app.attract = new Attract(app);
  app.jumpMenu = (id) => app.toMenu((ui) => { ui.push(new MapScreen(app)); if (id !== 'map') ui.top.open(id, ui); });
  app.restartWith = (scene, setup) => { app.ui.clear(); const run = scene.run, opts = { run, test: scene.test, demo: scene.opts.demo, ghostData: scene.opts.ghostData }; return app.go(() => new RaceScene(app, { ...setup, seed: (setup.seed ?? 1) + 1 }, opts)); };
  app.drawOverlays = (ui, scene) => drawOverlays(ui, app, scene);
  return app;
}
/** A fresh game: `node src/check.mjs --headless src/main.js` plays one in Node. */
export function createGame() { return new MenuScene(makeApp({ headless: true })); }
function touchOnly() { try { return !matchMedia('(any-pointer: fine)').matches && matchMedia('(pointer: coarse)').matches && !(navigator.getGamepads && [...navigator.getGamepads()].some(Boolean)); } catch { return false; } }
function failMessage(msg) { const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#f4f4f4;background:#1a1c2c;font:bold 22px monospace;text-align:center;padding:40px'; d.textContent = `${TITLE} needs WebGPU: a recent Chrome or Edge, Safari 26, or Firefox 141 on Windows. (${msg})`; document.body.appendChild(d); }
async function boot() {
  const container = document.getElementById('p1') ?? document.getElementById('app'), hub = window.AIHub;
  // In a session the client answers first. connect() comes before anything else.
  if (hub && hub.active) {
    const info = await hub.connect({ mode: 'ghost', seats: [1, 4], card: true });
    if (info) {
      const app = makeApp({ session: true }); window.__APP__ = app;
      if (touchOnly()) { app.touchGate = true; window.addEventListener('keydown', () => { app.touchGate = false; }); }
      try { await startSession(app, info, container); } catch (e) { hub.fail(String(e?.message ?? e)); failMessage(String(e?.message ?? e)); }
      return;
    }
  }
  const app = makeApp(); window.__APP__ = app;
  const seed = +(param('seed') ?? 1), scene = param('scene');
  if (touchOnly()) { app.touchGate = true; const lift = () => { app.touchGate = false; removeEventListener('keydown', lift); }; addEventListener('keydown', lift); addEventListener('gamepadconnected', lift); }
  let game;
  if (scene === 'race') { const setup = quickSetup({ track: param('track') ?? 'kestrel', carId: param('car') ?? 'ginga', laps: +(param('laps') ?? 2), field: +(param('ai') ?? 5) + 1, hour: param('hour') ? +param('hour') : undefined, rain: param('rain') === '1', assists: app.options.assists, pace: param('pace') ? +param('pace') : null, seed }); app.runAgain = () => app.startQuick({ track: setup.track, carId: param('car') ?? 'ginga', laps: setup.laps, field: setup.cars.length }); game = new RaceScene(app, setup, { run: { type: 'quick' } }); }
  else game = new MenuScene(app, param('scene') === 'map' ? { start: (ui) => ui.push(new MapScreen(app)) } : {});
  let engine;
  try { engine = await Engine.start(game, withUrlOptions(engineOptions(container, seed))); }
  catch (e) { failMessage(String(e?.message ?? e)); return; }
  app.bind(engine);
  if (scene === 'licence') app.startTest(param('test') ?? 'C-1');
  if (scene === 'replay') { const s = new RaceSim({ ...quickSetup({ track: param('track') ?? 'kestrel', carId: param('car') ?? 'ginga', laps: 1, field: 5, assists: app.options.assists, seed }) }); s.cars.at(-1).player = null; s.players = []; for (let i = 0; i < 60 * 45; i++) s.step([]); app.lastRace = s.rec; app.go(() => new ReplayScene(app, s.rec, { after: () => app.toTitle() })); }
  if (param('attract') === '1') app.attract.start();
  if (param('dev') === '1') app.ui.push(new DevPanel(app, app.scene?.sim ? app.scene : null));
}
if (typeof document !== 'undefined') boot();
