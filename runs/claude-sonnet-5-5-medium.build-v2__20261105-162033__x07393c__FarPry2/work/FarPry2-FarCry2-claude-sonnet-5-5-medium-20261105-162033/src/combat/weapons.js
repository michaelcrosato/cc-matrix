// The player's weapons: slots, ammo, wear, jams, reloads, melee, throwables. Hitscan via physics.castRay.
import { THREE } from '../../pixel-engine.js';
import { WEAPONS, THROWABLES, SLOTS, START_GUNS } from '../content/weapons.js';
import { TUNING } from '../core/tuning.js';
import { consume, held, pressed, codes } from '../core/actions.js';
import { jamChance, wearPerShot, gunStage, pressesToClear } from './gunmath.js';
import { ViewModels, CLIPS } from './viewmodel.js';

const V3 = THREE.Vector3;
export class WeaponSystem {
  name = 'weapons';
  constructor() {
    this.guns = {};            // id -> { cond, mag, reserve, jammed, presses }
    this.slotGun = { ...START_GUNS };
    this.slot = 'side';
    this.throwables = { molotov: 0, charge: 0 };
    this.upgrades = { cleaning: false, pouch: false, belt: false, kit: false };
    this.syrettes = 3; this.tablets = 0;
    this.cooldown = 0; this.reloading = 0; this.aiming = false; this.busy = 0; this.charged = 0; this.planted = [];
    this.fireHeld = 0; this.holdG = 0; this.heat = 0;
    this.origin = new V3(); this.dir = new V3(); this.tmp = new V3();
    this.shots = 0; this.lastShot = -99; this.hitMarker = 0; this.fell = false; this.broken = false;
    this.flameFuel = 0;
  }
  setup(g) {
    this.g = g;
    this.rng = g.ctx.random.fork('weapons');
    this.views = new ViewModels(g.ctx);
    this.give('cane', 100); this.give('m38', 100);
    this.equipSlot('side', true);
  }
  // ---- inventory ----
  give(id, cond = 100, ammo = true) {
    const w = WEAPONS[id]; if (!w) return;
    const old = this.guns[id];
    this.guns[id] = { cond, mag: ammo ? w.mag || 0 : 0, reserve: ammo ? this.reserveMax(w) : 0, jammed: false, presses: 0, ...(old && !ammo ? { mag: old.mag, reserve: old.reserve } : {}) };
    this.slotGun[w.slot] = id;
  }
  reserveMax(w) { return Math.round((w.reserve || 0) * (this.upgrades.belt ? 1.5 : 1)); }
  has(id) { return Object.values(this.slotGun).includes(id); }
  current() { const id = this.slotGun[this.slot]; return id ? WEAPONS[id] : null; }
  gunState() { const id = this.slotGun[this.slot]; return id ? this.guns[id] : null; }
  addAmmo(id, n) { const g = this.guns[id]; if (g) g.reserve = Math.min(this.reserveMax(WEAPONS[id]) * 2, g.reserve + n); }
  refill() { for (const id of Object.keys(this.guns)) { const w = WEAPONS[id]; if (w.reserve) this.guns[id].reserve = this.reserveMax(w); } this.syrettes = Math.max(this.syrettes, this.upgrades.pouch ? 5 : 3); }
  maxSyrettes() { return this.upgrades.pouch ? 5 : 3; }
  equipSlot(slot, silent) {
    if (!this.slotGun[slot]) return false;
    this.slot = slot; this.cooldown = 0.2; this.reloading = 0; this.aiming = false;
    const w = this.current();
    this.views.show(w.vm);
    this.refreshLook();
    if (!silent) { this.views.play('equip'); this.g.sfx?.('equip'); }
    return true;
  }
  refreshLook() { const s = this.gunState(); this.views.setCondition(s ? gunStage(s.cond) : 'clean'); }
  cycle(dir = 1) {
    const owned = SLOTS.filter((s) => this.slotGun[s]); if (owned.length < 2) return;
    let i = owned.indexOf(this.slot); i = (i + dir + owned.length) % owned.length; this.equipSlot(owned[i]);
  }
  // ---- aiming ----
  eyeRay() {
    const cam = this.g.ctx.camera.camera;
    cam.getWorldPosition(this.origin);
    cam.getWorldDirection(this.dir);
  }
  busyForSprint() { return false; }
  canShoot() { const g = this.g; return g.canMove() && !g.player.sprinting && !g.player.seated && !g.noFire() && !g.mapUp && !g.surgeryActive; }
  // ---- fixed step ----
  fixed(g, dt) {
    const input = g.ctx.input;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.heat = Math.max(0, this.heat - dt * 0.5);
    if (!g.canMove() || g.player.seated) { this.fireHeld = 0; return; }
    if (g.mapUp || g.surgeryActive) return;
    const w = this.current(); const gs = this.gunState();
    const aimHeld = held(input, 'aim');
    this.aiming = aimHeld && !g.player.sprinting && w && w.kind !== 'melee' && !this.reloading;
    // weapon switching
    const finishing = !!(g.useTarget && g.useTarget.second);
    if (!finishing && consume(input, 'weapon')) this.cycle(1);
    for (let i = 0; i < 4; i++) if (input.consumePress('Digit' + (i + 1))) this.equipSlot(SLOTS[i]);
    if (input.wheel > 0) { this.cycle(1); } else if (input.wheel < 0) this.cycle(-1);
    if (!w) return;
    // reload / unjam
    if (!g.useTarget && consume(input, 'reload')) this.reloadPress();
    if (this.reloading > 0) { this.reloading -= dt; if (this.reloading <= 0) this.finishReload(); }
    // fire
    const wantFire = held(input, 'fire');
    if (w.kind === 'melee') { if (wantFire && this.cooldown <= 0 && this.canShoot()) this.melee(); }
    else if (this.canShoot() && this.reloading <= 0 && this.cooldown <= 0 && gs) {
      if (w.stream) { if (wantFire) this.flame(dt, w, gs); else this.flameOn = false; }
      else {
        const trig = w.auto ? wantFire : input.consumePress('MouseLeft', 'PadR2');
        if (trig) this.pull(w, gs);
      }
    }
    if (!wantFire) this.flameOn = false;
    if (!finishing && consume(input, 'melee') && this.cooldown <= 0 && w.kind !== 'melee') this.quickMelee();
    this.throwLogic(input, dt);
  }
  reloadPress() {
    const w = this.current(), gs = this.gunState(); if (!w || !gs || w.kind === 'melee' || this.reloading > 0) return;
    if (gs.jammed) {
      this.views.play('unjam'); this.g.sfx?.('slap'); this.cooldown = 0.5;
      gs.presses--;
      this.g.ctx.tweens.call(0.35, () => this.g.sfx?.('rack'));
      if (gs.presses <= 0) { gs.jammed = false; this.g.say?.('GUN CLEAR.', 'player', 1.2); }
      return;
    }
    if (gs.mag >= w.mag || gs.reserve <= 0) return;
    this.reloading = w.reload || 2;
    const name = ({ mag: 'mag', revolver: 'revolver', flare: 'flare', pump: 'pump', bolt: 'bolt', tube: 'tube', flame: 'flame' })[w.kind] || 'mag';
    this.views.play(name, this.reloading);
    this.g.sfx?.('reload_' + w.kind);
  }
  finishReload() {
    const w = this.current(), gs = this.gunState(); if (!w || !gs) return;
    const need = w.mag - gs.mag, take = Math.min(need, gs.reserve);
    gs.mag += take; gs.reserve -= take; this.reloading = 0;
  }
  pull(w, gs) {
    if (gs.jammed) { this.g.sfx?.('jam_click'); this.cooldown = 0.25; this.views.play('jam'); this.g.events.emit('jamclick'); return; }
    if (w.mag && gs.mag <= 0) { this.g.sfx?.('dry'); this.cooldown = 0.3; if (gs.reserve > 0) this.reloadPress(); return; }
    this.shoot(w, gs);
  }
  wear(w, gs, scale = 1) {
    if (!this.g.infiniteAmmo) gs.cond = Math.max(0, gs.cond - wearPerShot(w.wear, this.upgrades.cleaning) * scale);
    this.refreshLook();
    if (gs.cond <= 0 && !this.broken) this.fallApart(w, gs);
  }
  fallApart(w, gs) {
    this.broken = true; this.views.play('fall'); this.g.sfx?.('fall_apart');
    this.g.say?.('IT FELL APART IN MY HANDS.', 'player', 2);
    this.g.events.emit('gunbroke', w.id);
    this.g.ctx.tweens.call(1.5, () => {
      this.slotGun[w.slot] = null; delete this.guns[w.id]; this.broken = false;
      const next = SLOTS.slice().reverse().find((s) => this.slotGun[s] && s !== 'melee') || 'melee';
      this.equipSlot(next);
    });
    this.cooldown = 2;
  }
  shoot(w, gs) {
    const g = this.g;
    this.cooldown = 1 / w.rate; this.shots++; this.lastShot = g.ctx.time;
    if (w.mag && !g.infiniteAmmo) gs.mag--;
    this.wear(w, gs);
    if (gs.cond <= 0) return;
    this.eyeRay();
    const aimF = this.aiming ? 0.3 : 1;
    const spread = ((w.spread || 1) * aimF) * Math.PI / 180;
    const fireClip = ({ pump: 'pumpFire', bolt: 'boltFire', tube: 'fireHeavy', flare: 'fireHeavy' })[w.kind] || (w.rate > 5 ? 'fire' : 'fire');
    this.views.play(fireClip);
    this.views.kick.z -= 0.04; this.views.kick.rx -= (w.damage > 50 ? 6 : 2.2) * (this.aiming ? 0.6 : 1);
    g.camState.punch = Math.min(0.12, (g.camState.punch || 0) + (w.damage > 50 ? 0.05 : 0.012));
    g.ctx.engine.shake.add(w.damage > 50 ? 0.25 : 0.1);
    g.rumble?.(0.4, 0.3, 60);
    g.sfx?.('shot_' + w.id);
    g.noise(this.origin, w.noise, 'player');
    g.muzzleLight?.(this.origin, this.dir);
    if (gs.cond < 30 && this.rng.chance(0.6)) g.ctx.particles.burst('smoke', this.tmp.copy(this.origin).addScaledVector(this.dir, 0.9));
    if (w.kind === 'flare') return g.projectiles.launch('flare', this.origin, this.dir, 38, { owner: 'player' });
    if (w.kind === 'tube') return g.projectiles.launch('rocket', this.origin, this.dir, 55, { owner: 'player', blast: w.blast, damage: w.damage });
    const n = w.pellets || 1;
    for (let i = 0; i < n; i++) this.hitscan(w, spread, i);
    if (!g.noJams && ((this.scriptJam && this.shots >= this.scriptJam) || this.rng.chance(jamChance(gs.cond)))) { this.scriptJam = 0; gs.jammed = true; gs.presses = pressesToClear(this.rng); g.events.emit('jam', w.id); }
  }
  hitscan(w, spread, i) {
    const g = this.g, d = this.tmp2 ||= new V3();
    d.copy(this.dir);
    const sx = (this.rng.next() - 0.5) * 2 * spread, sy = (this.rng.next() - 0.5) * 2 * spread;
    d.x += sx; d.y += sy; d.z += (this.rng.next() - 0.5) * 2 * spread; d.normalize();
    const mul = TUNING.weaponDamage;
    const hit = g.castBullet(this.origin, d, w.range);
    const to = hit ? hit.point : this.tmp.copy(this.origin).addScaledVector(d, w.range);
    if (this.shots % 3 === 0 && i === 0) g.tracer?.(this.origin, to);
    if (!hit) return;
    g.bulletImpact(hit, d, w.damage * mul, 'player');
    if (hit.actor) { this.hitMarker = 0.25; g.ctx.engine.hitstop(0.02); g.sfx?.('hit_flesh'); }
  }
  flame(dt, w, gs) {
    if (gs.jammed) { this.pull(w, gs); return; }
    const g = this.g;
    if (gs.mag <= 0) { if (gs.reserve > 0) this.reloadPress(); return; }
    this.flameOn = true;
    gs.mag = Math.max(0, gs.mag - 20 * dt);
    gs.cond = Math.max(0, gs.cond - wearPerShot(w.wear, this.upgrades.cleaning) * 20 * dt);
    this.refreshLook();
    if (gs.cond <= 0 && !this.broken) { this.fallApart(w, gs); return; }
    this.eyeRay();
    this.views.kick.z -= 0.003;
    g.flameStream(this.origin, this.dir, w.range, w.damage * TUNING.weaponDamage * dt, gs.cond < 20 && this.rng.chance(0.02 * dt * 60 * 0.05));
    g.noise(this.origin, w.noise, 'player');
    if (gs.cond < 20 && this.rng.chance(0.004)) g.setPlayerOnFire?.('leak');
  }
  melee() {
    const g = this.g, w = this.current();
    this.cooldown = 1 / w.rate; this.views.play('melee'); g.sfx?.('swing');
    this.eyeRay();
    g.ctx.tweens.call(0.2, () => this.meleeHit(w.damage, w.range));
  }
  quickMelee() {
    const g = this.g; const prev = this.current(); this.cooldown = 0.7;
    this.views.show('cane'); this.views.play('melee', 0.45, () => { this.views.show(prev.vm); this.refreshLook(); });
    g.sfx?.('swing');
    g.ctx.tweens.call(0.2, () => this.meleeHit(WEAPONS.cane.damage, 2.2));
  }
  meleeHit(dmg, range) {
    const g = this.g; this.eyeRay();
    const hit = g.castBullet(this.origin, this.dir, range);
    if (hit && hit.actor) {
      const a = hit.actor;
      const fwd = this.tmp.set(-Math.sin(a.yaw || 0), 0, -Math.cos(a.yaw || 0));
      const behind = fwd.x * this.dir.x + fwd.z * this.dir.z > 0.3;
      g.damageActor(a, behind && a.state !== 'alert' ? 999 : dmg * TUNING.weaponDamage, 'torso', { by: 'player', melee: true, from: this.origin });
      g.sfx?.('hit_flesh'); this.hitMarker = 0.25;
    } else if (hit) { g.bulletImpact(hit, this.dir, 0, 'player'); g.sfx?.('hit_metal'); }
  }
  // ---- throwables ----
  throwLogic(input, dt) {
    const g = this.g;
    const down = held(input, 'throw');
    if (down) this.holdG += dt; else {
      if (this.holdG > 0 && this.holdG < 0.45) this.throwPress();
      this.holdG = 0;
    }
    if (down && this.holdG >= 0.45 && !this.plantedNow && this.throwables.charge > 0 && this.canShoot()) {
      this.plantedNow = true; this.plantCharge();
    }
    if (!down) this.plantedNow = false;
  }
  throwPress() {
    const g = this.g;
    if (this.planted.length && this.throwables.molotov > 0) return this.detonate();
    if (this.throwables.molotov > 0 && this.canShoot()) {
      this.throwables.molotov--; this.eyeRay();
      this.views.show('bottle'); this.views.play('throw', 0.7, () => { const w = this.current(); this.views.show(w.vm); this.refreshLook(); });
      g.ctx.tweens.call(0.3, () => { this.eyeRay(); g.projectiles.launch('molotov', this.origin, this.dir, 17, { owner: 'player' }); g.sfx?.('throw'); });
    }
  }
  plantCharge() {
    const g = this.g; this.throwables.charge--;
    this.eyeRay();
    const f = g.player.feet; const p = new V3(f.x + this.dir.x * 1.2, g.world.heightAt(f.x + this.dir.x * 1.2, f.z + this.dir.z * 1.2) + 0.1, f.z + this.dir.z * 1.2);
    this.planted.push(g.projectiles.plant(p, 'player'));
    this.views.show('charge'); this.views.play('throw', 0.7, () => { const w = this.current(); this.views.show(w.vm); this.refreshLook(); });
    g.sfx?.('plant'); g.say?.('CHARGE SET.', 'player', 1);
  }
  detonate() {
    const g = this.g; const c = this.planted.shift(); if (!c) return;
    this.views.show('detonator'); this.views.play('beep', 0.2, () => { const w = this.current(); this.views.show(w.vm); this.refreshLook(); });
    g.projectiles.detonate(c);
  }
  frame(g, dt) {
    const m = g.player;
    const spd = Math.sqrt(m.speed2 || 0);
    this.hitMarker = Math.max(0, this.hitMarker - dt);
    g.camState.punch = (g.camState.punch || 0) * Math.pow(0.001, dt);
    const w = this.current();
    this.views.hidden = !!(g.mapUp || g.player.seated || g.hideViewmodel || g.mode === 'title' || g.mode === 'attractNoVM' || g.itemShown);
    this.views.update(dt, m.ctrl.grounded && spd > 0.5, m.sprinting ? 6 : spd, this.aiming);
    // FOV by ADS
    const cam = g.ctx.camera.camera;
    const scope = w && w.scope && this.aiming;
    const base = g.settings?.fov ?? 62;
    const target = scope ? w.scope : this.aiming ? base - 17 : base;
    const monocular = g.monocularOn ? 18 : 0;
    const f = monocular || target;
    if (Math.abs(cam.fov - f) > 0.05) { cam.fov += (f - cam.fov) * Math.min(1, dt * 14); cam.updateProjectionMatrix(); }
    this.scoped = !!scope && cam.fov < 30;
    g.camState.slow = this.scoped ? 0.25 : this.aiming ? 0.7 : 1;
  }
  results() { return {}; }
  state() {
    const w = this.current(), s = this.gunState();
    return { weapon: w ? { id: w.id, cond: s ? Math.round(s.cond) : 100, jammed: !!(s && s.jammed), mag: s ? Math.floor(s.mag) : 0, reserve: s ? s.reserve : 0 } : null, syrettes: this.syrettes, tablets: this.tablets };
  }
}
