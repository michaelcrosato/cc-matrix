// The Limpet: a low crawler, not a puppet. It scuttles to the nearest corpse, or latches on to you.
import { buildModel, setLookLayer } from '../../../pixel-engine.js';
import { MODELS } from '../../models/index.js';

const flow = [0, 0];

export const limpet = {
  buildCrawler() {
    const { area } = this;
    const b = buildModel('limpet', { catalog: MODELS });
    setLookLayer(b.object, 'actors');
    area.ctx.scene.add(b.object);
    this.crawlObj = b.object;
    this.crawlObj.position.set(this.x, this.y, this.z);
  },

  stepCrawler(dt, T, dist) {
    const { area } = this;
    this.scuttleT = (this.scuttleT ?? 0) - dt;
    if (this.scuttleT <= 0) { this.scuttleT = 0.6; area.ctx.audio.play('limpetSkitter', area.spatial(this.x, this.z, 12)); }
    if (this.latched) {
      const L = this.latched;
      this.x = L.x; this.z = L.z; this.y = (L.y ?? 0) + 1.2;
      L.hurt?.(4 * dt, this, { dot: true });
      this.latchT = (this.latchT ?? 3) - dt;
      if (!L.alive || this.latchT <= 0) this.dieQuiet();
      return;
    }
    // A corpse nearby: go to it and raise it. Otherwise, go for a leg.
    const corpse = this.huntOnly ? null : area.nearestCorpse(this.x, this.z, 16, this.hostCorpse);
    const nav = area.level.nav;
    if (corpse) {
      const dd = Math.hypot(corpse.x - this.x, corpse.z - this.z);
      if (dd < 0.5) { area.raiseCorpse(corpse, this); return; }
      const dx = (corpse.x - this.x) / dd; const dz = (corpse.z - this.z) / dd;
      if (nav.lineOfSight(this.x, this.z, corpse.x, corpse.z)) this.moveDir(dx, dz, this.moveSpeed(), dt, true);
      else { nav.flowTo(corpse.x, corpse.z); if (nav.flowDirection(this.x, this.z, flow)) this.moveDir(flow[0], flow[1], this.moveSpeed(), dt, true); }
      this.yaw = Math.atan2(dx, dz);
      return;
    }
    if (!T) return;
    if (dist < 0.7 && T.floor === this.floor) { this.latched = T; area.ctx.audio.play('limpetPop', area.spatial(this.x, this.z, 12)); T.onLatched?.(this); return; }
    const key = 'player';
    const { nav: flowNav } = area.navigate(this, key, T);
    if (flowNav.flowDirection(this.x, this.z, flow)) { this.moveDir(flow[0], flow[1], this.moveSpeed(), dt, true); this.yaw = Math.atan2(flow[0], flow[1]); }
  },
};
