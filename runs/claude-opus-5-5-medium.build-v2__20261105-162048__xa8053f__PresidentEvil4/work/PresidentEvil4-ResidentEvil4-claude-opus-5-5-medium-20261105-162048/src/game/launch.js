// The Launch, on rails. Stern deck, free aim. The world scrolls past; the Dame drives. Then dawn.
import { PALETTE, THREE, applySky, skyAt, setLookLayer, toonMaterial } from '../../pixel-engine.js';
import { TUNING } from '../data/tuning.js';
import { SCENES } from '../data/dialogue.js';
import { Area } from './area.js';
import { Humanoid, buildProp } from './actor.js';
import { MOODS, applyMood } from './world.js';
import { FormScreen } from '../screens/form.js';
import { CreditsScreen } from '../screens/credits.js';
const SPEED = 14;
export class Launch extends Area {
  constructor(app, id, o = {}) { super(app, id, o); this.def = { map: 'deck', title: 'THE LAUNCH', mood: 'moon', music: 'boss', hint: 'general', water: true, waterY: -1.05, waterOpt: { choppy: true }, loops: ['sea'], startYaw: Math.PI, chapter: 4, noDress: true, groundMargin: -2, theme: { '=': 'deck' } }; this.scroll = []; this.lt = 0; this.table = []; this.ended = false; }
  async setup(ctx) {
    await super.setup(ctx); const P = this.player; P.noMove = true; this.infiniteAmmo = true; this.run.health = Math.max(this.run.health, this.run.maxHealth * 0.7); const hull = buildProp('launch-hull'); hull.object.position.set(0, -1.03, 0); hull.object.scale.set(1.8, 1, 1.3); ctx.scene.add(hull.object); ctx.lights.request({ position: [0, 2.4, -2.5], color: 0xffc070, intensity: 7, radius: 9 }); for (const x of [-2.4, 2.4]) { const l = buildProp('lamp-post', { shadow: false }); l.object.position.set(x, 0, -3.3); ctx.scene.add(l.object); } this.hull = hull.object; this.interact.items.length = 0;
    this.dameM = new Humanoid(ctx, 'dame', { scale: 0.82 }); this.dameM.root.position.set(0, 0.05, 2.9); this.dameM.root.rotation.y = 0; this.dameM.play('DameHoist'); ctx.lights.request({ position: [0, 2.6, 2.5], color: 0xffd080, intensity: 6, radius: 9 });
    P.teleport(0, -2.2, 0, Math.PI); this.camYaw = Math.PI; this.fillLight = 1;
    for (let i = 0; i < 16; i++) this.spawnStack(-70 + i * 16, this.rng.chance(0.5) ? 1 : -1);
    const T = this.table; const t = (at, fn) => T.push({ at, fn }); for (const at of [6, 26, 46, 66]) t(at, () => this.spawnBoat()); for (const at of [11, 17, 22, 32, 40, 51, 58, 70]) t(at, () => this.spawnMine()); for (const at of [28, 55, 76]) t(at, () => this.spawnRock()); for (const at of [20, 44, 62]) t(at, () => this.spawnLimpets()); t(70, () => this.startDawn()); t(84, () => this.arch()); T.sort((a, b) => a.at - b.at);
    if (this.o.jump === 'ending') { this.lt = 200; this.table.length = 0; this.startDawn(1); this.ctx.tweens.call(0.2, () => this.ending()); }
    this.app.mix.play('boss'); this.setObjective('KEEP THEM OFF THE LAUNCH.'); this.bumpT = 0;
    this.say('DAME', 'I am driving. Do not distract me.', 2);
  }
  los() { return true; }
  spawnStack(z, side) { const id = this.rng.chance(0.75) ? 'sea-stack' : 'backdrop-cliff'; const b = buildProp(id, { shadow: false }); b.object.position.set(side * this.rng.range(16, 44), -2, z); b.object.rotation.y = this.rng.range(0, 6); this.ctx.scene.add(b.object); this.scroll.push({ o: b.object, loop: true, side }); }
  spawnBoat() {
    const side = this.rng.chance(0.5) ? 1 : -1; const r = buildProp('rowboat'); this.ctx.scene.add(r.object); const e = this.spawnEnemy('harpooner', side * 9, -44, { state: 'BOAT' }); e.boat = r.object; e.cool = 3; e.tz = this.rng.range(-20, -14); e.s_BOAT = function (dt) { const a = this.area; this.pos.z += (this.tz - this.pos.z) * Math.min(1, dt * 0.6); this.pos.x = side * (7 + Math.sin(a.time * 0.7 + this.id) * 3); this.pos.y = -0.6 + Math.sin(a.time * 2 + this.id) * 0.1; this.boat.position.set(this.pos.x, -1, this.pos.z); this.boat.rotation.y = Math.sin(a.time * 2) * 0.1; const P = a.player; this.face(P.pos, 0.2); if (this.cool <= 0 && !this.wind) { this.wind = 1.4; a.ctx.lights.request({ position: this.pos.clone().setY(1), color: 0xff3020, intensity: 10, radius: 4, lifetime: 1.2 }); a.ctx.audio.play('armorping', { volume: 0.4 }); } if (this.wind > 0) { this.wind -= dt; if (this.wind <= 0) { this.wind = 0; this.cool = 8; if (a.rng.chance(0.6)) a.spawnThrow(this, { pos: P.pos.clone().add(new THREE.Vector3(a.rng.range(-1.6, 1.6), 0, a.rng.range(-1.6, 1.6))) }); else a.spawnThrow(this, P); } } }; const die0 = e.die.bind(e); e.die = (info, head) => { die0(info, head); this.ctx.tweens.to(r.object.position, { y: -3 }, { duration: 2 }); this.ctx.tweens.call(2, () => this.ctx.scene.remove(r.object)); };
  }
  spawnMine() { const x = this.rng.range(-5, 5); const p = this.addProjectile({ kind: 'mine', model: 'mine', pos: new THREE.Vector3(x, -1, -46), vel: new THREE.Vector3(-x / 8, 0, 6), g: 0, life: 8, r: 0.9, stops: true, counts: true, onLand: (m) => { this.fx.blast(m.pos, 3); this.ctx.audio.play('depthcharge'); this.ctx.engine.shake.add(0.8); if (m.pos.z > -7) this.player.hurt(25, m.pos, { knock: true }); this.say('MAX', 'Excess applies.', 1); } }); p.obj.rotation.set(0, 0, 0); p.spinless = true; }
  spawnRock() { const x = this.rng.range(-2, 2), z = -2; const from = new THREE.Vector3(x + this.rng.range(-3, 3), 22, z - 6); const p = this.addProjectile({ kind: 'rock', model: 'boulders', pos: from, vel: new THREE.Vector3((x - from.x) / 2.6, -7, 2.3), g: 0, life: 2.6, r: 1.5, stops: true, onLand: () => { this.ctx.audio.play('palletdrop'); this.ctx.engine.shake.add(0.8); this.qte.start({ owner: this.player, type: 'press', button: 'dodge', label: 'DODGE', time: TUNING.qteWindow * 1.2, onDone: (ok) => { if (!ok) this.player.hurt(30, from, { knock: true }); } }); } }); this.ctx.audio.play('rumble', { volume: 0.5 }); this.say('DAME', 'Rock.', 1); }
  spawnLimpets() { for (let i = 0; i < 3; i++) this.spawnEnemy('limpet', -1.2 + i * 1.2, -3.8, {}); this.ctx.audio.play('skitter'); this.say('MAX', 'Stowaways.', 1); }
  startDawn(k = 0) { const m = MOODS.dawn; this.dawnT = k; this.dawnOn = true; this.ctx.engine.setSunDirection([0.3, 0.3, 1]); if (k >= 1) this.dawnApply(); }
  arch() { const b = buildProp('arch-rock', { shadow: false }); b.object.position.set(0, -2, 40); this.ctx.scene.add(b.object); this.scroll.push({ o: b.object }); this.ctx.audio.play('rumble'); this.qte.start({ owner: this.player, type: 'press', button: 'action', label: 'HOLD ON', time: 2.4, onDone: (ok) => { if (!ok) this.player.hurt(25, null, { knock: true }); this.ctx.engine.shake.add(0.9); this.ctx.audio.play('palletdrop'); this.ctx.tweens.call(2.2, () => this.ending()); } }); }
  ending() {
    if (this.ended) return; this.ended = true; for (const e of [...this.enemies]) if (!e.dead) e.die({}); this.table.length = 0; for (const p of [...this.projectiles]) this.killProjectile(p); this.app.mix.play('dawn', 0.4); this.extraHud = null; const P = this.player; P.locked = true; P.aiming = false; P.teleport(0.7, 0.1, 0, 0.1); P.h.upperName = null; P.h.play('Idle'); this.dameM.root.position.set(-0.6, 0, 0.6); this.dameM.root.rotation.y = 2.4; this.dameM.play('DameIdle');
    this.addScript([{ wait: 0.6 }, { scene: 'ending', duration: 16, shots: () => [{ at: 0, position: [3.2, 1.8, -2.4], target: [0, 1.1, 0.4], fov: 42 }, { at: 8, position: [2.4, 1.6, -1.4], target: [0.3, 1.2, 0.4], fov: 34 }, { at: 16, position: [4, 3, -6], target: [0, 1.4, 2], fov: 45 }] }, { run: () => { this.openMenu(new FormScreen(this, () => this.credits(), { title: 'FINAL CLAIM FORM' })); } }]);
  }
  credits() { this.openMenu(new CreditsScreen(this)); }
  fixedUpdate(ctx, dt) {
    super.fixedUpdate(ctx, dt); if (this.menu) return; this.lt += dt; const T = this.table; while (T.length && T[0].at <= this.lt) T.shift().fn(); const bend = Math.cos(this.lt * 0.35) * 4; this.bend = bend; for (const s of this.scroll) { s.o.position.x += bend * dt; if (s.loop && Math.abs(s.o.position.x) > 70) s.o.position.x *= -0.8; s.o.position.z -= SPEED * dt; if (s.loop && s.o.position.z < -90) { s.o.position.z += 170; } }
    this.bumpT = (this.bumpT ?? 0) + dt; for (const e of this.enemies) { if (e.crawler && !e.dead && e.pos.z > 2.4) e.pos.z = 2.4; }
    if (this.dawnOn && this.dawnT < 1) { this.dawnT = Math.min(1, this.dawnT + dt / 12); this.dawnApply(); }
    if (this.lt > 120 && !this.ended) this.ending();
  }
  dawnApply() { const e = this.ctx.engine, k = this.dawnT, m = MOODS.dawn; const h = 2 + (6.5 - 2) * k; const s = skyAt(h); applySky(e, s); e.sun.intensity = 0.45 + (m.sun - 0.45) * k; e.ambient.intensity = 0.95 + (m.ambient - 0.95) * k; this.ctx.scene.background = new THREE.Color(PALETTE.ink).lerp(new THREE.Color(PALETTE.sky), k); this.mist.color.value.setHex(0x29366f).lerp(new THREE.Color(m.fog[0]), k); this.mist.amount.value = 0.55 + (m.fog[2] - 0.55) * k; }
  update(ctx, dt) { super.update(ctx, dt); if (this.menu) return; this.dameM.update(dt); const t = this.time; this.hull.rotation.z = Math.sin(t * 1.3) * 0.03 - (this.bend ?? 0) * 0.012; this.hull.rotation.x = Math.sin(t * 0.9) * 0.02; if (!this.ended) { this.wakeT = (this.wakeT ?? 0) - dt; if (this.wakeT <= 0) { this.wakeT = 0.1; ctx.particles.burst('splash', [this.rng.range(-1.2, 1.2), -1, -4.6], { count: 3 }); } } }
}
