// CRACKMANIA course: a Track made solid (its colliders), its gates, its spawn and the samples the loops' lane assist
// and the bot read. Pure simulation (no three.js), so tests and the browser build the same thing
import { TYPES, frameAt, CELL, GX, GY, LEVEL } from '../track/blocks.js';
import { blockGeometry, plateGeometry, SECTION, LIFT } from '../track/geometry.js';
import { TrackPhysics } from '../track/physics.js';
import { add } from '../lib/v3.js';

export const OFFROAD = { dustbowl: 'sand', hedgerow: 'grass', frostpeak: 'snow' };
export class Course {
  constructor(track, RAPIER, o = {}) {
    this.track = track; this.env = track.env; this.R = RAPIER;
    this.ph = new TrackPhysics(RAPIER); this.geo = new Map(); this.assist = new Map(); this.props = [];
    for (const b of track.blocks) this.addBlock(b);
    this.plate = plateGeometry(track, this.env, { off: OFFROAD[this.env] });
    this.ph.addGeometry('plate', this.plate);
    this.ph.commit(); this.refresh();
  }
  addBlock(b) {
    const g = blockGeometry(b, this.env, this.track); this.geo.set(b.id, g); this.ph.addGeometry(b.id, g, b.id);
    const T = TYPES[b.type];
    if (T.assist) { const S = []; for (let s = 0; s <= T.len; s += .5) S.push(frameAt(b, s)); this.assist.set(b.id, S); }
    return g;
  }
  removeBlock(id) { this.ph.remove(id); this.geo.delete(id); this.assist.delete(id); }
  /** after edits: the plate again (chasms may change), gates, spawn, route samples */
  rebuildPlate() { this.ph.remove('plate'); this.plate = plateGeometry(this.track, this.env, { off: OFFROAD[this.env] }); this.ph.addGeometry('plate', this.plate); }
  refresh() {
    const S = SECTION[this.env], tr = this.track;
    this.gates = [];
    for (const b of tr.blocks) {
      const T = TYPES[b.type];
      if (T.cp || T.finish) { const f = frameAt(b, T.gateS); this.gates.push({ id: b.id, kind: T.cp ? 'cp' : 'finish', p: add(f.p, f.u, LIFT), t: f.t, u: f.u, r: f.r, hw: S.hw + S.curb + 1.2, b }); }
    }
    this.cpCount = this.gates.filter(g => g.kind === 'cp').length;
    const st = tr.start;
    this.spawn = st ? frameAt(st, TYPES[st.type].spawnS) : null;
    if (this.spawn) this.spawn.p = add(this.spawn.p, this.spawn.u, LIFT);
    this.samples = tr.samples(2);
    for (const s of this.samples) s.p = add(s.p, s.u || [0, 0, 1], LIFT);
    this.ph.commit();
  }
  assistOf = id => this.assist.get(id) || null;
  /** which cell kind is at a world point: 'water' | 'canyon' | null */
  chasmAt(x, y) { const cx = Math.floor((x - GX) / CELL), cy = Math.floor((y - GY) / CELL); return this.track.chasms.get(cx + ',' + cy) || null; }
  addPropCollider(key, x, y, r, h) { this.ph.cylinder(key, x, y, 0, r, h); }
  addPropBox(key, x, y, z, hx, hy, hz, yaw) { this.ph.box(key, x, y, z + hz, hx, hy, hz, yaw); }
  free() { this.ph.free(); }
}
