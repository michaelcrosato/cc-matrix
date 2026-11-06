// The pause menu. timeScale 0 freezes play; menus read input in update.
import { App } from '../../app.js';
import { center } from '../font.js';
import { Menu } from '../menu.js';
import { promptBar } from '../prompts.js';
import { AboutScreen } from './about.js';
import { DevScreen } from './dev.js';
import { HowToScreen } from './howto.js';
import { SettingsScreen } from './settings.js';
export class PauseScreen {
  id = 'pause'; attractable = false;
  constructor() {
    const scene = App.scene;
    App.hudHidden = false;
    const items = [{ label: 'Resume', on: () => this.resume() }];
    if (scene?.id === 'activity' && !scene.finished) items.push({ label: 'Restart activity', on: () => { this.close(); scene.retry(); } });
    if (!App.session && App.slot && scene?.id !== 'hub') items.push({ label: 'Back to the island', on: () => { this.close(); App.go('hub', { silent: true }); } });
    if (!App.session && !App.slot) items.push({ label: 'Back to the menu', on: () => { this.close(); App.go('title'); } });
    if (!App.session && App.slot && scene?.id === 'hub') items.push({ label: 'Back to the title', on: () => { this.close(); App.slotIndex = null; App.go('title'); } });
    items.push({ label: 'Settings', on: () => App.open(new SettingsScreen()) });
    if (!App.session) {
      items.push({ label: 'How to play', on: () => App.open(new HowToScreen()) });
      items.push({ label: 'About & Credits', on: () => App.open(new AboutScreen()) });
      items.push({ label: 'Dev Tools', on: () => App.open(new DevScreen()) });
    }
    this.menu = new Menu({ title: 'Paused', items, onBack: () => this.resume(), scale: 2 });
  }
  close() { App.close(this); if (!App.session) App.engine.timeScale = 1; }
  resume() { App.close(this); App.resume(); }
  update(ctx, dt) {
    if (ctx.input.wasPressed('PadOptions', 'KeyP') && !ctx.input.isDown('PadCreate')) { this.resume(); return; }
    this.menu.update(ctx, dt);
  }
  draw(hud) { this.menu.draw(hud); promptBar(hud, [['confirm', 'Select'], ['back', 'Resume']]); void center; }
}
