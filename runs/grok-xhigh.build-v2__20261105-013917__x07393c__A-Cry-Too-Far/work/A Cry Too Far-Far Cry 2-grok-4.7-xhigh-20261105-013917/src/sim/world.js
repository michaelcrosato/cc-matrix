import { CharacterController, PALETTE, THREE, Vehicle, buildModel, toonMaterial } from '../../pixel-engine.js';
import { TUNING } from '../core/tuning.js';
import { consumeAction, heldAction } from '../core/actions.js';
import { CASES, POSTS, SITES, STRIPS, TRIGS, siteById } from '../content/sites.js';
import { missionById } from '../content/missions.js';
import { WEAPON_BY_ID, freshWeapon } from '../content/weapons.js';
import { onBridge, nearRiver } from '../content/roads.js';
import { FireGrid } from '../world/fire.js';
import { addBlock, buildLand, fillFuel, paintScar } from '../world/terrain.js';
import { line } from '../content/dialogue.js';
import { soldier } from '../art/models.js';

const { Vector3 } = THREE;
const MOVE = new Vector3();

const BUDDY_DEF = {
  ines: { name: 'INES CARVALHO', hp: 200 },
  dov: { name: 'DOV HALPERN', hp: 200 },
  mags: { name: 'MAGS OYELARAN', hp: 200 },
};

export class World {
  constructor(game, ctx) {
    this.game = game;
    this.ctx = ctx;
    this.rng = ctx.random.fork('world');
    this.fire = new FireGrid(ctx.random.fork('fire'));
    this.fire.onBurnt = (ix, iz) => {
      if (this.land) paintScar(this.land, ix, iz);
      this.scarTick = (this.scarTick || 0) + 1;
    };
    this.heroes = null;
    this.land = null;
    this.heights = null;
    this.hp = 100;
    this.stones = 0;
    this.tablets = 0;
    this.syrettes = 3;
    this.syretteMax = 3;
    this.hour = 9;
    this.gameHours = 9;
    this.windDir = 0.4;
    this.windSpeed = 3;
    this.windPin = null;
    this.rain = false;
    this.weather = 'clear';
    this.guns = [];
    this.slot = 0;
    this.unlocked = new Set(['cane', 'm38']);
    this.upgrades = new Set();
    this.flags = new Set();
    this.safehouses = new Set();
    this.seen = new Set(['mile-forty', 'clinic']);
    this.notes = 0;
    this.tracker = false;
    this.truce = true;
    this.column = false;
    this.pass = null;
    this.provoked = false;
    this.buddies = [];
    this.actors = [];
    this.props = [];
    this.cases = [];
    this.posts = POSTS.map((p) => ({ ...p, alive: true, clearedAt: null }));
    this.trucks = [];
    this.car = null;
    this.inVehicle = false;
    this.vehicleHp = 100;
    this.vehicleKind = null;
    this.repairT = 0;
    this.explodeT = 0;
    this.carrying = null;
    this.waypoint = null;
    this.map = { up: false, anim: 0, cx: 0, cz: 40, zoom: 1 };
    this.mapPx = new Uint8Array(320 * 240 * 4);
    this.feverT = 12 * 60;
    this.feverOn = false;
    this.feverIgnore = 0;
    this.feverClear = 0;
    this.holdT = { tablet: 0, heal: 0, use: 0 };
    this.surgeryT = 0;
    this.rescueT = 0;
    this.rescueBuddy = null;
    this.dead = false;
    this.god = false;
    this.noJam = false;
    this.infAmmo = false;
    this.invisible = false;
    this.noclip = false;
    this.crouch = false;
    this.walk = false;
    this.sprint = false;
    this.stamina = 6;
    this.burning = 0;
    this.regenT = 0;
    this.lastHurt = 'bullet';
    this.shotCount = 0;
    this.jamScript = 0;
    this.mission = null;
    this.stepT = 0;
    this.lines = [];
    this.choice = null;
    this.choicePick = null;
    this.subtitle = '';
    this.speaker = '';
    this.prompt = '';
    this.ledger = { killed: 0, friends: 0, moved: 0, stonesEarned: 0 };
    this.clock = 0;
    this.rideT = 0;
    this.riding = false;
    this.heard = { spot: false };
    this.aimError = 0;
    this.sheet = null;
    this.ending = null;
    this.civilians = 12;
    this.movedOnce = false;
    this.deadBuddies = new Set();
    this.round = null;
  }

  build() {
    const built = buildLand(this.ctx, this.ctx.random.fork('land').state);
    this.land = built.land;
    this.heights = built.heights;
    fillFuel(this.fire, this.heights);
    const y = this.ground(0, 40);
    this.hero = new CharacterController(this.ctx.physics, {
      position: [0, y + 0.05, 40],
      speed: 5.4,
      jumpSpeed: 8,
      gravity: -24,
      radius: 0.35,
      halfHeight: 0.55,
    });
    this.paintMapBase();
    this.mountMap();
    this.spawnTown();
    for (const c of CASES) this.cases.push({ ...c, taken: false });
    this.markSeen();
  }

  ground(x, z) {
    if (this.land) return this.land.heightAt(x, z);
    if (this.heights) return this.heights(x, z);
    return 40;
  }

  feet() {
    if (this.inVehicle && this.car) {
      const t = this.car.body.translation();
      return { x: t.x, y: t.y, z: t.z };
    }
    const f = this.hero.feet;
    return { x: f.x, y: f.y, z: f.z };
  }

  spawnTown() {
    const y = this.ground(12, 55);
    addBlock(this.ctx, 12, y + 1.2, 55, 6, 2.4, 4, PALETTE.white);
    addBlock(this.ctx, -18, this.ground(-18, 62) + 1.1, 62, 5, 2.2, 4, PALETTE.orange);
    addBlock(this.ctx, 0, this.ground(0, 70) + 0.4, 70, 14, 0.4, 4, PALETTE.slate);
    this.props.push({ tag: 'ledger-book', x: 168, z: -286, alive: true });
    this.props.push({ tag: 'cage', x: 40, z: -164, alive: true });
    this.props.push({ tag: 'pump', x: -330, z: 395, alive: true });
    for (const [x, z] of [[410, -50], [440, -70], [455, -45]]) {
      this.props.push({ tag: 'fuel-tank', x, z, alive: true });
      addBlock(this.ctx, x, this.ground(x, z) + 1.5, z, 2.2, 3, 2.2, PALETTE.slate);
    }
    this.props.push({ tag: 'convoy', x: 220, z: 450, alive: true, hp: 80 });
    this.props.push({ tag: 'payroll', x: 220, z: 450, alive: true, hidden: true });
    const civil = {
      id: 'civil-1', kind: 'civil', x: -250, z: 230, hp: 40, alive: true, faction: 'civil', fleeing: false,
    };
    this.actors.push(civil);
    this.attachRig(civil);
  }

  paintMapBase() {
    const px = this.mapPx;
    px.fill(0);
    for (let i = 0; i < 320 * 240; i++) {
      px[i * 4] = 196;
      px[i * 4 + 1] = 154;
      px[i * 4 + 2] = 96;
      px[i * 4 + 3] = 255;
    }
  }

  worldToMap(x, z) {
    const mx = Math.floor(((x + 640) / 1280) * 300) + 8;
    const my = Math.floor(((z + 640) / 1280) * 220) + 8;
    return [mx, my];
  }

  stamp(x, z, r, g, b) {
    const [mx, my] = this.worldToMap(x, z);
    if (mx < 0 || my < 0 || mx >= 320 || my >= 240) return;
    const i = (mx + my * 320) * 4;
    this.mapPx[i] = r;
    this.mapPx[i + 1] = g;
    this.mapPx[i + 2] = b;
    this.mapPx[i + 3] = 255;
  }

  refreshMap() {
    const fire = this.fire;
    if (this.scarTick === this._scarDrawn) {
      const p = this.feet();
      this.stamp(p.x, p.z, 240, 240, 240);
      return;
    }
    this._scarDrawn = this.scarTick;
    for (const i of fire.burntList) {
      const ix = i % 256;
      const iz = (i / 256) | 0;
      const [x, z] = fire.center(ix, iz);
      this.stamp(x, z, 30, 28, 36);
    }
    const p = this.feet();
    this.stamp(p.x, p.z, 240, 240, 240);
  }

  mapHasScar() {
    for (let i = 0; i < this.mapPx.length; i += 4) {
      if (this.mapPx[i] < 40 && this.mapPx[i + 1] < 40 && this.mapPx[i + 2] < 50 && this.mapPx[i + 3] > 0) return true;
    }
    return false;
  }

  markSeen() {
    const p = this.feet();
    for (const s of SITES) if (Math.hypot(s.x - p.x, s.z - p.z) < 90) this.seen.add(s.id);
  }

  handsCamera() {
    return this.ctx?.camera?.camera || null;
  }

  mountMap() {
    const cam = this.handsCamera();
    if (!cam || this.mapSheet) return;
    const tex = new THREE.DataTexture(this.mapPx, 320, 240);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.flipY = true;
    tex.needsUpdate = true;
    this.mapTex = tex;
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.375), toonMaterial(0xffffff, { map: tex }));
    sheet.name = 'held-map';
    this.gpsPx = new Uint8Array(16 * 16 * 4);
    const gtex = new THREE.DataTexture(this.gpsPx, 16, 16);
    gtex.colorSpace = THREE.SRGBColorSpace;
    gtex.magFilter = THREE.NearestFilter;
    gtex.minFilter = THREE.NearestFilter;
    gtex.generateMipmaps = false;
    gtex.flipY = true;
    gtex.needsUpdate = true;
    this.gpsTex = gtex;
    const gps = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.11), toonMaterial(0xffffff, { map: gtex }));
    gps.name = 'gps';
    gps.position.set(0.16, 0.1, 0.012);
    sheet.material.side = THREE.DoubleSide;
    gps.material.side = THREE.DoubleSide;
    sheet.add(gps);
    this.mapSheet = sheet;
    this.hookCamera();
    this.poseMap();
  }

  hookCamera() {
    const rig = this.ctx?.camera;
    if (!rig || rig._mapHook || typeof rig.step !== 'function') return;
    const step = rig.step.bind(rig);
    const world = this;
    rig.step = function (u) {
      step(u);
      world.poseMap();
    };
    rig._mapHook = true;
  }

  paintGps() {
    if (!this.gpsPx) return;
    this.gpsPx.fill(24);
    const ang = this.windPin ? this.windPin.dir : this.windDir;
    const x = Math.max(0, Math.min(15, Math.round(8 + Math.cos(ang) * 6)));
    const y = Math.max(0, Math.min(15, Math.round(8 + Math.sin(ang) * 6)));
    const i = (x + y * 16) * 4;
    this.gpsPx[i] = 220;
    this.gpsPx[i + 1] = 48;
    this.gpsPx[i + 2] = 32;
    this.gpsPx[i + 3] = 255;
    const hour = Math.max(0, Math.min(15, Math.floor(this.hour)));
    const h = hour * 4;
    this.gpsPx[h] = 240;
    this.gpsPx[h + 1] = 220;
    this.gpsPx[h + 2] = 160;
    this.gpsPx[h + 3] = 255;
  }

  poseMap() {
    if (!this.mapSheet) this.mountMap();
    if (!this.mapSheet) return;
    const cam = this.handsCamera();
    const scene = this.ctx?.scene;
    if (cam && scene) {
      if (!this.mapRig) {
        this.mapRig = new THREE.Group();
        this.mapRig.name = 'held-map-rig';
        scene.add(this.mapRig);
      } else if (this.mapRig.parent !== scene) scene.add(this.mapRig);
      if (this.mapSheet.parent !== this.mapRig) this.mapRig.add(this.mapSheet);
      cam.updateMatrixWorld(true);
      const e = cam.matrixWorld.elements;
      this.mapRig.position.set(e[12], e[13], e[14]);
      this.mapRig.quaternion.setFromRotationMatrix(cam.matrixWorld);
      this.mapRig.updateMatrixWorld(true);
    }
    const anim = this.map.anim || 0;
    const mode = this.game?.mode;
    const show = anim > 0.02 && (mode === 'play' || mode === 'round' || mode === 'attract');
    this.mapSheet.visible = show;
    this.mapSheet.position.set(0.02, -0.28 + anim * 0.16, -0.42);
    this.mapSheet.rotation.set(-1.05, 0, 0.04);
    this.paintGps();
    if (this.mapTex) this.mapTex.needsUpdate = true;
    if (this.gpsTex) this.gpsTex.needsUpdate = true;
  }

  dropView(actor) {
    if (!actor?.view) return;
    actor.view.removeFromParent();
    actor.view = null;
  }

  attachRig(actor) {
    if (!actor || actor.view || !this.ctx?.scene) return actor;
    const built = buildModel(soldier);
    const obj = built.object;
    obj.name = actor.id || actor.kind || 'actor';
    this.ctx.scene.add(obj);
    actor.view = obj;
    this.placeRig(actor);
    return actor;
  }

  placeRig(actor) {
    if (!actor?.view) return;
    let x = actor.x;
    let z = actor.z;
    if (x == null || z == null) {
      const p = this.feet();
      x = p.x + 1.4;
      z = p.z + 0.4;
    }
    actor.view.visible = actor.alive !== false;
    actor.view.position.set(x, this.ground(x, z), z);
    actor.view.rotation.set(0, actor.yaw || 0, actor.down ? 1.1 : 0);
  }

  syncViews() {
    for (const a of this.actors) {
      if (!a.view) this.attachRig(a);
      this.placeRig(a);
    }
    for (const b of this.buddies) {
      if (!b.view) this.attachRig(b);
      this.placeRig(b);
    }
    this.poseMap();
  }

  keepCivilians() {
    for (const a of this.actors) if (a.kind !== 'civil') this.dropView(a);
    this.actors = this.actors.filter((a) => a.kind === 'civil');
  }

  clearBuddies() {
    for (const b of this.buddies) this.dropView(b);
    this.buddies = [];
  }

  resetDynamic() {
    for (const a of this.actors) this.dropView(a);
    this.fire.extinguish();
    this.fire.state.fill(0);
    this.fire.burning.length = 0;
    this.fire.burntList.length = 0;
    this.fire.burntCount = 0;
    this.actors.length = 0;
    this.props.length = 0;
    this.dead = false;
    this.carrying = null;
    this.inVehicle = false;
    this.mission = null;
    this.lines = [];
    this.choice = null;
    this.subtitle = '';
    this.feverOn = false;
    this.surgeryT = 0;
    this.rescueT = 0;
    this.ending = null;
    this.sheet = null;
    this.spawnTown();
  }

  teleport(x, z) {
    const y = this.ground(x, z) + 0.1;
    if (this.inVehicle && this.car) this.car.reset([x, y + 1, z], this.car.yaw);
    else this.hero.teleport([x, y, z]);
    this.markSeen();
  }

  giveGun(id, cond) {
    const gun = freshWeapon(id, cond);
    if (!gun) return;
    if (this.upgrades.has('belt') && gun.reserve) gun.reserve = Math.round(gun.reserve * 1.5);
    const at = this.guns.findIndex((g) => g.id === id);
    if (at >= 0) this.guns[at] = gun;
    else this.guns.push(gun);
    this.unlocked.add(id);
    this.slot = Math.max(0, this.guns.findIndex((g) => g.id === id));
  }

  get weapon() {
    return this.guns[this.slot] || null;
  }

  hurt(amount, kind = 'bullet', force = false) {
    if (this.dead) return;
    if (this.god && !force) return;
    const d = amount * TUNING.playerDamageTaken;
    this.hp = Math.max(0, this.hp - d);
    this.lastHurt = kind;
    this.regenT = 5;
    this.surgeryT = 0;
    if (this.hp <= 0) this.down();
  }

  down() {
    if (this.round) {
      this.round.noteDown();
      return;
    }
    const buddy = this.buddies.find((b) => b.alive && !b.down && (b.spentUntil || 0) <= this.clock);
    if (buddy) {
      this.rescueT = 2.2;
      this.rescueBuddy = buddy;
      this.subtitle = line('buddy:rescue');
      this.speaker = buddy.name;
      return;
    }
    this.dead = true;
    this.subtitle = line('death');
    this.game.onDeath();
  }

  pay(amount) {
    const n = Math.round(amount * TUNING.stonesReward);
    this.stones += n;
    this.ledger.stonesEarned += n;
  }

  applySetup(setup, deadIds = []) {
    this.flags = new Set(setup.flags || []);
    this.safehouses = new Set(setup.safehouses || []);
    this.stones = setup.stones ?? 0;
    this.tablets = setup.tablets ?? 0;
    this.syrettes = setup.syrettes ?? 3;
    this.hour = setup.hour ?? 9;
    this.gameHours = this.hour;
    this.truce = setup.truce !== false;
    this.column = !!setup.column;
    this.tracker = !!setup.tracker;
    this.hp = 100;
    this.dead = false;
    this.rescueT = 0;
    this.surgeryT = 0;
    this.burning = 0;
    this.keepCivilians();
    this.feverOn = false;
    this.feverIgnore = 0;
    this.feverClear = 0;
    this.feverT = setup.feverIn === 0 ? 0 : (TUNING.feverMinutes * 60);
    this.guns = [];
    for (const g of setup.guns || []) this.giveGun(g.id, g.cond);
    if (!this.guns.find((g) => g.id === 'cane') && (setup.guns || []).length) this.giveGun('cane', 100);
    for (const id of deadIds) {
      if (!this.deadBuddies.has(id)) {
        this.deadBuddies.add(id);
        this.ledger.friends += 1;
      }
    }
    this.clearBuddies();
    const listed = new Set(setup.buddies || []);
    for (const id of listed) {
      const b = this.makeBuddy(id);
      if (this.deadBuddies.has(id)) {
        b.alive = false;
        b.hp = 0;
      }
      this.buddies.push(b);
    }
    for (const id of this.deadBuddies) {
      if (!listed.has(id)) this.buddies.push({ ...this.makeBuddy(id), alive: false, down: false, hp: 0 });
    }
    this.fire.extinguish();
    this.fire.state.fill(0);
    this.fire.burning.length = 0;
    this.fire.burntList.length = 0;
    this.fire.burntCount = 0;
    this.paintMapBase();
    for (const scar of setup.scars || []) this.layScar(scar);
    this.sheet = setup.sheet || null;
    this.ending = null;
    this.choice = null;
    this.choicePick = null;
    this.lines = [];
    this.carrying = null;
    this.inVehicle = false;
    this.map.up = false;
    this.god = false;
    this.infAmmo = false;
    this.crouch = false;
    if (this.hero?.collider) this.hero.collider.setEnabled(true);
    this.jamScript = 0;
    this.shotCount = 0;
    this.movedOnce = false;
    this.civilians = 12;
    this.provoked = false;
    if (setup.truck) {
      const tx = setup.x + 6;
      const tz = setup.z;
      if (!this.car) this.ensureTruck(tx, tz);
      else {
        this.car.reset([tx, this.ground(tx, tz) + 1.2, tz], Math.PI);
        this.vehicleHp = 100;
      }
    }
    if (setup.x !== undefined) this.teleport(setup.x, setup.z);
    this.subtitle = '';
  }

  makeBuddy(id) {
    const d = BUDDY_DEF[id] || { name: id.toUpperCase(), hp: 200 };
    const buddy = { id, name: d.name, hp: d.hp, max: d.hp, alive: true, down: false, downLeft: 0, trust: 1, spentUntil: 0, wound: false, burning: false };
    this.attachRig(buddy);
    return buddy;
  }

  layScar(id) {
    const strip = STRIPS[id];
    if (!strip) return;
    this.fire.burnStrip(strip.points, strip.width);
    this.refreshMap();
  }

  startMission(id, opts = {}) {
    const m = missionById(id);
    if (!m) return false;
    const dead = opts.dead || [];
    this.applySetup(m.setup || {}, dead);
    if (opts.sheet) this.sheet = opts.sheet;
    this.mission = {
      def: m,
      index: 0,
      done: false,
      textT: 5,
      hold: 0,
      ride: 0,
    };
    this.pass = m.faction || null;
    this.windPin = m.wind || null;
    if (m.weather === 'storm') this.rain = true;
    else this.rain = false;
    if (m.hour !== undefined) this.hour = m.hour;
    this.announceStep();
    this.game.mode = 'play';
    this.game.screen = 'play';
    if (this.ctx?.engine) this.ctx.engine.timeScale = 1;
    return true;
  }

  currentStep() {
    if (!this.mission || this.mission.done) return null;
    return this.mission.def.steps[this.mission.index] || null;
  }

  announceStep() {
    const s = this.currentStep();
    if (!s) return;
    this.subtitle = s.text || '';
    this.speaker = '';
    this.mission.textT = 5;
    this.mission.hold = 0;
    this.mission.ride = 0;
    if (s.do === 'lines') this.lines = [...s.ids];
    else this.lines = [];
    if (s.do === 'choice') {
      this.choice = { id: s.id, options: s.options, focus: 0 };
      this.choicePick = null;
    }
    if (s.do === 'jam') this.jamScript = 5;
    if (s.do === 'repair') {
      const riding = this.inVehicle && this.car;
      const here = this.feet();
      const x = here.x + (riding ? 0 : 3);
      const z = here.z;
      if (!this.car) this.ensureTruck(x, z);
      else this.car.reset([x, this.ground(x, z) + 1.2, z], Math.PI);
      this.vehicleHp = 0;
      this.inVehicle = false;
      if (this.hero.collider) this.hero.collider.setEnabled(true);
      const t = this.truckPos();
      this.hero.teleport([t.x + 2, this.ground(t.x, t.z) + 0.1, t.z]);
    }
    if (s.do === 'syrette') this.hurt(30, 'bullet', true);
    if (s.do === 'buddy-down') this.knockBuddy();
    if (s.do === 'clear') {
      const site = siteById('ranger-post') || { x: this.feet().x, z: this.feet().z };
      this.spawnSoldier({ id: s.tag, post: s.tag, x: site.x + 2, z: site.z, faction: 'concord' });
    }
    if (s.do === 'fever-fall') {
      this.feverT = 0;
      this.tablets = 0;
    }
  }

  knockBuddy() {
    const b = this.buddies.find((x) => x.alive && !x.down);
    if (!b) {
      this.subtitle = line('buddy:burn');
      this.completeStep();
      return;
    }
    this.downBuddy(b.id);
    this.subtitle = line('buddy:burn');
    this.speaker = b.name;
  }

  downBuddy(id, opts = {}) {
    let b = this.buddies.find((x) => x.id === id);
    if (!b) {
      b = this.makeBuddy(id);
      this.buddies.push(b);
    }
    b.hp = 0;
    b.alive = true;
    b.down = true;
    b.downLeft = 40;
    b.burning = !!opts.burning;
    const p = this.feet();
    b.x = p.x + 1.2;
    b.z = p.z;
    return b;
  }

  finishBuddy(b) {
    if (!b || !b.down) return;
    b.alive = false;
    b.down = false;
    b.hp = 0;
    if (!this.deadBuddies.has(b.id)) {
      this.deadBuddies.add(b.id);
      this.ledger.friends += 1;
    }
    this.subtitle = 'IT IS DONE.';
    if (this.currentStep()?.do === 'buddy-down') this.completeStep();
  }

  completeStep() {
    if (!this.mission || this.mission.done) return;
    this.mission.index += 1;
    this.choice = null;
    if (this.mission.index >= this.mission.def.steps.length) {
      this.mission.done = true;
      this.finishMission();
      return;
    }
    this.announceStep();
  }

  finishMission() {
    const m = this.mission.def;
    for (const effect of m.onDone || []) {
      if (effect.flag) this.flags.add(effect.flag);
      if (effect.safehouse) this.safehouses.add(effect.safehouse);
      if (effect.tablets) this.tablets += effect.tablets;
      if (effect.pay) this.pay(effect.pay);
      if (effect.scar) this.layScar(effect.scar);
      if (effect.buddy) {
        if (!this.buddies.some((b) => b.id === effect.buddy)) this.buddies.push(this.makeBuddy(effect.buddy));
      }
      if (effect.tracker) this.tracker = true;
      if (effect.truce === false) this.truce = false;
      if (effect.column) this.column = true;
      if (effect.moveVillage) this.moveVillage();
      if (effect.ending) this.game.showEnding(this.sheet || 'give');
    }
    this.pass = null;
    this.windPin = null;
    this.subtitle = m.title + ' DONE';
  }

  moveVillage() {
    if (this.movedOnce) return;
    this.movedOnce = true;
    this.ledger.moved += this.civilians;
    for (const a of this.actors) if (a.kind === 'civil') a.fleeing = true;
  }

  ensureTruck(x, z) {
    if (this.car) return;
    const y = this.ground(x, z) + 1.2;
    this.car = new Vehicle(this.ctx.physics, {
      at: [x, y, z],
      yaw: Math.PI,
      size: [0.95, 0.45, 2.2],
      mass: 12,
      power: 160,
      topSpeed: TUNING.vehicleTopSpeed,
      wheelRadius: 0.42,
      suspension: 0.45,
      stiffness: 30,
      grip: 2.6,
    });
    this.vehicleHp = 100;
    this.vehicleKind = 'pickup';
    this.truckX = x;
    this.truckZ = z;
  }

  fixed(dt) {
    this.clock += dt;
    this.gameHours += (dt / (TUNING.dayMinutes * 60)) * 24;
    this.hour = ((this.gameHours % 24) + 24) % 24;
    this.stepWind(dt);
    this.fire.wind.x = Math.cos(this.windPin ? this.windPin.dir : this.windDir);
    this.fire.wind.z = Math.sin(this.windPin ? this.windPin.dir : this.windDir);
    this.fire.wind.speed = this.windPin ? this.windPin.speed : this.windSpeed;
    this.fire.rain = this.rain;
    this.fire.step(dt);
    if (this.game.blocksSim()) return;
    this.tickFever(dt);
    this.tickBurn(dt);
    this.tickRegen(dt);
    this.tickActors(dt);
    this.tickBuddies(dt);
    this.tickPosts();
    this.tickPlayer(dt);
    this.tickMission(dt);
    if (this.round) this.round.tick(dt);
    if ((this.clock * 2) % 1 < dt) this.refreshMap();
  }

  stepWind(dt) {
    if (this.windPin) return;
    const turn = (15 * Math.PI / 180) * (dt / 60);
    this.windDir += (this.rng.next() - 0.5) * 2 * turn;
    this.windSpeed = clamp(this.windSpeed + (this.rng.next() - 0.5) * dt * 0.15, 0, 8);
  }

  tickFever(dt) {
    if (this.game.mode !== 'play' && this.game.mode !== 'attract') return;
    if (!this.feverOn) {
      this.feverT -= dt;
      if (this.feverT <= 0) {
        this.feverOn = true;
        this.feverIgnore = 0;
        this.subtitle = line('fever');
      }
      return;
    }
    if (this.feverClear > 0) {
      this.feverClear -= dt;
      if (this.feverClear <= 0) {
        this.feverOn = false;
        const shrink = this.flags.has('m7') ? 2 : this.flags.has('m3') ? 1 : 0;
        const mins = Math.max(2, TUNING.feverMinutes - shrink);
        this.feverT = mins * 60;
      }
      return;
    }
    this.feverIgnore += dt;
    if (this.feverIgnore >= 25) this.collapse();
  }

  collapse() {
    this.feverOn = false;
    this.feverIgnore = 0;
    this.feverClear = 0;
    const lost = this.stones * 0.2;
    this.stones = Math.max(0, this.stones - lost);
    this.hp = Math.max(this.hp, 30);
    const home = this.nearestSafe();
    this.teleport(home.x, home.z);
    this.dead = false;
    this.subtitle = 'YOU WAKE SHORT OF STONES.';
    if (this.currentStep()?.do === 'fever-fall') this.completeStep();
  }

  nearestSafe() {
    const p = this.feet();
    let best = { x: 12, z: 55 };
    let bd = Infinity;
    const homes = [{ x: 12, z: 55 }, ...[...this.safehouses].map((id) => siteById(id)).filter(Boolean)];
    for (const s of homes) {
      const d = Math.hypot(s.x - p.x, s.z - p.z);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  }

  tickBurn(dt) {
    const p = this.feet();
    const cell = this.fire.cellAt(p.x, p.z);
    const inFire = cell && this.fire.state[cell.i] === 1;
    const wet = nearRiver(p.x, p.z, 8);
    if (inFire && !wet) this.burning = 2;
    else if (this.burning > 0) this.burning = Math.max(0, this.burning - dt);
    if (this.burning > 0) this.hurt(TUNING.fireDamage * dt, 'fire', false);
  }

  tickRegen(dt) {
    if (this.god || this.hp <= 0 || this.hp >= 100) return;
    this.regenT -= dt;
    if (this.regenT > 0) return;
    const top = Math.min(100, Math.ceil(this.hp / 20) * 20);
    if (this.hp < top) this.hp = Math.min(top, this.hp + 10 * dt);
  }

  tickActors(dt) {
    const night = this.hour < 5.5 || this.hour >= 19;
    const p = this.feet();
    for (const a of this.actors) {
      if (!a.alive) continue;
      const cell = this.fire.cellAt(a.x, a.z);
      if (cell && this.fire.state[cell.i] === 1 && a.kind === 'soldier') {
        a.state = 'panic';
        a.burnT = (a.burnT || 0) + dt;
        a.x += Math.cos(a.burnT) * dt * 3;
        a.z += Math.sin(a.burnT * 1.3) * dt * 3;
        this.fire.ignite(a.x, a.z, 0);
        if (a.burnT > 5) a.alive = false;
        continue;
      }
      if (a.kind === 'civil') {
        if (a.fleeing) {
          a.x += dt * 2;
          a.z += dt;
        }
        continue;
      }
      if (a.kind !== 'soldier') continue;
      const see = this.soldierSees(a, p, night);
      a.sees = see;
      if (see && this.hostile(a)) {
        a.react = (a.react || 0) + dt;
        a.state = 'alert';
        if (a.react >= TUNING.enemyReaction) {
          const dist = Math.hypot(a.x - p.x, a.z - p.z);
          this.aimError = (1.2 + (5 - 1.2) * Math.min(1, dist / 80)) / TUNING.enemyAccuracy;
          if (this.rng.next() < 0.5 * dt * 4) this.hurt(9, 'bullet', false);
        }
      } else {
        a.react = 0;
        a.state = see ? 'suspicious' : 'idle';
      }
    }
  }

  soldierSees(a, p, night) {
    if (this.invisible) return false;
    let range = TUNING.enemyVision;
    if (this.crouch) range *= 0.55;
    if (night) range *= 0.45;
    if (this.burning > 0) range *= 2;
    const dist = Math.hypot(a.x - p.x, a.z - p.z);
    if (dist > range) return false;
    const ang = Math.atan2(p.x - a.x, p.z - a.z);
    let diff = Math.abs(ang - (a.yaw || 0));
    while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
    return diff < (120 * Math.PI) / 360;
  }

  hostile(a) {
    if (a.kind === 'civil') return false;
    if (this.pass && a.faction === this.pass && !this.provoked) return false;
    if (this.truce && this.inTown(a.x, a.z)) return false;
    return true;
  }

  inTown(x, z) {
    return this.truce && Math.hypot(x, z - 40) < 70;
  }

  tickBuddies(dt) {
    for (const b of this.buddies) {
      if (!b.alive || !b.down) continue;
      b.downLeft -= dt;
      if (b.downLeft <= 0) {
        b.alive = false;
        b.down = false;
        if (!this.deadBuddies.has(b.id)) {
          this.deadBuddies.add(b.id);
          this.ledger.friends += 1;
        }
        if (this.currentStep()?.do === 'buddy-down') this.completeStep();
      }
    }
    if (this.rescueT > 0) {
      this.rescueT -= dt;
      if (this.rescueT <= 0 && this.rescueBuddy) {
        const mags = this.rescueBuddy.id === 'mags';
        this.hp = mags ? 60 : 40;
        this.rescueBuddy.spentUntil = this.clock + TUNING.dayMinutes * 60;
        if (this.rng.next() < TUNING.buddyWoundChance) {
          this.rescueBuddy.wound = true;
          this.rescueBuddy.spentUntil = this.clock + TUNING.dayMinutes * 60 * 2;
        }
        this.rescueBuddy = null;
        this.dead = false;
      }
    }
  }

  tickPosts() {
    for (const post of this.posts) {
      if (post.alive || post.clearedAt == null) continue;
      if (this.gameHours - post.clearedAt >= TUNING.postRemanHours) {
        post.alive = true;
        post.clearedAt = null;
      }
    }
  }

  tickPlayer(dt) {
    if (this.round?.localDown) return;
    if (this.dead && this.rescueT <= 0) return;
    const input = this.ctx.input;
    const bot = this.game.mode === 'attract' ? this.game.bot : null;
    if (!bot && this.lines.length) {
      if (consumeAction(input, 'confirm')) this.advanceLines();
      return;
    }
    if (!bot && this.choice) {
      if (consumeAction(input, 'left')) this.choice.focus = Math.max(0, this.choice.focus - 1);
      if (consumeAction(input, 'right')) this.choice.focus = Math.min(this.choice.options.length - 1, this.choice.focus + 1);
      if (consumeAction(input, 'confirm')) this.choicePick = this.choice.focus;
      return;
    }
    if (this.surgeryT > 0) {
      this.surgeryT -= dt;
      if (this.surgeryT <= 0) this.hp = 40;
      return;
    }
    if (this.rescueT > 0) return;
    this.readNeeds(dt, input, bot);
    if (this.choice) return;
    if (this.map.up && input) {
      let dx = input.mouseDelta.x;
      let dy = input.mouseDelta.y;
      const px = input.pointer?.x || 0;
      const py = input.pointer?.y || 0;
      if (dx === 0 && dy === 0 && this.map.px != null) {
        dx = (px - this.map.px) * 800;
        dy = (py - this.map.py) * 800;
      }
      this.map.px = px;
      this.map.py = py;
      this.map.cx = clamp(this.map.cx + dx * 0.35, -640, 640);
      this.map.cz = clamp(this.map.cz - dy * 0.35, -640, 640);
    } else if (this.map) {
      this.map.px = null;
    }
    const p = this.feet();
    const wading = nearRiver(p.x, p.z, 8) && !onBridge(p.x, p.z);
    let speed = 5.4;
    if (this.crouch) speed = 2;
    else if (this.walk) speed = 3.6;
    const sprinting = this.sprint && this.stamina > 0 && !wading && !this.carrying;
    if (sprinting) speed = 7.4;
    if (wading) speed = 2.7;
    if (this.carrying) speed *= 0.85;
    speed *= TUNING.playerSpeed;
    if (sprinting && (bot ? bot.move : true)) this.stamina = Math.max(0, this.stamina - dt);
    else this.stamina = Math.min(6, this.stamina + dt * (6 / 8));
    this.hero.speed = speed;
    const yaw = this.ctx.camera.yaw || 0;
    let ax = 0;
    let ay = 0;
    if (bot) {
      ax = bot.x || 0;
      ay = bot.y || 0;
    } else {
      const m = input.moveAxis();
      ax = m.x;
      ay = m.y;
    }
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    MOVE.set(fx * ay + rx * ax, 0, fz * ay + rz * ax);
    if (MOVE.length() > 1) MOVE.normalize();
    const jump = !!(bot ? bot.jump : consumeAction(input, 'jump'));
    if (!this.inVehicle && !this.noclip) {
      this.hero.setInput(MOVE, jump, jump);
      this.hero.fixedUpdate(dt);
    } else if (this.noclip) {
      const f = this.hero.feet;
      this.hero.teleport([f.x + MOVE.x * dt * 12, f.y, f.z + MOVE.z * dt * 12]);
    }
    if (this.inVehicle && this.car) this.drive(dt, input, bot, ax, ay);
    if (!bot) {
      this.combat(dt, input);
      this.handleUse(dt, input);
    } else if (bot.fire) this.combat(dt, { isDown: () => true, consumePress: () => false, consumeAny: () => false, anyDown: () => true, wasPressed: () => false });
    this.nearPrompt();
  }

  drive(dt, input, bot, ax, ay) {
    this.car.o.topSpeed = TUNING.vehicleTopSpeed * (this.vehicleHp < 35 ? 0.6 : 1);
    const throttle = this.vehicleHp <= 0 ? 0 : (bot ? (bot.y || 0) : ay);
    const steer = bot ? (bot.x || 0) : ax;
    this.car.drive({ throttle, steer, brake: throttle < 0, handbrake: false }, dt);
    if (this.vehicleHp < 10 && this.vehicleHp > 0 && this.burning > 0) {
      this.explodeT += dt;
      if (this.explodeT > 8) {
        this.vehicleHp = 0;
        const t = this.car.body.translation();
        this.fire.ignite(t.x, t.z, 6);
      }
    }
  }

  readNeeds(dt, input, bot) {
    if (bot) return;
    for (let i = 0; i < this.guns.length && i < 4; i++) {
      if (input.consumePress('Digit' + (i + 1))) this.slot = i;
    }
    if (input.consumePress('PadTriangle') && this.guns.length > 1) this.slot = (this.slot + 1) % this.guns.length;
    if (consumeAction(input, 'crouch')) this.crouch = !this.crouch;
    if (input.consumePress('CapsLock')) this.walk = !this.walk;
    this.sprint = heldAction(input, 'sprint') || input.isDown('ShiftLeft');
    if (consumeAction(input, 'map')) {
      this.map.up = !this.map.up;
      if (this.map.up) {
        const p = this.feet();
        this.map.cx = p.x;
        this.map.cz = p.z;
      }
    }
    if (this.map.up) this.map.anim = Math.min(1, this.map.anim + dt / 0.4);
    else this.map.anim = Math.max(0, this.map.anim - dt / 0.4);
    if (this.feverOn && (heldAction(input, 'tablet') || input.isDown('KeyH'))) {
      this.holdT.tablet += dt;
      if (this.holdT.tablet >= 1 && this.tablets > 0) {
        this.tablets -= 1;
        this.feverClear = 5;
        this.holdT.tablet = 0;
        if (this.currentStep()?.do === 'tablet') this.completeStep();
      }
    } else this.holdT.tablet = 0;
    const healHeld = heldAction(input, 'heal') || input.isDown('KeyQ');
    if (this.hp < 20 && this.hp > 0 && consumeAction(input, 'heal')) {
      this.surgeryT = 4;
      this.subtitle = this.lastHurt === 'fire' ? 'THE LIGHTER' : 'HOLD STILL.';
    } else if (healHeld && this.syrettes > 0 && this.hp >= 20) {
      this.holdT.heal += dt;
      if (this.holdT.heal >= 0.8) {
        this.syrettes -= 1;
        this.hp = Math.min(100, this.hp + 40);
        this.holdT.heal = 0;
        if (this.currentStep()?.do === 'syrette') this.completeStep();
      }
    } else this.holdT.heal = 0;
  }

  combat(dt, input) {
    const gun = this.weapon;
    if (gun) gun.cooldown = Math.max(0, gun.cooldown - dt);
    const want = heldAction(input, 'fire') || input.isDown('MouseLeft');
    const tap = consumeAction(input, 'fire');
    if (!gun || this.sprint) return;
    const def = WEAPON_BY_ID[gun.id];
    const auto = !!(def && def.auto);
    if (!(auto ? want : tap)) return;
    if (gun.cooldown > 0) return;
    if (this.inTown(this.feet().x, this.feet().z) && this.truce) return;
    if (gun.jammed) {
      this.prompt = 'JAMMED';
      return;
    }
    if (gun.magSize > 0 && gun.mag <= 0) return;
    this.fireGun(gun, def);
  }

  fireGun(gun, def) {
    const rate = def.rate || 1;
    gun.cooldown = 1 / rate;
    if (!this.infAmmo && gun.magSize > 0) gun.mag -= 1;
    gun.shots += 1;
    this.shotCount += 1;
    const wear = (def.wear || 0) * TUNING.wearRate * (this.upgrades.has('clean') ? 0.6 : 1);
    gun.cond = Math.max(0, gun.cond - wear);
    if (gun.cond <= 0) {
      this.breakGun();
      return;
    }
    const jamP = this.noJam ? 0 : TUNING.jamRate * 0.12 * (1 - gun.cond / 100) ** 2;
    const script = this.jamScript && gun.shots >= this.jamScript;
    if (script || this.rng.next() < jamP) {
      gun.jammed = true;
      gun.jamLeft = 2 + Math.floor(this.rng.next() * 3);
      if (script) this.jamScript = 0;
    }
    this.resolveShot(def);
    this.provoked = true;
  }

  breakGun() {
    const gun = this.weapon;
    if (!gun) return;
    this.guns.splice(this.slot, 1);
    this.slot = Math.max(0, this.guns.length - 1);
    this.subtitle = 'THE GUN COMES APART.';
  }

  resolveShot(def) {
    const p = this.feet();
    const yaw = this.ctx.camera.yaw || 0;
    const dx = -Math.sin(yaw);
    const dz = -Math.cos(yaw);
    const range = def.range || 40;
    if (def.ignite || def.blast) {
      const x = p.x + dx * Math.min(range, 18);
      const z = p.z + dz * Math.min(range, 18);
      const r = def.ignite || def.blast || 1;
      this.fire.ignite(x, z, r);
      this.linkSpark = { x, z, r };
      this.fire.litByPlayer += 1;
      this.damagePoint(x, z, def.damage * TUNING.weaponDamage, def.blast || 2);
      return;
    }
    this.damageRay(p, dx, dz, range, (def.damage || 10) * TUNING.weaponDamage);
  }

  damageRay(p, dx, dz, range, dmg) {
    let best = null;
    let bd = range;
    for (const a of this.actors) {
      if (!a.alive) continue;
      const ox = a.x - p.x;
      const oz = a.z - p.z;
      const along = ox * dx + oz * dz;
      if (along < 0 || along > bd) continue;
      const lat = Math.hypot(ox - dx * along, oz - dz * along);
      if (lat < 0.8) {
        best = a;
        bd = along;
      }
    }
    for (const prop of this.props) {
      if (!prop.alive) continue;
      const ox = prop.x - p.x;
      const oz = prop.z - p.z;
      const along = ox * dx + oz * dz;
      if (along < 0 || along > range) continue;
      const lat = Math.hypot(ox - dx * along, oz - dz * along);
      if (lat < 1.4) this.damageProp(prop, dmg);
    }
    if (best) this.damageActor(best, dmg);
  }

  damagePoint(x, z, dmg, r) {
    for (const a of this.actors) {
      if (!a.alive) continue;
      if (Math.hypot(a.x - x, a.z - z) <= r + 1) this.damageActor(a, dmg);
    }
    for (const prop of this.props) {
      if (!prop.alive) continue;
      if (Math.hypot(prop.x - x, prop.z - z) <= r + 1.5) this.damageProp(prop, dmg);
    }
    if (this.vehicleHp > 0 && this.car && !this.inVehicle) {
      const t = this.car.body.translation();
      if (Math.hypot(t.x - x, t.z - z) < r + 2) this.vehicleHp = Math.max(0, this.vehicleHp - dmg / TUNING.vehicleToughness);
    }
  }

  damageActor(a, dmg) {
    if (a.kind === 'civil') {
      a.fleeing = true;
      return;
    }
    if (a.kind === 'merc' && this.round) {
      this.round.hurtSeat(a.seat, dmg);
      return;
    }
    a.hp -= dmg;
    if (a.hp <= 0 && a.alive) {
      a.alive = false;
      if (a.kind === 'soldier') this.ledger.killed += 1;
      const step = this.currentStep();
      if (step && step.do === 'clear') {
        const left = this.actors.filter((x) => x.alive && x.post === step.tag).length;
        if (left <= 0) this.completeStep();
      }
    }
  }

  damageProp(prop, dmg) {
    if (prop.hidden) return;
    prop.hp = (prop.hp || 40) - dmg;
    const step = this.currentStep();
    if (prop.hp > 0 && !(step && step.do === 'destroy' && prop.tag === step.tag && (prop.tag === 'fuel-tank' || prop.tag === 'pump'))) {
      if (prop.tag === 'fuel-tank' || prop.tag === 'pump' || prop.tag === 'convoy') {
        if (prop.hp > 0) return;
      } else return;
    }
    if (prop.hp > 0 && prop.tag !== 'fuel-tank' && prop.tag !== 'pump' && prop.tag !== 'convoy') return;
    if (!prop.alive) return;
    if (prop.hp > 0 && step && step.do === 'destroy' && prop.tag === step.tag) {
      prop.alive = false;
    } else if (prop.hp <= 0) prop.alive = false;
    else return;
    this.fire.ignite(prop.x, prop.z, 4);
    if (prop.tag === 'convoy') {
      const pay = this.props.find((p) => p.tag === 'payroll');
      if (pay) {
        pay.hidden = false;
        pay.x = prop.x + 3;
        pay.z = prop.z + 1.5;
      }
    }
    if (step && step.do === 'destroy' && prop.tag === step.tag) {
      const left = this.props.filter((p) => p.alive && p.tag === step.tag).length;
      if (left < (step.n || 1)) this.completeStep();
    }
  }

  tryReload() {
    const gun = this.weapon;
    if (!gun) return;
    if (gun.jammed) {
      gun.jamLeft -= 1;
      if (gun.jamLeft <= 0) gun.jammed = false;
      if (this.currentStep()?.do === 'jam' && !gun.jammed && gun.shots >= 5) this.completeStep();
      return;
    }
    const need = gun.magSize - gun.mag;
    if (need <= 0 || gun.reserve <= 0) return;
    const take = Math.min(need, gun.reserve);
    gun.mag += take;
    gun.reserve -= take;
  }

  tryUse(dt, input) {
    const pressed = consumeAction(input, 'use');
    const held = heldAction(input, 'use') || input.isDown('KeyE');
    if (!pressed && !held) {
      this.holdT.use = 0;
      return;
    }
    if (this.round && (pressed || held) && this.round.tryUse(this)) return;
    const p = this.feet();
    const buddy = this.buddies.find((b) => b.alive && b.down && Math.hypot((b.x || p.x) - p.x, (b.z || p.z) - p.z) < 2.5);
    if (buddy && pressed && this.syrettes > 0 && !buddy.burning) {
      this.syrettes -= 1;
      buddy.down = false;
      buddy.hp = buddy.max * 0.5;
      buddy.trust += 1;
      buddy.burning = false;
      if (this.currentStep()?.do === 'buddy-down') this.completeStep();
      return;
    }
    if (buddy && pressed && (buddy.burning || this.syrettes <= 0)) {
      this.finishBuddy(buddy);
      return;
    }
    if (this.map.up && pressed) {
      this.pickWaypoint();
      return;
    }
    const truckNear = this.car && Math.hypot(this.truckPos().x - p.x, this.truckPos().z - p.z) < 8;
    if (truckNear && this.vehicleHp < 50 && held) {
      this.holdT.use += dt || 0.016;
      const need = this.upgrades.has('vkit') ? 1.5 : 3;
      if (this.holdT.use >= need) {
        this.vehicleHp = 50;
        this.holdT.use = 0;
        if (this.currentStep()?.do === 'repair') this.completeStep();
      }
      return;
    }
    if (!pressed) return;
    if (truckNear && !this.inVehicle && this.vehicleHp >= 50) {
      this.inVehicle = true;
      this.hero.collider.setEnabled(false);
      return;
    }
    if (this.inVehicle) {
      this.inVehicle = false;
      this.hero.collider.setEnabled(true);
      const t = this.truckPos();
      this.hero.teleport([t.x + 2, this.ground(t.x, t.z) + 0.1, t.z]);
      return;
    }
    const step = this.currentStep();
    if (step && step.do === 'report') {
      const site = siteById(step.to);
      if (site && Math.hypot(site.x - p.x, site.z - p.z) < 16) {
        this.completeStep();
        return;
      }
    }
    if (step && step.do === 'collect') {
      const prop = this.props.find((pr) => pr.tag === step.tag && !pr.hidden && pr.alive !== false);
      if (prop && Math.hypot(prop.x - p.x, prop.z - p.z) < 6) {
        prop.alive = false;
        this.stones += 8;
        this.ledger.stonesEarned += 8;
        this.completeStep();
        return;
      }
    }
    if (step && step.do === 'use') {
      const prop = this.props.find((pr) => pr.tag === step.tag && pr.alive !== false);
      if (prop && Math.hypot(prop.x - p.x, prop.z - p.z) < 3) {
        prop.used = true;
        if (step.tag === 'cage') {
          if (!this.buddies.some((b) => b.id === 'ines')) this.buddies.push(this.makeBuddy('ines'));
        }
        if (step.tag === 'ledger-book') prop.alive = false;
        this.completeStep();
        return;
      }
    }
    for (const trig of TRIGS) {
      if (Math.hypot(trig.x - p.x, trig.z - p.z) < 3 && !this.flags.has(trig.id)) {
        this.flags.add(trig.id);
        this.notes += 1;
        this.subtitle = 'A NOTE IN THE MARGIN.';
        if (this.notes >= 6) this.giveGun('empire', 100);
        return;
      }
    }
    for (const c of this.cases) {
      if (c.taken) continue;
      if (Math.hypot(c.x - p.x, c.z - p.z) < 2.2) {
        c.taken = true;
        this.carrying = c;
        if (this.currentStep()?.do === 'collect') this.completeStep();
        return;
      }
    }
  }

  truckPos() {
    if (!this.car) return { x: this.truckX || 0, z: this.truckZ || 0 };
    const t = this.car.body.translation();
    return { x: t.x, z: t.z };
  }

  pickWaypoint() {
    let best = null;
    let bd = 18;
    for (const s of SITES) {
      if (!this.seen.has(s.id) && s.kind !== 'town') continue;
      const d = Math.hypot(s.x - this.map.cx, s.z - this.map.cz);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    if (best) this.waypoint = { x: best.x, z: best.z, id: best.id };
  }

  wantsUse() {
    const p = this.feet();
    if (this.buddies.some((b) => b.alive && b.down && Math.hypot((b.x || p.x) - p.x, (b.z || p.z) - p.z) < 2.5)) return true;
    if (this.map.up) return true;
    if (this.car && Math.hypot(this.truckPos().x - p.x, this.truckPos().z - p.z) < 8) return true;
    const step = this.currentStep();
    if (step && (step.do === 'use' || step.do === 'collect' || step.do === 'report')) return true;
    if (this.round) {
      const seat = this.round.seat(this.round.me);
      if (seat && !seat.down) {
        if (seat.carrying && Math.hypot(this.round.truck.x - p.x, this.round.truck.z - p.z) < 6) return true;
        if (this.round.seats.some((o) => o.id !== seat.id && o.down && Math.hypot(o.x - p.x, o.z - p.z) < 3)) return true;
        if (!seat.carrying && this.round.cases.some((c) => !c.taken && c.carrier == null && Math.hypot(c.x - p.x, c.z - p.z) < 2.6)) return true;
      }
    }
    return false;
  }

  handleUse(dt, input) {
    const buddy = this.buddies.find((b) => b.alive && b.down);
    if (buddy && consumeAction(input, 'melee')) {
      this.finishBuddy(buddy);
      return;
    }
    if (this.wantsUse()) this.tryUse(dt, input);
    if (consumeAction(input, 'reload') || (!this.wantsUse() && consumeAction(input, 'use'))) this.tryReload();
  }

  nearPrompt() {
    const p = this.feet();
    const step = this.currentStep();
    if (this.feverOn && this.tablets > 0) {
      this.prompt = 'TABLET';
      return;
    }
    const down = this.buddies.find((b) => b.alive && b.down);
    if (down) {
      this.prompt = this.syrettes > 0 && !down.burning ? 'SYRETTE OR FINISH IT' : 'FINISH IT';
      return;
    }
    if (this.hp < 20 && this.hp > 0) {
      this.prompt = 'FIELD SURGERY';
      return;
    }
    if (step?.text && this.mission?.textT > 0) {
      this.prompt = step.text;
      return;
    }
    if (this.car && Math.hypot(this.truckPos().x - p.x, this.truckPos().z - p.z) < 8) {
      this.prompt = this.vehicleHp < 50 ? 'REPAIR THE BONNET' : this.inVehicle ? 'GET OUT' : 'GET IN';
      return;
    }
    this.prompt = this.weapon?.jammed ? 'CLEAR THE JAM' : '';
  }

  tickMission(dt) {
    const step = this.currentStep();
    if (!step || !this.mission) return;
    this.mission.textT = Math.max(0, this.mission.textT - dt);
    const p = this.feet();
    if (step.do === 'goto' || step.do === 'drive') {
      const target = step.site ? siteById(step.site) : { x: step.x, z: step.z };
      if (target && Math.hypot(target.x - p.x, target.z - p.z) < (step.r || 20)) this.completeStep();
    } else if (step.do === 'leave') {
      const target = siteById(step.site);
      if (target && Math.hypot(target.x - p.x, target.z - p.z) > (step.r || 40)) this.completeStep();
    } else if (step.do === 'burn') {
      const cell = this.fire.cellAt(step.x, step.z);
      const reach = Math.ceil((step.r || 12) / 5);
      let hot = false;
      if (cell) {
        for (let dz = -reach; dz <= reach && !hot; dz++) {
          for (let dx = -reach; dx <= reach; dx++) {
            const ix = cell.ix + dx;
            const iz = cell.iz + dz;
            if (ix < 0 || iz < 0 || ix >= 256 || iz >= 256) continue;
            const [cx, cz] = this.fire.center(ix, iz);
            if (Math.hypot(cx - step.x, cz - step.z) > (step.r || 12)) continue;
            if (this.fire.state[this.fire.idx(ix, iz)] === 1) {
              hot = true;
              break;
            }
          }
        }
      }
      if (hot) this.completeStep();
    } else if (step.do === 'hold') {
      if (Math.hypot(step.x - p.x, step.z - p.z) < step.r) this.mission.hold += dt;
      if (this.mission.hold >= step.time) this.completeStep();
    } else if (step.do === 'ride') {
      this.riding = true;
      this.mission.ride += dt;
      if (this.mission.ride >= step.time) {
        this.riding = false;
        this.completeStep();
      }
    } else if (step.do === 'report') {
      const site = siteById(step.to);
      if (site && Math.hypot(site.x - p.x, site.z - p.z) < 16 && this._reported) {
        this._reported = false;
        this.completeStep();
      }
    } else if (step.do === 'map' && this.map.up) this.completeStep();
    else if (step.do === 'lines' && this.lines.length === 0 && this._linesDone) {
      this._linesDone = false;
      this.completeStep();
    } else if (step.do === 'choice' && this.choicePick != null) {
      const pick = this.choicePick;
      this.choicePick = null;
      if (step.id === 'sheet') this.sheet = pick === 0 ? 'walk' : 'give';
      if (step.id === 'shoot') this.ledger.killed += pick === 0 ? 1 : 0;
      this.completeStep();
    }
  }

  advanceLines() {
    if (this.lines.length) {
      const id = this.lines.shift();
      this.subtitle = line(id);
      this.speaker = id.split(':')[0].toUpperCase();
      if (this.lines.length === 0) this._linesDone = true;
      return true;
    }
    return false;
  }

  spawnSoldier(o) {
    const hp = 100 * TUNING.enemyHealth;
    const s = {
      id: o.id || 'sol-' + this.actors.length,
      kind: 'soldier',
      faction: o.faction || 'concord',
      x: o.x, z: o.z, yaw: o.yaw || 0,
      hp, max: hp, alive: true, state: 'idle', post: o.post || null,
    };
    this.actors.push(s);
    this.attachRig(s);
    return s;
  }

  clearPost(id) {
    const post = this.posts.find((p) => p.id === id);
    if (!post) return;
    post.alive = false;
    post.clearedAt = this.gameHours;
  }

  spawnGroundGun(id) {
    const cond = 20 + Math.floor(this.rng.next() * 36);
    this.giveGun(id, cond);
    return this.weapon;
  }

  jamChance(cond) {
    return TUNING.jamRate * 0.12 * (1 - cond / 100) ** 2;
  }

  hectares() {
    return this.fire.burntCount * 0.0025;
  }

  trackerRate(x, z) {
    let best = Infinity;
    for (const c of this.cases) {
      if (c.taken) continue;
      const d = Math.hypot(c.x - x, c.z - z);
      if (d < best) best = d;
    }
    if (best > 60) return 0;
    return 0.4 + (1 - best / 60) * 6;
  }
}

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
