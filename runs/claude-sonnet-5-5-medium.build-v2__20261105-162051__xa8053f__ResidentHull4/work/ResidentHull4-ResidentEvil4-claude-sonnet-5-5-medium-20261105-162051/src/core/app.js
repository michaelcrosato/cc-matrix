// The app singleton: engine handle, current run, overlay screens, scene switching. Imports no game modules (registered by main.js).
export const app = {
  engine: null, run: null, screens: [], makeArea: null, makeTitle: null, makeShift: null, session: null, mix: null,
  attract: false, hub: false, shiftSolo: false, devMode: false, lastInputT: 0, idleFrames: 0, touchOnly: false,
  dev: { god: false, noclip: false, ammo: false, oneHit: false, freeze: false, zones: false, nav: false, triggers: false, speed: 1 },
  top() { return this.screens[this.screens.length - 1] || null; },
  push(screen) { this.screens.push(screen); screen.enter?.(this); this.setPaused(); },
  pop() { const s = this.screens.pop(); s?.leave?.(this); this.setPaused(); return s; },
  clearScreens() { while (this.screens.length) this.pop(); },
  setPaused() {
    const e = this.engine; if (!e) return;
    e.timeScale = this.screens.some((s) => !s.live) ? 0 : this.dev.speed;
    try { if (this.screens.some((s) => !s.live) && typeof document !== 'undefined' && document.pointerLockElement) { this.selfRelease = true; document.exitPointerLock(); } } catch { /* optional */ }
  },
  /** Fade out, load a new Game, fade in. */
  async go(game, kind = 'iris') {
    const e = this.engine;
    try { e.hud.clear(); if (!this.noFade) await e.screen.cover(kind); } catch { /* headless */ }
    this.clearScreens();
    await e.loadGame(game);
    e.timeScale = this.dev.speed;
    try { if (!this.noFade) await e.screen.reveal(kind); } catch { /* headless */ }
  },
};
