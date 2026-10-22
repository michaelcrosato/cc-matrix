'use strict';
/* ===== GAME: simulation + world rendering ===== */
const BASE_SPEED = 70, BX = 26, BYMAX = 14, SPAWN_AHEAD = 300;
Meshes.pillar = mkBox(0, 0.5, 0, 1, 1, 1, [80, 78, 60]);
Meshes.cap = mkBox(0, 0, 0, 1, 0.12, 1, C.fern);

function newWorld(stageIdx, mode, startCp) {
  const st = STAGES[stageIdx];
  const W = {
    st, stageIdx, mode, dist: 0, speed: BASE_SPEED, t: 0, evIdx: 0, state: 'intro', stateT: 0, ents: [], bullets: [], parts: [], comms: [], rings: [], waves: [],
    hint: null, flags: {}, cp: { z: 0, name: 'Start' }, boss: null, shakeT: 0, flash: 0, hurt: 0, combo: 0, comboT: 0, banner: null,
    stats: { kills: 0, spawned: 0, saved: 0, lost: 0, score: 0, hits: 0, rings: 0, shotsHit: 0, time: 0, deaths: 0, maxCombo: 0 },
    lives: 3, ai: { t: 0, hold: 0, cd: 0, bombCd: 5, rollCd: 0 },
    p: { x: 0, y: 2, vx: 0, vy: 0, hp: 100, roll: 0, rollT: 0, rollDir: 1, rollCD: 0, boost: 1, boostLock: false, bombs: 3, laser: 1, charge: 0, locks: [], lockT: 0, inv: 0, fireCD: 0, boosting: false, braking: false, dead: false, bank: 0 },
    allies: WINGMEN.map((d, i) => ({ def: d, hp: 60, alive: true, x: [-9, 9, 0][i], y: [1, 1, 6][i], rz: 6, chaser: null, chased: false, fireCD: rnd(1, 2), hurtT: 0 }))
  };
  Gfx.fog = st.pal.fog;
  Gfx.fogFar = st.env === 'space' ? 420 : 380;
  Audio_.startMusic(st.track);
  W.banner = { t: 0, a: st.sector, b: st.name, c: st.blurb };
  say(W, 'HQ', null);
  return W;
}
function say(W, who, text, dur = 4) { if (!text) return; W.comms.push({ who, text, dur, t: 0 }); }
function addScore(W, n) { W.stats.score += n * (1 + Math.min(3, Math.floor(W.combo / 3))); }

function spawnEvent(W, ev) {
  const st = W.st, z = W.dist + SPAWN_AHEAD, gy = st.ground, space = st.env === 'space';
  const diffHP = Settings.diff === 2 ? 1.3 : 1;
  const add = (o) => { const e = Object.assign({ x: 0, y: 0, z, vz: 0, hp: 1, r: 2, t: 0, cd: rnd(1.2, 2.8), flash: 0, kind: 'dart', score: 100, targetable: true, rx: 0, ry: Math.PI, rz: 0 }, o); e.hp = e.hp * diffHP; e.maxHp = e.hp; W.ents.push(e); if (e.targetable && e.kind !== 'chaser' && e.kind !== 'boss') W.stats.spawned++; return e; };
  switch (ev.t) {
    case 'darts': for (let i = 0; i < ev.n; i++) add({ kind: 'dart', z: z + i * 12, vz: -30, hp: 1, r: 2, pat: ev.pat, i, n: ev.n, x0: ev.x, y0: ev.y, ph: rnd(TAU), x: ev.x, y: ev.y + 40 }); break;
    case 'turret': add({ kind: 'turret', x: ev.x, y: gy, z: z + 20, hp: 4, r: 3, score: 300, cd: rnd(1, 2.5) }); break;
    case 'tower': add({ kind: 'tower', x: ev.x, y: gy, z: z + 20, hp: 9999, r: 3, targetable: false, h: ev.h, score: 0 }); break;
    case 'rock': add({ kind: 'rock', x: ev.x, y: ev.y, z: z + 20, hp: ev.s * 0.8, r: ev.s * 1.2, s: ev.s, score: 50, rx: rnd(TAU), rz: rnd(TAU), spin: rnd(-1, 1), ry: rnd(TAU) }); break;
    case 'heavy': add({ kind: 'heavy', x: ev.x, y: ev.y, z: z + 20, vz: -20, hp: 12, r: 4, score: 500, phase: 0, hold: 7, burst: 0 }); break;
    case 'mine': add({ kind: 'mine', x: ev.x, y: ev.y, z: z + 20, hp: 2, r: 1.8, score: 150, ph: rnd(TAU) }); break;
    case 'gate': add({ kind: 'gate', x: 0, y: 0, z: z + 20, hp: 9999, r: 40, targetable: false, gx: ev.gx, gy: ev.gy, score: 0 }); break;
    case 'ring': add({ kind: 'ring', x: ev.x, y: ev.y, z: z + 20, hp: 9999, r: 7, targetable: false, score: 0 }); break;
    case 'power': add({ kind: 'power', x: ev.x, y: ev.y, z: z + 20, hp: 9999, r: 4, targetable: false, pk: ev.kind, score: 0 }); break;
    case 'pursuit': {
      const a = W.allies[ev.ally]; if (!a.alive || a.chased) break;
      a.chased = true; a.t = 0;
      const c = add({ kind: 'chaser', ally: a, z: W.dist + 70, hp: 7, r: 2.2, score: 300, cd: 0.6, x: a.x, y: a.y }); a.chaser = c;
      say(W, a.def.who, 'I\'m being chased!', 2.5); Audio_.sfx('warn'); break;
    }
    case 'comm': say(W, ev.who, ev.text, ev.dur); break;
    case 'hint': if (Settings.hints && W.mode === 'play') W.hint = { id: ev.id, text: ev.text, need: ev.need, t: 0 }; break;
    case 'cp': W.cp = { z: ev.z, name: ev.name }; if (W.mode === 'play') W.banner2 = { t: 0, text: 'CHECKPOINT — ' + ev.name }; break;
    case 'boss': {
      const sp = st.env === 'space';
      const b = add({ kind: 'boss', x: 0, y: 2, z: W.dist + 300, hp: st.bossHp, r: 10, score: 5000, rz: 0, open: false, openT: 2, atkT: 3, phaseT: 0, rel: 300, sp, targetable: false, arrive: true });
      W.boss = b; W.banner = { t: 0, a: 'WARNING', b: st.bossName, c: '' }; Audio_.sfx('warn');
      say(W, 'FOE', sp ? 'You dare enter the Spore Heart? We will bloom over your wreckage!' : 'Blight spores will swallow you, Comet Wing!', 4);
      break;
    }
  }
}

function hurtPlayer(W, dmg, src) {
  const p = W.p; if (p.inv > 0 || p.dead || W.state === 'victory' || W.state === 'bossdead') return false;
  if (W.mode === 'attract') return false;
  dmg *= [0.6, 1, 1.4][Settings.diff];
  p.hp -= dmg; p.inv = 1.2; W.shakeT = 0.4; W.hurt = 1; Audio_.sfx('hit'); W.combo = 0;
  rumble(0.8, 250);
  burst(W, p.x, p.y, W.dist, 14, C.orange, 20);
  if (p.laser > 1 && dmg > 10) p.laser--;
  if (p.hp <= 0) { p.hp = 0; killPlayer(W); }
  return true;
}
function rumble(m, ms) { if (!Settings.rumble) return; const p = Input.pad(); try { if (p && p.vibrationActuator) p.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: m, weakMagnitude: m * 0.6 }); } catch (e) {} }
function killPlayer(W) {
  const p = W.p; p.dead = true; W.state = 'dead'; W.stateT = 0; W.stats.deaths++;
  burst(W, p.x, p.y, W.dist, 60, C.orange, 40); burst(W, p.x, p.y, W.dist, 30, C.white, 30); Audio_.sfx('bigboom'); Audio_.sfx('lose'); W.shakeT = 1; rumble(1, 600);
}
function burst(W, x, y, z, n, col, spd = 20, size = 1) {
  for (let i = 0; i < n; i++) { const a = rnd(TAU), b = rnd(-1, 1), s = rnd(0.2, 1) * spd; W.parts.push({ x, y, z, vx: Math.cos(a) * s * (1 - Math.abs(b) * 0.3), vy: Math.sin(a) * s * (1 - Math.abs(b) * 0.3), vz: b * s, life: rnd(0.4, 1.1), max: 1.1, size: rnd(0.5, 1.5) * size, col }); }
}
function explode(W, e, big) {
  const z = e.z; burst(W, e.x, e.y, z, big ? 70 : 24, C.orange, big ? 40 : 22, big ? 2 : 1); burst(W, e.x, e.y, z, big ? 40 : 12, C.yellow, 25);
  W.parts.push({ x: e.x, y: e.y, z, vx: 0, vy: 0, vz: 0, life: 0.5, max: 0.5, size: big ? 14 : 5, col: C.white, flare: true });
  Audio_.sfx(big ? 'bigboom' : 'boom'); if (big) { W.shakeT = 0.8; rumble(0.9, 500); } else rumble(0.3, 100);
}
function killEnemy(W, e, byPlayer = true) {
  e.dead = true; explode(W, e, e.kind === 'boss');
  if (!byPlayer) return;
  W.combo++; W.comboT = 2.2; W.stats.maxCombo = Math.max(W.stats.maxCombo, W.combo);
  if (e.targetable !== false || e.kind === 'boss') { W.stats.kills++; }
  addScore(W, e.score);
  if (e.kind === 'chaser') { const a = e.ally; a.chased = false; a.chaser = null; if (a.alive) { W.stats.saved++; addScore(W, 500); say(W, a.def.who, ['Thanks, Ember! You saved me!', 'Phew! That was close!', 'Nice shooting, boss!'][W.stats.saved % 3], 3); } }
  if (e.kind === 'mine') { areaHurt(W, e); }
  if (e.kind === 'dart' && Math.random() < 0.06) W.ents.push({ kind: 'power', pk: 'hp', x: e.x, y: e.y, z: e.z, vz: 0, hp: 9999, r: 4, t: 0, score: 0, targetable: false, rx: 0, ry: 0, rz: 0 });
}
function areaHurt(W, e) { const p = W.p; if (Math.hypot(p.x - e.x, p.y - e.y) < 8 && Math.abs(e.z - W.dist) < 8) hurtPlayer(W, 18); }

function damageEnemy(W, e, d, byAlly) {
  if (e.dead || e.dying) return;
  if (e.kind === 'boss') {
    if (!e.open || e.arrive) { Audio_.sfx('clang'); burst(W, e.x + rnd(-6, 6), e.y + rnd(-3, 3), e.z - 8, 3, C.white, 14, 0.5); return; }
  }
  e.hp -= d; e.flash = 1; if (!byAlly) W.stats.shotsHit++;
  if (e.hp <= 0) { if (e.kind === 'boss') bossDie(W, e); else killEnemy(W, e, !byAlly); }
}
function bossDie(W, e) { if (e.dying) return; e.dying = true; e.dieT = 0; e.hp = 0; W.state = 'bossdead'; W.stateT = 0; W.bullets = W.bullets.filter(b => b.fr); addScore(W, 5000); W.stats.kills++; say(W, 'FOE', 'Impossible... the Bloom... withers...', 3); }

function enemyFire(W, e, ox = 0, oy = 0, spd = 85, dmg = 8) {
  const p = W.p, rz = e.z - W.dist; if (rz < 25) return;
  const x = e.x + ox, y = e.y + oy, t = rz / (spd + W.speed);
  W.bullets.push({ fr: false, kind: 'orb', x, y, z: e.z, vx: (p.x - x) / t, vy: (p.y - y) / t, vz: -spd, dmg, life: 6 });
}
function shootLaser(W) {
  const p = W.p; Audio_.sfx(p.laser > 1 ? 'laser2' : 'laser');
  const mk = (ox, vx = 0, dmg = 1) => W.bullets.push({ fr: true, kind: 'laser', x: p.x + ox, y: p.y, z: W.dist + 3, vx, vy: 0, vz: 330 + W.speed, dmg, life: 1.1, lvl: p.laser });
  if (p.laser === 1) mk(0); else if (p.laser === 2) { mk(-1.3); mk(1.3); } else { mk(-1.3, 0, 2); mk(1.3, 0, 2); mk(0, 0, 1); }
}
function fireMissiles(W) {
  const p = W.p; if (!p.locks.length) return; Audio_.sfx('missile');
  for (const t of p.locks) if (!t.dead) W.bullets.push({ fr: true, kind: 'missile', target: t, x: p.x + rnd(-1, 1), y: p.y, z: W.dist + 2, vx: rnd(-20, 20), vy: rnd(-5, 15), vz: 120 + W.speed, dmg: 6, life: 3.5 });
  p.locks = [];
}
function dropBomb(W) {
  const p = W.p; if (p.bombs <= 0 && W.mode !== 'attract') return; if (W.mode !== 'attract') p.bombs--;
  Audio_.sfx('bomb'); W.flash = 1; W.shakeT = 0.8; rumble(1, 500); W.flags.bomb = true;
  W.waves.push({ z: W.dist, x: p.x, y: p.y, t: 0 });
  for (const e of W.ents) { const rz = e.z - W.dist; if (e.dead || !e.targetable && e.kind !== 'boss' || rz < 0 || rz > 260) continue; if (e.kind === 'boss') { if (!e.arrive && !e.dying) { e.hp -= 15; e.flash = 1; if (e.hp <= 0) bossDie(W, e); } } else { e.hp -= 12; e.flash = 1; if (e.hp <= 0) killEnemy(W, e); } }
  W.bullets = W.bullets.filter(b => b.fr);
}
function doRoll(W, dir) {
  const p = W.p; if (p.rollT > 0 || p.rollCD > 0) return; p.rollT = 0.55; p.rollDir = dir; p.rollCD = 0.9; Audio_.sfx('roll'); W.flags.roll = true;
}

/* ---------- attract-mode AI (cheats freely) ---------- */
function aiInput(W) {
  const p = W.p, a = W.ai, s = { x: 0, y: 0, fire: false, fireP: false, fireR: false, bombP: false, rollL: false, rollR: false, boost: false, brake: false, pauseP: false, okP: false, backP: false, navX: 0, navY: 0 };
  a.t += 1 / 60; p.hp = 100; p.inv = 1; if (p.bombs < 3) p.bombs = 3;
  let best = null, bd = 1e9, near = 0;
  for (const e of W.ents) { if (e.dead) continue; const rz = e.z - W.dist; if (rz < 8 || rz > 220) continue; if (e.targetable !== false || e.kind === 'boss') { if (e.kind === 'boss' && !e.open) { if (!best) { best = e; bd = 999; } continue; } near++; const d = rz + Math.abs(e.x - p.x) * 2; if (d < bd) { bd = d; best = e; } } }
  let tx = Math.sin(a.t * 0.7) * 10, ty = 2 + Math.sin(a.t * 0.9) * 4;
  const gate = W.ents.find(e => !e.dead && e.kind === 'gate' && e.z - W.dist > 0 && e.z - W.dist < 110); const ring = W.ents.find(e => !e.dead && e.kind === 'ring' && e.z - W.dist > 0 && e.z - W.dist < 90);
  const pw = W.ents.find(e => !e.dead && e.kind === 'power' && e.z - W.dist > 0 && e.z - W.dist < 90);
  if (best) { tx = best.x; ty = best.y; }
  if (ring) { tx = ring.x; ty = ring.y; } if (pw) { tx = pw.x; ty = pw.y; } if (gate) { tx = gate.gx; ty = gate.gy; }
  s.x = clamp((tx - p.x) / 4, -1, 1); s.y = clamp((ty - p.y) / 4, -1, 1);
  if (best && Math.abs(best.x - p.x) < 3.5 && Math.abs(best.y - p.y) < 3.5) { a.cd -= 1 / 60; if (a.cd <= 0) { s.fireP = true; a.cd = 0.15; } }
  if (near >= 3 && a.hold <= 0 && Math.random() < 0.01) a.hold = 1.3;
  if (a.hold > 0) { a.hold -= 1 / 60; s.fire = true; if (a.hold <= 0) s.fireR = true; }
  a.bombCd -= 1 / 60; if (near >= 7 && a.bombCd <= 0) { s.bombP = true; a.bombCd = 14; }
  a.rollCd -= 1 / 60; for (const b of W.bullets) if (!b.fr && b.z - W.dist < 14 && b.z - W.dist > 0 && Math.hypot(b.x - p.x, b.y - p.y) < 6 && a.rollCd <= 0) { s[Math.random() < 0.5 ? 'rollL' : 'rollR'] = true; a.rollCd = 3; break; }
  if (!W.boss && !best && !gate) s.boost = true;
  return s;
}

/* ---------- main sim update ---------- */
function updateWorld(W, dt, inp) {
  W.t += dt; W.stateT += dt; const p = W.p, st = W.st;
  if (W.state === 'dead') {
    stepParts(W, dt); W.shakeT = Math.max(0, W.shakeT - dt); W.hurt = Math.max(0, W.hurt - dt * 2);
    if (W.stateT > 2.6) { if (W.lives > 0) respawn(W); else { W.state = 'gameover'; W.stateT = 0; Audio_.stopMusic(); } }
    return;
  }
  if (W.state === 'gameover' || W.state === 'done') return;
  W.stats.time += dt;
  if (W.banner) { W.banner.t += dt; if (W.banner.t > 4) W.banner = null; }
  if (W.banner2) { W.banner2.t += dt; if (W.banner2.t > 2.5) W.banner2 = null; }
  if (W.state === 'intro' && W.stateT > 1) W.state = 'play';
  const victory = W.state === 'victory', ending = W.state === 'bossdead';

  // speed
  p.braking = inp.brake && !victory; p.boosting = inp.boost && !p.braking && p.boost > 0 && !p.boostLock && !victory;
  if (p.boosting) { p.boost -= dt * 0.45; if (p.boost <= 0) { p.boost = 0; p.boostLock = true; } if (!W.flags.boostSfx) { Audio_.sfx('boost'); W.flags.boostSfx = true; } W.flags.boost = true; } else { W.flags.boostSfx = false; p.boost = Math.min(1, p.boost + dt * (p.braking ? 0.4 : 0.2)); if (p.boostLock && p.boost > 0.35) p.boostLock = false; }
  if (p.braking) W.flags.boost = true;
  const targetSpd = victory ? BASE_SPEED * 3 : BASE_SPEED * (p.boosting ? 1.8 : p.braking ? 0.5 : 1);
  W.speed = lerp(W.speed, targetSpd, 1 - Math.exp(-dt * 4));
  W.dist += W.speed * dt;

  // movement
  const ix = victory ? 0 : inp.x, iy = victory ? 0 : inp.y, ground = st.env === 'space' ? -13 : st.ground + 6, ms = (p.braking ? 1.15 : p.boosting ? 0.8 : 1) * 40;
  p.vx = lerp(p.vx, ix * ms, 1 - Math.exp(-dt * 9)); p.vy = lerp(p.vy, iy * ms, 1 - Math.exp(-dt * 9));
  p.x = clamp(p.x + p.vx * dt, -BX, BX); p.y = clamp(p.y + p.vy * dt, ground, BYMAX);
  if (victory) { p.x = lerp(p.x, 0, dt); p.y = lerp(p.y, 4, dt); }
  if (Math.abs(ix) + Math.abs(iy) > 0.3) W.flags.move = true;
  p.bank = lerp(p.bank, -p.vx * 0.022, 1 - Math.exp(-dt * 8));
  p.inv = Math.max(0, p.inv - dt); p.rollCD = Math.max(0, p.rollCD - dt); p.fireCD = Math.max(0, p.fireCD - dt);
  if (p.rollT > 0) { p.rollT -= dt; p.x = clamp(p.x + p.rollDir * 22 * dt * (p.rollT / 0.55 + 0.3), -BX, BX); }
  if (!victory && !ending || ending) {
    if (!victory) {
      if (inp.rollL) doRoll(W, -1); if (inp.rollR) doRoll(W, 1);
      if (inp.bombP) dropBomb(W);
      if (inp.fireP) { shootLaser(W); W.flags.fire = true; p.charge = 0.001; p.fireCD = 0.1; }
      if (inp.fire && p.charge > 0) { p.charge += dt; if (p.charge > 0.32) { p.lockT -= dt; if (p.lockT <= 0 && p.locks.length < 6) { lockScan(W); p.lockT = 0.11; } } }
      else if (!inp.fire && p.charge === 0 && false) { }
      if (inp.fireR || !inp.fire) { if (p.charge > 0.32 && p.locks.length) { fireMissiles(W); W.flags.lock = true; } if (!inp.fire) { p.charge = 0; p.locks = []; } }
      if (inp.fire && p.charge === 0 && !inp.fireP && W.mode === 'attract') p.charge = 0.001;
    }
  }
  p.locks = p.locks.filter(t => !t.dead && t.z - W.dist > 5);

  // event spawning
  if (!W.boss) while (W.evIdx < st.events.length && st.events[W.evIdx].z - SPAWN_AHEAD <= W.dist) { spawnEvent(W, st.events[W.evIdx]); W.evIdx++; }
  if (W.hint) { W.hint.t += dt; if (W.flags[W.hint.need] || W.hint.t > 14) { if (W.flags[W.hint.need] && !W.hint.done) { W.hint.done = true; W.hint.t = Math.max(W.hint.t, 12.4); Audio_.sfx('ok'); } else if (W.hint.t > 14) W.hint = null; } if (W.hint && W.hint.done && W.hint.t > 13.2) W.hint = null; }
  W.comboT -= dt; if (W.comboT <= 0) W.combo = 0;
  for (const c of W.comms) { if (c.t === 0 && Settings.subs !== undefined) Audio_.blip(c.text.length); c.t += dt; } W.comms = W.comms.filter(c => c.t < c.dur);

  updateAllies(W, dt);
  updateEnts(W, dt);
  updateBullets(W, dt);
  stepParts(W, dt);
  for (const w of W.waves) w.t += dt; W.waves = W.waves.filter(w => w.t < 1);
  W.shakeT = Math.max(0, W.shakeT - dt); W.flash = Math.max(0, W.flash - dt * 2); W.hurt = Math.max(0, W.hurt - dt * 2);
  W.ents = W.ents.filter(e => !e.dead && e.z - W.dist > -30);

  // ending flow
  if (ending && W.boss) { W.boss.dieT += dt; if (Math.random() < 0.6) { const b = W.boss; explode(W, { x: b.x + rnd(-8, 8), y: b.y + rnd(-4, 4), z: b.z + rnd(-6, 6) }, Math.random() < 0.3); } if (W.stateT > 3.2) { W.boss.dead = true; explode(W, W.boss, true); W.flash = 1; W.state = 'victory'; W.stateT = 0; Audio_.sfx('win'); Audio_.stopMusic(); } }
  if (victory && W.stateT > 5) { W.state = 'done'; W.stateT = 0; }
}
function respawn(W) {
  const p = W.p, st = W.st; W.lives--;
  p.hp = 100; p.dead = false; p.inv = 2.5; p.vx = p.vy = 0; p.x = 0; p.y = 2; p.charge = 0; p.locks = []; p.bombs = Math.max(p.bombs, 2); p.laser = Math.max(1, p.laser - 1);
  W.dist = Math.max(0, W.cp.z - SPAWN_AHEAD - 30); W.speed = BASE_SPEED; W.ents = []; W.bullets = []; W.boss = null; W.hint = null; W.combo = 0;
  W.evIdx = st.events.findIndex(e => e.z >= W.cp.z - 30); if (W.evIdx < 0) W.evIdx = st.events.length;
  for (const a of W.allies) { a.chased = false; a.chaser = null; }
  W.state = 'play'; W.stateT = 0; Audio_.startMusic(st.track); W.banner2 = { t: 0, text: 'RETRY FROM CHECKPOINT' };
}
function lockScan(W) {
  const p = W.p, r = Gfx.proj(p.x, p.y, W.dist + 40); if (!r) return; let best = null, bd = 260 * Gfx.u * Settings.aim;
  for (const e of W.ents) { if (e.dead || e.targetable === false || p.locks.includes(e)) continue; if (e.kind === 'boss' && (!e.open || e.arrive)) continue; const rz = e.z - W.dist; if (rz < 15 || rz > 280) continue; const q = Gfx.proj(e.x, e.y, e.z); if (!q) continue; const d = Math.hypot(q[0] - r[0], q[1] - r[1]); if (d < bd) { bd = d; best = e; } }
  if (best) { p.locks.push(best); Audio_.sfx('lock'); }
}
function updateAllies(W, dt) {
  const p = W.p;
  W.allies.forEach((a, i) => {
    if (!a.alive) return; a.t = (a.t || 0) + dt; a.hurtT = Math.max(0, a.hurtT - dt);
    let tx, ty, trz;
    if (a.chased) {
      tx = Math.sin(a.t * 1.1 + i * 2) * 15; ty = 2 + Math.cos(a.t * 1.4 + i) * 6; trz = 42 + i * 5;
      const c = a.chaser;
      if (c && !c.dead) { c.x = lerp(c.x, a.x, dt * 3); c.y = lerp(c.y, a.y, dt * 3); c.z = W.dist + a.rz - 13; c.cd -= dt; if (c.cd <= 0) { c.cd = 0.55; W.bullets.push({ fr: false, kind: 'orb', ally: a, x: c.x, y: c.y, z: c.z + 2, vx: 0, vy: 0, vz: 0, dmg: 0, life: 0.15, tiny: true }); a.hp -= 2.2 * [0.6, 1, 1.5][Settings.diff]; a.hurtT = 0.3; if (a.hp <= 0) { a.alive = false; a.chased = false; W.stats.lost++; c.dead = true; say(W, a.def.who, 'Arghh! I\'m going down — good luck, Ember!', 3.5); Audio_.sfx('hit'); explode(W, { x: a.x, y: a.y, z: W.dist + a.rz }, false); } } }
      else if (c && c.dead) { a.chased = false; }
    } else { tx = p.x + [-9, 9, 0][i] + Math.sin(a.t * 0.8 + i) * 2.5; ty = p.y + [1, 1, 5][i] + Math.cos(a.t * 0.9 + i) * 1.5; trz = 6 + i * 2; a.fireCD -= dt; if (a.fireCD <= 0) { a.fireCD = rnd(1.1, 2.4); const e = W.ents.find(e => !e.dead && e.targetable !== false && e.kind !== 'boss' && e.z - W.dist > 25 && e.z - W.dist < 140 && Math.abs(e.x - a.x) < 12); if (e) { const rz = e.z - (W.dist + a.rz), t = Math.max(0.1, rz / 330); W.bullets.push({ fr: true, ally: true, kind: 'laser', x: a.x, y: a.y, z: W.dist + a.rz, vx: (e.x - a.x) / t, vy: (e.y - a.y) / t, vz: 330 + W.speed * 0, dmg: 1, life: 1 }); Audio_.sfx('laser'); } } }
    a.x = lerp(a.x, tx, 1 - Math.exp(-dt * 3)); a.y = lerp(a.y, ty, 1 - Math.exp(-dt * 3)); a.rz = lerp(a.rz, trz, 1 - Math.exp(-dt * 2)); a.vx = (tx - a.x);
  });
}
function updateEnts(W, dt) {
  const p = W.p, ground = W.st.ground;
  for (const e of W.ents) {
    if (e.dead) continue; e.t += dt; e.flash = Math.max(0, e.flash - dt * 5); e.z += e.vz * dt;
    const rz = e.z - W.dist;
    switch (e.kind) {
      case 'dart': {
        const i = e.i - (e.n - 1) / 2, t = e.t;
        if (e.pat === 'line') { e.x = e.x0 + i * 6; e.y = e.y0 + Math.sin(t * 1.5 + e.i * 0.5) * 1.5; }
        else if (e.pat === 'v') { e.x = e.x0 + i * 5; e.y = e.y0 + Math.abs(i) * 1.6 + Math.sin(t * 1.2) * 1; }
        else if (e.pat === 'sine') { e.x = e.x0 + Math.sin(t * 1.6 + e.i * 0.6) * 15; e.y = e.y0 + Math.cos(t * 1.2 + e.i * 0.6) * 5; }
        else { e.x = (e.i % 2 ? 1 : -1) * Math.max(i * 1.5 > 0 ? Math.abs(i) * 2.5 : Math.abs(i) * 2.5, 26 - t * 7); e.y = e.y0 + Math.sin(t + e.i) * 1.5; }
        e.rz = clamp((e.x - (e.px ?? e.x)) * -0.2, -0.8, 0.8); e.px = e.x;
        e.cd -= dt; if (e.cd <= 0 && rz > 50 && rz < 220) { e.cd = rnd(1.8, 3.4) / (Settings.diff === 2 ? 1.4 : Settings.diff === 0 ? 0.7 : 1); enemyFire(W, e); }
        break; }
      case 'heavy': {
        if (e.phase === 0 && rz < 120) { e.phase = 1; e.vz = W.speed; } else if (e.phase === 1) { e.vz = W.speed; e.hold -= dt; e.x += Math.sin(e.t * 0.8) * 6 * dt; e.cd -= dt; if (e.cd <= 0) { e.cd = 2.2; e.burst = 3; } if (e.burst > 0) { e.bt = (e.bt || 0) - dt; if (e.bt <= 0) { e.bt = 0.18; e.burst--; enemyFire(W, e, rnd(-2, 2), 0, 95, 9); } } if (e.hold <= 0) { e.phase = 2; e.vz = -70; } }
        break; }
      case 'turret': e.cd -= dt; if (e.cd <= 0 && rz > 40 && rz < 190) { e.cd = rnd(1.4, 2.2); enemyFire(W, e, 0, 3, 90); } break;
      case 'rock': e.rx += e.spin * dt * 0.5; e.rz += e.spin * dt * 0.3; break;
      case 'mine': e.y += Math.sin(e.t * 2 + e.ph) * 2 * dt; if (rz < 7 && rz > -2 && Math.hypot(e.x - p.x, e.y - p.y) < 7) { e.dead = true; explode(W, e, false); areaHurt(W, e); } break;
      case 'boss': updateBoss(W, e, dt); break;
    }
    if (e.dead) continue;
    // player collisions / pickups
    if (p.dead || W.state === 'victory') continue;
    const dx = Math.abs(e.x - p.x), dy = Math.abs(e.y - p.y), dz = Math.max(0, Math.abs(e.z - W.dist) - W.speed * dt * 0.5);
    if (e.kind === 'ring') { if (dz < 3 && Math.hypot(e.x - p.x, e.y - p.y) < 7 && !e.got) { e.got = true; e.dead = true; p.hp = Math.min(100, p.hp + 25); W.stats.rings++; Audio_.sfx('ring'); addScore(W, 200); burst(W, e.x, e.y, e.z, 20, C.yellow, 15); } continue; }
    if (e.kind === 'power') { if (dz < 4 && dx < 5 && dy < 5) { e.dead = true; Audio_.sfx('power'); if (e.pk === 'bomb') p.bombs = Math.min(5, p.bombs + 1); else if (e.pk === 'laser') p.laser = Math.min(3, p.laser + 1); else p.hp = Math.min(100, p.hp + 20); addScore(W, 100); W.banner2 = { t: 0, text: e.pk === 'bomb' ? 'BOMB +1' : e.pk === 'laser' ? 'LASER UPGRADE' : 'SHIELD +20' }; } continue; }
    if (e.kind === 'gate') { if (dz < 2.5 && Math.hypot(p.x - e.gx, p.y - e.gy) > 7.5) { hurtPlayer(W, 25); } continue; }
    if (e.kind === 'tower') { if (dz < 3.5 && dx < 4.5 && p.y < e.y + e.h) hurtPlayer(W, 25); continue; }
    if (e.kind === 'boss') { if (!e.dying && dz < 14 && dx < 14 && dy < 9) hurtPlayer(W, 20); continue; }
    if (e.kind === 'chaser') continue;
    if (dz < e.r + 1.5 && dx < e.r + 1.2 && dy < e.r + 1) {
      if (hurtPlayer(W, e.kind === 'heavy' ? 20 : e.kind === 'rock' ? 18 : 12)) { if (e.kind !== 'heavy') { e.dead = true; explode(W, e, false); W.stats.kills += e.targetable !== false ? 1 : 0; } else { e.hp -= 5; e.flash = 1; } }
    }
  }
  // enemy bullets vs allies not modeled; handled by chaser damage
}
function updateBoss(W, e, dt) {
  const st = W.st, sp = e.sp, frac = e.hp / e.maxHp;
  if (e.dying) { e.x += Math.sin(e.t * 30) * 0.2; e.z = W.dist + e.rel; e.y -= dt * 1; return; }
  if (e.arrive) { e.rel = lerp(e.rel, sp ? 150 : 125, 1 - Math.exp(-dt * 0.9)); if (e.rel < (sp ? 155 : 130)) { e.arrive = false; e.targetable = true; } }
  e.z = W.dist + e.rel;
  e.x = Math.sin(e.t * 0.55) * (sp ? 12 : 16); e.y = 3 + Math.sin(e.t * 0.8) * 4;
  if (e.arrive) return;
  e.openT -= dt; if (e.openT <= 0) { e.open = !e.open; e.openT = e.open ? (frac < 0.5 ? 4.5 : 3.8) : (frac < 0.5 ? 2.2 : 3.2); Audio_.sfx(e.open ? 'warn' : 'clang'); }
  e.atkT -= dt; const ph = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
  if (e.atkT <= 0) {
    const side = Math.floor(e.t) % 2 ? 1 : -1;
    if (ph === 1) { e.atkT = 1.1; enemyFire(W, e, side * 7, 3, 90, 8); }
    else if (ph === 2) { e.atkT = 2.4; for (let k = -3; k <= 3; k++) { const b = { fr: false, kind: 'orb', x: e.x, y: e.y + 2, z: e.z - 8, vx: k * 9, vy: rnd(-3, 3), vz: -85, dmg: 8, life: 6 }; W.bullets.push(b); } if (Math.random() < 0.5) W.ents.push({ kind: 'dart', z: e.z - 10, vz: -30, hp: 1, r: 2, pat: 'sine', i: 0, n: 1, x0: rnd(-12, 12), y0: rnd(0, 6), ph: 0, x: e.x, y: e.y, t: 0, cd: 1, flash: 0, score: 100, targetable: true, rx: 0, ry: Math.PI, rz: 0 }); }
    else { e.atkT = 0.55; enemyFire(W, e, side * 7, 3, 110, 9); if (Math.floor(e.t * 2) % 5 === 0) for (let k = -2; k <= 2; k++) W.bullets.push({ fr: false, kind: 'orb', x: e.x, y: e.y + 2, z: e.z - 8, vx: k * 11, vy: rnd(-4, 4), vz: -90, dmg: 8, life: 6 }); }
  }
}
function updateBullets(W, dt) {
  const p = W.p;
  for (const b of W.bullets) {
    b.life -= dt; if (b.life <= 0) { b.dead = true; continue; }
    if (b.kind === 'missile') {
      let t = b.target; if (!t || t.dead) { t = W.ents.find(e => !e.dead && e.targetable !== false && e.z > b.z && e.z - b.z < 120); b.target = t; }
      if (t) { const dx = t.x - b.x, dy = t.y - b.y, dz = t.z - b.z, l = Math.hypot(dx, dy, dz) || 1, sp = 190 + W.speed; b.vx = lerp(b.vx, dx / l * sp, dt * 6); b.vy = lerp(b.vy, dy / l * sp, dt * 6); b.vz = lerp(b.vz, dz / l * sp, dt * 6); }
    }
    if (b.tiny) { continue; }
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.fr) {
      for (const e of W.ents) {
        if (e.dead || e.targetable === false && e.kind !== 'boss') { if (e.kind === 'tower' && Math.abs(e.x - b.x) < 3 && Math.abs(e.z - b.z) < 5 && b.y < e.y + e.h) { b.dead = true; burst(W, b.x, b.y, b.z, 3, C.white, 10, 0.5); } continue; }
        const rad = e.kind === 'boss' ? 11 : e.r + 0.8, hh = e.kind === 'boss' ? 8 : rad;
        if (Math.abs(e.x - b.x) < rad && Math.abs(e.y - b.y) < hh && Math.abs(e.z - b.z) < rad + 6 + (e.kind === 'boss' ? 6 : 0) && !(e.kind === 'chaser' && b.ally)) {
          damageEnemy(W, e, b.dmg, b.ally); b.dead = true; burst(W, b.x, b.y, b.z, 4, C.lime, 12, 0.5); break;
        }
      }
    } else {
      const rz = b.z - W.dist;
      if (rz < 0 && rz > -6 * 1 - 2 * Math.abs(b.vz) * dt && Math.hypot(b.x - p.x, b.y - p.y) < 6 && p.rollT > 0 && !p.dead) { // barrel roll deflect
        b.fr = true; b.vx = -b.vx * 0.5 + rnd(-10, 10); b.vy = -b.vy * 0.5; b.vz = 260 + W.speed; b.dmg = 4; b.life = 1.5; b.kind = 'laser'; b.reflected = true; Audio_.sfx('clang'); addScore(W, 10); continue;
      }
      if (rz < 1.5 && rz > -3 && Math.hypot(b.x - p.x, b.y - p.y) < 2.1 && !p.dead) { b.dead = true; if (!hurtPlayer(W, b.dmg)) { } }
      if (rz < -20) b.dead = true;
    }
  }
  W.bullets = W.bullets.filter(b => !b.dead);
}
function stepParts(W, dt) { for (const q of W.parts) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.vx *= 0.985; q.vy *= 0.985; } W.parts = W.parts.filter(q => q.life > 0); }

/* ---------- world rendering ---------- */
function drawBackground(W) {
  const g = Gfx.g, w = Gfx.W, h = Gfx.H, pal = W.st.pal, cam = Gfx.cam, hy = h * 0.46;
  const grad = g.createLinearGradient(0, 0, 0, hy);
  grad.addColorStop(0, `rgb(${pal.top})`); grad.addColorStop(0.6, `rgb(${pal.mid})`); grad.addColorStop(1, `rgb(${pal.bot})`);
  g.fillStyle = grad; g.fillRect(-w, -h, w * 3, h * 3);
  const space = W.st.env === 'space';
  const sx = w * 0.62 - cam.x * 4 * Gfx.u, sy = hy * 0.72;
  Gfx.glow2 = true;
  g.globalCompositeOperation = 'lighter';
  const sg = g.createRadialGradient(sx, sy, 0, sx, sy, h * (space ? 0.5 : 0.35)); sg.addColorStop(0, `rgba(${pal.sun},.9)`); sg.addColorStop(0.15, `rgba(${pal.sun},.4)`); sg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sg; g.fillRect(0, 0, w, h);
  if (space) for (let i = 0; i < 6; i++) { const nx = (hash(i * 3 + 1) * 1.4 - 0.2) * w - cam.x * (2 + i) * Gfx.u, ny = hash(i * 7 + 2) * h * 0.8, r = (0.25 + hash(i + 9) * 0.35) * h; const ng = g.createRadialGradient(nx, ny, 0, nx, ny, r); const c = [[150, 40, 170], [40, 80, 200], [200, 50, 120]][i % 3]; ng.addColorStop(0, `rgba(${c},.22)`); ng.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = ng; g.fillRect(0, 0, w, h); }
  g.globalCompositeOperation = 'source-over';
  if (space) {
    for (let i = 0; i < 220; i++) { const z0 = hash(i * 5 + 3) * 600, z = ((z0 - W.dist * 0.6) % 600 + 600) % 600 + 30, x = (hash(i) - 0.5) * 700, y = (hash(i + 99) - 0.5) * 500, s = 260 / z, X = w / 2 + (x - cam.x) * s * Gfx.u * 2.2, Y = hy - (y - cam.y) * s * Gfx.u * 2.2; if (X < 0 || X > w || Y < 0 || Y > h) continue; const a = clamp(1 - z / 650, 0.2, 1); g.fillStyle = `rgba(255,255,255,${a})`; const sz = Math.max(1, s * 2 * Gfx.u); if (W.speed > BASE_SPEED * 1.3) { g.strokeStyle = `rgba(255,255,255,${a * 0.6})`; g.lineWidth = sz; g.beginPath(); g.moveTo(X, Y); g.lineTo(X + (X - w / 2) * 0.05 * (W.speed / BASE_SPEED), Y + (Y - hy) * 0.05 * (W.speed / BASE_SPEED)); g.stroke(); } else g.fillRect(X, Y, sz, sz); }
  } else {
    // distant ridge silhouettes
    for (let k = 0; k < 2; k++) { g.fillStyle = k ? `rgba(${pal.fog.map(v => v * 0.55 | 0)},1)` : `rgba(${pal.fog.map(v => v * 0.8 | 0)},1)`; g.beginPath(); g.moveTo(0, hy); for (let x = 0; x <= w; x += w / 40) { const hh = (Math.sin(x / w * 7 + k * 2 + cam.x * 0.01) * 0.5 + 0.5) * h * (k ? 0.1 : 0.16) + hash(Math.floor(x / (w / 40)) + k * 50) * h * 0.04; g.lineTo(x - cam.x * (k ? 6 : 3) * Gfx.u % w, hy - hh); } g.lineTo(w, hy); g.closePath(); g.fill(); }
  }
}
function drawGround(W) {
  if (W.st.env === 'space') return;
  const g = Gfx.g, pal = W.st.pal, cam = Gfx.cam, w = Gfx.W, h = Gfx.H, hy = h * 0.46, gy = W.st.ground;
  const grad = g.createLinearGradient(0, hy, 0, h); grad.addColorStop(0, `rgb(${pal.fog})`); grad.addColorStop(0.25, `rgb(${pal.ground.map(v => v * 1.2 | 0)})`); grad.addColorStop(1, `rgb(${pal.ground.map(v => v * 0.6 | 0)})`);
  g.fillStyle = grad; g.fillRect(0, hy, w, h - hy);
  const step = 30, z0 = Math.ceil((cam.z + 3) / step) * step;
  g.lineWidth = Math.max(1, Gfx.u * 1.5);
  for (let z = z0; z < cam.z + Gfx.fogFar; z += step) { const q = Gfx.proj(0, gy, z); if (!q) continue; const a = 1 - clamp((z - cam.z) / Gfx.fogFar, 0, 1); g.strokeStyle = `rgba(${pal.grid},${a * 0.45})`; g.beginPath(); g.moveTo(0, q[1]); g.lineTo(w, q[1]); g.stroke(); }
  for (let x = -300; x <= 300; x += 20) { for (let k = 0; k < 5; k++) { const za = cam.z + 3 + k * k * 16, zb = cam.z + 3 + (k + 1) * (k + 1) * 16, a = Gfx.proj(x, gy, za), b = Gfx.proj(x, gy, zb); if (!a || !b) continue; g.strokeStyle = `rgba(${pal.grid},${(1 - k / 5) * 0.4})`; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } }
  // player shadow
  const p = W.p; const q = Gfx.proj(p.x, gy, W.dist); if (q && !p.dead) { g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(q[0], q[1], 3 * q[2], 0.6 * q[2], 0, 0, TAU); g.fill(); }
}
function collectDraw(W, list) {
  const cam = Gfx.cam, st = W.st, space = st.env === 'space', gy = st.ground;
  // decor
  const cell = 22, k0 = Math.floor(W.dist / cell);
  for (let k = k0 + 1; k < k0 + Math.ceil(Gfx.fogFar / cell) + 2; k++) {
    const z = k * cell, sd = k * 3.1 + W.stageIdx * 100;
    for (const side of [-1, 1]) {
      const r = hash(sd + side), r2 = hash(sd + side * 7 + 1), r3 = hash(sd + side * 13 + 2);
      if (space) { if (r < 0.35) list.push({ z, fn: () => Gfx.mesh(Meshes.rock, side * (60 + r2 * 100), (r3 - 0.5) * 120, z, { s: 6 + r3 * 14, rx: k, ry: k * 0.7, rz: k * 0.3 }) }); }
      else {
        const x = side * (42 + r2 * 40), hgt = 25 + r * 55, wd = 10 + r3 * 14;
        list.push({ z, fn: () => { Gfx.mesh(Meshes.pillar, x, gy, z, { sx: wd, sy: hgt, sz: wd * 0.9 }); Gfx.mesh(Meshes.cap, x, gy + hgt, z, { sx: wd * 1.4, sy: 3, sz: wd * 1.3 }); for (let j = 0; j < 3; j++) Gfx.mesh(Meshes.tree, x - side * (wd * 0.7 + 2 + j * 3), gy + 0.01, z + j * 4 - 4, { s: 5 + hash(sd + j) * 5 }); } });
        if (r2 < 0.7) { const tx = side * (12 + hash(sd + 5) * 24); list.push({ z: z + 5, fn: () => Gfx.mesh(Meshes.tree, tx, gy, z + 5, { s: 4 + hash(sd + 4) * 6 }) }); }
      }
    }
  }
  // entities
  for (const e of W.ents) {
    const z = e.z; if (z - cam.z < 1) continue;
    list.push({ z, fn: () => drawEnt(W, e) });
  }
  W.allies.forEach(a => { if (!a.alive) return; const z = W.dist + a.rz; list.push({ z, fn: () => { Gfx.mesh(Meshes[a.def.mesh], a.x, a.y, z, { rz: -(a.vx || 0) * 0.08, s: 1, flash: a.hurtT > 0 ? 0.6 : 0 }); Gfx.glow(a.x, a.y, z - 2, 3, 'rgba(120,220,255,.8)', 0.5); } }); });
  if (!W.p.dead && W.state !== 'gameover') list.push({ z: W.dist, fn: () => drawPlayer(W) });
  for (const b of W.bullets) { if (b.tiny) { const a = b.ally; list.push({ z: W.dist + a.rz, fn: () => { Gfx.line([b.x, b.y, b.z], [a.x, a.y, W.dist + a.rz], '#ff5050', 3 * Gfx.u); } }); continue; } list.push({ z: b.z, fn: () => drawBullet(W, b) }); }
  for (const q of W.parts) list.push({ z: q.z, fn: () => { const a = clamp(q.life / q.max, 0, 1); Gfx.g.globalCompositeOperation = 'lighter'; Gfx.glow(q.x, q.y, q.z, q.size * (q.flare ? 1 + (1 - a) * 2 : 1), `rgb(${q.col})`, a); Gfx.g.globalCompositeOperation = 'source-over'; } });
}
function drawPlayer(W) {
  const p = W.p, z = W.dist, roll = p.bank + (p.rollT > 0 ? (1 - p.rollT / 0.55) * TAU * p.rollDir * -1 : 0);
  if (p.inv > 0 && Math.floor(W.t * 20) % 2 === 0 && p.rollT <= 0 && W.mode !== 'attract') return;
  Gfx.mesh(Meshes.arwing, p.x, p.y, z, { rz: roll, rx: -p.vy * 0.006, ry: -p.vx * 0.004, s: 1.1 });
  Gfx.g.globalCompositeOperation = 'lighter';
  const f = p.boosting ? 2.2 : p.braking ? 0.5 : 1; Gfx.glow(p.x - 0.8, p.y, z - 2, 1.6 * f, 'rgba(120,220,255,.9)', 0.9); Gfx.glow(p.x + 0.8, p.y, z - 2, 1.6 * f, 'rgba(120,220,255,.9)', 0.9);
  if (p.rollT > 0) Gfx.glow(p.x, p.y, z, 6, 'rgba(180,255,200,.6)', 0.6);
  Gfx.g.globalCompositeOperation = 'source-over';
}
function drawBullet(W, b) {
  const g = Gfx.g; g.globalCompositeOperation = 'lighter';
  if (b.kind === 'laser') { const c = b.reflected ? '#ffd060' : b.ally ? '#7fe3ff' : b.lvl === 3 ? '#9ff0ff' : '#b8ff60'; Gfx.line([b.x, b.y, b.z], [b.x - b.vx * 0.02, b.y - b.vy * 0.02, b.z - 7], c, 3.5 * Gfx.u); Gfx.glow(b.x, b.y, b.z, 1.4, c, 0.8); }
  else if (b.kind === 'missile') { Gfx.glow(b.x, b.y, b.z, 2.2, 'rgba(255,170,60,1)', 1); Gfx.line([b.x, b.y, b.z], [b.x - b.vx * 0.05, b.y - b.vy * 0.05, b.z - b.vz * 0.05], '#ffe090', 4 * Gfx.u); }
  else { Gfx.glow(b.x, b.y, b.z, 2.2, 'rgba(255,70,140,1)', 1); Gfx.glow(b.x, b.y, b.z, 0.9, 'rgba(255,230,240,1)', 1); }
  g.globalCompositeOperation = 'source-over';
}
function drawEnt(W, e) {
  const g = Gfx.g, z = e.z, fl = e.flash * 0.8;
  switch (e.kind) {
    case 'dart': case 'chaser': Gfx.mesh(Meshes.dart, e.x, e.y, z, { rz: e.rz, ry: Math.PI, flash: fl, s: e.kind === 'chaser' ? 1.3 : 1 }); break;
    case 'heavy': Gfx.mesh(Meshes.heavy, e.x, e.y, z, { ry: Math.PI, flash: fl, s: 1 }); break;
    case 'turret': Gfx.mesh(Meshes.turret, e.x, e.y, z, { ry: Math.PI, flash: fl, s: 1.2 }); break;
    case 'rock': Gfx.mesh(Meshes.rock, e.x, e.y, z, { s: e.s, rx: e.rx, ry: e.ry, rz: e.rz, flash: fl }); break;
    case 'mine': Gfx.mesh(Meshes.mine, e.x, e.y, z, { s: 1.1, ry: e.t * 2, rx: e.t, flash: fl }); Gfx.glow(e.x, e.y, z, 3, 'rgba(255,140,40,.8)', 0.5 + 0.4 * Math.sin(e.t * 8)); break;
    case 'tower': Gfx.mesh(Meshes.pillar, e.x, e.y, z, { sx: 5, sy: e.h, sz: 5 }); Gfx.mesh(Meshes.cap, e.x, e.y + e.h, z, { sx: 8, sy: 2.5, sz: 8 }); break;
    case 'gate': drawGate(W, e); break;
    case 'ring': { Gfx.g.globalCompositeOperation = 'lighter'; Gfx.ring(e.x, e.y, z, 7, '#ffe070', 6 * Gfx.u, 24, e.t * 2); Gfx.ring(e.x, e.y, z, 5.5, '#fff6c0', 3 * Gfx.u, 24, -e.t * 2); Gfx.glow(e.x, e.y, z, 8, 'rgba(255,220,100,.35)', 1); Gfx.g.globalCompositeOperation = 'source-over'; break; }
    case 'power': { const col = e.pk === 'bomb' ? '255,120,60' : e.pk === 'laser' ? '120,230,255' : '120,255,140'; Gfx.mesh(Meshes.mine, e.x, e.y, z, { s: 1.4, ry: e.t * 3, rx: 0.4, tint: e.pk === 'bomb' ? C.orange : e.pk === 'laser' ? C.cyan : C.fern, tintAll: true }); Gfx.g.globalCompositeOperation = 'lighter'; Gfx.glow(e.x, e.y, z, 5, `rgba(${col},.8)`, 0.7); Gfx.g.globalCompositeOperation = 'source-over'; const q = Gfx.proj(e.x, e.y + 3.5, z); if (q) Gfx.text(e.pk === 'bomb' ? 'B' : e.pk === 'laser' ? 'L' : '+', q[0], q[1], 26 * Math.min(2, q[2] / 6 + 0.4), '#fff', 'center'); break; }
    case 'boss': drawBoss(W, e); break;
  }
  if (W.p.locks.includes(e)) { const q = Gfx.proj(e.x, e.y, z); if (q) { const R = Math.max(26 * Gfx.u, e.r * q[2] * 1.3); g.strokeStyle = '#ff4060'; g.lineWidth = 3 * Gfx.u; const k = R * 0.4; for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.beginPath(); g.moveTo(q[0] + sx * R, q[1] + sy * (R - k)); g.lineTo(q[0] + sx * R, q[1] + sy * R); g.lineTo(q[0] + sx * (R - k), q[1] + sy * R); g.stroke(); } } }
}
function drawGate(W, e) {
  const g = Gfx.g, z = e.z, X = 70, Y = 50, pr = (x, y) => Gfx.proj(x, y, z);
  const a = pr(-X, -Y), b = pr(X, -Y), c = pr(X, Y), d = pr(-X, Y), h = pr(e.gx, e.gy); if (!a || !b || !c || !d || !h) return;
  g.save(); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath();
  g.moveTo(h[0] + 7 * h[2], h[1]); g.arc(h[0], h[1], 7 * h[2], 0, TAU, true);
  g.fillStyle = Gfx.fogMix(W.st.env === 'space' ? [90, 40, 110] : [30, 90, 50], h[3], 1); g.fill('evenodd');
  g.strokeStyle = Gfx.fogMix([200, 255, 120], h[3]); g.lineWidth = 4 * Gfx.u; g.stroke(); g.restore();
  g.globalCompositeOperation = 'lighter'; Gfx.ring(e.gx, e.gy, z, 7.5, '#d8ff70', 5 * Gfx.u, 28, e.t); g.globalCompositeOperation = 'source-over';
}
function drawBoss(W, e) {
  const sp = e.sp, z = e.z, fl = e.flash * 0.8, dy = e.dying ? Math.sin(e.t * 40) * 0.3 : 0;
  if (!sp) {
    Gfx.mesh(Meshes.boss1, e.x, e.y + dy, z, { ry: Math.PI, flash: fl, s: 1 });
    if (e.open) { Gfx.mesh(Meshes.boss1core, e.x, e.y + 1, z - 6, { s: 1.6 + Math.sin(e.t * 8) * 0.2, ry: e.t * 3, flash: fl }); Gfx.g.globalCompositeOperation = 'lighter'; Gfx.glow(e.x, e.y + 1, z - 6, 9, 'rgba(255,60,60,.8)', 0.8); Gfx.g.globalCompositeOperation = 'source-over'; }
  } else {
    Gfx.mesh(Meshes.boss2, e.x, e.y + dy, z, { ry: Math.PI, flash: fl, s: 1.1 });
    if (e.open) { Gfx.mesh(Meshes.boss1core, e.x, e.y + 3, z - 10, { s: 1.8 + Math.sin(e.t * 8) * 0.2, ry: e.t * 3, flash: fl }); Gfx.g.globalCompositeOperation = 'lighter'; Gfx.glow(e.x, e.y + 3, z - 10, 10, 'rgba(255,60,200,.8)', 0.8); Gfx.g.globalCompositeOperation = 'source-over'; }
  }
}
function renderWorld(W) {
  const g = Gfx.g, p = W.p, cam = Gfx.cam;
  const sh = W.shakeT * 12 * Settings.shake * Gfx.u;
  cam.x = p.x * 0.55; cam.y = p.y * 0.45 + 3.2; cam.z = W.dist - 16;
  g.save();
  g.translate(rnd(-sh, sh), rnd(-sh, sh));
  g.translate(Gfx.W / 2, Gfx.H / 2); g.rotate(p.bank * 0.35 - (p.rollT > 0 ? 0 : 0)); g.translate(-Gfx.W / 2, -Gfx.H / 2);
  drawBackground(W); drawGround(W);
  const list = []; collectDraw(W, list); list.sort((a, b) => b.z - a.z);
  for (const it of list) it.fn();
  // bomb shockwave
  for (const w of W.waves) { Gfx.g.globalCompositeOperation = 'lighter'; const r = w.t * 400, a = 1 - w.t; Gfx.ring(w.x, w.y, W.dist + w.t * 300, r * 0.2, '#ffd080', 12 * Gfx.u * a, 36, 0, a); Gfx.g.globalCompositeOperation = 'source-over'; }
  // reticles
  if (!p.dead && W.state !== 'victory' && W.state !== 'bossdead') {
    const r1 = Gfx.proj(p.x, p.y, W.dist + 30), r2 = Gfx.proj(p.x, p.y, W.dist + 70);
    g.lineWidth = 3 * Gfx.u; if (r1) { g.strokeStyle = p.charge > 0.32 ? '#ff6080' : '#b8ff70'; g.beginPath(); g.arc(r1[0], r1[1], 22 * Gfx.u, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(r1[0] - 34 * Gfx.u, r1[1]); g.lineTo(r1[0] - 14 * Gfx.u, r1[1]); g.moveTo(r1[0] + 34 * Gfx.u, r1[1]); g.lineTo(r1[0] + 14 * Gfx.u, r1[1]); g.stroke(); }
    if (r2) { g.strokeStyle = 'rgba(184,255,112,.7)'; g.beginPath(); g.arc(r2[0], r2[1], 12 * Gfx.u, 0, TAU); g.stroke(); }
    if (p.charge > 0.32 && r1) { g.strokeStyle = '#ff6080'; g.beginPath(); g.arc(r1[0], r1[1], (30 + Math.sin(W.t * 20) * 3) * Gfx.u, 0, TAU * Math.min(1, p.locks.length / 6 + 0.1)); g.stroke(); }
  }
  g.restore();
  if (W.flash > 0) { g.fillStyle = `rgba(255,240,200,${W.flash * 0.8})`; g.fillRect(0, 0, Gfx.W, Gfx.H); }
  if (W.hurt > 0) { const gr = g.createRadialGradient(Gfx.W / 2, Gfx.H / 2, Gfx.H * 0.3, Gfx.W / 2, Gfx.H / 2, Gfx.H * 0.95); gr.addColorStop(0, 'rgba(255,0,0,0)'); gr.addColorStop(1, `rgba(255,0,30,${W.hurt * 0.65})`); g.fillStyle = gr; g.fillRect(0, 0, Gfx.W, Gfx.H); }
  if (p.boosting) { g.strokeStyle = 'rgba(200,240,255,.25)'; g.lineWidth = 2 * Gfx.u; for (let i = 0; i < 24; i++) { const a = hash(i + Math.floor(W.t * 30)) * TAU, r0 = Gfx.H * (0.35 + hash(i * 3) * 0.2), r1 = r0 + Gfx.H * 0.25; g.beginPath(); g.moveTo(Gfx.W / 2 + Math.cos(a) * r0 * 1.4, Gfx.H / 2 + Math.sin(a) * r0); g.lineTo(Gfx.W / 2 + Math.cos(a) * r1 * 1.4, Gfx.H / 2 + Math.sin(a) * r1); g.stroke(); } }
}
