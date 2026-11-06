// Talking to a neighbour: friendship, memory, favours, gifts. The thing players tell friends about.
import { NEIGHBOURS } from '../data/neighbours.js';
import { TYPE_LINES } from '../data/dialogue/types.js';
import { typeLine, uniqueLine, gossipLine, resolveTags } from './lines.js';
import { memoryLine, remember } from './memory.js';
import { say, ask } from './say.js';
import { tuning } from '../dev/tuning.js';
import { weatherNow, hourNow } from './time.js';
import { giftScore, removeSlot, addItem, addBeans, findItem, hasRoom } from './economy.js';
import { ITEMS, SELLABLE } from '../data/items.js';
import { pocketsPicker } from '../ui/screens/pockets.js';
import { favourTalk, offerFavour } from './favours.js';
import { day1Talk } from './dayone.js';
import { storyTalk } from './story.js';
import { Stream } from '../core/rng.js';

export const gainFriend = (g, id, n) => {
  const s = g.world.npcs[id];
  s.friend = Math.min(100, Math.max(0, s.friend + Math.round(n * (n > 0 ? tuning.friendMult : 1) * (g.world.player.luck === 'friend' && n > 0 ? 1.5 : 1))));
  g.events.emit('friend', { id, friend: s.friend });
};
const friendTier = (f) => (f >= 70 ? 'best friend' : f >= 40 ? 'friend' : f >= 15 ? 'acquaintance' : 'stranger');
export const friendLabel = friendTier;

function contextLine(g, id) {
  const w = g.world;
  const h = hourNow(w);
  const hh = h < 5 ? h + 24 : h;
  const k = weatherNow(g);
  const season = ['spring', 'summer', 'autumn', 'winter'][g.season];
  const s = new Stream(`${w.seed}:ctx:${id}:${w.clock.day}:${w.stats.talks[id] ?? 0}`);
  const r = s.next();
  if (r < 0.2) return typeLine(g, id, hh < 11 ? 'morning' : hh < 16 ? 'noon' : hh < 21 ? 'evening' : 'night');
  if (r < 0.38) return typeLine(g, id, k === 'storm' ? 'rain' : k === 'fog' || k === 'clear' ? 'sun' : k);
  if (r < 0.5) return typeLine(g, id, season);
  if (r < 0.75) return uniqueLine(g, id);
  return typeLine(g, id, 'chatter');
}

/** A neighbour conversation as a scene. */
export function* talkTo(g, id) {
  const w = g.world;
  const s = w.npcs[id];
  const data = NEIGHBOURS[id];
  const npc = g.npcs.get(id);
  const first = s.talkedDay !== w.clock.day;
  w.stats.talks[id] = (w.stats.talks[id] ?? 0) + 1;
  g.events.emit('talked', { id, first });
  npc.talking = true;
  // Knock after bedtime
  const hr = hourNow(w) < 5 ? hourNow(w) + 24 : hourNow(w);
  if (npc.inside && (hr < data.wake || hr >= data.sleep)) {
    g.player.play('Idle');
    yield* say(g, id, typeLine(g, id, 'night'));
    npc.talking = false;
    return;
  }
  const a = g.actorOf(id);
  a.play('Talk', 0.15);
  if (first) {
    s.talkedDay = w.clock.day;
    gainFriend(g, id, 3);
  }
  // Story beats come first: Day One errands, Rocco's news.
  const handled = yield* day1Talk(g, id);
  if (handled) { npc.talking = false; return; }
  const storyDone = yield* storyTalk(g, id);
  if (storyDone) { npc.talking = false; return; }
  let opening = null;
  if (first && s.absentNote) { opening = typeLine(g, id, 'absent'); s.absentNote = false; }
  else if (g.world.player.puffy && !s.sawPuffy) { s.sawPuffy = true; opening = "Your *face*! What happened to your face?! No. Don't tell me. It's wasps. It's always wasps."; }
  else if (first && s.friend < 12) { opening = typeLine(g, id, 'greet'); }
  else {
    const m = first ? memoryLine(g, id) : null;
    if (m) opening = m.text;
    else if (first) opening = typeLine(g, id, 'greet');
    else opening = contextLine(g, id);
  }
  // A favour on offer shows here.
  const fav = s.favour;
  const options = [];
  if (fav && fav.state === 'active') options.push('About that favour…');
  if (fav && fav.state === 'offer') options.push('Need anything?');
  options.push('Chat');
  options.push('Give a gift');
  options.push('Bye');
  const c = yield* ask(g, id, opening, options, { extra: { neighbour: 'someone' } });
  const pick = options[c];
  if (pick === 'Chat') {
    a.play('Talk', 0.15);
    const r = new Stream(`${w.seed}:chat:${id}:${w.stats.talks[id]}`).next();
    const line = r < 0.35 ? gossipLine(g, id) : r < 0.6 ? uniqueLine(g, id) : r < 0.82 ? typeLine(g, id, 'chatter') : typeLine(g, id, 'hungry');
    yield* say(g, id, line);
  } else if (pick === 'Give a gift') {
    yield* giveGift(g, id);
  } else if (pick === 'About that favour…' || pick === 'Need anything?') {
    yield* favourTalk(g, id);
  }
  a.play('Idle', 0.2);
  npc.talking = false;
}

export function* giveGift(g, id) {
  const w = g.world;
  const s = w.npcs[id];
  let picked = -2;
  g.ui.push(pocketsPicker(g, { title: `Give to ${NEIGHBOURS[id].short ?? NEIGHBOURS[id].name}`, filter: (slot) => ITEMS[slot.id] && ITEMS[slot.id].cat !== 'tool' && !ITEMS[slot.id].noSell, onPick: (i) => { picked = i; }, onCancel: () => { picked = -1; } }));
  while (picked === -2) yield;
  if (picked < 0) return false;
  const slot = removeSlot(g, picked);
  const it = ITEMS[slot.id];
  const score = giftScore(id, slot.id);
  const bank = score >= 2 ? 'giftLove' : score === 1 ? 'giftLike' : score === 0 ? 'giftMeh' : 'giftHate';
  gainFriend(g, id, score >= 2 ? 10 : score === 1 ? 5 : score === 0 ? 2 : 0);
  remember(g, 'gift', { item: it.name, about: id });
  g.events.emit('gift', { id, item: slot.id, score });
  w.stats.gifts = (w.stats.gifts ?? 0) + 1;
  g.player.pose('Give', 0.5);
  yield 0.35;
  const a = g.actorOf(id);
  a.play(score >= 1 ? 'Love' : score === 0 ? 'Shrug' : 'ShakeHead', 0.1, { once: true });
  yield* say(g, id, typeLine(g, id, bank));
  if (slot.id === 'cheeseOff' && id === 'ozzie') yield* say(g, id, 'This has gone off. Do you know what that means? It means it was *on*. You didn\'t hear it from me.');
  return true;
}
export { offerFavour, addItem, addBeans, findItem, hasRoom, SELLABLE, resolveTags, TYPE_LINES };
