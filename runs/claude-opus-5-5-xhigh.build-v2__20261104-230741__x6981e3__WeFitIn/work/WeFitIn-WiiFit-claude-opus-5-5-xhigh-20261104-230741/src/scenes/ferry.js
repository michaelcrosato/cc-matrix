// Day 1: the ferry comes in, Ounce's island gets bigger, you get off.
import { App } from '../app.js';
import { BACK, CONFIRM } from '../core/actions.js';
import { Timeline, THREE } from '../../pixel-engine.js';
import { place } from '../art/props.js';
import { makeAvatar } from '../art/avatar.js';
import { FERRY_LINES } from '../data/lines.js';
import { TITLE } from '../data/title.js';
import { sanitize, sayCentered, wrap, charsIn } from '../ui/font.js';
import { promptBar } from '../ui/prompts.js';
import { BaseScene } from './base.js';
import { buildIsland } from './hub.js';
import { gulls } from './sets.js';
import { withWardrobe } from './activity/lanes.js';

const { Vector3 } = THREE;
const LENGTH = 16;

export class FerryScene extends BaseScene {
  name = 'ferry';
  id = 'ferry';
  canPause = false;

  cameraConfig() { return { preset: 'fixed', position: [12, 7, 44], target: [0, 1, 14], fov: 34 }; }

  async build(ctx) {
    const world = buildIsland(ctx, { walls: false });
    this.water = world.water;
    this.gulls = gulls(ctx, 7, { min: [-10, 4, 6], max: [12, 8, 26] });
    this.boat = place(ctx, 'ferry', { at: [8, -0.7, 52], yaw: 180 }).object;
    const slot = App.slot;
    this.avatar = await makeAvatar(ctx, withWardrobe(slot?.look ?? {}, slot), { at: [8, 0.55, 49], yaw: 3.14, clip: 'Idle', shadow: false });
    place(ctx, 'pier', { at: [8, -1.1, 24.5], params: { len: 15 } });
    App.music('title');
    this.tl = new Timeline({
      shots: [
        { at: 0, position: [14, 6, 62], target: [8, 1, 48], fov: 34 },
        { at: 7, position: [20, 7, 42], target: [4, 1, 22], fov: 34 },
        { at: 13, position: [15, 4, 38], target: [8, 1.2, 28], fov: 34 },
        { at: LENGTH, position: [13.5, 3.2, 35], target: [8, 1.3, 26], fov: 34 },
      ],
      lines: FERRY_LINES.map((l) => ({ ...l })),
      cues: [
        { at: 2, name: 'squawk', cosmetic: true, run: () => App.sfx('gullSquawk') },
        { at: 10.5, name: 'horn', cosmetic: true, run: () => App.sfx('rumble', { volume: 0.5 }) },
        { at: 13.4, name: 'off', run: () => { this.disembark = true; this.avatar.play('HopDown', { once: true, fade: 0.1, then: () => this.avatar.play('Walk', { fade: 0.2 }) }); } },
      ],
      duration: LENGTH,
      onEnd: () => this.finish(),
    });
    this.tl.play();
    this.disembark = false;
    this.camP = new Vector3();
  }

  finish() {
    if (this.done) return;
    this.done = true;
    const slot = App.slot;
    if (slot) { slot.phase = 'morning'; App.store.write(); }
    App.go('weighin');
  }

  onInput(ctx) {
    const { input } = ctx;
    if (input.wasPressed(...CONFIRM) || input.wasPressed(...BACK) || input.wasPressed('MouseLeft')) this.tl.skip();
  }

  onFixed(ctx, dt) { this.tl.update(dt); }

  onUpdate(ctx, dt) {
    const shot = this.tl.camera();
    const cam = ctx.camera.camera;
    if (shot) {
      cam.position.set(...shot.position);
      cam.lookAt(shot.target[0], shot.target[1], shot.target[2]);
      if (shot.fov && cam.fov !== shot.fov) { cam.fov = shot.fov; cam.updateProjectionMatrix(); }
    }
    const u = Math.min(1, this.tl.time / 12);
    const e = 1 - (1 - u) * (1 - u);
    const z = 52 - e * 20;
    this.boat.position.z = z;
    this.boat.position.y = -0.7 + Math.sin(this.t * 1.4) * 0.05;
    this.boat.rotation.z = Math.sin(this.t * 0.9) * 0.012;
    if (!this.disembark) this.avatar.root.position.set(8, 0.55 + Math.sin(this.t * 1.4) * 0.05, z - 3);
    else {
      const a = this.avatar.root.position;
      a.z = Math.max(26.5, a.z - dt * 1.6);
      a.y = 0.4;
    }
    this.avatar.update(dt);
    this.gulls.update(dt, this.t);
    this.water?.update(ctx.time);
  }

  onDraw(ctx) {
    const { hud } = ctx;
    const bars = this.tl.bars();
    if (bars > 0) {
      const h = Math.round(bars * 26);
      hud.rect(0, 0, hud.width, h, 'ink');
      hud.rect(0, hud.height - h, hud.width, h, 'ink');
    }
    const line = this.tl.line();
    if (line) {
      const rows = wrap(sanitize(line.text), charsIn(hud.width - 40));
      const y = hud.height - 22 - rows.length * 10;
      rows.forEach((r, i) => sayCentered(hud, hud.width / 2, y + i * 10, r, { color: 'white', name: 'subtitle' }));
    }
    if (this.tl.time < 4) sayCentered(hud, hud.width / 2, 40, TITLE, { scale: 3, color: 'white', name: 'ferry-title' });
    promptBar(hud, App.device, [['confirm', 'Skip']], { y: 12, strip: false });
  }

  status() { return `ferry | t ${this.tl?.time?.toFixed(1)}`; }
  fingerprint() { return `${this.tl?.time?.toFixed(3)}|${this.disembark}`; }
}
