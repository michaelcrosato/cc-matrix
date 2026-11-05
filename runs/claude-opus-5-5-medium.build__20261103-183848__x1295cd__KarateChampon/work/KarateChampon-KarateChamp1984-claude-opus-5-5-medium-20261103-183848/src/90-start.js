/* ---- DEBUG: game.debug for tests and the engine's tools; game.stateHash for replays ---- */
game.debug = {
  snapshot() {
    const F = KC.F && game.sceneName === 'fight' ? KC.F : null, B = F && F.bout, S = KC.Story.s, sc = game.scene || {};
    return { scene: game.sceneName, mode: F ? F.mode : null, node: S ? S.node : null, rank: S ? S.rank : null, score: S ? S.score : null, settings: { difficulty: game.settings.difficulty, calls: game.settings.calls, glyphs: game.settings.glyphs },
      bout: B ? { phase: B.phase, clock: Math.round(B.clock * 100) / 100, points: B.points.slice(), roundWins: B.roundWins.slice(), round: B.round, lastCall: B.calls[B.calls.length - 1] || null, lastPoint: B.lastPoint, calls: B.calls.slice(), fighters: B.f.map(f => ({ id: f.id, x: Math.round(f.x * 10) / 10, z: Math.round(f.z * 10) / 10, state: f.st, tech: f.tech, phase: f.ph, facing: f.face, belt: f.belt })) } : null,
      bonus: game.sceneName === 'bonus' ? { kind: sc.B.kind, state: sc.B.state, points: sc.B.points, objectsLeft: sc.B.objs ? sc.B.objs.filter(o => o.st === 'wait' || o.st === 'tele' || o.st === 'fly').length : null, broken: sc.B.broken, charge: sc.B.charge, bull: sc.B.bull && sc.B.bull.st } : null,
      drill: game.sceneName === 'practice' ? { lesson: sc.d.lesson, index: sc.i, state: sc.state, result: sc.result, points: sc.points, misses: sc.misses, good: sc.good } : null,
      attract: { on: KC.Attract.on, step: KC.Attract.step, idle: KC.Attract.idle, visited: (KC.Attract.visited || []).slice() },
      online: KC.Net.info ? { role: KC.Net.role, me: KC.Net.me, state: KC.Net.state, queue: KC.Net.K && KC.Net.K.queue, wins: KC.Net.K && KC.Net.K.wins, standings: KC.Net.over && KC.Net.over.standings } : null,
      dev: { on: KC.Dev.active, enabled: DEV.enabled, tuneChanged: KC.tuneChanged() }, errors: game.errors.length };
  },
  warp(to, data) { KC.Attract.stop(); if (typeof to === 'number') { if (!KC.Story.s) KC.Story.newGame(); KC.Story.s.node = to; KC.Story.go(); } else game.go(to, data || {}, { fade: 0 }); },
  setTune(k, v) { TUNE[k] = v; }, resetTune() { KC.resetTune(); },
  control(side, ctrl) { const B = KC.F && KC.F.bout; if (B) B.ctrl[side] = typeof ctrl === 'function' ? ctrl : () => ctrl; },
  autopilot(side, level) { const B = KC.F && KC.F.bout; if (!B) return; if (level === false) { B.ctrl[side] = human(side); return; } const ai = new KarateAI({ id: B.f[side].id, level, seed: 77 + side }); B.ctrl[side] = (f, foe, b) => ai.control(f, foe, b); KC.F.ai[side] = ai; },
  exportTuning() { return JSON.stringify(TUNE); }, forceCall(id) { const B = KC.F && KC.F.bout; if (B) B.say(id); }
};
game.stateHash = () => { const B = KC.F && KC.F.bout; return B ? JSON.stringify([B.f.map(f => [Math.round(f.x), Math.round(f.z), f.st, f.tech]), B.phase, Math.round(B.clock * 10), B.points]) : game.sceneName; };

/* ---- every scene: the dev panel over it (play scenes keep running under it), the attract mode's banner and exit ---- */
const LIVE = new Set(['fight', 'bonus', 'practice', 'lab']);
for (const k in scenes) {
  const s = scenes[k], up = s.update, dr = s.draw;
  s.update = function (dt) {
    game.input.touchEnabled = false;   // controller or keyboard only: no touch buttons or stick ever show
    if (KC._raw && !KC.Attract.on && k !== 'attract') { KC._raw = false; KC.Attract.poke(); }
    if (KC.Attract.on && k !== 'attract' && KC.Attract.exitCheck()) return;
    if (!KC.Attract.on && DEV.enabled && !SESSION && !KC.Dev.active && (game.input.pressed('dev') || (game.input.down('l3') && game.input.pressed('r3')))) { KC.Dev.open(); return; }
    if (KC.Dev.active) { KC.Dev.update(dt); if (!LIVE.has(k)) return; }
    up.call(this, dt);
  };
  s.draw = function (r) { dr.call(this, r); KC.Dev.draw(r); KC.Attract.banner(r); };
}

/* ---- BOOT: heavy setup in steps, then the first scene (or a deep link) ---- */
const sfxDefs = () => { for (const k in KC.SFX) game.audio.define(k, KC.SFX[k]); };
const steps = [
  ['Sweeping the dojo floor', () => KC.validateData()],
  ['Folding the gi', () => { for (const f of KC.DATA.roster) KC.portrait(f.id); KC.portrait('genkotsu'); }],
  ['Simmering the broth', sfxDefs],
  ['Tuning the referee\'s whistle', () => { KC.Voice.plan('HAJIME!', 'genkotsu', 'begin'); }],
  ['Raking the gravel', () => { KC.Dev.load(); if (typeof location !== 'undefined' && /[?&]dev=1/.test(location.search || '')) DEV.enabled = true; }]
];
const link = () => {
  const h = (typeof location !== 'undefined' && location.hash || '').slice(1).split('/');
  if (SESSION) return ['session', {}];
  switch (h[0]) {
    case 'title': return ['title', {}]; case 'menu': return ['title', { menu: true }];
    case 'road': KC.Story.newGame(); KC.Story.s.node = +h[1] || 0; return null;
    case 'fight': return ['fight', { mode: 'versus', stage: h[1] || 'dojo', white: 'taro', red: h[2] || 'ebi', cpu: [false, true], cpuLevel: 5, seed: 3 }];
    case 'versus': return ['versus', {}]; case 'kachinuki': return null;
    case 'bonus': return ['bonus', { kind: h[1] || 'boards' }]; case 'practice': return ['practice', { lesson: h[1] || 'I' }];
    case 'lab': return ['lab', { tech: h[1] || 'frontKick' }]; case 'attract': return ['attract', { loop: 1 }]; case 'about': return ['about', {}];
    case 'ending': KC.Story.newGame(); KC.Story.s.node = KC.DATA.ladder.length - 1; return null; case 'credits': return ['credits', {}];
    case 'records': return ['records', {}]; case 'movelist': return ['movelist', { back: 'title' }]; case 'freespar': return ['fight', { mode: 'freeSpar', stage: 'dojo', white: 'taro', red: 'negi' }];
    case 'stage': return ['stageSelect', {}];
  }
  return ['title', {}];
};
scenes.boot = SC({ enter() { const l = link(); if (l) game.go(l[0], l[1], { fade: 0 }); else KC.Story.go(); }, update() {}, draw(r) { r.sky(['#05040a', '#05040a']); } });
game.start({ scenes, scene: 'boot', boot: { title: 'KARATE CHAMPON', steps } });
