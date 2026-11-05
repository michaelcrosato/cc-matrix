/* ============ 33-match: the match scene: a Match, its view, the controllers, the results ============ */
EF.lastMatchData = null;
EF.restartMatch = () => { if (EF.lastMatchData) game.go('match', EF.lastMatchData); };
EF.matchSong = id => ({ smoke: 'smoke', 'olé': 'ole', forge: 'forge', curva: 'curva', gold: 'gold', rec: 'rec' }[(EF.get('stadium', id) || {}).music] || 'smoke');
EF.scenes.match = {
  pausable: !EF.session, view: 'broadcast', input: EF.KEYS, res: 'ps1', touch: [], camera: { zoom: [.7, 1.8], start: 1 },
  enter(d) {
    d = d || {}; EF.lastMatchData = d; this.d = d; this.results = null; this.t = 0; EF.notices = [];
    game.input.touchEnabled = false;
    const cam = (game.settings && game.settings.camera) || 'broadcast'; try { game.setView(cam === 'aerial' ? 'aerial' : cam === 'threequarter' ? 'threequarter' : 'broadcast'); } catch (e) { /* view */ }
    const M = this.M = d.build ? d.build() : new EF.Match({ home: d.home || 'kip', away: d.away || 'hoo', stadium: d.stadium, ref: d.ref, seed: d.seed, rules: d.rules, talk: d.talk, formation: d.formation, awayKit: d.awayKit, cheat: d.cheat, aiSpeed: d.aiSpeed, dummies: d.dummies, noReplay: d.noReplay, euStart: d.euStart, noEvents: d.noEvents, quickKick: d.quickKick });
    if (!d.build) for (const h of (d.humans || [{ idx: 0, side: 0 }])) { const inp = game.players[h.idx] || game.input; M.addHuman(h.idx, h.side, new EF.HumanController(inp, h.idx)); }
    this.mv = new EF.MatchView(M, { ball: EF.Save.load().ballId, noHud: d.noHud, quiet: d.quiet, noRadar: false });
    const st = M.stadium; game.weather = st.weather && st.weather.kind !== 'fog' ? Object.assign({}, st.weather) : null;
    L.enabled = true; L.ambient = st.ambient; game.cam.bounds = null; game.follow(null);
    if (!d.noMusic) EF.music(d.music || EF.matchSong(M.stadiumId));
    this.menu = null; this.offs = [];
    if (d.extraWorld) this.mv.extra = d.extraWorld;
    if (d.onSetup) d.onSetup(M, this);
    this.mv.zoomApplied = undefined; this.mv.camPos = { x: Pitch.CX, y: Pitch.CY }; if (M.humans[0]) { /* camera starts at the centre */ }
    if (EF.query.dev === '1' && EF.Dev) EF.Dev.open();
    game.settings && game.settings.set && 0;
  },
  exit() { if (this.mv) this.mv.destroy(); game.weather = null; EF.crowdAudio.stop(); game.resetCamera && game.resetCamera(); L.enabled = false; EF.music(null); },
  back() { return false; },
  update(dt) {
    const M = this.M, d = this.d; if (!M) return;
    this.t += dt;
    if (d.attract && this.t > .6 && EF.activity(d.startedAt)) { game.go('title'); return; }
    if (this.results) { this.results.menu.update(dt); this.mv.update(dt * .2); return; }
    // human extras: use counts for prompts, replay skip, the celebration picker
    for (const h of M.humans) { const I = game.players[h.idx] || game.input; for (const a of ['pass', 'shoot', 'lob', 'through', 'skill', 'dive']) if (I.pressed(a)) EF.useAction(M.ball.owner === h.f ? a : a === 'pass' ? 'tackle' : a === 'shoot' ? 'slide' : a === 'lob' ? 'barge' : a);
      if (M.mode === 'replay' && (I.pressed('pass') || I.pressed('confirm'))) M.skipReplay = true;
      if ((M.mode === 'goal' || M.mode === 'celebrate') && M.goalInfo && M.goalInfo.side === h.side) { const pick = I.pressed('pass') ? 'cheer' : I.pressed('shoot') ? 'slide' : I.pressed('lob') ? 'robot' : I.pressed('through') ? 'helicopter' : null; if (pick) for (const f of M.F) if (f.side === h.side) f.celebStyle = pick; } }
    if (d.mode === 'cup' && !M.challengeDone) { const ch = EF.CHALLENGES[EF.STORY.rounds[d.round].challenge]; if (ch.test(M.stats[0])) { M.challengeDone = true; EF.notice('GAFFER\'S CHALLENGE COMPLETE!', '#ffe08a', 3, 2); EF.sfx('euphoriaFull'); } }
    if (d.onUpdate) d.onUpdate(M, dt, this);
    if (M.o.frozen && !d.hubClient) { this.mv.update(dt); return; }
    M.update(dt); this.mv.update(dt);
    if (M.over && !this.results && !d.noResults) this.buildResults();
    if (M.over && d.noResults && d.onOver) { d.onOver(M); }
  },
  buildResults() {
    const M = this.M, d = this.d, res = M.result, w = res.winner, win = w === 0, human = M.humans.some(h => h.side === 0);
    let extra = []; const cup = d.mode === 'cup', rd = cup ? EF.STORY.rounds[d.round] : null;
    if (cup) {
      const ch = EF.CHALLENGES[rd.challenge], done = ch.test(M.stats[0]); if (done) { EF.Save.load().challenges[rd.challenge] = 1; EF.Save.sticker('ch:' + rd.challenge); }
      extra.push((done ? '[x] ' : '[ ] ') + 'GAFFER\'S CHALLENGE: ' + ch.text); res.challenge = done;
      EF.Save.sticker('s:' + rd.stadium); EF.Save.sticker('c:' + rd.team); EF.Save.load().records.played++; EF.Save.load().records.goals += M.stats[0].goals; if (win) EF.Save.load().records.wins++;
      for (let i = 0; i < 5; i++) EF.Save.sticker('p:' + rd.team + ':' + i);
      if (M.stats[0].busGoals > 0) EF.Save.sticker('x:bus'); if (Object.keys(EF.Save.load().challenges).length === 5) { EF.Save.load().unlocks.leather = 1; EF.Save.load().ballId = EF.Save.load().ballId; }
      EF.Save.save();
    }
    const items = [];
    if (cup) { if (win) items.push({ label: 'CONTINUE', onPick: () => d.onDone && d.onDone(res) }); else { items.push({ label: 'TRY AGAIN', onPick: () => game.go('match', d) }); items.push({ label: 'QUIT TO TITLE', onPick: () => game.go('title') }); } }
    else if (d.mode === 'kickabout' || d.mode === 'penalties') { items.push({ label: 'REMATCH', onPick: () => game.go('match', Object.assign({}, d, { seed: (d.seed || 1) + 7 })) }); items.push({ label: 'SETUP', onPick: () => game.go(d.mode === 'penalties' ? 'penaltysetup' : 'setup') }); items.push({ label: 'TITLE', onPick: () => game.go('title') }); }
    else items.push({ label: 'CONTINUE', onPick: () => game.go('title') });
    this.results = { res, win, extra, menu: new EF.UI.Menu(items, { y: 156, w: 180, h: 18, scale: 1 }) }; EF.music(win ? 'victory' : 'defeat'); if (!human && !cup) EF.music('title');
  },
  draw(r) {
    const M = this.M; if (!M) return;
    if (this.d.noDraw) { r.overlay(g => px.rect(g, 0, 0, r.W, r.H, '#05060f')); return; }
    this.mv.draw(r);
    if (this.d.drawExtra) this.d.drawExtra(r, M, this);
    if (this.results) { r.overlay(g => this.resultsDraw(g, r)); this.results.menu.draw(r); }
  },
  resultsDraw(g, r) {
    const M = this.M, R = this.results, W = r.W, H = r.H, res = R.res; px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W, H, '#050810'));
    const x = W / 2 - 150, y = 12; UI.panel(g, x, y, 300, 140);
    const wn = res.winner, title = wn < 0 ? 'A DRAW' : wn === 0 ? (R.win && M.humans.length ? 'VICTORY!' : M.teams[0].data.short + ' WIN') : (M.humans.some(h => h.side === 0) ? 'DEFEAT' : M.teams[1].data.short + ' WIN');
    TXT(g, title, W / 2, y + 6, wn === 0 ? '#ffe08a' : '#ff9a8a', { scale: 3, align: 'center', outline: '#000', shadow: false });
    EF.drawCrest(g, M.teams[0].data, x + 14, y + 36, 1.4); EF.drawCrest(g, M.teams[1].data, x + 300 - 14 - 17, y + 36, 1.4);
    TXT(g, M.score[0] + ' - ' + M.score[1], W / 2, y + 34, '#ffffff', { scale: 3, align: 'center' }); if (res.pens) TXT(g, 'PENS ' + res.pens[0] + ' - ' + res.pens[1], W / 2, y + 58, '#ffd84a', { align: 'center' });
    TXT(g, M.teams[0].data.short, x + 14, y + 56, '#c8d4ff', { font: 'tiny' }); TXT(g, M.teams[1].data.short, x + 300 - 14, y + 56, '#c8d4ff', { font: 'tiny', align: 'right' });
    res.goals.slice(0, 6).forEach((gl, i) => TXT(g, gl.minute + "' " + gl.name + (gl.pen ? ' (PEN)' : gl.header ? ' (HEADER)' : gl.sup ? ' (SUPER)' : '') + (gl.own ? ' (OG)' : ''), gl.side === 0 ? x + 14 : x + 300 - 14, y + 70 + i * 8 - (0), gl.side === 0 ? '#e8ecff' : '#e8ecff', { font: 'tiny', align: gl.side === 0 ? 'left' : 'right' }));
    R.extra.forEach((s, i) => TXT(g, s, W / 2, y + 124 + i * 9, s.startsWith('[x]') ? '#9aff9a' : '#c8d4ff', { font: 'tiny', align: 'center' }));
    if (EF.newStickers && EF.newStickers.length) { TXT(g, EF.newStickers.length + ' NEW STICKER' + (EF.newStickers.length > 1 ? 'S' : '') + ' IN THE ALBUM', W / 2, y + 136, '#ffd84a', { font: 'tiny', align: 'center' }); }
    UI.footer(g, r, [['confirm', 'SELECT']]);
  }
};
