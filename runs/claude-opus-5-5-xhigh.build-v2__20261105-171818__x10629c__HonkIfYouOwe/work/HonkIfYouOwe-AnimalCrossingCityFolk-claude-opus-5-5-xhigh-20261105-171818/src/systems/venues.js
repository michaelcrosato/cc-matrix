// The City's venues. Each has its own fun, not a bare menu.
import { say, ask, narrate } from './say.js';
import { hostLine } from './lines.js';
import { HOSTS } from '../data/dialogue/hosts.js';
import { ITEMS } from '../data/items.js';
import { addItem, hasRoom, removeSlot, spend, sellPrice, addBeans } from './economy.js';
import { CLOTHES, HAT_ITEMS, UMBRELLAS } from '../data/clothes.js';
import { Stream } from '../core/rng.js';
import { lookEditor } from '../ui/screens/lookEditor.js';
import { pocketsPicker } from '../ui/screens/pockets.js';
import { sendMail } from './mail.js';
import { remember } from './memory.js';
import { scoreHome, gradeOf, GRADES } from './rating.js';
import { ART } from '../data/art.js';
import { FURNITURE } from '../data/furniture.js';
import { auctionScreen, consignResult } from '../ui/screens/auction.js';
import { compareScreen } from '../ui/screens/compare.js';
import { theatreScreen } from '../ui/screens/theatre.js';
import { menuChoiceFree } from '../ui/screens/numbers.js';
import { hourNow } from './time.js';
import { ALL_EMOTES } from '../ui/screens/emote.js';

export const FASHION_THEMES = [
  { name: 'Something damp', tags: ['damp', 'nautical'] }, { name: 'Formal, but sorry about it', tags: ['formal', 'drab'] }, { name: 'Loud enough to hear from the bus', tags: ['loud', 'dramatic'] }, { name: 'Cosy to the point of concern', tags: ['cosy', 'wool', 'sleepy'] }, { name: 'Money', tags: ['money', 'formal'] }, { name: 'Leafy', tags: ['leafy', 'plain'] }, { name: 'A person who sleeps well', tags: ['sleepy', 'plain'] }, { name: 'Cheese, obviously', tags: ['cheese', 'loud'] }, { name: 'Tragedy', tags: ['dramatic', 'drab'] }, { name: 'Ready for anything but this', tags: ['practical', 'sporty'] },
];
export function fashionScore(look, theme) {
  const tags = new Set();
  for (const k of ['outfit', 'hatItem', 'glassesItem', 'umbrella']) { const it = ITEMS[look[k]]; for (const t of it?.tags ?? []) tags.add(t); }
  let hits = 0;
  for (const t of theme.tags) if (tags.has(t)) hits++;
  let score = hits * 2;
  if (ITEMS[look.outfit]?.couture) score += 1;
  if (look.hatItem) score += 1;
  if (tags.has('couture')) score += 1;
  if (look.outfit === 'tatteredShirt') score -= 1;
  return { score: Math.max(0, Math.min(5, score)), hits, tags: [...tags] };
}
const hatCommentary = (look) => (ITEMS[look.hatItem] ? `The ${ITEMS[look.hatItem].name}. Well. It's on your head, and I suppose that's somewhere.` : 'No hat. Bold. Bold in the way a cliff is bold.');
export const VENUES = {
  *salonChair(g, t) {
    const w = g.world;
    const a = g.actorOf('fleece');
    a.play('Talk', 0.15);
    const c = yield* ask(g, 'fleece', hostLine(g, 'fleece', 'greet'), ['A cut, please. 800 beans.', 'Just the gossip', 'Never mind']);
    if (c === 1) { yield* say(g, 'fleece', hostLine(g, 'fleece', 'gossip')); return; }
    if (c !== 0) return;
    if (w.player.beans < 800) { yield* say(g, 'fleece', "Ah, non. For this money I can only look at it sadly. I am doing it now."); return; }
    const before = JSON.stringify(w.player.look);
    const seat = t.prop;
    g.player.x = seat.x; g.player.z = seat.z + 0.55; g.player.facing = 0;
    g.player.turnTo = null;
    g.sound('scissors');
    const changed = yield* lookEditor(g, { title: 'Snip & Gossip', turntable: true, hairOnly: true });
    if (changed && JSON.stringify(w.player.look) !== before) {
      spend(g, 800);
      g.sound('scissors');
      g.events.emit('haircut', {});
      yield* say(g, 'fleece', [hostLine(g, 'fleece', 'done'), hostLine(g, 'fleece', 'gossip')]);
    }
  },
  *coutureRail(g) {
    const w = g.world;
    if (w.player.plumes < 3) { yield* say(g, 'flavia', "Darling. That rail is for people with three plumes. You are not one of them, in several senses."); return; }
    yield* say(g, 'flavia', hostLine(g, 'flavia', 'rope'));
    const stock = [...CLOTHES, ...HAT_ITEMS, ...UMBRELLAS].filter((c) => c.couture && !w.flags[`bought:couture:${c.id}`]);
    if (!stock.length) { yield* say(g, 'flavia', "You've bought it all. There's nothing left for you to be wrong in."); return; }
    const labels = stock.slice(0, 5).map((s) => `${s.name}: ${s.price.toLocaleString('en-US')}`);
    labels.push('Never mind');
    const c = yield* menuChoiceFree(g, 'The couture rail', labels);
    if (c < 0 || c >= stock.length || c >= 5) return;
    const it = stock[c];
    if (w.player.beans < it.price) { yield* say(g, 'flavia', "You can't afford to be that person yet."); return; }
    if (!hasRoom(w)) { yield* say(g, 'flavia', 'Your pockets are full. Of what? No. Do not tell me.'); return; }
    spend(g, it.price);
    addItem(g, it.id);
    w.flags[`bought:couture:${it.id}`] = true;
    g.sound('plume');
    g.events.emit('bought', { id: it.id, price: it.price });
  },
  *hostTalkFlavia(g) { yield* VENUES.fashionCheck(g); },
  *fashionCheck(g) {
    const w = g.world;
    const s = new Stream(`${w.seed}:theme:${w.clock.day}`);
    const theme = s.pick(FASHION_THEMES);
    const a = g.actorOf('flavia');
    if (w.player.fashionDay === w.clock.day) { yield* say(g, 'flavia', "I've seen you today. I'm still recovering. Come back tomorrow, in something else."); return; }
    a.play('Talk', 0.15);
    const c = yield* ask(g, 'flavia', [hostLine(g, 'flavia', 'greet')].join('//') + `//Today's theme: "${theme.name}". Shall I look at you?`, ['Judge me', 'Not yet']);
    if (c !== 0) return;
    const look = w.player.look;
    yield* say(g, 'flavia', [hostLine(g, 'flavia', 'judge'), ITEMS[look.outfit] ? `The ${ITEMS[look.outfit].name}. ${ITEMS[look.outfit].tags?.includes(theme.tags[0]) ? 'Yes. I see what you were reaching for.' : 'I see what you were running from.'}` : 'Nothing about that makes sense.', hatCommentary(look)]);
    const r = fashionScore(look, theme);
    w.player.fashionDay = w.clock.day;
    for (let i = 0; i < r.score; i++) { g.sound('plume'); yield 0.35; }
    a.play(r.score >= 3 ? 'Nod' : 'ShakeHead', 0.1, { once: true });
    yield* say(g, 'flavia', HOSTS.flavia[`result${r.score}`]);
    const before = w.player.plumes;
    w.player.plumes = Math.max(before, r.score);
    w.player.plumesTotal = (w.player.plumesTotal ?? 0) + r.score;
    remember(g, 'fashion', { item: String(r.score) });
    g.events.emit('fashionChecked', { score: r.score, theme: theme.name });
    if (w.player.plumes >= 3 && before < 3) yield* say(g, 'flavia', hostLine(g, 'flavia', 'rope'));
  },
  *magdaCounter(g) {
    const w = g.world;
    const a = g.actorOf('magda');
    const c = yield* ask(g, 'magda', hostLine(g, 'magda', 'greet'), ['Rare furniture?', 'Chat', 'Goodbye']);
    if (c === 0) {
      const rare = FURNITURE.filter((f) => f.rare && !w.flags[`bought:rare:${f.id}`]);
      if (!rare.length) { yield* say(g, 'magda', "Sold out. Wagon's been very careful lately."); return; }
      const it = rare[w.clock.day % rare.length];
      const price = it.price;
      const b = yield* ask(g, 'magda', `${hostLine(g, 'magda', 'rare')}//${it.name}. ${price.toLocaleString('en-US')} beans.`, ['Buy it', 'No']);
      if (b === 0) {
        if (w.player.beans < price || !hasRoom(w)) { yield* say(g, 'magda', 'Come back when you can carry it, and pay for it. In that order, ideally.'); return; }
        spend(g, price);
        addItem(g, it.id);
        w.flags[`bought:rare:${it.id}`] = true;
        g.sound('bean');
        g.events.emit('bought', { id: it.id, price });
      }
    } else if (c === 1) yield* say(g, 'magda', hostLine(g, 'magda', 'idle'));
    if (a === null) yield;
  },
  *magdaLook(g, t) {
    const w = g.world;
    const s = t.stock;
    const it = ITEMS[s.id];
    if (w.flags[`bought:${w.clock.day}:${s.id}`]) { yield* narrate(g, 'An empty easel. It looks relieved.'); return; }
    const c = yield* ask(g, 'magda', `${it.name}. ${s.price.toLocaleString('en-US')} beans. ${hostLine(g, 'magda', 'sell')}`, ['Buy it', 'Compare with the print', 'Leave it']);
    if (c === 1) {
      let closed = false;
      g.ui.push(compareScreen(g, s, () => { closed = true; }));
      while (!closed) yield;
      g.events.emit('compared', { id: s.id, forged: !!it.forged });
      return;
    }
    if (c !== 0) return;
    if (w.player.beans < s.price) { yield* say(g, 'magda', "No. Beans first. Then the painting. Then we've never met."); return; }
    if (!hasRoom(w)) { yield* say(g, 'magda', 'Pockets full. It does not fold. Well. It does once.'); return; }
    spend(g, s.price);
    addItem(g, s.id);
    w.flags[`bought:${w.clock.day}:${s.id}`] = true;
    g.sound('bean');
    g.place.refreshDynamic();
    g.events.emit('boughtArt', { id: s.id, forged: !!it.forged });
    yield* say(g, 'magda', hostLine(g, 'magda', 'sold'));
  },
  *catalogueCompare(g) {
    const stock = g.life.magdaStock();
    let closed = false;
    g.ui.push(compareScreen(g, stock[0], () => { closed = true; }));
    while (!closed) yield;
  },
  *theatreSeat(g, t) {
    const w = g.world;
    if (w.flags.theatreDay === w.clock.day) { yield* say(g, 'bellows', "One show a day! My throat is a delicate instrument, and also it's insured!"); return; }
    g.player.x = t.prop.x; g.player.z = t.prop.z - 0.1; g.player.facing = Math.PI; g.player.turnTo = null;
    g.player.play('Sit', 0.12);
    g.player.locked = true;
    yield* say(g, 'bellows', [hostLine(g, 'bellows', 'greet'), hostLine(g, 'bellows', 'sketch')]);
    let result = null;
    g.ui.push(theatreScreen(g, (r) => { result = r; }));
    while (result === null) yield;
    w.flags.theatreDay = w.clock.day;
    g.player.locked = false;
    g.player.z = t.prop.z + 0.8;
    g.player.play('Idle', 0.15);
    if (result.won) {
      const left = ALL_EMOTES.filter((e) => !w.player.emotes.includes(e));
      if (left.length) {
        const em = left[w.clock.day % left.length];
        w.player.emotes.push(em);
        g.sound('reveal');
        yield* say(g, 'bellows', hostLine(g, 'bellows', 'win'));
        g.ui.toastMsg(`You learned an emote: ${em}!`);
        g.events.emit('emoteLearned', { em });
      } else yield* say(g, 'bellows', "You know everything I do! Get out! Bravo!");
    } else yield* say(g, 'bellows', hostLine(g, 'bellows', 'miss'));
  },
  *auctionStart(g) {
    const w = g.world;
    const h = hourNow(w);
    if (w.flags.auctionDay === w.clock.day) { yield* say(g, 'pemberton', "That's-it-that's-all-three-lots-gone-see-you-tomorrow-go-home-I-have-to-lie-down!"); return; }
    yield* say(g, 'pemberton', hostLine(g, 'pemberton', 'greet'));
    let done = false;
    g.ui.push(auctionScreen(g, () => { done = true; }));
    while (!done) yield;
    w.flags.auctionDay = w.clock.day;
    if (h < 0) yield;
  },
  *consign(g) {
    const w = g.world;
    if (w.flags.consignedDay === w.clock.day) { yield* say(g, 'pemberton', 'One-box-a-day-one-box-a-day-it-is-a-very-small-box!'); return; }
    let picked = -2;
    g.ui.push(pocketsPicker(g, { title: 'Consign what?', filter: (s) => { const it = ITEMS[s.id]; return !!it && it.cat !== 'quest' && it.cat !== 'tool' && it.cat !== 'bag'; }, onPick: (i) => { picked = i; }, onCancel: () => { picked = -1; } }));
    while (picked === -2) yield;
    if (picked < 0) return;
    const slot = removeSlot(g, picked);
    const it = ITEMS[slot.id];
    const r = consignResult(w, slot.id, sellPrice(g, slot));
    sendMail(g, { from: 'auction', body: `Dear-Sir-Madam-Or-Other,\nYour ${it.name} sold for ${r.price.toLocaleString('en-US')} beans to ${r.buyer}! Congratulations! We've kept a little! Enclosed is the rest!\nPemberton`, gift: { beans: r.price }, arriveDay: w.clock.day + 1 });
    w.flags.consignedDay = w.clock.day;
    g.sound('stamp');
    g.events.emit('consigned', { id: slot.id, price: r.price });
    yield* say(g, 'pemberton', 'In-the-box-in-the-box-result-by-post-mind-the-step!');
  },
  *brisketDesk(g) {
    const w = g.world;
    yield* say(g, 'brisket', hostLine(g, 'brisket', 'greet'));
    const c = yield* ask(g, 'brisket', 'State your business.', ['Critique my home', 'How is it scored?', 'Any rewards for me?', 'Goodbye']);
    if (c === 0) {
      const r = scoreHome(w);
      const grade = gradeOf(r.score);
      yield* say(g, 'brisket', [`I've seen your home. ${r.score} points. That's grade ${grade.g}.`, hostLine(g, 'brisket', 'critique')]);
      g.events.emit('critiqued', { score: r.score, grade: grade.g });
    } else if (c === 1) {
      yield* say(g, 'brisket', ["Points for what things are worth. Bonus for four or more from a set. Harmony in your wood. Cosy rules: a lamp by a seat, a rug under a table, something growing.", "Music playing, that's a bonus. Clutter loses you points. We score on Show Day nights, and the result comes by mail. We know where you live. That's the job."]);
    } else if (c === 2) {
      const bi = GRADES.findIndex((x) => x.g === w.home.bestGrade);
      if (bi < 0) { yield* say(g, 'brisket', 'No grade on file. Wait for a Show Day night. Tidy something.'); return; }
      const claimed = w.flags.bureauClaim ?? -1;
      if (claimed >= bi) { yield* say(g, 'brisket', "You've had what you're owed. Improve."); return; }
      const reward = GRADES[bi].reward;
      if (!hasRoom(w)) { yield* say(g, 'brisket', 'Your pockets are a disgrace. Empty them.'); return; }
      addItem(g, reward);
      w.flags.bureauClaim = bi;
      g.sound('reveal');
      g.events.emit('bureauReward', { reward });
      yield* say(g, 'brisket', hostLine(g, 'brisket', 'reward'));
    }
  },
  *louCounter(g) {
    const w = g.world;
    const a = g.actorOf('lou');
    const c = yield* ask(g, 'lou', hostLine(g, 'lou', 'greet'), ['House Blend: 200', 'Morning Regret: 350', 'The Slow One: 500', 'Nothing']);
    if (c < 0 || c === 3) return;
    const price = [200, 350, 500][c];
    if (w.player.beans < price) { yield* say(g, 'lou', '…no… beans… | …it\'s… okay.'); return; }
    spend(g, price);
    g.sound('bean');
    // Lou takes a while, and it's worth it.
    a.play('Give', 0.3, { speed: 0.3, once: true });
    yield 1.2;
    g.player.pose('Eat');
    g.sound('chew');
    const untilNoon = w.clock.day * 1440 + 12 * 60;
    const until = w.clock.minute < 12 * 60 ? untilNoon : w.clock.day * 1440 + w.clock.minute + [60, 120, 180][c];
    w.player.buffUntil = Math.max(w.player.buffUntil, until);
    g.events.emit('coffee', { blend: c });
    yield* say(g, 'lou', hostLine(g, 'lou', 'serve'));
    yield* say(g, 'lou', hostLine(g, 'lou', 'hint'));
  },
  *fortuneTable(g) {
    const w = g.world;
    if (w.player.fortuneDay === w.clock.day) { yield* say(g, 'nibbles', 'I already ate your future today. It was very filling. Come back tomorrow.'); return; }
    const c = yield* ask(g, 'nibbles', hostLine(g, 'nibbles', 'greet'), ['A reading: 300 beans', 'No, thank you']);
    if (c !== 0) return;
    if (w.player.beans < 300) { yield* say(g, 'nibbles', "I see no beans in your future. Or your pocket. That one's free."); return; }
    spend(g, 300);
    const s = new Stream(`${w.seed}:fortune:${w.clock.day}`);
    const f = s.pick(HOSTS.nibbles.fortunes);
    g.sound('chew');
    yield 0.35;
    g.sound('chew');
    yield* say(g, 'nibbles', f.text);
    w.player.luck = f.luck === 'none' ? null : f.luck;
    w.player.fortuneDay = w.clock.day;
    g.events.emit('fortune', { luck: f.luck });
  },
};
export { ART, addBeans };
