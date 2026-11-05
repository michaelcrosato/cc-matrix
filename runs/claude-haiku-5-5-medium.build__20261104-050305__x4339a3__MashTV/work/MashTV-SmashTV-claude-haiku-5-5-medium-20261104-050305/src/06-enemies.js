/* MASH TV — 06-enemies: the archetypes (§5.8). Each has its HP, speed, cash and ratings, its drop table and an update
 * that telegraphs every attack for at least 0.3 s. Enemies spawn from doors, the audience or the ceiling (drop). */

// the drop table: [item, chance]; cash and prizes are rolled by the world, capsules by a random kind
MT.DROPS = {
  goon: [['bill', .08], ['capsule', .012], ['prize', .01]], clapbot: [['bill', .1]], popper: [['stack', .1], ['capsule', .03]],
  mime: [['bill', .3]], disco: [['stack', .2], ['capsule', .05]], discoBig: [['stack', .4], ['capsule', .1]], heckler: [['prize', .06], ['capsule', .04]],
  tank: [['case', .15], ['capsule', .15]], snake: [['case', .3]], brute: [['case', .4], ['capsule', .25]], hecklerKing: [], lock: []
};
MT.CAPSULES = ['spread', 'rockets', 'popcorn', 'laser', 'records', 'shield', 'speed'];

class Enemy {
  constructor(W, kind, x, y, o = {}) {
    const D = MT.ENEMY[kind];
    this.W = W; this.kind = kind; this.D = D; this.id = ++MT.eidSeq; this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.z = 0;
    this.r = o.r || D.r; this.face = o.face !== undefined ? o.face : MT.rng.ai() * TAU_;
    const hpMul = MT.T.enemyHp * (o.hpMul || 1);
    this.maxHp = Math.max(1, Math.round((o.hp || D.hp) * hpMul)); this.hp = this.maxHp;
    this.alive = true; this.counted = o.counted !== undefined ? o.counted : D.counted !== false; this.t = 0; this.cd = o.cd || (D.cd0 !== undefined ? D.cd0 : .5 + MT.rng.ai());
    this.entering = !!o.entering; this.stun = 0; this.flash = 0; this.wind = 0; this.state = 'idle';
    this.carry = !!o.carry; this.killer = null; this.spawnIdx = o.idx || 0; this.puddle = 0;
    this.rig = null; this.parent = o.parent || null; this.seg = o.seg || 0; this.hist = o.hist || null; this.tgt = null;
    if (D.init) D.init(this, o);
  }
  get speed() { return this.D.speed * MT.T.enemySpeed * (MT.run && MT.run.diff ? MT.run.diff.enemySpeed : 1) * (this.stun > 0 ? 0 : 1) * (this.puddle > 0 ? .6 : 1); }
  get rat() { return this.D.rat || 1; }
  get cash() { return this.D.cash || 0; }
  get hpPct() { return this.hp / this.maxHp; }
}
const TAU_ = Math.PI * 2;

// the spawn and movement helpers shared by every archetype
MT.enemyHelpers = {
  near(e, W) { return W.nearestPlayer(e.x, e.y); },
  stepToward(e, tx, ty, sp, dt, W) {
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
    e.vx = dx / d * sp; e.vy = dy / d * sp; e.face = Math.atan2(dy, dx);
    e.x += e.vx * dt; e.y += e.vy * dt;
    if (!e.entering) MT.clampArena(e, 2);
  },
  wander(e, dt) { e.face += Math.sin(e.t * 2 + e.r) * dt * 2; },
  separate(e, W) {   // a soft push from the others, so the crowd doesn't stack
    for (const o of W.enemies) {
      if (o === e || !o.alive || o.parent === e || e.parent === o || o.kind === 'lock' || o.kind === 'crate') continue;
      const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy);
      if (d > 0 && d < 10) { const push = (10 - d) * .5; e.x += dx / d * push * .3; e.y += dy / d * push * .3; }
    }
    if (!e.entering) MT.clampArena(e, 2);   // (the push never takes a walker through a wall)
  },
  inRange(e, p, r) { return p && MT.dist(e.x, e.y, p.x, p.y) < r; }
};

// the archetypes. Speeds in units a second, rat is the ratings gain, cash the kill value (§5.8).
MT.ENEMY = {
  goon: { hp: 1, r: 6, speed: 52, rat: 1, cash: 100, drops: 'goon',
    update(e, dt, W) {
      const p = W.nearestPlayer(e.x, e.y); if (!p) return;
      const d = MT.dist(e.x, e.y, p.x, p.y);
      if (e.wind > 0) { e.wind -= dt; if (e.wind <= 0) { e.swing = .15; if (MT.dist(e.x, e.y, p.x, p.y) < 16) W.hurtPlayer(p, MT.T.contactDmg, e); e.cd = 1.0; } return; }
      if (e.swing > 0) { e.swing -= dt; return; }
      if (d < 16 && e.cd <= 0) { e.wind = .3; W.emit('telegraph', { e, kind: 'goon' }); return; }
      e.cd -= dt;
      MT.enemyHelpers.stepToward(e, p.x, p.y, e.speed * (1 + .12 * (Math.sin(e.t * 3 + e.r))), dt, W);
      MT.enemyHelpers.separate(e, W);
    }, cd0: .5 },
  clapbot: { hp: 1, r: 6, speed: 115, rat: 1, cash: 150, drops: 'clapbot',
    update(e, dt, W) {
      const p = W.nearestPlayer(e.x, e.y); if (!p) return;
      if (e.hop > 0) { e.hop -= dt; e.x += e.vx * dt; e.y += e.vy * dt; if (!e.entering) MT.clampArena(e, 2); }
      else {
        e.hopCd = (e.hopCd || 0) - dt;
        if (e.hopCd <= 0) {
          e.wind = .25; e.hopCd = .4;
          const a = Math.atan2(p.y - e.y, p.x - e.x) + (MT.rng.ai() * 2 - 1) * .7;
          e.hopA = a;
        }
        if (e.wind > 0) { e.wind -= dt; if (e.wind <= 0) { e.hop = .2; e.vx = Math.cos(e.hopA) * e.speed; e.vy = Math.sin(e.hopA) * e.speed; e.face = e.hopA; W.emit('hop', { e }); } }
      }
      e.clap = (e.clap || 0) + dt * 12;
      if (MT.dist(e.x, e.y, p.x, p.y) < 9 && (e.touchCd || 0) <= 0) { W.hurtPlayer(p, MT.T.contactDmg, e); e.touchCd = .6; }
      e.touchCd = (e.touchCd || 0) - dt;
      MT.enemyHelpers.separate(e, W);
    }, cd0: 0 },
  popper: { hp: 2, r: 7, speed: 38, rat: 2, cash: 250, drops: 'popper',
    update(e, dt, W) {
      const p = W.nearestPlayer(e.x, e.y); if (!p) return;
      if (e.fuse !== undefined) { e.fuse -= dt; e.swell = 1 - Math.max(0, e.fuse) / .6; if (e.fuse <= 0) W.burstShards(e, 8, 90, 1.2); if (e.fuse <= 0) { e.alive = false; W.enemyDied(e, p, 'burst'); } return; }
      if (MT.dist(e.x, e.y, p.x, p.y) < 18) { e.fuse = .6; W.emit('telegraph', { e, kind: 'popper' }); return; }
      MT.enemyHelpers.stepToward(e, p.x, p.y, e.speed * (1 + .3 * Math.abs(Math.sin(e.t * 6))), dt, W);
      MT.enemyHelpers.separate(e, W);
    }, cd0: 0 },
  mime: { hp: 1, r: 6, speed: 0, rat: 2, cash: 300, drops: 'mime', counted: false,
    update(e, dt, W) {
      const p = W.nearestPlayer(e.x, e.y); if (!p) return;
      e.alpha = .45;
      if (e.blast !== undefined) { e.blast -= dt; if (e.blast <= 0) { e.alive = false; W.blastRing(e.x, e.y, 36, 1, e); W.enemyDied(e, null, 'blast'); } return; }
      if (MT.dist(e.x, e.y, p.x, p.y) < 34) { e.blast = .7; W.emit('telegraph', { e, kind: 'mime' }); }
    }, cd0: 0 },
  disco: { hp: 5, r: 8, speed: 70, rat: 3, cash: 400, drops: 'disco',
    init(e) { e.vx = 70 * (MT.rng.ai() < .5 ? 1 : -1); e.vy = 70 * (MT.rng.ai() < .5 ? 1 : -1); },
    update(e, dt, W) {
      e.x += e.vx * dt * MT.T.enemySpeed; e.y += e.vy * dt * MT.T.enemySpeed;
      const A = MT.ARENA;
      if (e.x < A.X0 + 8 || e.x > A.X1 - 8) { e.vx = -e.vx; e.x = Math.max(A.X0 + 8, Math.min(A.X1 - 8, e.x)); }
      if (e.y < A.Y0 + 8 || e.y > A.Y1 - 8) { e.vy = -e.vy; e.y = Math.max(A.Y0 + 8, Math.min(A.Y1 - 8, e.y)); }
      e.spin = (e.spin || 0) + dt * 2;
      if (e.fire !== undefined) { e.fire -= dt; if (e.fire <= 0) { e.fire = undefined; const ang = e.pattern ? [0, 1, 2, 3].map(i => i * Math.PI / 2) : [0, 1, 2, 3].map(i => Math.PI / 4 + i * Math.PI / 2); for (const a of ang) W.fShot(e.x, e.y, a + (e.pattern ? 0 : 0), 110 * MT.T.enemyBulletSpeed * (MT.run.diff.bullet), 'beam'); e.pattern = !e.pattern; e.flash = 0; } return; }
      e.cd -= dt; if (e.cd <= 0) { e.cd = 3; e.fire = .4; e.flash = .4; W.emit('telegraph', { e, kind: 'disco' }); }
      const p = W.nearestPlayer(e.x, e.y); if (p && MT.dist(e.x, e.y, p.x, p.y) < e.r + 6 && (e.touchCd || 0) <= 0) { W.hurtPlayer(p, MT.T.contactDmg, e); e.touchCd = .6; }
      e.touchCd = (e.touchCd || 0) - dt;
    }, cd0: 1.2 },
  discoBig: { hp: 10, r: 11, speed: 70, rat: 3, cash: 800, drops: 'discoBig', base: 'disco',
    init(e) { e.vx = 70 * (MT.rng.ai() < .5 ? 1 : -1); e.vy = 70 * (MT.rng.ai() < .5 ? 1 : -1); },
    update(e, dt, W) { MT.ENEMY.disco.update(e, dt, W); },
    onDeath(e, W) { for (let i = 0; i < 2; i++) W.spawnEnemy('discoSmall', e.x + (i ? 6 : -6), e.y, { hp: 3, hpMul: 1, counted: true, cd: 2 }); }, cd0: 1.2 },
  discoSmall: { hp: 3, r: 7, speed: 70, rat: 2, cash: 400, drops: 'disco', update(e, dt, W) { MT.ENEMY.disco.update(e, dt, W); }, init(e) { e.vx = 70 * (MT.rng.ai() < .5 ? 1 : -1); e.vy = 70 * (MT.rng.ai() < .5 ? 1 : -1); }, cd0: 2 },
  heckler: { hp: 3, r: 6, speed: 45, rat: 2, cash: 350, drops: 'heckler',
    update(e, dt, W) {
      const p = W.nearestPlayer(e.x, e.y); if (!p) return;
      if (e.entering) { e.arc = e.arc || { t: 0 }; e.arc.t += dt; const u = Math.min(1, e.arc.t / .7); e.x = lerpN2(e.arc.sx, e.arc.tx, u); e.y = lerpN2(e.arc.sy, e.arc.ty, u); e.z = 30 * Math.sin(Math.PI * u); if (u >= 1) { e.entering = false; e.z = 0; } return; }
      const d = MT.dist(e.x, e.y, p.x, p.y);
      const want = d < 70 ? -1 : d > 110 ? 1 : 0;
      if (want) { const dx = p.x - e.x, dy = p.y - e.y, L = d || 1; e.x += dx / L * want * e.speed * dt; e.y += dy / L * want * e.speed * dt; }
      e.x += Math.cos(e.t * .8 + e.r) * e.speed * .4 * dt; e.y += Math.sin(e.t * .8 + e.r) * e.speed * .4 * dt;
      if (!e.entering) MT.clampArena(e, 3);
      e.face = Math.atan2(p.y - e.y, p.x - e.x);
      e.cd -= dt;
      if (e.cd <= 0) { e.cd = 2.2; W.lobTomato(e, p, .6); }
    }, cd0: 1.5 },
  hecklerKing: { hp: 12, r: 7, speed: 45, rat: 6, cash: 1500, drops: 'hecklerKing', base: 'heckler', carry: true,
    update(e, dt, W) {
      const p = W.nearestPlayer(e.x, e.y); if (!p) return;
      if (e.entering) { MT.ENEMY.heckler.update(e, dt, W); return; }
      const d = MT.dist(e.x, e.y, p.x, p.y), want = d < 70 ? -1 : d > 110 ? 1 : 0;
      if (want) { const dx = p.x - e.x, dy = p.y - e.y, L = d || 1; e.x += dx / L * want * e.speed * dt; e.y += dy / L * want * e.speed * dt; }
      MT.clampArena(e, 3); e.face = Math.atan2(p.y - e.y, p.x - e.x); e.cd -= dt;
      if (e.cd <= 0) { e.cd = 2.6; for (let i = 0; i < 3; i++) setTimeout_(() => W.lobTomato(e, p, .6), i * 300); }
    }, cd0: 1.5 },
  tank: { hp: 14, r: 12, speed: 26, rat: 6, cash: 1000, drops: 'tank',
    update(e, dt, W) {
      const p = W.nearestPlayer(e.x, e.y); if (!p) return;
      const want = Math.atan2(p.y - e.y, p.x - e.x);
      let da = want - e.turret; da = Math.atan2(Math.sin(da), Math.cos(da)); e.turret += Math.max(-1.4 * dt, Math.min(1.4 * dt, da));
      e.face += Math.sin(e.t * .7) * dt * .4;
      if (!e.stop) MT.enemyHelpers.stepToward(e, e.x + Math.cos(e.face) * 50, e.y + Math.sin(e.face) * 50, e.speed, dt, W);
      e.cd -= dt;
      if (e.cd <= 0) { e.cd = 2.4; e.flashT = .4; W.emit('telegraph', { e, kind: 'tank' }); e.fireAt = .4; }
      if (e.fireAt !== undefined) { e.fireAt -= dt; if (e.fireAt <= 0) { e.fireAt = undefined; W.fShot(e.x + Math.cos(e.turret) * 12, e.y + Math.sin(e.turret) * 12, e.turret, 120 * MT.T.enemyBulletSpeed * MT.run.diff.bullet, 'shell'); W.emit('tank-fire', { e }); } }
      if (e.flashT > 0) e.flashT -= dt;
      e.tread = (e.tread || 0) + Math.hypot(e.vx || 0, e.vy || 0) * dt * .2;
    }, cd0: 1, onDeath(e, W) { W.blastRing(e.x, e.y, 30, 1, e); } },
  snake: { hp: 8, r: 6, speed: 60, rat: 5, cash: 1200, drops: 'snake', custom: true,
    init(e) { e.hist = []; e.lunge = 0; },
    update(e, dt, W) {
      const p = W.nearestPlayer(e.x, e.y); if (!p) return;
      if (e.parent) { return; }   // segments follow their head's path history
      e.weave = (e.weave || 0) + dt * 6;
      e.cd -= dt;
      if (e.lungeT !== undefined) { e.lungeT -= dt; if (e.lungeT <= 0) { e.lungeT = undefined; e.cd = 3; } else { e.lunge = 1; } }
      if (e.cd <= 0 && e.lungeT === undefined) { e.cd = 1.5; e.lungeT = .5; W.emit('telegraph', { e, kind: 'snake' }); }
      const sp = e.speed * (e.lunge ? 1.5 : 1) * MT.T.enemySpeed;
      const dx = p.x - e.x, dy = p.y - e.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, w = Math.sin(e.weave) * .6;
      MT.enemyHelpers.stepToward(e, e.x + (dx / L + nx * w) * 30, e.y + (dy / L + ny * w) * 30, sp, dt, W);
      e.lunge = 0;
      e.hist.unshift([e.x, e.y]); if (e.hist.length > 80) e.hist.length = 80;
      if (MT.dist(e.x, e.y, p.x, p.y) < e.r + 4 && (e.touchCd || 0) <= 0) { W.hurtPlayer(p, MT.T.contactDmg, e); e.touchCd = .6; }
      e.touchCd = (e.touchCd || 0) - dt;
    }, cd0: 1.2 },
  snakeSeg: { hp: 2, r: 4.5, speed: 0, rat: 1, cash: 150, drops: null, update(e, dt, W) {
      const h = e.parent; if (!h || !h.alive) { e.alive = false; return; }
      const i = Math.min(h.hist.length - 1, (e.seg + 1) * 6); const q = h.hist[Math.max(0, i)] || [h.x, h.y];
      e.x = q[0]; e.y = q[1];
      const p = W.nearestPlayer(e.x, e.y); if (p && MT.dist(e.x, e.y, p.x, p.y) < e.r + 4 && (e.touchCd || 0) <= 0) { W.hurtPlayer(p, MT.T.contactDmg, e); e.touchCd = .6; }
      e.touchCd = (e.touchCd || 0) - dt;
    }, cd0: 0 },
  brute: { hp: 24, r: 14, speed: 40, rat: 8, cash: 2000, drops: 'brute',
    update(e, dt, W) {
      const p = W.nearestPlayer(e.x, e.y); if (!p) return;
      if (e.stun > 0) { e.stun -= dt; e.wobble = (e.wobble || 0) + dt * 10; if (e.stun <= 0) e.stun = 0; return; }
      e.cd -= dt;
      if (e.charge > 0) {   // a straight charge; a wall stuns it
        e.charge -= dt; e.x += e.vx * dt; e.y += e.vy * dt;
        const A = MT.ARENA; if (e.x < A.X0 + 14 || e.x > A.X1 - 14 || e.y < A.Y0 + 14 || e.y > A.Y1 - 14) { e.stun = 1.5; e.charge = 0; W.emit('wallhit', { e }); W.shake(3); MT.clampArena(e, 14); }
        if (MT.dist(e.x, e.y, p.x, p.y) < e.r + 6 && (e.touchCd || 0) <= 0) { W.hurtPlayer(p, 2 * MT.T.contactDmg, e); e.touchCd = .6; }
        e.touchCd = (e.touchCd || 0) - dt; return;
      }
      if (e.tele > 0) { e.tele -= dt; if (e.tele <= 0) { e.charge = 1.4; const a = Math.atan2(p.y - e.y, p.x - e.x); e.vx = Math.cos(a) * 220; e.vy = Math.sin(a) * 220; } return; }
      if (e.cd <= 0) { e.cd = 4; e.tele = .8; W.emit('telegraph', { e, kind: 'brute' }); return; }
      MT.enemyHelpers.stepToward(e, p.x, p.y, e.speed, dt, W);
      if (MT.dist(e.x, e.y, p.x, p.y) < e.r + 4 && (e.touchCd || 0) <= 0) { W.hurtPlayer(p, MT.T.contactDmg, e); e.touchCd = .9; }
      e.touchCd = (e.touchCd || 0) - dt;
    }, cd0: 2 },
  lock: { hp: 15, r: 7, speed: 0, rat: 2, cash: 500, counted: false, drops: null, update() {} },
  crate: { hp: 3, r: 8, speed: 0, rat: 0, cash: 0, counted: false, drops: null, update() {} }
};
const lerpN2 = (a, b, t) => a + (b - a) * t;
const setTimeout_ = (fn, ms) => { (MT.G && MT.G.after) ? MT.G.after(ms / 1000, fn) : fn(); };
// a base kind inherits the behaviour of the kind it names
for (const k in MT.ENEMY) { const D = MT.ENEMY[k]; if (D.base) { const B = MT.ENEMY[D.base]; for (const f of ['update', 'init', 'onDeath']) if (!D[f] && B[f]) D[f] = B[f]; if (D.base === 'heckler') D.update = D.update || B.update; } }
MT.ENEMY.discoBig.init = MT.ENEMY.disco.init; MT.ENEMY.discoBig.onDeath = MT.ENEMY.discoBig.onDeath;
// the shape of an enemy's rig, for the spawn and the draw
MT.kindLabel = { goon: 'STUDIO SECURITY', clapbot: 'APPLAUSE ROBOT', popper: 'PARTY POPPER', mime: 'LAND MIME', disco: 'DISCO BALL', discoBig: 'DISCO BALL',
  heckler: 'STUDIO AUDIENCE', hecklerKing: 'THE HECKLER KING', tank: 'DOLLY TANK', snake: 'CABLE SNAKE', brute: 'THE CEREAL KILLER', lock: 'VAULT LOCK', crate: 'PRIZE CRATE' };
// the paparazzi in the Green Room: harmless, they wander and flash their cameras every few seconds
MT.ENEMY.paparazzo = { hp: 1, r: 6, speed: 30, rat: 0, cash: 0, counted: false, drops: null,
  update(e, dt, W) { e.t += 0; e.wander = (e.wander || 0) + dt; e.face += Math.sin(e.t + e.r) * dt; e.x += Math.cos(e.face) * 14 * dt; e.y += Math.sin(e.face) * 14 * dt; MT.clampArena(e, 8); e.flashT = (e.flashT || 2) - dt; if (e.flashT <= 0) { e.flashT = 3; e.flashW = .15; W.emit('flash', { e }); } e.flashW = Math.max(0, (e.flashW || 0) - dt); } };
MT.RIGS.paparazzo = { kind: 'humanoid', o: { size: .9, build: 'chibi', weapon: null, outfit: 'coat', hair: 'short', hat: 'cap', colors: { cloth: '#6a5a4a', coat: '#6a5a4a', pants: '#2a2a2a', skin: '#e0b090', hair: '#3a2a20', boot: '#111', glove: '#111' } } };
