/* 21-enemies: the enemy roster (def('enemy', ...)) and their behaviour: entries (stand, run, jump, rappel, door, vault,
 * roll, vehicle), hide <-> peek (up over low cover, a side step from tall cover, over a shield), aim and the fire plan
 * through the ThreatDirector, relocation, reactions, the five death styles, corpses; the special AIs (quartermaster,
 * rusher, shield, sniper, grenadier, rocketeer, drone, jet ski, mounted gunner, captor and hostage, civilians, allies).
 * Hit volumes are rebuilt from the rig's joints every step (rig.update runs headless, so they are deterministic). */
const SKIN = ['#e8b894', '#c8906a', '#a0704a', '#6a4430', '#f0c8a8'];
const HAIR = ['#2a2018', '#4a3020', '#1a1a1e', '#6a4a2a', '#8a7a6a'];
function lookFor(sim, def0) {
  const L = def0.look || {}, R = () => sim.rng('look');
  const colors = Object.assign({ skin: SKIN[R() * SKIN.length | 0], hair: HAIR[R() * HAIR.length | 0] }, L.colors || {});
  return Object.assign({ size: 1, build: 'heroic', outfit: 'shirt', sleeves: 'long' }, L, { colors });
}
function makeRig(sim, opts) { const r = new E.Humanoid(opts); r.t = sim.rng('rig') * 10; return r; }
TC.makeRig = makeRig;

/* ---- the roster ---- */
const ENEMY = (id, spec) => def('enemy', id, Object.assign({ hp: 1, score: 1000, ai: 'gunner', expose: [1.4, 2.2], burst: 3, gap: .12, threat: [.25, .32, .4], tele: 1.1, aim: [.35, .6], hide: [.7, 1.5], cycles: [2, 4], speed: 110 }, spec));
ENEMY('deckhand', { name: 'Deckhand', look: { weapon: 'rifle', hat: { style: 'cap', color: '#22283a' }, colors: { cloth: '#2a3454', pants: '#34363e', boot: '#1a1a1e', metal: '#2e3038', belt: '#3a2a1a' } } });
ENEMY('marine', { name: 'Marine', hp: 2, score: 1500, expose: [1.6, 2.4], burst: 4, threat: [.35, .35, .4], tele: .95, look: { weapon: 'rifle', armor: true, hat: { style: 'helmet', color: '#4a563a' }, colors: { cloth: '#4e5a3e', pants: '#3e4632', plate: '#5e6a4a', boot: '#2a2a22', metal: '#2a2c30' }, size: 1.05 } });
ENEMY('redtide', { name: 'Red Tide', hp: 2, score: 3000, elite: true, expose: [.9, 1.3], burst: 2, threat: [1, 1, 1], always: true, tele: .55, aim: [.2, .3], look: { weapon: 'smg', outfit: 'coat', hat: { style: 'cap', color: '#7a0c12' }, colors: { coat: '#b81e24', cloth: '#7a1418', pants: '#2a1a1e', boot: '#140c0e', skin: '#3a3036', hair: '#1a1416', trim: '#e8c040', metal: '#1e1e24' } } });
ENEMY('quartermaster', { name: 'Quartermaster', ai: 'runner', score: 2000, speed: 95, look: { weapon: 'gun', armor: true, hat: { style: 'cap', color: '#f2c12e' }, colors: { cloth: '#ff7a1a', plate: '#ff8a2a', pants: '#3a4a5a', metal: '#3a3a40' } } });
ENEMY('grenadier', { name: 'Grenadier', hp: 2, score: 2000, ai: 'thrower', expose: [1.2, 1.4], look: { build: 'bulky', weapon: null, hat: { style: 'cap', color: '#3a3a2a' }, colors: { cloth: '#4a4a36', pants: '#3a3a30', belt: '#5a4020' } } });
ENEMY('rocketeer', { name: 'Rocketeer', hp: 2, score: 2500, ai: 'rocket', expose: [2.2, 2.6], look: { weapon: 'launcher', hat: { style: 'helmet', color: '#3a4048' }, colors: { cloth: '#3a4250', pants: '#2a2e36', metal: '#4a5a4a' } } });
ENEMY('shield', { name: 'Shield', hp: 3, score: 3000, ai: 'shield', burst: 3, threat: [.4, .4, .45], tele: .9, speed: 40, look: { build: 'bulky', size: 1.05, weapon: 'smg', armor: true, hat: { style: 'helmet', color: '#2a3040' }, colors: { cloth: '#2a3040', plate: '#3a4252', pants: '#22262e', metal: '#1e2026' } } });
ENEMY('rusher', { name: 'Rusher', hp: 1.5, score: 2000, ai: 'rusher', speed: 150, tele: .45, look: { weapon: 'cutlass', sleeves: 'none', hat: { style: 'band', color: '#c8282a' }, colors: { cloth: '#d8d4c8', pants: '#3a3430', metal: '#c8ccd4' } } });
ENEMY('sniper', { name: 'Sniper', score: 3000, elite: true, ai: 'sniper', tele: 1.4, look: { weapon: 'sniper', outfit: 'coat', hood: true, colors: { coat: '#5a6066', cloth: '#4a5056', hair: '#4a5056', pants: '#34383c' } } });
ENEMY('drone', { name: 'Drone', hp: 2, score: 1500, ai: 'drone', threat: [.3, .3, .3], tele: .9, mesh: 'drone' });
ENEMY('jetski', { name: 'Jet ski', hp: 1, score: 1500, ai: 'jetski', threat: [.3, .3, .3], tele: 1, look: { weapon: 'gun', colors: { cloth: '#2a3454', pants: '#2a2e3a' } } });
ENEMY('gunner', { name: 'Gunner', hp: 3, score: 2500, ai: 'turret', burst: 6, gap: .09, threat: [.5, .5, .5], tele: 1, expose: [2.4, 3], look: { weapon: 'minigun', hat: { style: 'helmet', color: '#3a3e44' }, colors: { cloth: '#3a4250', pants: '#2a2e36' } } });
ENEMY('captor', { name: 'Captor', hp: 1, score: 5000, ai: 'captor', always: true, tele: .8, look: { weapon: 'gun', outfit: 'coat', hat: { style: 'cap', color: '#7a0c12' }, colors: { coat: '#b81e24', cloth: '#7a1418', pants: '#2a1a1e', skin: '#3a3036' } } });
ENEMY('civilian', { name: 'Civilian', ai: 'civilian', score: -5000, civ: true });
ENEMY('ally', { name: 'Ally', ai: 'ally', ally: true });
TC.ENEMY = ENEMY;

const CIV_LOOKS = [
  { outfit: 'shirt', sleeves: 'short', hair: 'ponytail', colors: { cloth: '#e85a8a', pants: '#3a4a7a' } },
  { outfit: 'shirt', sleeves: 'short', hair: 'short', colors: { cloth: '#5ac8e8', pants: '#e8dcc0' } },
  { outfit: 'coat', hat: { style: 'cap', color: '#f2c12e' }, colors: { coat: '#f2c12e', cloth: '#d8a820', pants: '#2a3a5a' } },
  { outfit: 'robe', hair: 'long', colors: { cloth: '#ffd36a', pants: '#a83a3a' } },
  { outfit: 'shirt', sleeves: 'long', hat: { style: 'cap', color: '#3a6a9a' }, colors: { cloth: '#6a8aaa', pants: '#3a3a44' } }
];

/* ---- spawning ---- */
function spawnEnemy(sim, type, coverId, o = {}) {
  const D = reg('enemy', type); if (!D) throw new Error('unknown enemy ' + type);
  const sc = sim.scene, cv = coverId ? sc.coversById[coverId] : null;
  const e = { id: sim.nid(), type, D, hp: D.hp * (D.civ || D.ally ? 1 : tune.enemy.hpMul * sim.diff.hp), alive: true, state: 'enter', st: 0, x: 0, y: 0, z: 0, dz: 0, facing: 0, vx: 0, vy: 0,
    target: -1, exposed: false, expT: 0, cycles: 0, flash: 0, hurtT: 0, stag: null, wave: o.wave, o, cover: cv, deathT: 0, alpha: 1, entry: o.entry || (cv ? 'stand' : 'run'), mesh: D.mesh || null, civ: !!D.civ, ally: !!D.ally, elite: !!D.elite, drop: o.drop || null };
  e.hp0 = e.hp;
  if (!D.mesh) {
    const look = D.civ ? Object.assign({ size: 1, build: sim.rng('look') < .5 ? 'heroic' : 'chibi', weapon: null }, CIV_LOOKS[o.look !== undefined ? o.look : sim.rng('look') * CIV_LOOKS.length | 0]) : D.ally ? reg('speaker', o.who).rig : lookFor(sim, D);
    if (D.civ) look.colors = Object.assign({ skin: SKIN[sim.rng('look') * 5 | 0], hair: HAIR[sim.rng('look') * 5 | 0] }, look.colors);
    e.rig = makeRig(sim, look);
  }
  if (cv) { e.hide = cv.at.slice(); e.face = cv.face; }
  const from = o.from || (cv ? cv.at : o.route ? o.route[0] : [0, 0, 0]);
  e.x = from[0]; e.y = from[1]; e.z = from[2] || 0;
  if (e.entry === 'stand' && cv) { e.state = 'hide'; e.st = 0; e.hideFor = .3 + sim.rng('ai') * .8; e.dz = duckDz(e); }
  if (e.entry === 'rappel' && cv) { e.x = cv.at[0]; e.y = cv.at[1]; e.z = cv.at[2] + (o.ropeH || 72); e.rope = [cv.at[0], cv.at[1], e.z + 6]; }
  if (e.entry === 'jump' && cv && !o.from) { e.x = cv.at[0] - Math.cos(cv.face) * 30; e.y = cv.at[1] - Math.sin(cv.face) * 30; e.z = cv.at[2] + 40; }
  e.route = o.route || null; e.ri = 0;
  e.facing = cv ? cv.face : (o.facing !== undefined ? o.facing : Math.atan2(sim.focus()[1] - e.y, sim.focus()[0] - e.x));
  if (D.ai === 'drone') { e.center = from.slice(); e.orbit = o.orbit || 60; e.ph = sim.rng('ai') * TAU; e.hp = D.hp * tune.enemy.hpMul; }
  if (D.ai === 'jetski') { e.path = new E.Path(o.route, { smooth: 'catmull' }); e.d = 0; e.speed = o.speed || 150; e.skiHp = 3; e.rig.o.size = 1; }
  if (D.ai === 'captor') { e.hostage = makeRig(sim, reg('speaker', o.hostage || 'tejada').rig); e.state = 'hold'; e.side = o.side || 1; }
  if (D.ai === 'civilian') { e.state = 'flee'; e.ri = 0; }
  if (D.ai === 'ally') { e.state = 'stand'; }
  if (D.ai === 'shield') { e.shieldOn = true; e.shieldOff = 0; }
  if (o.carrier) { e.carrier = o.carrier; e.local = o.local || [0, 0, 0]; }
  sim.enemies.push(e);
  sim.ev({ type: 'spawn', e: e.id, kind: type });
  if (sim.dir) sim.dir.cue('spawn:' + type);
  if (o.say) sim.say(o.say[0], o.say[1]);
  return e;
}
TC.spawnEnemy = spawnEnemy;

/** how far a hiding enemy sinks so its head stays under its cover's top (feet hide behind the cover) */
function duckDz(e) { const cv = e.cover; if (!cv || cv.h >= 34 || !e.rig) return 0; const top = 26.5 * e.rig.o.size; return Math.min(0, (cv.h - 3) - top); }
/** the side direction (unit, ground) for a side peek */
function sideDir(face, s) { return [-Math.sin(face) * s, Math.cos(face) * s]; }

/* ---- per-step update ---- */
function enemiesStep(sim, dt) {
  for (const e of sim.enemies) {
    e.st += dt; e.flash = Math.max(0, e.flash - dt * 8); e.hurtT = Math.max(0, e.hurtT - dt);
    if (e.carrier) {
      const C = sim.carriers[e.carrier];
      if (e.entry === 'rappel' && e.rz !== 0 && e.alive) { e.rz = (e.rz === undefined ? (e.o.ropeH || 60) : e.rz) - 40 * dt; e.climb = e.rz > 0; e.state = 'enter'; e.exposed = true; if (e.rz <= 0) { e.rz = 0; e.climb = false; e.state = 'peek'; e.st = .3; e.peekMode = 'up'; } }
      if (C && C.M) { const w = xform(C.M, [e.local[0], e.local[1], e.local[2] + (e.rz || 0)]); e.x = w[0]; e.y = w[1]; e.z = w[2]; if (e.rz > 0) e.rope = [e.x, e.y, e.z + 60]; else e.rope = null; }
    }
    if (!e.alive) { deadStep(sim, e, dt); }
    else if (e.carrier && e.entry === 'rappel' && e.rz > 0) { faceTarget(sim, e); }
    else {
      if (e.stag) { e.x += e.stag[0] * dt; e.y += e.stag[1] * dt; e.stag[0] *= Math.pow(.02, dt); e.stag[1] *= Math.pow(.02, dt); if (Math.hypot(e.stag[0], e.stag[1]) < 4) e.stag = null; }
      (AI[e.D.ai] || AI.gunner)(sim, e, dt);
      if (e.exposed) e.expT += dt; else e.expT = 0;
    }
    if (e.rig) {
      poseRig(sim, e, dt);
      rigVols(e);
      if (e.hostage) { const s = sideDir(e.facing, 1); e.hostage.update(dt, { x: e.x + Math.cos(e.facing) * 7, y: e.y + Math.sin(e.facing) * 7, z: e.z, facing: e.facing, expr: 'wince', pose: e.alive ? null : 'cheer' }); e.hvols = volsOf(e.hostage); void s; }
    } else meshVols(sim, e);
  }
  sim.enemies = sim.enemies.filter(e => !e.gone);
}
TC.enemiesStep = enemiesStep;

/* ---- moving and facing ---- */
function moveTo(e, p, speed, dt) {
  const dx = p[0] - e.x, dy = p[1] - e.y, dz = (p[2] || 0) - e.z, d = Math.hypot(dx, dy);
  if (d < speed * dt + .5) { e.x = p[0]; e.y = p[1]; e.z = p[2] || 0; e.vx = e.vy = 0; return true; }
  e.vx = dx / d * speed; e.vy = dy / d * speed; e.x += e.vx * dt; e.y += e.vy * dt; e.z += dz * Math.min(1, dt * 8);
  e.facing = Math.atan2(dy, dx); return false;
}
function faceTarget(sim, e) {
  if (e.target < 0 || !sim.players[e.target] || sim.players[e.target].out) e.target = pickTarget(sim, [e.x, e.y]);
  if (e.target < 0) return null;
  const c = sim.cameraFor(e.target); e.facing = Math.atan2(c.y - e.y, c.x - e.x);
  e.aimA = Math.atan2(c.z - (e.z + e.dz + 22), Math.hypot(c.x - e.x, c.y - e.y));
  return c;
}
function muzzle(e) { if (e.rig) return e.rig.tip(); return [e.x, e.y, e.z]; }
TC.muzzle = muzzle;
function threatChance(sim, e) { const t = e.D.threat; return t[Math.min(t.length - 1, (sim.stageNum || 1) - 1)]; }
/** an enemy shot that misses: a tracer past the camera, never through the reticle */
function missShot(sim, e, from) {
  const p = sim.players[e.target]; if (!p) return;
  const c = sim.cameraFor(e.target), side = sim.rng('miss') < .5 ? -1 : 1, off = 8 + sim.rng('miss') * 22;
  const r = [-Math.sin(c.yaw), Math.cos(c.yaw)];
  const to = [c.x + r[0] * side * off + Math.cos(c.yaw) * 20, c.y + r[1] * side * off + Math.sin(c.yaw) * 20, c.z + (sim.rng('miss') - .3) * 18];
  sim.ev({ type: 'eshot', from: from || muzzle(e), to, p: e.target, miss: true, e: e.id, kind: e.type });
}
function fireAt(sim, e, threatHit) { sim.ev({ type: 'eshot', from: muzzle(e), to: null, p: e.target, miss: !threatHit, e: e.id, kind: e.type, impact: !!threatHit }); }

/* ---- the AIs ---- */
const AI = {};
TC.AI = AI;
/** the common gunner: enter, hide, peek, aim (a threat or a miss), fire, hide again, relocate */
AI.gunner = (sim, e, dt) => {
  const D = e.D, react = tune.enemy.reactMul * sim.diff.react;
  switch (e.state) {
    case 'enter': {
      if (enterStep(sim, e, dt)) { e.state = e.entry === 'rappel' ? 'peek' : 'hide'; e.st = 0; e.hideFor = (.2 + sim.rng('ai') * .5) * react; if (e.entry === 'rappel') { e.peekMode = 'up'; e.st = .3; } }
      e.exposed = true; break;
    }
    case 'hide': {
      e.exposed = false; e.dz += (duckDz(e) - e.dz) * Math.min(1, dt * 14);
      if (e.cover) { e.x += (e.hide[0] - e.x) * Math.min(1, dt * 12); e.y += (e.hide[1] - e.y) * Math.min(1, dt * 12); }
      faceTarget(sim, e);
      if (e.st >= e.hideFor) {
        const cyc = D.cycles; e.cycles++;
        const alt = e.cover && e.cycles >= cyc[0] + (sim.rng('ai') * (cyc[1] - cyc[0] + 1) | 0) ? freeCover(sim, e) : null;
        if (alt) { releaseCover(sim, e); e.cover = alt; alt.taken = e.id; e.hide = alt.at.slice(); e.state = 'relocate'; e.st = 0; e.cycles = 0; break; }
        const peeks = e.cover ? e.cover.peek : ['up'];
        e.peekMode = peeks[sim.rng('ai') * peeks.length | 0];
        e.state = 'peek'; e.st = 0;
      }
      break;
    }
    case 'relocate': { e.dz += (0 - e.dz) * Math.min(1, dt * 10); e.exposed = true; if (moveTo(e, e.hide, D.speed, dt)) { e.state = 'hide'; e.st = 0; e.hideFor = .3 * react; } break; }
    case 'peek': {
      const k = Math.min(1, e.st / .22);
      const target = peekSpot(e);
      e.x += (target[0] - e.x) * Math.min(1, dt * 16); e.y += (target[1] - e.y) * Math.min(1, dt * 16); e.dz += (0 - e.dz) * Math.min(1, dt * 16);
      faceTarget(sim, e);
      if (k > .5) e.exposed = true;
      if (k >= 1) { e.state = 'aim'; e.st = 0; e.aimFor = (D.aim[0] + sim.rng('ai') * (D.aim[1] - D.aim[0])) * react; e.burstLeft = D.burst; e.expFor = (D.expose[0] + sim.rng('ai') * (D.expose[1] - D.expose[0])) * tune.enemy.fireMul; e.th = requestThreat(sim, e.target, { chance: threatChance(sim, e), always: D.always, tele: D.tele, kind: e.type, src: e.id, pos: () => muzzle(e) }); if (e.th) e.th.srcAlive = () => e.alive && !e.stunned; }
      break;
    }
    case 'aim': {
      faceTarget(sim, e);
      const ready = e.th ? sim.t >= e.th.T - .02 : e.st >= e.aimFor;
      if (ready) { if (e.th) fireAt(sim, e, true); else missShot(sim, e); e.burstLeft--; e.th = null; e.state = 'fire'; e.st = 0; }
      break;
    }
    case 'fire': {
      faceTarget(sim, e);
      if (e.burstLeft > 0 && e.st >= D.gap * tune.enemy.fireMul) { missShot(sim, e); e.burstLeft--; e.st = 0; }
      if (e.burstLeft <= 0 && e.st > .25) { e.state = e.cover ? 'hide' : 'aimagain'; e.st = 0; e.hideFor = (D.hide[0] + sim.rng('ai') * (D.hide[1] - D.hide[0])) * react; }
      break;
    }
    case 'aimagain': { if (e.st > .6 * react) { e.state = 'peek'; e.st = .3; } break; }
    case 'hit': { if (e.st > .25) { e.state = e.after || 'hide'; e.st = 0; e.hideFor = .4; } break; }
  }
};
function peekSpot(e) {
  if (!e.cover) return [e.x, e.y, e.z];
  const m = e.peekMode, at = e.hide;
  if (m === 'left' || m === 'right') { const s = sideDir(e.cover.face, m === 'left' ? -12 : 12); return [at[0] + s[0], at[1] + s[1], at[2]]; }
  return at;
}
function freeCover(sim, e) {
  const all = sim.scene.coverList.filter(c => !c.taken && c !== e.cover && !c.noRelocate && Math.hypot(c.at[0] - e.x, c.at[1] - e.y) < 220 && Math.abs(c.at[2] - e.z) < 8);
  return all.length ? all[sim.rng('ai') * all.length | 0] : null;
}
function releaseCover(sim, e) { if (e.cover && e.cover.taken === e.id) e.cover.taken = 0; }
/** an entry: returns true when it reaches its cover */
function enterStep(sim, e, dt) {
  const cv = e.cover, to = e.hide || (cv ? cv.at : [e.x, e.y, e.z]), en = e.entry;
  if (en === 'stand') return true;
  if (en === 'rappel') { e.climb = true; e.z = Math.max(to[2], e.z - 48 * dt); e.facing = cv ? cv.face : e.facing; if (e.z <= to[2] + .01) { e.climb = false; e.rope = null; return true; } return false; }
  if (en === 'jump') {
    if (!e.jump) e.jump = { from: [e.x, e.y, e.z], t: 0, dur: .75 };
    const J = e.jump; J.t += dt; const u = Math.min(1, J.t / J.dur);
    e.x = lerp(J.from[0], to[0], u); e.y = lerp(J.from[1], to[1], u); e.z = lerp(J.from[2], to[2], u) + Math.sin(u * Math.PI) * 18; e.air = u < 1; e.facing = Math.atan2(to[1] - J.from[1], to[0] - J.from[0]);
    if (u >= 1) { e.air = false; e.land = 1; return true; } return false;
  }
  if (en === 'vault' || en === 'roll') {
    const d = Math.hypot(to[0] - e.x, to[1] - e.y);
    if (en === 'vault') { e.air = d < 40 && d > 4; e.dz = e.air ? Math.sin((1 - d / 40) * Math.PI) * 14 : 0; }
    else e.flip = d < 44 ? clamp(1 - d / 44, 0, 1) : 0;
    const arrived = moveTo(e, to, e.D.speed * (en === 'roll' ? 1.2 : 1), dt);
    if (arrived) { e.air = false; e.flip = 0; e.dz = 0; } return arrived;
  }
  return moveTo(e, to, e.D.speed, dt);   // run, door, vehicle
}

/** the quartermaster: runs a route across the area carrying ammo; drops it when shot; escapes at the end */
AI.runner = (sim, e, dt) => {
  e.exposed = true;
  if (e.state === 'enter') { e.state = 'route'; e.ri = 1; }
  if (e.state === 'route') {
    if (e.o.wait && e.ri === 1 && e.st < e.o.wait) { faceTarget(sim, e); return; }
    const p = e.route[e.ri]; if (!p) { e.gone = true; sim.ev({ type: 'escape', e: e.id }); return; }
    if (moveTo(e, p, e.D.speed, dt)) e.ri++;
    if (sim.rng('ai') < dt * .3) { faceTarget(sim, e); missShot(sim, e); }
  }
};
/** the rusher: sprints in zigzagging, winds up a slash at the target's cover (cover blocks it), staggers back, repeats */
AI.rusher = (sim, e, dt) => {
  const c = faceTarget(sim, e); if (!c) return;
  const stand = sim.slotGround(e.target), fwd = [Math.cos(c.yaw), Math.sin(c.yaw)], spot = [stand[0] + fwd[0] * 30, stand[1] + fwd[1] * 30, stand[2]];
  e.exposed = true;
  switch (e.state) {
    case 'enter': case 'charge': {
      e.state = 'charge'; const dist = Math.hypot(spot[0] - e.x, spot[1] - e.y), zig = Math.sin(e.st * 4 + e.id) * 30 * Math.min(1, dist / 140);
      const side = sideDir(c.yaw, zig), aimP = [spot[0] + side[0], spot[1] + side[1], spot[2]];
      e.sprint = true;
      if (moveTo(e, aimP, e.D.speed * (dist > 120 ? 1 : .75), dt) || dist < 10) {
        e.sprint = false; e.th = requestThreat(sim, e.target, { always: true, tele: e.D.tele, kind: 'slash', src: e.id, pos: () => e.rig.hand(), onResolve: r => { e.slashRes = r; } });
        if (e.th) { e.state = 'wind'; e.st = 0; e.th.srcAlive = () => e.alive && e.state === 'wind'; } else { e.state = 'circle'; e.st = 0; }
        if (!sim.flag('rusher')) sim.cue('rusher');
      }
      break;
    }
    case 'circle': { e.sprint = false; const side = sideDir(c.yaw, Math.sin(e.st * 2 + e.id) * 40); moveTo(e, [spot[0] + fwd[0] * 50 + side[0], spot[1] + fwd[1] * 50 + side[1], spot[2]], 50, dt); faceTarget(sim, e); if (e.st > 1.2) { e.state = 'charge'; e.st = 0; } break; }
    case 'wind': { faceTarget(sim, e); e.atk = { spec: 'overhead', u: Math.min(1, e.st / Math.max(.1, e.th ? e.th.dur : .45)), phase: 'wind' }; if (e.th && e.th.done) { e.atk = { spec: 'overhead', u: 0, phase: 'active' }; e.state = 'slash'; e.st = 0; sim.ev({ type: 'slash', e: e.id, p: e.target, res: e.th.result }); } break; }
    case 'slash': { e.atk = { spec: 'overhead', u: Math.min(1, e.st / .18), phase: e.st < .18 ? 'active' : 'recover' }; if (e.st > .4) { e.atk = null; e.state = 'stagger'; e.st = 0; e.stag = [-fwd[0] * 60, -fwd[1] * 60]; } break; }
    case 'stagger': { e.atk = null; e.hurtT = .2; if (e.st > 1.0) { e.state = 'back'; e.st = 0; } break; }
    case 'back': { e.atk = null; moveTo(e, [spot[0] + fwd[0] * 150, spot[1] + fwd[1] * 150, spot[2]], 110, dt); e.facing = Math.atan2(c.y - e.y, c.x - e.x); if (e.st > 1.2) { e.state = 'charge'; e.st = 0; } break; }
    case 'hit': { e.atk = null; if (e.st > .3) { e.state = 'back'; e.st = .3; } break; }
  }
};
/** the shield trooper: advances behind a riot shield (immune from the front), fires over it; a shotgun or grenade
 *  knocks the shield aside for 1.5 s */
AI.shield = (sim, e, dt) => {
  e.shieldOff = Math.max(0, e.shieldOff - dt); e.shieldOn = e.shieldOff <= 0;
  const D = e.D;
  if (e.state === 'hide') { e.state = 'brace'; e.st = 0; }
  e.dz += (0 - e.dz) * Math.min(1, dt * 10);
  if (e.state === 'enter') { if (enterStep(sim, e, dt)) { e.state = 'brace'; e.st = 0; } faceTarget(sim, e); e.exposed = true; return; }
  if (e.state === 'brace') { faceTarget(sim, e); e.exposed = false; if (e.st > .9) { e.state = 'over'; e.st = 0; e.th = requestThreat(sim, e.target, { chance: threatChance(sim, e), tele: D.tele, kind: 'shield', src: e.id, pos: () => muzzle(e) }); if (e.th) e.th.srcAlive = () => e.alive && e.shieldOn; e.burstLeft = D.burst; } return; }
  if (e.state === 'over') {
    faceTarget(sim, e); e.exposed = true;
    if (e.th ? sim.t >= e.th.T - .02 : e.st > .7) { if (e.th) fireAt(sim, e, true); else missShot(sim, e); e.th = null; e.state = 'fire'; e.st = 0; e.burstLeft--; }
    return;
  }
  if (e.state === 'fire') { faceTarget(sim, e); if (e.burstLeft > 0 && e.st > D.gap) { missShot(sim, e); e.burstLeft--; e.st = 0; } if (e.burstLeft <= 0 && e.st > .3) { e.state = 'advance'; e.st = 0; const nx = e.o.advance && e.o.advance[e.adv = (e.adv || 0)]; e.advTo = nx || null; if (nx) e.adv++; } return; }
  if (e.state === 'advance') { e.exposed = false; if (!e.advTo || moveTo(e, e.advTo, D.speed, dt) || e.st > 3) { e.state = 'brace'; e.st = 0; } return; }
  if (e.state === 'hit') { if (e.st > .3) { e.state = 'brace'; e.st = 0; } }
};
/** the sniper: stands far and high; a laser converges on the target for 1.4 s (always a threat) */
AI.sniper = (sim, e, dt) => {
  if (e.state === 'enter') { if (enterStep(sim, e, dt)) { e.state = 'hide'; e.st = 0; e.hideFor = .8; } e.exposed = true; return; }
  if (e.state === 'hide') { e.exposed = false; e.dz += (duckDz(e) - e.dz) * Math.min(1, dt * 10); faceTarget(sim, e); if (e.st > e.hideFor) { e.state = 'peek'; e.st = 0; e.peekMode = (e.cover && e.cover.peek[sim.rng('ai') * e.cover.peek.length | 0]) || 'up'; } return; }
  if (e.state === 'peek') { const t = peekSpot(e); e.x += (t[0] - e.x) * Math.min(1, dt * 12); e.y += (t[1] - e.y) * Math.min(1, dt * 12); e.dz += -e.dz * Math.min(1, dt * 12); faceTarget(sim, e); if (e.st > .3) { e.exposed = true; e.state = 'laser'; e.st = 0; e.th = requestThreat(sim, e.target, { always: true, tele: e.D.tele, kind: 'sniper', src: e.id, pos: () => muzzle(e) }); if (e.th) e.th.srcAlive = () => e.alive; else { e.state = 'hide'; e.st = 0; e.hideFor = .4; } } return; }
  if (e.state === 'laser') { faceTarget(sim, e); e.exposed = true; e.laser = e.th ? clamp((sim.t - e.th.t0) / e.th.dur, 0, 1) : 0; if (!e.th || e.th.done) { if (e.th) fireAt(sim, e, true); e.laser = 0; e.th = null; e.state = 'hide'; e.st = 0; e.hideFor = 1.5 * tune.enemy.reactMul; } return; }
  if (e.state === 'relocate') { e.exposed = true; e.laser = 0; if (moveTo(e, e.hide, 70, dt)) { e.state = 'hide'; e.st = 0; e.hideFor = .6; } return; }
  if (e.state === 'hit') { e.laser = 0; if (e.st > .3) { e.state = 'hide'; e.st = 0; e.hideFor = 1; } }
};
/** the grenadier: peeks, throws a grenade that lands in front of the target's cover (a threat at landing; shoot it) */
AI.thrower = (sim, e, dt) => {
  if (e.state === 'aim') {
    faceTarget(sim, e); e.atk = { spec: 'throw', u: Math.min(1, e.st / .5), phase: e.st < .5 ? 'wind' : 'active' };
    if (e.st >= .5 && !e.thrown) { e.thrown = true; throwGrenade(sim, e); }
    if (e.st > .9) { e.atk = null; e.thrown = false; e.state = 'hide'; e.st = 0; e.hideFor = (1.6 + sim.rng('ai')) * tune.enemy.reactMul; }
    return;
  }
  if (e.state === 'peek' && e.st >= .22) { e.th = null; e.state = 'aim'; e.st = 0; e.exposed = true; return; }
  AI.gunner(sim, e, dt);
  if (e.state === 'aim' && e.th) { e.th.done = true; e.th.cancelled = true; e.th = null; }
};
function throwGrenade(sim, e) {
  const tgt = e.target; if (tgt < 0) return;
  const c = sim.cameraFor(tgt), g = sim.slotGround(tgt), land = [g[0] + Math.cos(c.yaw) * (30 + sim.rng('ai') * 30), g[1] + Math.sin(c.yaw) * (30 + sim.rng('ai') * 30), g[2]];
  const h = e.rig.hand(), T = 1.1 + sim.rng('ai') * .3;
  const pr = sim.launch({ kind: 'grenade', owner: -1, pos: h, vel: [(land[0] - h[0]) / T, (land[1] - h[1]) / T, (land[2] - h[2]) / T + .5 * 300 * T], gravity: 300, life: T + .05, r: 3.5, hp: 1, target: tgt, land, src: e.id });
  pr.th = requestThreat(sim, tgt, { always: true, tele: T, kind: 'grenade', src: pr.id, pos: () => pr.pos });
  if (pr.th) { pr.th.srcAlive = () => pr.alive; pr.T = pr.th.T; }
  if (!sim.flag('grenade')) sim.cue('grenade');
}
/** the rocketeer: aims with a glint, fires a rocket (shootable; a threat on arrival) */
AI.rocket = (sim, e, dt) => {
  if (e.state === 'aim') {
    faceTarget(sim, e); e.glint = Math.min(1, e.st / .8);
    if (e.st >= .8 && !e.fired) { e.fired = true; fireRocket(sim, e); }
    if (e.st > 1.4) { e.fired = false; e.glint = 0; e.state = 'hide'; e.st = 0; e.hideFor = (1.8 + sim.rng('ai')) * tune.enemy.reactMul; }
    return;
  }
  if (e.state === 'peek' && e.st >= .22) { e.state = 'aim'; e.st = 0; e.exposed = true; return; }
  AI.gunner(sim, e, dt);
  if (e.state === 'aim' && e.th) { e.th.done = true; e.th.cancelled = true; e.th = null; }
};
function fireRocket(sim, e) {
  const tgt = e.target; if (tgt < 0) return;
  const c = sim.cameraFor(tgt), m = muzzle(e), to = [c.x + Math.cos(c.yaw) * 14, c.y + Math.sin(c.yaw) * 14, c.z - 6], d = V3.dist(m, to), sp = 230, T = d / sp;
  const dir = V3.norm(V3.sub(to, m));
  const pr = sim.launch({ kind: 'rocket', owner: -1, pos: m, vel: V3.mul(dir, sp), gravity: 0, life: T + .1, r: 4, hp: 1, target: tgt, land: to, src: e.id });
  pr.th = requestThreat(sim, tgt, { always: true, tele: T, kind: 'rocket', src: pr.id, pos: () => pr.pos });
  if (pr.th) { pr.th.srcAlive = () => pr.alive; const k = d / Math.max(.1, pr.th.dur); pr.vel = V3.mul(dir, k); pr.life = pr.th.dur + .05; }
  sim.ev({ type: 'rocketfire', at: m });
  if (!sim.flag('rocket')) sim.cue('rocket');
}
/** the drone: a quadrotor orbiting its point, zapping (sometimes a threat) */
AI.drone = (sim, e, dt) => {
  e.exposed = true; e.ph += dt * (.8 + (e.id % 3) * .15);
  if (e.o.follow) { const C = sim.carriers[e.o.follow]; if (C && C.M) e.center = xform(C.M, e.o.local || [60, 0, 40]); }
  const c0 = e.center, R = e.orbit;
  if (e.state === 'enter') { e.state = 'fly'; e.st = 0; e.nextShot = 1.2 + sim.rng('ai') * 1.5; }
  const tx = c0[0] + Math.cos(e.ph) * R * .6, ty = c0[1] + Math.sin(e.ph * 1.3) * R, tz = c0[2] + Math.sin(e.ph * 2.1) * 12;
  e.x += (tx - e.x) * Math.min(1, dt * 3); e.y += (ty - e.y) * Math.min(1, dt * 3); e.z += (tz - e.z) * Math.min(1, dt * 3);
  faceTarget(sim, e);
  if (e.state === 'fly' && e.st > e.nextShot) { e.state = 'charge'; e.st = 0; e.th = requestThreat(sim, e.target, { chance: threatChance(sim, e), tele: e.D.tele, kind: 'drone', src: e.id, pos: () => [e.x, e.y, e.z] }); if (e.th) e.th.srcAlive = () => e.alive; }
  if (e.state === 'charge' && (e.th ? sim.t >= e.th.T - .02 : e.st > .6)) { if (e.th) fireAt(sim, e, true); else missShot(sim, e, [e.x, e.y, e.z]); e.th = null; e.state = 'fly'; e.st = 0; e.nextShot = 1.4 + sim.rng('ai') * 1.6; }
};
/** the jet ski: races a water path, its rider firing a pistol; the ski blows up after 3 hits and takes the rider */
AI.jetski = (sim, e, dt) => {
  e.exposed = true; e.d += e.speed * dt;
  if (e.d >= e.path.length) { e.gone = true; return; }
  const p = e.path.at(e.d); e.x = p.x; e.y = p.y; e.z = p.z + Math.sin(sim.t * 9 + e.id) * 1.2; e.ski = { x: p.x, y: p.y, z: p.z, yaw: p.angle };
  e.skiYaw = p.angle;
  const c = faceTarget(sim, e); void c;
  if (e.state === 'enter') { e.state = 'ride'; e.st = 0; e.nextShot = .8 + sim.rng('ai'); }
  if (e.state === 'ride' && e.st > e.nextShot) { e.state = 'aim'; e.st = 0; e.th = requestThreat(sim, e.target, { chance: threatChance(sim, e), tele: e.D.tele, kind: 'jetski', src: e.id, pos: () => muzzle(e) }); if (e.th) e.th.srcAlive = () => e.alive; }
  if (e.state === 'aim' && (e.th ? sim.t >= e.th.T - .02 : e.st > .5)) { if (e.th) fireAt(sim, e, true); else missShot(sim, e); e.th = null; e.state = 'ride'; e.st = 0; e.nextShot = 1 + sim.rng('ai') * 1.2; }
};
/** the mounted gunner: on a bridge or a truck, long bursts */
AI.turret = (sim, e, dt) => {
  if (e.state === 'enter') { if (enterStep(sim, e, dt)) { e.state = 'hide'; e.st = 0; e.hideFor = .6; } return; }
  AI.gunner(sim, e, dt);
};
/** the captor: holds Dr. Tejada; only his head shows, in short windows */
AI.captor = (sim, e, dt) => {
  e.exposed = false;
  if (e.state === 'hold') {
    faceTarget(sim, e);
    if (e.st > 1.2) { e.state = 'lean'; e.st = 0; e.th = requestThreat(sim, e.target, { always: true, tele: e.D.tele * 1.2, kind: 'captor', src: e.id, pos: () => muzzle(e) }); if (e.th) e.th.srcAlive = () => e.alive; }
  } else if (e.state === 'lean') {
    faceTarget(sim, e); e.lean = Math.min(1, e.st / .2); e.exposed = true;
    if (e.th && sim.t >= e.th.T - .02) { fireAt(sim, e, true); e.th = null; }
    if (e.st > .7 + (e.th ? Math.max(0, e.th.T - sim.t) : 0)) { e.lean = 0; e.state = 'hold'; e.st = 0; }
  } else if (e.state === 'hit') { e.state = 'hold'; }
};
/** civilians run their route and crouch with their hands over their heads */
AI.civilian = (sim, e, dt) => {
  if (e.state === 'flee') { const p = e.route && e.route[e.ri + 1]; if (!p) { e.state = 'cower'; e.st = 0; return; } e.sprint = true; if (moveTo(e, p, e.o.speed || 120, dt)) e.ri++; }
  else if (e.state === 'cower') { e.sprint = false; if (e.o.leave && e.st > e.o.leave) e.gone = true; }
};
/** allies (single player): stand at their marks, aim at the nearest live enemy, take scripted shots */
AI.ally = (sim, e, dt) => {
  let best = null, bd = 1e9; for (const o of sim.enemies) if (o.alive && !o.civ && !o.ally) { const d = Math.hypot(o.x - e.x, o.y - e.y); if (d < bd) { bd = d; best = o; } }
  if (best) { e.facing = Math.atan2(best.y - e.y, best.x - e.x); e.aimA = Math.atan2(best.z + 18 - (e.z + 22), bd); }
  e.point = !!best;
  if (best && e.st > (e.o.every || 3.5)) { e.st = 0; sim.ev({ type: 'eshot', from: muzzle(e), to: [best.x, best.y, best.z + 18], ally: true, e: e.id }); if (e.o.kills && sim.rng('ally') < .5) damageEnemy(sim, best, 9, null, 'torso', { ally: true }); }
};

/* ---- the rig's pose from the enemy's state ---- */
function poseRig(sim, e, dt) {
  const s = { x: e.x, y: e.y, z: e.z + e.dz, vx: e.vx, vy: e.vy, facing: e.facing };
  if (e.alive) {
    const st = e.state;
    const aiming = (st === 'aim' || st === 'fire' || st === 'laser' || st === 'over' || st === 'charge' && e.D.ai === 'drone' || (st === 'peek' && e.st > .1) || st === 'lean' || st === 'ride' || st === 'hold');
    s.point = aiming && e.D.ai !== 'thrower' && e.D.ai !== 'rusher' && e.D.ai !== 'civilian' || (e.ally && e.point);
    s.aim = e.aimA || 0;
    if (st === 'hide' && e.cover && e.cover.h < 34) s.pose = 'crouch';
    if (e.D.ai === 'civilian' && st === 'cower') { s.pose = 'crouch'; s.expr = 'wince'; }
    if (e.D.ai === 'civilian' && st === 'flee') { s.expr = 'shout'; }
    if (e.D.ai === 'shield' && st !== 'over' && st !== 'fire') s.stance = 'ready';
    if (e.D.ai === 'jetski') s.pose = 'kneel';
    if (e.climb) { s.climb = true; s.vz = -48; }
    if (e.air) s.air = true;
    if (e.sprint) s.sprint = true;
    if (e.flip) s.flip = e.flip;
    if (e.land) { s.land = e.land; e.land = 0; }
    if (e.hurtT > 0) s.hurt = true;
    if (e.atk) s.attack = { spec: E.MOVES[e.atk.spec] || E.MOVES.slash, phase: e.atk.phase, u: e.atk.u };
    if (e.D.elite || e.type === 'rusher') s.expr = 'angry';
    if (e.lean) { const sd = sideDir(e.facing, e.side * 7 * e.lean); s.x += sd[0]; s.y += sd[1]; }
  } else {
    const k = e.deathT;
    s.pose = e.style === 'flyback' || e.style === 'fall' || e.style === 'splash' ? null : 'die';
    if (e.style === 'flyback') { s.flip = Math.min(1, k / .5); if (k > .5) { s.down = 1; s.flip = 0; } }
    if (e.style === 'fall' || e.style === 'splash') { s.air = e.z > e.floorZ + 1; if (!s.air) s.down = Math.min(1, (k - e.landT) / .2); }
    if (e.style === 'head') s.expr = 'wince';
  }
  e.rig.update(dt, s);
}
/** hit volumes from a rig's joints: head sphere, torso and leg capsules */
function volsOf(rig) {
  const J = rig.J, s = rig.o.size, w = p => { const o = rig.worldOffset(p); return [rig.x + o[0], rig.y + o[1], rig.z + o[2]]; };
  const fl = w(J.footL), fr = w(J.footR), hip = w(J.hipC);
  return { head: { c: w(J.head), r: rig.o.headR * s * 1.25 }, torso: { a: hip, b: w(J.shC), r: rig.o.torsoW * .85 * s }, legs: { a: hip, b: [(fl[0] + fr[0]) / 2, (fl[1] + fr[1]) / 2, (fl[2] + fr[2]) / 2], r: 2.3 * s } };
}
TC.volsOf = volsOf;
function rigVols(e) {
  e.vols = e.alive || e.deathT < .05 ? volsOf(e.rig) : null;
  if (e.vols && e.D.ai === 'shield' && e.shieldOn) {
    const f = [Math.cos(e.facing), Math.sin(e.facing)], c = [e.x + f[0] * 7, e.y + f[1] * 7];
    e.vols.shield = { a: [c[0], c[1], e.z + 3], b: [c[0], c[1], e.z + (e.state === 'over' || e.state === 'fire' ? 19 : 27)], r: 7.5 };
  }
  if (e.vols && e.D.ai === 'captor') { if (!e.lean) e.vols = { head: e.vols.head, hidden: true }; }
}
function meshVols(sim, e) {
  if (e.D.ai === 'drone') e.vols = e.alive ? { body: { c: [e.x, e.y, e.z], r: 7 } } : null;
}

/* ---- damage, reactions, deaths ---- */
/** damage an enemy: part 'head' | 'torso' | 'legs' | 'body' | 'blast'; o = { weapon, ally, from } -> the points it scored */
function damageEnemy(sim, e, dmg, p, part, o = {}) {
  if (!e.alive) return 0;
  if (e.civ) { civHit(sim, e, p); return 0; }
  if (e.ally) { sim.ev({ type: 'allyhit', e: e.id }); return 0; }
  const mul = part === 'head' ? 2 : part === 'legs' ? .75 : 1;
  e.hp -= dmg * mul; e.flash = 1; e.hurtT = .25;
  let pts = 0;
  if (p) { pts += addScore(sim, p, 100, null); p.stats.hits++; addHitChain(p); if (part === 'head') p.stats.heads++; }
  sim.ev({ type: 'ehit', e: e.id, part, p: p ? p.id : -1, at: e.vols && e.vols.head ? e.vols.head.c : [e.x, e.y, e.z + 18] });
  if (e.hp <= 0) return pts + killEnemy(sim, e, p, part, o);
  // reactions
  if ((part === 'legs' || (o.weapon && reg('weapon', o.weapon).stagger)) && e.rig) { const c = p ? sim.cameraFor(p.id) : null; if (c) { const a = Math.atan2(e.y - c.y, e.x - c.x), k = o.weapon === 'sg' ? 60 : 30; e.stag = [Math.cos(a) * k, Math.sin(a) * k]; } }
  if (e.D.ai === 'shield' && o.weapon && (o.weapon === 'sg' || o.weapon === 'gl')) { e.shieldOff = 1.5; e.shieldOn = false; sim.ev({ type: 'shieldoff', e: e.id }); }
  if (e.D.ai === 'gunner' || e.D.ai === 'thrower' || e.D.ai === 'rocket' || e.D.ai === 'sniper' || e.D.ai === 'shield' || e.D.ai === 'turret') {
    if (e.th && !e.D.always && e.hp < e.hp0) { e.th.done = true; e.th.cancelled = true; sim.ev({ type: 'threatoff', th: e.th.id }); e.th = null; }
    if (e.state === 'aim' || e.state === 'fire' || e.state === 'over' || e.state === 'laser') { e.after = 'hide'; e.state = 'hit'; e.st = 0; e.laser = 0; }
  }
  if (e.D.ai === 'rusher' && (o.weapon === 'sg' || o.weapon === 'gl')) { e.state = 'hit'; e.st = 0; const c = p ? sim.cameraFor(p.id) : null; if (c) { const a = Math.atan2(e.y - c.y, e.x - c.x); e.stag = [Math.cos(a) * 160, Math.sin(a) * 160]; } if (e.th) { e.th.done = true; e.th.cancelled = true; } }
  return pts;
}
TC.damageEnemy = damageEnemy;
function killEnemy(sim, e, p, part, o = {}) {
  e.alive = false; e.state = 'dead'; e.deathT = 0; e.exposed = false; releaseCover(sim, e);
  if (e.th && !e.th.done) { e.th.done = true; e.th.cancelled = true; sim.ev({ type: 'threatoff', th: e.th.id }); }
  for (const th of sim.threats) if (!th.done && th.src === e.id && th.kind !== 'grenade' && th.kind !== 'rocket') { th.done = true; th.cancelled = true; sim.ev({ type: 'threatoff', th: th.id }); }
  const w = o.weapon;
  e.style = e.cover && e.cover.water ? 'splash' : e.cover && e.cover.ledge ? 'fall' : part === 'blast' || (w === 'sg' && p && Math.hypot(e.x - sim.cameraFor(p.id).x, e.y - sim.cameraFor(p.id).y) < 200) ? 'flyback' : w === 'mg' ? 'spin' : part === 'head' ? 'head' : 'crumple';
  if (e.D.ai === 'jetski') e.style = 'splash';
  e.floorZ = e.cover && e.cover.floor !== undefined ? e.cover.floor : (e.style === 'splash' ? (sim.waterZ() - 30) : e.z);
  if (e.style === 'fall' || e.style === 'splash') { const c = p ? sim.cameraFor(p.id) : sim.cameraFor(0), a = Math.atan2(c.y - e.y, c.x - e.x); e.fallV = [Math.cos(a) * 30, Math.sin(a) * 30, 40]; e.landT = 99; }
  if (e.style === 'flyback') { const c = p ? sim.cameraFor(p.id) : sim.cameraFor(0), a = Math.atan2(e.y - c.y, e.x - c.x); e.fallV = [Math.cos(a) * 110, Math.sin(a) * 110, 30]; }
  let pts = 0;
  if (p) {
    p.stats.kills++;
    pts += addScore(sim, p, e.D.score, [e.x, e.y, e.z + 30]);
    if (part === 'head') pts += addScore(sim, p, 500, [e.x, e.y, e.z + 40]), sim.ev({ type: 'headshot', p: p.id });
    if (e.expT > 0 && e.expT < .7 && e.D.ai !== 'runner') { pts += addScore(sim, p, 500, [e.x, e.y, e.z + 46]); p.stats.quick++; sim.ev({ type: 'quick', p: p.id }); }
    if (e.elite) sim.timeExtend(tune.time.eliteBonus);
    if (e.drop) givePickup(sim, p, e.drop, e.o.amount);
  }
  sim.ev({ type: 'kill', e: e.id, p: p ? p.id : -1, kind: e.type, style: e.style, at: [e.x, e.y, e.z + 18], pts });
  if (e.hostage) sim.say('tejada', 'Mari! You came!');
  if (e.o.onKill) sim.cue(e.o.onKill);
  sim.cue('kill:' + e.type);
  return pts;
}
TC.killEnemy = killEnemy;
function civHit(sim, e, p) {
  if (!p || e.civHitT > sim.t) return;
  e.civHitT = sim.t + .8; e.flash = 1; e.hurtT = .4;
  p.stats.civ++; addScore(sim, p, -5000, [e.x, e.y, e.z + 30], true); if (p.score < 0) p.score = 0;
  hurtPlayer(sim, p, 'civilian', true);
  sim.ev({ type: 'civhit', p: p.id, e: e.id });
  sim.say('juno', 'Hold your fire! Civilians!');
}
TC.civHit = civHit;
function givePickup(sim, p, w, amount) {
  const W = reg('weapon', w); if (!W) return;
  const n = Math.round((amount || W.pickup) * tune.weapons.ammoMul), had = p.ammo[w] > 0 || p.seen && p.seen[w];
  p.ammo[w] = Math.min(W.pool, p.ammo[w] + n); (p.seen || (p.seen = {}))[w] = true;
  sim.ev({ type: 'pickup', p: p.id, w, n, first: !had });
}
TC.givePickup = givePickup;
function deadStep(sim, e, dt) {
  e.deathT += dt;
  if (e.fallV) {
    e.x += e.fallV[0] * dt; e.y += e.fallV[1] * dt; e.fallV[0] *= Math.pow(.15, dt); e.fallV[1] *= Math.pow(.15, dt);
    if (e.style === 'fall' || e.style === 'splash') { e.fallV[2] -= 320 * dt; e.z += e.fallV[2] * dt; if (e.z <= e.floorZ) { e.z = e.floorZ; if (e.landT === 99) { e.landT = e.deathT; sim.ev({ type: e.style === 'splash' ? 'splash' : 'thud', at: [e.x, e.y, e.z] }); } e.fallV[0] = e.fallV[1] = 0; } }
    if (e.style === 'flyback' && e.deathT > .6) e.fallV = null;
  }
  if (e.style === 'spin' && e.deathT < .4) e.facing += dt * 5;
  if (e.mesh) { e.z -= dt * 80; e.ph = (e.ph || 0) + dt * 9; if (e.z < sim.groundBelow(e) && !e.boom) { e.boom = true; sim.explode([e.x, e.y, e.z], 30, 0, -1, true); e.gone = true; } if (e.deathT > 3) e.gone = true; return; }
  if (e.style === 'splash' && e.z <= e.floorZ + 1 && e.deathT > 1.2) { e.gone = true; return; }
  if (e.deathT > 2.5) e.alpha = Math.max(0, 1 - (e.deathT - 2.5) / .5);
  if (e.deathT > 3) e.gone = true;
}
