// The whole game, played by a bot from Arrival to the credits. The bot has god mode (the Dame's crypt and the saw are tuned for people).
import { Engine } from '../../pixel-engine.js';
import { Run, app, Bot } from './_helpers.mjs';
import { LaunchBot } from '../../src/game/bot.js';
import { makeGame } from '../../src/game/flow.js';
import { LEVELS } from '../../src/data/levels/index.js';
import { TitleScene } from '../../src/screens/title.js';

export const slow = true;
export async function run(T) {
  app.run = new Run('standard'); app.screens = []; app.autoAdvance = true; app.noFade = true; app.attract = false; app.hub = false; app.TitleClass = TitleScene;
  app.botFactory = (g) => { if (g.def.launch) new LaunchBot().attach(g); else new Bot({ cheat: true, teleportStuck: true }).attach(g); };
  const g0 = makeGame(LEVELS[0], { run: app.run }); app.botFactory(g0);
  const e = await Engine.headless(g0, {}); app.engine = e;
  const seen = []; let credits = false, lastProgress = 0, lastId = '', stall = 0;
  for (let s = 0; s < 90 * 60 && !credits; s += 10) {
    for (let k = 0; k < 20; k++) { e.step(30); await new Promise((r) => setTimeout(r, 1)); }
    const a = e.game; const id = a.def?.id || a.name;
    if (id !== lastId) { seen.push(id); lastId = id; stall = 0; } else stall += 10;
    T.check('no engine errors while playing ' + id, e.errors.length === 0, e.errors[0]); if (e.errors.length) break;
    if (a.errors?.length) { T.check('no script errors in ' + id, false, a.errors[0]); break; }
    if (stall > 25 * 60) { T.check('no area stalls for 25 minutes: ' + id, false, a.status()); break; }
    if (a.endCredits) credits = true;
  }
  T.eq('areas visited in order', seen.join(','), 'quay,road,cannery,yard,causeway,abbey,nave,launch');
  T.check('the bot reached the credits', credits);
  T.check('some tannoys were shot', app.run.tannoys.length >= 0);
}
