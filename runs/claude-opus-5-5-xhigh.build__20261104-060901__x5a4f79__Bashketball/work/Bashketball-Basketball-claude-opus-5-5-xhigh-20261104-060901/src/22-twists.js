/* 22-twists: each court's twist (PLAN 10.1). THE SKYBOX: the Jackpot Spot (a ring that moves every 20 s: a jumper made
 * from it scores +2). THE PIER: sea breeze (gusts that bend every shot and the net). THE SCRAPYARD: oil slicks (players
 * slide; a hard turn at turbo speed slips). THE CALDERA: eruptions (lava bombs on telegraphed rings) and steam vents (the
 * VOLCANO LAUNCH, the SUPER BLOCK). THE BLAM DOME: the BLAMBOTS' OVERCLOCK, MAGNET HANDS and SYSTEM REBOOT. */
const TWIST = { kind: null, on: false, jackpot: false, spot: null, wind: false, windOn: false, windX: 0, windY: 0, gustT: 0, nextGust: 0, oil: false, slicks: [],
  volcano: false, vents: [], bombs: [], nextErupt: 0, rumble: 0, boss: false, overclocked: 0, q3Overclock: false };
function setupTwists(courtId, on, jackpotAll) {
  const court = get('court', courtId), k = court.twist, T = TWIST;
  Object.assign(T, { kind: k, on, jackpot: false, spot: null, wind: false, windOn: false, windX: 0, windY: 0, gustT: 0, oil: false, slicks: [], volcano: false, vents: [], bombs: [], rumble: 0, boss: false, overclocked: 0, q3Overclock: false });
  if (S.cheats.noTwists || S.cheats.tournament) on = false;
  T.on = on;
  if ((on && k === 'jackpot') || (jackpotAll && on)) { T.jackpot = true; moveSpot(); }
  if (on && k === 'wind') { T.wind = true; T.nextGust = (8 + S.rng() * 8) * tune('hazardInterval'); }
  if (on && k === 'oil') { T.oil = true; placeSlicks(); }
  if (on && k === 'volcano') { T.volcano = true; T.nextErupt = (14 + S.rng() * 10) * tune('hazardInterval'); T.vents = [{ x: OX + 200, y: OY + 60, puff: 0, pre: 0, t: 1.5 }, { x: OX + 440, y: OY + 228, puff: 0, pre: 0, t: 4 }]; }
  if (k === 'boss') T.boss = S.teams.some(t => get('team', t.id).boss);
  game.weather = court.weather ? Object.assign({}, court.weather) : null;
}
function moveSpot() {
  const ri = S.rng() < .5 ? 0 : 1, rim = RIMS[ri], a = (S.rng() - .5) * 2.4, d = 50 + S.rng() * 70;
  TWIST.spot = { rim: ri, x: clamp(rim.x - rim.side * Math.cos(a) * d, OX + 16, OX + CW - 16), y: clamp(rim.y + Math.sin(a) * d, OY + 16, OY + CH - 16), t: 20 };
}
function placeSlicks() {
  TWIST.slicks = [];
  for (let i = 0; i < 3; i++) for (let tries = 0; tries < 30; tries++) {
    const x = OX + 40 + S.rng() * (CW - 80), y = OY + 24 + S.rng() * (CH - 48), r = 20 + S.rng() * 16;
    const lx = x - OX, inKey = (lx < 170 || lx > CW - 170) && Math.abs(y - CMY) < 60, nearCentre = dist2(x, y, CMX, CMY) < 60, overlap = TWIST.slicks.some(s => dist2(s.x, s.y, x, y) < s.r + r + 10);
    if (!inKey && !nearCentre && !overlap) { TWIST.slicks.push({ x, y, r, ph: S.rng() * TAU }); break; }
  }
}
const onSlick = (x, y) => TWIST.slicks.some(s => ((x - s.x) / s.r) ** 2 + ((y - s.y) / (s.r * .6)) ** 2 < 1);
function slipOnOil(p) {
  const had = p.has; p.setState('knock'); p.kdT = .6; p.vx *= .6; p.vy *= .6;
  if (had) looseBall(p.vx * .8, p.vy * .8, 60, p);
  sfx('oil_slip'); emit('oilSlip', { slot: p.slot, name: p.name });
}
function twistHazardAt(x, y) { return onSlick(x, y) || TWIST.vents.some(v => dist2(v.x, v.y, x, y) < 26) || TWIST.bombs.some(b => dist2(b.x, b.y, x, y) < 30); }
function forceTwist(kind) {
  const T = TWIST;
  if (kind === 'gust') { T.wind = true; startGust(); }
  if (kind === 'slicks') { T.oil = true; placeSlicks(); }
  if (kind === 'eruption') { T.volcano = true; if (!T.vents.length) setupTwists(S.court, true); erupt(); }
  if (kind === 'vent') { T.volcano = true; if (!T.vents.length) T.vents = [{ x: OX + 200, y: OY + 60, puff: 0, pre: 0, t: 0 }, { x: OX + 440, y: OY + 228, puff: 0, pre: 0, t: 0 }]; for (const v of T.vents) { v.pre = 0; v.puff = 2; } }
  if (kind === 'overclock') overclock();
  if (kind === 'jackpot') { T.jackpot = true; moveSpot(); }
  if (kind === 'reboot') { const bot = S.players.find(p => get('team', p.teamId).boss) || S.players[2]; bot.rebootPending = true; }
}
function startGust() {
  const T = TWIST, w = (.45 + S.rng() * .55) * (S.rng() < .5 ? -1 : 1), a = (S.rng() - .5) * .87;
  T.windOn = true; T.gustT = 4; T.windX = w * Math.cos(a); T.windY = w * Math.sin(a) * .8; sfx('wind_gust'); emit('twist', { kind: 'gust', w });
}
function erupt() {
  const T = TWIST; T.rumble = 1.2; game.shake(1.5); sfx('rumble'); emit('twist', { kind: 'eruption' }); ARENA.erupt = 1.5;
  const b = S.ball, spots = [[b.x + (S.rng() - .5) * 40, b.y + (S.rng() - .5) * 30]];
  for (let i = 0; i < 2; i++) spots.push([OX + 60 + S.rng() * (CW - 120), OY + 30 + S.rng() * (CH - 60)]);
  spots.forEach(([x, y], i) => T.bombs.push({ x: clamp(x, OX + 20, OX + CW - 20), y: clamp(y, OY + 20, OY + CH - 20), t: -(i * 1), warn: 1.2, hit: false }));
}
function overclock() {
  const bots = S.players.filter(p => get('team', p.teamId).boss); if (!bots.length) return;
  for (const p of bots) { p.overclock = 30; p.turbo = 1; }
  TWIST.overclocked = 30; sfx('servo'); emit('overclock', {});
}
function twistStep(dt) {
  const T = TWIST, M = S.match, live = M.phase === 'live' || M.phase === 'inbound';
  if (T.jackpot && T.spot) { T.spot.t -= dt; if (T.spot.t <= 0) moveSpot(); }
  if (T.wind) {
    if (T.windOn) { T.gustT -= dt; if (T.gustT <= 0) { T.windOn = false; T.windX = T.windY = 0; } if (game.weather) game.weather.wind = T.windX; else game.weather = { kind: 'sand', amount: .35, wind: T.windX * 2 }; }
    else { if (game.weather && game.weather.kind === 'sand') game.weather = null; if (live) { T.nextGust -= dt; if (T.nextGust <= 0) { T.nextGust = (15 + S.rng() * 10) * tune('hazardInterval'); startGust(); } } }
  }
  if (T.volcano) {
    T.rumble = Math.max(0, T.rumble - dt); ARENA.erupt = Math.max(0, ARENA.erupt - dt);
    if (live) { T.nextErupt -= dt; if (T.nextErupt <= 0) { T.nextErupt = (25 + S.rng() * 10) * tune('hazardInterval'); erupt(); } }
    for (const bm of T.bombs) {
      bm.t += dt;
      if (bm.t >= bm.warn && !bm.hit) {
        bm.hit = true; P.explosion(bm.x, bm.y, 0, 1.4, { shake: 2 }); P.fire(bm.x, bm.y, 0, 10); sfx('bomb_hit');
        for (const p of S.players) if (dist2(p.x, p.y, bm.x, bm.y) < 22 && p.state !== 'knock' && p.state !== 'dunk' && p.state !== 'hang') knockDown(p, { x: bm.x, y: bm.y }, { time: .8, push: 140, fumble: 1 });
        if (S.ball.state === 'loose' && dist2(S.ball.x, S.ball.y, bm.x, bm.y) < 24 && S.ball.z < 20) { S.ball.vz = 220; S.ball.vx += (S.ball.x - bm.x) * 4; S.ball.vy += (S.ball.y - bm.y) * 4; }
      }
    }
    E.prune(T.bombs, bm => bm.t > bm.warn + .6);
    for (const v of T.vents) {
      v.t -= dt; v.puff = Math.max(0, v.puff - dt); v.pre = Math.max(0, v.pre - dt);
      if (v.t <= 0) { v.t = 5 * tune('hazardInterval'); v.pre = 1; }
      if (v.pre > 0 && v.pre - dt <= 0) { v.puff = 2; sfx('vent_puff', { vol: .4 }); }
    }
  }
  if (T.boss && M.phase === 'live') {
    const botTeam = S.players.find(p => get('team', p.teamId).boss).team, trail = M.score[1 - botTeam] - M.score[botTeam];
    if (M.quarter === M.quarters && !T.q4Overclock) { T.q4Overclock = true; overclock(); }
    if (M.quarter === M.quarters - 1 && trail >= 8 && !T.q3Overclock) { T.q3Overclock = true; overclock(); }
    T.overclocked = Math.max(0, T.overclocked - dt);
    for (const p of S.players) if (p.overclock > 0) { p.overclock -= dt; if (p.overclock <= 0) { p.overclock = 0; emit('overclockOff', { slot: p.slot }); } }
  }
}
/** the twists drawn on and over the floor */
function drawTwists(r) {
  const T = TWIST, t = ARENA.t;
  if (T.jackpot && T.spot) { const s = T.spot, k = .5 + .5 * Math.sin(t * 6); r.decal(() => { r.groundRing(s.x, s.y, 16, '#ffd23a', .9); r.groundRing(s.x, s.y, 13 + k * 2, '#fff0a0', .6); r.groundDisc(s.x, s.y, 15, '#ffd23a', .18); }); r.queue(s.x, s.y, 2, g => { const [x, y] = r.w(s.x, s.y, 10 + k * 3); E.font.text(g, '$', Math.round(x), Math.round(y) - 4, '#ffe060', { align: 'center', outline: '#5a3a00' }); }, { emissive: true }); }
  for (const s of T.slicks) r.decal(() => { r.groundDisc(s.x, s.y, s.r * .95, '#0c0a10', .85); for (let k = 0; k < 3; k++) { const a = t * .6 + s.ph + k * 2; r.groundArc(s.x + Math.cos(a) * s.r * .25, s.y + Math.sin(a) * s.r * .15, s.r * .3, s.r * .38, a, a + 1.6, ['#ff4ad8', '#4adfff', '#ffe04a'][k], .55); } });
  for (const v of T.vents) {
    r.decal(() => { r.groundDisc(v.x, v.y, 11, '#1a1010', 1); r.groundRing(v.x, v.y, 11, v.pre > 0 || v.puff > 0 ? '#ff8a3a' : '#5a3a2a', 1); r.groundRing(v.x, v.y, 6, '#3a2a20', 1); });
    if (v.pre > 0 || v.puff > 0) r.queue(v.x, v.y, 0, g => { const h = v.puff > 0 ? 80 : 18 * (1 - v.pre), [x] = r.w(v.x, v.y, 0); for (let k = 0; k < 9; k++) { const u = ((k / 9) + t * 1.4) % 1, z = u * h, w = 2 + u * 7, [, yy] = r.w(v.x, v.y, z); px.blend(g, .32 * (1 - u * .8), 'normal', () => px.disc(g, Math.round(x + Math.sin(t * 5 + k * 1.7) * (2 + u * 5)), Math.round(yy), w, k % 2 ? '#f4f4fa' : '#d8d8e4')); } });
  }
  for (const bm of T.bombs) {
    if (bm.t < 0) continue;
    if (!bm.hit) { const k = Math.floor(t * 10) % 2; r.decal(() => { r.groundRing(bm.x, bm.y, 22, k ? '#ff2a1a' : '#ff8a3a', .9); r.groundDisc(bm.x, bm.y, 22 * bm.t / bm.warn, '#ff3a1a', .25); });
      const fz = 260 * (1 - bm.t / bm.warn); r.queue(bm.x, bm.y, fz, g => { const [x, y] = r.w(bm.x, bm.y, fz); px.disc(g, Math.round(x), Math.round(y), 5, '#ff6a1a'); px.disc(g, Math.round(x) - 1, Math.round(y) - 1, 3, '#ffd040'); }, { emissive: true }); }
  }
  if (T.wind && T.windOn) for (let k = 0; k < 3; k++) if (S.fx() < .5) P.add({ kind: 'dust', x: OX + S.fx() * CW, y: OY + S.fx() * CH, z: 2 + S.fx() * 20, vx: TWIST.windX * 160, vy: TWIST.windY * 100, vz: 0, life: .8, color: '#e8d8a8' });
  for (const p of S.players) if (p.overclock > 0 && S.fx() < .25) P.smoke(p.x - Math.cos(p.facing) * 4, p.y, 44, 1, { color: '#d8d8e0', size: .6 });
}
