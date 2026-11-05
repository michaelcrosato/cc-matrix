// ---- chaos events, weather and the rain delay (5.10). Each event starts between balls, never mid-delivery, ends by
// itself and puts the field back. Critters are simulation objects the scene draws (the cow, peacocks, gulls, the
// chicken, rabbits, dust devils, Fortescue with the tea tray).
Object.assign(Match.prototype, {
  critters: null,
  chaosOverStart() {
    this.critters = this.critters || [];
    const over = Math.floor(this.I.legal / 6);
    for (const id of Object.keys(this.chaosActive)) { const c = this.chaosActive[id]; if (c.until !== undefined && this.overCount() >= c.until) this.endChaos(id); }
    if (this.g.id === 'bay' || this.cfg.ground === 'bay') { if (this.chaosActive.tide) { this.tide = Math.min(.15, (this.tide || 0) + .05); emit('tide', { tide: this.tide }); } }
    // the scripted rain of chapter 4, and a Quick Match in the rain: a delay in the second innings
    if (!this.rainDone && this.i >= 1 && !this.I.so && (this.cfg.rain || this.weather === 'rain') && this.I.legal >= 6 && this.I.overs >= 2) { this.triggerChaos('rain'); return; }
    if (!this.cfg.kerfuffle || this.dev.noChaos || this.cfg.mode === 'hub' || this.cfg.mode === 'nets' || this.cfg.mode === 'showdown') return;
    if (this.cfg.mode === 'attract') return;
    if (rp() < .3 * T('chaosRate')) {
      const pool = (this.g.chaos || []).filter(id => id !== 'rain' && !this.chaosActive[id] && (id !== 'ghosts' || this.teams[this.bowlT].ghosts));
      if (pool.length) this.triggerChaos(pick(pool, rp));
    }
  },
  overCount() { return this.inn.reduce((a, I) => a + Math.floor(I.legal / 6), 0); },
  triggerChaos(id) {
    const C = CHAOS[id]; if (!C) return false;
    this.critters = this.critters || [];
    const until = this.overCount() + (C.overs || 0);
    const R = rp, side = R() < .5 ? -1 : 1;
    this.chaosActive[id] = { until, t: 0 };
    if (id === 'cow') this.critters.push({ kind: 'cow', x: side * 520, y: 40, vx: -side * 9, vy: 4, t: 0, until });
    if (id === 'peacocks') for (let k = 0; k < 2; k++) this.critters.push({ kind: 'peacock', x: (R() * 2 - 1) * 380, y: 160 + (R() * 2 - 1) * 330, vx: 0, vy: 0, t: R() * 5, until, fan: 0 });
    if (id === 'mascot') { this.critters.push({ kind: 'chicken', x: -560, y: 120, vx: 70, vy: 10, t: 0, until }); for (let k = 0; k < 2; k++) this.critters.push({ kind: 'steward', x: -620 - k * 30, y: 110 + k * 30, vx: 62, vy: 10, t: 0, until }); }
    if (id === 'rabbits') for (let k = 0; k < 8; k++) this.critters.push({ kind: 'rabbit', x: -520 + k * 6, y: 300 + R() * 40, vx: 110 + R() * 40, vy: (R() - .5) * 30, t: R(), until: this.overCount() + 1 });
    if (id === 'dustDevil') this.critters.push({ kind: 'devil', x: -300, y: 60, vx: 25, vy: 8, t: 0, until });
    if (id === 'gulls') for (let k = 0; k < 3; k++) this.critters.push({ kind: 'gull', x: (R() * 2 - 1) * 400, y: 160 + (R() * 2 - 1) * 300, z: 80 + R() * 40, t: R() * 6, until, carry: 0 });
    if (id === 'bees') { const fs = this.fielders.filter(f => f.role === 'field'); const f = pick(fs, R); if (f) { f.slow = .7; f.bees = true; this.chaosActive.bees.f = f; } }
    if (id === 'teaTray') { this.critters.push({ kind: 'fortescue', x: -560, y: 160, vx: 90, vy: 0, t: 0, until: this.overCount() + 1, tray: true }); this.holdFor = 3; }
    if (id === 'tide') this.tide = .05;
    if (id === 'fogBank') this.fogBank = 1;
    if (id === 'ghosts') this.ghostsOn = true;
    if (id === 'advert') { this.advert = 3.2; this.holdFor = 3.2; }
    if (id === 'rain') { this.rainDone = true; this.rain = { t: 0, dur: 6 }; this.holdFor = 6.5; this.weatherWas = this.weather; this.weather = 'rain'; this.env.wet = true; }
    if (id === 'fireworks') this.fireworks = 2.5;
    cover('chaos:' + id); emit('chaos', { id, name: C.name, line: C.line });
    return true;
  },
  endChaos(id) {
    const c = this.chaosActive[id]; delete this.chaosActive[id];
    if (id === 'bees' && c && c.f) { c.f.slow = 1; c.f.bees = false; }
    if (id === 'fogBank') this.fogBank = 0;
    if (id === 'ghosts') this.ghostsOn = false;
    this.critters = (this.critters || []).filter(k => !(k.kind === { cow: 'cow', peacocks: 'peacock', mascot: 'chicken' }[id]) && !(id === 'mascot' && k.kind === 'steward') && !(id === 'gulls' && k.kind === 'gull') && !(id === 'dustDevil' && k.kind === 'devil'));
    emit('chaos:end', { id });
  },
  chaosStep(dt) {
    const cs = this.critters || [];
    for (const k of cs) {
      k.t += dt;
      if (k.kind === 'cow') { k.x += k.vx * dt; k.y += k.vy * dt + Math.sin(k.t * .4) * 3 * dt; if (Math.abs(k.x) > 600) k.vx = -k.vx; }
      if (k.kind === 'peacock') { k.x += Math.cos(k.t * .3) * 10 * dt; k.y += Math.sin(k.t * .23) * 8 * dt; k.fan = Math.max(0, Math.sin(k.t * .5)); }
      if (k.kind === 'chicken' || k.kind === 'steward' || k.kind === 'rabbit' || k.kind === 'fortescue') { k.x += k.vx * dt; k.y += k.vy * dt + Math.sin(k.t * 3) * (k.kind === 'chicken' ? 30 : 6) * dt; if (k.kind === 'fortescue' && k.x > -40 && k.vx > 0 && k.t > 2) { k.vx = -90; k.tray = false; } }
      if (k.kind === 'devil') { k.x += k.vx * dt; k.y += k.vy * dt + Math.sin(k.t) * 20 * dt; if (Math.abs(k.x) > 500) k.vx = -k.vx; }
      if (k.kind === 'gull') { k.x += Math.cos(k.t * .5) * 60 * dt; k.y += Math.sin(k.t * .7) * 50 * dt; }
    }
    this.critters = cs.filter(k => !((k.kind === 'chicken' || k.kind === 'steward' || k.kind === 'rabbit') && Math.abs(k.x) > 700) && !(k.kind === 'fortescue' && k.x < -620 && k.vx < 0));
    if (this.advert > 0) this.advert -= dt;
    if (this.fireworks > 0) this.fireworks -= dt;
    if (this.rain) {
      this.rain.t += dt;
      if (this.rain.t > this.rain.dur && !this.rain.done) {
        this.rain.done = true; this.weather = this.weatherWas === 'rain' ? 'overcast' : (this.weatherWas || 'clear'); this.env.wet = true;
        const r = this.applyRain(1); this.rainResult = r; emit('rain:end', { target: r ? r.target : null, overs: this.I.overs });
        if (r) cover('kerfuffleMethod');
      }
      if (this.rain.t > this.rain.dur + 3.5) this.rain = null;
    }
  },
  // the ball meets the chaos: the cow's flank, a peacock, a dust devil, a seagull, a ghost
  chaosBall(b, prev, dt) {
    if (b.lastTouch !== 'bat' && b.phase !== 'rolling') return;
    for (const k of this.critters || []) {
      const d = hyp(b.x - k.x, b.y - k.y);
      if (k.kind === 'cow' && d < 18 && b.z < 22 && !k.hit) { k.hit = true; b.vx *= .15; b.vy *= .15; b.vz = 0; b.carried = false; emit('cow:hit', {}); cover('cowHit'); }
      if (k.kind === 'peacock' && d < 14 && b.z < 6 && !b.peacocked) { b.peacocked = true; const a = (rp() * 2 - 1) * 25 * DEG, c = Math.cos(a), s = Math.sin(a), vx = b.vx * c - b.vy * s; b.vy = b.vx * s + b.vy * c; b.vx = vx; emit('peacock', {}); }
      if (k.kind === 'devil' && d < 30 && b.z > 4 && !b.deviled) { b.deviled = true; const a = (rp() * 2 - 1) * 10 * DEG, c = Math.cos(a), s = Math.sin(a), vx = b.vx * c - b.vy * s; b.vy = b.vx * s + b.vy * c; b.vx = vx; emit('devil', {}); }
      if (k.kind === 'gull' && b.phase === 'rolling' && hyp(b.vx, b.vy) < 50 && hyp(b.x, b.y - 160) > 250 && !k.carry && !this.gulled && !this.fielders.some(f => f.hasBall || hyp(f.x - b.x, f.y - b.y) < 20)) {
        this.gulled = true; k.carry = 1; const d2 = hyp(b.x, b.y - 160) || 1; b.x += b.x / d2 * 30; b.y += (b.y - 160) / d2 * 30; k.x = b.x; k.y = b.y; this.bonusThisBall += 2; emit('gull', {}); cover('gull');
      }
    }
    if (this.ghostsOn && this.chaser && this.chaser.p.ghost && !this.ghostedBall && rp() < .3 * dt * 4) { this.ghostedBall = true; this.chaser.phantom = .5; emit('ghost', {}); cover('ghostPhase'); }
  },
  chaosAvoid(f) { for (const k of this.critters || []) if (k.kind === 'cow') { const dx = f.x - k.x, dy = f.y - k.y, d = hyp(dx, dy); if (d < 26 && d > .1) { f.x += dx / d * (26 - d) * .2; f.y += dy / d * (26 - d) * .2; } } },
  chaosBallDone(rec) {
    this.gulled = false; this.ghostedBall = false; for (const k of this.critters || []) k.hit = false;
    if (this.chaosActive.bells === undefined && this.g.chaos.includes('bells') && rec && !rec.runs && !rec.wicket && this.cfg.kerfuffle && rp() < .08 * T('chaosRate') && this.cfg.mode !== 'attract' && this.cfg.mode !== 'hub') { emit('chaos', { id: 'bells', name: CHAOS.bells.name, line: CHAOS.bells.line }); cover('chaos:bells'); }
    if (rec && rec.boundary === 6 && this.time === 'night') { this.fireworks = 2.5; cover('chaos:fireworks'); emit('fireworks', {}); }
  },
  targetPos(tg) { if (tg.moving) return [Math.sin(this.t * .12) * 280, tg.at[1], tg.at[2] + Math.sin(this.t * .3) * 10]; return tg.at; },
  fogLevel() { return (this.weather === 'fog' ? .55 : 0) + (this.fogBank ? .3 : 0) + (this.effects && this.effects.fog ? .2 : 0); }
});
