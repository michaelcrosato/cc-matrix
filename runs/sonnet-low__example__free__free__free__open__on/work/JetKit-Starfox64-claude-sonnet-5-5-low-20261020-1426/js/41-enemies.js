// ---------- enemies, bosses, obstacles, mission scripts ----------
const BTN = { fire: ['✕', 'Space'], charge: ['□', 'L'], bomb: ['○', 'K'], roll: ['L1 / R1', 'Q / E'], boost: ['R2', 'Shift'], brake: ['L2', 'Ctrl'], flip: ['△', 'U'] };
const btn = k => BTN[k][Input.device === 'pad' ? 0 : 1];
const fillBtns = t => t.replace(/\{(\w+)\}/g, (m, k) => BTN[k] ? btn(k) : m);

const DEFS = {
  drone: { mesh: GFX.drone, hp: 1, r: 1.9, score: 100 },
  swoop: { mesh: GFX.swoop, hp: 2, r: 1.9, score: 200 },
  turret: { mesh: GFX.turret, hp: 4, r: 2.4, score: 250 },
  boulder: { mesh: () => { const m = GFX.asteroid(3.4); m.material.color.set(0x7a3a24); m.material.emissive.set(0x501000); m.material.emissiveIntensity = .5; return m; }, hp: 3, r: 3.6, score: 120, noLock: false },
  chaser: { mesh: GFX.drone, hp: 3, r: 1.9, score: 300 },
  fighter: { mesh: GFX.swoop, hp: 2, r: 2, score: 150 },
  relay: { mesh: GFX.relay, hp: 16, r: 6, score: 900 },
  walker: { mesh: GFX.walker, hp: 110, r: 8, score: 6000 },
  cruiser: { mesh: GFX.cruiser, hp: 100, r: 9, score: 6000 },
  rival: { mesh: () => { const m = GFX.ship(0x2c2c3a, 0xc02222, 0xff3030); m.scale.setScalar(1.25); m.rotation.order = 'YXZ'; return m; }, hp: 75, r: 3.2, score: 5000 }
};
function spawn(type, x, y, z, o = {}) {
  const d = DEFS[type], m = d.mesh(); m.position.set(x, y, z); if (type !== 'rival') m.rotation.set(0, Math.PI, 0); GFX.scene.add(m);
  const e = Object.assign({ type, mesh: m, pos: m.position, vel: new V(), dir: new V(0, 0, 1), hp: d.hp, maxHp: d.hp, r: d.r, score: d.score, t: 0, fireT: rnd(.6, 1.6), dead: false, pulse: 0, stun: 0, x0: x, y0: y }, o);
  if (type === 'drone' || type === 'chaser') { m.userData.eye = m.children[m.children.length - 1]; }
  G.enemies.push(e); return e;
}
G.spawn = spawn;
const railZ = () => G.P.pos.z;
const smooth = k => k * k * (3 - 2 * k);

// ---- obstacles (rail gates)
G.gate = function (gx, gy, gw = 14, gh = 11) {
  const z = railZ() - 300, th = 5, big = 80, th2 = G.mission.theme === 'canyon'; const col = th2 ? 0x5a2a20 : 0x8896b0;
  const parts = [[-big, gx - gw / 2, -40, 70], [gx + gw / 2, big, -40, 70], [gx - gw / 2, gx + gw / 2, -40, gy - gh / 2], [gx - gw / 2, gx + gw / 2, gy + gh / 2, 70]];
  const grp = new THREE.Group(); const boxes = [];
  for (const [x0, x1, y0, y1] of parts) { if (x1 - x0 < .5 || y1 - y0 < .5) continue;
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, th), new THREE.MeshStandardMaterial({ color: col, roughness: .6, metalness: .5, emissive: th2 ? 0x300800 : 0x101828, emissiveIntensity: .6 }));
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0); m.castShadow = m.receiveShadow = true; grp.add(m); boxes.push([x0, x1, y0, y1]); }
  const fr = new THREE.Mesh(new THREE.BoxGeometry(gw + .8, gh + .8, .6), GFX.glowMat(0xffd25a, .55)); fr.position.set(gx, gy, th / 2 + .1); grp.add(fr);
  grp.position.z = z; GFX.scene.add(grp);
  G.obst.push({ gx, gy, mesh: grp, z, boxes: boxes.map(b => new THREE.Box3(new V(b[0], b[2], z - th / 2), new V(b[1], b[3], z + th / 2))), box: { containsPoint: p => boxes.some(b => p.x > b[0] && p.x < b[1] && p.y > b[2] && p.y < b[3] && Math.abs(p.z - z) < th / 2) } });
};
function obstaclesUpdate(dt) {
  const P = G.P;
  for (let i = G.obst.length - 1; i >= 0; i--) { const o = G.obst[i];
    if (!P.dead && P.iframes <= 0 && Math.abs(P.pos.z - o.z) < 4) for (const b of o.boxes) if (b.distanceToPoint(P.pos) < 1.5) { G.hurt(22); P.vx = -Math.sign(P.px - (b.min.x + b.max.x) / 2 || 1) * 18; GFX.burst(P.pos, 0xffaa55, 24, 22, 1.5, .6); Audio.sfx('clang'); break; }
    if (o.z > P.pos.z + 30) { GFX.scene.remove(o.mesh); G.obst.splice(i, 1); } }
}

// ---- enemy behaviours
const UPD = {
  drone(e, dt) { const P = G.P, rel = e.pos.z - P.pos.z; e.pos.z += (e.vz ?? 24) * dt; e.pos.x = e.x0 + (e.sx || 0) * e.t + Math.sin(e.t * (e.f || 1.4) + (e.ph || 0)) * (e.amp ?? 3); e.pos.y = e.y0 + Math.cos(e.t * (e.f || 1.4) * .7 + (e.ph || 0)) * (e.amp ?? 3) * .4;
    e.mesh.rotation.z = Math.sin(e.t * 2 + (e.ph || 0)) * .4; e.fireT -= dt; if (e.fireT <= 0 && rel < -30 && rel > -160) { e.fireT = rnd(1.5, 2.5); G.aimShot(e, 60, 8, .012); }
    if (rel > 25) e.dead = true, e.nopts = true, e.nodrop = true; },
  swoop(e, dt) { const P = G.P, rel = e.pos.z - P.pos.z; e.pos.z += 36 * dt; e.pos.x = e.x0 * Math.cos(e.t * 1.0); e.pos.y = e.y0 + Math.sin(e.t * 2) * 4; e.mesh.rotation.z = -Math.sin(e.t * 1) * .9 * Math.sign(e.x0);
    e.fireT -= dt; if (e.fireT <= 0 && rel < -30 && rel > -150) { e.fireT = rnd(1.2, 1.8); G.aimShot(e, 66, 8, .01); }
    if (rel > 25) e.dead = true, e.nopts = true, e.nodrop = true; },
  turret(e, dt) { const P = G.P, rel = e.pos.z - P.pos.z; e.pos.y = e.y0; const h = e.mesh.userData.head; _a.copy(P.pos).sub(e.pos); h.rotation.y = Math.atan2(-_a.x, -_a.z) + Math.PI; h.rotation.x = 0;
    e.fireT -= dt; if (e.fireT <= 0 && rel < -35 && rel > -170) { e.fireT = rnd(1.3, 2); _c.copy(e.pos); _c.y += 3; G.aimShot({ pos: _c }, 70, 8, .008); }
    if (rel > 25) { e.dead = true; e.nopts = true; e.nodrop = true; if (e.pad) GFX.scene.remove(e.pad); } },
  boulder(e, dt) { const P = G.P, rel = e.pos.z - P.pos.z; e.pos.z += 14 * dt; e.pos.x += e.vx * dt; if (Math.abs(e.pos.x) > 20) e.vx *= -1; e.mesh.rotation.x -= dt * 3; e.mesh.rotation.z += dt * e.vx * .1;
    if (rel > 25) e.dead = true, e.nopts = true, e.nodrop = true; },
  chaser(e, dt) { const w = e.chasing; if (!w || !w.alive) { e.pos.z += 30 * dt; if (e.pos.z > G.P.pos.z + 20) e.dead = true, e.nopts = true, e.nodrop = true; return; }
    _a.set(w.pos.x + Math.sin(e.t * 3) * 2, w.pos.y + Math.cos(e.t * 2) * 1.5, w.pos.z + 16 - Math.min(e.t * 2, 8)); if (!G.isRail()) _a.copy(w.pos).addScaledVector(w.dir, -14);
    e.pos.lerp(_a, 1 - Math.exp(-3 * dt)); w.sweep = 1; e.fireT -= dt; if (e.fireT <= 0) { e.fireT = .75; _b.copy(w.pos).sub(e.pos).normalize(); G.eshot(e.pos, _b, 80, 5, 0xff7a3a, .8); Audio.sfx('enemylaser'); }
    e.tc = (e.tc || 0) + dt; if (e.tc > 14) { e.dead = true; e.nopts = true; Radio.say(w.id, 'Shook him off... finally.'); w.hp = Math.max(10, w.hp - 20); } },
  fighter(e, dt) {
    const P = G.P; const tg = e.tgt && e.tgt.alive ? e.tgt : P; if (tg !== P && !tg.alive) e.tgt = null; if (tg === P && P.dead) { e.dir.lerp(_a.set(rnd(-1, 1), 0, rnd(-1, 1)).normalize(), dt); }
    _b.copy(tg.pos).sub(e.pos); const d = _b.length(); _b.addScaledVector(tg.vel || P.vel, d / 110).normalize();
    e.breakT = (e.breakT || 0) - dt; if (d < 22 && e.breakT <= 0 && Math.random() < .03) { e.breakT = 1.4; e.bdir = _a.set(rnd(-1, 1), rnd(-.6, .6), rnd(-1, 1)).normalize().clone(); }
    if (e.breakT > 0) _b.copy(e.bdir); e.dir.lerp(_b, 1 - Math.exp(-(e.breakT > 0 ? 3.5 : 1.7) * dt)).normalize();
    const sp = (e.breakT > 0 ? 70 : d > 160 ? 78 : 56) * (e.stun > 0 ? .3 : 1); e.pos.addScaledVector(e.dir, sp * dt); e.vel.copy(e.dir).multiplyScalar(sp); faceDir(e.mesh, e.dir); e.mesh.rotation.z += Math.sin(e.t * 2) * .3;
    e.fireT -= dt; if (e.fireT <= 0 && e.dir.dot(_b) > .95 && d < 140 && d > 15) { e.fireT = rnd(1.1, 2); G.aimShot(e, 90, 7, .006, tg); }
    for (const r of G.rocks) { const dd = e.pos.distanceTo(r.pos); if (dd < r.r + 3) e.pos.addScaledVector(_a.copy(e.pos).sub(r.pos).normalize(), r.r + 3 - dd); }
    if (e.pos.length() > 460) e.dir.lerp(_a.copy(e.pos).negate().normalize(), .1);
  },
  relay(e, dt) { e.mesh.userData.rings[0].rotation.y += dt; e.mesh.userData.rings[1].rotation.z += dt * 1.3; e.fireT -= dt; const d = e.pos.distanceTo(G.P.pos);
    if (e.fireT <= 0 && d < 190) { e.fireT = rnd(1.8, 2.6); for (let i = 0; i < 3; i++) G.aimShot(e, 72, 7, .03); } },
  rival(e, dt) {
    const P = G.P, name = e; e.mesh.userData.glows.forEach(g => { const s = 2.1 + Math.random() * .4; g.scale.set(s, s, 1); });
    _b.copy(P.pos).sub(e.pos); const d = _b.length(); _b.addScaledVector(P.vel, d / 120).normalize();
    G.fwd(_c); const behind = _c.dot(_d.copy(e.pos).sub(P.pos).normalize()) > .85 && d < 130;
    e.tailT = behind ? (e.tailT || 0) + dt : 0; e.breakT = (e.breakT || 0) - dt; e.rollT = (e.rollT || 0) - dt;
    if ((e.tailT > 1.4 || (d < 30 && Math.random() < .02)) && e.breakT <= 0) { e.breakT = 1.8; e.rollT = .7; e.bdir = _a.set(rnd(-1, 1), rnd(-.7, .7), rnd(-1, 1)).normalize().clone(); e.tailT = 0; }
    if (e.breakT > 0) _b.copy(e.bdir); e.dir.lerp(_b, 1 - Math.exp(-(e.breakT > 0 ? 4 : 2.3) * dt)).normalize(); const sp = (e.breakT > 0 ? 95 : d > 120 ? 100 : 70) * (e.stun > 0 ? .3 : 1);
    e.pos.addScaledVector(e.dir, sp * dt); e.vel.copy(e.dir).multiplyScalar(sp); faceDir(e.mesh, e.dir); if (e.rollT > 0) e.mesh.rotation.z += (.7 - e.rollT) * 14; e.rolling = e.rollT > 0; e.shield = false;
    e.burst = (e.burst || 0) - dt; e.fireT -= dt; const aim = e.dir.dot(_b);
    if (e.fireT <= 0 && d < 170 && aim > .93) { if (!(e.shots > 0)) e.shots = 3; e.fireT = .16; G.aimShot(e, 130, 9, .004); e.shots--; if (e.shots <= 0) e.fireT = (e.hp < e.maxHp * .5 ? 1.2 : 2); }
    for (const r of G.rocks) { const dd = e.pos.distanceTo(r.pos); if (dd < r.r + 4) e.pos.addScaledVector(_a.copy(e.pos).sub(r.pos).normalize(), r.r + 4 - dd); }
    if (e.pos.length() > 440) e.dir.lerp(_a.copy(e.pos).negate().normalize(), .15);
  },
  walker(e, dt) { bossUpdate(e, dt); const U = e.mesh.userData; U.legs.forEach((l, i) => l.rotation.x = Math.sin(e.t * 2 + i * 1.6) * .25); U.ring.rotation.z += dt * (e.open ? 3 : 1);
    U.plates.forEach((p, i) => p.rotation.y = damp(p.rotation.y, (i ? 1 : -1) * (e.open ? 1.3 : .45), 5, dt)); U.core.material.emissiveIntensity = e.open ? 2.2 + Math.sin(e.t * 12) * .8 : .4; },
  cruiser(e, dt) { bossUpdate(e, dt); }
};
function bossUpdate(e, dt) {
  const P = G.P; e.dz = damp(e.dz ?? 240, e.shielded0 ? 120 : 112, 1.2, dt); e.pos.z = P.pos.z - e.dz; e.pos.x = Math.sin(e.t * .45) * 13 + P.px * .25; e.pos.y = e.y0 + Math.sin(e.t * .8) * 3;
  e.mesh.rotation.z = Math.sin(e.t * .45) * .12; const rage = e.hp < e.maxHp * .5 ? 1.5 : 1; e.pt -= dt;
  if (e.pt <= 0) { e.open = !e.open; e.pt = e.open ? (rage > 1 ? 5 : 6.5) : (rage > 1 ? 3.5 : 5); e.shield = !e.open; Audio.sfx(e.open ? 'warn' : 'clang'); if (!e.open && G.enemies.length < 9) { for (let i = 0; i < 2; i++) spawn('swoop', (i ? 1 : -1) * 32, rnd(0, 8), e.pos.z + 20, { x0: (i ? 1 : -1) * 34, y0: rnd(0, 8) }); } if (e.open) Radio.say('hq', e.open && e.type === 'walker' ? 'The core is exposed — hit it now!' : 'Hatch open! Fire everything at the bridge!', 2.5); }
  e.bubble.material.opacity = damp(e.bubble.material.opacity, e.open ? 0 : .28, 8, dt); e.bubble.scale.setScalar(1 + Math.sin(e.t * 6) * .01);
  e.fireT -= dt; if (e.fireT <= 0) {
    if (!e.open) { e.fireT = 1.15 / rage; for (let i = -1; i <= 1; i++) { _c.copy(e.pos); _c.x += i * 4; G.aimShot({ pos: _c }, 64, 8, .02 + Math.abs(i) * .02); } }
    else { e.fireT = 1.5 / rage; const n = rage > 1 ? 12 : 8, off = rnd(6.28); for (let i = 0; i < n; i++) { const a = off + i / n * 6.28; G.eshot(e.pos, _d.set(Math.cos(a) * .55, Math.sin(a) * .35, 1), 46, 7, 0xff9a2a, 1.3); } Audio.sfx('enemylaser'); }
  }
  G.boss = e;
}
function enemiesUpdate(dt) {
  const P = G.P;
  obstaclesUpdate(dt);
  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    if (!e.dead) {
      e.t += dt; e.stun = Math.max(0, e.stun - dt); if (G.state === 'play') UPD[e.type](e, dt);
      if (e.pulse > 0) { e.pulse -= dt; if (!e.boss) e.mesh.scale.setScalar(1 + e.pulse * 1.2); } else if (!e.boss && e.mesh.scale.x !== 1 && e.type !== 'rival') e.mesh.scale.setScalar(1);
      if (!e.dead && !P.dead && !e.ghost && G.state === 'play') { const rr = e.r + 1.5; if (e.pos.distanceToSquared(P.pos) < rr * rr) { G.hurt(e.boss ? 15 : 18); if (!e.boss && e.type !== 'relay' && e.type !== 'rival') G.kill(e); else { _a.copy(P.pos).sub(e.pos).normalize(); P.pos.addScaledVector(_a, 3); P.vx += _a.x * 20; } } }
      if (!G.isRail() && !e.dead) { for (const w of G.wing) if (w.alive && e.type === 'fighter' && e.pos.distanceToSquared(w.pos) < 12) { hurtWing(w, 8); e.dead = true; GFX.explode(e.pos, .8); } }
    }
    if (e.dead) { GFX.scene.remove(e.mesh); if (G.boss === e && e.type !== 'rival') { /* keep ref for victory */ } G.enemies.splice(i, 1); }
  }
  if (!G.isRail()) for (const r of G.rocks) { _a.copy(P.pos).sub(r.pos); const d = _a.length(); if (d < r.r + 1.6 && !P.dead) { G.hurt(15); P.pos.addScaledVector(_a.normalize(), r.r + 1.6 - d + 1); P.speed *= .5; } }
}
// boss defeat → victory
function bossDown(e) { G.won = true; G.outT = 0; Radio.say('hq', 'Target destroyed! Outstanding flying, Kit!'); banner('MISSION COMPLETE', 4); Audio.sfx('win'); for (const s of G.eshots) GFX.scene.remove(s.mesh); G.eshots = [];
  for (let i = 0; i < 8; i++) setTimeout(() => G.state === 'play' && GFX.explode(_c.copy(e.pos).add(_d.set(rnd(-8, 8), rnd(-5, 5), rnd(-6, 6))).clone(), 2), i * 280); }

// ---- scripted spawns (rail)
const CMD = {
  say: (who, t) => Radio.say(who, t),
  hint: t => { if (Settings.hints) Radio.say('sys', fillBtns(t), 5); },
  banner: t => banner(t, 2),
  v(n) { const z = railZ() - 300; for (let i = 0; i < n; i++) { const o = i - (n - 1) / 2; spawn('drone', o * 7, 4 + Math.abs(o) * -1.2, z + Math.abs(o) * 7, { amp: 2, f: 1.2, ph: i * .4, vz: 26 }); } },
  line(n, side) { const z = railZ() - 300; for (let i = 0; i < n; i++) spawn('drone', side * 28 + side * -i * 3, rnd(-1, 9), z - i * 12, { sx: -side * 7, amp: 1.5, f: 2, ph: i, vz: 30 }); },
  swoop(n) { const z = railZ() - 300; for (let i = 0; i < n; i++) { const s = i % 2 ? 1 : -1; spawn('swoop', s * 34, 0, z - i * 18, { x0: s * 34, y0: rnd(0, 7) }); } },
  turret(n) { const z = railZ() - 330, gy = GFX.theme().groundY; for (let i = 0; i < n; i++) { const x = (i % 2 ? 1 : -1) * rnd(8, 22); spawn('turret', x, gy + 1, z - i * 22, { y0: gy + 1, ghostless: true }); const p = new THREE.Mesh(new THREE.CylinderGeometry(7, 8, 1, 14), new THREE.MeshStandardMaterial({ color: 0x4a5a70, metalness: .6, roughness: .5 })); p.position.set(x, gy, z - i * 22); GFX.scene.add(p); G.enemies[G.enemies.length - 1].onKill = () => GFX.scene.remove(p); G.enemies[G.enemies.length - 1].pad = p; } },
  gate: (x, y) => G.gate(x, y),
  boulders(n) { const z = railZ() - 300, gy = GFX.theme().groundY; for (let i = 0; i < n; i++) spawn('boulder', rnd(-14, 14), gy + 3.6 + rnd(0, 10), z - i * 24, { vx: rnd(-8, 8) }); },
  pick: (k, x, y) => G.pickup(k, x, y, railZ() - 260),
  tail(id) { const w = G.wing.find(w => w.id === id); if (!w || !w.alive) return; const e = spawn('chaser', w.pos.x, w.pos.y, w.pos.z + 20, { chasing: w }); w.helpT = 0; Radio.say(id, id === 'rook' ? 'Kit, one on my tail! Shoot him off me!' : "Help! I can't shake this guy!"); },
  boss(kind) { const z = railZ() - 240, P = G.P; const e = spawn(kind, 0, kind === 'walker' ? 2 : 4, z, { boss: true, name: kind === 'walker' ? 'COLOSSUS WALKER' : 'BULWARK CRUISER', open: false, pt: 4, shield: true, y0: kind === 'walker' ? 2 : 4, noLock: false, onKill: bossDown });
    if (kind === 'cruiser') e.mesh.rotation.y = Math.PI; e.bubble = new THREE.Mesh(new THREE.SphereGeometry(kind === 'walker' ? 11 : 12, 24, 16), GFX.glowMat(0x60b8ff, .28)); e.mesh.add(e.bubble); e.mesh.scale.setScalar(kind === 'walker' ? 1.5 : 1.2); e.r *= kind === 'walker' ? 1.5 : 1.2; G.boss = e;
    Audio.music('boss'); banner('WARNING<small>' + e.name + '</small>', 3); Audio.sfx('warn'); G.objText = 'Break the shield rhythm: attack when it opens'; }
};
function scriptUpdate(dt) {
  const M = G.mission, prog = G.isRail() ? -G.P.pos.z / 48 : G.time;
  while (G.si < G.script.length && prog >= G.script[G.si].at) { const s = G.script[G.si++]; CMD[s.cmd](...s.args); }
  if (G.isRail()) { if (G.boss) G.objText = G.boss.dead ? '' : (G.boss.open ? 'CORE EXPOSED — FIRE!' : 'Shielded — dodge, then strike when it opens'); else { const left = Math.max(0, Math.ceil(M.boss - prog)); G.objText = G.won ? '' : 'Distance to boss: ' + left + ' s'; } }
}
// ---- free-flight (all-range) mission logic
function initFree(M) {
  for (let i = 0; i < 70; i++) { const r = rnd(7, 26), a = rnd(6.28), d = rnd(60, 400), y = rnd(-60, 60); const m = GFX.asteroid(r); m.position.set(Math.cos(a) * d, y, Math.sin(a) * d); m.rotation.set(rnd(6), rnd(6), rnd(6)); GFX.scene.add(m); G.rocks.push({ mesh: m, pos: m.position, r: r * 1.0 }); }
  G.fm = { phase: 0, kills: 0, need: 10, relays: 0, rt: 0 }; G.objText = 'Destroy 10 fighters  0/10';
  const ring = new THREE.Mesh(new THREE.TorusGeometry(440, 1.2, 8, 120), GFX.glowMat(0x6a8aff, .35)); ring.rotation.x = Math.PI / 2; GFX.addExtra(ring);
  G.wing.forEach((w, i) => { w.pos.set(w.side * 14, 2, 16); w.dir.set(0, 0, -1); });
}
function fighterOnKill(e) { if (G.fm && G.fm.phase === 0) G.fm.kills++; }
function spawnFighter() { const P = G.P, a = rnd(6.28); _a.set(Math.cos(a) * rnd(180, 260), rnd(-40, 40), Math.sin(a) * rnd(180, 260)).add(P.pos); if (_a.length() > 400) _a.setLength(400); const e = spawn('fighter', _a.x, _a.y, _a.z, { onKill: fighterOnKill }); if (Math.random() < .3) { const w = G.wing.filter(w => w.alive); if (w.length) e.tgt = rpick(w); } }
function missionLogic(dt) {
  const M = G.mission, P = G.P;
  if (G.isRail()) { if (G.won) { G.outT += dt; if (G.outT > 5) G.finish(true); } return; }
  const f = G.fm; f.rt -= dt; const fighters = G.enemies.filter(e => e.type === 'fighter' && !e.dead).length;
  if (G.outside && !G.warned) { G.warned = 4; Radio.say('hq', 'Kit, you are leaving the combat zone! Turn back!', 2.5); Audio.sfx('warn'); } if (G.warned > 0) G.warned -= dt;
  if (f.phase === 0) {
    if (fighters < 4 && f.rt <= 0 && f.kills + fighters < f.need) { spawnFighter(); f.rt = 1.2; }
    G.objText = 'Destroy the fighters  ' + f.kills + '/' + f.need;
    if (f.kills >= f.need) { f.phase = 1; Radio.say('hq', 'Fighters down! Now take out the three jammer relays — they are shielding the enemy ace.'); banner('PHASE 2<small>Destroy the relays</small>', 2.5);
      for (let i = 0; i < 3; i++) { const a = i * 2.094 + rnd(.3), d = 190; spawn('relay', Math.cos(a) * d, rnd(-30, 30), Math.sin(a) * d, { relay: true, ghost: false, onKill: () => { f.relays++; Radio.say(rpick(['rook', 'pip']), f.relays < 3 ? 'Relay down! ' + (3 - f.relays) + ' to go.' : 'That is the last relay!'); } }); } Audio.sfx('warn'); }
  } else if (f.phase === 1) {
    if (fighters < 2 && f.rt <= 0) { spawnFighter(); f.rt = 4; } G.objText = 'Destroy the relays  ' + f.relays + '/3 (yellow on radar)';
    if (f.relays >= 3) { f.phase = 2; Radio.say('vex', 'Impressive, little Jet. But now you face the Wolf of the Halo!'); banner('WARNING<small>Rival ace — VEX</small>', 3); Audio.sfx('warn'); Audio.music('boss');
      _a.set(P.pos.x + 150, 0, P.pos.z - 200); const e = spawn('rival', _a.x, _a.y, _a.z, { boss: true, name: 'VEX — RIVAL ACE', onKill: e => { bossDown(e); } }); e.dir.set(0, 0, 1); G.boss = e; }
  } else if (f.phase === 2) { G.objText = 'Defeat Vex! Charge-lock missiles beat his rolls'; if (G.boss && !G.boss.dead && G.time % 14 < dt) Radio.say('hq', rpick(['Use the U-turn to get on his tail, Kit!', 'He rolls to dodge — missiles will track him!', 'Boost to close the gap!'])); }
  if (G.won) { G.outT += dt; if (G.outT > 5) G.finish(true); }
  // rival damage reduction while rolling
}
const _dmg = G.damageEnemy; G.damageEnemy = function (e, d) { if (e.type === 'rival' && e.rolling) d *= .25; _dmg(e, d); if (e.type === 'rival' && !e.dead) { e.stun = Math.max(e.stun, .05); } };

// ---------- mission data (designer-editable: [seconds, command, ...args])
const MISSIONS = [
  { id: 'coast', name: 'Azure Coast', sub: 'Mission 1 · Rail Assault', theme: 'coast', mode: 'rail', music: 'coast', medal: 60, boss: 128,
    blurb: 'Drone swarms are overrunning the Azure Coast. Clear the skies with your wingmen Rook and Pip, then bring down the Colossus Walker.',
    script: [[1.5, 'say', 'hq', 'Jet Kit squadron, this is Command. Hostile drones are swarming the Azure Coast!'], [4, 'say', 'rook', "Rook here. Stay on my wing, Kit — lasers hot!"], [5, 'hint', 'Move with the left stick. Hold {fire} to fire.'], [7, 'v', 3], [14, 'v', 5], [20, 'line', 4, 1], [26, 'hint', 'Tap {roll} to barrel roll — it reflects enemy shots back at them!'], [27, 'line', 5, -1], [33, 'pick', 'ring', 0, 3], [36, 'swoop', 2],
      [42, 'hint', 'Hold {charge} over enemies to lock on, release to fire homing missiles!'], [43, 'v', 5], [44, 'turret', 2], [52, 'say', 'pip', 'Gates ahead! Thread the gap, Kit!'], [53, 'gate', 0, 2], [58, 'gate', -9, 4], [62, 'gate', 8, 0], [66, 'pick', 'bomb', 0, 3], [72, 'tail', 'pip'], [78, 'hint', 'Press {bomb} for a Nova Bomb — it wipes every shot and hurts everything nearby.'], [80, 'swoop', 4], [84, 'v', 6], [88, 'turret', 3], [92, 'pick', 'up', 0, 2],
      [96, 'line', 6, 1], [99, 'swoop', 3], [105, 'pick', 'ring', 6, 3], [108, 'v', 7], [112, 'tail', 'rook'], [118, 'turret', 3], [122, 'say', 'hq', 'Massive signature ahead — the Colossus Walker! Take it down, Kit!'], [124, 'hint', 'Boost with {boost}, brake with {brake}. Hit the Walker only when its core opens.'], [126, 'pick', 'ring', 0, 3], [128, 'boss', 'walker']] },
  { id: 'canyon', name: 'Ember Canyon', sub: 'Mission 2 · Canyon Run', theme: 'canyon', mode: 'rail', music: 'canyon', medal: 55, boss: 106,
    blurb: 'Rebels are running a lava canyon shortcut. Fly low, thread the rock gates, dodge the boulders and crack the Bulwark Cruiser.',
    script: [[1.5, 'say', 'hq', 'Ember Canyon: narrow walls, rolling boulders, and a cruiser at the end. Stay sharp.'], [4, 'hint', 'Hold {boost} to speed up, {brake} to slow down. Press {flip} to loop and dodge.'], [6, 'gate', 0, 2], [10, 'v', 4], [14, 'boulders', 3], [20, 'gate', -8, 4], [24, 'swoop', 3], [28, 'turret', 3], [34, 'gate', 8, 0], [36, 'line', 5, 1], [40, 'pick', 'ring', 0, 1],
      [44, 'tail', 'rook'], [48, 'boulders', 4], [54, 'gate', 0, 6], [57, 'gate', -9, 0], [60, 'swoop', 4], [64, 'pick', 'bomb', 0, 2], [68, 'v', 7], [70, 'turret', 4], [76, 'gate', 9, 3], [80, 'pick', 'up', 0, 2], [82, 'line', 7, -1], [88, 'tail', 'pip'], [92, 'boulders', 5], [96, 'swoop', 5], [102, 'say', 'rook', 'Big contact ahead — it is the Bulwark! Wait for the shield to drop, Kit!'], [104, 'pick', 'ring', 0, 2], [106, 'boss', 'cruiser']] },
  { id: 'nebula', name: 'Halo Ring', sub: 'Mission 3 · All-Range Dogfight', theme: 'nebula', mode: 'free', music: 'nebula', medal: 18, boss: 0,
    blurb: 'Free flight over the Halo Ring asteroid field. Hunt fighters, destroy the jammer relays and duel the rival ace Vex. Use U-turns to get on tails.',
    script: [[1, 'say', 'hq', 'Halo Ring: all-range combat. Enemy fighters will chase you — shoot them down!'], [3, 'hint', 'Stick left/right turns, up/down pitches. Press {flip} for a U-turn.'], [12, 'hint', 'Hold {boost} to chase, {brake} to tighten turns. Watch the radar!'], [24, 'say', 'rook', 'Pip, take the left flank. Kit, you have the lead!'], [40, 'hint', 'Lock on with {charge}: missiles are great against fast fighters.']] }
];
