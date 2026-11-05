/* SKILLER7 — combat: aiming, the seven weapons, skills, the Whiteouts (behaviours, warm spots, tells), the scan,
 * projectiles, drops, contact explosions. One damage pipeline for everything (§7.4–7.9). */
const DEG = Math.PI / 180;
const WARM_PARTS = { head: [.06, 0, 1.56], chest: [.2, 0, 1.22], belly: [.22, 0, .96], knee: [.14, .12, .46], hand: [.3, .34, .92], back: [-.24, 0, 1.18] };
S7.WARM_PARTS = WARM_PARTS;
const wstate = id => G.wpn[id] || (G.wpn[id] = { mag: S7.WEAPONS[S7.PERSONAS[id].weapon].mag, reloadT: 0, cool: 0, heat: 0, overT: 0, alt: 0, flash: 0 });
S7.wstate = wstate;
const stats = () => G.roster[G.persona].stats;
const warmR = (crit = stats().crit) => 5 * (1 + .1 * crit) * T.warmRadius * (G.persona === 'mireille' ? 1.25 : 1);

/* ---- enemies ---- */
function spawnEnemy(type, x, y, z, o = {}) {
  const D = S7.ENEMIES[type]; if (!D) throw new Error('unknown enemy ' + type);
  const parts = D.warm || ['head', 'chest', 'belly', 'knee', 'hand'];
  const e = {
    id: G.nextId++, type, x, y, z: z ?? W.grid.floor(x, y), hp: (o.hp || D.hp) * T.enemyHP, size: (o.size || D.size || 1) * (1 + RR('spawn', -.08, .08)),
    facing: 0, speed: RR('spawn', D.speed[0], D.speed[1]), revealed: o.revealed || 0, vis: 0, alive: true, dying: 0, t: 0, laughT: RR('laugh', .4, 2.4),
    style: D.laugh || ['giggle', 'cackle', 'chuckle', 'wheeze'][Math.floor(R('laugh') * 4)], pitch: RR('laugh', -3, 3), giggle: -1, stun: 0, kneel: 0, burn: 0,
    wave: o.wave || null, part: o.part || parts[Math.floor(R('spawn') * parts.length)], tint: Math.floor(R('spawn') * 5), phase: R('spawn') * TAU,
    ai: D.ai, small: !!o.small, ambient: !!o.ambient, spots: D.spots ? D.spots.slice() : null, budT: 2, throwT: RR('spawn', .8, 2.4), turnT: 3.5, back: 0, blinkT: 2.5, life: 0, mark: 0
  };
  e.max = e.hp;
  if (o.facing !== undefined) e.facing = o.facing; else { const H = heroPos(); e.facing = Math.atan2(H.y - y, H.x - x); }
  if (D.ai === 'inspector') { e.marks = (o.marks || []).map(m => [m[0] * M, m[1] * M]); }
  if (o.on) e.on = o.on;
  G.enemies.push(e); emit('spawn', { enemy: e });
  return e;
}
S7.spawnEnemy = spawnEnemy;
/** a warm spot's world point */
function warmPos(e, part = e.part) {
  const P = WARM_PARTS[part] || WARM_PARTS.chest, s = e.size * M, c = Math.cos(e.facing), sn = Math.sin(e.facing);
  let f = P[0], r = P[1];
  if (e.ai === 'twins') { const a = e.t * .9; f = Math.cos(a) * .3; r = Math.sin(a) * .3; }
  return [e.x + (c * f - sn * r) * s, e.y + (sn * f + c * r) * s, e.z + P[2] * s];
}
S7.warmPos = warmPos;
const bloomSpots = e => e.spots.map((p, i) => ({ i, pos: [e.x + Math.cos(e.facing + (i - 1) * .9) * .45 * e.size * M, e.y + Math.sin(e.facing + (i - 1) * .9) * .45 * e.size * M, e.z + (1.1 + (i % 2) * .35) * e.size * M], part: p }));
S7.bloomSpots = bloomSpots;
const heroTarget = () => { const H = heroPos(); return [H.x, H.y, H.z]; };

function enemiesStep(dt, frozen) {
  const H = heroTarget(), D2 = diff(), spd = T.enemySpeed * D2.speed;
  for (const e of G.enemies) {
    if (!e.alive) { e.dying += dt; continue; }
    e.t += dt; e.revealed = Math.max(0, e.revealed - dt); e.mark = Math.max(0, e.mark - dt);
    const shown = e.revealed > 0 || G.revealAll > 0 || CHEATS.revealAll || e.mark > 0;
    e.vis = approach(e.vis, shown ? 1 : 0, dt / (shown ? .25 : .4));
    if (e.burn > 0) { e.burn -= dt; damageEnemy(e, 5 * dt, 'burn'); if (!e.alive) continue; }
    const dx = H[0] - e.x, dy = H[1] - e.y, d = Math.hypot(dx, dy), dz = H[2] - e.z;
    // laughter: quicker and louder as they near
    e.laughT -= dt;
    if (e.laughT <= 0 && !e.ambient) { const near = clamp(1 - d / (40 * M), 0, 1); e.laughT = lerp(4.2, 1.1, near) * RR('laugh', .8, 1.25); emit('laugh', { enemy: e, style: e.style, at: [e.x, e.y, e.z + 1.5 * e.size * M], loud: near, d }); }
    if (frozen || e.on && !flag(e.on)) continue;
    if (e.stun > 0) { e.stun -= dt; continue; }
    if (e.kneel > 0) { e.kneel -= dt; continue; }
    if (e.giggle >= 0) { e.giggle += dt; if (e.giggle >= .35) explodeEnemy(e); continue; }
    const D = S7.ENEMIES[e.type];
    if (e.track) {   // riding a rail: the gondola's cable (crawlers), the down cabins, the windows
      const tr = e.track, te = W.rails.byId[tr.edge], ws = G.walker.s;
      if (tr.ride) tr.s = ws + (tr.s0 === undefined ? (tr.s0 = tr.s - ws) : tr.s0);
      else if (tr.pass) tr.s += tr.speed * dt; else tr.s = approach(tr.s, ws, Math.abs(tr.speed) * dt);
      if (tr.pass && (tr.s < -200 || tr.s > te.len + 200)) { e.alive = false; e.dying = 9; continue; }
      const p = edgePos(W.rails, te, clamp(tr.s, 0, te.len)), a = p.angle + Math.PI / 2; e.x = p.x + Math.cos(a) * (tr.dy || 0); e.y = p.y + Math.sin(a) * (tr.dy || 0); e.z = p.z + (tr.dz || 0) * M; e.flyZ = e.z;
      e.facing = Math.atan2(H[1] - e.y, H[0] - e.x);
      if (e.ai === 'thrower') { e.throwT -= dt; if (e.throwT <= 0 && d < 60 * M) { e.throwT = 1.6; throwAt(e, H, 'snowball'); } continue; }
      if (D.contact && Math.hypot(H[0] - e.x, H[1] - e.y) < 2 * M && Math.abs(H[2] - e.z) < 3.4 * M) { e.giggle = 0; emit('giggleup', { enemy: e }); }
      continue;
    }
    // contact: within 1.5 m they giggle up, then burst
    if (D.contact && d < 1.5 * M * Math.max(1, e.size * .8) && Math.abs(dz) < 2 * M && G.mode !== 'switch' && G.area !== 'room7') { e.giggle = 0; emit('giggleup', { enemy: e }); continue; }
    let vx = 0, vy = 0, sp = e.speed * spd;
    const face = Math.atan2(dy, dx);
    switch (e.ai) {
      case 'thrower': {
        e.facing = face; e.throwT -= dt;
        if (e.throwT <= 0 && d < 60 * M && d > 6 * M && W.grid.los([e.x, e.y, e.z + 1.6 * M], [H[0], H[1], H[2] + 1.2 * M])) { e.throwT = 2.6; throwAt(e, H, D.projectile || 'snowball'); }
        break;
      }
      case 'inspector': {
        e.blinkT -= dt; e.life += dt; e.facing = face;
        if (e.blinkT <= 0 && e.marks && e.marks.length) { e.blinkT = 2.5; const m = e.marks[Math.floor(R('spawn') * e.marks.length)]; emit('blink', { enemy: e, from: [e.x, e.y, e.z] }); e.x = m[0]; e.y = m[1]; e.z = W.grid.floor(e.x, e.y); }
        if (e.life > 25) { e.alive = false; e.vanished = true; emit('vanish', { enemy: e }); G.flags.inspectorGone = (G.flags.inspectorGone || 0) + 1; }
        break;
      }
      case 'plow': {
        e.turnT -= dt;
        if (e.back > 0) { e.back -= dt; e.facing = approach(e.facing, face + Math.PI, dt * 10); if (e.back <= 0) e.turnT = 3.5; break; }
        if (e.turnT <= 0) { e.back = 1.2; emit('laugh', { enemy: e, style: 'cackle', at: [e.x, e.y, e.z + 24], loud: 1, d }); break; }
        e.facing = face; [vx, vy] = moveDir(e, H); vx *= sp; vy *= sp; break;
      }
      case 'sled': { e.facing = face; vx = Math.cos(face) * sp; vy = Math.sin(face) * sp; break; }
      case 'runner': { e.facing = face; const [mx, my] = moveDir(e, H), zz = Math.sin(e.t * .8 * TAU + e.phase) * 1.2; vx = (mx + -my * zz) * sp; vy = (my + mx * zz) * sp; break; }
      case 'bloom': {
        e.facing = face; [vx, vy] = moveDir(e, H); vx *= sp; vy *= sp; e.budT -= dt;
        if (e.budT <= 0 && aliveEnemies().length < 10) { e.budT = 4; spawnEnemy('giggler', e.x + Math.cos(face + 1.6) * 20, e.y + Math.sin(face + 1.6) * 20, undefined, { wave: e.wave, revealed: 2 }); }
        break;
      }
      case 'dancer': { e.facing = face + Math.sin(e.t * 3) * .8; const [mx, my] = moveDir(e, H), sw = Math.sin(e.t * 2.4 + e.phase); vx = (mx * .7 - my * sw) * sp; vy = (my * .7 + mx * sw) * sp; break; }
      case 'static': break;
      default: { e.facing = face; const [mx, my] = moveDir(e, H), sw = Math.sin(e.t * 1.7 + e.phase) * .35; vx = (mx - my * sw) * sp; vy = (my + mx * sw) * sp; }
    }
    if (vx || vy) {
      // keep a metre apart
      for (const o of G.enemies) if (o !== e && o.alive) { const ox = e.x - o.x, oy = e.y - o.y, od = Math.hypot(ox, oy); if (od < 16 && od > .01) { vx += ox / od * 40; vy += oy / od * 40; } }
      const nx = e.x + vx * dt, ny = e.y + vy * dt;
      if (W.grid.terrain || W.grid.walkable(Math.floor(nx / M), Math.floor(ny / M))) { e.x = nx; e.y = ny; }
      else if (W.grid.walkable(Math.floor(nx / M), Math.floor(e.y / M))) e.x = nx; else if (W.grid.walkable(Math.floor(e.x / M), Math.floor(ny / M))) e.y = ny;
      e.z = e.flyZ !== undefined ? e.flyZ : W.grid.floor(e.x, e.y);
    }
  }
  if (G.enemies.length > 40) G.enemies = G.enemies.filter(e => e.alive || e.dying < 1.5);
  else G.enemies = G.enemies.filter(e => e.alive || e.dying < 3);
}
function moveDir(e, H) {
  const f = W.grid.flowDir(e.x, e.y, H[0], H[1]);
  if (f) return f; const dx = H[0] - e.x, dy = H[1] - e.y, d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d];
}
function throwAt(e, H, kind) {
  const from = [e.x, e.y, e.z + 1.7 * e.size * M], to = [H[0], H[1], H[2] + 1.2 * M], d = V.sub(to, from), L = V.len(d), sp = kind === 'suitcase' ? 170 : kind === 'medal' ? 260 : 220, tt = L / sp;
  G.proj.push({ id: G.nextId++, kind, team: 'enemy', p: from, v: [d[0] / tt, d[1] / tt, d[2] / tt + 150 * tt], g: 300, hp: 1, r: kind === 'suitcase' ? 8 : 5, dmg: kind === 'suitcase' ? 10 : kind === 'medal' ? 10 : 8, t: 0, life: tt + 1.5, spin: 0 });
  emit('throw', { kind, at: from });
}
S7.throwAt = throwAt;
function explodeEnemy(e) {
  if (!e.alive) return;
  e.alive = false; e.dying = 0; e.exploded = true;
  const H = heroTarget(), d = Math.hypot(H[0] - e.x, H[1] - e.y), D = S7.ENEMIES[e.type];
  emit('explode', { at: [e.x, e.y, e.z + 16], radius: 1.5, enemy: e });
  if (d < 2.2 * M) hurt((D.contact || 20) * T.explosionDmg, e);
  if (S7.echoPenalty) S7.echoPenalty(e);
}
/** damage an enemy; returns true when it died */
function damageEnemy(e, dmg, how, crit) {
  if (!e.alive) return false;
  if (CHEATS.oneHit) dmg = 9999;
  e.hp -= dmg; e.revealed = Math.max(e.revealed, 3);
  emit('hit', { target: e, part: crit ? 'warm' : 'body', dmg });
  if (e.hp <= 0 || crit && !S7.ENEMIES[e.type].boss) { killEnemy(e, crit); return true; }
  if (e.ai === 'twins' && !e.split && how !== 'burn') {   // a body hit splits it into two small Gigglers, once
    e.split = true; e.alive = false; e.dying = 0; e.splitDone = true; emit('split', { enemy: e });
    for (const sd of [-1, 1]) spawnEnemy('giggler', e.x + Math.cos(e.facing + Math.PI / 2) * 14 * sd, e.y + Math.sin(e.facing + Math.PI / 2) * 14 * sd, e.z, { hp: 12, size: .7, wave: e.wave, revealed: 3, small: true });
  }
  return false;
}
S7.damageEnemy = damageEnemy;
function killEnemy(e, crit) {
  e.alive = false; e.dying = 0; e.crit = crit;
  const D = S7.ENEMIES[e.type], d2 = diff();
  G.stats.kills++; if (crit) G.stats.crits++;
  const red = Math.round((crit ? D.red[1] : D.red[0]) * d2.red * T.redDrop), rime = crit ? Math.round((D.rime || 1) * T.rimeDrop + (stats().crit >= 3 ? 1 : 0)) : 0;
  const H = heroTarget(), near = Math.hypot(H[0] - e.x, H[1] - e.y) < 10 * M;
  if (near) { addRed(red); G.rime += rime; emit('pickup', { kind: 'red', amount: red, at: [e.x, e.y, e.z] }); if (rime) emit('pickup', { kind: 'rime', amount: rime }); }
  else G.drops.push({ x: e.x, y: e.y, z: e.z + 16, red, rime, t: 0 });
  emit('kill', { enemy: e, type: e.type, crit });
  if (crit) { emit('crit', { enemy: e }); S7.splash('THAW.', .9, { big: true }); if (R('bark') < .35) bark(G.persona, 'crit'); }
  if (e.drop) { giveItem(e.drop); S7.splash(S7.ITEMS[e.drop].name.toUpperCase(), 1.6); if (e.onDropFlag) setFlag(e.onDropFlag); }
  if (D.onKill) D.onKill(e, G);
  if (S7.echoCrit && crit) S7.echoCrit(e);
}
S7.killEnemy = killEnemy;
S7.killAll = () => { for (const e of G.enemies) if (e.alive) killEnemy(e, true); G.pending = []; };

/* ---- aiming ---- */
function aimStep(dt, I) {
  const a = G.aim, st = stats();
  let dy = I.lookYaw * DEG, dp = I.lookPitch * DEG;
  // aim assist (controller only): slow near a revealed warm spot, and a gentle pull
  const mode = (S7.game && S7.game.settings && S7.game.settings.aimAssist) || diff().assist;
  if (I.padLook && mode !== 'Off' && T.assist > 0) {
    const hi = mode === 'High', eye = S7.eye(); let best = null, bd = 5 * DEG;
    for (const p of assistPoints()) { const v = V.sub(p, eye), yaw = Math.atan2(v[1], v[0]), pit = Math.atan2(v[2], Math.hypot(v[0], v[1])), d = Math.hypot(angDiff(a.yaw, yaw), pit - a.pitch); if (d < bd) { bd = d; best = [yaw, pit]; } }
    if (best) {
      if (bd < 3.5 * DEG) { const k = lerp(1, hi ? .4 : .55, T.assist); dy *= k; dp *= k; }
      const pull = (hi ? .25 : .12) * T.assist * dt * 4; a.yaw += angDiff(a.yaw, best[0]) * pull; a.pitch += (best[1] - a.pitch) * pull;
    }
  }
  if (a.scope) { dy *= .35; dp *= .35; }
  a.yaw = wrapAng(a.yaw + dy); a.pitch = clamp(a.pitch + dp, -70 * DEG, 70 * DEG);
  // the pointer (light gun): the reticle follows the mouse; the view pans in the outer tenth
  const pm = I.pointerAim;
  if (pm) { const ex = Math.abs(pm[0]) > .8 ? Math.sign(pm[0]) * (Math.abs(pm[0]) - .8) / .2 : 0, ey = Math.abs(pm[1]) > .8 ? Math.sign(pm[1]) * (Math.abs(pm[1]) - .8) / .2 : 0; a.yaw = wrapAng(a.yaw + ex * 120 * DEG * dt); a.pitch = clamp(a.pitch - ey * 80 * DEG * dt, -70 * DEG, 70 * DEG); }
  a.pointer = pm || null;
  // sway (a Lissajous wobble) and recoil recovery
  const amp = Math.max(.1, .7 * (1 - .15 * st.steady)) * (a.scope ? .5 : 1) * DEG, t = G.time;
  a.swayY = Math.sin(t * .6 * TAU) * amp; a.swayP = Math.sin(t * .9 * TAU + 1) * amp * .7;
  a.recoil = Math.max(0, a.recoil - 10 * dt);
}
function assistPoints() {
  const out = [];
  for (const e of G.enemies) if (e.alive && e.vis > .5) { if (e.spots) for (const s of bloomSpots(e)) { if (e.spots[s.i]) out.push(s.pos); } else out.push(warmPos(e)); }
  for (const t of W.targets || []) if (!flag('hit:' + key(t.id))) out.push(t.pos);
  if (S7.bossTargets) for (const b of S7.bossTargets()) if (b.kind === 'warm' && b.window) out.push(b.pos);
  return out;
}
/** the aim ray now: from the eye along the reticle, with spread (degrees) */
function aimRay(spread = 0, k = 0) {
  const a = G.aim, o = S7.eye();
  let yaw = a.yaw + (a.swayY || 0), pit = a.pitch + a.recoil * DEG + (a.swayP || 0);
  if (a.pointer) { const fov = (a.scope ? 18 : 62) * DEG, th = Math.tan(fov / 2), asp = S7.aspect || 16 / 9; yaw += Math.atan(a.pointer[0] * th * asp); pit -= Math.atan(a.pointer[1] * th); }
  if (spread) { const r1 = R('spread'), r2 = R('spread'), ang = r1 * TAU, rad = Math.sqrt(r2) * spread * DEG; yaw += Math.cos(ang) * rad; pit += Math.sin(ang) * rad; }
  void k;
  return { o, d: V.dir(yaw, pit) };
}
S7.aimRay = aimRay;

/** cast a shot: the nearest thing the ray meets (warm spots first among overlaps) */
function castShot(o, d, max, opts = {}) {
  const wall = W.grid.ray(o, d, max);
  let best = { t: wall, kind: wall < max ? 'wall' : 'none' };
  const consider = (t, h) => { if (t !== null && t < best.t) best = Object.assign({ t }, h); };
  const wr = warmR();
  for (const e of G.enemies) {
    if (!e.alive || opts.skip && opts.skip.has(e)) continue;
    const s = e.size * M, bt = rayCapsule(o, d, e.x, e.y, e.z + 5 * e.size, e.z + 1.7 * s - 5, .34 * s);
    if (e.spots) { for (const sp of bloomSpots(e)) if (e.spots[sp.i]) { const t = raySphere(o, d, sp.pos, wr * 1.3); if (t !== null && (bt === null || t <= bt + .7 * s)) consider(t - .01, { kind: 'warm', enemy: e, spot: sp.i }); } }
    else {
      const wp = warmPos(e), t = raySphere(o, d, wp, wr);
      let facesOk = true;
      if (e.part === 'back') { const toShooter = Math.atan2(o[1] - e.y, o[0] - e.x); facesOk = Math.abs(angDiff(e.facing + Math.PI, toShooter)) < 1.4; }
      if (t !== null && facesOk && (bt === null || t <= bt + .75 * s)) consider(t - .01, { kind: 'warm', enemy: e });
    }
    if (bt !== null) {
      if (e.ai === 'plow' && !(e.back > 0)) { const toShooter = Math.atan2(o[1] - e.y, o[0] - e.x); if (Math.abs(angDiff(e.facing, toShooter)) < 1.3) { consider(bt, { kind: 'shield', enemy: e }); continue; } }
      consider(bt, { kind: 'body', enemy: e });
    }
  }
  for (const p of G.proj) if (p.team === 'enemy') consider(raySphere(o, d, p.p, p.r + 2), { kind: 'proj', proj: p });
  for (const t of W.targets || []) if (!flag('hit:' + key(t.id))) consider(raySphere(o, d, t.pos, t.r * M), { kind: 'target', target: t });
  if (S7.bossTargets) for (const b of S7.bossTargets()) consider(b.capsule ? rayCapsule(o, d, b.pos[0], b.pos[1], b.pos[2] - b.capsule, b.pos[2] + b.capsule, b.r) : raySphere(o, d, b.pos, b.r), { kind: 'boss', boss: b });
  best.at = V.add(o, d, best.t);
  return best;
}
S7.castShot = castShot;

/** apply a hit from the player's weapon */
function applyHit(h, dmg, W0, o) {
  const st = stats(), range = (W0.range || 60) * M * (G.aim.scope && W0.scopeRange ? W0.scopeRange / W0.range : 1);
  dmg *= (1 + .12 * st.power) * T.playerDmg; if (h.t > range) dmg *= .25;
  G.stats.hits++;
  if (h.kind === 'warm') {
    const e = h.enemy;
    if (e.spots) { e.spots[h.spot] = null; emit('crit', { enemy: e }); S7.splash('THAW.', .8, { big: true }); e.revealed = Math.max(e.revealed, 3); if (e.spots.every(x => !x)) killEnemy(e, true); else { e.size *= .85; damageEnemy(e, 0, 'spot'); } return; }
    damageEnemy(e, dmg * 3, 'warm', true); if (W0.burn && e.alive) e.burn = 3;
  } else if (h.kind === 'body') { damageEnemy(h.enemy, dmg, 'body'); if (W0.burn && h.enemy.alive) h.enemy.burn = 3; }
  else if (h.kind === 'shield') { emit('tink', { at: h.at }); h.enemy.revealed = Math.max(h.enemy.revealed, 3); h.enemy.shieldHits = (h.enemy.shieldHits || 0) + 1; if (h.enemy.shieldHits === 4 && !G.tips.plow) { G.tips.plow = true; S7.tip('plow'); } }
  else if (h.kind === 'proj') { h.proj.dead = true; addRed(h.proj.kind === 'suitcase' ? 4 : 1); emit('shatter', { at: h.at, kind: h.proj.kind }); }
  else if (h.kind === 'target') {
    const t = h.target;
    if (t.far && !(G.persona === 'ignaz' && G.aim.scope)) { S7.splash('TOO FAR.', 1, { at: h.at }); emit('toofar', { at: h.at }); return; }
    setFlag('hit:' + key(t.id)); emit('targetHit', { id: t.id, at: t.pos });
    if (t.flag) setFlag(t.flag); if (t.gate) openGate(t.gate); if (t.beat) runBeat(t.beat); if (t.splash) S7.splash(t.splash, 1.4);
  } else if (h.kind === 'boss') S7.bossHit(h.boss, dmg, h.at);
  else if (h.kind === 'wall') emit('impact', { at: h.at });
  void o;
}
S7.applyHit = applyHit;

/* ---- the weapons (§7.4) ---- */
function weaponsStep(dt, I) {
  const id = G.persona, P = S7.PERSONAS[id], W0 = S7.WEAPONS[P.weapon], w = wstate(id), st = stats(), rk = 1 + .08 * st.speed;
  w.cool -= dt; w.flash = Math.max(0, w.flash - dt * 8);
  if (W0.heat) { if (w.overT > 0) { w.overT -= dt; if (w.overT <= 0) w.mag = W0.mag; } }
  else if (w.reloadT > 0) { w.reloadT -= dt * rk; if (w.reloadT <= 0) { w.mag = W0.mag; emit('reloaded', { persona: id }); } }
  if (!G.aim.on || G.aim.k < .9) return;
  if (I.reload && !W0.heat && w.mag < W0.mag && w.reloadT <= 0) startReload(w, W0);
  const want = W0.auto ? I.fire : I.firePressed;
  if (!want || w.cool > 0 || w.reloadT > 0 || w.overT > 0) return;
  if (w.mag <= 0) { if (!W0.heat) { startReload(w, W0); emit('dry', { persona: id }); } return; }
  w.mag--; w.cool = W0.interval; w.flash = 1; w.alt ^= 1; G.stats.shots++;
  emit('shot', { persona: id, weapon: P.weapon }); S7.bossShot && S7.bossShot();
  if (W0.heat && w.mag <= 0) { w.overT = W0.reload; emit('overheat', {}); }
  if (W0.kind === 'hitscan') {
    const { o, d } = aimRay(W0.spread);
    const skip = new Set();
    for (let k = 0; k <= (W0.pierce || 0); k++) { const h = castShot(o, d, (W0.scopeRange || W0.range) * M * 2, { skip }); applyHit(h, W0.dmg, W0, o); if (h.enemy) skip.add(h.enemy); else break; emit('tracer', { from: o, to: h.at }); }
  } else if (W0.kind === 'pellets') {
    for (let k = 0; k < W0.pellets; k++) { const { o, d } = aimRay(W0.spread); const h = castShot(o, d, W0.range * M * 1.5); applyHit(h, W0.dmg, W0, o); if (h.kind === 'body' || h.kind === 'shield') knock(h.enemy, o, 40); }
  } else if (W0.kind === 'cone') coneBlast(W0);
  else if (W0.kind === 'lob') lob(W0.speed, W0.splash, W0.dmg, false);
  G.aim.recoil += W0.recoil;   // (the kick comes after the shot leaves)
}
function startReload(w, W0) { w.reloadT = W0.perShell ? W0.reload * (W0.mag - w.mag) : W0.reload; emit('reload', { persona: G.persona }); }
function knock(e, o, k) { if (!e || !e.alive) return; const a = Math.atan2(e.y - o[1], e.x - o[0]); e.x += Math.cos(a) * k * .2; e.y += Math.sin(a) * k * .2; if (e.ai === 'plow') { e.back = 1.2; e.turnT = 3.5; } }
function coneBlast(W0) {
  const { o, d } = aimRay(0), reach = W0.range * M, half = W0.cone / 2 * DEG;
  for (const e of G.enemies) {
    if (!e.alive) continue; const c = [e.x, e.y, e.z + 1.1 * e.size * M], v = V.sub(c, o), L = V.len(v); if (L > reach) continue;
    if (Math.acos(clamp(V.dot(V.norm(v), d), -1, 1)) > half || !W.grid.los(o, c)) continue;
    damageEnemy(e, W0.dmg * (1 + .12 * stats().power) * T.playerDmg, 'body'); knock(e, o, 160); if (e.alive && e.ai === 'plow') e.back = 1.2;
  }
  for (const p of G.proj) if (p.team === 'enemy') { const v = V.sub(p.p, o); if (V.len(v) < reach && Math.acos(clamp(V.dot(V.norm(v), d), -1, 1)) < half) { p.dead = true; emit('shatter', { at: p.p, kind: p.kind }); } }
  if (S7.bossTargets) for (const b of S7.bossTargets()) { const v = V.sub(b.pos, o); if (V.len(v) < reach && Math.acos(clamp(V.dot(V.norm(v), d), -1, 1)) < half) S7.bossHit(b, W0.dmg * .5, b.pos, 'cone'); }
  emit('blast', { at: o, dir: d });
}
function lob(speed, splash, dmg, charge) {
  const { o, d } = aimRay(0);
  G.proj.push({ id: G.nextId++, kind: charge ? 'charge' : 'shell', team: 'player', p: V.add(o, d, 10), v: [d[0] * speed, d[1] * speed, d[2] * speed + 30], g: 300, r: 3, splash: splash * M, dmg, t: 0, life: charge ? 5 : 2, charge });
  emit('lob', { charge });
}
function explodeAt(p, radius, dmg, src) {
  emit('explode', { at: p, radius: radius / M, source: src });
  for (const e of G.enemies) if (e.alive && Math.hypot(e.x - p[0], e.y - p[1]) < radius && Math.abs(e.z + 16 - p[2]) < radius + 24) { damageEnemy(e, dmg * (1 + .12 * stats().power) * T.playerDmg, 'splash'); if (e.alive && e.ai === 'plow') { e.back = 1.2; e.turnT = 3.5; } }
  if (S7.bossTargets) for (const b of S7.bossTargets()) if (V.dist(b.pos, p) < radius + b.r) S7.bossHit(b, dmg, p, 'splash');
  for (const t of W.targets || []) if (!t.far && t.splashable && V.dist(t.pos, p) < radius + t.r * M) applyHit({ kind: 'target', target: t, at: p, t: 0 }, 0, {}, p);
  if (src === 'charge') { skillGates('cornice', p, 6); skillGates('serac', p, 6); }
}
function projStep(dt) {
  const H = heroTarget();
  for (const p of G.proj) {
    p.t += dt; p.v[2] -= p.g * dt; const np = V.add(p.p, p.v, dt);
    if (p.team === 'player') {
      let hit = W.grid.solid(np[0], np[1], np[2]) || p.t > p.life;
      if (!hit) for (const e of G.enemies) if (e.alive && Math.hypot(e.x - np[0], e.y - np[1]) < .45 * e.size * M && np[2] > e.z && np[2] < e.z + 1.8 * e.size * M) { hit = true; break; }
      if (!hit && S7.bossTargets) for (const b of S7.bossTargets()) if (V.dist(b.pos, np) < b.r + 4) { hit = true; break; }
      if (hit) { p.dead = true; explodeAt(p.p, p.splash, p.dmg, p.charge ? 'charge' : 'shell'); continue; }
    } else {
      const out = () => { if (p.kind === 'suitcase' && R('spawn') < .2 && G.boss && G.boss.phase < 3) { const c = 9 * M; spawnEnemy('giggler', c - (H[0] - c) * .85, c - (H[1] - c) * .85, undefined, { revealed: 3 }); } };
      if (Math.hypot(np[0] - H[0], np[1] - H[1]) < 10 && np[2] > H[2] && np[2] < H[2] + 30) { p.dead = true; hurt(p.dmg, p); emit('splat', { at: np, kind: p.kind }); out(); continue; }
      if (W.grid.solid(np[0], np[1], np[2]) || p.t > p.life) { p.dead = true; emit('splat', { at: p.p, kind: p.kind }); out(); continue; }
    }
    p.p = np;
  }
  G.proj = G.proj.filter(p => !p.dead);
}
S7.lob = lob;

/* ---- drops fly to you (§7.7) ---- */
function dropsStep(dt) {
  const H = heroTarget();
  for (const d of G.drops) {
    d.t += dt; const dx = H[0] - d.x, dy = H[1] - d.y, dz = H[2] + 16 - d.z, L = Math.hypot(dx, dy, dz);
    if (d.t > .5 && (L < 4 * M || !G.aim.on || d.pull)) { const k = Math.min(1, 380 * dt / Math.max(1, L)); d.x += dx * k; d.y += dy * k; d.z += dz * k; }
    if (L < 16) { d.got = true; addRed(d.red); G.rime += d.rime; emit('pickup', { kind: 'red', amount: d.red }); if (d.rime) emit('pickup', { kind: 'rime', amount: d.rime }); }
  }
  G.drops = G.drops.filter(d => !d.got);
}
S7.collectDrops = () => { for (const d of G.drops) d.pull = true; };

/* ---- the scan (§7.5) ---- */
function scanStep(dt, I) {
  G.scanCd = Math.max(0, G.scanCd - dt);
  if (I.scan && G.aim.on && G.scanCd <= 0) { G.scan = { r: 0, at: S7.eye(), max: T.scanRadius * M }; G.scanCd = 1.2; emit('scan', { at: G.scan.at, radius: T.scanRadius }); S7.tipDone('scan'); }
  if (G.scan) {
    const sc = G.scan, r0 = sc.r; sc.r += sc.max / .6 * dt;
    const rev = (T.revealTime * diff().reveal + .4 * stats().steady);
    for (const e of G.enemies) if (e.alive) { const d = Math.hypot(e.x - sc.at[0], e.y - sc.at[1]); if (d >= r0 - 8 && d <= sc.r) { if (e.revealed <= 0) emit('reveal', { enemy: e, by: 'scan' }); e.revealed = Math.max(e.revealed, rev); } }
    if (sc.r >= sc.max) G.scan = null;
  }
  if (G.flare) { G.flare.t -= dt; for (const e of G.enemies) if (e.alive && Math.hypot(e.x - G.flare.at[0], e.y - G.flare.at[1]) < 30 * M) e.revealed = Math.max(e.revealed, .5); if (G.flare.t <= 0) G.flare = null; }
  if (G.revealAll > 0) G.revealAll -= dt;
}

/* ---- skills (§7.9) ---- */
const SKILL_CD = { flare: 20, makeitrain: 4, echo: 4, flash: 2, charge: 2.5, longlook: .2, tuck: 0 };
function skillsStep(dt, I) {
  for (const k in G.cd) G.cd[k] = Math.max(0, G.cd[k] - dt);
  if (G.mode !== 'play' || G.cut) { G.tuck = false; return; }
  const P = S7.PERSONAS[G.persona], sk = P.skill, cost = P.skillCost || 0;
  if (sk === 'tuck') {
    const moving = G.walker.v > 5 || I.move;
    G.tuck = I.skillDown && !G.aim.on && (G.red > 0 || CHEATS.infRed);
    if (G.tuck && moving) { if (!CHEATS.infRed) G.red = Math.max(0, G.red - 2 * dt); }
    return;
  }
  if (!I.skill) return;
  if ((G.cd[sk] || 0) > 0) { emit('dry', {}); return; }
  const aimOnly = sk === 'flash' || sk === 'charge' || sk === 'longlook';
  if (aimOnly && !G.aim.on) { S7.splash('AIM FIRST.', .9); return; }
  if (sk === 'longlook') { G.aim.scope = !G.aim.scope; emit('scope', { on: G.aim.scope }); G.cd[sk] = .2; return; }
  if (!spendRed(cost)) { emit('dry', {}); emit('noRed', {}); S7.splash('NOT ENOUGH RED.', 1); return; }
  G.cd[sk] = SKILL_CD[sk] || 1; emit('skill', { persona: G.persona, skill: sk });
  const H = heroTarget();
  if (sk === 'flare') { G.flare = { t: 8, at: [H[0], H[1], H[2] + 3 * M] }; }
  else if (sk === 'makeitrain') { for (const e of G.enemies) if (e.alive && Math.hypot(e.x - H[0], e.y - H[1]) < 12 * M && !S7.ENEMIES[e.type].boss) { e.kneel = 3; e.revealed = Math.max(e.revealed, 3); } }
  else if (sk === 'echo') { skillGates('echowall', H, 25); skillGates('crystal', H, 15); for (const e of G.enemies) if (e.alive && Math.hypot(e.x - H[0], e.y - H[1]) < 40 * M) e.mark = 5; }
  else if (sk === 'flash') {
    const { o, d } = aimRay(0), half = 17.5 * DEG;
    for (const e of G.enemies) { if (!e.alive) continue; const v = V.sub([e.x, e.y, e.z + 20], o); if (V.len(v) < 25 * M && Math.acos(clamp(V.dot(V.norm(v), d), -1, 1)) < half) { e.stun = 2.5; e.revealed = Math.max(e.revealed, 4); emit('reveal', { enemy: e, by: 'flash' }); } }
    for (const s of W.spots) if (s.kind === 'exposure' && !spotDone(s) && (!s.when || flag(s.when))) { const v = V.sub(s.pos, o); if (V.len(v) < 25 * M && Math.acos(clamp(V.dot(V.norm(v), d), -1, 1)) < half * 1.6) { markSpot(s); if (s.item) giveItem(s.item); if (s.flag) setFlag(s.flag); emit('exposure', { id: s.id }); if (s.beat) runBeat(s.beat); } }
    if (S7.bossFlash) S7.bossFlash(o, d);
  }
  else if (sk === 'charge') lob(620, 5, 90, true);
}
S7.skillsStep = skillsStep;

/** the combat step: aim, weapons, enemies, scan, projectiles, drops, waves (frozen: enemies hold, laughs go on) */
S7.combatStep = (dt, I, frozen) => {
  if (!frozen && G.aim.on) aimStep(dt, I);
  if (!frozen) weaponsStep(dt, I);
  if (!frozen) scanStep(dt, I);
  enemiesStep(dt, frozen || G.cut);
  if (!frozen) { projStep(dt); dropsStep(dt); }
  S7.wavesStep(dt);
};
