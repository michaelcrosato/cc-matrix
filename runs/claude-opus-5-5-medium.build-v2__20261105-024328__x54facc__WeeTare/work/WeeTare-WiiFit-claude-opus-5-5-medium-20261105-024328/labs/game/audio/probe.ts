/**
 * @file Sound by numbers in the browser, since nobody can listen here: renders a song and a voice through the real runtime into an
 * OfflineAudioContext and reports their peaks, with the music bus at full and at the default 10%.
 */
import { createAudio } from '../../../engine';
import { babble } from './voice';

const peak = (buffer: AudioBuffer): number =>
  buffer.getChannelData(0).reduce((max, v) => Math.max(max, Math.abs(v)), 0);

async function render(fill: (context: OfflineAudioContext) => void): Promise<number> {
  const context = new OfflineAudioContext(2, 44100 * 4, 44100);
  fill(context);
  return peak(await context.startRendering());
}

/** The peaks: `song` at 100%, `quiet` at 10%, `voice` for one babbled line. */
export async function probeAudio(): Promise<{ song: number; quiet: number; voice: number }> {
  const song = (level: number) => (context: OfflineAudioContext) => {
    const audio = createAudio({ context } as never);
    audio.volume('music', level);
    audio.music('song:lobby', { intensity: 1 } as never);
    audio.update();
  };
  const [loud, quiet, voice] = [
    await render(song(1)),
    await render(song(0.1)),
    await render((context) => void babble(createAudio({ context } as never), 'tare', 'Please keep to the centre.', 1)),
  ];
  return { song: loud, quiet, voice };
}
