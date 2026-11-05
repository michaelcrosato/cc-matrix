// the brief's and the plan's features that the other suites don't drive: the running setting, the story's Continue and
// New Game, the Quick Match unlocks and the career stats, the About pages, and the no-audio-files rule. Each is played or
// read through the game's own screens and settings.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadGame, root } from '../lib.mjs';
import { lessonBot } from './play.mjs';

const DEFAULT_PROFILE = { v: 1, chapter: 1, stars: [0, 0, 0], best: {}, unlocks: [0, 1], stats: { sixes: 0, fastest: 0 } };

// the Nets lesson 1 (batting, shots only) played by the bot, with the running setting as given: returns the runs called
function lessonRuns(setting) {
  const g = loadGame({ storage: true });
  g.game.advance(0.3);
  g.game.settings.running = setting;
  g.game.debug.lesson(1);
  const bot = lessonBot(1, g.I);
  let s = g.game.debug.live(), now = 0, steps = 0;
  while (steps < 120 * 60 * 6 && s.scene !== 'lessonresult') {
    bot(s, now);
    g.game.advance(1 / 120); steps++; now += 1 / 120;
    s = g.game.debug.live();
  }
  return g.snap().coverage.running || 0;
}

export async function run({ check }) {
  // Running: Manual waits for the batter's call; Auto calls the run once the ball is on the ground
  check('the Running setting is Manual by default', (() => { const g = loadGame(); g.game.advance(0.2); return g.game.settings.running === 'Manual'; })(), 'default');
  const manual = lessonRuns('Manual'), auto = lessonRuns('Auto');
  check('Running Manual: a bot that never calls a run runs nothing', manual === 0, 'runs ' + manual);
  check('Running Auto: the runs are called without a button press', auto > 0, 'runs ' + auto);

  // Continue and New Game: a saved story offers both, and New Game asks before it clears the campaign
  const c = loadGame({ storage: true });
  c.game.advance(0.3);
  c.game.debug.setProfile({ v: 1, started: true, chapter: 2, stars: [3, 0, 0], best: {}, unlocks: [0, 1, 3], stats: { sixes: 4, fastest: 140 } });
  c.game.debug.openStory(); c.game.advance(0.3);
  check('a saved story opens Continue or New Game', c.snap().scene === 'storychoice', c.snap().scene);
  c.I.tap('down'); c.game.advance(0.1); c.I.tap('confirm'); c.game.advance(0.3);
  check('New Game asks before it overwrites the story', c.snap().scene === 'storynew', c.snap().scene);
  c.I.tap('confirm'); c.game.advance(0.3);
  const after = c.game.debug.profile();
  check('starting again clears the chapters and stars', after.chapter === 1 && after.stars.every(s => s === 0), JSON.stringify(after.stars) + ' chapter ' + after.chapter);
  check('starting again keeps the unlocks and the career stats', after.unlocks.includes(3) && after.stats.sixes === 4 && after.stats.fastest === 140, JSON.stringify(after.stats));

  // Quick Match: only unlocked sides are offered as the opponent; a win unlocks the other side
  const u = loadGame({ storage: true });
  u.game.advance(0.3);
  u.game.debug.setProfile(Object.assign({}, DEFAULT_PROFILE));
  u.game.go('setup', { mode: 'quick' }); u.game.advance(1.0);
  check('the Quick Match opponent is an unlocked side', u.game.debug.unlockedTeams().includes(u.game.debug.setupAway()), 'away ' + u.game.debug.setupAway() + ' unlocked ' + u.game.debug.unlockedTeams());
  u.game.debug.recordMatch({ stats: { sixes: 2 }, fastestKmh: 131, result: { winner: 0 }, cfg: { teams: [0, 3] } });
  const won = u.game.debug.profile();
  check('a Quick Match win unlocks the other side', won.unlocks.includes(3), 'unlocks ' + won.unlocks);
  check('the career records sixes and the fastest ball', won.stats.sixes === 2 && won.stats.fastest === 131, JSON.stringify(won.stats));

  // a played match adds its own fastest ball to the career when it ends
  const m = loadGame({ storage: true });
  m.game.advance(0.3);
  m.game.debug.startMatch({ teams: [0, 1], ground: 'green', overs: 1, wickets: 5, kerf: false, batFirst: 0, seed: 21, humanSides: [], autoBat: true, autoBowl: true, cheatPerfect: true }, {});
  for (let k = 0; k < 120 * 120 * 5 && m.snap().scene !== 'results'; k++) m.game.advance(1 / 120);
  check('a played match ends in its results', m.snap().scene === 'results', m.snap().scene);
  check('a played match records its fastest ball', m.game.debug.profile().stats.fastest >= 60, 'fastest ' + m.game.debug.profile().stats.fastest);

  // About and Credits: the four feedback pages the brief names are in the game
  const titles = (() => { const g = loadGame(); g.game.advance(0.2); return g.game.debug.aboutTitles(); })();
  const need = ['SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK'];
  check('About and Credits holds the four feedback pages', need.every(t => titles.includes(t)), titles.join(', '));

  // button symbols: PlayStation shapes by default, or the Xbox letters (A B X Y) from the Settings
  const gl = loadGame();
  gl.game.advance(0.2);
  const ps = gl.game.debug.glyph('shot');
  gl.game.settings.buttons = 'Xbox (A B X Y)';
  const xb = gl.game.debug.glyph('special');
  check('the PlayStation symbols are the default', !ps.xbox && ps.ps === 'cross', JSON.stringify(ps));
  check('the Xbox setting shows letters (A B X Y)', xb.xbox && xb.letter === 'Y' && gl.game.debug.glyph('shot').letter === 'A', JSON.stringify(xb));

  // mouse aim: the pointer on the pitch sets the batter's aim, and moving it changes the aim
  const mo = loadGame();
  mo.game.advance(0.3);
  mo.game.debug.startMatch({ teams: [0, 1], ground: 'green', overs: 2, wickets: 5, kerf: false, batFirst: 0, seed: 7, humanSides: [0] }, {});
  mo.game.advance(0.5);
  mo.game.input.feed('move', 70, 120); mo.game.advance(0.1);
  const aimLeft = mo.game.debug.aim();
  mo.game.input.feed('move', 250, 120); mo.game.advance(0.1);
  const aimRight = mo.game.debug.aim();
  check('the mouse aims the batter on the pitch', aimLeft !== null && aimRight !== null && aimLeft !== aimRight, 'left ' + aimLeft + ' right ' + aimRight + ' ground ' + JSON.stringify(mo.game.debug.pointerGround()));

  // no audio files: every sound and voice is written in code
  const html = readFileSync(path.join(root, '..', 'CricketKerfuffle-Cricket-claude-haiku-5-5-medium-20261104-064807.html'), 'utf8');
  check('the bundle references no audio files', !/\.(mp3|ogg|wav|m4a|flac|aac|opus)["'`)\s]/i.test(html) && !/data:audio/i.test(html), 'checked ' + html.length + ' bytes');
}
