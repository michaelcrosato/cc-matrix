// ---- enemies: one archetype record each (a new enemy is one entry); separation, drops; painters read e.rs only ----
// Archetype: { kind, name, hp, speed, r, contact, cash, rat, drops, counted, make(world, e, o), update(e, dt, world), draw(r, e, t, world) }
const ENEMIES = MT.ENEMIES = {};
const foeSpeed = () => MT.T.enemySpeed * diffOf().enemySpeed;
const bulletSpd = v => v * MT.T.enemyBulletSpeed * diffOf().enemyBullet;
const PALETTE = { goon: ['#3a4a6a', '#ffcc33', '#e0b090', '#ffffff'], clapbot: ['#9aa4b8', '#ff3344', '#d8e0f0', '#ffcc33'], popper: ['#ffcc33', '#ff2e88', '#2ee6ff', '#ffffff'],
  mime: ['#ffffff', '#141018', '#d02a3a'], disco: ['#c8d0e0', '#ff2e88', '#2ee6ff', '#ffcc33'], heckler: ['#d02a3a', '#fff7e8', '#ff9a3c'], hecklerKing: ['#7a2ad0', '#ffcc33', '#fff7e8'],
  tank: ['#4a4458', '#ffcc33', '#ff3344'], snake: ['#2a2838', '#ffcc33', '#ff2e88'], snakeSeg: ['#2a2838', '#ffcc33'], brute: ['#9a6a3a', '#ffcc33', '#d02a3a'], crate: ['#c87830', '#ffcc33'], lock: ['#c8d0e0', '#ff3344'], paparazzo: ['#b89a6a', '#ffffff'] };
MT.PALETTE = PALETTE;
function nearestContestant(world, e, maxD = 1e9) {
  let best = null, bd = maxD * maxD;
  for (const c of world.contestants) { if (!c.targetable) continue; const d = dist2(c, e); if (d < bd) { bd = d; best = c; } }
  return best;
}
MT.nearestContestant = nearestContestant;
function walkToward(e, tx, ty, sp, dt, wob = 0) {
  const a = Math.atan2(ty - e.y, tx - e.x) + wob;
  e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp; e.face = a;
}
const humanDraw = (o = {}) => (r, e, t) => {
  const s = e.rs; if (!e.rig) e.rig = ENEMY_RIGS[e.rigKind || e.kind]();
  r.shadow(s.x, s.y, e.r * .9, .45);
  r.actor(s.x, s.y, s.z, (g, ox, oy) => e.rig.draw(g, ox, oy, r.view), { flash: s.flash > 0 ? '#ffffff' : false, alpha: s.alpha, every: o.every && !s.flash ? 2 : undefined, key: e, outline: o.outline !== false });
};
// ------------------------------------------------------------------- goon
ENEMIES.goon = { kind: 'goon', name: 'STUDIO SECURITY', hp: 1, speed: 52, r: 6, contact: 1, cash: 100, rat: 1, drops: { bill: .08, capsule: .012, prize: .01 }, counted: true,
  make(world, e) { e.speed = (52 + (RNG.spawn() * 12 - 6)); e.wob = (RNG.spawn() - .5) * .9; e.atk = new E.Attack('bash', { wind: .3, active: .1, recover: .3 }); e.state = 'walk'; },
  update(e, dt, world) {
    const c = e.target = nearestContestant(world, e); const ph = e.atk.update(dt);
    if (e.atk.busy) { e.vx = e.vy = 0; e.state = e.atk.phase === 'wind' ? 'wind' : 'swing';
      if (e.atk.phase === 'active' && c && !e.swingHit && dist(c, e) < 14 + c.r + e.r - 4) { e.swingHit = true; world.hurtContestant(c, MT.T.contactDmg, { kind: 'goon', id: e.id, x: e.x, y: e.y }); }
      if (ph === 'active' && !world.quietFx) MT.sfx('baton');
      return; }
    e.state = 'walk';
    if (!c) { e.vx = e.vy = 0; return; }
    const d = dist(c, e);
    if (d < 16 + c.r) { e.atk.start(); e.swingHit = false; e.face = angTo(e, c); return; }
    walkToward(e, c.x, c.y, e.speed * foeSpeed(), dt, d > 40 ? e.wob * Math.sin(e.t * 1.3 + e.id) : 0);
  },
  rigState(e) { return { attack: e.atk ? e.atk.state : null, stance: 'ready' }; },
  draw: humanDraw({ every: true }) };
// ------------------------------------------------------------------- clapbot
ENEMIES.clapbot = { kind: 'clapbot', name: 'APPLAUSE ROBOT', hp: 1, speed: 115, r: 5.5, contact: 1, cash: 150, rat: 1, drops: { bill: .1 }, counted: true,
  make(world, e) { e.hopT = RNG.spawn() * .4; e.state = 'rest'; },
  update(e, dt, world) {
    const c = e.target = nearestContestant(world, e); e.hopT -= dt;
    if (e.state === 'hop') { if (e.hopT <= 0) { e.state = 'rest'; e.hopT = .4; e.vx *= .1; e.vy *= .1; } }
    else { e.vx = e.vy = 0; if (e.hopT <= 0 && c) { const a = angTo(e, c) + (RNG.ai() - .5) * 1.4; const sp = 115 * foeSpeed(); e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp; e.face = a; e.state = 'hop'; e.hopT = .25; if (!world.quietFx && RNG.fx() < .3) MT.sfx('hop'); } }
  },
  draw(r, e, t) {
    const s = e.rs; if (!e.rig) e.rig = ENEMY_RIGS.clapbot();
    const b = e.rig; if (!MT.cfg.skipRigs) { b.update(1 / 60, { squash: s.state === 'rest' ? -.3 : .25, look: [Math.cos(s.face), Math.sin(s.face)] }); }
    const hop = s.state === 'hop' ? 5 : 0;
    r.shadow(s.x, s.y, 5, .45);
    r.actor(s.x, s.y, s.z + hop, (g, ox, oy) => { b.draw(g, ox, oy, r.view); const k = Math.abs(Math.sin(t * 14 + e.id)); for (const sd of [-1, 1]) { const hx = ox + sd * (4 + k * 3), hy = oy - 8; px.rect(g, hx - 1.5, hy - 3, 3, 5, '#d8e0f0'); px.rect(g, hx - 1.5, hy - 3, 3, 1, '#ffffff'); } px.line(g, ox, oy - 14, ox, oy - 18, '#9aa4b8'); px.dot(g, ox, oy - 19, Math.floor(t * 4 + e.id) % 2 ? '#ff3344' : '#ffcc33'); }, { flash: s.flash > 0 ? '#ffffff' : false, every: s.flash ? undefined : 2, key: e });
  } };
// ------------------------------------------------------------------- popper
ENEMIES.popper = { kind: 'popper', name: 'PARTY POPPER', hp: 2, speed: 38, r: 6, contact: 0, cash: 250, rat: 2, drops: { stack: .1, capsule: .03 }, counted: true,
  make(world, e) { e.state = 'walk'; e.fuse = 0; },
  update(e, dt, world) {
    const c = e.target = nearestContestant(world, e);
    if (e.state === 'fuse') { e.vx = e.vy = 0; e.fuse += dt; if (e.fuse >= .6) { world.killEnemy(e, { owner: null, w: 'fuse', self: true }); } return; }
    if (!c) { e.vx = e.vy = 0; return; }
    if (dist(c, e) < 18 + c.r) { e.state = 'fuse'; e.fuse = 0; if (!world.quietFx) MT.sfx('hiss'); return; }
    walkToward(e, c.x, c.y, 38 * foeSpeed(), dt, Math.sin(e.t * 5) * .4);
  },
  onDeath(e, world) { for (let i = 0; i < 8; i++) world.fireFoe('shard', e.x, e.y, i / 8 * TAU + e.id, bulletSpd(90), { life: 1.2 }); if (!world.quietFx) MT.sfx('pop'); },
  rigState(e) { return { pose: e.state === 'fuse' ? 'cheer' : null, expr: e.state === 'fuse' ? 'shout' : null }; },
  draw(r, e, t) {
    humanDraw()(r, e, t); const s = e.rs;
    if (s.state === 'fuse') { const k = s.t2 || 0; r.queue(s.x, s.y, 24, g => { const [sx, sy] = r.w(s.x, s.y, 26 + k * 6); px.disc(g, sx, sy, 2 + Math.random() * 2, Math.floor(t * 20) % 2 ? '#ffcc33' : '#ff3344'); }, { emissive: true }); r.decal(() => r.groundRing(s.x, s.y, 18 + 6 * k, '#ff3344', .7)); }
  } };
// ------------------------------------------------------------------- mime (doesn't count for the clear)
ENEMIES.mime = { kind: 'mime', name: 'LAND MIME', hp: 1, speed: 0, r: 6, contact: 0, cash: 300, rat: 2, drops: { bill: .3 }, counted: false,
  make(world, e) { e.state = 'idle'; e.tele = 0; e.alpha = .45; e.face = Math.PI / 2; },
  update(e, dt, world) {
    e.vx = e.vy = 0;
    const c = nearestContestant(world, e, 34);
    if (e.state === 'idle') { if (c) { e.state = 'tele'; e.tele = 0; } }
    else { e.tele += dt; if (Math.floor(e.tele * 8) !== Math.floor((e.tele - dt) * 8) && !world.quietFx) MT.sfx('beep'); if (e.tele >= .7) { world.explodeFoe(e.x, e.y, 36, 1, 'mime', e.id); world.killEnemy(e, { owner: null, w: 'blast', self: true, noCash: true }); } }
  },
  rigState(e) { return { pose: null }; },
  draw(r, e, t) {
    const s = e.rs; if (!e.rig) { e.rig = ENEMY_RIGS.mime(); mimeBox(e.rig, e); }
    const shake = s.state === 'tele' ? (Math.random() - .5) * 2.5 : 0;
    r.shadow(s.x, s.y, 5, .35);
    r.actor(s.x + shake, s.y, s.z, (g, ox, oy) => e.rig.draw(g, ox, oy, r.view), { flash: s.flash > 0 || (s.state === 'tele' && Math.floor(t * 16) % 2) ? '#ffffff' : false, alpha: s.state === 'tele' ? 1 : .45 });
    if (s.state === 'tele') r.decal(() => r.groundRing(s.x, s.y, 36, '#ff3344', .8));
  } };
/** the mime's "trapped in a box": after the rig solves its pose, the hands go flat against invisible walls */
function mimeBox(rig, e) {
  const base = rig.solvePose;
  rig.solvePose = function () {
    base.call(this);
    const J = this.J, k = this._mt = (this._mt || 0) + 1 / 60, s = this.o.size || 1, w = Math.sin(k * 1.4) * 2.2 * s, tele = e.rs && e.rs.state === 'tele';
    const shake = tele ? Math.sin(k * 60) * 1.2 : 0;
    J.handR = [5 * s, 3.5 * s + w * .3, (19 + w + shake) * s]; J.handL = [5 * s, -3.5 * s + w * .3, (13 - w * .6 + shake) * s];
    J.elbowR = [2.5 * s, 4.5 * s, 17 * s]; J.elbowL = [2.5 * s, -4.5 * s, 14 * s];
  };
}
// ------------------------------------------------------------------- disco balls (big ones split in two)
const discoDef = (big, small) => ({ kind: big ? 'discoBig' : 'disco', name: 'DISCO BALL', hp: big ? 10 : small ? 3 : 5, speed: 70, r: big ? 11 : small ? 6 : 8, contact: 1, cash: big ? 800 : 400, rat: 3, drops: { stack: .2, capsule: .05 }, counted: true,
  make(world, e, o) { const a = (o && o.ang !== undefined) ? o.ang : Math.PI / 4 + Math.floor(RNG.spawn() * 4) * Math.PI / 2; e.vx = Math.cos(a) * 70; e.vy = Math.sin(a) * 70; e.fireT = 1.5 + RNG.spawn(); e.cross = false; e.state = 'move'; e.spin = 0; if (small) { e.maxHp = e.hp = 3 * MT.T.enemyHp; e.r = 6; } },
  update(e, dt, world) {
    const sp = 70 * foeSpeed(), l = Math.hypot(e.vx, e.vy) || 1; e.vx = e.vx / l * sp; e.vy = e.vy / l * sp; e.spin += dt * 3;
    e.fireT -= dt; e.noCollide = true;
    if (e.x < AR.X0 + e.r && e.vx < 0 || e.x > AR.X1 - e.r && e.vx > 0) e.vx = -e.vx;
    if (e.y < AR.Y0 + e.r && e.vy < 0 || e.y > AR.Y1 - e.r && e.vy > 0) e.vy = -e.vy;
    e.state = e.fireT < .4 ? 'flare' : 'move';
    if (e.fireT <= 0) { e.fireT = 3; const off = e.cross ? Math.PI / 4 : 0; e.cross = !e.cross; for (let i = 0; i < 4; i++) world.fireFoe('beam', e.x, e.y, off + i * Math.PI / 2, bulletSpd(110)); if (!world.quietFx) MT.sfx('zap'); }
  },
  onDeath(e, world) { if (big) for (const s of [-1, 1]) world.spawnEnemy('discoSmall', e.x + s * 6, e.y, { ang: Math.atan2(e.vy, e.vx) + s * Math.PI / 2, inside: true }); },
  draw(r, e, t) {
    const s = e.rs, R = e.r * 1.1, z = 9 + Math.abs(Math.sin(t * 4 + e.id)) * 3;
    r.shadow(s.x, s.y, R, .45);
    r.actor(s.x, s.y, z, (g, ox, oy) => {
      const cy = oy - R, sp = (s.t || 0) * 3;
      px.disc(g, ox, cy, R + 1, '#141018'); px.disc(g, ox, cy, R, '#8a90a8');
      for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) { const fx = ox + i * R / 3.4, fy = cy + j * R / 3.4; if ((fx - ox) ** 2 + (fy - cy) ** 2 > (R - 1) ** 2) continue; const k = Math.sin(sp + i * 1.3 + j * .7); px.rect(g, Math.round(fx - 1), Math.round(fy - 1), 2, 2, k > .7 ? '#ffffff' : k > .2 ? '#d8e0f0' : k > -.4 ? '#a8b0c8' : '#6a7090'); }
      if (s.state === 'flare') for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + (e.cross ? Math.PI / 4 : 0); px.line(g, ox, cy, ox + Math.cos(a) * (R + 5), cy + Math.sin(a) * (R + 5) * .8, '#ffcc33'); }
      px.line(g, ox, cy - R, ox, cy - R - 3, '#c8d0e0');
    }, { flash: s.flash > 0 ? '#ffffff' : false });
    game.lights.add(s.x, s.y, 10, 30 + (s.state === 'flare' ? 20 : 0), .4, { color: ['#ff2e88', '#2ee6ff', '#ffcc33'][Math.floor(t * 3 + e.id) % 3] });
  } });
ENEMIES.disco = discoDef(false, false); ENEMIES.discoBig = discoDef(true, false); ENEMIES.discoSmall = Object.assign(discoDef(false, true), { kind: 'discoSmall', cash: 200 });
// ------------------------------------------------------------------- hecklers (and the Heckler King)
const hecklerDef = king => ({ kind: king ? 'hecklerKing' : 'heckler', name: king ? 'THE HECKLER KING' : 'STUDIO AUDIENCE', hp: king ? 12 : 3, speed: 45, r: king ? 7 : 6, contact: 0, cash: king ? 1500 : 350, rat: king ? 6 : 2, drops: king ? {} : { prize: .06, capsule: .04 }, counted: true,
  make(world, e, o) { e.throwT = 1 + RNG.spawn() * 1.2; e.strafe = RNG.spawn() < .5 ? 1 : -1; e.state = 'move'; e.throwPose = 0; if (king) e.carriesKey = true; },
  update(e, dt, world) {
    const c = e.target = nearestContestant(world, e); e.throwT -= dt; e.throwPose = Math.max(0, e.throwPose - dt);
    if (!c) { e.vx = e.vy = 0; return; }
    const d = dist(c, e), a = angTo(e, c);
    let mv = d > 110 ? 1 : d < 70 ? -1 : 0, sp = 45 * foeSpeed();
    e.vx = Math.cos(a) * mv * sp + Math.cos(a + Math.PI / 2) * e.strafe * sp * .6; e.vy = Math.sin(a) * mv * sp + Math.sin(a + Math.PI / 2) * e.strafe * sp * .6; e.face = a;
    if (RNG.ai() < dt * .3) e.strafe = -e.strafe;
    e.state = e.throwPose > 0 ? 'throw' : 'move';
    if (e.throwT <= 0) {
      e.throwT = king ? 2.6 : 2.2; e.throwPose = .35;
      const lead = .6, tx = c.x + c.body.vx * lead, ty = c.y + c.body.vy * lead, n = king ? 3 : 1;
      for (let k = 0; k < n; k++) world.lob('tomato', e.x, e.y, 18, clamp(tx + (k - (n - 1) / 2) * 22, AR.X0 + 6, AR.X1 - 6), clamp(ty + (k ? 10 : 0), AR.Y0 + 6, AR.Y1 - 6), 1.0, { id: e.id });
      if (!world.quietFx) MT.sfx('boo');
    }
  },
  rigState(e) { return { attack: e.throwPose > 0 ? E.move('throw', 1 - e.throwPose / .35) : null }; },
  draw(r, e, t) {
    humanDraw()(r, e, t); const s = e.rs;
    if (!king && !MT.cfg.skipRigs && e.rig) { r.queue(s.x, s.y, 20, g => { const h = e.rig.hand('L'), [sx, sy] = r.w(h.x, h.y, h.z + 3); px.rect(g, sx - 1, sy - 6, 3, 7, '#ffcc33'); px.rect(g, sx - 1, sy - 8, 2, 3, '#ffcc33'); }, { bias: 1 }); }
  } });
ENEMIES.heckler = hecklerDef(false); ENEMIES.hecklerKing = hecklerDef(true);
// ------------------------------------------------------------------- dolly tank
ENEMIES.tank = { kind: 'tank', name: 'DOLLY TANK', hp: 14, speed: 26, r: 12, contact: 1, cash: 1000, rat: 6, drops: { case: .15, capsule: .15 }, counted: true, big: true,
  make(world, e) { e.turret = e.face = Math.PI / 2; e.fireT = 2 + RNG.spawn(); e.state = 'move'; e.tread = 0; e.recoil = 0; },
  update(e, dt, world) {
    const c = e.target = nearestContestant(world, e); e.fireT -= dt; e.recoil = Math.max(0, e.recoil - dt * 4);
    if (!c) { e.vx = e.vy = 0; return; }
    const a = angTo(e, c); e.face = approachAng(e.face, a, .8 * dt); e.turret = approachAng(e.turret, a, 1.4 * dt);
    const sp = (dist(c, e) > 90 ? 26 : 8) * foeSpeed(); e.vx = Math.cos(e.face) * sp; e.vy = Math.sin(e.face) * sp; e.tread += sp * dt;
    e.state = e.fireT < .4 ? 'aim' : 'move';
    if (e.fireT <= 0) { e.fireT = 2.4; e.recoil = 1; world.fireFoe('shell', e.x + Math.cos(e.turret) * 14, e.y + Math.sin(e.turret) * 14, e.turret, bulletSpd(120), { r: 4, life: 3 }); if (!world.quietFx) MT.sfx('shellboom', { vol: .5 }); }
    if (e.state === 'aim' && Math.floor(e.fireT * 10) % 2 && !world.quietFx && e.fireT > .35) MT.sfx('whine', { vol: .4 });
  },
  onDeath(e, world) { world.explode(e.x, e.y, 30, 4, null, 'tank', false, true); },
  draw(r, e, t) {
    const s = e.rs, f = s.face, tu = s.turret === undefined ? f : s.turret;
    r.shadow(s.x, s.y, 13, .5);
    r.actor(s.x, s.y, 0, (g, ox, oy) => {
      const P = (fx, fy, z) => { const c = Math.cos(f), sn = Math.sin(f); return r.w(s.x + c * fx - sn * fy, s.y + sn * fx + c * fy, z); };
      const box = (x0, y0, x1, y1, z0, z1, top, side) => { const b = [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)]; const lo = [P(x0, y1, z0), P(x1, y1, z0)]; px.poly(g, [b[3], b[2], P(x1, y1, z0), P(x0, y1, z0)], side); px.poly(g, [b[0], b[3], P(x0, y1, z0), P(x0, y0, z0)], side); px.poly(g, [b[1], b[2], P(x1, y1, z0), P(x1, y0, z0)], E.tones(side).sh); px.poly(g, b, top); };
      box(-13, -11, 13, -6, 0, 6, '#2a2838', '#141018'); box(-13, 6, 13, 11, 0, 6, '#2a2838', '#141018');
      for (let k = -12; k < 13; k += 4) { const u = ((k + (s.tread || 0)) % 26 + 26) % 26 - 13; for (const yy of [-11, 6]) { const a = P(u, yy, 6.2), b = P(u, yy + 5, 6.2); px.line(g, a[0], a[1], b[0], b[1], '#5a5468'); } }
      box(-10, -7, 10, 7, 3, 10, '#5a5468', '#3a3448');
      const c = Math.cos(tu - f), sn = Math.sin(tu - f), rec = (s.recoil || 0) * 3;
      const T = (fx, fy, z) => P(c * fx - sn * fy, sn * fx + c * fy, z);
      px.poly(g, [T(-6, -5, 16), T(6 - rec, -5, 16), T(6 - rec, 5, 16), T(-6, 5, 16)], '#4a4458'); px.poly(g, [T(-6, 5, 16), T(6 - rec, 5, 16), T(6 - rec, 5, 10), T(-6, 5, 10)], '#2a2838');
      const L = T(11 - rec, 0, 13); px.line(g, T(5 - rec, 0, 13)[0], T(5 - rec, 0, 13)[1], L[0], L[1], '#1a1420', 4); px.disc(g, L[0], L[1], 2.5, s.state === 'aim' && Math.floor(t * 16) % 2 ? '#ffffff' : '#6ab0ff');
      const tl = T(-4, 0, 17); px.dot(g, tl[0], tl[1], '#ff3344');
    }, { flash: s.flash > 0 ? '#ffffff' : false });
    if (s.state === 'aim') r.decal(g => { const a = r.w(s.x, s.y, 0), b = r.w(s.x + Math.cos(tu) * 160, s.y + Math.sin(tu) * 160, 0); px.line(g, a[0], a[1], b[0], b[1], Math.floor(t * 12) % 2 ? '#ff3344' : '#ff9a3c'); });
  } };
// ------------------------------------------------------------------- cable snake: a head and segments along its path
ENEMIES.snake = { kind: 'snake', name: 'CABLE SNAKE', hp: 8, speed: 60, r: 7, contact: 1, cash: 1200, rat: 5, drops: { case: .3 }, counted: true,
  make(world, e) { e.path = []; e.segs = []; e.lungeT = 3 + RNG.spawn() * 2; e.state = 'move'; e.weave = RNG.spawn() * 6; for (let i = 0; i < 10; i++) { const s = world.spawnEnemy('snakeSeg', e.x, e.y, { head: e, idx: i, entering: e.entering, door: e.door }); e.segs.push(s); } for (let i = 0; i < 80; i++) e.path.push([e.x, e.y]); },
  update(e, dt, world) {
    const c = e.target = nearestContestant(world, e); e.lungeT -= dt;
    if (!c) { e.vx = e.vy = 0; return; }
    let sp = 60 * foeSpeed();
    if (e.lungeT < .5 && e.lungeT > 0) { sp *= -.3; e.state = 'rear'; } else if (e.lungeT <= 0 && e.lungeT > -.6) { sp *= 1.5 * 1.6; e.state = 'lunge'; } else { e.state = 'move'; if (e.lungeT <= -.6) e.lungeT = 3 + RNG.ai() * 2; }
    const a = angTo(e, c) + (e.state === 'move' ? Math.sin(e.t * 2.4 + e.weave) * .8 : 0); e.face = approachAng(e.face, a, 3.2 * dt);
    e.vx = Math.cos(e.face) * sp; e.vy = Math.sin(e.face) * sp;
  },
  after(e, dt, world) {   // the segments follow the head's path history: one point every 6 units
    const last = e.path[0]; if (!last || Math.hypot(e.x - last[0], e.y - last[1]) >= 3) { e.path.unshift([e.x, e.y]); if (e.path.length > 90) e.path.pop(); }
    E.prune(e.segs, s => s.dead);
    e.segs.forEach((s, i) => { const p = e.path[Math.min(e.path.length - 1, (i + 1) * 2)]; if (p) { s.face = Math.atan2(p[1] - s.y, p[0] - s.x); s.x = p[0]; s.y = p[1]; } s.entering = e.entering; });
  },
  onDeath(e, world) { for (const s of e.segs) if (!s.dead) world.killEnemy(s, { owner: null, w: 'chain', self: true, noCash: true }); if (!world.quietFx) MT.sfx('snap'); },
  draw(r, e, t) {
    const s = e.rs;
    r.shadow(s.x, s.y, 7, .45);
    r.actor(s.x, s.y, 4, (g, ox, oy) => {
      const f = s.face, c = Math.cos(f), sn = Math.sin(f), P = (fx, fy, z) => r.w(s.x + c * fx - sn * fy, s.y + sn * fx + c * fy, z + (s.state === 'rear' ? 6 : 0));
      const b = [P(-6, -5, 10), P(6, -5, 10), P(6, 5, 10), P(-6, 5, 10)]; px.poly(g, [b[3], b[2], P(6, 5, 2), P(-6, 5, 2)], '#1a1420'); px.poly(g, b, '#3a3448');
      const pr = [P(7, -2.5, 7), P(12, -2.5, 7), P(7, 2.5, 7), P(12, 2.5, 7)]; px.line(g, pr[0][0], pr[0][1], pr[1][0], pr[1][1], '#ffcc33', 2); px.line(g, pr[2][0], pr[2][1], pr[3][0], pr[3][1], '#ffcc33', 2);
      const ey = P(3, 0, 11); px.dot(g, ey[0] - 1, ey[1], '#ff3344'); px.dot(g, ey[0] + 1, ey[1], '#ff3344');
      if (s.state === 'lunge' && Math.random() < .5) px.dot(g, pr[1][0], pr[1][1], '#2ee6ff');
    }, { flash: s.flash > 0 ? '#ffffff' : false });
  } };
ENEMIES.snakeSeg = { kind: 'snakeSeg', name: 'CABLE', hp: 2, speed: 0, r: 5, contact: 1, cash: 150, rat: 1, drops: {}, counted: false, child: true,
  make(world, e, o) { e.head = o.head; e.idx = o.idx; },
  update(e) { e.vx = e.vy = 0; },
  draw(r, e, t) {
    const s = e.rs;
    r.queue(s.x, s.y, 4, g => { const [sx, sy] = r.w(s.x, s.y, 5); px.ell(g, sx, sy, 5.5, 4.5, '#141018'); px.ell(g, sx, sy - .5, 4.5, 3.5, (e.idx || 0) % 3 === 0 ? '#ffcc33' : '#2a2838'); px.dot(g, sx - 1, sy - 2, '#5a5468'); if (s.flash > 0) px.ell(g, sx, sy - .5, 4.5, 3.5, '#ffffff'); }, { solid: true });
  } };
// ------------------------------------------------------------------- the brute: THE CEREAL KILLER, a mascot
ENEMIES.brute = { kind: 'brute', name: 'THE CEREAL KILLER', hp: 24, speed: 40, r: 11, contact: 2, cash: 2000, rat: 8, drops: { case: .4, capsule: .25 }, counted: true, big: true,
  make(world, e) { e.state = 'walk'; e.cycle = 2 + RNG.spawn() * 2; e.stun = 0; e.chargeT = 0; e.charge = null; },
  update(e, dt, world) {
    const c = e.target = nearestContestant(world, e);
    if (e.state === 'stun') { e.vx = e.vy = 0; e.stun -= dt; if (e.stun <= 0) { e.state = 'walk'; e.cycle = 4; } return; }
    if (e.state === 'tele') { e.vx = e.vy = 0; e.chargeT += dt; if (Math.floor(e.chargeT * 3.5) !== Math.floor((e.chargeT - dt) * 3.5) && !world.quietFx) MT.sfx('stomp'); if (e.chargeT >= .8) { e.state = 'charge'; e.chargeT = 0; } return; }
    if (e.state === 'charge') {
      e.chargeT += dt; const sp = 220 * foeSpeed(); e.vx = Math.cos(e.face) * sp; e.vy = Math.sin(e.face) * sp;
      const nx = e.x + e.vx * dt, ny = e.y + e.vy * dt;
      if (nx < AR.X0 + e.r || nx > AR.X1 - e.r || ny < AR.Y0 + e.r || ny > AR.Y1 - e.r) { e.state = 'stun'; e.stun = 1.5; e.vx = e.vy = 0; world.event('bruteCrash', { e }); if (!world.quietFx) { MT.sfx('crash'); world.shake(5); } return; }
      if (e.chargeT > 1.4) { e.state = 'walk'; e.cycle = 4; }
      return;
    }
    e.cycle -= dt;
    if (!c) { e.vx = e.vy = 0; return; }
    if (e.cycle <= 0) { e.state = 'tele'; e.chargeT = 0; e.face = angTo(e, c); if (!world.quietFx) MT.sfx('roar'); return; }
    walkToward(e, c.x, c.y, 40 * foeSpeed(), dt);
  },
  dmgMul(e) { return e.state === 'stun' ? 2 : 1; },
  rigState(e) { return { pose: e.state === 'tele' ? 'crouch' : null, sprint: e.state === 'charge', expr: e.state === 'stun' ? 'wince' : 'angry', hurt: e.state === 'stun' }; },
  draw(r, e, t) {
    const s = e.rs; humanDraw()(r, e, t);
    if (!MT.cfg.skipRigs && e.rig) r.queue(s.x, s.y, 40, g => {   // the mascot's bear ears and the cereal-box emblem
      const h = e.rig.head(), [hx, hy] = r.w(h.x, h.y, h.z + 4); for (const sd of [-1, 1]) { px.disc(g, hx + sd * 6, hy - 6, 3.5, '#5a3a1a'); px.disc(g, hx + sd * 6, hy - 6, 2, '#c89060'); }
    }, { bias: 2 });
    if (s.state === 'tele') { r.decal(g => { const k = (s.t2 || 0) / .8; r.groundRing(s.x, s.y, 12 + k * 14, '#ff3344', .8); const a = r.w(s.x, s.y, 0), b = r.w(s.x + Math.cos(s.face) * 220, s.y + Math.sin(s.face) * 220, 0); px.line(g, a[0], a[1], b[0], b[1], Math.floor(t * 10) % 2 ? '#ff3344' : '#ff9a3c', 2); }); }
    if (s.state === 'stun') for (let i = 0; i < 3; i++) { const a = t * 5 + i * TAU / 3, x = s.x + Math.cos(a) * 9, y = s.y + Math.sin(a) * 9; r.queue(x, y, 44, g => { const [sx, sy] = r.w(x, y, 46); px.sprite(g, SPR.star, sx - 5, sy - 5); }, { emissive: true }); }
  } };
// ------------------------------------------------------------------- the green room's paparazzi: harmless, they flash
ENEMIES.paparazzo = { kind: 'paparazzo', name: 'PAPARAZZI', hp: 999, speed: 30, r: 6, contact: 0, cash: 0, rat: 0, drops: {}, counted: false, harmless: true,
  make(world, e) { e.tx = e.x; e.ty = e.y; e.flashT = 0; e.pidx = world.enemies.length; },
  update(e, dt, world) { if (dist2(e, { x: e.tx, y: e.ty }) < 16 || RNG.ai() < dt * .2) { e.tx = 40 + RNG.ai() * 288; e.ty = 40 + RNG.ai() * 160; } walkToward(e, e.tx, e.ty, 30, dt); e.flashT = Math.max(0, e.flashT - dt); },
  draw(r, e, t) {
    const s = e.rs; if (!e.rig) e.rig = MT.makePaparazzo(e.id);
    r.shadow(s.x, s.y, 5, .45);
    r.actor(s.x, s.y, 0, (g, ox, oy) => { e.rig.draw(g, ox, oy, r.view); }, {});
    if (!MT.cfg.skipRigs) r.queue(s.x, s.y, 18, g => { const h = e.rig.hand('R'), [sx, sy] = r.w(h.x, h.y, h.z + 2); px.rect(g, sx - 3, sy - 2, 6, 4, '#2a2838'); px.dot(g, sx, sy, '#9ab0c8'); if (s.flashT > 0) { px.disc(g, sx, sy - 3, 5, '#ffffff'); } }, { bias: 2, emissive: s.flashT > 0 });
  } };
const RIG_STATE = { goon: 1, popper: 1, mime: 1, heckler: 1, hecklerKing: 1, brute: 1, paparazzo: 1 };
/** a rig enemy's animation each step (from its rs: the same on a client) */
MT.animateEnemy = (e, dt) => {
  if (MT.cfg.skipRigs || !RIG_STATE[e.kind]) return;
  if (!e.rig) e.rig = e.kind === 'paparazzo' ? MT.makePaparazzo(e.id) : ENEMY_RIGS[e.kind]();
  if (e.kind === 'mime' && !e.rig._boxed) { mimeBox(e.rig, e); e.rig._boxed = true; }
  const A = ENEMIES[e.kind], s = e.rs, extra = A.rigState ? A.rigState(e) : {};
  e.rig.update(dt, Object.assign({ x: s.x, y: s.y, z: s.z, vx: s.vx, vy: s.vy, facing: s.face, hurt: s.flash > 0 }, extra));
};
// static targets: prize crates and vault locks (they take hits; they don't count for the clear)
const TARGETS = MT.TARGETS = {
  crate: { kind: 'crate', hp: 3, r: 8, cash: 0, rat: 1, shape: 'mt:crate' },
  lock: { kind: 'lock', hp: 15, r: 7, cash: 500, rat: 2, shape: 'mt:lockbolt' },
  cage: { kind: 'cage', hp: 1e9, r: 14, invulnerable: true, shape: null },
};
