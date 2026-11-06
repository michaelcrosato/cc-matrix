// Presentation of the town and City: terrain, water, buildings, entities, sky, weather, seasons, occluders, camera.
import { THREE, buildModel, addModelColliders, applySky, skyAt, WaterSurface, WAVES_CALM, Precipitation, Boids, Decals, groundFog, toonMaterial, glowMaterial, PALETTE, LOOK_PRESETS, setLookLayer, mergeStaticMeshes, WindUniforms, ContactShadow } from '../engine.js';
import { G } from '../state.js';
import { Place } from './place.js';
import { TerrainView } from './terrainMesh.js';
import { TOWN_ROWS, CITY_ROWS } from '../data/townMap.js';
import { BUILDINGS, LANDMARK, LAMPS, BRIDGES, BENCHES, CITY } from './layout.js';
import { surfaceMat, patternTexture } from '../art/textures.js';
import { flowers, itemDef, cottages } from '../art/models.js';
import { info, season } from '../core/world.js';
import { hourOf, weatherNow } from '../core/calendar.js';
import { T } from '../dev/tuning.js';
import { lerp, clamp, rngOf } from '../core/util.js';
import { ITEMS } from '../data/items.js';
import { critterDef } from '../art/critter.js';
const CANOPY = [[0xf5a6c0, 'lime'], ['green', 'lime'], ['orange', 'red'], ['white', 'white']];
const BLOSSOM = 0xf5a6c0;
const tmpV = new THREE.Vector3();
const mk = (id, o) => { const b = buildModel(id, o ?? {}); b.object.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return b; };
export class WorldView {
  constructor(ctx) { this.ctx = ctx; this.engine = ctx.engine; this.scene = ctx.scene; this.yawTarget = 45; this.yaw = 45; this.zoom = T.zoom; this.zoomTarget = T.zoom; this.ents = new Map(); this.windows = []; this.bld = new Map(); this.occl = []; this.fadeSet = new Set(); this.lamps = []; this.lampLights = []; this.minuteDrawn = -1; this.weatherKind = 'sun'; this.dissolve = new Map(); this.seasonNow = -1; this.camTarget = new THREE.Vector3(); this.cloudT = 0; this.sway = []; this.groundZoomOut = 1; this.nightLook = false; this.visibleSweep = 0; this.rand = ctx.random.fork('view'); this.smokeT = 0; this.airT = 0; this.fwT = 0; this.fireworks = []; }
  build() {
    this.town = new THREE.Group(); this.city = new THREE.Group(); this.scene.add(this.town, this.city); this.city.visible = false;
    const pTown = new Place('town', TOWN_ROWS); const pCity = new Place('city', CITY_ROWS, CITY.ox, CITY.oz);
    G.places.town = pTown; G.places.city = pCity; this.pTown = pTown; this.pCity = pCity;
    // Terrain
    this.terrain = new TerrainView(pTown, this.town, (x, z) => (G.world?.worn?.[x + ',' + z] ? 'path' : null)); this.terrain.buildAll();
    this.cityT = new TerrainView(pCity, this.city, (x, z) => (pCity.ch(x, z) === '#' ? 'asphalt' : null)); this.cityT.buildAll(); { const ug = new THREE.Mesh(new THREE.PlaneGeometry(200, 160).rotateX(-Math.PI / 2), surfaceMat('sf-asphalt')); ug.position.set(CITY.ox + 24, -0.06, 12); ug.receiveShadow = true; const a = ug.geometry.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * 50, a.getY(i) * 40); this.city.add(ug); }
    // Hide map edges: a big under-ground plane and forest ring
    this.underParts = []; for (const [cx, cz, w2, d2] of [[40, -40, 240, 80], [-40, 29, 80, 58], [120, 29, 80, 58]]) { const u = new THREE.Mesh(new THREE.PlaneGeometry(w2, d2).rotateX(-Math.PI / 2), surfaceMat('sf-grass-summer')); u.position.set(cx, -0.02, cz); u.receiveShadow = true; const uv = u.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w2) / 4, (uv.getY(i) * d2) / 4); this.town.add(u); this.underParts.push(u); }
    this.forest();
    // Water
    this.water = new WaterSurface({ size: [320, 240], at: [40, -0.35, 60], segments: [160, 120], waves: WAVES_CALM, deep: PALETTE.blue, shallow: PALETTE.sky, foam: PALETTE.white, foamAt: 0.6 }); this.town.add(this.water);
    // Buildings
    for (const b of BUILDINGS) this.placeBuilding(b);
    for (const [x, z, w, d] of BRIDGES) { const m = mk('sf-bridge').object; m.position.set(x, 0.02, z); m.scale.set(w / 4.1, 1, d / 3.2); this.town.add(m); }
    const dock = mk('sf-dock').object; dock.position.set(20.5, 0.02, 58); this.town.add(dock);
    this.addProp('bus-shelter', LANDMARK.busShelter, 0, pTown); this.addProp('notice-board', LANDMARK.notice, 0, pTown, { noCollide: false }); this.addProp('market-stall', LANDMARK.rindStall, 0, pTown, { palette: { cloth: 'plum' } }); this.rindStall = this.lastProp; this.lastProp.visible = false;
    { const b = mk('old-bell'); b.object.position.set(LANDMARK.bell[0], 0, LANDMARK.bell[1]); this.town.add(b.object); this.bell = b.object; this.bellPivot = b.object.getObjectByName('Bell'); pTown.circles.push({ x: LANDMARK.bell[0], z: LANDMARK.bell[1], r: 0.9 }); }
    { const b = mk('old-pear'); b.object.position.set(LANDMARK.oldPear[0], 0, LANDMARK.oldPear[1]); this.town.add(b.object); this.oldPear = b; pTown.circles.push({ x: LANDMARK.oldPear[0], z: LANDMARK.oldPear[1], r: 1 }); this.occl.push({ obj: b.object, x: LANDMARK.oldPear[0], z: LANDMARK.oldPear[1], r: 3, h: 8, place: 'town' }); }
    this.addProp('lighthouse', LANDMARK.lighthouse, 0, pTown); pTown.circles.push({ x: LANDMARK.lighthouse[0], z: LANDMARK.lighthouse[1], r: 1.6 });
    for (const bench of BENCHES) { this.addProp('park-bench', [bench.x, bench.z], 0, pTown); }
    this.addProp('clothesline', LANDMARK.clothesline, 0, pTown, { noCollide: true });
    { const m = mk('sf-mailbox'); m.object.position.set(LANDMARK.mailbox[0], 0, LANDMARK.mailbox[1]); this.town.add(m.object); this.mailbox = m.object; this.mailFlag = m.object.getObjectByName('Flag'); pTown.circles.push({ x: LANDMARK.mailbox[0], z: LANDMARK.mailbox[1], r: 0.3 }); }
    for (const l of LAMPS) { this.addProp('lamp-post', l, 0, pTown); pTown.circles.push({ x: l[0], z: l[1], r: 0.2 }); this.lamps.push({ place: 'town', x: l[0], y: 2.6, z: l[1] }); }
    // Waterfall
    this.falls = []; const fallMat = toonMaterial(PALETTE.white), fallMat2 = toonMaterial(PALETTE.sky);
    for (let i = 0; i < 20; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.05), i % 3 ? fallMat2 : fallMat); m.position.set(35.3 + i * 0.5, 1, 4.02); this.town.add(m); this.falls.push({ m, ph: i * 0.37 }); }
    // Birds
    this.birds = new Boids(7, { bounds: { min: [-16, 6, -14], max: [16, 10, 14] }, seed: 3 }); this.birdMeshes = []; const bm = toonMaterial(PALETTE.white); for (let i = 0; i < 7; i++) { const g = new THREE.Group(); for (const sx of [-1, 1]) { const wing = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.08), bm); wing.position.x = sx * 0.09; wing.castShadow = false; g.add(wing); } this.town.add(g); this.birdMeshes.push(g); }
    // Weather
    this.rain = new Precipitation({ kind: 'rain', count: 2200, area: [36, 18, 36], color: PALETTE.sky }); this.snow = new Precipitation({ kind: 'snow', count: 1500, area: [36, 16, 36], color: PALETTE.white }); this.rain.intensity = 0; this.snow.intensity = 0; this.scene.add(this.rain, this.snow);
    this.decals = new Decals(this.scene, { capacity: 240 });
    try { this.fog = groundFog({ color: skyAt(12).sky, top: 1.4, amount: 0 }); this.scene.fogNode = this.fog.node; } catch { this.fog = null; }
    this.buildCity();
    this.ctx.particles.register('petal', { count: [1, 2], life: [1.6, 3], speed: [0.3, 0.8], gravity: 0.4, size: [1, 1], colors: ['red', 'white'] });
    this.ctx.particles.register('leaf', { count: [1, 2], life: [1.4, 2.6], speed: [0.6, 1.4], gravity: 0.5, size: [1, 1], colors: ['orange', 'red', 'sand'] });
    this.ctx.particles.register('firefly', { count: [1, 1], life: [1.5, 2.6], speed: [0.1, 0.4], gravity: -0.1, size: [1, 1], colors: ['lime', 'sand'] });
    this.ctx.particles.register('dirt', { count: [6, 9], life: [0.3, 0.6], speed: [1.5, 3], gravity: 8, size: [1, 2], colors: ['orange', 'plum'] });
    this.ctx.particles.register('splash', { count: [8, 12], life: [0.3, 0.6], speed: [1, 2.4], gravity: 7, size: [1, 1], colors: ['white', 'sky'] });
    this.ctx.particles.register('confetti', { count: [18, 30], life: [0.8, 1.4], speed: [2, 4], gravity: 5, size: [1, 2], colors: ['red', 'sand', 'lime', 'sky', 'plum'] });
    this.ctx.particles.register('wood', { count: [5, 8], life: [0.3, 0.5], speed: [1.5, 2.6], gravity: 8, size: [1, 1], colors: ['sand', 'orange'] });
    this.ctx.particles.register('steam', { count: [1, 2], life: [0.8, 1.4], speed: [0.2, 0.5], gravity: -1, size: [1, 2], colors: ['white', 'mist'] });
    this.bubbleSpot = new THREE.Vector3();
  }
  forest() {
    const r = rngOf('forest'); const b = buildModel('pine-tree', { palette: { leaf: 'teal', leaf2: 'green' } }); const parts = [];
    const put = (x, z, s) => b.object.traverse((m) => { if (m.isMesh) { const c = new THREE.Mesh(m.geometry, m.material); c.position.set(x, 0, z); c.scale.setScalar(s); c.castShadow = false; parts.push(c); } });
    for (let i = 0; i < 180; i++) { const side = i % 3; const a = side === 0 ? [r.range(-22, 0.8), r.range(-20, 58)] : side === 1 ? [r.range(79.2, 102), r.range(-20, 58)] : [r.range(-22, 102), r.range(-20, side ? 1 : 1)]; if (a[1] > 1 && a[0] > 1 && a[0] < 79) continue; put(a[0], a[1], r.range(1, 1.5)); }
    try { this.town.add(...mergeStaticMeshes(parts)); } catch { this.town.add(...parts); }
  }
  addProp(id, at, rot, place, o = {}) { const b = mk(id, o.palette ? { palette: o.palette } : {}); b.object.position.set(at[0] + place.ox, 0, at[1] + place.oz); b.object.rotation.y = rot; (place === this.pCity ? this.city : this.town).add(b.object); this.lastProp = b.object; if (!o.noCollide && b.bounds) { const s = b.bounds.max ? [b.bounds.max[0] - b.bounds.min[0], b.bounds.max[2] - b.bounds.min[2]] : null; if (s && id !== 'lamp-post' && id !== 'lighthouse') place.rects.push({ x0: at[0] + place.ox - s[0] / 2, z0: at[1] + place.oz - s[1] / 2, x1: at[0] + place.ox + s[0] / 2, z1: at[1] + place.oz + s[1] / 2 }); } this.scanWindows(b.object); return b.object; }
  scanWindows(o) { o.traverse((m) => { if (m.isMesh && m.material?.color?.getHex && m.material.color.getHex() === new THREE.Color(PALETTE.cyan).getHex()) { this.windows.push(m); m.userData.dayMat = m.material; } }); }
  placeBuilding(b) {
    const old = this.bld.get(b.id); if (old) { this.town.remove(old); this.windows = this.windows.filter((m) => { let p = m; while (p) { if (p === old) return false; p = p.parent; } return true; }); this.occl = this.occl.filter((o) => o.obj !== old); }
    const mo = b.modelOverride ?? b.model; const m = mk(mo).object; m.position.set(b.x, 0, b.z); this.town.add(m); this.bld.set(b.id, m); this.scanWindows(m);
    if (!old) this.pTown.rects.push({ x0: b.x - b.w / 2, z0: b.z - b.d / 2, x1: b.x + b.w / 2, z1: b.z + b.d / 2 });
    this.occl.push({ obj: m, x: b.x, z: b.z, w: b.w, d: b.d, h: 4.5, place: 'town', box: true });
  }
  buildCity() {
    const P = this.pCity;
    for (const f of CITY.fronts) { const b = mk(f.model); b.object.position.set(f.x + P.ox, 0, f.z + P.oz); b.object.rotation.y = (f.rot * Math.PI) / 180; this.city.add(b.object); this.scanWindows(b.object); this.occl.push({ obj: b.object, x: f.x + P.ox, z: f.z + P.oz, w: f.w, d: f.d, h: 6, place: 'city', box: true }); P.rects.push({ x0: f.x - f.w / 2 + P.ox, z0: f.z - f.d / 2 + P.oz, x1: f.x + f.w / 2 + P.ox, z1: f.z + f.d / 2 + P.oz }); }
    const r = rngOf('sky'); for (let i = 0; i < 18; i++) { const b = mk('skyline' + (i % 3)); b.object.position.set(P.ox + i * 5 - 8, 0, -8 - (i % 2) * 5); this.city.add(b.object); }
    const hedge = toonMaterial(PALETTE.teal), kerb = toonMaterial(PALETTE.slate); for (const [x, z, w2, d2] of [[12, 15.3, 24, 0.5]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w2, 0.7, d2), hedge); m.position.set(P.ox + x, 0.35, z); m.castShadow = true; const k = new THREE.Mesh(new THREE.BoxGeometry(w2 + 0.1, 0.16, d2 + 0.1), kerb); k.position.set(P.ox + x, 0.08, z); this.city.add(m, k); }
    for (const l of CITY.lamps) { this.addProp('lamp-post', l, 0, P); P.circles.push({ x: l[0] + P.ox, z: l[1] + P.oz, r: 0.2 }); this.lamps.push({ place: 'city', x: l[0] + P.ox, y: 2.6, z: l[1] + P.oz }); }
    { const t = mk('fortune-tent'); t.object.position.set(CITY.tent[0] + P.ox, 0, CITY.tent[1] + P.oz); this.city.add(t.object); P.circles.push({ x: CITY.tent[0] + P.ox, z: CITY.tent[1] + P.oz, r: 1.9 }); }
    this.addProp('bus-shelter', [CITY.stop[0], CITY.stop[1] - 2.4], 0, P);
    { const m = mk('fountain'); m.object.position.set(P.ox + 30, 0, 18); this.city.add(m.object); P.circles.push({ x: P.ox + 30, z: 18, r: 1.4 }); }
    this.pigeons = new Boids(16, { bounds: { min: [P.ox + 26, 0.3, 15], max: [P.ox + 36, 2.2, 22] }, seed: 8 }); this.pigeonMeshes = []; const pm = toonMaterial(PALETTE.slate); for (let i = 0; i < 16; i++) { const g = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.34), pm); this.city.add(g); this.pigeonMeshes.push(g); }
  }
  // ---- Entities
  entKey(e, s) {
    switch (e.t) {
      case 'tree': return `tree:${e.kind}:${s}:${e.fruit > 0 ? e.fruit : 0}:${e.fruitKind ?? ''}:${e.id.length % 2}`;
      case 'flower': return `fl:${e.sp}:${e.c}:${e.wilted ? 1 : 0}:${s === 3}`;
      case 'sapling': return `sap:${Math.min(2, e.age ?? 0)}`;
      case 'beanstalk': return `bean:${Math.min(2, e.age ?? 0)}`;
      case 'shell': return `shell:${e.it}`;
      case 'item': return `it:${e.it}`;
      case 'snowball': return `sb:${Math.round((e.size ?? 0.5) * 8)}`;
      default: return e.t;
    }
  }
  entObject(e, s) {
    let o;
    switch (e.t) {
      case 'tree': o = this.treeObject(e, s); break;
      case 'stump': o = mk('sf-stump').object; break;
      case 'rock': o = mk('sf-rock').object; break;
      case 'weed': o = mk('sf-weed').object; break;
      case 'crack': o = mk('sf-crack').object; break;
      case 'hole': case 'buried': o = mk('sf-hole').object; if (e.t === 'buried') o.scale.setScalar(0.7); break;
      case 'sparkle': o = mk('sf-sparkle').object; break;
      case 'shell': o = mk('sf-shell', { palette: { shell: ITEMS[e.it]?.color ?? 'white' } }).object; break;
      case 'sapling': o = mk('sapling' + Math.min(2, e.age ?? 0)).object; break;
      case 'beanstalk': o = mk('beanstalk' + Math.min(2, e.age ?? 0)).object; break;
      case 'flower': { const d = flowers[e.sp]; o = mk(d, { palette: { petal: e.wilted ? 'slate' : e.c, stem: e.wilted ? 'orange' : 'green' } }).object; if (e.wilted) o.rotation.z = 0.4; break; }
      case 'item': o = mk(itemDef(ITEMS[e.it] ?? ITEMS.weed)).object; o.position.y = 0; o.scale.setScalar(0.8); break;
      case 'snowball': o = mk('sf-snowball').object; o.scale.setScalar(e.size ?? 0.5); break;
      case 'snowman': o = mk('sf-snowman').object; break;
      case 'pattile': { const rows = G.world.p.patterns[e.slot]; const tex = rows ? patternTexture(`pat-${e.slot}-${G.world.p.patternsV ?? 0}`, rows) : null; o = new THREE.Mesh(new THREE.BoxGeometry(1, 0.04, 1), tex ? toonMaterial(PALETTE.white, { map: tex }) : toonMaterial(PALETTE.sand)); o.receiveShadow = true; const g = new THREE.Group(); o.position.y = 0.03; g.add(o); o = g; break; }
      case 'patsign': { const rows = G.world.p.patterns[e.slot]; const tex = rows ? patternTexture(`pat-${e.slot}-${G.world.p.patternsV ?? 0}`, rows) : null; const g = new THREE.Group(); const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.12), toonMaterial(PALETTE.plum)); post.position.y = 0.65; const board = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.08), tex ? toonMaterial(PALETTE.white, { map: tex }) : toonMaterial(PALETTE.sand)); board.position.y = 1.5; post.castShadow = board.castShadow = true; g.add(post, board); o = g; break; }
      default: o = new THREE.Group();
    }
    setLookLayer(o, e.t === 'tree' ? 'environment' : 'actors');
    return o;
  }
  treeObject(e, s) {
    const g = new THREE.Group();
    if (s === 3 && e.kind === 'pear') { g.add(mk('bare-tree').object); return g; }
    const leaf = { pear: s === 0 ? 'lime' : s === 1 ? 'green' : e.id.charCodeAt(e.id.length - 1) % 3 === 0 ? 'red' : e.id.charCodeAt(e.id.length - 1) % 3 === 1 ? 'orange' : 'sand', pine: 'teal', palm: 'green' }[e.kind];
    const leaf2 = { pear: s === 0 ? 'white' : s === 1 ? 'lime' : leaf === 'red' ? 'orange' : 'sand', pine: s === 3 ? 'white' : 'green', palm: 'lime' }[e.kind];
    const id = e.kind === 'pine' ? 'pine-tree' : e.kind === 'palm' ? 'palm-tree' : 'pear-tree';
    const b = mk(id, { palette: { leaf, leaf2 } }); g.add(b.object);
    if (s === 0 && e.kind === 'pear') b.object.traverse((m) => { if (m.isMesh && m.material?.color?.getHex() === new THREE.Color(PALETTE.lime).getHex()) m.material = toonMaterial(BLOSSOM); });
    if (e.kind === 'pear' && e.fruit > 0) { const c = e.fruitKind === 'fig' ? 'plum' : e.fruitKind === 'quince' ? 'sand' : 'lime'; const mat = toonMaterial(PALETTE[c]); const geo = new THREE.SphereGeometry(0.17, 6, 5); for (let i = 0; i < e.fruit; i++) { const a = i * 2.1; const f = new THREE.Mesh(geo, mat); f.position.set(Math.cos(a) * 1, 1.75 + (i % 2) * 0.3, Math.sin(a) * 1 + 0.35); g.add(f); } }
    return g;
  }
  syncEnts(force = false) {
    const w = G.world; if (!w) return; if (!w.dirty && !force) return; w.dirty = false;
    const s = this.seasonNow; const seen = new Set(); const circles = [];
    for (const e of Object.values(w.ents)) {
      seen.add(e.id);
      const key = this.entKey(e, s); let v = this.ents.get(e.id);
      if (!v || v.key !== key) { if (v) this.town.remove(v.obj); const obj = this.entObject(e, s); obj.position.x = e.x; obj.position.z = e.z; obj.position.y = this.pTown.heightAt(e.x, e.z); this.town.add(obj); v = { key, obj, e, ph: (e.x * 7 + e.z * 3) % 6.28 }; this.ents.set(e.id, v); }
      else { v.obj.position.x = e.x; v.obj.position.z = e.z; }
      if (e.t === 'tree') circles.push({ x: e.x, z: e.z, r: 0.45 }); else if (e.t === 'rock') circles.push({ x: e.x, z: e.z, r: 0.55 }); else if (e.t === 'stump') circles.push({ x: e.x, z: e.z, r: 0.32 }); else if (e.t === 'snowman') circles.push({ x: e.x, z: e.z, r: 0.5 }); else if (e.t === 'snowball') circles.push({ x: e.x, z: e.z, r: (e.size ?? 0.5) / 2 }); else if (e.t === 'beanstalk') circles.push({ x: e.x, z: e.z, r: 0.2 });
    }
    for (const [id, v] of this.ents) if (!seen.has(id)) { this.town.remove(v.obj); this.ents.delete(id); }
    this.pTown.entCircles = circles; this.pTown.circles = (this.pTown.baseCircles ??= this.pTown.circles.slice()).concat(circles);
    if (G.nav?.syncEnts) G.nav.syncEnts(circles);
  }
  // ---- World state → picture
  setSeason(s, force) {
    if (this.seasonNow === s && !force) return; this.seasonNow = s; this.terrain.setSeason(s);
    for (const u of this.underParts) u.material = surfaceMat(`sf-grass-${['spring', 'summer', 'autumn', 'winter'][s]}`);
    if (G.world) G.world.dirty = true; this.syncEnts(true); this.applyWindows();
    // Old Pear's seasons
    this.town.remove(this.oldPear.object); const pal = [{ leaf: 'lime', leaf2: 'white' }, { leaf: 'green', leaf2: 'lime' }, { leaf: 'orange', leaf2: 'red' }, { leaf: 'white', leaf2: 'mist' }][s];
    this.oldPear = mk('old-pear', { palette: pal }); this.oldPear.object.position.set(LANDMARK.oldPear[0], 0, LANDMARK.oldPear[1]); if (s === 0) this.oldPear.object.traverse((m) => { if (m.isMesh && m.material?.color?.getHex() === new THREE.Color(PALETTE.lime).getHex()) m.material = toonMaterial(BLOSSOM); }); this.town.add(this.oldPear.object);
    this.occl = this.occl.filter((o) => !(o.r === 3)); this.occl.push({ obj: this.oldPear.object, x: LANDMARK.oldPear[0], z: LANDMARK.oldPear[1], r: 3, h: 8, place: 'town' });
  }
  skyTick() {
    const w = G.world; if (!w) return; const m = w.clock.minute; const inf = info(w); const p = w.p.place; const indoor = p !== 'town' && p !== 'city';
    let hour = m / 60;
    if (w.festival?.id === 'longNight' && hour >= 16 && hour < 24) hour = Math.max(hour, 20); // the long night: the sun sets at 16:00
    const sky = indoor ? skyAt(13) : skyAt(hour);
    const prev = this.lastSkyKey; const key = indoor ? 'in' : Math.floor(m);
    if (prev !== key) { applySky(this.engine, sky); this.lastSkyKey = key; if (indoor) { this.scene.background = new THREE.Color(PALETTE.ink); this.engine.sun.intensity = 1.5; this.engine.ambient.intensity = Math.max(this.engine.ambient.intensity, 1.25); } }
    this.night = indoor ? 0 : sky.night;
    const glow = this.night > 0.35;
    if (glow !== this.windowsGlow) { this.windowsGlow = glow; const gm = glowMaterial(PALETTE.sand); this.applyWindows(); this.setLamps(glow); }
    const hourNow = hourOf(w.clock); const wx = indoor ? 'none' : (p === 'town' || p === 'city') ? weatherNow(w.weather, hourNow) : 'none';
    if (wx !== this.weatherKind) { this.weatherKind = wx; this.rain.intensity = wx === 'rain' ? 0.75 : wx === 'storm' ? 1 : 0; this.snow.intensity = wx === 'snow' ? 0.8 : 0; if (this.fog) this.fog.amount.value = wx === 'fog' ? 0.8 : inf.season === 2 && p === 'town' ? 0.15 : 0; }
    if (this.fog) this.fog.color.value.setHex(sky.sky);
    this.bloomOn(p === 'city' && this.night > 0.35);
  }
  applyWindows() { const gm = glowMaterial(PALETTE.sand), frost = toonMaterial(PALETTE.white); for (const mesh of this.windows) mesh.material = this.windowsGlow ? gm : this.seasonNow === 3 ? frost : mesh.userData.dayMat; }
  setLamps(on) { for (const l of this.lampLights) l.release(); this.lampLights.length = 0; if (!on) return; const p = G.world?.p.place; for (const l of this.lamps) if (l.place === p) this.lampLights.push(this.ctx.lights.request({ position: [l.x, l.y, l.z], color: p === 'city' ? 0xffc080 : 0xffd090, intensity: 5, radius: 7 })); if (p === 'city') for (const f of CITY.fronts) this.lampLights.push(this.ctx.lights.request({ position: [f.x + 500, 2.2, f.z + 3.6], color: { salon: 0xff5070, couture: 0xff60c0, magda: 0x80ff50, theatre: 0xffc040, auction: 0xffc040, bureau: 0x40e0ff, cafe: 0xffa040 }[f.id] ?? 0xffffff, intensity: 8, radius: 6 })); }
  bloomOn(on) { if (on === this.nightLook) return; this.nightLook = on; this.engine.setLook(on ? { ...LOOK_PRESETS.none, scene: [{ id: 'bloom', params: { amount: 0.3 } }] } : LOOK_PRESETS.none); }
  show(place) { this.town.visible = place === 'town'; this.city.visible = place === 'city'; for (const r of Object.values(G.rooms)) r.group.visible = r.id === place; if (this.windowsGlow) this.setLamps(true); this.lastSkyKey = null; }
  // ---- Camera
  setCam() { const z = this.zoom; this.engine.setCamera({ preset: 'iso', yaw: this.yaw, pitch: 35, zoom: z, minZoom: z, maxZoom: z }, { syncUrl: false }); }
  turn(d) { if (G.world && G.world.p.place !== 'town' && G.world.p.place !== 'city') return; this.yawTarget += d * 90; }
  cameraUpdate(dt, focusZoom) {
    const zt = (focusZoom ?? this.zoomTarget);
    let changed = false;
    if (Math.abs(this.yaw - this.yawTarget) > 0.05) { this.yaw = lerp(this.yaw, this.yawTarget, Math.min(1, dt * 8)); if (Math.abs(this.yaw - this.yawTarget) < 0.1) this.yaw = this.yawTarget; changed = true; }
    if (Math.abs(this.zoom - zt) > 0.003) { this.zoom = lerp(this.zoom, zt, Math.min(1, dt * 5)); if (Math.abs(this.zoom - zt) < 0.005) this.zoom = zt; changed = true; }
    if (changed) this.setCam();
  }
  project(x, y, z) { tmpV.set(x, y, z).project(this.engine.camera.camera); return [Math.round((tmpV.x + 1) * 240), Math.round((1 - tmpV.y) * 135)]; }
  /** World point under the mouse on the ground. */
  rayGround(mx, my, outY = 0) { const o = new THREE.Vector3(), d = new THREE.Vector3(); this.engine.camera.rayAt(mx, my, o, d); const t = (outY - o.y) / (d.y || -1e-6); return [o.x + d.x * t, o.z + d.z * t]; }
  update(dt, time, focus) {
    const s = season(G.world); if (s !== this.seasonNow && !this.seasonHold) this.setSeason(s);
    this.syncEnts(); this.skyTick();
    const p = G.world.p.place;
    if (p === 'town') {
      this.water.update(time); for (const f of this.falls) { f.m.position.y = 2 - ((time * 1.8 + f.ph) % 2.2); }
      this.birds.step(dt); const a = this.birds.pos; for (let i = 0; i < 7; i++) { const g = this.birdMeshes[i]; g.position.set(a[i * 3] + focus.x, a[i * 3 + 1], a[i * 3 + 2] + focus.z); const fl = Math.sin(time * 14 + i) * 0.5; g.children[0].rotation.z = fl; g.children[1].rotation.z = -fl; }
      for (const v of this.ents.values()) if (v.e.t === 'tree') { const dx = v.e.x - focus.x, dz = v.e.z - focus.z; if (dx * dx + dz * dz < 500) { const wind = this.weatherKind === 'wind' || this.weatherKind === 'storm' ? 0.03 : 0.01; const sh = v.shake > 0 ? (v.shake -= dt, Math.sin(time * 40) * 0.05) : 0; v.obj.rotation.z = Math.sin(time * 1.2 + v.ph) * wind + sh; v.obj.rotation.x = Math.cos(time * 0.9 + v.ph) * wind * 0.7; } }
      this.town.children; this.smokeT -= dt; if (this.smokeT <= 0) { this.smokeT = 0.9; for (const b of BUILDINGS) if (Math.abs(b.x - focus.x) + Math.abs(b.z - focus.z) < 16) this.ctx.particles.burst('smoke', [b.x + 1.4, 4, b.z - 0.5], { count: 1 }); }
    }
    if (p === 'city') { this.pigeons.flee = G.player?.speed > 5 ? { at: [focus.x, 0.5, focus.z], radius: 4 } : null; this.pigeons.step(dt); const a = this.pigeons.pos; for (let i = 0; i < 16; i++) this.pigeonMeshes[i].position.set(a[i * 3], a[i * 3 + 1], a[i * 3 + 2]); }
    this.rain.update(dt, focus); this.snow.update(dt, focus); this.decals.update(dt);
    if (this.mailFlag) { const up = G.world.mail.some((m) => !m.read); this.mailFlag.rotation.z = up ? 0 : -1.5; }
    if (this.bellSwing > 0) { this.bellSwing -= dt; if (this.bellPivot) this.bellPivot.rotation.x = Math.sin(time * 9) * 0.3 * Math.min(1, this.bellSwing); }
    this.air(dt, focus); this.rainbowSync(focus); this.lifeTick(dt, focus);
    this.occluders(focus);
    this.updateFireworks(dt);
  }
  air(dt, f) {
    const w = G.world; if (w.p.place !== 'town') return; this.airT -= dt; if (this.airT > 0) return; this.airT = 0.35; const s = this.seasonNow, r = this.rand; const at = [f.x + r.range(-9, 9), r.range(1.5, 5), f.z + r.range(-9, 9)];
    if (s === 0) this.ctx.particles.burst('petal', at); else if (s === 2) this.ctx.particles.burst('leaf', at); else if (s === 1 && this.night > 0.4) this.ctx.particles.burst('firefly', [at[0], 1, at[2]]);
    if (this.weatherKind === 'storm' && r.chance(0.02)) { this.engine.screen.flash('white', { duration: 0.15 }); this.ctx.audio.play('thunder'); G.rumble?.(0.8, 0.5); }
  }
  occluders(f) {
    const place = G.world.p.place; if (place !== 'town' && place !== 'city') { if (this.fadeSet.size) this.clearFade(); return; }
    const yaw = (this.yaw * Math.PI) / 180, pitch = (35 * Math.PI) / 180; const dx = Math.sin(yaw) * Math.cos(pitch), dz = Math.cos(yaw) * Math.cos(pitch), dy = Math.sin(pitch);
    const hits = new Set();
    const test = (cx, cz, r, h, obj, w2, d2) => { const px = f.x, py = f.y + 0.5, pz = f.z; for (let t = 0.4; t < 9; t += 0.4) { const x = px + dx * t, y = py + dy * t, z = pz + dz * t; if (y > h) break; const inside = w2 ? Math.abs(x - cx) < w2 && Math.abs(z - cz) < d2 : (x - cx) ** 2 + (z - cz) ** 2 < r * r; if (inside) { hits.add(obj); return; } } };
    for (const v of this.ents.values()) if (v.e.t === 'tree') { const ddx = v.e.x - f.x, ddz = v.e.z - f.z; if (ddx * ddx + ddz * ddz < 60) test(v.e.x, v.e.z, 1.35, 4.6, v.obj); }
    for (const o of this.occl) if (o.place === place) { const ddx = o.x - f.x, ddz = o.z - f.z; if (ddx * ddx + ddz * ddz < 100) { if (o.box) test(o.x, o.z, 0, o.h, o.obj, o.w / 2, o.d / 2); else test(o.x, o.z, o.r, o.h, o.obj); } }
    for (const o of this.fadeSet) if (!hits.has(o)) { this.setFade(o, false); this.fadeSet.delete(o); }
    for (const o of hits) if (!this.fadeSet.has(o)) { this.setFade(o, true); this.fadeSet.add(o); }
  }
  clearFade() { for (const o of this.fadeSet) this.setFade(o, false); this.fadeSet.clear(); }
  setFade(o, on) { o.traverse((m) => { if (!m.isMesh) return; if (on) { m.userData.solid = m.material; const c = m.material.color?.getHex?.() ?? 0xffffff; let d = this.dissolve.get(c); if (!d) { d = toonMaterial(c, { dissolve: true }).clone?.() ?? toonMaterial(c, { dissolve: true }); d.dissolve = 0.55; this.dissolve.set(c, d); } if (m.material.map) return; m.material = d; } else if (m.userData.solid) { m.material = m.userData.solid; } }); }
  // ---- Fireworks (a pattern can be shown in one)
  /** dx, dy are metres on the camera plane from the middle of the view, so a burst always faces you and a pattern reads as a picture. */
  firework(dx, dy, rows = null) { this.ctx.audio.play('fwUp'); const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 5, 4), glowMaterial(PALETTE.sand)); this.scene.add(m); this.fireworks.push({ dx, dy, t: 0, rows, burst: false, rocket: m, parts: [] }); }
  updateFireworks(dt) {
    const cam = this.engine.camera.camera; const right = tmpV.clone().setFromMatrixColumn(cam.matrixWorld, 0), up = tmpV.clone().setFromMatrixColumn(cam.matrixWorld, 1); const c = this.camTarget.copy(this.engine.camera.focus);
    const at = (x, y, out) => out.copy(c).addScaledVector(right, x).addScaledVector(up, y);
    for (let i = this.fireworks.length - 1; i >= 0; i--) { const f = this.fireworks[i]; f.t += dt;
      if (!f.burst) { const k = Math.min(1, f.t / 0.8); at(f.dx, f.dy - (1 - k) * 7, f.rocket.position); if (k >= 1) { f.burst = true; f.t = 0; this.scene.remove(f.rocket); this.ctx.audio.play('fwBurst'); this.engine.screen.flash('white', { duration: 0.05 }); const g = (f.group = new THREE.Group()); this.scene.add(g); if (f.rows) { const names = 'ink plum red orange sand lime green teal navy blue sky cyan white mist slate night'.split(' '); const geo = new THREE.BoxGeometry(0.34, 0.34, 0.34); for (let r = 0; r < 16; r++) for (let q = 0; q < 16; q++) { const n = names[f.rows[r]?.[q]]; if (!n || n === 'white' || n === 'ink') continue; const m = new THREE.Mesh(geo, glowMaterial(PALETTE[n])); g.add(m); f.parts.push({ m, x: (q - 7.5) * 0.36, y: (7.5 - r) * 0.36, vx: 0, vy: 0 }); } } else { const cols = this.rand.pick([['red', 'sand'], ['sky', 'white'], ['lime', 'sand'], ['plum', 'red'], ['orange', 'sand']]); const geo = new THREE.SphereGeometry(0.14, 4, 3); for (let k2 = 0; k2 < 44; k2++) { const a = (k2 / 44) * Math.PI * 2, v = k2 % 2 ? 3.4 : 2.1; const m = new THREE.Mesh(geo, glowMaterial(PALETTE[cols[k2 % 2]])); g.add(m); f.parts.push({ m, x: 0, y: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v }); } } } continue; }
      const life = f.rows ? 2.4 : 1.3, k = f.t / life; for (const p of f.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= dt * (f.rows ? 0.05 : 1.2); at(f.dx + p.x, f.dy + p.y, p.m.position); const sc = k < 0.75 ? 1 : Math.max(0.01, (1 - k) * 4); p.m.scale.setScalar(sc); } if (k >= 1) { this.scene.remove(f.group); this.fireworks.splice(i, 1); } }
  }
  lifeTick(dt, f) {
    if (G.world.p.place !== 'town') { for (const c of this.clouds ?? []) c.visible = false; return; } const r = this.rand; this.puddleT = (this.puddleT ?? 0) - dt;
    if (this.puddleT <= 0) { this.puddleT = 0.5; const wet = this.weatherKind === 'rain' || this.weatherKind === 'storm'; this.syncPuddles(wet); for (const fs of G.fish) if ((fs.x - f.x) ** 2 + (fs.z - f.z) ** 2 < 150 && r.chance(0.12)) this.decals.add('ring', { x: fs.x, y: -0.22, z: fs.z }, { x: 0, y: 1, z: 0 }, { size: 0.9, color: PALETTE.white, life: 0.5 }); }
    if (!this.clouds) { const mat = toonMaterial(PALETTE.white); mat.colorWrite = false; mat.depthWrite = false; this.clouds = [0, 1, 2].map((i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 5), mat); m.scale.set(4 + i, 0.6, 3 + i); m.castShadow = true; m.userData = { ox: r.range(-20, 20), oz: r.range(-20, 20) }; this.town.add(m); return m; }); }
    this.cloudT += dt * 0.7; for (const c of this.clouds) { c.visible = this.night < 0.3; const span = 44; const x = ((c.userData.ox + this.cloudT + span / 2) % span) - span / 2; c.position.set(f.x + x, 11, f.z + c.userData.oz * 0.5); }
  }
  /** Puddles fill while it rains and dry slowly after: fixed low spots on paths and the plaza. */
  syncPuddles(wet) { if (!this.puddles) { const rr = rngOf('puddles'); const mat = toonMaterial(PALETTE.sky); const geo = new THREE.SphereGeometry(1, 10, 4); this.puddles = []; for (let i = 0; i < 400 && this.puddles.length < 44; i++) { const x = rr.int(3, 76) + 0.5, z = rr.int(16, 53) + 0.5, c = this.pTown.chAt(x, z); if (c !== ',' && c !== 'P') continue; const m = new THREE.Mesh(geo, mat); m.position.set(x, 0.015, z); m.scale.set(0.01, 0.004, 0.01); m.userData.size = rr.range(0.5, 1.1); m.userData.zr = rr.range(0.55, 0.95); m.visible = false; m.receiveShadow = true; this.town.add(m); this.puddles.push(m); } this.wetness = 0; } this.wetness = clamp((this.wetness ?? 0) + (wet ? 0.05 : -0.01), 0, 1); const k = this.wetness; for (const m of this.puddles) { m.visible = k > 0.02; m.scale.set(m.userData.size * k, 0.004, m.userData.size * m.userData.zr * k); } G.world.stats.puddles = this.puddles.length * (k > 0.1 ? 1 : 0); }
  setBellGold() { const g = toonMaterial(PALETTE.sand); const sl = new THREE.Color(PALETTE.slate).getHex(); this.bellPivot?.traverse((m) => { if (m.isMesh && m.material?.color?.getHex?.() === sl) m.material = g; }); this.bellIsGold = true; }
  rainbowSync(focus) { const w = G.world; const h = hourOf(w.clock), wxk = w.weather?.kind; const show = w.p.place === 'town' && this.seasonNow === 0 && wxk === 'rain' && h >= (w.weather?.to ?? 25) && h < (w.weather?.to ?? 25) + 2 && this.night < 0.3; if (show && !this.rainbow) { this.rainbow = new THREE.Group(); ['red', 'orange', 'sand', 'lime', 'sky', 'plum'].forEach((c, i) => { const t = new THREE.Mesh(new THREE.TorusGeometry(30 - i * 0.8, 0.4, 4, 40, Math.PI), glowMaterial(PALETTE[c])); this.rainbow.add(t); }); this.rainbow.rotation.y = Math.PI / 4; this.town.add(this.rainbow); w.stats.rainbows = (w.stats.rainbows ?? 0) + 1; } if (this.rainbow) { this.rainbow.visible = show; this.rainbow.position.set(focus.x - 18, 0, focus.z - 18); } }
  setHomeModel(tier) { const b = BUILDINGS.find((x) => x.id === 'home'); b.modelOverride = tier <= 1 && !G.world?.flags?.roofOn ? 'home0' : 'home' + Math.max(1, Math.min(4, tier)); this.placeBuilding(b); }
  setStoreModel(tier) { const b = BUILDINGS.find((x) => x.id === 'store'); b.modelOverride = 'store' + tier; this.placeBuilding(b); }
  bellRing() { this.bellSwing = 2.2; }
}
