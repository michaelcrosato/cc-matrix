/* 24-match: the match scene: cameras, drawing the court, crowd, HUD, commentary, replay and results. */
E.VIEWS.court = new E.View('court', 'Broadcast', 0, 38, 1.6, 1);
E.VIEWS.servecam = new E.View('servecam', 'Serve Cam', -90, 46, 1.5, 1);
const C2 = G.COURT;

G.teamName = (m, t) => m.players[t * 2].name + ' & ' + m.players[t * 2 + 1].name;
const TEAM_COL = [['#ff8a3a', '#ffd24a'], ['#3ab0ff', '#9be0ff']];

/* ---- controllers for local humans ---- */
G.localCtl = input => ({
  type: 'local', input,
  read(p) {
    if (G.autopilot) { p.m.think(p); return; }
    const I = this.input, v = G.game.view, mv = G.overlay.has('dev') ? [0, 0] : I.move(), len = Math.min(1, Math.hypot(mv[0], mv[1]));
    const d = len > .05 ? v.screenDirToGround(mv[0], mv[1]) : [0, 0];
    p.in.mx = d[0] * len; p.in.my = d[1] * len;
    const lock = G.overlay.has('dev'); p.in.play = !lock && I.down('play'); p.in.dive = !lock && I.down('dive'); p.in.call = !lock && I.down('call');
    let ax = d[0] * len, ay = d[1] * len;
    if (I.lastDevice === 'mouse' && I.pointer() && p.scr) {            // mouse aims: from the player toward the pointer
      const q = I.pointer(), g = v.screenDirToGround(q[0] - p.scr[0], q[1] - p.scr[1]); ax = g[0]; ay = g[1];
    }
    p.in.ax = ax; p.in.ay = ay;
    if (I.pressed('cam') && G.matchScene) G.matchScene.toggleCam();
  }
});

/* ---- the scene ---- */
G.MatchScene = {
  pausable: true, view: 'court', input: G.INPUT_MATCH, res: 'ps1', expand: true, name: 'match',
  enter(data) {
    const game = G.game; data = data || {}; this.data = data; G.matchScene = this;
    G.music(data.music || 'match', { restart: true });
    const ctl = data.ctl || [G.localCtl(game.input), { type: 'ai' }, { type: 'ai' }, { type: 'ai' }];
    this.m = new G.Match(Object.assign({ ctl, teams: [['mika', 'you'], ['ruby', 'tomo']] }, data.cfg));
    this.m.cfg.attract = !!data.attract;
    this.rigs = this.m.players.map(p => G.rigOf(p.charId, 1.0));
    this.cam = 'court'; this.camT = 0; this.over = null; this.menu = null; this.t = 0; this.replayI = -1; this.replayT = 0; this.shown = { phase: '', cmt: null }; this.cmt = ''; this.cmtT = 0; this.cutT = 0;
    this.crowd = []; const rn = E.rng(77); for (let i = 0; i < 90; i++) this.crowd.push({ x: -120 + rn() * 240, y: -50 - rn() * 26, c: ['#ff7a5a', '#ffd24a', '#5ac8ff', '#a0e060', '#ff7ad0', '#ffffff'][Math.floor(rn() * 6)], h: ['#3a2a1e', '#e8c068', '#101010', '#a03018'][Math.floor(rn() * 4)], ph: rn() * 6, sh: rn() });
    this.floats = []; this.sand = []; this.hud = { score: [0, 0] };
    game.setView('court'); game.lights.enabled = false; game.cam.smooth = .25; game.cam.bounds = null; game.follow(null);
    this.unbind = [G.bus.on('point', e => this.onPoint(e)), G.bus.on('touch', e => this.onTouch(e)), G.bus.on('block', () => this.say('block')), G.bus.on('dive', () => this.say('dive'))];
    if (data.net) data.net.start(this);
    if (data.tutorial) this.tut = { step: 0, t: 0 };
    game.weather = data.weather || null;
    this.focusT = 0;
    G.hubReady && G.hubReady();
  },
  exit() { if (this.unbind) this.unbind.forEach(f => f()); this.unbind = null; G.matchScene = null; G.game.weather = null; if (this.data.net) this.data.net.stop(); },
  toggleCam() { this.cam = this.cam === 'court' ? 'servecam' : 'court'; G.game.setView(this.cam); G.game.note(G.game.view.label.toUpperCase()); },
  say(kind) { const lines = G.TEXT.commentary[kind]; if (lines && this.cmtT <= 0) { this.cmt = G.rpick(lines, 'cosmetic'); this.cmtT = 3; } },
  onPoint(e) {
    if (!this.m) return;
    const m = this.m, kind = e.ace ? 'ace' : e.why === 'out' ? 'fault' : (m.rally.spikes ? 'spike' : 'point');
    this.cmt = G.rpick(G.TEXT.commentary[kind] || G.TEXT.commentary.point, 'cosmetic'); this.cmtT = 3.4;
    G.babble('sonny', this.cmt);
    this.replayI = -1; this.replayT = 0;
    for (const c of this.crowd) c.cheer = e.winner === 0 ? 1 : .3;
    G.game.flash && G.game.flash('#ffffff', .15);
  },
  onTouch(e) {
    const p = e.p; this.floats.push({ x: p.x, y: p.y, z: 34, text: e.grade === 'PERFECT' ? 'PERFECT!' : e.grade, t: .9, col: e.grade === 'PERFECT' ? '#fff06a' : e.grade === 'GOOD' ? '#9bffb0' : '#ffb0a0' });
    for (let i = 0; i < (e.kind === 'spike' ? 10 : 5); i++) this.sand.push({ x: this.m.ball.x, y: this.m.ball.y, z: 3, vx: (G.rand() - .5) * 60, vy: (G.rand() - .5) * 40, vz: 30 + G.rand() * 50, t: .6 });
  },
  update(dt) {
    const m = this.m, game = G.game, I = game.input; this.t += dt;
    if (this.cmtT > 0) this.cmtT -= dt;
    // the match ends: results menu
    if (m.phase === 'end') { this.updateEnd(dt); if (!m.netClient) m.step(dt); } else if (!this.data.frozen) {
      if (!m.netClient) m.step(dt); else m.t += dt;
      if (this.tut) this.updateTutorial(dt);
    }
    if (this.data.net) this.data.net.tick(dt);
    if (this.data.attract) this.attractDirector(dt);
    // views
    const b = m.ball;
    game.focus(b.x * .2, -2, 8);
    // rigs
    const f = this.frame();
    this.m.players.forEach((p, i) => {
      const fp = f.p[i], u = fp[5], air = fp[2] > 1.5, state = fp[6];
      const anim = p.swing && p.swing.dive ? null : (u >= 0 ? this.swingAnim(p, u) : null);
      let pose = null; if (fp[7]) pose = 'cheer'; else if (p.blockT > 0 || (u >= 0 && Math.abs(p.x) < 28 && air && !p.human)) pose = null;
      this.rigs[i].update(dt, { x: fp[0], y: fp[1], z: fp[2], vx: fp[3], vy: fp[4], facing: p.face, air, attack: anim, pose, down: state === 1 ? .55 : state === 2 ? 1 : 0, expr: p.expr, lean: 0 });
      p.scr = null;
    });
    for (const s of this.sand) { s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; s.vz -= 200 * dt; if (s.z < 0) s.z = 0; }
    this.sand = this.sand.filter(s => s.t > 0);
    for (const fl of this.floats) { fl.t -= dt; fl.z += 18 * dt; }
    this.floats = this.floats.filter(fl => fl.t > 0);
    for (const c of this.crowd) c.cheer = Math.max(0, (c.cheer || 0) - dt * .5);
    // replay of a highlight after a point
    if (m.phase === 'point' && m.replayFrames && m.phaseT > .9 && m.phaseT < 2.3) { this.replayT += dt; this.replayI = Math.min(m.replayFrames.length - 1, Math.floor(this.replayT * 30 * .55)); } else this.replayI = -1;
    G.music && 0;
  },
  swingAnim(p, u) {
    const kind = (p.swing && p.swing.anim) || (this.m.phase === 'serve' || p.z > 4 ? 'overhead' : 'cast');
    const ph = u < .4 ? 'wind' : u < .65 ? 'active' : 'recover', pu = u < .4 ? u / .4 : u < .65 ? (u - .4) / .25 : (u - .65) / .35;
    return E.move(kind, clamp(pu, 0, 1), ph);
  },
  frame() {
    const m = this.m;
    if (this.replayI >= 0 && m.replayFrames) return m.replayFrames[this.replayI];
    return m.snap();
  },
  toggleCamAuto() { },
  attractDirector(dt) {
    this.cutT += dt; if (this.cutT > 9) { this.cutT = 0; this.toggleCam(); }
    if (this.data.camStart && !this.camSet) { this.camSet = true; this.cam = this.data.camStart; G.game.setView(this.cam); }
    this.atT = (this.atT || 0) + dt; if (G.attract && ((this.m.phase === 'end' && this.over && this.over.t > 2.5) || this.atT > 55)) G.attractNext();
    // always keep the show going: if the match ended, the attract wrapper restarts it
  },
  updateTutorial(dt) {
    const t = this.tut, m = this.m; t.t += dt;
    const steps = [
      ['Welcome to the court! Move with ' + (G.isPad() ? 'the left stick' : 'WASD') + '.', () => m.phase === 'serve' && t.t > 3],
      ['Press ' + G.label('play') + ' to TOSS, press it again to SERVE.', () => m.ball.served],
      ['Watch the ring on the sand. Press ' + G.label('play') + ' as it closes: PERFECT timing!', () => m.stats[0].digs > 0 || m.score[0] + m.score[1] > 0],
      ['Third touch near the net jumps for a SPIKE. ' + G.label('dive') + ' dives, ' + G.label('call') + ' calls MINE.', () => m.score[0] + m.score[1] > 1]
    ];
    const s = steps[t.step]; if (s && s[1]()) { t.step++; t.t = 0; }
    this.tutText = t.step < steps.length ? steps[t.step][0] : null;
  },
  updateEnd(dt) {
    const m = this.m;
    if (!this.over) {
      this.over = { t: 0, winner: m.winner };
      const res = { winner: m.winner, score: m.score.slice(), stats: m.stats, humanTeam: this.data.humanTeam === undefined ? 0 : this.data.humanTeam, time: m.t };
      this.result = res;
      if (this.data.attract) return;
      const win = res.winner === res.humanTeam;
      this.menu = new G.Menu([
        { label: 'Continue', onPick: () => this.finish() },
        ...(this.data.rematch !== false ? [{ label: 'Rematch', onPick: () => this.rematch() }] : []),
        ...(this.data.noQuit ? [] : [{ label: 'Quit to menu', onPick: () => G.game.go(this.data.quitTo || 'menu') }])
      ], { y: 130, w: 120 });
      this.winLine = win ? G.rpick(['Sunshine and trophies!', 'Stay ahead, stay alive!', 'Tan lines, victory lines.'], 'cosmetic') : G.rpick(['The sea takes its tribute.', 'Hydrate. Reflect. Rematch.', 'Close! In a sandy kind of way.'], 'cosmetic');
      if (this.data.net) { this.menu = null; }
      if (this.data.onResult) this.data.onResult(res);
    }
    this.over.t += dt;
    if (this.menu && this.over.t > 1.2) this.menu.update(dt);
  },
  finish() { if (this.data.onEnd) this.data.onEnd(this.result); else G.game.go('menu'); },
  rematch() { const d = Object.assign({}, this.data); G.game.go('match', d); },
  /* ---------- drawing ---------- */
  draw(r) {
    const m = this.m, v = r.view, t = this.t, f = this.frame(), W = r.W, H = r.H;
    const sw = (x, y, z) => r.w(x, y, z);
    // sky, sea, beach
    const topFar = sw(0, -C2.HW - 34, 0)[1];
    const hz = Math.round(Math.max(24, topFar - 46));
    const g = r.tgt;
    const day = this.data.time === 'sunset' ? ['#3a2a6a', '#8a3a7a', '#ff6a5a', '#ffb347', '#ffe08a'] : ['#4aa8e8', '#78c4f0', '#a0daf8', '#c8eefc', '#e8f8ff'];
    const sandTop = Math.round(topFar);
    for (let i = 0; i < 5; i++) px.rect(g, 0, Math.floor(i * hz / 5), W, Math.ceil(hz / 5) + 1, day[i]);
    // clouds
    for (let i = 0; i < 4; i++) { const cx = ((i * 140 + t * 3) % (W + 80)) - 40, cy = 10 + i * 9; px.disc(g, cx, cy, 7, '#ffffffcc'); px.disc(g, cx + 8, cy + 1, 6, '#ffffffcc'); px.disc(g, cx - 8, cy + 2, 5, '#ffffffcc'); }
    for (let y = hz; y < sandTop; y++) { const k = (y - hz) / Math.max(1, sandTop - hz); px.rect(g, 0, y, W, 1, k < .35 ? '#2a9ad0' : k < .7 ? '#1a82bc' : '#3ab0d8'); for (let x = (y * 17 + Math.round(t * 8)) % 24; x < W; x += 24) px.rect(g, x, y, 5, 1, '#9ee4f4'); }
    px.rect(g, 0, sandTop, W, H - sandTop, '#f4dca0');
    for (let y = sandTop + 2; y < H; y += 4) px.rect(g, 0, y, W, 1, ((y >> 2) & 1) ? '#efd394' : '#f8e4b0');
    px.rect(g, 0, sandTop - 1, W, 2, '#fff8e0');                     // shoreline foam
    // court floor (a slightly lighter, firmer sand) and lines
    const corner = (x, y) => sw(x, y, 0), L = C2.HL, Wd = C2.HW;
    px.poly(g, [corner(-L, -Wd), corner(L, -Wd), corner(L, Wd), corner(-L, Wd)], '#f9e6b4');
    const line = (a, b, c = '#ffffff', w = 1) => px.line(g, Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), c, w);
    line(corner(-L, -Wd), corner(L, -Wd)); line(corner(-L, Wd), corner(L, Wd)); line(corner(-L, -Wd), corner(-L, Wd)); line(corner(L, -Wd), corner(L, Wd)); line(corner(0, -Wd), corner(0, Wd), '#ffffff88');
    // team colour hints on the baselines
    line(corner(-L, -Wd), corner(-L, Wd), TEAM_COL[0][0], 1); line(corner(L, -Wd), corner(L, Wd), TEAM_COL[1][0], 1);
    // props and crowd
    r.prop('palm', -112, -64, 0, { size: 1.6 }); r.prop('palm', 118, -70, 0, { size: 1.9 }); r.prop('palm', 100, 74, 0, { size: 1.5 }); r.prop('palm', -108, 76, 0, { size: 1.5 });
    r.prop('sign', 0, -88, 0, { size: 1.2 });
    const shown = Math.round(this.crowd.length * G.T.crowd);
    for (let i = 0; i < Math.min(shown, this.crowd.length); i++) {
      const c = this.crowd[i], cheer = c.cheer || 0, bob = Math.abs(Math.sin(t * 6 + c.ph)) * (2 + 5 * cheer);
      r.queue(c.x, c.y, bob, gg => { const [x, y] = r.w(c.x, c.y, bob); const X = Math.round(x), Y = Math.round(y); px.rect(gg, X - 2, Y - 5, 4, 5, c.c); px.rect(gg, X - 1, Y - 8, 3, 3, '#e8b890'); px.rect(gg, X - 1, Y - 9, 3, 1, c.h); if (cheer > .5) { px.rect(gg, X - 3, Y - 8, 1, 3, '#e8b890'); px.rect(gg, X + 3, Y - 8, 1, 3, '#e8b890'); } });
    }
    // net
    const NT = G.T.netHeight;
    for (const sy of [-C2.NETW, C2.NETW]) r.queue(0, sy, 0, gg => { const [x0, y0] = r.w(0, sy, 0), [x1, y1] = r.w(0, sy, NT + 6); px.line(gg, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), '#d8d8e0', 2); px.rect(gg, Math.round(x1) - 1, Math.round(y1) - 1, 3, 3, '#ff4f6a'); });
    for (let y = -C2.NETW; y < C2.NETW; y += 6) {
      r.queue(0, y + 3, NT, gg => {
        const [xa, ya] = r.w(0, y, 0), [xb, yb] = r.w(0, y + 6, 0), [xc, yc] = r.w(0, y, NT), [xd, yd] = r.w(0, y + 6, NT);
        px.polyDither ? px.polyDither(gg, [[xc, yc], [xd, yd], [xb, yb - (NT - NT * .32) * -v.bz * 0 + 0 - 0], [xa, ya - (NT * .62) * -v.bz]], '#f4f4fa', .25, r.ix, r.iy) : 0;
        px.line(gg, Math.round(xc), Math.round(yc), Math.round(xd), Math.round(yd), '#ffffff', 2);
        px.line(gg, Math.round(xc), Math.round(yc + 1), Math.round(xd), Math.round(yd + 1), '#d03a4a', 1);
        px.line(gg, Math.round(xa), Math.round(ya - (NT * .62) * -v.bz), Math.round(xb), Math.round(yb - (NT * .62) * -v.bz), '#ffffff88', 1);
      }, { bias: 0 });
    }
    // players
    m.players.forEach((p, i) => {
      const fp = f.p[i], rig = this.rigs[i];
      r.shadow(fp[0], fp[1], 6, .35);
      const down = fp[6] === 2;
      r.actor(fp[0], fp[1], fp[2], (gg, ox, oy) => { p.scr = [ox, oy]; rig.draw(gg, ox, oy, r.view); });
      p.scr = r.w(fp[0], fp[1], 0);
      // marker over humans
      if (p.human && !down && this.replayI < 0) {
        const col = (E.PLAYER_COLORS && E.PLAYER_COLORS[p.ctl.pnum || 0]) || TEAM_COL[p.team][0];
        r.queue(fp[0], fp[1], 40, gg => { const [x, y] = r.w(fp[0], fp[1], 42 + Math.sin(t * 6) * 1.5); px.poly(gg, [[x - 3, y - 5], [x + 3, y - 5], [x, y]], col); }, { emissive: true });
      }
      if (p.popT > 0 && p.popup && this.replayI < 0) r.queue(fp[0], fp[1], 44, gg => { const [x, y] = r.w(fp[0], fp[1], 46 + (0.8 - p.popT) * 12); E.font.text(gg, p.popup.text, Math.round(x), Math.round(y), p.popup.q >= .99 ? '#fff06a' : p.popup.q > .55 ? '#9bffb0' : '#ffb0a0', { align: 'center', shadow: '#000', outline: false }); }, { emissive: true });
    });
    // timing ring for local humans
    if (this.replayI < 0) for (const p of m.players) if (p.human && p.ring && m.phase === 'rally') {
      const eta = p.ring.eta, half = p.swing ? 0 : G.T.timingWindow * 0 + .15, k = clamp((eta - half) / .9, 0, 1), rad = 5 + 34 * k;
      const close = Math.abs(eta - .15) < G.T.perfectWindow * 1.4;
      r.queue(p.x, p.y, 0, gg => { const [x, y] = r.w(p.x, p.y, 0); const pts = r.groundPts(p.x, p.y, rad, 22, 0); for (let i = 0; i < pts.length; i++) { const a = pts[i], b2 = pts[(i + 1) % pts.length]; px.line(gg, Math.round(a[0]), Math.round(a[1]), Math.round(b2[0]), Math.round(b2[1]), close ? '#fff06a' : '#ffffffcc', 1); } const q = r.groundPts(p.x, p.y, 5, 14, 0); for (let i = 0; i < q.length; i++) { const a = q[i], b2 = q[(i + 1) % q.length]; px.line(gg, Math.round(a[0]), Math.round(a[1]), Math.round(b2[0]), Math.round(b2[1]), '#ff4f6a', 1); } void x; void y; }, { bias: -1 });
    }
    // the serve ring: around the held/tossed ball for a human server
    // the ball
    const bb = f.b, bz = bb[2];
    r.shadow(bb[0], bb[1], 3 + Math.max(0, 1 - bz / 80) * 2, .5);
    if (m.ball.trail.length > 2 && this.replayI < 0 && Math.hypot(m.ball.vx, m.ball.vy) > 140) r.queue(bb[0], bb[1], bz, gg => { m.ball.trail.forEach((q, k) => { const [x, y] = r.w(q[0], q[1], q[2]); px.disc(gg, Math.round(x), Math.round(y), 1 + k * .25, '#ffffff' + (k < 3 ? '55' : '88')); }); }, { emissive: true });
    r.queue(bb[0], bb[1], bz, gg => {
      const [x, y] = r.w(bb[0], bb[1], bz), X = Math.round(x), Y = Math.round(y - 3), rot = Math.floor(t * 8) & 3;
      px.disc(gg, X, Y, 4, '#3a4a8a'); px.disc(gg, X, Y, 3, '#fffbe8');
      px.rect(gg, X - 3, Y - 1 + (rot & 1), 6, 1, '#ffd24a'); px.rect(gg, X - 1, Y - 3, 2, 6, '#3ab0ff'); px.dot(gg, X - 1, Y - 2, '#ffffff');
    }, { emissive: true, bias: 2 });
    for (const s of this.sand) r.queue(s.x, s.y, s.z, gg => { const [x, y] = r.w(s.x, s.y, s.z); px.rect(gg, Math.round(x), Math.round(y), 1, 1, '#f0d890'); });
    for (const fl of this.floats) { }
    this.drawHud(r);
  },
  drawHud(r) {
    const m = this.m, W = r.W, H = r.H;
    r.overlay(g => {
      // TV scoreboard
      const bw = 116, x0 = Math.round(W / 2 - bw), y0 = 3;
      for (let t = 0; t < 2; t++) {
        const x = t === 0 ? x0 : Math.round(W / 2 + 1), w = bw - 1;
        E.ui.box(g, x, y0, w, 17, { bg: ['#0e2a38', '#061620'], border: TEAM_COL[t][0], alpha: .9 });
        const nm = G.teamName(m, t); E.font.text(g, nm, t === 0 ? x + 4 : x + w - 4, y0 + 2, '#ffffff', { align: t === 0 ? 'left' : 'right', shadow: '#000', outline: false });
        E.font.text(g, '' + m.score[t], t === 0 ? x + w - 6 : x + 6, y0 + 8, TEAM_COL[t][1], { align: t === 0 ? 'right' : 'left', shadow: '#000', outline: false, scale: 1 });
        // touch pips for the team that has the ball
        const have = m.ball.lastTeam === t && m.phase === 'rally' ? m.ball.touches : 0;
        for (let i = 0; i < 3; i++) px.rect(g, (t === 0 ? x + 4 : x + w - 4 - 3 * 4) + i * 4, y0 + 12, 3, 3, i < have ? TEAM_COL[t][1] : '#1a4a5a');
        if (m.serving === t) px.disc(g, t === 0 ? x + w - 6 - E.font.width('' + m.score[t]) - 5 : x + 6 + E.font.width('' + m.score[t]) + 5, y0 + 11, 2, '#fff06a');
      }
      E.font.text(g, 'FIRST TO ' + m.to, Math.round(W / 2), y0 + 18, '#bfe9ee', { align: 'center', shadow: '#000', outline: false });
      // banner
      if (m.msg && m.msgT > 0) {
        const a = Math.min(1, m.msgT * 3), s = 1 + (m.msgT > 1.4 ? (m.msgT - 1.4) * 3 : 0);
        E.font.title(g, m.msg, Math.round(W / 2), Math.round(H * .30), { align: 'center', scale: Math.max(1, Math.round(2 * s)), colors: ['#fff6c8', '#ffd24a', '#ff9a3c'], depth: 2, depthColor: '#5a1030' });
        void a;
      }
      if (this.replayI >= 0) { E.font.title(g, 'REPLAY', 14, 30, { scale: 2, colors: ['#ffffff', '#ff6a8a'], depth: 1, depthColor: '#5a1030' }); px.rect(g, 0, 0, W, 8, '#00000088'); px.rect(g, 0, H - 8, W, 8, '#00000088'); }
      // commentary strip
      if (this.cmtT > 0 && this.cmt) {
        const w = Math.min(W - 20, E.font.width(this.cmt) + 38), x = Math.round(W / 2 - w / 2), y = H - 36;
        E.ui.box(g, x, y, w, 15, { bg: ['#2a1a4a', '#12082a'], border: '#ff9a3c', alpha: .92 });
        E.font.text(g, 'SONNY', x + 4, y + 4, '#ffd24a', { shadow: '#000', outline: false });
        E.font.text(g, this.cmt, x + 38, y + 4, '#ffffff', { shadow: '#000', outline: false });
      }
      // serve / tutorial prompts
      let tip = '';
      const hp = m.players.find(p => p.human);
      if (hp && m.phase === 'serve' && m.serverPlayer().human && m.ball.state === 'held') tip = 'Press ' + G.label('play') + ' to toss the ball';
      else if (hp && m.phase === 'serve' && m.serverPlayer().human && m.ball.state === 'flight') tip = 'Press ' + G.label('play') + ' again to serve!';
      if (this.tutText) tip = this.tutText;
      if (tip) { const w = E.font.width(tip) + 14; E.ui.box(g, Math.round(W / 2 - w / 2), Math.round(H * .56), w, 15, { bg: ['#1b4a5a', '#0b2430'], border: '#ffd36a', alpha: .92 }); E.font.text(g, tip, Math.round(W / 2), Math.round(H * .56) + 4, '#fff6c8', { align: 'center', shadow: '#000', outline: false }); }
      if (m.phase === 'intro') {
        const k = m.phaseT; E.font.title(g, G.teamName(m, 0), Math.round(W / 2), Math.round(H * .3), { align: 'center', scale: 1, colors: ['#ffe08a', '#ff9a3c'], depth: 1, depthColor: '#5a1030' });
        E.font.text(g, 'VS', Math.round(W / 2), Math.round(H * .3) + 14, '#ffffff', { align: 'center', shadow: '#000', outline: false });
        E.font.title(g, G.teamName(m, 1), Math.round(W / 2), Math.round(H * .3) + 26, { align: 'center', scale: 1, colors: ['#bfeaff', '#3ab0ff'], depth: 1, depthColor: '#082a3a' });
        void k;
      }
      // results
      if (m.phase === 'end' && this.over) this.drawResults(g, r);
    });
    if (m.phase !== 'end' && !this.data.attract && !this.data.net) G.drawPrompts(r, [['play', 'Play'], ['dive', 'Dive'], ['call', 'Call'], ['cam', 'Camera']], H - 14);
    if (this.menu && this.over && this.over.t > 1.2) this.menu.draw(r);
  },
  drawResults(g, r) {
    const m = this.m, W = r.W, H = r.H, k = clamp(this.over.t * 2, 0, 1);
    if (this.data.attract) { E.font.title(g, G.teamName(m, m.winner) + ' WIN!', Math.round(W / 2), Math.round(H * .4), { align: 'center', scale: 2, colors: ['#fff6c8', '#ffd24a', '#ff9a3c'], depth: 2, depthColor: '#5a1030' }); return; }
    const w = 230, h = 100, x = Math.round(W / 2 - w / 2), y = Math.round(H * .08 + (1 - k) * -40);
    G.panel(g, x, y, w, h);
    const win = m.winner === (this.data.humanTeam === undefined ? 0 : this.data.humanTeam);
    E.font.title(g, win ? 'VICTORY!' : 'GOOD GAME', W / 2, y + 6, { align: 'center', scale: 2, colors: win ? ['#fff6c8', '#ffd24a', '#ff9a3c'] : ['#e0f4ff', '#8ac8e8', '#4a88b8'], depth: 2, depthColor: '#102a40' });
    G.text(g, G.teamName(m, 0) + '  ' + m.score[0] + ' - ' + m.score[1] + '  ' + G.teamName(m, 1), W / 2, y + 28, '#fff', { align: 'center' });
    const st = m.stats[0], s2 = m.stats[1];
    const rows = [['Spikes', st.spikes, s2.spikes], ['Blocks', st.blocks, s2.blocks], ['Digs', st.digs, s2.digs], ['Aces', st.aces, s2.aces], ['Dives', st.dives, s2.dives]];
    rows.forEach((rw, i) => { const yy = y + 40 + i * 9; G.text(g, '' + rw[1], x + 40, yy, '#ffd24a', { align: 'right' }); G.text(g, rw[0], W / 2, yy, '#bfe9ee', { align: 'center' }); G.text(g, '' + rw[2], x + w - 40, yy, '#9be0ff', { align: 'left' }); });
    G.text(g, this.winLine || '', W / 2, y + h - 10, '#ffeec2', { align: 'center' });
  }
};
G.scenes.match = G.wrapScene(G.MatchScene);
