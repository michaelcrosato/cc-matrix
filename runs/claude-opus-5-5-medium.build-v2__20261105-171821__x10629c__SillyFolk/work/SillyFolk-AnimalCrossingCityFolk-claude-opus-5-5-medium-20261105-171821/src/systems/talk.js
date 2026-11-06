// Talking to neighbours: first-talk rules, memory lines, gifts, favours, letters.
import { G, bus } from '../state.js';
import { CAST, NEIGHBOURS, LOVES, HATES, nameOf, STAFF_ROOM } from '../data/cast.js';
import { TYPE_LINES, UNIQUE, GOSSIP, LETTER_REPLY } from '../data/lines.js';
import { Script, say, ask, Toasts, until, fill } from '../ui/dialogue.js';
import { NPC } from '../actors/npcs.js';
import { UI } from '../ui/kit.js';
import { pocketsScreen } from '../ui/screens.js';
import { ITEMS } from '../data/items.js';
import { T } from '../dev/tuning.js';
import { friendGain, remember, giveItem, takeItem, hasItem, info, earn, friendTier } from '../core/world.js';
import { hourOf } from '../core/calendar.js';
import { rngOf, fmt } from '../core/util.js';
const R = () => rngOf(`${G.world.seed}:${G.world.clock.day}:${G.world.clock.minute}:${G.time}`);
/** A line nobody's heard lately: each line is seen once before it repeats. */
export function pickLine(state, list, r, tagKey) { const seen = (state.lines[tagKey] ??= []); let pool = list.map((_, i) => i).filter((i) => !seen.includes(i)); if (!pool.length) { seen.length = 0; pool = list.map((_, i) => i); } const i = r.pick(pool); seen.push(i); return list[i]; }
/** Lines pulled from what you did. Returns text or null. */
export function memoryLine(id, r) {
  const w = G.world; const st = w.npcs[id]; const recent = w.memory.filter((m) => m.day >= w.clock.day - 3 && !st.memSeen[`${m.k}:${m.day}:${m.item ?? m.who ?? ''}`]);
  const usable = recent.filter((m) => MEMORY[m.k]); if (!usable.length) return null; const m = r.pick(usable); st.memSeen[`${m.k}:${m.day}:${m.item ?? m.who ?? ''}`] = 1; return MEMORY[m.k](m, id);
}
const MEMORY = {
  caught: (m) => `Heard you caught ${/^[AEIOU]/.test(m.item) ? 'an' : 'a'} ${m.item.toLowerCase()}. Everyone's heard. It's all it talks about.`,
  sold: (m) => `Saw you sold ${/^[AEIOU]/.test(m.item) ? 'an' : 'a'} ${m.item.toLowerCase()} to the goose. She looked pleased. It's chilling.`,
  soldGift: (m) => `Heard you sold the ${m.item.toLowerCase()} ${nameOf(m.who)} gave you. To the goose. ${nameOf(m.who)}'s not mad. ${m.who === 'yolanda' ? "She's knitting about it." : "They've gone very quiet about it."}`,
  gift: (m, id) => (m.who === id ? `I've still got that ${m.item.toLowerCase()} you gave me. Don't ask to see it.` : `${nameOf(m.who)} showed me the ${m.item.toLowerCase()} you gave them. Where's mine, then?`),
  bonk: (m, id) => (m.who === id ? 'You hit me with a net. I want you to know that I know.' : `Heard you got ${nameOf(m.who)} with a net. Good swing, was it?`),
  outfit: (m) => `New ${m.item.toLowerCase()}, is it? Brave. I'll say that. I'll say it behind your back as well.`,
  absent: (m) => `You went away for ${m.days} day${m.days > 1 ? 's' : ''}. ${['Dorrit owes me a pie now.', 'I lost a bet.', 'We held a very small funeral.'][m.days % 3]}`,
  stung: () => "What happened to your face? No, don't tell me. It was wasps. Everyone knows it was wasps.",
  felled: () => "Saw you cut down a tree. It had a family. I'm told. By a beetle.",
  fashion: (m) => `I hear Flavia gave you ${m.plumes} plume${m.plumes === 1 ? '' : 's'}. In the City! What's that, a lot?`,
  haircut: () => 'Had your hair done, have you? No, it suits you. It really suits someone.',
  forgery: () => 'Dr. Quill says you brought him a fake. He cried. He rolled away. He got stuck.',
  chime: () => 'You wrote that chime? …I hum it now. I hate that I hum it.',
  letter: (m, id) => (m.to === id ? `Got your letter. "${m.snip}". I've read it four times.` : `${nameOf(m.to)} got a letter from you. I didn't. It's fine.`),
  bought: (m) => `Bought ${/^[AEIOU]/.test(m.item) ? 'an' : 'a'} ${m.item.toLowerCase()}, I hear. Living well, on someone's money.`,
  balloon: (m) => `Heard you shot a balloon out of the sky. For ${m.item ? `${/^[AEIOU]/.test(m.item) ? 'an' : 'a'} ${m.item.toLowerCase()}` : 'a present'}. Is that legal?`,
};
function neighbourTalk(id) {
  const w = G.world, st = w.npcs[id], c = CAST[id], bank = TYPE_LINES[c.type], rt = NPC.rt[id], actor = NPC.actors[id];
  return (function* () {
    rt.talkTo = true; rt.pause = 1e9; G.player.state = 'free'; w.p.facing = Math.atan2(rt.x - w.p.x, rt.z - w.p.z);
    if (actor) { actor.talking = 0; }
    G.focusZoom = 2.0;
    const r = R(); const today = w.clock.day;
    const custom = G.storyTalk?.(id); if (custom) { yield* custom; }
    else {
      const first = st.lastTalk !== today;
      if (first) { st.lastTalk = today; friendGain(w, id, 3); w.stats.talked[id] = (w.stats.talked[id] ?? 0) + 1; bus.emit('talked', id); }
      let line = null;
      if (st.absent) { st.absent = false; line = r.pick(bank.absent); }
      if (!line && r.chance(first ? 0.45 : 0.3)) line = memoryLine(id, r);
      if (!line && r.chance(0.2)) line = pickLine(st, UNIQUE[id], r, 'unique');
      if (!line) { const wx = G.view.weatherKind, h = hourOf(w.clock), s = ['spring', 'summer', 'autumn', 'winter'][info(w).season]; const pools = [bank.greet, bank.greet]; if (wx === 'rain' || wx === 'storm') pools.push(bank.rain); if (wx === 'snow') pools.push(bank.snow); pools.push(h < 11 ? bank.morning : bank.greet); if (h >= 20 || h < 5) pools.push(bank.night); pools.push(bank[s]); if (r.chance(0.2)) pools.push(bank.hungry); const list = r.pick(pools); line = pickLine(st, list, r, 'b' + pools.indexOf(list)); }
      line = fill(line, { tic: c.tic, item: 'something' }); w.lastLine = line;
      yield say(id, line, { actor });
      // favours
      const fav = w.favours.find((f) => f.npc === id && f.state !== 'done');
      if (fav) yield* favourTalk(fav, id, bank, actor);
      let talking = true;
      while (talking) {
        const opts = ['Chat', 'Give something', 'Hear the gossip', 'Bye'];
        const pick = yield ask(id, friendTier(st.friend) === 'stranger' ? 'Was there something else?' : 'Anything else?', opts, { actor, cancel: 3 });
        if (pick === 0) { const l = r.chance(0.5) ? pickLine(st, UNIQUE[id], r, 'unique') : pickLine(st, bank.greet, r, 'chat'); w.lastLine = l; yield say(id, fill(l, { tic: c.tic }), { actor }); friendGain(w, id, 1); }
        else if (pick === 1) { yield* giveFlow(id, actor); }
        else if (pick === 2) { const names = NEIGHBOURS.filter((n) => n !== id && w.npcs[n].moved !== 'notyet' && w.npcs[n].moved !== 'gone'); const g = fill(pickLine(st, GOSSIP, r, 'gossip'), { n1: nameOf(r.pick(names)), n2: nameOf(r.pick(names)) }); yield say(id, g, { actor }); }
        else talking = false;
      }
    }
    rt.talkTo = false; rt.pause = 0; rt.wait = 2; G.focusZoom = null;
  })();
}
function* favourTalk(fav, id, bank, actor) {
  const w = G.world; const nm = fav.item ? ITEMS[fav.item]?.name : null; const r = R();
  if (fav.state === 'open') {
    let text;
    if (fav.kind === 'deliver') text = `Could you take this parcel to ${nameOf(fav.other)}? I'd do it myself, but they might talk to me.`;
    else if (fav.kind === 'lost') text = `I've lost something. It's around here. It'll be near a tree. It's always near a tree. Will you look? It's on the plaza, by the board.`;
    else if (fav.kind === 'catch') text = `I need ${nm === undefined ? 'one' : /^[AEIOU]/.test(nm) ? 'an' : 'a'} ${nm} in the next hour. Don't ask. Fresh, within the hour.`;
    else if (fav.kind === 'trade') text = `Have you got ${/^[AEIOU]/.test(nm) ? 'an' : 'a'} ${nm}? I'll swap you for my ${ITEMS[fav.give].name}. Fair's fair.`;
    else text = fill(r.pick(bank.favour), { item: `${/^[AEIOU]/.test(nm) ? 'an' : 'a'} ${nm}`, tic: CAST[id].tic });
    const p = yield ask(id, text, ['All right', 'Not now'], { actor, cancel: 1 });
    if (p === 0) { fav.state = 'accepted'; fav.deadline = w.clock.day * 1440 + w.clock.minute + (fav.hours ?? 0) * 60; if (fav.kind === 'deliver') { if (!giveItem(w, { id: 'parcel', to: fav.other })) { fav.state = 'open'; yield say(id, "Your pockets are full. How do you live like that?", { actor }); } } if (fav.kind === 'lost') { const ent = G.placeLost?.(fav); } bus.emit('favourTaken', fav); }
    return;
  }
  // accepted
  if (fav.kind === 'catch' && w.clock.day * 1440 + w.clock.minute > fav.deadline) { fav.state = 'done'; yield say(id, 'Too late. It had to be within the hour. I have made other arrangements. They went badly.', { actor }); return; }
  let ok = false;
  if (fav.kind === 'fetch' || fav.kind === 'catch') { const i = hasItem(w, fav.item); if (i >= 0) { w.p.pockets[i] = null; ok = true; } }
  if (fav.kind === 'trade') { const i = hasItem(w, fav.item); if (i >= 0) { w.p.pockets[i] = { id: fav.give }; ok = true; } }
  if (fav.kind === 'lost') { const i = hasItem(w, 'lostthing'); if (i >= 0) { w.p.pockets[i] = null; ok = true; } }
  if (fav.kind === 'deliver') return;
  if (ok) { fav.state = 'done'; friendGain(w, id, 8); earn(w, fav.reward); w.stats.favours = (w.stats.favours ?? 0) + 1; bus.emit('favourDone', fav); yield say(id, fill(r.pick(bank.thanks), { tic: CAST[id].tic }) + ` (${fmt(fav.reward)} beans)`, { actor }); }
  else yield say(id, 'Well? Did you bring it? …No. Off you go, then.', { actor });
}
/** Deliver a parcel if you carry one for this person. */
function* deliverCheck(id, actor) {
  const w = G.world; const i = w.p.pockets.findIndex((e) => e?.id === 'parcel' && e.to === id);
  if (i < 0) return false; w.p.pockets[i] = null; const fav = w.favours.find((f) => f.kind === 'deliver' && f.other === id && f.state === 'accepted'); friendGain(w, id, 4); if (fav) { fav.state = 'done'; friendGain(w, fav.npc, 8); earn(w, fav.reward); w.stats.favours = (w.stats.favours ?? 0) + 1; bus.emit('favourDone', fav); } yield say(id, `A parcel? From ${fav ? nameOf(fav.npc) : 'someone'}? I'll open it when you've gone. There's a tip in it for you. (${fmt(fav?.reward ?? 0)} beans)`, { actor }); return true;
}
function* giveFlow(id, actor) {
  const w = G.world, st = w.npcs[id], bank = TYPE_LINES[CAST[id].type]; let chosen = null; const s = pocketsScreen({ title: `Give to ${nameOf(id)}`, pickLabel: 'Give', onPick: (e, idx, scr) => { chosen = { e, idx }; UI.pop(scr); }, onClose: () => { chosen = chosen ?? false; } }); UI.push(s);
  yield until(() => chosen !== null); if (!chosen) return;
  const { e, idx } = chosen; const it = ITEMS[e.id]; if (it.noSell) { yield say(id, "That's not yours to give. I've checked.", { actor }); return; }
  w.p.pockets[idx] = null; const tags = [it.cat, ...(it.tags ?? [])]; const love = (LOVES[id] ?? []).some((t) => tags.includes(t)), hate = (HATES[id] ?? []).some((t) => tags.includes(t)); const r = R();
  const amt = love ? 10 : hate ? 2 : 5; friendGain(w, id, amt); w.stats.gifts++; remember(w, 'gift', { who: id, item: it.name }); bus.emit('gift', id, e); st.gifts = (st.gifts ?? 0) + 1;
  const line = fill(r.pick(love ? bank.love : hate ? bank.hate.length ? bank.hate : bank.meh : bank.meh), { tic: CAST[id].tic }); w.lastLine = line; const a = NPC.actors[id]; a.play(love ? 'Love' : hate ? 'ShakeHead' : 'Nod', { then: 'Idle', restart: true }); yield say(id, line, { actor });
  if (love && st.friend >= 40 && r.chance(0.5)) { const gift = r.pick(['pear', 's_mist', 'plant1', 'books', 'h_flower', 'c_lamp']); if (giveItem(w, { id: gift, from: id })) yield say(id, `Here. Have my ${ITEMS[gift].name}. I've no room. I've got room. Take it.`, { actor }); }
}
/** Host talk scripts are registered by services and the city. */
export const HOSTS_TALK = {};
G.talk = (id) => {
  if (HOSTS_TALK[id]) { const rt = NPC.rt[id]; G.player.state = 'free'; if (rt) { rt.talkTo = true; G.focusZoom = 2; } return Script.run((function* () { yield* HOSTS_TALK[id](NPC.actors[id]); if (rt) rt.talkTo = false; G.focusZoom = null; })()); }
  const w = G.world;
  if (w.p.pockets.some((e) => e?.id === 'parcel' && e.to === id)) { const rt = NPC.rt[id]; rt.talkTo = true; rt.pause = 1e9; return Script.run((function* () { yield* deliverCheck(id, NPC.actors[id]); rt.talkTo = false; rt.pause = 0; yield* []; })()); }
  return Script.run(neighbourTalk(id));
};
/** Letters: reply next day reacts to what you wrote. */
export function postLetter(toId, text, giftEntry) {
  const w = G.world; const lower = text.toLowerCase(); const st = w.npcs[toId]; const named = lower.includes(nameOf(toId).toLowerCase()); const c = CAST[toId];
  let body = named ? LETTER_REPLY.name : text.length < 12 ? fill(LETTER_REPLY.short, { snip: text }) : text.length > 60 ? LETTER_REPLY.long : LETTER_REPLY.none;
  if (giftEntry) body += ' ' + LETTER_REPLY.gift;
  const tic = c.tic ? ` ${c.tic}` : ''; w.mailQueue.push({ from: toId, subject: `Reply from ${c.name}`, body: `${w.name}. ${body}${tic}`, at: w.clock.day + 1, gift: st && st.friend >= 25 ? 'pear' : null, reply: true }); if (st) friendGain(w, toId, 3); w.stats.letters++; remember(w, 'letter', { to: toId, snip: text.slice(0, 18) }); bus.emit('letter', toId, text);
}
