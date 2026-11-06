/** @file A throwaway residency keeps a private progress snapshot and restores the real stay when closed. */
import type { ScreenApp } from './context';
import type { Progress } from '../scenes/state';
export class Sandbox {
  on = false;
  private snapshot: Progress | null = null;
  set(app: ScreenApp, on: boolean) {
    if (on === this.on) return;
    if (on) this.snapshot = structuredClone(app.save);
    this.on = on;
    if (!on && this.snapshot) {
      app.save = structuredClone(this.snapshot);
      this.snapshot = null;
      const e = app.engine?.inspector;
      if (e) e.seed(e.seed());
      app.run('game.begin', app.save);
    }
  }
}
