/**
 * @file The operation's HUD. Vitals, the clock, the score, eight tools, and one line from the room.
 * It is created once and updated by text, so a frame does not rebuild it.
 */
import type { Op } from '../op/types';
import { FIELD_SECOND } from '../op/world';

const TOOLS = ['Scalpel', 'Forceps', 'Suture', 'Drain', 'Laser', 'Syringe', 'Gel', 'Scanner'];

/** The nodes the frame writes. */
export interface Hud {
  root: HTMLElement;
  vitals: HTMLElement;
  clock: HTMLElement;
  score: HTMLElement;
  tools: HTMLElement;
  line: HTMLElement;
  sites: HTMLElement;
}

/** Build the HUD under `parent`. Hidden until an operation is on screen. */
export function createHud(parent: HTMLElement): Hud {
  const root = document.createElement('div');
  root.className = 'hud';
  root.setAttribute('data-game', 'hud');
  root.innerHTML =
    '<p class="vitals" data-game="vitals"></p><p class="clock" data-game="clock"></p><p class="score" data-game="score"></p><p class="sites" data-game="sites"></p><div class="tools" data-game="tools"></div><p class="odie" data-game="line"></p>';
  parent.append(root);
  return {
    root,
    vitals: root.querySelector('[data-game="vitals"]') as HTMLElement,
    clock: root.querySelector('[data-game="clock"]') as HTMLElement,
    score: root.querySelector('[data-game="score"]') as HTMLElement,
    tools: root.querySelector('[data-game="tools"]') as HTMLElement,
    line: root.querySelector('[data-game="line"]') as HTMLElement,
    sites: root.querySelector('[data-game="sites"]') as HTMLElement,
  };
}

/** Show the operation, or hide the bar when the theatre is a menu. */
export function paintHud(hud: Hud, op: Op | null, hidden: boolean, line: string): void {
  const show = !!op && !hidden;
  hud.root.hidden = !show;
  if (!op || !show) return;
  const patient = op.patients[0];
  const vitals = Math.round(patient?.vitals ?? 0);
  hud.vitals.textContent = op.patients
    .map((item) => `${item.name.split(' ')[0]} ${Math.round(item.vitals)}`)
    .join('  ');
  const seconds = Math.max(0, Math.ceil(op.clock / FIELD_SECOND));
  const phase = op.phases[op.phase];
  hud.clock.textContent = `${phase?.id ?? ''}  ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const chain = op.seats[0]?.chain ?? 1;
  hud.score.textContent = `${op.score}  ×${chain.toFixed(1)}`;
  hud.sites.textContent = op.sites
    .map((site, index) => (index === op.seats[0]?.site ? `[${site.name}]` : site.name))
    .join('   ');
  const tool = op.seats[0]?.tool ?? 0;
  hud.tools.innerHTML = TOOLS.map(
    (name, index) => `<span class="tool${index === tool ? ' is-on' : ''}" data-tool="${index}">${name}</span>`,
  ).join('');
  hud.line.textContent = line || (vitals < 30 ? 'The line is thin.' : '');
  hud.vitals.dataset.vitals = String(vitals);
}
