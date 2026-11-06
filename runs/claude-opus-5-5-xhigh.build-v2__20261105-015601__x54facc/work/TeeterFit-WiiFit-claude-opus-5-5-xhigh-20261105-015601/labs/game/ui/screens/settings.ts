/**
 * @file Settings (PLAN.md section 8): Music (10% by default), Effects, Voices, Button icons, Mouse sensitivity, Invert look,
 * Rumble, Steadier Hands, Reduced Motion, Fullscreen, Group Class CPU guests, Erase Save with an in-game confirmation.
 *
 * Game code, a page's.
 *
 * @example
 * // host.open(new SettingsScreen(host));
 */
import type { Input } from '../../../../engine';
import { COLORS } from '../../cast/roster';
import { Panel, type Row } from '../panel';
import { NEW_SAVE } from '../save';
import { layer, type AppHost, type Screen } from './types';

/** A percentage row. */
function volume(host: AppHost, id: string, label: string, key: 'music' | 'effects' | 'voices'): Row {
  const set = (value: number) => {
    host.settings = { ...host.settings, [key]: Math.round(Math.max(0, Math.min(1, value)) * 20) / 20 };
    host.applySettings();
  };
  return {
    id,
    label,
    value: () => `${Math.round(host.settings[key] * 100)}%`,
    bar: () => host.settings[key],
    adjust: (dir) => set(host.settings[key] + dir * 0.05),
    setBar: set,
  };
}

/** A yes or no row. */
function toggle(
  host: AppHost,
  id: string,
  label: string,
  key: 'invert' | 'rumble' | 'steadier' | 'reduced' | 'cpuGuests' | 'expert',
): Row {
  return {
    id,
    label,
    value: () => (host.settings[key] ? 'On' : 'Off'),
    adjust: () => {
      host.settings = { ...host.settings, [key]: !host.settings[key] };
      host.applySettings();
    },
  };
}

/** Settings. */
export class SettingsScreen implements Screen {
  readonly name = 'settings';
  readonly modal = true;
  private el: HTMLElement;
  private panel: Panel;
  private confirm: Panel | null = null;

  private host: AppHost;

  constructor(host: AppHost) {
    this.host = host;
    this.el = layer(host.root);
    const pebbles = () => host.flow()?.pebbles ?? host.save.pebbles;
    const rows: Row[] = [
      volume(host, 'music', 'Music', 'music'),
      volume(host, 'effects', 'Effects', 'effects'),
      volume(host, 'voices', 'Voices', 'voices'),
      {
        id: 'glyphs',
        label: 'Button icons',
        value: () => (host.settings.glyphs === 'xbox' ? 'Xbox' : 'PlayStation'),
        adjust: () => {
          host.settings = { ...host.settings, glyphs: host.settings.glyphs === 'xbox' ? 'playstation' : 'xbox' };
          host.applySettings();
        },
      },
    ];
    if (!host.session) {
      rows.push(
        {
          id: 'mouse',
          label: 'Mouse sensitivity',
          value: () => `${Math.round(host.settings.mouse * 100)}%`,
          bar: () => host.settings.mouse / 2,
          adjust: (dir) => {
            host.settings = { ...host.settings, mouse: Math.max(0.25, Math.min(2, host.settings.mouse + dir * 0.25)) };
            host.applySettings();
          },
          setBar: (u) => {
            host.settings = { ...host.settings, mouse: Math.max(0.25, u * 2) };
            host.applySettings();
          },
        },
        toggle(host, 'invert', 'Invert look', 'invert'),
        toggle(host, 'rumble', 'Rumble', 'rumble'),
        toggle(host, 'steadier', 'Steadier Hands', 'steadier'),
        toggle(host, 'reduced', 'Reduced Motion', 'reduced'),
        {
          id: 'fullscreen',
          label: 'Fullscreen',
          value: () => (document.fullscreenElement ? 'On' : 'Off'),
          adjust: () => {
            if (document.fullscreenElement) void document.exitFullscreen();
            else void document.documentElement.requestFullscreen().catch(() => undefined);
          },
        },
        toggle(host, 'cpuGuests', 'CPU guests in class', 'cpuGuests'),
        {
          ...toggle(host, 'expert', 'Expert classes', 'expert'),
          disabled: pebbles() < 10,
          value: () => (pebbles() < 10 ? '10 pebbles' : host.settings.expert ? 'On' : 'Off'),
        },
        {
          id: 'suit',
          label: 'Tracksuit',
          value: () => host.save.color,
          disabled: pebbles() < 20,
          adjust: (dir) => {
            const owned = COLORS.slice(0, pebbles() >= 30 ? 6 : 4);
            const at = owned.indexOf(host.save.color as (typeof COLORS)[number]);
            host.save = { ...host.save, color: owned[(at + dir + owned.length) % owned.length] };
            host.writeSave();
            if (host.flow()?.mode === 'roam' || host.flow()?.mode === 'event')
              host.act('game.dress', { color: host.save.color, band: host.save.band });
          },
        },
        {
          id: 'band',
          label: 'Headband',
          value: () => (host.save.band ? 'On' : 'Off'),
          disabled: pebbles() < 30,
          adjust: () => {
            host.save = { ...host.save, band: !host.save.band };
            host.writeSave();
            if (host.flow()?.mode === 'roam' || host.flow()?.mode === 'event')
              host.act('game.dress', { color: host.save.color, band: host.save.band });
          },
        },
        { id: 'erase', label: 'Erase Save' },
      );
    }
    rows.push({ id: 'back', label: 'Back' });
    this.panel = new Panel(this.el, {
      id: 'settings',
      title: 'Settings',
      rows,
      sound: (cue) => host.cue(cue),
      onCancel: () => host.close(this),
      onPick: (id) => {
        if (id === 'erase') this.askErase();
        if (id === 'back') host.close(this);
      },
    });
  }

  /** Erase asks in-game: never `confirm()`. */
  private askErase(): void {
    const { host } = this;
    this.panel.active = false;
    this.panel.el.style.display = 'none';
    this.confirm = new Panel(this.el, {
      id: 'erase',
      title: 'Erase your save?',
      sub: 'Your Wobble Ages, your cairn, your days. The scale will forget you. It is good at that now.',
      rows: [
        { id: 'keep', label: 'Keep it' },
        { id: 'erase', label: 'Erase it' },
      ],
      sound: (cue) => host.cue(cue),
      onCancel: () => this.closeConfirm(),
      onPick: (id) => {
        if (id === 'erase') {
          host.save = { ...NEW_SAVE };
          host.writeSave();
          host.closeAll();
          host.toTitle();
        } else this.closeConfirm();
      },
    });
  }

  private closeConfirm(): void {
    this.confirm?.remove();
    this.confirm = null;
    this.panel.el.style.display = '';
    this.panel.active = true;
  }

  update(input: Input, dt: number): void {
    if (this.confirm) this.confirm.update(input, dt);
    else this.panel.update(input, dt);
  }

  remove(): void {
    this.el.remove();
  }
}
