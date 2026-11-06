// Your home: rooms by tier, real furniture on a 1 m grid, lamps, stereo, TV, mirror, fish tank.
import { THREE, toonMaterial, PALETTE, Mirror, RenderView } from '../engine.js';
import { RoomPlace } from './rooms.js';
import { ITEMS } from '../data/items.js';
import { buildAny } from '../art/build.js';
import { BUILDINGS } from '../data/town.js';
import { FISH_LEN } from '../data/fish.js';

const { Group, Mesh, BoxGeometry, Vector3 } = THREE;
const HOME_DOOR = BUILDINGS.find((b) => b.id === 'home').door;
export const HOME_SIZES = { 1: { main: [6, 6] }, 2: { main: [8, 8] }, 3: { main: [8, 8], annex: [6, 6] }, 4: { main: [8, 8], annex: [6, 6], upstairs: [8, 8] } };
const roomKey = (id) => (id === 'home' ? 'main' : id.replace('home_', ''));

export class HomeRoom extends RoomPlace {
  constructor(g, id) {
    const key = roomKey(id);
    const def = { name: 'Your Home', wall: 'wall-plaster', floor: 'floor-oak', w: 8, d: 8, props: [], home: true };
    super(g, id, def);
    this.key = key;
    this.music = (gg) => gg.world.home.stereo ? gg.world.home.stereo : gg.world.home.dust?.length ? null : null;
  }
  get roomData() { return this.g.world.home.rooms[this.key]; }
  keepVisible(old) { return old === this.g.town && this.hasFunc('tv'); }
  hasFunc(f) { return this.roomData.items.some((i) => ITEMS[i.id]?.func === f); }
  rebuild() {
    const g = this.g;
    const tier = g.world.player.homeTier;
    const size = HOME_SIZES[tier][this.key] ?? [6, 6];
    this.w = size[0]; this.d = size[1];
    this.camZoom = this.w > 6 ? 1.75 : 2.0;
    const e = this.key === 'main' ? { x: this.w / 2, z: this.d - 0.5, to: 'town', tx: HOME_DOOR[0], tz: HOME_DOOR[1] + 0.6, facing: 0 } : this.key === 'annex' ? { x: this.w / 2, z: this.d - 0.5, to: 'home', tx: 1.1, tz: 2, facing: 1.57 } : { x: this.w / 2, z: this.d - 0.5, to: 'home', tx: 6.8, tz: 2, facing: 0 };
    this.def.exit = e;
    this.def.w = this.w; this.def.d = this.d;
    const rd = this.roomData;
    this.def.wall = rd.wall; this.def.floor = rd.floor;
    this.buildShell(rd.wall, rd.floor);
    this.ensureSolid();
    this.interactList = [];
    if (this.key === 'main' && tier >= 3) this.interactList.push({ id: 'toAnnex', x: 0.8, z: 2, r: 1.2, label: 'To the annex', act: 'roomDoor', door: { to: 'home_annex', tx: 3, tz: 5, label: 'annex' } });
    if (this.key === 'main' && tier >= 4) this.interactList.push({ id: 'toUp', x: 6.8, z: 0.8, r: 1.2, label: 'Upstairs', act: 'roomDoor', door: { to: 'home_upstairs', tx: 4, tz: 7, label: 'upstairs' } });
    if (this.key === 'main' && tier >= 3) { const f = new Mesh(new BoxGeometry(0.06, 2.2, 1.3), toonMaterial(PALETTE.plum)); f.position.set(0.04, 1.1, 2); this.shell.add(f); }
    if (this.key === 'main' && tier >= 4) { const st = buildAny('kenney-furniture/stairs', { palette: { wood: 'orange', woodDark: 'red' } }).object; st.scale.setScalar(0.5); st.position.set(6.8, 0, 0.5); this.shell.add(st); this.markSolid(6.8, 0.5, 2, 1); }
    this.placeItems();
    this.built = true;
  }
  placeItems() {
    const g = this.g;
    if (this.itemsGroup) this.itemsGroup.removeFromParent();
    this.itemsGroup = new Group();
    this.group.add(this.itemsGroup);
    this.lamps = [];
    this.ensureSolid();
    this.stopMirrors();
    this.itemViews = new Map();
    this.funcItems = [];
    for (const item of this.roomData.items) this.addItemView(item);
    this.syncNav();
    this.unstickPlayer();
  }
  /** Furniture never traps you: step to the nearest open floor. */
  unstickPlayer() {
    const p = this.g.player;
    if (this.g.place !== this || !this.blocked(p.x, p.z)) return;
    let best = null, bd = 1e9;
    for (let z = 0; z < this.d; z++) for (let x = 0; x < this.w; x++) {
      if (this.solid[z * this.w + x]) continue;
      const d = Math.hypot(x + 0.5 - p.x, z + 0.5 - p.z);
      if (d < bd) { bd = d; best = [x + 0.5, z + 0.5]; }
    }
    if (best) { p.x = best[0]; p.z = best[1]; }
  }
  addItemView(item) {
    const it = ITEMS[item.id];
    if (!it) return;
    const o = buildAny(it.model, { palette: it.palette ?? undefined, params: it.params }).object;
    o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    const rotated = item.rot % 2 === 1;
    const w = rotated ? it.d : it.w, d = rotated ? it.w : it.d;
    o.position.set(item.x + w / 2, 0, item.z + d / 2);
    o.rotation.y = (item.rot * Math.PI) / 2;
    const group = new Group();
    group.add(o);
    this.itemsGroup.add(group);
    this.itemViews.set(item, group);
    if (!it.flat) for (let z = item.z; z < item.z + d; z++) for (let x = item.x; x < item.x + w; x++) if (x >= 0 && z >= 0 && x < this.w && z < this.d) this.solid[z * this.w + x] = 1;
    if (it.func) {
      this.funcItems.push({ item, it, x: item.x + w / 2, z: item.z + d / 2, w, d, o, group });
      if (it.func === 'tank' || it.func === 'cage') this.addCreatures(item, group, item.x + w / 2, item.z + d / 2);
      if (it.func === 'tv') this.attachTV(item, group, item.x + w / 2, item.z + d / 2);
      if (it.func === 'mirror') this.attachMirror(item, group, item.x + w / 2, item.z + d / 2);
    }
  }
  addCreatures(item, group, cx, cz) {
    const list = this.g.world.home[item.id === 'fishTank' ? 'tankFish' : 'cageBugs'];
    let i = 0;
    for (const id of Object.keys(list)) {
      const e = ITEMS[id];
      const m = item.id === 'fishTank' ? buildAny('fish', { params: { len: Math.max(0.2, FISH_LEN[e.size ?? 'S'] * 0.5) }, palette: { body: e.color } }).object : buildAny('bug', { params: { size: 0.2 }, palette: { body: e.color } }).object;
      m.position.set(cx, 0.9, cz);
      group.add(m);
      this.movers.push({ o: m, kind: item.id === 'fishTank' ? 'swim' : 'crawl', cx, cz, cy: 0.9, t: i++ * 1.7, r: 0.45 });
    }
  }
  attachTV(item, group, cx, cz) {
    const g = this.g;
    if (!this.tvView) {
      this.tvView = new RenderView({ size: [64, 40], fov: 42, every: 3 });
      this.tvView.camera.position.set(24, 7, 52);
      this.tvView.camera.lookAt(24, 0.6, 38);
    }
    const screen = new Mesh(new BoxGeometry(0.5, 0.34, 0.02), this.tvView.screenMaterial());
    screen.position.set(cx, 0.36, cz + 0.28);
    RenderView.screen(screen);
    group.add(screen);
    this.tvScreen = screen;
  }
  attachMirror(item, group, cx, cz) {
    const m = new Mirror({ size: [0.8, 1.6], tintAmount: 0.12 });
    m.mesh.position.set(cx, 1.0, cz + 0.2);
    group.add(m.mesh);
    this.mirrors = this.mirrors ?? [];
    this.mirrors.push(m);
  }
  stopMirrors() {
    for (const s of this.mirrorStops ?? []) s();
    this.mirrorStops = [];
    if (this.tvStop) { this.tvStop(); this.tvStop = null; }
    for (const m of this.mirrors ?? []) m.dispose();
    this.mirrors = [];
    this.movers = [];
  }
  attachViews() {
    const g = this.g;
    for (const m of this.mirrors ?? []) this.mirrorStops.push(m.attach(g.engine.renderer, g.ctx.scene));
    if (this.tvView && this.hasFunc('tv')) { this.tvStop = this.tvView.attach(g.engine.renderer, g.ctx.scene); g.town.group.visible = true; }
  }
  enter(g) {
    this.rebuild();
    this.syncLamps();
    this.attachViews();
    this.buildDust();
  }
  leave(g) {
    this.stopMirrors();
    for (const l of this.lightsReq) l.release();
    this.lightsReq = [];
    if (this.key === 'main' || this.g.place?.kind !== 'room') this.g.town.group.visible = false;
  }
  buildDust() {
    const g = this.g;
    if (this.key !== 'main') return;
    if (this.dustGroup) this.dustGroup.removeFromParent();
    this.dustGroup = new Group();
    this.group.add(this.dustGroup);
    this.dust = [];
    for (const d of g.world.home.dust) {
      const m = new Mesh(new BoxGeometry(0.3, 0.2, 0.3), toonMaterial(PALETTE.mist));
      const eye = new Mesh(new BoxGeometry(0.05, 0.05, 0.02), toonMaterial(PALETTE.ink));
      eye.position.set(0.06, 0.04, 0.16);
      m.add(eye);
      m.position.set(d.x, 0.14, d.z);
      this.dustGroup.add(m);
      this.dust.push({ d, m, t: d.x });
    }
  }
  syncLamps() {
    const g = this.g;
    for (const l of this.lightsReq) l.release();
    this.lightsReq = [];
    for (const f of this.funcItems ?? []) {
      if (f.it.func === 'lamp' && f.item.on !== false) {
        const col = f.it.palette?.lamp === 'cyan' ? 0x73eff7 : f.it.palette?.lamp === 'lime' ? 0xa7f070 : 0xffd9a0;
        this.lightsReq.push(g.ctx.lights.request({ position: [f.x + 1000, 1.6, f.z], color: col, intensity: 8, radius: 7 }));
      }
    }
  }
  /** The room as seen by the interact system. */
  interactables() {
    const out = [...this.interactList];
    const g = this.g;
    for (const f of this.funcItems ?? []) {
      const lab = { lamp: f.item.on === false ? 'Turn the lamp on' : 'Turn the lamp off', seat: `Sit on ${f.it.name}`, bed: 'Go to bed', stereo: 'Stereo', tv: 'Watch the plaza', mirror: 'Mirror', tank: 'Fish tank', cage: 'Bug cage', clock: 'Check the clock', toilet: 'Flush', plant: 'Water the plant', rug: null }[f.it.func];
      if (lab) out.push({ id: `fn:${f.item.id}:${f.x},${f.z}`, x: f.x, z: f.z, r: 0.9 + Math.max(f.w, f.d) / 2, label: lab, act: 'furniture', furn: f });
    }
    if (g.world.player.homeTier >= 1 && this.key === 'main') {
      out.push({ id: 'placement', x: this.w - 1, z: this.d - 1.6, r: 1.2, label: 'Arrange furniture', act: 'arrange' });
    }
    return out;
  }
  extraUpdate(dt, t) {
    if (!this.dust) return;
    const p = this.g.player;
    for (const b of this.dust) {
      b.t += dt;
      const dx = b.d.x - p.x, dz = b.d.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.42 && !b.gone) {
        b.gone = true;
        b.m.removeFromParent();
        this.g.world.home.dust.splice(this.g.world.home.dust.indexOf(b.d), 1);
        this.g.sound('bonk');
        this.g.ctx.particles.burst('dust', [b.d.x + 1000, 0.2, b.d.z], { count: 6 });
        this.g.events.emit('dustStomped', {});
        continue;
      }
      if (b.gone) continue;
      if (dist < 2.2 && dist > 0.01) {
        b.d.x = Math.max(0.5, Math.min(this.w - 0.5, b.d.x + (dx / dist) * dt * 1.6));
        b.d.z = Math.max(0.5, Math.min(this.d - 0.8, b.d.z + (dz / dist) * dt * 1.6));
      } else {
        b.d.x = Math.max(0.5, Math.min(this.w - 0.5, b.d.x + Math.sin(b.t * 1.1) * dt * 0.3));
      }
      b.m.position.set(b.d.x, 0.14 + Math.abs(Math.sin(b.t * 7)) * 0.06, b.d.z);
    }
  }
}
export { Vector3 };
