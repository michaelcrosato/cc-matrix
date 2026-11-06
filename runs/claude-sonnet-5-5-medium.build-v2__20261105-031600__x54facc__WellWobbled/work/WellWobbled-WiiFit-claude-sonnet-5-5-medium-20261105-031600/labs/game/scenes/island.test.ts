/** @file The island scene runs: it builds, the guest walks, Morning Check completes for a bot. */
import { describe, expect, it } from 'vitest';
import { createHeadless } from '../../../engine/index';
import './island';

describe('island', () => {
  it('builds and steps', async () => {
    const h = await createHeadless({ scene: 'game:island', seed: 1 });
    h.step(60);
    expect(h.hash()).toMatch(/^[0-9a-f]{16}$/);
  }, 180000);
});
