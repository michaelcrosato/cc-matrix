// Shared by the Node suites.
export function suite() { let pass = 0, fail = 0; const ok = (c, name, extra = '') => { if (c) pass++; else { fail++; console.log(`FAIL ${name} ${extra}`); } return !!c; }; return { ok, done() { console.log(`__COUNT ${pass} ${fail}`); process.exit(0); } }; }
const short = (e) => { console.log(`FAIL exception: ${String(e?.message).slice(0, 300)} @ ${String(e?.stack).split('\n').filter((l) => /^\s+at /.test(l)).slice(0, 6).map((l) => l.trim().replace(/file:\/\/.*\/(src|tools)\//, '').slice(0, 90)).join(' < ')}`); console.log('__COUNT 0 1'); process.exit(0); };
process.on('uncaughtException', short); process.on('unhandledRejection', short);
/** A driver over a headless game: presses real actions through real screens. */
export class Driver {
  constructor(e, app) { this.e = e; this.app = app; }
  async settle() { let n = 0; while (this.app.loading && n++ < 2000) { this.e.step(1); await new Promise((r) => setImmediate(r)); } this.e.step(2); if (this.e.errors.length) throw new Error(`engine: ${this.e.errors[0]}`); }
  step(n = 1) { this.e.step(n); if (this.e.errors.length) throw new Error(`engine: ${this.e.errors[0]}`); }
  press(a) { this.app.actions.inject(a); this.step(2); }
  get ui() { return this.app.ui; } get top() { return this.app.ui.top?.id; } get focus() { return this.app.ui.focus; }
  items() { return this.app.ui.items.map((i) => i.id); }
  /** Move the focus with direction presses until it rests on id. */
  focusOn(id) { if (this.top === 'map') { for (let k = 0; k < 12 && this.focus !== id; k++) this.press('right'); if (this.focus === id) return true; throw new Error(`no place ${id}`); } for (let k = 0; k < 40; k++) { if (this.focus === id) return true; const its = this.app.ui.items, cur = its.find((i) => i.id === this.focus), t = its.find((i) => i.id === id); if (!t) throw new Error(`no item ${id} on ${this.top}: ${this.items()}`); if (!cur) { this.step(2); continue; } const dx = t.x + t.w / 2 - (cur.x + cur.w / 2), dy = t.y + t.h / 2 - (cur.y + cur.h / 2); const dir = Math.abs(dy) > Math.abs(dx) || k > 20 && dy !== 0 ? (dy > 0 ? 'down' : 'up') : dx > 0 ? 'right' : 'left'; this.press(dir); } throw new Error(`cannot reach ${id} on ${this.top} from ${this.focus}: ${this.items()}`); }
  async choose(id) { this.focusOn(id); this.press('confirm'); await this.settle(); }
  async back() { this.press('back'); await this.settle(); }
  expect(id) { if (this.top !== id) throw new Error(`expected screen ${id}, on ${this.top} [${this.app.ui.stack.map((s) => s.id)}]`); }
}
