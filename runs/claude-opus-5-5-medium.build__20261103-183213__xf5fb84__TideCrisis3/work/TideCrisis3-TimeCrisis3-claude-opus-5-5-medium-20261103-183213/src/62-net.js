// 62-net: AI Hub Session Protocol v1, shared-world co-op for 1-4 players. Our own card (the stage, the players in
// their colours with READY ticks, the goal, this device's controls, the countdown; Enter or Cross answers ready,
// Triangle or M asks for more time), the 3-2-1 start on the hub's clock, a host-authoritative Sim (the host steps the
// world with every player's commands; clients send their input and presses), snapshots (10/s, unreliable, kept under
// 1,100 bytes) and event batches (reliable, at most 8/s) down to replicas, which predict their own cover and aim,
// a server copy with no player of its own, players leaving, time-up, finish() with standings, scores, stats and
// awards, and the end of the round. Network only through AIHub.send; names drawn only on the canvas.
// Reads: Session (60), Sim (20), HUD (50).

const ST_CODES = ['enter', 'hide', 'peek', 'aim', 'fire', 'move', 'run', 'sprint', 'wind', 'slash', 'back', 'walk', 'dead', 'ride', 'route', 'fly'];
const PH_CODES = ['boot', 'cut', 'travel', 'action', 'clear', 'results', 'done', 'gameover'];
const EN_TYPES = () => Object.keys(TC.REG.enemy);
const PR_KINDS = ['grenade', 'rocket', 'harpoon', 'torpedo', 'missile', 'flare', 'pgl', 'debris'];
const TH_KINDS = ['shot', 'elite', 'sniper', 'grenade', 'rocket', 'harpoon', 'torpedo', 'missile', 'flare', 'slash', 'sweep', 'turret', 'strafe', 'claw', 'slam'];
const BOSS_F = ['x', 'y', 'z', 'yaw', 'roll', 'phase', 'bx', 'by', 'bz', 'duck', 'mode', 'shield', 'shieldDown', 'laser', 'up', 'final', 'topple', 'toppled', 'hatch', 'charge', 'crash', 'bank', 'gait', 'flip', 'swing', 'u', 'open', 'atk', 'defeated', 'intro', 'outT', 'pi'];
const EV_KEEP = new Set(['hit', 'kill', 'explode', 'say', 'threat', 'blocked', 'hurt', 'pickup', 'extend', 'timeup', 'clear', 'scene', 'action', 'boss', 'bossdown', 'break', 'fireworks', 'splash', 'finalshot', 'surge', 'shotdown', 'bosshit', 'eshot', 'extra', 'headshot', 'points', 'civhit', 'intel', 'stageclear', 'partbreak', 'spinup', 'slash', 'coverhit', 'coverswap', 'fx', 'door', 'smoke', 'shot', 'impact', 'proj']);
const r1 = v => Math.round(v * 10) / 10, r0 = Math.round;

const Net = {
  hub: null, info: null, state: 'connecting', card: null, startIn: 0, endReason: null, me: 0, myIdx: 0, server: false, host: false,
  session: null, remote: {}, inbox: [], sendT: 0, evT: 0, inT: 0, prT: 0, evq: [], presses: [], tokens: 18, lastTok: 0, finished: false, snap: null, msgs: 0, bytesMax: 0,
  // ---------------------------------------------------------------- connect (a boot step)
  async boot(game, hub = (typeof window !== 'undefined' ? window.AIHub : null)) {
    this.hub = hub; this.game = game;
    const info = await hub.connect({ mode: 'shared-world', seats: [1, 4], card: true });
    if (!info) { this.hub = null; return; }
    this.info = info; this.me = info.me; this.server = !!info.server; this.host = !!info.isHost;
    this.round = info.round || 1; this.stage = ((this.round - 1) % 3) + 1;
    this.players = info.players.map((p, i) => ({ id: p.id, name: p.name, color: p.color, agent: TC.AGENTS[i % 4] }));
    this.myIdx = this.players.findIndex(p => p.id === this.me);
    hub.on('card', c => { this.card = c; });
    hub.on('start', s => { this.state = 'count'; this.startIn = s && s.in; });
    hub.on('message', (d, from) => this.onMessage(d, from));
    hub.on('leave', e => this.onLeave(e));
    hub.on('time-up', () => this.onTimeUp());
    hub.on('end', e => this.onEnd(e));
    this.state = 'card';
    this.build(game);
    hub.ready();
  },
  build(game) {
    const seed = Math.floor((this.hub.rng ? this.hub.rng('world')() : .5) * 1e6);
    const ps = this.players.map((p, i) => ({ input: !this.server && i === this.myIdx ? game.input : null, name: p.name, color: p.color, agent: p.agent }));
    this.session = new Session(game, { mode: this.host ? 'host' : 'replica', simMode: this.host ? 'host' : 'replica', stages: [this.stage], stage: this.stage, players: ps, seed, skipCuts: true, hub: true });
    this.session.localIndex = Math.max(0, this.myIdx);
    for (const h of this.session.huds) h.noPrompts = false;
    if (this.host) { this.session.remote = i => this.remoteCmd(i); this.session.onEvent = e => { if (EV_KEEP.has(e.type)) this.evq.push(e); }; }
  },
  // ---------------------------------------------------------------- messages
  send(data, reliable = true) {
    if (this.tokens < 1) return false; this.tokens--;
    this.msgs++; const n = JSON.stringify(data).length; if (!reliable) this.bytesMax = Math.max(this.bytesMax, n);
    return this.hub.send(data, { reliable });
  },
  onMessage(d, from) {
    if (!d || this.state === 'over') return;
    if (this.host) {
      const i = this.players.findIndex(p => p.id === from); if (i < 0) return;
      const R = this.remote[i] || (this.remote[i] = { aim: [0, 0], cover: false, fire: false, q: [] });
      if (d.t === 'in') { R.aim = [d.a[0] / 1000, d.a[1] / 1000]; R.cover = !!d.c; R.fire = !!d.f; }
      if (d.t === 'pr') for (const k of d.k) R.q.push(k);
    } else {
      if (d.t === 's') { if (!this.snap || d.n > this.snap.n) this.snap = d; }
      if (d.t === 'ev') for (const e of d.e) this.inbox.push(e);
      if (d.t === 'over') this.finishedAt = true;
    }
  },
  remoteCmd(i) {
    const R = this.remote[i] || { aim: [0, 0], cover: false, fire: false, q: [] }, has = k => { const j = R.q.indexOf(k); if (j < 0) return false; R.q.splice(j, 1); return true; };
    const sel = has('w1') ? 1 : has('w2') ? 2 : has('w3') ? 3 : has('w4') ? 4 : 0;
    return { aim: R.aim, fireDown: R.fire, fireP: has('fire'), cover: R.cover, next: has('next'), prev: has('prev'), sel, reload: has('reload'), advance: has('advance'), skip: false, autoFire: true };
  },
  onLeave(e) {
    const i = this.players.findIndex(p => p.id === e.id); if (i < 0 || !this.session) return;
    const p = this.session.sim.players[i]; if (p) { p.left = true; p.out = false; }
    if (this.host && this.session.sim.players.every(q => q.left)) this.finish();
  },
  onTimeUp() { if (this.host) this.finish(); },
  onEnd(e) {
    this.state = 'over'; this.endReason = e && e.reason;
    const g = this.game; g.input.clear(); if (g.audio) { g.audio.music && g.audio.music(null); g.audio.mute && g.audio.mute(true); } TC.Amb.stop(); TC.Voice.stopAll(); g.timeScale = 1;
  },
  // ---------------------------------------------------------------- the end of a round (host only, once)
  finish() {
    if (this.finished || !this.host) return; this.finished = true;
    const sim = this.session.sim, ps = sim.players.map((p, i) => ({ id: this.players[i].id, p })).filter(x => !x.p.left || x.p.score > 0);
    const sorted = ps.slice().sort((a, b) => b.p.score - a.p.score), standings = [];
    for (const x of sorted) { const last = standings[standings.length - 1]; if (last && sim.players[this.players.findIndex(q => q.id === last[0])].score === x.p.score) last.push(x.id); else standings.push([x.id]); }
    const scores = {}, stats = {}; for (const x of ps) { const s = x.p.stats; scores[x.id] = x.p.score; stats[x.id] = { Kills: s.kills, Accuracy: (s.shots ? Math.round(s.hits / s.shots * 100) : 0) + '%', Headshots: s.heads, 'Cover saves': s.saves, 'Lives lost': s.livesLost }; }
    const best = (f) => ps.slice().sort((a, b) => f(b.p) - f(a.p))[0];
    const awards = ps.length ? [{ id: best(p => p.stats.shots ? p.stats.hits / p.stats.shots : 0).id, title: 'Sharpshooter', detail: 'Best accuracy' }, { id: best(p => p.stats.kills).id, title: 'Pointman', detail: 'Most kills' }, { id: best(p => p.stats.saves).id, title: 'Iron Wall', detail: 'Most cover saves' }] : [];
    const won = !!(sim.boss && sim.boss.defeated) || sim.phase === 'results';
    this.hub.finish({ standings, scores, won, stats, awards });
    this.send({ t: 'over', won }, true);
  },
  // ---------------------------------------------------------------- snapshots
  encode(sim) {
    const types = EN_TYPES(), out = { t: 's', n: this.sn = (this.sn || 0) + 1, at: r0(this.hub.time()), ph: PH_CODES.indexOf(sim.phase), sc: sim.sceneIdx, tm: r1(sim.timer), td: r0(sim.travelD), cd: sim.carrier ? r0(sim.carrier.d) : 0, wa: r1(sim.water), sl: sim.slow ? 1 : 0 };
    out.p = sim.players.map(p => [p.score, p.lives, p.chain, TC.WEAPONS.indexOf(p.w), p.w === 'hg' ? p.mag : p.ammo[p.w], r0(p.c * 100), p.out ? r1(p.cont) : -1, p.left ? 1 : 0, r0(p.aim[0] * 100), r0(p.aim[1] * 100)]);
    const cam = sim.cameraFor(0), alive = sim.enemies.filter(e => !e.dead || e.deadT < 2.6).sort((a, b) => Math.hypot(a.x - cam.x, a.y - cam.y) - Math.hypot(b.x - cam.x, b.y - cam.y)).slice(0, 12);
    out.e = alive.map(e => [e.id, types.indexOf(e.type), r0(e.x), r0(e.y), r0(e.z), r0(e.facing * 100), Math.max(0, ST_CODES.indexOf(e.state)), r0(e.up * 10), r0(e.sinkNow), e.lookI, (e.dead ? 1 : 0) | (e.point ? 2 : 0) | (e.run ? 4 : 0) | (e.air ? 8 : 0) | (e.climb ? 16 : 0) | (e.hurtT > 0 ? 32 : 0) | (e.shieldDown > 0 ? 64 : 0) | (e.flashT > 0 ? 128 : 0), r1(e.deadT), r1(e.side), e.ski ? r0(e.ski.yaw * 100) : null, e.death ? e.death[0] : '', e.cover ? e.cover.h : 0, e.size === 1 ? undefined : e.size]);
    out.pr = sim.projectiles.filter(p => p.team !== 'fx').slice(0, 8).map(p => [p.id, PR_KINDS.indexOf(p.kind), r0(p.pos[0]), r0(p.pos[1]), r0(p.pos[2]), r0(p.vel[0]), r0(p.vel[1]), r0(p.vel[2])]);
    out.th = sim.threats.filter(t => !t.done).slice(0, 6).map(t => [t.id, t.target, r0(t.left * 100), r0(t.dur * 100), TH_KINDS.indexOf(t.kind), t.at ? r0(t.at[0]) : 0, t.at ? r0(t.at[1]) : 0, t.at ? r0(t.at[2]) : 0, t.unblockable ? 1 : 0]);
    out.od = sim.objects.filter(o => o.dead).map(o => o.id);
    const B = sim.boss; if (B) { const f = {}; for (const k of BOSS_F) if (B[k] !== undefined && B[k] !== null) f[k] = typeof B[k] === 'number' ? r1(B[k]) : B[k]; out.b = { id: B.id, f, p: B.parts.map(p => [r1(p.hp), (p.alive ? 1 : 0) | (p.hidden ? 2 : 0) | (p.armor ? 4 : 0) | (p.flashT > 0 ? 8 : 0), p.pos ? r0(p.pos[0]) : 0, p.pos ? r0(p.pos[1]) : 0, p.pos ? r0(p.pos[2]) : 0]) }; }
    if (sim.flags.passing) out.ps = sim.flags.passing.map(r0);
    // keep it under the budget: drop the farthest enemies first
    let s = JSON.stringify(out); while (s.length > 1100 && out.e.length) { out.e.pop(); s = JSON.stringify(out); }
    while (s.length > 1100 && out.pr.length) { out.pr.pop(); s = JSON.stringify(out); }
    return out;
  },
  apply(sim, S) {
    if (S.sc !== sim.sceneIdx && S.sc >= 0) { sim.enemies = []; sim.objects = []; sim.projectiles = []; sim.boss = null; sim.startScene(S.sc); }
    sim.phase = PH_CODES[S.ph] || sim.phase; sim.timer = S.tm; sim.travelD = S.td; if (sim.carrier) { sim.carrier.d = S.cd; sim._carrierUpdate(0); } sim.water = S.wa; sim.slow = !!S.sl;
    S.p.forEach((q, i) => { const p = sim.players[i]; if (!p) return; p.score = q[0]; p.lives = q[1]; p.chain = q[2]; p.w = TC.WEAPONS[q[3]] || 'hg'; if (p.w === 'hg') p.mag = q[4]; else { p.ammo[p.w] = q[4]; p.owned[p.w] = true; } p.out = q[6] >= 0; p.cont = Math.max(0, q[6]); p.left = !!q[7]; if (i !== this.myIdx) { p.c = q[5] / 100; p.aim = [q[8] / 100, q[9] / 100]; } });
    const types = EN_TYPES(), seen = new Set();
    for (const q of S.e) {
      seen.add(q[0]); let e = sim.enemies.find(x => x.id === q[0]);
      if (!e) { const A = get('enemy', types[q[1]]); e = { id: q[0], type: types[q[1]], A, look: A.looks ? A.looks[q[9]] || A.looks[0] : null, lookI: q[9], size: q[16] || 1, o: {}, vel: [0, 0, 0], x: q[2], y: q[3], z: q[4], cover: null, replica: true }; sim.enemies.push(e); }
      e.tx = q[2]; e.ty = q[3]; e.tz = q[4]; e.facing = q[5] / 100; e.state = ST_CODES[q[6]]; e.up = q[7] / 10; e.sinkNow = q[8];
      const f = q[10]; e.dead = !!(f & 1); e.point = !!(f & 2); e.run = f & 4 ? 1 : 0; e.air = !!(f & 8); e.climb = !!(f & 16); e.hurtT = f & 32 ? .1 : 0; e.shieldDown = f & 64 ? .5 : 0; e.flashT = f & 128 ? .06 : 0; e.deadT = q[11]; e.side = q[12];
      e.ski = q[13] !== null && q[13] !== undefined ? { yaw: q[13] / 100 } : null; e.death = { c: 'crumple', f: 'flyback', s: 'spin', h: 'head', d: 'drop', p: 'splash' }[q[14]] || (e.dead ? 'crumple' : null);
      if (q[15]) e.cover = { h: q[15], at: [e.x, e.y, e.z], peek: ['up'], ledge: false };
      if (e.target === undefined) e.target = 0;
      TC.updateVols(sim, e);
    }
    sim.enemies = sim.enemies.filter(e => seen.has(e.id));
    sim.projectiles = S.pr.map(q => ({ id: q[0], kind: PR_KINDS[q[1]], pos: [q[2], q[3], q[4]], vel: [q[5], q[6], q[7]], team: 'enemy', shootable: q[1] !== 6, r: 5, t: 0 }));
    sim.threats = S.th.map(q => ({ id: q[0], target: q[1], left: q[2] / 100, dur: q[3] / 100, kind: TH_KINDS[q[4]], at: [q[5], q[6], q[7]], done: false, unblockable: !!q[8] }));
    for (const o of sim.objects) o.dead = S.od.includes(o.id);
    if (S.b) {
      let B = sim.boss; const D = get('boss', S.b.id);
      if (!B || B.id !== S.b.id) { const sc = sim.scene; B = sim.boss = { id: S.b.id, D, parts: Object.keys(D.parts).map(k => Object.assign({ id: k, r: 8 }, D.parts[k], { pos: null })), t: 0, home: sc.bossAt || sc.scyllaAt || sc.seawolf, leverAt: sc.krake ? sc.krake.lever : null, drums: [], replica: true }; B.part = k => B.parts.find(p => p.id === k); }
      Object.assign(B, S.b.f); S.b.p.forEach((q, k) => { const p = B.parts[k]; if (!p) return; p.hp = q[0]; p.alive = !!(q[1] & 1); p.hidden = !!(q[1] & 2); p.armor = !!(q[1] & 4); p.flashT = q[1] & 8 ? .06 : 0; p.pos = [q[2], q[3], q[4]]; });
    } else sim.boss = null;
    sim.flags.passing = S.ps || (sim.scene && sim.scene.id === '2-3' && sim.flags.passing !== undefined ? null : sim.flags.passing);
  },
  // ---------------------------------------------------------------- the per-step work
  update(dt) {
    const s = this.session, sim = s.sim, g = this.game, I = g.input;
    this.tokens = Math.min(18, this.tokens + dt * 18);   // the rate limit: a token bucket of 18 messages a second
    if (this.state === 'over') return;
    if (this.state === 'card') {
      if (!this.server) { if (I.pressed('confirm') || I.pressed('start') || (I.clicked && I.clicked())) this.hub.answer('ready'); if (I.pressed('more')) this.hub.answer('more'); }
      return;
    }
    if (this.state === 'count') { if (this.hub.time() >= 0) { this.state = 'play'; s.huds.forEach(h => h.action = 1.2); } return; }
    // play
    if (this.host) {
      s.update(dt);
      this.sendT += dt; this.evT += dt;
      if (this.sendT >= .1) { this.sendT = 0; this.send(this.encode(sim), false); }
      if (this.evT >= .125 && this.evq.length) { this.evT = 0; const batch = this.evq.splice(0, 40).map(e => this.compactEv(e)); this.send({ t: 'ev', e: batch }, true); }
      if (sim.phase === 'results' || sim.phase === 'done' || sim.phase === 'gameover') this.finish();
    } else {
      // the replica: the host's world, our own cover and aim at once
      if (this.snap) { this.apply(sim, this.snap); this.snap = null; }
      const evs = this.inbox.splice(0).filter(e => !(e.type === 'shot' && e.p === this.myIdx));
      for (const e of sim.enemies) if (e.tx !== undefined) { const k = Math.min(1, dt * 12); e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; e.z += (e.tz - e.z) * k; }
      for (const t of sim.threats) t.left -= dt;
      for (const p of sim.projectiles) for (let k = 0; k < 3; k++) p.pos[k] += p.vel[k] * dt;
      const i = this.myIdx, A = s.aimers[i];
      if (A && !sim.players[i].out) {
        const vp = s.vps[0], cmd = A.build(dt, sim, vp, TC.assistTargets(sim, i), g.settings || {}), p = sim.players[i];
        p.aim = cmd.aim; const want = sim.phase === 'action' && cmd.cover; p.c = approach(p.c, want ? 1 : 0, dt / (want ? tune.player.coverIn : tune.player.coverOut));
        this.inT += dt; if (this.inT >= 1 / 15) { this.inT = 0; this.send({ t: 'in', a: [r0(cmd.aim[0] * 1000), r0(cmd.aim[1] * 1000)], c: cmd.cover ? 1 : 0, f: cmd.fireDown ? 1 : 0 }, false); }
        for (const k of ['fire', 'next', 'prev', 'reload', 'w1', 'w2', 'w3', 'w4']) if (k === 'fire' ? cmd.fireP : I.pressed(k)) this.presses.push(k);
        if (cmd.advance) this.presses.push('advance');
        if (cmd.fireP && p.c < .2) evs.push({ type: 'shot', p: i, w: p.w, aim: cmd.aim.slice() });
        this.prT += dt; if (this.presses.length && this.prT >= .3) { this.prT = 0; this.send({ t: 'pr', k: this.presses.splice(0, 12) }, true); }
      }
      s.handle(evs); s.view.updateRigs(sim, dt); FX.step(dt); for (const h of s.huds) h.step(dt); s.musicByPhase();
      g.timeScale = 1;
    }
  },
  compactEv(e) { const o = {}; for (const k in e) { const v = e[k]; if (k === 't') continue; o[k] = Array.isArray(v) ? v.map(x => typeof x === 'number' ? r0(x) : x) : typeof v === 'number' ? r1(v) : v; } return o; },
  // ---------------------------------------------------------------- drawing: the card, the countdown, the status screen, the end
  draw(r) {
    const g0 = this.game, s = this.session;
    if (this.state === 'play' || this.state === 'count' || (this.state === 'over' && s)) { if (!this.server) s.draw(r); }
    r.overlay(g => {
      if (this.state === 'connecting') { frame(g, r, 'TIDE CRISIS 3', g0.time); T(g, 'CONNECTING TO THE HUB…', r.W / 2, r.H / 2, '#ffffff', { align: 'center' }); return; }
      if (this.state === 'card') return this.drawCard(g, r);
      if (this.server && this.state !== 'over') { const sim = s.sim; frame(g, r, 'TIDE CRISIS 3', g0.time); T(g, 'HOSTING · ' + sim.players.filter(p => !p.left).length + ' AGENTS · AREA ' + (sim.sceneId || '-'), r.W / 2, r.H / 2 - 10, UI.gold, { align: 'center', scale: 1 }); T(g, 'TIME ' + Math.max(0, sim.timer).toFixed(1) + '  ·  ' + sim.phase.toUpperCase(), r.W / 2, r.H / 2 + 6, '#ffffff', { align: 'center' }); sim.players.forEach((p, k) => T(g, this.players[k].name.slice(0, 14) + '  ' + p.score, r.W / 2, r.H / 2 + 24 + k * 10, p.color, { align: 'center' })); }
      if (this.state === 'count') { const t = this.hub.time(), n = Math.ceil(-t / 1000); if (n > 0 && n <= 3) E.font.title(g, String(n), r.W / 2, r.H * .38, { scale: 6, colors: ['#ffffff', '#ffd36a', '#ff5a2a'], outline: '#000', align: 'center' }); }
      if (this.state === 'over') { E.px.blend(g, .6, 'multiply', () => E.px.rect(g, 0, 0, r.W, r.H, '#101830')); const msg = this.endReason === 'host-left' ? 'HOST LEFT — ROUND VOID' : this.endReason === 'sat-out' ? 'YOU SAT THIS ONE OUT' : 'ROUND OVER'; E.font.title(g, msg, r.W / 2, r.H * .42, { scale: 2, colors: ['#ffffff', '#9fe3ff'], outline: '#000', align: 'center' }); }
    });
  },
  drawCard(g, r) {
    const st = get('stage', this.stage), c = this.card || {}, t = this.game.time;
    frame(g, r, null, t); logo(g, r, 6, t, 2);
    T(g, 'STAGE ' + st.id + ' · ' + st.name, r.W / 2, 32, UI.gold, { align: 'center', scale: 1 });
    const mw = Math.min(170, r.W * .4); islesMap(g, 10, 46, mw, mw * .6, st.id, t);
    T(g, 'GOAL', mw + 22, 48, UI.gold); E.font.wrap('Clear the stage together and beat the boss. Most points wins.', r.W - mw - 34).forEach((l, k) => T(g, l, mw + 22, 58 + k * 9, '#ffffff'));
    const I = this.game.input, L = a => TC.label(I, a);
    T(g, 'CONTROLS', mw + 22, 86, UI.gold);
    [I.lastDevice === 'gamepad' ? 'Aim: stick' : 'Aim: mouse', 'Fire: ' + L('fire'), 'Cover + reload: hold ' + L('cover'), 'Switch: ' + L('prev') + ' / ' + L('next')].forEach((l, k) => T(g, l, mw + 22, 96 + k * 9, '#cfe0ff'));
    const ready = c.ready || [];
    this.players.forEach((p, k) => { const x = 10 + k * ((r.W - 20) / 4), y = 150, w = (r.W - 20) / 4 - 6; E.ui.box(g, x, y, w, 36, { bg: ['#10244a', '#081428'], border: p.color }); const rig = TC.portrait(p.agent); if (rig) rig.drawPortrait(g, x + 3, y + 3, 30, { zoom: 2, turn: .5, bg: '#0a1426', frame: false }); T(g, p.name.slice(0, 10), x + 36, y + 6, p.color); T(g, ready.includes(p.id) ? 'READY ✓' : '…', x + 36, y + 18, ready.includes(p.id) ? '#8aff8a' : UI.dim, { font: 'tiny' }); });
    const left = c.left === null || c.left === undefined ? (c.starting ? 'STARTING' : c.paused ? 'PAUSED' : '') : Math.ceil(c.left / 1000) + ' s';
    T(g, left, r.W / 2, 196, '#ffffff', { align: 'center', scale: 2 });
    if (!this.server) T(g, '[' + L('confirm') + '] READY    [' + L('more') + '] ' + (c.asked ? 'TAKE BACK MORE TIME' : 'MORE TIME') + (c.asking ? '  (' + c.asking + ' asking)' : ''), r.W / 2, r.H - 12, '#cfe0ff', { align: 'center' });
  }
};
TC.Net = Net;
TC.netBoot = game => Net.boot(game).catch(err => { if (window.AIHub && window.AIHub.fail) window.AIHub.fail(String(err && err.message || err)); }).then(() => { Net.booted = true; });
TC.netScenes = game => ({ session: { camera: { zoom: false }, touch: [], pausable: false,
  enter() { if (!Net.hub && !HUB) game.go('title'); },
  update(dt) { if (Net.booted && !Net.hub) { game.go('title'); return; } if (Net.session || Net.state === 'over') Net.update(dt); },
  draw(r) { Net.draw(r); } } });
