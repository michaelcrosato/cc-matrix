// The world's own sound: fire, wind, insects, birds, rain, a war far off.
import { spatialize } from '../../pixel-engine.js';
export function updateAmbience(sound, g, dt) {
    const w = g.world, nf = w.nearestFire, k = sound.sfxK();
    if (nf) { const s = spatialize(sound.listener(), { x: nf.x, y: g.player.y + 1, z: nf.z }, { ref: 18, max: 240 }); sound.fire.set({ volume: Math.min(1, (0.3 + nf.n / 120) * s.gain) * k, pan: s.pan, muffle: sound.muffleAt(nf.x, g.player.y + 1, nf.z) }); } else sound.fire.set({ volume: 0 });
    const night = w.isNight(), quiet = g.mode === 'title' ? 0.6 : 1;
    sound.windV.set({ volume: (0.08 + (w.wind.speed / 8) * 0.34) * k * quiet, pitch: w.wind.speed - 4 });
    sound.insects.set({ volume: (night ? 0.9 : 0.1) * k * quiet }); sound.birds.set({ volume: (night || nf ? 0 : 0.7) * k * quiet });
    sound.rain.set({ volume: (w.weather === 'storm' ? 0.75 : 0) * k });
    // Distant war.
    if (g.mode === 'play' && w.look.next() < dt * 0.012) sound.ctx.audio.play('distant-gunfire', { volume: 0.25 * k, pan: w.look.range(-0.8, 0.8) });
}
