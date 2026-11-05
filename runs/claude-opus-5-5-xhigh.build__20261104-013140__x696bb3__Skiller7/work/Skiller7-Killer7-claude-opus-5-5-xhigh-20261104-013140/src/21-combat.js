/* COMBAT: aim mode (§7.3), weapons and shooting (§7.4), skills (§7.9), the scan and reveals (§7.5), damage, crits and
 * drops (§7.7), projectiles, healing (§7.11). */
const DEG = Math.PI / 180;
Object.assign(Sim.prototype, {
  /* ---------------- aim mode ---------------- */
  aimEnter() {
    const a = this.aim; a.on = true; a.yaw = this.W.yaw; a.pitch = clamp(a.pitch * .3, -.3, .3); a.scope = false; a.holdT = 0; a.reticle = null;
    this.healing = false; this.emit('aim', { on: true }); this.tut('aim', true);
    if (this.anyAlive() && !this.st.tut.scan) this.tut('scan');
  },
  aimExit(silent) {
    const a = this.aim; if (!a.on && !silent) return;
    a.on = false; a.scope = false; a.toggled = false;
    for (const d of this.drops) d.pull = true;   // drops fly to you when you leave aim mode
    if (!silent) this.emit('aim', { on: false });
  },
  /** look: the pad's curve, rates, acceleration and assist; the mouse in look or pointer mode */
  updateAim(dt, I) {
    const a = this.aim, st = this.st;
    const inv = this.game.input && this.game.input.invertAimY ? -1 : 1;
    const sens = this.setting('padSens', 1) * T.padSensK, scopeK = a.scope ? .3 : 1;
    let dyaw = 0, dpitch = 0;
    const ls = I.lookStick, mag = Math.hypot(ls[0], ls[1]);
    // the left stick aims at 60% when the right one is idle (§6.1)
    let sx = ls[0], sy = ls[1], m2 = mag;
    if (mag < .1 && I.device === 'gamepad' && Math.hypot(I.stick[0], I.stick[1]) > .2) { sx = I.stick[0] * .6; sy = I.stick[1] * .6; m2 = Math.hypot(sx, sy); }
    if (m2 > .05) {
      const k = Math.pow(Math.min(1, m2), 1.8) / m2;
      a.holdT = m2 > .9 ? a.holdT + dt : 0;
      const accel = 1 + .6 * clamp((a.holdT - .35) / .3, 0, 1);
      let ky = 1, kp = 1;
      const near = this.assistTarget();
      const assist = this.assistLevel();
      if (near && assist > 0) { const slow = assist >= 2 ? .4 : .55; if (near.ang < 3.5 * DEG) { ky = kp = 1 - (1 - slow) * T.assistK; } }
      dyaw += sx * k * 160 * DEG * dt * sens * accel * scopeK * ky;
      dpitch -= sy * k * 110 * DEG * dt * sens * accel * scopeK * kp * inv;
    } else a.holdT = 0;
    // magnetism toward a revealed warm spot within 5° (controller only)
    if (I.device === 'gamepad') {
      const near = this.assistTarget(), lv = this.assistLevel();
      if (near && lv > 0 && near.ang < 5 * DEG) {
        const pull = (lv >= 2 ? .25 : .12) * T.assistK * dt * 4;
        a.yaw += S7.angDiff(a.yaw, near.yaw) * pull; a.pitch += (near.pitch - a.pitch) * pull;
      }
    }
    // the mouse: look mode turns by pixels; pointer mode moves the reticle and pans at the edges
    const mouseMode = this.setting('mouseMode', 'look');
    const msens = this.setting('mouseSens', .12) * DEG * scopeK;
    if (mouseMode === 'pointer' && I.pointer && this.game.W) {
      const sx2 = I.pointer[0] / this.game.W, sy2 = I.pointer[1] / this.game.H;
      a.reticle = [clamp(sx2, 0, 1), clamp(sy2, 0, 1)];
      const ex = sx2 < .1 ? (sx2 - .1) / .1 : sx2 > .9 ? (sx2 - .9) / .1 : 0, ey = sy2 < .1 ? (sy2 - .1) / .1 : sy2 > .9 ? (sy2 - .9) / .1 : 0;
      dyaw += clamp(ex, -1, 1) * 120 * DEG * dt; dpitch -= clamp(ey, -1, 1) * 120 * DEG * dt;
    } else {
      a.reticle = null;
      dyaw += I.mouse[0] * msens; dpitch -= I.mouse[1] * msens * inv;
    }
    if (I.lookAbs) { a.yaw = I.lookAbs[0]; a.pitch = I.lookAbs[1]; dyaw = dpitch = 0; }   // the bot's and attract mode's aim
    a.yaw = S7.wrapAng(a.yaw + dyaw);
    a.pitch = clamp(a.pitch + dpitch, -70 * DEG, 70 * DEG);
    a.recoil = Math.max(0, a.recoil - 10 * DEG * dt);
    a.swayT += dt;
    if (st.persona === 'ignaz' && I.skillP) { a.scope = !a.scope; this.emit('scope', { on: a.scope }); this.tut('longlook', true); }
  },
  assistLevel() {
    if (this.I && this.I.device !== 'gamepad') return 0;
    const v = this.setting('aimAssist', 'default'), d = v === 'default' ? this.diff().assist : v;
    return d === 'high' ? 2 : d === 'low' ? 1 : 0;
  },
  /** the revealed warm spot nearest the aim within 5°: { yaw, pitch, ang } */
  assistTarget() {
    const a = this.aim, eye = this.eye(); let best = null;
    const consider = (p) => {
      const d = V.sub(p, eye), yaw = Math.atan2(d[1], d[0]), pitch = Math.atan2(d[2], Math.hypot(d[0], d[1]));
      const ang = Math.hypot(S7.angDiff(a.yaw, yaw) * Math.cos(a.pitch), pitch - a.pitch);
      if (ang < 5 * DEG && (!best || ang < best.ang) && this.grid.los(eye, p)) best = { yaw, pitch, ang };
    };
    for (const e of this.enemies) if (e.alive && this.isRevealed(e) && V.dist(this.eye(), this.warmPos(e)) < 30 * M) consider(this.warmPos(e));
    if (this.boss) for (const w of this.bossWarmSpots()) if (w.open) consider(w.p);
    for (const s of this.spots) if (s.target && !this.spotUsed(s)) consider([s.x, s.y, s.z]);
    return best;
  },
  swayOffset() {
    const a = this.aim, lv = this.stats().steady;
    let amp = Math.max(.1, .7 * (1 - .15 * lv)) * DEG;
    if (a.scope) amp *= .5;
    return [Math.sin(a.swayT * TAU * .6) * amp, Math.sin(a.swayT * TAU * .9 + 1) * amp * .7];
  },
  /** the aim's ray: the eye, along the reticle (centre or pointer), with sway and recoil */
  aimRay() {
    const a = this.aim, pose = this.cam.pose;
    if (a.reticle && this.game.W) { const r = S7.unproject(pose, a.reticle[0], a.reticle[1], this.game.W / this.game.H); return { o: this.eye(), d: r.d }; }
    const sw = this.swayOffset();
    return { o: this.eye(), d: V.dir(a.yaw + sw[0], a.pitch + a.recoil + sw[1]) };
  },

  /* ---------------- weapons ---------------- */
  mag(id) {
    id = id || this.st.persona;
    this.mags = this.mags || {};
    if (!this.mags[id]) { const W = this.weaponDef(id); this.mags[id] = { n: W.mag, reload: 0, cd: 0, heat: 0, alt: 0 }; }
    return this.mags[id];
  },
  updateWeapons(dt, I) {
    const W = this.weaponDef(), m = this.mag(), lv = this.stats().speed;
    m.cd = Math.max(0, m.cd - dt);
    for (const id in this.mags) { const o = this.mags[id]; if (o.reload > 0 && id !== this.st.persona) { o.reload -= dt; if (o.reload <= 0) { o.reload = 0; o.n = S7.WEAPONS[this.personaDef(id).weapon].mag; } } }
    if (W.heat) { m.heatCool = (m.heatCool || 0) + dt; if (m.heatCool > 1.2 && m.n < W.mag && m.reload <= 0) { m.n++; m.heatCool = 0; } }
    if (m.reload > 0) {
      m.reload -= dt;
      if (W.perShell) { m.shellT = (m.shellT || 0) + dt; if (m.shellT >= W.reload * (1 - .08 * lv)) { m.shellT = 0; m.n = Math.min(W.mag, m.n + 1); this.emit('shell', {}); if (m.n >= W.mag) m.reload = 0; else m.reload = 1; } if (I.fireP && m.n > 0) m.reload = 0; }
      else if (m.reload <= 0) { m.reload = 0; m.n = W.mag; this.emit('reloaded', {}); }
      if (m.reload > 0) return;
    }
    if (!this.aim.on) return;
    if (I.reloadP && m.n < W.mag && !W.heat) { this.startReload(); return; }
    const pull = W.auto ? I.fireD : I.fireP;
    if (pull && m.cd <= 0) {
      if (m.n <= 0) { if (W.heat) { this.emit('dryfire', {}); m.cd = .3; } else { this.emit('dryfire', {}); this.startReload(); } return; }
      this.fire(W, m);
    }
  },
  startReload() {
    const W = this.weaponDef(), m = this.mag(), lv = this.stats().speed;
    if (m.reload > 0) return;
    if (W.perShell) { m.reload = 1; m.shellT = 0; }
    else m.reload = W.reload * (1 - .08 * lv);
    this.emit('reload', { weapon: W.id, t: m.reload });
  },
  fire(W, m) {
    const P = this.st.persona;
    m.n--; m.cd = W.interval; m.alt = 1 - m.alt; m.heatCool = 0;
    if (W.heat && m.n <= 0) { m.reload = W.reload; this.emit('overheat', {}); }
    const ray = this.aimRay();   // the shot leaves before its own kick lifts the muzzle
    this.aim.recoil += W.recoil * DEG;
    const res = this.st.results[this.areaDef.target !== undefined ? this.areaDef.target : this.st.target];
    res.shots++;
    this.emit('shot', { persona: P, weapon: W.id, alt: m.alt, from: ray.o, dir: ray.d });
    if (W.kind === 'hitscan') this.hitscan(ray, W, W.dmg, W.spread * DEG, W.pierce || 0);
    else if (W.kind === 'pellets') { for (let i = 0; i < W.pellets; i++) this.hitscan(ray, W, W.dmg, W.spread * DEG, 0, true); }
    else if (W.kind === 'cone') this.coneBlast(ray, W);
    else if (W.kind === 'lob') this.lob(ray, W, false);
    if (m.n <= 0 && !W.heat) this.startReload();
  },
  /** a hitscan shot: the nearest of warm spots, bodies, shields, targets, projectiles and the level */
  hitscan(ray, W, dmg, spread, pierce, pellet) {
    let d = ray.d;
    if (spread > 0) {
      const a = S7.rnd('spread') * TAU, r = Math.sqrt(S7.rnd('spread')) * spread, B = S7.basis(Math.atan2(d[1], d[0]), Math.asin(clamp(d[2], -1, 1)));
      d = V.norm(V.add(d, V.add(V.mul(B.r, Math.cos(a) * Math.tan(r)), V.mul(B.u, Math.sin(a) * Math.tan(r)))));
    }
    const range = (W.range || 60) * M * (this.aim.scope ? 250 / 120 : 1);
    const wallT = this.grid.ray(ray.o, d, range * 2.5, 3);
    const hits = this.rayHits(ray.o, d, Math.min(wallT, range * 2.5));
    let pierced = 0;
    for (const h of hits) {
      const far = h.t > range;
      const k = (1 + .12 * this.stats().power) * (far ? .25 : 1);
      if (h.kind === 'warm' || h.kind === 'body') { this.hitEnemy(h.e, h.kind === 'warm', dmg * k, { dir: d, pellet, weapon: W.id, burn: W.burn }); if (W.knock && h.e.alive) this.knockEnemy(h.e, d, W.knock * .3); if (pierced++ >= pierce) return h; continue; }
      if (h.kind === 'shield') { this.emit('tink', { at: h.p }); if (W.knock) this.knockEnemy(h.e, d, W.knock); h.e.tinks = (h.e.tinks || 0) + 1; if (h.e.tinks === 4 && !this.st.flags.plowTip) { this.st.flags.plowTip = 1; this.say('The slab takes everything. Spin it: Rurik\'s buckshot or Kasimir\'s horn. Or wait for its back.', { who: 'ignaz', life: 4.5 }); } return h; }
      if (h.kind === 'proj') { this.destroyProjectile(h.pr, true); return h; }
      if (h.kind === 'boss') { this.hitBoss(h.w, dmg * k, d); return h; }
      if (h.kind === 'target') { this.hitTarget(h.s, W, h.p); return h; }
    }
    if (wallT < range * 2.5) { const p = V.add(ray.o, V.mul(d, wallT)); this.emit('impact', { at: p }); return { kind: 'wall', p }; }
    return null;
  },
  /** everything a ray crosses before maxT, nearest first */
  rayHits(o, d, maxT) {
    const out = [], wr = this.warmR();
    for (const e of this.enemies) {
      if (!e.alive || e.melting) continue;
      const ED = S7.ENEMIES[e.type], h = (ED.height || 34) * e.size, r = (ED.radius || 5) * e.size;
      const bt = S7.rayCapsule(o, d, [e.x, e.y, e.z], h, r);
      // a Plow's slab blocks shots from the front, warm spot and all
      if (bt >= 0 && bt < maxT && e.shield && !e.turned) { const f = [Math.cos(e.facing), Math.sin(e.facing)]; if (f[0] * -d[0] + f[1] * -d[1] > .2) { out.push({ kind: 'shield', e, t: bt, p: V.add(o, V.mul(d, bt)) }); continue; } }
      const wp = this.warmPos(e), wt = e.warmOpen === false ? -1 : S7.raySphere(o, d, wp, wr * (ED.warmK || 1));
      if (wt >= 0 && wt < maxT) { out.push({ kind: 'warm', e, t: Math.max(0, (bt >= 0 ? Math.min(bt, wt) : wt) - .01), p: V.add(o, V.mul(d, wt)) }); continue; }
      if (bt >= 0 && bt < maxT) out.push({ kind: 'body', e, t: bt, p: V.add(o, V.mul(d, bt)) });
    }
    for (const pr of this.projectiles) if (pr.hostile && pr.hp > 0) { const t = S7.raySphere(o, d, [pr.x, pr.y, pr.z], (pr.r || 4) + 2); if (t >= 0 && t < maxT) out.push({ kind: 'proj', pr, t }); }
    if (this.boss) {
      const bh = [];
      for (const w of this.bossWarmSpots()) { const t = S7.raySphere(o, d, w.p, w.r); if (t >= 0 && t < maxT) bh.push({ kind: 'boss', w, t, p: V.add(o, V.mul(d, t)) }); }
      // a warm spot set into a body wins over the body round it (as on a Whiteout)
      const warm = bh.filter(h => h.w.kind === 'warm' && h.w.open);
      if (warm.length) { const body = bh.find(h => h.w.kind === 'body'); for (const h of warm) { if (body) h.t = Math.min(h.t, body.t); out.push(h); } }
      else out.push(...bh);
    }
    for (const s of this.spots) if (s.target && !this.spotUsed(s)) { const t = S7.raySphere(o, d, [s.x, s.y, s.z], (s.r || .6) * M); if (t >= 0 && t < maxT) out.push({ kind: 'target', s, t, p: V.add(o, V.mul(d, t)) }); }
    out.sort((a, b) => a.t - b.t);
    return out;
  },
  warmR() { const lv = this.stats().critical; return 5 * (1 + .1 * lv) * (this.st.persona === 'mireille' ? 1.25 : 1) * T.warmRadius; },
  /** the Alphorn: a 25° cone, 18 m, everything in it */
  coneBlast(ray, W) {
    const o = ray.o, d = ray.d, R = W.range * M, cosA = Math.cos(W.cone / 2 * DEG);
    let n = 0;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const c = [e.x, e.y, e.z + 18 * e.size], v = V.sub(c, o), L = V.len(v);
      if (L > R || V.dot(v, d) / (L || 1) < cosA || !this.grid.los(o, c)) continue;
      this.hitEnemy(e, false, W.dmg * (1 + .12 * this.stats().power), { dir: d, weapon: W.id, cone: true });
      this.knockEnemy(e, d, W.knock || 60); n++;
    }
    for (const pr of this.projectiles) if (pr.hostile) { const v = V.sub([pr.x, pr.y, pr.z], o), L = V.len(v); if (L < R && V.dot(v, d) / (L || 1) > cosA) this.destroyProjectile(pr, true); }
    if (this.boss) for (const w of this.bossWarmSpots()) { const v = V.sub(w.p, o), L = V.len(v); if (L < R && V.dot(v, d) / (L || 1) > cosA) this.hitBoss(w, W.dmg, d, true); }
    this.emit('blast', { from: o, dir: d, n });
  },
  /** the Avalauncher's shell (or Brigid's Control Charge): a lob that bursts on contact or after 2 s */
  lob(ray, W, charge) {
    const sp = charge ? 520 : 300;
    this.projectiles.push({ id: this.uid++, kind: charge ? 'charge' : 'shell', x: ray.o[0] + ray.d[0] * 8, y: ray.o[1] + ray.d[1] * 8, z: ray.o[2] + ray.d[2] * 8 - 3, vx: ray.d[0] * sp, vy: ray.d[1] * sp, vz: ray.d[2] * sp + 40, g: charge ? 240 : 300, life: charge ? 4 : 2, dmg: charge ? 90 : W.dmg, radius: (charge ? 5 : 2.5) * M, hostile: false, hp: 1, r: 3 });
  },
  explode(p, radius, dmg, o = {}) {
    this.emit('explode', { at: p, radius, kind: o.kind || 'shell' });
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const c = [e.x, e.y, e.z + 16], d = V.dist(c, p);
      if (d < radius) { this.hitEnemy(e, false, dmg * (1 - d / radius * .5) * (1 + .12 * this.stats().power), { splash: true }); this.knockEnemy(e, V.norm(V.sub(c, p)), 80); if (e.shield) e.turnT = 1.2; }
    }
    if (this.boss) for (const w of this.bossWarmSpots()) if (V.dist(w.p, p) < radius + w.r) this.hitBoss(w, dmg * .5, null, true);
    if (o.charge) for (const s of this.spots) if ((s.kind === 'cornice' || s.kind === 'serac') && !this.spotUsed(s) && V.dist([s.x, s.y, s.z], p) < 3 * M + (s.r || 1) * M) this.solveSpot(s);
    // a player inside their own blast's edge is fine; a Giggler's contact blast hurts (hurtPlayer is called by enemies)
  },
  updateProjectiles(dt) {
    const eye = this.eye(), chest = [this.hero.x, this.hero.y, this.hero.z + 20];
    for (const p of this.projectiles) {
      if (p.hp <= 0) continue;
      p.life -= dt;
      p.vz -= (p.g || 0) * dt;
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, nz = p.z + p.vz * dt;
      if (p.homing && p.hostile) { const d = V.norm(V.sub(chest, [p.x, p.y, p.z])); const sp = Math.hypot(p.vx, p.vy, p.vz); p.vx += (d[0] * sp - p.vx) * dt * p.homing; p.vy += (d[1] * sp - p.vy) * dt * p.homing; }
      const solid = this.grid.solidAt(nx, ny, nz);
      p.x = nx; p.y = ny; p.z = nz;
      if (!p.hostile) {
        // the player's shells: burst on an enemy, the level, the boss, or time out
        let hit = solid || p.life <= 0;
        if (!hit) for (const e of this.enemies) if (e.alive && Math.hypot(e.x - p.x, e.y - p.y) < 8 * e.size && p.z > e.z && p.z < e.z + 34 * e.size) { hit = true; break; }
        if (!hit && this.boss) for (const w of this.bossWarmSpots()) if (V.dist(w.p, [p.x, p.y, p.z]) < w.r + 6) hit = true;
        if (!hit) for (const s of this.spots) if ((s.kind === 'cornice' || s.kind === 'serac') && V.dist([s.x, s.y, s.z], [p.x, p.y, p.z]) < (s.r || 1) * M + 6) hit = true;
        if (hit) { p.hp = 0; this.explode([p.x, p.y, p.z], p.radius, p.dmg, { charge: p.kind === 'charge', kind: p.kind }); }
        continue;
      }
      // hostile: snowballs, ice cubes, suitcases, medals
      if (V.dist([p.x, p.y, p.z], chest) < 12 || V.dist([p.x, p.y, p.z], eye) < 10) { p.hp = 0; this.hurtPlayer(p.dmg, [p.x, p.y, p.z], p.kind); this.emit('splat', { at: [p.x, p.y, p.z], kind: p.kind }); continue; }
      if (solid || p.life <= 0) {
        p.hp = 0; this.emit('splat', { at: [p.x, p.y, p.z], kind: p.kind });
        if (p.landDmg && V.dist2([p.x, p.y], chest) < 1.5 * M) this.hurtPlayer(p.landDmg, [p.x, p.y, p.z], p.kind);
        if (p.onLand) p.onLand(this, p);
      }
    }
    this.projectiles = this.projectiles.filter(p => p.hp > 0);
  },
  throwAt(from, kind, o = {}) {
    const chest = [this.hero.x, this.hero.y, this.hero.z + 20 + (o.aimUp || 0)], sp = o.speed || 220;
    const d = V.sub(chest, from), L = V.len(d), t = L / sp, g = o.g !== undefined ? o.g : 160;
    const pr = { id: this.uid++, kind, x: from[0], y: from[1], z: from[2], vx: d[0] / t, vy: d[1] / t, vz: d[2] / t + .5 * g * t, g, life: t + 1.5, dmg: o.dmg || 8, hostile: true, hp: o.hp || 1, r: o.r || 4, landDmg: o.landDmg, onLand: o.onLand, red: o.red || 0, homing: o.homing || 0, owner: o.owner };
    this.projectiles.push(pr);
    this.emit('throw', { kind, at: from });
    return pr;
  },
  destroyProjectile(p, byShot) {
    p.hp = 0; this.emit('shatter', { at: [p.x, p.y, p.z], kind: p.kind });
    if (byShot && p.red) this.dropLoot([p.x, p.y, p.z], p.red, 0);
  },

  /* ---------------- hits, crits, kills ---------------- */
  hitEnemy(e, warm, dmg, o = {}) {
    if (!e.alive) return;
    const ED = S7.ENEMIES[e.type];
    e.reveal = Math.max(e.reveal, 3); e.hurtT = .25;
    const res = this.curResults(); res.hits++;
    if (CHEAT.oneHit) warm = true;
    if (ED.onHit && ED.onHit(this, e, warm, dmg, o) === false) return;
    if (warm && !ED.noCrit) {
      e.hp = 0; this.kill(e, true);
      return;
    }
    e.hp -= dmg;
    if (o.burn) e.burn = 3;
    this.emit('hit', { target: e, part: warm ? 'warm' : 'body', dmg, at: [e.x, e.y, e.z + 18] });
    if (e.hp <= 0) this.kill(e, false);
  },
  kill(e, crit) {
    if (!e.alive) return;
    const ED = S7.ENEMIES[e.type];
    e.alive = false; e.melting = 0; e.crit = crit;
    const res = this.curResults(); res.kills++; if (crit) res.crits++;
    const lv = this.stats().critical;
    const red = Math.round((crit ? ED.red[1] : ED.red[0]) * this.diff().red * T.redDrop);
    let rime = crit ? Math.round((ED.rime || 1) * T.rimeDrop) + (lv >= 3 ? 1 : 0) : 0;
    this.dropLoot([e.x, e.y, e.z + 14], red, rime, V.dist2([e.x, e.y], [this.hero.x, this.hero.y]) < 10 * M);
    if (crit) {
      this.emit('crit', { enemy: e, at: this.warmPos(e) });
      this.splash('THAW.', { crit: true });
      this.game.freeze && this.game.freeze(.06);
      if (CHEAT.slowCrit) this.critSlow = .5;
      if (!this.st.flags.firstCrit) { this.st.flags.firstCrit = 1; this.tut('fire', true); }
      this.bark('crit');
    }
    this.emit('kill', { enemy: e, type: e.type, crit, at: [e.x, e.y, e.z] });
    if (ED.onKill) ED.onKill(this, e, crit);
    if (e.onKill) e.onKill(this, e, crit);
  },
  curResults() { return this.st.results[this.areaDef.target !== undefined ? this.areaDef.target : this.st.target]; },
  knockEnemy(e, d, k) { e.kx = (e.kx || 0) + d[0] * k; e.ky = (e.ky || 0) + d[1] * k; if (e.shield) { e.turnT = 1.2; } },
  dropLoot(p, red, rime, instant) {
    if (red > 0) this.drops.push({ kind: 'red', n: red, x: p[0], y: p[1], z: p[2], vz: 60, t: 0, pull: instant });
    if (rime > 0) this.drops.push({ kind: 'rime', n: rime, x: p[0], y: p[1], z: p[2] + 4, vz: 70, t: 0, pull: instant });
  },
  updateDrops(dt) {
    const h = this.hero, c = [h.x, h.y, h.z + 16];
    for (const d of this.drops) {
      d.t += dt;
      if (!d.pull && V.dist(c, [d.x, d.y, d.z]) < 4 * M && !this.aim.on) d.pull = true;
      if (d.pull && d.t > .25) {
        const v = V.sub(c, [d.x, d.y, d.z]), L = V.len(v), sp = 260 + d.t * 200;
        if (L < 8) { d.got = true; this.gain(d.kind, d.n, [d.x, d.y, d.z]); continue; }
        d.x += v[0] / L * sp * dt; d.y += v[1] / L * sp * dt; d.z += v[2] / L * sp * dt;
      } else { d.vz -= 200 * dt; d.z = Math.max(this.grid.floorAt(d.x, d.y) + 4, d.z + d.vz * dt); }
      if (d.t > 30) d.pull = true;
    }
    this.drops = this.drops.filter(d => !d.got);
  },
  gain(kind, n, at) {
    const st = this.st;
    if (kind === 'red') { st.red = Math.min(999, st.red + n); this.curResults().red += n; }
    else if (kind === 'rime') st.rime += n;
    this.emit('pickup', { kind, amount: n, at });
  },

  /* ---------------- the player's health ---------------- */
  hurtPlayer(dmg, from, kind) {
    if (CHEAT.god || this.o.attract || this.switching || this.areaDef.kind === 'room7' || this.mode === 'frozen' || this.cutscene) return;
    const ps = this.pstate();
    const d = Math.max(1, Math.round(dmg * this.diff().dmg * T.playerDamage));
    ps.hp = Math.max(0, ps.hp - d);
    this.emit('hurt', { persona: this.st.persona, dmg: d, from, kind });
    if (ps.hp > 0 && ps.hp < this.maxHp() * .3 && !this.lowBarked) { this.lowBarked = true; this.bark('low'); }
    if (ps.hp <= 0) this.freezePersona();
    else if (ps.hp < this.maxHp() * .7) this.tut('heal');
  },

  /* ---------------- reveals: scan, flare, echo, flash; tells ---------------- */
  isRevealed(e) { return CHEAT.revealAll || this.o.attract || e.reveal > 0 || e.alwaysVisible; },
  revealFor() { return (T.revealTime + .4 * this.stats().steady) * this.diff().reveal; },
  updateReveals(dt) {
    const sc = this.scan;
    if (sc) {
      sc.t += dt; const R = T.scanRadius * M * Math.min(1, sc.t / .6), c = sc.at;
      for (const e of this.enemies) if (e.alive && !sc.hit[e.id] && V.dist2(c, [e.x, e.y]) <= R) { sc.hit[e.id] = 1; e.reveal = Math.max(e.reveal, this.revealFor()); this.emit('reveal', { enemy: e, by: 'scan' }); }
      if (sc.t > .8) this.scan = null;
    }
    this.scanCd = Math.max(0, (this.scanCd || 0) - dt);
    for (const e of this.enemies) if (e.reveal > 0) e.reveal -= dt;
    if (this.flare) { this.flare.t -= dt; for (const e of this.enemies) if (e.alive && V.dist2([e.x, e.y], [this.flare.x, this.flare.y]) < 30 * M) e.reveal = Math.max(e.reveal, .3); if (this.flare.t <= 0) this.flare = null; }
    if (this.echo) { this.echo.t -= dt; if (this.echo.t <= 0) this.echo = null; }
    if (this.flash) { this.flash.t -= dt; if (this.flash.t <= 0) this.flash = null; }
  },
  doScan() {
    if (this.scanCd > 0) return;
    this.scanCd = 1.2;
    this.scan = { t: 0, at: [this.hero.x, this.hero.y, this.hero.z], hit: {} };
    this.emit('scan', { at: this.scan.at, radius: T.scanRadius * M });
    this.tut('scan', true);
  },

  /* ---------------- skills ---------------- */
  updateSkills(dt, I) {
    const st = this.st, id = st.persona, P = this.personaDef();
    this.skillCd = this.skillCd || {};
    for (const k in this.skillCd) this.skillCd[k] = Math.max(0, this.skillCd[k] - dt);
    if (this.mode === 'frozen' || this.switching) return;
    if (this.aim.on && I.scanP) this.doScan();
    // Dagny's tuck: hold, 2 Red a second, while moving or skiing
    this.tucking = id === 'dagny' && I.skillD && (I.move || (this.W.edge && this.rails.edges[this.W.edge].kind === 'ski')) && (st.red > 0 || CHEAT.infRed) || (this.tucking && this.W.edge && this.rails.edges[this.W.edge] && this.rails.edges[this.W.edge].kind === 'ski' && I.move);
    if (id === 'dagny' && I.skillD && this.tucking) this.spendRed(2 * dt, true);
    if (!I.skillP || id === 'ignaz' || id === 'dagny') return;
    const S = P.skill;
    if (S.aimOnly && !this.aim.on) { this.say(S.name.toUpperCase() + ': AIM FIRST.'); return; }
    if ((this.skillCd[id] || 0) > 0) { this.emit('dryfire', {}); return; }
    if (!this.spendRed(S.cost)) { this.emit('noRed', {}); this.toast('NOT ENOUGH RED'); return; }
    this.skillCd[id] = S.cooldown || 1;
    this.emit('skill', { persona: id, skill: S.id });
    this.tut('skill', true);
    const h = this.hero, c = [h.x, h.y, h.z];
    if (S.id === 'flare') { this.flare = { x: h.x, y: h.y, z: h.z + 6 * M, t: 8 }; for (const e of this.enemies) if (e.alive && V.dist2(c, [e.x, e.y]) < 30 * M) e.reveal = Math.max(e.reveal, 8); }
    else if (S.id === 'makeitrain') { for (const e of this.enemies) if (e.alive && V.dist2(c, [e.x, e.y]) < 12 * M && !S7.ENEMIES[e.type].boss) { e.kneel = 3; } }
    else if (S.id === 'echo') {
      this.echo = { t: 5, x: h.x, y: h.y };
      for (const e of this.enemies) if (e.alive && V.dist2(c, [e.x, e.y]) < 40 * M) { e.reveal = Math.max(e.reveal, 5); e.marked = 5; }
      for (const s of this.spots) {
        if (this.spotUsed(s)) continue;
        const d = V.dist2(c, [s.x, s.y]);
        if (s.kind === 'echowall' && d < 25 * M) this.solveSpot(s);
        if (s.kind === 'crystal' && d < 15 * M) this.solveSpot(s);
      }
      for (const pr of this.projectiles) if (pr.hostile && pr.kind === 'snowball' && V.dist2(c, [pr.x, pr.y]) < 15 * M) this.destroyProjectile(pr, true);
    }
    else if (S.id === 'flash') {
      const ray = this.aimRay(), cosA = Math.cos(35 / 2 * DEG);
      this.flash = { t: .35 };
      for (const e of this.enemies) {
        if (!e.alive) continue; const v = V.sub([e.x, e.y, e.z + 18], ray.o), L = V.len(v);
        if (L < 25 * M && V.dot(v, ray.d) / L > cosA && this.grid.los(ray.o, [e.x, e.y, e.z + 18])) { e.stun = 2.5; e.reveal = Math.max(e.reveal, this.revealFor()); }
      }
      for (const s of this.spots) if (s.kind === 'exposure' && !this.spotUsed(s)) { const v = V.sub([s.x, s.y, s.z], ray.o), L = V.len(v); if (L < 25 * M && V.dot(v, ray.d) / L > Math.cos(25 * DEG)) this.solveSpot(s); }
    }
    else if (S.id === 'charge') this.lob(this.aimRay(), this.weaponDef(), true);
  },
  spendRed(n, partial) {
    if (CHEAT.infRed || this.o.attract) return true;
    if (this.st.red < n && !partial) return false;
    this.st.red = Math.max(0, this.st.red - n);
    return true;
  },
  /** healing (§7.11): hold in rail mode, 40 HP a second, 1 Red each */
  updateEconomy(dt, I) {
    const ps = this.pstate(), max = this.maxHp();
    if (this.healing && ps.hp < max && (this.st.red > 0 || CHEAT.infRed)) {
      const want = Math.min(max - ps.hp, T.healRate * dt), take = CHEAT.infRed ? want : Math.min(want, this.st.red);
      ps.hp += take; if (!CHEAT.infRed) this.st.red -= take;
      this.healAcc = (this.healAcc || 0) + take;
      if (this.healAcc > 4) { this.emit('heal', { amount: this.healAcc }); this.healAcc = 0; }
      if (ps.hp >= max * .7) this.lowBarked = false;
      this.tut('heal', true);
    }
    if (CHEAT.infRed) this.st.red = Math.max(this.st.red, 999);
  }
});
