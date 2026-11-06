// Ground, water and static scenery for the village: merged tile meshes per surface, rebuilt skins per season.
import { THREE, toonMaterial, PALETTE, WaterSurface, WAVES_CALM, setLookLayer } from '../engine.js';
import { TW, TD, T, BUILDINGS, LANDMARKS, DOCK, groundHeight, HILL, HILLS } from './townMap.js';
import { GROUND, groundMat, registerTextures } from '../art/textures.js';
import * as S from './scenery.js';
const { BufferGeometry, Float32BufferAttribute, Mesh, Group } = THREE;
const SURF = { grass: [T.GRASS], path: [T.PATH], sand: [T.SAND], plaza: [T.PLAZA], wood: [T.BRIDGE, T.DOCK] };
function quadGeo(tiles, test, scaleUV = 0.25, y = 0) {
  const pos = [], uv = [], idx = []; let n = 0;
  for (let z = 0; z < TD; z++) for (let x = 0; x < TW; x++) {
    if (!test(tiles[z * TW + x], x, z)) continue;
    pos.push(x, y + groundHeight(x, z), z, x + 1, y + groundHeight(x + 1, z), z, x + 1, y + groundHeight(x + 1, z + 1), z + 1, x, y + groundHeight(x, z + 1), z + 1); uv.push(x * scaleUV, z * scaleUV, (x + 1) * scaleUV, z * scaleUV, (x + 1) * scaleUV, (z + 1) * scaleUV, x * scaleUV, (z + 1) * scaleUV);
    idx.push(n, n + 2, n + 1, n, n + 3, n + 2); n += 4;
  }
  const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  // normals must point up
  const nrm = g.getAttribute('normal'); for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0);
  return g;
}
function bankGeo(tiles) { // vertical faces where land meets water
  const pos = [], idx = []; let n = 0; const isW = (x, z) => { if (x < 0 || z < 0 || x >= TW || z >= TD) return false; const t = tiles[z * TW + x]; return t === T.WATER || t === T.SEA; };
  const land = (x, z) => { const t = tiles[z * TW + x]; return t !== T.WATER && t !== T.SEA && t !== T.FOREST; };
  for (let z = 0; z < TD; z++) for (let x = 0; x < TW; x++) {
    if (!land(x, z)) continue; const d = 0.5;
    const face = (x0, z0, x1, z1) => { pos.push(x0, 0, z0, x1, 0, z1, x1, -d, z1, x0, -d, z0); idx.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4; };
    if (isW(x - 1, z)) face(x, z + 1, x, z); if (isW(x + 1, z)) face(x + 1, z, x + 1, z + 1); if (isW(x, z - 1)) face(x, z, x + 1, z); if (isW(x, z + 1)) face(x + 1, z + 1, x, z + 1);
  }
  const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
export class TownView {
  constructor(ctx) {
    registerTextures(); this.ctx = ctx; this.group = new Group(); this.group.name = 'town'; ctx.scene.add(this.group);
    this.treeMeshes = new Map(); this.rockMeshes = new Map(); this.flowerMeshes = new Map(); this.weedMeshes = new Map(); this.itemMeshes = new Map(); this.holeMeshes = new Map();
    this.buildings = new Map(); this.windows = []; this.lamps = []; this.season = -1; this.sway = [];
  }
  build(tiles) {
    this.tiles = tiles; const g = this.group;
    this.surf = {};
    for (const [k, list] of Object.entries(SURF)) { const m = new Mesh(quadGeo(tiles, t => list.includes(t)), groundMat('lawn1')); m.receiveShadow = true; setLookLayer(m, 'environment'); g.add(m); this.surf[k] = m; }
    const bank = new Mesh(bankGeo(tiles), toonMaterial(PALETTE.orange)); setLookLayer(bank, 'environment'); g.add(bank);
    // dark forest floor
    // cliff faces of the Lookout hill
    { const pos = [], idx = []; let n = 0;
      for (const HL of HILLS) { const H_ = HL.h; const face = (x0, z0, x1, z1) => { pos.push(x0, H_, z0, x1, H_, z1, x1, 0, z1, x0, 0, z0); idx.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4; };
        face(HL.x1, HL.z0, HL.x1, HL.z1 - 1); face(HL.x0, HL.z1 - 1, HL.x0, HL.z0); face(HL.x0, HL.z0, HL.x1, HL.z0); face(HL.x0, HL.z1 - 1, HL.rampX0, HL.z1 - 1); face(HL.rampX1, HL.z1 - 1, HL.x1, HL.z1 - 1);
        for (const x of [HL.rampX0, HL.rampX1]) { pos.push(x, H_, HL.z1 - 1, x, 0, HL.rampZ1, x, 0, HL.z1 - 1); idx.push(n, n + 1, n + 2, n, n + 2, n + 1); n += 3; } }
      const gg = new BufferGeometry(); gg.setAttribute('position', new Float32BufferAttribute(pos, 3)); gg.setIndex(idx); gg.computeVertexNormals(); const cliff = new Mesh(gg, toonMaterial(PALETTE.orange)); cliff.material.side = THREE.DoubleSide; g.add(cliff); }
    const forest = new Mesh(quadGeo(tiles, t => t === T.FOREST, 0.25, -0.02), toonMaterial(PALETTE.teal)); g.add(forest);
    this.water = new WaterSurface({ size: [TW + 20, TD + 20], at: [TW / 2, -0.3, TD / 2], waves: WAVES_CALM, deep: PALETTE.navy, shallow: PALETTE.cyan, foamAt: 9 });
    g.add(this.water); this.waterBase = -0.3;
    // forest ring trees (decor)
    const ring = new Group(); let i = 0;
    for (let z = 0; z < TD; z += 1.5) for (let x = 0; x < TW; x += 1.5) { const t = tiles[Math.floor(z) * TW + Math.floor(x)]; if (t !== T.FOREST) continue; if (((x * 7 + z * 13) | 0) % 3 !== 0) continue; const kind = i++ % 3 ? 'pine' : 'oak'; const tr = S.buildTree({ kind, stage: 3 }, 0).obj; tr.position.set(x + 0.5, 0, z + 0.5); tr.scale.setScalar(1.2 + ((i * 37) % 10) / 20); tr.userData.kind = kind; ring.add(tr); }
    g.add(ring); this.ring = ring; this.ringSpec = ring.children.map(tr => ({ x: tr.position.x, z: tr.position.z, s: tr.scale.x, k: tr.userData.kind }));
    // buildings
    const STYLE = { bus: { wall: 'sky', roof: 'blue', h: 2, chimney: false }, hall: { wall: 'white', roof: 'teal', h: 2.8 }, museum: { wall: 'white', roof: 'orange', h: 3.4, pitch: 1.8 }, store: { wall: 'sand', roof: 'red', h: 2.6 }, mothwick: { wall: 'plum', roof: 'sky', h: 2.6 }, home: { wall: 'sand', roof: 'orange', h: 2.2 } };
    const CCOL = { dorrit: ['orange', 'plum'], tavi: ['sand', 'orange'], bartleby: ['slate', 'ink'], ottoline: ['plum', 'teal'], rocco: ['mist', 'red'], nib: ['night', 'navy'], ozzie: ['slate', 'plum'], yolanda: ['white', 'red'] };
    for (const b of BUILDINGS) {
      let m; if (b.kind === 'lighthouse') m = S.buildLighthouse(); else { const st = STYLE[b.kind] ?? { wall: CCOL[b.owner]?.[0] ?? 'sand', roof: CCOL[b.owner]?.[1] ?? 'red', h: 2.2 }; m = S.buildBuilding(b, st); }
      m.position.set(b.x, groundHeight(b.x + b.w / 2, b.z + b.d / 2), b.z); g.add(m); this.buildings.set(b.id, m); for (const w of m.userData.windows ?? []) this.windows.push(w);
    }
    // landmarks
    const pear = S.buildOldPear(); pear.position.set(LANDMARKS.oldPear[0] + 0.5, 0, LANDMARKS.oldPear[1] + 0.5); g.add(pear); this.oldPear = pear;
    const bell = S.buildBell(); bell.position.set(LANDMARKS.bell[0], 0, LANDMARKS.bell[1]); g.add(bell); this.bell = bell;
    const nb = S.buildNotice(); nb.position.set(LANDMARKS.notice[0], 0, LANDMARKS.notice[1]); g.add(nb);
    for (const [x, z] of LANDMARKS.lamp) { const l = S.buildLamp(); l.position.set(x + 0.5, 0, z + 0.5); g.add(l); this.lamps.push(l); }
    for (const [x, z] of LANDMARKS.bench) { const b = S.buildBench(); b.position.set(x + 0.5, 0, z + 0.5); g.add(b); }
    const lb = S.buildBench(); lb.position.set(LANDMARKS.lookoutBench[0], HILL.h, LANDMARKS.lookoutBench[1]); g.add(lb);
    const bus = S.buildBus(); bus.position.set(0.5, 0, 22.2); bus.rotation.y = Math.PI / 2; g.add(bus); this.busMesh = bus; bus.visible = false;
    const stall = S.buildStall('red'); stall.position.set(22.5, 0, 24.2); g.add(stall); this.rindStall = stall;
    // waterfall at the river's head, clothesline by the player's plot
    const wf = new Group(); S.part(wf, 'box', [5, 2.2, 1.2], [30.5, 1.1, 2.6], 'slate'); S.part(wf, 'box', [3.4, 2.0, 0.3], [30.5, 1.05, 3.3], 'cyan'); this.falls = []; for (let i = 0; i < 5; i++) { const st = S.part(wf, 'box', [0.25, 0.7, 0.12], [29.4 + i * 0.55, 1, 3.5], 'white'); this.falls.push(st); } g.add(wf);
    const cl = new Group(); S.part(cl, 'cyl', [0.1, 1.8, 0.1], [0, 0.9, 0], 'plum'); S.part(cl, 'cyl', [0.1, 1.8, 0.1], [3.2, 0.9, 0], 'plum'); S.part(cl, 'box', [3.2, 0.03, 0.03], [1.6, 1.7, 0], 'white'); [['red', 0.6], ['sky', 1.4], ['sand', 2.2]].forEach(([c, x]) => S.part(cl, 'box', [0.6, 0.7, 0.05], [x, 1.3, 0], c)); cl.position.set(41.5, 0, 36.5); g.add(cl);
    this.rainbowGroup = new Group(); ['red', 'orange', 'sand', 'green', 'sky', 'plum'].forEach((c, i) => { const t = new Mesh(new THREE.TorusGeometry(11 - i * 0.45, 0.22, 5, 28, Math.PI), new THREE.MeshBasicNodeMaterial({ color: PALETTE[c] })); t.rotation.set(0, 0, 0); this.rainbowGroup.add(t); }); this.rainbowGroup.position.set(34, -0.5, 8); this.rainbowGroup.visible = false; g.add(this.rainbowGroup);
    this.setSeason(0);
  }
  /** Festival decorations: bunting across the plaza, and light strings on the doors for the Long Night. */
  setFestival(day, season) {
    const key = day + ':' + season; if (this.festKey === key) return; this.festKey = key; if (this.fest) this.group.remove(this.fest); this.fest = null; if (day == null) return;
    const g = new Group(); const cols = ['red', 'sand', 'sky', 'lime', 'plum', 'orange'];
    const line = (x0, z0, x1, z1, n) => { for (let i = 0; i <= n; i++) { const u = i / n; const x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u; const y = 3.0 - Math.sin(u * Math.PI) * 0.5; S.part(g, 'box', [0.1, 0.1, 0.1], [x, y + 0.1, z], 'white'); S.part(g, 'cone', [0.35, 0.45, 0.35], [x, y - 0.2, z], cols[i % 6], [180, 0, 0]); } };
    line(16.5, 18.5, 26.5, 18.5, 14); line(16.5, 26.5, 26.5, 26.5, 14); line(16.5, 18.5, 16.5, 26.5, 10); line(26.5, 18.5, 26.5, 26.5, 10);
    if (season === 3) for (const b of BUILDINGS) { if (b.noDoor) continue; const lights = new Group(); for (let i = 0; i < 9; i++) { const m = new Mesh(new THREE.SphereGeometry(0.1, 5, 4), new THREE.MeshBasicNodeMaterial({ color: PALETTE[cols[i % 6]] })); m.position.set(b.x + 0.3 + i * (b.w - 0.6) / 8, 2.1 + Math.sin(i * 1.3) * 0.1, b.z + b.d + 0.15); lights.add(m); } lights.position.y = groundHeight(b.x + b.w / 2, b.z + b.d / 2); g.add(lights); }
    this.group.add(g); this.fest = g;
  }
  rainbow(on) { if (this.rainbowGroup) this.rainbowGroup.visible = on; }
  rebuildGround(tiles) { this.tiles = tiles; for (const [k, list] of Object.entries(SURF)) { const m = this.surf[k]; m.geometry.dispose(); m.geometry = quadGeo(tiles, t => list.includes(t)); } }
  setGold(on) { const b = this.bell?.userData.bell; if (b) b.traverse(o => { if (o.isMesh) o.material = S.mat(on ? 'sand' : 'orange'); }); }
  setSeason(s) {
    if (s === this.season) return; this.season = s;
    this.surf.grass.material = groundMat('lawn' + s); this.surf.path.material = groundMat('path' + s); this.surf.sand.material = groundMat('beach'); this.surf.plaza.material = groundMat('plaza'); this.surf.wood.material = groundMat('wood');
    for (const [id, tm] of this.treeMeshes) this.group.remove(tm.obj); this.treeMeshes.clear();
    this.ring.traverse(o => { if (o.isMesh && o.geometry.type !== 'CylinderGeometry') { /* ring trees recolor by name */ } });
    this.ringSeason(s);
    const pc = S.SEASON_CANOPY[s]; this.oldPear.userData.canopy.forEach((m, i) => { m.material = S.mat(pc[i]); });
    this.group.userData.season = s; for (const b of this.buildings.values()) for (const gl of b.userData.glass ?? []) gl.material = S.mat(s === 3 ? 'white' : 'sky');
  }
  ringSeason(s) { if (this.ringBuilt === s) return; this.ringBuilt = s; for (const tr of this.ring.children.slice()) { this.ring.remove(tr); } for (const sp of this.ringSpec) { const tr = S.buildTree({ kind: sp.k, stage: 3 }, s).obj; tr.position.set(sp.x, 0, sp.z); tr.scale.setScalar(sp.s); this.ring.add(tr); } }
  recolorTree(tm, s) { tm.canopies.forEach((m, i) => { m.material = S.mat(S.canopyColor(s, tm.kind, i)); }); }
  addTree(t, season) { const { obj, canopies } = S.buildTree(t, season); obj.position.set(t.x + 0.5, groundHeight(t.x + 0.5, t.z + 0.5), t.z + 0.5); this.group.add(obj); this.treeMeshes.set(t.id, { obj, canopies, kind: t.kind, stage: t.stage, fruit: t.fruit ?? 0, data: t }); return obj; }
  syncTrees(trees, season) {
    const seen = new Set();
    for (const t of trees) {
      seen.add(t.id); let tm = this.treeMeshes.get(t.id);
      if (tm && (tm.stage !== t.stage || t.felled !== tm.felled || tm.fruit !== (t.fruit ?? 0))) { this.group.remove(tm.obj); this.treeMeshes.delete(t.id); tm = null; }
      if (!tm && !t.felled) { this.addTree(t, season); tm = this.treeMeshes.get(t.id); }
      else if (!tm && t.felled && !t.stump) { /* gone */ }
      if (tm) { tm.stage = t.stage; tm.felled = t.felled; tm.fruit = t.fruit ?? 0; }
    }
    for (const [id, tm] of this.treeMeshes) if (!seen.has(id)) { this.group.remove(tm.obj); this.treeMeshes.delete(id); }
  }
  syncRocks(rocks) { for (const r of rocks) { let m = this.rockMeshes.get(r.id); if (!m && !r.gone) { m = S.buildRock(r); m.position.set(r.x + 0.5, 0, r.z + 0.5); this.group.add(m); this.rockMeshes.set(r.id, m); } if (m && r.gone) { this.group.remove(m); this.rockMeshes.delete(r.id); } } }
  syncFlowers(flowers) {
    const seen = new Set();
    flowers.forEach((f, i) => { const key = f.x + ',' + f.z; seen.add(key); const sig = [f.sp, f.col, f.wilt ? 1 : 0].join(); let m = this.flowerMeshes.get(key); if (m && m.sig !== sig) { this.group.remove(m.obj); m = null; } if (!m) { const obj = S.buildFlower(f, f.wilt); obj.position.set(f.x + 0.5, groundHeight(f.x + 0.5, f.z + 0.5), f.z + 0.5); this.group.add(obj); this.flowerMeshes.set(key, { obj, sig }); } });
    for (const [k, m] of this.flowerMeshes) if (!seen.has(k)) { this.group.remove(m.obj); this.flowerMeshes.delete(k); }
  }
  syncWeeds(weeds) { const seen = new Set(); for (const w of weeds) { const key = w.x + ',' + w.z; seen.add(key); if (!this.weedMeshes.has(key)) { const o = S.buildWeed(); o.position.set(w.x + 0.5, groundHeight(w.x + 0.5, w.z + 0.5), w.z + 0.5); this.group.add(o); this.weedMeshes.set(key, o); } } for (const [k, o] of this.weedMeshes) if (!seen.has(k)) { this.group.remove(o); this.weedMeshes.delete(k); } }
  syncHoles(holes, cracks) {
    const want = new Map(); for (const h of holes) want.set('h' + h.x + ',' + h.z, ['hole', h]); for (const c of cracks) if (!c.dug) want.set('c' + c.x + ',' + c.z, ['crack', c]);
    for (const [k, [kind, d]] of want) if (!this.holeMeshes.has(k)) { const g = new Group(); const m = new Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 8), toonMaterial(kind === 'hole' ? PALETTE.plum : PALETTE.orange)); m.position.y = 0.03; g.add(m); if (kind === 'crack') { for (let i = 0; i < 3; i++) { const l = new Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.08), toonMaterial(PALETTE.ink)); l.rotation.y = i * 1.05; l.position.y = 0.06; g.add(l); } } g.position.set(d.x + 0.5, groundHeight(d.x + 0.5, d.z + 0.5), d.z + 0.5); this.group.add(g); this.holeMeshes.set(k, g); }
    for (const [k, g] of this.holeMeshes) if (!want.has(k)) { this.group.remove(g); this.holeMeshes.delete(k); }
  }
  syncItems(items) { const seen = new Set(); for (const it of items) { seen.add(it.uid); if (!this.itemMeshes.has(it.uid)) { const o = it.kind === 'beanbag' || it.id === 'beanbag' ? S.buildBeanBag() : S.buildCheeseWheel(); if (it.id !== 'beanbag' && it.id !== 'cheese') { o.clear(); S.part(o, 'ball', [0.3, 0.3, 0.3], [0, 0.2, 0], it.id === 'pear' ? 'lime' : 'white'); } o.position.set(it.x, groundHeight(it.x, it.z), it.z); this.group.add(o); this.itemMeshes.set(it.uid, o); } } for (const [k, o] of this.itemMeshes) if (!seen.has(k)) { this.group.remove(o); this.itemMeshes.delete(k); } }
  /** Exterior per tier: home 1..4 by debt tier, store 0..2 by lifetime spend. */
  syncBuildings(w) {
    const boxes = w.day >= 7 && w.day < 9 && !w.movedOut.rocco; const key = [boxes ? 1 : 0, w.homeTier, w.shop?.lifetime >= 120000 ? 2 : w.shop?.lifetime >= 25000 ? 1 : 0, w.flags?.mailFlag ? 1 : 0].join(); if (key === this.bkey) return; this.bkey = key;
    for (const x of this.extras ?? []) x.parent?.remove(x); this.extras = [];
    const add = (id, fn) => { const b = this.buildings.get(id); if (!b) return; const g = new Group(); fn(g); b.add(g); this.extras.push(g); };
    add('rocco', (g) => { if (!boxes) return; for (const [x, z, c] of [[0.2, 3.9, 'sand'], [1.1, 4.2, 'orange'], [0.6, 4.6, 'sand'], [1.6, 3.8, 'sand']]) { S.part(g, 'box', [0.7, 0.55, 0.6], [x + 0.3, 0.28, z], c); S.part(g, 'box', [0.72, 0.06, 0.1], [x + 0.3, 0.3, z], 'red'); } });
    const tier = w.homeTier; add('home', (g) => { S.part(g, 'box', [1.6, 0.1, 1.0], [2, 0.05, 4.7], 'white'); if (tier === 1) { /* shack: bare, no flowerbox */ } if (tier >= 2) { S.part(g, 'box', [1.4, 0.3, 0.3], [0.6, 0.9, 4.2], 'red'); S.part(g, 'box', [0.1, 1.1, 0.1], [1.4, 0.55, 4.8], 'plum'); S.part(g, 'box', [0.1, 1.1, 0.1], [2.6, 0.55, 4.8], 'plum'); S.part(g, 'box', [1.5, 0.12, 1.0], [2, 2.0, 4.7], 'orange'); } if (tier >= 3) { S.part(g, 'box', [2.4, 2.0, 3.2], [5.2, 1.0, 2], 'sand'); S.part(g, 'box', [2.7, 0.15, 3.5], [5.2, 2.1, 2], 'orange'); S.part(g, 'box', [0.7, 0.7, 0.1], [5.2, 1.3, 3.65], 'sky'); } if (tier >= 4) { S.part(g, 'box', [4, 2.0, 4], [2, 3.3, 2], 'white'); S.part(g, 'box', [4.5, 0.15, 4.5], [2, 4.4, 2], 'red'); S.part(g, 'box', [0.8, 0.8, 0.1], [1, 3.4, 4.05], 'sky'); S.part(g, 'box', [0.8, 0.8, 0.1], [3, 3.4, 4.05], 'sky'); S.part(g, 'box', [0.8, 0.5, 0.06], [2, 1.9, 4.75], 'sand'); } });
    const st = w.shop?.lifetime >= 120000 ? 2 : w.shop?.lifetime >= 25000 ? 1 : 0; add('store', (g) => { if (st >= 1) { S.part(g, 'box', [5.4, 0.2, 1.2], [2.5, 2.2, 4.6], 'white'); S.part(g, 'box', [5.4, 0.1, 1.2], [2.5, 2.35, 4.6], 'orange'); S.part(g, 'box', [3.2, 0.6, 0.12], [2.5, 3.1, 4.1], 'ink'); S.part(g, 'box', [3.0, 0.4, 0.1], [2.5, 3.1, 4.18], 'sand'); } if (st >= 2) { S.part(g, 'box', [5, 2, 4], [2.5, 4.2, 2], 'sand'); S.part(g, 'box', [5.5, 0.2, 4.5], [2.5, 5.3, 2], 'red'); S.part(g, 'box', [0.9, 0.9, 0.1], [1.2, 4.4, 4.05], 'sky'); S.part(g, 'box', [0.9, 0.9, 0.1], [3.8, 4.4, 4.05], 'sky'); } });
  }
  setNight(n) { const on = n > 0.35; for (const w of this.windows) w.visible = on; for (const l of this.lamps) l.userData.glow.visible = on; }
  update(t) { this.water.update(t); this.falls?.forEach((f, i) => { f.position.y = 2.2 - ((t * 1.4 + i * 0.37) % 1) * 1.9; }); if (this.ctx && (this.smokeT = (this.smokeT ?? 0) + 1) % 40 === 0 && this.group.visible) for (const b of this.buildings.values()) { const sm = b.userData.smoke; if (sm) this.ctx.particles.burst('smoke', new THREE.Vector3(b.position.x + sm[0], sm[1], b.position.z + sm[2]), { count: 1 }); } for (const tm of this.treeMeshes.values()) tm.obj.rotation.z = Math.sin(t * 1.1 + tm.data.x * 0.7) * 0.012; this.setGold(this.gold); if (this.bell) this.bell.userData.bell.rotation.z = Math.sin(t * 9) * (this.bellSwing ?? 0); if (this.bellSwing) this.bellSwing *= 0.97; }
}
