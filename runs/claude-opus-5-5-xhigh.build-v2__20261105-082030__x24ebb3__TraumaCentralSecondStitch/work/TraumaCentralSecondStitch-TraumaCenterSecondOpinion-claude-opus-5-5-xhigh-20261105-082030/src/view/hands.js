// The surgeon's hand and instruments: a gloved hand plus forearm from below the frame sells first-person
// presence, and its cast shadow gives depth.
import { buildModel, glowMaterial, hologramMaterial, PALETTE, setLookLayer, THREE } from '../../pixel-engine.js';
import { handDef, TOOL_DEFS } from '../content/models/index.js';

const { CylinderGeometry, Group, Mesh } = THREE;

export const SEAT_GLOVES = [{ glove: 'sky', fold: 'blue' }, { glove: 'white', fold: 'mist' }, { glove: 'green', fold: 'teal' }, { glove: 'sand', fold: 'orange' }];
export const COUCH_GLOVES = [{ glove: 'red', fold: 'plum' }, { glove: 'blue', fold: 'navy' }, { glove: 'green', fold: 'teal' }, { glove: 'sand', fold: 'orange' }];
const POSES = [
  { tool: [-0.5, 0.7, 0], hand: [0.86, 0.9, 1.05], rot: [-0.46, 0.72, -0.2] },
  { tool: [-0.5, -0.7, 0], hand: [-0.86, 0.9, 1.05], rot: [-0.46, -0.72, 0.2] },
  { tool: [-0.5, 1.5, 0], hand: [1.4, 1.0, 0.26], rot: [-0.46, 1.5, -0.2] },
  { tool: [-0.5, -1.5, 0], hand: [-1.4, 1.0, 0.26], rot: [-0.46, -1.5, 0.2] },
];

export class HandRig {
  constructor(ctx, seatIndex, o = {}) {
    this.ctx = ctx;
    this.seatIndex = seatIndex;
    this.pose = POSES[seatIndex % 4];
    this.group = new Group();
    const gloves = o.gloves ?? SEAT_GLOVES[seatIndex % 4];
    this.hand = buildModel(handDef, { palette: gloves }).object;
    this.hand.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    this.hand.scale.setScalar(0.72);
    this.group.add(this.hand);
    this.tools = {};
    for (const [name, def] of Object.entries(TOOL_DEFS)) {
      const obj = buildModel(def).object;
      obj.traverse((m) => { if (m.isMesh) m.castShadow = true; });
      obj.visible = false;
      obj.rotation.set(...this.pose.tool);
      obj.scale.setScalar(0.86);
      this.group.add(obj);
      this.tools[name] = obj;
    }
    this.armL = this.tools.forceps.getObjectByName('armL');
    this.armR = this.tools.forceps.getObjectByName('armR');
    this.plunger = this.tools.syringe.getObjectByName('plunger');
    this.bottle = this.tools.gel.getObjectByName('bottle');
    // The laser's beam.
    this.beam = new Mesh(new CylinderGeometry(0.06, 0.06, 1, 6), glowMaterial(PALETTE.orange));
    this.beam.visible = false;
    this.group.add(this.beam);
    // The scanner's hologram.
    this.holo = new Mesh(new CylinderGeometry(2.2, 2.2, 0.06, 24), hologramMaterial({ color: PALETTE.cyan }));
    this.holo.visible = false;
    this.group.add(this.holo);
    setLookLayer(this.group, 'actors');
    ctx.scene.add(this.group);
    if (o.ghost) this.makeGhost();
    this.current = null;
    this.bob = 0;
    this.jitter = 0;
    this.grip = 0;
  }
  makeGhost() {
    const mat = hologramMaterial({ color: PALETTE.white });
    this.group.traverse((m) => { if (m.isMesh) { m.material = mat; m.castShadow = false; } });
    this.ghost = true;
  }
  setTool(name) {
    if (name === this.current) return;
    if (this.current && this.tools[this.current]) this.tools[this.current].visible = false;
    this.current = name;
    if (this.tools[name]) this.tools[name].visible = true;
    this.switching = 0.12;
  }
  /** Place the tip at world (x, surface, z). */
  update(dt, x, y, z, s = {}) {
    const name = s.tool ?? this.current;
    this.setTool(name);
    this.switching = Math.max(0, (this.switching ?? 0) - dt);
    const use = !!s.use;
    this.grip += ((use ? 1 : 0) - this.grip) * Math.min(1, dt * 18);
    this.bob += dt;
    if (name === 'paddle') {
      const t = this.tools.paddle;
      const lift2 = 0.05;
      t.position.set(x, y + lift2, z);
      t.rotation.set(-0.15, this.seatIndex === 0 ? 0.9 : -0.9, 0);
      this.hand.position.set(x + (this.seatIndex === 0 ? 0.7 : -0.7), y + 0.72, z + 0.62);
      this.hand.rotation.set(-0.3, this.seatIndex === 0 ? 0.9 : -0.9, 0);
      if (this.hidden !== !!s.hidden) { this.hidden = !!s.hidden; this.group.visible = !this.hidden; }
      this.beam.visible = false;
      this.holo.visible = false;
      return;
    }
    const hover = name === 'laser' ? 0.9 : name === 'scanner' ? 0.75 : name === 'syringe' ? (use ? 0.2 : 0.35) : name === 'gel' ? 0.4 : (use ? 0.03 : 0.24);
    let jx = 0, jz = 0;
    if (use && name === 'drain') { jx = Math.sin(this.bob * 42) * 0.015; jz = Math.cos(this.bob * 37) * 0.015; }
    const lift = hover + (this.switching > 0 ? 0.3 : 0);
    const t = this.tools[name];
    if (t) {
      t.position.set(x + jx, y + lift, z + jz);
      t.rotation.set(...this.pose.tool);
    }
    this.hand.position.set(x + this.pose.hand[0], y + lift + this.pose.hand[1] - this.grip * 0.03, z + this.pose.hand[2]);
    this.hand.rotation.set(...this.pose.rot);
    if (this.hidden !== !!s.hidden) { this.hidden = !!s.hidden; this.group.visible = !this.hidden; }
    // Forceps jaws.
    if (name === 'forceps') {
      const open = (s.holding ? 0.4 : 4) - this.grip * (s.holding ? 0 : 3.2);
      this.armL.rotation.y = (-open * Math.PI) / 180;
      this.armR.rotation.y = (open * Math.PI) / 180;
    }
    if (name === 'syringe') this.plunger.position.z = 1.5 + (s.draw ?? 0) * 0.7;
    if (name === 'gel') {
      const sq = 1 - this.grip * (0.1 + Math.sin(this.bob * 30) * 0.03);
      this.bottle.scale.set(sq, sq, 1 + (1 - sq));
    }
    // Beam.
    this.beam.visible = name === 'laser' && use && !this.ghost;
    if (this.beam.visible) {
      const h = lift + 0.08;
      this.beam.scale.set(1 + Math.sin(this.bob * 60) * 0.3, h, 1 + Math.sin(this.bob * 60) * 0.3);
      this.beam.position.set(x, y + h / 2, z);
    }
    this.holo.visible = name === 'scanner' && use && !this.ghost;
    if (this.holo.visible) { this.holo.position.set(x, y + 0.5, z); }
    if (s.table !== undefined) this.group.visible = !this.hidden;
  }
  dispose() { this.ctx.scene.remove(this.group); }
}
