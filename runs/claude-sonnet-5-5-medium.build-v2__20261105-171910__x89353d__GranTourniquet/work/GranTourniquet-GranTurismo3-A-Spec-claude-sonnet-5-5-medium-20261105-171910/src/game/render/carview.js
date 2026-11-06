// A drivable car as a scene object: root (place) > body (pitch/roll/heave) + wheels (steer pivot > spin). See plan section 8.
import { THREE, toonMaterial, setLookLayer, PALETTE } from '../../pixel-engine.js';
import { buildBody } from '../models/cars.js';
import { CAR_INFO } from '../data/cars.js';
const { Group, Mesh, CylinderGeometry, BoxGeometry } = THREE;
const tyreGeo = new CylinderGeometry(1, 1, 1, 12).rotateZ(Math.PI / 2);
const RIM_COLOURS = ['mist', 'sand', 'slate', 'white'];

export class CarView {
  constructor(carId, p, { paint, rims = 0, spoiler = 0, name = '', scale = 1, ghost = null } = {}) {
    this.carId = carId; this.p = p; const info = CAR_INFO[carId];
    this.root = new Group(); this.body = new Group(); this.root.add(this.body);
    this.paint = paint ?? info.paint; this.kind = info.body; this.wheels = []; this.dirt = 0; this.scale = scale;
    const b = buildBody(this.kind, this.paint); this.bodyObj = b.object; this.body.add(b.object);
    this.lamps = []; this.brakeLamps = new Group(); this.body.add(this.brakeLamps);
    const w = Math.max(1.4, (p.T ?? 1.5) + 0.3), len = b.bounds ? (b.bounds.max.z - b.bounds.min.z) : 4, tz = (b.bounds?.min.z ?? -2) - 0.01, hw = w / 2 - 0.3;
    const bl = new Mesh(new BoxGeometry(0.34, 0.12, 0.05), toonMaterial(PALETTE.red)); bl.position.set(hw - 0.05, 0.9, tz - 0.01); const br = bl.clone(); br.position.x = -bl.position.x;
    const bar = new Mesh(new BoxGeometry(0.5, 0.08, 0.05), toonMaterial(PALETTE.red)); bar.position.set(0, 0.74, tz - 0.01); this.brakeLamps.add(bl, br, bar); this.brakeLamps.visible = false;
    // wheels
    const R = p.R ?? 0.31, tw = (p.T ?? 1.5) / 2, wd = Math.max(0.2, R * 0.7);
    const pos = [[-tw, p.a], [tw, p.a], [-tw, -p.b], [tw, -p.b]];
    for (let i = 0; i < 4; i++) {
      const piv = new Group(), spin = new Group(); piv.add(spin);
      const tyre = new Mesh(tyreGeo, toonMaterial(PALETTE.ink)); tyre.scale.set(wd, R, R);
      const hub = new Mesh(tyreGeo, toonMaterial(PALETTE[RIM_COLOURS[rims % 4]])); hub.scale.set(wd + 0.02, R * 0.6, R * 0.6);
      const sp = new Mesh(new BoxGeometry(wd + 0.04, R * 1.1, 0.07), toonMaterial(PALETTE.slate)); const sp2 = sp.clone(); sp2.rotation.x = Math.PI / 2;
      spin.add(tyre, hub, sp); if (rims === 1 || rims === 2) spin.add(sp2);
      for (const m of [tyre, hub, sp, sp2]) { m.castShadow = true; m.receiveShadow = false; }
      piv.position.set(pos[i][0], R, pos[i][1]); this.root.add(piv); this.wheels.push({ piv, spin, R, front: i < 2 });
    }
    // spoiler parts from the install
    if (spoiler) {
      const sw = spoiler === 2 ? (p.T ?? 1.5) + 0.1 : (p.T ?? 1.5) * 0.7, y = spoiler === 2 ? 1.5 : 1.08;
      const wing = new Mesh(new BoxGeometry(sw, 0.05, spoiler === 2 ? 0.5 : 0.22), toonMaterial(PALETTE.ink)); wing.position.set(0, y, tz + 0.3);
      this.body.add(wing); for (const sx of [-1, 1]) { const st = new Mesh(new BoxGeometry(0.06, y - 0.9, 0.12), toonMaterial(PALETTE.ink)); st.position.set(sx * sw * 0.4, (y + 0.9) / 2, tz + 0.3); this.body.add(st); }
    }
    // mud: a slightly larger low shell that dissolves with `dirt`
    const mud = toonMaterial(PALETTE.orange, { dissolve: true }).clone(); this.mudMat = mud;
    const shell = new Mesh(new BoxGeometry(w + 0.04, 0.32, len - 0.2), mud); shell.position.set(0, 0.42, 0); this.body.add(shell); this.mud = shell; mud.dissolve = 1; shell.visible = false;
    if (info.body === 'rally' || carId === 'ryuRally') { for (const sx of [-1, 1]) for (const z of [p.a + 0.2, -p.b - 0.2]) { const f = new Mesh(new BoxGeometry(0.05, 0.3, 0.25), toonMaterial(PALETTE.ink)); f.position.set(sx * (tw + wd / 2 + 0.05), 0.35, z); this.root.add(f); } }
    if (scale !== 1) this.root.scale.setScalar(scale);
    setLookLayer(this.root, 'actors'); this.setName(name);
    this._pitch = 0; this._roll = 0; this._heave = 0; this.spinA = 0; this.air = 0;
    if (ghost) this.makeGhost(ghost);
  }
  setName(n) { this.name = n; }
  setDirt(d) { this.dirt = d; this.mud.visible = d > 0.02; this.mudMat.dissolve = Math.max(0, Math.min(1, 1 - d)); }
  makeGhost(colour) {
    const m = toonMaterial(PALETTE[colour] ?? PALETTE.cyan, { dissolve: true }).clone(); m.dissolve = 0.35;
    this.root.traverse((o) => { if (o.isMesh) { o.material = m; o.castShadow = false; } });
    this.isGhost = true;
  }
  // c: interpolated car state { x,y,z,yaw,delta,u,ax,ay,vy,onSlope,bank }; extra { pitchRoad, rollRoad, braking, dt, shake }
  place(c, o = {}) {
    const dt = o.dt ?? 1 / 60, r = this.root;
    r.position.set(c.x, c.y, c.z);
    r.rotation.set(o.pitchRoad ?? 0, c.yaw, o.rollRoad ?? 0, 'YXZ');
    const tp = -(c.ax ?? 0) * 0.0045, tr = (c.ay ?? 0) * 0.009 * (o.rollScale ?? 1);
    const k = 1 - Math.exp(-dt * 14); this._pitch += (tp - this._pitch) * k; this._roll += (tr - this._roll) * k; this._heave += (-(c.vy ?? 0) * 0.01 - this._heave) * k;
    const shake = (o.shake ?? 0) * (Math.sin(performance.now?.() * 0.09) * 0.012);
    this.body.rotation.set(this._pitch, 0, this._roll); this.body.position.y = this._heave + shake;
    const sp = (c.u ?? 0) / (this.p.R ?? 0.31); this.spinA = (this.spinA + sp * dt) % (Math.PI * 2);
    for (const w of this.wheels) { w.spin.rotation.x = this.spinA; if (w.front) w.piv.rotation.y = -(c.delta ?? 0); }
    this.brakeLamps.visible = !!o.braking;
  }
  dispose() { this.root.removeFromParent(); }
}
