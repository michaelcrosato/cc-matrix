/* ---------- AI Hub session (protocol v1, shared-world): the host runs Kachinuki, guests send input and render snapshots ---------- */
const HUBCOL = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'], SEAT_FIGHTERS = ['taro', 'kamaboko', 'negi', 'ebi'];
const PCODE = { n: 0, u: 1, d: 2, l: 3, r: 4 }, PCHAR = ['n', 'u', 'd', 'l', 'r'];
const SEND_BUDGET = { last: 0 };
class Net {
  constructor(hub) {
    this.h = hub; this.t0 = performance.now(); this.state = 'card'; this.card = null; this.started = false; this.ended = false; this.endInfo = null; this.me = hub.me; this.host = hub.isHost; this.server = !!hub.server;
    this.players = (hub.players || []).map(p => ({ id: p.id, name: safeName(p.name), color: p.color || HUBCOL[p.id % 4], fighter: SEAT_FIGHTERS[p.id % 4] }));
    this.inputs = {}; this.players.forEach(p => { this.inputs[p.id] = { posture: 'n', edges: [], held: 'n' }; });
    this.reader = new Reader(KC.game.input); this.seq = 0; this.lastSend = 0; this.lastHb = 0; this.lastSnap = 0; this.evq = []; this.snap = null; this.snaps = []; this.delay = 0; this.delayQ = []; this.lat = {}; this.finished = false; this.counts = { sent: 0, recv: 0 }; this.pred = null; this.prevPosture = 'n'; this.pend = []; this.t = 0; this.puppets = null;
    hub.on('card', c => { this.card = c; }); hub.on('start', s => { this.started = true; this.startIn = s.in; }); hub.on('message', (d, from) => this.onMessage(d, from)); hub.on('leave', e => this.onLeave(e)); hub.on('time-up', e => this.onTimeUp(e)); hub.on('end', e => this.onEnd(e));
  }
  now() { return typeof this.h.time === 'function' ? this.h.time() : 0; }
  clock() { const c = this.now(); return isFinite(c) ? c + 1e6 : performance.now(); }   // real-time cadence: the hub's clock when it runs, else the wall clock
  send(d, rel) { const ok = this.h.send(d, { reliable: rel !== false }); if (ok !== false) this.counts.sent++; return ok; }
  // ---------- host ----------
  startWorld() {
    if (this.world) return; this.world = true; const ids = this.players.map(p => p.id); this.K = new Kachinuki(ids, T().sessionTarget); this.bouts = 0; this.view = null; this.newBout(); this.over = false; this.sessionStart = true;
  }
  fighterOf(id) { const p = this.players.find(q => q.id === id); return p ? p.fighter : 'taro'; }
  nameOf(id) { const p = this.players.find(q => q.id === id); return p ? p.name : '?'; }
  ctrlFor(id) {
    return (m, f, b) => {
      let inp = this.inputs[id]; if (!inp) return null;
      if (id === this.me && !this.server) { // the host's own fighter, through the fairness delay
        const c = this.reader.read(); this.delayQ.push({ at: this.clock(), c }); const dly = this.delay; let out = null;
        while (this.delayQ.length && this.clock() - this.delayQ[0].at >= dly) { const e = this.delayQ.shift(); inp.posture = e.c.posture; if (e.c.tech) inp.edges.push(e.c.tech); }
        if (KC.dev.open || (KC.menuOpen())) { inp.posture = 'n'; inp.edges.length = 0; }
      }
      return { posture: inp.posture, tech: inp.edges.length ? inp.edges.shift() : null };
    };
  }
  newBout() {
    const K = this.K, pr = K.pair; if (!pr || K.over) { this.finishNow(); return; }
    this.pair = pr.slice(); this.bout = new Bout({ ids: pr.map(id => this.fighterOf(id)), names: pr.map(id => this.nameOf(id)), seed: 100 + this.bouts, single: true, intro: this.bouts === 0, ctrl: pr.map(id => this.ctrlFor(id)), mode: 'session' });
    this.bouts++; this.bout.on('call', c => this.queue({ k: 'call', id: c.id })); this.bout.on('point', p => this.queue({ k: 'point', side: p.side, tech: p.tech, pts: p.pts, full: p.full, counter: p.counter, x: p.x }));
    this.bout.on('block', p => this.queue({ k: 'block', side: p.side, x: p.x })); this.bout.on('aiuchi', () => this.queue({ k: 'aiuchi' })); this.bout.on('hantei', h => this.queue({ k: 'hantei', v: h.votes, w: h.winner }));
    this.bout.on('matchEnd', e => this.boutEnded(e.winner)); this.queue({ k: 'bout', pair: this.pair, f: this.pair.map(id => this.fighterOf(id)), q: this.K.q.slice() });
    this.hud = new FightHUD(this.bout, { names: this.pair.map(id => this.nameOf(id)), hideScore: true }); this.stageReact = this.stage; this.bout.start();
    this.bout.on('point', p => KC.scenes.fight.onPoint.call(this.sceneRef, p)); this.bout.on('block', p => KC.scenes.fight.onBlock.call(this.sceneRef, p));
    this.forfeit = false;
  }
  boutEnded(w) {
    const K = this.K; const win = K.result(w, this.bout.stats); this.queue({ k: 'boutEnd', winner: win, wins: K.s[win].wins, q: K.q.slice(), forfeit: this.forfeit }); this.queue({ k: 'stand', st: K.standings() });
    if (K.over) { this.finishNow(); return; } this.newBout();
  }
  queue(e) { this.evq.push(e); }
  flush() { if (this.evq.length) { this.send({ t: 'ev', list: this.evq.splice(0, 20) }, true); } }
  forfeitBout(leaverIdx) {
    const b = this.bout; if (!b || b.done) return; this.forfeit = true; b.call('forfeit'); b.done = true; b.phase = 'done'; b.matchWinner = 1 - leaverIdx; b.emit('matchEnd', { winner: 1 - leaverIdx, stats: b.stats, score: b.score });
  }
  finishNow() {
    if (this.finished || !this.K) return; this.finished = true; const K = this.K;
    // a bout in progress counts only if a side leads on points
    if (this.bout && !this.bout.done && this.bout.pts[0] !== this.bout.pts[1]) { const w = this.bout.pts[0] > this.bout.pts[1] ? 0 : 1; K.result(w, this.bout.stats); }
    const st = K.standings(), scores = {}, stats = {}, awards = [], pl = this.players.filter(p => true);
    K.ids.forEach(id => { scores[id] = K.s[id].wins; stats[id] = { 'Bouts won': K.s[id].wins, 'Full points': K.s[id].full, 'Half points': K.s[id].half, 'Best streak': K.s[id].best }; });
    const most = (key) => { let best = null, v = 0; K.ids.forEach(id => { if (K.s[id][key] > v) { v = K.s[id][key]; best = id; } }); return best === null ? null : { id: best, v }; };
    const ih = most('full'), iw = most('blocks'), ks = most('best'); if (ih) awards.push({ id: ih.id, title: 'IPPON HUNTER', detail: ih.v + ' full points' }); if (iw) awards.push({ id: iw.id, title: 'IRON WALL', detail: iw.v + ' blocks' }); if (ks && ks.v >= 3) awards.push({ id: ks.id, title: 'KACHINUKI', detail: ks.v + ' bouts in a row' });
    this.standings = st; this.queue({ k: 'over', st }); this.flush();
    try { this.h.finish({ standings: st, scores, stats, awards }); } catch (e) { /* ok */ }
  }
  onLeave(e) {
    if (!this.host || !this.K || this.finished) return; const id = e.id, K = this.K, idx = this.pair ? this.pair.indexOf(id) : -1;
    if (idx >= 0) this.forfeitBout(idx); else K.leave(id);
    if (idx >= 0 && !this.finished) { K.leave(id); if (K.q.length < 2) { K.over = true; this.finishNow(); } }
    else if (K.q.length < 2) { K.over = true; this.finishNow(); }
  }
  onTimeUp() { if (this.host) this.finishNow(); }
  onEnd(e) { this.ended = true; this.endInfo = e || {}; KC.music(null); try { KC.game.audio.stopMusic && KC.game.audio.stopMusic(); KC.game.audio.mute(true); } catch (er) { /* ok */ } if (KC.Voice._bus) KC.Voice._bus.g.gain.value = 0; }
  // ---------- messages ----------
  onMessage(d, from) {
    this.counts.recv++; if (this.ended || !d) return;
    if (d.t === 'in' && this.host) {
      const inp = this.inputs[from]; if (!inp) return; inp.posture = PCHAR[d.p] || 'n'; inp.held = PCHAR[d.h] || 'n'; (d.e || []).forEach(e => inp.edges.push(PCHAR[e[0]])); inp.edges = inp.edges.slice(-6);
      const lat = Math.max(0, this.now() - d.a); this.lat[from] = this.lat[from] === undefined ? lat : this.lat[from] * .8 + lat * .2; this.updateDelay();
    } else if (d.t === 'hb') { /* heartbeat */ }
    else if (d.t === 's' && !this.host) { this.snaps.push({ at: this.clock(), s: d }); if (this.snaps.length > 6) this.snaps.shift(); this.snap = d; }
    else if (d.t === 'ev' && !this.host) (d.list || []).forEach(e => this.onEvent(e));
  }
  updateDelay() { if (!this.pair) return; const other = this.pair.find(id => id !== this.me); this.delay = clamp(this.lat[other] || 0, 0, 150); }
  onEvent(e) {
    const sc = this.sceneRef; if (!sc) return;
    if (e.k === 'bout') { this.pair = e.pair; this.fighters = e.f; this.queueIds = e.q; this.makePuppets(e.f, e.pair); }
    else if (e.k === 'call') { const v = this.view; if (v) { sc.hud && (sc.hud.call = { id: e.id, t: KC.game.real, text: KC.callText(e.id) }); } KC.onCall({ id: e.id }); }
    else if (e.k === 'point') { const p = { side: e.side, tech: e.tech, pts: e.pts, full: e.full, counter: e.counter, x: e.x }; KC.scenes.fight.onPoint.call(sc, Object.assign(p, {})); if (sc.hud) sc.hud.pop.push({ t: KC.game.real, text: KC.TECHS[e.tech].name + ' ' + e.pts + (e.counter ? ' COUNTER!' : ''), side: e.side, full: e.full }); }
    else if (e.k === 'block') KC.scenes.fight.onBlock.call(sc, { x: e.x, side: e.side });
    else if (e.k === 'boutEnd') { this.queueIds = e.q; this.lastWinner = e.winner; }
    else if (e.k === 'over') { this.standings = e.st; this.overSeen = true; }
    else if (e.k === 'stand') { this.stand = e.st; }
  }
  makePuppets(fighters, pair) {
    const P = this.puppets || (this.puppets = {}); this.view = this.view || { phase: 'ready', pt: 0, dur: 100, clock: 30, pts: [0, 0], rounds: [0, 0], round: 1, needRounds: 1, single: true, score: [0, 0], f: null, lastPoint: null, hantei: null, winner: -1, pace: () => 60, on() { }, stats: [{}, {}] };
    this.view.f = fighters.map((fid, i) => { const key = fid + ':' + i; if (!P[key]) { const k = new Karateka(fid, i, { puppet: true, name: this.nameOf(pair[i]) }); k.reset(); P[key] = k; } return P[key]; });
    this.view.names = pair.map(id => this.nameOf(id));
    if (this.sceneRef) { this.sceneRef.hud = new FightHUD(this.view, { names: this.view.names, hideScore: true }); this.sceneRef.hud.call = null; }
  }
  // guests: apply the newest snapshot to the puppets (positions smoothed, state from the snapshot)
  applySnapshot(dt) {
    const s = this.snap, v = this.view; if (!s || !v || !v.f) return;
    v.phase = s.ph; v.clock = s.c; v.pts = s.sc; v.rounds = s.rw; v.pt = s.pt || 0; v.dur = s.dur || 100; v.lastPoint = s.lp || null; v.hantei = s.hv ? { votes: s.hv, winner: s.hw } : null; v.winner = s.w === undefined ? -1 : s.w; v.round = 1;
    const mine = this.pair ? this.pair.indexOf(this.me) : -1;
    s.f.forEach((a, i) => {
      const f = v.f[i]; if (!f || f.id !== a[0]) return; const tx = a[1]; const old = f.x;
      const keepPred = this.pred && i === mine && this.clock() - this.pred.at < 250 && !a[5];
      f.apply(a); f.x = Math.abs(tx - old) > 40 ? tx : lerp(old, tx, clamp(dt * 14, 0, 1));
      if (keepPred) { f.tech = this.pred.tech; f.t = this.pred.t; f.fr = this.pred.fr; f.state = 'tech'; }
      f.frozen = false;
    });
    this.snap = null;
  }
  advancePuppets() { const v = this.view; if (!v || !v.f) return; for (const f of v.f) { if (f.tech && f.fr) { f.t = Math.min(f.t + 1, f.fr[0] + f.fr[1] + f.fr[2] + f.recoil); } if (this.pred && f === v.f[this.pair ? this.pair.indexOf(this.me) : -1] && this.pred.tech) { this.pred.t = Math.min(this.pred.t + 1, 400); if (f.tech === this.pred.tech) f.t = Math.max(f.t, this.pred.t * 0); } } }
  // ---------- per frame ----------
  update(dt, scene) {
    this.t += dt; this.sceneRef = scene; const nowT = this.clock();
    if (this.ended) return;
    const hubT = this.now();
    if (this.state === 'card') {
      if (this.started && hubT > -Infinity && hubT >= -3000) this.state = 'count';
    }
    if (this.state === 'count') { if (hubT >= 0) { this.state = 'play'; this.cntShow = nowT; if (this.host) this.startWorld(); KC.sfx('taikoHit'); KC.music('session' === 'x' ? null : scene.stage.d.music); } else { const n = Math.ceil(-hubT / 1000); if (n !== this.lastN) { this.lastN = n; KC.sfx('taikoHit'); } } }
    if (this.state === 'play' && this.host && !this.world) this.startWorld();
    // everyone: send heartbeats; guests: send input
    if (!this.host && !this.ended) this.sendInput(nowT);
    if (this.host && this.world && this.bout && !this.finished) {
      // the live menu never stops the world, but the local fighter's input is neutral while it is open
      this.bout.update(dt); KC.updateReferee(this.bout, dt);
      if (nowT - this.lastSnap >= 83) { this.lastSnap = nowT; this.sendSnapshot(); }
      this.flush();
      if (this.hud) this.hud.names = this.pair.map(id => this.nameOf(id));
    }
    if (this.host && !this.ended && nowT - this.lastHb >= 500 && !this.world) { this.lastHb = nowT; this.send({ t: 'hb', a: hubT }, false); }
    if (!this.host) { if (nowT - this.lastHb >= 500) { this.lastHb = nowT; this.send({ t: 'hb', a: hubT }, false); } this.applySnapshot(dt); const steps = Math.max(1, Math.round(dt * 120)); for (let k = 0; k < steps; k++) this.advancePuppets(); if (this.view && this.view.f) { for (const f of this.view.f) f.update(dt, this.view.f[1 - f.side]); KC.updateReferee(this.view, dt); } }
    else if (this.world && this.bout && this.bout.f) { /* bout updates its fighters */ }
  }
  sendInput(nowT) {
    if (this.server || !this.players.find(p => p.id === this.me)) return;
    const c = KC.dev.open || KC.menuOpen() ? { posture: 'n', tech: null, held: null } : this.reader.read();
    if (c.tech) { this.pend.push([PCODE[c.tech], Math.round(this.now())]); if (this.pend.length > 6) this.pend.shift(); if (this.view && this.view.f && this.pair) { const i = this.pair.indexOf(this.me); const f = this.view.f[i]; if (f && f.state === 'free' && !this.pred) { const id = f.resolve(c.posture, c.tech, this.view.f[1 - i]); if (id) { f.start(id, this.view.f[1 - i], c.posture, c.tech); this.pred = { tech: f.tech, t: 0, fr: f.fr, at: this.clock() }; KC.sfx(KC.TECHS[id].height === 'high' || KC.TECHS[id].spin ? 'whooshH' : 'whooshL'); KC.Voice.kiai(f.d.voice, KC.TECHS[id].kiai === 'heavy'); } } } }
    if (this.pred && this.clock() - this.pred.at > 500) this.pred = null;
    const changed = c.posture !== this.prevPosture;
    if ((changed || this.pend.length) && nowT - this.lastSend >= 66) { this.lastSend = nowT; this.prevPosture = c.posture; const e = this.pend.splice(0, 6); this.send({ t: 'in', s: ++this.seq, a: Math.round(this.now()), p: PCODE[c.posture], h: PCODE[c.held || 'n'] || 0, e }, true); }
    else if (changed) { /* wait for the next slot; posture is re-read each frame */ }
    if (!changed && !this.pend.length && nowT - this.lastSend > 400) { this.lastSend = nowT; this.send({ t: 'in', s: ++this.seq, a: Math.round(this.now()), p: PCODE[c.posture], h: PCODE[c.held || 'n'] || 0, e: [] }, true); }
  }
  sendSnapshot() {
    const b = this.bout; if (!b || !this.pair) return;
    const lp = b.lastPoint && !b.lastPoint.aiuchi ? { side: b.lastPoint.side, tech: b.lastPoint.tech, pts: b.lastPoint.pts, full: b.lastPoint.full, aiuchi: false } : b.lastPoint ? { aiuchi: true } : null;
    this.send({ t: 's', a: Math.round(this.now()), k: b.steps, ph: b.phase, pt: b.pt, dur: b.dur, c: Math.round(b.clock * 10) / 10, sc: b.pts, rw: b.rounds, q: this.K.q, pair: this.pair, f: b.f.map(f => f.snap()), lp, hv: b.hantei ? b.hantei.votes : null, hw: b.hantei ? b.hantei.winner : undefined, w: b.winner, ref: [b.phase, b.pt] }, false);
  }
}
KC.Net = Net;
const SESSION_KEYS = KC_KEYS;
KC.scenes.session = {
  view: 'side', input: KC_KEYS, res: 'ps1', pausable: true, touch: [], camera: { zoom: false },
  enter() {
    const g = KC.game; this.stage = new Stage('stadium'); this.stage.d = Object.assign({}, this.stage.d, { ambient: .5 }); this.net = null; this.connecting = true; this.t = 0; g.follow(null); KC.current = this; g.live = true;
    this.rigs = SEAT_FIGHTERS.map((f, i) => KC.makeRig(KC.FIGHTER[f], i % 2, 'white'));
    KC.music('session'); this.boot();
  },
  async boot() {
    const info = await HUB.connect({ mode: 'shared-world', seats: [2, 4], card: true });
    if (!info) { this.connecting = false; KC.game.go('title'); return; }
    this.net = new Net(HUB); KC.net = this.net; this.connecting = false;
    this.pcols = this.net.players.map(p => p.color);
    HUB.ready();
  },
  update(dt) {
    const g = KC.game, I = g.input; this.t += dt; this.stage.update(dt); g.focus(200, 0, 50);
    const n = this.net; if (!n) return;
    n.sceneRef = this;
    // Options opens the menu over the running world, unless Create is held (that chord is the hub's)
    if (g.paused) { let create = false; try { create = Array.from(navigator.getGamepads() || []).some(p => p && p.buttons && p.buttons[8] && p.buttons[8].pressed); } catch (e) { /* none */ } if (create) g.resume(); }
    // the game's own card: Ready (confirm) and More time (△, T, a click)
    if (n.state === 'card' && !n.ended) {
      if (I.pressed('confirm') || I.pressed('start')) { HUB.answer('ready'); KC.sfx('menuOk'); }
      if (I.pressed('tUp') || I.pressed('tabL')) { HUB.answer('more'); KC.sfx('menuMove'); }
      const c = I.clicked(); if (c && this.btn) { if (c[0] >= this.btn.ready.x && c[0] < this.btn.ready.x + this.btn.ready.w && c[1] >= this.btn.ready.y && c[1] < this.btn.ready.y + 20) { HUB.answer('ready'); KC.sfx('menuOk'); } else if (c[0] >= this.btn.more.x && c[0] < this.btn.more.x + this.btn.more.w && c[1] >= this.btn.more.y && c[1] < this.btn.more.y + 20) { HUB.answer('more'); KC.sfx('menuMove'); } }
    }
    this.rigs.forEach((r, i) => r.update(dt, { x: 0, y: 0, z: 0, facing: 0, vx: 0, vy: 0, pose: 'kneel' }));
    // the Options button opens the engine's menu (unless Create is held), without stopping the world
    n.update(dt, this);
    if (n.host && n.bout) { KC.fightCamera(this, dt, n.bout); this.stage.react && 0; n.sceneRef = this; this.bout = n.bout; this.hud = n.hud; }
    else if (n.view && n.view.f) { KC.fightCamera(this, dt, n.view); this.bout = null; this.hud = n.hud || this.hud; }
    if (n.ended) this.endT = (this.endT || 0) + dt;
  },
  draw(r) {
    const n = this.net, g = KC.game; this.stage.draw(r); if (!n) { r.overlay(gg => KC.text(gg, 'CONNECTING...', r.W / 2, r.H / 2, '#fff', { align: 'center', scale: 2 })); return; }
    const playing = n.state === 'play' || n.state === 'count';
    if (playing && (n.bout || (n.view && n.view.f))) {
      const b = n.host ? n.bout : n.view; if (!b || !b.f) return;
      for (const f of b.f) f.draw(r); if (b.refActor || !n.host) KC.drawReferee(r, b);
      r.overlay(gg => { const nm = n.view && !n.host ? n.view.names : n.pair && n.pair.map(id => n.nameOf(id)); (b.f || []).forEach((f, i) => { const [sx, sy] = r.w(f.x, 0, f.z + 78); const id = n.pair && n.pair[i], col = (n.players.find(p => p.id === id) || {}).color || '#fff'; KC.text(gg, safeName(nm ? nm[i] : '?'), Math.round(sx), Math.round(sy), col, { align: 'center' }); if (id === n.me) E.font.text(gg, '▾', Math.round(sx), Math.round(sy) + 8, col, { align: 'center', outline: false }); }); });
      if (this.hud) { if (n.host && n.hud) n.hud.draw(r); else this.hud && this.hud.draw(r); }
      r.overlay(gg => { const W = r.W, H = r.H; const K = n.host ? n.K : null, q = (n.host && K) ? K.q : (n.queueIds || []);
        KC.text(gg, 'KACHINUKI  FIRST TO ' + T().sessionTarget + ' BOUT WINS', W / 2, H - 28, '#ffe8a0', { align: 'center' }); const nextId = q[2]; if (nextId !== undefined) KC.text(gg, 'NEXT: ' + (nextId === n.me ? 'YOU' : n.nameOf(nextId)), W / 2, H - 16, nextId === n.me ? '#ffd060' : '#cfc8e8', { align: 'center' });
        if (n.state === 'count') { const hubT = n.now(), k = Math.ceil(-hubT / 1000); if (k > 0) E.font.title(gg, String(k), W / 2, H * .32, { scale: 6, align: 'center', colors: GOLD, depth: 3 }); }
        else if (n.cntShow && n.clock() - n.cntShow < 900) E.font.title(gg, 'BEGIN!', W / 2, H * .32, { scale: 4, align: 'center', colors: GOLD, depth: 3 }); });
      return;
    }
    // the card
    const c = n.card || { ready: [], left: null };
    r.overlay(gg => {
      const W = r.W, H = r.H; px.blend(gg, .45, 'normal', () => px.rect(gg, 0, 0, W, H, '#05040a')); KC.title(gg, 'KARATE CHAMPON', W / 2, 6, 2); KC.title(gg, 'KACHINUKI! WINNER STAYS ON.', W / 2, 26, 1);
      KC.text(gg, 'FIRST TO 2 POINTS WINS A BOUT. MOST BOUTS WINS.', W / 2, 40, '#ffe8a0', { align: 'center' });
      n.players.forEach((p, i) => { const x = Math.round(W / 2 + (i - (n.players.length - 1) / 2) * 88), y = 62; this.rigs[i].drawPortrait(gg, x - 20, y, 40, { zoom: 2.4 }); px.rect(gg, x - 22, y + 42, 44, 3, p.color); KC.text(gg, p.name + (p.id === n.me ? ' (YOU)' : ''), x, y + 48, p.color, { align: 'center' }); KC.text(gg, (c.ready || []).includes(p.id) ? 'READY' : '...', x, y + 58, (c.ready || []).includes(p.id) ? '#5ad8a0' : '#8a84a8', { align: 'center' }); });
      const ctl = KC.family() === 'key' ? 'MOVE: WASD    STRIKE: IJKL' : 'MOVE: LEFT STICK    STRIKE: RIGHT STICK OR FACE BUTTONS'; KC.text(gg, 'YOUR CONTROLS  ' + ctl, W / 2, H - 52, '#9ad8ff', { align: 'center' });
      const left = c.left === null || c.left === undefined ? '' : Math.ceil(c.left / 1000) + 'S'; if (left) KC.text(gg, 'STARTS IN ' + left, W / 2, H - 40, '#fff', { align: 'center' }); if (c.paused) KC.text(gg, 'WAITING: MORE TIME', W / 2, H - 40, '#ffd060', { align: 'center' });
      this.btn = { ready: { x: W / 2 - 100, y: H - 26, w: 90 }, more: { x: W / 2 + 10, y: H - 26, w: 90 } };
      KC.panel(gg, this.btn.ready.x, this.btn.ready.y, 90, 20, { alpha: .9 }); KC.panel(gg, this.btn.more.x, this.btn.more.y, 90, 20, { alpha: c.asked ? 1 : .6 });
      let ix = KC.glyphAction(gg, 'confirm', this.btn.ready.x + 4, this.btn.ready.y + 3, 13); KC.text(gg, 'READY', this.btn.ready.x + 8 + ix, this.btn.ready.y + 7, '#fff'); ix = KC.glyphAction(gg, 'alt', this.btn.more.x + 4, this.btn.more.y + 3, 13); KC.text(gg, 'MORE TIME', this.btn.more.x + 8 + ix, this.btn.more.y + 7, '#fff');
      if (n.state === 'count') { const k = Math.ceil(-n.now() / 1000); if (k > 0 && isFinite(k)) E.font.title(gg, String(k), W / 2, H * .5 - 20, { scale: 6, align: 'center', colors: GOLD, depth: 3 }); }
    });
    if (n.ended) this.drawEnd(r);
  },
  drawEnd(r) { const n = this.net; r.overlay(g => { px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05040a')); const hl = n.endInfo && n.endInfo.reason === 'host-left'; KC.title(g, hl ? 'HOST LEFT' : 'ROUND OVER', r.W / 2, 20, 3); const st = (n.endInfo && n.endInfo.standings) || n.standings || []; st.forEach((grp, i) => KC.text(g, (i + 1) + '. ' + (Array.isArray(grp) ? grp : [grp]).map(id => n.nameOf(id)).join(' = '), r.W / 2, 60 + i * 14, i === 0 ? '#ffd060' : '#cfc8e8', { align: 'center', scale: 1 })); }); }
};
// the ended session draws its own results over everything; drawEnd for the in-play layout
const _sd = KC.scenes.session.draw; KC.scenes.session.draw = function (r) { _sd.call(this, r); if (this.net && this.net.ended && (this.net.state === 'play' || this.net.state === 'count')) this.drawEnd(r); };
