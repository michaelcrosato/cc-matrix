/** @file Every synthesized tool and strain signature produces finite, non-silent audio samples. */
import { it, expect } from 'vitest';
import { renderSfx, renderSong } from '../../../engine';
import './data';
for (const id of [
  'cut',
  'stitch',
  'drain',
  'laser',
  'syringe',
  'gel',
  'scanner',
  'forceps',
  'beep',
  'shock',
  'signature-lull',
  'signature-solace',
  'signature-reverie',
  'signature-balm',
  'signature-mercy',
])
  it(`renders ${id} without an audio file`, () => {
    const samples = renderSfx('sfx:hl-' + id),
      energy = samples.reduce((sum, n) => sum + n * n, 0);
    expect(samples.length).toBeGreaterThan(100);
    expect(Number.isFinite(energy)).toBe(true);
    expect(energy).toBeGreaterThan(0.0001);
  });
it('renders the original title music', () => {
  const song = renderSong('song:hl-title');
  expect(song.length).toBeGreaterThan(1000);
  expect(song.some((n) => n !== 0)).toBe(true);
});
