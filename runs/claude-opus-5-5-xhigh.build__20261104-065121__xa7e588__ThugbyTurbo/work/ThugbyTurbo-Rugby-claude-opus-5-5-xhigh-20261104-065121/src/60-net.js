/* ---- AI HUB SESSIONS (AI Hub Session Protocol v1, shared-world, 2-4 players). The host's copy runs the match (all 14
 * players, the ball, the laws); every other copy sends what its player does and draws what the host sends. Each copy
 * moves its own player at once while it is free-running and reports where it is; the host decides everything else.
 * Outside a session (AIHub.active false) none of this runs and nothing changes ---- */
const PH = ['intro', 'kickoff', 'play', 'ruck', 'scrum', 'lineout', 'setkick', 'penalty', 'dead', 'try', 'half', 'full', 'dropout'];
const STS = ['free', 'pass', 'kick', 'step', 'spin', 'lunge', 'stumble', 'dive', 'tdive', 'down', 'up', 'launch', 'stun', 'cele', 'ruck', 'set', 'bin', 'off'];
const BSTS = ['held', 'air', 'loose', 'dead', 'placed'];
const ACTS = ['', 'pass', 'passL', 'dummy', 'offload', 'kick', 'drop', 'placeKick', 'step', 'spin', 'fend', 'lunge', 'whiff', 'hit', 'shoulder', 'tackle', 'dive', 'tdive', 'sprawl', 'hitBack', 'tackled', 'launch', 'landed', 'flat', 'fended', 'hang', 'jackal', 'lift', 'highCatch', 'throwIn', 'toasted', 'zapped'];
const BKINDS = ['', 'pass', 'kick', 'grubber', 'punt', 'bomb', 'drop', 'spill', 'kickoff', 'kickoffDone', 'dropoutk', 'setkick'];
const SETP_KEYS = ['kind', 'sub', 't', 'bar', 'tq', 'team', 'att', 'calls', 'picked', 'needle', 'q', 'qT', 's', 'ty', 'x', 'y', 'power', 'kicker', 'purpose', 'gy', 'gx', 'd', 'aim', 'sway', 'clockT', 'result', 'opts', 'sel', 'free', 'tackled', 'shift', 'base', 'charging'];
const NET_EVENTS = ['try', 'kickoff', 'pass', 'catch', 'tackle', 'bigHit', 'monsterHit', 'sidestep', 'spin', 'fend', 'dummy', 'lineBreak', 'knockOn', 'forwardPass', 'turnover', 'jackal', 'ruck', 'ruckWon', 'scrum', 'scrumWon', 'scrumEngage', 'pushover', 'collapse', 'lineout', 'lineoutWon', 'lineoutThrow', 'notStraight', 'convMade', 'convMissed', 'doink', 'doinkMiss', 'penGoal', 'dropGoal', 'dropMiss', 'penalty', 'freeKick', 'advantage', 'advOver', 'foul', 'cheapShot', 'cheapUnseen', 'card', 'sinBinOut', 'refDown', 'refUp', 'refCall', 'onFire', 'fireOut', 'superStart', 'superEnd', 'powerupThrow', 'powerupTake', 'hazardWarn', 'hazard', 'toasted', 'zapped', 'chickenHit', 'mud', 'hooter', 'halftime', 'fulltime', 'suddenDeath', 'whistle', 'kick', 'interception', 'offload', 'brokenTackle', 'missedTackle', 'diveTackle', 'gangHold', 'kickTouch', 'touch', 'dropout', 'notTen', 'penTry', 'banner', 'land', 'bounce', 'mash', 'push', 'windShift', 'setKickGo', 'scrumCall', 'kickoffSetup', 'earlyEngage', 'sputter'];
const Net = TT.Net = {
  info: null, mirror: null, host: false, server: false, me: -1, seatOf: {}, inbox: [], lastSnap: -Infinity, snapAt: 0, evBuf: [], evT: 0, sendT: 0, seq: 0, ended: false, finished: false, card: null, started: false, presses: [], pressId: 0, applied: {}, remoteSeen: {}, stats: { snaps: 0, bytes: [], events: 0, intents: 0 },
  state() { return this.info ? { host: this.host, server: this.server, me: this.me, ended: this.ended, finished: this.finished, started: this.started } : null; },
  isHost() { return this.host; },
  waiting() { return this.info && !this.host && this.started && performance.now() - this.snapAt > 1000 && !this.ended; },
  async boot() {
    const game = TT.game;
    try {
      const info = await AIHub.connect({ mode: 'shared-world', seats: [2, 4], card: true });
      if (!info) { game.go('title'); return; }
      this.info = info; this.me = info.me; this.host = !!info.isHost; this.server = !!info.server;
      // the setup, the same on every copy, from the hub's seed (no messages needed)
      const R = AIHub.rng('setup'), opp = ['bad', 'gul', 'irn', 'meg'][Math.floor(R() * 4)], venue = TT.VENUE_ORDER[Math.floor(R() * 4)];
      const lim = info.limitMs || 0, half = lim ? clamp((lim / 1000 - 40) / 2.6, 20, 75) : 75;
      this.setup = { home: 'mud', away: opp, venue, halfLen: half, seed: Math.floor(R() * 1e9) };
      // seats: even ids HOME, odd AWAY; the CPU fills the rest
      this.seats = info.players.map((p, k) => ({ kind: p.id === this.me && !this.server ? 'local' : 'remote', hubId: p.id, team: p.id % 2, label: TT.clean(p.name || 'P' + (k + 1)).toUpperCase().slice(0, 8), color: p.color || ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][k % 4], input: p.id === this.me ? game.input : null }));
      AIHub.on('card', c => { this.card = c; });
      AIHub.on('start', () => { this.started = true; game.go('match', this.matchData()); });
      AIHub.on('message', (data, from) => this.onMessage(data, from));
      AIHub.on('leave', ({ id }) => this.onLeave(id));
      AIHub.on('time-up', () => { if (this.host) this.finish(); });
      AIHub.on('end', ({ reason }) => this.onEnd(reason));
      this.cardRig = this.seats.map(s => TT.makeRig(TT.TEAMS[s.team ? opp : 'mud'].roster[[4, 5, 6, 3][Math.floor(s.hubId / 2) % 4]], s.team ? TT.TEAMS[opp].home : TT.TEAMS.mud.home));
      if (game.sceneName !== 'card') game.go('card', {}, { fade: 0 }); else if (TT.scenes.card.enter) TT.scenes.card.enter.call(TT.scenes.card, {});
      // the card's answers straight from the keyboard too, so a scene's fade never swallows them: Enter is Ready, M more time
      if (typeof addEventListener === 'function' && !this.server) addEventListener('keydown', e => { if (this.started || this.ended || e.repeat) return; if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.key === 'Enter') { AIHub.answer('ready'); this.answered = true; } else if (e.code === 'KeyM') AIHub.answer('more'); });
      AIHub.ready();
    } catch (e) { game.fail('AI Hub', e); }
  },
  matchData() { return Object.assign({ session: true, sudden: false, seats: this.seats, skipIntro: true }, this.setup); },
  /** the match scene calls this at its start */
  attach(m) {
    this.m = m; this.inbox = []; this.evBuf = []; this.evT = 0; this.sendT = 0; this.finished = false;
    m.o.replays = 'Off';
    if (this.host) {
      this.sub = TT.bus.on('*', (d, name) => { if (d.m === m && NET_EVENTS.includes(name)) this.evBuf.push([name, this.plain(d)]); });
    } else {
      this.mirror = m;   // the client never steps it: snapshots write its fields
      for (const p of m.players) p.ctl = -1;
    }
  },
  plain(d) { const o = {}; for (const k in d) if (k !== 'm' && typeof d[k] !== 'object') o[k] = typeof d[k] === 'number' ? Math.round(d[k] * 100) / 100 : d[k]; return o; },
  /** each step of the match scene */
  update(dt) {
    const m = this.m; if (!m || this.ended) return;
    const t = AIHub.time();
    if (t < 0) { m.waitStart = true; return; }
    if (this.host) this.hostStep(dt); else this.clientStep(dt);
  },
  hostStep(dt) {
    const m = this.m;
    // remote seats: their latest intents become their I (presses applied once each, by id)
    for (const s of m.seats) if (s.kind === 'remote') this.applyRemote(s);
    this.sendT += dt; this.evT += dt;
    if (this.sendT >= 1 / 12) { this.sendT = 0; const snap = this.snapshot(); const json = JSON.stringify(snap); this.stats.snaps++; this.stats.bytes.push(json.length); AIHub.send(snap, { reliable: false }); }
    if (this.evT >= .2 && this.evBuf.length) { this.evT = 0; const l = this.evBuf.splice(0, 40); this.stats.events += l.length; AIHub.send({ t: 'e', l }, { reliable: true }); }
    if (m.over && !this.finished) this.finish();
  },
  applyRemote(s) {
    const msg = this.remoteSeen[s.hubId]; const I = s.I;
    for (const k of PBTN) { I.rl[k] = false; }
    if (!msg) { I.mx = I.my = 0; return; }
    I.mx = clamp(msg.m[0] / 100, -1, 1); I.my = clamp(msg.m[1] / 100, -1, 1);
    const prev = s.prevHeld || 0;
    PBTN.forEach((k, i) => { const on = !!(msg.h & (1 << i)); I.hd[k] = on; if (!on && (prev & (1 << i))) I.rl[k] = true; });
    I.turbo = !!(msg.h & (1 << 7));
    s.prevHeld = msg.h;
    const seen = this.applied[s.hubId] || (this.applied[s.hubId] = {});
    for (const [act, at, id] of msg.p || []) { if (seen[id]) continue; seen[id] = 1; if (act === 'up' || act === 'down' || act === 'left' || act === 'right') I.pr[act] = true; else I.pr[act] = true; }
    // the client's own position while its player is free-running (clamped to what it could have run)
    const p = this.m.players[s.pid];
    if (p && msg.pos && FREE[p.st] && this.m.phase === 'play' && msg.at > (s.posAt || -1e9)) {
      const dtm = Math.max(.05, (msg.at - (s.posAt || msg.at - 100)) / 1000), maxD = this.m.speedOf(p) * TUNE.v.turboMult * dtm + 20;
      const dx = msg.pos[0] - p.x, dy = msg.pos[1] - p.y, d = Math.hypot(dx, dy), k = d > maxD ? maxD / d : 1;
      p.x += dx * k; p.y += dy * k; s.posAt = msg.at;
    }
  },
  snapshot() {
    const m = this.m, b = m.ball, R = m.ref, r = Math.round, I100 = v => r(v * 100);
    const P = m.players.map(p => { const a = [r(p.x), r(p.y), r(p.z), I100(p.f), STS.indexOf(p.st), I100(Math.min(p.stT, 9)), p.ctl, Math.max(0, ACTS.indexOf(p.a.act || '')), I100(p.a.flip || 0), p.a.cele || 0, p.fire > 0 ? 1 : 0, p.sup ? (p.sup.kind === 'thunder' ? 1 : 2) : 0, p.charge >= 0 ? I100(p.charge) : -1, r(p.turbo * 10), r(p.vx), r(p.vy)]; if (p.st === 'bin') a.push(r(p.binT)); return a; });
    const sp = m.setp ? {} : null;
    if (sp) for (const k of SETP_KEYS) if (m.setp[k] !== undefined) sp[k] = typeof m.setp[k] === 'number' ? Math.round(m.setp[k] * 100) / 100 : m.setp[k];
    return { t: 's', at: r(AIHub.time()), ph: PH.indexOf(m.phase), sub: m.sub, pt: I100(Math.min(m.phaseT, 99)), c: r(m.clock * 10), hf: m.half, ho: m.hooter ? 1 : 0, sd: m.sudden ? 1 : 0, sc: m.score, hy: m.hype.map(r), dir: m.dir[0], ps: m.poss,
      b: [r(b.x), r(b.y), r(b.z), BSTS.indexOf(b.st), b.holder, Math.max(0, BKINDS.indexOf(b.kind)), I100(b.rot % 100), b.land ? r(b.land.x) : -1, b.land ? r(b.land.y) : -1, r(b.vx), r(b.vy), r(b.vz)],
      r: [r(R.x), r(R.y), I100(R.f), R.down > 0 ? r(R.down) : 0, R.callT > 0 ? R.call : '', R.signal || '', R.card || ''], P, sp,
      pu: m.powerups.filter(q => !q.taken).map(q => [q.kind, r(q.x), r(q.y), q.on ? 1 : 0, I100(q.t)]), hz: m.hazards.map(h => [h.kind, r(h.x), r(h.y), I100(h.t), I100(h.warn || 0), h.f ? I100(h.f) : 0]), w: [I100(m.wind.s), I100(m.wind.a)], ui: m.useIt > 0 ? I100(m.useIt) : 0, adv: m.adv ? m.adv.team : -1 };
  },
  /** a client: its own intent to the host (15 a second), its own player moved now, the host's world drawn */
  clientStep(dt) {
    const m = this.m, s = m.seats.find(q => q.kind === 'local'); if (!s) return;
    const I = s.I, mine = m.players.find(p => p.ctl === s.i);
    // presses are remembered for a second and sent with every intent (lossy channel): the host applies each id once
    const now = AIHub.time();
    for (const k of PBTN.concat(['up', 'down', 'left', 'right'])) if (I.pr[k]) this.presses.push([k, Math.round(now), ++this.pressId]);
    this.presses = this.presses.filter(q => now - q[1] < 1000);
    if (mine && FREE[mine.st] && m.phase === 'play') {
      // predicted: our own player runs at once from our own stick
      const sp = m.speedOf(mine) * (I.turbo ? TUNE.v.turboMult : 1), mx = I.mx, my = I.my;
      mine.vx = approach(mine.vx, mx * sp, 900 * dt); mine.vy = approach(mine.vy, my * sp, 900 * dt);
      mine.x += mine.vx * dt; mine.y += mine.vy * dt; m.bound(mine);
      if (Math.hypot(mx, my) > .15) mine.f = E.approachAng(mine.f, Math.atan2(my, mx), dt * 10);
      this.predicted = mine.id;
    } else this.predicted = -1;
    this.sendT += dt;
    if (this.sendT >= 1 / 15) {
      this.sendT = 0;
      let h = 0; PBTN.forEach((k, i) => { if (I.hd[k]) h |= 1 << i; }); if (I.turbo) h |= 1 << 7;
      const msg = { t: 'i', s: ++this.seq, at: Math.round(now), m: [Math.round(I.mx * 100), Math.round(I.my * 100)], h, p: this.presses.slice(-12) };
      if (this.predicted >= 0) msg.pos = [Math.round(mine.x), Math.round(mine.y)];
      this.stats.intents++;
      AIHub.send(msg, { to: this.info.host, reliable: false });
    }
    for (const k of PBTN) I.pr[k] = false;
    for (const k of ['up', 'down', 'left', 'right']) I.pr[k] = false;
    this.applyInbox();
  },
  onMessage(data, from) {
    if (!data || typeof data !== 'object') return;
    if (this.host && data.t === 'i') { const prev = this.remoteSeen[from]; if (!prev || data.s > prev.s) this.remoteSeen[from] = data; return; }
    if (!this.host && from === this.info.host) this.inbox.push(data);
  },
  applyInbox() {
    const m = this.m;
    for (const d of this.inbox.splice(0)) {
      if (d.t === 'e') { for (const [name, ev] of d.l) { TT.bus.emit(name, Object.assign({ m }, ev)); } continue; }
      if (d.t !== 's' || d.at < this.lastSnap) continue;
      this.lastSnap = d.at; this.snapAt = performance.now();
      this.applySnap(d);
      if (d.over) { m.over = true; }
    }
  },
  applySnap(d) {
    const m = this.m, oldPhase = m.phase;
    m.phase = PH[d.ph] || 'play'; m.sub = d.sub || ''; m.phaseT = d.pt / 100; m.clock = d.c / 10; m.half = d.hf; m.hooter = !!d.ho; m.sudden = !!d.sd; m.score = d.sc.slice(); m.hype = d.hy.slice(); m.dir = [d.dir, -d.dir]; m.poss = d.ps;
    void oldPhase;
    const b = m.ball, B = d.b;
    b.x = B[0]; b.y = B[1]; b.z = B[2]; b.st = BSTS[B[3]] || 'dead'; b.holder = B[4]; b.kind = BKINDS[B[5]] || ''; b.rot = B[6] / 100; b.land = B[7] >= 0 && b.st === 'air' ? { x: B[7], y: B[8] } : null; b.vx = B[9]; b.vy = B[10]; b.vz = B[11];
    const R = m.ref, Rr = d.r; R.x = Rr[0]; R.y = Rr[1]; R.f = Rr[2] / 100; R.down = Rr[3]; if (Rr[4]) { R.call = Rr[4]; R.callT = .3; } else R.callT = Math.max(0, R.callT - .1); R.signal = Rr[5]; R.sigT = Rr[5] ? .3 : 0; R.card = Rr[6];
    d.P.forEach((a, i) => {
      const p = m.players[i]; if (!p) return;
      const own = i === this.predicted && STS[a[4]] === 'free' && m.phase === 'play';
      if (!own || Math.hypot(a[0] - p.x, a[1] - p.y) > 60) { p.tx = a[0]; p.ty = a[1]; if (!own) { if (p.tx0 === undefined || Math.hypot(a[0] - p.x, a[1] - p.y) > 80) { p.x = a[0]; p.y = a[1]; } } else { p.x = a[0]; p.y = a[1]; } }
      p.z = a[2]; if (!own) p.f = a[3] / 100; p.st = STS[a[4]] || 'free'; p.stT = a[5] / 100; p.ctl = a[6]; p.a.act = ACTS[a[7]] || ''; p.a.flip = a[8] / 100; p.a.cele = a[9]; p.fire = a[10] ? 1 : 0;
      p.sup = a[11] ? { kind: a[11] === 1 ? 'thunder' : 'hurricane', t: 1 } : null; p.charge = a[12] >= 0 ? a[12] / 100 : -1; p.chargeT = p.charge >= 0 ? p.charge * TUNE.v.bigHitCharge : 0; p.turbo = a[13] / 10; if (!own) { p.vx = a[14]; p.vy = a[15]; }
      if (p.st === 'bin') p.binT = a[16] || 0;
      p.tx0 = 1;
    });
    for (const s of m.seats) { const p = m.players.find(q => q.ctl === s.i); s.pid = p ? p.id : -1; }
    if (d.sp) { m.setp = Object.assign(m.setp && m.setp.kind === d.sp.kind ? m.setp : {}, d.sp); } else m.setp = null;
    m.powerups = (d.pu || []).map(([kind, x, y, on, t]) => ({ kind, x, y, on: !!on, t: t / 100, taken: false, fx: x, fy: G.Y0 - 70, fly: 1.1, life: 15 }));
    m.hazards = (d.hz || []).map(([kind, x, y, t, warn, f]) => ({ kind, x, y, t: t / 100, warn: warn / 100, burn: 1.2, f: f / 100 }));
    m.wind.s = d.w[0] / 100; m.wind.a = d.w[1] / 100; m.useIt = d.ui / 100; m.adv = d.adv >= 0 ? { team: d.adv } : null;
  },
  /** the host finishes the round: standings by the score (a draw ties everyone), scores, stats, awards */
  finish() {
    if (this.finished || !this.host || !this.m) return;
    this.finished = true;
    const m = this.m, ids = this.info.players.map(p => p.id).filter(id => !this.gone || !this.gone[id]);
    const side = id => id % 2, w = m.score[0] > m.score[1] ? 0 : m.score[1] > m.score[0] ? 1 : -1;
    const standings = w < 0 ? [ids] : [ids.filter(id => side(id) === w), ids.filter(id => side(id) !== w)].filter(a => a.length);
    const scores = {}, stats = {}, awards = [];
    for (const id of ids) { scores[id] = m.score[side(id)]; const st = m.stats[side(id)]; stats[id] = { tries: st.tries, tackles: st.tackles, bigHits: st.bigHits, metres: Math.round(metres(st.metres)) }; }
    const best = m.players.slice().sort((a, b) => (b.tries * 10 + b.monsters * 4 + b.tackles) - (a.tries * 10 + a.monsters * 4 + a.tackles))[0];
    const bestSeat = best && m.seats.find(s => s.pid === best.id && s.hubId !== undefined);
    if (bestSeat && ids.includes(bestSeat.hubId)) awards.push({ id: bestSeat.hubId, title: 'Player of the Match', detail: best.nick });
    const hitter = m.players.slice().sort((a, b) => b.hitBest - a.hitBest)[0], hs = hitter && m.seats.find(s => s.pid === hitter.id && s.hubId !== undefined);
    if (hs && hitter.hitBest > 0 && ids.includes(hs.hubId)) awards.push({ id: hs.hubId, title: 'Biggest Hit', detail: Math.round(hitter.hitBest) + ' m flown' });
    try { AIHub.send(Object.assign(this.snapshot(), { over: 1 }), { reliable: true }); } catch (e) { /* the round may be ending */ }
    if (this.evBuf.length) try { AIHub.send({ t: 'e', l: this.evBuf.splice(0) }, { reliable: true }); } catch (e) { /* ending */ }
    AIHub.finish({ standings, scores, stats, awards });
    if (!m.over) m.fullTime();
  },
  onLeave(id) {
    (this.gone || (this.gone = {}))[id] = true;
    const m = this.m; if (!m) { this.seats = (this.seats || []).filter(s => s.hubId !== id); return; }
    const s = m.seats.find(q => q.hubId === id); if (s) { const p = m.players[s.pid]; if (p && p.ctl === s.i) p.ctl = -1; s.kind = 'cpu'; s.pid = -1; }
  },
  onEnd(reason) {
    this.ended = true; this.endReason = reason;
    const game = TT.game;
    try { game.audio.music(null); game.audio.mute(true); } catch (e) { /* no sound */ }
    TT.muted = true;
    for (const q of game.players) q.clear && q.clear();
    if (this.sub) { this.sub(); this.sub = null; }
  },
  draw(r) {
    const m = this.m;
    r.overlay(g => {
      const t = AIHub.time();
      if (t < 0 && t > -10000) FONT.title(g, String(Math.ceil(-t / 1000)), r.W / 2, r.H * .35, { align: 'center', scale: 6, colors: ['#ffffff', '#ffe08a', '#e0662a'], depth: 3 });
      if (this.ended || (m && m.over)) { UI.panel(g, r.W / 2 - 90, 70, 180, 40, { alpha: .9 }); FONT.title(g, 'FULL TIME', r.W / 2, 76, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a', '#e0662a'] }); UI.txt(g, m.teams[0].short + ' ' + m.score[0] + ' - ' + m.score[1] + ' ' + m.teams[1].short, r.W / 2, 96, '#ffffff', { align: 'center' }); }
    });
  }
};
/* ---- the session card: the game's own, while the players get ready (no menus, no choices) ---- */
TT.scenes.card = Object.assign({}, FRONT, {
  enter(data) {
    this.data = data || {}; this.t = 0;
    BG.ensure(Net.setup ? Net.setup.venue : 'docks', 'mud', Net.setup ? Net.setup.away : 'gul', 'dusk');
    TT.sound.music('title');
    this.R = SESSION && AIHub.rng ? AIHub.rng('card') : TT.makeRng(3);
  },
  update(dt) {
    this.t += dt; BG.update(dt);
    const game = TT.game, I = game.input;
    if (!SESSION || !Net.info || Net.server) return;
    // a pad's Cross or Start is Ready, Triangle more time (Enter and M come straight from the keyboard: Net.boot)
    if ((I.pressed('start') || I.pressed('confirm') || I.pressed('x')) && !Net.answered) { AIHub.answer('ready'); I.consumeAll(); }
    if (I.pressed('tri')) AIHub.answer('more');
    const ck = I.clicked();
    if (ck && this.readyBtn && UI.inRect(ck, this.readyBtn)) AIHub.answer('ready');
    if (ck && this.moreBtn && UI.inRect(ck, this.moreBtn)) AIHub.answer('more');
    for (const rg of Net.cardRig || []) rg.update(dt, { x: 0, y: 0, z: 0, facing: PI / 2, pose: 'hips' });
  },
  draw(r) {
    BG.draw(r, .55);
    r.overlay(g => {
      const cx = r.W / 2, c = Net.card || {}, S = Net.setup || { away: 'gul', venue: 'docks' };
      FONT.title(g, 'THUGBY TURBO', cx, 8, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 });
      UI.txt(g, 'MUDLARKS v ' + TT.TEAMS[S.away].short + '  -  ' + TT.VENUES[S.venue].name, cx, 40, '#c8d0e8', { align: 'center' });
      UI.txt(g, 'HOW TO WIN: SCORE MORE POINTS THAN THE OTHER TEAM', cx, 52, '#ffe060', { align: 'center' });
      const ps = Net.seats || [], w = Math.min(96, (r.W - 20) / Math.max(1, ps.length));
      ps.forEach((s, k) => {
        const x = cx - (ps.length * w) / 2 + k * w, y = 66, ready = (c.ready || []).includes(s.hubId);
        UI.panel(g, x + 2, y, w - 4, 56, { border: s.color, alpha: .9 });
        if (Net.cardRig && Net.cardRig[k] && TT.cfg.present) Net.cardRig[k].drawPortrait(g, x + w / 2 - 14, y + 4, 28, { zoom: 2.2, turn: .3, bg: '#203050' });
        UI.txt(g, s.label, x + w / 2, y + 35, s.color, { align: 'center' });
        UI.txt(g, s.team ? 'AWAY' : 'HOME', x + w / 2, y + 44, '#a8b0c8', { align: 'center', font: 'tiny' });
        if (ready) UI.txt(g, '✓ READY', x + w / 2, y + 58 - 12, '#80ff90', { align: 'center', font: 'tiny' });
      });
      const I = TT.game.input;
      UI.prompt(g, '{b:stick} RUN  {b:l1}{b:r1} PASS  {b:x} TACKLE / STEP  {b:ci} KICK  {b:turbo} TURBO', cx, 130, I, { align: 'center' });
      const left = c.left !== null && c.left !== undefined ? 'STARTS IN ' + Math.ceil(c.left / 1000) : c.starting ? 'STARTING...' : '';
      UI.txt(g, c.paused ? 'PAUSED: PLAYERS ASKED FOR MORE TIME' : left, cx, 148, c.paused ? '#ff9080' : '#ffffff', { align: 'center', scale: 2 });
      this.readyBtn = [cx - 110, 170, 100, 20]; this.moreBtn = [cx + 10, 170, 100, 20];
      UI.panel(g, ...this.readyBtn, { focus: true }); UI.prompt(g, '{b:confirm} READY', cx - 60, 175, I, { align: 'center' });
      UI.panel(g, ...this.moreBtn); if (I.lastDevice === 'gamepad') UI.prompt(g, '{b:tri} MORE TIME', cx + 60, 175, I, { align: 'center' }); else { const w = UI.glyph(g, '', cx + 18, 174, I, { raw: 'M' }); UI.txt(g, 'MORE TIME', cx + 22 + w, 176, '#ffffff'); }
      if (c.asking) UI.txt(g, c.asking + ' ASKED FOR MORE TIME' + (c.asked ? ' (YOU TOO)' : ''), cx, 196, '#a8b0c8', { align: 'center', font: 'tiny' });
    });
  }
});
