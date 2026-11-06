/**
 * @file The shift with no browser: a new night reaches a briefing, a win reaches the next scene, and ten quiet
 * seconds on the title become the kiosk.
 */
import { describe, expect, it } from 'vitest';
import { ATTRACT, accept, act, createCampaign, desiredRun, finishOp, items, tickFront } from './campaign';

describe('campaign', () => {
  it('walks a new shift as far as the first briefing', () => {
    const campaign = createCampaign();
    act(campaign, 'new');
    expect(campaign.screen).toBe('story');
    expect(campaign.storyId).toBe('before-1');
    let steps = 0;
    while (campaign.screen === 'story' && steps < 40) {
      accept(campaign);
      steps += 1;
    }
    expect(steps).toBeLessThanOrEqual(40);
    expect(campaign.screen).toBe('brief');
    accept(campaign);
    expect(campaign.screen).toBe('op');
    expect(desiredRun(campaign)).toBe('op:case:first-cut');
  });

  it('records a win and then the scene after the case', () => {
    const campaign = createCampaign();
    act(campaign, 'new');
    for (let i = 0; i < 40 && campaign.screen !== 'op'; i++) accept(campaign);
    expect(campaign.screen).toBe('op');
    finishOp(campaign, true, 16815, 0, '');
    expect(campaign.screen).toBe('debrief');
    expect(campaign.lastRank).toBe('S');
    expect(campaign.progress.ranks[0]).toBe('S');
    accept(campaign);
    expect(campaign.screen).toBe('story');
    expect(campaign.storyId).toBe('after-1');
  });

  it('starts the kiosk after ten seconds on the title and leaves it on a press', () => {
    const campaign = createCampaign();
    tickFront(campaign, 9999, false);
    expect(campaign.screen).toBe('title');
    tickFront(campaign, 2, false);
    expect(campaign.screen).toBe('attract');
    expect(ATTRACT.reduce((sum, clip) => sum + clip.ms, 0)).toBeGreaterThan(170000);
    const before = items(campaign);
    expect(before).toEqual([]);
    accept(campaign);
    expect(campaign.screen).toBe('title');
  });
});
