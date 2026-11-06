// A Hub session: AI Hub Session Protocol v1, shared world. The host's copy runs the world; other copies keep a mirror of it and send their hands.
// No title, menus or attract here, and no chat, emotes or custom names. See PLAN section 12.3 and 12.4.
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), { px } = E, Pix = G.Pix, Glyph = G.Glyph, U = G.U, HUB = () => window.AIHub;
const PER_TYPE = { pool: ['vol'], bleeder: ['burnT'], arteryTear: ['sewn', 'burnT'], wound: ['sewn'], laceration: ['cov'], patch: ['cov'], nest: ['shellOff', 'marked', 'hidden', 'pr'], bead: ['stateN', 'tx', 'ty', 't', 'planned', 'bite'], staccato: [], retractorHandle: ['open', 'gripped'], windowed: ['hp'], dacapo: ['t', 'countdown'], lobe: ['open', 'dead', 'stage', 'burnT', 'coatT'], guide: ['prog'], shard: ['pr', 'free'] };
const EV_KEEP = new Set(['grade', 'slip', 'tear', 'dish', 'free', 'cutDone', 'slash', 'stitch', 'loose', 'healed', 'iv', 'lock', 'drained', 'found', 'codeBlue', 'shock', 'shockMiss', 'revive', 'phase', 'phaseDone', 'closing', 'stamp', 'lost', 'dip', 'crash', 'breath', 'breathEnd', 'nestSpit', 'beadBite', 'beadDie', 'strainDead', 'strainHit', 'nestOpen', 'lobeDead', 'lobeOpen', 'daCapoStart', 'daCapo', 'sedate', 'tk', 'music', 'shake', 'retract', 'sayp', 'say']);
const encode = o => { const f = PER_TYPE[o.type] || [], a = [o.id, Math.round(o.x), Math.round(o.y)]; for (const k of f) { const v = k === 'cov' ? (o.cells ? o.cells.got / o.cells.n : 0) : k === 'pr' ? (o.pull ? o.pull.prog : 0) : k === 'stateN' ? (o.state === 'air' ? 1 : 0) : o[k]; a.push(typeof v === 'boolean' ? (v ? 1 : 0) : typeof v === 'number' ? Math.round(v * 10) / 10 : 0); } return a; };
const decode = (o, a) => { o.x = a[1]; o.y = a[2]; (PER_TYPE[o.type] || []).forEach((k, i) => { const v = a[3 + i]; if (k === 'cov') { if (o.cells) o.cells.got = v * o.cells.n; o.covF = v; } else if (k === 'pr') { if (o.pull) o.pull.prog = v; } else if (k === 'stateN') o.state = v ? 'air' : 'ground'; else if (k === 'shellOff' || k === 'hidden' || k === 'open' || k === 'dead' || k === 'gripped' || k === 'planned' || k === 'bite' || k === 'free') o[k] = !!v; else o[k] = v; }); };

G.scenes = G.scenes || {};
G.scenes.hubround = {
  pausable: true, view: 'overhead', camera: { zoom: false, wheel: false }, live: true,
  enter() {
    const game = G.game; this.t = 0; this.phase = 'connect'; this.info = null; this.card = null; this.over = false; this.S = null; this.V = G.OpScene.makeView(game); this.locals = []; this.snapN = 0; this.seen = 0; this.inN = 0; this.acc = 0; this.evAcc = 0; this.evQ = []; this.addQ = []; this.rmQ = []; this.known = new Set(); this.rot = 0; this.remote = {}; this.ready = false; this.moreAsked = false; this.clockMs = 0; this.samples = []; this.smpAcc = 0; G.Screen.cursor(game, true); G.Music.play('title');
    this.connect();
  },
  async connect() {
    const game = G.game, H = HUB(); let info = null; try { info = await H.connect({ mode: 'shared-world', seats: [1, 4], card: true }); } catch (e) { game.fail('hub connect', e); }
    if (!info) { game.go('title'); return; }
    this.info = info;
    H.on('card', c => { this.card = c; });
    H.on('start', () => { if (this.phase === 'card') { this.phase = 'count'; } });
    H.on('message', (d, from) => this.onMessage(d, from));
    H.on('leave', ({ id }) => { const S = this.S; if (!S) return; const h = S.hands.find(q => q.id === id); if (h) { h.gone = true; h.held = 0; h.stroke = 0; h.stitch = null; } });
    H.on('time-up', () => { if (info.isHost && !this.over) this.finish(this.S && this.S.status === 'closed'); });
    H.on('end', () => { this.phase = 'over'; this.over = true; G.Music.stop(); G.Sfx.stopLoops(); game.audio.mute(true); });
    this.build(); this.phase = 'card'; H.ready();
  },
  build() {
    const H = HUB(), info = this.info, rng = H.rng('sim'), seed = (rng() * 1e9) | 0, players = info.players.map(q => ({ id: q.id, name: q.name, color: q.color, seat: q.id }));
    this.S = G.Op.create('grandrounds', { seed, players, difficulty: 'resident', mode: 'rounds' }); this.S.hubHost = !!info.isHost; this.mine = players.findIndex(q => q.id === info.me);
    if (!info.isHost) { this.S.objs = []; this.S.ev = []; }   // a mirror: everything on the table comes from the host
    else for (const o of this.S.objs) this.queueAdd(o);
    if (this.mine >= 0) this.locals = [{ i: this.mine, input: G.game.input, c: G.Cursor.make(213, 116), mouseMode: false, mouseT: G.game.input.mouse.t, trigWas: false, toggle: false, ax: 213, ay: 116 }];
    this.V.OX = (G.game.W - 426) >> 1; this.V.OY = (G.game.H - 240) >> 1; if (!info.isHost) this.V.mirror = players.map(() => ({ x: 213, y: 116, tx: 213, ty: 116 }));
  },
  queueAdd(o) { if (this.known.has(o.id)) return; this.known.add(o.id); this.addQ.push(JSON.parse(JSON.stringify(o))); },
  onMessage(d, from) {
    const S = this.S, info = this.info; if (!S) return;
    if (info.isHost) {
      const i = S.hands.findIndex(q => q.id === from); if (i < 0) return; const R = this.remote[i] || (this.remote[i] = { n: 0, cur: { x: 213, y: 116, tool: 'forceps', trig: 0, fine: false, gift: false, consult: false, cancel: false, shock: false }, q: [], acc: 0 });
      if (d.t === 'i' && d.n > R.n) { R.n = d.n; R.cur.tool = G.TOOLS[d.tool] || R.cur.tool; R.cur.fine = !!(d.f & 2); R.cur.shock = !!(d.f & 4); R.cur.cancel = !!(d.f & 8); for (const q of d.s) R.q.push(q); if (R.q.length > 18) R.q.splice(0, R.q.length - 18); }
      else if (d.t === 'p') R.giftPulse = 2;
    } else if (from === info.host) {
      if (d.t === 's' && d.n > this.seen) { this.seen = d.n; S.clock = d.c / 1000; S.vitals = d.v; S.steady = d.st; S.phSeen = d.p; S.ph = d.p; S.flow = d.fl; S.status = ['play', 'code', 'closing', 'closed', 'lost', 'rewind'][d.ss] || 'play'; S.breath = !!d.br; S.beatP = d.bp; S.flags.windowOpen = !!d.wo; S.flags.quillHolds = !!d.qh; if (d.code) { S.code.t = d.code[0]; S.code.k = d.code[1]; S.code.hits = d.code[2]; } if (d.cl) { S.close = S.close || { x: 213, y: 116, done: false, t: 0, r: 46, hit: '', bonus: 0 }; S.close.r = d.cl[0]; S.close.done = !!d.cl[1]; S.close.t = d.cl[2]; }
        for (const a of d.h) { const i = S.hands.findIndex(q => q.id === a[0]); if (i < 0) continue; const h = S.hands[i], m = this.V.mirror[i]; if (i !== this.mine) { m.tx = a[1]; m.ty = a[2]; h.x = a[1]; h.y = a[2]; h.tool = G.TOOLS[a[3]] || h.tool; h.trig = a[4] ? 1 : 0; } h.score = a[5]; h.held = a[6]; h.lens = a[7]; h.heat = a[8] || 0; h.fill = a[9] || 0; }
        for (const a of d.o) { const o = S.objs.find(q => q.id === a[0]); if (o) decode(o, a); } }
      else if (d.t === 'e') { for (const o of d.a || []) { if (!S.objs.some(q => q.id === o.id)) S.objs.push(o); } if (d.r && d.r.length) S.objs = S.objs.filter(o => !d.r.includes(o.id)); if (d.ev && d.ev.length) { for (const e of d.ev) if (e[0] === 'phase') S.ph = e[1]; S.ev = d.ev; G.OpScene.drainEvents(G.game, S, this.V, { mute: false }); S.ev = []; } }
      else if (d.t === 'over') { this.over = true; S.status = d.won ? 'closed' : 'lost'; }
    }
  },
  /** this player's hands, now, on every copy that has a player */
  localStep(dt) {
    const game = G.game, I = game.input, S = this.S, V = this.V, L = this.locals[0]; if (!L || !S.hands[L.i] || S.hands[L.i].gone) return null;
    const h = S.hands[L.i], dev = G.OpScene.readDevice(game, I, L, S, h, V.OX, V.OY, true); G.Wheel.update(L.c, dev, dt); G.Cursor.update(L.c, dev, S, h, dt); L.ax = L.c.x; L.ay = L.c.y; V.localTool = L.c.tool; V.loupeOn = dev.fine;
    h.tool = L.c.tool; h.trig = dev.trig; if (!this.info.isHost) { h.x = L.c.x; h.y = L.c.y; }
    return { x: L.c.x, y: L.c.y, tool: L.c.tool, trig: dev.trig, fine: dev.fine, gift: dev.gift, consult: false, cancel: dev.cancel, shock: dev.shock };
  },
  update(dt) {
    const game = G.game, I = game.input, H = HUB(); this.t += dt; game.focus(game.W / 2, game.H / 2, 0);
    if (this.phase === 'connect' || !this.S) return;
    const info = this.info, S = this.S, V = this.V;
    if (this.phase === 'card') {
      if (I.pressed('confirm') || I.pressed('start')) { H.answer('ready'); this.ready = true; G.Sfx.menuOk(); }
      else if (I.pressed('more')) { H.answer('more'); this.moreAsked = !this.moreAsked; G.Sfx.tick(); }
      const c = I.clicked(); if (c) { if (c[1] > game.H * .72 && c[0] > game.W / 2) { H.answer('more'); this.moreAsked = !this.moreAsked; } else { H.answer('ready'); this.ready = true; } }
      return;
    }
    if (this.phase === 'count') { if (H.time() >= 0) { this.phase = 'play'; G.Screen.cursor(game, false); G.Music.play('emergency'); } return; }
    if (this.phase === 'over') return;
    if (this.over) { G.OpScene.updateView(game, S, V, dt, I); return; }
    const mine = this.localStep(dt);
    if (info.isHost) this.hostStep(dt, mine); else this.clientStep(dt, mine);
    G.OpScene.updateView(game, S, V, dt, I); if (this.locals[0]) G.OpScene.hints(S, V, this.locals[0], dt);
  },
  hostStep(dt, mine) {
    const S = this.S, H = HUB(), V = this.V, inputs = [];
    S.hands.forEach((h, i) => {
      if (h.gone) { inputs[i] = null; return; }
      if (i === this.mine) { inputs[i] = mine; return; }
      const R = this.remote[i]; if (!R) { inputs[i] = null; return; } R.acc += dt; while (R.acc >= 1 / 90) { R.acc -= 1 / 90; const q = R.q.shift(); if (!q) { R.acc = 0; break; } R.cur.x = q[0]; R.cur.y = q[1]; R.cur.trig = q[2]; } const g = R.giftPulse > 0; if (g) R.giftPulse--; inputs[i] = Object.assign({}, R.cur, { gift: g });
    });
    const before = new Set(S.objs.map(o => o.id));
    G.Op.step(S, inputs, dt);
    if (!H.server) G.OpScene.drainEvents(G.game, S, V, {});
    for (const e of S.ev) if (EV_KEEP.has(e[0])) this.evQ.push(e);
    for (const o of S.objs) if (!this.known.has(o.id)) this.queueAdd(o);
    const nowIds = new Set(S.objs.map(o => o.id)); for (const id of before) if (!nowIds.has(id)) this.rmQ.push(id);
    this.acc += dt; if (this.acc >= 1 / 12) { this.acc = 0; this.sendSnap(); }
    this.evAcc += dt; if (this.evAcc >= 1 / 4) { this.evAcc = 0; this.sendEvents(); }
    if (S.status === 'closed') this.finish(true); else if (S.status === 'lost') this.finish(false);
  },
  sendSnap() {
    const S = this.S, H = HUB(), hs = S.hands.filter(h => !h.gone).map(h => [h.id, Math.round(h.x), Math.round(h.y), G.TOOLS.indexOf(h.tool), h.down ? 1 : 0, Math.round(h.score), h.held || 0, Math.round(h.lens || 0), Math.round((h.heat || 0) * 10) / 10, Math.round((h.fill || 0) * 10) / 10]);
    const objs = S.objs.filter(o => !o.done), msg = { t: 's', n: ++this.snapN, c: Math.round(S.clock * 1000), v: Math.round(S.vitals * 10) / 10, p: S.ph, st: Math.round(S.steady), fl: S.flow, ss: ['play', 'code', 'closing', 'closed', 'lost', 'rewind'].indexOf(S.status), br: S.breath ? 1 : 0, bp: Math.round(S.beatP * 100) / 100, wo: S.flags.windowOpen ? 1 : 0, qh: S.flags.quillHolds ? 1 : 0, h: hs, o: [] };
    if (S.status === 'code') msg.code = [Math.round(S.code.t * 100) / 100, S.code.k, S.code.hits]; if (S.close) msg.cl = [Math.round(S.close.r), S.close.done ? 1 : 0, Math.round(S.close.t * 10) / 10];
    let bytes = JSON.stringify(msg).length; const n = objs.length; for (let k = 0; k < n; k++) { const o = objs[(this.rot + k) % n], a = encode(o), len = JSON.stringify(a).length + 1; if (bytes + len > 1100) break; msg.o.push(a); bytes += len; } this.rot = n ? (this.rot + msg.o.length) % n : 0;
    H.send(msg, { reliable: false });
  },
  sendEvents() { const H = HUB(); if (!this.evQ.length && !this.addQ.length && !this.rmQ.length) return; const add = this.addQ.splice(0, 40), rm = this.rmQ.splice(0, 80); let ev = this.evQ.splice(0); if (ev.length > 60) ev = ev.slice(-60); H.send({ t: 'e', ev, a: add, r: rm }); },
  clientStep(dt, mine) {
    const S = this.S, H = HUB(), V = this.V; S.t += dt; S.rt += dt; if (S.status === 'play') S.clock = Math.max(0, S.clock - dt);
    const bpm = 66 + (99 - S.vitals) * .55; S.beatP = (S.beatP || 0) + dt * bpm / 60; if (S.beatP >= 1) { S.beatP -= 1; S.beatT = S.t; G.OpScene.onBeat(G.game, S, V); } S.beatV = U.beatShape(S.beatP);
    for (let i = 0; i < V.mirror.length; i++) { const m = V.mirror[i]; if (i === this.mine) continue; const k = Math.min(1, dt * 12); m.x += (m.tx - m.x) * k; m.y += (m.ty - m.y) * k; }
    if (mine) {
      this.samples.push([Math.round(mine.x * 10) / 10, Math.round(mine.y * 10) / 10, mine.trig >= .3 ? 1 : 0]); if (this.samples.length > 60) this.samples.shift();
      this.acc += dt; if (this.acc >= 1 / 15) { this.acc = 0; const every = Math.max(1, Math.floor(this.samples.length / 6)), s = []; for (let k = 0; k < this.samples.length; k += every) s.push(this.samples[k]); s.push(this.samples[this.samples.length - 1]); this.samples.length = 0; H.send({ t: 'i', n: ++this.inN, tool: G.TOOLS.indexOf(mine.tool), f: (mine.fine ? 2 : 0) | (mine.shock ? 4 : 0) | (mine.cancel ? 8 : 0), s: s.slice(-7) }, { to: this.info.host, reliable: false }); }
      if (mine.gift && !this.giftDown) H.send({ t: 'p' }, { to: this.info.host }); this.giftDown = mine.gift;
    }
  },
  finish(won) {
    if (this.over) return; this.over = true; const S = this.S, H = HUB(); this.sendEvents();
    const st = G.grandStandings(S).map(tier => tier.map(h => h.id)), scores = {}, stats = {}; for (const h of S.hands) { scores[h.id] = Math.round(h.score); stats[h.id] = { Actions: h.acts, Textbook: h.tb, Stitches: h.stitches, Burns: h.burns }; }
    H.send({ t: 'over', won: !!won, v: S.vitals }); H.finish({ standings: st, scores, won: !!won, stats, awards: G.grandAwards(S) });
  },
  draw(r) {
    const info = this.info; if (info && info.server) return; const W = r.W, H = r.H, game = G.game;
    if (this.phase === 'connect' || !this.S) { r.sky(['#04121a', '#04121a']); return; }
    if (this.phase === 'card') { this.drawCard(r); return; }
    G.OpScene.paint(r, this.S, this.V, game, this.locals);
    if (this.phase === 'count') r.overlay(g => { const t = HUB().time(), n = Math.max(1, Math.ceil(-t / 1000)); px.blend(g, .4, 'normal', () => px.rect(g, 0, 0, W, H, '#04121a')); E.font.text(g, String(n), W / 2, H / 2 - 24, '#ffffff', { scale: 5, align: 'center', outline: false, shadow: '#000' }); E.font.text(g, 'Scrub in', W / 2, H / 2 + 22, '#5ff0e0', { scale: 2, align: 'center', outline: false }); });
  },
  drawCard(r) {
    const W = r.W, H = r.H, game = G.game, I = game.input, c = this.card || {}, info = this.info; G.Stage.draw(r, 'gallery', this.t);
    r.overlay(g => {
      // the theatre's whiteboard
      const bw = Math.min(W - 24, 390), bh = Math.min(H - 20, 214), x = Math.round(W / 2 - bw / 2), y = Math.round(H / 2 - bh / 2); px.rect(g, x - 3, y - 3, bw + 6, bh + 6, '#5a646a'); px.rect(g, x, y, bw, bh, '#eef2ee');
      const ink = '#16242a', f = { outline: false }; E.font.text(g, G.TITLE_MAIN, W / 2, y + 6, '#117a74', { scale: 2, align: 'center', outline: false }); E.font.text(g, 'GRAND ROUNDS', W / 2, y + 24, '#8a2c26', { align: 'center', outline: false });
      let yy = y + 38; (info ? info.players : []).forEach((p, i) => { const ready = (c.ready || []).includes(p.id), px0 = x + 14 + (i % 2) * (bw / 2 - 6), py0 = yy + (i >> 1) * 13; px.rect(g, px0, py0 + 1, 7, 7, p.color); E.font.text(g, String(p.name).slice(0, 14), px0 + 11, py0, ink, f); if (ready) E.font.text(g, '✓', px0 + 110, py0, '#117a74', f); });
      yy += 30; E.font.text(g, 'How to win', x + 14, yy, '#8a2c26', f); yy += 10; E.font.wrap(G.HUB_TAGS.goal, bw - 28).forEach(l => { E.font.text(g, l, x + 14, yy, ink, f); yy += 9; }); yy += 4;
      E.font.text(g, 'Your hands', x + 14, yy, '#8a2c26', f); yy += 11;
      const row = (act, text) => { const lw = Glyph.action(g, I, act, x + 14, yy); E.font.text(g, text, x + 19 + lw, yy + 1, ink, f); yy += 12; };
      if (I.lastDevice === 'gamepad') { Glyph.cap(g, 'R', x + 14, yy); E.font.text(g, 'Aim', x + 32, yy + 1, ink, f); Glyph.cap(g, 'L', x + 100, yy); E.font.text(g, 'Pick a tool', x + 118, yy + 1, ink, f); yy += 12; } else { E.font.text(g, 'Mouse aims. 1 to 8 pick a tool.', x + 14, yy + 1, ink, f); yy += 12; }
      row('useTool', 'Use the tool'); row('gift', 'Long Breath, for everyone');
      const by = y + bh - 22, rdy = (c.ready || []).includes(info && info.me); const cw = Glyph.action(g, I, 'confirm', x + 14, by); E.font.text(g, rdy ? 'Ready!' : 'Ready', x + 18 + cw, by + 1, rdy ? '#117a74' : ink, f); const mw = Glyph.width(I, 'more'); Glyph.action(g, I, 'more', x + bw - 90 - mw, by); E.font.text(g, c.asked ? 'Asked for time' : 'More time', x + bw - 86, by + 1, ink, f);
      const sec = c.left == null ? (c.paused ? 'paused' : 'starting') : Math.ceil(c.left / 1000) + ' s'; E.font.text(g, sec, W / 2, by + 1, '#8a2c26', { align: 'center', outline: false, scale: 1 });
    });
  },
};
})();
