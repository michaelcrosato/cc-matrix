import { boot } from '../tests/lib/boot.mjs';
const { e, game } = await boot(); game.mode = 'play'; game.player.teleport(-100, 100);
const t = Date.now(); e.step(240); console.log('step ms', Date.now() - t, 'chunks', game.grassSys.chunks.size, e.errors);
// light a fire and let it spread
const f = game.fire; f.ignite(-100, 80, 3); game.world.wind.pin = true; game.world.wind.speed = 5; game.world.wind.dir = [0, -1];
e.step(60 * 20); console.log(JSON.stringify(f.counts()), game.status(), e.errors);
