// An Area is one Game: a level from data (map, theme, mood, props, beats), the player, the Dame, the
// enemies and everything they do to each other. Screens run over it at timeScale 0.
import { RAPIER, THREE, buildModel, setLookLayer, PALETTE, toonMaterial, glowMaterial, spatialize, NavGrid } from '../../pixel-engine.js';
import { app, goto } from '../core/app.js';
import { HEADLESS } from '../config.js';
import { HumanIntent, Intent, KEYS } from '../core/intent.js';
import { Run } from '../core/run.js';
import { writeSave } from '../core/save.js';
import { CAM, TUNING } from '../data/tuning.js';
import { ITEMS, TREASURE } from '../data/items.js';
import { Level } from './levelBuild.js';
import { WorldFx } from './world.js';
import { Fx } from './fx.js';
import { Talk } from './talk.js';
import { QTE } from './qte.js';
import { Interact } from './interact.js';
import { Director, SeaField } from './director.js';
import { GameHud } from './hud.js';
import { BeatRunner } from './beats.js';
import { Player, BARKS } from './player.js';
import { Enemy } from './enemy.js';
import { Humanoid } from './actor.js';
import { Dame } from './companion.js';
import { Cutscene } from './cutscene.js';
import { FirePool, Projectile } from './projectiles.js';
import { traceShot, explode } from './combat.js';
import { lyingAmmo, rollLoot } from './loot.js';
import { LEVELS } from '../data/levels/index.js';
import { ALL_TANNOY_LINES } from '../data/dialogue.js';
import { SONGS } from '../audio/songs.js';
import { openPause } from '../screens/pause.js';
import { openCase } from '../screens/case.js';
import { openShop } from '../screens/shop.js';
import { openTelegraph } from '../screens/telegraph.js';
import { openDenied } from '../screens/denied.js';
import { openForm } from '../screens/form.js';
import { openCredits } from '../screens/credits.js';

const { Vector3, Mesh, BoxGeometry, Color } = THREE;
const tmpV2 = new Vector3();
const look = new Vector3(); const dirV = new Vector3(); const rightV = new Vector3(); const posV = new Vector3(); const tmpV = new Vector3();
const sepOut = [0, 0];
const SPAWN_COVER = 9;

export class Area {
  constructor(id, o = {}) {
    this.id = id;
    this.def = LEVELS[id];
    this.name = `area:${id}`;
    this.args = { id, entry: o.entry ?? null };
    this.entry = o.entry ?? null;
    this.attractMode = !!o.attract;
    this.bot = o.bot ?? null;
    this.fresh = o.fresh ?? false;
    this.o = o;
    this.cam = { yaw: 0, pitch: -0.05, dist: CAM.explore.dist, up: CAM.explore.up, side: CAM.explore.side, fov: CAM.explore.fov, recoil: 0 };
    this.shoulder = 1;
    this.rayO = new Vector3(); this.rayD = new Vector3(0, 0, 1); this.rayHitPoint = new Vector3();
    this.target = new Vector3();
    this.softBodies = new Set();
    this.enemies = []; this.friendlies = []; this.shootables = []; this.projectiles = []; this.fires = []; this.drops = []; this.delayed = [];
    this.players = []; this.corpses = []; this.tannoys = []; this.npcs = {}; this.safe = false;
    this.nextEnemyId = 1;
    this.ragdollsLive = 0;
    this.objective = '';
    this.gauge = null; this.bossBar = null; this.hint = null;
    this.human = new HumanIntent();
    this.human.clickIsForDialogue = () => !!this.talk?.box;
    this.intent = this.human.intent;
    this.navs = {};
    this.loops = {};
    this.hitstopped = 0;
    this.musicTimer = 0;
    this.combatT = 0;
    this.seaField = null;
    this.tide = null;
    this.tickCounters = {};
  }

  get paused() { return !!app.stack.length; }

  // ---- Setup ----
  async setup(ctx) {
    app.init(ctx.engine);
    app.area = this;
    app.slow = 1; // a death or a QTE in the last area may have left it in slow motion
    this.ctx = ctx;
    if (!app.run) app.run = new Run();
    this.run = app.run;
    this.run.area = this.id;
    this.run.entry = this.entry;
    const def = this.def;
    this.world = new WorldFx(ctx);
    this.fx = new Fx(this, ctx);
    this.talk = new Talk(this);
    this.qte = new QTE(this);
    this.interact = new Interact(this);
    this.director = new Director(this);
    this.hud = new GameHud(this);
    this.setupCamera(ctx);
    this.world.setMood(this.entryDef()?.mood ?? def.mood);
    this.level = new Level(ctx, def.map, def.theme);
    this.level.build(def.build ?? {});
    if (def.upper) this.level.buildUpper(def.upper.map, def.upper.offset, def.upper.y, def.upper.theme ?? {});
    this.level.flush();
    this.level.onNavChange = () => this.syncNavs();
    this.wrapNav();
    if (def.water !== false && (this.level.info.rows.some((r) => r.includes('~')) || def.water)) this.world.addWater(def.water ?? {});
    if (def.backdrop) this.world.addBackdrop(def.backdrop);
    if (this.level.info.rows.some((r) => r.includes('~'))) this.seaField = new SeaField(this.level.info);
    this.buildPlayer();
    this.buildInteractables();
    this.buildTannoys();
    this.restoreAreaState();
    def.setup?.(this, ctx);
    this.level.flush();
    this.beats = new BeatRunner(this, this.beatsFor());
    this.setMusic(this.entryDef()?.music ?? def.music ?? null);
    this.ambience(def.ambience ?? []);
    this.setupCompanion();
    this.claimsParcel();
    if (!this.attractMode && !this.o.noSave && !this.run.flag(`autosave:${this.id}:${this.entry}`)) {
      this.run.setFlag(`autosave:${this.id}:${this.entry}`);
      this.checkpoint(this.entry);
    }
    if (!this.attractMode) app.installPointerLock();
    this.attachLockHandlers();
    this.brain = this.bot?.attach?.(this) ?? this.bot;
  }

  /** The safety net: never arrive with nothing to shoot. A parcel from the Claims Desk. */
  claimsParcel() {
    const { run } = this;
    if (this.attractMode) return;
    let shots = 0;
    for (const w of run.ownedWeapons()) shots += run.weapons[w].mag + run.case.count(run.weaponStats(w).ammo);
    if (shots < 12) {
      run.case.addStack('ammoPistol', 18);
      run.parcelNote = true;
    }
    if (run.parcelNote) {
      run.parcelNote = false;
      this.addDelayed(1, () => this.hud.flashText('A PARCEL FROM THE CLAIMS DESK', 2.4));
    }
  }

  /**
   * The last net, under the Loot Director. With every gun empty and no rounds to reach, a fight can stand still for ever:
   * the Commodore's hatch will wait patiently for someone to shoot it. Eight seconds of that and the Claims Desk writes.
   */
  stepEmptyNet(dt) {
    const P = this.player;
    if (!P?.alive || this.cut || this.attractMode) return;
    const { run } = this;
    let shots = 0;
    for (const w of run.ownedWeapons()) shots += run.weapons[w].mag + run.case.count(run.weaponStats(w).ammo);
    if (shots > 0 || this.drops.some((d) => d.kind === 'item' && ITEMS[d.id]?.kind === 'ammo' && d.age < 30)) { this.emptyT = 0; return; }
    this.emptyT = (this.emptyT ?? 0) + dt;
    if (this.emptyT < 8) return;
    this.emptyT = 0;
    this.addDrop('item', 'ammoPistol', 18, P.x, P.z, { y: P.floor === 1 ? P.y : 0, floor: P.floor });
    this.hud.flashText('A PARCEL FROM THE CLAIMS DESK', 2.4);
  }

  setupCompanion() {
    if (!this.run.dameWith || this.def.noDame) return;
    const P = this.player;
    this.dame = new Dame(this, P.x - Math.sin(P.facing) * 1.4, P.z - Math.cos(P.facing) * 1.4, P.facing);
  }

  onCommand() { this.dame?.command(); }

  entryDef() { return this.entry && this.def.entries?.[this.entry]; }
  beatsFor() {
    const e = this.entryDef();
    if (e?.beats) return e.beats;
    return this.def.beats;
  }

  ready(ctx) {
    if (typeof window !== 'undefined') window.__GAME__ = this;
    app.syncTime();
  }

  attachLockHandlers() {
    app.onLockLost = () => {
      if (app.area === this && !app.stack.length && this.player?.alive && !this.cut) openPause(this);
    };
  }

  wrapNav() {
    const { nav } = this.level;
    const orig = nav.setOpen.bind(nav);
    nav.setOpen = (c, r, open) => {
      orig(c, r, open);
      for (const k of Object.values(this.navs)) k.setOpen(c, r, open);
    };
  }
  syncNavs() { /* setOpen fans out to every clone */ }

  /** One flow field per target: the player, the Dame, each ladder. */
  navByKey(key) {
    if (!this.navs[key]) {
      const base = this.level.nav;
      const n = new NavGrid(base.width, base.height, { cell: base.cell, origin: [base.ox, 0, base.oz] });
      n.open.set(base.open);
      n.version++;
      this.navs[key] = n;
    }
    return this.navs[key];
  }

  setupCamera(ctx) {
    const rig = ctx.camera;
    rig.zoomable = false;
    rig.step = (u) => {
      if (this.cut) {
        const s = this.cut.camera();
        if (s) {
          rig.camera.position.set(s.position[0], s.position[1], s.position[2]);
          look.set(s.target[0], s.target[1], s.target[2]);
          rig.focus.copy(look);
          if (rig.camera.fov !== s.fov) { rig.camera.fov = s.fov; rig.camera.updateProjectionMatrix(); }
          rig.camera.lookAt(look);
          return;
        }
      }
      if (this.fixedView) {
        const s = this.fixedView();
        rig.camera.position.set(s.position[0], s.position[1], s.position[2]);
        look.set(s.target[0], s.target[1], s.target[2]);
        rig.focus.copy(look);
        rig.camera.fov = s.fov; rig.camera.updateProjectionMatrix();
        rig.camera.lookAt(look);
        return;
      }
      const c = this.cam;
      const p = c.pitch + c.recoil;
      dirV.set(Math.sin(c.yaw) * Math.cos(p), Math.sin(p), Math.cos(c.yaw) * Math.cos(p));
      rightV.set(-Math.cos(c.yaw), 0, Math.sin(c.yaw));
      posV.copy(u.target).addScaledVector(dirV, -c.dist).addScaledVector(rightV, c.side * this.shoulder);
      posV.y += c.up;
      tmpV.copy(posV).sub(u.target);
      const len = tmpV.length();
      tmpV.normalize();
      const hit = u.world.raycast?.(u.target, tmpV, len);
      if (hit != null) posV.copy(u.target).addScaledVector(tmpV, Math.max(0.4, hit - 0.2));
      rig.focus.copy(u.target);
      rig.camera.position.copy(posV);
      if (rig.camera.fov !== c.fov) { rig.camera.fov = c.fov; rig.camera.updateProjectionMatrix(); }
      rig.camera.lookAt(look.copy(posV).addScaledVector(dirV, 12));
      this.camToMax = posV.distanceTo(u.target);
    };
  }

  cameraTarget() {
    const p = this.player;
    if (p) {
      const r = p.root.position;
      this.target.set(r.x, r.y + 1.3, r.z);
    } else this.target.set(0, 1.3, 0);
    return this.target;
  }

  buildPlayer() {
    const { level, def } = this;
    const entry = this.entryDef();
    const [c, r] = this.o.start ?? entry?.start ?? def.start ?? level.starts[0] ?? [level.info.w >> 1, level.info.h >> 1];
    const x = level.info.x(c); const z = level.info.z(r);
    const yaw = ((entry?.yaw ?? def.startYaw ?? 180) * Math.PI) / 180;
    this.player = new Player(this, this.ctx, { x, z, yaw, store: this.run });
    this.players.push(this.player);
    this.cam.yaw = yaw;
  }

  // ---- Interactables from the map ----
  buildInteractables() {
    const { level, interact, def } = this;
    const { info } = level;
    for (const door of level.doors) this.addDoorItem(door, 0);
    for (const w of level.windows) this.addWindowItem(w);
    this.buildLadders();
    // Treasure chests.
    (def.chests ?? []).forEach(([c, r, treasure, n = 1], i) => {
      const { obj } = level.placeAt('claim-chest', c, r, { turn: (c + r) * 40, actor: true });
      const chest = { id: `${c},${r}`, c, r, opened: false, obj };
      level.chests.push(chest);
      chest.item = interact.add({
        kind: 'chest', x: info.x(c), z: info.z(r), label: 'OPEN', prio: 4,
        enabled: () => !chest.opened,
        use: (p) => this.openChest(chest, treasure, n, p),
      });
    });
    // Telegraph keys.
    for (const [c, r] of info.find('t')) {
      level.placeAt('telegraph-desk', c, r, { turn: 180 });
      interact.add({ kind: 'telegraph', x: info.x(c), z: info.z(r), label: 'TELEGRAPH', prio: 7, radius: 1.9, use: () => { this.ctx.audio.play('telegraph'); openTelegraph(this); } });
    }
    // Mr. Fathom.
    for (const [c, r] of info.find('m')) if (!def.noFathom) this.buildFathom(c, r);
    // Ground items from the level data.
    for (const [c, r, id, qty = 1, o = {}] of def.items ?? []) {
      if (o.note) this.addNote(c, r, o.note);
      else this.addDrop('item', id, qty, info.x(c), info.z(r), { persist: `${c},${r}` });
    }
    for (const [c, r, note] of def.notes ?? []) this.addNote(c, r, note);
  }

  addDoorItem(door, floor) {
    const { interact } = this;
    door.item = interact.add({
      kind: 'door', x: door.x, z: door.z, floor, prio: 2, radius: 1.75,
      label: door.locked ? 'LOCKED' : 'OPEN',
      enabled: () => !door.open,
      use: (p) => {
        if (door.locked) {
          this.ctx.audio.play('uiDeny');
          this.hud.flashText(door.lockText ?? 'LOCKED');
          return;
        }
        this.ctx.audio.play('kickWhoosh');
        p.doAction('door', 0.3, {
          clip: 'DoorKick',
          at: [0.1, () => this.kickDoor(door, p)],
        });
        p.facing = Math.atan2(door.x - p.x, door.z - p.z);
      },
    });
    Object.defineProperty(door.item, 'label', { get: () => (door.locked ? (door.lockLabel ?? 'LOCKED') : 'OPEN') });
  }

  kickDoor(door, by) {
    const { ctx, level } = this;
    if (!level.openDoor(door, by.x, by.z, { kicked: true })) return;
    ctx.audio.play('doorKick');
    ctx.engine.shake.add(0.2);
    ctx.particles.burst('dust', [door.x, 1, door.z], { count: 8 });
    door.hp = 0;
    this.markDoor(door);
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - door.x, e.z - door.z) < 1.5) e.knockdown(tmpV.set(e.x - by.x, 0, e.z - by.z).normalize());
    }
    this.def.onDoor?.(this, door);
  }

  breakDoor(door, fromX, fromZ) {
    const { ctx, level } = this;
    if (door.open) return;
    level.openDoor(door, fromX, fromZ, { kicked: true });
    ctx.audio.play('doorKick', this.spatial(door.x, door.z, 40));
    ctx.particles.burst('chips', [door.x, 1.1, door.z]);
    this.markDoor(door);
    if (door.barricadeObj) {
      ctx.particles.burst('chips', [door.barricadeObj.position.x, 1, door.barricadeObj.position.z], { count: 24 });
      ctx.scene.remove(door.barricadeObj);
      if (door.barricadeCollider) ctx.physics.remove(door.barricadeCollider);
      door.barricadeObj = null;
    }
    this.def.onDoor?.(this, door);
  }

  addWindowItem(w) {
    const { interact, level } = this;
    interact.add({
      kind: 'window', x: w.x, z: w.z, floor: w.floor, prio: 3, radius: 1.5,
      label: w.floor === 1 ? 'DROP' : 'VAULT',
      use: (p) => this.useWindow(w, p),
    });
  }

  useWindow(w, p) {
    const { level, ctx } = this;
    const across = w.alongX ? [0, Math.sign(w.z - p.z) || 1] : [Math.sign(w.x - p.x) || 1, 0];
    if (!w.broken) this.breakWindow(w);
    if (w.floor === 1) {
      // Drop to the ground: onto the hay cart, no damage; otherwise 10.
      const toX = w.x + across[0] * 1.15; const toZ = w.z + across[1] * 1.15;
      p.facing = Math.atan2(across[0], across[1]);
      p.doAction('drop', 0.6, {
        clip: 'Vault', invuln: 0.8, from: [p.x, p.z], to: [toX, toZ], y0: p.y, y1: 0,
        onEnd: () => {
          p.teleport(toX, 0, toZ);
          p.floor = 0;
          p.squash.kick(-4);
          const hay = this.def.hayCart && Math.hypot(this.def.hayCart[0] - toX, this.def.hayCart[1] - toZ) < 3.4;
          ctx.audio.play('fall');
          ctx.particles.burst('dust', [toX, 0.1, toZ], { count: hay ? 16 : 8, colors: hay ? ['sand', 'orange'] : undefined });
          if (!hay) p.hurt(10, { x: toX, z: toZ }, { noStagger: true });
          this.run.setFlag('droppedOnce');
        },
      });
      return;
    }
    const toX = w.x + across[0] * 1.1; const toZ = w.z + across[1] * 1.1;
    p.facing = Math.atan2(across[0], across[1]);
    ctx.audio.play('kickWhoosh', { volume: 0.5 });
    p.doAction('vault', 0.7, {
      clip: 'Vault', invuln: 0.7, from: [p.x, p.z], to: [toX, toZ], y0: p.y, y1: p.y,
      onEnd: () => { p.teleport(toX, p.y, toZ); this.run.setFlag('vaultedOnce'); },
    });
  }

  breakWindow(w) {
    const { ctx } = this;
    if (w.broken) return;
    w.broken = true;
    w.glass.visible = false;
    ctx.audio.play('glass', this.spatial(w.x, w.z, 30));
    ctx.particles.burst('glass', [w.x, (w.y0 ?? 0) + 1.6, w.z]);
  }

  buildLadders() {
    const { level, interact } = this;
    const up = level.upper;
    this.links = [];
    if (!up) return;
    const { info } = level;
    for (const [c, r] of up.map.find('L')) {
      const gc = c + up.offset[0]; const gr = r + up.offset[1];
      const x = info.x(gc); const z = info.z(gr);
      level.place('ladder', x, z, { collide: false, params: { rungs: 11, lean: 6 }, turn: 90 });
      const linkUp = { id: 'L', x, z, toFloor: 1, toX: x + 1.0, toZ: z, y1: up.y, active: true, inside: true };
      const linkDown = { id: 'Ld', x: x + 0.6, z, toFloor: 0, toX: x + 1.0, toZ: z, y1: 0, active: true, inside: true };
      this.links.push(linkUp, linkDown);
      interact.add({ kind: 'ladder', x, z, floor: 0, prio: 2.5, label: 'CLIMB', use: (p) => this.climb(p, up.y, x, z, x + 1.0, z, 1) });
      interact.add({ kind: 'ladder', x, z, floor: 1, prio: 2.5, label: 'CLIMB DOWN', use: (p) => this.climb(p, 0, x, z, x + 1.0, z, 0) });
      this.level.bySpot.set('Lobj', { x, z });
    }
  }

  climb(p, toY, x, z, ex, ez, floor) {
    const { ctx } = this;
    p.facing = Math.atan2(x - p.x, z - p.z);
    ctx.audio.play('ladder');
    let nextTick = 0.3;
    p.doAction('ladder', 1.2, {
      clip: 'LadderUp', from: [x, z], to: [x, z], y0: p.y, y1: toY,
      at: [0.5, () => ctx.audio.play('ladder')],
      onEnd: () => {
        p.teleport(ex, toY, ez);
        p.floor = floor;
        ctx.audio.play('ladder');
      },
    });
  }

  /** Enemy routes across floors. */
  navigate(e, key, T) {
    const lv = this.level;
    const tf = T?.floor ?? 0;
    if (e.floor === tf || !lv.upper) {
      const nav = e.floor === 1 ? lv.upper.nav : this.navByKey(key);
      nav.flowTo(T.x, T.z);
      return { nav, tx: T.x, tz: T.z, link: null };
    }
    if (e.floor === 0) {
      let best = null; let bd = Infinity;
      for (const l of this.links) {
        if (l.toFloor !== 1 || !l.active) continue;
        const d = Math.hypot(l.x - e.x, l.z - e.z);
        if (d < bd) { bd = d; best = l; }
      }
      if (!best) { const nav = this.navByKey(key); nav.flowTo(T.x, T.z); return { nav, tx: T.x, tz: T.z, link: null }; }
      const nav = this.navByKey(`link${best.id}`);
      nav.flowTo(best.x, best.z);
      return { nav, tx: best.x, tz: best.z, link: best };
    }
    const down = this.links.find((l) => l.toFloor === 0 && l.active);
    const nav = lv.upper.nav;
    nav.flowTo(down.x, down.z);
    return { nav, tx: down.x, tz: down.z, link: down };
  }

  // ---- Tannoys ----
  buildTannoys() {
    const { level } = this;
    const { info } = level;
    for (const [c, r] of info.find('y')) {
      const key = `${this.id}:${c},${r}`;
      const { obj } = level.placeAt('tannoy', c, r, { collide: false, turn: (c * 47 + r * 91) % 360 });
      obj.updateMatrixWorld(true);
      const horn = obj.getObjectByName('Horn');
      const pos = new Vector3();
      horn.getWorldPosition(pos);
      const t = { key, c, r, x: info.x(c), z: info.z(r), horn, obj, dead: false, pos, spoken: false, line: ALL_TANNOY_LINES[this.run.tannoyIndex(key)] };
      this.tannoys.push(t);
      if (this.run.tannoys.includes(key)) { t.dead = true; horn.visible = false; continue; }
      t.sh = { active: true, pos, radius: 0.55, solid: true, onHit: () => this.shootTannoy(t), label: 'tannoy' };
      this.shootables.push(t.sh);
    }
  }

  shootTannoy(t) {
    if (t.dead) return;
    const { ctx, run } = this;
    t.dead = true;
    t.sh.active = false;
    run.tannoys.push(t.key);
    ctx.audio.play('tannoyBreak', this.spatial(t.x, t.z, 50));
    ctx.particles.burst('spark', t.pos, { count: 14 });
    t.horn.visible = false;
    this.hud.flashText(`TANNOY ${run.tannoys.length}/15`, 1.6);
    const cut = this.talk.barkLine?.tannoy === t;
    if (cut) this.talk.cutBark();
    this.addDelayed(cut ? 0.5 : 0.1, () => this.maxBark(run.tannoys.length % 2 ? 'NOTED.' : 'THANK YOU.'));
    this.def.onTannoy?.(this, t);
  }

  tickTannoys(dt) {
    const p = this.player;
    if (!p || this.cut || this.talk.speaking) return;
    for (const t of this.tannoys) {
      if (t.dead || t.spoken) continue;
      if (Math.hypot(t.x - p.x, t.z - p.z) < (t.triggerR ?? 13)) {
        if (this.talk.barkLine) return;
        t.spoken = true;
        const s = this.listenerInfo(t.x, t.z, 40);
        this.ctx.audio.play('tannoyOn', { volume: s.gain, pan: s.pan });
        this.talk.bark('commodore', t.line, { tannoy: t, prio: 1, pan: s.pan, volume: Math.max(0.5, s.gain) });
        return;
      }
    }
  }

  // ---- Mr. Fathom ----
  buildFathom(c, r) {
    const { level, interact, ctx } = this;
    const { info } = level;
    const x = info.x(c); const z = info.z(r);
    const a = new Humanoid('fathom');
    a.root.position.set(x, 0, z);
    a.root.rotation.y = ((this.def.fathomYaw ?? 0) * Math.PI) / 180;
    ctx.scene.add(a.root);
    a.play('FathomIdle');
    level.place('fathom-post', x + 1.2, z - 0.7, { collide: false });
    ctx.lights.request({ follow: a.root, offset: [0.4, 1.0, 0.3], color: 0x70f060, intensity: 5, radius: 6, flicker: 'pulse', priority: 3 });
    const col = ctx.physics.addStaticCylinder([x, 0.8, z], 0.8, 0.34);
    ctx.physics.tag(col, 'noCamera');
    this.fathom = { actor: a, x, z, loop: ctx.audio.loop('bubbleLoop', { volume: 0 }) };
    interact.add({
      kind: 'talk', x, z, label: 'TALK', prio: 6, radius: 2,
      use: () => this.talkToFathom(),
    });
  }

  talkToFathom() {
    const { run } = this;
    a: if (!run.flag('fathomMet')) {
      run.setFlag('fathomMet');
      const lines = this.def.fathomIntro;
      if (!lines) break a;
      this.talk.lines(lines, { onDone: () => openShop(this) });
      return;
    }
    openShop(this);
  }

  // ---- Items ----
  addDrop(kind, id, qty, x, z, o = {}) {
    const { ctx } = this;
    if (o.persist && this.savedPicked().includes(o.persist)) return null;
    const color = kind === 'money' ? PALETTE.sand : ({ ammo: PALETTE.orange, herb: PALETTE.lime, grenade: PALETTE.red, weapon: PALETTE.white })[ITEMS[id]?.kind] ?? PALETTE.cyan;
    const m = new Mesh(new BoxGeometry(kind === 'money' ? 0.2 : 0.26, kind === 'money' ? 0.08 : 0.2, 0.26), glowMaterial(color));
    m.position.set(x, (o.y ?? 0) + 0.2, z);
    m.castShadow = false;
    setLookLayer(m, 'actors');
    ctx.scene.add(m);
    const drop = { kind, id, qty, x, z, mesh: m, y: o.y ?? 0, floor: o.floor ?? 0, persist: o.persist, age: 0, taken: false };
    this.drops.push(drop);
    if (kind === 'item') {
      drop.item = this.interact.add({
        kind: 'pick', x, z, prio: 5, radius: 1.6, facing: false, floor: drop.floor, dropRef: drop,
        label: `TAKE ${ITEMS[id]?.name ?? id}${qty > 1 ? ` x${qty}` : ''}`,
        use: (p) => this.pickUp(drop, p),
      });
    }
    return drop;
  }

  addNote(c, r, note) {
    const { interact, level, run } = this;
    const { info } = level;
    if (run.notes.includes(note)) return;
    const { obj } = level.placeAt('w-stamp', c, r, { collide: false, y: 0.02, scale: 2 });
    const m = new Mesh(new BoxGeometry(0.4, 0.04, 0.3), glowMaterial(PALETTE.white));
    m.position.set(info.x(c), 0.05, info.z(r));
    this.ctx.scene.add(m);
    const it = interact.add({
      kind: 'pick', x: info.x(c), z: info.z(r), label: 'READ CLAIM NOTE', prio: 5.5, facing: false,
      use: () => {
        run.notes.push(note);
        this.ctx.audio.play('pickup');
        this.hud.flashText('CLAIM NOTE FILED');
        m.visible = false; obj.visible = false;
        interact.remove(it);
      },
    });
  }

  pickUp(drop, p) {
    const { run, ctx } = this;
    const ok = run.giveItem(drop.id, drop.qty);
    if (ok) {
      this.consumeDrop(drop);
      ctx.audio.play('pickup');
      this.hud.flashText(`${ITEMS[drop.id].name}${drop.qty > 1 ? ` x${drop.qty}` : ''}`, 1.1);
      if (ITEMS[drop.id].kind === 'weapon') run.addWeapon(drop.id);
      return;
    }
    // No room: the Case opens in arrange mode with the new item in hand. The ground item stays until placed.
    openCase(this, { holding: { id: drop.id, qty: drop.qty, drop } });
  }

  consumeDrop(drop) {
    if (drop.taken) return;
    drop.taken = true;
    this.ctx.scene.remove(drop.mesh);
    if (drop.item) this.interact.remove(drop.item);
    if (drop.persist) this.savedPicked().push(drop.persist);
    const i = this.drops.indexOf(drop);
    if (i >= 0) this.drops.splice(i, 1);
  }

  openChest(chest, treasure, n, p) {
    const { run, ctx } = this;
    chest.opened = true;
    run.areaData(this.id).chests.push(chest.id);
    const lid = chest.obj.getObjectByName('Lid');
    if (lid) ctx.tweens.to(lid.rotation, { x: -1.5 }, { duration: 0.35, ease: 'outBack' });
    ctx.audio.play('treasure');
    ctx.particles.burst('sparkle', [p.x, p.y + 0.8, p.z]);
    if (TREASURE[treasure]) {
      run.giveTreasure(treasure, n);
      this.hud.flashText(`${TREASURE[treasure].name}`, 1.8);
    } else {
      run.money += n;
      this.hud.flashText(`${n} DOUBLOONS`, 1.8);
    }
    this.def.onChest?.(this, chest);
  }

  breakCrate(c, { by, chain = false } = {}) {
    const { ctx, level } = this;
    if (c.broken) return;
    c.broken = true;
    ctx.physics.remove(c.collider);
    c.collider = null;
    c.obj.visible = false;
    level.nav.setOpen(c.c, c.r, true);
    if (c.kind === 'brine') {
      ctx.audio.play('brineBarrel', this.spatial(c.x, c.z, 70));
      ctx.particles.burst('brine', [c.x, 0.6, c.z]);
      this.addDelayed(chain ? 0.09 : 0, () => {
        explode(this, c.x, 0, c.z, 3, 60, { by });
        this.def.onBrineBlast?.(this, c);
      });
      return;
    }
    ctx.audio.play('crate', this.spatial(c.x, c.z, 25));
    ctx.particles.burst('chips', [c.x, 0.5, c.z]);
    const loot = c.loot ?? rollLoot(ctx.random, this.run, { source: 'crate', lying: lyingAmmo(this.drops) });
    if (loot) this.addDrop(loot.kind, loot.id, loot.qty, c.x, c.z);
    this.run.areaData(this.id).crates.push(c.id);
  }

  /** A harpoon bolt stays where it lands, and you can go and get it back. */
  spawnBoltPickup(x, z) {
    if (!this.level.nav.walkable(x, z)) { const P = this.player; x = (x + (P?.x ?? x)) / 2; z = (z + (P?.z ?? z)) / 2; }
    this.addDrop('item', 'ammoBolts', 1, x, z);
  }

  onWorldHit(hit, dir, stats) {
    const { level, ctx } = this;
    const crate = level.crates.find((c) => c.collider && c.collider.handle === hit.collider.handle);
    if (crate) { this.breakCrate(crate, { by: this.player }); return; }
    this.fx.impact(hit.point, hit.normal);
    if (stats.id === 'harpoon') this.spawnBoltPickup(hit.point.x - dir.x * 0.5, hit.point.z - dir.z * 0.5);
    this.def.onWorldHit?.(this, hit, stats);
  }

  // ---- Combat hooks ----
  spawnEnemy(type, o = {}) {
    // Never inside a wall, a prop or a low wall: nudge to the nearest open cell.
    if (o.x !== undefined && (o.floor ?? 0) === 0) {
      const { nav, info } = this.level;
      if (!nav.walkable(o.x, o.z)) {
        const c0 = info.col(o.x); const r0 = info.row(o.z);
        search: for (let d = 1; d < 6; d++) {
          for (let dy = -d; dy <= d; dy++) {
            for (let dx = -d; dx <= d; dx++) {
              if (Math.abs(dx) !== d && Math.abs(dy) !== d) continue;
              if (nav.isOpen(c0 + dx, r0 + dy)) { o = { ...o, x: info.x(c0 + dx), z: info.z(r0 + dy) }; break search; }
            }
          }
        }
      }
    }
    const e = new Enemy(this, type, { attract: this.attractMode, ...o });
    this.enemies.push(e);
    return e;
  }

  /** Beats spawn like this: { type, n, door, state, at: [c, r], every }. */
  beatSpawn(s) {
    const { info } = this.level;
    if (s.at) {
      const out = [];
      for (let i = 0; i < (s.n ?? 1); i++) {
        const [c, r] = Array.isArray(s.at[0]) ? s.at[i % s.at.length] : s.at;
        out.push(this.spawnEnemy(s.type, { x: info.x(c) + (s.spread ? this.ctx.random.range(-s.spread, s.spread) : 0), z: info.z(r) + (s.spread ? this.ctx.random.range(-s.spread, s.spread) : 0), state: s.state ?? 'APPROACH', yaw: s.yaw, floor: s.floor ?? 0, setpiece: s.setpiece, noLoot: s.noLoot, y: s.y }));
      }
      return out;
    }
    this.director.queueSpawn(s.type, s.n ?? 1, s.door ?? '1', { state: s.state ?? 'APPROACH', every: s.every ?? 0.4, setpiece: s.setpiece, noLoot: s.noLoot });
    return null;
  }

  targetFor(e) {
    let best = null; let bd = Infinity;
    for (const p of this.players) {
      if (!p.alive) continue;
      const d = Math.hypot(p.x - e.x, p.z - e.z) + (p.floor !== e.floor ? 8 : 0);
      if (d < bd) { bd = d; best = p; }
    }
    if (this.safe) return best ? { x: e.x, z: e.z, floor: e.floor, alive: false, safeRoom: true } : null;
    // At most one enemy goes for the insured at a time; the rest want you.
    const D = this.dame;
    if (D && D.targetable() && !e.d.wantsDame) {
      if (D.attacker === e && !e.dead) return D;
      const dd = Math.hypot(D.x - e.x, D.z - e.z);
      if ((!D.attacker || D.attacker.dead) && D.attackerCool <= 0 && dd < 3.2 && dd < bd) { D.attacker = e; D.attackerCool = 7; D.attackerT = 3.5; return D; }
    }
    return best;
  }

  alertNear(from, radius) {
    for (const e of this.enemies) {
      if (e.dead || e === from || e.alerted) continue;
      if (e.state !== 'WORK' && e.state !== 'IDLE') continue;
      if (Math.hypot(e.x - from.x, e.z - from.z) < radius) e.alerted = true;
    }
  }

  separation(me) {
    let sx = 0; let sz = 0;
    for (const o of this.enemies) {
      if (o === me || o.dead || o.floor !== me.floor) continue;
      const dx = me.x - o.x; const dz = me.z - o.z;
      const d2 = dx * dx + dz * dz;
      const r = 0.55 * ((me.scale + o.scale) / 2);
      if (d2 < r * r && d2 > 1e-5) {
        const d = Math.sqrt(d2);
        const f = (r - d) / r;
        sx += (dx / d) * f; sz += (dz / d) * f;
      }
    }
    sepOut[0] = sx * 2; sepOut[1] = sz * 2;
    return sepOut;
  }

  lineOfSight(a, b) {
    const nav = a.floor === 1 ? this.level.upper.nav : this.level.nav;
    return nav.lineOfSight(a.x, a.z, b.x, b.z);
  }

  nearestSpawnDoor(x, z) {
    let best = null; let bd = Infinity;
    for (const d of Object.values(this.level.spawnDoors)) {
      const k = Math.hypot(d[0] - x, d[1] - z);
      if (k < bd) { bd = k; best = d; }
    }
    return best ?? [x, z];
  }

  throwFrom(e, T) {
    const { d } = e;
    if (!T) return;
    const from = [e.x, e.y + 1.6, e.z];
    const lead = [T.x, (T.y ?? 0) + (d.thrown === 'harpoon' ? 1 : 0.1), T.z];
    if (d.thrown === 'bottle') {
      e.prop && (e.prop.visible = false);
      this.projectiles.push(new Projectile(this, 'bottle', from, lead, { owner: e, damage: d.thrownDamage ?? 18, light: 0xff8030 }));
      this.addDelayed(1.4, () => { if (e.prop && !e.dead) e.prop.visible = true; });
    } else if (d.thrown === 'net') {
      this.projectiles.push(new Projectile(this, 'net', from, lead, { owner: e }));
    } else if (d.thrown === 'harpoon') {
      this.fx.sparks(tmpV.set(e.x, e.y + 1.6, e.z));
      this.projectiles.push(new Projectile(this, 'harpoon', from, lead, { owner: e, damage: d.thrownDamage ?? 22 }));
    }
    this.ctx.audio.play('throwWhoosh', this.spatial(e.x, e.z, 30));
  }

  throwGrenade(by, id, to) {
    const y0 = by.y + 1.5;
    const kinds = { flare: 'grenadeFlare', depth: 'grenadeDepth', oil: 'grenadeOil' };
    const dx = to.x - by.x; const dz = to.z - by.z;
    const dist = Math.hypot(dx, dz);
    const maxR = 18;
    const scale = dist > maxR ? maxR / dist : 1;
    this.projectiles.push(new Projectile(this, kinds[id], [by.x, y0, by.z], [by.x + dx * scale, by.floor === 1 ? by.y : 0, by.z + dz * scale], {}));
  }

  addProjectile(kind, from, to, o) { const p = new Projectile(this, kind, from, to, o); this.projectiles.push(p); return p; }

  /** The big white card at the start of a chapter. */
  chapterCard(text) {
    this.card = { text, t: 3.2 };
    this.ctx.audio.play('stamp', { volume: 0.5 });
  }

  addFirePool(x, z, r, life, dps, airborne, friendly) { this.fires.push(new FirePool(this, x, z, r, life, dps, airborne, friendly)); }
  addDelayed(t, fn) { this.delayed.push({ t, fn }); }

  onEnemyHit(e, h) { if (h.by?.isLocal) { h.by.aimZoneFlash = 0.1; this.player.hits++; } }

  onEnemyKilled(e, h) {
    const { run, ctx, player } = this;
    this.director.killed++;
    run.stats.kills++;
    this.killsNow = (this.killsNow ?? 0) + 1;
    if (e.corpse) this.corpses.push(e);
    if (this.corpses.length > 20) this.removeCorpse(this.corpses.shift());
    // Loot.
    if (!e.noLoot) {
      const loot = rollLoot(ctx.random, run, { source: 'corpse', lying: lyingAmmo(this.drops) });
      if (loot) this.addDrop(loot.kind, loot.id, loot.qty, e.x, e.z, { y: e.floor === 1 ? e.y : 0, floor: e.floor });
    }
    // A limpet from a head kill.
    if (e.type !== 'limpet' && h.zone === 'head' && e.type !== 'flenser' && e.type !== 'knight' && ctx.random.chance(0.25) && !this.noLimpets) {
      // Out of this body, and off to another: what it just left is no use to it. That walk is the chance to shoot it.
      const limpet = this.spawnEnemy('limpet', { x: e.x, z: e.z, floor: 0, state: 'APPROACH', noLoot: true });
      if (limpet) limpet.hostCorpse = e;
      ctx.audio.play('limpetSkitter', this.spatial(e.x, e.z, 20));
    }
    if (h.by?.isLocal && ctx.random.chance(0.14) && player.barkT <= 0 && e.type !== 'limpet') { player.barkT = 8; this.maxBark(ctx.random.pick(BARKS.kill)); }
    this.def.onKill?.(this, e, h);
  }
  onEnemyGone(e) { this.director.killed += 0; }

  removeCorpse(c) {
    if (c.ragdolled && c.actor.ragdoll?.active) { c.actor.ragdoll.disable(); this.ragdollsLive = Math.max(0, this.ragdollsLive - 1); }
    this.ctx.scene.remove(c.actor.root);
    c.gone = true;
    const i = this.enemies.indexOf(c);
    if (i >= 0) this.enemies.splice(i, 1);
  }

  nearestCorpse(x, z, r, skip = null) {
    let best = null; let bd = r;
    for (const c of this.corpses) {
      if (c === skip) continue;
      if (c.gone || c.risen) continue;
      // A body on a wagon or a ledge is out of reach: a Limpet set on it would wait there for ever.
      if (!this.level.nav.walkable(c.x, c.z)) continue;
      const d = Math.hypot(c.x - x, c.z - z);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  raiseCorpse(c, limpet) {
    c.risen = true;
    limpet.dieQuiet();
    this.ctx.audio.play('limpetPop', this.spatial(c.x, c.z, 20));
    this.ctx.particles.burst('brine', [c.x, 0.3, c.z], { count: 10 });
    const { x, z } = c;
    this.removeCorpse(c);
    const e = this.spawnEnemy('resalted', { x, z, state: 'RISE', noLoot: true });
    this.spatialBark(e, 'islander', 'SKARR!');
  }

  sawAttack(e, T) {
    if (T !== this.player || T.state !== 'free') { T.hurt?.(40, e, {}); return; }
    const assisted = !this.run.diff.sawLethal;
    this.qte.press({
      key: 'dodge', label: 'DODGE',
      onOk: () => {
        const p = this.player;
        const side = (this.ctx.random.chance(0.5) ? 1 : -1);
        const to = this.dodgeSpot(p, side);
        p.doAction('dodge', 0.45, { clip: 'Roll', invuln: 0.6, from: [p.x, p.z], to: [to.x, to.z], y0: p.y, y1: p.y, onEnd: () => p.teleport(to.x, p.y, to.z, p.facing) });
        this.maxBark('EXCESS APPLIES.');
      },
      onFail: () => {
        const p = this.player;
        if (assisted) p.hurt(80 / (p.store.diff.enemyDamage * TUNING.damageTaken), e, { knock: true });
        else {
          p.invuln = 0;
          p.hurt(9999, e, {});
          this.ctx.engine.shake.add(1);
          this.ctx.particles.burst('gore', [p.x, p.y + 1.2, p.z]);
        }
      },
    });
  }

  /** Where a roll to one side and a little back ends. Never through anything: that side, the other, or on the spot. */
  dodgeSpot(p, side) {
    const fx = Math.sin(p.facing); const fz = Math.cos(p.facing);
    const { nav } = this.level;
    for (const s of [side, -side]) {
      const x = p.x - fz * s * 1.6 - fx * 0.6; const z = p.z + fx * s * 1.6 - fz * 0.6;
      const d = Math.hypot(x - p.x, z - p.z);
      if (!nav.walkable(x, z)) continue;
      const dx = (x - p.x) / d; const dz = (z - p.z) / d;
      tmpV2.set(dx, 0, dz);
      // Down the middle and along both shoulders: her body has to fit, not just a line.
      const clear = [0, 0.28, -0.28].every((o) => !this.ctx.physics.castRay(tmpV.set(p.x - dz * o, p.y + 0.4, p.z + dx * o), tmpV2, d + 0.35, ['player', 'enemy']));
      if (clear) return { x, z };
    }
    return { x: p.x, z: p.z };
  }

  maxBark(text) { this.talk.bark('max', text, { prio: 1 }); }

  spatial(x, z, max = 30) {
    const s = this.listenerInfo(x, z, max);
    return { volume: s.gain, pan: s.pan };
  }

  listenerInfo(x, z, max) {
    const rig = this.ctx.camera;
    const p = rig.camera.position;
    const yaw = this.cut ? 0 : this.cam.yaw;
    this.listener = this.listener ?? { position: { x: 0, y: 0, z: 0 }, right: { x: 1, y: 0, z: 0 } };
    this.listener.position.x = p.x; this.listener.position.y = p.y; this.listener.position.z = p.z;
    this.listener.right.x = -Math.cos(yaw); this.listener.right.z = Math.sin(yaw);
    const s = spatialize(this.listener, { x, y: 1, z }, { max });
    s.blocked = this.player ? !this.level.nav.lineOfSight(x, z, this.player.x, this.player.z) : false;
    return s;
  }

  spatialBark(e, speaker, text) {
    const s = this.listenerInfo(e.x, e.z, 28);
    if (s.gain <= 0.01) return;
    app.voice?.bark(speaker, text, { pan: s.pan, volume: s.gain, syllables: 2 + ((e.id ?? 0) % 2) });
    if (!this.talk.barkLine && !this.talk.box && s.gain > 0.25) {
      this.barkSub = { text, t: 1.1, x: e.x, y: (e.y ?? 0) + 2.1, z: e.z };
    }
  }

  // ---- Save ----
  savedBeats() { return this.run.areaData(this.id).beats; }
  markBeat(id) { this.run.areaData(this.id).beats[id] = true; }
  savedPicked() { return this.run.areaData(this.id).picked; }
  markDoor(door) { const d = this.run.areaData(this.id).doors; if (!d.includes(door.id)) d.push(door.id); }

  /** Put back what the save says was opened, broken or taken in this area. */
  restoreAreaState() {
    const data = this.run.areaData(this.id);
    const { level } = this;
    for (const id of data.doors) {
      const door = level.doors.find((d) => d.id === id);
      if (door && !door.open) { level.openDoor(door, door.x, door.z - 1); door.hp = 0; }
    }
    for (const id of data.chests) {
      const chest = level.chests.find((c) => c.id === id);
      if (chest) { chest.opened = true; const lid = chest.obj.getObjectByName('Lid'); if (lid) lid.rotation.x = -1.5; }
    }
    for (const id of data.crates) {
      const crate = level.crates.find((c) => c.id === id);
      if (crate) { crate.broken = true; this.ctx.physics.remove(crate.collider); crate.collider = null; crate.obj.visible = false; level.nav.setOpen(crate.c, crate.r, true); }
    }
    for (const key of data.gates ?? []) {
      const g = level.gates.find((k) => `${k.c0},${k.r0}` === key);
      if (g) level.openGate(g, { silent: true });
    }
  }

  closeGateAt(c, r) {
    const g = this.level.bySpot.get(`G${c},${r}`);
    if (!g) return;
    this.level.closeGate(g);
    const d = this.run.areaData(this.id);
    d.gates = (d.gates ?? []).filter((k) => k !== `${g.c0},${g.r0}`);
  }

  openGateAt(c, r) {
    const g = this.level.bySpot.get(`G${c},${r}`);
    if (!g) return;
    this.level.openGate(g);
    const d = this.run.areaData(this.id);
    (d.gates = d.gates ?? []).push(`${g.c0},${g.r0}`);
  }

  /** Autosave and the Continue point. */
  checkpoint(entry = this.entry) {
    if (this.attractMode || this.o.noSave) return;
    const { run } = this;
    run.entry = entry;
    const data = run.toJSON();
    delete data.checkpoint;
    const P = this.player;
    const { info } = this.level;
    const pos = P && P.floor === 0 ? [info.col(P.x), info.row(P.z)] : null;
    run.checkpoint = { area: this.id, entry, data, pos };
    writeSave({ area: this.id, entry, data, pos, title: this.def.title ?? this.id, at: Date.now?.() ?? 0 });
  }

  /** Back to the last checkpoint. */
  reloadCheckpoint() {
    const cp = this.run.checkpoint;
    if (!cp) { goto(new Area(this.id, { entry: this.entry, bot: this.bot, noSave: this.o.noSave })); return; }
    const deaths = this.run.deathsThisChapter;
    const totals = this.run.totals;
    const rank = this.run.rank;
    const saved = cp;
    app.run = Run.from(cp.data);
    app.run.checkpoint = saved;
    // No death spirals: Continue always tops the policy up to a working level, and more each time it's asked.
    cp.retries = (cp.retries ?? 0) + 1;
    const cover = Math.min(1, 0.6 + cp.retries * 0.2);
    app.run.health = Math.max(app.run.health, app.run.maxHealth * cover);
    app.run.dameHealth = Math.max(app.run.dameHealth ?? 0, TUNING.dameHp * cover);
    app.run.deathsThisChapter = deaths;
    app.run.totals = totals;
    app.run.rank = rank;
    // A checkpoint saved short of ammunition shouldn't stay short: from the second retry the claims desk sends more.
    if (cp.retries >= 2) {
      const parcel = Math.min(36, (cp.retries - 1) * 12);
      app.run.case.addStack('ammoPistol', parcel);
      app.run.giveItem('samphire');
      app.run.parcelNote = true;
    }
    goto(new Area(cp.area, { entry: cp.entry, bot: this.bot, noSave: this.o.noSave, start: cp.pos ?? undefined, attract: this.attractMode }));
  }

  // ---- UI bits ----
  setObjective(text) {
    this.objective = text;
    this.hud.objectiveT = 6;
  }
  showHint(text, action, time = 6) {
    this.hint = text ? { text, action, t: time } : null;
  }
  setMusic(name) {
    this.musicName = name;
    this.applyMusic(name);
  }
  applyMusic(name) {
    if (name === null || name === undefined) app.mix.stop();
    else app.mix.play(SONGS[name], name);
  }

  radioCall(lines, jingle = true) {
    const { audio } = this.ctx;
    if (jingle) {
      audio.play('telegraph', { volume: 0.5 });
      const all = [['pym', 'YOUR CALL IS IMPORTANT TO OSTRANDER MUTUAL.'], ...lines];
      return this.talk.lines(all, { radio: true });
    }
    return this.talk.lines(lines, { radio: true });
  }

  /** Play a cutscene by id (from the level's cuts) or from a script. Returns a done test. */
  playCut(idOrScript, o = {}) {
    const def = typeof idOrScript === 'string' ? this.def.cuts?.[idOrScript] : idOrScript;
    if (!def) return () => true;
    const script = typeof def === 'function' ? def(this) : def;
    return this.startCutscene(script, o);
  }

  startCutscene(script, { live = false, onEnd } = {}) {
    let finished = false;
    const P = this.player;
    this.closeHint();
    if (P) {
      P.state = P.alive ? 'script' : P.state;
      P.aiming = false; P.aimBlend = 0; P.vx = 0; P.vz = 0;
      P.laser.visible = false;
      P.actor.clearUpper(0.1);
      if (P.reloadT > 0) P.cancelReload();
    }
    this.cutLive = live;
    this.cut = new Cutscene(this, script, {
      onEnd: () => {},
    });
    this.cutFinish = () => {
      finished = true;
      this.cut = null;
      if (P && P.alive && P.state === 'script') P.state = 'free';
      P?.setVisible(true);
      P?.actor?.play('Idle', { fade: 0.2 });
      onEnd?.();
    };
    return () => finished;
  }

  closeHint() { this.hint = null; }

  rumble(strong, weak, ms) {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    try {
      for (const p of navigator.getGamepads()) p?.vibrationActuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak })?.catch?.(() => {});
    } catch { /* a stub or an old browser */ }
  }

  ambience(list) {
    for (const [name, vol] of list) {
      this.loops[name] = this.ctx.audio.loop(name, { volume: vol });
    }
  }

  // ---- Aim ----
  aimRay() {
    const c = this.cam;
    const P = this.player;
    const stats = P.weapon;
    const t = this.ctx.time;
    const sway = (stats.sway ?? 1) * TUNING.laserSway * 0.003;
    const y = c.yaw + Math.sin(t * 1.7) * sway + Math.sin(t * 0.73) * sway * 0.5;
    const p = c.pitch + c.recoil + Math.cos(t * 1.31) * sway;
    this.rayD.set(Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p));
    this.rayO.copy(this.ctx.camera.camera.position).addScaledVector(this.rayD, Math.max(0, (this.camToMax ?? c.dist) - 0.4));
  }

  aimTrace() {
    this.aimRay();
    const hit = traceShot(this, this.rayO, this.rayD, { headBonus: app.device.kind === 'pad' ? 0.03 : 0, max: 80 });
    this.rayHitPoint.copy(this.rayO).addScaledVector(this.rayD, hit ? hit.t : 60);
    this.lastAimHit = hit;
    return hit;
  }

  // ---- Fixed step ----
  fixedUpdate(ctx, dt) {
    if (app.transitioning || this.stopped) return;
    const P = this.player;
    this.run.stats.time += dt;
    const it = this.intent;
    if (this.brain) this.brain.fill(it, dt, ctx);
    else this.human.fixed(ctx, dt, app.device);
    // QTE and cut take the buttons first.
    this.def.input?.(this, it, dt);
    if (this.qte.active) { this.qte.step(dt, it); it.clearPresses(); }
    if (this.cut) { this.cutAction = it.action; it.clearPresses(); }
    if (P && !this.qte.active) P.fixed(dt, it);
    else if (P) P.stay(dt);
    if (this.talk.speaking && !this.cut && it.action) { /* action also advances the box */ }
    it.clearPresses();
    if (!this.cut || this.cutLive) {
      this.director.step(dt);
      for (const e of this.enemies) e.step(dt);
      if (this.dame) this.dame.step(dt);
    }
    this.beats?.step(dt);
    for (const pr of this.projectiles) if (pr.alive && !pr.stepFrozen) pr.step(dt);
    if (this.projectiles.length > 24 || this.projectiles.some((q) => !q.alive)) this.projectiles = this.projectiles.filter((q) => q.alive);
    for (const f of this.fires) f.step(dt);
    if (this.fires.some((f) => !f.alive)) this.fires = this.fires.filter((f) => f.alive);
    for (let i = this.delayed.length - 1; i >= 0; i--) {
      const d = this.delayed[i];
      d.t -= dt;
      if (d.t <= 0) { this.delayed.splice(i, 1); d.fn(); }
    }
    this.collectMoney(dt);
    if (P) this.interact.update(P);
    this.def.fixed?.(this, dt);
    this.stepEmptyNet(dt);
    this.tickTannoys(dt);
    if (this.hint) { this.hint.t -= dt; if (this.hint.t <= 0) this.hint = null; }
    this.tickSafe(dt);
    this.tickMusic(dt);
  }

  collectMoney() {
    const P = this.player;
    if (!P) return;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      if (d.kind !== 'money' || d.floor !== P.floor) continue;
      if (Math.hypot(d.x - P.x, d.z - P.z) < 1.2) {
        this.run.money += d.qty;
        this.ctx.audio.play('coin');
        this.consumeDrop(d);
      }
    }
  }

  tickSafe() {
    const P = this.player;
    const zones = this.def.safeZones;
    if (!P || !zones) return;
    const { info } = this.level;
    const c = info.col(P.x); const r = info.row(P.z);
    const wasSafe = this.safe;
    this.safe = zones.some((z) => c >= z[0] && c <= z[2] && r >= z[1] && r <= z[3]) && (!this.def.safeWhen || this.def.safeWhen(this));
    if (this.safe !== wasSafe) {
      if (this.safe) this.applyMusic('safe');
      else this.applyMusic(this.musicName ?? null);
    }
  }

  /** Combat music comes in when someone near is after you. */
  tickMusic(dt) {
    if (!this.def.autoCombat || this.safe || !this.musicName) return;
    const P = this.player;
    if (!P) return;
    let hot = false;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - P.x, e.z - P.z) < 14 && !['WORK', 'IDLE', 'SEA', 'SCRIPT'].includes(e.state)) { hot = true; break; }
    }
    if (hot) { this.combatT = 5; if (app.mix.current !== 'combat') app.mix.play(SONGS.combat, 'combat', 0.5); }
    else if (this.combatT > 0) { this.combatT -= dt; if (this.combatT <= 0) this.applyMusic(this.musicName); }
  }

  /** Called by the player when killed. */
  onPlayerDied() {
    this.run.stats.deaths++;
    this.run.deathsThisChapter++;
    this.run.rankDown();
    app.slow = 0.4;
    app.syncTime();
    if (this.attractMode) return;
    this.addDelayed(1.1, () => {
      app.slow = 1;
      app.syncTime();
      openDenied(this, this.deathReason ?? 'CLAIM DENIED');
    });
  }

  /** Move on: a Claim Form, then the next area. */
  finishChapter(next, entry, formOptions = {}) {
    openForm(this, { ...formOptions, next: () => {
      if (formOptions.toCredits) { openCredits(this); return; }
      this.loadNext(next, entry);
    } });
  }

  loadNext(id, entry = null, o = {}) {
    if (this.stopped) return;
    this.stopped = true;
    this.run.area = id;
    this.run.entry = entry;
    const nextArea = new Area(id, { entry, bot: this.bot, noSave: this.o.noSave, ...o });
    goto(nextArea);
  }

  // ---- Per frame ----
  update(ctx, dt) {
    app.device.poll(ctx.input);
    const { ui } = app;
    ui.begin(ctx);
    ctx.hud.clear();
    if (this.stopped || app.transitioning) { app.mix.update(ui.dt); return; }
    if (this.brain && !this.attractMode) this.brain.handleScreens(ctx);
    const frozen = app.stack.length > 0;
    if (!frozen) this.checkMenuKeys(ctx);
    const P = this.player;
    // Look.
    if (!frozen && !this.brain && P && !this.cut) {
      const aiming = P.aiming;
      let assist = 1;
      if (aiming && this.lastAimHit?.kind === 'enemy' && app.device.kind === 'pad') assist = 1 - Math.min(0.9, TUNING.aimAssist * this.run.diff.aimAssist * app.settings.aimAssist);
      const it = this.human.frame(ctx, dt, app.device, app.settings, aiming, assist);
      if (P.state === 'free' || P.state === 'action') {
        this.cam.yaw += it.lookYaw;
        this.cam.pitch = Math.max(CAM.pitchMin, Math.min(CAM.pitchMax, this.cam.pitch + it.lookPitch));
      }
    }
    this.updateCamera(dt, P);
    if (P && dt > 0) {
      const alpha = ctx.physics.alpha;
      P.frame(dt, alpha);
    } else if (P) { P.root.updateMatrixWorld(true); }
    for (const e of this.enemies) { if (dt > 0) e.frame(dt, ctx.physics.alpha); }
    if (this.dame && dt > 0) this.dame.frame(dt, ctx.physics.alpha);
    for (const a of Object.values(this.npcs)) if (dt > 0) a.update(dt);
    for (const pr of this.projectiles) pr.frame();
    if (this.fathom && dt > 0) {
      this.fathom.actor.update(dt);
      const s = this.listenerInfo(this.fathom.x, this.fathom.z, 22);
      this.fathom.loop.set({ volume: s.gain * 0.8, pan: s.pan, muffle: s.blocked ? 0.6 : 0 });
    }
    if (dt > 0) {
      this.fx.update(dt);
      this.world.update(dt, this.cameraTarget());
      for (const b of this.level.belts) b.mat.advance?.(dt);
      for (const d of this.drops) { d.age += dt; d.mesh.rotation.y += dt * 2; d.mesh.position.y = d.y + 0.22 + Math.sin(d.age * 3) * 0.04; }
      if (this.barkSub) { this.barkSub.t -= dt; if (this.barkSub.t <= 0) this.barkSub = null; }
      this.def.frame?.(this, dt);
      this.talk.update(dt);
      this.hud.update(dt);
    }
    this.run.tick?.(dt);
    app.lockWanted = !frozen && !this.cut && !!P && P.alive && !this.brain && !this.attractMode;
    if (app.device.kind === 'pad' || !app.lockWanted) { if (app.pointerLocked && !app.lockWanted) app.releasePointerLock(); }
    // Cutscene.
    if (this.cut) {
      if (dt > 0 || frozen === false) this.cut.update(dt, ctx.input, { action: this.cutAction });
      this.cutAction = false;
      if (this.cut.done) this.cutFinish();
    }
    // Draw.
    if (!this.hideHud) {
      // Attract on a phone held upright: the picture and attract's own bands. The game's HUD is laid out for a screen
      // it can be played on, and this device isn't one.
      if (!(this.attractMode && ui.W < 260)) {
        if (this.cut) this.cut.draw(ui);
        else {
          this.talk.drawDim(ui);
          this.hud.draw(ctx, ui);
          if (this.barkSub) this.drawBarkSub(ui);
        }
        this.talk.draw(ui);
        this.qte.draw(ui);
      }
    }
    if (!frozen && this.talk.speaking && !this.cut && (ctx.input.wasPressed('PadCross', 'KeyE', 'Enter', 'Space') || (this.talk.box && !this.player?.aiming && ctx.input.wasPressed('MouseLeft'))) && !this.qte.active) this.talk.advance();
    if (this.card && dt > 0) { this.card.t -= dt; if (this.card.t <= 0) this.card = null; }
    if (this.card) {
      const y = (ui.H >> 1) - 22;
      ui.hud.rect(0, y, ui.W, 44, 'ink');
      ui.hud.rect(0, y, ui.W, 1, 'sand'); ui.hud.rect(0, y + 43, ui.W, 1, 'sand');
      let sc = 3; while (sc > 1 && ui.width(this.card.text, sc) > ui.W - 16) sc--;
      // Still too wide at the smallest size, on a phone held upright: two lines.
      const cardLines = ui.fitLines(this.card.text, ui.W - 8, sc);
      cardLines.forEach((l, i) => ui.centerText(y + 22 - (sc * 7 >> 1) + (i - (cardLines.length - 1) / 2) * 9 * sc | 0, l, { scale: sc, color: 'sand', shadow: false }));
    }
    this.def.draw?.(this, ui);
    this.drawExtra?.(ctx, ui);
    if (app.dev.showZones || app.dev.showNav || app.dev.showTriggers) this.drawDevOverlay(ui);
    app.updateTop(ctx, ui);
    ui.end();
    app.mix.update(ui.dt);
    app.syncTime();
  }

  drawBarkSub(ui) {
    const s = this.barkSub;
    const [x, y] = this.hud.projectDot(ui, tmpV.set(s.x, s.y, s.z));
    if (x < 0 || x > ui.W || y < 0 || y > ui.H) return;
    const w = ui.width(s.text);
    ui.text(x - (w >> 1), y, s.text, { color: 'orange', shadow: 'ink' });
  }

  drawDevOverlay(ui) {
    const { hud } = ui;
    const dotOf = (v) => this.hud.projectDot(ui, v);
    const line = (a, b, col) => {
      const [x0, y0] = dotOf(a); const [x1, y1] = dotOf(b);
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      if (n > 300) return;
      for (let i = 0; i <= n; i++) hud.rect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1, col);
    };
    if (app.dev.showZones) {
      for (const e of this.enemies) {
        if (e.dead || !e.zonesReady) continue;
        const [hx, hy] = dotOf(e.zones.head.c);
        hud.rect(hx - 2, hy - 2, 5, 5, 'lime');
        line(e.zones.torso.a, e.zones.torso.b, 'cyan');
        for (const a of e.zones.arms) line(a.a, a.b, 'sand');
        for (const l of e.zones.legs) line(l.a, l.b, 'orange');
      }
      for (const s of this.shootables) { if (s.active) { const [x, y] = dotOf(s.pos); hud.rect(x - 2, y - 2, 5, 5, 'red'); } }
    }
    if (app.dev.showNav && this.player) {
      const nav = this.navByKey('player');
      nav.flowTo(this.player.x, this.player.z);
      const out = [0, 0];
      const { info } = this.level;
      const pc = info.col(this.player.x); const pr = info.row(this.player.z);
      for (let r = pr - 8; r <= pr + 8; r++) {
        for (let c = pc - 8; c <= pc + 8; c++) {
          if (!nav.isOpen(c, r)) continue;
          const x = info.x(c); const z = info.z(r);
          if (nav.flowDirection(x, z, out)) line(tmpV.set(x, 0.05, z).clone(), tmpV.set(x + out[0] * 0.4, 0.05, z + out[1] * 0.4).clone(), 'teal');
        }
      }
    }
    if (app.dev.showTriggers) {
      for (const it of this.interact.items) {
        if (it.floor !== (this.player?.floor ?? 0)) continue;
        const [x, y] = dotOf(tmpV.set(it.x, 0.1, it.z));
        hud.rect(x - 3, y - 3, 7, 7, 'orange');
      }
    }
  }

  checkMenuKeys(ctx) {
    const { input } = ctx;
    if (this.attractMode) return;
    if (this.brain?.noMenus) return;
    const P = this.player;
    if (!P || !P.alive) return;
    const create = input.isDown('PadCreate');
    if (input.wasPressed('PadOptions') && !create) { this.optionsPressedWithCreate = false; openPause(this); return; }
    if (input.wasPressed('PadOptions') && create) this.optionsPressedWithCreate = true;
    if (input.wasPressed('Escape', 'KeyP')) { openPause(this); return; }
    if (this.cut) return;
    if (input.wasPressed(...KEYS.case)) { openCase(this); return; }
    if (input.wasPressed('KeyM')) { openCase(this, { tab: 3 }); return; }
    // Create opens the map on release, unless Options went down while it was held.
    if (create) this.createHeld = true;
    else if (this.createHeld) {
      this.createHeld = false;
      if (!this.optionsPressedWithCreate) openCase(this, { tab: 3 });
      this.optionsPressedWithCreate = false;
    }
    if (input.wheel && P.state === 'free' && app.device.kind === 'kbm') P.cycleWeapon(input.wheel > 0 ? 1 : -1);
  }

  updateCamera(dt, P) {
    const c = this.cam;
    const real = dt;
    if (real <= 0) return;
    const aim = P?.aiming && P.state === 'free';
    const scoped = aim && P.weapon.scope;
    const want = scoped ? { dist: 0.2, up: 0.32, side: 0.0, fov: CAM.scopeFov } : aim ? CAM.aim : CAM.explore;
    const k = Math.min(1, real / (CAM.ease * 0.45));
    c.dist += (want.dist - c.dist) * k;
    c.up += (want.up - c.up) * k;
    c.side += (want.side - c.side) * k;
    c.fov += (want.fov - c.fov) * k;
    c.recoil *= Math.exp(-real * 9);
    if (P) P.setVisible((this.cut ? true : (this.camToMax ?? 9) > 0.9) && !P.hiddenByScript);
  }

  // ---- Tooling ----
  status() {
    const P = this.player;
    return `${this.id} ${this.entry ?? ''} hp ${Math.round(P?.hp ?? 0)} money ${this.run?.money} enemies ${this.enemies.filter((e) => !e.dead).length}`;
  }

  fingerprint() {
    const P = this.player;
    const parts = [P?.x?.toFixed(3), P?.z?.toFixed(3), this.run?.money, Math.round(P?.hp ?? 0)];
    for (const e of this.enemies) if (!e.dead) parts.push(e.id, e.x.toFixed(2), e.z.toFixed(2), Math.round(e.hp), e.state);
    return parts.join(',');
  }

  dispose() {
    for (const e of this.enemies) e.dispose();
    this.player?.dispose();
    this.dame?.dispose();
    this.world?.dispose();
    this.fathom?.loop?.stop?.();
    if (typeof window !== 'undefined' && window.__GAME__ === this) window.__GAME__ = null;
    app.area = null;
  }
}
export { Color };
