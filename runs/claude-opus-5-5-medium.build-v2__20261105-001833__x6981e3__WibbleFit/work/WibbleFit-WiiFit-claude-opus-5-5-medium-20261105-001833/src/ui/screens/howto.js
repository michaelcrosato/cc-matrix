// How to play: paged, one idea per screen.
import { ACTIONS } from '../../core/actions.js';
import { App } from '../../app.js';
import { center, wrap } from '../font.js';
import { prompt, promptBar } from '../prompts.js';
import { panel } from '../widgets.js';
const PAGES = [
  { title: 'You are a dot', text: 'Everything is one verb: lean. The Dot has weight, so it drifts and overshoots. Push gently. Keep it in the circle.', p: [['lean', 'Lean'], ['half', 'Half lean']] },
  { title: 'Breathing', text: 'Some poses ask you to breathe. Hold while the bar says In. Let go when it says Out. Breathing well calms the Dot.', p: [['breath', 'Hold to breathe in']] },
  { title: 'Reps and hoops', text: 'In the Rep Shed the stick moves your body. Match the green marker. At Beat Beach, circle the stick and flick toward a thrown hoop.', p: [['lean', 'Move, or circle']] },
  { title: 'Feet', text: 'Step Class and the Island Jog use your left and right foot. Hit them on the line, or keep them alternating.', p: [['feet', 'Left, right']] },
  { title: 'A day', text: 'Weigh in. Walk the island. Do what you like. Coach\'s prescription pays a bonus. The hammock ends the day. You cannot lose. You can only be noted.', p: [['walk', 'Walk'], ['confirm', 'Enter']] },
];
export class HowToScreen {
  id = 'howto'; i = 0; attractable = true;
  update(ctx) {
    const inp = ctx.input;
    if (inp.wasPressed(...ACTIONS.back)) { App.close(this); return; }
    let d = 0;
    if (inp.wasPressed(...ACTIONS.tabR, ...ACTIONS.right, 'Enter', 'Space', 'PadCross', 'MouseLeft') || inp.wheel > 0) d = 1;
    if (inp.wasPressed(...ACTIONS.tabL, ...ACTIONS.left) || inp.wheel < 0) d = -1;
    if (d) { this.i += d; App.sfx('menuMove'); if (this.i >= PAGES.length) App.close(this); this.i = Math.max(0, this.i); }
  }
  draw(hud) {
    const p = PAGES[Math.min(this.i, PAGES.length - 1)], w = Math.min(hud.width - 24, 340), x = (hud.width - w) / 2, ls = wrap(p.text, 52), h = 44 + ls.length * 11 + p.p.length * 15, y = Math.max(12, (hud.height - 16 - h) / 2);
    panel(hud, x, y, w, h, 'white', 'teal');
    center(hud, y + 8, p.title, { scale: 2, color: 'teal', shadow: false });
    ls.forEach((l, k) => center(hud, y + 30 + k * 11, l, { color: 'ink', shadow: false }));
    p.p.forEach(([a, v], k) => prompt(hud, x + 16, y + 34 + ls.length * 11 + k * 15, a, v, { color: 'ink', shadow: false }));
    promptBar(hud, [['tabs', `Page ${this.i + 1}/${PAGES.length}`], ['back', 'Back']]);
  }
}
