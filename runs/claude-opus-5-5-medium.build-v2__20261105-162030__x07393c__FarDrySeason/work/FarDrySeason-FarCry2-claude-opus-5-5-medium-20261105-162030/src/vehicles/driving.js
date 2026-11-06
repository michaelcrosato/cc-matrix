// Getting in, getting out, the mounted gun and trucks that drive themselves.
import { THREE } from '../../pixel-engine.js';
import { FACTION_PALETTES } from '../art/models.js';
import { PersonView } from '../actors/rig.js';
import { angleDiff, clamp, dist2, polyLength, polyPoint } from '../world/geom.js';
const { Quaternion, Vector3 } = THREE;
const P = new Vector3(), R = new Quaternion(), T = new Vector3(), A = new Vector3(), B = new Vector3(), Z = new Vector3(0, 0, 1);
export class DrivingPart {
  enter(v) {
    const g = this.game, p = g.player;
    if (v.dead) return;
    v.seated = true; p.vehicle = v; p.mounted = false; p.ads = false;
    p.ctrl.collider.setEnabled(false); p.ctrl.body.setEnabled?.(false);
    g.audio.play('door');
    g.audio.play('starter', { volume: 0.7 }); v.cough = 0.6;
    g.events.emit('enterVehicle', v);
    g.vm.allHidden = true; this.relYaw = 0; this.lastYaw = v.yaw;
    this.engine ??= g.audio.loopSfx('engine', 0);
  }
  exit(force) {
    const g = this.game, p = g.player, v = p.vehicle; if (!v) return;
    v.seated = false; p.vehicle = null; p.mounted = false; p.mountGun = null; this.chase = false; g.cam.override = null;
    p.ctrl.body.setEnabled?.(true); p.ctrl.collider.setEnabled(true);
    const [dx, dz] = v.door();
    const y = g.world.land.heightAt(dx, dz) + 0.15;
    p.ctrl.teleport([dx, Math.max(y, v.y), dz]); p.x = dx; p.z = dz; p.y = Math.max(y, v.y);
    g.vm.allHidden = false; g.vm.show(p.guns[p.slot]?.id ?? 'cane');
    g.audio.play('door');
    if (this.engine) this.engine.set({ volume: 0 });
    g.events.emit('exitVehicle', v); void force;
  }
  mount(v) { const p = this.game.player; p.mounted = true; p.mountGun = { id: 'mg', cond: 100, mag: 999, reserve: 0, jammed: false }; this.game.vm.allHidden = false; this.game.vm.show('mg'); this.game.audio.play('rack'); this.game.mountedTracerFire = true; void v; }
  dismount(v) { const p = this.game.player; p.mounted = false; p.mountGun = null; this.game.vm.allHidden = true; this.game.mountedTracerFire = false; void v; }
  aiDrive(v, dt) {
    if (!v.driverView) { const view = new PersonView(this.ctx, v.hostile === 'harvest' ? 'soldier-cloth' : 'soldier-beret', { ...FACTION_PALETTES[v.hostile ?? 'concord'], skin: 'plum' }, { gun: false }); view.setFull('DriveSit'); view.object.position.set(v.t.seat[0], v.t.seat[1] - 1.05, v.t.seat[2]); v.object.add(view.object); v.driverView = view; }
    v.driverView.update(dt);
    const gp = this.game.player; if (dist2(v.x, v.z, gp.x, gp.z) < 18 && (v.hornT = (v.hornT ?? 0) - dt) <= 0) { v.hornT = 6; this.game.audio.at('horn', v.x, v.y, v.z, 80); }
    const pts = v.aiRoad, L = v.aiLen ??= polyLength(pts);
    // A PD steering controller along the polyline.
    const ahead = polyPoint(pts, Math.min(L, (v.aiS ?? 0) + 12));
    let nearest = v.aiS ?? 0; for (let s = nearest; s < nearest + 24; s += 2) { const q = polyPoint(pts, Math.min(L, s)); if (Math.hypot(q.x - v.x, q.z - v.z) < Math.hypot(polyPoint(pts, Math.min(L, nearest)).x - v.x, polyPoint(pts, Math.min(L, nearest)).z - v.z)) nearest = s; }
    v.aiS = nearest;
    // A patrol that has seen you leaves the road and comes for you; its crew gets down at 25 m.
    const chasing = v.tag === 'patrol' && dist2(v.x, v.z, gp.x, gp.z) < 110 && v.fake && this.game.isHostileToPlayer(v.fake);
    v.chasing = chasing;
    const want = chasing ? Math.atan2(gp.x - v.x, gp.z - v.z) : Math.atan2(ahead.x - v.x, ahead.z - v.z), err = angleDiff(want, v.yaw);
    const steer = clamp(-err * 1.6, -1, 1);
    const speedGoal = v.aiSpeed ?? 12, throttle = clamp((speedGoal - v.v.speed) * 0.4, -0.3, 1);
    if (v.aiLoop && nearest > L - 14) v.aiS = 0;
    else if (!v.aiLoop && nearest > L - 6) { v.aiRoad = null; v.onRoadEnd?.(); }
    void dt; return { throttle, steer, handbrake: false };
  }
}
