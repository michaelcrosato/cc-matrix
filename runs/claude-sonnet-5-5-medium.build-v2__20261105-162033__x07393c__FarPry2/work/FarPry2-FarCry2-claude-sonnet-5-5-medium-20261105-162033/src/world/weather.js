// Weather: dry by default; a storm (rain, lightning, thunder, damped fire) is scripted for M9 and available from dev mode.
import { THREE, Precipitation } from '../../pixel-engine.js';
export class WeatherSystem {
  name = 'weather';
  kind = 'clear'; flashT = 8; rain = null; loop = null;
  setup(g) {
    this.g = g; g.weather = 'clear'; g.setWeather = (k) => this.set(k);
    try { this.rain = new Precipitation({ kind: 'rain', count: 2500 }); this.rain.visible = false; g.ctx.scene.add(this.rain); } catch { this.rain = null; }
  }
  set(k) {
    const g = this.g; this.kind = k; g.weather = k; if (this.rain) this.rain.visible = k === 'storm';
    if (k === 'dust') { g.world.wind.pin = true; g.world.wind.speed = 7; g.world.wind.dir = [0.9, 0.3]; }
    g.world.fog.amount.value = k === 'dust' ? 0.9 : 0.55;
    if (k === 'storm') { g.world.wind.pin = true; g.world.wind.speed = 6; g.world.wind.dir = [0.7, 0.7]; try { this.loop ||= g.ctx.audio.loop('loop_rain', { volume: 0 }); } catch { this.loop = null; } }
    else { try { this.loop?.set({ volume: 0 }); } catch { /* none */ } }
    g.events.emit('weather', k);
  }
  fixed(g, dt) {
    if (this.kind === 'dust' && g.step % 6 === 0) { const c = g.ctx.camera.camera.position; g.ctx.particles.burst('dust', [c.x + g.ctx.random.range(-12, 12), c.y + g.ctx.random.range(-1, 3), c.z + g.ctx.random.range(-12, 12)], { count: 2 }); }
    if (this.kind !== 'storm') return; this.flashT -= dt;
    if (this.flashT <= 0) { this.flashT = g.ctx.random.range(8, 20); if (!g.settings.reduceFlash) g.ctx.engine.screen.flash('white', { duration: 0.12 }); g.ctx.tweens.call(g.ctx.random.range(0.4, 2), () => g.sfx('thunder', { volume: 0.8 })); }
  }
  frame(g, dt) { if (this.rain && this.kind === 'storm') { this.rain.update(dt, g.ctx.camera.camera.position); } try { this.loop?.set({ volume: this.kind === 'storm' ? 0.6 : 0 }); } catch { /* none */ } }
}
