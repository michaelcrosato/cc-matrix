/* ---- BOSSES: four duels. Every move is telegraphed: a wind-up pose, a red mark on the ground, a sound. ---- */
const BOSSES = {
  ittetsu: { name: 'Brother Ittetsu', hp: 120, size: 1.25, build: 'heroic', cloth: '#d8d0b8', weapon: 'sword', speed: 40, melee: 10, moves: [
    { id: 'overhead', move: 'overhead', wind: .62, rec: .55, range: 26, arc: 1.2, dmg: 12, parry: true, kind: 'melee', min: 0, max: 40 },
    { id: 'thrust', move: 'thrust', wind: .5, rec: .5, range: 44, arc: .4, dmg: 10, kind: 'lunge', speed: 150, act: .22, min: 20, max: 80 },
    { id: 'combo', move: 'slash', wind: .45, rec: .6, range: 26, arc: 1.3, dmg: 8, kind: 'combo', parry: true, min: 0, max: 40 }] },
  gonroku: { name: 'Gonroku the Iron Ox', hp: 300, size: 1.9, build: 'bulky', cloth: '#6a3a2a', weapon: 'sword', speed: 30, melee: 18, moves: [
    { id: 'smash', move: 'twohand', wind: .55, rec: .6, range: 34, arc: .9, dmg: 30, kind: 'melee', stuck: 1.2, min: 0, max: 42 },
    { id: 'sweep', move: 'spin', wind: .4, rec: .5, range: 34, arc: 2.1, dmg: 20, kind: 'melee', parry: true, min: 0, max: 40 },
    { id: 'charge', move: 'bash', wind: .6, rec: .6, range: 90, arc: .6, dmg: 24, kind: 'charge', speed: 160, act: 1, min: 40, max: 140 },
    { id: 'quake', move: 'plunge', wind: .7, rec: .6, range: 60, arc: 6.3, dmg: 18, kind: 'ring', r1: 64, act: .3, min: 0, max: 80, p2: true }] },
  hotaru: { name: 'Hotaru of the Red Lantern', hp: 220, size: 1.2, build: 'heroic', cloth: '#9a1a2a', hood: true, weapon: 'sword', speed: 52, melee: 10, moves: [
    { id: 'fan', move: 'cast', wind: .5, rec: .5, range: 150, kind: 'fan', n: 4, dmg: 8, min: 30, max: 170 },
    { id: 'dash', move: 'slash', wind: .3, rec: .5, range: 60, arc: .5, dmg: 15, kind: 'lunge', speed: 200, act: .25, parry: true, min: 20, max: 90 },
    { id: 'vanish', move: 'slash', wind: .35, rec: .5, range: 120, kind: 'vanish', dmg: 18, min: 40, max: 200 }] },
  kurogane: { name: 'Chamberlain Kurogane', hp: 420, size: 1.8, build: 'heroic', cloth: '#2a2a3a', armor: true, weapon: 'sword', speed: 36, melee: 14, moves: [
    { id: 'three', move: 'slash', wind: .45, rec: .6, range: 28, arc: 1.3, dmg: 14, kind: 'combo', parry: true, min: 0, max: 40 },
    { id: 'lunge', move: 'thrust', wind: .5, rec: .6, range: 60, arc: .4, dmg: 22, kind: 'lunge', speed: 170, act: .3, min: 20, max: 90 },
    { id: 'guard', move: 'twohand', wind: .2, rec: .2, range: 999, kind: 'guard', act: 2, min: 0, max: 999 },
    { id: 'flame', move: 'cast', wind: .6, rec: .5, range: 150, kind: 'trail', dmg: 8, min: 20, max: 170, p2: true },
    { id: 'volley', move: 'cast', wind: .6, rec: .6, range: 160, kind: 'fan', n: 3, dmg: 14, min: 30, max: 190, p2: true, fire: true },
    { id: 'roar', move: 'cast', wind: .6, rec: .7, range: 50, kind: 'roar', dmg: 6, min: 0, max: 50, p2: true }] }
};
function initBoss(m) {
  S.boss = null; S.bossDef = m.boss ? BOSSES[m.boss.id] : null; S.bossCfg = m.boss || null; S.bossTrig = false;
}
function spawnBoss() {
  const def = S.bossDef, cfg = S.bossCfg, z = S.m.id === 'moon' ? 160 : 0;
  const b = new E.Mover({ x: cc(cfg.at[0]), y: cc(cfg.at[1]), z, r: 6, run: def.speed, walk: def.speed, climb: false, hopMax: 0 });
  Object.assign(b, { id: cfg.id, def, name: def.name, hp: def.hp * B.tune.bossHp, hpMax: def.hp * B.tune.bossHp, phase: 1, st: 'idle', mv: null, t: 0, cool: 1.2, atk: null, stun: 0, stuck: 0, guard: 0, alpha: 1, active: false, comboN: 0, clones: [], oni: false, dead: false, hitDone: false, dirx: 1, diry: 0,
    bounds: cfg.arena.map((v, i) => i < 2 ? v * T : (v + 1) * T), rig: null });
  b.rig = new E.Humanoid({ size: def.size, build: def.build, weapon: def.weapon, hood: !!def.hood, armor: !!def.armor, hat: cfg.id === 'kurogane' ? 'helmet' : cfg.id === 'gonroku' ? 'band' : undefined, outfit: 'coat', sleeves: 'long',
    colors: { cloth: def.cloth, coat: def.cloth, pants: '#201a20', metal: '#d0d0e0', trim: '#c8a850', skin: '#e0b088' } });
  b.facing = Math.PI / 2; b.def2 = { dmg: 10 };
  S.boss = b; return b;
}
function bossTrigger() {
  if (!S.bossDef || S.bossTrig || S.bossDone) return;
  const cfg = S.bossCfg, hero = S.hero, d = Math.hypot(hero.x - cc(cfg.trigger[0]), hero.y - cc(cfg.trigger[1]));
  const ok = d < cfg.trigger[2] * T && (S.m.id !== 'moon' || hero.z > 150) && (S.m.id !== 'lake' || (S.tobei && S.tobei.free));
  if (!ok) return;
  S.bossTrig = true; const b = spawnBoss(); b.active = false;
  const lines = B.STORY.bossIn[cfg.id];
  A.music(B.SONGS.boss); A.sfx('taiko'); S.cutscene = true;
  S.talk.say(lines.map(l => ({ name: B.NAMES[l[0]], text: l[1] })).map(l => l.text), { name: B.NAMES[lines[0][0]], onDone: () => { b.active = true; S.cutscene = false; } });
  B.babble(lines[0][0], lines[0][1], .9);
  S.bossIntro = true;
}
function bossUpdate(dt) {
  const b = S.boss; if (!b || b.dead || !b.active) { if (b && !b.active) { b.rig.update(dt, { x: b.x, y: b.y, z: b.z, facing: Math.atan2(S.hero.y - b.y, S.hero.x - b.x), vx: 0, vy: 0 }); } return; }
  const hero = S.hero, def = b.def, d = dist2(b, hero); b.facing = b.st === 'idle' || b.st === 'wind' ? E.approachAng(b.facing, Math.atan2(hero.y - b.y, hero.x - b.x), dt * (b.st === 'wind' ? 3 : 6)) : b.facing;
  b.alpha = b.st === 'vanish' ? .15 : 1;
  if (b.stun > 0) { b.stun -= dt; b.update(dt, S.map, { move: [0, 0] }); bossRig(b, dt); return; }
  if (b.stuck > 0) { b.stuck -= dt; b.update(dt, S.map, { move: [0, 0] }); bossRig(b, dt); return; }
  b.run = def.speed * (b.phase === 2 && b.id !== 'ittetsu' ? 1.25 : 1);
  let move = [0, 0];
  if (b.guard > 0) { b.guard -= dt; b.update(dt, S.map, { move: [0, 0] }); bossRig(b, dt, 'block'); return; }
  if (b.st === 'idle') {
    b.cool -= dt;
    if (d > def.melee + 8) { const a = Math.atan2(hero.y - b.y, hero.x - b.x); move = [Math.cos(a), Math.sin(a)]; }
    if (b.cool <= 0) {
      const opts = def.moves.filter(m => d >= m.min && d <= m.max && (!m.p2 || b.phase === 2) && !(m.kind === 'guard' && (b.hp > b.hpMax * .8)));
      if (opts.length) { b.mv = pickOf(opts); startMove(b); }
    }
  } else if (b.st === 'wind') {
    b.t += dt; const began = b.atk ? b.atk.update(dt) : null;
    if (b.t >= b.mv.wind * (b.phase === 2 ? .85 : 1)) { b.st = 'active'; b.t = 0; b.hitDone = false; bossActivate(b); }
  } else if (b.st === 'active') {
    b.t += dt; bossActive(b, dt, d);
  } else if (b.st === 'recover') {
    b.t += dt; if (b.t >= b.mv.rec) { b.st = 'idle'; b.cool = (b.phase === 2 ? .5 : .9) + rnd() * .5; b.mv = null; }
  } else if (b.st === 'vanish') {
    b.t += dt; if (b.t > 1.2) { const a = hero.facing + Math.PI; b.x = clamp(hero.x + Math.cos(a) * 16, b.bounds[0] + 6, b.bounds[2] - 6); b.y = clamp(hero.y + Math.sin(a) * 16, b.bounds[1] + 6, b.bounds[3] - 6); b.st = 'active'; b.t = 0; b.hitDone = false; b.facing = Math.atan2(hero.y - b.y, hero.x - b.x); A.sfx('twang', { pitch: 1.5 }); P.smoke(b.x, b.y, 10, 8, { size: 5 }); b.atk = new E.Attack('backslash', { wind: .01, active: .2, recover: .2 }); b.atk.start(); }
  }
  if (b.id === 'gonroku' && b.st === 'active' && b.mv.kind === 'charge') { /* moved in bossActive */ }
  else b.update(dt, S.map, { move: b.st === 'idle' ? move : [0, 0] });
  b.x = clamp(b.x, b.bounds[0], b.bounds[2]); b.y = clamp(b.y, b.bounds[1], b.bounds[3]);
  // phase two
  if (b.phase === 1 && b.hp <= b.hpMax * .5 && b.id !== 'ittetsu') bossPhase2(b);
  for (const c of b.clones) cloneUpdate(c, dt);
  bossRig(b, dt);
}
function bossRig(b, dt, pose) {
  b.rig.update(dt, b.rigState({ attack: b.atk ? b.atk.state : null, pose: pose || (b.mv && (b.mv.kind === 'fan' || b.mv.kind === 'trail' || b.mv.kind === 'roar') && (b.st === 'wind') ? 'cast' : null), stance: b.st === 'idle' ? 'ready' : null, hurt: b.stun > 0 }));
}
function startMove(b) {
  const m = b.mv; b.st = 'wind'; b.t = 0; b.comboN = 0;
  if (m.kind === 'vanish') { b.st = 'vanish'; b.t = 0; A.sfx('twang', { pitch: 2 }); P.smoke(b.x, b.y, 10, 10, { size: 5 }); return; }
  if (m.kind === 'guard') { b.guard = m.act; toast('Iron Guard', 'Flank him, or use tools.', 1.5); A.sfx('hit', { pitch: .6 }); b.st = 'idle'; b.cool = 1; return; }
  b.atk = new E.Attack(m.move, { wind: m.wind, active: .18, recover: m.rec });
  if (m.kind !== 'fan' && m.kind !== 'roar' && m.kind !== 'trail' && m.kind !== 'ring') b.atk.start();
  A.sfx('swing', { vol: .5, pitch: .7 }); if (m.kind === 'charge') A.sfx('taiko');
}
function bossActivate(b) {
  const m = b.mv, hero = S.hero;
  if (m.kind === 'fan') {
    const a0 = Math.atan2(hero.y - b.y, hero.x - b.x);
    for (let i = 0; i < m.n; i++) { const a = a0 + (i - (m.n - 1) / 2) * .22; S.things.push({ type: 'arrow', fire: !!m.fire, x: b.x, y: b.y, z: b.z + 20, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, t: 2, from: { def: { dmg: m.dmg } } }); }
    A.sfx('shoot', { pitch: 1.6 }); b.mvDone = true;
  } else if (m.kind === 'trail') {
    const a = b.facing; for (let i = 1; i <= 8; i++) S.things.push({ type: 'trail', x: b.x + Math.cos(a) * i * 14, y: b.y + Math.sin(a) * i * 14, z: b.z, t: 3 }); A.sfx('explode', { vol: .4 });
  } else if (m.kind === 'roar') {
    A.sfx('boom'); game.shake(4); P.ring(b.x, b.y, 4, 40, '#ff6040', .5);
    if (dist2(b, hero) < 40 && !(game.input.down('block')) && !S.god) { S.hero.vx = S.hero.vy = 0; S.stunT = .8; hurtHero(m.dmg, b); }
    // summon spirit flames
    if (S.m.id === 'moon' && S.guards.filter(g => g.spirit && !g.dead).length < 2) for (let i = 0; i < 2; i++) spawnSpirit(b.x + (i ? 24 : -24), b.y);
  } else if (m.kind === 'ring') {
    A.sfx('boom'); game.shake(6); P.ring(b.x, b.y, 4, m.r1, '#ffc080', .6); b.ringT = .5;
  } else if (m.kind === 'lunge' || m.kind === 'charge') b.dash = m.act;
  else if (m.kind === 'melee' || m.kind === 'combo') bossStrike(b, m);
  b.t = 0;
}
function bossActive(b, dt, d) {
  const m = b.mv, hero = S.hero;
  if (m.kind === 'lunge' || m.kind === 'charge') {
    const dx = Math.cos(b.facing), dy = Math.sin(b.facing), nx = b.x + dx * m.speed * dt, ny = b.y + dy * m.speed * dt;
    if (S.map.heightAt(nx, ny) <= b.z + 4 && nx > b.bounds[0] && nx < b.bounds[2] && ny > b.bounds[1] && ny < b.bounds[3]) { b.x = nx; b.y = ny; } else if (m.kind === 'charge') { b.stuck = 2; b.st = 'recover'; b.t = 0; game.shake(6); A.sfx('boom'); toast('Gonroku hit the wall!', 'Strike now.', 1.6); return; }
    if (!b.hitDone && dist2(b, hero) < 16 && E.sameLevel(b, hero, 14)) { b.hitDone = true; hurtHero(m.dmg * B.tune.enemyDamage, b); }
    if (b.t >= m.act) { b.st = 'recover'; b.t = 0; }
  } else if (m.kind === 'combo') {
    if (b.t > .45 && b.comboN < 2) { b.comboN++; b.t = 0; b.atk = new E.Attack(b.comboN === 1 ? 'backslash' : 'overhead', { wind: .3, active: .15, recover: .1 }); b.atk.start(); bossStrike(b, m, true); }
    else if (b.comboN >= 2 && b.t > .4) { b.st = 'recover'; b.t = 0; }
  } else if (m.kind === 'ring') {
    b.ringT -= dt; const prog = 1 - clamp(b.ringT / .5, 0, 1), rr = prog * m.r1;
    if (!b.hitDone && dist2(b, hero) < rr + 6 && hero.z < b.z + 6 && !S.god) { b.hitDone = true; hurtHero(m.dmg, b); }
    if (b.ringT <= 0) { b.st = 'recover'; b.t = 0; }
  } else { if (b.t > .15) { b.st = 'recover'; b.t = 0; } }
  if (b.id === 'hotaru' && b.mv.id === 'vanish' && !b.hitDone && b.atk && b.t > .1) { b.hitDone = true; if (dist2(b, hero) < 26) hurtHero(m.dmg * B.tune.enemyDamage, b); }
}
function bossStrike(b, m, quiet) {
  const hero = S.hero; A.sfx('swing', { vol: .6 });
  if (E.inArc(b, b.facing, hero, m.range + 4, m.arc, 14)) hurtHero(m.dmg * B.tune.enemyDamage, b);
  if (m.stuck && !E.inArc(b, b.facing, hero, m.range + 4, m.arc, 14)) { b.stuck = m.stuck; }
}
function bossPhase2(b) {
  b.phase = 2; b.stun = 1.2; b.st = 'idle'; b.cool = 1.2; A.sfx('boom'); game.flash('#ffffff', .2); game.shake(5);
  const line = B.STORY.bossPhase[b.id]; if (line) say(b.id, line, 3);
  if (b.id === 'hotaru') for (let i = 0; i < 2; i++) b.clones.push({ x: b.x + (i ? 30 : -30), y: b.y + 10, z: b.z, hp: 1, t: 1 + i, rig: new E.Humanoid({ size: 1.2, build: 'heroic', hood: true, weapon: 'sword', outfit: 'coat', colors: { cloth: '#9a1a2a', coat: '#9a1a2a' } }), f: 0 });
  if (b.id === 'kurogane') { b.oni = true; b.rig = new E.Humanoid({ size: 2.1, build: 'heroic', weapon: 'sword', armor: true, hat: 'helmet', eyeGlow: '#ff4020', outfit: 'coat', sleeves: 'long', colors: { cloth: '#4a1a2a', coat: '#4a1a2a', metal: '#d0d0e0', eye: '#ff4020' } }); toast('The oni mask wakes', 'Shuten hungers.', 3); A.music(B.SONGS.boss); }
}
function spawnSpirit(x, y) {
  const g = makeGuard({ type: 'ninja', at: [x / T, y / T], mode: 'post', z: S.boss.z }, S.guards.length);
  g.x = x; g.y = y; g.z = S.boss.z; g.spirit = true; g.hp = 12; g.def = Object.assign({}, B.ENEMY.ninja, { hp: 12, sight: 200, name: 'Spirit Flame' });
  g.rig = new E.Blob({ R: 6, colors: { dk: '#601010', base: '#ff5020', lt: '#ffa040', spec: '#fff0a0', eye: '#fff', pupil: '#400' }, horns: false, wings: false, mouth: true });
  g.mind.level = 1.2; g.mind.last = { x: S.hero.x, y: S.hero.y, z: S.hero.z }; g.alerted = true; S.guards.push(g);
}
function cloneUpdate(c, dt) {
  c.t -= dt; c.f += dt; const hero = S.hero, a = Math.atan2(hero.y - c.y, hero.x - c.x); c.facing = a;
  if (c.t <= 0) { c.t = 2.4; S.things.push({ type: 'arrow', x: c.x, y: c.y, z: c.z + 20, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, t: 2, from: { def: { dmg: 6 } } }); A.sfx('shoot', { pitch: 1.8, vol: .3 }); }
  c.rig.update(dt, { x: c.x, y: c.y, z: c.z, facing: a, vx: 0, vy: 0, pose: c.t > 2.1 ? 'cast' : null });
}
function bossHits() {
  const b = S.boss, hero = S.hero; if (!b || b.dead || !b.active) return;
  S.combo.hits([b], x => E.inArc(hero, hero.facing, x, 28, 1.3, 14), x => {
    const front = Math.abs(E.angDiff(b.facing, Math.atan2(hero.y - b.y, hero.x - b.x))) < 1.0;
    if (b.guard > 0 && front) { A.sfx('hit', { pitch: .5 }); P.sparks(b.x, b.y, b.z + 20, 8, hero.facing); toast('Blocked', 'Flank him.', 1); return; }
    damageBoss(16 * B.tune.damage * (B.save.chara === 'kaede' ? .9 : 1.1), true);
  });
  for (const c of b.clones) if (c.hp > 0) S.combo.hits([c], x => E.inArc(hero, hero.facing, x, 28, 1.4, 14), x => { c.hp = 0; P.smoke(c.x, c.y, 10, 8, { size: 5 }); A.sfx('pop'); });
  b.clones = b.clones.filter(c => c.hp > 0);
}
function damageBoss(n, fx) {
  const b = S.boss; if (!b || b.dead) return; if (b.guard > 0 && !fx) n *= .2;
  b.hp -= n; if (fx) game.hitFx(b.x, b.y, b.z + 20, { power: 1, damage: Math.round(n), angle: S.hero.facing });
  if (b.st === 'idle' || b.stuck > 0) b.stun = Math.max(b.stun, b.stuck > 0 ? 0 : .15);
  if (b.hp <= 0) bossDefeated(b);
}
function bossParry() {
  const b = S.boss; if (!b || !b.active || b.dead || b.st !== 'wind' || !b.mv.parry || b.t < b.mv.wind * .3 || dist2(b, S.hero) > 36) return false;
  b.atk && b.atk.cancel(); b.st = 'idle'; b.stun = 1.6; b.cool = 1; damageBoss(18, true); return true;
}
function bossDefeated(b) {
  b.dead = true; S.bossDone = true; S.score += 800; b.active = false;
  game.flash('#ffffff', .4); game.freeze(.2); game.timeScale = .3; game.after(.5, () => { game.timeScale = B.tune.timeScale; });
  P.explosion(b.x, b.y, b.z + 20, 1.5);
  const line = B.STORY.bossOut[b.id]; say(b.id, line, 3.5);
  A.music(B.SONGS[S.m.music]); A.layer('chase', 0, .02);
  S.guards.forEach(g => { if (g.spirit) killGuard(g, 'boss'); });
  completeObj('boss'); S.hp = Math.min(S.hpMax, S.hp + 30);
}
