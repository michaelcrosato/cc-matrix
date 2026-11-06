// Beans, debt, the store, the Bean Jar, selling, gifts.
import { item, ITEMS, FURNITURE, CLOTHES, WALLPAPER, FLOORS, MISC, TOOLS, STORE_STOCK_FURN } from '../data/items.js';
import { tuning } from '../data/tuning.js';
import { ListScreen, PocketsScreen, confirmBox } from '../ui/screens.js';
import { seeded } from '../core/rng.js';
import { GANDER, GANDER_SELL } from '../data/dialogue.js';
import { NEIGHBOURS, HOSTS } from '../data/neighbours.js';
export const HOME_TIERS = [null, { name: 'Starter shack', add: 8000 }, { name: 'Proper cottage', add: 30000 }, { name: 'Cottage with annex', add: 80000 }, { name: 'Two storeys', add: 150000 }];
export const economy = {
  sellMult() { return tuning.sellMult; }, buyMult() { return tuning.buyMult; },
  price(it, g) { if (it.id === 'cheese' && this.g) return Math.round(this.g.sys.cheese.price(this.g) * this.sellMult()); return Math.round((it.price || 0) * this.sellMult()); },
  canSellHere(g) { return g.place === 'store' || g.place === 'mothwick'; },
  async sellItem(g, s) {
    this.g = g; const it = item(s.id); const v = this.price(it); const w = g.world; const gander = g.sys.venues.host('gander');
    const gift = w.memory.find(m => m.t === 'received' && m.item === s.id); if (!(await confirmBox(g, gander, `${GANDER_SELL[0].text} ${it.name}: ${v} beans?`, 'Sell', 'Keep'))) return;
    g.take(it.id); g.addBeans(v); w.shop.lifetime += v; g.sfx('cash'); g.ui.toast(`+${v} beans`); w.stats.sold++;
    if (gift) { g.sys.memory.add(g, 'sold', { item: s.id, gift: true, giver: gift.who }); } else g.sys.memory.add(g, 'sold', { item: s.id });
    if (it.kind === 'weed') g.errandProgress?.('sellweed');
  },
  async sellMenu(g) {
    const gander = g.sys.venues.host('gander'); await g.say(gander, "Let's see what's in those pockets, dear.");
    await new Promise(res => { const ps = new PocketsScreen({ title: 'Sell to Mrs. Gander', close: true }); g.ui.push(ps); const iv = setInterval(() => { if (!g.ui.stack.includes(ps)) { clearInterval(iv); res(); } }, 100); this._iv = iv; });
  },
  stock(g) {
    const w = g.world; const r = seeded('store', w.seed, w.year, w.day); const tier = this.tier(g);
    const pick = (list, n) => { const a = list.slice(); const out = []; while (out.length < n && a.length) out.push(a.splice(Math.floor(r() * a.length), 1)[0]); return out; };
    const furn = pick(STORE_STOCK_FURN, 2); const clothes = pick(CLOTHES.filter(c => !c.couture), 2); const wall = pick(WALLPAPER, 1); const floor = pick(FLOORS, 1);
    const tools = [item('net'), item('rod'), item('shovel'), item('can')]; if (w.day >= 2) tools.push(item('axe'), item('sling'));
    const misc = ['seedpack', 'sapling', 'paper', 'medicine'].map(id => item(id));
    const odd = pick([...FURNITURE.filter(f => f.set === 'Cheese')], tier >= 1 ? 1 : 0);
    return { goods: [...furn, ...clothes, ...wall, ...floor, ...odd, ...misc], tools: tools.filter(t => !w.tools.includes(t.id)) };
  },
  tier(g) { return g.world.shop.lifetime >= 120000 ? 2 : g.world.shop.lifetime >= 25000 ? 1 : 0; },
  async buy(g, it) {
    const w = g.world; const gander = g.sys.venues.host('gander'); const price = Math.round((it.price || 100) * this.buyMult());
    if (it.kind === 'tool') { if (w.tools.includes(it.id)) { await g.say(gander, 'You already have one, dear. Two would be gluttony. Billed gluttony.'); return false; } const toolPrice = Math.round(({ net: 400, rod: 500, shovel: 600, can: 450, axe: 800, sling: 700 }[it.id] ?? 500) * this.buyMult()); if (w.beans < toolPrice) { await g.say(gander, `That's ${toolPrice} beans, dear. You have some. Not that many.`); return false; } g.addBeans(-toolPrice); g.give(it.id); g.sfx('cash'); await g.say(gander, `${it.name}. ${toolPrice} beans. Use it generously, and never within earshot of my pond.`); return true; }
    if (!(await confirmBox(g, gander, `${it.name}, ${price} beans. Shall I add it to your life?`, 'Buy', 'Not today'))) return false;
    if (w.beans < price) { await g.say(gander, "You're short, dear. I could lend you the beans. At interest. I could lend you the *interest*."); return false; }
    if (!g.give(it.id)) { await g.say(gander, 'Your pockets are full. Drop something. Preferably money, in my direction.'); return false; }
    g.addBeans(-price); w.shop.lifetime += price; g.sfx('cash'); g.ui.toast(`Bought ${it.name}`); if (it.kind === 'furniture' || it.kind === 'clothes') w.owned[it.id] = true; return true;
  },
  async payDebt(g) {
    const w = g.world; const gander = g.sys.venues.host('gander'); w.flags.debtKnown = true;
    if (w.debt <= 0) { await g.say(gander, 'You owe me nothing, dear. It is deeply unsettling for both of us.'); return this.offerUpgrade(g); }
    const choices = [`Pay 1,000 (owe ${w.debt})`, 'Pay everything I can', 'Not today'];
    const c = await g.ask(gander, `You owe ${w.debt} beans, dear. No rush. I simply note the time you didn't pay.`, choices);
    if (c === 2) return; let amt = c === 0 ? Math.min(1000, w.debt) : Math.min(w.beans, w.debt); if (amt > w.beans) { await g.say(gander, 'Beans must exist before they can be paid. It is a quirk of the economy.'); return; } if (amt <= 0) return;
    g.addBeans(-amt); w.debt -= amt; w.debtPaid += amt; g.sfx('cash'); g.errandProgress?.('pay'); await g.say(gander, w.debt > 0 ? `Received ${amt}. ${w.debt} to go. I have written it down in two places.` : 'Paid in full. ... |HONK. Pardon me. That was an emotion.');
    if (w.debt <= 0) await this.offerUpgrade(g);
  },
  async offerUpgrade(g) {
    const w = g.world; const gander = g.sys.venues.host('gander'); if (w.homeTier >= 4) { if (!w.flags.deed) { w.flags.deed = true; await g.say(gander, "You've cleared the lot, dear. A gold-edged deed. I would say well done, but I would regret it. |...Well done. There. Regretted.", { }); g.give('trophy_derby'); } return; }
    const next = HOME_TIERS[w.homeTier + 1]; const add = Math.round(next.add * tuning.debtMult); if (!(await confirmBox(g, gander, `Shall I upgrade you to a ${next.name}? Add ${add} to your debt. An investment. Mine.`, 'Upgrade', 'Not yet'))) return;
    w.homeTier++; w.debt += add; g.syncHome?.(); await g.say(gander, `A ${next.name}. Congratulations. You now owe ${w.debt}. A new height.`); g.sys.venues.rebuildHome?.(g);
  },
  async bank(g) {
    const w = g.world; const clem = g.sys.venues.host('clementine'); const c = await g.ask(clem, `The Bean Jar holds ${w.bank} beans. We are very interested. (0.5% a season.)`, ['Deposit 1,000', 'Withdraw 1,000', 'Deposit all', 'Never mind']);
    if (c === 0 && w.beans >= 1000) { w.beans -= 1000; w.bank += 1000; g.sfx('coin'); } else if (c === 1 && w.bank >= 1000) { w.bank -= 1000; w.beans += 1000; g.sfx('coin'); } else if (c === 2 && w.beans > 0) { w.bank += w.beans; w.beans = 0; g.sfx('coin'); } else if (c < 3) await g.say(clem, 'The jar and I have conferred. Not enough. Not enough *there*.');
  },
  daily(g) { const w = g.world; if (g.season !== this.lastSeason) { if (this.lastSeason != null) w.bank = Math.round(w.bank * 1.005); this.lastSeason = g.season; } },
};
export const gifts = {
  async give(g, n) {
    const w = g.world; const ui = g.ui; const s = await new Promise(res => ui.push(new PocketsScreen({ title: `A gift for ${n.name}`, pick: res })));
    if (!s) return; const it = item(s.id); g.take(it.id); const d = n.def; const loves = d.loves?.includes(it.id) || d.loves?.includes(it.kind), hates = d.hates?.includes(it.id);
    const gain = hates ? 1 : loves ? 10 : (it.price > 500 ? 6 : 3); g.sys.friend.gain(g, d.id, gain); g.sys.memory.add(g, 'gift', { who: d.id, item: it.id }); w.memory.push({ t: 'received', item: it.id, who: d.id, day: w.day }); g.sfx('pickup'); n.actor.play('Love', { once: true, restart: true });
    await g.say(n, hates ? `${it.name}? ...That's a choice. A choice I'll be thinking about. ${d.tic}` : loves ? `A ${it.name}! It's EXACTLY what I wanted. You can't know how much. ${d.tic}` : `A ${it.name}. How thoughtful. I'll find a shelf for it. ${d.tic}`);
    g.errandProgress?.('gift', it);
  },
};
