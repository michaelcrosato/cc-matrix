/** @file Original tracker music and synthesized effects; never loads a recording. */
import { createAudio, defineSong, defineSfx, type Audio } from '../../../engine';
const themes = [
  ['lobby', 84, 'C4 . E4 . G4 . B4 . A4 . G4 . E4 . D4 .', 'C2 - - - - - - - F2 - - - G2 - - -'],
  ['stillness', 60, 'C5 - . . . . G4 - . . . . E5 - . .', 'C3 - - - - - - - A2 - - - - - - -'],
  ['water', 96, 'G4 . B4 D5 . B4 A4 . E4 . G4 B4 . G4 E4 .', 'G2 - - - D3 - - - C3 - - - D3 - - -'],
  ['stepBed', 112, 'E4 . G4 . B4 . G4 . D4 . F4 . A4 . F4 .', 'C2 - - - G2 - - - F2 - - - G2 - - -'],
  ['hoop', 104, 'C5 . . G4 . E4 . G4 A4 . . E4 . C4 . E4', 'C3 - . G2 - . C3 . F2 - . C3 - . G2 .'],
  ['tilt', 84, 'C4 . Eb4 . G4 . Bb4 . Ab4 . G4 . Eb4 . D4 .', 'C2 - - - - - - - Ab2 - - - G2 - - -'],
  ['dawn', 60, 'C5 - - . E5 - - . G5 - - . B4 - C5 -', 'C3 - - - - - - - F3 - - - G3 - - -'],
  ['stamp', 100, 'C5 E5 G5 B5 C6 - - - . . . . . . . .', 'C3 - E3 - G3 - C4 - . . . . . . . .'],
] as const;
export const SONG_IDS: string[] = [];
for (const [id, bpm, melody, bass] of themes) {
  defineSong(`song:${id}`, {
    bpm,
    loop: id !== 'stamp',
    tracks: [
      { wave: 'pluck', vol: 0.12, notes: melody },
      { wave: 'triangle', vol: 0.13, notes: bass },
      { wave: 'sine', vol: 0.035, notes: melody, octave: -1, attack: 0.12 },
    ],
  });
  SONG_IDS.push(`song:${id}`);
}
export const EFFECTS = [
  'pebble',
  'stamp',
  'splash',
  'gull',
  'frog',
  'rope',
  'clap',
  'kick',
  'horn',
  'thunder',
  'groan',
  'breath',
  'select',
];
for (const [i, name] of EFFECTS.entries())
  defineSfx(`sfx:retreat.${name}`, {
    bus: name === 'select' ? 'ui' : 'effects',
    voices: [
      {
        wave: ['splash', 'thunder', 'breath'].includes(name) ? 'noise' : 'sine',
        freq: name === 'horn' ? 110 : name === 'groan' ? 45 : 180 + i * 65,
        to: name === 'gull' ? 1000 : 100 + i * 30,
        dur: name === 'thunder' ? 1.2 : name === 'horn' ? 0.8 : 0.16,
        vol: 0.22,
        attack: 0.008,
        filter: { type: 'lowpass', freq: name === 'thunder' ? 350 : 2400 },
      },
    ],
  });
export function startSound(): Audio {
  const audio = createAudio();
  audio.volume('music', 0.1);
  return audio;
}
export function songFor(id: string): string {
  return `song:${['paddle', 'line'].includes(id) ? 'water' : ['garden', 'hoop'].includes(id) ? 'hoop' : id === 'step' ? 'stepBed' : id === 'tilt' ? 'tilt' : ['check', 'pose', 'pond', 'group'].includes(id) ? 'stillness' : 'lobby'}`;
}
