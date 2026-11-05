import { boot } from './load.mjs';
const ctx = boot(); const E = ctx.My3D2dge, game = E.current, OB = ctx.OB;
game.advance(.5);
console.log('scene', game.sceneName, 'errors', game.errors.map(e => e.message));
console.log('lint', OB.lint());
process.exit(0);
