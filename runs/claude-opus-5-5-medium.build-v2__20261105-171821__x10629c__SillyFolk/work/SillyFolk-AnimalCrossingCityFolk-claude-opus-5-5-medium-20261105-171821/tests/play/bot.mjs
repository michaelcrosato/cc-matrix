// Plays the game through real input on a headless engine.
import { boot } from '../headless.mjs';
import { G } from '../../src/state.js';
import { UI } from '../../src/ui/kit.js';
import { Script } from '../../src/ui/dialogue.js';
import { ITEMS } from '../../src/data/items.js';
export { G, UI, Script, ITEMS };
export const fails = []; export let checks = 0;
export function check(name, ok, info = '') { checks++; if (process.env.V) console.log((ok ? 'ok ' : 'NO ') + name, info, Math.round(process.uptime())); if (!ok) { fails.push(name + (info ? ` (${info})` : '')); } }
export class Bot {
  constructor(engine, game) { this.e = engine; this.game = game; this.i = engine.input; }
  static async make() { const { engine, game } = await boot(); return new Bot(engine, game); }
  get w() { return G.world; }
  step(n = 1) { this.e.step(n); }
  unlock() {}
  tap(code, frames = 2) { this.unlock(); this.i.setKey(code, true); this.e.step(frames); this.i.setKey(code, false); this.e.step(2); }
  hold(code, frames) { this.unlock(); this.i.setKey(code, true); this.e.step(frames); this.i.setKey(code, false); this.e.step(1); }
  top() { return UI.top; }
  /** Drive dialogue until no dialogue is up. answers: list of option labels or indexes, consumed in order, or a function(options)->index */
  talkThrough(answers = [], limit = 3000) {
    const a = Array.isArray(answers) ? answers.slice() : answers; let n = 0;
    while (n++ < limit) {
      const t = UI.top; if (Trans_busy()) { this.step(2); continue; }
      if (!t) { if (!Script.active || G.fest?.running || G.fest?.stage === 'doors' || G.fest?.stage === 'pear') return; this.step(2); continue; }
      if (t.id !== 'dialogue') return t;
      if (t.chars < t.pageLen) { this.tap('KeyE'); continue; }
      if (t.showChoices) { const opts = t.itemsModel(); let want = typeof a === 'function' ? a(opts, t) : a.length ? a.shift() : opts.length - 1; if (typeof want === 'string') { const k = opts.findIndex((o) => o.includes(want)); want = k < 0 ? opts.length - 1 : k; } this.choose(t, want); continue; }
      this.tap('KeyE');
    }
    throw new Error('talkThrough stuck: ' + UI.top?.id + ' ' + UI.top?.fullText);
  }
  choose(t, idx) { let g = 0; while (t.focus !== idx && g++ < 12) this.tap('ArrowDown', 1); this.tap('KeyE'); }
  closeAll() { let g = 0; while (UI.stack.length && g++ < 30) { const t = UI.top; if (t.id === 'dialogue') { this.talkThrough(); continue; } this.tap('Escape'); this.step(4); } this.settle(); }
  settle(n = 400) { let g = 0; while ((Trans_busy() || Script.active || UI.stack.length) && g++ < n) { if (UI.top?.id === 'dialogue') this.talkThrough(); else if (UI.top && !UI.top.closed) this.tap('Escape'); this.step(2); } }
  at(x, z, f = 0) { const w = this.w; w.p.x = x; w.p.z = z; w.p.facing = f; G.player.placeNow(); this.step(2); }
  /** Stand next to a thing, facing it, and press the confirm button. */
  use(x, z, dist = 0.8, angle = 0) { const fx = x - Math.sin(angle) * dist, fz = z - Math.cos(angle) * dist; this.w.p.x = fx; this.w.p.z = fz; this.w.p.facing = angle; G.player.placeNow(); this.step(2); this.tap('KeyE'); this.step(3); }
  talkTo(id, answers = []) { const rt = G.npcRt(id); G.world.p.x = rt.px() - 0.0; G.world.p.z = rt.pz() + 1.1; G.world.p.facing = Math.PI; G.player.placeNow(); this.step(2); G.talk(id); this.step(2); return this.talkThrough(answers); }
  tool(frames = 2) { this.tap('Space', frames); this.step(50); }
  nextMorning() { G.sleepTo(0); this.step(4); this.settle(); }
  hour(h) { this.w.clock.minute = h * 60; this.step(3); }
}
import { Trans } from '../../src/world/places.js';
const Trans_busy = () => Trans.busy;
export const Tr = Trans;
