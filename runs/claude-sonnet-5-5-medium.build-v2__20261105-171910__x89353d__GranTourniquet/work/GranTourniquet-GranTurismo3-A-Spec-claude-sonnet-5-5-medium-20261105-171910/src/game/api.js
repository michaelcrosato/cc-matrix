// window.__GAME__: state, press and direct test hooks (plan section 4).
import { App, saveProfile } from './app.js';
import { go, goMenu, goRace, testSetup, eventRoundSetup } from './scenes/flow.js';
import { currentCar } from './sim/career.js';
export function makeApi(scene) {
  const A = App;
  return {
    App, scene,
    state() { const s = A.engine?.game ?? scene, p = A.profile, r = s.sim ? { track: s.cfg?.track, mode: s.mode, lap: s.focus?.crossings, laps: s.sim.laps, pos: s.focus?.positionNow, time: s.raceTime?.(), speed: Math.hypot(s.focus.c.vx, s.focus.c.vz) * 3.6, state: s.sim.state, rpm: s.focus.c.rpm, gear: s.focus.c.gear } : null;
      return { scene: s.name, screen: s.nav?.top?.type ?? null, focus: A.ui.focus, race: r, ov: s.ov?.kind ?? null, profile: p ? { credits: p.credits, day: p.day, cars: p.cars.map((c) => c.carId), current: currentCar(p)?.carId, licences: Object.fromEntries(Object.entries(p.licences).map(([k, v]) => [k, v.medal])), won: p.wonEvents, ending: p.ending } : null, music: A.engine?.audio.volume.music, device: A.actions.last, hub: A.hubActive }; },
    press(a) { A.actions.inject(a); }, A, go, goMenu, goRace, testSetup, eventRoundSetup,
    save: saveProfile, step(n = 1) { A.engine.step(n); },
  };
}
App.api = makeApi;
