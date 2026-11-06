// Neighbours keep living: routines, paths from NavGrid, chats, moods. Hosts stand at their posts.
import { NavGrid, THREE } from '../engine.js';
import { G, bus } from '../state.js';
import { CAST, NEIGHBOURS, STAFF_ROOM, nameOf } from '../data/cast.js';
import { Actor } from './actor.js';
import { critterDef } from '../art/critter.js';
import { T } from '../dev/tuning.js';
import { TOWN_ROWS } from '../data/townMap.js';
import { BUILDINGS, LANDMARK, BENCHES } from '../world/layout.js';
import { hourOf } from '../core/calendar.js';
import { rngOf, clamp, lerp, dist2 } from '../core/util.js';
import { ROOM_DEFS } from '../world/rooms.js';
import { GOSSIP } from '../data/lines.js';
import { fill } from '../ui/dialogue.js';
import { buildModel } from '../engine.js';
import { umbrellaDef, TOOL_DEFS, itemDef } from '../art/models.js';
import { ITEMS } from '../data/items.js';
const SPRINGS = { nib: [{ colors: ['white', 'ink', 'white', 'ink', 'white', 'ink', 'white'], at: [0, 0.34, -0.22], rest: [0, 0.8, -0.6] }], bartleby: [{ colors: ['white', 'white', 'sky'], at: [-0.62, 1.32, 0.06], rest: [0, -1, 0.05], len: 0.12, r: 0.07, stiffness: 3, gravity: 7 }], yolanda: [{ colors: ['red', 'red', 'red', 'sand'], at: [0.14, 0.72, 0.22], rest: [0.1, -1, 0.15], len: 0.13, r: 0.08, stiffness: 4, gravity: 7 }], ottoline: [{ colors: ['sky', 'sky', 'white'], at: [0, 1.02, -0.28], rest: [0, -0.7, -0.7], len: 0.13, r: 0.06, stiffness: 5, gravity: 5 }], flavia: [{ colors: ['red', 'white', 'red'], at: [0, 1.0, -0.22], rest: [0, -0.5, -0.9], len: 0.14, r: 0.07, stiffness: 5, gravity: 5 }], trundle: [{ colors: ['red', 'red', 'sand'], at: [0.3, 0.42, 0.12], rest: [0.2, -1, 0], len: 0.1, r: 0.06, stiffness: 4, gravity: 7 }] };
const RIVER_POI = [[37, 30], [36.5, 22], [44, 35]];
const HOURS = { hearth: [6, 21], sunshine: [6, 22], grouch: [8, 20], diva: [10, 24], gogetter: [5, 21], dreamer: [11, 27], schemer: [12, 28], auntie: [7, 22], hustler: [9, 23] };
const POI = [[20, 41.5], [28, 41.5], [24, 35], [37, 30], [36.5, 22], [44, 35], [60, 39.6], [31, 27], [12, 39.6], [24, 47], [52, 27], [66, 26], [24, 46], [50, 33], [68, 41], [19, 27]];
const homeOf = (id) => (id === 'fitch' ? 'rocco' : id);
export const isAwake = (id, w) => { const [a, b] = HOURS[CAST[id].type] ?? [7, 21]; let h = hourOf(w.clock); if (h < 5 && b > 24) h += 24; return h >= a && h < b; };
export const NPC = {
  actors: {}, rt: {},
  init(ctx) {
    this.ctx = ctx; this.group = new THREE.Group(); ctx.scene.add(this.group); this.actors = {}; this.rt = {}; this.r = ctx.random.fork('npc');
    const rows = TOWN_ROWS.map((row) => [...row].map((c) => ('.,PsuUrb'.includes(c) ? '.' : '#')).join(''));
    this.nav = NavGrid.fromRows(rows, { blocked: '#', cell: 1, origin: [0, 0, 0] }); G.nav = this;
    for (const b of BUILDINGS) for (let z = Math.floor(b.z - b.d / 2); z <= Math.floor(b.z + b.d / 2); z++) for (let x = Math.floor(b.x - b.w / 2); x <= Math.floor(b.x + b.w / 2); x++) this.nav.setOpen(x, z, false);
    this.closed = new Set();
    for (const id of NEIGHBOURS) this.make(id);
    this.make('trundle'); this.rt.trundle.fixed = true; this.make('rind'); this.rt.rind.fixed = true; this.make('vesper'); this.rt.vesper.fixed = true; this.make('hester'); this.rt.hester.fixed = true;
    for (const [id, room] of Object.entries(STAFF_ROOM)) { this.make(id, { staff: room }); }
  },
  make(id, o = {}) { const def = critterDef({ id: 'npc-' + id, ...CAST[id].look }); const a = new Actor(def, { seed: id.length * 3, scale: 1, springs: SPRINGS[id] }); a.addTo(this.group); a.visible = false; this.actors[id] = a; this.rt[id] = { id, path: null, wait: this.r.range(0, 4), act: null, staff: o.staff, bubble: null, bubbleT: 0, inPlace: 'town', x: 0, z: 0, hold: null }; return a; },
  syncEnts(circles) { for (const k of this.closed) { const [x, z] = k.split(',').map(Number); this.nav.setOpen(x, z, true); } this.closed.clear(); for (const c of circles) { const x = Math.floor(c.x), z = Math.floor(c.z); this.nav.setOpen(x, z, false); this.closed.add(x + ',' + z); } },
  /** Everyone back to where they'd be, used on load and after big time jumps. */
  settle() { const w = G.world; for (const id of NEIGHBOURS) { const st = w.npcs[id], rt = this.rt[id]; if (st.moved === 'gone' || st.moved === 'notyet') { st.place = 'away'; continue; } if (!isAwake(id, w)) { this.goInside(id); } else { const r = rngOf(`${w.seed}:poi:${w.clock.day}:${id}`); const [x, z] = r.pick(POI); rt.x = x; rt.z = z; st.place = 'town'; rt.path = null; rt.wait = r.range(0, 3); } } },
  goInside(id) { const st = G.world.npcs[id], rt = this.rt[id]; const room = 'h_' + (id === 'fitch' ? 'fitch' : id); st.place = room; const def = ROOM_DEFS[room]; rt.x = (def.w ?? 7) / 2; rt.z = 3; rt.indoorLocal = true; rt.path = null; },
  setStaffPlaces() { for (const id of Object.keys(STAFF_ROOM)) { const room = G.rooms[STAFF_ROOM[id]]; const rt = this.rt[id]; if (room) { const h = room.def.host; rt.x = room.ox + h.x; rt.z = h.z; rt.placeId = room.id; } } },
  fixed(dt) {
    const w = G.world; if (!w) return;
    for (const id of NEIGHBOURS) {
      const st = w.npcs[id], rt = this.rt[id]; if (st.moved === 'gone' || st.moved === 'notyet') continue;
      const awake = isAwake(id, w), wx = G.view.weatherKind, wet = wx === 'rain' || wx === 'storm';
      if (st.place !== 'town') { if (awake && !(wet && rngOf(`${w.seed}:wet:${w.clock.day}:${id}`).chance(0.4)) && !rt.keepIn) { const b = BUILDINGS.find((x) => x.id === homeOf(id)); rt.x = b.door[0]; rt.z = b.door[1] + 0.7; st.place = 'town'; rt.indoorLocal = false; rt.path = null; rt.wait = this.r.range(0.5, 3); } continue; }
      if (rt.pause > 0) { rt.pause -= dt; continue; }
      if (rt.path && rt.path.length) {
        const [px, , pz] = rt.path[0]; const dx = px - rt.x, dz = pz - rt.z, d = Math.hypot(dx, dz), v = T.npcWalk * dt;
        if (d <= v) { rt.x = px; rt.z = pz; rt.path.shift(); } else { rt.x += (dx / d) * v; rt.z += (dz / d) * v; rt.face = Math.atan2(dx, dz); }
        rt.moving = true;
        if (!rt.path.length) { rt.path = null; rt.moving = false; rt.wait = this.r.range(4, 14); if (rt.goHome) { rt.goHome = false; this.goInside(id); continue; } rt.carry = false; const fishing = RIVER_POI.some(([x, z]) => Math.hypot(x - rt.x, z - rt.z) < 1.2); const atShow = G.yearInfo?.vesperHere && Math.hypot(LANDMARK.lamp[0] - rt.x, LANDMARK.lamp[1] - rt.z) < 6; rt.act = atShow ? 'Sway' : fishing ? 'Reel' : this.r.pick(['Idle', 'Hum', 'Idle', 'Wave', 'Sway', 'IdleBored']); if (fishing) { rt.face = Math.atan2(39.5 - rt.x, 0); } if (!fishing && !atShow) this.maybeChat(id); }
        continue;
      }
      rt.moving = false; rt.wait -= dt;
      if (rt.wait <= 0) {
        rt.bubble = null; rt.act = null; const goHome = !awake || (wet && this.r.chance(0.5));
        const show = !goHome && G.yearInfo?.vesperHere; const [tx, tz] = goHome ? (() => { const b = BUILDINGS.find((x) => x.id === homeOf(id)); return [b.door[0], b.door[1] + 0.7]; })() : show ? [LANDMARK.lamp[0] + this.r.range(-3.4, 3.4), LANDMARK.lamp[1] + this.r.range(1.4, 3)] : this.r.pick(POI);
        rt.carry = !goHome && !show && this.r.chance(0.2);
        rt.goHome = goHome;
        const path = this.nav.path([rt.x, 0, rt.z], [tx, 0, tz]);
        if (path && path.length) rt.path = path; else { rt.wait = 3; if (goHome) this.goInside(id); else this.unstick(rt); }
      }
    }
  },
  /** Someone planted a tree on them, or similar: step to the nearest open cell so paths work again. */
  unstick(rt) { const c = this.nav.col(rt.x), r = this.nav.row(rt.z); if (this.nav.isOpen(c, r)) return; for (let d = 1; d < 6; d++) for (const [a, b] of [[d, 0], [-d, 0], [0, d], [0, -d], [d, d], [-d, -d], [d, -d], [-d, d]]) if (this.nav.isOpen(c + a, r + b)) { rt.x = this.nav.centerX(c + a); rt.z = this.nav.centerZ(r + b); rt.wait = 0.2; return; } },
  maybeChat(id) { const rt = this.rt[id]; if (T.chat <= 0) return; for (const other of NEIGHBOURS) { if (other === id) continue; const o = this.rt[other], s = G.world.npcs[other]; if (s.place !== 'town' || s.moved === 'gone' || s.moved === 'notyet') continue; if (dist2(rt.x, rt.z, o.x, o.z) < 16 && !o.moving) { const line = fill(this.r.pick(GOSSIP), { n1: nameOf(this.r.pick(NEIGHBOURS.filter((n) => n !== id && n !== 'fitch'))), n2: nameOf(this.r.pick(NEIGHBOURS.filter((n) => n !== id && n !== 'fitch'))) }); rt.bubble = line; rt.bubbleT = 7 / Math.max(0.2, T.chat); rt.faceTo = [o.x, o.z]; o.faceTo = [rt.x, rt.z]; o.act = 'Listen'; rt.act = 'Talk'; G.world.stats.chats = (G.world.stats.chats ?? 0) + 1; return; } } },
  update(dt) {
    const w = G.world, place = w.p.place, H = G.places.town; const px = w.p.x, pz = w.p.z, pS = G.player?.speed ?? 0;
    for (const id of Object.keys(this.actors)) {
      const a = this.actors[id], rt = this.rt[id], st = w.npcs[id];
      let vis = false, x = rt.x, z = rt.z, y = 0;
      if (st) {
        if (st.place === 'town') { vis = place === 'town'; y = H.heightAt(x, z); }
        else if (rt.indoorLocal && st.place === place) { const r = G.rooms[place]; vis = !!r; x = r ? r.ox + rt.x : 0; z = rt.z; }
        else vis = false;
        if (vis && st.place === 'town' && id === 'ozzie' && pS > 5 && dist2(x, z, px, pz) < 5 && !rt.deadT) { rt.deadT = 4; rt.pause = 4; a.play('PlayDead', { hold: true, restart: true }); }
        if (rt.deadT > 0) { rt.deadT -= dt; if (rt.deadT <= 0) { rt.deadT = 0; a.play('Idle'); } }
      } else if (rt.staff) { const r = G.rooms[rt.staff]; if (r && place === rt.staff) { vis = true; x = r.ox + r.def.host.x; z = r.def.host.z; rt.x = x; rt.z = z; } }
      else if (rt.fixed) { vis = rt.vis?.(place) ?? false; x = rt.x; z = rt.z; y = rt.y ?? 0; }
      if (rt.force) { vis = true; [x, y, z] = rt.force; }
      a.visible = vis; if (!vis) continue;
      a.place(x, y, z);
      if (st && !rt.deadT) { const wx = G.view.weatherKind, outside = st.place === 'town'; const want = outside && (wx === 'rain' || wx === 'storm') ? 'umb' : outside && rt.act === 'Reel' && !rt.moving ? 'rod' : outside && rt.carry && rt.moving ? 'box' : null; if (want !== rt.holding) { rt.holding = want; a.drop(); if (want === 'umb') a.hold(buildModel(umbrellaDef(['red', 'blue', 'sand', 'plum', 'lime'][id.length % 5]), {}).object); if (want === 'rod') a.hold(buildModel(TOOL_DEFS.rod, {}).object); if (want === 'box') a.hold(buildModel(itemDef(ITEMS.parcel), {}).object); } }
      if (rt.talkTo) a.faceTo(px, pz); else if (rt.faceTo) { a.faceTo(rt.faceTo[0], rt.faceTo[1]); if (!rt.path) { /* hold */ } } else if (rt.face != null) a.targetFacing = rt.face;
      if (!rt.deadT && !rt.script) {
        if (rt.talkTo) a.play(a.talking > 0 ? 'Talk' : 'Listen'); else if (rt.moving) a.play(id === 'rocco' ? 'Run' : id === 'pimm' ? 'PimmScuttle' : 'Walk'); else if (rt.clip) a.play(rt.clip); else a.play(rt.act ?? 'Idle');
      }
      if (rt.bubbleT > 0) { rt.bubbleT -= dt; if (rt.bubbleT <= 0) { rt.bubble = null; rt.faceTo = null; rt.act = null; } }
      a.update(dt);
    }
    this.mayor();
    this.rt.rind.vis = (p) => p === 'town' && G.yearInfo?.rindHere; const rp = LANDMARK.rindStall; this.rt.rind.x = rp[0]; this.rt.rind.z = rp[1] + 1.2;
  },
  mayor() { const rt = this.rt.trundle, w = G.world; const d = clamp((Math.min(w.clock.day, 4) - 1 + (w.clock.minute / 1440)) / 3, 0, 1); const [ax, az] = LANDMARK.mayorStart, [bx, bz] = LANDMARK.mayorEnd; rt.x = lerp(ax, bx, d); rt.z = lerp(az, bz, d); rt.vis = (p) => p === 'town'; rt.clip = 'MayorSlide'; rt.face = Math.PI / 2; if (w.flags.mayorAway) rt.vis = () => false; },
  /** All in-town people the player can see, for targeting. */
  talkable() { const w = G.world, out = []; for (const id of Object.keys(this.actors)) { const a = this.actors[id]; if (!a.visible) continue; out.push({ id, x: a.root.position.x, z: a.root.position.z }); } return out; },
};
