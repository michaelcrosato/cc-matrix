/* ---- ONLINE: AI Hub Session Protocol v1, shared-world. The host (AIHub.isHost) runs the authoritative Kachinuki and
 * Bout at 120 Hz; guests send their input and draw the world from snapshots; spectators send heartbeats. A server host
 * (no player of its own) runs the same code with no local input. Network cadence uses real time, never game time.
 * Messages: in (guest -> host: posture, held technique, press edges), hb, s (host -> all snapshot, unreliable),
 * ev (host -> all events, reliable). ---- */
const PCODE = ['n', 'u', 'd', 'l', 'r'];
const Net = KC.Net = {
  info: null, role: null, me: null, players: [], K: null, bout: null, state: 'connect', card: null, startAt: null, over: null, sent: 0, sentLog: [], inputs: {}, lat: {}, left: new Set(), names: {},
  now() { return HUB ? HUB.time() : 0; },
  real() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); },
  async connect() {
    let info = null; try { info = await HUB.connect({ mode: 'shared-world', seats: [2, 4], card: true }); } catch (e) { game.fail('hub connect', e); }
    if (!info) { this.state = 'off'; game.go('title'); return; }
    this.info = info; this.me = info.me; this.players = info.players.map(p => p.id); this.role = info.server ? 'server' : info.isHost ? 'host' : 'guest';
    info.players.forEach(p => { this.names[p.id] = U.name(p.name); });
    this.colors = {}; info.players.forEach(p => { this.colors[p.id] = p.color; });
    HUB.on('card', c => { this.card = c; }); HUB.on('start', s => { this.state = 'countdown'; KC.music('stadium'); });
    HUB.on('message', (d, from) => this.onMsg(d, from)); HUB.on('leave', e => this.onLeave(e)); HUB.on('time-up', e => this.timeUp(e)); HUB.on('end', e => this.end(e));
    this.state = 'card'; this.K = KC.Kachinuki.make(this.players.length, TUNE.sessionTarget); this.K.ids = this.players.slice(); this.K.queue = this.players.map((p, i) => i);
    HUB.ready();
  },
  isFighter(id) { if (!this.K) return false; const q = this.K.queue; return this.K.ids[q[0]] === id || this.K.ids[q[1]] === id; },
  send(d, reliable = true) { if (this.state === 'ended' || !HUB) return; try { if (HUB.send(d, { reliable }) !== false) { this.sent++; this.sentLog.push(this.real()); } } catch (e) { game.fail('hub send', e); } },
  onMsg(d, from) {
    if (!d || this.state === 'ended') return;
    if (this.role !== 'guest') {
      if (d.t === 'in') { const I = this.inputs[from] || (this.inputs[from] = { p: 'n', edges: [] }); I.p = PCODE[d.p] || 'n'; for (const e of d.e || []) I.edges.push(PCODE[e[0]]); const l = this.now() - d.a; if (isFinite(l)) this.lat[from] = lerp(this.lat[from] === undefined ? l : this.lat[from], clamp(l, 0, 150), .2); }
      if (d.t === 'hb') { const l = this.now() - d.a; if (isFinite(l)) this.lat[from] = lerp(this.lat[from] === undefined ? l : this.lat[from], clamp(l, 0, 150), .2); }
      return;
    }
    if (d.t === 's') { if (!this.snapT || d.a >= this.snapT) { this.snapT = d.a; this.snap = d; this.applySnap(d); } }
    if (d.t === 'ev') for (const e of d.list || []) this.event(e);
  },
  // the host: a controller for a fighter played by a remote copy
  remote(id) { return () => { const I = this.inputs[id]; if (!I) return KC.NEUTRAL; const press = I.edges.shift() || null; return { posture: I.p, press }; }; },
  // the host's own fighter, through a fairness delay (the opponent's one-way latency)
  local(oppId) {
    const buf = [];
    return (f) => { const it = game.paused || this.menuOpen || KC.MoveList.active ? KC.NEUTRAL : KC.readIntent(game.input); buf.push({ t: this.real(), it }); const delay = clamp(this.lat[oppId] || 0, 0, 150); let out = KC.NEUTRAL, press = null; while (buf.length && buf[0].t <= this.real() - delay) { const b = buf.shift(); out = b.it; press = press || b.it.press; } return { posture: out.posture, press }; };
  },
  newBout() {
    const K = this.K, a = K.queue[0], b = K.queue[1], ids = K.ids, fids = [KN_FIGHTERS[a % 4], KN_FIGHTERS[b % 4]];
    const ctrl = [ids[a], ids[b]].map((pid, i) => this.role === 'host' && pid === this.me ? this.local(ids[i ? a : b]) : this.remote(pid));
    const W = new Karateka(fids[0], 0), R = new Karateka(fids[1], 1);
    this.bout = new Bout({ fighters: [W, R], ctrl, seed: 1000 + K.bouts, stage: 'stadium', roundsToWin: 1, pointsToWin: 2, clock: 30, intro: K.bouts === 0, online: true });
    const B = this.bout, evq = this.evq = [];
    B.on('call', c => evq.push({ k: 'call', id: c.id, text: c.text, side: c.side }));
    B.on('point', p => { evq.push({ k: 'point', side: p.side, pts: p.pts, full: p.full, tech: p.tech, counter: p.counter }); const pid = ids[K.queue[p.side]]; });
    B.on('block', p => evq.push({ k: 'block', side: p.side }));
    B.on('matchEnd', e => this.boutOver(e.winner));
    this.boutIds = [ids[a], ids[b]]; evq.push({ k: 'bout', a: ids[a], b: ids[b] });
  },
  boutOver(wSide, forfeit) {
    if (this.over || !this.bout) return; const K = this.K, B = this.bout, qa = K.queue[0], qb = K.queue[1];
    [qa, qb].forEach((p, i) => { K.full[p] += B.f[i].stats.full; K.half[p] += B.f[i].stats.half; K.blocks[p] += B.f[i].stats.blocks; });
    K.pts[qa] += B.f[0].stats.full + B.f[0].stats.half * .5; K.pts[qb] += B.f[1].stats.full + B.f[1].stats.half * .5; K.conceded[qa] += B.f[1].stats.full + B.f[1].stats.half * .5; K.conceded[qb] += B.f[0].stats.full + B.f[0].stats.half * .5;
    const w = KC.Kachinuki.result(K, wSide); this.evq.push({ k: 'boutEnd', w: K.ids[w], forfeit: !!forfeit });
    // skip players who left: they go to the back and sit out
    K.queue = K.queue.filter(p => !this.left.has(K.ids[p])).concat(K.queue.filter(p => this.left.has(K.ids[p])));
    const active = K.queue.filter(p => !this.left.has(K.ids[p]));
    if (K.champion >= 0 || active.length < 2) return this.finish();
    this.flushEv(); this.newBout();
  },
  standings() { const K = this.K, ids = this.players.filter(id => !this.left.has(id)), idx = ids.map(id => K.ids.indexOf(id)); return KC.Kachinuki.standings(K, idx).map(g => g.map(i => K.ids[i])); },
  finish() {
    if (this.over || this.role === 'guest') return; const K = this.K, S = this.standings(), scores = {}, stats = {}, awards = [];
    for (const id of this.players) { const i = K.ids.indexOf(id); scores[id] = K.wins[i]; stats[id] = { 'Bouts won': K.wins[i], 'Full points': K.full[i], 'Half points': K.half[i], 'Best streak': K.best[i] }; }
    const top = (arr, title, detail, min = 1) => { let best = -1, bi = -1; arr.forEach((v, i) => { if (v > best) { best = v; bi = i; } }); if (best >= min) awards.push({ id: K.ids[bi], title, detail: detail(best) }); };
    top(K.full, 'IPPON HUNTER', v => v + ' full points'); top(K.blocks, 'IRON WALL', v => v + ' blocks'); top(K.best, 'KACHINUKI', v => v + ' wins in a row', 3);
    this.over = { standings: S, scores }; this.evq && this.evq.push({ k: 'over', standings: S }); this.flushEv();
    try { HUB.finish({ standings: S, scores, stats, awards }); } catch (e) { game.fail('hub finish', e); }
  },
  onLeave(e) {
    this.left.add(e.id); if (this.role === 'guest') return;
    const active = this.players.filter(id => !this.left.has(id));
    if (active.length < 2) return this.finish();
    if (this.bout && this.boutIds && this.boutIds.includes(e.id) && this.state === 'play') { const side = this.boutIds.indexOf(e.id); this.bout.say('forfeit'); this.boutOver(1 - side, true); }
  },
  // time-up: a bout in progress counts only if a side leads on points
  timeUp() { if (this.role === 'guest' || this.over) return; const B = this.bout; if (B && this.state === 'play' && B.points[0] !== B.points[1] && B.phase !== 'over') { const K = this.K; K.wins[K.queue[B.points[0] > B.points[1] ? 0 : 1]]++; } this.finish(); },
  end(e) { this.state = 'ended'; this.endInfo = e; game.audio.music(null); try { const vb = game.audio.bus && game.audio.ctx && game.audio.bus('voice'); if (vb) vb.gain.value = 0; } catch (err) { /* no audio */ } game.audio.mute(true); },
  flushEv() { if (this.evq && this.evq.length && this.role !== 'guest') { this.send({ t: 'ev', list: this.evq.splice(0, 40) }, true); } },
  // the guest: a puppet bout drawn from snapshots
  applySnap(d) {
    if (!this.pbout || this.pids === undefined || d.ids[0] !== this.pids[0] || d.ids[1] !== this.pids[1]) {
      this.pids = d.ids.slice(); const fi = d.ids.map(id => KN_FIGHTERS[this.players.indexOf(id) % 4]);
      this.pbout = new Bout({ fighters: [new Karateka(fi[0], 0), new Karateka(fi[1], 1)], stage: 'stadium', roundsToWin: 1, pointsToWin: 2, clock: 30, intro: false }); this.pbout.puppet = true;
    }
    // a predicted wind-up holds for up to 250 ms; a snapshot that confirms any technique (or the window ends) takes over
    const pr = this.pred, keep = pr && this.real() - pr.t <= 250 && d.b.f[pr.side][4] < 0 ? this.pbout.f[pr.side].snap() : null;
    this.pbout.applySnapshot(d.b); if (keep) this.pbout.f[pr.side].apply(keep); else if (pr && d.b.f[pr.side][4] >= 0) { this.pred = null; this.confirmed = (this.confirmed || 0) + 1; } if (d.w) this.K.wins = d.w; if (d.q) this.K.queue = d.q;
  },
  event(e) {
    if (e.k === 'call') { const B = this.pbout; if (B) { B.call = { id: e.id, text: e.text, t: 0, side: e.side }; } KC.Voice.speak(e.text, 'genkotsu', { call: e.id, reverb: true }); }
    if (e.k === 'point') { game.audio.sfx(e.full ? 'thwackFull' : 'thwackHalf'); game.shake(e.full ? 4 : 2); KC.Voice.crowd(e.full ? 1 : .5); if (this.pbout) this.pbout.popups.push({ t: 0, x: this.pbout.f[1 - e.side].x, z: 66, text: (KC.TECH[e.tech].short || KC.TECH[e.tech].name) + ' • ' + e.pts, full: e.full }); this.stage && this.stage.react(e.full ? 'full' : 'point'); }
    if (e.k === 'block') game.audio.sfx('clack');
    if (e.k === 'over') this.over = { standings: e.standings };
  },
  // each step
  update(dt) {
    if (this.state === 'ended' || this.state === 'connect' || this.state === 'off') return;
    const now = this.now(), real = this.real();
    if (this.state === 'card') {
      const I = game.input, c = I.clicked && I.clicked();
      if (I.pressed('confirm') || (c && this.readyBtn && KC.inRect(c, this.readyBtn))) { HUB.answer('ready'); KC.sfx('menuOk'); }
      if (I.pressed('more') || (c && this.moreBtn && KC.inRect(c, this.moreBtn))) { HUB.answer('more'); KC.sfx('menuMove'); }
    }
    if (this.state === 'countdown') { const s = Math.ceil(-now / 1000); if (s !== this.lastCount && s > 0 && s <= 3) { this.lastCount = s; game.audio.sfx('taikoHit'); } if (now >= 0) { this.state = 'play'; if (this.role !== 'guest') this.newBout(); } }
    if (this.state !== 'play') { this.heartbeat(real, now); return; }
    if (this.role !== 'guest') {
      if (!this.over && this.bout) this.bout.update(dt);
      if (!this.lastSnap || real - this.lastSnap >= 83) { this.lastSnap = real; const B = this.bout; if (B) this.send({ t: 's', a: now, b: B.snapshot(), ids: this.boutIds, q: this.K.queue, w: this.K.wins }, false); }
      if (this.evq && this.evq.length && (!this.lastEv || real - this.lastEv >= 120)) { this.lastEv = real; this.flushEv(); }
      this.renderBout = this.bout;
    } else {
      // guests: send input on change (press edges coalesced), at most 15 a second; spectators send heartbeats
      const fighting = this.pids && this.pids.includes(this.me), it = fighting && !game.paused && !this.menuOpen && !KC.MoveList.active ? KC.readIntent(game.input) : KC.NEUTRAL;
      if (it.press) { (this.edges = this.edges || []).push(it.press); const side = this.pids.indexOf(this.me), pf = this.pbout && this.pbout.f[side]; if (pf && pf.free()) { pf.control(it, this.pbout.f[1 - side], dt); if (pf.st === 'tech') { this.pred = { side, t: real, tech: pf.tech }; game.audio.sfx('whooshL', { vol: .5 }); } } }
      if (this.pred && this.pbout) { const pf = this.pbout.f[this.pred.side]; if (real - this.pred.t > 250) this.pred = null; else if (pf.st === 'tech') pf.step(dt, this.pbout.f[1 - this.pred.side], [0, 400]); }
      const pc = PCODE.indexOf(it.posture);
      if (fighting && (pc !== this.lastP || (this.edges && this.edges.length)) && (!this.lastIn || real - this.lastIn >= 66)) { this.lastIn = real; this.lastP = pc; this.send({ t: 'in', s: (this.seq = (this.seq || 0) + 1), a: now, p: pc, e: (this.edges || []).splice(0).map(d => [PCODE.indexOf(d), Math.round(now)]) }, true); }
      if (this.pbout) { this.pbout.presentUpdate(dt); if (this.pbout.call) this.pbout.call.t += dt; }
      this.renderBout = this.pbout;
    }
    this.heartbeat(real, now);
  },
  heartbeat(real, now) { if (this.role === 'guest' && this.state !== 'ended' && this.state !== 'connect' && (!this.lastHb || real - this.lastHb >= 500)) { this.lastHb = real; this.send({ t: 'hb', a: isFinite(now) ? now : 0 }, false); } }
};
KC.inRect = (p, r) => p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3];

scenes.session = SC({
  pausable: false,
  enter() { this.stage = new Stage('stadium'); this.stage.enter(); Net.stage = this.stage; KC.music('session'); this.t = 0; this.kneel = []; if (Net.state === 'connect' && !this.started) { this.started = true; Net.connect(); } },
  update(dt) {
    this.t += dt; this.stage.update(dt);
    const I = game.input, create = (typeof navigator !== 'undefined' && (() => { try { const p = navigator.getGamepads && Array.from(navigator.getGamepads() || []).find(x => x); return !!(p && p.buttons[8] && p.buttons[8].pressed); } catch (e) { return false; } })());
    if (Net.state !== 'ended' && I.pressed('pause') && !create) { Net.menuOpen = !Net.menuOpen; if (Net.menuOpen) this.menu = new Menu([{ label: 'RESUME', fn: () => { Net.menuOpen = false; } }, { label: () => 'SOUND: ' + (game.settings.sound ? 'ON' : 'OFF'), fn: () => game.settings.set('sound', !game.settings.sound) }, { label: () => 'BUTTON SYMBOLS: ' + (KC.padFamily() === 'xbox' ? 'XBOX' : 'PLAYSTATION'), fn: () => game.settings.set('glyphs', KC.padFamily() === 'xbox' ? 'playstation' : 'xbox') }, { label: 'MOVE LIST', fn: () => { Net.menuOpen = false; KC.MoveList.active = true; KC.MoveList.make(); } }], { onCancel: () => { Net.menuOpen = false; } }); I.consumeAll(); }
    if (Net.menuOpen && this.menu) this.menu.update(dt); else if (KC.MoveList.active) KC.MoveList.update(dt);
    Net.update(dt);
    if (Net.players.length && this.kneel.length !== Net.players.length) this.kneel = Net.players.map((id, i) => { const k = new Karateka(KN_FIGHTERS[i % 4], i % 2, { x: 120 + i * 54 }); k.setPose('seiza'); k.rig.C.belt = Net.colors[id] || '#fff'; return k; });
    const B = Net.renderBout;
    if (B) { KC.stageCam(B.f); } else KC.stageCam([{ x: 200 }]);
    if (Net.state !== 'play' || !B) this.kneel.forEach(k => k.update(dt));
  },
  draw(r) {
    this.stage.draw(r); const B = Net.renderBout;
    if (KC.MoveList.active) { KC.MoveList.draw(r); }
    if (B && Net.state === 'play') { B.draw(r); const nm = (Net.pids || Net.boutIds || []).map(id => Net.names[id] || '?'); KC.HUD.draw(r, B, { names: nm }); }
    else this.kneel.forEach(k => k.draw(r));
    r.overlay(g => {
      const W = r.W, H = r.H, ids = Net.players;
      if (Net.state === 'card' || Net.state === 'connect') {
        px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a'));
        KC.title(g, 'KARATE CHAMPON', W / 2, 8, 3); KC.title(g, 'KACHINUKI! WINNER STAYS ON.', W / 2, 38, 2);
        T(g, 'FIRST TO 2 POINTS WINS A BOUT. MOST BOUTS WINS.', W / 2 - TW('FIRST TO 2 POINTS WINS A BOUT. MOST BOUTS WINS.') / 2, 58, '#e8e0ff');
        const c = Net.card || {}, ready = c.ready || [];
        ids.forEach((id, i) => { const x = 20 + i * (W - 40) / 4, on = ready.includes(id); box(g, x, 72, (W - 40) / 4 - 6, 22, { border: Net.colors[id] || '#fff' }); T(g, Net.names[id] + (id === Net.me ? ' (YOU)' : ''), x + 5, 76, Net.colors[id] || '#fff'); T(g, on ? 'READY' : '...', x + 5, 85, on ? '#5aff8a' : '#a8a0c0', { font: 'tiny' }); });
        const d = KC.dev(); KC.promptRow(g, [[d === 'pad' ? 'L:n' : 'key:W', 'MOVE'], [d === 'pad' ? 'R:n' : 'key:I', 'STRIKE (OR FACE BUTTONS / IJKL)']], W / 2, 102, 11);
        this.readyBtn = [W / 2 - 110, H - 64, 100, 24]; this.moreBtn = [W / 2 + 10, H - 64, 100, 24]; Net.readyBtn = this.readyBtn; Net.moreBtn = this.moreBtn;
        box(g, ...this.readyBtn, { border: '#5aff8a' }); KC.glyph(g, this.readyBtn[0] + 6, this.readyBtn[1] + 6, d === 'pad' ? 'pad0' : 'key:ENTER', 11); T(g, 'READY', this.readyBtn[0] + 44, this.readyBtn[1] + 8, '#fff');
        box(g, ...this.moreBtn, { border: c.asked ? '#ffd060' : '#8a7aa0' }); KC.glyph(g, this.moreBtn[0] + 6, this.moreBtn[1] + 6, d === 'pad' ? 'pad3' : 'key:T', 11); T(g, 'MORE TIME', this.moreBtn[0] + 26, this.moreBtn[1] + 8, '#fff');
        const left = c.left; T(g, c.paused ? 'PAUSED: MORE TIME ASKED' : c.starting ? 'STARTING...' : left != null ? 'STARTS IN ' + Math.ceil(left / 1000) : '', W / 2 - 50, H - 34, '#ffd060');
      }
      if (Net.state === 'countdown') { const s = Math.ceil(-Net.now() / 1000); KC.title(g, s > 0 ? String(s) : KC.calls('begin'), W / 2, H * .35, 5); }
      if (Net.state === 'play' && Net.K) { const K = Net.K, q = K.queue; T(g, 'BOUT WINS: ' + Net.players.map(id => Net.names[id] + ' ' + (K.wins[Net.players.indexOf(id)] || 0)).join('  '), 8, H - 12, '#ffd060', { font: 'tiny' }); const nx = q[2] !== undefined ? Net.players[q[2]] : null; if (nx !== null && nx !== undefined) T(g, nx === Net.me ? 'NEXT: YOU' : 'NEXT: ' + Net.names[nx], W - 90, H - 12, '#ff8a6a', { font: 'tiny' }); }
      if (Net.menuOpen && this.menu) { px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a')); KC.title(g, 'PAUSED (THE BOUT GOES ON)', W / 2, 30, 2); this.menu.draw(g, W / 2, 70); }
      if (Net.state === 'ended' || Net.over) { px.blend(g, .6, 'normal', () => px.rect(g, 0, 40, W, 110, '#05040a')); KC.title(g, Net.endInfo && Net.endInfo.reason === 'host-left' ? 'HOST LEFT' : 'ROUND OVER', W / 2, 50, 3); const S = (Net.endInfo && Net.endInfo.standings) || (Net.over && Net.over.standings) || []; S.forEach((grp, k) => T(g, (k + 1) + '. ' + grp.map(id => Net.names[id] || '?').join(', '), W / 2 - 60, 84 + k * 12, '#fff6d0')); }
    });
  }
});
