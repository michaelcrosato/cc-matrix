// Quick-time events: a large glyph in a shrinking ring. Read from the Intent so bots and players share it.
import { TUNING } from '../data/tuning.js';
export class QTE {
  constructor(area) { this.area = area; this.active = false; this.opt = null; this.t = 0; this.fill = 0; this.count = 0; this.queue = []; }
  /** type: press | mash | alternate. button: action or dodge. */
  start(o) { if (this.active) { this.queue.push(o); return; } this.opt = o; this.owner = o.owner ?? this.area.player; this.active = true; this.t = o.time ?? TUNING.qteWindow; this.max = this.t; this.fill = 0; this.want = 0; const A = this.area; this.savedScale = A.ctx.engine.timeScale; if (o.slow !== false) A.ctx.engine.timeScale = 0.5; A.ctx.audio.play('qtepop'); }
  feed(i) {
    const o = this.opt, pressAction = i.action, pressDodge = i.dodge; i.action = false; i.dodge = false; i.knife = false; i.reload = false; i.command = false; i.heal = false; i.throw = false; i.turn = false;
    if (o.type === 'press') { const hit = o.button === 'dodge' ? pressDodge : pressAction, wrong = o.button === 'dodge' ? pressAction : pressDodge; if (hit) this.finish(true); else if (wrong && o.strict) this.finish(false); }
    else if (o.type === 'mash') { if (pressAction || pressDodge) { this.fill += 1; this.area.ctx.audio.play('uimove'); } }
    else if (o.type === 'alternate') { const w = this.want === 0 ? pressAction : pressDodge; if (w) { this.fill += 1; this.want = 1 - this.want; this.area.ctx.audio.play('uimove'); } }
    this.tickFill = true;
  }
  fixed(dt) {
    if (!this.active) return; const o = this.opt; this.t -= dt; o.onTick?.(dt);
    if (o.type !== 'press') { this.fill = Math.max(0, this.fill - (o.drain ?? 0) * dt); if (this.fill >= (o.fill ?? 8)) { this.finish(true); return; } }
    if (this.t <= 0) this.finish(o.type !== 'press' && o.timeoutWins !== false ? (o.mashTimeoutOk ?? true) : false);
  }
  finish(ok) { const o = this.opt, A = this.area; this.active = false; this.opt = null; if (A.ctx.engine.timeScale === 0.5) A.ctx.engine.timeScale = this.savedScale || 1; A.ctx.audio.play(ok ? 'uiconfirm' : 'qtefail'); A.stats?.(ok); o.onDone?.(ok); if (!this.active && this.queue.length) this.start(this.queue.shift()); }
  cancel() { this.active = false; this.opt = null; this.queue = []; if (this.area.ctx.engine.timeScale === 0.5) this.area.ctx.engine.timeScale = 1; }
}
