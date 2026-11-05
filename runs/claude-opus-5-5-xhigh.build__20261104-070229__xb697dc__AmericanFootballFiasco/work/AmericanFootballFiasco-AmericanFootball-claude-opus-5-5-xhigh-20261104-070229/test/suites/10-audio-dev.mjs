import { load } from '../lib/context.mjs';
export default async ok => {
  const { game, FF, warnings } = load();
  const a = FF.voice.plan('TOUCH! DOWN! FIASCOS!', FF.VOICES.chet), b = FF.voice.plan('TOUCH! DOWN! FIASCOS!', FF.VOICES.chet);
  ok('voice plans are deterministic', JSON.stringify(a) === JSON.stringify(b) && a.length > 3);
  for (const id of Object.keys(FF.VOICES)) ok('the ' + id + ' voice plans syllables', FF.voice.plan('Hello there, Chet!', FF.VOICES[id]).length > 0);
  ok('a question rises at its end', FF.voice.plan('Is it?', FF.VOICES.lou).slice(-1)[0].f > FF.voice.plan('It is.', FF.VOICES.lou).slice(-1)[0].f);
  game.settings.set('commentary', 'off'); FF.talk.cur = null; FF.talk.say('chet', 'TEST', 9); ok('Commentary Off says nothing', FF.talk.cur === null); game.settings.set('commentary', 'on');
  for (const name of Object.keys(FF.SONGS)) ok('song ' + name + ' parses into tracks', FF.SONGS[name].tracks.length > 0);
  for (const s of Object.values(FF.data.stadiums)) ok('the stadium song ' + s.music + ' exists', !!FF.SONGS[s.music]);
  // the Dev mode: sliders change the sim live and reset
  game.settings.set('dev.speedBase', 120); ok('a tuning slider changes FF.T live', FF.T.speedBase === 120);
  FF.resetTuning(); ok('Reset all restores the defaults', FF.T.speedBase === FF.T_DEFAULTS.speedBase);
  const r = FF.dev.playLab('slants', 'cover2', 3); ok('the Play Lab returns stats', r.n === 3 && typeof r.avgYards === 'number', JSON.stringify(r));
  game.go('match', { spec: { mode: 'exhibition', home: 'owls', away: 'yetis', humans: { 0: [0], 1: [] } } }, { fade: 0 }); game.advance(.3);
  game.settings.set('devc.godMode', true); ok('a cheat toggle reaches the match', FF.match.cheats.godMode === true); game.settings.set('devc.godMode', false);
  FF.dev.open(); ok('Dev mode opens its screen', game.shell.screen === 'dev', game.shell.screen); FF.dev.tuning(); ok('the tuning page opens', game.shell.screen === 'dev-tune'); FF.dev.cheats(); FF.dev.jump(); FF.dev.lab(); FF.dev.overlaysPage(); FF.dev.tools(); ok('every Dev page opens', game.shell.screen === 'dev-tools');
  { let err = null; try { game.shell.back(); } catch (e) { err = e; } ok('Back on a Dev page goes to the page under it', !err && game.shell.screen === 'dev-over', err ? err.message : game.shell.screen); }
  game.shell.hide(); game.resume();
  FF.dev.situation({ possession: 'home', los: 99, down: 4, toGo: 1 }); game.advance(.5); ok('JUMP TO a situation starts it', FF.match && FF.match.down === 4 && FF.match.toGo === 1, FF.match && FF.match.down + '&' + FF.match.toGo);
  ok('no unknown-sound warnings', !warnings.some(w => /unknown sound/.test(w)), warnings.filter(w => /unknown/.test(w)).join(' | '));
  ok('no errors', !game.errors.length, game.errors.map(e => e.message).join(' | '));
};
