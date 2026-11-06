// Single-player activities (not lane staged): one Dot, one driver, one avatar, and a camera we place ourselves.
import { ActivityBase } from './base.js';
import { Dot } from '../../core/dot.js';
import { LocalDriver, BotDriver, blank } from '../../core/drivers.js';
import { T } from '../../core/tunables.js';
import { makeAvatar, playerLook, NPC_LOOKS } from '../../art/avatar.js';
import { THREE } from '../../../pixel-engine.js';

export class SoloActivity extends ActivityBase {
  async build(ctx) {
    const r = ctx.random.fork('solo');
    this.rand = () => r.range(0, 1);
    this.dot = new Dot(this.rand);
    this.driver = this.skill ? new BotDriver(this.skill, this.rand) : new LocalDriver(this.app);
    this.inp = blank();
    this.av = await makeAvatar(ctx, playerLook(this.S));
    this.av.addTo(ctx.scene); this.av.play('Idle');
    await this.stage(ctx);
    this.begin();
  }
  setDriver(skill) { if (skill === 'local') { this.driver = new LocalDriver(this.app); this.skill = null; } else { this.driver = new BotDriver(skill, this.rand); this.skill = skill; } }
  read(dt, t) {
    const d = this.driver; d.observe?.(this.dot, t);
    if (this.botControl && d instanceof BotDriver) { Object.assign(this.inp, { breath: false, stepL: false, stepR: false, confirm: false }); this.botControl(this.inp, dt); }
    else d.read(this.inp, this.ctx, dt, t);
    return this.inp;
  }
  /** Place the camera ourselves (fixed preset): position, target, fov. */
  cam(pos, target, fov = null) {
    const c = this.ctx.camera.camera; if (!c) return;
    c.position.set(pos[0], pos[1], pos[2]); c.lookAt(target[0], target[1], target[2]);
    if (fov && c.isPerspectiveCamera && Math.abs(c.fov - fov) > 0.01) { c.fov = fov; c.updateProjectionMatrix(); }
  }
  endEarly() { if (this.phase === 'play') this.setPhase('outro'); }
  fingerprint() { return `${this.actId}:${this.dot.x.toFixed(3)},${this.dot.y.toFixed(3)}:${Math.round(this.scoreNow())}:${this.phase}:${this.pt.toFixed(2)}`; }
}
