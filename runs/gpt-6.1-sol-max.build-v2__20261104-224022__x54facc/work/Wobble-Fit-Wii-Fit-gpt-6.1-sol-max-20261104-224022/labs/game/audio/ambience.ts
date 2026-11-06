/** @file Code-written shore and storm noise, quietly behind the tracker score. */
import { defineSfx, type Audio, type Sound } from '../../../engine';
for (const [name, frequency, volume] of [
  ['shore', 360, 0.07],
  ['wind', 720, 0.065],
  ['rain', 1800, 0.05],
] as const)
  defineSfx(`sfx:retreat.${name}`, {
    bus: 'ambience',
    voices: [
      { wave: 'noise', dur: 3, vol: volume, attack: 0.5, release: 0.5, filter: { type: 'lowpass', freq: frequency } },
    ],
  });
export function startAmbience(audio: Audio) {
  let shore: Sound | null = null,
    wind: Sound | null = null,
    rain: Sound | null = null,
    last = '';
  return {
    set(mode: string) {
      if (mode === last && shore?.playing) return;
      last = mode;
      if (!shore) shore = audio.play('sfx:retreat.shore', { loop: true, vol: 0.55 });
      if (mode === 'storm') {
        wind = audio.play('sfx:retreat.wind', { loop: true, vol: 0.6 });
        rain = audio.play('sfx:retreat.rain', { loop: true, vol: 0.6 });
      } else {
        wind?.stop();
        rain?.stop();
        wind = rain = null;
      }
    },
    stop() {
      shore?.stop();
      wind?.stop();
      rain?.stop();
    },
  };
}
