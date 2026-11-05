// The scripted whole-game playthrough: title -> menu -> STORY -> the prologue -> the tryouts (nine drills by their bots)
// -> chapters 2-5 with the Fiascos on autopilot (the CPU brains drive them; god mode and sure hands for their side; 20 s
// quarters) -> the halftime choices -> the outros -> the ending -> the credits -> the menu. Then a loss and a retry, and a
// two-player local exhibition to its results and a rematch.
import { load } from '../lib/context.mjs';
export default async ok => {
  const c = load(); const { game, FF, E } = c;
  const I = game.input, nan = [];
  const watch = () => { const m = FF.match; if (m && ['match', 'drill'].includes(game.sceneName)) for (const a of m.on) if (!isFinite(a.x) || !isFinite(a.y)) nan.push(game.sceneName + ' ' + a.name); };
  game.advance(1); I.tap('start'); game.advance(1);
  ok('start leaves the title for the menu', game.sceneName === 'menu', game.sceneName);
  I.tap('confirm'); game.advance(.5);
  ok('STORY starts the prologue', game.sceneName === 'cutscene', game.sceneName);
  const scenes = new Set(), chapters = new Set(); let t = 0, halftimes = 0, patched = null, lastScene = '';
  while (t < 3600 && game.sceneName !== 'credits') {
    const sc = game.sceneName; scenes.add(sc);
    if (sc !== lastScene) { lastScene = sc; }
    if (sc === 'cutscene') { I.tap('confirm'); game.advance(.25); t += .25; continue; }
    if (sc === 'drill') { FF.drill.botOn = true; }
    if (sc === 'story') { I.tap('confirm'); game.advance(.5); t += .5; continue; }
    if (sc === 'match') {
      const m = FF.match;
      if (patched !== m) { patched = m; FF.autopilot = 2; m.cheatSide = 1; m.cheats = Object.assign(m.cheats, { godMode: true, forceCatch: true, forceINT: true, forceFumble: true, noTackleCPU: true }); m.qLen = 20; m.clock = Math.min(m.clock, 20); m.fastCalls = true; chapters.add(FF.story.chapter && FF.story.chapter.id); }
      if (m.phase === 'HALFTIME') { halftimes++; for (let k = 0; k < 40 && FF.match.phase === 'HALFTIME'; k++) { I.tap('confirm'); game.advance(.2); } }
      if (m.over) { game.advance(3); I.tap('confirm'); game.advance(.5); t += 3.5; continue; }
    }
    if (sc === 'fiasco') { I.tap('confirm'); game.advance(.5); t += .5; continue; }
    game.advance(.25); t += .25; watch();
    if (game.errors.length) break;
  }
  FF.autopilot = false;
  const st = FF.story.state();
  ok('the playthrough reaches the credits', game.sceneName === 'credits', game.sceneName + ' after ' + Math.round(t) + ' s; scenes ' + [...scenes].join(','));
  ok('every chapter is done', FF.data.story.chapters.every(ch => st.done[ch.id]), JSON.stringify(st.done));
  ok('stars for every chapter', FF.data.story.chapters.every(ch => st.stars[ch.id] >= 1), JSON.stringify(st.stars));
  ok('the rewards are in the collection', ['HOT_SAUCE', 'SUPER_FOOT', 'MEGA_HIT', 'ROCKET_CLEATS', 'GLUE_GLOVES', 'MASCOT_MAYHEM'].every(k => st.collection.includes(k)), st.collection.join(','));
  ok('chapters 2-5 were played as games', ['ch2', 'ch3', 'ch4', 'ch5'].every(k => chapters.has(k)), [...chapters].join(','));
  ok('halftime choices in chapters 2 and 5', halftimes >= 2, halftimes);
  const save = game.saves.latest(); ok('an autosave with the cup won', !!save && save.data && save.data.story && save.data.story.done.ch5, JSON.stringify(save && save.data && save.data.story && save.data.story.done));
  ok('Big Heads unlocked', E.store.get('ff:bigHeads', false) === true);
  ok('records were written', Object.keys(FF.records.get()).length > 0, JSON.stringify(FF.records.get()));
  ok('no NaN positions', !nan.length, nan.slice(0, 3).join(','));
  ok('no errors in the playthrough', !game.errors.length, game.errors.slice(0, 3).map(e => e.message + ' ' + String(e.stack).split('\n')[1]).join(' | '));
  // the credits end on the story board; back to the menu
  game.advance(2); for (let k = 0; k < 8; k++) { I.hold('cancel'); game.advance(.25); } I.hold('cancel', false); game.advance(1);
  ok('holding back skips the credits', game.sceneName !== 'credits', game.sceneName);
  // a loss: THAT'S A FIASCO, then RETRY
  FF.story.play('ch4'); let k2 = 0; while (game.sceneName !== 'match' && k2++ < 400) { I.tap('confirm'); game.advance(.25); }
  const m4 = FF.match; ok('chapter 4 starts', game.sceneName === 'match' && m4.mode === 'story', game.sceneName);
  game.advance(.5); m4.finishNow(0); game.advance(4); I.tap('confirm'); game.advance(1.5);
  ok('a loss shows THAT\'S A FIASCO', game.sceneName === 'fiasco', game.sceneName);
  I.tap('confirm'); game.advance(1);
  ok('RETRY plays the chapter again', game.sceneName === 'match' && FF.match !== m4, game.sceneName);
  // two players on one keyboard: an exhibition to its results and a rematch
  game.go('menu', null, { fade: 0 }); game.advance(.3);
  game.go('setup', null, { fade: 0 }); game.advance(.3);
  game.addPlayer({ keys: 'right' }); game.advance(.1);
  FF.startExhibition && (() => { const S = game.players; S.forEach((p, i) => {}); })();
  const spec = { mode: 'exhibition', home: 'fiascos', away: 'owls', humans: { 0: [0], 1: [1] }, quarterLength: 20, start: 'kickoff' };
  game.go('match', { spec }, { fade: 0 }); game.advance(.3);
  const mx = FF.match; FF.autopilot = true; mx.fastCalls = true; mx.qLen = 15; mx.clock = 15;
  let k3 = 0; while (!mx.over && k3++ < 4000) game.advance(.25);
  game.advance(4); FF.autopilot = false;
  ok('a 2-player exhibition reaches its results', mx.over && game.sceneName === 'match', mx.phase + ' ' + mx.quarter + ' ' + FF.u.mmss(mx.clock));
  I.tap('right'); game.advance(.2); I.tap('confirm'); game.advance(.6);
  ok('REMATCH starts a new game', game.sceneName === 'match' && FF.match !== mx, game.sceneName);
  ok('no errors after', !game.errors.length, game.errors.slice(0, 3).map(e => e.message).join(' | '));
};
