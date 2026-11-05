// ============================================================================================================
// REWIRED • 03 street: the block in every mode. 'coldopen' (a body in the Courts), 'corner' (TAPE ONE: the CI,
// the hand-to-hands, the stash, the collection, the tail), 'reup' (TAPE FOUR: the stakeout, the handoff, the raid,
// the chase), 'shift' (the AI Hub round and local 1-2 player surveillance shift) and 'demo' (the attract mode).
// ============================================================================================================
Object.assign(EVIDENCE, {
  payphone: { name: 'The payphone', who: 'TAY', text: 'Tay takes the 11:40 call at Lorraine and Fulton.' },
  handoff: { name: 'The handoff', who: 'TAY', text: 'Tay and Deacon\'s courier swap a duffel for a gym bag.' },
  plate: { name: 'Courier\'s plate', who: 'DEACON', text: 'A grey Lincoln. The plate runs to a Deacon-owned car lot.' },
  arrest: { name: 'Squeak in cuffs', who: 'SQUEAK', text: 'Squeak, sixteen, caught in the alley behind 1419.' },
  package: { name: 'The re-up', who: 'TAY', text: 'Four bricks in the freezer at 1419 Lorraine.' },
  ledger: { name: 'The ledger', who: 'DEACON', text: 'A notebook of counts. A column marked "D".' }
});
CAST.PRUITT = { rig: new E.Humanoid({ size: 1.3, build: 'bulky', weapon: null, outfit: 'coat', hair: 'short', colors: { skin: '#3a2618', hair: '#101010', cloth: '#e8e8e8', coat: '#5a5a62', pants: '#2a2a30', boot: '#1a1a1a' } }), name: 'PRUITT' };
VOICES.PRUITT = { f: 85, w: 'square' };

const ST = { mode: null, demo: false, players: [], npcs: {}, crowd: [], cars: [], stage: 0, t: 0, scatter: 0, sale: null, saleN: 0, coolBurn: 0, clock: 0, score: 0,
  shiftLen: 180, shiftLeft: 180, tayT: 0, collect: null, tail: null, chase: null, raid: null, handoff: null, banner: null, ghosts: {}, sentAt: 0, ended: false, bot: null, demoT: 0, flashT: 0, lastPhoto: null };
const SHIFT_SCORE = { h2h: 100, stash: 150, collect: 300, tay: 120, lookouts: 60, burn: -150 };
const RANGE = 260, FRAME_R = 26;

// ---- a vehicle that drives a path (not solid while it moves) --------------------------------------------------------
class Car {
  constructor(x, y, facing, o = {}) { this.x = x; this.y = y; this.facing = facing; this.speed = o.speed || 90; this.path = []; this.shape = o.shape || 'sedan'; this.color = o.color || '#202020'; this.lights = !!o.lights; this.siren = 0; this.hidden = !!o.hidden; }
  drive(points, speed) { this.path = points.slice(); if (speed) this.speed = speed; }
  update(dt) {
    if (!this.path.length) return;
    const p = this.path[0], dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy);
    if (d < 4) { this.path.shift(); return; }
    const sp = Math.min(this.speed, 30 + d * 1.2); this.x += dx / d * sp * dt; this.y += dy / d * sp * dt;
    this.facing = E.approachAng ? E.approachAng(this.facing, Math.atan2(dy, dx), 3 * dt) : Math.atan2(dy, dx);
  }
  get moving() { return this.path.length > 0; }
  draw(r) {
    if (this.hidden) return;
    r.shape(this.shape, this.x, this.y, 0, { facing: this.facing, mats: this.shape === 'sedan' ? { b: { color: this.color, pattern: 'glaze' } } : undefined });
    const c = Math.cos(this.facing), s = Math.sin(this.facing);
    if (this.moving || NIGHT.on) game.lights.add(this.x + c * 30, this.y + s * 30, 6, 46, .7, { color: '#fff0c0' });
    if (this.lights) { const on = Math.floor(game.time * 4) % 2; game.lights.add(this.x, this.y, 20, 70, .9, { color: on ? '#ff2020' : '#2040ff' }); }
  }
}

// ---- players: a detective each (Kowal, and Briggs when a second player joins) -----------------------------------
function makePlayer(i, x, y, input) {
  const id = i === 0 ? 'KOWAL' : 'BRIGGS';
  const mover = new E.Mover({ x, y, r: 5, staminaMax: 100, walk: 52, run: 82, sprintSpeed: 128, sneak: 34, vault: 14 });
  mover.facing = 0;
  return { i, id, mover, rig: CAST[id].rig, input, aim: false, rx: x + 40, ry: y, crouch: false, inCar: null, still: 0, blend: null, film: 36, tackle: 0, tackleT: 0, cons: 0 };
}
const P1 = () => ST.players[0];
function playerAt(p) { return { x: p.mover.x, y: p.mover.y, z: p.mover.z }; }

// ---- set up a mode ----------------------------------------------------------------------------------------------------
function streetSetup(mode, data = {}) {
  const S = STREET, map = S.map;
  ST.mode = mode; ST.demo = !!data.demo; ST.stage = data.stage || 0; ST.t = 0; ST.scatter = 0; ST.sale = null; ST.saleN = 0; ST.saleWait = 3; ST.tayShot = false; ST.lookShot = false; ST.squad = []; ST.coolBurn = 0; ST.score = 0; ST.ended = false;
  ST.collect = null; ST.tail = null; ST.chase = null; ST.raid = null; ST.handoff = null; ST.banner = null; ST.cars = []; ST.crowd = []; ST.npcs = {}; ST.ghosts = {}; ST.bot = null; ST.demoT = 0; ST.lastPhoto = null;
  NIGHT.on = mode === 'reup' || mode === 'coldopen'; STREET.wet = NIGHT.on;
  // players
  const start = mode === 'reup' ? S.P(36, 30) : mode === 'coldopen' ? S.P(17, 22) : S.playerStart;
  ST.players = [makePlayer(0, start.x, start.y, I)];
  if (mode === 'shift' || mode === 'corner' || mode === 'reup') {
    for (const inp of game.players.slice(1)) ST.players.push(makePlayer(ST.players.length, start.x + 12, start.y + 8, inp));
  }
  // the corner crew
  const N = ST.npcs;
  const crew = mode === 'corner' || mode === 'shift' || mode === 'demo';
  if (crew) {
    N.junebug = new Actor('JUNEBUG', S.hopperSpot.x, S.hopperSpot.y, { role: 'hopper', label: 'JUNEBUG', facing: Math.PI / 2 });
    N.squeak = new Actor('SQUEAK', S.runnerSpot.x, S.runnerSpot.y, { role: 'runner', label: 'SQUEAK', facing: Math.PI });
    N.moe = new Actor('MOE', S.moeSpot.x, S.moeSpot.y, { role: 'boss', label: 'LITTLE MOE', facing: -Math.PI / 2 });
    N.kevo = new Actor('KEVO', S.lookoutA.x, S.lookoutA.y, { role: 'lookout', label: 'KEVO', facing: 0 });
    N.dre = new Actor('DRE', S.lookoutB.x, S.lookoutB.y, { role: 'lookout', label: 'DRE', facing: Math.PI / 2 });
    N.kevo.scan = [-.4, .8, Math.PI / 2, Math.PI - .3, .2]; N.dre.scan = [Math.PI / 2, Math.PI * .85, Math.PI / 2 + .2, .3, Math.PI * .7];
    for (const k of ['kevo', 'dre']) { N[k].scanI = 0; N[k].scanT = 2 + Math.random() * 2; N[k].home = { x: N[k].x, y: N[k].y }; }
    for (const k of ['junebug', 'squeak', 'moe']) N[k].home = { x: N[k].x, y: N[k].y };
  }
  if (mode === 'corner' && !ST.demo) {
    N.pigeon = new Actor('PIGEON', S.alleyMeet.x, S.alleyMeet.y, { role: 'ci', label: 'PIGEON', facing: Math.PI / 2 });
    N.pigeon.cart = true;
  }
  // the block's own people: walkers on the sidewalks, a grandmother on a stoop, kids
  const civ = (x, y, look, route, speed) => { const a = new Actor('civ' + ST.crowd.length, x, y, { look, role: 'civ', speed: speed || 26 }); a.route = route; a.ri = 0; ST.crowd.push(a); return a; };
  const looks = [
    { build: 'chibi', outfit: 'coat', hair: 'long', colors: { skin: '#6a442e', hair: '#2a1a14', coat: '#7a3a5a', pants: '#2a2a3a' } },
    { build: 'heroic', outfit: 'shirt', hat: { style: 'cap', color: '#8a2a2a' }, colors: { skin: '#e0b090', cloth: '#5a6a7a', pants: '#3a3a40' } },
    { build: 'bulky', outfit: 'coat', hair: 'short', colors: { skin: '#4a3020', hair: '#c8c8c8', coat: '#4a4a3a', pants: '#3a3a30' } },
    { build: 'chibi', size: 1, outfit: 'shirt', hair: 'spiky', colors: { skin: '#5a3a26', cloth: '#e8b03a', pants: '#3a5a8a' } },
    { build: 'chibi', outfit: 'robe', hair: 'ponytail', colors: { skin: '#7a5038', hair: '#1a1210', cloth: '#5a7a8a' } }
  ];
  const sw = (cx, cy) => S.P(cx, cy);
  if (mode !== 'coldopen') {
    civ(sw(2, 13).x, sw(2, 13).y, looks[0], [sw(2, 13), sw(13, 13), sw(13, 30), sw(2, 30)]);
    civ(sw(50, 8).x, sw(50, 8).y, looks[1], [sw(50, 8), sw(62, 8), sw(62, 13), sw(50, 13)], 30);
    civ(sw(44, 20).x, sw(44, 20).y, looks[2], [sw(44, 20), sw(44, 34), sw(44, 20)], 18);
    civ(sw(30, 30).x, sw(30, 30).y, looks[3], [sw(28, 30), sw(40, 30), sw(40, 26), sw(28, 26)], 40);
    civ(sw(56, 35).x, sw(56, 35).y, looks[4], [sw(56, 35), sw(51, 35), sw(51, 30), sw(56, 30)], 22);
    const nana = civ(38 * T, 7 * T + 13, { build: 'chibi', outfit: 'robe', hair: 'short', hunch: .3, colors: { skin: '#5a3a28', hair: '#d8d8d8', cloth: '#8a4a6a' } }, null);
    nana.pose = 'kneel'; nana.facing = Math.PI / 2;
  }
  // the fiends: buyers who come to the corner
  ST.fiendLooks = [
    { build: 'chibi', outfit: 'coat', hood: true, hunch: .4, colors: { skin: '#a87858', hair: '#3a3a3a', coat: '#4a4a40', pants: '#3a342a' } },
    { build: 'heroic', outfit: 'shirt', hair: 'short', hunch: .3, colors: { skin: '#e0b8a0', hair: '#7a5a3a', cloth: '#8a8a6a', pants: '#4a4a5a' } },
    { build: 'chibi', outfit: 'coat', hair: 'long', hunch: .3, colors: { skin: '#6a4430', hair: '#3a2a1a', coat: '#6a2a3a', pants: '#2a2a2a' } }
  ];
  // vehicles
  if (mode === 'reup') {
    ST.cars.push(Object.assign(new Car(70 * T, 33 * T, Math.PI, { color: '#6a6a72', hidden: true }), { id: 'courier' }));
  }
  // lights and weather
  game.lights.enabled = true;
  game.lights.ambient = NIGHT.on ? .3 : .62;
  if (game.lights.tint !== undefined) game.lights.tint = NIGHT.on ? '#203060' : '#604030';
  game.weather = NIGHT.on ? { kind: 'rain', amount: .65, wind: .25, lightning: mode === 'reup' ? .03 : 0 } : null;
  music(mode === 'reup' || mode === 'coldopen' ? 'night' : 'street');
  // mode scripts
  if (mode === 'coldopen') coldOpenSetup();
  if (mode === 'corner') cornerSetup(data);
  if (mode === 'reup') reupSetup(data);
  if (mode === 'shift') shiftSetup(data);
  if (mode === 'demo') demoSetup(data);
  if (mode === 'chasedemo') { chaseStart(true); }
}

// ---- the sale cycle: buyer pays the hopper, the runner fetches from the stash, the buyer gets it round the corner -----
function saleTick(dt) {
  const N = ST.npcs, S = STREET;
  if (!N.junebug) return;
  if (ST.scatter > 0) return;
  let s = ST.sale;
  if (!s) { ST.saleWait = (ST.saleWait === undefined ? 3 : ST.saleWait) - dt; if (ST.saleWait > 0) return; s = ST.sale = { phase: 'approach', t: 0, n: ++ST.saleN, shot: {} };
    const look = ST.fiendLooks[ST.saleN % ST.fiendLooks.length], from = E.pick([S.P(2, 13), S.P(17, 2), S.P(19, 29), S.P(30, 13)]);
    s.fiend = new Actor('fiend' + ST.saleN, from.x, from.y, { look, role: 'fiend', speed: 30 }); s.fiend.goTo(S.hopperSpot.x + 10, S.hopperSpot.y + 2); s.from = from; }
  s.t += dt;
  const f = s.fiend, J = N.junebug, Q = N.squeak;
  f.update(dt, S.map);
  if (s.phase === 'approach' && f.arrived()) { s.phase = 'pay'; s.t = 0; f.face(J); J.face(f); f.pose = 'cast'; J.pose = 'cast'; }
  else if (s.phase === 'pay' && s.t > 2.6) { s.phase = 'signal'; s.t = 0; f.pose = null; J.pose = null; J.face(Q); Q.goTo(S.stash.x, S.stash.y, 40); f.goTo(S.P(22, 13).x + 8, S.P(22, 13).y + 4); }
  else if (s.phase === 'signal' && Q.arrived()) { s.phase = 'grab'; s.t = 0; Q.pose = 'kneel'; Q.face(-Math.PI / 2); }
  else if (s.phase === 'grab' && s.t > 2.2) { s.phase = 'deliver'; s.t = 0; Q.pose = null; Q.goTo(f.x - 8, f.y + 6, 42); }
  else if (s.phase === 'deliver' && Q.arrived()) { s.phase = 'hand'; s.t = 0; Q.face(f); f.face(Q); Q.pose = 'cast'; f.pose = 'cast'; }
  else if (s.phase === 'hand' && s.t > 1.3) { s.phase = 'leave'; s.t = 0; Q.pose = null; f.pose = null; f.goTo(s.from.x, s.from.y, 34); Q.goTo(Q.home.x, Q.home.y, 36); J.face(Math.PI / 2); }
  else if (s.phase === 'leave' && (f.arrived() || s.t > 14)) { ST.sale = null; ST.saleWait = 3 + Math.random() * 4; }
}
function scatterCorner() {
  const N = ST.npcs, S = STREET;
  ST.scatter = 16;
  if (ST.sale) { const f = ST.sale.fiend; ST.sale.phase = 'leave'; f.pose = null; f.goTo(ST.sale.from.x, ST.sale.from.y, 50); }
  const hide = [S.P(30, 24), S.P(34, 27), S.P(28, 28)];
  ['junebug', 'squeak', 'moe'].forEach((k, i) => { if (N[k]) { N[k].pose = null; N[k].goTo(S.P(26, 20).x, S.P(26, 20).y, 60); N[k].path.push(hide[i]); } });
}
function unscatterTick(dt) {
  if (ST.scatter <= 0) return;
  ST.scatter -= dt;
  if (ST.scatter <= 0) { const N = ST.npcs; for (const k of ['junebug', 'squeak', 'moe']) if (N[k]) N[k].follow([STREET.P(26, 20), N[k].home], 34); ST.sale = null; ST.saleWait = 6; }
}

// ---- lookouts: scan, notice, warn, burn -------------------------------------------------------------------------------
function conspicuous(p) {
  if (p.inCar) return p.aim ? .35 : 0;
  const m = p.mover;
  let c = .45;
  if (p.blend && p.still > .8) c = p.aim ? .55 : .2;
  else if (p.aim) c = 2.6;
  else if (m.sprinting) c = 1.5;
  else if (p.still > 2.5) c = .9;
  if (p.crouch && !p.aim) c *= .75;
  return c;
}
function lookoutTick(dt) {
  const N = ST.npcs, map = STREET.map;
  if (ST.coolBurn > 0) ST.coolBurn -= dt;
  for (const k of ['kevo', 'dre']) {
    const L = N[k]; if (!L) continue;
    let best = 0, bestP = null;
    if (!ST.demo && ST.coolBurn <= 0 && ST.scatter <= 0) for (const p of ST.players) {
      const at = playerAt(p), seen = canSee(L, Object.assign({ crouch: p.crouch }, at), map, { range: 135, fov: 1.5 });
      const dd = E.dist(L, at), prox = dd < 40 ? 1.6 : dd < 80 ? 1.1 : .6;
      const exposure = p.inCar ? (seen.seen ? .5 : 0) : seen.seen ? seen.exposure : 0;
      const rate = exposure * conspicuous(p) * prox * .5;
      p.cons = Math.max(p.cons, rate);
      if (rate > best) { best = rate; bestP = p; }
    }
    if (best > 0) L.sus = Math.min(1.2, L.sus + best * dt); else L.sus = Math.max(0, L.sus - .2 * dt);
    const was = L.susState;
    L.susState = L.sus >= 1 ? 'alert' : L.sus >= .7 ? 'search' : L.sus >= .35 ? 'notice' : 'calm';
    if (L.susState !== 'calm' && bestP) L.face(playerAt(bestP));
    else if (ST.scatter <= 0) { L.scanT -= dt; if (L.scanT <= 0) { L.scanI = (L.scanI + 1) % L.scan.length; L.scanT = 2.2 + Math.random() * 2.5; } L.facing = E.approachAng(L.facing, L.scan[L.scanI], 2.5 * dt); }
    if (was !== 'search' && L.susState === 'search') { A.sfx('whistle', { vol: .6 }); bubble(L, '?!', '#f0c040'); }
    if (L.susState === 'alert') burn(L);
  }
}
function burn(L) {
  const N = ST.npcs;
  bubble(L, 'FIVE-O! FIVE-O!', '#ff5040', 2.5);
  A.sfx('whistle'); A.sfx('whistle', { pitch: .8 });
  game.shake && game.shake(2);
  for (const k of ['kevo', 'dre']) if (N[k]) { N[k].sus = .2; N[k].susState = 'calm'; }
  ST.coolBurn = 14;
  scatterCorner();
  if (ST.mode === 'shift') { ST.score += SHIFT_SCORE.burn; toast('BURNED', 'The corner made you. -150. Back off and let it cool.'); }
  else if (ST.mode === 'corner' || ST.mode === 'reup') {
    CASE.heat++; CASE.burns++;
    toast('BURNED', CASE.heat >= 3 ? 'They know your face now.' : 'The corner made you. Heat ' + CASE.heat + ' of 3. Let it cool.');
    if (CASE.heat >= 3) game.after(2.2, () => game.go('gameover', { why: 'blown', retry: { scene: 'street', mode: ST.mode, stage: ST.stage } }));
  }
}
const BUBBLES = [];
function bubble(a, text, color = '#f0ece0', t = 1.8) { BUBBLES.push({ a, text, color, t }); }

// ---- the camera: aim, frame, shoot, and what the picture shows -------------------------------------------------------------
function aimTick(p, dt, ctl) {
  const m = p.mover;
  const wasAim = p.aim;
  p.aim = !!ctl.aim && p.film > 0;
  const from = p.inCar ? { x: p.inCar.x, y: p.inCar.y } : { x: m.x, y: m.y };
  if (p.aim && !wasAim) {   // start framed on the nearest thing worth a picture in front
    const subjects = photoSubjects().filter(s => E.dist(s, from) < RANGE);
    let best = null, bd = 1e9;
    for (const s of subjects) { const a = Math.atan2(s.y - from.y, s.x - from.x), d = Math.abs(E.angDiff ? E.angDiff(a, m.facing) : 0) * 60 + E.dist(s, from); if (d < bd) { bd = d; best = s; } }
    if (best && !ctl.mouse) { p.rx = best.x; p.ry = best.y; } else { p.rx = from.x + Math.cos(m.facing) * 60; p.ry = from.y + Math.sin(m.facing) * 60; }
    A.sfx('click');
  }
  if (!p.aim) return;
  if (ctl.mouse) { p.rx = ctl.mouse[0]; p.ry = ctl.mouse[1]; }
  else if (ctl.aimMove) { p.rx += ctl.aimMove[0] * 150 * dt; p.ry += ctl.aimMove[1] * 150 * dt; }
  const dx = p.rx - from.x, dy = p.ry - from.y, d = Math.hypot(dx, dy);
  if (d > RANGE) { p.rx = from.x + dx / d * RANGE; p.ry = from.y + dy / d * RANGE; }
  if (!p.inCar) m.facing = Math.atan2(p.ry - m.y, p.rx - m.x);
  if (ctl.shoot) takePhoto(p);
}
function photoSubjects() {
  const N = ST.npcs, out = [];
  for (const k in N) if (N[k] && !N[k].hidden) out.push(N[k]);
  if (ST.sale && ST.sale.fiend) out.push(ST.sale.fiend);
  return out;
}
function inFrame(p, a) {
  if (!a || a.hidden) return false;
  const from = p.inCar ? { x: p.inCar.x, y: p.inCar.y, z: 8 } : playerAt(p);
  if (Math.hypot(a.x - p.rx, a.y - p.ry) > FRAME_R) return false;
  if (E.dist(a, from) > RANGE) return false;
  const clear = STREET.map.sight ? STREET.map.sight({ x: from.x, y: from.y, z: from.z || 0 }, { x: a.x, y: a.y, z: a.z || 0 }) : true;
  return !!clear;
}
function takePhoto(p) {
  if (p.film <= 0) return;
  p.film--; CASE.photos++;
  A.sfx('shutter'); ST.flashT = .12;
  const N = ST.npcs, s = ST.sale, got = [];
  const give = (id, pts) => {
    if (ST.mode === 'shift') { ST.score += pts; got.push(EVIDENCE[id] ? EVIDENCE[id].name : id); return true; }
    if (addEvidence(id)) { got.push(EVIDENCE[id].name); return true; }
    return false;
  };
  if (s && s.phase === 'pay' && inFrame(p, N.junebug) && inFrame(p, s.fiend) && !s.shot.pay) {
    s.shot.pay = true;
    if (ST.mode === 'shift') give('h2h', SHIFT_SCORE.h2h);
    else if (!hasEv('h2h1')) give('h2h1'); else give('h2h2');
  }
  if (s && s.phase === 'hand' && inFrame(p, N.squeak) && inFrame(p, s.fiend) && !s.shot.hand) {
    s.shot.hand = true;
    if (ST.mode === 'shift') give('h2h', SHIFT_SCORE.h2h); else if (!hasEv('h2h1')) give('h2h1'); else give('h2h2');
  }
  if (s && s.phase === 'grab' && inFrame(p, N.squeak) && !s.shot.grab) { s.shot.grab = true; give('stash', SHIFT_SCORE.stash); }
  if (ST.collect && ST.collect.phase === 'give' && inFrame(p, N.tay) && inFrame(p, N.moe) && !ST.collect.shot) { ST.collect.shot = true; give('collect', SHIFT_SCORE.collect); }
  if (N.tay && inFrame(p, N.tay) && !(ST.mode === 'shift' && ST.tayShot)) { if (give('tay', SHIFT_SCORE.tay)) ST.tayShot = true; }
  if ((inFrame(p, N.kevo) || inFrame(p, N.dre)) && !(ST.mode === 'shift' && ST.lookShot)) { if (give('lookouts', SHIFT_SCORE.lookouts)) ST.lookShot = true; }
  if (ST.mode === 'reup' && ST.handoff) {
    const H = ST.handoff;
    if (H.phase === 'call' && inFrame(p, N.tay)) give('payphone');
    if ((H.phase === 'swap' || H.phase === 'walk') && inFrame(p, N.tay) && inFrame(p, N.pruitt)) give('handoff');
    const car = ST.cars.find(c => c.id === 'courier');
    if (car && !car.hidden && Math.hypot(car.x - p.rx, car.y - p.ry) < FRAME_R + 10 && E.dist(car, p.inCar || playerAt(p)) < RANGE) give('plate');
  }
  ST.lastPhoto = { t: 2.2, got };
  if (got.length) { A.sfx('pickup'); toast(ST.mode === 'shift' ? 'PHOTO' : 'EVIDENCE', got.join(' • ')); }
  else toast('PHOTO', 'Nothing a judge would care about.', 1.6);
}

// ---- interactions: talk, the car, vaulting --------------------------------------------------------------------------------
function nearestInteract(p) {
  const m = p.mover, at = { x: m.x, y: m.y }, N = ST.npcs, list = [];
  if (p.inCar) return { label: 'Get out', fn: () => exitCar(p) };
  if (N.pigeon && !N.pigeon.hidden && ST.mode === 'corner' && ST.stage === 0 && E.dist(at, N.pigeon) < 26) list.push({ d: E.dist(at, N.pigeon), label: 'Talk to Pigeon', fn: pigeonTalk });
  if (ST.mode === 'coldopen' && N.uniform && E.dist(at, N.uniform) < 28 && ST.stage === 0) list.push({ d: 0, label: 'Talk to the uniform', fn: coldOpenTalk });
  for (const [i, c] of [[0, STREET.car1], [1, STREET.car2]]) if (E.dist(at, c) < 30 && (ST.mode !== 'reup' || i === 1)) list.push({ d: E.dist(at, c), label: 'Get in the car', fn: () => enterCar(p, c) });
  if (ST.mode === 'reup' && ST.stage === 4 && E.dist(at, STREET.houseDoor) < 30) list.push({ d: 0, label: 'Search 1419', fn: () => game.go('stash', {}) });
  list.sort((a, b) => a.d - b.d);
  return list[0] || null;
}
function enterCar(p, c) { p.inCar = c; p.aim = false; A.sfx('door2'); p.mover.x = c.x; p.mover.y = c.y + 14; }
function exitCar(p) { const c = p.inCar; p.inCar = null; p.aim = false; A.sfx('door2'); p.mover.x = c.x; p.mover.y = c.y + 16; p.mover.vx = p.mover.vy = 0; }

// ---- a player's step: the stick, the buttons, the camera ------------------------------------------------------------------------
function readControls(p) {
  const inp = p.input, m = inp.move(), g = game.view.screenDirToGround(m[0], m[1]);
  const mouse = (inp === I && I.lastDevice === 'mouse' && game.mouseGround) ? game.mouseGround() : null;
  let aimMove = null;
  if (inp.padAim) { const a = game.view.screenDirToGround(inp.padAim[0], inp.padAim[1]); aimMove = a; }
  else if (Math.hypot(g[0], g[1]) > .1) aimMove = g;
  return { move: g, sprint: inp.down('sprint'), crouchP: inp.pressed('crouch'), interact: inp.pressed('interact'), act2: inp.pressed('act2'), aim: inp.down('aim'),
    shoot: inp.pressed('shoot') || (inp.down('aim') && inp.pressed('interact')), mouse: mouse ? [mouse[0], mouse[1]] : (mouse === null ? null : null), aimMove, view: inp.pressed('view'), notes: inp.pressed('notes') };
}
function playerTick(p, dt, ctl) {
  const m = p.mover, map = STREET.map;
  if (ctl.crouchP && !p.inCar) { p.crouch = !p.crouch; }
  if (ctl.mouse && game.mouseGround) { const mg = game.mouseGround(); if (mg) ctl.mouse = [mg[0], mg[1]]; }
  aimTick(p, dt, ctl);
  const it = !p.aim ? nearestInteract(p) : null;
  p.interact = it;
  if (it && ctl.interact) { it.fn(); return; }
  if (p.inCar) { m.vx = m.vy = 0; p.still += dt; p.blend = { name: 'In the car' }; return; }
  const mv = p.aim ? [0, 0] : ctl.move;
  const nearFence = !p.aim && ST.chase && (ctl.interact || ctl.sprint) ? true : false;
  m.update(dt, map, { move: mv, sprint: ctl.sprint && !p.aim, crouch: p.crouch, jumpPressed: nearFence && ctl.interact });
  const moving = Math.hypot(m.vx, m.vy) > 6;
  p.still = moving ? 0 : p.still + dt;
  p.blend = null;
  for (const b of STREET.blend) if (Math.hypot(b.x - m.x, b.y - m.y) < b.r) { p.blend = b; break; }
  // tackle (the chase)
  if (p.tackleT > 0) p.tackleT -= dt;
  if (ctl.act2 && ST.chase && p.tackleT <= 0) { p.tackleT = .6; m.push && m.push(Math.cos(m.facing) * 160, Math.sin(m.facing) * 160, 60); A.sfx('whoosh'); chaseTackle(p); }
  p.rig.update(dt, m.rigState({ point: p.aim, dash: p.tackleT > .3 }));
}

// ---- the scene -------------------------------------------------------------------------------------------------------------
const street = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'iso', 'topdown'], camera: { zoom: [.75, 2], start: 1 },
  enter(data = {}) { sceneReset();
    game.cam.bounds = v => STREET.map.bounds(v);
    game.cam.smooth = .12;
    streetSetup(data.mode || 'corner', data);
    try { game.allowJoin({ max: 2, onJoin: (inp, n) => { if (['shift', 'corner', 'reup'].includes(ST.mode) && ST.players.length < 2) { const p0 = P1().mover; ST.players.push(makePlayer(1, p0.x + 10, p0.y + 8, inp)); toast('PARTNER', 'Det. Lonnie Briggs rolls up. Player 2 joined.'); } } }); } catch (e) {}
  },
  exit() { game.weather = null; game.lights.enabled = false; BUBBLES.length = 0; NIGHT.on = false; STREET.wet = false; try { game.cam.frame && game.cam.frame(null); } catch (e) {} },
  update(dt) {
    toastTick(dt);
    if (ST.demo || ST.mode === 'demo' || ST.mode === 'chasedemo') { if (demoInputBreak()) return; }
    if (notesTick()) return;
    if (talkTick(dt)) { for (const p of ST.players) p.rig.update(dt, p.mover.rigState({})); return; }
    ST.t += dt;
    if (ST.flashT > 0) ST.flashT -= dt;
    if (ST.lastPhoto) { ST.lastPhoto.t -= dt; if (ST.lastPhoto.t <= 0) ST.lastPhoto = null; }
    for (const b of BUBBLES) b.t -= dt; while (BUBBLES.length && BUBBLES[0].t <= 0) BUBBLES.shift();
    // players
    for (const p of ST.players) {
      p.cons = 0;
      const ctl = ST.bot && p.i === 0 ? ST.bot(p, dt) : readControls(p);
      if (p.i === 0 && !ST.bot) {
        if (ctl.view) { game.nextView(); game.note && game.note(String(game.view.label || game.view.id || 'VIEW').toUpperCase()); }
        if (ctl.notes && !IN_HUB) { NOTES.open = true; A.sfx('select'); }
      }
      playerTick(p, dt, ctl);
    }
    // the world
    const map = STREET.map;
    for (const k in ST.npcs) { const a = ST.npcs[k]; if (a && !a.static) a.update(dt, map); }
    for (const a of ST.crowd) { if (a.route) { if (a.arrived()) { a.ri = (a.ri + 1) % a.route.length; a.goTo(a.route[a.ri].x, a.route[a.ri].y); } } a.update(dt, map); }
    for (const c of ST.cars) c.update(dt);
    if (ST.npcs.junebug) { saleTick(dt); unscatterTick(dt); lookoutTick(dt); }
    if (ST.mode === 'corner') cornerTick(dt);
    if (ST.mode === 'reup') reupTick(dt);
    if (ST.mode === 'shift') shiftTick(dt);
    if (ST.mode === 'coldopen') coldOpenTick(dt);
    if (ST.mode === 'demo' || ST.mode === 'chasedemo') demoTick(dt);
    if (ST.chase) chaseTick(dt);
    // the camera
    const p = P1();
    if (ST.players.length > 1 && game.cam.frame) game.cam.frame(ST.players.map(q => ({ x: q.mover.x, y: q.mover.y, z: 0 })), { margin: 60, zoom: [.6, 1] });
    else {
      const from = p.inCar ? p.inCar : p.mover;
      const fx = p.aim ? lerp(from.x, p.rx, .5) : from.x, fy = p.aim ? lerp(from.y, p.ry, .5) : from.y;
      game.focus(fx, fy, 14);
    }
    hubGhostTick(dt);
  },
  draw(r) { drawStreet(r); }
};

function drawStreet(r) {
  const map = STREET.map, N = ST.npcs;
  map.drawFloor(r); map.queueWalls(r);
  for (const d of STREET.dress) {
    if (d[0] === 'prop') r.prop(d[1], d[2], d[3], 0, d[4]);
    else if (d[4] && d[4].car !== undefined) { const c = STREET.cars[d[4].car]; r.shape('sedan', d[2], d[3], 0, { facing: d[4].facing, mats: { b: { color: c[3], pattern: 'glaze' } } }); }
    else r.shape(d[1], d[2], d[3], 0, d[4]);
  }
  // sneakers on the wire over Calhoun: two lamp tops joined by a sagging line
  const a = r.w(14 * T + 8, 13 * T + 8, 44), b = r.w(19 * T + 8, 13 * T + 8, 44);
  r.queue(16.5 * T, 13 * T + 8, 40, g => {
    let prev = a;
    for (let i = 1; i <= 10; i++) { const t = i / 10, x = lerp(a[0], b[0], t), y = lerp(a[1], b[1], t) + Math.sin(t * Math.PI) * 6; px.line(g, prev[0], prev[1], x, y, '#141414'); prev = [x, y]; }
    const mx = lerp(a[0], b[0], .45), my = lerp(a[1], b[1], .45) + Math.sin(.45 * Math.PI) * 6;
    px.line(g, mx, my, mx - 1, my + 5, '#e8e8e8'); px.line(g, mx + 2, my, mx + 3, my + 4, '#e8e8e8'); px.rect(g, mx - 3, my + 5, 4, 2, '#f0f0f0'); px.rect(g, mx + 2, my + 4, 4, 2, '#f0f0f0');
  });
  // sight cones
  if (setting('cones', true) && !ST.demo) for (const k of ['kevo', 'dre']) { const L = N[k]; if (L && !L.hidden) r.sightCone(L, { map, range: 135, fov: 1.5, color: L.susState === 'calm' ? '#ffe080' : L.susState === 'notice' ? '#ffa040' : '#ff4030', alpha: .22 }); }
  if (ST.tail && ST.tail.look > 0) r.sightCone(N.squeak, { map, range: 110, fov: 1.3, color: '#ff6040', alpha: .3 });
  // the body in the cold open
  if (ST.mode === 'coldopen') r.queue(STREET.P(31, 23).x, STREET.P(31, 23).y, 0, g => { const c = r.w(STREET.P(31, 23).x, STREET.P(31, 23).y, 1); px.ell(g, c[0], c[1], 13, 5, '#d8d8d0'); px.ell(g, c[0] - 2, c[1] - 1, 10, 3, '#f0f0e8'); px.rect(g, c[0] + 10, c[1] + 1, 4, 2, '#5a3a26'); });
  // actors
  for (const k in N) { const a2 = N[k]; if (a2) a2.draw(r, { xray: false }); }
  if (ST.sale && ST.sale.fiend) ST.sale.fiend.draw(r);
  for (const a3 of ST.crowd) a3.draw(r, { every: 2 });
  for (const c of ST.cars) c.draw(r);
  for (const p of ST.players) {
    if (p.inCar) continue;
    const m = p.mover;
    r.shadow(m.x, m.y, 7, .35, undefined, m.groundZ || 0);
    r.actor(m.x, m.y, m.z, (g, ox, oy) => p.rig.draw(g, ox, oy, r.view), { xray: { color: p.i ? '#5a8ae8' : '#e8c060', actors: true } });
    if (p.aim) { const h = p.rig.hand ? p.rig.hand('R') : null; if (h) r.queue(h.x, h.y, h.z, g => { const q = r.w(h.x, h.y, h.z); px.rect(g, q[0] - 2, q[1] - 2, 5, 3, '#141414'); px.rect(g, q[0] - 1, q[1] - 1, 2, 1, '#6a8aa8'); }, { bias: 2 }); }
  }
  drawGhosts(r);
  // tags over the crew once Pigeon has named them
  if (CASE.pigeonPaid || ST.mode !== 'corner') for (const k in N) { const x = N[k]; if (x && x.label && !x.hidden && (ST.mode !== 'corner' || CASE.pigeonPaid !== 10 || ['junebug', 'squeak'].includes(k) || k === 'pigeon')) drawTag(r, x, x.label, x.role === 'lookout' ? (x.susState === 'calm' ? '#c8c4bc' : '#ff8060') : '#c8c4bc'); }
  for (const k of ['kevo', 'dre']) { const L = N[k]; if (L && L.susState !== 'calm') r.textAt(L.x, L.y, 62, L.susState === 'notice' ? '?' : '!', L.susState === 'notice' ? '#f0c040' : '#ff4030'); }
  for (const b of BUBBLES) r.textAt(b.a.x, b.a.y, 70, b.text, b.color);
  // objective markers
  if (setting('hints', true) && !ST.demo) for (const mk of streetMarkers()) r.marker(mk.x, mk.y, mk.z || 30, { label: mk.label });
  drawStreetHud(r);
}
function streetMarkers() {
  const out = [], N = ST.npcs;
  if (ST.mode === 'corner') {
    if (ST.stage === 0 && N.pigeon) out.push({ x: N.pigeon.x, y: N.pigeon.y, label: 'PIGEON' });
    if (ST.stage === 1 || ST.stage === 2) out.push({ x: STREET.corner.x, y: STREET.corner.y, label: 'THE CORNER' });
    if (ST.stage === 3 && N.tay) out.push({ x: N.tay.x, y: N.tay.y, z: 48, label: 'BLACK CAP' });
    if (ST.stage === 4 && N.squeak) out.push({ x: N.squeak.x, y: N.squeak.y, z: 46, label: 'SQUEAK' });
  }
  if (ST.mode === 'coldopen' && ST.stage === 0 && N.uniform) out.push({ x: N.uniform.x, y: N.uniform.y, label: 'THE SCENE' });
  if (ST.mode === 'reup') {
    if (ST.stage === 0) out.push({ x: STREET.car2.x, y: STREET.car2.y, label: 'THE CAR' });
    if (ST.stage === 2) out.push({ x: STREET.houseBack.x, y: STREET.houseBack.y, label: 'COVER THE BACK' });
    if (ST.stage === 3 && N.squeak) out.push({ x: N.squeak.x, y: N.squeak.y, z: 44, label: 'SQUEAK' });
    if (ST.stage === 4) out.push({ x: STREET.houseDoor.x, y: STREET.houseDoor.y, label: '1419' });
  }
  return out;
}
function drawStreetHud(r) {
  drawToasts(r);
  r.overlay(g => {
    const p = P1();
    if (ST.flashT > 0) px.blend(g, .6, 'add', () => px.rect(g, 0, 0, r.W, r.H, '#ffffff'));
    if (ST.mode === 'demo' || ST.demo || ST.mode === 'chasedemo') { drawDemoBanner(g, r); return; }
    drawHudObjective(g, r);
    // heat, or the shift's clock and score
    if (ST.mode === 'shift') {
      const mm = Math.max(0, Math.ceil(ST.shiftLeft)), s = Math.floor(mm / 60) + ':' + String(mm % 60).padStart(2, '0');
      E.ui.box(g, 6, 32, 120, 22, { bg: ['#0c0c12', '#14141c'], border: '#3a3a48', alpha: .8 });
      E.font.text(g, s, 12, 37, mm < 20 ? '#ff6040' : '#f0ece0', { scale: 1, shadow: '#000', outline: false });
      E.font.text(g, 'SCORE ' + ST.score, 50, 37, '#d8b860', { shadow: '#000', outline: false });
    } else if (ST.mode === 'corner' || ST.mode === 'reup') {
      E.ui.box(g, 6, 32, 66, 14, { bg: ['#0c0c12', '#14141c'], border: '#3a3a48', alpha: .8 });
      E.font.text(g, 'HEAT', 11, 36, '#8a8a9a', { font: 'tiny', outline: false });
      for (let i = 0; i < 3; i++) px.rect(g, 32 + i * 12, 35, 9, 7, i < CASE.heat ? '#e04a3a' : '#3a3a48');
    }
    // what the corner thinks of you: an eye meter
    const sus = Math.max(ST.npcs.kevo ? ST.npcs.kevo.sus : 0, ST.npcs.dre ? ST.npcs.dre.sus : 0, 0);
    if (ST.npcs.kevo && !ST.demo) {
      const w = 90, x = Math.round(r.W / 2 - w / 2), y = r.H - 50;
      if (sus > .02 || p.cons > 0) {
        E.ui.box(g, x - 4, y - 4, w + 8, 16, { bg: ['#0c0c12', '#14141c'], border: sus >= .7 ? '#ff4030' : '#3a3a48', alpha: .85 });
        E.ui.bar(g, x + 18, y + 1, w - 20, 6, Math.min(1, sus), sus >= .7 ? '#ff4030' : sus >= .35 ? '#f0a030' : '#d8d0a0');
        px.ell(g, x + 7, y + 4, 6, 3, '#e8e4dc'); px.disc(g, x + 7, y + 4, 2, '#141418');
      }
    }
    // status words
    const status = p.inCar ? 'IN THE CAR' : p.aim ? 'CAMERA UP' : p.blend && p.still > .8 ? 'BLENDING IN • ' + p.blend.name.toUpperCase() : p.crouch ? 'CROUCHED' : p.mover.sprinting ? 'RUNNING' : '';
    if (status) E.font.text(g, status, r.W / 2, r.H - 64, p.aim ? '#ff8060' : '#a8d8a0', { align: 'center', shadow: '#000', outline: false });
    // the viewfinder
    for (const q of ST.players) if (q.aim) drawViewfinder(g, r, q);
    // prompts at the bottom
    const items = [];
    if (p.aim) { items.push(['shoot', 'Take photo']); items.push(['aim', 'Lower']); }
    else {
      if (p.interact) items.push(['interact', p.interact.label]);
      if (ST.chase) items.push(['act2', 'Tackle']); else items.push(['aim', 'Camera']);
      if (!p.inCar && !ST.chase) items.push(['crouch', p.crouch ? 'Stand' : 'Crouch']);
      if (ST.chase) items.push(['sprint', 'Sprint']);
      if (!IN_HUB) items.push(['notes', 'Notes']);
    }
    promptRow(g, items, r.W / 2, r.H - 22);
    // stamina while running
    if (p.mover.stamina < p.mover.staminaMax - 1) E.ui.bar(g, r.W / 2 - 30, r.H - 34, 60, 3, p.mover.stamina / p.mover.staminaMax, p.mover.exhausted ? '#ff6040' : '#7ad06a');
    if (ST.banner) { const b = ST.banner; E.font.title(g, b.text, r.W / 2, r.H / 2 - 30, { scale: 2, align: 'center', colors: b.colors || ['#ffffff', '#d8b860'] }); if (b.sub) E.font.text(g, b.sub, r.W / 2, r.H / 2 - 4, '#e8e4dc', { align: 'center', shadow: '#000', outline: false }); }
    if (ST.players.length < 2 && ['shift', 'corner', 'reup'].includes(ST.mode) && !IN_HUB && ST.t < 12) E.font.text(g, 'PLAYER 2: START ON A SECOND PAD, OR 2 ON THE KEYBOARD', r.W - 8, (game.cornerArea && game.cornerArea() ? game.cornerArea().y1 + 4 : 8), '#8a8a9a', { align: 'right', font: 'tiny', outline: false, shadow: '#000' });
  });
  talk.draw(r);
  drawNotes(r);
}
function drawViewfinder(g, r, p) {
  const c = r.w(p.rx, p.ry, 16), R = Math.round(FRAME_R * (r.view.zoom || 1) * (r.view.scale || 1) + 6);
  const x = Math.round(c[0]), y = Math.round(c[1]);
  const N = ST.npcs, subjects = photoSubjects().filter(a => inFrame(p, a));
  const good = subjects.length > 0, col = good ? '#60f080' : '#e8e4dc';
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { px.rect(g, x + sx * R - (sx > 0 ? 6 : 0), y + sy * R - (sy > 0 ? 1 : 0), 7, 1, col); px.rect(g, x + sx * R - (sx > 0 ? 0 : 0), y + sy * R - (sy > 0 ? 6 : 0), 1, 7, col); }
  px.rect(g, x - 3, y, 7, 1, col); px.rect(g, x, y - 3, 1, 7, col);
  if (Math.floor(game.real * 2) % 2) px.disc(g, x - R + 2, y - R - 7, 2, '#ff3030'); E.font.text(g, 'REC  ' + p.film + ' LEFT', x - R + 7, y - R - 10, '#ff5050', { font: 'tiny', outline: false, shadow: '#000' });
  let yy = y + R + 4;
  for (const a of subjects.slice(0, 3)) { const lab = (a.label || (a.role === 'fiend' ? 'BUYER' : '')); if (lab) { E.font.text(g, lab, x, yy, '#60f080', { align: 'center', font: 'tiny', outline: false, shadow: '#000' }); yy += 7; } }
  if (ST.lastPhoto && ST.lastPhoto.got.length) E.font.text(g, 'GOT IT', x, y - R - 20, '#60f080', { align: 'center', shadow: '#000', outline: false });
}

// ---- the cold open: a body in the Courts -------------------------------------------------------------------------------------
function coldOpenSetup() {
  const S = STREET;
  ST.npcs.uniform = new Actor('UNIFORM', S.P(29, 23).x, S.P(29, 23).y, { label: 'OFC. DIAZ', facing: 0 });
  ST.cars.push(Object.assign(new Car(S.P(17, 17).x, S.P(17, 17).y, Math.PI / 2, { shape: 'cruiser', lights: true }), { id: 'cruiser' }));
  setObjective('Walk the scene', 'A call came in from the Courts. Walk over and talk to the uniform.');
  CASE.chapter = 0;
}
function coldOpenTick() {}
function coldOpenTalk() {
  ST.stage = 1;
  convo([
    ['UNIFORM', ['Detective. Kid called it in around two. Nobody saw nothing, naturally.', 'Neighbors say he worked the corner up on Monroe. Sixteen, maybe seventeen.']],
    ['KOWAL', ['Who\'s corner?']],
    ['UNIFORM', ['Who\'s you think? Every corner from here to Fulton is Deacon\'s.', 'Homicide\'s gonna write it as a robbery. Clean in ninety days.']],
    ['KOWAL', ['A robbery. With his money still in his shoe.']],
    ['MABRY', ['{c=#d8b860}[RADIO]{/c} Kowal. Mabry. Leave it for Homicide.', 'Deputy Ops just gave us a detail. Six detectives, a basement, and Deacon Price.', 'Monroe and Calhoun in the morning. Bring a camera.']],
    ['KOWAL', ['{w=.4}Copy.']]
  ], () => { CASE.chapter = 1; game.go('card', { chapter: 1 }); });
}

// ---- TAPE ONE: the corner -----------------------------------------------------------------------------------------------------------
function cornerSetup(data) {
  CASE.chapter = 1;
  const st = ST.stage;
  if (st > 0 && ST.npcs.pigeon) ST.npcs.pigeon.hidden = true;
  cornerObjective();
  if (st === 0) game.after(.8, () => say('MABRY', ['{c=#d8b860}[RADIO]{/c} Your CI says he\'ll meet you in the alley behind Lucky\'s. Go easy. Pigeon spooks.']));
  if (st === 3) cornerTayArrives();
  if (st === 4) { const P = STREET.P(19, 12); ST.players[0].mover.x = P.x; ST.players[0].mover.y = P.y; ST.sale = null; ST.saleWait = 999; game.after(1, () => say('MABRY', ['{c=#d8b860}[RADIO]{/c} Squeak\'s moving with a bag. Stay on him. Crouch when he turns.'], { onDone: tailStart })); }
}
function cornerObjective() {
  const n = (hasEv('h2h1') ? 1 : 0) + (hasEv('h2h2') ? 1 : 0);
  const O = [
    ['Meet Pigeon behind Lucky\'s', 'Your informant waits in the alley north of Monroe. Walk, don\'t run: the lookouts watch the street.'],
    ['Photograph hand-to-hands (' + n + '/2)', 'Hold ' + keyLabel('aim') + ' to raise the camera, frame the hopper and the buyer while cash changes hands, press ' + keyLabel('shoot') + '. Blend in at the bus stop or a stoop, or shoot from the car on Monroe.'],
    ['Photograph the stash', 'Squeak fetches the vials from somewhere close. Catch him at the stash while he crouches over it.'],
    ['Photograph the collection', 'A black Lexus. The man in the black cap collects from Little Moe. Get them both in one frame.'],
    ['Tail Squeak', 'Keep him close but stay out of his eyes when he looks back. Stop, crouch or blend when he turns.']
  ];
  const o = O[ST.stage] || O[0];
  setObjective(o[0], o[1]);
}
function pigeonTalk() {
  const N = ST.npcs;
  N.pigeon.face(P1().mover);
  convo([
    ['PIGEON', ['Detective Kowal. You look tired. You want to buy a lighter? Socks? I got socks.']],
    ['KOWAL', ['I want names, Pigeon. Monroe and Calhoun.']],
    ['PIGEON', ['Names cost. Names is the expensive aisle.'], { choices: ['Pay him $20', 'Pay him $10', 'Lean on him'], onChoice: c => { CASE.pigeonPaid = c === 0 ? 20 : c === 1 ? 10 : 'lean'; if (c === 2) CASE.pigeonTrust = 0; } }]
  ], () => {
    const lines = CASE.pigeonPaid === 20 ? [['PIGEON', ['Twenty. That\'s respect. OK. The boy in the blue cap is Junebug. He take the money.', 'Little one in green is Squeak. He run the vials. Big one is Little Moe, it\'s his shift.', 'Kevo and Dre on the lookouts. And all of it is Deacon\'s package. Everybody know that.']]]
      : CASE.pigeonPaid === 10 ? [['PIGEON', ['Ten. Ten gets you ten dollars of truth.', 'Blue cap, that\'s Junebug, the money. Green hood, Squeak. That\'s what ten buys.']]]
      : [['KOWAL', ['How about you tell me, and I don\'t mention your warrant on Edmondson.']], ['PIGEON', ['...That\'s cold. That\'s real cold.', 'Junebug take the money, Squeak run, Little Moe watch the shift. Kevo and Dre call it out.', 'It\'s Deacon\'s package. You ain\'t heard it from me. You ain\'t heard nothing from me no more.']]];
    convo(lines.concat([['KOWAL', ['Get lost, Pigeon. Not too lost.']]]), () => {
      if (CASE.pigeonPaid !== 10) addEvidence('pigeon');
      N.pigeon.follow([STREET.P(30, 1), STREET.P(40, 1)], 30);
      game.after(9, () => { if (N.pigeon) N.pigeon.hidden = true; });
      ST.stage = 1; cornerObjective(); autoCheckpoint();
      game.after(1.5, () => say('KOWAL', ['{c=#8a8a9a}(Bus stop on Calhoun. Stoops. The car. Places a cop can stand without looking like one.){/c}']));
    });
  });
}
function autoCheckpoint() { CASE.checkpoints.corner = ST.stage; }
function cornerTick(dt) {
  const N = ST.npcs;
  if (ST.stage === 1) { cornerObjective(); if (hasEv('h2h1') && hasEv('h2h2')) { ST.stage = hasEv('stash') ? 3 : 2; cornerObjective(); autoCheckpoint(); if (ST.stage === 3) cornerTayArrives(); } }
  if (ST.stage === 2 && hasEv('stash')) { ST.stage = 3; cornerObjective(); autoCheckpoint(); cornerTayArrives(); }
  if (ST.stage === 3) collectTick(dt);
  if (ST.stage === 4) tailTick(dt);
}
function cornerTayArrives() {
  if (ST.npcs.tay) return;
  const car = Object.assign(new Car(66 * T, 10 * T, Math.PI, { color: '#141414', speed: 110 }), { id: 'lexus' });
  ST.cars.push(car);
  car.drive([{ x: 30 * T, y: 10 * T + 4 }, { x: STREET.tayPark.x + 30, y: STREET.tayPark.y + 6 }]);
  ST.collect = { phase: 'arrive', t: 0, shot: false, car };
  A.sfx('car');
  say('BRIGGS', ['{c=#d8b860}[RADIO]{/c} Black Lexus eastbound on Monroe. Tinted. Somebody\'s paying respects.'], { auto: 3, modal: false });
}
function collectTick(dt) {
  const C = ST.collect, N = ST.npcs; if (!C) return;
  C.t += dt;
  if (C.phase === 'arrive' && !C.car.moving) {
    C.phase = 'walk'; C.t = 0;
    N.tay = new Actor('TAY', C.car.x - 4, C.car.y + 14, { label: 'BLACK CAP', role: 'lt' });
    N.tay.goTo(N.moe.x + 12, N.moe.y + 2, 32); N.moe.face(N.tay);
  } else if (C.phase === 'walk' && N.tay.arrived()) { C.phase = 'give'; C.t = 0; N.tay.face(N.moe); N.moe.face(N.tay); N.moe.pose = 'cast'; N.tay.pose = 'hips'; }
  else if (C.phase === 'give' && C.t > 7) { C.phase = 'back'; C.t = 0; N.moe.pose = null; N.tay.pose = null; N.tay.goTo(C.car.x - 4, C.car.y + 14, 34); }
  else if (C.phase === 'back' && N.tay.arrived()) { C.phase = 'leave'; N.tay.hidden = true; C.car.drive([{ x: 10 * T, y: 10 * T + 4 }, { x: -6 * T, y: 10 * T + 4 }], 120); A.sfx('car'); }
  else if (C.phase === 'leave' && !C.car.moving) {
    ST.cars.splice(ST.cars.indexOf(C.car), 1); delete N.tay; ST.collect = null;
    if (ST.mode !== 'corner') return;
    if (hasEv('collect')) { ST.stage = 4; cornerObjective(); autoCheckpoint(); game.after(1, () => say('MABRY', ['{c=#d8b860}[RADIO]{/c} That\'s Tavon Rucker. Tay. Deacon\'s lieutenant on the west side.', 'Squeak\'s moving with a bag. Tail him. Don\'t you dare get made.'], { onDone: tailStart })); }
    else { say('MABRY', ['{c=#d8b860}[RADIO]{/c} You missed it. He comes back every hour on the hour. Be ready.'], { auto: 3.5, modal: false }); game.after(20, () => { if (ST.mode === 'corner' && ST.stage === 3) cornerTayArrives(); }); }
  }
}
// the tail: Squeak walks the bag to 1419 Lorraine, looking back now and then
function tailStart() {
  const N = ST.npcs, S = STREET;
  if (!N.squeak) return;
  N.squeak.pose = null; N.squeak.home = null;
  const route = [S.P(19, 14), S.P(19, 22), S.P(19, 30), S.P(25, 30), S.P(25, 35), S.P(31, 35), { x: S.houseDoor.x, y: S.houseDoor.y - 2 }];
  N.squeak.follow(route, 30);
  ST.tail = { look: 0, next: 5 + Math.random() * 3, far: 0, route };
  ST.sale = null; ST.saleWait = 999;
}
function tailTick(dt) {
  const tl = ST.tail, N = ST.npcs, Q = N.squeak; if (!tl || !Q) return;
  const p = P1(), at = p.inCar ? p.inCar : playerAt(p), d = E.dist(Q, at);
  if (tl.look > 0) {
    tl.look -= dt; Q.path.length && (Q.body.vx = Q.body.vy = 0);
    const seen = canSee(Q, Object.assign({ crouch: p.crouch }, playerAt(p)), STREET.map, { range: 110, fov: 1.3 });
    // a tail is judged on how you carry yourself: crouched or blending you are nobody, upright in the open you are a cop
    const m = p.mover, c = p.aim ? 2.6 : m.sprinting ? 1.5 : (p.blend && p.still > .5) ? .2 : p.crouch ? .3 : .55;
    tl.heat = seen.seen && !p.inCar && seen.exposure * c > .3 ? (tl.heat || 0) + dt : Math.max(0, (tl.heat || 0) - dt);
    if (tl.heat > .45) { tailBurned(); return; }
    if (tl.look <= 0) { Q.speed = 30; Q.facing = tl.saved || Q.facing; }
  } else {
    tl.next -= dt;
    if (tl.next <= 0) { tl.look = 1.9; tl.saved = Q.facing; Q.facing = Q.facing + Math.PI; Q.speed = 0; tl.next = 6 + Math.random() * 3; bubble(Q, '...', '#c8c4bc', 1.2); }
  }
  if (Q.speed === 0 && tl.look <= 0) Q.speed = 30;
  if (d > 210) { tl.far += dt; if (tl.far > 3) { toast('LOST HIM', 'Squeak turned a corner and he\'s gone. Back to the corner.'); tailReset(); return; } } else tl.far = 0;
  if (Q.arrived() && E.dist(Q, STREET.houseDoor) < 14) {
    addEvidence('house'); Q.hidden = true; ST.tail = null; A.sfx('door');
    say('KOWAL', ['1419 Lorraine. He let himself in. Back door\'s got a new lock on a house with no glass.', '{c=#8a8a9a}(That\'s the stash. That\'s the case.){/c}'], { onDone: () => chapterDone(1) });
  }
}
function tailBurned() {
  bubble(ST.npcs.squeak, 'HOLD UP...', '#ff5040', 2);
  A.sfx('whistle');
  CASE.heat++; CASE.burns++;
  toast('MADE', CASE.heat >= 3 ? 'Squeak knows your face.' : 'Squeak clocked you. Heat ' + CASE.heat + ' of 3.');
  if (CASE.heat >= 3) { game.after(1.6, () => game.go('gameover', { why: 'blown', retry: { scene: 'street', mode: 'corner', stage: 4 } })); return; }
  tailReset();
}
function tailReset() {
  const N = ST.npcs, S = STREET;
  ST.tail = null;
  N.squeak.body.x = S.runnerSpot.x; N.squeak.body.y = S.runnerSpot.y; N.squeak.path = []; N.squeak.speed = 30;
  const p = P1(); if (p.inCar) exitCar(p);
  p.mover.x = S.P(10, 13).x; p.mover.y = S.P(10, 13).y;
  game.after(4, () => { if (ST.mode === 'corner' && ST.stage === 4) tailStart(); });
}
function chapterDone(n) {
  if (ST.demo) return;
  game.go('results', { chapter: n });
}

// ---- TAPE FOUR: the re-up ---------------------------------------------------------------------------------------------------------
function reupSetup(data) {
  CASE.chapter = 4;
  ST.clock = 23 * 60 + 31;
  const st = ST.stage;
  if (st <= 1) { setObjective('Get in the car on Lorraine', 'The pager said 11:40 at the payphone on Lorraine and Fulton. The unmarked car is parked with a view.'); game.after(1, () => say('MABRY', ['{c=#d8b860}[RADIO]{/c} Units are staged on Fulton. Nobody moves until you get the picture.'], { auto: 3.5, modal: false })); }
  if (st >= 2) reupRaid(true);
}
function reupTick(dt) {
  const N = ST.npcs, p = P1(), S = STREET;
  if (ST.stage <= 1) ST.clock += dt * (p.inCar ? 1.4 : .5);
  if (ST.stage === 0 && p.inCar === S.car2) { ST.stage = 1; setObjective('Photograph the handoff', 'Wait. Tay comes for the 11:40 call, then Deacon\'s courier. Frame them together when the bags change hands.'); handoffStart(); }
  if (ST.stage === 1) handoffTick(dt);
  if (ST.stage === 2 && E.dist(playerAt(p), S.houseBack) < 70 && !p.inCar) { ST.stage = 3; chaseStart(false); }
  if (ST.stage === 3 && ST.chase && ST.chase.done) {
    ST.stage = 4; setObjective('Search 1419 Lorraine', 'The squad has the house. Find the package before somebody upstairs calls a press conference.');
  }
}
function handoffStart() {
  const N = ST.npcs, S = STREET;
  N.tay = new Actor('TAY', S.P(36, 35).x, S.P(36, 35).y, { label: 'TAY', role: 'lt' });
  N.tay.follow([S.P(44, 35), { x: S.payphone.x - 2, y: S.payphone.y + 12 }], 28);
  ST.handoff = { phase: 'walk', t: 0 };
}
function handoffTick(dt) {
  const H = ST.handoff, N = ST.npcs, S = STREET, car = ST.cars.find(c => c.id === 'courier');
  H.t += dt;
  if (H.phase === 'walk' && N.tay.arrived()) { H.phase = 'call'; H.t = 0; N.tay.face(-Math.PI / 2); N.tay.pose = 'wave'; A.sfx('ring'); ST.clock = 23 * 60 + 40; }
  else if (H.phase === 'call' && H.t > 6) { H.phase = 'car'; H.t = 0; N.tay.pose = null; car.hidden = false; car.drive([{ x: 52 * T, y: 33 * T }, { x: S.courier.x + 30, y: S.courier.y }], 80); A.sfx('car'); }
  else if (H.phase === 'car' && !car.moving) { H.phase = 'meet'; H.t = 0; N.pruitt = new Actor('PRUITT', car.x - 6, car.y + 16, { label: 'COURIER' }); N.pruitt.goTo(S.payphone.x + 12, S.payphone.y + 16, 30); N.tay.goTo(S.payphone.x - 4, S.payphone.y + 16, 20); }
  else if (H.phase === 'meet' && N.pruitt.arrived()) { H.phase = 'swap'; H.t = 0; N.pruitt.face(N.tay); N.tay.face(N.pruitt); N.pruitt.pose = 'cast'; N.tay.pose = 'cast'; }
  else if (H.phase === 'swap' && H.t > 8) { H.phase = 'walk2'; H.t = 0; N.pruitt.pose = null; N.tay.pose = null; N.pruitt.goTo(car.x - 6, car.y + 16, 26); N.tay.goTo(S.P(38, 35).x, S.P(38, 35).y, 30); H.phase = 'walk'; H.phase = 'walkaway'; }
  else if (H.phase === 'walkaway' && N.pruitt.arrived()) {
    N.pruitt.hidden = true; car.drive([{ x: 70 * T, y: 33 * T }], 100); A.sfx('car'); H.phase = 'gone'; H.t = 0;
    const ok = hasEv('handoff');
    convo([['MABRY', ['{c=#d8b860}[RADIO]{/c} Tell me you got that.']],
      ['KOWAL', ok ? ['Got it. Both faces, both bags.'] : ['...Partial. Not the swap.']],
      ['MABRY', ok ? ['{c=#d8b860}[RADIO]{/c} Then we go. All units, 1419 Lorraine. Kowal, take the back.'] : ['{c=#d8b860}[RADIO]{/c} Damn it. We go anyway, the package is in that house. Kowal, take the back.']]], () => reupRaid(false));
  }
}
function reupRaid(skip) {
  const S = STREET, N = ST.npcs;
  ST.stage = 2;
  const p = P1(); if (skip && p.inCar) exitCar(p);
  setObjective('Cover the back of 1419', 'The squad hits the front door. Whoever runs, runs out the back into the alley. Be there.');
  for (let i = 0; i < 2; i++) { const c = new Car(S.P(i ? 62 : 56, 33).x, S.P(56, 33).y, Math.PI, { shape: 'cruiser', lights: true, speed: 130 }); c.drive([{ x: S.houseDoor.x + (i ? 50 : 10), y: 33 * T }]); ST.cars.push(c); }
  A.sfx('siren');
  ST.squad = [];
  for (let i = 0; i < 3; i++) { const a = new Actor('cop' + i, S.P(44, 35).x + i * 8, S.P(44, 35).y, { look: { build: 'heroic', weapon: 'gun', outfit: 'coat', hat: { style: 'helmet', color: '#1a1a22' }, colors: { coat: '#1a2448', cloth: '#2a2a34', pants: '#1a1a2a', metal: '#2a2a2a', skin: ['#c89070', '#6a4430', '#e0b090'][i] } }, speed: 70 }); a.point = true; a.goTo(S.houseDoor.x - 10 + i * 10, S.houseDoor.y + 6); N['cop' + i] = a; }
  game.after(4, () => { A.sfx('ram'); game.shake && game.shake(3); bubble(N.cop0, 'POLICE! SEARCH WARRANT!', '#f0ece0', 2.4); });
  game.after(5.5, () => { A.sfx('ram'); A.sfx('door2'); });
  N.squeak = new Actor('SQUEAK', S.houseBack.x, S.houseBack.y - 10, { label: 'SQUEAK', speed: 0 }); N.squeak.hidden = true;
}
// the chase: Squeak out the back, through the cut-throughs; a tackle ends it
function chaseStart(demo) {
  const S = STREET, N = ST.npcs;
  if (demo) { ST.players[0].mover.x = S.houseBack.x - 40; ST.players[0].mover.y = S.houseBack.y; N.squeak = new Actor('SQUEAK', S.houseBack.x, S.houseBack.y, { label: 'SQUEAK' }); NIGHT.on = true; game.lights.ambient = .3; game.weather = { kind: 'rain', amount: .6, wind: .2 }; }
  const Q = N.squeak; Q.hidden = false; Q.down = 0; Q.run = 0;
  bubble(Q, 'AW HELL NO', '#f0ece0', 1.6);
  Q.follow([S.P(37, 42), S.P(37, 36), S.P(37, 35), S.P(44, 35), S.P(44, 30), S.P(44, 22), S.P(49, 22), S.P(56, 21), S.P(63, 21)], 104);
  ST.chase = { t: 0, far: 0, done: false, caught: false };
  music('chase');
  if (!demo) setObjective('Catch Squeak', 'Sprint with ' + keyLabel('sprint') + '. Get close and tackle with ' + keyLabel('act2') + '. Vault the fences with ' + keyLabel('interact') + '.');
}
function chaseTick(dt) {
  const C = ST.chase, Q = ST.npcs.squeak; if (!C || C.done) return;
  C.t += dt;
  const p = P1(), d = E.dist(Q, playerAt(p));
  // he tires: a sixteen-year-old in Jordans, not a sprinter
  Q.speed = Math.max(70, 104 - C.t * 1.6) * (d < 40 ? 1.08 : 1);
  if (d > 230) { C.far += dt; if (C.far > 3.5) chaseEnd(false); } else C.far = 0;
  if (Q.arrived() && !C.caught) chaseEnd(false);
}
function chaseTackle(p) {
  const C = ST.chase, Q = ST.npcs.squeak; if (!C || C.done) return;
  if (E.dist(Q, playerAt(p)) < 22) {
    C.caught = true; Q.path = []; Q.down = 1; Q.speed = 0;
    game.hitFx ? game.hitFx(Q.x, Q.y, 10, { power: .6, damage: null, textScale: 0 }) : null;
    A.sfx('punch'); game.after(.6, () => A.sfx('cuffs'));
    chaseEnd(true);
  }
}
function chaseEnd(caught) {
  const C = ST.chase; if (!C || C.done) return;
  C.done = true;
  music('night');
  if (ST.mode === 'chasedemo') return;
  if (caught) { CASE.squeakCaught = true; addEvidence('arrest'); say('SQUEAK', ['Get off me! I ain\'t did nothing! I was just... running. For my health.'], { onDone: () => say('KOWAL', ['Sixteen. Hands like a kid. They put a kid in the house with the package.'])}); }
  else { ST.npcs.squeak.hidden = true; say('KOWAL', ['{c=#8a8a9a}(Gone. Somewhere a mother\'s back door is open.){/c}']); }
}

// ---- the shift: the AI Hub round, or a local 1-2 player surveillance shift ----------------------------------------------------------
function shiftSetup(data) {
  CASE.chapter = 0;
  ST.shiftLen = data.seconds || 180; ST.shiftLeft = ST.shiftLen; ST.tayT = ST.shiftLen * .45; ST.tayShot = false; ST.lookShot = false;
  setObjective('Shift: photograph the corner', 'Every hand-to-hand is points. The stash, the collection and the lookouts pay more. Getting burned costs you.');
  CASE.pigeonPaid = 20;
}
function shiftTick(dt) {
  if (ST.ended) return;
  if (IN_HUB) {
    const t = HUB.time();
    if (t < 0) { ST.shiftLeft = ST.shiftLen; return; }
    ST.shiftLeft = Math.max(0, ST.shiftLen - t / 1000);
  } else ST.shiftLeft -= dt;
  ST.tayT -= dt;
  if (ST.tayT <= 0 && !ST.npcs.tay && !ST.collect) { cornerTayArrives(); ST.tayT = 9999; }
  if (ST.collect) collectTick(dt);
  hubProgressTick(dt);
  if (ST.shiftLeft <= 0) shiftEnd();
}
function shiftEnd() {
  if (ST.ended) return;
  ST.ended = true;
  ST.banner = { text: 'END OF SHIFT', sub: 'Score ' + ST.score };
  if (IN_HUB) { hubResult(); return; }
  const best = MEM.best !== undefined ? MEM.best : E.store.get('rewired-shift-best', 0);
  if (ST.score > best) { MEM.best = ST.score; E.store.set('rewired-shift-best', ST.score); }
  game.after(2.5, () => game.go('results', { shift: true, score: ST.score, best: Math.max(best, ST.score), photos: CASE.photos }));
}
