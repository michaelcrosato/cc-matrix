// loads everything in node (headless) and reports the first error with its file
import { load } from './lib.mjs';
try { const { game, WP } = load(); game.advance(1); console.log('scene', game.sceneName, 'errors', game.errors.map(e => e.message)); }
catch (e) { console.log(e.stack.split('\n').slice(0, 6).join('\n')); }
