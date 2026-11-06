// Turns a zone's rows into a lit gothic diorama: floors, walls that never hide the player, dressing, lights, weather.
import { buildModel, DEFAULT_TEXEL, disposeObject, groundFog, PALETTE, Precipitation, textureMap, THREE, toonMaterial, WaterSurface, WAVES_CALM, Rng } from '../../pixel-engine.js';
import { MODELS } from './models/props.js';
import { dissolveClone } from './actors.js';

const { BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, Uint32BufferAttribute, Vector3 } = THREE;

export const LOOKS = {
  yard: { floor: ['mud', 'dirt'], wall: 'dry-stone', tint: 'mist', cap: 'ink', sun: 'sky', sunI: 0.55, amb: 'navy', ambI: 0.9, bg: 'ink', fog: 'night', fogA: 0.5, light: 0xffb060, pit: 'water', dress: ['bones', 'rubble', 'rock', 'stump'], wallDress: ['wall-chains'], torch: 'standing-torch', vign: 0.35 },
  town: { floor: ['cobbles', 'floor-tiles'], wall: 'bricks', tint: 'white', cap: 'plum', sun: 'sand', sunI: 0.62, amb: 'plum', ambI: 1.3, bg: 'ink', fog: 'plum', fogA: 0.25, light: 0xffc070, pit: 'dark', dress: ['barrel', 'crate', 'sack', 'bucket', 'planter'], wallDress: ['banner', 'wall-lantern'], torch: 'lamp-post', vign: 0.25 },
  moor: { floor: ['swamp', 'mud'], wall: 'dry-stone', tint: 'mist', cap: 'night', sun: 'sky', sunI: 0.65, amb: 'navy', ambI: 1, bg: 'ink', fog: 'teal', fogA: 0.4, light: 0xffb060, pit: 'water', dress: ['reeds', 'dead-tree', 'stump', 'lily-pads', 'rock', 'bones'], wallDress: [], torch: 'standing-torch', vign: 0.35 },
  crypt: { floor: ['flagstones', 'slate-tiles'], wall: 'ashlar', tint: 'mist', cap: 'ink', sun: 'mist', sunI: 0.22, amb: 'night', ambI: 1.1, bg: 'ink', fog: 'night', fogA: 0.35, light: 0xa8f070, light2: 0xffb060, pit: 'dark', dress: ['bones', 'rubble', 'skull-pile', 'cobweb', 'candles'], wallDress: ['wall-chains', 'banner', 'wall-torch'], torch: 'candles', vign: 0.4 },
  counting: { floor: ['parquet', 'flagstones'], wall: 'ashlar', tint: 'sand', cap: 'ink', sun: 'mist', sunI: 0.25, amb: 'plum', ambI: 1.1, bg: 'ink', fog: 'plum', fogA: 0.2, light: 0xffc060, pit: 'dark', dress: ['gold-pile', 'candles', 'skull-pile', 'bookshelf'], wallDress: ['banner', 'wall-chains'], torch: 'chandelier', vign: 0.35 },
  cloister: { floor: ['slate-tiles', 'cinders'], wall: 'sandstone', tint: 'mist', cap: 'ink', sun: 'orange', sunI: 0.35, amb: 'plum', ambI: 0.9, bg: 'ink', fog: 'red', fogA: 0.28, light: 0xff8030, pit: 'lava', dress: ['rubble', 'flame', 'bones', 'ruined-wall'], wallDress: ['banner', 'wall-torch'], torch: 'brazier', vign: 0.4 },
  belfry: { floor: ['basalt', 'rune-floor'], wall: 'basalt', tint: 'mist', cap: 'ink', sun: 'cyan', sunI: 0.42, amb: 'navy', ambI: 1.15, bg: 'ink', fog: 'navy', fogA: 0.28, light: 0x70d0ff, light2: 0xffc070, pit: 'rift', dress: ['rubble', 'bones', 'rune-stone'], wallDress: ['wall-chains', 'wall-torch'], torch: 'standing-torch', vign: 0.35 },
  pantry: { floor: ['shallow-water', 'wet-sand'], wall: 'ashlar', tint: 'mist', cap: 'night', sun: 'sky', sunI: 0.25, amb: 'teal', ambI: 1, bg: 'ink', fog: 'teal', fogA: 0.3, light: 0xffc070, pit: 'water', dress: ['barrel', 'keg', 'bones', 'crate'], wallDress: ['wall-torch'], torch: 'candles', vign: 0.4 },
  title: { floor: ['basalt', 'basalt'], wall: 'basalt', tint: 'mist', cap: 'ink', sun: 'sky', sunI: 0.7, amb: 'navy', ambI: 1.1, bg: 'ink', fog: 'navy', fogA: 0.3, light: 0xffb060, pit: 'rift', dress: ['bones', 'rock'], wallDress: [], torch: 'standing-torch', vign: 0.3 },
};

class BoxBuilder {
  // Boxes with world-scaled UVs, so textures keep their 8 texels a metre on any wall length.
  constructor() { this.p = []; this.n = []; this.u = []; this.i = []; }
  quad(a, b, c, d, nrm, uvs) {
    const s = this.p.length / 3;
    for (const v of [a, b, c, d]) this.p.push(...v);
    for (let k = 0; k < 4; k++) this.n.push(...nrm);
    this.u.push(...uvs);
    this.i.push(s, s + 1, s + 2, s, s + 2, s + 3);
  }
  box(x0, x1, y0, y1, z0, z1, tile, top = true) {
    const U = (a) => a / tile;
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], [U(x0), U(y0), U(x1), U(y0), U(x1), U(y1), U(x0), U(y1)]);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], [U(x1), U(y0), U(x0), U(y0), U(x0), U(y1), U(x1), U(y1)]);
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], [U(z1), U(y0), U(z0), U(y0), U(z0), U(y1), U(z1), U(y1)]);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], [U(z0), U(y0), U(z1), U(y0), U(z1), U(y1), U(z0), U(y1)]);
    if (top) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], [U(x0), U(z1), U(x1), U(z1), U(x1), U(z0), U(x0), U(z0)]);
  }
  floor(x0, x1, z0, z1, y, tile) { const U = (a) => a / tile; this.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], [U(x0), U(z1), U(x1), U(z1), U(x1), U(z0), U(x0), U(z0)]); }
  mesh(material, { cast = true, receive = true } = {}) {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new Float32BufferAttribute(this.u, 2));
    g.setIndex(new Uint32BufferAttribute(this.i, 1));
    const m = new Mesh(g, material); m.castShadow = cast; m.receiveShadow = receive;
    return m;
  }
}
const tileOf = (id) => 32 / DEFAULT_TEXEL;
const texMat = (tint, id) => toonMaterial(PALETTE[tint], { map: textureMap(id) });

export class ZoneView {
  constructor(ctx) { this.ctx = ctx; this.root = new Group(); ctx.scene.add(this.root); this.colliders = []; this.lights = []; this.rain = null; this.water = null; this.tall = []; }

  clear() {
    const { ctx } = this;
    for (const c of this.colliders) ctx.physics.remove(c);
    this.colliders = [];
    for (const l of this.lights) l.release();
    this.lights = []; this.tall = []; this.walls = [];
    if (this.water) { this.water.dispose?.(); this.water = null; }
    if (this.rain) { this.rain.dispose?.(); this.rain = null; }
    disposeObject(this.root);
    ctx.scene.remove(this.root);
    this.root = new Group(); ctx.scene.add(this.root);
    ctx.particles.clear();
  }

  build(zone, seed) {
    const { ctx } = this; this.clear();
    const look = LOOKS[zone.spec.look] ?? LOOKS.crypt; this.look = look;
    const eng = ctx.engine;
    eng.sun.color.setHex(PALETTE[look.sun]); eng.sun.intensity = look.sunI; eng.ambient.color.setHex(PALETTE[look.amb]); eng.ambient.intensity = look.ambI;
    ctx.scene.background = new Color(PALETTE[look.bg]);
    const mist = groundFog({ color: PALETTE[look.fog], top: 1.1, amount: look.fogA, near: 18, far: 44 }); ctx.scene.fogNode = mist.node; this.fog = mist;
    const rows = zone.rows; const W = zone.w; const H = zone.h;
    const at = (x, y) => (y < 0 || y >= H || x < 0 || x >= W ? ' ' : rows[y][x]);
    const isFloor = (c) => c === '.' || c === '~';
    const rng = new Rng(`${seed}:${zone.id}:view`);

    // Floors, one texture per room flavour.
    const floors = {}; const tile0 = tileOf();
    const rectOf = (x, y) => zone.roomRects.findIndex((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
    const pit = new BoxBuilder();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = rows[y][x];
      if (c === '.' || (c === '#' )) { const ri = Math.max(0, rectOf(x, y)); const tex = look.floor[ri % 3 === 2 ? 1 : 0]; (floors[tex] ??= new BoxBuilder()).floor(x, x + 1, y, y + 1, 0, tile0); }
      if (c === '~') { if (look.pit === 'water') (floors[look.floor[0]] ??= new BoxBuilder()); pit.floor(x, x + 1, y, y + 1, -0.22, tile0); }
    }
    for (const [tex, b] of Object.entries(floors)) if (b.p.length) this.root.add(b.mesh(texMat('mist', tex), { cast: false }));
    if (pit.p.length) {
      const m = look.pit === 'lava' ? pit.mesh(texMat('white', 'lava-crust'), { cast: false }) : look.pit === 'rift' ? pit.mesh(texMat('white', 'rift-energy'), { cast: false }) : look.pit === 'water' ? pit.mesh(texMat('white', 'shallow-water'), { cast: false }) : pit.mesh(toonMaterial(PALETTE.ink), { cast: false });
      this.root.add(m);
      if (look.pit === 'water') {
        const w = new WaterSurface({ size: [W + 40, H + 40], at: [W / 2, -0.3, H / 2], waves: WAVES_CALM, deep: PALETTE.ink, shallow: PALETTE.night, foam: PALETTE.slate });
        this.root.add(w); this.water = w;
      }
    }
    // Walls: a cell with floor on its +X or +Z side is a back wall, tall; floor only on -X or -Z makes a low stub.
    // Tall walls are grouped into 5 m chunks that sink when a hero walks behind them.
    const chunks = new Map(); const stubB = new BoxBuilder(); const stubCap = new BoxBuilder();
    const wallH = zone.spec.wallH; const tileW = tileOf();
    const classify = (x, y) => {
      if (rows[y][x] !== '#') return null;
      const px = isFloor(at(x + 1, y)); const pz = isFloor(at(x, y + 1)); const nx = isFloor(at(x - 1, y)); const nz = isFloor(at(x, y - 1));
      const dpp = isFloor(at(x + 1, y + 1)); const dnn = isFloor(at(x - 1, y - 1)); const dpn = isFloor(at(x + 1, y - 1)); const dnp = isFloor(at(x - 1, y + 1));
      if (px || pz || dpp) return 'tall';
      if (nx || nz || dnn || dpn || dnp) return 'stub';
      return null;
    };
    const physBoxes = [];
    for (let y = 0; y < H; y++) {
      let x = 0;
      while (x < W) {
        const k = classify(x, y);
        if (!k) { x++; continue; }
        let e = x + 1; while (e < W && classify(e, y) === k && e - x < 5 && Math.floor(e / 5) === Math.floor(x / 5)) e++;
        const h = k === 'tall' ? wallH : Math.min(0.6, wallH);
        if (k === 'tall') {
          const key = `${Math.floor(x / 5)},${Math.floor(y / 5)}`; let c = chunks.get(key);
          if (!c) { c = { wall: new BoxBuilder(), cap: new BoxBuilder(), sx: 0, sz: 0, n: 0 }; chunks.set(key, c); }
          c.wall.box(x, e, 0, h, y, y + 1, tileW, false); c.cap.box(x, e, h, h + 0.08, y, y + 1, tileW); c.sx += (x + e) / 2; c.sz += y + 0.5; c.n++;
        } else { stubB.box(x, e, 0, h, y, y + 1, tileW, false); stubCap.box(x, e, h, h + 0.08, y, y + 1, tileW); }
        physBoxes.push({ position: [(x + e) / 2, h / 2, y + 0.5], halfExtents: [(e - x) / 2, h / 2, 0.5] });
        x = e;
      }
    }
    this.walls = [];
    const wallMat = texMat(look.tint, look.wall); const capMat = toonMaterial(PALETTE[look.cap]);
    for (const c of chunks.values()) {
      const g = new Group(); g.add(c.wall.mesh(wallMat)); g.add(c.cap.mesh(capMat)); this.root.add(g);
      this.walls.push({ g, x: c.sx / c.n, z: c.sz / c.n, k: 1 });
    }
    if (stubB.p.length) this.root.add(stubB.mesh(wallMat));
    if (stubCap.p.length) this.root.add(stubCap.mesh(capMat));
    const ph = ctx.physics;
    this.colliders.push(ph.addStaticBox({ position: [W / 2, -0.5, H / 2], halfExtents: [W / 2 + 4, 0.5, H / 2 + 4] }));
    for (const b of physBoxes) this.colliders.push(ph.addStaticBox(b));

    // Lights and torches.
    let li = 0;
    for (const l of zone.lights) {
      const id = look.torch; const color = look.light2 && (li++ % 2) ? look.light2 : look.light;
      this.place(id, l.x, l.z, rng.range(0, 6.28), {}, id === 'lamp-post' || id === 'standing-torch' || id === 'chandelier');
      const y = id === 'candles' ? 1 : 2.2;
      this.lights.push(ctx.lights.request({ position: [l.x, y, l.z], color, intensity: id === 'candles' ? 7 : 9, radius: 10, flicker: 'torch', priority: 1 }));
    }
    // Dressing: low clutter on floors and hung things on back walls.
    const dressN = Math.floor((W * H) / 42);
    for (let i = 0; i < dressN; i++) {
      const x = rng.int(1, W - 2); const y = rng.int(1, H - 2);
      if (rows[y][x] !== '.' || zone.nav && !zone.nav.isOpen(x, y)) continue;
      const nearWall = at(x, y - 1) === '#' || at(x - 1, y) === '#';
      const id = rng.pick(look.dress);
      if ((id === 'dead-tree' || id === 'ruined-wall' || id === 'bookshelf') && !nearWall) continue;
      this.place(id, x + rng.range(0.2, 0.8), y + rng.range(0.2, 0.8), rng.range(0, 6.28), { seed: rng.int(1, 99) }, id === 'dead-tree');
      if (id === 'flame') this.lights.push(ctx.lights.request({ position: [x + 0.5, 1, y + 0.5], color: 0xff7020, intensity: 4, radius: 5, flicker: 'torch', priority: 0.6 }));
    }
    if (look.wallDress.length) {
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        if (rows[y][x] !== '#' || !rng.chance(0.045)) continue;
        if (at(x, y + 1) === '.' ) { const id = rng.pick(look.wallDress); this.place(id, x + 0.5, y + 1.02, 0, {}, false, 1.1); if (id === 'wall-torch' || id === 'wall-lantern') this.lights.push(ctx.lights.request({ position: [x + 0.5, 2, y + 1.4], color: look.light2 ?? look.light, intensity: 5, radius: 7, flicker: 'torch', priority: 0.7 })); }
        else if (at(x + 1, y) === '.') { const id = rng.pick(look.wallDress); this.place(id, x + 1.02, y + 0.5, Math.PI / 2, {}, false, 1.1); }
      }
    }
    // Gothic columns along long back walls, for depth.
    if (zone.spec.biome === 'crypt' || zone.spec.biome === 'cloister') {
      for (const r of zone.roomRects) { if (r.w < 13) continue; for (let x = r.x + 3; x < r.x + r.w - 3; x += 5) if (at(x, r.y + 1) === '.' && at(x, r.y) === '#') this.place('column', x + 0.5, r.y + 1.1, 0, { params: {} }, false); }
    }
    if (zone.spec.rain) { const rain = new Precipitation({ kind: 'rain', count: 1100, area: [40, 16, 40], color: PALETTE.slate }); rain.intensity = 0.7; this.root.add(rain); this.rain = rain; }
    ctx.engine.setSunDirection(zone.spec.look === 'town' ? [0.8, 0.5, 0.25] : [0.5, 0.8, 0.35]);
    this.rng = rng;
    this.zoneId = zone.id;
  }

  place(id, x, z, rot = 0, opts = {}, tall = false, y = 0) {
    const b = buildModel(id, { ...opts, catalog: MODELS });
    b.object.position.set(x, y && y !== 0 ? 0 : 0, z); b.object.rotation.y = rot;
    if (y > 1) b.object.position.y = 0;
    b.object.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.root.add(b.object);
    if (tall) this.tall.push(b.object);
    return b.object;
  }

  // Anything tall between the camera and a hero steps aside.
  fadeTall(heroes) {
    for (const o of this.tall) {
      let hide = false;
      for (const h of heroes) { const dx = o.position.x - h.x; const dz = o.position.z - h.z; const toward = (dx + dz) * 0.707; const side = Math.abs(dx - dz) * 0.707; if (toward > 0 && toward < 5 && side < 1.6) { hide = true; break; } }
      // Per-prop dissolve clones, made the first time a prop has to step aside.
      if (hide && !o.userData.fade) { o.userData.fade = []; o.traverse((m) => { if (m.isMesh && m.material?.color && !m.material.isMeshBasicNodeMaterial) { const c = dissolveClone(m.material); m.material = c; o.userData.fade.push(c); } }); o.userData.fadeK = 0; }
      if (o.userData.fade) { const want = hide ? 0.85 : 0; const k = o.userData.fadeK + Math.sign(want - o.userData.fadeK) * Math.min(Math.abs(want - o.userData.fadeK), 0.06); if (k !== o.userData.fadeK) { o.userData.fadeK = k; for (const c of o.userData.fade) c.dissolve = k; } }
    }
    for (const w of this.walls ?? []) {
      let want = 1;
      for (const h of heroes) { const dx = w.x - h.x; const dz = w.z - h.z; if (Math.abs(dx) > 9 || Math.abs(dz) > 9) continue; const toward = (dx + dz) * 0.707; const side = Math.abs(dx - dz) * 0.707; if (toward > -0.2 && toward < 6.5 && side < 5) { want = 0.16; break; } }
      if (w.k !== want) { w.k += Math.sign(want - w.k) * Math.min(Math.abs(want - w.k), 0.08); w.g.scale.y = w.k; }
    }
  }
  update(dt, focus, t) { if (this.rain) { this.rain.update(dt, focus); } if (this.water) this.water.update(t); }
}
export { Vector3 };
