/**
 * @file The title and pause menus, the pier's look and colour pick, and the fullscreen and rows they share.
 *
 * Game code, a page's.
 *
 * @example
 * // host.open(new PauseScreen(host));
 */
import type { Input } from '../../../../engine';
import { COLORS } from '../../cast/roster';
import { Panel, type Row } from '../panel';
import { promptHtml } from '../glyphs';
import { AboutScreen } from './about';
import { ControlsScreen } from './controls';
import { DevScreen } from './dev';
import { SettingsScreen } from './settings';
import { BoardScreen } from './programme';
import { JoinScreen } from './join';
import { layer, type AppHost, type Screen } from './types';

/** The title's menu. */
export class TitleScreen implements Screen {
  readonly name = 'title';
  private touchOnly = false;
  private woken = false;
  private wakeHint!: HTMLElement;
  readonly modal = true;
  readonly el: HTMLElement;
  private panel: Panel;
  private touchNote: HTMLElement;
  private prompts: HTMLElement;
  private lastKey = '';

  private host: AppHost;

  constructor(host: AppHost) {
    this.host = host;
    this.el = document.createElement('div');
    this.el.className = 'tf-title';
    this.el.dataset.ui = 'title';
    this.el.innerHTML =
      '<div><div class="tf-logo">Teeter Fit</div><div class="tf-tagline">Stand still. It is harder than it looks.</div></div>';
    host.root.append(this.el);
    const bottom = document.createElement('div');
    bottom.style.cssText = 'display:flex;flex-direction:column;gap:2vh;align-items:flex-start';
    this.el.append(bottom);
    const save = host.save;
    const rows: Row[] = [
      { id: 'begin', label: save.started ? `Continue: Day ${Math.min(save.day, 6)}` : 'Begin' },
      { id: 'free', label: 'Free Play', disabled: !(save.seen.length > 0 || save.day > 1) },
      { id: 'group', label: 'Group Class' },
      { id: 'settings', label: 'Settings' },
      { id: 'about', label: 'About / Credits' },
    ];
    this.panel = new Panel(bottom, {
      id: 'title',
      rows,
      sound: (cue) => host.cue(cue),
      onPick: (id) => this.pick(id),
    });
    this.touchNote = document.createElement('div');
    this.touchNote.className = 'tf-panel tf-touch';
    this.touchNote.dataset.ui = 'touchonly';
    this.touchNote.style.display = 'none';
    this.touchNote.innerHTML =
      '<div class="tf-h1">Controller or keyboard required</div><div class="tf-row" data-id="touch-settings" data-ui="item" style="justify-content:center">Settings</div>';
    this.touchNote
      .querySelector<HTMLElement>('[data-id=touch-settings]')!
      .addEventListener('click', () => host.open(new SettingsScreen(host)));
    host.root.append(this.touchNote);
    this.prompts = document.createElement('div');
    this.prompts.className = 'tf-prompts tf-chip';
    this.prompts.dataset.ui = 'title-prompts';
    this.wakeHint = document.createElement('div');
    this.wakeHint.className = 'tf-tagline';
    this.wakeHint.dataset.ui = 'wake';
    this.wakeHint.textContent = 'Press any button';
    bottom.prepend(this.wakeHint);
    this.prompts.style.cssText = 'position:absolute;right:var(--safe);bottom:var(--safe)';
    host.root.append(this.prompts);
  }

  /** Touch-only devices see only the note and Settings. */
  setTouchOnly(on: boolean): void {
    this.touchOnly = on;
    this.touchNote.style.display = on ? '' : 'none';
    this.panel.el.style.display = on ? 'none' : '';
    this.prompts.style.display = on ? 'none' : '';
    this.panel.active = !on;
  }

  private pick(id: string): void {
    const { host } = this;
    if (id === 'begin') {
      if (!host.save.started) host.open(new PierScreen(host));
      else host.beginPlay();
    } else if (id === 'free') host.open(new BoardScreen(host, true));
    else if (id === 'group') host.open(new JoinScreen(host));
    else if (id === 'settings') host.open(new SettingsScreen(host));
    else if (id === 'about') host.open(new AboutScreen(host));
  }

  update(input: Input, dt: number): void {
    this.panel.update(input, dt);
    if (!this.woken && this.host.sawInput()) {
      this.woken = true;
      this.wakeHint.style.display = 'none';
    }
    const key = `${this.host.device()}|${this.host.glyphs()}`;
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.prompts.innerHTML = promptHtml('confirm', 'Choose', this.host.device(), this.host.glyphs());
    }
  }

  /** Hides it, while attract plays or a screen is over it; attract keeps a touch device's note over it. */
  show(on: boolean, keepNote = false): void {
    this.el.style.display = on ? '' : 'none';
    if (!on && !keepNote) this.touchNote.style.display = 'none';
    if (on && this.touchOnly) this.touchNote.style.display = '';
    if (keepNote && this.touchOnly) this.touchNote.style.display = '';
    this.prompts.style.display = on && !this.touchOnly ? '' : 'none';
  }

  remove(): void {
    this.el.remove();
    this.touchNote.remove();
    this.prompts.remove();
  }
}

/** Day 1, at the pier: pick one of three looks and a tracksuit colour. No name entry. */
export class PierScreen implements Screen {
  readonly name = 'pier';
  readonly modal = true;
  private el: HTMLElement;
  private panel: Panel;
  private look = 0;
  private color = 0;

  private host: AppHost;

  constructor(host: AppHost) {
    this.host = host;
    this.el = layer(host.root);
    this.panel = new Panel(this.el, {
      id: 'pier',
      title: 'Guest',
      sub: 'The ferry is leaving. Who shall we say is here?',
      sound: (cue) => host.cue(cue),
      rows: [
        { id: 'look', label: 'Look', value: () => ['Round', 'Long', 'Small'][this.look], adjust: (dir) => { this.look = (this.look + dir + 3) % 3; } },
        { id: 'color', label: 'Tracksuit', value: () => COLORS[this.color], adjust: (dir) => { this.color = (this.color + dir + 2) % 2; } },
        { id: 'go', label: 'Step off the ferry' },
      ],
      onCancel: () => host.close(this),
      onPick: (id) => {
        if (id !== 'go') return;
        host.save = { ...host.save, started: true, look: this.look, color: COLORS[this.color], band: false };
        host.writeSave();
        host.beginPlay();
      },
    }); // prettier-ignore
  }

  update(input: Input, dt: number): void {
    this.panel.update(input, dt);
  }

  remove(): void {
    this.el.remove();
  }
}

/** The pause menu: pauses the sim; in a session it never does. */
export class PauseScreen implements Screen {
  readonly name = 'pause';
  readonly modal = true;
  private el: HTMLElement;
  private panel: Panel;

  private host: AppHost;

  constructor(host: AppHost) {
    this.host = host;
    this.el = layer(host.root);
    const flow = host.flow();
    const inEvent = flow?.mode === 'event';
    const rows: Row[] = host.session
      ? [
          { id: 'resume', label: 'Resume' },
          { id: 'settings', label: 'Volume and icons' },
        ]
      : [
          { id: 'resume', label: 'Resume' },
          { id: 'restart', label: 'Restart Activity', disabled: !inEvent },
          { id: 'island', label: 'Back to the Island', disabled: !inEvent },
          { id: 'settings', label: 'Settings' },
          { id: 'controls', label: 'Controls' },
          { id: 'dev', label: 'Dev Mode' },
          { id: 'about', label: 'About / Credits' },
          { id: 'title', label: 'Quit to Title' },
        ];
    this.panel = new Panel(this.el, {
      id: 'pause',
      title: 'Paused',
      sub: 'Nobody is wobbling. You may look around.',
      rows,
      sound: (cue) => host.cue(cue),
      onCancel: () => this.resume(),
      onPick: (id) => this.pick(id),
    });
    if (!host.session) host.engine.inspector?.pause();
  }

  private resume(): void {
    this.host.close(this);
  }

  private pick(id: string): void {
    const { host } = this;
    if (id === 'resume') this.resume();
    else if (id === 'restart') {
      this.resume();
      host.act('game.again');
    } else if (id === 'island') {
      this.resume();
      host.act('game.leave');
    } else if (id === 'settings') host.open(new SettingsScreen(host));
    else if (id === 'controls') host.open(new ControlsScreen(host));
    else if (id === 'dev') host.open(new DevScreen(host));
    else if (id === 'about') host.open(new AboutScreen(host));
    else if (id === 'title') {
      this.resume();
      host.toTitle();
    }
  }

  update(input: Input, dt: number): void {
    this.panel.update(input, dt);
  }

  remove(): void {
    this.el.remove();
    if (!this.host.session) this.host.engine.inspector?.resume();
  }
}
