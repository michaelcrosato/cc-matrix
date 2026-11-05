import { load } from '../tests/lib/load.mjs';
const { BZ, game } = load(); BZ.cosmetic = false; game.advance(.6);
game.go('derby', { players: 1, park: 'megadome', bots: true, length: 'outs', seed: 3 }, { fade: 0 }); game.advance(.3);
const D = BZ.M.derby; D.players[0].time = 9999; const ev = {};
BZ.bus.on('*', (d, e) => { ev[e] = (ev[e] || 0) + 1; if (e === 'swing' && ev[e] < 6) console.log('swing', JSON.stringify(d)); if (e === 'derbyOut' && ev[e] < 4) console.log('out', JSON.stringify(d)); });
for (let i = 0; i < 400 && D.state !== 'over'; i++) game.advance(.25);
console.log(D.state, D.players.map(p => [p.score, p.hrs, p.outs, p.pitches]), JSON.stringify(ev).slice(0, 400), game.errors.map(e => e.message));
for (const s of ['gallery', 'credits', 'about', 'lessonList', 'tourMenu', 'derbySetup', 'teamSelect', 'title']) { BZ.debug.warp(s, s === 'credits' ? { ending: false } : undefined); game.advance(.4); if (game.errors.length) { console.log('after', s, game.errors.map(e => e.where + ' ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '))); break; } }
