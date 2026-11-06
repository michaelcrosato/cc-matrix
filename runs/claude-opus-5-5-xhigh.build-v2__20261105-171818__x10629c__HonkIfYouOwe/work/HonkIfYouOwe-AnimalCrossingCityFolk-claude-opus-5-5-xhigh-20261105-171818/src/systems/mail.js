// Letters arrive at 09:00. Neighbours, Gran, the museum, the Bureau, catalogue orders, Ozzie's tips.
import { TYPE_LINES } from '../data/dialogue/types.js';
import { HOSTS } from '../data/dialogue/hosts.js';
import { NEIGHBOURS, NEIGHBOUR_ORDER } from '../data/neighbours.js';
import { Stream, dayStream } from '../core/rng.js';
import { resolveTags, nextFrom } from './lines.js';
import { ITEMS } from '../data/items.js';
import { FURNITURE } from '../data/furniture.js';

export function sendMail(g, { from, body, gift = null, arriveDay = null, subject = '', stamp = '' }) {
  const w = g.world;
  w.mail.pending.push({ from, body, gift, arriveDay: arriveDay ?? w.clock.day + 1, subject, stamp });
  g.events.emit('mailSent', { from });
}
/** Move due letters into the box. Returns how many. */
export function deliverMail(g, force = false) {
  const w = g.world;
  const due = w.mail.pending.filter((m) => m.arriveDay <= w.clock.day || force);
  w.mail.pending = w.mail.pending.filter((m) => !due.includes(m));
  for (const m of due) w.mail.inbox.push({ ...m, read: false, day: w.clock.day });
  while (w.mail.inbox.length > 30) w.mail.inbox.shift();
  if (due.length) g.events.emit('mail', { n: due.length });
  return due.length;
}
const fruits = ['fig', 'persimmon', 'lime', 'quince'];
const GRAN_ODD = [null, 'stationery', 'bearToy', 'driftSpoon'];
/** Gran's passive-aggressive note each season, with a foreign fruit or something inexplicable. */
export function seasonalGranLetter(g, c) {
  const w = g.world;
  const k = `gran:${w.clock.year}:${c.season}`;
  if (w.flags[k]) return;
  w.flags[k] = true;
  sendMail(g, { from: 'gran', body: HOSTS.gran.letters[c.season], gift: c.season === 1 ? (GRAN_ODD[1]) : fruits[c.season], arriveDay: w.clock.day });
}
/** Neighbours write, per friendship. An occasional anonymous tip from Ozzie. */
export function neighbourLetters(g, c) {
  const w = g.world;
  const rng = dayStream(w, 'letters');
  for (const id of NEIGHBOUR_ORDER) {
    const s = w.npcs[id];
    if (s.moved !== 'here') continue;
    const chance = s.friend >= 40 ? 0.22 : s.friend >= 15 ? 0.1 : 0.03;
    if (!rng.chance(chance)) continue;
    const t = NEIGHBOURS[id].type;
    const body = nextFrom(w, id, 'letter', TYPE_LINES[t].letter);
    const handmade = { yolanda: 'scarfGift', nib: 'poemGift', dorrit: 'soupGift', ozzie: 'stringGift', tavi: 'smileGift' }[id];
    const gift = s.friend >= 15 ? (handmade && rng.chance(0.5) ? handmade : rng.pick(['pear', 'shellScallop', 'seedRose', 'seedTulip', 'mushroom', 'pottedPlant'])) : null;
    sendMail(g, { from: id, body, gift: gift ? { id: gift, from: id } : null, arriveDay: w.clock.day });
  }
}
/** Replies next day react to what you wrote: their name present, length, gift. */
export function replyTo(g, toId, text, giftId) {
  const w = g.world;
  const name = NEIGHBOURS[toId]?.short ?? NEIGHBOURS[toId]?.name ?? '';
  const lower = text.toLowerCase();
  const gibberish = /^[a-z]{3,8}$/i.test(text.trim()) && !/[aeiou]{1}[a-z]*[aeiou]/i.test(text);
  let body;
  if (toId === 'gran') {
    const R = HOSTS.gran.replies;
    body = gibberish ? R.gibberish : text.length < 12 ? R.short : text.length > 90 ? R.long : R.mid;
    body = body.replace('{text}', text.trim());
    sendMail(g, { from: 'gran', body, gift: giftId ? null : fruits[(w.clock.day + w.seed) % 4], arriveDay: w.clock.day + 1 });
    w.flags.lettersToGran = (w.flags.lettersToGran ?? 0) + 1;
    return;
  }
  const n = NEIGHBOURS[toId];
  if (gibberish) body = `You wrote "${text.trim()}". I framed it.\n${name}`;
  else if (lower.includes(name.toLowerCase())) body = `You put my name in your letter. Nobody's done that but the goose, and hers came with a figure.\n${name}, ${n.tic}`;
  else if (text.length < 12) body = `That's a short letter. I read it twice. It took no time. I'm still thinking about it.\n${name}, ${n.tic}`;
  else if (text.length > 90) body = `That's a lot of writing. I've got to the end, and I've got some questions, and I won't be asking them.\n${name}, ${n.tic}`;
  else body = `Got your letter. Thanks for that. It's on the shelf where I can see it.\n${name}, ${n.tic}`;
  if (giftId) body += `\nP.S. The ${ITEMS[giftId]?.name ?? 'present'}. Yes. I noticed.`;
  w.npcs[toId].friend = Math.min(100, w.npcs[toId].friend + 3);
  sendMail(g, { from: toId, body, arriveDay: w.clock.day + 1 });
}
export const senderName = (from) => (from === 'gran' ? 'Gran' : from === 'bureau' ? 'Better Burrows Bureau' : from === 'museum' ? 'Dr. Quill' : from === 'clementine' ? 'Clementine' : from === 'gander' ? 'Mrs. Gander' : from === 'auction' ? "Pemberton's" : from === 'wish' ? 'A Passing Star' : from === 'snowman' ? 'A Snowman' : NEIGHBOURS[from]?.name ?? 'Anonymous');
export { resolveTags, FURNITURE, Stream };
