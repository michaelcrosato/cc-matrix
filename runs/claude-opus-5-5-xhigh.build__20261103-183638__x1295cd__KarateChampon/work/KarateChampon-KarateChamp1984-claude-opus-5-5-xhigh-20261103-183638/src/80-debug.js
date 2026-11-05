/* =====================================================================================================================
 * game.debug: the game's handle for the tests and the engine's tools (check.mjs prints snapshot(); replay.mjs hashes
 * stateHash()). Helpers drive the game the way a designer would: warp, tuning, injected intents, an autopilot.
 * ===================================================================================================================== */
KC.debugHandle = game => {
  const D = {
    snapshot() {
      const sc = KC.scene, b = sc && sc.bout, scn = game.scene, st = scn && scn.debugState ? scn.debugState() : null;
      return {
        scene: game.sceneName, mode: sc && sc.mode || null, node: KC.Story.active ? KC.Story.node : null, rank: KC.Story.rank, score: KC.Story.score,
        settings: { difficulty: game.settings.difficulty, calls: game.settings.calls, glyphs: game.settings.glyphs },
        bout: b ? { phase: b.phase, clock: +b.clock.toFixed(2), points: b.points.slice(), roundWins: b.roundWins.slice(), round: b.round, lastCall: b.lastCall, lastPoint: b.lastPoint, winner: b.winner,
          fighters: b.f.map(f => ({ id: f.fid, x: +f.x.toFixed(1), z: +f.z.toFixed(1), state: f.st, tech: f.tech, phase: f.phase, facing: f.face })) } : null,
        bonus: game.sceneName === 'bonus' ? st : null, drill: game.sceneName === 'practice' ? st : null, attract: game.sceneName === 'attract' ? st : null,
        online: game.sceneName === 'session' ? st : null, lab: game.sceneName === 'lab' ? st : null,
        dev: { on: KC.DEV.on, tuneChanged: KC.tuneChanged(), panel: KC.Overlay.active }, idle: +KC.idle.toFixed(2), touchGate: KC.touchOnly(), errors: game.errors.length
      };
    },
    warp(to, data) { if (typeof to === 'number') { if (!KC.Story.active) KC.Story.newGame(); KC.Story.node = to; KC.Story.run(); } else game.go(to, data); },
    setTune(k, v) { KC.Dev.set(k, v); }, resetTune() { KC.Dev.resetAll(); }, exportTuning() { return KC.Dev.exportTuning(); },
    /** inject a control intent for a side this step (a test plays a technique: control(0, { posture: 'n', press: 'r' })) */
    control(side, ctl) { const sc = KC.scene, f = sc && sc.fighters && sc.fighters[side]; if (f) { f.control(ctl); } },
    /** put an autopilot (a CPU at level L) on a side, or take it off (false) */
    autopilot(side, L) { const sc = KC.scene; if (!sc || !sc.fighters) return; if (L === false) { sc.ai[side] = null; sc.readers[side] = new KC.Reader(game.input); return; } sc.readers[side] = null; sc.ai[side] = new KC.KarateAI({ fid: sc.fighters[side].fid, level: L, seed: 99 + side }); },
    forceCall(id) { const b = KC.scene && KC.scene.bout; if (b) b.call(id); },
    KC
  };
  game.stateHash = () => { const b = KC.scene && KC.scene.bout; return b ? JSON.stringify([b.f.map(f => [Math.round(f.x), Math.round(f.z), f.st, f.tech]), b.phase, Math.round(b.clock * 10), b.points]) : game.sceneName; };
  return D;
};
