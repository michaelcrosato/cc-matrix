import { boot } from '../tests/lib/boot.mjs';
const t = Date.now(); const { e, game } = await boot(); game.mode = 'play'; console.log('boot ms', Date.now() - t, e.errors);
console.log('placed', game.sitesSys.placed.length, 'trees', game.sitesSys.trees.length, 'things', game.sitesSys.things.length, 'interact', game.sitesSys.interactables.length, 'waters', game.sitesSys.waters.length);
game.player.teleport(0, 100); e.step(120);
console.log(game.status(), 'spawned', JSON.stringify(game.state().sites), e.errors);
game.player.teleport(430, -60); e.step(120); console.log(game.status(), JSON.stringify(game.state().soldiers), JSON.stringify(game.state().sites));
