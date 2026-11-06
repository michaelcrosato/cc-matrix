// Settings overlay: its own HUD menu (not the engine panel). Two tabs of six rows.
import { Menu, Tabs, panel } from '../widgets.js';
import { say } from '../font.js';
import { T } from '../../core/tunables.js';
import { LOOKS } from '../../app.js';
import { drawPrompts } from '../prompts.js';

export class SettingsScreen {
  id = 'settings'; blocks = true; attractOK = true; cover = true;
  constructor(app, onDone) {
    this.app = app; this.onDone = onDone; this.tabs = new Tabs(['Sound and controls', 'Picture and play']);
    const s = app.settings, set = (k) => (v) => app.setSetting(k, v);
    const pct = (v) => Math.round(v * 100) + '%';
    const sl = (label, key, min, max, step, fmt) => ({ label, kind: 'slider', min, max, step, get: () => s[key], set: set(key), fmt });
    const opt = { onChange: (kind) => app.sfx(kind === 'slide' ? 'move' : 'confirm', { volume: 0.5 }), onMove: () => app.sfx('move', { volume: 0.4 }) };
    this.menus = [
      new Menu([
        sl('Music volume', 'music', 0, 1, 0.05, pct), sl('Sound effects', 'sfx', 0, 1, 0.05, pct), sl('Voices', 'voice', 0, 1, 0.05, pct),
        { label: 'Button glyphs', kind: 'choice', options: ['PlayStation', 'Xbox'], get: () => s.glyph, set: set('glyph') },
        sl('Mouse lean radius', 'mouseRadius', 30, 160, 5, (v) => String(v)), sl('Step timing offset', 'stepOffset', -200, 200, 5, (v) => v + ' ms'),
      ], { w: 300, rowH: 18, name: 'settings-a', y: 52, ...opt }),
      new Menu([
        { label: 'Gentle Mode', kind: 'toggle', get: () => s.gentle, set: set('gentle'), hint: 'Rings are larger. Noise is smaller. Ounce is the same.' },
        { label: 'Reduce flashes', kind: 'toggle', get: () => s.reduceFlashes, set: set('reduceFlashes') },
        { label: 'Look', kind: 'choice', options: ['Default', 'Storybook', 'Arcade', 'Handheld'], get: () => s.look, set: set('look') },
        { label: 'Pixel size', kind: 'choice', options: ['Auto', '1', '2', '3'], get: () => s.pixelSize, set: set('pixelSize') },
        { label: 'Fullscreen', kind: 'toggle', get: () => !!(typeof document !== 'undefined' && document.fullscreenElement), set: (v) => { try { if (v) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); } catch { /* */ } app.setSetting('fullscreen', v); } },
        { label: 'Reset to defaults', onSelect: () => { app.resetSettings(); app.sfx('back'); } },
      ], { w: 300, rowH: 18, name: 'settings-b', y: 52, hint: true, ...opt }),
    ];
  }
  update(nav) {
    this.tabs.update(nav); if (nav.tabL || nav.tabR) nav.confirm = false;
    this.menus[this.tabs.i].update(nav);
    if (nav.back || nav.rclick || nav.pause) { this.app.sfx('back'); this.scene.pop(); this.onDone?.(); }
  }
  draw(hud) {
    say(hud, hud.width / 2, 12, 'Settings', { anchor: 'c', scale: 3, color: 'white', shadow: 'navy' });
    this.tabs.draw(hud, Math.floor((hud.width - 300) / 2), 36, 300);
    const m = this.menus[this.tabs.i]; m.o.x = Math.floor((hud.width - 300) / 2);
    m.draw(hud);
    drawPrompts(this.app, hud, [['tabs', 'Tab'], ['select', 'Change'], ['back', 'Back']]);
  }
}
