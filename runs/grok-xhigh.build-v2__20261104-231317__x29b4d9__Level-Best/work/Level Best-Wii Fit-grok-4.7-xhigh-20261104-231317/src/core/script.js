/** Sim-time sequences. yield a number to wait that many seconds. */

export function createScript() {
  let gen = null;
  let wait = 0;
  return {
    start(generator) {
      gen = generator;
      wait = 0;
    },
    active() { return !!gen; },
    clear() { gen = null; wait = 0; },
    tick(dt) {
      if (!gen) return false;
      wait -= dt;
      let guard = 0;
      while (gen && wait <= 0 && guard < 8) {
        const step = gen.next();
        guard += 1;
        if (step.done) {
          gen = null;
          return false;
        }
        wait += Number(step.value) || 0;
      }
      return !!gen;
    },
  };
}
