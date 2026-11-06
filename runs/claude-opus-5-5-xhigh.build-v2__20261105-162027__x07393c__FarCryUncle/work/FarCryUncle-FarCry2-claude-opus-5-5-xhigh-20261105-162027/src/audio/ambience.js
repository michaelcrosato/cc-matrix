// The world's sound floor: wind by speed, cicadas by day, insects by night, rain when it rains, a distant war now and then.
import { clamp } from '../core/rng.js';
export class Ambience {
  distantT = 30;
  constructor(game) { this.game = game; }
  build(ctx) {
    this.wind = ctx.audio.loop('wind-loop', { volume: 0 });
    this.day = ctx.audio.loop('birds-loop', { volume: 0 });
    this.night = ctx.audio.loop('insects-loop', { volume: 0 });
    this.rain = ctx.audio.loop('rain-loop', { volume: 0 });
  }
  stop() { for (const v of [this.wind, this.day, this.night, this.rain]) v?.stop(); }
  update(ctx, dt) {
    const g = this.game;
    if (g.ended) return;
    const inOut = g.mode === 'title' ? 0.35 : 1;
    this.wind?.set({ volume: clamp(0.08 + g.wind.total * 0.06, 0, 0.6) * inOut });
    const n = g.sky.night ?? 0;
    this.day?.set({ volume: (1 - n) * 0.35 * inOut });
    this.night?.set({ volume: n * 0.5 * inOut });
    this.rain?.set({ volume: g.sky.storm ? 0.6 : 0 });
    if (g.mode === 'campaign' || g.mode === 'round') {
      this.distantT -= dt;
      if (this.distantT <= 0) { this.distantT = g.rng.look.range(30, 90); g.sfx.play('distant-fight', { volume: 0.25, pan: g.rng.look.range(-0.8, 0.8) }); }
    }
  }
}
