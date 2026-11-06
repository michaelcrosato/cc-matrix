// Neighbours remember: gifts, catches, sales, outfits, net bonks, absences. Lines pull from them.
import { item } from '../data/items.js';
import { NEIGHBOURS } from '../data/neighbours.js';
import { tuning } from '../data/tuning.js';
export const memory = {
  add(g, t, o = {}) { const w = g.world; w.memory.push({ t, day: w.day, year: w.year, ...o }); if (w.memory.length > 120) w.memory.shift(); },
  recent(g, t, who) { return [...g.world.memory].reverse().find(m => m.t === t && (!who || m.who === who || !m.who)); },
  line(g, n) {
    const d = n.def; const w = g.world; const M = (t) => this.recent(g, t, d.id) ?? this.recent(g, t);
    const opts = [];
    let m;
    if ((m = [...w.memory].reverse().find(x => x.t === 'sold' && x.gift && x.giver === d.id))) opts.push(`Heard you sold the ${item(m.item).name} I gave you. To the goose. I'm not mad. I'm ${d.type === 'auntie' ? 'knitting about it' : 'composing a sigh'}.`);
    if ((m = [...w.memory].reverse().find(x => x.t === 'sold' && x.gift && x.giver !== d.id))) opts.push(`I hear you sold a gift from ${NEIGHBOURS.find(x => x.id === m.giver)?.name ?? 'someone'}. Word travels, ${w.name}. It has legs.`);
    if ((m = M('catch'))) opts.push(`Somebody told me you caught a ${item(m.item).name}. ${item(m.item).line}`);
    if ((m = M('bonk'))) opts.push(m.who === d.id ? `You hit me with a net. I haven't forgotten. I've just filed it.` : `Word is you hit ${NEIGHBOURS.find(x => x.id === m.who)?.name ?? 'someone'} with a net. I'm keeping my head down.`);
    if ((m = M('outfit'))) opts.push(`Nice ${item(m.item).name}. I noticed it before you did.`);
    if (M('sting')) opts.push(`Your eyes look... festive. Wasps? I knew a wasp once. Not fondly.`);
    if (M('weedpull')) opts.push(`The weeds are down, ${w.name}. I'd tell you the town noticed, but the town is mostly me.`);
    if (M('donate')) opts.push(`The museum has a new thing from you. Dr. Quill called it a confident potato. It's a compliment.`);
    if ((m = M('gift')) && m.who === d.id) opts.push(`Thank you for the ${item(m.item).name}. I'm treating it as an apology I hadn't asked for.`);
    if (opts.length === 0) return null; return opts[Math.floor(g.rng() * opts.length)];
  },
  townTalk(g, n) {
    const w = g.world; const rate = g.sys.rating?.townScore?.(g) ?? { grade: 'C' };
    return `The town? It's ${w.townName}. It has a river, a goose, and ${w.debt > 0 ? `a debt of ${w.debt} beans, mostly yours` : 'no debt, which is eerie'}. Ask the Hall about the rating.`;
  },
};
export const friend = {
  gain(g, id, n) { const w = g.world; n = Math.round(n * tuning.friendMult) + (n > 0 && w.luck === w.day ? 1 : 0); w.friend[id] = Math.max(0, Math.min(100, (w.friend[id] ?? 0) + n)); },
  level(v) { return v >= 80 ? 'Best friend' : v >= 50 ? 'Friend' : v >= 15 ? 'Acquaintance' : 'Stranger'; },
};
