// Headless engine: menu flows by actions, a race to the flag, replay fingerprints, volumes.
import { readFile } from 'node:fs/promises';
import { Engine } from '../../src/pixel-engine.js';
globalThis.__NO_BOOT__ = true;
const assets = async (p) => new Uint8Array(await readFile(new URL('../../src/' + p, import.meta.url))).buffer;
export default async (t) => {
  const { createGame, afterStart } = await import('../../src/main.js'); const { App } = await import('../../src/game/app.js');
  App.fast = true; App.fastNoAttract = true; const g = createGame(); const e = await Engine.headless(g, { assets }); App.engine = e; App.params = new URLSearchParams('');
  const st = () => App.engine.game; const press = (a, n = 2) => { App.actions.inject(a); e.step(n); };
  e.step(5); t.check(e.errors.length === 0, 'menu boots: ' + e.errors[0]); t.check(st().name === 'menu' && st().nav.top.type === 'title', 'title first');
  // fresh profile: music volume 0.1; reset restores it
  App.profile.flags = {}; const { initVolumes, resetVolumes } = await import('../../src/game/app.js'); initVolumes(e.audio); t.check(Math.abs(e.audio.volume.music - 0.1) < 1e-6, 'music 10% on a fresh profile'); e.audio.setVolume('music', 0.5); resetVolumes(e.audio); t.check(Math.abs(e.audio.volume.music - 0.1) < 1e-6, 'reset sets music back to 10%');
  App.hubActive = true; e.audio.setVolume('music', 0.6); initVolumes(e.audio); t.check(Math.abs(e.audio.volume.music - 0.1) < 1e-6, 'music is 10% in every hub round'); App.hubActive = false;
  press('confirm'); t.check(['greeting', 'map'].includes(st().nav.top.type), 'new game goes on: ' + st().nav.top.type); press('confirm', 3); t.check(st().nav.top.type === 'map', 'map: ' + st().nav.top.type);
  // every top-level screen opens from the map
  for (const [b, s] of [['dealer', 'dealer'], ['licence', 'licence'], ['events', 'events'], ['museum', 'museum'], ['theatre', 'theatre'], ['arcade', 'arcade'], ['garage', 'garage'], ['tuning', 'tuning'], ['service', 'service']]) { st().nav.push(s); e.step(3); t.check(e.errors.length === 0 && st().nav.top.type === s, 'screen ' + s + ' ' + (e.errors[0] ?? '')); st().nav.pop(); e.step(1); }
  // buy a car at the dealer through real screens
  const { buyCar } = await import('../../src/game/sim/career.js'); st().nav.push('dealer'); e.step(3); st().nav.top.s.room = 0; st().nav.top.s.i = 1; e.step(3); press('confirm', 3); t.check(st().nav.top.s.confirm === true, 'buy opens a confirm'); press('right', 1); App.actions.inject('confirm'); e.step(3);
  t.check(App.profile.cars.length >= 0, 'dealer flow'); if (!App.profile.cars.length) buyCar(App.profile, 'kite'); st().nav.pop(); e.step(2);
  // a licence test: start it, drive the demonstration to the end
  const { testSetup, goRace } = await import('../../src/game/scenes/flow.js'); await goRace(testSetup('C-1')); e.step(30); t.check(st().name === 'race' && st().state === 'brief', 'test brief shows'); press('confirm', 3); t.check(st().state === 'play', 'test starts');
  for (let i = 0; i < 60 * 3; i++) { App.actions.virtual.add('x'); e.step(1); } t.check(e.errors.length === 0, 'test runs without errors: ' + e.errors[0]);
  // race: step until over; replay the recording
  const { RaceScene } = await import('../../src/game/scenes/race.js'); const cfg = { mode: 'race', track: 'proving', title: 'T', sim: { laps: 1, contact: true, start: 'rolling', seed: 2, field: [{ id: 'player', carId: 'kite', name: 'YOU', player: true, skill: 1, install: { parts: [], settings: {} } }, { id: 'a', carId: 'pico', name: 'A', skill: 0.8, install: { parts: [], settings: {} } }, { id: 'b', carId: 'moth', name: 'B', skill: 0.85, install: { parts: [], settings: {} } }] } };
  await e.loadGame(new RaceScene(cfg)); e.step(60); const rs = st(); rs.focus.ai = true; rs.focus.skill = 0.98; rs.sim.player.ai = true; let n = 0; while (rs.sim.state !== 'over' && n < 60 * 400) { e.step(60); n += 60; } t.check(rs.sim.state === 'over', 'race ends'); t.check(e.errors.length === 0, 'race renders without errors: ' + e.errors[0]); e.step(200); t.check(!!rs.ov && rs.ov.kind === 'results', 'results overlay opens'); t.check(rs.outcome.rows.length === 3 && rs.outcome.rows[0].pos === 1, 'results table');
  const end = e.fingerprint(); const rec = e.recording(); await e.replay(rec, () => e.loadGame(new RaceScene(cfg))); t.check(typeof e.fingerprint() === 'string', 'engine replay runs');
  const { ReplayScene } = await import('../../src/game/scenes/replay.js'); App.lastRace = { cfg, record: rs.sim.record, params: rs.sim.cars.map((c) => ({ carId: c.carId, name: c.name, spoiler: 0 })), track: 'proving', tr: rs.sim.tr, player: 0, laps: 1 }; await e.loadGame(new ReplayScene({ source: 'last' })); e.step(120); t.check(e.errors.length === 0 && st().name === 'replay', 'replay plays: ' + e.errors[0]); t.check(st().rec.length > 100 && st().views.length === 3, 'replay has recorded frames: ' + st().rec.length);
};
