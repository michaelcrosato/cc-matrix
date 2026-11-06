/** @file Every effect, syllable and song renders non-silent; voices differ by speaker; there are no audio files. */
import { describe, expect, it } from 'vitest';
import { renderSfx, renderSong } from '../../../engine';
import { SFX_IDS, SONG_IDS, SPEAKERS } from './sound';
import { babble } from './voice';

const peak = (a: ArrayLike<number>): number => {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i]));
  return m;
};
describe('sound', () => {
  it('effects render', () => {
    for (const id of SFX_IDS) expect(peak(renderSfx(id) as never), id).toBeGreaterThan(0.001);
  });
  it('syllables render and differ', () => {
    for (const who of Object.keys(SPEAKERS))
      for (let i = 0; i < 16; i++) expect(peak(renderSfx(`sfx:vo.${who}.${i}`) as never)).toBeGreaterThan(0.01);
    expect(babble('Good morning.', 'tare')).toEqual(babble('Good morning.', 'tare'));
    expect(babble('Good morning.', 'tare')[0].pitch).not.toBe(babble('Good morning.', 'plumb')[0].pitch);
  });
  it('songs render', () => {
    for (const s of SONG_IDS) expect(peak(renderSong(`song:retreat.${s}`) as never), s).toBeGreaterThan(0.01);
  });
});
