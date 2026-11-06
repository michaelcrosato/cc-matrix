// Tracks which device the player used last (prompts follow it at once) and any activity at all
// (attract mode). DOM listeners and a per-frame gamepad poll; in Node only the Input state is read.
const DEAD = 0.3;

export class Device {
  kind = 'kbm'; // 'kbm' | 'pad'
  padConnected = false;
  activity = 0; // bumps on any input
  touchOnly = false;
  attached = [];
  optionsAt = -1;

  attach() {
    if (typeof window === 'undefined') return;
    const on = (type, fn, opts) => {
      window.addEventListener(type, fn, opts);
      this.attached.push(() => window.removeEventListener(type, fn, opts));
    };
    on('keydown', () => { this.kind = 'kbm'; this.activity++; this.onRealInput(); });
    on('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      if (Math.abs(e.movementX) + Math.abs(e.movementY) < 1) return;
      this.kind = 'kbm'; this.activity++;
    });
    on('pointerdown', (e) => {
      if (e.pointerType === 'touch') { if (!this.touchOnly) this.activity++; return; }
      this.kind = 'kbm'; this.activity++; this.onRealInput();
    });
    on('wheel', () => { this.kind = 'kbm'; this.activity++; }, { passive: true });
  }

  /** The moment a keyboard or a pad shows up, a touch-only device stops being one. */
  onRealInput() { if (this.touchOnly) { this.touchOnly = false; this.onLeaveTouchOnly?.(); } }

  static detectTouchOnly() {
    if (typeof navigator === 'undefined' || typeof matchMedia === 'undefined') return false;
    const fine = matchMedia('(any-pointer: fine)').matches;
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].some((p) => p && p.connected !== false) : false;
    return navigator.maxTouchPoints > 0 && !fine && !pads;
  }

  /** Once a frame. `input` covers scripted keys and the replay; the pad is polled here so glyphs change at once. */
  poll(input) {
    let pads = [];
    if (typeof navigator !== 'undefined' && navigator.getGamepads) {
      try { pads = [...navigator.getGamepads()]; } catch { pads = []; }
    }
    this.padConnected = pads.some((p) => p && p.connected !== false);
    for (const p of pads) {
      if (!p) continue;
      const pressed = p.buttons?.some((b) => b && (b.pressed || (b.value ?? 0) > 0.5));
      const moved = p.axes?.some((a) => Math.abs(a) > DEAD);
      if (pressed || moved) {
        this.kind = 'pad'; this.activity++;
        this.onRealInput();
      }
    }
    if (input) {
      if (input.queuedPresses.length) this.activity++;
      if (input.mouseDelta.x || input.mouseDelta.y || input.wheel) this.activity++;
      if (input.padAxis.x || input.padAxis.y) this.activity++;
    }
  }

  dispose() { for (const off of this.attached) off(); this.attached.length = 0; }
}
