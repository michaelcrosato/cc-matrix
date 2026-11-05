/* 40-attract: the idle watcher (10 s without input on the title and the menus starts the attract mode) and the attract
 * scene: a looping, scripted showcase of AI-versus-AI football that cheats freely (stamina, Euphoria, forced goals) to
 * show the most: a super strike and its Save Duel, a corner and a bicycle kick, the dark arts with VAR, a shootout with a
 * Panenka, a weather report, and the title card. Any input goes straight back to the title. */
EF.idle = {
  t: 0, last: null,
  reset() { this.t = 0; },
  anyInput() {
    if (game.players.some(I => I.anyPressed())) return true;
    if (game.real - EF.mouse.moved < .06 || EF.mouse.pressed.some(Boolean)) return true;
    if (game.input.clicked && game.input.clicked()) return true;
    const z = game.input.zoom && game.input.zoom(); if (typeof z === 'number' && Math.abs(z - 1) > 1e-6) return true;
    for (const I of game.players) { const m = I.move(); if (hyp(m[0], m[1]) > .3) return true; }
    return false;
  },
  tick(dt) {
    if (SESSION) return;
    if (this.anyInput()) { this.t = 0; return; }
    this.t += dt;
    if (this.t >= 10) { this.t = 0; game.go('attract', {}, { fade: 0 }); }
  }
};
const SEGS = [
  { id: 'live', name: 'MATCHDAY LIVE', dur: 30 },
  { id: 'setpiece', name: 'SET-PIECE SPECIAL', dur: 15 },
  { id: 'darkarts', name: 'THE DARK ARTS', dur: 15 },
  { id: 'shootout', name: 'SHOOTOUT', dur: 15 },
  { id: 'weather', name: 'WEATHER REPORT', dur: 10 },
  { id: 'card', name: 'TITLE CARD', dur: 5 }
];
EF.ATTRACT_SEGS = SEGS;
let attractLoop = 0;
const attractScene = {
  touch: [], view: 'broadcast', camera: { zoom: [.8, 1.8], start: 1 },
  enter() { this.seg = -1; this.t = 0; this.segT = 0; this.seen = new Set(); this.loop = attractLoop++; EF.music(null); this.nextSeg(); game.input.consumeAll(); this.grace = .3; },
  exit() { EF.detach(); game.timeScale = EF.T.gameSpeed; },
  match(o) {
    EF.detach();
    const m = new Match(Object.assign({ draws: 'allowed', halfLength: 60, seed: 100 + this.loop * 7 + this.seg, slots: [], attract: true, infStamina: true }, o));
    EF.attach(m, { headlessReplay: true }); this.m = m; return m;
  },
  nextSeg() {
    this.seg = (this.seg + 1) % SEGS.length; this.segT = 0; const S = SEGS[this.seg]; this.seen.add(S.id); this.step = 0; this.wcut = -1;
    const stad = ['smokehouse', 'pasapasa', 'stahlpresse', 'lucchetto', 'euphorium'][this.loop % 5], owners = { smokehouse: 'hoofington', pasapasa: 'pasapasa', stahlpresse: 'stahlpresse', lucchetto: 'lucchetto', euphorium: 'opulence' };
    if (S.id === 'live') { const m = this.match({ home: 'kipperton', away: owners[stad], stadium: stad, attractDuel: true }); m.forceGoal = true; this.setupSuper(m); EF.music('attract'); }
    if (S.id === 'setpiece') { const m = this.match({ home: 'kipperton', away: 'hoofington', stadium: 'smokehouse' }); m.forceGoal = true; m.startSetpiece('corner', 0, { y: P.Y0 }); }
    if (S.id === 'darkarts') { const m = this.match({ home: 'lucchetto', away: 'kipperton', stadium: 'lucchetto', referee: 'severo' }); m.forceGoal = true; m.ref = Object.assign({}, m.ref, { gullibility: 9 }); m.mode = 'play'; m.sp = null; this.diver = m.side[0].find(f => f.data.id === 'fallo') || m.side[0][3]; const gx = m.goalX(0); this.diver.body.x = gx - m.dir(0) * 70; this.diver.body.y = P.CY + 20; m.takeBall(this.diver); const def = m.side[1].find(f => !f.gk); def.body.x = this.diver.body.x + m.dir(0) * 7; def.body.y = this.diver.body.y + 3; }
    if (S.id === 'shootout') { this.match({ home: 'kipperton', away: owners[stad], stadium: stad, shootoutOnly: true, draws: 'pens' }); }
    if (S.id === 'weather') this.weatherCut(0);
    if (S.id === 'card') { EF.detach(); this.m = null; this.stage = new Stage('euphorium', { weather: false }); EF.music('anthem'); game.setZoom(1.3); game.zoomBase = 1.3; }
  },
  weatherCut(k) {
    this.wcut = k; const W = [['smokehouse', 'hoofington'], ['stahlpresse', 'stahlpresse'], ['lucchetto', 'lucchetto'], ['euphorium', 'opulence']][k];
    const m = this.match({ home: 'kipperton', away: W[1], stadium: W[0], fog: k === 2 });
    m.mode = 'play'; m.sp = null; m.owner = m.side[0][3]; m.ball.x = P.CX; m.ball.y = P.CY;
    if (k === 2) { m.euph[1] = 100; m.triggerEurophoria(1); }
    if (k === 3) { LIVE.view.firework(10); m.startEvent('fireworks'); }
  },
  setupSuper(m) {
    m.mode = 'play'; m.sp = null; const s = 0, cap = m.side[s].find(f => f.data.captain);
    cap.body.x = m.goalX(s) - m.dir(s) * 230; cap.body.y = P.CY + 20; m.takeBall(cap);
    m.euph[s] = 100; m.triggerEurophoria(s); cap.plan = { k: 'shoot', power: .97, aimY: .5, until: m.t + 5 };
  },
  update(dt) {
    this.t += dt; this.segT += dt; this.grace -= dt;
    if (this.grace <= 0 && EF.idle.anyInput()) { game.players.forEach(I => I.consumeAll()); EF.mouse.pressed = [false, false, false]; game.go('title', { menu: true }, { fade: 0 }); return; }
    const S = SEGS[this.seg], m = this.m;
    if (S.id === 'card') { this.stage.update(dt); game.focus(P.CX, P.CY - 60, 0); }
    else if (m) {
      EF.liveStep(dt);
      if (LIVE.view && LIVE.view.replay && LIVE.view.replay.i > 60 * 2.4) EF.replayEnd();   // (keep the reel moving)
      if (S.id === 'setpiece') this.forceBicycle(m);
      if (S.id === 'darkarts') this.darkArts(m);
      if (S.id === 'live' && m.mode === 'play' && !m.superFlight && m.goals.length && this.step === 0 && this.segT > 14) { this.step = 1; }
      if (S.id === 'weather') { const k = Math.min(3, Math.floor(this.segT / 2.5)); if (k !== this.wcut) this.weatherCut(k); }
    }
    if (this.segT >= S.dur) this.nextSeg();
  },
  forceBicycle(m) {
    if (this.step === 0 && m.ball.kind === 'cross' && !m.owner) {
      const r = m.ball.to || m.side[0].find(f => !f.gk), path = predictBall(m, 1.2, 1 / 60), p = path.find(q => q.z > 22 && q.z < 34 && q.t > .3);
      if (r && p) { r.body.x = p.x - m.dir(0) * 2; r.body.y = p.y; r.facing = m.dir(0) > 0 ? PI : 0; r.state = 'run'; this.step = 1; this.bic = r; }
    }
    if (this.step === 1 && this.bic && !m.owner) { const w = airWindow(this.bic); if (w && w.z >= 22) { this.bic.facing = m.dir(0) > 0 ? PI : 0; this.bic.startAir(w, 'shoot', { aimY: .3, move: [0, 0] }); this.step = 2; } }
    if (this.step === 2 && m.mode === 'goal') this.step = 3;
  },
  darkArts(m) {
    if (this.step === 0 && this.segT > .6 && this.diver && m.mode === 'play') { const d = m.side[1].find(f => !f.gk); this.diver.contactT = m.t; this.diver.theatrics(); this.step = 1; }
    if (this.step === 1 && m.varCheck) { m.varCheck.foul.sev = 2; m.varCheck.foul.dive = false; this.step = 2; }
    if (this.step === 2 && m.mode === 'play' && m.goals.length) { this.step = 3; this.t3 = this.segT; }
    if (this.step === 3 && m.mode === 'play' && this.segT - this.t3 > 2.5) { const f = m.side[1].find(f2 => !f2.gk && !f2.sentOff); if (f) { for (const o of m.side[0]) if (dist(o.body, f.body) < 20) o.body.x += 40; f.theatrics(); } this.step = 4; }
  },
  draw(r) {
    const S = SEGS[this.seg];
    if (S.id === 'card') {
      this.stage.draw(r);
      r.overlay(g => {
        EF.heading(g, 'EUROPHORIA', r.W / 2, Math.round(r.H * .14), 4); EF.heading(g, 'FOOTBALL', r.W / 2, Math.round(r.H * .14) + 34, 3, { colors: ['#ffffff', '#c8d8ff', '#6a8aff'] });
        const rec = EF.Save.data.records;
        E.font.text(g, 'CUPS WON: ' + rec.cupsWon + (rec.fastestCup ? '   FASTEST CUP: ' + mmss(rec.fastestCup) : '') + (rec.biggestWin ? '   BIGGEST WIN: ' + rec.biggestWin.score.join('-') + ' vs ' + rec.biggestWin.vs : ''), r.W / 2, Math.round(r.H * .55), '#ffe08a', { align: 'center', outline: '#000' });
        if (Math.floor(this.t * 2) % 2) { const w = EF.promptWidth('start', 'PRESS START', { scale: 2 }); EF.prompt(g, Math.round(r.W / 2 - w / 2), Math.round(r.H * .66), 'start', 'PRESS START', { scale: 2 }); }
      });
    } else if (this.m) EF.liveDraw(r);
    r.overlay(g => {
      const y = r.H - 22; px.blend(g, .7, 'normal', () => px.rect(g, 0, y - 4, r.W, 20, '#05070f'));
      E.font.text(g, 'DEMO', 10, y, '#ff5a5a', { scale: 1, outline: false });
      E.font.text(g, S.name, 44, y, '#ffc83a', { outline: false });
      const w = EF.promptWidth('confirm', 'PRESS ANY BUTTON'); EF.prompt(g, r.W - w - 10, y - 2, 'confirm', 'PRESS ANY BUTTON');
    });
  }
};
EF.scenes.attract = attractScene;
