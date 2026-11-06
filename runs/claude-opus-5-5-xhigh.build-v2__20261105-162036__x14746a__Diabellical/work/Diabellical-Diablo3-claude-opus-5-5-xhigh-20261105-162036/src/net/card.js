// The game's own card: heroes in a torchlit room, who is here, how to win, how to play, the time left.
import { CLASSES } from '../data/classes.js';
import { TITLE } from '../data/meta.js';
import { SEAT_CLASSES } from '../sim/round.js';
import { Screen } from '../ui/menus/base.js';

export const GOAL_TEXT = 'FILL THE KNELL, THEN SLAY ITS WARDEN TOGETHER';
const HEX = (h) => parseInt(String(h).replace('#', ''), 16);

export class CardScreen extends Screen {
  constructor(game, net) {
    super(game, { tag: 'card', freeze: false, holdSim: false });
    this.net = net;
  }
  back() {}
  draw(ui) {
    const net = this.net;
    if (net.started) { this.game.closeScreen(); return; }
    const W = ui.w, H = ui.h;
    const info = net.info;
    const card = net.card;
    ui.rect(0, 0, W, 34, 'ink');
    ui.text(W / 2, 6, TITLE, { color: 'sand', scale: 3, align: 'center' });
    ui.rect(0, H - 100, W, 100, 'ink');
    ui.rect(0, H - 101, W, 1, 'slate');
    // Who is here.
    let x = 14;
    info.players.forEach((p) => {
      const ready = card.ready?.includes(p.id);
      const cls = CLASSES[SEAT_CLASSES[p.id % 4]].name;
      ui.rect(x, H - 96, 96, 22, HEX(p.color));
      ui.rect(x + 1, H - 95, 94, 20, 'ink');
      ui.text(x + 4, H - 93, String(p.name).slice(0, 12), { color: HEX(p.color) });
      ui.text(x + 4, H - 84, cls.slice(0, 11), { color: 'mist' });
      if (ready) ui.text(x + 90, H - 84, 'OK', { color: 'lime', align: 'right' });
      x += 100;
    });
    ui.text(14, H - 70, GOAL_TEXT, { color: 'white' });
    // This player's controls, in the current glyphs.
    let cx = 14;
    const cy = H - 58;
    for (const [a, label] of [['move', 'MOVE'], ['s0', 'ATTACK'], ['s1', 'SKILLS'], ['dodge', 'ROLL'], ['potion', 'DRINK']]) cx += ui.prompt(a, label, cx, cy);
    const left = card.left === null || card.left === undefined ? (card.paused ? 'THE COUNTDOWN WAITS' : 'STARTING') : `${Math.ceil(card.left / 1000)} SECONDS`;
    ui.text(W - 14, H - 70, left, { color: 'sand', align: 'right' });
    const iReady = card.ready?.includes(info.me);
    if (ui.button('card:ready', 14, H - 42, 110, 20, iReady ? 'READY' : 'READY?', { color: iReady ? 'lime' : 'white' })) AIHub.answer('ready');
    if (ui.button('card:more', 130, H - 42, 110, 20, card.asked ? 'ASKED' : 'MORE TIME', { color: card.asked ? 'sand' : 'mist' })) AIHub.answer('more');
    if (card.asking > 0) ui.text(250, H - 35, `${card.asking} WANT MORE TIME`, { color: 'mist' });
    ui.prompt('confirm', 'READY', 14, H - 16);
    ui.prompt('more', 'MORE TIME', 90, H - 16);
    const m = this.game.input.menu;
    if (m.ctxB) AIHub.answer('more');
    // Pads: Cross answers Ready through the widget. A press with no focus still counts.
    if (m.confirm && ui.focus !== 'card:ready' && ui.focus !== 'card:more') AIHub.answer('ready');
  }
}
