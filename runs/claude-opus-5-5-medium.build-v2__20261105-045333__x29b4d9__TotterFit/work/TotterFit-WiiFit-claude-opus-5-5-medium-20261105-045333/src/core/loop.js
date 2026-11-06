// Fixed 1/120 s simulation. Real time is capped at 0.25 s a frame, which keeps the
// game on real time down to 4 fps.
export const FIXED = 1 / 120;
export class Loop {
  constructor(game) { this.game = game; this.acc = 0; this.timeScale = 1; this.last = 0; this.running = false; this.singleStep = false; this.paused = false; }
  start() { this.running = true; this.last = performance.now(); const f = () => { if (!this.running) return; requestAnimationFrame(f); const n = performance.now(); this.frame((n - this.last) / 1000); this.last = n; }; requestAnimationFrame(f); }
  frame(real) {
    const r = Math.min(real, .25);
    if (!this.paused) this.acc += r * this.timeScale;
    else if (this.singleStep) { this.acc += FIXED; this.singleStep = false; }
    let n = 0;
    while (this.acc >= FIXED && n < 30 * Math.max(1, Math.ceil(this.timeScale))) { this.game.fixed(FIXED); this.acc -= FIXED; n++; }
    if (this.acc > FIXED * 4) this.acc = 0;
    this.game.frame(r);
    this.game.draw();
  }
  /** Tests: run sim time without rendering or waiting. */
  advance(sec) { const n = Math.round(sec / FIXED); for (let i = 0; i < n; i++) { this.game.fixed(FIXED); if (i % 2 === 1) this.game.frame(FIXED * 2); } }
}
