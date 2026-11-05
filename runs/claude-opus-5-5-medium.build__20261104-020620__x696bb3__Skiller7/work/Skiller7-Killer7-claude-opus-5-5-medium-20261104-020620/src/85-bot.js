/* SKILLER7 — the bot: it writes the same intents a player's devices do. It walks routes (BFS over the rail graph),
 * fights (scan when nothing shows; turn at human rates after a reaction time; fire on the warm spot), heals, rescues,
 * turns pages. The scripted playthrough and attract mode use it (attract lets it cheat). */
const BOT = { route: null, i: 0, t: 0, stepT: 0, on: false, log: [], target: null, reactT: 0, cheat: false, choice: null, failed: null, done: false, lastNode: null, interactT: 0, phase: 0, metrics: {} };
S7.BOT = BOT;
const rnode = n => W.rails.nodes[n];
/** a path of edges from the walker's node (or edge end) to a node, over edges usable now */
function botPath(to) {
  const wk = G.walker; let start = wk.node;
  if (!start) { const e = curEdge(); if (!e) return null; start = wk.dir > 0 ? e.b : e.a; }
  if (start === to) return [];
  const prev = { [start]: null }, q = [start];
  for (let i = 0; i < q.length; i++) {
    const n = q[i];
    for (const e of W.rails.adj[n]) {
      if (!edgeOpen(e, n)) continue;
      if (e.gate && !gateOpen(e.gate)) { const g = gateDef(e.gate); if (!g) continue; if (g.kind === 'patrol' && G.persona !== 'ansel') continue; if (g.kind === 'flag' && !flag(g.flag)) continue; if (g.kind === 'key' && !G.items[g.item]) continue; if (['buyout', 'icelock', 'delegate', 'echowall', 'crystal', 'cornice', 'serac'].includes(g.kind)) continue; }
      if (e.kind === 'jump' && G.persona !== 'dagny') continue;
      const m = e.a === n ? e.b : e.a; if (m in prev) continue; prev[m] = [n, e]; q.push(m);
    }
  }
  if (!(to in prev)) return null;
  const path = []; for (let n = to; prev[n]; n = prev[n][0]) path.unshift(prev[n][1]);
  return path;
}
S7.botPath = botPath;
const statueNode = st => { let best = null, bd = 1e9; for (const id in W.rails.nodes) { const n = rnode(id), d = Math.hypot(n.x - st.at[0], n.y - st.at[1]); if (d < bd) { bd = d; best = id; } } return best; };

/** the bot's choice of target: a boss's open window, anything close, a shot at us, the nearest revealed */
function botTarget() {
  const eye = S7.eye(), H = heroPos(), cands = [];
  for (const b of S7.bossTargets()) {
    if (V.dist(b.pos, eye) > 70 * M || !W.grid.los(eye, b.pos)) continue;
    if (b.kind === 'warm' && b.window) cands.push({ p: b.pos, pri: 1, r: b.r, boss: true });
    else if (b.kind === 'body' && b.window && G.boss && G.boss.id === 'band') cands.push({ p: b.pos, pri: 4, r: b.r });
  }
  for (const e of G.enemies) {
    if (!e.alive || e.ambient) continue;
    const d = Math.hypot(e.x - H.x, e.y - H.y);
    if (!(e.vis > .5) && !BOT.cheat) continue;
    if (d > 60 * M) continue;
    if (!W.grid.los(eye, [e.x, e.y, e.z + 20])) continue;
    let p;
    if (e.spots) { const s = bloomSpots(e).find(x => e.spots[x.i]); p = s ? s.pos : [e.x, e.y, e.z + 20]; }
    else if (e.ai === 'plow' && !(e.back > 0)) p = [e.x, e.y, e.z + 18 * e.size];
    else p = warmPos(e);
    cands.push({ p, pri: d < 9 * M ? 0 : 3, d, r: warmR() * .7, e });
  }
  for (const pr of G.proj) if (pr.team === 'enemy' && V.dist(pr.p, eye) < 16 * M) cands.push({ p: pr.p, pri: 2, r: 5, proj: true });
  cands.sort((a, b) => a.pri - b.pri || (a.d || 0) - (b.d || 0));
  return cands[0] || null;
}
/** turn the aim toward a point at human rates; returns the angular error (radians) */
function botAimAt(I, p, dt) {
  const eye = S7.eye(), v = V.sub(p, eye), yaw = Math.atan2(v[1], v[0]), pit = Math.atan2(v[2], Math.hypot(v[0], v[1]));
  const a = G.aim, rate = (BOT.cheat ? 900 : 160) * dt, dy = angDiff(a.yaw, yaw) / DEG, dp = (pit - a.pitch) / DEG;
  I.lookYaw = clamp(dy, -rate, rate); I.lookPitch = clamp(dp, -rate * .7, rate * .7);
  if (BOT.cheat) { a.yaw = yaw; a.pitch = pit; I.lookYaw = I.lookPitch = 0; }
  return Math.hypot(angDiff(a.yaw + I.lookYaw * DEG, yaw), pit - a.pitch - I.lookPitch * DEG);
}
const aimPoint = p => { const eye = S7.eye(), v = V.sub(p, eye); return [Math.atan2(v[1], v[0]), Math.atan2(v[2], Math.hypot(v[0], v[1]))]; };

/** the fighting part: true while it is busy fighting (the route waits) */
function botFight(I, dt) {
  const t = botTarget(), threats = aliveEnemies().filter(e => Math.hypot(e.x - heroPos().x, e.y - heroPos().y) < 30 * M).length;
  const eye0 = S7.eye(), bossOn = !!(G.boss && !G.boss.done && G.boss.phase !== 3) && S7.bossTargets().some(b => V.dist(b.pos, eye0) < 60 * M && W.grid.los(eye0, b.pos));
  if (!t && !threats && !bossOn) { BOT.target = null; return false; }
  const e = curEdge();
  if (e && e.kind === 'ski' && !G.walker.skiStop && !(G.boss && G.boss.aimOnTheMove)) { if (threats && !G.aval) I.turn = true; else return false; }
  if (G.aval) return false;
  I.aim = true;
  if (!G.aim.on || G.aim.k < .9) return true;
  const w = wstate(G.persona), W0 = S7.WEAPONS[S7.PERSONAS[G.persona].weapon];
  if (!t) { if (G.scanCd <= 0) I.scan = true; BOT.target = null; return true; }
  if (BOT.target !== t.p && (!BOT.target || V.dist(BOT.target, t.p) > 40)) { BOT.reactT = BOT.cheat ? 0 : .25; }
  BOT.target = t.p; BOT.reactT -= dt;
  if (BOT.reactT > 0) return true;
  const err = botAimAt(I, t.p, dt), dist = V.dist(t.p, S7.eye()), tol = Math.max(.4 * DEG, Math.atan(t.r / Math.max(1, dist)) * (W0.kind === 'pellets' || W0.kind === 'cone' ? 3 : 1));
  if (w.mag <= 0 && !W0.heat && w.reloadT <= 0) { I.reload = true; return true; }
  if (err < tol || W0.kind === 'cone' && err < 10 * DEG && dist < W0.range * M) { I.fire = true; I.firePressed = true; }
  if (G.persona === 'rurik' && threats >= 3 && G.red > 30 && !(G.cd.makeitrain > 0)) I.skill = true;
  return true;
}

/** one route step's intents; returns true when the step is done */
function botStep(s, I, dt) {
  const wk = G.walker;
  if (s.area) return G.area === s.area;
  if (s.wait !== undefined) { BOT.stepT += 0; return BOT.t - BOT.stepStart >= s.wait; }
  if (s.until) return s.until(G);
  if (s.flag) return flag(s.flag);
  if (s.goto) {
    const [ar, n] = s.goto.includes(':') ? s.goto.split(':') : [G.area, s.goto];
    if (G.area !== ar || BOT.stepArea && G.area !== BOT.stepArea) return true;
    if (wk.node === n || wk.passed === n && G.time - wk.passedAt < .05) return true;
    const path = botPath(n); if (!path) { BOT.noPath = n; return false; }
    if (!path.length) { I.move = true; if (G.persona === 'dagny' && (s.tuck || G.aval)) I.skillDown = true; return false; }
    if (wk.node) { const B2 = branchesAt(wk.node), i = B2.indexOf(path[0]); if (B2.length === 1 && wk.arrived === path[0].id && rnode(wk.node).kind !== 'start') { I.turn = BOT.t % .3 < .02; return false; } if (i >= 0) { I.branch = i; I.move = true; if (wk.branch !== i) I.move = BOT.t % .2 < .1 ? true : I.move; } }
    else {
      const e = curEdge(), toward = wk.dir > 0 ? e.b : e.a;
      if (path.length && e.kind !== 'ski' && e.kind !== 'lift' && e.kind !== 'jump') { const goingRight = path[0] && (path[0].a === toward || path[0].b === toward); void goingRight; }
      if (e.kind === 'ski' && wk.fork) { const out = branchesAt(wk.fork.node).filter(x => x.id !== e.id && x.a === wk.fork.node), nx = path.find(x => out.includes(x)); if (nx) I.branch = out.indexOf(nx); }
      if (!(e.kind === 'walk' || e.kind === 'stairs') || true) I.move = true;
      // walking the wrong way along an edge (after a turn): turn round
      if ((e.kind === 'walk' || e.kind === 'stairs') && !e.oneWay) { const ahead = toward; const p2 = botPath(n); if (p2 && p2.length && ahead !== n && p2[0] && !(p2[0].a === ahead || p2[0].b === ahead) && p2[0].id !== e.id) { /* fine */ } if (ahead !== n && p2 && p2[0] && p2[0].id === e.id) I.turn = true; }
    }
    if (G.persona === 'dagny' && (s.tuck || G.aval)) I.skillDown = true;
    return false;
  }
  if (s.interact) {
    if (s.done && s.done(G)) return true;
    const sp = W.spots.find(x => x.id === s.interact); if (!sp) { BOT.failed = 'no spot ' + s.interact; return false; }
    if (sp.node && wk.node !== sp.node) return botStep({ goto: sp.node }, I, dt) && false;
    if (s.done && s.done(G)) return true;
    if (TALK.open || G.mode !== 'play') return false;
    if (BOT.interactT <= 0) { I.interact = true; BOT.interactT = .6; BOT.pressed = (BOT.pressed || 0) + 1; }
    BOT.interactT -= dt;
    if (!s.done) return BOT.pressed >= (s.times || 1) && !TALK.open;
    return false;
  }
  if (s.choose !== undefined) { BOT.choice = s.choose; return true; }
  if (s.switch) {
    if (G.persona === s.switch) return true;
    if (G.mode === 'play' && !G.aim.on) I.pick = ORDER.indexOf(s.switch) + 1;
    return false;
  }
  if (s.wardrobe) { S7.wardrobePick(s.wardrobe); return true; }
  if (s.wax) { for (const [id, stat] of s.wax) S7.wax(id, stat); return true; }
  if (s.code) { if (S7.codeOpen) S7.codeOpen(s.code.spot, s.code.code); return true; }
  if (s.shoot) {   // a far target: scope in (Ignaz), line it up, fire
    const tg = (W.targets || []).find(t => t.id === s.shoot); if (!tg) { BOT.failed = 'no target ' + s.shoot; return false; }
    if (flag('hit:' + key(tg.id))) { I.aim = false; return true; }
    if (tg.when && !flag(tg.when)) return false;
    I.aim = true; if (!G.aim.on || G.aim.k < .9) return false;
    if (G.persona === 'ignaz' && !G.aim.scope && !(G.cd.longlook > 0)) I.skill = true;
    const err = botAimAt(I, tg.pos, dt);
    if (err < .25 * DEG && G.aim.scope && wstate(G.persona).cool <= 0 && BOT.t - (BOT.lastShot || 0) > .8) { I.fire = I.firePressed = true; BOT.lastShot = BOT.t; }
    if (wstate(G.persona).mag <= 0) I.reload = true;
    return false;
  }
  if (s.flash || s.charge || s.echo) {
    const id = s.flash || s.charge || s.echo;
    if (s.echo) { if (gateOpen(id)) return true; if (!G.aim.on && BOT.t - (BOT.lastSkill || -9) > 1.2) { I.skill = true; BOT.lastSkill = BOT.t; } return false; }
    let p;
    if (s.flash) { const sp = W.spots.find(x => x.id === id); if (spotDone(sp)) { I.aim = false; return true; } p = sp.pos; }
    else { if (gateOpen(id)) { I.aim = false; return true; } const g = gateDef(id); p = [g.at[0] * M, g.at[1] * M, W.grid.floor(g.at[0] * M, g.at[1] * M) + 4]; }
    I.aim = true; if (!G.aim.on || G.aim.k < .9) return false;
    const err = botAimAt(I, s.charge ? lobAim(p) : p, dt);
    if (err < .6 * DEG && BOT.t - (BOT.lastSkill || -9) > 1.5) { I.skill = true; BOT.lastSkill = BOT.t; }
    return false;
  }
  if (s.skill) { if (BOT.t - (BOT.lastSkill || -9) > 1) { I.skill = true; BOT.lastSkill = BOT.t; return true; } return false; }
  if (s.clear) return !nearEnemies(45).length && !(G.pending && G.pending.length);
  if (s.boss) return !!flag(s.boss);
  if (s.hold) { I[s.hold] = true; return s.untilFn ? s.untilFn(G) : false; }
  if (s.fn) { s.fn(G, I); return true; }
  BOT.failed = 'unknown step ' + JSON.stringify(s); return false;
}
/** where to aim a lob (Control Charge: 620 u/s, gravity 300) so it lands on p: the low arc */
function lobAim(p) {
  const eye = S7.eye(), dx = p[0] - eye[0], dy = p[1] - eye[1], d = Math.hypot(dx, dy), h = p[2] - eye[2], v = 620, g = 300;
  const disc = v ** 4 - g * (g * d * d + 2 * h * v * v); const th = disc >= 0 ? Math.atan((v * v - Math.sqrt(disc)) / (g * d)) : Math.PI / 4;
  const k = d * Math.tan(th) - (30 * d / v);   // (the shell starts with a little lift)
  return [p[0], p[1], eye[2] + k];
}

/** the bot's intents for this step */
function botIntent(dt) {
  const I = blankIntent(); BOT.t += dt;
  if (!G) return I;
  if (G.mode === 'talk') { if (BOT.t % .3 < dt * 1.5) { I.confirm = true; if (TALK.choices) I.pickChoice = BOT.choice ?? 0; } return I; }
  if (G.mode === 'card') { if (G.card && G.card.t0 - G.card.t > .9) I.confirm = true; return I; }
  if (G.mode === 'results') { if (!BOT.resT) BOT.resT = BOT.t; if (BOT.t - BOT.resT > 1.2) { S7.closeResults(); BOT.resT = 0; } return I; }
  if (G.mode === 'gameover') { BOT.failed = BOT.failed || 'game over in ' + G.area; return I; }
  if (G.mode !== 'play' || G.cut) return I;
  // heal when low and safe
  const r = G.roster[G.persona];
  if (BOT.stepIdx === BOT.i && BOT.t - BOT.stepStart > 600) BOT.failed = BOT.failed || 'no progress at step ' + BOT.i + ' in ' + G.area + ' (persona ' + G.persona + ', statues ' + statuesHere().length + ')';
  if (r.hp < r.max * .75 && G.red > 20 && !nearEnemies(20).length && !G.proj.length && !(G.boss && S7.bossTargets().some(b => V.dist(b.pos, S7.eye()) < 40 * M)) && !G.aim.on && !(curEdge() && curEdge().kind !== "walk" && curEdge().kind !== "stairs" && !G.walker.node)) { I.heal = true; return I; }
  if (r.hp < r.max * .5 && G.red > 10 && !G.aim.on) I.heal = true;
  if (r.hp < r.max * .45 && G.red > 15 && !(G.boss && G.boss.id === 'grau' && G.boss.hat > 0) && !G.proj.some(p => p.team === 'enemy' && V.dist(p.p, S7.eye()) < 12 * M) && !aliveEnemies().some(e => Math.hypot(e.x - heroPos().x, e.y - heroPos().y) < 9 * M)) { I.heal = true; return I; }
  // rescue a frozen statue first (the Sweep)
  const sts = statuesHere();
  if (sts.length && G.persona === 'ansel') {
    if (nearEnemies(12).length && botFight(I, dt)) return I;
    const st = sts[0], n = statueNode(st.st);
    if (G.nearStatue) { I.interactHeld = true; return I; }
    if (G.walker.node !== n) { botStep({ goto: n }, I, dt); return I; }
    I.interactHeld = true; return I;
  }
  // the interview: wait, then fire (the "shot" ending), or not
  if (G.boss && G.boss.id === 'hansi' && G.boss.phase === 3) { if (G.boss.t3 > 12 && BOT.shootInterview !== false) { I.fire = I.firePressed = true; } return I; }
  if (botFight(I, dt)) { BOT.fightT = (BOT.fightT || 0) + dt; if (BOT.stepIdx === BOT.i && BOT.t - BOT.stepStart > 300) BOT.failed = BOT.failed || 'fighting too long at step ' + BOT.i + ' in ' + G.area + ': ' + aliveEnemies().map(e => e.type + '@' + Math.round(e.x / M) + ',' + Math.round(e.y / M)).join(' '); return I; }
  if (!BOT.route || BOT.i >= BOT.route.length) { BOT.done = true; return I; }
  const s = BOT.route[BOT.i];
  if (BOT.stepIdx !== BOT.i) { BOT.stepIdx = BOT.i; BOT.stepStart = BOT.t; BOT.pressed = 0; BOT.interactT = 0; BOT.stepArea = G.area; }
  if (botStep(s, I, dt)) { BOT.log.push({ i: BOT.i, t: Math.round(G.time), area: G.area, step: JSON.stringify(s).slice(0, 60) }); BOT.i++; if (s.choose === undefined) BOT.choice = null; }
  else if (BOT.t - BOT.stepStart > (s.timeout || 240)) BOT.failed = BOT.failed || 'stuck at step ' + BOT.i + ' ' + JSON.stringify(s).slice(0, 80) + ' in ' + G.area + ' node ' + G.walker.node + ' edge ' + G.walker.edge + (BOT.noPath ? ' (no path to ' + BOT.noPath + ')' : '');
  return I;
}
S7.bot = {
  run(route, o = {}) { Object.assign(BOT, { route, i: 0, t: 0, on: true, log: [], cheat: !!o.cheat, failed: null, done: false, stepIdx: -1, choice: null }); },
  stop() { BOT.on = false; BOT.route = null; },
  status: () => ({ on: BOT.on, i: BOT.i, n: BOT.route ? BOT.route.length : 0, failed: BOT.failed, done: BOT.done, log: BOT.log }),
  intent: botIntent
};
