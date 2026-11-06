/**
 * @file Dev Mode, reachable from the pause menu (PLAN.md section 8): live sliders with Reset per group and for all; jumps to
 * any day, activity or finale step; finish now at a chosen rank; cheats; time scale, frame step, free camera, a state overlay,
 * seed, and copying the tuned settings as JSON. Works with pad, keyboard and mouse. Absent in hub sessions.
 *
 * Game code, a page's.
 *
 * @example
 * // host.open(new DevScreen(host));
 */
import type { Inspector, Input } from '../../../../engine';
import { BOARD } from '../../scenes/data/days';
import { SLIDER_GROUPS } from '../../scenes/settings';
import { Panel, type Row } from '../panel';
import { NEW_SAVE } from '../save';
import { TITLES } from './programme';
import { layer, type AppHost, type Screen } from './types';

/** A setting's schema, as describe gives it. */
interface Described {
  default: number;
  minimum: number;
  maximum: number;
  unit?: string;
  description?: string;
}

/** The overlay of state, while it is on. */
export class StateOverlay {
  readonly el: HTMLElement;
  on = false;
  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'tf-chip';
    this.el.dataset.ui = 'state';
    this.el.style.cssText =
      'left:var(--safe);bottom:var(--safe);white-space:pre;font-size:2.7vh;font-weight:600;display:none';
    parent.append(this.el);
  }
  update(text: string): void {
    this.el.style.display = this.on ? '' : 'none';
    if (this.on) this.el.textContent = text;
  }
}

/** Dev Mode. */
export class DevScreen implements Screen {
  readonly name = 'dev';
  readonly modal = true;
  private el: HTMLElement;
  private panel: Panel;
  private ins: Inspector;
  private scale = 1;
  private stack: (() => Row[])[] = [];
  private head: HTMLElement;
  private free = false;

  private host: AppHost;

  constructor(host: AppHost) {
    this.host = host;
    this.el = layer(host.root);
    this.ins = host.engine.inspector!;
    this.panel = new Panel(this.el, {
      id: 'dev',
      title: 'Dev Mode',
      rows: [],
      sound: (cue) => host.cue(cue),
      onCancel: () => this.back(),
      onPick: (id) => this.pick(id),
    });
    this.head = this.panel.el.querySelector('.tf-h1')!;
    this.go('Dev Mode', () => this.mainRows());
  }

  private actions: Record<string, () => void> = {};

  /** Shows a page of rows. */
  private go(title: string, rows: () => Row[]): void {
    this.stack.push(rows);
    this.head.textContent = title;
    this.panel.setRows(rows(), true);
  }

  private back(): void {
    this.stack.pop();
    const rows = this.stack[this.stack.length - 1];
    if (!rows) this.host.close(this);
    else {
      this.head.textContent = 'Dev Mode';
      this.panel.setRows(rows(), true);
    }
  }

  private pick(id: string): void {
    this.actions[id]?.();
  }

  /** A row that does something. */
  private doRow(id: string, label: string, run: () => void, value?: () => string): Row {
    this.actions[id] = run;
    return value ? { id, label, value, adjust: run } : { id, label };
  }

  private mainRows(): Row[] {
    return [
      this.doRow('sliders', 'Live sliders', () => this.go('Sliders', () => this.groupRows())),
      this.doRow('jumps', 'Jumps', () => this.go('Jumps', () => this.jumpRows())),
      this.doRow('cheats', 'Cheats', () => this.go('Cheats', () => this.cheatRows())),
      this.doRow('tools', 'Tools', () => this.go('Tools', () => this.toolRows())),
      this.doRow('close', 'Close', () => this.host.close(this)),
    ];
  }

  private groupRows(): Row[] {
    return [
      ...SLIDER_GROUPS.map((group, i) =>
        this.doRow(`group${i}`, group.title, () => this.go(group.title, () => this.sliderRows(i))),
      ),
      this.doRow('resetAll', 'Reset all to defaults', () => {
        for (const group of SLIDER_GROUPS) for (const path of group.paths) this.resetPath(path);
        this.panel.refresh();
      }),
    ];
  }

  private schema(path: string): Described {
    const { fields } = this.ins.describe('setting', path) as { fields: { key: string; value: unknown }[] };
    return Object.fromEntries(fields.map((f) => [f.key, f.value])) as unknown as Described;
  }

  private resetPath(path: string): void {
    this.ins.set(path, this.schema(path).default);
  }

  /** The value a setting has now. */
  private value(path: string): number {
    return Number(this.host.setting(path) ?? this.schema(path).default);
  }

  /** What has been set here. */
  private tuned = new Map<string, number>();

  private sliderRows(index: number): Row[] {
    const group = SLIDER_GROUPS[index];
    const rows: Row[] = group.paths.map((path) => {
      const s = this.schema(path);
      const set = (v: number) => {
        const clamped = Math.max(s.minimum, Math.min(s.maximum, v));
        this.tuned.set(path, clamped);
        this.ins.set(path, clamped);
        this.panel.refresh();
      };
      const step = (s.maximum - s.minimum) / 40;
      return {
        id: path,
        label: path.replace('game.', ''),
        value: () => this.value(path).toFixed(2),
        bar: () => (this.value(path) - s.minimum) / (s.maximum - s.minimum),
        adjust: (dir) => set(this.value(path) + dir * step),
        setBar: (u) => set(s.minimum + u * (s.maximum - s.minimum)),
      } satisfies Row;
    });
    rows.push(
      this.doRow(`reset${index}`, 'Reset this group', () => {
        for (const path of group.paths) {
          this.resetPath(path);
          this.tuned.delete(path);
        }
        this.panel.refresh();
      }),
    );
    return rows;
  }

  private jumpRows(): Row[] {
    const { host } = this;
    const leave = () => {
      this.host.closeAll();
    };
    return [
      ...[1, 2, 3, 4, 5, 6].map((day) =>
        this.doRow(`day${day}`, day > 5 ? 'To After' : `To Day ${day}`, () => {
          leave();
          host.act('game.day', { day });
        }),
      ),
      ...BOARD.map((id) =>
        this.doRow(`act-${id}`, `Start ${TITLES[id] ?? id}`, () => {
          leave();
          host.act('game.start', { event: id });
        }),
      ),
      ...['storm', 'east', 'weights', 'stone', 'dawn'].map((phase) =>
        this.doRow(`tilt-${phase}`, `Finale: ${phase}`, () => {
          leave();
          host.act('game.tiltStep', { phase });
        }),
      ),
      ...(
        [
          ['Present', 150],
          ['Adequate', 400],
          ['Composed', 650],
          ['Serene', 800],
          ['Unsettling', 950],
        ] as const
      ).map(([name, score]) =>
        this.doRow(`finish-${name}`, `Finish now: ${name}`, () => {
          leave();
          host.act('game.finish', { score });
        }),
      ),
    ];
  }

  private cheatRows(): Row[] {
    const { host } = this;
    return [
      this.doRow(
        'bot',
        'Bot plays for me',
        () => {
          host.cheats.bot = !host.cheats.bot;
          host.applySettings();
          this.panel.refresh();
        },
        () => (host.cheats.bot ? 'On' : 'Off'),
      ),
      this.doRow(
        'god',
        'No topple',
        () => {
          host.cheats.god = !host.cheats.god;
          host.applySettings();
          this.panel.refresh();
        },
        () => (host.cheats.god ? 'On' : 'Off'),
      ),
      this.doRow('unlock', 'Unlock everything', () => {
        host.act('game.unlock');
      }),
      this.doRow('pebbles', 'Give 10 pebbles', () => host.act('game.give', { pebbles: 10 })),
      this.doRow(
        'throwaway',
        'Throwaway save',
        () => {
          host.throwaway = !host.throwaway;
          this.panel.refresh();
        },
        () => (host.throwaway ? 'On: nothing is kept' : 'Off'),
      ),
      this.doRow('wipe', 'Reset save', () => {
        host.save = { ...NEW_SAVE };
        host.writeSave();
        host.closeAll();
        host.toTitle();
      }),
    ];
  }

  private toolRows(): Row[] {
    const ins = this.ins;
    const scales = [0.25, 1, 4];
    return [
      this.doRow(
        'scale',
        'Time scale',
        () => {
          this.scale = scales[(scales.indexOf(this.scale) + 1) % scales.length];
          (ins.timeScale as (k: number) => number)(this.scale);
          this.panel.refresh();
        },
        () => `${this.scale}x`,
      ),
      this.doRow('stepone', 'Frame step', () => {
        ins.step(1);
      }),
      this.doRow(
        'fly',
        'Free camera',
        () => {
          this.free = !this.free;
          this.host.freeCamera = this.free;
          this.panel.refresh();
        },
        () => (this.free ? 'On' : 'Off'),
      ),
      this.doRow(
        'overlay',
        'State overlay',
        () => {
          this.host.overlay.on = !this.host.overlay.on;
          this.panel.refresh();
        },
        () => (this.host.overlay.on ? 'On' : 'Off'),
      ),
      this.doRow(
        'seed',
        'New seed',
        () => {
          const next = (ins.seed() as number) + 1;
          this.host.closeAll();
          ins.seed(next);
          this.host.beginPlay();
        },
        () => String(ins.seed()),
      ),
      this.doRow('copy', 'Copy tuned settings', () => {
        const out = Object.fromEntries(this.tuned);
        void navigator.clipboard?.writeText(JSON.stringify(out, null, 2));
        (window as unknown as { __tuned?: unknown }).__tuned = out;
        this.host.sound.play('sfx:good');
      }),
    ];
  }

  update(input: Input, dt: number): void {
    this.panel.update(input, dt);
  }

  remove(): void {
    this.el.remove();
  }
}
