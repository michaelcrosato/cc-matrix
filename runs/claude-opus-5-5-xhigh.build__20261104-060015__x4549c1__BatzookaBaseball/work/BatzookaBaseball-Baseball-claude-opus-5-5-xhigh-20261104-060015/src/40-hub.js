/* =============================================================================
 * 40-hub: AI Hub sessions (Session Protocol v1, client 1.4.0): an online Derby
 * round in GHOST mode for 1-4 players. Everyone bats against the same pitch
 * sequence (AIHub.rng('pitches')) and sees the others as ghosts: holograms in the
 * on-deck circles that swing when they swing, and comets in their seat colors
 * where their home runs fly. Ghosts never change your round.
 * In a session: no title, menus or prompts before the round; our own card; ready()
 * with no key press; the round on the hub's clock; progress every second; one
 * result; time-up reports at once; at the end no input, no sound, ROUND OVER.
 * ========================================================================== */
BZ.SEAT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
BZ.hubActive = false;
BZ.hub = {
  H: null, info: null, phase: 'none', card: null, answered: null, reported: false, ended: false, sentT: 0, progT: 0, msgs: 0, mock: false,
  /** at boot: is this page in a session? */
  detect() { const H = typeof AIHub !== 'undefined' ? AIHub : (typeof window !== 'undefined' ? window.AIHub : null); BZ.hubActive = !!(H && H.active); this.H = H; return BZ.hubActive; },
  /** connect, build the round, ready() once, then show the card */
  async begin() {
    const H = this.H, g = BZ.game;
    this.phase = 'loading';
    let info = null;
    try { info = await H.connect({ mode: 'ghost', seats: [1, 4], card: true }); } catch (e) { info = null; }
    if (!info) { BZ.hubActive = false; g.o.menu.quit = 'title'; g.go('title'); return; }
    this.info = info;
    H.on('card', c => { this.card = c; });
    H.on('start', () => { this.phase = 'countdown'; BZ.sfx('ding', { vary: 0 }); });
    H.on('message', (d, from) => this.message(d, from));
    H.on('leave', d => { if (this.D && this.D.ghosts[d.id]) delete this.D.ghosts[d.id]; });
    H.on('time-up', () => this.report());
    H.on('end', d => this.end(d));
    // the round: the MegaDome at night, the pitches from the shared stream
    const deal = H.rng('pitches'), park = H.rng('park');
    void park;
    const me = info.me, players = info.players || [], mine = players.find(p => p.id === me) || { id: me, name: 'YOU', color: BZ.SEAT_COLORS[0] };
    this.me = mine;
    this.D = new BZ.Derby({ park: 'megadome', hub: true, deal, title: 'ONLINE DERBY', players: [{ name: String(mine.name || 'YOU').slice(0, 12).toUpperCase(), input: g.input, color: mine.color || BZ.SEAT_COLORS[0], batter: BZ.get('teams', 'comets').lineup[[0, 3, 7, 4][(me | 0) % 4]] }], seed: info.seed || 1, clock: () => this.clockLeft() / 1000, send: m => this.send(m, true) });
    for (const p of players) if (p.id !== me) this.D.ghosts[p.id] = { name: String(p.name || 'P' + (p.id + 1)).slice(0, 10).toUpperCase(), color: p.color || BZ.SEAT_COLORS[p.id % 4], swingT: 0, comets: [], score: 0, outs: 0 };
    BZ.M = this.D.M;
    H.ready();
    this.phase = 'card';
    g.go('hubDerby', null, { fade: 0 });
  },
  limit() { const L = this.info && this.info.limitMs; return L ? Math.min(120000, L - 5000) : 120000; },
  clockLeft() { const t = this.H.time(); return Math.max(0, this.limit() - (isFinite(t) ? Math.max(0, t) : 0)); },
  send(data, reliable) { if (this.ended || !this.H || !this.H.send) return; try { this.H.send(data, { reliable }); this.msgs++; } catch (e) { /* dropped */ } },
  message(d, from) {
    if (!this.D || this.ended || !d || typeof d !== 'object') return;
    const gh = this.D.ghosts[from]; if (!gh) return;   // unknown ids are ignored
    if (d.t === 'g') { gh.score = d.sc | 0; gh.outs = d.o | 0; if (d.s) gh.swingT = .3; }
    else if (d.t === 'hit') this.D.ghostHit(from, d);
    else if (d.t === 'done') { gh.score = d.score | 0; gh.done = true; }
  },
  stats() { const P = this.D.P; return { score: P.score, hrs: P.hrs, outs: P.outs, longest: P.longest }; },
  progress() { const s = this.stats(); try { this.H.progress({ score: s.score, label: BZ.fmt(s.score) + ' ft · ' + s.hrs + ' HR · ' + s.outs + ' outs' }); } catch (e) { /* hub gone */ } },
  report() {
    if (this.reported || !this.D) return;
    this.reported = true;
    const s = this.stats();
    try { this.H.result({ score: s.score, stats: { 'Home runs': s.hrs, Longest: s.longest + ' ft', Outs: s.outs }, awards: s.longest ? [{ title: 'Moonshot', detail: s.longest + ' ft' }] : [] }); } catch (e) { /* hub gone */ }
    this.send({ t: 'done', score: s.score }, true);
  },
  end(d) {
    this.ended = true; this.phase = 'over'; this.endInfo = d || {};
    try { BZ.game.audio.music(null); BZ.game.audio.mute(true); } catch (e) { /* no sound */ }
  },
  /** the dev warp and the tests: a mock hub that answers like the real one, offline */
  mockCard() {
    const t0 = { v: 0 }, handlers = {};
    const mock = { active: true, mock: true, seeded: true, connect: async () => ({ me: 0, players: [{ id: 0, name: 'YOU', color: BZ.SEAT_COLORS[0] }, { id: 1, name: 'GHOST', color: BZ.SEAT_COLORS[1] }], host: 0, isHost: true, mode: 'ghost', round: 1, limitMs: 60000, seed: 7 }), ready() { mock.isReady = true; }, answer(a) { mock.answer = a; }, on(e, f) { handlers[e] = f; }, emit(e, ...a) { if (handlers[e]) handlers[e](...a); }, time: () => t0.v, rng: label => E.rng(BZ.hash(label)), progress(p) { mock.lastProgress = p; mock.progressN = (mock.progressN || 0) + 1; }, result(r) { mock.results = (mock.results || 0) + 1; mock.lastResult = r; }, send(d) { mock.sent = (mock.sent || 0) + 1; } };
    t0.v = -Infinity; mock.clock = t0;
    this.H = mock; this.mock = true; BZ.hubActive = true; BZ.game.o.menu.quit = false;
    this.reported = false; this.ended = false;
    return this.begin().then(() => mock);
  }
};
/** the hub scene: the card, the countdown, the round, the end */
BZ.scenes.hubDerby = {
  pausable: true, view: 'broadcast', camera: { zoom: false, wheel: false },
  enter() { this.t = 0; BZ.hud.clear(); BZ.talk.reset(); BZ.music('hubcard'); BZ.wheelOwned = true; const pd = BZ.get('parks', 'megadome'); BZ.game.lights.enabled = true; BZ.game.lights.ambient = pd.ambient; BZ.game.weather = null; Object.assign(BZ.cams, { mode: 'plate', replay: null, moon: null }); },
  back() { return true; },   // the back gesture is the hub's
  update(dt) {
    const g = BZ.game, h = BZ.hub, I = g.input, D = h.D; this.t += dt;
    if (!D) return;
    if (h.ended) return;   // no input, nothing sent
    if (I.pressed('options') && !I.down('create')) g.pause();
    if (h.phase === 'card') {
      // the card: Ready (✕, Enter, click READY) and More time (△, M, click MORE TIME)
      const c = I.clicked && I.clicked();
      const hit = (b) => c && b && c[0] >= b[0] && c[0] < b[0] + b[2] && c[1] >= b[1] && c[1] < b[1] + b[3];
      if (I.pressed('confirm') || I.pressed('south') || hit(this.readyBtn)) { h.H.answer('ready'); h.answered = 'ready'; BZ.sfx('confirm', { vary: 0 }); }
      if (I.pressed('north') || I.pressed('more') || hit(this.moreBtn)) { h.H.answer('more'); h.answered = h.answered === 'more' ? null : 'more'; BZ.sfx('select', { vary: 0 }); }
      return;
    }
    const tm = h.H.time();
    if (h.phase === 'countdown') { if (tm >= 0) { h.phase = 'play'; BZ.music('derby'); D.state = 'pitch'; D.newPitch(); } return; }
    if (h.phase === 'play') {
      D.update(dt, I);
      BZ.hud.step(dt); BZ.crowd.step(D.M, dt); BZ.tickLater(dt);
      // the ghost of this player, 10 times a second
      h.sentT += dt; if (h.sentT >= .1) { h.sentT = 0; const S = D.M.ab; h.send({ t: 'g', area: 'derby', s: S && S.swing ? 1 : 0, rx: +D.M.reticle.x.toFixed(1), rz: +D.M.reticle.z.toFixed(1), sc: D.P.score, o: D.P.outs }, false); }
      h.progT += dt; if (h.progT >= 1) { h.progT = 0; h.progress(); }
      if (D.state === 'over' || h.clockLeft() <= 0 || D.P.outs >= 10) { if (D.state !== 'over') D.state = 'over'; h.progress(); h.report(); h.phase = 'done'; }
    }
  },
  draw(r) {
    const h = BZ.hub, D = h.D; if (!D) { BZ.menuBg(r, this.t); return; }
    if (h.phase === 'card' || h.phase === 'loading') { this.drawCard(r); return; }
    D.draw(r);
    BZ.hud.draw(r, D.M, null);
    r.overlay(g => {
      if (h.phase === 'countdown') { const left = Math.ceil(-h.H.time() / 1000); E.font.title(g, left > 0 ? String(left) : 'GO!', r.W / 2, r.H * .35, { scale: 6, align: 'center', colors: ['#ffffff', '#ffd040', '#ff5a1a'], depth: 3 }); }
      // the standings, the ghosts' scores beside ours
      const list = [{ name: D.P.name, score: D.P.score, color: D.P.color }].concat(Object.values(D.ghosts).map(gh => ({ name: gh.name, score: gh.score, color: gh.color }))).sort((a, b) => b.score - a.score);
      list.forEach((p, i) => E.font.text(g, (i + 1) + '. ' + p.name + ' ' + BZ.fmt(p.score), r.W - 12, 62 + i * 11, p.color, { align: 'right', shadow: '#000' }));
      if (h.phase === 'done' || h.phase === 'over') {
        E.ui.box(g, r.W / 2 - 110, r.H * .26, 220, 40 + list.length * 13, { bg: ['#1a1030', '#0a0614'], border: '#ffd040' });
        E.font.title(g, 'ROUND OVER', r.W / 2, r.H * .26 + 6, { scale: 2, align: 'center', colors: ['#fff6c0', '#ffb030'] });
        list.forEach((p, i) => E.font.text(g, (i + 1) + '. ' + p.name + '   ' + BZ.fmt(p.score) + ' FT', r.W / 2, r.H * .26 + 28 + i * 13, p.color, { align: 'center', shadow: '#000' }));
      }
    });
  },
  /** our own card: the game's look, the players lined up as batters in their seat colors */
  drawCard(r) {
    const h = BZ.hub, c = h.card || {}, g0 = BZ.game, I = g0.input, info = h.info || { players: [] };
    r.sky(['#05040e', '#1a1040', '#3a1a48']);
    r.overlay(g => {
      BZ.title(g, r, 8, r.W > 380 ? 3 : 2);
      E.font.text(g, 'BATZOOKA DERBY  ·  ONLINE', r.W / 2, 64, '#ffd040', { align: 'center', scale: 1, shadow: '#000' });
      const ps = info.players || [], n = Math.max(1, ps.length), cw = Math.min(70, (r.W - 30) / n);
      ps.forEach((p, i) => {
        const x = Math.round(r.W / 2 - cw * n / 2 + i * cw), y = 78, col = p.color || BZ.SEAT_COLORS[i % 4], ready = (c.ready || []).includes(p.id);
        E.ui.box(g, x + 2, y, cw - 4, 62, { bg: [col, E.shade(col, -.5)], border: ready ? '#ffffff' : '#3a3a5a' });
        const rig = BZ.rigFor(BZ.get('teams', 'comets').lineup[[0, 3, 7, 4][i % 4]], 'bat'); if (rig && BZ.cosmetic) rig.drawPortrait(g, x + cw / 2 - 16, y + 4, 32, { zoom: 2.2, frame: false });
        E.font.text(g, String(p.name || 'P' + (i + 1)).slice(0, 9).toUpperCase(), x + cw / 2, y + 40, '#ffffff', { align: 'center', shadow: '#000' });
        E.font.text(g, ready ? '✓ READY' : '...', x + cw / 2, y + 51, ready ? '#ffffff' : '#c8c8d8', { align: 'center' });
      });
      E.font.text(g, 'How to win: hit the most home-run feet in 2:00', r.W / 2, 148, '#ffffff', { align: 'center', shadow: '#000' });
      BZ.drawPrompts(g, I, [['move', 'AIM'], ['south', 'SWING'], ['west', 'POWER'], ['r1', 'BATZOOKA (3 HR IN A ROW)']], r.W / 2, 162, { align: 'center', size: 10 });
      const status = c.starting ? 'Starting...' : c.paused ? 'Waiting for more time...' : c.left != null ? 'Starts in ' + Math.ceil(c.left / 1000) + 's' : 'Get ready';
      E.font.text(g, status, r.W / 2, 182, '#ffd040', { align: 'center', scale: 1, shadow: '#000' });
      if (c.asked || h.answered === 'more') E.font.text(g, 'You asked for more time', r.W / 2, 194, '#a8b8e8', { align: 'center' });
      const bw = 96, by = r.H - 40;
      this.readyBtn = [r.W / 2 - bw - 6, by, bw, 22]; this.moreBtn = [r.W / 2 + 6, by, bw, 22];
      E.ui.box(g, ...this.readyBtn, { bg: h.answered === 'ready' ? ['#5aff8a', '#1a8a3a'] : ['#ffb030', '#c8501a'], border: '#fff6c0' });
      const g1 = BZ.glyph(g, I, 'south', this.readyBtn[0] + 5, by + 5, 11); E.font.text(g, 'READY', this.readyBtn[0] + 9 + g1, by + 7, '#1a0a00');
      E.ui.box(g, ...this.moreBtn, { bg: ['#2a3460', '#141a34'], border: '#5a6aa0' });
      const g2 = BZ.glyph(g, I, 'north', this.moreBtn[0] + 5, by + 5, 11); E.font.text(g, 'MORE TIME', this.moreBtn[0] + 9 + g2, by + 7, '#ffffff');
    });
  }
};
