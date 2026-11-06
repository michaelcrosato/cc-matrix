/**
 * @file What the screens share: the small interface a screen has, what the app gives them, and a card grid with focus.
 *
 * Game code, a page's.
 *
 * @example
 * // class Pause implements Screen { name = 'pause'; ... }
 */
import type { Engine, Input, Store } from '../../../../engine';
import type { Flow } from '../../scenes/components';
import type { Sound } from '../../audio/sound';
import type { Device, GlyphSet } from '../glyphs';
import type { SaveData, SettingsData } from '../save';
import { Repeat } from '../panel';

/** A front-end screen. */
export interface Screen {
  readonly name: string;
  /** Whether it holds the sim's input while open. Everything but the touch page does. */
  readonly modal?: boolean;
  update(input: Input, dt: number): void;
  remove(): void;
  /** Refills itself after the settings changed. */
  refresh?(): void;
}

/** What screens get from the app. */
export interface AppHost {
  readonly root: HTMLElement;
  readonly engine: Engine;
  readonly store: Store;
  readonly sound: Sound;
  save: SaveData;
  settings: SettingsData;
  readonly session: boolean;
  /** The device used last, and the icons. */
  device(): Device;
  glyphs(): GlyphSet;
  /** A setting's value now, by path. */
  setting(path: string): unknown;
  /** Whether nothing is being kept (the dev's throwaway save). */
  throwaway: boolean;
  /** The dev's free camera. */
  freeCamera: boolean;
  /** The dev's state overlay. */
  overlay: { on: boolean };
  /** Whether anyone has pressed anything yet. */
  sawInput(): boolean;
  /** The sim's flow now. */
  flow(): Flow | null;
  /** Runs a scene action. */
  act(name: string, args?: unknown): void;
  /** Opens a screen on top. */
  open(screen: Screen): void;
  /** Closes the top screen. */
  close(screen?: Screen): void;
  /** Closes all screens. */
  closeAll(): void;
  /** Keeps the settings, and applies them. */
  applySettings(): void;
  /** Keeps the save. */
  writeSave(): void;
  /** A sound cue, for menus. */
  cue(what: 'move' | 'pick' | 'cancel'): void;
  /** Starts play from the save, at the Plaza. */
  beginPlay(): void;
  /** Goes back to the title. */
  toTitle(): void;
  /** A running free play goes back to the board after results. */
  freePlay: boolean;
  /** The dev cheats. */
  cheats: { bot: boolean; god: boolean };
}

/** A layer that covers the screen. */
export function layer(parent: HTMLElement, scrim = true): HTMLElement {
  const el = document.createElement('div');
  el.className = `tf-layer ${scrim ? 'tf-scrim' : ''}`;
  parent.append(el);
  return el;
}

/** A card in a grid. */
export interface Card {
  id: string;
  title: string;
  sub?: string;
  stamp?: string;
  disabled?: boolean;
}

/** A grid of cards with focus: directions, hover, click; page keys page. */
export class CardGrid {
  readonly el: HTMLElement;
  private els: HTMLElement[] = [];
  private index = 0;
  private repeat = new Repeat();
  active = true;

  private cards: Card[];
  private columns: number;
  private onPick: (id: string) => void;
  private cue: (what: 'move' | 'pick' | 'cancel') => void;

  constructor(
    parent: HTMLElement,
    cards: Card[],
    columns: number,
    onPick: (id: string) => void,
    cue: (what: 'move' | 'pick' | 'cancel') => void,
  ) {
    this.cards = cards;
    this.columns = columns;
    this.onPick = onPick;
    this.cue = cue;
    this.el = document.createElement('div');
    this.el.className = 'tf-cards';
    this.el.dataset.ui = 'cards';
    this.el.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    parent.append(this.el);
    this.draw();
  }

  /** Replaces the cards. */
  setCards(cards: Card[]): void {
    this.cards = cards;
    this.index = Math.min(this.index, Math.max(0, cards.length - 1));
    this.draw();
  }

  private draw(): void {
    this.el.textContent = '';
    this.els = this.cards.map((card, i) => {
      const el = document.createElement('div');
      el.className = 'tf-card';
      el.dataset.ui = 'item';
      el.dataset.id = card.id;
      if (card.disabled) el.dataset.disabled = 'true';
      const title = document.createElement('div');
      title.textContent = card.title;
      el.append(title);
      if (card.sub) {
        const sub = document.createElement('small');
        sub.textContent = card.sub;
        el.append(sub);
      }
      if (card.stamp) {
        const stamp = document.createElement('div');
        stamp.className = 'tf-stamp';
        stamp.textContent = card.stamp;
        el.append(stamp);
      }
      el.addEventListener('pointermove', (event) => {
        if ((event.movementX !== 0 || event.movementY !== 0) && i !== this.index) {
          this.index = i;
          this.cue('move');
          this.mark();
        }
      });
      el.addEventListener('click', () => {
        this.index = i;
        this.mark();
        this.pick();
      });
      this.el.append(el);
      return el;
    });
    this.mark();
  }

  private mark(): void {
    this.els.forEach((el, i) => {
      el.dataset.focus = i === this.index ? 'true' : 'false';
    });
  }

  /** Puts the focus on a card. */
  focus(id: string): void {
    const at = this.cards.findIndex((c) => c.id === id);
    if (at >= 0) {
      this.index = at;
      this.mark();
    }
  }

  /** The focused card's id. */
  get focused(): string {
    return this.cards[this.index]?.id ?? '';
  }

  private pick(): void {
    const card = this.cards[this.index];
    if (!card || card.disabled) return;
    this.cue('pick');
    this.onPick(card.id);
  }

  /** One frame. */
  update(input: Input, dt: number): void {
    if (!this.active || !this.cards.length) return;
    const n = this.cards.length;
    const move = (to: number) => {
      if (to !== this.index && to >= 0 && to < n) {
        this.index = to;
        this.cue('move');
        this.mark();
      }
    };
    if (this.repeat.fire(input, 'uiLeft', dt)) move(this.index - 1);
    if (this.repeat.fire(input, 'uiRight', dt)) move(this.index + 1);
    if (this.repeat.fire(input, 'uiUp', dt)) move(this.index - this.columns);
    if (this.repeat.fire(input, 'uiDown', dt)) move(this.index + this.columns);
    if (input.pressed('uiAccept')) this.pick();
  }
}
