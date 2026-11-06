/**
 * @file The one list widget of the front end: at most six rows on a page at 10 feet, focus unmistakable from a sofa. D-pad,
 * stick, arrows or hover move the focus; Cross, Enter or a click picks; left and right adjust a value row; Circle or Esc
 * cancels. It reads the engine's system layer, which no map can rebind. Plan: `createMenu` does the lists, but Settings
 * needs value rows and paging, so one widget does all of them (called out in labs/game/README.md).
 *
 * Game code, a page's.
 *
 * @example
 * // new Panel(root, { title: 'Paused', rows: [{ id: 'resume', label: 'Resume' }], onPick: (id) => close() });
 */
import type { Input } from '../../../engine';

/** Rows at most, per page. */
export const MAX_ROWS = 6;

/** A row. */
export interface Row {
  id: string;
  label: string;
  /** Shown at the right, or a 0-1 bar when `bar` is set. */
  value?: () => string;
  bar?: () => number;
  /** Left and right change it. */
  adjust?: (dir: -1 | 1, big: boolean) => void;
  /** Dragging the bar sets it, 0 to 1. */
  setBar?: (u: number) => void;
  disabled?: boolean;
}

/** What a panel takes. */
export interface PanelOptions {
  id: string;
  title?: string;
  sub?: string;
  rows: Row[];
  onPick?: (id: string) => void;
  onCancel?: () => void;
  sound?: (cue: 'move' | 'pick' | 'cancel') => void;
  /** A class for where it sits. */
  className?: string;
  /** Rows on a page, if fewer than the most. */
  perPage?: number;
}

/** A repeating direction: fires at once, again after 0.35 s, then every 0.11 s. */
export class Repeat {
  private held = new Map<string, number>();
  fire(input: Input, action: string, dt: number): boolean {
    if (input.pressed(action)) {
      this.held.set(action, 0);
      return true;
    }
    if (!input.held(action)) {
      this.held.delete(action);
      return false;
    }
    const before = this.held.get(action) ?? 0;
    // A slow frame is not a held key: it counts for a tenth of a second at most.
    const now = before + Math.min(dt, 0.1);
    this.held.set(action, now);
    const count = (t: number) => (t < 0.35 ? 0 : 1 + Math.floor((t - 0.35) / 0.11));
    return count(now) > count(before);
  }
}

/** A list of rows, paged. */
export class Panel {
  readonly el: HTMLElement;
  private rows: Row[];
  private index = 0;
  private page = 0;
  private list: HTMLElement;
  private rowEls: HTMLElement[] = [];
  private repeat = new Repeat();
  active = true;

  readonly options: PanelOptions;

  constructor(parent: HTMLElement, options: PanelOptions) {
    this.options = options;
    this.rows = options.rows;
    const el = document.createElement('div');
    el.className = `tf-panel ${options.className ?? ''}`;
    el.dataset.panel = options.id;
    if (options.title) {
      const h = document.createElement('div');
      h.className = 'tf-h1';
      h.textContent = options.title;
      el.append(h);
    }
    if (options.sub) {
      const s = document.createElement('div');
      s.className = 'tf-sub';
      s.textContent = options.sub;
      el.append(s);
    }
    this.list = document.createElement('div');
    this.list.className = 'tf-rows';
    el.append(this.list);
    parent.append(el);
    this.el = el;
    this.draw();
    this.index = this.firstEnabled();
    this.mark();
  }

  /** Rows on a page, the "More" row counting. */
  private get perPage(): number {
    return Math.min(MAX_ROWS, this.options.perPage ?? MAX_ROWS);
  }

  /** The rows on this page, with paging rows laid in. */
  private pageRows(): Row[] {
    const n = this.perPage;
    if (this.rows.length <= n) return this.rows;
    const size = n - 1;
    const pages = Math.ceil(this.rows.length / size);
    const start = this.page * size;
    const out = this.rows.slice(start, start + size);
    out.push({ id: '__more', label: this.page + 1 < pages ? 'More…' : 'Back to the top' });
    return out;
  }

  private firstEnabled(): number {
    const rows = this.pageRows();
    const i = rows.findIndex((r) => !r.disabled);
    return i < 0 ? 0 : i;
  }

  /** Builds this page's elements. */
  private draw(): void {
    this.list.textContent = '';
    this.rowEls = this.pageRows().map((row, i) => {
      const el = document.createElement('div');
      el.className = 'tf-row';
      el.dataset.ui = 'item';
      el.dataset.id = row.id;
      if (row.disabled) el.dataset.disabled = 'true';
      const label = document.createElement('span');
      label.textContent = row.label;
      el.append(label);
      if (row.value || row.bar) {
        const value = document.createElement('span');
        value.className = 'tf-value';
        if (row.bar) {
          const bar = document.createElement('span');
          bar.className = 'tf-bar';
          bar.append(document.createElement('i'));
          value.append(bar);
          const set = (event: PointerEvent) => {
            const box = bar.getBoundingClientRect();
            row.setBar?.(Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)));
          };
          bar.addEventListener('pointerdown', (event) => {
            event.stopPropagation();
            set(event);
            bar.setPointerCapture(event.pointerId);
          });
          bar.addEventListener('pointermove', (event) => {
            if (event.buttons) set(event);
          });
        }
        const text = document.createElement('span');
        text.dataset.value = '1';
        value.append(text);
        el.append(value);
      }
      el.addEventListener('pointermove', (event) => {
        if ((event.movementX !== 0 || event.movementY !== 0) && this.active && !row.disabled && this.index !== i) {
          this.index = i;
          this.options.sound?.('move');
          this.mark();
        }
      });
      el.addEventListener('click', () => {
        if (!this.active || row.disabled) return;
        this.index = i;
        this.mark();
        if (row.adjust && !row.bar) {
          row.adjust(1, false);
          this.refresh();
        } else this.pick();
      });
      this.list.append(el);
      return el;
    });
    this.refresh();
  }

  /** Marks the focused row. */
  private mark(): void {
    this.rowEls.forEach((el, i) => {
      el.dataset.focus = i === this.index ? 'true' : 'false';
    });
    this.el.dataset.focus = this.pageRows()[this.index]?.id ?? '';
  }

  /** Redraws the values. */
  refresh(): void {
    this.pageRows().forEach((row, i) => {
      const el = this.rowEls[i];
      if (!el) return;
      const text = el.querySelector<HTMLElement>('[data-value]');
      if (text && row.value) text.textContent = row.value();
      const fill = el.querySelector<HTMLElement>('.tf-bar > i');
      if (fill && row.bar) fill.style.width = `${Math.round(row.bar() * 100)}%`;
    });
  }

  /** Replaces the rows, keeping the focus where it can. */
  setRows(rows: Row[], top = false): void {
    this.rows = rows;
    if (top) this.page = 0;
    this.draw();
    this.index = top ? this.firstEnabled() : Math.min(this.index, this.pageRows().length - 1);
    this.mark();
  }

  /** The focused row's id. */
  get focused(): string {
    return this.pageRows()[this.index]?.id ?? '';
  }

  /** Moves the focus. */
  private move(dir: -1 | 1): void {
    const rows = this.pageRows();
    let at = this.index;
    for (let k = 0; k < rows.length; k++) {
      at = (at + dir + rows.length) % rows.length;
      if (!rows[at].disabled) break;
    }
    if (at !== this.index) {
      this.index = at;
      this.options.sound?.('move');
      this.mark();
    }
  }

  /** Picks the focused row. */
  pick(): void {
    const row = this.pageRows()[this.index];
    if (!row || row.disabled) return;
    if (row.id === '__more') {
      const size = this.perPage - 1;
      const pages = Math.ceil(this.rows.length / size);
      this.page = (this.page + 1) % pages;
      this.index = 0;
      this.draw();
      this.index = this.firstEnabled();
      this.mark();
      this.options.sound?.('move');
      return;
    }
    this.options.sound?.('pick');
    this.options.onPick?.(row.id);
  }

  /** One frame: reads the system layer. */
  update(input: Input, dt: number): void {
    if (!this.active) return;
    if (this.repeat.fire(input, 'uiUp', dt)) this.move(-1);
    if (this.repeat.fire(input, 'uiDown', dt)) this.move(1);
    const row = this.pageRows()[this.index];
    if (row?.adjust) {
      if (this.repeat.fire(input, 'uiLeft', dt)) {
        row.adjust(-1, false);
        this.options.sound?.('move');
        this.refresh();
      }
      if (this.repeat.fire(input, 'uiRight', dt)) {
        row.adjust(1, false);
        this.options.sound?.('move');
        this.refresh();
      }
    }
    if (input.pressed('uiAccept')) {
      if (row?.adjust && !row.bar) {
        row.adjust(1, false);
        this.refresh();
      } else this.pick();
    } else if (input.pressed('uiCancel') && this.options.onCancel) {
      this.options.sound?.('cancel');
      this.options.onCancel();
    }
    this.refresh();
  }

  /** Takes it away. */
  remove(): void {
    this.el.remove();
    this.active = false;
  }
}
