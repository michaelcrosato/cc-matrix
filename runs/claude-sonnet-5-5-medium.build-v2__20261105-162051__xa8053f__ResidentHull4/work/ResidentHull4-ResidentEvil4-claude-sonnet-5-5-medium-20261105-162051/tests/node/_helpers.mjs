import { Engine } from '../../pixel-engine.js';
import { Area } from '../../src/game/area.js';
import '../../src/game/flow.js';
import { app } from '../../src/core/app.js';
import { Run } from '../../src/core/run.js';
import { Bot } from '../../src/game/bot.js';
import { S } from '../../src/game/enemy.js';
export { S, Bot, Area, Run, app };
export async function boot(def, o = {}) {
  app.run = o.run || new Run(o.difficulty || 'standard'); app.screens = []; app.attract = false; app.hub = false; app.autoAdvance = true; app.noFade = true;
  const area = new Area(def, { run: app.run, ...(o.opts || {}) });
  if (o.bot) new Bot(o.bot).attach(area);
  const e = await Engine.headless(area, {}); app.engine = e;
  e.step(o.warm ?? 5);
  return { e, a: e.game };
}
/** Silence the intro/siege scripts so a test sets up its own scene. */
export const noScripts = (def) => ({ ...def, scripts: [] });
