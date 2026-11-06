// Pause menu. engine.timeScale = 0 freezes physics, fixedUpdate and game time; update still runs.
import { Menu } from '../widgets.js';
import { SettingsScreen } from './settings.js';
import { drawPrompts } from '../prompts.js';
import { say, sayWrapped } from '../font.js';
import { panel } from '../widgets.js';

export class HowToPlay {
  id = 'howto'; blocks = true; pauses = true;
  constructor(app, text) { this.app = app; this.text = text; }
  update(nav) { if (nav.back || nav.confirm || nav.click || nav.rclick || nav.pause) { this.app.sfx('back'); this.scene.pop(); } }
  draw(hud) {
    const w = 300, x = (hud.width - w) / 2, y = 40;
    panel(hud, x, y, w, 150);
    say(hud, x + 10, y + 8, 'How to play', { color: 'teal', shadow: false, scale: 2 });
    sayWrapped(hud, x + 10, y + 32, this.text, w - 20, { color: 'ink', shadow: false, lineGap: 11 });
    drawPrompts(this.app, hud, [['back', 'Back']]);
  }
}
export class PauseMenu {
  id = 'pause'; blocks = true; pauses = true; attractOK = false;
  constructor(app, { restart = null, island = null, dev = null, howto = '' } = {}) {
    this.app = app;
    const inSession = !!app.session;
    const items = [{ label: 'Resume', onSelect: () => this.scene.pop() }];
    if (!inSession) {
      if (restart) items.push({ label: 'Restart activity', onSelect: () => { this.scene.pop(); restart(); } });
      if (island) items.push({ label: 'Back to the island', onSelect: () => { this.scene.pop(); island(); } });
      items.push({ label: 'How to play', onSelect: () => this.scene.push(new HowToPlay(app, howto)) });
    }
    items.push({ label: 'Settings', onSelect: () => this.scene.push(new SettingsScreen(app)) });
    if (!inSession) {
      items.push({ label: 'About and Credits', onSelect: () => dev?.about?.() });
      items.push({ label: 'Dev Tools', onSelect: () => dev?.open?.() });
    }
    this.menu = new Menu(items, { w: 200, rowH: 17, title: 'Paused', name: 'pause', onMove: () => app.sfx('move', { volume: 0.4 }), onChange: () => app.sfx('confirm', { volume: 0.5 }) });
  }
  update(nav) { this.menu.update(nav); if (nav.pause || nav.back || nav.rclick) { this.app.sfx('back'); this.scene.pop(); } }
  draw(hud) { this.menu.draw(hud); drawPrompts(this.app, hud, [['confirm', 'Select'], ['back', 'Resume']]); }
}
