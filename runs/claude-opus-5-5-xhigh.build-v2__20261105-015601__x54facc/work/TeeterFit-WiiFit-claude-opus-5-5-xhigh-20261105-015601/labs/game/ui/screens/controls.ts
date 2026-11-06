/**
 * @file Controls (PLAN.md section 8): the bindings per scheme, in words and glyphs; keyboard rebinding through the engine's
 * `bindingsFor`, `rebind` and `listen`. The store keeps what you change.
 *
 * Game code, a page's.
 *
 * @example
 * // host.open(new ControlsScreen(host));
 */
import { codeLabel, type Input } from '../../../../engine';
import { Panel, type Row } from '../panel';
import { layer, type AppHost, type Screen } from './types';

/** What may be rebound on the keyboard: the balance map's actions. */
const REBINDABLE: readonly (readonly [string, string])[] = [
  ['forward', 'Lean forward'],
  ['back', 'Lean back'],
  ['left', 'Lean left'],
  ['right', 'Lean right'],
  ['footl', 'Left foot'],
  ['footr', 'Right foot'],
  ['gentle', 'Lean gently'],
  ['act', 'Skip, confirm'],
];

/** What a pad does, in words. */
const PAD_ROWS: readonly (readonly [string, string, string])[] = [
  ['Lean', 'Left stick or D-pad', 'Left stick or D-pad'],
  ['Feet', 'L2 and R2 (L1 and R1 too)', 'LT and RT (LB and RB too)'],
  ['Breathe', 'L2 + R2 together', 'LT + RT together'],
  ['On the island', 'Cross use, Square hop, Triangle Programme, Circle wave', 'A use, X hop, Y Programme, B wave'],
  ['Pause', 'Options', 'Menu'],
];

/** Controls. */
export class ControlsScreen implements Screen {
  readonly name = 'controls';
  readonly modal = true;
  private el: HTMLElement;
  private panel: Panel;
  private listening = false;

  private host: AppHost;

  constructor(host: AppHost) {
    this.host = host;
    this.el = layer(host.root);
    this.panel = new Panel(this.el, {
      id: 'controls',
      title: 'Controls',
      sub: 'Pick a key to change it, then press the new one.',
      rows: this.keyRows(),
      sound: (cue) => host.cue(cue),
      onCancel: () => host.close(this),
      onPick: (id) => this.pick(id),
    });
  }

  private bindings() {
    return this.host.engine.input!.bindingsFor('actionMap:balance');
  }

  private keyRows(): Row[] {
    const rows: Row[] = REBINDABLE.map(([action, label]) => ({
      id: action,
      label,
      value: () => {
        const code = this.bindings()
          .codes(action)
          .find((c) => !c.startsWith('Pad') && !c.startsWith('Mouse'));
        return code ? codeLabel(code) : 'None';
      },
    }));
    rows.push({ id: 'reset', label: 'Reset keys' }, { id: 'padpage', label: 'Show the pad' });
    return rows;
  }

  private padRows(): Row[] {
    const xbox = this.host.settings.glyphs === 'xbox';
    return [
      ...PAD_ROWS.map(([label, ps, xb]) => ({ id: label, label, value: () => (xbox ? xb : ps), disabled: true })),
      { id: 'keypage', label: 'Show the keys' },
    ];
  }

  private pick(id: string): void {
    if (id === 'padpage') {
      this.panel.setRows(this.padRows());
      return;
    }
    if (id === 'keypage') {
      this.panel.setRows(this.keyRows());
      return;
    }
    if (id === 'reset') {
      this.bindings().reset();
      return;
    }
    if (this.listening) return;
    this.listening = true;
    this.panel.active = false;
    const row = this.panel.el.querySelector<HTMLElement>(`[data-id="${id}"] [data-value]`);
    if (row) row.textContent = 'Press a key…';
    void this.host.engine.input!.listen('keyboard').then((code) => {
      this.listening = false;
      this.panel.active = true;
      if (code) {
        const bindings = this.bindings();
        const was = bindings.codes(id).find((c) => !c.startsWith('Pad') && !c.startsWith('Mouse'));
        const result = bindings.rebind(id, code, was ? { replace: was } : {});
        if (!result.ok) this.host.sound.play('sfx:miss');
      }
      this.panel.refresh();
    });
  }

  update(input: Input, dt: number): void {
    this.panel.update(input, dt);
  }

  remove(): void {
    this.el.remove();
  }
}
