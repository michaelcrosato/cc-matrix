// Which device was used last. Prompts follow it. Guarded: runs in Node too.
export class Device {
  last = 'keyboard'; px = null; py = null; moved = 0; anyInput = false;
  update(input) {
    this.anyInput = false;
    const held = input.state?.().held ?? [];
    const queued = input.queuedPresses ?? [];
    const a = input.padAxis ?? { x: 0, y: 0 };
    let dev = null;
    for (const k of [...held, ...queued]) {
      if (k === 'Touch') { this.anyInput = true; continue; }
      if (k.startsWith('Pad')) dev = 'pad';
      else if (k.startsWith('Mouse')) dev ??= 'mouse';
      else dev ??= 'keyboard';
    }
    if (Math.hypot(a.x, a.y) > 0.3) dev = 'pad';
    const p = input.pointer;
    this.moved = 0;
    if (this.px !== null && p && (p.x !== this.px || p.y !== this.py)) {
      this.moved = Math.hypot(p.x - this.px, p.y - this.py);
      if (!p.touch && this.moved > 0.004) dev = 'mouse';
    }
    if (p) { this.px = p.x; this.py = p.y; }
    if (dev) { this.last = dev; this.anyInput = true; }
    if (Math.abs(input.wheel ?? 0) > 0) { this.anyInput = true; this.last = 'mouse'; }
    return this.last;
  }
}
