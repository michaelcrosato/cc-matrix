// The pit crew: they wait by the wall, run in when the car stops, jack it, swap wheels, fuel it, and run off.
import { makePerson } from './people.js';
import { THREE, toonMaterial, PALETTE } from '../../pixel-engine.js';
import { trackPoint, PIT_WIDTH } from '../sim/race.js';
const { Group, BoxGeometry, CylinderGeometry, Mesh, Vector3 } = THREE;
export class PitCrew {
  constructor(ctx, tr) { this.ctx = ctx; this.tr = tr; this.people = []; this.state = 'off'; this.group = new Group(); this.t = 0; this.visible = false; this.group.visible = false; ctx.scene.add(this.group); }
  async build() {
    const looks = ['crew', 'crew', 'crew', 'crew', 'crew2', 'benno'];
    for (const l of looks) { const p = await makePerson(this.ctx, l); this.group.add(p.object); this.people.push(p); }
    const hoseGeo = new CylinderGeometry(0.06, 0.06, 2.4, 5).rotateZ(Math.PI / 2);
    this.hose = new Mesh(hoseGeo, toonMaterial(PALETTE.slate)); this.hose.visible = false; this.group.add(this.hose);
    this.jackBar = new Mesh(new BoxGeometry(0.12, 0.2, 1.3), toonMaterial(PALETTE.red)); this.group.add(this.jackBar); this.jackBar.visible = false;
    this.spare = [0, 1].map(() => { const m = new Mesh(new CylinderGeometry(0.3, 0.3, 0.22, 10).rotateZ(Math.PI / 2), toonMaterial(PALETTE.ink)); this.group.add(m); return m; });
  }
  // Sets where each of them should be, given the stopped car's pose.
  place(e) {
    const c = e.c, sn = Math.sin(c.yaw), cs = Math.cos(c.yaw), rx = -cs, rz = sn, a = c.p.a, b = c.p.b, T = c.p.T / 2 + 0.75;
    const at = (lat, lon) => new Vector3(c.x + rx * lat + sn * lon, c.y, c.z + rz * lat + cs * lon);
    this.spots = [at(-T, a), at(T, a), at(-T, -b), at(T, -b), at(T + 0.2, 0.1 - 0.4), at(0, a + 1.9)];
    this.faces = [Math.PI / 2 + c.yaw, -Math.PI / 2 + c.yaw, Math.PI / 2 + c.yaw, -Math.PI / 2 + c.yaw, -Math.PI / 2 + c.yaw, Math.PI + c.yaw];
    this.waits = this.spots.map((s, i) => { const w = at(T + 4.5, (i - 2.5) * 1.6); return w; });
    this.jackAt = at(0, a + 1.2); this.car = e;
  }
  start(e) { this.place(e); this.state = 'run'; this.t = 0; this.group.visible = true; this.people.forEach((p, i) => { p.object.position.copy(this.waits[i]); p.play('Run', { fade: 0.05 }); }); }
  go() { if (this.state === 'off') return; this.state = 'leave'; this.t = 0; this.people.forEach((p) => p.play('Run', { fade: 0.1 })); this.hose.visible = false; this.jackBar.visible = false; }
  update(dt, view) {
    if (this.state === 'off') return;
    this.t += dt; for (const p of this.people) p.update(dt);
    const moveTo = (p, to, sp = 7) => { const d = to.clone().sub(p.object.position); d.y = 0; const l = d.length(); if (l > 0.02) { p.object.position.addScaledVector(d, Math.min(1, (sp * dt) / l)); p.object.rotation.y = Math.atan2(d.x, d.z); } p.object.position.y = to.y; return l; };
    if (this.state === 'run') {
      let all = true;
      this.people.forEach((p, i) => { if (moveTo(p, this.spots[i]) > 0.1) all = false; else { p.object.rotation.y = this.faces[i]; p.play(i < 4 ? (i === 0 ? 'PitWheelGun' : 'PitWheelGun') : i === 4 ? 'PitFuel' : 'PitJack'); } });
      if (all || this.t > 1) { this.state = 'work'; this.t = 0; }
    } else if (this.state === 'work') {
      if (view) { const target = Math.min(0.15, this.t * 0.6); view.jack = target; }
      this.hose.visible = true; const p = this.people[4].object; this.hose.position.set(p.position.x, p.position.y + 0.95, p.position.z); this.hose.rotation.y = this.car.c.yaw + Math.PI / 2 + Math.PI / 2;
      this.jackBar.visible = true; this.jackBar.position.copy(this.jackAt).setY(this.jackAt.y + 0.2); this.jackBar.rotation.y = this.car.c.yaw;
      this.spare.forEach((m, i) => { const q = this.spots[i * 2 + 1]; m.visible = true; m.position.set(q.x, q.y + 0.3, q.z); });
    } else if (this.state === 'leave') {
      if (view) view.jack = Math.max(0, view.jack - dt * 0.8);
      let all = true; this.people.forEach((p, i) => { if (moveTo(p, this.waits[i], 8) > 0.15) all = false; });
      this.spare.forEach((m) => { m.visible = false; });
      if (all || this.t > 1.4) { this.state = 'off'; this.group.visible = false; if (view) view.jack = 0; }
    }
  }
}
void trackPoint; void PIT_WIDTH;
