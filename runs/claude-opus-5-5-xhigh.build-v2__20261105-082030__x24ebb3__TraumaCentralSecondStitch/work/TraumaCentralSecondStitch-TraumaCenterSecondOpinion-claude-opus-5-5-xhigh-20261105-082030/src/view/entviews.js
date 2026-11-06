// 3D objects for what's on the field, synced from state by id. Tissue is painted; these stand on it.
import { buildModel, glowMaterial, LegStepper, PALETTE, setLookLayer, Squash, SpringChain, THREE, toonMaterial, twoBoneIK } from '../../pixel-engine.js';
import { boltDef, cardDef, clampDef, clotDef, coinDef, cystDef, eggDef, fragmentDefs, haloDef, hookDef, introitCoreDef, keyDef, kidneyDef, magnetDef, miserereDef, paleCoreDef, polypDef, shardDef, strandDef, tumorDef, weeperEyeDef, wrathEyeDef, wrathPlateDef } from '../content/models/index.js';

const { BoxGeometry, Color, Group, Mesh, SphereGeometry, Vector3 } = THREE;

const PROP_DEFS = { key: keyDef, coin: coinDef, card: cardDef, magnet: magnetDef, shard: shardDef, bolt: boltDef, strand: strandDef };

function ownMaterials(obj) {
  obj.traverse((m) => {
    if (m.isMesh) {
      m.material = m.material.clone();
      m.userData.base = m.material.color.clone();
      m.material.userData = { ...m.material.userData, shared: false };
    }
  });
}
const tmpC = new Color();
const STRAIN_RIM = { eye: 0x73eff7, plate: 0xef7d57, core: 0xa7f070, stalk: 0x73eff7, halo: 0xffcd75, 'strain:miserere': 0xffcd75 };
const DISSOLVERS = new Set(['eye', 'halo', 'egg', 'polyp', 'cyst', 'clot', 'strain:miserere', 'tumor']);
/** Strains get a hard rim so they read against tissue, on materials of their own so a hit can flash them. */
function strainMaterials(obj, rim) {
  const meshes = [];
  obj.traverse((m) => {
    if (m.isMesh && m.material?.type?.includes('Toon')) {
      m.material = toonMaterial(m.material.color.getHex(), { rim }).clone();
      meshes.push(m);
    }
  });
  return meshes;
}

export class EntViews {
  constructor(ctx, tableViews, fx) {
    this.ctx = ctx;
    this.tables = tableViews;
    this.fx = fx;
    this.map = new Map();
    this.group = new Group();
    ctx.scene.add(this.group);
    this.dropMeshes = [];
    this.dropGeo = new SphereGeometry(0.12, 6, 5);
    this.dropMat = glowMaterial(PALETTE.cyan);
    this.barGeo = new BoxGeometry(1, 1, 1);
    this.tendrilMat = toonMaterial(PALETTE.plum);
    this.tetherMat = toonMaterial(PALETTE.lime);
    this.flying = [];
    this.dissolving = [];
    this.crown = null;
  }
  /** A hit flash on whatever strain parts stand near (x, z). */
  flash(x, z) {
    for (const v of this.map.values()) {
      if (!v.flashable) continue;
      if (x == null || Math.hypot(v.e.x - x, v.e.z - z) < 1.6) v.hit = 1;
    }
  }

  makeBar(mat, thick = 0.09) {
    const m = new Mesh(this.barGeo, mat);
    m.scale.set(thick, thick, 1);
    m.castShadow = true;
    setLookLayer(m, 'actors');
    this.group.add(m);
    return m;
  }

  build(e) {
    let def = null, scale = 1, y = 0;
    switch (e.k) {
      case 'hook': def = hookDef; scale = 1.15; break;
      case 'prop': def = PROP_DEFS[e.prop] ?? keyDef; scale = e.prop === 'strand' ? 1.5 : 1.2; break;
      case 'magnet': def = magnetDef; scale = 1.3; break;
      case 'debris': def = PROP_DEFS[e.prop] ?? shardDef; scale = 1.25; break;
      case 'tumor': def = tumorDef; scale = (e.r ?? 1.1) * 1.3; break;
      case 'polyp': def = polypDef; scale = (e.r ?? 0.34) * 2.6; break;
      case 'egg': def = eggDef; scale = (e.r ?? 0.34) * 2.4; break;
      case 'cyst': def = cystDef; scale = (e.r ?? 0.42) * 2.2; break;
      case 'clot': def = clotDef; scale = 1.3; break;
      case 'eye': def = e.heartEye ? wrathEyeDef : weeperEyeDef; scale = e.heartEye ? 1.1 : (e.r ?? 0.55) * 2.1; break;
      case 'halo': def = haloDef; scale = 1; break;
      case 'plate': def = wrathPlateDef; scale = 1.2; break;
      case 'clamp': case 'unclamp': def = clampDef; scale = 1.3; break;
      case 'fragment': def = fragmentDefs[(Number(String(e.shape ?? e.id).replace(/\D/g, '')) || 1) - 1] ?? fragmentDefs[0]; scale = 1.05; break;
      case 'organ': case 'donor': def = kidneyDef; scale = 1.25; break;
      case 'core': def = e.id === 'palecore' ? paleCoreDef : e.twoHanded ? miserereDef : introitCoreDef; scale = e.twoHanded ? 0.55 : 0.9; break;
      case 'stalk': def = weeperEyeDef; scale = 1.1; break;
      case 'strain:miserere': def = miserereDef; scale = 1.1; break;
      default: return null;
    }
    const b = buildModel(def);
    const obj = b.object;
    obj.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    const holder = new Group();
    holder.add(obj);
    obj.scale.setScalar(scale);
    setLookLayer(holder, 'actors');
    this.group.add(holder);
    const v = { e, holder, obj, base: scale, squash: new Squash(), y, born: 0, seed: Math.random() };
    v.squash.amount = 1.5;
    if (STRAIN_RIM[e.k] && !(e.k === 'core' && e.id === 'palecore')) { v.flashMeshes = strainMaterials(obj, STRAIN_RIM[e.k]); v.flashable = true; v.hit = 0; }
    if (e.k === 'organ' || e.k === 'donor') {
      ownMaterials(obj);
      v.tint = true;
      const col = e.k === 'organ' ? new Color(0x5d3f58) : new Color(0x6a5572);
      obj.traverse((m) => { if (m.isMesh) m.material.color.copy(col); });
    }
    if (e.heartEye || e.k === 'eye') {
      v.lidA = obj.getObjectByName('lidA');
      v.lidB = obj.getObjectByName('lidB');
      v.iris = obj.getObjectByName('iris');
      v.shut = obj.getObjectByName('shut');
    }
    if (e.k === 'core' && !e.twoHanded) {
      v.tether = this.makeBar(this.tetherMat, 0.11);
      v.tendrils = [0, 1, 2].map((i) => ({ chain: new SpringChain({ segments: 4, length: 0.16, stiffness: 7, gravity: 3 }), bars: Array.from({ length: 4 }, () => this.makeBar(this.tendrilMat, 0.07)), a: (i / 3) * 6.28 }));
    }
    if (e.k === 'stalk') v.tether = this.makeBar(this.tetherMat, 0.13);
    if (e.k === 'eye' && !e.heartEye) {
      v.legs = new LegStepper({ legs: [{ rest: [-0.6, 0.3], partners: [1] }, { rest: [0.6, 0.3], partners: [0] }, { rest: [-0.5, -0.4], partners: [3] }, { rest: [0.5, -0.4], partners: [2] }], threshold: 0.28, stepTime: 0.16, lift: 0.14 });
      v.legBars = Array.from({ length: 8 }, () => this.makeBar(this.tendrilMat, 0.07));
      for (const b2 of v.legBars) b2.visible = false;
    }
    return v;
  }

  sync(state, s, dt) {
    const seen = new Set();
    for (const e of state.ents) {
      if (e.dead) continue;
      seen.add(e.id);
      let v = this.map.get(e.id);
      if (!v) {
        v = this.build(e);
        if (!v) { this.map.set(e.id, { e, none: true }); continue; }
        this.map.set(e.id, v);
      }
      if (v.none) continue;
      v.e = e;
      this.place(v, e, state, s, dt);
    }
    for (const [id, v] of this.map) {
      if (seen.has(id)) continue;
      this.map.delete(id);
      if (v.none) continue;
      this.retire(v);
    }
    // Things flying to the dish.
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i];
      f.t += dt / f.dur;
      const k = Math.min(1, f.t);
      f.holder.position.set(f.from.x + (f.to.x - f.from.x) * k, f.from.y + (f.to.y - f.from.y) * k + Math.sin(k * Math.PI) * 1.4, f.from.z + (f.to.z - f.from.z) * k);
      f.holder.rotation.y += dt * 11;
      if (k >= 1) {
        this.flying.splice(i, 1);
        if (f.keep) { f.holder.rotation.y = f.seed * 6; f.holder.position.x += (f.seed - 0.5) * 0.6; f.holder.position.z += (f.seed - 0.5) * 0.3; f.holder.scale.setScalar(0.7); }
        else this.group.remove(f.holder);
        f.done?.();
      }
    }
    // Pixel dissolves.
    for (let i = this.dissolving.length - 1; i >= 0; i--) {
      const d = this.dissolving[i];
      d.t += dt / d.dur;
      for (const m of d.mats) m.dissolve = Math.min(1, d.t);
      if (d.t >= 1) { this.group.remove(d.holder); this.dissolving.splice(i, 1); }
    }
    this.syncCrown(state, s, dt);
    // Droplets.
    const drops = state.drops ?? [];
    let n = 0;
    for (const d of drops) {
      if (d.dead) continue;
      const tv = this.tables[d.table] ?? this.tables[0];
      let m = this.dropMeshes[n];
      if (!m) {
        m = new Mesh(this.dropGeo, this.dropMat);
        setLookLayer(m, 'actors');
        this.group.add(m);
        this.dropMeshes[n] = m;
      }
      m.visible = true;
      m.position.set(tv.offsetX + d.x, tv.heightAt(d.x, d.z, s) + 0.14, d.z);
      n++;
    }
    for (let i = n; i < this.dropMeshes.length; i++) this.dropMeshes[i].visible = false;
  }

  place(v, e, state, s, dt) {
    const tv = this.tables[e.table] ?? this.tables[0];
    const hidden = e.hidden || (e.k === 'plate' && false);
    v.holder.visible = !hidden;
    const surf = tv.heightAt(e.x, e.z, s);
    v.born = Math.min(1, v.born + dt * 6);
    let lift = 0;
    const held = (e.holders ?? 0) > 0;
    if (held) lift = 0.2;
    if (e.free) lift = 0.55;
    if (e.placed) lift = 0;
    v.holder.position.set(tv.offsetX + e.x, surf + lift, e.z);
    v.squash.update(dt);
    if (v.hit > 0) {
      v.hit = Math.max(0, v.hit - dt * 5);
      for (const m of v.flashMeshes) m.material.emissive?.setScalar(v.hit * 0.9);
    }
    if (held && !v.wasHeld) v.squash.kick(-3);
    v.wasHeld = held;
    const [h, vs] = v.squash.scale();
    v.obj.scale.set(v.base * h * v.born, v.base * vs * v.born, v.base * h * v.born);
    // Per-kind life.
    if (e.k === 'hook') {
      const h0 = e.path && e.len > 0 ? e.path : null;
      if (h0) { const end = h0[h0.length - 1], st = h0[0]; v.obj.rotation.y = -Math.atan2(end[1] - st[1], end[0] - st[0]) + Math.PI / 2; }
    }
    if (e.k === 'fragment') v.obj.rotation.y = -((e.rot ?? 0) * Math.PI) / 180;
    if (e.k === 'plate') {
      v.obj.rotation.y = -(e.ang ?? 0) - Math.PI / 2;
      v.obj.rotation.x = -0.25;
      v.obj.position.y = e.locked ? 0 : 0.12;
    }
    if (e.k === 'polyp' || e.k === 'egg') v.obj.position.y = Math.sin(s.t * 3 + v.seed * 6) * 0.03;
    if (e.k === 'egg' || e.k === 'polyp') {
      if (e.heat > 0) v.holder.scale.setScalar(1 + Math.sin(s.t * 40) * 0.05 * e.heat);
    }
    if (e.k === 'cyst') {
      // Scanned: real ones show their angry core; false ones go pale and quiet.
      if (e.scanned && !v.marked) {
        v.marked = true;
        const bad = new Mesh(new SphereGeometry(0.2, 8, 6), glowMaterial(e.real ? PALETTE.red : PALETTE.green));
        bad.position.y = 0.36;
        v.obj.add(bad);
      }
    }
    if (e.k === 'donor' && v.tint) {
      const p = e.perfuse ?? 0;
      tmpC.setHex(0x6a5572).lerp(new Color(0xd65c4f), p);
      v.obj.traverse((m) => { if (m.isMesh) m.material.color.copy(tmpC); });
      if (e.placed && p === 0) v.obj.rotation.y = 0;
    }
    if (e.k === 'eye') {
      const openT = e.heartEye ? (e.locked ? 0 : 1) : e.open ? 1 : 0;
      v.open = (v.open ?? 0) + (openT - (v.open ?? 0)) * Math.min(1, dt * (e.open ? 6 : 12));
      if (v.shut) v.shut.visible = v.open < 0.25;
      if (v.lidA) {
        v.lidA.visible = v.open >= 0.25;
        v.lidB.visible = v.open >= 0.25;
        v.lidA.rotation.x = -v.open * 1.35;
        v.lidB.rotation.x = v.open * 1.35;
        if (v.iris) { v.iris.position.x = Math.sin(s.t * 0.7 + v.seed * 9) * 0.1; v.iris.position.z = 0.04 + Math.cos(s.t * 0.9 + v.seed * 4) * 0.08; v.iris.visible = v.open > 0.15; }
      }
      if (e.heartEye) { v.obj.visible = !e.locked || (s.beat ?? 0) > 0.2; v.obj.scale.setScalar(v.base * (e.locked ? 0.7 : 1 + (s.beat ?? 0) * 0.08)); }
      if (v.legs) {
        const crawling = e.wx != null;
        for (const b of v.legBars) b.visible = crawling;
        if (crawling) this.updateLegs(v, tv, e, surf, s, dt);
      }
    }
    if (e.k === 'strain:miserere') {
      v.obj.position.y = 0.6 + Math.sin(s.t * 1.4) * 0.12;
      v.obj.rotation.y = Math.sin(s.t * 0.5) * 0.25;
    }
    if (e.k === 'core' && v.tether) {
      const hx = tv.offsetX + e.home[0], hz = e.home[1], hy = tv.heightAt(e.home[0], e.home[1], s) + 0.05;
      this.stretch(v.tether, hx, hy, hz, v.holder.position.x, v.holder.position.y + 0.36, v.holder.position.z);
      v.obj.rotation.y = s.t * (held ? 7 : 2);
      for (const t of v.tendrils) {
        const root = [v.holder.position.x + Math.cos(t.a + s.t) * 0.28, v.holder.position.y + 0.4, v.holder.position.z + Math.sin(t.a + s.t) * 0.28];
        t.chain.update(dt, root, [[1, 0, 0], [0, 1, 0], [Math.cos(t.a), 0.3, Math.sin(t.a)]]);
        for (let i = 0; i < t.bars.length; i++) {
          const a = t.chain.points[i], b = t.chain.points[i + 1];
          this.stretch(t.bars[i], a[0], a[1], a[2], b[0], b[1], b[2]);
        }
      }
    }
    if (e.k === 'stalk' && v.tether) {
      const hx = tv.offsetX + e.home[0], hz = e.home[1], hy = tv.heightAt(e.home[0], e.home[1], s) + 0.05;
      this.stretch(v.tether, hx, hy, hz, v.holder.position.x, v.holder.position.y + 0.3, v.holder.position.z);
    }
    if (s.hitboxes) this.fx?.hitbox?.(e, tv, surf);
  }

  /** Dies Irae's crown: red tendrils from under the eye, trailing out across the heart. */
  syncCrown(state, s, dt) {
    const strain = state.ents.find((e) => e.k === 'strain:diesirae' && !e.dead);
    if (!strain) {
      if (this.crown) for (const t of this.crown) for (const b of t.bars) b.visible = false;
      return;
    }
    const tv = this.tables[strain.table] ?? this.tables[0];
    if (!this.crown) {
      const mat = toonMaterial(PALETTE.red, { rim: 0xef7d57 });
      this.crown = Array.from({ length: 7 }, (_, i) => ({ a: (i / 7) * 6.283, chain: new SpringChain({ segments: 5, length: 0.34, stiffness: 5, gravity: 2, keep: 0.9 }), bars: Array.from({ length: 5 }, () => this.makeBar(mat, 0.11)) }));
    }
    for (const t of this.crown) {
      const cx = tv.offsetX + (strain.cx ?? 0), cz = strain.cz ?? -0.3;
      const y = tv.heightAt(strain.cx ?? 0, cz, s) + 0.2;
      const root = [cx + Math.cos(t.a) * 0.55, y, cz + Math.sin(t.a) * 0.45];
      const dir = [Math.cos(t.a), 0.15 + (s.beat ?? 0) * 0.5, Math.sin(t.a)];
      t.chain.update(dt, root, [[1, 0, 0], [0, 1, 0], [-dir[0], -dir[1], -dir[2]]]);
      for (let i = 0; i < t.bars.length; i++) {
        const a = t.chain.points[i], b = t.chain.points[i + 1];
        t.bars[i].visible = true;
        // Tendrils lie on the surface, whatever the chain thinks.
        const ay = tv.heightAt(a[0] - tv.offsetX, a[2], s) + 0.14, by = tv.heightAt(b[0] - tv.offsetX, b[2], s) + 0.14;
        this.stretch(t.bars[i], a[0], ay, a[2], b[0], by, b[2]);
      }
    }
  }

  updateLegs(v, tv, e, surf, s, dt) {
    const body = [tv.offsetX + e.x, surf + 0.42, e.z];
    const vel = [(e.wx - e.x) * 0.6, 0, (e.wz - e.z) * 0.6];
    v.legs.update(dt, body, 0, vel, (x, z) => tv.heightAt(x - tv.offsetX, z, s));
    const knee = [0, 0, 0];
    v.legs.feet.forEach((f, i) => {
      const hip = [body[0] + (i % 2 ? 0.3 : -0.3), body[1], body[2] + (i < 2 ? 0.14 : -0.14)];
      twoBoneIK(hip, f.at, 0.42, 0.46, [hip[0] * 1 + (i % 2 ? 0.8 : -0.8), body[1] + 1.2, hip[2]], knee);
      this.stretch(v.legBars[i * 2], hip[0], hip[1], hip[2], knee[0], knee[1], knee[2]);
      this.stretch(v.legBars[i * 2 + 1], knee[0], knee[1], knee[2], f.at[0], f.at[1], f.at[2]);
    });
  }

  stretch(mesh, ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const l = Math.hypot(dx, dy, dz) || 0.001;
    mesh.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    mesh.scale.z = l;
    mesh.lookAt(bx, by, bz);
  }

  retire(v) {
    const e = v.e;
    if (v.tether) this.group.remove(v.tether);
    if (v.tendrils) for (const t of v.tendrils) for (const b of t.bars) this.group.remove(b);
    if (v.legBars) for (const b of v.legBars) this.group.remove(b);
    const kinds = new Set(['hook', 'prop', 'magnet', 'debris', 'tumor', 'organ', 'plate', 'core', 'unclamp', 'stalk']);
    if (kinds.has(e.k) && this.fx?.dishAt) {
      const from = v.holder.position.clone();
      const to = this.fx.dishAt(e.table);
      this.flying.push({ holder: v.holder, from, to, t: 0, dur: 0.32, seed: v.seed, keep: e.k === 'hook' || e.k === 'prop' || e.k === 'debris', done: () => this.fx.tink?.(e) });
      return;
    }
    if (DISSOLVERS.has(e.k)) {
      const mats = [];
      v.holder.traverse((m) => {
        if (m.isMesh && m.material?.type?.includes('Toon')) {
          const mat = toonMaterial(m.material.color.getHex(), { dissolve: true, rim: 0xffcd75 }).clone();
          mat.dissolve = 0;
          m.material = mat;
          mats.push(mat);
        } else if (m.isMesh) m.visible = false;
      });
      this.dissolving.push({ holder: v.holder, mats, t: 0, dur: e.k === 'strain:miserere' ? 1.4 : 0.55 });
      return;
    }
    this.group.remove(v.holder);
  }
}
