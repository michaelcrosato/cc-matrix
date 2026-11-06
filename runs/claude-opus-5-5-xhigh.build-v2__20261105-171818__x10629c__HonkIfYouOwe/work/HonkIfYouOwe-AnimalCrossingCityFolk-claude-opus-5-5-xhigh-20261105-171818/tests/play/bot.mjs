// The playthrough bot: real input through the real game, in manual time.
import { bootGame } from './boot.mjs';

export class Bot {
  constructor(game, engine) { this.g = game; this.e = engine; this.frames = 0; this.fails = []; this.seen = {}; game.events.on?.('x', () => {}); }
  static async start(opts) { const { game, engine } = await bootGame(opts); engine.step(10); return new Bot(game, engine); }
  step(n = 1) { this.e.step(n); this.frames += n; }
  press(code, frames = 2) { this.e.input.setKey(code, true); this.step(frames); this.e.input.setKey(code, false); this.step(2); }
  get top() { return this.g.ui.top; }
  get model() { return this.g.ui.model(); }
  check(cond, msg) { if (!cond) this.fails.push(`[${this.g.status?.()}] ${msg} {top ${this.top?.id} scripts ${this.g.scripts.list.map((s) => s.name)} trans ${this.g.inTransition}}`); return !!cond; }
  until(fn, max = 3600, label = '') {
    for (let i = 0; i < max; i++) { if (fn()) return true; this.step(1); }
    this.fails.push(`[${this.g.status()}] timed out: ${label || fn.toString().slice(0, 80)} (screen ${this.model.screen})`);
    return false;
  }
  /** Speak through whatever is open. Answers come from a list of labels or indices. */
  through(answers = [], max = 2400) {
    const list = Array.isArray(answers) ? answers.slice() : [answers];
    for (let i = 0; i < max; i++) {
      const t = this.top;
      if (!t || t.id !== 'dialogue') { if (this.g.scripts.holding && !t) { this.step(1); continue; } if (!this.g.scripts.holding) return true; return true; }
      if (t.done && t.index === t.beats.length - 1 && t.choices) {
        const a = list.length ? list.shift() : t.choices.length - 1;
        const idx = typeof a === 'number' ? a : Math.max(0, t.choices.findIndex((c) => c.includes(a)));
        while (t.choiceFocus !== idx) this.press('ArrowDown');
        this.press('KeyE');
      } else { this.press('KeyE'); this.step(1); }
    }
    this.fails.push(`[${this.g.status()}] dialogue stuck: ${this.top?.currentText?.()}`);
    return false;
  }
  /** Pick a menu entry by label through real navigation. */
  menu(label) {
    const t = this.top;
    if (!t?.items) { this.fails.push(`[${this.g.status()}] no menu for ${label}, on ${t?.id}`); return false; }
    const idx = t.items.findIndex((it) => { const l = typeof it.label === 'function' ? it.label(this.g) : it.label; return l.includes(label); });
    if (idx < 0) { this.fails.push(`[${this.g.status()}] menu ${t.id} has no ${label}: ${t.labels()}`); return false; }
    let guard = 0;
    while (t.focus !== idx && guard++ < 80) this.press('ArrowDown');
    this.press('KeyE');
    return true;
  }
  /** Choose in the pockets grid by item id. */
  pick(id) {
    const t = this.top;
    if (!t?.id?.startsWith('pocket')) { this.fails.push(`[${this.g.status()}] no pocket grid for ${id}, on ${t?.id}`); return false; }
    const i = this.g.world.player.pockets.findIndex((s) => s && (typeof id === 'function' ? id(s) : s.id === id));
    if (i < 0) { this.fails.push(`no ${id} in pockets`); this.press('Escape'); return false; }
    let guard = 0;
    while (t.focus !== i && guard++ < 30) this.press('ArrowRight');
    this.press('KeyE');
    return true;
  }
  /** Steer with the analog stick along a path. */
  walkTo(x, z, { stop = 0.35, max = 1500 } = {}) {
    const g = this.g, e = this.e;
    const place = g.place;
    let path = place.nav ? place.nav.path([g.player.x, 0, g.player.z], [x, 0, z]) : null;
    path = path ? path.slice(1).map((p) => [p[0], p[2]]) : [[x, z]];
    for (let i = 0; i < max; i++) {
      if (!path.length) break;
      const [tx, tz] = path[0];
      const dx = tx - g.player.x, dz = tz - g.player.z;
      const d = Math.hypot(dx, dz);
      if (d < (path.length === 1 ? stop : 0.3)) { path.shift(); continue; }
      const { right, forward } = g.ctx.camera.groundBasis();
      const ux = dx / d, uz = dz / d;
      e.input.analog.x = ux * right.x + uz * right.z;
      e.input.analog.y = ux * forward.x + uz * forward.z;
      this.step(1);
    }
    e.input.analog.x = 0; e.input.analog.y = 0;
    this.step(2);
    const ok = Math.hypot(g.player.x - x, g.player.z - z) < stop + 0.6;
    if (!ok) this.fails.push(`[${g.status()}] walkTo ${x},${z} ended at ${g.player.x.toFixed(1)},${g.player.z.toFixed(1)}`);
    return ok;
  }
  face(x, z) { const p = this.g.player; p.facing = Math.atan2(x - p.x, z - p.z); p.turnTo = null; this.step(2); }
  target() { this.g.interact.update(); return this.g.interact.target; }
  /** Walk beside something and press on it. */
  use(x, z, { act = null, stop = 1.0 } = {}) {
    const g = this.g;
    if (g.place.nav) {
      // stand on the nearest open tile beside the thing
      const opts = [[0, 1], [1, 0], [-1, 0], [0, -1], [0, 1.4], [1.4, 0]];
      let best = null, bd = 1e9;
      for (const [dx, dz] of opts) { const nx = x + dx, nz = z + dz; if (!g.place.blocked(nx, nz)) { const d = Math.hypot(nx - g.player.x, nz - g.player.z); if (d < bd) { bd = d; best = [nx, nz]; } } }
      if (best && bd > 0.3) this.walkTo(best[0], best[1], { stop: 0.3 });
    } else if (Math.hypot(g.player.x - x, g.player.z - z) > stop) {
      // rooms: straight line with sliding; approach from the south
      this.walkTo(x, Math.min(z + 1, g.place.d - 0.6), { stop: 0.3 });
    }
    this.face(x, z);
    g.interact.update();
    const t = g.interact.target;
    if (act && t?.act !== act) {
      const found = g.interact.lastList.find((c) => c.act === act && Math.hypot(c.x - g.player.x, c.z - g.player.z) <= c.r);
      if (found) { this.face(found.x, found.z); g.interact.update(); }
      if (g.interact.target?.act !== act) { this.fails.push(`[${g.status()}] wanted ${act} at ${x},${z} from ${g.player.x.toFixed(1)},${g.player.z.toFixed(1)}; target ${g.interact.target?.act}; near ${g.interact.lastList.filter((c) => Math.hypot(c.x - g.player.x, c.z - g.player.z) < 2).map((c) => c.act)}`); return false; }
    }
    this.press('KeyE');
    return true;
  }
  fast(rate = 20) { this.g.opts.fast = rate; }
}
