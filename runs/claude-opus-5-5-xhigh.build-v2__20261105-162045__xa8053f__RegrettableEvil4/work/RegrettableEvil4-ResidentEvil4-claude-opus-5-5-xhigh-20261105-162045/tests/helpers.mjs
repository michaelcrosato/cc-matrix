// Shared by the Node suites: boot the game headless, step frames, press buttons.
import { readFile } from 'node:fs/promises';
import { Engine } from '../pixel-engine.js';
import { app } from '../src/core/app.js';
import { Run } from '../src/core/run.js';

const root = new URL('../', import.meta.url);
export const assets = async (p) => new Uint8Array(await readFile(new URL(p, root))).buffer;

let ENGINE = null;
export async function boot(game) {
  if (ENGINE) { await ENGINE.loadGame(game); return ENGINE; }
  ENGINE = await Engine.headless(game, { assets, camera: { preset: 'third', fov: 55 }, seed: 7 });
  return ENGINE;
}
export function setup(o = {}) {
  app.fast = true;
  app.scenes = app.scenes ?? { title: () => {}, attract: () => {}, nightShiftMenu: () => {} };
  if (o.run !== false) app.run = o.run ?? new Run();
  return app;
}
export async function step(engine, frames) {
  for (let i = 0; i < frames; i += 10) {
    engine.step(Math.min(10, frames - i));
    await new Promise((r) => setImmediate(r));
  }
}
/** A one-frame press of a key code. */
export async function press(engine, code, hold = 2) {
  engine.input.setKey(code, true);
  await step(engine, hold);
  engine.input.setKey(code, false);
  await step(engine, 1);
}
export const game = (engine) => engine.game;

/**
 * The plan's balance report: "ends each chapter with some but not plenty". Measured, per chapter:
 *   Ammo, some: at least 12 rounds, the line under which the game itself sends a parcel.
 *   Ammo, not plenty: fewer rounds left than she fired in the chapter. She couldn't fight it again on what's left.
 *   Money, some: earned at least 900, the price of the first gun at Mr. Fathom's.
 *   Money, not plenty: earned less than the chapter's shop asks for its stock. She has to choose.
 */
export class BalanceBook {
  constructor(prices, stockOf) { this.prices = prices; this.stockOf = stockOf; this.chapters = []; this.current = null; }

  static rounds(run) {
    let n = 0;
    for (const w of run.ownedWeapons()) n += run.weapons[w].mag + run.case.count(run.weaponStats(w).ammo);
    return n;
  }

  static fired(run) { return run.totals.shots + run.stats.shots; }

  /** Every rise in her money, as it happens: selling and buying in one frame would otherwise cancel out. */
  watch(run) {
    if (this.watched === run) return;
    // A checkpoint reload hands back an older run. What it takes away wasn't earned, or she'd earn it twice.
    if (this.watched && this.current) this.current.earned = Math.max(0, this.current.earned - Math.max(0, this.watched.money - run.money));
    this.watched = run;
    let value = run.money;
    const book = this;
    Object.defineProperty(run, 'money', {
      configurable: true, enumerable: true,
      get() { return value; },
      set(v) { if (v > value && book.current) book.current.earned += v - value; value = v; },
    });
  }

  /** Call often. `ch` is the chapter of the area being played. */
  update(ch, run) {
    this.watch(run);
    if (!this.current || this.current.chapter !== ch) {
      this.close(run);
      this.current = { chapter: ch, firedAtStart: BalanceBook.fired(run), earned: 0 };
    }
    this.current.firedNow = BalanceBook.fired(run);
  }

  close(run) {
    const c = this.current;
    if (!c) return;
    const stock = this.stockOf(c.chapter);
    this.chapters.push({
      chapter: c.chapter,
      left: BalanceBook.rounds(run),
      fired: c.firedNow - c.firedAtStart,
      earned: c.earned,
      onHand: run.money,
      shopAsks: stock.reduce((n, id) => n + (this.prices[id] ?? 0), 0),
    });
    this.current = null;
  }

  /** [ok, text] for each measure of each closed chapter. */
  verdicts() {
    const out = [];
    for (const c of this.chapters) {
      out.push([c.left >= 12, `chapter ${c.chapter} ends with some ammo: ${c.left} rounds left, at least 12`]);
      out.push([c.left < c.fired, `chapter ${c.chapter} ends without plenty of ammo: ${c.left} rounds left, under the ${c.fired} fired`]);
      out.push([c.earned >= 900, `chapter ${c.chapter} pays some money: ${c.earned} earned, at least 900`]);
      out.push([c.earned < c.shopAsks, `chapter ${c.chapter} doesn't pay plenty: ${c.earned} earned, under the ${c.shopAsks} the shop asks`]);
    }
    return out;
  }

  lines() {
    return this.chapters.map((c) => `chapter ${c.chapter}: rounds left ${c.left}, fired ${c.fired}; money earned ${c.earned}, on hand ${c.onHand}, shop asks ${c.shopAsks}`);
  }
}

/** True when the player stands outside the painted map: there is nothing out there but the void. */
export function outOfMap(game) {
  const P = game.player; const info = game.level?.info;
  if (!P || !info) return false;
  const c = info.col(P.x); const r = info.row(P.z);
  return c < 0 || r < 0 || c >= info.w || r >= info.h;
}
