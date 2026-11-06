// Doors and transitions: one scene, Groups shown one at a time. Own timers so transitions replay exactly.
import { G, bus } from '../state.js';
import { makeRoom, ROOM_DEFS, buildFurn, matWall, matFloor } from './rooms.js';
import { BUILDINGS, CITY } from './layout.js';
import { ITEMS } from '../data/items.js';
import { M } from '../audio/music.js';
import { saveNow } from '../core/save.js';
import { THREE } from '../engine.js';
export const Trans = { t: 0, phase: null, cb: null, kind: 'iris', speed: 2.8,
  go(cb, kind = 'iris', speed = 2.8) { if (this.phase) return false; this.phase = 'cover'; this.t = 0; this.cb = cb; this.kind = kind; this.speed = speed; return true; },
  update(dt) { if (!this.phase) return; this.t += dt * this.speed; const s = G.ctx.engine.screen; if (this.phase === 'cover') { s.set(this.kind, Math.min(1, this.t)); if (this.t >= 1) { const c = this.cb; this.cb = null; c?.(); this.phase = 'reveal'; this.t = 0; } } else { s.set(this.kind, Math.max(0, 1 - this.t)); if (this.t >= 1) { this.phase = null; s.set(null, 0); s.clear?.(); } } },
  get busy() { return !!this.phase; } };
export function ensureRoom(id) { let r = G.rooms[id]; if (r) return r; const def = ROOM_DEFS[id]; if (!def) throw new Error('no room ' + id); r = makeRoom(id, def); G.rooms[id] = r; G.ctx.scene.add(r.group); G.places[id] = r.place; bus.emit('roomMade', r); return r; }
export function rebuildRoom(id) { const r = G.rooms[id]; if (r) { G.ctx.scene.remove(r.group); delete G.rooms[id]; delete G.places[id]; } return ensureRoom(id); }
/** Move the player into a place at once. */
export function setPlace(id, x, z, facing) {
  const w = G.world; if (id !== 'town' && id !== 'city') ensureRoom(id);
  w.p.place = id; w.p.x = x; w.p.z = z; if (facing != null) w.p.facing = facing; G.place = G.places[id];
  G.view.show(id); G.player?.placeNow(); const def = ROOM_DEFS[id]; M.venue = def?.music ?? null;
  G.ctx.engine.camera.teleport?.(new THREE.Vector3(x, 0.9, z)); bus.emit('entered', id); G.onEntered?.(id);
  if (G.mode === 'play' && !G.demo && !w.guest) saveNow(w, G.nowMs?.());
}
export function enterRoom(id, spot) { const def = ROOM_DEFS[id]; const r = ensureRoom(id); const [x, z] = spot ?? (r.exitAt ? [r.exitAt[0], r.exitAt[1] - 0.8] : [r.ox + def.w / 2, def.d - 1.2]); return Trans.go(() => { setPlace(id, x, z, Math.PI); G.ctx.audio.play('door'); }); }
export function exitRoom() { const w = G.world, def = ROOM_DEFS[w.p.place]; const [where, what] = (def.exit ?? 'town:home').split(':'); if (where === 'town') { const b = BUILDINGS.find((x) => x.id === what); return Trans.go(() => { setPlace('town', b.door[0], b.door[1] + 0.8, 0); G.ctx.audio.play('door'); }); } if (what === 'tent') return Trans.go(() => { setPlace('city', CITY.tent[0] + CITY.ox, CITY.tent[1] + 2.6, 0); G.ctx.audio.play('door'); }); const f = CITY.fronts.find((x) => x.id === what); return Trans.go(() => { setPlace('city', f.door[0] + CITY.ox, f.door[1] + (f.rot ? 0 : 0.8), f.rot ? Math.PI / 2 : 0); G.ctx.audio.play('door'); }); }
