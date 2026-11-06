import { boot } from '../tests/lib/boot.mjs';
const t = Date.now(); const { e, game } = await boot(); console.log('boot ms', Date.now() - t, e.errors);
game.flow.newGame(); e.step(30); game.device = 'kbm';
e.input.setKey('KeyM', true); e.step(2); e.input.setKey('KeyM', false); e.step(60);
console.log('map up', game.mapUp, JSON.stringify(game.state().map), e.errors);
const nonPaper = [...game.mapSys.data].filter((v,i)=>i%4===0).length; console.log('pixels', nonPaper);
