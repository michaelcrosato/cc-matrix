// Settings: our own HUD menu, not the engine panel.
import { App, APP_LOOKS } from '../../app.js';
import { DEFAULT_SETTINGS } from '../../core/save.js';
import { Menu } from '../menu.js';
import { MenuScreen, TabBar } from './common.js';
import { heading } from '../widgets.js';

const pct = (v) => `${Math.round(v * 100)}%`;
const LOOK_KEYS = Object.keys(APP_LOOKS);
const LOOK_LABEL = { default: 'Default', storybook: 'Storybook', arcade: 'Arcade', handheld: 'Handheld' };

function volume(label, key, id) {
  const set = (v) => { App.settings[key] = Math.round(Math.max(0, Math.min(1, v)) * 20) / 20; App.saveSettings(); };
  return {
    label, id, value: () => pct(App.settings[key]),
    adjust: (d) => set(App.settings[key] + d * 0.05),
    slider: { get: () => App.settings[key], set, min: 0, max: 1 },
    action: () => set(App.settings[key] >= 1 ? 0 : App.settings[key] + 0.05),
    sound: 'menuMove',
  };
}

export class SettingsScreen extends MenuScreen {
  constructor() {
    const pages = [
      () => [
        volume('Music', 'music', 'music'),
        volume('SFX', 'sfx', 'sfx'),
        volume('Voice', 'voice', 'voice'),
      ],
      () => [
        { label: 'Button glyphs', id: 'glyphs', value: () => (App.settings.glyphs === 'xbox' ? 'Xbox' : 'PlayStation'),
          adjust: () => this.flipGlyphs(), action: () => this.flipGlyphs() },
        { label: 'Gentle Mode', id: 'gentle', value: () => (App.settings.gentle ? 'On' : 'Off'),
          adjust: () => this.flip('gentle'), action: () => this.flip('gentle') },
        { label: 'Mouse radius', id: 'mouseLeanRadius', value: () => `${App.settings.mouseLeanRadius}`,
          adjust: (d) => this.step('mouseLeanRadius', d * 5, 20, 140), action: () => this.step('mouseLeanRadius', 5, 20, 140, true) },
        { label: 'Step offset', id: 'stepOffsetMs', value: () => `${App.settings.stepOffsetMs} ms`,
          adjust: (d) => this.step('stepOffsetMs', d * 5, -200, 200), action: () => this.step('stepOffsetMs', 5, -200, 200, true) },
      ],
      () => [
        { label: 'Reduce flashes', id: 'reduceFlashes', value: () => (App.settings.reduceFlashes ? 'On' : 'Off'),
          adjust: () => this.flip('reduceFlashes'), action: () => this.flip('reduceFlashes') },
        { label: 'Look', id: 'look', value: () => LOOK_LABEL[App.settings.look] ?? 'Default',
          adjust: (d) => this.cycleLook(d), action: () => this.cycleLook(1) },
        { label: 'Pixel size', id: 'pixelSize', value: () => (App.settings.pixelSize ? 'Chunky' : 'Fine'),
          adjust: () => this.flipPixel(), action: () => this.flipPixel() },
        { label: 'Fullscreen', id: 'fullscreen', value: () => (typeof document !== 'undefined' && document.fullscreenElement ? 'On' : 'Off'),
          adjust: () => this.fullscreen(), action: () => this.fullscreen() },
      ],
      () => [
        { label: 'Reset to defaults', id: 'reset', action: () => { Object.assign(App.settings, DEFAULT_SETTINGS); App.saveSettings(); } },
      ],
    ];
    const menu = new Menu(pages[0](), { y: 56, width: 320, tabbed: true, onBack: () => App.stack.pop(this) });
    super('settings', 'Settings', menu, { prompts: [['adjust', 'Change'], ['tabs', 'Page'], ['back', 'Back']] });
    this.pages = pages;
    this.tabs = new TabBar(['Sound', 'Controls', 'Picture', 'Reset'], { onChange: (i) => { this.menu.focus = 0; this.menu.top = 0; this.menu.setItems(pages[i]()); } });
  }

  flip(key) { App.settings[key] = !App.settings[key]; App.saveSettings(); }
  flipGlyphs() { App.settings.glyphs = App.settings.glyphs === 'xbox' ? 'ps' : 'xbox'; App.saveSettings(); }
  flipPixel() { App.settings.pixelSize = App.settings.pixelSize ? 0 : 1; App.saveSettings(); }
  step(key, d, lo, hi, wrapAround = false) {
    let v = App.settings[key] + d;
    if (wrapAround && v > hi) v = lo;
    App.settings[key] = Math.max(lo, Math.min(hi, v));
    App.saveSettings();
  }
  cycleLook(d) {
    const i = LOOK_KEYS.indexOf(App.settings.look);
    App.settings.look = LOOK_KEYS[(i + d + LOOK_KEYS.length) % LOOK_KEYS.length];
    App.saveSettings();
  }
  fullscreen() {
    if (typeof document === 'undefined') return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.();
  }

  update(ctx, dt) { this.tabs.update(ctx); this.menu.update(ctx, dt); }

  draw(ctx) {
    super.draw(ctx);
    heading(ctx.hud, 'Settings');
    this.tabs.draw(ctx, 36);
  }
}
