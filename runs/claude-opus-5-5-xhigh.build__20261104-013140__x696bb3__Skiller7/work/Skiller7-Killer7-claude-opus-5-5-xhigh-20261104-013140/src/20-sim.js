/* SIM: all game state and rules, deterministic in fixed steps (1/120 s), with no three.js, DOM or presenter reads.
 * Its update order (§5.4): modes → walker → camera director → skills → weapons and projectiles → Whiteouts → scan and
 * reveals → combat → pickups → economy → bosses → triggers and waves → story and beats → results clock → events.
 * The other sim files (21-31, 33, 40, 50, 60) add their parts to Sim.prototype. */
const PERSONA_ORDER = S7.PERSONA_ORDER = ['ansel', 'dagny', 'ignaz', 'rurik', 'kasimir', 'mireille', 'brigid'];

class Sim {
  constructor(game, o = {}) {
    this.game = game; this.o = o;
    this.events = [];
    this.st = null;           // the saved state
    this.cam = new CameraDirector(this);
    this.areaDef = null; this.grid = null; this.rails = null;
    this.enemies = []; this.shots = []; this.projectiles = []; this.drops = []; this.fx = [];
    this.beats = []; this.talk = null; this.card = null; this.toasts = [];
    this.time = 0; this.uid = 1;
    this.aim = { on: false, yaw: 0, pitch: 0, recoil: 0, swayT: 0, scope: false, k: 0, toggled: false };
    this.scan = null; this.flare = null; this.echo = null; this.flash = null;
    this.ring = null; this.switching = null; this.prompt = null; this.near = null;
    this.junction = null; this.mode = 'rail';
    this.wave = {}; this.waveQ = [];
    this.tutorial = null; this.letterbox = 0;
    this.splashes = [];
  }
  emit(type, data) { S7.bus.emit(type, data); }
  /** drop everything that belongs to a moment (beats, talks, bosses, set pieces, aim) and keep the saved state */
  resetTransient() {
    Object.assign(this, { beats: [], talk: null, card: null, cutscene: false, letterbox: 0, camOverride: null, prompt: null, boss: null, bossNoSwitch: false, bossLockAim: false,
      mode: 'rail', switching: null, ring: null, lawine: null, gondola: null, toasts: [], splashes: [], uiRequest: null, resultsReady: null, creditsReady: false, epilogue: false,
      holdSpot: null, skiFork: null, skiForkAt: null, scan: null, flare: null, echo: null, flash: null, slowmo: null, tutorial: null, mags: {}, skipping: false, attractSlalomAt: 0 });
    if (this.aim) { this.aim.on = false; this.aim.k = 0; this.aim.scope = false; this.aim.toggled = false; this.aim.recoil = 0; }
    S7.interviewGun = false;
  }
  diff() { return DIFF[this.st ? this.st.difficulty : 'piste'] || DIFF.piste; }
  setting(k, d) { const s = this.game.settings; return s && s[k] !== undefined ? s[k] : d; }

  /* ---------------- new game, state ---------------- */
  freshState(difficulty = 'piste') {
    const roster = {};
    for (const id of PERSONA_ORDER) {
      const P = S7.PERSONAS[id];
      roster[id] = { hp: P.hp, stats: { power: 0, speed: 0, critical: 0, steady: 0 }, frozen: false, statue: null, unlocked: !!P.startUnlocked };
    }
    return {
      v: 1, difficulty, area: 'room7', node: 'bed', persona: 'ignaz', lastPersona: 'dagny', roster,
      red: 60, rime: 0, items: {}, pins: [], dossier: [], exposures: [], gates: {}, waves: {}, spots: {}, flags: {}, tut: {},
      results: { 0: this.freshResults(), 1: this.freshResults() }, target: 0, playtime: 0,
      room7Door: null, hintsBought: 0, freeHint: true, visited: {}, seenEdges: {}, ending: null
    };
  }
  freshResults() { return { time: 0, kills: 0, crits: 0, hits: 0, shots: 0, red: 0, frozen: 0, hints: 0, done: false }; }
  newGame(difficulty) {
    this.resetTransient();
    this.st = this.freshState(difficulty);
    this.enterArea('room7', 'bed', { silent: true });
    this.startBeat('cold_open');
  }
  /* ---------------- areas ---------------- */
  /** load an area: its grid, rails, cameras; place the walker on a node (facing along its first exit or `face`) */
  enterArea(id, nodeId, o = {}) {
    const A = S7.AREAS[id]; if (!A) throw new Error('unknown area ' + id);
    const from = this.st.area;
    this.areaDef = A; this.st.area = id;
    this.grid = new LevelGrid(A);
    this.rails = new RailGraph(A, this.grid);
    for (const gid in A.gates || {}) { const g = A.gates[gid]; if (g.hides && !this.gateOpen(gid)) for (const eid of [].concat(g.hides)) if (this.rails.edges[eid]) this.rails.edges[eid].hidden = true; }
    for (const gid in A.gates || {}) { const g = A.gates[gid]; if (g.block && !this.gateOpen(gid)) this.grid.dynBlocks.push(Object.assign(g.block.map(v => v * M), { gate: gid })); }
    this.cam.reset();
    this.enemies = []; this.projectiles = []; this.drops = []; this.wave = {}; this.waveQ = []; this.boss = null;
    this.spots = this.resolveSpots(A);
    const N = this.rails.nodes[nodeId] || this.rails.nodes[Object.keys(this.rails.nodes)[0]];
    const ex = this.rails.exits(N.id);
    let yaw = o.face !== undefined ? o.face : ex.length ? this.rails.branchYaw(ex[0], ex[0].dir) : 0;
    this.W = { edge: null, node: N.id, s: 0, dir: 1, v: 0, yaw, turnT: 0, turnFrom: yaw, lastEdge: null, air: null };
    this.st.node = N.id;
    this.mode = A.kind === 'room7' ? 'rail' : 'rail';
    this.junction = null; this.aimExit(true);
    this.st.visited[id] = true;
    this.heroUpdate(0);
    this.cam.shotId = null;
    this.atNode(N.id, true);
    if (!o.silent) this.emit('area', { from, to: id });
    if (A.onEnter && !o.noEnter) A.onEnter(this, o);
    for (const tr of A.triggers || []) if (tr.onEnter && this.trigOk(tr)) this.fireTrigger(tr);
    // the persistent state of frozen statues in this area
    if (!o.silent && A.kind !== 'room7' && !this.o.attract && !this.o.bot && !o.noSave) this.autosave('area');
  }
  resolveSpots(A) {
    const out = [];
    for (const s0 of A.spots || []) {
      const s = Object.assign({}, s0);
      if (s.node) { const n = this.rails.nodes[s.node]; s.x = n.x; s.y = n.y; s.z = n.z; }
      else if (s.edge) { const e = this.rails.edges[s.edge]; const p = e.path.at((s.s || .5) * e.length); s.x = p.x; s.y = p.y; s.z = p.z; }
      else if (s.at) { const t = S7.tw(s.at); s.x = t[0]; s.y = t[1]; s.z = t[2] !== null ? t[2] : this.grid.floorAt(t[0], t[1]); }
      if (s.atZ !== undefined) s.z = s.atZ * M;
      if (s.up) s.z += s.up * M;
      out.push(s);
    }
    return out;
  }
  spotKey(s) { return this.st.area + ':' + s.id; }
  spotUsed(s) { return !!this.st.spots[this.spotKey(s)]; }
  gateKey(gid) { return this.st.area + ':' + gid; }
  gateOpen(gid) { return !!this.st.gates[this.gateKey(gid)]; }

  /* ---------------- the hero's place ---------------- */
  heroUpdate(dt) {
    const W = this.W;
    let p;
    if (W.air) {   // a jump's arc
      const a = W.air, u = clamp(a.t / a.T, 0, 1), P0 = a.from, P1 = a.to;
      p = { x: lerp(P0[0], P1[0], u), y: lerp(P0[1], P1[1], u), z: lerp(P0[2], P1[2], u) + Math.sin(u * Math.PI) * a.apex, yaw: Math.atan2(P1[1] - P0[1], P1[0] - P0[0]) };
    } else if (W.edge) { const e = this.rails.edges[W.edge]; p = e.path.at(W.s); }
    else { const n = this.rails.nodes[W.node]; p = { x: n.x, y: n.y, z: n.z, yaw: W.yaw }; }
    // facing: the path's tangent times dir, a quick turn swings it through 180°
    if (W.edge && !W.air) { const e = this.rails.edges[W.edge]; const p2 = e.path.at(W.s); W.yaw = p2.yaw + (W.dir < 0 ? Math.PI : 0); }
    let face = W.yaw;
    if (W.turnT > 0) { W.turnT = Math.max(0, W.turnT - dt); const u = 1 - W.turnT / .22; face = W.turnFrom + S7.angDiff(W.turnFrom, W.yaw) * S7.ease.inOut(u); }
    this.hero = { x: p.x, y: p.y, z: p.z, yaw: face };
  }
  eye() { const h = this.hero; return [h.x, h.y, h.z + EYE_H]; }

  /* ---------------- the step ---------------- */
  update(dt, I) {
    const st = this.st; if (!st) return;
    this.events.length = 0;
    I = I || S7.noIntents();
    this.I = I;
    this.realDt = dt;
    // the Featherbed ring slows time; a switch freezes play for its 0.45 s
    const ts = (this.ring ? .15 : 1) * (CHEAT.slowCrit && this.critSlow > 0 ? .3 : 1) * (this.boss && this.boss.id === 'hansi' && this.boss.phase === 2 && this.aim.on ? .6 : 1);
    if (this.critSlow > 0) this.critSlow -= dt;
    const sdt = dt * ts;
    this.time += sdt;
    if (this.card) { this.updateCard(dt, I); this.runBeats(dt); return; }
    if (this.talk) { this.updateTalk(dt, I); this.runBeats(dt); this.updateToasts(dt); return; }
    if (this.prompt && this.prompt.choice) { this.updateChoice(dt, I); return; }
    const cut = this.cutscene;
    if (!cut && !this.o.noClock) { st.playtime += dt; if (this.areaDef.target !== undefined && !st.results[this.areaDef.target].done) st.results[this.areaDef.target].time += dt; }
    if (cut) { I = S7.noIntents(); this.I = I; }
    this.updateMode(sdt, dt, I);
    this.heroUpdate(sdt);
    this.updateSkills(sdt, I);
    this.updateWeapons(sdt, I);
    this.updateProjectiles(sdt);
    this.updateEnemies(sdt);
    this.updateReveals(sdt);
    this.updateDrops(sdt);
    this.updateEconomy(sdt, I);
    if (this.boss) this.updateBoss(sdt);
    this.updateWaves(sdt);
    if (this.areaDef.update) this.areaDef.update(this, sdt);
    this.updateNear(I);
    this.runBeats(sdt);
    this.updateToasts(dt);
    this.updateCamera(sdt);
    this.splashes = this.splashes.filter(s => (s.t += dt) < s.life);
  }
  updateToasts(dt) { for (const t of this.toasts) t.t += dt; this.toasts = this.toasts.filter(t => t.t < (t.life || 2.6)); }
  toast(text, o = {}) { this.toasts.push(Object.assign({ text, t: 0, life: 2.6 }, o)); }
  splash(text, o = {}) { this.splashes.push(Object.assign({ text, t: 0, life: 1.1, big: true }, o)); this.emit('splash', { text }); }
  say(line, o = {}) { this.toasts.push(Object.assign({ text: line, t: 0, life: 2.8, line: true }, o)); }

  /* ---------------- modes ---------------- */
  updateMode(dt, rdt, I) {
    const st = this.st, P = this.personaDef();
    if (this.switching) { this.switching.t += rdt; if (this.switching.t >= .45) { this.switching = null; this.emit('switched', { to: st.persona }); this.bark('switch'); } return; }
    if (this.mode === 'frozen') { this.frozenT -= dt; if (this.frozenT <= 0) this.startRescue(); return; }
    if (this.mode === 'gameover') return;
    if (this.mode === 'interview') { this.updateInterview(dt, I); return; }
    // the Featherbed ring: hold to open (rail and lift modes), pick, release to switch; a tap swaps back
    if (this.updateRing(dt, rdt, I)) return;
    if (I.pick !== null && I.pick !== undefined && !this.aim.on && this.canSwitch()) { this.trySwitch(PERSONA_ORDER[I.pick]); }
    // aim: hold or toggle
    const toggle = this.setting('aimToggle', 'hold') === 'toggle';
    let wantAim = toggle ? (I.aimP ? !this.aim.toggled : this.aim.toggled) : I.aimD;
    if (toggle) this.aim.toggled = wantAim;
    if (this.bossLockAim) wantAim = true;
    const W = this.W, e = W.edge ? this.rails.edges[W.edge] : null;
    const skiing = e && e.kind === 'ski', lifting = e && e.kind === 'lift';
    const canAim = !W.air && (!skiing || W.v < 8 || e.aimOnTheMove) && this.mode !== 'cutscene';
    if (wantAim && canAim && !this.aim.on) this.aimEnter();
    else if ((!wantAim || !canAim) && this.aim.on && !this.bossLockAim) this.aimExit();
    if (this.aim.on) { this.updateAim(dt, I); if (!lifting && !(e && e.aimOnTheMove)) { W.v = 0; if (skiing) this.skiHold = true; } else this.walk(dt, I, true); return; }
    // map (the UI opens it), heal, interact
    this.healing = I.healD && !W.air && this.mode !== 'ski';
    if (I.interactP || I.spotPick) this.interact(I.spotPick);
    if (this.holdSpot) this.updateHold(dt, I);
    this.walk(dt, I, false);
  }
  canSwitch() { return !this.aim.on && !this.talk && !this.cutscene && !this.switching && this.mode !== 'frozen' && this.mode !== 'rescue' && !this.bossNoSwitch && !this.W.air; }

  /* ---------------- the walker (§7.1) ---------------- */
  walkSpeed() {
    const P = this.personaDef(), lv = this.stats().speed;
    let v = T.walkSpeed * (P.walk || 1) * (1 + .08 * lv);
    if (this.st.persona === 'dagny' && this.tucking) v *= 2;
    return v;
  }
  walk(dt, I, aiming) {
    const W = this.W, G = this.rails;
    if (W.air) { this.updateJump(dt); return; }
    if (!W.edge) { this.atNodeUpdate(dt, I); return; }
    const e = G.edges[W.edge];
    if (e.kind === 'ski') { this.ski(dt, I, e); return; }
    if (e.kind === 'lift') { W.v = e.speed || 120; this.advance(dt, e); return; }
    // walk / stairs
    if (I.turnP && !e.oneWay && !aiming) { this.quickTurn(); return; }
    const target = I.move && !aiming && !this.healing ? this.walkSpeed() * (e.kind === 'stairs' ? .85 : 1) : 0;
    const acc = target > W.v ? this.walkSpeed() / .18 : this.walkSpeed() / .12;
    W.v = E.approach(W.v, target, acc * dt);
    // slow down to stop exactly on a stopping node
    const endN = G.endNode(e, W.dir), left = W.dir > 0 ? e.length - W.s : W.s;
    if (this.stopsAt(endN, e) && left < 1.2 * M) W.v = Math.min(W.v, Math.max(14, this.walkSpeed() * left / (1.2 * M)));
    this.advance(dt, e);
  }
  quickTurn() {
    const W = this.W; W.turnFrom = W.yaw; W.dir *= -1; W.turnT = .22; W.v *= .3; this.emit('quickturn', {});
    this.tut('quickturn', true);
  }
  /** move along edge e; on reaching its end, arrive at the node (passing through if it doesn't stop us) */
  advance(dt, e) {
    const W = this.W;
    W.s += W.dir * W.v * dt;
    this.st.seenEdges[this.st.area + ':' + e.id] = 1;
    this.checkEdgeTriggers(e);
    if (W.s >= e.length || W.s <= 0) {
      const endN = this.rails.endNode(e, W.dir);
      W.s = W.dir > 0 ? e.length : 0;
      this.arrive(endN, e);
    }
  }
  /** does arriving at node id from edge e stop the walker? */
  stopsAt(id, e) {
    const n = this.rails.nodes[id]; if (!n) return true;
    if (n.kind && n.kind !== 'pass') return true;
    if (this.statueAtNode(id)) return true;
    const ex = this.rails.exits(id).filter(x => x.edge.id !== e.id);
    if (ex.length !== 1) return true;
    const nx = ex[0].edge;
    if (nx.kind === 'lift' || nx.kind === 'jump') return true;
    if (nx.gate && !this.gateOpen(nx.gate) && !CHEAT.ghost) return true;
    if (e.kind === 'ski' && nx.kind !== 'ski') return true;
    return false;
  }
  arrive(id, e) {
    const W = this.W, n = this.rails.nodes[id];
    const ex = this.rails.exits(id).filter(x => x.edge.id !== e.id);
    if (!this.stopsAt(id, e) && ex.length === 1) {
      const x = ex[0]; W.edge = x.edge.id; W.dir = x.dir; W.s = x.dir > 0 ? 0 : x.edge.length; W.lastEdge = e.id;
      this.atNode(id, false);
      return;
    }
    W.lastEdge = e.id; W.edge = null; W.node = id; W.v = 0; this.st.node = id;
    if (e.kind === 'ski' && ex.some(x => x.edge.kind === 'ski') && this.skiFork) { const f = this.skiFork; this.skiFork = null; W.edge = f.edge.id; W.dir = f.dir; W.s = 0; W.node = null; return; }
    this.atNode(id, true);
  }
  /** a node was reached (stopping or passing through): triggers, auto exits, junction setup */
  atNode(id, stopped) {
    const n = this.rails.nodes[id];
    for (const tr of this.areaDef.triggers || []) if (tr.node === id && this.trigOk(tr)) this.fireTrigger(tr);
    if (!stopped) return;
    if (n.kind === 'exit' && n.open && n.to && !this.blockedExit(n)) { this.useExit(n); return; }
    this.setupJunction(id);
  }
  blockedExit(n) { return n.needs && !this.meets(n.needs, true); }
  setupJunction(id) {
    const W = this.W, ex = this.rails.exits(id).filter(x => !x.edge.hidden);
    // the branch most straight ahead is highlighted first
    let best = 0, bd = 9;
    ex.forEach((x, i) => { const d = Math.abs(S7.angDiff(W.yaw, this.rails.branchYaw(x, x.dir))); if (d < bd) { bd = d; best = i; } });
    this.junction = { node: id, exits: ex, i: best, held: 0 };
    if (ex.length > 1) this.emit('junction', { node: id, options: ex.length });
  }
  atNodeUpdate(dt, I) {
    const W = this.W, J = this.junction;
    if (!J) { this.setupJunction(W.node); return; }
    W.v = 0;
    if (I.turnP) { W.turnFrom = W.yaw; W.yaw = S7.wrapAng(W.yaw + Math.PI); W.turnT = .22; this.emit('quickturn', {}); this.setupJunction(W.node); this.tut('quickturn', true); return; }
    if (!J.exits.length) return;
    // choose a branch: the stick by its screen angle, d-pad / arrows / A D cycle, the mouse hover (branchPick)
    const pose = this.cam.pose, aspect = this.game.W / this.game.H || 16 / 9;
    if (I.branchPick !== null && I.branchPick !== undefined && J.exits[I.branchPick]) J.i = I.branchPick;
    else if (I.device === 'gamepad' && Math.hypot(I.stick[0], I.stick[1]) > .5) {
      const sa = Math.atan2(I.stick[1], I.stick[0]);
      let bi = J.i, bd = 9;
      J.exits.forEach((x, i) => { const a = this.branchScreenAngle(x, pose, aspect); if (a === null) return; const d = Math.abs(S7.angDiff(sa, a)); if (d < bd) { bd = d; bi = i; } });
      J.i = bi;
    } else if (I.leftP || I.rightP) {
      const order = J.exits.map((x, i) => ({ i, a: this.branchScreenAngle(x, pose, aspect) })).sort((a, b) => Math.cos(a.a === null ? 0 : a.a) - Math.cos(b.a === null ? 0 : b.a));
      const k = order.findIndex(o => o.i === J.i);
      J.i = order[(k + (I.rightP ? 1 : order.length - 1)) % order.length].i;
      this.emit('tick', {});
    }
    // hold move (after a beat: the junction reads) or press it again, or click a marker, to take it
    J.t = (J.t || 0) + dt;
    if (!I.move) J.released = true;
    const go = (I.move && (J.released || J.t > .3 || this.o.bot || this.o.attract || J.exits.length < 2)) || (I.branchPick !== null && I.branchPick !== undefined && I.clicked);
    if (go) this.takeBranch(J.exits[J.i]);
  }
  /** a branch's direction on screen (radians, screen space: 0 right, π/2 down) under a camera pose */
  branchScreenAngle(x, pose, aspect) {
    const n = this.rails.nodes[this.W.node], yaw = this.rails.branchYaw(x, x.dir);
    const a = S7.project(pose, n.x, n.y, n.z + 8, aspect), b = S7.project(pose, n.x + Math.cos(yaw) * 24, n.y + Math.sin(yaw) * 24, n.z + 8, aspect);
    if (!a || !b) { const rel = S7.angDiff(pose.yaw, yaw); return -Math.PI / 2 + rel; }
    return Math.atan2((b[1] - a[1]) / aspect, b[0] - a[0]);
  }
  takeBranch(x) {
    const W = this.W, e = x.edge;
    if (!this.passGate(e)) return false;
    if (e.kind === 'lift') { if (!this.I.interactP && !this.I.move && !this.o.bot) return false; this.emit('lift', { edge: e.id }); }
    if (e.kind === 'jump' && !this.canJump(e)) { this.say('TOO FAR TO JUMP.', { who: this.st.persona }); this.emit('gate', { ok: false }); this.junction.held = 0; return false; }
    W.edge = e.id; W.dir = x.dir; W.s = x.dir > 0 ? 0 : e.length; W.node = null; this.junction = null;
    if (e.kind === 'jump') this.startJump(e);
    if (e.kind === 'ski') { W.v = Math.max(W.v, 30); this.skiHold = false; }
    this.tut('walk', true);
    return true;
  }
  /* ---- skiing (§7.1): downhill with drag; move tucks, turn is a hockey stop; forks picked on the move ---- */
  ski(dt, I, e) {
    const W = this.W, p = e.path.at(W.s), slope = -(p.slope || 0) * (W.dir > 0 ? 1 : -1);
    const dagny = this.st.persona === 'dagny';
    this.tucking = I.move || (dagny && I.skillD && this.st.red > 0);
    if (I.turnP && W.v > 10) { this.skiHold = true; this.emit('hockeystop', {}); }
    if (I.move && this.skiHold) { this.skiHold = false; W.v = Math.max(W.v, 20); }
    const top = T.skiTop * (dagny && this.tucking ? 260 / 190 : 1) * (this.echoRun ? 1.15 : 1);
    if (this.skiHold) W.v = E.approach(W.v, 0, 600 * dt);
    else {
      const k = this.tucking ? .0006 : I.move ? .0011 : .0019;
      W.v += (520 * Math.max(-.2, slope) - k * W.v * W.v - 6) * dt;
      if (this.tucking && dagny) W.v += 40 * dt;
      W.v = clamp(W.v, 18, top);
    }
    // a fork ahead: markers 2.5 s before it, picked on the move (stick, d-pad, A/D, a click); default: straightest
    const endN = this.rails.endNode(e, W.dir), left = e.length - W.s;
    const ex = this.rails.exits(endN).filter(x => x.edge.kind === 'ski' || x.edge.kind === 'jump');
    if (ex.length > 1 && left < W.v * 2.5) {
      if (!this.skiForkAt || this.skiForkAt.node !== endN) {
        let best = 0, bd = 9; ex.forEach((x, i) => { const d = Math.abs(S7.angDiff(p.yaw, this.rails.branchYaw(x, x.dir))); if (d < bd) { bd = d; best = i; } });
        this.skiForkAt = { node: endN, exits: ex, i: best };
      }
      const F = this.skiForkAt;
      if (I.branchPick !== null && I.branchPick !== undefined && F.exits[I.branchPick]) F.i = I.branchPick;
      if (I.leftP) F.i = (F.i + F.exits.length - 1) % F.exits.length;
      if (I.rightP) F.i = (F.i + 1) % F.exits.length;
      if (I.device === 'gamepad' && Math.abs(I.stick[0]) > .5) {
        const rel = F.exits.map((x, i) => ({ i, a: S7.angDiff(p.yaw, this.rails.branchYaw(x, x.dir)) })).sort((a, b) => a.a - b.a);
        F.i = I.stick[0] < 0 ? rel[0].i : rel[rel.length - 1].i;
      }
      this.skiFork = F.exits[F.i];
    } else this.skiForkAt = null;
    if (this.skiHold && W.v <= 0) return;
    W.s += W.v * dt;
    this.checkEdgeTriggers(e);
    if (W.s >= e.length) {
      W.s = e.length;
      const f = this.skiFork; this.skiFork = null; this.skiForkAt = null;
      if (f && ex.length > 1) {
        if (f.edge.kind === 'jump' && !this.canJump(f.edge)) { const alt = ex.find(x => x.edge.kind === 'ski'); if (alt) { this.say('TOO FAR TO JUMP.'); W.edge = alt.edge.id; W.s = 0; W.dir = 1; return; } }
        W.edge = f.edge.id; W.dir = 1; W.s = 0; this.atNode(endN, false);
        if (f.edge.kind === 'jump') this.startJump(f.edge);
        return;
      }
      const nx = ex.length === 1 ? ex[0] : null;
      if (nx && nx.edge.kind === 'ski') { W.edge = nx.edge.id; W.dir = 1; W.s = 0; this.atNode(endN, false); return; }
      if (nx && nx.edge.kind === 'jump' && this.canJump(nx.edge)) { W.edge = nx.edge.id; W.s = 0; this.atNode(endN, false); this.startJump(nx.edge); return; }
      this.tucking = false;
      this.arrive(endN, e);
    }
  }
  canJump(e) { return CHEAT.ghost || this.o.attract || (this.st.persona === 'dagny' && (this.tucking || this.I.skillD || this.W.v >= 150 || this.I.move)); }
  startJump(e) {
    const W = this.W, a = e.path.at(0), b = e.path.at(e.length);
    W.air = { t: 0, T: Math.max(.6, e.length / (e.speed || 420)), from: [a.x, a.y, a.z], to: [b.x, b.y, b.z], apex: (e.apex || 2.5) * M, edge: e.id };
    this.emit('jump', {}); this.tut('jump', true);
    if (e.slowmo) this.slowmo = { t: .6, k: .5 };
  }
  updateJump(dt) {
    const W = this.W, a = W.air; a.t += dt;
    if (a.t >= a.T) {
      const e = this.rails.edges[a.edge]; W.air = null; W.edge = e.id; W.s = e.length; W.dir = 1;
      this.emit('land', {});
      this.arrive(e.b, e);
      // continue downhill if the jump lands on a ski edge
      const ex = this.rails.exits(e.b).filter(x => x.edge.kind === 'ski');
      if (!W.edge && ex.length === 1) { W.edge = ex[0].edge.id; W.dir = 1; W.s = 0; W.node = null; this.junction = null; W.v = Math.max(W.v, 150); }
      const n = this.rails.nodes[e.b]; if (n && n.onLand) this.startBeat(n.onLand);
    }
  }

  /* ---------------- triggers and waves ---------------- */
  trigOk(tr) {
    if (this.o.echo) return false;
    const k = this.st.area + ':' + tr.id;
    if (tr.once !== false && this.st.flags['trig:' + k]) return false;
    if (tr.cond && !tr.cond(this)) return false;
    if (tr.flag && !this.st.flags[tr.flag]) return false;
    if (tr.notFlag && this.st.flags[tr.notFlag]) return false;
    return true;
  }
  fireTrigger(tr) {
    const k = this.st.area + ':' + tr.id;
    if (tr.once !== false) this.st.flags['trig:' + k] = 1;
    if (tr.wave) this.startWave(tr.wave);
    if (tr.beat) this.startBeat(tr.beat);
    if (tr.set) this.st.flags[tr.set] = 1;
    if (tr.tut) this.tut(tr.tut);
  }
  checkEdgeTriggers(e) {
    const W = this.W, u = W.s / e.length;
    for (const tr of this.areaDef.triggers || []) {
      if (tr.edge !== e.id) continue;
      const s = tr.s !== undefined ? tr.s : .5;
      if ((W.dir > 0 ? u >= s : u <= s) && this.trigOk(tr)) this.fireTrigger(tr);
    }
  }
  startWave(id) {
    const A = this.areaDef, w = A.waves && A.waves[id]; if (!w) return;
    const key = this.st.area + ':' + id;
    if (this.st.waves[key] === 'done' && !w.repeat) return;
    if (this.wave[id]) return;
    this.wave[id] = { id, t: 0, def: w, spawned: 0, list: [], queue: w.spawn.map(s => ({ type: s[0], at: s[1], delay: s[2] || 0, o: s[3] || {} })) };
    this.st.waves[key] = 'live';
    this.emit('wave', { id });
  }
  updateWaves(dt) {
    for (const id in this.wave) {
      const w = this.wave[id];
      w.t += dt * T.spawnRate;
      const alive = this.enemies.filter(e => e.alive && e.wave === id).length;
      for (const q of w.queue) {
        if (q.done || q.delay > w.t) continue;
        if (alive >= 10) break;
        q.done = true;
        const sp = this.areaDef.spawns[q.at];
        if (!sp) continue;
        this.spawnEnemy(q.type, sp, Object.assign({ wave: id }, q.o));
      }
      const pending = w.queue.some(q => !q.done);
      const live = this.enemies.some(e => e.alive && e.wave === id);
      const until = w.def.until || 'clear';
      if (!pending && (until === 'clear' ? !live : w.t >= until)) {
        delete this.wave[id];
        this.st.waves[this.st.area + ':' + id] = 'done';
        this.emit('waveclear', { id });
        if (w.def.onClear) this.startBeat(w.def.onClear);
        if (w.def.set) this.st.flags[w.def.set] = 1;
      }
    }
  }
  /** someone laughing nearby (within 40 m): Room 7 doors and exits stay shut */
  anyAlive(r = 40) { const h = this.hero; return this.enemies.some(e => e.alive && !e.passive && (!h || V.dist2([e.x, e.y], [h.x, h.y]) < r * M)); }

  /* ---------------- the camera ---------------- */
  updateCamera(dt) {
    const C = this.cam, W = this.W, h = this.hero;
    C.prev = C.pose;
    let pose;
    if (this.camOverride) { this.camOverride.t += dt; pose = C.poseOverride(this.camOverride, this.camOverride.t); if (this.camOverride.dur && this.camOverride.t >= this.camOverride.dur) this.camOverride = null; }
    else if (this.areaDef.camera && this.areaDef.camera(this, h)) pose = this.areaDef.camera(this, h);
    else if (W.edge || W.lastEdge) {
      const e = this.rails.edges[W.edge || W.lastEdge];
      if (e) {
        const s = W.edge ? W.s : (e.a === W.node ? 0 : e.length), dir = W.edge ? W.dir : (e.b === W.node ? 1 : -1);
        pose = C.railPose(e, s, dir, { x: h.x, y: h.y, z: h.z, yaw: W.air ? h.yaw : W.yaw }, dt);
      }
    }
    if (!pose) {   // standing on a node with no edge walked yet: a shot of the first exit's start, reversed
      const ex = this.rails.exits(W.node || this.st.node);
      if (ex.length) { const x = ex[0]; pose = C.railPose(x.edge, x.dir > 0 ? 0 : x.edge.length, x.dir, { x: h.x, y: h.y, z: h.z, yaw: W.yaw }, dt); }
      else pose = C._aim([h.x - 40, h.y - 40, h.z + 40], [h.x, h.y, h.z + 16], 55);
    }
    // aim: blend to the eye over 0.15 s
    const a = this.aim;
    a.k = E.approach(a.k, a.on ? 1 : 0, dt / .15);
    if (a.k > 0) {
      const ep = this.eye(), sway = this.swayOffset();
      const eyePose = { x: ep[0], y: ep[1], z: ep[2], yaw: a.yaw + sway[0], pitch: a.pitch + a.recoil + sway[1], roll: 0, fov: a.scope ? 18 : 62 };
      const k = S7.ease.inOut(a.k);
      if (k >= 1) pose = eyePose;
      else pose = { x: lerp(pose.x, eyePose.x, k), y: lerp(pose.y, eyePose.y, k), z: lerp(pose.z, eyePose.z, k), yaw: pose.yaw + S7.angDiff(pose.yaw, eyePose.yaw) * k, pitch: lerp(pose.pitch, eyePose.pitch, k), roll: 0, fov: lerp(pose.fov, eyePose.fov, k) };
    }
    C.pose = pose;
  }

  /* ---------------- persona helpers ---------------- */
  personaDef(id) { return S7.PERSONAS[id || this.st.persona]; }
  pstate(id) { return this.st.roster[id || this.st.persona]; }
  stats(id) { return this.pstate(id).stats; }
  maxHp(id) { return this.personaDef(id).hp; }
  weaponDef(id) { return S7.WEAPONS[this.personaDef(id).weapon]; }

  /* ---------------- tutorials (one-shot tips, cleared by doing the thing) ---------------- */
  tut(id, done) {
    const st = this.st; if (!st || this.o.attract) return;
    if (done) { if (this.tutorial && this.tutorial.id === id) this.tutorial = null; st.tut[id] = 2; return; }
    if (st.tut[id]) return;
    st.tut[id] = 1; this.tutorial = { id, t: 0 }; this.emit('tutorial', { id });
  }
}
S7.Sim = Sim;
