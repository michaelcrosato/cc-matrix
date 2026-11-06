// One level: all the systems meet here. Each area is one Game loaded with engine.loadGame.
import { PALETTE, spatialize, THREE, toonMaterial, setLookLayer, glowMaterial } from '../../pixel-engine.js';
import { AREAS, TANNOY_INDEX } from '../data/levels/areas.js';
import { TUNING } from '../data/tuning.js';
import { GRENADES, WEAPONS } from '../data/weapons.js';
import { ITEMS } from '../data/items.js';
import { BARKS, CHAPTERS, COLORS, SCENES, TANNOY_LINES, HINTS } from '../data/dialogue.js';
import { addItem, ammoOf, diff, statsOf } from '../core/run.js';
import { BIND, HumanIntent, BotIntent } from '../core/intent.js';
import { device, pollPads, rumble } from '../core/device.js';
import { registerSfx } from '../audio/sfx.js';
import { registerVoices, VoiceLine, bark } from '../audio/voice.js';
import { Level } from './levelBuild.js';
import { addBackdrops, addWater, applyMood } from './world.js';
import { FX, registerParticles } from './fx.js';
import { Player, CAM } from './player.js';
import { Enemy } from './enemy.js';
import { Dame } from './companion.js';
import { addDoorActions, addWindowActions, Interact } from './interact.js';
import { QTE } from './qte.js';
import { Cutscene, Dialog } from './cutscene.js';
import { Script, Wave, pymLine } from './director.js';
import { castShot, raySphere, pointAt } from './combat.js';
import { lootNeed } from './loot.js';
import { drawHud, drawQte, drawSubs, project } from './hud.js';
import { buildProp, Humanoid } from './actor.js';
import { openCase, openMapTab } from '../screens/case.js';
import { openShop } from '../screens/shop.js';
import { PauseMenu } from '../screens/pause.js';
import { DeniedScreen } from '../screens/denied.js';
import { FormScreen } from '../screens/form.js';
const dir = new THREE.Vector3(), right = new THREE.Vector3(), pos = new THREE.Vector3(), tmp = new THREE.Vector3(), look = new THREE.Vector3();
export class Area {
  constructor(app, id, o = {}) {
    this.app = app; this.id = id; this.o = o; this.name = `area-${id}`; this.def = { ...AREAS[id] }; this.attract = !!o.attract; this.floorH = 3.2; this.silent = false;
    this.enemies = []; this.players = []; this.shootables = []; this.waters = []; this.ragdolls = []; this.corpses = []; this.drops = []; this.projectiles = []; this.fires = []; this.scripts = []; this.waves = []; this.subs = []; this.barks = []; this.tokensHeld = 0; this.throwHolder = null; this.moneyShow = 0; this.objT = 0; this.objective = ''; this.hintT = 0; this.quietBarks = 0; this.barkCD = 0; this.barkMaxT = 0; this.menu = null; this.cutscene = null; this.commandSpots = []; this.tannoys = []; this.fathoms = []; this.statues = []; this.time = 0; this.deathT = 0; this.calm = false; this.fadeOut = null; this.runStart = 0; this.dropN = 0;
  }
  get run() { return this.app.run; }
  async setup(ctx) {
    this.ctx = ctx; this.app.attach(ctx.engine); this.rng = ctx.random.fork('gameplay'); this.cosmetic = ctx.random.fork('cosmetic'); this.headless = !ctx.engine.gpu; this.app.area = this;
    registerSfx(ctx.audio); registerVoices(ctx.audio); registerParticles(ctx);
    const def = this.def; this.fx = new FX(ctx); this.interact = new Interact(this); this.qte = new QTE(this); this.dialog = new Dialog(this); this.level = new Level(this, def);
    applyMood(this, def.mood); this.level.build();
    if (def.water !== false) addWater(this, Math.max(this.level.W + 140, 200), Math.max(this.level.H + 140, 200), def.waterY ?? -0.35, def.waterOpt ?? {});
    if (def.backdrops) addBackdrops(this, def.backdrops);
    this.setupMarkers();
    const a = this.level.markers.a[0] ?? { x: 0, z: 0 }; const ent = this.o.at; const sx = ent ? ent[0] : a.x, sz = ent ? ent[1] : a.z;
    this.player = new Player(this, sx, sz, { yaw: this.o.yaw ?? def.startYaw ?? Math.PI, floor: this.o.floor ?? 0 }); this.players = [this.player]; this.player.camYaw = this.player.yaw; this.setupCamera();
    this.human = new HumanIntent(); this.intent = this.attract || this.o.bot ? new BotIntent() : this.human;
    this.restoreFlags();
    addWindowActions(this); addDoorActions(this);
    def.setup?.(this);
    if (def.dame && (this.run.flags.dameFree || def.dame === 'always')) this.spawnDame();
    if (def.music !== undefined && !this.o.noMusic) this.app.mix.play(def.music);
    for (const l of def.loops ?? []) { const v = ctx.audio.loop(l, { volume: { rain: 0.8, sea: 0.5, conveyor: 0.6 }[l] ?? 0.5 }); v.set({ volume: this.app.settings.sfx }); }
    this.gullT = 3;
    if (!this.o.resumed && !this.attract && !this.o.jump) this.checkpoint();
    if (this.o.jump) { def.jumps?.[this.o.jump]?.(this); if (!this.attract) this.checkpoint(true); }
    else if (!this.attract || this.o.runBeats) this.startBeats();
    if (this.attract && this.o.attractStart) this.o.attractStart(this);
    this.chapterCard = (!this.o.fromSave && !this.attract && def.chapterCard) ? { text: CHAPTERS[def.chapterCard], t: 3.6 } : null;
  }
  ready(ctx) { if (typeof window !== 'undefined') window.__GAME__ = this; ctx.input.preventKeys.add('Tab'); if (!this.attract) this.app.wantPointerLock(true); }
  // ----- camera
  setupCamera() {
    const rig = this.ctx.camera, A = this; rig.zoomable = false; rig.focus; const c = this.player.cam;
    rig.step = (u) => {
      const P = A.player; if (!P) return;
      if (A.cutscene || A.camOverride) { const s = A.camOverride ? A.camOverride() : A.cutscene.camera(); if (s) { rig.camera.position.set(...s.position); rig.camera.lookAt(...s.target); rig.focus.set(...s.target); if (rig.camera.fov !== s.fov) { rig.camera.fov = s.fov; rig.camera.updateProjectionMatrix(); } return; } }
      const cc = P.cam, y = P.camYaw, pi = P.camPitch + P.recoil; dir.set(Math.sin(y) * Math.cos(pi), Math.sin(pi), Math.cos(y) * Math.cos(pi)); right.set(-Math.cos(y), 0, Math.sin(y));
      pos.copy(u.target).addScaledVector(dir, -cc.dist).addScaledVector(right, cc.side * P.shoulder); pos.y += cc.up;
      tmp.copy(pos).sub(u.target); const len = tmp.length(); tmp.normalize(); const hit = u.world.raycast?.(u.target, tmp, len); if (hit != null) pos.copy(u.target).addScaledVector(tmp, Math.max(0.4, hit - 0.2));
      rig.focus.copy(u.target); rig.camera.position.copy(pos); (P.rigPos ??= new THREE.Vector3()).copy(pos); if (rig.camera.fov !== cc.fov) { rig.camera.fov = cc.fov; rig.camera.updateProjectionMatrix(); }
      rig.camera.lookAt(look.copy(pos).addScaledVector(dir, 12)); P.root.visible = (pos.distanceTo(u.target) > 0.9) && !(P.aiming && P.stats?.scope);
    };
  }
  cameraTarget() { const P = this.player; if (!P) return (this._t ??= new THREE.Vector3()); this._t ??= new THREE.Vector3(); return this._t.set(P.root.position.x, P.root.position.y + 1.3, P.root.position.z); }
  // ----- markers
  setupMarkers() {
    const L = this.level, M = L.markers, def = this.def, ctx = this.ctx;
    M.t.forEach((m) => this.addTelegraph(m));
    M.m.forEach((m, i) => this.addFathom(m, i));
    M.y.forEach((m, i) => this.addTannoy(m, (TANNOY_INDEX[this.id] ?? 0) + i));
    M.$.forEach((m, i) => this.addChest(m, i));
    for (const [col, row] of def.barrels ?? []) this.addBarrel(L.wx(col), L.wz(row));
    for (const s of def.hideSpots ?? []) { const x = L.wx(s[0]), z = L.wz(s[1]); L.addSolidProp(s[2] ?? 'lobsterpot', x, z); this.commandSpots.push({ x, z, verb: 'HIDE', when: () => this.dame && !this.dame.hidden && !this.dame.carried, act: () => { this.dame.hide({ x, z }); } }); }
    for (const [id, col, row, turn, o] of def.props ?? []) L.addSolidProp(id, L.wx(col), L.wz(row), turn ?? 0, o ?? {});
    for (const [id, col, row, turn, o] of def.decor ?? []) L.addProp(id, L.wx(col), L.wz(row), turn ?? 0, o ?? {});
    for (const [id, col, row, o] of def.lamps ?? []) { const y = o?.y ?? 0; const b = L.addProp(id, L.wx(col), L.wz(row), o?.turn ?? 0, { y }); if (b.light) ctx.lights.request({ ...b.light, position: b.object.localToWorld(new THREE.Vector3(...b.light.at)), intensity: o?.intensity ?? 16, radius: o?.radius ?? 10 }); else ctx.lights.request({ position: [L.wx(col), y + 2, L.wz(row)], color: o?.color ?? 0xffa040, intensity: o?.intensity ?? 8, radius: o?.radius ?? 9, flicker: 'torch' }); }
    for (const l of def.lights ?? []) ctx.lights.request({ position: [L.wx(l[0]), l[2], L.wz(l[1])], color: l[3], intensity: l[4], radius: l[5], flicker: l[6] });
    for (const n of def.notes ?? []) this.addNote(n);
    for (const s of def.groundItems ?? []) { if (!this.picked(`g${s[1]},${s[2]}`)) this.spawnDrop(L.wx(s[1]), L.wz(s[2]), { id: s[0], count: s[3] ?? ITEMS[s[0]]?.gives ?? 1, key: `g${s[1]},${s[2]}` }); }
    this.autoDress();
  }
  autoDress() {
    const def = this.def; if (!def.dress) return; const L = this.level, R = this.cosmetic, rows = L.rows; const noBlock = new Set();
    for (let y = 2; y < L.H - 2; y += 4) for (let x = 2; x < L.W - 2; x += 4) {
      const cands = []; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const c = rows[y + j]?.[x + i]; if (!c || !'.,=:_%r'.includes(c)) continue; let walls = 0, bad = 0; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const n = rows[y + j + b]?.[x + i + a]; if (n === undefined) continue; if ('#T'.includes(n)) walls++; if (!'.,=:_%r#T~H'.includes(n)) bad++; } if (!bad) cands.push({ col: x + i, row: y + j, walls }); }
      if (!cands.length) continue; const wall = cands.filter((c) => c.walls > 0); const pool = wall.length ? wall : cands; const n = wall.length ? R.int(1, 2) : R.chance(0.35) ? 1 : 0;
      for (let k = 0; k < n; k++) { const c = R.pick(pool); const key = c.col + ',' + c.row; if (noBlock.has(key)) continue; noBlock.add(key); const list = c.walls ? def.dress.wall : def.dress.open; if (!list?.length) continue; const id = R.pick(list); const b = L.addProp(id, L.wx(c.col) + R.range(-0.2, 0.2), L.wz(c.row) + R.range(-0.2, 0.2), R.range(-3, 3)); b.object.traverse((m) => { if (m.isMesh) m.castShadow = false; }); }
    }
  }
  addTelegraph(m) {
    const L = this.level; const b = L.addSolidProp('telegraph', m.x, m.z, Math.PI); if (b.light) this.ctx.lights.request({ ...b.light, position: b.object.localToWorld(new THREE.Vector3(...b.light.at)) });
    this.interact.add({ x: m.x, z: m.z, radius: 2, priority: 1, verb: 'SAVE AT THE TELEGRAPH', any: true, act: () => { this.ctx.audio.play('telegraph'); this.checkpoint(true); this.say('MAX', 'Filed.', 2); this.app.saveGame(); return true; } });
    this.safeRooms = this.safeRooms ?? []; this.safeRooms.push(m);
  }
  addFathom(m, i) {
    const h = new Humanoid(this.ctx, 'fathom'); h.root.position.set(m.x, 0, m.z); h.root.rotation.y = this.def.fathomYaw ?? 0; h.play('FathomIdle'); const f = { h, m, x: m.x, z: m.z };
    this.ctx.lights.request({ follow: h.root, offset: [0.4, 1, 0.4], color: 0x60ff90, intensity: 7, radius: 6, priority: 3, flicker: 'pulse' });
    f.voice = this.ctx.audio.loop('bubbleloop', { volume: 0 }); this.fathoms.push(f);
    this.interact.add({ x: m.x, z: m.z, radius: 2.4, priority: 3, verb: 'BROWSE', any: true, act: () => { this.talkFathom(f); return true; } });
  }
  talkFathom(f) {
    if (!this.run.seen.fathom) { this.run.seen.fathom = true; this.player.locked = true; this.dialog.start(SCENES.fathom1, { lock: true, done: () => { this.player.locked = false; openShop(this, f); } }); return; }
    openShop(this, f);
  }
  addTannoy(m, idx) {
    const b = this.level.addProp('tannoy', m.x, m.z, this.cosmetic.range(-3, 3), { floats: true }); const t = { b, m, idx, dead: this.run.tannoys.includes(idx), spoke: false, pos: new THREE.Vector3(m.x, 4.2, m.z), r: 0.55, kind: 'tannoy', through: 0.5 }; if (t.dead) { b.object.getObjectByName('Horn').rotation.x = 1; }
    t.hit = () => this.shootTannoy(t); this.tannoys.push(t); this.shootables.push(t);
  }
  shootTannoy(t) {
    t.dead = true; this.ctx.audio.play('tannoybreak', this.spatialPlay(t.pos)); this.ctx.particles.burst('spark', t.pos, { count: 14 }); t.b.object.getObjectByName('Horn').rotation.x = 1; if (!this.run.tannoys.includes(t.idx)) this.run.tannoys.push(t.idx);
    if (t.sub) { t.sub.text = t.sub.text.slice(0, Math.floor(t.sub.n)) + '-'; t.sub.n = t.sub.text.length; t.sub.t = 1; }
    this.say('MAX', this.rng.pick(BARKS.max.tannoy), 2); this.moneyShow = 2; this.onTannoy?.(t); this.area_flags().tannoys = this.run.tannoys.length;
  }
  addChest(m, i) { const key = `chest${m.col},${m.row}`; const b = this.level.addSolidProp('treasure-chest', m.x, m.z, this.cosmetic.range(-1, 1)); const opened = this.picked(key); if (opened) b.object.getObjectByName('Lid').rotation.x = -1.6; else this.ctx.lights.request({ position: [m.x, 0.9, m.z], color: 0xffcf70, intensity: 2, radius: 3, flicker: 'pulse' }); const loot = (this.def.treasure ?? [])[i] ?? 'goldtooth';
    if (!opened) { const it = this.interact.add({ x: m.x, z: m.z, radius: 1.9, priority: 4, verb: 'OPEN', any: true, act: () => { this.interact.remove(it); this.markPicked(key); this.ctx.tweens.to(b.object.getObjectByName('Lid').rotation, { x: -1.6 }, { duration: 0.4 }); this.ctx.audio.play('pickup'); addItem(this.run, loot); this.say('MAX', `${ITEMS[loot].name}. For the file.`, 3); this.ctx.particles.burst('sparkle', [m.x, 0.8, m.z]); return true; } }); this.chestsLeft = (this.chestsLeft ?? 0) + 1; } }
  addBarrel(x, z) { const b = this.level.addProp('brine-barrel', x, z); const col = this.ctx.physics.addStaticBox({ position: [x, 0.5, z], halfExtents: [0.38, 0.5, 0.38] }); this.ctx.physics.tag(col, 'noCamera'); const s = { pos: new THREE.Vector3(x, 0.55, z), r: 0.55, kind: 'barrel', obj: b.object, col, dead: false, hit: () => this.explodeBarrel(s) }; this.shootables.push(s); return s; }
  explodeBarrel(s) { if (s.dead) return; s.dead = true; this.ctx.scene.remove(s.obj); this.ctx.physics.remove(s.col); this.explode(s.pos, 3, 60, { barrel: true }); this.ctx.audio.play('barrel', this.spatialPlay(s.pos)); this.onBarrel?.(s); }
  addNote(n) { const key = `note${n.id}`; if (this.run.notes.includes(n.id)) return; const x = this.level.wx(n.col), z = this.level.wz(n.row); const m = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.26), toonMaterial(PALETTE.white)); m.position.set(x, n.y ?? 0.9, z); this.ctx.scene.add(m); const it = this.interact.add({ x, z, radius: 1.6, priority: 4, verb: 'READ NOTE', any: true, act: () => { this.interact.remove(it); this.ctx.scene.remove(m); this.run.notes.push(n.id); this.ctx.audio.play('uiconfirm'); openCase(this, { tab: 4, focusNote: n.id }); return true; } }); }
  // ----- flags (checkpoint data)
  area_flags() { return (this.run.areaFlags[this.id] ??= { picked: [], doors: [], gates: [], crates: [], beats: [] }); }
  picked(k) { return this.area_flags().picked.includes(k); }
  markPicked(k) { const f = this.area_flags(); if (!f.picked.includes(k)) f.picked.push(k); }
  markDoor(d) { const f = this.area_flags(); if (!f.doors.includes(d.id)) f.doors.push(d.id); }
  markGate(g) { const f = this.area_flags(); if (!f.gates.includes(g.id)) f.gates.push(g.id); }
  markCrate(c) { const f = this.area_flags(); if (!f.crates.includes(c.id)) f.crates.push(c.id); }
  markBeat(id) { const f = this.area_flags(); if (!f.beats.includes(id)) f.beats.push(id); }
  beatDone(id) { return this.area_flags().beats.includes(id); }
  restoreFlags() {
    const f = this.area_flags(), L = this.level; for (const d of L.doors) if (f.doors.includes(d.id)) { L.openDoor(d, null, true); }
    for (const id of f.gates) if (L.gates[id]) L.openGate(L.gates[id]); for (const c of L.crates) if (f.crates.includes(c.id)) L.breakCrate(c, true);
  }
  checkpoint(atPlayer) { const P = this.player, D = P.actionData; const safe = P.action && D?.tx != null; this.run.area = this.id; this.run.entry = atPlayer || this.o.fromSave ? { at: safe ? [D.tx, D.tz] : [P.pos.x, P.pos.z], yaw: P.yaw, floor: safe ? (D.toFloor ?? P.floor) : P.floor } : null; this.app.makeCheckpoint(this); }
  // ----- beats
  startBeats() { const f = this.area_flags(); const st = f.stage ?? this.def.first; if (st) this.enterStage(st, !f.stage); }
  /** A named stretch of story. Reloading a checkpoint restarts the stage it was saved in. */
  enterStage(name, noCheckpoint) { const steps = this.def.stages?.[name]; if (!steps) throw new Error(`no stage ${name} in ${this.id}`); this.area_flags().stage = name; this.stage = name; this.addScript(typeof steps === 'function' ? steps(this) : steps); if (!noCheckpoint && !this.attract) this.checkpoint(true); }
  addScript(steps, id, onDone) { const s = new Script(this, steps, { id, onDone }); this.scripts.push(s); return s; }
  startWave(o) { const w = new Wave(this, o); this.waves.push(w); return w; }
  setObjective(t) { this.objective = t; this.objT = t ? 6 : 0; }
  showHint(key) { this.hintText = HINTS[key] ?? key; this.hintT = 6; }
  radio(key) { this.sayLines(pymLine(key)); }
  say(who, text, dur = 3) { if (this.silent && who !== 'COMMODORE') return; const s = { who, text: String(text), n: 0, t: dur + text.length / 30, color: COLORS[who] ?? 'mist', voice: new VoiceLine(this.ctx.audio, who, text, () => this.app.settings.voice) }; this.subs.push(s); if (this.subs.length > 3) this.subs.shift(); return s; }
  sayLines(lines) { let delay = 0; for (const l of lines) { const d = delay; this.ctx.tweens.call(d, () => this.say(l.who, l.text, 1.6)); delay += 1.4 + l.text.length / 22; } this.subsUntil = this.ctx.time + delay; }
  subsBusy() { return this.ctx.time < (this.subsUntil ?? 0); }
  barkMax(list, chance = 1) { if (this.barkMaxT > 0 || this.rng.next() > chance) return; this.barkMaxT = 4; this.say('MAX', this.rng.pick(list), 1.2); }
  dameBark(list) { if (this.dameBarkT > 0) return; this.dameBarkT = 3; this.say('DAME', this.rng.pick(list), 1.6); }
  subBark(e, text) { if (this.barkCD > 0) return; this.barkCD = 1.1; this.barks.push({ e, text, t: 1.2, screen: null, color: 'orange' }); }
  playCutscene(o) { this.cutscene = new Cutscene(this, o); this.player.aiming = false; }
  endCutscene() { this.cutscene = null; }
  openGateNamed(g) { const L = this.level, v = L.gates[g]; if (Array.isArray(v)) for (const x of v) L.openGate(x); else if (v) L.openGate(v); }
  // ----- targets
  nearestPlayer(p) { let b = null, bd = 1e9; for (const P of this.players) { if (P.dead || P.down) continue; const d = (P.pos.x - p.x) ** 2 + (P.pos.z - p.z) ** 2; if (d < bd) { bd = d; b = P; } } return b; }
  meleeTarget(e) { let best = null, bd = e.def.reach + 0.5; const fx = Math.sin(e.yaw), fz = Math.cos(e.yaw); const test = (T) => { if (!T || T.dead || T.down || T.floor !== e.floor) return; const dx = T.pos.x - e.pos.x, dz = T.pos.z - e.pos.z, d = Math.hypot(dx, dz); if (d < bd && (d < 0.8 || (dx * fx + dz * fz) / d > 0.2)) { bd = d; best = T; } }; for (const P of this.players) test(P); if (this.dame?.active && !this.dame.hidden && !this.dame.carried) test(this.dame); return best; }
  grabTargetOf(e) { for (const P of this.players) if (P.grabbed === e) return P; return null; }
  rank() { return this.run.rank ?? 2; }
  maxActiveNow() { return Math.round(TUNING.maxActive); }
  maxTokens() { const r = this.rank(); return Math.max(1, Math.round(TUNING.attackTokens) + diff(this.run).tokens + (r >= 4 ? 1 : r <= 1 ? -1 : 0)); }
  requestToken(e) { if (e.token) return true; if (this.tokensHeld >= this.maxTokens()) return false; e.token = true; this.tokensHeld++; this.maxSeen = Math.max(this.maxSeen ?? 0, this.tokensHeld); return true; }
  releaseToken(e) { if (e.token) { e.token = false; this.tokensHeld = Math.max(0, this.tokensHeld - 1); } }
  hasToken() { return this.tokensHeld < this.maxTokens(); }
  requestThrow(e) { if (this.throwHolder && this.throwHolder !== e && !this.throwHolder.dead) return false; this.throwHolder = e; return true; }
  releaseThrow(e) { if (this.throwHolder === e) this.throwHolder = null; }
  // ----- nav
  navOf(floor, idx = 0) { const L = this.level, list = L.navs[floor] ?? L.navs[0]; if (!list[idx]) { const b = floor ? L.loft.map.rows : L.rows; const o = floor ? { cell: 1, origin: [L.loft.col - L.W / 2, 0, L.loft.row - L.H / 2], blocked: 'TWE' } : L.navOpt; const g = list[0].constructor.fromRows(b, o); for (let y = 0; y < g.height; y++) for (let x = 0; x < g.width; x++) g.setOpen(x, y, list[0].isOpen(x, y)); list[idx] = g; } return list[idx]; }
  flowNav(floor, T) { const g = this.navOf(floor, T.index ?? 0); if (T.floor === floor) g.flowTo(T.pos.x, T.pos.z); else { const l = this.bestLink(floor); if (l) g.flowTo(l.x, l.z); } return g; }
  bestLink(floor) { const P = this.player; let b = null, bd = 1e9; for (const l of this.level.links) { if (l.disabled?.()) continue; const s = l.from === floor ? l.a : l.to === floor ? l.b : null; if (!s) continue; const d = Math.hypot(s.x - P.pos.x, s.z - P.pos.z) * (l.pref ?? 1); if (d < bd) { bd = d; b = s; } } return b; }
  linkAt(e) { for (const l of this.level.links) { if (l.disabled?.()) continue; const [s, t, tf] = l.from === e.floor ? [l.a, l.b, l.to] : l.to === e.floor ? [l.b, l.a, l.from] : []; if (!s) continue; if (Math.hypot(s.x - e.pos.x, s.z - e.pos.z) < 0.8) return { fx: e.pos.x, fz: e.pos.z, fy: e.pos.y, tx: t.x, tz: t.z, ty: tf * this.floorH, toFloor: tf, ladder: l.ladder }; } return null; }
  los(a, b, floor) { return this.level.sightLine(a, b, floor); }
  ears() { return this.player?.pos ?? this.level?.markers.a[0]; }
  pathToWater(e) { const s = this.level.nearestShore(e.pos, e.floor); if (!s) return []; e.seaDir = s.dir; const x = this.level.wx(s.col), z = this.level.wz(s.row); const p = this.navOf(e.floor, 0).path([e.pos.x, 0, e.pos.z], [x, 0, z]) ?? [[x, 0, z]]; p.push([x + s.dir[0], 0, z + s.dir[1]]); return p; }
  pathToDoor(e) { const L = this.level; let best = null, bd = -1; for (const k in L.spawns) { const s = L.spawns[k]; if (!s) continue; const d = -Math.hypot(s.x - e.pos.x, s.z - e.pos.z); if (best == null || d > bd) { bd = d; best = s; } } return best ? this.navOf(0, 0).path([e.pos.x, 0, e.pos.z], [best.x, 0, best.z]) : null; }
  spatial(p, o = {}) { const cam = this.ctx.camera.camera, m = cam.matrixWorld.elements; return spatialize({ position: cam.position, right: { x: m[0], y: m[1], z: m[2] } }, p, { ref: 3, max: 34, ...o }); }
  spatialPlay(p, vol = 1) { const s = this.spatial(p); return { volume: s.gain * vol, pan: s.pan }; }
  // ----- spawning
  spawnEnemy(type, x, z, o = {}) { if (this.enemies.filter((e) => !e.dead).length >= 60) return null; const e = new Enemy(this, type, x, z, o); this.enemies.push(e); return e; }
  removeEnemy(e) { const i = this.enemies.indexOf(e); if (i >= 0) this.enemies.splice(i, 1); e.destroy(); const c = this.corpses.indexOf(e); if (c >= 0) this.corpses.splice(c, 1); }
  addCorpse(e) { this.corpses.push(e); if (this.corpses.length > 20) { const o = this.corpses.shift(); this.removeEnemy(o); } }
  nearestCorpse(p, r) { let b = null, bd = r * r; for (const c of this.corpses) { if (c.ragdoll || c.popped) continue; const d = (c.pos.x - p.x) ** 2 + (c.pos.z - p.z) ** 2; if (d < bd) { bd = d; b = c; } } return b; }
  raiseCorpse(c, limpet) { limpet.dead = true; this.removeEnemy(limpet); const { x, z } = c.pos, f = c.floor; this.removeEnemy(c); const n = this.spawnEnemy('resalted', x, z, { floor: f }); this.ctx.particles.burst('salt', [x, 0.8, z]); return n; }
  alertAround(p, r, except) { for (const e of this.enemies) if (!e.dead && e !== except && !e.alerted && Math.hypot(e.pos.x - p.x, e.pos.z - p.z) < r) e.alert(); if (except && !except.alerted) except.alert(); }
  spawnDame() { const m = this.level.markers.d[0], P = this.player; const x = this.o.dameAt?.[0] ?? (m ? m.x : P.pos.x - 1), z = this.o.dameAt?.[1] ?? (m ? m.z : P.pos.z + 1); this.dame = new Dame(this, x, z); return this.dame; }
  command() {
    const D = this.dame; if (!D || !D.active || D.carried) { this.ctx.audio.play('uideny'); return; }
    const s = this.nearestCmd(); if (s) { s.act(); return; }
    if (D.hidden) { D.setMode('follow'); return; } D.setMode(D.mode === 'follow' ? 'wait' : 'follow'); this.ctx.audio.play('uimove');
  }
  nearestCmd() { const P = this.player; let b = null, bd = 2.4; for (const c of this.commandSpots) { if (c.when && !c.when()) continue; const d = Math.hypot(c.x - P.pos.x, c.z - P.pos.z); if (d < (c.radius ?? bd) && d <= bd + 40) { if (!b || d < bd) { b = c; bd = d; } } } return b; }
  onDameLost() { if (this.player.god) { this.dame.dropped(); return; } this.gameOver('THE INSURED WAS LOST'); }
  onDameDead() { if (this.player.god) { this.dame.hp = 1; return; } this.gameOver('THE INSURED IS DECEASED'); }
  addDeduction(n) { this.run.deductions += n; }
  rankOnHurt() { this.noDmg = 0; }
  // ----- combat
  /** One pellet from a player. Returns whether it hit something living. */
  resolveShot(P, o, d, W, wid) {
    const assist = this.inputIsPad() ? 0.03 : 0; const res = castShot(this, o, d, 0, 80, assist); let pierce = W.pierce ?? 0, hit = false, stopped = false;
    for (const h of res.hits) {
      const pt = pointAt(o, d, h.t, new THREE.Vector3());
      if (h.shootable) { h.shootable.hit(W.damage, pt, P); if (h.shootable.kind !== 'glass') { stopped = h.shootable.stops !== false; if (stopped) { hit = hit || !!h.shootable.counts; break; } } continue; }
      if (h.part) { h.part.hit(W.damage * TUNING.weaponDamage, pt, wid); hit = true; stopped = true; break; }
      const e = h.enemy; let dmg = W.damage * TUNING.weaponDamage; if (W.falloff && h.t > W.falloff) dmg *= Math.max(0.2, 1 - (h.t - W.falloff) / W.falloff);
      if (W.pellets > 1 && W.pushAll) e.knock([d.x, d.z]);
      const counted = e.damage(dmg, h.zone, { from: P.pos, point: pt, weapon: wid, scatter: W.pellets > 1, popChance: W.popChance ?? 0, pin: W.pin, knock: W.knock && h.t < 6 && h.zone !== 'head', knockDir: [d.x, d.z], by: P });
      if (counted) { hit = true; if (h.zone === 'head') this.run.stats.heads++; }
      if (W.pin && !e.dead) this.harpoonPin(e, pt, d); else if (W.pin) this.spawnBolt(pt);
      if (pierce-- <= 0) { stopped = true; break; }
    }
    if (!stopped && res.world) { const pt = res.world.point; this.fx.impact(pt, res.world.normal); if (W.pin) this.spawnBolt(pt); }
    if (hit) this.onHitConfirm?.();
    return hit;
  }
  inputIsPad() { return device.last === 'pad'; }
  harpoonPin(e, pt, d) { this.spawnBolt(pt); this.ctx.audio.play('kickhit', this.spatialPlay(pt, 0.5)); }
  spawnBolt(pt) { const y = Math.max(0.4, pt.y); this.spawnDrop(pt.x, pt.z, { id: 'ammo_bolts', count: 1, y, model: 'w-bolt' }); }
  knifeHit(P) { const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw); let any = false; for (const e of this.enemies) { if (e.dead || e.floor !== P.floor) continue; const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz); if (d < 2 && (d < 0.5 || (dx * fx + dz * fz) / d > 0.25)) { const down = ['KNOCKDOWN', 'GETUP', 'PIN'].includes(e.state) || e.crawler; e.damage((down ? 24 : 8) * TUNING.weaponDamage, 'torso', { from: P.pos, point: e.zones.pelvis ?? e.zones.head, weapon: 'knife', kick: e.crawler }); any = true; } }
    for (const s of this.shootables) { if (s.dead || !['crate', 'barrel'].includes(s.kind)) continue; if (Math.hypot(s.pos.x - P.pos.x, s.pos.z - P.pos.z) < 1.8 && s.kind === 'crate') s.hit(); }
    this.boss?.knifeHit?.(P); if (any) this.ctx.engine.hitstop(0.03); }
  kickHit(P, target, kind) {
    const ctx = this.ctx, fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), R = kind === 'kick' ? TUNING.kickRadius : 1.5; this.run.stats.kicks++; ctx.audio.play('kickhit'); ctx.engine.hitstop(0.05); ctx.engine.shake.add(0.35 * this.app.settings.shake); rumble(1, 0.6, 180); this.ctx.particles.burst('dust', P.pos);
    for (const e of this.enemies) { if (e.dead || e.floor !== P.floor) continue; const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz); if (d > R && e !== target) continue; const cone = d < 0.4 || (dx * fx + dz * fz) / d > 0.5 || kind === 'takedown'; if (!cone && e !== target) continue; const dmg = e === target ? (kind === 'kick' ? TUNING.kickDamage * 1.6 : 60) : (kind === 'kick' ? TUNING.kickDamage : 15); e.damage(dmg * TUNING.weaponDamage, 'torso', { from: P.pos, point: e.zones.pelvis ?? e.zones.head, kick: true, explosive: true, knock: true, knockDir: [dx / (d || 1), dz / (d || 1)], weapon: 'kick' }); if (!e.dead && e.level?.isDeep) { /* into the water */ } this.kickIntoWater(e, dx, dz); }
    this.barkMax(BARKS.max.kick, 0.4); if (this.dame?.active) this.dameBark(BARKS.dame.kick);
  }
  kickIntoWater(e, dx, dz) { if (e.dead || e.crawler) return; const L = Math.hypot(dx, dz) || 1, c = this.level.charAt(e.pos.x + (dx / L) * 1.4, e.pos.z + (dz / L) * 1.4, e.floor); if (c === '~') { e.seaDir = [dx / L, dz / L]; e.hp = 0; e.dead = true; e.removeBody(); e.state = 'SINK'; e.t = 2; e.sinking = true; this.ctx.particles.burst('splash', e.pos); this.ctx.audio.play('splash', this.spatialPlay(e.pos)); this.onKill?.(e, { kick: true }, false); } }
  doorKnock(door, P) { for (const e of this.enemies) { if (e.dead) continue; if (Math.hypot(e.pos.x - door.x, e.pos.z - door.z) < 1.6) e.knock(null); } this.ctx.engine.shake.add(0.2 * this.app.settings.shake); }
  explode(p, r, dmg, o = {}) {
    this.fx.blast(p, r); this.ctx.engine.shake.add(0.6 * this.app.settings.shake); this.ctx.engine.hitstop(0.06); rumble(1, 1, 300);
    for (const e of this.enemies) { if (e.dead) continue; const d = e.pos.distanceTo(p); if (d < r + 0.3) { const k = 1 - Math.min(1, d / (r + 0.3)) * 0.5, dx = e.pos.x - p.x, dz = e.pos.z - p.z, L = Math.hypot(dx, dz) || 1; e.damage(dmg * k, 'torso', { explosive: true, from: p, point: e.zones.pelvis ?? e.zones.head, knock: true, knockDir: [dx / L, dz / L], weapon: 'blast' }); } }
    for (const P of this.players) if (P.pos.distanceTo(p) < r) P.hurt(dmg * 0.5, p, { knock: true });
    if (this.dame?.active && !this.dame.hidden && this.dame.pos.distanceTo(p) < r) this.dame.hurt(dmg * 0.25, p);
    for (const s of this.shootables) { if (s.dead || s.pos.distanceTo(p) > r) continue; if (s.kind === 'barrel') this.ctx.tweens.call(0.1, () => s.hit()); else if (s.kind === 'crate') s.hit(); }
    this.boss?.explosion?.(p, r, dmg, o); this.noise?.(p.x, p.z, 16);
  }
  spawnFire(p, r = 2.6, dur = 3) { const f = { pos: p.clone(), r, t: dur, puff: 0 }; const sf = this.spatial(p); f.voice = this.ctx.audio.loop('fireloop', { volume: sf.gain * 0.8, pan: sf.pan }); f.light = this.ctx.lights.request({ position: p, color: 0xff8030, intensity: 10, radius: r * 3, flicker: 'torch', lifetime: dur }); this.fires.push(f); this.ctx.audio.play('bottle', this.spatialPlay(p)); return f; }
  /** Thrown attacks: bottles, nets, harpoons. All shootable mid-air. */
  spawnThrow(e, T) {
    const k = e.def.throws, from = e.zones.armRb.clone(); const to = T.pos.clone(); to.y = (k === 'harpoon' ? 1.2 : 0.2);
    if (k === 'harpoon') { const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z, L = Math.hypot(dx, dy, dz) || 1, s = 22; this.addProjectile({ kind: 'harpoon', model: 'w-boathook', pos: from, vel: new THREE.Vector3(dx / L * s, dy / L * s, dz / L * s), g: 0, life: 2.2, r: 0.5, dmg: e.def.dmg, by: e, faces: true }); return; }
    const air = k === 'net' ? 0.75 : 0.95, g = 14; const vel = new THREE.Vector3((to.x - from.x) / air, (to.y - from.y) / air + 0.5 * g * air, (to.z - from.z) / air);
    this.addProjectile({ kind: k, model: k === 'net' ? 'draped-net' : 'w-bottle', scale: k === 'net' ? 0.4 : 1, pos: from, vel, g, life: air + 0.2, r: 0.42, dmg: e.def.dmg, by: e, lands: to.y });
    this.ctx.audio.play('kickwhoosh', this.spatialPlay(from, 0.6));
    if (k === 'bottle') { e.holding = true; const land = to.clone(); land.y = 0.04; this.addTelegraphMark(land, air); }
  }
  addTelegraphMark(p, t) { const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 1.1), glowMaterial(PALETTE.orange)); m.position.copy(p); this.ctx.scene.add(m); this.ctx.tweens.call(t, () => this.ctx.scene.remove(m)); }
  addProjectile(o) { const b = buildProp(o.model, { shadow: false }); const pr = { ...o, obj: b.object, dead: false, through: 0.2, kind: o.kind, stops: true, hit: (dmg, pt) => this.projectileShot(pr) }; if (o.scale) pr.obj.scale.setScalar(o.scale); pr.obj.position.copy(o.pos); this.ctx.scene.add(pr.obj); this.projectiles.push(pr); this.shootables.push(pr); return pr; }
  projectileShot(p) { if (p.dead) return; this.killProjectile(p); this.ctx.particles.burst(p.kind === 'bottle' ? 'fire' : 'spark', p.pos); if (p.kind === 'bottle') this.spawnFire(p.pos.clone().setY(0.1), 1.8, 1.6); if (p.kind === 'charge' || p.kind === 'mine') this.explode(p.pos, 3, 30); this.ctx.audio.play(p.kind === 'bottle' ? 'bottle' : 'armorping', this.spatialPlay(p.pos)); }
  killProjectile(p) { p.dead = true; this.ctx.scene.remove(p.obj); const i = this.projectiles.indexOf(p); if (i >= 0) this.projectiles.splice(i, 1); const j = this.shootables.indexOf(p); if (j >= 0) this.shootables.splice(j, 1); }
  landProjectile(p) {
    this.killProjectile(p); const P = this.nearestPlayer(p.pos); const d = P ? Math.hypot(P.pos.x - p.pos.x, P.pos.z - p.pos.z) : 99;
    if (p.kind === 'bottle') { this.spawnFire(new THREE.Vector3(p.pos.x, 0.08, p.pos.z), 1.9, 3); if (P && d < 1.7) P.hurt(p.dmg, p.pos, {}); }
    else if (p.kind === 'net') { if (P && d < 1.4) { P.slowT = 3; P.hurt(2, p.pos, {}); this.ctx.audio.play('kickwhoosh'); } }
    else if (p.grenade) this.detonate(p);
    else if (p.kind === 'glob') { this.ctx.particles.burst('brine', p.pos); if (P && d < 1.4) P.hurt(p.dmg, p.pos, {}); }
    else if (p.kind === 'rivet' || p.kind === 'harpoon') { if (P && d < 1) P.hurt(p.dmg, p.pos, {}); this.ctx.particles.burst('spark', p.pos); }
    p.onLand?.(p);
  }
  throwGrenade(P, kind, at) { const from = P.h.jointPos('HandR'); const to = at ? at.clone() : from.clone().add(new THREE.Vector3(Math.sin(P.camYaw) * 7, 0, Math.cos(P.camYaw) * 7)); to.y = 0.1; const air = 0.8, g = 14; const vel = new THREE.Vector3((to.x - from.x) / air, (to.y - from.y) / air + 0.5 * g * air, (to.z - from.z) / air); const model = { flare: 'w-flare', depth: 'w-depth', oil: 'w-bottle' }[kind]; const pr = this.addProjectile({ kind: 'grenade', grenade: kind, model, pos: from, vel, g, life: air, r: 0.3, stops: false }); this.shootables.splice(this.shootables.indexOf(pr), 1); }
  detonate(p) {
    const G = GRENADES[p.grenade], at = p.pos.clone(); at.y = 0.1;
    if (p.grenade === 'flare') { this.ctx.tweens.call(0.05, () => { this.ctx.audio.play('flare', this.spatialPlay(at)); this.ctx.particles.burst('flare', at); this.ctx.lights.request({ position: at.clone().setY(1), color: 0xffffff, intensity: 30, radius: 14, lifetime: 1.2 }); this.ctx.engine.screen?.flash?.('white', { duration: 0.15 }); for (const e of this.enemies) { if (e.dead) continue; const d = e.pos.distanceTo(at); if (d > G.radius) continue; if (e.crawler) e.die({ flare: true }); else if (!e.def.heavy || e.type === 'knight') e.setState('BLIND', 4); } this.boss?.flare?.(at, G.radius); this.noise?.(at.x, at.z, 8); }); }
    if (p.grenade === 'depth') { const m = buildProp('w-depth', { shadow: true }); m.object.position.copy(at); this.ctx.scene.add(m.object); this.ctx.tweens.call(G.fuse, () => { this.ctx.scene.remove(m.object); this.ctx.audio.play('depthcharge', this.spatialPlay(at)); this.explode(at.clone().setY(0.4), G.radius, G.damage); }); }
    if (p.grenade === 'oil') this.spawnFire(at, G.radius, G.burn);
  }
  // ----- drops
  dropLoot(p, always) { const need = lootNeed(this.run, this.rng, always); if (!need) return; if (need.money) this.spawnDrop(p.x, p.z, { money: need.money }); else this.spawnDrop(p.x, p.z, need); }
  spawnDrop(x, z, o) {
    const col = { ammo: PALETTE.sand, herb: PALETTE.lime, grenade: PALETTE.red, weapon: PALETTE.mist, treasure: PALETTE.orange, key: PALETTE.cyan }; const kind = o.money ? 'money' : ITEMS[o.id]?.kind; const y = o.y ?? 0.35;
    let obj; if (o.model) obj = buildProp(o.model, { shadow: false }).object; else { obj = new THREE.Mesh(new THREE.BoxGeometry(o.money ? 0.2 : 0.28, o.money ? 0.08 : 0.24, 0.28), glowMaterial(o.money ? PALETTE.sand : (col[kind] ?? PALETTE.white))); }
    obj.position.set(x, y, z); setLookLayer(obj, 'actors'); this.ctx.scene.add(obj);
    const d = { ...o, x, z, y, obj, t: 0, floor: o.floor ?? this.player?.floor ?? 0, phase: this.dropN++ }; this.drops.push(d);
    if (!o.money) d.it = this.interact.add({ x, z, floor: d.floor, radius: 1.6, priority: 4, verb: `TAKE ${ITEMS[o.id].name}`, any: true, act: () => this.takeDrop(d) });
    return d;
  }
  takeDrop(d) {
    const left = addItem(this.run, d.id, d.count ?? 1);
    if (left > 0) { d.count = left; openCase(this, { arrange: true, incoming: d }); return true; }
    this.finishDrop(d); this.ctx.audio.play('pickup'); this.say('MAX', ITEMS[d.id].name, 1); return true;
  }
  finishDrop(d) { if (d.it) this.interact.remove(d.it); this.ctx.scene.remove(d.obj); const i = this.drops.indexOf(d); if (i >= 0) this.drops.splice(i, 1); if (d.key) this.markPicked(d.key); }
  dropProp(id, p) { const b = buildProp(id, { shadow: true }); b.object.position.set(p.x, 0.15, p.z); b.object.rotation.set(1.4, this.cosmetic.range(-3, 3), 0); this.ctx.scene.add(b.object); }
  onKill(e, info, head) {
    const run = this.run; run.stats.kills++; if (e.def.money?.[1] > 0 && this.rng.chance(0.95)) {
      if (e.def.heavy) { this.spawnDrop(e.pos.x, e.pos.z, { money: e.def.money[0] }); } else this.dropLoot(e.pos, false);
    }
    this.moneyShow = this.moneyShow; this.barkMax(BARKS.max.kill, 0.22); this.def.onKill?.(this, e);
    this.killCount = (this.killCount ?? 0) + 1;
  }
  gameOver(reason) { if (this.gameOverT) return; if (this.attract) return; this.gameOverT = 1.6; this.gameOverReason = reason; const P = this.player; P.locked = true; this.ctx.audio.play('sting'); this.app.mix.play(null, 0.2); this.ctx.engine.timeScale = 0.45; this.run.stats.deaths++; this.run.rank = Math.max(1, this.run.rank - 1); }
  onPlayerDead(P, why) { this.gameOver(why === 'saw' ? 'FLENSED' : 'COVERAGE LAPSED'); this.deathsHere = (this.deathsHere ?? 0) + 1; }
  // ----- frame: fixed
  fixedUpdate(ctx, dt) {
    if (this.menu) return;
    this.time += dt; this.run.stats.time += dt;
    this.barkCD = Math.max(0, this.barkCD - dt); this.barkMaxT = Math.max(0, this.barkMaxT - dt); this.dameBarkT = Math.max(0, (this.dameBarkT ?? 0) - dt);
    const i = this.intent.fixed(ctx); this.bot?.fixed(dt, i);
    if (!this.qte.active || this.qte.owner !== this.player) this.qte.fixed(dt); else this.qte.fixed(dt);
    this.player.fixed(dt, i); this.interact.pick(this.player);
    if (this.cheatAutoQTE) { /* dev */ }
    for (const s of this.scripts) s.fixed(dt); if (this.scripts.some((s) => s.done)) this.scripts = this.scripts.filter((s) => !s.done);
    for (const w of this.waves) w.fixed(dt);
    for (const e of [...this.enemies]) e.fixed(dt);
    this.dame?.fixed(dt); this.boss?.fixed?.(dt); this.fixedExtras(dt); this.def.fixed?.(this, dt);
    this.noDmg = (this.noDmg ?? 0) + dt; if (this.noDmg > 60) { this.noDmg = 0; this.run.rank = Math.min(5, this.run.rank + 1); }
    if (this.gameOverT) { this.gameOverT -= dt; if (this.gameOverT <= 0) { this.gameOverT = null; ctx.engine.timeScale = 1; this.openMenu(new DeniedScreen(this, this.gameOverReason)); } }
  }
  fixedExtras(dt) {
    const ctx = this.ctx;
    for (const p of [...this.projectiles]) { p.life -= dt; p.vel.y -= (p.g ?? 0) * dt; p.pos.addScaledVector(p.vel, dt); p.obj.position.copy(p.pos); if (p.faces) p.obj.lookAt(tmp.copy(p.pos).add(p.vel)); else p.obj.rotation.x += dt * 8; let land = p.life <= 0 || (p.pos.y <= 0.05 && p.g); if (!land && p.kind === 'harpoon' || p.kind === 'rivet' || p.kind === 'glob') { for (const P of this.players) if (!P.dead && p.pos.distanceTo(tmp.copy(P.pos).setY(P.pos.y + 1)) < 0.9) { land = true; } } if (land) this.landProjectile(p); }
    for (const f of [...this.fires]) { f.t -= dt; f.puff -= dt; if (f.puff <= 0) { f.puff = 0.15; ctx.particles.burst('fire', f.pos, { count: 3 }); } for (const e of this.enemies) { if (!e.dead && e.pos.distanceTo(f.pos) < f.r && !e.crawler) e.damage(15 * dt, 'torso', { dot: true }); } for (const P of this.players) if (!P.dead && Math.hypot(P.pos.x - f.pos.x, P.pos.z - f.pos.z) < f.r * 0.8) P.hurt(10 * dt, f.pos, { dot: true }); if (f.t <= 0) { f.voice?.stop(); this.fires.splice(this.fires.indexOf(f), 1); } }
    for (const d of [...this.drops]) { d.t += dt; if (d.money && !d.taken && Math.hypot(d.x - this.player.pos.x, d.z - this.player.pos.z) < 1.5 && d.floor === this.player.floor) { d.taken = true; this.run.money += d.money; this.moneyShow = 3; ctx.audio.play('coins'); this.finishDrop(d); } }
    this.moneyShow = Math.max(0, this.moneyShow - dt); this.objT = Math.max(0, this.objT - dt); this.hintT = Math.max(0, this.hintT - dt);
    for (const b of this.barks) b.t -= dt; this.barks = this.barks.filter((b) => b.t > 0);
    for (const s of this.subs) { s.n = Math.min(s.text.length, s.n + dt * 30); s.voice?.tick(Math.floor(s.n)); if (s.n >= s.text.length) s.t -= dt; } this.subs = this.subs.filter((s) => s.t > 0);
    this.tannoyTick(dt); this.gullT -= dt; if (this.gullT <= 0 && this.def.gulls && !this.silent) { this.gullT = this.rng.range(5, 14); ctx.audio.play('gull', { volume: 0.5, pan: this.rng.range(-0.8, 0.8) }); }
    // bleed-off: safe rooms keep enemies out handled by doors; Fathom bubbling
    for (const f of this.fathoms) { const s = this.spatial({ x: f.x, y: 1, z: f.z }, { max: 18, ref: 2 }); f.voice.set({ volume: s.gain, pan: s.pan }); const dF = Math.hypot(f.x - this.player.pos.x, f.z - this.player.pos.z); if (dF < 4 && !f.presented) { f.presented = true; f.h.play('FathomPresent', { restart: true }); ctx.tweens.call(0.8, () => f.h.play('FathomIdle')); } else if (dF > 6) f.presented = false; }
    // Low health: a heartbeat.
    if (this.player && !this.player.remote && !this.player.dead && this.run.health < this.run.maxHealth * 0.25) { this.heartT = (this.heartT ?? 0) - dt; if (this.heartT <= 0) { this.heartT = 0.9; ctx.audio.play('heartbeat'); } }
    // Telegraph rooms: calm music. Silence stays silence.
    if (this.safeRooms?.length && !this.attract && this.player) { const near = this.safeRooms.some((m) => Math.hypot(m.x - this.player.pos.x, m.z - this.player.pos.z) < 6) && !this.enemies.some((e) => !e.dead); const mix = this.app.mix; if (near && !this.inSafe && mix.current && mix.current !== 'shop') { this.inSafe = true; this.musicBefore = mix.current; mix.play('safe'); } else if (!near && this.inSafe) { this.inSafe = false; if (mix.current === 'safe') mix.play(this.musicBefore); } }
  }
  tannoyTick() { for (const t of this.tannoys) if (t.sub && !t.offDone && !this.subs.includes(t.sub)) { t.offDone = true; if (!t.dead) this.ctx.audio.play('tannoyoff', this.spatialPlay(t.pos)); } const P = this.player; if (this.silent || this.cutscene || this.attract) return; for (const t of this.tannoys) { if (t.dead || t.spoke) continue; if (Math.hypot(t.m.x - P.pos.x, t.m.z - P.pos.z) < 13 && !this.tannoyBusy()) { t.spoke = true; this.ctx.audio.play('tannoyon', this.spatialPlay(t.pos)); t.sub = this.say('COMMODORE', TANNOY_LINES[t.idx % TANNOY_LINES.length], 2.5); return; } } }
  tannoyBusy() { return this.subs.some((s) => s.who === 'COMMODORE'); }
  // ----- frame: render
  update(ctx, dt) {
    const ui = this.app.ui; ui.begin(ctx); pollPads(); this.app.tick(ctx, dt, this);
    if (this.fadeOut) { /* transitions handled by app */ }
    if (this.menu) { this.menu.update(ui, ctx); if (this.attract) this.app.attractOverlay?.(ui); this.def.menuDemo?.(this, ui); return; }
    this.inputFrame(ctx, dt, ui);
    if (this.menu) { this.menu.update(ui, ctx); return; }
    // Dialogue and cutscene
    const P = this.player; const confirmPressed = ui.confirm || ui.click;
    const holdSkip = ctx.input.anyDown(BIND.confirm);
    if (this.cutscene) this.cutscene.update(dt, holdSkip && this.cutHoldOK());
    if (this.dialog.active) this.dialog.update(dt, this.cutscene ? (confirmPressed && !this.justConfirm()) : confirmPressed);
    else if (this.autoLocked) { P.locked = false; }
    // Actors
    P.update(dt); for (const O of this.players) if (O !== P) O.update(dt);
    for (const e of this.enemies) e.update(dt); this.dame?.update(dt); for (const f of this.fathoms) f.h.update(dt); this.boss?.update?.(dt); this.def.update?.(this, dt);
    this.fx.update(dt);
    for (const d of this.drops) { d.obj.rotation.y += dt * 2; d.obj.position.y = d.y + Math.sin(this.time * 3 + d.phase) * 0.05; }
    const t = ctx.physics.time; for (const w of this.waters) w.update(t, ctx.engine.sunDir); if (this.rain) this.rain.update(dt, ctx.camera.focus);
    for (const r of this.ragdolls) r.sync?.();
    this.cameraEase(dt); P.updateLaser();
    // Bark positions
    for (const b of this.barks) { const z = b.e.zones?.head; if (z) { const [x, y, d] = project(ctx.camera.camera, ui.W, ui.H, tmp.copy(z).setY(z.y + 0.5)); b.screen = d < 1 ? [x, y] : null; } }
    drawHud(this, ui); this.drawBars(ui); drawSubs(this, ui); this.dialog.draw(ui); drawQte(this, ui); this.app.dev.drawZones(this, ui, project);
    if (this.chapterCard) { this.chapterCard.t -= dt; const c = this.chapterCard, m = ui.measure(c.text, 2); if (c.t > 0) { ui.rect(0, ui.H / 2 - 22, ui.W, 40, 'ink'); ui.text(ui.W / 2 - m.width / 2, ui.H / 2 - 10, c.text, { scale: 2, color: 'sand' }); } else this.chapterCard = null; }
    if (this.attract) this.app.attractOverlay?.(ui);
    this.app.mix.update(dt > 0 ? dt : 1 / 60);
  }
  cutHoldOK() { return true; }
  justConfirm() { return false; }
  drawBars(ui) { if (!this.cutscene) return; const k = this.cutscene.bars(), h = Math.round(26 * k); if (h > 0) { ui.rect(0, 0, ui.W, h, 'ink'); ui.rect(0, ui.H - h, ui.W, h, 'ink'); } if (this.cutscene.skipHold > 0) ui.bar(ui.W - 60, 8, 50, 3, this.cutscene.skipHold / 0.6, 'sand'); }
  cameraEase(dt) {
    const P = this.player, c = P.cam; const scope = P.aiming && P.stats.scope; const t = scope ? CAM.scope : P.aiming ? CAM.aim : CAM.explore, k = Math.min(1, (dt || 1 / 60) / 0.16 * 1.6);
    for (const f of ['dist', 'up', 'side', 'fov']) c[f] += (t[f] - c[f]) * k;
  }
  inputFrame(ctx, dt, ui) {
    const I = ctx.input, P = this.player, S = this.app.settings;
    if (this.attract) return;
    // Look
    const md = I.mouseDelta; const rdt = dt > 0 ? dt / (ctx.engine.timeScale || 1) : 1 / 60;
    if (!P.locked && !P.dead && !this.cutscene && !this.qte.active && !(P.action === 'quickturn')) {
      const aiming = P.aiming; let dy = 0, dp = 0;
      if (device.last === 'pad') { const vx = md.x / (500 * rdt), vy = md.y / (500 * rdt), cx = Math.sign(vx) * Math.abs(vx) ** 1.8, cy = Math.sign(vy) * Math.abs(vy) ** 1.8; const sp = (aiming ? 1.1 : 2.2) * TUNING.padAimSpeed * S.padAim; let as = 1; if (aiming && P.dotHit && (P.dotHit.zone === 'head' || P.dotHit.zone === 'torso')) as = 1 - TUNING.aimAssist * S.aimAssist * diff(this.run).assist; dy = cx * sp * rdt * as; dp = cy * sp * 0.6 * rdt * as; } else { const k = (aiming ? 0.0016 : 0.0026) * TUNING.mouseAimSpeed * S.mouseAim * (P.stats.scope && aiming ? 0.4 : 1); dy = md.x * k; dp = md.y * k; }
      P.camYaw -= dy; P.camPitch -= dp * (S.invertY ? -1 : 1); P.camPitch = Math.max(-0.7, Math.min(0.7, P.camPitch));
    }
    // Wheel switches weapons
    if (I.wheel && !P.locked && !this.cutscene && !P.action) { this.human.i.next = I.wheel > 0; this.human.i.prev = I.wheel < 0; }
    // Menus
    if (I.isDown('PadCreate')) { this.createHeld = true; if (I.wasPressed('PadOptions')) this.createCombo = true; } else if (this.createHeld) { this.createHeld = false; if (!this.createCombo && !this.cutscene && !P.dead && !this.o.noCase) { openCase(this, { tab: 3 }); } this.createCombo = false; }
    if (this.cutscene || P.dead || this.gameOverT) { if (BIND.pause.some((c) => I.wasPressed(c)) && !I.isDown('PadCreate') && !this.gameOverT) this.openMenu(new PauseMenu(this)); return; }
    if (BIND.pause.some((c) => I.wasPressed(c)) && !I.isDown('PadCreate')) { this.openMenu(new PauseMenu(this)); return; }
    if (this.qte.active || P.locked) return;
    if (BIND.case.some((c) => I.wasPressed(c))) { openCase(this, {}); return; }
    if (I.wasPressed('KeyM')) { openCase(this, { tab: 3 }); return; }
    this.cmdPrompt = this.dame ? (this.nearestCmd()?.verb ?? null) : null;
  }
  openMenu(m) { const u = this.app.ui; u.confirm = u.back = u.secondary = u.tertiary = u.click = u.tabPrev = u.tabNext = false; u.nav = {}; this.menu = m; this.savedScale = this.ctx.engine.timeScale || 1; this.ctx.engine.timeScale = 0; this.releasePointer(); }
  closeMenu() { this.menu = null; this.ctx.engine.timeScale = this.savedScale || 1; this.ctx.input.clearQueued(); this.app.wantPointerLock(true); }
  releasePointer() { this.app.wantPointerLock(false); }
  /** Fade through the iris and load the next area. */
  go(id, o = {}) { this.app.goArea(id, o); }
  showForm(next) { this.openMenu(new FormScreen(this, next)); }
  status() { return `${this.id} hp ${Math.round(this.run.health)} foes ${this.enemies.filter((e) => !e.dead).length} money ${this.run.money} ${this.objective ?? ''}`; }
  fingerprint() { const P = this.player; return `${P.pos.x.toFixed(3)},${P.pos.z.toFixed(3)},${this.run.health.toFixed(2)},${this.enemies.map((e) => `${e.type}${e.pos.x.toFixed(2)}${e.state}`).join('|')}`; }
  dispose() { this.app.area === this && (this.app.area = null); for (const f of this.fathoms) f.voice?.stop(); }
}
