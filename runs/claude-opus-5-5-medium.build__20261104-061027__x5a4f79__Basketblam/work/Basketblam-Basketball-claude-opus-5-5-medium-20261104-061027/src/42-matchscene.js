/* THE MATCH SCENE: runs a match (any mode), the camera, captions, the crowd, then hands over to the results. In a
 * break a human team may swap its CPU teammate with the bench (△ / F). */
const SCENES = {};
let lastMatchCfg = null;
SCENES.match = {
  isMatch: true, pausable: !HUB, camera: { zoom: [.8, 1.4] }, input: KEYS,
  enter(cfg) {
    cfg = cfg || lastMatchCfg || exhibitionDefault(); lastMatchCfg = cfg;
    S.scene = 'match';
    game.setView(setting('camera') === 'high' ? HIGH : 'broadcast');
    startMatch(cfg);
    const court = get('court', cfg.court); game.weather = court.weather ? Object.assign({}, court.weather) : null;
    if (S.mode !== 'hub' || !S.net || S.net.role !== 'server') music(court.music, { restart: true });
    FX.focusX = XM; FX.zoom = 1; FX.banner = null; FX.applied = 0; game.setZoom(1);
    if (cfg.onEnter) cfg.onEnter();
  },
  exit() { game.timeScale = 1; game.weather = null; Crowd.update(1, false); layer('nova', 0); game.setZoom(1); FX.applied = 1; },
  update(dt) {
    const m = S.match; if (!m) return;
    if (S.devOpen) devAutopilot(true);
    subsUI(dt);
    matchStep(dt);
    cameraStep(dt); Caption.update(dt); hoopStep(dt, m.wind ? m.wind.x / Math.max(1, tune('windStrength')) : 0); Crowd.update(dt, true);
    if (m.cfg.onStep) m.cfg.onStep(dt);
    if (m.phase === 'over' && m.overT > 3 && !m.handed) { m.handed = true; if (m.cfg.onEnd) m.cfg.onEnd(m); else go('results', { cfg: m.cfg }); }
  },
  draw(r) {
    drawMatchWorld(r);
    r.overlay(g => { drawHud(g, r); if (S.mode === 'attract') drawAttractOverlay(g, r); if (S.devOpen || DEV.overlays.any) drawDev(g, r); if (S.match.cfg.overlay) S.match.cfg.overlay(g, r); });
  }
};
/** in a break, a human may swap the CPU teammate with a rested bench player */
function subsUI() {
  const m = S.match; S.subUI = null;
  if (!m || m.phase !== 'break' || S.mode === 'hub' || S.mode === 'attract' || S.mode === 'camp') return;
  const hum = S.players.find(p => p.human); if (!hum) return;
  const t = hum.team, cpuMate = S.players.find(p => p.team === t && !p.human), bench = S.bench[t];
  if (!cpuMate || !bench.length) return;
  S.subUI = { list: true, input: hum.human, text: '{oop} SUB ' + cpuMate.name + ' FOR ' + get('player', bench[0].id).name + '   {confirm} CONTINUE' };
  if (hum.human.pressed('oop')) { substitute(cpuMate, bench[0].id); A.sfx('confirm'); m.breakT = Math.max(m.breakT, 3); }
  if (hum.human.pressed('confirm')) m.breakT = Math.min(m.breakT, .2);
}
function restartMatch() { if (lastMatchCfg) go('match', lastMatchCfg); }
function exhibitionDefault() {
  return { court: 'skybox', mode: 'exhibition', teams: [{ id: 'hightops' }, { id: 'breakers' }], humans: [{ input: game.input, slot: 0 }], quarter: setting('quarter') || 120, difficulty: setting('difficulty'), powerups: setting('powerups'), twists: setting('twists') };
}
