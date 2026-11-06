// Guns, wear, jams, shots, blasts. The source's spirit made precise (section 8).
import { THREE } from '../../pixel-engine.js';
import { THROWABLES, WEAPONS } from '../content/weapons.js';
import { held, pressedFixed } from '../core/actions.js';
import { TUNING } from '../core/tuning.js';
import { dist2 } from '../world/geom.js';
import { mixin } from '../core/mixin.js';
import { DamagePart } from './damage.js';
const { Vector3 } = THREE;
const from = new Vector3(), dir = new Vector3(), v = new Vector3(), right = new Vector3(), up = new Vector3();
export const jamChance = (cond) => TUNING.jamRate * 0.12 * (1 - cond / 100) ** 2;
export class Combat {
  fireTimer = 0; busy = 0; busyKind = null; throwHold = -1; heat = 0; overheated = false; shotsFired = 0; hitMark = 0; tracerN = 0;
  constructor(game) { this.game = game; }
  build(ctx) { this.ctx = ctx; this.rng = ctx.random.fork('combat'); this.tracerRng = ctx.random.fork('tracers'); this.tracers = []; ctx.audio; }
  get p() { return this.game.player; }
  newGun(id, cond = 100) { const w = WEAPONS[id]; const belt = this.p.upgrades?.belt ? 1.5 : 1; return { id, cond, mag: w.mag ?? 0, reserve: Math.round((w.reserve ?? 0) * belt), jammed: false, jamLeft: 0 }; }
  give(id, cond = 100, select = true) {
    const p = this.p, w = WEAPONS[id]; if (!w) return;
    const g = this.newGun(id, cond);
    p.guns[w.slot] = g;
    if (select) this.select(w.slot, true);
    this.game.vm.setCondition(id, cond);
    return g;
  }
  select(slot, force) {
    const p = this.p; if (!p.guns[slot] && !force) return;
    if (!p.guns[slot]) return;
    p.slot = slot; const g = p.guns[slot]; this.busy = Math.max(this.busy, 0.3); this.busyKind = 'equip';
    this.game.vm.show(g.id); this.game.vm.setCondition(g.id, g.cond);
    this.game.audio.play('magazine', { volume: 0.4 });
    this.game.hud.touch();
  }
  nextWeapon(dirn = 1) {
    const order = ['main', 'sidearm', 'special', 'melee'], p = this.p; const i = order.indexOf(p.slot);
    for (let k = 1; k <= 4; k++) { const s = order[(i + k * dirn + 8) % 4]; if (p.guns[s]) { this.select(s); return; } }
  }
  current() { const p = this.p; if (p.mounted) return p.mountGun; return p.guns[p.slot] ?? p.guns.melee; }
  /** One fixed step of the player's weapon. */
  fixed(dt) {
    const p = this.p, input = this.ctx.input, game = this.game;
    this.fireTimer -= dt; this.busy = Math.max(0, this.busy - dt);
    this.hitMark = Math.max(0, this.hitMark - dt);
    this.mgShotT = Math.max(0, (this.mgShotT ?? 0) - dt); // The barrel only cools between bursts, or once it has seized.
    if (this.heat > 0 && (this.overheated || this.mgShotT <= 0)) { this.heat = Math.max(0, this.heat - (dt * WEAPONS.mg.overheat) / WEAPONS.mg.cool); if (this.overheated && this.heat <= 0) this.overheated = false; }
    if (!p.canAct()) return;
    const g = this.current(); if (!g) return;
    const w = WEAPONS[g.id];
    p.ads = held(input, 'aim') && !p.sprinting && !p.toolBusy && !p.mapUp && !w.melee;
    if (p.vehicle && !p.mounted) return;
    const slung = game.gunSlung();
    // Reload or unjam.
    if (!p.mapUp && !game.prompt.has() && !game.prompt.choice && input.consumeAny(['KeyR', 'PadSquare'])) this.reloadPress(g, w);
    else if (!p.mapUp && input.consumePress('KeyR')) this.reloadPress(g, w);
    if (!p.mounted) {
      if (!game.prompt.choice && !p.mapUp && pressedFixed(input, 'next')) this.nextWeapon();
      if (input.consumePress('Digit1')) this.select('main'); if (input.consumePress('Digit2')) this.select('sidearm'); if (input.consumePress('Digit3')) this.select('special'); if (input.consumePress('Digit4')) this.select('melee');
      if (!p.mapUp && !game.prompt.choice && pressedFixed(input, 'melee')) this.meleeSwing();
      if (!p.mapUp && pressedFixed(input, 'throw')) this.throwPress();
      if (this.throwHold >= 0) { // Tap to throw, hold to plant.
        if (held(input, 'throw')) { this.throwHold += dt; if (this.throwHold >= 0.35) { this.throwHold = -1; if (p.charges > 0 && !p.toolBusy && !game.gunSlung()) this.plant(); } }
        else { this.throwHold = -1; this.throwBottle(); }
      }
    }
    if (p.mapUp) return; // The click belongs to the map.
    if (slung || p.toolBusy || p.sprinting) { input.clearQueued('MouseLeft', 'PadR2'); return; }
    if (this.busy > 0) return;
    const fireHeld = held(input, 'fire'), firePress = pressedFixed(input, 'fire');
    const wantFire = w.auto || w.stream ? fireHeld : firePress;
    if (wantFire && this.fireTimer <= 0) this.tryFire(g, w, dt);
    if (w.stream && !fireHeld) this.stopStream();
    if (w.pump && g.needsPump && this.fireTimer <= 0.5 && !this.busy) { g.needsPump = false; game.vm.playGun('Pump', true); game.audio.play('rack', { volume: 0.6 }); }
  }
  reloadPress(g, w) {
    const game = this.game;
    if (g.jammed) { // Slap and rack: 2 to 4 presses, seeded.
      if (this.busy > 0.1) return;
      g.jamLeft--; game.vm.playGun('Unjam', true); game.audio.play('slap'); this.ctx.tweens.call(0.2, () => game.audio.play('rack'));
      this.busy = 0.75; this.busyKind = 'unjam'; game.rumble(0.3, 0.1);
      if (g.jamLeft <= 0) { g.jammed = false; game.events.emit('unjam', g); }
      game.hud.touch();
      return;
    }
    if (w.melee || g.id === 'mg' || this.busy > 0 || g.mag >= w.mag || g.reserve <= 0) return;
    this.busy = w.reloadT; this.busyKind = 'reload'; game.vm.playGun('Reload', true);
    game.audio.play(w.stream ? 'fuel-slosh' : g.id === 'm38' ? 'cylinder' : g.id === 'mule' ? 'shell' : 'magazine', { volume: 0.7 });
    this.ctx.tweens.call(w.reloadT * 0.7, () => game.audio.play(g.id === 'm38' ? 'cylinder' : 'rack', { volume: 0.6 }));
    this.pendingReload = { g, w, t: w.reloadT };
    this.ctx.tweens.call(w.reloadT, () => { if (this.pendingReload?.g !== g) return; const need = w.mag - g.mag, take = Math.min(need, g.reserve); g.mag += take; g.reserve -= take; this.pendingReload = null; game.hud.touch(); });
  }
  tryFire(g, w, dt) {
    const p = this.p, game = this.game;
    if (w.melee) { this.meleeSwing(); return; }
    if (g.id === 'mg') { if (this.overheated) { game.audio.play('jam-click', { volume: 0.3 }); this.fireTimer = 0.2; return; } this.mgShotT = 0.25; this.heat += 1 / w.rate; if (this.heat >= w.overheat) { this.overheated = true; game.audio.play('hiss'); } }
    else {
      if (g.jammed) { game.audio.play('jam-click'); this.fireTimer = 0.25; game.prompt.flash('reload', 'CLEAR THE JAM'); return; }
      if (!game.cheats.infiniteAmmo && g.mag <= 0 && !w.stream) { game.audio.play('jam-click', { volume: 0.5 }); this.fireTimer = 0.25; if (g.reserve > 0) this.reloadPress(g, w); return; }
      if (w.stream && g.mag <= 0 && !game.cheats.infiniteAmmo) { this.stopStream(); return; }
    }
    this.fireTimer = Math.max(this.fireTimer, -dt) + 1 / w.rate; // Keep the leftover, so the rate is the table's and not rounded up to whole frames.
    if (g.id !== 'mg') {
      // Wear. Thresholds appear on the gun itself.
      const before = g.cond;
      g.cond = Math.max(0, g.cond - w.wear * TUNING.wearRate * (p.upgrades.cleaning ? 0.6 : 1) * (w.stream ? 1 / 1 : 1));
      if (Math.floor(before / 30) !== Math.floor(g.cond / 30) || before >= 60 !== g.cond >= 60) game.vm.setCondition(g.id, g.cond);
      if (!game.cheats.infiniteAmmo) g.mag -= 1;
      if (g.scriptedJam && --g.scriptedJam === 0) { this.jam(g); return; }
      if (!game.cheats.noJams && !w.stream && !w.melee && this.rng.next() < jamChance(g.cond)) { this.jam(g); return; }
      if (g.cond <= 0 && w.wear > 0) { this.fallApart(g, w); return; }
    }
    this.shotsFired++;
    game.hud.touch();
    game.lastShotT = game.world.time;
    p.litT = 0.5;
    this.ctx.engine.shake.add(w.kick ? Math.min(0.5, w.kick * 3.5) : 0.03);
    game.rumble(w.kick ? Math.min(0.8, w.kick * 8) : 0.2, 0.06);
    if (w.noise) this.game.actors.hearShot(p.x, p.z, w.noise, null);
    game.world.shout(p.x, p.z);
    const eye = this.eye();
    if (w.stream) { this.stream(g, w, dt, eye); game.vm.playGun('Idle', false, 0); return; }
    game.vm.playGun('Fire', true, 0.01);
    if (p.mounted) { game.cam.kickPitch = (game.cam.kickPitch || 0) + 0.003; } else game.cam.kickPitch = (game.cam.kickPitch || 0) + (w.kick ?? 0.01) * 0.9;
    if (w.sound) game.audio.play(w.sound, { pitch: this.tracerRng.range(-0.6, 0.6) });
    this.muzzle(eye);
    if (g.cond < 30 && g.id !== 'mg') { this.ctx.particles.burst('gun-smoke', this.muzzlePos(eye)); if (g.cond < 10 && this.rng.next() < 0.3) game.audio.play('rattle'); }
    if (w.projectile) {
      const [dx, dy, dz] = eye.dir;
      game.projectiles.spawn(w.projectile, eye.x + dx * 0.6, eye.y + dy * 0.6 - 0.1, eye.z + dz * 0.6, dx, dy + (w.projectile === 'flare' ? 0.12 : 0), dz, p);
      if (w.pump) g.needsPump = true;
      return;
    }
    const pellets = w.pellets ?? 1;
    const spreadDeg = p.ads ? (w.adsSpread ?? 0.4) : (w.spread ?? 1.4) * (p.speed2 > 4 ? 1.3 : 1);
    for (let i = 0; i < pellets; i++) this.hitscan(g, w, eye, spreadDeg, i === 0 && (++this.tracerN % 3 === 0 || pellets > 1));
    if (w.pump) g.needsPump = true;
  }
  eye() {
    const c = this.ctx.camera.camera, p = this.p;
    if (this.game.cam.override) { c.getWorldDirection(dir); return { x: c.position.x, y: c.position.y, z: c.position.z, dir: [dir.x, dir.y, dir.z] }; }
    const cy = Math.cos(this.ctx.camera.pitch), d = [-Math.sin(this.ctx.camera.yaw) * cy, Math.sin(this.ctx.camera.pitch), -Math.cos(this.ctx.camera.yaw) * cy];
    const e = p.eyeNow();
    return { x: e.x, y: e.y, z: e.z, dir: d };
  }
  muzzlePos(e) { return [e.x + e.dir[0] * 0.9, e.y + e.dir[1] * 0.9 - 0.14, e.z + e.dir[2] * 0.9]; }
  muzzle(e) { const at = this.muzzlePos(e); this.ctx.lights.request({ position: at, color: 0xffd090, intensity: 18, radius: 16, lifetime: 0.06, fadeIn: 0, fadeOut: 0.04, priority: 4 }); }
  hitscan(g, w, eye, spreadDeg, tracer) {
    const a = this.rng.range(0, 6.283), r = Math.sqrt(this.rng.next()) * (spreadDeg * Math.PI) / 180;
    from.set(eye.x, eye.y, eye.z); dir.set(...eye.dir);
    right.set(dir.z, 0, -dir.x).normalize(); up.crossVectors(dir, right);
    dir.addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
    this.lastHit = this.ctx.physics.castRay(from, dir, w.range, undefined, this.p.vehicle ? this.p.vehicle.v.body : this.p.ctrl?.body);
    const hit = this.lastHit;
    if (this.game.net && !this.game.net.isHost) { // A client: its shot is decided by the host.
      this.game.net.queueShot(from, dir, w.id);
      if (tracer) this.tracer(eye, hit ? hit.point : { x: from.x + dir.x * w.range, y: from.y + dir.y * w.range, z: from.z + dir.z * w.range });
      if (hit) this.ctx.particles.burst('mud', [hit.point.x, hit.point.y, hit.point.z]);
      return;
    }
    if (tracer) this.tracer(eye, hit ? hit.point : { x: from.x + dir.x * w.range, y: from.y + dir.y * w.range, z: from.z + dir.z * w.range });
    if (!hit) return;
    if (g.id === 'mg' && this.rng.next() < 0.02) this.game.world.fire.ignite(hit.point.x, hit.point.z, 1); // Tracer on dry grass, now and then.
    this.applyHit(hit, w.damage * TUNING.weaponDamage, this.p, { dir, weapon: w, from });
  }
  tracer(eye, to) {
    const m = this.muzzlePos(eye);
    this.game.tracers?.add(m[0], m[1], m[2], to.x, to.y, to.z);
    if (this.game.mountedTracerFire && this.rng.next() < 0.06) this.game.world.fire.ignite(to.x, to.z, 1);
  }
  stream(g, w, dt, eye) {
    const game = this.game, p = this.p;
    if (!this.roar) this.roar = game.audio.loopSfx('flame-roar', 0.5);
    this.streamT = 0.15;
    // Lights everything in its cone.
    const [dx, dy, dz] = eye.dir;
    for (let d = 3; d <= w.range; d += 3) game.world.fire.ignite(eye.x + dx * d, eye.z + dz * d, 2, p);
    this.ctx.particles.burst('blast', [eye.x + dx * 2, eye.y - 0.3 + dy * 2, eye.z + dz * 2], { count: 8, direction: [dx, dy, dz] });
    this.ctx.lights.request({ position: [eye.x + dx * 4, eye.y, eye.z + dz * 4], color: 0xff8030, intensity: 22, radius: 20, lifetime: 0.1, priority: 3 });
    for (const a of [...game.actors.list]) { if (!a.alive) continue; const vx = a.x - eye.x, vz = a.z - eye.z, d = Math.hypot(vx, vz); if (d > w.range) continue; const c = (vx * dx + vz * dz) / (d * Math.hypot(dx, dz) || 1); if (c > 0.9) { game.damageActor(a, (w.damage * TUNING.weaponDamage) / w.rate, { by: p, fire: true, silent: true }); if (a.burning <= 0 && !a.friendly) { a.burning = 5; a.burnBy = p; } } }
    for (const dd of game.world.destructibles) if (!dd.destroyed && dist2(dd.x, dd.z, eye.x, eye.z) < w.range) { const vx = dd.x - eye.x, vz = dd.z - eye.z, l = Math.hypot(vx, vz) || 1; if ((vx * dx + vz * dz) / (l * Math.hypot(dx, dz) || 1) > 0.9) dd.fuse = dd.fuse < 0 ? 0.8 : dd.fuse; }
    // Below condition 20 it can leak and light you.
    if (g.cond < 20 && this.rng.next() < 0.004) { p.catchFire(); game.talk.say('you', 'THE TANK IS LEAKING.'); }
  }
  stopStream() { if (this.roar) { this.roar.stop(); this.roar = null; } }
  jam(g) { g.jammed = true; g.jamLeft = this.rng.int(2, 4); this.game.audio.play('jam-click'); this.game.prompt.flash('reload', 'JAMMED'); this.game.events.emit('jam', g); this.game.hud.touch(); this.fireTimer = 0.4; }
  fallApart(g, w) {
    const game = this.game, p = this.p;
    this.stopStream();
    game.vm.playGun('FallApart', true); game.audio.play('fall-apart');
    game.talk.say('you', `THE ${w.name.replaceAll('"', '')} COMES APART IN YOUR HANDS.`);
    this.busy = 1.1; this.busyKind = 'broken';
    this.ctx.tweens.call(1.1, () => { p.guns[w.slot] = null; this.nextWeapon(); });
    game.events.emit('fallApart', g);
  }
  meleeSwing() {
    const game = this.game, p = this.p; if (this.busy > 0 || game.gunSlung() || p.toolBusy) return;
    const prev = p.slot; const w = WEAPONS.cane;
    this.select('melee'); game.vm.playGun('Swing', true); this.busy = 1 / w.rate; this.busyKind = 'melee';
    game.audio.play('whoosh', { volume: 0.5 });
    const eye = this.eye();
    if (game.net && !game.net.isHost) { game.net.queueShot({ x: eye.x, y: eye.y, z: eye.z }, { x: eye.dir[0], y: eye.dir[1], z: eye.dir[2] }, 'cane'); return; }
    this.ctx.tweens.call(0.2, () => {
      let best = null, bd = 1e9;
      for (const a of game.actors.list) { if (!a.alive || a.friendly) continue; const d = Math.hypot(a.x - eye.x, a.z - eye.z); if (d > w.range) continue; const c = ((a.x - eye.x) * eye.dir[0] + (a.z - eye.z) * eye.dir[2]) / (d * Math.hypot(eye.dir[0], eye.dir[2]) || 1); if (c > 0.5 && d < bd) { best = a; bd = d; } }
      if (best) {
        // Kills from behind, quietly.
        let dy = Math.atan2(eye.x - best.x, eye.z - best.z) - best.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        const behind = Math.abs(dy) > 1.9;
        game.damageActor(best, behind && best.state !== 'alert' ? 9999 : w.damage * TUNING.weaponDamage, { by: p, zone: 1, quiet: behind, push: [eye.dir[0] * 3, 1, eye.dir[2] * 3] });
        game.audio.play('hit-flesh'); this.hitMark = 0.18; this.ctx.particles.burst('blood', [best.x, best.y + 1.2, best.z]);
      }
      if (prev !== 'melee') this.ctx.tweens.call(0.35, () => { if (p.guns[prev] && p.slot === 'melee') this.select(prev); });
    });
  }
  throwPress() {
    const game = this.game, p = this.p;
    // A planted charge goes off on a second press.
    if (p.planted.length) { game.vm.playTool('Detonate', ['tool-detonator'], { hideGun: true }); p.toolBusy = 0.7; game.audio.play('click'); const list = [...p.planted]; p.planted.length = 0; this.ctx.tweens.call(0.35, () => { for (const c of list) this.detonate(c); }); return; }
    if (this.busy > 0 || game.gunSlung() || p.toolBusy) return;
    if (p.charges > 0) { this.throwHold = 0; return; }
    this.throwBottle();
  }
  throwBottle() {
    const game = this.game, p = this.p;
    if (p.molotovs <= 0 && !game.cheats.infiniteAmmo) { game.prompt.flash('throw', p.charges > 0 ? 'HOLD TO PLANT' : 'NOTHING TO THROW'); return; }
    if (!game.cheats.infiniteAmmo) p.molotovs--;
    game.vm.playTool('Throw', ['tool-bottle']); p.toolBusy = 0.75; game.hud.touch();
    game.audio.play('whoosh', { volume: 0.5 });
    const eye = this.eye();
    this.ctx.tweens.call(0.45, () => game.projectiles.spawn('bottle', eye.x + eye.dir[0], eye.y + eye.dir[1], eye.z + eye.dir[2], eye.dir[0], eye.dir[1] + 0.25, eye.dir[2], p));
  }
  plant() {
    const game = this.game, p = this.p; p.charges--;
    game.vm.playTool('Plant', ['tool-charge']); p.toolBusy = 1.3; game.audio.play('click');
    const eye = this.eye(), x = eye.x + eye.dir[0] * 1.1, z = eye.z + eye.dir[2] * 1.1, y = game.world.land.heightAt(x, z);
    const c = game.spawnCharge(x, y, z); p.planted.push(c); game.hud.touch();
    game.events.emit('planted', c);
  }
  detonate(c) { this.game.removeCharge(c); this.explode(c.x, c.y + 0.3, c.z, THROWABLES.charge.blast, THROWABLES.charge.damage * TUNING.weaponDamage, this.p, { fire: 5, big: true, charge: true }); }
  clear() { this.stopStream(); this.pendingReload = null; this.busy = 0; }
}
mixin(Combat, DamagePart);
