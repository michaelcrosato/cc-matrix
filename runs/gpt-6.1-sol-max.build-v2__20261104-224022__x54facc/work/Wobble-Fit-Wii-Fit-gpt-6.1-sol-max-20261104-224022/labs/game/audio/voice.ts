/** @file Deterministic Animalese-style babble: sixteen formant syllables per speaker, text always stays visible. */
import { defineSfx, type Audio } from '../../../engine';
export const SPEAKERS = {
  Tare: [260, 0.06],
  Plumb: [135, 0.11],
  Gerald: [95, 0.14],
  Bex: [210, 0.08],
  Nan: [170, 0.12],
};
export const VOICE_IDS: string[] = [];
for (const [name, [pitch, length]] of Object.entries(SPEAKERS))
  for (let i = 0; i < 16; i++) {
    const [f1, f2] = [
      [800, 1200],
      [500, 1900],
      [300, 2300],
      [500, 900],
      [320, 800],
    ][i % 5];
    const id = `sfx:vo.${name.toLowerCase()}.${i}`;
    defineSfx(id, {
      bus: 'ui',
      voices: [
        { wave: 'noise', dur: 0.015, vol: 0.09, attack: 0.001, filter: { type: 'bandpass', freq: 2200 + i * 100 } },
        {
          wave: 'saw',
          freq: pitch * (1 + i / 160),
          to: pitch * 0.94,
          at: 0.012,
          dur: length,
          vol: 0.25,
          attack: 0.006,
          filter: { type: 'bandpass', freq: f1 },
          q: 7,
        },
        {
          wave: 'saw',
          freq: pitch,
          at: 0.012,
          dur: length,
          vol: 0.15,
          attack: 0.006,
          filter: { type: 'bandpass', freq: f2 },
          q: 9,
        },
      ],
    });
    VOICE_IDS.push(id);
  }
export function say(audio: Audio, speaker: string, text: string, volume: number): void {
  const name = speaker in SPEAKERS ? (speaker as keyof typeof SPEAKERS) : 'Tare',
    [, length] = SPEAKERS[name];
  let time = 0;
  for (let i = 0; i < Math.min(text.length, 90); i += 2) {
    if (text[i] === ' ') {
      time += length * 0.4;
      continue;
    }
    const syllable = (text.charCodeAt(i) + (text.charCodeAt(i + 1) || 0)) % 16;
    audio.play(`sfx:vo.${name.toLowerCase()}.${syllable}`, {
      when: (audio.context?.currentTime ?? 0) + time,
      vol: volume * 0.5,
      pitch: name === 'Plumb' ? 1 : text.endsWith('?') ? 1 + (i / text.length) * 0.12 : 1 - (i / text.length) * 0.08,
      bus: 'ui',
      duck: true,
    });
    time += length * (/[.,?]/.test(text[i]) ? 2 : 1.1);
  }
}
