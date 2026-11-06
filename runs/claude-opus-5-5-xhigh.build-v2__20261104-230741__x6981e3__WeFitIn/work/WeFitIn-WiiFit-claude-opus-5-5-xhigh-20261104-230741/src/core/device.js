// Which device was used last, so prompts can follow it.
export class Device {
  last = 'keyboard';      // 'pad' | 'keyboard' | 'mouse'
  lastDesk = 'keyboard';  // same, but ignoring pads (Family Hour's K+M mat)
  glyphs = 'ps';          // 'ps' | 'xbox', from Settings
  px = null; py = null;
  moved = 0;              // art pixels the pointer moved this frame
  anyInput = false;       // something happened this frame (attract, idle timers)
  domInput = false;       // a DOM listener saw something since last frame

  update(ctx) {
    const { input } = ctx;
    this.anyInput = false;
    const s = input.state();
    const held = s.held ?? s.keys ?? [];
    let padUsed = false, keyUsed = false, mouseUsed = false;
    const scan = (code) => {
      if (code.startsWith('Pad')) padUsed = true;
      else if (code.startsWith('Mouse') || code === 'Touch') mouseUsed = true;
      else keyUsed = true;
    };
    for (const code of held) scan(code);
    for (const code of input.queuedPresses) scan(code);
    if (Math.hypot(input.padAxis.x, input.padAxis.y) > 0.3) padUsed = true;
    const p = input.pointer;
    this.moved = 0;
    if (this.px !== null) {
      const dx = (p.x - this.px) / 2 * ctx.hud.width, dy = (p.y - this.py) / 2 * ctx.hud.height;
      this.moved = Math.hypot(dx, dy);
      if (this.moved > 0.25) mouseUsed = true;
    }
    this.px = p.x; this.py = p.y;
    if (input.wheel) mouseUsed = true;
    if (padUsed) this.last = 'pad';
    if (keyUsed) { this.last = 'keyboard'; this.lastDesk = 'keyboard'; }
    if (mouseUsed) { this.last = 'mouse'; this.lastDesk = 'mouse'; }
    this.anyInput = padUsed || keyUsed || mouseUsed || this.domInput;
    this.domInput = false;
    return this.last;
  }

  /** The pointer in art pixels. */
  pointerArt(ctx) {
    const p = ctx.input.pointer;
    return { x: ((p.x + 1) / 2) * ctx.hud.width, y: ((1 - p.y) / 2) * ctx.hud.height };
  }

  /** ps / xbox / key / mouse: which prompt column to draw. */
  promptColumn() {
    if (this.last === 'pad') return this.glyphs;
    return this.last === 'mouse' ? 'mouse' : 'key';
  }
}
