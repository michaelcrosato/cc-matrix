/**
 * @file The game's own 10-foot menu: at most six rows, big focus, D-pad or stick and Cross, arrows and Enter, hover moves the
 * focus and a click picks. Rows may hold a value that Left and Right change. It reads the page's system layer
 * (`uiUp`, `uiAccept`…), which no action map can rebind. The engine's `createMenu` has no value rows, so this does it.
 */
import type { Nav } from './nav';

export interface Row {
  id: string;
  label: string;
  /** Text at the row's end. */
  value?: () => string;
  /** Left or right pressed: −1 or +1. */
  change?: (dir: number) => void;
  off?: boolean;
}

export interface Menu {
  el: HTMLElement;
  update(dt: number): void;
  focus(): string;
  setRows(rows: Row[]): void;
  rows(): Row[];
}

const HELD_FIRST = 0.35;
const HELD_NEXT = 0.12;

/** Makes a menu under `parent`. `onCancel` is Circle or Esc. */
export function createRows(
  parent: HTMLElement,
  list: Row[],
  input: Nav,
  onPick: (id: string) => void,
  onCancel: () => void,
  sound: (cue: string) => void = () => {},
): Menu {
  const el = document.createElement('div');
  el.className = 'wt-menu';
  el.dataset.ui = 'menu';
  parent.append(el);
  let rows = list;
  let at = Math.max(
    0,
    rows.findIndex((r) => !r.off),
  );
  let held = 0;
  let heldDir = '';
  const nodes: HTMLElement[] = [];

  const draw = () => {
    nodes.forEach((node, i) => {
      node.dataset.focus = i === at ? '1' : '0';
      const value = node.querySelector<HTMLElement>('.wt-value');
      if (value && rows[i].value) value.textContent = rows[i].value!();
    });
    el.dataset.focusId = rows[at]?.id ?? '';
  };
  const build = () => {
    el.textContent = '';
    nodes.length = 0;
    rows.forEach((row, i) => {
      const node = document.createElement('div');
      node.className = 'wt-row';
      node.dataset.id = row.id;
      node.dataset.off = row.off ? '1' : '0';
      const label = document.createElement('span');
      label.textContent = row.label;
      node.append(label);
      if (row.value) {
        const value = document.createElement('span');
        value.className = 'wt-value';
        node.append(value);
      }
      node.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'mouse' && !row.off && at !== i) {
          at = i;
          sound('move');
          draw();
        }
      });
      node.addEventListener('click', () => {
        if (row.off) return;
        at = i;
        draw();
        if (row.change) row.change(1);
        else onPick(row.id);
        draw();
      });
      el.append(node);
      nodes.push(node);
    });
    draw();
  };
  const move = (dir: number) => {
    if (!rows.length) return;
    let next = at;
    do next = (next + dir + rows.length) % rows.length;
    while (rows[next].off && next !== at);
    if (next !== at) sound('move');
    at = next;
    draw();
  };
  build();
  return {
    el,
    focus: () => rows[at]?.id ?? '',
    rows: () => rows,
    setRows(next) {
      rows = next;
      at = Math.min(at, rows.length - 1);
      build();
    },
    update(dt) {
      const dirs: [string, () => void][] = [
        ['uiUp', () => move(-1)],
        ['uiDown', () => move(1)],
        ['uiLeft', () => rows[at]?.change?.(-1)],
        ['uiRight', () => rows[at]?.change?.(1)],
      ];
      let any = false;
      for (const [name, act] of dirs) {
        if (input.pressed(name)) {
          held = HELD_FIRST;
          heldDir = name;
          act();
          draw();
        }
        if (input.held(name) && heldDir === name) {
          any = true;
          held -= dt;
          if (held <= 0) {
            held = HELD_NEXT;
            act();
            draw();
          }
        }
      }
      if (!any) heldDir = '';
      if (input.pressed('uiAccept')) {
        const row = rows[at];
        if (row && !row.off) {
          if (row.change) row.change(1);
          else onPick(row.id);
          draw();
        }
      }
      if (input.pressed('uiCancel')) onCancel();
    },
  };
}
