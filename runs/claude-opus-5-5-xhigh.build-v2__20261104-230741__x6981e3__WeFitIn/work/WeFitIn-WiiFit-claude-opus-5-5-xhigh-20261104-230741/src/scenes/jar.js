// The Sweat Jar, close up. One focal element: the jar, slowly filling.
import { PALETTE, THREE, toonMaterial } from '../../pixel-engine.js';
import { App } from '../app.js';
import { BACK, CONFIRM } from '../core/actions.js';
import { place } from '../art/props.js';
import { JAR_MAX, MILESTONES } from '../data/unlocks.js';
import { sayCentered, say, wrap, charsIn } from '../ui/font.js';
import { promptBar } from '../ui/prompts.js';
import { heading, panel, disc } from '../ui/widgets.js';
import { BaseScene } from './base.js';
import { plazaSet } from './sets.js';

const { CylinderGeometry, Mesh, BoxGeometry } = THREE;

export class JarScene extends BaseScene {
  name = 'jar';
  id = 'jar';
  canPause = false; // Esc is Back here
  shownFill = 0;
  dripT = 0;
  i = 0;

  cameraConfig() { return { preset: 'fixed', position: [1.9, 2.4, 7.6], target: [1.9, 1.7, 0], fov: 32 }; }

  build(ctx) {
    plazaSet(ctx, 12);
    place(ctx, 'sweat-jar', { at: [0, 0, 0] });
    // Toon materials are opaque, so the fluid is faked: a sky cylinder 1 cm wider than the wall, with a highlight.
    this.fluid = new Mesh(new CylinderGeometry(0.96, 0.96, 1, 12), toonMaterial(PALETTE.sky));
    this.fluid.position.set(0, 0.4, 0);
    this.fluid.scale.y = 0.02;
    ctx.scene.add(this.fluid);
    this.shine = new Mesh(new BoxGeometry(0.1, 1, 0.05), toonMaterial(PALETTE.white));
    this.shine.position.set(-0.48, 0.4, 0.84);
    this.shine.scale.y = 0.02;
    ctx.scene.add(this.shine);
    App.music('title');
    const s = App.slot;
    this.target = Math.min(1, (s?.drips ?? 0) / JAR_MAX);
    this.lastDrips = s?.jarSeen ?? 0;
    if (s) { s.jarSeen = s.drips; App.store.write(); }
    this.shownFill = Math.min(1, this.lastDrips / JAR_MAX);
    this.i = Math.max(0, MILESTONES.findIndex((m) => (s?.drips ?? 0) < m.drips));
  }

  leave() { App.go('hub', { from: 'jar' }); }

  onInput(ctx) {
    const { input } = ctx;
    if (input.wasPressed(...BACK) || input.wasPressed('MouseRight') || input.wasPressed(...CONFIRM) || input.wasPressed('MouseLeft')) { App.sfx('menuBack'); this.leave(); }
  }

  onUpdate(ctx, dt) {
    if (this.shownFill < this.target) {
      this.shownFill = Math.min(this.target, this.shownFill + dt * 0.08);
      this.dripT -= dt;
      if (this.dripT <= 0) {
        this.dripT = 0.24;
        App.sfx('jarDrip', { pitch: this.shownFill * 12 });
        ctx.particles.burst('dripDrop', [0, 0.4 + this.fluid.scale.y + 0.1, 0.4]);
      }
    }
    const h = Math.max(0.02, this.shownFill * 2.05);
    this.fluid.scale.y = h;
    this.fluid.position.y = 0.4 + h / 2;
    this.shine.scale.y = h * 0.8;
    this.shine.position.y = 0.4 + h * 0.5;
  }

  onDraw(ctx) {
    const { hud } = ctx;
    const s = App.slot;
    const x = Math.round(hud.width * 0.52);
    const w = Math.min(hud.width - x - 12, 210);
    heading(hud, 'The Sweat Jar');
    hud.rect(x + Math.round(w / 2) - 62, 32, 124, 52, 'navy');
    sayCentered(hud, x + w / 2, 36, `${s?.drips ?? 0}`, { scale: 4, color: 'cyan', name: 'drips' });
    sayCentered(hud, x + w / 2, 72, 'Drips', { color: 'white', name: 'drips-label' });
    const next = MILESTONES.find((m) => (s?.drips ?? 0) < m.drips);
    const got = MILESTONES.filter((m) => (s?.drips ?? 0) >= m.drips);
    const y = 88;
    const rowH = 11;
    const lastGot = got[got.length - 1];
    const lines = [];
    if (next) lines.push({ t: `Next at ${next.drips}: ${next.name}`, c: 'teal' });
    else lines.push({ t: 'The jar is full. There is no next.', c: 'teal' });
    if (lastGot) wrap(lastGot.remark, charsIn(w - 10)).forEach((t) => lines.push({ t, c: 'ink' }));
    panel(hud, x, y, w, lines.length * rowH + 8, { fill: 'white', name: 'jar-panel' });
    lines.forEach((l, i) => say(hud, x + 5, y + 4 + i * rowH, l.t.slice(0, charsIn(w - 10)), { color: l.c, shadow: false, name: 'jar-text' }));
    // Milestone dots along the jar's scale.
    const by = y + lines.length * rowH + 16;
    MILESTONES.forEach((m, i) => {
      const dx = x + 8 + i * Math.floor((w - 16) / MILESTONES.length);
      disc(hud, dx, by, 3.5, (s?.drips ?? 0) >= m.drips ? 'lime' : 'slate');
    });
    promptBar(hud, App.device, [['back', 'Back to the island']]);
  }

  fingerprint() { return `${App.slot?.drips ?? 0}|${this.shownFill.toFixed(4)}`; }
  status() { return `jar | drips ${App.slot?.drips ?? 0}`; }
}
