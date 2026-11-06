// The ferry arrives. A Timeline cutscene, skippable.
import { THREE, Timeline } from '../../pixel-engine.js';
import { App } from '../app.js';
import { makeAvatar } from '../art/avatar.js';
import { buildIsland } from '../art/island.js';
import { place } from '../art/stage.js';
import { AVATARS } from '../data/classmates.js';
import { center, say } from '../ui/font.js';
import { promptBar } from '../ui/prompts.js';
import { BaseScene } from './base.js';
const { Vector3 } = THREE;
export class FerryScene extends BaseScene {
  id = 'ferry'; q = new Vector3();
  camera() { return { preset: 'fixed', position: [34, 8, 40], target: [10, 1, 20], fov: 36 }; }
  async build(ctx) {
    this.world = await buildIsland(ctx, { collide: false });
    App.music('plaza');
    this.boat = place(ctx, 'ferry', 8, -0.3, 44, { actors: true, turn: 180 });
    this.a = await makeAvatar(ctx, App.slot?.look ?? AVATARS[0]); this.a.groundY = -9; this.a.play('Idle');
    this.ounce = place(ctx, 'ounce', 3, 0, 16.5, { actors: true, scale: 1.4 }); this.ounce.object.rotation.y = 0.5;
    this.tl = new Timeline({ duration: 9.5, bars: 0.6, shots: [
      { at: 0, position: [30, 7, 50], target: [8, 1, 40], fov: 34 },
      { at: 4, position: [26, 10, 42], target: [6, 1, 24], fov: 34 },
      { at: 6.5, position: [18, 8, 36], target: [4, 1, 18], fov: 30 },
      { at: 9.5, position: [13, 5, 32], target: [4, 1.2, 18], fov: 26 },
    ], lines: [
      { at: 0.4, until: 3.6, text: 'Tare Island. Everything here starts at zero.' },
      { at: 4, until: 6.4, text: 'You have been recommended a week.' },
      { at: 6.8, until: 9.2, text: 'By whom is not on file.' },
    ], cues: [{ at: 6.5, run: () => App.sfx('squawk') }], onEnd: () => this.done() });
    this.tl.play();
  }
  done() { if (this.left) return; this.left = true; const s = App.slot; if (s) { s.phase = 'weighin'; App.writeSave(); } App.go('weighin'); }
  frame(ctx, dt, rdt, free) {
    this.tl.update(dt);
    const t = this.tl.time, k = Math.min(1, t / 7), z = 44 - k * 26;
    this.boat.object.position.z = z;
    this.a.setAt(8, 1.32, z + 2.4, 0); this.a.update(dt);
    this.world.update(ctx, dt);
    const c = this.tl.camera(), cam = ctx.camera.camera;
    if (c) { cam.position.set(...c.position); cam.lookAt(this.q.set(...c.target)); if (c.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); } this.target.set(...c.target); }
    if (free && this.tl.time > 0.4 && ctx.input.wasPressed('PadCross', 'Enter', 'Space', 'MouseLeft', 'Escape')) this.tl.skip();
  }
  draw(ctx, hud) {
    const b = this.tl.bars(), bh = Math.round(b * 24), l = this.tl.line();
    if (bh) { hud.rect(0, 0, hud.width, bh, 'ink'); hud.rect(0, hud.height - bh, hud.width, bh, 'ink'); }
    if (l) center(hud, hud.height - 20, l.text, { color: 'white' });
    if (b >= 1) { say(hud, 12, 8, '', {}); }
    promptBar(hud, [['confirm', 'Skip']], 5);
  }
  status() { return `ferry | ${this.tl?.time.toFixed(1)}`; }
}
