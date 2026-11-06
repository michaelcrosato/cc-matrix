/**
 * @file The operation's content, voices, the whole-story walk, and the lockstep. These drive the shipped modules.
 */
import { describe, expect, it } from 'vitest';
import { CASES } from './cases';
import { playThrough } from './director';
import { runLockstep } from './sequencer';
import { SCENES } from './story';
import { tableComplete } from './table';
import { validateAll } from './validate';
import { voiceKey } from './voice';

describe('content', () => {
  it('accepts every case and every scene', () => {
    expect(validateAll()).toEqual([]);
    expect(CASES.length).toBe(9);
    expect(SCENES.length).toBe(18);
  });

  it('gives every scene between 12 and 35 boxes', () => {
    for (const scene of SCENES) {
      expect(scene.boxes.length).toBeGreaterThanOrEqual(12);
      expect(scene.boxes.length).toBeLessThanOrEqual(35);
    }
  });

  it('barks the same line the same way', () => {
    const line = 'The storm took the bridge.';
    expect(voiceKey('WREN', line)).toBe(voiceKey('WREN', line));
    expect(voiceKey('WREN', line)).not.toBe(voiceKey('ODIE', line));
    expect(voiceKey('WREN', line)).not.toBe(voiceKey('WREN', 'Begin.'));
  });

  it('covers every tool and kind', () => {
    expect(tableComplete()).toBe(true);
  });

  it('walks the story to credits', () => {
    const through = playThrough('resident', 1);
    expect(through.credits).toBe(true);
    expect(through.free).toBe(true);
    expect(through.attending).toBe(true);
    expect(through.ranks).toHaveLength(8);
    expect(through.scenes.length).toBe(16);
    expect(through.postcards.length).toBe(8);
  });

  it('keeps four peers on one hash through loss and a leaver', () => {
    const run = runLockstep(3600, 4);
    expect(run.dropped).toBeGreaterThan(0);
    expect(run.leftAt).toBe(1800);
    const host = run.peers[0].hashes;
    expect(host).toHaveLength(3600);
    for (const peer of run.peers) expect(peer.hashes).toEqual(host);
    expect(run.peers[0].op.seats[3].use).toBe(false);
    expect(run.peers[0].op.status).toBe('playing');
  });
});
