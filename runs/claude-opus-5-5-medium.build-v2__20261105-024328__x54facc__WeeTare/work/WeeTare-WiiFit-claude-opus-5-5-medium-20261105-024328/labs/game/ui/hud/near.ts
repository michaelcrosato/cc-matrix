/**
 * @file The prompt beside the thing you could use on the island.
 */
import { ACTIVITIES } from '../../scenes/events';
import type { Flow } from '../../scenes/types';
import { prompt } from '../glyphs';

const VERBS: Readonly<Record<string, string>> = {
  npc: 'Talk',
  plaque: 'Read',
  board: 'Noticeboard',
  hut: 'Sleep',
  bench: 'Sit',
};

export function drawNear(near: HTMLElement, flow: Flow, free: boolean): void {
  const on = flow.mode === 'roam' && !!flow.near && free;
  near.style.display = on ? '' : 'none';
  if (!on || near.dataset.near === flow.near) return;
  near.dataset.near = flow.near;
  const [kind, id] = flow.near.split(':');
  near.innerHTML = prompt(
    'use',
    VERBS[kind] ?? `Begin ${ACTIVITIES[id]?.title ?? (id === 'group' ? 'Group Class' : id)}`,
  );
}
