// Dev Tools' animation viewer: every clip on an avatar.
import { App } from '../app.js';
import { makeAvatar } from '../art/avatar.js';
import { VIEWER_CLIPS } from '../art/clips.js';
import { BACK, CONFIRM, MENU_LEFT, MENU_RIGHT, TAB_LEFT, TAB_RIGHT } from '../core/actions.js';
import { PRESET_LOOKS } from '../data/classmates.js';
import { sayCentered } from '../ui/font.js';
import { promptBar } from '../ui/prompts.js';
import { heading } from '../ui/widgets.js';
import { BaseScene } from './base.js';
import { plazaSet } from './sets.js';

export class ViewerScene extends BaseScene {
  name = 'viewer';
  id = 'viewer';
  i = 0;

  cameraConfig() { return { preset: 'fixed', position: [0, 1.7, 6], target: [0, 0.95, 0], fov: 30 }; }

  async build(ctx) {
    plazaSet(ctx, 11);
    this.avatar = await makeAvatar(ctx, App.slot?.look ?? PRESET_LOOKS[0], { at: [0, 0, 0], clip: VIEWER_CLIPS[0] });
  }

  onInput(ctx) {
    const { input } = ctx;
    const n = VIEWER_CLIPS.length;
    if (input.wasPressed(...MENU_RIGHT, ...TAB_RIGHT) || input.wheel > 0) { this.i = (this.i + 1) % n; this.show(); }
    if (input.wasPressed(...MENU_LEFT, ...TAB_LEFT) || input.wheel < 0) { this.i = (this.i - 1 + n) % n; this.show(); }
    if (input.wasPressed(...CONFIRM)) this.show();
    if (input.wasPressed(...BACK) || input.wasPressed('MouseRight')) App.go(App.slot ? 'hub' : 'title', {});
  }

  show() { this.avatar.play(VIEWER_CLIPS[this.i], { fade: 0.15, once: false }); App.sfx('menuMove'); }

  onUpdate(ctx, dt) {
    this.avatar.root.rotation.y += dt * 0.5;
    this.avatar.update(dt);
  }

  onDraw(ctx) {
    const { hud } = ctx;
    heading(hud, 'Animation Viewer');
    sayCentered(hud, hud.width / 2, 36, `${VIEWER_CLIPS[this.i]}  ${this.i + 1}/${VIEWER_CLIPS.length}`, { scale: 1, color: 'sand', name: 'clip' });
    promptBar(hud, App.device, [['adjust', 'Clip'], ['confirm', 'Replay'], ['back', 'Back']]);
  }

  fingerprint() { return String(this.i); }
  status() { return `viewer | ${VIEWER_CLIPS[this.i]}`; }
}
