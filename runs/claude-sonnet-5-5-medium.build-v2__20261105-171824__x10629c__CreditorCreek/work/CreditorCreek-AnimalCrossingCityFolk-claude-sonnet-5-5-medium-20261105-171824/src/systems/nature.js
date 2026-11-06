// Living nature: fish shadows, bugs, weeds, fruit, flowers, balloons, daily upkeep.
import { THREE, toonMaterial, PALETTE } from '../engine.js';
import { FISH, BUGS, timeOk, byId } from '../data/collect.js';
import { tuning } from '../data/tuning.js';
import { TW, TD, T, waterKind, BUILDINGS, groundHeight, onHill } from '../world/townMap.js';
import { seeded } from '../core/rng.js';
import { part } from '../world/scenery.js';
import { isWet, seasonOf, dayWeather } from '../core/calendar.js';
import { uid } from '../core/world.js';
import { buildBalloon } from '../world/scenery.js';
import { buildBugModel } from '../art/items3d.js';
const { Group, Mesh } = THREE;
const BUGCOL = { cabbagebutterfly: 'white', pillbug: 'slate', ladybird: 'red', pondskater: 'ink', cricket: 'plum', moth: 'mist', grasshopper: 'lime', dragonfly: 'cyan', bumblebee: 'sand', snail: 'sand', cicada: 'green', swallowtail: 'orange', firefly: 'lime', woollybear: 'orange', mantis: 'green', snowflea: 'ink', stagbeetle: 'plum', rhinobeetle: 'ink' };
export const nature = {
  bugs: [], fish: [], balloons: [], init(g) { if (this.group) return; this.group = new Group(); g.ctx.scene.add(this.group); this.fishGroup = new Group(); g.ctx.scene.add(this.fishGroup); },
  waterTiles(g, kinds) { const out = []; for (let z = 0; z < TD; z++) for (let x = 0; x < TW; x++) { const t = g.tiles[z * TW + x]; if ((t === T.WATER || t === T.SEA) && kinds.includes(waterKind(x, z))) out.push([x, z]); } return out; },
  habitat(g, b) {
    const w = g.world, r = g.rng; const hab = b.where;
    if (hab === 'flower') { const f = w.town.flowers.filter(x => !x.wilt); if (!f.length) return null; const t = f[Math.floor(r() * f.length)]; return [t.x + 0.5, t.z + 0.5, 0.5]; }
    if (hab === 'tree') { const f = w.town.trees.filter(x => x.stage >= 2 && !x.felled && x.kind !== 'palm'); if (!f.length) return null; const t = f[Math.floor(r() * f.length)]; return [t.x + 0.5, t.z + 0.9, 0.9]; }
    if (hab === 'rock') { const f = w.town.rocks.filter(x => !x.gone); if (!f.length) return null; const t = f[Math.floor(r() * f.length)]; return [t.x + 0.5, t.z + 1.2, 0.2]; }
    if (hab === 'lamp') { const l = g.town.lamps; const t = l[Math.floor(r() * l.length)]; return [t.position.x, t.position.z + 0.4, 2]; }
    if (hab === 'water') { const wt = this.waterTiles(g, ['river', 'pond']); const t = wt[Math.floor(r() * wt.length)]; return [t[0] + 0.5, t[1] + 0.5, -0.2]; }
    if (hab === 'snow' || hab === 'grass') { for (let i = 0; i < 20; i++) { const x = 3 + Math.floor(r() * (TW - 6)), z = 4 + Math.floor(r() * 32); if (g.tiles[z * TW + x] === T.GRASS && !onHill(x + 0.5, z + 0.5) && !g.grid.solid(x + 0.5, z + 0.5)) return [x + 0.5, z + 0.5, 0.1]; } }
    return null;
  },
  makeBugMesh(b) { return buildBugModel(b.def ?? b); },
  spawnBugs(g) {
    this.init(g); for (const b of this.bugs) this.group.remove(b.mesh); this.bugs = []; if (g.mode === 'title') return;
    const w = g.world, hour = g.hour, season = g.season, wet = isWet(g.weather); const target = Math.round(tuning.bugsPerAcre * 3.5 * 1.5); const cand = BUGS.filter(b => b.seasons.includes(season) && timeOk(b.time, hour, wet) && (b.id !== 'snail' || wet));
    if (!cand.length) return;
    let tries = 0; while (this.bugs.length < target && tries++ < 80) {
      const def = cand[Math.floor(g.rng() * cand.length)]; if (def.rare && g.rng() > 0.25) continue; const h = this.habitat(g, def); if (!h) continue;
      const mesh = this.makeBugMesh(def); mesh.position.set(h[0], h[2], h[1]); this.group.add(mesh); this.bugs.push({ def, x: h[0], z: h[1], y: h[2], home: [h[0], h[1], h[2]], mesh, state: 'rest', vx: 0, vz: 0, t: g.rng() * 3, alive: true });
    }
  },
  spawnFish(g) {
    this.init(g); for (const f of this.fish) this.fishGroup.remove(f.mesh); this.fish = []; if (g.mode === 'title') return;
    const season = g.season, hour = g.hour; const groups = { river: ['river'], pond: ['pond'], mouth: ['mouth'], sea: ['sea'] };
    for (const [kind, list] of Object.entries(groups)) {
      const tiles = this.waterTiles(g, list); if (!tiles.length) continue; const n = Math.round(tuning.fishPerAcre * (kind === 'sea' ? 8 : kind === 'pond' ? 1.3 : kind === 'mouth' ? 1 : 2.4));
      const cand = FISH.filter(f => (f.where === kind || (f.where === 'any' && kind !== 'mouth')) && f.seasons.includes(season) && timeOk(f.time, hour, false));
      if (!cand.length) continue;
      for (let i = 0; i < n; i++) { let def = cand[Math.floor(g.rng() * cand.length)]; if (def.rare && g.rng() > (g.world.luck === g.world.day ? 0.45 : 0.2)) def = cand.find(c => !c.rare) ?? def; const t = tiles[Math.floor(g.rng() * tiles.length)]; const m = new Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.02, 10), new THREE.MeshBasicNodeMaterial({ color: PALETTE.navy })); const sz = [0.5, 0.75, 1.0, 1.3][def.size ?? 0]; m.scale.set(sz, 1, sz * 0.55); m.position.set(t[0] + 0.5, -0.22, t[1] + 0.5); this.fishGroup.add(m); this.fish.push({ def, x: t[0] + 0.5, z: t[1] + 0.5, a: g.rng() * 6.28, mesh: m, kind, interest: null, speed: 0.5 + g.rng() * 0.6 }); }
    }
  },
  fixed(g, dt) {
    if (!g.world || g.mode === 'title') return; this.init(g);
    const p = g.player.pos; const spook = { run: tuning.spookRun, jog: tuning.spookRun * 0.66, walk: tuning.spookRun * 0.4, tiptoe: tuning.spookRun * 0.17, idle: 0 }[g.player.mode] ?? 0;
    for (const b of this.bugs) {
      if (!b.alive) continue; b.t -= dt;
      const d = Math.hypot(b.x - p.x, b.z - p.z);
      if (b.state === 'rest') { if (d < spook && g.place === 'town') { b.state = 'flee'; b.t = 1.5 + g.rng() * 1.5; const a = Math.atan2(b.z - p.z, b.x - p.x) + (g.rng() - 0.5); b.vx = Math.cos(a) * (b.def.fly ? 3 : 2.2); b.vz = Math.sin(a) * (b.def.fly ? 3 : 2.2); } else if (b.def.fly && b.def.where !== 'flower') { b.x += Math.sin(g.t * 0.7 + b.home[0]) * dt * 0.8; b.z += Math.cos(g.t * 0.6 + b.home[1]) * dt * 0.8; } }
      else if (b.state === 'flee') { b.x += b.vx * dt; b.z += b.vz * dt; if (b.def.fly) b.y = 1 + Math.sin(g.t * 5) * 0.2; if (g.grid.solid(b.x, b.z)) { b.vx *= -1; b.vz *= -1; } if (b.t <= 0) { b.state = 'rest'; b.home = [b.x, b.z, b.def.fly ? 1 : 0.1]; b.y = b.home[2]; } }
    }
    for (const f of this.fish) {
      if (f.interest) { const dx = f.interest.x - f.x, dz = f.interest.z - f.z; const d = Math.hypot(dx, dz); if (d > 0.3) { f.x += dx / d * 1.4 * dt; f.z += dz / d * 1.4 * dt; f.a = Math.atan2(dz, dx); } }
      else { f.a += (Math.sin(g.t * 0.4 + f.x) * 0.5) * dt; const nx = f.x + Math.cos(f.a) * f.speed * dt, nz = f.z + Math.sin(f.a) * f.speed * dt; const t = g.tiles[Math.floor(nz) * TW + Math.floor(nx)]; const k = waterKind(Math.floor(nx), Math.floor(nz)); if ((t === T.WATER || t === T.SEA) && k === f.kind) { f.x = nx; f.z = nz; } else f.a += 2.4; }
    }
  },
  update(g, dt) {
    for (const b of this.bugs) { if (!b.alive) continue; b.mesh.position.set(b.x, b.y + (b.def.fly ? Math.sin(g.t * 6 + b.home[0]) * 0.05 : 0), b.z); if (b.state === 'flee') b.mesh.rotation.y = Math.atan2(b.vx, b.vz); const night = g.sys.time.sky?.night > 0.3; b.mesh.visible = g.place === 'town'; }
    for (const f of this.fish) { f.mesh.position.set(f.x, -0.22, f.z); f.mesh.rotation.y = -f.a; f.mesh.visible = g.place === 'town'; }
    // balloons drift
    for (const bl of this.balloons) { bl.x += bl.vx * dt; bl.z += bl.vz * dt; bl.mesh.position.set(bl.x, 1.0 + Math.sin(g.t * 1.5 + bl.x) * 0.2 + bl.fall, bl.z); bl.mesh.visible = g.place === 'town'; if (bl.x < -2 || bl.x > TW + 2 || bl.z < -2 || bl.z > TD + 2) bl.dead = true; }
    this.balloons = this.balloons.filter(b => { if (b.dead) this.group.remove(b.mesh); return !b.dead; });
  },
  hourly(g, h) { if (h % 2 === 0) { this.spawnBugs(g); this.spawnFish(g); } if (h === 10 || h === 14 || h === 17) this.sendBalloon(g); },
  sendBalloon(g) { if (g.place !== 'town') return; const m = buildBalloon(['red', 'sky', 'lime', 'sand'][Math.floor(g.rng() * 4)]); const z = 6 + g.rng() * 26; const b = { x: -1, z, vx: 1.2, vz: (g.rng() - 0.5) * 0.4, mesh: m, fall: 0, present: ['pear', 'beanbag', 'cheese', 'seedpack'][Math.floor(g.rng() * 4)] }; m.position.set(b.x, 1, z); this.group.add(m); this.balloons.push(b); },
  setNight(g, n) { },
  daily(g) {
    const w = g.world, r = seeded('day', w.seed, w.year, w.day); const season = seasonOf(w.day); const absent = Math.max(0, Math.floor((Date.now() - (w.realStamp ?? Date.now())) / 86400000)); w.absentDays = absent; if (w.town.worn) for (const k of Object.keys(w.town.worn)) { w.town.worn[k] -= 4; if (w.town.worn[k] <= 0) delete w.town.worn[k]; } w.dust = Math.min(8, (w.dust ?? 0) + (absent > 0 ? r.int(1, 3) * absent : 0));
    // weeds
    const nw = tuning.weedsPerDay + Math.min(absent * 3, 30); for (let i = 0; i < nw && w.town.weeds.length < 40; i++) { for (let k = 0; k < 20; k++) { const x = 4 + r.int(0, TW - 8), z = 5 + r.int(0, 32); if (g.tiles[z * TW + x] === T.GRASS && !onHill(x + 0.5, z + 0.5) && !g.grid.solid(x + 0.5, z + 0.5) && !w.town.weeds.find(q => q.x === x && q.z === z) && !w.town.flowers.find(q => q.x === x && q.z === z)) { w.town.weeds.push({ x, z }); break; } } }
    // fruit regrow
    for (const t of w.town.trees) { if (t.kind === 'pear' && !t.felled) { if ((t.fruit ?? 0) < 3) { t.regrow = (t.regrow ?? 0) + 1; if (t.regrow >= Math.max(1, tuning.fruitRegrow)) { t.fruit = 3; t.regrow = 0; } } } if (t.stage < 3 && t.planted != null) { t.age = Math.floor(t.age ?? 0) + 1; t.stage = Math.min(3, t.age); } t.hp = 3; t.wasp = false; t.gift = null; }
    for (const rk of w.town.rocks) rk.hp = 4; w.town.rocks.forEach(x => x.payout = false);
    // one rock pays out, one tree has a wasp nest, one a bag
    const rocks = w.town.rocks.filter(x => !x.gone); if (rocks.length) rocks[r.int(0, rocks.length - 1)].payout = true;
    const trees = w.town.trees.filter(x => !x.felled && x.stage >= 3 && x.kind !== 'palm'); if (trees.length > 2) { trees[r.int(0, trees.length - 1)].wasp = true; trees[r.int(0, trees.length - 1)].gift = 'beanbag'; }
    // cracks and sparkle
    w.town.cracks = []; for (let i = 0; i < 3; i++) for (let k = 0; k < 30; k++) { const x = 4 + r.int(0, TW - 8), z = 5 + r.int(0, 30); if (g.tiles[z * TW + x] === T.GRASS && !onHill(x + 0.5, z + 0.5) && !g.grid.solid(x + 0.5, z + 0.5)) { w.town.cracks.push({ x, z, fossil: true }); break; } }
    for (let k = 0; k < 30; k++) { const x = 4 + r.int(0, TW - 8), z = 5 + r.int(0, 30); if (g.tiles[z * TW + x] === T.GRASS && !onHill(x + 0.5, z + 0.5) && !g.grid.solid(x + 0.5, z + 0.5)) { w.town.cracks.push({ x, z, fossil: false }); break; } }
    const rained = ['rain', 'storm'].includes(dayWeather(season, w.day, w.year, tuning.rainMult).kind); if (rained) for (const f of w.town.flowers) { f.wet = 1; f.wilt = false; f.dry = 0; }
    // flowers: wilt unwatered, hybrids from watered pairs
    for (const f of w.town.flowers) { if (!f.wet) { f.dry = (f.dry ?? 0) + 1; if (f.dry >= 2) f.wilt = true; } else f.dry = 0; }
    const add = []; for (const a of w.town.flowers) for (const b of w.town.flowers) { if (a === b || a.sp !== b.sp || !a.wet || !b.wet || a.wilt || b.wilt) continue; if (Math.abs(a.x - b.x) + Math.abs(a.z - b.z) !== 1) continue; if (r() < tuning.hybridChance) { const x = (a.x + b.x) >> 1 || a.x, z = a.z + 1; const nx = a.x + (b.x - a.x) + (b.x === a.x ? 1 : 0), nz = a.z + (b.z - a.z) + (b.z === a.z ? 1 : 0); const tx = Math.max(a.x, b.x) + 1, tz = a.z; const spot = [[tx, tz], [a.x - 1, a.z], [a.x, a.z + 1], [a.x, a.z - 1]].find(([x2, z2]) => g.tiles[z2 * TW + x2] === T.GRASS && !g.grid.solid(x2 + 0.5, z2 + 0.5) && !w.town.flowers.find(q => q.x === x2 && q.z === z2) && !add.find(q => q.x === x2 && q.z === z2)); if (spot) { add.push({ x: spot[0], z: spot[1], sp: a.sp, col: (a.col + 1 + r.int(0, 2)) % 4, wet: 0, age: 0, hybrid: true }); w.hybridsMade++; } } }
    w.town.flowers.push(...add); for (const f of w.town.flowers) f.wet = 0;
    w.town.items = w.town.items.filter(i => !(i.id === 'shell' && i.beach)); for (let i = 0; i < 6; i++) { const x = 4 + r.int(0, TW - 9), z = 38 + r.int(0, 2); if (g.tiles[z * TW + x] === T.SAND) w.town.items.push({ uid: uid(w), id: r() < 0.15 ? 'driftwood' : 'shell', x: x + 0.5, z: z + 0.5, beach: true }); }
    w.town.items = w.town.items.filter(i => !(i.id === 'mushroom' && i.wild)); if (season === 2 && w.day >= 10) for (let i = 0; i < 5; i++) { for (let k = 0; k < 40; k++) { const x = 3 + r.int(0, TW - 7), z = 4 + r.int(0, 30); if (g.tiles[z * TW + x] === T.GRASS && !onHill(x + 0.5, z + 0.5) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => g.tiles[(z + dz) * TW + x + dx] === T.FOREST || g.tiles[(z + dz) * TW + x + dx] === T.WATER)) { w.town.items.push({ uid: uid(w), id: 'mushroom', x: x + 0.5, z: z + 0.5, wild: true }); break; } } }
    for (const s of w.town.snow ?? []) s.t++;
    this.spawnBugs(g); this.spawnFish(g); g.syncAll();
    // balloons
    for (const b of this.balloons) this.group.remove(b.mesh); this.balloons = [];
  },
};
