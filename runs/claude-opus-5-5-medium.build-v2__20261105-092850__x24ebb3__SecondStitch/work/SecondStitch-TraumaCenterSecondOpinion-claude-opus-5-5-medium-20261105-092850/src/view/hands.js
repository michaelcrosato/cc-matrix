// The gloved hand and instruments. Each seat gets a hand from its own corner of the frame.
import { buildModel, PALETTE, setLookLayer, THREE, toonMaterial } from '../../pixel-engine.js';
import { CATALOG, handDef, TOOL_DEFS } from '../content/models/index.js';
import { TABLE_GAP } from './field.js';

const { Group, Mesh, CylinderGeometry, Vector3 } = THREE;
export const SEAT_GLOVES = [['sky', 'blue', 'teal'], ['red', 'plum', 'plum'], ['lime', 'green', 'green'], ['sand', 'orange', 'orange']];
const GRIP = new Vector3(), EULER = new THREE.Euler();
/** Shared tables: the seat's colour, as on the hub's player list. */
export const PLAYER_GLOVES = [['red', 'plum', 'plum'], ['blue', 'navy', 'navy'], ['green', 'teal', 'teal'], ['sand', 'orange', 'orange']];
// Each seat's arm comes in from its own corner: the handle and the wrist lie along the same line.
const SIDES = [{ ry: 0.72, rz: -0.14 }, { ry: -0.72, rz: 0.14 }, { ry: 2.4, rz: -0.14 }, { ry: -2.4, rz: 0.14 }];

export class HandView {
  constructor(ctx, field, seatIndex, gloveOverride) {
    this.ctx = ctx; this.field = field; this.i = seatIndex;
    const g = gloveOverride ?? SEAT_GLOVES[seatIndex] ?? SEAT_GLOVES[0];
    const def = handDef(`glove-hand-${g[0]}`, g[0], g[1], g[2]);
    this.hand = buildModel(def, { catalog: CATALOG }).object;
    this.hand.scale.setScalar(0.8);
    setLookLayer(this.hand, 'actors');
    this.hand.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    ctx.scene.add(this.hand);
    this.tools = {};
    for (const [id, tool] of Object.entries(TOOL_DEFS)) {
      const obj = buildModel(tool, { catalog: CATALOG }).object.clone(true);
      setLookLayer(obj, 'actors');
      obj.traverse((m) => { if (m.isMesh) m.castShadow = true; });
      obj.visible = false;
      ctx.scene.add(obj);
      this.tools[id] = obj;
    }
    this.gloveSlot = g[0];
    this.current = null;
    this.side = SIDES[seatIndex] ?? SIDES[0];
    this.grip = 0;
    this.bob = 0;
    this.reticle = new Mesh(new CylinderGeometry(0.2, 0.2, 0.03, 12), toonMaterial(PALETTE.white));
    setLookLayer(this.reticle, 'actors');
    ctx.scene.add(this.reticle);
    this.beam = new Mesh(new CylinderGeometry(0.035, 0.035, 2, 5), new THREE.MeshBasicMaterial({ color: PALETTE.red }));
    this.beam.visible = false;
    ctx.scene.add(this.beam);
    this.tmp = new Vector3();
    this.ghost = false;
  }
  setGhost() {
    this.ghost = true;
    const mat = new THREE.MeshBasicMaterial({ color: PALETTE.cyan, transparent: true, opacity: 0.35 });
    this.hand.traverse((m) => { if (m.isMesh) { m.material = mat; m.castShadow = false; } });
    for (const t of Object.values(this.tools)) t.traverse((m) => { if (m.isMesh) { m.material = mat; m.castShadow = false; } });
    this.reticle.visible = false;
  }
  setVisible(v) { this.hand.visible = v; this.reticle.visible = v && !this.ghost; if (!v && this.current) this.tools[this.current].visible = false; else if (v && this.current) this.tools[this.current].visible = true; if (!v) this.beam.visible = false; }
  update(seat, dt, state) {
    const f = this.field;
    if (seat.tool !== this.current) { if (this.current) this.tools[this.current].visible = false; this.current = seat.tool; if (this.current && this.tools[this.current]) this.tools[this.current].visible = true; this.bob = 0.35; }
    this.bob = Math.max(0, this.bob - dt * 1.6);
    const tool = this.tools[seat.tool];
    const x = seat.x + (seat.table ?? 0) * TABLE_GAP, z = seat.z, surf = f.surface(seat.x, seat.z);
    const using = seat.useHeld;
    const hover = seat.grab ? 0.42 : using ? 0.05 : 0.22;
    this.grip += ((hover) - this.grip) * Math.min(1, dt * 14);
    const y = surf + this.grip + this.bob;
    if (tool) {
      tool.position.set(x, y, z);
      tool.rotation.set(-0.5, this.side.ry, 0, 'YXZ');
      const jawA = tool.getObjectByName('jawA'), jawB = tool.getObjectByName('jawB');
      if (jawA && jawB) { const closed = seat.grab || using ? 0 : 0.2; jawA.rotation.y = closed; jawB.rotation.y = -closed; }
      const pl = tool.getObjectByName('plunger');
      if (pl) pl.position.z = 1.36 + (seat.drawing ?? 0) * 0.42;
    }
    // The palm sits on the handle, wherever the tool points.
    this.hand.rotation.set(-0.5, this.side.ry, this.side.rz, 'YXZ');
    GRIP.set(0, 0.34, 1.5).applyEuler(EULER.set(-0.5, this.side.ry, 0, 'YXZ'));
    this.hand.position.set(x + GRIP.x, y + GRIP.y, z + GRIP.z);
    this.reticle.position.set(x, surf + 0.06, z);
    const pulse = 0.9 + Math.sin(f.t * 8) * 0.14;
    this.reticle.scale.set(pulse, 1, pulse);
    this.reticle.material = toonMaterial(using ? PALETTE.lime : PALETTE.white);
    this.beam.visible = false;
    if (seat.tool === 'laser' && using && !this.ghost) {
      this.beam.visible = true;
      this.beam.scale.y = 0.2;
      this.beam.position.set(x, surf + 0.2, z);
    }
    void state;
  }
}
