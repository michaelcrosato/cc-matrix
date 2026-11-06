// The Launch: an on-rails boat escape. The Dame drives; Max stands on the stern with free aim. Mines, boats, rocks, limpets, an arch.
import { THREE, PALETTE, buildModel, setLookLayer, toonMaterial, glowMaterial, WaterSurface, WAVES_CHOPPY, applySky, skyAt, groundFog } from '../../pixel-engine.js';
import { MODELS } from '../models/index.js';
import { Humanoid } from './actor.js';
import { ui } from '../core/ui.js';
import { app } from '../core/app.js';
import { HumanIntent, newIntent } from '../core/intent.js';
import { TUNING } from '../data/tuning.js';
import { raySphere, clamp } from './geom.js';
import { applyMood, makeWater } from './world.js';
import { Fx } from './fx.js';
import { Scripts } from './scriptkit.js';
import { registerSfx } from '../audio/sfx.js';
import { registerVoices } from '../audio/voice.js';
import { Mix } from '../audio/mix.js';
import { ENDING } from '../data/dialogue.js';
import { timed, lineDuration, cam } from './kit.js';
import { drawHud } from './hud.js';
import { Run } from '../core/run.js';
import { ClaimForm, claimGrade } from '../screens/menus.js';
import { WEAPONS } from '../data/weapons.js';

const { Vector3, Mesh, BoxGeometry } = THREE;
const SPEED = 14, DURATION = 80;
export class Launch {
  constructor(o = {}) { this.name = 'launch'; this.opts = o; this.run = o.run || app.run || (app.run = new Run('standard')); this.def = { id: 'launch', name: 'THE LAUNCH', chapter: 3, music: 'dawn' }; this.args = { id: 'launch' }; this.time = 0; this.z = 0; this.targets = []; this.reticle = { x: 0, y: 0.05 }; this.fireCd = 0; this.intent = o.intent || new HumanIntent(); this.cur = newIntent(); this.done = false; this.tgt = new Vector3(0, 1.5, 0); this.enemies = []; this.dmgArcs = []; this.moneyShow = 0; this.objectiveShow = 6; this.objective = 'REACH THE OPEN SEA'; this.stage = 'run'; this.camPos = new Vector3(); this.hintT = 0; this.hint = ''; this.flashT = 0; this.hp0 = 0; }
  async setup(ctx) {
    this.ctx = ctx; this.rng = ctx.random.fork('launch'); const eng = ctx.engine;
    registerSfx(eng.audio); registerVoices(eng.audio); if (!app.mix) app.mix = new Mix(eng.audio);
    this.mood = applyMood(ctx, 'dawn'); this.fx = new Fx(ctx); this.scripts = new Scripts(this);
    this.water = new WaterSurface({ size: [160, 200], at: [0, -0.4, 0], waves: WAVES_CHOPPY, deep: PALETTE.navy, shallow: PALETTE.teal, foam: PALETTE.white }); ctx.scene.add(this.water);
    this.boat = buildModel('launch', { catalog: MODELS }); ctx.scene.add(this.boat.object); setLookLayer(this.boat.object, 'actors');
    this.max = new Humanoid('max'); this.max.attachTo(ctx.scene); this.max.root.position.set(0, 1.1, -3.6); this.max.layers('Idle', 'AimPistol'); this.max.aim.on = true;
    this.dameH = new Humanoid('dame', { scale: 0.9 }); this.dameH.attachTo(ctx.scene); this.dameH.root.position.set(0, 1.1, 1.4); this.dameH.play('Idle');
    ctx.lights.request({ position: [0, 6, -4], color: 0xffd8a0, intensity: 6, radius: 14, priority: 8 });
    this.equipGun();
    const rig = ctx.camera; rig.zoomable = false; const self = this; const look = new Vector3();
    rig.step = () => {
      if (self.scripts.cut) { const s = self.scripts.cut.tl.camera(); if (s) { rig.camera.position.set(...s.position); rig.camera.lookAt(...s.target); rig.focus.set(...s.target); if (rig.camera.fov !== s.fov) { rig.camera.fov = s.fov; rig.camera.updateProjectionMatrix(); } self.camPos.copy(rig.camera.position); return; } }
      const sway = Math.sin(self.time * 1.3) * 0.15;
      rig.camera.position.set(1.1 + sway, 3.1, self.z - 8.2); rig.focus.set(0, 1.5, self.z + 20); rig.camera.lookAt(0 + self.reticle.x * 6, 1.6 + self.reticle.y * 4, self.z + 20);
      if (rig.camera.fov !== 52) { rig.camera.fov = 52; rig.camera.updateProjectionMatrix(); }
      self.camPos.copy(rig.camera.position);
    };
    this.scripts.start(this.script.bind(this), 'launch');
    app.mix.play('combat');
    this.rng = ctx.random.fork('launch');
  }
  equipGun() {
    const run = this.run; const pref = ['harpoon', 'rifle', 'scatter', 'pistol'].find((w) => run.owns(w)) || 'pistol'; run.equipped = pref; this.gun = WEAPONS[pref];
    if (this.gunObj) this.gunObj.removeFromParent();
    const model = { pistol: 'gun-pistol', scatter: 'gun-scatter', rifle: 'gun-rifle', harpoon: 'gun-harpoon' }[pref];
    this.gunObj = this.max.hold('HandR', model, [0, -0.04, 0.02], [90, 0, 0]);
    this.max.aim.on = true; this.max.layers('Idle', this.gun.long ? 'AimLong' : 'AimPistol');
    if ((run.mags[pref] ?? 0) === 0) run.reload(pref);
  }
  say(who, text) { return this.scripts.say(who, text); }
  bark(w, t, s) { this.scripts.bark(w, t, s); }
  audio(n, x, z, v = 1) { return this.ctx.audio.play(n, { volume: v }); }
  freezeFor(k, on) { this.frozen = on; this.cutsceneActive = on; }
  scriptError(e) { console.error(e); }
  later() {}
  *qte(o) { yield* this.scripts.qteRun(o); return this.lastQte; }
  spawnTarget(t) { const m = new Mesh(new BoxGeometry(...(t.size || [1, 1, 1])), t.mat || toonMaterial(PALETTE.red)); m.position.set(t.x, t.y, t.z); this.ctx.scene.add(m); t.mesh = m; t.alive = true; this.targets.push(t); return t; }
  *script() {
    const rnd = this.rng; this.scripts.cut = null;
    this.bark('DAME', 'HOLD ON TO SOMETHING EXPENSIVE.', 3);
    let next = 4; let stage = 0;
    while (this.time < DURATION) {
      yield 0.2;
      if (this.time > next) {
        const k = stage++ % 5; next = this.time + 4.5;
        const lane = rnd.range(-5, 5);
        if (k === 0 || k === 3) this.spawnTarget({ kind: 'mine', x: lane, y: 0.4, z: this.z + 70, r: 0.9, size: [1.2, 1.2, 1.2], mat: toonMaterial(PALETTE.slate) });
        else if (k === 1) { const sx = rnd.chance(0.5) ? -9 : 9; this.spawnTarget({ kind: 'boat', x: sx, y: 0.5, z: this.z + 40, r: 1.6, size: [2.2, 1.0, 4], hp: 50, mat: toonMaterial(PALETTE.orange), cd: 1.6, vx: -sx * 0.01 }); }
        else if (k === 2) this.spawnTarget({ kind: 'rock', x: lane * 0.6, y: 26, z: this.z + 45, r: 1.5, size: [2.4, 2.4, 2.4], hp: 3, mat: toonMaterial(PALETTE.mist) });
        else this.spawnLimpets();
      }
    }
    // arch collapse at the end
    this.stage = 'arch'; this.objective = 'THE ARCH IS COMING DOWN'; this.objectiveShow = 6; this.bark('DAME', 'I DO NOT LIKE THE LOOK OF THAT ARCH.', 3);
    const arch = new Mesh(new BoxGeometry(18, 12, 3), toonMaterial(PALETTE.slate)); arch.position.set(0, 8, this.z + 60); this.ctx.scene.add(arch); this.arch = arch;
    yield () => this.z + 12 >= arch.position.z;
    const ok = yield* this.qte({ type: 'press', verb: 'dodge', window: 1.4, label: 'DUCK!' });
    if (!ok) this.hurt(30, 0);
    arch.removeFromParent(); this.ctx.engine.shake.add(1); this.audio('stomp');
    this.stage = 'end'; this.done = true;
    yield 1.5;
    yield* this.ending();
  }
  spawnLimpets() { for (let i = 0; i < 2; i++) { const t = this.spawnTarget({ kind: 'limpet', x: (i ? 1 : -1) * 1.1, y: 1.3, z: this.z - 5.2 + i * 0.5, r: 0.5, size: [0.6, 0.4, 0.6], hp: 15, mat: glowMaterial(PALETTE.orange), onDeck: true, latch: 0 }); } }
  hurt(d, ang) { if (this.run.hp <= 0) return; this.run.hp = Math.max(1, this.run.hp - d); this.ctx.engine.shake.add(0.3); this.audio('hurt'); this.dmgArcs.push({ ang, t: 0.7 }); this.hurtCount = (this.hurtCount || 0) + 1; if (this.run.hp <= 1 && !this.dying) { this.dying = true; } }
  *ending() {
    const ctx = this.ctx; app.mix.play(null);
    this.applyDawn();
    const ls = timed(ENDING, 0.8);
    this.scripts.cut = null;
    const z = this.z;
    yield* this.scripts.cutscene({ shots: [{ at: 0, position: [3, 2.6, z - 7], target: [0, 1.6, z - 2], fov: 50 }, { at: 8, position: [2, 2, z - 4], target: [0, 1.7, z], fov: 42 }, { at: 16, position: [-4, 1.4, z + 5], target: [0, 1.5, z + 1.4], fov: 40, cut: true }, { at: 24, position: [-3, 1.5, z + 4], target: [0, 1.5, z + 1.4], fov: 38 }], lines: ls, duration: lineDuration(ls) + 1, cues: [{ at: 0.1, run: () => app.mix.play('dawn') }] });
    // the last shot: a limpet on the hull opens, slowly; on-hold jingle over black
    app.mix.play('onhold');
    this.black = true; this.finalT = 0;
    yield 6;
    this.endCredits = true;
    yield () => this.creditsDone;
    yield 0.2;
    this.finish();
  }
  applyDawn() { applySky(this.ctx.engine, skyAt(6.5)); }
  finish() { app.run = null; app.go(new app.TitleClass()); }
  fixedUpdate(ctx, dt) {
    this.time += dt;
    const i = this.cur = this.opts.intentSource ? this.opts.intentSource(this, dt) : this.intent.fixed(ctx);
    this.scripts.update(dt);
    if (this.scripts.qte) this.scripts.updateQte(dt, { action: i.qteAction, dodge: i.qteDodge, wrong: false });
    if (this.frozen && !this.scripts.qte) return;
    if (this.stage !== 'end') this.z += SPEED * dt;
    this.fireCd -= dt;
    const run = this.run, w = this.gun;
    if (i.reload && (run.mags[w.id] ?? 0) < run.stat(w.id).mag && run.ammo(w.id) > 0) { run.reload(w.id); this.audio('reload3'); }
    if (i.firePressed || (i.fire && w.id === 'scatter' && false)) { if (this.fireCd <= 0) this.fire(); }
    // kick limpets with action
    if (i.actionPressed) { for (const t of this.targets) if (t.alive && t.kind === 'limpet') { t.alive = false; t.mesh.removeFromParent(); this.audio('kick'); } }
    for (const t of [...this.targets]) {
      if (!t.alive) { this.targets.splice(this.targets.indexOf(t), 1); continue; }
      if (t.kind === 'rock') { t.y = Math.max(0.5, t.y - 18 * dt * (this.z + 45 - t.z > 0 ? 1 : 1)); if (t.z - this.z < 10 && !t.warned) { t.warned = true; } }
      if (t.kind === 'boat') { t.x += t.vx * 60 * dt * 0.1; t.z += 3 * dt; t.cd -= dt; if (t.cd <= 0 && t.z - this.z > 5) { t.cd = 2.5; this.audio('harpoon'); this.hurt(10, Math.atan2(t.x, 1)); } }
      if (t.kind === 'limpet') { t.latch += dt; if (t.latch > 2 && Math.floor(t.latch) !== Math.floor(t.latch - dt)) this.hurt(4, 3.14); t.z = this.z - 5 + 0.2; }
      t.mesh.position.set(t.x, t.kind === 'limpet' ? 1.3 : t.y + Math.sin(this.time * 2 + t.x) * 0.1, t.z);
      if (t.kind !== 'limpet' && t.z - this.z < -2) { // passed or hit the boat
        if ((t.kind === 'mine' || t.kind === 'rock') && Math.abs(t.x) < 2.6) { this.hurt(t.kind === 'rock' ? 25 : 20, 0); this.ctx.engine.shake.add(0.6); this.fx.boom(new Vector3(t.x, 1, t.z)); this.audio('depth'); }
        t.alive = false; t.mesh.removeFromParent();
      }
    }
    if (this.run.hp <= 1 && this.dying && !this.deadShown) { this.run.hp = this.run.maxHp * 0.5; this.dying = false; this.bark('DAME', 'I SHALL STEER BETTER IF YOU STOP BLEEDING.', 3); }
    // reticle from look
    const lk = this.opts.lookSource ? this.opts.lookSource(this, dt) : { dyaw: 0, dpitch: 0 };
  }
  fire() {
    const run = this.run, w = this.gun; if ((run.mags[w.id] ?? 0) <= 0) { this.audio('dry'); this.fireCd = 0.3; return; }
    run.mags[w.id]--; run.stats.shots++; this.fireCd = run.stat(w.id).interval / TUNING.fireRate;
    this.audio(w.id === 'pistol' ? 'pistol' : w.id === 'scatter' ? 'scatter' : w.id === 'rifle' ? 'rifle' : 'harpoon'); this.ctx.engine.shake.add(0.1);
    const cam = this.ctx.camera.camera; const o = new Vector3(), d = new Vector3(); this.ctx.camera.rayAt(this.reticle.x, this.reticle.y, o, d);
    let best = null;
    for (const t of this.targets) { if (!t.alive) continue; const tt = raySphere(o.x, o.y, o.z, d.x, d.y, d.z, t.x, t.y, t.z, t.r + 0.3); if (tt >= 0 && (!best || tt < best.t)) best = { t: tt, target: t }; }
    if (best) {
      const t = best.target; run.stats.hits++; const dmg = run.stat(w.id).damage;
      if (t.kind === 'mine') { t.alive = false; t.mesh.removeFromParent(); this.fx.boom(new Vector3(t.x, 1, t.z)); this.audio('depth'); }
      else { t.hp -= dmg; this.fx.sparks(new Vector3(t.x, t.y, t.z)); if (t.hp <= 0) { t.alive = false; t.mesh.removeFromParent(); this.fx.boom(new Vector3(t.x, t.y, t.z)); this.audio('barrel'); } }
    } else this.fx.sparks(new Vector3(o.x + d.x * 30, 0.2, o.z + d.z * 30));
  }
  update(ctx, dt) {
    ui.begin(ctx);
    app.mix?.update(Math.max(dt, 1 / 120));
    this.water.position.z = this.z; this.water.update(ctx.time);
    const top = app.top(); if (top) { top.frame(this, ctx); return; }
    this.objectiveShow = Math.max(0, this.objectiveShow - dt); this.hintT = Math.max(0, this.hintT - dt); this.flashT = Math.max(0, this.flashT - dt);
    for (const d of this.dmgArcs) d.t -= dt; this.dmgArcs = this.dmgArcs.filter((d) => d.t > 0);
    this.scripts.updateBarks(dt);
    const keys = ctx.input; const confirm = keys.wasPressed('Enter', 'PadCross', 'KeyE', 'Space');
    if (this.scripts.dlg) this.scripts.updateDialogue(dt, confirm);
    if (this.scripts.cut) this.scripts.updateCut(dt, keys.isDown('PadCross', 'Space', 'Enter'));
    // reticle follows look input
    const look = this.opts.lookSource ? this.opts.lookSource(this, dt) : this.intent.look(ctx, dt, true, 1);
    this.reticle.x = clamp(this.reticle.x - look.dyaw * 0.55, -0.9, 0.9); this.reticle.y = clamp(this.reticle.y + look.dpitch * 0.9, -0.5, 0.8);
    // boat, crew
    const b = this.boat.object; b.position.set(0, -0.1 + Math.sin(this.time * 2) * 0.08, this.z); b.rotation.z = Math.sin(this.time * 1.4) * 0.05;
    this.max.root.position.set(0, 1.0 + Math.sin(this.time * 2) * 0.08, this.z - 3.6); this.dameH.root.position.set(0, 1.0 + Math.sin(this.time * 2) * 0.08, this.z + 1.4); this.max.root.rotation.y = 0; this.dameH.root.rotation.y = 0;
    this.max.aim.pitch = this.reticle.y * 0.8; this.max.update(dt); this.dameH.update(dt); this.max.placeShadow(0.9);
    this.updateScenery();
    this.fx.update(dt); app.attractFrame?.(this, ctx, dt);
    if (this.black) { ui.rect(0, 0, ui.W, ui.H, 'ink'); this.finalT += dt; const k = this.finalT; if (k > 1) { const s = Math.min(3, Math.floor((k - 1) * 1.2)); ui.rect(ui.W / 2 - 14, ui.H / 2 + 20, 28, 12, 'plum'); ui.rect(ui.W / 2 - 14 + s * 2, ui.H / 2 + 22, 28 - s * 4, 8, 'orange'); } if (this.endCredits) this.drawCredits(ctx, dt, confirm); else ui.text(ui.W / 2, ui.H / 2 - 20, 'PLEASE HOLD', { align: 'center', color: 'mist' }); return; }
    drawHud({ ...this, ctx, run: this.run, player: this.fakePlayer(), scripts: this.scripts, dame: null, aimHit: null, combat: { aimRay: () => ({}), trace: () => ({ point: new Vector3() }) }, level: null, prompt: null, time: this.time, dmgArcs: this.dmgArcs, moneyShow: 0, objective: this.objective, objectiveShow: this.objectiveShow, hint: '', hintT: 0, flashT: 0, boss: null, tideGauge: null, timerLabel: null, stamp: null, pointerOK: true, needsLockHint: false, hideHud: false });
    this.drawReticle(ctx);
    const prog = clamp(this.z / (SPEED * DURATION), 0, 1); ui.bar(ui.W / 2 - 50, 8, 100, 4, prog, 'sky'); ui.text(ui.W / 2, 14, 'THE OPEN SEA', { align: 'center', color: 'mist' });
    const kicks = this.targets.some((t) => t.alive && t.kind === 'limpet'); if (kicks) ui.text(ui.W / 2, ui.H - 52, 'LIMPETS ON DECK: ACTION TO KICK', { align: 'center', color: 'orange' });
  }
  fakePlayer() { const w = this.gun; return { weapon: w, aiming: false, reloading: false, dead: false }; }
  drawReticle(ctx) {
    const x = Math.round((this.reticle.x + 1) / 2 * ui.W), y = Math.round((1 - this.reticle.y) / 2 * ui.H);
    ui.rect(x - 1, y - 1, 3, 3, 'red'); ui.rect(x, y, 1, 1, 'white'); ui.rect(x - 6, y, 3, 1, 'red'); ui.rect(x + 4, y, 3, 1, 'red'); ui.rect(x, y - 6, 1, 3, 'red'); ui.rect(x, y + 4, 1, 3, 'red');
    const run = this.run, w = this.gun; ui.text(ui.W - 10, ui.H - 36, `${run.mags[w.id] ?? 0}/${run.ammo(w.id)}`, { align: 'right', scale: 2 });
  }
  updateScenery() {
    if (!this.stacks) this.stacks = [];
    while (this.stacks.length < 10 || this.stacks[this.stacks.length - 1].z < this.z + 160) {
      const z = (this.stacks.length ? this.stacks[this.stacks.length - 1].z : this.z) + this.rng.range(14, 26);
      const b = buildModel('sea-stack', { catalog: MODELS }); const side = this.rng.chance(0.5) ? -1 : 1; b.object.position.set(side * this.rng.range(18, 36), -0.3, z); b.object.scale.setScalar(this.rng.range(0.7, 1.4)); this.ctx.scene.add(b.object); setLookLayer(b.object, 'actors'); this.stacks.push({ obj: b.object, z });
    }
    for (const s of [...this.stacks]) if (s.z < this.z - 30) { s.obj.removeFromParent(); this.stacks.splice(this.stacks.indexOf(s), 1); }
  }
  drawCredits(ctx, dt, confirm) {
    this.cy = (this.cy ?? ui.H) - dt * 22;
    const lines = ['', 'THE END', '', ...[`${'RESIDENT HULL 4'}`, 'A CLAIMS ADJUSTER. AN ISLAND. NO COVER.', '', 'MAX RANSOM ... AN ADJUSTER', 'DAME OTTOLINE VANE ... NOT IMPRESSED', 'MR. PYM ... PLEASE HOLD', 'MR. FATHOM ... BLUB', 'COMMODORE THOLE ... ON THE AIR', '', 'BUILT ON THE PIXEL ENGINE KIT 0.46.0', 'EVERY SOUND AND NOTE WRITTEN IN CODE', '', 'THANK YOU FOR PLAYING', 'YOUR CALL IS IMPORTANT TO OSTRANDER MUTUAL']];
    lines.forEach((l, i) => ui.text(ui.W / 2, this.cy + i * 14, l, { align: 'center', color: i === 1 ? 'sand' : 'white', scale: i === 3 ? 2 : 1 }));
    if (this.cy + lines.length * 14 < 0 || confirm) { this.creditsDone = true; }
  }
  cameraTarget() { return this.tgt.set(0, 1.5, this.z); }
  status() { return `launch z ${this.z.toFixed(0)} hp ${Math.round(this.run.hp)} targets ${this.targets.length} stage ${this.stage}`; }
  fingerprint() { return `${this.time.toFixed(2)};${this.z.toFixed(1)};${Math.round(this.run.hp)}`; }
  ready() { try { window.__GAME__ = this; } catch { /* */ } }
  dispose() { app.mix?.play(null); }
}
