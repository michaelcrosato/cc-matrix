// Game time. A full day takes TUNING.dayMinutes real minutes. Absolute hours run on for regrowth and re-manning.
import { TUNING } from './tuning.js';
export class Clock {
  hour = 16.5; abs = 16.5; day = 0; frozen = false; skyT = 0;
  constructor(game) { this.game = game; }
  set(hour) { this.abs += ((hour - this.hour + 24) % 24); this.hour = hour; this.onRoll(); this.game.sky?.apply(this.game.ctx, this.hour); }
  advance(hours) { this.abs += hours; this.hour = (this.hour + hours) % 24; this.onRoll(); this.game.sky?.apply(this.game.ctx, this.hour); }
  onRoll() { const d = Math.floor(this.abs / 24); if (d !== this.day) { this.day = d; this.game.fire.dayRoll?.(); this.game.actors?.dayRoll?.(); this.game.events?.emit('day-roll', d); } this.game.fire.hours = this.abs; }
  isNight() { return this.hour < 5.4 || this.hour > 19.6; }
  step(dt) {
    if (this.frozen) return;
    const h = (24 / (TUNING.dayMinutes * 60)) * dt;
    this.hour = (this.hour + h) % 24; this.abs += h;
    this.game.fire.hours = this.abs;
    const d = Math.floor(this.abs / 24);
    if (d !== this.day) this.onRoll();
  }
}
