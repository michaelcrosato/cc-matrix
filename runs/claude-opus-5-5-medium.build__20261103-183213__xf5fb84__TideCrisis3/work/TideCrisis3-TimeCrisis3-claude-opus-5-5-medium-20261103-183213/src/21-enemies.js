// 21-enemies: the enemy archetype registry and their behavior state machines. Entries (stand, run, jump, rappel,
// door, vault, roll), peeks (up, side), fire plans that ask the ThreatDirector, relocation, the quartermaster's run,
// rushers, shields, snipers, drones, jet skis, mounted gunners and captors. Hit volumes are rebuilt each step from the
// pose (the same heights the engine's rig is drawn at). Reactions and deaths. Reads: Sim (20), threats (22).

// look: Humanoid options for the presentation; ai: the behavior
def('enemy', 'deckhand', { name: 'Deckhand', ai: 'soldier', hp: 1, score: 1000, expose: [1.4, 2.2], hide: [1.0, 1.9], burst: 3, gap: .12, threat: [.25, .32, .4], tele: 1.1, aim: [.35, .6],
  looks: [{ build: 'heroic', weapon: 'rifle', outfit: 'shirt', sleeves: 'long', hat: 'cap', hair: 'short', colors: { cloth: '#26324a', pants: '#2b2b33', hat: '#1b2236', skin: '#e0b48a', boot: '#1a1a1a', metal: '#3a3f48', belt: '#3a2a1a' } },
          { build: 'heroic', weapon: 'rifle', outfit: 'shirt', sleeves: 'long', hat: 'cap', hair: 'short', colors: { cloth: '#2a3550', pants: '#30303a', hat: '#1b2236', skin: '#8d5a3a', boot: '#1a1a1a', metal: '#3a3f48' } },
          { build: 'heroic', weapon: 'rifle', outfit: 'shirt', sleeves: 'long', hat: 'cap', hair: 'short', colors: { cloth: '#1f2c44', pants: '#2b2b33', hat: '#242a40', skin: '#c68a5e', boot: '#1a1a1a', metal: '#3a3f48' } },
          { build: 'heroic', weapon: 'rifle', outfit: 'shirt', sleeves: 'long', hat: 'cap', hair: 'short', colors: { cloth: '#2c3448', pants: '#2b2b33', hat: '#1b2236', skin: '#5e3a26', boot: '#1a1a1a', metal: '#3a3f48' } }] });
def('enemy', 'marine', { name: 'Marine', ai: 'soldier', hp: 2, score: 1500, expose: [1.6, 2.4], hide: [1.0, 1.7], burst: 4, gap: .1, threat: [.35, .35, .38], tele: .95, aim: [.3, .5],
  looks: [{ build: 'heroic', weapon: 'rifle', outfit: 'shirt', sleeves: 'long', hat: 'helmet', armor: true, colors: { cloth: '#4a5a32', pants: '#3a4228', hat: '#3a4a2a', plate: '#5a6a3a', skin: '#d8a880', boot: '#2a2418', metal: '#30343a' } }] });
def('enemy', 'redtide', { name: 'Red Tide', ai: 'soldier', elite: true, hp: 2, score: 3000, expose: [.9, 1.3], hide: [.8, 1.3], burst: 2, gap: .09, threat: [1, 1, 1], tele: .55, aim: [.2, .3], always: true,
  looks: [{ build: 'heroic', weapon: 'gun', outfit: 'coat', sleeves: 'long', hat: { style: 'band', color: '#b0141e' }, hair: 'short', colors: { cloth: '#a81e22', coat: '#b4161e', pants: '#2a1012', trim: '#1a0a0a', skin: '#2a1a1a', boot: '#140808', metal: '#1a1a1e', belt: '#140808' } }] });
def('enemy', 'quartermaster', { name: 'Quartermaster', ai: 'runner', hp: 1, score: 2000, threat: [.1, .1, .1], tele: 1.2, burst: 1, gap: .2, aim: [.4, .5],
  looks: [{ build: 'heroic', weapon: null, outfit: 'shirt', sleeves: 'short', hat: 'cap', armor: true, colors: { cloth: '#ff7a1a', plate: '#ff8a20', pants: '#2a2a33', hat: '#ff6a10', skin: '#d8a880', boot: '#1a1a1a' } }] });
def('enemy', 'grenadier', { name: 'Grenadier', ai: 'soldier', fireKind: 'grenade', hp: 2, score: 2000, expose: [1.2, 1.4], hide: [1.4, 2.2], burst: 1, gap: .3, threat: [1, 1, 1], tele: 1.3, aim: [.45, .55],
  looks: [{ build: 'bulky', weapon: null, outfit: 'shirt', sleeves: 'none', hat: 'cap', armor: true, colors: { cloth: '#3a3a2a', plate: '#5a4a2a', pants: '#2a2a22', hat: '#2a2a1a', skin: '#c89070', boot: '#1a1a1a' } }] });
def('enemy', 'rocketeer', { name: 'Rocketeer', ai: 'soldier', fireKind: 'rocket', hp: 2, score: 2500, expose: [2.0, 2.4], hide: [1.6, 2.4], burst: 1, gap: .3, threat: [1, 1, 1], tele: .8, aim: [.8, .9],
  looks: [{ build: 'heroic', weapon: 'rifle', gunLen: 13, outfit: 'shirt', sleeves: 'long', hat: 'helmet', colors: { cloth: '#3a4250', pants: '#2a2e36', hat: '#4a5260', skin: '#d0a080', boot: '#1a1a1a', metal: '#4a5a3a' } }] });
def('enemy', 'shield', { name: 'Shield trooper', ai: 'shield', hp: 3, score: 3000, burst: 3, gap: .12, threat: [.4, .4, .45], tele: .9, aim: [.4, .5], expose: [1.2, 1.6], hide: [1.2, 1.8],
  looks: [{ build: 'bulky', weapon: 'gun', outfit: 'shirt', sleeves: 'long', hat: 'helmet', armor: true, shield: true, colors: { cloth: '#2a2e3a', plate: '#3a404c', pants: '#22252e', hat: '#30343e', skin: '#d0a080', boot: '#111', metal: '#222' } }] });
def('enemy', 'rusher', { name: 'Rusher', ai: 'rusher', hp: 1.5, score: 2000, threat: [1, 1, 1], tele: .45,
  looks: [{ build: 'heroic', weapon: 'sword', bladeLen: 13, outfit: 'shirt', sleeves: 'none', hat: { style: 'band', color: '#c02020' }, hair: 'spiky', colors: { cloth: '#d8d4c8', pants: '#3a3428', skin: '#b07850', hair: '#1a1a1a', boot: '#2a1a10', metal: '#d8dde8', hilt: '#3a2a1a' } }] });
def('enemy', 'sniper', { name: 'Sniper', ai: 'soldier', fireKind: 'laser', elite: true, hp: 1, score: 3000, expose: [2.0, 2.2], hide: [1.5, 2.2], burst: 1, gap: .2, threat: [1, 1, 1], tele: 1.4, aim: [.2, .2],
  looks: [{ build: 'heroic', weapon: 'rifle', gunLen: 14, outfit: 'coat', sleeves: 'long', hood: true, colors: { cloth: '#5a5e66', coat: '#6a6e76', hair: '#4a4e56', pants: '#3a3e46', skin: '#c8a080', boot: '#1a1a1a', metal: '#1a1a1e' } }] });
def('enemy', 'drone', { name: 'Drone', ai: 'drone', hp: 2, score: 1500, threat: [.3, .3, .35], tele: .9, burst: 1, gap: .2, aim: [.5, .7], fly: true });
def('enemy', 'jetski', { name: 'Jet ski', ai: 'jetski', hp: 1, score: 1500, threat: [.3, .3, .35], tele: 1.0, burst: 2, gap: .15, aim: [.4, .6],
  looks: [{ build: 'heroic', weapon: 'gun', outfit: 'shirt', sleeves: 'none', hat: { style: 'band', color: '#1a1a1a' }, colors: { cloth: '#1a6a7a', pants: '#1a1a22', skin: '#d0a080', boot: '#111' } }] });
def('enemy', 'gunner', { name: 'Mounted gunner', ai: 'gunner', hp: 3, score: 2500, threat: [.5, .5, .55], tele: 1.0, burst: 6, gap: .08, aim: [.4, .6], expose: [2.2, 2.8], hide: [1.0, 1.4],
  looks: [{ build: 'heroic', weapon: 'rifle', outfit: 'shirt', sleeves: 'long', hat: 'helmet', colors: { cloth: '#26324a', pants: '#2b2b33', hat: '#2a3040', skin: '#d0a080', boot: '#111', metal: '#30343a' } }] });
def('enemy', 'captor', { name: 'Captor', ai: 'captor', elite: true, hp: 1, score: 5000, threat: [1, 1, 1], tele: .8, burst: 1, gap: .2, aim: [.3, .3], expose: [.7, .7], hide: [1.0, 1.5],
  looks: [{ build: 'heroic', weapon: 'gun', outfit: 'coat', sleeves: 'long', hat: { style: 'band', color: '#b0141e' }, colors: { cloth: '#a81e22', coat: '#b4161e', pants: '#2a1012', skin: '#2a1a1a', boot: '#140808', metal: '#1a1a1e' } }] });
// cut-outs and the range's robot (Training)
def('enemy', 'cutout', { name: 'Target', ai: 'cutout', hp: 1, score: 500, threat: [0, 0, 0], tele: 1, burst: 0, aim: [1, 1], expose: [2.5, 3.5], hide: [.6, 1.2], board: true });
def('enemy', 'turret', { name: 'Training turret', ai: 'turret', hp: 99, score: 0, threat: [1, 1, 1], tele: 1.1, burst: 1, gap: .2, aim: [.3, .3], noClear: true });

const ACT = { soldier: soldierAI, runner: runnerAI, rusher: rusherAI, shield: shieldAI, drone: droneAI, jetski: jetskiAI, gunner: soldierAI, captor: captorAI, cutout: cutoutAI, turret: turretAI };

function makeEnemy(sim, type, coverId, o = {}) {
  const A = get('enemy', type), R = sim.rng('enemy');
  const cov = coverId ? sim.covers[coverId] : null;
  const at = o.at ? (sim.carrier && o.local ? sim.cw(o.at) : o.at.slice()) : cov ? cov.at.slice() : [0, 0, 0];
  const e = { id: sim.nextId++, type, A, x: at[0], y: at[1], z: at[2], facing: 0, cover: cov, state: 'enter', t: 0, up: 0, hp: (o.hp || A.hp) * tune.enemy.hpMul, wave: o.wave, o,
    look: A.looks ? (o.look !== undefined ? A.looks[o.look] : R.pick(A.looks)) : null, lookI: 0, size: o.size || (A.ai === 'shield' ? 1.05 : 1), dead: false, deadT: 0, cycles: 0, exposedT: 0, flashT: 0, hurtT: 0,
    stag: 0, target: o.target !== undefined ? o.target : sim.rng('target')() * sim.players.length | 0, shots: 0, threat: null, sinkNow: 0, vol: null, air: false, climb: false, flip: 0, run: 0, point: false, side: 0, vel: [0, 0, 0],
    drop: o.drop, noClear: !!(o.noClear || A.noClear), shieldDown: 0, laser: 0, entry: o.entry || (cov ? 'stand' : 'run'), from: null, to: null, enterT: 0, enterDur: 0, ski: null, mount: o.mount || null };
  e.lookI = A.looks ? A.looks.indexOf(e.look) : 0;
  if (e.target >= sim.players.length) e.target = 0;
  if (A.ai === 'drone') { e.center = at.slice(); e.phase = R() * 6.28; e.entry = 'fly'; e.z = at[2]; e.from = o.from || [at[0] + 160, at[1] - 120, at[2] + 60]; }
  if (A.ai === 'jetski') { e.path = new E.Path(o.path, { smooth: 'catmull' }); e.pd = 0; e.speed = o.speed || 170; e.skiHp = 3; e.entry = 'ride'; }
  if (A.ai === 'runner') { e.route = (o.route || [[at[0] - 100, at[1], at[2]], [at[0] + 100, at[1], at[2]]]).map(p => p.slice()); e.x = e.route[0][0]; e.y = e.route[0][1]; e.z = e.route[0][2]; e.entry = 'route'; e.ri = 1; }
  if (A.ai === 'rusher') { e.entry = 'sprint'; if (o.from) { e.x = o.from[0]; e.y = o.from[1]; e.z = o.from[2]; } }
  if (A.ai === 'shield') { e.route = (o.route || [at]).map(p => p.slice()); e.ri = 0; e.entry = 'walk'; e.x = e.route[0][0]; e.y = e.route[0][1]; e.z = e.route[0][2]; }
  if (A.ai === 'captor') { e.hostage = TC.spawnCivilian(sim, { kind: 'hostage', at: [at[0] + 2, at[1], at[2]], hostage: true, captor: e.id }); sim.hostage = e.hostage; }
  if (cov) cov.busy++;
  // entries that start elsewhere
  const face = cov ? coverFace(sim, cov) : 0, fx = Math.cos(face), fy = Math.sin(face);
  if (['run', 'door', 'jump', 'rappel', 'vault', 'roll'].includes(e.entry)) {
    let from = o.from ? (sim.carrier && o.local ? sim.cw(o.from) : o.from.slice()) : null;
    if (!from) {
      if (e.entry === 'rappel') from = [at[0], at[1], at[2] + 90];
      else if (e.entry === 'jump') from = [at[0] - fx * 30, at[1] - fy * 30, at[2] + 44];
      else if (e.entry === 'vault') from = [at[0] + fx * 30, at[1] + fy * 30, at[2]];
      else { const sd = (R() < .5 ? -1 : 1) * 90; from = [at[0] - fy * sd - fx * 20, at[1] + fx * sd - fy * 20, at[2]]; }
    }
    e.from = from; e.to = at.slice(); e.x = from[0]; e.y = from[1]; e.z = from[2];
    const dist = vdist(from, at);
    e.enterDur = e.entry === 'rappel' ? Math.max(.6, (from[2] - at[2]) / 70) : e.entry === 'jump' ? .75 : e.entry === 'vault' ? .6 : e.entry === 'roll' ? Math.max(.5, dist / 120) : Math.max(.3, dist / 115);
    e.up = 1;
    if (e.entry === 'door') sim.emit('door', { at: from });
  } else if (e.entry === 'stand') { e.state = 'hide'; e.t = R.range(.2, .9); }
  e.facing = faceTarget(sim, e);
  sim.enemies.push(e); sim.spawnedBy[type] = (sim.spawnedBy[type] || 0) + 1;
  sim.emit('spawn', { id: e.id, kind: type }); sim._cue('spawn:' + type);
  updateVols(sim, e);
  return e;
}
TC.makeEnemy = makeEnemy;

function coverFace(sim, cov) {
  if (cov.face !== undefined) return cov.face;
  const st = sim.poseOf(0, 'stand'); return Math.atan2(st.y - cov.at[1], st.x - cov.at[0]);
}
function targetPos(sim, e) { const c = sim.cameraFor(e.target); return [c.x, c.y, c.z]; }
function faceTarget(sim, e) { const t = targetPos(sim, e); return Math.atan2(t[1] - e.y, t[0] - e.x); }
function tall(e) { return e.cover && e.cover.h >= 30; }
function sinkFor(e) { if (!e.cover || tall(e) || e.A.fly) return 0; return Math.max(0, (RIGH.headCrouch + 4.5) * e.size - e.cover.h + 1.5); }
TC.sinkFor = sinkFor;

// the stage's difficulty index into an archetype's threat chances
function threatChance(sim, e) { const a = e.A.threat; return a[Math.min(a.length - 1, (sim.stageId || 1) - 1)] || a[0]; }

// ---------------------------------------------------------------- hit volumes
function updateVols(sim, e) {
  if (e.dead) { e.vols = null; return; }
  const s = e.size, k = e.up, zb = e.z - e.sinkNow, A = e.A;
  if (A.ai === 'drone') { e.vols = [{ part: 'body', c: [e.x, e.y, e.z], r: 7 }]; return; }
  if (A.board) { e.vols = k > .5 ? [{ part: 'head', c: [e.x, e.y, zb + 27 * s], r: 4.2 }, { part: 'body', cap: true, a: [e.x, e.y, zb + 4], b: [e.x, e.y, zb + 22], r: 6 }] : null; return; }
  if (A.ai === 'turret') { e.vols = [{ part: 'body', c: [e.x, e.y, e.z + 10], r: 9 }]; return; }
  const crouch = e.state === 'hide' && !tall(e) ? 1 - k : 0;
  const hz = zb + lerp(RIGH.head, RIGH.headCrouch, crouch) * s, sh = zb + lerp(RIGH.sh, RIGH.shCrouch, crouch) * s, hp = zb + lerp(RIGH.hip, RIGH.hipCrouch, crouch) * s;
  const fx = Math.cos(e.facing), fy = Math.sin(e.facing), lean = e.flip > 0 ? 0 : 0;
  const v = [{ part: 'head', c: [e.x + fx * (1 + lean), e.y + fy * (1 + lean), hz], r: 3.9 * s }, { part: 'body', cap: true, a: [e.x, e.y, hp], b: [e.x + fx * .5, e.y + fy * .5, sh], r: 5.2 * s }, { part: 'legs', cap: true, a: [e.x, e.y, zb + 1], b: [e.x, e.y, hp], r: 3.6 * s }];
  if (A.ai === 'shield' && e.shieldDown <= 0) {
    const d = 9 * s; v.push({ part: 'shield', shield: true, cap: true, a: [e.x + fx * d - fy * 7, e.y + fy * d + fx * 7, zb + 2], b: [e.x + fx * d + fy * 7, e.y + fy * d - fx * 7, zb + (e.state === 'fire' || e.state === 'aim' ? 19 : 27) * s], r: 6 });
    v.push({ part: 'shield', shield: true, cap: true, a: [e.x + fx * d, e.y + fy * d, zb + 2], b: [e.x + fx * d, e.y + fy * d, zb + (e.state === 'fire' || e.state === 'aim' ? 19 : 27) * s], r: 7 });
  }
  if (A.ai === 'gunner' && e.mount) { v.splice(2, 1); }
  if (A.ai === 'captor') { v.length = 0; if (k > .5) v.push({ part: 'head', c: [e.x - fy * 8 * e.side, e.y + fx * 8 * e.side, hz], r: 3.9 * s }); }
  if (A.ai === 'jetski' && e.ski && e.skiHp > 0) v.push({ part: 'ski', c: [e.x, e.y, e.z + 3], r: 8 });
  e.vols = v;
}
TC.updateVols = updateVols;

// ---------------------------------------------------------------- stepping
TC.stepEnemies = (sim, dt) => {
  const fighting = sim.phase === 'action' || sim.phase === 'clear';
  for (const e of sim.enemies) {
    e.flashT = Math.max(0, e.flashT - dt); e.hurtT = Math.max(0, e.hurtT - dt); e.shieldDown = Math.max(0, e.shieldDown - dt); e.laser = Math.max(0, e.laser - dt);
    if (e.dead) { e.deadT += dt; deathStep(sim, e, dt); continue; }
    if (e.stag > 0) { e.stag -= dt; e.x += e.vel[0] * dt; e.y += e.vel[1] * dt; e.vel[0] *= .9; e.vel[1] *= .9; }
    if (fighting || e.state === 'enter') {
      if (e.state === 'enter' && e.from && e.to) enterStep(sim, e, dt);
      else (ACT[e.A.ai] || soldierAI)(sim, e, dt);
    }
    if (e.up > .9 && e.state !== 'hide') e.exposedT += dt; else if (e.state === 'hide') e.exposedT = 0;
    const want = sinkFor(e) * (1 - e.up); e.sinkNow = approach(e.sinkNow, want, dt * 90);
    updateVols(sim, e);
  }
  sim.enemies = sim.enemies.filter(e => !(e.dead && e.deadT > 3.2) && !e.gone);
  // allies fire at cues: every few seconds at the nearest exposed enemy
  for (const a of sim.allies) {
    a.fireT -= dt; if (a.fireT > 0 || sim.phase !== 'action') continue;
    a.fireT = 4 + sim.rng('ally')() * 3;
    const tgt = sim.enemies.filter(e => !e.dead && e.up > .9 && e.state !== 'enter' && !e.A.elite && e.A.ai === 'soldier').sort((p, q) => vdist(a.at, [p.x, p.y, p.z]) - vdist(a.at, [q.x, q.y, q.z]))[0];
    if (tgt) { sim.emit('allyshot', { from: [a.at[0], a.at[1], a.at[2] + 22], to: [tgt.x, tgt.y, tgt.z + 20], agent: a.agent }); a.aimAt = [tgt.x, tgt.y]; damageEnemy(sim, tgt, 1, { ally: true, at: [tgt.x, tgt.y, tgt.z + 20] }); }
  }
};

function enterStep(sim, e, dt) {
  e.enterT += dt; const u = clamp(e.enterT / e.enterDur, 0, 1), F = e.from, T = e.to;
  e.x = lerp(F[0], T[0], u); e.y = lerp(F[1], T[1], u);
  if (e.entry === 'jump' || e.entry === 'vault') { e.z = lerp(F[2], T[2], u) + Math.sin(u * Math.PI) * (e.entry === 'jump' ? 16 : 10); e.air = u < .95; }
  else if (e.entry === 'rappel') { e.z = lerp(F[2], T[2], u); e.climb = u < 1; }
  else { e.z = lerp(F[2], T[2], u); e.run = 1; }
  if (e.entry === 'roll') e.flip = u < 1 ? u : 0;
  const mv = Math.atan2(T[1] - F[1], T[0] - F[0]); e.facing = e.entry === 'rappel' ? faceTarget(sim, e) : mv;
  e.vel = [(T[0] - F[0]) / e.enterDur, (T[1] - F[1]) / e.enterDur, 0];
  if (u >= 1) {
    e.air = false; e.climb = false; e.run = 0; e.flip = 0; e.vel = [0, 0, 0];
    if (e.entry === 'jump') sim.emit('land', { id: e.id, at: [e.x, e.y, e.z] });
    e.state = e.A.ai === 'soldier' || e.A.ai === 'gunner' ? 'peek' : e.A.ai === 'captor' ? 'hide' : 'peek'; e.t = 0; e.from = null; e.up = 1; e.facing = faceTarget(sim, e);
  }
}

// ---- soldiers: HIDE <-> PEEK -> AIM (maybe a threat) -> FIRE -> HIDE ... RELOCATE after a few cycles
function soldierAI(sim, e, dt) {
  const A = e.A, R = sim.rng('ai'), react = tune.enemy.reactMul;
  e.t -= dt; e.run = 0;
  const T = e.target;
  if (sim.players[T] && (sim.players[T].left || sim.players[T].out)) e.target = sim.players.findIndex(p => !p.left && !p.out); if (e.target < 0) e.target = 0;
  switch (e.state) {
    case 'hide':
      e.up = approach(e.up, tall(e) ? 1 : 0, dt / .22); e.point = false;
      if (tall(e)) e.side = approach(e.side, 0, dt / .2);
      if (e.t <= 0) { e.state = 'peek'; e.t = .25 * react; e.peekDir = pickPeek(sim, e); }
      break;
    case 'peek':
      e.up = approach(e.up, 1, dt / .2); e.facing = faceTarget(sim, e); e.point = true;
      if (e.peekDir === 'side' || tall(e)) { const s = e.peekSide || (e.peekSide = (e.cover && e.cover.peek.includes('left')) ? -1 : 1); e.side = approach(e.side, s, dt / .2); }
      if (e.t <= 0) { e.state = 'aim'; e.t = R.range(A.aim[0], A.aim[1]) * tune.enemy.fireMul; e.shots = A.burst; e.threat = null; e.exposeLeft = R.range(...(A.expose || [1.4, 2])); e.decided = false; }
      break;
    case 'aim':
      e.facing = faceTarget(sim, e); e.point = true; e.up = 1; e.exposeLeft -= dt;
      if (!e.decided) { e.decided = true; decideFire(sim, e); }
      if (e.threat) { if (e.threat.done) { e.state = 'fire'; e.t = 0; e.shots = A.burst; } }
      else if (e.t <= 0) { e.state = 'fire'; e.t = 0; e.shots = A.burst; }
      break;
    case 'fire':
      e.facing = faceTarget(sim, e); e.point = true; e.exposeLeft -= dt;
      if (e.t <= 0 && e.shots > 0) { fireShot(sim, e); e.shots--; e.t = A.gap || .12; }
      if (e.shots <= 0 && e.t <= 0) {
        e.cycles++;
        if (e.exposeLeft > .4 && A.ai !== 'gunner' && A.fireKind !== 'grenade' && A.fireKind !== 'rocket' && A.fireKind !== 'laser') { e.state = 'aim'; e.t = R.range(A.aim[0], A.aim[1]) * tune.enemy.fireMul; e.decided = false; e.threat = null; }
        else { e.state = 'hide'; e.t = R.range(...(A.hide || [1, 1.8])) * tune.enemy.fireMul; e.side = e.side; if (e.cycles >= 3 && !e.mount && R() < .5) relocate(sim, e); }
      }
      break;
    case 'move': {
      const T2 = e.to, d = vsub(T2, [e.x, e.y, e.z]), L = Math.hypot(d[0], d[1]), sp = 105 * dt;
      e.run = 1; e.up = 1; e.point = false; e.facing = Math.atan2(d[1], d[0]);
      if (L <= sp) { e.x = T2[0]; e.y = T2[1]; e.state = 'hide'; e.t = .3; e.run = 0; e.facing = faceTarget(sim, e); }
      else { e.x += d[0] / L * sp; e.y += d[1] / L * sp; }
      break;
    }
    default: e.state = 'hide'; e.t = .5;
  }
}
function pickPeek(sim, e) { const p = e.cover ? e.cover.peek : ['up']; return tall(e) ? 'side' : sim.rng('ai').pick(p) === 'up' ? 'up' : 'side'; }
function relocate(sim, e) {
  if (e.cover && e.cover.ledge) return;
  const free = Object.values(sim.covers).filter(c => c.busy === 0 && c !== e.cover && !c.noMove && !c.ledge && Math.abs(c.at[2] - e.z) < 4);
  if (!free.length) return;
  const c = sim.rng('ai').pick(free); if (vdist(c.at, e.cover ? e.cover.at : [e.x, e.y, e.z]) > 260) return;
  if (e.cover) e.cover.busy--; c.busy++; e.cover = c; e.to = c.at.slice(); e.state = 'move'; e.side = 0; e.up = 1;
}
function muzzle(e) {
  const f = e.facing, s = e.size, zb = e.z - e.sinkNow, sd = e.side * 14;
  if (e.A.ai === 'drone') return [e.x, e.y, e.z - 3];
  return [e.x + Math.cos(f) * 16 * s - Math.sin(f) * (sd + 2), e.y + Math.sin(f) * 16 * s + Math.cos(f) * (sd + 2), zb + 23 * s * (e.up > .5 ? 1 : .8)];
}
TC.muzzle = muzzle;
// decide this exposure's fire: a threat (crisis flash) or misses
function decideFire(sim, e) {
  if (e.o.noFire) { e.t = .6; return; }
  const A = e.A, chance = threatChance(sim, e) * tune.enemy.threatMul * sim.diff.threatMul;
  const tele = A.tele * tune.enemy.teleMul * sim.diff.teleMul;
  if (A.fireKind === 'grenade') { e.t = A.aim[0]; e.lob = true; return; }
  if (A.fireKind === 'rocket') { e.t = tele; e.glint = tele; return; }
  if (A.fireKind === 'laser') { e.laser = tele + .2; const th = TC.requestThreat(sim, { src: e.id, target: e.target, dur: tele, kind: 'sniper', at: muzzle(e), always: true }); e.threat = th; return; }
  if (A.always || sim.rng('threat')() < chance) e.threat = TC.requestThreat(sim, { src: e.id, target: e.target, dur: tele, kind: A.elite ? 'elite' : 'shot', at: muzzle(e), always: !!A.always });
}
function fireShot(sim, e) {
  const A = e.A, at = muzzle(e);
  if (e.o.noFire) return;
  if (A.fireKind === 'grenade') { sim.emit('throw', { id: e.id }); TC.lobGrenade(sim, e, at); return; }
  if (A.fireKind === 'rocket') { TC.fireRocket(sim, e, at, 'rocket'); return; }
  sim.emit('eshot', { id: e.id, at, kind: A.fireKind || 'rifle', target: e.target, threat: !!(e.threat && e.threat.hit !== undefined && e.shots === A.burst), hitP: e.threat ? e.threat.result : null });
}

// ---- the quartermaster: runs a route across, flees off the end
function runnerAI(sim, e, dt) {
  e.run = 1; e.up = 1; e.point = false; e.state = 'run';
  const T = e.route[e.ri]; if (!T) { e.gone = true; sim.emit('fled', { id: e.id }); return; }
  const d = vsub(T, [e.x, e.y, e.z]), L = Math.hypot(d[0], d[1]), sp = (e.o.speed || 70) * dt;
  e.facing = Math.atan2(d[1], d[0]);
  if (L <= sp) { e.x = T[0]; e.y = T[1]; e.z = T[2]; e.ri++; } else { e.x += d[0] / L * sp; e.y += d[1] / L * sp; e.z += (T[2] - e.z) * Math.min(1, sp / L); }
}

// ---- rushers: sprint in zigzag, slash at 2 m, blocked by cover, stagger back, again
function rusherAI(sim, e, dt) {
  const c = sim.poseOf(e.target, 'stand'), tgt = [c.x + Math.cos(c.yaw) * 38, c.y + Math.sin(c.yaw) * 38, (e.o.ground !== undefined ? e.o.ground : c.z - EYE_STAND)];
  e.up = 1;
  if (e.state === 'enter' || e.state === 'sprint' || e.state === 'peek' || e.state === 'hide') {
    e.state = 'sprint';
    const d = vsub(tgt, [e.x, e.y, e.z]), L = Math.hypot(d[0], d[1]), sp = 130 * dt, zig = Math.sin(sim.t * 5 + e.id) * 40 * dt;
    e.run = 1; e.facing = Math.atan2(d[1], d[0]); e.point = false;
    if (L < 6) { e.state = 'wind'; e.t = 0; e.threat = TC.requestThreat(sim, { src: e.id, target: e.target, dur: e.A.tele * tune.enemy.teleMul * sim.diff.teleMul, kind: 'slash', at: [e.x, e.y, e.z + 22], always: true }); e.run = 0; }
    else { e.x += d[0] / L * sp - d[1] / L * zig; e.y += d[1] / L * sp + d[0] / L * zig; e.z += (tgt[2] - e.z) * Math.min(1, sp / L); }
  } else if (e.state === 'wind') {
    e.run = 0; e.facing = Math.atan2(c.y - e.y, c.x - e.x); e.atk = 'wind';
    if (!e.threat || e.threat.done) { e.state = 'slash'; e.t = .3; e.atk = 'active'; sim.emit('slash', { id: e.id, blocked: e.threat ? !e.threat.result : true }); }
  } else if (e.state === 'slash') {
    e.t -= dt; if (e.t <= 0) { e.state = 'back'; e.t = .9; e.atk = null; const a = e.facing + Math.PI; e.vel = [Math.cos(a) * 90, Math.sin(a) * 90, 0]; e.stag = .5; }
  } else if (e.state === 'back') { e.t -= dt; e.run = .6; if (e.t <= 0) { e.state = 'sprint'; } }
}

// ---- shields: walk the route between covers, fire over the shield; the shotgun or GL knocks it aside
function shieldAI(sim, e, dt) {
  if (e.state === 'enter' || e.state === 'walk') {
    e.state = 'walk'; e.point = false; e.up = 1;
    const T = e.route[e.ri + 1];
    if (!T) { e.state = 'hide'; e.t = .6; return; }
    const d = vsub(T, [e.x, e.y, e.z]), L = Math.hypot(d[0], d[1]), sp = 32 * dt; e.run = .45; e.facing = faceTarget(sim, e);
    if (L <= sp) { e.x = T[0]; e.y = T[1]; e.ri++; e.state = 'hide'; e.t = .4; e.run = 0; } else { e.x += d[0] / L * sp; e.y += d[1] / L * sp; }
    e.walkT = (e.walkT || 0) + dt; if (e.walkT > 2.6) { e.walkT = 0; e.state = 'aim'; e.t = .45; e.shots = e.A.burst; e.decided = false; e.threat = null; e.exposeLeft = 1; }
    return;
  }
  soldierAI(sim, e, dt);
  if (e.state === 'hide' && e.t <= .05 && e.route[e.ri + 1]) { e.state = 'walk'; }
  e.up = 1;
}

// ---- drones: fly in from afar, then a figure-eight around the center; a zap beam
function droneAI(sim, e, dt) {
  e.phase += dt * 1.3; const c = e.center;
  if (e.state === 'enter') { e.enterT += dt; const u = clamp(e.enterT / 1.2, 0, 1); e.x = lerp(e.from[0], c[0], u); e.y = lerp(e.from[1], c[1], u); e.z = lerp(e.from[2], c[2], u); if (u >= 1) { e.state = 'hide'; e.t = .6; } e.up = 1; return; }
  const tx = c[0] + Math.sin(e.phase) * 30, ty = c[1] + Math.sin(e.phase * 2) * 22, tz = c[2] + Math.sin(e.phase * 1.7) * 8;
  e.x += (tx - e.x) * Math.min(1, dt * 3); e.y += (ty - e.y) * Math.min(1, dt * 3); e.z += (tz - e.z) * Math.min(1, dt * 3);
  e.up = 1; e.t -= dt;
  if (e.state === 'hide' && e.t <= 0) { e.state = 'aim'; e.t = e.A.aim[0]; e.decided = false; e.threat = null; e.shots = 1; e.exposeLeft = 1; }
  else if (e.state === 'aim') { if (!e.decided) { e.decided = true; decideFire(sim, e); } if ((e.threat && e.threat.done) || (!e.threat && e.t <= 0)) { e.state = 'fire'; e.t = 0; } }
  else if (e.state === 'fire') { sim.emit('eshot', { id: e.id, at: muzzle(e), kind: 'zap', target: e.target }); e.state = 'hide'; e.t = sim.rng('ai').range(1.4, 2.4); }
}

// ---- jet skis: race a water path; the rider fires a pistol on the way
function jetskiAI(sim, e, dt) {
  e.pd += e.speed * dt; const L = e.path.length; if (e.pd >= L) { e.gone = true; sim.emit('fled', { id: e.id }); return; }
  const a = e.path.at(e.pd), b = e.path.at(Math.min(L, e.pd + 6));
  e.x = a.x; e.y = a.y; e.z = (sim.water > -1e8 ? sim.water : a.z) + 6 + Math.sin(sim.t * 9 + e.id) * 1.2; e.ski = { yaw: Math.atan2(b.y - a.y, b.x - a.x) };
  e.up = 1; e.facing = faceTarget(sim, e); e.t -= dt;
  if (e.state === 'enter' || e.state === 'hide') { if (e.state === 'enter') { e.state = 'hide'; e.t = .8; } if (e.t <= 0) { e.state = 'aim'; e.t = e.A.aim[0]; e.decided = false; e.threat = null; e.shots = e.A.burst; e.exposeLeft = 1; } }
  else if (e.state === 'aim') { e.point = true; if (!e.decided) { e.decided = true; decideFire(sim, e); } if ((e.threat && e.threat.done) || (!e.threat && e.t <= 0)) { e.state = 'fire'; e.t = 0; } }
  else if (e.state === 'fire') { if (e.t <= 0 && e.shots > 0) { fireShot(sim, e); e.shots--; e.t = e.A.gap; } if (e.shots <= 0) { e.state = 'hide'; e.t = 1.6; e.point = false; } }
}

// ---- captors: hold the hostage, show the head in short windows
function captorAI(sim, e, dt) {
  e.t -= dt; e.facing = faceTarget(sim, e);
  if (e.state === 'hide' || e.state === 'enter' || e.state === 'peek') { e.up = approach(e.up, 0, dt / .15); if (e.t <= 0 && e.state !== 'peek') { e.state = 'peek'; e.t = .2; e.side = sim.rng('ai')() < .5 ? -1 : 1; } if (e.state === 'peek' && e.t <= 0) { e.state = 'aim'; e.t = e.A.expose[0]; e.decided = false; e.threat = null; } return; }
  if (e.state === 'aim') {
    e.up = approach(e.up, 1, dt / .1); e.point = true;
    if (!e.decided) { e.decided = true; e.threat = TC.requestThreat(sim, { src: e.id, target: e.target, dur: e.A.tele * tune.enemy.teleMul * sim.diff.teleMul, kind: 'elite', at: muzzle(e), always: true }); }
    if (e.threat && e.threat.done) { sim.emit('eshot', { id: e.id, at: muzzle(e), kind: 'pistol', target: e.target }); e.state = 'hide'; e.t = sim.rng('ai').range(...e.A.hide); }
  }
}
// ---- training cut-outs: flip up, stay, flip down; never fire
function cutoutAI(sim, e, dt) {
  e.t -= dt; e.facing = faceTarget(sim, e);
  if (e.state === 'enter' || e.state === 'hide') { e.up = approach(e.up, 0, dt / .2); if (e.t <= 0) { e.state = 'peek'; e.t = sim.rng('ai').range(...e.A.expose) * (e.o.stay || 1); } }
  else { e.up = approach(e.up, 1, dt / .15); if (e.t <= 0 && !e.o.stay) { e.state = 'hide'; e.t = sim.rng('ai').range(...e.A.hide); } }
}
// ---- the range's turret robot: three telegraphed shots, a few seconds apart
function turretAI(sim, e, dt) {
  e.t -= dt; e.up = 1; e.facing = faceTarget(sim, e);
  if (e.state === 'enter') { e.state = 'hide'; e.t = 1.5; }
  if (e.state === 'hide' && e.t <= 0 && (e.fired || 0) < (e.o.shots || 3)) { e.state = 'aim'; e.threat = TC.requestThreat(sim, { src: e.id, target: 0, dur: 1.1, kind: 'shot', at: [e.x, e.y, e.z + 12], always: true }); }
  if (e.state === 'aim' && e.threat && e.threat.done) { sim.emit('eshot', { id: e.id, at: [e.x, e.y, e.z + 12], kind: 'zap', target: 0 }); e.fired = (e.fired || 0) + 1; e.state = 'hide'; e.t = 2.2; if (e.fired >= (e.o.shots || 3)) { e.done = true; } }
}

// ---------------------------------------------------------------- damage, reactions, death
function damageEnemy(sim, e, dmg, o = {}) {
  if (e.dead) return;
  if (o.part === 'ski') { e.skiHp -= dmg; sim.emit('impact', { at: o.at, surf: 'metal' }); if (o.p) { sim.addScore(o.p, 100, o.at, 'hit'); sim.chainUp(o.p); } if (e.skiHp <= 0) { sim.emit('explode', { at: [e.x, e.y, e.z], size: 1.2 }); if (o.p) sim.addScore(o.p, 1000, o.at, 'ski'); killEnemy(sim, e, Object.assign({}, o, { style: 'flyback' })); } return; }
  if (e.A.ai === 'turret') { sim.emit('impact', { at: o.at, surf: 'metal' }); return; }
  if (e.o.civ) { if (o.p && !(e.hitT > sim.t)) { e.hitT = sim.t + .5; o.p.stats.civ++; sim.addScore(o.p, -5000, o.at, 'civ'); sim.emit('civhit', { p: o.p.i, at: o.at }); sim.say('juno', "That's a civilian! Don't shoot!"); } return; }
  e.hp -= dmg; e.flashT = .06; e.hurtT = .25;
  sim.emit('hit', { id: e.id, p: o.p ? o.p.i : -1, part: o.part, at: o.at, head: o.part === 'head' });
  if (o.p) { sim.addScore(o.p, 100, null, 'hit'); sim.chainUp(o.p); }
  if ((o.part === 'legs' || o.w === 'sg') && e.hp > 0 && !e.A.fly) { const a = Math.atan2(o.dir ? o.dir[1] : 0, o.dir ? o.dir[0] : 1); e.vel = [Math.cos(a) * 45, Math.sin(a) * 45, 0]; e.stag = .35; if (e.state === 'aim' || e.state === 'fire') { e.state = 'hide'; e.t = .8; if (e.threat && !e.threat.done) TC.cancelThreat(sim, e.threat); } }
  if (e.A.ai === 'rusher' && o.w === 'sg' && e.hp > 0) { e.state = 'back'; e.t = 1; e.stag = .5; const a = e.facing + Math.PI; e.vel = [Math.cos(a) * 110, Math.sin(a) * 110, 0]; if (e.threat && !e.threat.done) TC.cancelThreat(sim, e.threat); }
  if (e.hp <= 0) killEnemy(sim, e, o);
}
TC.damageEnemy = damageEnemy;
function shieldHit(sim, e, o) {
  if (o.w === 'sg' || o.w === 'gl') { e.shieldDown = 1.5; sim.emit('shieldknock', { id: e.id }); if (o.p) { sim.addScore(o.p, 100, null, 'hit'); sim.chainUp(o.p); } }
}
TC.shieldHit = shieldHit;
function killEnemy(sim, e, o = {}) {
  if (e.dead) return;
  e.dead = true; e.deadT = 0; e.point = false; e.state = 'dead';
  if (e.cover) e.cover.busy = Math.max(0, e.cover.busy - 1);
  if (e.threat && !e.threat.done) TC.cancelThreat(sim, e.threat);
  for (const t of sim.threats) if (t.src === e.id && !t.done) TC.cancelThreat(sim, t);
  const p = o.p; let style = o.style || 'crumple';
  if (!o.style) { if (e.A.fly) style = 'drop'; else if (o.w === 'sg' || o.blast) style = 'flyback'; else if (o.w === 'mg') style = 'spin'; else if (e.z > (sim.ground || 0) + 30 && e.cover && e.cover.ledge) style = 'fall'; else if (e.A.ai === 'jetski' || (sim.water > -1e8 && e.z <= sim.water + 8)) style = 'splash'; else if (o.part === 'head') style = 'head'; }
  e.death = style; e.vel = [0, 0, 0];
  if (style === 'flyback') { const a = o.dir ? Math.atan2(o.dir[1], o.dir[0]) : e.facing + Math.PI; e.vel = [Math.cos(a) * 120, Math.sin(a) * 120, 90]; }
  if (style === 'fall') { e.vel = [Math.cos(e.facing) * 30, Math.sin(e.facing) * 30, 40]; }
  if (style === 'drop') e.vel = [0, 0, -10];
  sim.emit('kill', { id: e.id, kind: e.type, p: p ? p.i : -1, at: [e.x, e.y, e.z + 18], style, head: o.part === 'head', ally: !!o.ally });
  sim.killsInScene = (sim.killsInScene || 0) + 1;
  if (e.hostage) { e.hostage.freed = true; sim.emit('rescue', {}); sim._cue('rescue'); }
  if (p) {
    p.stats.kills++;
    let pts = e.A.score; sim.addScore(p, pts, [e.x, e.y, e.z + 30], 'kill');
    if (o.part === 'head') { p.stats.heads++; sim.addScore(p, 500, null, 'head'); sim.emit('headshot', { p: p.i, at: o.at }); }
    if (e.exposedT < .7 && e.exposedT > 0 || e.state === 'enter') { p.stats.quick++; sim.addScore(p, 500, null, 'quick'); }
    if (e.A.elite) { sim.timer += tune.time.eliteBonus; sim.emit('extend', { s: tune.time.eliteBonus }); }
    const drop = e.drop || (e.A.ai === 'runner' ? 'mg' : null);
    if (drop) { const w = get('weapon', drop); sim.giveAmmo(p, drop, w.pick); }
  }
  if (e.A.fly) sim.emit('explode', { at: [e.x, e.y, e.z], size: .6 });
}
TC.killEnemy = killEnemy;
function deathStep(sim, e, dt) {
  if (e.death === 'flyback' || e.death === 'fall' || e.death === 'drop') {
    e.x += e.vel[0] * dt; e.y += e.vel[1] * dt; e.z += e.vel[2] * dt; e.vel[2] -= 300 * dt; e.vel[0] *= .96; e.vel[1] *= .96;
    const g = e.A.fly ? (sim.ground || 0) : e.groundZ !== undefined ? e.groundZ : (e.death === 'fall' ? (sim.ground || 0) : (e.cover ? e.cover.at[2] : 0) - (e.death === 'fall' ? 999 : 0));
    const floor = e.death === 'fall' ? Math.max(sim.water > -1e8 ? sim.water - 30 : -999, sim.ground || 0) : (e.from ? e.from[2] : g);
    if (e.z < floor) { e.z = floor; e.vel = [0, 0, 0]; if (sim.water > -1e8 && floor <= sim.water) { if (!e.splashed) { e.splashed = true; sim.emit('splash', { at: [e.x, e.y, sim.water] }); } } }
  }
  if (e.death === 'splash') { e.z -= dt * 14; if (!e.splashed) { e.splashed = true; sim.emit('splash', { at: [e.x, e.y, sim.water > -1e8 ? sim.water : e.z] }); } }
}
