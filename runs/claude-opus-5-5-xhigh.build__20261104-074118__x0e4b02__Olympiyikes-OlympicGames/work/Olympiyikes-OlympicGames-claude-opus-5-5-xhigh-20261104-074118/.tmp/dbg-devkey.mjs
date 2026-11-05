import { boot } from '../tests/harness.mjs';
const h = boot({ hash: '#ev/sprint' }), { O, game } = h; game.advance(1.5);
h.tap('dev'); game.advance(.1); console.log('after tap dev', O.Dev.isOpen, game.sceneName);
game.input.press('Backquote'); game.advance(.05); game.input.release('Backquote'); game.advance(.05); console.log('after key', O.Dev.isOpen);
console.log('shell', !!game.shell, game.shell && game.shell.screen, 'map dev', game.input.map.dev, 'inHub', O.inHub);
E2: { const E = h.E; console.log('hooks', E.HOOKS.input.length); }
