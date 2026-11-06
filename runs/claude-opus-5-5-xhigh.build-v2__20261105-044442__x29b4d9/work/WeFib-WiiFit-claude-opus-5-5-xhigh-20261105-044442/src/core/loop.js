import { FIXED_DT } from '../data/config.js';
// Fixed 1/120 s sim. A frame keeps real time down to 4 fps.
export class Loop {
  constructor(game) { this.game = game; this.acc = 0; this.timeScale = 1; this.last = 0; this.frames = 0; this.fps = 0; this._fpsT = 0; this._fpsN = 0; this.running = false; }
  start() {
    this.running = true;
    this.last = performance.now();
    const tick = async () => {
      if (!this.running) return;
      const now = performance.now();
      const real = Math.max(0, (now - this.last) / 1000);
      this.last = now;
      this.step(real);
      try { await this.game.render(); } catch (e) { this.game.noteError(e); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  stop() { this.running = false; }
  step(real) {
    const g = this.game;
    this.acc += Math.min(real, 0.25) * this.timeScale;
    let n = 0;
    while (this.acc >= FIXED_DT && n < 30) { g.fixed(FIXED_DT); this.acc -= FIXED_DT; n++; }
    if (n === 30 && this.timeScale <= 1) this.acc = Math.min(this.acc, FIXED_DT);
    g.frame(real * this.timeScale);
    this.frames++;
    this._fpsT += real; this._fpsN++;
    if (this._fpsT >= 1) { this.fps = this._fpsN / this._fpsT; this._fpsT = 0; this._fpsN = 0; }
  }
  /** Tests: run sim time now, with no rendering and no waiting. */
  advance(seconds) {
    const g = this.game;
    const n = Math.round(seconds / FIXED_DT);
    for (let i = 0; i < n; i++) {
      g.fixed(FIXED_DT);
      if (i % 4 === 3) g.frame(FIXED_DT * 4);
    }
    g.frame(FIXED_DT);
  }
}
