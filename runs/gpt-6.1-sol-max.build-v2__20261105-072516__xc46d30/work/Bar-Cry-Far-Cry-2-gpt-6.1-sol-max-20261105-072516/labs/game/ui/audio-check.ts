/** @file Numeric audio verification for the developer: original songs, effects and a real offline Web Audio voice. */
import { createAudio, renderSong, renderSfx } from '../../../engine';
function levels(samples: Float32Array): { peak: number; rms: number } {
  let peak = 0,
    power = 0;
  for (const x of samples) {
    peak = Math.max(peak, Math.abs(x));
    power += x * x;
  }
  return { peak, rms: Math.sqrt(power / samples.length) };
}
export async function audioCheck(): Promise<object> {
  const songs = Array.from({ length: 4 }, (_, i) => ({
    id: `song:field-${i}`,
    ...levels(renderSong(`song:field-${i}`, { rate: 24000 })),
  }));
  const effects = ['shot', 'explosion', 'reload', 'voice-a', 'wind'].map((key) => ({
    id: key,
    ...levels(renderSfx(`sfx:field-${key}`, { rate: 24000 })),
  }));
  const context = new OfflineAudioContext(1, 12000, 24000),
    audio = createAudio({ context });
  audio.volume('music', 0.1);
  audio.play('sfx:field-voice-a', { bus: 'ui', vol: 0.7 });
  const rendered = await context.startRendering(),
    offline = levels(rendered.getChannelData(0));
  await audio.close();
  return { songs, effects, offline };
}
