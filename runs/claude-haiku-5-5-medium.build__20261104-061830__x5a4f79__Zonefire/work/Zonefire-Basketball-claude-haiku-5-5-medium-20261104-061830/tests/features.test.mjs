// Features the plan asks for and the other suites don't reach: a human's SUB at a break, the whole Blam Tour (four stops,
// played through the scenes), and the session overlay in a hub-flagged match, which must not pause the simulation.
import { loadGame, expect } from './helpers.mjs';
export const tests = [];
const T = (n, f) => tests.push([n, f]);

T('features.a human side gets the SUB screen at a break; confirm makes the change', () => {
  const g = loadGame({ seed: 81 });
  g.game.go('court', { court: 'skybox', humans: [{ slot: 0, input: g.game.input }], qLen: 60 }, { fade: 0 });
  g.game.advance(.2);
  const S = g.S;
  S.players[0].juice = .1;
  S.match.phase = 'break'; S.match.breakKind = 'quick'; S.match.breakT = 0; S.match.subsDone = false;
  g.game.advance(1 / 120 * 2);
  expect(S.match.subUI && S.match.subUI[0], 'the human side is offered the SUB screen');
  const before = S.players[0].id;
  g.game.input.tap('confirm'); g.game.advance(1 / 120 * 3);
  expect(S.players[0].id !== before, 'the tired player was replaced by the bench player');
  expect(S.players[0].human === true, 'the new player is still the human\'s');
});

T('features.the whole Blam Tour: four stops played through the scenes, ending in the unlocks', () => {
  const g = loadGame({ seed: 82 });
  g.game.advance(.3);
  g.S.progress.tour = { team: 'hightops', stop: 0, score: 0, won: [], beatsSeen: {}, rematch: false, quit: false, lost: null, lineup: [0, 0] };
  g.S.mode = 'tour';
  let rounds = 0;
  for (let stop = 0; stop < 4; stop++) {
    g.bb.tourStartStop(stop);
    for (let i = 0; i < 3000 && g.game.sceneName !== 'matchup'; i++) { g.game.input.tap('confirm'); g.game.advance(.25); }
    expect(g.game.sceneName === 'matchup', `stop ${stop + 1}: the matchup (scene ${g.game.sceneName})`);
    g.S.setup.qLen = 10;
    g.game.input.tap('confirm'); g.game.advance(.3);
    for (let t = 0; t < 4000 && !(g.S.match && g.S.match.over); t++) { if (g.S.match && !g.S.match.over) g.S.match.score[0] += 2; g.game.advance(1); }
    expect(g.S.match && g.S.match.over, `stop ${stop + 1}: the match ends`);
    for (let i = 0; i < 400 && !['results', 'loss'].includes(g.game.sceneName); i++) g.game.advance(.25);
    if (g.game.sceneName === 'results') { g.game.input.tap('confirm'); g.game.advance(.3); }
    rounds++;
    for (let i = 0; i < 2000 && !['tour', 'beat', 'credits', 'initials', 'hall', 'menu'].includes(g.game.sceneName) && !(g.S.progress.tour.won.includes(stop) && g.game.sceneName === 'tour'); i++) { g.game.input.tap('confirm'); g.game.advance(.25); }
    for (let i = 0; i < 2000 && g.game.sceneName === 'beat'; i++) { g.game.input.tap('confirm'); g.game.advance(.25); }
    expect(g.S.progress.tour.won.includes(stop), `stop ${stop + 1} is won (scene ${g.game.sceneName})`);
  }
  expect(g.S.progress.tour.won.length === 4, `won ${g.S.progress.tour.won}`);
  expect(g.S.progress.unlocked.bots && g.S.progress.unlocked.allstars, 'the BLAMBOTS and the ALL-STARS unlock after the final');
  expect(g.game.errors.length === 0, `errors: ${g.game.errors.map(e => e.message).slice(0, 2)}`);
});

T('features.the session overlay opens and closes in a hub round, and the match keeps running while it is open', () => {
  const g = loadGame({ seed: 83, hub: true });
  expect(g.bb.HUB === true, 'the hub flag is on in a session frame');
  g.ctx.AIHub.time = () => 5;   // the round has started (the countdown is over)
  g.S.net.role = 'host';
  g.game.go('court', { court: 'skybox', humans: [] }, { fade: 0 }); g.game.advance(.2);
  g.game.input.tap('cancel'); g.game.advance(.3);
  expect(g.S.sessionOverlay.open === true, 'Esc or Options opens the session overlay');
  const t0 = g.S.match.t;
  g.game.advance(2);
  expect(g.S.match.t > t0 + 1.5, `the simulation runs with the overlay open (${t0.toFixed(2)} → ${g.S.match.t.toFixed(2)})`);
  g.game.input.tap('cancel'); g.game.advance(.3);
  expect(g.S.sessionOverlay.open === false, 'cancel closes it');
});

T('features.the engine pause opens on Escape in a match, and the match freezes while it is open', () => {
  const g = loadGame({ seed: 84 });
  g.game.go('court', { court: 'skybox', humans: [{ slot: 0, input: g.game.input }] }, { fade: 0 });
  g.game.advance(.3);
  g.game.pause('player');
  expect(g.game.paused === true, 'the game pauses');
  const t0 = g.S.match.t;
  g.game.advance(2);
  expect(Math.abs(g.S.match.t - t0) < 1e-9, `the match is frozen (${t0} -> ${g.S.match.t})`);
  g.game.resume();
  expect(g.game.paused === false, 'resume lifts the pause');
});
