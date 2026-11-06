// Pemberton's: three lots, paddles, three AI bidders with hidden limits, a going-once clock.
import { panel, drawText, dim, inRect, bar, textBlock } from '../draw.js';
import { drawIcon } from '../../art/icons.js';
import { ITEMS } from '../../data/items.js';
import { Stream } from '../../core/rng.js';
import { addItem, hasRoom, spend } from '../../systems/economy.js';
import { hostLine } from '../../systems/lines.js';
import { FURNITURE } from '../../data/furniture.js';
import { CLOTHES } from '../../data/clothes.js';
import { ART } from '../../data/art.js';
import { remember } from '../../systems/memory.js';

const BIDDERS = ['the newt in the good hat', 'the weasel', 'a heron with a lot of opinions'];
export function auctionLots(w) {
  const s = new Stream(`${w.seed}:lots:${w.clock.day}`);
  const fur = s.shuffle(FURNITURE.filter((f) => !f.notForSale));
  const clo = s.shuffle(CLOTHES.filter((c) => !c.couture));
  const lots = [fur[0].id, clo[0].id, fur[1].id];
  if (s.chance(0.3)) lots[2] = s.pick(ART).id;
  return lots.map((id) => {
    const base = Math.round((ITEMS[id].price ?? 1000) * 0.5);
    const limits = BIDDERS.map(() => Math.round(base * s.range(1.1, 2.4)));
    return { id, start: base, limits };
  });
}
export function consignResult(w, id, sell) {
  const s = new Stream(`${w.seed}:consign:${w.clock.day}:${id}`);
  return { price: Math.round(sell * s.range(0.9, 2.6)), buyer: s.pick(BIDDERS) };
}
class Auction {
  constructor(g, onDone) {
    this.id = 'auction';
    this.onDone = onDone;
    this.lots = auctionLots(g.world);
    this.i = 0;
    this.setupLot(g);
    this.line = hostLine(g, 'pemberton', 'going');
  }
  setupLot(g) {
    const l = this.lots[this.i];
    this.bid = l.start;
    this.leader = 'nobody';
    this.mine = false;
    this.clock = 4.6;
    this.aiT = 1.2;
    this.state = 'open';
    this.step = Math.max(50, Math.round(l.start * 0.1 / 50) * 50);
    g.auction = { current: l };
  }
  labels() { return this.lots.map((l) => ITEMS[l.id].name); }
  focusIndex() { return this.i; }
  currentText() { return `${this.bid}:${this.leader}`; }
  raise(g) {
    const w = g.world;
    const next = this.bid + this.step;
    if (w.player.beans < next) { g.sound('uiError'); this.line = "You-don't-have-that-sit-down-please-next!"; return; }
    this.bid = next;
    this.leader = 'you';
    this.mine = true;
    this.clock = 3.8;
    this.aiT = 0.9;
    g.sound('paddle');
    g.player.play('Paddle', 0.05, { once: true });
    g.player.poseTimer = 0.4;
    g.events.emit('bidPlaced', { bid: this.bid });
    this.line = 'A new bid! From the small round one! Oh you\'re serious!';
  }
  update(g, inp, dt) {
    const m = inp.mouse;
    if (this.state === 'open') {
      if (inp.confirm || (m.click && inRect(m, 180, 196, 120, 24))) this.raise(g);
      this.clock -= dt;
      this.aiT -= dt;
      const l = this.lots[this.i];
      if (this.aiT <= 0) {
        this.aiT = 0.9 + ((this.bid * 13) % 9) / 10;
        const next = this.bid + this.step;
        const able = BIDDERS.map((b, k) => ({ b, limit: l.limits[k] })).filter((x) => x.limit >= next && x.b !== this.leader);
        if (able.length) {
          const who = able[(this.bid + this.i) % able.length];
          this.bid = next; this.leader = who.b; this.mine = false; this.clock = 3.8;
          g.sound('paddle', { volume: 0.5 });
          this.line = `${who.b[0].toUpperCase()}${who.b.slice(1)} bids!`;
        }
      }
      if (this.clock < 2.4 && this.clock > 2.4 - dt) this.line = 'Going once!';
      if (this.clock < 1.2 && this.clock > 1.2 - dt) this.line = 'Going twice!';
      if (this.clock <= 0) {
        this.state = 'hammer';
        this.t = 1.6;
        g.sound('gavel');
        g.rumble(0.5, 120);
        if (this.mine) {
          const lot = this.lots[this.i];
          spend(g, this.bid);
          if (hasRoom(g.world)) addItem(g, lot.id);
          else g.world.mail.pending.push({ from: 'auction', body: 'Your-pockets-were-full-so-we-posted-it-mind-how-you-go.\nPemberton', gift: lot.id, arriveDay: g.world.clock.day + 1 });
          g.world.player.catalog[lot.id] = true;
          g.world.stats.auctionWins = (g.world.stats.auctionWins ?? 0) + 1;
          remember(g, 'auction', { item: ITEMS[lot.id].name });
          g.events.emit('auctionWon', { id: lot.id, bid: this.bid });
          this.line = hostLine(g, 'pemberton', 'sold');
        } else {
          this.line = this.leader === 'nobody' ? 'No-takers-no-takers-it-goes-back-in-the-box!' : hostLine(g, 'pemberton', 'lost');
          g.events.emit('auctionLost', {});
        }
      }
    } else {
      this.t -= dt;
      if (this.t <= 0) {
        this.i++;
        if (this.i >= this.lots.length) { g.ui.pop(this); g.auction = null; this.onDone(); return; }
        this.setupLot(g);
        this.line = 'Next-lot-next-lot-next-lot!';
      }
    }
    if (inp.back || m.rclick) { g.sound('uiCancel'); g.auction = null; g.ui.pop(this); this.onDone(); }
  }
  prompts() { return this.state === 'open' ? [['confirm', `Raise paddle to ${(this.bid + this.step).toLocaleString('en-US')}`], ['back', 'Leave']] : null; }
  draw(g, hud) {
    const l = this.lots[this.i];
    const it = ITEMS[l.id];
    panel(hud, 30, 18, 160, 96, { fill: 'white', trim: 'sand' });
    drawText(hud, 110, 26, `Lot ${this.i + 1} of 3`, { align: 'center', color: 'slate' });
    drawIcon(hud, 86, 38, it.icon, it.iconColors, 3);
    drawText(hud, 110, 92, it.name.length > 22 ? `${it.name.slice(0, 22)}…` : it.name, { align: 'center', color: 'ink' });
    panel(hud, 290, 18, 160, 96, { fill: 'white', trim: 'sand' });
    drawText(hud, 370, 26, 'Bid', { align: 'center', color: 'slate' });
    drawText(hud, 370, 38, this.bid.toLocaleString('en-US'), { align: 'center', color: 'ink', scale: 2 });
    drawText(hud, 370, 62, this.mine ? 'That\'s you!' : this.leader === 'nobody' ? 'Nobody yet' : this.leader.slice(0, 26), { align: 'center', color: this.mine ? 'green' : 'plum' });
    bar(hud, 306, 80, 128, 8, Math.max(0, this.clock) / 4.6, this.clock < 1.2 ? 'red' : 'orange');
    drawText(hud, 370, 94, `You have ${g.world.player.beans.toLocaleString('en-US')}`, { align: 'center', color: 'slate' });
    panel(hud, 60, 150, 360, 34, { fill: 'white', trim: 'sky' });
    textBlock(hud, 70, 156, 340, this.line, { color: 'ink' });
    if (this.state === 'open') { panel(hud, 180, 196, 120, 24, { fill: 'sand', trim: 'orange' }); drawText(hud, 240, 204, 'Paddle up!', { align: 'center', color: 'ink' }); }
  }
}
export const auctionScreen = (g, onDone) => new Auction(g, onDone);
export { dim };
