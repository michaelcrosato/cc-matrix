// Three hired friends. They rescue you, offer better plans and die for real (section 12).
import { TUNING } from '../core/tuning.js';
import { pressedFixed } from '../core/actions.js';
import { dist2 } from '../world/geom.js';
const DEFS = { ines: { model: 'ines', rescueLine: 'rescue.ines', hp: 40, range: 500 }, dov: { model: 'dov', rescueLine: 'rescue.dov', hp: 40, range: 260 }, mags: { model: 'mags', rescueLine: 'rescue.mags', hp: 60, range: 260 }, pell: { model: 'soldier-cloth', hp: 40, range: 0 } };
export const fresh = () => ({ ines: { met: false, alive: true, trust: 1, spentUntil: -1, gun: 'tractor' }, dov: { met: false, alive: true, trust: 1, spentUntil: -1, gun: 'mule' }, mags: { met: false, alive: true, trust: 1, spentUntil: -1, gun: 'm38' } });
export class Buddies {
  state = fresh(); followers = []; down = null; finishT = 0;
  constructor(game) { this.game = game; }
  build(ctx) { this.ctx = ctx; this.rng = ctx.random.fork('buddies'); }
  reset() { this.state = fresh(); this.clear(); }
  clear() { for (const a of this.followers) this.game.actors.remove(a); this.followers.length = 0; this.down = null; }
  ready(id) { const s = this.state[id]; return s && s.met && s.alive && s.spentUntil <= this.game.world.totalHours; }
  alive() { return Object.keys(this.state).filter((k) => this.state[k].met && this.state[k].alive); }
  available() { return this.alive().filter((k) => this.ready(k)).length > 0; }
  /** The friend who comes for you. Ines drives from further away. */
  rescuer() { const g = this.game, p = g.player, home = g.nearestRecovery(), d = dist2(home[0], home[1], p.x, p.z), list = this.alive().filter((k) => this.ready(k) && (d < DEFS[k].range || this.followers.some((f) => f.buddy === k && f.alive))); if (!list.length) return null; return list.sort((a, b) => this.state[b].trust - this.state[a].trust)[0]; }
  highestTrust() { const list = this.alive(); return list.length ? list.sort((a, b) => this.state[b].trust - this.state[a].trust)[0] : null; }
  spawnFollower(id, x, z, o = {}) {
    const g = this.game, def = DEFS[id];
    const a = g.actors.spawn({ kind: 'buddy', faction: 'friend', friendly: true, buddy: id, modelId: def.model, palette: id === 'pell' ? { cloth: 'orange', dark: 'plum', hat: 'red', strap: 'sand', skin: 'plum' } : undefined, role: 'rifle', duty: o.duty ?? 'follow', x, z, hp: 200 });
    a.hp = 200; a.maxHp = 200; a.fireproof = true;
    this.followers.push(a);
    return a;
  }
  addTrust(id, n = 1) { const s = this.state[id]; if (s) s.trust += n; }
  /** A friend at zero: forty seconds and a choice. */
  onDown(a, o) {
    const g = this.game;
    this.down = { a, fire: !!o.fire };
    g.talk.say(a.buddy === 'pell' ? 'pell' : a.buddy, o.fire ? "Don't let it be the fire. Please. Not the fire." : 'Get over here. Get over here.', 5);
    g.audio.voiceAt(g.talk.voiceOf(a.buddy), 'Please. Not like this.', a, a.id);
    g.events.emit('buddyDown', a);
  }
  fixed(dt) {
    const g = this.game, p = g.player, input = this.ctx.input;
    this.finishT = Math.max(0, this.finishT - dt);
    // Followers stay close.
    for (const a of this.followers) if (a.alive && !a.down && a.duty === 'follow' && dist2(a.x, a.z, p.x, p.z) > 160) { a.ctrl?.teleport([p.x + 4, g.world.land.heightAt(p.x + 4, p.z + 4) + 0.1, p.z + 4]); }
    const d = this.down; if (!d) return;
    if (!d.a.alive) { this.lost(d.a, 'bled'); return; }
    if (d.a.hp > 0 && !d.a.down) { this.down = null; return; }
    if (p.vehicle || dist2(d.a.x, d.a.z, p.x, p.z) > 2.8) { g.prompt.setChoice(null); return; }
    g.prompt.setChoice({ use: p.syrettes > 0 ? 'SYRETTE' : null, finish: 'FINISH IT' });
    if (p.syrettes > 0 && pressedFixed(input, 'use')) { p.syrettes--; d.a.hp = 100; d.a.down = false; d.a.view?.setFull('Idle'); this.ctx.tweens.call(0.1, () => d.a.view?.stopFull()); g.audio.play('syrette'); this.addTrust(d.a.buddy, 1); this.down = null; g.prompt.setChoice(null); g.hud.touch(); g.vm.playTool('Syrette', ['tool-syrette']); g.events.emit('buddySaved', d.a); return; }
    if (pressedFixed(input, 'finish') && !this.finishT) {
      this.finishT = 3; g.prompt.setChoice(null); const a = d.a; this.down = null;
      g.vm.playTool('Finish', ['tool-revolver']); g.frozen = true;
      this.ctx.tweens.call(1.55, () => { g.audio.play('gun-revolver'); this.ctx.lights.request({ position: [a.x, a.y + 1, a.z], color: 0xffd090, intensity: 14, radius: 10, lifetime: 0.08 }); a.down = false; g.actors.kill(a, { silent: true, finished: true }); this.lost(a, 'finished'); });
      this.ctx.tweens.call(2.4, () => { g.frozen = false; });
    }
  }
  lost(a, how) {
    const g = this.game, id = a.buddy;
    this.down = null; g.prompt.setChoice(null);
    const i = this.followers.indexOf(a); if (i >= 0) this.followers.splice(i, 1);
    if (this.state[id]) { this.state[id].alive = false; (g.story.wall ??= []).push(id); }
    if (id !== 'pell') g.story.ledger.friends++;
    // Their name on the wall, their gun leaning under it.
    if (id !== 'pell' && this.state[id]) { const shed = g.world.sites['pump-shed'].def, gun = this.state[id].gun; g.spawnGunPickup(gun, 40, shed.at[0] - 1 + (g.story.wall.length - 1) * 0.5, shed.at[1] + 2.2, null); g.people.showFriends(); }
    g.talk.say('you', how === 'finished' ? 'ONE SHOT.' : 'YOU WERE TOO LATE.', 4);
    g.events.emit('buddyDead', a, how);
    g.hud.touch();
  }
  /** Dragged backward, low, while they swear at you. */
  rescue(id) {
    const g = this.game, p = g.player, def = DEFS[id], s = this.state[id];
    p.downT = 6.5; p.hp = 1; g.combat.stopStream(); if (p.vehicle) g.vehicles.exit(true);
    s.spentUntil = g.world.totalHours + 24;
    if (this.rng.next() < TUNING.buddyWoundChance) { s.spentUntil = g.world.totalHours + 48; g.story.woundNote = id; }
    this.addTrust(id, 0);
    let a = this.followers.find((f) => f.buddy === id && f.alive);
    if (!a) a = this.spawnFollower(id, p.x + 1.4, p.z - 1.2, { duty: 'guard' });
    a.invulnerable = true; a.dragging = true; a.view?.setFull('DragBackward');
    const yaw = this.ctx.camera.yaw, dirx = Math.sin(yaw), dirz = Math.cos(yaw), x0 = p.x, z0 = p.z, said = g.talk.linesOf(def.rescueLine).reduce((n, [, l]) => n + Math.max(1.8, l.length * 0.07) + 0.25, 0.6), DRAG = Math.max(6.2, said), SPEED = 1.2, land = g.world.land; // They finish swearing before you are up.
    p.downT = DRAG + 0.3;
    const place = (t) => {
      p.x = x0 + dirx * t * SPEED; p.z = z0 + dirz * t * SPEED; p.ctrl.teleport([p.x, land.heightAt(p.x, p.z) + 0.05, p.z]);
      a.x = p.x + dirx * 1.2; a.z = p.z + dirz * 1.2; a.y = land.heightAt(a.x, a.z); a.yaw = yaw; if (a.ctrl) a.ctrl.teleport([a.x, land.heightAt(p.x, p.z) + 0.05, a.z]);
    };
    // Low, on your back: the sky, their boots, the ground going away from you.
    const shots = Array.from({ length: 14 }, (_, i) => { const t = (i / 13) * DRAG, x = x0 + dirx * t * SPEED, z = z0 + dirz * t * SPEED, bx = x + dirx * 1.2, bz = z + dirz * 1.2; return { at: t, position: [x, land.heightAt(x, z) + 0.47 + (i % 2 ? 0.05 : -0.05), z], target: [bx, land.heightAt(bx, bz) + 1.1 + Math.sin(t * 2) * 0.2, bz] }; });
    g.scenes.play({ shots, lines: [def.rescueLine], duration: DRAG, bars: 0.4, linesAt: 0.3, skippable: g.mode !== 'attract', tick: (_dt, t) => place(t), onEnd: (aborted) => {
      if (!aborted) { place(DRAG); p.hp = def.hp; }
      p.downT = 0; a.invulnerable = false; a.dragging = false; a.view?.stopFull(); a.duty = 'follow'; g.frozen = false; g.body.regenT = 0; g.hud.touch();
      if (aborted) return;
      if (g.story.woundNote === id) { g.talk.say(id, 'I took one for that. Two days. You owe me.', 5); g.story.woundNote = null; }
      g.events.emit('rescued', id);
      this.ctx.tweens.call(25, () => { if (a.alive && !a.down && !g.missions.active && this.followers.includes(a)) { const k = this.followers.indexOf(a); this.followers.splice(k, 1); g.actors.remove(a); } });
    } });
    g.events.emit('rescueStart', id);
    g.story.rescues = (g.story.rescues ?? 0) + 1;
  }
}
