// ---------------------------------------------------------------- enemies: archetypes as data plus behaviour (a registry: add one entry for a new foe)
// Each draws only from its render state (the enemy object's x, y, z, face, state, t, hpPct, flash), so hub clients draw the same.
const espd = () => MT.T.enemySpeed * MT.diff().enemySpeed;
const bspd = () => MT.T.enemyBulletSpeed * MT.diff().bullets;
const towards = (e, tx, ty, sp) => { const a = Math.atan2(ty - e.y, tx - e.x); e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp; e.face = a; };
const humanDraw = (r, e, o = {}) => {
  r.shadow(e.x, e.y, o.sh || 6, .4);
  if (MT.cfg.skipRigs || !e.rig) return;
  r.actor(e.x, e.y, e.z, (g, ox, oy) => e.rig.draw(g, ox, oy, r.view), { flash: e.flash > 0 ? '#ffffff' : false, alpha: o.alpha || 1, outline: o.outline !== false, every: o.every, key: e });
};
const poseHuman = (e, dt, extra = {}) => {
  if (MT.cfg.skipRigs || !e.rig) return;
  e.rig.update(dt, Object.assign({ x: e.x, y: e.y, z: e.z, vx: e.vx, vy: e.vy, facing: e.face, hurt: e.flash > 0 }, extra));
};
MT.ENEMIES = {
  goon: { name: 'STUDIO SECURITY', hp: 1, speed: 52, r: 6, contact: 1, cash: 100, rat: 1, counted: true, drops: [['bill', .08], ['cap', .012], ['prize', .01]],
    init(e) { e.spd = this.speed + MT.Rr(-6, 6); e.atk = null; e.wob = MT.Rr(0, 6.28); },
    update(e, dt, W) {
      const tg = W.target(e); if (!tg) { e.vx *= .9; e.vy *= .9; return; }
      const d = MT.dist(e, tg);
      if (e.atk) {
        e.atk.t += dt; e.vx = e.vy = 0;
        if (e.atk.phase === 'wind' && e.atk.t >= .3) { e.atk.phase = 'active'; e.atk.t = 0; W.event('swish', { x: e.x, y: e.y }, false); if (d < 18) tg.hurt(MT.T.contactDmg, e, W); }
        else if (e.atk.phase === 'active' && e.atk.t >= .12) { e.atk.phase = 'recover'; e.atk.t = 0; }
        else if (e.atk.phase === 'recover' && e.atk.t >= .35) e.atk = null;
        return;
      }
      if (d < 16) { e.atk = { phase: 'wind', t: 0 }; return; }
      e.wob += dt * 2; const a = MT.ang(e, tg) + Math.sin(e.wob) * .35, sp = e.spd * espd();
      e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp; e.face = a;
    },
    pose(e, dt) { const u = e.atk ? e.atk.t / (e.atk.phase === 'wind' ? .3 : e.atk.phase === 'active' ? .12 : .35) : 0; poseHuman(e, dt, { attack: e.atk ? { spec: E.MOVES.bash, phase: e.atk.phase, u: Math.min(1, u) } : null }); },
    draw(r, e) { humanDraw(r, e, { every: 2 }); }
  },
  clapbot: { name: 'APPLAUSE ROBOT', hp: 1, speed: 115, r: 6, contact: 1, cash: 150, rat: 1, counted: true, drops: [['bill', .1]],
    init(e) { e.hopT = MT.Rr(0, .4); e.clap = 0; },
    update(e, dt, W) {
      e.hopT -= dt; e.clap += dt;
      const tg = W.target(e);
      if (e.hopT <= 0 && tg) { e.hopT = .4; const a = MT.ang(e, tg) + MT.Rr(-.7, .7), sp = this.speed * espd(); e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp; e.face = a; e.hopU = 0; if (e.rig && e.rig.kick) e.rig.kick(.35); W.event('hop', { x: e.x, y: e.y }, false); }
      e.hopU = (e.hopU || 0) + dt; if (e.hopU > .25) { e.vx *= .8; e.vy *= .8; }
      e.z = e.hopU < .25 ? Math.sin(e.hopU / .25 * Math.PI) * 6 : 0;
    },
    pose(e, dt) { if (e.rig && !MT.cfg.skipRigs) e.rig.update(dt, { squash: e.hopT > .32 ? -.3 : 0, look: [Math.cos(e.face), Math.sin(e.face)], walk: .5 }); },
    draw(r, e) { r.shadow(e.x, e.y, 6, .4); if (!MT.cfg.skipRigs && e.rig) r.actor(e.x, e.y, e.z, (g, ox, oy) => e.rig.draw(g, ox, oy, r.view), { flash: e.flash > 0 ? '#ffffff' : false, every: 2, key: e }); MT.paint.clapHands(r, e); }
  },
  popper: { name: 'PARTY POPPER', hp: 2, speed: 38, r: 6, contact: 1, cash: 250, rat: 2, counted: true, drops: [['stack', .1], ['cap', .03]],
    init(e) { e.fuse = 0; },
    update(e, dt, W) {
      if (e.state === 'fuse') { e.vx = e.vy = 0; e.t += dt; if (e.t >= .6) { e.state = 'burst'; W.popperBurst(e); W.kill(e, null, { silent: true }); } return; }
      const tg = W.target(e); if (!tg) return;
      if (MT.dist(e, tg) < 18) { e.state = 'fuse'; e.t = 0; W.event('fuse', { x: e.x, y: e.y }, false); return; }
      towards(e, tg.x, tg.y, this.speed * espd());
    },
    onDeath(e, W) { if (e.state !== 'burst') { e.state = 'burst'; W.popperBurst(e); } },
    pose(e, dt) { poseHuman(e, dt, { expr: e.state === 'fuse' ? 'shout' : null }); },
    draw(r, e) { humanDraw(r, e); MT.paint.partyHorn(r, e); }
  },
  mime: { name: 'LAND MIME', hp: 1, speed: 0, r: 6, contact: 0, cash: 300, rat: 2, counted: false, drops: [['bill', .3]],
    init(e) { e.box = MT.Rr(0, 6.28); },
    update(e, dt, W) {
      e.vx = e.vy = 0; e.box += dt;
      if (e.state === 'tele') { e.t += dt; if (Math.floor(e.t * 8) !== Math.floor((e.t - dt) * 8)) W.event('beep', { x: e.x, y: e.y }, false); if (e.t >= .7) { W.mimeBlast(e); W.kill(e, null, { silent: true, noDrop: true }); } return; }
      for (const c of W.contestants) if (c.canBeHit && MT.dist(e, c) < 34) { e.state = 'tele'; e.t = 0; return; }
    },
    pose(e, dt) { poseHuman(e, dt, { expr: e.state === 'tele' ? 'shout' : 'smile' }); },
    draw(r, e) { humanDraw(r, e, { alpha: e.state === 'tele' ? 1 : .5, outline: e.state === 'tele' }); if (e.state === 'tele') r.decal(() => r.groundRing(e.x, e.y, 36, Math.floor(e.t * 10) % 2 ? '#ff3344' : '#ffffff', .8)); }
  },
  disco: { name: 'DISCO BALL', hp: 5, speed: 70, r: 7, contact: 1, cash: 400, rat: 3, counted: true, drops: [['stack', .2], ['cap', .05]],
    init(e, o) { e.big = !!(o && o.big); if (e.big) { e.hp = e.max = 10 * MT.T.enemyHp; e.r = 10; e.cash = 800; } const a = Math.PI / 4 + MT.Ri(0, 3, 'spawn') * Math.PI / 2; e.dx = Math.cos(a); e.dy = Math.sin(a); e.shotT = MT.Rr(1.5, 3); e.cross = false; },
    update(e, dt, W) {
      const sp = this.speed * espd(); e.vx = e.dx * sp; e.vy = e.dy * sp;
      if (e.x <= AR.x0 + e.r + .5 && e.dx < 0 || e.x >= AR.x1 - e.r - .5 && e.dx > 0) e.dx *= -1;   // (the wall clamp leaves it exactly on the edge)
      if (e.y <= AR.y0 + e.r + .5 && e.dy < 0 || e.y >= AR.y1 - e.r - .5 && e.dy > 0) e.dy *= -1;
      e.shotT -= dt;
      if (e.shotT <= .4 && e.state !== 'flare') { e.state = 'flare'; W.event('shimmer', { x: e.x, y: e.y }, false); }
      if (e.shotT <= 0) { e.shotT = 3; e.state = 'move'; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + (e.cross ? Math.PI / 4 : 0); W.foe(e, 'beam', a, 110); } e.cross = !e.cross; W.event('zap', { x: e.x, y: e.y }, false); }
    },
    onDeath(e, W) { if (e.big) for (const s of [-1, 1]) { const n = W.spawnAt('disco', e.x + s * 8, e.y, {}); if (n) { n.hp = n.max = 3 * MT.T.enemyHp; n.dx = s * .707; n.dy = -.707; } } },
    draw(r, e) { MT.paint.disco(r, e); }
  },
  heckler: { name: 'STUDIO AUDIENCE', hp: 3, speed: 45, r: 6, contact: 1, cash: 350, rat: 2, counted: true, drops: [['prize', .06], ['cap', .04]],
    init(e) { e.throwT = MT.Rr(1, 2.2); e.strafe = MT.R() < .5 ? 1 : -1; e.throwU = 0; },
    update(e, dt, W) {
      const tg = W.target(e); if (!tg) return;
      const d = MT.dist(e, tg), a = MT.ang(e, tg); e.face = a;
      const want = d < 70 ? -1 : d > 110 ? 1 : 0, sp = this.speed * espd();
      e.vx = Math.cos(a) * want * sp + Math.cos(a + Math.PI / 2) * e.strafe * sp * .7; e.vy = Math.sin(a) * want * sp + Math.sin(a + Math.PI / 2) * e.strafe * sp * .7;
      if (MT.R() < dt * .4) e.strafe *= -1;
      e.throwT -= dt; e.throwU = Math.max(0, e.throwU - dt);
      if (e.throwT <= 0) { e.throwT = 2.2; e.throwU = .5; const n = e.kind === 'hecklerKing' ? 3 : 1; for (let i = 0; i < n; i++) W.lobTomato(e, tg, (i - (n - 1) / 2) * 22); }
    },
    pose(e, dt) { poseHuman(e, dt, { attack: e.throwU > 0 ? { spec: E.MOVES.throw, phase: e.throwU > .25 ? 'active' : 'recover', u: 1 - (e.throwU % .25) / .25 } : null }); },
    draw(r, e) { humanDraw(r, e); MT.paint.foamFinger(r, e); }
  },
  tank: { name: 'DOLLY TANK', hp: 14, speed: 26, r: 12, contact: 1, cash: 1000, rat: 6, counted: true, big: true, drops: [['case', .15], ['cap', .15]],
    init(e) { e.aim = e.face; e.shotT = 2; e.tread = 0; },
    update(e, dt, W) {
      const tg = W.target(e); if (!tg) return;
      const want = MT.ang(e, tg); e.face = MT.approachAng(e.face, want, .7 * dt); e.aim = MT.approachAng(e.aim, want, (e.state === 'aim' ? .4 : 1.4) * dt);
      const sp = this.speed * espd(), d = MT.dist(e, tg); e.vx = Math.cos(e.face) * sp * (d > 60 ? 1 : 0); e.vy = Math.sin(e.face) * sp * (d > 60 ? 1 : 0);
      e.tread += Math.hypot(e.vx, e.vy) * dt;
      e.shotT -= dt;
      if (e.shotT <= .4 && e.state !== 'aim') { e.state = 'aim'; W.event('whine', { x: e.x, y: e.y }, false); }
      if (e.shotT <= 0) { e.shotT = 2.4; e.state = 'move'; const b = W.foe(e, 'shell', e.aim, 120, { r: 3.5, life: 2.5 }); if (b) { b.x = e.x + Math.cos(e.aim) * 14; b.y = e.y + Math.sin(e.aim) * 14; } W.event('shellFire', { x: e.x, y: e.y }, false); }
    },
    onDeath(e, W) { W.explode({ x: e.x, y: e.y, r: 30, dmg: 3, team: 'p', big: true }); },
    draw(r, e) { MT.paint.tank(r, e); }
  },
  snake: { name: 'CABLE SNAKE', hp: 8, speed: 60, r: 7, contact: 1, cash: 1200, rat: 5, counted: true, drops: [['case', .3]],
    init(e, o, W) { e.path = []; e.segs = []; e.weave = 0; e.lungeT = MT.Rr(2, 4); for (let i = 0; i < 10; i++) { const s = W.spawnAt('seg', e.x, e.y, { parent: e, i }); if (s) e.segs.push(s); } },
    update(e, dt, W) {
      const tg = W.target(e); if (!tg) return;
      e.weave += dt * 3; e.lungeT -= dt;
      let sp = this.speed * espd();
      if (e.state === 'rear') { e.t += dt; sp = 10; if (e.t >= .45) { e.state = 'lunge'; e.t = 0; } }
      else if (e.state === 'lunge') { e.t += dt; sp *= 1.5; if (e.t >= .7) { e.state = 'move'; e.lungeT = MT.Rr(2.5, 4); } }
      else if (e.lungeT <= 0 && MT.dist(e, tg) < 110) { e.state = 'rear'; e.t = 0; W.event('hiss', { x: e.x, y: e.y }, false); }
      const a = MT.ang(e, tg) + (e.state === 'move' ? Math.sin(e.weave) * .6 : 0); e.face = MT.approachAng(e.face, a, 4 * dt);
      e.vx = Math.cos(e.face) * sp; e.vy = Math.sin(e.face) * sp;
      const last = e.path[0]; if (!last || Math.hypot(e.x - last[0], e.y - last[1]) >= 6) { e.path.unshift([e.x, e.y]); if (e.path.length > 40) e.path.pop(); }
      E.prune(e.segs, s => s.dead);
      e.segs.forEach((s, i) => { const p = e.path[Math.min(e.path.length - 1, i + 1)]; if (p) { s.x = p[0]; s.y = p[1]; } });
    },
    onDeath(e, W) { for (const s of e.segs) if (!s.dead) W.kill(s, null, { silent: false }); },
    draw(r, e) { MT.paint.snakeHead(r, e); }
  },
  seg: { name: 'CABLE', hp: 2, speed: 0, r: 5, contact: 1, cash: 150, rat: 1, counted: false, drops: [], net: true,
    init(e, o) { e.parent = o && o.parent; e.i = o ? o.i : 0; },
    update(e) { e.vx = e.vy = 0; if (!e.parent || e.parent.dead) e.dead = true; },
    draw(r, e) { MT.paint.snakeSeg(r, e.x, e.y, e.flash > 0, e.i || 0); }
  },
  brute: { name: 'THE CEREAL KILLER', hp: 24, speed: 40, r: 10, contact: 2, cash: 2000, rat: 8, counted: true, big: true, drops: [['case', .4], ['cap', .25]],
    init(e) { e.chargeT = MT.Rr(2.5, 4); e.cdx = 0; e.cdy = 0; },
    update(e, dt, W) {
      const tg = W.target(e);
      if (e.state === 'stun') { e.vx = e.vy = 0; e.t += dt; if (e.t >= 1.5) { e.state = 'move'; e.chargeT = 4; } return; }
      if (e.state === 'tele') { e.vx = e.vy = 0; e.t += dt; if (Math.floor(e.t * 5) !== Math.floor((e.t - dt) * 5)) W.event('stomp', { x: e.x, y: e.y }, false); if (e.t >= .8) { e.state = 'charge'; e.t = 0; } return; }
      if (e.state === 'charge') {
        e.t += dt; const sp = 220 * espd(); e.vx = e.cdx * sp; e.vy = e.cdy * sp;
        if (e.x <= AR.x0 + e.r + 1 || e.x >= AR.x1 - e.r - 1 || e.y <= AR.y0 + e.r + 1 || e.y >= AR.y1 - e.r - 1) { e.state = 'stun'; e.t = 0; W.event('crash', { x: e.x, y: e.y }); }
        else if (e.t >= 1.4) { e.state = 'move'; e.chargeT = 4; }
        return;
      }
      if (!tg) return;
      towards(e, tg.x, tg.y, this.speed * espd()); e.chargeT -= dt;
      if (e.chargeT <= 0) { e.state = 'tele'; e.t = 0; const a = MT.ang(e, tg); e.cdx = Math.cos(a); e.cdy = Math.sin(a); e.face = a; W.event('roar', { x: e.x, y: e.y }); }
    },
    dmgMul(e) { return e.state === 'stun' ? 2 : 1; },
    pose(e, dt) { poseHuman(e, dt, { pose: e.state === 'tele' ? 'crouch' : undefined, sprint: e.state === 'charge', stance: 'guard', expr: 'angry' }); },
    draw(r, e) {
      humanDraw(r, e, { sh: 10 }); MT.paint.mascotHead(r, e);
      if (e.state === 'tele') r.decal(() => { for (let d = 10; d < 240; d += 10) r.groundDisc(e.x + e.cdx * d, e.y + e.cdy * d, 2, '#ff3344', .55); r.groundRing(e.x, e.y, 10 + e.t * 30, '#ffcc33', .6); });
    }
  },
  crate: { name: 'PRIZE CRATE', hp: 3, speed: 0, r: 8, contact: 0, cash: 0, rat: 1, counted: false, solid: true, drops: [],
    init(e) { e.static = true; },
    update(e) { e.vx = e.vy = 0; },
    onDeath(e, W) { W.crateSpill(e); },
    draw(r, e) { MT.paint.crate(r, e); }
  },
  lock: { name: 'VAULT LOCK', hp: 15, speed: 0, r: 7, contact: 0, cash: 500, rat: 2, counted: false, drops: [],
    init(e) { e.static = true; },
    update(e) { e.vx = e.vy = 0; },
    onDeath(e, W) { W.lockBroken(e); },
    draw(r, e) { MT.paint.lock(r, e); }
  },
  paparazzi: { name: 'PAPARAZZI', hp: 999, speed: 30, r: 6, contact: 0, cash: 0, rat: 0, counted: false, harmless: true, drops: [],
    init(e) { e.wT = 0; e.flashT = 0; },
    update(e, dt) { e.wT -= dt; if (e.wT <= 0) { e.wT = MT.Rr(1, 3); const a = MT.Rr(0, 6.28); e.vx = Math.cos(a) * 30; e.vy = Math.sin(a) * 30; e.face = a; } e.flashT = Math.max(0, e.flashT - dt); },
    pose(e, dt) { poseHuman(e, dt, { pose: e.flashT > 0 ? 'cast' : undefined }); },
    draw(r, e) { humanDraw(r, e); r.queue(e.x, e.y + .5, 20, g => { const p = r.w(e.x + Math.cos(e.face) * 5, e.y + Math.sin(e.face) * 5, 20); px.rect(g, p[0] - 3, p[1] - 2, 6, 4, '#1a1a22'); px.dot(g, p[0], p[1], e.flashT > 0 ? '#ffffff' : '#2ee6ff'); }, { bias: 2 }); if (e.flashT > .1) MT.game.lights.add(e.x, e.y, 20, 60, 1, { color: '#ffffff' }); }
  }
};
MT.ENEMIES.discoBig = MT.ENEMIES.disco;
MT.ENEMIES.hecklerKing = Object.assign({}, MT.ENEMIES.heckler, { name: 'THE HECKLER KING', hp: 12, cash: 1500, rat: 6, drops: [] });
MT.ENEMIES.goon.pose = MT.ENEMIES.goon.pose;
MT.KIND_LIST = ['goon', 'clapbot', 'popper', 'mime', 'disco', 'discoBig', 'heckler', 'hecklerKing', 'tank', 'snake', 'brute', 'crate'];
// the mime's "trapped in a box": its hands flat on invisible walls, sliding on a slow sine (post-processed joints)
MT.mimeBox = (rig, e) => {
  if (!rig || rig._boxed) return; rig._boxed = true; const base = rig.solvePose;
  rig.solvePose = function () {
    base.call(this);
    const J = this.J; if (!J || !J.shL || !e) return;
    const tele = e.state === 'tele', t = (e.box || 0), sh = tele ? Math.sin(t * 60) * .8 : 0;
    const zH = J.shC[2] + 2 + Math.sin(t * 1.3) * 3, zL = J.shC[2] - 3 + Math.sin(t * 1.3 + 1.6) * 3;
    J.handL = [J.shL[0] + 5 + sh, J.shL[1] - 1.5, tele ? J.head[2] + 4 : zH]; J.elbowL = [J.shL[0] + 2.5, J.shL[1] - 2.5, (J.shL[2] + J.handL[2]) / 2 - 1];
    J.handR = [J.shR[0] + 5 - sh, J.shR[1] + 1.5, tele ? J.head[2] + 4 : zL]; J.elbowR = [J.shR[0] + 2.5, J.shR[1] + 2.5, (J.shR[2] + J.handR[2]) / 2 - 1];
  };
};
