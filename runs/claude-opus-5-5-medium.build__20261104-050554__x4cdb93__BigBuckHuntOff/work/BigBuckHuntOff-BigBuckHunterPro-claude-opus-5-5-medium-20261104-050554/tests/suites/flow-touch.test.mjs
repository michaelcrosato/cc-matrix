// Touch-only devices: the title says "Controller or keyboard required", a tap does not start a game, the attract mode
// runs after 10 s, a key clears it.
import { load } from '../lib/load.mjs';
import { check, done } from '../lib/check.mjs';
const { B, game } = load({ touchOnly: true });
const S = () => game.debug.snapshot(), I = game.input;
game.advance(1);
check('touch-only is detected', B.touchOnly === true);
check('no touch controls', I.touchEnabled === false);
I.feed('down', 240, 60, { touch: true }); I.feed('up', 240, 60, { touch: true }); game.advance(.6);
check('a tap does not start a game', S().scene === 'title', S().scene);
game.advance(10.5); check('the attract mode runs after 10 s', S().attract, S().scene);
I.press('KeyA'); game.advance(.05); I.release('KeyA'); game.advance(.8);
check('a key returns to the title', S().scene === 'title', S().scene);
game.advance(.2); check('a key clears touch-only for the visit', B.touchOnly === false);
check('no errors', !game.errors.length, game.errors.map(e => e.message).join('|'));
done();
