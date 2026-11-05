/* ---- ONLINE: AI Hub shared-world sessions (lib/hub/README.md). The host's copy runs the one match; every other copy
 * sends what its player does and draws what the host sends. Outside a session nothing here runs ---- */
const ST_CODES = ['run', 'pass', 'kick', 'sidestep', 'spin', 'fend', 'charge', 'tackling', 'diving', 'tackled', 'ground', 'stunned', 'getup', 'launched', 'ruck', 'scrum', 'lift', 'celebrate', 'binned', 'off', 'held'];
const BALL_ST = ['held', 'air', 'loose', 'dead', 'placed'];
const PH_CODES = ['walkout', 'kickoff', 'play', 'ruck', 'scrum', 'lineout', 'penalty', 'setkick', 'try', 'stop', 'half', 'full'];
const BTN = ['x', 'sq', 'ci', 'tri', 'l1', 'r1', 'turbo'];
const FWD_EVENTS = new Set(['whistle', 'kickoff', 'pass', 'catch', 'kick', 'tackle', 'bigHit', 'monsterHit', 'brokenTackle', 'sidestep', 'spin', 'fend', 'dummy', 'lineBreak', 'interception', 'knockOn', 'forwardPass', 'jackal', 'ruckTurnover', 'scrum', 'scrumCall', 'scrumEngage', 'lineoutWon', 'lineoutSteal', 'notStraight', 'try', 'conversion', 'penaltyGoal', 'convMiss', 'penMiss', 'doink', 'dropGoal', 'cheapUnseen', 'penalty', 'freeKick', 'card', 'refDown', 'onFire', 'superStart', 'powerupTake', 'chicken', 'flame', 'lightning', 'hooter', 'halftime', 'fulltime', 'land', 'refCall']);
TT.net = {
  active: false, isHost: false, server: false, me: -1, info: null, card: null, started: false, ended: false, finished: false, waiting: false,
  seq: 0, sendT: 0, snapT: 0, evT: 0, evBuf: [], lastSnap: 0, remote: {}, pressLog: [], seen: {},
  /** at load: connect; null means no hub (the game runs on its own) */
  async connect() {
    const info = await AIHub.connect({ mode: 'shared-world', seats: [2, 4], card: true });
    if (!info) return null;
    this.active = true; this.info = info; this.isHost = !!info.isHost; this.server = !!info.server; this.me = info.me;
    TT.cfg.session = true;
    AIHub.on('card', c => { this.card = c; });
    AIHub.on('start', () => { this.started = true; TT.game.go('match', this.matchData()); });
    AIHub.on('message', (d, from) => this.onMessage(d, from));
    AIHub.on('leave', d => this.onLeave(d));
    AIHub.on('time-up', () => { if (this.isHost) this.finish(); });
    AIHub.on('end', () => this.onEnd());
    // the setup, the same on every copy without a message: the Mudlarks against one of four rivals, at a venue
    const rng = AIHub.rng('setup');
    const rivals = ['bad', 'gul', 'irn', 'meg'], venues = ['park', 'docks', 'furnace', 'dome'];
    this.setup = { away: rivals[Math.floor(rng() * 4)], venue: venues[Math.floor(rng() * 4)] };
    const lim = info.limitMs || 0;
    this.halfLen = lim ? Math.max(20, Math.min(75, (lim / 1000 - 40) / 2.6)) : 75;
    return info;
  },
  teamOf(id) { const ids = this.info.players.map(p => p.id); return ids.indexOf(id) % 2; },
  matchData() {
    const seats = this.info.players.map((p, i) => {
      const team = i % 2, local = p.id === this.me && !this.server;
      return { kind: this.isHost ? (local ? 'local' : 'remote') : (local ? 'local' : 'remote'), input: local ? TT.game.input : null, team, label: TT.ascii(p.name).slice(0, 8).toUpperCase(), color: p.color || E.PLAYER_COLORS[i], netId: p.id };
    });
    return { home: 'mud', away: this.setup.away, venue: this.setup.venue, halfLength: this.halfLen, session: true, seed: Math.floor(AIHub.rng('match')() * 1e6), seats, skipIntro: true };
  },
  matchStarted() {
    TT.cfg.noReplay = true;
    M.cheats = M.cheats || {};
    // the clients mirror the host: their copy is drawn from snapshots, never stepped
    if (!this.isHost) M.mirror = true;
    this.seq = 0; this.evBuf = [];
    if (!this.hooked) { this.hooked = true; TT.bus.on('*', (d, n) => { if (this.active && this.isHost && FWD_EVENTS.has(n) && !this.ended) this.evBuf.push([n, this.slim(d)]); }); }
  },
  slim(d) { const o = {}; for (const k in d) { const v = d[k]; if (typeof v === 'number') o[k] = Math.round(v * 10) / 10; else if (typeof v === 'string' || typeof v === 'boolean') o[k] = v; } return o; },
  /* ---- the host ---- */
  hostStep(dt) {
    if (!this.active || this.ended) return;
    if (AIHub.time() < 0) { M.frozen = true; return; } M.frozen = false;
    this.snapT -= dt; this.evT -= dt;
    if (this.snapT <= 0) { this.snapT = 1 / 12; AIHub.send(this.snapshot(), { reliable: false }); }
    if (this.evT <= 0 && this.evBuf.length) { this.evT = .2; AIHub.send({ t: 'e', l: this.evBuf.splice(0, 30) }, { reliable: true }); }
    if (M.over && !this.finished && M.phase === 'full' && M.phaseT > 2) this.finish();
  },
  snapshot() {
    const r2 = v => Math.round(v);
    const P = M.players.map(p => [r2(p.x), r2(p.y), r2(p.z), Math.round(p.facing * 100), ST_CODES.indexOf(p.st), Math.round(p.stT * 50), (p.fire > 0 ? 1 : 0) | (p.superK === 'thunder' ? 2 : 0) | (p.superK === 'hurricane' ? 4 : 0) | (p.turboOn ? 8 : 0), p.ctl, Math.round(p.turbo * 99), r2(p.vx), r2(p.vy)]);
    const b = M.ball, ph = M.ph || {};
    const q = { bar: ph.bar != null ? +ph.bar.toFixed(2) : undefined, sub: M.sub, team: ph.team, needle: ph.needle != null ? +ph.needle.toFixed(2) : undefined, call: ph.call, choice: ph.choice, power: ph.power != null ? +ph.power.toFixed(2) : undefined, aim: ph.aim, x: ph.x != null ? r2(ph.x) : undefined, y: ph.y != null ? r2(ph.y) : undefined, ty: ph.ty, label: ph.label, result: ph.result, kicker: ph.kicker, kx: ph.kx != null ? r2(ph.kx) : undefined, ky: ph.ky != null ? r2(ph.ky) : undefined, tl: ph.tl, D: ph.D != null ? r2(ph.D) : undefined, need: ph.need, clock: ph.clock != null ? Math.ceil(ph.clock) : undefined, opts: M.phase === 'penalty' ? ph.opts.map(o => [o[0], o[1], '']) : undefined, free: ph.free, kind: ph.kind, human: ph.human, sway: 0, cx: ph.cx != null ? r2(ph.cx) : undefined, pods: ph.pods, s: ph.s, holding: ph.holding, att: ph.att, def: ph.def };
    return { t: 's', at: Math.round(AIHub.time()), ph: PH_CODES.indexOf(M.phase), pt: Math.round(M.phaseT * 10), c: Math.round(M.clock * 10), h: M.half, hoo: M.hooter ? 1 : 0, sd: M.suddenDeath ? 1 : 0, sc: M.score, hy: M.hype.map(Math.round), b: [r2(b.x), r2(b.y), r2(b.z), BALL_ST.indexOf(b.st), b.holder], r: [r2(M.ref.x), r2(M.ref.y), Math.round(M.ref.facing * 100), M.ref.down > 0 ? 1 : 0], P, q, pu: M.pu ? [M.pu.kind, r2(M.pu.x), r2(M.pu.y), r2(M.pu.z)] : 0, sv: TT.seats.map(s => s.pid), ov: M.over ? 1 : 0, w: M.winner };
  },
  finish() {
    if (this.finished || !this.isHost) return; this.finished = true;
    const ids = this.info.players.map(p => p.id).filter(id => !this.left || !this.left[id]);
    const side = id => this.teamOf(id), w = M.score[0] > M.score[1] ? 0 : M.score[1] > M.score[0] ? 1 : -1;
    const standings = w < 0 ? [ids] : [ids.filter(id => side(id) === w), ids.filter(id => side(id) !== w)].filter(a => a.length);
    const scores = {}, stats = {};
    for (const id of ids) { const t = side(id); scores[id] = M.score[t]; stats[id] = { Tries: M.stats[t].tries, Tackles: M.stats[t].tackles, 'Big hits': M.stats[t].bigHits, Metres: TT.metres(M.stats[t].metres) }; }
    const awards = [];
    const best = M.players.filter(p => p.team === Math.max(0, w)).sort((a, b) => (b.tries * 10 + b.tackles) - (a.tries * 10 + a.tackles))[0];
    if (best) { const seat = TT.seats.find(s => s.team === best.team && s.netId != null); if (seat) awards.push({ id: seat.netId, title: 'Player of the Match', detail: TT.ascii(best.data.nick) }); }
    try { AIHub.send({ t: 's', ...this.snapshot(), over: 1 }, { reliable: true }); } catch (e) { /* the hub may be closing */ }
    AIHub.finish({ standings, scores, stats, awards, won: undefined });
  },
  onLeave(d) {
    this.left = this.left || {}; this.left[d.id] = true;
    const s = TT.seats.find(x => x.netId === d.id); if (s) { s.kind = 'script'; s.intent = null; s.pid = -1; TT.seats.splice(TT.seats.indexOf(s), 1); }
  },
  onEnd() {
    this.ended = true; this.active = false;
    try { TT.game.audio.music(null); TT.game.audio.mute && TT.game.audio.setVolume(0); } catch (e) { /* none */ }
    TT.cfg.muted = true;
    if (M) M.frozen = true;
  },
  /* ---- the messages ---- */
  onMessage(d, from) {
    if (!d || this.ended) return;
    if (d.t === 'i' && this.isHost) {
      const s = TT.seats.find(x => x.netId === from); if (!s) return;
      const it = TT.blankIntent(); it.mx = (d.m[0] || 0) / 100; it.my = (d.m[1] || 0) / 100;
      for (let k = 0; k < BTN.length; k++) if (d.h & (1 << k)) { if (BTN[k] === 'turbo') it.turbo = true; else it.h[BTN[k]] = true; }
      // presses of the last second, each once (by its id)
      const seen = this.seen[from] = this.seen[from] || {};
      for (const [id, a] of d.p || []) if (!seen[id]) { seen[id] = 1; const k = BTN[a]; if (k) { it.p[k] = true; if (k === 'l1' || k === 'r1' || k === 'ci' || k === 'x') it.r[k] = !it.h[k]; } }
      for (const a of ['up', 'down', 'left', 'right']) if (d.mv && d.mv.includes(a[0])) it.p[a] = true;
      // released buttons this report
      const prev = s.lastHeld || 0; for (let k = 0; k < BTN.length; k++) if ((prev & (1 << k)) && !(d.h & (1 << k))) it.r[BTN[k]] = true;
      s.lastHeld = d.h; s.intent = it;
      if (d.pos && d.pid === s.pid && M.phase === 'play') {
        const p = M.players[s.pid];
        if (p && (p.st === 'run' || p.st === 'charge')) { const now = M.t, el = Math.min(.3, now - (s.posT || now - 1 / 15)); s.posT = now; const max = TUNE.v.runSpeed * TUNE.v.turboMult * 1.3 * el + 20, dx = d.pos[0] - p.x, dy = d.pos[1] - p.y, dd = Math.hypot(dx, dy); if (dd > 0) { const k = Math.min(1, max / dd); p.x += dx * k; p.y += dy * k; } }
      }
      return;
    }
    if (d.t === 's' && !this.isHost) { this.applySnap(d); return; }
    if (d.t === 'e' && !this.isHost) { for (const [n, data] of d.l) TT.bus.emit(n, data); return; }
  },
  /* ---- a client: its intents out, the host's world in ---- */
  clientStep(dt) {
    if (!this.active || this.ended) return;
    const I = TT.game.input, mv = I.move(), gnd = TT.game.view.screenDirToGround(mv[0], mv[1]);
    let held = 0; for (let k = 0; k < BTN.length; k++) if (I.down(BTN[k])) held |= 1 << k;
    for (let k = 0; k < BTN.length; k++) if (I.pressed(BTN[k])) this.pressLog.push([++this.seq, k, M.t]);
    let dirs = ''; for (const a of ['up', 'down', 'left', 'right']) if (I.pressed(a)) dirs += a[0];
    if (dirs) this.pendingDirs = (this.pendingDirs || '') + dirs;
    this.pressLog = this.pressLog.filter(p => M.t - p[2] < 1);
    this.sendT -= dt;
    if (this.sendT <= 0) { this.sendT = 1 / 15; AIHub.send({ t: 'i', s: this.seq, m: [Math.round(gnd[0] * 100), Math.round(gnd[1] * 100)], h: held, p: this.pressLog.map(p => [p[0], p[1]]), mv: this.pendingDirs || '', pos: this.ownPos || undefined, pid: this.ownPid }, { reliable: false }); this.pendingDirs = ''; }
    // client-side feel: our own player runs at once from our own stick while he is free-running; the host takes it
    const me = TT.seats.find(x => x.kind === 'local'), p = me && me.pid >= 0 ? M.players[me.pid] : null;
    this.ownPid = p ? p.id : -1;
    if (p && M.phase === 'play' && (p.st === 'run' || p.st === 'charge')) {
      const top = TUNE.v.runSpeed * (.8 + .04 * statOf(p, 'SPD')) * (I.down('turbo') && p.turbo > 0 ? TUNE.v.turboMult : 1);
      p.vx = TT.approach(p.vx, gnd[0] * top, TUNE.v.accel * dt); p.vy = TT.approach(p.vy, gnd[1] * top, TUNE.v.accel * dt);
      p.x = clamp(p.x + p.vx * dt, G.DEAD[0] - 40, G.DEAD[1] + 40); p.y = clamp(p.y + p.vy * dt, G.Y0 - 40, G.Y1 + 44);
      if (Math.hypot(gnd[0], gnd[1]) > .15) p.facing = Math.atan2(gnd[1], gnd[0]);
      this.ownFree = true; this.ownPos = [Math.round(p.x), Math.round(p.y)];
    } else { this.ownFree = false; this.ownPos = null; }
    M.t += dt; M.phaseT += dt;
    this.waiting = AIHub.time() > 1000 && performance.now() - this.lastSnap > 1000;
  },
  applySnap(d) {
    if (d.at < (this.lastAt || -1e9)) return; this.lastAt = d.at; this.lastSnap = performance.now();
    const ph = PH_CODES[d.ph] || 'play';
    if (M.phase !== ph) { M.phase = ph; M.phaseT = d.pt / 10; }
    M.clock = d.c / 10; M.half = d.h; M.hooter = !!d.hoo; M.suddenDeath = !!d.sd; M.score = d.sc; M.hype = d.hy; M.over = !!d.ov; M.winner = d.w;
    const q = d.q || {}; M.ph = Object.assign({}, q); M.sub = q.sub || ''; if (M.ph.subT == null) M.ph.subT = 0;
    if (ph === 'kickoff' && !M.ph.aim) M.ph.aim = [G.CX, G.CY];
    d.P.forEach((a, i) => { const p = M.players[i]; if (!p) return; const own = i === this.ownPid && this.ownFree && ST_CODES[a[4]] === 'run' && Math.hypot(p.x - a[0], p.y - a[1]) < 48; if (own) { p.x = lerp(p.x, a[0], .08); p.y = lerp(p.y, a[1], .08); } else { p.x = a[0]; p.y = a[1]; } p.z = a[2]; p.facing = a[3] / 100; const st = ST_CODES[a[4]] || 'run'; if (p.st !== st) p.st = st; p.stT = a[5] / 50; p.fire = a[6] & 1 ? 1 : 0; p.superK = a[6] & 2 ? 'thunder' : a[6] & 4 ? 'hurricane' : ''; p.turboOn = !!(a[6] & 8); p.ctl = a[7]; p.turbo = a[8] / 99; if (!own) { p.vx = a[9]; p.vy = a[10]; } });
    const b = M.ball; b.x = d.b[0]; b.y = d.b[1]; b.z = d.b[2]; b.st = BALL_ST[d.b[3]] || 'dead'; b.holder = d.b[4];
    const r = M.ref; r.x = d.r[0]; r.y = d.r[1]; r.facing = d.r[2] / 100; r.down = d.r[3] ? 1 : 0;
    M.pu = d.pu ? { kind: d.pu[0], x: d.pu[1], y: d.pu[2], z: d.pu[3], landed: d.pu[3] < 1, t: 0 } : null;
    if (d.sv) d.sv.forEach((pid, i) => { if (TT.seats[i]) TT.seats[i].pid = pid; });
  },
  /** the session's overlays: the countdown, the end */
  draw(r) {
    r.overlay(g => {
      const t = AIHub.time();
      if (t < 0 && t > -4000) E.font.title(g, String(Math.ceil(-t / 1000)), r.W / 2, r.H / 2 - 30, { align: 'center', scale: 5, colors: ['#ffffff', '#ffe08a', '#ff8a20'] });
      if (this.ended) { px.blend(g, .5, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#202030')); E.font.title(g, 'FULL TIME', r.W / 2, r.H / 2 - 20, { align: 'center', scale: 3, colors: ['#ffffff', '#ffe08a'] }); }
    });
  }
};

/* ---- the game's own card: the venue at dusk, both teams, each human's name in the seat colour, the controls ---- */
TT.scenes.card = {
  view: 'broadcast', views: ['broadcast'], input: TT.KEYS, res: 'ps1', touch: [], camera: false, pausable: false,
  enter(d) {
    this.demo = d && d.demo;
    this.t = 0; this.answered = false;
    const setup = TT.net.setup || { away: 'gul', venue: 'docks' };
    TT.cfg.quietComm = true;
    TT.startMatch({ home: 'mud', away: setup.away, venue: setup.venue, seed: 3, attract: true, backdrop: true, skipIntro: true, seats: [] });
    TT.cfg.quietComm = false;
    TT.game.lights.enabled = true; TT.game.lights.ambient = .66;
    TT.audio.music('title');
  },
  update(dt) {
    this.t += dt;
    if (M) { TT.pres.update(dt, M); TT.game.focus(G.CX, G.CY, 8); }
    const I = TT.game.input, c = I.clicked && I.clicked();
    if (!this.demo && typeof AIHub !== 'undefined') {
      if (I.pressed('confirm') || I.pressed('x') || I.pressed('start') || (c && this.readyBtn && c[0] >= this.readyBtn[0] && c[0] < this.readyBtn[0] + this.readyBtn[2] && c[1] >= this.readyBtn[1] && c[1] < this.readyBtn[1] + this.readyBtn[3])) AIHub.answer('ready');
      if (I.pressed('tri') || (typeof document !== 'undefined' && TT.keyM) || (c && this.moreBtn && c[0] >= this.moreBtn[0] && c[0] < this.moreBtn[0] + this.moreBtn[2] && c[1] >= this.moreBtn[1] && c[1] < this.moreBtn[1] + this.moreBtn[3])) { TT.keyM = false; AIHub.answer('more'); }
    }
  },
  draw(r) {
    if (M) TT.pres.drawWorld(r, M);
    r.overlay(g => {
      const W = r.W, H = r.H, info = TT.net.info || { players: [{ id: 0, name: 'PLAYER ONE', color: '#e8443a' }, { id: 1, name: 'PLAYER TWO', color: '#3b82f6' }] }, card = TT.net.card || { left: 15000, ready: [] };
      px.blend(g, .55, 'multiply', () => px.rect(g, 0, 0, W, H, '#202848'));
      TT.logo(g, W, 6, 2);
      const away = TT.teamById((TT.net.setup || {}).away || 'gul');
      E.font.text(g, 'MUDDINGTON MUDLARKS  VS  ' + away.name, W / 2, 46, '#ffe8c0', { align: 'center', outline: '#000' });
      E.font.text(g, 'HOW TO WIN: score more points than the other team', W / 2, 58, '#ffffff', { align: 'center', outline: '#000' });
      info.players.forEach((p, i) => {
        const x = i % 2 ? W / 2 + 20 : W / 2 - 150, y = 74 + Math.floor(i / 2) * 22, ready = (card.ready || []).includes(p.id);
        E.ui.box(g, x, y, 130, 18, { bg: ['#1a2238', '#0c1020'], border: p.color, alpha: .92 });
        E.font.text(g, TT.ascii(p.name).slice(0, 14), x + 6, y + 6, p.color, { outline: false });
        E.font.text(g, (i % 2 ? 'AWAY' : 'HOME') + (ready ? ' ★' : ''), x + 124, y + 6, ready ? '#80ff90' : '#a8b0c8', { align: 'right', font: 'tiny', outline: false });
      });
      const I = TT.game.input, lines = ['{b:up}{b:down}{b:left}{b:right} RUN   {b:turbo} TURBO', '{b:l1}{b:r1} PASS (BACKWARDS!)   {b:x} STEP / TACKLE', '{b:sq} FEND / DIVE   {b:ci} KICK / SWITCH   {b:tri} SUPER'];
      lines.forEach((l, i) => TT.prompt(g, l, W / 2, 124 + i * 13, I));
      const left = card.left == null ? null : Math.ceil(card.left / 1000);
      E.font.text(g, card.paused ? 'PAUSED: players asked for more time' : card.starting ? 'STARTING...' : left != null ? 'STARTS IN ' + left : '', W / 2, 168, '#ffe08a', { align: 'center', outline: '#000', scale: 2 });
      const bw = 96; this.readyBtn = [W / 2 - bw - 6, H - 34, bw, 20]; this.moreBtn = [W / 2 + 6, H - 34, bw, 20];
      E.ui.box(g, ...this.readyBtn, { bg: ['#2a5a20', '#14300c'], border: '#80ff90' }); TT.prompt(g, '{b:confirm} READY', this.readyBtn[0] + bw / 2, H - 28, I);
      E.ui.box(g, ...this.moreBtn, { bg: ['#4a3a10', '#2a2008'], border: card.asked ? '#ffe060' : '#a08040' }); TT.prompt(g, '{b:tri} OR M: MORE TIME', this.moreBtn[0] + bw / 2, H - 28, I);
    });
  }
};
if (typeof addEventListener === 'function') addEventListener('keydown', e => { if (e.code === 'KeyM' && TT.game && TT.game.scene === TT.scenes.card) TT.keyM = true; });
