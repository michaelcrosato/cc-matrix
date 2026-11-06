import { FIXED_DT } from '../data/config.js';

export function createLoop(onFixed, onFrame, opts = {}) {
  let acc = 0;
  let running = false;
  let last = 0;
  let handle = 0;
  const raf = opts.raf || globalThis.requestAnimationFrame || ((fn) => setTimeout(() => fn(performance.now()), 16));
  const caf = opts.caf || globalThis.cancelAnimationFrame || ((id) => clearTimeout(id));

  function tick(now) {
    if (!running) return;
    const real = last ? Math.min(0.25, Math.max(0, (now - last) / 1000)) : 0;
    last = now;
    const scale = opts.scale ? opts.scale() : 1;
    acc += real * scale;
    let steps = 0;
    while (acc >= FIXED_DT && steps < 30) {
      onFixed(FIXED_DT);
      acc -= FIXED_DT;
      steps += 1;
    }
    onFrame(real);
    handle = raf(tick);
  }

  return {
    start() {
      if (running) return;
      running = true;
      last = 0;
      handle = raf(tick);
    },
    stop() {
      running = false;
      caf(handle);
    },
    running() { return running; },
  };
}
