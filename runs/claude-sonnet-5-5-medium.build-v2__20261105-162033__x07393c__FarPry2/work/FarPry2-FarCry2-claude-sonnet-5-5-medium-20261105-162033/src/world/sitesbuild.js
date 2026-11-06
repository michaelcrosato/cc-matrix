// SitesSystem: places every site from data, scatters plants, lays river and rail, and keeps garrisons (260 m bubble).
import { THREE, buildModel, addModelColliders, WaterSurface, WAVES_CALM, toonMaterial, PALETTE } from '../../pixel-engine.js';
import { CATALOG } from '../art/catalog.js';
import { SITES, POSTS, TRIGS, CASES, RAIL_HALTS } from '../content/sites.js';
import { LAYOUTS, POST_LAYOUT, GARRISON } from '../content/layouts.js';
import { RIVER, RAIL, RAIL_SPUR, ROADS, BRIDGES } from '../content/roads.js';
import { distPoly, HALF, K } from './terrain.js';
import { FUEL } from './fire.js';
import { TUNING } from '../core/tuning.js';

const V3 = THREE.Vector3;
const D2R = Math.PI / 180;
export class SitesSystem {
  name = 'sites';
  trees = []; sites = []; interactables = []; things = []; waters = []; placed = [];
  setup(g) {
    this.g = g; g.sitesSys = this; g.interactables = this.interactables;
    const ctx = g.ctx;
    this.rng = ctx.random.fork('sites');
    // a Cash Run round only needs the valley around the Cut: build less so every copy is ready quickly
    this.lite = !!g.session; this.cases = [];
    for (const def of SITES) if (!this.lite || ['the-cut', 'ranger-post'].includes(def.id)) this.buildSite(def);
    for (const p of POSTS) if (!this.lite || p.id === 'p5') this.buildPost(p);
    this.scatter();
    if (!this.lite) { this.river(); this.rails(); this.trigsAndCases(); }
    g.world.burnTrees = (x, z) => this.burnTreesAt(x, z);
  }
  find(id) { return this.sites.find((s) => s.id === id); }
  place(id, x, z, yawDeg = 0, o = {}) {
    const g = this.g;
    let b; try { b = buildModel(id, { catalog: CATALOG, params: o.params, palette: o.palette }); } catch (e) { return null; }
    const y = g.world.heightAt(x, z) + (o.dy || 0);
    b.object.position.set(x, y, z); b.object.rotation.y = yawDeg * D2R; b.object.updateMatrixWorld(true);
    b.object.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    g.ctx.scene.add(b.object);
    let cols = [];
    if (o.collide !== false) try { cols = addModelColliders(g.ctx.physics, b, [x, y, z], yawDeg * D2R); } catch { cols = []; }
    if (b.light && o.light !== false) { const w = b.object.localToWorld(new V3(...b.light.at)); g.ctx.lights.request({ ...b.light, position: [w.x, w.y, w.z] }); }
    const rec = { id, x, z, y, object: b.object, cols, build: b };
    this.placed.push(rec);
    return rec;
  }
  buildSite(def) {
    const [sx, sz] = def.at; const site = { ...def, x: sx, z: sz, slots: [], cover: [], spawned: false, soldiers: [], safe: def.kind === 'safehouse' && !def.guards, cleared: false, lastDeath: -999, fireCells: [] };
    this.sites.push(site);
    const L = LAYOUTS[def.id] || [];
    for (const row of L) {
      const x = sx + row.at[0], z = sz + row.at[1];
      const r = this.place(row.m, x, z, row.yaw || 0, { params: row.params, collide: !row.tag });
      if (!r) continue;
      // fuel under buildings so fire respects them
      if (['tin-shack', 'barracks', 'schoolroom', 'harvest-hut', 'concrete-bunker'].includes(row.m)) this.g.fire?.grid && this.g.fire.grid.setFuel(x, z, FUEL.BUILDING);
      if (row.cover) site.cover.push({ x: x - Math.sign(row.at[0]) * 1.2, z: z - Math.sign(row.at[1]) * 1.2 });
      if (row.use) this.interactables.push({ kind: row.use, x, z, site, r: row.use === 'train' ? 14 : 4, obj: r });
      if (row.tag) this.makeThing(row, r, x, z);
    }
    // soldiers
    const n = def.guards || 0;
    for (let i = 0; i < n; i++) {
      const rr = this.rng.fork(def.id + i), ang = rr.range(0, 6.283), rad = rr.range(4, Math.min(16, def.r * 0.4));
      const role = i === 5 ? 'sniper' : i === 3 ? 'mg' : i === 8 ? 'rocket' : 'rifle';
      const duty = i % 5 === 4 ? 'sit' : i % 4 === 3 ? 'patrol' : i % 7 === 6 ? 'sleep' : 'guard';
      const at = [sx + Math.cos(ang) * rad, sz + Math.sin(ang) * rad];
      site.slots.push({ role, duty, at, yaw: ang + Math.PI, alive: true, soldier: null, patrol: duty === 'patrol' ? [at, [at[0] + rr.range(-14, 14), at[1] + rr.range(-14, 14)]] : null });
    }
    if (def.kind === 'village') this.civilians(site, def);
    site.onSoldierDeath = (s) => { const sl = site.slots[s.slot]; if (sl) { sl.alive = false; sl.soldier = null; } site.lastDeath = this.g.gameHours(); if (!site.slots.some((q) => q.alive)) { site.cleared = true; this.g.events.emit('cleared', site.id); } };
  }
  buildPost(p) {
    const site = { id: p.id, name: 'Checkpoint ' + p.id.toUpperCase(), x: p.at[0], z: p.at[1], r: 14, kind: 'post-check', faction: p.faction, slots: [], cover: [], soldiers: [], spawned: false, cleared: false, lastDeath: -999 };
    this.sites.push(site);
    // yaw the post along the nearest road
    let best = 1e9, yaw = 0;
    for (const R of ROADS) { const r = distPoly(R.pts, p.at[0], p.at[1]); if (r.d < best) { best = r.d; yaw = Math.atan2(r.x - p.at[0], r.z - p.at[1]); } }
    for (const row of POST_LAYOUT) {
      const x = p.at[0] + row.at[0], z = p.at[1] + row.at[1];
      this.place(row.m, x, z, (row.yaw || 0), {});
      if (row.cover) site.cover.push({ x: x + 1, z: z + 1 });
    }
    for (let i = 0; i < p.n; i++) {
      const rr = this.rng.fork(p.id + i), ang = rr.range(0, 6.283), rad = rr.range(3, 11);
      site.slots.push({ role: i === 0 && p.technical ? 'driver' : i === 2 ? 'mg' : 'rifle', duty: i % 3 === 2 ? 'sit' : 'guard', at: [p.at[0] + Math.cos(ang) * rad, p.at[1] + Math.sin(ang) * rad], yaw: ang + Math.PI, alive: true, soldier: null });
    }
    site.onSoldierDeath = (s) => { const sl = site.slots[s.slot]; if (sl) { sl.alive = false; sl.soldier = null; } site.lastDeath = this.g.gameHours(); if (!site.slots.some((q) => q.alive)) { site.cleared = true; this.g.events.emit('cleared', site.id); } };
  }
  civilians(site, def) {
    this.g.civilianSlots = this.g.civilianSlots || [];
    for (let i = 0; i < (def.civilians || 0); i++) { const rr = this.rng.fork('civ' + i); this.g.civilianSlots.push({ site, at: [site.x + rr.range(-22, 22), site.z + rr.range(-22, 22)], model: 'civ' + (i % 4), i }); }
  }
  makeThing(row, r, x, z) {
    const g = this.g; const tank = row.tag === 'fuel-tank';
    const bunker = row.tag === 'ammo' || row.tag === 'pump';
    const col = g.ctx.physics.addStaticCylinder([x, r.y + 1.5, z], tank || bunker ? 1.8 : 0.45, bunker ? 3.4 : tank ? 1.6 : 0.3);
    const thing = { tag: row.tag, x, z, y: r.y, hp: bunker ? 160 : row.tag === 'pump' ? 90 : tank ? 120 : 30, dead: false, obj: r, onDestroy: (pt) => {
      thing.dead = true; if (!bunker) r.object.visible = false; g.ctx.physics.remove(col); g.combat.things.delete(col.handle);
      g.explode(new V3(x, r.y + 1, z), bunker ? (row.tag === 'pump' ? 8 : 14) : tank ? 10 : 5, bunker ? 200 : tank ? 160 : 90, { by: 'blast', ignite: true });
      g.fire?.ignite(x, z, tank ? 8 : 4);
      g.events.emit('destroyed', row.tag, thing);
    } };
    g.combat.addThing(col, thing); this.things.push(thing);
    g.events.on('cellburn', (i) => { if (thing.dead) return; const [cx, cz] = g.fire.grid.cellCenter(i); if (Math.abs(cx - x) < 6 && Math.abs(cz - z) < 6) { thing.hp -= 70; if (thing.hp <= 0) { thing.dead = true; thing.onDestroy(); } } });
  }
  // ---------------- plants ----------------
  scatter() {
    const g = this.g, rng = this.rng.fork('trees'); const land = g.world.land;
    const ok = (x, z) => {
      if (Math.abs(x) > HALF - 10 || Math.abs(z) > HALF - 10) return false;
      const k = g.world.kindAt(x, z); if (k !== K.GRASS && k !== K.WOOD) return false;
      for (const s of SITES) if (Math.hypot(x - s.at[0], z - s.at[1]) < s.r * 0.9 + 4) return false;
      for (const p of POSTS) if (Math.hypot(x - p.at[0], z - p.at[1]) < 18) return false;
      return true;
    };
    const kinds = ['acacia-a', 'acacia-b', 'acacia-c', 'bottle-tree'];
    let n = 0, tries = 0;
    const want = this.lite ? 90 : 420;
    while (n < want && tries < 6000) {
      tries++;
      const east = rng.chance(0.5);
      let x = east ? rng.range(80, 600) : rng.range(-600, 600), z = rng.range(-600, 600);
      if (this.lite) { x = rng.range(-50, 350); z = rng.range(-450, -100); }
      if (!ok(x, z) || (!east && rng.chance(0.4))) continue;
      const m = rng.chance(0.15) ? 'bottle-tree' : kinds[rng.int(0, 2)];
      const r = this.place(m, x, z, rng.range(0, 360), { collide: false, light: false });
      if (!r) continue;
      const trunk = g.ctx.physics.addStaticCylinder([x, r.y + 1.4, z], 1.4, 0.35);
      r.trunk = trunk; r.object.scale.setScalar(rng.range(0.85, 1.25));
      this.trees.push(r); g.fire?.grid?.setFuel(x, z, FUEL.TREE); n++;
    }
    // thorn bushes, termite mounds, boulders, reeds
    for (let i = 0; i < (this.lite ? 20 : 120); i++) { const x = rng.range(-620, 620), z = rng.range(-620, 620); if (!ok(x, z)) continue; this.place(i % 5 === 0 ? 'termite-mound' : i % 3 === 0 ? 'boulders' : 'bush', x, z, rng.range(0, 360), { palette: i % 3 === 1 ? { leaf: 'olive' } : undefined, collide: i % 5 === 0 }); }
    for (let i = 0; i < (this.lite ? 0 : 70); i++) { const t = rng.range(0, RIVER.length - 1.01), a = RIVER[Math.floor(t)], b = RIVER[Math.floor(t) + 1], f = t % 1; const x = a[0] + (b[0] - a[0]) * f + rng.range(-8, 8), z = a[1] + (b[1] - a[1]) * f + rng.range(-8, 8); this.place('reeds', x, z, rng.range(0, 360), { collide: false }); }
    for (let i = 0; i < (this.lite ? 0 : 40); i++) { const x = rng.range(-300, 100) - 180, z = rng.range(-640, -400); if (g.world.kindAt(x, z) === K.ROCK || rng.chance(0.4)) this.place('rock', x, z, rng.range(0, 360), {}); }
    for (let i = 0; i < (this.lite ? 0 : 12); i++) { const x = rng.range(-640, 640), z = rng.range(-640, 640); if (ok(x, z)) this.place('dead-tree', x, z, rng.range(0, 360), { collide: false }); }
  }
  burnTreesAt(x, z) {
    const g = this.g; for (const t of this.trees) {
      if (t.burnt || Math.abs(t.x - x) > 3.5 || Math.abs(t.z - z) > 3.5) continue;
      t.burnt = true; t.object.visible = false;
      t.scorch = this.place('scorched-tree', t.x, t.z, 0, { collide: false, light: false });
    }
  }
  // ---------------- river and rail ----------------
  river() {
    const g = this.g; const ctx = g.ctx;
    for (let i = 0; i < RIVER.length - 1; i++) {
      const [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1]; const len = Math.hypot(bx - ax, bz - az); const n = Math.ceil(len / 40);
      for (let k = 0; k < n; k++) {
        const x0 = ax + (bx - ax) * k / n, z0 = az + (bz - az) * k / n, x1 = ax + (bx - ax) * (k + 1) / n, z1 = az + (bz - az) * (k + 1) / n;
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, l = Math.hypot(x1 - x0, z1 - z0);
        const y = g.world.heightAt(mx, mz) + 1.0;
        try {
          const w = new WaterSurface({ size: [l + 2, 15], at: [0, 0, 0], waves: WAVES_CALM });
          w.position.set(mx, y, mz); w.rotation.y = Math.atan2(-(z1 - z0), x1 - x0);
          ctx.scene.add(w); this.waters.push(w);
        } catch { /* water unavailable in this context */ }
      }
    }
    // bridges: planks over the water at two crossings
    for (const [bx, bz] of BRIDGES) { const r = this.place('bridge', bx, bz, 0, {}); if (r) r.object.scale.set(1, 1, 1); }
  }
  rails() {
    const g = this.g; const parts = [];
    const lay = (pts) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; const len = Math.hypot(bx - ax, bz - az), n = Math.ceil(len / 10);
        for (let k = 0; k < n; k++) {
          const x0 = ax + (bx - ax) * k / n, z0 = az + (bz - az) * k / n, x1 = ax + (bx - ax) * (k + 1) / n, z1 = az + (bz - az) * (k + 1) / n;
          const y0 = g.world.heightAt(x0, z0) + 0.25, y1 = g.world.heightAt(x1, z1) + 0.25;
          const l = Math.hypot(x1 - x0, z1 - z0, y1 - y0); const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, mz = (z0 + z1) / 2;
          const yaw = Math.atan2(x1 - x0, z1 - z0), pitch = -Math.atan2(y1 - y0, Math.hypot(x1 - x0, z1 - z0));
          for (const off of [-0.7, 0.7]) {
            const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, l + 0.1), toonMaterial(PALETTE.slate));
            m.position.set(mx + Math.cos(yaw) * off, my + 0.1, mz - Math.sin(yaw) * off); m.rotation.set(pitch, yaw, 0, 'YXZ'); parts.push(m);
          }
          for (let s = 0; s < l; s += 2) {
            const f = (s + 1) / l; const sx = x0 + (x1 - x0) * f, sz = z0 + (z1 - z0) * f, sy = y0 + (y1 - y0) * f;
            const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.25), toonMaterial(PALETTE.plum));
            m.position.set(sx, sy + 0.02, sz); m.rotation.y = yaw; parts.push(m);
          }
        }
      }
    };
    lay(RAIL); lay(RAIL_SPUR);
    if (parts.length) { const merged = (this.mergeStatic ||= null); }
    const grp = new THREE.Group(); for (const p of parts) { p.castShadow = false; p.receiveShadow = true; grp.add(p); }
    g.ctx.scene.add(grp); this.railGroup = grp;
  }
  trigsAndCases() {
    const g = this.g;
    TRIGS.forEach(([x, z], i) => { const r = this.place('trig-pillar', x, z, 0, {}); this.interactables.push({ kind: 'trig', x, z, r: 3, index: i, obj: r }); });
    this.cases = CASES.map(([x, z], i) => { const r = this.place('stone-case', x, z, i * 40, { collide: false, light: false }); return { x, z, i, taken: false, obj: r, stones: 2 + (i % 5) }; });
    RAIL_HALTS.forEach((h) => { this.place('signpost', h.at[0], h.at[1] + 3, 0, { collide: false }); this.interactables.push({ kind: 'halt', x: h.at[0], z: h.at[1] + 3, r: 5, halt: h }); });
  }
  // ---------------- garrisons ----------------
  fixed(g, dt) {
    if (g.step % 30 !== 0 || !g.canMove() || g.mode === 'round') return;
    const f = g.player.feet;
    for (const s of this.sites) {
      if (!s.slots.length) continue;
      const d = Math.hypot(s.x - f.x, s.z - f.z);
      if (!s.spawned && d < 260) this.spawnSite(s);
      else if (s.spawned && d > 320) this.despawnSite(s);
      // checkpoints re-man after a while
      if (s.cleared && s.kind === 'post-check' && g.gameHours() - s.lastDeath >= TUNING.postRemanHours) { s.cleared = false; for (const sl of s.slots) { sl.alive = true; sl.soldier = null; } }
    }
  }
  spawnSite(s) {
    const g = this.g; s.spawned = true;
    s.slots.forEach((sl, i) => {
      if (!sl.alive || sl.soldier) return;
      const faction = s.faction === 'both' ? (i % 2 ? 'concord' : 'harvest') : s.faction || 'concord';
      sl.soldier = g.spawnSoldier({ faction, role: sl.role, at: sl.at, yaw: sl.yaw, duty: sl.duty, patrol: sl.patrol, site: s, slot: i });
      sl.soldier.faceYaw = sl.yaw;
    });
  }
  despawnSite(s) { s.spawned = false; for (const sl of s.slots) { if (sl.soldier && sl.soldier.alive) { this.g.soldierSys.remove(sl.soldier); } sl.soldier = null; } }
  despawnAll() { for (const s of this.sites) if (s.spawned) this.despawnSite(s); }
  resetGarrisons() { this.despawnAll(); for (const s of this.sites) { for (const sl of s.slots) { sl.alive = true; sl.soldier = null; } s.cleared = false; } }
  state() { return { sites: this.sites.filter((s) => s.spawned).map((s) => s.id) }; }
}
