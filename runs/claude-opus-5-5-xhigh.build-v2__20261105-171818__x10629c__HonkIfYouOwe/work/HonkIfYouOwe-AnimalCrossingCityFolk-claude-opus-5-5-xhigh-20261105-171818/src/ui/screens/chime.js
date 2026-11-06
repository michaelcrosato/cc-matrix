// The Village Chime: sixteen tall chunky columns. Played on the Old Bell every hour.
import { panel, drawText, inRect, dim } from '../draw.js';
import { noteOf } from '../../systems/bell.js';

const N = 16, LEVELS = 11; // -1 rest, 0..9 notes
const X0 = 58, W = 22, Y0 = 56, CELL = 13;
class Chime {
  constructor(g, onClose) { this.id = 'chime'; this.onClose = onClose; this.col = 0; this.notes = g.world.chime.slice(); this.play = null; }
  focusIndex() { return this.col; }
  labels() { return this.notes.map(String); }
  noteRow(n) { return n < 0 ? LEVELS - 1 : LEVELS - 2 - n; }
  update(g, inp, dt) {
    const m = inp.mouse;
    if (inp.nav.left) { this.col = (this.col + N - 1) % N; g.sound('uiTick'); }
    if (inp.nav.right) { this.col = (this.col + 1) % N; g.sound('uiTick'); }
    const set = (v) => { this.notes[this.col] = v; if (v >= 0) g.ctx.audio.play('bellNote', { pitch: noteOf(v) - 5, volume: 0.7 }); };
    if (inp.nav.up) set(Math.min(9, this.notes[this.col] + 1));
    if (inp.nav.down) set(Math.max(-1, this.notes[this.col] - 1));
    for (let c = 0; c < N; c++) {
      if (m.x >= X0 + c * W && m.x < X0 + c * W + W - 2 && m.y >= Y0 && m.y < Y0 + LEVELS * CELL) {
        if (m.moved) this.col = c;
        if (m.click) { this.col = c; const row = Math.floor((m.y - Y0) / CELL); set(row >= LEVELS - 1 ? -1 : LEVELS - 2 - row); }
      }
    }
    if (inp.square) this.startPlay();
    if (inp.confirm || (m.click && inRect(m, 360, 212, 70, 20))) {
      g.world.chime = this.notes.slice();
      g.events.emit('chimeComposed', { notes: this.notes });
      g.world.flags.chimeSet = true;
      g.sound('uiConfirm');
      g.ui.pop(this);
      this.onClose?.();
      return;
    }
    if (inp.back || m.rclick) { g.sound('uiCancel'); g.ui.pop(this); this.onClose?.(); return; }
    if (this.play !== null) {
      this.playT -= dt;
      if (this.playT <= 0) {
        const n = this.notes[this.play];
        if (n >= 0) g.ctx.audio.play('bellNote', { pitch: noteOf(n) - 5, volume: 0.7 });
        this.play++;
        this.playT = 0.2;
        if (this.play >= N) this.play = null;
      }
    }
  }
  startPlay() { this.play = 0; this.playT = 0; }
  prompts() { return [['confirm', 'Keep it'], ['fill', 'Hear it'], ['back', 'Cancel']]; }
  draw(g, hud) {
    dim(hud);
    panel(hud, 48, 18, 384, 222, { fill: 'white', trim: 'sand' });
    drawText(hud, 240, 26, 'The Village Chime', { align: 'center', color: 'ink', scale: 2 });
    for (let c = 0; c < N; c++) {
      const x = X0 + c * W;
      const focused = c === this.col;
      for (let r = 0; r < LEVELS; r++) hud.rect(x, Y0 + r * CELL, W - 2, CELL - 2, r === LEVELS - 1 ? 'mist' : focused ? 'sand' : (c % 4 === 0 ? 'white' : 'white'));
      hud.rect(x, Y0 + LEVELS * CELL - 2, W - 2, 1, 'slate');
      const n = this.notes[c];
      const row = this.noteRow(n);
      hud.rect(x, Y0 + row * CELL, W - 2, CELL - 2, this.play === c ? 'red' : n < 0 ? 'slate' : 'orange');
      if (n >= 0) hud.rect(x, Y0 + (row + 1) * CELL, W - 2, Math.max(0, (LEVELS - 2 - row)) * CELL, 'sand');
    }
    drawText(hud, 240, 44, 'Up and down sets the note. The bottom row is a rest.', { align: 'center', color: 'slate' });
    panel(hud, 360, 212, 70, 20, { fill: 'sand', trim: 'orange' });
    drawText(hud, 395, 218, 'Keep it', { align: 'center', color: 'ink' });
  }
}
export const chimeScreen = (g, onClose) => new Chime(g, onClose);
