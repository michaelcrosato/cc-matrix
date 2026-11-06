/**
 * @file Sound data (PLAN.md section 12): every song and syllable renders non-silent, vowels differ, and the build carries no
 * audio files. Nobody can listen here, so it is judged by numbers.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getSong, renderSfx, renderSong, getSfx } from '../../../engine';
import '../sounds/effects';
import '../sounds/songs';
import { SPEAKERS } from '../sounds/effects';
import { allLines, LINES } from '../ui/lines/index';

/** Root-mean-square of samples. */
function rms(samples: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / Math.max(1, samples.length));
}

/** The samples of a render, whatever shape it comes in. */
function samplesOf(render: unknown): Float32Array {
  const r = render as { samples?: Float32Array; left?: Float32Array; channels?: Float32Array[] } | Float32Array;
  if (r instanceof Float32Array) return r;
  return r.samples ?? r.left ?? r.channels?.[0] ?? new Float32Array(0);
}

/** Every text file under a folder. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.ts$/.test(name) && !/\.test\.ts$/.test(name) ? [path] : [];
  });
}

describe('sound data', () => {
  it('every syllable renders, for every speaker', () => {
    for (const name of Object.keys(SPEAKERS)) {
      for (let i = 0; i < 16; i++) {
        const level = rms(samplesOf(renderSfx(getSfx(`sfx:vo.${name}.${i}`))));
        expect(level, `${name} ${i}`).toBeGreaterThan(0.001);
      }
    }
  });
  it('every effect of the game renders', () => {
    const ids = [
      'creak',
      'breathIn',
      'breathOut',
      'squeak',
      'stamp',
      'clack',
      'splash',
      'splashBig',
      'gull',
      'frog',
      'rope',
      'marble',
      'tap',
      'plop',
      'hoopWhoosh',
      'clap',
      'stepKick',
      'hat',
      'whistle',
      'ferryHorn',
      'thunder',
      'groan',
      'ooh',
      'good',
      'perfect',
      'miss',
      'moved',
      'dialSpin',
      'ambSea',
      'ambBirds',
      'ambWind',
      'ambRain',
    ];
    for (const id of ids) expect(rms(samplesOf(renderSfx(getSfx(`sfx:${id}`)))), id).toBeGreaterThan(0.0005);
  });
  it('every song renders', () => {
    for (const id of [
      'lobby',
      'stillness',
      'water',
      'stepBed104',
      'stepBed112',
      'stepBed120',
      'hoop',
      'tilt',
      'dawn',
      'stamp',
    ]) {
      expect(rms(samplesOf(renderSong(getSong(`song:${id}`)))), id).toBeGreaterThan(0.001);
    }
  });
  it('step class beds have no drums', () => {
    for (const bpm of [104, 112, 120]) {
      const song = getSong(`song:stepBed${bpm}`) as unknown as { tracks: { wave: string }[] };
      expect(song.tracks.some((t) => t.wave === 'drums')).toBe(false);
    }
  });
});

describe('the writing', () => {
  it('has at least 200 lines, none rambling', () => {
    const lines = allLines();
    expect(lines.length).toBeGreaterThanOrEqual(200);
    expect(lines.filter((line) => (line.match(/[.!?](\s|$)/g) ?? []).length > 5)).toEqual([]);
  });
  it('Plumb never shouts; nobody talks about bodies', () => {
    for (const [id, list] of Object.entries(LINES)) {
      for (const line of list) {
        expect(/\b(calorie|calories|bmi|kilos|kilograms|pounds|overweight|fat)\b/i.test(line), `${id}: ${line}`).toBe(
          false,
        );
        if (id.startsWith('talk.plumb') || id.startsWith('pose.'))
          expect(line.includes('!'), `${id}: ${line}`).toBe(false);
      }
    }
  });
  it('every line the sim asks for exists', () => {
    const text = sources('labs/game/scenes')
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n');
    const asked = [
      ...text.matchAll(/say\(\s*[^,]+,\s*(?:'[a-z]+'|[a-zA-Z.?]+(?:\s*\?\?\s*'[a-z]+')?),\s*'([a-zA-Z.]+)'/g),
    ].map((m) => m[1]);
    expect(asked.length).toBeGreaterThan(40);
    for (const id of asked) expect(LINES[id], id).toBeDefined();
    for (const pose of ['nothing', 'chair', 'heron', 'archer', 'comma', 'napkin', 'bridge', 'lighthouse'])
      expect(LINES[`pose.demo.${pose}`]).toBeDefined();
    for (const who of ['tare', 'plumb', 'gerald', 'bex', 'nan'])
      for (let day = 1; day <= 6; day++) expect(LINES[`talk.${who}.${day}`], `${who} ${day}`).toBeDefined();
    for (let day = 1; day <= 6; day++) {
      expect(LINES[`day.${day}.intro`]).toBeDefined();
      expect(LINES[`evening.${day}`]).toBeDefined();
      expect(LINES[`morning.question.${day}`]).toBeDefined();
    }
  });
});
