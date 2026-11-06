import { createWorld, stepWorld, loadZone, drainEvents } from '../../src/sim/world.js';
import { createHero } from '../../src/sim/progress.js';
import { botIntent } from '../../src/sim/bot.js';
export const name = 'combat';
export async function run(t) {
  for (const cls of ['bellwarden', 'lamplighter', 'sexton']) {
    const w = createWorld({ seed: 11 });
    const h = createHero(w, { seat: 0, cls, name: 'T', level: 12, lastBell: false });
    h.level = 12; 
    loadZone(w, 'ossuary1');
    const k0 = w.kills; let frames = 0;
    for (; frames < 60 * 90 && w.kills - k0 < 20; frames++) {
      const st = { goal: w.zone.exit };
      stepWorld(w, { 0: botIntent(w, h, st) });
      if (!h.alive) { h.hp = h.maxHp; h.alive = true; }
      if (w.events.length > 500) drainEvents(w);
    }
    t.ok(w.kills - k0 >= 20, `${cls}: killed only ${w.kills - k0} in ${frames} frames`);
  }
}
