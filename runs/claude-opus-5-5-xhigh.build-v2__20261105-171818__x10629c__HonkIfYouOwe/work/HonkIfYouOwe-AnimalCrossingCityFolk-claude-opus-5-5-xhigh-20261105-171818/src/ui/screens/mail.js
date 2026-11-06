// The mailbox: a stack of letters on a sheet of paper, big type.
import { panel, drawText, dim, inRect } from '../draw.js';
import { drawPaper } from './letter.js';
import { resolveTags } from '../../systems/lines.js';
import { senderName } from '../../systems/mail.js';
import { ITEMS } from '../../data/items.js';
import { addItem, hasRoom, addBeans } from '../../systems/economy.js';
import { Menu } from '../ui.js';

class Reader {
  constructor(letter, onDone) { this.id = 'letterRead'; this.letter = letter; this.onDone = onDone; }
  currentText() { return this.letter.body; }
  open(g) { g.sound('paper'); if (!this.letter.read) { this.letter.read = true; g.events.emit('letterRead', { from: this.letter.from }); } }
  update(g, inp) {
    if (inp.confirm || inp.back || inp.mouse.click || inp.mouse.rclick) {
      g.ui.pop(this);
      const l = this.letter;
      if (l.gift && !l.taken) {
        const id = typeof l.gift === 'string' ? l.gift : l.gift.id;
        if (typeof l.gift === 'object' && l.gift.beans) { addBeans(g, l.gift.beans, 'mail'); g.sound('beanLots'); l.taken = true; g.ui.toastMsg(`+${l.gift.beans.toLocaleString('en-US')} beans`); }
        else if (hasRoom(g.world)) { addItem(g, id, typeof l.gift === 'object' && l.gift.from ? { from: l.gift.from } : null); l.taken = true; g.sound('pickUp'); g.ui.toastMsg(`You take the ${ITEMS[id]?.name ?? 'present'}.`); g.events.emit('giftOpened', { id, from: l.from }); }
        else g.ui.toastMsg('Your pockets are full. It stays in the letter.');
      }
      this.onDone?.();
    }
  }
  prompts() { return [['confirm', 'Fold it up']]; }
  draw(g, hud) {
    dim(hud);
    const l = this.letter;
    const body = resolveTags(l.body, g);
    const parts = body.split('\n');
    const sign = parts.length > 1 ? parts[parts.length - 1] : '';
    const text = parts.slice(0, parts.length > 1 ? -1 : undefined).join(' ');
    const gift = l.gift && !l.taken ? (typeof l.gift === 'object' && l.gift.beans ? `Enclosed: ${l.gift.beans.toLocaleString('en-US')} beans` : `Enclosed: ${ITEMS[typeof l.gift === 'string' ? l.gift : l.gift.id]?.name ?? 'something'}`) : '';
    drawPaper(hud, `From ${senderName(l.from)}`, text, sign, gift);
  }
}
export function mailScreen(g, onClose) {
  const w = g.world;
  const close = (gg, m) => { gg.ui.pop(m); onClose?.(); };
  const rebuild = () => w.mail.inbox.slice(-8).reverse().map((l) => ({
    label: () => `${l.read ? '' : '* '}${senderName(l.from)}`,
    icon: 'letter', iconColors: { o: 'red', x: 'mist', w: 'white' },
    action: (gg) => { gg.ui.push(new Reader(l)); },
  }));
  const items = rebuild();
  if (!items.length) items.push({ label: 'Nothing. Not even a bill. Enjoy it.', action: close });
  return new Menu({ id: 'mailbox', title: 'The mailbox', items, x: 120, y: 60, w: 240, itemH: 20, back: close, prompts: [['confirm', 'Read'], ['back', 'Close']] });
}
export { panel, drawText, inRect };
