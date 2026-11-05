// drills, attract, dev, saves and local multiplayer: the game's scenes driven as a player would.
import { fresh, assert, eq } from './lib/h.mjs';
const drill = (L, i) => { const g = L.game; g.debug.drill(i); L.advance(.2); L.TT.Drills.autoplay = true; return L.TT.Drills; };
export const cases = {
  'every drill can be completed by its auto script'() {
    const L = fresh(), failed = [];
    L.TT.DRILLS.forEach((d, i) => {
      const D = drill(L, i); let t = 0;
      while (!D.done() && t < 90) { L.advance(.25); t += .25; }
      if (!D.done()) failed.push(d.id + ' ' + JSON.stringify(D.prog) + ' rep ' + D.rep);
    });
    assert(!failed.length, 'not completed: ' + failed.join('; '));
    L.noErrors('in drills');
  },
  'a failed drill resets (LEGS: walking it in is not diving)'() {
    const L = fresh(), D = drill(L, 0); D.autoplay = false; const TT = L.TT, m = TT.MS.m, p = D.me();
    p.x = m.oppLine(0) + 30; p.y = 384; const r0 = D.rep; L.advance(5);
    assert(D.rep > r0, 'reset after the walk-in'); assert(!D.done(), 'not done');
  },
  'SHOW ME: the coach plays the drill once'() {
    const L = fresh(), D = drill(L, 0); D.autoplay = false; L.game.input.tap('tri'); L.advance(.2); assert(D.showing, 'showing'); L.advance(12); assert(D.shown, 'the coach did it'); assert(!D.showing && !D.done(), 'then it is the player\'s turn'); eq(JSON.stringify(D.prog), '{}', 'progress is the player\'s own');
  },
  'attract: 10 s idle on the title starts it; the showcase fires; any input returns to the title'() {
    const L = fresh(), g = L.game, TT = L.TT; L.advance(10.6);
    eq(L.snap().scene, 'match', 'demo started'); assert(L.snap().attract, 'attract');
    for (let i = 0; i < 300 && TT.Attract.active && TT.Attract.i < TT.Attract.steps.length; i++) L.advance(1);
    const log = TT.Attract.log.join(','); for (const s of ['kickoff', 'step', 'dummy', 'monster', 'ruck', 'knockOn', 'touch', 'powerup', 'hazard', 'thunder', 'cheap', 'fire', 'drop']) assert(log.includes(s), 'step ' + s + ' (' + log + ')');
    const f = TT.Attract.fired; for (const e of ['kickoff', 'sidestep', 'fend', 'pass', 'monsterHit', 'replayStart', 'jackal', 'knockOn', 'scrum', 'lineout', 'powerupTake', 'hazard', 'superStart', 'try', 'setKick', 'card', 'onFire', 'dropGoal']) assert(f[e] > 0, 'never fired: ' + e);
    g.input.press('KeyK'); L.advance(.1); g.input.release('KeyK'); L.advance(1);
    eq(L.snap().scene, 'title', 'back to the title'); L.noErrors('in attract');
  },
  'attract: a mouse move or a pad button exits too, and picks nothing'() {
    const L = fresh(), g = L.game; g.go('menu', {}, { fade: 0 }); L.advance(10.6); eq(L.snap().scene, 'match', 'from the menu');
    L.advance(2); g.input.feed('move', 10, 10); L.advance(.05); g.input.feed('move', 60, 80); L.advance(.6); eq(L.snap().scene, 'title', 'a mouse move');
    L.advance(10.6); eq(L.snap().scene, 'match', 'again'); L.advance(2); g.input.press('Pad0'); L.advance(.1); g.input.release('Pad0'); L.advance(.6); eq(L.snap().scene, 'title', 'a pad button: title, not a menu pick');
  },
  'dev mode: from the pause menu; sliders change the game; reset; cheats; events'() {
    const L = fresh(), g = L.game, TT = L.TT; g.go('match', { exhibition: true, seed: 2 }, { fade: 0 }); L.advance(8);
    const items = g.o.menu.items(); const dm = items.find(i => i[0] === 'Dev mode'); assert(dm, 'DEV MODE in the pause menu'); dm[1](); assert(TT.dev.open && TT.dev.frozen, 'open, frozen');
    const t = TT.MS.m.t; L.advance(1); eq(TT.MS.m.t, t, 'frozen: the match waits');
    const p = TT.MS.m.players[4], s0 = TT.MS.m.speedOf(p); TT.TUNE.set('runSpeed', 160); assert(TT.MS.m.speedOf(p) > s0 * 1.5, 'run speed slider changes the speed');
    TT.dev.tab = 0; TT.dev.i = 0; TT.dev.fire(TT.dev.rows()[0]); TT.dev.fire(TT.dev.rows()[0]); eq(TT.TUNE.v.runSpeed, 100, 'reset all to defaults');
    TT.dev.tab = 1; const rows = TT.dev.rows(); for (const r of rows) { TT.dev.fire(r); assert(TT.cheats[r.k], 'cheat ' + r.k); TT.dev.fire(r); }
    TT.dev.tab = 2; for (const r of TT.dev.rows()) { if (r.k === 'fulltime') continue; TT.dev.fire(r); TT.dev.frozen = false; L.advance(.3); TT.dev.frozen = true; }
    TT.dev.close(); L.advance(1); L.noErrors('dev events');
  },
  'saves: the cup autosaves; CONTINUE resumes at the right round; a bad save falls back'() {
    const L = fresh(), g = L.game, TT = L.TT, C = TT.Cup; L.TT.noStore = false;
    C.start(); assert(C.saved(), 'saved at the start'); eq(C.saved().round, 0, 'round one');
    assert(C.matchDone({ winner: 0, score: [24, 5] }), 'a win'); eq(C.saved().round, 1, 'saved after the win');
    C.s = null; C.continue(); L.advance(.5); eq(L.snap().scene, 'cup', 'continue to the hub'); eq(C.s.round, 1, 'the right round');
    g.saves.save('auto', { data: { nonsense: true }, place: 'MEGA CUP', level: 9 }); C.s = null; C.continue(); eq(C.s.round, 0, 'a bad save falls back to a fresh cup');
  },
  'local: four players join (pads and the keyboard\'s right half); a 2v2 match, each seat driving its own man'() {
    const L = fresh(), g = L.game, TT = L.TT;
    g.go('join', { mode: 'exhibition' }, { fade: 0 }); L.advance(.3);
    g.addPlayer({ keys: 'right' }); g.addPlayer({ pad: 1 }); g.addPlayer({ pad: 2 }); L.advance(.2);
    eq(g.players.length, 4, 'four players');
    const seats = g.players.map((q, i) => ({ kind: 'local', input: q, team: i % 2, label: 'P' + (i + 1), color: '#ffffff' }));
    g.go('match', { home: 'mud', away: 'gul', venue: 'docks', seats, skipIntro: true, seed: 4 }, { fade: 0 }); L.advance(.5);
    const m = TT.MS.m; m.force('give', { id: 3 }); L.advance(.2);
    const pos = m.seats.map(s => [s.pid, m.players[s.pid].x]);
    eq(new Set(pos.map(p => p[0])).size, 4, 'four different men');
    for (const q of g.players) q.hold('right'); L.advance(.8); for (const q of g.players) q.hold('right', false);
    const moved = m.seats.filter((s, i) => m.players[s.pid].x > pos[i][1] + 10 || s.pid !== pos[i][0]).length;
    assert(moved >= 3, 'each seat drives its man (' + moved + ')'); L.noErrors('in 2v2');
  }
};
