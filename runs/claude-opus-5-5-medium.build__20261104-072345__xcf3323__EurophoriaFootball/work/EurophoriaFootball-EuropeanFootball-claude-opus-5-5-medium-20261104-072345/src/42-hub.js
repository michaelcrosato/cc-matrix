/* 42-hub: AI Hub sessions (Session Protocol v1, shared-world, 2-4 players). Connect with our own card (the tunnel), set
 * the round up from the shared seed, ready with no key press, start on the hub's clock. The host runs the match: remote
 * players' footballers follow their input messages (cumulative press counters: a lost packet loses no press); it sends
 * snapshots 14 a second (unreliable, small) and the match's events at most 5 a second (reliable). Clients draw a mirror
 * interpolated 100 ms behind and send their input 15 a second. Leaving hands a footballer to the CPU; time-up finishes at
 * once; on end everything stops. Options or Esc opens our own SESSION SETTINGS overlay: nothing pauses. */
const ST_CODES = ['run', 'slide', 'poke', 'barge', 'skill', 'air', 'down', 'getup', 'launched', 'dive', 'stunned', 'keeper-dive', 'keeper-hold', 'off', 'gone'];
const ACT_CODES = [null, 'pass', 'shot', 'shotHard', 'chip', 'volley', 'header', 'bicycle', 'divingHeader', 'poke', 'slide', 'barge', 'stepover', 'spin', 'rainbow', 'nutmeg', 'knockon', 'throw', 'smother', 'catch', 'diveHigh', 'diveLow', 'dive', 'touch'];
const MODE_CODES = ['kickoff', 'setpiece', 'play', 'dead', 'goal', 'var', 'halftime', 'fulltime', 'shootout', 'over'];
const SP_CODES = [null, 'kickoff', 'goalkick', 'corner', 'freekick', 'penalty'];
const FWD_EVENTS = new Set(['goal', 'ownGoal', 'whistle', 'card', 'sendOff', 'var', 'varDecision', 'superStrike', 'superRelease', 'saveDuel', 'saveDuelResult', 'europhoria', 'europhoriaEnd', 'euphoriaFull', 'kickoff', 'half', 'fulltime', 'setpiece', 'penaltyAwarded', 'woodwork', 'save', 'shot', 'celebrate', 'event', 'bus', 'busSmash', 'shootoutStart', 'shootoutKick', 'shootoutEnd', 'advantage', 'diveBooked', 'diveWon', 'nutmeg', 'board', 'crowdThrow', 'tackleWon', 'launch', 'pass', 'header', 'bicycle', 'volley', 'catch', 'parry', 'screamer', 'goldenMoment', 'refHit']);
const R1 = v => Math.round(v), R100 = v => Math.round(v * 100);
EF.Hub = {
  on: false, info: null, card: null, role: null, sent: 0, received: 0, ended: null, menuOpen: false, snaps: [], evQ: [], evSeq: 0, applied: 0, lastSnap: 0, lastEv: 0, lastIn: 0, counters: [0, 0, 0, 0, 0, 0, 0, 0], inSeq: 0, finished: false, readied: false, pending: [],
  send(data, o) { if (this.ended) return false; try { const ok = AIHub.send(data, o); if (ok !== false) this.sent++; return ok; } catch (e) { return false; } },
  async connect() {
    this.on = true;
    let info = null;
    try { info = await AIHub.connect({ mode: 'shared-world', seats: [2, 4], card: true }); } catch (e) { game.fail('hub connect', e); }
    if (!info) { this.on = false; game.go('title'); return; }
    this.info = info; this.role = AIHub.server ? 'server' : AIHub.isHost ? 'host' : 'client';
    AIHub.on('card', c => { this.card = c; });
    AIHub.on('start', () => this.start());
    AIHub.on('message', (d, from) => this.message(d, from));
    AIHub.on('leave', e => this.leave(e));
    AIHub.on('time-up', () => this.timeUp());
    AIHub.on('end', e => this.end(e));
    this.setup();
    game.go('tunnel', { card: true, match: this.opts }, { fade: 0 });
    // the match is built: ready, with no key press
    this.readied = true; try { AIHub.ready(); } catch (e) { game.fail('hub ready', e); }
  },
  setup() {
    const R = AIHub.rng('setup'), T = EF.all('team').map(t => t.id), S = EF.all('stadium').filter(s => !s.training).map(s => s.id);
    const a = T[Math.floor(R() * T.length)]; let b = T[Math.floor(R() * T.length)]; if (b === a) b = T[(T.indexOf(a) + 1) % T.length];
    const stadium = S[Math.floor(R() * S.length)], seed = Math.floor(R() * 1e9);
    const players = this.info.players || [], limit = (this.info.limitMs || 240000) / 1000;
    const half = clamp(Math.min(90, (limit - 50) / 2), 45, 90);
    const slots = players.map((p, i) => ({ side: i % 2, hubId: p.id, label: String(p.name || 'P' + (i + 1)).slice(0, 12).toUpperCase(), color: i, local: p.id === AIHub.me && !AIHub.server }));
    const humans = [0, 1].map(s => slots.filter(x => x.side === s).length), buffs = [];
    if (players.length === 3) { const lone = humans[0] === 1 ? 0 : 1; buffs.push({ side: lone, kind: 'underdog' }); }
    this.opts = { home: a, away: b, stadium, seed, halfLength: half, draws: 'allowed', session: true, buffs, hubSlots: slots, noReplay: true };
  },
  buildMatch() {
    const o = this.opts;
    const slots = o.hubSlots.map(s => Object.assign({}, s, { ctl: s.local ? new HumanController(game.input) : this.role === 'client' ? null : new RemoteController() }));
    const m = new Match(Object.assign({}, o, { slots }));
    for (const sl of m.slots) if (!sl.ctl && this.role !== 'client') sl.menu = true;
    if (this.role === 'client') { m.mirror = true; for (const sl of m.slots) if (!sl.local) sl.ctl = null; }
    this.m = m; return m;
  },
  start() { if (this.ended) return; game.go('match', { session: true, match: this.buildMatch(), noReplay: true }, { fade: 0 }); this.startedAt = game.real; },
  /* ---- the card (the tunnel scene in card mode) ---- */
  cardUpdate(dt, sc) {
    const c = this.card || {};
    const ready = game.players.some(I => I.pressed('confirm') || I.pressed('pass')), more = game.players.some(I => I.pressed('through')) || (typeof window !== 'undefined' && this._tKey);
    this._tKey = false;
    const clk = game.input.clicked();
    if (ready || (clk && this.readyBtn && inR(clk, this.readyBtn))) { try { AIHub.answer('ready'); } catch (e) { /* */ } EF.sfx('menuPick'); }
    if (more || (clk && this.moreBtn && inR(clk, this.moreBtn))) { try { AIHub.answer('more'); } catch (e) { /* */ } EF.sfx('menuMove'); }
    void c; void dt; void sc;
  },
  cardDraw(g, r, sc) {
    const c = this.card || {}, info = this.info || { players: [] }, W = Math.min(r.W - 30, 400), x = Math.round(r.W / 2 - W / 2), y = Math.round(r.H * .05), o = this.opts;
    EF.panel(g, x, y, W, Math.round(r.H * .86), { alpha: .9 });
    EF.heading(g, 'EUROPHORIA FOOTBALL', r.W / 2, y + 6, 2);
    const t0 = EF.get('team', o.home), t1 = EF.get('team', o.away);
    EF.drawCrest(g, t0, x + 30, y + 44, 26); EF.drawCrest(g, t1, x + W - 30, y + 44, 26);
    E.font.text(g, t0.name + '  vs  ' + t1.name, r.W / 2, y + 32, '#ffffff', { align: 'center', outline: false }); E.font.text(g, EF.get('stadium', o.stadium).name, r.W / 2, y + 44, '#ffe08a', { align: 'center', font: 'tiny', outline: false });
    E.font.text(g, 'HOW TO WIN: OUTSCORE THE OTHER SIDE BEFORE THE FINAL WHISTLE', r.W / 2, y + 60, '#ffc83a', { align: 'center', outline: false, wrap: W - 20 });
    const cols = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
    (info.players || []).forEach((p, i) => { const s = i % 2, px0 = s ? x + W * .55 : x + 16, py = y + 80 + Math.floor(i / 2) * 14; px.rect(g, px0, py, 8, 8, cols[i % 4]); E.font.text(g, String(p.name || 'P' + (i + 1)).slice(0, 14).toUpperCase() + ((c.ready || []).includes(p.id) ? '  OK' : ''), px0 + 12, py, '#ffffff', { outline: false }); E.font.text(g, s ? t1.short : t0.short, px0 + W * .38, py, '#9aa6c8', { outline: false }); });
    EF.promptRow(g, r.W / 2, y + 116, [['up', 'MOVE'], ['pass', 'PASS'], ['shoot', 'SHOOT (HOLD)'], ['lob', 'LOB'], ['sprint', 'SPRINT']]);
    EF.promptRow(g, r.W / 2, y + 132, [['skill', 'SKILL'], ['switch', 'SWITCH'], ['dive', 'THEATRICS'], [EF.deviceOf(game.input) === 'gamepad' ? ['switch', 'skill'] : 'euphoria', 'EUROPHORIA']]);
    const left = c.paused ? 'PAUSED' : c.starting ? 'STARTING...' : c.left != null ? Math.ceil(c.left / 1000) + ' S' : '...';
    E.font.text(g, 'STARTS IN: ' + left + (c.asking ? '   (' + c.asking + ' ASKED FOR MORE TIME)' : ''), r.W / 2, y + 150, '#c8d0f0', { align: 'center', outline: false });
    this.readyBtn = [Math.round(r.W / 2 - 150), y + 166, 140, 26]; this.moreBtn = [Math.round(r.W / 2 + 10), y + 166, 140, 26];
    EF.panel(g, ...this.readyBtn, { border: '#5aff7a' }); EF.prompt(g, this.readyBtn[0] + 10, this.readyBtn[1] + 7, 'confirm', 'READY');
    EF.panel(g, ...this.moreBtn, { border: c.asked ? '#ff9ae0' : '#ffc83a' }); EF.prompt(g, this.moreBtn[0] + 10, this.moreBtn[1] + 7, 'through', c.asked ? 'MORE TIME (ASKED)' : 'MORE TIME (T)');
  },
  /* ---- messages ---- */
  message(d, from) {
    this.received++;
    if (!d || typeof d !== 'object') return;
    const m = this.m;
    if (this.role !== 'client') {
      if (!m) return;
      const sl = m.slots.find(s => s.hubId === from); if (!sl) return;
      if (d.t === 'i' && sl.ctl && sl.ctl.feed) sl.ctl.feed(d, game.real);
      if (d.t === 'duel' && m.duel && m.duel.slot === sl.i) m.duelPress(d.at);
      if (d.t === 'cel' && sl.ctl) sl.ctl.cel = d.k;
      if (d.t === 'menu') sl.menu = !!d.open;
    } else {
      if (d.t === 's') { this.snaps.push(Object.assign(d, { rt: game.real })); if (this.snaps.length > 12) this.snaps.shift(); if (d.over) this.lastOver = d; }
      if (d.t === 'E') for (const e of d.list) if (e[0] > this.applied) { this.applied = e[0]; this.pending.push(e); }
    }
  },
  leave(e) { const m = this.m; if (!m) return; const sl = m.slots.find(s => s.hubId === e.id); if (sl) { sl.ctl = null; sl.menu = true; sl.left = true; if (sl.f) sl.f.human = null; sl.f = null; } },
  timeUp() { if (this.role !== 'client' && !this.finished) this.finish(); },
  end(e) {
    this.ended = e || { reason: 'finished' };
    EF.music(null); EF.crowdAudio.stop(); try { A.music(null); A.mute(true); } catch (er) { /* */ }
    game.input.consumeAll();
  },
  finish() {
    const m = this.m; if (!m || this.finished) return; this.finished = true;
    this.send(this.snapshot(m, true), { reliable: true });
    const players = (this.info.players || []).map(p => p.id).filter(id => { const sl = m.slots.find(s => s.hubId === id); return sl && !sl.left; });
    const sideOf = id => (m.slots.find(s => s.hubId === id) || {}).side;
    const w = m.score[0] > m.score[1] ? 0 : m.score[1] > m.score[0] ? 1 : -1;
    const standings = w < 0 ? [players] : [players.filter(id => sideOf(id) === w), players.filter(id => sideOf(id) !== w)].filter(a => a.length);
    const scores = {}, stats = {};
    for (const id of players) { const s = sideOf(id), sl = m.slots.find(x => x.hubId === id), f = sl && sl.f; scores[id] = m.score[s]; stats[id] = { Goals: m.goals.filter(g => g.side === s && !g.own).length, Shots: m.stats[s].shots, Tackles: m.stats[s].tackles }; void f; }
    let best = null, bv = -1; for (const id of players) { const v = (stats[id].Goals * 3 + stats[id].Tackles + stats[id].Shots * .5) + (sideOf(id) === w ? 2 : 0); if (v > bv) { bv = v; best = id; } }
    const awards = best != null ? [{ id: best, title: 'Player of the Match', detail: m.teams[sideOf(best)].name + ' ' + m.score[0] + '-' + m.score[1] }] : [];
    try { AIHub.finish({ standings, scores, stats, awards }); } catch (e) { game.fail('hub finish', e); }
  },
  /* ---- the host's side ---- */
  snapshot(m, over) {
    const b = m.ball, o = m.official;
    const p = m.players.map(f => { const b2 = f.body, fl = (f.cards & 3) | (f.glow ? 4 : 0) | (f.human != null ? 8 : 0) | (f.sprinting ? 16 : 0) | (f.set ? 32 : 0) | (f.dejected ? 64 : 0) | (f.celebrate ? 128 : 0);
      return [R1(b2.x), R1(b2.y), R1(b2.z), R1(b2.vx), R1(b2.vy), R100(f.facing), Math.max(0, ST_CODES.indexOf(f.state)), Math.max(0, ACT_CODES.indexOf(f.act ? f.act.name : null)), f.act ? R100(f.act.t / f.act.dur) : 0, fl, R100(f.diveU || 0), f.tiltSide || 0, f.celebrate && f.celebrate.id ? f.celebrate.id : f.celebrate === 'pile' ? 1 : 0]; });
    const sp = m.sp && m.sp.phase !== 'taken' ? [SP_CODES.indexOf(m.sp.kind), m.sp.taker ? m.sp.taker.id : -1, m.sp.side, m.sp.phase === 'aim' ? 1 : 0] : 0;
    return { t: 's', n: ++this.snapN, at: Math.round(AIHub.time()), b: [R1(b.x), R1(b.y), R1(b.z), R1(b.vx), R1(b.vy), R1(b.vz), Math.round(b.roll || 0) % 1000, m.owner ? m.owner.id : -1, b.superPath ? 1 : 0],
      p, r: o ? [R1(o.body.x), R1(o.body.y), R100(o.facing), o.sig ? ['whistle', 'card', 'advantage', 'point', 'ear', 'tv'].indexOf(o.sig) + 1 : 0, o.downT > 0 ? 1 : 0] : 0,
      m: [MODE_CODES.indexOf(m.mode), Math.round(m.clock * 10), m.half, m.score[0], m.score[1], R1(m.euph[0]), R1(m.euph[1]), Math.round(m.euroT[0] * 10), Math.round(m.euroT[1] * 10), m.swapped ? 1 : 0, m.stoppage, m.boardShown ? 1 : 0],
      c: m.slots.map(s => s.f ? s.f.id : -1), sp, d: m.duel ? [m.duel.slot, Math.round(m.duel.t * 100)] : 0, so: m.so ? [m.so.kicks[0].map(k => k ? 1 : 0).join(''), m.so.kicks[1].map(k => k ? 1 : 0).join(''), m.so.score[0], m.so.score[1]] : 0, over: over ? 1 : 0 };
  },
  hostStep(dt) {
    const m = this.m; if (!m || this.ended) return;
    const now = game.real;
    if (now - this.lastSnap >= 1 / 14) { this.lastSnap = now; this.send(this.snapshot(m), { reliable: false }); }
    if (this.evQ.length && now - this.lastEv >= .2) { this.lastEv = now; const list = this.evQ.splice(0, 40); this.send({ t: 'E', n: ++this.evN, list }, { reliable: true }); }
    if (m.mode === 'over' && !this.finished && m.modeT > 1.5) this.finish();
  },
  hostEvent(type, ev) {
    if (!FWD_EVENTS.has(type) || this.role === 'client') return;
    const d = {}; for (const k of ['who', 'side', 'kind', 'name', 'minute', 'result', 'id', 'overturned', 'goal', 'second', 'power', 'onTarget', 'fresh', 'half', 'slot', 'add', 'inBox', 'super']) if (ev[k] !== undefined && ev[k] !== null) d[k] = typeof ev[k] === 'number' ? Math.round(ev[k] * 100) / 100 : ev[k];
    this.evQ.push([++this.evSeq, Math.round(AIHub.time()), type, d]);
    if (this.evQ.length > 60) this.evQ.shift();
  },
  /* ---- the client's side ---- */
  clientStep(dt) {
    const m = this.m; if (!m || this.ended) return;
    const sl = m.slots.find(s => s.local);
    // input to the host, 15 a second; every press counted
    if (sl && sl.ctl && !this.menuOpen) {
      const it = sl.ctl.intent(m, sl), keys = ['pass', 'shoot', 'lob', 'through', 'skill', 'sw', 'dive'];
      keys.forEach((k, i) => { if (it[k] && it[k].pressed) this.counters[i]++; }); if (it.euphoria) this.counters[7]++;
      const bits = (it.sprint ? 1 : 0) | (it.pass.down ? 2 : 0) | (it.shoot.down ? 4 : 0) | (it.lob.down ? 8 : 0) | (it.through.down ? 16 : 0) | (it.skill.down ? 32 : 0) | (it.sw.down ? 64 : 0) | (it.dive.down ? 128 : 0);
      if (game.real - this.lastIn >= 1 / 15) { this.lastIn = game.real; this.send({ t: 'i', s: ++this.inSeq, at: Math.round(AIHub.time()), m: [R100(it.move[0]), R100(it.move[1])], a: it.aim ? [R100(clamp(it.aim[0] / 100, -1, 1)), R100(clamp(it.aim[1] / 100, -1, 1))] : 0, h: bits, c: this.counters.slice() }, { reliable: false }); }
      if (m.duel && m.duel.slot === sl.i && !m.duel.sent && sl.ctl.duelPressed()) { m.duel.sent = true; this.send({ t: 'duel', at: m.duel.t }, { reliable: true }); }
      if (m.celebration && !m.celebration.sent) { const k = sl.ctl.celebPick(); if (k >= 0) { m.celebration.sent = true; this.send({ t: 'cel', k }, { reliable: true }); } }
      if (it.pass.pressed || it.shoot.pressed) { EF.sfx('touch'); sl.ctl.I.rumble && sl.ctl.I.rumble(.15, .05); }
    }
    this.applyMirror(dt);
    for (const e of this.pending.splice(0)) { const [, , type, d] = e; const ev = Object.assign({ match: m, t: m.t }, d); EF.bus.emit(type, ev); if (type === 'saveDuel') m.duel = { slot: d.slot, t: 0, target: 1 }; if (type === 'saveDuelResult') m.duel = null; if (type === 'goal' || type === 'ownGoal') m.celebration = { side: d.side, t: 0, scorer: d.who != null ? m.players[d.who] : null, picked: false }; if (type === 'kickoff') m.celebration = null; }
    if (m.duel) m.duel.t += dt / Math.max(.05, game.timeScale);
    if (m.celebration) { m.celebration.t += dt; if (m.celebration.t > 3.5) m.celebration = null; }
  },
  applyMirror(dt) {
    const m = this.m, S = this.snaps; if (!S.length) return;
    const rt = game.real - .1;
    let a = S[0], b = S[S.length - 1];
    for (let i = 0; i < S.length - 1; i++) if (S[i].rt <= rt && S[i + 1].rt >= rt) { a = S[i]; b = S[i + 1]; break; }
    let u = b.rt > a.rt ? clamp((rt - a.rt) / (b.rt - a.rt), 0, 1) : 1;
    if (rt > b.rt) { a = b; u = 0; }   // late: hold (extrapolate a little by velocity)
    const ext = rt > b.rt ? Math.min(.15, rt - b.rt) : 0, L = (p, q) => p + (q - p) * u;
    const fresh = this.lastOver || b;
    m.players.forEach((f, i) => {
      const A1 = a.p[i], B1 = b.p[i]; if (!A1 || !B1) return;
      f.body.x = L(A1[0], B1[0]) + B1[3] * ext; f.body.y = L(A1[1], B1[1]) + B1[4] * ext; f.body.z = L(A1[2], B1[2]); f.body.vx = B1[3]; f.body.vy = B1[4];
      f.facing = B1[5] / 100; const st = ST_CODES[B1[6]] || 'run'; if (st !== f.state) { f.state = st; f.stateT = 0; } else f.stateT += dt;
      const an = ACT_CODES[B1[7]]; f.act = an ? { name: an, t: B1[8] / 100 * .4, dur: .4 } : null;
      const fl = B1[9]; f.cards = fl & 3; f.glow = !!(fl & 4); f.sprinting = !!(fl & 16); f.set = !!(fl & 32); f.dejected = !!(fl & 64);
      f.celebrate = fl & 128 ? (B1[12] && EF.get('celebration', B1[12]) ? EF.get('celebration', B1[12]) : 'pile') : null;
      f.diveU = B1[10] / 100; f.tiltSide = B1[11]; f.sentOff = st === 'off' || st === 'gone';
    });
    const bb = m.ball, A2 = a.b, B2 = b.b;
    bb.x = L(A2[0], B2[0]) + B2[3] * ext; bb.y = L(A2[1], B2[1]) + B2[4] * ext; bb.z = L(A2[2], B2[2]); bb.vx = B2[3]; bb.vy = B2[4]; bb.vz = B2[5]; bb.roll = (bb.roll || 0) + hyp(bb.vx, bb.vy) * dt; bb.superPath = B2[8] ? 'rocket' : null;
    m.owner = B2[7] >= 0 ? m.players[B2[7]] : null;
    if (b.r) { if (!m.official) refStep(m, 0); const o = m.official; o.body.x = L(a.r ? a.r[0] : b.r[0], b.r[0]); o.body.y = L(a.r ? a.r[1] : b.r[1], b.r[1]); o.facing = b.r[2] / 100; o.sig = ['whistle', 'card', 'advantage', 'point', 'ear', 'tv'][b.r[3] - 1] || null; o.downT = b.r[4] ? 1 : 0; }
    const M = fresh.m; m.mode = MODE_CODES[M[0]] || 'play'; m.clock = M[1] / 10; m.half = M[2]; m.score = [M[3], M[4]]; m.euph = [M[5], M[6]]; m.euroT = [M[7] / 10, M[8] / 10]; m.swapped = !!M[9]; m.stoppage = M[10]; m.boardShown = !!M[11];
    m.slots.forEach((s, i) => { const id = b.c[i]; const f = id >= 0 ? m.players[id] : null; if (s.f && s.f !== f) s.f.human = null; s.f = f; if (f) f.human = i; });
    if (b.sp) { const kind = SP_CODES[b.sp[0]], taker = m.players[b.sp[1]], local = m.slots.find(s => s.local); m.sp = m.sp && m.sp.kind === kind ? m.sp : { kind, side: b.sp[2], ring: { x: m.goalX(b.sp[2]) - m.dir(b.sp[2]) * 70, y: P.CY }, zone: [1, 0], aimY: 0, aimZ: .5, power: 0, wall: [] }; m.sp.taker = taker; m.sp.phase = b.sp[3] ? 'aim' : 'setup'; m.sp.human = local && local.f === taker ? local : null; m.sp.shootable = kind === 'freekick'; }
    else m.sp = null;
    if (b.so) { m.so = m.so || { kicks: [[], []], score: [0, 0] }; m.so.kicks = [b.so[0].split('').map(c => c === '1'), b.so[1].split('').map(c => c === '1')]; m.so.score = [b.so[2], b.so[3]]; }
    m.t += dt;
  }
};
const inR = (p, r) => p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3];
EF.Hub.snapN = 0; EF.Hub.evN = 0;
EF.bus.on('*', ev => { if (EF.Hub.on && EF.Hub.m && ev.match === EF.Hub.m && EF.Hub.role !== 'client') EF.Hub.hostEvent(ev.type, ev); });
if (!game.headless && typeof addEventListener === 'function') addEventListener('keydown', e => { if (SESSION && e.code === 'KeyT') EF.Hub._tKey = true; });
/* ---- the waiting scene and the session settings overlay ---- */
EF.scenes.hubwait = {
  touch: [], view: 'broadcast',
  enter() { this.t = 0; this.stage = new Stage('euphorium', { weather: false }); EF.Hub.connect(); },
  update(dt) { this.t += dt; this.stage.update(dt); game.focus(P.CX, P.CY - 40, 0); if (EF.Hub.info && !EF.Hub.ended) EF.Hub.cardUpdate(dt, this); },
  draw(r) { this.stage.draw(r); r.overlay(g => { EF.heading(g, 'EUROPHORIA FOOTBALL', r.W / 2, r.H * .3, 3); E.font.text(g, 'CONNECTING' + '...'.slice(0, 1 + Math.floor(this.t * 3) % 3), r.W / 2, r.H * .5, '#ffe08a', { align: 'center', scale: 2, outline: '#000' }); }); }
};
EF.Hub.settingsMenu = () => {
  const M = new UIMenu({ onBack: () => EF.Hub.toggleMenu(false) });
  const sl = (k, label) => ({ kind: 'slider', label, min: 0, max: 1, step: .1, get: () => game.settings[k], set: v => game.settings.set(k, v) });
  M.list = () => [sl('volume', 'VOLUME'), sl('music', 'MUSIC'), sl('effects', 'EFFECTS'), sl('voices', 'VOICES'), sl('crowd', 'CROWD'), { kind: 'choice', label: 'BUTTON SYMBOLS', get: () => game.settings.glyphs, set: v => game.settings.set('glyphs', v), options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']] }, { label: 'BACK TO THE MATCH', onPick: () => EF.Hub.toggleMenu(false) }];
  return M;
};
EF.Hub.toggleMenu = on => {
  const H = EF.Hub; H.menuOpen = on; if (on) H.menu = H.settingsMenu();
  const m = H.m; if (!m) return;
  const sl = m.slots.find(s => s.local);
  if (sl) { if (H.role === 'client') H.send({ t: 'menu', open: on }, { reliable: true }); else sl.menu = on; }
  game.input.consumeAll();
};
EF.Hub.overlayUpdate = dt => {
  const H = EF.Hub, I = game.input;
  const createHeld = I.held && (I.held.has ? I.held.has('Pad8') : false);
  if (!H.menuOpen && (I.pressed('pause') && !createHeld)) { H.toggleMenu(true); return true; }
  if (!H.menuOpen) return false;
  const r = { W: game.W, H: game.H }, L = H.menu.list(); EF.layoutColumn(r, L.length, { w: 260, h: 20, gap: 4 }).forEach((rc, i) => { L[i].rect = rc; L[i].scale = 1; });
  H.menu.set(L); H.menu.update(dt);
  return true;
};
EF.Hub.overlayDraw = r => {
  const H = EF.Hub;
  if (H.ended) { r.overlay(g => { px.blend(g, .6, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#000010')); const why = H.ended.reason, m = H.m; EF.heading(g, why === 'void' || why === 'host-left' ? 'ROUND VOID' : why === 'sat-out' ? 'YOU SAT THIS ONE OUT' : 'FULL TIME', r.W / 2, r.H * .3, 3); if (m && why !== 'sat-out') E.font.text(g, m.teams[0].name + ' ' + m.score[0] + ' - ' + m.score[1] + ' ' + m.teams[1].name, r.W / 2, r.H * .5, '#ffffff', { align: 'center', outline: '#000' }); }); return; }
  if (H.menuOpen) r.overlay(g => { px.blend(g, .5, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#000010')); EF.heading(g, 'SESSION SETTINGS', r.W / 2, 16, 2); E.font.text(g, 'THE MATCH GOES ON: THE CPU HAS YOUR PLAYER', r.W / 2, 38, '#ffe08a', { align: 'center', outline: '#000' }); H.menu.draw(g); EF.footer(g, r, [['confirm', 'CHANGE'], ['cancel', 'BACK']]); });
};
