// The sites as built things: props, buildings, what can be destroyed.
import { addModelColliders, buildModel, THREE, setLookLayer, mergeStaticMeshes } from '../../pixel-engine.js';
import { CATALOG } from '../art/models.js';
import { BRIDGES, HALTS, RIVER } from '../content/roads.js';
import { CASES, SITES, TRIGS } from '../content/sites.js';
import { FUEL, fireIndex } from './fire.js';
import { polyDist } from './geom.js';
const { BoxGeometry, InstancedMesh, Matrix4, Mesh, Quaternion, Vector3, Group, AnimationMixer } = THREE;
const DESTROY = { drum: { hp: 18, r: 5, d: 70, fire: 7 }, 'fuel-tank': { hp: 150, r: 14, d: 220, fire: 16, big: true }, pump: { hp: 110, r: 7, d: 120, fire: 6, big: true }, 'ammo-bunker': { hp: 140, r: 16, d: 240, fire: 18, big: true } };
export class SitesPart {
  // ----- Static world -----
  place(id, x, y, z, yawDeg = 0, opts = {}) {
    const b = buildModel(id, { catalog: CATALOG, palette: opts.palette, params: opts.params, seed: opts.seed });
    b.object.position.set(x, y, z); b.object.rotation.y = (yawDeg * Math.PI) / 180;
    if (opts.scale) b.object.scale.setScalar(opts.scale);
    b.object.updateMatrixWorld(true);
    return b;
  }
  buildSites(ctx) {
    const statics = [], land = this.land;
    for (const def of SITES) {
      const [sx, sz] = def.at;
      const rec = { def, id: def.id, live: false, cleared: false, clearedAt: -1e9, actors: [], vehicles: [], dormant: false, extras: [] };
      this.sites[def.id] = rec;
      for (const [id, dx, dz, yaw = 0, opts = {}] of def.props ?? []) {
        const x = sx + dx, z = sz + dz, y = land.heightAt(x, z) + (opts.lift ?? 0);
        const b = this.place(id, x, y, z, yaw, opts);
        const colliders = opts.scale ? [] : addModelColliders(ctx.physics, b, [x, y, z], (yaw * Math.PI) / 180);
        const spec = DESTROY[opts.tag];
        if (spec) {
          ctx.scene.add(b.object);
          const d = { tag: opts.tag, site: def.id, x, y, z, hp: spec.hp, maxHp: spec.hp, spec, object: b.object, colliders, build: b, yaw, destroyed: false, fuse: -1, cell: fireIndex(x, z) };
          for (const c of colliders) this.own(c, 'prop', d);
          this.destructibles.push(d);
          // Weeds round a tank: the grass can reach it.
          for (let ax = -8; ax <= 8; ax += 5) for (let az = -8; az <= 8; az += 5) { const i = fireIndex(x + ax, z + az); if (i >= 0 && !this.fire.baseFuel[i]) { this.fire.baseFuel[i] = FUEL.GRASS; this.fire.fuel[i] = FUEL.GRASS; } }
        } else if (opts.tag === 'hut' || opts.tag === 'cage') {
          ctx.scene.add(b.object);
          rec.extras.push({ tag: opts.tag, object: b.object, build: b });
          if (opts.tag === 'cage') rec.cage = b;
        } else if (id === 'cloth-post') {
          statics.push(b.object);
          this.cloths.push({ x, y, z, site: def.id });
        } else statics.push(b.object);
        // Buildings are fuel (sheds burn; concrete and steel only char).
        if (['hut', 'shack', 'market-stall', 'clinic-tent', 'gun-rack', 'schoolroom'].includes(id)) for (let ax = -4; ax <= 4; ax += 4) for (let az = -4; az <= 4; az += 4) { const i = fireIndex(x + ax, z + az); if (i >= 0) { this.fire.baseFuel[i] = FUEL.BUILDING; this.fire.fuel[i] = FUEL.BUILDING; } }
        if (b.light) ctx.lights.request({ ...b.light, position: b.object.localToWorld(new Vector3(...b.light.at)), priority: 0.5 });
      }
    }
    for (const b of BRIDGES) {
      const [x, z] = b.at;
      let best = 0, bd = 1e9;
      for (let i = 0; i + 1 < RIVER.length; i++) { const d = polyDist(x, z, [RIVER[i], RIVER[i + 1]]); if (d < bd) { bd = d; best = i; } }
      const dx = RIVER[best + 1][0] - RIVER[best][0], dz = RIVER[best + 1][1] - RIVER[best][1], l = Math.hypot(dx, dz);
      const px = -dz / l, pz = dx / l; // across the river
      const y = (land.heightAt(x + px * 17, z + pz * 17) + land.heightAt(x - px * 17, z - pz * 17)) / 2 - 0.2;
      const yaw = (Math.atan2(px, pz) * 180) / Math.PI;
      const m = this.place(b.rail ? 'bridge-rail' : 'bridge-road', x, y, z, yaw);
      addModelColliders(ctx.physics, m, [x, y, z], (yaw * Math.PI) / 180);
      b.y = y;
      statics.push(m.object);
    }
    // Rail halts, signposts.
    for (const h of HALTS) { const y = land.heightAt(h.at[0], h.at[1] + 5); const s = this.place('signpost', h.at[0], y, h.at[1] + 5, 0); statics.push(s.object); }
    for (const t of TRIGS) { const y = land.heightAt(t.at[0], t.at[1]); const p = this.place('trig-pillar', t.at[0], y, t.at[1], 0); addModelColliders(ctx.physics, p, [t.at[0], y, t.at[1]], 0); statics.push(p.object); t.y = y; }
    // Dressing near the cases.
    this.cases = CASES.map((c) => ({ ...c, taken: false }));
    for (const c of this.cases) {
      const y = land.heightAt(c.at[0], c.at[1]);
      if (c.in === 'wreck') { const w = this.place('wreck', c.at[0] + 2, y, c.at[1], this.rng.range(0, 360)); statics.push(w.object); addModelColliders(ctx.physics, w, [c.at[0] + 2, y, c.at[1]], w.object.rotation.y); }
      if (c.in === 'hollow') { const w = this.place('hollow-tree', c.at[0], y, c.at[1] - 1.2, 0); statics.push(w.object); addModelColliders(ctx.physics, w, [c.at[0], y, c.at[1] - 1.2], 0); }
      if (c.in === 'shed') { const w = this.place('shack', c.at[0], y, c.at[1], 20, { palette: { wall: 'night' } }); statics.push(w.object); addModelColliders(ctx.physics, w, [c.at[0], y, c.at[1]], w.object.rotation.y); }
      const m = this.place('stone-case', c.at[0], y + 0.02, c.at[1], 30); setLookLayer(m.object, 'actors'); c.object = m.object; ctx.scene.add(m.object);
    }
    const handcar = this.place('handcar', -395, land.heightAt(-395, 100), 100, 90); statics.push(handcar.object);
    ctx.scene.add(...mergeStaticMeshes(statics));
    for (const s of Object.values(this.sites)) s.y = land.heightAt(s.def.at[0], s.def.at[1]);
  }
  /** Blow up a destructible. */
  destroy(d, by) {
    if (d.destroyed) return; d.destroyed = true;
    d.object.visible = false;
    for (const c of d.colliders) { this.owners.delete(c.handle); if (this.ctx.physics.isAlive(c)) this.ctx.physics.remove(c); }
    d.colliders = [];
    this.game.events.emit('destroyed', d, by);
    this.game.combat.explode(d.x, d.y + 1, d.z, d.spec.r, d.spec.d, by, { fire: d.spec.fire, big: d.spec.big, tag: d.tag });
  }
  hitProp(d, dmg, by) { if (d.destroyed) return; d.hp -= dmg; if (d.hp <= 0) this.destroy(d, by); }
}
