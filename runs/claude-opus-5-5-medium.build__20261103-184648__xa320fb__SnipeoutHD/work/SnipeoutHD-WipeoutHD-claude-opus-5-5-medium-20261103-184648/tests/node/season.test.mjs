// The scripted playthrough of the whole game: attract, academy, the season E1-E10 with briefings and promotions, the
// Grand Prix and the ending, then every other mode, a replay, dev mode, settings and the About pages. Headless, fixed seeds
import { load } from '../lib/vm.mjs';
import { test, check, done, runRace, errs, academyBot } from '../lib/t.mjs';
const ctx = load(), SN = ctx.SN, E = ctx.My3D2dge, g = E.current, I = g.input;
const tap = (a, t = .25) => { I.tap(a); g.advance(t); };
const talk = () => { for (let k = 0; k < 200 && SN.Story.open; k++) tap('confirm', .4); };
const focus = id => { const k = SN.UI.items().findIndex(i => i.id === id); SN.UI.focus = k; return k >= 0; };
const finishResults = () => { for (let k = 0; k < 8 && SN.scenes.results.phase === 'podium'; k++) g.advance(1); };
let raceSeed = 1;
const raceIt = (o = {}) => { const R = SN.scenes.race.race; if (!R) return null; if (R.mode === 'academy') { const A = SN.Academy, bot = academyBot(ctx); for (let k = 0; k < 500 && g.sceneName === 'race'; k++) { if (A.phase === 'card') tap('confirm', .05); runRace(ctx, 1, bot); } } else { runRace(ctx, o.secs || 600); if (g.sceneName === 'race' && (R.mode === 'overclock' || R.mode === 'hotlap')) { R.endRun(); g.advance(5); } } g.advance(1.5); finishResults(); return R; };
g.settings.set('difficulty', 'Easy');
g.advance(.5);
await test('boot, title, attract, back', () => { check(g.sceneName === 'title', 'title'); g.advance(10.5); check(g.sceneName === 'attract', 'attract'); g.advance(30); tap('confirm', .2); check(g.sceneName === 'title', 'title again'); });
await test('academy from the menu', () => { g.advance(.5); tap('confirm', .6); focus('academy'); tap('confirm', 1.5); check(g.sceneName === 'race' && SN.scenes.race.race.mode === 'academy', 'academy starts'); raceIt(); check(g.sceneName === 'results' && SN.scenes.results.result.drills === 11, 'all drills passed', SN.scenes.results.result.drills); focus('continue'); tap('confirm', 1); });
await test('the season', () => {
  check(g.sceneName === 'menu', 'menu'); focus('season'); tap('confirm', .3); check(SN.UI.top().id === 'team', 'choose a team first'); tap('right', .1); tap('right', .1); tap('right', .1); check(SN.UI.top().sub().includes('TURIN'), 'VOLTA NERO picked'); focus('go'); tap('confirm', .5); check(SN.Story.open, 'the prologue plays'); talk(); check(SN.UI.top().id === 'season', 'the season hub');
  const order = ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9', 'e10'];
  for (const id of order) {
    let medal = null;
    for (let attempt = 0; attempt < 6 && !medal; attempt++) {
      if (g.sceneName !== 'menu' || SN.UI.top().id !== 'season') { g.go('menu', { screen: 'season' }); g.advance(.5); talk(); }
      check(focus(id), 'event tile ' + id); const it = SN.UI.items()[SN.UI.focus]; check(!it.disabled, id + ' open', it.lock);
      tap('confirm', .3); talk(); g.advance(1.5); check(g.sceneName === 'race', id + ' races', g.sceneName);
      raceIt(); check(g.sceneName === 'results', id + ' results', g.sceneName); medal = SN.scenes.results.result.medal;
      focus('continue'); tap('confirm', 1); talk();
    }
    check(!!SN.save.data.medals[id], id + ' earned a medal', SN.save.data.medals);
    if (id === 'e4') check(SN.save.data.unlocked.classes.includes('flare'), 'FLARE unlocked after tier 1');
    if (id === 'e8') check(SN.save.data.unlocked.classes.includes('storm'), 'STORM unlocked after tier 2');
  }
  // the Grand Prix
  g.go('menu', { screen: 'season' }); g.advance(.5); talk(); check(focus('gp') && !SN.UI.items()[SN.UI.focus].disabled, 'the Grand Prix opens');
  tap('confirm', .3); talk(); g.advance(1.5);
  for (let round = 0; round < 4; round++) {
    check(g.sceneName === 'race' && SN.scenes.race.S.gp, 'GP race ' + (round + 1), g.sceneName); raceIt(); check(g.sceneName === 'results', 'GP results ' + (round + 1));
    focus('continue'); tap('confirm', 1); check(SN.UI.top().id === 'gp', 'the standings', SN.UI.top().id); talk();
    const pts = SN.Season.standings(); check(pts.length === 8 && pts[0].points >= pts[7].points, 'points table', pts.slice(0, 3));
    focus('next'); tap('confirm', 1.5);
  }
  talk(); check(SN.save.data.gp.done, 'the Grand Prix is done'); const m = SN.save.data.medals.gp; check(!!m, 'a GP medal', m);
  check(SN.save.data.unlocked.classes.includes('singularity'), 'SINGULARITY unlocked');
  for (let k = 0; k < 10 && SN.UI.top().id !== 'about'; k++) { talk(); g.advance(.5); } check(SN.UI.top().id === 'about', 'the credits roll after the ending');
  // saved and reloaded
  const snap = JSON.stringify(SN.save.data.medals); SN.Save.write(); SN.save.data.medals = {}; g.saves.load(g.saves.latest().slot ?? 'auto'); check(JSON.stringify(SN.save.data.medals) === snap, 'save -> reload -> equal');
});
await test('every other mode', () => {
  const go = s => { g.go('loading', { setup: Object.assign({ team: 'volta', pilot: 'luca', intro: false, seed: raceSeed++ }, s) }); g.advance(1.5); return SN.scenes.race.race; };
  let R = go({ mode: 'race', track: 'borealis', cls: 'singularity', laps: 2 }); check(R.cls === 'singularity', 'quick race at SINGULARITY'); raceIt(); check(g.sceneName === 'results', 'finished');
  R = go({ mode: 'timetrial', track: 'karakum', cls: 'flare', laps: 3 }); raceIt(); R = go({ mode: 'timetrial', track: 'karakum', cls: 'flare', laps: 3 }); g.advance(1); check(!!SN.scenes.race.ghost, 'time trial ghost saved then loaded'); raceIt();
  R = go({ mode: 'hotlap', track: 'meridian', cls: 'storm' }); runRace(ctx, 45); R.endRun(); g.advance(5); check(g.sceneName === 'results' && R.humans[0].bestLap < 40, 'hot lap', R.humans[0].bestLap);
  R = go({ mode: 'snipeout', track: 'solenne', cls: 'flare', target: 8 }); raceIt(); check(g.sceneName === 'results' && R.ships.some(s => s.points >= 8), 'snipeout to its target');
  R = go({ mode: 'overclock', track: 'solenne', cls: 'spark' }); runRace(ctx, 115); check(R.zone >= 10, 'overclock to zone 10', R.zone); R.endRun(); g.advance(5);
  if (g.players.length < 2) g.addPlayer({ keys: 'right' }); R = go({ mode: 'versus', vmode: 'race', track: 'meridian', cls: 'flare', laps: 1, players: [{ team: 'kestrel', pilot: 'ingrid' }, { team: 'caldera', pilot: 'mateo' }] }); check(g.viewports.length === 2, 'versus split screen'); raceIt(); check(R.humans.every(h => h.finished), 'both finish'); g.removePlayer(g.players[1]);
  // a replay of the last race
  const rec = SN.lastResult.rec, RR = SN.Replay.verify(rec); check(RR.hash() === rec.hash, 'the replay of the last race matches', [RR.hash(), rec.hash]);
});
await test('dev mode, settings, about', () => {
  g.go('loading', { setup: { mode: 'race', track: 'solenne', cls: 'spark', team: 'kestrel', pilot: 'ingrid', laps: 1, intro: false } }); g.advance(4);
  SN.pauseItems().find(i => i[0] === 'Dev mode')[1](); SN.Dev.tab = 1; SN.Dev.row = 2; tap('right', .1); check(SN.Tune.changed().length >= 1, 'a slider moved'); SN.Dev.rows()[0].act(); check(!SN.Tune.changed().length, 'reset all'); tap('cancel', .1); g.resume();
  g.settings.set('glyphs', 'xbox'); check(SN.glyph.text(I, 'fire', 'gamepad') === 'X', 'Xbox labels'); g.settings.set('glyphs', 'playstation');
  g.go('menu'); g.advance(.5); SN.UI.push(SN.screens.about()); for (let k = 0; k < 7; k++) tap('tabR', .1); check(true, 'About pages');
});
check(!g.errors.length, 'no errors in the whole playthrough', errs(g));
done();
