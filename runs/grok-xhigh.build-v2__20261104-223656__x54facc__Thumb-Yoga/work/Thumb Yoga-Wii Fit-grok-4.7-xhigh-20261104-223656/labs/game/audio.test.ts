/**
 * @file Songs, syllables and the line book. Each one has to make a sound, or be a real sentence.
 */
import { describe, expect, it } from 'vitest';
import { renderSfx, renderSong } from '../../engine';
import { syllableId } from './audio/voice';
import { dawn, lobby, rake, stamp, stillness, tilt, water } from './sounds/songs';
import { LINES } from './ui/lines/book';

const SONGS = [lobby, stillness, water, rake, tilt, dawn, stamp];

describe('sound and lines', () => {
  it('renders every song with samples', () => {
    for (const song of SONGS) {
      const samples = renderSong(song.id);
      expect(samples.length, song.id).toBeGreaterThan(0);
      let loud = 0;
      for (let i = 0; i < samples.length; i += 32) loud = Math.max(loud, Math.abs(samples[i] ?? 0));
      expect(loud, song.id).toBeGreaterThan(0);
    }
  });

  it('renders a syllable for every speaker', () => {
    for (const speaker of ['tare', 'plumb', 'gerald', 'bex', 'nan', 'pa'] as const) {
      const samples = renderSfx(syllableId(speaker, 0));
      expect(samples.length, speaker).toBeGreaterThan(0);
      let loud = 0;
      for (let i = 0; i < samples.length; i += 8) loud = Math.max(loud, Math.abs(samples[i] ?? 0));
      expect(loud, speaker).toBeGreaterThan(0);
    }
  });

  it('keeps two hundred short lines, and Plumb never shouts', () => {
    const entries = Object.entries(LINES);
    expect(entries.length).toBeGreaterThanOrEqual(200);
    for (const [id, line] of entries) {
      const stops = line.match(/[.!?]/g)?.length ?? 0;
      expect(stops, id).toBeLessThanOrEqual(2);
      expect(line.length, id).toBeGreaterThan(8);
      if (id.startsWith('plumb')) expect(line.includes('!'), id).toBe(false);
    }
  });
});
