// One level. Builds the world from data, runs the player, enemies, companion, scripts and HUD.
import { loadPack, TEXTURE_LIBRARY, THREE, PALETTE, toonMaterial, glowMaterial, buildModel, setLookLayer, addModelColliders } from '../../pixel-engine.js';
import { Humanoid } from './actor.js';
import { MAPS } from './mapPaint.js';
import { buildLevel } from './levelBuild.js';
import { applyMood, updateMood, makeWater, addBackdrop } from './world.js';
import { Player } from './player.js';
import { Enemy, S, resetEnemyIds } from './enemy.js';
import { Dame } from './companion.js';
import { Combat } from './combat.js';
import { Fx } from './fx.js';
import { Scripts } from './scriptkit.js';
import { drawHud } from './hud.js';
import { Interact } from './interact.js';
import { chooseLoot } from './loot.js';
import { MODELS } from '../models/index.js';
import { TUNING } from '../data/tuning.js';
import { WEAPONS, WEAPON_ORDER } from '../data/weapons.js';
import { ITEMS } from '../data/items.js';
import { HumanIntent, newIntent, mouseLock } from '../core/intent.js';
import { ui } from '../core/ui.js';
import { app } from '../core/app.js';
import { settings } from '../core/settings.js';
import { registerSfx } from '../audio/sfx.js';
import { registerVoices } from '../audio/voice.js';
import { Mix } from '../audio/mix.js';
import { clamp, lerp, angleDiff, turnToward } from './geom.js';
import { Run } from '../core/run.js';

const { Vector3, Mesh, BoxGeometry, Group } = THREE;
let AUDIO_READY = new WeakSet();

export class Area {
  constructor(def, o = {}) {
    this.def = def; this.name = def.name || def.id; this.opts = o;
    this.args = { id: def.id, entry: o.entry || null };
    this.run = o.run || app.run || (app.run = new Run(o.difficulty || 'standard'));
    this.intent = o.intent || new HumanIntent();
    this.cur = newIntent();
    this.enemies = []; this.pickups = []; this.tannoys = []; this.later_ = []; this.flags = new Set(this.run.areaFlags?.[def.id] || []);
    this.time = 0; this.frozenKeys = new Set(); this.frozen = false; this.prompt = null; this.dmgArcs = []; this.moneyShow = 0; this.objectiveShow = 0;
    this.objective = ''; this.hint = ''; this.hintT = 0; this.tokensInUse = 0; this.rank = 2; this.noDamageT = 0; this.killsThisArea = 0;
    this.cam = { yaw: o.yaw ?? def.startYaw ?? Math.PI, pitch: 0.05, dist: 4, up: 0.45, side: 0.55, fov: 55 };
    this.camPos = new Vector3(); this.camLook = new Vector3(); this.target = new Vector3();
    this.colliderOwner = new Map(); this.mats = { proj: {} };
    this.dev = app.dev; this.oneHit = false; this.headBonus = 0.03; this.flashT = 0; this.cutsceneActive = false; this.qteBlocks = false;
    this.shoulder = 1; this.screenKeep = false; this.dead = false; this.deathT = 0; this.stats = {};
    this.ending = false; this.ended = false; this.lastQte = null; this.scale = 1;
  }
  get diff() { return this.run.diff; }
  diffMul() { return this.diff.dmg; }
  // ---------- setup ----------
  async setup(ctx) {
    this.ctx = ctx; this.rng = ctx.random.fork('area-' + this.def.id); resetEnemyIds();
    const eng = ctx.engine;
    if (!AUDIO_READY.has(eng.audio)) { registerSfx(eng.audio); registerVoices(eng.audio); AUDIO_READY.add(eng.audio); }
    if (!app.mix || app.mix.audio !== eng.audio) app.mix = new Mix(eng.audio);
    const def = this.def;
    this.map = def.map || MAPS[def.mapId];
    this.fx = new Fx(ctx);
    this.mood = applyMood(ctx, def.mood || 'dusk');
    this.level = buildLevel(ctx, this.map, def.theme || {}, def.build || {});
    if (this.level.waterRect && def.water !== false) this.water = makeWater(ctx, this.level.waterRect, -0.3, def.chop);
    if (def.backdrop !== false) addBackdrop(ctx, 0, 0, Math.max(this.map.W, this.map.H) / 2 + 22, def.backdropKinds || ['sea-stack'], def.backdropCount || 14, def.id.length);
    if (def.backdrop !== false) { try { const kit = await loadPack('packs/kenney-nature.json', { textures: TEXTURE_LIBRARY }); const ids = kit.all().map((m) => m.id).filter((i) => /cliff-(block|large)-rock|cliff-large-rock/.test(i)); const rr = ctx.random.fork('cliffs'); const R = Math.max(this.map.W, this.map.H) / 2 + 12; for (let i = 0; i < 18 && ids.length; i++) { const ang = i / 18 * Math.PI * 2; const b = buildModel(ids[i % ids.length], { catalog: kit }); b.object.position.set(Math.cos(ang) * R * 1.1, -1, Math.sin(ang) * R * 1.1); b.object.scale.setScalar(rr.range(3, 5)); b.object.rotation.y = rr.range(0, 6); ctx.scene.add(b.object); } this.packLoaded = true; } catch { /* packs need an asset reader: absent in plain headless runs */ } }
    this.mats.proj = { net: toonMaterial(PALETTE.sand), bottle: toonMaterial(PALETTE.cyan), harpoon: toonMaterial(PALETTE.slate), default: toonMaterial(PALETTE.sand), flare: glowMaterial(PALETTE.white), depth: toonMaterial(PALETTE.slate) };
    this.combat = new Combat(this); this.scripts = new Scripts(this); this.interact = new Interact(this);
    // laser
    this.laser = new Mesh(new BoxGeometry(0.02, 0.02, 1), glowMaterial(PALETTE.red)); this.laser.castShadow = false; this.laser.visible = false; ctx.scene.add(this.laser);
    // player
    const start = this.startPos();
    this.player = new Player(this, start.x, start.z, { yaw: this.cam.yaw });
    if (def.dame || this.opts.dame) { const dm = this.level.markers.d?.[0]; this.dame = new Dame(this, dm ? dm.x : start.x - 1.5, dm ? dm.z : start.z - 1.5); this.dame.hp = this.dame.maxHp = TUNING.dameHp; }
    this.installCamera();
    // mood lights, props, tannoys
    this.dressLevel();
    for (const b of this.level.breakables) this.colliderOwner.set(b.collider.handle, { onShot: () => this.breakCrate(b) });
    def.setup?.(this);
    this.installPointerLock(ctx);
    if (def.music !== undefined) app.mix.play(def.music);
    this.ctx.audio.stopLoops();
    this.run.snapshotStart();
    for (const s of def.scripts || []) this.scripts.start(s, def.id);
    this.checkpointState = null;
    ctx.engine.audio.stopLoops?.();
    if (this.opts.onReady) this.opts.onReady(this);
  }
  startPos() {
    const e = this.opts.entry;
    const mk = this.level.markers;
    if (e && typeof e === 'object' && e.x !== undefined) return e;
    if (e && mk[e]) return mk[e][0];
    return (mk.a && mk.a[0]) || { x: 0, z: 0 };
  }
  installCamera() {
    const rig = this.ctx.camera, game = this;
    rig.zoomable = false; this.rig = rig;
    const dir = new Vector3(), right = new Vector3(), pos = new Vector3(), tmp = new Vector3(), look = new Vector3();
    rig.step = (u) => {
      const c = game.cam, cut = game.scripts.cut;
      if (cut) {
        const s = cut.tl.camera();
        if (s) { rig.camera.position.set(...s.position); rig.focus.set(...s.target); if (rig.camera.fov !== s.fov) { rig.camera.fov = s.fov; rig.camera.updateProjectionMatrix(); } rig.camera.lookAt(s.target[0], s.target[1], s.target[2]); game.camPos.copy(rig.camera.position); return; }
      }
      dir.set(Math.sin(c.yaw) * Math.cos(c.pitch), Math.sin(c.pitch), Math.cos(c.yaw) * Math.cos(c.pitch));
      right.set(-Math.cos(c.yaw), 0, Math.sin(c.yaw));
      pos.copy(u.target).addScaledVector(dir, -c.dist).addScaledVector(right, c.side * game.shoulder); pos.y += c.up;
      tmp.copy(pos).sub(u.target); const len = tmp.length(); tmp.normalize();
      const hit = u.world?.raycast?.(u.target, tmp, len);
      if (hit != null) pos.copy(u.target).addScaledVector(tmp, Math.max(0.4, hit - 0.2));
      rig.focus.copy(u.target); rig.camera.position.copy(pos);
      if (Math.abs(rig.camera.fov - c.fov) > 0.01) { rig.camera.fov = c.fov; rig.camera.updateProjectionMatrix(); }
      rig.camera.lookAt(look.copy(pos).addScaledVector(dir, 12));
      game.camPos.copy(pos); game.camDir = dir;
    };
    // seed camera position for the first frames (physics step may run before the rig does)
    this.updateCamPos();
  }
  updateCamPos() {
    const c = this.cam, p = this.player; if (!p) return;
    const t = this.target.set(p.x, 1.3, p.z);
    const dir = new Vector3(Math.sin(c.yaw) * Math.cos(c.pitch), Math.sin(c.pitch), Math.cos(c.yaw) * Math.cos(c.pitch));
    const right = new Vector3(-Math.cos(c.yaw), 0, Math.sin(c.yaw));
    this.camPos.copy(t).addScaledVector(dir, -c.dist).addScaledVector(right, c.side * this.shoulder); this.camPos.y += c.up;
  }
  installPointerLock(ctx) {
    this.pointerOK = true;
    const gpu = ctx.engine.gpu; const el = gpu?.renderer?.domElement; if (!el || typeof document === 'undefined') return;
    mouseLock.required = true; this.needsLockHint = true;
    ctx.input.preventKeys.add('Tab'); ctx.input.preventKeys.add('Space');
    this._down = (e) => { if (e.pointerType === 'mouse' && !app.top() && !document.pointerLockElement && !this.scripts.cut) { try { const r = el.requestPointerLock?.(); r?.catch?.(() => {}); } catch { /* denied */ } } };
    this._lock = () => {
      this.pointerOK = !!document.pointerLockElement;
      if (!document.pointerLockElement && !app.selfRelease && !app.top() && !this.scripts.cut && !app.attract && !app.hub) { this.wantPause = true; }
      app.selfRelease = false;
    };
    el.addEventListener('pointerdown', this._down); document.addEventListener('pointerlockchange', this._lock);
    this._el = el;
  }
  dispose(ctx) {
    if (this._el) { this._el.removeEventListener('pointerdown', this._down); document.removeEventListener('pointerlockchange', this._lock); }
    mouseLock.required = false;
    this.def.dispose?.(this);
    app.mix?.play(null);
  }
  dressLevel() {
    const def = this.def, ctx = this.ctx, lv = this.level;
    // Tannoys on 'y' markers
    const lines = def.tannoyLines || [];
    (lv.markers.y || []).forEach((m, i) => this.addTannoy(m.x, m.z, i, lines));
    // props from data
    for (const pdef of def.props || []) this.placeProp(pdef);
    // markers with visuals
    for (const m of lv.markers.t || []) { this.placeModel('telegraph-desk', m.x, m.z, 0, { light: null }); this.ctx.lights.request({ position: [m.x, 2, m.z], color: 0x9cf060, intensity: 3, radius: 5 }); }
    for (const m of lv.markers.$ || []) this.addChest(m);
    // lamp posts on a few markers? data driven through def.props
    if (def.lamps) for (const [x, z] of def.lamps) this.placeModel('lamp-post', x, z, 0, { collide: false, light: { intensity: 16, radius: 10 } });
    this.level.fathom = (lv.markers.m || [])[0] || null;
    if (this.level.fathom && !def.noFathom) this.addFathom(this.level.fathom);
    this.fillerDressing();
  }
  /** Props every 4x4 metres of open floor along walls so nothing looks bare. */
  fillerDressing() {
    const lv = this.level, map = this.map, rnd = this.ctx.random.fork('dress-' + this.def.id), nav = lv.nav;
    const kinds = this.def.dress || ['barrel', 'crate', 'sack', 'bucket', 'rope-coil'];
    const reserved = new Set();
    for (const ch of '12345amtdnwukozqvhls') for (const m of lv.markers[ch] || []) for (let dc = -2; dc <= 2; dc++) for (let dr = -2; dr <= 2; dr++) reserved.add((m.row + dr) * map.W + (m.col + dc));
    for (const d of lv.doors) for (const [c, r] of d.cells) for (let dc = -2; dc <= 2; dc++) for (let dr = -2; dr <= 2; dr++) reserved.add((r + dr) * map.W + (c + dc));
    for (const w of lv.windows) for (let dc = -2; dc <= 2; dc++) for (let dr = -2; dr <= 2; dr++) reserved.add((w.row + dr) * map.W + (w.col + dc));
    let n = 0;
    for (let r = 2; r < map.H - 2; r += 4) for (let c = 2; c < map.W - 2; c += 4) {
      const cc = c + rnd.int(0, 3), rr = r + rnd.int(0, 3); if (cc >= map.W - 1 || rr >= map.H - 1) continue;
      if (reserved.has(rr * map.W + cc)) continue;
      const ch = lv.rows[rr][cc]; if (!'.,=:_'.includes(ch)) continue;
      // next to a wall, and every open neighbour keeps a path
      const wallN = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dc, dr]) => '#TH'.includes(lv.rows[rr + dr]?.[cc + dc] ?? '#'));
      if (!wallN.length) continue;
      const open = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].filter(([dc, dr]) => nav.isOpen(cc + dc, rr + dr)).length;
      if (open < 4) continue;
      const kind = rnd.pick(kinds); const x = lv.wx(cc), z = lv.wz(rr);
      const solid = !['sack', 'rope-coil', 'bucket'].includes(kind);
      this.placeModel(kind, x, z, rnd.range(0, 6.28), { collide: solid });
      if (solid) { nav.setOpen(cc, rr, false); }
      n++;
    }
  }
  placeModel(id, x, z, rot = 0, o = {}) {
    const b = buildModel(id, { catalog: MODELS, params: o.params, palette: o.palette, seed: o.seed });
    b.object.position.set(x, o.y ?? 0, z); b.object.rotation.y = rot; if (o.scale) b.object.scale.setScalar(o.scale);
    this.ctx.scene.add(b.object); b.object.updateMatrixWorld(true);
    setLookLayer(b.object, 'actors');
    if (o.collide !== false && b.colliders?.length) {
      try { b.cols = addModelColliders(this.ctx.physics, b, [x, o.y ?? 0, z], rot); } catch { /* no collider */ }
      if (o.blockNav !== false && this.level?.nav && b.bounds) { // enemies and the bot must path around solid props
        const sz = b.bounds.size, hx = Math.max(sz.x, sz.z) / 2 * 0.9, nav = this.level.nav;
        for (let c = Math.floor(x - hx + this.map.W / 2 + 0.5 - 0.0); c <= Math.floor(x + hx + this.map.W / 2); c++) for (let r = Math.floor(z - hx + this.map.H / 2); r <= Math.floor(z + hx + this.map.H / 2); r++) if (this.level.rows[r]?.[c] && '.,=:_'.includes(this.level.rows[r][c])) nav.setOpen(c, r, false);
      }
    }
    const lt = o.light === null ? null : (o.light || b.light);
    if (lt && b.light !== undefined) { const lp = b.object.localToWorld(new Vector3(...(b.light.at || [0, 1.5, 0]))); this.ctx.lights.request({ ...b.light, ...(typeof o.light === 'object' ? o.light : {}), position: [lp.x, lp.y, lp.z] }); }
    return b;
  }
  placeProp(p) {
    const lv = this.level; let x, z;
    if (p.at) [x, z] = p.cell ? [lv.wx(p.at[0]), lv.wz(p.at[1])] : p.at;
    this.placeModel(p.id, x, z, (p.rot || 0) * Math.PI / 180, p);
  }
  addTannoy(x, z, i, lines) {
    const b = this.placeModel('tannoy', x, z, this.rng.range(0, 6), { collide: false });
    const t = { x, z, i, alive: true, obj: b.object, line: lines[i] || lines[i % Math.max(1, lines.length)] || 'THIS IS YOUR COMMODORE.', id: (this.def.id) + ':' + i, pos: new Vector3(x, 3.3, z), r: 0.55 };
    t.onShot = () => this.shootTannoy(t); this.tannoys.push(t);
  }
  shootTannoy(t) {
    if (!t.alive) return;
    t.alive = false; t.obj.visible = false;
    this.ctx.particles.burst('spark', t.pos); this.audio('tannoyOff', t.x, t.z);
    const gid = t.id; if (!this.run.tannoys.includes(gid)) this.run.tannoys.push(gid);
    this.bark('MAX', this.rng.chance(0.5) ? 'NOTED.' : 'THANK YOU.', 2);
    this.cutOffLine(t);
    this.onTannoyCount?.(this.run.tannoys.length);
  }
  cutOffLine(t) {
    const text = t.line; const cut = text.slice(0, Math.max(10, Math.floor(text.length * 0.5))).replace(/\s+\S*$/, '') + ' -';
    this.scripts.bark('COMMODORE', cut, 3);
  }
  addChest(m) {
    const b = this.placeModel('chest', m.x, m.z, 0, { collide: false });
    this.pickups.push({ kind: 'chest', x: m.x, z: m.z, obj: b.object, opened: false, id: this.def.id + ':$' + m.col + ',' + m.row, r: 1.2 });
  }
  addFathom(m) {
    const f = new Humanoid('fathom', { scale: 1 }); f.attachTo(this.ctx.scene); f.play('FathomIdle'); f.root.position.set(m.x, 0, m.z); f.root.rotation.y = Math.PI;
    this.level.fathomActor = f;
    this.fathomLight = this.ctx.lights.request({ position: [m.x + 0.4, 1.4, m.z + 0.3], color: 0x60ff90, intensity: 5, radius: 6, flicker: 'pulse' });
    this.fathomLoop = this.ctx.audio.loop('bubbles', { volume: 0 });
  }
  // ---------- helpers used by subsystems ----------
  later(t, fn) { this.later_.push({ t, fn }); }
  audio(name, x, z, vol = 1) {
    const a = this.ctx.audio; let pan = 0, v = vol;
    if (x !== undefined && this.player) {
      const d = Math.hypot(x - this.player.x, z - this.player.z);
      v = vol * clamp(1 - d / 40, 0.08, 1);
      const cy = this.cam.yaw; pan = clamp(((x - this.player.x) * -Math.cos(cy) + (z - this.player.z) * Math.sin(cy)) / 12, -1, 1);
    }
    return a.play(name, { volume: v, pan });
  }
  rumble(weak, strong, ms) {
    try { if (typeof navigator === 'undefined' || !navigator.getGamepads) return; for (const p of navigator.getGamepads() || []) { p?.vibrationActuator?.playEffect?.('dual-rumble', { startDelay: 0, duration: ms, weakMagnitude: weak, strongMagnitude: strong }); } } catch { /* optional */ }
  }
  bark(who, text, secs = 2.5) { if (typeof who === 'object') { this.scripts.bark('ISLANDER', text, 1.2); return; } this.scripts.bark(who, text, secs); }
  say(who, text, o) { return this.scripts.say(who, text, o); }
  cutscene(def) { return this.scripts.cutscene(def); }
  *qte(o) { yield* this.scripts.qteRun(o); return this.lastQte; }
  freezeFor(key, on) { if (on) this.frozenKeys.add(key); else this.frozenKeys.delete(key); this.frozen = this.frozenKeys.size > 0; this.cutsceneActive = this.frozenKeys.has('cut') || this.frozenKeys.has('dlg'); }
  scriptError(err) { this.errors = (this.errors || []); this.errors.push(String(err && err.stack || err)); try { console.error('script error', err); } catch { /* */ } }
  setObjective(s) { this.objective = (s || '').toUpperCase(); this.objectiveShow = 6; }
  showHint(s, t = 5) { this.hint = s.toUpperCase(); this.hintT = t; }
  setFlag(f) { this.flags.add(f); (this.run.areaFlags ||= {})[this.def.id] = [...this.flags]; }
  hasFlag(f) { return this.flags.has(f); }
  rankFactor() { const r = this.rank; return { tokens: Math.round((r - 2) / 1.5), windup: -(r - 2) * 0.05, cd: -(r - 2) * 0.12 }; }
  tokenAllowance() { return Math.max(1, Math.round(TUNING.attackTokens) + this.diff.tokens + this.rankFactor().tokens); }
  tokenFor(e, probe) {
    if (e.tokenHeld) return true;
    if (this.tokensInUse < this.tokenAllowance()) { if (!probe) { e.tokenHeld = true; this.tokensInUse++; } return true; }
    return false;
  }
  cellFree(x, z, except) {
    const p = this.player; if (p && Math.hypot(x - p.x, z - p.z) < 0.45 && except?.state !== S.LATCH) return false;
    return true;
  }
  doorAt(x, z) { const [c, r] = this.level.cellOf(x, z); for (const d of this.level.doors) if (!d.open && d.cells.some(([cc, rr]) => cc === c && rr === r)) return d; return null; }
  windowAt(x, z) { const [c, r] = this.level.cellOf(x, z); for (const w of this.level.windows) if (w.col === c && w.row === r) return w; return null; }
  nearestSea(x, z) {
    let best = null, bd = 1e9; const lv = this.level, m = this.map;
    for (let r = 0; r < m.H; r++) for (let c = 0; c < m.W; c++) if (lv.rows[r][c] === '~') { const d = Math.hypot(lv.wx(c) - x, lv.wz(r) - z); if (d < bd) { bd = d; best = { x: lv.wx(c), z: lv.wz(r) }; } }
    return best;
  }
  nearestOpen(x, z) {
    const lv = this.level; const [c, r] = lv.cellOf(x, z);
    for (let rad = 1; rad < 8; rad++) for (let dc = -rad; dc <= rad; dc++) for (let dr = -rad; dr <= rad; dr++) { if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue; if (lv.nav.isOpen(c + dc, r + dr)) return { x: lv.wx(c + dc), z: lv.wz(r + dr) }; }
    return null;
  }
  shoreFor(sea) {
    const lv = this.level; const [c, r] = lv.cellOf(sea.x, sea.z);
    for (let rad = 1; rad < 12; rad++) for (let dc = -rad; dc <= rad; dc++) for (let dr = -rad; dr <= rad; dr++) { if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue; if (lv.nav.isOpen(c + dc, r + dr) && lv.rows[r + dr]?.[c + dc] !== '~') return { x: lv.wx(c + dc), z: lv.wz(r + dr) }; }
    return null;
  }
  nearestSpawnDoor(x, z) {
    let best = null, bd = 1e9;
    for (const ch of '12345') for (const m of this.level.markers[ch] || []) { const d = Math.hypot(m.x - x, m.z - z); if (d < bd) { bd = d; best = m; } }
    return best;
  }
  openDoor(d, byEnemy) {
    if (d.open) return;
    d.open = true; this.ctx.physics.remove(d.collider); this.level.nav.version++;
    if (d.kind === 'S') this.ctx.tweens.to(d.group.position, { y: 3.2 }, { duration: 1.2 });
    else if (d.kind === 'G') this.ctx.tweens.to(d.group.position, { y: 3.4 }, { duration: 1.6 });
    else { const s = d.alongX ? 'x' : 'z'; this.ctx.tweens.to(d.group.rotation, { [s]: (byEnemy ? 1 : -1) * 1.5 }, { duration: 0.3 }); this.ctx.tweens.to(d.group.position, { y: -0.9 }, { duration: 0.3 }); }
    this.audio(d.kind === 'D' ? 'doorkick' : 'stoneGrind', d.x, d.z);
    for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - d.x, e.z - d.z) < 1.4 && !byEnemy) e.knockdown(2, this.player.x, this.player.z);
    this.onDoorOpened?.(d);
  }
  breakWindow(w) {
    if (w.broken) return; w.broken = true; w.glass.visible = false; this.audio('glass', w.x, w.z);
    this.ctx.particles.burst('spark', new Vector3(w.x, 1.5, w.z), { count: 10 });
  }
  breakCrate(b) {
    if (b.broken) return; b.broken = true; b.object.visible = false; this.ctx.physics.remove(b.collider);
    this.level.nav.setOpen(b.col, b.row, true);
    this.ctx.particles.burst('chunk', new Vector3(b.x, 0.6, b.z), { colors: ['orange', 'sand', 'plum'] });
    if (b.brine) { this.combat.explode(b.x, b.z, { radius: 3, dmg: 60, brine: true, owner: 'barrel', hurtEnemies: true }); return; }
    this.audio('crate', b.x, b.z);
    const drop = chooseLoot(this.run, this.rng, { crate: true });
    if (drop) this.dropPickup(drop, b.x, b.z);
    this.onCrate?.(b);
  }
  addDame(x, z) {
    if (this.dame) return this.dame;
    this.dame = new Dame(this, x, z); this.dame.hp = this.dame.maxHp = TUNING.dameHp; return this.dame;
  }
  addBrineBarrel(x, z, block = true) {
    const b = buildModel('brine-barrel', { catalog: MODELS }); b.object.position.set(x, 0, z); this.ctx.scene.add(b.object); setLookLayer(b.object, 'actors');
    const col = this.ctx.physics.addStaticBox({ position: [x, 0.5, z], halfExtents: [0.4, 0.5, 0.4] });
    const [c, r] = this.level.cellOf(x, z);
    if (block) this.level.nav.setOpen(c, r, false);
    const br = { col: c, row: r, x, z, kind: 'brine-barrel', hp: 6, object: b.object, collider: col, brine: true, broken: false };
    this.level.breakables.push(br); this.colliderOwner.set(col.handle, { onShot: () => this.breakCrate(br) }); return br;
  }
  beltVelocityAt(x, z) {
    const lv = this.level; const [c, r] = lv.cellOf(x, z); if (lv.rows[r]?.[c] !== 'c') return null;
    const dir = this.def.belts?.(r); return dir ? [dir * 1.5, 0] : null;
  }
  lockDoor(c, r, on = true) { const d = this.level.doors.find((q) => q.cells.some(([cc, rr]) => cc === c && rr === r)); if (d) d.locked = on; return d; }
  doorAtCell(c, r) { return this.level.doors.find((q) => q.cells.some(([cc, rr]) => cc === c && rr === r)); }
  headPop(e) {
    const z = e.zones; const pt = z ? z.head : new Vector3(e.x, 1.5, e.z);
    this.ctx.particles.burst('blood', pt, { count: 14 }); this.ctx.particles.burst('chunk', pt, { count: 6 }); this.audio('headpop', e.x, e.z);
    if (e.h.j.Head) e.h.j.Head.scale.setScalar(0.001);
    this.ctx.engine.shake.add(0.2);
  }
  dropBolt(pt) { this.dropPickup({ kind: 'item', id: 'ammo_bolts', count: 1 }, pt.x, pt.z); }
  shootables() { return [...this.tannoys.filter((t) => t.alive), ...this.combat.projectileTargets(), ...(this.extraShootables ? this.extraShootables() : [])]; }
  // ---------- spawning ----------
  spawn(type, x, z, o = {}) {
    const e = new Enemy(this, type, x, z, o);
    this.enemies.push(e); return e;
  }
  spawnAtDoor(type, door, o = {}) {
    const mk = this.level.markers; const m = mk[door]?.[0] || ['1', '2', '3', '4', '5'].map((d) => mk[d]?.[0]).find(Boolean) || mk.o?.[0] || mk.a?.[0];
    return this.spawn(type, m.x + this.rng.range(-0.6, 0.6), m.z + this.rng.range(-0.6, 0.6), { state: S.APPROACH, ...o });
  }
  spawnProjectile(pr) { return this.combat.spawn(pr); }
  explodeAt(x, z, o) { this.combat.explode(x, z, o); }
  aliveEnemies(filter) { return this.enemies.filter((e) => !e.dead && (!filter || filter(e))); }
  activeCount() { return this.enemies.filter((e) => !e.dead && e.state !== S.WAIT && e.state !== S.WORK && e.state !== S.SEA).length; }
  onKill(e, o) {
    this.run.stats.kills++; this.killsThisArea++;
    if (!e.sunk) {
      this.fx.splat(e.x, e.z);
      if (!o.sink) { const drop = e.type === 'limpet' ? null : chooseLoot(this.run, this.rng, {}); const isBoss = e.def.boss; if (isBoss) this.dropPickup({ kind: 'coin', count: e.def.money[0] }, e.x, e.z); else if (drop) this.dropPickup(drop, e.x + 0.3, e.z + 0.3); }
      if (e.lastHitZone === 'head' && e.type !== 'limpet' && !e.def.small && this.rng.chance(0.25) && e.def.id !== 'resalted') this.releaseLimpet(e);
    }
    if (o.source !== 'fire' && this.rng.chance(0.3)) this.bark('MAX', this.rng.pick(['CLAIM CLOSED.', 'PRE-EXISTING CONDITION.', "YOU'RE NOT COVERED.", 'TOTAL LOSS.']), 2);
    this.onEnemyKilled?.(e, o);
  }
  releaseLimpet(corpse) {
    const l = this.spawn('limpet', corpse.x + 0.3, corpse.z, { state: S.SEEK }); l.seekCorpse = corpse; l.setState(S.SEEK); this.audio('skitter', corpse.x, corpse.z);
  }
  dropPickup(drop, x, z) {
    const kind = drop.kind; let color = 'sand', size = 0.22;
    if (kind === 'item') color = ITEMS[drop.id]?.color || 'sand';
    if (kind === 'coin') color = 'sand';
    const m = new Mesh(new BoxGeometry(size, size, size), glowMaterial(PALETTE[color])); m.position.set(x, 0.3, z); this.ctx.scene.add(m);
    const p = { ...drop, x, z, mesh: m, t: 0, r: 1.1 }; this.pickups.push(p); return p;
  }
  // ---------- items ----------
  collect(p) {
    const run = this.run;
    if (p.kind === 'coin') { run.doubloons += p.count; this.moneyShow = 3; this.audio('coin'); return true; }
    if (p.kind === 'item') {
      const r = run.addItem(p.id, p.count);
      if (r.left < p.count) { this.audio('pickup'); this.showHint(`${ITEMS[p.id].name} X${p.count - r.left}`, 2.5); if (r.left > 0) { p.count = r.left; return false; } return true; }
      return false;
    }
    if (p.kind === 'weapon') { if (run.addWeapon(p.id)) { this.audio('pickup'); return true; } return false; }
    if (p.kind === 'valuable') { run.addValuable(p.id); this.audio('pickup'); this.showHint(p.name || 'TREASURE', 3); return true; }
    if (p.kind === 'key') { if (!run.keyItems.includes(p.id)) run.keyItems.push(p.id); this.audio('pickup'); return true; }
    if (p.kind === 'note') { if (!run.notes.includes(p.id)) run.notes.push(p.id); this.audio('pickup'); this.showHint('CLAIM NOTE FILED', 3); return true; }
    return true;
  }
  cycleWeapon(dir) {
    const have = WEAPON_ORDER.filter((w) => this.run.owns(w)); if (have.length < 2) return;
    const i = have.indexOf(this.run.equipped); this.player.equip(have[(i + dir + have.length) % have.length]); this.audio('uiMove');
  }
  selectWeaponSlot(n) { const have = WEAPON_ORDER.filter((w) => this.run.owns(w)); if (have[n - 1]) { this.player.equip(have[n - 1]); this.audio('uiMove'); } }
  cycleGrenade() { const g = this.run.grenades(); if (!g.length) return; const i = g.indexOf(this.run.grenade); this.run.grenade = g[(i + 1) % g.length]; this.audio('uiMove'); }
  useHerb() {
    const run = this.run, p = this.player; if (p.healCd > 0 || run.hp >= run.maxHp) return;
    const herbs = ['tin', 'mix100h', 'mix100', 'mix60', 'samphire'].filter((h) => run.case.count(h) > 0);
    if (!herbs.length) return;
    const id = herbs[0]; const d = ITEMS[id]; run.case.take(id, 1); if (d.maxUp) run.maxHp += d.maxUp; run.heal(d.heal || 0.3); p.healCd = 0.8; this.audio('heal'); this.flashT = 0.06; this.flashColor = 'lime';
  }
  firePlayer() { this.combat.firePlayer(); }
  throwGrenade() { this.combat.throwGrenade(); }
  knife() { this.combat.knife(); }
  hurtPlayer(dmg, fx, fz, kind, soft) {
    const p = this.player; if (!p || p.dead || p.downed) return;
    if (p.invuln > 0 && !soft) return;
    if (this.dev.god) return;
    dmg = dmg * this.diffMul() * TUNING.damageTaken;
    this.run.hp = Math.max(0, this.run.hp - dmg); this.noDamageT = 0; this.rank = clamp(this.rank - 0.04, 1, 5);
    if (!soft) {
      p.invuln = 0.45; p.h.flash(2); this.audio('hurt'); this.ctx.engine.shake.add(0.25); this.rumble(0.6, 0.6, 150);
      this.dmgArcs.push({ ang: Math.atan2(fx - p.x, fz - p.z) - this.cam.yaw + Math.PI, t: 0.7 });
      if (dmg >= 12 && p.state === 'free') p.doMelee('hurt', 0.3);
      if (this.run.hp / this.run.maxHp < 0.25 && this.rng.chance(0.3)) this.bark('MAX', "MY PREMIUM'S GOING UP.", 2.5);
    }
    if (this.run.hp <= 0) this.playerDied(kind);
    return true;
  }
  playerDied(kind) {
    const p = this.player; if (p.dead) return;
    p.dead = true; this.run.stats.deaths++; this.rank = clamp(this.rank - 0.5, 1, 5); this.deathKind = kind;
    this.audio('deathSting'); app.mix?.play(null);
    this.deathT = 0; this.onPlayerDead?.(kind);
  }
  flenserStrike(e) {
    const p = this.player;
    if (!this.diff.sawLethal) { this.hurtPlayer(80, e.x, e.z, 'saw'); return; }
    if (this.qteDodged) { this.qteDodged = false; return; }
    this.hurtPlayer(9999, e.x, e.z, 'saw');
  }
  /** Called when an enemy begins its wind-up: the Flenser's saw asks for a dodge. */
  onWindup(e) {
    if (e.type !== 'flenser' || !this.diff.sawLethal && false) return;
    if (e.type === 'flenser') {
      this.qteDodged = false;
      this.scripts.start(function* (a) {
        const ok = yield* a.qte({ type: 'press', verb: 'dodge', window: 0.9, label: 'DODGE' });
        if (ok) { a.qteDodged = true; a.player.invuln = 0.8; a.player.doMelee('dodge', 0.5); a.audio('whoosh'); }
      }, 'dodge');
    }
  }
  setStamp(text, color) { this.stamp = { text, color, t0: this.time }; this.audio('stamp'); this.ctx.engine.shake.add(0.4); }
  // ---------- frame loop ----------
  fixedUpdate(ctx, dt) {
    const eng = ctx.engine;
    this.time += dt; this.run.stats.time += dt;
    if (this.player.dead) { this.deathT += dt; this.scripts.update(dt); this.updateLater(dt); return; }
    const intent = this.opts.intentSource ? this.opts.intentSource(this, dt) : this.intent.fixed(ctx);
    this.cur = intent; this.intentNow = intent;
    this.scripts.update(dt);
    this.updateLater(dt);
    // QTE input
    if (this.scripts.qte) this.scripts.updateQte(dt, { action: intent.qteAction, dodge: intent.qteDodge, wrong: false });
    if (this.cutsceneActive && !this.scripts.qte) { return; }
    if (this.scripts.dlg && this.dlgFrozen) return;
    const heldIntent = this.qteBlocks ? { ...intent, mx: 0, my: 0, aim: false, fire: false, firePressed: false } : intent;
    this.player.fixedUpdate(heldIntent, dt);
    this.interact.update(heldIntent, dt);
    if (intent.shoulder) this.shoulder = -this.shoulder;
    if (intent.command && this.dame) this.interact.command();
    // world
    if (!this.frozen && !this.dev.freeze) {
      for (const e of this.enemies) e.update(dt);
      this.dame?.fixedUpdate(dt);
      this.combat.update(dt);
      this.director?.update(dt);
      this.noDamageT += dt; if (this.noDamageT > 12) { this.rank = clamp(this.rank + 0.05 * dt * 5 / 5, 1, 5); }
      this.wakeEnemies(dt);
    } else this.dame?.fixedUpdate(0);
    this.updatePickups(dt);
    this.def.fixed?.(this, dt);
    this.boss?.update?.(dt);
    this.tick = (this.tick || 0) + 1;
    if (this.tick % 30 === 0) this.cleanup();
  }
  updateLater(dt) {
    for (const l of [...this.later_]) { l.t -= dt; if (l.t <= 0) { this.later_.splice(this.later_.indexOf(l), 1); try { l.fn(); } catch (e) { this.scriptError(e); } } }
  }
  wakeEnemies(dt) {
    const waiting = this.enemies.filter((e) => e.state === S.WAIT && !e.dead);
    if (!waiting.length) return;
    this.wakeT = (this.wakeT || 0) - dt; if (this.wakeT > 0) return; this.wakeT = 0.4 + Math.max(0, this.rankFactor().cd);
    if (this.activeCount() < TUNING.maxActive) { const e = waiting[0]; e.setState(S.APPROACH); }
  }
  cleanup() {
    // despawn the oldest corpses above 20
    const dead = this.enemies.filter((e) => e.dead);
    if (dead.length > 20) { for (const e of dead.slice(0, dead.length - 20)) { e.dispose(); this.enemies.splice(this.enemies.indexOf(e), 1); } }
  }
  updatePickups(dt) {
    const p = this.player; if (!p) return;
    for (const k of [...this.pickups]) {
      k.t = (k.t || 0) + dt;
      if (k.mesh) { k.mesh.position.y = 0.3 + Math.sin(k.t * 3) * 0.06; k.mesh.rotation.y += dt * 2; }
      if (k.kind === 'chest') continue;
      const d = Math.hypot(k.x - p.x, k.z - p.z);
      const auto = k.kind === 'coin' || k.kind === 'item' && (ITEMS[k.id].kind === 'ammo' || ITEMS[k.id].kind === 'herb' || ITEMS[k.id].kind === 'grenade');
      if (auto && d < 1.0 && !p.dead) { if (this.collect(k)) { k.mesh?.removeFromParent(); this.pickups.splice(this.pickups.indexOf(k), 1); } else if (k.kind === 'item') { this.showHint('CASE FULL', 1.5); } }
    }
  }
  update(ctx, dt) {
    const eng = ctx.engine, alpha = ctx.physics.alpha ?? 1;
    ui.begin(ctx);
    this.frameDt = dt;
    app.mix?.update(Math.max(dt, 1 / 120));
    if (this.wantPause && !app.top()) { this.wantPause = false; this.openPause?.(); }
    const screen = app.top();
    if (screen) { screen.frame?.(this, ctx); this.drawFrozen(ctx, dt, alpha); return; }
    this.objectiveShow = Math.max(0, this.objectiveShow - dt); this.moneyShow = Math.max(0, this.moneyShow - dt); this.hintT = Math.max(0, this.hintT - dt); this.flashT = Math.max(0, this.flashT - dt);
    for (const d of this.dmgArcs) d.t -= dt; this.dmgArcs = this.dmgArcs.filter((d) => d.t > 0);
    this.scripts.updateBarks(dt);
    const keys = ctx.input;
    const pressedConfirm = keys.wasPressed('Enter', 'NumpadEnter', 'PadCross', 'KeyE', 'Space') || (keys.buttonEvents || []).some((e) => e.down && e.code === 'MouseLeft') || !!(this.opts.intentSource && this.cur?.actionPressed);
    if (this.scripts.dlg) this.scripts.updateDialogue(dt, pressedConfirm);
    if (this.scripts.cut) this.scripts.updateCut(dt, keys.isDown('PadCross', 'Space', 'Enter'));
    // look
    const p = this.player;
    this.updateCamera(ctx, dt);
    this.drawFrozen(ctx, dt, alpha);
    // pause / case / map shortcuts
    if (!this.scripts.cut && !this.player.dead) {
      if (keys.wasPressed('Escape', 'KeyP', 'PadOptions') && !keys.isDown('PadCreate')) this.openPause?.();
      else if (keys.wasPressed('Tab', 'KeyI', 'PadTriangle') && !this.scripts.qte) this.openCase?.();
      else if (keys.wasPressed('KeyM', 'PadCreate') && !keys.isDown('PadOptions')) this.openCase?.('MAP');
    }
    if (this.player.dead && this.deathT > 2.5 && !this.deathShown) { this.deathShown = true; this.openDenied?.(); }
  }
  updateCamera(ctx, dt) {
    const p = this.player, c = this.cam, w = p.weapon;
    if (!this.scripts.cut && !p.dead && !this.cutsceneActive) {
      const assist = this.aimAssistScale();
      const look = this.opts.lookSource ? this.opts.lookSource(this, dt) : this.intent.look(ctx, dt, p.aiming, assist);
      c.yaw += look.dyaw; c.pitch = clamp(c.pitch + look.dpitch, -0.7, 0.7);
    }
    const aiming = p.aiming;
    const tgt = aiming ? (w.scope ? { dist: 2.9, up: 0.1, side: 0.95, fov: 16 } : { dist: 2.9, up: 0.1, side: 0.95, fov: 42 }) : { dist: 4.0, up: 0.45, side: 0.55, fov: 55 };
    const k = 1 - Math.exp(-dt / 0.06);
    c.dist = lerp(c.dist, tgt.dist, k); c.up = lerp(c.up, tgt.up, k); c.side = lerp(c.side, tgt.side, k); c.fov = lerp(c.fov, tgt.fov, k);
    this.updateCamPos();
  }
  aimAssistScale() {
    const p = this.player; if (!p.aiming || !settings.aimAssist) return 1;
    const hit = this.aimHit; if (!hit || hit.kind !== 'enemy') return 1;
    return 1 - clamp(TUNING.aimAssist * this.diff.assist, 0, 0.85);
  }
  drawFrozen(ctx, dt, alpha) {
    const p = this.player, scale = 1;
    p.updateVisual(dt, alpha);
    for (const e of this.enemies) e.updateVisual(dt, alpha);
    this.dame?.updateVisual(dt, alpha);
    this.level.fathomActor && this.updateFathom(ctx, dt);
    this.fx.update(dt); updateMood(this.mood, dt, this.ctx.camera.focus);
    this.def.visual?.(this, dt);
    this.updateLaser();
    if (this.water) this.water.update(ctx.time);
    const fl = this.level;
    if (!app.top()) drawHud(this);
    if (this.hudExtra) this.hudExtra(ui);
    app.attractFrame?.(this, ctx, dt);
  }
  updateFathom(ctx, dt) {
    const f = this.level.fathomActor, p = this.player; f.update(dt); f.placeShadow(0);
    const d = Math.hypot(p.x - f.root.position.x, p.z - f.root.position.z);
    f.root.rotation.y = turnToward(f.root.rotation.y, Math.atan2(p.x - f.root.position.x, p.z - f.root.position.z), 3 * dt);
    this.fathomLoop?.set({ volume: clamp(1 - d / 18, 0, 1) * 0.6 });
  }
  updateLaser() {
    const p = this.player, L = this.laser;
    if (!p.aiming || p.dead || this.scripts.cut) { L.visible = false; return; }
    const ray = this.combat.aimRay({}); const hit = this.combat.trace(ray, 60);
    const m = p.muzzle(new Vector3()); const to = hit.point;
    const dx = to.x - m.x, dy = to.y - m.y, dz = to.z - m.z; const len = Math.hypot(dx, dy, dz);
    L.visible = true; L.position.set((m.x + to.x) / 2, (m.y + to.y) / 2, (m.z + to.z) / 2); L.scale.set(1, 1, len);
    L.lookAt(to.x, to.y, to.z);
  }
  cameraTarget() { const p = this.player; const ov = this.def.cameraTargetOverride?.(this); if (ov) return this.target.set(ov.x, 1.3, ov.z); if (!p) return this.target.set(0, 1.3, 0); return this.target.set(p.x, 1.3, p.z); }
  status() { const p = this.player; return `${this.def.id} hp ${Math.round(this.run.hp)} kills ${this.killsThisArea} enemies ${this.aliveEnemies().length} pos ${p ? p.x.toFixed(1) + ',' + p.z.toFixed(1) : '?'}`; }
  fingerprint() {
    const p = this.player; return [this.time.toFixed(2), p?.x.toFixed(2), p?.z.toFixed(2), Math.round(this.run.hp), this.enemies.map((e) => `${e.id}${e.state}${e.x.toFixed(1)}${e.z.toFixed(1)}${Math.round(e.hp)}`).join('|')].join(';');
  }
  ready(ctx) { try { globalThis.__GAME__ = this; if (typeof window !== 'undefined') window.__GAME__ = this; } catch { /* */ } }
}
