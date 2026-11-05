// ---------------------------------------------------------------- AI Hub sessions (Session Protocol v1, shared-world): the host runs the world, clients mirror it
// Code tables live here only.
const KCODE = ['goon', 'clapbot', 'popper', 'mime', 'disco', 'heckler', 'hecklerKing', 'tank', 'snake', 'seg', 'brute', 'crate', 'lock', 'paparazzi'];
const BCODE = ['orb', 'shard', 'beam', 'tomato', 'shell', 'butter', 'gravy', 'coin', 'card', 'static', 'tot', 'bolt', 'kernel', 'rocket', 'bag'];
const PCODE = ['bill', 'stack', 'gold', 'case', 'prize', 'key', 'cap', 'bomb', 'life', 'statue'];
const WCODE = ['blaster', 'spread', 'rockets', 'popcorn', 'laser', 'records', 'shield', 'speed'];
const SCODE = ['play', 'walkin', 'dead', 'drop', 'out', 'gone'];
const ECODE = ['die', 'boom', 'pop', 'splat', 'hurt', 'death', 'cash', 'prize', 'keySession', 'powerup', 'bomb', 'showboat', 'clear', 'exits', 'wave', 'prime', 'primeEnd', 'stunt', 'bossIntro', 'bossDie', 'bossBurst', 'partDown', 'armOff', 'mashyArms', 'mashyMad', 'crash', 'roar', 'respawn', 'keyDrop', 'exitChosen', 'hurry', 'multi', 'mash', 'crate', 'spawn'];
const STCODE = ['move', 'fuse', 'tele', 'flare', 'aim', 'rear', 'lunge', 'stun', 'charge', 'burst'];
const q = v => Math.round(v);
MT.net = {
  hub: null, active: false, info: null, role: null, me: null, ended: false, endReason: null, left: null, card: null, started: false,
  snaps: [], lastSnap: null, seenSeq: 0, sendT: 0, ceQ: [], ceT: 0, roomSeq: 0, over: null, finished: false, finishAt: null, remote: {}, standings: null,
  isHostSim(c) { return !this.active || this.role === 'host' && c.ctl === 'local' || this.role === 'client' && c.ctl === 'local'; },
  time() { return this.hub && this.hub.time ? this.hub.time() : 0; },
  async connect() {
    this.hub = this.hub || (typeof window !== 'undefined' ? window.AIHub : null);
    if (!this.hub || !this.hub.active) return null;
    let info = null; try { info = await this.hub.connect({ mode: 'shared-world', seats: [1, 4], card: true }); } catch (e) { info = null; }
    if (!info) return null;
    this.active = true; this.info = info; this.me = info.me;
    this.role = info.server ? 'server' : info.isHost ? 'host' : 'client';
    const H = this.hub;
    H.on('card', c => { this.card = c; });
    H.on('start', s => { this.started = true; this.startIn = s && s.in; });
    H.on('message', (d, from) => this.onMessage(d, from));
    H.on('leave', e => this.onLeave(e));
    H.on('time-up', () => this.onTimeUp());
    H.on('end', e => this.onEnd(e));
    return info;
  },
  // ---------------- the round's world
  buildRun() {
    const info = this.info, me = info.me, g = MT.game;
    const players = info.players.map((p, i) => ({ slot: i, id: p.id, look: i % 4, name: MT.safeName(p.name), color: p.color || MT.COLORS.p[i % 4],
      input: p.id === me ? g.input : null, ctl: p.id === me ? 'local' : this.role === 'client' ? 'mirror' : 'remote' }));
    const run = MT.newRun({ mode: 'session', diff: 'CONTESTANT', seed: (info.seed >>> 0) || 7, players });
    run.contestants.forEach((c, i) => { c.id = players[i].id; c.named = true; });
    return run;
  },
  startPlay() {
    this.buildRun();
    if (this.role === 'client') { this.mirror('L1', 'S'); }
    else { MT.Show.onRoomDone = W => this.hostRoomDone(W); MT.Show.begin('L1', 'S', { noCard: true }); this.sendRoom(); }
  },
  hostRoomDone(W) {
    if (W.result === 'exit') { MT.Show.begin(W.exitDest, AR.opposite[W.exitDir], { static: true, noCard: true }); this.sendRoom(); return true; }
    if (W.result === 'boss' || W.result === 'end') { if (!this.finishAt) this.finishAt = MT.game.real + .1; MT.Show.state = 'idle'; return true; }
    return false;
  },
  sendRoom() { const W = MT.Show.W; this.roomSeq++; this.send({ t: 'room', rm: this.roomSeq, id: W.room.id, entry: W.entry }, true); },
  send(d, reliable) { if (this.ended || !this.hub) return false; try { return this.hub.send(d, { reliable: !!reliable }); } catch (e) { return false; } },
  // ---------------- host: snapshots, remote contestants, client events
  snapshot() {
    const W = MT.Show.W, R = W.ratings, run = MT.run;
    let dr = 0; ['N', 'E', 'S', 'W'].forEach((d, i) => { const s = W.arena.doors[d].state; dr |= (s === 'exit' ? 3 : s === 'open' || s === 'opening' ? 1 : s === 'closing' ? 2 : 0) << (i * 2); });
    const P = W.contestants.map(c => [c.id, q(c.x), q(c.y), q(c.aim * 100), (c.firing ? 1 : 0) | (c.slideT > 0 ? 2 : 0) | (c.boat > 0 ? 4 : 0) | (c.invuln > 0 ? 8 : 0), WCODE.indexOf(c.wpn), q(c.wpnT), c.hp, c.lives, q(c.cash), c.bombs, c.kills, SCODE.indexOf(c.state), q(c.z), c.addons.records > 0 ? 1 : 0, c.addons.shield > 0 ? 1 : 0]);
    const Ev = W.enemies.slice(0, 160).map(e => [e.id, KCODE.indexOf(e.kind), q(e.x), q(e.y), q((e.face || 0) * 10), Math.max(0, STCODE.indexOf(e.state)), q(e.hp / e.max * 99), q(e.z || 0), e.big ? 1 : 0, e.entering ? 1 : 0, q((e.t || 0) * 10), e.i || 0, e.flash > 0 ? 1 : 0]);
    const Bv = W.fShots.list.slice(0, 220).map(b => b.grav ? [b.id, BCODE.indexOf(b.kind), q(b.x), q(b.y), q(b.vx), q(b.vy), q(b.z), q(b.vz), q(b.tx), q(b.ty)] : [b.id, BCODE.indexOf(b.kind), q(b.x), q(b.y), q(b.vx), q(b.vy)]);
    const K = W.pickups.slice(0, 40).map(p => [p.id, PCODE.indexOf(p.kind), q(p.x), q(p.y), q(p.z), p.w ? WCODE.indexOf(p.w) : -1, p.ttl === Infinity ? 99 : q(p.ttl)]);
    const V = W.events.filter(e => ECODE.includes(e.name) && e.seq > (this.ringFloor || 0)).slice(-24).map(e => [e.seq, ECODE.indexOf(e.name), e.data]);
    return { t: 's', a: q(this.time()), n: ++this.snapN, rm: this.roomSeq, ph: W.phase, dr, R: q(R.R * 10), X: R.X, pm: q(R.prime * 10), wv: W.waveIdx, wt: W.wavesTotal, P, E: Ev, B: Bv, K, G: W.boss ? W.boss.toNet() : 0, V };
  },
  snapN: 0,
  hostStep(dt) {
    const W = MT.Show.W; if (!W || this.ended) return;
    this.sendT -= dt; if (this.sendT <= 0) { this.sendT = 1 / 15; const s = this.snapshot(); const tCut = W.t - 1.2; this.ringFloor = (W.events.find(e => e.t >= tCut) || { seq: W.seq }).seq - 1; this.send(s, false); this.lastSize = JSON.stringify(s).length; }
    if (this.finishAt && MT.game.real >= this.finishAt + 3) this.finish(true);
    if (MT.Show.W && MT.Show.W.contestants.every(c => c.state === 'gone')) this.finish(false);
  },
  remoteStep(c, dt, W) {
    const n = c.net; if (!n) return;
    const k = 1 - Math.exp(-dt * 14); c.x += (n.x - c.x) * k; c.y += (n.y - c.y) * k; c.aim = n.aim; c.z = n.z || 0;
    c.vx = (n.x - c.x) * 4; c.vy = (n.y - c.y) * 4;
    if (n.state !== undefined && n.state !== c.state && c.state !== 'gone') { c.state = n.state; c.t = 0; }
    c.wpn = n.wpn || 'blaster'; c.slideT = n.flags & 2 ? .1 : 0; c.boat = n.flags & 4 ? .3 : 0; c.invuln = n.flags & 8 ? .2 : 0; c.hp = n.hp; c.addons.records = n.rec ? 1 : 0; c.addons.shield = n.sh ? 1 : 0;
    c.firing = !!(n.flags & 1) && c.state === 'play';
    if (c.firing) { c.facing = c.aim; MT.WEAPONS[c.wpn].fire(c, W, dt); }
    else if (Math.hypot(c.vx, c.vy) > 5) c.facing = Math.atan2(c.vy, c.vx);
    c.pose(dt);
  },
  onMessage(d, from) {
    if (this.ended || !d || typeof d !== 'object') return;
    if (this.role !== 'client') {
      const W = MT.Show.W, c = W && W.contestants.find(c => c.id === from); if (!c) return;
      if (d.t === 'c' && Array.isArray(d.s)) { const s = d.s; if (!c.netA || d.a >= c.netA) { c.netA = d.a; c.net = { x: s[0], y: s[1], aim: s[2] / 100, flags: s[3], wpn: WCODE[s[4]] || 'blaster', hp: s[5], state: SCODE[s[6]] || 'play', z: s[7], rec: s[8], sh: s[9] }; } }
      if (d.t === 'ce' && Array.isArray(d.ev)) for (const ev of d.ev) this.hostEvent(W, c, ev);
      return;
    }
    // client
    if (d.t === 's') { this.snaps.push(d); if (this.snaps.length > 8) this.snaps.shift(); this.lastSnap = d; }
    else if (d.t === 'room') { if (d.rm > (this.mirrorRm || 0)) { this.mirrorRm = d.rm; this.mirror(d.id, d.entry); } }
    else if (d.t === 'over') { this.over = d; }
  },
  hostEvent(W, c, ev) {
    const [k, a, b] = ev;
    if (k === 'claim') { const p = W.pickups.find(p => p.id === a && !p.dead); if (p && Math.hypot(p.x - c.x, p.y - c.y) < 40) W.collect(c, p); }
    else if (k === 'hurt') { W.event('hurt', { slot: c.slot, x: c.x, y: c.y, hp: c.hp, remote: true }); const bl = W.fShots.list.find(x => x.id === b); if (bl) bl.dead = true; }
    else if (k === 'died') { c.cash = Math.max(0, c.cash - 2500); c.deaths++; W.event('death', { slot: c.slot, x: c.x, y: c.y, name: c.name }); }
    else if (k === 'bomb') { const bx = c.x, by = c.y; c.x = a; c.y = b; W.showstopper(c, true); c.x = bx; c.y = by; }
    else if (k === 'boat') { const gn = clamp(+a || 0, 0, 30); W.ratings.gain(gn, W); c.boatGain += gn; W.event('showboat', { slot: c.slot, gain: gn, x: c.x, y: c.y }); }
  },
  onLeave(e) {
    if (this.role === 'client') { const W = MT.W; const c = W && W.contestants.find(c => c.id === e.id); if (c) c.state = 'gone'; return; }
    const W = MT.Show.W, c = W && W.contestants.find(c => c.id === e.id);
    if (c) { c.state = 'gone'; c.firing = false; MT.banner.show(c.name + ' LEFT THE STUDIO', { color: c.color, big: false }); if (MT.game.particles && !MT.game.headless) MT.game.particles.bits(c.x, c.y, 10, 30, [c.color, '#ffcc33']); }
    if (W && W.contestants.every(c => c.state === 'gone')) this.finish(false);
  },
  onTimeUp() { if (this.role !== 'client') this.finish(!!(MT.Show.W && MT.Show.W.room.boss && MT.Show.W.boss && MT.Show.W.boss.dead)); },
  results() {
    const W = MT.Show.W || MT.W, cs = (MT.run ? MT.run.contestants : []).filter(c => c.state !== 'gone');
    const sorted = cs.slice().sort((a, b) => b.cash - a.cash), standings = [];
    for (const c of sorted) { const last = standings[standings.length - 1]; if (last && cs.find(o => o.id === last[0]).cash === c.cash) last.push(c.id); else standings.push([c.id]); }
    const scores = {}, stats = {}; for (const c of cs) { scores[c.id] = Math.round(c.cash); stats[c.id] = { Kills: c.kills, Prizes: c.prizes.length, Deaths: c.deaths }; }
    const best = (f) => cs.slice().sort((a, b) => f(b) - f(a))[0];
    const awards = cs.length ? [{ id: best(c => c.cash).id, title: 'BIGGEST EARNER', detail: MT.money(best(c => c.cash).cash) }, { id: best(c => c.kills).id, title: 'MOST MASHES', detail: best(c => c.kills).kills + ' KILLS' }, { id: best(c => c.boatGain).id, title: 'CROWD FAVORITE', detail: Math.round(best(c => c.boatGain).boatGain) + ' STYLE' }] : [];
    return { standings, scores, stats, awards };
  },
  finish(won) {
    if (this.finished || this.role === 'client' || !this.hub) return; this.finished = true;
    const res = this.results(); res.won = !!won;
    this.send({ t: 'over', won: res.won, standings: res.standings, scores: res.scores }, true);
    this.over = { won: res.won, standings: res.standings, scores: res.scores };
    try { this.hub.finish(res); } catch (e) { MT.game.fail('finish', e); }
  },
  onEnd(e) {
    this.ended = true; this.endReason = e && e.reason; this.standings = e && e.standings;
    const g = MT.game; try { for (const p of g.players) p.clear(); g.audio.stopMusic(.3); g.audio.mute(true); } catch (er) { /* best-effort */ }
    g.go('sessionEnd', { reason: this.endReason }, { fade: 0 });
  },
  // ---------------- client: a mirror world fed by snapshots
  mirror(roomId, entry) {
    const run = MT.run, room = MT.ROOMS[roomId];
    if (MT.Show.W) MT.Show.W.dispose();
    const W = MT.Show.W = new MT.MirrorWorld({ room, contestants: run.contestants, entry, ratings: run.ratings, mode: 'session', intro: false });
    run.roomId = roomId; W.startMirror(); MT.Show.state = 'room'; MT.Show.staticK = 1;
    MT.music.play(room.boss ? 'bossShowdown' : 'studioBattle', { fade: .5 });
    this.emap = new Map(); this.kmap = new Map();
  },
  interp(list, idIdx, renderT) {   // the snapshots around renderT, by id
    const S = this.snaps; if (!S.length) return null;
    let a = S[0], b = S[S.length - 1];
    for (let i = 0; i < S.length - 1; i++) if (S[i].a <= renderT && S[i + 1].a >= renderT) { a = S[i]; b = S[i + 1]; break; }
    const u = b.a === a.a ? 1 : clamp((renderT - a.a) / (b.a - a.a), 0, 1.5);
    return { a, b, u };
  },
  clientStep(dt) {
    const W = MT.Show.W; if (!W || this.ended) return;
    const S = this.lastSnap, now = this.time(), rt = now - 120;
    // own contestant: fully local
    const me = W.contestants.find(c => c.ctl === 'local');
    if (S && S.rm === this.mirrorRm) {
      const I = this.interp(null, 0, rt), A = I ? I.a : S, B = I ? I.b : S, u = I ? Math.min(1, I.u) : 1;
      const prevA = new Map(A.E.map(e => [e[0], e]));
      // enemies
      const seen = new Set();
      for (const e of B.E) {
        seen.add(e[0]); let m = this.emap.get(e[0]);
        const kind = KCODE[e[1]]; if (!kind) continue;
        if (!m) { m = W.mirrorEnemy(e[0], kind); this.emap.set(e[0], m); m.x = e[2]; m.y = e[3]; }
        const pa = prevA.get(e[0]) || e, tx = lerp(pa[2], e[2], u), ty = lerp(pa[3], e[3], u);
        m.vx = (tx - m.x) / Math.max(dt, 1e-3); m.vy = (ty - m.y) / Math.max(dt, 1e-3); m.x = tx; m.y = ty; m.face = e[4] / 10; m.state = STCODE[e[5]] || 'move'; m.hp = e[6] / 99 * m.max; m.z = e[7]; m.big = !!e[8]; m.entering = e[9] ? { nx: 0, ny: 0 } : null; m.t = e[10] / 10; m.i = e[11]; m.flash = e[12] ? .05 : Math.max(0, m.flash - dt); m.r = m.big ? 10 : m.A.r; m.aim = m.face; m.clap = (m.clap || 0) + dt; m.box = (m.box || 0) + dt;
        m.A.pose && m.A.pose(m, dt); if (m.kind === 'clapbot' && m.rig && !MT.cfg.skipRigs) m.rig.update(dt, { look: [Math.cos(m.face), Math.sin(m.face)], walk: .5 });
      }
      for (const [id, m] of this.emap) if (!seen.has(id)) { m.dead = true; this.emap.delete(id); }
      W.enemies = [...this.emap.values()];
      // foe bullets: the newest snapshot, drawn at now
      const age = Math.max(0, Math.min(.3, (now - S.a) / 1000));
      W.fShots.list = S.B.map(b => { const o = { id: b[0], kind: BCODE[b[1]] || 'orb', x: b[2] + b[4] * age, y: b[3] + b[5] * age, vx: b[4], vy: b[5], z: 10, r: BCODE[b[1]] === 'shard' ? 2 : 3, team: 'f' }; if (b.length > 6) { o.grav = 400; o.vz = b[7] - 400 * age; o.z = Math.max(0, b[6] + b[7] * age - 200 * age * age); o.tx = b[8]; o.ty = b[9]; } return o; });
      // pickups
      const ks = new Set();
      W.pickups = S.K.filter(k => !this.kmap.has(k[0]) || !this.kmap.get(k[0]).claimed).map(k => { ks.add(k[0]); let p = this.kmap.get(k[0]); if (!p) { p = new MT.Pickup(PCODE[k[1]] || 'bill', k[2], k[3], { id: k[0], w: k[5] >= 0 ? WCODE[k[5]] : null }); this.kmap.set(k[0], p); } p.x = k[2]; p.y = k[3]; p.z = k[4]; p.ttl = k[6] === 99 ? Infinity : k[6]; p.t += dt; return p; });
      // the boss
      if (S.G && S.G[0]) { if (!W.boss || W.boss.kind !== S.G[0]) { W.boss = MT.BOSSES[S.G[0] === 'lance' ? 'lance' : S.G[0]].create(W); W.boss.co = null; } W.boss.fromNet(S.G); W.boss.t += dt; } else W.boss = null;
      // ratings, phase, doors, contestants
      W.ratings.R = S.R / 10; W.ratings.prime = S.pm / 10; W.phase = S.ph; W.waveIdx = S.wv; W.wavesTotal = S.wt;
      const P = new Map(S.P.map(p => [p[0], p]));
      for (const c of W.contestants) {
        const p = P.get(c.id); if (!p) continue;
        c.cash = p[9]; c.kills = p[11];
        if (c.ctl === 'mirror') {
          const pa = (A.P.find(x => x[0] === c.id)) || p, pb = (B.P.find(x => x[0] === c.id)) || p;
          const tx = lerp(pa[1], pb[1], u), ty = lerp(pa[2], pb[2], u); c.vx = (tx - c.x) / Math.max(dt, 1e-3); c.vy = (ty - c.y) / Math.max(dt, 1e-3); c.x = tx; c.y = ty;
          c.aim = p[3] / 100; c.firing = !!(p[4] & 1); c.slideT = p[4] & 2 ? .1 : 0; c.boat = p[4] & 4 ? .3 : 0; c.invuln = p[4] & 8 ? .3 : 0; c.wpn = WCODE[p[5]] || 'blaster'; c.hp = p[7]; c.lives = p[8]; c.bombs = p[10]; c.state = SCODE[p[12]] || 'play'; c.z = p[13]; c.addons.records = p[14]; c.addons.shield = p[15];
          if (c.firing) { c.facing = c.aim; c.fireCd -= dt; if (c.fireCd <= 0 && c.state === 'play') { c.fireCd = 1 / 8; W.fireBolt(c, c.aim, 0); } } else if (Math.hypot(c.vx, c.vy) > 5) c.facing = Math.atan2(c.vy, c.vx);
          c.pose(dt);
        }
      }
      // events: each new one once
      for (const [seq, code, data] of S.V) if (seq > this.seenSeq) { this.seenSeq = seq; const name = ECODE[code]; if (name === 'spawn') continue; if (name === 'hurt' && data.remote) continue; MT.react.on(name, data, W); this.localHazard(name, data, me, W); }
    }
    // own step
    if (me) { const it = this.overlayOpen ? MT.NOINTENT() : MT.intentFrom(me.input, me, W); me.update(dt, it, W); W.localHits(me, dt); }
    W.pShots.update(dt, W); W.cosmeticHits();
    W.arena.update(dt, W); this.mirrorDoors(W, S);
    for (const p of W.pickups) if (me && me.state === 'play' && !p.claimed && p.z < 14 && Math.hypot(p.x - me.x, p.y - me.y) < me.r + 7) this.claim(me, p, W);
    // send: 15 a second, events batched up to 4 a second
    this.sendT -= dt;
    if (this.sendT <= 0 && me) { this.sendT = 1 / 15; this.send({ t: 'c', a: q(now), s: [q(me.x), q(me.y), q(me.aim * 100), (me.firing ? 1 : 0) | (me.slideT > 0 ? 2 : 0) | (me.boat > 0 ? 4 : 0) | (me.invuln > 0 ? 8 : 0), WCODE.indexOf(me.wpn), me.hp, SCODE.indexOf(me.state), q(me.z), me.addons.records > 0 ? 1 : 0, me.addons.shield > 0 ? 1 : 0] }, false); }
    this.ceT -= dt; if (this.ceT <= 0 && this.ceQ.length) { this.ceT = .25; this.send({ t: 'ce', ev: this.ceQ.splice(0, 12) }, true); }
  },
  mirrorDoors(W, S) {
    if (!S) return; const ex = W.room.exits || {};
    ['N', 'E', 'S', 'W'].forEach((d, i) => { const D = W.arena.doors[d]; const v = (S.dr >> (i * 2)) & 3; if (v === 3 && D.state !== 'exit') { const dest = ex[d]; W.arena.setExit(d, dest, 'NEXT', 'star'); } });
    if (S.ph === 'exit' || S.ph === 'leaving') for (const d in ex) if (W.arena.doors[d].state !== 'exit') W.arena.setExit(d, ex[d], 'NEXT', 'star');
  },
  localHazard(name, d, me, W) {
    if (!me || !me.canBeHit) return;
    if (name === 'boom' && d && Math.hypot(me.x - d.x, me.y - d.y) < (d.small ? 36 : 18) + me.r - 2) me.hurt(1, d, W);
    if (name === 'splat' && d && Math.hypot(me.x - d.x, me.y - d.y) < 10 + me.r) me.hurt(1, d, W);
  },
  claim(me, p, W) {
    p.claimed = true; p.dead = true; this.ceQ.push(['claim', p.id]);
    if (p.kind === 'cap' && p.w) W.equip(me, p.w); else MT.react.on(MT.PICKUPS[p.kind].cash ? 'cash' : 'item', { slot: me.slot, v: MT.PICKUPS[p.kind].value || 0, x: p.x, y: p.y }, W);
  },
  // ---------------- the session overlay: VOLUME, MUSIC, BUTTON SYMBOLS, CLOSE (it never pauses)
  overlayOpen: false,
  overlayList() {
    const g = MT.game, s = g.settings, step = (k, d) => () => s.set(k, clamp(Math.round((s[k] + d) * 10) / 10, 0, 1));
    return new MT.ui.FocusList([
      { label: 'VOLUME', value: () => Math.round(s.volume * 100) + '%', left: step('volume', -.1), right: step('volume', .1), act: step('volume', .1) },
      { label: 'MUSIC', value: () => Math.round(s.music * 100) + '%', left: step('music', -.1), right: step('music', .1), act: step('music', .1) },
      { label: 'BUTTON SYMBOLS', value: () => s.glyphs === 'xbox' ? 'XBOX' : 'PLAYSTATION', left: () => s.set('glyphs', s.glyphs === 'xbox' ? 'playstation' : 'xbox'), right: () => s.set('glyphs', s.glyphs === 'xbox' ? 'playstation' : 'xbox'), act: () => s.set('glyphs', s.glyphs === 'xbox' ? 'playstation' : 'xbox') },
      { label: 'CLOSE', act: () => { this.overlayOpen = false; MT.overlay.open = false; } }
    ], { onCancel: () => { this.overlayOpen = false; MT.overlay.open = false; } });
  }
};
// the client's world: never authoritative; its own contestant's actions become messages
MT.MirrorWorld = class MirrorWorld extends MT.World {
  startMirror() {
    const n = this.contestants.length;
    this.contestants.forEach((c, k) => { if (c.state === 'gone') return; if (c.ctl === 'local') c.placeWalkIn(this.entry, k, n); });
    this.arena.slam(this.entry); this.phase = 'waves';
  }
  event(name, data = {}) { data.ev = name; MT.react.on(name, data, this); }
  mirrorEnemy(id, kind) {
    const A = MT.ENEMIES[kind], e = { id, kind, A, x: 0, y: 0, z: 0, vx: 0, vy: 0, r: A.r, hp: A.hp, max: A.hp, state: 'move', t: 0, face: 0, flash: 0, stun: 0, counted: A.counted, dead: false, segs: [], path: [] };
    e.rs = e; e.rig = MT.cfg.skipRigs ? null : (MT.enemyRig(kind) || null); if (kind === 'mime' && e.rig) MT.mimeBox(e.rig, e);
    if (kind === 'disco') { e.dx = 1; e.dy = 1; } if (kind === 'tank') { e.aim = 0; e.tread = 0; }
    return e;
  }
  showstopper(c) { if (c.bombs <= 0) return; c.bombs--; MT.net.ceQ.push(['bomb', Math.round(c.x), Math.round(c.y)]); MT.react.on('bomb', { slot: c.slot, x: c.x, y: c.y }, this); }
  showboatDone(c) {
    let n = 0, m = 0; for (const e of this.enemies) { if (e.dead || !e.counted) continue; const d = MT.dist(c, e); if (d < 64) n++; if (d < 32) m++; }
    const gain = Math.min(30, 4 + 3 * n + 3 * m); MT.net.ceQ.push(['boat', gain]); MT.react.on('showboat', { slot: c.slot, gain, x: c.x, y: c.y }, this);
  }
  continueContestant() { }
  localHits(me, dt) {
    if (!me.canBeHit) return;
    for (const b of this.fShots.list) { if (b.grav) continue; if (Math.hypot(me.x - b.x, me.y - b.y) < me.r * .8 + b.r) { if (me.iframes) continue; if (me.hurt(1, b, this)) { MT.net.ceQ.push(['hurt', 1, b.kind, b.id]); b.dead = true; break; } } }
    if (me.canBeHit) for (const e of this.enemies) if (!e.dead && e.A.contact && !e.entering && Math.hypot(me.x - e.x, me.y - e.y) < e.r + me.r - 2) { if (me.hurt(e.A.contact, e, this)) { MT.net.ceQ.push(['hurt', 1, e.kind, 0]); break; } }
    if (me.canBeHit && this.boss && this.boss.contactR && !this.boss.dead && Math.hypot(me.x - this.boss.x, me.y - this.boss.y) < this.boss.contactR + me.r) { if (me.hurt(1, this.boss, this)) MT.net.ceQ.push(['hurt', 1, 'boss', 0]); }
    if (me.state === 'dead' && !me._sentDied) { me._sentDied = true; MT.net.ceQ.push(['died']); } if (me.state !== 'dead') me._sentDied = false;
  }
  cosmeticHits() { for (const b of this.pShots.list) { if (b.dead || b.grav) continue; for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - b.x, e.y - b.y) < e.r + b.r) { b.dead = true; if (MT.fxr() < .3) MT.react.on('hit', { x: b.x, y: b.y }, this); break; } } }
  laser(c, dt) { const a = c.laserAng, x0 = c.x + Math.cos(a) * 10, y0 = c.y + Math.sin(a) * 10; this.laserBeams.push({ x0, y0, x1: x0 + Math.cos(a) * 300, y1: y0 + Math.sin(a) * 300, c: c.slot }); }
  explode(b) { MT.react.on('boom', { x: b.x, y: b.y, small: true }, this); }
  landLob(b) { if (b.team === 'p') MT.react.on('popcorn', { x: b.x, y: b.y }, this); }
};
MT.Contestant.prototype._update = MT.Contestant.prototype.update;
MT.Contestant.prototype.update = function (dt, it, W) {
  if (this.ctl === 'remote') { this.t += dt; this.fireCd -= dt; this.laserOn = false; this.laserAng = this.aim; return MT.net.remoteStep(this, dt, W); }
  if (this.ctl === 'mirror') return;
  return this._update(dt, it, W);
};

// ---------------------------------------------------------------- the session scenes: our own card, play, and the end card
MT.scenes.sessionCard = {
  input: MT.MENU, camera: { zoom: false },
  enter(d = {}) {
    this.fake = !!d.fake; this.t = 0; this.count = null; MT.music.play('theme', { fade: .3 });
    const self = this; this.btn = {};
    if (!this.fake && !this._wired && typeof window !== 'undefined' && window.addEventListener) { this._wired = true; window.addEventListener('keydown', e => { if (MT.game.sceneName === 'sessionCard' && (e.key === 'Enter' || e.code === 'Enter')) self.answer('ready'); }, true); }
    this.players = this.fake ? [{ id: 0, name: 'ALEX' }, { id: 1, name: 'SAM' }, { id: 2, name: 'JO' }] : MT.net.info.players;
    MT.lines.say('LANCE', 'WELCOME TO THE LIGHTNING ROUND! GRAB THE MOST CASH AND BEAT MASHY TOGETHER!', { prio: 3 });
  },
  answer(a) { if (this.fake) return; const H = MT.net.hub; if (!H) return; try { if (a === 'ready') { if (!this.sentReady) { this.sentReady = true; H.answer('ready'); MT.sfx('bell'); } } else { H.answer('more'); MT.sfx('blip'); } } catch (e) { /* the hub may be gone */ } },
  update(dt) {
    MT.frame(dt); this.t += dt;
    const c = MT.ui.clicked();
    if (MT.ui.nav('confirm') || c && MT.ui.inRect(c, this.btn.ready)) this.answer('ready');
    if (MT.game.players.some(p => p.pressed('more')) || c && MT.ui.inRect(c, this.btn.more)) this.answer('more');
    if (this.fake) { if (MT.ui.nav('cancel')) MT.game.go('title'); return; }
    const N = MT.net;
    if (N.started) { const t = N.time(); this.count = t; if (t >= 0 && isFinite(t)) { MT.game.go('session', {}, { fade: 0 }); } }
  },
  draw(r) {
    MT.ui.backdrop(r, MT.game.real);
    r.overlay(g => {
      const T = MT.ui.T, cx = r.W / 2, card = MT.net.card || {}, ready = card.ready || [];
      MT.drawLogo(g, cx, 22, 3, true); T(g, 'THE LIGHTNING ROUND', cx, 52, '#2ee6ff', { align: 'center', scale: 1 });
      T(g, "TONIGHT'S CONTESTANTS", cx, 66, '#ffcc33', { align: 'center' });
      this.players.forEach((p, i, a) => { const x = cx + (i - (a.length - 1) / 2) * 76, col = p.color || MT.COLORS.p[i % 4]; MT.ui.panel(g, x - 34, 78, 68, 26, { border: col, alpha: .85 }); T(g, MT.safeName(p.name), x, 83, col, { align: 'center' }); T(g, ready.includes(p.id) ? '✓ READY' : '...', x, 93, ready.includes(p.id) ? '#22ff66' : '#8a7a9a', { align: 'center', font: 'tiny' }); });
      T(g, 'HOW TO WIN: GRAB THE MOST CASH - BEAT MASHY TOGETHER', cx, 112, '#fff7e8', { align: 'center' });
      const I = MT.ui.lastI(); MT.glyph.prompt(g, cx, 126, [['move', 'MOVE'], ['aim', 'AIM+FIRE'], ['slide', 'SLIDE'], ['bomb', 'BOMB']], I, { align: 'center' });
      const st = this.count !== null && isFinite(this.count) ? (this.count < 0 ? String(Math.ceil(-this.count / 1000)) : 'MASH!') : card.starting ? 'STARTING' : card.paused ? 'PAUSED' : card.left !== null && card.left !== undefined ? 'STARTS IN ' + Math.ceil(card.left / 1000) : 'GET READY';
      T(g, st, cx, 146, '#ff2e88', { align: 'center', scale: 2 });
      const by = Math.min(r.H - 76, 166), rb = [cx - 100, by, 90, 20], mb = [cx + 10, by, 90, 20]; this.btn = { ready: rb, more: mb };
      MT.ui.panel(g, ...rb, { border: '#22ff66' }); MT.glyph.prompt(g, rb[0] + rb[2] / 2, rb[1] + 4, [['confirm', 'READY']], I, { align: 'center' });
      MT.ui.panel(g, ...mb, { border: '#ffcc33' }); T(g, card.asked ? 'TAKE BACK (M)' : 'MORE TIME (M)', mb[0] + mb[2] / 2, mb[1] + 6, '#ffcc33', { align: 'center' });
      if (MT.lines.current) MT.ui.lowerThird(g, r);
    });
  }
};
MT.scenes.session = {
  input: MT.PLAY, playInput: true, camera: { zoom: false }, pausable: false,
  enter() { const g = MT.game; g.lights.enabled = true; MT.net.startPlay(); MT.music.sting('stMash'); },
  update(dt) {
    MT.frame(dt); const N = MT.net, g = MT.game;
    N.left = N.info && N.info.limitMs ? Math.max(0, (N.info.limitMs - N.time()) / 1000) : null;
    if (!N.ended) {
      const I = g.input, createHeld = I.held && I.held.has && I.held.has('Pad8');
      if ((I.pressed('pause') || (N.overlayOpen && I.pressed('cancel'))) && !createHeld) { N.overlayOpen = !N.overlayOpen; MT.overlay.open = N.overlayOpen; if (N.overlayOpen) N.olist = N.overlayList(); }
      if (N.overlayOpen && N.olist) N.olist.update(dt);
    }
    if (N.role === 'client') N.clientStep(dt);
    else { MT.Show.update(dt); N.hostStep(dt); }
    if (MT.Show.W) g.lights.ambient = MT.Show.W.arena.set.ambient;
  },
  draw(r) {
    const N = MT.net;
    MT.Show.draw(r);
    r.overlay(g => {
      if (N.role === 'server') { MT.ui.panel(g, r.W / 2 - 60, r.H - 30, 120, 16, { border: '#8a8a8a' }); MT.ui.T(g, 'STUDIO SERVER', r.W / 2, r.H - 26, '#c8c8c8', { align: 'center' }); }
      if (N.overlayOpen && N.olist) { px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0414')); MT.ui.title(g, r, 'MENU', 40); N.olist.draw(g, r, r.W / 2 - 90, 70, 180, { rowH: 24 }); MT.ui.T(g, 'THE SHOW GOES ON WHILE THIS IS OPEN', r.W / 2, 172, '#8a7a9a', { align: 'center', font: 'tiny' }); }
      if (N.over) { MT.ui.panel(g, r.W / 2 - 90, 60, 180, 30, { border: '#ffcc33' }); MT.ui.T(g, N.over.won ? 'MASHY IS MASHED!' : "THAT'S OUR SHOW!", r.W / 2, 70, '#ffcc33', { align: 'center' }); }
    });
  }
};
MT.scenes.sessionEnd = {
  input: MT.MENU,
  enter(d = {}) { this.reason = d.reason; this.t = 0; },
  update(dt) { this.t += dt; MT.lines.update(1 / 120); },
  draw(r) {
    MT.ui.backdrop(r, MT.game.real);
    r.overlay(g => {
      const T = MT.ui.T, cx = r.W / 2, why = this.reason;
      const head = why === 'finished' ? "THAT'S OUR SHOW!" : why === 'sat-out' ? 'YOU SAT THIS ONE OUT' : why === 'session-ended' ? 'THANKS FOR WATCHING' : 'WE ARE EXPERIENCING TECHNICAL DIFFICULTIES';
      MT.drawLogo(g, cx, 24, 2, true); E.font.title(g, head, cx, 50, { scale: head.length > 24 ? 1 : 2, align: 'center', colors: ['#ffcc33', '#ff7a5a'], outline: '#1a0a24' });
      const st = (MT.net.over && MT.net.over.standings) || MT.net.standings || [], sc = (MT.net.over && MT.net.over.scores) || {};
      let k = 0; for (const tie of st) for (const id of tie) { const c = MT.run && MT.run.contestants.find(c => c.id === id); const y = 84 + k * 16; T(g, (k + 1) + '. ' + (c ? c.name : 'P' + (id + 1)), cx - 70, y, c ? c.color : '#fff7e8'); T(g, MT.money(sc[id] !== undefined ? sc[id] : c ? c.cash : 0), cx + 80, y, '#ffcc33', { align: 'right' }); k++; }
    });
  }
};
