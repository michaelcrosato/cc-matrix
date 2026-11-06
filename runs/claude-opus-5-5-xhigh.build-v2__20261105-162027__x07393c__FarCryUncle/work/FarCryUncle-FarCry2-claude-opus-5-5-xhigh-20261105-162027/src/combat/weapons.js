// The player's guns: wear, jams, things falling apart, throws. The source's spirit made precise (PLAN section 8).
import { THREE, Decals } from '../../pixel-engine.js';
import { TUNING } from '../core/tuning.js';
import { WEAPONS, THROWN, SLOT_ORDER } from '../content/weapons.js';
import { clamp, lerp } from '../core/rng.js';
import { SITES } from '../content/sites.js';
const { Vector3 } = THREE;
const _f = new Vector3(), _o = new Vector3();
const MILE_FORTY = SITES['mile-forty'].at, MILE_FORTY_R = SITES['mile-forty'].noFire;
export const newGun = (id, cond = 100) => { const d = WEAPONS[id]; return { id, cond, mag: d.mag ?? 0, reserve: d.reserve ?? 0, jam: 0 }; };
export const jamChance = (cond) => TUNING.jamRate * 0.12 * Math.pow(1 - cond / 100, 2);

export class Weapons {
  slots = { melee: { id: 'cane', cond: 100, mag: 0, reserve: 0, jam: 0 }, sidearm: null, main: null, special: null };
  current = 'melee'; cool = 0; lock = 0; aiming = false; aimT = 0; reloading = 0; shotsFired = 0; bottles = 0; charges = 0; placed = []; plantHold = 0; throwHeld = false; streamT = 0; lastNoise = 0; tracerN = 0; scriptJamAt = 0; scriptShots = 0; heat = 0; overheated = false; mounted = null; lit = 0; hasCleaning = false; hasBelt = false; flameOn = false; flameT = 0; leakT = 0;
  constructor(game) { this.game = game; }
  get gun() { return this.slots[this.current]; }
  get def() { return WEAPONS[this.gun?.id ?? 'cane']; }
  give(id, cond = 100, equip = false) {
    const d = WEAPONS[id];
    const old = this.slots[d.slot];
    const g = newGun(id, cond);
    if (this.hasBelt && g.reserve) g.reserve = Math.round(g.reserve * 1.5);
    this.slots[d.slot] = g;
    if (equip || !old) this.equip(d.slot);
    return g;
  }
  equip(slot) {
    if (!this.slots[slot]) return false;
    if (this.current !== slot || this.game.vm.gunId !== this.slots[slot].id) { this.current = slot; this.game.sfx.play('gun-equip', { volume: 0.35 }); this.lock = Math.max(this.lock, 0.25); this.reloading = 0; this.game.vm.showGun(this.slots[slot].id, true); this.flameStop(); }
    return true;
  }
  cycle(dir = 1) {
    const order = SLOT_ORDER.filter((s) => this.slots[s]);
    const i = order.indexOf(this.current);
    if (order.length) this.equip(order[(i + dir + order.length) % order.length]);
  }
  fixedUpdate(ctx, dt) {
    const g = this.game, a = g.actions;
    this.cool -= dt; this.lock -= dt;
    if (this.mounted) { this.mountedStep(ctx, dt); return; }
    // Inside Mile Forty, while the truce holds, your gun is slung and will not fire.
    const f = g.player.feet;
    this.slung = g.mode === 'campaign' && g.story.truce && Math.hypot(f.x - MILE_FORTY[0], f.z - MILE_FORTY[1]) < MILE_FORTY_R;
    const canAct = g.canAct() && !g.player.frozen && !g.interact.holding && !this.slung;
    // Slots.
    if (canAct) {
      if (a.take('next')) this.cycle(1);
      for (let i = 0; i < 4; i++) if (ctx.input.consumePress(`Digit${i + 1}`)) this.equip(SLOT_ORDER[i]);
      if (g.wheelStep) { this.cycle(g.wheelStep > 0 ? 1 : -1); g.wheelStep = 0; }
    }
    const gun = this.gun, def = this.def;
    this.aiming = canAct && a.down('aim') && def.cls !== 'melee' && !g.player.sprinting && this.lock <= 0 && !g.mapUp;
    this.aimT = lerp(this.aimT, this.aiming ? 1 : 0, 1 - Math.exp(-dt * 12));
    // Reload ends.
    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) this.finishReload();
    }
    if (g.inMonocular()) { this.flameStop(); return; }
    if (canAct) {
      this.throwing(ctx, dt);
      if (a.take('melee') && this.lock <= 0) this.swing(ctx);
      // Reload is Square on a pad only when no use prompt is showing; R on keys always.
      const padSquareFree = !g.interact.current;
      if ((ctx.input.consumePress('KeyR') || (padSquareFree && ctx.input.consumePress('PadSquare')) || g.actions.bot?.queue.delete('reload')) && this.lock <= 0) this.reloadPress(ctx);
    }
    // Fire.
    const wants = canAct && (def.cls === 'melee' ? a.take('fire') : def.auto ? a.down('fire') : a.take('fire'));
    if (def.stream) this.streamStep(ctx, dt, wants && this.reloading <= 0 && this.lock <= 0 && !gun.jam);
    else if (wants && this.lock <= 0 && this.reloading <= 0) {
      if (def.cls === 'melee') this.swing(ctx);
      else if (this.cool <= 0) this.shoot(ctx);
    }
    // A bad gun rattles.
    if (gun && gun.cond < 10 && def.wear > 0 && g.player.speedNow > 5 && g.tick % 40 === 0) g.sfx.play('gun-rattle', { volume: 0.25 });
  }
  /** One press on a jammed gun works it loose a little; on a clean one it reloads. */
  reloadPress(ctx) {
    const gun = this.gun, def = this.def, g = this.game;
    if (!gun || def.cls === 'melee') return;
    if (gun.jam > 0) {
      gun.jam--;
      this.lock = 0.62;
      g.vm.play(def.cls === 'pistol' ? 'UnjamPistol' : 'UnjamRifle');
      g.sfx.play('gun-slap', { volume: 0.7 });
      g.after(0.25, () => g.sfx.play('gun-rack', { volume: 0.7 }));
      if (gun.jam === 0) { g.events.emit('unjammed'); g.notice('', 0); g.after(0.3, () => g.sfx.play('gun-mag', { volume: 0.3 })); }
      return;
    }
    if (this.reloading > 0 || gun.mag >= def.mag || gun.reserve <= 0) return;
    this.reloading = def.reload;
    this.lock = 0;
    const clip = gun.id === 'mule' ? 'ReloadPump' : gun.id === 'empire' ? 'ReloadBolt' : gun.id === 'm38' ? 'ReloadRevolver' : gun.id === 'flare' ? 'ReloadFlare' : gun.id === 'tube' ? 'ReloadTube' : 'ReloadRifle';
    g.vm.play(clip);
    g.sfx.play(gun.id === 'm38' ? 'gun-cylinder' : gun.id === 'mule' ? 'gun-shell' : 'gun-mag', { volume: 0.6 });
    if (gun.id === 'mule') for (let i = 1; i < 4; i++) g.after(i * 0.55, () => g.sfx.play('gun-shell', { volume: 0.5 }));
    else g.after(def.reload * 0.7, () => g.sfx.play('gun-rack', { volume: 0.5 }));
    g.events.emit('reload-start');
  }
  finishReload() {
    const gun = this.gun, def = this.def;
    if (!gun || !def.mag) return;
    const need = def.mag - gun.mag, take = Math.min(need, gun.reserve);
    gun.mag += take; gun.reserve -= take;
    this.game.events.emit('reloaded');
  }
  aimDir(out = _f) { return this.game.player.forward(out); }
  muzzleWorld(out = _o) { return out.copy(this.game.player.eye); }
  shoot(ctx) {
    const g = this.game, gun = this.gun, def = this.def;
    if (gun.jam > 0) { g.sfx.play('gun-jam', { volume: 0.7 }); this.cool = 0.25; g.showJam(); return; }
    if (gun.mag <= 0) {
      g.sfx.play('gun-jam', { volume: 0.4, pitch: 4 }); this.cool = 0.25;
      if (gun.reserve > 0) this.reloadPress(ctx);
      return;
    }
    this.cool = 1 / def.rate;
    gun.mag--;
    this.shotsFired++;
    // Wear and the jam roll: one per shot, seeded.
    const wearK = TUNING.wearRate * (this.hasCleaning ? 0.6 : 1);
    if (def.wear > 0 && !g.dev.noWear) gun.cond = clamp(gun.cond - def.wear * wearK, 0, 100);
    let jammed = false;
    if (this.scriptJamAt > 0) { this.scriptShots++; if (this.scriptShots >= this.scriptJamAt) { jammed = true; this.scriptJamAt = 0; this.scriptShots = 0; } }
    else if (!g.dev.noJams && def.wear > 0 && g.rng.gun.next() < jamChance(gun.cond)) jammed = true;
    // The shot itself.
    const eye = g.player.eye, fwd = this.aimDir();
    const sp = (def.spread * (this.aiming ? 0.3 : 1) * (g.player.moving ? 1.25 : 1)) * (Math.PI / 180);
    const r = g.rng.gun;
    const client = g.round?.isClient;
    if (def.projectile) {
      const kind = def.projectile;
      const px = eye.x + fwd.x * 0.8, py = eye.y + fwd.y * 0.8 - 0.08, pz = eye.z + fwd.z * 0.8, dx = fwd.x + r.range(-sp, sp), dy = fwd.y + r.range(-sp, sp) + (kind === 'flare' ? 0.04 : 0), dz = fwd.z + r.range(-sp, sp);
      if (client) g.round.evQ.push(['pr', kind, px, py, pz, dx, dy, dz]);
      else g.projectiles.spawn(kind, px, py, pz, dx, dy, dz, 'player');
    } else {
      const pellets = def.pellets ?? 1;
      for (let i = 0; i < pellets; i++) {
        const dx = fwd.x + r.range(-sp, sp), dy = fwd.y + r.range(-sp, sp), dz = fwd.z + r.range(-sp, sp);
        const dmg = def.damage * TUNING.weaponDamage;
        // Local shots show muzzle flash and tracers at once; the host decides hits.
        const hit = client ? g.damage.visualRay(eye.x, eye.y, eye.z, dx, dy, dz, def.range) : g.damage.bullet(eye.x, eye.y, eye.z, dx, dy, dz, def.range, dmg, 'player');
        if (client && i === 0) g.round.sendShot(eye.x, eye.y, eye.z, dx, dy, dz, gun.id);
        if (i === 0 && ++this.tracerN % 3 === 0 && hit) g.fx.tracerFromView(hit.x, hit.y, hit.z);
      }
    }
    // Feedback.
    g.vm.fire();
    g.sfx.play(def.sound, { volume: 0.8 });
    g.fx.muzzleFlash(def);
    g.player.litUntil = g.time + 0.5;
    ctx.engine.shake.add(clamp(def.kick * 6, 0.03, 0.35));
    g.cam.kickPitch += def.kick * (this.aiming ? 0.55 : 1) * (1 + r.range(0, 0.3));
    g.cam.kickYaw += r.range(-1, 1) * def.kick * 0.25;
    g.rumble(0.3 + def.kick * 6, 0.06);
    if (gun.cond < 30 && def.wear > 0) g.fx.gunSmoke();
    g.actors.heardGunshot(eye.x, eye.z, def.hear, 'player');
    g.events.emit('shot', gun.id);
    g.hudTouch('ammo');
    if (jammed) {
      gun.jam = r.int(2, 4);
      g.events.emit('jam');
      g.sfx.play('gun-jam', { volume: 0.7 });
      g.showJam();
    }
    if (def.wear > 0 && gun.cond <= 0) this.fallApart();
  }
  fallApart() {
    const g = this.game;
    const slot = this.current;
    g.vm.play('FallApart');
    g.sfx.play('gun-apart', { volume: 0.9 });
    g.ledger.note('guns');
    g.events.emit('gun-apart', this.slots[slot].id);
    this.lock = 1.4;
    g.after(1.3, () => {
      this.slots[slot] = null;
      if (this.current === slot) { this.current = 'melee'; g.vm.showGun('cane', true); }
    });
  }
  flameStop() { if (this.flameOn) { this.flameOn = false; this.game.sfx.stopLoop('flamer'); } }
  streamStep(ctx, dt, wants) {
    const g = this.game, gun = this.gun, def = this.def;
    if (!wants || gun.mag <= 0) { this.flameStop(); if (wants && gun.mag <= 0) { if (gun.reserve > 0) this.reloadPress(ctx); else if (g.tick % 40 === 0) g.sfx.play('gun-jam', { volume: 0.4 }); } return; }
    if (!this.flameOn) { this.flameOn = true; g.sfx.play('flamer-start', { volume: 0.7 }); g.sfx.startLoop('flamer', 'flamer-loop', { volume: 0.7 }); }
    gun.mag = Math.max(0, gun.mag - 30 * dt);
    if (!g.dev.noWear) gun.cond = clamp(gun.cond - def.wear * 30 * dt * TUNING.wearRate * (this.hasCleaning ? 0.6 : 1), 0, 100);
    const eye = g.player.eye, fwd = this.aimDir();
    // Lights everything in its cone.
    const reach = def.range;
    this.flameT -= dt;
    if (this.flameT <= 0) {
      this.flameT = 0.1;
      const t = g.rng.gun.range(0.35, 1) * reach;
      if (g.round?.isClient) g.round.evQ.push(['ignite', eye.x + fwd.x * t, eye.z + fwd.z * t, 2.5]);
      else g.fire.ignite(eye.x + fwd.x * t, eye.z + fwd.z * t, 2.5, 'player');
      for (const s of g.actors.soldiers) {
        if (!s.active || s.dead) continue;
        const dx = s.x - eye.x, dz = s.z - eye.z, d = Math.hypot(dx, dz);
        if (d < reach && (dx * fwd.x + dz * fwd.z) / (d || 1) > 0.9) { s.hurt(def.damage * TUNING.weaponDamage * 0.1, 'player', fwd, 'body', {}); if (d < reach * 0.7) s.ignite(); }
      }
      for (const v of g.vehicles.list) { if (v.alive && Math.hypot(v.x - eye.x, v.z - eye.z) < reach) { const dx = v.x - eye.x, dz = v.z - eye.z, d = Math.hypot(dx, dz) || 1; if ((dx * fwd.x + dz * fwd.z) / d > 0.9) v.hurt(1.2, 'fire'); } }
      for (const ex of g.world.explosives) { if (ex.alive && Math.hypot(ex.x - eye.x, ex.z - eye.z) < reach) { const dx = ex.x - eye.x, dz = ex.z - eye.z, d = Math.hypot(dx, dz) || 1; if ((dx * fwd.x + dz * fwd.z) / d > 0.9) { ex.hp -= 4; if (ex.hp <= 0) g.damage.explode(ex, 'fire', 'player'); } } }
      g.actors.heardGunshot(eye.x, eye.z, def.hear, 'player');
    }
    g.player.litUntil = g.time + 0.5;
    g.fx.flamerStream(eye, fwd);
    // Below 20 it can leak and light you.
    if (gun.cond < 20 && !g.dev.noJams && g.rng.gun.chance(dt * 0.25)) { g.body.catchFire(); g.say('', 'IT LEAKS.', 1.6); }
    if (gun.cond <= 0) { this.flameStop(); this.fallApart(); }
    g.vm.flame = 1;
  }
  swing(ctx) {
    const g = this.game, eye = g.player.eye, fwd = this.aimDir();
    if (this.cool > 0) return;
    this.cool = 1 / 1.6; this.lock = 0.28;
    g.vm.showGun('cane', false);
    g.vm.play('Swing');
    g.sfx.play('knife-swing', { volume: 0.6 });
    g.after(0.13, () => {
      if (g.round?.isClient) { g.round.evQ.push(['shot', eye.x, eye.y, eye.z, fwd.x, fwd.y, fwd.z, 'cane']); return; }
      const hit = g.damage.bullet(eye.x, eye.y, eye.z, fwd.x, fwd.y, fwd.z, 2.2, 0, 'player', { melee: true, silent: true });
      const ent = hit?.ent;
      if (ent?.kind === 'soldier' && !ent.ref.dead) {
        const s = ent.ref;
        const behind = s.fromBehind(eye.x, eye.z);
        s.hurt((behind ? 999 : 55) * TUNING.weaponDamage, 'player', fwd, behind ? 'stealth' : 'body', {});
        g.sfx.play('hit-flesh', { volume: 0.8 });
        g.events.emit('melee', s, behind);
      } else if (ent?.kind === 'merc') { g.round?.hitMerc(ent.ref, 55 * TUNING.weaponDamage, {}, 'player'); }
      else if (hit) g.sfx.play('hit-metal', { volume: 0.25 });
    });
    if (this.current !== 'melee') g.after(0.55, () => g.vm.showGun(this.gun?.id ?? 'cane', false));
  }
  throwing(ctx, dt) {
    const g = this.game, a = g.actions;
    const down = a.down('throw');
    if (down) {
      this.plantHold += dt;
      if (this.plantHold > 0.7 && !this.planted && this.charges > 0 && this.placed.length < 2) {
        this.planted = true;
        this.plant(ctx);
      }
    } else if (this.plantHold > 0) {
      const short = this.plantHold <= 0.7;
      this.plantHold = 0; this.planted = false;
      a.take('throw');
      if (short && this.lock <= 0) {
        if (this.placed.length) this.detonate(ctx);
        else if (this.bottles > 0) this.throwBottle(ctx);
        else if (this.charges > 0) g.notice('HOLD TO PLANT', 1.5);
      }
    }
  }
  throwBottle(ctx) {
    const g = this.game, eye = g.player.eye, fwd = this.aimDir();
    this.bottles--;
    this.lock = 0.55;
    g.vm.showProp('p-bottle'); g.vm.play('Throw');
    g.sfx.play('whoosh', { volume: 0.4 });
    g.after(0.28, () => { if (g.round?.isClient) g.round.evQ.push(['pr', 'bottle', eye.x + fwd.x, eye.y + fwd.y, eye.z + fwd.z, fwd.x, fwd.y + 0.22, fwd.z]); else g.projectiles.spawn('bottle', eye.x + fwd.x, eye.y + fwd.y, eye.z + fwd.z, fwd.x, fwd.y + 0.22, fwd.z, 'player'); });
    g.after(0.65, () => g.vm.showGun(this.gun?.id ?? 'cane', false));
    g.events.emit('throw');
  }
  plant(ctx) {
    const g = this.game, f = g.player.feet, fwd = this.aimDir();
    this.charges--;
    this.lock = 1.3;
    g.vm.showProp('p-charge'); g.vm.play('Plant');
    g.sfx.play('gun-mag', { volume: 0.5 });
    g.player.frozen = true;
    g.after(1.2, () => {
      g.player.frozen = false;
      const x = f.x + fwd.x * 0.9, z = f.z + fwd.z * 0.9, y = g.world.heightAt(x, z);
      const obj = g.fx.chargeProp(x, y, z);
      this.placed.push({ x, y, z, obj });
      g.vm.showGun(this.gun?.id ?? 'cane', false);
      g.events.emit('planted', x, z);
    });
  }
  detonate(ctx) {
    const g = this.game;
    g.vm.showProp('p-det'); g.vm.play('Detonate');
    g.sfx.play('gun-jam', { volume: 0.8, pitch: -6 });
    this.lock = 0.4;
    const list = this.placed; this.placed = [];
    g.after(0.2, () => {
      for (const c of list) {
        g.fx.removeProp(c.obj);
        if (g.round?.isClient) g.round.evQ.push(['blast', c.x, c.y + 0.4, c.z]);
        else g.damage.blast(c.x, c.y + 0.4, c.z, THROWN.charge.blast, THROWN.charge.damage, 'player', { fire: 6 });
      }
      g.events.emit('detonated', list);
    });
    g.after(0.6, () => g.vm.showGun(this.gun?.id ?? 'cane', false));
  }
  /** The technical's gun and the flatcar's: no ammunition, overheats at 6 s, cools in 4 s. */
  mountedStep(ctx, dt) {
    const g = this.game, a = g.actions, def = WEAPONS.mg, m = this.mounted;
    const wants = a.down('fire');
    if (this.overheated) { this.heat -= dt / def.cool; if (this.heat <= 0) { this.heat = 0; this.overheated = false; } }
    else if (wants && this.cool <= 0) {
      this.cool = 1 / def.rate;
      this.heat += (1 / def.rate) / def.overheat;
      if (this.heat >= 1) { this.heat = 1; this.overheated = true; g.sfx.play('gun-jam', { volume: 0.6 }); g.notice('TOO HOT', 1.2); }
      const eye = g.player.eye, fwd = this.aimDir(), r = g.rng.gun, sp = (def.spread * Math.PI) / 180;
      const hit = g.damage.bullet(eye.x + fwd.x * 1.4, eye.y + fwd.y * 1.4, eye.z + fwd.z * 1.4, fwd.x + r.range(-sp, sp), fwd.y + r.range(-sp, sp), fwd.z + r.range(-sp, sp), def.range, def.damage * TUNING.weaponDamage, 'player');
      if (hit && ++this.tracerN % 3 === 0) { g.fx.tracerFromView(hit.x, hit.y, hit.z); if (g.rng.gun.chance(0.08)) g.fire.ignite(hit.x, hit.z, 1, 'player'); }
      g.sfx.play(def.sound, { volume: 0.7 });
      g.fx.muzzleFlash(def);
      ctx.engine.shake.add(0.07);
      g.cam.kickPitch += def.kick; g.cam.kickYaw += r.range(-1, 1) * def.kick * 0.4;
      g.rumble(0.35, 0.05);
      g.actors.heardGunshot(eye.x, eye.z, def.hear, 'player');
      g.player.litUntil = g.time + 0.5;
      m.turret?.();
      g.events.emit('shot', 'mg');
    } else if (!wants) this.heat = Math.max(0, this.heat - dt / def.cool);
  }
  /** What's on the HUD: the small gun icon goes white, orange, red. */
  condColor() {
    const c = this.gun?.cond ?? 100;
    return c >= 60 ? 'white' : c >= 30 ? 'orange' : 'red';
  }
  resetLoadout() {
    this.slots = { melee: { id: 'cane', cond: 100, mag: 0, reserve: 0, jam: 0 }, sidearm: null, main: null, special: null };
    this.current = 'melee'; this.bottles = 0; this.charges = 0; this.placed = []; this.hasCleaning = false; this.hasBelt = false; this.mounted = null; this.heat = 0; this.reloading = 0; this.lock = 0; this.scriptJamAt = 0; this.scriptShots = 0; this.flameStop();
  }
  snapshot() { return { slots: JSON.parse(JSON.stringify(this.slots)), current: this.current, bottles: this.bottles, charges: this.charges, hasCleaning: this.hasCleaning, hasBelt: this.hasBelt }; }
  restoreData(d) { this.slots = d.slots; this.current = d.current; this.bottles = d.bottles; this.charges = d.charges; this.hasCleaning = d.hasCleaning; this.hasBelt = d.hasBelt; }
}
