import { boot } from '../tests/harness.mjs';
const c = boot({ hash: '#ev/sprint' }); const O = c.OLY, game = O.game; game.advance(2);
game.input.press('Backquote'); game.advance(1/120); game.input.release('Backquote'); game.advance(.1); console.log('open', O.Dev.isOpen, game.input.map.dev);
