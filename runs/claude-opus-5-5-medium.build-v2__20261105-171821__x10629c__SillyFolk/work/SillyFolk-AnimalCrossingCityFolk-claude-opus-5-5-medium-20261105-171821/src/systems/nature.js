// Fish shadows, bugs, balloons, wasps, stars: the small living things. Rolls from seeded streams.
import { THREE, buildModel, toonMaterial, PALETTE, setLookLayer } from '../engine.js';
import { G, bus } from '../state.js';
import { T } from '../dev/tuning.js';
import { rngOf, clamp, angleDelta } from '../core/util.js';
import { FISH_LIST, BUG_LIST, ITEMS } from '../data/items.js';
import { info, giveItem, pocketFree, remember, addEnt, removeEnt, isFree } from '../core/world.js';
import { hourOf, weatherNow } from '../core/calendar.js';
import { LAMPS } from '../world/layout.js';
import { itemDef } from '../art/models.js';
import { say, Script, Toasts, fill } from '../ui/dialogue.js';
const inHours = (h, hrs) => !hrs || (hrs[0] < hrs[1] ? h >= hrs[0] && h < hrs[1] : h >= hrs[0] || h < hrs[1]);
export const fishNow = (w, kind, luck = 0) => { const s = String(info(w).season), h = hourOf(w.clock); return FISH_LIST.filter((f) => f.where === kind && f.seasons.includes(s) && inHours(h, f.hours)); };
export const bugsNow = (w, spot) => { const s = String(info(w).season), h = hourOf(w.clock); const rainy = ['rain', 'storm'].includes(G.view?.weatherKind ?? weatherNow(w.weather, h)); return BUG_LIST.filter((b) => (b.spot === spot || (b.spot === 'rockrain' && spot === 'rock' && rainy)) && b.seasons.includes(s) && inHours(h, b.hours)); };
const SIZES = { S: 0.5, M: 0.8, L: 1.15, XL: 1.6 };
const matShadow = () => toonMaterial(PALETTE.night);
export const Nature = {
  group: null, rngRun: null,
  init(ctx) { this.group = new THREE.Group(); ctx.scene.add(this.group); this.rng = ctx.random.fork('nature'); G.fish = []; G.bugs = []; G.balloons = []; G.wasps = []; this.sling = []; this.lastHourKey = null; this.bobberMesh = this.makeBobber(); this.group.add(this.bobberMesh); this.bobberMesh.visible = false; },
  makeBobber() { const g = new THREE.Group(); const a = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), toonMaterial(PALETTE.red)); const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 5), toonMaterial(PALETTE.white)); b.position.y = 0.12; g.add(a, b); return g; },
  clear() { for (const f of G.fish) this.group.remove(f.mesh); for (const b of G.bugs) this.group.remove(b.mesh); G.fish = []; G.bugs = []; },
  respawn() {
    const w = G.world, P = G.places.town; this.clear(); if (!w || T.fishPerAcre < 0) return;
    const r = rngOf(`${w.seed}:life:${w.clock.day}:${hourOf(w.clock)}`);
    for (let az = 0; az < 4; az++) for (let ax = 0; ax < 5; ax++) {
      const water = {}; for (let z = az * 16; z < az * 16 + 16; z++) for (let x = ax * 16; x < ax * 16 + 16; x++) { const k = P.waterKind(x + 0.5, z + 0.5); if (k && z < 62) (water[k] ??= []).push([x + 0.5, z + 0.5]); }
      const kinds = Object.keys(water).filter((k) => water[k].length >= 6);
      if (kinds.length) { for (let i = 0; i < T.fishPerAcre; i++) { const kind = r.pick(kinds); const spot = r.pick(water[kind]); const list = fishNow(w, kind); if (!list.length) continue; const it = r.weighted(list, (f) => (f.rare ? 0.12 * (1 + (w.p.buffs.luckFish ?? 0)) : 1)); this.spawnFish(it, kind, spot[0], spot[1], r); } }
    }
    // bugs
    const spots = { flower: [], rock: [], trunk: [], lamp: LAMPS.map((l) => [l[0], l[1], 2.3]), water: [], grass: [], snow: [] };
    for (const e of Object.values(w.ents)) { if (e.t === 'flower') spots.flower.push([e.x, e.z, 0.5]); if (e.t === 'rock') spots.rock.push([e.x, e.z + 0.6, 0.15]); if (e.t === 'tree' && e.kind !== 'palm') spots.trunk.push([e.x + 0.28, e.z + 0.28, 0.9]); }
    for (let i = 0; i < 90; i++) { const x = r.int(3, 76) + 0.5, z = r.int(3, 49) + 0.5, c = P.chAt(x, z); if (c === '.' || c === 'u') { spots.grass.push([x, z, 0.2]); spots.snow.push([x, z, 0.1]); } if (P.isWater(x, z + 1) && !P.isWater(x, z)) spots.water.push([x, z + 1, 0.3]); }
    const acres = 20; const total = Math.round(T.bugsPerAcre * acres * 0.6 + r.next());
    for (let i = 0; i < total; i++) { const sp = r.pick(['flower', 'flower', 'grass', 'grass', 'trunk', 'water', 'lamp', 'rock', 'snow']); const cands = bugsNow(w, sp); if (!cands.length || !spots[sp].length) continue; const it = r.weighted(cands, (b) => (b.rare ? 0.12 : 1)); const at = r.pick(spots[sp]); this.spawnBug(it, at[0], at[1], at[2], sp); }
  },
  spawnFish(it, kind, x, z, r) { const s = SIZES[it.shadow] ?? 0.8; const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 4), matShadow()); mesh.scale.set(s * 0.6, 0.04, s * 1.15); mesh.position.set(x, -0.27, z); this.group.add(mesh); const f = { it: it.id, kind, x, z, mesh, s, vx: 0, vz: 0, t: r ? r.range(0, 3) : 0, state: 'drift', ang: 0, scared: 0 }; G.fish.push(f); return f; },
  spawnBug(it, x, z, y, spot) { const b = buildModel(itemDef(it), {}); const mesh = b.object; mesh.scale.setScalar(it.rare ? 1.1 : 0.85); setLookLayer(mesh, 'actors'); mesh.position.set(x, G.places.town.heightAt(x, z) + y - 0.4, z); this.group.add(mesh); const bug = { it: it.id, shape: it.shape, spot, ax: x, az: z, ay: y, x, z, y, mesh, t: Math.abs(x * z) % 6, fleeing: 0 }; G.bugs.push(bug); return bug; },
  hourCheck() { const w = G.world; const k = w.clock.day + ':' + hourOf(w.clock); if (k !== this.lastHourKey) { this.lastHourKey = k; this.respawn(); } },
  fixed(dt) {
    const w = G.world; if (w.p.place !== 'town') return; const P = G.places.town, r = this.rng, px = w.p.x, pz = w.p.z, spd = G.player.speed;
    for (const f of G.fish) { f.t -= dt; if (f.state === 'drift') { if (f.t <= 0) { f.t = r.range(1.5, 4); const a = r.range(0, 6.28), v = r.range(0.1, 0.5) * (f.t > 3 ? 0 : 1); f.vx = Math.sin(a) * v; f.vz = Math.cos(a) * v; if (v) f.ang = a; } const nx = f.x + f.vx * dt, nz = f.z + f.vz * dt; if (P.isWater(nx, nz) && P.isWater(nx + f.vx, nz + f.vz)) { f.x = nx; f.z = nz; } else { f.vx = -f.vx; f.vz = -f.vz; } if (spd > 5 && (f.x - px) ** 2 + (f.z - pz) ** 2 < 6) { f.scared = 1; f.vx = (f.x - px) * 0.6; f.vz = (f.z - pz) * 0.6; } } else if (f.state === 'flee') { const nx = f.x + f.vx * dt, nz = f.z + f.vz * dt; if (P.isWater(nx, nz)) { f.x = nx; f.z = nz; } if (f.t <= 0) f.gone = true; } }
    const killF = G.fish.filter((f) => f.gone); for (const f of killF) { this.group.remove(f.mesh); G.fish.splice(G.fish.indexOf(f), 1); }
    const spook = (s) => (s > 5 ? T.spook : s > 3.4 ? T.spook * 0.67 : s > 1.8 ? T.spook * 0.4 : s > 0 ? T.spook * 0.17 : 0);
    const rad = spook(spd);
    for (const b of G.bugs) { b.t += dt; const dd = Math.hypot(b.x - px, b.z - pz); if (rad > 0 && dd < rad && !b.fleeing) { b.fleeing = 2.2; b.fa = Math.atan2(b.x - px, b.z - pz) + r.range(-0.5, 0.5); }
      if (b.fleeing) { b.fleeing -= dt; b.x += Math.sin(b.fa) * dt * 4; b.z += Math.cos(b.fa) * dt * 4; b.y = Math.min(3.4, b.y + dt * 2); if (b.fleeing <= 0) { b.gone = true; } continue; }
      if (b.shape === 'fly' || b.spot === 'water' || b.spot === 'lamp') { b.x = b.ax + Math.sin(b.t * 0.7 + b.ax) * 0.8; b.z = b.az + Math.cos(b.t * 0.9) * 0.6; b.y = b.ay + Math.sin(b.t * 3) * 0.2 + 0.2; } else if (b.spot === 'grass' || b.spot === 'snow') { const hop = (b.t % 3) < 0.4; if (hop) { b.x += Math.sin(b.ax + Math.floor(b.t / 3)) * dt * 1.5; b.z += Math.cos(b.ax + Math.floor(b.t / 3)) * dt * 1.5; b.y = b.ay + Math.sin((b.t % 3) * 7.8) * 0.3; } } }
    for (const b of G.bugs.filter((x) => x.gone)) { this.group.remove(b.mesh); G.bugs.splice(G.bugs.indexOf(b), 1); }
    // balloons drift in on the wind, a few times a day
    if (w.balloonsLeft > 0 && w.clock.minute >= (w.balloonNext ?? 480)) { w.balloonsLeft--; w.balloonNext = w.clock.minute + 120 + r.int(0, 200); if (w.clock.minute < 21 * 60) this.spawnBalloon(r); }
    for (const b of G.balloons) { b.x += 0.9 * dt; b.y = 3 + Math.sin(G.time + b.ph) * 0.3; if (b.x > 85) b.gone = true; }
    for (const b of G.balloons.filter((x) => x.gone)) { this.group.remove(b.mesh); G.balloons.splice(G.balloons.indexOf(b), 1); }
    // sling pellets
    for (const s of this.sling) { s.t += dt; const k = Math.min(1, s.t / s.dur); s.mesh.position.lerpVectors(s.a, s.b, k); if (k >= 1) { this.group.remove(s.mesh); s.done = true; const b = s.target; if (b && !b.gone) { this.popBalloon(b); } } }
    this.sling = this.sling.filter((s) => !s.done);
    // wasps
    for (const wp of G.wasps) { const ang = Math.atan2(px - wp.x, pz - wp.z); const v = spd > 0 ? 4.6 : 3.4; wp.x += Math.sin(ang) * v * dt; wp.z += Math.cos(ang) * v * dt; wp.t -= dt; if (Math.hypot(px - wp.x, pz - wp.z) < 0.6) { wp.gone = true; if (!G.demo) { w.p.puffy = true; w.stats.stung = (w.stats.stung ?? 0) + 1; G.ctx.audio.play('sting'); G.player.actor.play('Sting', { then: 'Idle' }); G.player.busy = 0.8; remember(w, 'stung'); G.player.actor.puffy = true; G.rumble?.(0.6, 0.3); Toasts.add('Stung! Your face has made other plans.'); } } if (wp.t <= 0) wp.gone = true; }
    for (const wp of G.wasps.filter((x) => x.gone)) { this.group.remove(wp.mesh); G.wasps.splice(G.wasps.indexOf(wp), 1); }
  },
  spawnBalloon(r, x0 = -5, z0) { const z = z0 ?? r.range(10, 50); const b = buildModel('sf-balloon', { palette: { b: r.pick(['red', 'sky', 'lime', 'sand', 'plum']) } }); const mesh = b.object; this.group.add(mesh); const bal = { x: x0, y: 3, z, mesh, ph: r.range(0, 6) }; mesh.position.set(x0, 3, z); G.balloons.push(bal); return bal; },
  popBalloon(b) { const w = G.world, r = rngOf(`${w.seed}:bal:${w.stats.balloons ?? 0}`); w.stats.balloons = (w.stats.balloons ?? 0) + 1; b.gone = true; G.ctx.audio.play('pop'); G.ctx.particles.burst('confetti', [b.x, b.y + 2, b.z], { count: 12 }); const prize = r.pick(['c_chair', 'bear', 'pear', 'h_party', 's_sky', 'bag', 'books', 'seed_cosmos', 'plant1', 's_dot']); const tx = Math.floor(clamp(b.x, 3, 76)), tz = Math.floor(clamp(b.z, 3, 49)); for (let d = 0; d < 6; d++) { for (const [dx, dz] of [[0, 0], [d, 0], [-d, 0], [0, d], [0, -d]]) { if (isFree(w, tx + dx, tz + dz, 0)) { addEnt(w, { t: 'item', it: prize, value: prize === 'bag' ? 800 : undefined, x: tx + dx + 0.5, z: tz + dz + 0.5 }); Toasts.add('A present fell somewhere awkward.'); remember(w, 'balloon', { item: ITEMS[prize]?.name }); bus.emit('balloon'); return; } } } },
  shootBalloon(toX, toZ) { const w = G.world, p = G.player; let best = null, bd = 1e9; const f = w.p.facing; for (const b of G.balloons) { const dx = b.x - p.x, dz = b.z - p.z, d = Math.hypot(dx, dz); if (d > 14) continue; const off = Math.abs(angleDelta(f, Math.atan2(dx, dz))); if (toX == null && off > 1.1) continue; const score = toX != null ? Math.hypot(b.x - toX, b.z - toZ) : d + off * 3; if (score < bd) { bd = score; best = b; } } const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 5, 4), toonMaterial(PALETTE.ink)); this.group.add(mesh); const a = new THREE.Vector3(p.x, 1.4, p.z), bv = best ? new THREE.Vector3(best.x, best.y + 2.2, best.z) : new THREE.Vector3(p.x + Math.sin(f) * 8, 5, p.z + Math.cos(f) * 8); const hitIt = best != null && (toX == null ? true : bd < 2.2); this.sling.push({ mesh, a, b: bv, t: 0, dur: a.distanceTo(bv) / 22, target: hitIt ? best : null }); G.ctx.audio.play('slingFire'); },
  wasps(x, z, n = 3) { const r = this.rng; for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.18), toonMaterial(PALETTE.sand)); this.group.add(m); G.wasps.push({ x: x + r.range(-0.6, 0.6), z: z + r.range(-0.6, 0.6), t: 7, mesh: m }); } G.ctx.audio.play('wasp'); },
  update(dt) { const inTown = G.world.p.place === 'town'; this.group.visible = inTown; if (!inTown) return; const t = G.time, f = G.player; for (const fs of G.fish) { fs.mesh.position.x = fs.x; fs.mesh.position.z = fs.z; fs.mesh.rotation.y = fs.ang; } for (const b of G.bugs) { b.mesh.position.set(b.x, G.places.town.heightAt(b.ax, b.az) + b.y - 0.4, b.z); if (b.shape === 'fly') b.mesh.scale.x = 0.5 + Math.abs(Math.sin(t * 16)) * 0.5; } for (const b of G.balloons) b.mesh.position.set(b.x, b.y, b.z); for (const wp of G.wasps) wp.mesh.position.set(wp.x, 1 + Math.sin(t * 20 + wp.x) * 0.12, wp.z); const fg = f?.fishing; this.bobberMesh.visible = !!fg; if (fg) { const y = fg.dip ?? 0; this.bobberMesh.position.set(fg.x, -0.28 - y, fg.z); } },
};
/** Item caught or found: reveal the first time, quick thereafter. Returns true if it went in the pockets. */
export function collect(itemId, entry = null, o = {}) {
  const w = G.world, it = ITEMS[itemId]; if (!giveItem(w, entry ?? { id: itemId })) { Toasts.add(o.full ?? 'Your pockets are full. It looks relieved.'); return false; }
  if (w.guest && (it.cat === 'fish' || it.cat === 'bug')) G.visit?.session.claim(itemId);
  const first = !w.almanac.seen[itemId]; w.almanac.seen[itemId] = (w.almanac.seen[itemId] ?? 0) + 1;
  if (it.cat === 'fish' || it.cat === 'bug') { w.stats.caught[it.cat] = (w.stats.caught[it.cat] ?? 0) + 1; remember(w, 'caught', { item: it.name, id: itemId, cat: it.cat }); if (it.cat === 'fish' && (!w.stats.biggest || it.price > (ITEMS[w.stats.biggest]?.price ?? 0))) w.stats.biggest = itemId; bus.emit('caught', it); }
  if ((first && (it.cat === 'fish' || it.cat === 'bug' || it.cat === 'fossilunk')) || o.reveal) {
    const a = G.player.actor; G.ctx.audio.play('reveal'); a.drop(); const b = buildModel(itemDef(it), {}); const hold = b.object; hold.position.set(G.player.x, 2, G.player.z); G.nature.group.add(hold); G.player.state = 'locked'; a.play('HoldUp', { hold: true, restart: true });
    Script.run((function* () { const verb = it.cat === 'fish' ? 'caught' : it.cat === 'bug' ? 'caught' : 'found'; yield say('narrator', `You ${verb} ${/^[AEIOU]/.test(it.name) ? 'an' : 'a'} ${it.name.toLowerCase()}! ${it.line}`); G.nature.group.remove(hold); G.player.state = 'free'; G.player.refreshTool(); a.play('Idle'); o.then?.(); })());
  } else { G.ctx.audio.play('repeatCatch'); Toasts.add(`Got ${/^[AEIOU]/.test(it.name) ? 'an' : 'a'} ${it.name}.`); o.then?.(); }
  return true;
}
G.nature = Nature;
