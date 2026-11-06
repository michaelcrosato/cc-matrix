// Couch Duel: two players, one TV, split screen. One RaceSim is shared: P1's scene steps it, P2's only draws it.
import { Engine } from '../../pixel-engine.js';
import { RaceScene } from '../scenes/race.js';
export class Couch {
  constructor(app) { this.app = app; this.engine2 = null; }
  async start(setup) {
    const app = this.app, p1 = document.getElementById('p1'), p2 = document.getElementById('p2');
    app.couch = true; p1.style.width = p2.style.width = '50vw'; p2.style.display = 'block';
    await app.goScene(() => new RaceScene(app, setup));
    const scene = app.scene;
    this.engine2 = await Engine.start(new RaceScene(app, setup, { viewer: true, sim: scene.sim, seat: 1 }), { container: p2, camera: { preset: 'fixed', position: [0, 5, -10], target: [0, 1, 0], fov: 58, minZoom: 1, maxZoom: 1 }, settings: { button: false, key: false }, touch: false, seed: 9, debugUI: false });
    this.engine2.audio.persist = false; this.engine2.audio.setMuted(true); this.engine2.input.gamepadButtons = {}; this.engine2.input.gamepadLookSpeed = 0;
    app.engine.input.gamepadButtons = {};
    scene.hold = 0;
  }
  end() { if (!this.engine2) { this.app.couch = false; return; } const app = this.app, e2 = this.engine2; this.engine2 = null; app.couch = false; try { e2.dispose(); } catch (err) { console.warn(err); } const p1 = document.getElementById('p1'), p2 = document.getElementById('p2'); p2.style.display = 'none'; p2.style.width = ''; p1.style.width = '100vw'; }
}
