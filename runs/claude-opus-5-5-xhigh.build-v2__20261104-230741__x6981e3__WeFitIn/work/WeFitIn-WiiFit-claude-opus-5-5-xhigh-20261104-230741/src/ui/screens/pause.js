// Pause: engine.timeScale = 0 freezes physics, fixedUpdate and game time while update still runs.
import { App } from '../../app.js';
import { Menu } from '../menu.js';
import { MenuScreen } from './common.js';
import { SettingsScreen } from './settings.js';
import { AboutScreen } from './about.js';
import { HowToScreen } from './howto.js';
import { DevScreen } from './dev.js';

export class PauseScreen extends MenuScreen {
  freezes = true;

  constructor(scene) {
    const items = [{ label: 'Resume', id: 'resume', action: () => this.resume() }];
    const inSession = !!App.session;
    if (inSession) {
      items.push({ label: 'Settings', id: 'settings', action: () => App.stack.push(new SettingsScreen()) });
    } else {
      if (scene.restart) items.push({ label: 'Restart activity', id: 'restart', action: () => { this.resume(false); scene.restart(); } });
      if (scene.id !== 'hub' && App.slot && (scene.mode === 'week' || scene.pauseToIsland)) items.push({ label: 'Back to the island', id: 'island', action: () => { this.resume(false); App.go('hub', {}); } });
      if (scene.mode === 'dropin') items.push({ label: 'Back to the class', id: 'class', action: () => { this.resume(false); App.go('title', { menu: 'dropin' }); } });
      if (scene.id === 'hub' || scene.pauseToTitle) items.push({ label: 'Back to title', id: 'title', action: () => { this.resume(false); App.go('title', {}); } });
      items.push(
        { label: 'Settings', id: 'settings', action: () => App.stack.push(new SettingsScreen()) },
        { label: 'How to play', id: 'howto', action: () => App.stack.push(new HowToScreen()) },
        { label: 'About & Credits', id: 'about', action: () => App.stack.push(new AboutScreen()) },
        { label: 'Dev Tools', id: 'dev', action: () => App.stack.push(new DevScreen()) },
      );
    }
    const menu = new Menu(items, { width: 240, align: 'center', onBack: () => this.resume() });
    super('pause', 'Paused', menu, { prompts: [['confirm', 'Select'], ['back', 'Resume']] });
    this.scene = scene;
    this.freezes = !inSession;
  }

  onOpen() {
    if (this.freezes) App.engine.timeScale = 0;
    App.voice.stop();
    this.scene.onPause?.();
  }

  resume(tellScene = true) {
    App.stack.pop(this);
    App.engine.timeScale = App.dev.timeScale;
    if (tellScene) this.scene.onResume?.();
  }
}

App.openPause = () => { if (App.scene && !App.stack.open) App.stack.push(new PauseScreen(App.scene)); };
