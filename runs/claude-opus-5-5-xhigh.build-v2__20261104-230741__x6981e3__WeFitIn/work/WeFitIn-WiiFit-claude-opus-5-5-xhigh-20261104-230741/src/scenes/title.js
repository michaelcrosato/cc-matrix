// The title. Idle 10 s here or on any of its menus and the attract loop starts.
import { App } from '../app.js';
import { TITLE } from '../data/title.js';
import { BaseScene } from './base.js';
import { gulls, plazaSet } from './sets.js';
import { Kevin, Ounce, place } from '../art/props.js';
import { makeAvatar } from '../art/avatar.js';
import { LOOKS, PRESET_LOOKS } from '../data/classmates.js';
import { sayCentered, textWidth, wrap, charsIn } from '../ui/font.js';
import { MainMenuScreen, DropInScreen } from '../ui/screens/mainmenu.js';
import { disc, ring } from '../ui/widgets.js';

export class TitleScene extends BaseScene {
  name = 'title';
  id = 'title';
  allowsAttract = true;
  touchMessage = false;

  cameraConfig() { return { preset: 'fixed', position: [0, 2.2, 9.5], target: [0, 1.5, 0], fov: 34 }; }

  async build(ctx) {
    plazaSet(ctx, 10);
    this.ounce = new Ounce(ctx, { at: [0, 0, 0.6], scale: 2.2 });
    place(ctx, 'dais', { at: [0, -0.28, 0.6], scale: 1.6 });
    this.ounce.root.position.y = 0.26;
    this.kevin = new Kevin(ctx, { at: [3.7, 0, 1.8], yaw: -0.8, scale: 1.2 });
    this.coach = await makeAvatar(ctx, LOOKS.coach, { at: [-4, 0, 0.8], yaw: 0.55, clip: 'CoachStand' });
    this.coach.addPlumb();
    this.previewAv = await makeAvatar(ctx, PRESET_LOOKS[0], { at: [2.5, 0, 1.6], yaw: -0.2, clip: 'Idle' });
    this.previewAv.root.visible = false;
    if (this.previewAv.shadow) this.previewAv.shadow.visible = false;
    this.gulls = gulls(ctx, 6, { min: [-12, 5, -12], max: [12, 8, -2] });
    App.music('title');
    this.dotT = 0;
    if (this.args.menu === 'dropin') { App.stack.push(new MainMenuScreen()); App.stack.push(new DropInScreen()); } else if (this.args.menu === 'main') App.stack.push(new MainMenuScreen());
    if (App.touchOnly && !App.gamepadSeen) this.touchMessage = true;
    this.moodT = 3;
  }

  /** The avatar picker shows its choice beside Ounce. */
  async previewLook(look) {
    const a = this.previewAv;
    if (!look) { a.root.visible = false; if (a.shadow) a.shadow.visible = false; this.previewKey = null; return; }
    const key = JSON.stringify(look);
    if (key === this.previewKey) return;
    this.previewKey = key;
    const old = a.root;
    const fresh = await makeAvatar(this.ctx, look, { at: [old.position.x, 0, old.position.z], yaw: -0.2, clip: 'Wave', shadow: false });
    if (this.previewKey !== key) { this.ctx.scene.remove(fresh.root); return; }
    this.ctx.scene.remove(old);
    if (a.shadow) { fresh.shadow = a.shadow; fresh.shadow.visible = true; }
    this.previewAv = fresh;
  }

  onInput(ctx) {
    const { input } = ctx;
    const anyPress = input.queuedPresses.length > 0;
    if (!anyPress) return;
    if (App.touchOnly && !App.gamepadSeen) {
      const keyOrPad = input.queuedPresses.some((c) => c !== 'Touch' && !c.startsWith('Mouse'));
      if (!keyOrPad) { this.idle = 0; return; }
      App.gamepadSeen = true;
      this.touchMessage = false;
    }
    App.sfx('menuConfirm');
    this.ounce.setMood('pleased');
    App.stack.push(new MainMenuScreen());
  }

  onUpdate(ctx, dt) {
    this.ounce.update(dt);
    this.kevin.update(dt);
    this.coach.update(dt);
    this.previewAv.update(dt);
    this.gulls.update(dt, this.t);
    this.moodT -= dt;
    if (this.moodT <= 0) { this.moodT = 4 + (this.t % 3); this.ounce.setMood(['neutral', 'smug', 'concern', 'pleased'][Math.floor(this.t) % 4]); }
    if (App.touchOnly && !App.gamepadSeen && ctx.input.gamepadConnected) { App.gamepadSeen = true; this.touchMessage = false; }
  }

  onDraw(ctx) {
    const { hud } = ctx;
    if (App.stack.open && App.stack.top?.name !== 'main') return;
    const scale = hud.width >= 300 ? 4 : hud.width >= 220 ? 3 : 2;
    const w = textWidth(TITLE, scale);
    const cx = Math.round(hud.width / 2);
    const y = 14;
    hud.rect(cx - Math.round(w / 2) - 8, y - 4, w + 16, 9 * scale + 8, 'navy');
    sayCentered(hud, cx, y, TITLE, { scale, color: 'white', name: 'title' });
    // The dot, doing its best.
    const dx = Math.sin(this.t * 1.1) * 4 + Math.sin(this.t * 2.3) * 2;
    const rx = cx + Math.round(w / 2) + 4;
    if (hud.width > w + 60) { ring(hud, rx + 9, y + 12, 8, 2, 'white'); disc(hud, rx + 9 + dx * 0.8, y + 12, 3, 'red'); }
    if (!App.stack.open) {
      if (this.touchMessage) {
        const lines = wrap('Controller or keyboard required', charsIn(Math.min(hud.width - 16, 300)));
        const by = hud.height - 22 - lines.length * 11;
        hud.rect(4, by - 4, hud.width - 8, lines.length * 11 + 8, 'navy');
        lines.forEach((l, i) => sayCentered(hud, cx, by + i * 11, l, { color: 'sand', name: 'touch-message' }));
      } else if (Math.floor(App.uiT * 1.4) % 3 !== 2) {
        const py = hud.height - 28;
        hud.rect(cx - 82, py - 3, 164, 15, 'navy');
        sayCentered(hud, cx, py, 'Press any button. Gently.', { color: 'white', name: 'press' });
      }
    }
  }

  fingerprint() { return `${App.stack.names().join('>')}|${this.idle.toFixed(2)}`; }
  status() { return `title | menus ${App.stack.names().join('>') || 'none'} | idle ${this.idle.toFixed(1)}`; }
}
