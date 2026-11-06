// The village's services: the store, the Hall and Post, the Museum, Mothwick's, and your own home.
import { say, ask, narrate } from './say.js';
import { hostLine } from './lines.js';
import { HOSTS } from '../data/dialogue/hosts.js';
import { ITEMS, SELLABLE } from '../data/items.js';
import { addItem, removeSlot, hasRoom, addBeans, sellSlot, sellPrice, buyPrice, payDebt, nextTierCost, upgradeHome, spend } from './economy.js';
import { day1Gander, day1Clementine, completeErrand } from './dayone.js';
import { pocketsPicker } from '../ui/screens/pockets.js';
import { letterFlow } from '../ui/screens/letter.js';
import { catalogueScreen } from '../ui/screens/catalogue.js';
import { chimeScreen } from '../ui/screens/chime.js';
import { patternStudio } from '../ui/screens/pattern.js';
import { placementScreen } from '../ui/screens/placement.js';
import { numberPicker } from '../ui/screens/numbers.js';
import { townRating } from './townRating.js';
import { Menu } from '../ui/ui.js';
import { FOSSILS } from '../data/fossils.js';
import { FISH } from '../data/fish.js';
import { BUGS } from '../data/bugs.js';
import { ART } from '../data/art.js';
import { Stream } from '../core/rng.js';
import { remember } from './memory.js';
import { sendMail } from './mail.js';
import { saveNow } from './session.js';
import { bedMenu } from '../ui/screens/bed.js';
import { flavourOfClock } from '../ui/screens/clockFace.js';
import { lookEditor } from '../ui/screens/lookEditor.js';
import { hourNow } from './time.js';
import { wear } from './pocketActions.js';
import { drawText, panel, textWidth } from '../ui/draw.js';

function* waitPick(g, opts) {
  let picked = -2;
  g.ui.push(pocketsPicker(g, { ...opts, onPick: (i) => { picked = i; }, onCancel: () => { picked = -1; } }));
  while (picked === -2) yield;
  return picked;
}
function* menuChoice(g, title, labels, o = {}) {
  let result = -2;
  const items = labels.map((l, i) => (typeof l === 'string' ? { label: l, action: (gg, m) => { result = i; gg.ui.pop(m); } } : { ...l, action: (gg, m) => { result = i; gg.ui.pop(m); } }));
  g.ui.push(new Menu({ id: o.id ?? 'choice', title, items, x: o.x ?? 150, y: o.y ?? 70, w: o.w ?? 180, back: (gg, m) => { result = -1; gg.ui.pop(m); } }));
  while (result === -2) yield;
  return result;
}
export const SERVICES = {
  *ganderCounter(g) {
    const w = g.world;
    if (yield* day1Gander(g)) return;
    const a = g.actorOf('gander');
    a.play('Talk', 0.15);
    while (true) {
      const opts = ['Sell', 'Pay the debt'];
      if (w.player.debt === 0 && nextTierCost(w) != null) opts.push('Sign for the next house');
      opts.push('Paint the house');
      opts.push('Chat');
      opts.push('Goodbye');
      const line = w.flags.gandered === w.clock.day ? hostLine(g, 'gander', 'idle') : hostLine(g, 'gander', 'greet');
      w.flags.gandered = w.clock.day;
      const c = yield* ask(g, 'gander', line, opts);
      const pick = opts[c];
      if (pick === 'Sell') yield* sellFlow(g);
      else if (pick === 'Pay the debt') yield* payFlow(g);
      else if (pick === 'Sign for the next house') yield* tierFlow(g);
      else if (pick === 'Paint the house') yield* paintFlow(g);
      else if (pick === 'Chat') { yield* say(g, 'gander', hostLine(g, 'gander', 'idle')); }
      else break;
    }
    a.play('Idle', 0.2);
  },
  *stockLook(g, t) {
    const w = g.world;
    const it = ITEMS[t.stock.id];
    const price = buyPrice(t.stock.id);
    const c = yield* ask(g, g.place.hostId, `${it.name}. ${price.toLocaleString('en-US')} beans. ${it.line ?? ''}`, ['Buy it', 'Not today'], {});
    if (c !== 0) return;
    if (w.player.beans < price) { yield* say(g, g.place.hostId, g.place.hostId === 'gander' ? HOSTS.gander.noBeans[w.clock.day % 2] : "Oh! You haven't got the beans! I'm so sorry for us both!"); return; }
    if (!hasRoom(w)) { yield* say(g, g.place.hostId, g.place.hostId === 'gander' ? HOSTS.gander.full[0] : 'Your pockets are full! I could weep! Come back with less!'); return; }
    spend(g, price);
    addItem(g, t.stock.id);
    w.player.catalog[t.stock.id] = true;
    w.flags[`bought:${w.clock.day}:${t.stock.id}`] = true;
    g.sound('bean');
    t.mesh?.removeFromParent();
    g.place.refreshDynamic();
    g.events.emit('bought', { id: t.stock.id, price });
    if (g.place.hostId === 'gander') yield* say(g, 'gander', hostLine(g, 'gander', 'buy'));
    else yield* say(g, 'mothwick', hostLine(g, 'mothwick', 'buy'));
    if (w.flags.storeUpgraded) { w.flags.storeUpgraded = false; yield* say(g, 'gander', hostLine(g, 'gander', 'upgrade')); }
  },
  *clementineCounter(g) {
    const w = g.world;
    if (yield* day1Clementine(g)) return;
    while (true) {
      const opts = ['Bean Jar', 'Write a letter', 'Catalogue', 'Town rating', 'The Village Chime', 'Chat', 'Goodbye'];
      const c = yield* ask(g, 'clementine', hostLine(g, 'clementine', 'greet'), ['Bean Jar', 'Post and catalogue', 'The village', 'Goodbye']);
      if (c === 0) yield* SERVICES.beanJar(g);
      else if (c === 1) {
        const c2 = yield* ask(g, 'clementine', hostLine(g, 'clementine', 'post'), ['Write a letter', 'Catalogue', 'Never mind']);
        if (c2 === 0) yield* SERVICES.writeLetter(g);
        else if (c2 === 1) yield* SERVICES.catalogue(g);
      } else if (c === 2) {
        const c2 = yield* ask(g, 'clementine', 'What about it?', ['Town rating', 'The Village Chime', 'Chat', 'Never mind']);
        if (c2 === 0) { const r = townRating(g); yield* say(g, 'clementine', r.lines); g.events.emit('townRated', r); }
        else if (c2 === 1) yield* SERVICES.chime(g);
        else if (c2 === 2) yield* say(g, 'clementine', hostLine(g, 'clementine', w.clock.minute % 2 < 1 ? 'idle' : 'bee'));
      } else break;
      if (opts.length < 0) break;
    }
  },
  *beanJar(g) {
    const w = g.world;
    const c = yield* ask(g, 'clementine', `${hostLine(g, 'clementine', 'jar')}//The jar holds ${w.player.jar.toLocaleString('en-US')} beans.`, ['Deposit', 'Withdraw', 'Never mind']);
    if (c === 0) {
      const n = yield* numberPicker(g, { title: 'Deposit how many?', max: w.player.beans, step: 100 });
      if (n > 0) { w.player.beans -= n; w.player.jar += n; g.sound('beanLots'); g.events.emit('jar', { n }); }
    } else if (c === 1) {
      const n = yield* numberPicker(g, { title: 'Withdraw how many?', max: w.player.jar, step: 100 });
      if (n > 0) { w.player.jar -= n; w.player.beans += n; g.sound('beanLots'); g.events.emit('jar', { n: -n }); }
    }
  },
  *lostFound(g) {
    const w = g.world;
    const list = w.town.lostFound;
    const c = yield* ask(g, 'clementine', list.length ? `The bin has ${list.length} thing${list.length > 1 ? 's' : ''} in it. Nobody knows whose. You could leave something, or find something.` : 'The bin is empty. It was hoping for better things.', ['Find something', 'Leave something', 'Never mind']);
    if (c === 0) {
      if (!list.length) { yield* narrate(g, 'You feel around. There is a button. It is not a real button. You put it back.'); return; }
      if (!hasRoom(w)) { yield* say(g, 'clementine', 'Your pockets are full. The bin understands.'); return; }
      const id = list.shift();
      addItem(g, id);
      g.sound('pickUp');
      yield* narrate(g, `You find ${ITEMS[id]?.name ?? 'something'}. Nobody claims it. Nobody looks up.`);
      g.events.emit('lostFound', { took: id });
    } else if (c === 1) {
      const i = yield* waitPick(g, { title: 'Leave what?', filter: (s) => ITEMS[s.id]?.cat !== 'quest' });
      if (i >= 0) { const s = removeSlot(g, i); list.push(s.id); g.sound('drop'); g.events.emit('lostFound', { left: s.id }); }
    }
  },
  *catalogue(g) {
    let closed = false;
    g.ui.push(catalogueScreen(g, () => { closed = true; }));
    while (!closed) yield;
  },
  *chime(g) {
    let closed = false;
    g.ui.push(chimeScreen(g, () => { closed = true; }));
    while (!closed) yield;
    g.events.emit('chimeSet', {});
  },
  *writeLetter(g) { yield* letterFlow(g); },
  *quillDesk(g) {
    const w = g.world;
    const a = g.actorOf('quill');
    a.play('Talk', 0.15);
    while (true) {
      const raw = w.player.pockets.findIndex((s) => s?.id === 'unknownFossil');
      const opts = [];
      if (raw >= 0) opts.push('Appraise this fossil');
      opts.push('Donate something');
      opts.push('Chat');
      opts.push('Goodbye');
      const c = yield* ask(g, 'quill', hostLine(g, 'quill', 'greet'), opts);
      const pick = opts[c];
      if (pick === 'Appraise this fossil') yield* appraise(g, raw);
      else if (pick === 'Donate something') yield* donate(g);
      else if (pick === 'Chat') yield* say(g, 'quill', hostLine(g, 'quill', 'idle'));
      else break;
    }
    a.play('Idle', 0.2);
  },
  *museumLook(g, t) { yield* narrate(g, `${t.lookName}. ${t.line}`); g.events.emit('lookedExhibit', {}); },
  *mothwickCounter(g) {
    const a = g.actorOf('mothwick');
    a.play('Talk', 0.15);
    const c = yield* ask(g, 'mothwick', hostLine(g, 'mothwick', 'greet'), ['The pattern studio', 'Chat', 'Goodbye']);
    if (c === 0) { yield* say(g, 'mothwick', hostLine(g, 'mothwick', 'pattern')); yield* SERVICES.patternStudio(g); }
    else if (c === 1) yield* say(g, 'mothwick', hostLine(g, 'mothwick', 'idle'));
    a.play('Idle', 0.2);
  },
  *patternStudio(g) {
    let closed = false;
    g.ui.push(patternStudio(g, () => { closed = true; }));
    while (!closed) yield;
  },
  *hostTalk(g, t) {
    yield* say(g, t.talkTo, hostLine(g, t.talkTo, 'greet'));
    if (HOSTS[t.talkTo]?.idle) yield* say(g, t.talkTo, hostLine(g, t.talkTo, 'idle'));
  },
  *goodChair(g) {
    yield* narrate(g, 'The Good Chair. You could sit in it. You could also walk into the sea. You feel about the same way about both.');
    g.events.emit('goodChair', {});
  },
  *nibScope(g) { yield* narrate(g, 'You look through the telescope. It is pointed at the moon. It is daytime. There is a note taped to the eyepiece: "Keep trying."'); },
  // ---- Home --------------------------------------------------------------------------------------
  *furniture(g, t) {
    const w = g.world;
    const f = t.furn;
    switch (f.it.func) {
      case 'lamp':
        f.item.on = f.item.on === false;
        g.place.syncLamps();
        g.sound('uiTick');
        g.events.emit('lamp', { on: f.item.on });
        break;
      case 'seat': {
        const p = g.player;
        p.x = f.x; p.z = f.z; p.y = 0.25; p.facing = (f.item.rot * Math.PI) / 2;
        p.turnTo = null; p.sitting = true;
        p.play('Sit', 0.12);
        g.events.emit('sat', {});
        yield 0.4;
        while (!(g.inp.confirm || g.inp.back || g.inp.mouse.click || Math.hypot(g.inp.axisX, g.inp.axisY) > 0.3)) yield;
        p.sitting = false; p.y = 0;
        const out = [[f.x, f.z + f.d / 2 + 0.5], [f.x + f.w / 2 + 0.5, f.z], [f.x - f.w / 2 - 0.5, f.z], [f.x, f.z - f.d / 2 - 0.5]].find(([x, z]) => !g.place.blocked(x, z));
        if (out) { p.x = out[0]; p.z = out[1]; }
        p.play('Idle', 0.15);
        break;
      }
      case 'bed': yield* bedFlow(g); break;
      case 'stereo': {
        const records = w.player.pockets.map((s, i) => (s && ITEMS[s.id]?.cat === 'record' ? { s, i } : null)).filter(Boolean);
        const owned = w.records.map((r) => ({ label: ITEMS[`record${r}`].name, song: `vesper${r}` }));
        const labels = [...owned.map((o) => o.label), w.home.stereo ? 'Turn it off' : 'Leave it off'];
        const c = yield* menuChoice(g, 'Stereo', labels, { id: 'stereo' });
        if (c >= 0 && c < owned.length) { w.home.stereo = owned[c].song; g.events.emit('stereo', { song: owned[c].song }); g.music.refresh(); }
        else if (c === owned.length) { w.home.stereo = null; g.music.refresh(); }
        if (records.length < 0) break;
        break;
      }
      case 'tv': yield* narrate(g, 'A live feed of the plaza. Nothing is happening, very slowly. The Mayor is in shot. Someone waves. Nobody is there to wave at.'); g.events.emit('watchedTV', {}); break;
      case 'mirror': {
        g.events.emit('mirror', {});
        yield* lookEditor(g, { title: 'The mirror', free: true });
        break;
      }
      case 'tank': case 'cage': {
        const cat = f.it.func === 'tank' ? 'fish' : 'bug';
        const list = w.home[cat === 'fish' ? 'tankFish' : 'cageBugs'];
        const i = yield* waitPick(g, { title: cat === 'fish' ? 'Put in the tank' : 'Put in the cage', filter: (s) => ITEMS[s.id]?.cat === cat });
        if (i >= 0) { const s = removeSlot(g, i); list[s.id] = true; g.place.rebuild(); g.attachIfNeeded?.(); g.events.emit('housed', { id: s.id }); }
        break;
      }
      case 'clock': yield* narrate(g, flavourOfClock(g)); break;
      case 'toilet': g.sound('flush'); g.events.emit('flushed', {}); yield* narrate(g, 'You flush. It accomplishes nothing. You feel better.'); break;
      case 'plant': g.sound('waterPour'); yield* narrate(g, 'You water the plant. It seems to be thinking about something else.'); break;
      default: break;
    }
  },
  *arrange(g) { g.openPlacement(-1); while (g.ui.has('placement')) yield; },
};
function* bedFlow(g) { yield* bedMenu(g); }
function* sellFlow(g) {
  const w = g.world;
  const extraDraw = null;
  yield* say(g, 'gander', hostLine(g, 'gander', 'sell'));
  while (true) {
    let quote = null;
    const screen = pocketsPicker(g, {
      title: 'Sell what?',
      filter: (s) => SELLABLE(s.id),
      onPick: (i) => { quote = i; },
      onCancel: () => { quote = -1; },
      extraDraw: (gg, hud) => {
        const s = gg.world.player.pockets[screen.focus];
        if (s && SELLABLE(s.id)) quoteLabel(gg, hud, `She'd give you ${sellPrice(gg, s).toLocaleString('en-US')} beans`);
        else if (s) quoteLabel(gg, hud, 'She looks at it and says nothing');
      },
    });
    g.ui.push(screen);
    while (quote === null) yield;
    if (quote < 0) return;
    const slot = w.player.pockets[quote];
    const it = ITEMS[slot.id];
    const handmade = slot.from || it.handmade;
    const price = sellPrice(g, slot);
    const line = handmade ? hostLine(g, 'gander', 'soldGift') : slot.id === 'cheese' || slot.id === 'cheeseOff' ? hostLine(g, 'gander', 'cheese') : `${it.name}. I'll give you ${price.toLocaleString('en-US')} beans, dear.`;
    const c = yield* ask(g, 'gander', line, ['Sell it', 'Keep it']);
    if (c === 0) { const got = sellSlot(g, quote); g.sound(got >= 1000 ? 'beanLots' : 'bean'); if (got > 0 && (w.stats.soldTotal % 4 === 1)) yield* say(g, 'gander', hostLine(g, 'gander', 'sold')); }
  }
}
function quoteLabel(g, hud, text) { drawQuote(hud, text); }
function drawQuote(hud, text) { const w = textWidth(text) + 16; panel(hud, 240 - w / 2, 16 - 2, w, 16, { fill: 'navy', trim: 'sky' }); drawText(hud, 240, 18, text, { align: 'center', color: 'white' }); }
function* payFlow(g) {
  const w = g.world;
  if (w.player.debt <= 0) { yield* say(g, 'gander', ["You don't owe me anything, dear. I've checked. Twice. With a lamp."]); return; }
  if (w.player.beans <= 0) { yield* say(g, 'gander', HOSTS.gander.noBeans[0]); return; }
  yield* say(g, 'gander', `You owe ${w.player.debt.toLocaleString('en-US')} beans, dear.`);
  const n = yield* numberPicker(g, { title: 'Pay how many?', max: Math.min(w.player.beans, w.player.debt), step: 100 });
  if (n <= 0) return;
  payDebt(g, n);
  g.sound('debtPaid');
  g.rumble(0.3, 120);
  if (w.player.debt === 0) {
    g.actorOf('gander').play('Honk', 0.1, { once: true });
    yield* say(g, 'gander', w.player.homeTier >= 4 ? HOSTS.gander.compliment : hostLine(g, 'gander', 'cleared'));
    if (w.player.homeTier >= 4 && !w.home.deedGold) { w.home.deedGold = true; g.events.emit('deed', {}); }
  } else yield* say(g, 'gander', hostLine(g, 'gander', 'pay'));
}
function* tierFlow(g) {
  const w = g.world;
  const cost = nextTierCost(w);
  const names = { 2: 'a proper cottage', 3: 'a cottage with an annex', 4: 'two whole storeys, and a plaque' };
  const c = yield* ask(g, 'gander', `Your paid-off shack does look a little small, dear. I've got you down for ${names[w.player.homeTier + 1]}. ${cost.toLocaleString('en-US')} beans. Sign here.`, ['Sign', 'Not yet']);
  if (c !== 0) return;
  upgradeHome(g);
  g.sound('debtPaid');
  yield* say(g, 'gander', "It'll be up by the time you've walked back. Don't ask. I own some very fast people, dear.");
}
function* paintFlow(g) {
  const w = g.world;
  const colors = ['orange', 'sand', 'white', 'sky', 'lime', 'plum', 'teal', 'red'];
  const c = yield* menuChoice(g, 'Paint job: 1,000 beans', ['Walls', 'Roof', 'Never mind'], { id: 'paint' });
  if (c < 0 || c === 2) return;
  const names = colors.map((x) => x[0].toUpperCase() + x.slice(1));
  const k = yield* menuChoice(g, c === 0 ? 'Wall colour' : 'Roof colour', names, { id: 'paintColour' });
  if (k < 0) return;
  if (w.player.beans < 1000) { yield* say(g, 'gander', HOSTS.gander.noBeans[0]); return; }
  spend(g, 1000);
  if (c === 0) w.home.wallColor = colors[k]; else w.home.roofColor = colors[k];
  g.town.refreshHome();
  g.sound('bean');
  g.events.emit('painted', {});
  yield* say(g, 'gander', 'Noted, dear. It will look exactly the way you think it will.');
}
function* appraise(g, i) {
  const w = g.world;
  const s = new Stream(`${w.seed}:appraise:${w.flags.appraised ?? 0}`);
  w.flags.appraised = (w.flags.appraised ?? 0) + 1;
  const missing = FOSSILS.filter((f) => !w.museum.fossil[f.id] && !w.player.pockets.some((p) => p?.id === f.id));
  const pool = missing.length ? missing : FOSSILS;
  const f = s.pick(pool);
  yield* say(g, 'quill', `${hostLine(g, 'quill', 'fossil')}a ${f.name}! ${f.line}`);
  w.player.pockets[i] = { id: f.id };
  w.almanac.fossil[f.id] = (w.almanac.fossil[f.id] ?? 0) + 1;
  g.events.emit('appraised', { id: f.id });
  g.sound('revealQuick');
}
function* donate(g) {
  const w = g.world;
  const i = yield* waitPick(g, { title: 'Donate what?', filter: (s) => { const it = ITEMS[s.id]; return (it?.cat === 'fish' && !it.noMuseum) || it?.cat === 'bug' || it?.cat === 'fossil' || it?.cat === 'art'; } });
  if (i < 0) return;
  const slot = w.player.pockets[i];
  const it = ITEMS[slot.id];
  if (it.forged) {
    yield* say(g, 'quill', HOSTS.quill.forged[w.flags.forgeShown ? 1 : 0]);
    w.flags.forgeShown = true;
    remember(g, 'forgery', {});
    g.events.emit('forgeryRefused', { id: slot.id });
    return;
  }
  const wing = it.cat === 'fossil' ? 'fossil' : it.cat;
  const m = w.museum[wing];
  if (m[slot.id]) { yield* say(g, 'quill', hostLine(g, 'quill', 'already')); return; }
  removeSlot(g, i);
  m[slot.id] = true;
  if (it.cat === 'art') w.almanac.art[slot.id] = true;
  g.actorOf('quill').play('QuillBall', 0.1, { once: false });
  g.sound('reveal');
  g.events.emit('donated', { id: slot.id, wing });
  yield* say(g, 'quill', hostLine(g, 'quill', 'donate'));
  g.actorOf('quill').play('Idle', 0.2);
  const total = { fish: FISH.length, bug: BUGS.length, fossil: FOSSILS.length, art: ART.length }[wing];
  if (Object.keys(m).length >= total && !w.museum.plaques[wing]) {
    w.museum.plaques[wing] = true;
    yield* say(g, 'quill', HOSTS.quill.wing[0]);
    g.events.emit('wingFull', { wing });
    sendMail(g, { from: 'museum', body: `Dear ${misspell(w.player.name)},\nThere's a plaque with your name on it. I've checked the spelling, and I've checked it again, and I've got it down as "${misspell(w.player.name)}".\nDr. Quill` });
  }
}
const misspell = (n) => (n.length < 3 ? `${n}${n}` : `${n.slice(0, -1)}${n[n.length - 1] === 'e' ? 'a' : 'e'}${n.length % 2 ? 'h' : ''}`);
export { placementScreen, hourNow, saveNow, addBeans, wear, menuChoice, waitPick };
