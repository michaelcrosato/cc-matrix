/* ===================== 05 RAIL STAGE: path, player, wingmen, enemies, boss, spawner ===================== */
const _t1 = new V3(), _t2 = new V3(), _t3 = new V3(), _tm = new M4(), _tq = new QT(), _te = new EU(), _UPV = new V3(0, 1, 0);

class RailPath {
  constructor(pts) {
    this.curve = new THREE.CatmullRomCurve3(pts.map((p) => new V3(p[0], p[1], p[2])), false, 'centripetal');
    this.length = this.curve.getLength();
    const N = this.n = Math.ceil(this.length / 2);
    this.P = new Float32Array((N + 1) * 3); this.T = new Float32Array((N + 1) * 3); this.R = new Float32Array((N + 1) * 3); this.U = new Float32Array((N + 1) * 3);
    const t = new V3(), r = new V3(), u = new V3();
    for (let i = 0; i <= N; i++) {
      const k = i / N, p = this.curve.getPointAt(k); this.curve.getTangentAt(k, t);
      r.crossVectors(t, _UPV).normalize(); u.crossVectors(r, t).normalize();
      this.P.set([p.x, p.y, p.z], i * 3); this.T.set([t.x, t.y, t.z], i * 3); this.R.set([r.x, r.y, r.z], i * 3); this.U.set([u.x, u.y, u.z], i * 3);
    }
    this.p = new V3(); this.t = new V3(); this.r = new V3(); this.u = new V3();
  }
  frame(s) {
    const f = clamp(s / this.length, 0, 1) * this.n, i = Math.min(Math.floor(f), this.n - 1), k = f - i, a = i * 3, b = a + 3;
    const L = (arr, o) => o.set(lerp(arr[a], arr[b], k), lerp(arr[a + 1], arr[b + 1], k), lerp(arr[a + 2], arr[b + 2], k));
    L(this.P, this.p); L(this.T, this.t).normalize(); L(this.R, this.r).normalize(); L(this.U, this.u).normalize();
    // extrapolate past the end of the path
    if (s > this.length) this.p.addScaledVector(this.t, s - this.length);
    return this;
  }
  world(s, x, y, out) { this.frame(s); return out.copy(this.p).addScaledVector(this.r, x).addScaledVector(this.u, y); }
  quat(s, out, flip) {
    this.frame(s);
    if (flip) _tm.makeBasis(_t1.copy(this.r).negate(), this.u, this.t); else _tm.makeBasis(this.r, this.u, _t1.copy(this.t).negate());
    return out.setFromRotationMatrix(_tm);
  }
  yaw(s) { this.frame(s); return Math.atan2(-this.t.x, -this.t.z); }
}

/* ---------- formations ---------- */
function formationOffset(form, i, n, sp) {
  const c = i - (n - 1) / 2;
  switch (form) {
    case 'v': return [c * 6.5, 0, Math.abs(c) * 8];
    case 'column': return [0, 0, i * (sp || 12)];
    case 'circle': { const a = (i / n) * TAU; return [Math.cos(a) * 11, Math.sin(a) * 6, 0]; }
    case 'ring': { const a = (i / n) * TAU; return [Math.cos(a) * 12, Math.sin(a) * 7, i * 4]; }
    case 'wave': return [c * 8, Math.sin(i * 1.3) * 4, 0];
    case 'split': return [i % 2 ? 1 : -1, 0, i * 9];
    default: return [c * 7, 0, 0];
  }
}

/* ---------- enemies in rail space ---------- */
const ESPEC = {
  drone: { build: () => MODELS.drone(), hp: 2, r: 2.0, score: 100, deb: 0x6b3aa0, kill: true },
  swooper: { build: () => MODELS.swooper(), hp: 2, r: 1.9, score: 150, deb: 0x1f8f94, kill: true },
  turret: { build: () => MODELS.turret(1), hp: 4, r: 2.4, score: 200, deb: 0xb04a3a, kill: true, ground: true },
  carTurret: { build: () => MODELS.turret(0.8), hp: 4, r: 2.1, score: 200, deb: 0xb04a3a, kill: true, ground: true },
  mine: { build: () => MODELS.mine(), hp: 1, r: 2.2, score: 60, deb: 0xff4a3a, kill: true },
  gunship: { build: () => MODELS.gunship(), hp: 26, r: 5.2, score: 600, deb: 0x8a2f3a, kill: true },
  car: { build: (e) => MODELS.car(e.carKind), hp: 14, r: 6.5, score: 120, deb: 0x7a4a3a, kill: false, ground: true },
  loco: { build: () => MODELS.loco(), hp: 30, r: 8, score: 400, deb: 0x8a2f3a, kill: true, ground: true },
  chaser: { build: () => { const m = MODELS.drone(); m.scale.setScalar(0.9); return m; }, hp: 6, r: 2.0, score: 250, deb: 0xe03a6a, kill: true },
  hecate: { build: () => { const m = MODELS.gunship(); m.scale.setScalar(2); return m; }, hp: 110, r: 10, score: 3000, deb: 0x8a2f3a, kill: true },
};

class Enemy extends Ent {
  constructor(kind, o) {
    super(kind); const sp = ESPEC[kind]; this.spec = sp; Object.assign(this, o);
    this.hp = this.maxHp = sp.hp; this.score = sp.score; this.debrisColor = sp.deb; this.countsAsKill = sp.kill; this.rail = true;
    this.mesh = sp.build(this); this.baseScale = this.mesh.scale.x; Gfx.world.add(this.mesh);
    this.state = 'approach'; this.fireT = rand(0.6, 2.2); this.phase = rand(TAU); this.bank = 0; this.lastRx = this.rx;
    this.meshDy = 0;
    this.attachBall(sp.r, GRP.ENEMY);
    this.updateTransform(0);
  }
  updateTransform(dt) {
    const st = W.stage;
    st.path.world(this.rs, this.rx, this.ry, this.pos);
    if (this.worldY !== undefined) this.pos.y = this.worldY;
    st.path.quat(this.rs, this.quat, !this.noFlip);
    if (dt > 0) { this.bank = damp(this.bank, clamp((this.rx - this.lastRx) / dt * -0.03, -0.9, 0.9), 6, dt); this.lastRx = this.rx; }
    if (this.bank) { _te.set(0, 0, this.bank); _tq.setFromEuler(_te); this.quat.multiply(_tq); }
  }
  onDeath() {
    const sp = this.spec;
    if (this.kind === 'mine') { Bullets.aoe(this.pos, 11, 4, null, false); const P = W.player; if (P && P.alive && P.pos.distanceTo(this.pos) < 8) P.hurt(14, this.pos, true); }
    if (this.kind === 'gunship' && Math.random() < 0.5) W.stage.dropPickup(this.pos, Math.random() < 0.5 ? 'ring' : 'bomb');
    if (this.kind === 'hecate') { W.stage.dropPickup(this.pos, 'gold'); W.stage.say('hollin', 'Hecate is down! Outstanding flying, Lead!'); FX.explosion(this.pos, 3); }
    if (this.kind === 'chaser' && this.target && this.target.alive) {
      const w = this.target; w.chasers = Math.max(0, (w.chasers || 1) - 1);
      if (!w.chasers) { W.stage.say(w.id, pick(['Thanks, Lead! I owe you a pint — or a sonnet!', 'Clear! You are a lifesaver, Lead!', 'Phew! Parting is such sweet sorrow, Hexwings.'])); W.stage.rescued.add(w.id); }
    }
  }
}

const AI = {
  common(e, dt, st) {
    const P = st.player; e.t += dt; e.fireT -= dt; return P.s;
  },
  drone(e, dt, st) {
    const P = st.player, ps = P.s; e.t += dt; e.fireT -= dt;
    const dist = e.rs - ps;
    if (e.state === 'approach') { e.rs += (P.speed - e.closing) * dt; if (dist < e.holdDist) { e.state = 'hold'; e.holdT = rand(4, 6.5); } }
    else if (e.state === 'hold') { e.rs += (P.speed + (e.holdDist - dist) * 1.2) * dt; e.holdT -= dt; if (e.holdT <= 0) e.state = 'leave'; }
    else { e.rs += (P.speed + 70) * dt; e.ry += 6 * dt; if (dist > 280) e.alive = false, e.silent = true; }
    e.rx = e.x0 + Math.sin(e.t * e.freq + e.phase) * e.amp;
    e.ry = clamp(e.y0 + Math.cos(e.t * e.freq * 0.8 + e.phase) * e.amp * 0.5 + (e.state === 'leave' ? (e.t - (e.holdEnd || (e.holdEnd = e.t))) * 6 : 0), st.minY(e.rs), 40);
    if (e.fireT <= 0 && dist > 12 && dist < 150 && e.state !== 'leave') { e.fireT = rand(2.0, 3.4); st.enemyShoot(e, 58, 0.5); }
    if (e.noFire) e.fireT = 9;
    if (dist < -30) { e.alive = false; e.silent = true; }
  },
  swooper(e, dt, st) {
    const P = st.player; e.t += dt; e.fireT -= dt;
    e.rs += (P.speed - e.closing) * dt;
    const k = e.t * 0.9;
    e.rx = e.x0 + e.side * 40 * Math.cos(k * 1.7); e.ry = clamp(e.y0 + 6 + Math.sin(k * 2.4 + e.phase) * 7, st.minY(e.rs), 40);
    const dist = e.rs - P.s;
    if (e.fireT <= 0 && dist > 25 && dist < 120) { e.fireT = 9; st.enemyShoot(e, 66, 0.35); }
    if (dist < -40) { e.alive = false; e.silent = true; }
  },
  turret(e, dt, st) {
    const P = st.player; e.t += dt; e.fireT -= dt; const dist = e.rs - P.s;
    const head = e.mesh.userData.parts.head; head.rotation.order = 'YXZ';
    if (dist > 8 && dist < 190) {
      e.mesh.updateMatrixWorld(); const lo = e.mesh.worldToLocal(_t2.copy(P.pos));
      head.rotation.y = damp(head.rotation.y, Math.atan2(-lo.x, -lo.z), 8, dt);
      head.rotation.x = damp(head.rotation.x, clamp(Math.atan2(lo.y - 1.4, Math.hypot(lo.x, lo.z)), -0.1, 1.2), 8, dt);
    }
    if (e.fireT <= 0 && dist > 25 && dist < 160) {
      e.burst = 3; e.fireT = rand(2.6, 3.6); e.burstT = 0;
    }
    if (e.burst > 0) { e.burstT -= dt; if (e.burstT <= 0) { e.burst--; e.burstT = 0.22; st.enemyShoot(e, 56, 0.4, head.getWorldPosition(_t3)); } }
    if (dist < -40) { e.alive = false; e.silent = true; }
  },
  carTurret(e, dt, st) {
    if (e.parent && !e.parent.alive) { if (e.alive) { e.hp = 0; e.countsAsKill = false; e.die(); } return; }
    if (e.parent) { e.rs = e.parent.rs + e.dz; e.rx = e.parent.rx; }
    AI.turret(e, dt, st);
  },
  mine(e, dt, st) {
    const P = st.player; e.t += dt; e.rs += (P.speed - e.closing) * dt;
    e.ry = e.y0 + Math.sin(e.t * 1.6 + e.phase) * 1.5; e.mesh.rotation.y += dt; e.mesh.rotation.x += dt * 0.6;
    const dist = e.rs - P.s;
    if (P.alive && !P.god && P.pos.distanceTo(e.pos) < 6) { e.hp = 0; e.die(); }
    if (dist < -40) { e.alive = false; e.silent = true; }
  },
  gunship(e, dt, st) {
    const P = st.player; e.t += dt; e.fireT -= dt; const dist = e.rs - P.s;
    if (e.state === 'approach') { e.rs += (P.speed - 22) * dt; if (dist < e.holdDist) { e.state = 'hold'; e.holdT = e.big ? 80 : 24; } }
    else if (e.state === 'hold') { e.rs += (P.speed + (e.holdDist - dist) * 1.2) * dt; e.holdT -= dt; if (e.holdT <= 0) e.state = 'leave'; }
    else { e.rs += (P.speed + 60) * dt; if (dist > 260) { e.alive = false; e.silent = true; } }
    e.rx = e.x0 + Math.sin(e.t * 0.5 + e.phase) * (e.big ? 16 : 11); e.ry = clamp(e.y0 + Math.sin(e.t * 0.7) * 3, st.minY(e.rs), 30);
    e.mesh.rotation.z = 0;
    if (e.fireT <= 0 && dist > 20 && dist < 140 && e.state !== 'leave') {
      e.fireT = e.big ? 1.5 : 1.9; e.salvo = (e.salvo || 0) + 1;
      if (e.salvo % 4 === 0) { st.enemyMissile(e, e.pos); st.enemyMissile(e, e.pos); }
      else for (const a of e.big ? [-0.22, -0.11, 0, 0.11, 0.22] : [-0.16, 0, 0.16]) st.enemyShoot(e, 52, 0.15, null, a);
    }
    if (dist < -40) { e.alive = false; e.silent = true; }
  },
  hecate(e, dt, st) {
    e.big = true; AI.gunship(e, dt, st);
    if (e.hp < e.maxHp * 0.5 && !e.enraged) { e.enraged = true; st.say('maldoon', 'Out, out, brief candle! Hecate — burn them all!'); }
    if (e.enraged) { e.fireT -= dt * 0.7; }
    W.hudBoss = { name: 'HECATE GUNSHIP', hp: e.hp, max: e.maxHp };
  },
  car(e, dt, st) {
    const P = st.player; e.t += dt; e.rs += e.speedS * dt; if (e.rs - P.s < -60) { e.alive = false; e.silent = true; }
  },
  chaser(e, dt, st) {
    const w = e.target; e.t += dt; e.fireT -= dt;
    if (!w || !w.alive) { e.rs += (st.player.speed + 40) * dt; e.ry += 8 * dt; if (e.rs - st.player.s > 200) { e.alive = false; e.silent = true; } return; }
    e.rs = lerp(e.rs, w.s - 9, 1 - Math.exp(-3 * dt)); e.rx = lerp(e.rx, w.x + Math.sin(e.t * 2.1 + e.phase) * 2.5, 1 - Math.exp(-4 * dt)); e.ry = lerp(e.ry, w.y + 0.5 + Math.cos(e.t * 1.7 + e.phase), 1 - Math.exp(-4 * dt));
    e.noFlip = false;
    if (e.fireT <= 0) { e.fireT = 0.8; Bullets.spawn({ team: 'e', kind: 'orb', pos: e.pos, vel: _t1.copy(w.pos).sub(e.pos).normalize().multiplyScalar(70), dmg: 0, life: 0.6, r: 0.4, hp: 0 }); w.hurt(2.0, true); Sfx.enemyLaser(); }
  },
};
function makeEnemyAI() {
  for (const k of ['drone', 'swooper', 'turret', 'carTurret', 'mine', 'gunship', 'hecate', 'car', 'chaser']) ESPEC[k].ai = AI[k];
  ESPEC.loco.ai = AI.car;
}

class Obstacle extends Ent {
  constructor(st, kind, x, y, s, o = {}) {
    super('obstacle'); this.team = 'o'; this.solid = true; this.targetable = false; this.cols = []; this.rs = s; this.group = GRP.STATIC; this.countsAsKill = false;
    const path = st.path; const yaw = path.yaw(s); path.world(s, x, 0, this.pos);
    const base = path.p.y; // path altitude at s
    this.mesh = new THREE.Group(); Gfx.world.add(this.mesh);
    const addBox = (lx, wy, hx, hy, hz, lz = 0) => { // lateral offset, world centre y
      path.world(s + lz, x + lx, 0, _t1); _t1.y = wy;
      const q = new QT().setFromAxisAngle(_UPV, yaw);
      const d = RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(_t1.x, _t1.y, _t1.z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }).setCollisionGroups(Phys.groups(GRP.STATIC));
      const c = Phys.world.createCollider(d); Phys.colMap.set(c.handle, this); this.cols.push(c);
    };
    const place = (m, lx, wy, lz = 0) => { path.world(s + lz, x + lx, 0, _t2); m.position.set(_t2.x, wy, _t2.z); m.rotation.y = yaw; this.mesh.add(m); };
    if (kind === 'arch') {
      const w = o.w || 16, top = base + 7;
      const m = MODELS.arch(w, top + 8); place(m, 0, 8);
      addBox(-(w / 2 + 1.5), top / 2, 1.5, top / 2, 1.5); addBox(w / 2 + 1.5, top / 2, 1.5, top / 2, 1.5); addBox(0, top + 1.5, w / 2 + 3, 1.5, 1.7);
    } else if (kind === 'pylon') {
      const h = base + 30; const m = MODELS.pylon(h + 12); place(m, 0, 12);
      addBox(0, h / 2, 1.6, h / 2, 1.6);
    } else if (kind === 'beam') {
      const wy = base + y; const g = new THREE.Group();
      part(g, G.box(52, 3.2, 3), 0x6a5a68, [0, 0, 0]); part(g, G.box(52, 0.5, 3.2), 0xd8b24a, [0, 1.0, 0], { outline: false });
      for (let i = -2; i <= 2; i++) part(g, G.box(1.2, 3.4, 3.2), 0xff4a3a, [i * 10, 0, 0], { outline: false });
      place(g, 0, wy); addBox(0, wy, 26, 1.6, 1.5);
    } else if (kind === 'wall') {
      // fork wall: three blocks with two gates (A left, B right)
      const H = base + 46;
      const blocks = [[-60, -19], [-5, 5], [19, 60]];
      blocks.forEach(([a, b]) => { const cx = (a + b) / 2, hw = (b - a) / 2; const m = mesh(G.box(hw * 2, H, 8), 0x5a4a62); place(m, cx, H / 2); addBox(cx, H / 2, hw, H / 2, 4); });
      // lintels over the gates
      for (const gx of [-12, 12]) { const m = mesh(G.box(14, 12, 8), 0x6a5a68); place(m, gx, base + 40); addBox(gx, base + 40, 7, 6, 4); }
      // signs
      for (const [gx, ch, col] of [[-12, 'A', '#4ab6c4'], [12, 'B', '#ffb24a']]) {
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), new THREE.MeshBasicMaterial({ map: signTex(ch, o.names ? o.names[ch] : '', col), transparent: true }));
        place(sign, gx, base + 36.5, -4.1); sign.rotation.y = yaw; // faces the player
      }
    }
    this.mesh.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  }
  onBullet(b) { FX.burst(b.pos, 3, 8, 0.3, 0.3, 0xffffff, 0xffc040); return true; }
  damage() { return false; }
  syncBody() {} syncMesh() {}
  dispose() { for (const c of this.cols) { Phys.colMap.delete(c.handle); try { Phys.world.removeCollider(c, false); } catch (e) { /* gone */ } } this.cols = []; if (this.mesh.parent) this.mesh.parent.remove(this.mesh); }
}
function signTex(ch, name, col) {
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#140b1c'; g.fillRect(0, 0, w, h); g.fillStyle = col; g.fillRect(10, 10, w - 20, h - 20); g.fillStyle = '#140b1c';
    g.textBaseline = 'middle'; g.textAlign = 'center'; g.font = 'bold 200px Arial Black, Impact, sans-serif'; g.fillText(ch, 120, 140);
    g.textAlign = 'left'; g.font = 'bold 70px Arial Black, Impact, sans-serif'; g.fillText('ROUTE', 230, 85);
    const words = (name || '').split(' '); g.font = 'bold 46px Arial, sans-serif'; g.fillText(words[0] || '', 232, 150); g.fillText(words.slice(1).join(' '), 232, 205);
  });
}

/* ---------- pickups ---------- */
class Pickup extends Ent {
  constructor(st, kind, rs, rx, ry, o = {}) {
    super('pickup'); this.pk = kind; this.team = 'o'; this.targetable = false; this.countsAsKill = false; this.rs = rs; this.rx = rx; this.ry = ry; this.group = GRP.PICKUP; this.spin = rand(TAU);
    this.mesh = kind === 'ring' || kind === 'gold' ? MODELS.ring(kind === 'gold') : MODELS.crate(kind); Gfx.world.add(this.mesh);
    this.r = kind === 'ring' || kind === 'gold' ? 4.2 : 2.6;
    if (st.path) st.path.world(rs, rx, ry, this.pos); if (o.pos) this.pos.copy(o.pos); this.worldPos = !!o.pos;
    this.attachBall(this.r, GRP.PICKUP, true); this.life = o.life || 1e9; this.bob = rand(TAU);
    if (st.path && !o.pos) st.path.quat(rs, this.quat, false);
  }
  update(dt, st) {
    this.t += dt; this.life -= dt; this.spin += dt * 2.4;
    if (!this.worldPos) { st.path.world(this.rs, this.rx, this.ry + Math.sin(this.t * 2 + this.bob) * 0.5, this.pos); }
    if (this.pk === 'ring' || this.pk === 'gold') { this.mesh.rotation.set(0, this.spin, 0); this.mesh.quaternion.copy(this.quat); this.mesh.rotateY(this.spin * 0.2); }
    else { this.mesh.rotation.y = this.spin; this.mesh.rotation.x = Math.sin(this.t) * 0.3; }
    if ((!this.worldPos && this.rs - st.player.s < -50) || this.life <= 0) this.alive = false;
  }
  syncMesh() { this.mesh.position.copy(this.pos); }
  collect(P) {
    if (!this.alive) return; this.alive = false;
    const st = W.stage;
    if (this.pk === 'ring') { P.heal(30); Sfx.ring(); st.toast('SHIELD +30', 'good'); }
    else if (this.pk === 'gold') { P.maxHp = Math.min(160, P.maxHp + 20); P.heal(50); Sfx.ring(); st.toast('GOLD RING · MAX SHIELD UP', 'gold'); }
    else if (this.pk === 'bomb') { P.bombs = Math.min(6, P.bombs + 1); Sfx.pickup(); st.toast('NOVA BOMB +1', 'good'); }
    else if (this.pk === 'laser') { if (P.laser < 3) { P.laser++; st.toast(P.laser === 2 ? 'TWIN LASERS' : 'HYPER LASERS', 'gold'); } else { W.score += 500; st.toast('LASERS MAXED · +500', 'good'); } Sfx.pickup(); }
    FX.burst(this.pos, 18, 22, 0.6, 0.7, 0xffffff, this.pk === 'gold' ? 0xffd23a : 0x7ad8ff, { drag: 2 });
    for (const w of W.allies) if (w.alive && (this.pk === 'ring' || this.pk === 'gold')) w.hp = Math.min(w.maxHp, w.hp + 20);
    W.score += 50;
  }
}

/* ---------- the player ship (rail) ---------- */
class RailPlayer extends Ent {
  constructor(st) {
    super('player'); this.team = 'p'; this.st = st; this.targetable = false;
    this.s = 0; this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.maxHp = this.hp = 100; this.bombs = 3; this.boost = 1; this.boostLock = 0; this.laser = 1;
    this.speed = st.def.speed; this.speedMul = 1; this.rolling = 0; this.rollDir = 1; this.rollCd = 0; this.invuln = 0; this.fireCd = 0; this.chargeT = 0; this.locks = []; this.lockScan = 0; this.volley = []; this.firedLock = false; this.bombedOnce = false;
    this.mesh = MODELS.ship(); this.ship = this.mesh; Gfx.world.add(this.mesh); this.parts = this.mesh.userData.parts;
    this.visRoll = 0; this.visPitch = 0; this.visYaw = 0; this.alive = true; this.god = false; this.dead = false; this.deadT = 0; this.sideBias = 0; this.fireSide = 1; this.chargeVis = null; this.group = GRP.PLAYER;
    this.attachBall(1.3, GRP.PLAYER); this.winCx = 0; this.winW = 17; this.lastHurt = 0; this.gravity = 0; this.tilt = new QT();
    this.chargeRing = new THREE.Mesh(G.tor(2.4, 0.08, 4, 28), new THREE.MeshBasicMaterial({ color: 0x7dffb0, transparent: true, opacity: 0.8 })); this.chargeRing.visible = false; this.mesh.add(this.chargeRing);
    this.trailT = 0; this.aimFwd = new V3(0, 0, -1); this.aimRight = new V3(1, 0, 0);
  }
  heal(v) { this.hp = Math.min(this.maxHp, this.hp + v); }
  onBullet(b) { if (b.team === 'e') { this.hurt(b.dmg || 0); return true; } return false; }
  hurt(d, from, collision = false) {
    if (!this.alive || this.god) return false;
    if (this.rolling > 0 && !collision) return false;
    if (this.invuln > 0) return false;
    this.hp -= d; this.invuln = collision ? 1.3 : 0.55; this.hitFlash = 1; W.addShake(collision ? 0.7 : 0.35); W.hudHurt = 1; Sfx.hurt(); Input.rumble(0.8, 1, 260);
    FX.burst(this.pos, 10, 14, 0.5, 0.5, 0xffffff, 0xff6a3a);
    if (this.hp <= 0) { this.hp = 0; this.die(); }
    return true;
  }
  die() {
    this.alive = false; this.dead = true; FX.explosion(this.pos, 2.4); FX.explosion(_t1.copy(this.pos).add(_t2.set(rand(-3, 3), rand(-2, 2), rand(-3, 3))), 1.4); Sfx.explode(3); W.addShake(1.2); this.mesh.visible = false; Debris.burst(this.pos, 10, 0xe8e4f0, 0.5);
    Sfx.setEngine(false, 0); Input.rumble(1, 1, 600);
  }
  update(dt, c, st) {
    if (this.dead) { this.deadT += dt; return; }
    this.t += dt; this.invuln = Math.max(0, this.invuln - dt); this.fireCd -= dt; this.rollCd -= dt;
    const intro = st.introT > 0, lock = st.cinematic || intro && st.introT > 1.1;
    const cx = lock ? 0 : c.x, cy = lock ? 0 : c.y;
    // ----- lateral movement -----
    const maxVx = 27 * Settings.sens, maxVy = 21 * Settings.sens;
    this.vx = damp(this.vx, cx * maxVx + (this.rolling > 0 ? this.rollDir * 22 * Math.max(0, this.rolling / 0.65) : 0), 9, dt);
    this.vy = damp(this.vy, -cy * maxVy, 9, dt);
    this.x += this.vx * dt; this.y += this.vy * dt;
    const lane = st.laneCenter(this.s); this.winCx = damp(this.winCx, lane, 4, dt);
    const top = 10, bot = -12;
    const yMin = Math.max(bot, st.minY(this.s) - st.pathY(this.s) + 1.3);
    this.x = clamp(this.x, this.winCx - this.winW, this.winCx + this.winW);
    if (this.y > top) { this.y = top; this.vy = Math.min(this.vy, 0); }
    if (this.y < yMin) { this.y = yMin; this.vy = Math.max(this.vy, 0); }
    // ----- speed: boost / brake -----
    let mul = 1;
    if (!lock) {
      if (c.boost && this.boost > 0.02 && this.boostLock <= 0 && !c.brake) { mul = 1.75; this.boost = Math.max(0, this.boost - 0.4 * dt); if (this.boost <= 0.02) this.boostLock = 1.2; if (!this.boosting) { this.boosting = true; Sfx.boost(); } }
      else { this.boosting = false; this.boost = Math.min(1, this.boost + (c.brake ? 0.5 : 0.2) * dt); }
      if (c.brake && !c.boost) { mul = 0.52; if (!this.braking) { this.braking = true; Sfx.brake(); } } else this.braking = false;
    }
    this.boostLock -= dt;
    if (intro) mul = Math.max(mul, 1 + st.introT * 0.5);
    this.speedMul = damp(this.speedMul, mul, 4, dt); this.speed = st.baseSpeed * this.speedMul;
    if (!st.freezeRail) this.s += this.speed * dt;
    // ----- barrel roll -----
    if (!lock && this.rolling <= 0 && this.rollCd <= 0 && (c.rollLDown || c.rollRDown)) { this.rolling = 0.65; this.rollDir = c.rollLDown ? -1 : 1; this.rollCd = 0.35; this.rollTotal = 0.65; Sfx.roll(); W.rolledOnce = true; }
    if (this.rolling > 0) {
      this.rolling -= dt; this.visRoll = -this.rollDir * easeInOut(1 - Math.max(0, this.rolling) / 0.65) * TAU;
      this.deflect(st); if (this.rolling <= 0) this.visRoll = 0;
    }
    // ----- transform -----
    st.path.world(this.s, this.x, this.y, this.pos);
    st.path.quat(this.s, this.quat, false);
    this.visYaw = damp(this.visYaw, -this.vx * 0.012, 8, dt); this.visPitch = damp(this.visPitch, this.vy * 0.012, 8, dt);
    this.bankV = damp(this.bankV || 0, -this.vx * 0.032, 7, dt);
    _te.set(this.visPitch, this.visYaw, this.bankV + this.visRoll, 'ZYX'); _tq.setFromEuler(_te); this.tilt.copy(this.quat).multiply(_tq);
    // wings: flex on boost, fold on brake
    const wingTarget = this.boosting ? 0.5 : this.braking ? -0.35 : 0;
    this.parts.wingL.rotation.z = damp(this.parts.wingL.rotation.z, -wingTarget * 0.5 + Math.sin(this.t * 6) * 0.015, 8, dt); this.parts.wingR.rotation.z = -this.parts.wingL.rotation.z;
    const fl = (this.boosting ? 2.0 : this.braking ? 0.4 : 1) * (0.9 + Math.sin(this.t * 40) * 0.1);
    this.parts.flame1.scale.set(1, 1, fl); this.parts.flame2.scale.set(1, 1, fl);
    this.mesh.visible = !(this.invuln > 0 && Math.floor(this.t * 20) % 2 === 0);
    // ----- weapons -----
    st.path.frame(this.s); this.aimFwd.copy(st.path.t); this.aimRight.copy(st.path.r);
    if (!lock) this.weapons(dt, c, st);
    this.syncBody();
    // ----- collisions with solids / pickups / enemies -----
    Phys.overlapBall(this.pos, 1.15, GRP.STATIC | GRP.ENEMY | GRP.PICKUP, (e) => {
      if (!e || !e.alive) return true;
      if (e instanceof Pickup) { e.collect(this); return true; }
      if (e.solid) { this.hurt(26, e.pos, true); this.bump(st); return true; }
      if (e.team === 'e' && e.kind !== 'mine') { if (this.hurt(18, e.pos, true)) { if (e.hp < 100 && e.kind !== 'hecate' && !e.isBoss) e.damage(4, { pos: this.pos }); this.bump(st); } }
      return true;
    });
    if (this.pos.y < 2.2) { this.hurt(20, this.pos, true); this.y += 4; this.vy = 8; }
    W.hudHeat = this.boost;
    Sfx.setEngine(true, (this.speedMul - 0.4) / 1.4, this.boosting);
    // engine trail
    this.trailT -= dt; if (this.trailT <= 0) { this.trailT = 0.04; const o = _t1.set(0, 0, 2.9).applyQuaternion(this.tilt).add(this.pos); FX.spawn(o, _t2.set(0, 0, 0), this.boosting ? 0.34 : 0.2, 0.28, 0xffe08a, 0xff4a2a, { drag: 1 }); }
  }
  bump(st) { this.vx = -sign(this.vx || 1) * 14; this.vy = this.vy > 0 ? -8 : 8; }
  deflect(st) {
    for (const b of W.bullets) {
      if (!b.alive || b.team !== 'e' || b.kind === 'laser') continue;
      if (b.pos.distanceToSquared(this.pos) < 7.5 * 7.5) {
        b.team = 'p'; b.fromPlayer = true; b.vel.multiplyScalar(-1.2).add(_t1.set(rand(-8, 8), rand(-8, 8), rand(-8, 8))); b.dmg = Math.max(b.dmg, 3); b.life = 2; b.hp = 0;
        b.mesh.children.forEach((m) => m.material && m.material.color && m.material.color.set && m !== b.mesh && 0);
        FX.burst(b.pos, 6, 14, 0.4, 0.3, 0xffffff, 0x7dffb0); Sfx.deflect(); W.score += 20; W.deflected = (W.deflected || 0) + 1;
      }
    }
  }
  weapons(dt, c, st) {
    // forward direction used for shots (rail tangent, or heading in all-range mode)
    const fwd = _t3.copy(this.aimFwd), RT = this.aimRight;
    // lasers
    if (c.fire && !c.charge && this.fireCd <= 0) {
      this.fireCd = this.laser >= 3 ? 0.09 : 0.12;
      const muzzle = (side) => _t1.copy(this.pos).addScaledVector(RT, side * 1.05).addScaledVector(fwd, -0.5);
      const shoot = (side, kind, dmg) => { const dir = st.aimAssist(muzzle(side), fwd); Bullets.spawn({ team: 'p', kind, pos: muzzle(side), vel: dir.multiplyScalar(210).addScaledVector(fwd, this.speed * 0.3), dmg, life: 1.3, r: 0.55, fromPlayer: true }); };
      if (this.laser === 1) { this.fireSide *= -1; shoot(this.fireSide * 0.6, 'laser', 1); }
      else if (this.laser === 2) { shoot(-1, 'laser2', 1); shoot(1, 'laser2', 1); }
      else { shoot(-1.4, 'laser2', 1.2); shoot(1.4, 'laser2', 1.2); shoot(0, 'laser2', 1.2); }
      Sfx.laser(this.laser);
    }
    // charge / lock-on
    if (c.charge) {
      if (this.chargeT === 0) Sfx.charge();
      this.chargeT = Math.min(2.4, this.chargeT + dt); this.lockScan -= dt;
      if (this.lockScan <= 0 && this.locks.length < 6) {
        this.lockScan = 0.1;
        let best = null, bd = 1e9;
        for (const e of W.ents) {
          if (!st.lockable(e) || this.locks.includes(e)) continue;
          _t1.copy(e.pos).sub(this.pos); const d = _t1.length(); if (d > 220 || d < 8) continue;
          const ang = _t1.normalize().angleTo(fwd); if (ang > 0.55) continue;
          if (ang * 100 + d * 0.1 < bd) { bd = ang * 100 + d * 0.1; best = e; }
        }
        if (best) { this.locks.push(best); Sfx.lock(); }
      }
      this.chargeRing.visible = true; this.chargeRing.scale.setScalar(0.6 + Math.sin(this.t * 30) * 0.05 + this.chargeT * 0.3); this.chargeRing.rotation.x += dt * 8;
    } else {
      if (c.chargeUp || this.chargeT > 0) {
        this.releaseCharge(st, fwd);
      }
      this.chargeRing.visible = false;
    }
    // volley queue
    for (let i = this.volley.length - 1; i >= 0; i--) {
      const v = this.volley[i]; v.t -= dt;
      if (v.t <= 0) { this.volley.splice(i, 1); if (v.e.alive) { Bullets.spawn({ team: 'p', kind: 'homing', pos: this.pos, vel: _t1.set(rand(-1, 1), rand(0.2, 1), -0.2).applyQuaternion(this.quat).multiplyScalar(60).addScaledVector(fwd, 60), dmg: 5, life: 3, r: 0.8, target: v.e, turn: 7, fromPlayer: true }); Sfx.missile(); } }
    }
    // bombs
    if (c.bombDown && this.bombs > 0 && !st.cinematic) this.bomb(st);
  }
  releaseCharge(st, fwd) {
    const t = this.chargeT; this.chargeT = 0;
    if (t < 0.12) { this.locks = []; return; }
    if (this.locks.length) {
      this.locks.forEach((e, i) => this.volley.push({ e, t: i * 0.06 })); this.firedLock = true;
    } else if (t > 1.0) {
      Bullets.spawn({ team: 'p', kind: 'charge', pos: this.pos, vel: fwd.clone().multiplyScalar(130), dmg: 14, life: 2.2, r: 2.4, pierce: true, fromPlayer: true }); Sfx.bomb(); W.addShake(0.2); this.firedLock = true;
    }
    this.locks = [];
  }
  bomb(st) {
    this.bombs--; this.bombedOnce = true; W.addShake(1.0); W.hitstop = 0.18; W.flashWhite = 1; Sfx.bomb(); Input.rumble(1, 1, 500);
    FX.flash(this.pos, 40, 0.7, 0xfff0c0); FX.ring(this.pos, 90, 0.8, 0xffd080); FX.ring(this.pos, 60, 0.6, 0xffffff);
    FX.burst(this.pos, 80, 90, 1.6, 1.2, 0xfff2a0, 0xe03a1a, { drag: 1.5 });
    this.invuln = Math.max(this.invuln, 1.0);
    Bullets.aoe(this.pos, 85, 30, { fromPlayer: true });
    for (const e of W.ents) if (e.alive && e.team === 'e' && e.pos.distanceTo(this.pos) < 85 + e.r && e.kind !== 'boss') { /* handled by aoe */ }
  }
}

/* ---------- wingmen ---------- */
class Wingman extends Ent {
  constructor(st, def, idx) {
    super('wing'); this.team = 'p'; this.id = def.id; this.def = def; this.targetable = false; this.countsAsKill = false; this.group = GRP.ALLY;
    this.maxHp = this.hp = 90; this.chasers = 0; this.s = st.player.s + def.os; this.x = def.ox; this.y = def.oy; this.t = rand(10); this.fireT = rand(1, 2); this.callT = 0; this.vx = 0;
    this.mesh = MODELS.ship(def.color); Gfx.world.add(this.mesh); this.parts = this.mesh.userData.parts; this.bank = 0; this.lastX = this.x;
    st.path.world(this.s, this.x, this.y, this.pos); this.attachBall(1.6, GRP.ALLY);
  }
  hurt(d, quiet) {
    if (!this.alive) return; this.hp -= d; this.pulse = quiet ? 0.2 : 1;
    if (this.hp <= 0) this.die();
  }
  onBullet(b) { if (b.team === 'e') { this.hurt(b.dmg || 4); return true; } return false; }
  damage(d) { this.hurt(d); return false; }
  die() {
    if (!this.alive) return; this.alive = false; FX.explosion(this.pos, 1.8); Sfx.explode(2); W.addShake(0.4);
    W.stage.say(this.id, pick(['I\'m hit! Eject, eject — tell Command I fought well!', 'Goodnight, sweet prince... ahhh!', 'Lead, I can\'t hold her! Signing off!']));
    W.stage.lost.add(this.id);
  }
  update(dt, st) {
    const P = st.player; this.t += dt; this.fireT -= dt;
    const panic = this.chasers > 0;
    const tx = clamp(P.x + this.def.ox * (panic ? 0.4 : 1) + Math.sin(this.t * (panic ? 2.6 : 0.8) + this.def.ox) * (panic ? 9 : 3), P.winCx - 30, P.winCx + 30);
    const ty = clamp(P.y + this.def.oy + Math.cos(this.t * (panic ? 2.2 : 0.7)) * (panic ? 4 : 1.5), st.minY(this.s) - st.pathY(this.s) + 1.5, 11);
    this.x = damp(this.x, tx, 2.2, dt); this.y = damp(this.y, ty, 2.2, dt);
    this.s = damp(this.s, P.s + this.def.os + (P.speedMul - 1) * 6, 3, dt);
    st.path.world(this.s, this.x, this.y, this.pos); st.path.quat(this.s, this.quat, false);
    const vx = (this.x - this.lastX) / Math.max(dt, 1e-4); this.lastX = this.x; this.bank = damp(this.bank, -vx * 0.04, 6, dt);
    _te.set(0, 0, this.bank); _tq.setFromEuler(_te); this.quat.multiply(_tq);
    this.parts.flame1.scale.z = this.parts.flame2.scale.z = 0.9 + Math.sin(this.t * 40) * 0.1;
    if (panic) { this.callT -= dt; if (this.callT <= 0) { this.callT = 7; Sfx.alarm(); } }
    // wingman fire
    if (this.fireT <= 0 && !panic) {
      let tgt = null, bd = 1e9;
      for (const e of W.ents) { if (!st.lockable(e)) continue; const rc = st.relCoords(e.pos); const ds = rc.ds - this.def.os; if (ds < 12 || ds > 130) continue; const d = Math.abs(rc.x - this.x) + Math.abs(rc.y - this.y) + ds * 0.2; if (d < bd) { bd = d; tgt = e; } }
      if (tgt) { this.fireT = rand(0.35, 0.8); const dir = _t1.copy(tgt.pos).sub(this.pos).normalize(); Bullets.spawn({ team: 'p', kind: 'ally', pos: this.pos, vel: dir.multiplyScalar(170), dmg: 0.8, life: 1, r: 0.55 }); }
      else this.fireT = 0.4;
    }
    this.syncBody();
  }
}

/* ---------- the boss: Thane Express ---------- */
class BossPart extends Ent {
  constructor(boss, name, local, r, hp, bombScale = 1) {
    super('bosspart'); this.boss = boss; this.pname = name; this.local = local; this.hp = this.maxHp = hp; this.team = 'e'; this.countsAsKill = false; this.score = 800; this.bombScale = bombScale; this.active = true; this.debrisColor = 0x8a2f3a; this.deathSize = 1.6;
    this.attachBall(r, GRP.ENEMY); this.mesh = null;
  }
  update() { const m = this.boss.mesh; this.pos.copy(this.local).applyMatrix4(m.matrixWorld); this.syncBody(); }
  damage(d, src) {
    if (!this.active) { FX.burst(src && src.pos || this.pos, 3, 12, 0.3, 0.3, 0xffffff, 0xaaaaaa); Sfx.deflect(); return false; }
    return super.damage(d, src);
  }
  onDeath() { this.boss.partDown(this); }
}
class BossBody extends Ent {
  constructor(boss) { super('bossbody'); this.boss = boss; this.team = 'e'; this.countsAsKill = false; this.targetable = false; this.hp = 1e9; this.pos.copy(boss.pos); this.attachBox(8, 8.6, 22, GRP.ENEMY, false); }
  update() { this.pos.copy(this.boss.pos).add(_t1.set(0, 8.6, 0)); this.quat.copy(this.boss.quat); this.syncBody(); }
  damage(d, src) { FX.burst(src && src.pos || this.pos, 2, 10, 0.25, 0.25, 0xffffff, 0xaaaaaa); Sfx.deflect(); return false; }
  onBullet(b) { FX.burst(b.pos, 3, 10, 0.3, 0.3, 0xffffff, 0xffc040); Sfx.deflect(); return true; }
}
class Boss extends Ent {
  constructor(st) {
    super('boss'); this.isBoss = true; this.st = st; this.team = 'e'; this.targetable = false; this.countsAsKill = false; this.r = 0;
    this.mesh = MODELS.bossLoco(); this.mesh.scale.setScalar(2.0); this.baseScale = 2.0; Gfx.world.add(this.mesh); this.parts = this.mesh.userData.parts;
    this.rs = st.player.s + 150; this.rx = 0; this.phase = 1; this.t = 0; this.fireT = 3; this.salvoT = 6; this.openT = 0; this.dead = false; this.hp = 1; this.intro = 0;
    this.podL = new BossPart(this, 'podL', new V3(-4.9, 6.9, -1.5), 3.6, 45, 0.5); this.podR = new BossPart(this, 'podR', new V3(4.9, 6.9, -1.5), 3.6, 45, 0.5);
    this.core = new BossPart(this, 'core', new V3(0, 8.9, 8), 3.4, 90, 0.4); this.core.active = false; this.core.score = 5000; this.core.countsAsKill = true;
    this.body = null; this.bodyEnt = new BossBody(this);
    for (const p of [this.podL, this.podR, this.core, this.bodyEnt]) W.add(p);
    this.total = 45 + 45 + 90; this.pos.set(0, 0, 0); this.smokeT = 0; this.rush = 0; this.spawnedAdds = false; this.deathT = 0;
    W.boss = this; this.fireSide = 0;
  }
  partDown(p) {
    W.hits += 1; W.score += p.score; const st = this.st;
    if (p === this.core) { this.finish(); return; }
    if (!this.podL.alive && !this.podR.alive) { this.phase = 2; this.openT = 0; st.say('hollin', 'Both cannons are down! The reactor is exposed — hit it with everything!'); Sfx.warn(); st.banner('REACTOR EXPOSED', ''); }
    else st.say(pick(['rook', 'tansy', 'bram']), 'One cannon down! Keep the pressure on!');
  }
  finish() {
    this.dead = true; this.deathT = 0; const st = this.st; st.say('maldoon', 'Is this... a dagger... I see... before me...?'); st.onBossDefeated();
    for (const b of W.bullets) if (b.alive && b.team === 'e') Bullets.kill(b, 0xffffff);
  }
  update(dt, st) {
    const P = st.player; this.t += dt;
    if (!this.dead) {
      this.intro = Math.min(1, this.intro + dt / 4);
      const distT = this.phase === 2 && this.rush > 0 ? 34 : 66;
      const dist = distT + Math.sin(this.t * 0.4) * 6;
      this.rs = damp(this.rs, P.s + dist, this.intro < 1 ? 1.2 : 2.5, dt) + (this.intro < 1 ? 0 : 0);
      if (this.intro < 1) this.rs = lerp(P.s + 190, P.s + dist, easeOut(this.intro));
      this.rx = Math.sin(this.t * 0.35) * (this.phase === 1 ? 14 : 9);
      st.path.world(this.rs, this.rx, 0, this.pos); this.pos.y = 0;
      st.path.quat(this.rs, this.quat, false); this.mesh.position.copy(this.pos); this.mesh.quaternion.copy(this.quat); this.mesh.updateMatrixWorld(true);
      // pods track the player
      for (const [p, h] of [[this.podL, this.parts.headL], [this.podR, this.parts.headR]]) if (p.alive) { const lo = this.mesh.worldToLocal(_t1.copy(P.pos)).sub(h.parent.position).sub(h.position); h.rotation.y = clamp(Math.atan2(-lo.x, -lo.z), -1.4, 1.4); }
      // plates open in phase 2
      const open = this.phase === 2 ? Math.min(1, (this.openT += dt) / 1.5) : 0;
      this.parts.plateL.rotation.z = open * 1.4; this.parts.plateR.rotation.z = -open * 1.4;
      this.parts.core.scale.setScalar(1 + Math.sin(this.t * 6) * 0.15 * (open > 0.9 ? 1 : 0));
      if (open >= 1) this.core.active = true;
      this.smokeT -= dt; if (this.smokeT <= 0) { this.smokeT = 0.1; const sp = this.parts.smoke.getWorldPosition(_t1); FX.spawn(sp, _t2.set(rand(-1, 1), 8, rand(-1, 1)), 3.5, 1.6, 0x6a5a68, 0x2a2430, { drag: 0.5, grow: 1.2 }); }
      // attacks
      this.fireT -= dt; this.salvoT -= dt;
      if (this.intro >= 1) {
        if (this.phase === 1) {
          if (this.fireT <= 0) { this.fireT = 1.6; const pods = [this.podL, this.podR].filter((p) => p.alive); if (pods.length) { const p = pods[(this.fireSide++) % pods.length]; for (const a of [-0.12, 0, 0.12]) st.enemyShoot(p, 60, 0.15, p.pos, a); } }
          if (this.salvoT <= 0) { this.salvoT = 7; for (let i = 0; i < 4; i++) setTimeout(() => { if (!this.dead && W.stage === st) st.enemyMissile(this, this.parts.smoke.getWorldPosition(new V3())); }, i * 250); st.say('hollin', 'Missiles incoming — shoot them down or roll through them!'); }
        } else {
          if (this.fireT <= 0) { this.fireT = 1.1; for (const a of [-0.3, -0.15, 0, 0.15, 0.3]) st.enemyShoot(this.core, 56, 0.1, this.core.pos, a); }
          if (this.salvoT <= 0) { this.salvoT = 6; for (let i = 0; i < 5; i++) setTimeout(() => { if (!this.dead && W.stage === st) st.enemyMissile(this, this.parts.smoke.getWorldPosition(new V3())); }, i * 220); this.rush = 2.5; }
          if (this.rush > 0) this.rush -= dt;
          if (!this.spawnedAdds && this.core.hp < this.core.maxHp * 0.5) { this.spawnedAdds = true; st.say('maldoon', 'Wither, Birnam Wing! Hexwings — to arms!'); st.spawnWave({ kind: 'drone', n: 5, form: 'v', x: 0, y: 4 }, P.s + 100); }
        }
      }
      W.hudBoss = { name: 'THANE EXPRESS', hp: (this.podL.alive ? this.podL.hp : 0) + (this.podR.alive ? this.podR.hp : 0) + (this.phase === 2 ? this.core.hp : this.core.maxHp), max: this.total };
    } else {
      this.deathT += dt; this.mesh.position.y -= dt * 0.4; this.mesh.rotation.z += dt * 0.02;
      if (Math.random() < dt * 14) { const p = _t1.set(rand(-6, 6), rand(2, 20), rand(-22, 22)).applyMatrix4(this.mesh.matrixWorld); FX.explosion(p, rand(1, 2.2)); Sfx.explode(2); W.addShake(0.3); }
      W.hudBoss = null;
      if (this.deathT > 4.5 && !this.gone) { this.gone = true; FX.explosion(this.pos.clone().setY(12), 5); Sfx.explode(4); W.addShake(1.5); W.flashWhite = 1; this.mesh.visible = false; Debris.burst(this.pos.clone().setY(10), 30, 0x8a2f3a, 1.8); }
    }
    for (const p of [this.podL, this.podR, this.core, this.bodyEnt]) if (p.alive) p.update();
  }
  dispose() { for (const p of [this.podL, this.podR, this.core, this.bodyEnt]) { p.alive = false; } if (this.mesh.parent) this.mesh.parent.remove(this.mesh); }
}
