// Moving between the town, the City and interiors: iris transitions, per-place grids, props, music, scan for interactions.
import { THREE } from '../engine.js';
import { PLACES } from '../world/places.js';
import { ROOMS, buildRoom, loadFurniture, furnMesh } from '../world/rooms.js';
import { BUILDINGS, SPAWNS } from '../world/townMap.js';
import { songNamed } from '../audio/composer.js';
export const places = {
  built: false,
  build(g) {
    if (this.built) return; this.built = true;
    for (const def of Object.values(ROOMS)) { const grp = buildRoom(def, g); g.ctx.scene.add(grp); g.sys.venues?.dress?.(g, def); }
  },
  cur(g) { return PLACES[g.place] ?? PLACES.town; },
  showOnly(g, id) {
    g.town.group.visible = id === 'town' || id === 'home'; g.npcs.group.visible = (id === 'town' || id === 'home') && g.mode !== 'intro'; if (g.sys.city?.group) g.sys.city.group.visible = id === 'city';
    for (const def of Object.values(ROOMS)) def.group.visible = def.id === id;
  },
  async enter(g, b) {
    if (this.entering || g.cutscene) return; if (b.kind === 'cottage') { const n = g.npcs.byId[b.owner]; if (n?.sleeping) { this.entering = true; g.sfx('door'); g.player.setFacing(0, -1); g.player.pos.z = b.door[1] + 1.4; await g.say(n.def ? { name: n.name, type: n.type, pitch: n.pitch, actor: n.actor } : null, `...Who knocks at this hour? ${n.def.tic} ...Come back in the morning.`); this.entering = false; return; } } const id = this.roomFor(g, b); if (!id) return; if (id === 'store' && (g.hour < 8 || g.hour >= 22) && !g.world.flags.devOpen) { this.entering = true; g.sfx('door'); await g.say(g.sys.venues.host('gander'), `Closed, dear. Hours are 8 to 22. I'm behind the door, counting. (Come back at eight.)`); this.entering = false; return; } this.entering = true;
    await this.go(g, id, 'door', b.id); this.entering = false;
  },
  roomFor(g, b) {
    if (b.kind === 'cottage') return ROOMS['house_' + b.owner] ? 'house_' + b.owner : null; if (b.kind === 'home') return 'home'; if (b.kind === 'store') return 'store'; if (b.kind === 'hall') return 'hall'; if (b.kind === 'museum') return 'museum'; if (b.kind === 'mothwick') return 'mothwick'; return null;
  },
  async go(g, id, how = 'door', from = null) {
    const dest = id === 'town' ? PLACES.town : PLACES[id]; if (!dest) return; const p = g.player; g.cutsceneStart(); g.sfx('door');
    const s = g.engine.screen; try { await s.cover('iris', { duration: 0.28 }); } catch {}
    this.build(g); const prev = g.place; g.place = id; this.showOnly(g, id); this.indoorLight(g, id);
    if (id === 'town') { const b = BUILDINGS.find(x => x.id === (from ?? g.lastDoor)) ; const dt = b ? [b.door[0] + 0.5, b.door[1] + 1.4] : (g.lastTownPos ?? SPAWNS.plaza); p.pos.x = dt[0]; p.pos.z = dt[1]; if (from === 'bus') { p.pos.x = SPAWNS.bus[0]; p.pos.z = SPAWNS.bus[1]; } }
    else { if (prev === 'town') { g.lastTownPos = [p.pos.x, p.pos.z]; g.lastDoor = from; } const def = dest.def ?? dest; p.pos.x = dest.ox + (def.doorX ?? dest.w / 2); p.pos.z = dest.oz + dest.d - 1.2; p.setFacing(0, -1); }
    g.floorY = 0; p.actor.setPos(p.pos.x, p.pos.z); g.target.set(p.pos.x, 0.8, p.pos.z);
    this.setMusic(g, id); g.autosave?.('door'); g.sys.venues?.onEnter?.(g, id); g.cutsceneEnd();
    try { await s.reveal('iris', { duration: 0.28 }); } catch {}
  },
  indoorLight(g, id) { const e = g.engine; if (id === 'town' || id === 'city') return; e.sun.intensity = 1.6; e.sun.color.setHex(0xfff2d6); e.ambient.intensity = 1.6; e.ambient.color.setHex(0xcfd8ff); g.ctx.scene.background = new THREE.Color(0x1a1c2c); },
  setMusic(g, id) { const m = id === 'town' ? null : (ROOMS[id]?.music ?? (id.startsWith('house') || id === 'home' ? 'hall' : 'hall')); if (m) { g.musicName = ''; g.setMusic(m); } else g.updateMusic(true); },
  /** Interactions inside a place: props with run(). */
  scan(g) {
    const def = ROOMS[g.place]; if (!def) return g.sys.city?.scan?.(g) ?? null; const p = g.player, f = p.facing ?? { x: 0, z: 1 }; let best = null, bd = 1.8;
    // exit at the door mat
    if (p.pos.z - def.oz > def.d - 0.8 && (p.facing?.z ?? 0) > 0.3 && p.speed > 0.1) { this.exitRoom(g); return null; }
    for (const pr of def.props ?? []) { if (!pr.run || pr.hidden?.(g)) continue; const x = def.ox + pr.x, z = def.oz + pr.z; const dx = x - p.pos.x, dz = z - p.pos.z; const d = Math.hypot(dx, dz); const dot = d > 0.01 ? (dx * f.x + dz * f.z) / d : 1; if (d < (pr.r ?? 1.7) && (dot > 0.2 || d < 0.9) && d < bd) { bd = d; best = { kind: 'custom', label: typeof pr.label === 'function' ? pr.label(g) : pr.label, run: (gg) => pr.run(gg, pr) }; } }
    return best;
  },
  async exitRoom(g) { if (this.entering) return; this.entering = true; const def = ROOMS[g.place]; await this.go(g, def?.exitTo ?? 'town', 'exit', def?.exitDoor ?? g.lastDoor); this.entering = false; },
};
