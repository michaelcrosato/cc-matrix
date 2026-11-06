// The base of every screen: polls devices once per frame, draws overlays on top, tracks idle time.
import { THREE } from '../../pixel-engine.js';
import { App } from '../app.js';
import { UI } from '../ui/hud.js';

export class Stage {
  name = 'stage';
  cameraConfig = null;
  attractable = false;
  focus = new THREE.Vector3(0, 0, 0);

  cameraTarget() { return this.focus; }

  async setup(ctx) {
    this.ctx = ctx;
    await App.init(ctx);
    App.registerParticles(ctx);
    this.ui = new UI(App, ctx);
    this.t = 0;
    App.director.onStage();
    await this.build?.(ctx);
  }

  ready(ctx) {
    if (typeof window !== 'undefined') window.__GAME__ = { app: App, stage: this, sim: this.sim ?? null, config: App.config, goto: (s) => App.goto(s) };
    this.onReady?.(ctx);
  }

  update(ctx, dt) {
    App.frameDt = dt;
    App.devices.dt = dt;
    App.devices.poll(ctx);
    App.director.update(dt);
    this.t += dt;
    ctx.hud.clear();
    const ov = App.overlays[App.overlays.length - 1];
    this.frame?.(ctx, dt, !!ov);
    this.draw?.(ctx, this.ui, dt);
    for (const o of App.overlays) o.draw?.(this.ui, dt);
    if (ov) ov.update?.(this.ui, dt);
    if (this.attractable) this.trackIdle(ctx, dt);
    else App.idle = 0;
    App.cursor(this.showCursor?.() ?? App.devices.last === 'kbm');
  }

  trackIdle(ctx, dt) {
    if (App.devices.any) App.idle = 0;
    else App.idle += dt;
    if (App.idle >= (App.attractAfter ?? 10) && !App.loading) {
      App.idle = 0;
      this.startAttract?.();
    }
  }
  status() { return this.name; }
}
