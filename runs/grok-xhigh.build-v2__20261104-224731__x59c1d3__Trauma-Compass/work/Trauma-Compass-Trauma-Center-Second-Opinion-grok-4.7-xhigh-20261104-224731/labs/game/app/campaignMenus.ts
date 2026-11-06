/**
 * @file Menu rows for each front-end screen: title, board, briefing, pause, settings, and dev mode.
 */
import type { Campaign, Item } from './campaign';
import { storyCases } from '../op/cases';

export function items(c: Campaign): Item[] {
  if (c.screen === 'title') {
    const rows: Item[] = [];
    if (c.progress.cleared > 0 && c.progress.cleared < storyCases().length)
      rows.push({ id: 'continue', label: 'Continue' });
    rows.push(
      { id: 'new', label: 'New Shift' },
      { id: 'board', label: 'The Board' },
      { id: 'scrub', label: 'Scrub In' },
    );
    rows.push({ id: 'settings', label: 'Settings' }, { id: 'about', label: 'About' });
    return rows;
  }
  if (c.screen === 'board')
    return [
      { id: 'play', label: 'Open case' },
      { id: 'postcards', label: 'Postcards' },
      { id: 'back', label: 'Back' },
    ];
  if (c.screen === 'brief')
    return [
      { id: 'start', label: 'Start' },
      { id: 'back', label: 'Back' },
    ];
  if (c.screen === 'debrief') {
    return c.won
      ? [{ id: 'next', label: 'Continue' }]
      : [
          { id: 'retry', label: 'Retry case' },
          { id: 'board', label: 'The Board' },
        ];
  }
  if (c.screen === 'pause') {
    return [
      { id: 'resume', label: 'Resume' },
      { id: 'phase', label: 'Retry phase' },
      { id: 'retry', label: 'Retry case' },
      { id: 'handbook', label: 'Handbook' },
      { id: 'settings', label: 'Settings' },
      { id: 'controls', label: 'Controls' },
      { id: 'dev', label: 'Dev Mode' },
      { id: 'board', label: 'Quit to Board' },
    ];
  }
  if (c.screen === 'settings') return settingsItems(c);
  if (c.screen === 'handbook') return [{ id: 'back', label: 'Back' }];
  if (c.screen === 'about' || c.screen === 'credits')
    return [{ id: 'back', label: c.screen === 'credits' ? 'Title' : 'Back' }];
  if (c.screen === 'scrub')
    return [
      { id: 'start', label: 'Start' },
      { id: 'back', label: 'Back' },
    ];
  if (c.screen === 'dev') return devItems(c);
  return [];
}

function settingsItems(c: Campaign): Item[] {
  const p = c.progress;
  const pages = [
    [
      { id: 'master', label: `Master ${p.master}` },
      { id: 'music', label: `Music ${p.music}` },
      { id: 'effects', label: `Effects ${p.effects}` },
      { id: 'voice', label: `Voice ${p.voice}` },
    ],
    [{ id: 'glyphs', label: `Glyphs ${p.glyphs === 'xbox' ? 'Xbox' : 'PlayStation'}` }],
    [
      { id: 'difficulty', label: `Difficulty ${p.difficulty}` },
      { id: 'simple', label: `Simple Gift ${p.simple ? 'on' : 'off'}` },
      { id: 'autoText', label: `Auto text ${p.autoText ? 'on' : 'off'}` },
    ],
    [{ id: 'blood', label: `Blood ${p.blood}` }],
  ];
  return [...pages[c.page]!, { id: 'back', label: 'Back' }];
}

function devItems(c: Campaign): Item[] {
  const tabs = ['Play', 'Balance', 'View', 'Author', 'Data'];
  if (c.devTab === 1)
    return [
      { id: 'reset', label: 'Reset sliders' },
      { id: 'back', label: 'Back' },
    ];
  if (c.devTab === 2)
    return [
      { id: 'hud', label: c.hideHud ? 'Show HUD' : 'Hide HUD' },
      { id: 'fly', label: 'Free camera' },
      { id: 'back', label: 'Back' },
    ];
  if (c.devTab === 4)
    return [
      { id: 'copy', label: 'Copy replay' },
      { id: 'back', label: 'Back' },
    ];
  if (c.devTab === 3) return [{ id: 'back', label: 'Back' }];
  return [
    { id: 'win', label: 'Win phase' },
    { id: 'fail', label: 'Fail phase' },
    { id: 'heal', label: 'Restore vitals' },
    { id: 'freezeVitals', label: 'Freeze vitals' },
    { id: 'freezeClock', label: 'Freeze clock' },
    { id: 'gift', label: 'Infinite Gift' },
    { id: 'oneHit', label: 'One-hit strains' },
    { id: 'spawn', label: 'Spawn a Lull' },
    { id: 'unlock', label: 'Unlock the board' },
    { id: 'auto', label: 'Autoplay' },
    { id: 'step', label: 'Frame step' },
    { id: 'slow', label: 'Quarter speed' },
    { id: 'fast', label: 'Four times' },
    { id: 'tab', label: `Tab ${tabs[c.devTab]}` },
    { id: 'back', label: 'Back' },
  ];
}
