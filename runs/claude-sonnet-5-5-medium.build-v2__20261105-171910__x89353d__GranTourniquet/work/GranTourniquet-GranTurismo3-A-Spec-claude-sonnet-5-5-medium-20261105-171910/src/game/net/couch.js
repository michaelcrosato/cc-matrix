// Couch Duel: two engines side by side, one shared RaceSim, a compact HUD each. Plan section 14 (On its own). Pads are read raw: P1 pad 0, P2 pad 1.
import { Engine, withUrlOptions } from '../../pixel-engine.js';
import { App } from '../app.js';
import { RaceScene } from '../scenes/race.js';
import { goMenu } from '../scenes/flow.js';
import { P1_KEYS, P2_KEYS, readPads } from '../input/actions.js';
import { Actions } from '../input/actions.js';
class DuelScene extends RaceScene { // P2's scene only draws the shared sim
  constructor(cfg, sim, owner) { super(cfg); this.sharedSim = sim; this.owner = owner; this.second = true; }
}
App.startDuel = async (o) => {
  const e1 = App.engine, p1 = document.getElementById('p1'), p2 = document.getElementById('p2'); const pads = readPads().length;
  const cfg1 = { mode: 'duel', track: o.track, hour: o.hour, rain: o.rain, title: 'COUCH DUEL', compact: true, padIndex: pads > 0 ? 0 : null, keys: pads > 0 ? undefined : P1_KEYS, sim: { laps: o.laps, field: o.field, contact: o.contact, start: 'standing', rain: o.rain, wearMul: 0.5, seed: 11 }, returnTo: o.returnTo, music: true, duel: true };
  p1.style.width = '50vw'; p2.style.width = '50vw'; p2.style.display = 'block';
  await App.go?.(null); const first = new App.scenes.race(cfg1); await e1.loadGame(first);
  // the second engine draws the same sim from P2's side; its own AudioManager is muted and does not persist
  const cfg2 = { ...cfg1, compact: true, padIndex: pads > 1 ? 1 : pads === 1 ? null : null, keys: pads > 0 ? P2_KEYS : P2_KEYS, music: false, noEngine: true, noTyre: true, second: true };
  const g2 = new App.scenes.race(cfg2); g2.secondOf = first; g2.shareFrom = () => first.sim; let e2;
  try { e2 = await Engine.start(g2, withUrlOptions({ container: p2, camera: { preset: 'fixed', position: [0, 5, -10], target: [0, 1, 0], fov: 58, minZoom: 1, maxZoom: 1 }, settings: { button: false, key: false }, touch: false, background: 0x0b0c1a })); } catch (err) { p1.style.width = '100vw'; p2.style.display = 'none'; throw err; }
  e2.audio.persist = false; e2.audio.setMuted(true); first.duelEngine2 = e2; App.couch = { e2, first, g2 }; first.onExitDuel = () => App.endDuel();
};
App.endDuel = () => { const c = App.couch; if (!c) return; try { c.e2.dispose(); } catch {} const p1 = document.getElementById('p1'), p2 = document.getElementById('p2'); p2.style.display = 'none'; p1.style.width = '100vw'; p2.innerHTML = ''; App.couch = null; };
