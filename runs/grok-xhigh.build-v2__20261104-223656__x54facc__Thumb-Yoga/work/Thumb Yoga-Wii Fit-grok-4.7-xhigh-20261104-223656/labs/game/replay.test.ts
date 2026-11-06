/**
 * @file The shipped golden and a capture. Both go through the bench scene the game ships.
 * Restore continues from the captured step. The golden's hashes are the recording's.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createHeadless } from '../../engine';
import { createAppHost } from '../../engine/app/headless';
import { bench } from './scenes/bench';

describe('replay', () => {
  it('restores a capture and continues the golden', async () => {
    const run = createAppHost({ scene: bench, seed: 1 });
    for (let i = 0; i < 30; i++) run.stepOnce({});
    const world = run.session.world;
    const snap = world.capture();
    const hash = world.hash();
    for (let i = 0; i < 10; i++) run.stepOnce({ move: [1, 0] });
    expect(world.hash()).not.toBe(hash);
    world.restore(snap);
    expect(world.hash()).toBe(hash);

    const text = readFileSync(new URL('./replays/still.replay.json', import.meta.url), 'utf8');
    const golden = JSON.parse(text) as { hashes: { 'linux-x64': Record<string, string> } };
    const engine = await createHeadless({ scene: bench });
    const played = await (engine.replay as (body: string) => Promise<{ hashes: Record<string, string> }>)(text);
    expect(played.hashes).toEqual(golden.hashes['linux-x64']);
  });
});
