import { load } from '../test/lib/load.mjs';
const tt = load({ touchOnly: true }); tt.game.advance(.5); console.log('touchOnly', tt.G.touchOnly(), tt.G.TOUCH_ONLY_AT_BOOT, tt.game.input.noTouch, tt.ctx.matchMedia('(any-pointer: coarse)').matches);
const { game, G } = load({});
game.advance(.5); game.go('title', null, { fade: 0 }); game.advance(10.5);
let last = null; for (let i = 0; i < 120 * 140; i++) { game.advance(1 / 120); if (G.attract && G.attract.beat !== last) { last = G.attract.beat; } if (last === 'card') break; }
console.log('beat', G.attract && G.attract.beat, game.sceneName, 'preset', G.inputPreset);
game.input.tap('confirm'); game.advance(1 / 120); console.log('after 1 step', !!G.attract, game.sceneName, game.input.anyPressed && game.input.anyPressed());
game.advance(.5); console.log('after .5', !!G.attract, game.sceneName);
