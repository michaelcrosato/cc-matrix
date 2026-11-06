// Three hired friends: they fight beside you, rescue you at 0 HP, go down wounded (Syrette or Finish It), and die for real.
import { THREE, CharacterController } from '../../pixel-engine.js';
import { PersonView } from './rig.js';
import { TUNING } from '../core/tuning.js';
import { consume } from '../core/actions.js';

const V3 = THREE.Vector3;
export const BUDDIES = {
  ines: { id: 'ines', name: 'Ines Carvalho', rescueRange: 400, rescueHp: 40, offers: 'm3' },
  dov: { id: 'dov', name: 'Dov Halpern', rescueRange: 150, rescueHp: 40, offers: 'm4' },
  mags: { id: 'mags', name: 'Mags Oyelaran', rescueRange: 150, rescueHp: 60, offers: 'm5' },
};
export class Buddy {
  constructor(sys, id) {
    const g = sys.g; this.sys = sys; this.g = g; this.id = id; this.def = BUDDIES[id]; this.kind = 'buddy'; this.alive = true; this.hp = this.maxHp = 200; this.state = 'fight'; this.downT = 0; this.burning = false; this.fighting = true;
    const f = g.player.feet; const x = f.x + 2, z = f.z + 2, y = g.world.heightAt(x, z);
    this.ctrl = new CharacterController(g.ctx.physics, { position: [x, y + 0.4, z], radius: 0.35, halfHeight: 0.55, speed: 5, gravity: -24 });
    g.ctx.physics.tag(this.ctrl.collider, 'npc'); this.collider = this.ctrl.collider; this.pos = this.ctrl.feet; this.yaw = 0; this.move = new V3(); this.shotT = 0; this.crouched = false; this.speedNow = 0;
    this.view = new PersonView(id, g.ctx); g.ctx.scene.add(this.view.object); this.view.layered('Idle', 'AimIdle'); g.register(this);
    this.tgt = null; this.aliveBurn = 0;
  }
  get pos() { return this.ctrl ? this.ctrl.feet : this._pos; }
  set pos(v) { this._pos = v; }
  takeHit(d) { this.g.damageActor(this, d, 'torso', { by: 'enemy' }); }
  hear() {}
  onHit(d) { this.view.fade('upper', 'AimIdle:upper'); }
  ignite() { if (!this.burning && this.alive) { this.burning = true; this.burnT = 12; } }
  onDeath() {
    this.hp = 0; this.state = 'down'; this.downT = 40; this.alive = true; this.fighting = false; this.view.full('WoundedSit', true); this.g.say('I\'M HIT. I\'M HIT.', this.id, 2.5); this.g.events.emit('buddydown', this);
    this.g.combat.byCollider.delete(this.collider.handle); this.g.combat.actors = this.g.combat.actors.filter((a) => a !== this);
  }
  kill() { this.state = 'dead'; this.sys.remove(this, true); }
  tick(dt) {
    const g = this.g; if (this.state === 'dead') return;
    if (this.state === 'down') {
      this.downT -= dt; this.move.set(0, 0, 0); this.ctrl.setInput(this.move, false, false); this.ctrl.fixedUpdate(dt);
      if (this.burning) { this.burnT -= dt; if (this.downT > 0 && this.burnT <= 0) this.downT = 0; }
      if (this.downT <= 0) this.sys.die(this, 'bled');
      return;
    }
    if (this.burning) { this.burnT -= dt; this.hp -= 12 * dt; if (this.hp <= 0 || this.burnT <= 0) { this.hp = 0; if (this.alive) { this.alive = false; g.combat.actors = g.combat.actors.filter((a) => a !== this); this.onDeath(); } return; } }
    const f = g.player.feet; const dx = f.x - this.pos.x, dz = f.z - this.pos.z, d = Math.hypot(dx, dz) || 1;
    // nearest hostile with a clear line
    let tgt = null, bd = 60; for (const s of g.soldierSys.list) { if (!s.alive) continue; const dd = Math.hypot(s.pos.x - this.pos.x, s.pos.z - this.pos.z); if (dd < bd && s.state !== 'idle') { bd = dd; tgt = s; } }
    this.tgt = tgt;
    if (d > 7) { this.move.set(dx / d, 0, dz / d); this.ctrl.speed = d > 18 ? 6.4 : 4.6; } else if (d < 3) { this.move.set(-dx / d, 0, -dz / d); this.ctrl.speed = 2; } else this.move.set(0, 0, 0);
    if (g.fire?.burningAt(this.pos.x, this.pos.z)) this.ignite();
    if (tgt) { const tx = tgt.pos.x - this.pos.x, tz = tgt.pos.z - this.pos.z; this.yaw = Math.atan2(-tx, -tz); this.shotT -= dt; if (this.shotT <= 0 && bd < 55) { this.shotT = 0.22; const o = new V3(this.pos.x, this.pos.y + 1.5, this.pos.z), to = new V3(tgt.pos.x, tgt.pos.y + 1.2, tgt.pos.z); const dir = to.clone().sub(o).normalize(); const hit = g.ctx.physics.castRay(o, dir, bd + 1, [], this.ctrl.body); g.sfx('shot_tractor', { pos: this.pos }); g.noise(this.pos, 100, 'buddy'); if ((!hit || hit.collider === tgt.collider) && g.ctx.random.chance(0.45)) g.damageActor(tgt, 9, 'torso', { by: 'buddy', from: this.pos }); } }
    else if (this.move.lengthSq() > 0) this.yaw = Math.atan2(-this.move.x, -this.move.z);
    this.ctrl.setInput(this.move, false, false); this.ctrl.fixedUpdate(dt); this.speedNow = Math.hypot(this.ctrl.velocity.x, this.ctrl.velocity.z);
  }
  frame(dt) {
    const v = this.view; if (this.state === 'dead') return;
    const f = this.ctrl.interpolatedFeet(this.g.ctx.physics.alpha); v.object.position.copy(f); v.object.rotation.y = this.yaw + Math.PI;
    if (this.state === 'down') v.full('WoundedSit', true); else if (this.burning) v.full('BurnPanic', true); else v.layered(this.speedNow > 3.5 ? 'Run' : this.speedNow > 0.4 ? 'Walk' : 'Idle', 'AimIdle');
    v.update(dt);
  }
}
export class BuddySystem {
  name = 'buddies';
  list = []; rescuing = false;
  setup(g) { this.g = g; g.buddies = this; }
  available(id) { const st = this.g.story; return st.met[id] && !st.dead.includes(id) && this.g.gameHours() >= (st.spentUntil[id] || 0); }
  alive(id) { return !this.g.story.dead.includes(id); }
  focusBuddyId() { return this.list[0]?.id || this.best() || 'ines'; }
  best() { const st = this.g.story; return ['ines', 'dov', 'mags'].filter((i) => st.met[i] && !st.dead.includes(i)).sort((a, b) => st.trust[b] - st.trust[a])[0] || null; }
  join(id) { if (this.list.find((b) => b.id === id)) return; if (!this.alive(id)) return; this.list.push(new Buddy(this, id)); }
  reset() { for (const b of this.list.slice()) this.remove(b); }
  rest() {}
  remove(b, silent) { b.view.dispose(); this.g.unregister(b); try { b.ctrl.body.setEnabled(false); } catch { /* gone */ } this.list = this.list.filter((x) => x !== b); }
  dismissAll() { this.reset(); }
  die(b, why) {
    const g = this.g, st = g.story; if (!st.dead.includes(b.id)) { st.dead.push(b.id); st.ledger.friendsLost++; }
    g.say(`${b.def.name.toUpperCase()} IS GONE.`, 'player', 3); g.events.emit('buddydeath', b.id, why); this.remove(b);
  }
  tryRescue() {
    const g = this.g; if (this.rescuing) return true;
    const f = g.player.feet; let pick = null;
    for (const id of ['ines', 'mags', 'dov']) { if (!this.available(id)) continue; pick = id; if (id === 'ines') break; }
    if (!pick) return false;
    this.rescuing = true; g.mode = 'scene'; g.cutscene = true; const def = BUDDIES[pick];
    g.say(pick === 'mags' ? 'HOLD STILL.' : 'GET UP.', pick, 2); g.dialogue.play(`buddy.rescue.${pick}`, {});
    const back = new V3(0, 0, 1).applyAxisAngle(new V3(0, 1, 0), g.ctx.camera.yaw);
    this.rescue = { t: 0, px: f.x, pz: f.z, back, pick, def };
    g.hudHidden = true;
    return true;
  }
  extra(g) {
    const out = []; for (const b of this.list) if (b.state === 'down') {
      const d = Math.hypot(b.pos.x - g.player.feet.x, b.pos.z - g.player.feet.z); if (d > 3.5) continue;
      const have = g.weapons.syrettes > 0;
      out.push({ it: b, x: b.pos.x, z: b.pos.z, y: b.pos.y + 1, r: 3, verb: have ? 'SYRETTE' : 'NO SYRETTES', def: {}, run: () => { if (have) this.revive(b); }, second: { verb: 'FINISH IT', run: () => this.finish(b) } });
    }
    return out;
  }
  revive(b) { const g = this.g; g.weapons.syrettes--; b.state = 'fight'; b.alive = true; b.hp = 100; b.fighting = true; b.burning = false; b.downT = 0; g.register(b); g.story.trust[b.id] = (g.story.trust[b.id] || 0) + 1; g.sfx('syrette'); g.say('UP. I OWE YOU.', b.id, 2); g.events.emit('buddyrevived', b); }
  finish(b) { const g = this.g; g.sfx('shot_m38'); g.events.emit('buddyfinished', b); g.say('I AM SORRY.', 'player', 2); this.die(b, 'finished'); }
  fixed(g, dt) { for (const b of this.list.slice()) b.tick(dt); }
  frame(g, dt) {
    for (const b of this.list) b.frame(dt);
    const r = this.rescue; if (!r) return;
    r.t += dt; const k = Math.min(1, r.t / 3.6); const x = r.px + r.back.x * k * 14, z = r.pz + r.back.z * k * 14;
    g.camState.override = { position: [x, g.world.heightAt(x, z) + 0.35, z], target: [x - r.back.x * 6, g.world.heightAt(x, z) + 7, z - r.back.z * 6] };
    if (r.t >= 3.8) {
      this.rescue = null; g.hudHidden = false; g.camState.override = null; g.cutscene = false; g.mode = 'play'; g.dialogue.skipAll();
      const px = r.px + r.back.x * 16, pz = r.pz + r.back.z * 16; g.player.teleport(px, pz); g.body.hp = r.def.rescueHp; g.body.sinceHurt = 0; g.body.burning = false;
      const st = g.story; st.spentUntil[r.pick] = g.gameHours() + 24;
      if (g.ctx.random.chance(TUNING.buddyWoundChance)) { st.spentUntil[r.pick] = g.gameHours() + 48; st.wounded[r.pick] = true; g.ctx.tweens.call(3, () => g.say('A SCRATCH. I WILL REMIND YOU OF IT.', r.pick, 3)); }
      g.sfx('thud'); this.rescuing = false; g.events.emit('rescued', r.pick);
    }
  }
  state() { return { buddies: this.list.map((b) => ({ id: b.id, hp: Math.round(b.hp), st: b.state })) }; }
}
