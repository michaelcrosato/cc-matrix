// campaign and screens, end to end through button presses: the prologue's other choice, skipping a scene, a lost cup
// match whose CONTINUE runs out, the Exhibition setup's every weather and time, records and initials, the About pages
// (the same text as exit-interview.json), the cup hub's team sheet.
import { readFileSync } from 'node:fs';
import { fresh, assert, eq } from './lib/h.mjs';
const tap = (L, a, s = .3) => { L.game.input.tap(a); L.advance(s); };
const talkOf = L => L.game.scenes.story.story.talk;
export const cases = {
  'the prologue\'s other choice: SKIP TO THE CUP goes straight to the hub, untrained'() {
    const L = fresh(), g = L.game; L.advance(1); tap(L, 'start', .6); tap(L, 'confirm', .6); eq(g.sceneName, 'story', 'the prologue');
    for (let i = 0; i < 30; i++) { const t = talkOf(L); if (t.choices && !t.typing && t.i >= t.pages.length - 1) break; tap(L, 'confirm', .7); }
    const t = talkOf(L); assert(t.choices && t.choices.length === 2, 'the choice is on screen: ' + JSON.stringify(t.choices));
    tap(L, 'down', .3); eq(t.choice, 1, 'down moves to SKIP'); tap(L, 'confirm', 1);
    eq(g.sceneName, 'cup', 'the cup hub'); assert(!L.TT.Cup.s.trained, 'not trained'); L.noErrors();
  },
  'TRIANGLE skips a cutscene and progress is not blocked'() {
    const L = fresh(), g = L.game; L.TT.Cup.s = L.TT.Cup.fresh(); g.go('story', { node: 'r1', after: 'join', venue: 'muddington' }, { fade: 0 }); L.advance(.5);
    tap(L, 'tri', 1); eq(g.sceneName, 'join', 'skipped to the join screen'); L.noErrors();
  },
  'a lost cup match: Rule Six, then CONTINUE? counting down to zero goes back to the hub with the round still to play'() {
    const L = fresh(), g = L.game, TT = L.TT; TT.Cup.start(); L.advance(.5);
    g.go('match', TT.Cup.matchData([{ kind: 'local', input: g.input, team: 0, label: 'P1', color: '#4aa0e0' }]), { fade: 0 }); L.advance(.5);
    const m = TT.MS.m; m.force('score', { team: 1, n: 12 }); m.force('fulltime'); L.advance(6);
    eq(g.sceneName, 'results', 'results'); assert(TT.Cup.s.round === 0 && !TT.Cup.s.results[0], 'the round is not won');
    L.advance(1.2); tap(L, 'confirm', .8); eq(g.sceneName, 'story', 'Rule Six'); eq(g.scenes.story.data.node, 'lost', 'the lost scene');
    for (let i = 0; i < 10 && g.sceneName === 'story'; i++) tap(L, 'confirm', .7);
    eq(g.sceneName, 'continue', 'CONTINUE?'); assert(TT.arcade.continuing, 'counting down');
    L.advance(11.5); eq(g.sceneName, 'cup', 'at zero: the hub'); eq(TT.Cup.s.round, 0, 'round one still NEXT'); L.noErrors();
  },
  'Exhibition setup: every weather and time choice, picked with the buttons, is the match that starts'() {
    const L = fresh(), g = L.game, TT = L.TT, seats = [{ kind: 'local', input: g.input, team: 0, label: 'P1', color: '#4aa0e0' }];
    const W = Object.keys(TT.WEATHERS), Tm = ['venue', 'day', 'dusk', 'night'];
    for (let wi = 0; wi < W.length; wi++) for (let ti = 0; ti < Tm.length; ti++) {
      g.go('setup', { seats }, { fade: 0 }); L.advance(.3); const S = g.scenes.setup;
      tap(L, 'down', .15); tap(L, 'down', .15);                        // AWAY, VENUE
      tap(L, 'right', .15); eq(S.val('venue'), TT.VENUE_ORDER[1], 'venue changed');
      tap(L, 'down', .15); for (let k = 0; k < wi; k++) tap(L, 'right', .15);   // WEATHER
      tap(L, 'down', .15); for (let k = 0; k < ti; k++) tap(L, 'right', .15);   // TIME
      tap(L, 'down', .15); tap(L, 'down', .15); tap(L, 'down', .15); eq(S.opts[S.f.i].key, 'play', 'focus on PLAY');
      tap(L, 'confirm', .6); eq(g.sceneName, 'match', 'the match');
      const m = TT.MS.m, V = TT.VENUES[TT.VENUE_ORDER[1]], wk = W[wi], tk = Tm[ti];
      eq(m.venue.id, V.id, 'venue');
      const expW = wk === 'venue' ? V.weather : TT.WEATHERS[wk].w;
      eq(JSON.stringify(m.weather), JSON.stringify(expW), 'weather ' + wk);
      eq(JSON.stringify(g.weather), JSON.stringify(expW ? Object.assign({}, expW) : null), 'the weather falls: ' + wk);
      eq(m.time, tk === 'venue' ? V.time : tk, 'time ' + tk);
    }
    L.noErrors();
  },
  'records: a big win opens the initials wheel; the name and score land in the table'() {
    const L = fresh(), g = L.game, TT = L.TT;
    g.go('match', { exhibition: true, skipIntro: true, seed: 3 }, { fade: 0 }); L.advance(.5);
    const m = TT.MS.m; m.score = [45, 0]; m.force('fulltime'); L.advance(6); eq(g.sceneName, 'results', 'results');
    assert(TT.arcade.entry, 'the initials wheel is open'); eq(TT.arcade.entry.mode, 'margin', 'biggest wins');
    tap(L, 'up', .2); tap(L, 'confirm', .2); tap(L, 'confirm', .2); tap(L, 'confirm', .3);
    assert(TT.arcade.table('margin').some(e => e.score === 45), 'in the table: ' + JSON.stringify(TT.arcade.table('margin').slice(0, 3)));
    L.advance(1.2); tap(L, 'confirm', .8); eq(g.sceneName, 'menu', 'continue to the menu'); L.noErrors();
  },
  'the About & Credits pages: five pages, turned with the buttons, the same text as exit-interview.json'() {
    const L = fresh(), g = L.game, TT = L.TT; g.go('about', {}, { fade: 0 }); L.advance(.4);
    eq(TT.ABOUT.length, 5, 'five pages'); eq(TT.ABOUT.map(p => p.title).join('|'), 'THUGBY TURBO|SOURCE INFORMATION|TESTING FEEDBACK|ENGINE FEEDBACK|PROMPT FEEDBACK', 'titles');
    for (let i = 1; i < 5; i++) { tap(L, 'r1', .3); eq(g.scenes.about.page, i, 'page ' + (i + 1)); }
    tap(L, 'r1', .3); eq(g.scenes.about.page, 0, 'round to the first');
    const J = JSON.parse(readFileSync(new URL('../../exit-interview.json', import.meta.url), 'utf8'));
    eq(JSON.stringify(J.testingFeedback), JSON.stringify(TT.FEEDBACK.testing), 'testing feedback matches the game');
    eq(JSON.stringify(J.engineFeedback), JSON.stringify(TT.FEEDBACK.engine), 'engine feedback matches');
    eq(JSON.stringify(J.promptFeedback), JSON.stringify(TT.FEEDBACK.prompt), 'prompt feedback matches');
    for (const k in J.sourceInformation) eq(J.sourceInformation[k], TT.ABOUT_INFO[k], 'source information ' + k);
    for (const r of TT.ABOUT[1].rows) assert(r[1] && r[1].length > 3, 'source row ' + r[0] + ' answered');
    tap(L, 'cancel', .6); eq(g.sceneName, 'menu', 'back to the menu'); L.noErrors();
  },
  'the cup hub: the bracket, the team sheet with stats, training, back'() {
    const L = fresh(), g = L.game, TT = L.TT; TT.Cup.s = TT.Cup.fresh(); g.go('cup', {}, { fade: 0 }); L.advance(.4);
    tap(L, 'down', .2); tap(L, 'down', .2); tap(L, 'confirm', .3); assert(g.scenes.cup.sheet, 'team sheet open');
    tap(L, 'right', .2); eq(g.scenes.cup.sel, 1, 'second player'); tap(L, 'cancel', .3); assert(!g.scenes.cup.sheet, 'closed');
    tap(L, 'up', .2); tap(L, 'confirm', .6); eq(g.sceneName, 'training', 'training from the hub'); L.noErrors();
  }
};
