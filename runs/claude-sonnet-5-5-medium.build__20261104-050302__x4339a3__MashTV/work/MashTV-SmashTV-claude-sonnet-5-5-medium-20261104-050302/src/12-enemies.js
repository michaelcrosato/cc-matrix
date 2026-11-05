// MASH TV: enemy archetypes (the 5.8 table). Every attack has a wind-up of at least 0.3 s.
const EN = MT.ENEMIES;
const KONF = ['#ff2e88', '#2ee6ff', '#ffcc33', '#ffffff'];
const sp = (e, base) => MT.eSpeed(base + (e.seed - .5) * 12);
function chase(w, e, dt, speed, tgt) {
  if (!tgt) { e.vx = e.vy = 0; return; }
  MT.moveToward(w, e, tgt.x, tgt.y, speed, dt);
}

EN.goon = { hp: 1, speed: 52, r: 6, contact: 1, cash: 100, rat: 1, palette: ['#3a3a5a', '#ffcc33', '#fff', '#ff2e88'], drops: [['bill', .08], ['cap', .012], ['prize', .01]],
  update(w, e, dt, tgt, td) {
    if (e.state === 'wind') { e.t2 -= dt; if (e.t2 <= 0) { e.state = 'recover'; e.t2 = .4; if (tgt && MT.hyp(tgt.x - e.x, tgt.y - e.y) < 22) w.hurtContestant(tgt, 1, 'baton', e.id, e.face); w.event('swing', { x: e.x, y: e.y }); } return; }
    if (e.state === 'recover') { e.t2 -= dt; if (e.t2 <= 0) e.state = 'walk'; return; }
    e.state = 'walk';
    if (tgt && td < 16 && e.cd <= 0) { e.state = 'wind'; e.t2 = .32; e.cd = 1.4; e.face = MT.angTo(e, tgt); return; }
    e.cd -= dt; chase(w, e, dt, sp(e, 52), tgt);
  } };
EN.clapbot = { hp: 1, speed: 115, r: 5.5, contact: 1, cash: 150, rat: 1, palette: ['#c8d0e0', '#2ee6ff', '#ffcc33', '#fff'], drops: [['bill', .1]],
  update(w, e, dt, tgt, td) {
    e.t2 -= dt;
    if (e.state === 'hop') { if (e.t2 <= 0) { e.state = 'squat'; e.t2 = .15; e.vx = e.vy = 0; w.event('clap', { x: e.x, y: e.y }); } else { e.x += e.vx * dt; e.y += e.vy * dt; } return; }
    if (e.state === 'squat' || e.state === 'idle') { if (e.t2 <= 0) { if (tgt) { const a = MT.angTo(e, tgt) + (MT.R.ai() - .5) * 1.4; const s = MT.eSpeed(115); e.vx = Math.cos(a) * s; e.vy = Math.sin(a) * s; e.face = a; } e.state = 'hop'; e.t2 = .25; } }
  } };
function popperBurst(w, e) {
  if (e.burst) return; e.burst = true;
  for (let i = 0; i < 8; i++) w.foeShot(e.x, e.y, i / 8 * MT.TAU + .2, 90, 'shard', { life: 1.2, z: 8 });
  w.game.particles.bits(e.x, e.y, 10, 12, KONF); w.event('popperBurst', { x: e.x, y: e.y });
}
EN.popper = { hp: 2, speed: 38, r: 6, contact: 0, cash: 250, rat: 2, palette: KONF, drops: [['stack', .1], ['cap', .03]],
  onDie(w, e) { popperBurst(w, e); },
  update(w, e, dt, tgt, td) {
    if (e.state === 'fuse') { e.t2 -= dt; if (e.t2 <= 0) { e.noCash = false; w.killEnemy(e, null); } return; }
    if (tgt && td < 18) { e.state = 'fuse'; e.t2 = .6; e.vx = e.vy = 0; w.event('fuse', { x: e.x, y: e.y }); return; }
    e.state = 'walk'; chase(w, e, dt, sp(e, 38), tgt);
  } };
EN.mime = { hp: 1, speed: 0, r: 6, contact: 0, cash: 300, rat: 2, count: false, palette: ['#fff', '#222', '#ff3344', '#fff'], drops: [['bill', .3]], kb: 0,
  onDie(w, e) { w.game.particles.smoke(e.x, e.y, 10, 4, { size: 4, color: '#fff' }); w.event('mimePfft', { x: e.x, y: e.y }); },
  update(w, e, dt, tgt, td) {
    e.alpha = .45;
    if (e.state === 'tele') { e.t2 -= dt; if (e.t2 <= 0) { for (const c of w.living()) if (c.state === 'alive' && MT.hyp(c.x - e.x, c.y - e.y) < 36 + 4) w.hurtContestant(c, 1, 'mime', e.id, MT.angTo(e, c)); w.game.particles.explosion(e.x, e.y, 6, .6); w.event('mimeBlast', { x: e.x, y: e.y }); e.noCash = true; e.noRating = true; e.alive = false; } return; }
    if (tgt && td < 34) { e.state = 'tele'; e.t2 = .7; w.event('mimeBeep', { x: e.x, y: e.y }); }
  } };
function discoInit(big) { return function (w, e) { e.big = big; if (big) { e.r = 9; } const a = (Math.floor(MT.R.ai() * 4) + .5) * Math.PI / 2; e.dx = Math.cos(a) > 0 ? 1 : -1; e.dy = Math.sin(a) > 0 ? 1 : -1; e.pat = 0; e.cd = 1.5 + MT.R.ai() * 1.5; }; }
EN.disco = { hp: 5, speed: 70, r: 7, contact: 1, cash: 400, rat: 3, palette: ['#c8d0e0', '#ff2e88', '#2ee6ff', '#fff'], drops: [['stack', .2], ['cap', .05]], make: discoInit(false),
  onDie(w, e) { if (e.big) for (let i = 0; i < 2; i++) { const c = w.spawnEnemy('disco', e.x + (i ? 8 : -8), e.y, { hpMul: .6 }); c.hp = c.max = 3 * MT.T.enemyHp; c.dx = i ? 1 : -1; c.dy = e.dy; c.entering = false; } },
  update(w, e, dt) {
    const s = MT.eSpeed(70) * .7071; e.x += e.dx * s * dt; e.y += e.dy * s * dt; e.spin = (e.spin || 0) + dt * 2;
    if (e.x < 16 + e.r) { e.x = 16 + e.r; e.dx = 1; } else if (e.x > 352 - e.r) { e.x = 352 - e.r; e.dx = -1; }
    if (e.y < 16 + e.r) { e.y = 16 + e.r; e.dy = 1; } else if (e.y > 224 - e.r) { e.y = 224 - e.r; e.dy = -1; }
    e.entering = false;
    if (e.state === 'flare') { e.t2 -= dt; if (e.t2 <= 0) { e.state = 'idle'; const off = e.pat++ % 2 ? Math.PI / 4 : 0; for (let i = 0; i < 4; i++) w.foeShot(e.x, e.y, off + i * Math.PI / 2, 110, 'beam', { life: 3, z: 14 }); w.event('beam', { x: e.x, y: e.y }); } return; }
    e.cd -= dt; if (e.cd <= 0) { e.cd = 3; e.state = 'flare'; e.t2 = .4; }
  } };
EN.discoBig = Object.assign({}, EN.disco, { hp: 10, r: 9, make: discoInit(true), alias: 'disco' });
function throwAt(w, e, tgt, n) {
  const lead = .6, px = tgt.x + (tgt.vx || 0) * lead, py = tgt.y + (tgt.vy || 0) * lead;
  for (let i = 0; i < n; i++) { const o = n > 1 ? (i - 1) * 16 : 0; w.lob('tomato', e.x, e.y, MT.clamp(px + o, 24, 344), MT.clamp(py + (i % 2) * 10, 24, 216), { time: .6 + i * .08 }); }
  w.event('throw', { x: e.x, y: e.y });
}
function hecklerUpdate(king) {
  return function (w, e, dt, tgt, td) {
    e.entering = false;
    if (!tgt) return;
    if (e.state === 'throw') { e.t2 -= dt; e.face = MT.angTo(e, tgt); if (e.t2 <= 0) { throwAt(w, e, e.aimAt || tgt, king ? 3 : 1); e.state = 'strafe'; e.cd = king ? 2.8 : 2.2; } return; }
    const want = td < 70 ? -1 : td > 110 ? 1 : 0, a = MT.angTo(e, tgt), s = MT.eSpeed(45), side = Math.sin(e.age * .8 + e.seed * 6) > 0 ? 1 : -1;
    e.vx = Math.cos(a) * s * want + Math.cos(a + Math.PI / 2) * s * .5 * side; e.vy = Math.sin(a) * s * want + Math.sin(a + Math.PI / 2) * s * .5 * side;
    e.x += e.vx * dt; e.y += e.vy * dt; e.face = a; e.state = 'strafe'; e.cd -= dt;
    if (e.cd <= 0) { e.state = 'throw'; e.t2 = .45; e.aimAt = { x: tgt.x + (tgt.vx || 0) * .6, y: tgt.y + (tgt.vy || 0) * .6 }; }
  };
}
EN.heckler = { hp: 3, speed: 45, r: 6, contact: 0, cash: 350, rat: 2, palette: ['#d02828', '#fff', '#ffcc33', '#2ee6ff'], drops: [['prize', .06], ['cap', .04]], update: hecklerUpdate(false) };
EN.hecklerKing = { hp: 12, speed: 45, r: 7, contact: 0, cash: 1500, rat: 6, palette: ['#ffcc33', '#d02828', '#fff', '#ff2e88'], drops: [], big: .5, update: hecklerUpdate(true), make(w, e) { e.king = true; } };
EN.tank = { hp: 14, speed: 26, r: 10, contact: 1, cash: 1000, rat: 6, big: 1.2, palette: ['#4a5a6a', '#ffcc33', '#ff9a3c', '#ccc'], drops: [['case', .15], ['cap', .15]], make(w, e) { e.turret = 0; e.body_a = 0; },
  onDie(w, e) { w.explode(e.x, e.y, 28, 1, 6, undefined, { size: 1.3, src: 'tankBoom' }); },
  update(w, e, dt, tgt, td) {
    e.entering = false; if (!tgt) return; const a = MT.angTo(e, tgt);
    e.turret = MT.lerpA(e.turret, a, Math.min(1, 1.4 * dt / Math.max(.05, Math.abs(E.angDiff(e.turret, a)))));
    e.body_a = MT.lerpA(e.body_a, a, Math.min(1, .5 * dt / Math.max(.05, Math.abs(E.angDiff(e.body_a, a)))));
    const s = MT.eSpeed(26); if (e.state !== 'aim') { e.vx = Math.cos(e.body_a) * s; e.vy = Math.sin(e.body_a) * s; if (td > 40) { e.x += e.vx * dt; e.y += e.vy * dt; } e.treadT = (e.treadT || 0) + s * dt; } e.face = e.body_a;
    if (e.state === 'aim') { e.t2 -= dt; if (e.t2 <= 0) { e.state = 'walk'; e.cd = 2.4; e.recoil = .2; const b = w.foeShot(e.x + Math.cos(e.turret) * 12, e.y + Math.sin(e.turret) * 12, e.turret, 120, 'shell', { r: 4, life: 3 }); if (b) { b.kind = 'shell'; b.data.kind = 'shell'; } w.event('shell', { x: e.x, y: e.y }); } return; }
    if (e.recoil > 0) e.recoil -= dt;
    e.cd -= dt; if (e.cd <= 0) { e.state = 'aim'; e.t2 = .45; w.event('lens', { x: e.x, y: e.y }); }
  } };
EN.snake = { hp: 8, speed: 60, r: 6, contact: 1, cash: 1200, rat: 5, palette: ['#3a3a4a', '#ffcc33', '#ff3344', '#fff'], drops: [['case', .3]], big: .6, kb: 20,
  make(w, e) { e.hist = []; e.lastX = e.x; e.lastY = e.y; e.segs = []; for (let i = 0; i < 10; i++) { const s = w.spawnEnemy('segment', e.x, e.y, { props: { parent: e.id, idx: i } }); s.entering = e.entering; e.segs.push(s.id); } e.dirA = MT.R.ai() * MT.TAU; },
  onDie(w, e) { for (const s of w.enemies) if (s.kind === 'segment' && s.parent === e.id && s.alive) { s.noCash = true; s.noRating = true; s.alive = false; w.game.particles.bits(s.x, s.y, 8, 4, KONF); } },
  update(w, e, dt, tgt, td) {
    if (!tgt) return; e.t2 -= dt; const a = MT.angTo(e, tgt);
    if (e.state === 'rear') { if (e.t2 <= 0) { e.state = 'lunge'; e.t2 = .6; e.face = a; } return; }
    let s = MT.eSpeed(60); if (e.state === 'lunge') { s *= 1.5; if (e.t2 <= 0) { e.state = 'walk'; e.cd = 3 + MT.R.ai() * 2; } } else { e.cd -= dt; if (e.cd <= 0 && td < 110) { e.state = 'rear'; e.t2 = .5; return; } }
    const wa = a + Math.sin(e.age * 3) * .7; e.x += Math.cos(wa) * s * dt; e.y += Math.sin(wa) * s * dt; e.face = wa;
    const d = Math.hypot(e.x - e.lastX, e.y - e.lastY); if (d >= 6) { e.hist.unshift([e.x, e.y]); e.lastX = e.x; e.lastY = e.y; if (e.hist.length > 40) e.hist.pop(); }
  } };
EN.segment = { hp: 2, speed: 0, r: 5, contact: 1, cash: 150, rat: 1, count: false, noSep: true, noWall: true, palette: ['#3a3a4a', '#ffcc33', '#fff'], drops: [], kb: 0,
  update(w, e, dt) {
    const h = w.enemies.find(q => q.id === e.parent && q.alive); if (!h) { e.alive = false; return; }
    let order = 0; for (const o of w.enemies) if (o.kind === 'segment' && o.parent === e.parent && o.alive && o.idx < e.idx) order++;
    const p = h.hist[order]; if (p) { e.x += (p[0] - e.x) * Math.min(1, dt * 20); e.y += (p[1] - e.y) * Math.min(1, dt * 20); } else { e.x += (h.x - e.x) * Math.min(1, dt * 6); e.y += (h.y - e.y) * Math.min(1, dt * 6); }
    e.entering = false; e.face = h.face;
  } };
EN.brute = { hp: 24, speed: 40, r: 10, contact: 2, cash: 2000, rat: 8, big: 1.4, palette: ['#8a5a32', '#ff3344', '#ffcc33', '#fff'], drops: [['case', .4], ['cap', .25]], kb: 8,
  make(w, e) { e.cd = 2 + MT.R.ai() * 2; },
  update(w, e, dt, tgt, td) {
    e.vulnerable = false;
    if (e.state === 'stunned') { e.vulnerable = true; e.t2 -= dt; if (e.t2 <= 0) { e.state = 'walk'; e.cd = 3; } return; }
    if (!tgt) return;
    if (e.state === 'tele') { e.t2 -= dt; if (e.t2 <= 0) { e.state = 'charge'; e.t2 = 1.4; e.cA = MT.angTo(e, tgt); w.event('roar', { x: e.x, y: e.y }); } return; }
    if (e.state === 'charge') {
      e.t2 -= dt; const s = MT.eSpeed(220); e.x += Math.cos(e.cA) * s * dt; e.y += Math.sin(e.cA) * s * dt; e.face = e.cA; e.vx = Math.cos(e.cA) * s; e.vy = Math.sin(e.cA) * s;
      if (e.x < 16 + e.r + 1 || e.x > 352 - e.r - 1 || e.y < 16 + e.r + 1 || e.y > 224 - e.r - 1 || e.t2 <= 0) { const hit = e.t2 > 0; e.state = 'stunned'; e.t2 = 1.5; e.x = MT.clamp(e.x, 16 + e.r, 352 - e.r); e.y = MT.clamp(e.y, 16 + e.r, 224 - e.r); if (hit) { w.game.shake(4); w.game.particles.dust(e.x, e.y, 6, 8); w.event('wallCrash', { x: e.x, y: e.y }); } }
      return;
    }
    e.state = 'walk'; chase(w, e, dt, MT.eSpeed(40), tgt); e.cd -= dt; if (e.cd <= 0) { e.state = 'tele'; e.t2 = .85; e.cd = 4; e.face = MT.angTo(e, tgt); w.event('stomp', { x: e.x, y: e.y }); }
  } };
EN.crate = { hp: 3, speed: 0, r: 8, contact: 0, cash: 0, rat: 0, count: false, noSep: true, static: true, noWall: true, palette: ['#c8a050', '#8a5a32', '#fff'], drops: [], kb: 0, noHpMul: true, update() {} };
EN.lock = { hp: 15, speed: 0, r: 6, contact: 0, cash: 500, rat: 2, count: false, noSep: true, static: true, noWall: true, palette: ['#ffcc33', '#888', '#fff'], drops: [], kb: 0, noHpMul: true, update() {},
  onDie(w, e) { if (!w.enemies.some(q => q.alive && q !== e && q.kind === 'lock')) { w.safeOpen = true; w.event('safeOpen', {}); if (w.rm.key && w.rm.key.rule === 'vault') w.addPickup('key', 90, 40, { fixed: true, vz: 90 }); for (let i = 0; i < 10; i++) { const a = MT.R.drops() * MT.TAU; w.addPickup('stack', 90, 36, { vx: Math.cos(a) * 60, vy: 20 + Math.abs(Math.sin(a)) * 50, vz: 100 }); } } } };
// push contestants out of static enemies (crates)
WP.pushOutStatics = function (c) {
  for (const e of this.enemies) if (e.alive && e.static && e.kind === 'crate') { const dx = c.x - e.x, dy = c.y - e.y, d = Math.hypot(dx, dy), m = e.r + c.r - 1; if (d < m && d > .01) { c.body.x = c.x = e.x + dx / d * m; c.body.y = c.y = e.y + dy / d * m; } }
};
