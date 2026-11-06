// Boot. Exports createGame() so check.mjs --headless and the tests can run the game in Node.
import { Engine, withUrlOptions } from './pixel-engine.js';
import { App, parseUrl } from './game/app.js';
import { MenuScene } from './game/scenes/menu.js';
import { RaceScene } from './game/scenes/race.js';
import { ReplayScene } from './game/scenes/replay.js';
import { startHub } from './game/net/hub.js';
import { quickRaceSetup, licenceSetup } from './game/sim/setups.js';
import { newProfile, buyCar } from './game/sim/career.js';
import { RaceSim } from './game/sim/race.js';
import { TITLE } from './game/data/meta.js';
export function createGame() { return new MenuScene(new App(), { screen: 'title' }); }
function firstScene(app, u) {
  if (u.scene === 'race') { const s = quickRaceSetup({ track: u.track ?? 'kestrel', carId: u.car ?? 'ginga', field: Number(u.ai ?? 5) + 1, pace: Number(u.pace ?? 0.92), laps: Number(u.laps ?? 2), hour: u.hour != null ? Number(u.hour) : undefined, rain: u.rain === '1' }); return new RaceScene(app, s); }
  if (u.scene === 'licence') return new RaceScene(app, licenceSetup(u.test ?? 'C-1'));
  if (u.scene === 'replay') { const s = quickRaceSetup({ track: u.track ?? 'kestrel', carId: u.car ?? 'ginga', field: 4, pace: 0.92, laps: 1 }); s.cars.forEach((c) => { c.ai = true; c.seat = c.seat ?? -1; }); const sim = new RaceSim({ ...s, tune: app.dev.tune }); for (let i = 0; i < 60 * 40; i++) sim.step([]); return new ReplayScene(app, sim.replayData(), { screen: 'title' }); }
  return new MenuScene(app, app.profile ? { screen: 'title' } : { screen: 'title' });
}
if (typeof document !== 'undefined') {
  document.title = TITLE;
  const container = document.getElementById('p1');
  const app = new App(); app.url = parseUrl(); window.__APP__ = app;
  const fail = (e) => { const msg = 'THIS GAME NEEDS WEBGPU: A RECENT CHROME OR EDGE, SAFARI 26, OR FIREFOX 141 ON WINDOWS.'; const d = document.createElement('div'); d.textContent = msg; d.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;background:#1a1c2c;font:20px monospace;padding:40px;text-align:center'; document.body.append(d); console.warn(e); };
  const hub = window.AIHub;
  try {
    let started = null;
    if (hub && hub.active) started = await startHub(app, hub, container);
    if (!started) {
      const opts = withUrlOptions(app.engineOptions(container));
      if (app.url.scene) { app.profile ??= newProfile(); if (!app.profile.cars.length) buyCar(app.profile, 'ginga'); app.instant = false; }
      if (app.url.dev) app.devOpen = true;
      const e = await Engine.start(firstScene(app, app.url), opts); app.engine = e; window.__ENGINE__ = e;
    }
  } catch (e) { fail(e); if (hub?.active) hub.fail('This game needs WebGPU.'); }
}
