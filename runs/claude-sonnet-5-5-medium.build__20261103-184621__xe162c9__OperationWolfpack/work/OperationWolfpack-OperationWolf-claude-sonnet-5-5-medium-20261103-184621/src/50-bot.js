// The AI player: attract mode, autopilot for tests. It may cheat (the sim gives it infinite health and ammo) and
// only has to show the game off: shoot the air first, then whatever rings close soonest, then the nearest thing.
(() => {
const E = My3D2dge, WP = globalThis.WP, { clamp } = WP;
class Bot {
  constructor(pid = 0, o = {}) { this.pid = pid; this.x = 240; this.y = 130; this.tgt = null; this.t = 0; this.think = 0; this.speed = o.speed || 520; this.rnd = WP.mulberry(pid + 5); this.o = o; this.gren = 0; }
  pick(sim) {
    let best = null, bs = -1e9;
    const me = sim.players[this.pid];
    for (const e of sim.ents) {
      if (e.dead || e.st === 'dying') continue;
      const k = e.ty.kind; let s;
      if (k === 'proj') s = 200 + (e.a / e.T) * 100;
      else if (k === 'inf' || k === 'veh' || k === 'air') { if (e.ty.beh === 'popup' && (e.st === 'hide' || e.up < .6)) continue; s = 50 + (e.aimTot ? 80 * e.aim / e.aimTot : 0) - e.dz / 20 + (k !== 'inf' ? 5 : 0); }
      else if (k === 'boss') { if (e.st === 'enter') continue; s = 120; }
      else if (k === 'pickup') s = (me.spares < 2 || me.grenades < 1 || e.pkind === 'med' && me.dmg > 30) ? 150 : 20;
      else if (e.t === 'mast' && sim.phase === 'rail') s = 30 + (sim.hold ? 20 : 0);
      else if (e.t === 'crate' && me.spares < 2) s = 60;
      else if (k === 'animal' && e.st !== 'flee' && me.spares < 2) s = 55;
      else continue;
      const c = sim.center(e, k === 'boss' || (k === 'inf' && e.ty.head));
      if (!c || c.x < -20 || c.x > WP.W + 20 || c.y < -10 || c.y > WP.H) continue;
      if (this.blocked(sim, c)) continue;
      s -= Math.hypot(c.x - this.x, c.y - this.y) * .05;
      if (s > bs) { bs = s; best = { e, c }; }
    }
    return best;
  }
  // do not shoot through a civilian or a hostage
  blocked(sim, c) {
    for (const e of sim.ents) { if (e.dead || e.st === 'dying') continue; const k = e.ty.kind; if (k !== 'civ' && k !== 'host') continue; const hs = sim.hitShape(e); if (hs && Math.abs(c.x - hs.x) < hs.hw + 3 && Math.abs(c.y - hs.y) < hs.hh + 3) return true; }
    return false;
  }
  frame(sim, dt) {
    this.t += dt; this.think -= dt;
    if (this.think <= 0 || !this.tgt || this.tgt.e.dead || this.tgt.e.st === 'dying') { this.tgt = this.pick(sim); this.think = .12; }
    const f = { x: this.x, y: this.y, fire: false, grenade: false, reload: false, snap: false };
    const me = sim.players[this.pid];
    if (this.tgt) {
      const c = sim.center(this.tgt.e, this.tgt.e.ty.kind === 'boss' || (this.tgt.e.ty.kind === 'inf' && this.tgt.e.ty.head)) || this.tgt.c;
      const dx = c.x - this.x, dy = c.y - this.y, d = Math.hypot(dx, dy), step = Math.min(d, this.speed * dt * (d > 40 ? 1 : .6));
      if (d > .01) { this.x += dx / d * step; this.y += dy / d * step; }
      const rad = Math.max(4, (this.tgt.e.ty.w * (c.k || 1)) * .35);
      f.fire = d < Math.max(10, rad + 6);
      if (me && me.mag < 4 && me.spares > 0 && !f.fire) f.reload = true;
      // grenade at the boss's feet or a cluster
      this.gren -= dt;
      if (this.gren <= 0 && me && me.grenades > 0 && (this.tgt.e.ty.kind === 'boss' || this.cluster(sim, c) >= 3)) { f.grenade = true; this.gren = 6; }
    } else { this.x += Math.sin(this.t * .7) * 40 * dt; this.y += Math.cos(this.t * .5) * 20 * dt; }
    this.x = clamp(this.x, 4, WP.W - 4); this.y = clamp(this.y, 30, WP.H - 50);
    f.x = this.x; f.y = this.y;
    return f;
  }
  cluster(sim, c) { let n = 0; for (const e of sim.ents) { if (e.dead || e.st === 'dying' || !e.ty.q) continue; const q = sim.center(e); if (q && Math.hypot(q.x - c.x, q.y - c.y) < 45) n++; } return n; }
}
WP.Bot = Bot;
})();
