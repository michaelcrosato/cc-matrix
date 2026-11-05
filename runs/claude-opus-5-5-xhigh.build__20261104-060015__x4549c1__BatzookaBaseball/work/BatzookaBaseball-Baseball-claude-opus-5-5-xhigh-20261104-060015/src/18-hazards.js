/* =============================================================================
 * 18-hazards: each park's hazard or feature, a plug-in { init, update, preBall,
 * onBall, onHomer, draw, drawM7 }. Always telegraphed (a sound, a stamp, smoke)
 * and introduced by a radio line the first time. Rates x TUNE.hazardRate.
 * ========================================================================== */
BZ.HAZARDS = {};
BZ.hazards = {
  init(M) {
    const h = BZ.HAZARDS[M.park.def.hazard];
    BZ.hazard = h ? Object.create(h) : null;
    if (BZ.hazard && BZ.hazard.init) BZ.hazard.init(M);
    // homers check the park's targets
    M.unsub.push(BZ.bus.on('homer', d => { if (BZ.hazard && BZ.hazard.onHomer) BZ.hazard.onHomer(M, d); }));
  },
  /** the dev trigger: the hazard now */
  now(M) { if (BZ.hazard && BZ.hazard.trigger) BZ.hazard.trigger(M); }
};
const pathOfCarry = (M) => { const b = M.ball, P = M.park, g = BZ.gravity(P), o = Object.assign({}, b), pts = []; for (let i = 0; i < 600; i++) { const dt = 1 / 120; o.vz -= g * dt; o.vx -= o.vx * TUNE.drag * dt; o.vy -= o.vy * TUNE.drag * dt; if (o.boost > 0) { const s = Math.hypot(o.vx, o.vy, o.vz) || 1; o.vx += o.vx / s * 900 * dt; o.vy += o.vy / s * 900 * dt; o.vz += o.vz / s * 900 * dt; o.boost -= dt; } o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt; if (i % 3 === 0) pts.push([o.x, o.y, o.z]); if (o.z < 0) break; } return pts; };

/* Kernel Field: the Silo Shot */
BZ.HAZARDS.silo = {
  init(M) { this.silo = M.park.props.find(p => p.silo); this.popT = 0; },
  onHomer(M, d) {
    if (!this.silo) return;
    const pts = pathOfCarry(M), s = this.silo;
    if (pts.some(p => Math.hypot(p[0] - s.x, p[1] - s.y) < 40 && p[2] < 175)) {
      this.popT = 3;
      BZ.bus.emit('hazard', { kind: 'silo', stamp: 'SILO SHOT!' }); BZ.bus.emit('target', { kind: 'silo', fb: 300 });
      M.bonusFB = (M.bonusFB || 0) + 300; BZ.sfx('popcorn'); BZ.sfx('explode');
    }
  },
  trigger(M) { this.popT = 3; BZ.sfx('popcorn'); BZ.bus.emit('hazard', { kind: 'silo', stamp: 'SILO SHOT!' }); },
  update(M, dt) {
    if (this.popT > 0) { this.popT -= dt; if (BZ.cosmetic && this.silo) for (let i = 0; i < 3; i++) BZ.game.particles.add({ kind: 'bit', x: this.silo.x + BZ.Fr(-30, 30), y: this.silo.y + BZ.Fr(-30, 30), z: 150 + BZ.Fr(0, 40), vx: BZ.Fr(-90, 90), vy: BZ.Fr(-90, 90), vz: BZ.Fr(40, 200), life: 1.6, color: BZ.F() < .5 ? '#fff6d0' : '#f4d070' }); }
  }
};
/* Barnacle Bay: Gull Patrol and the Splash Zone */
BZ.HAZARDS.gulls = {
  init(M) {
    const H = M.park.H; this.gulls = [0, 1, 2].map(i => ({ a: i * 2.1, r: 260 + i * 90, cx: H.x + (i - 1) * 140, cy: H.y - 620 - i * 60, z: 220 + i * 25, x: 0, y: 0, blob: BZ.cosmetic ? BZ.makeBlob({ R: 4, wings: true, colors: { dk: '#a8b0b8', base: '#f4f6f8', lt: '#ffffff', spec: '#ffffff', eye: '#1a1a1a', pupil: '#000' } }) : null }));
    this.carry = null; this.tried = new Set(); this.cawT = 3;
  },
  update(M, dt) {
    for (const g of this.gulls) { g.a += dt * .45 * TUNE.hazardRate; g.x = g.cx + Math.cos(g.a) * g.r; g.y = g.cy + Math.sin(g.a) * g.r * .6; if (g.blob) g.blob.update(dt, { flap: 1 }); }
    this.cawT -= dt; if (this.cawT <= 0) { this.cawT = 5 + BZ.F() * 6; BZ.sfx('gull', { vol: .5 }); }
  },
  /** a gull carrying the ball: it flies 60-140 U, then lets go from z 150 */
  preBall(M, b, dt) {
    const c = this.carry; if (!c) return false;
    c.t += dt; const k = Math.min(1, c.t / c.dur);
    b.x = c.x0 + (c.x1 - c.x0) * k; b.y = c.y0 + (c.y1 - c.y0) * k; b.z = lerp(c.z0, 150, k); b.vx = (c.x1 - c.x0) / c.dur; b.vy = (c.y1 - c.y0) / c.dur; b.vz = 0;
    c.g.x = b.x; c.g.y = b.y; c.g.z = b.z + 4;
    if (k >= 1) { this.carry = null; b.vx *= .3; b.vy *= .3; b.version++; BZ.sfx('gull'); }
    return true;
  },
  onBall(M, b, dt) {
    if (b.mode !== 'batted' || b.bounced || b.touched || this.carry || b.z < 180) return;
    for (const g of this.gulls) {
      const key = b.version + ':' + this.gulls.indexOf(g);
      if (this.tried.has(key) || Math.hypot(b.x - g.x, b.y - g.y, b.z - g.z) > 60) continue;
      this.tried.add(key);
      if (BZ.R() < .25 * TUNE.hazardRate) {
        const a = BZ.R() * TAU, d = 60 + BZ.R() * 80;
        this.carry = { g, t: 0, dur: 1.1, x0: b.x, y0: b.y, z0: b.z, x1: b.x + Math.cos(a) * d, y1: b.y + Math.sin(a) * d };
        BZ.bus.emit('hazard', { kind: 'gulls', stamp: 'GULL SNATCH!' }); BZ.sfx('gull');
        return;
      }
    }
  },
  onHomer(M, d) { const th = BZ.theta(d.x - M.park.H.x, d.y - M.park.H.y); if (th > .25) { BZ.sfx('splash'); BZ.sfx('horn'); BZ.hud.toast('SPLASH! INTO THE BAY!'); } },
  trigger(M) { const b = M.ball; if (b.mode === 'batted') { const g = this.gulls[0]; g.x = b.x; g.y = b.y; g.z = b.z; } BZ.sfx('gull'); BZ.bus.emit('hazard', { kind: 'gulls', stamp: 'GULL PATROL!' }); },
  draw(r, M) { for (const g of this.gulls) if (g.blob) { r.shadow(g.x, g.y, 4, .2); r.actor(g.x, g.y, BZ.displayZ(g.z || 220), (gg, ox, oy) => g.blob.draw(gg, ox, oy, r.view)); } },
  drawM7(m7, M) { for (const g of this.gulls) m7.add(g.x, g.y, g.z || 220, (gg, sx, sy, k) => { const s = Math.max(1, 5 * k), f = Math.sin(BZ.game.time * 14) * s * .6; px.line(gg, sx - s, sy - f, sx, sy, '#ffffff'); px.line(gg, sx, sy, sx + s, sy - f, '#ffffff'); }); }
};
/* Caldera Field: the Lava Vents */
BZ.HAZARDS.vents = {
  init(M) { this.vents = M.park.props.filter(p => p.vent).map(p => ({ x: p.x, y: p.y })); this.t = 18; this.state = 'idle'; this.st = 0; },
  update(M, dt) {
    this.t -= dt * TUNE.hazardRate;
    if (this.state === 'idle' && this.t <= 3) { this.state = 'rumble'; BZ.sfx('lava'); BZ.hud.toast('THE GROUND IS RUMBLING...'); }
    if (this.state === 'rumble' && this.t <= 0) { this.state = 'erupt'; this.st = 2.2; BZ.sfx('erupt'); BZ.game.shake(3); BZ.bus.emit('hazard', { kind: 'vents', stamp: 'ERUPTION!' }); }
    if (this.state === 'erupt') { this.st -= dt; if (this.st <= 0) { this.state = 'idle'; this.t = 25; } }
    if (BZ.cosmetic) for (const v of this.vents) {
      if (this.state !== 'idle' && BZ.F() < .5) BZ.game.particles.smoke(v.x + BZ.Fr(-10, 10), v.y + BZ.Fr(-10, 10), 16, 1, { size: 1.4, color: '#5a4a4a' });
      if (this.state === 'erupt' && BZ.F() < .7) BZ.game.particles.add({ kind: 'fire', x: v.x + BZ.Fr(-8, 8), y: v.y + BZ.Fr(-8, 8), z: 16, vz: BZ.Fr(100, 260), vx: BZ.Fr(-30, 30), vy: BZ.Fr(-30, 30), life: 1 });
    }
    // a human fielder caught on an erupting vent gets knocked back
    if (this.state === 'erupt' && M.phase === 'inPlay') for (const f of M.fielders) for (const v of this.vents) { const d = Math.hypot(f.x - v.x, f.y - v.y); if (d < 30 && d > .1) { f.x += (f.x - v.x) / d * 120 * dt; f.y += (f.y - v.y) / d * 120 * dt; } }
  },
  onBall(M, b) {
    if (this.state !== 'erupt' || b.mode === 'held') return;
    for (const v of this.vents) if (Math.hypot(b.x - v.x, b.y - v.y) < 30 && b.z < 40 && !b.vented) { b.vented = true; b.vz = 600; b.vx += (BZ.R() - .5) * 240; b.vy += (BZ.R() - .5) * 240; b.z = Math.max(b.z, 10); b.version++; BZ.sfx('erupt'); BZ.bus.emit('hazard', { kind: 'vents', stamp: 'LAUNCHED!' }); }
  },
  trigger(M) { this.state = 'rumble'; this.t = 1.2; BZ.sfx('lava'); },
  drawM7(m7) { if (this.state === 'erupt') for (const v of this.vents) m7.add(v.x, v.y, 0, (g, sx, sy, k) => px.blend(g, .8, 'add', () => { for (let i = 0; i < 4; i++) px.disc(g, sx + (BZ.F() - .5) * 8 * k, sy - (10 + i * 14) * k, (6 - i) * k + 1, i < 2 ? '#ffd040' : '#ff5a1a'); })); }
};
/* Tranquility Dome: Meteor Showers (low gravity lives in the park def) */
BZ.HAZARDS.meteors = {
  init(M) { this.t = 30; this.craters = []; this.streaks = []; this.half = M.inning + M.half; },
  update(M, dt) {
    if (this.half !== M.inning + M.half) { this.half = M.inning + M.half; this.craters = []; }
    this.t -= dt * TUNE.hazardRate;
    if (this.t <= 1.5 && !this.warned) { this.warned = true; BZ.hud.toast('METEOR SHOWER INCOMING!'); BZ.sfx('meteor'); }
    if (this.t <= 0) { this.t = 40; this.warned = false; this.shower(M); }
    for (const s of this.streaks) s.t += dt; this.streaks = this.streaks.filter(s => s.t < .9);
  },
  shower(M) {
    const P = M.park, H = P.H, R = BZ.rng.play;
    for (let i = 0; i < 3; i++) {
      const th = (R() - .5) * 1.3, r = 520 + R() * (P.R(th) - 600), x = H.x + Math.sin(th) * r, y = H.y - Math.cos(th) * r;
      this.craters.push({ x, y, r: 22 }); this.streaks.push({ x, y, t: 0 });
      if (BZ.cosmetic) BZ.wait(.7 + i * .2, () => { BZ.game.particles.explosion(x, y, 0, .8, { shake: 2 }); });
    }
    BZ.sfx('meteor'); BZ.bus.emit('hazard', { kind: 'meteors', stamp: 'METEOR SHOWER!' });
  },
  onBall(M, b) {
    if (!b.rolling || b.mode === 'held') return;
    for (const c of this.craters) if (Math.hypot(b.x - c.x, b.y - c.y) < c.r && b.craterV !== b.version) { b.craterV = b.version; const a = (BZ.R() < .5 ? -1 : 1) * .7, ca = Math.cos(a), sa = Math.sin(a), vx = b.vx; b.vx = vx * ca - b.vy * sa; b.vy = vx * sa + b.vy * ca; b.version++; b.craterV = b.version; }
  },
  trigger(M) { this.t = .01; },
  draw(r) { for (const c of this.craters) r.decal(g => { r.groundRing(c.x, c.y, c.r, '#5a5a64'); r.groundRing(c.x, c.y, c.r * .7, '#3a3a44'); }); for (const s of this.streaks) r.queue(s.x, s.y, 0, g => { const k = s.t / .7, a = r.w(s.x - 300 * (1 - k), s.y - 200 * (1 - k), 600 * (1 - k)), b2 = r.w(s.x - 280 * (1 - k) + 20, s.y - 190 * (1 - k), 560 * (1 - k)); if (k < 1) px.line(g, a[0], a[1], b2[0], b2[1], '#ffd8a0', 2); }, { emissive: true }); },
  drawM7(m7) { for (const c of this.craters) m7.add(c.x, c.y, 0, (g, sx, sy, k) => px.ell(g, sx, sy, c.r * k, c.r * k * .25, '#4a4a54')); }
};
/* Boneyard Ballpark: Phantom Fog (fly balls vanish above 120 U); the Haunts' Ghost Gloves live in the climb */
BZ.HAZARDS.phantom = {
  init(M) { this.said = false; },
  onBall(M, b) {
    const inv = b.mode === 'batted' && !b.bounced && b.z > 120;
    if (inv && !b.invisible && !this.said) { this.said = true; BZ.bus.emit('hazard', { kind: 'phantom', stamp: 'PHANTOM FOG!' }); BZ.sfx('ghost'); }
    else if (inv && !b.invisible && BZ.F() < .3) BZ.sfx('ghost', { vol: .5 });
    b.invisible = inv;
  },
  trigger(M) { BZ.bus.emit('hazard', { kind: 'phantom', stamp: 'PHANTOM FOG!' }); BZ.sfx('ghost'); },
  update(M, dt) { if (BZ.cosmetic && BZ.F() < .1) { const H = M.park.H; BZ.game.particles.smoke(H.x + BZ.Fr(-500, 500), H.y - BZ.Fr(300, 900), 60, 1, { size: 2, color: '#8a9aa8' }); } }
};
/* MegaMax MegaDome: Defense Drones and the MEGA-TRON */
BZ.HAZARDS.drones = {
  init(M) {
    const H = M.park.H;
    this.drones = [0, 1, 2].map(i => ({ alive: true, path: new E.Path([[H.x - 380 + i * 60, H.y - 600 - i * 90, 160 + i * 40], [H.x + 360 - i * 60, H.y - 640 - i * 70, 200], [H.x + 200, H.y - 900 + i * 40, 240 - i * 30], [H.x - 260, H.y - 860, 180]], { closed: true, smooth: 'catmull' }), d: i * 400, x: 0, y: 0, z: 0, boom: 0 }));
    this.hum = 2;
  },
  update(M, dt) {
    for (const d of this.drones) { if (!d.alive) { d.boom = Math.max(0, d.boom - dt); continue; } d.d += dt * 140 * TUNE.hazardRate; const p = d.path.at(d.d); d.x = p.x; d.y = p.y; d.z = p.z; }
    this.hum -= dt; if (this.hum <= 0) { this.hum = 3; BZ.sfx('drone', { vol: .4 }); }
  },
  onBall(M, b) {
    if (b.mode !== 'batted' || b.bounced) return;
    for (const d of this.drones) {
      if (!d.alive || Math.hypot(b.x - d.x, b.y - d.y, b.z - d.z) > 16) continue;
      if (b.boost > 0 || (M.lastBatted && M.lastBatted.zooka)) { d.alive = false; d.boom = 1; if (BZ.cosmetic) BZ.game.particles.explosion(d.x, d.y, d.z, 1.2, { shake: 3 }); BZ.bus.emit('target', { kind: 'drone', fb: 150 }); M.bonusFB = (M.bonusFB || 0) + 150; BZ.talk.say('drone_down', {}, 3); BZ.hud.stamp('DRONE DOWN!', { prio: 3 }); if (M.derby) M.derby.bonus(150, 'DRONE'); }
      else { b.vx *= -.4; b.vy *= -.5; b.vz = Math.abs(b.vz) * .3; b.version++; BZ.sfx('clang'); BZ.bus.emit('hazard', { kind: 'drones', stamp: 'DEFLECTED!' }); }
    }
  },
  onHomer(M) {
    const mt = M.park.props.find(p => p.megatron); if (!mt) return;
    const pts = pathOfCarry(M);
    if (pts.some(p => Math.abs(p[0] - mt.x) < 92 && Math.abs(p[1] - mt.y) < 16 && p[2] > 90 && p[2] < 192)) {
      BZ.bus.emit('target', { kind: 'megatron', fb: 300 }); M.bonusFB = (M.bonusFB || 0) + 300; BZ.talk.say('megatron', {}, 3); BZ.hud.stamp('MEGA-TRON HIT!', { prio: 3 });
      if (BZ.cosmetic) for (let i = 0; i < 4; i++) BZ.wait(i * .2, () => BZ.game.particles.sparks(mt.x + BZ.Fr(-80, 80), mt.y, 140 + BZ.Fr(-40, 40), 30, Math.PI / 2));
      if (M.derby) M.derby.bonus(300, 'MEGA-TRON');
      M.megatronHit = true;
    }
  },
  trigger(M) { for (const d of this.drones) if (!d.alive) { d.alive = true; } BZ.bus.emit('hazard', { kind: 'drones', stamp: 'DRONES DEPLOYED!' }); },
  draw(r) { for (const d of this.drones) if (d.alive) { r.shadow(d.x, d.y, 6, .2); r.shape('bz_drone', d.x, d.y, BZ.displayZ(d.z), { facing: BZ.game.time * 2 }); r.game.lights.enabled && r.game.lights.add(d.x, d.y, d.z, 50, .5, { color: '#e01e3c' }); } },
  drawM7(m7) { for (const d of this.drones) if (d.alive) m7.shape('bz_drone', d.x, d.y, d.z, { facing: BZ.game.time * 2 }); }
};
