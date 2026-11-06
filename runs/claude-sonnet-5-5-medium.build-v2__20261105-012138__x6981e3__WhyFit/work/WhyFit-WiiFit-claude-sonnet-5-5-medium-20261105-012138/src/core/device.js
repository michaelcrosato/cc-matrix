// Tracks the last input device used: 'pad' | 'kb' | 'mouse'. Prompts follow it.
export class Device {
  last = 'kb';
  padConnected = false;
  xbox = false;
  mouseMoved = 0;
  anyInput = 0; // frames since boot at which any input last happened
  frame = 0;
  idle = 0; // seconds without input
  _px = null; _py = null;
  note(kind) { this.last = kind; this.idle = 0; this.anyInput = this.frame; }
  update(ctx, dt = 1 / 60) {
    this.frame++;
    this.idle += dt;
    const input = ctx.input;
    this.padConnected = !!input.gamepadConnected;
    const st = input.state();
    for (const c of st.held ?? []) {
      if (c.startsWith('Pad')) this.note('pad');
      else if (c.startsWith('Mouse')) this.note('mouse');
      else if (c !== 'Touch') this.note('kb');
    }
    for (const c of input.queuedPresses) {
      if (c.startsWith('Pad')) this.note('pad');
      else if (c.startsWith('Mouse')) this.note('mouse');
      else this.note('kb');
    }
    const pa = input.padAxis;
    if (Math.hypot(pa.x, pa.y) > 0.3) this.note('pad');
    const p = input.pointer;
    if (this._px !== null && (Math.abs(p.x - this._px) > 0.004 || Math.abs(p.y - this._py) > 0.004)) { this.note('mouse'); this.mouseMoved = 1.5; }
    this._px = p.x; this._py = p.y;
    if (this.mouseMoved > 0) this.mouseMoved -= dt;
    if (Math.abs(input.wheel) > 0) this.note('mouse');
  }
  get glyphSet() { return this.last === 'pad' ? (this.xbox ? 'xbox' : 'ps') : this.last; }
}
// Browser-only "press any button" listeners; guarded for Node.
export function listenAny(fn) {
  if (typeof window === 'undefined' || !window.addEventListener) return () => {};
  const f = (e) => fn(e);
  const evs = ['keydown', 'pointerdown', 'wheel', 'touchstart'];
  for (const e of evs) window.addEventListener(e, f, { passive: true });
  let lx = null, ly = null;
  const mv = (e) => { if (lx === null) { lx = e.clientX; ly = e.clientY; return; } if (Math.hypot(e.clientX - lx, e.clientY - ly) > 6) { lx = e.clientX; ly = e.clientY; fn(e); } };
  window.addEventListener('pointermove', mv, { passive: true });
  return () => { for (const e of evs) window.removeEventListener(e, f); window.removeEventListener('pointermove', mv); };
}
