// The Carrier: shoulders the Dame and walks her to the nearest spawn door. 12 s until she is lost.
import { TUNING } from '../../data/tuning.js';

const flow = [0, 0];

export const carrier = {
  stepCarry(dt) {
    const { area } = this;
    const D = area.dame;
    if (!D || D.carrier !== this) { this.enter('APPROACH'); return; }
    if (this.stateT < 0.7) return;
    const door = area.nearestSpawnDoor(this.x, this.z);
    const nav = area.navByKey('carry');
    nav.flowTo(door[0], door[1]);
    if (nav.flowDirection(this.x, this.z, flow)) {
      const s = this.d.speed[0] * TUNING.enemySpeed * 0.85;
      this.moveDir(flow[0], flow[1], s, dt);
      this.turnToward(Math.atan2(flow[0], flow[1]), dt, 5);
      this.actor?.loco('CarrierWalk', s, { fade: 0.2 });
    }
  },
};
