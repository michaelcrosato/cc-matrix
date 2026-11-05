// boot: the game boots headless with no errors, every scene enters and exits cleanly, the debug handle answers, and the
// single HTML file has the AI Hub session client first in <head>, unmodified, with every hub tag.
import { readFileSync } from 'node:fs';
import { fresh, assert, eq } from './lib/h.mjs';
import { OUT } from '../build.mjs';
export const cases = {
  'boots to the title with no errors'() { const L = fresh(); L.advance(1); eq(L.snap().scene, 'title', 'scene'); L.noErrors(); },
  'every scene enters and exits cleanly'() {
    const L = fresh(), g = L.game;
    for (const [sc, d] of [['menu'], ['cup'], ['training'], ['records'], ['about'], ['credits'], ['setup', { seats: [] }], ['join', { mode: 'exhibition' }], ['story', { node: 'r1', after: 'cup' }], ['match', { exhibition: true }], ['title'], ['card', {}]]) { g.go(sc, d || {}, { fade: 0 }); L.advance(.7); eq(L.snap().scene, sc, 'scene ' + sc); }
    L.noErrors();
  },
  'the debug snapshot has its fields'() {
    const L = fresh(); L.game.go('match', { exhibition: true }, { fade: 0 }); L.advance(1);
    const s = L.snap();
    for (const k of ['scene', 'phase', 'half', 'clock', 'score', 'hype', 'ball', 'players', 'ref', 'setpiece', 'cards', 'powerups', 'hazards']) assert(k in s, 'missing ' + k);
    eq(s.players.length, 14, 'players');
  },
  'the HTML: the session client first in <head>, unmodified, and the hub tags'() {
    const html = readFileSync(OUT, 'utf8'), session = readFileSync(new URL('../vendor/aihub-session.js', import.meta.url), 'utf8');
    const head = html.slice(0, html.indexOf('</head>'));
    const first = head.indexOf('<script>');
    assert(first > 0 && head.indexOf('<meta charset="utf-8">') < first, 'charset then the client');
    assert(head.slice(first + 9, first + 9 + 60).startsWith('/*! aihub-session 1.4.0'), 'the client is the first script');
    assert(html.includes(session.replace(/<\/script/gi, '<\\/script')), 'the client is unmodified');
    for (const t of ['hub:session" content="1"', 'hub:session-players" content="2-4"', 'hub:session-mode" content="shared-world"', 'hub:session-goal', 'hub:session-howto', 'hub:session-minutes']) assert(head.includes(t), 'tag ' + t);
    assert(/<title>Thugby Turbo<\/title>/.test(html), 'title');
  },
  'no TODO, FIXME, placeholder or lorem in the sources'() {
    const src = readFileSync(new URL('../build/game.js', import.meta.url), 'utf8');
    for (const w of ['TODO', 'FIXME', 'TBD', 'lorem', 'placeholder']) assert(!new RegExp('\\b' + w + '\\b', 'i').test(src), 'found ' + w);
  }
};
