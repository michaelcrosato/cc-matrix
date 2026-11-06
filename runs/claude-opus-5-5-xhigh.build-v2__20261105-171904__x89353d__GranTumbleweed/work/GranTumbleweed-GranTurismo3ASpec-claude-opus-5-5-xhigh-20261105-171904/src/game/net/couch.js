// Couch Duel: two players, one TV. The page becomes two side-by-side containers and a second engine draws the shared sim.
import { Engine } from '../../pixel-engine.js';
import { RaceScene } from '../scenes/race.js';
export function engineOptionsFor(container) { return { container, camera: { preset: 'fixed', position: [0, 5, -10], target: [0, 1, 0], fov: 58, minZoom: 1, maxZoom: 1 }, settings: { button: false, key: false }, touch: false, seed: 1 }; }
export async function startCouchEngine(app, mainScene, setup) {
  if (typeof document === 'undefined') return null; // headless tools draw one side
  const p1 = document.getElementById('p1'), p2 = document.getElementById('p2');
  if (!p1 || !p2) return null;
  p1.style.width = p2.style.width = '50vw'; p2.style.display = 'block';
  const scene = new RaceScene(app, setup, { role: 'view', sim: mainScene.sim, viewPlayer: 1, compact: true });
  const e2 = await Engine.start(scene, engineOptionsFor(p2));
  e2.audio.persist = false; e2.audio.setMuted(true); e2.input.gamepadButtons = {};
  app.engine2 = e2; app.couchScene = scene;
  // Keep the first engine's handle: __PIXEL_ENGINE__ now holds the last one started.
  if (typeof window !== 'undefined') window.__PIXEL_ENGINE__ = app.engine;
  return e2;
}
export function stopCouchEngine(app) {
  app.actions.couch = false;
  if (!app.engine2) return;
  try { app.engine2.dispose(); } catch { /* it was on its way out */ }
  app.engine2 = null; app.couchScene = null;
  if (typeof document !== 'undefined') { const p1 = document.getElementById('p1'), p2 = document.getElementById('p2'); if (p2) p2.style.display = 'none'; if (p1) p1.style.width = '100vw'; }
}
