/* ---- BOSSES: a body with health, phases at health fractions and a move set picked by distance and phase. Every move
 * telegraphs (a wind-up pose, a red ground arc or ring, a sound). No stealth kills; parries work where noted. Brother
 * Ittetsu (the sparring lesson), Gonroku the Iron Ox, Hotaru of the Red Lantern, Chamberlain Kurogane and his oni mask ---- */
const Bosses = {};
const mv = (o) => Object.assign({ wind: .5, active: .2, recover: .5, range: 30, min: 0, weight: 1, phase: 0 }, o);
B.def('boss', 'ittetsu', { name: 'Brother Ittetsu', title: 'The Bokken Monk', rig: 'ittetsu', hp: 120, voice: 'ittetsu', walk: 30, run: 60, phases: [], spar: true,
  moves: [mv({ name: 'overhead', anim: 'overhead', wind: .75, dmg: 12, range: 24, parry: true, arc: 1, lesson: 'parry' }), mv({ name: 'thrust', anim: 'thrust', wind: .55, dmg: 10, range: 40, lunge: 140, arc: .6, lesson: 'dodge', parry: false }),
    mv({ name: 'combo', anim: 'slash', wind: .45, dmg: 6, range: 24, hits: 3, gap: .32, arc: 1.2, lesson: 'block', parry: true })] });
B.def('boss', 'gonroku', { name: 'Gonroku', title: 'The Iron Ox', rig: 'gonroku', hp: 300, voice: 'gonroku', walk: 34, run: 70, phases: [.5],
  moves: [mv({ name: 'smash', anim: 'overhead', wind: .55, dmg: 30, range: 30, arc: .55, stuck: 1.2, parry: false, decal: 'arc' }), mv({ name: 'sweep', anim: 'spin', wind: .4, dmg: 20, range: 30, arc: 1.05, parry: true, decal: 'arc' }),
    mv({ name: 'charge', anim: 'twohand', wind: .6, dmg: 24, range: 160, min: 50, charge: 160, dur: 1, parry: false, decal: 'line' }), mv({ name: 'quake', anim: 'overhead', wind: .7, dmg: 18, range: 70, ring: 60, phase: 1, parry: false, decal: 'ring', weight: 1.4 })] });
B.def('boss', 'hotaru', { name: 'Hotaru', title: 'Of the Red Lantern', rig: 'hotaru', hp: 220, voice: 'hotaru', walk: 50, run: 110, phases: [.5], climbs: false,
  moves: [mv({ name: 'fan', anim: 'throw', wind: .4, dmg: 7, range: 140, min: 30, stars: 4, parry: false }), mv({ name: 'dash', anim: 'slash', wind: .3, dmg: 14, range: 90, min: 0, lunge: 220, parry: true, arc: .8, decal: 'line' }),
    mv({ name: 'vanish', anim: 'cast', wind: .25, dmg: 16, range: 200, vanish: 1.2, parry: true, weight: .8 }), mv({ name: 'clones', anim: 'cast', wind: .5, range: 300, phase: 1, clones: 2, weight: .6, once: 8 })] });
B.def('boss', 'kurogane', { name: 'Chamberlain Kurogane', title: 'The Iron Seal', rig: 'kurogane', hp: 420, voice: 'kurogane', walk: 30, run: 66, phases: [.5],
  moves: [mv({ name: 'threecut', anim: 'slash', wind: .45, dmg: 14, range: 30, hits: 3, gap: .3, arc: 1.1, parry: true, decal: 'arc' }), mv({ name: 'lunge', anim: 'thrust', wind: .55, dmg: 22, range: 70, min: 25, lunge: 180, arc: .6, parry: true, decal: 'line' }),
    mv({ name: 'ironguard', anim: 'block', wind: .2, guard: 2, range: 60, parry: false, weight: .6, p0: true }),
    mv({ name: 'flame', anim: 'overhead', wind: .6, dmg: 12, range: 90, phase: 1, flame: 3, decal: 'line' }), mv({ name: 'volley', anim: 'cast', wind: .6, dmg: 15, range: 220, min: 40, phase: 1, balls: 3 }),
    mv({ name: 'roar', anim: 'cast', wind: .6, range: 44, ring: 40, phase: 1, roar: true, decal: 'ring' }), mv({ name: 'spirits', anim: 'cast', wind: .7, range: 300, phase: 1, spirits: 2, weight: .5, once: 12 })] });
/** spawn the boss of a level spec: { id, at: [cx, cy], z, arena: [cx0, cy0, cx1, cy1] } */
Bosses.spawn = (spec, M) => {
  const D = B.get('boss', spec.id), W = M.world, x = cellC(spec.at[0]), y = cellC(spec.at[1]), z = spec.z !== undefined ? spec.z : W.map.groundAt(x, y);
  const b = Actor.make({ kind: 'boss', id: spec.id, x, y, z, facing: (spec.facing || 90) * Math.PI / 180, hp: Math.round(D.hp * T('enemyHp')), rig: Rigs.make(D.rig), body: { walk: D.walk, run: D.run, climbMax: 20, hopMax: 20 } });
  Object.assign(b, { D, spec, A: { label: D.name }, voice: D.voice, phase: 0, active: false, cool: 1.2, move: null, mt: 0, used: {}, alive: true, home: { x, y, z }, mind: null, guardT: 0, defeated: false,
    arena: spec.arena ? { x0: spec.arena[0] * T16, y0: spec.arena[1] * T16, x1: (spec.arena[2] + 1) * T16, y1: (spec.arena[3] + 1) * T16 } : null });
  b.onDeath = (src, o) => Bosses.defeat(b, M);
  b.onHit = () => { if (b.move && b.move.def.name === 'vanish' && b.vanished) return; };
  return b;
};
/** the fight begins: walls close, the camera pans to the boss, the name card, a line, the boss song */
Bosses.start = (b, M) => {
  if (b.active || b.defeated) return;
  b.active = true; M.bossFight = b; B.emit('boss', { boss: b, phase: 'start' });
  const L = M.level.boss || {};
  for (const c of L.close || []) M.world.setCells(c[0], c[1], c[2], c[3], c[4] || '#');
  B.Music.play('boss', { fade: .5 }); Au.tempo && Au.tempo(b.id === 'kurogane' ? 148 : b.id === 'hotaru' ? 144 : 132);
  B.Hud.bossCard(b.D.name, b.D.title);
  if (M.mode !== 'attract' && M.mode !== 'hub') {
    M.cine = 2.2; B.Cam.override = { x: b.x, y: b.y, z: b.z + 20 }; B.Cam.cine(1.35, 2);
    M.timers.push({ t: 2.2, fn: () => { B.Cam.override = null; } });
  }
  const line = B.Story.lines[b.id + '_intro']; if (line) B.Cutscene.bark(b, line, b.voice);
};
Bosses.update = (b, dt, M) => {
  const h = M.hero, W = M.world;
  b.hurtT = Math.max(0, b.hurtT - dt); b.flash = Math.max(0, b.flash - dt);
  for (const k in b.status) if (b.status[k] > 0) b.status[k] = Math.max(0, b.status[k] - dt);
  if (b.say) { b.say.t -= dt; if (b.say.t <= 0) b.say = null; }
  if (b.D.spar && b.defeated) { b.update(dt, W.map, { move: [0, 0] }); b.rig.update(dt, b.rigState({ pose: 'kneel' })); return; }
  if (!b.alive) { b.rig.update(dt, { x: b.x, y: b.y, z: b.z, facing: b.facing, down: 1 }); return; }
  if (!b.active || M.cine > 0 || M.cheats.freezeAI || !h) { b.update(dt, W.map, { move: [0, 0] }); if (h && b.active) b.facing = E.approachAng(b.facing, ANG(b, h), dt * 2); Bosses.rig(b, dt); return; }
  // phases at health fractions
  const fr = b.hp / b.maxHp; while (b.phase < b.D.phases.length && fr <= b.D.phases[b.phase]) { b.phase++; Bosses.phase(b, M); }
  if (b.status.stagger > 0 || b.status.stun > 0) { b.move = null; b.update(dt, W.map, { move: [0, 0] }); Bosses.rig(b, dt, { hurt: true }); return; }
  b.guardFront = b.guardT > 0 ? { arc: 1.4, k: 1 } : null; b.guardT = Math.max(0, b.guardT - dt);
  const d = Math.hypot(h.x - b.x, h.y - b.y);
  let move = [0, 0];
  if (!b.move) {
    b.cool -= dt;
    // close in (or keep distance for ranged moves); pick a move when cool
    const want = b.D.id === 'hotaru' ? 50 : 22;
    if (d > want + 6 && !h.dead) { const s = W.steer(b, h, 'walk', d > 90 ? 1 : .5); move = s.move; }
    b.facing = E.approachAng(b.facing, ANG(b, h), dt * 4);
    if (b.cool <= 0 && !h.dead) Bosses.pick(b, d, M);
  } else move = Bosses.runMove(b, dt, d, M) || [0, 0];
  if (b.arena && !b.vanished) { b.x = clamp(b.x, b.arena.x0 + 6, b.arena.x1 - 6); b.y = clamp(b.y, b.arena.y0 + 6, b.arena.y1 - 6); }
  if (!b.vanished) b.update(dt, W.map, { move });
  Bosses.rig(b, dt);
};
Bosses.rig = (b, dt, extra = {}) => {
  const m = b.move, anim = m && m.def.anim, st = {};
  if (m && anim && anim !== 'block' && anim !== 'cast' && anim !== 'throw') { const ph = m.ph === 'wind' ? 'wind' : m.ph === 'active' ? 'active' : 'recover'; st.attack = E.move(anim, clamp(m.u, 0, 1), ph); }
  if (m && anim === 'throw') st.attack = E.move('throw', clamp(m.u, 0, 1), m.ph === 'wind' ? 'wind' : 'active');
  if (m && anim === 'cast') st.pose = 'cast';
  if (m && anim === 'block' || b.guardT > 0) st.pose = 'block';
  st.stance = 'ready'; st.expr = b.phase ? 'angry' : undefined;
  b.rig.update(dt, b.rigState(Object.assign(st, { hurt: b.hurtT > .15 }, extra)));
};
/** choose a move: in range, in phase, weighted; 'once' moves wait their own cooldown */
Bosses.pick = (b, d, M) => {
  const opts = b.D.moves.filter(m => m.phase <= b.phase && d <= m.range + 8 && d >= m.min && !(m.once && b.used[m.name] > game.time) && !(m.p0 && b.phase > 0 && b.id === 'kurogane' && false));
  if (!opts.length) { b.cool = .2; return; }
  let tot = 0; for (const m of opts) tot += m.weight; let r = rand() * tot, def = opts[0]; for (const m of opts) { r -= m.weight; if (r <= 0) { def = m; break; } }
  if (def.once) b.used[def.name] = game.time + def.once;
  b.moveLog = b.moveLog || {}; b.moveLog[def.name] = (b.moveLog[def.name] || 0) + 1;
  const k = b.phase ? .8 : 1;
  b.move = { def, ph: 'wind', t: 0, u: 0, hit: 0, wind: def.wind * T('enemyWindup') * k, from: { x: b.x, y: b.y }, aim: ANG(b, M.hero), hitDone: false };
  if (b.D.spar && def.lesson) B.Hud.lesson(def.lesson);
  if (def.decal === 'arc') B.Hud.telegraph(b, def.range, def.arc, b.move.wind);
  else if (def.decal === 'ring') B.Hud.telegraphRing(b, def.ring, b.move.wind);
  else if (def.decal === 'line') B.Hud.telegraphLine(b, b.move.aim, def.lunge ? def.lunge * .45 : def.charge ? def.charge : 80, b.move.wind);
  sfxAt(def.name === 'quake' || def.name === 'smash' ? 'stomp' : 'swing', b.x, b.y, { vol: .5, pitch: .7 });
  if (def.name === 'vanish') { Au.sfx('shing'); }
};
/** start one named move now (tests and the dev tools): its wind-up, telegraph and strike as in a fight */
Bosses.force = (b, name, M) => { const def = b.D.moves.find(m => m.name === name); if (!def) return false; b.cool = 0; const keep = b.D.moves; b.D.moves = [def]; const d = Math.hypot(M.hero.x - b.x, M.hero.y - b.y); const ph = b.phase; b.phase = Math.max(b.phase, def.phase); const r = def.range, mn = def.min; def.range = 1e9; def.min = 0; Bosses.pick(b, d, M); def.range = r; def.min = mn; b.D.moves = keep; b.phase = ph; return !!b.move; };
Bosses.runMove = (b, dt, d, M) => {
  const m = b.move, def = m.def, h = M.hero; m.t += dt;
  let move = null;
  if (m.ph === 'wind') {
    m.u = m.t / m.wind; b.facing = E.approachAng(b.facing, def.lunge || def.charge ? m.aim : ANG(b, h), dt * (def.charge ? 1 : 3)); if (!def.charge) m.aim = ANG(b, h);
    if (m.t >= m.wind) { m.ph = 'active'; m.t = 0; Bosses.strike(b, m, M); }
    return null;
  }
  if (m.ph === 'active') {
    const dur = def.dur || def.active || .2; m.u = m.t / dur;
    if (def.lunge && m.t < .25) { const sp = def.lunge; move = null; const nx = b.x + Math.cos(m.aim) * sp * dt, ny = b.y + Math.sin(m.aim) * sp * dt; if (M.world.map.standable(nx, ny, b.z, b.r)) { b.x = nx; b.y = ny; } if (!m.hitDone && Math.hypot(h.x - b.x, h.y - b.y) < 22) { m.hitDone = Combat.enemyStrike(b, def.dmg, { reach: 24, arc: 1.4, parry: def.parry, knock: 120 }); } }
    if (def.charge) {
      const nx = b.x + Math.cos(m.aim) * def.charge * dt, ny = b.y + Math.sin(m.aim) * def.charge * dt;
      if (!M.world.map.standable(nx, ny, b.z, b.r) || (b.arena && (nx < b.arena.x0 + 6 || nx > b.arena.x1 - 6 || ny < b.arena.y0 + 6 || ny > b.arena.y1 - 6))) { b.status.stun = 2; game.shake(5); Au.sfx('stomp'); Pt.dust(b.x, b.y, b.z, 10); B.Cutscene.bark(b, 'Nnngh...!', b.voice); b.move = null; b.cool = 2.4; return null; }
      b.x = nx; b.y = ny; if (crand() < .5) Pt.dust(b.x, b.y, b.z, 1);
      if (!m.hitDone && Math.hypot(h.x - b.x, h.y - b.y) < 20) m.hitDone = Combat.enemyStrike(b, def.dmg, { reach: 24, arc: Math.PI, parry: false, knock: 200 });
    }
    if (def.hits && m.hit < def.hits && m.t >= m.hit * def.gap) { m.hit++; b.facing = ANG(b, h); Combat.enemyStrike(b, def.dmg, { reach: def.range, arc: def.arc, parry: def.parry }); sfxAt('swing', b.x, b.y, { vol: .5 }); }
    if (m.t >= dur && (!def.hits || m.hit >= def.hits)) { m.ph = 'recover'; m.t = 0; }
    return move;
  }
  m.u = m.t / (def.stuck && !m.hitDone ? def.stuck : def.recover) ;
  if (m.u >= 1) { b.move = null; b.cool = (b.phase ? .55 : .9) + rand() * .5; }
  return null;
};
/** the moment a move lands (or begins its effect) */
Bosses.strike = (b, m, M) => {
  const def = m.def, h = M.hero, W = M.world;
  if (def.name === 'smash' || def.name === 'sweep' || def.name === 'overhead' && !def.hits) { m.hitDone = Combat.enemyStrike(b, def.dmg, { reach: def.range, arc: def.arc, parry: def.parry, knock: 140 }); if (def.name === 'smash') { game.shake(5); Pt.dust(b.x + Math.cos(b.facing) * 20, b.y + Math.sin(b.facing) * 20, b.z, 12); Au.sfx('stomp'); } }
  if (def.name === 'quake') {
    game.shake(6); Au.sfx('stomp'); Pt.ring && Pt.ring(b.x, b.y, 4, def.ring, '#e8b04a', .5);
    M.waves.push({ x: b.x, y: b.y, z: b.z, r: 0, max: def.ring, speed: 120, dmg: def.dmg, by: b, hit: false });
  }
  if (def.name === 'fan') { const n = def.stars + b.phase, a0 = ANG(b, h); for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * .18; M.shots.fire({ x: b.x, y: b.y, z: b.z + 20, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, vz: 0, r: 2, team: 'enemy', color: '#e8e0f0', life: .9, dmg: def.dmg, owner: b, kind: 'shuriken' }); } Au.sfx('shuriken'); Pt.glints(b.x, b.y, b.z + 20, 4, '#ffffff'); }
  if (def.name === 'vanish') {
    b.vanished = true; Pt.smoke(b.x, b.y, b.z + 12, 18, { size: 2.5, color: '#4a1a2a' }); Au.sfx('vanish'); b.untouchable = true;
    M.timers.push({ t: def.vanish, fn: () => { if (!b.alive) return; const a = h.facing + Math.PI; b.x = h.x + Math.cos(a) * 18; b.y = h.y + Math.sin(a) * 18; b.z = h.z; b.facing = ANG(b, h); b.vanished = false; b.untouchable = false; Au.sfx('shing'); Pt.smoke(b.x, b.y, b.z + 12, 10, { size: 2, color: '#4a1a2a' }); M.world.dyn.push({ x: b.x, y: b.y, z: 20, r: 40, i: .8, t: .5, color: '#ff3a2a' });
      M.timers.push({ t: .32, fn: () => { if (b.alive) Combat.enemyStrike(b, def.dmg, { reach: 26, arc: 1.4, parry: true }); } }); } });
  }
  if (def.name === 'clones') { Pt.smoke(b.x, b.y, b.z + 12, 14, { size: 2, color: '#6a1a2a' }); for (let i = 0; i < def.clones; i++) Bosses.clone(b, M, i); B.Cutscene.bark(b, B.Story.lines.hotaru_clones, b.voice); }
  if (def.name === 'ironguard') { b.guardT = def.guard; B.Hud.toast('Iron Guard', 'He blocks every blow from the front. Flank him, or use a tool.'); }
  if (def.name === 'flame') { const a = b.facing; for (let i = 1; i <= 6; i++) M.fires.push({ x: b.x + Math.cos(a) * i * 12, y: b.y + Math.sin(a) * i * 12, z: b.z, r: 9, t: def.flame, dmg: def.dmg }); Au.sfx('fire'); }
  if (def.name === 'volley') { for (let i = 0; i < def.balls; i++) { const tx = h.x + (rand() - .5) * 50, ty = h.y + (rand() - .5) * 50, from = { x: b.x, y: b.y, z: b.z + 30 }, v = E.arc(from, { x: tx, y: ty, z: h.z }, 600, { apex: 40 }); M.balls.push({ x: from.x, y: from.y, z: from.z, vx: v.vx, vy: v.vy, vz: v.vz, dmg: def.dmg, by: b, mark: { x: tx, y: ty, z: h.z } }); B.Hud.telegraphRing({ x: tx, y: ty, z: h.z }, 20, v.t); } Au.sfx('fire'); }
  if (def.name === 'roar') { Au.sfx('roar'); game.shake(6); if (Math.hypot(h.x - b.x, h.y - b.y) < def.ring && !h.blocking) { h.stunT = 1.2; B.damage(b, h, 6, { kind: 'roar', unblockable: true }); B.Hud.toast('Stunned!', 'Block against the roar.'); } }
  if (def.name === 'spirits') { for (let i = 0; i < def.spirits; i++) Bosses.spirit(b, M, i); }
};
/** Hotaru's illusions: one hit pops them; they throw fans too */
Bosses.clone = (b, M, i) => {
  const a = rand() * TAU, x = clamp(b.x + Math.cos(a) * 40, b.arena ? b.arena.x0 + 8 : 0, b.arena ? b.arena.x1 - 8 : 1e9), y = clamp(b.y + Math.sin(a) * 40, b.arena ? b.arena.y0 + 8 : 0, b.arena ? b.arena.y1 - 8 : 1e9);
  const c = Actor.make({ kind: 'spirit', id: 'clone' + i, x, y, z: b.z, hp: 1, rig: Rigs.make('hotaru') }); c.clone = true; c.t = 0; c.throwT = 1 + i * .7; c.A = { label: 'Illusion' };
  c.onDeath = () => { Pt.smoke(c.x, c.y, c.z + 12, 10, { size: 2, color: '#6a1a2a' }); Au.sfx('vanish'); };
  M.summons.push(c);
};
/** Kurogane's spirit flames: blobs of fire that chase and burst */
Bosses.spirit = (b, M, i) => {
  const c = Actor.make({ kind: 'spirit', id: 'spirit' + i, x: b.x + (i ? 20 : -20), y: b.y, z: b.z, hp: 1, rig: new E.Blob({ R: 5, colors: { dk: '#8a1a0a', base: '#ff6a2a', lt: '#ffd070', spec: '#ffffff', eye: '#fff4c0', pupil: '#3a0a00' }, mouth: 'fangs' }) });
  c.spirit = true; c.t = 0; c.A = { label: 'Spirit flame' }; c.onDeath = () => { Pt.fire(c.x, c.y, c.z + 6, 8); };
  M.summons.push(c);
};
Bosses.updateSummons = (dt, M) => {
  const h = M.hero, W = M.world;
  for (const c of M.summons) {
    if (!c.alive) continue; c.t += dt; c.hurtT = Math.max(0, c.hurtT - dt);
    if (c.clone) {
      c.facing = ANG(c, h); c.throwT -= dt;
      if (c.throwT <= 0) { c.throwT = 2.2; const a0 = ANG(c, h); for (let k = -1; k <= 1; k++) { const a = a0 + k * .2; M.shots.fire({ x: c.x, y: c.y, z: c.z + 20, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, vz: 0, r: 2, team: 'enemy', color: '#e8e0f0', life: .8, dmg: 4, owner: c, kind: 'shuriken' }); } }
      c.rig.update(dt, c.rigState({ stance: 'ready', attack: c.throwT > 1.9 ? E.move('throw', (2.2 - c.throwT) / .3) : null }));
    } else if (c.spirit) {
      const a = ANG(c, h), sp = 46; c.x += Math.cos(a) * sp * dt; c.y += Math.sin(a) * sp * dt; c.z = approach(c.z, h.z + 6 + Math.sin(c.t * 4) * 3, 40 * dt);
      if (crand() < .5) Pt.fire(c.x, c.y, c.z + 4, 1);
      W.dynStep.push({ x: c.x, y: c.y, z: c.z + 8, r: 40, i: .7, color: '#ff7a3a' });
      c.rig.update(dt, { look: [Math.cos(a), Math.sin(a)], squash: Math.sin(c.t * 8) * .15 });
      if (Math.hypot(h.x - c.x, h.y - c.y) < 10) { B.damage(c, h, 10, { kind: 'fire', unblockable: false }); c.alive = false; Pt.fire(c.x, c.y, c.z, 10); Au.sfx('fire'); }
    }
  }
  E.prune(M.summons, c => !c.alive && c.t !== undefined && (c.deadT = (c.deadT || 0) + dt) > .2);
  for (const w of M.waves) { w.r += w.speed * dt; const d = Math.hypot(h.x - w.x, h.y - w.y); if (!w.hit && Math.abs(d - w.r) < 6 && h.onGround && Math.abs(h.z - w.z) < 8) { w.hit = true; B.damage(w.by, h, w.dmg, { kind: 'quake', unblockable: true }); } }
  E.prune(M.waves, w => w.r > w.max);
  for (const f of M.fires) { f.t -= dt; if (crand() < dt * 10) Pt.fire(f.x + (crand() - .5) * 8, f.y + (crand() - .5) * 8, f.z + 2, 1); W.dynStep.push({ x: f.x, y: f.y, z: f.z + 6, r: 30, i: .5, color: '#ff8a30' }); if (Math.hypot(h.x - f.x, h.y - f.y) < f.r && Math.abs(h.z - f.z) < 8 && h.iframes <= 0) B.damage(null, h, f.dmg * .5, { kind: 'fire', unblockable: true }); }
  E.prune(M.fires, f => f.t <= 0);
  for (const bl of M.balls) { bl.vz -= 600 * dt; bl.x += bl.vx * dt; bl.y += bl.vy * dt; bl.z += bl.vz * dt; if (crand() < .7) Pt.fire(bl.x, bl.y, bl.z, 1); const gz = W.map.groundAt(bl.x, bl.y, 0, bl.z + 4); if (bl.z <= gz) { bl.done = true; Pt.explosion(bl.x, bl.y, gz + 4, .7, { shake: 2 }); if (Math.hypot(h.x - bl.x, h.y - bl.y) < 20) B.damage(bl.by, h, bl.dmg, { kind: 'fire' }); } }
  E.prune(M.balls, bl => bl.done);
};
/** a phase change: Gonroku rages, Hotaru splits, Kurogane's mask wakes */
Bosses.phase = (b, M) => {
  game.flash('#ffffff', .15, .7); game.shake(5); b.move = null; b.cool = 1.4;
  const line = B.Story.lines[b.id + '_phase2']; if (line) B.Cutscene.bark(b, line, b.id === 'kurogane' ? 'oni' : b.voice);
  if (b.id === 'kurogane') {
    const rig = Rigs.make('kuroganeOni'); rig.update(0, b.rigState()); b.rig = rig; b.voice = 'oni'; b.walk = 38; b.run = 80;
    Pt.fire(b.x, b.y, b.z + 20, 30, { size: 2 }); Au.sfx('roar'); M.cine = 1.6; B.Cam.cine(1.5, 1.6); B.Hud.bossCard('The Oni of Shuten', 'The mask wakes');
  }
  if (b.id === 'gonroku') { b.walk = 42; b.run = 86; }
  B.emit('boss', { boss: b, phase: 'phase2' });
};
/** defeat: slow motion, a white flash, the line, a checkpoint, the arena opens */
Bosses.defeat = (b, M) => {
  if (b.defeated) return false;
  b.defeated = true; b.move = null; b.vanished = false; b.untouchable = false;
  for (const c of M.summons) c.alive = false;
  game.flash('#ffffff', .3, 1); game.timeScale = .35; M.timers.push({ t: .5, fn: () => { game.timeScale = (B.Dev && B.Dev.timeScale) || 1; } });
  const line = B.Story.lines[b.id + '_defeat']; if (line) B.Cutscene.bark(b, line, b.voice, 3.5);
  const L = M.level.boss || {}; for (const c of L.open || []) M.world.setCells(c[0], c[1], c[2], c[3], c[4] || '.');
  M.bossFight = null; B.Music.play(M.level.music || 'm1', { fade: 1.2 });
  B.emit('boss', { boss: b, phase: 'defeat' }); B.emit('bossDefeated', { boss: b });
  if (b.D.spar) { b.hp = 1; return false; }   // the monk kneels: "Well struck."
  if (b.id === 'hotaru') { Pt.smoke(b.x, b.y, b.z + 12, 30, { size: 3, color: '#3a1a2a' }); M.timers.push({ t: 1.2, fn: () => { b.sunk = true; } }); }
  M.timers.push({ t: .6, fn: () => B.Mission.checkpoint(M, 'boss') });
  return true;
};
B.Bosses = Bosses;
