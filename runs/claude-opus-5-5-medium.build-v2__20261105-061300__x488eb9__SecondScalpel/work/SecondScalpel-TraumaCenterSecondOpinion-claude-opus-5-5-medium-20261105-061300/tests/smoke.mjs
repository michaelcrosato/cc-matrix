import { load } from './lib.mjs';
const { G, E, game } = load({ draw: true }), errs = () => game.errors.map(e => (e.stack || e.message).split('\n').slice(0, 3).join(' | ')).slice(0, 4);
const chk = (n) => console.log(n, JSON.stringify(game.debug.snapshot()).slice(0, 140), errs());
game.advance(1); chk('boot'); game.input.tap('start'); game.advance(.6); chk('menu');
for (const [n, d] of [['difficulty'], ['casefiles'], ['lobby'], ['about', { back: 'menu' }], ['credits', {}], ['chart', { caseId: 'c2', mode: 'files' }], ['ward', { map: 'ward3', after: 3 }], ['ward', { map: 'ship', after: 7 }], ['attract']]) { game.go(n, d); game.advance(1.2); chk(n); }
game.go('title'); game.advance(.5);
game.go('story', { id: 'c1_before', then: () => game.go('menu') }); game.advance(1); chk('story1'); for (let i = 0; i < 80 && G.sceneName(game.scene) === 'story'; i++) { game.input.tap('confirm'); game.advance(.5); } chk('storyEnd');
for (const c of [...G.CASE_ORDER, 'grandrounds', 'lab']) { game.go('op', { caseId: c, mode: 'files', difficulty: 'resident', seats: [{ pid: 0, bot: new G.Bot({}) }] }); game.advance(3); chk(c); if (game.errors.length) break; }
