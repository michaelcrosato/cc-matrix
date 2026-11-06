// Helpers mixed into Game: timers, pockets, particles, ground picking, per-place movement, saving, rumble.
import { THREE, PALETTE } from './engine.js';
import { item } from './data/items.js';
import { saveWorld, uid } from './core/world.js';
import { TW } from './world/townMap.js';
import { PLACES } from './world/places.js';
const POCKETS = 15;
export function install(Game) {
  const P = Game.prototype;
  P.after = function (sec, fn) { this.timers ??= []; this.timers.push({ t: sec, fn }); };
  P.stepTimers = function (dt) { if (!this.timers?.length) return; for (const t of this.timers) t.t -= dt; const due = this.timers.filter(t => t.t <= 0); this.timers = this.timers.filter(t => t.t > 0); for (const t of due) t.fn(); };
  P.uid = function () { return uid(this.world); };
  P.give = function (id, n = 1, extra = null) { const w = this.world; const def = item(id); if (def.kind === 'tool') { if (!w.tools.includes(id)) w.tools.push(id); return true; } if (def.kind === 'beans') { /* bag: keep as item */ } const stack = w.pockets.find(s => s.id === id && def.kind !== 'furniture' && def.kind !== 'clothes'); if (stack && ['fruit', 'weed', 'shell', 'seed', 'mushroom', 'paper', 'cheese'].includes(def.kind)) { stack.n = (stack.n ?? 1) + n; return true; } if (w.pockets.length >= POCKETS) return false; for (let i = 0; i < n; i++) w.pockets.push({ id, n: 1, ...(extra ?? {}) }); w.owned[id] = true; return true; };
  P.take = function (id, n = 1) { const w = this.world; for (let k = 0; k < n; k++) { const i = w.pockets.findIndex(s => s.id === id); if (i < 0) return false; const s = w.pockets[i]; if ((s.n ?? 1) > 1) s.n--; else w.pockets.splice(i, 1); } return true; };
  P.count = function (id) { return this.world.pockets.reduce((a, s) => a + (s.id === id ? (s.n ?? 1) : 0), 0); };
  P.dropItem = function (id, x, z, quiet, real) { const f = this.grid.free(x, z); this.world.town.items.push({ uid: this.uid(), id, x: f[0], z: f[1], ...(real ? { real } : {}) }); this.town.syncItems(this.world.town.items); if (!quiet) this.sfx('pick'); };
  P.addBeans = function (n) { this.world.beans = Math.max(0, this.world.beans + Math.round(n)); };
  P.sparkle = function (x, z, y = 1, c = 'sand') { if (this.place !== 'town' && !this.place?.startsWith?.('city')) { /* fine */ } this.ctx.particles.burst('sparkle', new THREE.Vector3(x, y, z), { count: 10, colors: [c, 'white'] }); };
  P.splash = function (x, z) { this.sfx('splash'); this.ctx.particles.burst('dust', new THREE.Vector3(x, 0, z), { count: 8, colors: ['white', 'sky'] }); };
  P.rumble = function (strong, dur = 0.15) { if (!this.settings.rumble || typeof navigator === 'undefined' || !navigator.getGamepads) return; try { for (const pad of navigator.getGamepads()) pad?.vibrationActuator?.playEffect?.('dual-rumble', { duration: dur * 1000, strongMagnitude: strong, weakMagnitude: strong * 0.6 }); } catch {} };
  P.shakeMesh = function (t) { const tm = this.town.treeMeshes.get(t.id); if (!tm) return; this.ctx.tweens?.to?.(tm.obj.rotation, { z: 0.08 }, { duration: 0.08, ease: 'outQuad' }); this.after(0.09, () => { tm.obj.rotation.z = -0.05; this.after(0.08, () => { tm.obj.rotation.z = 0; }); }); for (let i = 0; i < 4; i++) this.ctx.particles.burst('dust', new THREE.Vector3(t.x + 0.5, 2.2, t.z + 0.5), { count: 2, colors: ['lime', 'green'] }); };
  P.footstep = function (pos, mode) { this.snowPrint(pos); const t = this.place === 'town' ? this.tiles[Math.floor(pos.z) * TW + Math.floor(pos.x)] : 9; const name = t === 4 ? 'step_sand' : t === 1 || t === 6 ? 'step_path' : t === 5 || t === 8 || t === 9 ? 'step_wood' : this.season === 3 && t === 0 ? 'step_snow' : 'step_grass'; this.sfx(name, { volume: mode === 'tiptoe' ? 0.4 : mode === 'run' ? 1 : 0.7, pitch: (this.cosmetic() - 0.5) * 3 }); if (mode === 'run' && this.place === 'town') this.ctx.particles.burst('dust', new THREE.Vector3(pos.x, 0.05, pos.z), { count: 1 }); };
  P.snowPrint = function (pos) { if (this.season !== 3 || this.place !== 'town' || this.tiles[Math.floor(pos.z) * TW + Math.floor(pos.x)] !== 0) return; this.prints ??= { list: [], i: 0 }; const P_ = this.prints; if (!P_.group) { P_.group = new THREE.Group(); this.ctx.scene.add(P_.group); } let m = P_.list[P_.i % 70]; if (!m) { m = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 6), new THREE.MeshBasicNodeMaterial({ color: 0x94b0c2 })); m.scale.z = 1.6; P_.group.add(m); P_.list.push(m); } P_.i++; const side = (P_.i % 2 ? 1 : -1) * 0.16; const yaw = this.player.yaw; m.position.set(pos.x + Math.cos(yaw) * side, 0.04, pos.z - Math.sin(yaw) * side); m.rotation.y = yaw; m.visible = true; };
  P.groundPoint = function (nx, ny) { const o = new THREE.Vector3(), d = new THREE.Vector3(); this.ctx.camera.rayAt(nx, ny, o, d); if (Math.abs(d.y) < 1e-4) return null; const t = -o.y / d.y; if (t < 0) return null; return { x: o.x + d.x * t, z: o.z + d.z * t }; };
  P.placeMove = function (pos, dx, dz, r) { const pl = PLACES[this.place] ?? PLACES.town; if (this.place === 'town') return this.grid.move(pos, dx, dz, r); const L = { x: pos.x - pl.ox, z: pos.z - pl.oz }; const b = pl.grid().move(L, dx, dz, r); pos.x = L.x + pl.ox; pos.z = L.z + pl.oz; return b; };
  P.autosave = function (why) { if (this.mode !== 'play' || !this.world || this.world.noSave) return; this.world.realStamp = Date.now(); this.world.cleanExit = why === 'bed'; this.world.saves++; saveWorld(this.world); };
  P.errandProgress = function (kind, def) { this.sys.errands?.progress?.(this, kind, def); };
  P.fade = async function (fn, o = {}) { const s = this.engine.screen; await s.cover(o.kind ?? 'iris', { duration: 0.35 }); await fn(); await s.reveal(o.kind ?? 'iris', { duration: 0.35 }); };
  P.cutsceneStart = function () { this.cutscene = (this.cutscene ?? 0) + 1; }; P.cutsceneEnd = function () { this.cutscene = Math.max(0, (this.cutscene ?? 1) - 1); };
}
