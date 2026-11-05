/* ---- THE START: the match scene, the boot steps (assets, views, the bus wiring), dev mode over every scene, and the
 * deep links the tools use. ---- */
K.restart = () => { const m = Play.m; if (!m) return; game.resume && game.resume(); game.paused = false; const cfg = Object.assign({}, Play.cfg, { seed: (Play.cfg.seed || 1) + 1 }); game.go(game.sceneName === 'match' ? 'match' : game.sceneName, { cfg, hooks: K.lastHooks }); };
K.matchInfo = () => { K.infoOpen = !K.infoOpen; game.paused = false; };
/* ---- the match scene ---- */
scenes.match = {
  pausable: true, camera: { zoom: false }, view: 'threequarter',
  enter(d) { d = d || {}; K.lastHooks = d.hooks || null; Play.begin(d.cfg || quickConfig(), d.hooks || {}); K.infoOpen = false; game.input.consumeAll(); if (K.openDevOnEnter) { K.openDevOnEnter = false; game.after(.4, () => K.dev.open()); } },
  exit() { game.weather = null; game.timeScale = 1; Audio.layer('fire', 0); },
  update(dt) { if (game.timeScale !== T('timeScale') && !game._slowFx) {} Play.update(dt); K.idle && K.idle.reset(); },
  draw(r) { Play.draw(r); if (K.infoOpen) drawMatchInfo(r); }
};
function quickConfig(o = {}) {
  return Object.assign({ mode: 'quick', teams: ['ker', 'mud'], ground: 'green', overs: K.settings('defOvers'), wickets: K.settings('defWickets'), difficulty: K.settings('difficulty'), kerfuffleRules: K.settings('kerfuffleRules'),
    humans: { 0: [game.input] }, toss: true, battingFirst: 0 }, o);
}
K.quickConfig = quickConfig;
function drawMatchInfo(r) {
  const m = Play.m; if (!m) return;
  r.overlay(g => {
    UI.panel(g, r.W / 2 - 150, 30, 300, 150);
    UI.text(g, 'MATCH INFO', r.W / 2, 38, UI.gold, { align: 'center' });
    const rows = [m.teams[0].name + ' v ' + m.teams[1].name, m.ground.name + ' - ' + m.timeOfDay + ' - ' + m.weather, 'Innings ' + (m.innNo + 1) + ': ' + m.inn.runs + '/' + m.inn.wkts + ' (' + m.oversText() + ' of ' + fmtOvers(m.inn.overs) + ')', m.inn.target ? 'Target ' + m.inn.target : 'First innings', 'Kerfuffle rules: ' + (m.kerfuffle ? 'on' : 'off') + ' - Reviews left: ' + m.reviews.join(' / '), 'Field: ' + FIELDS[m.fieldPreset].name + ' - ' + (m.overRound === 'over' ? 'over' : 'round') + ' the wicket', 'Difficulty: ' + Tuning.difficulty];
    rows.forEach((s, i) => UI.text(g, s, r.W / 2 - 140, 54 + i * 14, '#ffffff'));
    UI.text(g, 'PAUSE MENU: MATCH INFO TO CLOSE', r.W / 2, 160, '#a8a090', { align: 'center' });
  });
}
/* ---- boot ---- */
Tuning.init(); Profile.load();
E.addAssets(window.ASSETS.KERFUFFLE);
Views.make();
wireMatchEvents(); HUD.wire();
bus.on('*', (d, t) => MatchView.onEvent(t, d));
wrapScenes();
game.start({ scenes, scene: HUB ? 'hubcard' : 'title',
  boot: { title: 'CRICKET KERFUFFLE', version: '1.0', messages: LOADING, steps: [
    ['Rolling the pitch', () => { Audio.init(); Commentary.init(); }],
    ['Whitening the creases', () => { for (const id of GROUND_IDS) Ground.get(id); }],
    ['Brewing the tea', () => { K.afterBoot && K.afterBoot(); }]
  ] } });
// deep links for the tools: #match #nets #about #dev #story #attract #showdown #results
const deep = (location.hash || '').slice(1);
K.deepLink = !HUB && deep ? deep : null;
K.runDeep = d => {
  if (d === 'match') game.go('match', { cfg: quickConfig({ toss: false }) }, { fade: 0 });
  else if (d.startsWith('match:')) { const [, g2, t2, side] = d.split(':'); game.go('match', { cfg: quickConfig({ toss: false, ground: g2 || 'green', teams: ['ker', t2 || 'mud'], battingFirst: side === 'bowl' ? 1 : 0 }) }, { fade: 0 }); }
  else if (d === 'bowl') game.go('match', { cfg: quickConfig({ toss: false, battingFirst: 1 }) }, { fade: 0 });
  else if (d === 'dev') { K.openDevOnEnter = true; game.go('match', { cfg: quickConfig({ toss: false }) }, { fade: 0 }); }
  else if (d.startsWith('attract')) game.go('attract', { segment: +(d.split(':')[1] || 0) }, { fade: 0 });
  else if (d.startsWith('chapter:')) game.debug.startChapter(+d.split(':')[1], d.split(':')[2] || 'match');
  else if (scenes[d]) game.go(d, {}, { fade: 0 });
};
window.__game = game;
