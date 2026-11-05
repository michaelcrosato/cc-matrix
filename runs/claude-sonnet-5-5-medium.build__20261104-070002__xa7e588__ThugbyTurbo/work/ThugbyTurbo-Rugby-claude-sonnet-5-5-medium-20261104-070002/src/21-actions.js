/* THUGBY TURBO — actions: passing, kicking, evasion, contact, laws, hype. */
function addHype(team, n) { const h = S.hype[team]; S.hype[team] = clamp(h + n * TUNE.v.hypeMult, 0, 100); if (h < 100 && S.hype[team] >= 100) { bus.emit('superReady', { team }); if (S.seats.some(s => s.team === team)) banner('△ SUPER READY!', '#ffe070'); } }
const refSees = p => !S.ref.down && S.ref.down <= 0 && Math.hypot(S.ref.x - p.x, S.ref.y - p.y) < TUNE.v.refRange && Math.abs(angDiff(S.ref.facing, Math.atan2(p.y - S.ref.y, p.x - S.ref.x))) < TUNE.v.refFov / 2;
const nearestOpp = (p, r, f) => { let best = null, bd = r; for (const q of S.players) if (q.team !== p.team && alive(q) && (!f || f(q))) { const d = dist2(p, q); if (d < bd) { bd = d; best = q; } } return best; };

// ---------- passing
function receivers(p, side) {
  const d = S.dir[p.team], out = [];
  for (const q of S.players) if (q.team === p.team && q !== p && standing(q) && (q.x - p.x) * d <= 4 && dist2(p, q) < 220 && (side === 0 || (side < 0 ? q.y < p.y - 2 : q.y > p.y + 2))) out.push(q);
  return out.sort((a, b) => Math.abs(a.y - p.y) - Math.abs(b.y - p.y));
}
function bestReceiver(p, side, long) {
  let list = receivers(p, side);
  if (!list.length && TT.settings.passAssist) list = receivers(p, -side);
  if (!list.length) return null;
  const near = list.filter(q => dist2(p, q) < (long ? 300 : 110));
  const L = near.length ? near : list;
  return long && L.length > 1 ? L[1] : L[0];
}
function doPass(p, rec, long, opts = {}) {
  const b = S.ball; if (b.holder !== p) return false;
  if (!rec) return doDummy(p);
  const d = S.dir[p.team], forward = (rec.x - p.x) * d > 4;
  const spd = TUNE.v.passSpeed * (long ? 1.3 : 1), dd = dist2(p, rec), T = Math.max(.12, dd / spd);
  const tx = rec.x + rec.vx * T * .9, ty = rec.y + rec.vy * T * .9;
  b.holder = null; b.st = 'pass'; b.x = p.x; b.y = p.y; b.z = 13; b.vx = (tx - p.x) / T; b.vy = (ty - p.y) / T; b.vz = (14 - 13 + 300 * T * T) / T; b.rotV = 14; b.target = rec.id; b.forward = forward; b.long = long; b.passer = p.id; b.tried = {}; b.offload = !!opts.offload;
  p.am = 'pass'; p.amT = 0; p.facing = Math.atan2(ty - p.y, tx - p.x); p.cd.pass = .2;
  S.poss = p.team; S.lastTeam = p.team; S.lastTouch = p.id; S.useIt = 0;
  if (p.superKind === 'thunder') endSuper(p);
  bus.emit('pass', { from: p.id, to: rec.id, forward, long }); return true;
}
function doDummy(p) {
  p.am = 'pass'; p.amT = 0; p.cd.pass = .3; let n = 0;
  for (const q of S.players) if (q.team !== p.team && standing(q) && dist2(p, q) < 40 && S.rng() < .4) { q.reactT = .3; n++; }
  if (n) { addHype(p.team, 4 * n); bus.emit('dummy', { id: p.id, n }); banner('DUMMY!', '#ffd0a0', 1); }
  return true;
}
function catchRoll(q, long, pass) {
  let c = TUNE.v.catchBase * (.9 + .01 * q.hnd) - (long ? .06 : 0) - (S.venue.weather && S.venue.weather.kind === 'rain' ? .06 : 0);
  if (nearestOpp(q, 20)) c -= .12; if (pass && (q.onFire > 0 || (S.players[S.ball.passer] || {}).onFire > 0)) return true;
  if (S.ball.offload) c -= .1;
  return S.rng() < c;
}
function stepFlight(dt) {
  const b = S.ball;
  if (b.st === 'pass') {
    const r = S.players[b.target];
    for (const q of S.players) { if (q.team === S.players[b.passer].team || !standing(q) || b.tried[q.id]) continue; if (Math.hypot(q.x - b.x, q.y - b.y) < 10 && b.z < 24) { b.tried[q.id] = 1; const human = q.ctl >= 0, ch = human ? (q.flags.holdX ? .45 : .06) : .08 * (S.cfg.interceptMult || 1) * TUNE.v.aiAggression; if (S.rng() < ch) { giveBall(q); bus.emit('interception', { id: q.id }); addHype(q.team, 12); banner('INTERCEPTED!', '#ff8060'); return; } } }
    if (r && standing(r) && Math.hypot(r.x - b.x, r.y - b.y) < 10 && b.z < 30) {
      if (b.forward) { bus.emit('forwardPass', {}); line('forwardPass'); return startScrumAt(opp(r.team), S.players[b.passer].x, S.players[b.passer].y, 'FORWARD!'); }
      if (catchRoll(r, b.long, true)) { giveBall(r); bus.emit('catch', { id: r.id }); }
      else { const fw = S.rng() < .5; b.st = 'loose'; b.vx *= .25; b.vy *= .25; b.vz = 40; S.poss = -1; if (fw) return knockOn(r); }
    }
  }
}
function knockOn(p) {
  bus.emit('knockOn', { id: p.id }); line('knockOn'); const b = S.ball;
  startScrumAt(opp(p.team), b.x, b.y, 'KNOCK ON!');
}

// ---------- kicking
function doKick(p, kind, power, aim) {
  const b = S.ball; if (b.holder !== p) return;
  const d = S.dir[p.team]; let ang = Math.atan2(aim ? aim[1] : 0, aim ? aim[0] : d), mag = aim ? Math.hypot(aim[0], aim[1]) : 0;
  const base = mag > .3 ? ang : (d > 0 ? 0 : Math.PI);
  let dx = Math.cos(base), dy = Math.sin(base);
  let dist, apex, vz0;
  const boot = p.power === 'boot' ? 1.6 : 1, fire = p.onFire > 0 ? 1.2 : 1;
  if (kind === 'grubber') { dist = U(S.rng, 140, 200); vz0 = 40; }
  else if (kind === 'bomb') { dist = lerp(120, TUNE.v.kickMax, power) * .5 * (.75 + .03 * p.kck); vz0 = 380; }
  else { dist = lerp(120, TUNE.v.kickMax, power) * (.75 + .03 * p.kck) * (power > .9 ? 1.08 : 1); vz0 = 230 + power * 90; if (power <= .9) { const hook = (S.rng() * 2 - 1) * (11 - p.kck) * Math.PI / 180; dx = Math.cos(base + hook); dy = Math.sin(base + hook); } }
  dist *= boot * fire; if (p.power === 'boot') { p.power = null; }
  const T = kind === 'grubber' ? dist / 170 : Math.max(.5, 2 * vz0 / 600);
  b.holder = null; b.st = 'kick'; b.x = p.x; b.y = p.y; b.z = 8; b.vx = dx * dist / T; b.vy = dy * dist / T; b.vz = kind === 'grubber' ? 40 : vz0; b.rotV = kind === 'grubber' ? 4 : 10; b.lastKicker = p.id; b.kickT = 0; b.kind = kind;
  S.useIt = 0; S.poss = -1; S.lastTeam = p.team; S.lastTouch = p.id; p.am = 'kick'; p.amT = 0; p.cd.pass = .5;
  if (p.superKind === 'thunder') endSuper(p);
  S.kickInfo = { x: p.x + dx * dist, y: p.y + dy * dist, t: S.t, T }; bus.emit('kick', { id: p.id, kind, dist });
}
function stepKick(dt) {
  const b = S.ball; if (b.st !== 'kick') return; b.kickT += dt;
  // contest for a high ball
  if (b.z < 30 && b.vz < 40) {
    const near = S.players.filter(q => standing(q) && Math.hypot(q.x - b.x, q.y - b.y) < 11);
    if (near.length) {
      let win = near[0];
      if (near.length > 1) { let bs = -9; for (const q of near) { const sc = q.hnd * .1 + S.rng() * .5 + (q.flags.holdX ? .6 : 0) + (q.team === S.lastTeam ? 0 : .05); if (sc > bs) { bs = sc; win = q; } } for (const q of near) if (q !== win && q.team !== win.team) { q.st = 'down'; q.stT = .8; } if (near.some(q => q.team !== win.team)) bus.emit('aerialContest', {}); }
      if (win.team !== S.lastTeam || b.kind !== 'grubber') { giveBall(win); bus.emit('kickCaught', { id: win.id }); if (S.cfg.mode === 'drill') {} return; }
    }
  }
}

// ---------- evasion
function doSidestep(p, I) {
  if (p.cd.step > 0) return;
  const double = S.t - p.lastStepT < .25 && p.cd.spin <= 0; p.lastStepT = S.t;
  const fx = Math.cos(p.facing), fy = Math.sin(p.facing);
  let side;
  if (Math.hypot(I.mx, I.my) > .3) side = Math.sign(fx * I.my - fy * I.mx) || 1; else { const o = nearestOpp(p, 80); side = o ? -Math.sign(fx * (o.y - p.y) - fy * (o.x - p.x)) || 1 : 1; }
  if (double) { p.evade = .4; p.cd.spin = 1; p.am = 'spinmove'; p.amT = 0; p.vx *= .85; p.vy *= .85; bus.emit('spin', { id: p.id }); return; }
  p.evade = TUNE.v.sidestepEvade; p.cd.step = .6; p.vx += -fy * side * TUNE.v.sidestepPower; p.vy += fx * side * TUNE.v.sidestepPower; p.am = 'sidestep'; p.amT = 0; p.sideDir = side;
  bus.emit('sidestep', { id: p.id });
}
function doFend(p) { if (p.cd.fend > 0) return; p.fend = .3; p.cd.fend = .8; p.am = 'fend'; p.amT = 0; bus.emit('fendStart', { id: p.id }); }

// ---------- contact
function tackleAttempt(tk, kind, charge) {
  const car = S.ball.holder; if (!car || car.team === tk.team) return false;
  const range = kind === 'big' ? 18 : kind === 'dive' ? TUNE.v.tackleRange + 30 : TUNE.v.tackleRange;
  if (dist2(tk, car) > range + 2) return false;
  const ang = Math.abs(angDiff(Math.atan2(car.y - tk.y, car.x - tk.x), tk.facing));
  if (ang > (kind === 'dive' ? 1.2 : 1.25) && kind !== 'super') return false;
  tk.am = kind === 'dive' ? 'dive' : kind === 'big' ? 'bighit' : 'tackle'; tk.amT = 0;
  const behind = Math.abs(angDiff(car.facing, Math.atan2(tk.y - car.y, tk.x - car.x))) > 1.8;
  let chance = TUNE.v.tackleBase * (.9 + .02 * tk.tkl - .02 * car.pow) + (behind ? .1 : 0) + (kind === 'big' ? .08 + .12 * charge : 0) + (S.cfg.tackleBonus && tk.team === 1 ? S.cfg.tackleBonus : 0) - (car.turboOn ? .05 : 0);
  if (kind === 'big') chance = .7 + .2 * charge;
  if (car.grease > 0) chance = Math.min(chance, .3);
  if (tk.iron > 0) chance = 1; if (tk.onFire > 0) chance += .2; if (car.onFire > 0) chance *= .6;
  if (tk.superKind === 'hurricane') chance = 1;
  if (car.superKind === 'thunder' || (S.dev.unstoppable && car.ctl >= 0)) { tk.st = 'fall'; tk.stT = .9; tk.vx = (tk.x - car.x) * 4; tk.vy = (tk.y - car.y) * 4; bounceAway(tk, car); bus.emit('missedTackle', { id: tk.id }); return true; }
  if (car.evade > 0) { tk.st = 'fall'; tk.stT = .6; bus.emit('missedTackle', { id: tk.id, evaded: true }); addHype(car.team, 6); S.stats[tk.team].missed++; return true; }
  if (car.fend > 0 && tk.iron <= 0) {
    const beat = TUNE.v.fendBeat + .03 * (car.pow - tk.tkl) * (kind === 'big' ? .5 : 1) + (car.onFire > 0 ? .3 : 0);
    if (S.rng() < beat) { tk.st = 'ground'; tk.stT = .8; tk.vx = Math.cos(car.facing) * 90; tk.vy = Math.sin(car.facing) * 90; bus.emit('fend', { id: car.id }); addHype(car.team, 6); banner('FENDED!', '#ffd070', 1); return true; }
  }
  if (car.immovable && !(kind === 'big' && charge > .95) && tk.superKind !== 'hurricane') {
    if (car.heldT > 0 && car.heldBy !== tk.id) { return finishTackle(tk, car, kind, charge); }
    car.heldT = 1.0; car.heldBy = tk.id; tk.st = 'fall'; tk.stT = 1.2; tk.vx = -Math.cos(tk.facing) * 70; tk.vy = -Math.sin(tk.facing) * 70; banner('HELD! NEED A SECOND TACKLER!', '#ffa0ff', 1.4); bus.emit('held', {}); return true;
  }
  if (S.rng() < chance) return finishTackle(tk, car, kind, charge);
  tk.st = 'fall'; tk.stT = .6; car.st = 'run'; car.vx *= .6; car.vy *= .6; car.stagger = .4;
  S.stats[tk.team].missed++; addHype(car.team, 5); bus.emit('brokenTackle', { id: car.id }); banner('BROKEN TACKLE!', '#ffd070', 1);
  return true;
}
function bounceAway(tk, car) { tk.st = 'air'; tk.vz = 140; tk.z = 1; tk.vx = (tk.x - car.x) * 6 + Math.cos(car.facing) * 40; tk.vy = (tk.y - car.y) * 6; }
function finishTackle(tk, car, kind, charge) {
  const monster = (kind === 'big' && charge > .95) || tk.iron > 0 && kind === 'big' || tk.superKind === 'hurricane' || (S.dev.monster);
  S.stats[tk.team].tackles++; tk.st_tkl = (tk.st_tkl || 0) + 1; if (kind === 'big' || monster) { S.stats[tk.team].bigHits++; tk.st_big = (tk.st_big || 0) + 1; }
  addHype(tk.team, monster ? 16 : kind === 'big' ? 10 : 4);
  const dx = Math.cos(Math.atan2(car.y - tk.y, car.x - tk.x)), dy = Math.sin(Math.atan2(car.y - tk.y, car.x - tk.x));
  bus.emit('tackle', { by: tk.id, on: car.id, kind }); S.lastTackle = { x: car.x, y: car.y, by: tk.id };
  tk.st = 'tackling'; tk.stT = .5; tk.vx *= .3; tk.vy *= .3;
  if (kind === 'big' || monster) {
    bus.emit(monster ? 'monsterHit' : 'bigHit', { by: tk.id, on: car.id }); if (monster) S.stats[tk.team].monster++;
    const L = (monster ? 1.2 : .55) * TUNE.v.bigHitLaunch;
    car.st = 'air'; car.z = 1; car.vz = monster ? 220 : 110; car.vx = dx * L * 4.2; car.vy = dy * L * 4.2; car.flip = monster ? 1 : .4; car.am = 'launched'; car.amT = 0; car.superKind = car.superKind === 'thunder' ? '' : car.superKind;
    if (S.rng() < TUNE.v.spillChance || monster) { const spillFwd = dx * S.dir[car.team] > 0; dropBall(dx * 90, dy * 90 + U(S.rng, -30, 30), 120); S.lastTeam = car.team; if (spillFwd && S.rng() < .5) { S.pendingKnockOn = car; } }
    TT.hitFx && TT.hitFx(car, monster ? 2 : 1);
    if (S.ball.holder === car) { carrierDown(car, tk, true); }
    else { S.poss = -1; }
    line(monster ? 'monsterHit' : 'bigHit');
    S.replayReq = monster ? 'monster' : S.replayReq;
    return true;
  }
  car.am = 'tackled'; car.amT = 0; carrierDown(car, tk, false);
  if (S.cfg.mode !== 'drill' || true) TT.hitFx && TT.hitFx(car, .6);
  return true;
}
function carrierDown(car, tk, launched) {
  if (!launched) { car.st = 'ground'; car.stT = 1.4; car.vx = Math.cos(tk.facing) * 30; car.vy = Math.sin(tk.facing) * 30; }
  if (inGoalOf(car) && S.ball.holder === car) return scoreTry(car, 'tackled');
  if (S.ball.holder === car) { car.offload = .15; startRuck(car, tk); }
}
function startRuck(car, tk) {
  const d = S.dir[car.team], b = S.ball;
  const mark = { x: car.x - d * 8, y: car.y };
  b.holder = null; b.st = 'placed'; b.x = mark.x; b.y = mark.y; b.z = 1; b.vx = b.vy = 0; S.ruckMark = mark;
  setPhase('ruck'); S.sp = { type: 'ruck', team: car.team, x: mark.x, y: mark.y, bar: 0, t: 0, jack: false, carrier: car.id, tackler: tk.id, att: [], def: [], mash: [0, 0], first: null, done: false };
  S.poss = car.team; S.lastTeam = car.team;
  // commit
  const cands = t => S.players.filter(p => p.team === t && standing(p) && p !== car && p !== tk).sort((a, c) => Math.hypot(a.x - mark.x, a.y - mark.y) - Math.hypot(c.x - mark.x, c.y - mark.y)).filter(p => Math.hypot(p.x - mark.x, p.y - mark.y) < 90);
  S.sp.att = cands(car.team).slice(0, 2).map(p => p.id); S.sp.def = [tk.id].concat(cands(opp(car.team)).slice(0, 1).map(p => p.id));
  S.sp.bar = .2 + .1 * (S.sp.att.length - S.sp.def.length);
  S.sp.first = tk.id; bus.emit('ruck', { x: mark.x, y: mark.y }); S.ruckStamp = S.t;
  if (S.hooter) { S.hooterT += 0; }
}
function endSuper(p) { if (p.superKind) { p.superKind = ''; p.superT = 0; bus.emit('superEnd', { id: p.id }); } }
function useSuper(p) {
  const t = p.team; if (S.hype[t] < 100 || p.superKind) return false;
  if (S.ball.holder === p) { p.superKind = 'thunder'; p.superT = TUNE.v.superTime; banner('THUNDER RUN!', '#ffe070', 1.6); line('super'); S.replayReq = S.replayReq || 'super'; }
  else if (S.ball.holder && S.ball.holder.team !== t) { p.superKind = 'hurricane'; p.superT = 2; banner('HURRICANE HIT!', '#ff90ff', 1.6); line('super'); }
  else return false;
  S.hype[t] = 0; bus.emit('superStart', { id: p.id, kind: p.superKind }); return true;
}

// ---------- fouls and cards
function foul(off, kind, seenOverride) {
  if (S.dev.noFouls || S.cfg.mode === 'drill' && false) return false;
  const always = ['early', 'useIt', 'forward', 'notStraight'].includes(kind);
  const seen = always || seenOverride || refSees(off);
  if (!seen || S.ref.down > 0) { if (kind === 'cheap') { addHype(off.team, 8); line('cheapMissed'); banner('REF MISSED IT!', '#ffff80', 1.4); } bus.emit('foulUnseen', { id: off.id, kind }); return false; }
  const t = opp(off.team), names = { high: 'HIGH SHOT!', cheap: 'CHEAP SHOT!', offside: 'OFFSIDE!', hands: 'HANDS AWAY!', early: 'EARLY ENGAGEMENT!', useIt: 'USE IT!' };
  S.ref.call = names[kind] || 'PENALTY!'; S.ref.callT = 1.4; S.ref.sig = 'penalty'; S.ref.sigT = 1.5; S.stats[off.team].pens++;
  off.fouls = (off.fouls || 0) + (kind === 'high' ? 2 : 1);
  bus.emit('foul', { id: off.id, kind }); banner(names[kind] || 'PENALTY!', '#ff6060');
  if (off.fouls >= 2 && (kind === 'high' || kind === 'cheap')) cardPlayer(off, off.fouls >= 3 && off.card ? 'red' : 'yellow');
  const car = S.ball.holder, ownBall = (car && car.team === t) || (S.ball.st === 'loose' && S.lastTeam === t);
  if (car && car.team === t && (kind === 'high' || kind === 'cheap') && Math.abs(atkX(t) - car.x) < 60 && !S.players.some(q => q.team === off.team && alive(q) && (q.x - car.x) * S.dir[t] > 0 && (q.x - atkX(t)) * S.dir[t] < 0 && Math.abs(q.y - car.y) < 14)) {
    banner('PENALTY TRY! +7', '#ffe070', 2); bus.emit('penaltyTry', { team: t }); S.stats[t].tries++; if (afterScore(t, 7)) return true; setPhase('goalscored'); S.sp = { t: 0, team: t }; return true;
  }
  const spot = { x: clamp(off.x, G.X0 + 20, G.X1 - 20), y: clamp(off.y, G.Y0 + 20, G.Y1 - 20) };
  if (kind === 'early' || kind === 'useIt' || S.phase !== 'play' && S.phase !== 'ruck' || !ownBall) { if (S.cfg.mode === 'drill') return true; return startPenalty(t, spot.x, spot.y, kind === 'early'); }
  S.adv = { team: t, t: 5, x: car ? car.x : S.ball.x, y: spot.y, spotX: spot.x, spotY: spot.y, lost: false, free: false }; banner('ADVANTAGE!', '#80ff80', 1.2); S.ref.call = 'ADVANTAGE!'; S.ref.callT = 1.4; bus.emit('advantage', { team: t });
  return true;
}
function cardPlayer(p, color) {
  p.card = color; S.stats[p.team].cards++; bus.emit('card', { id: p.id, color }); banner(color === 'red' ? 'RED CARD!' : 'YELLOW CARD!', color === 'red' ? '#ff4040' : '#ffe040'); line('card');
  p.st = 'binned'; p.stT = color === 'red' ? 9999 : TUNE.v.sinBin; p.vx = p.vy = 0; if (S.ball.holder === p) dropBall(0, 0, 60);
  const bx = G.CX + 60 + (p.team ? 18 : 0) + S.players.filter(q => q.st === 'binned').length * 8; p.x = bx; p.y = G.Y1 + 30; p.z = 0;
}
function refDown(by) { if (S.ref.down > 0) return; S.ref.down = 8; S.ref.st = 'down'; banner('REF DOWN! ANYTHING GOES!', '#ffe070', 2.2); line('refDown'); bus.emit('refDown', {}); }
