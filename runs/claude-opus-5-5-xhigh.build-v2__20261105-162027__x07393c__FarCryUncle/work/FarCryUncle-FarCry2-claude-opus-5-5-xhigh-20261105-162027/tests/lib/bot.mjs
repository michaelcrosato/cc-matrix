// A headless player: real actions through the action layer, dev.teleport between objectives.
import { Engine } from '../../pixel-engine.js';
import { createGame } from '../../src/game.js';
import { Bot } from '../../src/core/actions.js';
import { MISSIONS } from '../../src/content/missions.js';
import { SITES } from '../../src/content/sites.js';
export async function boot(opts = {}) {
  const game = createGame({ skipEpigraph: true, ...opts });
  const engine = await Engine.headless(game, { camera: { preset: 'first' }, viewport: { width: 1920, height: 1080, dpr: 1 }, seed: opts.seed ?? 1 });
  return { game, engine };
}
export class Player {
  frames = 0;
  constructor(game, engine, t) { this.g = game; this.e = engine; this.t = t; this.bot = new Bot(); this.bot.only = false; game.actions.bot = this.bot; }
  step(n = 1) { this.e.step(n, 1 / 60); this.frames += n; if (this.e.errors.length) throw new Error(`engine error: ${this.e.errors[0]}`); }
  until(pred, max, label) {
    let i = 0;
    while (!pred() && i < max) { this.step(1); i++; }
    if (!pred()) throw new Error(`timed out (${max} frames): ${label} [${this.g.status()}] step ${JSON.stringify(this.g.missions.currentStep()?.text)} ${JSON.stringify(this.g.state().screen)} sceneT ${this.g.scene.custom?.t} ts ${this.e.timeScale} hitstop ${this.e.state().hitstop} dt`);
    return i;
  }
  press(name, frames = 3) { this.bot.press(name); this.step(frames); this.bot.queue.delete(name); this.bot.taps.delete(name); }
  holdFor(name, seconds) { this.bot.hold(name); this.step(Math.round(seconds * 60)); this.bot.hold(name, false); this.step(2); }
  look(x, y, z) {
    const eye = this.g.player.eye;
    const dx = x - eye.x, dy = y - eye.y, dz = z - eye.z;
    this.g.player.setYaw(Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz)));
  }
  tp(x, z) { this.g.dev.teleport(x, z); this.step(2); }
  /** Stand beside a usable and take it. */
  useNear(x, z, ry = 1.2, { hold, alt } = {}) {
    const g = this.g;
    if (Math.hypot(g.player.feet.x - x, g.player.feet.z - z) > 1.6) this.tp(x + 1, z + 0.8);
    const y = g.world.heightAt(x, z) + ry;
    this.look(x, y, z);
    this.step(2);
    if (!g.interact.current) throw new Error(`nothing to use at ${x},${z}: ${g.status()}`);
    if (hold) this.holdFor('use', hold + 0.1); else this.press(alt ? 'alt' : 'use');
  }
  pick(id) { const ok = this.g.ui.menu.pick(id); if (!ok) throw new Error(`no item ${id} on ${this.g.state().screen}: ${JSON.stringify(this.g.state().items)}`); this.step(2); }
  waitTalk(max = 6000) { this.until(() => !this.g.dialogue.active, max, 'dialogue end'); this.step(2); }
  aimAndShootAt(s) { this.look(s.x, s.y + 1.15, s.z); }
  killSquad(key, max = 20000) {
    const g = this.g, sq = g.actors.squads.get(key);
    sq.forceLive = true;
    g.actors.updateBubble(g.ctx);
    this.killWhile(() => sq.alive > 0, max, key);
  }
  killWhile(pred, max, label) {
    const g = this.g;
    let i = 0;
    g.equipBest();
    while (pred() && i < max) {
      i++;
      const gun = g.weapons.gun;
      if (gun?.jam > 0) { this.press('reload'); this.step(40); continue; }
      if (gun && gun.mag <= 0 && gun.reserve <= 0) { gun.reserve = 60; }
      if (gun && gun.mag <= 0 && g.weapons.def.mag) { this.press('reload'); this.until(() => g.weapons.reloading <= 0, 400, 'reload'); continue; }
      const f = g.player.feet;
      let best = null, bd = 1e9;
      for (const s of g.actors.soldiers) { if (!s.active || s.dead) continue; const d = Math.hypot(s.x - f.x, s.z - f.z); if (d < bd) { bd = d; best = s; } }
      if (!best) { this.step(5); continue; }
      if (bd > 28) { this.tp(best.x + 6, best.z + 6); }
      this.look(best.x, best.y + 1.15, best.z);
      if (g.weapons.def.auto) { this.bot.hold('fire'); this.step(4); this.bot.hold('fire', false); this.step(1); }
      else { this.bot.press('fire'); this.step(14); }
      if (i % 40 === 0 && g.weapons.gun) g.weapons.gun.cond = Math.max(g.weapons.gun.cond, 40);
    }
    this.bot.queue.delete('fire'); this.bot.hold('fire', false);
    if (pred()) throw new Error(`could not finish killing: ${label} ${g.status()}`);
  }
  steerTo(v, x, z) {
    const err = Math.atan2(x - v.x, z - v.z) - v.yaw;
    const a = ((err + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    this.bot.move = { x: Math.max(-1, Math.min(1, a * 1.5)), y: 0 };
    return a;
  }
  /** Really drive: gas and steering through the action layer, down a list of points. */
  driveRoute(points, r = 8, maxPerLeg = 2400) {
    const g = this.g;
    const v = g.driving.vehicle;
    if (!v) throw new Error('not driving');
    for (const [x, z] of points) {
      let i = 0;
      while (Math.hypot(x - v.x, z - v.z) > r && i < maxPerLeg) {
        const a = this.steerTo(v, x, z);
        this.bot.analog.gas = Math.abs(a) > 0.7 ? 0.45 : 0.85;
        this.step(1); i++;
      }
      if (i >= maxPerLeg) throw new Error(`stuck driving to ${x},${z} at ${Math.round(v.x)},${Math.round(v.z)} speed ${v.car.speed.toFixed(1)} hp ${v.hp}`);
    }
    this.bot.analog.gas = 0; this.bot.move = { x: 0, y: 0 };
    this.bot.analog.brake = 1; this.step(30); this.bot.analog.brake = 0;
  }
  reportTo(who) {
    const g = this.g, n = g.npcs.byWho[who];
    this.tp(n.x + 1.5, n.z + 2);
    this.look(n.x, n.y + 1.5, n.z);
    this.step(3);
    if (!g.interact.current) throw new Error(`cannot see ${who}`);
    this.press('use');
    this.waitTalk();
  }
  /** Take the contract from the giver: talk, hear it, accept. */
  takeFrom(who) {
    const g = this.g, n = g.npcs.byWho[who];
    this.tp(n.x + 1.5, n.z + 2);
    this.look(n.x, n.y + 1.5, n.z);
    this.step(3);
    this.press('use');
    this.until(() => g.state().screen === 'choice', 6000, `offer from ${who}`);
    this.pick('accept');
  }
}
