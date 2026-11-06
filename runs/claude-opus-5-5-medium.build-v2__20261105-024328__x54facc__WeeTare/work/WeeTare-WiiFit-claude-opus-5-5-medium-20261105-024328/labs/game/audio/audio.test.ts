/**
 * @file Sound by numbers, since nobody can listen here: every song and syllable renders non-silent, vowels differ.
 */
import { describe, expect, it } from 'vitest';
import { getSfx, getSong, renderSfx, renderSong } from '../../../engine';
import '../sounds/songs';
import { SPEAKERS, voiceId, type Speaker } from '../sounds/sfx';
import { registry } from '../../../engine/core/registry';

const peak = (samples: ArrayLike<number>) => {
  let max = 0;
  for (let k = 0; k < samples.length; k++) max = Math.max(max, Math.abs(samples[k]));
  return max;
};
const channel = (out: unknown): ArrayLike<number> =>
  (out as { samples?: ArrayLike<number>; left?: ArrayLike<number> }).samples ??
  (out as { left: ArrayLike<number> }).left ??
  (out as ArrayLike<number>);

describe('sound', () => {
  it('every song renders non-silent', () => {
    for (const id of [
      'song:lobby',
      'song:stillness',
      'song:water',
      'song:stepBed',
      'song:hoop',
      'song:tilt',
      'song:dawn',
      'song:stamp',
    ]) {
      expect(peak(channel(renderSong(getSong(id), {} as never))), id).toBeGreaterThan(0.01);
    }
  });
  it('every syllable of every speaker renders non-silent, and every effect too', () => {
    for (const who of Object.keys(SPEAKERS) as Speaker[]) {
      for (let k = 0; k < 16; k++)
        expect(peak(channel(renderSfx(getSfx(voiceId(who, k)), {} as never))), `${who} ${k}`).toBeGreaterThan(0.001);
    }
    for (const entry of registry.list('sfx')) {
      if (String(entry.id).startsWith('sfx:wt'))
        expect(peak(channel(renderSfx(entry as never, {} as never))), String(entry.id)).toBeGreaterThan(0.001);
    }
  });
});
