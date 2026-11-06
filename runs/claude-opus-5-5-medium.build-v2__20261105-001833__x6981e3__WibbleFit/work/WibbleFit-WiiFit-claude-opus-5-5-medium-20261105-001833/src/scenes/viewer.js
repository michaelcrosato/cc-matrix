// Dev: the animation viewer. Every clip on an avatar.
import { App } from '../app.js';
import { makeAvatar } from '../art/avatar.js';
import { CLIP_NAMES } from '../art/clips.js';
import { backdrop } from '../art/stage.js';
import { ACTIONS } from '../core/actions.js';
import { AVATARS } from '../data/classmates.js';
import { center } from '../ui/font.js';
import { Nav } from '../ui/menu.js';
import { promptBar } from '../ui/prompts.js';
import { BaseScene } from './base.js';
export class ViewerScene extends BaseScene {
  id = 'viewer'; nav = new Nav();
  camera() { return { preset: 'fixed', position: [2.2, 1.5, 5], target: [0, 0.9, 0], fov: 30 }; }
  async build(ctx) { backdrop(ctx, 'plaza'); this.i = this.args.clip ?? 0; this.a = await makeAvatar(ctx, App.slot?.look ?? AVATARS[0]); this.a.setAt(0, 0, 0); this.show(); }
  show() { this.a.play(CLIP_NAMES[this.i]); }
  frame(ctx, dt, rdt, free) {
    this.a.update(dt); if (!free) return;
    const n = this.nav.read(ctx, rdt);
    if (n.right) { this.i = (this.i + 1) % CLIP_NAMES.length; this.show(); }
    if (n.left) { this.i = (this.i + CLIP_NAMES.length - 1) % CLIP_NAMES.length; this.show(); }
    if (ctx.input.wasPressed(...ACTIONS.back)) App.go(App.slot ? 'hub' : 'title', { silent: true });
  }
  draw(ctx, hud) { center(hud, 14, CLIP_NAMES[this.i], { scale: 2, color: 'white' }); center(hud, 34, `${this.i + 1} / ${CLIP_NAMES.length}`, { color: 'white' }); promptBar(hud, [['adjust', 'Clip'], ['back', 'Back']]); }
  status() { return `viewer | ${CLIP_NAMES[this.i]}`; }
}
