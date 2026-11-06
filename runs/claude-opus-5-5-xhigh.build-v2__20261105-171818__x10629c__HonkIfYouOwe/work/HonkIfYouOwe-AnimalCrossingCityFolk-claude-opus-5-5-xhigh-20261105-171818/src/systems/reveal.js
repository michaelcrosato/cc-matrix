// A first catch or find plays the hold-up pose, a jingle and its line. Repeats are quick.
import { ITEMS } from '../data/items.js';
import { say, narrate } from './say.js';
import { drawIcon } from '../art/icons.js';
import { addItem, hasRoom } from './economy.js';

/** Add to the almanac and play the moment. kind: fish | bug | find. */
export function* revealCatch(g, id, line, kind) {
  const w = g.world;
  const it = ITEMS[id];
  const cat = it?.cat;
  const book = cat === 'fish' ? w.almanac.fish : cat === 'bug' ? w.almanac.bug : cat === 'fossil' || cat === 'rawFossil' ? w.almanac.fossil : null;
  const first = book ? !book[id] : !w.flags[`seen:${id}`];
  if (book) book[id] = (book[id] ?? 0) + 1;
  else w.flags[`seen:${id}`] = true;
  if (cat === 'fish') { w.stats.fish += 1; w.stats.caught += 1; if ((it.beans ?? 0) > w.stats.biggestBeans) { w.stats.biggestBeans = it.beans; w.stats.biggest = it.name; } }
  if (cat === 'bug') { w.stats.bugs += 1; w.stats.caught += 1; }
  g.events.emit('caught', { id, kind, first });
  if (!first) {
    g.sound('revealQuick');
    g.ui.toastMsg(`Another ${it.name}.`);
    return;
  }
  const p = g.player;
  p.pose('HoldUp', 1.2);
  g.sound('reveal');
  g.revealIcon = { id, t: 0 };
  g.rumble(0.3, 120);
  yield 0.5;
  yield* narrate(g, `You caught a ${it.name}! ${line ?? it.line ?? ''}`.replace('You caught a', kind === 'find' ? 'You found a' : 'You caught a'));
  g.revealIcon = null;
  p.poseTimer = 0; p.poseClip = null;
}
export function drawReveal(g, hud) {
  const r = g.revealIcon;
  if (!r) return;
  const it = ITEMS[r.id];
  const s = g.project(g.player.x, g.player.y + 1.8, g.player.z);
  if (s) drawIcon(hud, s.x - 16, s.y - 34, it.icon, it.iconColors, 2);
}
export { say, addItem, hasRoom };
