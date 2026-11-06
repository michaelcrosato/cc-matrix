// The session's own card: the players lining up, how to win, the controls, Ready and More time.
import { App } from '../app.js';
import { MORE_TIME } from '../core/actions.js';
import { ACTIVITIES } from '../data/activities.js';
import { TITLE } from '../data/title.js';
import { sayCentered, sayRight, textWidth } from '../ui/font.js';
import { promptBar } from '../ui/prompts.js';
import { panel } from '../ui/widgets.js';

/** Nothing done here changes the round. Enter is a direct listener in the scene: the hub checks it. */
export function cardInput(ctx, scene) {
  const { input } = ctx;
  if (input.wasPressed('PadCross')) { scene.answered = true; scene.hub.answer('ready'); }
  if (input.wasPressed(...MORE_TIME)) scene.hub.answer('more');
  if (input.wasPressed('MouseLeft') && scene.cardButtons) {
    const p = App.device.pointerArt(ctx);
    const hit = (r) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;
    if (hit(scene.cardButtons.ready)) { scene.answered = true; scene.hub.answer('ready'); }
    if (hit(scene.cardButtons.more)) scene.hub.answer('more');
  }
}

export function drawCard(ctx, scene) {
  const { hud } = ctx;
  const c = scene.cardState ?? {};
  const cx = Math.round(hud.width / 2);
  const scale = hud.width >= 300 ? 3 : 2;
  hud.rect(cx - Math.round(textWidth(TITLE, scale) / 2) - 6, 9, textWidth(TITLE, scale) + 12, 9 * scale + 6, 'navy');
  sayCentered(hud, cx, 12, TITLE, { scale, color: 'white', name: 'title' });
  const y0 = 44;
  const w = Math.min(hud.width - 24, 330);
  const x = Math.round((hud.width - w) / 2);
  panel(hud, x, y0, w, 46, { fill: 'white', name: 'card-panel' });
  sayCentered(hud, cx, y0 + 4, 'Score the most across three events.', { color: 'ink', shadow: false, name: 'card-goal' });
  sayCentered(hud, cx, y0 + 15, 'Stay in the circle.', { color: 'teal', shadow: false, name: 'card-goal' });
  const events = scene.picks.map((p) => ACTIVITIES[p].name).join(', ');
  sayCentered(hud, cx, y0 + 30, events.slice(0, Math.floor((w - 10) / 6)), { color: 'slate', shadow: false, name: 'card-events' });
  scene.drawNames(ctx, new Set(c.ready ?? []));
  const left = c.left === null || c.left === undefined ? '' : `${Math.ceil(c.left / 1000)}s`;
  if (left) sayRight(hud, x + w, 14, left, { scale: 2, color: 'sand', name: 'card-left' });
  if (c.paused) sayCentered(hud, cx, y0 + 50, 'Waiting. Somebody asked for more time.', { color: 'sand', name: 'card-paused' });
  // Controls for the last device, and Ready / More time.
  promptBar(hud, App.device, [['lean', 'Lean'], ['breath', 'Breathe'], ['stepL', 'Left'], ['stepR', 'Right']], { y: hud.height - 41 });
  promptBar(hud, App.device, [['confirm', scene.answered ? 'Ready!' : 'Ready'], ['more', c.asked ? 'Never mind' : 'More time']]);
  const by = hud.height - 26;
  scene.cardButtons = { ready: { x: 0, y: by, w: cx, h: 20 }, more: { x: cx, y: by, w: cx, h: 20 } };
}
