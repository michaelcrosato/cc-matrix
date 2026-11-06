// Builds the look of a zone from its grid. Same seed, same dressing, on every client.
import { addModelColliders, buildModel, DEFAULT_TEXEL, disposeObject, glowMaterial, groundFog, mergeStaticMeshes, PALETTE, Precipitation, Rng, setLookLayer, TEXTURE_LIBRARY, textureMap, THREE, toonMaterial, WaterSurface, WAVES_CALM } from '../../pixel-engine.js';
import { BIOME_FLOORS, BIOMES } from '../data/zones.js';
import { MODELS } from './models/index.js';

const { BoxGeometry, Color, Group, Mesh, PlaneGeometry } = THREE;

const isFloor = (c) => c !== undefined && c !== '#' && c !== '~' && c !== ' ' && c !== 'P';
const tileOf = (id) => (TEXTURE_LIBRARY.get(id).size[0] ?? 16) / DEFAULT_TEXEL;

function worldUv(geo, ox, oy, oz, tile) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + ox, y = pos.getY(i) + oy, z = pos.getZ(i) + oz;
    const ny = Math.abs(nor.getY(i));
    if (ny > 0.5) uv.setXY(i, x / tile, z / tile);
    else uv.setXY(i, (x + z) / tile, y / tile);
  }
  uv.needsUpdate = true;
}

function texturedBox(w, h, d, x, y, z, material, tile, cast = false, receive = true) {
  const g = new BoxGeometry(w, h, d);
  worldUv(g, x, y, z, tile);
  const m = new Mesh(g, material);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  m.updateMatrixWorld();
  return m;
}

export function applyBiomeLight(engine, scene, biome, dark = false) {
  const b = BIOMES[biome] ?? BIOMES.ossuary;
  engine.sun.color.setHex(PALETTE[b.sun]);
  engine.sun.intensity = dark ? 0.04 : b.sunI;
  engine.ambient.color.setHex(PALETTE[b.ambient]);
  engine.ambient.intensity = dark ? 0.12 : b.ambI;
  scene.background = new Color(PALETTE[b.bg]);
}

export class ZoneView {
  constructor(view, zone) {
    this.view = view;
    this.zone = zone;
    this.root = new Group();
    this.root.name = 'zone';
    this.colliders = [];
    this.lights = [];
    this.fade = [];
    this.tick = 0;
    const ctx = view.ctx;
    this.ctx = ctx;
    ctx.scene.add(this.root);
    const biome = BIOMES[zone.biome] ?? BIOMES.ossuary;
    this.biome = biome;
    applyBiomeLight(ctx.engine, ctx.scene, zone.biome);
    this.rng = new Rng(`decor:${zone.seedKey}`);
    this.buildGround(biome);
    this.buildWalls(biome);
    this.dressLights(biome);
    this.dressFloor(biome);
    this.dressPlace(biome);
    this.buildPhysics();
    this.buildAtmosphere(biome);
  }

  /** Authored places get their furniture. */
  dressPlace(biome) {
    const z = this.zone;
    if (z.id === 'town') {
      const ps = z.pillars;
      if (ps.length) {
        const cx = ps.reduce((a, p) => a + p.x, 0) / ps.length, cz = ps.reduce((a, p) => a + p.z, 0) / ps.length;
        this.place('fountain', cx, cz, { scale: 1.2 });
        this.lights.push(this.ctx.lights.request({ position: [cx + 1, 2.4, cz + 1], color: 0xffc080, intensity: 9, radius: 12, priority: 2 }));
      }
      const near = (key, dx, dz, id, o = {}) => { const n = this.view.w.objects.find((q) => q.key === key); if (n) this.place(id, n.x + dx, n.z + dz, o); };
      near('npc_pennywhistle', -1.8, -1.6, 'market-stall', { rotY: Math.PI / 4 });
      near('npc_pennywhistle', 2.2, -1.2, 'crate-stack', {});
      near('npc_pennywhistle', -3.4, 0.6, 'barrel', {});
      near('npc_brasse', -1.2, -1.8, 'anvil', {});
      near('npc_brasse', -2.8, -0.4, 'fireplace', {});
      near('npc_brasse', 1.6, -2, 'crate-stack', {});
      near('npc_ogive', -1, -1.8, 'altar', {});
      near('npc_ogive', 1.4, -1.6, 'candles', {});
      near('npc_ogive', -2.6, -0.2, 'bookshelf', { rotY: Math.PI / 2 });
      near('knell_font', 2.4, -1.4, 'obelisk', {});
      near('stash', 1.8, 0.2, 'crate', {});
      near('writ_board', -2.2, -0.6, 'bench', {});
      near('lychgate', -2.6, 1, 'well', {});
      near('npc_crier', 2.4, -0.8, 'statue', {});
      near('road_gate', 0, -2.4, 'signpost', {});
      for (const p of [[12, 1.6], [28, 1.6], [34, 1.6], [50, 1.6]]) this.place('oak', p[0], p[1], { seed: Math.round(p[0]), params: { h: 3 } });
    }
    if (z.id === 'belfry' && z.floor === 3) {
      for (const p of z.pillars) {
        this.lights.push(this.ctx.lights.request({ position: [p.x + 0.8, 2.6, p.z + 0.8], color: biome.torch, intensity: 9, radius: 11, flicker: 'pulse', priority: 1 }));
        this.place('standing-torch', p.x + 1, p.z + 1, { light: false });
      }
    }
    if (z.id === 'yard') {
      const c = { x: z.entryX, z: z.entryZ };
      this.place('coffin', c.x - 1.1, c.z - 1.1, { rotY: 0.5 });
      this.place('tombstone', c.x - 2.2, c.z + 1.4, {});
      this.place('tombstone', c.x + 1.6, c.z - 2.8, { seed: 2 });
    }
  }

  buildGround(biome) {
    const z = this.zone;
    const texId = BIOME_FLOORS[z.biome]?.[z.floor % (BIOME_FLOORS[z.biome]?.length || 1)] ?? biome.floor;
    const tile = tileOf(texId);
    const mat = toonMaterial(PALETTE.mist, { map: textureMap(texId) });
    const parts = [];
    for (let row = 0; row < z.h; row++) {
      const s = z.rows[row];
      let x = 0;
      while (x < z.w) {
        if (!isFloor(s[x]) && s[x] !== 'P') { x++; continue; }
        let e = x;
        while (e < z.w && (isFloor(s[e]) || s[e] === 'P')) e++;
        const len = e - x;
        parts.push(texturedBox(len, 1, 1, x + len / 2, -0.5, row + 0.5, mat, tile));
        x = e;
      }
    }
    for (const m of mergeStaticMeshes(parts)) { m.receiveShadow = true; this.root.add(m); }
    // What is under the world.
    if (biome.water) {
      this.water = new WaterSurface({ size: [z.w + 60, z.h + 60], at: [z.w / 2, -0.18, z.h / 2], waves: WAVES_CALM, segments: [Math.min(160, z.w), Math.min(120, z.h)], deep: PALETTE.navy, shallow: PALETTE.teal, foam: PALETTE.slate });
      this.root.add(this.water);
    } else if (biome.pit) {
      const id = biome.pit === 3 ? 'rift-energy' : biome.pit === 2 ? 'lava-crust' : 'stone';
      const g = new PlaneGeometry(z.w + 80, z.h + 80).rotateX(-Math.PI / 2);
      const t = tileOf(id);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * (z.w + 80)) / t, (uv.getY(i) * (z.h + 80)) / t);
      const m = new Mesh(g, biome.pit === 1 ? toonMaterial(PALETTE.ink) : toonMaterial(biome.pit === 3 ? PALETTE.white : PALETTE.mist, { map: textureMap(id) }));
      m.position.set(z.w / 2, -3, z.h / 2);
      this.root.add(m);
    }
  }

  buildWalls(biome) {
    const z = this.zone;
    const tile = tileOf(biome.wall);
    const mat = toonMaterial(PALETTE.mist, { map: textureMap(biome.wall) });
    const cap = toonMaterial(PALETTE.ink);
    const parts = [];
    const at = (x, y) => z.rows[y]?.[x];
    this.backWalls = [];
    for (let y = 0; y < z.h; y++) {
      for (let x = 0; x < z.w; x++) {
        const c = at(x, y);
        if (c === 'P') { this.pillar(x, y, biome, parts, mat, tile, cap); continue; }
        if (c !== '#') continue;
        const px = isFloor(at(x + 1, y)), pz = isFloor(at(x, y + 1)), pd = isFloor(at(x + 1, y + 1));
        const nx = isFloor(at(x - 1, y)), nz = isFloor(at(x, y - 1)), nd = isFloor(at(x - 1, y - 1));
        const dA = isFloor(at(x + 1, y - 1)), dB = isFloor(at(x - 1, y + 1));
        if (!(px || pz || pd || nx || nz || nd || dA || dB)) continue;
        const tall = (px || pz || pd) && !(nx || nz);
        const H = tall ? biome.wallH : 0.6;
        parts.push(texturedBox(1, H, 1, x + 0.5, H / 2, y + 0.5, mat, tile, true));
        const capB = new Mesh(new BoxGeometry(1, 0.12, 1), cap);
        capB.position.set(x + 0.5, H + 0.06, y + 0.5);
        capB.castShadow = true;
        capB.updateMatrixWorld();
        parts.push(capB);
        if (tall && (px || pz)) this.backWalls.push({ x, y, px, pz });
      }
    }
    for (const m of mergeStaticMeshes(parts)) this.root.add(m);
    // Dress the walls.
    const dress = biome.wallDress ?? [];
    if (dress.length) {
      for (const w of this.backWalls) {
        if (this.rng.next() > 0.16) continue;
        const id = this.rng.pick(dress);
        const face = w.pz ? [w.x + 0.5, w.y + 1.04, 0] : [w.x + 1.04, w.y + 0.5, Math.PI / 2];
        this.place(id, face[0], face[1], { rotY: face[2], y: id === 'column' ? 0 : id === 'wall-torch' || id === 'wall-lantern' ? 1.6 : 0.8, light: false });
      }
    }
  }

  pillar(x, y, biome, parts, mat, tile, cap) {
    if (this.zone.id === 'town') return;
    const H = 2.4;
    parts.push(texturedBox(0.8, H, 0.8, x + 0.5, H / 2, y + 0.5, mat, tile, true));
    parts.push(texturedBox(1, 0.2, 1, x + 0.5, 0.1, y + 0.5, mat, tile, true));
    const capB = new Mesh(new BoxGeometry(1, 0.2, 1), cap);
    capB.position.set(x + 0.5, H + 0.1, y + 0.5);
    capB.castShadow = true;
    capB.updateMatrixWorld();
    parts.push(capB);
  }

  place(id, x, z, o = {}) {
    const b = buildModel(id, { catalog: MODELS, params: o.params, seed: o.seed, palette: o.palette });
    const obj = b.object;
    obj.position.set(x, o.y ?? 0, z);
    obj.rotation.y = o.rotY ?? 0;
    if (o.scale) obj.scale.setScalar(o.scale);
    obj.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    this.root.add(obj);
    if (b.light && o.light !== false) {
      const p = new THREE.Vector3(...b.light.at).applyMatrix4(obj.updateMatrixWorld() ?? obj.matrixWorld);
      this.lights.push(this.ctx.lights.request({ ...b.light, position: [p.x, p.y, p.z] }));
    }
    return obj;
  }

  dressLights(biome) {
    const z = this.zone;
    const nearWall = (x, y) => this.backWalls.find((w) => Math.abs(w.x - x) + Math.abs(w.y - y) <= 2);
    for (const l of z.lights) {
      const cx = Math.floor(l.x), cy = Math.floor(l.z);
      const w = nearWall(cx, cy);
      let lx = l.x, lz = l.z;
      if (w) {
        const face = w.pz ? [w.x + 0.5, w.y + 1.04, 0] : [w.x + 1.04, w.y + 0.5, Math.PI / 2];
        this.place('wall-torch', face[0], face[1], { rotY: face[2], y: 1.5, light: false });
        lx = face[0]; lz = face[1];
      } else {
        this.place(z.id === 'town' ? 'lamp-post' : 'standing-torch', l.x, l.z, { light: false });
      }
      this.lights.push(this.ctx.lights.request({ position: [lx + 0.3, 1.9, lz + 0.3], color: biome.torch, intensity: 7, radius: 9, flicker: 'torch', priority: 1 }));
    }
  }

  dressFloor(biome) {
    const z = this.zone;
    const low = [], tall = [];
    const TALL = new Set(['dead-tree', 'willow', 'statue', 'obelisk', 'column', 'ruined-wall', 'standard', 'cart', 'sarcophagus', 'cage', 'fallen-tree', 'rune-stone']);
    for (const id of biome.decor ?? []) (TALL.has(id) ? tall : low).push(id);
    const at = (x, y) => z.rows[y]?.[x];
    for (let y = 1; y < z.h - 1; y++) {
      for (let x = 1; x < z.w - 1; x++) {
        const c = at(x, y);
        if (c !== '.') {
          // Outdoors, trees grow out of the moor on the far side of the road.
          if (c === '~' && biome.water && tall.length && (isFloor(at(x + 1, y)) || isFloor(at(x, y + 1))) && this.rng.next() < 0.14) {
            const id = this.rng.pick(tall.filter((t) => t !== 'cart'));
            if (id) this.place(id, x + 0.5, y + 0.5, { seed: this.rng.int(1, 9), rotY: this.rng.range(0, 6), y: -0.2 });
          }
          continue;
        }
        const r = this.rng.next();
        if (r > 0.045) continue;
        const backWall = at(x - 1, y) === '#' || at(x, y - 1) === '#';
        if (backWall && tall.length && r < 0.03) {
          const id = this.rng.pick(tall);
          this.place(id, x + 0.5, y + 0.5, { rotY: at(x, y - 1) === '#' ? 0 : Math.PI / 2, seed: this.rng.int(1, 9), params: id === 'dead-tree' ? undefined : undefined });
        } else if (low.length) {
          const id = this.rng.pick(low);
          this.place(id, x + this.rng.range(0.2, 0.8), y + this.rng.range(0.2, 0.8), { rotY: this.rng.range(0, 6.28), seed: this.rng.int(1, 9) });
        }
      }
    }
  }

  buildPhysics() {
    const z = this.zone;
    const ph = this.ctx.physics;
    this.colliders.push(ph.addStaticBox({ position: [z.w / 2, -0.5, z.h / 2], halfExtents: [z.w / 2 + 20, 0.5, z.h / 2 + 20] }));
    for (let y = 0; y < z.h; y++) {
      let x = 0;
      const s = z.rows[y];
      while (x < z.w) {
        if (s[x] !== '#') { x++; continue; }
        let e = x;
        while (e < z.w && s[e] === '#') e++;
        const len = e - x;
        this.colliders.push(ph.addStaticBox({ position: [x + len / 2, 1.5, y + 0.5], halfExtents: [len / 2, 1.5, 0.5] }));
        x = e;
      }
    }
  }

  buildAtmosphere(biome) {
    const ctx = this.ctx;
    const scene = ctx.scene;
    this.mist = groundFog({ color: PALETTE[biome.fog], top: 1.2, amount: 0.35 });
    scene.fogNode = this.mist.node;
    if (biome.rain) {
      this.rain = new Precipitation({ kind: 'rain', count: 700 });
      this.rain.wind.set(1.5, -1);
      this.root.add(this.rain);
    }
    this.ambientT = 0;
  }

  update(dt, time, focus) {
    if (this.water) this.water.update(time);
    if (this.rain) this.rain.update(dt, focus);
    this.tick += dt;
    if (this.biome.embers && this.tick > 0.25) {
      this.tick = 0;
      const r = this.view.fxRng;
      this.ctx.particles.burst('ember_drift', [focus.x + r.range(-9, 9), r.range(0.2, 1), focus.z + r.range(-9, 9)]);
    }
    if (this.biome.wind && this.tick > 0.4) {
      this.tick = 0;
      const r = this.view.fxRng;
      if (this.zone.biome === 'belfry') this.ctx.particles.burst('crackle', [focus.x + r.range(-10, 10), r.range(0.1, 2), focus.z + r.range(-10, 10)]);
    }
  }

  dispose() {
    const ctx = this.ctx;
    for (const l of this.lights) l.release();
    for (const c of this.colliders) ctx.physics.remove(c);
    if (ctx.scene.fogNode === this.mist?.node) ctx.scene.fogNode = null;
    this.water?.dispose();
    this.rain?.dispose();
    ctx.scene.remove(this.root);
    disposeObject(this.root);
  }
}

export { setLookLayer, addModelColliders, glowMaterial };
