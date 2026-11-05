/* AI HUB SESSIONS (section 6.28; AI Hub Session Protocol v1, mode shared-world, 2-4 players). The host's copy runs
 * the match; the others send it their player's input and draw the world it sends: snapshots 14 a second (unreliable,
 * under 1,100 bytes) and the events, coalesced, at most 5 a second (reliable). Clients draw 100 ms behind, interpolating.
 * The game's own card is the tunnel scene. A draw stands. Nothing here runs outside a session. */
const ST_CODES = ['run', 'kick', 'poke', 'slide', 'barge', 'skill', 'air', 'down', 'launched', 'getup', 'dive', 'celebrate', 'keeper-dive', 'keeper-hold', 'keeper-throw', 'smother', 'off', 'setpiece', 'stumble', 'super'];
const MODE_CODES = ['kickoff', 'play', 'setpiece', 'goal', 'celebrate', 'replay', 'var', 'card', 'halftime', 'fulltime', 'shootout', 'over'];
const KICK_CODES = [null].concat(Object.keys(EF.KICKS));
const POSE_CODES = [null, 'guard', 'cheer', 'cast', 'kneel', 'hips', 'crouch', 'wave'];
const CLIP_CODES = [null, 'Slide_Loop', 'OverhandThrow', 'Victory', 'Cheer_One_arm', 'Cheering_Two_Hands', 'Dance_Simple', 'Angry', 'Backflip', 'Shrug', 'Greeting', 'Cartwheel', 'Breakdance_Helicopter', 'Dodge_left', 'Dodge_right', 'Get_Up_From_Side'];
const SP_CODES = [null, 'kickoff', 'goalkick', 'corner', 'freekick', 'penalty', 'throwback'];
const FWD_EVENTS = ['goal', 'ownGoal', 'shot', 'pass', 'woodwork', 'save', 'catch', 'parry', 'tip', 'whistle', 'card', 'foul', 'slide', 'knockdown', 'launched', 'tackleWon', 'skill', 'nutmeg', 'rainbow', 'header', 'volley', 'bicycle', 'europhoria', 'europhoriaEnd', 'euphoriaLevel', 'euphoriaFull', 'superCharge', 'superStrike', 'saveDuel', 'saveDuelResult', 'var', 'varDecision', 'diveBooked', 'diveWon', 'dive', 'notice', 'half', 'fulltime', 'kickoff', 'corner', 'penaltyAwarded', 'crowdBall', 'nearMiss', 'netHit', 'event', 'bus', 'busSmashed', 'celebrate', 'celebrateStart', 'stoppage', 'advantage', 'sendOff', 'hammer', 'splash'];
const r1 = v => Math.round(v), q100 = v => Math.round(v * 100);
EF.Hub = {
  role: null, info: null, sent: 0, received: 0, ended: null, card: null, me: null, snaps: [], evSeq: 0, evOut: [], evIn: -1, lastSnap: -1, lastEv: -1, lastIn: -1, menuOpen: false, presses: [0, 0, 0, 0, 0, 0, 0, 0], seq: 0,
  get active() { return EF.inSession && !!this.info; },
  send(data, reliable) { if (this.ended) return false; try { const ok = AIHub.send(data, { reliable: !!reliable }); if (ok !== false) this.sent++; return ok; } catch (e) { return false; } },
  /** connect; with null, play as a normal game */
  async connect() {
    let info = null;
    try { info = await AIHub.connect({ mode: 'shared-world', seats: [2, 4], card: true }); } catch (e) { info = null; }
    if (!info) { EF.inSession = false; game.go('title', {}); return; }
    this.info = info; this.me = info.me; this.role = info.server ? 'server' : info.isHost ? 'host' : 'client';
    AIHub.on('message', (d, from) => this.message(d, from));
    AIHub.on('card', c => { this.card = c; this.cardAt = performance.now(); });
    AIHub.on('start', s => { this.started = true; this.startIn = s && s.in; if (game.sceneName === 'tunnel') this.goMatch(); });
    AIHub.on('leave', ev => this.leave(ev));
    AIHub.on('time-up', () => { if (this.role !== 'client') this.finish(true); });
    AIHub.on('end', ev => this.end(ev));
    this.opts = this.setup(info);
    game.go('tunnel', { card: true, opts: this.opts, next: { scene: 'match', data: {} } });
  },
  /** the round from the shared seed: two teams, a stadium, its weather; seats alternate HOME and AWAY */
  setup(info) {
    const R = AIHub.rng('setup'), teams = H.shuffle(R, EF.TEAM_IDS), st = EF.CUP_STADIUMS[Math.floor(R() * 5)];
    const players = info.players || [], sides = players.map((p, i) => i % 2), n0 = sides.filter(s => s === 0).length, n1 = sides.length - n0;
    const half = clamp(((info.limitMs || 240000) / 1000 - 50) / 2, 45, 90);
    const buffs = [{}, {}]; if (players.length === 3) buffs[n0 < n1 ? 0 : 1].euphoriaGain = 1.5;
    this.sideOf = {}; players.forEach((p, i) => { this.sideOf[p.id] = sides[i]; });
    return { home: teams[0], away: teams[1], stadium: st, kind: 'session', seed: Math.floor(R() * 1e9), halfLength: half, draws: 'allowed', buffs, noVar: false, kits: EF.Art.pickKits(EF.get('team', teams[0]), EF.get('team', teams[1])), weather: R() < .3 ? { kind: R() < .5 ? 'rain' : 'snow', amount: .6, wind: .2 } : undefined };
  },
  humans() {
    const info = this.info, out = [];
    (info.players || []).forEach(p => {
      const side = this.sideOf[p.id], local = p.id === this.me && this.role !== 'server';
      if (this.role === 'client') out.push({ id: p.id, side, name: p.name, color: p.color, remote: !local, input: local ? game.input : null, ctl: { peek: () => ({ move: [0, 0] }), intent: () => EF.Intent.make() } });
      else out.push(local ? { input: game.input, side, id: p.id, name: p.name, color: p.color } : { remote: true, side, id: p.id, name: p.name, color: p.color, ctl: new RemoteController(p.id) });
    });
    return out;
  },
  /* ---- the card: the tunnel scene in card mode ---- */
  cardEnter(sc) { if (!this.readied) { this.readied = true; try { AIHub.ready(); } catch (e) { /* hub gone */ } } sc.answered = null; },
  cardStep(dt, sc) {
    if (this.started && !this.goneMatch) return this.goMatch();
    const I = game.input, c = I.clicked && I.clicked();
    if (this.ended) return;
    if (I.pressed('confirm') || I.pressed('start') || (c && sc.readyBtn && inBox(c, sc.readyBtn))) { if (sc.answered !== 'ready') { sc.answered = 'ready'; AIHub.answer('ready'); EF.sfx('confirm'); } }
    if (I.pressed('through') || (c && sc.moreBtn && inBox(c, sc.moreBtn)) || this.keyT) { this.keyT = false; AIHub.answer('more'); EF.sfx('select'); }
  },
  cardDraw(g, r, sc) {
    const [mx, my] = EF.HUD.margin(r), info = this.info, c = this.card || {}, o = this.opts, T = [EF.get('team', o.home), EF.get('team', o.away)];
    const w = Math.min(r.W - 2 * mx, 360), bh = Math.min(r.H - 2 * my - 26, 196), x = Math.round(r.W / 2 - w / 2), y = Math.max(my + 22, Math.round((r.H - bh) / 2));
    E.font.title(g, 'EUROPHORIA FOOTBALL', r.W / 2, y - 20, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
    E.ui.box(g, x, y, w, bh, { bg: ['#0d1430', '#16224a'], border: '#ffc83a', alpha: .92 });
    for (const s of [0, 1]) { const cx = s ? x + w - 50 : x + 50; EF.drawCrest(g, T[s], cx, y + 24, 26); E.font.text(g, T[s].short + (s ? ' (AWAY)' : ' (HOME)'), cx, y + 42, '#ffffff', { align: 'center', font: 'tiny', outline: false });
      (info.players || []).filter(p => this.sideOf[p.id] === s).forEach((p, i) => { const ready = (c.ready || []).includes(p.id); E.font.text(g, (ready ? '✓ ' : '  ').replace('✓', '*') + String(p.name).slice(0, 14) + (p.id === this.me ? ' (YOU)' : ''), cx, y + 52 + i * 10, p.color || '#fff', { align: 'center', outline: '#000' }); }); }
    E.font.text(g, 'HOW TO WIN', r.W / 2, y + 8, '#ffc83a', { align: 'center', outline: false });
    E.font.text(g, 'Outscore the other side before the final whistle', r.W / 2, y + 18, '#ffffff', { align: 'center', font: 'tiny', outline: false, wrap: w - 150 });
    E.font.text(g, EF.get('stadium', o.stadium).name, r.W / 2, y + 40, '#9aa6c8', { align: 'center', font: 'tiny', outline: false });
    const cy = y + 84; EF.prompts(g, r.W / 2, cy, [['up', 'MOVE'], ['pass', 'PASS'], ['shoot', 'SHOOT (HOLD)'], ['lob', 'LOB']], { input: game.input }); EF.prompts(g, r.W / 2, cy + 14, [['sprint', 'SPRINT'], ['skill', 'SKILL'], ['euphoria', 'EUROPHORIA']], { input: game.input });
    const left = c.paused ? 'PAUSED' : c.starting ? 'STARTING...' : c.left !== null && c.left !== undefined ? Math.max(0, Math.ceil((c.left - (performance.now() - (this.cardAt || 0))) / 1000)) + ' S' : '...';
    E.font.text(g, left, r.W / 2, cy + 34, c.paused ? '#ff7a6a' : '#ffffff', { align: 'center', scale: 2, outline: '#000' });
    const bw = 104, by = y + bh - 28; sc.readyBtn = [Math.round(r.W / 2 - bw - 6), by, bw, 20]; sc.moreBtn = [Math.round(r.W / 2 + 6), by, bw, 20];
    E.ui.box(g, ...sc.readyBtn, { bg: sc.answered === 'ready' ? ['#1a5a2a', '#2a7a3a'] : ['#1c2a5c', '#2a3a74'], border: '#ffc83a' }); EF.prompt(g, sc.readyBtn[0] + 6, by + 4, 'confirm', sc.answered === 'ready' ? 'READY!' : 'READY', { input: game.input });
    E.ui.box(g, ...sc.moreBtn, { bg: c.asked ? ['#5a3a1a', '#7a4a2a'] : ['#1c2a5c', '#2a3a74'], border: '#9aa6c8' }); EF.prompt(g, sc.moreBtn[0] + 6, by + 4, game.input.lastDevice === 'gamepad' ? 'Pad3' : 'KeyT', c.asked ? 'ASKED' : 'MORE TIME', { input: game.input });
    if (this.ended) this.endDraw(g, r);
  },
  goMatch() { if (this.goneMatch) return; this.goneMatch = true; game.go('match', { opts: Object.assign({}, this.opts, { humans: this.humans() }), session: true, onEnd: res => this.finish(false, res) }); },
  /* ---- the match in a session: the countdown, the host's sending, the client's mirror ---- */
  sessionUpdate(dt, c) {
    const m = c.m, now = AIHub.time();
    if (this.ended) { c.view.update(dt, c.src); return true; }
    this.menuStep(dt);
    if (this.role === 'client') { this.clientStep(dt, c, now); return true; }
    if (now < 0) { c.view.update(dt, m); EF.Camera.update(dt, m, m); this.hostSend(m, now); return true; }
    return false;
  },
  matchStep(dt, c) { if (!EF.inSession || !this.info || this.role === 'client' || this.ended) return; this.hostSend(c.m, AIHub.time()); },
  hostSend(m, now) {
    if (!m.hubBus) { m.hubBus = EF.bus.on('*', ev => { if (ev.match === m && FWD_EVENTS.includes(ev.type)) this.evOut.push([++this.evSeq, Math.round(AIHub.time()), ev.type, this.evData(ev)]); }); }
    const t = performance.now();
    if (t - this.lastSnap >= 1000 / 14) { this.lastSnap = t; this.send(this.snapshot(m, now), false); }
    if (this.evOut.length && t - this.lastEv >= 200) { this.lastEv = t; this.send({ t: 'E', list: this.evOut.splice(0, 40) }, true); }
  },
  evData(ev) {
    const d = {}; if (ev.who && ev.who.id !== undefined && ev.who.data) d.w = ev.who.id; if (ev.side !== undefined) d.s = ev.side;
    for (const k of ['x', 'y', 'z']) if (typeof ev[k] === 'number') d[k] = r1(ev[k]);
    for (const k of ['kind', 'color', 'result', 'text', 'sub', 'id', 'power', 'screamer', 'level', 'overturned', 'second', 'super', 'name', 'chain', 'surf']) if (ev[k] !== undefined && ev[k] !== null && typeof ev[k] !== 'object') d[k] = ev[k];
    if (ev.victim && ev.victim.id !== undefined) d.v = ev.victim.id; if (ev.goal) d.g = { kind: ev.goal.kind, name: ev.goal.name, minute: ev.goal.minute, own: ev.goal.own, super: ev.goal.super };
    if (ev.type === 'saveDuel') d.at = Math.round(AIHub.time()), d.h = ev.human;
    if (ev.type === 'celebrateStart' && ev.who) { const C = ev.match.celebration; if (C) { d.o = C.offer.map(x => x.id); d.h = C.human ? C.human.id : null; } }
    return d;
  },
  snapshot(m, now) {
    const b = m.ball, own = m.owner ? m.owner.id : -1;
    const p = m.players.map(f => { const L = f.look, B = f.body, tl = L.tilt; return [r1(B.x), r1(B.y), r1(B.z), r1(B.vx), r1(B.vy), q100(f.facing + (L.spin || 0)), ST_CODES.indexOf(f.state), Math.max(0, KICK_CODES.indexOf(f.kickName)), q100(f.kickT), tl ? (tl.axis === 'forward' ? 1 : 2) : 0, tl ? q100(tl.angle) : 0, tl ? r1(tl.lift || 0) : 0, Math.max(0, POSE_CODES.indexOf(L.pose)), L.clip ? Math.max(0, CLIP_CODES.indexOf(L.clip.name)) : 0, L.clip ? q100(L.clip.t) : 0, (f.sentOff ? 1 : 0) | (f.ghost ? 2 : 0) | (f.charging ? 4 : 0) | (L.down ? 8 : 0) | (L.sprint ? 16 : 0) | (L.hurt ? 32 : 0)]; });
    const R = m.ref, EU = m.europhoria;
    return { t: 's', at: Math.round(now), b: [r1(b.x), r1(b.y), r1(b.z), r1(b.vx), r1(b.vy), r1(b.vz), own, b.superPath ? 1 : 0], p, r: [r1(R.body.x), r1(R.body.y), q100(R.facing), R.state === 'down' ? 1 : 0, R.signal ? ['whistle', 'point', 'card', 'advantage', 'ear', 'var'].indexOf(R.signal) + 1 : 0],
      m: [MODE_CODES.indexOf(m.mode), Math.round(m.clock * 10), m.half, m.score[0], m.score[1], r1(m.euphoria[0]), r1(m.euphoria[1]), EU ? EU.side : -1, EU ? Math.round(EU.t * 10) : 0, SP_CODES.indexOf(m.setpiece ? m.setpiece.kind : null), m.stoppage, m.superUsed ? 1 : 0],
      c: m.humans.map(h => [h.id, h.fb ? h.fb.id : -1]), o: m.over ? 1 : 0 };
  },
  /* ---- the client: interpolate the host's world 100 ms behind ---- */
  clientStep(dt, c, now) {
    const m = c.m;
    // send this player's input 15 times a second (counters for presses, so a lost packet loses none)
    const I = game.input, t = performance.now();
    if (!this.menuOpen && this.role === 'client') {
      const mv = I.move(), d = Math.hypot(mv[0], mv[1]) > .05 ? game.view.screenDirToGround(mv[0], mv[1]) : [0, 0], k = Math.min(1, Math.hypot(mv[0], mv[1]));
      ['pass', 'shoot', 'lob', 'through', 'skill', 'switch', 'dive', 'euphoria'].forEach((a, i) => { if (I.pressed(a)) { this.presses[i]++; EF.sfx('touch', { vol: .5 }); if (I.rumble) I.rumble(.15, .05); } });
      this.held = (I.down('sprint') ? 1 : 0) | (I.down('pass') ? 2 : 0) | (I.down('shoot') ? 4 : 0) | (I.down('lob') ? 8 : 0) | (I.down('through') ? 16 : 0) | (I.down('skill') ? 32 : 0) | (I.down('switch') ? 64 : 0) | (I.down('dive') ? 128 : 0);
      this.mv = [q100(d[0] * k), q100(d[1] * k)];
      if (t - this.lastIn >= 1000 / 15) { this.lastIn = t; this.send({ t: 'i', s: ++this.seq, at: Math.round(now), m: this.mv, h: this.held, c: this.presses.slice() }, false); }
      if (m.duel && m.duel.mine && m.duel.press === null && I.pressed('pass')) { m.duel.press = (now - m.duel.startAt) / 1000; this.send({ t: 'duel', at: Math.round(now) }, true); }
    }
    // apply the snapshots: 100 ms behind the newest, interpolated (extrapolated up to 150 ms)
    const S = this.snaps; if (S.length) {
      const target = S[S.length - 1].at - 100 + (now - (this.lastRecvAt || now));
      let a = S[0], b2 = S[0]; for (let i = 0; i < S.length - 1; i++) if (S[i].at <= target && S[i + 1].at >= target) { a = S[i]; b2 = S[i + 1]; break; } else if (S[i + 1].at < target) { a = S[i + 1]; b2 = S[i + 1]; }
      const span = b2.at - a.at, k2 = span > 0 ? clamp((target - a.at) / span, 0, 1) : 0, ex = span <= 0 ? clamp((target - a.at) / 1000, 0, .15) : 0;
      this.apply(m, a, b2, k2, ex);
    }
    if (m.duel) m.duel.t = (now - m.duel.startAt) / 1000;
    if (m.notice) { m.notice.t += dt; if (m.notice.t > m.notice.dur) m.notice = null; }
    m.t += dt;
    c.view.update(dt, m); c.comm.update(dt); if (c.audio) c.audio.update(dt, c.view); EF.Camera.update(dt, m, m);
  },
  apply(m, a, b, k, ex) {
    const L = (i, arrA, arrB) => arrA[i] + (arrB[i] - arrA[i]) * k;
    const ball = m.ball, ba = a.b, bb = b.b;
    ball.x = L(0, ba, bb) + ba[3] * ex; ball.y = L(1, ba, bb) + ba[4] * ex; ball.z = Math.max(0, L(2, ba, bb)); ball.vx = bb[3]; ball.vy = bb[4]; ball.vz = bb[5]; ball.roll += Math.hypot(ball.vx, ball.vy) / 120;
    m.owner = bb[6] >= 0 ? m.players[bb[6]] : null; ball.owner = m.owner;
    if (bb[7]) { if (!ball.superPath) ball.superPath = { kind: 'rocket', t: 0 }; ball.trail.push([ball.x, ball.y, ball.z]); if (ball.trail.length > 12) ball.trail.shift(); } else { ball.superPath = null; ball.trail.length = 0; }
    m.players.forEach((f, i) => {
      const pa = a.p[i], pb = b.p[i]; if (!pa || !pb) return;
      const B = f.body; B.x = L(0, pa, pb) + pa[3] * ex; B.y = L(1, pa, pb) + pa[4] * ex; B.z = L(2, pa, pb); B.vx = pb[3]; B.vy = pb[4];
      f.facing = pa[5] / 100 + E.angDiff(pa[5] / 100, pb[5] / 100) * k; f.state = ST_CODES[pb[6]] || 'run'; f.kickName = KICK_CODES[pb[7]] || null; f.kickT = pb[8] / 100;
      const Lk = f.look; Lk.tilt = pb[9] ? { axis: pb[9] === 1 ? 'forward' : 'right', angle: L(10, pa, pb) / 100, pivot: pb[9] === 1 ? 'feet' : 'hips', lift: pb[11] } : null;
      Lk.pose = POSE_CODES[pb[12]] || null; Lk.clip = pb[13] ? { name: CLIP_CODES[pb[13]], t: pb[14] / 100, w: 1, mask: CLIP_CODES[pb[13]] === 'OverhandThrow' ? 'upper' : null } : null;
      const fl = pb[15]; f.sentOff = !!(fl & 1); f.ghost = !!(fl & 2); f.charging = !!(fl & 4); Lk.down = fl & 8 ? 1 : 0; Lk.sprint = !!(fl & 16); Lk.hurt = !!(fl & 32); Lk.spin = 0; Lk.air = B.z > 2;
      Lk.expr = f.state === 'down' || f.state === 'launched' ? 'wince' : f.state === 'celebrate' ? 'shout' : null;
    });
    const R = m.ref, ra = a.r, rb = b.r; R.body.x = L(0, ra, rb); R.body.y = L(1, ra, rb); R.facing = rb[2] / 100; R.look.down = rb[3]; R.signal = rb[4] ? ['whistle', 'point', 'card', 'advantage', 'ear', 'var'][rb[4] - 1] : null; R.look.signal = R.signal; R.look.point = R.signal === 'point' || R.signal === 'whistle'; R.look.pose = R.signal === 'card' ? 'cheer' : R.signal === 'advantage' ? 'cast' : null;
    const M = b.m; m.mode = MODE_CODES[M[0]] || 'play'; m.clock = M[1] / 10; m.half = M[2]; m.score = [M[3], M[4]]; m.euphoria = [M[5], M[6]]; m.europhoria = M[7] >= 0 ? { side: M[7], t: M[8] / 10, dur: EF.T.europhoriaTime } : null;
    const spk = SP_CODES[M[9]]; m.setpiece = spk ? { kind: spk, taken: false, stage: 'aim', side: 0 } : null; m.stoppage = M[10]; m.superUsed = !!M[11];
    for (const [id, fid] of b.c) { const h = m.humans.find(q => q.id === id); if (h) { if (h.fb && h.fb.human === h) h.fb.human = null; h.fb = fid >= 0 ? m.players[fid] : null; if (h.fb) h.fb.human = h; } }
    if (b.o && !m.overShown) { m.overShown = true; m.over = true; }
  },
  /** a host's event, replayed on this copy's mirror: sounds, commentary, the crowd, notices, the duel */
  replayEvent([seq, at, type, d]) {
    const m = EF.cur && EF.cur.m; if (!m) return;
    const ev = Object.assign({}, d, { match: m }); if (d.w !== undefined) ev.who = m.players[d.w]; if (d.v !== undefined) ev.victim = m.players[d.v]; if (d.s !== undefined) ev.side = d.s;
    if (d.g) ev.goal = d.g;
    if (type === 'notice') m.notice = { text: d.text, t: 0, dur: 1.8, sub: d.sub || null, big: true };
    if (type === 'goal' || type === 'ownGoal') { m.lastGoal = Object.assign({ side: d.s, t: m.t }, d.g || {}); }
    if (type === 'saveDuel') { const k = ev.who; m.duel = { t: 0, dur: 1, keeper: k, human: null, press: null, result: null, startAt: d.at, mine: d.h === this.me }; }
    if (type === 'saveDuelResult' && m.duel) { m.duel.result = d.result; game.after(.7, () => { if (EF.cur && EF.cur.m === m) m.duel = null; }); }
    if (type === 'celebrateStart' && d.o) { m.celebration = { who: ev.who, offer: d.o.map(id => EF.get('celebration', id)), pick: null, t: 0, human: d.h === this.me ? m.humans.find(h => h.id === this.me) : null }; game.after(1.4, () => { if (EF.cur && EF.cur.m === m) m.celebration = null; }); }
    if (type === 'card' && ev.who) { m.cardNow = { who: ev.who, final: d.color === 'yellow' ? 'yellow' : 'red', shown: true }; }
    EF.bus.emit(type, ev);
  },
  /* ---- messages ---- */
  message(d, from) {
    this.received++;
    if (!d || typeof d !== 'object' || this.ended) return;
    if (d.t === 's' && this.role === 'client') { this.lastRecvAt = AIHub.time(); this.snaps.push(d); while (this.snaps.length > 12) this.snaps.shift(); this.snaps.sort((a, b) => a.at - b.at); return; }
    if (d.t === 'E' && this.role === 'client') { for (const e of d.list || []) if (e[0] > this.evIn) { this.evIn = e[0]; this.replayEvent(e); } return; }
    if (this.role === 'client') return;
    const m = EF.cur && EF.cur.m, h = m && m.humans.find(q => q.id === from); if (!h || !h.ctl || !h.ctl.feed) return;
    if (d.t === 'i') h.ctl.feed(d);
    else if (d.t === 'duel') { h.ctl.duelAt = d.at; if (m.duel && m.duel.human === h && m.duel.press === null) m.duel.press = (d.at - (m.duel.startAt || 0)) / 1000; }
    else if (d.t === 'cel') h.ctl.cel = d.k;
    else if (d.t === 'menu') h.cpu = !!d.open;
  },
  leave(ev) {
    const m = EF.cur && EF.cur.m; if (!m) return;
    const h = m.humans.find(q => q.id === ev.id); if (h) { h.cpu = true; h.left = true; if (h.fb) h.fb.human = null; }
    if (this.info && this.info.players) { const p = this.info.players.find(q => q.id === ev.id); if (p) p.left = true; }
  },
  /** the host, once: a last snapshot with over, then finish with standings, scores, stats and awards */
  finish(timeUp, res) {
    if (this.role === 'client' || this.finished || this.ended) return;
    const m = EF.cur && EF.cur.m; if (!m) return;
    this.finished = true;
    try { this.send(Object.assign(this.snapshot(m, AIHub.time()), { o: 1 }), true); } catch (e) { /* gone */ }
    const players = (this.info.players || []).filter(p => !p.left), sideOf = this.sideOf, w = m.score[0] > m.score[1] ? 0 : m.score[1] > m.score[0] ? 1 : -1;
    const standings = w < 0 ? [players.map(p => p.id)] : [players.filter(p => sideOf[p.id] === w).map(p => p.id), players.filter(p => sideOf[p.id] !== w).map(p => p.id)].filter(g => g.length);
    const scores = {}, stats = {}; for (const p of players) { scores[p.id] = m.score[sideOf[p.id]]; const h = m.humans.find(q => q.id === p.id); stats[p.id] = h ? Object.assign({}, h.stats) : { Goals: 0, Shots: 0, Tackles: 0 }; }
    const best = players.map(p => ({ p, s: (stats[p.id].Goals * 3 + stats[p.id].Shots + stats[p.id].Tackles) })).sort((a, b) => b.s - a.s)[0];
    const awards = best ? [{ id: best.p.id, title: 'Player of the Match', detail: stats[best.p.id].Goals + ' goals, ' + stats[best.p.id].Tackles + ' tackles' }] : [];
    try { AIHub.finish({ standings, scores, stats, awards }); } catch (e) { /* hub gone */ }
    if (timeUp && m.mode !== 'fulltime' && m.mode !== 'over') m.fullTime();
  },
  end(ev) {
    this.ended = (ev && ev.reason) || 'finished';
    EF.silence(); try { game.input.clear(); } catch (e) { /* no input */ }
    if (EF.cur && EF.cur.audio) EF.cur.audio.dispose();
  },
  endDraw(g, r) {
    const why = this.ended, m = EF.cur && EF.cur.m;
    const text = why === 'void' || why === 'host-left' ? 'ROUND VOID' : why === 'sat-out' ? 'YOU SAT THIS ONE OUT' : 'FULL TIME';
    px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#000000'));
    E.font.title(g, text, r.W / 2, Math.round(r.H * .32), { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
    if (m && text === 'FULL TIME') E.font.text(g, m.teams[0].short + ' ' + m.score[0] + ' - ' + m.score[1] + ' ' + m.teams[1].short, r.W / 2, Math.round(r.H * .32) + 34, '#ffffff', { align: 'center', scale: 2, outline: '#000' });
    if (why === 'host-left') E.font.text(g, 'THE HOST LEFT', r.W / 2, Math.round(r.H * .32) + 34, '#c8d0e8', { align: 'center', outline: '#000' });
  },
  /* ---- the session's own settings overlay (Options or Esc): nothing pauses; the player's footballer goes to the CPU ---- */
  menuStep() {
    const I = game.input; let create = false;
    try { const pad = I.padIndex !== null && I.padIndex !== undefined && navigator.getGamepads()[I.padIndex]; create = !!(pad && pad.buttons[8] && pad.buttons[8].pressed); } catch (e) { /* none */ }
    if (I.pressed('pause') && !create) { this.menuOpen = !this.menuOpen; this.send({ t: 'menu', open: this.menuOpen }, true); if (this.menuOpen) this.openMenu(); else EF.UI.set([]); game.input.consumeAll(); const h = EF.cur && EF.cur.m.humans.find(q => q.id === this.me); if (h && this.role !== 'client') h.cpu = this.menuOpen; }
    if (this.menuOpen) EF.UI.update(1 / 120);
  },
  openMenu() {
    const S = game.settings, sl = (key, label) => ({ id: key, kind: 'slider', title: label, min: 0, max: 1, step: .05, get: () => S[key], set: v => S.set(key, v), fmt: v => Math.round(v * 100) + '%' });
    EF.UI.set([{ id: 'session-settings', widgets: [sl('volume', 'VOLUME'), sl('music', 'MUSIC'), sl('effects', 'EFFECTS'), sl('voices', 'VOICES'), sl('crowd', 'CROWD'), { id: 'glyphs', kind: 'choice', title: 'BUTTON SYMBOLS', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']], get: () => S.glyphs, set: v => S.set('glyphs', v) }, { id: 'close', kind: 'button', title: 'BACK TO THE MATCH', onPick: () => { this.menuOpen = false; this.send({ t: 'menu', open: false }, true); EF.UI.set([]); const h = EF.cur && EF.cur.m.humans.find(q => q.id === this.me); if (h && this.role !== 'client') h.cpu = false; } }],
      layout(r) { const w = Math.min(260, r.W - 30); EF.UI.column(this.widgets, Math.round(r.W / 2 - w / 2), 50, w, 18, 3); },
      draw: (g, r) => { px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05060e')); EF.UI.panel(g, r, 'SESSION SETTINGS', 'THE MATCH GOES ON: YOUR PLAYER IS ON AUTO'); }, footer: () => [['left', 'CHANGE'], ['pause', 'CLOSE']], onBack: () => { this.menuOpen = false; this.send({ t: 'menu', open: false }, true); EF.UI.set([]); } }]);
  },
  matchOverlay(r, c) {
    if (!this.active) return;
    const now = AIHub.time();
    r.overlay(g => {
      if (now < 0 && isFinite(now)) { const n = Math.ceil(-now / 1000); E.font.title(g, n > 0 ? String(n) : 'GO!', r.W / 2, Math.round(r.H * .3), { align: 'center', scale: 5, colors: ['#ffffff', '#ffe08a', '#ffb347'], depth: 3 }); }
      if (this.ended) this.endDraw(g, r);
    });
    if (this.menuOpen) EF.UI.draw(r);
  }
};
const inBox = (p, b) => p[0] >= b[0] && p[0] < b[0] + b[2] && p[1] >= b[1] && p[1] < b[1] + b[3];
/** the host's view of a remote player: the newest input message, presses from its counters, neutral after 500 ms */
class RemoteController {
  constructor(id) { this.id = id; this.last = null; this.lastT = -1e9; this.seen = [0, 0, 0, 0, 0, 0, 0, 0]; this.pend = [0, 0, 0, 0, 0, 0, 0, 0]; this.cel = -1; this.raw = null; this.rawT = -1; }
  feed(d) { if (this.last && d.s <= this.last.s) return; this.last = d; this.lastT = performance.now(); (d.c || []).forEach((n, i) => { if (n > this.seen[i]) { this.pend[i] += n - this.seen[i]; this.seen[i] = n; } }); }
  read(m) {
    if (this.rawT === m.t && this.raw) return this.raw;
    this.rawT = m.t; const it = EF.Intent.make(), d = this.last;
    if (!d || performance.now() - this.lastT > 500) { this.raw = it; return it; }
    it.move = [(d.m[0] || 0) / 100, (d.m[1] || 0) / 100]; const hb = d.h || 0; it.sprint = !!(hb & 1);
    const keys = ['pass', 'shoot', 'lob', 'through', 'skill', 'sw', 'dive'], bits = [2, 4, 8, 16, 32, 64, 128];
    keys.forEach((k, i) => { const down = !!(hb & bits[i]), pr = this.pend[i] > 0; if (pr) this.pend[i]--; it[k] = { down: down || pr, pressed: pr, released: !down && !pr && this['was' + k] }; this['was' + k] = down || pr; });
    if (this.pend[7] > 0) { this.pend[7]--; it.euphoria = true; }
    it.cel = this.cel; this.cel = -1;
    this.raw = it; return it;
  }
  peek() { const m = EF.cur && EF.cur.m, r = this.read(m || { t: -1 }); return { move: r.move, pass: r.pass.pressed, shoot: r.shoot.pressed, lob: r.lob.pressed, through: r.through.pressed, skill: r.skill.pressed, sw: r.sw.pressed, dive: r.dive.pressed, shootDown: r.shoot.down, cel: r.cel }; }
  intent(f, dt) { const m = f.m, it = this.read(m); if (m.lastKick && m.lastKick.human && m.lastKick.human.ctl === this && m.lastKick.curlT > 0) m.lastKick.aftertouch(it.move, dt); return it; }
}
EF.RemoteController = RemoteController;
/* ---- the waiting scene: CONNECTING... over the stadium ---- */
EF.scenes.hubwait = Object.assign(EF.sceneBase(), {
  enter() { this.t = 0; EF.Stage.enter(); if (!this.started) { this.started = true; EF.Hub.connect(); } },
  update(dt) { this.t += dt; EF.Stage.update(dt); },
  draw(r) { EF.Stage.draw(r, { dim: .4 }); r.overlay(g => { E.font.title(g, 'EUROPHORIA FOOTBALL', r.W / 2, Math.round(r.H * .3), { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347'] }); E.font.text(g, 'CONNECTING' + '...'.slice(0, Math.floor(this.t * 3) % 4), r.W / 2, Math.round(r.H * .5), '#ffffff', { align: 'center', scale: 2, outline: '#000' }); }); }
});
/* the match scene in a session: the host keeps sending, the client mirrors; the server draws nothing */
const _mUpd3 = EF.scenes.match.update, _mDraw3 = EF.scenes.match.draw;
EF.scenes.match.update = function (dt) { const c = EF.cur; if (EF.inSession && c && EF.Hub.info && EF.Hub.sessionUpdate(dt, c)) return; _mUpd3.call(this, dt); };
EF.scenes.match.draw = function (r) { if (EF.inSession && EF.Hub.role === 'server') { r.sky(['#000000', '#000000']); return; } _mDraw3.call(this, r); };
if (typeof addEventListener === 'function') addEventListener('keydown', e => { if (EF.inSession && e.code === 'KeyT' && game.sceneName === 'tunnel') EF.Hub.keyT = true; });
