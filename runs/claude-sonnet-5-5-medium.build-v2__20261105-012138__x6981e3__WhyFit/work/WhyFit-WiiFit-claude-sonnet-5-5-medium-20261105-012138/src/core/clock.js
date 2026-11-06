// Time source for rhythm and session windows: game time unless a session or audio supplies better.
export class Clock {
  constructor() { this.t = 0; this.session = null; }
  tick(dt) { this.t += dt; }
  now() { return this.session ? this.session() : this.t; }
}
