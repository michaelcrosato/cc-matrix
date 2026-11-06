// The emote wheel: eight wedges. Unlearned ones are dark; you learn them at the theatre.
import { panel, drawText, inRect, dim } from '../draw.js';

export const ALL_EMOTES = ['laugh', 'cry', 'shock', 'anger', 'love', 'shrug', 'bow', 'dance'];
const CLIP = { laugh: 'Laugh', cry: 'Cry', shock: 'Shock', anger: 'Anger', love: 'Love', shrug: 'Shrug', bow: 'Bow', dance: 'Dance' };
const WHEEL = ['laugh', 'cry', 'shock', 'anger', 'love', 'shrug', 'bow', 'dance'];
class Wheel {
  constructor() { this.id = 'emote'; this.focus = 0; }
  labels() { return WHEEL; }
  focusIndex() { return this.focus; }
  pos(i) { const a = -Math.PI / 2 + (i / 8) * Math.PI * 2; return [240 + Math.cos(a) * 92 - 34, 135 + Math.sin(a) * 76 - 11, 68, 22]; }
  update(g, inp) {
    const m = inp.mouse;
    if (inp.nav.right || inp.nav.down) { this.focus = (this.focus + 1) % 8; g.sound('uiTick'); }
    if (inp.nav.left || inp.nav.up) { this.focus = (this.focus + 7) % 8; g.sound('uiTick'); }
    // the stick picks a wedge directly
    const ax = inp.axisX, ay = inp.axisY;
    if (Math.hypot(ax, ay) > 0.6 && inp.device === 'pad') { const a = Math.atan2(-ay, ax) + Math.PI / 2; this.focus = (Math.round((a / (Math.PI * 2)) * 8) + 8) % 8; }
    for (let i = 0; i < 8; i++) if (inRect(m, ...this.pos(i))) { if (m.moved) this.focus = i; if (m.click) { this.focus = i; this.pick(g); return; } }
    if (inp.confirm || g.ctx.input.wasPressed('PadLeft', 'KeyG') && false) { this.pick(g); return; }
    if (inp.back || inp.emote || m.rclick) { g.sound('uiCancel'); g.ui.pop(this); }
  }
  pick(g) {
    const em = WHEEL[this.focus];
    if (!g.world.player.emotes.includes(em)) { g.sound('uiError'); g.ui.toastMsg('You haven\'t learned that yet. Sir Reginald could teach you.'); return; }
    g.ui.pop(this);
    g.player.pose(CLIP[em]);
    g.sound('uiConfirm');
    g.events.emit('emoted', { em });
    if (em === 'love') g.ctx.particles.burst('hearts', [g.player.x + g.place.ox, 2.2, g.player.z + g.place.oz]);
    g.net?.emote(em);
  }
  prompts() { return [['confirm', 'Do it'], ['back', 'Close']]; }
  draw(g, hud) {
    for (let i = 0; i < 8; i++) {
      const [x, y, w, h] = this.pos(i);
      const f = i === this.focus;
      const known = g.world.player.emotes.includes(WHEEL[i]);
      panel(hud, x, y, w, h, { fill: f ? 'sand' : known ? 'white' : 'mist', trim: f ? 'orange' : 'slate' });
      drawText(hud, x + w / 2, y + 7, known ? WHEEL[i] : '?', { align: 'center', color: known ? 'ink' : 'slate' });
    }
  }
}
export const emoteWheel = () => new Wheel();
export { dim };
