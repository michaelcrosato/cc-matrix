// Attract mode (section 13): 10 s idle on the title, menu, Case Files or lobby starts a looping reel of the real scenes with a cheating bot. Any input exits.
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), { px } = E;
const IDLE_SCENES = ['title', 'menu', 'casefiles', 'lobby'];
const cheat = { lock: true, steady: true, noTut: true, freeze: true };
const Attract = G.Attract = {
  idle: 0, active: false, i: 0, segT: 0, lastMouse: 0, loops: 0, IDLE: 10,
  reel() { return [
    { t: 11, go: g => g.go('story', { node: 'c1_open', auto: .55, ribbon: true, onDone: () => {} }, { fade: 0 }) },
    { t: 15, go: g => Attract.op(g, 'glasshouse', 0) },
    { t: 13, go: g => Attract.op(g, 'crane9', 0) },
    { t: 17, go: g => Attract.op(g, 'crane9', 2, { crash: true }) },
    { t: 18, go: g => Attract.op(g, 'bedside', 1) },
    { t: 20, go: g => Attract.op(g, 'forcenine', 0, { look: true }) },
    { t: 24, go: g => g.go('op', Attract.rounds(), { fade: 0 }) },
    { t: 20, go: g => Attract.op(g, 'lastnote', 2) },
    { t: 7, go: g => { const S = G.Op.create('glasshouse', { seed: 5, dev: Object.assign({}, cheat) }); S.score = 2600; S.clock = 150; S.bestFlow = 14; S.rank = 'S'; S.stats.vSum = 70; S.stats.vN = 1; S.stats.tb = 12; g.go('results', { S, ribbon: true, autoT: 99, onDone: () => {} }, { fade: 0 }); } },
    { t: 8, go: g => g.go('title', { demo: true }, { fade: 0 }) },
  ]; },
  op(g, caseId, phase, o = {}) { const dev = Object.assign({}, cheat); if (o.crash) delete dev.lock; g.go('op', { attract: true, caseId, phase, seed: 3 + phase, difficulty: 'resident', dev, botSkill: { speed: 330, gifts: true, iv: o.crash ? 20 : 0 } }, { fade: 0 }); },
  rounds() { return { attract: true, caseId: 'grandrounds', seed: 11, difficulty: 'resident', dev: Object.assign({}, cheat), mode: 'rounds', seats: 4, botSkill: { speed: 300, gifts: true, iv: 0 } }; },
  install(game) {
    game.hook('input', dt => {
      const I = game.input, moved = I.mouse.t !== Attract.lastMouse; Attract.lastMouse = I.mouse.t;
      const stick = Math.hypot(...(I.padMove || [0, 0])) > .25 || (I.padAim && Math.hypot(...I.padAim) > .25);
      const any = I.anyPressed() || I.held.size > 0 || !!I.clicked() || moved || stick;
      if (Attract.active) {
        if (any) { Attract.stop(game); return; }
        Attract.segT -= dt; if (Attract.segT <= 0) Attract.next(game);
        return;
      }
      if (any || game.paused || G.inSession) { Attract.idle = 0; return; }
      if (!IDLE_SCENES.includes(game.sceneName)) { Attract.idle = 0; return; }
      Attract.idle += dt; if (Attract.idle >= Attract.IDLE) Attract.start(game);
    });
  },
  start(game) { Attract.active = true; Attract.i = -1; Attract.loops = 0; Attract.idle = 0; if (game.saves) game.saves.canSave = false; G.Flow.origin = 'story'; Attract.next(game); },
  next(game) { const R = Attract.reel(); Attract.i++; if (Attract.i >= R.length) { Attract.i = 0; Attract.loops++; } const s = R[Attract.i]; Attract.segT = s.t; s.go(game); },
  stop(game) { Attract.active = false; Attract.idle = 0; G.Sfx.stopLoops(); G.Sfx.breath(false); game.input.consumeAll(); game.timeScale = 1; game.go('title', {}, { fade: 0 }); game.input.consumeAll(); },
};
})();
