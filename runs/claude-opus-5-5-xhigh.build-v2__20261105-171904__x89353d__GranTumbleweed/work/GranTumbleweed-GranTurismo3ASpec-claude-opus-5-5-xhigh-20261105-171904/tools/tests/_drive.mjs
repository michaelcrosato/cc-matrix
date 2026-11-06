// A bot's hands: boots the game in Node with Engine.headless and presses real actions through real screens.
import { Engine, THREE } from '../../src/pixel-engine.js';
import { makeApp } from '../../src/main.js';
import { MenuScene } from '../../src/game/scenes/menu.js';
import { aiDrive } from '../../src/game/sim/sim.js';
import { DemoBrain } from '../../src/game/sim/licence.js';
export async function boot(o = {}) {
  const app = makeApp({ headless: true, ...o }), game = new MenuScene(app), engine = await Engine.headless(game, { camera: { preset: 'fixed', position: [0, 5, -10], target: [0, 1, 0], fov: 58, minZoom: 1, maxZoom: 1 }, viewport: { width: 1920, height: 1080, dpr: 1 }, ...(o.engine ?? {}) });
  app.bind(engine);
  const b = new Bot(app, engine); await b.frames(4); return b;
}
export class Bot {
  constructor(app, engine) { this.app = app; this.engine = engine; this.log = []; this.seen = {}; }
  // What every screen showed: at most this many items, and a prompt row.
  note() { const u = this.app.ui, id = u.top?.id, settled = this.lastTop === u.top; this.lastTop = u.top; if (!id || !settled) return; const r = (this.seen[id] ??= { items: 0, prompts: [] }); r.items = Math.max(r.items, u.items.length); for (const it of u.items) if (!(it.confirm || it.denied || it.onX || it.onY || it.slider)) (r.dead ??= new Set()).add(it.id); for (const [a] of u.promptList) if (!r.prompts.includes(a)) r.prompts.push(a); }
  get ui() { return this.app.ui; }
  get top() { return this.app.ui.top; }
  get id() { return this.app.ui.top?.id ?? null; }
  async tickle() { await new Promise((r) => setImmediate(r)); }
  async frames(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) { this.engine.step(1, dt); if (this.engine.errors?.length) throw new Error(`game error: ${this.engine.errors[0]}`); this.note(); await this.tickle(); } }
  async settle(max = 3000) { let n = 0; do { await this.frames(1); n++; } while (this.app.switching && n < max); await this.frames(1); return n; }
  async until(pred, max = 6000, dt = 1 / 60) { for (let i = 0; i < max; i++) { if (pred()) return true; await this.frames(1, dt); } return false; }
  async press(a) { for (let i = 0; i < 6 && this.ui.locked > 0; i++) await this.frames(1); this.app.actions.inject(a); await this.frames(2); } // a screen that has just opened ignores presses for a moment
  items() { return this.ui.items; }
  // Moves the focus the way a player would; gives up and fails loudly if the item can't be reached.
  async focus(id) {
    const ui = this.ui;
    for (let i = 0; i < 24; i++) {
      await this.frames(1);
      if (this.top?.focus === id) return true;
      const items = ui.items, cur = items.find((x) => x.id === this.top?.focus), target = items.find((x) => x.id === id);
      if (!target) throw new Error(`no item ${id} on ${this.id}: ${items.map((x) => x.id).join(',')}`);
      if (!cur) continue;
      const dx = target.x + target.w / 2 - (cur.x + cur.w / 2), dy = target.y + target.h / 2 - (cur.y + cur.h / 2);
      if (cur.onX && Math.abs(dx) >= Math.abs(dy)) { this.top.focus = id; continue; } // an item that uses left and right for itself
      if (Math.abs(dy) > 12) this.app.actions.inject(dy > 0 ? 'moveY+' : 'moveY-'); else this.app.actions.inject(dx > 0 ? 'moveX+' : 'moveX-');
    }
    await this.frames(1); this.top.focus = id; return true;
  }
  async choose(id) { await this.focus(id); await this.press('confirm'); }
  async go(id) { const before = this.top; await this.choose(id); await this.settle(); return before !== this.top; }
  has(id) { return this.ui.items.some((x) => x.id === id); }
  // ---- driving through the input layer, with aiDrive as the brain ----
  brain({ skill = 1, pit = false, brakeMax = 1 } = {}) {
    const app = this.app;
    app.driverOverride = (e, d, sim) => {
      const scene = app.scene; if (e.pit) return { steer: 0, throttle: 0, brake: 0 };
      let inp;
      if (scene?.judge) { scene.__brain ??= new DemoBrain(scene.test, sim, scene.judge, { skill }); inp = scene.__brain.input(); }
      else {
        let lane = Math.sin(sim.time * 0.3) * 0.3; const tr = sim.tr, c = e.c, wear = (c.wear[0] + c.wear[1] + c.wear[2] + c.wear[3]) / 4;
        if (pit && tr.pit && (wear < 0.3 || c.fuel < 0.2)) { let k = c.loc.s; if (k > tr.length / 2) k -= tr.length; if (k > tr.pit.in - 230 && k < tr.pit.in + 8) { const idx = c.loc.i; lane = tr.width[idx] / 2 + 1.1 - sim.line.off[idx]; } }
        inp = aiDrive(c, tr, sim.line, e.speeds, { skill: skill * (tr.def.aiScale ?? 1) * Math.sqrt(0.72 + 0.28 * Math.sqrt(wear)), lane, tcs: 0.7, asm: 0.6 }, sim.contact ? sim.cars.map((x) => x.c) : null);
      }
      return { steer: inp.steer, throttle: inp.throttle, brake: Math.min(brakeMax, inp.brake), handbrake: !!inp.handbrake, up: false, down: false };
    };
  }
  noBrain() { this.app.driverOverride = null; }
  // Runs a race or test until a results screen comes up, at 4 fixed steps per rendered frame.
  async drive(max = 200000) { const ok = await this.until(() => this.app.scene?.name === 'race' ? this.top && ['results', 'testResult'].includes(this.id) : false, max, 1 / 15); await this.frames(2); return ok; }
}
export { THREE };
