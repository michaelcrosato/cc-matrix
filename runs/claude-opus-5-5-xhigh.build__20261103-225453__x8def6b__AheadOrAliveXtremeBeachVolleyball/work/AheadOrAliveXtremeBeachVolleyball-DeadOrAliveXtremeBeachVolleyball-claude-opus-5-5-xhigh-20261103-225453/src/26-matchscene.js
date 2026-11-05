/* 26-matchscene: the 'match' scene that hosts a G.Match, and the results screen: the winners pose, three big stat cards
 * (points, kills, longest rally), the MVP with a portrait, prize money counting up and the partner's hearts (vacation),
 * then the owner's buttons (Continue; or Rematch / Change setup / Title). */
G.startMatch = (cfg) => { G.game.go('match', { cfg }, { fade: 'swirl', seconds: .35 }); };
G.resultsUI = (M, res, o = {}) => {
  const nav = new G.Nav(), ui = { t: 0, money: G.counter(0), aff: o.affBefore, affTo: o.affAfter };
  if (o.prize) ui.money.v = o.prize;
  ui.items = () => {
    const W = G.game.W, H = G.game.H, n = o.buttons.length, bw = 110, gap = 8, x0 = Math.round((W - (n * bw + (n - 1) * gap)) / 2), y = Math.round(H * .95) - 26;
    return o.buttons.map((b, i) => ({ id: 'b' + i, x: x0 + i * (bw + gap), y, w: bw, h: 18, label: b[0], onPress: b[1], primary: i === 0 }));
  };
  ui.update = dt => { ui.t += dt; ui.money.step(dt, 3); if (ui.t > .8) { if (ui.money.shown < ui.money.v && Math.floor(ui.t * 20) % 2 === 0) G.sfx('count'); nav.update(ui.items(), G.game.input); } };
  ui.draw = (g, r) => {
    const W = r.W, H = r.H, k = clamp(ui.t / .4, 0, 1), won = res.humanWon;
    px.blend(g, .45 * k, 'multiply', () => px.rect(g, 0, 0, W, H, '#102030'));
    const title = won === null ? (M.teamNames[res.winner] + ' win').toUpperCase() : won ? 'VICTORY!' : 'DEFEAT';
    E.font.title(g, title, W / 2, Math.round(H * .08), { scale: 3, align: 'center', colors: won === false ? ['#e8eef8', '#9fb0c8', '#6a7a98'] : ['#fff7d6', '#ffd36a', '#ff9e5e', '#ff5f7a'], depth: 3 });
    E.font.text(g, M.teamNames[0] + '  ' + res.score[0] + ' - ' + res.score[1] + '  ' + M.teamNames[1] + (M.rules.sets > 1 ? '   (sets ' + res.setsWon.join('-') + ')' : ''), W / 2, Math.round(H * .08) + 28, '#fff8e8', { align: 'center', shadow: '#000', outline: false });
    // three stat cards
    const mine = M.humanSide === null ? res.winner : M.humanSide, team = res.players.filter(p => p.side === mine);
    const cards = [['POINTS', team.reduce((s, p) => s + p.stats.points, 0)], ['KILLS', team.reduce((s, p) => s + p.stats.kills, 0)], ['LONGEST RALLY', res.longest + ' touches']];
    const cw = 92, cx0 = Math.round(W / 2 - (cw * 3 + 16) / 2), cy = Math.round(H * .27);
    cards.forEach(([l, v], i) => { const x = cx0 + i * (cw + 8), kk = clamp((ui.t - .2 - i * .12) / .3, 0, 1); G.ui.panel(g, x, cy + (1 - kk) * 20, cw, 38, { alpha: .92 * kk }); E.font.text(g, l, x + cw / 2, cy + 5 + (1 - kk) * 20, '#9fd3d6', { align: 'center', outline: false }); E.font.text(g, String(v), x + cw / 2, cy + 17 + (1 - kk) * 20, '#ffd36a', { align: 'center', scale: 2, shadow: '#000', outline: false }); });
    // the MVP
    const mvp = M.players.find(p => p.id === res.mvp.id), my = cy + 46;
    if (mvp) { G.ui.panel(g, Math.round(W / 2 - 90), my, 180, 34); G.portrait(g, mvp.rig, Math.round(W / 2 - 86), my + 3, 28, { frame: false }); E.font.text(g, 'MVP', Math.round(W / 2 - 52), my + 4, '#ffd36a', { outline: false }); E.font.text(g, mvp.name + ' · ' + mvp.stats.points + ' pts · ' + mvp.stats.perfects + ' perfect', Math.round(W / 2 - 52), my + 16, '#fff8e8', { outline: false }); }
    // vacation: prize money and the partner's hearts
    let yy = my + 42;
    if (o.prize !== undefined) { G.ui.panel(g, Math.round(W / 2 - 90), yy, 180, 20); G.ui.money(g, Math.round(W / 2 - 80), yy + 6, ui.money.shown); E.font.text(g, 'prize money', Math.round(W / 2 + 80), yy + 7, '#9fd3d6', { align: 'right', outline: false }); yy += 24; }
    if (o.partner && o.affBefore !== undefined) {
      const a = lerp(o.affBefore, o.affAfter, clamp((ui.t - 1) / .8, 0, 1));
      G.ui.panel(g, Math.round(W / 2 - 90), yy, 180, 24); G.portrait(g, G.portraitRig(o.partner), Math.round(W / 2 - 86), yy + 3, 18, { frame: false });
      G.ui.hearts(g, Math.round(W / 2 - 60), yy + 9, a); const d = o.affAfter - o.affBefore; E.font.text(g, (d >= 0 ? '+' : '') + d, Math.round(W / 2 + 80), yy + 8, d >= 0 ? '#9ff3a8' : '#ff9a8a', { align: 'right', outline: false });
    }
    if (ui.t > .8) nav.draw(g, ui.items());
    G.promptBar(g, r, [['confirm', 'Select'], ['move', 'Choose']], { y: Math.round(H * .95) - 4 + 0, bg: false, x: 8 });
  };
  return ui;
};
G.scenes = G.scenes || {};
G.scenes.match = {
  pausable: true, view: 'court', input: G.PRESETS.MATCH, camera: { zoom: [.85, 1.25] }, res: 'ps1',
  enter(d) {
    const cfg = (d && d.cfg) || G.quickMatchCfg();
    if (cfg.mode === 'attract') G.state = null;   // (an attract match plays on no save)
    G.M = new G.Match(cfg); G.M.mapRef = G.courtMap || (G.courtMap = G.makeCourtMap());
    G.useInput('MATCH'); G.applyLight(G.M.tod); G.game.weather = G.M.weather === 'rain' ? { kind: 'rain', amount: .5, wind: .2 } : null;
    G.music(cfg.music || (cfg.final ? 'house' : 'spike'), { restart: true }); G.ambience('court');
    G.game.cam.bounds = null; G.game.follow(null); G.M.camera(G.game); G.game.cam.snap = true; G.themeName = 'day';
    G.inMatchScene = true;
    if (G.devFlags) { G.M.perfectPlayer = !!G.devFlags.perfect; G.M.cpuControl = !!G.devFlags.cpu; G.M.debugOverlay = !!G.devFlags.overlay; G.M.slowmo = G.devFlags.slow || 1; }
  },
  exit() { G.inMatchScene = false; G.game.cam.frame(null); G.game.setZoom(1); G.game.weather = null; if (G.game.audio.tempo && G.SONGS[G.musicNow]) G.game.audio.tempo(G.SONGS[G.musicNow].bpm); },
  update(dt) {
    const M = G.M; if (!M) return;
    if (M.phase === 'results' && G.inputPreset !== 'MENU') G.useInput('MENU');
    M.update(dt); M.camera(G.game);
    // the rally drum layer comes in on long rallies
    if (G.musicNow === 'spike') G.game.audio.layer && G.game.audio.layer('rally', M.rallyTouches >= 5 && M.phase === 'rally' ? 1 : 0, .6);
    if (M.phase === 'results' && G.game.input.pressed('snap') && !G.hub && !G.attract) G.photo && G.photo.open('match');
    G.tickAmbience(dt);
  },
  draw(r) { if (G.M) G.M.draw(r); }
};
/** a quick exhibition config: one human with a CPU partner against two CPUs */
G.quickMatchCfg = (o = {}) => {
  const pick = o.cast || ['tess', 'lola', 'rin', 'mei'];
  return Object.assign({ mode: 'exhibition', pointsToWin: 7, tod: 'afternoon', seed: o.seed || 7,
    teams: [[{ cast: pick[0], ctl: { kind: 'human', input: G.game.input } }, { cast: pick[1], skill: .55 }], [{ cast: pick[2], skill: .5 }, { cast: pick[3], skill: .5 }]],
    onResults: (M, res) => G.resultsUI(M, res, { buttons: [['Rematch', () => G.startMatch(Object.assign({}, M.cfg, { seed: M.seed + 1 }))], ['Title', () => G.game.go('title')]] }) }, o.cfg || {});
};
