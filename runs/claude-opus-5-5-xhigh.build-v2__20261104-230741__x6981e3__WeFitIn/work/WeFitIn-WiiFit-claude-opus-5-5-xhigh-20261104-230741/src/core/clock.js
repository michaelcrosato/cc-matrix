// The Medley's clock. In a session it reads the hub's timeline, so all copies stay in step.
export class MedleyClock {
  local = 0;
  constructor(hub = null) { this.hub = hub; }
  tick(dt) { this.local += dt; }
  /** Seconds since play began; negative in the countdown. */
  now() {
    if (this.hub) return this.hub.time() / 1000;
    return this.local;
  }
}
