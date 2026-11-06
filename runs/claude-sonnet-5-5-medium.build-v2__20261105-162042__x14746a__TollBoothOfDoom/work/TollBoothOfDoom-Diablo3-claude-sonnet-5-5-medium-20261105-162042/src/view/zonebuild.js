// Builds the 3D scene for a zone (floor, walls, decor, lights, weather). View only: reads the sim's zone.
import { THREE, PALETTE, toonMaterial, textureMap, TEXTURE_LIBRARY, buildModel, addModelColliders, glowMaterial, setLookLayer, Precipitation, groundFog, disposeObject, DEFAULT_TEXEL, Decals, Breakables } from '../../pixel-engine.js';
import { CATALOG } from './models/bodies.js';
import { ZONES } from '../data/zones.js';

const { Group, Mesh, BufferGeometry, Float32BufferAttribute, Color, Vector3 } = THREE;

const MOODS = {
  yard: { sky: 'sky', sun: 0.45, amb: 'navy', ambI: 0.95, bg: 'ink', fog: 0x0e1b2a, fogAmt: 0.55, torch: 0xffa050 },
  town: { sky: 'sand', sun: 0.85, amb: 'plum', ambI: 1.1, bg: 'night', fog: 0x2a1b2e, fogAmt: 0.35, torch: 0xffb060 },
  ossuary: { sky: 'mist', sun: 0.4, amb: 'night', ambI: 0.95, bg: 'ink', fog: 0x0f1a14, fogAmt: 0.55, torch: 0xa0ff90 },
  cloister: { sky: 'orange', sun: 0.5, amb: 'ink', ambI: 1.0, bg: 'ink', fog: 0x2a0e0e, fogAmt: 0.5, torch: 0xff7030 },
  belfry: { sky: 'cyan', sun: 0.5, amb: 'navy', ambI: 1.0, bg: 'ink', fog: 0x0b0f24, fogAmt: 0.55, torch: 0x80d8ff },
};

class Batch {
  constructor() { this.p = []; this.n = []; this.u = []; this.i = []; }
  quad(a, b, c, d, nrm, uv) {
    const o = this.p.length / 3;
    for (const v of [a, b, c, d]) { this.p.push(v[0], v[1], v[2]); this.n.push(nrm[0], nrm[1], nrm[2]); }
    for (const q of uv) this.u.push(q[0], q[1]);
    this.i.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
  box(x, y, z, sx, sy, sz, tile) {
    const x0 = x, x1 = x + sx, y0 = y, y1 = y + sy, z0 = z, z1 = z + sz, t = 1 / tile;
    this.quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0], [[x0 * t, z0 * t], [x0 * t, z1 * t], [x1 * t, z1 * t], [x1 * t, z0 * t]]);
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], [[x0 * t, y0 * t], [x1 * t, y0 * t], [x1 * t, y1 * t], [x0 * t, y1 * t]]);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], [[x1 * t, y0 * t], [x0 * t, y0 * t], [x0 * t, y1 * t], [x1 * t, y1 * t]]);
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], [[z1 * t, y0 * t], [z0 * t, y0 * t], [z0 * t, y1 * t], [z1 * t, y1 * t]]);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], [[z0 * t, y0 * t], [z1 * t, y0 * t], [z1 * t, y1 * t], [z0 * t, y1 * t]]);
  }
  floorQuad(x, z, y, tile) {
    const t = 1 / tile;
    this.quad([x, y, z], [x, y, z + 1], [x + 1, y, z + 1], [x + 1, y, z], [0, 1, 0], [[x * t, z * t], [x * t, (z + 1) * t], [(x + 1) * t, (z + 1) * t], [(x + 1) * t, z * t]]);
  }
  geometry() {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new Float32BufferAttribute(this.n, 3)); g.setAttribute('uv', new Float32BufferAttribute(this.u, 2));
    g.setIndex(this.i); g.computeBoundingSphere(); return g;
  }
}
const texTile = (id) => { try { return TEXTURE_LIBRARY.get(id).size[0] / DEFAULT_TEXEL; } catch { return 2; } };
const texMat = (id, color = PALETTE.mist) => toonMaterial(color, { map: textureMap(id) });

export class ZoneView {
  constructor(ctx, game) { this.ctx = ctx; this.game = game; this.root = new Group(); this.lights = []; this.decor = []; this.props = new Map(); this.rain = null; this.breaks = null; this.decals = null; this.doors = []; }

  build(zone, def, w) {
    const { ctx } = this;
    const mood = MOODS[def.look] || MOODS.ossuary;
    this.mood = mood; this.zone = zone; this.def = def;
    ctx.scene.add(this.root);
    const eng = ctx.engine;
    eng.sun.color.setHex(PALETTE[mood.sky]); eng.sun.intensity = mood.sun; eng.ambient.color.setHex(PALETTE[mood.amb]); eng.ambient.intensity = mood.ambI;
    ctx.scene.background = new Color(PALETTE[mood.bg]);
    const fog = groundFog({ color: mood.fog, top: 1.2, amount: mood.fogAmt, near: 18, far: 70 });
    ctx.scene.fogNode = fog.node; this.fog = fog;
    const { w: W, h: H, cells } = zone;
    const rng = w.root.fork('view:' + w.zoneId + (w.flags.zoneSalt || ''));
    // floor
    const floor = new Batch(), pit = new Batch(), wallsT = new Batch(), wallsS = new Batch(), caps = new Batch();
    const tile = texTile(def.tex), wt = texTile(def.wall);
    const at = (c, r) => (c < 0 || r < 0 || c >= W || r >= H ? 0 : cells[r * W + c]);
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const v = at(c, r);
      if (v === 1 || v === 3) floor.floorQuad(c, r, 0, tile);
      else if (v === 2) pit.floorQuad(c, r, def.water ? -0.12 : -1.4, def.water ? texTile('shallow-water') : 2);
      else {
        // wall: any floor neighbour?
        const n = [at(c + 1, r), at(c - 1, r), at(c, r + 1), at(c, r - 1), at(c + 1, r + 1), at(c - 1, r - 1), at(c + 1, r - 1), at(c - 1, r + 1)].some((q) => q === 1 || q === 3 || q === 2);
        if (!n) continue;
        const frontSide = at(c - 1, r) !== 0 || at(c, r - 1) !== 0; // floor on its -X or -Z side: it is on a room's +X/+Z edge: low wall
        const tall = !(at(c - 1, r) !== 0 && at(c - 1, r) !== undefined && at(c - 1, r) !== 0) && !(at(c, r - 1) !== 0);
        if (frontSide) { wallsS.box(c, 0, r, 1, 0.6, 1, wt); caps.box(c, 0.6, r, 1, 0.08, 1, 1); }
        else { wallsT.box(c, 0, r, 1, 3, 1, wt); caps.box(c, 3, r, 1, 0.08, 1, 1); }
      }
    }
    const mk = (b, mat, shadow = true) => { if (!b.i.length) return null; const m = new Mesh(b.geometry(), mat); m.castShadow = shadow; m.receiveShadow = true; this.root.add(m); return m; };
    mk(floor, texMat(def.tex), false);
    if (pit.i.length) mk(pit, def.water ? texMat('shallow-water', PALETTE.slate) : toonMaterial(PALETTE.ink), false);
    mk(wallsT, texMat(def.wall, PALETTE.slate)); mk(wallsS, texMat(def.wall, PALETTE.slate)); mk(caps, toonMaterial(PALETTE.ink));
    // physics floor for ragdolls and chunks
    ctx.physics.addStaticBox({ position: [W / 2, -0.5, H / 2], halfExtents: [W / 2, 0.5, H / 2] });
    this.breaks = new Breakables(ctx);
    this.decals = new Decals(ctx.scene);
    // markers: lights, pillars, decor
    for (const m of zone.markers) {
      if (m.t === 'L') this.torchAt(m.x, m.z, mood, rng, def.look === 'town');
      else if (m.t === 'W') { this.place('well', m.x, m.z, 0); }
      else if (m.t === 'P') this.place('column', m.x, m.z, rng.range(0, 6));
    }
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (at(c, r) === 3) this.place('column', c + 0.5, r + 0.5, 0);
    this.dress(zone, def, rng, at);
    // prop breakables
    for (const m of w.monsters) if (m.prop) this.addProp(m);
    if (def.look === 'town') { for (const [id, dx, dz, rot] of [['market-stall', 3, 1.5, 0], ['market-stall', -3, 1.5, 0.3], ['fountain', 0, -3, 0], ['statue', 8, 0, 0]]) { const a = zone.markers.find((q) => q.t === (id === 'fountain' ? 'Y' : id === 'statue' ? '6' : '2')); if (a) this.place(id, a.x + dx, a.z + dz, rot); } }
    // weather
    if (def.rain) { this.rain = new Precipitation({ kind: 'rain', count: 2500, area: [30, 18, 30], color: PALETTE.sky }); this.rain.intensity = 0.8; this.rain.wind.set(2, 1); ctx.scene.add(this.rain); }
    return this;
  }
  torchAt(x, z, mood, rng, lamp) {
    const m = this.place(lamp ? 'lamp-post' : 'standing-torch', x, z, 0, true);
    this.lights.push(this.ctx.lights.request({ position: [x, 1.7, z], color: mood.torch, intensity: 6, radius: 8, flicker: 'torch', priority: 1 }));
  }
  place(id, x, z, rot = 0, noCollide = true, params) {
    try {
      const b = buildModel(id, { catalog: CATALOG, params });
      b.object.position.set(x, 0, z); b.object.rotation.y = rot;
      b.object.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
      this.root.add(b.object); this.decor.push(b); return b.object;
    } catch (e) { return null; }
  }
  dress(zone, def, rng, at) {
    const biome = def.look;
    const walls = ['banner', 'wall-torch', 'wall-chains', 'column'];
    const floors = biome === 'cloister' ? ['rubble', 'bones', 'brazier'] : biome === 'yard' || biome === 'town' ? ['tombstone', 'dead-tree', 'rubble'] : ['bones', 'skull-pile', 'rubble', 'cobweb', 'sarcophagus'];
    const W = zone.w, H = zone.h; let n = 0;
    for (let r = 1; r < H - 1 && n < 260; r++) for (let c = 1; c < W - 1; c++) {
      if (at(c, r) !== 1) continue;
      // along tall back walls: wall at c-1 or r-1
      if (at(c - 1, r) === 0 && at(c + 1, r) === 1 && rng.chance(0.07)) { const id = rng.pick(['banner', 'wall-chains', 'wall-torch']); if (id === 'wall-torch' || id === 'banner') { this.place(id, c + 0.1, r + 0.5, Math.PI / 2); if (id === 'wall-torch' && rng.chance(0.5)) this.lights.push(this.ctx.lights.request({ position: [c + 0.6, 1.6, r + 0.5], color: this.mood.torch, intensity: 5, radius: 7, flicker: 'torch', priority: 1 })); } n++; }
      else if (at(c, r - 1) === 0 && at(c, r + 1) === 1 && rng.chance(0.07)) { const id = rng.pick(['banner', 'wall-chains', 'wall-torch']); this.place(id, c + 0.5, r + 0.1, 0); n++; }
      else if (rng.chance(0.012)) { this.place(rng.pick(floors), c + 0.5, r + 0.5, rng.range(0, 6.28)); n++; }
    }
    // gibbets on the causeway
    if (def.water) for (let i = 0; i < 6; i++) { const r = rng.pick(zone.rooms); const x = r.x0 + 3 + rng.int(0, 8), z = r.y0 + 2; if (at(Math.floor(x), z) === 1) this.place('gibbet', x + 0.5, z + 0.5, rng.range(0, 6)); }
  }
  addProp(m) {
    const ids = { urn: 'urn', barrel: 'barrel', crate: 'crate', tombstone: 'tombstone' };
    const o = this.place(ids[m.variant] || 'barrel', m.x, m.z, (m.id * 1.7) % 6.28);
    this.props.set(m.id, o);
  }
  breakProp(ev) {
    const o = this.props.get(ev.id);
    if (o) { o.visible = false; this.props.delete(ev.id); }
    const colors = { urn: 'orange', barrel: 'red', crate: 'orange', tombstone: 'mist' };
    try { const b = this.breaks.add({ at: [ev.x, 0.4, ev.z], size: [0.7, 0.7, 0.7], color: colors[ev.variant] || 'orange', cuts: [2, 2, 2], linger: 3 }); this.breaks.break(b, [ev.x - (ev.dirx || 0), 0.4, ev.z - (ev.dirz || 0)], 4); } catch (e) { /* cosmetic */ }
  }
  /** Floor that crumbled into a pit (Malison's second phase): dark quads over the cells until they grow back. */
  markPits(e) {
    this.pits = this.pits || new Map();
    if (e.restore) { const g = this.pits.get(e.cid); if (g) { this.root.remove(g); this.pits.delete(e.cid); } return; }
    const g = new Group();
    for (const [c, r] of e.cells) { const m = new Mesh(new THREE.BoxGeometry(1, 0.06, 1), toonMaterial(PALETTE.ink)); m.position.set(c + 0.5, 0.04, r + 0.5); g.add(m); }
    this.root.add(g); this.pits.set(e.cid, g);
  }
  update(dt, focus) {
    if (this.rain) this.rain.update(dt, focus);
    if (this.breaks) this.breaks.update(dt);
    if (this.decals) this.decals.update(dt);
  }
  dispose() {
    for (const l of this.lights) { try { l.release(); } catch {} }
    this.lights = [];
    if (this.rain) { this.ctx.scene.remove(this.rain); this.rain.dispose(); this.rain = null; }
    if (this.decals) { this.decals.dispose(); this.decals = null; }
    this.ctx.scene.remove(this.root); disposeObject(this.root);
    this.ctx.scene.fogNode = null;
  }
}
