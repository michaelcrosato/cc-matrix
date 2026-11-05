/* 33-actions: what players do. Jump shots (decided at release, then flown: PLAN 6.7), layups, dunks from the catalog with
 * their flights and slams (6.8), alley-oops, putbacks, posters, passes (chest, bounce, lob, flair), steals, shoves and
 * knockdowns, spin moves, blocks and goaltending (6.10), rebounds and loose balls (6.11), and the state machine that
 * runs each player every step from its command. */
const isLocal = p => p.source && (p.source.kind === 'local' || p.source.kind === 'net' || p.source.kind === 'script');
const matchLive = () => S.match && (S.match.phase === 'live' || S.match.phase === 'buzzer');
const pGravity = p => tune('playerGravity') * (S.cheats.moonGravity ? .55 : 1) * (p && p.pu && p.pu.id === 'moon' ? .7 : 1);

/* ---- the shot model ---- */
function baseChance(d) {
  if (d <= 40) return .85; if (d <= 80) return lerp(.85, .70, (d - 40) / 40); if (d <= 136) return lerp(.70, .45, (d - 80) / 56);
  if (d <= 200) return lerp(.38, .30, (d - 136) / 64); if (d <= 320) return lerp(.30, .08, (d - 200) / 120); return .03;
}
/** the chance a shot from (x, y) goes in, with its breakdown (dev overlay): o { x, y, release: 'perfect'|'ok'|'bad', layup } */
function shotChance(p, o = {}) {
  const rim = attackRim(p.team), x = o.x === undefined ? p.x : o.x, y = o.y === undefined ? p.y : o.y, d = dist2(x, y, rim.x, rim.y), three = !o.layup && isThree(x, y, rim);
  const base = o.layup ? .85 : baseChance(d), rf = three ? p.f('deep') : p.f('splash');
  const rel = o.release === 'perfect' ? 1 + tune('perfectBonus') : o.release === 'bad' ? 1 - tune('badReleasePenalty') : 1;
  let contest = 1;
  for (const q of p.foes) {
    if (q.state === 'knock' || q.state === 'frozen') continue;
    const dq = dist2(q.x, q.y, x, y), between = dist2(q.x, q.y, rim.x, rim.y) < d + 8;
    if (!between) continue;
    if (dq < 30) contest = Math.min(contest, q.z > 6 ? 1 - tune('contestPenalty') : .8); else if (dq < 50) contest = Math.min(contest, .92);
  }
  let pr = base * rf * rel * contest * tune('shotSkill') * (three ? tune('threeSkill') : 1);
  if (p.turboOn) pr *= 1.05;
  const toRim = Math.atan2(rim.y - y, rim.x - x), lat = Math.abs(-Math.sin(toRim) * p.vx + Math.cos(toRim) * p.vy); if (lat > 70) pr *= .9;
  if (TWIST.windOn) pr *= 1 - .35 * Math.hypot(TWIST.windX, TWIST.windY) * Math.min(1, d / 320);
  let bonus = S.lesson && S.lesson.bonus && isLocal(p) ? S.lesson.bonus : 0; if (p.isNova()) bonus += tune('novaShotBonus'); if (p.pu && p.pu.id === 'laser') bonus += .3; bonus += comebackK(p.team) * .12;
  pr = clamp(pr + bonus, .02, .97);
  if (S.cheats.shots === 'in') pr = 1; if (S.cheats.shots === 'out') pr = 0;
  return { p: pr, d, three, base, rf, rel, contest, bonus };
}
function startShot(p) { p.setState('gather'); p.vx *= .3; p.vy *= .3; p.jumpTurbo = p.turboOn; sfx('jump', { vol: .15 }); }
function jumpUp(p, kind, vz, extra = {}) {
  p.setState('air'); p.vz = vz; p.z = Math.max(p.z, .01); p.jump = Object.assign({ kind, x0: p.x, y0: p.y, ta: vz / pGravity(p), released: false, tried: new Set() }, extra);
  p.rig.kick(1); p.cd.jump = .25;
  emit('jump', { slot: p.slot, kind });
}
function jumpSpeed(p, base) {
  let v = base + 10 * p.r.swat; if (p.jumpTurbo || p.turboOn) v *= 1.15; if (p.pu && p.pu.id === 'moon') v *= 1.5; return v;
}
/** let the jumper's ball go: decide the shot, then fly it to its decided target */
function releaseShot(p) {
  const J = p.jump; if (J.released || !p.has) return;
  J.released = true;
  const win = tune('perfectWindow') * (p.pu && p.pu.id === 'laser' ? 2 : 1), diff = p.st - J.ta;
  const release = Math.abs(diff) <= win / 2 ? 'perfect' : Math.abs(diff) <= win ? 'ok' : 'bad';
  const ch = shotChance(p, { x: J.x0, y: J.y0, release, layup: J.kind === 'layup' });
  launchShot(p, ch, { release, perfect: release === 'perfect', layup: J.kind === 'layup', early: diff < 0 });
}
/** decide and launch: made goes to the rim's centre (a quarter of them rattle in), missed to the iron or the glass */
function launchShot(p, ch, o = {}) {
  if (S.attract && S.attract.nextMiss) { S.attract.nextMiss = false; ch = Object.assign({}, ch, { p: 0 }); }
  if (S.attract && S.attract.nextMake) { S.attract.nextMake = false; ch = Object.assign({}, ch, { p: 1 }); }
  const b = S.ball, rim = attackRim(p.team), ri = RIMS.indexOf(rim), made = S.rng() < ch.p, three = ch.three;
  const from = { x: b.x, y: b.y, z: b.z }, d = dist2(from.x, from.y, rim.x, rim.y);
  const toward = Math.atan2(from.y - rim.y, from.x - rim.x);   // from the rim back toward the shooter
  let tgt, rattle = false, air = false;
  if (made) {
    rattle = S.rng() < .25 && !o.layup;
    const a = S.rng() * TAU; tgt = { x: rim.x + (rattle ? Math.cos(a) * 2.5 : 0), y: rim.y + (rattle ? Math.sin(a) * 2.5 : 0), z: RIM_Z - .5 };
  } else {
    const err = S.rng();
    if (ch.p < .2 && err < .35 && d > 90) { air = true; const k = S.rng() < .5 ? -1 : 1; tgt = { x: rim.x + Math.cos(toward) * (k > 0 ? -40 : 30), y: rim.y + Math.sin(toward) * 30 + (S.rng() - .5) * 30, z: BALL_R }; }
    else if (err < .4) tgt = { x: rim.x + Math.cos(toward) * (RIM_R + 2.2), y: rim.y + Math.sin(toward) * (RIM_R + 2.2), z: RIM_Z + 1 };   // front rim
    else if (err < .7) tgt = { x: rim.x - Math.cos(toward) * (RIM_R + 1.5), y: rim.y - Math.sin(toward) * (RIM_R + 1.5), z: RIM_Z + 2 };   // back rim
    else if (err < .88) { const s = S.rng() < .5 ? 1 : -1, a = toward + s * PI / 2; tgt = { x: rim.x + Math.cos(a) * (RIM_R + 2), y: rim.y + Math.sin(a) * (RIM_R + 2), z: RIM_Z + 1 }; }   // side rim
    else tgt = { x: BOARD_X[ri] - rim.side * (BALL_R + .5), y: rim.y + (S.rng() - .5) * 30, z: RIM_Z + 12 };   // off the glass
  }
  const g = tune('ballGravity') * (S.cheats.moonGravity ? .55 : 1), apex = clamp(18 + d * .10, 18, 60) * tune('shotArc') * (o.layup ? .45 : 1);
  const v = E.arc(from, tgt, g, { apex });
  if (TWIST.windOn) { const ax = TWIST.windX * tune('windStrength'), ay = TWIST.windY * tune('windStrength'); v.vx -= .5 * ax * v.t; v.vy -= .5 * ay * v.t; }
  b.state = 'shot'; b.owner = null; b.vx = v.vx; b.vy = v.vy; b.vz = v.vz; b.lastTouch = p; b.noCatch = .25; b.noCatchBy = p;
  b.shot = { shooter: p, team: p.team, rim: ri, points: three ? 3 : 2, made, rattle, chance: ch.p, perfect: !!o.perfect, release: o.release, t: 0, dist: d, layup: !!o.layup,
    jackpot: TWIST.jackpot && TWIST.spot && TWIST.spot.rim === ri && dist2(p.jump ? p.jump.x0 : p.x, p.jump ? p.jump.y0 : p.y, TWIST.spot.x, TWIST.spot.y) < 16 && !o.layup, airball: air };
  p.stats.FGA++; if (three) p.stats.TPA++;
  if (p.pu && p.pu.id === 'laser') { p.pu.shots--; if (p.pu.shots <= 0) endPowerup(p); }
  S.lastShot = { name: p.name, chance: ch.p, d: Math.round(d), three, release: o.release, contest: ch.contest, made };
  sfx('release', { vol: .3 }); emit('release', { slot: p.slot, name: p.name, made, chance: ch.p, perfect: !!o.perfect, release: o.release, three, layup: !!o.layup });
}
function startLayup(p) {
  const rim = attackRim(p.team), d = dist2(p.x, p.y, rim.x, rim.y), T = .56, tx = rim.x + (p.x - rim.x) * Math.min(1, 10 / Math.max(d, 1)), ty = rim.y + (p.y - rim.y) * Math.min(1, 10 / Math.max(d, 1));
  jumpUp(p, 'layup', pGravity(p) * T / 2 + 20, { T });
  p.vx = (tx - p.x) / T; p.vy = (ty - p.y) / T; p.facing = Math.atan2(rim.y - p.y, rim.x - p.x);
}

/* ---- dunks (PLAN 6.8, 10.3) ---- */
function dunkRange(p) {
  if (S.cheats.skyDunks) return CW / 2;
  let r = tune('dunkRange') * p.f('slam');
  if (p.isNova()) r += 40;
  if (p.pu && p.pu.id === 'moon') r = Math.max(r, THREE_R + 20);
  if (S.attract && S.attract.cheat) r = Math.max(r, 210);
  return r;
}
function onVent(p) { return TWIST.volcano && TWIST.vents.some(v => v.puff > 0 && dist2(p.x, p.y, v.x, v.y) < 18); }
function canDunk(p) {
  const rim = attackRim(p.team), d = dist2(p.x, p.y, rim.x, rim.y);
  if (onVent(p) && (rim.side > 0 ? p.x > CMX : p.x < CMX)) return true;
  return (p.turbo >= .05 || p.infTurbo()) && d <= dunkRange(p) && d > 4;
}
function dunkNeeds(p, def, ctx) {
  if (def.needs === 'nova') return p.isNova();
  if (def.needs === 'vent') return !!ctx.vent;
  if (def.needs === 'quake') return (p.overclock > 0 && get('team', p.teamId).boss) || (p.pu && p.pu.id === 'moon' && ctx.roll < .5) || (p.isNova() && ctx.roll < .15) || ctx.forceQuake;
  return true;
}
function chooseDunk(p, d, ctx = {}) {
  if (ctx.force && get('dunk', ctx.force)) return get('dunk', ctx.force);
  if (ctx.vent) return get('dunk', 'volcano');
  const roll = S.rng(), approach = Math.abs(p.vy) > Math.abs(p.vx) * .84;
  const cands = all('dunk').filter(def => p.r.slam >= def.slam && d >= def.dist[0] && d <= def.dist[1] && dunkNeeds(p, def, Object.assign({ roll }, ctx)) && (!def.reverse || approach) && def.id !== 'volcano');
  if (!cands.length) return get('dunk', 'hammer');
  let tot = 0; const w = cands.map(def => { const k = (def.bonus + 40) * (p.r.slam - def.slam + 1) * (def.needs ? 3 : 1); tot += k; return k; });
  let x = S.rng() * tot; for (let i = 0; i < cands.length; i++) { x -= w[i]; if (x <= 0) return cands[i]; }
  return cands[cands.length - 1];
}
/** take off: a flight from here to the slam point in front of the rim (the hands 6 above it); o: { oop, putback, vent, force } */
function startDunk(p, o = {}) {
  const rim = attackRim(p.team), d = dist2(p.x, p.y, rim.x, rim.y), vent = o.vent || onVent(p);
  const def = o.def || chooseDunk(p, d, { vent, force: o.force, forceQuake: o.forceQuake || p.forceQuake }); p.forceQuake = false;
  let ux = p.x - rim.x, uy = p.y - rim.y; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
  if (ux * rim.side > 0) ux = -ux * .5;   // from behind the board: come round to the court side
  const sl = { x: rim.x + ux * 8, y: rim.y + uy * 8, z: Math.max(4, RIM_Z + 6 - p.reach()) };
  const G = tune('dunkGravity') / (tune('dunkHang') ** 2) * (S.cheats.moonGravity ? .7 : 1), from = { x: p.x, y: p.y, z: p.z };
  const apex = (def.apexAbove * tune('dunkApex') + (p.pu && p.pu.id === 'moon' ? 20 : 0));
  const v = o.putback ? E.arc(from, sl, G, { time: .28 }) : E.arc(from, sl, G, { apex });
  p.setState('dunk'); p.vx = v.vx; p.vy = v.vy; p.vz = v.vz; p.dunkDef = def;
  p.dunk = { def, T: v.t, t: 0, G, sl, from, oop: !!o.oop, putback: !!o.putback, vent, blocked: false, slammed: false, apexT: Math.max(0, v.vz / G) };
  p.facing = Math.atan2(rim.y - p.y, rim.x - p.x); p.rig.kick(1.2);
  if (!o.oop) { const b = S.ball; if (b.owner === p) b.state = 'dunk'; }
  if (!p.infTurbo()) p.turbo = Math.max(0, p.turbo - .05);
  sfx('jump', { vol: .4 }); if (vent) { sfx('vent_puff'); P.smoke(p.x, p.y, 0, 12, { size: 1.4, color: '#e8e8f0' }); }
  emit('dunkStart', { slot: p.slot, name: p.name, dunk: def.id, banner: def.banner, T: v.t, apexT: p.dunk.apexT, oop: !!o.oop, putback: !!o.putback, vent: !!vent });
  return def;
}
function dunkStep(p, dt) {
  const d = p.dunk; d.t += dt;
  p.vz -= d.G * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z = Math.max(0, p.z + p.vz * dt);
  const b = S.ball;
  if (d.oop && b.owner !== p && b.state !== 'pass' && !d.slammed) { p.setState('air'); p.jump = { kind: 'drop', tried: new Set() }; return; }   // the lob never came: fall
  if (d.t >= d.T && !d.slammed) { p.x = d.sl.x; p.y = d.sl.y; p.z = d.sl.z; if (b.owner === p) slam(p); else { p.setState('air'); p.jump = { kind: 'drop', tried: new Set() }; p.vx = p.vy = 0; p.vz = 0; } }
}
function slam(p) {
  const d = p.dunk, def = d.def, rim = attackRim(p.team), ri = RIMS.indexOf(rim), b = S.ball;
  d.slammed = true;
  if (p.r.slam <= 3 && !p.isNova() && S.rng() < .04 && !S.cheats.shots) {   // the comedy miss: off the back rim
    b.state = 'loose'; b.owner = null; b.x = rim.x + rim.side * 4; b.y = rim.y; b.z = RIM_Z + 6; b.vx = -rim.side * 120; b.vy = (S.rng() - .5) * 60; b.vz = 160; b.shot = null; b.lastTouch = p;
    hoopHit(ri, 1); sfx('rim', { vol: .8 }); p.stats.FGA++; emit('dunkMiss', { slot: p.slot, name: p.name });
  } else {
    b.state = 'shot'; b.owner = null; b.x = rim.x; b.y = rim.y; b.z = RIM_Z + 5; b.vx = 0; b.vy = 0; b.vz = -260; b.lastTouch = p;
    b.shot = { shooter: p, team: p.team, rim: ri, points: 2, made: true, rattle: false, dunk: def.id, oop: d.oop, putback: d.putback, t: 0, dist: dist2(d.from.x, d.from.y, rim.x, rim.y) };
    p.stats.FGA++;
    hoopHit(ri, 1.4);
    // posters: a defender right under the rim on the dunker's side goes down
    let victim = null;
    for (const q of p.foes) if (dist2(q.x, q.y, rim.x, rim.y) < 26 && q.state !== 'knock' && q.state !== 'dunk') { victim = q; knockDown(q, p, { time: 1.1, dizzy: 2.2, push: 120, poster: true }); }
    // the glass
    let sh = 0; if (p.r.slam >= 9 && d.T > .4) sh = .03; if (p.isNova()) sh = .35; if (p.pu && p.pu.id === 'moon') sh = .5; if (def.id === 'volcano') sh = .2; if (def.quake) sh = 1;
    const shatter = S.match && S.match.shatters < 2 && (S.rng() < sh * tune('shatterChance') || S.cheats.shatterNext);
    emit('dunk', { slot: p.slot, name: p.name, dunk: def.id, banner: def.banner, bonus: def.bonus, lines: def.lines, rim: ri, oop: d.oop, putback: d.putback, victim: victim && victim.name, shatter: !!shatter, x: rim.x, y: rim.y, z: RIM_Z });
    if (victim) emit('posterized', { slot: p.slot, name: p.name, victim: victim.name, vslot: victim.slot });
    if (shatter) { S.cheats.shatterNext = false; shatterGlass(ri, p); }
    if (def.quake) for (const q of p.foes) if (dist2(q.x, q.y, rim.x, rim.y) < 70 && q.state !== 'knock') knockDown(q, p, { time: 1, push: 160 });
  }
  if (def.hang && !S.match.hubFast) { p.setState('hang'); p.hangT = def.hang; p.vx = p.vy = p.vz = 0; p.z = RIM_Z + 4 - p.reach(); }
  else { p.setState('air'); p.jump = { kind: 'drop', tried: new Set(), quake: !!def.quake }; p.vx = -rim.side * 20; p.vy = 0; p.vz = 40; }
}

/* ---- passes ---- */
function passKind(p, q) {
  for (const f of p.foes) if (segDist(f, p, q) < 12 && dist2(f.x, f.y, p.x, p.y) > 10) return 'bounce';
  return p.isNova() || S.rng() < .15 ? 'flair' : 'chest';
}
function segDist(o, a, b) { const vx = b.x - a.x, vy = b.y - a.y, l = vx * vx + vy * vy || 1, u = clamp(((o.x - a.x) * vx + (o.y - a.y) * vy) / l, 0, 1); return Math.hypot(a.x + vx * u - o.x, a.y + vy * u - o.y); }
function passBall(p, q, kind = 'chest', o = {}) {
  const b = S.ball; if (!p.has || !q) return;
  const lob = kind === 'lob' || kind === 'oop' || kind === 'inbound', d = dist2(p.x, p.y, q.x, q.y), speed = (180 + 12 * p.r.dime) * 1.6;
  const T = o.T || (lob ? clamp(d / 230, .45, 1.1) : clamp(d / speed, .12, .9)), lead = lob ? .7 : .8;
  const hz = q.z + q.shoulderZ() * .8;
  b.state = 'pass'; b.owner = null; b.lastTouch = p;
  b.pass = { from: p, to: q, kind, t: 0, T, ax: b.x, ay: b.y, az: b.z, bx: o.bx === undefined ? q.x + q.vx * T * lead : o.bx, by: o.by === undefined ? q.y + q.vy * T * lead : o.by, bz: o.bz === undefined ? hz : o.bz,
    arc: lob ? (kind === 'oop' ? 0 : 34) : kind === 'bounce' ? 0 : 5, tried: new Set(), oop: kind === 'oop' };
  p.act = { id: kind === 'bounce' ? 'passBounce' : lob ? 'passLob' : kind === 'flair' ? 'passFlair' : 'passChest', t: 0, dur: .3 };
  p.facing = Math.atan2(q.y - p.y, q.x - p.x);
  sfx('release', { vol: .2 }); emit('pass', { slot: p.slot, to: q.slot, kind });
}
/** the alley-oop: the receiver leaps (a dunk flight to the rim) and the ball is lobbed to meet the hands at 70% of it */
function oopRange(p, q) { return dunkRange(q) * .95 + p.r.dime * 3; }
function oopReady(p, q) {
  if (!q || !q.free() || q.state === 'knock' || (S.match && S.match.oopCd && S.match.oopCd[q.team] > S.match.gameT && !isLocal(p) && !isLocal(q))) return false;
  const rim = attackRim(q.team), d = dist2(q.x, q.y, rim.x, rim.y);
  return d <= oopRange(p, q) && d > 20 && !q.foes.some(f => dist2(f.x, f.y, q.x, q.y) < 16);
}
function alleyOop(p, q) {
  if (S.match) { S.match.oopCd = S.match.oopCd || [0, 0]; S.match.oopCd[q.team] = S.match.gameT + 12; }
  const def = startDunk(q, { oop: true }), D = q.dunk, t = D.T * .7;
  const hx = q.x + q.vx * t, hy = q.y + q.vy * t, hz = q.z + q.vz * t - .5 * D.G * t * t + q.reach() * .92;
  passBall(p, q, 'oop', { T: t, bx: hx, by: hy, bz: hz });
  emit('oopThrow', { slot: p.slot, to: q.slot, dunk: def.id });
}

/* ---- defense ---- */
function startSteal(p) {
  if (p.cd.steal > 0) return; p.setState('steal'); p.stealDone = false; p.cd.steal = tune('stealCooldown') + (isLocal(p) ? 0 : .04);
  const h = S.ball.owner; if (h) p.facing = Math.atan2(h.y - p.y, h.x - p.x);
  sfx('whoosh', { vol: .2 });
}
function stealHit(p) {
  p.stealDone = true; const b = S.ball, h = b.state === 'held' ? b.owner : null;
  if (!h || h.team === p.team) return;
  const reach = tune('stealReach') + .6 * p.r.swipe, d = dist2(p.x, p.y, h.x, h.y);
  if (d > reach) return;
  if (h.state === 'spin' || h.state === 'air' || h.state === 'gather' || h.state === 'dunk') return;
  let k = tune('stealChance') * p.f('swipe') * (1.25 - .05 * h.r.dime);
  const rel = toLocal(h.rig, p.x - h.x, p.y - h.y, 0), ang = Math.atan2(rel[1], rel[0]);
  if (Math.abs(ang) > 2.1) k *= 1.4; else if (Math.sign(rel[1]) === Math.sign(h.dribble.lat || h.dribble.side)) k *= 1.4; else k *= .6;
  if (h.turboOn) k *= 1.15; if (p.isNova()) k *= 1.2; if (p.overclock > 0 || get('team', p.teamId).boss) k *= 1.15;
  if (h.pu && h.pu.id === 'glue') k = 0; else if (p.pu && p.pu.id === 'glue') k = 1;
  const win = S.rng() < clamp(k, 0, 1);
  emit('stealTry', { slot: p.slot, victim: h.slot, win, chance: k });
  if (!win) { p.cd.steal = Math.max(p.cd.steal, .2); return; }
  if (d < 8) giveBall(p, 'steal'); else { const a = Math.atan2(p.y - h.y, p.x - h.x); b.x = h.ballAt ? h.ballAt[0] : b.x; looseBall(Math.cos(a) * 90, Math.sin(a) * 90, 60, h); }
  p.stats.STL++; sfx('steal'); P.glints(b.x, b.y, b.z, 6, '#5aff6a');
  emit('steal', { slot: p.slot, name: p.name, victim: h.name, vslot: h.slot });
}
function startShove(p) {
  if (p.cd.shove > 0 || (!p.infTurbo() && p.turbo < .1)) return;
  p.setState('shove'); p.shoveDone = false; p.cd.shove = tune('shoveCooldown'); if (!p.infTurbo()) p.turbo = Math.max(0, p.turbo - tune('shoveCost'));
  const t = p.foes.slice().sort((a, b) => dist2(a.x, a.y, p.x, p.y) - dist2(b.x, b.y, p.x, p.y))[0];
  if (t && dist2(t.x, t.y, p.x, p.y) < 40) p.facing = Math.atan2(t.y - p.y, t.x - p.x);
  p.windup = isLocal(p) ? 0 : .04; sfx('whoosh', { vol: .3 });
}
function shoveHit(p) {
  p.shoveDone = true; const bomb = p.pu && p.pu.id === 'bomb';
  if (bomb) { endPowerup(p); emit('bombHit', { slot: p.slot, name: p.name }); P.explosion(p.x, p.y, 10, 1.2); for (const q of p.foes) if (dist2(q.x, q.y, p.x, p.y) < 60) knockDown(q, p, { fumble: 1, push: 260 }); return; }
  let hit = null;
  for (const q of p.foes) {
    if (q.state === 'knock' || q.state === 'frozen' || q.state === 'hang') continue;
    const d = dist2(q.x, q.y, p.x, p.y), a = Math.abs(E.angDiff(p.facing, Math.atan2(q.y - p.y, q.x - p.x)));
    if (d < 24 && a < 1.05 && Math.abs(q.z - p.z) < 30) { hit = q; break; }
  }
  if (!hit) return;
  const kd = S.cheats.oneShove ? 1.4 : clamp(tune('knockdownTime') + .04 * (p.r.bump - hit.r.bump), .3, 1.4);
  knockDown(hit, p, { time: kd, push: tune('shoveForce') * (.75 + .05 * p.r.bump), shove: true, fumble: S.cheats.oneShove ? 1 : 0 });
  P.impact((p.x + hit.x) / 2, (p.y + hit.y) / 2, 24, 1, '#ffffff'); game.shake(2); sfx('shove');
  emit('shove', { slot: p.slot, name: p.name, victim: hit.name, vslot: hit.slot });
}
/** down goes q: sliding back, the ball loose (a fumble), the shot lost; juice and the robots' reboot count */
function knockDown(q, by, o = {}) {
  const b = S.ball, had = b.owner === q && (b.state === 'held' || b.state === 'dunk');
  const a = by ? Math.atan2(q.y - by.y, q.x - by.x) : 0, push = o.push || 160;
  const wasAir = q.state === 'air' || q.state === 'dunk' || q.state === 'gather';
  q.setState('knock'); q.kdT = o.time || clamp(tune('knockdownTime'), .3, 1.4); q.vx = Math.cos(a) * push; q.vy = Math.sin(a) * push; q.vz = Math.max(0, q.vz);
  q.dizzy = o.dizzy || 0; q.jump = null; q.dunk = null; q.flashT = .12; q.juice = Math.max(0, q.juice - .06); q.stats.KD++;
  if (had) {
    const fumble = o.fumble || (wasAir ? .7 : clamp(tune('shoveFumble') + .04 * ((by ? by.r.bump : 5) - q.r.bump), .2, .95));
    if (S.rng() < fumble) looseBall(Math.cos(a) * 110, Math.sin(a) * 110, 90, q);
  }
  sfx('fall', { vol: .5 });
  if (get('team', q.teamId).boss) { const t = S.match ? S.match.gameT : 0; q.knocks = q.knocks.filter(x => t - x < 10); q.knocks.push(t); if (q.knocks.length >= 2) { q.knocks = []; q.rebootPending = true; } }
  emit('knockdown', { slot: q.slot, name: q.name, by: by && by.slot, poster: !!o.poster });
}
function startSpin(p) {
  if (p.cd.spin > 0 || (!p.infTurbo() && p.turbo < .2)) return;
  p.setState('spin'); p.cd.spin = tune('spinCooldown'); if (!p.infTurbo()) p.turbo = Math.max(0, p.turbo - tune('spinCost'));
  const c = p.cmd, m = Math.hypot(c.mx, c.my), a = m > .3 ? Math.atan2(c.my, c.mx) : p.facing; p.spinDir = a; p.spinBroke = false;
  sfx('spin'); emit('spin', { slot: p.slot, name: p.name });
}
function startBlock(p, superK = 1) {
  jumpUp(p, 'block', jumpSpeed(p, 250) * superK, { superK });
  const h = S.ball.owner; if (h) p.facing = Math.atan2(h.y - p.y, h.x - p.x);
  if (superK > 1) { emit('superBlock', { slot: p.slot, name: p.name }); P.smoke(p.x, p.y, 0, 10, { color: '#e8e8f0' }); }
}
/** in the air with arms up: a block, or goaltending on a ball coming down over the rim */
function blockCheck(p) {
  const J = p.jump, b = S.ball; if (J.blocked) return;
  const hz = p.z + p.reach(), reach = tune('blockReach') + (p.r.swat - 5) * .8 + 4;
  const dx = b.x - p.x, dy = b.y - p.y, dz = b.z - hz, d = Math.hypot(dx, dy, Math.min(0, dz) * 1, Math.max(0, dz - 4));
  if (d > reach) return;
  const rim = defendRim(p.team), nearRimNow = dist2(b.x, b.y, rim.x, rim.y) < 18 && b.z > RIM_Z;
  let target = null, kind = null;
  if (b.state === 'shot' && b.shot && b.shot.team !== p.team && !b.shot.blocked) {
    if (b.vz < 0 && nearRimNow) kind = 'goaltend';
    else if (b.shot.t < .25) kind = 'shot';
    target = b.shot.shooter;
  } else if (b.state === 'held' && b.owner && b.owner.team !== p.team && (b.owner.state === 'air' || b.owner.state === 'gather')) { kind = 'shot'; target = b.owner; }
  else if (b.state === 'dunk' && b.owner && b.owner.team !== p.team && !b.owner.dunk.slammed) { kind = 'dunk'; target = b.owner; }
  if (!kind || J.tried.has(target)) return;
  J.tried.add(target);
  if (kind === 'goaltend') {
    if (p.isNova() || get('team', p.teamId).boss) kind = 'shot';
    else { b.shot.goaltend = true; J.blocked = true; emit('goaltend', { slot: p.slot, name: p.name }); onBasket(b.shot.rim, { goaltend: true }); return; }
  }
  let k = kind === 'dunk' ? clamp(.34 + .06 * (p.r.swat - target.r.slam), .1, .75) : clamp(.42 + .05 * (p.r.swat - 5), .12, .85);
  if (p.isNova()) k += .15; if (p.state === 'air' && J.superK > 1) k += .2;
  if (S.cheats.unblockable && kind === 'dunk') k = 0;
  k *= tune('blockChance');
  J.swatT = .15; p.rig.kick(.5);
  if (S.rng() >= clamp(k, 0, 1)) return;
  J.blocked = true;
  const away = -attackRim(target.team).side, vx = away * (120 + S.rng() * 60), vy = (S.rng() - .5) * 120;
  if (b.state === 'shot') { b.shot.blocked = true; b.shot.made = false; b.shot.rattle = false; b.state = 'loose'; b.vx = vx; b.vy = vy; b.vz = 140; b.lastTouch = p; b.noCatch = .15; b.noCatchBy = p; }
  else { looseBall(vx, vy, 140, target); if (kind === 'dunk') { target.setState('air'); target.jump = { kind: 'drop', tried: new Set() }; target.vx *= .2; target.vy *= .2; target.dunk = null; } else if (target.jump) target.jump.released = true; }
  p.stats.BLK++; sfx('block'); P.impact(b.x, b.y, b.z, 1.2, '#ff5a5a'); game.shake(2); p.rig.kick(.8);
  emit('block', { slot: p.slot, name: p.name, victim: target.name, vslot: target.slot, kind });
}

/* ---- rebounds, loose balls and catches ---- */
function canCatch(p) { return (p.state === 'run' || p.state === 'air' || p.state === 'cele' || p.state === 'taunt') && p.cd.catch <= 0 && !p.has; }
function catchStep(dt) {
  const b = S.ball; if (!b) return;
  b.noCatch = Math.max(0, b.noCatch - dt);
  if (b.state === 'shot' && b.shot) b.shot.t += dt;
  if (b.state === 'pass') {
    const ps = b.pass;
    for (const q of S.players) {   // interceptions: a defender with hands in the lane
      if (q.team === ps.from.team || ps.tried.has(q) || !canCatch(q)) continue;
      const h = handsAt(q); if (Math.hypot(h[0] - b.x, h[1] - b.y) > 10 || b.z > q.z + q.reach() + 6 || b.z < q.z) continue;
      ps.tried.add(q); const k = ps.kind === 'inbound' ? (ps.laneOk ? .3 : 0) : clamp(.22 + .04 * (q.r.swipe - ps.from.r.dime), .12, .55) * (q.pu && q.pu.id === 'glue' ? 3 : 1);
      if (S.rng() < k) { giveBall(q, 'intercept'); q.stats.STL++; sfx('steal'); emit('intercept', { slot: q.slot, name: q.name, victim: ps.from.name }); emit('steal', { slot: q.slot, name: q.name, victim: ps.from.name, vslot: ps.from.slot, intercept: true }); return; }
    }
    const q = ps.to, h = handsAt(q);
    if (q.state === 'dunk' && ps.oop) { if (Math.hypot(h[0] - b.x, h[1] - b.y, h[2] - b.z) < 16 || ps.t >= ps.T) { giveBall(q, 'oop'); b.state = 'dunk'; ps.from.stats.AST++; emit('alleyoop', { slot: q.slot, name: q.name, from: ps.from.name }); sfx('catch'); } return; }
    if (canCatch(q) && Math.hypot(h[0] - b.x, h[1] - b.y, (h[2] - b.z) * .6) < 14) { const was = ps.from; giveBall(q, ps.kind === 'inbound' ? 'inbound' : 'pass'); q.holdT = .12; q.lastPassFrom = was; q.lastPassT = 0; sfx('catch', { vol: .3 }); emit('catch', { slot: q.slot, from: was.slot, kind: ps.kind }); }
    return;
  }
  if (b.state !== 'loose') return;
  let best = null, bd = 1e9;
  for (const p of S.players) {
    if (!canCatch(p) || (b.noCatch > 0 && b.noCatchBy === p)) continue;
    const hd = dist2(p.x, p.y, b.x, b.y); if (hd > 12) continue;
    const top = p.z + p.reach() + 4; if (b.z > top || b.z < p.z - 4) continue;
    if (hd < bd) { bd = hd; best = p; }
  }
  if (!best) return;
  const fromShot = b.shot && !b.shot.made, offensive = fromShot && b.shot.team === best.team;
  giveBall(best, fromShot ? 'rebound' : 'loose');
  if (fromShot) { best.stats.REB++; emit('rebound', { slot: best.slot, name: best.name, offensive, air: best.state === 'air' }); }
  if (best.state === 'air' && best.jump) best.jump.kind = 'rebound';
  best.holdT = .15; sfx('catch', { vol: .3 });
}

/* ---- each player, every step ---- */
function playerStep(p, dt) {
  p.st += dt; for (const k in p.cd) p.cd[k] = Math.max(0, p.cd[k] - dt);
  p.call = Math.max(0, p.call - dt); p.holdT = Math.max(0, (p.holdT || 0) - dt); p.passiveT = Math.max(0, (p.passiveT || 0) - dt); p.dizzy = Math.max(0, p.dizzy - dt); p.flashT = Math.max(0, (p.flashT || 0) - dt);
  if (p.act) { p.act.t += dt; if (p.act.t > p.act.dur) p.act = null; }
  if (p.order) { p.order.t -= dt; if (p.order.t <= 0) p.order = null; }
  if (p.lastPassT !== undefined) p.lastPassT += dt;
  if (p.rebootPending && p.state !== 'knock' && p.state !== 'air') { p.rebootPending = false; p.setState('frozen'); p.vx = p.vy = 0; emit('reboot', { slot: p.slot, name: p.name }); }
  const c = p.cmd, live = matchLive();
  turboStep(p, c, dt);
  const decel = k => { p.vx = approach(p.vx, 0, k * dt); p.vy = approach(p.vy, 0, k * dt); };
  switch (p.state) {
    case 'run': locomote(p, c, dt); if (live || S.match && S.match.phase === 'tipoff') actRun(p, c, dt); else if (c.tauntP && !HUB && !p.has) startTaunt(p); break;
    case 'gather': decel(900); if (p.st >= .08 + (p.windup || 0)) { jumpUp(p, 'shot', jumpSpeed(p, tune('jumpShotVz'))); p.vx = p.vx * .5; p.vy = p.vy * .5; } break;
    case 'air': airStep(p, c, dt); break;
    case 'dunk': dunkStep(p, dt); break;
    case 'hang': p.vx = p.vy = 0; if (p.st >= p.hangT) { p.setState('air'); p.jump = { kind: 'drop', tried: new Set() }; p.vz = 0; } break;
    case 'knock': decel(260); if (p.z > 0) { p.vz -= pGravity(p) * dt; p.z = Math.max(0, p.z + p.vz * dt); } if (p.st >= p.kdT) p.setState('getup'); break;
    case 'getup': decel(900); if (p.st >= .3) p.setState('run'); break;
    case 'spin': {
      const sp = 30 / .35 + 20; p.vx = Math.cos(p.spinDir) * sp; p.vy = Math.sin(p.spinDir) * sp; p.facing = p.spinDir;
      if (!p.spinBroke) for (const q of p.foes) { if (q.state !== 'run') continue; const d = dist2(q.x, q.y, p.x, p.y), a = Math.abs(E.angDiff(p.spinDir, Math.atan2(q.y - p.y, q.x - p.x))); if (d < 16 && a < 1) { p.spinBroke = true; q.setState('stumble'); q.vx = -Math.cos(p.spinDir) * 40; q.vy = Math.sin(p.spinDir) * 60; emit('anklesBroken', { slot: p.slot, name: p.name, victim: q.name, vslot: q.slot }); } }
      if (p.st >= .35) p.setState('run'); break;
    }
    case 'steal': locomote(p, c, dt, .5); if (!p.stealDone && p.st >= .1) stealHit(p); if (p.st >= .38) p.setState('run'); break;
    case 'shove': { const lunge = p.st > p.windup && p.st < p.windup + .14 ? 70 : 0; p.vx = Math.cos(p.facing) * lunge; p.vy = Math.sin(p.facing) * lunge; if (!p.shoveDone && p.st >= .07 + p.windup) shoveHit(p); if (p.st >= .44 + p.windup) p.setState('run'); break; }
    case 'stumble': decel(200); if (p.st >= .4) p.setState('run'); break;
    case 'frozen': decel(600); if (p.st >= 3) { p.setState('run'); p.passiveT = 1; } if (Math.floor(p.st * 6) !== Math.floor((p.st - dt) * 6)) P.sparks(p.x, p.y, 40, 3, null, { color: '#8ad0ff' }); break;
    case 'cele': case 'taunt': decel(800); if (Math.hypot(c.mx, c.my) > .3 || c.shootP || c.passP || p.st >= (p.state === 'taunt' ? TAUNT_LEN : CELE_LEN) || (live && p.state === 'cele' && p.has)) p.setState('run'); break;
    case 'inbound': p.vx = p.vy = 0; break;
    case 'idle': decel(600); break;
  }
  if (p.state !== 'dunk' && p.state !== 'hang') { p.x += p.vx * dt; p.y += p.vy * dt; }
  if (p.state !== 'inbound' && p.state !== 'idle') clampToArena(p);
  juiceStep(p, dt);
  if (p.pu) { p.pu.t -= dt; if (p.pu.t <= 0) endPowerup(p); }
}
function startTaunt(p) { if (HUB) return; p.setState('taunt'); p.clip = p.def.taunt; sfx('taunt'); emit('taunt', { slot: p.slot, name: p.name, bark: pickF(p.def.barks) }); }
function startCele(p) { p.setState('cele'); p.clip = pickF(p.def.cele); }
/** the buttons while on the floor, by situation */
function actRun(p, c, dt) {
  const b = S.ball, mate = p.mate, tip = S.match && S.match.phase === 'tipoff';
  if (tip) { if (c.shootP && S.match.jumpers.includes(p) && p.cd.jump <= 0 && !p.tipJumped) { p.tipJumped = true; jumpUp(p, 'tip', jumpSpeed(p, 250) * 1.1); } return; }
  if (p.has) {
    if (c.shootP) {
      const rim = attackRim(p.team), d = dist2(p.x, p.y, rim.x, rim.y), vent = onVent(p) && (rim.side > 0 ? p.x > CMX : p.x < CMX);
      if ((c.turboD || vent) && canDunk(p)) startDunk(p, { vent: vent && c.turboD });
      else if (d <= 40) startLayup(p); else startShot(p);
      return;
    }
    if (c.passP && mate) { passBall(p, mate, passKind(p, mate)); return; }
    if (c.oopP && mate) { if (oopReady(p, mate)) alleyOop(p, mate); else passBall(p, mate, 'lob'); return; }
    if (c.shoveP) { startSpin(p); return; }
    return;
  }
  const ownBall = b && b.state === 'held' && b.owner && b.owner.team === p.team;
  if (ownBall && mate && mate.has) {
    const cpuMate = mate.source && mate.source.kind === 'cpu';
    if (c.passP) { p.call = .8; if (cpuMate) mate.order = { kind: 'pass', t: .9 }; emit('call', { slot: p.slot, kind: 'pass' }); }
    if (c.shootP && cpuMate) mate.order = { kind: 'shoot', t: .9 };
    if (c.oopP) { p.call = .8; if (cpuMate) mate.order = { kind: 'oop', t: 1.2 }; emit('call', { slot: p.slot, kind: 'oop' }); }
  } else {
    if (c.passP) startSteal(p);
    if (c.shootP && p.cd.jump <= 0) {
      const looseUp = b && (b.state === 'loose' || (b.state === 'shot' && b.vz < 0)) && dist2(b.x, b.y, p.x, p.y) < 40;
      if (looseUp) jumpUp(p, 'rebound', jumpSpeed(p, 230)); else startBlock(p, onVent(p) ? 1.6 : 1);
    }
  }
  if (c.shoveP && p.state === 'run') startShove(p);
  if (c.tauntP && p.state === 'run' && !HUB) startTaunt(p);
}
function airStep(p, c, dt) {
  const J = p.jump || { kind: 'drop' }, g = pGravity(p);
  p.vz -= g * dt; p.z += p.vz * dt;
  if (J.kind === 'block' || J.kind === 'rebound' || J.kind === 'tip') { p.vx = approach(p.vx, c.mx * 40, 200 * dt); p.vy = approach(p.vy, c.my * 40, 200 * dt); }
  if (J.swatT > 0) J.swatT -= dt;
  if (J.kind === 'shot' && !J.released) { if (!p.has) J.released = true; else if (!c.shootD || p.st >= J.ta + .25) releaseShot(p); }
  if (J.kind === 'layup' && !J.released) { if (!p.has) J.released = true; else if (p.st >= J.T * .5) { J.released = true; const ch = shotChance(p, { x: J.x0, y: J.y0, layup: true }); launchShot(p, ch, { layup: true }); } }
  if (J.kind === 'block' || J.kind === 'rebound') blockCheck(p);
  if (p.has && (J.kind === 'rebound' || J.kind === 'block') && (c.shootP || c.turboD)) {   // a putback
    const rim = attackRim(p.team); if (dist2(p.x, p.y, rim.x, rim.y) < 44 && p.z > 4) { startDunk(p, { putback: true }); emit('putbackTry', { slot: p.slot }); return; }
  }
  if (p.z <= 0 && p.vz <= 0) {
    p.z = 0; p.vz = 0; const heavy = J.kind === 'drop';
    p.setState('run'); p.landT = 1; p.landK = heavy ? 1 : .35; p.jump = null; p.vx *= .3; p.vy *= .3;
    sfx(heavy ? 'land_heavy' : 'land', { vol: heavy ? .5 : .2 }); if (heavy) { P.dust(p.x, p.y, 0, 12); p.rig.kick(-1); }
    if (J.quake) { P.ring(p.x, p.y, 4, 46, '#ffd23a', .5); game.shake(5); for (const q of p.foes) if (dist2(q.x, q.y, p.x, p.y) < 40 && q.state !== 'knock') knockDown(q, p, { time: .9, push: 200 }); }
  }
}
