/* ---- ENEMIES and CIVILIANS: archetypes as data (rig, health, speeds, sight, moves, ranged, climbing, barks), spawned
 * from a level's guard list. Melee swings telegraph with long wind-ups; archers draw 1.6 s with a glint; Red Lantern
 * ninja climb and leap and throw stars; hounds smell and bark; civilians scream and run; disguised Red Lanterns pass
 * for servants until you come close (only Ki Focus shows their red aura) ---- */
B.def('enemy', 'ashigaru', { rig: 'ashigaru', hp: 40, walk: 30, run: 70, sightMul: 1, fovMul: 1, moves: [['thrust', 12, .42, 24], ['overhead', 10, .5, 20]], reach: 20, voice: 'guard', label: 'Ashigaru', bellRunner: false });
B.def('enemy', 'samurai', { rig: 'samurai', hp: 70, walk: 32, run: 75, sightMul: 1.05, fovMul: 1, moves: [['slash', 16, .36, 22], ['overhead', 22, .5, 22]], reach: 20, block: .5, voice: 'guard', label: 'Samurai', bellRunner: true });
B.def('enemy', 'archer', { rig: 'archer', hp: 30, walk: 28, run: 65, sightMul: 1.25, fovMul: 1.3 / 1.5, looksUp: true, ranged: 'bow', moves: [['bash', 8, .4, 18]], reach: 16, voice: 'guard', label: 'Archer', post: true });
B.def('enemy', 'ninja', { rig: 'ninja', hp: 50, walk: 40, run: 95, sightMul: 1.1, fovMul: 1.7 / 1.5, looksUp: true, climbs: true, ranged: 'shuriken', notice: 1.3, moves: [['slash', 10, .28, 20], ['backslash', 10, .28, 20]], reach: 20, voice: 'hotaru', label: 'Red Lantern ninja', barks: null, pitch: .75 });
B.def('enemy', 'hound', { rig: 'hound', hp: 20, walk: 45, run: 120, sightMul: .8, fovMul: 1.8 / 1.5, hound: true, hear: 1.5, moves: [['bite', 8, .25, 16]], reach: 16, voice: 'guard', label: 'Hound' });
B.def('enemy', 'daikon', { rig: 'daikon', hp: 60, walk: 26, run: 55, sightMul: .9, fovMul: 1, moves: [['thrust', 0, .5, 20]], reach: 20, voice: 'gonroku', label: 'Big Daikon', noBait: false, pitch: 1.3 });
B.def('enemy', 'disciple', { rig: 'disciple', hp: 30, walk: 30, run: 70, sightMul: .95, fovMul: 1, moves: [['slash', 0, .5, 20]], reach: 20, voice: 'disciple', label: 'Disciple' });
B.def('enemy', 'civ', { rig: 'servant', hp: 15, walk: 25, run: 80, sightMul: .9, fovMul: 1.6 / 1.5, civ: true, voice: 'maid', label: 'Civilian' });
const CIV_RIG = { merchant: 'merchant', maid: 'maid', monk: 'monk', drunk: 'drunk', noble: 'noble', servant: 'servant', clerk: 'clerk', kanemori: 'kanemori', sakubei: 'sakubei' };
const CIV_VOICE = { merchant: 'guard', maid: 'maid', monk: 'guard', drunk: 'guard', noble: 'maid', servant: 'maid', clerk: 'guard', kanemori: 'kanemori', sakubei: 'sakubei' };
const Enemies = {};
/** spawn a guard from a level's spec: { id, type, at: [cx, cy], z, facing (deg), mode, lantern, route: [[cx, cy, wait, look]], loop, partner, faction, disguised } */
Enemies.spawn = (s, M, faction) => {
  const A = B.get('enemy', s.type) || B.get('enemy', 'ashigaru'), W = M.world, x = cellC(s.at[0]), y = cellC(s.at[1]);
  const z = s.z !== undefined ? s.z : W.map.groundAt(x, y);
  const fac = s.faction || faction || 'kanemori';
  const rig = A.hound ? new Hound() : Rigs.make(A.rig, A.rig === 'disciple' ? s.color || '#3e5a32' : fac);
  const g = Actor.make({ kind: A.hound ? 'hound' : 'guard', id: s.id, x, y, z, facing: (s.facing || 0) * Math.PI / 180, hp: Math.round(A.hp * T('enemyHp')), rig,
    body: { walk: A.walk, run: A.run, climbMax: A.climbs ? 56 : 30, hopMax: A.climbs ? 64 : 34, jumpSpeed: A.climbs ? 250 : 200 } });
  Object.assign(g, { A, type: s.type, mode: s.mode || 'post', lantern: !!s.lantern, faction: fac, voice: A.voice, pitch: A.pitch || (.9 + ((g.uid * 37) % 30) / 100),
    mind: new E.Suspicion({ rise: T('suspRise'), decay: T('suspDecay'), forget: 7 }), home: { x, y, z, facing: (s.facing || 0) * Math.PI / 180 }, ri: 0, loop: s.loop !== false,
    route: s.route ? s.route.map(([cx, cy, wait, look]) => ({ x: cellC(cx), y: cellC(cy), z: W.map.groundAt(cellC(cx), cellC(cy)), wait: wait || 0, look: look === undefined ? null : look })) : null,
    partner: s.partner || null, sightMul: A.sightMul * (s.lantern ? 1.08 : 1), fovMul: A.fovMul, barkT: 1 + rand() * 4, idleT: 4 + rand() * 10, mark: !!s.mark, spec: s, target: null });
  if (s.mode === 'sleep') g.asleep = true;
  if (A.block) g.guardFront = { arc: 1, k: A.block };
  if (g.mode === 'patrol' && !g.route) g.mode = 'post';
  if (A.civ) Object.assign(g, { kind: 'civ', civType: s.type, team: 'civ' });
  return g;
};
Enemies.spawnCiv = (s, M) => {
  const W = M.world, x = cellC(s.at[0]), y = cellC(s.at[1]), z = s.z !== undefined ? s.z : W.map.groundAt(x, y), A = B.get('enemy', 'civ');
  const rigId = CIV_RIG[s.type] || 'servant';
  const c = Actor.make({ kind: 'civ', id: s.id, x, y, z, facing: (s.facing || 0) * Math.PI / 180, hp: A.hp, rig: Rigs.make(rigId, s.i || 0), team: 'civ', body: { walk: 25, run: 80 } });
  Object.assign(c, { A, civType: s.type, mode: s.mode || 'idle', voice: CIV_VOICE[s.type] || 'maid', mind: new E.Suspicion({ rise: T('suspRise') * 1.5, decay: .4, forget: 5 }), home: { x, y, z, facing: c.facing },
    route: s.route ? s.route.map(([cx, cy, wait]) => ({ x: cellC(cx), y: cellC(cy), z: 0, wait: wait || 2 })) : null, ri: 0, loop: true, disguised: !!s.disguised, target: s.target || false, barkT: 3, idleT: 6 + rand() * 8, spec: s, cowers: !!s.cowers, label: s.label });
  return c;
};
/** a melee enemy in reach: wind up (visible, longer than the hero's), then strike at the active moment */
Enemies.melee = (g, t, dt, M) => {
  g.fighting = true;
  if (!g.atk || !g.atk.busy) {
    if (g.atkCd > 0) return;
    const mv = g.A.moves[Math.floor(rand() * g.A.moves.length)], [name, dmg, wind, reach] = mv;
    const base = E.MOVES[name] || E.MOVES.slash;
    g.atk = new E.Attack(name === 'bite' ? 'thrust' : name, { wind: wind * T('enemyWindup'), recover: (base.recover || .3) * 1.4 });
    g.atk.dmg = dmg; g.atk.reach = reach; g.atk.start(); g.facing = ANG(g, t); g.atkCd = .5 + rand() * .7;
    sfxAt('swing', g.x, g.y, { vol: .4, pitch: .8 });
    if (name === 'overhead' || name === 'slash') B.Hud.telegraph(g, reach, 1.1, wind * T('enemyWindup'));
  }
  const ph = g.atk.update(dt);
  if (g.atk.phase === 'wind') g.facing = E.approachAng(g.facing, ANG(g, t), dt * 3);
  if (ph === 'active') {
    if (t.kind === 'hero') Combat.enemyStrike(g, g.atk.dmg, { reach: g.atk.reach + 4, arc: 1.1 });
    else if (Math.hypot(t.x - g.x, t.y - g.y) < g.atk.reach + 4) B.damage(g, t, g.atk.dmg * .7, { kind: 'melee' });
  }
};
/** an archer: draw 1.6 s (the point pose, a glint), loose an arrow at the target's chest, with a clear line */
Enemies.archer = (g, t, dt, M, seen) => {
  const W = M.world, d = Math.hypot(t.x - g.x, t.y - g.y);
  if (!seen || d > 230) { g.drawing = false; g.drawT = 0; return; }
  if (!W.map.sight(g, t)) { g.drawing = false; g.drawT = 0; return; }
  if (!g.drawing) { g.drawing = true; g.drawT = 0; sfxAt('bowDraw', g.x, g.y); }
  g.drawT += dt; g.aimUp = Math.atan2((t.z + 20) - (g.z + 26), Math.max(1, d));
  if (g.drawT >= 1.6 * T('enemyWindup')) {
    g.drawing = false; g.drawT = 0; g.atkCd = 1.2;
    const lead = .25, tx = t.x + (t.vx || 0) * lead * d / 260, ty = t.y + (t.vy || 0) * lead * d / 260, a = Math.atan2(ty - g.y, tx - g.x), dd = Math.hypot(tx - g.x, ty - g.y) || 1, tt = dd / 260;
    M.shots.fire({ x: g.x + Math.cos(a) * 6, y: g.y + Math.sin(a) * 6, z: g.z + 26, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, vz: ((t.z + 20) - (g.z + 26)) / tt, r: 2.5, team: 'enemy', color: '#e8dcc0', life: 1.2, dmg: 14, owner: g, kind: 'arrow' });
    sfxAt('arrow', g.x, g.y);
  }
};
/** a Red Lantern ninja at range: a fan of three stars every few seconds */
Enemies.ninjaThrow = (g, t, dt, M) => {
  g.throwT = (g.throwT || 2) - dt; if (g.throwT > 0) return; g.throwT = 3 + rand() * 1.5;
  const a = ANG(g, t);
  for (const k of [-1, 0, 1]) { const b = a + k * .14; M.shots.fire({ x: g.x, y: g.y, z: g.z + 20, vx: Math.cos(b) * 220, vy: Math.sin(b) * 220, vz: 0, r: 2, team: 'enemy', color: '#c8ccd8', life: .7, dmg: 6, owner: g, kind: 'shuriken' }); }
  sfxAt('shuriken', g.x, g.y); g.facing = a;
};
/** civilians: idle, wander or sit; seeing the hero or a body: a scream, then a run to the nearest guard */
Enemies.civUpdate = (c, dt, M) => {
  const W = M.world, h = M.hero;
  if (c.disguised && h && Math.hypot(h.x - c.x, h.y - c.y) < 24 && Math.abs(h.z - c.z) < 10 && !h.action) { Enemies.unmask(c, M); return; }
  let move = [0, 0], face = null;
  if (!c.disguised && !c.cowers) {
    const seen = h && !h.dead ? Perception.sees(c, h, M) : { seen: false };
    const armed = h && (h.combo.busy || h.drag);
    c.mind.update(dt, seen.seen ? Object.assign({}, seen, { exposure: seen.exposure * (armed ? 2 : 1) }) : seen, h);
    if (c.mind.state === 'alert' && !(c.status.flee > 0) && c.civType !== 'kanemori' && c.civType !== 'sakubei') Brain.scare(c, h, M);
    if (!(c.status.flee > 0)) for (const b of M.guards) if (!b.alive && !b.hidden && !b.sunk && !b.marked && Math.hypot(b.x - c.x, b.y - c.y) < 70 && W.map.sight(c, b)) { Brain.scare(c, b, M); break; }
  }
  if (c.status.flee > 0 && c.fleeTo) { const s = W.steer(c, c.fleeTo, 'walk', 1); move = s.move; c.cower = false; }
  else if (c.cowerAt) { const s = W.steer(c, c.cowerAt, 'walk', 1); move = s.move; c.cower = s.arrived || Math.hypot(c.cowerAt.x - c.x, c.cowerAt.y - c.y) < 10; if (c.cower && h) face = ANG(c, h); }
  else if (c.route) { const p = c.route[c.ri]; if (Math.hypot(p.x - c.x, p.y - c.y) < 6) { c.wait = (c.wait === undefined ? p.wait : c.wait) - dt; if (c.wait <= 0) { c.wait = undefined; c.ri = (c.ri + 1) % c.route.length; } } else move = W.steer(c, p, 'walk', .5).move; }
  else if (Math.hypot(c.home.x - c.x, c.home.y - c.y) > 8) move = W.steer(c, c.home, 'walk', .5).move;
  else face = c.home.facing;
  if (face !== null) c.facing = E.approachAng(c.facing, face, dt * 4);
  c.idleT -= dt; if (c.idleT <= 0 && !(c.status.flee > 0)) { c.idleT = 10 + rand() * 12; Brain.bark(c, c.civType === 'drunk' ? 'drunk' : c.civType === 'kanemori' ? 'kanemori' : 'civIdle'); }
  if (c.say) { c.say.t -= dt; if (c.say.t <= 0) c.say = null; }
  c.barkT -= dt;
  c.update(dt, W.map, { move });
  c.rig._post = c.cower ? Rigs.cower(game.time) : c.mode === 'sit' ? null : null;
  c.rig.update(dt, c.rigState({ crouch: c.cower || c.mode === 'sit' ? true : undefined, pose: c.mode === 'sit' && !c.status.flee ? 'kneel' : c.civType === 'drunk' && !c.status.flee ? undefined : undefined, hurt: c.hurtT > 0, expr: c.status.flee > 0 ? 'shout' : undefined }));
};
/** a disguised Red Lantern drops the servant's look: now a ninja, and alert */
Enemies.unmask = (c, M) => {
  const i = M.civs.indexOf(c); if (i >= 0) M.civs.splice(i, 1);
  const A = B.get('enemy', 'ninja'), rig = Rigs.make('ninja');
  Object.assign(c, { kind: 'guard', A, type: 'ninja', rig, disguised: false, unmasked: true, team: 'enemy', hp: Math.round(A.hp * T('enemyHp')), voice: A.voice, pitch: .75, mode: 'post', sightMul: A.sightMul, fovMul: A.fovMul, climbMax: 56, hopMax: 64, walk: A.walk, run: A.run, lantern: false, route: null });
  c.mind = new E.Suspicion({ rise: T('suspRise'), decay: T('suspDecay'), forget: 7 }); c.mind.level = 1.2; c.mind.state = 'alert'; c.mind.last = { x: M.hero.x, y: M.hero.y, z: M.hero.z }; c.target = M.hero;
  c.status = {}; Pt.smoke(c.x, c.y, c.z + 14, 12, { size: 2, color: '#6a1a1a' }); Au.sfx('vanish'); Brain.bark(c, 'unmask', true);
  M.guards.push(c); B.emit('unmask', { guard: c });
};
/** reinforcements: a samurai and an ashigaru of the level's faction from the nearest barracks door */
Enemies.reinforce = M => {
  if (!M.barracks.length || !M.hero) return;
  let best = M.barracks[0], bd = 1e9; for (const b of M.barracks) { const d = Math.hypot(b.x - M.hero.x, b.y - M.hero.y); if (d < bd) { bd = d; best = b; } }
  const cx = toCell(best.x), cy = toCell(best.y), f = M.level.faction;
  for (const [type, k] of [['samurai', 0], ['ashigaru', 1]]) {
    const g = Enemies.spawn({ id: 'r' + M.guards.length, type, at: [cx + k, cy], mode: 'post', facing: 90 }, M, f);
    g.mind.level = .8; g.mind.last = { x: M.hero.x, y: M.hero.y, z: M.hero.z }; M.guards.push(g);
  }
  B.Hud.toast('Reinforcements!', 'Fresh guards pour out of the barracks.'); sfxAt('gate', best.x, best.y); B.emit('reinforce', {});
};
B.Enemies = Enemies;
