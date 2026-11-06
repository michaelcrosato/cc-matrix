// Two favours a day, a "!" over the head: fetch, deliver, catch within an hour, return, trade.
import { FAVOURS, NEIGHBOURS, NEIGHBOUR_ORDER } from '../data/neighbours.js';
import { ITEMS } from '../data/items.js';
import { Stream } from '../core/rng.js';
import { say, ask } from './say.js';
import { typeLine } from './lines.js';
import { addItem, addBeans, findItem, removeSlot, hasRoom } from './economy.js';
import { tuning } from '../dev/tuning.js';
import { gainFriend, giveGift } from './talk.js';
import { absMinute } from './time.js';
import { remember } from './memory.js';

const REWARDS = ['shellConch', 'driftBottle', 'mushroom', 'stationery', 'seedTulip', 'seedDaisy', 'seedRose', 'seedBellflower', 'medicine', 'plainGreen', 'capBlue', 'pottedPlant', 'bearToy', 'cottageSide', 'mossyPlant', 'bureauCan'];
export function dailyFavours(g) {
  const w = g.world;
  const s = new Stream(`${w.seed}:favours:${w.clock.day}`);
  for (const id of NEIGHBOUR_ORDER) { const f = w.npcs[id].favour; if (f && f.state === 'offer') w.npcs[id].favour = null; }
  const here = NEIGHBOUR_ORDER.filter((n) => w.npcs[n].moved === 'here' && !w.npcs[n].favour);
  for (const id of s.shuffle(here).slice(0, 2)) offerFavour(g, id, s);
}
export function offerFavour(g, id, s = null) {
  const w = g.world;
  s ??= new Stream(`${w.seed}:favour:${id}:${w.clock.day}:${w.clock.minute}`);
  const pool = FAVOURS.filter((f) => !f.seasons || f.seasons.includes(g.season));
  const idx = FAVOURS.indexOf(s.pick(pool));
  const f = FAVOURS[idx];
  const others = NEIGHBOUR_ORDER.filter((n) => n !== id && w.npcs[n].moved === 'here');
  const target = s.pick(others);
  w.npcs[id].favour = { idx, state: 'offer', target, deadline: null, reward: s.pick(REWARDS), day: w.clock.day };
  g.events.emit('favourOffered', { id, idx });
}
const matches = (f, slot) => {
  if (!slot) return false;
  const it = ITEMS[slot.id];
  if (f.anyCat) return it?.cat === f.anyCat;
  return slot.id === f.item;
};
const beanReward = (g, friend) => Math.round((300 + friend * 12) * tuning.favourMult);
function* payOff(g, id, f, st) {
  const w = g.world;
  yield* say(g, id, f.done);
  const a = g.actorOf(id);
  a.play('Nod', 0.1, { once: true });
  gainFriend(g, id, 8);
  const bean = beanReward(g, w.npcs[id].friend);
  addBeans(g, bean, 'favour');
  g.sound('bean');
  if (hasRoom(w)) { addItem(g, st.reward, { from: id }); }
  yield* say(g, id, typeLine(g, id, 'thanks'));
  g.ui.toastMsg(`+${bean} beans and a ${ITEMS[st.reward]?.name ?? 'thing'}`);
  w.npcs[id].favour = null;
  w.stats.favoursDone += 1;
  g.events.emit('favourDone', { id });
}
export function* favourTalk(g, id) {
  const w = g.world;
  const st = w.npcs[id].favour;
  if (!st) return;
  const f = FAVOURS[st.idx];
  const name = NEIGHBOURS[st.target]?.short ?? NEIGHBOURS[st.target]?.name ?? 'someone';
  const extra = { target: name };
  if (st.state === 'offer') {
    const lead = typeLine(g, id, 'favour');
    yield* say(g, id, lead);
    const c = yield* ask(g, id, f.ask, ['All right', 'Not today'], { extra });
    if (c !== 0) return;
    st.state = 'active';
    if (f.kind === 'catch') st.deadline = absMinute(w) + f.mins;
    if (f.kind === 'deliver') {
      if (!hasRoom(w)) { yield* say(g, id, 'Your pockets are full. Come back when there\'s room for it.'); st.state = 'offer'; return; }
      addItem(g, 'parcel', { questFor: st.target, from: id });
      g.sound('pickUp');
    }
    if (f.kind === 'return') g.world.flags.lostFor = { owner: id, holder: st.target };
    g.events.emit('favourAccepted', { id, kind: f.kind });
    return;
  }
  // active
  if (f.kind === 'catch' && st.deadline && absMinute(w) > st.deadline) {
    yield* say(g, id, "Too late. The moment's gone. I've made other arrangements with the moment.");
    w.npcs[id].favour = null;
    return;
  }
  if (f.kind === 'fetch' || f.kind === 'catch' || f.kind === 'trade') {
    const i = w.player.pockets.findIndex((sl) => matches(f, sl));
    if (i < 0) { yield* say(g, id, f.kind === 'catch' ? 'Well? The clock\'s going. Where is it?' : 'You haven\'t got it. I can tell. You\'re walking too lightly.'); return; }
    const c = yield* ask(g, id, `That ${ITEMS[w.player.pockets[i].id].name}. Is that for me?`, ['Here you go', 'Not this one']);
    if (c !== 0) return;
    removeSlot(g, i);
    g.player.pose('Give', 0.5);
    yield 0.35;
    yield* payOff(g, id, f, st);
    return;
  }
  if (f.kind === 'return') {
    const i = w.player.pockets.findIndex((sl) => sl?.id === 'lostThing');
    if (i < 0) { yield* say(g, id, `Have you asked ${name}? Go on. I'll wait. I'm very good at it.`); return; }
    removeSlot(g, i);
    yield* payOff(g, id, f, st);
    return;
  }
  if (f.kind === 'deliver') yield* say(g, id, `It's for ${name}. Off you go.`);
}
/** Called from talk when the neighbour is the far end of someone else's errand. */
export function* favourFarEnd(g, id) {
  const w = g.world;
  const i = w.player.pockets.findIndex((sl) => sl?.id === 'parcel' && sl.questFor === id);
  if (i >= 0) {
    const slot = removeSlot(g, i);
    const owner = slot.from;
    const st = w.npcs[owner]?.favour;
    const f = st ? FAVOURS[st.idx] : null;
    g.player.pose('Give', 0.5);
    yield 0.3;
    yield* say(g, id, f?.done ?? 'Oh. Thank you.');
    if (st) {
      gainFriend(g, owner, 6);
      gainFriend(g, id, 3);
      const bean = beanReward(g, w.npcs[owner].friend);
      addBeans(g, bean, 'favour');
      g.sound('bean');
      g.ui.toastMsg(`+${bean} beans, from ${NEIGHBOURS[owner]?.short ?? owner}'s errand`);
      w.npcs[owner].favour = null;
      w.stats.favoursDone += 1;
      remember(g, 'gift', { item: 'parcel', about: id });
      g.events.emit('favourDone', { id: owner });
    }
    return true;
  }
  if (w.flags.lostFor?.holder === id) {
    if (!hasRoom(w)) { yield* say(g, id, 'I\'ve got it here, but your pockets are full. Come back.'); return true; }
    yield* say(g, id, 'Oh, that. It\'s been holding up a table. Take it. The table can face the truth.');
    addItem(g, 'lostThing', {});
    g.sound('pickUp');
    w.flags.lostFor = null;
    return true;
  }
  return false;
}
export { findItem, giveGift };
