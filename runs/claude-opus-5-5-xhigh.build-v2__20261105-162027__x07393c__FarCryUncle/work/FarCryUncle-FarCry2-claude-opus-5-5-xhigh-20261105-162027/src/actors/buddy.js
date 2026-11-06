// Hired friends: a named person with trust, a rescue, an alternate plan, and an end. The same brain walks the Cash Run's hired guns.
import { THREE, CharacterController, buildModel, setLookLayer } from '../../pixel-engine.js';
import { TUNING } from '../core/tuning.js';
import { makePerson } from './rig.js';
import { MODELS } from '../art/models.js';
import { clamp, wrapAngle } from '../core/rng.js';
const { Vector3 } = THREE;
export const BUDDIES = {
  ines: { id: 'ines', name: 'INES', model: 'ines', perk: 'range', voice: 'ines', rescueR: 900 },
  dov: { id: 'dov', name: 'DOV', model: 'dov', perk: 'charges', voice: 'dov', rescueR: 420 },
  mags: { id: 'mags', name: 'MAGS', model: 'mags', perk: 'medic', voice: 'mags', rescueR: 420 },
  pell: { id: 'pell', name: 'PELL', model: 'pell', perk: 'none', voice: 'pell', rescueR: 0, guide: true },
};
export class Buddy {
  kind = 'buddy'; met = false; dead = false; trust = 0; spentUntil = 0; woundedUntil = 0; active = false; hp = 200; isDown = false; downT = 0; burningDown = false; x = 0; y = 0; z = 0; yaw = 0; goal = null; fireCool = 0; following = true; burstLeft = 0; burstPause = 0; moveWanted = 0;
  constructor(game, id) { this.game = game; this.id = id; this.def = BUDDIES[id]; }
  get name() { return this.def.name; }
  resetAll() { this.met = false; this.dead = false; this.trust = 0; this.spentUntil = 0; this.woundedUntil = 0; this.despawn(); }
  targetInfo() { const b = this; return { kind: 'buddy', ref: this, x: b.x, y: b.y, z: b.z, eyeY: b.y + 1.45, fast: false, refresh() { this.x = b.x; this.y = b.y; this.z = b.z; this.eyeY = b.y + 1.45; } }; }
  makeBody(ctx) {
    if (this.cc) return;
    this.cc = new CharacterController(ctx.physics, { position: [this.x, this.y + 0.1, this.z], radius: 0.32, halfHeight: 0.56, speed: 5, jumpSpeed: 0, gravity: -24 });
    ctx.physics.tag(this.cc.collider, 'npc');
    this.game.hitMap.set(this.cc.collider.handle, { kind: 'buddy', ref: this });
  }
  makeView(ctx) {
    const g = this.game;
    if (this.view || !g.views) return;
    const p = makePerson(this.def.model);
    const gun = buildModel('npc-rifle', { catalog: MODELS });
    setLookLayer(gun.object, 'actors');
    gun.object.rotation.x = Math.PI / 2; gun.object.position.set(0, -0.08, 0.04);
    p.object.getObjectByName('HandR').add(gun.object);
    this.view = p; this.gunObj = gun.object;
    ctx.scene.add(p.object);
  }
  /** Put them in the world, fighting beside you. */
  spawn(ctx, x, z, { hp = 200, goal = null, following = true } = {}) {
    const g = this.game;
    this.x = x; this.z = z; this.y = g.world.heightAt(x, z); this.hp = hp; this.maxHp = hp; this.isDown = false; this.active = true; this.goal = goal; this.following = following; this.burningDown = false; this.downT = 0;
    this.makeBody(ctx);
    this.cc.collider.setEnabled(true);
    this.cc.teleport([x, this.y + 0.1, z]);
    this.makeView(ctx);
    if (this.view) { this.view.object.visible = true; this.view.anim.stop(); this.view.anim.set('Idle', 'AimIdle'); if (this.gunObj) this.gunObj.visible = true; }
    g.events.emit('buddy-spawned', this.id);
  }
  despawn() {
    this.active = false; this.isDown = false;
    if (this.cc) { this.cc.teleport([this.x, -40, this.z]); this.cc.collider.setEnabled(false); }
    if (this.view) this.view.object.visible = false;
    if (this.usable) { this.game.interact.remove(this.usable); this.usable = null; }
  }
  hurt(a, who) {
    const g = this.game;
    if (this.isDown || this.dead || !this.active) return;
    if (g.dev.god && !this.isHostile) return;
    this.hp -= a;
    if (this.hp <= 0) { if (this.isHostile) { this.isHostile = false; this.killed('pass'); } else this.goDown(false); }
  }
  /** At 0 they fall, wounded, for 40 s. At their side, Syrette or Finish It. If they are burning they ask you to finish it. */
  goDown(burning) {
    const g = this.game;
    this.isDown = true; this.downT = 40; this.burningDown = burning; this.hp = 0;
    this.view?.anim.set('Crawl', 'Crawl', 0.15);
    if (this.gunObj) this.gunObj.visible = false;
    g.say(this.id, burning ? "DON'T LET IT BE THE FIRE. PLEASE. NOT THE FIRE." : `${this.name} IS DOWN.`, 4);
    g.events.emit('buddy-down', this, burning);
    this.usable = g.interact.add({ x: this.x, y: this.y + 0.8, z: this.z, r: 2.6, wide: true, marker: true, buddy: this,
      verb: () => (g.body.syrettes > 0 ? 'SYRETTE' : 'NO SYRETTES'), altVerb: () => 'FINISH IT',
      enabled: () => g.body.syrettes > 0,
      onUse: () => this.saved(), onAlt: () => this.finish() });
  }
  saved() {
    const g = this.game;
    if (g.body.syrettes <= 0) return;
    g.body.syrettes--;
    this.isDown = false; this.hp = this.maxHp * 0.5; this.trust++;
    if (this.usable) { g.interact.remove(this.usable); this.usable = null; }
    this.view?.anim.set('Idle', 'AimIdle');
    if (this.gunObj) this.gunObj.visible = true;
    g.sfx.play('syrette');
    g.say(this.id, g.dialogue.pick(`${this.id}.saved`), 4);
    g.ledger.note('saved', this.id);
    g.events.emit('buddy-saved', this);
  }
  finish() {
    const g = this.game;
    g.vm.showProp('p-finish');
    g.vm.play('FinishIt', { onEnd: () => g.vm.showGun(g.weapons.gun?.id ?? 'cane', false) });
    g.after(0.85, () => { g.sfx.play('gun-m38'); g.ctx.engine.shake.add(0.2); g.rumble(0.7, 0.15); this.killed('mercy'); });
  }
  killed(how) {
    const g = this.game;
    this.dead = true; this.isDown = false;
    if (this.usable) { g.interact.remove(this.usable); this.usable = null; }
    if (this.view) { this.view.anim.set('LieIdle', 'LieIdle', 0.3); }
    if (this.cc) this.cc.collider.setEnabled(false);
    g.ledger.add('friends', 1);
    g.ledger.note('friend', this.id, how);
    g.events.emit('buddy-dead', this, how);
    g.places.refreshWalls();
  }
  /** Rescue scene: you are dragged backward, they swear, you are up at 40 (Mags 60) and they are spent for a day. */
  rescue() {
    const g = this.game;
    const f = g.player.feet;
    const hp = this.id === 'mags' ? 60 : 40;
    g.scene.playRescue(this, () => {
      g.body.hp = hp; g.body.burning = 0; g.body.lastHit = g.time;
      this.spentUntil = g.clock.abs + 24;
      if (g.rng.story.chance(TUNING.buddyWoundChance)) { this.woundedUntil = g.clock.abs + 48; g.say(this.id, g.dialogue.pick(`${this.id}.wounded`) ?? 'THAT WAS THE LAST ONE I HAD IN ME.', 3.5); }
      this.trust = Math.max(0, this.trust);
      g.ledger.note('rescued', this.id);
      g.events.emit('rescued', this);
    });
  }
  /** At the Pass they come for the stones. */
  turnOn(target) {
    this.isHostile = true; this.following = false; this.goal = null; this.hp = 200; this.maxHp = 200;
  }
  fixedUpdate(ctx, dt) {
    const g = this.game;
    if (!this.active || this.dead || this.scripted) return;
    if (this.isHostile) { this.hostileStep(ctx, dt); return; }
    if (this.isDown) {
      this.downT -= dt;
      if (this.downT < 38.4 && this.view?.anim.lowerName === 'Crawl') this.view.anim.set('WoundedSit', 'WoundedSit', 0.3);
      if (this.burningDown && g.tick % 10 === 0) ctx.particles.burst('vehicle-flame', [this.x, this.y + 0.6, this.z], { count: 2 });
      if (this.downT <= 0) { g.say('', `${this.name} HAS STOPPED ASKING.`, 3); this.killed('wound'); }
      return;
    }
    if (g.fire.isBurning(this.x, this.z) && !this.fireProof) this.hurt(6 * dt, 'fire');
    // Brain: go to a goal or stay near you; shoot what shoots you.
    if (g.tick % 6 === 0) this.think(ctx);
    const mv = this.mv ?? (this.mv = new Vector3());
    mv.set(0, 0, 0);
    let tx = null, tz = null;
    if (this.goal) { tx = this.goal.x; tz = this.goal.z; if (Math.hypot(tx - this.x, tz - this.z) < 2) { const done = this.goal.done; this.goal = null; done?.(); } }
    else if (this.following && g.hasPlayer && !g.player.seat) {
      const f = g.player.feet, d = Math.hypot(f.x - this.x, f.z - this.z);
      if (d > 7) { tx = f.x; tz = f.z; }
    }
    if (tx != null) {
      const dx = tx - this.x, dz = tz - this.z, l = Math.hypot(dx, dz) || 1;
      mv.set(dx / l, 0, dz / l);
      this.cc.speed = l > 25 ? 6.4 : 5;
      if (!this.aimAt) this.yaw = Math.atan2(dx, dz);
      this.moveWanted = this.cc.speed;
    } else this.moveWanted = 0;
    this.cc.setInput(mv, false, false);
    this.cc.fixedUpdate(dt);
    const f = this.cc.feet;
    this.x = f.x; this.y = f.y; this.z = f.z;
    this.fireCool -= dt;
    if (this.burstLeft > 0 && this.fireCool <= 0 && this.aimAt) this.shoot(ctx);
  }
  hostileStep(ctx, dt) {
    const g = this.game, f = g.player.feet;
    const dx = f.x - this.x, dz = f.z - this.z, d = Math.hypot(dx, dz) || 1;
    this.yaw = Math.atan2(dx, dz);
    const mv = this.mv ?? (this.mv = new Vector3());
    if (d > 18) { mv.set(dx / d, 0, dz / d); this.cc.speed = 5; this.moveWanted = 5; }
    else { mv.set(-dz / d * (this.id === 'ines' ? 1 : -1), 0, dx / d * (this.id === 'ines' ? 1 : -1)); this.cc.speed = 2.6; this.moveWanted = 2.6; }
    this.cc.setInput(mv, false, false);
    this.cc.fixedUpdate(dt);
    const p = this.cc.feet; this.x = p.x; this.y = p.y; this.z = p.z;
    this.fireCool -= dt;
    if (this.fireCool <= 0) {
      this.fireCool = g.rng.ai.range(0.3, 0.8);
      const r = g.rng.ai, e = 0.05, oy = this.y + 1.4, dy = f.y + 1 - oy, l = Math.hypot(dx, dy, dz) || 1;
      const hit = g.damage.bullet(this.x + (dx / l) * 0.6, oy, this.z + (dz / l) * 0.6, dx / l + r.range(-e, e), dy / l + r.range(-e, e), dz / l + r.range(-e, e), 120, 8, this);
      if (hit) g.fx.tracer(this.x, oy, this.z, hit.x, hit.y, hit.z);
      g.sfx.at('gun-tractor-far', this.x, this.z, { max: 200, volume: 0.9 });
      this.view?.anim.shot('FireRecoil');
    }
  }
  think(ctx) {
    const g = this.game;
    this.aimAt = null;
    let bd = 70;
    for (const s of g.actors.soldiers) {
      if (!s.active || s.dead) continue;
      if (g.story.pass === s.faction && !s.squad?.angry) continue;
      const d = Math.hypot(s.x - this.x, s.z - this.z);
      if (d < bd && (s.state === 'alert' || d < 30)) { bd = d; this.aimAt = s; }
    }
    if (this.aimAt) {
      this.yaw = Math.atan2(this.aimAt.x - this.x, this.aimAt.z - this.z);
      this.burstPause -= 0.1;
      if (this.burstLeft <= 0 && this.burstPause <= 0) { this.burstLeft = g.rng.ai.int(2, 4); this.burstPause = g.rng.ai.range(0.8, 1.6); }
    }
  }
  shoot(ctx) {
    const g = this.game, t = this.aimAt, r = g.rng.ai;
    this.burstLeft--; this.fireCool = 0.14;
    const dx = t.x - this.x, dy = t.y + 1 - (this.y + 1.4), dz = t.z - this.z, l = Math.hypot(dx, dy, dz) || 1;
    const e = 0.05;
    const hit = g.damage.bullet(this.x + (dx / l) * 0.6, this.y + 1.4, this.z + (dz / l) * 0.6, dx / l + r.range(-e, e), dy / l + r.range(-e, e), dz / l + r.range(-e, e), 120, 16, this);
    if (hit) g.fx.tracer(this.x, this.y + 1.4, this.z, hit.x, hit.y, hit.z);
    g.sfx.at('gun-tractor-far', this.x, this.z, { max: 200, volume: 0.9 });
    this.view?.anim.shot('FireRecoil');
    if (t.dead && g.rng.ai.chance(0.3)) g.say(this.id, g.dialogue.pick(`${this.id}.fight`) ?? '', 2.4);
  }
  update(ctx, dt) {
    if (!this.active || !this.view) return;
    const o = this.view.object;
    if (this.cc) { const f = this.cc.interpolatedFeet(ctx.physics.alpha); o.position.set(f.x, f.y, f.z); }
    o.rotation.y = this.yaw;
    if (!this.isDown && !this.dead) this.view.anim.set(this.moveWanted > 0 ? 'Run' : 'Idle', this.moveWanted > 0 ? 'AimWalk' : 'AimIdle');
    if (this.moveWanted > 0) this.view.anim.speed(this.moveWanted / 6.5);
    this.view.anim.update(dt);
  }
}
