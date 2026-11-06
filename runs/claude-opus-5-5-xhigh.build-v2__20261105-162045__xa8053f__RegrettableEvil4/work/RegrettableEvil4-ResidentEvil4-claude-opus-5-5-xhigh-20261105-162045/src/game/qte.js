// Quick-time events: a big glyph in a shrinking ring at screen centre, time slowed by half while it's open.
// Types: press (one button in a window), mash (fill a bar), alternate (Cross then Circle).
import { TUNING } from '../data/tuning.js';
import { app } from '../core/app.js';

export class QTE {
  constructor(area) { this.area = area; this.active = null; this.count = { ok: 0, fail: 0 }; }

  press({ key = 'action', window = TUNING.qteWindow, onOk, onFail, label }) { this.open({ type: 'press', key, window, t: 0, onOk, onFail, label: label ?? (key === 'dodge' ? 'DODGE' : 'ACTION') }); }
  mash({ key = 'action', need = 1, time = 3, onOk, onFail, label = 'MASH' }) { this.open({ type: 'mash', key, need, time, t: 0, fill: 0, onOk, onFail, label }); }
  alternate({ need = 8, time = 4, onOk, onFail, label = 'ALTERNATE' }) { this.open({ type: 'alt', key: 'action', need, time, t: 0, fill: 0, next: 'action', onOk, onFail, label }); }

  open(q) {
    this.active = q;
    this.area.ctx.audio.play('qtePop');
    app.slow = 0.5;
    app.syncTime();
    this.area.rumble(0.3, 0.2, 80);
  }

  close(ok) {
    const q = this.active;
    this.active = null;
    app.slow = 1;
    app.syncTime();
    this.count[ok ? 'ok' : 'fail']++;
    this.area.ctx.audio.play(ok ? 'qteGood' : 'qteBad');
    this.area.rumble(ok ? 0.5 : 1, ok ? 0.2 : 0.8, 140);
    if (ok) q.onOk?.(); else q.onFail?.();
  }

  /** In game time at half speed, so a 0.9 s window is 0.9 real seconds. */
  step(dt, it) {
    const q = this.active;
    if (!q) return false;
    const real = dt / 0.5;
    q.t += real;
    const pressed = q.key === 'dodge' ? it.dodge : it.action;
    const other = q.key === 'dodge' ? it.action : it.dodge;
    if (q.type === 'press') {
      if (pressed) { this.close(true); return true; }
      if (other) { this.close(false); return true; }
      if (q.t >= q.window) { this.close(false); return true; }
    } else if (q.type === 'mash') {
      if (pressed) { q.fill += 0.11; this.area.ctx.audio.play('qtePop', { pitch: q.fill * 10, volume: 0.6 }); }
      q.fill = Math.max(0, q.fill - real * 0.12);
      if (q.fill >= q.need) { this.close(true); return true; }
      if (q.t >= q.time) { this.close(false); return true; }
    } else {
      const want = q.next === 'action' ? it.action : it.dodge;
      if (want) { q.fill += 1; q.next = q.next === 'action' ? 'dodge' : 'action'; this.area.ctx.audio.play('qtePop', { pitch: q.fill, volume: 0.6 }); }
      if (q.fill >= q.need) { this.close(true); return true; }
      if (q.t >= q.time) { this.close(false); return true; }
    }
    return true;
  }

  draw(ui) {
    const q = this.active;
    if (!q) return;
    const cx = ui.W >> 1; const cy = (ui.H >> 1) - 8;
    const hud = ui.hud;
    const action = q.type === 'alt' ? (q.next === 'action' ? 'qte1' : 'qte2') : (q.key === 'dodge' ? 'qte2' : 'qte1');
    const frac = q.type === 'press' ? 1 - q.t / q.window : 1 - q.t / q.time;
    const R = 16 + Math.round(frac * 18);
    for (let a = 0; a < 40; a++) {
      const t = (a / 40) * Math.PI * 2;
      hud.rect(Math.round(cx + Math.cos(t) * R), Math.round(cy + Math.sin(t) * R), 2, 2, frac < 0.3 ? 'red' : 'sand');
    }
    const w = ui.promptWidth(action, q.label, 2);
    hud.rect(cx - (w >> 1) - 4, cy - 15, w + 8, 30, 'ink');
    ui.prompt(cx - (w >> 1), cy - 11, action, q.label, { scale: 2 });
    if (q.type !== 'press') {
      const fill = q.type === 'mash' ? q.fill / q.need : q.fill / q.need;
      ui.bar(cx - 40, cy + R + 6, 80, 7, fill, 'orange');
    }
  }
}
