/* 50-versus: THE GAME (§9). The Corner (lieutenant, runner) against the Detail (detectives who look like everyone
   else). Detail wins at 100 evidence; the Corner wins at the bell with the quota made. One VersusSim runs local play,
   bots-only attract and the AI Hub's host; the network only moves inputs in and snapshots out (51-net). */
const VZ = [10, 15, 55, 45];
const VANTAGE = [[42, 30.6], [36, 26.6], [35, 30.6], [27, 26.6], [20, 26.6], [33.4, 37.5], [29, 21], [40, 36], [22.5, 30.6], [25, 44.5], [30, 15.6], [34, 21]];
const V_PTS = { face: 4, act: 13, stash: 25, stash2: 15, tap: 10, jumpHit: 20, jumpMiss: -10 };   // tuned by the plan's 20-round bot test
const inZone = (x, y) => x > VZ[0] * T && x < VZ[2] * T && y > VZ[1] * T && y < VZ[3] * T;
function clampZone(a) { a.body.x = clamp(a.body.x, VZ[0] * T + 6, VZ[2] * T - 6); a.body.y = clamp(a.body.y, VZ[1] * T + 6, VZ[3] * T - 6); }
class VPlayer {
  constructor(o) { Object.assign(this, { id: o.id, name: o.name || ('P' + (o.id + 1)), color: o.color || E.PLAYER_COLORS[o.id % 4], side: o.side, role: o.role, human: !!o.human, local: !!o.local, remote: !!o.remote, ctl: o.ctl || new BotCtl(), stats: { photos: 0, burns: 0, callouts: 0, count: 0, acts: 0, taps: 0, seized: 0, score: 0 }, w: { on: false, aim: null, target: null, focus: 0, off: [0, 0] }, cd: 0, jumpUsed: false, burnedT: 0, busy: 0 }); this.facePts = {}; this.actPts = {}; }
}
class VersusSim {
  constructor(o) {
    this.o = o; this.minutes = o.minutes || 5; this.len = o.len || this.minutes * 60; this.quota = Math.round(160 * this.len / 60); this.t = 0; this.ev = 0; this.over = null; this.events = [];
    reseed(o.seed || 7); World.cur = World.map; Flow.reset(World.map); Crowd.reset(o.crowd === undefined ? 14 : o.crowd, VZ, (o.seed || 7) + 3);
    this.players = o.slots.map(s => new VPlayer(s));
    const ltH = this.players.some(p => p.role === 'lt' && p.human), rnH = this.players.some(p => p.role === 'runner' && p.human);
    this.corner = new CornerSim({ rate: .3, versus: true, vials: 60, reupAt: 20, autoReup: false, ltHuman: false, runnerHuman: rnH, patrols: false });
    this.tapped = {}; this.stashPhoto = {}; this.drop = null; this.avoidT = 0;
    for (const p of this.players) {
      if (p.role === 'lt') { p.agent = this.corner.lt; p.agent.ltHuman = p.human; }
      else if (p.role === 'runner') p.agent = this.corner.runner;
      else { const sp = VANTAGE[(p.id * 5 + 3) % VANTAGE.length]; p.agent = new Agent({ seed: 9000 + p.id * 131 + (o.seed || 0), x: sp[0] * T, y: sp[1] * T, walk: 44, role: 'det' }); p.agent.isCop = true; p.agent.vp = p; p.agent.id = 'det' + p.id; }
      p.agent.vp = p; p.agent.playerId = p.id;
      if (!p.human) p.brain = p.side === 'detail' ? detBot : p.role === 'lt' ? ltBot : runBot;
    }
    this.dets = this.players.filter(p => p.side === 'detail').map(p => p.agent);
    Perception.setup(this.corner.crew.filter(a => a.watcher || a.role === 'lieutenant' || a.role === 'muscle'), this.dets);
    this.offs = [bus.on('made', e => { const p = e.p && e.p.vp; if (p && p.side === 'detail' && this.players.includes(p)) this.burn(p, null, 'made'); }), bus.on('sale', e => { const by = e.by && e.by.vp; if (by) by.stats.count += e.n * 10; })];
  }
  dispose() { for (const f of this.offs) f(); }
  get count() { return this.corner.L.taken; }
  emit(k, d = {}) { const e = Object.assign({ t: 'e', k }, d); this.events.push(e); if (this.onEvent) this.onEvent(e); if (!Globals.attract) VFX(e, this); }
  tick(dt) {
    if (this.over || this.netWait) return; this.t += dt; if (this.avoidT > 0) this.avoidT -= dt;
    for (const p of this.players) {
      const a = p.agent; if (p.cd > 0) p.cd -= dt; if (p.burnedT > 0) { p.burnedT -= dt; a.burnedUntil = game.time + p.burnedT; }
      if (p.busy > 0) { p.busy -= dt; a.vx = a.vy = 0; if (p.busy <= 0 && p.onDone) { const f = p.onDone; p.onDone = null; f(); } continue; }
      if (p.brain) p.brain(this, p, dt);
      if (p.remote && p.net) { this.applyRemote(p, dt); } else if (p.human || p.brain) this.drive(p, dt);
    }
    this.corner.rate = this.avoidT > 0 ? .05 : .3;
    this.corner.tick(dt, this.dets);
    for (const a of this.corner.crew) if (a.role !== 'lookout' || !a.roof) clampZone(a);
    for (const d of this.dets) d.update(dt);
    Crowd.tick(dt); Perception.tick(dt);
    for (const d of this.dets) clampZone(d);
    if (this.drop && this.drop.t > 0) { this.drop.t -= dt; if (this.drop.t <= 0) { this.drop.ready = true; this.emit('drop', { x: this.drop.x, y: this.drop.y }); } }
    if (this.drop && this.drop.ready && !this.players.some(p => p.role === 'runner' && p.human)) { const r = this.corner.runner; if (r && !r.job && !r.goal) r.goTo(this.drop.x, this.drop.y, 70, () => this.fetchDrop(r)); }
    if (this.ev >= 100) this.end('detail');
    else if (this.t >= this.len) this.end(this.count >= this.quota ? 'corner' : 'draw');
  }
  /** a local or bot player's movement and actions from its controller */
  drive(p, dt) {
    const a = p.agent, c = p.ctl, mv = c.move(), mag = Math.min(1, Math.hypot(mv[0], mv[1]));
    const v = p.view || game.view; let gx = 0, gy = 0;
    if (mag > .05) { const g = v.screenDirToGround ? v.screenDirToGround(mv[0], mv[1]) : mv, l = Math.hypot(g[0], g[1]) || 1; gx = g[0] / l; gy = g[1] / l; a.goal = null; }
    const watching = c.watching(), sp = watching ? 20 : c.running() ? 85 : 52;
    if (p.human ? (!a.goal || mag > .05) : mag > .05) { a.vx = gx * sp * Math.min(1, mag / .62); a.vy = gy * sp * Math.min(1, mag / .62); }
    a.blending = c.down('blend') && p.side === 'detail'; if (a.blending) { a.vx *= .3; a.vy *= .3; }
    a.watching = watching; a.sprinting = sp > 80 && mag > .2; a.still = Math.hypot(a.vx, a.vy) < 5 ? (a.still || 0) + dt : 0;
    a.pose = watching ? 'camera' : a.blending ? 'phone' : null;
    if (p.role === 'lt' || p.side === 'detail') {   // aim: a point on the ground (the mouse, or the right stick from the player)
      const w = p.w; w.on = watching;
      if (watching) {
        const stick = c.aimStick && c.aimStick(); let aim = null;
        if (p.local && game.input.lastDevice !== 'gamepad' && !p.split) { const g = game.mouseGround && game.mouseGround(); if (g) aim = { x: g[0], y: g[1] }; }
        if (!aim) { if (stick) { const g = v.screenDirToGround(stick[0], stick[1]); w.off = [clamp(w.off[0] + g[0] * 160 * dt, -160, 160), clamp(w.off[1] + g[1] * 160 * dt, -160, 160)]; } else if (!w.off[0] && !w.off[1]) w.off = [Math.cos(a.facing) * 60, Math.sin(a.facing) * 60]; aim = { x: a.x + w.off[0], y: a.y + w.off[1] }; }
        if (c.botAimAt) aim = c.botAimAt;
        w.aim = aim; a.faceGoal = Math.atan2(aim.y - a.y, aim.x - a.x); a.aimAt = aim;
        const cand = this.candidates(p).filter(b => b !== a).sort((b1, b2) => dist2(b1, aim) - dist2(b2, aim))[0];
        const tg = cand && dist2(cand, aim) < 16 ? cand : null; if (tg !== w.target) { w.target = tg; w.focus = 0; } else if (tg) w.focus = Math.min(1, w.focus + dt / .4);
      } else { w.target = null; w.focus = 0; w.off = [0, 0]; a.faceGoal = null; a.aimAt = null; }
    }
    // actions (in a session, a client's go to the host: route() sends them)
    const R = (k, tgt, x) => this.route && this.route(p, k, tgt, x);
    if (p.side === 'detail') {
      if (watching && c.pressed('photo')) { if (R('photo', p.w.target, { q: p.w.focus >= 1 ? 1 : 0 })) Snd.shutter(); else this.photo(p, p.w.target); }
      if (watching && c.pressed('partner') && !p.jumpUsed && p.w.target) { if (R('jump', p.w.target)) p.jumpUsed = true; else this.jump(p, p.w.target); }
      if (!watching && c.pressed('interact')) { const ph = this.phoneNear(a); if (ph && !this.tapped[ph] && !R('tap')) this.tap(p, ph); }
    } else if (p.role === 'lt') {
      if (watching && c.pressed('partner') && p.w.target && p.cd <= 0) { if (R('callout', p.w.target)) p.cd = 15; else this.callout(p, p.w.target); }
      if (c.pressed('blend')) { const k = this.corner.open ? 'shut' : 'open'; if (!R(k)) { if (k === 'shut') { this.corner.manual = true; this.corner.shut('lt', 9999, a); this.emit('shut', {}); } else { this.corner.manual = false; this.corner.reopen(); this.emit('open', {}); } } }
      if (!watching && c.pressed('interact')) { if (dist2(a, this.corner.stash) < 30) { if (!R('stash')) this.moveStash(p); } else { const ph = this.phoneNear(a); if (ph && !R('reup')) this.reup(p, ph); } }
    } else if (p.role === 'runner') {
      if (c.pressed('interact')) { if (a.carrying) { if (!R('handoff') && this.corner.humanHandoff(a)) this.emit('sale', { by: p.id }); } else if (!R('pickup')) { if (this.drop && this.drop.ready && dist2(a, this.drop) < 24) this.fetchDrop(a); else if (this.corner.humanPickup(a)) this.emit('pickup', {}); } }
      if (c.pressed('crouch') && a.carrying && !R('ditch')) { const n = a.carrying; a.carrying = 0; this.corner.L.carried -= n; this.corner.L.seized += n; this.emit('ditch', { n }); }
    }
  }
  /** a remote player: the host trusts their position inside a speed check */
  applyRemote(p, dt) {
    const a = p.agent, n = p.net; if (!n) return;
    const max = (n.st === 2 ? 90 : 60) * Math.max(dt, (n.dt || .1)) * 1.5 + 2, dx = n.x - a.x, dy = n.y - a.y, d = Math.hypot(dx, dy);
    const k = d > max ? max / d : 1; a.body.x += dx * k; a.body.y += dy * k; a.vx = a.vy = 0; a.facing = (n.f / 64) * TAU; a.watching = !!n.w; a.aimAt = n.w ? { x: n.ax, y: n.ay } : null; a.pose = n.w ? 'camera' : n.st === 3 ? 'crouch' : null;
    const c = World.map.toCell(a.x, a.y); if (!World.map.walkable(c[0], c[1])) { const w = World.walkableNear(a.x, a.y); a.body.x = w.x; a.body.y = w.y; }
    p.w.on = !!n.w; p.w.aim = a.aimAt;
  }
  candidates(p) { return this.corner.all().concat(Crowd.list, this.dets); }
  phoneNear(a) { for (const k of ['P1', 'P2', 'P3']) { const pp = World.props.find(q => q.tag === k); if (pp && Math.hypot(pp.x - a.x, pp.y - a.y) < 26) return k; } return null; }
  score(p, a) { const P = p.agent; return Cam.score.call({ range: 240, focus: p.w.focus }, P, a); }
  photo(p, a) {
    p.stats.photos++; this.emit('shutter', { id: p.id });
    if (!a || p.burnedT > 0) { this.emit('blurry', { id: p.id, burned: p.burnedT > 0 }); return; }
    const s = this.score(p, a); if (s.blurry) { this.emit('blurry', { id: p.id }); return; }
    const who = a.crewId || null; let pts = 0, why = '';
    if (who && s.face && !p.facePts[who] && !this.facesDone(who)) { pts += V_PTS.face; p.facePts[who] = 1; this.faceSeen = (this.faceSeen || new Set()).add(who); why = 'Face: ' + nameOf(who === 'tout' || who === 'third' ? 'tout' : who); }
    if (who && s.act) { this.actPts = this.actPts || {}; this.actPts[who] = this.actPts[who] || 0; if (this.actPts[who] < 2) { this.actPts[who]++; pts += V_PTS.act; p.stats.acts++; why = 'ACT: ' + ACT_NAMES[s.act]; }
      if (s.act === 'stash-access' && !this.stashPhoto[this.corner.stashSpot] && Object.keys(this.stashPhoto).length < 2) { const first = !Object.keys(this.stashPhoto).length; this.stashPhoto[this.corner.stashSpot] = true; pts += first ? V_PTS.stash : V_PTS.stash2; why = 'The stash!'; this.emit('stashSeen', {}); } }
    if (pts) { this.ev += pts; p.stats.score += pts; this.emit('photo', { id: p.id, pts, why }); } else this.emit('photo0', { id: p.id });
  }
  facesDone(who) { return this.faceSeen && this.faceSeen.has(who); }
  tap(p, ph) { p.busy = 4; p.agent.pose = 'reach'; p.onDone = () => { const seen = this.corner.crew.some(o => !o.hidden && E.sees(o, p.agent, { map: World.map, range: o.range, fov: o.fov, facing: o.facing }).seen); if (seen) { this.emit('tapFail', { id: p.id }); return; } this.tapped[ph] = p.id; p.stats.taps++; this.emit('tap', { id: p.id, phone: ph }); }; }
  jump(p, a) {
    p.jumpUsed = true; this.emit('jumpCalled', { id: p.id });
    game.after(8, () => { if (this.over) return; const carrying = a.carrying || (a.role === 'money' && this.corner.L.onMoney > 0);
      if (carrying) { const got = this.corner.seize(a); this.ev += V_PTS.jumpHit; p.stats.score += V_PTS.jumpHit; p.stats.seized++; this.emit('seize', { id: p.id, v: got.vials, c: got.cash }); } else { this.ev = Math.max(0, this.ev + V_PTS.jumpMiss); p.stats.score += V_PTS.jumpMiss; this.emit('jumpMiss', { id: p.id }); } });
  }
  callout(p, a) {
    p.cd = 15; const det = a.isCop && a.vp;
    if (det) { this.burn(det, p, 'callout'); p.stats.callouts++; p.stats.score += 20; }
    else { this.penalty = (this.penalty || 0) + 200; this.avoidT = 10; this.emit('wrongCallout', { id: p.id }); }
  }
  burn(det, by, why) { if (det.burnedT > 0) return; det.burnedT = 25; det.stats.burns++; this.emit('burn', { id: det.id, by: by && by.id, why }); }
  moveStash(p) { const ks = Object.keys(CORNER.stash), i = ks.indexOf(this.corner.stashSpot), k = ks[(i + 1) % ks.length]; this.corner.moveStash(k); this.emit('stash', { k }); }
  reup(p, ph) { if (this.corner.vials >= 20 || this.drop) { this.emit('noReup', {}); return; } p.busy = 2; p.agent.pose = 'phone'; p.agent.doAct('payphone', 2); p.onDone = () => { p.agent.pose = null; this.drop = { x: 19 * T, y: 44.1 * T, t: 20 }; if (this.tapped[ph] !== undefined) { this.ev += V_PTS.tap; const tp = this.players.find(q => q.id === this.tapped[ph]); if (tp) tp.stats.score += V_PTS.tap; this.emit('tapHit', { phone: ph }); } this.emit('reup', { phone: ph }); }; }
  fetchDrop(a) { if (!this.drop || !this.drop.ready) return; this.drop = null; this.corner.reupArrive(60); this.emit('package', {}); }
  get netCount() { return this.count - (this.penalty || 0); }
  end(outcome) {
    if (this.over) return; if (outcome === 'corner' && this.netCount < this.quota) outcome = 'draw';
    this.over = outcome; for (const p of this.players) if (p.side === 'corner') p.stats.score = Math.round(this.netCount / 10 + p.stats.callouts * 20);
    this.emit('over', { outcome });
  }
  awards() {
    const A = [], pl = this.players; const best = (f, min = 1) => { let b = null; for (const p of pl) if (f(p) >= min && (!b || f(p) > f(b))) b = p; return b; };
    const eyes = best(p => p.stats.acts); if (eyes) A.push({ id: eyes.id, title: 'Eyes On', detail: eyes.stats.acts + ' hand-to-hand photo' + (eyes.stats.acts > 1 ? 's' : '') });
    const made = pl.find(p => p.stats.callouts > 0); if (made) A.push({ id: made.id, title: 'Made You', detail: 'First correct call-out' });
    for (const p of pl) if (p.side === 'corner' && !p.stats.seized && !this.events.some(e => e.k === 'seize')) { A.push({ id: p.id, title: 'Clean Hands', detail: 'Never seized' }); break; }
    const paper = best(p => p.stats.taps); if (paper) A.push({ id: paper.id, title: 'Paper Trail', detail: paper.stats.taps + ' phone' + (paper.stats.taps > 1 ? 's' : '') + ' tapped' });
    return A;
  }
}
/* ---- bots: they fill seats, they cheat a little on perception ---- */
function detBot(S, p, dt) {
  const a = p.agent, c = p.ctl; c.tick(); p.bt = (p.bt || 0) - dt;
  const heat = Perception.heat(a);
  if (!p.spot || heat > .5 || p.bt < -25) { const v = VANTAGE[Math.floor(RNG.bots() * VANTAGE.length)]; p.spot = { x: v[0] * T, y: v[1] * T }; p.bt = 0; c.watch = false; }
  if (dist2(a, p.spot) > 12) { const d = Flow.dir(a, p.spot.x, p.spot.y); c.mv = [0, 0]; a.vx = d[0] * 50; a.vy = d[1] * 50; a.goal = null; c.watch = false; c.botAimAt = null; return; }
  c.mv = [0, 0]; a.vx = a.vy = 0;
  if (!p.jumpUsed && S.corner.runner && S.corner.runner.carrying && dist2(a, S.corner.runner) < 180 && RNG.bots() < dt * .2) { c.watch = true; c.botAimAt = S.corner.runner; p.w.target = S.corner.runner; S.jump(p, S.corner.runner); return; }
  const actor = S.corner.all().filter(x => x.act && ACTS.includes(x.act.kind) && dist2(x, a) < 220).sort((x, y) => dist2(x, a) - dist2(y, a))[0] || S.corner.crew.filter(x => x.crewId && !(p.facePts[x.crewId]) && dist2(x, a) < 200)[0];
  if (actor) { c.watch = true; c.botAimAt = actor; if (p.w.target === actor && p.w.focus >= 1 && RNG.bots() < dt * .9) c.tap('photo'); }
  else { c.watch = false; c.botAimAt = null; if (!S.corner.crew.some(o => dist2(o, a) < 120)) { const ph = S.phoneNear(a); if (ph && !S.tapped[ph]) c.tap('interact'); } }
}
function ltBot(S, p, dt) {
  const a = p.agent, c = p.ctl; c.tick(); c.mv = [0, 0]; c.watch = false;
  const worst = S.dets.map(d => ({ d, lv: Math.max(...S.corner.crew.map(o => o.minds[d.id] ? o.minds[d.id].level : 0), 0) + (d.watching ? .25 : 0) })).sort((x, y) => y.lv - x.lv)[0];
  if (worst && worst.lv > .8 && p.cd <= 0 && worst.d.vp.burnedT <= 0) { c.watch = true; c.botAimAt = worst.d; p.w.target = worst.d; p.w.focus = 1; S.callout(p, worst.d); }
  p.shutCd = (p.shutCd || 0) - dt;
  if (worst && worst.lv > .75 && S.corner.open && p.shutCd <= 0 && RNG.bots() < dt * 2) { p.shutCd = 30; S.corner.manual = false; S.corner.shut('bot', 12, a); S.emit('shut', {}); }
  if (S.corner.vials < 20 && !S.drop && !p.goingPhone) { const ks = ['P1', 'P2', 'P3'].filter(k => S.tapped[k] === undefined || RNG.bots() < .3), k = ks[0] || 'P2', pp = World.props.find(q => q.tag === k); p.goingPhone = true; a.goTo(pp.x, pp.y + (k === 'P3' ? -10 : 10), 60, () => { S.reup(p, k); p.goingPhone = false; }); }
  if (S.events.some(e => e.k === 'stashSeen' && !e.seenBy) ) { const e = S.events.find(x => x.k === 'stashSeen' && !x.seenBy); e.seenBy = true; S.moveStash(p); }
}
function runBot(S, p, dt) { p.ctl.tick(); }
/* ---- what a versus event looks and sounds like ---- */
function VFX(e, S) {
  const who = S.players.find(p => p.id === e.id), nm = who ? who.name : '';
  const T0 = { photo: () => { Snd.play('shutter'); Toast(nm + ' +' + e.pts, e.why); }, shutter: () => Snd.shutter(), burn: () => { Snd.sting('made'); Toast(nm + ' burned', e.why === 'callout' ? 'Called out by the corner. Photos are worthless for 25 s.' : 'The lookouts made you.'); },
    wrongCallout: () => Toast('Wrong call', 'A citizen. -$200, and customers stay away for 10 s.'), tap: () => Toast('Payphone tapped', e.phone + ': every re-up call from it is evidence.'), tapHit: () => { Snd.play('typekey'); Toast('Tap +10', 'The corner re-upped on a tapped phone (' + e.phone + ').'); },
    seize: () => { Snd.play('cuffs'); Toast('Jump-out +20', 'Caught carrying.'); }, jumpMiss: () => Toast('Jump-out -10', 'Clean. The knockers leave mad.'), jumpCalled: () => Toast('Jump-out called', 'The knockers roll in 8 seconds.'),
    shut: () => Snd.whistle(), reup: () => Toast('Re-up called', 'A package drops by the court in 20 s.'), drop: () => Snd.play('busbrake'), package: () => Toast('Package in', 'Stash +60.'), stash: () => Toast('Stash moved', CORNER.stash[e.k].label), over: () => {} };
  if (T0[e.k]) T0[e.k]();
}
const Versus = {
  sim: null, mode: 'local',
  snapshot() { const S = this.sim; return S ? { ev: S.ev, cn: S.netCount, tl: Math.max(0, S.len - S.t), quota: S.quota, over: S.over, sides: S.players.map(p => p.side + ':' + p.role) } : null; },
  /** local play: 1 human vs bots, or 2 on one screen, split */
  startLocal(o = {}) {
    const humans = o.humans || 1, round = o.round || 0, slots = [];
    const ctl = i => i === 0 ? new HumanCtl(game.players[0]) : new HumanCtl(game.players[1] || game.players[0]);
    if (humans === 1) {
      const side = o.side || 'detail';
      if (side === 'detail') slots.push({ id: 0, name: 'You', side: 'detail', role: 'det', human: true, local: true, ctl: ctl(0) }, { id: 1, name: 'Bot detective', side: 'detail', role: 'det' }, { id: 2, name: 'Bot lieutenant', side: 'corner', role: 'lt' });
      else slots.push({ id: 0, name: 'You', side: 'corner', role: 'lt', human: true, local: true, ctl: ctl(0) }, { id: 1, name: 'Bot detective', side: 'detail', role: 'det' }, { id: 2, name: 'Bot detective', side: 'detail', role: 'det' });
    } else {
      const s0 = (0 + round) % 2 === 0 ? 'corner' : 'detail', s1 = s0 === 'corner' ? 'detail' : 'corner';
      slots.push({ id: 0, name: 'P1', side: s0, role: s0 === 'corner' ? 'lt' : 'det', human: true, local: true, ctl: ctl(0), split: true }, { id: 1, name: 'P2', side: s1, role: s1 === 'corner' ? 'lt' : 'det', human: true, local: true, ctl: ctl(1), split: true });
      if (!slots.some(s => s.side === 'detail' && s.id !== 2)) slots.push({ id: 2, name: 'Bot detective', side: 'detail', role: 'det' });
    }
    if (o.allBots) for (const s of slots) { s.human = false; s.local = false; s.ctl = new BotCtl(); }
    this.mode = 'local'; this.local = { humans, minutes: o.minutes || 5, round };
    game.go('versus', { slots, minutes: o.minutes || 5, seed: 1000 + round * 77, split: humans === 2 });
  }
};
/* ---- scenes: setup, the round, results ---- */
const VersusScenes = {};
VersusScenes.versusSetup = withGlobals({
  view: 'iso', camera: false,
  enter() {
    TitleBG.setup(); Snd.music('versus'); this.o = { side: 'detail', minutes: 5, humans: 1 }; game.allowJoin({ max: 2, onJoin: () => { this.o.humans = 2; Snd.play('coin'); UI.render(this.s); } });
    const opts = () => [['side', 'You play', this.o.humans === 2 ? 'Sides alternate each round' : this.o.side === 'detail' ? 'The Detail (detective)' : 'The Corner (lieutenant)'], ['minutes', 'Round length', this.o.minutes + ' minutes'], ['p2', 'Player 2', this.o.humans === 2 ? 'Joined: split screen' : 'Press ✕/A on a second controller, or Enter on the keyboard\'s right half'], ['start', 'Start the round', ''], ['back', 'Back to the title', '']];
    this.s = UI.open({ id: 'vsetup', idleOK: true, cls: '', html: () => `<div class="panel narrow"><div class="kicker">The Game · Corner vs Detail</div><h1>Set up a round</h1>
      <p class="lede">Detectives hide among the crowd and photograph deals: 100 evidence wins. The corner makes ${money(160 * this.o.minutes)} in ${this.o.minutes} minutes without getting made, and calls out the cops.</p>
      <div class="choices">${opts().map(([id, l, s]) => `<button class="btn${id === 'start' ? ' primary' : ''}" data-f="${id}"><b>${esc(l)}</b>${s ? ' · ' + esc(s) : ''}</button>`).join('')}</div></div>`,
      legend: [['confirm', 'Choose'], ['cancel', 'Back']], onBack: () => { game.allowJoin(false); game.go('title'); },
      onSelect: id => { if (id === 'side') this.o.side = this.o.side === 'detail' ? 'corner' : 'detail'; else if (id === 'minutes') this.o.minutes = { 3: 5, 5: 8, 8: 3 }[this.o.minutes]; else if (id === 'p2') { if (this.o.humans === 1 && game.players.length < 2) game.addPlayer({ keys: 'right' }); this.o.humans = game.players.length >= 2 ? 2 : 1; } else if (id === 'start') { game.allowJoin(false); UI.closeAll(); Versus.startLocal(this.o); return; } else if (id === 'back') { game.allowJoin(false); game.go('title'); return; } UI.render(this.s); } });
  },
  update(dt) { TitleBG.tick(dt); },
  draw(r) { TitleBG.draw(r); drawLogo(r, 10, 3); }
});
VersusScenes.versus = withGlobals({
  view: 'iso', views: ['iso'], pausable: !(window.AIHub && AIHub.active), camera: { zoom: [.8, 1.8], start: 1.15, tall: 1.3 },
  enter(d) {
    if (Versus.sim) Versus.sim.dispose();
    const S = Versus.sim = new VersusSim(d); this.S = S; this.d = d; World.setTOD(d.tod || 'dusk'); Snd.music('versus'); Amb.set('streetDay');
    this.locals = S.players.filter(p => p.local && p.human); if (!this.locals.length && d.split) this.locals = S.players.slice(0, 2);
    if (d.split && this.locals.length === 2) { game.splitScreen(2, { follow: this.locals.map(p => p.agent), layout: 'auto' }); for (const p of this.locals) p.split = true; }
    else { game.splitScreen(0); game.follow(null); }
    game.cam.bounds = v => World.map.bounds(v); game.cam.snap = true; this.t0 = 0; this.ended = false;
    if (Versus.mode === 'net') Net.attach(S);
    if (shell) shell.hud({});
    if (!Globals.attract && !(window.AIHub && AIHub.active)) Toast('The Game', this.locals[0] ? (this.locals[0].side === 'detail' ? 'You\'re a detective. Blend in, photograph deals, 100 evidence wins.' : 'You run the corner. Make the quota; watch for cameras; call out cops.') : 'Bots only.');
  },
  exit() { game.splitScreen(0); if (Versus.sim && !this.keepSim) { Versus.sim.dispose(); } game.cam.offset = null; },
  update(dt) {
    const S = this.S; if (!S) return;
    if (Talk.update(dt)) return;
    if (Versus.mode !== 'net' || Net.isHost) S.tick(dt); else Net.clientTick(dt);
    if (Versus.mode === 'net') Net.tick(dt);
    for (const p of this.locals) { const a = p.agent; if (p.split && game.viewports[this.locals.indexOf(p)]) p.view = game.viewports[this.locals.indexOf(p)].view || game.view; }
    if (!this.locals.length || Net.server) { const all = S.players.map(p => p.agent); game.cam.frame(all, { margin: 40, zoom: [.7, 1.2] }); }
    else if (this.locals.length === 1) { const a = this.locals[0].agent, w = this.locals[0].w; game.focus(a.x + (w.on && w.aim ? (w.aim.x - a.x) * .4 : 0), a.y + (w.on && w.aim ? (w.aim.y - a.y) * .4 : 0), 16); World.focus = a; }
    else World.focus = null;
    if (S.over && !this.ended) { this.ended = true; if (Versus.mode === 'net') { if (Net.isHost) Net.finish(); } else game.after(Globals.attract ? .5 : 2.2, () => game.go('versusResults', {})); }
    // music layers
    Snd.layer('pressure', S.ev >= 50 ? 1 : 0); Snd.layer('clock', S.len - S.t < 60 ? 1 : 0); Snd.layer('cash', S.netCount >= S.quota * 2 / 3 ? 1 : 0);
  },
  draw(r) {
    const S = this.S; if (!S) return;
    World.draw(r); S.corner.draw(r);
    for (const a of Crowd.list) drawAgent(r, a, { bg: true });
    const vp = r.viewport ? this.locals[r.viewport.i] : this.locals[0], mySide = vp ? vp.side : 'detail';
    for (const p of S.players) if (p.side === 'detail') { const a = p.agent, burned = p.burnedT > 0; drawAgent(r, a, { ring: vp === p ? p.color : (mySide === 'corner' && burned) ? '#ff3a3a' : mySide === 'detail' && !(window.AIHub && AIHub.active && !p.local) ? E.mix(p.color, '#000000', .3) : null, xray: vp === p ? { actors: true, color: p.color } : false }); }
    for (const p of S.players) if (p.side === 'corner' && vp === p) r.groundRing(p.agent.x, p.agent.y, 10, p.color, .9);
    if (S.drop && S.drop.ready) { r.shape('trashbag', S.drop.x, S.drop.y, 0, {}); r.marker(S.drop.x, S.drop.y, 10, { label: 'PACKAGE', color: '#ffb347' }); }
    if (vp) { const w = vp.w; if (w.on && w.aim) { r.groundRing(w.aim.x, w.aim.y, 8, w.target ? (w.focus >= 1 ? '#45d6a0' : '#ffb347') : '#f2ead8', 1); if (w.target) r.groundRing(w.target.x, w.target.y, 12 - 5 * w.focus, '#45d6a0', .8); } }
    if (vp && vp.side === 'detail') Perception.draw(r, vp.agent);
    drawBubbles(r, S.corner.all().concat(Crowd.list), vp ? vp.agent : null);
    if (r.viewport && vp) this.viewHud(r, vp);
    else if (vp) this.viewHud(r, vp);
    if (!r.viewport) this.hud(r);
    Talk.draw(r);
  },
  viewHud(r, p) {
    const S = this.S; r.overlay(g => {
      const v = r.viewport || { x: 0, y: 0, w: r.W, h: r.H }, x = v.x + 8, y = v.y + v.h - 40;
      E.font.text(g, p.name + ' · ' + (p.side === 'detail' ? 'DETECTIVE' : p.role === 'lt' ? 'LIEUTENANT' : 'RUNNER'), x, y, p.color, { shadow: '#000', outline: false });
      const hints = p.side === 'detail' ? [['watch', 'Watch'], ['photo', 'Photo'], ['interact', 'Tap phone'], ['partner', p.jumpUsed ? 'Jump-out used' : 'Jump-out'], ['blend', 'Blend']] : p.role === 'lt' ? [['watch', 'Watch'], ['partner', p.cd > 0 ? 'Call out ' + Math.ceil(p.cd) : 'Call out'], ['blend', S.corner.open ? 'Shut down' : 'Open up'], ['interact', 'Stash / re-up']] : [['interact', 'Pick up / hand off'], ['crouch', 'Ditch']];
      let hx = x; for (const [a, l] of hints) { const lab = p.ctl.i ? p.ctl.i.label(a) : Prompts.label(a); hx += Glyph.prompt(g, lab, l, hx, y + 12, '#e8e0d0') + 8; if (hx > v.x + v.w - 60) break; }
      if (p.burnedT > 0) E.font.text(g, 'BURNED ' + Math.ceil(p.burnedT), v.x + v.w / 2, v.y + 30, '#ff4a3a', { align: 'center', shadow: '#000' });
      if (p.side === 'detail') { const h = Perception.heat(p.agent); E.ui.bar(g, x, y - 10, 60, 4, h, h > .65 ? '#ff5a4a' : '#ffb347'); E.font.text(g, 'EYES ON YOU', x + 64, y - 12, '#9a9080', { font: 'tiny', outline: false }); }
    });
  },
  hud(r) {
    const S = this.S; r.overlay(g => {
      const tl = Math.max(0, S.len - S.t), mm = Math.floor(tl / 60), ss = Math.floor(tl % 60), cx = Math.round(r.W / 2);
      px.rect(g, cx - 92, 4, 184, 26, '#000000'); E.font.text(g, mm + ':' + String(ss).padStart(2, '0'), cx, 7, tl < 60 ? '#ff5a4a' : '#f2ead8', { align: 'center', outline: false });
      E.font.text(g, 'DETAIL ' + Math.round(S.ev) + '/100', cx - 88, 18, '#7aa7ff', { outline: false }); E.font.text(g, 'CORNER ' + money(S.netCount) + '/' + money(S.quota), cx + 88, 18, '#ffb347', { align: 'right', outline: false });
      E.ui.bar(g, cx - 88, 27, 80, 2, Math.min(1, S.ev / 100), '#7aa7ff'); E.ui.bar(g, cx + 8, 27, 80, 2, Math.min(1, S.netCount / S.quota), '#ffb347');
      if (S.over) { px.rect(g, 0, r.H / 2 - 20, r.W, 40, '#000000'); E.font.text(g, S.over === 'detail' ? 'THE DETAIL MAKES ITS CASE' : S.over === 'corner' ? 'THE CORNER MAKES ITS COUNT' : 'THE GAME GOES ON', cx, r.H / 2 - 6, '#ffffff', { align: 'center', scale: 1, outline: false }); }
      if (Globals.attract && r.viewport === undefined && game.viewports.length) Attract.draw(r);
      if (Versus.mode === 'net') { const t = window.AIHub ? AIHub.time() : 0, me = Net.myPlayer();
        if (S.netWait) { px.rect(g, 0, r.H / 2 - 34, r.W, 68, '#000000'); E.font.text(g, me ? (me.side === 'detail' ? 'YOU ARE A DETECTIVE: BLEND IN, PHOTOGRAPH DEALS' : me.role === 'lt' ? 'YOU RUN THE CORNER: MAKE THE COUNT, CALL OUT COPS' : 'YOU ARE THE RUNNER: STASH TO CUSTOMER') : 'SPECTATING', cx, r.H / 2 - 24, '#ffb347', { align: 'center', outline: false }); E.font.text(g, isFinite(t) ? String(Math.max(1, Math.ceil(-t / 1000))) : 'GET READY', cx, r.H / 2 - 6, '#ffffff', { align: 'center', scale: 2, outline: false }); }
        if (Net.ended && Net.endMsg) { px.rect(g, 0, r.H - 40, r.W, 22, '#000000'); E.font.text(g, Net.endMsg, cx, r.H - 34, '#ffffff', { align: 'center', outline: false }); } }
    });
  }
});
VersusScenes.versusResults = withGlobals({
  view: 'iso', camera: false,
  enter() {
    const S = Versus.sim; TitleBG.setup(); Snd.music('theme'); const aw = S ? S.awards() : [];
    this.s = UI.open({ id: 'vresults', cls: 'results', html: () => `<div class="panel narrow"><div class="kicker">The Game · results</div><h1>${S.over === 'detail' ? 'The Detail wins' : S.over === 'corner' ? 'The Corner wins' : 'Draw: the game goes on'}</h1>
      <p><span class="stat"><b>${Math.round(S.ev)}</b>evidence</span><span class="stat"><b>${money(S.netCount)}</b>the count (quota ${money(S.quota)})</span></p>
      ${S.players.map(p => `<p><b style="color:${p.color}">${esc(p.name)}</b> · ${p.side === 'detail' ? 'Detective' : p.role === 'lt' ? 'Lieutenant' : 'Runner'} · photos ${p.stats.photos} · burned ${p.stats.burns} · call-outs ${p.stats.callouts} · score ${p.stats.score}</p>`).join('')}
      ${aw.map(a => `<p class="kicker">${esc(a.title)}: ${esc((S.players.find(p => p.id === a.id) || {}).name || '')} · ${esc(a.detail)}</p>`).join('')}
      <button class="btn primary" data-f="again">Another round${Versus.local && Versus.local.humans === 2 ? ' (sides switch)' : ''}</button><button class="btn" data-f="title">Back to the title</button></div>`,
      legend: [['confirm', 'Choose']], onBack: () => game.go('title'),
      onSelect: id => { if (id === 'again') { UI.closeAll(); const L = Versus.local || { humans: 1, minutes: 5, round: 0 }; Versus.startLocal(Object.assign({}, L, { round: (L.round || 0) + 1 })); } else game.go('title'); } });
  },
  update(dt) { TitleBG.tick(dt); },
  draw(r) { TitleBG.draw(r); }
});
