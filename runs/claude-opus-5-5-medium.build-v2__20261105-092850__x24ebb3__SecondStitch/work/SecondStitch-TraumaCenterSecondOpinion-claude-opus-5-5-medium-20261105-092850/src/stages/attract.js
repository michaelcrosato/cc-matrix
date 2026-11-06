// Attract mode: a looping reel of real sim segments, played by the bot with cheats. It never touches saves or settings.
import { app } from '../core/app.js';
import { OperationStage } from './operation.js';
import { StoryStage } from './story.js';

export const REEL = [
  { scene: 'ep1', secs: 12 },
  { op: 'op1', stage: 2, secs: 24 },
  { scene: 'ep3', secs: 10 },
  { op: 'op2', stage: 2, secs: 24 },
  { op: 'op3', stage: 0, secs: 26 },
  { op: 'op4', stage: 2, secs: 22 },
  { op: 'op5', stage: 1, secs: 28 },
  { op: 'op6', stage: 6, secs: 22 },
  { op: 'op7', stage: 1, secs: 26 },
  { op: 'op8', stage: 1, secs: 30 },
  { op: 'pileup', secs: 28, seats: 4 },
];
class DemoStory extends StoryStage {
  constructor(seg) { super({ scene: seg.scene, onDone: () => app.nextAttract?.() }); this.seg = seg; this.adv = 0; this.dem = 0; }
  update(ctx, dt) {
    this.dem += dt; this.adv += dt;
    if (!app.touchGate ? app.devices.anyInput && this.dem > 0.4 : false) { if (!this.exited) { this.exited = true; app.exitAttract?.(); } return; }
    if (this.dem > this.seg.secs) { this.finish(); return; }
    if (this.adv > 2.8) { this.adv = 0; this.next(ctx); }
    super.update(ctx, dt);
    banner(ctx);
  }
}
export function banner(ctx) {
  const { hud } = ctx, t = 'DEMO - PRESS ANY BUTTON', w = hud.measure(t).width;
  if (Math.floor(ctx.time * 1.5) % 2 === 0) { hud.rect(Math.round(hud.width / 2 - w / 2 - 4), 24, w + 8, 11, 0x8a1f38); hud.text(Math.round(hud.width / 2 - w / 2), 26, t, { color: 0xffffff }); }
}
class DemoOp extends OperationStage {
  update(ctx, dt) { super.update(ctx, dt); if (!this.exited) banner(ctx); }
}
export function AttractStage(seg) {
  if (seg.scene) return new DemoStory(seg);
  const seats = seg.seats ? Array.from({ length: seg.seats }, () => ({ device: 'bot' })) : undefined;
  return new DemoOp({ op: seg.op, stage: seg.stage ?? 0, demo: { secs: seg.secs }, seats, difficulty: 'resident' });
}
