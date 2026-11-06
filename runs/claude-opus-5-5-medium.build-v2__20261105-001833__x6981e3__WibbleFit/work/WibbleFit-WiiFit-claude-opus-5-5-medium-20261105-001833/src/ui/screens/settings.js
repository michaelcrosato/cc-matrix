// Settings: its own HUD menu, not the engine panel. 
import { App } from '../../app.js';
import { DEFAULT_SETTINGS } from '../../core/save.js';
import { T } from '../../core/tunables.js';
import { Menu } from '../menu.js';
import { promptBar } from '../prompts.js';
const LOOK_NAMES = ['default', 'storybook', 'arcade', 'handheld'];
const PIXELS = ['', 'fine', 'chunky'];
const pct = (v) => `${Math.round(v * 100)}%`;
const fullscreen = () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch { /* not allowed here */ } };
export class SettingsScreen {
  id = 'settings'; attractable = true;
  constructor(onClose) {
    this.onClose = onClose;
    const s = () => App.settings;
    const slider = (label, key, step, set = () => App.applySettings()) => ({ label, value: () => pct(s()[key]), slider: { get: () => s()[key], set: (v) => { s()[key] = Math.round(v / 0.01) / 100; set(); App.writeSave(); }, min: 0, max: 1 }, adjust: (d) => { s()[key] = Math.max(0, Math.min(1, +(s()[key] + d * step).toFixed(2))); set(); App.writeSave(); } });
    const toggle = (label, key) => ({ label, value: () => (s()[key] ? 'On' : 'Off'), adjust: () => { s()[key] = !s()[key]; App.applySettings(); App.writeSave(); }, on: () => { s()[key] = !s()[key]; App.applySettings(); App.writeSave(); } });
    const items = [
      slider('Music', 'music', 0.05),
      slider('Sound effects', 'sfx', 0.05),
      slider('Voice', 'voice', 0.05),
      { label: 'Button glyphs', value: () => (s().glyphs === 'xb' ? 'Xbox' : 'PlayStation'), adjust: () => { s().glyphs = s().glyphs === 'xb' ? 'ps' : 'xb'; App.writeSave(); }, on: () => { s().glyphs = s().glyphs === 'xb' ? 'ps' : 'xb'; App.writeSave(); } },
      toggle('Gentle Mode', 'gentle'),
      { label: 'Mouse lean radius', value: () => s().mouseRadius, adjust: (d) => { s().mouseRadius = Math.max(20, Math.min(140, s().mouseRadius + d * 5)); App.applySettings(); App.writeSave(); } },
      { label: 'Step timing offset', value: () => `${s().stepOffset} ms`, adjust: (d) => { s().stepOffset = Math.max(-200, Math.min(200, s().stepOffset + d * 5)); App.applySettings(); App.writeSave(); } },
      toggle('Reduce flashes', 'reduceFlashes'),
      { label: 'Look', value: () => s().look, adjust: (d) => { const i = LOOK_NAMES.indexOf(s().look); s().look = LOOK_NAMES[(i + d + LOOK_NAMES.length) % LOOK_NAMES.length]; App.applySettings(); App.writeSave(); }, on: () => { const i = LOOK_NAMES.indexOf(s().look); s().look = LOOK_NAMES[(i + 1) % LOOK_NAMES.length]; App.applySettings(); App.writeSave(); } },
      { label: 'Pixel size', value: () => (s().pixelSize ? s().pixelSize : 'Auto'), adjust: (d) => { const i = Math.max(0, PIXELS.indexOf(s().pixelSize)); s().pixelSize = PIXELS[(i + d + PIXELS.length) % PIXELS.length]; App.applySettings(); App.writeSave(); } },
      { label: 'Fullscreen', on: fullscreen },
      { label: 'Reset to defaults', on: () => { Object.assign(s(), DEFAULT_SETTINGS); App.applySettings(); App.writeSave(); } },
      { label: 'Done', on: () => this.close() },
    ];
    this.menu = new Menu({ title: 'Settings', items, onBack: () => this.close(), scale: 1, rowH: 15, maxRows: 8, w: 340 });
    void T;
  }
  close() { App.close(this); this.onClose?.(); }
  update(ctx, dt) { this.menu.update(ctx, dt); }
  draw(hud) { this.menu.draw(hud); promptBar(hud, [['adjust', 'Change'], ['confirm', 'Select'], ['back', 'Back']]); }
}
