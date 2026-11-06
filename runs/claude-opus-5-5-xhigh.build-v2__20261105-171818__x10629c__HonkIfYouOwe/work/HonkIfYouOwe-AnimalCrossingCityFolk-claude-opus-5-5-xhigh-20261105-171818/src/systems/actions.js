// What pressing does. Data entries (rooms, verbs) name an act; each act is a scene here.
import { say, ask, narrate } from './say.js';
import { talkTo } from './talk.js';
import { addItem, hasRoom, removeSlot, addBeans } from './economy.js';
import { ITEMS } from '../data/items.js';
import { hostLine } from './lines.js';
import { playChime, noteOf } from './bell.js';
import { hourNow } from './time.js';
import { day1Mayor } from './dayone.js';
import { remember } from './memory.js';
import { HOSTS } from '../data/dialogue/hosts.js';
import { SERVICES } from './services.js';
import { VENUES } from './venues.js';
import { mailScreen } from '../ui/screens/mail.js';
import { pocketsPicker } from '../ui/screens/pockets.js';
import { busRide } from './bus.js';
import { stargaze } from './stargaze.js';
import { cheeseState, buyCheese, cheesePriceNow } from './cheese.js';
import { NEIGHBOURS } from '../data/neighbours.js';
import { CITY_DOORS } from '../data/cityMap.js';
import { festivalAction } from './festivals/festivals.js';

const ACTIONS = {
  npcTalk: (g, t) => talkTo(g, t.npc),
  *shakeTree(g, t) {
    g.player.faceToward(t.x, t.z);
    g.player.pose('ShakeTree');
    yield 0.25;
    if (g.net?.role === 'guest') { g.net.t.send({ t: 'do', a: 'shake', k: t.key }); g.sound('shakeTree'); return; }
    g.life.shakeTree(t.key, t.obj);
    g.rumble(0.25, 100);
    yield 0.4;
  },
  *pickObject(g, t) {
    const w = g.world;
    if (g.net?.role === 'guest') {
      if (t.obj?.k === 'flower') { g.ui.toastMsg("It's not your flower. Leave it."); return; }
      g.player.pose('PickUp');
      g.net.t.send({ t: 'do', a: 'pick', k: t.key });
      return;
    }
    g.player.faceToward(t.x, t.z);
    g.player.pose('PickUp');
    yield 0.25;
    if (!hasRoom(w)) { g.ui.toastMsg('Your pockets are full.'); g.sound('uiError'); return; }
    const it = ITEMS[t.give];
    addItem(g, t.give);
    delete w.town.objects[t.key];
    g.town.dirty.add(t.key);
    g.sound('pickUp');
    g.ctx.particles.burst('sparkle', [t.x, 0.3, t.z], { count: 4 });
    g.events.emit('picked', { id: t.give });
    if (it?.cat === 'flower') g.events.emit('pickedFlower', {});
    if (it?.cat === 'shell' || it?.cat === 'oddity') { if (!w.flags[`seen:${t.give}`]) { w.flags[`seen:${t.give}`] = true; yield* narrate(g, `You found ${/^[aeiouAEIOU]/.test(it.name) ? 'an' : 'a'} ${it.name}. ${it.line ?? ''}`); } else g.ui.toastMsg(it.name); }
    else g.ui.toastMsg(it?.name ?? 'Got it.');
  },
  *pullWeed(g, t) {
    const w = g.world;
    if (g.net?.role === 'guest') { g.ui.toastMsg("It's not your village to weed. Very kind, though."); return; }
    g.player.faceToward(t.x, t.z);
    g.player.pose('PickUp');
    yield 0.25;
    delete w.town.objects[t.key];
    g.town.dirty.add(t.key);
    g.sound('pullWeed');
    g.ctx.particles.burst('dirt', [t.x, 0.2, t.z], { count: 3 });
    w.stats.weeds += 1;
    if (w.stats.weeds % 5 === 0) remember(g, 'weeds', {});
    g.events.emit('weedPulled', {});
    if (hasRoom(w) && (w.story.day1Active || w.player.pockets.filter((s) => s?.id === 'weed').length < 2)) addItem(g, 'weed');
  },
  *bury(g, t) {
    const w = g.world;
    let picked = -2;
    g.ui.push(pocketsPicker(g, { title: 'Bury what?', filter: (s) => ITEMS[s.id]?.cat === 'bag', onPick: (i) => { picked = i; }, onCancel: () => { picked = -1; } }));
    while (picked === -2) yield;
    if (picked < 0) return;
    const slot = removeSlot(g, picked);
    const it = ITEMS[slot.id];
    w.town.objects[t.hole] = { k: 'beanstalk', stage: 0, beans: it.beans * 3, planted: w.clock.day };
    g.town.dirty.add(t.hole);
    g.sound('dirtFall');
    remember(g, 'plantedBeans', {});
    g.events.emit('buried', { beans: it.beans });
    yield* say(g, 'player', ['"Beans are currency, dear. You can\'t plant them."', '"You can absolutely plant them. You didn\'t hear it from me."'], { name: 'You remember' });
  },
  *lookStalk(g, t) { yield* narrate(g, 'A beanstalk. It looks at you like it has plans. Come back tomorrow.'); },
  *harvestStalk(g, t) {
    const w = g.world;
    g.player.pose('PickUp');
    yield 0.25;
    const beans = t.obj.beans ?? 3000;
    delete w.town.objects[t.key];
    g.town.dirty.add(t.key);
    addBeans(g, beans, 'beanstalk');
    g.sound('beanLots');
    g.ctx.particles.burst('sparkle', [t.x, 1, t.z], { count: 20, colors: ['sand', 'orange', 'white'] });
    g.events.emit('harvested', { beans });
    yield* narrate(g, `The beanstalk gives up ${beans.toLocaleString('en-US')} beans. Mrs. Gander is going to have questions.`);
  },
  *snowmanTalk(g, t) {
    const o = t.obj;
    if (o.good) yield* say(g, 'player', "Good proportions. I'm told that's rare. I'll write to you. Don't ask how.", { name: 'Snowman', voice: 'crowd' });
    else yield* say(g, 'player', o.ratio <= 0.55 ? 'My head is very small. Is that a comment? It feels like a comment.' : 'My head is nearly the size of my body. I can see over everything. It\'s awful.', { name: 'Snowman', voice: 'crowd' });
    if (o.good && !o.mailed) { o.mailed = true; g.world.mail.pending.push({ from: 'snowman', body: "Dear {player},\nI've melted a bit. I wanted you to have this while there's still enough of me to post it.\nA Snowman", gift: 'bobbleHat', arriveDay: g.world.clock.day + 1 }); }
  },
  *crackHint(g) { yield* narrate(g, "There's a star-shaped crack in the ground. Something's under it. A shovel would be the polite way to ask."); },
  *sitStump(g, t) { yield* sit(g, t.x, t.z); },
  *sitBench(g, t) { yield* sit(g, t.seat[0], t.seat[1]); },
  *lookoutBench(g, t) {
    const [x, z] = t.seat;
    if (!g.isNight()) { yield* sit(g, x, z); return; }
    sitDown(g, x, z);
    yield* stargaze(g);
    standUp(g, x, z);
  },
  *clearPattern(g, t) { delete g.world.town.objects[t.key]; g.town.dirty.add(t.key); },
  *enterBuilding(g, t) {
    const w = g.world;
    const b = t.building;
    const h = hourNow(w);
    if (b.id === 'store' && (h < 8 || h >= 22) && !w.story.day1Active) { yield* say(g, 'gander', HOSTS.gander.closed); return; }
    if (b.id === 'mothwick' && (h < 8 || h >= 22)) { yield* say(g, 'mothwick', "We're closed! Oh! I'm so sorry! I'm in the middle of something terrible! Come back at eight!"); return; }
    if (b.id === 'museum' && !w.museum.open) { yield* say(g, 'quill', ["We're not open! I've got a whole wing that's just a hat! Come back tomorrow! Bring a fossil!"]); return; }
    if (b.id === 'home' && w.story.day1Active && !w.flags.shackEntered) { w.flags.shackEntered = true; }
    const npcId = Object.keys(NEIGHBOURS).find((n) => NEIGHBOURS[n].building === b.id && g.world.npcs[n].moved === 'here');
    if (b.id !== 'home' && NEIGHBOURS[npcId]) {
      const npc = g.npcs.get(npcId);
      if (!npc.inside) { g.sound('knock'); yield 0.15; g.sound('knock'); yield 0.3; yield* narrate(g, `Nobody's home. Somewhere, ${NEIGHBOURS[npcId].short ?? NEIGHBOURS[npcId].name} is being somebody else's problem.`); return; }
    }
    const next = g.rooms.get(b.room);
    const def = next.def;
    let tx = def.exit?.x ?? 3, tz = (def.exit?.z ?? 5) - 0.6;
    if (b.id === 'home') { next.rebuild?.(); tx = next.def.exit.x; tz = next.def.exit.z - 0.6; }
    yield* g.travel(next, tx, tz, Math.PI);
    if (b.id === 'store') g.scripts.run(doorJingle(g), { hold: false, name: 'jingle' });
    g.events.emit('entered', { room: b.room });
  },
  *leaveRoom(g, t) {
    const e = t.exit;
    if (e.to === 'town') { yield* g.travel(g.town, e.tx, e.tz, e.facing ?? 0, { sound: 'doorClose' }); g.events.emit('left', {}); return; }
    if (e.to === 'city') {
      const d = CITY_DOORS.find((x) => x.id === e.door);
      yield* g.travel(g.city, d.tx, d.tz + (d.id === 'theatre' || d.id === 'auction' ? 0 : 0.4), d.id === 'theatre' || d.id === 'auction' ? Math.PI / 2 : 0, { sound: 'doorClose' });
      return;
    }
    yield* g.travel(g.rooms.get(e.to), e.tx, e.tz, e.facing ?? 0, { sound: 'doorClose' });
  },
  *roomDoor(g, t) {
    const d = t.door;
    const r = g.rooms.get(d.to);
    yield* g.travel(r, d.tx ?? r.def.exit.x, d.tz ?? r.def.exit.z - 0.6, Math.PI);
    g.events.emit('entered', { room: d.to });
  },
  *venueDoor(g, t) {
    const v = t.venue;
    const h = hourNow(g.world);
    if (v.id === 'auction' && (h < 10 || h >= 18)) { yield* narrate(g, "Pemberton's Auction Rooms. A sign says TEN-TO-SIX-TEN-TO-SIX. It seems to be still going."); return; }
    if (v.id === 'theatre' && (h < 17 && h >= 5)) { yield* narrate(g, 'The Palace Theatre. Evenings only. A very faint voice from inside is telling someone they were robbed.'); return; }
    const r = g.rooms.get(v.id);
    yield* g.travel(r, r.def.exit.x, r.def.exit.z - 0.6, Math.PI);
    g.world.flags.venuesVisited ??= {};
    g.world.flags.venuesVisited[v.id] = true;
    g.events.emit('entered', { room: v.id });
  },
  *mailbox(g) {
    const w = g.world;
    g.sound('mailFlag');
    let closed = false;
    g.ui.push(mailScreen(g, () => { closed = true; }));
    while (!closed) yield;
  },
  *ringBell(g) {
    g.player.pose('Wave', 0.6);
    playChime(g);
    g.events.emit('bellRung', {});
    yield 0.6;
  },
  *noticeBoard(g) {
    const w = g.world;
    const c = g.cal;
    const st = cheeseState(w, g.season, w.cheese.day || w.clock.day);
    const lines = [];
    lines.push(`NOTICE. Today is ${['Market', 'Errand', 'Show', 'Festival'][c.type]} Day.`);
    if (c.contest) lines.push(`CONTEST TODAY: ${{ derby: 'the Fishing Derby', bugOff: 'the Bug-Off', snowman: 'the Snowman Contest' }[c.contest]}, 10 till 1. Ask at the plaza.`);
    if (c.festival) lines.push(`FESTIVAL TODAY: ${{ seedToss: 'the Seed Toss', lanternFloat: 'the Lantern Float', greatSoup: 'the Great Soup', longNight: 'the Long Night' }[c.festival]}.`);
    if (c.show) lines.push('SHOW TONIGHT: Vesper, on the plaza lamp post, from 7. Bring nothing. She has it.');
    if (c.market) lines.push('MARKET: Old Rind sells cheese on the plaza from 6 till noon. You did not read this here.');
    lines.push(`CHEESE: This week's pattern looks like ${st.pattern}. Today's store price: ${cheesePriceNow(g)} beans a wheel. Whoever pinned this has been very careful not to sign it.`);
    lines.push(`YOUR DEBT: ${w.player.debt.toLocaleString('en-US')} beans. It's on here so everyone can see. Mrs. Gander pinned it herself.`);
    yield* narrate(g, lines.join('//'));
    g.events.emit('readBoard', {});
  },
  *oldPear(g) {
    const w = g.world;
    const lines = ['The Old Pear. Older than the Mayor. Older than the Bell. It has seen everything twice, and fruited.', w.flags.pearLit ? 'It is hung with your lights. It looks embarrassed, in a good way.' : 'Someone has carved "D + a bowl" into the bark.'];
    yield* narrate(g, lines[w.clock.day % 2]);
  },
  *busStop(g) {
    const w = g.world;
    if (w.story.day1Active) { yield* narrate(g, "A sign on the stop says: 'Bus suspended pending your errands. Signed, a goose.'"); return; }
    if (g.net) { g.ui.toastMsg("Bus doesn't run while you have company."); return; }
    const c = yield* ask(g, 'hester', 'Big City? It\'s just the one stop. You\'ll know it when you\'re in it.', ['To the City', 'Not today'], { name: 'Sign at the stop', voice: 'hester' });
    if (c !== 0) return;
    yield* busRide(g, 'city');
  },
  *busHome(g) {
    const c = yield* ask(g, 'hester', 'Back to the end of the line, is it? Everyone does, in the end.', ['Home', 'Not yet']);
    if (c !== 0) return;
    yield* busRide(g, 'town');
  },
  *mayorTalk(g) {
    const w = g.world;
    const a = g.life.trundle;
    if (yield* day1Mayor(g)) return;
    if (w.flags.ribbonGone) yield* say(g, 'trundle', HOSTS.trundle.arrived);
    else yield* say(g, 'trundle', hostLine(g, 'trundle', w.clock.day % 2 ? 'greet' : 'moving'));
    if (w.flags.mayorBumped !== w.clock.day) { w.flags.mayorBumped = w.clock.day; addBeans(g, 50, 'mayor'); g.ui.toastMsg('The Mayor tips his sash. +50 beans, for the election.'); }
    g.events.emit('talkedMayor', {});
  },
  *rindTalk(g) {
    const w = g.world;
    const st = cheeseState(w, g.season, w.cheese.day || w.clock.day);
    const c = g.cal;
    if (!c.market && !w.flags.rindForced) { yield* say(g, 'rind', HOSTS.rind.closed); return; }
    const choice = yield* ask(g, 'rind', `${hostLine(g, 'rind', 'greet')}//${st.base} beans a wheel. No receipts.`, ['Buy one', 'Buy five', 'What happens to it?', 'Not today']);
    if (choice === 0 || choice === 1) {
      const n = choice === 0 ? 1 : 5;
      if (buyCheese(g, n)) { g.sound('bean'); yield* say(g, 'rind', hostLine(g, 'rind', 'buy')); }
      else yield* say(g, 'rind', "Not enough beans. Or not enough pocket. I don't ask which.");
    } else if (choice === 2) yield* say(g, 'rind', hostLine(g, 'rind', 'warn'));
  },
  *vesperTalk(g) {
    const w = g.world;
    yield* say(g, 'vesper', hostLine(g, 'vesper', 'greet'));
    const moods = ['Quiet', 'Hopeful', 'Blue', 'Upside Down', 'Hungry', 'In Debt'];
    const c = yield* ask(g, 'vesper', hostLine(g, 'vesper', 'ask'), [moods[(w.clock.day) % 6], moods[(w.clock.day + 2) % 6], moods[(w.clock.day + 4) % 6], 'Just listening']);
    if (c < 0 || c === 3) return;
    const idx = (w.clock.day + c * 2) % 6;
    g.music.setOverride(`vesper${idx}`);
    g.events.emit('vesperPlays', { idx });
    g.life.vesper.play('Accordion', 0.2);
    for (const n of g.npcs.all()) if (!n.inside && n.here) { n.overrideClip = 'Sway'; }
    const song = `vesper${idx}`;
    g.scripts.run(g.festivals.singAlong(song, 'vesper', 20), { hold: false, name: 'vesperSing' });
    yield* narrate(g, 'She plays. The whole plaza goes a bit quiet, and then a bit quieter. Somebody sniffs. It might be Bartleby.');
    if (!w.records.includes(idx)) {
      w.records.push(idx);
      if (hasRoom(w)) { addItem(g, `record${idx}`); yield* say(g, 'vesper', hostLine(g, 'vesper', 'give')); g.sound('reveal'); g.events.emit('gotRecord', { idx }); }
    }
    g.ctx.tweens.call(18, () => { g.music.setOverride(null); for (const n of g.npcs.all()) n.overrideClip = null; g.life.vesper.play('VesperHang', 0.2); });
  },
  *lighthouseKnock(g) {
    g.sound('knock');
    yield 0.2;
    g.sound('knock');
    yield 0.5;
    yield* narrate(g, 'Nobody answers. The light goes round. A note on the door says: "Back in a moment." The note is very old.');
    g.events.emit('lighthouse', {});
  },
  ...SERVICES,
  ...VENUES,
  *hostTalk(g, t) {
    if (t.talkTo === 'flavia') yield* VENUES.fashionCheck(g);
    else yield* SERVICES.hostTalk(g, t);
  },
};
/** The Village Chime is also the store's door jingle: the first few notes, played small. */
function* doorJingle(g) {
  for (const n of g.world.chime.slice(0, 4)) {
    if (n >= 0) g.ctx.audio.play('bellNote', { pitch: noteOf(n) + 2, volume: 0.35 });
    yield 0.13;
  }
}
function sitDown(g, x, z) {
  const p = g.player;
  p.x = x; p.z = z + 0.05;
  p.y = g.place.height(x, z) + 0.28;
  p.facing = 0;
  p.turnTo = null;
  p.sitting = true;
  p.play('Sit', 0.12);
  g.events.emit('sat', {});
}
function standUp(g, x, z) {
  const p = g.player;
  p.sitting = false;
  p.z = z + 0.8;
  if (g.place.blocked(p.x, p.z)) p.z = z - 0.8;
  p.y = g.place.height(p.x, p.z);
  p.play('Idle', 0.15);
}
function* sit(g, x, z) {
  sitDown(g, x, z);
  yield 0.4;
  g.frozenHoldSit = true;
  while (true) {
    const inp = g.inp;
    if (inp.confirm || inp.back || inp.mouse.click || Math.hypot(inp.axisX, inp.axisY) > 0.3) break;
    yield;
  }
  standUp(g, x, z);
}
export function* runAction(g, t) {
  const fn = ACTIONS[t.act] ?? ((gg, tt) => festivalAction(gg, tt));
  const r = fn(g, t);
  if (r && r.next) yield* r;
}
export { sit, removeSlot };
