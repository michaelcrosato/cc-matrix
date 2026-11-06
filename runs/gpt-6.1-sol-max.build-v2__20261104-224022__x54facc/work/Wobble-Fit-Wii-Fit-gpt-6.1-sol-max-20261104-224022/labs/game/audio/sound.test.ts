/** @file Every original song, effect and gibberish syllable has finite non-silent PCM, without recordings. */
import { it, expect } from 'vitest';
import { renderSfx, renderSong } from '../../../engine';
import { SONG_IDS, EFFECTS } from './sound';
import './ambience';
import { VOICE_IDS } from './voice';
it('renders every sound and all five syllable banks without silence or invalid samples', () => {
  for (const id of [...VOICE_IDS, ...['shore', 'wind', 'rain', ...EFFECTS].map((name) => `sfx:retreat.${name}`)]) {
    const pcm = renderSfx(id, { rate: 16000 });
    let peak = 0;
    for (const value of pcm) {
      expect(Number.isFinite(value), id).toBe(true);
      peak = Math.max(peak, Math.abs(value));
    }
    expect(peak, id).toBeGreaterThan(0.0001);
  }
  for (const id of SONG_IDS) {
    const pcm = renderSong(id, { rate: 16000 });
    let peak = 0;
    for (const value of pcm) {
      expect(Number.isFinite(value), id).toBe(true);
      peak = Math.max(peak, Math.abs(value));
    }
    expect(peak, id).toBeGreaterThan(0.001);
  }
});
