// Everything small and alive: fish shadows, bugs, balloons, wasps, birds, snow, the Mayor, Rind, Vesper.
import { THREE, buildModel, ContactShadow, toonMaterial, PALETTE, Boids, setLookLayer, Decals } from '../engine.js';
import { MODELS } from '../art/models.js';
import { Actor } from '../actors/rig.js';
import { CRITTER_DEFS } from '../art/critter.js';
import { tuning } from '../dev/tuning.js';
import { tileChar, tileInfo, waterKind, groundHeight, COLS, ROWS } from '../world/tiles.js';
import { Stream, dayStream } from '../core/rng.js';
import { bugsNow, BUGS } from '../data/bugs.js';
import { fishNow, FISH, OLD_BOOT, FISH_LEN } from '../data/fish.js';
import { LANDMARKS, LAMPS, ACRES } from '../data/town.js';
import { isRaining, hourNow, weatherNow } from './time.js';
import { addItem, hasRoom, addBeans } from './economy.js';
import { revealCatch, drawReveal } from './reveal.js';
import { ITEMS } from '../data/items.js';
import { remember } from './memory.js';
import { cheesePriceNow } from './cheese.js';
import { hostLine } from './lines.js';
import { say, ask } from './say.js';
import { drawText, panel, textWidth } from '../ui/draw.js';
import { FURNITURE } from '../data/furniture.js';
import { ART } from '../data/art.js';

const { Group, Mesh, BoxGeometry, Vector3 } = THREE;
const build = (id, o = {}) => { const obj = buildModel(id, { catalog: MODELS, ...o }).object; setLookLayer(obj, 'actors'); obj.traverse((m) => { if (m.isMesh) m.castShadow = true; }); return obj; };

export class Life {
  constructor(g) {
    this.g = g;
    this.group = new Group();
    g.town.group.add(this.group);
    this.bugs = [];
    this.fish = [];
    this.balloons = [];
    this.wasps = null;
    this.fishing = null;
    this.shots = [];
    this.birds = new Boids(10, { bounds: { min: [0, 6, 0], max: [80, 12, 60] }, seed: 4 });
    this.birdMeshes = [];
    const bm = toonMaterial(PALETTE.ink);
    for (let i = 0; i < 10; i++) { const b = new Mesh(new BoxGeometry(0.34, 0.06, 0.16), bm); this.group.add(b); this.birdMeshes.push(b); }
    this.cloudShadows = [0, 1, 2].map(() => { const s = new ContactShadow(3.4); g.town.group.add(s); return s; });
    this.cloudT = 0;
    this.trundle = new Actor(CRITTER_DEFS.trundle, { name: 'trundle', seed: 7 });
    this.trundle.addTo(g.town.group);
    this.trundle.play('MayorSlide', 0);
    this.rind = new Actor(CRITTER_DEFS.rind, { name: 'rind', seed: 9 });
    this.rind.addTo(g.town.group);
    this.rindStall = build('rind-stall');
    this.rindStall.position.set(LANDMARKS.stallSpot[0], 0, LANDMARKS.stallSpot[1] - 1.1);
    g.town.group.add(this.rindStall);
    this.rind.x = LANDMARKS.stallSpot[0]; this.rind.z = LANDMARKS.stallSpot[1] - 0.1;
    this.vesper = new Actor(CRITTER_DEFS.vesper, { name: 'vesper', seed: 2 });
    this.vesper.addTo(g.town.group);
    this.vesper.x = LANDMARKS.vesperLamp[0]; this.vesper.z = LANDMARKS.vesperLamp[1] + 0.45;
    this.vesper.y = 2.1; // hanging from the lamp
    this.vesper.play('VesperHang', 0);
    this.vesper.scale = 0.72;
    this.ribbon = build('ribbon-posts');
    this.ribbon.position.set(LANDMARKS.ribbon[0], 0, LANDMARKS.ribbon[1]);
    g.town.group.add(this.ribbon);
    this.bobber = build('crack-mark');
    this.bobber.visible = false;
    this.bobberMesh = new Group();
    const b1 = new Mesh(new BoxGeometry(0.16, 0.12, 0.16), toonMaterial(PALETTE.red)); const b2 = new Mesh(new BoxGeometry(0.16, 0.08, 0.16), toonMaterial(PALETTE.white)); b2.position.y = 0.1;
    this.bobberMesh.add(b1, b2);
    this.bobberMesh.visible = false;
    g.town.group.add(this.bobberMesh);
    this.bites = 0;
    this.lastHour = -1;
    this.footT = 0;
    g.ctx.particles.register('dirt', { count: [6, 10], life: [0.3, 0.6], speed: [1.5, 3], gravity: 8, size: [1, 2], colors: ['plum', 'orange', 'night'], spread: 50 });
    g.ctx.particles.register('leaf', { count: [8, 14], life: [0.8, 1.4], speed: [0.6, 1.8], gravity: 1.2, size: [1, 1], colors: ['green', 'lime', 'orange'], spread: 120 });
    g.ctx.particles.register('splash', { count: [8, 14], life: [0.25, 0.5], speed: [1.5, 2.8], gravity: 9, size: [1, 1], colors: ['white', 'cyan', 'sky'], spread: 40 });
    g.ctx.particles.register('hearts', { count: [4, 6], life: [0.8, 1.1], speed: [0.4, 0.9], gravity: -0.7, size: [1, 2], colors: ['red', 'orange'], spread: 40 });
    g.ctx.particles.register('note', { count: [1, 2], life: [0.9, 1.3], speed: [0.3, 0.6], gravity: -0.7, size: [1, 1], colors: ['sand', 'white'], spread: 30 });
    g.ctx.particles.register('firework', { count: [40, 60], life: [0.7, 1.1], speed: [3, 5.5], gravity: 2, drag: 0.8, size: [1, 2], colors: ['red', 'sand', 'white'], spread: 180 });
    g.ctx.particles.register('flame', { count: [3, 5], life: [0.3, 0.6], speed: [0.6, 1.2], gravity: -1.5, size: [1, 1], colors: ['sand', 'orange', 'red'], spread: 20 });
    g.ctx.particles.register('petal', { count: [1, 1], life: [2.2, 3.4], speed: [0.2, 0.5], gravity: 0.25, size: [1, 1], colors: ['orange', 'white'], spread: 90 });
    g.ctx.particles.register('fall', { count: [1, 1], life: [2, 3.2], speed: [0.3, 0.6], gravity: 0.35, size: [1, 1], colors: ['orange', 'red', 'sand'], spread: 90 });
    g.ctx.particles.register('fly', { count: [1, 1], life: [1.2, 2.2], speed: [0.1, 0.3], gravity: -0.1, size: [1, 1], colors: ['lime', 'sand', 'lime'], spread: 180 });
    this.placeSpecials();
  }
  // ---- Day -----------------------------------------------------------------------------------------
  resetDay() {
    this.spawnFish();
    this.spawnBugs();
    this.planBalloons();
    this.placeSpecials();
    this.magda = null;
    this.lot = null;
    this.endFishing();
  }
  placeChanged() {
    const g = this.g;
    const inTown = g.place === g.town;
    this.group.visible = inTown;
    this.endFishing();
    if (!inTown) { for (const b of this.bugs) b.mesh && (b.mesh.visible = false); } else this.placeSpecials();
  }
  // ---- Fish ----------------------------------------------------------------------------------------
  spawnFish() {
    const g = this.g;
    for (const f of this.fish) f.mesh.removeFromParent();
    this.fish = [];
    const w = g.world;
    const rng = dayStream(w, 'fish');
    const n = tuning.fishPerAcre;
    for (let az = 0; az < 4; az++) for (let ax = 0; ax < 5; ax++) {
      const spots = [];
      for (let z = az * 16; z < (az + 1) * 16 && z < ROWS - 1; z++) for (let x = ax * 16; x < (ax + 1) * 16; x++) {
        const k = waterKind(x + 0.5, z + 0.5);
        if (k && !tileInfo(tileChar(x, z)).high) spots.push([x, z, k]);
      }
      if (spots.length < 6) continue;
      for (let i = 0; i < n; i++) {
        const [x, z, kind] = rng.pick(spots);
        this.addFish(x + 0.5, z + 0.5, kind, rng);
      }
    }
  }
  addFish(x, z, kind, rng) {
    const g = this.g;
    const def = this.rollFish(kind, rng);
    const size = def.size ?? 'S';
    const s = new ContactShadow({ S: 0.22, M: 0.34, L: 0.48, XL: 0.66 }[size]);
    g.town.group.add(s);
    this.fish.push({ x, z, kind, def, vx: 0, vz: 0, t: rng.range(0, 9), mesh: s, state: 'drift', home: [x, z], y: -0.27 });
  }
  rollFish(kind, rng) {
    const g = this.g;
    const h = hourNow(g.world);
    const list = fishNow(kind, g.season, h);
    if (!list.length) return OLD_BOOT;
    if (rng.chance(0.08)) return OLD_BOOT;
    const luck = g.world.player.luck === 'fish' ? 2 : 1;
    return rng.weighted(list, (f) => (f.rare ? 0.09 * luck : 1) / Math.max(1, Math.sqrt(f.beans / 200)));
  }
  updateFish(dt) {
    const g = this.g;
    const p = g.player;
    for (const f of this.fish) {
      f.t += dt;
      if (f.state === 'drift') {
        const nx = f.x + Math.cos(f.t * 0.3) * dt * 0.34;
        const nz = f.z + Math.sin(f.t * 0.23 + 1) * dt * 0.34;
        if (waterKind(nx, nz) === f.kind) { f.x = nx; f.z = nz; }
      } else if (f.state === 'come') {
        const b = this.fishing;
        if (!b) { f.state = 'drift'; continue; }
        const dx = b.x - f.x, dz = b.z - f.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.55) { f.x += (dx / d) * dt * 1.0; f.z += (dz / d) * dt * 1.0; }
      } else if (f.state === 'flee') {
        const dx = f.x - f.fx, dz = f.z - f.fz;
        const d = Math.hypot(dx, dz) || 1;
        const nx = f.x + (dx / d) * dt * 4, nz = f.z + (dz / d) * dt * 4;
        if (waterKind(nx, nz)) { f.x = nx; f.z = nz; }
        f.fleeT -= dt;
        if (f.fleeT <= 0) f.state = 'drift';
      }
      f.mesh.place(f.x, f.y, f.z, 0);
    }
    // Fishing state machine runs on game time
    const fi = this.fishing;
    if (fi) this.updateFishing(fi, dt);
  }
  cast() {
    const g = this.g;
    const p = g.player;
    const fx = Math.sin(p.facing), fz = Math.cos(p.facing);
    let tx = null, tz = null;
    const hp = g.interact.hoverPoint;
    if (hp && waterKind(hp.x, hp.z)) { tx = hp.x; tz = hp.z; p.facing = Math.atan2(tx - p.x, tz - p.z); }
    else for (const r of [2.6, 2.2, 3, 1.6, 3.5]) { const x = p.x + fx * r, z = p.z + fz * r; const c = tileChar(Math.floor(x), Math.floor(z)); const inf = tileInfo(c); if (inf.water && !inf.high) { tx = x; tz = z; break; } }
    p.pose('Cast');
    g.sound('cast');
    if (tx === null) { g.scripts.run((function* () { yield 0.5; g.ui.toastMsg('You need to cast at water.'); })(), { name: 'castMiss', hold: false }); return; }
    const kind = waterKind(tx, tz);
    this.fishing = { x: tx, z: tz, kind, state: 'flying', t: 0.45, nibbles: 0, target: null, wait: 0 };
    this.bobberMesh.visible = true;
    this.bobberMesh.position.set(tx, -0.2, tz);
    g.events.emit('cast', {});
  }
  updateFishing(fi, dt) {
    const g = this.g;
    const p = g.player;
    fi.t -= dt;
    this.bobberMesh.position.y = -0.22 + Math.sin(g.ctx.time * 4) * 0.015 - (fi.dip ?? 0);
    if (fi.dip > 0) fi.dip = Math.max(0, fi.dip - dt * 0.6);
    if (g.world.clock.mode === 'village' && Math.hypot(fi.x - p.x, fi.z - p.z) > 6) { this.endFishing(); return; }
    switch (fi.state) {
      case 'flying':
        if (fi.t <= 0) {
          g.sound('plop');
          g.ctx.particles.burst('splash', [fi.x, -0.2, fi.z], { count: 6 });
          p.play('Reel', 0.1);
          fi.state = 'wait';
          // a nearby shadow turns and comes
          let best = null, bd = 7;
          for (const f of this.fish) { if (f.kind !== fi.kind && !(fi.kind === 'sea' && f.kind === 'mouth')) continue; const d = Math.hypot(f.x - fi.x, f.z - fi.z); if (d < bd) { bd = d; best = f; } }
          if (!best) { const rng = new Stream(`${g.world.seed}:spawnfish:${g.ctx.time}`); this.addFish(fi.x + rng.range(-1.5, 1.5), fi.z + rng.range(-1.5, 1.5), fi.kind, rng); best = this.fish[this.fish.length - 1]; if (!waterKind(best.x, best.z)) { best.x = fi.x; best.z = fi.z; } }
          fi.target = best;
          best.state = 'come';
          fi.t = 1.2 + bd * 0.4;
          const rng = new Stream(`${g.world.seed}:nib:${g.ctx.time}`);
          best.def = this.rollFish(best.kind, rng);
          fi.nibblesPlanned = rng.int(1, Math.max(1, tuning.maxNibbles));
          if (tuning.maxNibbles === 0) fi.nibblesPlanned = 0;
        }
        break;
      case 'wait':
        if (fi.t <= 0) {
          if (fi.nibbles < fi.nibblesPlanned) {
            fi.nibbles++;
            fi.dip = 0.07;
            g.sound('nibble');
            g.rumble(0.12, 60);
            g.events.emit('nibble', {});
            fi.t = 0.7 + ((fi.nibbles * 37) % 13) / 10;
          } else {
            fi.state = 'bite';
            fi.t = tuning.biteWindow;
            fi.dip = 0.4;
            this.bobberMesh.position.y = -0.5;
            g.sound('bite');
            g.rumble(0.9, 200);
            g.ctx.particles.burst('splash', [fi.x, -0.15, fi.z], { count: 14 });
            g.bangT = 0.7;
            g.events.emit('bite', {});
          }
        }
        break;
      case 'bite':
        if (fi.t <= 0) {
          fi.state = 'missed';
          if (fi.target) { fi.target.state = 'flee'; fi.target.fx = fi.x; fi.target.fz = fi.z; fi.target.fleeT = 1.4; }
          g.ui.toastMsg('It got away. It will tell the others.');
          this.endFishing();
        }
        break;
      default: break;
    }
  }
  reel() {
    const g = this.g;
    const fi = this.fishing;
    if (!fi) return;
    const p = g.player;
    if (fi.state === 'bite') {
      const f = fi.target;
      const def = f?.def ?? OLD_BOOT;
      if (f) { f.mesh.removeFromParent(); this.fish.splice(this.fish.indexOf(f), 1); }
      g.sound('reelIn');
      g.sound('splash');
      g.ctx.particles.burst('splash', [fi.x, -0.15, fi.z]);
      this.endFishing();
      g.scripts.run((function* (life) {
        yield 0.2;
        if (!hasRoom(g.world)) { g.ui.toastMsg('Your pockets are full. It looks relieved.'); return; }
        addItem(g, def.id);
        if (def.id === 'oldBoot') remember(g, 'boot', {});
        else if ((def.beans ?? 0) >= 1500) remember(g, 'bigCatch', { catch: def.name });
        else if (g.world.stats.fish % 3 === 0) remember(g, 'catch', { catch: def.name });
        g.festivals.onCaught?.(def);
        yield* revealCatch(g, def.id, def.line, 'fish');
      })(this), { name: 'fishCatch' });
      return;
    }
    // reeling early scares it
    if (fi.target) { fi.target.state = 'flee'; fi.target.fx = fi.x; fi.target.fz = fi.z; fi.target.fleeT = 1.2; }
    g.sound('reelIn');
    this.endFishing();
  }
  endFishing() {
    this.fishing = null;
    this.bobberMesh.visible = false;
    const p = this.g.player;
    if (p?.playing === 'Reel') { p.play('Idle', 0.15); }
  }
  // ---- Bugs ----------------------------------------------------------------------------------------
  spawnBugs() {
    const g = this.g;
    for (const b of this.bugs) b.mesh?.removeFromParent();
    this.bugs = [];
    const w = g.world;
    const h = hourNow(w);
    const rng = new Stream(`${w.seed}:bugs:${w.clock.day}:${Math.floor(h / 3)}`);
    const list = bugsNow(g.season, h, isRaining(g));
    if (!list.length) return;
    const total = Math.round(20 * tuning.bugsPerAcre);
    const trunks = Object.keys(w.town.objects).filter((k) => w.town.objects[k].k === 'tree');
    const flowers = Object.keys(w.town.objects).filter((k) => w.town.objects[k].k === 'flower');
    const rocks = Object.keys(w.town.objects).filter((k) => w.town.objects[k].k === 'rock');
    for (let i = 0; i < total; i++) {
      const def = rng.weighted(list, (b) => (b.rare ? 0.08 : 1));
      let at = null;
      if (def.spot === 'flower' && flowers.length) at = rng.pick(flowers).split(',').map(Number);
      else if (def.spot === 'trunk' && trunks.length) at = rng.pick(trunks).split(',').map(Number);
      else if (def.spot === 'rock' && rocks.length) at = rng.pick(rocks).split(',').map(Number);
      else if (def.spot === 'lamp') { const l = rng.pick(LAMPS); at = [Math.floor(l[0]), Math.floor(l[1])]; }
      else {
        for (let t = 0; t < 40 && !at; t++) {
          const x = rng.int(3, 76), z = rng.int(3, 56);
          const inf = tileInfo(tileChar(x, z));
          if (def.spot === 'water' && inf.water && !inf.high && inf.water !== 'sea') at = [x, z];
          else if (def.spot === 'near' && inf.walk && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => tileInfo(tileChar(x + a, z + b)).water)) at = [x, z];
          else if ((def.spot === 'grass' || def.spot === 'snow') && inf.walk && inf.surface === 'lawn') at = [x, z];
        }
      }
      if (!at) continue;
      this.addBug(def, at[0] + 0.5, at[1] + 0.5, rng);
    }
  }
  addBug(def, x, z, rng) {
    const m = def.kind === 'flier'
      ? build('winged', { params: { size: def.id === 'firefly' ? 0.2 : 0.42 }, palette: { wing: def.color, spot: 'ink', body: 'ink' } })
      : build('bug', { params: { size: 0.26 }, palette: { body: def.color } });
    const y0 = groundHeight(x, z);
    const b = { def, x, z, y: y0 + (def.kind === 'flier' ? 0.9 : def.spot === 'trunk' ? 0.9 : 0.05), y0, mesh: m, t: rng ? rng.range(0, 9) : 0, cx: x, cz: z, spooked: false, gone: false, kind: def.kind };
    if (def.spot === 'lamp') b.y = y0 + 1.9;
    if (def.spot === 'water') b.y = -0.25;
    m.position.set(x, b.y, z);
    this.group.add(m);
    this.bugs.push(b);
    return b;
  }
  catchBug(b) {
    const g = this.g;
    b.gone = true;
    b.mesh.removeFromParent();
    this.bugs.splice(this.bugs.indexOf(b), 1);
    g.ctx.particles.burst('sparkle', [b.x, b.y, b.z], { count: 8 });
    if (hasRoom(g.world)) addItem(g, b.def.id);
    else g.ui.toastMsg('Your pockets are full. It waves goodbye, in its way.');
    g.festivals.onCaught?.(b.def);
  }
  updateBugs(dt) {
    const g = this.g;
    const p = g.player;
    const spook = p.speed > 5 ? tuning.spookRun : p.speed > 3.2 ? 2 : p.speed > 1.5 ? 1.2 : 0.5;
    const inTown = g.place === g.town;
    for (const b of this.bugs.slice()) {
      b.t += dt;
      const d = inTown ? Math.hypot(b.x - p.x, b.z - p.z) : 99;
      const near = d < 18;
      b.mesh.visible = near && inTown;
      if (!near) continue;
      if (d < spook && p.speed > 0.5 && !b.spooked) { b.spooked = true; b.spookT = 1.4; b.fx = (b.x - p.x) / Math.max(0.1, d); b.fz = (b.z - p.z) / Math.max(0.1, d); g.events.emit('spook', {}); }
      if (b.spooked) {
        b.x += b.fx * dt * 5; b.z += b.fz * dt * 5; b.y += dt * (b.kind === 'flier' ? 2 : 0);
        b.spookT -= dt;
        if (b.spookT <= 0) { b.mesh.removeFromParent(); this.bugs.splice(this.bugs.indexOf(b), 1); continue; }
      } else if (b.kind === 'flier') {
        b.x = b.cx + Math.sin(b.t * 0.9) * 1.1; b.z = b.cz + Math.cos(b.t * 0.7 + 1) * 1.1;
        b.y = b.y0 + 0.9 + Math.abs(Math.sin(b.t * 2.2)) * 0.4 + (b.def.spot === 'lamp' ? 1 : 0);
      } else if (b.kind === 'crawler') {
        b.x = b.cx + Math.sin(b.t * 0.5) * 0.4;
      }
      b.mesh.position.set(b.x, b.y, b.z);
      if (b.kind === 'flier') {
        const wl = b.mesh.getObjectByName('WingL'), wr = b.mesh.getObjectByName('WingR');
        const flap = Math.sin(b.t * 24) * 0.9;
        if (wl) wl.rotation.z = flap;
        if (wr) wr.rotation.z = -flap;
        b.mesh.rotation.y = Math.cos(b.t * 0.9) * 1.1;
      }
    }
  }
  // ---- Balloons ------------------------------------------------------------------------------------
  planBalloons() {
    const g = this.g;
    for (const b of this.balloons) b.mesh.removeFromParent();
    this.balloons = [];
    const w = g.world;
    const rng = dayStream(w, 'balloons');
    this.balloonPlan = [];
    for (let i = 0; i < tuning.balloonsPerDay; i++) this.balloonPlan.push({ at: rng.int(7, 20) * 60 + rng.int(0, 50), z: rng.int(14, 50), gift: rng.pick(['bagOfBeans', 'boxedGift', 'cottageSide', 'plainGreen', 'seedRose', 'stationery', 'mossyPlant', 'capBlue']) });
  }
  launchBalloon(plan) {
    const g = this.g;
    const m = build('balloon', { palette: { a: ['red', 'sky', 'lime', 'orange'][plan.z % 4] } });
    const b = { x: -2, z: plan.z, y: 5.2, mesh: m, gift: plan.gift, t: 0 };
    m.position.set(b.x, b.y, b.z);
    this.group.add(m);
    this.balloons.push(b);
    g.events.emit('balloon', {});
    return b;
  }
  balloonAhead() {
    const g = this.g;
    const p = g.player;
    const hp = g.interact.hoverPoint;
    let best = null, bs = 1e9;
    const fx = Math.sin(p.facing), fz = Math.cos(p.facing);
    for (const b of this.balloons) {
      const dx = b.x - p.x, dz = b.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > 14) continue;
      const dot = (dx * fx + dz * fz) / (d || 1);
      const s = hp ? Math.hypot(b.x - hp.x, b.z - hp.z) : d - dot * 8;
      if (s < bs) { bs = s; best = b; }
    }
    return best;
  }
  fireShot(target) {
    const g = this.g;
    const p = g.player;
    const m = new Mesh(new BoxGeometry(0.12, 0.12, 0.12), toonMaterial(PALETTE.ink));
    const fx = Math.sin(p.facing), fz = Math.cos(p.facing);
    m.position.set(p.x + fx * 0.4, p.y + 1.1, p.z + fz * 0.4);
    this.group.add(m);
    const aim = target ? new Vector3(target.x, target.y + 1.3, target.z) : new Vector3(p.x + fx * 10, p.y + 6, p.z + fz * 10);
    this.shots.push({ m, vx: 0, vy: 0, vz: 0, aim, target, t: 0 });
    g.events.emit('shot', { hit: !!target });
  }
  updateBalloons(dt) {
    const g = this.g;
    const minute = g.world.clock.minute;
    for (const plan of this.balloonPlan ?? []) if (!plan.done && minute >= plan.at) { plan.done = true; this.launchBalloon(plan); }
    for (const b of this.balloons.slice()) {
      b.t += dt;
      b.x += dt * 1.0;
      b.y = 5.2 + Math.sin(b.t * 0.8) * 0.3;
      b.mesh.position.set(b.x, b.y, b.z);
      if (b.x > 82) { b.mesh.removeFromParent(); this.balloons.splice(this.balloons.indexOf(b), 1); }
    }
    for (const s of this.shots.slice()) {
      s.t += dt;
      const to = s.target ? new Vector3(s.target.x, s.target.y + 1.3, s.target.z) : s.aim;
      const d = to.clone().sub(s.m.position);
      const len = d.length();
      const step = dt * 22;
      if (len <= step + 0.2 || s.t > 1.2) {
        s.m.removeFromParent();
        this.shots.splice(this.shots.indexOf(s), 1);
        if (s.target && this.balloons.includes(s.target)) this.popBalloon(s.target);
        continue;
      }
      s.m.position.addScaledVector(d, step / len);
    }
  }
  popBalloon(b) {
    const g = this.g;
    g.sound('pop');
    g.ctx.particles.burst('sparkle', [b.x, b.y + 1.3, b.z], { count: 14, colors: ['white', 'red', 'sand'] });
    b.mesh.removeFromParent();
    this.balloons.splice(this.balloons.indexOf(b), 1);
    // It falls somewhere awkward: the nearest free tile
    const w = g.world;
    let spot = null;
    for (let r = 0; r < 12 && !spot; r++) for (let dz = -r; dz <= r && !spot; dz++) for (let dx = -r; dx <= r && !spot; dx++) {
      const x = Math.floor(b.x) + dx, z = Math.floor(b.z) + dz;
      const inf = tileInfo(tileChar(x, z));
      if (inf.walk && !w.town.objects[`${x},${z}`] && !g.town.solid[z * COLS + x]) spot = [x, z];
    }
    if (spot) {
      w.town.objects[`${spot[0]},${spot[1]}`] = { k: 'drop', item: b.gift };
      g.town.dirty.add(`${spot[0]},${spot[1]}`);
    }
    w.stats.balloons = (w.stats.balloons ?? 0) + 1;
    g.events.emit('balloonPopped', { gift: b.gift });
  }
  // ---- Trees, rocks, wasps -------------------------------------------------------------------------
  hitRock(x, z, o) {
    const g = this.g;
    const w = g.world;
    o.hits = (o.hits ?? 0) + 1;
    g.ctx.particles.burst('sparkle', [x + 0.5, 0.6, z + 0.5], { count: 6, colors: ['mist', 'white'] });
    const v = g.town.objectViews.get(`${x},${z}`);
    if (v) g.ctx.tweens.value(0, 1, { duration: 0.22 }, (t) => { v.scale.setScalar(1 + Math.sin(t * 12) * 0.05 * (1 - t)); });
    if (o.pays && o.hits <= 5) {
      addBeans(g, 300 + o.hits * 100, 'rock');
      g.sound('bean');
      g.ui.toastMsg(`The rock coughs up ${300 + o.hits * 100} beans.`);
      g.events.emit('rockPaid', {});
    } else if (o.hits === 1 && !o.pillOut) {
      o.pillOut = true;
      const pill = BUGS.find((b) => b.id === 'pillBug');
      const b = this.addBug(pill, x + 1.1, z + 0.5, new Stream(`${w.seed}:${x}:${z}`));
      g.events.emit('pillBug', { b });
    }
  }
  shakeTree(k, o) {
    const g = this.g;
    const w = g.world;
    const [x, z] = k.split(',').map(Number);
    const v = g.town.objectViews.get(k);
    if (v) g.ctx.tweens.value(0, 1, { duration: 0.8 }, (t) => { v.rotation.z = Math.sin(t * 26) * 0.05 * (1 - t); v.rotation.x = Math.cos(t * 20) * 0.03 * (1 - t); });
    g.sound('shakeTree');
    g.ctx.particles.burst('leaf', [x + 0.5, 2.6, z + 0.5], { count: 10, colors: g.season === 2 ? ['orange', 'red'] : g.season === 3 ? ['white'] : g.season === 0 ? ['orange', 'white'] : ['green', 'lime'] });
    const out = [];
    const dropAround = (item) => {
      for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const tx = x + dx, tz = z + dz;
        const nk = `${tx},${tz}`;
        const inf = tileInfo(tileChar(tx, tz));
        if (inf.walk && !w.town.objects[nk] && !g.town.solid[tz * COLS + tx]) { w.town.objects[nk] = { k: 'drop', item }; g.town.dirty.add(nk); out.push(item); g.sound('fruitDrop'); return true; }
      }
      return false;
    };
    if ((o.fruit ?? 0) > 0 && g.season !== 3) {
      const item = o.fruitItem ?? (o.kind === 'palm' ? 'coconut' : 'pear');
      for (let i = 0; i < o.fruit; i++) dropAround(item);
      o.fruit = 0;
      o.regrow = w.clock.day + tuning.fruitRegrow;
      g.town.dirty.add(k);
    }
    if (o.hasBag) { dropAround('bagOfBeans'); o.hasBag = false; }
    if (o.hasFurniture) { const pool = FURNITURE.filter((f) => !f.notForSale && !f.rare); dropAround(new Stream(`${w.seed}:treefurn:${w.clock.day}:${k}`).pick(pool).id); o.hasFurniture = false; }
    g.events.emit('shake', { k, out });
    if (o.wasp) { o.wasp = false; g.town.dirty.add(k); this.startWasps(x + 0.5, z + 0.5); }
  }
  startWasps(x, z) {
    const g = this.g;
    if (this.wasps) return;
    const g2 = new Group();
    for (let i = 0; i < 5; i++) { const m = new Mesh(new BoxGeometry(0.1, 0.08, 0.14), toonMaterial(PALETTE.sand)); g2.add(m); }
    this.group.add(g2);
    this.wasps = { x, z, y: 1.8, t: 0, mesh: g2, life: 9, sound: 0 };
    g.events.emit('wasps', {});
    g.ui.toastMsg('Wasps! Run. Or be stung. Those are the options.');
  }
  netWasps() { const g = this.g; if (this.wasps) { this.wasps.mesh.removeFromParent(); this.wasps = null; g.ui.toastMsg('You caught the wasps. They are now your problem, in a jar.'); g.events.emit('waspsCaught', {}); } }
  waspsNear(x, z) { const w = this.wasps; return !!w && Math.hypot(w.x - x, w.z - z) < 1.8; }
  updateWasps(dt) {
    const w = this.wasps;
    if (!w) return;
    const g = this.g;
    const p = g.player;
    w.t += dt; w.life -= dt; w.sound -= dt;
    if (w.sound <= 0) { w.sound = 0.5; g.sound('waspBuzz', { volume: 0.7 }); }
    const dx = p.x - w.x, dz = p.z - w.z;
    const d = Math.hypot(dx, dz);
    const sp = 3.3;
    if (g.place === g.town && d > 0.01) { w.x += (dx / d) * sp * dt; w.z += (dz / d) * sp * dt; }
    w.mesh.children.forEach((m, i) => { const a = w.t * 8 + i * 1.3; m.position.set(w.x + Math.cos(a) * 0.5, w.y - 0.5 + Math.sin(a * 1.3) * 0.3, w.z + Math.sin(a) * 0.5); });
    if (g.place === g.town && d < 0.6 && g.canAct()) {
      this.sting();
    } else if (w.life <= 0 || g.place !== g.town) { w.mesh.removeFromParent(); this.wasps = null; }
  }
  sting() {
    const g = this.g;
    const w = g.world;
    this.wasps.mesh.removeFromParent();
    this.wasps = null;
    w.player.puffy = true;
    w.flags.stungDay = w.clock.day;
    w.stats.stings = (w.stats.stings ?? 0) + 1;
    remember(g, 'sting', {});
    g.sound('sting');
    g.rumble(0.8, 240);
    if (g.settings.shake) g.engine.shake.add(0.3);
    g.player.pose('Sting');
    if (g.player.eyeL) g.player.eyeL.scale.x = 1.8;
    g.applyPuffy?.();
    g.events.emit('sting', {});
    g.ui.toastMsg('Stung! Your face has been reorganised. Medicine, or morning.');
  }
  // ---- The Mayor, Old Rind, Vesper -----------------------------------------------------------------
  placeSpecials() {
    const g = this.g;
    const w = g.world;
    const c = g.cal;
    // Mayor Trundle advances each day; arrives on Festival Day of spring
    const d = Math.min(1, (((w.clock.day - 1) % 16) + (w.clock.minute - 300) / 1140) / 3.8);
    const [rx, rz] = LANDMARKS.ribbon;
    const start = 17;
    const arrived = w.clock.day >= 4;
    this.trundle.x = arrived ? rx - 1.2 - ((w.clock.day - 4) * 0.8) % 12 : start + (rx - 1.2 - start) * d;
    this.trundle.z = rz; this.trundle.y = 0;
    this.trundle.facing = arrived && w.flags.mayorArrived ? -Math.PI / 2 : Math.PI / 2;
    const rindHere = (c.market && w.clock.minute >= 360 && w.clock.minute < 720) || w.flags.rindForced;
    this.rindHere = rindHere;
    this.rind.visible = rindHere;
    this.rindStall.visible = rindHere;
    const vesperOn = (c.show || w.flags.vesperForced) && w.clock.minute >= 19 * 60 && w.clock.minute < 23.5 * 60;
    this.vesperOn = vesperOn;
    this.vesper.visible = vesperOn;
    if (this.ribbon) this.ribbon.visible = !w.flags.ribbonGone;
  }
  interactables() {
    const g = this.g;
    const out = [];
    if (g.place !== g.town) return out;
    const t = this.trundle;
    out.push({ id: 'mayor', x: t.x, z: t.z, r: 1.4, label: 'Talk to Mayor Trundle', act: 'mayorTalk' });
    if (this.rindHere) out.push({ id: 'rind', x: this.rind.x, z: this.rind.z, r: 1.7, label: 'Talk to Old Rind', act: 'rindTalk' });
    if (this.vesperOn) out.push({ id: 'vesper', x: this.vesper.x, z: this.vesper.z, r: 2, label: 'Talk to Vesper', act: 'vesperTalk' });
    for (const b of this.bugs) if (b.mesh && false) out.push(b);
    return out;
  }
  // ---- Footprints, worn paths ---------------------------------------------------------------------
  onStep(x, z) {
    const g = this.g;
    if (g.place !== g.town) return;
    const w = g.world;
    const k = `${Math.floor(x)},${Math.floor(z)}`;
    w.stats.walked += 1;
    w.town.wear[k] = (w.town.wear[k] ?? 0) + (g.player.speed > 5 ? 2 : 1);
    if (w.town.wear[k] > 26 && !w.town.worn[k]) {
      const c = tileChar(Math.floor(x), Math.floor(z));
      if (tileInfo(c).surface === 'lawn') { w.town.worn[k] = 1; g.town.terrain.rebuildTile(Math.floor(x), Math.floor(z)); g.events.emit('worn', { k }); }
    }
    if (g.season === 3 && tileInfo(tileChar(Math.floor(x), Math.floor(z))).surface === 'lawn') {
      g.town.decals.add('footprint', { x, y: g.town.height(x, z) + 0.02, z }, { x: 0, y: 1, z: 0 }, { size: 0.3, rotation: g.player.facing, color: 0x94b0c2, life: 30 });
    }
    // Running tramples flowers
    if (g.player.speed > 5) { const o = w.town.objects[k]; if (o?.k === 'flower') { o.wilt = 3; g.town.dirty.add(k); g.events.emit('trampled', {}); } }
    // Snowballs get pushed
    g.pushing = false;
  }
  updateSnow(dt) {
    const g = this.g;
    const w = g.world;
    if (g.season !== 3 || g.place !== g.town) { g.pushing = false; return; }
    const p = g.player;
    let pushed = false;
    for (const s of Object.keys(w.town.objects)) {
      const o = w.town.objects[s];
      if (o.k !== 'snowball') continue;
      const dx = o.x - p.x, dz = o.z - p.z;
      const d = Math.hypot(dx, dz);
      const r = 0.3 + o.size * 0.5;
      if (d < r + 0.05 && p.speed > 0.2) {
        const nx = o.x + (dx / (d || 1)) * dt * p.speed * 0.8;
        const nz = o.z + (dz / (d || 1)) * dt * p.speed * 0.8;
        if (!g.town.blocked(nx, nz)) {
          o.x = nx; o.z = nz;
          o.size = Math.min(1.5, o.size + dt * 0.08);
          pushed = true;
          const v = g.town.objectViews.get(s);
          if (v) { v.position.set(o.x, groundHeight(o.x, o.z), o.z); v.children[0].scale.setScalar(o.size); v.children[0].rotation.x += dt * p.speed; }
        }
      }
    }
    if (pushed) { this.pushSound = (this.pushSound ?? 0) - dt; if (this.pushSound <= 0) { this.pushSound = 0.25; g.sound('snowPush'); } }
    g.pushing = pushed;
    // Two balls near each other make a snowman
    const balls = Object.entries(w.town.objects).filter(([, o]) => o.k === 'snowball');
    for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
      const [ka, a] = balls[i], [kb, b] = balls[j];
      if (Math.hypot(a.x - b.x, a.z - b.z) > (a.size + b.size) * 0.5 + 0.1) continue;
      const big = a.size >= b.size ? a : b;
      const small = big === a ? b : a;
      const ratio = small.size / big.size;
      const tx = Math.floor(big.x), tz = Math.floor(big.z);
      delete w.town.objects[ka]; delete w.town.objects[kb];
      g.town.dirty.add(ka); g.town.dirty.add(kb);
      const nk = `${tx},${tz}`;
      const good = ratio > 0.55 && ratio < 0.85 && big.size > 0.7;
      w.town.objects[nk] = { k: 'snowman', ratio, good, big: big.size, day: w.clock.day };
      g.town.dirty.add(nk);
      g.sound('snowPlop');
      g.events.emit('snowman', { ratio, good, big: big.size });
      g.festivals.onSnowman?.(ratio, big.size);
      return;
    }
  }
  spawnSnowballs() {
    const g = this.g;
    const w = g.world;
    const rng = dayStream(w, 'snowballs');
    for (let i = 0; i < 6; i++) {
      const x = rng.int(3, 76), z = rng.int(17, 46);
      const k = `${x},${z}`;
      if (tileInfo(tileChar(x, z)).surface === 'lawn' && !w.town.objects[k] && !g.town.solid[z * COLS + x]) { w.town.objects[k] = { k: 'snowball', x: x + 0.5, z: z + 0.5, size: 0.4 + (i % 3) * 0.2 }; g.town.dirty.add(k); }
    }
  }
  // ---- Cheese and venue helpers ---------------------------------------------------------------------
  cheesePrice() { return cheesePriceNow(this.g); }
  magdaStock() {
    const g = this.g;
    const w = g.world;
    if (this.magda?.day === w.clock.day) return this.magda.list;
    const s = new Stream(`${w.seed}:magda:${w.clock.day}`);
    const pool = s.shuffle(ART);
    const list = pool.slice(0, 3).map((a, i) => ({ id: s.chance(0.5) ? `${a.id}F` : a.id, base: a.id, price: Math.round(a.beans * 1.6 + i * 200) }));
    this.magda = { day: w.clock.day, list };
    return list;
  }
  auctionLot() { return this.g.auction?.current ?? null; }
  // ---- Frame ---------------------------------------------------------------------------------------
  fixedStep(dt) {
    this.updateFish(dt);
    if (this.g.place === this.g.town) this.updateWasps(dt);
    this.updateBalloons(dt);
    this.updateSnow(dt);
  }
  presentation(dt) {
    const g = this.g;
    this.updateBugs(dt);
    // birds
    this.birds.step(dt);
    for (let i = 0; i < 10; i++) {
      const m = this.birdMeshes[i];
      m.position.set(this.birds.pos[i * 3], this.birds.pos[i * 3 + 1], this.birds.pos[i * 3 + 2]);
      m.rotation.y = Math.atan2(this.birds.vel[i * 3], this.birds.vel[i * 3 + 2]);
      m.rotation.z = Math.sin(g.ctx.time * 12 + i) * 0.6;
    }
    this.cloudT += dt * 0.5;
    const p = g.player;
    const sunny = g.sky?.kind === 'sun' && g.place === g.town;
    this.cloudShadows.forEach((s, i) => {
      s.visible = sunny;
      if (sunny) s.place(40 + Math.sin(this.cloudT * 0.1 + i * 2) * 40, 0.02, 30 + Math.cos(this.cloudT * 0.07 + i) * 24, 0);
    });
    if (g.place === g.town) {
      this.trundle.update(dt);
      if (this.rind.visible) { if (!this.rind.current || this.rind.finished) this.rind.play('Idle', 0.2); this.rind.update(dt); }
      if (this.vesper.visible) { this.vesper.update(dt); if (Math.floor(g.ctx.time * 2) % 2 === 0 && g.ctx.time % 0.5 < dt) g.ctx.particles.burst('note', [this.vesper.x, 2.6, this.vesper.z]); }
      // fish rings on the water
      this.ringT = (this.ringT ?? 0) - dt;
      if (this.ringT <= 0 && this.fish.length) {
        this.ringT = 0.9;
        const f = this.fish[Math.floor(g.ctx.time * 7) % this.fish.length];
        if (Math.abs(f.x - p.x) < 14 && Math.abs(f.z - p.z) < 14) g.town.decals.add('ring', { x: f.x, y: -0.26, z: f.z }, { x: 0, y: 1, z: 0 }, { size: 0.8, color: 0xf4f4f4, life: 0.7 });
      }
      // the mailbox flag goes up when there's mail
      if (g.town.mailFlag) g.town.mailFlag.rotation.z = g.world.mail.inbox.some((l) => !l.read) ? 0 : -1.5;
      // gone-off cheese has a visible smell
      this.smellT = (this.smellT ?? 0) - dt;
      if (this.smellT <= 0) {
        this.smellT = 0.8;
        if (g.world.player.pockets.some((s) => s?.id === 'cheeseOff')) { g.ctx.particles.burst({ count: [2, 3], life: [0.7, 1.1], speed: [0.2, 0.5], gravity: -0.8, size: [1, 1], colors: ['lime', 'green'], spread: 40 }, [p.x, p.y + 1, p.z]); if ((this.smellN = (this.smellN ?? 0) + 1) % 4 === 0) g.sound('cheeseSmell', { volume: 0.5 }); }
        // puddles while it rains
        const k = g.sky?.kind;
        if ((k === 'rain' || k === 'storm') && g.town.decals) { const r = g.cosmetic; const x = p.x + r.range(-7, 7), z = p.z + r.range(-7, 7); if (g.town.height(x, z) >= 0 && !g.town.blocked(x, z)) g.town.decals.add('splat', { x, y: g.town.height(x, z) + 0.02, z }, { x: 0, y: 1, z: 0 }, { size: r.range(0.6, 1.3), color: 0x41a6f6, life: 18 }); }
      }
      // sparkle spots glint; chimneys smoke
      this.smokeT = (this.smokeT ?? 0) - dt;
      if (this.smokeT <= 0) {
        this.smokeT = 0.5;
        for (const s of g.town.smokeAt) if (Math.abs(s.x - p.x) < 14 && Math.abs(s.z - p.z) < 14) g.ctx.particles.burst('smoke', [s.x, s.y, s.z], { count: 1, speed: 0.5 });
        for (const [k, o] of Object.entries(g.world.town.objects)) { if (o.k === 'sparkle') { const [x, z] = k.split(',').map(Number); if (Math.abs(x - p.x) < 12 && Math.abs(z - p.z) < 12) g.ctx.particles.burst('sparkle', [x + 0.5, 0.4, z + 0.5], { count: 2 }); } }
      }
    }
    if (g.bangT > 0) g.bangT -= dt;
  }
  drawHud(hud) {
    const g = this.g;
    drawReveal(g, hud);
    if (g.bangT > 0 && this.fishing) {
      const s = g.project(g.player.x, g.player.y + 2, g.player.z);
      if (s) { drawText(hud, s.x, s.y - 10, '!', { color: 'red', scale: 3, align: 'center', shadow: 'white' }); }
    }
    if (g.mode === 'play' && g.place === g.town && !g.ui.blocking) {
      // "!" over neighbours with a favour; bubbles
      for (const n of g.npcs.markerList()) {
        const s = g.project(n.actor.x, n.actor.y + 2, n.actor.z);
        if (s) drawText(hud, s.x, s.y - 8 + Math.round(Math.sin(g.ctx.time * 5) * 1), '!', { color: 'red', scale: 2, align: 'center', shadow: 'white' });
      }
      for (const n of g.npcs.all()) {
        if (n.bubbleT > 0 && n.bubble && n.actor.visible) {
          const d = Math.hypot(n.actor.x - g.player.x, n.actor.z - g.player.z);
          if (d > 5) continue;
          const s = g.project(n.actor.x, n.actor.y + 2, n.actor.z);
          if (s) bubble(hud, s.x, s.y - 4, n.bubble);
        }
      }
    }
    if (g.place === g.city && g.mode === 'play' && !g.ui.blocking) {
      for (const c of g.city.crowd) if (c.bubbleT > 0 && c.bubble) {
        const s = g.project(c.a.x, 2, c.a.z);
        if (s) bubble(hud, s.x, s.y - 4, c.bubble);
      }
    }
  }
}
function bubble(hud, x, y, text) {
  const w = Math.min(200, textWidth(text) + 10);
  const cx = Math.max(w / 2 + 2, Math.min(478 - w / 2, x));
  panel(hud, cx - w / 2, y - 15, w, 15, { fill: 'white', trim: 'white' });
  hud.rect(x - 1, y - 1, 3, 2, 'ink');
  drawText(hud, cx, y - 11, text, { align: 'center', color: 'ink' });
}
export { hostLine, say, ask, FISH, FISH_LEN, ITEMS, ACRES, weatherNow, Decals };
