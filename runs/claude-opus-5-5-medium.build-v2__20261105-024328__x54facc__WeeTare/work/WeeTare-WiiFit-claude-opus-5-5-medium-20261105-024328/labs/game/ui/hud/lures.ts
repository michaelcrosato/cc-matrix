/**
 * @file Still Pond's lures as the screen shows them: big prompts for your device, a fake pause menu, a fake disconnect
 * message, fake credits. Each is exactly what it pretends to be, so pressing is your fault.
 */
import type { EvState } from '../../scenes/types';
import { glyphs } from '../glyphs';
import { TITLE } from '../titles';

const LURES: Readonly<Record<string, () => string>> = {
  pressNow: () =>
    `<div class="wt-big" style="display:flex;gap:2vh;align-items:center">${glyphs('use')} PRESS NOW</div>`,
  psst: () =>
    `<div class="wt-panel wt-body" style="display:flex;gap:1vh;align-items:center">${glyphs('use')} Yes</div>`,
  phone: () => '<div class="wt-panel wt-body">Buzz buzz. One new stone.</div>',
  fakePause: () =>
    '<div class="wt-panel"><div class="wt-h">Paused</div><div class="wt-menu"><div class="wt-row" data-focus="1">Resume</div><div class="wt-row">Quit to Title</div></div></div>',
  disconnect: () =>
    '<div class="wt-panel wt-body">Your controller appears to be disconnected.<br/>Press any button.</div>',
  credits: () =>
    `<div class="wt-panel wt-body"><div class="wt-h">Thanks for playing!</div>${TITLE}<br/><span style="display:inline-flex;gap:1vh;align-items:center">${glyphs('use')} Continue</span></div>`,
};

/** Draws the lure that's up. */
export function drawLure(el: HTMLElement, ev: EvState): void {
  const id = ev.id === 'pond' || ev.id === 'pondS' ? ((ev.d as { lure?: string }).lure ?? '') : '';
  if (el.dataset.lure === id) return;
  el.dataset.lure = id;
  el.dataset.ui = 'lure';
  el.innerHTML = id && LURES[id] ? LURES[id]() : '';
}
