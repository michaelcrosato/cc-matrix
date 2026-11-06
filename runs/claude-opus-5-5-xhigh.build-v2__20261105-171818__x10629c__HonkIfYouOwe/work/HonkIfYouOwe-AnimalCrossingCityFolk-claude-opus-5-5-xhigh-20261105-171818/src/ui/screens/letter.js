// Letters: choose who, write on a sheet of paper with big type, attach a gift.
import { panel, drawText, inRect, dim, textBlock, wrap } from '../draw.js';
import { keyboardFlow } from './keyboard.js';
import { menuChoiceFree } from './numbers.js';
import { NEIGHBOURS, NEIGHBOUR_ORDER } from '../../data/neighbours.js';
import { ITEMS } from '../../data/items.js';
import { removeSlot } from '../../systems/economy.js';
import { pocketsPicker } from './pockets.js';
import { replyTo } from '../../systems/mail.js';
import { completeErrand } from '../../systems/dayone.js';
import { say } from '../../systems/say.js';
import { remember } from '../../systems/memory.js';
import { hostLine } from '../../systems/lines.js';

export function* letterFlow(g) {
  const w = g.world;
  const others = NEIGHBOUR_ORDER.filter((n) => w.npcs[n].moved === 'here');
  const labels = ['Gran', ...others.map((n) => NEIGHBOURS[n].name), 'Never mind'];
  const list = ['gran', ...others];
  const c = yield* menuChoiceFree(g, 'Write to whom?', labels, { id: 'letterTo' });
  if (c < 0 || c >= list.length) return;
  const to = list[c];
  const text = yield* keyboardFlow(g, { title: `Dear ${labels[c]},`, max: 120, hint: 'Say whatever you like. Clementine will read it, and so will the bee.', random: ['Everything is fine.', 'I owe a goose.', 'It rained. Then it stopped.', 'Send fruit.'], canCancel: true });
  if (!text) return;
  // Gift?
  let gift = null;
  const a = yield* menuChoiceFree(g, 'Attach a gift?', ['Yes', 'No']);
  if (a === 0) {
    let picked = -2;
    g.ui.push(pocketsPicker(g, { title: 'Attach what?', filter: (s) => ITEMS[s.id]?.cat !== 'tool' && ITEMS[s.id]?.cat !== 'quest', onPick: (i) => { picked = i; }, onCancel: () => { picked = -1; } }));
    while (picked === -2) yield;
    if (picked >= 0) { gift = removeSlot(g, picked).id; }
  }
  let closed = false;
  g.ui.push(new PaperScreen(labels[c], text, gift, () => { closed = true; }));
  while (!closed) yield;
  g.sound('stamp');
  replyTo(g, to, text, gift);
  w.mail.sentToday += 1;
  w.stats.lettersSent = (w.stats.lettersSent ?? 0) + 1;
  remember(g, 'letter', { about: to === 'gran' ? null : to });
  g.events.emit('letterSent', { to, text, gift });
  if (w.story.day1Active && to === 'gran') completeErrand(g, 'letter');
  if (g.place?.id === 'hall') yield* say(g, 'clementine', hostLine(g, 'clementine', 'post'));
}
class PaperScreen {
  constructor(name, text, gift, onDone) { this.id = 'paper'; this.name = name; this.text = text; this.gift = gift; this.onDone = onDone; }
  currentText() { return this.text; }
  update(g, inp) { if (inp.confirm || inp.back || inp.mouse.click) { g.ui.pop(this); this.onDone(); } }
  prompts() { return [['confirm', 'Post it']]; }
  draw(g, hud) {
    dim(hud);
    drawPaper(hud, `Dear ${this.name},`, this.text, g.world.player.name, this.gift ? `Enclosed: ${ITEMS[this.gift]?.name}` : '');
  }
}
export function drawPaper(hud, head, body, sign, foot) {
  panel(hud, 70, 22, 340, 214, { fill: 'white', trim: 'sand' });
  for (let y = 58; y < 200; y += 14) hud.rect(84, y, 312, 1, 'mist');
  drawText(hud, 88, 34, head, { color: 'ink', scale: 1 });
  const lines = wrap(body, 300);
  lines.slice(0, 11).forEach((l, i) => drawText(hud, 88, 50 + i * 14, l, { color: 'ink' }));
  if (sign) drawText(hud, 392, 206, sign, { color: 'plum', align: 'right' });
  if (foot) drawText(hud, 88, 218, foot, { color: 'slate' });
}
export { inRect, textBlock };
