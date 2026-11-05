// 10-attract: the bot that plays Field for the attract reel (it may cheat: no heat, free film)
Field.botThink = function (dt) {
  const D = this.dana, C = D.ctl, m = this.m, sim = this.sim, S = this.botS || (this.botS = { stage: 0, t: 0 }); S.t += dt; C.held.watch = false; C.held.interact = false;
  const walk = (tx, ty, stop) => { const dx = tx - D.x, dy = ty - D.y, d = Math.hypot(dx, dy); if (d < stop) { C.ground = [0, 0]; return true; } C.ground = [dx / d, dy / d]; return false; };
  C.ground = C.ground || [0, 0];
  if (m.mode === 'surv' || m.mode === 'vs') {
    const targets = [sim.tee, sim.runner, sim.look1, sim.dealer2], t = targets[S.stage % targets.length];
    if (walk(t.x - 70, t.y + 24, 6) || S.t > 9) { C.ground = [0, 0]; C.held.watch = true; this.reticle = { x: t.x, y: t.y }; if (S.t > 3.2) { this.focus = t; t.read = 1; if (this.cooldown <= 0) { this.shoot(t); } if (S.t > 4.5) { S.stage++; S.t = 0; } } }
  } else if (m.mode === 'tee') {
    const b = sim.people.find(p => p.role === 'buyer' && p.state === 'wait'); const cop = sim.people.find(p => p.role === 'cop' && !p.flags.called && !p.gone && dist2(p, D) < 150);
    if (cop) { C.tap('partner'); C.ground = [0, 0]; } else if (b) { if (walk(b.x, b.y, 18)) C.tap('interact'); } else { const home = sim.spawnTag('tee'); walk(home.x, home.y, 4); }
  } else if (m.mode === 'raid') {
    const keys = ['stashA', 'stashB', 'stashC'].filter(k => this.search[k] !== 1), k = keys[0]; if (!k) return; const sp = this.raidSpots[k]; if (walk(sp.x, sp.y, 8)) { C.held.interact = true; }
  } else { C.ground = [0, 0]; }
};
const Attract = {
  reel: [{ mission: 'ep1', sec: 28 }, { mission: 'tee1', sec: 26 }, { mission: 'ep4', sec: 22 }, { mission: 'vs', sec: 24 }],
  idx: 0, t: 0, active: false,
  start() { this.idx = 0; this.go(); },
  go() { UI.closeAll(); const r = this.reel[this.idx % this.reel.length]; this.t = r.sec; this.active = true; game.go('field', { mission: r.mission, attract: true, seconds: r.sec }); },
  tick(dt) { if (!this.active) return; this.t -= dt; if (this.t <= 0) { this.idx++; this.go(); } },
  stop() { this.active = false; }
};
