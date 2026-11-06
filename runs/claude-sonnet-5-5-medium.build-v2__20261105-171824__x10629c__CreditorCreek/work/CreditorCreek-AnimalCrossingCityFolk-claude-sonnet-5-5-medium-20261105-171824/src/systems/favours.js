// Favours: two a day, a "!" over the neighbour's head. Twelve templates, flavoured by type: fetch, catch, deliver, return, trade.
import { item } from '../data/items.js';
import { NEIGHBOURS } from '../data/neighbours.js';
import { seeded } from '../core/rng.js';
import { tuning } from '../data/tuning.js';
import { W, H } from '../ui/controls.js';
const FETCH = ['pear', 'shell', 'seedpack', 'mushroom', 'weed', 'paper', 'cheese', 'fruit_cherry'];
const FLAVOUR = { hearth: 'It is for the soup. Everything is for the soup.', sunshine: 'It will make someone so happy, isn\'t it?!', grouch: 'Do not make a thing of it.', diva: 'Naturally I would fetch it myself, darling dear, but I am *composed*.', gogetter: 'Protein, hydration, hustle. Let\'s roll!', dreamer: 'The moon asked. Politely.', schemer: 'It is for a thing. You didn\'t hear it from me.', auntie: 'It is for a knitting emergency, hon.', hustler: 'I will pay. Eventually. No refunds.' };
export const TEMPLATES = [
  { k: 'fetch', t: (n, it) => `Could you bring me a ${item(it).name}? ${FLAVOUR[n.type]}` }, { k: 'fetch', t: (n, it) => `I'm out of ${item(it).name}s. Tragic. Do you have one?` }, { k: 'fetch', t: (n, it) => `A ${item(it).name}, if you've got one. I'd be in your debt. (Everyone is.)` },
  { k: 'catch', t: (n) => `Catch me a fish within the hour. Any fish. A famous one if possible.`, what: 'fish' }, { k: 'catch', t: (n) => `A bug! Any bug! Bring it to me alive in spirit.`, what: 'bug' }, { k: 'catch', t: (n) => `I'd love to see you catch something. Fish or bug. Surprise me.`, what: 'any' },
  { k: 'deliver', t: (n, it, to) => `Please take this parcel to ${to.name}. Don't open it. Don't shake it. Definitely don't ask.` }, { k: 'deliver', t: (n, it, to) => `Could you pass this note to ${to.name}? It is a note. It is also a parcel.` },
  { k: 'return', t: (n, it) => `I found a ${item(it).name} by the river. Could you return it to its owner? It is mine. I don't recognise it, so, someone's.` }, { k: 'return', t: (n, it) => `Take this ${item(it).name} back to the Lost & Found? I can't be near it. It has a look.` },
  { k: 'trade', t: (n, it, to, give) => `Swap you: your ${item(give).name} for my ${item(it).name}. A fair trade. By my standards.` }, { k: 'trade', t: (n, it, to, give) => `I want your ${item(give).name}. I'll trade a ${item(it).name}. Don't think about it too hard.` },
];
export const favours = {
  get(g, id) { return (g.world.favours ?? []).find(f => f.who === id && !f.done); },
  daily(g) {
    const w = g.world; const r = seeded('favours', w.seed, w.year, w.day); w.favours = (w.favours ?? []).filter(f => !f.done && f.day >= w.day - 1);
    const pool = NEIGHBOURS.filter(n => !w.movedOut[n.id] && !(n.id === 'fitch' && w.day < 9)); for (let i = 0; i < 2; i++) { const n = pool[r.int(0, pool.length - 1)]; if (w.favours.find(f => f.who === n.id)) continue; const tpl = TEMPLATES[r.int(0, TEMPLATES.length - 1)]; const it = FETCH[r.int(0, FETCH.length - 1)]; const to = pool.filter(p => p.id !== n.id)[r.int(0, pool.length - 2)]; const give = ['pear', 'shell', 'seedpack'][r.int(0, 2)]; w.favours.push({ who: n.id, k: tpl.k, tpl: TEMPLATES.indexOf(tpl), item: tpl.k === 'deliver' ? 'parcel' : tpl.k === 'return' ? 'umbrella_lost' : it, to: to.id, give, what: tpl.what, day: w.day, accepted: false, done: false, caught: 0 }); }
  },
  touch() {},
  async onTalk(g, n) {
    const w = g.world; const f = this.get(g, n.id); if (!f) return false; const tpl = TEMPLATES[f.tpl]; const to = NEIGHBOURS.find(x => x.id === f.to) ?? n.def;
    const reward = Math.round((f.k === 'trade' ? 200 : 350) * tuning.favourMult); const friend = Math.round((5 + (f.k === 'deliver' ? 3 : 0)) * 1); const speaker = n;
    const finish = async (text) => { f.done = true; g.addBeans(reward); g.sys.friend.gain(g, n.id, friend); g.sfx('coin'); g.sys.memory.add(g, 'favour', { who: n.id }); await g.say(speaker, text + ` (+${reward} beans)`); return true; };
    if (!f.accepted) {
      const c = await g.ask(speaker, tpl.t(n.def, f.item, to, f.give), ['I will', 'Not now']); if (c !== 0) return true; f.accepted = true; f.since = w.min;
      if (f.k === 'deliver') { if (!g.give('beanbag')) { f.accepted = false; await g.say(speaker, 'Your pockets are full. A favour needs room.'); return true; } f.carry = 'beanbag'; w.flags.parcelFor = n.id; await g.say(speaker, `Take it to ${to.name}. They are around. Everyone is, eventually.`); }
      else if (f.k === 'return') { if (!g.give('seedpack')) { f.accepted = false; return true; } f.carry = 'seedpack'; await g.say(speaker, 'Take it to the Lost & Found at the Hall. Please. Quietly.'); }
      else if (f.k === 'trade') { await g.say(speaker, `Bring me a ${item(f.give).name} and I'll hand over my ${item(f.item).name}.`); }
      else await g.say(speaker, f.k === 'catch' ? 'The clock is ticking. Gently.' : 'Take your time. Not too much.');
      g.ui.toast(`Favour for ${n.name.split(' ')[0]} accepted`); return true;
    }
    if (f.k === 'fetch') { if (g.count(f.item) > 0) { g.take(f.item); return finish(['Oh, that is exactly it. Exactly.', 'You found it! I did not doubt you. I doubted *everything else*.'][Math.floor(g.rng() * 2)]); } await g.say(speaker, `Still waiting on that ${item(f.item).name}. No rush. Some rush.`); return true; }
    if (f.k === 'catch') { const cut = (w.min - f.since); const ok = w.memory.some(m => m.t === 'catch' && m.day === w.day && (f.what === 'any' || item(m.item).kind === f.what)); if (ok && cut <= 60) return finish('You caught one! In *time*, even. I am moved.'); if (cut > 60) { f.done = true; await g.say(speaker, 'The hour has passed. It was a good hour. It was not *your* hour. Next time.'); return true; } await g.say(speaker, `Still waiting for that ${f.what}. ${60 - cut} minutes remain, or so I imagine.`); return true; }
    if (f.k === 'trade') { if (g.count(f.give) > 0) { g.take(f.give); g.give(f.item); f.done = true; g.sfx('pickup'); g.sys.friend.gain(g, n.id, friend); await g.say(speaker, `A swap! Pleasure doing business. I think I won.`); return true; } await g.say(speaker, `No ${item(f.give).name} yet. I can wait. I have time. I have too much time.`); return true; }
    await g.say(speaker, f.k === 'deliver' ? `Did you take it to ${to.name}?` : 'Did you return it?'); return true;
  },
  /** Delivery and return hand-offs: talking to the addressee, or the Lost & Found. */
  async onTalkOther(g, n) {
    const w = g.world; const f = (w.favours ?? []).find(x => x.k === 'deliver' && x.accepted && !x.done && x.to === n.id && g.count('beanbag') > 0); if (!f) return false;
    g.take('beanbag'); f.done = true; const from = NEIGHBOURS.find(x => x.id === f.who); const reward = Math.round(350 * tuning.favourMult); g.addBeans(reward); g.sys.friend.gain(g, f.who, 8); g.sys.friend.gain(g, n.id, 3); g.sfx('coin'); await g.say(n, `A parcel from ${from.name}? ...It is soup. It is also a very small hat. Thank you. (+${reward} beans, from the sender's goodwill)`); return true;
  },
  drawMarkers(g, d) {
    const cam = g.ctx.camera.camera; for (const f of g.world.favours ?? []) { if (f.done) continue; const n = g.npcs.byId[f.who]; if (!n || n.sleeping || !n.actor.root.visible || g.place !== 'town') continue; const v = new (g.cam3 ??= cam.position.constructor)(n.pos.x, 2.4, n.pos.z).project(cam); const bx = (v.x + 1) / 2 * W, by = (1 - v.y) / 2 * H + (Math.floor(g.t * 3) % 2); d.rect(bx - 4, by - 6, 9, 11, f.accepted ? 'sky' : 'red'); d.text(bx, by - 5, f.accepted ? '?' : '!', 'white', { align: 'center' }); }
  },
};
