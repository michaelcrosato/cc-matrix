/* BATZOOKA BASEBALL: AI Hub session (protocol v1, mode "parallel"). In a session the game opens straight into a
   Batzooka Derby round: every player faces the same pitches (AIHub.rng('pitches')), and reports the derby score. */
BZ.hub = { info: null, started: false, reported: false };
BZ.scenes.hub = {
  view: 'threequarter', input: BZ.PRESET, res: 'ps1', camera: false,
  enter() {
    this.state = 'connecting'; this.t = 0; BZ.stage.start('moon', 12); game.setZoom(.8); game.lights.enabled = false;
    const H = window.AIHub;
    if (!H || !H.active) { game.go('title'); return; }
    H.connect({ mode: 'parallel', seats: [1, 4] }).then(info => {
      if (!info) { this.state = 'solo'; game.go('title'); return; }
      BZ.hub.info = info; this.state = 'ready';
      const me = info.players.find(p => p.id === info.me);
      this.go(me ? me.name : 'YOU');
      H.on('start', () => { BZ.hub.started = true; });
      H.on('time-up', () => { BZ.hub.report(true); });
      H.on('end', () => { BZ.hub.ended = true; try { game.audio.mute(); } catch (e) { /* silent */ } });
      H.on('leave', () => { });
      H.ready();
    }).catch(e => { H.fail && H.fail('AI Hub connect failed: ' + e); });
  },
  go(name) {
    const info = BZ.hub.info;
    game.go('match', { derby: true, hub: true, park: 'moon', players: [name], outs: 7, seed: info.seed >>> 0 || 5, pitchSeq: window.AIHub.rng('pitches'), humans: [true, false], innings: 99, hubLimit: 75 });
  },
  update(dt) { this.t += dt; BZ.stage.update(dt); BZ.stage.camera(dt); },
  draw(r) { BZ.stage.draw(r); r.overlay(g => { frameBox(g, r.W / 2 - 100, r.H / 2 - 20, 200, 40, ''); E.font.text(g, 'CONNECTING TO THE HUB...', r.W / 2, r.H / 2 - 4, '#ffffff', { align: 'center', outline: false, shadow: '#000' }); }); }
};
BZ.hub.report = (timeUp) => {
  const H = window.AIHub, M = BZ.M; if (!H || !H.active || BZ.hub.reported || !M || !M.derby) return;
  BZ.hub.reported = true;
  const D = M.derby, p = D.players[0];
  H.result({ score: p.score, stats: { 'Home runs': p.hr, 'Longest (ft)': p.best, 'Outs used': p.outs }, awards: p.best >= 450 ? [{ title: 'Moonshot', detail: p.best + ' ft' }] : [] });
};
/* the derby inside a session: waits for the hub's clock, reports progress each second and the result at the end */
BZ.hubTick = (scene, dt) => {
  const H = window.AIHub, M = scene.M; if (!H || !H.active || !M || !M.derby) return;
  const D = M.derby;
  if (!scene.hubInit) {
    scene.hubInit = true; M.hold = true; D.hub = true; D.clockLimit = scene.data.hubLimit || 75; scene.hubWait = true; M.sides[0].ctl = game.players[0];
  }
  const tm = H.time();
  if (scene.hubWait) {
    if (BZ.hub.started && tm >= 0) { scene.hubWait = false; M.hold = false; M.clock = 0; }
    else { M.hold = true; return 'wait'; }
  }
  const now = performance.now();   // wall clock: the hub reads about one report a second, however slowly this copy runs
  if (!scene.hubLast || now - scene.hubLast > 900) { scene.hubLast = now; H.progress({ score: D.players[0].score, label: D.players[0].hr + ' HR' }); }
  if (M.over || (D.clockLimit && M.clock >= D.clockLimit)) { if (!M.over) { M.over = true; M.phase = 'over'; } BZ.hub.report(); }
  // the hub's own Create + Options chord belongs to the hub
  try { const pads = navigator.getGamepads ? navigator.getGamepads() : []; for (const p of pads) if (p && p.buttons[8] && p.buttons[8].pressed) game.input.suppress('pause'); } catch (e) { /* no pads */ }
};
