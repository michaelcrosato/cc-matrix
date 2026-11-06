// Every interior: a dollhouse cutaway with two back walls. Built from data in data/rooms.js.
import { THREE, toonMaterial, PALETTE, textureMap, setLookLayer, glowMaterial, Mirror, RenderView, NavGrid } from '../engine.js';
import { Place, circleBlocked } from './place.js';
import { buildAny } from '../art/build.js';
import { ROOMS } from '../data/rooms.js';
import { ITEMS } from '../data/items.js';
import { CRITTER_DEFS } from '../art/critter.js';
import { Actor } from '../actors/rig.js';
import { NEIGHBOURS } from '../data/neighbours.js';
import { dailyStock, mothwickStock } from '../systems/shop.js';
import { FISH_LEN } from '../data/fish.js';
import { FISH } from '../data/fish.js';
import { BUGS } from '../data/bugs.js';
import { FOSSILS } from '../data/fossils.js';
import { ART } from '../data/art.js';
import { paintingMaterial } from '../art/paintings.js';

const { BoxGeometry, Group, Mesh, PlaneGeometry, Vector3 } = THREE;
const ROOM_OX = 1000;
const WALL_H = 3.0;

function surfaceMesh(w, d, texId) {
  const g = new PlaneGeometry(w, d).rotateX(-Math.PI / 2);
  const uv = g.attributes.uv.array;
  for (let i = 0; i < uv.length; i += 2) { uv[i] *= w / 2; uv[i + 1] *= d / 2; }
  const m = new Mesh(g, toonMaterial(PALETTE.white, { map: textureMap(texId) }));
  m.receiveShadow = true;
  return m;
}
function wallMesh(len, texId, axis) {
  const g = new PlaneGeometry(len, WALL_H);
  const uv = g.attributes.uv.array;
  for (let i = 0; i < uv.length; i += 2) { uv[i] *= len / 4; uv[i + 1] *= WALL_H / 4; }
  const m = new Mesh(g, toonMaterial(PALETTE.white, { map: textureMap(texId) }));
  m.receiveShadow = true;
  if (axis === 'w') m.rotation.y = Math.PI / 2;
  return m;
}
const build = (id, o = {}) => {
  const obj = buildAny(id, o).object;
  obj.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return obj;
};
const box = (w, h, d, c) => { const m = new Mesh(new BoxGeometry(w, h, d), toonMaterial(typeof c === 'string' ? PALETTE[c] : c)); m.castShadow = true; m.receiveShadow = true; return m; };

export class RoomPlace extends Place {
  constructor(g, id, def) {
    super(id, 'room', { ox: ROOM_OX, oz: 0, name: def.name });
    this.g = g;
    this.def = def;
    this.w = def.w; this.d = def.d;
    this.camZoom = def.w > 10 ? 1.55 : def.w > 7 ? 1.75 : 2.0;
    this.music = def.music ?? null;
    this.owner = def.owner ?? null;
    this.ownerSpot = def.ownerSpot ?? null;
    this.lightsReq = [];
    this.dyn = new Group();
    this.group.add(this.dyn);
    this.items = [];
    this.movers = [];
    this.actors = new Map();
    this.built = false;
    this.group.visible = false;
  }
  keepVisible() { return false; }
  surfaceAt() { const f = this.def.floor ?? ''; return f.includes('carpet') || f.includes('moss') || f.includes('shag') ? 'stepGrass' : f.includes('marble') || f.includes('chess') || f.includes('kitchen') ? 'stepStone' : 'stepWood'; }
  height() { return 0; }
  ensureSolid() { this.solid = new Uint8Array(this.w * this.d); }
  markSolid(x, z, sw, sd) {
    const x0 = Math.max(0, Math.floor(x - sw / 2 + 0.01)), z0 = Math.max(0, Math.floor(z - sd / 2 + 0.01));
    for (let j = z0; j < Math.min(this.d, z0 + sd); j++) for (let i = x0; i < Math.min(this.w, x0 + sw); i++) this.solid[j * this.w + i] = 1;
  }
  blocked(x, z) {
    if (this.g.noclip) return x < 0.1 || z < 0.1 || x > this.w - 0.1 || z > this.d;
    if (x < 0.25 || z < 0.25 || x > this.w - 0.25) return true;
    const e = this.def.exit;
    if (z > this.d - 0.25) { if (!e || Math.abs(x - e.x) > 1) return true; return z > this.d + 0.2; }
    return this.solid[Math.floor(z) * this.w + Math.floor(x)] === 1;
  }
  // ---- building ------------------------------------------------------------------------------------
  buildShell(wallTex, floorTex) {
    if (this.shell) this.shell.removeFromParent();
    const s = new Group();
    const f = surfaceMesh(this.w, this.d, floorTex);
    f.position.set(this.w / 2, 0, this.d / 2);
    s.add(f);
    const under = box(this.w + 0.4, 0.3, this.d + 0.4, 'ink');
    under.position.set(this.w / 2, -0.17, this.d / 2);
    s.add(under);
    const n = wallMesh(this.w, wallTex, 'n');
    n.position.set(this.w / 2, WALL_H / 2, 0.01);
    s.add(n);
    const wWall = wallMesh(this.d, wallTex, 'w');
    wWall.position.set(0.01, WALL_H / 2, this.d / 2);
    s.add(wWall);
    const skirting = (len, axis) => { const m = box(axis === 'n' ? len : 0.1, 0.22, axis === 'n' ? 0.1 : len, 'plum'); m.position.set(axis === 'n' ? len / 2 : 0.05, 0.11, axis === 'n' ? 0.05 : len / 2); return m; };
    s.add(skirting(this.w, 'n'), skirting(this.d, 'w'));
    const top = (len, axis) => { const m = box(axis === 'n' ? len : 0.3, 0.1, axis === 'n' ? 0.3 : len, 'night'); m.position.set(axis === 'n' ? len / 2 : -0.15, WALL_H + 0.05, axis === 'n' ? -0.15 : len / 2); return m; };
    s.add(top(this.w + 0.3, 'n'), top(this.d + 0.3, 'w'));
    // back shells so the cutaway reads as solid from the camera's side
    const bn = box(this.w + 0.3, WALL_H, 0.3, 'night'); bn.position.set(this.w / 2, WALL_H / 2, -0.15); s.add(bn);
    const bw = box(0.3, WALL_H, this.d + 0.3, 'night'); bw.position.set(-0.15, WALL_H / 2, this.d / 2); s.add(bw);
    // mat at the way out
    const e = this.def.exit;
    if (e) {
      const mat = box(1.6, 0.03, 0.6, 'orange');
      mat.position.set(e.x, 0.02, this.d - 0.3);
      s.add(mat);
    }
    // doors on the back walls
    for (const door of this.def.doors ?? []) {
      const frame = box(door.wall === 'n' ? 1.3 : 0.06, 2.2, door.wall === 'n' ? 0.06 : 1.3, 'plum');
      frame.position.set(door.wall === 'n' ? door.x : 0.04, 1.1, door.wall === 'n' ? 0.04 : door.z);
      const leaf = box(door.wall === 'n' ? 1.05 : 0.08, 2.0, door.wall === 'n' ? 0.08 : 1.05, 'ink');
      leaf.position.set(door.wall === 'n' ? door.x : 0.05, 1.0, door.wall === 'n' ? 0.05 : door.z);
      s.add(frame, leaf);
    }
    this.shell = s;
    this.group.add(s);
  }
  placeProp(p, parent = this.group) {
    const o = build(p.m, { params: p.params, palette: p.palette, seed: p.seed });
    o.position.set(p.x, p.y ?? 0, p.z);
    o.rotation.y = ((p.rot ?? 0) * Math.PI) / 180;
    if (p.scale) o.scale.setScalar(p.scale);
    parent.add(o);
    return o;
  }
  buildProps() {
    this.ensureSolid();
    if (this.propsGroup) this.propsGroup.removeFromParent();
    this.propsGroup = new Group();
    this.group.add(this.propsGroup);
    this.interactList = [];
    this.lamps = [];
    for (const p of this.def.props ?? []) {
      this.placeProp(p, this.propsGroup);
      if (p.solid) this.markSolid(p.x, p.z, p.solid[0], p.solid[1]);
      if (p.act) this.interactList.push({ id: `${p.act}:${p.x},${p.z}`, x: p.x, z: p.z, r: p.r ?? 1.3, label: p.label ?? 'Look', act: p.act, prop: p, talkTo: p.talkTo });
      if (p.light) this.lamps.push({ x: p.x, z: p.z, y: (p.y ?? 0) + 1.7 });
    }
    if (this.def.corkboard) {
      const cb = box(2.4, 1.4, 0.05, 'orange'); cb.position.set(2.4, 1.7, 0.05); this.propsGroup.add(cb);
      for (const [x, y, c] of [[1.6, 2.1, 'white'], [2.2, 1.5, 'sand'], [2.9, 2.0, 'white'], [3.2, 1.4, 'mist'], [1.9, 1.3, 'sand']]) { const n = box(0.34, 0.26, 0.04, c); n.position.set(x, y, 0.09); this.propsGroup.add(n); }
      const string = (x0, y0, x1, y1) => { const len = Math.hypot(x1 - x0, y1 - y0); const m = box(len, 0.03, 0.03, 'red'); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0.12); m.rotation.z = Math.atan2(y1 - y0, x1 - x0); this.propsGroup.add(m); };
      string(1.6, 2.1, 2.2, 1.5); string(2.2, 1.5, 2.9, 2.0); string(2.9, 2.0, 3.2, 1.4); string(1.9, 1.3, 3.2, 1.4); string(1.6, 2.1, 2.9, 2.0);
    }
    if (this.def.host) this.buildHost();
    this.built = true;
  }
  buildHost() {
    const h = this.def.host;
    if (this.host) return;
    const a = new Actor(CRITTER_DEFS[h.id], { name: h.id, seed: h.id.length });
    a.x = h.x; a.z = h.z; a.facing = h.face ?? 0;
    a.addTo(this.group);
    this.host = a;
    this.hostId = h.id;
    this.actors.set(h.id, a);
    // A host you can talk to directly when no counter prop does it.
    if (!(this.def.props ?? []).some((p) => p.talkTo === h.id)) this.interactList.push({ id: `host:${h.id}`, x: h.x, z: h.z, r: 1.5, label: `Talk to ${hostName(h.id)}`, act: 'hostTalk', talkTo: h.id });
  }
  hostActor(id) { return this.actors.get(id) ?? null; }
  enter(g) {
    if (!this.built) { this.buildShell(this.def.wall, this.def.floor); this.buildProps(); }
    this.refreshDynamic();
    this.lightsReq = (this.lamps ?? []).map((l) => g.ctx.lights.request({ position: [l.x + ROOM_OX, l.y, l.z], color: 0xffd9a0, intensity: 7, radius: 7 }));
  }
  leave() {
    for (const l of this.lightsReq) l.release();
    this.lightsReq = [];
  }
  /** Mouse players and tests walk rooms by pathfinding, like the village. */
  syncNav() {
    this.nav = new NavGrid(this.w, this.d, { cell: 1, origin: [0, 0, 0] });
    for (let z = 0; z < this.d; z++) for (let x = 0; x < this.w; x++) this.nav.setOpen(x, z, !this.solid[z * this.w + x]);
  }
  refreshDynamic() {
    const g = this.g;
    this.dyn.clear();
    this.dynInteract = [];
    this.movers.length = 0;
    this.ownerNow = null;
    const def = this.def;
    if (this.id === 'store') this.buildStock(dailyStock(g), def.stockSlots);
    if (this.id === 'mothwick') this.buildStock(mothwickStock(g), def.stockSlots);
    if (def.wing) this.buildWing(def.wing);
    if (this.id === 'house_rocco') this.applyRoccoHouse();
    if (def.easels) this.buildEasels();
    if (this.id === 'auction') this.buildLot();
    this.syncNav();
  }
  applyRoccoHouse() {
    const g = this.g;
    const gone = g.world.npcs.rocco.moved !== 'here';
    this.owner = gone ? 'fitch' : 'rocco';
    const leaving = g.world.npcs.rocco.moved === 'here' && g.world.flags.roccoBoxes;
    if (gone || leaving) {
      const spots = [[1, 3], [2.2, 4.4], [5, 1.2], [4.6, 4.6], [1.1, 1.6], [3.4, 4.8]];
      for (const [x, z] of spots) { const b = build('kenney-furniture/cardboard-box-closed', { palette: { wood: 'sand', woodDark: 'orange' } }); b.position.set(x, 0, z); b.scale.setScalar(1.5); b.rotation.y = x; this.dyn.add(b); }
    }
  }
  buildStock(stock, slots) {
    const g = this.g;
    stock.forEach((s, i) => {
      if (i >= slots.length) return;
      const [x, z] = slots[i];
      const onShelf = this.nearShelf(x, z);
      const it = ITEMS[s.id];
      const prop = stockProp(s.id);
      prop.position.set(x, onShelf ? 1.15 : 0, z);
      this.dyn.add(prop);
      if (!onShelf) this.markSolid(x, z, 1, 1);
      this.dynInteract.push({ id: `stock:${i}`, x, z, r: 1.35, label: `Look at ${it.name}`, act: 'stockLook', stock: s, index: i, mesh: prop });
    });
  }
  nearShelf(x, z) { return (this.def.props ?? []).some((p) => p.m === 'shelf' && Math.abs(p.z - z) < 1 && Math.abs(p.x - x) < 2.2 && (p.rot ? Math.abs(p.x - x) < 0.5 : Math.abs(p.z - z) < 0.5)); }
  buildEasels() {
    const g = this.g;
    const stock = g.life.magdaStock();
    this.def.easels.forEach(([x, z], i) => {
      const s = stock[i];
      if (!s) return;
      this.markSolid(x, z, 1, 1);
      const easel = new Group();
      easel.position.set(x, 0, z);
      const legs = box(0.08, 1.4, 0.08, 'plum'); legs.position.set(0, 0.7, 0); easel.add(legs);
      const canvas = new Mesh(new BoxGeometry(1.12, 0.86, 0.05), paintingMaterial(s.id));
      canvas.position.set(0, 1.4, 0.05);
      easel.add(canvas);
      const frame = box(1.24, 0.98, 0.04, 'sand'); frame.position.set(0, 1.4, 0.02); easel.add(frame);
      easel.rotation.y = 0.5;
      this.dyn.add(easel);
      this.dynInteract.push({ id: `easel:${i}`, x, z, r: 1.5, label: `Look at ${ITEMS[s.id].name}`, act: 'magdaLook', stock: s });
    });
  }
  buildLot() {
    const lot = this.g.life.auctionLot?.();
    if (!lot) return;
    const it = ITEMS[lot.id];
    const p = stockProp(lot.id);
    p.position.set(5, 0.6, 2.6);
    this.dyn.add(p);
  }
  // ---- Museum wings: every donation appears in place --------------------------------------------------
  buildWing(wing) {
    const g = this.g;
    const m = g.world.museum[wing];
    const addLook = (x, z, id, name, line) => this.dynInteract.push({ id: `wing:${id}`, x, z, r: 1.3, label: `Look at ${name}`, act: 'museumLook', lookName: name, line });
    if (wing === 'fish') {
      const slots = wingSlots(FISH.length, this.w, this.d);
      FISH.forEach((f, i) => {
        const [x, z] = slots[i];
        const t = build('tank', { params: { w: 1.2 } });
        t.position.set(x, 0, z);
        this.dyn.add(t);
        this.markSolid(x, z, 1, 1);
        if (m[f.id]) {
          const fm = build('fish', { params: { len: Math.max(0.2, FISH_LEN[f.size] * 0.6) }, palette: { body: f.color } });
          fm.position.set(x, 1, z);
          this.dyn.add(fm);
          this.movers.push({ o: fm, kind: 'swim', cx: x, cz: z, cy: 0.98, t: i * 1.3, r: 0.32 });
          addLook(x, z, f.id, f.name, f.line);
        } else {
          this.dynInteract.push({ id: `wing:${f.id}`, x, z, r: 1.3, label: 'Empty tank', act: 'museumLook', lookName: 'An empty tank', line: 'A little brass plate says this one is expected. Dr. Quill has drawn a very hopeful fish on it.' });
        }
      });
    } else if (wing === 'bug') {
      const slots = wingSlots(BUGS.length, this.w, this.d);
      BUGS.forEach((b, i) => {
        const [x, z] = slots[i];
        const t = build('tank', { params: { w: 1.0 }, palette: { water: 'green', frame: 'plum', sand: 'teal', top: 'plum' } });
        t.position.set(x, 0, z);
        this.dyn.add(t);
        this.markSolid(x, z, 1, 1);
        if (m[b.id]) {
          const fm = b.kind === 'flier' ? build('winged', { params: { size: 0.34 }, palette: { wing: b.color === 'white' ? 'white' : b.color, spot: 'ink' } }) : build('bug', { params: { size: 0.24 }, palette: { body: b.color } });
          fm.position.set(x, 1, z);
          this.dyn.add(fm);
          this.movers.push({ o: fm, kind: b.kind === 'flier' ? 'flutter' : 'crawl', cx: x, cz: z, cy: 0.98, t: i, r: 0.24 });
          addLook(x, z, b.id, b.name, b.line);
        } else this.dynInteract.push({ id: `wing:${b.id}`, x, z, r: 1.3, label: 'Empty case', act: 'museumLook', lookName: 'An empty case', line: "Dr. Quill's note reads: 'something small, I think. Possibly with legs.'" });
      });
    } else if (wing === 'fossil') {
      const layout = { moatSkull: [3, 2], moatTorso: [4.8, 2], moatTail: [6.6, 2], regretSkull: [3, 5.4], regretNeck: [4.8, 5.4], regretTorso: [6.6, 5.4], trilobite: [9.8, 1.6], ammonite: [9.8, 3.2], amberFly: [9.8, 4.8], mysteryTooth: [9.8, 6.4] };
      FOSSILS.forEach((f) => {
        const [x, z] = layout[f.id];
        const pl = build('plinth');
        pl.position.set(x, 0, z);
        pl.scale.set(f.set ? 1.6 : 1, 1, 1.4);
        this.dyn.add(pl);
        this.markSolid(x, z, 2, 1);
        if (m[f.id]) {
          const bone = build(f.model);
          bone.position.set(x, 0.58, z);
          if (f.set) bone.rotation.y = Math.PI / 2;
          this.dyn.add(bone);
          addLook(x, z, f.id, f.name, f.line);
        } else this.dynInteract.push({ id: `wing:${f.id}`, x, z, r: 1.4, label: 'Empty plinth', act: 'museumLook', lookName: 'An empty plinth', line: 'It says "COMING SOON" in very small, very hopeful letters.' });
      });
    } else if (wing === 'art') {
      const spots = [[2, 0.1, 'n'], [4.5, 0.1, 'n'], [7, 0.1, 'n'], [9.5, 0.1, 'n'], [0.1, 2, 'w'], [0.1, 4.2, 'w'], [0.1, 6.4, 'w'], [0.1, 8.4, 'w']];
      ART.forEach((a, i) => {
        const [x, z, side] = spots[i];
        const frame = box(side === 'n' ? 1.6 : 0.06, 1.3, side === 'n' ? 0.06 : 1.6, 'sand');
        frame.position.set(x, 1.8, z);
        this.dyn.add(frame);
        if (m[a.id]) {
          const pic = new Mesh(new BoxGeometry(side === 'n' ? 1.4 : 0.04, 1.08, side === 'n' ? 0.04 : 1.4), paintingMaterial(a.id));
          pic.position.set(side === 'n' ? x : x + 0.04, 1.8, side === 'n' ? z + 0.04 : z);
          this.dyn.add(pic);
          addLook(side === 'n' ? x : 1, side === 'n' ? 1 : z, a.id, a.name, a.line);
        } else {
          const pic = box(side === 'n' ? 1.4 : 0.04, 1.08, side === 'n' ? 0.04 : 1.4, 'night');
          pic.position.set(side === 'n' ? x : x + 0.04, 1.8, side === 'n' ? z + 0.04 : z);
          this.dyn.add(pic);
        }
      });
    }
    if (g.world.museum.plaques[wing]) {
      const plaque = box(1.2, 0.5, 0.06, 'sand');
      plaque.position.set(this.w - 1.2, 2.3, 0.1);
      this.dyn.add(plaque);
    }
  }
  /** Fish swim, bugs flutter, hosts idle. */
  update(dt, t) {
    for (const m of this.movers) {
      m.t += dt;
      if (m.kind === 'swim') {
        m.o.position.x = m.cx + Math.sin(m.t * 0.7) * m.r;
        m.o.position.z = m.cz + Math.sin(m.t * 1.3) * 0.1;
        m.o.position.y = m.cy + Math.sin(m.t * 1.1) * 0.06;
        m.o.rotation.y = Math.cos(m.t * 0.7) > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else if (m.kind === 'flutter') {
        m.o.position.x = m.cx + Math.sin(m.t * 1.3) * m.r;
        m.o.position.z = m.cz + Math.cos(m.t * 1.7) * 0.1;
        m.o.position.y = m.cy + Math.abs(Math.sin(m.t * 2.3)) * 0.22;
        const wl = m.o.getObjectByName('WingL'), wr = m.o.getObjectByName('WingR');
        if (wl) wl.rotation.z = Math.sin(m.t * 22) * 0.8;
        if (wr) wr.rotation.z = -Math.sin(m.t * 22) * 0.8;
      } else if (m.kind === 'crawl') {
        m.o.position.x = m.cx + Math.sin(m.t * 0.4) * m.r;
      }
    }
    for (const a of this.actors.values()) {
      if (!a.current || a.finished) a.play('Idle', 0.2);
      a.update(dt);
    }
    this.extraUpdate?.(dt, t);
  }
  interactables() {
    const out = [...(this.interactList ?? []), ...(this.dynInteract ?? [])];
    const e = this.def.exit;
    for (const door of this.def.doors ?? []) out.push({ id: `door:${door.to}`, x: door.wall === 'n' ? door.x : 0.8, z: door.wall === 'n' ? 0.8 : door.z, r: 1.3, label: `To the ${door.label}`, act: 'roomDoor', door });
    return out;
  }
}
const hostName = (id) => ({ gander: 'Mrs. Gander', clementine: 'Clementine', quill: 'Dr. Quill', mothwick: 'Madame Mothwick', fleece: 'Monsieur Fleece', flavia: 'Flavia Rosé', magda: 'Magda', bellows: 'Sir Reginald', pemberton: 'Pemberton', brisket: 'Agent Brisket', lou: 'Languid Lou', nibbles: 'Madame Nibbles' }[id] ?? id);
function wingSlots(n, w, d) {
  const out = [];
  for (let x = 1.5; x < w - 0.5 && out.length < n; x += 1.5) out.push([x, 0.9]);
  for (let z = 2.4; z < d - 1.5 && out.length < n; z += 1.5) out.push([0.9, z]);
  for (let z = 2.4; z < d - 1.5 && out.length < n; z += 1.5) out.push([w - 0.9, z]);
  for (let x = 3.2; x < w - 2 && out.length < n; x += 1.5) out.push([x, 4.2]);
  for (let x = 3.2; x < w - 2 && out.length < n; x += 1.5) out.push([x, 6.0]);
  return out;
}
/** A small object standing for a stock item. */
export function stockProp(id) {
  const it = ITEMS[id];
  const g = new Group();
  const c = it?.iconColors?.o ?? 'sand';
  const add = (m, y = 0) => { m.position.y += y; g.add(m); return m; };
  switch (it?.cat) {
    case 'furniture': {
      const o = build(it.model, { palette: it.palette ?? undefined, params: it.params });
      const f = Math.max(it.w, it.d);
      const s = 0.62 / Math.max(1, f * 0.7);
      o.scale.setScalar(s);
      add(o);
      break;
    }
    case 'clothes': { const b = box(0.5, 0.52, 0.2, it.shirt); add(b, 0.45); const t = box(0.22, 0.08, 0.21, it.trim); add(t, 0.7); const stand = box(0.06, 0.2, 0.06, 'plum'); add(stand, 0.1); const arm = box(0.72, 0.16, 0.2, it.shirt); add(arm, 0.6); break; }
    case 'hat': { const b = box(0.36, 0.24, 0.36, it.hatColor); add(b, 0.32); add(box(0.56, 0.05, 0.56, it.hatColor), 0.2); add(box(0.1, 0.2, 0.1, 'plum'), 0.1); break; }
    case 'glasses': { add(box(0.5, 0.14, 0.04, it.glassesColor === 'white' ? 'mist' : it.glassesColor), 0.3); add(box(0.08, 0.2, 0.08, 'plum'), 0.1); break; }
    case 'umbrella': { add(box(0.08, 0.7, 0.08, it.b), 0.35); add(box(0.5, 0.1, 0.5, it.a), 0.7); break; }
    case 'wall': { add(box(0.5, 0.26, 0.26, 'sand'), 0.13); add(box(0.52, 0.04, 0.28, 'orange'), 0.14); break; }
    case 'floor': { add(box(0.56, 0.14, 0.44, 'orange'), 0.07); add(box(0.56, 0.02, 0.44, 'plum'), 0.15); break; }
    case 'tool': { const m = { net: 'tool-net', rod: 'tool-rod', shovel: 'tool-shovel', axe: 'tool-axe', can: 'tool-can', slingshot: 'tool-slingshot' }[id]; const o = build(m); o.rotation.z = 0.5; o.position.y = 0.3; g.add(o); break; }
    case 'seed': { add(box(0.26, 0.34, 0.08, c), 0.17); add(box(0.26, 0.08, 0.09, 'white'), 0.26); break; }
    case 'cheese': { const o = build('cheese-wheel'); add(o); break; }
    case 'plant': { const o = build('sapling', { params: { stage: 0 } }); o.scale.setScalar(0.7); add(o); break; }
    default: { add(box(0.3, 0.3, 0.3, c), 0.15); add(box(0.32, 0.08, 0.1, it?.iconColors?.x ?? 'orange'), 0.2); break; }
  }
  return g;
}
export { circleBlocked, setLookLayer, glowMaterial, Mirror, RenderView, Vector3, NEIGHBOURS };
