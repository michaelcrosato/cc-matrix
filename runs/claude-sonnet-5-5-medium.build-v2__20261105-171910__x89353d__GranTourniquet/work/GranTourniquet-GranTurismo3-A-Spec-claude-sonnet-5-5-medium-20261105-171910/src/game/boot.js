// URL flags for development and tests (plan section 4): ?scene=race&track=harbour&car=works&hour=21&rain=1&laps=2&ai=7&pace=0.92
import { defaultInstall } from './sim/tuning.js';
import { playerEntry } from './sim/fields.js';
import { testSetup } from './scenes/flow.js';
import { RaceScene } from './scenes/race.js';
import { MenuScene } from './scenes/menu.js';
import { ReplayScene } from './scenes/replay.js';
export function raceFromParams(App) {
  const q = App.params, track = q.get('track') ?? 'kestrel', carId = q.get('car') ?? 'kite', ai = +(q.get('ai') ?? 5), pace = +(q.get('pace') ?? 0.9);
  const car = { carId, install: defaultInstall() }; const pool = ['pico', 'kite', 'moth', 'ginga', 'ryu', 'brandt32'];
  const field = [playerEntry(App.profile, car), ...Array.from({ length: ai }, (_, k) => ({ id: 'ai' + k, carId: pool[k % pool.length], name: 'CAR' + (k + 1), skill: pace - 0.03 + 0.03 * k / Math.max(1, ai - 1), install: defaultInstall(), colour: ['blue', 'green', 'orange', 'sand', 'cyan', 'plum'][k % 6] }))];
  return { mode: 'race', track, hour: q.get('hour') ? +q.get('hour') : undefined, rain: q.get('rain') === '1', title: 'TEST RACE', sim: { laps: +(q.get('laps') ?? 2), field, contact: true, start: q.get('start') ?? 'rolling', rain: q.get('rain') === '1', seed: 7 }, returnTo: { screen: 'map', args: {} } };
}
export function urlGame(App) {
  const q = App.params, sc = q.get('scene'); if (q.get('dev') === '1') App.dev.on = true;
  if (sc === 'race') return new RaceScene(raceFromParams(App)); if (sc === 'licence') return new RaceScene(testSetup(q.get('test') ?? 'C-1'));
  if (sc === 'menu') return new MenuScene({ screen: q.get('screen') ?? 'title' }); if (sc === 'replay') return new ReplayScene({ source: 'last' });
  if (q.get('attract') === '1') { App.autoAttract = true; } return null;
}
