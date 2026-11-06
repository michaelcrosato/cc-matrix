// Scripted scenes as generators: `yield` waits a frame, `yield 1.5` waits seconds, `yield* sub()` nests.
export class Scripts {
  constructor(g) { this.g = g; this.list = []; }
  /** Run a scene. hold: true freezes the player and world time until it ends. */
  run(gen, { hold = true, name = 'script' } = {}) {
    const s = { it: gen, wait: 0, hold, name, done: false };
    this.list.push(s);
    this.step(s, 0);
    return s;
  }
  get holding() { return this.list.some((s) => s.hold && !s.done && !s.free); }
  /** A scene that hands the player control for a while (a minigame in the open). */
  setFree(name, free) { for (const s of this.list) if (s.name === name) s.free = free; }
  has(name) { return this.list.some((s) => s.name === name && !s.done); }
  step(s, dt) {
    if (s.wait > 0) { s.wait -= dt; if (s.wait > 0) return; }
    const r = s.it.next();
    if (r.done) { s.done = true; return; }
    if (typeof r.value === 'number') s.wait = r.value;
  }
  update(dt) {
    for (const s of this.list.slice()) if (!s.done) this.step(s, dt);
    this.list = this.list.filter((s) => !s.done);
  }
  cancelAll() { this.list = []; }
}
/** Wait until a condition holds. */
export function* until(fn) { while (!fn()) yield; }
