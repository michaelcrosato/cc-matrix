import { boot } from '../tests/harness.mjs';
const h = boot(), { O, game } = h; game.start({ scenes: O.scenes, scene: 'title' }); game.advance(.5);
game.advance(10.5); console.log('attract', O.Attract.on, game.sceneName);
for (let i = 0; i < 300; i++) game.advance(.25);
console.log('before tap', O.Attract.on, game.sceneName, O.Run.ctx && O.Run.ctx.phase);
h.tap('confirm'); game.advance(.05); console.log('after 1 step', O.Attract.on, O.Attract.exitPending, game.sceneName, game.input.anyPressed());
game.advance(.8); console.log('after .8', O.Attract.on, game.sceneName);
