// Base for every screen. Screens are Game classes swapped with engine.loadGame under a transition.
import { THREE } from '../../pixel-engine.js';
import { app } from '../core/app.js';
export const OP_CAMERA = { preset: 'fixed', position: [0, 9.6, 3.1], target: [0, 0, 0.1], fov: 44, minZoom: 1, maxZoom: 1 };
export class Stage {
  name = 'stage';
  target = new THREE.Vector3();
  async setup(ctx) { await app.boot(ctx); app.devices.resetCarry(); await this.build(ctx); }
  /** A new copy of this level from its start: recordings belong to the level they were made in. */
  fresh() { return new this.constructor(this.opts); }
  /** The game's own state, so a replay is compared on more than the clock. */
  fingerprint() { return this.status(); }
  build() {}
  ready(ctx) {
    if (typeof window !== 'undefined') window.__GAME__ = { app, stage: this, get sim() { return this.stage.sim ?? null; }, goto: (s) => go(s), config: app.config, campaign: (i) => import('./flow.js').then((f) => f.runCampaign(i)) };
    app.ctx = ctx;
    this.onReady?.(ctx);
  }
  cameraTarget() { return this.target; }
  status() { return this.name; }
  dispose() {}
}
/** Swap to another stage under a transition. */
export async function go(stage, kind = 'fade') {
  const engine = app.engine;
  if (engine.input.playing) return; // a recording belongs to one level: a replay ends where that level ends
  if (app.going) { app.pendingStage = [stage, kind]; return; }
  app.going = true;
  if (engine.manual) { // manual time: frames run in one go, so the swap waits until they stop
    const token = app.swapToken;
    await new Promise((res) => { setTimeout(res, 0); });
    if (token !== app.swapToken) return;
  }
  try {
    if (engine.manual) await engine.loadGame(stage);
    else {
      await engine.screen.cover(kind, { duration: 0.22 }).catch(() => {});
      await engine.loadGame(stage);
      engine.screen.reveal(kind, { duration: 0.28 });
    }
  } finally {
    app.going = false;
    if (app.pendingStage) { const [next, k] = app.pendingStage; app.pendingStage = null; go(next, k); }
  }
}
export function setView(ctx, pos, target, fov) {
  const c = ctx.camera.camera;
  c.position.set(pos[0], pos[1], pos[2]);
  c.lookAt(target[0], target[1], target[2]);
  if (fov && c.fov !== fov) { c.fov = fov; c.updateProjectionMatrix(); }
}

/** Drop a swap that hasn't begun: a new game is being started from outside. */
export function cancelSwap() { if (app.going) { app.swapToken++; app.going = false; } app.pendingStage = null; }
