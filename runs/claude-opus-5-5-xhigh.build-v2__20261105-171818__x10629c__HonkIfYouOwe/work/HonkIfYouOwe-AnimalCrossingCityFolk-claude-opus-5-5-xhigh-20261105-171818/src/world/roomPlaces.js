// Rooms are built the first time someone walks in.
import { RoomPlace } from './rooms.js';
import { HomeRoom } from './home.js';
import { ROOMS } from '../data/rooms.js';

export class RoomPlaces {
  constructor(g) { this.g = g; this.map = new Map(); }
  get(id) {
    let r = this.map.get(id);
    if (!r) {
      const def = ROOMS[id];
      if (!def && id.startsWith('home')) r = new HomeRoom(this.g, id);
      else if (!def) throw new Error(`no room ${id}`);
      else r = new RoomPlace(this.g, id, def);
      this.map.set(id, r);
      this.g.ctx.scene.add(r.group);
    }
    return r;
  }
  /** Forget a built room (dev tools; a new save). */
  reset() { for (const r of this.map.values()) { r.group.removeFromParent(); } this.map.clear(); }
}
