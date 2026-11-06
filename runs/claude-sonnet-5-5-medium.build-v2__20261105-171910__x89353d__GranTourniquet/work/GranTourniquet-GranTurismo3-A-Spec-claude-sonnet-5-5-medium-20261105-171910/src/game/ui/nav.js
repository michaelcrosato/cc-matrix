// A tiny screen stack. Screens are functions (nav, entry, ctx, ui) that draw and read input; they call nav.pop() / nav.push(type, args).
export const SCREENS = {};
export class Nav {
  constructor(onEmpty) { this.stack = []; this.onEmpty = onEmpty; }
  push(type, args = {}) { this.stack.push({ type, args, s: {} }); }
  pop() { this.stack.pop(); if (!this.stack.length) this.onEmpty?.(); }
  replace(type, args = {}) { this.stack.pop(); this.push(type, args); }
  get top() { return this.stack[this.stack.length - 1]; }
  get depth() { return this.stack.length; }
  clear() { this.stack.length = 0; }
  draw(ctx, ui, extra) { const t = this.top; if (t && SCREENS[t.type]) SCREENS[t.type](this, t, ctx, ui, extra); }
}
