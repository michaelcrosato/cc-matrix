// The game's own card in a hub session: the name, the players with ready ticks, how to win, this player's
// controls with the right glyphs, the time left. Enter or Cross: ready. Triangle or M: more time.
import { app } from '../core/app.js';
import { TITLE } from '../config.js';

const SEAT_COLOR = ['red', 'sky', 'lime', 'sand'];

export function openCard(area, session) {
  const card = { left: null, paused: false, starting: false, ready: [], asking: 0, asked: false };
  const off = session.on('card', (c) => Object.assign(card, c));
  let answered = false;
  const answerReady = () => {
    if (answered) return false;
    answered = true;
    session.answer?.('ready');
    return true;
  };
  // Heard straight from the keyboard too: a slow first frame mustn't swallow the one key this screen asks for.
  const onKey = (ev) => { if (ev.key === 'Enter' && answerReady()) screenAudio?.('uiConfirm'); };
  let screenAudio = null;
  globalThis.addEventListener?.('keydown', onKey);
  const screen = {
    frozen: false,
    name: 'card',
    update(ctx, ui) {
      const { hud, W, H } = ui;
      screenAudio = (id) => ctx.audio.play(id);
      const t = session.time();
      if (Number.isFinite(t)) { off(); globalThis.removeEventListener?.('keydown', onKey); app.close(screen); return; }
      ui.dim();
      let sc = 3;
      while (sc > 1 && ui.width(TITLE, sc) > W - 20) sc--;
      ui.centerText(10, TITLE, { scale: sc, color: 'sand' });
      ui.centerText(38, 'NIGHT SHIFT', { scale: 2, color: 'white' });
      ui.centerText(58, 'HOLD THE QUAY TOGETHER UNTIL DAWN. REVIVE YOUR COLLEAGUES.', { color: 'mist' });
      // Players with ready ticks.
      let y = 74;
      for (const p of session.players) {
        const ready = card.ready.includes(p.id);
        hud.rect((W >> 1) - 80, y, 160, 13, 'ink');
        hud.rect((W >> 1) - 78, y + 3, 7, 7, SEAT_COLOR[p.id % 4]);
        ui.text((W >> 1) - 66, y + 3, p.name.slice(0, 16), { color: p.id === session.me ? 'white' : 'mist' });
        if (ready) ui.text((W >> 1) + 56, y + 3, 'READY', { color: 'lime' });
        y += 15;
      }
      // Controls for this player.
      y = Math.max(y + 4, 138);
      const col = (W >> 1) - 150;
      const rows = [['move', 'MOVE'], ['look', 'LOOK'], ['aim', 'AIM'], ['fire', 'FIRE'], ['action', 'KICK / REVIVE'], ['reload', 'RELOAD'], ['heal', 'HEAL'], ['throw', 'THROW']];
      rows.forEach(([a, l], i) => ui.prompt(col + (i % 2) * 160, y + (i >> 1) * 13, a, l));
      // Time left and the two answers.
      const left = card.starting ? 'STARTING' : card.paused ? 'HOLDING' : card.left != null ? `${Math.ceil(card.left / 1000)}` : '';
      if (left) ui.text(W - 8 - ui.width(left, 2), 8, left, { scale: 2, color: 'orange' });
      const readyHit = ctx.input.wasPressed('Enter', 'NumpadEnter', 'PadCross') || (ui.clicked && ui.my < H - 30);
      const moreHit = ctx.input.wasPressed('PadTriangle', 'KeyM');
      if (readyHit && answerReady()) ctx.audio.play('uiConfirm');
      if (moreHit) { session.answer?.('more'); ctx.audio.play('uiMove'); }
      ui.promptBar([['tertiary', card.asked ? 'TAKE BACK' : 'MORE TIME'], ['confirm', answered ? 'READY!' : 'READY']]);
    },
  };
  app.open(screen);
  return screen;
}
