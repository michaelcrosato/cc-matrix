/* =====================================================================================================================
 * ONLINE: AI Hub sessions (protocol v1, shared-world, 2-4 seats). KACHINUKI: winner stays on; bouts of one round to 2
 * points; the most bout wins takes the round (first to KC.TUNE.sessionTarget ends it). The host's copy (AIHub.isHost; a
 * server copy has no player of its own) runs the bouts at 120 Hz and sends snapshots (12 a second, unreliable) and events
 * (batched, reliable); every other copy sends its player's posture and technique presses and renders puppets from the
 * snapshots 100 ms behind, with a cosmetic wind-up predicted for its own presses. The host's own fighter is delayed by its
 * opponent's one-way latency (fairness). The card is the game's own: the stadium, the players kneeling in their colours.
 * Messages: in (guest -> host), hb (heartbeats), s (snapshots), ev (events). Network cadence is real time, never game time.
 * ===================================================================================================================== */
const PCODE = ['n', 'u', 'd', 'l', 'r'];
const SIGS = [null, 'hajime', 'yame', 'half', 'full', 'aiuchi', 'whistle', 'point', 'winner', 'nopoint'];
const SESSION_FIDS = ['taro', 'mei', 'ebi', 'ika'];
const now = () => (HUB && HUB.time ? HUB.time() : 0), realMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
// a stand-in bout for guests: what the HUD reads, from the snapshots
class PuppetBout {
  constructor(f, ref) { this.f = f; this.ref = ref; this.bus = new KC.Bus(); this.points = [0, 0]; this.roundWins = [0, 0]; this.clock = 30; this.phase = 'ready'; this.cardText = ''; this.rules = { pointsToWin: 2, roundsToWin: 1 }; this.score = [0, 0]; this.t = 0; }
  R(k) { return this.rules[k] !== undefined ? this.rules[k] : KC.TUNE[k]; }
  call(id) { this.ref.call(id); }
}
KC.Net = {
  stats: { sent: 0, recv: 0, sentBytes: 0, maxBytes: 0, perSec: [] },
  send(data, o) {
    if (this.ended || !HUB) return false;
    const s = JSON.stringify(data); this.stats.sent++; this.stats.sentBytes += s.length; this.stats.maxBytes = Math.max(this.stats.maxBytes, s.length);
    const t = realMs(); this.stats.perSec.push(t); while (this.stats.perSec.length && t - this.stats.perSec[0] > 1000) this.stats.perSec.shift();
    return HUB.send(data, o);
  }
};
KC.SessionScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false }, propSize: 1.4,
  enter() {
    const g = KC.game; this.state = 'connect'; this.t = 0; this.card = null; this.msgs = []; this.evq = []; this.remote = {}; this.lat = {}; this.left = new Set(); this.snaps = []; this.fairQ = [];
    KC.Stage.enter(g, 'stadium'); KC.music('session'); g.setView('kcside'); KC.scene = this; this.ref = new KC.Referee(); this.reader = new KC.Reader(g.input); this.lastSend = -1e9; this.lastHb = -1e9; this.lastSnap = -1e9; this.dirty = false; this.edges = []; this.seq = 0; this.lastP = 'n';
    this._connect();
  },
  exit() { KC.scene = null; },
  async _connect() {
    let info = null;
    try { info = await HUB.connect({ mode: 'shared-world', seats: [2, 4], card: true }); } catch (e) { info = null; }
    if (!info) { KC.game.go('title'); return; }
    this.info = info; this.me = info.me; this.isHost = !!info.isHost; this.server = !!info.server; this.players = (info.players || []).map(p => ({ id: p.id, name: KC.cleanName(p.name), color: p.color || '#ffffff' }));
    this.byId = {}; this.players.forEach((p, i) => { p.fid = SESSION_FIDS[i % SESSION_FIDS.length]; p.rig = KC.makeRig(p.fid, 'white', 'dan1', { colors: { belt: p.color, trim: p.color } }); this.byId[p.id] = p; });
    HUB.on('card', c => { this.card = c; });
    HUB.on('start', () => { this.state = 'countdown'; this.beats = 3; });
    HUB.on('message', (data, from) => this._onMessage(data, from));
    HUB.on('leave', e => this._onLeave(e.id));
    HUB.on('time-up', () => { if (this.isHost) this._finish(true); });
    HUB.on('end', e => this._onEnd(e));
    this.state = 'card';
    HUB.ready();
  },
  name(id) { const p = this.byId && this.byId[id]; return p ? p.name : 'P' + (id + 1); },
  /* ---- messages ---- */
  _onMessage(m, from) {
    if (!m || this.ended) return; KC.Net.stats.recv++;
    if (m.t === 'in' && this.isHost) {
      const R = this.remote[from] || (this.remote[from] = { posture: 'n', presses: [], seq: -1 });
      if (m.s <= R.seq) return; R.seq = m.s; R.posture = PCODE[m.p] || 'n';
      for (const e of m.e || []) R.presses.push(PCODE[e[0]]);
      const lat = Math.max(0, now() - (m.a || 0)); this.lat[from] = this.lat[from] === undefined ? lat : this.lat[from] * .8 + lat * .2;
    } else if (m.t === 'hb' && this.isHost) { const lat = Math.max(0, now() - (m.a || 0)); this.lat[from] = this.lat[from] === undefined ? lat : this.lat[from] * .8 + lat * .2; }
    else if (m.t === 's' && !this.isHost) { this.snaps.push(Object.assign({ at: realMs() }, m)); if (this.snaps.length > 30) this.snaps.shift(); if (this.state === 'countdown' && now() >= 0) this.state = 'play'; }
    else if (m.t === 'ev' && !this.isHost) for (const e of m.list || []) this._event(e);
  },
  // a host event replayed on a guest: sounds, popups, the referee's calls, the bout's changes
  _event(e) {
    const P = this.pb;
    if (e.k === 'bout') { this._puppets(e.ids, e.rules); this.queue = e.q; return; }
    if (e.k === 'over') { this.standings = e.standings; this.state = 'over'; return; }
    if (e.k === 'boutEnd') { this.lastWinner = e.w; this.wins = e.wins; return; }
    if (!P) return;
    if (e.k === 'call') P.ref.call(e.id, e.sub ? { sub: e.sub } : undefined);
    else if (e.k === 'sig') P.ref.signal(SIGS[e.s], e.side, 1);
    else { const f = e.side !== undefined ? P.f[e.side] : null; P.bus.emit(e.k, Object.assign({}, e, { f })); }
  },
  _onLeave(id) {
    this.left.add(id); if (!this.isHost || !this.K) return;
    const [w, r] = this.K.current(), inBout = id === w || id === r;
    this.K.remove(id);
    const alive = this.players.filter(p => !this.left.has(p.id));
    if (alive.length < 2) { this._finish(false); return; }
    if (inBout && this.sub && this.sub.bout && this.sub.bout.phase !== 'over') { const side = id === w ? 1 : 0; this.forfeit = true; this.sub.bout.forceWin(side, 'forfeit'); }
  },
  _onEnd(e) {
    this.ended = true; KC.Net.ended = true; this.state = 'over'; this.endReason = e.reason; if (e.standings) this.standings = e.standings;
    KC.game.audio.music(null); KC.Voice.muted = true; KC.game.audio.mute(true);
  },
  /* ---- the host: kachinuki and bouts ---- */
  _hostStart() {
    const ids = this.players.map(p => p.id).filter(id => !this.left.has(id));
    this.K = new KC.Kachinuki({ ids, target: KC.TUNE.sessionTarget }); this.boutN = 0; this._bout();
  },
  _bout() {
    const K = this.K, [w, r] = K.current(), self = this; if (w === undefined || r === undefined) { this._finish(false); return; }
    const pw = this.byId[w], pr = this.byId[r], rules = { roundsToWin: 1, pointsToWin: 2, clock: 30, intro: this.boutN === 0 };
    this.cur = [w, r]; this.boutN++; this.forfeit = false;
    const sub = Object.create(KC.FightScene); this.sub = sub;
    sub.enter({ mode: 'online', stage: 'stadium', seed: (this.info.seed || 1) + this.boutN, rules, noBelt: true,
      sides: [{ fid: pw.fid, name: pw.name, color: pw.color, tag: 'WINS ' + K.wins[w] }, { fid: pr.fid, name: pr.name, color: pr.color, tag: 'WINS ' + K.wins[r] }],
      net: { control: (i, f) => self._control(i, f), after: () => {} },
      onEnd: (win, b) => self._boutEnd(win, b) });
    sub.fx.noSlow = true;
    sub.bout.bus.on('*', (k, d) => self._collect(k, d));
    this._ev({ k: 'bout', ids: [w, r], q: K.queue.slice(), rules });
  },
  _collect(k, d) {
    const side = d && d.f ? d.f.side : d && d.side;
    if (k === 'call') this._ev({ k: 'call', id: d.id, sub: this.sub && this.sub.ref.banners.length ? this.sub.ref.banners[this.sub.ref.banners.length - 1].sub : null });
    else if (k === 'point') this._ev({ k: 'point', side: d.side, tech: d.tech, pts: d.pts, full: d.full, counter: d.counter, x: Math.round(d.x), z: Math.round(d.z) });
    else if (k === 'block') this._ev({ k: 'block', side: d.side, x: Math.round(d.x), z: Math.round(d.z) });
    else if (['active', 'land', 'start'].includes(k)) this._ev({ k, side, tech: d.tech, heavy: d.heavy });
    else if (['aiuchi', 'card', 'whistle', 'flag', 'roundEnd'].includes(k)) this._ev({ k, last: d && d.last, perfect: d && d.perfect });
  },
  _ev(e) { this.evq.push(e); },
  _boutEnd(win, b) {
    const K = this.K, ids = this.cur, st = {};
    ids.forEach((id, s) => { st[id] = { pts: b.score[s], conceded: b.conceded[s], full: b.f[s].stats.full, half: b.f[s].stats.half, blocks: b.f[s].stats.blocks }; });
    if (!this.left.has(ids[win]) || this.forfeit) K.result(ids[win], st); else K.result(ids[1 - win], st);
    this._ev({ k: 'boutEnd', w: ids[win], wins: Object.assign({}, K.wins) }); this.lastWinner = ids[win]; this.wins = Object.assign({}, K.wins);
    this.between = 1.8;
  },
  // a fighter's intent on the host: its own (fairness-delayed), or the remote player's latest posture and presses
  _control(i, f) {
    const id = this.cur[i];
    if (!this.server && id === this.me) {
      const c = KC.Overlay.active || KC.game.paused ? { posture: 'n', press: null } : this.reader.read(), other = this.cur[1 - i], delay = clamp(this.lat[other] || 0, 0, 150);
      this.fairQ.push({ at: realMs(), c }); let out = { posture: this.lastHostP || 'n', press: null };
      while (this.fairQ.length && realMs() - this.fairQ[0].at >= delay) { const q = this.fairQ.shift(); out = { posture: q.c.posture, press: q.c.press || out.press }; this.lastHostP = q.c.posture; }
      if (!out.press && this.pendingPress && f.free) { out.press = this.pendingPress; this.pendingPress = null; } else if (out.press && !f.free) { this.pendingPress = out.press; out.press = null; }
      return out;
    }
    const R = this.remote[id]; if (!R || this.left.has(id)) return { posture: 'n', press: null };
    return { posture: R.posture, press: R.presses.length ? R.presses.shift() : null };
  },
  _snapshot() {
    const sc = this.sub, b = sc && sc.bout; if (!b) return;
    const ref = sc.ref, sig = SIGS.indexOf(ref.sig);
    this.send({ t: 's', a: Math.round(now()), ph: b.phase, c: Math.round(b.clock * 10) / 10, sc: b.points, rw: b.roundWins, ids: this.cur, q: this.K.queue, f: b.f.map(f => f.snap()), ref: [Math.round(ref.x), sig < 0 ? 0 : sig, ref.side, ref.judges.map(j => j.vote)], card: b.phase === 'card' ? b.cardText : 0 }, { reliable: false });
  },
  _finish(timeUp) {
    if (this.finished || !this.isHost) return; this.finished = true;
    const K = this.K || new KC.Kachinuki({ ids: this.players.map(p => p.id) });
    const b = this.sub && this.sub.bout;
    if (timeUp && b && b.phase !== 'over' && b.points[0] !== b.points[1]) K.result(this.cur[b.points[0] > b.points[1] ? 0 : 1]);   // a bout in progress counts only when a side leads
    const live = id => !this.left.has(id), standings = K.standings().map(g => g.filter(live)).filter(g => g.length), scores = {}, stats = {};
    for (const p of this.players) { scores[p.id] = K.wins[p.id] || 0; stats[p.id] = { 'Bouts won': K.wins[p.id] || 0, 'Full points': K.full[p.id] || 0, 'Half points': K.half[p.id] || 0, 'Best streak': K.best[p.id] || 0 }; }
    const awards = [], top = (m, t, d, min = 1) => { let best = null; for (const p of this.players) if ((m[p.id] || 0) >= min && (!best || m[p.id] > m[best])) best = p.id; if (best !== null) awards.push({ id: best, title: t, detail: d(m[best]) }); };
    top(K.full, 'IPPON HUNTER', n => n + ' full points'); top(K.blocks, 'IRON WALL', n => n + ' blocks'); top(K.best, 'KACHINUKI', n => n + ' bouts in a row', 3);
    this.standings = standings; this.state = 'over';
    this._ev({ k: 'over', standings }); this._flush();
    try { HUB.finish({ standings, scores, stats, awards }); } catch (e) { KC.game.fail('finish', e); }
  },
  send(d, o) { return KC.Net.send(d, o); },
  _flush() { if (this.evq.length) { this.send({ t: 'ev', list: this.evq.splice(0, 40) }); } },
  /* ---- guests: puppets from snapshots ---- */
  _puppets(ids, rules) {
    if (this.pIds && this.pIds[0] === ids[0] && this.pIds[1] === ids[1] && this.pb) return;
    this.pIds = ids.slice(); const F = ids.map((id, s) => { const k = new KC.Karateka({ fid: this.byId[id] ? this.byId[id].fid : 'taro', side: s }); return k; });
    this.pref = new KC.Referee(); this.pb = new PuppetBout(F, this.pref); if (rules) this.pb.rules = rules;
    KC.fx.attach(this.pb, KC.game, { noSlow: true });
    for (const f of F) f.bus = this.pb.bus;
    this.snaps = this.snaps.filter(s => s.ids && s.ids[0] === ids[0] && s.ids[1] === ids[1]);
  },
  _applySnaps(dt) {
    if (!this.snaps.length) return; const S = this.snaps, last = S[S.length - 1];
    if (!this.pb || !last.ids || this.pIds[0] !== last.ids[0] || this.pIds[1] !== last.ids[1]) this._puppets(last.ids);
    const t = realMs() - 100; let a = S[0], b = S[0];
    for (let i = 0; i < S.length; i++) { if (S[i].at <= t) a = S[i]; if (S[i].at >= t) { b = S[i]; break; } b = S[i]; }
    const u = b.at > a.at ? clamp((t - a.at) / (b.at - a.at), 0, 1) : 1, P = this.pb;
    P.f.forEach((f, i) => {
      const sa = a.f && a.f[i], sb = b.f && b.f[i]; if (!sa || !sb) return;
      if (i === this.mySide && this.pred && realMs() - this.pred.at < 250 && !(KC.TECH[TECH_IDS[sb[4]]] && TECH_IDS[sb[4]] === this.pred.tech)) { f.k++; f._physics(dt); return; }   // keep the predicted wind-up until confirmed
      if (this.pred && i === this.mySide && (realMs() - this.pred.at >= 250 || TECH_IDS[sb[4]] === this.pred.tech)) this.pred = null;
      f.applySnap(sb); f.x = lerp(sa[0], sb[0], u); f.z = lerp(sa[1], sb[1], u);
    });
    P.phase = b.ph; P.clock = b.c; P.points = b.sc; P.roundWins = b.rw; P.cardText = b.card || P.cardText; this.queue = b.q;
    if (b.ref) { this.pref.tx = b.ref[0]; this.pref.x = approach(this.pref.x, b.ref[0], dt * 80); const sig = SIGS[b.ref[1]]; if (sig && this.pref.sig !== sig) this.pref.signal(sig, b.ref[2] === 1 ? 0 : 1, .3); else if (!sig) this.pref.sigT = Math.min(this.pref.sigT, .1); if (b.ref[3]) b.ref[3].forEach((v, j) => { this.pref.judges[j].vote = v; }); }
  },
  /* ---- every step ---- */
  update(dt) {
    const g = KC.game; this.t += dt; KC.Stage.update(dt);
    if (this.ended) { KC.camera(g, [200]); return; }
    if (this.state === 'card') {
      const I = g.input, c = I.clicked();
      if (!this.server) {
        if (KC.anyPressed('confirm') || KC.anyPressed('start') || (c && this.readyBtn && this._in(c, this.readyBtn))) { KC.consumeAll(); HUB.answer('ready'); KC.sfx('menuOk'); }
        if (KC.anyPressed('alt') || (c && this.moreBtn && this._in(c, this.moreBtn))) { KC.consumeAll(); HUB.answer('more'); KC.sfx('menuMove'); }
      }
      this._seiza(dt);
    } else if (this.state === 'countdown') {
      const T = now(), beat = Math.ceil(-T / 1000);
      if (T < 0 && beat !== this.beats && beat >= 1 && beat <= 3) { this.beats = beat; KC.sfx('taikoHit'); }
      if (T >= 0) { this.state = 'play'; if (this.isHost) this._hostStart(); }
      this._seiza(dt);
    } else if (this.state === 'play' || (this.state === 'over' && !this.ended)) {
      if (this.isHost) this._hostStep(dt); else this._guestStep(dt);
    }
    KC.camera(g, this.sub && this.isHost ? this.sub.fighters.map(f => f.x) : this.pb ? this.pb.f.map(f => f.x) : [200]);
  },
  _hostStep(dt) {
    if (this.sub && this.state === 'play') {
      KC.fx.step(KC.game, this.sub.fx, dt); this.sub.controls(dt); this.sub.bout.update(dt); KC.Stage.cheer = Math.max(KC.Stage.cheer, 0);
      if (this.between !== undefined && this.between !== null) { this.between -= dt; if (this.between <= 0) { this.between = null; if (this.K.champion !== null && this.K.champion !== undefined) this._finish(false); else this._bout(); } }
    }
    const t = realMs();
    if (t - this.lastSnap >= 100) { this.lastSnap = t; this._snapshot(); }
    if (this.evq.length && t - this.lastEv >= 250) { this.lastEv = t; this._flush(); }
    if (this.lastEv === undefined) this.lastEv = t;
  },
  _guestStep(dt) {
    const g = KC.game, t = realMs(), blocked = KC.Overlay.active || g.paused, c = blocked ? { posture: 'n', press: null } : this.reader.read();
    this.mySide = this.pIds ? this.pIds.indexOf(this.me) : -1;
    if (c.posture !== this.lastP) { this.lastP = c.posture; this.dirty = true; }
    if (c.press && this.mySide >= 0) { this.edges.push([PCODE.indexOf(c.press), Math.round(now())]); this.dirty = true; const f = this.pb && this.pb.f[this.mySide]; if (f && f.free && f.ctlOn) { const id = KC.MATRIX[KC.relDir(c.posture, f.face)][KC.relDir(c.press, f.face)]; if (id && id !== 'crouch') { f.startTech(id, this.pb.f[1 - this.mySide]); this.pred = { tech: f.tech, at: t }; } } }
    if (this.dirty && t - this.lastSend >= 67 && this.mySide >= 0) { this.lastSend = t; this.dirty = false; this.send({ t: 'in', s: ++this.seq, a: Math.round(now()), p: PCODE.indexOf(c.posture), h: 0, e: this.edges.splice(0) }); }
    if (t - this.lastHb >= 500) { this.lastHb = t; this.send({ t: 'hb', a: Math.round(now()) }, { reliable: false }); }
    if (this.pb) { this._applySnaps(dt); this.pref.update(dt, null); for (const f of this.pb.f) f.pose(dt); }
  },
  _seiza(dt) { (this.players || []).forEach((p, i) => { KC.poseStep(p.rig, dt, { seiza: 1 }); p.rig.update(dt, { x: 120 + i * 54, y: 0, z: 0, facing: PI / 2 }); }); },
  _in(c, b) { return c[0] >= b[0] && c[0] < b[0] + b[2] && c[1] >= b[1] && c[1] < b[1] + b[3]; },
  draw(r) {
    const S = this.state, host = this.isHost;
    KC.Stage.draw(r, 'stadium', {});
    if ((S === 'card' || S === 'countdown' || S === 'connect') && this.players) this.players.forEach((p, i) => r.actor(120 + i * 54, 0, 0, (g, ox, oy) => p.rig.draw(g, ox, oy, r.view)));
    else if (host && this.sub) { this.sub.ref.draw(r); for (const f of this.sub.fighters) f.draw(r); this._bench(r, this.cur); KC.HUD.draw(r, this.sub.bout, { names: this.sub.sides.map(s => s.name), colors: this.sub.sides.map(s => s.color), tags: this.sub.sides.map(s => s.tag), noBelt: true }); }
    else if (this.pb) { this.pref.draw(r); for (const f of this.pb.f) f.draw(r); this._bench(r, this.pIds); KC.HUD.draw(r, this.pb, { names: this.pIds.map(id => this.name(id)), colors: this.pIds.map(id => this.byId[id] ? this.byId[id].color : '#fff'), noBelt: true }); }
    r.overlay(g => {
      const W = r.W, H = r.H, mid = Math.round(W / 2);
      if (S === 'connect') { E.font.text(g, 'CONNECTING...', mid, H / 2, '#ffe7a8', { align: 'center', outline: '#000', scale: 2 }); return; }
      if (S === 'card' || S === 'countdown') this._drawCard(g, W, H);
      if (S === 'countdown') { const T = now(), n = Math.ceil(-T / 1000); E.font.title(g, T < 0 ? String(Math.max(1, n)) : KC.call('begin'), mid, Math.round(H * .3), { scale: 5, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'], depth: 3 }); }
      if (S === 'play') {
        const q = this.queue || (this.K && this.K.queue) || [], wins = this.wins || (this.K && this.K.wins) || {};
        const next = q.slice(2).map(id => (id === this.me ? 'YOU' : this.name(id))).join(', '); if (next) E.font.text(g, 'NEXT: ' + next, mid, H - 26, q[2] === this.me ? '#ffd060' : '#c8c0e8', { align: 'center', outline: '#000' });
        E.font.text(g, (this.players || []).map(p => p.name + ' ' + (wins[p.id] || 0)).join('   '), mid, H - 12, '#a8a0c8', { align: 'center', outline: '#000', font: 'tiny' });
        if (this.between > 0 && this.lastWinner !== undefined) E.font.title(g, this.name(this.lastWinner) + ' STAYS ON!', mid, Math.round(H * .55), { scale: 2, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'] });
      }
      if (S === 'over') this._drawOver(g, W, H);
    });
  },
  // the queued players kneel in seiza at the mat's edge
  _bench(r, cur) { (this.players || []).filter(p => !cur || !cur.includes(p.id)).filter(p => !this.left.has(p.id)).forEach((p, i) => { KC.poseStep(p.rig, 1 / 60, { seiza: 1 }); const x = i % 2 ? 392 - Math.floor(i / 2) * 20 : 8 + Math.floor(i / 2) * 20; p.rig.update(1 / 60, { x, y: 6, z: 0, facing: x < 200 ? 0 : PI }); r.actor(x, 6, 0, (g, ox, oy) => p.rig.draw(g, ox, oy, r.view)); }); },
  _drawCard(g, W, H) {
    const mid = Math.round(W / 2), C = this.card || {};
    px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, 100, '#05040a'));
    KC.drawLogo(g, W, 4, this.t, 3);
    E.font.text(g, KC.TEXT.kachinuki, mid, 46, '#ffe7a8', { align: 'center', outline: '#000', scale: 2 }); E.font.text(g, KC.TEXT.kachiRule, mid, 66, '#fff6e8', { align: 'center', outline: '#000' });
    (this.players || []).forEach((p, i) => { const x = Math.round(r0(i)); E.font.text(g, p.name + (p.id === this.me ? ' (YOU)' : ''), x, 80, p.color, { align: 'center', outline: '#000', font: 'tiny' }); if ((C.ready || []).includes(p.id)) E.font.text(g, 'READY', x, 88, '#8ae08a', { align: 'center', outline: '#000', font: 'tiny' }); });
    function r0(i) { const sc = E.VIEWS.kcside.scale, cx = KC.game.cam ? KC.game.cam.x : 200; void cx; return W / 2 + (120 + i * 54 - 200) * sc; }
    const dev = KC.device(), ctl = dev === 'gamepad' ? [{ kind: 'stick', side: 'L', dir: null }, 'MOVE  ', { kind: 'stick', side: 'R', dir: null }, 'STRIKE'] : [KC.actionIcon('up'), KC.actionIcon('left'), KC.actionIcon('down'), KC.actionIcon('right'), 'MOVE  ', KC.actionIcon('tUp'), KC.actionIcon('tLeft'), KC.actionIcon('tDown'), KC.actionIcon('tRight'), 'STRIKE'];
    const cw = KC.iconRow(g, 0, 0, ctl, 1, false); KC.iconRow(g, mid - Math.round(cw / 2), H - 58, ctl, 1);
    if (!this.server) {
      const rb = [mid - 92, H - 40, 84, 18], mb = [mid + 8, H - 40, 84, 18]; this.readyBtn = rb; this.moreBtn = mb; const asked = C.asked;
      E.ui.box(g, rb[0], rb[1], rb[2], rb[3], { bg: '#1a3a1a', border: '#8ae08a' }); KC.iconRow(g, rb[0] + 6, rb[1] + 3, [KC.actionIcon('confirm'), 'READY'], 1);
      E.ui.box(g, mb[0], mb[1], mb[2], mb[3], { bg: asked ? '#3a3a1a' : '#1a1a2a', border: '#e8d8b0' }); KC.iconRow(g, mb[0] + 6, mb[1] + 3, [KC.actionIcon('alt'), asked ? 'ASKED' : 'MORE TIME'], 1);
    }
    const left = C.left === null || C.left === undefined ? (C.paused ? 'PAUSED' : C.starting ? 'STARTING' : '') : Math.ceil(C.left / 1000) + 's';
    if (left) E.font.text(g, left, W - 10, H - 34, '#ffd060', { align: 'right', outline: '#000', scale: 2 });
  },
  _drawOver(g, W, H) {
    const mid = Math.round(W / 2); px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a'));
    E.font.title(g, this.endReason === 'host-left' ? KC.TEXT.hostLeft : KC.TEXT.roundOver, mid, 30, { scale: 3, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'], depth: 2 });
    (this.standings || []).forEach((grp, i) => E.font.text(g, (i + 1) + '. ' + grp.map(id => this.name(id)).join(' = '), mid, 76 + i * 18, i === 0 ? '#ffd060' : '#fff6e8', { align: 'center', outline: '#000', scale: 2 }));
  },
  debugState() { return { state: this.state, host: this.isHost, server: this.server, me: this.me, queue: this.K ? this.K.queue : this.queue, standings: this.standings, phase: this.isHost ? this.sub && this.sub.bout && this.sub.bout.phase : this.pb && this.pb.phase, wins: this.K ? this.K.wins : this.wins, ended: !!this.ended }; }
};
