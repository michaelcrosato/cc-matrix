import { load } from '../tests/lib.mjs';
const { game, G } = load(''); game.advance(.2);
game.go('match', { home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 3, len: 90, humans: [], intros: false, replays: false, flood: false, noResults: true, seed: 5 }, { fade: 0 });
const all = []; G.Bus.on('*', e => all.push(e)); let i = 0; while (!G.M.finished && i++ < 4000) game.advance(.25);
const c = t => all.filter(t).length;
console.log('passes', c(e => e.type === 'pass'), 'completed', c(e => e.type === 'pass_complete'), 'shots', c(e => e.type === 'shot'), 'onetimer shots', c(e => e.type === 'shot' && e.kind === 'onetimer'), 'gloves', c(e => e.type === 'gloves'), 'turtles', c(e => e.type === 'turtle'));
