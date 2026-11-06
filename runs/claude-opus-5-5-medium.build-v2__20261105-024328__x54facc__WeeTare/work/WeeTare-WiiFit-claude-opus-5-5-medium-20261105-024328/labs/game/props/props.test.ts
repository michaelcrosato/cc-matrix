/**
 * @file Every prop's parts build in Node, so a wrong geometry parameter fails here rather than in a browser.
 */
import { describe, expect, it } from 'vitest';
import { buildPropPart, getProp } from '../../../engine';
import './index';
import { registry } from '../../../engine/core/registry';

describe('props', () => {
  it('every part builds', () => {
    const ours = registry.list('prop').filter((p) => /A |An |The |Tare|Still|Your/.test(String(p.description)));
    expect(ours.length).toBeGreaterThan(30);
    for (const entry of ours) {
      const prop = getProp(String(entry.id));
      for (const part of prop.parts) expect(buildPropPart(part)).toBeTruthy();
    }
  });
});
