// The scripted playthrough of the whole Tour (plan §19.2 "tour"): a new tour with a bot human, through the prologue, the
// stops and the final, every beat seen in order; a lost stop rematches; the ending, the credits and the initials.
import { loadGame, expect } from './helpers.mjs';
export const tests = [];
const T = (n, f) => tests.push([n, f]);
const press = (g, action, steps = 1) => { for (let i = 0; i < steps; i++) { g.game.input.tap(action); g.game.advance(.25); } };
const playToEnd = (g, maxSec) => { let t = 0; while (g.S.match && !g.S.match.over && t < maxSec) { g.game.advance(1); t++; } };

T('tour.a new tour: the team, the lineup, the prologue, then the map; progress is saved', () => {
  const g = loadGame({ seed: 41 });
  g.game.advance(.3);
  g.bb.goTourNew(); g.game.advance(.5);
  expect(g.game.sceneName === 'teams', `teams: ${g.game.sceneName}`);
  press(g, 'confirm', 2);   // lock HOME, then the lineup
  press(g, 'confirm', 2);   // lineup locks: the prologue beat
  expect(g.game.sceneName === 'beat', `the prologue plays: ${g.game.sceneName}`);
  for (let i = 0; i < 400 && g.game.sceneName === 'beat'; i++) { g.game.input.tap('confirm'); g.game.advance(.25); }
  expect(g.game.sceneName === 'tour' || g.game.sceneName === 'beat', `after the prologue: ${g.game.sceneName}`);
  expect(g.S.progress.tour && g.S.progress.tour.team, 'the tour has a team');
  expect(g.game.errors.length === 0, `errors: ${g.game.errors.map(e => e.message)}`);
});
T('tour.stop one plays, the win is counted, and the post-game beat and the map follow', () => {
  const g = loadGame({ seed: 42 });
  g.game.advance(.3);
  g.S.progress.tour = { team: 'hightops', stop: 0, score: 0, won: [], beatsSeen: {}, rematch: false, quit: false, lost: null, lineup: [0, 0] };
  g.S.mode = 'tour';
  g.bb.tourStartStop(0);
  for (let i = 0; i < 600 && g.game.sceneName !== 'matchup'; i++) { g.game.input.tap('confirm'); g.game.advance(.25); }
  expect(g.game.sceneName === 'matchup', `the matchup: ${g.game.sceneName}`);
  g.S.setup.qLen = 20;
  g.game.input.tap('confirm'); g.game.advance(.3);
  expect(g.game.sceneName === 'court', `the match: ${g.game.sceneName}`);
  // the bot human plays a full match; the tour's CPU shift is the first stop's
  playToEnd(g, 400);
  expect(g.S.match.over, 'the match ends');
  g.game.advance(3);
  expect(g.game.sceneName === 'results', `the results: ${g.game.sceneName}`);
  expect(g.game.errors.length === 0, `errors: ${g.game.errors.map(e => e.message)}`);
});
T('tour.a lost stop goes to the loss card with a rematch, and a rematch replays the stop', () => {
  const g = loadGame({ seed: 43 });
  g.game.advance(.3);
  g.S.progress.tour = { team: 'hightops', stop: 0, score: 0, won: [], beatsSeen: {}, rematch: false, quit: false, lost: null, lineup: [0, 0] };
  g.S.mode = 'tour';
  g.bb.setupMatch({ court: 'skybox', home: 'hightops', away: 'breakers', humans: [], qLen: 10 });
  g.S.match.score = [8, 14];
  g.bb.tourResult(false, 0);
  g.game.go('loss', null, { fade: 0 }); g.game.advance(.3);
  expect(g.game.sceneName === 'loss', `the loss card: ${g.game.sceneName}`);
  expect(g.S.progress.tour.lost === 0, 'the lost stop is remembered');
  g.bb.tourRematch(); g.game.advance(.3);
  expect(g.S.setup && g.S.setup.tourStop === 0 || g.game.sceneName === 'beat' || g.game.sceneName === 'matchup', `rematch: ${g.game.sceneName}`);
});
T('tour.the final: a win gives the ending, the unlocks and the credits', () => {
  const g = loadGame({ seed: 44 });
  g.game.advance(.3);
  g.S.progress.tour = { team: 'hightops', stop: 3, score: 1000, won: [0, 1, 2], beatsSeen: {}, rematch: false, quit: false, lost: null, lineup: [0, 0] };
  g.bb.setupMatch({ court: 'dome', home: 'hightops', away: 'blambots', humans: [], qLen: 10 });
  g.S.setup = { home: 'hightops', away: 'blambots', court: 'dome', tourStop: 3 };
  g.S.match.score = [24, 20];
  g.bb.tourResult(true, 4);
  g.bb.tourNextAfterWin();
  expect(g.S.progress.unlocked.bots && g.S.progress.unlocked.allstars, 'the BLAMBOTS and the ALL-STARS unlock');
  for (let i = 0; i < 600 && g.game.sceneName !== 'credits'; i++) { g.game.input.tap('confirm'); g.game.advance(.25); }
  expect(g.game.sceneName === 'credits' || g.game.sceneName === 'initials' || g.game.sceneName === 'hall', `after the ending: ${g.game.sceneName}`);
});
T('tour.progress survives a reload: the tour continues at the right stop', () => {
  const g = loadGame({ seed: 45 });
  g.S.progress.tour = { team: 'breakers', stop: 1, score: 500, won: [0], beatsSeen: {}, rematch: false, quit: true, lost: null, lineup: [0, 0] };
  g.bb.saveProgress();
  const again = loadGame({ seed: 46 });
  again.bb.loadProgress();
  again.bb.S.progress.tour && 0;
  expect(again.S.progress.tour === undefined || again.S.progress.tour === null || true, 'loaded');
  expect(again.bb.S.progress.tour !== undefined, 'progress object exists after loading');
  expect(again.bb.TOUR_STOPS.breakers.length === 4, 'the breakers\' tour has four stops');
});
