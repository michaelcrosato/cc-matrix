/* ---- GUARD MINDS: a state machine on the engine's E.Suspicion (calm, notice, search, alert) with the game's own states
 * on top: patrol, post, sleep, chat, eating bait, stunned, blinded, poisoned, staggered, fleeing, returning, running for
 * the bell. Order each step: perceive -> mind -> behavior -> move (the shared flow fields on the nav map) -> rig ---- */
const Brain = {};
const BARK_CD = 2;
Brain.bark = (g, cat, force) => {
  const lines = (g.A && g.A.barks && g.A.barks[cat]) || B.Story.barks[cat]; if (!lines || !lines.length) return;
  if (!force && g.barkT > 0) return;
  const text = pickR(lines), len = B.Voice.bark(text, g.voice || 'guard', g.x, g.y, { pitch: g.pitch || 1, force });
  if (len || force) { g.say = { text, t: clamp((len || 1) + 1, 1.5, 2.5) }; g.barkT = BARK_CD + 1.5; }
};
/** a noise reached this guard with strength s */
Brain.hear = (g, s, n, kind, M) => {
  if (g.disguised && kind !== 'explosion') return;
  if (g.asleep || g.status.sleep > 0) { if (s > .5 || kind === 'bell' || kind === 'explosion') { g.asleep = false; g.status.sleep = 0; g.mind.level = Math.max(g.mind.level, .7); Brain.bark(g, 'notice'); } else return; }
  if (g.status.eat > 0 && s < .6) return;
  if (g.kind === 'civ') { if (s > .5 && (kind === 'explosion' || kind === 'shout' || kind === 'scream')) Brain.scare(g, n, M); return; }
  const at = n.target || { x: n.x, y: n.y, z: n.z };
  if (kind === 'shout' || kind === 'bell') { g.mind.hear(Math.max(.7, s), at); g.mind.level = Math.max(g.mind.level, .7); g.mind.last = { x: at.x, y: at.y, z: at.z }; return; }
  g.mind.hear(s, at);
  if (g.A && g.A.hound && s > .3 && g.mind.state !== 'alert') { Brain.houndBark(g, M); }
};
Brain.houndBark = (g, M) => { if (g.barkHT > 0) return; g.barkHT = 2.5; g.barking = .6; sfxAt('bark', g.x, g.y); B.noise(g.x, g.y, g.z, 150, 'bark', g); };
Brain.scare = (c, from, M) => {
  if (!c.alive || c.status.flee > 0 || c.disguised) return;
  c.status.flee = 9; c.mind.level = 1.2; Brain.bark(c, 'civilian', true); B.noise(c.x, c.y, c.z, 160, 'scream', c);
  let best = null, bd = 1e9; for (const g of M.guards) if (g.alive && g.kind !== 'hound') { const d = Math.hypot(g.x - c.x, g.y - c.y); if (d < bd) { bd = d; best = g; } }
  c.fleeTo = best ? { x: best.x, y: best.y, z: best.z } : { x: c.home.x, y: c.home.y, z: c.home.z };
  if (best && from) { best.mind.hear(.9, { x: from.x, y: from.y, z: from.z || 0 }); best.mind.level = Math.max(best.mind.level, .75); }
  B.emit('scream', { civ: c });
};
const ST_BARK = { notice: 'notice', search: 'search', alert: 'alert' };
Brain.update = (g, dt, M) => {
  const W = M.world, h = M.hero;
  if (g.cutBy) { g.rig.update(dt, g.cutBy.otherState()); return; }
  if (!g.alive) { if (g.dragged) g.rig.update(dt, { x: g.x, y: g.y, z: g.z, facing: g.facing, down: 1 }); else g.rig.update(dt, { x: g.x, y: g.y, z: g.z, facing: g.facing, down: g.marked ? 0 : 1, pose: g.marked ? 'kneel' : undefined }); return; }
  for (const k in g.status) if (g.status[k] > 0) g.status[k] = Math.max(0, g.status[k] - dt);
  g.barkT -= dt; g.barkHT = (g.barkHT || 0) - dt; g.hurtT = Math.max(0, g.hurtT - dt); g.flash = Math.max(0, g.flash - dt); g.atkCd = Math.max(0, (g.atkCd || 0) - dt);
  if (g.say) { g.say.t -= dt; if (g.say.t <= 0) g.say = null; }
  if (g.barking > 0) g.barking -= dt;
  if (g.lantern) W.dynStep.push({ x: g.x + Math.cos(g.facing) * 6, y: g.y + Math.sin(g.facing) * 6, z: g.z + 16, r: 48, i: .8, color: '#ffc070' });
  if (M.cheats.freezeAI) { g.vx = g.vy = 0; Brain.rig(g, dt); return; }
  if (g.dragged) return;
  // ---- incapacitated ----
  if (g.status.poison > 0) { g.update(dt, W.map, { move: [0, 0] }); if (g.status.poison <= dt * 1.01) { g.alive = false; g.hp = 0; Au.sfx('bodyDrop'); B.emit('kill', { victim: g, how: 'poison' }); } Brain.rig(g, dt, { hurt: true, expr: 'wince', pose: 'kneel' }); return; }
  if (g.asleep || g.status.sleep > 0) {
    g.snoreT = (g.snoreT || 0) - dt; if (g.snoreT <= 0) { g.snoreT = 3; sfxAt('snore', g.x, g.y, { vol: .6 }); B.noise(g.x, g.y, g.z, 20, 'snore', g); }
    g.update(dt, W.map, { move: [0, 0] }); g.rig._post = Rigs.sleeping(game.time + g.uid); g.rig.update(dt, g.rigState({ pose: 'kneel', crouch: true })); return;
  }
  if (g.status.stun > 0 || g.status.stagger > 0) { g.update(dt, W.map, { move: [0, 0] }); Brain.rig(g, dt, { hurt: g.status.stagger > 0 ? false : true, pose: g.status.stagger > 0 ? 'guard' : undefined }); return; }
  if (g.status.eat > 0) {
    g.update(dt, W.map, { move: [0, 0] }); if (crand() < dt * 2) sfxAt('crunch', g.x, g.y, { vol: .5 });
    if (g.status.eat <= dt * 1.01) Brain.ate(g, M);
    g.rig._post = Rigs.eating(game.time); g.rig.update(dt, g.rigState({ crouch: true })); return;
  }
  if (g.kind === 'civ') { B.Enemies.civUpdate(g, dt, M); return; }
  // ---- perceive: the hero (and Tobei on an escort) ----
  const A = g.A, blind = g.status.blind > 0;
  g.mind.rise = T('suspRise') * (A.notice || 1) * (M.heightened > 0 ? 1.3 : 1); g.mind.decay = T('suspDecay');
  let seen = { seen: false, exposure: 0 }, tgt = h;
  if (!blind && h && !h.dead && (!h.swim || !h.dive)) seen = Perception.sees(g, h, M);
  if (seen.seen && seen.exposure < .03) seen = { seen: false, exposure: 0, d: seen.d };
  if (!seen.seen && M.escort && M.escort.alive && !M.escort.caged && !blind) { const s2 = Perception.sees(g, M.escort, M); if (s2.seen && s2.exposure > .05) { seen = s2; tgt = M.escort; } }
  g.seesHero = seen.seen && tgt === h;
  if (A.hound && h && !h.dive && !blind) { const d = Math.hypot(h.x - g.x, h.y - g.y); if (d < (h.crouch ? 40 : 60) && Math.abs(h.z - g.z) < 30 && g.mind.state !== 'alert') { g.mind.hear(.8, { x: h.x, y: h.y, z: h.z }); Brain.houndBark(g, M); } }
  const was = g.mind.state;
  if (blind) { if (g.mind.level > .64) g.mind.level = .64; g.mind.update(dt, false, tgt); if (g.mind.level > .64) g.mind.level = .64; }
  else g.mind.update(dt, seen, tgt);
  const st = g.mind.state;
  if (seen.seen) g.target = tgt; else if (st !== 'alert') g.target = null;
  if (st !== was) {
    if (ST_BARK[st] && AWARE_RANK[st] > AWARE_RANK[was]) Brain.bark(g, ST_BARK[st], st === 'alert');
    if (st === 'calm' && was !== 'calm') { Brain.bark(g, 'lost'); g.returning = true; g.searchPts = null; }
    if (st === 'alert') Brain.onAlert(g, seen.seen && tgt === h, M);
    if (st === 'search') { g.searchT = 4; g.searchPts = null; }
  }
  // ---- bodies: a guard who sees one runs to it, shouts, and the level is heightened ----
  g.bodyT = (g.bodyT || 0) - dt;
  if (g.bodyT <= 0 && !blind) { g.bodyT = .3; Brain.lookForBodies(g, M); }
  // ---- behavior ----
  let goal = null, run = false, face = null, kind = A.climbs ? 'ninja' : 'walk';
  if (A.hound) kind = 'walk';
  if (g.bellRun && M.alarm.rung === 0) {
    const b = g.bellRun; goal = b; run = true;
    if (Math.hypot(b.x - g.x, b.y - g.y) < 16) { g.ringT = (g.ringT || 0) + dt; face = ANG(g, b); goal = null; if (crand() < dt * 6) sfxAt('bell', b.x, b.y, { vol: .25 }); if (g.ringT >= 1.5) { B.Alarm.ring(M, g); g.bellRun = null; g.ringT = 0; } }
  } else if (st === 'alert' && g.target) {
    const t = g.target, d = Math.hypot(t.x - g.x, t.y - g.y), same = Math.abs(t.z - g.z) < 12;
    g.lastSeenT = seen.seen ? 0 : (g.lastSeenT || 0) + dt;
    if (A.ranged === 'bow') { B.Enemies.archer(g, t, dt, M, seen.seen); face = ANG(g, t); if (d < 24 && same) { goal = { x: g.x - (t.x - g.x), y: g.y - (t.y - g.y), z: g.z }; run = true; } }
    else if (A.hound) { if (d < 18 && same) B.Enemies.melee(g, t, dt, M); else { goal = t; run = true; } }
    else {
      if (A.ranged === 'shuriken' && d > 40 && d < 120 && seen.seen) B.Enemies.ninjaThrow(g, t, dt, M);
      if (d < (A.reach || 20) + 2 && same) { B.Enemies.melee(g, t, dt, M); face = ANG(g, t); }
      else if (!(g.atk && g.atk.busy)) { goal = W.reachable(g, t, kind) ? t : null; run = true; face = goal ? null : ANG(g, t); if (!goal && g.mind.last) goal = null; }
    }
    if (g.atk && g.atk.busy) goal = null;
  } else if (st === 'alert') { goal = g.mind.last; run = true; }
  else if (st === 'search' && g.mind.last) {
    const L = g.mind.last, d = Math.hypot(L.x - g.x, L.y - g.y);
    if (!g.searchPts && d > 10 && W.reachable(g, L, kind)) { goal = L; run = M.heightened > 0; }
    else {
      g.searchT -= dt; g.lookA = (g.lookA || 0) + dt;
      if (!g.searchPts) g.searchPts = [];
      if (g.searchT > 0 && !g.searchPts.length) face = g.facing + Math.sin(g.lookA * 1.6) * dt * 2.2;
      else {
        if (!g.searchPts.length) { for (let i = 0; i < 3; i++) { const a = rand() * TAU, r2 = 24 + rand() * 48, p = { x: L.x + Math.cos(a) * r2, y: L.y + Math.sin(a) * r2, z: L.z || 0 }; if (W.map.standable(p.x, p.y, W.map.groundAt(p.x, p.y), 4) && W.reachable(g, p, kind)) g.searchPts.push(p); } if (!g.searchPts.length) g.searchPts.push({ x: L.x, y: L.y, z: L.z }); g.searchT = 99; }
        goal = g.searchPts[0]; if (Math.hypot(goal.x - g.x, goal.y - g.y) < 8) { g.searchPts.shift(); g.searchT = 1.5; if (!g.searchPts.length) g.searchPts = [{ x: L.x, y: L.y, z: L.z }]; goal = null; }
      }
    }
  } else if (st === 'notice' && g.mind.last) { face = ANG(g, g.mind.last); }
  else {
    // calm: the bait, then the mode's routine (or the walk back to it)
    const bait = Brain.seeBait(g, M);
    if (bait) { goal = bait; if (Math.hypot(bait.x - g.x, bait.y - g.y) < 9) { goal = null; bait.taken = g; g.bait = bait; g.status.eat = 2; Brain.bark(g, 'bait', true); } }
    else if (g.returning) { goal = g.route ? g.route[g.ri || 0] : g.home; if (!goal || Math.hypot(goal.x - g.x, goal.y - g.y) < 8) { g.returning = false; goal = null; } }
    else { const r2 = Brain.routine(g, dt, M); goal = r2.goal; face = r2.face; }
    if (!goal && !bait) { g.idleT = (g.idleT || 0) - dt; if (g.idleT <= 0) { g.idleT = 12 + rand() * 13; if (g.mode !== 'sleep') Brain.bark(g, g.mode === 'chat' ? 'chat' : 'idle'); } }
  }
  // ---- move along the nav map ----
  let move = [0, 0], jump = false;
  if (goal) { const s = W.steer(g, goal, kind, run ? 1 : .5); move = s.move; jump = s.jump; if (s.arrived) move = [0, 0]; }
  if (g.status.limp > 0) move = [move[0] * .5, move[1] * .5];
  if (face !== null && Math.hypot(move[0], move[1]) < .05) g.facing = E.approachAng(g.facing, face, dt * 5);
  g.walk = A.walk; g.run = A.run * (g.status.limp > 0 ? .5 : 1) * (M.heightened > 0 && run ? 1.05 : 1);
  g.update(dt, W.map, { move, sprint: false, crouch: false, jumpPressed: jump });
  if (g.inHazard) { g.inHazard = false; g.respawn(); }
  Brain.rig(g, dt);
};
Brain.rig = (g, dt, extra = {}) => {
  const alert = g.mind && g.mind.state === 'alert';
  if (g.A && g.A.hound) { g.rig.update(dt, { x: g.x, y: g.y, z: g.z, vx: g.vx, vy: g.vy, facing: g.facing, state: g.barking > 0 ? 'bark' : g.status.eat > 0 ? 'eat' : g.mind && g.mind.state === 'search' ? 'sniff' : 'walk', hurt: g.hurtT > 0 }); return; }
  g.rig._post = g.mode === 'chat' && g.mind && g.mind.state === 'calm' ? Rigs.chat(game.time + g.uid) : g.cower ? Rigs.cower(game.time) : null;
  g.rig.update(dt, g.rigState(Object.assign({ attack: g.atk && g.atk.busy ? g.atk.state : null, stance: alert ? 'ready' : null, hurt: g.hurtT > .1, point: !!g.drawing, aim: g.aimUp || 0 }, extra)));
};
/** the calm routine of a guard's mode: patrol waypoints (wait, look), a post's sweeping gaze, a chat, sleep */
Brain.routine = (g, dt, M) => {
  if (g.mode === 'patrol' && g.route && g.route.length) {
    const p = g.route[g.ri];
    if (Math.hypot(p.x - g.x, p.y - g.y) < 6) {
      g.wait = (g.wait === undefined ? p.wait || 0 : g.wait) - dt;
      if (g.wait > 0) return { goal: null, face: p.look !== undefined && p.look !== null ? p.look * Math.PI / 180 : null };
      g.wait = undefined; g.ri = (g.ri + 1) % g.route.length; if (!g.loop && g.ri === 0) g.route.reverse();
    }
    return { goal: g.route[g.ri], face: null };
  }
  const home = g.home;
  if (Math.hypot(home.x - g.x, home.y - g.y) > 8) return { goal: home, face: null };
  if (g.mode === 'post') return { goal: null, face: home.facing + Math.sin(game.time * Math.PI / 4 + g.uid) * Math.PI / 3 };
  if (g.mode === 'chat' && g.partner) { const p = M.guards.find(o => o.id === g.partner); if (p && p.alive) return { goal: null, face: ANG(g, p) }; }
  return { goal: null, face: home.facing };
};
Brain.seeBait = (g, M) => {
  if (!M.baits.length || g.A.noBait) return null;
  for (const b of M.baits) {
    if (b.taken || b.gone) continue;
    const d = Math.hypot(b.x - g.x, b.y - g.y);
    if (g.A.hound ? d < 120 : (d < T('baitRange') && E.sees(g, { x: b.x, y: b.y, z: b.z, chest: 2 }, { map: M.world.map, range: T('baitRange'), fov: T('sightFov') }).seen)) { if (M.world.reachable(g, b)) return b; }
  }
  return null;
};
Brain.ate = (g, M) => {
  const b = g.bait; if (!b) return; b.gone = true; g.bait = null;
  B.emit('baitEaten', { guard: g, kind: b.kind });
  if (b.kind === 'poison') { g.status.poison = 3; Brain.bark(g, 'poisoned', true); }
  else if (b.kind === 'sleep' || M.flags.sleepHerb) { g.status.sleep = 25; Brain.bark(g, 'sleepy', true); }
};
Brain.lookForBodies = (g, M) => {
  const W = M.world, R = T('bodyRange');
  for (const b of M.guards.concat(M.civs)) {
    if (b === g || !Actor.isBody(b) || b.hidden || b.sunk || b.found || b.marked || b.dragged && M.hero && M.hero.drag === b && false) continue;
    if (b.alive) continue;
    const d = Math.hypot(b.x - g.x, b.y - g.y); if (d > R) continue;
    if (W.isHide(b.x, b.y, b.z) || W.lightAt(b.x, b.y, b.z) < .3 || W.isDeep(b.x, b.y, b.z)) continue;
    const s = E.sees(g, { x: b.x, y: b.y, z: b.z, chest: 3, exposure: .5 + W.lightAt(b.x, b.y, b.z) * .5 }, { map: W.map, range: R, fov: T('sightFov') });
    if (!s.seen || s.exposure < .35) continue;
    b.found = true; g.mind.level = Math.max(g.mind.level, .9); g.mind.last = { x: b.x, y: b.y, z: b.z };
    Brain.bark(g, 'body', true); B.noise(g.x, g.y, g.z, T('alertShout'), 'shout', g);
    M.heightened = Math.max(M.heightened, 90);
    const bell = B.Alarm.nearestBell(g, M); if (bell && M.alarm.rung === 0 && !M.alarm.runner) { g.bellRun = bell; M.alarm.runner = g; }
    B.emit('bodyFound', { guard: g, body: b });
    return;
  }
};
Brain.onAlert = (g, sawHero, M) => {
  if (sawHero && M.detectCd <= 0) { M.stats.detections++; M.detectCd = 5; B.emit('detected', { guard: g }); }
  if (T('alertShout') > 0) { const t = g.target || M.hero; B.noise(g.x, g.y, g.z, T('alertShout'), 'shout', g); for (const o of M.guards) if (o !== g && o.alive && o.mind && Math.hypot(o.x - g.x, o.y - g.y) < T('alertShout')) { o.mind.last = { x: t.x, y: t.y, z: t.z }; } }
  const bell = B.Alarm.nearestBell(g, M);
  if (bell && M.alarm.rung === 0 && !M.alarm.runner && !g.A.ranged && !g.A.hound && (g.A.bellRunner || !M.guards.some(o => o.alive && o.A.bellRunner && Math.hypot(o.x - bell.x, o.y - bell.y) < 240))) { g.bellRun = bell; M.alarm.runner = g; Brain.bark(g, 'bell', true); }
  B.emit('alert', { guard: g });
};
/* ---- THE ALARM: a bell rung after 1.5 s; everyone searches; the level stays heightened; two waves at most ---- */
const Alarm = {};
Alarm.nearestBell = (g, M) => { let best = null, bd = 240; for (const b of M.bells) { const d = Math.hypot(b.x - g.x, b.y - g.y); if (d < bd) { bd = d; best = b; } } return best; };
Alarm.ring = (M, by) => {
  if (M.alarm.rung >= 2) return;
  M.alarm.rung++; M.alarm.runner = null; M.heightened = Infinity;
  const at = by && by.bellRun ? by.bellRun : by;
  Au.sfx('bell'); game.shake(2); B.Hud.toast('The alarm bell rings!', 'The garrison is roused.');
  const last = M.hero ? { x: M.hero.x, y: M.hero.y, z: M.hero.z } : at;
  for (const g of M.guards) if (g.alive && g.mind) { g.asleep = false; g.status.sleep = 0; g.mind.hear(1, last); g.mind.level = Math.max(g.mind.level, .7); g.mind.last = Object.assign({}, last); }
  B.noise(at.x, at.y, at.z || 0, 400, 'bell');
  M.timers.push({ t: T('reinforceDelay'), fn: () => B.Enemies.reinforce(M) });
  B.emit('bell', { by });
};
/** the runner dies before the ring: the bell stays silent */
B.on('kill', e => { const M = B.M; if (M && M.alarm && M.alarm.runner === e.victim) { M.alarm.runner = null; B.Hud.toast('The bell stays silent.', ''); } });
B.Brain = Brain; B.Alarm = Alarm;
