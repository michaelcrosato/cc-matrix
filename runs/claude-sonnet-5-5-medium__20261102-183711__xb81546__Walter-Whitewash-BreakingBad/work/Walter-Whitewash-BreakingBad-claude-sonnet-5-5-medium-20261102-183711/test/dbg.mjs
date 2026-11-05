import { load } from './_load.mjs';
const { d, game } = load(); const I = game.input, S = () => d.S(), F = d.fn;
const skip = (max = 60) => { for (let i = 0; i < max && (d.talk.open || d.mode() === 'talk'); i++) { I.tap('confirm'); game.advance(.25); } game.advance(.1); };
game.go('play', { fresh: true }); game.advance(1); skip();
d.lists.thugs.length = 0; d.lists.cops.length = 0; F.spawnCops(); const c = d.lists.cops[0];
S().heat = 70; game.debug.teleport(100,100); Object.assign(c, { x: 600, y: 400, state: 'chase', lost: 0 });
for (let i = 0; i < 10; i++) { game.advance(1); console.log(i, c.state, c.lost.toFixed(2), Math.round(c.x), Math.round(c.y), d.mode(), S().heat.toFixed(1)); }
