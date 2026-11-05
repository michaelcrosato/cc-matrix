/* THE OVER-THE-TOP LAYER: meter gains from the bus, the boss's rules (Overclock, Short Circuit, Rally Cap), the six park
 * hazards (always telegraphed), and the Rhubarb, a 12-second bench-clearing brawl. */
BZ.bus.on('doublePlay', () => M && meterGain(1 - M.half, 15, 'dp'));
BZ.bus.on('safeSteal', () => M && meterGain(M.half, 10, 'steal'));
BZ.bus.on('slide', () => M && meterGain(M.half, 2, 'slide'));
BZ.bus.on('homer', d => {
  if (!M || !M.boss) return;
  const pit = defense().pitcher; if (TEAMS[pit.team].boss && pit.look.captain) { M.boss.circuit = 2; M.boss.speed = .85; emit('shortCircuit', {}); }
});
BZ.bus.on('halfStart', () => {
  if (!M || !M.boss) return;
  M.boss.speed = M.boss.circuit > 0 ? .85 : 1 + .05 * (M.inning - 1);
  // the Rally Cap: the Comets trail entering their last turn at bat
  const com = M.teams.findIndex(t => t.def.id === 'COM');
  if (com === M.half && M.inning >= M.innings && M.teams[com].runs < M.teams[1 - com].runs && !M.boss.rally) { M.boss.rally = true; M.teams[com].meter = 100; emit('rallyCap', {}); }
});

/* ---- hazards ---- */
function hazardInit() {
  const id = M.park.hazard;
  M.hz = BZ.hz = { id, t: 0, vent: 25, ventWarn: 0, ventHot: 0, meteor: 40, craters: [], gulls: [], drones: [], told: {}, flash: 0 };
  if (id === 'gulls') for (let i = 0; i < 3; i++) M.hz.gulls.push({ a: i * 2.1, r: 300 + i * 120, z: 220 + i * 25, sp: .35 + i * .08, cx: HX + (i - 1) * 200, cy: HY - 700, carry: null, blob: HEADLESS ? null : new E.Blob({ R: 4, wings: true, colors: { dk: '#a8b0b8', base: '#f4f4f0', lt: '#ffffff', eye: '#1a1a1a' } }) });
  if (id === 'drones') for (let i = 0; i < 3; i++) M.hz.drones.push({ a: i * 2.1, r: 260 + i * 70, z: 170 + i * 35, sp: .5 + i * .1, cx: HX + (i - 1) * 260, cy: HY - 760, alive: true, x: 0, y: 0, respawn: 0, blob: HEADLESS ? null : new E.Blob({ R: 6, wings: true, face: 'front', colors: { dk: '#5a6270', base: '#b8c0cc', lt: '#ffffff', eye: '#e01e3c' } }) });
  if (id === 'vents') M.hz.vents = PARKS.caldera && parkProps(M.park).filter(p => p.vent);
}
function hazardStep(dt) {
  if (!M.hz || M.hz.match !== M) { hazardInit(); M.hz.match = M; }
  const h = M.hz, rate = TUNE.hazardRate; h.t += dt; h.flash = Math.max(0, h.flash - dt);
  const live = M.phase !== 'pregame' && M.phase !== 'halfEnd' && M.phase !== 'rhubarb' && !M.lesson?.noHazard;
  if (h.id === 'vents' && rate > 0 && live) {
    h.vent -= dt * rate;
    if (h.vent < 3 && h.ventWarn <= 0) { h.ventWarn = 3; emit('hazardWarn', { kind: 'vents' }); sfx('rumble'); }
    if (h.ventWarn > 0) { h.ventWarn -= dt; if (h.ventWarn <= 0) { h.ventHot = 3; h.vent = 25; emit('hazard', { kind: 'vents' }); sfx('explode'); if (!HEADLESS) for (const v of h.vents || []) P.fire(v.x, v.y, 10, 30, { size: 1.6 }); } }
    if (h.ventHot > 0) h.ventHot -= dt;
    // CPU fielders keep 30 U from a vent about to blow
    if (h.ventWarn > 0 || h.ventHot > 0) for (const F of M.fielders) for (const v of h.vents || []) { const d = Math.hypot(F.x - v.x, F.y - v.y); if (d < 34) { if (F.human && h.ventHot > 0) { F.vx += (F.x - v.x) / d * 300; F.vy += (F.y - v.y) / d * 300; F.stun = .4; } else if (!F.human) { F.x += (F.x - v.x) / (d || 1) * 60 * dt; F.y += (F.y - v.y) / (d || 1) * 60 * dt; } } }
  }
  if (h.id === 'lowgrav' && rate > 0 && live) {
    h.meteor -= dt * rate;
    if (h.meteor < 2.5 && !h.warned) { h.warned = true; emit('hazardWarn', { kind: 'meteor' }); sfx('meteor'); }
    if (h.meteor <= 0) { h.meteor = 40; h.warned = false; for (let i = 0; i < 3; i++) { const th = (R() - .5) * 1.2, r = 520 + R() * 400, [ux, uy] = dirOf(th); h.craters.push({ x: HX + ux * r, y: HY + uy * r, r: 26 }); } emit('hazard', { kind: 'meteor' }); game.shake(4); sfx('explode'); }
  }
  for (const g of h.gulls) { g.a += g.sp * dt; g.x = g.cx + Math.cos(g.a) * g.r; g.y = g.cy + Math.sin(g.a) * g.r * .6; if (g.blob) g.blob.update(dt, { flap: 1 }); if (g.carry) { g.carry.t -= dt; } if (R() < dt * .05) sfx('gull', { vol: .4 }); }
  for (const d of h.drones) { d.a += d.sp * dt; d.x = d.cx + Math.cos(d.a) * d.r; d.y = d.cy + Math.sin(d.a * 1.3) * d.r * .5; if (!d.alive) { d.respawn -= dt; if (d.respawn <= 0) d.alive = true; } if (d.blob) d.blob.update(dt, { flap: .8 }); }
}
function hazardBall(b, dt) {
  const h = M.hz; if (!h || TUNE.hazardRate <= 0) return;
  if (h.id === 'fog') { const was = b.hidden; b.hidden = b.z > 120 && b.vz !== 0; if (b.hidden && !was) { emit('hazard', { kind: 'fog' }); sfx('ghost'); } }
  if (h.id === 'gulls' && !b.snatched && b.z > 180 && !b.bounced) {
    for (const g of h.gulls) if (Math.hypot(g.x - b.x, g.y - b.y) < 60 && R() < .25 * dt * 6 * TUNE.hazardRate) {
      b.snatched = true; g.carry = { t: .8 + R() * .6 }; const a = R() * TAU, m = 60 + R() * 80; b.x += Math.cos(a) * m; b.y += Math.sin(a) * m; b.z = 150; b.vx *= .2; b.vy *= .2; b.vz = 0;
      emit('hazard', { kind: 'gull' }); sfx('gull'); assignFielders(true); break;
    }
  }
  if (h.id === 'vents' && h.ventHot > 0) for (const v of h.vents || []) if (Math.hypot(b.x - v.x, b.y - v.y) < 30 && b.z < 24) { b.vz = 600; b.vx += (R() - .5) * 200; b.vy += (R() - .5) * 200; b.bounced = true; b.rolling = false; emit('hazard', { kind: 'ventLaunch' }); sfx('explode'); assignFielders(true); }
  if (h.id === 'lowgrav' && b.rolling) for (const c of h.craters) if (Math.hypot(b.x - c.x, b.y - c.y) < c.r && !b.cratered) { b.cratered = true; const a = (R() < .5 ? -1 : 1) * .7, cs = Math.cos(a), sn = Math.sin(a); const vx = b.vx * cs - b.vy * sn; b.vy = b.vx * sn + b.vy * cs; b.vx = vx; emit('hazard', { kind: 'crater' }); assignFielders(true); }
  if (h.id === 'drones') for (const d of h.drones) if (d.alive && Math.hypot(d.x - b.x, d.y - b.y) < 16 && Math.abs(d.z - b.z) < 16) {
    if (b.kind === 'batzooka') { d.alive = false; d.respawn = 30; emit('droneDown', {}); emit('fanBucks', { n: 150, why: 'DRONE' }); if (!HEADLESS) P.explosion(d.x, d.y, d.z, 1); }
    else { b.vz = -Math.abs(b.vz) * .5 - 50; b.vx = -b.vx * .4 + (R() - .5) * 100; b.vy = -b.vy * .4; emit('hazard', { kind: 'drone' }); sfx('clang'); assignFielders(true); }
  }
}
BZ.bus.on('homer', d => {
  if (!M) return;
  const kit = PARK_CACHE[M.parkId]; const props = kit ? kit.props : parkProps(M.park);
  if (M.park.hazard === 'silo') { const s = props.find(p => p.kind === 'silo'); if (s && Math.abs(thetaOf(s.x, s.y) - thetaOf(d.x, d.y)) < .12) { s.popped = true; emit('siloPop', {}); emit('fanBucks', { n: 300, why: 'SILO SHOT' }); meterGain(M.half, 20, 'target'); } }
  if (M.park.id === 'megadome' && Math.abs(thetaOf(d.x, d.y) - .08) < .14) { emit('megatron', {}); emit('fanBucks', { n: 300, why: 'MEGA-TRON' }); }
  if (M.park.id === 'barnacle' && thetaOf(d.x, d.y) > .3) { emit('splash', {}); sfx('horn'); }
});

/* ---- the Rhubarb ---- */
BZ.bus.on('rhubarbStart', () => { BZ.rhubarbSeen = (BZ.rhubarbSeen || 0) + 1; });
function startRhubarb(after, batter) {
  const off = offense(), def = defense();
  const pick = (T, first) => { const L = [first, ...T.def.roster.filter(p => p !== first)].filter(Boolean).slice(0, 6); return L; };
  const fighters = [];
  const mk = (p, side, i) => {
    const a = (side ? 1 : -1), x = HX + a * (30 + (i % 3) * 22) + (R() - .5) * 10, y = HY - 40 - Math.floor(i / 3) * 30 + (R() - .5) * 10;
    return { p, side, x, y, vx: 0, vy: 0, facing: side ? Math.PI : 0, hp: 3, down: 0, kd: 0, combo: new E.Combo(['jab', 'cross', 'hook'], { window: .35 }), move: null, wind: 0, dodge: 0, rig: HEADLESS && !BZ.cosmetic ? null : makeRig(p, 'brawl'), human: null, stun: 0, hits: 0, shoves: 0, tosses: 0 };
  };
  pick(off, batter).forEach((p, i) => fighters.push(mk(p, M.half, i)));
  pick(def, def.pitcher).forEach((p, i) => fighters.push(mk(p, 1 - M.half, i)));
  const hb = inputOf(M.half, 'bat'), hp = inputOf(1 - M.half, 'pitch');
  if (hb && !M.cheats.autoplay) fighters.find(f => f.side === M.half).human = hb;
  if (hp && !M.cheats.autoplay) fighters.find(f => f.side === 1 - M.half).human = hp;
  M.rhubarb = { t: M.lesson && M.lesson.rhubarbLen ? M.lesson.rhubarbLen : 12, fighters, after, kd: [0, 0], intro: 1.2, end: 0 };
  M.prevCam = M.cam; M.cam = 'broadcast'; setPhase('rhubarb');
  emit('rhubarbStart', {}); sfx('whistle'); music('rhubarb');
}
function rhubarbStep(dt) {
  const RB = M.rhubarb; if (!RB) return setPhase('walkUp');
  if (RB.intro > 0) { RB.intro -= dt; for (const f of RB.fighters) rigFighter(f, dt); return; }
  if (RB.end > 0) { RB.end -= dt; for (const f of RB.fighters) { f.vx = f.vy = 0; f.down = Math.max(0, f.down - dt); rigFighter(f, dt); } if (RB.end <= 0) finishRhubarb(); return; }
  RB.t -= dt;
  for (const f of RB.fighters) {
    f.stun = Math.max(0, f.stun - dt); f.dodge = Math.max(0, f.dodge - dt);
    if (f.down > 0) { f.down -= dt; if (f.down <= 0) f.hp = 3; f.vx *= .9; f.vy *= .9; }
    else if (f.stun <= 0) {
      const foes = RB.fighters.filter(o => o.side !== f.side && o.down <= 0);
      const near = foes.sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y))[0];
      if (f.human) {
        const I = f.human, mv = I.move(); f.vx = mv[0] * 110; f.vy = mv[1] * 110;
        if (Math.hypot(mv[0], mv[1]) > .2) f.facing = Math.atan2(mv[1], mv[0]); else if (near) f.facing = Math.atan2(near.y - f.y, near.x - f.x);
        if (I.pressed('south')) f.combo.press();
        if (I.pressed('west') && !f.move) { f.move = new E.Attack('bash'); f.move.start(); f.moveKind = 'shove'; }
        if (I.pressed('north') && !f.move) { f.move = new E.Attack('throw'); f.move.start(); f.moveKind = 'toss'; }
        if (I.pressed('east') && f.dodge <= 0) { f.dodge = .35; f.vx = Math.cos(f.facing) * -260; f.vy = Math.sin(f.facing) * -260; sfx('turbo'); }
      } else if (near) {
        const dx = near.x - f.x, dy = near.y - f.y, d = Math.hypot(dx, dy); f.facing = Math.atan2(dy, dx);
        if (d > 16) { f.vx = dx / d * 80; f.vy = dy / d * 80; } else { f.vx *= .8; f.vy *= .8; f.wind += dt; if (f.wind > .25 + R() * .4) { f.wind = 0; if (R() < .8) f.combo.press(); else if (!f.move) { f.move = new E.Attack('bash'); f.move.start(); f.moveKind = 'shove'; } } }
      } else { f.vx *= .9; f.vy *= .9; }
    }
    f.x += f.vx * dt; f.y += f.vy * dt;
    f.x = clamp(f.x, HX - 150, HX + 150); f.y = clamp(f.y, HY - 160, HY + 60);
    f.combo.update(dt); if (f.move) { f.move.update(dt); if (!f.move.busy) f.move = null; }
    const foes = RB.fighters.filter(o => o.side !== f.side && o.down <= 0 && o.dodge <= 0);
    const test = o => Math.hypot(o.x - f.x, o.y - f.y) < 16 && Math.abs(E.angDiff(Math.atan2(o.y - f.y, o.x - f.x), f.facing)) < 1;
    f.combo.hits(foes, test, o => hitFighter(f, o, 'punch'));
    if (f.move) f.move.hits(foes, test, o => hitFighter(f, o, f.moveKind));
    rigFighter(f, dt);
  }
  if (RB.t <= 0) { RB.end = 1.6; emit('rhubarbEnd', { kd: RB.kd }); sfx('whistle'); }
}
function hitFighter(f, o, kind) {
  o.hp -= kind === 'punch' ? 1 : 2; o.stun = .25; sfx(kind === 'punch' ? 'bonk' : 'pow'); if (f.human) f.human.rumble(.4, .1);
  const a = Math.atan2(o.y - f.y, o.x - f.x), k = kind === 'toss' ? 300 : kind === 'shove' ? 160 : 60; o.vx = Math.cos(a) * k; o.vy = Math.sin(a) * k;
  if (kind === 'punch') f.hits++; else if (kind === 'shove') f.shoves++; else f.tosses++;
  emit('brawlHit', { kind, human: !!f.human });
  if (!HEADLESS && P.impact) P.impact(o.x, o.y, 18, 1, '#ffffff');
  if (o.hp <= 0) { o.down = 2; o.kd++; M.rhubarb.kd[f.side]++; emit('knockdown', { side: f.side }); sfx('thump'); }
}
function rigFighter(f, dt) {
  if (!f.rig) return;
  const st = (f.move && f.move.state) || f.combo.state;
  f.rig.update(dt, { x: f.x, y: f.y, z: 0, vx: f.vx, vy: f.vy, facing: f.facing, attack: st, hurt: f.stun > 0, down: f.down > 0 ? 1 : 0, expr: f.down > 0 ? 'wince' : 'angry', stance: 'guard' });
}
function finishRhubarb() {
  const RB = M.rhubarb, [a, b] = [RB.kd[0], RB.kd[1]];
  if (a > b) meterGain(0, 50, 'rhubarb'); else if (b > a) meterGain(1, 50, 'rhubarb'); else { meterGain(0, 20, 'rhubarb'); meterGain(1, 20, 'rhubarb'); }
  emit('rhubarbOver', { kd: RB.kd, winner: a === b ? -1 : a > b ? 0 : 1 });
  M.rhubarb = null; M.cam = 'plate'; music(M.park.song);
  if (RB.after) { const r = RB.after(); M.lastCall = r; setPhase('afterPitch'); }
  else setPhase('playOver');
}
