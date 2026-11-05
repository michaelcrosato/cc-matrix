// 23-boss.js — boss framework (parts with hp, weak points, bars, scripted phases) and the bosses:
// STINGRAY/BARRACUDA, HAMMERHEAD, SCYLLA/KRAKE, plus mini-bosses BULLDOG, THE GULL, SEAWOLF.
// Every attack goes through the ThreatDirector and projectile system, so cover and telegraphs work as for grunts.
const BOSS_SRC = { id: 'boss' };
Object.assign(Sim.prototype, {
  spawnBoss(id, o = {}) {
    const d = reg('boss', id); const B = this.boss = { id, name: d.name, title: d.title, mini: !!d.mini, parts: {}, bars: [], phase: 1, dead: false, t: 0, flags: {}, anim: {}, pos: [0, 0, 0], intro: !d.mini };
    B.done = d.done; d.init(this, B, o); if (!d.mini) this.phase = 'boss'; this.emit('boss', { id, name: d.name, title: d.title, mini: !!d.mini });
    if (!this.replica) { this.coro(d.script(this, B, o)); this.cors[this.cors.length - 1].boss = B; } return B;
  },
  stepBoss(dt) { const B = this.boss; B.t += dt; for (const k in B.parts) { const p = B.parts[k]; p.flash = Math.max(0, (p.flash || 0) - dt); } if (B.tick) B.tick(this, B, dt); if (!B.dead && B.done && B.done(this, B)) this.bossDefeated(); },
  bossDefeated() {
    const B = this.boss; if (B.dead) return; B.dead = true; this.emit('bossdown', { id: B.id, pos: B.pos }); const best = this.players.find(p => !p.down) || this.players[0];
    for (const p of this.players) if (!p.down) this.addScore(p, B.mini ? 10000 : 30000, true);
    this.threats.length = 0; for (const q of this.proj) if (q.team === 'e') q.dead = true; this.slow = 1; const d = reg('boss', B.id); if (d.onDefeat) d.onDefeat(this, B);
  },
  bossVolumes() {
    const B = this.boss, out = []; if (!B || B.dead) return out;
    for (const k in B.parts) { const p = B.parts[k]; if (p.dead || !p.vol || p.hidden) continue; const vs = p.vol(this, B, p); for (const v of vs) { v.key = k; out.push(v); } }
    return out;
  },
  hitBoss(pl, vol, dmg, wi, pos) {
    const B = this.boss, p = B.parts[vol.key]; if (!p || p.dead) return false;
    if (vol.shield) { this.emit('impact', { pos, mat: 'steel', p: pl.id, spark: 1 }); if (wi === 2 || wi === 3) { B.shieldDown = 1.5; this.emit('shieldaside', { id: 'boss' }); } return false; }
    if (!p.vulnerable && p.vulnerable !== undefined) { this.emit('impact', { pos, mat: 'steel', p: pl.id, spark: 1 }); return false; }
    if (p.needs && !p.needs.includes(wi)) { this.emit('impact', { pos, mat: 'steel', p: pl.id, spark: 1 }); return false; }
    const mult = (vol.mult || 1) * (p.armor ? (wi === 3 ? 1 : p.armor) : 1), d = dmg * mult * (1 / Math.max(.1, tune.enemy.bossHp)) * (p.dmgMul || 1);
    p.hp -= d; p.flash = .08; pl.st.hits++; pl.chain++; pl.best = Math.max(pl.best, pl.chain); this.addScore(pl, 100); this.emit('hit', { p: pl.id, id: 'boss', part: vol.mult > 1 ? 'head' : 'torso', pos, head: vol.mult > 1 });
    p.lastHit = pl.id; B.lastHit = pl.id; if (p.onHit) p.onHit(this, B, p, pl, wi, d);
    if (p.hp <= 0 && !p.dead) { p.dead = true; p.hp = 0; this.addScore(pl, p.pts || 3000, true); this.emit('partbreak', { id: B.id, key: vol.key, pos: p.pos || pos }); this.explode((p.pos || pos)[0], (p.pos || pos)[1], (p.pos || pos)[2], 40, 'e', pl.id, 0, false); if (p.onBreak) p.onBreak(this, B, p, pl); }
    return true;
  },
  bossExplode(pl, x, y, z, rad, dmg) {
    const B = this.boss; if (!B || B.dead) return;
    for (const v of this.bossVolumes()) { const c = v.k === 's' ? v.c : [(v.box.x0 + v.box.x1) / 2, (v.box.y0 + v.box.y1) / 2, (v.box.z0 + v.box.z1) / 2]; const d = Math.hypot(c[0] - x, c[1] - y, c[2] - z); if (d < rad + (v.r || 12)) this.hitBoss(pl, v, dmg * (1 - Math.min(.7, d / (rad + 20))), 3, [x, y, z]); }
  },
  bThreat(kind, tel, o = {}) { return this.newThreat(BOSS_SRC, kind, tel * tune.enemy.telegraphMul, o); },
  bTarget() { return this.pickTarget(); },
  bossHpFrac(B, keys) { let h = 0, m = 0; for (const k of keys) { const p = B.parts[k]; if (!p) continue; h += Math.max(0, p.hp); m += p.max; } return m ? h / m : 0; },
  mkPart(B, key, o) { const p = Object.assign({ hp: 1, max: o.hp || 1, vulnerable: true, pts: 3000 }, o); p.max = o.hp; B.parts[key] = p; return p; }
});
function* waitBoss(B, secs, keep) { let t = 0; while (t < secs && !B.cockpitOut && (keep || (!B.toppleNow && !B.toppleNow2))) { yield .1; t += .1; } }
const sphereVol = (c, r, mult) => ({ k: 's', c, r, mult });
const rigVols = (x, y, f, s) => [sphereVol([x, y, f + 24.2 * s], 4.5 * s, 2), { k: 's', c: [x, y, f + 16 * s], r: 7 * s }, { k: 's', c: [x, y, f + 7 * s], r: 6 * s }];
const boxVol = (x, y, z, w, d, h, mult) => ({ k: 'box', box: { x0: x - w / 2, x1: x + w / 2, y0: y - d / 2, y1: y + d / 2, z0: z, z1: z + h }, mult });

// ---------- STINGRAY -> BARRACUDA ----------
def('boss', 'stingray', {
  name: 'BARRACUDA', title: 'Captain of the Black Current',
  init(S, B) {
    B.hull = [270, 0, 0];
    S.mkPart(B, 'turretL', { hp: 12, pos: [286, -80, 24], vol: (s, b, p) => [sphereVol(p.pos, 11)], pts: 5000, lbl: 'turret' });
    S.mkPart(B, 'turretR', { hp: 12, pos: [286, 80, 24], vol: (s, b, p) => [sphereVol(p.pos, 11)], pts: 5000, lbl: 'turret' });
    S.mkPart(B, 'barracuda', { hp: 30, hidden: true, vulnerable: false, pos: [292, 0, 62], pts: 15000, vol: (s, b, p) => rigVols(p.pos[0], p.pos[1], p.pos[2] - 24, 1.05) });
    B.bars = [{ label: 'STINGRAY', parts: ['turretL', 'turretR'] }, { label: 'BARRACUDA', parts: ['barracuda'], late: true }];
    for (const [x, y] of [[262, -52], [262, 56], [258, 4]]) S.addObj(['barrel', x, y, 0, { z: 10, onBreak: (s2, ob) => { for (const k of ['turretL', 'turretR']) { const p = B.parts[k]; if (!p.dead && Math.hypot(p.pos[0] - ob.x, p.pos[1] - ob.y) < 46) { p.hp -= 6; p.flash = .2; if (p.hp <= 0) { p.dead = true; s2.emit('partbreak', { id: B.id, key: k, pos: p.pos }); } } } } }]);
  },
  *script(S, B) {
    yield 2.8; B.intro = false; S.say('barracuda', 'CREST! The Admiral said you\'d come. He didn\'t say you\'d be this slow!'); yield 1.5; S.say('barracuda', 'Say hello to the Stingray!');
    let n = 0;
    while (!(B.parts.turretL.dead && B.parts.turretR.dead)) {
      const live = ['turretL', 'turretR'].filter(k => !B.parts[k].dead), k = S.pick(live, 'boss');
      S.emit('turretspin', { key: k }); const th = S.bThreat('turret', .85, { target: S.bTarget(), sp: B.parts[k].pos, always: true }); yield .85;
      for (let i = 0; i < 3; i++) { S.emit('eshot', { id: 'boss', from: B.parts[k].pos, kind: 'turret' }); yield .1; }
      if (++n % 2 === 0) { const alive = S.enemies.filter(e => !e.dead).length; if (alive < 2) { S.spawnEnemy('deckhand', 'd' + (1 + (n % 4)), { entry: 'jump' }); S.spawnEnemy('deckhand', 'd' + (1 + ((n + 2) % 4)), { entry: 'jump' }); } }
      yield S.rr(1.0, 1.8, 'boss');
    }
    B.phase = 2; S.emit('bossphase', { phase: 2 }); const bar = B.parts.barracuda; bar.hidden = false; S.say('barracuda', 'Enough! I\'ll finish this myself!'); yield 1.2;
    let cyc = 0;
    while (bar.hp > bar.max * .25) {
      bar.vulnerable = true; bar.pos = [292, 0, 62]; B.anim.open = 1; yield .7;
      if (cyc++ % 2 === 0) { const t = S.bTarget(), pose = S.pose(t), m = [bar.pos[0], bar.pos[1], bar.pos[2] - 6], dd = Math.hypot(pose.x - m[0], pose.y - m[1], pose.z - m[2]), T = dd / 300;
        const pr = S.spawnProj({ kind: 'harpoon', x: m[0], y: m[1], z: m[2], vx: (pose.x - m[0]) / T, vy: (pose.y - m[1]) / T, vz: (pose.z - 6 - m[2]) / T, hp: 2, r: 6, src: 'boss', tgt: t }); pr.th = S.bThreat('harpoon', T, { target: t, proj: pr.id, sp: m }); S.emit('throw', { id: 'boss', kind: 'harpoon' }); }
      else { const t = S.bTarget(), pose = S.pose(t); S.say('mari', 'Torpedo in the water! Shoot it!'); const x0 = 300, y0 = pose.y + (S.rng('boss') < .5 ? -70 : 70), T = Math.hypot(pose.x + 30 - x0, pose.y - y0) / 120;
        const pr = S.spawnProj({ kind: 'torpedo', x: x0, y: y0, z: -6, vx: (pose.x + 30 - x0) / T, vy: (pose.y - y0) / T, vz: 0, hp: 2, r: 9, src: 'boss', tgt: t }); pr.th = S.bThreat('torpedo', T, { target: t, proj: pr.id, ignoreCover: true, sp: [x0, y0, -4] }); S.emit('prompt', { id: 'torpedo' }); }
      yield 1.3; bar.vulnerable = false; B.anim.open = 0; yield 1.6;
    }
    B.phase = 3; S.emit('bossphase', { phase: 3 }); S.say('barracuda', 'This isn\'t over, CREST!'); S.emit('swing', {}); yield 1.0;
    for (let c = 0; c < 3 && !bar.dead; c++) {
      const t = S.bTarget(), pose = S.pose(t); bar.pos = [pose.x + 52, pose.y * .5, 24]; bar.vulnerable = false; B.anim.slash = 0; yield .5;
      S.emit('windup', { id: 'boss' }); S.bThreat('slash', .6, { target: t, sp: [bar.pos[0] - 6, bar.pos[1], 20] }); B.anim.slash = 1; yield .75; B.anim.slash = 0;
      bar.vulnerable = true; B.anim.stagger = 1; yield 1.5; B.anim.stagger = 0; bar.vulnerable = false; yield .5;
    }
    bar.vulnerable = true; while (!bar.dead) yield 0;
  },
  done(S, B) { return B.parts.barracuda.dead; },
  onDefeat(S, B) { S.say('barracuda', 'This isn\'t over, CREST!'); S.emit('bigboom', {}); }
});

// ---------- HAMMERHEAD ----------
def('boss', 'hammerhead', {
  name: 'HAMMERHEAD', title: 'Bruno Kessler, the Enforcer',
  init(S, B) {
    B.pos = [300, 0, 0]; B.shield = true; B.coverHp = 3; B.charge = false;
    S.mkPart(B, 'body', { hp: 45, pos: [300, 0, 0], pts: 30000, vulnerable: true, vol: (s, b, p) => {
      const x = b.pos[0], y = b.pos[1], z = b.pos[2], up = b.shield && !(b.shieldDown > 0), v = [];
      if (up) v.push({ k: 'box', box: { x0: x - 14, x1: x - 7, y0: y - 15, y1: y + 15, z0: z, z1: z + 44 }, shield: 1 });
      v.push({ k: 's', c: [x, y, z + 7], r: 7, mult: up ? .5 : 1 });
      if (!up) { v.push(sphereVol([x, y, z + 24.2 * 1.6], 4.5 * 1.6, 2)); v.push({ k: 's', c: [x, y, z + 16 * 1.6], r: 11 }); }
      return v; }, onHit(s, b, p, pl, wi, d) { if (b.charge) { b.recent = (b.recent || 0) + d; } } });
    B.parts.body.dmgMul = 1; B.bars = [{ label: 'HAMMERHEAD', parts: ['body'] }];
    B.shieldDownT = 0; B.tick = (s, b, dt) => { b.shieldDown = Math.max(0, (b.shieldDown || 0) - dt); if (b.charge) { b.recentT = (b.recentT || 0) + dt; if (b.recentT > 1.5) { b.recentT = 0; b.recent = 0; } } };
  },
  *script(S, B) {
    const bd = B.parts.body; yield 2.8; B.intro = false; S.say('hammerhead', 'KESSLER! CREST! I SMASH THEM!');
    let round = 0;
    while (bd.hp > bd.max * .5) {
      // A. shield advance
      B.anim.mode = 'walk'; while (B.pos[0] > 190 && bd.hp > bd.max * .5) { B.pos[0] -= 22 * .05; yield .05; if (B.shieldDown > 0) { B.anim.mode = 'open'; } }
      B.anim.mode = 'plant'; S.emit('prompt', { id: 'shield' });
      if (S.players.some(pl => pl.ammo[2] + pl.ammo[3] < 4) && !B.supplied) { B.supplied = 1; S.spawnEnemy('quartermaster', null, { route: [[340, -90, 0], [340, 90, 0]], drop: 'sg', speed: 36 }); S.say('juno', 'Orange vest! Shotgun shells—knock that door aside!'); } if (round % 3 === 2) B.supplied = 0;
      // B. rotary sweep
      S.say('hammerhead', 'SPINNING UP!'); S.emit('spinup', { id: 'boss' }); const t = S.bTarget(); S.bThreat('sweep', 1.2, { target: t, sp: [B.pos[0] - 8, B.pos[1], 30], always: true }); yield 1.25;
      B.anim.mode = 'sweep'; for (let i = 0; i < 6; i++) { S.emit('eshot', { id: 'boss', from: [B.pos[0] - 8, B.pos[1] + (i - 3) * 8, 30], kind: 'minigun' }); if (i === 2 || i === 4) S.bThreat('sweep', .02, { target: t, sp: [B.pos[0] - 8, B.pos[1], 30], always: true }); yield .42; }
      B.coverHp--; S.emit('covercrack', { hp: B.coverHp });
      if (B.coverHp <= 0) { B.coverHp = 3; S.emit('coverswap', {}); S.say('kai', 'Cover\'s gone—moving!'); for (const p of S.players) if (S.slotsList[p.id]) { const sl = S.slotsList[p.id]; sl.stand.y = -sl.stand.y * .6; sl.cover.y = sl.stand.y + (sl.cover.y > sl.stand.y ? 8 : -8); } S.shake = 1; }
      B.anim.mode = 'idle'; yield 1.0;
      // C. grenade volley
      if (++round % 2 === 0) { S.say('hammerhead', 'GRENADES!'); B.anim.mode = 'throw'; for (let i = 0; i < 3; i++) { const tp = S.bTarget(), pose = S.pose(tp), m = [B.pos[0] - 6, B.pos[1], 52], T = 1.3, to = [pose.x + 36 + i * 8, pose.y + (i - 1) * 14, 0];
        const pr = S.spawnProj({ kind: 'grenade', x: m[0], y: m[1], z: m[2], vx: (to[0] - m[0]) / T, vy: (to[1] - m[1]) / T, vz: (to[2] - m[2] + .5 * GRAV * T * T) / T, g: GRAV, hp: 1, r: 6, src: 'boss', tgt: tp, owner: 'boss', hurtsBoss: 1 }); pr.th = S.bThreat('grenade', T, { target: tp, proj: pr.id, sp: m }); yield .55; } yield 1.0; }
    }
    // charge phase
    B.shield = false; S.emit('shieldbreak', {}); S.say('hammerhead', 'MY DOOR! YOU BROKE MY DOOR!'); B.anim.mode = 'idle'; yield 1.4;
    while (bd.hp > 0) {
      B.charge = true; B.recent = 0; B.recentT = 0; B.anim.mode = 'charge'; const t = S.bTarget(); const pose = S.pose(t); const x0 = B.pos[0];
      for (let i = 0; i < 40 && bd.hp > 0; i++) { B.pos[0] = lerp(x0, pose.x + 54, i / 40); B.pos[1] = lerp(B.pos[1], pose.y * .6, .1); yield .05; if (B.recent >= 6) break; }
      if (B.recent >= 6) { B.anim.mode = 'stagger'; B.recent = 0; S.emit('stagger', {}); yield 1.6; B.pos[0] = 280; yield .5; continue; }
      S.emit('windup', { id: 'boss' }); S.bThreat('slam', .5, { target: t, sp: [B.pos[0] - 8, B.pos[1], 30], always: true }); B.anim.mode = 'slam'; yield .7; S.shake = 1; B.anim.mode = 'idle'; yield .6; B.pos[0] = 300; B.charge = false; yield .6;
      if (S.rng('boss') < .6) { S.emit('beamdazzle', {}); }
    }
  },
  done(S, B) { return B.parts.body.dead; },
  onDefeat(S, B) { S.say('hammerhead', 'HAMMERHEAD… FALLS… DOWN…'); }
});

// ---------- SCYLLA -> KRAKE ----------
def('boss', 'scylla', {
  name: 'SCYLLA', title: 'Admiral Krake\'s crab walker',
  init(S, B) {
    B.pos = [320, 0, 0]; B.phase = 1; B.topple = 0; B.sub = 'scylla';
    const kn = [[-70, 1], [-45, 1], [-20, 1], [20, 1], [45, 1], [70, 1]];
    for (let i = 0; i < 6; i++) S.mkPart(B, 'knee' + i, { hp: 8, pos: [320 + (i % 2) * 14, (i - 2.5) * 30, 30], pts: 3000, vol: (s, b, p) => [sphereVol([b.pos[0] + (i % 2) * 14, (i - 2.5) * 30 + b.pos[1], 26 + (b.toppled ? -14 : 0)], 8)], onBreak: (s, b) => { const down = [0, 1, 2, 3, 4, 5].filter(j => b.parts['knee' + j].dead).length; if (down >= 3 && !b.toppled && !b.once) { b.once = 1; b.toppleNow = true; } else if (down >= 5 && b.rose) { b.toppleNow2 = true; } } });
    S.mkPart(B, 'cockpit', { hp: 20, pos: [320, 0, 62], vulnerable: false, hidden: false, pts: 10000, vol: (s, b, p) => [sphereVol([b.pos[0] - 4, b.pos[1], 56 + (b.toppled ? -26 : 0)], 13)], onBreak: (s, b) => { b.cockpitOut = true; } });
    B.bars = [{ label: 'SCYLLA', parts: ['knee0', 'knee1', 'knee2', 'knee3', 'knee4', 'knee5'] }, { label: 'COCKPIT', parts: ['cockpit'] }];
  },
  *script(S, B) {
    yield 2.8; B.intro = false; S.say('juno', 'Scylla! Knees are the weak point—take them out!');
    let n = 0;
    while (!B.cockpitOut) {
      if (B.toppleNow) { B.toppleNow = false; B.toppled = true; S.emit('topple', {}); S.shake = 1; B.parts.cockpit.vulnerable = true; S.say('kai', 'Hatch is open! Hit the cockpit!'); yield* waitBoss(B, 6, true); B.parts.cockpit.vulnerable = false; if (B.cockpitOut) break; B.toppled = false; B.rose = true; S.emit('rise', {}); for (const k of ['knee0', 'knee1', 'knee2', 'knee3', 'knee4', 'knee5']) { const p = B.parts[k]; if (!p.dead) p.hp = Math.max(p.hp, p.max * .6); } n = 0; B.parts.cockpit.hp = B.parts.cockpit.max; yield 1; continue; }
      if (B.toppleNow2) { B.toppleNow2 = false; B.toppled = true; B.parts.cockpit.vulnerable = true; S.emit('topple', {}); S.shake = 1; yield* waitBoss(B, 8, true); B.parts.cockpit.vulnerable = false; if (!B.cockpitOut) { B.parts.cockpit.hp = 0; B.parts.cockpit.dead = true; B.cockpitOut = true; } break; }
      n++;
      if (n % 3 === 0) { S.say('juno', 'Missiles incoming! Shoot them down or duck!'); for (let i = 0; i < 6; i++) { const t = S.bTarget(), pose = S.pose(t), m = [B.pos[0] - 10, B.pos[1] + (i - 2.5) * 16, 74], T = 1.5 + i * .12, to = [pose.x + 6, pose.y + S.rr(-14, 14, 'boss'), pose.z - 6];
        const pr = S.spawnProj({ kind: 'missile', x: m[0], y: m[1], z: m[2], vx: (to[0] - m[0]) / T, vy: (to[1] - m[1]) / T, vz: (to[2] - m[2] + .5 * 90 * T * T) / T, g: 90, hp: 1, r: 6, src: 'boss', tgt: t }); pr.th = S.bThreat('missile', T, { target: t, proj: pr.id, sp: m, always: true }); S.emit('throw', { id: 'boss', kind: 'missile' }); yield .2; }
        yield* waitBoss(B, 2.8); }
      else { S.emit('clawcharge', {}); const tg = S.bTarget(); S.bThreat('claw', .9, { target: tg, sp: [B.pos[0] - 14, B.pos[1] + (n % 2 ? 40 : -40), 52], always: true }); yield .95; S.emit('eshot', { id: 'boss', from: [B.pos[0] - 14, B.pos[1], 52], kind: 'turret' }); yield* waitBoss(B, S.rr(1.2, 1.9, 'boss')); }
    }
    S.emit('bigboom', {}); S.emit('boss_transition', {}); S.say('krake', 'Impossible! You… you broke my beautiful Scylla!'); yield 1.6;
    S.boss = null; S.spawnBoss('krake'); S.slow = 1;
  },
  done() { return false },
  onDefeat() { }
});
def('boss', 'krake', {
  name: 'ADMIRAL KRAKE', title: 'Silas Krake, the Tide Tyrant',
  init(S, B) {
    B.pos = [250, 0, 0]; B.sub = 'krake';
    S.mkPart(B, 'krake', { hp: 40, pos: [250, 0, 0], pts: 40000, vulnerable: true, vol: (s, b, p) => b.hiding ? [] : rigVols(b.pos[0], b.pos[1], b.pos[2], 1.15) });
    S.mkPart(B, 'lever', { hp: 1, pos: [210, -40, 22], hidden: true, vulnerable: true, pts: 0, vol: (s, b, p) => [boxVol(b.pos[0] + 0, -40, 8, 10, 10, 26, 1)] });
    B.bars = [{ label: 'KRAKE', parts: ['krake'] }];
  },
  *script(S, B) {
    const kr = B.parts.krake; B.intro = false; S.say('krake', 'The sea… always… takes what is hers!'); yield 1.8; const spots = [-70, 0, 70]; let n = 0, tideLevel = 0;
    while (!kr.dead) {
      if (kr.hp <= kr.max * .15 && !B.finalDone) {
        // FINAL SHOT
        B.hiding = false; B.final = true; S.say('krake', 'If I fall, the whole bay falls with me!'); S.emit('finalshot', {}); B.pos[1] = -40; B.pos[0] = 220; S.slow = .3; S.emit('prompt', { id: 'final' });
        const lever = B.parts.lever; lever.hidden = false; lever.hp = 1; lever.dead = false; B.flags.leverHit = false; lever.onBreak = null; lever.onHit = (s, b) => { b.flags.leverHit = true; }; kr.vulnerable = true; kr.dead = false;
        let t = 0; while (t < 3 && !B.flags.leverHit && kr.hp > 0) { yield .1; t += .1 / S.slow; }
        S.slow = 1;
        if (B.flags.leverHit || kr.hp <= 0) { B.finalDone = true; kr.hp = 0; kr.dead = true; B.final = false; S.emit('finalhit', {}); break; }
        S.say('krake', 'TIDE RISING!'); S.emit('tiderise', {}); tideLevel++; S.shake = 1; B.final = false; lever.hidden = true; kr.hp = kr.max * .15 + 1; B.pos[0] = 250; yield 2; continue;
      }
      n++; B.pos[1] = spots[n % 3]; B.hiding = false; B.anim.mode = 'roll'; yield .5; B.anim.mode = 'idle';
      const r = n % 4;
      if (r === 1 || r === 3) { for (let i = 0; i < 2; i++) { const t = S.bTarget(), pose = S.pose(t), m = [B.pos[0] - 6, B.pos[1] + (i ? 6 : -6), 28], dd = Math.hypot(pose.x - m[0], pose.y - m[1]), T = dd / 160;
          const pr = S.spawnProj({ kind: 'flare', x: m[0], y: m[1], z: m[2], vx: (pose.x - m[0]) / T, vy: (pose.y - m[1]) / T, vz: (pose.z - 4 - m[2]) / T, hp: 1, r: 6, src: 'boss', tgt: t }); pr.th = S.bThreat('flare', T, { target: t, proj: pr.id, sp: m, always: true }); S.emit('throw', { id: 'boss', kind: 'flare' }); yield .5; } yield 1.4; }
      else if (r === 2) { S.say('krake', 'Smoke and mirrors, agents!'); S.emit('smoke', { dur: 3 }); B.smoke = 3; for (let i = 0; i < 2; i++) { const e = S.spawnEnemy('redtide', 'k' + (1 + ((n + i) % 3)), { entry: 'roll' }); } yield 3; }
      else { B.anim.mode = 'lunge'; S.emit('windup', { id: 'boss' }); S.bThreat('lunge', .7, { target: S.bTarget(), sp: [B.pos[0] - 8, B.pos[1], 22], always: true }); yield .9; B.anim.mode = 'idle'; yield 1; }
      kr.vulnerable = true;
    }
  },
  done(S, B) { return B.parts.krake.dead; },
  onDefeat(S, B) { S.say('krake', 'The sea… always… wins…'); S.say('kai', 'Not today.'); S.emit('bigboom', {}); }
});
// ---------- mini-bosses ----------
def('boss', 'bulldog', {
  name: 'BULLDOG', title: 'Armored truck', mini: true,
  init(S, B) {
    B.pos = [430, 0, 0];
    S.mkPart(B, 'gunner', { hp: 3, pos: [300, 10, 42], pts: 5000, vol: (s, b, p) => [sphereVol([b.pos[0], b.pos[1] + 10, 42], 6, 2), { k: 's', c: [b.pos[0], b.pos[1] + 10, 33], r: 7 }], vulnerable: true });
    S.mkPart(B, 'fuel', { hp: 6, pos: [320, -10, 22], pts: 8000, vol: (s, b, p) => [boxVol(b.pos[0] + 22, b.pos[1] - 6, 6, 18, 26, 26, 1)], vulnerable: true, onBreak: (s, b) => { s.explode(b.pos[0] + 20, b.pos[1], 20, 110, 'p', 0, 6, false); s.emit('bigboom', {}); } });
    B.bars = [{ label: 'BULLDOG', parts: ['gunner', 'fuel'] }];
  },
  *script(S, B) {
    S.say('juno', 'Something big is coming through the containers!'); while (B.pos[0] > 300) { B.pos[0] -= 4; yield .03; } S.shake = 1; S.emit('bigboom', {}); S.say('kai', 'Armored truck! Take out the gunner!');
    S.spawnEnemy('marine', 'm1', { entry: 'vehicle', from: [310, 20, 12] }); S.spawnEnemy('marine', 'm2', { entry: 'vehicle', from: [310, -36, 12] });
    while (!B.parts.gunner.dead) { if (S.decideThreat({ id: 'boss' }, { chance: [.5, .5, .5] })) { S.bThreat('bullet', 1.0, { target: S.bTarget(), sp: [B.pos[0], B.pos[1] + 10, 42] }); yield 1.0; for (let i = 0; i < 4; i++) { S.emit('eshot', { id: 'boss', from: [B.pos[0], B.pos[1] + 10, 42], kind: 'turret' }); yield .1; } } else { yield .8; } yield S.rr(.6, 1.2, 'boss'); }
    S.say('rook', 'Fuel tank—light it up!'); while (!B.parts.fuel.dead) yield 0;
  },
  done(S, B) { return B.parts.fuel.dead && B.parts.gunner.dead; }
});
def('boss', 'seawolf', {
  name: 'SEAWOLF', title: 'Black Current gunship', mini: true,
  init(S, B, o) {
    B.pos = [380, 0, 76]; B.final = !!o.final; B.retreatAt = o.final ? 0 : 30;
    if (o.final) { S.mkPart(B, 'podL', { hp: 10, pos: [380, -34, 66], pts: 4000, vol: (s, b, p) => [sphereVol([b.pos[0], b.pos[1] - 34, b.pos[2] - 10], 9)] }); S.mkPart(B, 'podR', { hp: 10, pos: [380, 34, 66], pts: 4000, vol: (s, b, p) => [sphereVol([b.pos[0], b.pos[1] + 34, b.pos[2] - 10], 9)] }); S.mkPart(B, 'hub', { hp: 15, pos: [380, 0, 100], pts: 8000, vulnerable: false, vol: (s, b, p) => [sphereVol([b.pos[0], b.pos[1], b.pos[2] + 22], 11)] }); B.bars = [{ label: 'SEAWOLF', parts: ['podL', 'podR', 'hub'] }]; }
    else { S.mkPart(B, 'body', { hp: 30, pos: [380, 0, 76], pts: 8000, vol: (s, b, p) => [sphereVol([b.pos[0], b.pos[1], b.pos[2]], 16), sphereVol([b.pos[0], b.pos[1] + 14, b.pos[2] - 4], 11)] }); B.bars = [{ label: 'SEAWOLF', parts: ['body'] }]; }
    B.tick = (s, b, dt) => { b.pos[1] = Math.sin(b.t * .55) * 110; b.pos[2] = 76 + Math.sin(b.t * 1.3) * 6; if (b.parts.hub && b.parts.podL.dead && b.parts.podR.dead) b.parts.hub.vulnerable = true; };
  },
  *script(S, B) {
    S.say('juno', 'Gunship! Duck when it strafes!'); yield 1.5; let n = 0;
    while (true) {
      const t = S.bTarget(); S.emit('strafe', {}); S.bThreat('bullet', .9, { target: t, sp: [B.pos[0], B.pos[1], B.pos[2]], always: true }); yield .9;
      for (let i = 0; i < 3; i++) { S.emit('eshot', { id: 'boss', from: [B.pos[0], B.pos[1], B.pos[2]], kind: 'turret' }); if (i) S.bThreat('bullet', .02, { target: t, sp: [B.pos[0], B.pos[1], B.pos[2]], always: true }); yield .4; }
      if (++n % 2 === 0 && S.enemies.filter(e => !e.dead).length < 3) { const c = 'r' + (1 + (n % 3)); if (S.coverOf(c)) S.spawnEnemy('marine', c, { entry: 'rappel' }); }
      yield S.rr(1.2, 2.0, 'boss');
    }
  },
  done(S, B) { return B.final ? (B.parts.hub.dead || (B.parts.podL.dead && B.parts.podR.dead && B.parts.hub.hp <= 0)) : (B.parts.body.hp <= B.parts.body.max - 30 || B.parts.body.dead || B.t > 45); },   // it also flies off after 45 s, so the scene can never soft-lock
  onDefeat(S, B) { S.say('juno', 'Seawolf is going down!'); S.emit('bigboom', {}); }
});
// the Gull is a sniper that hops between perches when hit
def('enemy', 'gull', { name: 'The Gull', hp: 4, score: 8000, ai: 'peek', exposed: [3.2, 3.6], burst: 1, gap: 0, chance: [1, 1, 1], always: true, tel: 1.4, peeks: ['up'], elite: true, laser: true,
  onHit(S, e) { const alts = S.covers.filter(c => c.perch && c.id !== (e.cover && e.cover.id)); if (!alts.length) return; const c = S.pick(alts, 'ai'); e.cover = c; e.bx = c.x + 12; e.by = c.y; e.bz = c.z0 || 0; e.x = e.bx; e.y = e.by; e.st = 'hide'; e.t = 1.2; e.p = 0; S.emit('gullhop', { id: e.id }); },
  look: { build: 'heroic', size: 1.0, outfit: 'coat', hat: { style: 'pointed', color: '#6b6f78' }, weapon: 'gun', colors: { cloth: '#6b6f78', coat: '#6b6f78', pants: '#2a2c33' } } });
