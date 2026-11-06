// Overlays: pause, menus, dialogue, dev tools. Whatever is on top takes input first.
export class ScreenStack {
  screens = [];

  get top() { return this.screens[this.screens.length - 1] ?? null; }
  get open() { return this.screens.length > 0; }
  names() { return this.screens.map((s) => s.name ?? s.constructor.name); }

  push(screen) {
    this.screens.push(screen);
    screen.onOpen?.();
    return screen;
  }

  pop(screen = null) {
    const s = screen ?? this.top;
    const i = this.screens.indexOf(s);
    if (i < 0) return null;
    this.screens.splice(i, 1);
    s.onClose?.();
    return s;
  }

  clear() {
    for (const s of [...this.screens].reverse()) { s.onClose?.(); }
    this.screens.length = 0;
  }

  /** Only the screen on top reads input; a screen pushed this frame starts next frame. */
  update(ctx, dt) {
    const top = this.top;
    if (top) top.update?.(ctx, dt);
    for (const s of this.screens) if (s !== top) s.tick?.(ctx, dt);
  }

  draw(ctx, dt) {
    const screens = [...this.screens];
    // A screen hides the ones beneath it, unless it says it is see-through (dialogue over a question).
    let first = 0;
    for (let i = screens.length - 1; i >= 0; i--) if (screens[i].opaque !== false) { first = i; break; }
    for (let i = first; i < screens.length; i++) screens[i].draw?.(ctx, dt);
  }
}
