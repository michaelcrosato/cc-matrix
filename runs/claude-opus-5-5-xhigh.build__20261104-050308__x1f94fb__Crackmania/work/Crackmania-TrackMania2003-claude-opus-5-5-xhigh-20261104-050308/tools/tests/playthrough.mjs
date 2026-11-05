// covers: the whole game (PLAN §9.3 playthrough): a fresh profile, the welcome, all 15 races driven by the bot as the
// player through the real menus and buttons, medals, coppers and unlocks, the 6 puzzles solved in the editor, the three
// gauntlets, a 12-block track built and validated, saved, reloaded and shared, a car painted, a replay saved and
// reopened, hot seat and split screen, golds everywhere, the ending and the credits
import { ctx } from '../../src/ctx.js';
import { ENV_TRACKS, PUZZLES } from '../../src/data/tracks.js';
import { puzzleTrack } from '../../src/modes/puzzle.js';
import { TYPES } from '../../src/track/blocks.js';
import { compile, Track } from '../../src/track/track.js';
import * as C from '../../src/modes/campaign.js';
export default async T => {
  const { game, api } = await T.game(), I = game.input, P = ctx.profile, M = api.menu;
  P.reset(); game.errors.length = 0; ctx.attract.disabled = true; game.go('title', null, { fade: 0 }); game.advance(.3);
  const skipTalk = () => { for (let i = 0; i < 20 && ctx.talk.open; i++) { api.tap('cancel'); game.advance(.05); } };
  /** press arrows until the focus is on the item with this id (as a player would) */
  const focusTo = id => { game.advance(1 / 30); for (let n = 0; n < 16; n++) { const q = M.focus.cur; if (q && q.id === id) return true; const k = M.focus.items.findIndex(x => x.id === id); if (k < 0) return false; const t = M.focus.items[k], c = M.focus.cur; const dx = t.x - c.x, dy = t.y - c.y; api.tap(Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? 'down' : 'up') : (dx > 0 ? 'right' : 'left')); } return M.focus.cur && M.focus.cur.id === id; };
  const page = () => M.stack[M.stack.length - 1].page;
  const trace = m => { if (process.env.TRACE) console.error('[trace] ' + m + ' scene=' + game.sceneName + ' page=' + page() + ' t=' + game.real.toFixed(1)); };
  /** back to the main menu page: from any scene */
  const toMain = () => { for (let i = 0; i < 8 && game.sceneName !== 'menu'; i++) { if (game.sceneName === 'title') { game.go('menu', null, { fade: 0 }); game.advance(.1); continue; } if (!api.until(() => game.sceneName === 'menu', 1.5)) { game.go('menu', null, { fade: 0 }); game.advance(.1); } } skipTalk(); for (let i = 0; i < 8 && M.stack.length > 1; i++) { api.tap('cancel'); skipTalk(); } if (game.sceneName !== 'menu') { game.go('menu', null, { fade: 0 }); game.advance(.1); } game.advance(.1); };
  // the welcome
  api.tap('confirm'); T.check('the welcome beat plays', api.until(() => ctx.talk.open, 2)); skipTalk(); T.check('into the menu', api.until(() => game.sceneName === 'menu', 3));
  // all fifteen races, environment by environment
  let races = 0;
  for (const env of ['dustbowl', 'hedgerow', 'frostpeak']) {
    T.check(env + ' open when reached', C.envOpen(env));
    for (const id of ENV_TRACKS[env]) {
      if (game.sceneName !== 'menu') { game.go('menu', null, { fade: 0 }); game.advance(.1); }
      skipTalk();
      if (page() === 'tracks' && M.stack[M.stack.length - 1].env !== env) api.tap('cancel');
      if (page() === 'main') { focusTo('RACE'); api.tap('confirm'); }
      if (page() === 'env') { focusTo(env); api.tap('confirm'); }
      T.eq(id + ': on its track page', page(), 'tracks');
      trace('race ' + id); T.check(id + ' open', C.trackOpen(id)); focusTo(id); api.tap('confirm');
      if (!T.check(id + ' starts', api.until(() => game.sceneName === 'race', 3), game.sceneName)) continue;
      T.check(id + ' finished by the bot', api.driveToFinish(120)); T.check(id + ' results', api.until(() => game.sceneName === 'results', 6)); races++;
      T.check(id + ' gold or better', P.medal(id) >= 3, P.medal(id));
      game.advance(.5); api.tap('cancel'); api.until(() => game.sceneName === 'menu', 3); game.advance(.2); skipTalk();
      if (game.sceneName === 'credits') break;
    }
  }
  T.eq('15 races', races, 15);
  const { REWARD, ENV_MUL } = await import('../../src/save/profile.js'); let want = 300; for (const [e, L] of Object.entries(ENV_TRACKS)) for (const id of L) for (let m = 1; m <= P.medal(id); m++) want += Math.round(REWARD.race[m] * ENV_MUL[e]);
  T.eq('coppers from races, once per tier', P.coppers, want);
  T.check('golds everywhere: the ending', P.p.ended); T.check('the credits roll', api.until(() => game.sceneName === 'credits', 8) || P.p.ended, game.sceneName);
  game.go('menu', null, { fade: 0 }); game.advance(.2); skipTalk();
  // the six puzzles, solved through the editor
  for (const p of PUZZLES) {
    toMain(); trace('puzzle ' + p.id);
    focusTo('PUZZLE'); api.tap('confirm'); T.eq(p.id + ' puzzle page', page(), 'puzzles'); focusTo(p.id); api.tap('confirm');
    api.until(() => game.sceneName === 'editor', 3); skipTalk();
    for (const b of puzzleTrack(p, true).blocks) if (!b.fixed && !TYPES[b.type].gap) api.editor.place(b.type, b.cx, b.cy, b.L, b.rot);
    api.tap('test'); T.check(p.id + ' validation drive', api.until(() => game.sceneName === 'race', 3) && api.driveToFinish(60) && api.until(() => game.sceneName === 'results', 6));
    T.check(p.id + ' solved with gold or better', P.medal(p.id) >= 3, P.medal(p.id));
    game.advance(.5); api.tap('cancel'); toMain();
  }
  // the three gauntlets
  for (const env of ['dustbowl', 'hedgerow', 'frostpeak']) {
    toMain(); trace('gauntlet ' + env); focusTo('SURVIVAL'); api.tap('confirm'); trace('survival page ' + (M.focus.cur && M.focus.cur.id)); const fo = focusTo(env); trace('focused ' + fo + ' ' + (M.focus.cur && M.focus.cur.id)); api.tap('confirm'); trace('picked');
    let rounds = 0; for (let k = 0; k < 6; k++) { if (!api.until(() => { if (ctx.talk.open && ctx.talk.modal) ctx.talk.skip(); return game.sceneName === 'race'; }, 8)) { trace('no race: ' + (ctx.session && ctx.session.kind) + ' talk ' + ctx.talk.open); break; } api.driveToFinish(120); if (!api.until(() => game.sceneName === 'card', 8)) break; game.advance(1); if (ctx.talk.open && ctx.talk.modal) ctx.talk.skip(); rounds++; const over = !ctx.gauntlet.alive || ctx.gauntlet.round === 4; api.tap('confirm'); if (over) { api.until(() => game.sceneName === 'menu', 3); break; } }
    T.check(env + ' gauntlet cleared by the author bot', P.p.survival[env] && P.p.survival[env].cleared, JSON.stringify(P.p.survival[env]) + ' rounds ' + rounds);
    toMain();
  }
  // build a 12-block track: buy the packs it needs, validate it, save, reload, share
  trace('build');
  toMain();
  focusTo('BUILD'); api.tap('confirm'); focusTo('slot0'); api.tap('confirm'); focusTo('dustbowl'); api.tap('confirm');
  api.until(() => game.sceneName === 'editor', 3); skipTalk();
  const c0 = P.coppers, t12 = compile({ id: 'B', env: 'dustbowl', start: [4, 10], program: 'ST S3 R2 S CP S L2 S2 FN' });
  for (const b of t12.blocks) T.eq('editor: place ' + b.type, api.editor.place(b.type, b.cx, b.cy, b.L, b.rot), null);
  T.eq('blocks cost coppers', c0 - P.coppers, t12.blocks.reduce((a, b) => a + TYPES[b.type].cost, 0));
  api.tap('test'); T.check('validated by driving', api.until(() => game.sceneName === 'race', 3) && api.driveToFinish(60) && api.until(() => game.sceneName === 'results', 6));
  game.advance(.5); api.tap('cancel'); api.until(() => game.sceneName === 'editor' || game.sceneName === 'menu', 3);
  if (game.sceneName !== 'editor') { game.go('editor', { resume: true }, { fade: 0 }); game.advance(.1); }
  api.editor.st.name = 'MY FIRST'; api.editor.save(0); T.check('saved', P.p.slots[0] && P.p.slots[0].author > 0);
  const code = api.editor.share(); T.check('reloads', api.editor.open(0) && api.editor.st.track.blocks.length === 12); T.eq('share code round trip', Track.fromCode(code).blocks.length, 12);
  game.go('menu', null, { fade: 0 }); game.advance(.2); skipTalk();
  // paint a car in the garage: a body colour and a bought pattern
  trace('garage');
  toMain();
  focusTo('GARAGE'); api.tap('confirm'); api.until(() => game.sceneName === 'garage', 2);
  const body0 = P.paint('coyote').body; I.tap('down'); game.advance(1 / 30); I.tap('right'); game.advance(1 / 30); T.check('body colour changed', P.paint('coyote').body !== body0);
  P.paint('coyote').pattern = 4; const g = api.ctx.game.scenes.garage; game.advance(.1); const cp = P.coppers; const k = ['car', 'body', 'accent', 'patternColor', 'helmet', 'pattern']; for (let i = 0; i < 4; i++) { I.tap('down'); game.advance(1 / 30); } api.tap('confirm'); T.check('a pattern bought', P.p.patterns[4] && P.coppers === cp - 100, P.coppers + ' vs ' + cp);
  api.tap('cancel'); api.until(() => game.sceneName === 'menu', 2);
  // a replay: race D1, save the replay from the results, reopen it
  trace('replay');
  toMain();
  focusTo('RACE'); api.tap('confirm'); focusTo('dustbowl'); api.tap('confirm'); focusTo('D1'); api.tap('confirm'); api.until(() => game.sceneName === 'race', 3); api.driveToFinish(60); api.until(() => game.sceneName === 'results', 6); game.advance(.5);
  trace('replay: results? ' + game.sceneName + ' focus ' + (api.ctx.game.scenes.results && 1));
  const n0 = P.p.replays.length; I.tap('right'); game.advance(1 / 30); I.tap('right'); game.advance(1 / 30); I.tap('right'); game.advance(1 / 30); const RS = (await import('../../src/scenes/results.js')).resultsState; trace('focus ' + (RS.focus.cur && RS.focus.cur.id) + ' saved ' + RS.saved + ' t ' + RS.t.toFixed(2)); api.tap('confirm'); trace('after: saved ' + RS.saved + ' n ' + P.p.replays.length);
  T.eq('replay saved', P.p.replays.length, n0 + 1);
  api.tap('cancel'); toMain();
  focusTo('REPLAYS'); api.tap('confirm'); api.tap('confirm'); T.check('replay reopens', api.until(() => game.sceneName === 'replay', 3)); game.advance(2); api.tap('cancel'); api.until(() => game.sceneName === 'menu', 3); toMain();
  // hot seat (2 players, 1 attempt, 1 track) and split screen (2 players)
  focusTo('MULTIPLAYER'); api.tap('confirm'); focusTo('HOT SEAT'); api.tap('confirm');
  const H = M.hs; H.n = 2; H.attempts = 1; H.cup = 1; H.picks = ['D1']; focusTo('go'); api.tap('confirm');
  let turns = 0; for (let i = 0; i < 4; i++) { if (!api.until(() => game.sceneName === 'card', 5)) break; game.advance(1); api.tap('confirm'); if (!api.until(() => game.sceneName === 'race', 3)) break; api.driveToFinish(60); turns++; }
  T.eq('hot seat turns', turns, 2); api.until(() => game.sceneName === 'card', 5); game.advance(1); api.tap('confirm'); api.until(() => game.sceneName === 'card', 3); game.advance(1.2); api.tap('confirm'); api.until(() => game.sceneName === 'menu', 3);
  toMain(); focusTo('MULTIPLAYER'); api.tap('confirm'); focusTo('SPLIT SCREEN'); api.tap('confirm'); game.advance(.1);
  if (game.players.length < 2) game.addPlayer({ keys: 'right' });
  focusTo('go'); api.tap('confirm'); T.check('split race starts', api.until(() => game.sceneName === 'race' && ctx.session.kind === 'split', 3));
  for (const Pl of ctx.session.players) { const { Plan, Bot } = await import('../../src/race/bot.js'); Pl.bot = new Bot(new Plan(ctx.session.course, Pl.model, 1)); }
  T.check('both split players finish', api.until(() => ctx.session.players.every(q => q.run.finished), 90)); api.until(() => game.sceneName === 'card', 5); game.advance(1); api.tap('confirm'); api.until(() => game.sceneName === 'menu', 3);
  while (game.players.length > 1) game.removePlayer(game.players.length);
  // the final profile
  T.check('every race at gold or better', Object.values(ENV_TRACKS).flat().every(id => P.medal(id) >= 3));
  T.check('every puzzle solved', PUZZLES.every(p => P.medal(p.id) >= 3)); T.check('every gauntlet cleared', ['dustbowl', 'hedgerow', 'frostpeak'].every(e => P.p.survival[e] && P.p.survival[e].cleared));
  T.check('a saved track, a replay', P.p.slots[0] && P.p.replays.length >= 1);
  T.eq('no engine errors in the whole game', game.errors.length, 0);
  ctx.attract.disabled = false; P.reset();
};
