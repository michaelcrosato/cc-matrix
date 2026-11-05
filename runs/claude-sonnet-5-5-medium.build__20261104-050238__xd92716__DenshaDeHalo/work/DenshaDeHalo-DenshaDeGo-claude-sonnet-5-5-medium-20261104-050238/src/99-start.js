/* Boot: engine boot steps, then the title (or straight into a round when the AI Hub opened the page). Deep links for testing. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, game = DH.game, R = DH.route;
game.debug = {
  snapshot() {
    const d = DH.drive, run = d && d.run, sc = game.sceneName;
    const base = { scene: sc, errors: game.errors.length };
    if (!run) return base;
    const n = run.nextSignals(3).map(q => ({ id: q.sg.id, dist: Math.round(q.dist), aspect: q.aspect })), last = run.results[run.results.length - 1];
    return Object.assign(base, { stage: run.stage.id, s: Math.round(run.s), km: +((run.s - run.s0) / 1000).toFixed(2), v: +(run.v * 3.6).toFixed(1), notch: DH.notchName(run.lever), brakeEff: +run.brakeEff.toFixed(2), score: Math.round(run.score), halo: +run.halo.toFixed(1), clock: DH.fmtTime(run.clock),
      nextStop: run.leg ? { id: run.leg.station, dist: +run.distToMark().toFixed(1) } : null, lastJudgment: last ? last.grade : null, signals: n, limit: run.limitNow(), comfort: Math.round(run.comfort), doors: run.doors, phase: run.phase, finished: run.finished, failed: run.failed,
      ats: { ringing: run.atsRing, mode: run.atsMode }, camera: DH.VIEWS[d.view || 0], attract: { active: !!d.attract }, hub: { active: !!DH.hub.active, started: DH.hub.started, done: DH.hub.done }, devOpen: d.dev.open, calls: run.calls });
  },
  jump(stageId, o = {}) { game.go('drive', { stage: DH.stageById(stageId), opts: { difficulty: 'Normal' }, free: true }, { fade: 0 }); },
  auto(on) { if (DH.drive) DH.drive.auto = !!on; },
  setWeather(w) { const d = DH.drive; if (d) { d.run.weather = w; d.ui.weather = w; d.ui.rain = w === 'rain' || w === 'storm'; } },
  setTod(h) { const d = DH.drive; if (d) { d.run.tod = h * 3600 - d.run.t; d.run.clock = h * 3600; } },
  finishStage(perfect) { const d = DH.drive; if (d) { d.run.finished = true; } },
  setGrace() {}
};
game.stateHash = () => { const d = DH.drive; return d && d.run ? [Math.round(d.run.s * 100), Math.round(d.run.v * 100), Math.round(d.run.score)] : [0]; };
window.__dh = { game, DH, snapshot: () => game.debug.snapshot() };

(async () => {
  const hubInfo = await DH.hubInit().catch(() => null);
  const hash = (location.hash || '').slice(1);
  const boot = { title: 'Densha de Halo!', steps: [['Laying the Halo Line', () => { DH.route.length; }], ['Calibrating timetables', () => { for (const st of DH.STAGES) DH.calibrate(st, 'Normal', st.weather); }], ['Warming the signals', () => { }]] };
  let scene = 'title', data;
  if (hubInfo) { scene = 'drive'; data = { stage: DH.stageById('PR'), opts: { difficulty: 'Normal' }, hub: true }; }
  else if (/^stage=/.test(hash)) { const p = new URLSearchParams(hash); scene = 'drive'; data = { stage: DH.stageById(p.get('stage')), opts: { difficulty: 'Normal' }, free: true }; }
  else if (hash === 'attract') scene = 'attract'; else if (hash === 'halomap') { scene = 'halomap'; } else if (hash === 'about') scene = 'about'; else if (hash === 'help') scene = 'help'; else if (hash === 'log') scene = 'log'; else if (hash === 'freerun') scene = 'freerun';
  game.start({ scene, data, scenes: DH.scenes, boot });
  if (hubInfo && window.AIHub) setTimeout(() => AIHub.ready(), 200);
})();
})();
