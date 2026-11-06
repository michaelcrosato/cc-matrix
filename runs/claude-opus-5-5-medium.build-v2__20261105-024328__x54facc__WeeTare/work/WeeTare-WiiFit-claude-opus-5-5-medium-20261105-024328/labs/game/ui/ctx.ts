/**
 * @file What every screen shares: the engine, the input, the sound, the save, the settings. A plain object made once in main.ts.
 */
import type { Engine, Inspector, Input, Store } from '../../../engine';
import type { Sound } from '../audio/sound';
import type { Nav } from './nav';
import type { Flow } from '../scenes/types';

export interface Settings {
  music: number;
  effects: number;
  voices: number;
  icons: 'ps' | 'xbox';
  mouse: number;
  invert: boolean;
  rumble: boolean;
  steadier: boolean;
  reduced: boolean;
  cpu: boolean;
  colour: number;
  look: number;
  headband: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  music: 0.1, effects: 0.8, voices: 0.8, icons: 'ps', mouse: 1, invert: false, rumble: true, steadier: false, reduced: false, cpu: true, colour: 0, look: 0, headband: false,
}; // prettier-ignore

/** A screen on top of play. */
export interface Screen {
  el: HTMLElement;
  update(dt: number): void;
  close?(): void;
}

export interface Ctx {
  engine: Engine;
  inspector: Inspector;
  input: Input;
  nav: Nav;
  store: Store;
  sound: Sound;
  root: HTMLElement;
  settings: Settings;
  stack: Screen[];
  run(action: string, args?: unknown): void;
  flow(): Flow;
  push(screen: Screen): void;
  pop(): void;
  clear(): void;
  say(line: string, who: string, values?: Record<string, string | number>): void;
  saveSettings(): void;
  saveGame(): void;
  hubActive: boolean;
  fade(then: () => void): void;
}

/** A centred layer with a panel. */
export function panel(ctx: Ctx, title?: string): { layer: HTMLElement; box: HTMLElement } {
  const layer = document.createElement('div');
  layer.className = 'wt-layer';
  const box = document.createElement('div');
  box.className = 'wt-panel';
  if (title) {
    const h = document.createElement('div');
    h.className = 'wt-h';
    h.textContent = title;
    box.append(h);
  }
  layer.append(box);
  ctx.root.append(layer);
  return { layer, box };
}

/** Removes a screen's layer as `close`. */
export const closer = (el: HTMLElement) => () => el.remove();
