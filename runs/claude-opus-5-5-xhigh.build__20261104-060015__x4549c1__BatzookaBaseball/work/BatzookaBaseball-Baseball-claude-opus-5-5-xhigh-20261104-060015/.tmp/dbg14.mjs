import { load } from '../tests/lib/load.mjs';
const { BZ, game } = load(); BZ.cosmetic = false; game.advance(.6);
game.go('derby', { players: 2, park: 'megadome', bots: true, length: 'outs', seed: 3 }, { fade: 0 }); game.advance(.3);
const D = BZ.M.derby; D.players.forEach(p => { p.time = 9999; }); const ev = {};
let hrs = 0, bon = 0; BZ.bus.on('homer', d => { hrs++; }); const ob = D.bonus.bind(D); D.bonus = (fb, l) => { bon++; if (bon < 5) console.log('bonus', fb, l); ob(fb, l); };
for (let i = 0; i < 600 && D.state !== 'over'; i++) game.advance(.25);
console.log(D.state, D.players.map(p => [p.score, p.hrs, p.outs, p.longest]), 'homer events', hrs, 'bonuses', bon, 'pitchN', D.pitchN);
